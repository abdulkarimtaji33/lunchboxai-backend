'use strict';

const { pool } = require('../config/database');

const PUBLIC_FIELDS = 'id, email, full_name, avatar_url, auth_provider, created_at, updated_at';

async function findByEmail(email) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function findBySocialId(provider, providerId) {
  const column = provider === 'google' ? 'google_id' : 'facebook_id';
  const [rows] = await pool.execute(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE ${column} = ?`,
    [providerId]
  );
  return rows[0] || null;
}

async function create({ email, passwordHash, fullName, providerId, idField, avatarUrl, authProvider }) {
  const [result] = await pool.execute(
    `INSERT INTO users (email, password_hash, full_name, ${idField || 'google_id'}, avatar_url, auth_provider)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      email,
      passwordHash || null,
      fullName,
      providerId   || null,
      avatarUrl    || null,
      authProvider || 'local',
    ]
  );
  return result.insertId;
}

async function createLocal({ email, passwordHash, fullName }) {
  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash, full_name, auth_provider) VALUES (?, ?, ?, ?)',
    [email, passwordHash, fullName, 'local']
  );
  return result.insertId;
}

async function linkSocialAccount(id, idField, providerId, avatarUrl) {
  await pool.execute(
    `UPDATE users SET ${idField} = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?`,
    [providerId, avatarUrl, id]
  );
}

async function updateProfile(id, { fullName }) {
  await pool.execute(
    'UPDATE users SET full_name = ? WHERE id = ?',
    [fullName, id]
  );
}

module.exports = { findByEmail, findById, findBySocialId, create, createLocal, linkSocialAccount, updateProfile };
