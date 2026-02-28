const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to authenticate JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Create a new reflection
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { content, isPublic, mantra, title } = req.body;

        // Check if user has write permission
        const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (!user || !user.canWrite) {
            return res.status(403).json({ error: 'Write access has been revoked' });
        }

        const reflection = await prisma.reflection.create({
            data: {
                title,
                content,
                isPublic,
                mantra,
                userId: req.user.userId
            }
        });

        res.json(reflection);
    } catch (error) {
        console.error("Error creating reflection:", error);
        res.status(500).json({ error: "Failed to create reflection" });
    }
});

// Get user's reflections
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const reflections = await prisma.reflection.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reflections);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch reflections" });
    }
});

// Get public board reflections (no auth required)
router.get('/public', async (req, res) => {
    try {
        const publicReflections = await prisma.reflection.findMany({
            where: { isPublic: true },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: { displayName: true, nickname: true }
                }
            },
            take: 50 // Limit to recent 50
        });
        res.json(publicReflections);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch public board" });
    }
});

module.exports = router;
