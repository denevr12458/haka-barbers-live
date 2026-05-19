'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true only for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// test connection on startup (VERY IMPORTANT)
transporter.verify((error, success) => {
  if (error) {
    console.error('[EMAIL] SMTP connection failed:', error.message);
  } else {
    console.log('[EMAIL] SMTP ready');
  }
});

async function sendEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"Haka Barbers" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html
  });
}

module.exports = { sendEmail };
