const { bucketName } = require('@config/minio.config');
// const { getPresignedUrl } = require('@utils/minio.utils');
const logger = require('@config/logger.config');

const hotelRepository = require('../repositories/hotel.repository');
const roomRepository = require('../repositories/room.repository');
const redisClient = require('../config/redis.config');
const ApiError = require('../utils/ApiError');
const analyticsService = require('./analytics.service');

/**
 * Hotel Service - Contains main business logic
 * Follows RESTful API standards
 */

class HotelService {
  _recentlyViewedKey(userId) {
    return `recently_viewed_hotels:user:${userId}`;
  }

  /**
   * Record a hotel as recently viewed for a user (Redis sorted set).
   * Stores hotelId as member with score=timestamp; keeps only latest N.
   */
  async recordRecentlyViewedHotel(
    userId,
    hotelId,
    { maxItems = 50, ttlSeconds = 60 * 60 * 24 * 30 } = {}
  ) {
    logger.debug({ userId, hotelId }, 'Recording recently viewed hotel');
    if (!userId || !hotelId) return;

    const key = this._recentlyViewedKey(userId);
    const score = Date.now();

    // Update recency
    await redisClient.zAdd(key, [{ score, value: String(hotelId) }]);

    // Trim to latest maxItems (rank 0 is smallest score)
    const safeMax = Math.max(1, parseInt(maxItems, 10) || 50);
    const total = await redisClient.zCard(key);
    if (total > safeMax) {
      await redisClient.zRemRangeByRank(key, 0, total - safeMax - 1);
    }

    // Best-effort TTL
    await redisClient.expire(key, Math.max(60, ttlSeconds));
  }

