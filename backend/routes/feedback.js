const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// POST /api/feedback
router.post('/', async (req, res) => {
    try {
        const { message, replyTo, appSource } = req.body;

        if (!message || !appSource) {
            return res.status(400).json({ error: 'Message and appSource are required' });
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        const replyToText = replyTo ? `<p><strong>Reply-To:</strong> ${replyTo}</p>` : '<p><strong>Reply-To:</strong> Not provided</p>';

        const mailOptions = {
            from: replyTo || 'noreply@julylifecoach.com',
            to: 'billy@julylifecoach.com',
            subject: `New Feedback from ${appSource}`,
            html: `
                <h2>New Feedback / Issue Report</h2>
                <p><strong>App Source:</strong> ${appSource}</p>
                ${replyToText}
                <hr />
                <h3>Message:</h3>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (mailError) {
            console.error('Nodemailer feedback error:', mailError.message);
            // Fallback: Log feedback to a file since sendmail is unavailable
            const fs = require('fs');
            const path = require('path');
            const logEntry = `\n[${new Date().toISOString()}] Feedback from ${appSource}\nReply-To: ${replyTo || 'None'}\nMessage:\n${message}\n------------------------\n`;
            fs.appendFileSync(path.join(__dirname, '../../feedback.log'), logEntry);
            console.log('Feedback saved to local log file as fallback.');
        }

        res.status(200).json({ success: true, message: 'Feedback sent successfully' });
    } catch (error) {
        console.error('Error handling feedback:', error);
        res.status(500).json({ error: 'Failed to process feedback' });
    }
});

module.exports = router;
