const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');
const { logActivity } = require('./taskActivity.service');

const createComment = async (payload, currentUser) => {
  const taskId = Number(payload.taskId);
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new ApiError(404, 'Tarea no encontrada');

  const comment = await prisma.comment.create({
    data: {
      content: payload.content,
      fileUrl: payload.fileUrl || null,
      taskId,
      userId: currentUser.id
    },
    include: { user: { select: { id: true, name: true } } }
  });

  await createAuditLog({ action: 'ADD_COMMENT', entity: 'Task', entityId: taskId, userId: currentUser.id });
  await logActivity({ taskId, userId: currentUser.id, action: 'COMMENTED', metadata: { commentId: comment.id } });
  return comment;
};

const listCommentsByTask = async (taskId) => prisma.comment.findMany({
  where: { taskId },
  include: { user: { select: { id: true, name: true } } },
  orderBy: { createdAt: 'desc' }
});

module.exports = { createComment, listCommentsByTask };
