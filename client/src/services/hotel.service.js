import http from './http';

export const HotelService = {
  /**
   * GET /v1/hotels/recently-viewed
   * Get recently viewed hotels for the authenticated user (requires auth).
   */
  getRecentlyViewed(limit = 10) {
    return http.get('/hotels/recently-viewed', { params: { limit } });
  },

  /**
   * GET /v1/hotels/trending
   * Get trending hotels based on view/booking activity (public).
   */
  getTrendingHotels(params = {}) {
    return http.get('/hotels/trending', { params });
  },

  /**
   * POST /v1/hotels/batch
   * Get enriched hotel cards for a list of hotel IDs (public).
   */
  getHotelsByIds(ids) {
    return http.post('/hotels/batch', { ids });
  },

  getHotelDetails(hotelId, params = {}) {
    return http.get(`/hotels/${hotelId}`, { params });
  },

  getHotelPolicies(hotelId) {
    return http.get(`/hotels/${hotelId}/policies`);
  },

  getNearbyPlaces(hotelId, params = {}) {
    return http.get(`/hotels/${hotelId}/nearby-places`, { params });
  },

  searchAvailableRooms(hotelId, params) {
    return http.get(`/hotels/${hotelId}/rooms`, { params });
  },

  checkRoomAvailability(hotelId, params) {
    return http.get(`/search/hotels/${hotelId}/availability`, { params });
  },
};
