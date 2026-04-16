/**
 * Practice Library — Stripe Webhook for Access Key Email Delivery
 * 
 * Listens for checkout.session.completed events from Stripe Payment Links.
 * When a customer completes purchase of the Practice Library product,
 * sends them an email with the access key.
 */
const express = require('express');
const nodemailer = require('nodemailer');

const router = express.Router();

// Practice Library product ID in Stripe
const LIBRARY_PRODUCT_ID = 'prod_ULOcDYnJ07Y9ZH';
const ACCESS_KEY = 'july-library-2026';
const LIBRARY_URL = 'https://library.julylifecoach.com';

// Lazy-init Stripe
let stripe;
function getStripe() {
    if (!stripe) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

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

    // Verify this is a Practice Library purchase by checking line items
    try {
        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
        const isLibraryPurchase = lineItems.data.some(item => {
            return item.price?.product === LIBRARY_PRODUCT_ID;
        });

        if (!isLibraryPurchase) {
            console.log(`[Library Webhook] Checkout ${session.id} is not a Library purchase, skipping`);
            return res.json({ received: true, skipped: true });
        }
    } catch (err) {
        console.error('[Library Webhook] Error checking line items:', err.message);
        // Continue anyway — better to send the key than not
    }

    // Send the access key email
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

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
