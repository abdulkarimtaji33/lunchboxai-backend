'use strict';

const pool = require('../config/database');

async function findAll() {
  const [rows] = await pool.execute(
    'SELECT id, name, description FROM school_rules WHERE is_active = 1 ORDER BY name ASC'
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, description, is_active FROM school_rules WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function findAllAdmin() {
  const [rows] = await pool.execute(
    'SELECT id, name, description, is_active FROM school_rules ORDER BY name ASC'
  );
  return rows;
}

async function create({ name, description, is_active = 1 }) {
  const [result] = await pool.execute(
    'INSERT INTO school_rules (name, description, is_active) VALUES (?, ?, ?)',
    [name, description || null, is_active ? 1 : 0]
  );
  return findById(result.insertId);
}

async function update(id, fields) {
  const allowed = ['name', 'description', 'is_active'];
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k) || v === undefined) continue;
    sets.push(`${k} = ?`);
    values.push(k === 'is_active' ? (v ? 1 : 0) : v);
  }
  if (!sets.length) return findById(id);
  values.push(id);
  await pool.execute(`UPDATE school_rules SET ${sets.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

async function deleteById(id) {
  const [result] = await pool.execute('DELETE FROM school_rules WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findAllAdmin, create, update, deleteById };
