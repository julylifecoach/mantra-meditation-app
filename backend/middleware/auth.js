const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Verify JWT and attach userId + role to req
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
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
