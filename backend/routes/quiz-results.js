const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// POST /api/quiz-results
// Anonymous — stores quiz completion for statistical analysis
router.post('/', async (req, res) => {
    try {
        const { quizName, answers, scores, factors, verdict, metadata } = req.body;
        const resolvedScores = scores || factors;

        if (!quizName || !answers || !resolvedScores) {
            return res.status(400).json({ error: 'quizName, answers, and scores (or factors) are required' });
        }

        const allowedQuizzes = ['ego_check', 'resilience', 'nlp_submodality', 'social_anxiety_pattern_v3', 'procrastination_type_v1', 'perception_map_v1', 'reaction_mirror'];
        if (!allowedQuizzes.includes(quizName)) {
            return res.status(400).json({ error: `Invalid quizName. Must be one of: ${allowedQuizzes.join(', ')}` });
        }

        const result = await prisma.quizResult.create({
            data: {
                quizName,
                answers,
                scores: resolvedScores,
                verdict: verdict || null,
                metadata: metadata || null,
            }
        });

        res.status(201).json({ message: 'Result saved', id: result.id });
    } catch (error) {
        console.error('Error saving quiz result:', error);
        res.status(500).json({ error: 'Failed to save quiz result' });
    }
});

// GET /api/quiz-results/stats/:quizName
// Admin-only — returns aggregate statistics
router.get('/stats/:quizName', authenticate, async (req, res) => {
    try {
        // Check admin
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { quizName } = req.params;
        const results = await prisma.quizResult.findMany({
            where: { quizName },
            orderBy: { createdAt: 'desc' },
        });

        const count = results.length;
        if (count === 0) {
            return res.json({ quizName, count: 0, message: 'No results yet' });
        }

        // Compute average total score
        let totalSum = 0;
        let totalMax = 0;
        results.forEach(r => {
            if (r.scores && r.scores.total !== undefined) {
                totalSum += r.scores.total;
                totalMax = r.scores.totalMax || totalMax;
            }
        });

        res.json({
            quizName,
            count,
            averageScore: count > 0 ? Math.round(totalSum / count * 10) / 10 : 0,
            maxPossible: totalMax,
            oldest: results[results.length - 1].createdAt,
            newest: results[0].createdAt,
        });
    } catch (error) {
        console.error('Error fetching quiz stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/quiz-results/export/:quizName
// Admin-only — returns all raw results for analysis
router.get('/export/:quizName', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { quizName } = req.params;
        const results = await prisma.quizResult.findMany({
            where: { quizName },
            orderBy: { createdAt: 'desc' },
        });

        res.json(results);
    } catch (error) {
        console.error('Error exporting quiz results:', error);
        res.status(500).json({ error: 'Failed to export results' });
    }
});

module.exports = router;
