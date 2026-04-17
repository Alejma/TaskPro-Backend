const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');

const createTask = async (payload, currentUser) => {
  const project = await prisma.project.findFirst({ where: { id: payload.projectId, isActive: true } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description,
      status: payload.status || 'PENDING',
      priority: payload.priority || 1,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      projectId: payload.projectId
    }
  });

  if (Array.isArray(payload.userIds) && payload.userIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: payload.userIds.map((userId) => ({ taskId: task.id, userId })),
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

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null
    }
  });

  if (Array.isArray(payload.userIds)) {
    await prisma.taskAssignment.deleteMany({ where: { taskId: id } });
    if (payload.userIds.length > 0) {
      await prisma.taskAssignment.createMany({
        data: payload.userIds.map((userId) => ({ taskId: id, userId })),
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

module.exports = {
  createTask,
  listTasksByProject,
  updateTask,
  updateTaskStatus,
  getKanbanByProject,
  addAttachmentToTask,
  getProjectMetrics,
  getOverdueTasks
};
