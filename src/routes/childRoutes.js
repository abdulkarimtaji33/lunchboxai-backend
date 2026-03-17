'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { validate, childSchema, childUpdateSchema, childAllergenSchema } = require('../utils/validators');
const {
  addChild, listChildren, updateChild, deleteChild,
  addAllergen, removeAllergen,
} = require('../controllers/childController');

router.use(authenticate);

router.post('/',    validate(childSchema), addChild);
router.get('/',     listChildren);
router.patch('/:id',  validate(childUpdateSchema), updateChild);
router.delete('/:id', deleteChild);

// Child allergens
router.post('/:id/allergens',                validate(childAllergenSchema), addAllergen);
router.delete('/:id/allergens/:allergenId',  removeAllergen);

module.exports = router;
