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
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail'
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
        }

        res.status(200).json({ success: true, message: 'Feedback sent successfully' });
    } catch (error) {
        console.error('Error handling feedback:', error);
        res.status(500).json({ error: 'Failed to process feedback' });
    }
});

module.exports = router;
