const prisma = require('../prisma/client');

const bootstrapRoles = async () => {
  const roles = ['ADMIN', 'GERENTE', 'COLABORADOR'];
  await Promise.all(
    roles.map((roleName) =>
      prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName }
      })
    )
  );
};

module.exports = { bootstrapRoles };
