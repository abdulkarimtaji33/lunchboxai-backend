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

module.exports = { findAll, findById };
