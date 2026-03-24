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
  const [children] = await pool.execute(
    `SELECT c.*, av.name AS avatar_name, av.filename AS avatar_filename
     FROM children c
     LEFT JOIN avatars av ON av.id = c.avatar_id
     WHERE c.user_id = ?
     ORDER BY c.created_at ASC`,
    [userId]
  );
  if (!children.length) return [];
  return attachRelations(children);
}

async function findByIdAndUser(id, userId) {
  const [rows] = await pool.execute(
    `SELECT c.*, av.name AS avatar_name, av.filename AS avatar_filename
     FROM children c
     LEFT JOIN avatars av ON av.id = c.avatar_id
     WHERE c.id = ? AND c.user_id = ?`,
    [id, userId]
  );
  if (!rows[0]) return null;
  const [child] = await attachRelations(rows);
  return child;
}

// Attach allergens + school_rules to a list of children via separate queries
async function attachRelations(children) {
  const ids = children.map(c => c.id);
  const placeholders = ids.map(() => '?').join(',');

  const [allergenRows] = await pool.execute(
    `SELECT ca.child_id, a.id, a.name, a.icon, a.category, ca.severity, ca.notes
     FROM child_allergens ca
     JOIN allergens a ON a.id = ca.allergen_id
     WHERE ca.child_id IN (${placeholders})
     ORDER BY a.name ASC`,
    ids
  );

  const [ruleRows] = await pool.execute(
    `SELECT csr.child_id, sr.id, sr.name, sr.description
     FROM child_school_rules csr
     JOIN school_rules sr ON sr.id = csr.school_rule_id
     WHERE csr.child_id IN (${placeholders})
     ORDER BY sr.name ASC`,
    ids
  );

  // Index by child_id
  const allergenMap = {};
  for (const r of allergenRows) {
    if (!allergenMap[r.child_id]) allergenMap[r.child_id] = [];
    allergenMap[r.child_id].push({ id: r.id, name: r.name, icon: r.icon, category: r.category, severity: r.severity, notes: r.notes });
  }
  const ruleMap = {};
  for (const r of ruleRows) {
    if (!ruleMap[r.child_id]) ruleMap[r.child_id] = [];
    ruleMap[r.child_id].push({ id: r.id, name: r.name, description: r.description });
  }

  return children.map(row => normalizeChild(row, allergenMap[row.id] || [], ruleMap[row.id] || []));
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
    `SELECT a.id, a.name, a.icon, a.category, ca.severity, ca.notes
     FROM child_allergens ca
     JOIN allergens a ON a.id = ca.allergen_id
     WHERE ca.child_id = ?
     ORDER BY a.name ASC`,
    [childId]
  );
  return rows;
}

async function setAllergens(childId, allergenList) {
  await pool.execute('DELETE FROM child_allergens WHERE child_id = ?', [childId]);
  if (allergenList && allergenList.length) {
    const placeholders = allergenList.map(() => '(?, ?, ?, ?)').join(', ');
    const values = allergenList.flatMap(item => [childId, item.allergen_id, item.severity || 'allergy', item.notes || null]);
    await pool.execute(
      `INSERT INTO child_allergens (child_id, allergen_id, severity, notes) VALUES ${placeholders}`,
      values
    );
  }
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

function normalizeChild(row, allergens, school_rules) {
  const { avatar_name, avatar_filename, ...rest } = row;
  const avatar = row.avatar_id
    ? { id: row.avatar_id, name: avatar_name, filename: avatar_filename }
    : null;
  return { ...rest, allergens, school_rules, avatar };
}

module.exports = { create, findByUser, findByIdAndUser, update, deleteById, addAllergen, removeAllergen, getAllergens, setAllergens, setSchoolRules };
