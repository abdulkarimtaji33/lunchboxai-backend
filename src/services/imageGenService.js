'use strict';

const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');
const OpenAI = require('openai');
const { openai: { apiKey: openaiKey }, openrouter: { apiKey: openrouterKey } } = require('../config/env');

// Direct OpenAI — for old flow (images.generate / images.edit)
const openaiDirect = new OpenAI({ apiKey: openaiKey });

// OpenRouter — for new flow (gpt-5-image-mini) and all verification chat calls
const openrouter = new OpenAI({ apiKey: openrouterKey, baseURL: 'https://openrouter.ai/api/v1' });

// Supported OpenRouter aspect ratios and their decimal values
const ASPECT_RATIOS = [
  { ratio: '1:1',  value: 1 },
  { ratio: '4:3',  value: 4/3 },
  { ratio: '3:4',  value: 3/4 },
  { ratio: '3:2',  value: 3/2 },
  { ratio: '2:3',  value: 2/3 },
  { ratio: '16:9', value: 16/9 },
  { ratio: '9:16', value: 9/16 },
  { ratio: '4:5',  value: 4/5 },
  { ratio: '5:4',  value: 5/4 },
  { ratio: '21:9', value: 21/9 },
];

function detectAspectRatio(width, height) {
  if (!width || !height) return '1:1';
  const target = width / height;
  let closest = ASPECT_RATIOS[0];
  let minDiff  = Math.abs(target - closest.value);
  for (const ar of ASPECT_RATIOS) {
    const diff = Math.abs(target - ar.value);
    if (diff < minDiff) { minDiff = diff; closest = ar; }
  }
  return closest.ratio;
}

const VERIFICATION_PROMPT =
  'Analyze this generated lunchbox image and return ONLY valid JSON in this schema: ' +
  '{"compartment_count":number,"shape":"rectangular|square|round|other","orientation":"landscape|portrait|square","food_items":["food1","food2"]}. ' +
  'List every food item you can see placed in the lunchbox in food_items.';

