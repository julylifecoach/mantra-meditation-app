const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const router = express.Router();

// Admin middleware: verify JWT + check admin role
const requireAdmin = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/admin/users - List all users
router.get('/users', requireAdmin, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                displayName: true,
                nickname: true,
                role: true,
                canWrite: true,
                createdAt: true,
                _count: { select: { reflections: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        console.error('Admin users list error:', error);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

// PUT /api/admin/users/:id/canWrite - Toggle write permission
router.put('/users/:id/canWrite', requireAdmin, async (req, res) => {
    try {
        const { canWrite } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: { canWrite: Boolean(canWrite) },
        });
        res.json({ id: user.id, canWrite: user.canWrite });
    } catch (error) {
        console.error('Admin toggle canWrite error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

module.exports = router;
