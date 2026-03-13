'use strict';

const router = require('express').Router();
const { listAllergens } = require('../controllers/allergenController');

router.get('/', listAllergens);

module.exports = router;
