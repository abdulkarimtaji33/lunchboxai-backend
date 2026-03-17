'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { listAvatars } = require('../controllers/avatarController');

router.use(authenticate);

router.get('/', listAvatars);

module.exports = router;
