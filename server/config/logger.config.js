require('dotenv').config({
  path:
    process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env.development',
});
const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Determine if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Base logger configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    // level: (label) => {
    //   return { level: label };
    // },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        hostname: bindings.hostname,
        service: 'travelnest-server',
        environment: process.env.NODE_ENV || 'development',
      };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive information
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'apiKey',
      'creditCard',
      'cardNumber',
    ],
    remove: true,
  },
};

// Create transport for production
const createTransport = () => {
  try {
    if (!isDevelopment) {
      return pino.transport({
        targets: [
          // Combined logs (all levels)
          {
            target: 'pino/file',
            level: 'info',
            options: {
              destination: path.join(logsDir, 'combined.log'),
              mkdir: true,
            },
          },
          // Error logs only
          {
            target: 'pino/file',
            level: 'error',
            options: {
              destination: path.join(logsDir, 'error.log'),
              mkdir: true,
            },
          },
          // Console output
          {
            target: 'pino/file',
            level: 'info',
            options: {
              destination: 1, // stdout
            },
          },
        ],
      });
    } else {
      // Development configuration with pretty printing
      return pino.transport({
        targets: [
          {
            target: 'pino-pretty',
            level: 'debug',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
              hideObject: false,
              messageFormat: '{msg}',
              errorLikeObjectKeys: ['err', 'error'],
            },
          },
          // Still write to files in development
          {
            target: 'pino/file',
            level: 'info',
            options: {
              destination: path.join(logsDir, 'combined.log'),
              mkdir: true,
            },
          },
          {
            target: 'pino/file',
            level: 'error',
            options: {
              destination: path.join(logsDir, 'error.log'),
              mkdir: true,
            },
          },
        ],
      });
    }
  } catch (error) {
    console.error('Failed to create logger transport:', error);
    // Fallback to basic console logging
    return pino.transport({
      target: 'pino/file',
      options: { destination: 1 },
    });
  }
};

// Create and export the logger instance
const logger = pino(loggerConfig, createTransport());

// Helper function to add request context to logs
logger.withRequest = (req) => {
  return logger.child({
    requestId: req.id,
    userId: req.user?.id,
    sessionId: req.sessionID,
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
  });
};

// Export logger instance
module.exports = logger;
