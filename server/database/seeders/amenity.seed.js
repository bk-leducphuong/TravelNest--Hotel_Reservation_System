/**
 * Amenity Seed File
 *
 * Seeds the database with amenities from constants/amenities.js.
 * Uses findOrCreate so existing amenities are not duplicated.
 *
 * Usage:
 *   - Run directly: node database/seeders/amenity.seed.js
 *   - Import and use: const { seedAmenities } = require('./database/seeders/amenity.seed');
 *
 * Options:
 *   - clearExisting: Whether to clear existing amenities before seeding (default: false)
 */

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});

const db = require('../../models');
const sequelize = require('../../config/database.config');
const { AMENITY_CODES } = require('../../constants/amenities');

const { amenities: Amenities } = db;

/**
 * Map amenity code to display name (human-readable)
 * Converts SNAKE_CASE to Title Case; override with custom names where needed.
 */
function codeToName(code) {
  const customNames = {
    FREE_WIFI: 'Free WiFi',
    PAID_WIFI: 'Paid WiFi',
    FITNESS_CENTER: 'Fitness Center',
    AIR_CONDITIONING: 'Air Conditioning',
    HAIR_DRYER: 'Hair Dryer',
    WASHING_MACHINE: 'Washing Machine',
    LAUNDRY_SERVICE: 'Laundry Service',
    BUSINESS_CENTER: 'Business Center',
    MEETING_ROOMS: 'Meeting Rooms',
    PET_FRIENDLY: 'Pet Friendly',
    NON_SMOKING: 'Non-Smoking Rooms',
    WHEELCHAIR_ACCESSIBLE: 'Wheelchair Accessible',
    '24H_RECEPTION': '24-Hour Front Desk',
    LUGGAGE_STORAGE: 'Luggage Storage',
    TOUR_DESK: 'Tour Desk',
    BEACH_ACCESS: 'Beach Access',
    ROOM_SERVICE_24H: '24-Hour Room Service',
    BREAKFAST_INCLUDED: 'Breakfast Included',
    HALF_BOARD: 'Half Board',
    FULL_BOARD: 'Full Board',
    ALL_INCLUSIVE: 'All Inclusive',
    COFFEE_MACHINE: 'Coffee Machine',
    BLACKOUT_CURTAINS: 'Blackout Curtains',
    CONNECTING_ROOMS: 'Connecting Rooms',
    EXTRA_BED: 'Extra Bed',
    COT_AVAILABLE: 'Cot Available',
    OCEAN_VIEW: 'Ocean View',
    CITY_VIEW: 'City View',
  };
  if (customNames[code]) return customNames[code];
  return code
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Map amenity code to category (must be one of AMENITY_CATEGORIES)
 */
function codeToCategory(code) {
  const map = {
    FREE_WIFI: 'technology',
    PAID_WIFI: 'technology',
    POOL: 'wellness',
    FITNESS_CENTER: 'wellness',
    SPA: 'wellness',
    PARKING: 'transportation',
    AIRPORT_SHUTTLE: 'transportation',
    RESTAURANT: 'food_drink',
    ROOM_SERVICE: 'food_drink',
    BAR: 'food_drink',
    ROOM_SERVICE_24H: 'food_drink',
    BREAKFAST_INCLUDED: 'food_drink',
    HALF_BOARD: 'food_drink',
    FULL_BOARD: 'food_drink',
    ALL_INCLUSIVE: 'food_drink',
    AIR_CONDITIONING: 'comfort',
    HEATING: 'comfort',
    TV: 'technology',
    SAFE: 'room_features',
    MINIBAR: 'room_features',
    BALCONY: 'view',
    OCEAN_VIEW: 'view',
    CITY_VIEW: 'view',
    BATHTUB: 'bathroom',
    SHOWER: 'bathroom',
    HAIR_DRYER: 'bathroom',
    BATHROBE: 'bathroom',
    SLIPPERS: 'bathroom',
    TOILETRIES: 'bathroom',
    KITCHEN: 'kitchen',
    KITCHENETTE: 'kitchen',
    WASHING_MACHINE: 'kitchen',
    DRYER: 'kitchen',
    COFFEE_MACHINE: 'kitchen',
    KETTLE: 'kitchen',
    MICROWAVE: 'kitchen',
    REFRIGERATOR: 'kitchen',
    ELEVATOR: 'services',
    CONCIERGE: 'services',
    LAUNDRY_SERVICE: 'services',
    '24H_RECEPTION': 'services',
    LUGGAGE_STORAGE: 'services',
    TOUR_DESK: 'services',
    BUSINESS_CENTER: 'business',
    MEETING_ROOMS: 'business',
    PET_FRIENDLY: 'general',
    NON_SMOKING: 'safety',
    WHEELCHAIR_ACCESSIBLE: 'accessibility',
    GARDEN: 'general',
    TERRACE: 'view',
    BEACH_ACCESS: 'general',
    DESK: 'room_features',
    IRON: 'room_features',
    BLACKOUT_CURTAINS: 'comfort',
    SOUNDPROOF: 'comfort',
    CONNECTING_ROOMS: 'room_features',
    EXTRA_BED: 'bedding',
    COT_AVAILABLE: 'bedding',
  };
  return map[code] || 'general';
}

/**
 * Map amenity code to applicable_to: 'hotel', 'room', or 'both'
 */
function codeToApplicableTo(code) {
  const roomOnly = [
    'TV',
    'SAFE',
    'MINIBAR',
    'BALCONY',
    'OCEAN_VIEW',
    'CITY_VIEW',
    'BATHTUB',
    'SHOWER',
    'HAIR_DRYER',
    'BATHROBE',
    'SLIPPERS',
    'TOILETRIES',
    'DESK',
    'IRON',
    'COFFEE_MACHINE',
    'KETTLE',
    'MICROWAVE',
    'REFRIGERATOR',
    'BLACKOUT_CURTAINS',
    'SOUNDPROOF',
    'CONNECTING_ROOMS',
    'EXTRA_BED',
    'COT_AVAILABLE',
    'KITCHEN',
    'KITCHENETTE',
    'WASHING_MACHINE',
    'DRYER',
    'AIR_CONDITIONING',
    'HEATING',
  ];
  const hotelOnly = [
    'ELEVATOR',
    'PARKING',
    'AIRPORT_SHUTTLE',
    'RESTAURANT',
    'BAR',
    'CONCIERGE',
    'LAUNDRY_SERVICE',
    'BUSINESS_CENTER',
    'MEETING_ROOMS',
    '24H_RECEPTION',
    'LUGGAGE_STORAGE',
    'TOUR_DESK',
    'GARDEN',
    'TERRACE',
    'BEACH_ACCESS',
    'POOL',
    'FITNESS_CENTER',
    'SPA',
    'PET_FRIENDLY',
    'NON_SMOKING',
    'WHEELCHAIR_ACCESSIBLE',
  ];
  if (roomOnly.includes(code)) return 'room';
  if (hotelOnly.includes(code)) return 'hotel';
  return 'both';
}

/**
 * Build seed records for all AMENITY_CODES
 * @returns {Array<Object>} Array of amenity attributes
 */
function buildAmenityRecords() {
  return AMENITY_CODES.map((code, index) => ({
    code,
    name: codeToName(code),
    icon: null,
    category: codeToCategory(code),
    applicable_to: codeToApplicableTo(code),
    description: null,
    is_active: true,
    display_order: index + 1,
  }));
}

/**
 * Seed amenities into the database
 * @param {Object} options - Seeding options
 * @param {boolean} options.clearExisting - Whether to clear existing amenities (default: false)
 * @returns {Promise<{ created: number, skipped: number }>}
 */
async function seedAmenities(options = {}) {
  const { clearExisting = false } = options;

  try {
    console.log('🌱 Starting amenity seeding...');

    if (clearExisting) {
      console.log('🗑️  Clearing existing amenities...');
      await Amenities.destroy({ where: {}, force: true });
      console.log('✅ Existing amenities cleared');
    }

    const records = buildAmenityRecords();
    let created = 0;
    let skipped = 0;

    for (const record of records) {
      const [amenity, wasCreated] = await Amenities.findOrCreate({
        where: { code: record.code },
        defaults: record,
      });
      if (wasCreated) created++;
      else skipped++;
    }

    console.log(`✅ Amenities seeded: ${created} created, ${skipped} already existed`);
    console.log(`🎉 Total amenities in database: ${await Amenities.count()}`);

    return { created, skipped };
  } catch (error) {
    console.error('❌ Error seeding amenities:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedAmenities({
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
  seedAmenities,
  buildAmenityRecords,
  codeToName,
  codeToCategory,
  codeToApplicableTo,
};
