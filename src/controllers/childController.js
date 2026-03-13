'use strict';

const Child    = require('../models/Child');
const Allergen = require('../models/Allergen');
const { formatResponse, formatError } = require('../utils/helpers');

async function addChild(req, res, next) {
  try {
    const { name, age, dislikes, school_rules, nutrition_goal, calorie_target, protein_target } = req.body;
    const childId = await Child.create({
      userId:        req.user.id,
      name,
      age:           age           || null,
      dislikes:      dislikes      || null,
      schoolRules:   school_rules  || null,
      nutritionGoal: nutrition_goal || 'balanced',
      calorieTarget: calorie_target || null,
      proteinTarget: protein_target || null,
    });
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

    const { name, age, dislikes, school_rules, nutrition_goal, calorie_target, protein_target } = req.body;
    await Child.update(child.id, {
      name, age, dislikes,
      school_rules,
      nutrition_goal,
      calorie_target,
      protein_target,
    });

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
