'use strict';

const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter;

function getTransporter() {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }
  return transporter;
}

async function sendPasswordResetEmail(to, { resetUrl, otp }) {
  const tx = getTransporter();
  if (!tx) {
    const err = new Error('SMTP not configured');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  const from = env.smtp.from || env.smtp.user;
  const codeBlock = `Your verification code: ${otp}\n\nEnter this code in the app or on the website reset page (expires in 1 hour).\n\n`;
  const linkBlock = `Or open this link to reset in the browser:\n${resetUrl}\n\n`;
  const footer = 'If you did not request this, ignore this email.';
  await tx.sendMail({
    from,
    to,
    subject: 'Reset your LunchboxAI password',
    text: `${codeBlock}${linkBlock}${footer}`,
    html:
      `<p style="font-size:18px;font-weight:600;">Your verification code</p>` +
      `<p style="font-size:28px;letter-spacing:0.2em;font-family:monospace;">${otp}</p>` +
      `<p>This code expires in 1 hour. Use it in the mobile app or on the reset password page.</p>` +
      `<p>Or <a href="${resetUrl}">reset in the browser</a>.</p>` +
      `<p style="color:#666;font-size:13px;">If you did not request this, you can ignore this email.</p>`,
  });
}

module.exports = { sendPasswordResetEmail, getTransporter };
