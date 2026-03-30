'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const { validate, childSchema, childUpdateSchema, childAllergenSchema } = require('../utils/validators');
const {
  addChild, listChildren, updateChild, deleteChild,
  addAllergen, removeAllergen,
} = require('../controllers/childController');
const {
  listLunchboxes, addLunchbox, removeLunchbox, setDefault,
} = require('../controllers/childLunchboxController');

router.use(authenticate);

router.post('/',    validate(childSchema), addChild);
router.get('/',     listChildren);
router.patch('/:id',  validate(childUpdateSchema), updateChild);
router.delete('/:id', deleteChild);

// Child allergens
router.post('/:id/allergens',                validate(childAllergenSchema), addAllergen);
router.delete('/:id/allergens/:allergenId',  removeAllergen);

// Child base lunchboxes
router.get('/:id/lunchboxes',                        listLunchboxes);
router.post('/:id/lunchboxes',                       uploadSingle, addLunchbox);
router.delete('/:id/lunchboxes/:lunchboxId',         removeLunchbox);
router.patch('/:id/lunchboxes/:lunchboxId/set-default', setDefault);

module.exports = router;
