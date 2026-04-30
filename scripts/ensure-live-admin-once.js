#!/usr/bin/env node
/**
 * One-off: create or reset a local admin (run on server with .env loaded).
 * Usage: ADMIN_EMAIL=you@x.com node scripts/ensure-live-admin-once.js
 * Password printed once to stdout.
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const email = (process.env.ADMIN_EMAIL || 'admin@lunchboxai.local').trim();
const pass =
  process.env.ADMIN_PASS ||
  crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 22);

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const hash = await bcrypt.hash(pass, 12);
  const credits = Math.max(
    0,
    parseInt(process.env.DEFAULT_FREE_GENERATION_CREDITS || '5', 10) || 0
  );
  const [rows] = await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER(?)', [email]);
  if (rows.length) {
    await pool.query(
      'UPDATE users SET password_hash = ?, is_admin = 1, provider = ? WHERE id = ?',
      [hash, 'local', rows[0].id]
    );
    console.log('Updated existing user to admin with new password.');
  } else {
    await pool.query(
      `INSERT INTO users (name, email, password_hash, provider, generation_credits, is_admin)
       VALUES (?, ?, ?, 'local', ?, 1)`,
      ['Administrator', email, hash, credits]
    );
    console.log('Created new admin user.');
  }
  await pool.end();
  console.log('EMAIL=' + email);
  console.log('PASSWORD=' + pass);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
