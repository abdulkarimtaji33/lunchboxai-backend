'use strict';

const { Blob } = require('buffer');
const sharp = require('sharp');
const { localBackgroundRemovalDisabled } = require('../config/env');

/**
 * Runs local ONNX background removal (@imgly/background-removal-node). No external API.
 * Any raster Sharp supports (jpeg/png/webp/gif/tiff/avif/heif when built in) → PNG → imgly.
 * On failure, returns the original buffer.
 */
async function applyLocalBackgroundRemoval(buffer, enabled) {
  const inBytes = buffer?.length ?? 0;
  if (!enabled) {
    console.warn('[background-removal] skip (remove_background off)', { bytes: inBytes });
    return buffer;
  }
  if (!inBytes) {
    console.warn('[background-removal] skip empty buffer');
    return buffer;
  }
  if (localBackgroundRemovalDisabled) {
    console.warn('[background-removal] skip DISABLE_LOCAL_BACKGROUND_REMOVAL=1', { bytes: inBytes });
    return buffer;
  }

  let meta = {};
  try {
    meta = await sharp(buffer).metadata();
  } catch (metaErr) {
    console.warn('[background-removal] sharp.metadata failed', {
      message: metaErr.message,
      bytes: inBytes,
    });
  }

  console.warn('[background-removal] start', {
    bytes: inBytes,
    platform: process.platform,
    node: process.version,
    input: {
      format: meta.format || null,
      width: meta.width ?? null,
      height: meta.height ?? null,
      space: meta.space || null,
      channels: meta.channels ?? null,
      hasAlpha: meta.hasAlpha ?? null,
    },
  });

  try {
    let pngInput;
    try {
      pngInput = await sharp(buffer)
        .rotate()
        .png({ compressionLevel: 6 })
        .toBuffer();
    } catch (normErr) {
      console.warn('[background-removal] sharp PNG normalize failed (using original)', {
        message: normErr.message,
        stack: normErr.stack,
      });
      return buffer;
    }

    console.warn('[background-removal] normalized png', { bytes: pngInput.length });

    console.warn('[background-removal] step require @imgly/background-removal-node');
    const { removeBackground } = require('@imgly/background-removal-node');
    const inputBlob = new Blob([pngInput], { type: 'image/png' });
    console.warn('[background-removal] step removeBackground (onnx)');
    const blob = await removeBackground(inputBlob, {
      model: 'small',
      output: { format: 'image/png', quality: 0.9 },
    });
    const out = Buffer.from(await blob.arrayBuffer());
    if (!out.length) {
      console.warn('[background-removal] empty output blob, using original');
      return buffer;
    }
    console.warn('[background-removal] success', { outBytes: out.length });
    return out;
  } catch (e) {
    console.warn('[background-removal] failed (using original)', {
      message: e.message,
      name: e.name,
      stack: e.stack,
    });
    return buffer;
  }
}

module.exports = { applyLocalBackgroundRemoval };
