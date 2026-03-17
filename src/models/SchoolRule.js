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
    'SELECT id, name, description FROM school_rules WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById };
