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

  async create({ name, filename, is_active = 1 }) {
    const [result] = await pool.query(
      'INSERT INTO avatars (name, filename, is_active) VALUES (?, ?, ?)',
      [name, filename, is_active ? 1 : 0]
    );
    return this.findById(result.insertId);
  },

  async update(id, { name, filename, is_active }) {
    const sets = [];
    const vals = [];
    if (name !== undefined) { sets.push('name = ?'); vals.push(name); }
    if (filename !== undefined) { sets.push('filename = ?'); vals.push(filename); }
    if (is_active !== undefined) { sets.push('is_active = ?'); vals.push(is_active ? 1 : 0); }
    if (!sets.length) return this.findById(id);
    vals.push(id);
    await pool.query(`UPDATE avatars SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  },

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM avatars WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Avatar;
