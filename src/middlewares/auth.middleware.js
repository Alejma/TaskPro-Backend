const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');

module.exports = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Token no proporcionado');
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true }
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Usuario inv?lido o inactivo');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
