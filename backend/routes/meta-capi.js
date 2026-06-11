// Meta Conversions API (CAPI) — server-side event relay
// Sends events directly to Meta, bypassing ad blockers and iOS ATT.
// Deduplicates with client-side pixel via shared event_id.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const PIXEL_ID = '1151507028870537';
const GRAPH_API_VERSION = 'v19.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PIXEL_ID}/events`;

function sha256(value) {
    if (!value) return undefined;
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

// POST /api/meta-capi
// Body: { event_name, event_id, email, fbp, fbc, source_url, custom_data }
router.post('/', async (req, res) => {
    const token = process.env.META_CAPI_TOKEN;
    if (!token) {
        console.error('META_CAPI_TOKEN not set');
        return res.status(500).json({ error: 'CAPI not configured' });
    }

    const { event_name, event_id, email, fbp, fbc, source_url, custom_data } = req.body;

    if (!event_name || !event_id) {
        return res.status(400).json({ error: 'event_name and event_id required' });
    }

    // Build user_data with hashed PII
    const user_data = {};
    if (email) user_data.em = [sha256(email)];
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    // Use forwarded IP from nginx (trust proxy is enabled)
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (clientIp) user_data.client_ip_address = clientIp;

    const clientUa = req.headers['user-agent'];
    if (clientUa) user_data.client_user_agent = clientUa;

    const event = {
        event_name,
        event_time: Math.floor(Date.now() / 1000),
        event_id,
        action_source: 'website',
        event_source_url: source_url || undefined,
        user_data,
    };

    if (custom_data && Object.keys(custom_data).length > 0) {
        event.custom_data = custom_data;
    }

    try {
        const response = await fetch(GRAPH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: [event],
                access_token: token,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('Meta CAPI error:', JSON.stringify(result));
            return res.status(response.status).json({ error: 'CAPI request failed', detail: result });
        }

        res.json({ ok: true, events_received: result.events_received });
    } catch (err) {
        console.error('Meta CAPI fetch error:', err.message);
        res.status(502).json({ error: 'Failed to reach Meta API' });
    }
});

module.exports = router;
