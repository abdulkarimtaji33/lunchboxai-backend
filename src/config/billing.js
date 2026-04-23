'use strict';

const env = require('./env');
const { getStripe } = require('../services/stripeClient');
const SubscriptionPackage = require('../models/SubscriptionPackage');

/** Fallback if DB empty or error */
const STATIC_PACKS = [
  { key: 'starter', label: 'Starter', generations: 25, priceUsd: 5, lookupKey: 'lunchboxai_v1_starter_25gen' },
  { key: 'growth', label: 'Growth', generations: 50, priceUsd: 20, lookupKey: 'lunchboxai_v1_growth_50gen' },
  { key: 'pro', label: 'Pro', generations: 100, priceUsd: 25, lookupKey: 'lunchboxai_v1_pro_100gen' },
];

const ENV_PRICE = {
  starter: env.stripe.priceStarter,
  growth: env.stripe.priceGrowth,
  pro: env.stripe.pricePro,
};

let resolveCache = null;
let resolveCacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

function invalidateBillingCache() {
  resolveCache = null;
  resolveCacheAt = 0;
}

function rowToPackDef(row) {
  return {
    id: row.id,
    key: row.slug,
    label: row.label,
    generations: row.generations,
    priceUsd: Number(row.price_usd),
    lookupKey: row.stripe_lookup_key,
    stripePriceIdStored: row.stripe_price_id,
  };
}

async function loadPackRows() {
  try {
    const rows = await SubscriptionPackage.listActiveForBilling();
    if (rows && rows.length) return rows;
  } catch (e) {
    console.warn('[billing] subscription_packages unavailable, using static packs:', e.message);
  }
  return null;
}

async function ensureStripePriceId(stripe, def) {
  const fromEnv = (ENV_PRICE[def.key] || '').trim();
  if (fromEnv) return { priceId: fromEnv, persist: false };

  const stored = (def.stripePriceIdStored || '').trim();
  if (stored) return { priceId: stored, persist: false };

  const list = await stripe.prices.list({ lookup_keys: [def.lookupKey], active: true, limit: 1 });
  if (list.data[0]) return { priceId: list.data[0].id, persist: true, packageId: def.id };

  try {
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(def.priceUsd * 100),
      lookup_key: def.lookupKey,
      product_data: { name: `LunchboxAI ${def.label} (${def.generations} generations)` },
    });
    return { priceId: price.id, persist: true, packageId: def.id };
  } catch (e) {
    const msg = String(e.message || '');
    if (e.code === 'resource_already_exists' || msg.includes('lookup key') || msg.includes('lookup_key')) {
      const again = await stripe.prices.list({ lookup_keys: [def.lookupKey], active: true, limit: 1 });
      if (again.data[0]) return { priceId: again.data[0].id, persist: true, packageId: def.id };
    }
    throw e;
  }
}

async function resolvePacksWithStripe() {
  const stripe = getStripe();
  if (!stripe) {
    return { packsFull: [], packsPublic: [], stripeConfigured: false };
  }

  const now = Date.now();
  if (resolveCache && now - resolveCacheAt < CACHE_MS) {
    return resolveCache;
  }

  const dbRows = await loadPackRows();
  const defs = dbRows
    ? dbRows.map(rowToPackDef)
    : STATIC_PACKS.map((s) => ({
      key: s.key,
      label: s.label,
      generations: s.generations,
      priceUsd: s.priceUsd,
      lookupKey: s.lookupKey,
      stripePriceIdStored: null,
      id: null,
    }));

  const packsFull = [];
  for (const def of defs) {
    const { priceId, persist, packageId } = await ensureStripePriceId(stripe, def);
    if (persist && packageId) {
      await SubscriptionPackage.setStripePriceId(packageId, priceId);
    }
    packsFull.push({ ...def, stripePriceId: priceId });
  }

  const packsPublic = packsFull.map(({ key, label, generations, priceUsd }) => ({
    key,
    label,
    generations,
    priceUsd,
    priceDisplay: `$${Number(priceUsd).toFixed(Number(priceUsd) % 1 ? 2 : 0)}`,
  }));

  resolveCache = { packsFull, packsPublic, stripeConfigured: true };
  resolveCacheAt = now;
  return resolveCache;
}

function getStaticPackByKey(key) {
  return STATIC_PACKS.find((p) => p.key === key);
}

/** @deprecated webhook uses session metadata */
function getPackByKey(key) {
  const def = getStaticPackByKey(key);
  if (!def) return null;
  return { ...def, stripePriceId: (ENV_PRICE[def.key] || '').trim() || null };
}

module.exports = {
  STATIC_PACKS,
  getStaticPackByKey,
  getPackByKey,
  resolvePacksWithStripe,
  invalidateBillingCache,
};
