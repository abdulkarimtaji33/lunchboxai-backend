'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/requireAdmin');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const admin = require('../controllers/adminController');
const master = require('../controllers/adminMasterDataController');
const users = require('../controllers/adminUsersController');
const sessions = require('../controllers/adminSessionsController');

router.use(authenticate, requireAdmin);

router.post('/upload-image', uploadSingle, admin.uploadImage);
router.get('/stats', admin.stats);
router.get('/stripe-events', admin.listStripeEvents);

router.get('/master/:entity', master.list);
router.post('/master/:entity', master.create);
router.patch('/master/:entity/:id', master.update);
router.delete('/master/:entity/:id', master.remove);

router.get('/users/:id/children', users.listChildren);
router.post('/users/:id/children', users.createChild);
router.get('/users/:id/fcm-tokens', users.listFcmTokens);
router.patch('/users/:id', users.patchUser);
router.delete('/users/:id', users.deleteUser);
router.get('/users', admin.listUsers);
router.get('/users/:id', admin.getUser);

router.get('/children/:childId/lunchboxes', users.listChildLunchboxes);
router.delete('/children/:childId/lunchboxes/:lunchboxId', users.deleteChildLunchbox);
router.get('/children/:childId', users.getChild);
router.patch('/children/:childId', users.patchChild);
router.delete('/children/:childId', users.deleteChild);

router.delete('/fcm-tokens/:tokenId', users.deleteFcmToken);

router.patch('/generations/:id', sessions.patchSession);
router.delete('/generations/:id', sessions.deleteSession);
router.get('/generations', admin.listGenerations);
router.get('/generations/:id', admin.getGeneration);

router.get('/subscription-packages', admin.listSubscriptionPackages);
router.post('/subscription-packages', admin.createSubscriptionPackage);
router.patch('/subscription-packages/:id', admin.updateSubscriptionPackage);
router.delete('/subscription-packages/:id', admin.deleteSubscriptionPackage);

module.exports = router;
