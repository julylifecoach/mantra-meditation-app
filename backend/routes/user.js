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

module.exports = router;
