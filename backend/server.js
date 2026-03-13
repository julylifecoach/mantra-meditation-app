require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const reflectionRoutes = require('./routes/reflections');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const stripeRoutes = require('./routes/stripe');
const resilienceRoutes = require('./routes/resilience');
const feedbackRoutes = require('./routes/feedback');
const redditRoutes = require('./routes/reddit');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx)
const PORT = process.env.PORT || 5000;

// Rate limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 login/register attempts per window
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500, // 500 API requests per window
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS — allow Practice app and Tools app
const allowedOrigins = [
    'https://practice.julylifecoach.com',
    'https://staging.practice.julylifecoach.com',
    'https://tools.julylifecoach.com',
    'https://www.julylifecoach.com',
    'https://julylifecoach.com',
    'https://french.julylifecoach.com',
    'https://resources.julylifecoach.com',
    'http://localhost:5173',
    'http://localhost:5174',
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true,
}));

// Stripe webhook needs raw body — must be before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/reflections', apiLimiter, reflectionRoutes);
app.use('/api/user', apiLimiter, userRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/stripe', apiLimiter, stripeRoutes);
app.use('/api/resilience', apiLimiter, resilienceRoutes);
app.use('/api/feedback', apiLimiter, feedbackRoutes);
app.use('/api/reddit', apiLimiter, redditRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Practice Backend is running!' });
});

// RSS proxy — fetches Substack feed server-side to avoid CORS
app.get('/api/rss', async (req, res) => {
    try {
        const feedUrl = 'https://julylifecoach.substack.com/feed';
        const response = await fetch(feedUrl);
        if (!response.ok) throw new Error(`Feed returned ${response.status}`);
        const xml = await response.text();
        res.set('Content-Type', 'application/xml');
        res.set('Cache-Control', 'public, max-age=3600'); // cache 1 hour
        res.send(xml);
    } catch (err) {
        console.error('RSS proxy error:', err.message);
        res.status(502).json({ error: 'Failed to fetch RSS feed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
