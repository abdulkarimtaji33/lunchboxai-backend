'use strict';

const router = require('express').Router();
const SchoolRule = require('../models/SchoolRule');
const { formatResponse } = require('../utils/helpers');

router.get('/', async (req, res, next) => {
  try {
    const school_rules = await SchoolRule.findAll();
    res.json(formatResponse({ school_rules }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
