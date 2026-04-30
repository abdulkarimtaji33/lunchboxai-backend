'use strict';

const pool = require('../config/database');
const { buildPublicFileUrl } = require('../services/imageService');

function normalize(row) {
  row.image_url = buildPublicFileUrl(row.image_path) || null;
  // keep image_path on the object — controllers need it to locate the file on disk
  return row;
}

async function findAll() {
  const [rows] = await pool.execute(
    `SELECT id, name, description, container_type, compartments, image_path, tags, sort_order
     FROM base_lunchboxes WHERE is_active = 1 ORDER BY sort_order ASC`
  );
  return rows.map(normalize);
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, description, container_type, compartments, image_path, tags, sort_order
     FROM base_lunchboxes WHERE id = ? AND is_active = 1`,
    [id]
  );
  return rows[0] ? normalize(rows[0]) : null;
}

async function findAllAdmin() {
  const [rows] = await pool.execute(
    `SELECT id, name, description, container_type, compartments, image_path, tags, sort_order, is_active
     FROM base_lunchboxes ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(normalize);
}

async function findByIdAdmin(id) {
  const [rows] = await pool.execute(
    `SELECT id, name, description, container_type, compartments, image_path, tags, sort_order, is_active
     FROM base_lunchboxes WHERE id = ?`,
    [id]
  );
  return rows[0] ? normalize(rows[0]) : null;
}

async function create(row) {
  const {
    name, description, container_type, compartments, image_path, tags, sort_order, is_active = 1,
  } = row;
  const [result] = await pool.execute(
    `INSERT INTO base_lunchboxes (name, description, container_type, compartments, image_path, tags, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      description || null,
      container_type || null,
      compartments ?? 1,
      image_path || null,
      tags || null,
      sort_order ?? 0,
      is_active ? 1 : 0,
    ]
  );
  return findByIdAdmin(result.insertId);
}

async function update(id, fields) {
  const allowed = ['name', 'description', 'container_type', 'compartments', 'image_path', 'tags', 'sort_order', 'is_active'];
  const sets = [];
  const values = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.includes(k) || v === undefined) continue;
    sets.push(`${k} = ?`);
    values.push(k === 'is_active' ? (v ? 1 : 0) : v);
  }
  if (!sets.length) return findByIdAdmin(id);
  values.push(id);
  await pool.execute(`UPDATE base_lunchboxes SET ${sets.join(', ')} WHERE id = ?`, values);
  return findByIdAdmin(id);
}

async function deleteById(id) {
  const [result] = await pool.execute('DELETE FROM base_lunchboxes WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, findAllAdmin, findByIdAdmin, create, update, deleteById };
