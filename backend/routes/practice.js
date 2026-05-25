const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const kitSync = require('../lib/kit-sync');
const computeStreak = require('../lib/streak');

const router = express.Router();

// -- Valid tool identifiers --
const VALID_TOOLS = [
    'afflictions-quiz',
    'ego-quiz',
    'resilience-quiz',
    'nlp-submodality-quiz',
    'social-anxiety-quiz',
    'procrastination-quiz',
    'perception-map-quiz',
    'reaction-mirror-quiz',
    'meditation',
    'guided-100-days',
    'heart-opening-108',
    'listening-lens',
    'side-effect-quests',
    'sa-practice-kit-workbook',
];

// -- Valid event types --
const VALID_EVENT_TYPES = [
    'quiz_completed',
    'session_logged',
    'checkin',
    'guide_step',
    'tool_started',
    'milestone_reached',
];

// -- Milestone definitions --
const MILESTONE_DEFS = [
    { key: 'first_quiz',       label: 'First Quiz Taken',                   check: (events) => events.some(e => e.eventType === 'quiz_completed') },
    { key: 'first_meditation', label: 'First Meditation Session',           check: (events) => events.some(e => e.tool === 'meditation') },
    { key: 'three_tools',      label: 'Explorer -- Used 3 Different Tools', check: (events) => new Set(events.map(e => e.tool)).size >= 3 },
    { key: 'all_quizzes',      label: 'Quiz Master -- Completed All Quizzes', check: (events) => {
        const quizTools = VALID_TOOLS.filter(t => t.endsWith('-quiz'));
        const completed = new Set(events.filter(e => e.eventType === 'quiz_completed').map(e => e.tool));
        return quizTools.every(q => completed.has(q));
    }},
    { key: '7_day_streak',     label: '7-Day Practice Streak',              check: (events) => computeStreak(events).longest >= 7 },
    { key: '30_day_streak',    label: '30-Day Practice Streak',             check: (events) => computeStreak(events).longest >= 30 },
    { key: 'first_practice_tool', label: 'First Practice Tool Used', check: function(events) {
        var kitTools = ['heart-opening-108', 'listening-lens', 'side-effect-quests', 'sa-practice-kit-workbook'];
        return events.some(function(e) { return kitTools.indexOf(e.tool) !== -1; });
    }},
    { key: '100_day_complete', label: '100 Days of Practice Complete', check: function(events) {
        return events.filter(function(e) { return e.tool === 'guided-100-days' && e.eventType === 'checkin'; }).length >= 100;
    }},
];

// ============================================================
//  POST /api/practice/event -- log a practice event
// ============================================================
router.post('/event', authenticate, async (req, res) => {
    try {
        const { tool, eventType, data } = req.body;

        if (!tool || !eventType) {
            return res.status(400).json({ error: 'tool and eventType are required' });
        }

        if (!VALID_TOOLS.includes(tool)) {
            return res.status(400).json({
                error: `Invalid tool. Must be one of: ${VALID_TOOLS.join(', ')}`,
            });
        }

        if (!VALID_EVENT_TYPES.includes(eventType)) {
            return res.status(400).json({
                error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
            });
        }

        // Size guard on data payload (100KB max)
        if (data && JSON.stringify(data).length > 100_000) {
            return res.status(413).json({ error: 'Event data too large (max 100KB)' });
        }

        const event = await prisma.practiceEvent.create({
            data: {
                userId: req.userId,
                tool,
                eventType,
                data: data || null,
            },
        });

        // Check if a new milestone was just achieved
        const allEvents = await prisma.practiceEvent.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'asc' },
        });

        const milestone = detectNewMilestone(allEvents, event);

        // Fire-and-forget Kit sync
        kitSync.syncIfNeeded(req.userId).catch(function(err) {
            console.error('[kit-sync] Background sync error:', err.message);
        });

        res.status(201).json({
            id: event.id,
            milestone: milestone || undefined,
        });
    } catch (error) {
        console.error('Error logging practice event:', error);
        res.status(500).json({ error: 'Failed to log practice event' });
    }
});

