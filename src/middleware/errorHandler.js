'use strict';

const { NODE_ENV } = require('../config/env');
const { formatError } = require('../utils/helpers');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[ErrorHandler]', err.message);

  let status = 500;
  let code   = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  if (err.name === 'MulterError') {
    status  = 400;
    code    = 'UPLOAD_ERROR';
    message = err.message;
  } else if (err.message === 'Invalid file type') {
    status  = 400;
    code    = 'INVALID_FILE_TYPE';
    message = 'Only JPEG, PNG, and WebP images are allowed';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    status  = 401;
    code    = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    status  = 401;
    code    = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.code === 'ER_DUP_ENTRY') {
    status  = 409;
    code    = 'DUPLICATE_ENTRY';
    message = 'Email is already registered';
  } else if (err.status) {
    status  = err.status;
    code    = err.code || 'ERROR';
    message = err.message;
  }

  const body = formatError(message, code);
  if (NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = errorHandler;
