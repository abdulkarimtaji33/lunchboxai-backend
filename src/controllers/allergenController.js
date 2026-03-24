'use strict';

const Allergen = require('../models/Allergen');
const { formatResponse } = require('../utils/helpers');

async function listAllergens(req, res, next) {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const allergens = await Allergen.findAll();
    const withUrls = allergens.map(a => ({
      ...a,
      image_url: a.icon ? `${baseUrl}/allergens/${a.icon}` : null,
    }));
    res.json(formatResponse({ allergens: withUrls }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listAllergens };
