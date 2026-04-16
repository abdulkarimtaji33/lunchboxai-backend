'use strict';

const OpenAI        = require('openai');
const { openrouter: { apiKey: openrouterKey } } = require('../config/env');
const { resizeForApi, getMimeTypeFromPath } = require('./imageService');
const NutritionGoal = require('../models/NutritionGoal');

const openai = new OpenAI({
  apiKey: openrouterKey,
  baseURL: 'https://openrouter.ai/api/v1',
});

const VISION_PROMPT =
  'Analyze this lunchbox image. Count compartment wells only from what you see (indented/divided areas meant to hold food) — do not assume a count from names or text. ' +
  'Describe the container so it could be recreated exactly; explicitly state how many compartments you counted (e.g. "four compartments"). ' +
  'Start your response directly with the description. dont count the lid of the lunchbox.';

// --- Exact same compartment/shape/orientation parsing as working server.js ---
function parseLunchboxDescription(description) {
  const WORD_TO_NUM = { single:1, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8 };
  const countMatch = description.match(/(\d+|single|one|two|three|four|five|six|seven|eight)\s+(?:compartments?|sections?|parts?)/i);
  // also catch "no dividers", "no divisions", "no additional dividers", "undivided"
  const noDividers = /\b(no\s+(additional\s+)?(dividers?|divisions?|sections?|compartments?|partitions?)|undivided|single\s+compartment|single\s+space)\b/i.test(description);
  let compartmentCount = 3;
  if (noDividers) {
    compartmentCount = 1;
  } else if (countMatch) {
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

function ageFromDob(dateOfBirth) {
  if (!dateOfBirth) return null;
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return null;
  const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.max(0, Math.floor(years));
}

/** Parse comma-separated or JSON array of nutrition goal keys from session override */
function parseNutritionGoalKeys(overrideVal) {
  if (overrideVal == null || overrideVal === '') return [];
  if (Array.isArray(overrideVal)) return overrideVal.map(String).map(s => s.trim()).filter(Boolean);
  const s = String(overrideVal).trim();
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      return Array.isArray(arr) ? arr.map(String).map(x => x.trim()).filter(Boolean) : [];
    } catch { /* fall through */ }
  }
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

async function nutritionGoalsTextFromKeys(keys) {
  if (!keys.length) return null;
  const parts = [];
  for (const key of keys) {
    const g = await NutritionGoal.findByKey(key);
    if (g) parts.push(g.label);
    else parts.push(key);
  }
  return parts.join('; ');
}

function schoolRulesFromProfile(schoolRules) {
  if (!schoolRules?.length) return '';
  return schoolRules
    .map(r => {
      const d = r.description && String(r.description).trim();
      return d ? `${r.name}: ${d}` : r.name;
    })
    .join('; ');
}

/**
 * Session + child context for vision and image prompts. Includes child profile school rules
 * and nutrition goals, merged with session overrides; session notes, prep, dislikes; allergens.
 */
async function buildSessionAiContext({ child, allergens = [], sessionOverrides = {} }) {
  const lines = [];

  if (child?.name) lines.push(`- Child name: ${child.name}`);
  const age = child?.age ?? ageFromDob(child?.date_of_birth);
  if (age != null) lines.push(`- Age: ${age} years old`);

  const dislikes = sessionOverrides.dislikes_override;
  if (dislikes) lines.push(`- Foods to avoid (dislikes): ${dislikes}`);

  const profileSchoolText = schoolRulesFromProfile(child?.school_rules);
  const schoolRules = sessionOverrides.school_rules_override;
  if (profileSchoolText || schoolRules) {
    const parts = [];
    if (profileSchoolText) parts.push(profileSchoolText);
    if (schoolRules && String(schoolRules).trim()) parts.push(String(schoolRules).trim());
    lines.push(`- School rules: ${parts.join(' — ')}`);
  }

  const prepTime = sessionOverrides.prep_time_minutes;
  if (prepTime) lines.push(`- Max prep time: ${prepTime} minutes`);

  if (allergens.length) {
    lines.push(`- Strictly avoid (allergens): ${allergens.map(a => `${a.name} (${a.severity})`).join(', ')}`);
  }

  const profileNutritionKeys = (child?.nutrition_goals || []).map(g => g.goal_key).filter(Boolean);
  const sessionNutritionKeys = parseNutritionGoalKeys(sessionOverrides.nutrition_goal_override);
  const nutritionKeysMerged = [...new Set([...profileNutritionKeys, ...sessionNutritionKeys])];
  const nutText = await nutritionGoalsTextFromKeys(nutritionKeysMerged);
  if (nutText) lines.push(`- Nutritional goals: ${nutText}`);

  if (child?.calorie_target) lines.push(`- Target calories: ~${child.calorie_target} kcal`);
  if (child?.protein_target) lines.push(`- Target protein: ~${child.protein_target}g`);

  if (sessionOverrides.notes) lines.push(`- Parent notes for this meal: ${sessionOverrides.notes}`);

  if (!lines.length) return '';

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

  const sessionContext = await buildSessionAiContext({ child, allergens, sessionOverrides });

  const textContent = sessionContext
    ? `Use the following when reasoning about what foods belong in this lunchbox (allergies and notes are mandatory):\n${sessionContext}\n\n${VISION_PROMPT}`
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

function normalizeFoodItemNames(foodItems) {
  if (!Array.isArray(foodItems)) return [];
  return foodItems
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && item.name) return String(item.name).trim();
      return String(item || '').trim();
    })
    .filter(Boolean);
}

/**
 * Shopping / prep ingredients to make the suggested lunchbox foods, respecting session context (allergens, etc.).
 */
async function suggestCookingIngredients(foodItems, sessionContext) {
  const names = normalizeFoodItemNames(foodItems);
  if (!names.length) return [];

  const contextBlock = sessionContext && String(sessionContext).trim()
    ? `Mandatory constraints from the parent/child profile:\n${sessionContext}\n\n`
    : '';

  const prompt = `${contextBlock}Planned lunchbox items (already selected): ${names.join('; ')}.

Produce a shopping-and-prep list: items you would buy or measure out in the kitchen to create those foods, in their usual retail or pantry form, or as the parts needed to cook or mix them. The list must not restate the same foods as they would appear packed and ready in the lunchbox.

If an entry is a single simple product, use the form you would purchase or take from storage before any lunchbox-specific cutting or portioning. If an entry is made from several components, list those components rather than the finished dish as one line.

Return only this JSON shape with no other text: {"ingredients":["..."]}. Deduplicate entries. Follow every constraint stated above in this message.`;

  const response = await openai.chat.completions.create({
    model:       'openai/gpt-4o',
    messages:    [{ role: 'user', content: prompt }],
    max_tokens:  600,
    temperature: 0.1,
  });

  const raw = (response.choices[0].message.content || '').trim();
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : JSON.parse(raw);
    const list = Array.isArray(parsed.ingredients) ? parsed.ingredients : [];
    return list.map((x) => String(x).trim()).filter(Boolean);
  } catch (err) {
    console.log('suggestCookingIngredients parse error:', err.message);
    return [];
  }
}

module.exports = {
  analyzeLunchbox,
  identifyIngredients,
  buildSessionAiContext,
  suggestCookingIngredients,
};
