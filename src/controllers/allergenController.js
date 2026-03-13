'use strict';

const Allergen = require('../models/Allergen');
const { formatResponse } = require('../utils/helpers');

async function listAllergens(req, res, next) {
  try {
    const allergens = await Allergen.findAll();
    res.json(formatResponse({ allergens }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAllergens };
