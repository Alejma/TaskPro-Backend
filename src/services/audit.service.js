const prisma = require('../prisma/client');

const createAuditLog = async ({ action, entity, entityId, userId }) => {
  return prisma.auditLog.create({
    data: { action, entity, entityId, userId }
  });
};

module.exports = { createAuditLog };
