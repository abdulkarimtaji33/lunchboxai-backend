'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const { UPLOAD_DIR } = require('../config/constants');
const { appBaseUrl } = require('../config/env');

const MAX_DIMENSION = 1568;

function buildPublicFileUrl(relativePath) {
  if (!relativePath) return null;
  const rel = String(relativePath).replace(/\\/g, '/').replace(/^\//, '');
  const base = String(appBaseUrl || '').replace(/\/$/, '');
  return `${base}/${rel}`;
}

/**
 * Persist a generated lunchbox image to UPLOAD_DIR. Prefer base64 from the API;
 * falls back to data URL or remote http(s) URL.
 * @returns {string} Relative path suitable for DB (e.g. uploads/generated-....png)
 */
async function saveGeneratedLunchboxImage({ dataUrl, base64 }) {
  let buffer;
  if (base64 && typeof base64 === 'string') {
    buffer = Buffer.from(base64, 'base64');
  } else if (dataUrl && typeof dataUrl === 'string') {
    if (dataUrl.startsWith('data:image')) {
      const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (m) buffer = Buffer.from(m[1], 'base64');
    } else if (/^https?:\/\//i.test(dataUrl)) {
      const res = await fetch(dataUrl);
      if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    }
  }
  if (!buffer || !buffer.length) throw new Error('No image data to save');

  const dir = path.join(process.cwd(), UPLOAD_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `generated-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
  const fsPath = path.join(dir, filename);
  await fs.promises.writeFile(fsPath, buffer);
  return path.join(UPLOAD_DIR, filename);
}

async function resizeForApi(filePath) {
  const buffer = fs.readFileSync(filePath);
  const resized = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
  return resized;
}

function getMimeTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
  };
  return map[ext] || 'image/jpeg';
}

async function deleteFile(filePath) {
  try {
    if (filePath) await fs.promises.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to delete file:', filePath, err.message);
  }
}

async function deleteFiles(filePaths) {
  await Promise.all((filePaths || []).map(deleteFile));
}

module.exports = {
  resizeForApi,
  getMimeTypeFromPath,
  deleteFile,
  deleteFiles,
  buildPublicFileUrl,
  saveGeneratedLunchboxImage,
};
