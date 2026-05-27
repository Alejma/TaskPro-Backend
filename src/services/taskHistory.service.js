const prisma = require('../prisma/client');

const createTaskHistory = async ({ taskId, oldStatus, newStatus }) => {
  return prisma.taskHistory.create({
    data: { taskId, oldStatus, newStatus }
  });
};

module.exports = { createTaskHistory };