  async _enrichHotelCardsByIds(hotelIds = []) {
    if (!Array.isArray(hotelIds) || hotelIds.length === 0) return [];

    const rows = await hotelRepository.findBasicByIds(hotelIds);
    const byId = new Map(rows.map((h) => [String(h.id), h]));

    const ordered = hotelIds
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map((hotel) => (hotel.toJSON ? hotel.toJSON() : hotel));

    // Attach a primary image URL (presigned). Keeps payload small.
    return await Promise.all(
      ordered.map(async (h) => {
        const parseNullableNumber = (value) =>
          value !== null && value !== undefined ? parseFloat(value) : null;
        const images = Array.isArray(h.images) ? h.images : [];
        const primary =
          images.find((img) => img.is_primary) ||
          [...images].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0] ||
          null;

        const primaryImageUrl = primary?.object_key ?? null;
        // primary && primary.object_key
        //   ? await getPresignedUrl(primary.bucket_name || bucketName, primary.object_key, 3600)
        //   : null;

        return {
          id: h.id,
          name: h.name,
          address: h.address,
          city: h.city ? { id: h.city.id, name: h.city.name, slug: h.city.slug } : null,
          country: h.country
            ? { id: h.country.id, name: h.country.name, isoCode: h.country.iso_code }
            : null,
          latitude: parseNullableNumber(h.latitude),
          longitude: parseNullableNumber(h.longitude),
          hotelClass: h.hotel_class ?? null,
          minPrice: parseNullableNumber(h.min_price),
          primaryImageUrl,
        };
      })
    );
  }

  /**
   * Get enriched hotel cards from a list of hotel IDs (public).
   */
  async getHotelsByIds(hotelIds) {
    return this._enrichHotelCardsByIds(hotelIds);
  }

  /**
   * Get recently viewed hotels for a user from Redis and enrich from MySQL.
   */
  async getRecentlyViewedHotels(userId, limit = 10) {
    if (!userId) return [];
    const key = this._recentlyViewedKey(userId);

    const safeLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));
    // node-redis v4 uses zRange with { REV: true } instead of zRevRange
    const hotelIds = await redisClient.zRange(key, 0, safeLimit - 1, { REV: true });

    return await this._enrichHotelCardsByIds(hotelIds);
  }

  /**
   * Get trending hotel IDs from analytics service, enrich from MySQL.
   */
  async getTrendingHotels({ limit = 10, days = 2 } = {}) {
    const rows = await analyticsService.getTrendingHotels({ limit, days });
    const hotelIds = rows.map((r) => r.hotelId).filter(Boolean);
    const cards = await this._enrichHotelCardsByIds(hotelIds);

    const viewsById = new Map(rows.map((r) => [String(r.hotelId), r.views]));
    return cards.map((c) => ({ ...c, views: viewsById.get(String(c.id)) || 0 }));
  }

  /**
   * Get hotel details with comprehensive information
   * @param {string} hotelId - Hotel ID (UUID)
   * @param {Object} options - Search options (checkInDate, checkOutDate, numberOfNights, numberOfRooms, numberOfGuests)
   * @returns {Promise<Object>} Hotel details with related data
   */
  async getHotelDetails(hotelId, options = {}) {
    const { checkInDate, checkOutDate, numberOfNights, numberOfRooms, numberOfGuests } = options;

    // Fetch all data in parallel for better performance
    const [hotel, ratingSummary, reviewsResult, reviewCriteria, nearbyPlaces, policies, rooms] =
      await Promise.all([
        // 1. Hotel basic info with amenities and images (already included via associations)
        hotelRepository.findById(hotelId),

        // 2. Rating summary
        hotelRepository.findRatingSummaryByHotelId(hotelId),

        // 3. Reviews with user info, replies, and media
        hotelRepository.findReviewsByHotelId(hotelId, {
          limit: 10,
          offset: 0,
        }),

        // 4. Review criteria averages
        hotelRepository.findReviewCriteriasByHotelId(hotelId),

        // 5. Nearby places
        hotelRepository.findNearbyPlacesByHotelId(hotelId, { limit: 20 }),

        // 6. Hotel policies
        hotelRepository.findPoliciesByHotelId(hotelId),

        // 7. Available rooms (only if search params provided)
        checkInDate && checkOutDate && numberOfNights && numberOfRooms
          ? roomRepository.findAvailableRooms(hotelId, checkInDate, checkOutDate, {
              numberOfRooms,
              numberOfNights,
              numberOfGuests,
            })
          : Promise.resolve([]),
      ]);

    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    // Format hotel data
    const hotelData = hotel.toJSON ? hotel.toJSON() : hotel;

    // Format images with presigned URLs and all variants (works with private bucket)
    const imageList = hotelData.images || [];
    const images = await Promise.all(
      imageList.map(async (img) => {
        const bucket = img.bucket_name || bucketName;
        // const url = await getPresignedUrl(bucket, img.object_key, 3600);
        const url = img.object_key;

        // Generate presigned URLs for each variant
        const variantList = img.image_variants || [];
        const variants = await Promise.all(
          variantList.map(async (v) => {
            const variantBucket = v.bucket_name || bucketName;
            // const variantUrl = await getPresignedUrl(variantBucket, v.object_key, 3600);
            const variantUrl = v.object_key;
            return {
              id: v.id,
              variantType: v.variant_type,
              url: variantUrl,
              width: v.width,
              height: v.height,
            };
          })
        );

        return {
          id: img.id,
          url,
          filename: img.original_filename,
          width: img.width,
          height: img.height,
          isPrimary: img.is_primary,
          displayOrder: img.display_order,
          variants,
        };
      })
    );

    // Format amenities grouped by category
    const amenitiesByCategory = {};
    (hotelData.amenities || []).forEach((amenity) => {
      if (!amenitiesByCategory[amenity.category]) {
        amenitiesByCategory[amenity.category] = [];
      }
      amenitiesByCategory[amenity.category].push({
        id: amenity.id,
        code: amenity.code,
        name: amenity.name,
        icon: amenity.icon,
      });
    });

    // Format rating summary
    const ratingSummaryData = ratingSummary
      ? {
          overallRating: parseFloat(ratingSummary.overall_rating || 0),
          totalReviews: ratingSummary.total_reviews || 0,
          ratingDistribution: {
            rating_10: ratingSummary.rating_10 || 0,
            rating_9: ratingSummary.rating_9 || 0,
            rating_8: ratingSummary.rating_8 || 0,
            rating_7: ratingSummary.rating_7 || 0,
            rating_6: ratingSummary.rating_6 || 0,
            rating_5: ratingSummary.rating_5 || 0,
            rating_4: ratingSummary.rating_4 || 0,
            rating_3: ratingSummary.rating_3 || 0,
            rating_2: ratingSummary.rating_2 || 0,
            rating_1: ratingSummary.rating_1 || 0,
          },
          lastReviewDate: ratingSummary.last_review_date,
        }
      : null;

    // Format review criteria breakdown
    const ratingBreakdown = {
      cleanliness: reviewCriteria.cleanliness
        ? parseFloat(reviewCriteria.cleanliness).toFixed(1)
        : null,
      location: reviewCriteria.location ? parseFloat(reviewCriteria.location).toFixed(1) : null,
      service: reviewCriteria.service ? parseFloat(reviewCriteria.service).toFixed(1) : null,
      valueForMoney: reviewCriteria.value_for_money
        ? parseFloat(reviewCriteria.value_for_money).toFixed(1)
        : null,
      overall: reviewCriteria.overall ? parseFloat(reviewCriteria.overall).toFixed(1) : null,
    };

    // Format reviews
    const reviews = (reviewsResult.rows || []).map((review) => {
      const reviewData = review.toJSON ? review.toJSON() : review;
      return {
        id: reviewData.id,
        ratingOverall: parseFloat(reviewData.rating_overall),
        ratingCleanliness: reviewData.rating_cleanliness
          ? parseFloat(reviewData.rating_cleanliness)
          : null,
        ratingLocation: reviewData.rating_location ? parseFloat(reviewData.rating_location) : null,
        ratingService: reviewData.rating_service ? parseFloat(reviewData.rating_service) : null,
        ratingValue: reviewData.rating_value ? parseFloat(reviewData.rating_value) : null,
        title: reviewData.title,
        comment: reviewData.comment,
        isVerified: reviewData.is_verified,
        helpfulCount: reviewData.helpful_count,
        createdAt: reviewData.created_at,
        user: reviewData.user
          ? {
              id: reviewData.user.id,
              firstName: reviewData.user.first_name,
              country: reviewData.user.country,
            }
          : null,
        reply: reviewData.reply
          ? {
              comment: reviewData.reply.comment,
              createdAt: reviewData.reply.created_at,
            }
          : null,
        media: (reviewData.media || []).map((m) => ({
          id: m.id,
          type: m.media_type,
          url: m.media_url,
        })),
      };
    });

    // Format nearby places
    const formattedNearbyPlaces = nearbyPlaces.map((place) => {
      const placeData = place.toJSON ? place.toJSON() : place;
      return {
        id: placeData.id,
        name: placeData.name,
        category: placeData.category,
        description: placeData.description,
        address: placeData.address,
        latitude: parseFloat(placeData.latitude),
        longitude: parseFloat(placeData.longitude),
        distanceKm: parseFloat(placeData.distance_km),
        travelTimeMinutes: placeData.travel_time_minutes,
        travelMode: placeData.travel_mode,
        rating: placeData.rating ? parseFloat(placeData.rating) : null,
        websiteUrl: placeData.website_url,
        phoneNumber: placeData.phone_number,
        openingHours: placeData.opening_hours,
        priceLevel: placeData.price_level,
        icon: placeData.icon,
      };
    });

    // Format policies
    const formattedPolicies = policies.map((policy) => {
      const policyData = policy.toJSON ? policy.toJSON() : policy;
      return {
        id: policyData.id,
        policyType: policyData.policy_type,
        title: policyData.title,
        description: policyData.description,
        displayOrder: policyData.display_order,
        icon: policyData.icon,
      };
    });

    // Format rooms (if search params provided)
    const formattedRooms = rooms.map((room) => ({
      roomId: room.id || room.room_id,
      roomName: room.room_name,
      maxGuests: room.max_guests,
      roomImageUrls: room.room_image_urls,
      roomAmenities: room.room_amenities,
      pricePerNight: parseFloat(room.price_per_night) || 0,
      availableRooms: room.available_rooms || 0,
      totalPrice:
        numberOfNights && room.price_per_night
          ? parseFloat((parseFloat(room.price_per_night) * numberOfNights).toFixed(2))
          : null,
    }));

    // Build complete response
    return {
      hotel: {
        id: hotelData.id,
        name: hotelData.name,
        description: hotelData.description,
        address: hotelData.address,
        city: hotelData.city,
        country: hotelData.country,
        phoneNumber: hotelData.phone_number,
        latitude: parseFloat(hotelData.latitude),
        longitude: parseFloat(hotelData.longitude),
        hotelClass: hotelData.hotel_class,
        minPrice: hotelData.min_price ? parseFloat(hotelData.min_price) : null,
        status: hotelData.status,
        timezone: hotelData.timezone,
      },
      checkInOut: {
        checkInTime: hotelData.check_in_time,
        checkOutTime: hotelData.check_out_time,
        checkInPolicy: hotelData.check_in_policy,
        checkOutPolicy: hotelData.check_out_policy,
      },
      images,
      amenities: amenitiesByCategory,
      ratingSummary: ratingSummaryData,
      ratingBreakdown,
      reviews,
      nearbyPlaces: formattedNearbyPlaces,
      policies: formattedPolicies,
      rooms: formattedRooms,
      meta: {
        totalReviews: reviewsResult.count || 0,
        hasSearchParams: !!(checkInDate && checkOutDate && numberOfNights),
        searchParams:
          checkInDate && checkOutDate && numberOfNights
            ? {
                checkInDate,
                checkOutDate,
                numberOfNights,
                numberOfRooms,
                numberOfGuests,
              }
            : null,
      },
    };
  }

  /**
   * Search available rooms for a hotel
   * @param {number} hotelId - Hotel ID
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.checkInDate - Check-in date
   * @param {string} searchParams.checkOutDate - Check-out date
   * @param {number} searchParams.numberOfNights - Number of nights (inferred from checkIn/checkOut)
   * @param {number} searchParams.numberOfRooms - Number of rooms needed
   * @param {number} searchParams.numberOfGuests - Number of guests
   * @param {number} searchParams.page - Page number (default: 1)
   * @param {number} searchParams.limit - Items per page (default: 20, max: 100)
   * @returns {Promise<Object>} Available rooms with pagination
   */
  async searchRooms(hotelId, searchParams) {
    const {
      checkInDate,
      checkOutDate,
      numberOfNights,
      numberOfRooms = 1,
      numberOfGuests,
      page = 1,
      limit = 20,
    } = searchParams;

    // Validate required parameters
    if (!checkInDate || !checkOutDate || !numberOfNights) {
      throw new ApiError(
        400,
        'MISSING_PARAMETERS',
        'checkInDate and checkOutDate are required (numberOfNights is inferred from them)'
      );
    }

    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    // Validate limit
    const validatedLimit = Math.min(limit, 100);
    const offset = (page - 1) * validatedLimit;

    // Get available rooms
    const rooms = await roomRepository.findAvailableRooms(hotelId, checkInDate, checkOutDate, {
      numberOfRooms,
      numberOfNights,
      numberOfGuests,
      limit: validatedLimit,
      offset,
    });

    return {
      rooms: rooms.map((room) => ({
        roomId: room.id || room.room_id,
        roomName: room.room_name,
        maxGuests: room.max_guests,
        roomImageUrls: room.room_image_urls,
        roomAmenities: room.room_amenities,
        pricePerNight: parseFloat(room.price_per_night) || 0,
        availableRooms: room.available_rooms || 0,
      })),
      page,
      limit: validatedLimit,
      total: rooms.length, // Note: This is approximate, full count would require separate query
    };
  }

  /**
   * Get all policies for a hotel
   * @param {string} hotelId - Hotel ID (UUID)
   * @returns {Promise<Array>} List of hotel policies
   */
  async getHotelPolicies(hotelId) {
    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    const policies = await hotelRepository.findPoliciesByHotelId(hotelId);

    return policies.map((policy) => ({
      id: policy.id,
      policyType: policy.policy_type,
      title: policy.title,
      description: policy.description,
      displayOrder: policy.display_order,
      icon: policy.icon,
    }));
  }

  /**
   * Get nearby places for a hotel
   * @param {string} hotelId - Hotel ID (UUID)
   * @param {Object} options - Filter options
   * @param {string} options.category - Filter by category
   * @param {number} options.limit - Limit results (default: 20)
   * @returns {Promise<Array>} List of nearby places
   */
  async getNearbyPlaces(hotelId, options = {}) {
    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    const places = await hotelRepository.findNearbyPlacesByHotelId(hotelId, options);

    return places.map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      description: place.description,
      address: place.address,
      latitude: parseFloat(place.latitude),
      longitude: parseFloat(place.longitude),
      distanceKm: parseFloat(place.distance_km),
      travelTimeMinutes: place.travel_time_minutes,
      travelMode: place.travel_mode,
      rating: place.rating ? parseFloat(place.rating) : null,
      websiteUrl: place.website_url,
      phoneNumber: place.phone_number,
      openingHours: place.opening_hours,
      priceLevel: place.price_level,
      icon: place.icon,
    }));
  }

  /**
   * Get nearby places grouped by category
   * @param {string} hotelId - Hotel ID (UUID)
   * @returns {Promise<Array>} Places grouped by category with statistics
   */
  async getNearbyPlacesByCategory(hotelId) {
    // Validate hotel exists
    const hotel = await hotelRepository.findById(hotelId);
    if (!hotel) {
      throw new ApiError(404, 'HOTEL_NOT_FOUND', 'Hotel not found');
    }

    const groupedPlaces = await hotelRepository.findNearbyPlacesGroupedByCategory(hotelId);

    return groupedPlaces.map((group) => ({
      category: group.category,
      placeCount: parseInt(group.place_count),
      minDistance: parseFloat(group.min_distance),
      avgDistance: parseFloat(group.avg_distance),
    }));
  }
}

module.exports = new HotelService();
