const express = require('express');
const router = express.Router();
const https = require('https');

router.get('/', async (req, res) => {
    try {
        const subredditsParam = req.query.subreddits || 'Advice,LifeAdvice';
        const maxComments = parseInt(req.query.maxComments) || 50;
        const pastHours = parseInt(req.query.hours) || 12;
        
        const subreddits = subredditsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (subreddits.length === 0) {
             return res.status(400).json({ error: 'No valid subreddits provided' });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const timeThreshold = currentTime - (pastHours * 3600);

        let allResults = [];

        // Helper to fetch JSON from Reddit via HTTPs request
        const fetchReddit = (sub) => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'www.reddit.com',
                    port: 443,
                    path: `/r/${sub}/new.json?limit=100`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'JulyCoachTools/1.0 (by /u/julylifecoach)'
                    }
                };

                const request = https.request(options, response => {
                    let data = '';
                    response.on('data', chunk => { data += chunk; });
                    response.on('end', () => {
                        if (response.statusCode === 200) {
                            try {
                                resolve({ sub, data: JSON.parse(data) });
                            } catch (e) {
                                reject(new Error(`Failed to parse JSON for ${sub}: ${e.message}`));
                            }
                        } else {
                            resolve({ sub, error: `Status ${response.statusCode}`, data: null });
                        }
                    });
                });

                request.on('error', error => reject(error));
                request.end();
            });
        };

        // Fetch all subreddits in parallel
        const fetchPromises = subreddits.map(sub => fetchReddit(sub));
        const responses = await Promise.allSettled(fetchPromises);

        for (const promiseResult of responses) {
            if (promiseResult.status === 'fulfilled' && promiseResult.value.data && promiseResult.value.data.data) {
                const sub = promiseResult.value.sub;
                const children = promiseResult.value.data.data.children || [];
                
                for (const child of children) {
                    const post = child.data;
                    const createdUtc = post.created_utc;
                    const numComments = post.num_comments;
                    
                    if (createdUtc >= timeThreshold && numComments <= maxComments) {
                        allResults.push({
                            title: post.title,
                            url: 'https://www.reddit.com' + post.permalink,
                            subreddit: sub,
                            num_comments: numComments,
                            created_utc: createdUtc,
                            author: post.author,
                            selftext: post.selftext ? post.selftext.substring(0, 300) + (post.selftext.length > 300 ? '...' : '') : ''
                        });
                    }
                }
            } else if (promiseResult.status === 'rejected') {
                console.error('Reddit fetch failed:', promiseResult.reason);
            }
        }

        // Sort by newest first
        allResults.sort((a, b) => b.created_utc - a.created_utc);

        res.json({ success: true, count: allResults.length, data: allResults });

    } catch (error) {
        console.error('API Reddit error:', error);
        res.status(500).json({ error: 'Failed to aggregate Reddit data', details: error.message });
    }
});

module.exports = router;
