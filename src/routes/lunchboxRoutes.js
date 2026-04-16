'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { upload }       = require('../middleware/uploadMiddleware');
const {
  createSession, createSessionOpenRouter, getHistory, getSession, deleteSession, planSession, setFlag, submitFeedback,
} = require('../controllers/lunchboxController');

router.use(authenticate);

router.post('/sessions',            upload, createSession);
router.post('/sessions/openrouter', upload, createSessionOpenRouter);
router.get('/sessions',      getHistory);
router.get('/sessions/:id',  getSession);
router.delete('/sessions/:id', deleteSession);
router.patch('/sessions/:id/plan', planSession);
router.patch('/sessions/:id/flag', setFlag);
router.patch('/sessions/:id/feedback', submitFeedback);

module.exports = router;
