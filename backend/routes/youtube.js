const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const CLIENT_SECRET_PATH = path.join(__dirname, '..', 'client_secret.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

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

// GET /api/youtube/playlist/:playlistId
router.get('/playlist/:playlistId', async (req, res) => {
    const { playlistId } = req.params;
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

        res.json(allItems);
    } catch (error) {
        console.error('YouTube playlist fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch playlist' });
    }
});

module.exports = router;
