'use strict';

const pool = require('../config/database');

async function findByChild(childId) {
  const [rows] = await pool.execute(
    `SELECT cl.*, (c.default_lunchbox_id = cl.id) AS is_default
     FROM child_lunchboxes cl
     JOIN children c ON c.id = cl.child_id
     WHERE cl.child_id = ?
     ORDER BY cl.created_at DESC`,
    [childId]
  );
  return rows.map(r => ({ ...r, is_default: !!r.is_default }));
}

async function create(childId, imagePath, label) {
  const [result] = await pool.execute(
    'INSERT INTO child_lunchboxes (child_id, image_path, label) VALUES (?, ?, ?)',
    [childId, imagePath, label || null]
  );
  return result.insertId;
}

async function findById(id) {
  const [[row]] = await pool.execute(
    'SELECT * FROM child_lunchboxes WHERE id = ?',
    [id]
  );
  return row || null;
}

async function deleteById(id) {
  await pool.execute('DELETE FROM child_lunchboxes WHERE id = ?', [id]);
}

async function setDefault(childId, lunchboxId) {
  await pool.execute(
    'UPDATE children SET default_lunchbox_id = ? WHERE id = ?',
    [lunchboxId || null, childId]
  );
}

async function clearDefault(childId) {
  await pool.execute(
    'UPDATE children SET default_lunchbox_id = NULL WHERE id = ?',
    [childId]
  );
}

module.exports = { findByChild, create, findById, deleteById, setDefault, clearDefault };
