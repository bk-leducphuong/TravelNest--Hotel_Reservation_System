/*********************** External Libraries ************************/
require('module-alias/register');
require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');

/*********************** Config ************************/
const logger = require('@config/logger.config');
const db = require('@models');
const { initSocket } = require('@socket/index');
const { initBucket } = require('@config/minio.config');

/*********************** Middlewares ************************/
const errorMiddleware = require('@middlewares/error.middleware.js');
const limiter = require('@middlewares/rate-limitter.middleware');
const sessionMiddleware = require('@middlewares/session.middleware');
const requestLogger = require('@middlewares/request-logger.middleware');

/*********************** Routes ************************/
const v1Routes = require('@routes/v1/index.js');

/*********************** Init Server ************************/
const initServer = async () => {
  // Connect and sync database
  await db.sequelize.authenticate();
  await db.sequelize.sync();

  require('@models/index.js');
  logger.info('Database connected successfully');

  const app = express();

  // Initialize s3 bucket
  await initBucket();

  // Allow nginx proxy'
  // app.set("trust proxy", 1);

  // Socket io
  const server = http.createServer(app);
  initSocket(server);

  app.use(express.static('public'));
  app.use(
    cors({
      origin: process.env.CLIENT_HOST,
      methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    })
  );

  // Webhook routes - MUST come before bodyParser.json() for raw body access
  // Webhooks need raw body for signature verification
  const webhookRoutes = require('@routes/v1/webhook.routes.js');
  app.use(
    '/api/v1/webhooks',
    bodyParser.raw({ type: 'application/json' }),
    webhookRoutes
  );

  // Regular JSON parsing for all other routes
  app.use(bodyParser.json({ limit: '50mb' })); // create application/json parser
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: false })); // create application/x-www-form-urlencoded parser

  // Request logging middleware (before other middlewares to capture all requests)
  app.use(requestLogger);

  // Configure Session
  app.use(sessionMiddleware);

  // Khởi tạo passport
  // const passport = require("passport");
  // require("./config/passport.config");
  // app.use(passport.initialize());
  // app.use(passport.session());

  // Rate limiter
  app.use(limiter);

  // API v1 routes
  app.use('/api/v1', v1Routes);

  app.use(errorMiddleware);

  // Default route
  app.get('/', (req, res) => {
    res.send('Welcome to the Hotel Booking API');
  });

  // Start the server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, async () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

initServer();
