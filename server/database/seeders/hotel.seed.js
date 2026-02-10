/**
 * Hotel Seed File
 *
 * Generates fake hotel data using Faker.js and seeds the database.
 *
 * Usage:
 *   - Run directly: node database/seeders/hotel.seed.js
 *   - Import and use: const { seedHotels } = require('./database/seeders/hotel.seed');
 *
 * Options:
 *   - count: Number of hotels to generate (default: 20)
 *   - clearExisting: Whether to clear existing hotels before seeding (default: false)
 *
 * Note: Clearing hotels may fail or require clearing dependent data (rooms, bookings, etc.) first.
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
const {
  IANA_TIMEZONES,
  HOTEL_CHECK_IN_POLICIES,
  HOTEL_CHECK_OUT_POLICIES,
} = require('../../constants/hotels');
const { hotels: Hotels } = db;

const HOTEL_NAME_PREFIXES = [
  'Grand',
  'Royal',
  'Plaza',
  'Palace',
  'Resort',
  'Inn',
  'Lodge',
  'Suites',
  'Boutique',
  'The',
  'Hotel',
  'View',
  'Sunset',
  'Ocean',
  'Mountain',
  'City',
  'Park',
  'Garden',
  'Riverside',
  'Lakeside',
];

const HOTEL_NAME_SUFFIXES = [
  'Hotel',
  'Resort',
  'Inn',
  'Suites',
  'Lodge',
  'Plaza',
  'House',
  'Court',
  'Manor',
  'Tower',
  'Place',
  'Club',
];

/**
 * Generate a hotel-style name
 * @returns {string}
 */
function generateHotelName() {
  const prefix = faker.helpers.arrayElement(HOTEL_NAME_PREFIXES);
  const suffix = faker.helpers.arrayElement(HOTEL_NAME_SUFFIXES);
  const middle = faker.helpers.arrayElement([
    faker.location.city(),
    faker.location.street(),
    faker.person.firstName(),
    '',
  ]);
  if (prefix === 'The' || (prefix === 'Boutique' && middle)) {
    return middle ? `${prefix} ${middle} ${suffix}` : `${prefix} ${suffix}`;
  }
  return middle
    ? `${prefix} ${middle} ${suffix}`.trim()
    : `${prefix} ${suffix}`;
}

/**
 * Generate a single hotel record (no id; Sequelize will set it)
 * @returns {Object}
 */
function generateHotelRecord() {
  const city = faker.location.city();
  const country = faker.location.country();
  const latitude = faker.location.latitude();
  const longitude = faker.location.longitude();

  const hotelClass = faker.helpers.arrayElement([1, 2, 3, 4, 5]);
  const minPrice = faker.number.float({
    min: 50,
    max: 800,
    fractionDigits: 2,
  });

  return {
    name: generateHotelName(),
    description: faker.lorem.paragraphs(2, '\n'),
    address: faker.location.streetAddress({ useFullAddress: true }),
    city,
    country,
    phone_number: faker.phone.number(),
    latitude: String(Number(latitude).toFixed(7)),
    longitude: String(Number(longitude).toFixed(7)),
    hotel_class: hotelClass,
    check_in_time: '14:00:00',
    check_out_time: '12:00:00',
    check_in_policy:
      faker.helpers.arrayElement(HOTEL_CHECK_IN_POLICIES) ?? null,
    check_out_policy:
      faker.helpers.arrayElement(HOTEL_CHECK_OUT_POLICIES) ?? null,
    min_price: String(minPrice),
    status: faker.helpers.arrayElement([
      'active',
      'active',
      'active',
      'inactive',
    ]),
    timezone: faker.helpers.arrayElement(IANA_TIMEZONES),
  };
}

/**
 * Seed hotels into the database
 * @param {Object} options - Seeding options
 * @param {number} options.count - Number of hotels to create (default: 20)
 * @param {boolean} options.clearExisting - Whether to delete existing hotels first (default: false)
 * @returns {Promise<{ created: number }>}
 */
async function seedHotels(options = {}) {
  const { count = 20, clearExisting = false } = options;

  try {
    console.log('🌱 Starting hotel seeding...');

    if (clearExisting) {
      console.log('🗑️  Clearing existing hotels...');
      const deleted = await Hotels.destroy({ where: {} });
      console.log(`✅ Deleted ${deleted} existing hotel(s)`);
    }

    let created = 0;
    for (let i = 0; i < count; i++) {
      const record = generateHotelRecord();
      await Hotels.create(record);
      created++;
    }

    console.log(`✅ Created ${created} hotels`);
    console.log(`🎉 Total hotels in database: ${await Hotels.count()}`);

    return { created };
  } catch (error) {
    console.error('❌ Error seeding hotels:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedHotels({
        count: 20,
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
  seedHotels,
  generateHotelRecord,
  generateHotelName,
};
