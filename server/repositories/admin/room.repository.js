const {
  Rooms,
  RoomInventories,
  Hotels,
} = require('../../models/index.js');
const { Op } = require('sequelize');

/**
 * Admin Room Repository - Contains all database operations for admin room management
 * Only repositories may import Sequelize models
 */

class AdminRoomRepository {
  /**
   * Find all rooms by hotel ID
   */
  async findByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId },
      order: [['created_at', 'DESC']],
    });
  }

  /**
   * Find room by ID
   */
  async findById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
    });
  }

  /**
   * Find room by ID and hotel ID (for authorization)
   */
  async findByIdAndHotelId(roomId, hotelId) {
    return await Rooms.findOne({
      where: {
        id: roomId,
        hotel_id: hotelId,
      },
    });
  }

  /**
   * Create a new room
   */
  async create(roomData) {
    return await Rooms.create(roomData);
  }

  /**
   * Update room information
   */
  async update(roomId, updateData) {
    return await Rooms.update(updateData, {
      where: { id: roomId },
    });
  }

  /**
   * Delete a room
   */
  async delete(roomId) {
    return await Rooms.destroy({
      where: { id: roomId },
    });
  }

  /**
   * Update room image URLs
   */
  async updateImageUrls(roomId, imageUrls) {
    return await Rooms.update(
      { image_urls: imageUrls },
      {
        where: { id: roomId },
      }
    );
  }

  /**
   * Find hotel by ID
   */
  async findHotelById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId },
    });
  }

  /**
   * Update hotel image URLs
   */
  async updateHotelImageUrls(hotelId, imageUrls) {
    return await Hotels.update(
      { image_urls: imageUrls },
      {
        where: { id: hotelId },
      }
    );
  }

  /**
   * Verify hotel ownership
   */
  async verifyHotelOwnership(hotelId, ownerId) {
    const hotel = await Hotels.findOne({
      where: {
        id: hotelId,
        owner_id: ownerId,
      },
    });
    return !!hotel;
  }

  // Room Inventory Operations

  /**
   * Create room inventory entries
   */
  async createInventory(inventoryData) {
    return await RoomInventories.create(inventoryData);
  }

  /**
   * Create multiple room inventory entries
   */
  async bulkCreateInventory(inventoryDataArray) {
    return await RoomInventories.bulkCreate(inventoryDataArray);
  }

  /**
   * Find room inventory by room ID with optional date range
   */
  async findInventoryByRoomId(roomId, startDate, endDate) {
    const where = { room_id: roomId };

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }

    return await RoomInventories.findAll({
      where,
      order: [['date', 'ASC']],
    });
  }

  /**
   * Update or create room inventory (upsert)
   */
  async upsertInventory(roomId, date, inventoryData) {
    const [inventory, created] = await RoomInventories.findOrCreate({
      where: {
        room_id: roomId,
        date: date,
      },
      defaults: {
        room_id: roomId,
        date: date,
        ...inventoryData,
      },
    });

    if (!created) {
      await RoomInventories.update(inventoryData, {
        where: {
          room_id: roomId,
          date: date,
        },
      });
      return await RoomInventories.findOne({
        where: { room_id: roomId, date: date },
      });
    }

    return inventory;
  }

  /**
   * Delete all room inventories for a room
   */
  async deleteInventoriesByRoomId(roomId) {
    return await RoomInventories.destroy({
      where: { room_id: roomId },
    });
  }

  /**
   * Get room inventory statistics
   */
  async getRoomInventoryStats(roomId, startDate, endDate) {
    const where = { room_id: roomId };

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [startDate, endDate],
      };
    }

    const inventories = await RoomInventories.findAll({
      where,
      attributes: ['total_rooms', 'booked_rooms', 'price_per_night'],
    });

    const totalDays = inventories.length;
    const averagePrice =
      inventories.reduce(
        (sum, inv) => sum + parseFloat(inv.price_per_night || 0),
        0
      ) / totalDays || 0;

    const totalReserved = inventories.reduce(
      (sum, inv) => sum + parseInt(inv.booked_rooms || 0),
      0
    );

    const totalInventory = inventories.reduce(
      (sum, inv) => sum + parseInt(inv.total_rooms || 0),
      0
    );

    const occupancyRate =
      totalInventory > 0 ? (totalReserved / totalInventory) * 100 : 0;

    return {
      totalDays,
      averagePrice: parseFloat(averagePrice.toFixed(2)),
      totalReserved,
      totalInventory,
      occupancyRate: parseFloat(occupancyRate.toFixed(2)),
    };
  }
}

module.exports = new AdminRoomRepository();
