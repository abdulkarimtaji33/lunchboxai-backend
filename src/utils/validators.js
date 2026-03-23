const Joi = require('joi');

const registerSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  name:      Joi.string().min(2).max(100).optional(),
  email:     Joi.string().email().required(),
  password:  Joi.string().min(6).required(),
}).or('full_name', 'name');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const childSchema = Joi.object({
  name:            Joi.string().min(1).max(100).required(),
  date_of_birth:   Joi.date().iso().max('now').optional(),
  avatar_id:       Joi.number().integer().positive().optional(),
  allergen_ids:    Joi.array().items(Joi.number().integer().positive()).optional(),
  allergens:       Joi.array().items(Joi.object({
    allergen_id: Joi.number().integer().positive().required(),
    severity:    Joi.string().valid('intolerance', 'allergy', 'severe').optional(),
    notes:       Joi.string().max(255).allow('', null).optional(),
  })).optional(),
  school_rule_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
});

const childUpdateSchema = Joi.object({
  name:            Joi.string().min(1).max(100).optional(),
  date_of_birth:   Joi.date().iso().max('now').optional(),
  avatar_id:       Joi.number().integer().positive().allow(null).optional(),
  allergen_ids:    Joi.array().items(Joi.number().integer().positive()).optional(),
  allergens:       Joi.array().items(Joi.object({
    allergen_id: Joi.number().integer().positive().required(),
    severity:    Joi.string().valid('intolerance', 'allergy', 'severe').optional(),
    notes:       Joi.string().max(255).allow('', null).optional(),
  })).optional(),
  school_rule_ids: Joi.array().items(Joi.number().integer().positive()).optional(),
});

const childAllergenSchema = Joi.object({
  allergen_id: Joi.number().integer().positive().required(),
  severity:    Joi.string().valid('intolerance', 'allergy', 'severe').optional(),
  notes:       Joi.string().max(255).allow('', null).optional(),
});

const foodItemSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  category: Joi.string().max(50).optional(),
  is_active: Joi.boolean().optional(),
});

const nutritionGoalSchema = Joi.object({
  goal_key: Joi.string().min(1).max(50).required(),
  label: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(255).optional(),
  is_active: Joi.boolean().optional(),
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }
    next();
  };
}

module.exports = { registerSchema, loginSchema, childSchema, childUpdateSchema, childAllergenSchema, foodItemSchema, nutritionGoalSchema, validate };
