const { seedUsers } = require('./user.seed');
const { seedReviews } = require('./review.seed');
const { seedRooms } = require('./room.seed');
const { seedBookings } = require('./booking.seed');
const { seedAmenities } = require('./amenity.seed');
const { seedHotelAmenities } = require('./hotel_amenity.seed');
const { seedRoomInventory } = require('./room_inventory.seed');
const { seedRoomAmenities } = require('./room_amenity.seed');

if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await db.sequelize.authenticate();
      console.log('✅ Database connection established');

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
  seedUsers,
  seedReviews,
  seedRooms,
  seedBookings,
  seedAmenities,
  seedHotelAmenities,
  seedRoomInventory,
  seedRoomAmenities,
};
