const bcrypt = require('bcrypt');
const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');

const createUser = async (payload) => {
  const role = await prisma.role.findUnique({ where: { name: payload.roleName } });
  if (!role) throw new ApiError(400, 'Rol inv?lido');

  const exists = await prisma.user.findUnique({ where: { email: payload.email } });
  if (exists) throw new ApiError(409, 'Email ya registrado');

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  return prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      roleId: role.id
    },
    include: { role: true }
  });
};

const listUsers = () => prisma.user.findMany({ include: { role: true }, orderBy: { id: 'asc' } });

const updateUser = async (id, payload) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'Usuario no encontrado');

  const data = { name: payload.name, email: payload.email };

  if (payload.password) {
    data.password = await bcrypt.hash(payload.password, 10);
  }

  if (payload.roleName) {
    const role = await prisma.role.findUnique({ where: { name: payload.roleName } });
    if (!role) throw new ApiError(400, 'Rol inv?lido');
    data.roleId = role.id;
  }

  return prisma.user.update({
    where: { id },
    data,
    include: { role: true }
  });
};

const updateUserStatus = async (id, isActive) => {
  return prisma.user.update({ where: { id }, data: { isActive } });
};

module.exports = { createUser, listUsers, updateUser, updateUserStatus };
