const logger = require('../config/logger.config');
const { v4: uuidv4 } = require('uuid');

/**
 * Request logging middleware for tracking all HTTP requests
 * Logs request details and response metrics for monitoring and debugging
 */
const requestLogger = (req, res, next) => {
  // Generate unique request ID if not already set
  if (!req.id) {
    req.id = uuidv4();
  }

  // Store request start time
  const startTime = Date.now();

  // Create request-specific logger
  const reqLogger = logger.withRequest(req);

  // Log incoming request
  reqLogger.info(
    {
      type: 'request',
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      params: req.params,
      body: req.method !== 'GET' ? req.body : undefined,
      headers: {
        'content-type': req.get('content-type'),
        accept: req.get('accept'),
        origin: req.get('origin'),
      },
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    },
    `Incoming ${req.method} ${req.originalUrl}`
  );

  // Capture the original res.json to log the response
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  // Override res.json to capture response data
  res.json = function (data) {
    res.locals.responseData = data;
    return originalJson(data);
  };

  // Override res.send to capture response data
  res.send = function (data) {
    res.locals.responseData = data;
    return originalSend(data);
  };

  // Log response when request finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    reqLogger[logLevel](
      {
        type: 'response',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: duration,
        contentLength: res.get('content-length'),
        requestId: req.id,
        userId: req.user?.id,

        // Add response body for errors only (to avoid logging sensitive data)
        ...(res.statusCode >= 400 && {
          responseBody: res.locals.responseData,
        }),
      },
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  // Log request errors
  res.on('error', (error) => {
    reqLogger.error(
      {
        type: 'response_error',
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.originalUrl,
        requestId: req.id,
      },
      `Response error: ${error.message}`
    );
  });

  next();
};

module.exports = requestLogger;
