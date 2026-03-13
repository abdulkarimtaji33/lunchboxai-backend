'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { listNutritionGoals, createNutritionGoal, updateNutritionGoal, deleteNutritionGoal } = require('../controllers/nutritionGoalController');

// GET is public
router.get('/', listNutritionGoals);

// Write operations require auth
router.post('/',     authenticate, createNutritionGoal);
router.patch('/:id', authenticate, updateNutritionGoal);
router.delete('/:id',authenticate, deleteNutritionGoal);

module.exports = router;
