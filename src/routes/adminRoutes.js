'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/requireAdmin');
const admin = require('../controllers/adminController');

router.use(authenticate, requireAdmin);

router.get('/stats', admin.stats);
router.get('/users', admin.listUsers);
router.get('/users/:id', admin.getUser);
router.get('/generations', admin.listGenerations);
router.get('/generations/:id', admin.getGeneration);

router.get('/subscription-packages', admin.listSubscriptionPackages);
router.post('/subscription-packages', admin.createSubscriptionPackage);
router.patch('/subscription-packages/:id', admin.updateSubscriptionPackage);
router.delete('/subscription-packages/:id', admin.deleteSubscriptionPackage);

module.exports = router;
