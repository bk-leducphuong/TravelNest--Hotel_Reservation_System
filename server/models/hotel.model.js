const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');
const {
  HOTEL_STATUSES,
  HOTEL_CHECK_IN_POLICIES,
  HOTEL_CHECK_OUT_POLICIES,
  IANA_TIMEZONES,
} = require('../constants/hotels');
module.exports = function (sequelize, DataTypes) {
  const Hotel = sequelize.define(
    'hotels',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Country name for global search filtering',
      },
      phone_number: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      // Geospatial data - using DECIMAL for precise coordinates
      latitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Latitude with 7 decimal places (~1.11cm precision)',
      },
      longitude: {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: false,
        comment: 'Longitude with 7 decimal places (~1.11cm precision)',
      },
      // Images are stored in the images table with entity_type='hotel' and entity_id=hotel.id
      hotel_class: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
        comment: 'Star rating (1-5)',
      },
      // Check-in/out times using TIME type
      check_in_time: {
        type: DataTypes.TIME,
        allowNull: true,
        defaultValue: '14:00:00',
        comment: 'Standard check-in time',
      },
      check_out_time: {
        type: DataTypes.TIME,
        allowNull: true,
        defaultValue: '12:00:00',
        comment: 'Standard check-out time',
      },
      check_in_policy: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          isIn: [[...HOTEL_CHECK_IN_POLICIES]],
        },
        comment: 'Check-in policy details (e.g., late check-in available)',
      },
      check_out_policy: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          isIn: [[...HOTEL_CHECK_OUT_POLICIES]],
        },
        comment: 'Check-out policy details',
      },
      // Pricing
      min_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Minimum room price for rapid filtering',
      },
      // Status and lifecycle management
      status: {
        type: DataTypes.ENUM(...HOTEL_STATUSES),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Hotel operational status',
      },
      // Timezone for accurate booking logic
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
          isIn: [[...IANA_TIMEZONES]],
        },
        comment: 'IANA timezone identifier (e.g., America/New_York)',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
      },
    },
    {
      sequelize,
      tableName: 'hotels',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'idx_coordinates',
          using: 'BTREE',
          fields: [{ name: 'latitude' }, { name: 'longitude' }],
          comment: 'Non-unique index for geospatial queries',
        },
        {
          name: 'idx_city',
          using: 'BTREE',
          fields: [{ name: 'city' }],
          comment: 'Index for city-based searches',
        },
        {
          name: 'idx_country',
          using: 'BTREE',
          fields: [{ name: 'country' }],
          comment: 'Index for country-based filtering',
        },
        {
          name: 'idx_status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
          comment: 'Index for status filtering',
        },
        {
          name: 'idx_min_price',
          using: 'BTREE',
          fields: [{ name: 'min_price' }],
          comment: 'Index for price range filtering',
        },
        {
          name: 'idx_search_composite',
          using: 'BTREE',
          fields: [{ name: 'status' }, { name: 'city' }],
          comment:
            'Composite index for common search queries (rating in rating_summary table)',
        },
      ],
    }
  );

  Hotel.associate = function (models) {
    Hotel.hasMany(models.bookings, {
      foreignKey: 'hotel_id',
      as: 'bookings',
    });
    Hotel.hasMany(models.invoices, {
      foreignKey: 'hotel_id',
      as: 'invoices',
    });
    Hotel.hasMany(models.notifications, {
      foreignKey: 'reciever_id',
      as: 'notifications',
    });
    Hotel.hasMany(models.reviews, {
      foreignKey: 'hotel_id',
      as: 'reviews',
    });
    Hotel.hasMany(models.rooms, {
      foreignKey: 'hotel_id',
      as: 'rooms',
    });
    Hotel.hasMany(models.saved_hotels, {
      foreignKey: 'hotel_id',
      as: 'saved_hotels',
    });
    Hotel.hasMany(models.transactions, {
      foreignKey: 'hotel_id',
      as: 'transactions',
    });
    Hotel.hasMany(models.viewed_hotels, {
      foreignKey: 'hotel_id',
      as: 'viewed_hotels',
    });
    Hotel.belongsToMany(models.amenities, {
      through: models.hotel_amenities,
      foreignKey: 'hotel_id',
      otherKey: 'amenity_id',
      as: 'amenities',
    });
    Hotel.hasMany(models.images, {
      foreignKey: 'entity_id',
      constraints: false,
      scope: {
        entity_type: 'hotel',
      },
      as: 'images',
    });
    Hotel.hasMany(models.hotel_users, {
      foreignKey: 'hotel_id',
      as: 'hotel_users',
    });
  };

  return Hotel;
};
