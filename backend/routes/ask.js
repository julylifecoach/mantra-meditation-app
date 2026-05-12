const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// Admin auth middleware
function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'];
    if (!key || key !== process.env.ASK_ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// POST / — Submit a question (public)
router.post('/', async (req, res) => {
    try {
        const { name, email, question, context, subscribeToKit } = req.body;

        if (!name || !email || !question) {
            return res.status(400).json({ error: 'Name, email, and question are required' });
        }

        if (question.length < 20) {
            return res.status(400).json({ error: 'Question must be at least 20 characters' });
        }

        // Save to database
        const entry = await prisma.askQuestion.create({
            data: {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                question: question.trim(),
                context: context?.trim() || null,
                subscribedToKit: !!subscribeToKit,
            },
        });

        // Subscribe to Kit if opted in
        if (subscribeToKit) {
            try {
                const kitSecret = process.env.KIT_API_SECRET;
                const kitFormId = process.env.KIT_ASK_FORM_ID || '7556254'; // default July form
                if (kitSecret) {
                    await fetch(`https://api.convertkit.com/v3/forms/${kitFormId}/subscribe`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            api_secret: kitSecret,
                            email: email.trim().toLowerCase(),
                            first_name: name.trim(),
                        }),
                    });
                }
            } catch (kitErr) {
                console.error('Kit subscribe error (non-fatal):', kitErr.message);
            }
        }

        // Notify Billy via email
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: `"Ask Billy" <${process.env.SMTP_USER}>`,
                to: 'billy@julylifecoach.com',
                subject: `New Question from ${name}`,
                html: `
                    <h2>New Ask Billy Question</h2>
                    <p><strong>From:</strong> ${name} (${email})</p>
                    ${context ? `<p><strong>Context:</strong> ${context}</p>` : ''}
                    <hr />
                    <h3>Question:</h3>
                    <p>${question.replace(/\n/g, '<br>')}</p>
                    <hr />
                    <p style="color: #999;">Answer at: <a href="https://resources.julylifecoach.com/ask/admin.html">Admin Panel</a></p>
                `,
            });
        } catch (mailErr) {
            console.error('Ask Billy notification email error (non-fatal):', mailErr.message);
        }

        res.status(201).json({ success: true, id: entry.id });
    } catch (error) {
        console.error('Ask Billy submit error:', error);
        res.status(500).json({ error: 'Failed to submit question' });
    }
});

// GET / — List published Q&As (public)
router.get('/', async (req, res) => {
    try {
        const entries = await prisma.askQuestion.findMany({
            where: { status: 'published' },
            orderBy: { answeredAt: 'desc' },
            select: {
                id: true,
                name: true,
                question: true,
                answer: true,
                answeredAt: true,
                createdAt: true,
            },
        });

        res.json({
            entries,
            total: entries.length,
        });
    } catch (error) {
        console.error('Ask Billy list error:', error);
        res.status(500).json({ error: 'Failed to load Q&As' });
    }
});

// GET /pending — List pending questions (admin)
router.get('/pending', requireAdmin, async (req, res) => {
    try {
        const entries = await prisma.askQuestion.findMany({
            where: { status: 'pending' },
            orderBy: { createdAt: 'asc' },
        });

        res.json({ entries });
    } catch (error) {
        console.error('Ask Billy pending error:', error);
        res.status(500).json({ error: 'Failed to load pending questions' });
    }
});

// GET /stats — Question counts (admin)
router.get('/stats', requireAdmin, async (req, res) => {
    try {
        const [total, pending, answered] = await Promise.all([
            prisma.askQuestion.count(),
            prisma.askQuestion.count({ where: { status: 'pending' } }),
            prisma.askQuestion.count({ where: { status: 'published' } }),
        ]);

        res.json({ total, pending, answered });
    } catch (error) {
        console.error('Ask Billy stats error:', error);
        res.status(500).json({ error: 'Failed to load stats' });
    }
});

// PUT /:id — Answer a question (admin)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { answer, publish = true } = req.body;

        if (!answer) {
            return res.status(400).json({ error: 'Answer is required' });
        }

        const updated = await prisma.askQuestion.update({
            where: { id },
            data: {
                answer: answer.trim(),
                status: publish ? 'published' : 'pending',
                answeredAt: publish ? new Date() : null,
            },
        });

        // Send notification email to asker when published
        if (publish) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS,
                    },
                });

                await transporter.sendMail({
                    from: `"Billy — July Life Coach" <${process.env.SMTP_USER}>`,
                    to: updated.email,
                    subject: `Billy responded to your question`,
                    html: `
                        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
                            <h2 style="color: #1a1a1a;">Hey ${updated.name},</h2>
                            <p>I just responded to your question on Ask Billy. Here's what you asked:</p>
                            <blockquote style="border-left: 3px solid #C27C5A; padding-left: 14px; margin: 1rem 0; color: #555; font-style: italic;">
                                ${updated.question.replace(/\n/g, '<br>')}
                            </blockquote>
                            <h3 style="color: #1a1a1a;">My Response:</h3>
                            <div style="line-height: 1.75; color: #444;">
                                ${updated.answer.replace(/\n/g, '<br>')}
                            </div>
                            <hr style="margin: 2rem 0; border: none; border-top: 1px solid #eee;" />
                            <p style="font-size: 0.9rem; color: #888;">
                                This response is also published at 
                                <a href="https://resources.julylifecoach.com/ask/" style="color: #C27C5A;">Ask Billy</a> 
                                for others to learn from.
                            </p>
                            <p style="font-size: 0.85rem; color: #aaa; margin-top: 1rem;">
                                — Billy, <a href="https://julylifecoach.com" style="color: #C27C5A;">July Life Coach</a>
                            </p>
                        </div>
                    `,
                });
            } catch (mailErr) {
                console.error('Ask Billy response email error:', mailErr.message);
                // Non-fatal — answer is still saved
            }
        }

        res.json({ success: true, entry: updated });
    } catch (error) {
        console.error('Ask Billy answer error:', error);
        res.status(500).json({ error: 'Failed to save answer' });
    }
});

module.exports = router;
