const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const Transaction = sequelize.define(
    'transactions',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
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
      amount: {
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
          'processing',
          'completed',
          'failed',
          'cancelled',
          'refunded',
          'partially_refunded'
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      transaction_type: {
        type: DataTypes.ENUM('payment', 'refund', 'payout'),
        allowNull: false,
        defaultValue: 'payment',
      },
      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g., card, bank_transfer, wallet',
      },
      stripe_payment_intent_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      stripe_charge_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      stripe_customer_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      stripe_refund_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      failure_code: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      failure_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional transaction metadata',
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
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'transactions',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'booking_id',
          using: 'BTREE',
          fields: [{ name: 'booking_id' }],
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
          name: 'stripe_payment_intent_id',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'stripe_payment_intent_id' }],
        },
        {
          name: 'status',
          using: 'BTREE',
          fields: [{ name: 'status' }],
        },
        {
          name: 'transaction_type',
          using: 'BTREE',
          fields: [{ name: 'transaction_type' }],
        },
      ],
    }
  );

  Transaction.associate = function (models) {
    Transaction.belongsTo(models.bookings, {
      foreignKey: 'booking_id',
      as: 'booking',
    });
    Transaction.belongsTo(models.users, {
      foreignKey: 'buyer_id',
      as: 'buyer',
    });
    Transaction.belongsTo(models.hotels, {
      foreignKey: 'hotel_id',
      as: 'hotel',
    });
    Transaction.hasMany(models.fees, {
      foreignKey: 'transaction_id',
      as: 'fees',
    });
    Transaction.hasOne(models.invoices, {
      foreignKey: 'transaction_id',
      as: 'invoice',
    });
    Transaction.hasMany(models.payments, {
      foreignKey: 'transaction_id',
      as: 'payments',
    });
    Transaction.hasMany(models.refunds, {
      foreignKey: 'transaction_id',
      as: 'refunds',
    });
  };

  return Transaction;
};
