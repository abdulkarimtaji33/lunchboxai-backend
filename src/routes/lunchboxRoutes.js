'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { upload }       = require('../middleware/uploadMiddleware');
const {
  createSession, getHistory, getSession, deleteSession,
} = require('../controllers/lunchboxController');

router.use(authenticate);

router.post('/sessions',     upload, createSession);
router.get('/sessions',      getHistory);
router.get('/sessions/:id',  getSession);
router.delete('/sessions/:id', deleteSession);

module.exports = router;
