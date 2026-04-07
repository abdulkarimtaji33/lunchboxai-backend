'use strict';

const fs = require('fs');

let admin = null;

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw && String(raw).trim()) {
    try {
      return JSON.parse(String(raw).trim());
    } catch (e) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON parse failed:', e.message);
    }
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;
  if (b64 && String(b64).trim()) {
    try {
      const decoded = Buffer.from(String(b64).trim(), 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON_B64 decode failed:', e.message);
    }
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (filePath && fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn('FIREBASE_SERVICE_ACCOUNT_PATH read failed:', e.message);
    }
  }

  return null;
}

function getFirebaseAdmin() {
  if (admin) return admin;
  try {
    // eslint-disable-next-line global-require
    const firebaseAdmin = require('firebase-admin');
    if (firebaseAdmin.apps.length) {
      admin = firebaseAdmin;
      return admin;
    }

    const credJson = parseServiceAccount();
    if (credJson) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(credJson),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseAdmin.initializeApp();
    } else {
      return null;
    }
    admin = firebaseAdmin;
    return admin;
  } catch (e) {
    console.warn('Firebase Admin init failed:', e.message);
    return null;
  }
}

function getMessaging() {
  const a = getFirebaseAdmin();
  return a ? a.messaging() : null;
}

module.exports = { getFirebaseAdmin, getMessaging };
