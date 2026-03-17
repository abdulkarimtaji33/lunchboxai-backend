'use strict';

const pool = require('../config/database');

async function findAll({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  const [rows] = await pool.execute(
    `SELECT id, name, category, is_active, created_at, updated_at
     FROM food_items ${where}
     ORDER BY category ASC, name ASC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, category, is_active, created_at, updated_at FROM food_items WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, category }) {
  const [result] = await pool.execute(
    'INSERT INTO food_items (name, category) VALUES (?, ?)',
    [name, category || null]
  );
  return result.insertId;
}

async function update(id, fields) {
  const allowed = ['name', 'category', 'is_active'];
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k) && v !== undefined) {
      sets.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (!sets.length) return;
  values.push(id);
  await pool.execute(`UPDATE food_items SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function deleteById(id) {
  await pool.execute('DELETE FROM food_items WHERE id = ?', [id]);
}

// Pick N random active food item names (used by aiService)
async function getRandomActive(count) {
  const [rows] = await pool.execute('SELECT name FROM food_items WHERE is_active = 1');
  const shuffled = rows.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(r => r.name);
}

module.exports = { findAll, findById, create, update, deleteById, getRandomActive };
