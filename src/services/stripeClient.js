'use strict';

const Stripe = require('stripe');
const env = require('../config/env');

let client = null;

function getStripe() {
  if (!env.stripe.secretKey) return null;
  if (!client) client = new Stripe(env.stripe.secretKey);
  return client;
}

module.exports = { getStripe };
