const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');

const normalizeUserIds = (userIds) => {
  if (!Array.isArray(userIds)) return [];
  return [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const normalizePriority = (priority) => {
  if (priority == null) return 1;
  const num = Number(priority);
  return !isNaN(num) && num > 0 ? num : 1;
};

const createTask = async (payload, currentUser) => {
  const project = await prisma.project.findFirst({ where: { id: payload.projectId, isActive: true } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');

  // Aceptar tanto userIds como assigneeIds
  const userIds = payload.userIds || payload.assigneeIds || [];
  const normalizedUserIds = normalizeUserIds(userIds);

  if (normalizedUserIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: { id: { in: normalizedUserIds } },
      select: { id: true }
    });
    const validUserIds = validUsers.map((u) => u.id);
    const invalidIds = normalizedUserIds.filter((id) => !validUserIds.includes(id));
    if (invalidIds.length > 0) {
      throw new ApiError(400, `Usuario(s) no encontrado(s): ${invalidIds.join(', ')}`);
    }
  }

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description,
      status: payload.status || 'PENDING',
      priority: normalizePriority(payload.priority),
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      projectId: payload.projectId
    }
  });

  if (normalizedUserIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: normalizedUserIds.map((userId) => ({ taskId: task.id, userId })),
      skipDuplicates: true
    });
    await createAuditLog({ action: 'ASSIGN_USERS', entity: 'Task', entityId: task.id, userId: currentUser.id });
  }

  await createAuditLog({ action: 'CREATE', entity: 'Task', entityId: task.id, userId: currentUser.id });
  return getTaskById(task.id);
};

const getTaskById = async (id) => {
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      comments: true,
      attachments: true
    }
  });

  if (!task) throw new ApiError(404, 'Tarea no encontrada');
  return task;
};

const listTasksByProject = async (projectId) => {
  return prisma.task.findMany({
    where: { projectId },
    include: {
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
      comments: true,
      attachments: true
    },
    orderBy: { id: 'asc' }
  });
};

const updateTask = async (id, payload, currentUser) => {
  await getTaskById(id);

  // Aceptar tanto userIds como assigneeIds
  const userIds = payload.userIds || payload.assigneeIds;
  const normalizedUserIds = normalizeUserIds(userIds);
  if (normalizedUserIds.length > 0) {
    const validUsers = await prisma.user.findMany({
      where: { id: { in: normalizedUserIds } },
      select: { id: true }
    });
    const validUserIds = validUsers.map((u) => u.id);
    const invalidIds = normalizedUserIds.filter((id) => !validUserIds.includes(id));
    if (invalidIds.length > 0) {
      throw new ApiError(400, `Usuario(s) no encontrado(s): ${invalidIds.join(', ')}`);
    }
  }

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority !== undefined ? normalizePriority(payload.priority) : undefined,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null
    }
  });

  if (payload.userIds !== undefined || payload.assigneeIds !== undefined) {
    await prisma.taskAssignment.deleteMany({ where: { taskId: id } });
    if (normalizedUserIds.length > 0) {
      await prisma.taskAssignment.createMany({
        data: normalizedUserIds.map((userId) => ({ taskId: id, userId })),
        skipDuplicates: true
      });
    }

    await createAuditLog({ action: 'ASSIGN_USERS', entity: 'Task', entityId: id, userId: currentUser.id });
  }

  await createAuditLog({ action: 'UPDATE', entity: 'Task', entityId: id, userId: currentUser.id });
  return getTaskById(task.id);
};

const updateTaskStatus = async (id, status, currentUser) => {
  await getTaskById(id);
  const task = await prisma.task.update({ where: { id }, data: { status } });
  await createAuditLog({ action: 'STATUS_CHANGE', entity: 'Task', entityId: id, userId: currentUser.id });
  return task;
};

const getKanbanByProject = async (projectId) => {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: { assignments: { include: { user: { select: { id: true, name: true, email: true } } } } }
  });

  return tasks.reduce((acc, task) => {
    acc[task.status].push(task);
    return acc;
  }, { PENDING: [], IN_PROGRESS: [], DONE: [] });
};

const addAttachmentToTask = async (taskId, fileUrl, currentUser) => {
  await getTaskById(taskId);
  const attachment = await prisma.attachment.create({ data: { taskId, fileUrl } });
  await createAuditLog({ action: 'ADD_ATTACHMENT', entity: 'Task', entityId: taskId, userId: currentUser.id });
  return attachment;
};

const getProjectMetrics = async (projectId) => {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: { assignments: true }
  });

  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'DONE').length;
  const progress = total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

  const loadByUser = {};
  tasks.forEach((task) => {
    task.assignments.forEach((a) => {
      loadByUser[a.userId] = (loadByUser[a.userId] || 0) + 1;
    });
  });

  return {
    projectId,
    progressPercentage: progress,
    completedTasks: completed,
    totalTasks: total,
    loadByUser
  };
};

const getOverdueTasks = async () => {
  const now = new Date();
  return prisma.task.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: 'DONE' }
    },
    include: { project: true }
  });
};

const deleteTask = async (id, currentUser) => {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new ApiError(404, 'Tarea no encontrada');

  await prisma.task.delete({ where: { id } });
  await createAuditLog({ action: 'DELETE', entity: 'Task', entityId: id, userId: currentUser.id });
  
  return { id, message: 'Tarea eliminada correctamente' };
};

module.exports = {
  createTask,
  listTasksByProject,
  updateTask,
  updateTaskStatus,
  getKanbanByProject,
  addAttachmentToTask,
  getProjectMetrics,
  getOverdueTasks,
  deleteTask
};
