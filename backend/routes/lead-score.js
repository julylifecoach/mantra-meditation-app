/**
 * Lead Score API Route
 *
 * POST /api/lead-score
 *   Body: { email: "user@example.com" }
 *   Returns: { score, tier, top_signals, features }
 *
 * GET /api/lead-score/batch
 *   Admin-only. Scores all Kit subscribers, returns ranked list.
 *   Query: ?limit=20 (default 20)
 *
 * The model is a logistic regression exported as JSON coefficients.
 * Scoring is pure JS math -- no Python dependency at runtime.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Load model coefficients
// ---------------------------------------------------------------------------

const MODEL_PATH = path.resolve(__dirname, '../models/lead-score-model.json');
let model = null;

function loadModel() {
    try {
        if (fs.existsSync(MODEL_PATH)) {
            model = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
            console.log(`Lead score model loaded: ${model.features.length} features, ` +
                `trained on ${model.n_samples} samples (${model.n_positive} positive), ` +
                `CV AUC: ${model.cv_auc_mean?.toFixed(3) || 'N/A'}`);
        } else {
            console.log('Lead score model not found at', MODEL_PATH);
        }
    } catch (e) {
        console.error('Failed to load lead score model:', e.message);
    }
}

// Load on startup
loadModel();

// ---------------------------------------------------------------------------
// Sigmoid and scoring functions
// ---------------------------------------------------------------------------

function sigmoid(z) {
    if (z > 500) return 1.0;
    if (z < -500) return 0.0;
    return 1.0 / (1.0 + Math.exp(-z));
}

/**
 * Score a feature vector using the loaded model.
 * @param {Object} features - key-value pairs matching model.features
 * @returns {{ score: number, tier: string, top_signals: string[] }}
 */
function scoreFeatures(features) {
    if (!model) throw new Error('Model not loaded');

    const featureNames = model.features;
    const coefficients = model.coefficients;
    const intercept = model.intercept;
    const scalerMean = model.scaler_mean;
    const scalerScale = model.scaler_scale;

    // Build scaled feature vector
    let z = intercept;
    const contributions = [];

    for (let i = 0; i < featureNames.length; i++) {
        const name = featureNames[i];
        const raw = features[name] ?? 0;
        const scaled = (raw - scalerMean[i]) / (scalerScale[i] || 1);
        const contribution = scaled * coefficients[i];
        z += contribution;

        contributions.push({
            feature: name,
            raw_value: raw,
            contribution: Math.abs(contribution),
            direction: contribution > 0 ? 'positive' : 'negative',
        });
    }

    const score = sigmoid(z);
    const tier = score >= 0.6 ? 'hot' : score >= 0.3 ? 'warm' : 'cold';

    // Top signals: features with largest absolute contribution
    contributions.sort((a, b) => b.contribution - a.contribution);
    const top_signals = contributions.slice(0, 5).map(c =>
        `${c.feature} (${c.direction}, raw=${c.raw_value})`
    );

    return { score: Math.round(score * 1000) / 1000, tier, top_signals };
}

// ---------------------------------------------------------------------------
// Feature engineering from raw data
// ---------------------------------------------------------------------------

