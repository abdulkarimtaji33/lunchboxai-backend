const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const env = require('./env');
const User = require('../models/User');

if (env.google.clientId && env.google.clientSecret) {
  passport.use(new GoogleStrategy({
    clientID: env.google.clientId,
    clientSecret: env.google.clientSecret,
    callbackURL: `${env.appBaseUrl}/api/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findByProvider('google', profile.id);
      if (!user) {
        user = await User.createSocial({
          provider: 'google',
          provider_id: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatar_url: profile.photos?.[0]?.value,
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

if (env.facebook.appId && env.facebook.appSecret) {
  passport.use(new FacebookStrategy({
    clientID: env.facebook.appId,
    clientSecret: env.facebook.appSecret,
    callbackURL: `${env.appBaseUrl}/api/auth/facebook/callback`,
    profileFields: ['id', 'displayName', 'emails', 'photos'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findByProvider('facebook', profile.id);
      if (!user) {
        user = await User.createSocial({
          provider: 'facebook',
          provider_id: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          avatar_url: profile.photos?.[0]?.value,
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

module.exports = passport;
