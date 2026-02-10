const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');
const { CURRENCIES } = require('../constants/common');
const { PAYMENT_METHODS, PAYMENT_STATUSES } = require('../constants/payment');

module.exports = function (sequelize, DataTypes) {
  const Payment = sequelize.define(
    'payments',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      transaction_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'transactions',
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
        validate: {
          isValidCurrency(value) {
            if (!CURRENCIES.includes(value)) {
              throw new Error('invalid currency');
            }
          },
        },
      },
      payment_method: {
        type: DataTypes.ENUM(...PAYMENT_METHODS),
        allowNull: false,
        comment: 'e.g., card, bank_transfer, wallet',
      },
      payment_status: {
        type: DataTypes.ENUM(...PAYMENT_STATUSES),
        allowNull: false,
        defaultValue: 'pending',
      },
      stripe_payment_method_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      card_brand: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'e.g., visa, mastercard, amex',
      },
      card_last4: {
        type: DataTypes.STRING(4),
        allowNull: true,
      },
      card_exp_month: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      card_exp_year: {
        type: DataTypes.INTEGER,
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
      receipt_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
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
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'payments',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'transaction_id',
          using: 'BTREE',
          fields: [{ name: 'transaction_id' }],
        },
        {
          name: 'payment_status',
          using: 'BTREE',
          fields: [{ name: 'payment_status' }],
        },
        {
          name: 'stripe_payment_method_id',
          using: 'BTREE',
          fields: [{ name: 'stripe_payment_method_id' }],
        },
      ],
    }
  );

  Payment.associate = function (models) {
    Payment.belongsTo(models.transactions, {
      foreignKey: 'transaction_id',
      as: 'transaction',
    });
  };

  return Payment;
};