// ============================================================
//  GET /api/practice/map -- full practice map
// ============================================================
router.get('/map', authenticate, async (req, res) => {
    try {
        const events = await prisma.practiceEvent.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });

        // Also pull in any linked quiz results
        const quizResults = await prisma.quizResult.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });

        const profile = buildProfile(events);
        const milestones = computeMilestones(events);
        const insights = computeInsights(events, quizResults);
        const nextSteps = computeNextSteps(events);

        res.json({
            profile,
            events: events.map(formatEvent),
            quizResults: quizResults.map(formatQuizResult),
            milestones,
            insights,
            nextSteps,
        });
    } catch (error) {
        console.error('Error fetching practice map:', error);
        res.status(500).json({ error: 'Failed to fetch practice map' });
    }
});

// ============================================================
//  GET /api/practice/summary -- lightweight summary
// ============================================================
router.get('/summary', authenticate, async (req, res) => {
    try {
        const events = await prisma.practiceEvent.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
        });

        const profile = buildProfile(events);

        // Latest result per quiz tool
        const latestResults = {};
        for (const e of events) {
            if (e.eventType === 'quiz_completed' && !latestResults[e.tool]) {
                latestResults[e.tool] = e.data;
            }
        }

        res.json({
            totalEvents: profile.totalEvents,
            toolsUsed: profile.toolsUsed,
            currentStreak: profile.currentStreak,
            longestStreak: profile.longestStreak,
            firstEvent: profile.firstEvent,
            latestResults,
        });
    } catch (error) {
        console.error('Error fetching practice summary:', error);
        res.status(500).json({ error: 'Failed to fetch practice summary' });
    }
});

// ============================================================
//  Helper functions
// ============================================================

/**
 * Build a profile summary from event history
 */
function buildProfile(events) {
    const toolsUsed = [...new Set(events.map(e => e.tool))];
    const streakData = computeStreak(events);

    return {
        toolsUsed,
        totalEvents: events.length,
        firstEvent: events.length > 0 ? events[events.length - 1].createdAt : null,
        currentStreak: streakData.current,
        longestStreak: streakData.longest,
    };
}



/**
 * Compute which milestones have been achieved
 */
function computeMilestones(events) {
    const achieved = [];

    for (const def of MILESTONE_DEFS) {
        if (def.check(events)) {
            // Find the earliest event that could have triggered it
            // (approximation -- use earliest event time as achievedAt)
            const achievedAt = findMilestoneAchievedAt(def.key, events);
            achieved.push({
                key: def.key,
                label: def.label,
                achievedAt,
            });
        }
    }

    return achieved;
}

/**
 * Approximate when a milestone was first achieved
 */
function findMilestoneAchievedAt(key, events) {
    const sorted = [...events].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    switch (key) {
        case 'first_quiz': {
            const e = sorted.find(e => e.eventType === 'quiz_completed');
            return e ? e.createdAt : null;
        }
        case 'first_meditation': {
            const e = sorted.find(e => e.tool === 'meditation');
            return e ? e.createdAt : null;
        }
        case 'three_tools': {
            const seen = new Set();
            for (const e of sorted) {
                seen.add(e.tool);
                if (seen.size >= 3) return e.createdAt;
            }
            return null;
        }
        case 'all_quizzes': {
            const quizTools = VALID_TOOLS.filter(t => t.endsWith('-quiz'));
            const seen = new Set();
            for (const e of sorted) {
                if (e.eventType === 'quiz_completed') {
                    seen.add(e.tool);
                    if (quizTools.every(q => seen.has(q))) return e.createdAt;
                }
            }
            return null;
        }
        case 'first_practice_tool': {
            var kitTools = ['heart-opening-108', 'listening-lens', 'side-effect-quests', 'sa-practice-kit-workbook'];
            var e = sorted.find(function(ev) { return kitTools.indexOf(ev.tool) !== -1; });
            return e ? e.createdAt : null;
        }
        case '100_day_complete': {
            var count = 0;
            for (var i = 0; i < sorted.length; i++) {
                if (sorted[i].tool === 'guided-100-days' && sorted[i].eventType === 'checkin') {
                    count++;
                    if (count >= 100) return sorted[i].createdAt;
                }
            }
            return null;
        }
        default:
            return sorted.length > 0 ? sorted[sorted.length - 1].createdAt : null;
    }
}

/**
 * Detect if the newly created event triggers a milestone for the first time
 */
