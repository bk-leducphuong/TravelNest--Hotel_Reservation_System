const path = require('path');

const nodeEnv = process.env.NODE_ENV || 'development';

require('dotenv').config({
  path: path.resolve(__dirname, '..', `.env.${nodeEnv}`),
});
const { Sequelize } = require('sequelize');

// Create a Sequelize instance for ORM
const sequelize = new Sequelize(
  process.env.DB_NAME || 'travelnest',
  process.env.DB_USER || 'user',
  process.env.DB_PASSWORD || '123',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 60000,
      evict: 10000,
    },
    retry: {
      max: 3,
      match: [
        /EPIPE/,
        /ECONNRESET/,
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ENETUNREACH/,
        /SequelizeConnectionError/,
      ],
    },
  }
);

module.exports = sequelize;
