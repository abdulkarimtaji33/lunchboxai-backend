const { verifyToken, formatError } = require('../utils/helpers');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(formatError('No token provided', 'UNAUTHORIZED'));
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json(formatError('Invalid or expired token', 'UNAUTHORIZED'));
  }
}

module.exports = { authenticate };
