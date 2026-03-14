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
                accessSelfCoaching: true,
                accessContentCreator: true,
                accessClientPortal: true,
                accessBizCoach: true,
                createdAt: true,
                _count: { select: { reflections: true, coachingSessions: true } }
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

// PUT /api/admin/users/:id/permissions - Update ecosystem permissions
router.put('/users/:id/permissions', requireAdmin, async (req, res) => {
    try {
        const { accessSelfCoaching, accessContentCreator, accessClientPortal, accessBizCoach } = req.body;
        const user = await prisma.user.update({
            where: { id: req.params.id },
            data: {
                accessSelfCoaching: Boolean(accessSelfCoaching),
                accessContentCreator: Boolean(accessContentCreator),
                accessClientPortal: Boolean(accessClientPortal),
                accessBizCoach: Boolean(accessBizCoach)
            },
        });
        res.json({
            id: user.id,
            accessSelfCoaching: user.accessSelfCoaching,
            accessContentCreator: user.accessContentCreator,
            accessClientPortal: user.accessClientPortal,
            accessBizCoach: user.accessBizCoach
        });
    } catch (error) {
        console.error('Admin update permissions error:', error);
        res.status(500).json({ error: 'Failed to update user permissions' });
    }
});

// --- COACHING SESSIONS (Admin) ---

// GET /api/admin/users/:id/sessions - List coaching sessions for a user
router.get('/users/:id/sessions', requireAdmin, async (req, res) => {
    try {
        const sessions = await prisma.coachingSession.findMany({
            where: { userId: req.params.id },
            orderBy: { sessionDate: 'desc' }
        });
        res.json(sessions);
    } catch (error) {
        console.error('Admin list sessions error:', error);
        res.status(500).json({ error: 'Failed to list coaching sessions' });
    }
});

// POST /api/admin/users/:id/sessions - Create a coaching session
router.post('/users/:id/sessions', requireAdmin, async (req, res) => {
    try {
        const { sessionDate, mainTopics, recordNotes } = req.body;
        const session = await prisma.coachingSession.create({
            data: {
                userId: req.params.id,
                sessionDate: new Date(sessionDate),
                mainTopics,
                recordNotes
            }
        });
        res.json(session);
    } catch (error) {
        console.error('Admin create session error:', error);
        res.status(500).json({ error: 'Failed to create coaching session' });
    }
});

// PUT /api/admin/sessions/:sessionId - Edit a coaching session
router.put('/sessions/:sessionId', requireAdmin, async (req, res) => {
    try {
        const { sessionDate, mainTopics, recordNotes } = req.body;
        // Build data object dynamically
        const data = {};
        if (sessionDate) data.sessionDate = new Date(sessionDate);
        if (mainTopics !== undefined) data.mainTopics = mainTopics;
        if (recordNotes !== undefined) data.recordNotes = recordNotes;

        const session = await prisma.coachingSession.update({
            where: { id: req.params.sessionId },
            data
        });
        res.json(session);
    } catch (error) {
        console.error('Admin edit session error:', error);
        res.status(500).json({ error: 'Failed to update coaching session' });
    }
});

// DELETE /api/admin/sessions/:sessionId - Delete a coaching session
router.delete('/sessions/:sessionId', requireAdmin, async (req, res) => {
    try {
        await prisma.coachingSession.delete({
            where: { id: req.params.sessionId }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Admin delete session error:', error);
        res.status(500).json({ error: 'Failed to delete coaching session' });
    }
});

module.exports = router;
