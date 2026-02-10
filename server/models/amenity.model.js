const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');
const {
  AMENITY_CATEGORIES,
  APPLICABLE_TO,
  AMENITY_CODES,
} = require('../constants/amenities');

module.exports = function (sequelize, DataTypes) {
  const Amenity = sequelize.define(
    'amenities',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          isIn: [[...AMENITY_CODES]],
        },
        comment: 'Unique code for the amenity (e.g., FREE_WIFI, POOL, PARKING)',
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Display name of the amenity',
      },
      icon: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Icon identifier (e.g., FontAwesome icon name, emoji, or URL)',
      },
      category: {
        type: DataTypes.ENUM(...AMENITY_CATEGORIES),
        allowNull: false,
        comment: 'Category for grouping amenities',
      },
      applicable_to: {
        type: DataTypes.ENUM(...APPLICABLE_TO),
        allowNull: false,
        defaultValue: 'both',
        comment: 'Where this amenity can be applied',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed description of the amenity',
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this amenity is active and can be assigned',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Order for displaying amenities in UI',
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
      tableName: 'amenities',
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
          name: 'idx_code',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'code' }],
          comment: 'Unique index for amenity code',
        },
        {
          name: 'idx_category',
          using: 'BTREE',
          fields: [{ name: 'category' }],
          comment: 'Index for filtering by category',
        },
        {
          name: 'idx_applicable_to',
          using: 'BTREE',
          fields: [{ name: 'applicable_to' }],
          comment: 'Index for filtering by applicable entity type',
        },
        {
          name: 'idx_active',
          using: 'BTREE',
          fields: [{ name: 'is_active' }],
          comment: 'Index for filtering active amenities',
        },
      ],
    }
  );

  Amenity.associate = function (models) {
    Amenity.belongsToMany(models.rooms, {
      through: models.room_amenities,
      foreignKey: 'amenity_id',
      otherKey: 'room_id',
      as: 'rooms',
    });
    Amenity.belongsToMany(models.hotels, {
      through: models.hotel_amenities,
      foreignKey: 'amenity_id',
      otherKey: 'hotel_id',
      as: 'hotels',
    });
  };
  return Amenity;
};
