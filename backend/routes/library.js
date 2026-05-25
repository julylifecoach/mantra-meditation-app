/**
 * Practice Library — Stripe Webhook for Access Key Email Delivery
 * 
 * Listens for checkout.session.completed events from Stripe Payment Links.
 * When a customer completes purchase of the Practice Library product,
 * sends them an email with the access key.
 */
const express = require('express');
const transporter = require('../lib/mailer');
const { optionalAuth } = require('../middleware/optionalAuth');
const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Practice Library product ID in Stripe
const LIBRARY_PRODUCT_ID = 'prod_ULOcDYnJ07Y9ZH';
const ACCESS_KEY = 'july-library-2026';
const LIBRARY_URL = 'https://here.julylifecoach.com/library/';
const FREE_READ_LIMIT = 5;

// Load paid articles into memory at startup
let paidArticles = {};
try {
    const paidPath = path.join(__dirname, '../../frontend/dist/library-paid.json');
    // Try dist first, then public
    let rawData;
    if (fs.existsSync(paidPath)) {
        rawData = fs.readFileSync(paidPath, 'utf-8');
    } else {
        const altPath = path.join(__dirname, '../../frontend/public/library-paid.json');
        rawData = fs.readFileSync(altPath, 'utf-8');
    }
    const data = JSON.parse(rawData);
    if (data.items) {
        data.items.forEach(item => {
            paidArticles[item.id] = item;
        });
    }
    console.log(`[Library] Loaded ${Object.keys(paidArticles).length} paid articles`);
} catch (err) {
    console.warn('[Library] Could not load library-paid.json:', err.message);
    // Try loading from the hub directory (VPS layout)
    try {
        const hubPath = process.env.LIBRARY_PAID_PATH || '/home/billy/july-platform/hub/library/library-paid.json';
        if (fs.existsSync(hubPath)) {
            const data = JSON.parse(fs.readFileSync(hubPath, 'utf-8'));
            if (data.items) {
                data.items.forEach(item => { paidArticles[item.id] = item; });
            }
            console.log(`[Library] Loaded ${Object.keys(paidArticles).length} paid articles from hub`);
        }
    } catch (e) {
        console.warn('[Library] Could not load from hub either:', e.message);
    }
}

// Helper: hash IP for anonymous tracking
function hashIp(ip) {
    return crypto.createHash('sha256').update(ip || 'unknown').digest('hex').slice(0, 32);
}

// GET /api/library/:id -- Serve individual article content with gating
router.get('/:id', optionalAuth, async (req, res) => {
    const { id } = req.params;
    const accessKey = req.query.key;

    // Find article in loaded data
    const article = paidArticles[id];
    if (!article) {
        return res.status(404).json({ error: 'Article not found' });
    }

    // Access key bypass
    if (accessKey === ACCESS_KEY) {
        return res.json({ article, access: 'key', gated: false });
    }

    // Check membership entitlement for logged-in users
    if (req.userId) {
        try {
            const ent = await prisma.entitlement.findFirst({
                where: {
                    userId: req.userId,
                    productKey: 'here-membership',
                    active: true,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } },
                    ],
                },
            });
            if (ent) {
                return res.json({ article, access: 'member', gated: false });
            }
        } catch (err) {
            console.error('[Library] Error checking entitlement:', err.message);
        }
    }

    // Free-read tracking
    // Use IP hash for both anonymous and logged-in non-members
    const ipHash = hashIp(req.ip);
    const trackingKey = req.userId || `anon_${ipHash}`;

    try {
        // Count unique articles read by this user/IP
        const readArticles = await prisma.practiceEvent.findMany({
            where: {
                tool: 'library',
                eventType: 'article_read',
                userId: req.userId || `anon_${ipHash}`,
            },
            select: { data: true },
        });

        // Extract unique article IDs from read events
        const readIds = new Set();
        readArticles.forEach(e => {
            try {
                const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (d && d.articleId) readIds.add(d.articleId);
            } catch (_) {}
        });

        // If this article was already read, don't count it again
        if (readIds.has(id)) {
            return res.json({ article, access: 'free', gated: false });
        }

        const readCount = readIds.size;

        if (readCount < FREE_READ_LIMIT) {
            // Log the read
            try {
                await prisma.practiceEvent.create({
                    data: {
                        userId: req.userId || `anon_${ipHash}`,
                        tool: 'library',
                        eventType: 'article_read',
                        data: JSON.stringify({ articleId: id }),
                    },
                });
            } catch (logErr) {
                console.error('[Library] Error logging read:', logErr.message);
            }
            return res.json({
                article,
                access: 'free',
                gated: false,
                freeReadsRemaining: FREE_READ_LIMIT - readCount - 1,
            });
        }

        // Gated -- return preview only
        const preview = {
            id: article.id,
            title: article.title,
            source: article.source,
            theme: article.theme,
            preview: article.body ? article.body.slice(0, 300) + '...' : '',
        };
        return res.json({
            article: preview,
            access: 'gated',
            gated: true,
            freeReadsRemaining: 0,
        });
    } catch (err) {
        console.error('[Library] Error in free-read tracking:', err.message);
        // On error, return gated for safety
        return res.status(500).json({ error: 'Internal error' });
    }
});

