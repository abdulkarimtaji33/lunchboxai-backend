'use strict';

const pool = require('../config/database');

async function deleteForUser(userId) {
  await pool.execute('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
}

async function create({ userId, tokenHash, otpHash, expiresAt }) {
  await pool.execute(
    'INSERT INTO password_reset_tokens (user_id, token_hash, otp_hash, expires_at) VALUES (?, ?, ?, ?)',
    [userId, tokenHash, otpHash, expiresAt]
  );
}

/** Returns { user_id } or null if missing/expired. */
async function findValidByHash(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash = ? AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

/** @returns {{ user_id: number } | null} */
async function findValidByUserIdAndOtpHash(userId, otpHash) {
  const [rows] = await pool.execute(
    `SELECT user_id FROM password_reset_tokens
     WHERE user_id = ? AND otp_hash = ? AND expires_at > NOW()`,
    [userId, otpHash]
  );
  return rows[0] || null;
}

async function deleteByHash(tokenHash) {
  await pool.execute('DELETE FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
}

module.exports = { create, deleteForUser, findValidByHash, findValidByUserIdAndOtpHash, deleteByHash };
