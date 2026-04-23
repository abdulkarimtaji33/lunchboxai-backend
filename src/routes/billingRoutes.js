'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { listPlans, createCheckout } = require('../controllers/billingController');

router.get('/plans', listPlans);
router.post('/checkout', authenticate, createCheckout);

module.exports = router;
