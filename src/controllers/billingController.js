'use strict';

const User = require('../models/User');
const { getStripe } = require('../services/stripeClient');
const { resolvePacksWithStripe } = require('../config/billing');
const env = require('../config/env');
const { formatResponse, formatError } = require('../utils/helpers');

async function listPlans(req, res, next) {
  try {
    const { packsPublic, stripeConfigured } = await resolvePacksWithStripe();
    res.json(formatResponse({
      packs: packsPublic,
      stripeConfigured: Boolean(env.stripe.secretKey && stripeConfigured),
    }));
  } catch (err) {
    next(err);
  }
}

async function createCheckout(req, res, next) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json(formatError('Stripe is not configured', 'NOT_CONFIGURED'));
    }

    const packKey = String(req.body.packKey || '').trim();
    const { packsFull } = await resolvePacksWithStripe();
    const pack = packsFull.find((p) => p.key === packKey);
    if (!pack?.stripePriceId) {
      return res.status(400).json(formatError('Invalid pack', 'VALIDATION_ERROR'));
    }

    const ctx = await User.findBillingContext(req.user.id);
    if (!ctx) return res.status(404).json(formatError('User not found', 'NOT_FOUND'));

    const successUrl = `${env.frontendUrl.replace(/\/$/, '')}/billing?success=1`;
    const cancelUrl = `${env.frontendUrl.replace(/\/$/, '')}/billing?canceled=1`;

    const sessionParams = {
      mode: 'payment',
      line_items: [{ price: pack.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(ctx.id),
        packKey: pack.key,
        generations: String(pack.generations),
      },
    };

    if (ctx.stripe_customer_id) {
      sessionParams.customer = ctx.stripe_customer_id;
    } else {
      sessionParams.customer_email = ctx.email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json(formatResponse({ url: session.url }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listPlans, createCheckout };
