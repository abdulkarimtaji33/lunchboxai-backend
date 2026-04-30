const pool = require('../config/database');

const Allergen = {
  async findAll() {
    const [rows] = await pool.query('SELECT * FROM allergens ORDER BY name');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM allergens WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, icon, category, description, is_common }) {
    const [result] = await pool.query(
      'INSERT INTO allergens (name, icon, category, description, is_common) VALUES (?, ?, ?, ?, ?)',
      [name, icon || null, category || null, description || null, is_common ? 1 : 0]
    );
    return this.findById(result.insertId);
  },

  async update(id, fields) {
    const allowed = ['name', 'icon', 'category', 'description', 'is_common'];
    const sets = [];
    const vals = [];
    for (const [k, v] of Object.entries(fields)) {
      if (!allowed.includes(k) || v === undefined) continue;
      sets.push(`${k} = ?`);
      vals.push(k === 'is_common' ? (v ? 1 : 0) : v);
    }
    if (!sets.length) return this.findById(id);
    vals.push(id);
    await pool.query(`UPDATE allergens SET ${sets.join(', ')} WHERE id = ?`, vals);
    return this.findById(id);
  },

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM allergens WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Allergen;
