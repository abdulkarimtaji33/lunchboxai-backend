'use strict';

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');

const PREFIX = 'generated/';

let client = null;

function getClient() {
  const { s3 } = env;
  if (!s3.bucket || !s3.region) return null;
  if (!s3.accessKeyId || !s3.secretAccessKey) return null;
  if (!client) {
    client = new S3Client({
      region: s3.region,
      credentials: {
        accessKeyId: s3.accessKeyId,
        secretAccessKey: s3.secretAccessKey,
      },
    });
  }
  return client;
}

function isS3Configured() {
  return !!getClient();
}

function publicUrlForKey(key) {
  const { s3 } = env;
  if (s3.publicBaseUrl) {
    return `${s3.publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/**
 * @param {Buffer} buffer — PNG bytes
 * @param {string} filename — basename only (e.g. generated-123.png)
 * @returns {string} Stored DB value: `s3:generated/...` (key after s3:)
 */
async function uploadGeneratedPng(buffer, filename) {
  const c = getClient();
  if (!c) throw new Error('S3 not configured');
  const key = `${PREFIX}${filename}`;
  await c.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
      CacheControl: 'max-age=31536000',
    })
  );
  return `s3:${key}`;
}

async function deleteObjectByKey(key) {
  const c = getClient();
  if (!c) return;
  try {
    await c.send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key }));
  } catch (e) {
    console.error('S3 delete failed:', key, e.message);
  }
}

/** `stored` is DB value: `s3:key` or legacy local path / URL */
function storedToS3Key(stored) {
  if (!stored) return null;
  const s = String(stored);
  if (s.startsWith('s3:')) return s.slice(3);
  return null;
}

module.exports = {
  isS3Configured,
  publicUrlForKey,
  uploadGeneratedPng,
  deleteObjectByKey,
  storedToS3Key,
};
