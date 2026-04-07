'use strict';

const SENSITIVE = new Set(['password', 'newPassword', 'token', 'authorization', 'smtp_pass', 'accessToken', 'refreshToken']);

function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return '[array]';
  const o = {};
  for (const k of Object.keys(body)) {
    if (SENSITIVE.has(k)) o[k] = '[redacted]';
    else if (body[k] && typeof body[k] === 'object' && !Array.isArray(body[k])) o[k] = sanitizeBody(body[k]);
    else o[k] = body[k];
  }
  return o;
}

/**
 * Logs every request when the response finishes (method, URL, status, duration, IP).
 * For status >= 400, logs JSON response body (truncated) when res.json is used.
 */
function httpLogger(req, res, next) {
  const start = Date.now();
  const path = req.originalUrl || req.url;

  const origJson = res.json.bind(res);
  res.json = function jsonLogged(body) {
    const code = res.statusCode;
    if (code >= 400) {
      try {
        const s = typeof body === 'string' ? body : JSON.stringify(body);
        console.warn(`[RESP] ${req.method} ${path} ${code} ${s.slice(0, 2048)}${s.length > 2048 ? '…' : ''}`);
      } catch (e) {
        console.warn(`[RESP] ${req.method} ${path} ${code} (unserializable body)`);
      }
    }
    return origJson(body);
  };

  const origSend = res.send.bind(res);
  res.send = function sendLogged(body) {
    const code = res.statusCode;
    if (code >= 400 && body !== undefined && typeof body !== 'object') {
      const s = String(body);
      console.warn(`[RESP:send] ${req.method} ${path} ${code} ${s.slice(0, 2048)}`);
    }
    return origSend(body);
  };

  res.on('finish', () => {
    const ms = Date.now() - start;
    const { statusCode } = res;
    const line = `${req.method} ${path} ${statusCode} ${ms}ms ip=${req.ip || '-'}`;
    if (statusCode >= 500) console.error('[HTTP]', line);
    else if (statusCode >= 400) console.warn('[HTTP]', line);
    else console.log('[HTTP]', line);
  });

  next();
}

function logRequestBody(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  if (req.body && Object.keys(req.body).length) {
    console.log('[BODY]', req.method, req.originalUrl, JSON.stringify(sanitizeBody(req.body)).slice(0, 1500));
  }
  next();
}

module.exports = { httpLogger, logRequestBody, sanitizeBody };
