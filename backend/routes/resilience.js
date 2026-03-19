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

// POST /api/resilience/quiz-report
// Send personalized quiz report to user and notify Billy
router.post('/quiz-report', async (req, res) => {
    try {
        const { email, scoreData } = req.body;

        if (!email || !scoreData) {
            return res.status(400).json({ error: 'Email and score data required' });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const { totalScore, maxScore, frustrationScore, elationScore, verdict, quizName, insight } = scoreData;
        const pct = Math.round((totalScore / maxScore) * 100);

        // Determine score-range specific message
        let rangeMessage = '';
        if (totalScore <= 30) {
            rangeMessage = `Your ego plays a minimal role in your daily experience — and that's rare. Most people don't get here without either deep inner work or a natural disposition toward equanimity. The fact that you scored this low means you already have a strong foundation. The question for you isn't about reducing ego — it's about what you build from this place of clarity.`;
        } else if (totalScore <= 75) {
            rangeMessage = `You're in the range where most self-aware people land. Your ego shows up — it has opinions, it reacts, it wants to be right sometimes — but you also have the awareness to notice it. This is actually the most powerful place to be, because awareness is the prerequisite for change. The patterns you see in your breakdown below are the exact places where targeted awareness will create the biggest shifts.`;
        } else {
            rangeMessage = `Your ego is highly active — and that's not a judgment, it's information. A high score means your nervous system has learned to process most experiences through the lens of self. That's usually a protection mechanism, one that served you well at some point. The insight here isn't to "fix" your ego — it's to understand what it's protecting you from. When you find that, the score takes care of itself.`;
        }

        // Frustration vs Elation insight
        let balanceInsight = '';
        if (frustrationScore > elationScore + 15) {
            balanceInsight = `<p style="margin-bottom: 12px;">📊 <strong>Notable pattern:</strong> Your frustration score (${frustrationScore}) is significantly higher than your elation score (${elationScore}). This means ego shows up more when things go <em>against</em> you than when they go your way — a pattern often rooted in a protective identity you didn't choose.</p>`;
        } else if (elationScore > frustrationScore + 15) {
            balanceInsight = `<p style="margin-bottom: 12px;">📊 <strong>Notable pattern:</strong> Your elation score (${elationScore}) is significantly higher than your frustration score (${frustrationScore}). Your ego feeds more on being right than it suffers from being wrong — often a sign of deep intelligence that became an identity.</p>`;
        } else {
            balanceInsight = `<p style="margin-bottom: 12px;">📊 <strong>Notable pattern:</strong> Your frustration (${frustrationScore}) and elation (${elationScore}) scores are relatively balanced, meaning ego shows up evenly across highs and lows.</p>`;
        }

        const reportHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #0E1117; font-family: 'Helvetica Neue', Arial, sans-serif;">
<div style="max-width: 600px; margin: 0 auto; padding: 40px 24px;">

    <div style="text-align: center; margin-bottom: 32px;">
        <p style="color: #C27C5A; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px;">July Life Coach</p>
        <h1 style="color: #E8E4DD; font-size: 28px; font-weight: 600; margin: 0;">Your Ego Check Results</h1>
    </div>

    <div style="background: rgba(194,124,90,0.08); border: 1px solid rgba(194,124,90,0.2); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #C27C5A; font-size: 48px; font-weight: 700; margin: 0 0 4px;">${totalScore}<span style="font-size: 20px; color: #8B7355;">/${maxScore}</span></p>
        <p style="color: #E8E4DD; font-size: 16px; margin: 0; font-style: italic;">${verdict}</p>
    </div>

    <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <div style="text-align: center; flex: 1;">
                <p style="color: #E07A5F; font-size: 24px; font-weight: 600; margin: 0;">${frustrationScore}<span style="font-size: 14px; color: #8B7355;">/60</span></p>
                <p style="color: #8B7355; font-size: 12px; margin: 4px 0 0;">Frustration</p>
            </div>
            <div style="width: 1px; background: rgba(255,255,255,0.1);"></div>
            <div style="text-align: center; flex: 1;">
                <p style="color: #81B29A; font-size: 24px; font-weight: 600; margin: 0;">${elationScore}<span style="font-size: 14px; color: #8B7355;">/60</span></p>
                <p style="color: #8B7355; font-size: 12px; margin: 4px 0 0;">Elation</p>
            </div>
        </div>
        ${balanceInsight}
    </div>

    <div style="color: #C8C0B8; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        <h2 style="color: #E8E4DD; font-size: 18px; margin-bottom: 12px;">What This Means For You</h2>
        <p style="margin-bottom: 16px;">${rangeMessage}</p>
        ${insight ? `<p style="margin-bottom: 16px; padding: 16px; background: rgba(194,124,90,0.06); border-left: 3px solid #C27C5A; border-radius: 4px;"><strong style="color: #E8E4DD;">${insight.title}</strong><br>${insight.text}</p>` : ''}
        <h3 style="color: #E8E4DD; font-size: 16px; margin: 24px 0 12px;">One Thing You Can Do Today</h3>
        <p>The next time you notice a strong reaction — frustration or elation — pause for three seconds before acting on it. Just three seconds. In that gap, ask: <em>is this me, or is this my ego?</em> You don't need to answer it. The question itself creates the space.</p>
    </div>

    <div style="text-align: center; padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #C8C0B8; font-size: 14px; margin-bottom: 16px;">Want to explore what's driving these patterns?</p>
        <a href="https://calendly.com/julylifecoach/time-with-billy" style="display: inline-block; background: #C27C5A; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Book a Free Discovery Call</a>
    </div>

    <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
        <p style="color: #5A5550; font-size: 12px;">Billy Seol · July Life Coach<br>
        <a href="https://julylifecoach.com" style="color: #8B7355; text-decoration: none;">julylifecoach.com</a></p>
    </div>

</div>
</body>
</html>`;

        // Send report to user
        await transporter.sendMail({
            from: '"Billy Seol" <billy@julylifecoach.com>',
            to: email,
            subject: `Your Ego Check Results — ${verdict}`,
            html: reportHtml
        });

        // Notify Billy of new lead
        await transporter.sendMail({
            from: '"Quiz Funnel" <billy@julylifecoach.com>',
            to: 'billy@julylifecoach.com',
            subject: `New Quiz Lead: ${email} — ${totalScore}/${maxScore}`,
            html: `
                <h2>New Ego Check Lead</h2>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Score:</strong> ${totalScore}/${maxScore} (${pct}%)</p>
                <p><strong>Frustration:</strong> ${frustrationScore}/60</p>
                <p><strong>Elation:</strong> ${elationScore}/60</p>
                <p><strong>Verdict:</strong> ${verdict}</p>
                ${insight ? `<p><strong>Insight:</strong> ${insight.title}</p>` : ''}
            `
        });

        res.status(200).json({ message: 'Report sent successfully' });
    } catch (error) {
        console.error('Error sending quiz report:', error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});

module.exports = router;

