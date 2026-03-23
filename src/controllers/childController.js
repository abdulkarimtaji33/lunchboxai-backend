'use strict';

const Child    = require('../models/Child');
const Allergen = require('../models/Allergen');
const { formatResponse, formatError } = require('../utils/helpers');

async function addChild(req, res, next) {
  try {
    const { name, date_of_birth, avatar_id, allergen_ids, allergens: allergenList, school_rule_ids } = req.body;

    const childId = await Child.create({
      userId:      req.user.id,
      name,
      dateOfBirth: date_of_birth || null,
      avatarId:    avatar_id    || null,
    });

    if (Array.isArray(allergenList) && allergenList.length) {
      for (const item of allergenList) {
        await Child.addAllergen(childId, item.allergen_id, item.severity || 'allergy', item.notes || null);
      }
    } else if (Array.isArray(allergen_ids) && allergen_ids.length) {
      for (const allergenId of allergen_ids) {
        await Child.addAllergen(childId, allergenId, 'allergy', null);
      }
    }

    if (Array.isArray(school_rule_ids) && school_rule_ids.length) {
      await Child.setSchoolRules(childId, school_rule_ids);
    }

    const child = await Child.findByIdAndUser(childId, req.user.id);
    res.status(201).json(formatResponse({ child }));
  } catch (err) {
    next(err);
  }
}

async function listChildren(req, res, next) {
  try {
    const children = await Child.findByUser(req.user.id);
    res.json(formatResponse({ children }));
  } catch (err) {
    next(err);
  }
}

async function updateChild(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    const { name, date_of_birth, avatar_id, school_rule_ids, allergen_ids, allergens: allergenList } = req.body;
    await Child.update(child.id, { name, date_of_birth, avatar_id });

    if (Array.isArray(school_rule_ids)) {
      await Child.setSchoolRules(child.id, school_rule_ids);
    }

    if (Array.isArray(allergenList)) {
      await Child.setAllergens(child.id, allergenList);
    } else if (Array.isArray(allergen_ids)) {
      await Child.setAllergens(child.id, allergen_ids.map(id => ({ allergen_id: id })));
    }

    const updated = await Child.findByIdAndUser(child.id, req.user.id);
    res.json(formatResponse({ child: updated }));
  } catch (err) {
    next(err);
  }
}

async function deleteChild(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));
    await Child.deleteById(child.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function addAllergen(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    const { allergen_id, severity, notes } = req.body;
    const allergen = await Allergen.findById(allergen_id);
    if (!allergen) return res.status(404).json(formatError('Allergen not found', 'NOT_FOUND'));

    await Child.addAllergen(child.id, allergen_id, severity, notes);
    const allergens = await Child.getAllergens(child.id);
    res.json(formatResponse({ allergens }));
  } catch (err) {
    next(err);
  }
}

async function removeAllergen(req, res, next) {
  try {
    const child = await Child.findByIdAndUser(req.params.id, req.user.id);
    if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));

    await Child.removeAllergen(child.id, req.params.allergenId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { addChild, listChildren, updateChild, deleteChild, addAllergen, removeAllergen };
