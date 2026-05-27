const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');

const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Credenciales inv?lidas');
  }

  const match = await bcrypt.compare(password, user.password);
  
  if (!match) {
    throw new ApiError(401, 'Credenciales inv?lidas');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name
    }
  };
};

module.exports = { login };
