const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// PUT /api/user/nickname
router.put('/nickname', authenticate, async (req, res) => {
    try {
        const { nickname } = req.body;

        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { nickname: nickname || null },
        });

        res.json({ user });
    } catch (error) {
        console.error('Nickname update error:', error);
        res.status(500).json({ error: 'Failed to update nickname' });
    }
});

// PUT /api/user/consent
router.put('/consent', authenticate, async (req, res) => {
    try {
        const { agreedToTos, marketingOptIn } = req.body;

        if (!agreedToTos) {
            return res.status(400).json({ error: 'You must agree to the Terms of Service' });
        }

        const user = await prisma.user.update({
            where: { id: req.userId },
            data: {
                agreedToTos: true,
                tosAgreedAt: new Date(),
                marketingOptIn: !!marketingOptIn,
            },
        });

        const { passwordHash, ...safe } = user;
        res.json({ user: safe });
    } catch (error) {
        console.error('Consent update error:', error);
        res.status(500).json({ error: 'Failed to update consent' });
    }
});

module.exports = router;
