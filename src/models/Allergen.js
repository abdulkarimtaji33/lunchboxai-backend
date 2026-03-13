'use strict';

const { pool } = require('../config/database');

async function findAll() {
  const [rows] = await pool.execute(
    'SELECT id, name, category, description, is_common FROM allergens ORDER BY is_common DESC, name ASC'
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, name, category, description, is_common FROM allergens WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById };
