'use strict';

const pool = require('../config/database');
const User = require('../models/User');
const Child = require('../models/Child');
const ChildLunchbox = require('../models/ChildLunchbox');
const LunchBox = require('../models/LunchBox');
const FcmToken = require('../models/FcmToken');
const { deleteFiles } = require('../services/imageService');
const { formatResponse, formatError } = require('../utils/helpers');

async function patchUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const u = await User.findById(id);
    if (!u) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));

    const { name, is_admin, credit_delta } = req.body || {};

    if (name !== undefined) {
      const n = String(name || '').trim();
      if (!n) return res.status(400).json(formatError('name cannot be empty', 'VALIDATION_ERROR'));
      await User.updateProfile(id, { name: n });
    }

    if (credit_delta !== undefined && credit_delta !== null && credit_delta !== '') {
      await User.adjustGenerationCredits(id, credit_delta);
    }

    if (is_admin !== undefined) {
      const want = !!is_admin;
      if (!want && Number(u.is_admin)) {
        const cnt = await User.countAdmins();
        if (cnt <= 1) {
          return res.status(409).json(formatError('Cannot remove last admin', 'CONFLICT'));
        }
      }
      await User.setAdmin(id, want);
    }

    const updated = await User.findById(id);
    res.json(formatResponse({ user: updated }));
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const confirm = String(req.body?.confirm || '').trim();
    const u = await User.findById(id);
    if (!u) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    if (confirm.toLowerCase() !== String(u.email).toLowerCase()) {
      return res.status(400).json(formatError('confirm must match user email', 'VALIDATION_ERROR'));
    }
    if (Number(u.is_admin)) {
      const cnt = await User.countAdmins();
      if (cnt <= 1) {
        return res.status(409).json(formatError('Cannot delete last admin', 'CONFLICT'));
      }
    }

    const [sessions] = await pool.execute('SELECT id FROM lunchbox_sessions WHERE user_id = ?', [id]);
    for (const { id: sid } of sessions) {
      const paths = await LunchBox.getFilePaths(sid);
      await deleteFiles(paths);
    }

    const [children] = await pool.execute('SELECT id FROM children WHERE user_id = ?', [id]);
    for (const { id: cid } of children) {
      const lbs = await ChildLunchbox.findByChild(cid);
      for (const lb of lbs) {
        if (lb.image_path) await deleteFiles([lb.image_path]);
      }
    }

    const ok = await User.deleteById(id);
    if (!ok) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listChildren(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    const u = await User.findById(userId);
    if (!u) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    const children = await Child.findByUser(userId);
    res.json(formatResponse({ children }));
  } catch (err) {
    next(err);
  }
}

async function createChild(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    const u = await User.findById(userId);
    if (!u) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json(formatError('name is required', 'VALIDATION_ERROR'));
    const dateOfBirth = req.body?.date_of_birth || null;
    const avatarId = req.body?.avatar_id != null ? parseInt(req.body.avatar_id, 10) : null;
    const childId = await Child.create({
      userId,
      name,
      dateOfBirth: dateOfBirth || null,
      avatarId: Number.isFinite(avatarId) ? avatarId : null,
    });
    const child = await Child.findByIdAdmin(childId);
    res.status(201).json(formatResponse({ child }));
  } catch (err) {
    next(err);
  }
}

async function getChild(req, res, next) {
  try {
    const id = parseInt(req.params.childId, 10);
    const child = await Child.findByIdAdmin(id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));
    const lunchboxes = await ChildLunchbox.findByChild(id);
    const { buildPublicFileUrl } = require('../services/imageService');
    res.json(formatResponse({
      child: {
        ...child,
        lunchboxes: lunchboxes.map((lb) => ({
          ...lb,
          image_url: lb.image_path ? buildPublicFileUrl(lb.image_path) : null,
        })),
      },
    }));
  } catch (err) {
    next(err);
  }
}

async function patchChild(req, res, next) {
  try {
    const id = parseInt(req.params.childId, 10);
    const existing = await Child.findByIdAdmin(id);
    if (!existing) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    const b = req.body || {};
    const fields = {};
    if (b.name !== undefined) fields.name = String(b.name).trim();
    if (b.date_of_birth !== undefined) fields.date_of_birth = b.date_of_birth || null;
    if (b.avatar_id !== undefined) {
      fields.avatar_id = b.avatar_id === null || b.avatar_id === ''
        ? null
        : parseInt(b.avatar_id, 10);
    }
    if (Object.keys(fields).length) await Child.update(id, fields);

    if (Array.isArray(b.allergens)) {
      await Child.setAllergens(id, b.allergens);
    }
    if (Array.isArray(b.school_rule_ids)) {
      await Child.setSchoolRules(id, b.school_rule_ids.map((x) => parseInt(x, 10)).filter(Number.isFinite));
    }
    if (Array.isArray(b.nutrition_goal_ids)) {
      await Child.setNutritionGoals(id, b.nutrition_goal_ids.map((x) => parseInt(x, 10)).filter(Number.isFinite));
    }

    const child = await Child.findByIdAdmin(id);
    const lunchboxes = await ChildLunchbox.findByChild(id);
    const { buildPublicFileUrl } = require('../services/imageService');
    res.json(formatResponse({
      child: {
        ...child,
        lunchboxes: lunchboxes.map((lb) => ({
          ...lb,
          image_url: lb.image_path ? buildPublicFileUrl(lb.image_path) : null,
        })),
      },
    }));
  } catch (err) {
    next(err);
  }
}

async function deleteChild(req, res, next) {
  try {
    const id = parseInt(req.params.childId, 10);
    if (String(req.body?.confirm || '').trim() !== 'DELETE') {
      return res.status(400).json(formatError('confirm must be DELETE', 'VALIDATION_ERROR'));
    }
    const existing = await Child.findByIdAdmin(id);
    if (!existing) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));
    const lbs = await ChildLunchbox.findByChild(id);
    for (const lb of lbs) {
      if (lb.image_path) await deleteFiles([lb.image_path]);
    }
    await Child.deleteById(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listChildLunchboxes(req, res, next) {
  try {
    const id = parseInt(req.params.childId, 10);
    const existing = await Child.findByIdAdmin(id);
    if (!existing) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));
    const lbs = await ChildLunchbox.findByChild(id);
    const { buildPublicFileUrl } = require('../services/imageService');
    res.json(formatResponse({
      lunchboxes: lbs.map((lb) => ({
        ...lb,
        image_url: lb.image_path ? buildPublicFileUrl(lb.image_path) : null,
      })),
    }));
  } catch (err) {
    next(err);
  }
}

async function deleteChildLunchbox(req, res, next) {
  try {
    const childId = parseInt(req.params.childId, 10);
    const lbId = parseInt(req.params.lunchboxId, 10);
    const lb = await ChildLunchbox.findById(lbId);
    if (!lb || lb.child_id !== childId) {
      return res.status(404).json(formatError('Lunchbox not found', 'NOT_FOUND'));
    }
    if (lb.image_path) await deleteFiles([lb.image_path]);
    await ChildLunchbox.deleteById(lbId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function listFcmTokens(req, res, next) {
  try {
    const userId = parseInt(req.params.id, 10);
    const u = await User.findById(userId);
    if (!u) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));
    const tokens = await FcmToken.listByUserId(userId);
    res.json(formatResponse({ tokens }));
  } catch (err) {
    next(err);
  }
}

async function deleteFcmToken(req, res, next) {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    const ok = await FcmToken.deleteById(tokenId);
    if (!ok) return res.status(404).json(formatError('Token not found', 'NOT_FOUND'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  patchUser,
  deleteUser,
  listChildren,
  createChild,
  getChild,
  patchChild,
  deleteChild,
  listChildLunchboxes,
  deleteChildLunchbox,
  listFcmTokens,
  deleteFcmToken,
};
