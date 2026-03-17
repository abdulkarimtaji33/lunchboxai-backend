const pool = require('../config/database');

const NutritionGoal = {
  async findAll({ includeInactive = false } = {}) {
    const where = includeInactive ? '' : 'WHERE is_active = 1';
    const [rows] = await pool.query(`SELECT * FROM nutrition_goals ${where} ORDER BY label`);
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM nutrition_goals WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByKey(goalKey) {
    const [rows] = await pool.query('SELECT * FROM nutrition_goals WHERE goal_key = ?', [goalKey]);
    return rows[0] || null;
  },

  async create({ goal_key, label, description, is_active = 1 }) {
    const [result] = await pool.query(
      'INSERT INTO nutrition_goals (goal_key, label, description, is_active) VALUES (?, ?, ?, ?)',
      [goal_key, label, description || null, is_active]
    );
    return this.findById(result.insertId);
  },

  async update(id, fields) {
    const allowed = ['goal_key', 'label', 'description', 'is_active'];
    const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (!updates.length) return this.findById(id);
    const sql = `UPDATE nutrition_goals SET ${updates.map(([k]) => `${k} = ?`).join(', ')} WHERE id = ?`;
    await pool.query(sql, [...updates.map(([, v]) => v), id]);
    return this.findById(id);
  },

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM nutrition_goals WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = NutritionGoal;
