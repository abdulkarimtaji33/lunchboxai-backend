'use strict';

const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client();

/**
 * @param {string} idToken
 * @param {string|string[]} audience Client IDs (Web / Android / iOS) that may appear as `aud`
 */
async function verifyGoogleIdToken(idToken, audience) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience,
  });
  return ticket.getPayload();
}

module.exports = { verifyGoogleIdToken };
