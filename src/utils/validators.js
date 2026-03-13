'use strict';

const Joi = require('joi');
const { formatError } = require('./helpers');

const registerSchema = Joi.object({
  email:     Joi.string().email().required(),
  password:  Joi.string().min(8).required(),
  full_name: Joi.string().min(1).max(100).required(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const childSchema = Joi.object({
  name:           Joi.string().min(1).max(100).required(),
  age:            Joi.number().integer().min(1).max(18).allow(null),
  dislikes:       Joi.string().max(255).allow('', null),
  school_rules:   Joi.string().max(255).allow('', null),
  nutrition_goal: Joi.string().valid('balanced','high_protein','high_calories','low_sugar','low_carb','high_fiber'),
  calorie_target: Joi.number().integer().min(0).max(9999).allow(null),
  protein_target: Joi.number().integer().min(0).max(255).allow(null),
});

const childAllergenSchema = Joi.object({
  allergen_id: Joi.number().integer().required(),
  severity:    Joi.string().valid('intolerance','allergy','severe').default('allergy'),
  notes:       Joi.string().max(255).allow('', null),
});

const sessionSchema = Joi.object({
  child_id:               Joi.number().integer().allow(null),
  notes:                  Joi.string().max(1000).allow('', null),
  dislikes_override:      Joi.string().max(255).allow('', null),
  school_rules_override:  Joi.string().max(255).allow('', null),
  prep_time_minutes:      Joi.number().integer().min(5).max(120).allow(null),
  nutrition_goal_override:Joi.string().valid('balanced','high_protein','high_calories','low_sugar','low_carb','high_fiber').allow(null),
  allergen_override_ids:  Joi.alternatives().try(
    Joi.array().items(Joi.number().integer()),
    Joi.string()
  ).allow(null),
});

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json(formatError(
        error.details.map(d => d.message).join('; '),
        'VALIDATION_ERROR'
      ));
    }
    req.body = value;
    next();
  };
}

module.exports = { registerSchema, loginSchema, childSchema, childAllergenSchema, sessionSchema, validate };
