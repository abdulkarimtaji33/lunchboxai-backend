'use strict';

const Allergen = require('../models/Allergen');
const Avatar = require('../models/Avatar');
const SchoolRule = require('../models/SchoolRule');
const NutritionGoal = require('../models/NutritionGoal');
const FoodItem = require('../models/FoodItem');
const BaseLunchbox = require('../models/BaseLunchbox');
const { formatResponse, formatError } = require('../utils/helpers');

const ENTITIES = new Set([
  'allergens', 'avatars', 'school_rules', 'nutrition_goals', 'food_items', 'base_lunchboxes',
]);

function isFkError(err) {
  return err && (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2');
}

async function list(req, res, next) {
  try {
    const { entity } = req.params;
    if (!ENTITIES.has(entity)) {
      return res.status(400).json(formatError('Unknown entity', 'VALIDATION_ERROR'));
    }
    let rows;
    switch (entity) {
      case 'allergens':
        rows = await Allergen.findAll();
        break;
      case 'avatars':
        rows = await Avatar.findAll({ includeInactive: true });
        break;
      case 'school_rules':
        rows = await SchoolRule.findAllAdmin();
        break;
      case 'nutrition_goals':
        rows = await NutritionGoal.findAll({ includeInactive: true });
        break;
      case 'food_items':
        rows = await FoodItem.findAll({ includeInactive: true });
        break;
      case 'base_lunchboxes':
        rows = await BaseLunchbox.findAllAdmin();
        break;
      default:
        rows = [];
    }
    res.json(formatResponse({ items: rows }));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { entity } = req.params;
    if (!ENTITIES.has(entity)) {
      return res.status(400).json(formatError('Unknown entity', 'VALIDATION_ERROR'));
    }
    const b = req.body || {};
    let row;
    switch (entity) {
      case 'allergens': {
        const name = String(b.name || '').trim();
        if (!name) return res.status(400).json(formatError('name is required', 'VALIDATION_ERROR'));
        row = await Allergen.create({
          name,
          icon: b.icon,
          category: b.category,
          description: b.description,
          is_common: !!b.is_common,
        });
        break;
      }
      case 'avatars': {
        const name = String(b.name || '').trim();
        const filename = String(b.filename || '').trim();
        if (!name || !filename) {
          return res.status(400).json(formatError('name and filename are required', 'VALIDATION_ERROR'));
        }
        row = await Avatar.create({ name, filename, is_active: b.is_active !== false ? 1 : 0 });
        break;
      }
      case 'school_rules': {
        const name = String(b.name || '').trim();
        if (!name) return res.status(400).json(formatError('name is required', 'VALIDATION_ERROR'));
        row = await SchoolRule.create({
          name,
          description: b.description,
          is_active: b.is_active !== false ? 1 : 0,
        });
        break;
      }
      case 'nutrition_goals': {
        const goal_key = String(b.goal_key || '').trim();
        const label = String(b.label || '').trim();
        if (!goal_key || !label) {
          return res.status(400).json(formatError('goal_key and label are required', 'VALIDATION_ERROR'));
        }
        row = await NutritionGoal.create({
          goal_key,
          label,
          description: b.description,
          is_active: b.is_active !== false ? 1 : 0,
        });
        break;
      }
      case 'food_items': {
        const name = String(b.name || '').trim();
        if (!name) return res.status(400).json(formatError('name is required', 'VALIDATION_ERROR'));
        const id = await FoodItem.create({ name, category: b.category });
        row = await FoodItem.findById(id);
        break;
      }
      case 'base_lunchboxes': {
        const name = String(b.name || '').trim();
        if (!name) return res.status(400).json(formatError('name is required', 'VALIDATION_ERROR'));
        row = await BaseLunchbox.create({
          name,
          description: b.description,
          container_type: b.container_type,
          compartments: b.compartments,
          image_path: b.image_path,
          tags: b.tags,
          sort_order: b.sort_order,
          is_active: b.is_active !== false ? 1 : 0,
        });
        break;
      }
      default:
        return res.status(400).json(formatError('Unknown entity', 'VALIDATION_ERROR'));
    }
    res.status(201).json(formatResponse({ item: row }));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { entity, id: idStr } = req.params;
    const id = parseInt(idStr, 10);
    if (!ENTITIES.has(entity) || !id) {
      return res.status(400).json(formatError('Invalid request', 'VALIDATION_ERROR'));
    }
    const b = req.body || {};
    let row;
    switch (entity) {
      case 'allergens': {
        const existing = await Allergen.findById(id);
        if (!existing) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
        const fields = {};
        if (b.name !== undefined) fields.name = String(b.name).trim();
        if (b.icon !== undefined) fields.icon = b.icon;
        if (b.category !== undefined) fields.category = b.category;
        if (b.description !== undefined) fields.description = b.description;
        if (b.is_common !== undefined) fields.is_common = !!b.is_common;
        row = await Allergen.update(id, fields);
        break;
      }
      case 'avatars': {
        const existing = await Avatar.findById(id);
        if (!existing) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
        row = await Avatar.update(id, {
          name: b.name !== undefined ? String(b.name).trim() : undefined,
          filename: b.filename !== undefined ? String(b.filename).trim() : undefined,
          is_active: b.is_active !== undefined ? !!b.is_active : undefined,
        });
        break;
      }
      case 'school_rules': {
        const existing = await SchoolRule.findById(id);
        if (!existing) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
        row = await SchoolRule.update(id, {
          name: b.name !== undefined ? String(b.name).trim() : undefined,
          description: b.description,
          is_active: b.is_active,
        });
        break;
      }
      case 'nutrition_goals': {
        const existing = await NutritionGoal.findById(id);
        if (!existing) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
        row = await NutritionGoal.update(id, {
          goal_key: b.goal_key !== undefined ? String(b.goal_key).trim() : undefined,
          label: b.label !== undefined ? String(b.label).trim() : undefined,
          description: b.description,
          is_active: b.is_active,
        });
        break;
      }
      case 'food_items': {
        const existing = await FoodItem.findById(id);
        if (!existing) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
        await FoodItem.update(id, {
          name: b.name !== undefined ? String(b.name).trim() : undefined,
          category: b.category,
          is_active: b.is_active !== undefined ? (b.is_active ? 1 : 0) : undefined,
        });
        row = await FoodItem.findById(id);
        break;
      }
      case 'base_lunchboxes': {
        const existing = await BaseLunchbox.findByIdAdmin(id);
        if (!existing) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
        row = await BaseLunchbox.update(id, {
          name: b.name !== undefined ? String(b.name).trim() : undefined,
          description: b.description,
          container_type: b.container_type,
          compartments: b.compartments !== undefined ? parseInt(b.compartments, 10) : undefined,
          image_path: b.image_path,
          tags: b.tags,
          sort_order: b.sort_order !== undefined ? parseInt(b.sort_order, 10) : undefined,
          is_active: b.is_active,
        });
        break;
      }
      default:
        return res.status(400).json(formatError('Unknown entity', 'VALIDATION_ERROR'));
    }
    res.json(formatResponse({ item: row }));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { entity, id: idStr } = req.params;
    const id = parseInt(idStr, 10);
    if (!ENTITIES.has(entity) || !id) {
      return res.status(400).json(formatError('Invalid request', 'VALIDATION_ERROR'));
    }
    let ok;
    try {
      switch (entity) {
        case 'allergens':
          ok = await Allergen.deleteById(id);
          break;
        case 'avatars':
          ok = await Avatar.deleteById(id);
          break;
        case 'school_rules':
          ok = await SchoolRule.deleteById(id);
          break;
        case 'nutrition_goals':
          ok = await NutritionGoal.deleteById(id);
          break;
        case 'food_items':
          await FoodItem.deleteById(id);
          ok = true;
          break;
        case 'base_lunchboxes':
          ok = await BaseLunchbox.deleteById(id);
          break;
        default:
          return res.status(400).json(formatError('Unknown entity', 'VALIDATION_ERROR'));
      }
    } catch (err) {
      if (isFkError(err)) {
        return res.status(409).json(formatError('Cannot delete: referenced by other records', 'CONFLICT'));
      }
      throw err;
    }
    if (!ok) return res.status(404).json(formatError('Not found', 'NOT_FOUND'));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove };
