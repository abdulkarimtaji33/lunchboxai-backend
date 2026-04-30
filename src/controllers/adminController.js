'use strict';

const path = require('path');
const pool = require('../config/database');
const Child = require('../models/Child');
const LunchBox = require('../models/LunchBox');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const { invalidateBillingCache } = require('../config/billing');
const { formatResponse, formatError, paginate } = require('../utils/helpers');
const { buildPublicFileUrl } = require('../services/imageService');

function buildDateWhere(alias, from, to) {
  const conditions = [];
  const params = [];
  const col = alias ? `${alias}.created_at` : 'created_at';
  if (from && String(from).trim()) {
    conditions.push(`${col} >= ?`);
    params.push(`${String(from).trim()} 00:00:00`);
  }
  if (to && String(to).trim()) {
    conditions.push(`${col} <= ?`);
    params.push(`${String(to).trim()} 23:59:59`);
  }
  return { conditions, params };
}

async function stats(req, res, next) {
  try {
    const { from, to, recentStatus } = req.query;
    const f = from && String(from).trim();
    const t = to && String(to).trim();
    const hasDateFilter = !!(f || t);

    const sDate = buildDateWhere('s', from, to);
    const uDate = buildDateWhere('u', from, to);
    const cDate = buildDateWhere('c', from, to);
    const stripeDate = buildDateWhere('', from, to);

    const sessionWhereSql = sDate.conditions.length ? `WHERE ${sDate.conditions.join(' AND ')}` : '';
    const sessionWhereAnd = sDate.conditions.length ? `AND ${sDate.conditions.join(' AND ')}` : '';

    const [[u]] = await pool.execute(
      hasDateFilter
        ? `SELECT COUNT(*) AS c FROM users u ${uDate.conditions.length ? `WHERE ${uDate.conditions.join(' AND ')}` : ''}`
        : 'SELECT COUNT(*) AS c FROM users',
      uDate.params
    );

    const [[s]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM lunchbox_sessions s ${sessionWhereSql}`,
      sDate.params
    );

    const [[done]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM lunchbox_sessions s WHERE s.status = 'completed' ${sessionWhereAnd}`,
      sDate.params
    );

    const [[ch]] = await pool.execute(
      hasDateFilter
        ? `SELECT COUNT(*) AS c FROM children c ${cDate.conditions.length ? `WHERE ${cDate.conditions.join(' AND ')}` : ''}`
        : 'SELECT COUNT(*) AS c FROM children',
      cDate.params
    );

    const [[failed]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM lunchbox_sessions s WHERE s.status = 'failed' ${sessionWhereAnd}`,
      sDate.params
    );

    const [[pending]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM lunchbox_sessions s WHERE s.status IN ('pending','processing') ${sessionWhereAnd}`,
      sDate.params
    );

    let active7;
    if (hasDateFilter) {
      const [[a]] = await pool.execute(
        `SELECT COUNT(DISTINCT s.user_id) AS c FROM lunchbox_sessions s ${sessionWhereSql}`,
        sDate.params
      );
      active7 = a;
    } else {
      const [[a]] = await pool.execute(
        `SELECT COUNT(DISTINCT user_id) AS c FROM lunchbox_sessions WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
      active7 = a;
    }

    const [[credits]] = await pool.execute(
      'SELECT COALESCE(SUM(generation_credits), 0) AS total FROM users'
    );

    const stripeWhere = stripeDate.conditions.length
      ? `WHERE ${stripeDate.conditions.join(' AND ')}`
      : '';
    const [[stripeCount]] = await pool.execute(
      `SELECT COUNT(*) AS c FROM stripe_processed_events ${stripeWhere}`,
      stripeDate.params
    );

    const recentConds = [...sDate.conditions];
    const recentParams = [...sDate.params];
    if (recentStatus && ['pending', 'processing', 'completed', 'failed'].includes(String(recentStatus))) {
      recentConds.push('s.status = ?');
      recentParams.push(String(recentStatus));
    }
    const recentWhere = recentConds.length ? `WHERE ${recentConds.join(' AND ')}` : '';
    const recentLimit = hasDateFilter || recentStatus ? 25 : 5;

    const [recentRows] = await pool.execute(
      `SELECT s.id, s.status, s.created_at, u.name AS user_name, u.email AS user_email
       FROM lunchbox_sessions s
       JOIN users u ON u.id = s.user_id
       ${recentWhere}
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [...recentParams, recentLimit]
    );

    res.json(
      formatResponse({
        users: u.c,
        lunchboxSessions: s.c,
        completedGenerations: done.c,
        children: ch.c,
        failedGenerations: failed.c,
        pendingGenerations: pending.c,
        activeUsersLast7Days: active7.c,
        activeUsersLabel: hasDateFilter ? 'period' : '7d',
        creditsInCirculation: Number(credits.total) || 0,
        stripeEventsProcessed: stripeCount.c,
        recentSessions: recentRows,
      })
    );
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page, limit, q, is_admin, provider, from, to } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);
    const conditions = [];
    const params = [];

    if (q && String(q).trim()) {
      const t = `%${String(q).trim()}%`;
      conditions.push('(u.email LIKE ? OR u.name LIKE ?)');
      params.push(t, t);
    }
    if (is_admin === '1' || is_admin === '0') {
      conditions.push('u.is_admin = ?');
      params.push(Number(is_admin));
    }
    if (provider && String(provider).trim()) {
      conditions.push('u.provider = ?');
      params.push(String(provider).trim());
    }
    if (from && String(from).trim()) {
      conditions.push('u.created_at >= ?');
      params.push(`${String(from).trim()} 00:00:00`);
    }
    if (to && String(to).trim()) {
      conditions.push('u.created_at <= ?');
      params.push(`${String(to).trim()} 23:59:59`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM users u ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.name, u.provider, u.generation_credits, u.is_admin, u.created_at,
        (SELECT COUNT(*) FROM lunchbox_sessions s WHERE s.user_id = u.id) AS session_count,
        (SELECT COUNT(*) FROM children c WHERE c.user_id = u.id) AS child_count
       FROM users u
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, l, offset]
    );

    res.json(
      formatResponse({
        users: rows,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
      })
    );
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      `SELECT id, email, name, provider, avatar_url, generation_credits, is_admin, created_at
       FROM users WHERE id = ?`,
      [id]
    );
    if (!rows[0]) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    const children = await Child.findByUser(id);
    res.json(formatResponse({ user: rows[0], children }));
  } catch (err) {
    next(err);
  }
}

function parseJsonMaybe(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

async function listGenerations(req, res, next) {
  try {
    const { page, limit, q, userId, childId, status, from, to } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);
    const conditions = [];
    const params = [];

    if (userId) {
      conditions.push('s.user_id = ?');
      params.push(parseInt(userId, 10));
    }
    if (childId) {
      conditions.push('s.child_id = ?');
      params.push(parseInt(childId, 10));
    }
    if (status && ['pending', 'processing', 'completed', 'failed'].includes(status)) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    if (from && String(from).trim()) {
      conditions.push('s.created_at >= ?');
      params.push(`${String(from).trim()} 00:00:00`);
    }
    if (to && String(to).trim()) {
      conditions.push('s.created_at <= ?');
      params.push(`${String(to).trim()} 23:59:59`);
    }
    if (q && String(q).trim()) {
      const t = `%${String(q).trim()}%`;
      conditions.push('(u.email LIKE ? OR u.name LIKE ? OR c.name LIKE ? OR s.notes LIKE ?)');
      params.push(t, t, t, t);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM lunchbox_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN children c ON c.id = s.child_id
       ${where}`,
      params
    );

    const [sessions] = await pool.execute(
      `SELECT s.id, s.user_id, s.child_id, s.status, s.notes, s.dislikes_override,
        s.school_rules_override, s.prep_time_minutes, s.nutrition_goal_override, s.planned_at,
        s.created_at, s.updated_at, s.error_message,
        u.email AS user_email, u.name AS user_name,
        c.name AS child_name, c.date_of_birth AS child_dob,
        r.ai_model, r.processing_ms, r.suggested_items, r.cooking_ingredients, r.generated_image_path,
        (SELECT GROUP_CONCAT(a.name ORDER BY a.name SEPARATOR ', ')
         FROM session_allergen_overrides sao
         JOIN allergens a ON a.id = sao.allergen_id
         WHERE sao.session_id = s.id) AS allergen_override_csv,
        (SELECT COUNT(*) FROM ingredient_images ii WHERE ii.session_id = s.id) AS ingredient_count
       FROM lunchbox_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN children c ON c.id = s.child_id
       LEFT JOIN lunchbox_results r ON r.session_id = s.id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, l, offset]
    );

    const normalized = sessions.map((row) => ({
      ...row,
      suggested_items: parseJsonMaybe(row.suggested_items),
      cooking_ingredients: parseJsonMaybe(row.cooking_ingredients),
      generated_image_url: row.generated_image_path
        ? buildPublicFileUrl(row.generated_image_path)
        : null,
      allergen_overrides: row.allergen_override_csv
        ? row.allergen_override_csv.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }));

    res.json(
      formatResponse({
        sessions: normalized,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
      })
    );
  } catch (err) {
    next(err);
  }
}

