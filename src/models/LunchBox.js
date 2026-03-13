'use strict';

const { pool } = require('../config/database');

async function createSession(conn, { userId, childId, lunchboxImagePath, notes, dislikesOverride,
  schoolRulesOverride, prepTimeMinutes, nutritionGoalOverride }) {
  const [result] = await conn.execute(
    `INSERT INTO lunchbox_sessions
       (user_id, child_id, lunchbox_image_path, notes, dislikes_override,
        school_rules_override, prep_time_minutes, nutrition_goal_override, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, childId || null, lunchboxImagePath, notes || null, dislikesOverride || null,
     schoolRulesOverride || null, prepTimeMinutes || null, nutritionGoalOverride || null]
  );
  return result.insertId;
}

async function insertIngredientImages(conn, sessionId, imagePaths) {
  for (const imgPath of imagePaths) {
    await conn.execute(
      'INSERT INTO ingredient_images (session_id, image_path) VALUES (?, ?)',
      [sessionId, imgPath]
    );
  }
}

async function insertSessionAllergenOverrides(conn, sessionId, allergenIds) {
  for (const allergenId of allergenIds) {
    await conn.execute(
      'INSERT IGNORE INTO session_allergen_overrides (session_id, allergen_id) VALUES (?, ?)',
      [sessionId, allergenId]
    );
  }
}

async function updateStatus(conn, sessionId, status) {
  const db = conn || pool;
  await db.execute(
    'UPDATE lunchbox_sessions SET status = ? WHERE id = ?',
    [status, sessionId]
  );
}

async function attachResult(conn, sessionId, {
  aiTextResponse, suggestedItems, nutritionNotes, arrangementDesc,
  funNote, generatedImageB64, generatedImagePath, aiModel, tokensUsed, processingMs,
}) {
  await conn.execute(
    `INSERT INTO lunchbox_results
       (session_id, ai_text_response, suggested_items, nutrition_notes, arrangement_desc,
        fun_note, generated_image_b64, generated_image_path, ai_model, tokens_used, processing_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      aiTextResponse,
      suggestedItems ? JSON.stringify(suggestedItems) : null,
      nutritionNotes    || null,
      arrangementDesc   || null,
      funNote           || null,
      generatedImageB64 || null,
      generatedImagePath|| null,
      aiModel           || null,
      tokensUsed        || null,
      processingMs      || null,
    ]
  );
}

async function findByUser(userId, { page, limit, offset, childId }) {
  const conditions = ['s.user_id = ?'];
  const params     = [userId];

  if (childId) {
    conditions.push('s.child_id = ?');
    params.push(childId);
  }

  const where = conditions.join(' AND ');

  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM lunchbox_sessions s WHERE ${where}`,
    params
  );

  const [rows] = await pool.execute(
    `SELECT s.*, c.name AS child_name,
       r.suggested_items, r.nutrition_notes, r.fun_note, r.generated_image_path
     FROM lunchbox_sessions s
     LEFT JOIN children c        ON c.id = s.child_id
     LEFT JOIN lunchbox_results r ON r.session_id = s.id
     WHERE ${where}
     ORDER BY s.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { rows: rows.map(normalizeSession), total, page, limit };
}

async function findByIdAndUser(sessionId, userId) {
  const [rows] = await pool.execute(
    `SELECT s.*, c.name AS child_name
     FROM lunchbox_sessions s
     LEFT JOIN children c ON c.id = s.child_id
     WHERE s.id = ? AND s.user_id = ?`,
    [sessionId, userId]
  );
  if (!rows[0]) return null;

  const session = rows[0];

  const [ingredients] = await pool.execute(
    'SELECT id, image_path, label FROM ingredient_images WHERE session_id = ?',
    [sessionId]
  );

  const [results] = await pool.execute(
    `SELECT id, ai_text_response, suggested_items, nutrition_notes, arrangement_desc,
            fun_note, generated_image_b64, generated_image_path, ai_model, tokens_used, processing_ms, created_at
     FROM lunchbox_results WHERE session_id = ?`,
    [sessionId]
  );

  return {
    ...normalizeSession(session),
    ingredients,
    result: results[0] ? normalizeResult(results[0]) : null,
  };
}

async function getFilePaths(sessionId) {
  const [[session]] = await pool.execute(
    'SELECT lunchbox_image_path FROM lunchbox_sessions WHERE id = ?',
    [sessionId]
  );
  const [ingredients] = await pool.execute(
    'SELECT image_path FROM ingredient_images WHERE session_id = ?',
    [sessionId]
  );
  const [results] = await pool.execute(
    'SELECT generated_image_path FROM lunchbox_results WHERE session_id = ?',
    [sessionId]
  );

  return [
    session?.lunchbox_image_path,
    ...ingredients.map(r => r.image_path),
    ...results.map(r => r.generated_image_path),
  ].filter(Boolean);
}

async function resolveAllergens(childId, sessionId) {
  const [childRows] = await pool.execute(
    `SELECT a.name, ca.severity
     FROM child_allergens ca
     JOIN allergens a ON a.id = ca.allergen_id
     WHERE ca.child_id = ?`,
    [childId || 0]
  );

  const [overrideRows] = await pool.execute(
    `SELECT a.name, 'allergy' AS severity
     FROM session_allergen_overrides sao
     JOIN allergens a ON a.id = sao.allergen_id
     WHERE sao.session_id = ?`,
    [sessionId]
  );

  const seen = new Set();
  const merged = [];
  for (const r of [...childRows, ...overrideRows]) {
    if (!seen.has(r.name)) {
      seen.add(r.name);
      merged.push(r);
    }
  }
  return merged;
}

async function deleteById(sessionId) {
  await pool.execute('DELETE FROM lunchbox_sessions WHERE id = ?', [sessionId]);
}

function normalizeSession(row) {
  if (row.suggested_items && typeof row.suggested_items === 'string') {
    try { row.suggested_items = JSON.parse(row.suggested_items); } catch { row.suggested_items = null; }
  }
  return row;
}

function normalizeResult(row) {
  if (row.suggested_items && typeof row.suggested_items === 'string') {
    try { row.suggested_items = JSON.parse(row.suggested_items); } catch { row.suggested_items = null; }
  }
  return row;
}

module.exports = {
  createSession, insertIngredientImages, insertSessionAllergenOverrides,
  updateStatus, attachResult, findByUser, findByIdAndUser,
  getFilePaths, resolveAllergens, deleteById,
};
