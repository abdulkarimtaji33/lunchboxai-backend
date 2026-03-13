'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const { JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL } = require('../config/env');
const { formatResponse, formatError } = require('../utils/helpers');

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function register(req, res, next) {
  try {
    const { email, password, full_name } = req.body;

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json(formatError('Email already registered', 'DUPLICATE_ENTRY'));
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId       = await User.createLocal({ email, passwordHash, fullName: full_name });
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

async function getProfile(req, res) {
  res.json(formatResponse({ user: req.user }));
}

async function updateProfile(req, res, next) {
  try {
    const { full_name } = req.body;
    if (!full_name) {
      return res.status(400).json(formatError('full_name is required', 'VALIDATION_ERROR'));
    }
    await User.updateProfile(req.user.id, { fullName: full_name });
    const updated = await User.findById(req.user.id);
    res.json(formatResponse({ user: updated }));
  } catch (err) {
    next(err);
  }
}

// Called after passport authenticates via Google or Facebook
function handleOAuthCallback(req, res) {
  const token = signToken(req.user.id);
  res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
}

module.exports = { register, login, getProfile, updateProfile, handleOAuthCallback };
