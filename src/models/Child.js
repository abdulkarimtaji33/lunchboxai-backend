'use strict';

const { pool } = require('../config/database');

async function create({ userId, name, age, dislikes, schoolRules, nutritionGoal, calorieTarget, proteinTarget }) {
  const [result] = await pool.execute(
    `INSERT INTO children (user_id, name, age, dislikes, school_rules, nutrition_goal, calorie_target, protein_target)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, name, age || null, dislikes || null, schoolRules || null,
     nutritionGoal || 'balanced', calorieTarget || null, proteinTarget || null]
  );
  return result.insertId;
}

async function findByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT c.*,
       JSON_ARRAYAGG(
         IF(ca.allergen_id IS NULL, NULL,
           JSON_OBJECT('id', a.id, 'name', a.name, 'category', a.category,
                       'severity', ca.severity, 'notes', ca.notes)
         )
       ) AS allergens
     FROM children c
     LEFT JOIN child_allergens ca ON ca.child_id = c.id
     LEFT JOIN allergens a        ON a.id = ca.allergen_id
     WHERE c.user_id = ?
     GROUP BY c.id
     ORDER BY c.created_at ASC`,
    [userId]
  );
  return rows.map(normalizeChild);
}

async function findByIdAndUser(id, userId) {
  const [rows] = await pool.execute(
    `SELECT c.*,
       JSON_ARRAYAGG(
         IF(ca.allergen_id IS NULL, NULL,
           JSON_OBJECT('id', a.id, 'name', a.name, 'category', a.category,
                       'severity', ca.severity, 'notes', ca.notes)
         )
       ) AS allergens
     FROM children c
     LEFT JOIN child_allergens ca ON ca.child_id = c.id
     LEFT JOIN allergens a        ON a.id = ca.allergen_id
     WHERE c.id = ? AND c.user_id = ?
     GROUP BY c.id`,
    [id, userId]
  );
  return rows[0] ? normalizeChild(rows[0]) : null;
}

async function update(id, fields) {
  const allowed = ['name','age','dislikes','school_rules','nutrition_goal','calorie_target','protein_target'];
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
  await pool.execute(`UPDATE children SET ${sets.join(', ')} WHERE id = ?`, values);
}

async function deleteById(id) {
  await pool.execute('DELETE FROM children WHERE id = ?', [id]);
}

async function addAllergen(childId, allergenId, severity, notes) {
  await pool.execute(
    `INSERT INTO child_allergens (child_id, allergen_id, severity, notes) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE severity = VALUES(severity), notes = VALUES(notes)`,
    [childId, allergenId, severity || 'allergy', notes || null]
  );
}

async function removeAllergen(childId, allergenId) {
  await pool.execute(
    'DELETE FROM child_allergens WHERE child_id = ? AND allergen_id = ?',
    [childId, allergenId]
  );
}

async function getAllergens(childId) {
  const [rows] = await pool.execute(
    `SELECT a.id, a.name, a.category, ca.severity, ca.notes
     FROM child_allergens ca
     JOIN allergens a ON a.id = ca.allergen_id
     WHERE ca.child_id = ?
     ORDER BY a.name ASC`,
    [childId]
  );
  return rows;
}

function normalizeChild(row) {
  let allergens = [];
  try {
    const parsed = typeof row.allergens === 'string' ? JSON.parse(row.allergens) : row.allergens;
    allergens = (parsed || []).filter(Boolean);
  } catch {
    allergens = [];
  }
  return { ...row, allergens };
}

module.exports = { create, findByUser, findByIdAndUser, update, deleteById, addAllergen, removeAllergen, getAllergens };
