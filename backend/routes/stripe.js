const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { grantEntitlement, PRODUCT_KEY_MAP } = require('./entitlements');
const getStripe = require('../lib/stripe');
const transporter = require('../lib/mailer');

const router = express.Router();

// Price IDs — set via env vars after creating products in Stripe
const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
const PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY;

// ============ Create Checkout Session ============
router.post('/create-checkout', authenticate, async (req, res) => {
    try {
        const { plan } = req.body; // 'monthly' or 'yearly'
        const priceId = plan === 'yearly' ? PRICE_YEARLY : PRICE_MONTHLY;

        if (!priceId) {
            return res.status(500).json({ error: 'Stripe prices not configured' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: { subscription: true },
        });

        // Get or create Stripe customer
        let customerId;
        if (user.subscription?.stripeCustomerId) {
            customerId = user.subscription.stripeCustomerId;
        } else {
            const customer = await getStripe().customers.create({
                email: user.email,
                metadata: { userId: user.id },
            });
            customerId = customer.id;

            // Create subscription record with 'none' status
            await prisma.subscription.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    stripeCustomerId: customerId,
                    status: 'none',
                },
                update: {
                    stripeCustomerId: customerId,
                },
            });
        }

        const session = await getStripe().checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: 7,
            },
            success_url: `${process.env.TOOLS_URL || 'https://tools.julylifecoach.com'}/dashboard?checkout=success`,
            cancel_url: `${process.env.TOOLS_URL || 'https://tools.julylifecoach.com'}/dashboard?checkout=canceled`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Create checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// ============ Get Subscription Status ============
router.get('/subscription', authenticate, async (req, res) => {
    try {
        const sub = await prisma.subscription.findUnique({
            where: { userId: req.userId },
        });

        if (!sub) {
            return res.json({
                status: 'none',
                paywallEnabled: process.env.PAYWALL_ENABLED === 'true',
            });
        }

        res.json({
            status: sub.status,
            plan: sub.plan,
            currentPeriodEnd: sub.currentPeriodEnd,
            trialEnd: sub.trialEnd,
            paywallEnabled: process.env.PAYWALL_ENABLED === 'true',
        });
    } catch (error) {
        console.error('Get subscription error:', error);
        res.status(500).json({ error: 'Failed to get subscription' });
    }
});

