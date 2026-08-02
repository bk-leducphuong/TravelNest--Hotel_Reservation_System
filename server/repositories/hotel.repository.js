const {
  Hotels,
  Rooms,
  Reviews,
  NearbyPlaces,
  RoomInventories,
  Users,
  HotelPolicies,
  Amenities,
  Images,
  ImageVariants,
  HotelRatingSummaries,
  ReviewReplies,
  ReviewMedia,
  Cities,
  Countries,
} = require('../models/index.js');

/**
 * Hotel Repository - Contains all database operations for hotels
 * Only repositories may import Sequelize models
 */

class HotelRepository {
  /**
   * Find hotel by ID with all associations
   */
  async findById(hotelId) {
    return await Hotels.findOne({
      where: { id: hotelId, status: 'active' },
      attributes: [
        'id',
        'name',
        'description',
        'address',
        'city_id',
        'country_id',
        'phone_number',
        'latitude',
        'longitude',
        'hotel_class',
        'check_in_time',
        'check_out_time',
        'check_in_policy',
        'check_out_policy',
        'min_price',
        'status',
        'timezone',
      ],
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category'],
          through: { attributes: [] }, // Exclude junction table fields
        },
        {
          model: Cities,
          as: 'city',
          attributes: ['id', 'name', 'slug', 'latitude', 'longitude'],
          required: false,
        },
        {
          model: Countries,
          as: 'country',
          attributes: ['id', 'name', 'iso_code'],
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
    });
  }

  /**
   * Find hotel rating summary
   */
  async findRatingSummaryByHotelId(hotelId) {
    return await HotelRatingSummaries.findOne({
      where: { hotel_id: hotelId },
      attributes: [
        'overall_rating',
        'total_reviews',
        'rating_10',
        'rating_9',
        'rating_8',
        'rating_7',
        'rating_6',
        'rating_5',
        'rating_4',
        'rating_3',
        'rating_2',
        'rating_1',
        'last_review_date',
      ],
    });
  }

  /**
   * Find hotel images
   */
  async findImagesByHotelId(hotelId) {
    return await Images.findAll({
      where: {
        entity_type: 'hotel',
        entity_id: hotelId,
        status: 'active',
      },
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
    });
  }

  /**
   * Find hotel amenities
   */
  async findAmenitiesByHotelId(hotelId) {
    const hotel = await Hotels.findByPk(hotelId, {
      attributes: ['id'],
      include: [
        {
          model: Amenities,
          as: 'amenities',
          attributes: ['id', 'code', 'name', 'icon', 'category', 'description', 'display_order'],
          through: { attributes: [] },
          where: { is_active: true },
          required: false,
        },
      ],
    });

    return hotel ? hotel.amenities : [];
  }

