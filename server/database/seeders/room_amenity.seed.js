/**
 * Room-Amenity Seed File
 *
 * Links existing rooms to amenities (many-to-many via room_amenities).
 * Only assigns amenities where applicable_to is 'room' or 'both'.
 *
 * Usage:
 *   - Run directly: node database/seeders/room_amenity.seed.js
 *   - Import and use: const { seedRoomAmenities } = require('./database/seeders/room_amenity.seed');
 *
 * Options:
 *   - minAmenitiesPerRoom: Minimum number of amenities per room (default: 3)
 *   - maxAmenitiesPerRoom: Maximum number of amenities per room (default: 12)
 *   - clearExisting: Whether to clear existing room_amenities before seeding (default: false)
 *   - roomIds: Optional array of room UUIDs to seed (default: all rooms)
 *
 * Note: Requires rooms and amenities to be seeded first.
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
const { Op } = require('sequelize');

const { rooms: Rooms, amenities: Amenities, room_amenities: RoomAmenities } = db;

/**
 * Fetch amenity IDs that can be assigned to rooms (applicable_to in ['room', 'both'])
 * @returns {Promise<string[]>} Array of amenity UUIDs
 */
async function getRoomApplicableAmenityIds() {
  const rows = await Amenities.findAll({
    where: {
      is_active: true,
      applicable_to: { [Op.in]: ['room', 'both'] },
    },
    attributes: ['id'],
  });
  return rows.map((r) => r.id);
}

/**
 * Generate optional additional_info for a room-amenity link
 * @returns {string|null}
 */
function maybeAdditionalInfo() {
  const examples = [
    'King size bed',
    'Queen size bed',
    'In-room',
    'Upon request',
    null,
    null,
    null,
  ];
  return faker.helpers.arrayElement(examples);
}

/**
 * Seed room_amenities: link each room to a random subset of room-applicable amenities
 * @param {Object} options - Seeding options
 * @param {number} options.minAmenitiesPerRoom - Min amenities per room (default: 3)
 * @param {number} options.maxAmenitiesPerRoom - Max amenities per room (default: 12)
 * @param {boolean} options.clearExisting - Clear room_amenities first (default: false)
 * @param {Array<string>} options.roomIds - Room UUIDs to seed (default: all)
 * @returns {Promise<{ linked: number, skipped: number }>}
 */
async function seedRoomAmenities(options = {}) {
  const {
    minAmenitiesPerRoom = 3,
    maxAmenitiesPerRoom = 12,
    clearExisting = false,
    roomIds = null,
  } = options;

  try {
    console.log('🌱 Starting room-amenity seeding...');

    const where = roomIds && roomIds.length > 0 ? { id: roomIds } : {};
    const [roomList, amenityIds] = await Promise.all([
      Rooms.findAll({ where, attributes: ['id'] }),
      getRoomApplicableAmenityIds(),
    ]);

    if (roomList.length === 0) {
      console.log('⚠️  No rooms found. Seed rooms first.');
      return { linked: 0, skipped: 0 };
    }
    if (amenityIds.length === 0) {
      console.log('⚠️  No room-applicable amenities found. Seed amenities first.');
      return { linked: 0, skipped: 0 };
    }

    if (clearExisting) {
      const ids = roomList.map((r) => r.id);
      console.log('🗑️  Clearing existing room_amenities for selected rooms...');
      const deleted = await RoomAmenities.destroy({ where: { room_id: ids } });
      console.log(`✅ Deleted ${deleted} existing link(s)`);
    }

    let linked = 0;
    let skipped = 0;

    for (const room of roomList) {
      const count = faker.number.int({
        min: Math.min(minAmenitiesPerRoom, amenityIds.length),
        max: Math.min(maxAmenitiesPerRoom, amenityIds.length),
      });
      const selectedIds = faker.helpers.arrayElements(amenityIds, count);

      for (const amenityId of selectedIds) {
        const [_, wasCreated] = await RoomAmenities.findOrCreate({
          where: {
            room_id: room.id,
            amenity_id: amenityId,
          },
          defaults: {
            room_id: room.id,
            amenity_id: amenityId,
            is_available: faker.datatype.boolean({ probability: 0.9 }),
            additional_info: maybeAdditionalInfo(),
          },
        });
        if (wasCreated) linked++;
        else skipped++;
      }
    }

    console.log(`✅ Room-amenity links: ${linked} created, ${skipped} already existed`);
    console.log(`🎉 Total room_amenities rows: ${await RoomAmenities.count()}`);

    return { linked, skipped };
  } catch (error) {
    console.error('❌ Error seeding room amenities:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedRoomAmenities({
        minAmenitiesPerRoom: 3,
        maxAmenitiesPerRoom: 12,
        clearExisting: false,
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
  seedRoomAmenities,
  getRoomApplicableAmenityIds,
};
