'use strict';

const { pool } = require('../config/database');

async function findAll({ includeInactive = false } = {}) {
  const where = includeInactive ? '' : 'WHERE is_active = 1';
  const [rows] = await pool.execute(
    `SELECT id, goal_key, label, description, is_active, created_at, updated_at
     FROM nutrition_goals ${where}
     ORDER BY id ASC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, goal_key, label, description, is_active, created_at, updated_at FROM nutrition_goals WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function findByKey(goalKey) {
  const [rows] = await pool.execute(
    'SELECT id, goal_key, label, description FROM nutrition_goals WHERE goal_key = ? AND is_active = 1',
    [goalKey]
  );
  return rows[0] || null;
}

async function create({ goalKey, label, description }) {
  const [result] = await pool.execute(
    'INSERT INTO nutrition_goals (goal_key, label, description) VALUES (?, ?, ?)',
    [goalKey, label, description]
  );
  return result.insertId;
}

async function update(id, fields) {
  const allowed = ['goal_key', 'label', 'description', 'is_active'];
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
  await pool.execute(`UPDATE nutrition_goals SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function deleteById(id) {
  await pool.execute('DELETE FROM nutrition_goals WHERE id = ?', [id]);
}

module.exports = { findAll, findById, findByKey, create, update, deleteById };
