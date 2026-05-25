/**
 * Lazy-initialized Stripe client.
 * Avoids errors if STRIPE_SECRET_KEY isn't set at import time.
 */
let stripe;
function getStripe() {
    if (!stripe) {
        stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

module.exports = getStripe;
