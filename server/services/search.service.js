/**
 * Hotel Search Service V2
 * Flow:
 * Phase 1: Elasticsearch - Find candidate hotels (fast filtering)
 * Phase 2: Database - Check date-specific availability
 * Phase 3: Database - Get room details and pricing
 * Phase 4: Merge ES data with DB data
 * Phase 5: Re-rank and sort results
 * Phase 6: Format and paginate response
 */

const natsPublisher = require('@events/nats.publisher');
const { v4: uuidv4 } = require('uuid');

const { getPresignedUrl, bucketName } = require('@utils/minio.utils');
const elasticsearchHelper = require('../helpers/elasticsearch.helper');
const destinationElasticsearchHelper = require('../helpers/destination_elasticsearch.helper');
const searchRepository = require('../repositories/search.repository');
const destinationRepository = require('../repositories/destination.repository');
const imageRepository = require('../repositories/image.repository');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger.config');
const redisClient = require('../config/redis.config');
const analyticsService = require('./analytics.service');

class SearchService {
  _recentSearchKey(userId) {
    return `recent_searches:user:${userId}`;
  }

  /**
   * Store a compact representation of the user's recent search in Redis.
   */
  async recordRecentSearch(
    userId,
    rawParams,
    { maxItems = 20, ttlSeconds = 60 * 60 * 24 * 30 } = {}
  ) {
    if (!userId) return;

    const key = this._recentSearchKey(userId);

    const payload = {
      cityId: rawParams.cityId ?? null,
      countryId: rawParams.countryId ?? null,
      city: rawParams.city || null,
      country: rawParams.country || null,
      latitude: rawParams.latitude ?? null,
      longitude: rawParams.longitude ?? null,
      radius: rawParams.radius ?? null,
      checkIn: rawParams.checkIn,
      checkOut: rawParams.checkOut,
      adults: rawParams.adults,
      children: rawParams.children ?? 0,
      rooms: rawParams.rooms ?? 1,
      sortBy: rawParams.sortBy || 'relevance',
      minPrice: rawParams.minPrice ?? null,
      maxPrice: rawParams.maxPrice ?? null,
      minRating: rawParams.minRating ?? null,
      hotelClass: rawParams.hotelClass ?? null,
      amenities: rawParams.amenities ?? null,
      createdAt: new Date().toISOString(),
    };

    const value = JSON.stringify(payload);
    const score = Date.now();

    await redisClient.zAdd(key, [{ score, value }]);

    const safeMax = Math.max(1, parseInt(maxItems, 10) || 20);
    const total = await redisClient.zCard(key);
    if (total > safeMax) {
      await redisClient.zRemRangeByRank(key, 0, total - safeMax - 1);
    }

    await redisClient.expire(key, Math.max(60, ttlSeconds));
  }

