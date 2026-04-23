'use strict';

const pool = require('../config/database');

function normalize(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    generations: row.generations,
    price_usd: Number(row.price_usd),
    stripe_price_id: row.stripe_price_id,
    stripe_lookup_key: row.stripe_lookup_key,
    is_active: Boolean(row.is_active),
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function listActiveForBilling() {
  const [rows] = await pool.execute(
    `SELECT * FROM subscription_packages WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`
  );
  return rows;
}

async function listAll() {
  const [rows] = await pool.execute(
    `SELECT * FROM subscription_packages ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(normalize);
}

async function findById(id) {
  const [rows] = await pool.execute('SELECT * FROM subscription_packages WHERE id = ?', [id]);
  return normalize(rows[0]);
}

async function findBySlug(slug) {
  const [rows] = await pool.execute(
    'SELECT * FROM subscription_packages WHERE slug = ? AND is_active = 1',
    [slug]
  );
  return normalize(rows[0]);
}

async function slugExists(slug, excludeId = null) {
  const [rows] = excludeId
    ? await pool.execute('SELECT id FROM subscription_packages WHERE slug = ? AND id != ?', [slug, excludeId])
    : await pool.execute('SELECT id FROM subscription_packages WHERE slug = ?', [slug]);
  return rows.length > 0;
}

async function create({ slug, label, generations, price_usd, sort_order }) {
  const lookup = `lunchboxai_pkg_${slug}_${Date.now()}`;
  const [result] = await pool.execute(
    `INSERT INTO subscription_packages
      (slug, label, generations, price_usd, stripe_lookup_key, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [slug, label, generations, price_usd, lookup, sort_order ?? 0]
  );
  return result.insertId;
}

async function update(id, fields) {
  const allowed = new Set([
    'label', 'generations', 'price_usd', 'is_active', 'sort_order',
    'stripe_price_id', 'stripe_lookup_key', 'slug',
  ]);
  const sets = [];
  const vals = [];
  for (const [k, v] of Object.entries(fields)) {
    if (!allowed.has(k) || v === undefined) continue;
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return false;
  vals.push(id);
  const [result] = await pool.execute(
    `UPDATE subscription_packages SET ${sets.join(', ')} WHERE id = ?`,
    vals
  );
  return result.affectedRows > 0;
}

async function setStripePriceId(id, stripePriceId) {
  await pool.execute(
    'UPDATE subscription_packages SET stripe_price_id = ? WHERE id = ?',
    [stripePriceId || null, id]
  );
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM subscription_packages WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  listActiveForBilling,
  listAll,
  findById,
  findBySlug,
  slugExists,
  create,
  update,
  setStripePriceId,
  remove,
  normalize,
};
