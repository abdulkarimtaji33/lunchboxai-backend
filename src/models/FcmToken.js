'use strict';

const pool = require('../config/database');

/**
 * @param {number} notificationsEnabled - 1 or 0; if undefined, duplicate-key update does not change enabled.
 */
async function upsert(userId, token, notificationsEnabled) {
  if (notificationsEnabled === undefined) {
    await pool.execute(
      `INSERT INTO user_fcm_tokens (user_id, token, notifications_enabled) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), updated_at = CURRENT_TIMESTAMP`,
      [userId, token]
    );
  } else {
    const en = notificationsEnabled ? 1 : 0;
    await pool.execute(
      `INSERT INTO user_fcm_tokens (user_id, token, notifications_enabled) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), notifications_enabled = VALUES(notifications_enabled), updated_at = CURRENT_TIMESTAMP`,
      [userId, token, en]
    );
  }
}

async function setEnabled(userId, token, enabled) {
  const [result] = await pool.execute(
    'UPDATE user_fcm_tokens SET notifications_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token = ?',
    [enabled ? 1 : 0, userId, token]
  );
  return result.affectedRows > 0;
}

async function removeByToken(userId, token) {
  const [result] = await pool.execute(
    'DELETE FROM user_fcm_tokens WHERE user_id = ? AND token = ?',
    [userId, token]
  );
  return result.affectedRows > 0;
}

async function getAllTokens() {
  const [rows] = await pool.execute(
    'SELECT token FROM user_fcm_tokens WHERE notifications_enabled = 1'
  );
  return rows.map(r => r.token);
}

module.exports = { upsert, setEnabled, removeByToken, getAllTokens };
