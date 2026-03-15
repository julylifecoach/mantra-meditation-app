const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Stripe is initialized lazily to avoid issues if key isn't set
let stripe;
function getStripe() {
    if (!stripe) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

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
                            const nodemailer = require('nodemailer');
                            const transporter = nodemailer.createTransport({
                                service: 'gmail',
                                auth: {
                                    user: process.env.SMTP_USER,
                                    pass: process.env.SMTP_PASS
                                }
                            });

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

                // 2. Existing logic for Tools/Practice App subscriptions
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
    }

    res.json({ received: true });
});

module.exports = router;
