const logger = require('../config/logger');

module.exports = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Error interno del servidor';

  logger.error(message, error.details || error.stack);

  res.status(statusCode).json({
    success: false,
    message,
    details: error.details || null
  });
};
