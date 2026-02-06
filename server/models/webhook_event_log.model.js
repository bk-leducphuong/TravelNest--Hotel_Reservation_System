const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');

module.exports = function (sequelize, DataTypes) {
  const WebhookEventLog = sequelize.define(
    'webhook_event_logs',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      event_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Unique event ID from payment provider (e.g., Stripe event ID)',
      },
      event_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Event type (e.g., payment_intent.succeeded)',
      },
      provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Payment provider (stripe, paypal, etc.)',
      },
      payload: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: 'Full event payload for debugging',
      },
      processed_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      status: {
        type: DataTypes.ENUM('processing', 'processed', 'failed'),
        allowNull: false,
        defaultValue: 'processed',
      },
      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    },
    {
      sequelize,
      tableName: 'webhook_event_logs',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'event_id_unique',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'event_id' }],
        },
        {
          name: 'provider_event_type',
          using: 'BTREE',
          fields: [{ name: 'provider' }, { name: 'event_type' }],
        },
        {
          name: 'processed_at',
          using: 'BTREE',
          fields: [{ name: 'processed_at' }],
        },
      ],
    }
  );

  return WebhookEventLog;
};
