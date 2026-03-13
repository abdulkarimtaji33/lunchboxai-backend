'use strict';

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  FACEBOOK_APP_ID, FACEBOOK_APP_SECRET,
  APP_BASE_URL,
} = require('./env');

async function findOrCreateSocialUser({ provider, providerId, email, fullName, avatarUrl }) {
  const idField = provider === 'google' ? 'google_id' : 'facebook_id';

  // 1. Find by provider ID
  let user = await User.findBySocialId(provider, providerId);
  if (user) return user;

  // 2. Find by email → link the social account
  if (email) {
    user = await User.findByEmail(email);
    if (user) {
      await User.linkSocialAccount(user.id, idField, providerId, avatarUrl);
      return User.findById(user.id);
    }
  }

  // 3. Create new social account
  const insertId = await User.create({
    email:        email || `${provider}_${providerId}@noemail.local`,
    passwordHash: null,
    fullName:     fullName || 'User',
    providerId,
    idField,
    avatarUrl,
    authProvider: provider,
  });
  return User.findById(insertId);
}

if (GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy(
    {
      clientID:     GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL:  `${APP_BASE_URL}/api/auth/google/callback`,
      scope:        ['profile', 'email'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value || null;
        const avatarUrl = profile.photos?.[0]?.value || null;
        const user = await findOrCreateSocialUser({
          provider:   'google',
          providerId: profile.id,
          email,
          fullName:   profile.displayName,
          avatarUrl,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ));
}

if (FACEBOOK_APP_ID) {
  passport.use(new FacebookStrategy(
    {
      clientID:      FACEBOOK_APP_ID,
      clientSecret:  FACEBOOK_APP_SECRET,
      callbackURL:   `${APP_BASE_URL}/api/auth/facebook/callback`,
      profileFields: ['id', 'displayName', 'email', 'photos'],
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email     = profile.emails?.[0]?.value || null;
        const avatarUrl = profile.photos?.[0]?.value || null;
        const user = await findOrCreateSocialUser({
          provider:   'facebook',
          providerId: profile.id,
          email,
          fullName:   profile.displayName,
          avatarUrl,
        });
        done(null, user);
      } catch (err) {
        done(err);
      }
    },
  ));
}

module.exports = passport;
