const imageRepository = require('@repositories/image.repository');
const { publishToQueue } = require('@utils/rabbitmq.utils');
const {
  getBucketName,
  uploadObject,
  getPresignedUrl,
  deleteObject,
  deleteObjects,
} = require('@utils/minio.utils');
const ApiError = require('@utils/ApiError');
const logger = require('@config/logger.config');
const { uuidv7 } = require('uuidv7');
const path = require('path');

/**
 * Image Service - Business logic for image operations
 */
class ImageService {
  /**
   * Upload image for an entity
   * @param {string} entityType - Entity type (hotel, room, review, user_avatar)
   * @param {string} entityId - Entity ID
   * @param {object} file - Uploaded file from multer
   * @param {boolean} isPrimary - Whether this is the primary image
   * @returns {Promise<object>} - Created image record with upload status
   */
  async uploadImage(entityType, entityId, file, isPrimary = false) {
    if (!file) {
      throw new ApiError(400, 'NO_FILE_PROVIDED', 'No file provided');
    }

    // Validate entity type
    const validEntityTypes = ['hotel', 'room', 'review', 'user_avatar'];
    if (!validEntityTypes.includes(entityType)) {
      throw new ApiError(
        400,
        'INVALID_ENTITY_TYPE',
        `Invalid entity type: ${entityType}. Valid types are: ${validEntityTypes.join(', ')}`,
        { entityType, validEntityTypes }
      );
    }

    // Generate UUID and object key
    const imageId = uuidv7();
    const fileExtension = path.extname(file.originalname).substring(1) || 'jpg';
    const objectKey = `${entityType}/${entityId}/${imageId}.${fileExtension}`;
    const bucket = getBucketName(entityType);

    try {
      // Upload to MinIO
      await uploadObject(bucket, objectKey, file.buffer, file.size, {
        'Content-Type': file.mimetype,
      });

      // Insert metadata to database
      const imageRecord = await imageRepository.createImage({
        id: imageId,
        entityType,
        entityId,
        bucketName: bucket,
        objectKey,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        isPrimary,
        status: 'processing',
      });

      // If this is marked as primary, update other images
      if (isPrimary) {
        await imageRepository.setPrimaryImage(entityType, entityId, imageId);
      }

      // Publish to processing queue for thumbnail/variant generation
      await publishToQueue(
        'image.processing',
        {
          imageId,
          bucket,
          objectKey,
          entityType,
          entityId,
          mimeType: file.mimetype,
        },
        isPrimary ? 10 : 5 // Higher priority for primary images
      );

      logger.info(`Image uploaded successfully: ${imageId}`, {
        entityType,
        entityId,
        isPrimary,
      });

      return {
        id: imageId,
        entityType,
        entityId,
        originalFilename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        isPrimary,
        status: 'processing',
        message: 'Image uploaded and queued for processing',
      };
    } catch (error) {
      logger.error('Error uploading image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'UPLOAD_FAILED', 'Failed to upload image', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get images for an entity with pre-signed URLs
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @returns {Promise<Array>} - Array of images with URLs
   */
  async getImages(entityType, entityId) {
    try {
      // Get images from database
      const images = await imageRepository.findByEntity(
        entityType,
        entityId,
        'active'
      );

      if (images.length === 0) {
        return [];
      }

      // Generate pre-signed URLs for each image
      const imagesWithUrls = await Promise.all(
        images.map(async (img) => {
          // Generate URL for original image
          const url = await getPresignedUrl(
            img.bucket_name,
            img.object_key,
            24 * 60 * 60 // 24 hours
          );

          // Get variants
          const variants = await imageRepository.findVariantsByImageId(img.id);

          // Generate URLs for variants
          const variantUrls = {};
          for (const variant of variants) {
            const variantUrl = await getPresignedUrl(
              variant.bucket_name,
              variant.object_key,
              24 * 60 * 60
            );
            variantUrls[variant.variant_type] = {
              url: variantUrl,
              width: variant.width,
              height: variant.height,
              fileSize: variant.file_size,
            };
          }

          return {
            id: img.id,
            originalFilename: img.original_filename,
            fileSize: img.file_size,
            mimeType: img.mime_type,
            width: img.width,
            height: img.height,
            isPrimary: img.is_primary,
            displayOrder: img.display_order,
            status: img.status,
            uploadedAt: img.uploaded_at,
            url,
            variants: variantUrls,
          };
        })
      );

      logger.info(`Retrieved ${imagesWithUrls.length} images`, {
        entityType,
        entityId,
      });

      return imagesWithUrls;
    } catch (error) {
      logger.error('Error getting images:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'GET_IMAGES_FAILED', 'Failed to get images', {
        originalError: error.message,
      });
    }
  }

  /**
   * Delete an image (soft delete)
   * @param {string} imageId - Image ID
   * @returns {Promise<object>} - Deletion status
   */
  async deleteImage(imageId) {
    try {
      // Find the image first
      const image = await imageRepository.findById(imageId);

      if (!image) {
        throw new ApiError(404, 'IMAGE_NOT_FOUND', 'Image not found', {
          imageId,
        });
      }

      if (image.status === 'deleted') {
        throw new ApiError(
          400,
          'IMAGE_ALREADY_DELETED',
          'Image already deleted',
          { imageId, status: image.status }
        );
      }

      // Soft delete in database
      await imageRepository.softDeleteImage(imageId);

      logger.info(`Image soft deleted: ${imageId}`);

      // Note: We don't delete from MinIO immediately to allow for recovery
      // A separate cleanup job can delete old soft-deleted images

      return {
        id: imageId,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'DELETE_IMAGE_FAILED', 'Failed to delete image', {
        imageId,
        originalError: error.message,
      });
    }
  }

  /**
   * Permanently delete an image (hard delete from database and MinIO)
   * @param {string} imageId - Image ID
   * @returns {Promise<object>} - Deletion status
   */
  async hardDeleteImage(imageId) {
    try {
      // Find the image first
      const image = await imageRepository.findById(imageId);

      if (!image) {
        throw new ApiError(404, 'IMAGE_NOT_FOUND', 'Image not found', {
          imageId,
        });
      }

      // Get all variants
      const variants = await imageRepository.findVariantsByImageId(imageId);

      // Delete from MinIO (original + all variants)
      const objectsToDelete = [image.object_key];
      variants.forEach((variant) => {
        objectsToDelete.push(variant.object_key);
      });

      await deleteObjects(image.bucket_name, objectsToDelete);

      // Delete variants from database
      await imageRepository.deleteVariantsByImageId(imageId);

      // Delete image from database
      await imageRepository.hardDeleteImage(imageId);

      logger.info(`Image permanently deleted: ${imageId}`);

      return {
        id: imageId,
        message: 'Image permanently deleted',
      };
    } catch (error) {
      logger.error('Error permanently deleting image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        'HARD_DELETE_FAILED',
        'Failed to permanently delete image',
        { imageId, originalError: error.message }
      );
    }
  }

  /**
   * Set primary image for an entity
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} imageId - Image ID to set as primary
   * @returns {Promise<object>} - Update status
   */
  async setPrimaryImage(entityType, entityId, imageId) {
    try {
      // Verify the image exists and belongs to the entity
      const image = await imageRepository.findById(imageId);

      if (!image) {
        throw new ApiError(404, 'IMAGE_NOT_FOUND', 'Image not found', {
          imageId,
        });
      }

      if (image.entity_type !== entityType || image.entity_id !== entityId) {
        throw new ApiError(
          403,
          'IMAGE_NOT_BELONGS_TO_ENTITY',
          'Image does not belong to this entity',
          {
            imageId,
            imageEntityType: image.entity_type,
            imageEntityId: image.entity_id,
            requestedEntityType: entityType,
            requestedEntityId: entityId,
          }
        );
      }

      if (image.status !== 'active') {
        throw new ApiError(
          400,
          'INVALID_IMAGE_STATUS',
          'Cannot set non-active image as primary',
          { imageId, status: image.status }
        );
      }

      // Set as primary
      await imageRepository.setPrimaryImage(entityType, entityId, imageId);

      logger.info(`Primary image set: ${imageId}`, { entityType, entityId });

      return {
        id: imageId,
        message: 'Primary image set successfully',
      };
    } catch (error) {
      logger.error('Error setting primary image:', error);
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        'SET_PRIMARY_FAILED',
        'Failed to set primary image',
        { imageId, entityType, entityId, originalError: error.message }
      );
    }
  }
}

module.exports = new ImageService();
