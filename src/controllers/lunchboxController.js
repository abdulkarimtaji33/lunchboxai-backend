'use strict';

const pool         = require('../config/database');
const LunchBox     = require('../models/LunchBox');
const Child        = require('../models/Child');
const { analyzeLunchbox }       = require('../services/aiService');
const { generateFilledLunchbox } = require('../services/imageGenService');
const { deleteFiles }           = require('../services/imageService');
const { formatResponse, formatError, paginate } = require('../utils/helpers');

async function createSession(req, res, next) {
  const uploadedPaths = [];
  let sessionId       = null;
  const startTime     = Date.now();
  const conn          = await pool.getConnection();

  try {
    // Validate lunchbox image upload
    if (!req.files?.lunchbox?.[0]) {
      return res.status(400).json(formatError('Lunchbox image is required', 'VALIDATION_ERROR'));
    }

    const lunchboxFile     = req.files.lunchbox[0];
    const ingredientFiles  = req.files.ingredients || [];

    uploadedPaths.push(lunchboxFile.path);
    ingredientFiles.forEach(f => uploadedPaths.push(f.path));

    // Parse body fields
    const {
      child_id, notes,
      dislikes_override, school_rules_override,
      prep_time_minutes, nutrition_goal_override,
      allergen_override_ids,
    } = req.body;

    // Parse allergen_override_ids (can arrive as JSON string from multipart)
    let allergenIds = [];
    if (allergen_override_ids) {
      try {
        allergenIds = typeof allergen_override_ids === 'string'
          ? JSON.parse(allergen_override_ids)
          : allergen_override_ids;
      } catch { allergenIds = []; }
    }

    // Fetch child profile (ownership-checked)
    let child = null;
    if (child_id) {
      child = await Child.findByIdAndUser(child_id, req.user.id);
      if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));
    }

    // --- BEGIN TRANSACTION ---
    await conn.beginTransaction();

    sessionId = await LunchBox.createSession(conn, {
      userId:               req.user.id,
      childId:              child?.id || null,
      lunchboxImagePath:    lunchboxFile.path,
      notes,
      dislikesOverride:     dislikes_override,
      schoolRulesOverride:  school_rules_override,
      prepTimeMinutes:      prep_time_minutes,
      nutritionGoalOverride:nutrition_goal_override,
    });

    await LunchBox.insertIngredientImages(conn, sessionId, ingredientFiles.map(f => f.path));

    if (allergenIds.length) {
      await LunchBox.insertSessionAllergenOverrides(conn, sessionId, allergenIds);
    }

    await LunchBox.updateStatus(conn, sessionId, 'processing');
    await conn.commit();

    // --- AI PIPELINE (outside transaction so DB lock isn't held) ---
    const allergens = await LunchBox.resolveAllergens(child?.id || 0, sessionId);

    const sessionOverrides = {
      dislikes_override, school_rules_override,
      prep_time_minutes, nutrition_goal_override, notes,
    };

    // Step 1: Vision analysis
    const { lunchboxDescription, compartmentCount, shape, orientation, randomFoods } =
      await analyzeLunchbox({
        lunchboxImagePath:    lunchboxFile.path,
        ingredientImagePaths: ingredientFiles.map(f => f.path),
        child,
        allergens,
        sessionOverrides,
      });

    // Step 2: Image generation
    const { filledImageDataUrl, filledImageB64, foodItems, attemptSummaries, generatedAnalysis } =
      await generateFilledLunchbox({ lunchboxDescription, compartmentCount, shape, orientation, randomFoods });

    const processingMs = Date.now() - startTime;

    // Step 3: Persist result
    await conn.beginTransaction();
    await LunchBox.attachResult(conn, sessionId, {
      aiTextResponse:    lunchboxDescription,
      suggestedItems:    foodItems.map(name => ({ name })),
      nutritionNotes:    null,
      arrangementDesc:   lunchboxDescription,
      funNote:           null,
      generatedImageB64: filledImageB64,
      generatedImagePath:null,
      aiModel:           'gpt-4o + gpt-image-1',
      tokensUsed:        null,
      processingMs,
    });
    await LunchBox.updateStatus(conn, sessionId, 'completed');
    await conn.commit();

    const session = await LunchBox.findByIdAndUser(sessionId, req.user.id);

    res.status(201).json(formatResponse({
      session,
      filledLunchboxUrl: filledImageDataUrl,
      foodItems,
      lunchboxDescription,
      compartmentCount,
      detectedShape:       shape,
      detectedOrientation: orientation,
      generatedImageAnalysis: generatedAnalysis,
      generationAttempts:     attemptSummaries,
      processingMs,
    }));

  } catch (err) {
    try { await conn.rollback(); } catch {}
    // Best-effort status update
    if (sessionId) {
      try { await pool.execute('UPDATE lunchbox_sessions SET status = ? WHERE id = ?', ['failed', sessionId]); } catch {}
    }
    // Clean up uploaded files on failure
    await deleteFiles(uploadedPaths);
    next(err);
  } finally {
    conn.release();
  }
}

async function getHistory(req, res, next) {
  try {
    const { page, limit, child_id } = req.query;
    const pagination = paginate(page, limit);
    const result = await LunchBox.findByUser(req.user.id, { ...pagination, childId: child_id || null });
    res.json(formatResponse(result));
  } catch (err) {
    next(err);
  }
}

async function getSession(req, res, next) {
  try {
    const session = await LunchBox.findByIdAndUser(req.params.id, req.user.id);
    if (!session) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));
    res.json(formatResponse({ session }));
  } catch (err) {
    next(err);
  }
}

async function deleteSession(req, res, next) {
  try {
    const session = await LunchBox.findByIdAndUser(req.params.id, req.user.id);
    if (!session) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));

    const filePaths = await LunchBox.getFilePaths(req.params.id);
    await LunchBox.deleteById(req.params.id);
    await deleteFiles(filePaths);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { createSession, getHistory, getSession, deleteSession };
