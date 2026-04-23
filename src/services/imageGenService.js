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
  'Analyze this lunchbox image and return ONLY valid JSON in this exact schema: ' +
  '{"compartment_count":number,"shape":"rectangular|square|round|other","orientation":"landscape|portrait|square","food_items":["food1","food2"],"cooking_ingredients":["item1","item2"]}. ' +
  'food_items: every food you see placed in the lunchbox. ' +
  'cooking_ingredients: the specific grocery/supermarket items a parent needs to buy to make those foods (e.g. "baby carrots", "cheddar cheese", "whole wheat bread"). Each entry must be a real purchasable product — never a vague phrase like "dip ingredients".';

function sessionPreferencesBlock(sessionContext) {
  const t = sessionContext && String(sessionContext).trim();
  if (!t) return '';
  return `\nSESSION PREFERENCES (must follow when choosing and depicting foods):\n${t}\n`;
}

/** Keeps food off lids/covers when the reference image shows a closed container. */
const COVER_AND_LID_RULES = `
COVER / LID (must follow):
- If the image shows a lid, hinged cover, top flap, or separate cover piece: do NOT put any food on it. The lid/cover is NOT a food surface.
- Depict the lunchbox OPEN: omit the lid or move it fully aside so every compartment interior is visible.
- Place food ONLY inside the compartment wells (the indented/divided areas). Never on the outer rim, never on the lid, never on a closed top.
- Do not draw food overlapping or sitting on the cover even if the cover appears in frame.
`;

