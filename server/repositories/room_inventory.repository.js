const { RoomInventory } = require('@models/index.js');
const { Op } = require('sequelize');
const logger = require('@config/logger.config');
const sequelize = require('@config/database.config');

/**
 * Room Inventory Repository
 * Contains all database operations for room inventory
 */
class RoomInventoryRepository {
  /**
   * Get inventory for a room on a specific date
   * @param {string} roomId - Room ID (UUID)
   * @param {string|Date} date - Date (DATEONLY format)
   * @param {Object} options - Sequelize options
   * @returns {Promise<RoomInventory|null>}
   */
  async findByRoomAndDate(roomId, date, options = {}) {
    try {
      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];

      return await RoomInventory.findOne({
        where: {
          room_id: roomId,
          date: dateStr,
        },
        ...options,
      });
    } catch (error) {
      logger.error('Error finding room inventory:', error);
      throw error;
    }
  }

  /**
   * Get inventory for multiple rooms in a date range
   * @param {Array<string>} roomIds - Array of room IDs
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date (exclusive)
   * @param {Object} options - Sequelize options
   * @returns {Promise<Array<RoomInventory>>}
   */
  async findByRoomsAndDateRange(roomIds, startDate, endDate, options = {}) {
    try {
      const startDateStr =
        typeof startDate === 'string'
          ? startDate
          : startDate.toISOString().split('T')[0];
      const endDateStr =
        typeof endDate === 'string'
          ? endDate
          : endDate.toISOString().split('T')[0];

      return await RoomInventory.findAll({
        where: {
          room_id: {
            [Op.in]: roomIds,
          },
          date: {
            [Op.gte]: startDateStr,
            [Op.lt]: endDateStr, // Exclusive end date
          },
        },
        ...options,
      });
    } catch (error) {
      logger.error('Error finding room inventory by range:', error);
      throw error;
    }
  }

  /**
   * Create inventory record for a room on a specific date
   * @param {Object} data - Inventory data
   * @param {string} data.roomId - Room ID
   * @param {string|Date} data.date - Date
   * @param {number} data.totalInventory - Total inventory
   * @param {number} data.totalReserved - Total reserved (default: 0)
   * @param {number} data.pricePerNight - Price per night
   * @param {string} data.status - Status (default: 'open')
   * @param {Object} options - Sequelize options
   * @returns {Promise<RoomInventory>}
   */
  async create(data, options = {}) {
    try {
      const dateStr =
        typeof data.date === 'string'
          ? data.date
          : data.date.toISOString().split('T')[0];

      return await RoomInventory.create(
        {
          room_id: data.roomId,
          date: dateStr,
          total_rooms: data.totalInventory,
          booked_rooms: data.totalReserved || 0,
          price_per_night: data.pricePerNight,
          status: data.status || 'open',
        },
        options
      );
    } catch (error) {
      logger.error('Error creating room inventory:', error);
      throw error;
    }
  }

  /**
   * Update inventory record
   * @param {string} roomId - Room ID
   * @param {string|Date} date - Date
   * @param {Object} updateData - Data to update
   * @param {Object} options - Sequelize options
   * @returns {Promise<[number, Array<RoomInventory>]>}
   */
  async update(roomId, date, updateData, options = {}) {
    try {
      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];

      const mappedData = {};
      if (updateData.totalInventory !== undefined)
        mappedData.total_rooms = updateData.totalInventory;
      if (updateData.totalReserved !== undefined)
        mappedData.booked_rooms = updateData.totalReserved;
      if (updateData.pricePerNight !== undefined)
        mappedData.price_per_night = updateData.pricePerNight;
      if (updateData.status !== undefined)
        mappedData.status = updateData.status;

      return await RoomInventory.update(mappedData, {
        where: {
          room_id: roomId,
          date: dateStr,
        },
        ...options,
      });
    } catch (error) {
      logger.error('Error updating room inventory:', error);
      throw error;
    }
  }

  /**
   * Increment reserved count for a room on a date
   * @param {string} roomId - Room ID
   * @param {string|Date} date - Date
   * @param {number} quantity - Quantity to increment
   * @param {Object} options - Sequelize options (transaction)
   * @returns {Promise<[number, Array<RoomInventory>]>}
   */
  async incrementReserved(roomId, date, quantity, options = {}) {
    try {
      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];

      // Use Sequelize increment to ensure atomicity
      return await RoomInventory.increment(
        { booked_rooms: quantity },
        {
          where: {
            room_id: roomId,
            date: dateStr,
          },
          ...options,
        }
      );
    } catch (error) {
      logger.error('Error incrementing reserved count:', error);
      throw error;
    }
  }

  /**
   * Decrement reserved count for a room on a date
   * @param {string} roomId - Room ID
   * @param {string|Date} date - Date
   * @param {number} quantity - Quantity to decrement
   * @param {Object} options - Sequelize options (transaction)
   * @returns {Promise<[number, Array<RoomInventory>]>}
   */
  async decrementReserved(roomId, date, quantity, options = {}) {
    try {
      const dateStr =
        typeof date === 'string' ? date : date.toISOString().split('T')[0];

      // Use Sequelize decrement to ensure atomicity
      return await RoomInventory.decrement(
        { booked_rooms: quantity },
        {
          where: {
            room_id: roomId,
            date: dateStr,
          },
          ...options,
        }
      );
    } catch (error) {
      logger.error('Error decrementing reserved count:', error);
      throw error;
    }
  }

  /**
   * Batch increment reserved count for multiple rooms in a date range
   * @param {Array<Object>} reservations - Array of {roomId, quantity}
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date (exclusive)
   * @param {Object} options - Sequelize options (transaction)
   * @returns {Promise<void>}
   */
  async batchIncrementReserved(reservations, startDate, endDate, options = {}) {
    const transaction = options.transaction || (await sequelize.transaction());
    const shouldCommit = !options.transaction;

    try {
      const startDateObj =
        typeof startDate === 'string' ? new Date(startDate) : startDate;
      const endDateObj =
        typeof endDate === 'string' ? new Date(endDate) : endDate;

      // Generate all dates in the range
      const dates = [];
      const currentDate = new Date(startDateObj);
      while (currentDate < endDateObj) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Increment for each room and date combination
      for (const reservation of reservations) {
        const { roomId, quantity } = reservation;

        for (const date of dates) {
          await this.incrementReserved(roomId, date, quantity, {
            transaction,
          });
        }
      }

      if (shouldCommit) {
        await transaction.commit();
      }
    } catch (error) {
      if (shouldCommit) {
        await transaction.rollback();
      }
      logger.error('Error batch incrementing reserved:', error);
      throw error;
    }
  }

  /**
   * Batch decrement reserved count for multiple rooms in a date range
   * @param {Array<Object>} reservations - Array of {roomId, quantity}
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date (exclusive)
   * @param {Object} options - Sequelize options (transaction)
   * @returns {Promise<void>}
   */
  async batchDecrementReserved(reservations, startDate, endDate, options = {}) {
    const transaction = options.transaction || (await sequelize.transaction());
    const shouldCommit = !options.transaction;

    try {
      const startDateObj =
        typeof startDate === 'string' ? new Date(startDate) : startDate;
      const endDateObj =
        typeof endDate === 'string' ? new Date(endDate) : endDate;

      // Generate all dates in the range
      const dates = [];
      const currentDate = new Date(startDateObj);
      while (currentDate < endDateObj) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Decrement for each room and date combination
      for (const reservation of reservations) {
        const { roomId, quantity } = reservation;

        for (const date of dates) {
          await this.decrementReserved(roomId, date, quantity, {
            transaction,
          });
        }
      }

      if (shouldCommit) {
        await transaction.commit();
      }
    } catch (error) {
      if (shouldCommit) {
        await transaction.rollback();
      }
      logger.error('Error batch decrementing reserved:', error);
      throw error;
    }
  }

  /**
   * Check availability for rooms in a date range
   * @param {Array<string>} roomIds - Array of room IDs
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date (exclusive)
   * @param {number} quantity - Required quantity per room
   * @returns {Promise<boolean>} True if all rooms are available
   */
  async checkAvailability(roomIds, startDate, endDate, quantity = 1) {
    try {
      const inventories = await this.findByRoomsAndDateRange(
        roomIds,
        startDate,
        endDate
      );

      // Check if all dates have sufficient inventory
      for (const inventory of inventories) {
        const available = inventory.total_rooms - inventory.booked_rooms;
        if (available < quantity || inventory.status !== 'open') {
          return false;
        }
      }

      // Check if we have inventory for all dates in the range
      const startDateObj =
        typeof startDate === 'string' ? new Date(startDate) : startDate;
      const endDateObj =
        typeof endDate === 'string' ? new Date(endDate) : endDate;
      const expectedDates = [];
      const currentDate = new Date(startDateObj);
      while (currentDate < endDateObj) {
        expectedDates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const foundDates = new Set(
        inventories.map((inv) => inv.date.toISOString().split('T')[0])
      );

      // Check if all expected dates are present
      for (const date of expectedDates) {
        if (!foundDates.has(date)) {
          return false; // Missing inventory for this date
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking availability:', error);
      throw error;
    }
  }
}

module.exports = new RoomInventoryRepository();
