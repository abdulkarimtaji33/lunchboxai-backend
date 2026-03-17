const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  async findById(id) {
    const [rows] = await pool.query('SELECT id, name, email, provider, avatar_url, created_at FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findByProvider(provider, providerId) {
    const [rows] = await pool.query('SELECT * FROM users WHERE provider = ? AND provider_id = ?', [provider, providerId]);
    return rows[0] || null;
  },

  async create({ name, email, password }) {
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, provider) VALUES (?, ?, ?, ?)',
      [name, email, hashed, 'local']
    );
    return this.findById(result.insertId);
  },

  async createSocial({ provider, provider_id, name, email, avatar_url }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, provider, provider_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
      [name, email || null, provider, provider_id, avatar_url || null]
    );
    return this.findById(result.insertId);
  },

  async createLocal({ email, passwordHash, name }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, provider) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, 'local']
    );
    return result.insertId;
  },

  async updateProfile(id, { name }) {
    await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, id]);
  },

  async comparePassword(plainPassword, hash) {
    return bcrypt.compare(plainPassword, hash);
  },
};

module.exports = User;
