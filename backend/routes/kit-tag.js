/**
 * Kit Tag Proxy Route
 * 
 * Proxies Kit (ConvertKit) tag subscription requests so the API secret
 * is never exposed in client-side code.
 * 
 * POST /api/kit-tag
 * Body: { email: string, tagIds: number[] }
 */

const express = require('express');
const router = express.Router();

const ALLOWED_TAG_IDS = new Set([
    19092885, // SA quiz — general tag
    19092886, // SA quiz — doom
    19092887, // SA quiz — leeroy
    19092888, // SA quiz — panda
    19092889, // SA quiz — ogre
    19092890, // SA quiz — ragnaros
]);

router.post('/', async (req, res) => {
    try {
        const { email, tagIds } = req.body;

        if (!email || !email.includes('@') || !Array.isArray(tagIds) || tagIds.length === 0) {
            return res.status(400).json({ error: 'Invalid request: email and tagIds[] required' });
        }

        const secret = process.env.KIT_API_SECRET;
        if (!secret) {
            console.error('KIT_API_SECRET not configured in .env');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Validate all tag IDs are in the allowlist
        for (const id of tagIds) {
            if (!ALLOWED_TAG_IDS.has(id)) {
                return res.status(403).json({ error: `Tag ID ${id} not allowed` });
            }
        }

        // Apply each tag via Kit API v3
        const results = await Promise.allSettled(
            tagIds.map(tagId =>
                fetch(`https://api.convertkit.com/v3/tags/${tagId}/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_secret: secret, email }),
                }).then(r => ({ tagId, status: r.status }))
            )
        );

        const applied = results
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value.tagId);

        res.json({ success: true, tagsApplied: applied });
    } catch (error) {
        console.error('Kit tag proxy error:', error);
        res.status(500).json({ error: 'Failed to apply tags' });
    }
});

module.exports = router;
