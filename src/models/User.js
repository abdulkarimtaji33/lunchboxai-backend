const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

function initialGenerationCredits() {
  return env.defaultFreeGenerationCredits;
}

const publicFields =
  'id, name, email, provider, avatar_url, generation_credits, is_admin, created_at';

const User = {
  initialGenerationCredits,

  async findById(id) {
    const [rows] = await pool.query(`SELECT ${publicFields} FROM users WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  /** Includes stripe_customer_id (server-only; do not send to browsers). */
  async findBillingContext(id) {
    const [rows] = await pool.query(
      'SELECT id, email, name, stripe_customer_id, generation_credits, is_admin FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findByEmailInsensitive(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
    return rows[0] || null;
  },

  async findByProvider(provider, providerId) {
    const [rows] = await pool.query('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [provider, providerId]);
    return rows[0] || null;
  },

  async create({ name, email, password }) {
    const hashed = await bcrypt.hash(password, 10);
    const credits = initialGenerationCredits();
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, provider, generation_credits) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, 'local', credits]
    );
    return this.findById(result.insertId);
  },

  async createSocial({ provider, provider_id, name, email, avatar_url }) {
    const credits = initialGenerationCredits();
    const [result] = await pool.query(
      'INSERT INTO users (name, email, provider, provider_id, avatar_url, generation_credits) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email || null, provider, provider_id, avatar_url || null, credits]
    );
    return this.findById(result.insertId);
  },

  async createLocal({ email, passwordHash, name }) {
    const credits = initialGenerationCredits();
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, provider, generation_credits) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'local', credits]
    );
    return result.insertId;
  },

  async updateProfile(id, { name }) {
    await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, id]);
  },

  async updatePasswordHash(id, passwordHash) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
  },

  async setStripeCustomerId(id, stripeCustomerId) {
    await pool.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [stripeCustomerId, id]);
  },

  async addGenerationCredits(id, delta) {
    const n = Math.max(0, parseInt(delta, 10) || 0);
    if (!n) return;
    await pool.query(
      'UPDATE users SET generation_credits = generation_credits + ? WHERE id = ?',
      [n, id]
    );
  },

  /** Signed delta; credits never go below 0. */
  async adjustGenerationCredits(id, delta) {
    const d = parseInt(delta, 10);
    if (!Number.isFinite(d) || d === 0) return;
    await pool.query(
      'UPDATE users SET generation_credits = GREATEST(0, generation_credits + ?) WHERE id = ?',
      [d, id]
    );
  },

  async setAdmin(id, isAdmin) {
    await pool.query('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, id]);
  },

  async countAdmins() {
    const [rows] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE is_admin = 1');
    return rows[0].c;
  },

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async consumeOneCredit(id) {
    const [result] = await pool.query(
      'UPDATE users SET generation_credits = generation_credits - 1 WHERE id = ? AND generation_credits > 0',
      [id]
    );
    return result.affectedRows > 0;
  },

  async comparePassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  },

  async bootstrapAdmins() {
    if (!env.adminBootstrapEmails.length) return;
    for (const email of env.adminBootstrapEmails) {
      await pool.query('UPDATE users SET is_admin = 1 WHERE LOWER(email) = ?', [email]);
    }
  },

  async bootstrapAdminAccount() {
    const email = env.adminBootstrapEmail;
    const password = env.adminBootstrapPassword;
    if (!email || !password || password.length < 8) return;

    const existing = await User.findByEmailInsensitive(email);
    if (existing) {
      await pool.query('UPDATE users SET is_admin = 1 WHERE id = ?', [existing.id]);
      if (!existing.password_hash) {
        const passwordHash = await bcrypt.hash(password, 12);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, existing.id]);
        console.log('[admin-bootstrap] Added password for account (was OAuth-only):', email);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const credits = initialGenerationCredits();
    await pool.query(
      `INSERT INTO users (name, email, password_hash, provider, generation_credits, is_admin)
       VALUES (?, ?, ?, 'local', ?, 1)`,
      ['Administrator', email, passwordHash, credits]
    );
    console.log('[admin-bootstrap] Created local admin:', email);
  },
};

module.exports = User;