  /**
   * Find reviews for a hotel with new structure
   */
  async findReviewsByHotelId(hotelId, options = {}) {
    const { limit = 10, offset = 0 } = options;

    const result = await Reviews.findAndCountAll({
      where: {
        hotel_id: hotelId,
        status: 'published',
      },
      attributes: [
        'id',
        'rating_overall',
        'rating_cleanliness',
        'rating_location',
        'rating_service',
        'rating_value',
        'title',
        'comment',
        'is_verified',
        'helpful_count',
        'status',
        'created_at',
      ],
      include: [
        {
          model: Users,
          as: 'user',
          attributes: ['id', 'first_name', 'country'],
        },
        {
          model: ReviewReplies,
          as: 'reply',
          attributes: ['reply_text', 'created_at'],
          required: false,
        },
        {
          model: ReviewMedia,
          as: 'media',
          attributes: ['id', 'media_type', 'url', 'thumbnail_url'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      rows: result.rows,
      count: result.count,
    };
  }

  /**
   * Calculate review criteria averages from review fields
   */
  async findReviewCriteriasByHotelId(hotelId) {
    const sequelize = require('../config/database.config.js');

    const query = `
      SELECT
        AVG(rating_cleanliness) AS cleanliness,
        AVG(rating_location) AS location,
        AVG(rating_service) AS service,
        AVG(rating_value) AS value_for_money,
        AVG(rating_overall) AS overall
      FROM reviews
      WHERE hotel_id = ? AND status = 'published'
    `;

    const result = await sequelize.query(query, {
      replacements: [hotelId],
      type: sequelize.QueryTypes.SELECT,
    });

    return (
      result[0] || {
        cleanliness: null,
        location: null,
        service: null,
        value_for_money: null,
        overall: null,
      }
    );
  }

  /**
   * Find nearby places for a hotel
   */
  async findNearbyPlacesByHotelId(hotelId, options = {}) {
    const { category = null, limit = 20 } = options;

    const where = {
      hotel_id: hotelId,
      is_active: true,
    };

    if (category) {
      where.category = category;
    }

    return await NearbyPlaces.findAll({
      where,
      attributes: [
        'id',
        'name',
        'category',
        'description',
        'address',
        'latitude',
        'longitude',
        'distance_km',
        'travel_time_minutes',
        'travel_mode',
        'rating',
        'website_url',
        'phone_number',
        'opening_hours',
        'price_level',
        'icon',
      ],
      order: [
        ['display_order', 'ASC'],
        ['distance_km', 'ASC'],
      ],
      limit,
    });
  }

  /**
   * Find room by ID
   */
  async findRoomById(roomId) {
    return await Rooms.findOne({
      where: { id: roomId },
      attributes: [
        'id',
        'hotel_id',
        'room_name',
        'max_guests',
        'image_urls',
        'room_amenities',
        'room_size',
        'room_type',
        'quantity',
      ],
    });
  }

  /**
   * Find rooms by hotel ID
   */
  async findRoomsByHotelId(hotelId) {
    return await Rooms.findAll({
      where: { hotel_id: hotelId },
      attributes: [
        'room_id',
        'room_name',
        'max_guests',
        'image_urls',
        'room_amenities',
        'room_size',
        'room_type',
        'quantity',
      ],
    });
  }

  /**
   * Find policies for a hotel
   */
  async findPoliciesByHotelId(hotelId) {
    return await HotelPolicies.findAll({
      where: {
        hotel_id: hotelId,
        is_active: true,
      },
      attributes: ['id', 'policy_type', 'title', 'description', 'display_order', 'icon'],
      order: [['display_order', 'ASC']],
    });
  }

  /**
   * Find a specific nearby place by ID
   */
  async findNearbyPlaceById(placeId) {
    return await NearbyPlaces.findByPk(placeId);
  }

  /**
   * Get nearby places grouped by category
   */
  async findNearbyPlacesGroupedByCategory(hotelId) {
    const sequelize = require('../config/database.config.js');

    const query = `
      SELECT 
        category,
        COUNT(*) as place_count,
        MIN(distance_km) as min_distance,
        AVG(distance_km) as avg_distance
      FROM nearby_places
      WHERE hotel_id = ? AND is_active = true
      GROUP BY category
      ORDER BY category
    `;

    return await sequelize.query(query, {
      replacements: [hotelId],
      type: sequelize.QueryTypes.SELECT,
    });
  }

  /**
   * Find basic hotel cards by ids (for lists like trending/recently viewed).
   * Keeps ordering stable (caller can reorder results).
   */
  async findBasicByIds(hotelIds = []) {
    if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

    const { Op } = require('sequelize');

    return await Hotels.findAll({
      where: {
        id: {
          [Op.in]: hotelIds,
        },
        status: 'active',
      },
      attributes: [
        'id',
        'name',
        'address',
        'latitude',
        'longitude',
        'hotel_class',
        'min_price',
        'status',
        'timezone',
      ],
      include: [
        {
          model: Cities,
          as: 'city',
          attributes: ['id', 'name', 'slug'],
          required: false,
        },
        {
          model: Countries,
          as: 'country',
          attributes: ['id', 'name', 'iso_code'],
          required: false,
        },
        {
          model: Images,
          as: 'images',
          where: { status: 'active' },
          attributes: ['id', 'bucket_name', 'object_key', 'is_primary', 'display_order'],
          required: false,
          order: [
            ['is_primary', 'DESC'],
            ['display_order', 'ASC'],
          ],
        },
      ],
    });
  }
}

module.exports = new HotelRepository();