function engineerFeatures(record) {
    const now = Date.now();
    const stats = record.stats || {};
    const stripe = record.stripe || {};
    const tags = record.tags || [];
    const eng = record.engagement || {};

    const daysSinceSignup = record.kit_created_at
        ? Math.floor((now - new Date(record.kit_created_at).getTime()) / 86400000)
        : 0;

    const daysSinceLastOpen = stats.last_opened
        ? Math.floor((now - new Date(stats.last_opened).getTime()) / 86400000)
        : 0;

    const daysSinceLastClick = stats.last_clicked
        ? Math.floor((now - new Date(stats.last_clicked).getTime()) / 86400000)
        : 0;

    const tagLower = tags.map(t => (t || '').toLowerCase());
    const emailsSent = stats.sent || 0;
    const firstName = (record.first_name || '').trim();
    const hasRealName = firstName.length > 0 && !firstName.includes('@');

    return {
        days_since_signup: daysSinceSignup,
        has_first_name: hasRealName ? 1 : 0,
        num_tags: tags.length,
        has_quiz_tag: tagLower.some(t => t.includes('quiz')) ? 1 : 0,
        has_lead_magnet_tag: tagLower.some(t =>
            t.includes('action-matrix') || t.includes('return-to-center') || t.includes('afflictions')
        ) ? 1 : 0,
        has_received_emails: emailsSent > 0 ? 1 : 0,
        open_rate: stats.open_rate || 0,
        click_rate: stats.click_rate || 0,
        total_emails_sent: emailsSent,
        total_opens: stats.opened || 0,
        total_clicks: stats.clicked || 0,
        days_since_last_open: daysSinceLastOpen,
        days_since_last_click: daysSinceLastClick,
        sends_since_last_open: stats.sends_since_last_open || 0,
        sends_since_last_click: stats.sends_since_last_click || 0,
        has_abandoned_checkout: (stripe.num_expired || 0) > 0 ? 1 : 0,
        // Platform engagement features
        has_platform_account: eng.has_account ? 1 : 0,
        num_practice_events: eng.num_practice_events || 0,
        unique_practice_tools: eng.unique_practice_tools || 0,
        num_platform_quizzes: eng.num_quizzes || 0,
        has_resilience_score: eng.has_resilience_score ? 1 : 0,
        num_reflections: eng.num_reflections || 0,
        num_kit_tools: eng.num_kit_tools || 0,
    };
}

// ---------------------------------------------------------------------------
// Admin auth middleware
// ---------------------------------------------------------------------------

