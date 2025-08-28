const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', err);

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      stack
    }
  });
};

module.exports = errorHandler;