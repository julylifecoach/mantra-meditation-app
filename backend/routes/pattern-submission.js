// Pattern Submission — lightweight coaching touchpoint from quiz results
// Sends an email to Billy with the pattern + situation. No database, no auth.

const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// POST / — Submit a pattern moment (public, rate-limited by parent)
router.post('/', async (req, res) => {
    const { pattern, situation, email, source } = req.body;

    if (!pattern || !situation) {
        return res.status(400).json({ error: 'Pattern and situation are required' });
    }

    if (situation.length < 10 || situation.length > 600) {
        return res.status(400).json({ error: 'Situation must be 10-600 characters' });
    }

    const safeEmail = (email || 'anonymous').trim().toLowerCase();
    const safePattern = String(pattern).slice(0, 50);
    const safeSituation = String(situation).slice(0, 600);
    const safeSource = String(source || 'unknown').slice(0, 200);

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: `"Pattern Submission" <${process.env.SMTP_USER}>`,
            to: 'billy@julylifecoach.com',
            replyTo: safeEmail !== 'anonymous' ? safeEmail : undefined,
            subject: `Pattern Submission: ${safePattern}`,
            html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #333;">
                    <h2 style="color: #1a1a1a;">New Pattern Submission</h2>
                    <p><strong>Pattern:</strong> ${safePattern}</p>
                    <p><strong>From:</strong> ${safeEmail}</p>
                    <p><strong>Source:</strong> ${safeSource}</p>
                    <hr style="margin: 1rem 0; border: none; border-top: 1px solid #eee;" />
                    <h3 style="color: #1a1a1a;">What happened:</h3>
                    <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${safeSituation}</p>
                    <hr style="margin: 1rem 0; border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 0.85rem; color: #aaa;">Reply to this email to respond directly to ${safeEmail}.</p>
                </div>
            `,
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('Pattern submission email error:', err.message);
        res.status(500).json({ error: 'Failed to send submission' });
    }
});

module.exports = router;
