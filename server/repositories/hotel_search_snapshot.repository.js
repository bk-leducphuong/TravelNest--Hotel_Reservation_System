const { hotel_search_snapshots, hotels, room_inventory, hotel_amenities, amenities } = require('../models');
const { Op, Sequelize } = require('sequelize');

/**
 * Create or update hotel search snapshot
 */
const upsertSnapshot = async (hotelId, data) => {
  return await hotel_search_snapshots.upsert({
    hotel_id: hotelId,
    ...data,
  });
};

/**
 * Create initial empty snapshot for new hotel
 */
const createInitialSnapshot = async (hotelId, hotelData) => {
  return await hotel_search_snapshots.create({
    hotel_id: hotelId,
    hotel_name: hotelData.name,
    city: hotelData.city,
    country: hotelData.country,
    latitude: hotelData.latitude,
    longitude: hotelData.longitude,
    hotel_class: hotelData.hotel_class,
    status: hotelData.status || 'active',
    is_available: false,
    has_available_rooms: false,
    min_price: null,
    max_price: null,
    avg_rating: 0.0,
    review_count: 0,
    amenity_codes: [],
    has_free_cancellation: false,
    total_bookings: 0,
    view_count: 0,
  });
};

/**
 * Recompute pricing from room inventory
 */
const recomputePricing = async (hotelId) => {
  const now = new Date();
  
  // Get all rooms for this hotel
  const { rooms } = require('../models');
  const hotelRooms = await rooms.findAll({
    where: { hotel_id: hotelId },
    attributes: ['id'],
  });

  const roomIds = hotelRooms.map((r) => r.id);

  if (roomIds.length === 0) {
    return { min_price: null, max_price: null, has_available_rooms: false };
  }

  // Get pricing and availability from future inventory
  const priceData = await room_inventory.findOne({
    where: {
      room_id: { [Op.in]: roomIds },
      date: { [Op.gte]: now },
      status: 'open',
      [Sequelize.literal]: Sequelize.literal('booked_rooms < total_rooms'),
    },
    attributes: [
      [Sequelize.fn('MIN', Sequelize.col('price_per_night')), 'min_price'],
      [Sequelize.fn('MAX', Sequelize.col('price_per_night')), 'max_price'],
      [Sequelize.fn('COUNT', Sequelize.col('room_id')), 'count'],
    ],
    raw: true,
  });

  return {
    min_price: priceData?.min_price || null,
    max_price: priceData?.max_price || null,
    has_available_rooms: (priceData?.count || 0) > 0,
  };
};

/**
 * Recompute rating from hotel_rating_summaries
 */
const recomputeRating = async (hotelId) => {
  const { hotel_rating_summaries } = require('../models');
  
  const ratingSummary = await hotel_rating_summaries.findOne({
    where: { hotel_id: hotelId },
    attributes: ['overall_rating', 'total_reviews'],
    raw: true,
  });

  return {
    avg_rating: ratingSummary?.overall_rating || 0.0,
    review_count: ratingSummary?.total_reviews || 0,
  };
};

/**
 * Recompute amenities from hotel_amenities junction table
 */
const recomputeAmenities = async (hotelId) => {
  const amenityData = await hotel_amenities.findAll({
    where: {
      hotel_id: hotelId,
      is_available: true,
    },
    include: [
      {
        model: amenities,
        as: 'amenity',
        attributes: ['code'],
      },
    ],
    raw: true,
  });

  const amenityCodes = amenityData.map((a) => a['amenity.code']).filter(Boolean);
  
  return { amenity_codes: amenityCodes };
};

/**
 * Check if hotel has any free cancellation options
 */
const checkFreeCancellation = async (hotelId) => {
  // TODO: Implement based on booking policy table if exists
  // For now, return false
  return { has_free_cancellation: false };
};

/**
 * Get hotel basic info for snapshot
 */
const getHotelBasicInfo = async (hotelId) => {
  const hotel = await hotels.findByPk(hotelId, {
    attributes: ['id', 'name', 'city', 'country', 'latitude', 'longitude', 'hotel_class', 'status'],
    raw: true,
  });

  if (!hotel) {
    throw new Error(`Hotel ${hotelId} not found`);
  }

  return {
    hotel_name: hotel.name,
    city: hotel.city,
    country: hotel.country,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    hotel_class: hotel.hotel_class,
    status: hotel.status,
  };
};

/**
 * Get primary image URL for hotel
 */
const getPrimaryImageUrl = async (hotelId) => {
  const { images } = require('../models');
  
  const primaryImage = await images.findOne({
    where: {
      entity_type: 'hotel',
      entity_id: hotelId,
      is_primary: true,
      status: 'active',
    },
    attributes: ['object_key', 'bucket_name'],
    raw: true,
  });

  // TODO: Generate signed URL from MinIO
  // For now, return a placeholder or construct URL
  if (primaryImage) {
    return {
      primary_image_url: `/images/${primaryImage.bucket_name}/${primaryImage.object_key}`,
    };
  }

  return { primary_image_url: null };
};

/**
 * Full snapshot refresh - recompute everything
 */
const fullRefresh = async (hotelId) => {
  const [basicInfo, pricingData, ratingData, amenityData, imageData, freeCancelData] =
    await Promise.all([
      getHotelBasicInfo(hotelId),
      recomputePricing(hotelId),
      recomputeRating(hotelId),
      recomputeAmenities(hotelId),
      getPrimaryImageUrl(hotelId),
      checkFreeCancellation(hotelId),
    ]);

  const snapshotData = {
    ...basicInfo,
    ...pricingData,
    ...ratingData,
    ...amenityData,
    ...imageData,
    ...freeCancelData,
    is_available: pricingData.has_available_rooms && basicInfo.status === 'active',
  };

  return await upsertSnapshot(hotelId, snapshotData);
};

/**
 * Partial update - only update specific fields
 */
const partialUpdate = async (hotelId, fields) => {
  return await hotel_search_snapshots.update(fields, {
    where: { hotel_id: hotelId },
  });
};

/**
 * Get snapshot by hotel ID
 */
const getByHotelId = async (hotelId) => {
  return await hotel_search_snapshots.findByPk(hotelId);
};

/**
 * Increment view count
 */
const incrementViewCount = async (hotelId) => {
  return await hotel_search_snapshots.increment('view_count', {
    where: { hotel_id: hotelId },
  });
};

/**
 * Increment booking count
 */
const incrementBookingCount = async (hotelId) => {
  return await hotel_search_snapshots.increment('total_bookings', {
    where: { hotel_id: hotelId },
  });
};

module.exports = {
  upsertSnapshot,
  createInitialSnapshot,
  recomputePricing,
  recomputeRating,
  recomputeAmenities,
  fullRefresh,
  partialUpdate,
  getByHotelId,
  incrementViewCount,
  incrementBookingCount,
  getHotelBasicInfo,
  getPrimaryImageUrl,
  checkFreeCancellation,
};
