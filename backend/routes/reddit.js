const express = require('express');
const router = express.Router();
const https = require('https');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

router.get('/', async (req, res) => {
    try {
        const subredditsParam = req.query.subreddits || 'Advice,LifeAdvice';
        // maxComments is not available in RSS, so we ignore it here
        const pastHours = parseInt(req.query.hours) || 12;
        
        const subreddits = subredditsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (subreddits.length === 0) {
             return res.status(400).json({ error: 'No valid subreddits provided' });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const timeThreshold = currentTime - (pastHours * 3600);

        let allResults = [];

        // Helper to fetch RSS from Reddit via HTTPs request
        const fetchRedditRss = (sub) => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'www.reddit.com',
                    port: 443,
                    path: `/r/${sub}/new.rss`,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'JulyCoachTools/1.0',
                        'Accept': 'application/rss+xml, application/rdf+xml, application/atom+xml, application/xml, text/xml'
                    }
                };

                const request = https.request(options, response => {
                    let data = '';
                    response.on('data', chunk => { data += chunk; });
                    response.on('end', () => {
                        if (response.statusCode === 200) {
                            try {
                                const parsed = parser.parse(data);
                                resolve({ sub, data: parsed });
                            } catch (e) {
                                reject(new Error(`Failed to parse XML for ${sub}: ${e.message}`));
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
        const fetchPromises = subreddits.map(sub => fetchRedditRss(sub));
        const responses = await Promise.allSettled(fetchPromises);

        for (const promiseResult of responses) {
            if (promiseResult.status === 'fulfilled' && promiseResult.value.data && promiseResult.value.data.feed) {
                const sub = promiseResult.value.sub;
                const entries = promiseResult.value.data.feed.entry || [];
                
                // Ensure entries is an array even if there's only one
                const posts = Array.isArray(entries) ? entries : [entries];
                
                for (const post of posts) {
                    const updatedStr = post.updated || '';
                    const createdUtc = Math.floor(new Date(updatedStr).getTime() / 1000);
                    
                    if (createdUtc >= timeThreshold) {
                        // Extract link
                        let postUrl = '';
                        if (post.link && post.link['@_href']) {
                            postUrl = post.link['@_href'];
                        } else {
                            postUrl = `https://www.reddit.com/r/${sub}/comments/` + (post.id || '').split('_').pop();
                        }

                        // Extract author
                        let authorName = 'Unknown';
                        if (post.author && post.author.name) {
                            authorName = post.author.name.replace('/u/', '');
                        }

                        allResults.push({
                            title: post.title,
                            url: postUrl,
                            subreddit: sub,
                            num_comments: '?', // RSS doesn't provide comment count natively
                            created_utc: createdUtc,
                            author: authorName,
                            selftext: 'Click link to view full post content...'
                        });
                    }
                }
            } else if (promiseResult.status === 'rejected') {
                console.error('Reddit RSS fetch failed:', promiseResult.reason);
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
