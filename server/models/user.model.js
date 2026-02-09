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
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [60, 255], // e.g. bcrypt hashes are typically 60 chars
        },
      },
      first_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      phone_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
        comment:
          'Phone number in E.164 format (e.g., +12025550123). Validation enforced at application level.',
        validate: {
          is: /^\+[1-9]\d{1,14}$/, // Basic E.164 regex
        },
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
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Account status used for authentication/authorization checks',
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM(
          'male',
          'female',
          'non_binary',
          'other',
          'prefer_not_to_say'
        ),
        allowNull: true,
      },
      nationality: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of the user last successful login',
      },
      email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the user verified their email address',
      },
      phone_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the user verified their phone number',
      },
      terms_accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When the user accepted the latest terms of service',
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      tableName: 'users',
      timestamps: true,
      paranoid: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      indexes: [
        {
          name: 'PRIMARY',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'id' }],
        },
        {
          name: 'unique_email',
          unique: true,
          using: 'BTREE',
          fields: [{ name: 'email' }],
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
    User.hasMany(models.hotel_users, {
      foreignKey: 'user_id',
      as: 'hotel_roles',
    });
    // Global roles/permissions through a separate table
    User.hasMany(models.user_roles, {
      foreignKey: 'user_id',
      as: 'roles',
    });
  };

  return User;
};
