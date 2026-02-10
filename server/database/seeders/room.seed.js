/**
 * Room Seed File
 *
 * Generates fake room data using Faker.js and seeds the database.
 * Requires existing hotels in the database.
 *
 * Usage:
 *   - Run directly: node database/seeders/room.seed.js
 *   - Import and use: const { seedRooms } = require('./database/seeders/room.seed');
 *
 * Options:
 *   - roomsPerHotel: Number of rooms to generate per hotel (default: 3-8 random)
 *   - clearExisting: Whether to clear existing rooms before seeding (default: false)
 *
 * Note: This seed file requires hotels to exist in the database first.
 * Room images and room amenities are stored in images and room_amenities tables; seed those separately if needed.
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
const { ROOM_TYPES, ROOM_STATUSES } = require('../../constants/rooms');
const { rooms: Rooms, hotels: Hotels } = db;

/**
 * Format room type for display (e.g. deluxe -> Deluxe)
 */
function roomTypeDisplayName(roomType) {
  return roomType.charAt(0).toUpperCase() + roomType.slice(1);
}

/**
 * Generate fake room data for a hotel
 * @param {string} hotelId - Hotel UUID
 * @param {number} count - Number of rooms to generate
 * @returns {Array<Object>} Array of room data objects matching rooms table
 */
function generateRoomsForHotel(hotelId, count) {
  const roomList = [];

  for (let i = 0; i < count; i++) {
    const roomType = faker.helpers.arrayElement(ROOM_TYPES);
    const maxGuests = faker.helpers.arrayElement([1, 2, 3, 4, 5, 6]);
    const roomSize = faker.number.int({ min: 15, max: 100 });
    const quantity = faker.number.int({ min: 1, max: 10 });
    const roomName = `${roomTypeDisplayName(roomType)} ${faker.number.int({ min: 100, max: 999 })}`;

    roomList.push({
      hotel_id: hotelId,
      room_name: roomName,
      max_guests: maxGuests,
      room_size: roomSize,
      room_type: roomType,
      quantity,
      status: faker.helpers.arrayElement([
        'active',
        'active',
        'active',
        ...ROOM_STATUSES.filter((s) => s !== 'active'),
      ]),
    });
  }

  return roomList;
}

/**
 * Seed rooms into the database
 * @param {Object} options - Seeding options
 * @param {number|Object} options.roomsPerHotel - Number of rooms per hotel (default: random 3-8)
 *   Can be a number or object with min/max: { min: 3, max: 8 }
 * @param {boolean} options.clearExisting - Whether to clear existing rooms (default: false)
 * @param {Array<string>} options.hotelIds - Specific hotel UUIDs to seed (optional, seeds all if not provided)
 */
async function seedRooms(options = {}) {
  const {
    roomsPerHotel = { min: 3, max: 8 },
    clearExisting = false,
    hotelIds = null,
  } = options;

  try {
    console.log('🌱 Starting room seeding...');

    // Get all hotels or specific hotels
    let hotelQuery = {};
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelQuery = { id: hotelIds };
    }

    const existingHotels = await Hotels.findAll({
      where: hotelQuery,
      attributes: ['id'],
    });

    if (existingHotels.length === 0) {
      console.log('❌ No hotels found in database. Please seed hotels first.');
      return;
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);

    // Clear existing rooms if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing rooms...');
      if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        await Rooms.destroy({ where: { hotel_id: hotelIds } });
      } else {
        await Rooms.destroy({ where: {}, force: true });
      }
      console.log('✅ Existing rooms cleared');
    }

    let totalRoomsCreated = 0;
    const roomsToCreate = [];

    // Generate rooms for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');

      // Determine number of rooms for this hotel
      let numRooms;
      if (typeof roomsPerHotel === 'number') {
        numRooms = roomsPerHotel;
      } else {
        numRooms = faker.number.int({
          min: roomsPerHotel.min || 3,
          max: roomsPerHotel.max || 8,
        });
      }

      const hotelRooms = generateRoomsForHotel(hotelId, numRooms);
      roomsToCreate.push(...hotelRooms);
      totalRoomsCreated += hotelRooms.length;

      console.log(
        `   📦 Generated ${hotelRooms.length} room(s) for hotel ID ${hotelId}`
      );
    }

    // Bulk create all rooms
    if (roomsToCreate.length > 0) {
      console.log(`\n💾 Creating ${roomsToCreate.length} room(s) in database...`);
      await Rooms.bulkCreate(roomsToCreate, {
        validate: true,
      });
      console.log(`✅ ${roomsToCreate.length} room(s) created successfully`);
    }

    // Display summary
    const totalRooms = await Rooms.count();
    const roomsByHotel = await Rooms.findAll({
      attributes: [
        'hotel_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'room_count'],
      ],
      group: ['hotel_id'],
      raw: true,
    });

    console.log('\n📊 Room Summary:');
    console.log(`   Total rooms: ${totalRooms}`);
    console.log(`   Rooms created in this run: ${totalRoomsCreated}`);
    console.log(`   Hotels with rooms: ${roomsByHotel.length}`);

    if (roomsByHotel.length > 0 && roomsByHotel.length <= 10) {
      console.log('\n   Rooms per hotel:');
      roomsByHotel.forEach((item) => {
        console.log(`     Hotel ${item.hotel_id}: ${item.room_count} room(s)`);
      });
    }
  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
    throw error;
  }
}

/**
 * Seed rooms for a specific hotel
 * @param {string} hotelId - Hotel UUID
 * @param {number} count - Number of rooms to generate
 * @returns {Promise<Array>} Created rooms
 */
async function seedRoomsForHotel(hotelId, count = 5) {
  try {
    // Verify hotel exists
    const hotel = await Hotels.findByPk(hotelId);
    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    const hotelRooms = generateRoomsForHotel(hotelId, count);
    const createdRooms = await Rooms.bulkCreate(hotelRooms, {
      validate: true,
    });

    console.log(`✅ Created ${createdRooms.length} room(s) for hotel ${hotelId}`);
    return createdRooms;
  } catch (error) {
    console.error(`❌ Error seeding rooms for hotel ${hotelId}:`, error);
    throw error;
  }
}

/**
 * Generate room data without saving to database (for testing)
 * @param {string} hotelId - Hotel UUID
 * @param {number} count - Number of rooms to generate
 * @returns {Array<Object>} Array of room data objects
 */
function generateRooms(hotelId, count = 5) {
  return generateRoomsForHotel(hotelId, count);
}

// If running directly
if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Seed rooms
      await seedRooms({
        roomsPerHotel: { min: 3, max: 8 }, // Random 3-8 rooms per hotel
        clearExisting: false, // Set to true to clear existing rooms
        // hotelIds: [1, 2, 3], // Optional: seed only specific hotels
      });

      // Close database connection
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
  seedRooms,
  seedRoomsForHotel,
  generateRooms,
  generateRoomsForHotel,
};
