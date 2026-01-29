const Minio = require('minio');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const bucketName = process.env.MINIO_BUCKET || 'uploads';

/**
 * Ensure bucket exists
 */
async function initBucket() {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    // eslint-disable-next-line no-console
    console.log(`Bucket "${bucketName}" created`);
  }
}

/**
 * Build a public URL for an object.
 * If MINIO_PUBLIC_URL is set, use it as base, otherwise fall back to MINIO_ENDPOINT:MINIO_PORT.
 */
function getObjectUrl(objectName) {
  const base =
    process.env.MINIO_PUBLIC_URL ||
    `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${
      process.env.MINIO_ENDPOINT
    }:${process.env.MINIO_PORT}`;

  // Ensure no duplicate slashes
  return `${base.replace(/\/+$/, '')}/${bucketName}/${objectName.replace(/^\/+/, '')}`;
}

module.exports = { minioClient, initBucket, bucketName, getObjectUrl };