function detectNewMilestone(allEvents, newEvent) {
    // Check each milestone: is it achieved now, but NOT achieved without the new event?
    const withoutNew = allEvents.filter(e => e.id !== newEvent.id);

    for (const def of MILESTONE_DEFS) {
        const achievedNow = def.check(allEvents);
        const achievedBefore = def.check(withoutNew);

        if (achievedNow && !achievedBefore) {
            return { key: def.key, label: def.label };
        }
    }

    return null;
}

/**
 * Static pattern-based insights derived from quiz results and practice data
 */
function computeInsights(events, quizResults) {
    const insights = [];

    // Extract quiz result patterns
    const quizData = {};
    for (const qr of quizResults) {
        if (!quizData[qr.quizName]) {
            quizData[qr.quizName] = qr;
        }
    }

    // Also check practice events for quiz data
    for (const e of events) {
        if (e.eventType === 'quiz_completed' && e.data) {
            const toolName = e.tool.replace(/-quiz$/, '').replace(/-/g, '_');
            if (!quizData[toolName]) {
                quizData[toolName] = { scores: e.data.scores, data: e.data };
            }
        }
    }

    // Insight: Afflictions + Ego quiz correlation
    const afflictions = quizData['afflictions'] || findEventData(events, 'afflictions-quiz');
    const ego = quizData['ego_check'] || findEventData(events, 'ego-quiz');

    if (afflictions && ego) {
        const afflictionPrimary = (afflictions.data && afflictions.data.primary) ||
                                   (afflictions.scores && afflictions.scores.primary);
        const egoPattern = (ego.data && ego.data.primary) ||
                            (ego.verdict);

        if (afflictionPrimary && egoPattern) {
            insights.push({
                type: 'pattern_link',
                tools: ['afflictions-quiz', 'ego-quiz'],
                message: `Your Afflictions result (${afflictionPrimary}) and Ego Check result (${egoPattern}) may share a common root. Exploring both patterns together can reveal deeper self-understanding.`,
            });
        }
    }

    // Insight: High SA score + short meditation sessions
    const saQuiz = quizData['social_anxiety_pattern_v3'] || findEventData(events, 'social-anxiety-quiz');
    const meditations = events.filter(e => e.tool === 'meditation' && e.eventType === 'session_logged');

    if (saQuiz && meditations.length > 0) {
        const avgDuration = meditations.reduce((sum, e) => {
            const dur = (e.data && e.data.duration) || 0;
            return sum + dur;
        }, 0) / meditations.length;

        if (avgDuration < 600) { // Less than 10 minutes average
            insights.push({
                type: 'patience_practice',
                tools: ['social-anxiety-quiz', 'meditation'],
                message: 'Your meditation sessions are under 10 minutes on average. Gradually extending your sit time can help build the patience and grounding that social anxiety work benefits from.',
            });
        }
    }

    // Insight: Multiple quizzes completed
    const quizEvents = events.filter(e => e.eventType === 'quiz_completed');
    const uniqueQuizzes = new Set(quizEvents.map(e => e.tool));
    if (uniqueQuizzes.size >= 3) {
        insights.push({
            type: 'self_awareness',
            tools: [...uniqueQuizzes],
            message: `You have explored ${uniqueQuizzes.size} different self-assessment tools. This breadth of self-inquiry is itself a practice -- each lens reveals something the others miss.`,
        });
    }

    // Insight: Procrastination + Ego correlation
    var procrastination = quizData['procrastination_type_v1'] || findEventData(events, 'procrastination-quiz');
    if (procrastination && ego) {
        var procType = (procrastination.data && procrastination.data.primary) || (procrastination.verdict);
        var egoPattern = (ego.data && ego.data.primary) || (ego.verdict);
        if (procType && egoPattern) {
            insights.push({
                type: 'root_pattern',
                tools: ['procrastination-quiz', 'ego-quiz'],
                message: 'Your procrastination type (' + procType + ') and ego pattern (' + egoPattern + ') often reinforce each other. Understanding one helps unlock the other.',
            });
        }
    }

    // Insight: Resilience + Meditation synergy
    var resQuiz = quizData['resilience'] || findEventData(events, 'resilience-quiz');
    if (resQuiz && meditations.length >= 3) {
        insights.push({
            type: 'growth_synergy',
            tools: ['resilience-quiz', 'meditation'],
            message: 'Your meditation practice directly strengthens the resilience factors you mapped. Consistent sitting builds the neural pathways that resilience depends on.',
        });
    }

    // Insight: Perception Map + NLP Submodality awareness
    var perceptionQuiz = quizData['perception_map_v1'] || findEventData(events, 'perception-map-quiz');
    var nlpQuiz = quizData['nlp_submodality'] || findEventData(events, 'nlp-submodality-quiz');
    if (perceptionQuiz && nlpQuiz) {
        insights.push({
            type: 'complementary_lenses',
            tools: ['perception-map-quiz', 'nlp-submodality-quiz'],
            message: 'Your Perception Map and NLP Submodality results are complementary lenses -- one maps how you see the world, the other maps how your senses process it. Together they reveal your full perceptual fingerprint.',
        });
    }

    return insights;
}

