'use strict';

const OpenAI        = require('openai');
const { openrouter: { apiKey: openrouterKey } } = require('../config/env');
const { resizeForApi, getMimeTypeFromPath } = require('./imageService');
const NutritionGoal = require('../models/NutritionGoal');

const openai = new OpenAI({
  apiKey: openrouterKey,
  baseURL: 'https://openrouter.ai/api/v1',
});

// --- Exact same vision prompt as working server.js ---
const VISION_PROMPT = `Analyze this lunchbox image carefully and describe it. I should be able to recreate the lunchbox exactly. Start your response directly with the description.`;

// --- Exact same compartment/shape/orientation parsing as working server.js ---
function parseLunchboxDescription(description) {
  const WORD_TO_NUM = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8 };
  const countMatch = description.match(/(\d+|one|two|three|four|five|six|seven|eight)\s+(?:compartments?|sections?|parts?)/i);
  let compartmentCount = 3;
  if (countMatch) {
    const raw = countMatch[1].toLowerCase();
    const n = WORD_TO_NUM[raw] ?? parseInt(raw, 10);
    compartmentCount = Math.max(1, Math.min(8, n));
  }

  const descLower = description.toLowerCase();
  let shape       = 'rectangular';
  let orientation = 'landscape';

  if (descLower.includes('square')) {
    shape       = 'square';
    orientation = 'square';
  } else if (
    descLower.includes('portrait') ||
    descLower.includes('taller')   ||
    descLower.includes('vertical')
  ) {
    orientation = 'portrait';
  } else if (
    descLower.includes('landscape')   ||
    descLower.includes('wider')       ||
    descLower.includes('horizontal')  ||
    descLower.includes('rectangular')
  ) {
    orientation = 'landscape';
  }

  return { compartmentCount, shape, orientation };
}

// --- Build child context string for the prompt ---
async function buildChildContext({ child, allergens, sessionOverrides }) {
  if (!child && !allergens?.length) return '';

  const lines = ['Child profile:'];

  if (child?.name) lines.push(`- Name: ${child.name}`);
  if (child?.age)  lines.push(`- Age: ${child.age} years old`);

  const dislikes = sessionOverrides?.dislikes_override ?? child?.dislikes;
  if (dislikes)    lines.push(`- Foods to avoid (dislikes): ${dislikes}`);

  const schoolRules = sessionOverrides?.school_rules_override ?? child?.school_rules;
  if (schoolRules)  lines.push(`- School rules: ${schoolRules}`);

  const prepTime = sessionOverrides?.prep_time_minutes ?? child?.prep_time_minutes;
  if (prepTime)     lines.push(`- Max prep time: ${prepTime} minutes`);

  if (allergens?.length) {
    const allergenList = allergens.map(a => `${a.name} (${a.severity})`).join(', ');
    lines.push(`- Strictly avoid: ${allergenList}`);
  }

  // Fetch nutrition goal description from DB
  const goalKey = sessionOverrides?.nutrition_goal_override ?? child?.nutrition_goal ?? 'balanced';
  const goalRecord = await NutritionGoal.findByKey(goalKey);
  const goalDesc = goalRecord?.description || goalKey;
  lines.push(`- Nutritional goal: ${goalDesc}`);

  if (child?.calorie_target) lines.push(`- Target calories: ~${child.calorie_target} kcal`);
  if (child?.protein_target) lines.push(`- Target protein: ~${child.protein_target}g`);

  if (sessionOverrides?.notes) lines.push(`- Parent notes: ${sessionOverrides.notes}`);

  return lines.join('\n');
}

const buildImageBlock = async (filePath) => {
  const buffer   = await resizeForApi(filePath);
  const base64   = buffer.toString('base64');
  const mimeType = getMimeTypeFromPath(filePath);
  return {
    type: 'image_url',
    image_url: { url: `data:${mimeType};base64,${base64}` },
  };
};

// --- Identify ingredients from uploaded photos ---
async function identifyIngredients(ingredientImagePaths) {
  if (!ingredientImagePaths.length) return null;

  console.log(`Identifying ingredients from ${ingredientImagePaths.length} image(s)...`);

  const ingredientBlocks = await Promise.all(ingredientImagePaths.map(buildImageBlock));

  const response = await openai.chat.completions.create({
    model: 'openai/gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Look at these ingredient images and list every food item you can identify. Return ONLY a comma-separated list of ingredient names, nothing else. Example: "chicken breast, cherry tomatoes, cucumber, cheddar cheese, apple slices"',
        },
        ...ingredientBlocks,
      ],
    }],
    max_tokens: 200,
    temperature: 0.1,
  });

  const result = (response.choices[0].message.content || '').trim();
  console.log('Identified ingredients:', result);
  return result;
}

async function analyzeLunchbox({ lunchboxImagePath, child, allergens = [], sessionOverrides = {} }) {
  const lunchboxBlock = await buildImageBlock(lunchboxImagePath);

  const childContext = await buildChildContext({ child, allergens, sessionOverrides });

  const textContent = childContext
    ? `${childContext}\n\n${VISION_PROMPT}`
    : VISION_PROMPT;

  const content = [
    { type: 'text', text: textContent },
    lunchboxBlock,
  ];

  console.log('Step 1: Analyzing lunchbox with gpt-4o...');

  const visionResponse = await openai.chat.completions.create({
    model:       'gpt-4o',
    messages:    [{ role: 'user', content }],
    max_tokens:  150,
    temperature: 0.1,
  });

  const lunchboxDescription = (visionResponse.choices[0].message.content || '').trim();
  console.log('Lunchbox description:', lunchboxDescription);

  const { compartmentCount, shape, orientation } = parseLunchboxDescription(lunchboxDescription);

  return { lunchboxDescription, compartmentCount, shape, orientation };
}

module.exports = { analyzeLunchbox, identifyIngredients };
