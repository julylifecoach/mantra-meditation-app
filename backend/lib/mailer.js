const nodemailer = require('nodemailer');

/**
 * Singleton nodemailer transport using Gmail config from env vars.
 * Reused across all routes instead of creating a new transport per request.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

module.exports = transporter;
