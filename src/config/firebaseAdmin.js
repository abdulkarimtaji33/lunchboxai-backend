'use strict';

let admin = null;

function getFirebaseAdmin() {
  if (admin) return admin;
  try {
    // eslint-disable-next-line global-require
    const firebaseAdmin = require('firebase-admin');
    if (firebaseAdmin.apps.length) {
      admin = firebaseAdmin;
      return admin;
    }
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(JSON.parse(json)),
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
