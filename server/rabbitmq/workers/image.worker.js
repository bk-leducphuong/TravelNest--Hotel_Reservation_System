require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});
const { createRetryingConsumer } = require('@rabbitmq/index');
const imageRepository = require('@repositories/image.repository');
const { getObject, uploadObject } = require('@utils/minio.utils');
const logger = require('@config/logger.config');
const sharp = require('sharp');
const { uuidv7 } = require('uuidv7');
const { queueFor } = require('@rabbitmq/queues');

// Image variant configurations
const IMAGE_VARIANTS = {
  thumbnail: { width: 150, height: 150, quality: 85 },
  small: { width: 400, height: 400, quality: 85 },
  medium: { width: 800, height: 800, quality: 90 },
  large: { width: 1920, height: 1920, quality: 95 },
};

const QUEUE = queueFor('imageProcessing');

/**
 * Resize image using Sharp
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {object} config - Configuration with width, height, quality
 * @param {string} format - Output format (jpeg, webp, png)
 * @returns {Promise<Buffer>} - Resized image buffer
 */
async function resizeImage(imageBuffer, config, format) {
  return sharp(imageBuffer)
    .resize(config.width, config.height, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toFormat(format, {
      quality: config.quality,
      progressive: true,
    })
    .toBuffer();
}

/**
 * Process image: download from MinIO, generate variants, save to database
 * @param {object} message - Message containing imageId, bucket, objectKey, etc.
 */
async function processImage(message) {
  const { imageId, bucket, objectKey, mimeType, entityType, entityId } = message;

  logger.info(`Starting image processing for imageId: ${imageId}`, {
    bucket,
    objectKey,
  });

  try {
    // Download original from MinIO
    const imageBuffer = await getObject(bucket, objectKey);

    logger.info(`Downloaded image from MinIO: ${objectKey}`, {
      size: imageBuffer.length,
    });

    // Load image with Sharp and get metadata
    const metadata = await sharp(imageBuffer).metadata();
    const { width, height } = metadata;

    logger.info(`Image metadata extracted`, {
      width,
      height,
      format: metadata.format,
    });

    // Update dimensions in database
    await imageRepository.updateImage(imageId, {
      width,
      height,
    });

    // Generate variants
    const variantRecords = [];

    for (const [variantName, config] of Object.entries(IMAGE_VARIANTS)) {
      logger.info(`Generating variant: ${variantName}`, config);

      // Generate JPEG variant
      const jpegKey = objectKey.replace(/\.[^.]+$/, `_${variantName}.jpg`);
      const jpegBuffer = await resizeImage(imageBuffer, config, 'jpeg');

      await uploadObject(bucket, jpegKey, jpegBuffer, jpegBuffer.length, {
        'Content-Type': 'image/jpeg',
      });

      const jpegMetadata = await sharp(jpegBuffer).metadata();
      const jpegVariantId = uuidv7();

      await imageRepository.createVariant({
        id: jpegVariantId,
        imageId,
        variantType: variantName,
        bucketName: bucket,
        objectKey: jpegKey,
        fileSize: jpegBuffer.length,
        width: jpegMetadata.width,
        height: jpegMetadata.height,
      });

      logger.info(`Created JPEG variant: ${variantName}`, {
        objectKey: jpegKey,
        size: jpegBuffer.length,
      });

      // Generate WebP variant
      const webpKey = objectKey.replace(/\.[^.]+$/, `_${variantName}.webp`);
      const webpBuffer = await resizeImage(imageBuffer, config, 'webp');

      await uploadObject(bucket, webpKey, webpBuffer, webpBuffer.length, {
        'Content-Type': 'image/webp',
      });

      const webpMetadata = await sharp(webpBuffer).metadata();
      const webpVariantId = uuidv7();

      await imageRepository.createVariant({
        id: webpVariantId,
        imageId,
        variantType: `${variantName}_webp`,
        bucketName: bucket,
        objectKey: webpKey,
        fileSize: webpBuffer.length,
        width: webpMetadata.width,
        height: webpMetadata.height,
      });

      logger.info(`Created WebP variant: ${variantName}_webp`, {
        objectKey: webpKey,
        size: webpBuffer.length,
      });
    }

    // Update image status to active
    await imageRepository.updateImage(imageId, {
      status: 'active',
      has_thumbnail: true,
      has_compressed: true,
    });

    logger.info(`Successfully processed image ${imageId}`, {
      variantsCreated: variantRecords.length,
      entityType,
      entityId,
    });

    return { success: true, imageId };
  } catch (error) {
    logger.error(`Error processing image ${imageId}:`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * RabbitMQ consumer for image processing
 * Subscribes to 'image.processing' queue and processes images
 */
const imageProcessingConsumer = createRetryingConsumer({
  baseQueue: QUEUE,
  consumerTag:
    process.env.RABBITMQ_IMAGE_PROCESSING_CONSUMER || 'image-processing-consumer',
  retry: {
    maxRetries: Number(process.env.RABBITMQ_IMAGE_PROCESSING_MAX_RETRIES || 5),
    delayMs: Number(
      process.env.RABBITMQ_IMAGE_PROCESSING_RETRY_DELAY_MS || 60_000
    ),
  },
  channelName: 'image-processing',
  handler: async ({ value, headers, properties, queue }) => {
    if (!value) {
      logger.error('Empty message received', { queue });
      throw new Error('Empty message');
    }

    logger.info('Processing image from RabbitMQ message', {
      imageId: value.imageId,
      queue,
      messageId: properties.messageId,
    });

    await processImage(value);
  },
});

module.exports = { imageProcessingConsumer };
