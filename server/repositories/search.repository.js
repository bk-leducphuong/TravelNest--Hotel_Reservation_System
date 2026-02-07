const {
  Hotels,
  Rooms,
  RoomInventories,
  SearchLogs,
} = require('../models/index.js');
const { Op } = require('sequelize');
const { Sequelize } = require('sequelize');
const sequelize = require('../config/database.config.js');

/**
 * Search Repository - Contains all database operations for search
 * Only repositories may import Sequelize models
 */

class SearchRepository {
  /**
   * Search hotels by location and availability
   * Uses raw query for complex search with availability checks
   */
  async searchHotelsByLocation(searchParams) {
    const {
      location,
      totalGuests,
      checkInDate,
      checkOutDate,
      rooms,
      numberOfDays,
    } = searchParams;

    const query = `
      SELECT DISTINCT 
        h.hotel_id, 
        h.name, 
        h.address, 
        h.city, 
        h.overall_rating, 
        h.hotel_class, 
        h.image_urls, 
        h.latitude, 
        h.longitude
      FROM hotels h
      JOIN rooms r ON h.hotel_id = r.hotel_id
      JOIN room_inventory ri ON r.room_id = ri.room_id
      WHERE h.city = ?
        AND r.max_guests >= ?
        AND ri.date BETWEEN ? AND ?
        AND ri.status = 'open'
      GROUP BY 
        h.hotel_id, h.name, h.address, h.city, h.overall_rating, h.hotel_class, h.image_urls, 
        h.latitude, h.longitude, r.room_id, ri.price_per_night, r.max_guests, r.room_name
      HAVING COUNT(CASE WHEN ri.total_rooms - ri.booked_rooms >= ? THEN 1 END) = ?
    `;

    return await sequelize.query(query, {
      replacements: [
        location,
        totalGuests,
        checkInDate,
        checkOutDate,
        rooms,
        numberOfDays,
      ],
      type: sequelize.QueryTypes.SELECT,
    });
  }

  /**
   * Get lowest price for a hotel within date range
   */
  async getLowestPriceForHotel(hotelId, checkInDate, checkOutDate) {
    const result = await RoomInventories.findOne({
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('price_per_night')), 'total_price'],
      ],
      include: [
        {
          model: Rooms,
          required: true,
          where: {
            hotel_id: hotelId,
          },
        },
      ],
      where: {
        date: {
          [Op.between]: [checkInDate, checkOutDate],
        },
        status: 'open',
      },
      group: ['room_id'],
      order: [[Sequelize.fn('SUM', Sequelize.col('price_per_night')), 'ASC']],
      raw: true,
    });

    return result ? parseFloat(result.total_price) : null;
  }

  /**
   * Create search log
   */
  async createSearchLog(searchData) {
    const {
      location,
      userId,
      checkInDate,
      checkOutDate,
      adults,
      children,
      rooms,
      numberOfDays,
    } = searchData;

    return await SearchLogs.create({
      location,
      user_id: userId,
      search_time: Sequelize.literal('CURRENT_TIMESTAMP'),
      children,
      adults,
      rooms,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      number_of_days: numberOfDays,
    });
  }

  /**
   * Find hotels by city
   */
  async findHotelsByCity(city) {
    return await Hotels.findAll({
      where: { city },
      attributes: [
        'hotel_id',
        'name',
        'address',
        'city',
        'overall_rating',
        'hotel_class',
        'image_urls',
        'latitude',
        'longitude',
      ],
    });
  }
}

module.exports = new SearchRepository();
