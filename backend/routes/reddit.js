const express = require('express');
const router = express.Router();
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

router.get('/', async (req, res) => {
    try {
        const subredditsParam = req.query.subreddits || 'Advice,LifeAdvice';
        const pastHours = parseInt(req.query.hours) || 12;
        
        const subreddits = subredditsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (subreddits.length === 0) {
             return res.status(400).json({ error: 'No valid subreddits provided' });
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const timeThreshold = currentTime - (pastHours * 3600);

        let allResults = [];

        // Fetch RSS using native fetch (handles redirects automatically)
        const fetchRedditRss = async (sub) => {
            const response = await fetch(`https://www.reddit.com/r/${sub}/new.rss`, {
                headers: {
                    'User-Agent': 'JulyCoachTools/1.0',
                    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
                },
                redirect: 'follow',
            });

            if (!response.ok) {
                console.error(`Reddit RSS ${sub}: HTTP ${response.status}`);
                return { sub, data: null };
            }

            const text = await response.text();
            try {
                const parsed = parser.parse(text);
                return { sub, data: parsed };
            } catch (e) {
                console.error(`Failed to parse XML for ${sub}:`, e.message);
                return { sub, data: null };
            }
        };

        // Fetch all subreddits in parallel
        const responses = await Promise.allSettled(subreddits.map(sub => fetchRedditRss(sub)));

        for (const promiseResult of responses) {
            if (promiseResult.status === 'fulfilled' && promiseResult.value.data && promiseResult.value.data.feed) {
                const sub = promiseResult.value.sub;
                const entries = promiseResult.value.data.feed.entry || [];
                
                // Ensure entries is an array even if there's only one
                const posts = Array.isArray(entries) ? entries : [entries];
                
                for (const post of posts) {
                    const updatedStr = post.updated || post.published || '';
                    const createdUtc = Math.floor(new Date(updatedStr).getTime() / 1000);
                    
                    if (createdUtc >= timeThreshold) {
                        // Extract link — can be single object or array
                        let postUrl = '';
                        if (Array.isArray(post.link)) {
                            const altLink = post.link.find(l => l['@_rel'] === 'alternate');
                            postUrl = altLink ? altLink['@_href'] : post.link[0]['@_href'];
                        } else if (post.link && post.link['@_href']) {
                            postUrl = post.link['@_href'];
                        } else {
                            postUrl = `https://www.reddit.com/r/${sub}/comments/` + (post.id || '').split('_').pop();
                        }

                        // Extract author
                        let authorName = 'Unknown';
                        if (post.author && post.author.name) {
                            authorName = post.author.name.replace('/u/', '');
                        }

                        // Extract body text from content
                        let selftext = '';
                        if (post.content && typeof post.content === 'object') {
                            selftext = (post.content['#text'] || '').replace(/<[^>]+>/g, ' ').substring(0, 500).trim();
                        } else if (typeof post.content === 'string') {
                            selftext = post.content.replace(/<[^>]+>/g, ' ').substring(0, 500).trim();
                        }

                        allResults.push({
                            title: post.title,
                            url: postUrl,
                            subreddit: sub,
                            num_comments: '?',
                            created_utc: createdUtc,
                            author: authorName,
                            selftext: selftext || 'Click link to view full post content...'
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
