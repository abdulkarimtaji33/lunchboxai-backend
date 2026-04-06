'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { requireBroadcastSecret } = require('../middleware/broadcastSecret');
const { registerToken, patchToken, unregisterToken, broadcast } = require('../controllers/notificationController');

const router = express.Router();

router.post('/token', authenticate, registerToken);
router.patch('/token', authenticate, patchToken);
router.delete('/token', authenticate, unregisterToken);
router.post('/broadcast', requireBroadcastSecret, broadcast);

module.exports = router;
