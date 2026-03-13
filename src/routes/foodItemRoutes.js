'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { listFoodItems, createFoodItem, updateFoodItem, deleteFoodItem } = require('../controllers/foodItemController');

// GET is public — clients need the list to display food options
router.get('/', listFoodItems);

// Write operations require auth
router.post('/',     authenticate, createFoodItem);
router.patch('/:id', authenticate, updateFoodItem);
router.delete('/:id',authenticate, deleteFoodItem);

module.exports = router;
