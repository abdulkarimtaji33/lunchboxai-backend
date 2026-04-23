'use strict';

const Stripe = require('stripe');
const env = require('../config/env');
const User = require('../models/User');
const StripeEvent = require('../models/StripeEvent');

async function handleWebhook(req, res) {
  const stripe = env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;
  if (!stripe || !env.stripe.webhookSecret) {
    return res.status(503).send('Webhook not configured');
  }

  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripe.webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true });
  }

  const session = event.data.object;
  const userId = parseInt(session.metadata?.userId, 10);
  const packKey = session.metadata?.packKey;
  const generations = parseInt(session.metadata?.generations, 10);

  if (!userId || !packKey || !Number.isFinite(generations) || generations < 1) {
    console.warn('billing webhook: bad metadata', session.id, session.metadata);
    return res.json({ received: true });
  }

  const first = await StripeEvent.insertIfNew(event.id);
  if (!first) {
    return res.json({ received: true });
  }

  try {
    if (session.customer && typeof session.customer === 'string') {
      await User.setStripeCustomerId(userId, session.customer);
    }
    await User.addGenerationCredits(userId, generations);
  } catch (e) {
    console.error('billing webhook apply failed', e);
    return res.status(500).send('Apply failed');
  }

  return res.json({ received: true });
}

module.exports = { handleWebhook };
