const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

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
