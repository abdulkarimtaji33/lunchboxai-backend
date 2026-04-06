'use strict';

const pool         = require('../config/database');
const LunchBox     = require('../models/LunchBox');
const Child        = require('../models/Child');
const ChildLunchbox  = require('../models/ChildLunchbox');
const BaseLunchbox   = require('../models/BaseLunchbox');
const { analyzeLunchbox, identifyIngredients, buildSessionAiContext } = require('../services/aiService');
const { generateFilledLunchbox, generateFilledLunchboxEdit, generateFilledLunchboxOpenRouter } = require('../services/imageGenService');
const { deleteFiles, saveGeneratedLunchboxImage, buildPublicFileUrl } = require('../services/imageService');
const { formatResponse, formatError, paginate } = require('../utils/helpers');

async function createSession(req, res, next) {
  const uploadedPaths = [];
  let sessionId       = null;
  const startTime     = Date.now();
  const conn          = await pool.getConnection();

  try {
    // Parse body fields
    const {
      child_id, notes,
      dislikes_override, school_rules_override,
      prep_time_minutes, nutrition_goal_override,
      allergen_override_ids,
      use_image_edit,
      planned_at,
      use_child_default_lunchbox,
      child_lunchbox_id,
      base_lunchbox_id,
    } = req.body;

    // Resolve lunchbox image: uploaded file OR child's saved base lunchbox
    let lunchboxFilePath = null;
    const ingredientFiles = req.files?.ingredients || [];

    if (use_child_default_lunchbox === 'true' || use_child_default_lunchbox === true) {
      if (!child_id) return res.status(400).json(formatError('child_id required when using default lunchbox', 'VALIDATION_ERROR'));
      const lbId = child_lunchbox_id || null;
      let lb = null;
      if (lbId) {
        lb = await ChildLunchbox.findById(lbId);
      } else {
        const tempChild = await Child.findByIdAndUser(child_id, req.user.id);
        if (tempChild?.default_lunchbox_id) {
          lb = await ChildLunchbox.findById(tempChild.default_lunchbox_id);
        }
      }
      if (!lb) return res.status(400).json(formatError('No base lunchbox found for this child', 'VALIDATION_ERROR'));
      lunchboxFilePath = lb.image_path;
    } else if (base_lunchbox_id) {
      const bl = await BaseLunchbox.findById(base_lunchbox_id);
      if (!bl) return res.status(400).json(formatError('Base lunchbox not found', 'VALIDATION_ERROR'));
      lunchboxFilePath = bl.image_path;
    } else {
      if (!req.files?.lunchbox?.[0]) {
        return res.status(400).json(formatError('Lunchbox image is required', 'VALIDATION_ERROR'));
      }
      lunchboxFilePath = req.files.lunchbox[0].path;
      uploadedPaths.push(lunchboxFilePath);
    }

    ingredientFiles.forEach(f => uploadedPaths.push(f.path));

    // Alias for consistency below
    const lunchboxFile = { path: lunchboxFilePath };

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

    // Resolve base lunchbox note for AI context
    let baseLunchboxNote = null;
    if (base_lunchbox_id) {
      const bl = await BaseLunchbox.findById(base_lunchbox_id);
      if (bl) {
        baseLunchboxNote = `Container: ${bl.name} (${bl.container_type}, ${bl.compartments} compartment${bl.compartments > 1 ? 's' : ''}). ${bl.description || ''}`;
      }
    }
    const effectiveNotes = [notes, baseLunchboxNote].filter(Boolean).join(' | ') || null;

    // --- BEGIN TRANSACTION ---
    await conn.beginTransaction();

    sessionId = await LunchBox.createSession(conn, {
      userId:               req.user.id,
      childId:              child?.id || null,
      lunchboxImagePath:    lunchboxFile.path,
      notes:                effectiveNotes,
      dislikesOverride:     dislikes_override     || null,
      schoolRulesOverride:  school_rules_override || null,
      prepTimeMinutes:      prep_time_minutes     || null,
      nutritionGoalOverride:nutrition_goal_override || null,
      plannedAt:            planned_at            || null,
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
      prep_time_minutes, nutrition_goal_override, notes: effectiveNotes,
    };

    const sessionContext = await buildSessionAiContext({ child, allergens, sessionOverrides });

    // Step 1: Analyse lunchbox shape + identify ingredients (in parallel)
    const ingredientPaths = ingredientFiles.map(f => f.path);
    const [
      { lunchboxDescription, compartmentCount, shape, orientation },
      identifiedIngredients,
    ] = await Promise.all([
      analyzeLunchbox({ lunchboxImagePath: lunchboxFile.path, child, allergens, sessionOverrides }),
      identifyIngredients(ingredientPaths),
    ]);

    if (identifiedIngredients) {
      console.log('Ingredients identified:', identifiedIngredients);
    }

    // Step 2: Image generation (use_image_edit=true uses the actual lunchbox photo as base)
    const useEdit = use_image_edit === 'true' || use_image_edit === true;
    const { filledImageDataUrl, filledImageB64, foodItems, attemptSummaries, generatedAnalysis } =
      useEdit
        ? await generateFilledLunchboxEdit({ lunchboxImagePath: lunchboxFile.path, lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients, sessionContext })
        : await generateFilledLunchbox({ lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients, sessionContext });

    const processingMs = Date.now() - startTime;

    const generatedImagePath = await saveGeneratedLunchboxImage({
      dataUrl: filledImageDataUrl,
      base64: filledImageB64,
    });

    // Step 3: Persist result
    await conn.beginTransaction();
    await LunchBox.attachResult(conn, sessionId, {
      aiTextResponse:    lunchboxDescription,
      suggestedItems:    foodItems,
      nutritionNotes:    null,
      arrangementDesc:   lunchboxDescription,
      funNote:           null,
      generatedImagePath,
      aiModel:           'gpt-4o + gpt-image-1',
      tokensUsed:        null,
      processingMs,
    });
    await LunchBox.updateStatus(conn, sessionId, 'completed');
    await conn.commit();

    const session = await LunchBox.findByIdAndUser(sessionId, req.user.id);

    res.status(201).json(formatResponse({
      session,
      filledLunchboxUrl: buildPublicFileUrl(generatedImagePath),
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

async function createSessionOpenRouter(req, res, next) {
  const uploadedPaths = [];
  let sessionId       = null;
  const startTime     = Date.now();
  const conn          = await pool.getConnection();

  try {
    if (!req.files?.lunchbox?.[0]) {
      return res.status(400).json(formatError('Lunchbox image is required', 'VALIDATION_ERROR'));
    }

    const lunchboxFile    = req.files.lunchbox[0];
    const ingredientFiles = req.files.ingredients || [];

    uploadedPaths.push(lunchboxFile.path);
    ingredientFiles.forEach(f => uploadedPaths.push(f.path));

    const { child_id, notes, dislikes_override, school_rules_override, prep_time_minutes, nutrition_goal_override, allergen_override_ids, planned_at, base_lunchbox_id: or_base_lunchbox_id } = req.body;

    let allergenIds = [];
    if (allergen_override_ids) {
      try { allergenIds = typeof allergen_override_ids === 'string' ? JSON.parse(allergen_override_ids) : allergen_override_ids; } catch { allergenIds = []; }
    }

    let child = null;
    if (child_id) {
      child = await Child.findByIdAndUser(child_id, req.user.id);
      if (!child) return res.status(404).json(formatError('Child not found', 'NOT_FOUND'));
    }

    let orBaseLunchboxNote = null;
    if (or_base_lunchbox_id) {
      const bl = await BaseLunchbox.findById(or_base_lunchbox_id);
      if (bl) {
        orBaseLunchboxNote = `Container: ${bl.name} (${bl.container_type}, ${bl.compartments} compartment${bl.compartments > 1 ? 's' : ''}). ${bl.description || ''}`;
      }
    }
    const orEffectiveNotes = [notes, orBaseLunchboxNote].filter(Boolean).join(' | ') || null;

    await conn.beginTransaction();
    sessionId = await LunchBox.createSession(conn, {
      userId: req.user.id, childId: child?.id || null, lunchboxImagePath: lunchboxFile.path,
      notes: orEffectiveNotes, dislikesOverride: dislikes_override || null, schoolRulesOverride: school_rules_override || null,
      prepTimeMinutes: prep_time_minutes || null, nutritionGoalOverride: nutrition_goal_override || null,
      plannedAt: planned_at || null,
    });
    await LunchBox.insertIngredientImages(conn, sessionId, ingredientFiles.map(f => f.path));
    if (allergenIds.length) await LunchBox.insertSessionAllergenOverrides(conn, sessionId, allergenIds);
    await LunchBox.updateStatus(conn, sessionId, 'processing');
    await conn.commit();

    const allergens = await LunchBox.resolveAllergens(child?.id || 0, sessionId);
    const sessionOverrides = { dislikes_override, school_rules_override, prep_time_minutes, nutrition_goal_override, notes: orEffectiveNotes };

    const sessionContext = await buildSessionAiContext({ child, allergens, sessionOverrides });

    const ingredientPaths = ingredientFiles.map(f => f.path);
    const [
      { lunchboxDescription, compartmentCount, shape, orientation },
      identifiedIngredients,
    ] = await Promise.all([
      analyzeLunchbox({ lunchboxImagePath: lunchboxFile.path, child, allergens, sessionOverrides }),
      identifyIngredients(ingredientPaths),
    ]);

    if (identifiedIngredients) console.log('Ingredients identified:', identifiedIngredients);

    const { filledImageDataUrl, filledImageB64, foodItems, attemptSummaries, generatedAnalysis } =
      await generateFilledLunchboxOpenRouter({ lunchboxImagePath: lunchboxFile.path, lunchboxDescription, compartmentCount, shape, orientation, identifiedIngredients, sessionContext });

    const processingMs = Date.now() - startTime;

    const generatedImagePath = await saveGeneratedLunchboxImage({
      dataUrl: filledImageDataUrl,
      base64: filledImageB64,
    });

    await conn.beginTransaction();
    await LunchBox.attachResult(conn, sessionId, {
      aiTextResponse: lunchboxDescription, suggestedItems: foodItems, nutritionNotes: null,
      arrangementDesc: lunchboxDescription, funNote: null,
      generatedImagePath, aiModel: 'gpt-4o + gpt-5-image-mini (openrouter)', tokensUsed: null, processingMs,
    });
    await LunchBox.updateStatus(conn, sessionId, 'completed');
    await conn.commit();

    const session = await LunchBox.findByIdAndUser(sessionId, req.user.id);
    res.status(201).json(formatResponse({ session, filledLunchboxUrl: buildPublicFileUrl(generatedImagePath), foodItems, lunchboxDescription, compartmentCount, detectedShape: shape, detectedOrientation: orientation, generatedImageAnalysis: generatedAnalysis, generationAttempts: attemptSummaries, processingMs }));

  } catch (err) {
    try { await conn.rollback(); } catch {}
    if (sessionId) {
      try { await pool.execute('UPDATE lunchbox_sessions SET status = ? WHERE id = ?', ['failed', sessionId]); } catch {}
    }
    await deleteFiles(uploadedPaths);
    next(err);
  } finally {
    conn.release();
  }
}

async function planSession(req, res, next) {
  try {
    const { planned_at } = req.body;
    const session = await LunchBox.findByIdAndUser(req.params.id, req.user.id);
    if (!session) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));

    await LunchBox.setPlanDate(req.params.id, req.user.id, planned_at || null);
    const updated = await LunchBox.findByIdAndUser(req.params.id, req.user.id);
    res.json(formatResponse({ session: updated }));
  } catch (err) {
    next(err);
  }
}

async function setFlag(req, res, next) {
  try {
    const { flag, value } = req.body;
    const allowed = ['is_favorite', 'save_for_later'];
    if (!allowed.includes(flag)) return res.status(400).json(formatError('Invalid flag', 'VALIDATION_ERROR'));
    const session = await LunchBox.findByIdAndUser(req.params.id, req.user.id);
    if (!session) return res.status(404).json(formatError('Session not found', 'NOT_FOUND'));
    await LunchBox.setSessionFlag(req.params.id, req.user.id, flag, value);
    const updated = await LunchBox.findByIdAndUser(req.params.id, req.user.id);
    res.json(formatResponse({ session: updated }));
  } catch (err) {
    next(err);
  }
}

module.exports = { createSession, createSessionOpenRouter, getHistory, getSession, deleteSession, planSession, setFlag };
