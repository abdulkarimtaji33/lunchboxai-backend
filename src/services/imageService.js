'use strict';

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const MAX_DIMENSION = 1568;

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

module.exports = { resizeForApi, getMimeTypeFromPath, deleteFile, deleteFiles };
