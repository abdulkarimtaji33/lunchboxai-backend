'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const { UPLOAD_DIR } = require('../config/constants');
const { appBaseUrl } = require('../config/env');
const s3 = require('./s3Service');

const MAX_DIMENSION = 1568;

function buildPublicFileUrl(relativePath) {
  if (!relativePath) return null;
  const raw = String(relativePath).replace(/\\/g, '/');
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('s3:')) {
    const key = raw.slice(3);
    return s3.publicUrlForKey(key);
  }
  const rel = raw.replace(/^\//, '');
  const base = String(appBaseUrl || '').replace(/\/$/, '');
  return `${base}/${rel}`;
}

/** Decode AI output to PNG/JPEG bytes (before optional background removal). */
function decodeGeneratedImageBuffer({ dataUrl, base64 }) {
  let buffer;
  if (base64 && typeof base64 === 'string') {
    buffer = Buffer.from(base64, 'base64');
  } else if (dataUrl && typeof dataUrl === 'string') {
    if (dataUrl.startsWith('data:image')) {
      const m = dataUrl.match(/^data:image\/\w+;base64,(.+)$/);
      if (m) buffer = Buffer.from(m[1], 'base64');
    } else if (/^https?:\/\//i.test(dataUrl)) {
      return null;
    }
  }
  if (!buffer || !buffer.length) return null;
  return buffer;
}

async function decodeGeneratedImageBufferAsync({ dataUrl, base64 }) {
  if (Buffer.isBuffer(dataUrl)) return dataUrl;
  const sync = decodeGeneratedImageBuffer({ dataUrl, base64 });
  if (sync) return sync;
  if (dataUrl && typeof dataUrl === 'string' && /^https?:\/\//i.test(dataUrl)) {
    const res = await fetch(dataUrl);
    if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

/**
 * Persist a generated lunchbox image to UPLOAD_DIR. Pass buffer, or base64 / data URL / http URL.
 * @returns {string} Relative path suitable for DB (e.g. uploads/generated-....png)
 */
async function saveGeneratedLunchboxImage({ dataUrl, base64, buffer: existingBuffer }) {
  let buffer = Buffer.isBuffer(existingBuffer) && existingBuffer.length ? existingBuffer : null;
  if (!buffer) {
    buffer = await decodeGeneratedImageBufferAsync({ dataUrl, base64 });
  }
  if (!buffer || !buffer.length) throw new Error('No image data to save');

  const filename = `generated-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;

  if (s3.isS3Configured()) {
    return s3.uploadGeneratedPng(buffer, filename);
  }

  const dir = path.join(process.cwd(), UPLOAD_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

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

async function deleteStoredFile(stored) {
  if (!stored) return;
  const key = s3.storedToS3Key(stored);
  if (key) {
    await s3.deleteObjectByKey(key);
    return;
  }
  await deleteFile(stored);
}

async function deleteFiles(filePaths) {
  await Promise.all((filePaths || []).map(deleteStoredFile));
}

module.exports = {
  resizeForApi,
  getMimeTypeFromPath,
  deleteFile,
  deleteStoredFile,
  deleteFiles,
  buildPublicFileUrl,
  decodeGeneratedImageBuffer,
  decodeGeneratedImageBufferAsync,
  saveGeneratedLunchboxImage,
};
