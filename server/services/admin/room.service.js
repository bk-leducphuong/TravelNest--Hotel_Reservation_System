const adminRoomRepository = require('../../repositories/admin/room.repository');
const ApiError = require('../../utils/ApiError');
const {
  minioClient,
  bucketName,
  getObjectUrl,
} = require('../../config/minio.config');
const sharp = require('sharp');

/**
 * Admin Room Service - Contains main business logic for admin room management
 * Follows RESTful API standards
 */

class AdminRoomService {
  /**
   * Verify hotel ownership for all operations
   */
  async verifyAccess(hotelId, ownerId) {
    const isOwner = await adminRoomRepository.verifyHotelOwnership(
      hotelId,
      ownerId
    );

    if (!isOwner) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to access this hotel'
      );
    }
  }

  /**
   * Verify room belongs to owner's hotel
   */
  async verifyRoomAccess(roomId, ownerId) {
    const room = await adminRoomRepository.findById(roomId);

    if (!room) {
      throw new ApiError(404, 'ROOM_NOT_FOUND', 'Room not found');
    }

    await this.verifyAccess(room.hotel_id, ownerId);
    return room;
  }

  /**
   * Get all rooms for a hotel
   */
  async getAllRooms(hotelId, ownerId) {
    await this.verifyAccess(hotelId, ownerId);

    const rooms = await adminRoomRepository.findByHotelId(hotelId);

    return rooms.map((room) => (room.toJSON ? room.toJSON() : room));
  }

  /**
   * Get a specific room by ID
   */
  async getRoomById(roomId, ownerId) {
    const room = await this.verifyRoomAccess(roomId, ownerId);

    return room.toJSON ? room.toJSON() : room;
  }

  /**
   * Create a new room
   */
  async createRoom(hotelId, ownerId, roomData) {
    await this.verifyAccess(hotelId, ownerId);

    const { roomName, roomType, quantity, roomSize, roomAmenities } = roomData;

    // Create the room
    const newRoom = await adminRoomRepository.create({
      hotel_id: hotelId,
      room_name: roomName,
      room_type: roomType,
      quantity: quantity,
      room_size: roomSize,
      room_amenities: roomAmenities,
      image_urls: JSON.stringify([]),
    });

    // Generate room inventory for the next 60 days
    const inventoryEntries = [];
    const numberOfDays = 60;

    for (let i = 0; i < numberOfDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      inventoryEntries.push({
        room_id: newRoom.id,
        date: date,
        total_rooms: quantity,
        booked_rooms: 0,
        price_per_night: 0,
        status: 'open',
      });
    }

    await adminRoomRepository.bulkCreateInventory(inventoryEntries);

    return newRoom.toJSON ? newRoom.toJSON() : newRoom;
  }

  /**
   * Update room information
   */
  async updateRoom(roomId, ownerId, updateData) {
    await this.verifyRoomAccess(roomId, ownerId);

    const updatePayload = {};
    if (updateData.roomName !== undefined)
      updatePayload.room_name = updateData.roomName;
    if (updateData.roomType !== undefined)
      updatePayload.room_type = updateData.roomType;
    if (updateData.quantity !== undefined)
      updatePayload.quantity = updateData.quantity;
    if (updateData.roomSize !== undefined)
      updatePayload.room_size = updateData.roomSize;
    if (updateData.roomAmenities !== undefined)
      updatePayload.room_amenities = updateData.roomAmenities;

    const [updatedCount] = await adminRoomRepository.update(
      roomId,
      updatePayload
    );

    if (updatedCount === 0) {
      throw new ApiError(500, 'UPDATE_FAILED', 'Failed to update room');
    }

    return await this.getRoomById(roomId, ownerId);
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId, ownerId) {
    await this.verifyRoomAccess(roomId, ownerId);

    // Delete all room inventories
    await adminRoomRepository.deleteInventoriesByRoomId(roomId);

    // Delete the room
    const deletedCount = await adminRoomRepository.delete(roomId);

    if (deletedCount === 0) {
      throw new ApiError(500, 'DELETE_FAILED', 'Failed to delete room');
    }

    return {
      roomId,
      message: 'Room deleted successfully',
    };
  }

  /**
   * Get room photos
   */
  async getRoomPhotos(roomId, ownerId) {
    const room = await this.verifyRoomAccess(roomId, ownerId);

    const imageUrls = room.image_urls ? JSON.parse(room.image_urls) : [];

    return {
      roomId: room.id,
      roomName: room.room_name,
      imageUrls,
    };
  }

  /**
   * Add photos to a room
   */
  async addRoomPhotos(roomId, hotelId, ownerId, files) {
    const room = await this.verifyRoomAccess(roomId, ownerId);

    if (!files || files.length === 0) {
      throw new ApiError(400, 'NO_FILES', 'No files provided');
    }

    // Process and upload files to MinIO
    const uploadedUrls = await Promise.all(
      files.map(async (file) => {
        const timestamp = new Date()
          .toISOString()
          .replace(/[^a-zA-Z0-9_\-]/g, '-');

        // Convert image to AVIF using sharp
        const avifBuffer = await sharp(file.buffer)
          .avif({ quality: 50 })
          .toBuffer();

        const objectName = `hotels/${hotelId}/rooms/${roomId}/${timestamp}.avif`;

        await minioClient.putObject(bucketName, objectName, avifBuffer, {
          'Content-Type': 'image/avif',
        });

        return getObjectUrl(objectName);
      })
    );

    // Update room image URLs
    const currentImageUrls = room.image_urls ? JSON.parse(room.image_urls) : [];
    const newImageUrls = [...currentImageUrls, ...uploadedUrls];

    await adminRoomRepository.updateImageUrls(
      roomId,
      JSON.stringify(newImageUrls)
    );

    return {
      roomId,
      uploadedUrls,
      message: `${uploadedUrls.length} photo(s) added successfully`,
    };
  }

  /**
   * Delete photos from a room
   */
  async deleteRoomPhotos(roomId, ownerId, photoUrls) {
    const room = await this.verifyRoomAccess(roomId, ownerId);

    if (!photoUrls || photoUrls.length === 0) {
      throw new ApiError(400, 'NO_URLS', 'No photo URLs provided');
    }

    // Get current image URLs
    const currentImageUrls = room.image_urls ? JSON.parse(room.image_urls) : [];

    // Remove the specified URLs
    const newImageUrls = currentImageUrls.filter(
      (url) => !photoUrls.includes(url)
    );

    // Extract object names from MinIO URLs and delete from bucket
    const deletePromises = photoUrls.map(async (url) => {
      try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (!parts.length || parts[0] !== bucketName) return;
        const objectName = parts.slice(1).join('/');
        await minioClient.removeObject(bucketName, objectName);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to delete ${url} from MinIO:`, error);
      }
    });

    await Promise.all(deletePromises);

    // Update room image URLs
    await adminRoomRepository.updateImageUrls(
      roomId,
      JSON.stringify(newImageUrls)
    );

    return {
      roomId,
      deletedCount: photoUrls.length,
      message: `${photoUrls.length} photo(s) deleted successfully`,
    };
  }

  /**
   * Get hotel photos
   */
  async getHotelPhotos(hotelId, ownerId) {
    await this.verifyAccess(hotelId, ownerId);

    const hotel = await adminRoomRepository.findHotelById(hotelId);

    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    const imageUrls = hotel.image_urls ? JSON.parse(hotel.image_urls) : [];

    return {
      hotelId: hotel.id,
      hotelName: hotel.name,
      imageUrls,
    };
  }

  /**
   * Add photos to a hotel
   */
  async addHotelPhotos(hotelId, ownerId, files) {
    await this.verifyAccess(hotelId, ownerId);

    const hotel = await adminRoomRepository.findHotelById(hotelId);

    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    if (!files || files.length === 0) {
      throw new ApiError(400, 'NO_FILES', 'No files provided');
    }

    // Process and upload files to MinIO
    const uploadedUrls = await Promise.all(
      files.map(async (file) => {
        const timestamp = new Date()
          .toISOString()
          .replace(/[^a-zA-Z0-9_\-]/g, '-');

        // Convert image to AVIF using sharp
        const avifBuffer = await sharp(file.buffer)
          .avif({ quality: 50 })
          .toBuffer();

        const objectName = `hotels/${hotelId}/${timestamp}.avif`;

        await minioClient.putObject(bucketName, objectName, avifBuffer, {
          'Content-Type': 'image/avif',
        });

        return getObjectUrl(objectName);
      })
    );

    // Update hotel image URLs
    const currentImageUrls = hotel.image_urls
      ? JSON.parse(hotel.image_urls)
      : [];
    const newImageUrls = [...currentImageUrls, ...uploadedUrls];

    await adminRoomRepository.updateHotelImageUrls(
      hotelId,
      JSON.stringify(newImageUrls)
    );

    return {
      hotelId,
      uploadedUrls,
      message: `${uploadedUrls.length} photo(s) added successfully`,
    };
  }

  /**
   * Delete photos from a hotel
   */
  async deleteHotelPhotos(hotelId, ownerId, photoUrls) {
    await this.verifyAccess(hotelId, ownerId);

    const hotel = await adminRoomRepository.findHotelById(hotelId);

    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    if (!photoUrls || photoUrls.length === 0) {
      throw new ApiError(400, 'NO_URLS', 'No photo URLs provided');
    }

    // Get current image URLs
    const currentImageUrls = hotel.image_urls
      ? JSON.parse(hotel.image_urls)
      : [];

    // Remove the specified URLs
    const newImageUrls = currentImageUrls.filter(
      (url) => !photoUrls.includes(url)
    );

    // Extract object names from MinIO URLs and delete from bucket
    const deletePromises = photoUrls.map(async (url) => {
      try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (!parts.length || parts[0] !== bucketName) return;
        const objectName = parts.slice(1).join('/');
        await minioClient.removeObject(bucketName, objectName);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to delete ${url} from MinIO:`, error);
      }
    });

    await Promise.all(deletePromises);

    // Update hotel image URLs
    await adminRoomRepository.updateHotelImageUrls(
      hotelId,
      JSON.stringify(newImageUrls)
    );

    return {
      hotelId,
      deletedCount: photoUrls.length,
      message: `${photoUrls.length} photo(s) deleted successfully`,
    };
  }

  /**
   * Get room inventory
   */
  async getRoomInventory(roomId, ownerId, startDate, endDate) {
    await this.verifyRoomAccess(roomId, ownerId);

    const inventories = await adminRoomRepository.findInventoryByRoomId(
      roomId,
      startDate,
      endDate
    );

    // Get statistics
    const stats = await adminRoomRepository.getRoomInventoryStats(
      roomId,
      startDate,
      endDate
    );

    return {
      roomId,
      inventories: inventories.map((inv) => (inv.toJSON ? inv.toJSON() : inv)),
      statistics: stats,
      period: startDate && endDate ? { startDate, endDate } : null,
    };
  }

  /**
   * Update room inventory
   */
  async updateRoomInventory(roomId, ownerId, inventories) {
    await this.verifyRoomAccess(roomId, ownerId);

    if (!inventories || inventories.length === 0) {
      throw new ApiError(400, 'NO_INVENTORIES', 'No inventory data provided');
    }

    // Update each inventory entry
    const updatePromises = inventories.map(async (inventory) => {
      const updateData = {};

      if (inventory.pricePerNight !== undefined) {
        updateData.price_per_night = inventory.pricePerNight;
      }
      if (inventory.status !== undefined) {
        updateData.status = inventory.status;
      }
      if (inventory.totalReserved !== undefined) {
        updateData.booked_rooms = inventory.totalReserved;
      }

      // Extract date (remove time portion)
      const dateOnly = new Date(inventory.date);
      dateOnly.setHours(0, 0, 0, 0);

      return await adminRoomRepository.upsertInventory(
        roomId,
        dateOnly,
        updateData
      );
    });

    await Promise.all(updatePromises);

    return {
      roomId,
      updatedCount: inventories.length,
      message: `${inventories.length} inventory entry(ies) updated successfully`,
    };
  }
}

module.exports = new AdminRoomService();
