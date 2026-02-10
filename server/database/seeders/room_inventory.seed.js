/**
 * Room Inventory Seed File
 *
 * Creates room_inventory rows (per-room, per-date availability and price).
 * Requires existing rooms in the database.
 *
 * Usage:
 *   - Run directly: node database/seeders/room_inventory.seed.js
 *   - Import and use: const { seedRoomInventory } = require('./database/seeders/room_inventory.seed');
 *
 * Options:
 *   - daysAhead: Number of days from today to seed (default: 90)
 *   - roomIds: Optional array of room UUIDs to seed (default: all rooms)
 *   - clearExisting: Whether to clear existing room_inventory before seeding (default: false)
 *   - priceMin / priceMax: Price per night range (default: 80–350)
 *   - currency: Currency code (default: 'USD')
 *
 * Note: Requires rooms to be seeded first. total_rooms is set from each room's quantity.
 */

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});

const { faker } = require('@faker-js/faker');
const db = require('../../models');
const sequelize = require('../../config/database.config');
const { CURRENCIES } = require('../../constants/common');

const { rooms: Rooms, room_inventory: RoomInventory } = db;

const INVENTORY_STATUSES = ['open', 'close', 'sold_out', 'maintenance'];

/**
 * Format date as YYYY-MM-DD for DATEONLY
 * @param {Date} d
 * @returns {string}
 */
function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Generate inventory records for one room over a date range
 * @param {string} roomId - Room UUID
 * @param {number} quantity - Room quantity (total_rooms per date)
 * @param {Date} startDate - First date (inclusive)
 * @param {Date} endDate - Last date (inclusive)
 * @param {Object} options - priceMin, priceMax, currency
 * @returns {Array<Object>}
 */
function generateInventoryForRoom(roomId, quantity, startDate, endDate, options = {}) {
  const {
    priceMin = 80,
    priceMax = 350,
    currency = 'USD',
  } = options;

  const records = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dateStr = toDateOnly(current);
    const booked = faker.number.int({ min: 0, max: Math.max(0, quantity - 1) });
    const held = faker.number.int({ min: 0, max: Math.max(0, quantity - booked) });
    const status = faker.helpers.arrayElement([
      'open',
      'open',
      'open',
      'open',
      ...INVENTORY_STATUSES.filter((s) => s !== 'open'),
    ]);

    records.push({
      room_id: roomId,
      date: dateStr,
      total_rooms: quantity,
      booked_rooms: status === 'sold_out' ? quantity : booked,
      held_rooms: status === 'sold_out' ? 0 : held,
      status,
      price_per_night: String(faker.number.float({ min: priceMin, max: priceMax, fractionDigits: 2 })),
      currency,
    });

    current.setDate(current.getDate() + 1);
  }

  return records;
}

/**
 * Seed room_inventory for a date range
 * @param {Object} options - Seeding options
 * @param {number} options.daysAhead - Days from today to seed (default: 90)
 * @param {Array<string>} options.roomIds - Room UUIDs to seed (default: all)
 * @param {boolean} options.clearExisting - Clear existing inventory first (default: false)
 * @param {number} options.priceMin - Min price per night (default: 80)
 * @param {number} options.priceMax - Max price per night (default: 350)
 * @param {string} options.currency - Currency code (default: 'USD')
 * @returns {Promise<{ created: number }>}
 */
async function seedRoomInventory(options = {}) {
  const {
    daysAhead = 90,
    roomIds = null,
    clearExisting = false,
    priceMin = 80,
    priceMax = 350,
    currency = 'USD',
  } = options;

  if (!CURRENCIES.includes(currency)) {
    throw new Error(`Invalid currency: ${currency}. Must be one of: ${CURRENCIES.join(', ')}`);
  }

  try {
    console.log('🌱 Starting room inventory seeding...');

    const where = roomIds && roomIds.length > 0 ? { id: roomIds } : {};
    const roomList = await Rooms.findAll({
      where,
      attributes: ['id', 'quantity'],
    });

    if (roomList.length === 0) {
      console.log('⚠️  No rooms found. Seed rooms first.');
      return { created: 0 };
    }

    if (clearExisting) {
      const ids = roomList.map((r) => r.id);
      console.log('🗑️  Clearing existing room_inventory for selected rooms...');
      const deleted = await RoomInventory.destroy({ where: { room_id: ids } });
      console.log(`✅ Deleted ${deleted} existing row(s)`);
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysAhead - 1);

    const opts = { priceMin, priceMax, currency };
    const allRecords = [];

    for (const room of roomList) {
      const quantity = Math.max(1, Number(room.quantity) || 1);
      const records = generateInventoryForRoom(
        room.id,
        quantity,
        startDate,
        endDate,
        opts
      );
      allRecords.push(...records);
    }

    if (allRecords.length > 0) {
      await RoomInventory.bulkCreate(allRecords, {
        validate: true,
      });
      console.log(`✅ Created ${allRecords.length} room_inventory row(s)`);
    }

    const total = await RoomInventory.count();
    console.log(`🎉 Total room_inventory rows: ${total}`);

    return { created: allRecords.length };
  } catch (error) {
    console.error('❌ Error seeding room inventory:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedRoomInventory({
        daysAhead: 90,
        clearExisting: false,
        priceMin: 80,
        priceMax: 350,
        currency: 'USD',
      });

      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedRoomInventory,
  generateInventoryForRoom,
  toDateOnly,
};
