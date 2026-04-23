'use strict';

const User = require('../models/User');
const { formatError } = require('../utils/helpers');

async function requireAdmin(req, res, next) {
  try {
    const u = await User.findById(req.user.id);
    if (!u || !u.is_admin) {
      return res.status(403).json(formatError('Admin access required', 'FORBIDDEN'));
    }
    req.adminUser = u;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin };
