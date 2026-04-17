const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');

const createComment = async (payload, currentUser) => {
  const task = await prisma.task.findUnique({ where: { id: payload.taskId } });
  if (!task) throw new ApiError(404, 'Tarea no encontrada');

  const comment = await prisma.comment.create({
    data: {
      content: payload.content,
      taskId: payload.taskId,
      userId: currentUser.id
    },
    include: { user: { select: { id: true, name: true } } }
  });

  await createAuditLog({ action: 'ADD_COMMENT', entity: 'Task', entityId: payload.taskId, userId: currentUser.id });
  return comment;
};

const listCommentsByTask = async (taskId) => prisma.comment.findMany({
  where: { taskId },
  include: { user: { select: { id: true, name: true } } },
  orderBy: { createdAt: 'desc' }
});

module.exports = { createComment, listCommentsByTask };
