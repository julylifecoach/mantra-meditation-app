var prisma = require('../lib/prisma');

// In-memory debounce map: userId -> lastSyncTime (epoch ms)
var lastSyncMap = new Map();
var DEBOUNCE_MS = 60000; // 60 seconds

/**
 * Sync practice data to Kit custom fields for a given user.
 * Fire-and-forget -- never throws. Logs errors with console.error.
 * Debounced: skips if last sync was < 60 seconds ago.
 */
async function syncIfNeeded(userId) {
    try {
        // Debounce check
        var lastSync = lastSyncMap.get(userId);
        var now = Date.now();
        if (lastSync && (now - lastSync) < DEBOUNCE_MS) {
            return;
        }
        lastSyncMap.set(userId, now);

        if (!process.env.KIT_API_KEY) {
            console.error('[kit-sync] KIT_API_KEY not set -- skipping sync');
            return;
        }

        // Look up user to get email
        var user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.email) {
            console.error('[kit-sync] No user or email found for userId:', userId);
            return;
        }

        // Fetch all practice events for the user
        var events = await prisma.practiceEvent.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'asc' },
        });

        if (events.length === 0) {
            return;
        }

        // Compute summary data
        var toolsUsed = [];
        var toolSet = new Set();
        for (var i = 0; i < events.length; i++) {
            toolSet.add(events[i].tool);
        }
        toolsUsed = Array.from(toolSet);

        var practiceToolsUsed = toolsUsed.join(', ');
        var practiceStreak = String(computeCurrentStreak(events));
        var lastPracticeDate = events[events.length - 1].createdAt.toISOString();

        // Find most recent quiz_completed event's primary value
        var primaryQuizResult = '';
        for (var j = events.length - 1; j >= 0; j--) {
            if (events[j].eventType === 'quiz_completed' && events[j].data) {
                var primary = events[j].data.primary;
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
        var headers = {
            'X-Kit-Api-Key': process.env.KIT_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        var lookupRes = await fetch('https://api.kit.com/v4/subscribers?email_address=' + encodeURIComponent(user.email), {
            method: 'GET',
            headers: headers,
        });

        if (!lookupRes.ok) {
            console.error('[kit-sync] Kit subscriber lookup failed:', lookupRes.status);
            return;
        }

        var lookupData = await lookupRes.json();
        var subscribers = lookupData.subscribers || [];
        if (subscribers.length === 0) {
            console.log('[kit-sync] No Kit subscriber found for:', user.email);
            return;
        }

        var subscriberId = subscribers[0].id;

        // Update subscriber custom fields
        var updateRes = await fetch('https://api.kit.com/v4/subscribers/' + subscriberId, {
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

/**
 * Compute current streak from events (unique calendar days, UTC).
 * Same logic as practice.js computeStreak.
 */
function computeCurrentStreak(events) {
    if (events.length === 0) return 0;

    // Get unique dates (UTC, YYYY-MM-DD), sorted ascending
    var daySet = new Set();
    for (var i = 0; i < events.length; i++) {
        var d = new Date(events[i].createdAt);
        daySet.add(d.toISOString().split('T')[0]);
    }
    var uniqueDays = Array.from(daySet).sort();

    // Current streak: count backwards from today
    var today = new Date().toISOString().split('T')[0];
    var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    var lastDay = uniqueDays[uniqueDays.length - 1];

    var current = 0;
    if (lastDay === today || lastDay === yesterday) {
        current = 1;
        for (var j = uniqueDays.length - 2; j >= 0; j--) {
            var curr = new Date(uniqueDays[j + 1]);
            var prev = new Date(uniqueDays[j]);
            var diffMs = curr.getTime() - prev.getTime();
            var diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                current++;
            } else {
                break;
            }
        }
    }

    return current;
}

module.exports = { syncIfNeeded: syncIfNeeded };
