const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Admin middleware
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

// ============ User-facing routes ============

// GET /api/programs — Programs visible to the current user
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { enrollments: { select: { programId: true } } }
        });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const enrolledProgramIds = user.enrollments.map(e => e.programId);

        // Build OR conditions: enrolled programs + bizcoach-included if they have access
        const orConditions = [];
        if (enrolledProgramIds.length > 0) {
            orConditions.push({ id: { in: enrolledProgramIds } });
        }
        if (user.accessBizCoach || user.role === 'admin') {
            orConditions.push({ includedForBizCoach: true });
        }

        if (orConditions.length === 0) {
            return res.json([]);
        }

        const programs = await prisma.program.findMany({
            where: {
                active: true,
                OR: orConditions,
            },
            select: {
                id: true,
                slug: true,
                title: true,
                description: true,
                playlistId: true,
                includedForBizCoach: true,
                isPublic: true,
                startDate: true,
                createdAt: true,
                _count: { select: { enrollments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(programs);
    } catch (error) {
        console.error('List programs error:', error);
        res.status(500).json({ error: 'Failed to list programs' });
    }
});

// GET /api/programs/:slug — Single program with full content
router.get('/:slug', authenticate, async (req, res) => {
    try {
        const program = await prisma.program.findUnique({
            where: { slug: req.params.slug },
        });

        if (!program || !program.active) {
            return res.status(404).json({ error: 'Program not found' });
        }

        // Check access: enrolled, or bizcoach+included, or admin
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { enrollments: { where: { programId: program.id }, select: { id: true } } }
        });

        const isEnrolled = user.enrollments.length > 0;
        const isBizCoachWithAccess = (user.accessBizCoach && program.includedForBizCoach);
        const isAdmin = user.role === 'admin';

        if (!isEnrolled && !isBizCoachWithAccess && !isAdmin) {
            return res.status(403).json({ error: 'You are not enrolled in this program' });
        }

        res.json(program);
    } catch (error) {
        console.error('Get program error:', error);
        res.status(500).json({ error: 'Failed to get program' });
    }
});

// ============ Admin routes ============

// GET /api/programs/admin/all — All programs (including inactive)
router.get('/admin/all', requireAdmin, async (req, res) => {
    try {
        const programs = await prisma.program.findMany({
            include: {
                _count: { select: { enrollments: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(programs);
    } catch (error) {
        console.error('Admin list programs error:', error);
        res.status(500).json({ error: 'Failed to list programs' });
    }
});

// POST /api/programs — Create a program
router.post('/', requireAdmin, async (req, res) => {
    try {
        const { slug, title, description, materials, playlistId, includedForBizCoach, isPublic, startDate } = req.body;

        if (!slug || !title) {
            return res.status(400).json({ error: 'slug and title are required' });
        }

        const program = await prisma.program.create({
            data: {
                slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                title,
                description: description || null,
                materials: materials || null,
                playlistId: playlistId || null,
                includedForBizCoach: includedForBizCoach !== false,
                isPublic: isPublic === true,
                startDate: startDate ? new Date(startDate) : null,
            },
        });

        res.json(program);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'A program with this slug already exists' });
        }
        console.error('Create program error:', error);
        res.status(500).json({ error: 'Failed to create program' });
    }
});

// PUT /api/programs/:id — Update a program
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { title, description, materials, playlistId, includedForBizCoach, isPublic, active, startDate } = req.body;

        const data = {};
        if (title !== undefined) data.title = title;
        if (description !== undefined) data.description = description;
        if (materials !== undefined) data.materials = materials;
        if (playlistId !== undefined) data.playlistId = playlistId;
        if (includedForBizCoach !== undefined) data.includedForBizCoach = Boolean(includedForBizCoach);
        if (isPublic !== undefined) data.isPublic = Boolean(isPublic);
        if (active !== undefined) data.active = Boolean(active);
        if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;

        const program = await prisma.program.update({
            where: { id: req.params.id },
            data,
        });

        res.json(program);
    } catch (error) {
        console.error('Update program error:', error);
        res.status(500).json({ error: 'Failed to update program' });
    }
});

// DELETE /api/programs/:id — Soft-delete (set active = false)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        await prisma.program.update({
            where: { id: req.params.id },
            data: { active: false },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete program error:', error);
        res.status(500).json({ error: 'Failed to delete program' });
    }
});

// GET /api/programs/:id/enrollments — List enrolled users
router.get('/:id/enrollments', requireAdmin, async (req, res) => {
    try {
        const enrollments = await prisma.enrollment.findMany({
            where: { programId: req.params.id },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true, nickname: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(enrollments);
    } catch (error) {
        console.error('List enrollments error:', error);
        res.status(500).json({ error: 'Failed to list enrollments' });
    }
});

// POST /api/programs/:id/enroll — Enroll a user by email
router.post('/:id/enroll', requireAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'No user found with that email' });

        const enrollment = await prisma.enrollment.create({
            data: {
                userId: user.id,
                programId: req.params.id,
            },
            include: {
                user: {
                    select: { id: true, email: true, displayName: true, nickname: true }
                }
            }
        });

        res.json(enrollment);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'User is already enrolled in this program' });
        }
        console.error('Enroll user error:', error);
        res.status(500).json({ error: 'Failed to enroll user' });
    }
});

// DELETE /api/programs/:id/enroll/:userId — Remove enrollment
router.delete('/:id/enroll/:userId', requireAdmin, async (req, res) => {
    try {
        await prisma.enrollment.deleteMany({
            where: {
                programId: req.params.id,
                userId: req.params.userId,
            },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Remove enrollment error:', error);
        res.status(500).json({ error: 'Failed to remove enrollment' });
    }
});

module.exports = router;
