'use strict';

const NutritionGoal = require('../models/NutritionGoal');
const { formatResponse, formatError } = require('../utils/helpers');

async function listNutritionGoals(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const goals = await NutritionGoal.findAll({ includeInactive });
    res.json(formatResponse({ nutrition_goals: goals }));
  } catch (err) {
    next(err);
  }
}

async function createNutritionGoal(req, res, next) {
  try {
    const { goal_key, label, description } = req.body;
    const goal = await NutritionGoal.create({ goal_key, label, description });
    res.status(201).json(formatResponse({ nutrition_goal: goal }));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json(formatError('A nutrition goal with that key already exists', 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
}

async function updateNutritionGoal(req, res, next) {
  try {
    const goal = await NutritionGoal.findById(req.params.id);
    if (!goal) return res.status(404).json(formatError('Nutrition goal not found', 'NOT_FOUND'));

    const { goal_key, label, description, is_active } = req.body;
    await NutritionGoal.update(goal.id, { goal_key, label, description, is_active });

    const updated = await NutritionGoal.findById(goal.id);
    res.json(formatResponse({ nutrition_goal: updated }));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json(formatError('A nutrition goal with that key already exists', 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
}

async function deleteNutritionGoal(req, res, next) {
  try {
    const goal = await NutritionGoal.findById(req.params.id);
    if (!goal) return res.status(404).json(formatError('Nutrition goal not found', 'NOT_FOUND'));
    await NutritionGoal.deleteById(goal.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listNutritionGoals, createNutritionGoal, updateNutritionGoal, deleteNutritionGoal };
