'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { getBaseLunchboxes } = require('../controllers/baseLunchboxController');

router.use(authenticate);
router.get('/', getBaseLunchboxes);

module.exports = router;
