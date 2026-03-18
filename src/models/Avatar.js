const pool = require('../config/database');

const Avatar = {
  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? '' : 'WHERE is_active = 1';
    const [rows] = await pool.query(`SELECT id, name, filename, is_active, created_at FROM avatars ${where} ORDER BY name`);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT id, name, filename, is_active, created_at FROM avatars WHERE id = ?', [id]);
    return rows[0] || null;
  },
};

module.exports = Avatar;
