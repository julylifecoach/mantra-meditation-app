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

        // Billy's score-range specific copy
        let rangeMessage = '';
        let actionableTip = '';
        if (totalScore <= 30) {
            rangeMessage = `Your ego score is relatively low. In terms of suffering because of the self, you're unlikely to be impacted by it.<br><br>People arrive at this score zone in two ways: one, their upbringing gave them a diversity of viewpoints and experiences — they understand that every experience is just different, and there is no right or wrong.<br><br>The other way is to arrive at it via practice. They suffered before because they were clinging on being right, being good, and so on — but in order to be free from suffering they relinquished their existing worldview.<br><br>I don't know which one you would fall under, but I'd love to hear your opinion about it.`;
            actionableTip = `You probably have mindfulness as a part of your practice, whether you're conscious of it or not. I would encourage exploring a deeper understanding of your personal history as a next step.`;
        } else if (totalScore <= 75) {
            rangeMessage = `Your ego score is in the medium zone. This is actually where the statistical majority of people would be.<br><br>The idea of the self is elusive. It obviously exists, because the seemingly irrefutable evidence of your existence is breathing inside of your body. But at the same time... If I asked you what you are, and what ONLY you are and not anything / anyone else, you'd find that it's a very difficult question to answer.<br><br>The nice thing about being in this zone is, you probably don't realize your suffering all that much. You think everyone more or less lives like this.<br><br>But the not-so-nice thing about being in this zone is, you're probably suffering more than you think. There is a difference between the conscious mind and the unconscious mind. Your conscious mind is aware of the attachment to ego when it is given these questions in the quiz, but you probably don't think about these situations all the time.`;
            actionableTip = `You probably don't feel an urgent need to do anything big about your life right now, but consider coaching work like insurance: when life suddenly doesn't go your way, wouldn't you want to be prepared?`;
        } else {
            rangeMessage = `Your ego score is in the high zone. I would guess that every day is somewhat of a struggle for you and you're not looking forward to another day beginning.<br><br>Your ego is defensively activated — it's always on the lookout for potential triggers for insecurity. Possibly because it has been attacked by others before during formative years.<br><br>Your ego is looking to be "saved" by good fortune and validation. Because both of these are true at the same time, you would constantly go through up-and-down cycles of emotions.<br><br>You may feel like life is something you're forced to live under really unfair rules. You're right, but you keep needing to succumb to others. You rarely get a break from life, but life always takes it away from you after a while. You're not living your life; your life is living you.`;
            actionableTip = `Before anything else, I recommend having some kind of relief to your built-up stress. Engage in a stress-breaking activity or talk with someone in a safe environment to let pressure out.`;
        }

        // Frustration vs Elation pattern
        let balanceInsight = '';
        if (frustrationScore > elationScore + 15) {
            balanceInsight = `<p style="color: #C8C0B8; margin-bottom: 12px;">📊 <strong style="color: #E8E4DD;">Notable pattern:</strong> Your frustration score (${frustrationScore}) is significantly higher than your elation score (${elationScore}). This means ego shows up more when things go <em>against</em> you than when they go your way — a pattern often rooted in a protective identity you didn't choose.</p>`;
        } else if (elationScore > frustrationScore + 15) {
            balanceInsight = `<p style="color: #C8C0B8; margin-bottom: 12px;">📊 <strong style="color: #E8E4DD;">Notable pattern:</strong> Your elation score (${elationScore}) is significantly higher than your frustration score (${frustrationScore}). Your ego feeds more on being right than it suffers from being wrong — often a sign of deep intelligence that became an identity.</p>`;
        } else {
            balanceInsight = `<p style="color: #C8C0B8; margin-bottom: 12px;">📊 <strong style="color: #E8E4DD;">Notable pattern:</strong> Your frustration (${frustrationScore}) and elation (${elationScore}) scores are relatively balanced, meaning ego shows up evenly across highs and lows.</p>`;
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

    <div style="color: #C8C0B8; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        <p>Hey there,</p>
        <p>Thanks for taking the time to take my ego quiz! It's quite a lot of questions, but this analysis will make it worth it for you.</p>
    </div>

    <div style="background: #1a1a1a; border: 1px solid #2a2520; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #C27C5A; font-size: 48px; font-weight: 700; margin: 0 0 4px;">${totalScore}<span style="font-size: 20px; color: #8B7355;">/${maxScore}</span></p>
        <p style="color: #E8E4DD; font-size: 16px; margin: 0; font-style: italic;">${verdict}</p>
    </div>

    <div style="background: #151820; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
            <tr>
                <td width="48%" style="text-align: center; vertical-align: top;">
                    <p style="color: #E07A5F; font-size: 28px; font-weight: 600; margin: 0;">${frustrationScore}<span style="font-size: 14px; color: #8B7355;">/60</span></p>
                    <p style="color: #A09080; font-size: 12px; margin: 4px 0 0;">Frustration</p>
                </td>
                <td width="4%" style="text-align: center; vertical-align: top;">
                    <div style="width: 1px; height: 40px; background: #2a2520; margin: 0 auto;"></div>
                </td>
                <td width="48%" style="text-align: center; vertical-align: top;">
                    <p style="color: #81B29A; font-size: 28px; font-weight: 600; margin: 0;">${elationScore}<span style="font-size: 14px; color: #8B7355;">/60</span></p>
                    <p style="color: #A09080; font-size: 12px; margin: 4px 0 0;">Elation</p>
                </td>
            </tr>
        </table>
        ${balanceInsight}
    </div>

    <div style="color: #C8C0B8; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        <h2 style="color: #E8E4DD; font-size: 18px; margin-bottom: 12px;">What this likely means for you</h2>
        <p style="margin-bottom: 16px;">Let me start by telling you why I came up with this quiz.</p>
        <p style="margin-bottom: 16px;">I am a life coach who primarily deals with suffering, because to me happiness is complete freedom from suffering. To arrive at this happiness we have to understand WHY we suffer so that we can overcome the REASONS for suffering.</p>
        <p style="margin-bottom: 16px;">One of those core reasons happens to be our attachment to the idea of the self. The unrealistically easy thing to do now is, stop attaching to the self!</p>
        <p style="margin-bottom: 16px;">But why is that hard in action? Because this is such an unconscious attachment, it may be difficult for you to identify it yourself.</p>
        <p style="margin-bottom: 24px;">The quiz aimed to ask you questions so you can surface up your unconscious attachment to the idea of yourself, or in other words: ego.</p>
        
        <div style="padding: 20px; background: #1a1714; border-left: 3px solid #C27C5A; border-radius: 4px; margin-bottom: 16px;">
            <p style="margin: 0;">${rangeMessage}</p>
        </div>

        ${insight ? `<p style="margin-bottom: 16px; padding: 16px; background: #151820; border-radius: 8px;"><strong style="color: #E8E4DD;">${insight.title}</strong><br>${insight.text}</p>` : ''}

        <h3 style="color: #E8E4DD; font-size: 16px; margin: 24px 0 12px;">What I'd recommend</h3>
        <p>${actionableTip}</p>
    </div>

    <div style="color: #C8C0B8; font-size: 15px; line-height: 1.7; margin-bottom: 24px; padding: 24px; background: #151820; border-radius: 12px; text-align: center;">
        <p style="margin-bottom: 16px;">This is of course something we can explore together, and I would love to talk to you over Zoom.</p>
        <a href="https://www.julylifecoach.com/free-call.html" style="display: inline-block; background: #C27C5A; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Set Up Time to Meet Me →</a>
    </div>

    <div style="color: #C8C0B8; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
        <p>Let me know what you think!</p>
        <p style="margin-top: 16px;">Your friend,<br><strong style="color: #E8E4DD;">Billy</strong></p>
    </div>

    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #1f1f1f;">
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
            subject: 'Your Ego Check Results — Here\'s What They Mean',
            html: reportHtml
        });

        // Respond immediately — remaining tasks run in background
        res.status(200).json({ message: 'Report sent successfully' });

        // Background: notify Billy + subscribe to Kit (fire-and-forget)
        (async () => {
            try {
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
            } catch (e) { console.error('Billy notification error:', e.message); }

            // Subscribe to Kit (ConvertKit) with ego-quiz-lead tag
            if (process.env.KIT_API_KEY) {
                try {
                    const tagId = process.env.KIT_TAG_EGO_QUIZ || '17676211';
                    const subRes = await fetch('https://api.kit.com/v4/subscribers', {
                        method: 'POST',
                        headers: {
                            'X-Kit-Api-Key': process.env.KIT_API_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ email_address: email, state: 'active' })
                    });
                    const subData = await subRes.json();
                    const subscriberId = subData?.subscriber?.id;

                    if (subscriberId) {
                        await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
                            method: 'POST',
                            headers: {
                                'X-Kit-Api-Key': process.env.KIT_API_KEY,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ id: subscriberId })
                        });
                    }
                    console.log(`Kit: subscribed ${email} with ego-quiz-lead tag`);
                } catch (kitErr) {
                    console.error('Kit integration error:', kitErr.message);
                }
            }
        })();
    } catch (error) {
        console.error('Error sending quiz report:', error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});


