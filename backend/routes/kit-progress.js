const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Valid tool keys — matches localStorage key names
const VALID_TOOLS = [
    'heart-opening-108',
    'listening-lens',
    'side-effect-quests-v2',
    'sa-practice-kit-workbook',
];

/**
 * Middleware: check that the authenticated user has Practice Kit access
 */
async function requireKitAccess(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { accessPracticeKit: true, role: true },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Admins bypass
        if (user.role === 'admin' || user.accessPracticeKit) {
            return next();
        }

        return res.status(403).json({
            error: 'Practice Kit access required',
            code: 'KIT_ACCESS_REQUIRED',
        });
    } catch (e) {
        console.error('Kit access check error:', e);
        return res.status(500).json({ error: 'Failed to check access' });
    }
}

// ============ GET all tool progress ============
router.get('/', authenticate, requireKitAccess, async (req, res) => {
    try {
        const progress = await prisma.kitProgress.findMany({
            where: { userId: req.userId },
            select: { toolKey: true, data: true, updatedAt: true },
        });

        // Return as { toolKey: { data, updatedAt } } map
        const result = {};
        for (const p of progress) {
            result[p.toolKey] = { data: p.data, updatedAt: p.updatedAt };
        }

        res.json({ progress: result });
    } catch (error) {
        console.error('Get kit progress error:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

// ============ GET single tool progress ============
router.get('/:toolKey', authenticate, requireKitAccess, async (req, res) => {
    const { toolKey } = req.params;

    if (!VALID_TOOLS.includes(toolKey)) {
        return res.status(400).json({ error: `Invalid tool key: ${toolKey}` });
    }

    try {
        const progress = await prisma.kitProgress.findUnique({
            where: {
                userId_toolKey: { userId: req.userId, toolKey },
            },
            select: { data: true, updatedAt: true },
        });

        if (!progress) {
            return res.json({ data: null, updatedAt: null });
        }

        res.json(progress);
    } catch (error) {
        console.error('Get tool progress error:', error);
        res.status(500).json({ error: 'Failed to get progress' });
    }
});

// ============ PUT upsert tool progress ============
router.put('/:toolKey', authenticate, requireKitAccess, async (req, res) => {
    const { toolKey } = req.params;
    const { data } = req.body;

    if (!VALID_TOOLS.includes(toolKey)) {
        return res.status(400).json({ error: `Invalid tool key: ${toolKey}` });
    }

    if (data === undefined || data === null) {
        return res.status(400).json({ error: 'Missing data field' });
    }

    // Sanity check: data should be a JSON object, not a huge string
    if (typeof data === 'string') {
        try {
            JSON.parse(data);
        } catch {
            return res.status(400).json({ error: 'Invalid JSON in data field' });
        }
    }

    // Size limit: 1MB per tool (generous — typical progress is a few KB)
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1_000_000) {
        return res.status(413).json({ error: 'Progress data too large (max 1MB)' });
    }

    try {
        const progress = await prisma.kitProgress.upsert({
            where: {
                userId_toolKey: { userId: req.userId, toolKey },
            },
            update: { data },
            create: { userId: req.userId, toolKey, data },
        });

        res.json({ toolKey, updatedAt: progress.updatedAt });
    } catch (error) {
        console.error('Upsert tool progress error:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

module.exports = router;
