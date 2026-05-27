const prisma = require('../prisma/client');

const logActivity = async ({ taskId, userId, action, metadata }) => {
  return prisma.taskActivity.create({
    data: { taskId, userId, action, metadata: metadata || undefined }
  });
};

const getTaskActivity = async (taskId) => {
  return prisma.taskActivity.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' }
  });
};

module.exports = { logActivity, getTaskActivity };
