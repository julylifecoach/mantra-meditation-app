const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to create JWT
function createToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
}

// Helper to strip sensitive fields
function sanitizeUser(user) {
    const { passwordHash, ...safe } = user;
    return safe;
}

// ============ Google OAuth ============
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const displayName = payload['name'] || 'User';

        // Find by googleId first, then by email (link accounts)
        let user = await prisma.user.findUnique({ where: { googleId } });

        if (!user) {
            // Check if email already exists (email/password user signing in with Google)
            user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                // Link Google account to existing email user
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId },
                });
            } else {
                user = await prisma.user.create({
                    data: { googleId, email, displayName },
                });
            }
        }

        const sessionToken = createToken(user);
        res.json({ token: sessionToken, user: sanitizeUser(user) });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ error: "Authentication failed" });
    }
});

// ============ Email/Password Register ============
router.post('/register', async (req, res) => {
    try {
        const { email, password, displayName, agreedToTos, marketingOptIn } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!agreedToTos) {
            return res.status(400).json({ error: 'You must agree to the Terms of Service' });
        }

        // Check if email already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            // If user was pre-created by webhook (no password set), let them complete registration
            if (!existing.passwordHash) {
                const passwordHash = await bcrypt.hash(password, 12);
                const user = await prisma.user.update({
                    where: { email },
                    data: {
                        passwordHash,
                        displayName: displayName || existing.displayName,
                        agreedToTos: true,
                        tosAgreedAt: new Date(),
                        marketingOptIn: !!marketingOptIn,
                    },
                });
                const token = createToken(user);
                return res.json({ token, user: sanitizeUser(user) });
            }
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                displayName: displayName || email.split('@')[0],
                agreedToTos: true,
                tosAgreedAt: new Date(),
                marketingOptIn: !!marketingOptIn,
            },
        });

        const token = createToken(user);
        res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "Registration failed" });
    }
});

// ============ Email/Password Login ============
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = createToken(user);
        res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Login failed" });
    }
});

// ============ Get Current User + Subscription ============
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { subscription: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const safeUser = sanitizeUser(user);

        // Add subscription status summary
        const sub = user.subscription;
        safeUser.subscriptionStatus = sub
            ? {
                status: sub.status,
                plan: sub.plan,
                currentPeriodEnd: sub.currentPeriodEnd,
                trialEnd: sub.trialEnd,
            }
            : { status: 'none' };

        res.json({ user: safeUser });
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({ error: "Failed to get user" });
    }
});

module.exports = router;