function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (!key || key !== process.env.ASK_ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ---------------------------------------------------------------------------
// POST /api/lead-score — Score a single subscriber
// ---------------------------------------------------------------------------

router.post('/', async (req, res) => {
    try {
        if (!model) {
            return res.status(503).json({ error: 'Model not loaded. Run training pipeline first.' });
        }

        const { email, features: providedFeatures } = req.body;

        if (!email && !providedFeatures) {
            return res.status(400).json({ error: 'Provide email or features object' });
        }

        let features;
        if (providedFeatures) {
            // Direct feature scoring (for batch/testing)
            features = providedFeatures;
        } else {
            // TODO: Pull live data from Kit + Stripe for this email
            // For now, check if we have a cached dataset
            const datasetPath = path.resolve(__dirname, '../data/lead-score-dataset.json');
            if (!fs.existsSync(datasetPath)) {
                return res.status(400).json({
                    error: 'No dataset found. Run lead-score-extract.js first, or provide features directly.'
                });
            }

            const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
            const record = dataset.find(r => r.email === email.toLowerCase().trim());
            if (!record) {
                return res.status(404).json({ error: `Subscriber ${email} not found in dataset` });
            }

            features = engineerFeatures(record);
        }

        const result = scoreFeatures(features);
        res.json({ email, ...result, features });
    } catch (error) {
        console.error('Lead score error:', error.message);
        res.status(500).json({ error: 'Scoring failed' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/lead-score/batch — Score all subscribers (admin)
// ---------------------------------------------------------------------------

router.get('/batch', requireAdmin, async (req, res) => {
    try {
        if (!model) {
            return res.status(503).json({ error: 'Model not loaded' });
        }

        const limit = parseInt(req.query.limit) || 20;
        const datasetPath = path.resolve(__dirname, '../data/lead-score-dataset.json');

        if (!fs.existsSync(datasetPath)) {
            return res.status(400).json({ error: 'No dataset found. Run lead-score-extract.js first.' });
        }

        const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

        const scored = dataset.map(record => {
            const features = engineerFeatures(record);
            const result = scoreFeatures(features);
            return {
                email: record.email,
                first_name: record.first_name,
                kit_state: record.kit_state,
                score: result.score,
                tier: result.tier,
                top_signals: result.top_signals,
                already_purchased: (record.stripe?.num_completed || 0) > 0,
                total_spend: record.stripe?.total_spend || 0,
            };
        });

        // Sort by score descending, exclude existing purchasers from "leads" list
        const leads = scored
            .filter(s => !s.already_purchased)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        const purchasers = scored.filter(s => s.already_purchased).length;

        res.json({
            total_subscribers: dataset.length,
            total_purchasers: purchasers,
            model_auc: model.cv_auc_mean,
            top_leads: leads,
        });
    } catch (error) {
        console.error('Batch lead score error:', error.message);
        res.status(500).json({ error: 'Batch scoring failed' });
    }
});

// ---------------------------------------------------------------------------
// POST /api/lead-score/reload — Reload model from disk (admin)
// ---------------------------------------------------------------------------

router.post('/reload', requireAdmin, (req, res) => {
    loadModel();
    if (model) {
        res.json({ success: true, features: model.features.length, auc: model.cv_auc_mean });
    } else {
        res.status(500).json({ error: 'Failed to reload model' });
    }
});

// ---------------------------------------------------------------------------
// GET /api/lead-score/engagement — Export platform engagement data (admin)
// Aggregates practice events, quiz results, resilience scores, etc. by email.
// Used by lead-score-extract.js to enrich the dataset.
// ---------------------------------------------------------------------------

router.get('/engagement', requireAdmin, async (req, res) => {
    try {
        const prisma = require('../lib/prisma');

        // Get all users with their engagement data
        const users = await prisma.user.findMany({
            select: {
                email: true,
                displayName: true,
                createdAt: true,
                accessPracticeKit: true,
                accessSelfCoaching: true,
                practiceEvents: {
                    select: {
                        tool: true,
                        eventType: true,
                        createdAt: true,
                    }
                },
                quizResults: {
                    select: {
                        quizName: true,
                        scores: true,
                        verdict: true,
                        createdAt: true,
                    }
                },
                resilienceScores: {
                    select: {
                        totalScore: true,
                        maxScore: true,
                        verdict: true,
                        createdAt: true,
                    }
                },
                reflections: {
                    select: {
                        createdAt: true,
                    }
                },
                kitProgress: {
                    select: {
                        toolKey: true,
                        updatedAt: true,
                    }
                },
                entitlements: {
                    select: {
                        productKey: true,
                        source: true,
                        active: true,
                    }
                },
                enrollments: {
                    select: {
                        createdAt: true,
                    }
                },
            }
        });

        // Aggregate per user
        const engagement = users.map(u => {
            const email = u.email.toLowerCase().trim();
            const practiceEvents = u.practiceEvents || [];
            const quizResults = u.quizResults || [];
            const resilienceScores = u.resilienceScores || [];
            const reflections = u.reflections || [];
            const kitProgress = u.kitProgress || [];
            const entitlements = u.entitlements || [];
            const enrollments = u.enrollments || [];

            // Most recent activity across all event types
            const allDates = [
                ...practiceEvents.map(e => e.createdAt),
                ...quizResults.map(e => e.createdAt),
                ...resilienceScores.map(e => e.createdAt),
                ...reflections.map(e => e.createdAt),
            ].filter(Boolean);
            const lastActive = allDates.length > 0
                ? new Date(Math.max(...allDates.map(d => new Date(d).getTime()))).toISOString()
                : null;

            // Unique practice tools used
            const uniqueTools = [...new Set(practiceEvents.map(e => e.tool))];

            // Latest resilience score
            const latestResilience = resilienceScores.length > 0
                ? resilienceScores.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                : null;

            return {
                email,
                account_created_at: u.createdAt,
                last_active: lastActive,
                num_practice_events: practiceEvents.length,
                unique_practice_tools: uniqueTools.length,
                practice_tools: uniqueTools,
                num_quizzes: quizResults.length,
                quiz_names: [...new Set(quizResults.map(q => q.quizName))],
                has_resilience_score: resilienceScores.length > 0,
                resilience_score: latestResilience?.totalScore || null,
                resilience_max: latestResilience?.maxScore || null,
                num_reflections: reflections.length,
                num_kit_tools: kitProgress.length,
                kit_tools: kitProgress.map(k => k.toolKey),
                num_entitlements: entitlements.length,
                paid_entitlements: entitlements.filter(e => e.source === 'stripe').length,
                num_enrollments: enrollments.length,
                has_practice_kit: u.accessPracticeKit,
                has_self_coaching: u.accessSelfCoaching,
            };
        });

        res.json({
            total_users: engagement.length,
            data: engagement,
        });
    } catch (error) {
        console.error('Engagement export error:', error.message);
        res.status(500).json({ error: 'Failed to export engagement data' });
    }
});

module.exports = router;