const getStripe = require('../lib/stripe');

// POST /api/library/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.LIBRARY_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('[Library Webhook] LIBRARY_WEBHOOK_SECRET not set');
        return res.status(500).send('Webhook secret not configured');
    }

    let event;
    try {
        event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('[Library Webhook] Signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Only handle checkout.session.completed
    if (event.type !== 'checkout.session.completed') {
        return res.json({ received: true, skipped: true });
    }

    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;

    if (!email) {
        console.error('[Library Webhook] No email found in checkout session');
        return res.json({ received: true, error: 'no_email' });
    }

    // Check if this is a Practice Library purchase
    let isLibrary = false;
    try {
        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
        isLibrary = lineItems.data.some(item => item.price?.product === LIBRARY_PRODUCT_ID);

        if (!isLibrary) {
            console.log(`[Library Webhook] Checkout ${session.id} is not a Library purchase, skipping`);
            return res.json({ received: true, skipped: true });
        }
    } catch (err) {
        console.error('[Library Webhook] Error checking line items:', err.message);
        // Continue anyway — better to send the email than not
    }


    // Send the access key email
    try {


        const planType = session.mode === 'subscription' ? 'subscription' : 'purchase';

        await transporter.sendMail({
            from: '"July Life Coach" <billy@julylifecoach.com>',
            to: email,
            subject: 'Your Practice Library Access Key',
            html: `
                <div style="font-family: 'Georgia', serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a2e;">
                    <h2 style="font-size: 24px; font-weight: 400; margin-bottom: 8px;">Welcome to the Practice Library</h2>
                    <p style="color: #737373; font-size: 14px; margin-bottom: 32px;">Thank you for your ${planType}.</p>
                    
                    <p style="line-height: 1.7;">You now have unlimited access to 502 writings across 8 themes — essays, coaching responses, and reflections organized by what you're going through.</p>
                    
                    <div style="background: #f8f6f0; border: 1px solid #e8e4dc; border-radius: 12px; padding: 24px; margin: 28px 0; text-align: center;">
                        <p style="font-size: 13px; color: #737373; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.08em;">Your Access Key</p>
                        <p style="font-size: 28px; font-family: monospace; font-weight: 600; color: #1a1a2e; margin: 0; letter-spacing: 0.05em;">${ACCESS_KEY}</p>
                    </div>
                    
                    <p style="line-height: 1.7;"><strong>How to unlock:</strong></p>
                    <ol style="line-height: 1.9; padding-left: 20px; color: #444;">
                        <li>Go to <a href="${LIBRARY_URL}" style="color: #b08d57;">${LIBRARY_URL}</a></li>
                        <li>Click on any writing to open the reader</li>
                        <li>Enter your access key in the unlock field</li>
                        <li>All content is now unlocked — your key is saved in your browser</li>
                    </ol>
                    
                    <p style="line-height: 1.7; margin-top: 24px;">Save this email — you'll need the key if you switch browsers or clear your data.</p>
                    
                    <p style="margin-top: 32px; line-height: 1.7;">Warmly,<br/>Billy</p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
                    <p style="font-size: 12px; color: #999; text-align: center;">
                        July Life Coach &middot; <a href="https://julylifecoach.com" style="color: #999;">julylifecoach.com</a><br/>
                        Questions? Reply to this email.
                    </p>
                </div>
            `,
        });

        console.log(`[Library Webhook] Access key sent to ${email}`);
    } catch (err) {
        console.error('[Library Webhook] Error sending email:', err.message);
    }

    res.json({ received: true, email_sent: true });
});

module.exports = router;
