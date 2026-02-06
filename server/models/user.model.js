const Sequelize = require('sequelize');
const { uuidv7 } = require('uuidv7');
module.exports = function (sequelize, DataTypes) {
  const User = sequelize.define(
    'users',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: () => uuidv7(),
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      phone_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      user_role: {
        type: DataTypes.ENUM('customer', 'partner', 'admin'),
        allowNull: true,
        defaultValue: 'customer',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      connect_account_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: 'connect_account_id_UNIQUE',
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      profile_picture_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM('male', 'female'),
        allowNull: true,
      },
      nationality: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: false,
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'unique_email_role',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'email' }, { name: 'user_role' }],
        },
        {
          name: 'connect_account_id_UNIQUE',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'connect_account_id' }],
        },
      ],
    }
  );

  User.associate = function (models) {
    User.hasMany(models.bookings, {
      foreignKey: 'buyer_id',
      as: 'user_bookings', // Explicit alias to avoid conflicts
    });
    User.hasMany(models.hotels, {
      foreignKey: 'owner_id',
      as: 'owned_hotels', // Explicit alias
    });
    User.hasMany(models.notifications, {
      foreignKey: 'sender_id',
      as: 'sent_notifications', // Explicit alias
    });
    User.hasMany(models.refunds, {
      foreignKey: 'buyer_id',
      as: 'user_refunds', // Explicit alias to avoid conflicts
    });
    User.hasMany(models.reviews, {
      foreignKey: 'user_id',
      as: 'user_reviews', // Explicit alias
    });
    User.hasMany(models.saved_hotels, {
      foreignKey: 'user_id',
      as: 'saved_hotels_list', // Explicit alias
    });
    User.hasMany(models.viewed_hotels, {
      foreignKey: 'user_id',
      as: 'viewed_hotels_list', // Explicit alias
    });
  };

  return User;
};
