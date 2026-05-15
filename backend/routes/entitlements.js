const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// -- Product key registry --
// Used by Stripe webhook to map product IDs to entitlement keys
const PRODUCT_KEY_MAP = {
    'prod_UKxWhVWfO4fc1o': 'reddit-course',
    'prod_UNGg0HGN9rPJ7u': 'practice-kit',
    'prod_UD6piLkQx0HVAA': 'practice-kit', // Action & Alignment Bundle
};

// GET /api/entitlements -- returns all active entitlements for the current user
router.get('/', authenticate, async (req, res) => {
    try {
        const entitlements = await prisma.entitlement.findMany({
            where: {
                userId: req.userId,
                active: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            select: {
                productKey: true,
                source: true,
                grantedAt: true,
                expiresAt: true,
            },
        });

        res.json({
            entitlements: entitlements.map(e => e.productKey),
            details: entitlements,
        });
    } catch (error) {
        console.error('Entitlements error:', error);
        res.status(500).json({ error: 'Failed to get entitlements' });
    }
});

// Helper: grant an entitlement (used by Stripe webhook and admin)
async function grantEntitlement(userId, productKey, source = 'free', stripeSessionId = null) {
    return prisma.entitlement.upsert({
        where: {
            userId_productKey: { userId, productKey },
        },
        update: {
            active: true,
            source,
            stripeSessionId: stripeSessionId || undefined,
        },
        create: {
            userId,
            productKey,
            source,
            stripeSessionId,
        },
    });
}

// Helper: grant free entitlements for new users
async function grantFreeEntitlements(userId) {
    try {
        await grantEntitlement(userId, 'action-matrix', 'free');
    } catch (e) {
        // Ignore duplicate -- user may already have it
        if (!e.message.includes('Unique constraint')) {
            console.error('Failed to grant free entitlements:', e.message);
        }
    }
}

module.exports = router;
module.exports.grantEntitlement = grantEntitlement;
module.exports.grantFreeEntitlements = grantFreeEntitlements;
module.exports.PRODUCT_KEY_MAP = PRODUCT_KEY_MAP;
