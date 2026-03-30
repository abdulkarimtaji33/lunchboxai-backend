'use strict';

const Child         = require('../models/Child');
const ChildLunchbox = require('../models/ChildLunchbox');
const { deleteFiles } = require('../services/imageService');
const { formatResponse, formatError } = require('../utils/helpers');

function enrichLunchboxes(lunchboxes, baseUrl) {
  return lunchboxes.map(lb => ({
    ...lb,
    image_url: `${baseUrl}/${lb.image_path.replace(/\\/g, '/')}`,
  }));
}

async function listLunchboxes(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const lunchboxes = await ChildLunchbox.findByChild(child.id);
    res.json(formatResponse({ lunchboxes: enrichLunchboxes(lunchboxes, baseUrl) }));
  } catch (err) {
    next(err);
  }
}

async function addLunchbox(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    if (!req.file) return res.status(400).json(formatError('Image is required', 'VALIDATION_ERROR'));

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { label } = req.body;
    const lunchboxId = await ChildLunchbox.create(child.id, req.file.path, label);
    const lunchboxes = await ChildLunchbox.findByChild(child.id);
    res.status(201).json(formatResponse({ lunchboxId, lunchboxes: enrichLunchboxes(lunchboxes, baseUrl) }));
  } catch (err) {
    next(err);
  }
}

async function removeLunchbox(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    const lb = await ChildLunchbox.findById(req.params.lunchboxId);
    if (!lb || lb.child_id !== child.id) return res.status(404).json(formatError('Lunchbox not found', 'NOT_FOUND'));

    // If it's the default, clear it first
    if (child.default_lunchbox_id === lb.id) {
      await ChildLunchbox.clearDefault(child.id);
    }

    await ChildLunchbox.deleteById(lb.id);
    await deleteFiles([lb.image_path]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function setDefault(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    const lb = await ChildLunchbox.findById(req.params.lunchboxId);
    if (!lb || lb.child_id !== child.id) return res.status(404).json(formatError('Lunchbox not found', 'NOT_FOUND'));

    await ChildLunchbox.setDefault(child.id, lb.id);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const lunchboxes = await ChildLunchbox.findByChild(child.id);
    res.json(formatResponse({ lunchboxes: enrichLunchboxes(lunchboxes, baseUrl) }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listLunchboxes, addLunchbox, removeLunchbox, setDefault };
