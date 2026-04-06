'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendPasswordResetEmail } = require('../services/emailService');
const env    = require('../config/env');
const { formatResponse, formatError } = require('../utils/helpers');
const { verifyGoogleIdToken } = require('../services/googleAuthService');

function signToken(userId) {
  return jwt.sign({ id: userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

async function register(req, res, next) {
  try {
    const { email, password, full_name, name: nameField } = req.body;
    const resolvedName = full_name || nameField;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json(formatError('Email already registered', 'DUPLICATE_ENTRY'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId       = await User.createLocal({ email, passwordHash, name: resolvedName });
    const user         = await User.findById(userId);
    const token        = signToken(userId);

    res.status(201).json(formatResponse({ token, user }));
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json(formatError('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json(formatError('Invalid email or password', 'INVALID_CREDENTIALS'));
    }

    const token  = signToken(user.id);
    const public_ = await User.findById(user.id);
    res.json(formatResponse({ token, user: public_ }));
  } catch (err) {
    next(err);
  }
}

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    res.json(formatResponse({ user }));
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { full_name, name: nameField } = req.body;
    const resolvedName = full_name || nameField;
    if (!resolvedName) {
      return res.status(400).json(formatError('name or full_name is required', 'VALIDATION_ERROR'));
    }
    await User.updateProfile(req.user.id, { name: resolvedName });
    const updated = await User.findById(req.user.id);
    res.json(formatResponse({ user: updated }));
  } catch (err) {
    next(err);
  }
}

/** Native / mobile: verify Google Sign-In ID token, return same JWT shape as login */
async function googleMobileLogin(req, res, next) {
  try {
    const audiences = env.google.allowedAudiences;
    if (!audiences.length) {
      return res.status(503).json(
        formatError('Google mobile auth not configured (set GOOGLE_CLIENT_ID or GOOGLE_ALLOWED_AUDIENCES)', 'NOT_CONFIGURED')
      );
    }

    const idToken = req.body.idToken || req.body.id_token;
    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken, audiences);
    } catch {
      return res.status(401).json(formatError('Invalid or expired Google ID token', 'INVALID_GOOGLE_TOKEN'));
    }

    const sub = payload.sub;
    if (!sub) {
      return res.status(401).json(formatError('Invalid Google ID token', 'INVALID_GOOGLE_TOKEN'));
    }

    const email = (payload.email || '').trim() || null;
    const name = (payload.name || '').trim() || (email ? email.split('@')[0] : 'User');
    const picture = payload.picture || null;

    let user = await User.findByProvider('google', sub);
    if (!user) {
      if (!email) {
        return res.status(400).json(formatError('Google account must share an email to register', 'EMAIL_REQUIRED'));
      }
      const existing = await User.findByEmailInsensitive(email);
      if (existing) {
        return res.status(409).json(
          formatError('This email is already registered with another sign-in method.', 'EMAIL_CONFLICT')
        );
      }
      user = await User.createSocial({
        provider: 'google',
        provider_id: sub,
        name,
        email,
        avatar_url: picture,
      });
    }

    const publicUser = await User.findById(user.id);
    const token = signToken(user.id);
    res.json(formatResponse({ token, user: publicUser }));
  } catch (err) {
    next(err);
  }
}

// Called after passport authenticates via Google or Facebook
function handleOAuthCallback(req, res) {
  const token = signToken(req.user.id);
  res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
}

const RESET_GENERIC = 'If an account exists for this email, we sent password reset instructions.';

async function forgotPassword(req, res, next) {
  try {
    const email = String(req.body.email || '').trim();
    const user = await User.findByEmailInsensitive(email);

    if (!user || !user.password_hash) {
      return res.json(formatResponse({ message: RESET_GENERIC }));
    }

    if (!env.smtp.pass || !env.smtp.user) {
      console.warn('forgotPassword: SMTP not configured (SMTP_USER / SMTP_PASS)');
      return res.json(formatResponse({ message: RESET_GENERIC }));
    }

    await PasswordResetToken.deleteForUser(user.id);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await PasswordResetToken.create({ userId: user.id, tokenHash, expiresAt });

    const resetUrl = `${env.frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (e) {
      console.error('forgotPassword: send mail failed:', e.message);
      await PasswordResetToken.deleteByHash(tokenHash);
      return res.status(503).json(formatError('Unable to send email. Try again later.', 'EMAIL_FAILED'));
    }

    return res.json(formatResponse({ message: RESET_GENERIC }));
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    const raw = String(token || '').trim();
    if (!raw) {
      return res.status(400).json(formatError('Token required', 'VALIDATION_ERROR'));
    }
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const row = await PasswordResetToken.findValidByHash(tokenHash);
    if (!row) {
      return res.status(400).json(formatError('Invalid or expired reset link. Request a new one.', 'INVALID_TOKEN'));
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.updatePasswordHash(row.user_id, passwordHash);
    await PasswordResetToken.deleteForUser(row.user_id);

    return res.json(formatResponse({ message: 'Password updated. You can sign in now.' }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  googleMobileLogin,
  handleOAuthCallback,
  forgotPassword,
  resetPassword,
};
