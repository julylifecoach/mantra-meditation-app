const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const CLIENT_SECRET_PATH = path.join(__dirname, '..', 'client_secret.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

async function getAuthenticatedClient() {
    const content = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8'));
    const { client_id, client_secret } = content.installed;

    const oauth2Client = new OAuth2Client(client_id, client_secret, 'http://localhost:3333');

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(token);

    // Refresh if expired
    if (token.expiry_date && Date.now() >= token.expiry_date - 60000) {
        console.log('🔄 Refreshing YouTube OAuth token...');
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
    }

    return oauth2Client;
}

function getCachedPlaylist(playlistId) {
    const cachePath = path.join(CACHE_DIR, `playlist-${playlistId}.json`);
    if (!fs.existsSync(cachePath)) return null;
    try {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`📦 YouTube cache HIT for ${playlistId} (${Math.round((Date.now() - cached.timestamp) / 60000)}min old)`);
            return cached.items;
        }
        console.log(`⏰ YouTube cache EXPIRED for ${playlistId}`);
    } catch (e) { /* corrupt cache, refetch */ }
    return null;
}

function setCachedPlaylist(playlistId, items) {
    const cachePath = path.join(CACHE_DIR, `playlist-${playlistId}.json`);
    fs.writeFileSync(cachePath, JSON.stringify({ timestamp: Date.now(), items }, null, 2));
    console.log(`💾 YouTube cache SET for ${playlistId} (${items.length} items)`);
}

// GET /api/youtube/playlist/:playlistId
router.get('/playlist/:playlistId', async (req, res) => {
    const { playlistId } = req.params;

    // Check cache first
    const cached = getCachedPlaylist(playlistId);
    if (cached) return res.json(cached);

    // Cache miss — fetch from API
    const allItems = [];
    let nextPageToken = '';

    try {
        const auth = await getAuthenticatedClient();
        const accessToken = (await auth.getAccessToken()).token;

        // Paginate through all playlist items (50 per page)
        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) {
                const err = await response.json();
                console.error('YouTube API error:', err);
                // If quota exceeded but we have stale cache, serve stale
                const stalePath = path.join(CACHE_DIR, `playlist-${playlistId}.json`);
                if (fs.existsSync(stalePath)) {
                    const stale = JSON.parse(fs.readFileSync(stalePath, 'utf8'));
                    console.log(`⚠️ API failed, serving STALE cache (${Math.round((Date.now() - stale.timestamp) / 3600000)}h old)`);
                    return res.json(stale.items);
                }
                return res.status(response.status).json({ error: 'YouTube API request failed' });
            }

            const data = await response.json();

            for (const item of (data.items || [])) {
                const snippet = item.snippet;
                if (!snippet || !snippet.resourceId?.videoId) continue;

                allItems.push({
                    videoId: snippet.resourceId.videoId,
                    title: snippet.title,
                    description: snippet.description || '',
                    thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
                    publishedAt: snippet.publishedAt,
                    position: snippet.position
                });
            }

            nextPageToken = data.nextPageToken || '';
        } while (nextPageToken);

        // Cache the result
        setCachedPlaylist(playlistId, allItems);
        res.json(allItems);
    } catch (error) {
        console.error('YouTube playlist fetch error:', error);
        // Try stale cache on any error
        const stalePath = path.join(CACHE_DIR, `playlist-${playlistId}.json`);
        if (fs.existsSync(stalePath)) {
            const stale = JSON.parse(fs.readFileSync(stalePath, 'utf8'));
            console.log(`⚠️ Error fallback, serving STALE cache`);
            return res.json(stale.items);
        }
        res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

module.exports = router;