// ============ Create Customer Portal Session ============
router.post('/portal', authenticate, async (req, res) => {
    try {
        const sub = await prisma.subscription.findUnique({
            where: { userId: req.userId },
        });

        if (!sub?.stripeCustomerId) {
            return res.status(400).json({ error: 'No subscription found' });
        }

        const session = await getStripe().billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: `${process.env.TOOLS_URL || 'https://tools.julylifecoach.com'}/dashboard`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Create portal error:', error);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

// ============ Stripe Webhook ============
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = getStripe().webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // 1. Check if this is a purchase for the Services Coaching Packages
                if (session.metadata?.type === 'coaching_client') {
                    const email = session.customer_details?.email || session.customer_email;
                    const program = session.metadata?.program; // e.g. 'bizcoach'
                    if (email) {
                        try {
                            // Build permissions based on program type
                            const permissions = { accessClientPortal: true };
                            if (program === 'bizcoach') {
                                permissions.accessBizCoach = true;
                            }

                            // Automatically provision the user's access
                            await prisma.user.upsert({
                                where: { email },
                                update: permissions,
                                create: {
                                    email,
                                    displayName: email.split('@')[0],
                                    ...permissions,
                                    agreedToTos: true,
                                    tosAgreedAt: new Date(),
                                }
                            });

                            // Send Welcome Email


                            const portalLink = program === 'bizcoach'
                                ? 'https://practice.julylifecoach.com/bizcoach'
                                : 'https://practice.julylifecoach.com';
                            const programLabel = program === 'bizcoach' ? 'BizCoach' : 'coaching';

                            const mailOptions = {
                                from: 'billy@julylifecoach.com',
                                to: email,
                                subject: `Welcome to July Life Coaching${program === 'bizcoach' ? ' — BizCoach Program' : ''}`,
                                html: `
                                    <h2>Welcome to your ${programLabel} journey!</h2>
                                    <p>Thank you for your purchase.</p>
                                    <p>I manage all our session notes, video recordings, and your tailored practices inside the <strong>July Practice App</strong>.</p>
                                    <p>Please log in or create a free account at <a href="${portalLink}">${portalLink}</a> using this email address (<strong>${email}</strong>) to access your ${programLabel === 'BizCoach' ? 'BizCoach video library and' : ''} Client Hub.</p>
                                    <p>I will be in touch with you shortly!</p>
                                    <br/>
                                    <p>- Billy</p>
                                `
                            };
                            await transporter.sendMail(mailOptions);
                            console.log(`Processed ${program || 'coaching_client'} checkout and sent welcome email to:`, email);
                        } catch (err) {
                            console.error('Error auto-provisioning coaching client:', err);
                        }
                    }
                    break;
                }

                // 2. Check if this is a Practice Kit purchase (payment link)
                if (!session.metadata?.type && session.payment_link) {
                    try {
                        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
                        const KIT_PRODUCT_IDS = [
                            'prod_UNGg0HGN9rPJ7u', // July Life Coach Practice Kit ($37)
                            'prod_UD6piLkQx0HVAA', // Action & Alignment Bundle ($37)
                        ];
                        const isKitPurchase = lineItems.data.some(
                            item => KIT_PRODUCT_IDS.includes(item.price.product)
                        );

                        if (isKitPurchase) {
                            const email = session.customer_details?.email || session.customer_email;
                            if (email) {
                                // Upsert user with Practice Kit access
                                await prisma.user.upsert({
                                    where: { email },
                                    update: { accessPracticeKit: true },
                                    create: {
                                        email,
                                        displayName: email.split('@')[0],
                                        accessPracticeKit: true,
                                    },
                                });

                                // Create entitlement record
                                const user = await prisma.user.findUnique({ where: { email } });
                                if (user) {
                                    await grantEntitlement(user.id, 'practice-kit', 'stripe', session.id).catch(e => {
                                        console.error('Entitlement grant error (practice-kit):', e.message);
                                    });
                                }

                                // Send welcome email with account setup link


                                await transporter.sendMail({
                                    from: 'billy@julylifecoach.com',
                                    to: email,
                                    subject: 'Your Practice Kit — here are your tools',
                                    html: `
                                        <h2>Your purchase is confirmed!</h2>
                                        <p>Here's everything in your Practice Kit:</p>
                                        <table cellpadding="8" cellspacing="0" style="margin: 16px 0; font-size: 15px;">
                                            <tr><td>📓</td><td><a href="https://here.julylifecoach.com/practice-kit-workbook/">Your Workbook</a> — start here, this is your home base</td></tr>
                                            <tr><td>🔥</td><td><a href="https://here.julylifecoach.com/social-anxiety/108-heart-opening/">108 Heart Opening</a> — Week 1 writing practice</td></tr>
                                            <tr><td>👂</td><td><a href="https://here.julylifecoach.com/listening-lens/">Listening Lens</a> — Week 2 observation practice</td></tr>
                                            <tr><td>⚔️</td><td><a href="https://here.julylifecoach.com/social-anxiety/side-effect-quests/">Side Effect Quests</a> — Weeks 3-4 real-world practice</td></tr>
                                        </table>
                                        <p>📊 <strong>Recommended:</strong> <a href="https://here.julylifecoach.com/social-anxiety/quiz.html">Take the Pattern Quiz</a> (2 min) to unlock personalized coaching inside each tool.</p>
                                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                        <p><strong>Cloud save (optional):</strong> Create a free account at <a href="https://practice.julylifecoach.com">practice.julylifecoach.com</a> using this email (<strong>${email}</strong>) to sync your progress across devices. Your access is already activated.</p>
                                        <br/>
                                        <p>— Billy</p>
                                    `,
                                });

                                console.log('Practice Kit purchase provisioned for:', email);

                                // Tag in Kit (ConvertKit) + add to onboarding sequence
                                if (process.env.KIT_API_KEY) {
                                    (async () => {
                                        try {
                                            const kitHeaders = {
                                                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                                                'Content-Type': 'application/json',
                                                'Accept': 'application/json',
                                            };

                                            // 1. Create/update subscriber (include first name from Stripe billing info)
                                            const customerName = session.customer_details?.name || '';
                                            const firstName = customerName.split(' ')[0] || '';
                                            const subRes = await fetch('https://api.kit.com/v4/subscribers', {
                                                method: 'POST',
                                                headers: kitHeaders,
                                                body: JSON.stringify({
                                                    email_address: email,
                                                    first_name: firstName || undefined,
                                                    state: 'active',
                                                }),
                                            });
                                            const subData = await subRes.json();
                                            const subscriberId = subData?.subscriber?.id;

                                            if (subscriberId) {
                                                // 2. Tag with sa-kit-purchased
                                                const tagId = '19114983';
                                                await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
                                                    method: 'POST',
                                                    headers: kitHeaders,
                                                    body: JSON.stringify({ id: subscriberId }),
                                                });

                                                // 3. Add to SA Practice Onboarding sequence
                                                const seqId = '2732148';
                                                await fetch(`https://api.kit.com/v4/sequences/${seqId}/subscribers`, {
                                                    method: 'POST',
                                                    headers: kitHeaders,
                                                    body: JSON.stringify({ id: subscriberId }),
                                                });

                                                console.log(`Kit: tagged ${email} with sa-kit-purchased + added to onboarding sequence`);
                                            } else {
                                                console.error('Kit: failed to get subscriber ID for', email);
                                            }
                                        } catch (kitErr) {
                                            console.error('Kit integration error:', kitErr.message);
                                        }
                                    })();
                                }

                                // Reddit CAPI — fire Purchase event (server-side attribution)
                                if (process.env.REDDIT_CAPI_TOKEN) {
                                    try {
                                        const conversionId = `kit_purchase_${session.id}`;
                                        const capiRes = await fetch('https://ads-api.reddit.com/api/v3/pixels/t2_swg14lcv/conversion_events', {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${process.env.REDDIT_CAPI_TOKEN}`,
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                data: {
                                                    events: [{
                                                        event_at: Date.now(),
                                                        action_source: 'WEB',
                                                        type: { tracking_type: 'Purchase' },
                                                        user: {
                                                            email: email,
                                                        },
                                                        metadata: {
                                                            conversion_id: conversionId,
                                                            currency: 'USD',
                                                            value: 37,
                                                            item_count: 1,
                                                        },
                                                    }],
                                                },
                                            }),
                                        });
                                        console.log(`Reddit CAPI: Purchase event for ${email} — ${capiRes.status}`);
                                    } catch (rdtErr) {
                                        console.error('Reddit CAPI Purchase error:', rdtErr.message);
                                    }
                                }
                            }
                            break;
                        }
                    } catch (err) {
                        console.error('Error processing payment link purchase:', err);
                    }
                }

                // 2b. Check if this is a Reddit Course purchase (payment link)
                if (!session.metadata?.type && session.payment_link) {
                    try {
                        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
                        const REDDIT_COURSE_PRODUCT_IDS = [
                            'prod_UKxWhVWfO4fc1o', // Coach + Reddit Course ($9.99)
                        ];
                        const isRedditCourse = lineItems.data.some(
                            item => REDDIT_COURSE_PRODUCT_IDS.includes(item.price.product)
                        );

                        if (isRedditCourse) {
                            const email = session.customer_details?.email || session.customer_email;
                            if (email) {
                                // Send welcome email with course link


                                await transporter.sendMail({
                                    from: 'billy@julylifecoach.com',
                                    to: email,
                                    subject: 'Your Coach + Reddit Course — here\'s your access',
                                    html: `
                                        <h2>You're in!</h2>
                                        <p>Your Coach + Reddit course is ready. Here's your direct link:</p>
                                        <p style="margin: 20px 0;"><a href="https://learn.julylifecoach.com/reddit?key=reddit-course-2026" style="background: #c75d2c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Your Course →</a></p>
                                        <p style="font-size: 14px; color: #666;">Bookmark this link. If you clear your browser, revisit it to restore access.</p>
                                        <table cellpadding="6" cellspacing="0" style="margin: 16px 0; font-size: 14px; color: #333;">
                                            <tr><td colspan="2" style="font-weight: 600; padding-bottom: 4px;">What's inside (10 modules):</td></tr>
                                            <tr><td>📋</td><td><strong>Part 1:</strong> Reddit Strategy — fundamentals, subreddit selection, templates, engagement scripts, 90-min weekly system</td></tr>
                                            <tr><td>🎥</td><td><strong>Part 2 (Bonus):</strong> Content Production — OBS setup, transcription, automation, AI agent pipeline</td></tr>
                                        </table>
                                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                        <p style="font-size: 13px; color: #999;">Access key: <code>reddit-course-2026</code> — save this in case you need it on a new device.</p>
                                        <br/>
                                        <p>— Billy</p>
                                    `,
                                });

                                console.log('Reddit Course purchase — welcome email sent to:', email);

                                // Create entitlement record
                                const user = await prisma.user.upsert({
                                    where: { email },
                                    update: {},
                                    create: {
                                        email,
                                        displayName: email.split('@')[0],
                                    },
                                });
                                await grantEntitlement(user.id, 'reddit-course', 'stripe', session.id).catch(e => {
                                    console.error('Entitlement grant error (reddit-course):', e.message);
                                });

                                // Tag in Kit (ConvertKit)
                                if (process.env.KIT_API_KEY) {
                                    (async () => {
                                        try {
                                            const kitHeaders = {
                                                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                                                'Content-Type': 'application/json',
                                                'Accept': 'application/json',
                                            };

                                            const customerName = session.customer_details?.name || '';
                                            const firstName = customerName.split(' ')[0] || '';
                                            const subRes = await fetch('https://api.kit.com/v4/subscribers', {
                                                method: 'POST',
                                                headers: kitHeaders,
                                                body: JSON.stringify({
                                                    email_address: email,
                                                    first_name: firstName || undefined,
                                                    state: 'active',
                                                }),
                                            });
                                            const subData = await subRes.json();
                                            const subscriberId = subData?.subscriber?.id;

                                            if (subscriberId) {
                                                const tagId = '19567730'; // reddit-course-purchased
                                                await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
                                                    method: 'POST',
                                                    headers: kitHeaders,
                                                    body: JSON.stringify({ id: subscriberId }),
                                                });
                                                console.log(`Kit: tagged ${email} with reddit-course-purchased`);
                                            } else {
                                                console.error('Kit: failed to get subscriber ID for', email);
                                            }
                                        } catch (kitErr) {
                                            console.error('Kit integration error (reddit course):', kitErr.message);
                                        }
                                    })();
                                }

                                // Reddit CAPI — fire Purchase event
                                if (process.env.REDDIT_CAPI_TOKEN) {
                                    try {
                                        const conversionId = `reddit_course_${session.id}`;
                                        const capiRes = await fetch('https://ads-api.reddit.com/api/v3/pixels/t2_swg14lcv/conversion_events', {
                                            method: 'POST',
                                            headers: {
                                                'Authorization': `Bearer ${process.env.REDDIT_CAPI_TOKEN}`,
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                                data: {
                                                    events: [{
                                                        event_at: Date.now(),
                                                        action_source: 'WEB',
                                                        type: { tracking_type: 'Purchase' },
                                                        user: { email },
                                                        metadata: {
                                                            conversion_id: conversionId,
                                                            currency: 'USD',
                                                            value: 9.99,
                                                            item_count: 1,
                                                        },
                                                    }],
                                                },
                                            }),
                                        });
                                        console.log(`Reddit CAPI: Purchase event for ${email} — ${capiRes.status}`);
                                    } catch (rdtErr) {
                                        console.error('Reddit CAPI Purchase error:', rdtErr.message);
                                    }
                                }
                            }
                            break;
                        }
                    } catch (err) {
                        console.error('Error processing Reddit course purchase:', err);
                    }
                }

                // 2c. Check if this is a Launch Pad purchase (payment link)
                if (!session.metadata?.type && session.payment_link) {
                    try {
                        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id);
                        const LAUNCH_PAD_PRODUCT_IDS = [
                            'prod_UWuSLh5aSbuC1W', // Launch Pad ($79 / $70)
                        ];
                        const isLaunchPad = lineItems.data.some(
                            item => LAUNCH_PAD_PRODUCT_IDS.includes(item.price.product)
                        );

                        if (isLaunchPad) {
                            const email = session.customer_details?.email || session.customer_email;
                            if (email) {
                                // Send welcome email with course link


                                await transporter.sendMail({
                                    from: 'billy@julylifecoach.com',
                                    to: email,
                                    subject: 'Your Launch Pad course is ready',
                                    html: `
                                        <h2 style="color: #1B2A4A;">Welcome to Launch Pad</h2>
                                        <p>Your course is ready. Here's your direct link:</p>
                                        <p style="margin: 20px 0;"><a href="https://learn.julylifecoach.com/launch-pad?key=launch-pad-2026" style="background: #E87C4F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Your Course</a></p>
                                        <p style="font-size: 14px; color: #666;">Bookmark this link. If you clear your browser, revisit it to restore access.</p>
                                        <table cellpadding="6" cellspacing="0" style="margin: 16px 0; font-size: 14px; color: #333;">
                                            <tr><td colspan="2" style="font-weight: 600; padding-bottom: 4px;">What's inside (7 modules):</td></tr>
                                            <tr><td>&#x2764;</td><td><strong>Heart</strong> -- learn to lead from the heart, not the head</td></tr>
                                            <tr><td>&#x1F91D;</td><td><strong>Sharing</strong> -- show up authentically with your audience</td></tr>
                                            <tr><td>&#x1F3AF;</td><td><strong>Path</strong> -- design your coaching offer using the North Star Builder</td></tr>
                                            <tr><td>&#x1F3A8;</td><td><strong>Three Skill System</strong> -- Micropost, Microdose, Lock In</td></tr>
                                            <tr><td>&#x1F680;</td><td><strong>Daily Quests</strong> -- build momentum with 5 daily practices</td></tr>
                                        </table>
                                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                        <p style="font-size: 13px; color: #999;">Access key: <code>launch-pad-2026</code> -- save this in case you need it on a new device.</p>
                                        <br/>
                                        <p>-- Billy</p>
                                    `,
                                });

                                console.log('Launch Pad purchase -- welcome email sent to:', email);

                                // Create entitlement record
                                const user = await prisma.user.upsert({
                                    where: { email },
                                    update: {},
                                    create: {
                                        email,
                                        displayName: email.split('@')[0],
                                    },
                                });
                                await grantEntitlement(user.id, 'launch-pad', 'stripe', session.id).catch(e => {
                                    console.error('Entitlement grant error (launch-pad):', e.message);
                                });
                                await grantEntitlement(user.id, 'reddit-course', 'stripe', session.id).catch(e => {
                                    console.error('Entitlement grant error (reddit-course via launch-pad):', e.message);
                                });

                                // Tag in Kit (ConvertKit)
                                if (process.env.KIT_API_KEY) {
                                    (async () => {
                                        try {
                                            const kitHeaders = {
                                                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                                                'Content-Type': 'application/json',
                                                'Accept': 'application/json',
                                            };

                                            const customerName = session.customer_details?.name || '';
                                            const firstName = customerName.split(' ')[0] || '';
                                            const subRes = await fetch('https://api.kit.com/v4/subscribers', {
                                                method: 'POST',
                                                headers: kitHeaders,
                                                body: JSON.stringify({
                                                    email_address: email,
                                                    first_name: firstName || undefined,
                                                    state: 'active',
                                                }),
                                            });
                                            const subData = await subRes.json();
                                            const subscriberId = subData?.subscriber?.id;

                                            if (subscriberId) {
                                                const tagId = '19624676'; // launch-pad-purchased
                                                await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
                                                    method: 'POST',
                                                    headers: kitHeaders,
                                                    body: JSON.stringify({ id: subscriberId }),
                                                });
                                                console.log(`Kit: tagged ${email} with launch-pad-purchased`);
                                            } else {
                                                console.error('Kit: failed to get subscriber ID for', email);
                                            }
                                        } catch (kitErr) {
                                            console.error('Kit integration error (launch pad):', kitErr.message);
                                        }
                                    })();
                                }
                            }
                            break;
                        }
                    } catch (err) {
                        console.error('Error processing Launch Pad purchase:', err);
                    }
                }

                // 3. Existing logic for Tools/Practice App subscriptions
                if (session.subscription) {
                    const subscription = await getStripe().subscriptions.retrieve(session.subscription);
                    const customerId = session.customer;

                    await prisma.subscription.update({
                        where: { stripeCustomerId: customerId },
                        data: {
                            stripeSubId: subscription.id,
                            status: subscription.status,
                            plan: subscription.items.data[0].price.id === PRICE_YEARLY ? 'yearly' : 'monthly',
                            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                            trialEnd: subscription.trial_end
                                ? new Date(subscription.trial_end * 1000)
                                : null,
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const existing = await prisma.subscription.findUnique({
                    where: { stripeSubId: subscription.id },
                });

                if (existing) {
                    await prisma.subscription.update({
                        where: { stripeSubId: subscription.id },
                        data: {
                            status: subscription.status,
                            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                            trialEnd: subscription.trial_end
                                ? new Date(subscription.trial_end * 1000)
                                : null,
                        },
                    });
                }
                break;
            }

            case 'customer.subscription.created': {
                // Handle new Monthly Coaching subscriptions
                const newSub = event.data.object;
                const priceId = newSub.items?.data?.[0]?.price?.id;
                // Monthly Coaching ($500/mo) price
                if (priceId === 'price_1TeORZEj0kmKnHs3SS7RKxO9') {
                    try {
                        const customerObj = await getStripe().customers.retrieve(newSub.customer);
                        const subEmail = customerObj.email;
                        if (subEmail && process.env.KIT_API_KEY) {
                            const kitHeaders = {
                                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                            };

                            // Create/update subscriber
                            const customerName = customerObj.name || '';
                            const firstName = customerName.split(' ')[0] || '';
                            const subRes = await fetch('https://api.kit.com/v4/subscribers', {
                                method: 'POST',
                                headers: kitHeaders,
                                body: JSON.stringify({
                                    email_address: subEmail,
                                    first_name: firstName || undefined,
                                    state: 'active',
                                }),
                            });
                            const subData = await subRes.json();
                            const subscriberId = subData?.subscriber?.id;

                            if (subscriberId) {
                                // Tag with monthly-coaching-subscriber
                                const tagId = '20051607';
                                await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
                                    method: 'POST',
                                    headers: kitHeaders,
                                    body: JSON.stringify({ id: subscriberId }),
                                });
                                console.log(`Kit: tagged ${subEmail} with monthly-coaching-subscriber`);
                            }
                        }
                    } catch (err) {
                        console.error('Error processing coaching subscription:', err);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const existing = await prisma.subscription.findUnique({
                    where: { stripeSubId: subscription.id },
                });

                if (existing) {
                    await prisma.subscription.update({
                        where: { stripeSubId: subscription.id },
                        data: { status: 'canceled' },
                    });
                }
                break;
            }
        }
    } catch (error) {
        console.error('Webhook processing error:', error);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }

    res.json({ received: true });
});

module.exports = router;
