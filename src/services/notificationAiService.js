'use strict';

const OpenAI = require('openai');
const { openrouter: { apiKey: openrouterKey } } = require('../config/env');

const openrouter = new OpenAI({ apiKey: openrouterKey, baseURL: 'https://openrouter.ai/api/v1' });

/**
 * @param {string} hint - Theme or instructions for the marketing push
 * @returns {{ title: string, body: string }}
 */
async function generateMarketingNotification(hint) {
  const prompt =
    'You write short creative fun mobile push notifications for a family app called LunchBox AI (AI lunchbox meal ideas genrator for kids).\n' +
    'Return ONLY valid JSON, no markdown: {"title":"...","body":"..."}\n' +
    'Rules: title max 48 characters; body max 178 characters; friendly, one clear call to action.';

  const res = await openrouter.chat.completions.create({
    model:    'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
    temperature: 0.85,
  });

  const raw = (res.choices[0].message.content || '').trim();
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
  const title = String(parsed.title || 'LunchBox AI').slice(0, 48);
  const body = String(parsed.body || '').slice(0, 178);
  return { title, body };
}

module.exports = { generateMarketingNotification };
