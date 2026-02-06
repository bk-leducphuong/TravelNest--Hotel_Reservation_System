const roomInventoryRepository = require('@repositories/room_inventory.repository');
const logger = require('@config/logger.config');
const ApiError = require('@utils/ApiError');

/**
 * Inventory Service
 * Handles room inventory operations (reserve, release, check availability)
 */
class InventoryService {
  /**
   * Reserve rooms for a booking
   * Increments total_reserved for each room and date in the date range
   *
   * @param {Object} data - Reservation data
   * @param {Array<Object>} data.bookedRooms - Array of {room_id, roomQuantity}
   * @param {string|Date} data.checkInDate - Check-in date
   * @param {string|Date} data.checkOutDate - Check-out date (exclusive)
   * @param {Object} options - Additional options (transaction, etc.)
   * @returns {Promise<void>}
   */
  async reserveRooms(data, options = {}) {
    const { bookedRooms, checkInDate, checkOutDate } = data;

    if (
      !bookedRooms ||
      !Array.isArray(bookedRooms) ||
      bookedRooms.length === 0
    ) {
      throw new ApiError(
        400,
        'INVALID_BOOKED_ROOMS',
        'bookedRooms must be a non-empty array'
      );
    }

    if (!checkInDate || !checkOutDate) {
      throw new ApiError(
        400,
        'MISSING_DATES',
        'checkInDate and checkOutDate are required'
      );
    }

    try {
      // Validate date range
      const startDate =
        typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
      const endDate =
        typeof checkOutDate === 'string'
          ? new Date(checkOutDate)
          : checkOutDate;

      if (startDate >= endDate) {
        throw new ApiError(
          400,
          'INVALID_DATE_RANGE',
          'checkOutDate must be after checkInDate'
        );
      }

      // Prepare reservations array
      const reservations = bookedRooms.map((room) => ({
        roomId: room.room_id,
        quantity: room.roomQuantity || 1,
      }));

      logger.info('Reserving rooms', {
        reservations,
        checkInDate: startDate.toISOString().split('T')[0],
        checkOutDate: endDate.toISOString().split('T')[0],
      });

      // Batch increment reserved count
      await roomInventoryRepository.batchIncrementReserved(
        reservations,
        startDate,
        endDate,
        options
      );

      logger.info('Rooms reserved successfully', {
        roomCount: reservations.length,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
      });
    } catch (error) {
      logger.error('Error reserving rooms:', error);

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        500,
        'RESERVE_ROOMS_FAILED',
        'Failed to reserve rooms',
        { originalError: error.message }
      );
    }
  }

  /**
   * Release rooms from a cancelled booking
   * Decrements total_reserved for each room and date in the date range
   *
   * @param {Object} data - Release data
   * @param {Array<Object>} data.bookedRooms - Array of {room_id, roomQuantity}
   * @param {string|Date} data.checkInDate - Check-in date
   * @param {string|Date} data.checkOutDate - Check-out date (exclusive)
   * @param {Object} options - Additional options (transaction, etc.)
   * @returns {Promise<void>}
   */
  async releaseRooms(data, options = {}) {
    const { bookedRooms, checkInDate, checkOutDate } = data;

    if (
      !bookedRooms ||
      !Array.isArray(bookedRooms) ||
      bookedRooms.length === 0
    ) {
      throw new ApiError(
        400,
        'INVALID_BOOKED_ROOMS',
        'bookedRooms must be a non-empty array'
      );
    }

    if (!checkInDate || !checkOutDate) {
      throw new ApiError(
        400,
        'MISSING_DATES',
        'checkInDate and checkOutDate are required'
      );
    }

    try {
      // Validate date range
      const startDate =
        typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
      const endDate =
        typeof checkOutDate === 'string'
          ? new Date(checkOutDate)
          : checkOutDate;

      if (startDate >= endDate) {
        throw new ApiError(
          400,
          'INVALID_DATE_RANGE',
          'checkOutDate must be after checkInDate'
        );
      }

      // Prepare reservations array
      const reservations = bookedRooms.map((room) => ({
        roomId: room.room_id,
        quantity: room.roomQuantity || 1,
      }));

      logger.info('Releasing rooms', {
        reservations,
        checkInDate: startDate.toISOString().split('T')[0],
        checkOutDate: endDate.toISOString().split('T')[0],
      });

      // Batch decrement reserved count
      await roomInventoryRepository.batchDecrementReserved(
        reservations,
        startDate,
        endDate,
        options
      );

      logger.info('Rooms released successfully', {
        roomCount: reservations.length,
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
      });
    } catch (error) {
      logger.error('Error releasing rooms:', error);

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        500,
        'RELEASE_ROOMS_FAILED',
        'Failed to release rooms',
        { originalError: error.message }
      );
    }
  }

  /**
   * Check availability for rooms in a date range
   *
   * @param {Object} data - Availability check data
   * @param {Array<string>} data.roomIds - Array of room IDs
   * @param {string|Date} data.checkInDate - Check-in date
   * @param {string|Date} data.checkOutDate - Check-out date (exclusive)
   * @param {number} data.quantity - Required quantity per room (default: 1)
   * @returns {Promise<boolean>} True if all rooms are available
   */
  async checkAvailability(data) {
    const { roomIds, checkInDate, checkOutDate, quantity = 1 } = data;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      throw new ApiError(
        400,
        'INVALID_ROOM_IDS',
        'roomIds must be a non-empty array'
      );
    }

    if (!checkInDate || !checkOutDate) {
      throw new ApiError(
        400,
        'MISSING_DATES',
        'checkInDate and checkOutDate are required'
      );
    }

    try {
      const startDate =
        typeof checkInDate === 'string' ? new Date(checkInDate) : checkInDate;
      const endDate =
        typeof checkOutDate === 'string'
          ? new Date(checkOutDate)
          : checkOutDate;

      if (startDate >= endDate) {
        throw new ApiError(
          400,
          'INVALID_DATE_RANGE',
          'checkOutDate must be after checkInDate'
        );
      }

      const isAvailable = await roomInventoryRepository.checkAvailability(
        roomIds,
        startDate,
        endDate,
        quantity
      );

      logger.info('Availability check completed', {
        roomIds,
        checkInDate: startDate.toISOString().split('T')[0],
        checkOutDate: endDate.toISOString().split('T')[0],
        quantity,
        isAvailable,
      });

      return isAvailable;
    } catch (error) {
      logger.error('Error checking availability:', error);

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        500,
        'CHECK_AVAILABILITY_FAILED',
        'Failed to check availability',
        { originalError: error.message }
      );
    }
  }

  /**
   * Get inventory details for rooms in a date range
   *
   * @param {Object} data - Query data
   * @param {Array<string>} data.roomIds - Array of room IDs
   * @param {string|Date} data.startDate - Start date
   * @param {string|Date} data.endDate - End date (exclusive)
   * @returns {Promise<Array<RoomInventory>>} Array of inventory records
   */
  async getInventoryDetails(data) {
    const { roomIds, startDate, endDate } = data;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length === 0) {
      throw new ApiError(
        400,
        'INVALID_ROOM_IDS',
        'roomIds must be a non-empty array'
      );
    }

    if (!startDate || !endDate) {
      throw new ApiError(
        400,
        'MISSING_DATES',
        'startDate and endDate are required'
      );
    }

    try {
      const start =
        typeof startDate === 'string' ? new Date(startDate) : startDate;
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

      const inventories = await roomInventoryRepository.findByRoomsAndDateRange(
        roomIds,
        start,
        end
      );

      logger.info('Retrieved inventory details', {
        roomIds,
        dateRange: {
          from: start.toISOString().split('T')[0],
          to: end.toISOString().split('T')[0],
        },
        recordCount: inventories.length,
      });

      return inventories;
    } catch (error) {
      logger.error('Error getting inventory details:', error);

      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      throw new ApiError(
        500,
        'GET_INVENTORY_FAILED',
        'Failed to get inventory details',
        { originalError: error.message }
      );
    }
  }
}

module.exports = new InventoryService();
