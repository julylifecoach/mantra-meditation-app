const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Verify JWT and attach userId + role to req.
 * Supports two auth methods:
 *   1. Authorization: Bearer <token> (existing practice app)
 *   2. july_token cookie (cross-subdomain learn portal)
 */
const authenticate = (req, res, next) => {
    let token = null;

    // 1. Check Authorization header first (backward compat)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // 2. Fall back to july_token cookie
    if (!token && req.cookies && req.cookies.july_token) {
        token = req.cookies.july_token;
    }

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/**
 * Check if user has an active or trialing subscription
 * Must be used after authenticate middleware
 */
const requireSubscription = async (req, res, next) => {
    // Feature flag to disable paywall
    if (process.env.PAYWALL_ENABLED !== 'true') {
        return next();
    }

    // Admins bypass subscription check
    if (req.userRole === 'admin') {
        return next();
    }

    try {
        const sub = await prisma.subscription.findUnique({
            where: { userId: req.userId },
        });

        if (!sub || !['active', 'trialing'].includes(sub.status)) {
            return res.status(403).json({
                error: 'Subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
            });
        }

        req.subscription = sub;
        next();
    } catch (e) {
        console.error('Subscription check error:', e);
        return res.status(500).json({ error: 'Failed to check subscription' });
    }
};

module.exports = { authenticate, requireSubscription };
