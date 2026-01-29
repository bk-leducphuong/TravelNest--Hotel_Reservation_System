const ApiError = require('../utils/ApiError');
const logger = require('../config/logger.config');

module.exports = (err, req, res, next) => {
  let apiError = err;

  // Convert unknown errors
  if (!(err instanceof ApiError)) {
    apiError = new ApiError(500, 'INTERNAL_ERROR', 'Internal server error');
  }

  // Create request-specific logger
  const requestLogger = logger.withRequest(req);

  // Log error with structured data for ELK
  requestLogger.error(
    {
      // Error details
      errorCode: apiError.code,
      errorMessage: apiError.message,
      statusCode: apiError.statusCode,
      stack: err.stack,

      // Request details
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      params: req.params,

      // Additional context
      isOperational: apiError.isOperational || false,
      details: apiError.details,

      // User context
      userId: req.user?.id,
      sessionId: req.sessionID,

      // Client info
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
    },
    `Error: ${err.message}`
  );

  // Format error response per RESTful standards
  const errorResponse = {
    error: {
      code: apiError.code,
      message: apiError.message,
    },
  };

  // Add fields if it's a validation error (details contains field-level errors)
  if (apiError.details && Object.keys(apiError.details).length > 0) {
    errorResponse.error.fields = apiError.details;
  }

  res.status(apiError.statusCode).json(errorResponse);
};
