const redis = require('redis');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});

// Connect to Redis Cloud
const redisClient = redis.createClient({
  // password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    username: process.env.REDIS_USERNAME || 'redis',
    password: process.env.REDIS_PASSWORD || '',
    database: process.env.REDIS_DATABASE || 1,
  },
});

// Connect to Redis
redisClient
  .connect()
  .then(() => console.log('Connected to Redis'))
  .catch((err) => console.error('Redis connection error:', err));

module.exports = redisClient;