  /**
   * Get user's recent searches from Redis (most recent first).
   */
  async getRecentSearches(userId, limit = 10) {
    if (!userId) return [];
    const key = this._recentSearchKey(userId);
    const safeLimit = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));

    const raw = await redisClient.zRange(key, 0, safeLimit - 1, { REV: true });
    const searches = raw
      .map((s) => {
        try {
          return JSON.parse(s);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const cityIds = [
      ...new Set(searches.map((s) => s.cityId).filter(Boolean)),
    ];

    if (cityIds.length > 0) {
      const imagesByCityId = await imageRepository.getCityImagesByCityIds(cityIds);

      for (const search of searches) {
        if (!search.cityId) continue;

        const cityImages = imagesByCityId.get(search.cityId) || [];
        const primaryImage =
          cityImages.find((img) => img.isPrimary) || cityImages[0] || null;

        search.image = primaryImage
          ? { objectKey: primaryImage.objectKey }
          : null;
      }
    }

    return searches;
  }

  /**
   * Get top popular/trending destinations from analytics service.
   * Includes city images (primary image + variants) when available.
   */
  async getTrendingDestinations({ limit = 5, days = 30 } = {}) {
    const safeLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 5));
    const safeDays = Math.max(1, Math.min(365, parseInt(days, 10) || 30));

    const rows = await analyticsService.getTrendingDestinations({
      limit: safeLimit,
      days: safeDays,
    });

    const destinations = [];
    const cityIdsForImages = new Set();

    for (const row of rows) {
      const destination = (await destinationRepository.findActiveById(row.destinationId)) || null;

      if (!destination) {
        continue;
      }

      if (destination.type === 'city' && destination.city_id) {
        cityIdsForImages.add(destination.city_id);
      }

      destinations.push({
        id: destination.id,
        type: destination.type,
        cityId: destination.city_id,
        countryId: destination.country_id,
        displayName: destination.display_name,
        countryName: destination.country_name,
        searchCount: Number(row.searchCount) || 0,
        uniqueUsers: Number(row.uniqueUsers) || 0,
        images: null,
      });
    }

    if (cityIdsForImages.size > 0) {
      const imagesByCityId = await imageRepository.getCityImagesByCityIds(
        Array.from(cityIdsForImages)
      );

      for (const dest of destinations) {
        if (dest.type !== 'city' || !dest.cityId) continue;

        const cityImages = imagesByCityId.get(dest.cityId) || [];
        const primaryImage = cityImages.find((img) => img.isPrimary) || cityImages[0] || null;

        dest.images = {
          primary: primaryImage,
        };
      }

      // Convert primary image and variants to presigned URLs (instead of bucket/objectKey)
      //   const expirySeconds = 60 * 60; // 1 hour
      //   for (const dest of destinations) {
      //     const primary = dest.images?.primary;
      //     if (!primary?.bucketName || !primary?.objectKey) {
      //       dest.images.primary = null;
      //       continue;
      //     }
      //
      //     try {
      //       const primaryUrl = await getPresignedUrl(
      //         primary.bucketName || bucketName,
      //         primary.objectKey,
      //         expirySeconds
      //       );
      //       const variantsWithUrls = await Promise.all(
      //         (primary.variants || []).map(async (v) => {
      //           const url = await getPresignedUrl(
      //             v.bucketName || bucketName,
      //             v.objectKey,
      //             expirySeconds
      //           );
      //           return {
      //             id: v.id,
      //             variantType: v.variantType,
      //             width: v.width,
      //             height: v.height,
      //             url,
      //           };
      //         })
      //       );
      //       dest.images.primary = {
      //         id: primary.id,
      //         width: primary.width,
      //         height: primary.height,
      //         isPrimary: primary.isPrimary,
      //         displayOrder: primary.displayOrder,
      //         url: primaryUrl,
      //         variants: variantsWithUrls,
      //       };
      //     } catch (err) {
      //       logger.warn(err, 'Failed to get presigned URL for trending destination image');
      //       dest.images.primary = null;
      //     }
      //   }
    }

    return destinations;
  }

  /**
   * Main search hotels method
   *
   * @param {Object} params - Search parameters (already validated by middleware)
   * @returns {Promise<Object>} Search results with pagination
   */
  async searchHotels(params, userId = null) {
    const startTime = Date.now();

    try {
      const destination = await this._resolveDestination(params);

      const paramsWithDestination = {
        ...params,
        destinationId: destination?.id || null,
        destinationType: destination?.type || null,
        cityId: destination?.city_id || params.cityId || null,
        countryId: destination?.country_id || params.countryId || null,
        city:
          destination?.type === 'city'
            ? destination.display_name
            : params.city || destination?.display_name || null,
        country: destination?.country_name || params.country || null,
      };

      // Calculate derived fields
      const checkIn = new Date(paramsWithDestination.checkIn);
      const checkOut = new Date(paramsWithDestination.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const totalGuests = paramsWithDestination.adults + (paramsWithDestination.children || 0);

      const validated = {
        ...paramsWithDestination,
        nights,
        totalGuests,
      };

      // Phase 1: Elasticsearch - Find candidate hotels
      const candidateHotels = await this._phase1_findCandidates(validated);

      if (candidateHotels.length === 0) {
        return this._formatEmptyResponse(validated, startTime);
      }

      const hotelIds = candidateHotels.map((h) => h.hotel_id);

      // Phase 2: Database - Check date-specific availability
      const availableHotels = await this._phase2_checkAvailability(hotelIds, validated);

      if (availableHotels.length === 0) {
        return this._formatEmptyResponse(validated, startTime);
      }

      // Phase 3: Database - Get room details and pricing
      const hotelsWithRooms = await this._phase3_getRoomDetails(availableHotels, validated);

      // Phase 4: Merge ES data with DB data
      const enrichedHotels = await this._phase4_mergeData(candidateHotels, hotelsWithRooms);

      // Apply filters that depend on date-specific room pricing.
      const filteredHotels = this._applyDateSpecificFilters(enrichedHotels, validated);

      // Phase 5: Re-rank and sort
      const rankedHotels = this._phase5_rankAndSort(filteredHotels, validated.sortBy);

      // Phase 6: Format and paginate response
      const response = this._phase6_formatResponse(
        rankedHotels,
        validated,
        candidateHotels.length,
        startTime
      );

      await this._attachFavoriteStatus(response, userId);

      logger.info(
        {
          candidates: candidateHotels.length,
          available: rankedHotels.length,
          duration: Date.now() - startTime,
        },
        'Hotel search completed'
      );

      return {
        destination: {
          id: destination?.id || null,
          type: destination?.type || null,
        },
        searchResults: response,
      };
    } catch (error) {
      logger.error(error, 'Hotel search error:');
      throw error;
    }
  }

  /**
   * Phase 1: Elasticsearch - Find candidate hotels
   * Fast filtering by location, price, amenities, rating, etc.
   *
   * @private
   * @returns {Promise<Array>} Candidate hotels from ES
   */
  async _phase1_findCandidates(params) {
    try {
      // Check if ES is available
      const esAvailable = await elasticsearchHelper.isAvailable();

      if (!esAvailable) {
        logger.warn('Elasticsearch unavailable, falling back to database');
        return await searchRepository.searchHotelsFromDatabase(params);
      }

      // Build and execute ES query
      const esQuery = elasticsearchHelper.buildSearchQuery(params);
      const results = await elasticsearchHelper.search(esQuery);

      return results;
    } catch (error) {
      logger.error(error, 'Phase 1 error, falling back to database');
      // Fallback to database search
      return await searchRepository.searchHotelsFromDatabase(params);
    }
  }

  /**
   * Phase 2: Database - Check date-specific availability
   * Verify hotels have rooms available for ALL nights in date range
   *
   * @private
   * @returns {Promise<Array>} Hotels with availability
   */
  async _phase2_checkAvailability(hotelIds, params) {
    const { checkIn, checkOut, rooms, totalGuests } = params;

    const availableHotels = await searchRepository.checkDateRangeAvailability({
      hotelIds,
      checkIn,
      checkOut,
      requiredRooms: rooms,
      totalGuests,
    });

    return availableHotels;
  }

  /**
   * Phase 3: Database - Get room details and pricing
   * Fetch available room types with actual pricing for the date range
   *
   * @private
   * @returns {Promise<Array>} Hotels with room details
   */
  async _phase3_getRoomDetails(availableHotels, params) {
    const { checkIn, checkOut, rooms, totalGuests } = params;

    const hotelsWithRooms = await Promise.all(
      availableHotels.map(async (hotel) => {
        const roomDetails = await searchRepository.getAvailableRoomsForHotel({
          hotelId: hotel.hotel_id,
          checkIn,
          checkOut,
          requiredRooms: rooms,
          totalGuests,
        });

        return {
          hotel_id: hotel.hotel_id,
          min_price_for_dates: roomDetails[0]?.total_price || null,
          available_rooms: roomDetails,
          total_available_rooms: hotel.total_available_rooms,
        };
      })
    );

    // Filter out hotels with no available rooms
    return hotelsWithRooms.filter((h) => h.available_rooms.length > 0);
  }

  /**
   * Phase 4: Merge ES data with DB data
   * Combine Elasticsearch metadata with database availability/pricing
   *
   * @private
   * @returns {Promise<Array>} Enriched hotel data
   */
  async _phase4_mergeData(candidateHotels, hotelsWithRooms) {
    // Create a map for quick lookup
    const esDataMap = new Map(candidateHotels.map((h) => [h.hotel_id, h]));

    const dbDataMap = new Map(hotelsWithRooms.map((h) => [h.hotel_id, h]));

    // Merge data
    const enrichedHotels = [];

    for (const [hotelId, dbData] of dbDataMap) {
      const esData = esDataMap.get(hotelId);

      if (!esData) continue; // Skip if not in ES results

      enrichedHotels.push({
        // From Elasticsearch
        hotel_id: esData.hotel_id,
        hotel_name: esData.hotel_name,
        city: esData.city,
        country: esData.country,
        latitude: esData.latitude,
        longitude: esData.longitude,
        distance_km: esData.distance_km || null,
        avg_rating: esData.avg_rating,
        review_count: esData.review_count,
        hotel_class: esData.hotel_class,
        amenity_codes: this._normalizeList(esData.amenity_codes),
        has_free_cancellation: esData.has_free_cancellation,
        primary_image_url: esData.primary_image_url,
        total_bookings: esData.total_bookings,
        view_count: esData.view_count,

        // From Database (calculated for specific dates)
        min_price_for_dates: dbData.min_price_for_dates,
        min_price_per_night: dbData.available_rooms[0]?.price_per_night || null,
        available_rooms: dbData.available_rooms,
        total_available_rooms: dbData.total_available_rooms,
      });
    }

    return enrichedHotels;
  }

  _normalizeList(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Apply filters that need exact room prices for the requested dates.
   *
   * @private
   */
  _applyDateSpecificFilters(hotels, params) {
    const { minPrice, maxPrice } = params;

    if (minPrice === undefined && maxPrice === undefined) {
      return hotels;
    }

    return hotels.filter((hotel) => {
      const perNight = parseFloat(
        hotel.min_price_per_night ?? hotel.available_rooms?.[0]?.price_per_night
      );

      if (!Number.isFinite(perNight)) {
        return false;
      }

      if (minPrice !== undefined && perNight < parseFloat(minPrice)) {
        return false;
      }

      if (maxPrice !== undefined && perNight > parseFloat(maxPrice)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Build lightweight filter counts for the current available result set.
   *
   * @private
   */
  _buildFilterOptions(hotels) {
    const amenityCounts = {};
    const hotelClassCounts = {};
    const reviewScores = {
      4.5: 0,
      4: 0,
      3.5: 0,
      3: 0,
    };
    const popular = {
      freeCancellation: 0,
    };
    const prices = [];

    hotels.forEach((hotel) => {
      const price = parseFloat(hotel.min_price_per_night);
      if (Number.isFinite(price)) {
        prices.push(price);
      }

      if (hotel.has_free_cancellation) {
        popular.freeCancellation += 1;
      }

      if (hotel.hotel_class) {
        const key = String(hotel.hotel_class);
        hotelClassCounts[key] = (hotelClassCounts[key] || 0) + 1;
      }

      const rating = parseFloat(hotel.avg_rating);
      if (Number.isFinite(rating)) {
        Object.keys(reviewScores).forEach((threshold) => {
          if (rating >= parseFloat(threshold)) {
            reviewScores[threshold] += 1;
          }
        });
      }

      (hotel.amenity_codes || []).forEach((code) => {
        amenityCounts[code] = (amenityCounts[code] || 0) + 1;
      });
    });

    return {
      budget: {
        min: prices.length ? Math.min(...prices) : null,
        max: prices.length ? Math.max(...prices) : null,
      },
      amenities: amenityCounts,
      hotelClass: hotelClassCounts,
      reviewScores,
      popular,
    };
  }

  /**
   * Phase 5: Re-rank and sort results
   * Apply user's sorting preference or smart ranking
   *
   * @private
   * @returns {Array} Sorted hotels
   */
  _phase5_rankAndSort(hotels, sortBy) {
    const sorted = [...hotels];

    switch (sortBy) {
      case 'price_asc':
        sorted.sort(
          (a, b) => (a.min_price_for_dates || Infinity) - (b.min_price_for_dates || Infinity)
        );
        break;

      case 'price_desc':
        sorted.sort((a, b) => (b.min_price_for_dates || 0) - (a.min_price_for_dates || 0));
        break;

      case 'rating':
        sorted.sort((a, b) => {
          if (b.avg_rating !== a.avg_rating) {
            return (b.avg_rating || 0) - (a.avg_rating || 0);
          }
          return (b.review_count || 0) - (a.review_count || 0);
        });
        break;

      case 'distance':
        sorted.sort((a, b) => (a.distance_km || Infinity) - (b.distance_km || Infinity));
        break;

      case 'popularity':
        sorted.sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0));
        break;

      case 'relevance':
      default:
        // Smart ranking: combine multiple factors
        sorted.sort((a, b) => {
          const scoreA = this._calculateSmartScore(a);
          const scoreB = this._calculateSmartScore(b);
          return scoreB - scoreA;
        });
        break;
    }

    return sorted;
  }

  /**
   * Calculate smart ranking score
   * Combines rating, popularity, and price
   *
   * @private
   */
  _calculateSmartScore(hotel) {
    const ratingScore = (hotel.avg_rating || 0) * 20; // 0-100
    const popularityScore = Math.min((hotel.total_bookings || 0) / 10, 50); // 0-50
    const reviewScore = Math.min((hotel.review_count || 0) / 5, 30); // 0-30

    return ratingScore + popularityScore + reviewScore;
  }

  /**
   * Phase 6: Format and paginate response
   *
   * @private
   * @returns {Object} Formatted response
   */
  _phase6_formatResponse(hotels, params, totalCandidates, startTime) {
    const { page, limit } = params;

    const total = hotels.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedHotels = hotels.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        hotels: paginatedHotels,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        filters_applied: {
          destinationId: params.destinationId,
          destinationType: params.destinationType,
          cityId: params.cityId,
          countryId: params.countryId,
          city: params.city,
          country: params.country,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          nights: params.nights,
          adults: params.adults,
          children: params.children,
          rooms: params.rooms,
          totalGuests: params.totalGuests,
          priceRange: {
            min: params.minPrice,
            max: params.maxPrice,
          },
          minRating: params.minRating,
          hotelClass: params.hotelClass,
          amenities: params.amenities,
          freeCancellation: params.freeCancellation,
          sortBy: params.sortBy,
        },
        filter_options: this._buildFilterOptions(hotels),
        search_metadata: {
          es_candidates: totalCandidates,
          available_hotels: total,
          search_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Attach authenticated user's favorite status to the hotels returned on this page.
   *
   * @private
   */
  async _attachFavoriteStatus(response, userId) {
    const hotels = response?.data?.hotels || [];

    if (hotels.length === 0) {
      return;
    }

    if (!userId) {
      hotels.forEach((hotel) => {
        hotel.is_favorite = false;
      });
      return;
    }

    const hotelIds = hotels.map((hotel) => hotel.hotel_id).filter(Boolean);
    const favoriteHotelIds = await userRepository.findFavoriteHotelIds(userId, hotelIds);
    const favoriteHotelIdSet = new Set(favoriteHotelIds.map((hotelId) => Number(hotelId)));

    hotels.forEach((hotel) => {
      hotel.is_favorite = favoriteHotelIdSet.has(Number(hotel.hotel_id));
    });
  }

  /**
   * Format empty response
   *
   * @private
   */
  _formatEmptyResponse(params, startTime) {
    return {
      success: true,
      data: {
        hotels: [],
        pagination: {
          page: params.page,
          limit: params.limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        filters_applied: {
          destinationId: params.destinationId,
          destinationType: params.destinationType,
          cityId: params.cityId,
          countryId: params.countryId,
          city: params.city,
          country: params.country,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          nights: params.nights,
        },
        search_metadata: {
          es_candidates: 0,
          available_hotels: 0,
          search_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
        filter_options: this._buildFilterOptions([]),
        suggestions: {
          message: 'No hotels found matching your criteria',
          alternatives: [
            'Try expanding your search radius',
            'Adjust your price range',
            'Try different dates',
            'Remove some filters',
          ],
        },
      },
    };
  }

  /**
   * Get hotel availability details
   *
   * @param {string} hotelId - Hotel ID
   * @param {Object} params - Search parameters (already validated by middleware)
   * @returns {Promise<Object>} Hotel availability details
   */
  async getHotelAvailability(hotelId, params) {
    const { checkIn, checkOut, rooms, adults, children } = params;
    const totalGuests = adults + (children || 0);

    // Check availability
    const availability = await searchRepository.checkDateRangeAvailability({
      hotelIds: [hotelId],
      checkIn,
      checkOut,
      requiredRooms: rooms,
      totalGuests,
    });

    if (availability.length === 0) {
      throw new ApiError(404, 'NOT_AVAILABLE', 'Hotel not available for selected dates');
    }

    // Get room details
    const roomDetails = await searchRepository.getAvailableRoomsForHotel({
      hotelId,
      checkIn,
      checkOut,
      requiredRooms: rooms,
      totalGuests,
    });

    // Get hotel details
    const hotelDetails = await searchRepository.getHotelDetailsByIds([hotelId]);

    return {
      success: true,
      data: {
        hotel: hotelDetails[0],
        availability: {
          is_available: true,
          available_rooms: roomDetails,
          total_available_rooms: availability[0].total_available_rooms,
        },
        search_params: {
          checkIn,
          checkOut,
          nights: Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)),
          adults,
          children,
          rooms,
        },
      },
    };
  }

  /**
   * Get autocomplete suggestions
   *
   * @param {string} query - Search query (already validated by middleware)
   * @param {number} limit - Number of suggestions
   * @returns {Promise<Array>} Suggestions
   */
  async getAutocompleteSuggestions(query, limit = 10) {
    try {
      const suggestions = await elasticsearchHelper.getSuggestions(query, limit);

      return {
        success: true,
        data: {
          suggestions,
        },
      };
    } catch (error) {
      logger.error('Autocomplete error:', error);
      return {
        success: true,
        data: {
          suggestions: [],
        },
      };
    }
  }

  /**
   * Get destination autocomplete suggestions
   *
   * @param {string} query - Destination name prefix
   * @param {number} limit - Number of suggestions
   */
  async getDestinationAutocomplete(query, limit = 10) {
    try {
      const suggestions = await destinationElasticsearchHelper.getSuggestions(query, limit);

      return {
        success: true,
        data: {
          suggestions,
        },
      };
    } catch (error) {
      logger.error({ error }, 'Destination autocomplete error:');
      return {
        success: true,
        data: {
          suggestions: [],
        },
      };
    }
  }

  /**
   * Publish search log for analytics.
   *
   * @param {Object} searchData - Search data
   * @param {string} userId - User ID (optional)
   * @param {Object} metadata - Additional metadata (resultCount, searchTimeMs, etc.)
   * @returns {Promise<{ eventId: string } | null>} Event info
   */
  async saveSearchLog(searchData, userId = null, metadata = {}) {
    try {
      const eventId = uuidv4();
      const occurredAt = new Date();

      await natsPublisher.publish(
        'analytics.search.performed.v1',
        {
          userId,
          destinationId: searchData.destinationId || null,
          destinationType: searchData.destinationType || searchData.destination_type || '',
          checkInDate: searchData.checkIn,
          checkOutDate: searchData.checkOut,
          adults: searchData.adults,
          children: searchData.children || 0,
          rooms: searchData.rooms || 1,
        },
        { eventId, occurredAt, correlationId: metadata.correlationId }
      );

      return { eventId };
    } catch (error) {
      logger.error(error, 'Failed to publish search log:');
      return null;
    }
  }

  /**
   * Resolve unified destination (city or country) from raw search parameters.
   *
   * @private
   */
  async _resolveDestination(params) {
    const explicitDestinationId = params.destinationId;
    if (explicitDestinationId) {
      const existing = await destinationRepository.findActiveById(explicitDestinationId);
      if (existing) return existing;
    }

    const text = (params.city || params.country || params.location || '').trim();
    if (!text) return null;

    try {
      const esResults = await destinationElasticsearchHelper.searchByText(text, 10);

      const cities = esResults.filter((d) => d.type === 'city');
      if (cities.length > 0) {
        return cities[0];
      }

      const countries = esResults.filter((d) => d.type === 'country');
      if (countries.length > 0) {
        return countries[0];
      }
    } catch (error) {
      logger.error(error, 'Destination ES resolution error, falling back to DB');
    }

    const fallback = await destinationRepository.findBestMatchByName(text);
    return fallback;
  }
}

module.exports = new SearchService();
