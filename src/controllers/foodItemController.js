'use strict';

const FoodItem = require('../models/FoodItem');
const { formatResponse, formatError } = require('../utils/helpers');

async function listFoodItems(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const items = await FoodItem.findAll({ includeInactive });
    res.json(formatResponse({ food_items: items }));
  } catch (err) {
    next(err);
  }
}

async function createFoodItem(req, res, next) {
  try {
    const { name, category } = req.body;
    const id   = await FoodItem.create({ name, category });
    const item = await FoodItem.findById(id);
    res.status(201).json(formatResponse({ food_item: item }));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json(formatError('A food item with that name already exists', 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
}

async function updateFoodItem(req, res, next) {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json(formatError('Food item not found', 'NOT_FOUND'));

    const { name, category, is_active } = req.body;
    await FoodItem.update(item.id, { name, category, is_active });

    const updated = await FoodItem.findById(item.id);
    res.json(formatResponse({ food_item: updated }));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json(formatError('A food item with that name already exists', 'DUPLICATE_ENTRY'));
    }
    next(err);
  }
}

async function deleteFoodItem(req, res, next) {
  try {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json(formatError('Food item not found', 'NOT_FOUND'));
    await FoodItem.deleteById(item.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listFoodItems, createFoodItem, updateFoodItem, deleteFoodItem };
