'use strict';

const env = require('../config/env');

function requireBroadcastSecret(req, res, next) {
  const configured = env.broadcastSecret && String(env.broadcastSecret).length > 0;
  if (!configured) {
    return res.status(503).json({
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'Broadcast is not configured (set BROADCAST_SECRET on the server)' },
    });
  }
  const header = String(req.get('x-broadcast-secret') || '').trim();
  const secret = String(env.broadcastSecret || '').trim();
  if (!header || header !== secret) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Invalid X-Broadcast-Secret' },
    });
  }
  next();
}

module.exports = { requireBroadcastSecret };
