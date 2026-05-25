const prisma = require('../lib/prisma');
const computeStreak = require('./streak');

// In-memory debounce map: userId -> lastSyncTime (epoch ms)
const lastSyncMap = new Map();
const DEBOUNCE_MS = 60000; // 60 seconds

/**
 * Sync practice data to Kit custom fields for a given user.
 * Fire-and-forget -- never throws. Logs errors with console.error.
 * Debounced: skips if last sync was < 60 seconds ago.
 */
async function syncIfNeeded(userId) {
    try {
        // Debounce check
        const lastSync = lastSyncMap.get(userId);
        const now = Date.now();
        if (lastSync && (now - lastSync) < DEBOUNCE_MS) {
            return;
        }
        lastSyncMap.set(userId, now);

        if (!process.env.KIT_API_KEY) {
            console.error('[kit-sync] KIT_API_KEY not set -- skipping sync');
            return;
        }

        // Look up user to get email
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.email) {
            console.error('[kit-sync] No user or email found for userId:', userId);
            return;
        }

        // Fetch all practice events for the user
        const events = await prisma.practiceEvent.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'asc' },
        });

        if (events.length === 0) {
            return;
        }

        // Compute summary data
        const toolSet = new Set();
        for (let i = 0; i < events.length; i++) {
            toolSet.add(events[i].tool);
        }
        const toolsUsed = Array.from(toolSet);

        const practiceToolsUsed = toolsUsed.join(', ');
        const streakData = computeStreak(events);
        const practiceStreak = String(streakData.current);
        const lastPracticeDate = events[events.length - 1].createdAt.toISOString();

        // Find most recent quiz_completed event's primary value
        let primaryQuizResult = '';
        for (let j = events.length - 1; j >= 0; j--) {
            if (events[j].eventType === 'quiz_completed' && events[j].data) {
                const primary = events[j].data.primary;
                if (primary) {
                    // Format nicely: replace underscores/hyphens with spaces, title case
                    primaryQuizResult = String(primary)
                        .replace(/[_-]/g, ' ')
                        .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
                    break;
                }
            }
        }

        // Find Kit subscriber by email
        const headers = {
            'X-Kit-Api-Key': process.env.KIT_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const lookupRes = await fetch('https://api.kit.com/v4/subscribers?email_address=' + encodeURIComponent(user.email), {
            method: 'GET',
            headers: headers,
        });

        if (!lookupRes.ok) {
            console.error('[kit-sync] Kit subscriber lookup failed:', lookupRes.status);
            return;
        }

        const lookupData = await lookupRes.json();
        const subscribers = lookupData.subscribers || [];
        if (subscribers.length === 0) {
            console.log('[kit-sync] No Kit subscriber found for:', user.email);
            return;
        }

        const subscriberId = subscribers[0].id;

        // Update subscriber custom fields
        const updateRes = await fetch('https://api.kit.com/v4/subscribers/' + subscriberId, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                fields: {
                    practice_tools_used: practiceToolsUsed,
                    practice_streak: practiceStreak,
                    last_practice_date: lastPracticeDate,
                    primary_quiz_result: primaryQuizResult,
                }
            }),
        });

        if (!updateRes.ok) {
            console.error('[kit-sync] Kit subscriber update failed:', updateRes.status);
            return;
        }

        console.log('[kit-sync] Synced practice data for:', user.email);
    } catch (err) {
        console.error('[kit-sync] Sync error:', err.message);
    }
}

module.exports = { syncIfNeeded };
