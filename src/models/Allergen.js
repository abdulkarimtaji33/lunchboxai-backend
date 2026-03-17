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

  async create({ name, icon }) {
    const [result] = await pool.query('INSERT INTO allergens (name, icon) VALUES (?, ?)', [name, icon || null]);
    return this.findById(result.insertId);
  },

  async update(id, { name, icon }) {
    await pool.query('UPDATE allergens SET name = ?, icon = ? WHERE id = ?', [name, icon || null, id]);
    return this.findById(id);
  },

  async deleteById(id) {
    const [result] = await pool.query('DELETE FROM allergens WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};

module.exports = Allergen;
