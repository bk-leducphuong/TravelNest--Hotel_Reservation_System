const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');
module.exports = function (sequelize, DataTypes) {
  const Room = sequelize.define(
    'rooms',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
      },
      room_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Room name or type (e.g., Deluxe King Room)',
      },
      max_guests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        validate: {
          min: 1,
        },
        comment: 'Maximum number of guests allowed',
      },
      room_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Room size in square meters',
      },
      room_type: {
        type: DataTypes.ENUM(
          'single',
          'double',
          'twin',
          'suite',
          'deluxe',
          'family',
          'studio'
        ),
        allowNull: true,
        comment: 'Standardized room type classification',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
        comment: 'Total number of rooms of this type',
      },
      // Status for room availability management
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Room operational status',
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
      tableName: 'rooms',
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
          name: 'idx_hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
          comment: 'Index for hotel-based room queries',
        },
        {
          name: 'idx_hotel_status',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }, { name: 'status' }],
          comment: 'Composite index for active rooms by hotel',
        },
        {
          name: 'idx_room_type',
          using: 'BTREE',
          fields: [{ name: 'room_type' }],
          comment: 'Index for room type filtering',
        },
      ],
    }
  );

  Room.associate = function (models) {
    Room.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Room.hasMany(models.bookings, {
      foreignKey: 'room_id',
      as: 'bookings',
    });
    Room.hasMany(models.room_inventory, {
      foreignKey: 'room_id',
      as: 'inventory',
    });
    // Many-to-many relationship with amenities through room_amenities
    Room.belongsToMany(models.amenities, {
      through: models.room_amenities,
      foreignKey: 'room_id',
      otherKey: 'amenity_id',
      as: 'amenities',
    });
    // Association with images table
    Room.hasMany(models.images, {
      foreignKey: 'entity_id',
      constraints: false,
      scope: {
        entity_type: 'room',
      },
      as: 'images',
    });
  };

  return Room;
};