async function generateFilledLunchbox({ lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients }) {
  const ingredientLine = identifiedIngredients
    ? `- AVAILABLE INGREDIENTS — you MUST use only these: ${identifiedIngredients}\n`
    : '- Choose healthy, colourful, appealing foods that children enjoy (e.g. fruit slices, veggie sticks, sandwiches, cheese, crackers, yogurt, boiled eggs)\n';

  const dallePrompt = `Professional food photography: top-down view of a lunchbox matching this description: ${lunchboxDescription}

STRICT REQUIREMENTS:
- Match the EXACT lunchbox described above (same shape, color, compartment count and layout)
- Container must be OPEN (no lid, no cover)
- Fill EACH of the ${compartmentCount} compartments with ONE age-appropriate, kid-friendly food item
${ingredientLine}- Use exactly ${compartmentCount} foods total (one per compartment)
- NO extra containers, NO duplicate lunchboxes, NO additional trays
- Keep the same compartment arrangement as described

Style: Clean white background, bright natural lighting, sharp focus, appetizing presentation, realistic food photography.`;

  console.log('Step 2: Generating filled lunchbox with gpt-image-1.5...');
  console.log('Generate prompt:\n', dallePrompt);

  // --- Exact same generation loop as working server.js (maxAttempts = 1) ---
  const maxAttempts = 1;
  let bestResult    = null;
  const attemptSummaries = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Generation attempt ${attempt}/${maxAttempts}`);

    // --- Exact same image.generate params as working server.js ---
    const imageResponse = await openaiDirect.images.generate({
      model:      'gpt-image-1',
      prompt:     dallePrompt,
      n:          1,
      size:       'auto',
      quality:    'low',
      background: 'opaque',
    });

    // --- Exact same b64 extraction logic as working server.js ---
    const candidateB64 = imageResponse.data[0].b64_json || imageResponse.data[0].url;
    let candidateUrl;
    if (imageResponse.data[0].b64_json) {
      candidateUrl = `data:image/png;base64,${candidateB64}`;
    } else {
      candidateUrl = candidateB64;
    }

    // --- Verification: structure check + food item extraction ---
    let generatedAnalysis = { compartment_count: -1, shape: 'unknown', orientation: 'unknown', food_items: [] };
    try {
      const verificationResponse = await openrouter.chat.completions.create({
        model:    'openai/gpt-4o',
        messages: [{
          role:    'user',
          content: [
            { type: 'text',      text:      VERIFICATION_PROMPT },
            { type: 'image_url', image_url: { url: candidateUrl } },
          ],
        }],
        max_tokens: 300,
      });
      const raw   = (verificationResponse.choices[0].message.content || '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      generatedAnalysis = match ? JSON.parse(match[0]) : JSON.parse(raw);
    } catch (err) {
      console.log(`Verification failed on attempt ${attempt}:`, err.message);
    }

    // --- Exact same scoring logic as working server.js ---
    const generatedCount       = Number(generatedAnalysis.compartment_count) || -1;
    const generatedShape       = String(generatedAnalysis.shape       || '').toLowerCase();
    const generatedOrientation = String(generatedAnalysis.orientation || '').toLowerCase();

    const countDelta        = generatedCount < 0 ? 99 : Math.abs(generatedCount - compartmentCount);
    const shapePenalty      = (shape && generatedShape       && shape       !== generatedShape)       ? 1 : 0;
    const orientationPenalty= (orientation && generatedOrientation && orientation !== generatedOrientation) ? 1 : 0;
    const score             = countDelta * 10 + shapePenalty * 3 + orientationPenalty * 2;

    const summary = { attempt, generatedCount, generatedShape, generatedOrientation, score };
    attemptSummaries.push(summary);
    console.log('Attempt summary:', summary);

    if (!bestResult || score < bestResult.score) {
      bestResult = { url: candidateUrl, b64: imageResponse.data[0].b64_json || null, score, generatedAnalysis, foodItems: generatedAnalysis.food_items || [] };
    }

    if (
      generatedCount === compartmentCount &&
      (!shape || !generatedShape       || generatedShape       === shape)       &&
      (!orientation || !generatedOrientation || generatedOrientation === orientation)
    ) {
      console.log(`Accepted attempt ${attempt}: exact structural match.`);
      break;
    }
  }

  console.log('Food items in generated lunchbox:', bestResult.foodItems);
  return {
    filledImageDataUrl: bestResult.url,
    filledImageB64:     bestResult.b64,
    foodItems:          bestResult.foodItems,
    attemptSummaries,
    generatedAnalysis:  bestResult.generatedAnalysis,
  };
}

// --- Image EDIT flow: uses the actual lunchbox photo as base image ---
async function generateFilledLunchboxEdit({ lunchboxImagePath, lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients }) {
  const ingredientLine = identifiedIngredients
    ? `- AVAILABLE INGREDIENTS: ${identifiedIngredients}`
    : '- Choose healthy, colourful, appealing foods that children enjoy';

  const editPrompt =
    `This is a photo of an empty lunchbox. Fill it with food items.

STRICT REQUIREMENTS:
- Keep the lunchbox container exactly as shown (same shape, color, compartment layout)
- Container must remain OPEN (no lid, no cover)
- Fill EACH of the ${compartmentCount} compartments with ONE age-appropriate, kid-friendly food item
${ingredientLine}
- Use exactly ${compartmentCount} foods total (one per compartment)
- Each food should look fresh, appetizing, and realistic
- Do NOT add extra containers, trays, or duplicate lunchboxes

Style: Bright natural lighting, sharp focus, professional food photography.`;

  console.log('Step 2 (edit): Editing lunchbox image with gpt-image-1...');
  console.log('Edit prompt:\n', editPrompt);

  // Convert image to PNG buffer (required by images.edit)
  const pngBuffer = await sharp(fs.readFileSync(lunchboxImagePath))
    .png()
    .toBuffer();

  // Wrap buffer as a File object for the OpenAI SDK
  const { toFile } = require('openai');
  const imageFile = await toFile(pngBuffer, 'lunchbox.png', { type: 'image/png' });

  const imageResponse = await openaiDirect.images.edit({
    model:   'gpt-image-1.5',
    image:   imageFile,
    prompt:  editPrompt,
    n:       1,
    size:    'auto',
    quality: 'low',
  });

  const candidateB64 = imageResponse.data[0].b64_json || imageResponse.data[0].url;
  let filledImageDataUrl;
  if (imageResponse.data[0].b64_json) {
    filledImageDataUrl = `data:image/png;base64,${candidateB64}`;
  } else {
    filledImageDataUrl = candidateB64;
  }

  // Verify generated image + extract food items
  let generatedAnalysis = { compartment_count: -1, shape: 'unknown', orientation: 'unknown', food_items: [] };
  try {
    const verificationResponse = await openrouter.chat.completions.create({
      model:    'openai/gpt-4o',
      messages: [{
        role:    'user',
        content: [
          { type: 'text',      text:      VERIFICATION_PROMPT },
          { type: 'image_url', image_url: { url: filledImageDataUrl } },
        ],
      }],
      max_tokens: 300,
    });
    const raw   = (verificationResponse.choices[0].message.content || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    generatedAnalysis = match ? JSON.parse(match[0]) : JSON.parse(raw);
  } catch (err) {
    console.log('Edit verification failed:', err.message);
  }

  const foodItems = generatedAnalysis.food_items || [];
  console.log('Edit generation complete. Food items:', foodItems);

  return {
    filledImageDataUrl,
    filledImageB64:    imageResponse.data[0].b64_json || null,
    foodItems,
    attemptSummaries:  [{ attempt: 1, ...generatedAnalysis, score: 0 }],
    generatedAnalysis,
  };
}

// --- OpenRouter flow: uses gpt-5-image-mini via chat completions ---
async function generateFilledLunchboxOpenRouter({ lunchboxImagePath, lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients }) {
  const ingredientLine = identifiedIngredients
    ? `- AVAILABLE INGREDIENTS: ${identifiedIngredients}`
    : '- Choose healthy, colourful, appealing foods that children enjoy';

  const prompt =
    `This is a photo of an empty lunchbox. Fill it with food items.

STRICT REQUIREMENTS:
- Keep the lunchbox container exactly as shown (same shape, color, compartment layout)
- Container must remain OPEN (no lid, no cover)
- Fill EACH of the ${compartmentCount} compartments with ONE age-appropriate, kid-friendly food item
${ingredientLine}
- Use exactly ${compartmentCount} foods total (one per compartment)
- Each food should look fresh, appetizing, and realistic
- Do NOT add extra containers, trays, or duplicate lunchboxes

CRITICAL COMPOSITION RULES:
- The lunchbox must be fully visible within the frame
- Do NOT zoom in or crop any part of the lunchbox, its better to zoom out so the lunchbox is fully visible.
- Maintain identical framing, margins, and camera distance as the original image
- Preserve exact positioning and spacing of all compartments
- The output must look like the SAME photo, only with food added

Style: Bright natural lighting, sharp focus, professional food photography.`;

  console.log('Step 2 (openrouter): Generating with gpt-5-image-mini...');
  console.log('Prompt:\n', prompt);

  const imgMeta   = await sharp(fs.readFileSync(lunchboxImagePath)).metadata();
  const aspectRatio = detectAspectRatio(imgMeta.width, imgMeta.height);
  const pngBuffer  = await sharp(fs.readFileSync(lunchboxImagePath)).png().toBuffer();
  const pngDataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  console.log(`Input image: ${imgMeta.width}x${imgMeta.height} → aspect_ratio: ${aspectRatio}`);

  const imageResponse = await openrouter.chat.completions.create({
    model:        'openai/gpt-5-image-mini',
    modalities:   ['image', 'text'],
    image_config: { aspect_ratio: aspectRatio, image_size: '1K' },
    messages:     [{
      role:    'user',
      content: [
        { type: 'text',      text:      prompt },
        { type: 'image_url', image_url: { url: pngDataUrl } },
      ],
    }],
  });

  const msg = imageResponse.choices[0].message;
  const imgItem = (msg.images || []).find(i => i.type === 'image_url');
  const filledImageDataUrl = imgItem?.image_url?.url || null;
  const b64match = filledImageDataUrl?.match(/^data:image\/\w+;base64,(.+)$/);
  const filledImageB64 = b64match ? b64match[1] : null;

  // Verify + extract food items
  let generatedAnalysis = { compartment_count: -1, shape: 'unknown', orientation: 'unknown', food_items: [] };
  if (filledImageDataUrl) {
    try {
      const verificationResponse = await openrouter.chat.completions.create({
        model:    'openai/gpt-4o',
        messages: [{
          role:    'user',
          content: [
            { type: 'text',      text:      VERIFICATION_PROMPT },
            { type: 'image_url', image_url: { url: filledImageDataUrl } },
          ],
        }],
        max_tokens: 300,
      });
      const raw   = (verificationResponse.choices[0].message.content || '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      generatedAnalysis = match ? JSON.parse(match[0]) : JSON.parse(raw);
    } catch (err) {
      console.log('OpenRouter verification failed:', err.message);
    }
  }

  const foodItems = generatedAnalysis.food_items || [];
  console.log('OpenRouter generation complete. Food items:', foodItems);

  return {
    filledImageDataUrl,
    filledImageB64,
    foodItems,
    attemptSummaries: [{ attempt: 1, ...generatedAnalysis, score: 0 }],
    generatedAnalysis,
  };
}

module.exports = { generateFilledLunchbox, generateFilledLunchboxEdit, generateFilledLunchboxOpenRouter };
