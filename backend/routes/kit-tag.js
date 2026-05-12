const express = require('express');
const router = express.Router();

// POST /api/kit-tag — Apply Kit tags to a subscriber
// Used by SA quiz results page to tag subscribers with pattern-specific tags
router.post('/', async (req, res) => {
    try {
        const { email, tagIds } = req.body;

        if (!email || !tagIds || !Array.isArray(tagIds)) {
            return res.status(400).json({ error: 'email and tagIds[] are required' });
        }

        const apiSecret = process.env.KIT_API_SECRET;
        if (!apiSecret) {
            console.error('KIT_API_SECRET not configured');
            return res.status(500).json({ error: 'Kit API not configured' });
        }

        const results = [];

        for (const tagId of tagIds) {
            try {
                const response = await fetch(
                    `https://api.convertkit.com/v3/tags/${tagId}/subscribe`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            api_secret: apiSecret,
                            email: email,
                        }),
                    }
                );

                if (response.ok) {
                    results.push({ tagId, status: 'ok' });
                } else {
                    const text = await response.text();
                    console.error(`Kit tag ${tagId} failed:`, text);
                    results.push({ tagId, status: 'error', detail: text.slice(0, 100) });
                }
            } catch (err) {
                console.error(`Kit tag ${tagId} error:`, err.message);
                results.push({ tagId, status: 'error', detail: err.message });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error('Kit tag error:', error);
        res.status(500).json({ error: 'Failed to apply tags' });
    }
});

module.exports = router;
