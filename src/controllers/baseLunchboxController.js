'use strict';

const BaseLunchbox = require('../models/BaseLunchbox');
const { formatResponse } = require('../utils/helpers');

async function getBaseLunchboxes(req, res, next) {
  try {
    const lunchboxes = await BaseLunchbox.findAll();
    res.json(formatResponse({ lunchboxes }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getBaseLunchboxes };
