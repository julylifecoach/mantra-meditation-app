/**
 * Kit Subscriber Integration
 *
 * Provides fire-and-forget helpers for managing Kit subscribers,
 * tags, and sequences from the backend.
 *
 * - ensureKitSubscriber: v4 API upsert
 * - tagSubscriber:       v3 API tag loop
 * - addToSequence:       v4 API sequence subscription
 */

/**
 * Upsert a subscriber in Kit via v4 API.
 * Creates if new, updates if exists. Fire-and-forget.
 */
async function ensureKitSubscriber(email, firstName) {
    try {
        if (!process.env.KIT_API_KEY) {
            console.error('[kit-subscriber] KIT_API_KEY not set -- skipping');
            return;
        }

        const body = { email_address: email, state: 'active' };
        if (firstName) {
            body.first_name = firstName;
        }

        const res = await fetch('https://api.kit.com/v4/subscribers', {
            method: 'POST',
            headers: {
                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            console.error('[kit-subscriber] ensureKitSubscriber failed:', res.status);
        }
    } catch (err) {
        console.error('[kit-subscriber] ensureKitSubscriber error:', err.message);
    }
}

/**
 * Apply one or more tags to a subscriber via Kit v3 API.
 * All tags are applied in parallel. Fire-and-forget.
 */
async function tagSubscriber(email, tagIds) {
    try {
        const secret = process.env.KIT_API_SECRET;
        if (!secret) {
            console.error('[kit-subscriber] KIT_API_SECRET not set -- skipping');
            return;
        }

        await Promise.allSettled(
            tagIds.map(tagId =>
                fetch(`https://api.convertkit.com/v3/tags/${tagId}/subscribe`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_secret: secret, email }),
                })
            )
        );
    } catch (err) {
        console.error('[kit-subscriber] tagSubscriber error:', err.message);
    }
}

/**
 * Add a subscriber to a Kit sequence via v4 API. Fire-and-forget.
 */
async function addToSequence(email, sequenceId) {
    try {
        if (!process.env.KIT_API_KEY) {
            console.error('[kit-subscriber] KIT_API_KEY not set -- skipping');
            return;
        }

        const res = await fetch(`https://api.kit.com/v4/sequences/${sequenceId}/subscribers`, {
            method: 'POST',
            headers: {
                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ email_address: email }),
        });

        if (!res.ok) {
            console.error('[kit-subscriber] addToSequence failed:', res.status);
        }
    } catch (err) {
        console.error('[kit-subscriber] addToSequence error:', err.message);
    }
}

module.exports = { ensureKitSubscriber, tagSubscriber, addToSequence };