/**
 * Find the latest event data for a given tool
 */
function findEventData(events, tool) {
    const e = events.find(ev => ev.tool === tool && ev.eventType === 'quiz_completed');
    return e ? { data: e.data, scores: e.data } : null;
}

/**
 * Rule-based next-step suggestions
 */
function computeNextSteps(events) {
    const steps = [];
    const toolsUsed = new Set(events.map(e => e.tool));
    const quizzes = events.filter(e => e.eventType === 'quiz_completed');
    const meditations = events.filter(e => e.tool === 'meditation');
    const checkins = events.filter(e => e.tool === 'guided-100-days');

    // No meditation yet
    if (!toolsUsed.has('meditation')) {
        steps.push({
            tool: 'meditation',
            reason: 'You have mapped your patterns but have not tried sitting with them yet. A meditation practice turns insight into embodied awareness.',
        });
    }

    // Quizzes but no sustained practice
    if (quizzes.length >= 2 && checkins.length === 0) {
        steps.push({
            tool: 'guided-100-days',
            reason: 'Ready to build a daily practice? 100 Days of Practice builds on what you have discovered in the quizzes.',
        });
    }

    // Has meditation + streak, suggest deepening
    const streakData = computeStreak(events);
    if (meditations.length >= 5 && streakData.current >= 7) {
        steps.push({
            tool: 'coaching',
            reason: 'Your consistent practice shows real commitment. Working with a coach could help you go deeper with what is coming up.',
        });
    }

    // SA Practice Kit suggestion
    if (toolsUsed.has('social-anxiety-quiz') && !toolsUsed.has('sa-practice-kit-workbook')) {
        steps.push({
            tool: 'sa-practice-kit-workbook',
            reason: 'You have identified your social anxiety pattern. The SA Practice Workbook turns that awareness into daily practice exercises.',
        });
    }

    // Heart Opening after meditation
    if (meditations.length >= 5 && !toolsUsed.has('heart-opening-108')) {
        steps.push({
            tool: 'heart-opening-108',
            reason: 'With your established meditation practice, Heart Opening 108 can help you bring compassion and openness into your sits.',
        });
    }

    // Hasn't tried all quizzes
    const quizToolsUsed = new Set(quizzes.map(e => e.tool));
    const allQuizTools = VALID_TOOLS.filter(t => t.endsWith('-quiz'));
    const unusedQuizzes = allQuizTools.filter(t => !quizToolsUsed.has(t));

    if (unusedQuizzes.length > 0 && unusedQuizzes.length <= 4) {
        steps.push({
            tool: unusedQuizzes[0],
            reason: `You have ${allQuizTools.length - unusedQuizzes.length} of ${allQuizTools.length} quizzes completed. Try the ${formatToolName(unusedQuizzes[0])} to add another perspective to your Practice Map.`,
        });
    }

    return steps;
}

/**
 * Format a tool key into a human-readable name
 */
function formatToolName(tool) {
    return tool
        .replace(/-/g, ' ')
        .replace(/quiz$/, 'Quiz')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
}

/**
 * Format a practice event for API response (strip internal fields)
 */
function formatEvent(event) {
    return {
        id: event.id,
        tool: event.tool,
        eventType: event.eventType,
        data: event.data,
        createdAt: event.createdAt,
    };
}

/**
 * Format a quiz result for API response
 */
function formatQuizResult(qr) {
    return {
        id: qr.id,
        quizName: qr.quizName,
        scores: qr.scores,
        verdict: qr.verdict,
        createdAt: qr.createdAt,
    };
}

module.exports = router;
