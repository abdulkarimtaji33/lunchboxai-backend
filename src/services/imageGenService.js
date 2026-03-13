'use strict';

const OpenAI = require('openai');
const { OPENAI_API_KEY } = require('../config/env');

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Exact same verification prompt as working server.js ---
const VERIFICATION_PROMPT =
  'Analyze this generated lunchbox image and return ONLY valid JSON in this schema: ' +
  '{"compartment_count":number,"shape":"rectangular|square|round|other","orientation":"landscape|portrait|square"}.';

async function generateFilledLunchbox({ lunchboxDescription, compartmentCount, shape, orientation, randomFoods }) {
  // --- Exact same DALL-E prompt template as working server.js ---
  const dallePrompt = `Professional food photography: top-down view of a lunchbox matching this description: ${lunchboxDescription}

STRICT REQUIREMENTS:
- Match the EXACT lunchbox described above (same shape, color, compartment count and layout)
- Container must be OPEN (no lid, no cover)
- Fill EACH of the ${compartmentCount} compartments with ONE food item from this list: ${randomFoods.join(', ')}
- Use exactly ${compartmentCount} foods total (one per compartment)
- NO extra containers, NO duplicate lunchboxes, NO additional trays
- Keep the same compartment arrangement as described

Style: Clean white background, bright natural lighting, sharp focus, appetizing presentation, realistic food photography.`;

  console.log('Step 2: Generating filled lunchbox with gpt-image-1.5...');

  // --- Exact same generation loop as working server.js (maxAttempts = 1) ---
  const maxAttempts = 1;
  let bestResult    = null;
  const attemptSummaries = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Generation attempt ${attempt}/${maxAttempts}`);

    // --- Exact same image.generate params as working server.js ---
    const imageResponse = await openai.images.generate({
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

    // --- Exact same verification call as working server.js ---
    let generatedAnalysis = { compartment_count: -1, shape: 'unknown', orientation: 'unknown' };
    try {
      const verificationResponse = await openai.chat.completions.create({
        model:    'gpt-4o',
        messages: [{
          role:    'user',
          content: [
            { type: 'text',      text:      VERIFICATION_PROMPT },
            { type: 'image_url', image_url: { url: candidateUrl } },
          ],
        }],
        max_tokens: 120,
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
      bestResult = { url: candidateUrl, b64: imageResponse.data[0].b64_json || null, score, generatedAnalysis };
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

  return {
    filledImageDataUrl: bestResult.url,
    filledImageB64:     bestResult.b64,
    foodItems:          randomFoods,
    attemptSummaries,
    generatedAnalysis:  bestResult.generatedAnalysis,
  };
}

module.exports = { generateFilledLunchbox };
