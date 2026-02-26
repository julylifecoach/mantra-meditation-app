const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;

        // Verify the Google ID token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const displayName = payload['name'] || 'Meditator';

        // Find or create user in database
        let user = await prisma.user.findUnique({ where: { googleId } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    googleId,
                    email,
                    displayName,
                }
            });
        }

        // Create a session JWT for our own API
        const sessionToken = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ token: sessionToken, user });
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(401).json({ error: "Authentication failed" });
    }
});

module.exports = router;
