'use strict';

const pool = require('../config/database');

async function create({ userId, name, dateOfBirth, avatarId }) {
  const [result] = await pool.execute(
    `INSERT INTO children (user_id, name, date_of_birth, avatar_id)
     VALUES (?, ?, ?, ?)`,
    [userId, name, dateOfBirth || null, avatarId || null]
  );
  return result.insertId;
}

async function findByUser(userId) {
  const [rows] = await pool.execute(
    `SELECT c.*,
       av.name AS avatar_name, av.filename AS avatar_filename,
       JSON_ARRAYAGG(
         IF(ca.allergen_id IS NULL, NULL,
           JSON_OBJECT('id', a.id, 'name', a.name, 'category', a.category,
                       'severity', ca.severity, 'notes', ca.notes)
         )
       ) AS allergens,
       JSON_ARRAYAGG(
         IF(csr.school_rule_id IS NULL, NULL,
           JSON_OBJECT('id', sr.id, 'name', sr.name, 'description', sr.description)
         )
       ) AS school_rules
     FROM children c
     LEFT JOIN avatars av          ON av.id = c.avatar_id
     LEFT JOIN child_allergens ca  ON ca.child_id = c.id
     LEFT JOIN allergens a         ON a.id = ca.allergen_id
     LEFT JOIN child_school_rules csr ON csr.child_id = c.id
     LEFT JOIN school_rules sr     ON sr.id = csr.school_rule_id
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
       av.name AS avatar_name, av.filename AS avatar_filename,
       JSON_ARRAYAGG(
         IF(ca.allergen_id IS NULL, NULL,
           JSON_OBJECT('id', a.id, 'name', a.name, 'category', a.category,
                       'severity', ca.severity, 'notes', ca.notes)
         )
       ) AS allergens,
       JSON_ARRAYAGG(
         IF(csr.school_rule_id IS NULL, NULL,
           JSON_OBJECT('id', sr.id, 'name', sr.name, 'description', sr.description)
         )
       ) AS school_rules
     FROM children c
     LEFT JOIN avatars av          ON av.id = c.avatar_id
     LEFT JOIN child_allergens ca  ON ca.child_id = c.id
     LEFT JOIN allergens a         ON a.id = ca.allergen_id
     LEFT JOIN child_school_rules csr ON csr.child_id = c.id
     LEFT JOIN school_rules sr     ON sr.id = csr.school_rule_id
     WHERE c.id = ? AND c.user_id = ?
     GROUP BY c.id`,
    [id, userId]
  );
  return rows[0] ? normalizeChild(rows[0]) : null;
}

async function update(id, fields) {
  const allowed = ['name', 'date_of_birth', 'avatar_id'];
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

async function setSchoolRules(childId, schoolRuleIds) {
  await pool.execute('DELETE FROM child_school_rules WHERE child_id = ?', [childId]);
  if (schoolRuleIds && schoolRuleIds.length) {
    const placeholders = schoolRuleIds.map(() => '(?, ?)').join(', ');
    const values = schoolRuleIds.flatMap(id => [childId, id]);
    await pool.execute(
      `INSERT IGNORE INTO child_school_rules (child_id, school_rule_id) VALUES ${placeholders}`,
      values
    );
  }
}

function normalizeChild(row) {
  let allergens = [];
  try {
    const parsed = typeof row.allergens === 'string' ? JSON.parse(row.allergens) : row.allergens;
    allergens = (parsed || []).filter(Boolean);
  } catch {
    allergens = [];
  }

  let school_rules = [];
  try {
    const parsed = typeof row.school_rules === 'string' ? JSON.parse(row.school_rules) : row.school_rules;
    school_rules = (parsed || []).filter(Boolean);
  } catch {
    school_rules = [];
  }

  const { avatar_name, avatar_filename, ...rest } = row;
  const avatar = row.avatar_id
    ? { id: row.avatar_id, name: avatar_name, filename: avatar_filename }
    : null;

  return { ...rest, school_rules, allergens, avatar };
}

module.exports = { create, findByUser, findByIdAndUser, update, deleteById, addAllergen, removeAllergen, getAllergens, setSchoolRules };