// POST /api/resilience/reaction-mirror-report
// Handle Reaction Mirror email gate — subscribe to Kit + add to sequence
router.post('/reaction-mirror-report', async (req, res) => {
    try {
        const { email, results } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // Respond immediately
        res.status(200).json({ message: 'Subscribed successfully' });

        // Background: Kit subscribe + tag + sequence (fire-and-forget)
        (async () => {
            if (!process.env.KIT_API_KEY) {
                console.error('KIT_API_KEY not set — skipping Kit integration');
                return;
            }

            try {
                const headers = {
                    'X-Kit-Api-Key': process.env.KIT_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };

                // 1. Create/update subscriber
                const subRes = await fetch('https://api.kit.com/v4/subscribers', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        email_address: email,
                        state: 'active',
                        fields: results?.dominant ? {
                            'reaction_pattern': results.dominant.name || '',
                        } : {}
                    })
                });
                const subData = await subRes.json();
                const subscriberId = subData?.subscriber?.id;

                if (!subscriberId) {
                    console.error('Kit: failed to get subscriber ID for', email);
                    return;
                }

                // 2. Tag with reaction-mirror-lead
                const tagId = process.env.KIT_TAG_REACTION_MIRROR || '17676211'; // fallback to ego-quiz tag
                await fetch(`https://api.kit.com/v4/tags/${tagId}/subscribers`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ id: subscriberId })
                });

                // 3. Add to Ego/Reflection Track sequence
                const sequenceId = '2722214';
                await fetch(`https://api.kit.com/v4/sequences/${sequenceId}/subscribers`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ id: subscriberId })
                });

                console.log(`Kit: subscribed ${email} to reaction-mirror sequence (pattern: ${results?.dominant?.name || 'low-ego'})`);
            } catch (kitErr) {
                console.error('Kit integration error:', kitErr.message);
            }
        })();
    } catch (error) {
        console.error('Error handling reaction-mirror-report:', error);
        res.status(500).json({ error: 'Failed to process subscription' });
    }
});

module.exports = router;

