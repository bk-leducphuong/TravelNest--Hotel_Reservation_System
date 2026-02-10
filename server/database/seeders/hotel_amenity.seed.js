/**
 * Hotel-Amenity Seed File
 *
 * Links existing hotels to amenities (many-to-many via hotel_amenities).
 * Only assigns amenities where applicable_to is 'hotel' or 'both'.
 *
 * Usage:
 *   - Run directly: node database/seeders/hotel_amenity.seed.js
 *   - Import and use: const { seedHotelAmenities } = require('./database/seeders/hotel_amenity.seed');
 *
 * Options:
 *   - minAmenitiesPerHotel: Minimum number of amenities per hotel (default: 5)
 *   - maxAmenitiesPerHotel: Maximum number of amenities per hotel (default: 25)
 *   - clearExisting: Whether to clear existing hotel_amenities before seeding (default: false)
 *
 * Note: Requires hotels and amenities to be seeded first.
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

const { hotels: Hotels, amenities: Amenities, hotel_amenities: HotelAmenities } = db;

/**
 * Fetch amenity IDs that can be assigned to hotels (applicable_to in ['hotel', 'both'])
 * @returns {Promise<string[]>} Array of amenity UUIDs
 */
async function getHotelApplicableAmenityIds() {
  const rows = await Amenities.findAll({
    where: {
      is_active: true,
      applicable_to: { [Op.in]: ['hotel', 'both'] },
    },
    attributes: ['id'],
  });
  return rows.map((r) => r.id);
}

/**
 * Generate optional additional_info for a hotel-amenity link
 * @returns {string|null}
 */
function maybeAdditionalInfo() {
  const examples = [
    'Available 24/7',
    'Open 6am–10pm',
    'Charges may apply',
    'Subject to availability',
    null,
    null,
    null,
  ];
  return faker.helpers.arrayElement(examples);
}

/**
 * Seed hotel_amenities: link each hotel to a random subset of hotel-applicable amenities
 * @param {Object} options - Seeding options
 * @param {number} options.minAmenitiesPerHotel - Min amenities per hotel (default: 5)
 * @param {number} options.maxAmenitiesPerHotel - Max amenities per hotel (default: 25)
 * @param {boolean} options.clearExisting - Clear all hotel_amenities first (default: false)
 * @returns {Promise<{ linked: number, skipped: number }>}
 */
async function seedHotelAmenities(options = {}) {
  const {
    minAmenitiesPerHotel = 5,
    maxAmenitiesPerHotel = 25,
    clearExisting = false,
  } = options;

  try {
    console.log('🌱 Starting hotel-amenity seeding...');

    const [hotels, amenityIds] = await Promise.all([
      Hotels.findAll({ attributes: ['id'] }),
      getHotelApplicableAmenityIds(),
    ]);

    if (hotels.length === 0) {
      console.log('⚠️  No hotels found. Seed hotels first.');
      return { linked: 0, skipped: 0 };
    }
    if (amenityIds.length === 0) {
      console.log('⚠️  No hotel-applicable amenities found. Seed amenities first.');
      return { linked: 0, skipped: 0 };
    }

    if (clearExisting) {
      console.log('🗑️  Clearing existing hotel_amenities...');
      const deleted = await HotelAmenities.destroy({ where: {} });
      console.log(`✅ Deleted ${deleted} existing link(s)`);
    }

    let linked = 0;
    let skipped = 0;

    for (const hotel of hotels) {
      const count = faker.number.int({
        min: Math.min(minAmenitiesPerHotel, amenityIds.length),
        max: Math.min(maxAmenitiesPerHotel, amenityIds.length),
      });
      const selectedIds = faker.helpers.arrayElements(amenityIds, count);

      for (const amenityId of selectedIds) {
        const [_, wasCreated] = await HotelAmenities.findOrCreate({
          where: {
            hotel_id: hotel.id,
            amenity_id: amenityId,
          },
          defaults: {
            hotel_id: hotel.id,
            amenity_id: amenityId,
            is_available: faker.datatype.boolean({ probability: 0.9 }),
            is_free: faker.datatype.boolean({ probability: 0.85 }),
            additional_info: maybeAdditionalInfo(),
          },
        });
        if (wasCreated) linked++;
        else skipped++;
      }
    }

    console.log(`✅ Hotel-amenity links: ${linked} created, ${skipped} already existed`);
    console.log(`🎉 Total hotel_amenities rows: ${await HotelAmenities.count()}`);

    return { linked, skipped };
  } catch (error) {
    console.error('❌ Error seeding hotel amenities:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedHotelAmenities({
        minAmenitiesPerHotel: 5,
        maxAmenitiesPerHotel: 25,
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
  seedHotelAmenities,
  getHotelApplicableAmenityIds,
};
