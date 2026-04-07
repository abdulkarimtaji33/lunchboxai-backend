'use strict';

const FcmToken = require('../models/FcmToken');
const { getMessaging } = require('../config/firebaseAdmin');
const { generateMarketingNotification } = require('../services/notificationAiService');
const { formatResponse, formatError } = require('../utils/helpers');

const BATCH = 500;

/** Android 8+ channel — mobile app must create this id (NotificationChannel). */
const ANDROID_NOTIFICATION_CHANNEL_ID = 'lunchboxai_default';

function parseUseAi(val) {
  if (val === true || val === 1 || val === '1') return true;
  return false;
}

/** Optional body field `notifications_enabled`: 1 | 0 | true | false. Omitted on re-register keeps existing flag. */
function parseNotificationsEnabled(val) {
  if (val === undefined || val === null) return undefined;
  if (val === true || val === 1 || val === '1') return 1;
  if (val === false || val === 0 || val === '0') return 0;
  return undefined;
}

async function registerToken(req, res, next) {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return res.status(503).json(formatError('Push notifications are not configured on the server', 'NOT_CONFIGURED'));
    }
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.length < 20) {
      return res.status(400).json(formatError('Valid FCM token required', 'VALIDATION_ERROR'));
    }
    const enabled = parseNotificationsEnabled(req.body.notifications_enabled);
    await FcmToken.upsert(req.user.id, token.trim(), enabled);
    return res.json(formatResponse({ registered: true }));
  } catch (err) {
    next(err);
  }
}

async function patchToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json(formatError('token required', 'VALIDATION_ERROR'));
    }
    const enabled = parseNotificationsEnabled(req.body.notifications_enabled);
    if (enabled === undefined) {
      return res.status(400).json(formatError('notifications_enabled is required (1 or 0)', 'VALIDATION_ERROR'));
    }
    const ok = await FcmToken.setEnabled(req.user.id, token.trim(), enabled);
    if (!ok) return res.status(404).json(formatError('Token not found for this user', 'NOT_FOUND'));
    return res.json(formatResponse({ notifications_enabled: enabled }));
  } catch (err) {
    next(err);
  }
}

async function unregisterToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json(formatError('token required', 'VALIDATION_ERROR'));
    await FcmToken.removeByToken(req.user.id, token);
    return res.json(formatResponse({ removed: true }));
  } catch (err) {
    next(err);
  }
}

async function broadcast(req, res, next) {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      return res.status(503).json(
        formatError(
          'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_JSON_B64, FIREBASE_SERVICE_ACCOUNT_PATH, or GOOGLE_APPLICATION_CREDENTIALS on the server.',
          'NOT_CONFIGURED'
        )
      );
    }

    const { message, use_ai } = req.body;
    const useAi = parseUseAi(use_ai);

    let title = 'LunchBox AI';
    let body = '';

    if (useAi) {
      const hint = typeof message === 'string' ? message.trim() : '';
      const gen = await generateMarketingNotification(hint || 'Encourage parents to plan a fun, healthy lunch this week.');
      title = gen.title;
      body = gen.body;
    } else {
      if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json(formatError('message is required when use_ai is false', 'VALIDATION_ERROR'));
      }
      body = message.trim().slice(0, 2000);
    }

    const tokens = await FcmToken.getAllTokens();
    if (!tokens.length) {
      return res.json(formatResponse({ sent: 0, failed: 0, message: 'No registered devices' }));
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < tokens.length; i += BATCH) {
      const chunk = tokens.slice(i, i + BATCH);
      // One message per token: FCM routes to Web / Android / iOS by token type.
      // Intentionally no root `notification` field: on web, that often prevents the service worker
      // `onBackgroundMessage` path; we use `data` + `webpush` (+ android/apns for native).
      const messages = chunk.map(tk => ({
        token: tk,
        data: {
          title: String(title),
          body: String(body),
        },
        android: {
          priority: 'high',
          notification: {
            title,
            body,
            channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              alert: { title, body },
              sound: 'default',
            },
          },
        },
        webpush: {
          notification: { title, body },
          fcmOptions: { link: '/' },
          headers: { Urgency: 'high' },
        },
      }));
      const result = await messaging.sendEach(messages);
      sent += result.successCount;
      failed += result.failureCount;
    }

    return res.json(formatResponse({
      sent,
      failed,
      title,
      body_preview: body.slice(0, 200),
      use_ai: useAi,
      device_tokens_targeted: tokens.length,
    }));
  } catch (err) {
    next(err);
  }
}

module.exports = { registerToken, patchToken, unregisterToken, broadcast };