async function getGeneration(req, res, next) {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const [rows] = await pool.execute(
      `SELECT s.*, u.email AS user_email, u.name AS user_name,
        c.name AS child_name, c.date_of_birth AS child_dob
       FROM lunchbox_sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN children c ON c.id = s.child_id
       WHERE s.id = ?`,
      [sessionId]
    );
    if (!rows[0]) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));

    const base = rows[0];
    const [ingredients] = await pool.execute(
      'SELECT id, image_path, label, created_at FROM ingredient_images WHERE session_id = ?',
      [sessionId]
    );
    const [allergenRows] = await pool.execute(
      `SELECT a.id, a.name, a.category
       FROM session_allergen_overrides sao
       JOIN allergens a ON a.id = sao.allergen_id
       WHERE sao.session_id = ?`,
      [sessionId]
    );
    const session = await LunchBox.findByIdAsAdmin(sessionId);
    res.json(
      formatResponse({
        session: {
          ...base,
          ingredients: ingredients.map((i) => ({
            ...i,
            image_url: buildPublicFileUrl(i.image_path),
          })),
          lunchbox_image_url: base.lunchbox_image_path
            ? buildPublicFileUrl(base.lunchbox_image_path)
            : null,
          allergen_overrides: allergenRows,
          result: session?.result || null,
        },
      })
    );
  } catch (err) {
    next(err);
  }
}

const SLUG_RE = /^[a-z][a-z0-9_]{0,47}$/;

function normalizeSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

async function listSubscriptionPackages(req, res, next) {
  try {
    const packs = await SubscriptionPackage.listAll();
    res.json(formatResponse({ packages: packs }));
  } catch (err) {
    next(err);
  }
}

async function createSubscriptionPackage(req, res, next) {
  try {
    const slug = normalizeSlug(req.body.slug);
    if (!SLUG_RE.test(slug)) {
      return res.status(400).json(formatError('Invalid slug (lowercase letters, numbers, underscore)', 'VALIDATION_ERROR'));
    }
    if (await SubscriptionPackage.slugExists(slug)) {
      return res.status(409).json(formatError('Slug already exists', 'DUPLICATE'));
    }
    const label = String(req.body.label || '').trim();
    if (!label) return res.status(400).json(formatError('label is required', 'VALIDATION_ERROR'));
    const generations = Math.max(1, parseInt(req.body.generations, 10) || 0);
    if (!generations) return res.status(400).json(formatError('generations must be a positive integer', 'VALIDATION_ERROR'));
    const priceUsd = Math.max(0.5, Number(req.body.price_usd));
    if (!Number.isFinite(priceUsd)) {
      return res.status(400).json(formatError('price_usd must be a number', 'VALIDATION_ERROR'));
    }
    const sort_order = parseInt(req.body.sort_order, 10);
    const id = await SubscriptionPackage.create({
      slug,
      label,
      generations,
      price_usd: priceUsd,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
    });
    invalidateBillingCache();
    const created = await SubscriptionPackage.findById(id);
    res.status(201).json(formatResponse({ package: created }));
  } catch (err) {
    next(err);
  }
}

