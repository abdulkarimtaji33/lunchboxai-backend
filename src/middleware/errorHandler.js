'use strict';

const { sanitizeBody } = require('./httpLogger');

function errorHandler(err, req, res, next) {
  const path = req.originalUrl || req.url;
  console.error('[ERROR]', req.method, path, req.ip, err.name || 'Error', err.message);
  if (req.body && Object.keys(req.body).length) {
    console.error('[ERROR body]', JSON.stringify(sanitizeBody(req.body)).slice(0, 1500));
  }
  if (err.stack && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  } else if (err.stack && (err.statusCode >= 500 || !err.statusCode)) {
    console.error(err.stack.split('\n').slice(0, 8).join('\n'));
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ success: false, message: err.message });
  }
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: err.message || 'Internal server error',
  };
  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
