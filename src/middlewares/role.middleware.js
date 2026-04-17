const ApiError = require('../utils/apiError');

const roleMiddleware = (...allowedRoles) => (req, _res, next) => {
  const currentRole = req.user && req.user.role ? req.user.role.name : null;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return next(new ApiError(403, 'No tienes permisos para esta acci?n'));
  }

  return next();
};

module.exports = roleMiddleware;
