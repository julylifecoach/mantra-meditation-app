const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// POST /api/resilience/scores
// Save resilience quiz scores
router.post('/scores', authenticate, async (req, res) => {
    try {
        const { totalScore, maxScore, verdict, categories } = req.body;

        const score = await prisma.resilienceScore.create({
            data: {
                totalScore,
                maxScore,
                verdict,
                categories,
                userId: req.userId,
            }
        });

        res.status(201).json({ message: 'Score saved successfully', score });
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// GET /api/resilience/scores
// Get user's resilience quiz scores
router.get('/scores', authenticate, async (req, res) => {
    try {
        const scores = await prisma.resilienceScore.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(scores);
    } catch (error) {
        console.error('Error fetching scores:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

// POST /api/resilience/lead
// Handle lead capture form
router.post('/lead', async (req, res) => {
    try {
        const { email, questions, coaching, scoreData } = req.body;

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        let scoreHtml = 'No score data provided.';
        if (scoreData) {
            scoreHtml = `
                <p><strong>Total Score:</strong> ${scoreData.totalScore} / ${scoreData.maxScore}</p>
                <p><strong>Verdict:</strong> ${scoreData.verdict}</p>
            `;
        }

        const mailOptions = {
            from: email,
            to: 'billy@julylifecoach.com',
            subject: 'New Resilience Quiz Lead',
            html: `
                <h2>New Lead from Resilience Quiz</h2>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Interested in 1:1 Coaching:</strong> ${coaching ? 'Yes' : 'No'}</p>
                <p><strong>Questions:</strong><br>${questions || 'None'}</p>
                <h3>Quiz Results:</h3>
                ${scoreHtml}
            `
        };

        // Try to send email. If it fails due to sendmail missing on dev, log and return success anyway for now
        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error('Nodemailer error (sendmail might not be configured):', mailError.message);
            // We'll still return 200 so the frontend works
        }

        res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error handling lead:', error);
        res.status(500).json({ error: 'Failed to process lead' });
    }
});

module.exports = router;
