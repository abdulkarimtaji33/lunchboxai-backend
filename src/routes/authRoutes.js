'use strict';

const router   = require('express').Router();
const passport = require('../config/passport');
const { register, login, getProfile, updateProfile, handleOAuthCallback } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate, registerSchema, loginSchema } = require('../utils/validators');

// Local auth
router.post('/register', validate(registerSchema), register);
router.post('/login',    validate(loginSchema),    login);

// Profile (protected)
router.get('/me',   authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);

// Google OAuth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/failed' }),
  handleOAuthCallback
);

// Facebook OAuth
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'], session: false })
);
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/api/auth/failed' }),
  handleOAuthCallback
);

// OAuth failure fallback
router.get('/failed', (req, res) =>
  res.status(401).json({ success: false, error: { code: 'OAUTH_FAILED', message: 'Social login failed' } })
);

module.exports = router;
