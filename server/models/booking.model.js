const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Booking = sequelize.define(
    'bookings',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      buyer_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      hotel_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'rooms',
          key: 'id',
        },
      },
      booking_code: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      number_of_guests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of rooms booked',
      },
      total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: DataTypes.ENUM(
          'pending',
          'confirmed',
          'checked_in',
          'completed',
          'cancelled',
          'no_show'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      special_requests: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'bookings',
      timestamps: false,
      paranoid: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'booking_code_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'booking_code' }],
        },
        {
          name: 'buyer_id',
          using: 'BTREE',
          fields: [{ name: 'buyer_id' }],
        },
        {
          name: 'hotel_id',
          using: 'BTREE',
          fields: [{ name: 'hotel_id' }],
        },
        {
          name: 'room_id',
          using: 'BTREE',
          fields: [{ name: 'room_id' }],
        },
        {
          name: 'status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
        {
          name: 'check_in_date',
          using: 'BTREE',
          fields: [{ name: 'check_in_date' }],
        },
      ],
    }
  );

  Booking.associate = function (models) {
    Booking.belongsTo(models.users, {
      foreignKey: 'buyer_id',
      as: 'buyer',
    });
    Booking.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Booking.belongsTo(models.rooms, {
      foreignKey: 'room_id',
      as: 'room',
    });
    Booking.hasMany(models.reviews, {
      foreignKey: 'booking_id',
      as: 'reviews',
    });
    Booking.hasOne(models.transactions, {
      foreignKey: 'booking_id',
      as: 'transaction',
    });
  };

  return Booking;
};
