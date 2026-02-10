const Sequelize = require('sequelize');
const { CURRENCIES } = require('../constants/common');
module.exports = function (sequelize, DataTypes) {
  const RoomInventory = sequelize.define(
    'room_inventory',
    {
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
          model: 'rooms',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Composite primary key part 1',
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        primaryKey: true,
        comment: 'Composite primary key part 2 - specific date for inventory',
      },
      total_rooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Total number of rooms available for this date',
      },
      booked_rooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          isValidReservation(value) {
            if (value > this.total_rooms) {
              throw new Error('booked rooms cannot exceed total rooms');
            }
          },
        },
        comment: 'Number of rooms already reserved for this date',
      },
      held_rooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of rooms currently held for this date',
      },
      status: {
        type: DataTypes.ENUM('open', 'close', 'sold_out', 'maintenance'),
        allowNull: false,
        defaultValue: 'open',
        comment: 'Availability status for this date',
      },
      price_per_night: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
        comment:
          'Price per night for this specific date (allows dynamic pricing)',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        validate: {
          isValidCurrency(value) {
            if (!CURRENCIES.includes(value)) {
              throw new Error('invalid currency');
            }
          },
        },
        comment: 'Currency for price per night',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'room_inventory',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'room_id' }, { name: 'date' }],
          comment: 'Composite primary key on room_id and date',
        },
        {
          name: 'idx_date',
          using: 'BTREE',
          fields: [{ name: 'date' }],
          comment: 'Index for date-based queries',
        },
        {
          name: 'idx_status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
          comment: 'Index for filtering by availability status',
        },
        {
          name: 'idx_date_status',
          using: 'BTREE',
          fields: [{ name: 'date' }, { name: 'status' }],
          comment: 'Composite index for availability searches by date',
        },
        {
          name: 'idx_price',
          using: 'BTREE',
          fields: [{ name: 'price_per_night' }],
          comment: 'Index for price range filtering',
        },
      ],
      validate: {
        reservationCheck() {
          if (this.booked_rooms > this.total_rooms) {
            throw new Error('booked rooms cannot exceed total rooms');
          }
        },
      },
    }
  );

  RoomInventory.associate = function (models) {
    RoomInventory.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
  };

  return RoomInventory;
};
