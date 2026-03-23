'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const env    = require('../config/env');
const { formatResponse, formatError } = require('../utils/helpers');

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

// Called after passport authenticates via Google or Facebook
function handleOAuthCallback(req, res) {
  const token = signToken(req.user.id);
  res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
}

module.exports = { register, login, getProfile, updateProfile, handleOAuthCallback };