async function updateSubscriptionPackage(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await SubscriptionPackage.findById(id);
    if (!row) return res.status(404).json(formatError('Package not found', 'NOT_FOUND'));

    const updates = {};
    if (req.body.label !== undefined) {
      const label = String(req.body.label || '').trim();
      if (!label) return res.status(400).json(formatError('label cannot be empty', 'VALIDATION_ERROR'));
      updates.label = label;
    }
    if (req.body.generations !== undefined) {
      const g = Math.max(1, parseInt(req.body.generations, 10) || 0);
      if (!g) return res.status(400).json(formatError('invalid generations', 'VALIDATION_ERROR'));
      updates.generations = g;
    }
    if (req.body.price_usd !== undefined) {
      const p = Number(req.body.price_usd);
      if (!Number.isFinite(p) || p < 0.5) {
        return res.status(400).json(formatError('price_usd must be at least 0.50', 'VALIDATION_ERROR'));
      }
      updates.price_usd = p;
    }
    if (req.body.is_active !== undefined) {
      updates.is_active = req.body.is_active ? 1 : 0;
    }
    if (req.body.sort_order !== undefined) {
      updates.sort_order = parseInt(req.body.sort_order, 10) || 0;
    }
    if (req.body.slug !== undefined) {
      const slug = normalizeSlug(req.body.slug);
      if (!SLUG_RE.test(slug)) {
        return res.status(400).json(formatError('Invalid slug', 'VALIDATION_ERROR'));
      }
      if (await SubscriptionPackage.slugExists(slug, id)) {
        return res.status(409).json(formatError('Slug already exists', 'DUPLICATE'));
      }
      updates.slug = slug;
    }

    const manualStripeId = req.body.stripe_price_id !== undefined
      ? (String(req.body.stripe_price_id || '').trim() || null)
      : undefined;

    const priceChanged = updates.price_usd !== undefined && Number(updates.price_usd) !== row.price_usd;
    const genChanged = updates.generations !== undefined && updates.generations !== row.generations;
    const slugChanged = updates.slug !== undefined && updates.slug !== row.slug;
    const forceStripe = req.body.regenerate_stripe_price === true || req.body.regenerate_stripe_price === 'true';

    if (forceStripe || priceChanged || genChanged || slugChanged) {
      updates.stripe_price_id = null;
      updates.stripe_lookup_key = `lunchboxai_pkg_${id}_${Date.now()}`;
    } else if (manualStripeId !== undefined) {
      updates.stripe_price_id = manualStripeId;
    }

    if (!Object.keys(updates).length) {
      return res.json(formatResponse({ package: row }));
    }

    await SubscriptionPackage.update(id, updates);
    invalidateBillingCache();
    const updated = await SubscriptionPackage.findById(id);
    res.json(formatResponse({ package: updated }));
  } catch (err) {
    next(err);
  }
}

async function deleteSubscriptionPackage(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const ok = await SubscriptionPackage.remove(id);
    if (!ok) return res.status(404).json(formatError('Package not found', 'NOT_FOUND'));
    invalidateBillingCache();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json(formatError('Image file required', 'VALIDATION_ERROR'));
    }
    const { UPLOAD_DIR } = require('../config/constants');
    const stored = path.join(UPLOAD_DIR, req.file.filename).replace(/\\/g, '/');
    res.json(
      formatResponse({
        path: stored,
        url: buildPublicFileUrl(stored),
      })
    );
  } catch (err) {
    next(err);
  }
}

async function listStripeEvents(req, res, next) {
  try {
    const { page, limit, from, to } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);
    const conditions = [];
    const filterParams = [];
    if (from && String(from).trim()) {
      conditions.push('created_at >= ?');
      filterParams.push(`${String(from).trim()} 00:00:00`);
    }
    if (to && String(to).trim()) {
      conditions.push('created_at <= ?');
      filterParams.push(`${String(to).trim()} 23:59:59`);
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM stripe_processed_events ${whereClause}`,
      filterParams
    );
    const [rows] = await pool.execute(
      `SELECT id, stripe_event_id, created_at FROM stripe_processed_events
       ${whereClause}
       ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...filterParams, l, offset]
    );
    res.json(
      formatResponse({
        events: rows,
        total,
        page: p,
        limit: l,
        totalPages: Math.ceil(total / l) || 1,
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  stats,
  listUsers,
  getUser,
  listGenerations,
  getGeneration,
  listSubscriptionPackages,
  createSubscriptionPackage,
  updateSubscriptionPackage,
  deleteSubscriptionPackage,
  listStripeEvents,
  uploadImage,
};
