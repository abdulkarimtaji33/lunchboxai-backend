'use strict';

const pool = require('../config/database');
const LunchBox = require('../models/LunchBox');
const { deleteFiles } = require('../services/imageService');
const { formatResponse, formatError } = require('../utils/helpers');

async function patchSession(req, res, next) {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const b = req.body || {};
    const fields = {};
    if (b.status !== undefined) fields.status = b.status;
    if (b.notes !== undefined) fields.notes = b.notes;
    if (b.planned_at !== undefined) fields.planned_at = b.planned_at || null;
    if (b.is_favorite !== undefined) fields.is_favorite = !!b.is_favorite;
    if (b.save_for_later !== undefined) fields.save_for_later = !!b.save_for_later;

    const [rows] = await pool.execute('SELECT id FROM lunchbox_sessions WHERE id = ?', [sessionId]);
    if (!rows[0]) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));

    await LunchBox.adminPatch(sessionId, fields);
    const session = await LunchBox.findByIdAsAdmin(sessionId);
    res.json(formatResponse({ session }));
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    const sessionId = parseInt(req.params.id, 10);
    if (String(req.body?.confirm || '').trim() !== 'DELETE') {
      return res.status(400).json(formatError('confirm must be DELETE', 'VALIDATION_ERROR'));
    }
    const [rows] = await pool.execute('SELECT id FROM lunchbox_sessions WHERE id = ?', [sessionId]);
    if (!rows[0]) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));

    const paths = await LunchBox.getFilePaths(sessionId);
    await LunchBox.deleteById(sessionId);
    await deleteFiles(paths);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { patchSession, deleteSession };
