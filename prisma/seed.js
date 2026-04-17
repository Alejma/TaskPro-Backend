const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const roleNames = ['ADMIN', 'GERENTE', 'COLABORADOR'];

  for (const roleName of roleNames) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName }
    });
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const hashedPassword = await bcrypt.hash('Admin123*', 10);

  await prisma.user.upsert({
    where: { email: 'admin@taskpro.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@taskpro.com',
      password: hashedPassword,
      roleId: adminRole.id
    }
  });
}

main()
  .then(async () => {
    console.log('Seed completado: admin@taskpro.com / Admin123*');
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Error en seed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
