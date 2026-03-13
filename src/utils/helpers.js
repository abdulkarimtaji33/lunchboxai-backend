'use strict';

const { APP_BASE_URL } = require('../config/env');

function formatResponse(data) {
  return { success: true, data };
}

function formatError(message, code = 'ERROR') {
  return { success: false, error: { code, message } };
}

function buildImageUrl(filePath) {
  if (!filePath) return null;
  const normalized = filePath.replace(/\\/g, '/');
  return `${APP_BASE_URL}/${normalized}`;
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    // Strip markdown code fences if present
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(stripped);
  } catch {
    return null;
  }
}

function paginate(page, limit) {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit) || 10));
  return { offset: (p - 1) * l, limit: l, page: p };
}

module.exports = { formatResponse, formatError, buildImageUrl, parseJsonSafe, paginate };