async function generateFilledLunchbox({ lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients, sessionContext }) {
  const ingredientLine = identifiedIngredients
    ? `- AVAILABLE INGREDIENTS — you MUST use only these: ${identifiedIngredients}\n`
    : '- You decide what goes in each compartment — pick your own varied, balanced, age-appropriate foods; do not follow any fixed or example menu.\n';

  const dallePrompt = `Professional food photography: top-down view of a lunchbox matching this description: ${lunchboxDescription}

STRICT REQUIREMENTS:
- Match the EXACT lunchbox described above (same shape, color, compartment count and layout)
- Container must be OPEN (no lid, no cover)
- Fill EACH of the ${compartmentCount} compartments with ONE age-appropriate, kid-friendly food item
${ingredientLine}- Use exactly ${compartmentCount} foods total (one per compartment)
- NO extra containers, NO duplicate lunchboxes, NO additional trays
- Keep the same compartment arrangement as described
${COVER_AND_LID_RULES}
${sessionPreferencesBlock(sessionContext)}
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
        max_tokens: 500,
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
      bestResult = { url: candidateUrl, b64: imageResponse.data[0].b64_json || null, score, generatedAnalysis, foodItems: generatedAnalysis.food_items || [], cookingIngredients: generatedAnalysis.cooking_ingredients || [] };
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
    filledImageDataUrl:  bestResult.url,
    filledImageB64:      bestResult.b64,
    foodItems:           bestResult.foodItems,
    cookingIngredients:  bestResult.cookingIngredients,
    attemptSummaries,
    generatedAnalysis:   bestResult.generatedAnalysis,
  };
}

// --- Image EDIT flow: uses the actual lunchbox photo as base image ---
async function generateFilledLunchboxEdit({ lunchboxImagePath, compartmentCount, identifiedIngredients, sessionContext }) {
  const ingredientLine = identifiedIngredients
    ? `- AVAILABLE INGREDIENTS (that must be used): ${identifiedIngredients}`
    : '- You decide what foods to add — varied, balanced, kid-friendly with ONE main dish';

  const n = Number(compartmentCount);
  const singleCavity = n === 1;
  const fillRules = singleCavity
    ? `- Keep the lunchbox container exactly as shown (same shape, color); the photo and the description above must agree
- Container must remain OPEN (no lid, no cover)
- This lunchbox has ONE undivided interior — no dividers, walls, or separate wells. Do NOT add any internal partitions or lines that split the space into multiple compartments.
${ingredientLine}
- Fill that single open space with age-appropriate, kid-friendly food (a small natural mix in one cavity is fine)
- Each food should look fresh, appetizing, and realistic
- This is the lunchbox of a single kid, so the food variety and quantity should be appropriate for a child.
- Do NOT add any lines or dividers or compartments inside the lunchbox. 
- Do NOT change the inner shape of the lunchbox.
- Do NOT add extra containers, trays, or duplicate lunchboxes
- Do NOT change the outer shape of the lunchbox or introduce any divisions inside it.`
    : `- Keep the lunchbox container exactly as shown (same shape, color, compartment layout); the photo and the description above must agree
- Container must remain OPEN (no lid, no cover)
- Fill EACH of the ${compartmentCount} compartments with ONE age-appropriate, kid-friendly food item (match the wells visible in this photo)
${ingredientLine}
- Use exactly ${compartmentCount} foods total (one per compartment)
- Each food should look fresh, appetizing, and realistic
- Do NOT add extra containers, trays, or duplicate lunchboxes
- Do NOT add or remove any compartments. Do NOT change the shape of the lunchbox.
- Remove the background of the image.
`;

  const editPrompt =
    `This is a photo of a lunchbox that is open. It has a bottom food tray and a lid. Fill ONLY the bottom food tray with food.

HOW TO IDENTIFY THE BOTTOM TRAY vs THE LID:
- The bottom tray is the darker-colored or deeper half — it is the part that sits on the table and holds food when packed.
- The lid is the lighter-colored or shallower half connected by a hinge. Even if the lid has its own molded compartments or wells, it is still the lid — do NOT put food in it.
- Look for the hinge connecting the two halves. The half that the hinge folds away from is the lid; the half that stays flat on the table is the bottom tray.

STRICT REQUIREMENTS:
${fillRules}
LID HANDLING:
- The lid half must appear empty and closed-looking or faded out — no food on it, no suggestion of food on it.
- Place food ONLY in the bottom tray's wells.
- Do NOT change the compartment layout, shape, or color of the bottom tray.
- Do NOT add or remove compartments from the bottom tray.
${sessionPreferencesBlock(sessionContext)}
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

  // Verify generated image + extract food items and cooking ingredients
  let generatedAnalysis = { compartment_count: -1, shape: 'unknown', orientation: 'unknown', food_items: [], cooking_ingredients: [] };
  try {
    const verificationResponse = await openrouter.chat.completions.create({
      model:    'openai/gpt-5-nano',
      messages: [{
        role:    'user',
        content: [
          { type: 'text',      text:      VERIFICATION_PROMPT },
          { type: 'image_url', image_url: { url: filledImageDataUrl } },
        ],
      }],
    });
    const raw   = (verificationResponse.choices[0].message.content || '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    generatedAnalysis = match ? JSON.parse(match[0]) : JSON.parse(raw);
  } catch (err) {
    console.log('Edit verification failed:', err.message);
  }

  const foodItems          = generatedAnalysis.food_items          || [];
  const cookingIngredients = generatedAnalysis.cooking_ingredients || [];
  console.log('Edit generation complete. Food items:', foodItems);
  console.log('Edit generation complete. Food items:', cookingIngredients);

  return {
    filledImageDataUrl,
    filledImageB64:    imageResponse.data[0].b64_json || null,
    foodItems,
    cookingIngredients,
    attemptSummaries:  [{ attempt: 1, ...generatedAnalysis, score: 0 }],
    generatedAnalysis,
  };
}

// --- OpenRouter flow: uses gpt-5-image-mini via chat completions ---
async function generateFilledLunchboxOpenRouter({ lunchboxImagePath, lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients, sessionContext }) {
  const ingredientLine = identifiedIngredients
    ? `- AVAILABLE INGREDIENTS: ${identifiedIngredients}`
    : '- You decide what foods to add — varied, balanced, kid-friendly; do not use a fixed or example list.';

  const n = Number(compartmentCount);
  const singleCavity = n === 1;
  const fillRules = singleCavity
    ? `- Keep the lunchbox container exactly as shown (same shape, color); the photo and the description above must agree
- Container must remain OPEN (no lid, no cover)
- This lunchbox has ONE undivided interior — no dividers or separate wells. Do NOT add internal partitions or lines that split the space into multiple compartments.
${ingredientLine}
- Fill that single open space with age-appropriate, kid-friendly food (a small natural mix in one cavity is fine)
- Each food should look fresh, appetizing, and realistic
- Do NOT add extra containers, trays, or duplicate lunchboxes
- Do NOT introduce any divisions inside the lunchbox.
- Do NOT fill the lid of the lunchbox.`
    : `- Keep the lunchbox container exactly as shown (same shape, color, compartment layout); the photo and the description above must agree
- Container must remain OPEN (no lid, no cover)
- Fill each distinct compartment well visible in this photo with ONE age-appropriate, kid-friendly food item (one food per well; match the number of foods to the wells you see)
${ingredientLine}
- Each food should look fresh, appetizing, and realistic
- Do NOT add extra containers, trays, or duplicate lunchboxes
- Do NOT add or remove any compartments.
- Do NOT fill the lid of the lunchbox.`;

  const compositionCompartments = singleCavity
    ? '- Preserve one continuous interior — no new dividers; spacing should match the empty photo'
    : '- Preserve exact positioning and spacing of all compartments';

  const prompt =
    `This is a photo of an empty lunchbox matching this description: ${lunchboxDescription}

Fill it with food items.

STRICT REQUIREMENTS:
${fillRules}
${sessionPreferencesBlock(sessionContext)}
CRITICAL COMPOSITION RULES:
- The lunchbox must be fully visible within the frame
- Do NOT zoom in or crop any part of the lunchbox, its better to zoom out so the lunchbox is fully visible.
- Maintain identical framing, margins, and camera distance as the original image
${compositionCompartments}
- The output must look like the SAME photo, only with food added
${COVER_AND_LID_RULES}

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
        max_tokens: 500,
      });
      const raw   = (verificationResponse.choices[0].message.content || '').trim();
      const match = raw.match(/\{[\s\S]*\}/);
      generatedAnalysis = match ? JSON.parse(match[0]) : JSON.parse(raw);
    } catch (err) {
      console.log('OpenRouter verification failed:', err.message);
    }
  }

  const foodItems          = generatedAnalysis.food_items          || [];
  const cookingIngredients = generatedAnalysis.cooking_ingredients || [];
  console.log('OpenRouter generation complete. Food items:', foodItems);

  return {
    filledImageDataUrl,
    filledImageB64,
    foodItems,
    cookingIngredients,
    attemptSummaries: [{ attempt: 1, ...generatedAnalysis, score: 0 }],
    generatedAnalysis,
  };
}

module.exports = { generateFilledLunchbox, generateFilledLunchboxEdit, generateFilledLunchboxOpenRouter };
