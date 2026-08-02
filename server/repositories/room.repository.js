const { Rooms, RoomInventories, Amenities, Images, ImageVariants } = require('../models/index.js');

/**
 * Room Repository - Contains all database operations for rooms
 * Only repositories may import Sequelize models
 */

class RoomRepository {
  /**
   * Find available rooms for a hotel with date range and filters
   * Uses a single parameterized inventory query to avoid correlated subqueries
   */
  async findAvailableRooms(hotelId, checkInDate, checkOutDate, options = {}) {
    const { numberOfRooms = 1, numberOfNights, numberOfGuests, limit, offset } = options;
    const sequelize = require('../config/database.config');
    const { Op } = require('sequelize');

    const inventoryQuery = `
      SELECT
        ri.room_id,
        SUM(ri.price_per_night) AS price_per_night,
        MIN(ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) AS available_rooms
      FROM room_inventory ri
      INNER JOIN rooms r ON r.id = ri.room_id
      WHERE ri.date >= ?
        AND ri.date < ?
        AND ri.status = 'open'
        AND r.hotel_id = ?
        AND r.status = 'active'
      GROUP BY ri.room_id
      HAVING COUNT(CASE WHEN (ri.total_rooms - ri.booked_rooms - COALESCE(ri.held_rooms, 0)) >= ? THEN 1 END) = ?
    `;

    const inventoryResult = await sequelize.query(inventoryQuery, {
      replacements: [checkInDate, checkOutDate, hotelId, numberOfRooms, numberOfNights],
      type: sequelize.QueryTypes.SELECT,
    });

    if (inventoryResult.length === 0) {
      return [];
    }

    const roomIds = inventoryResult.map((r) => r.room_id);
    const roomPriceMap = new Map(
      inventoryResult.map((r) => [
        r.room_id,
        { price_per_night: Number(r.price_per_night) || 0, available_rooms: Number(r.available_rooms) || 0 },
      ])
    );

    const roomWhere = {
      id: { [Op.in]: roomIds },
      hotel_id: hotelId,
      status: 'active',
    };

    if (numberOfGuests) {
      roomWhere.max_guests = { [Op.gte]: numberOfGuests };
    }

    const rooms = await Rooms.findAll({
      attributes: ['id', 'room_name', 'max_guests', 'room_size', 'room_type', 'quantity'],
      where: roomWhere,
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: [
            'id',
            'bucket_name',
            'object_key',
            'original_filename',
            'width',
            'height',
            'is_primary',
            'display_order',
          ],
          required: false,
          separate: true,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
          include: [
            {
              model: ImageVariants,
              as: 'image_variants',
              attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
              required: false,
            },
          ],
        },
      ],
      limit: limit || undefined,
      offset: offset || undefined,
    });

    return rooms.map((room) => {
      const roomData = room.toJSON();
      const prices = roomPriceMap.get(roomData.id) || {};
      return {
        room_id: roomData.id,
        room_name: roomData.room_name,
        max_guests: roomData.max_guests,
        room_size: roomData.room_size,
        room_type: roomData.room_type,
        price_per_night: prices.price_per_night,
        available_rooms: prices.available_rooms,
        room_amenities: roomData.amenities || [],
        room_image_urls: roomData.images || [],
      };
    });
  }

  /**
   * Find room by ID with associations
   */
  async findById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId, status: 'active' },
      attributes: [
        'id',
        'hotel_id',
        'room_name',
        'max_guests',
        'room_size',
        'room_type',
        'quantity',
        'status',
      ],
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: [
            'id',
            'bucket_name',
            'object_key',
            'original_filename',
            'width',
            'height',
            'is_primary',
            'display_order',
          ],
          required: false,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
          include: [
            {
              model: ImageVariants,
              as: 'image_variants',
              attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
              required: false,
            },
          ],
        },
      ],
    });
  }

  /**
   * Find rooms by hotel ID
   */
  async findByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId, status: 'active' },
      attributes: ['id', 'room_name', 'max_guests', 'room_size', 'room_type', 'quantity', 'status'],
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: [
            'id',
            'bucket_name',
            'object_key',
            'original_filename',
            'width',
            'height',
            'is_primary',
            'display_order',
          ],
          required: false,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
          include: [
            {
              model: ImageVariants,
              as: 'image_variants',
              attributes: ['id', 'variant_type', 'bucket_name', 'object_key', 'width', 'height'],
              required: false,
            },
          ],
        },
      ],
    });
  }
}

module.exports = new RoomRepository();
