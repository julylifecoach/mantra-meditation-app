/**
 * Compute current and longest streaks from practice events.
 * A "streak day" is any calendar day (UTC) with at least one event.
 */
function computeStreak(events) {
    if (events.length === 0) return { current: 0, longest: 0 };

    // Get unique dates (UTC, YYYY-MM-DD), sorted ascending
    const uniqueDays = [...new Set(
        events.map(e => {
            const d = new Date(e.createdAt);
            return d.toISOString().split('T')[0];
        })
    )].sort();

    let longest = 1;
    let currentRun = 1;

    for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diffMs = curr.getTime() - prev.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            currentRun++;
        } else {
            currentRun = 1;
        }

        if (currentRun > longest) {
            longest = currentRun;
        }
    }

    // Current streak: count backwards from today
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastDay = uniqueDays[uniqueDays.length - 1];

    let current = 0;
    if (lastDay === today || lastDay === yesterday) {
        current = 1;
        for (let i = uniqueDays.length - 2; i >= 0; i--) {
            const curr = new Date(uniqueDays[i + 1]);
            const prev = new Date(uniqueDays[i]);
            const diffMs = curr.getTime() - prev.getTime();
            const diffDays = diffMs / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                current++;
            } else {
                break;
            }
        }
    }

    return { current, longest };
}

module.exports = computeStreak;
