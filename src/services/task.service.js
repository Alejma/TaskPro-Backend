const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');
const { createTaskHistory } = require('./taskHistory.service');
const { logActivity } = require('./taskActivity.service');

const normalizeUserIds = (userIds) => {
  if (!Array.isArray(userIds)) return [];
  return [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
};

const normalizePriority = (priority) => {
  if (priority == null) return 1;
  const num = Number(priority);
  return !isNaN(num) && num > 0 ? num : 1;
};

const normalizeWeight = (weight) => {
  if (weight == null) return 1;
  const num = Number(weight);
  return !isNaN(num) && num > 0 ? num : 1;
};

const buildDateFilter = (days) => {
  if (!days || days === 'all') return {};
  const num = Number(days);
  if (isNaN(num) || num <= 0) return {};
  const since = new Date(Date.now() - num * 24 * 60 * 60 * 1000);
  return { createdAt: { gte: since } };
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
      weight: normalizeWeight(payload.weight),
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      projectId: payload.projectId
    }
  });

  await logActivity({ taskId: task.id, userId: currentUser.id, action: 'CREATED', metadata: { title: task.title } });

  if (normalizedUserIds.length > 0) {
    await prisma.taskAssignment.createMany({
      data: normalizedUserIds.map((userId) => ({ taskId: task.id, userId })),
      skipDuplicates: true
    });
    await createAuditLog({ action: 'ASSIGN_USERS', entity: 'Task', entityId: task.id, userId: currentUser.id });
    await logActivity({ taskId: task.id, userId: currentUser.id, action: 'ASSIGNED', metadata: { userIds: normalizedUserIds } });
  }

  await createAuditLog({ action: 'CREATE', entity: 'Task', entityId: task.id, userId: currentUser.id });
  return getTaskById(task.id);
};

const getAllTasks = async () => {
  return prisma.task.findMany({
    include: {
      project: { select: { id: true, name: true } },
      assignments: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: [{ projectId: 'asc' }, { id: 'asc' }]
  });
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
      weight: payload.weight !== undefined ? normalizeWeight(payload.weight) : undefined,
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
    await logActivity({ taskId: id, userId: currentUser.id, action: 'ASSIGNED', metadata: { userIds: normalizedUserIds } });
  }

  await createAuditLog({ action: 'UPDATE', entity: 'Task', entityId: id, userId: currentUser.id });
  return getTaskById(task.id);
};

const updateTaskStatus = async (id, status, currentUser) => {
  const currentTask = await getTaskById(id);
  const oldStatus = currentTask.status;
  const task = await prisma.task.update({ where: { id }, data: { status } });
  await createAuditLog({ action: 'STATUS_CHANGE', entity: 'Task', entityId: id, userId: currentUser.id });
  await createTaskHistory({ taskId: id, oldStatus, newStatus: status });
  await logActivity({ taskId: id, userId: currentUser.id, action: 'STATUS_CHANGE', metadata: { from: oldStatus, to: status } });
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

const getProjectMetrics = async (projectId, days) => {
  const tasks = await prisma.task.findMany({
    where: { projectId, ...buildDateFilter(days) },
    include: { assignments: true }
  });

  const total = tasks.length;
  const byStatus = { PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
  const byPriority = {};
  let totalWeightCalc = 0;
  let completedWeightCalc = 0;
  let totalPriority = 0;
  const loadByUser = {};
  const now = new Date();
  let overdueCount = 0;

  tasks.forEach((task) => {
    byStatus[task.status] = (byStatus[task.status] || 0) + 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    totalWeightCalc += task.weight;
    totalPriority += task.priority;
    if (task.status === 'DONE') completedWeightCalc += task.weight;
    if (task.dueDate && task.dueDate < now && task.status !== 'DONE') overdueCount++;

    task.assignments.forEach((a) => {
      loadByUser[a.userId] = (loadByUser[a.userId] || 0) + task.weight;
    });
  });

  const completed = byStatus.DONE;
  const progress = total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

  const userIds = Object.keys(loadByUser).map(Number);
  let members = [];
  if (userIds.length > 0) {
    members = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
  }

  const loadByUserDetail = {};
  members.forEach((user) => {
    const userTasks = tasks.filter((t) => t.assignments.some((a) => a.userId === user.id));
    const userCompleted = userTasks.filter((t) => t.status === 'DONE').length;
    const userTotal = userTasks.length;
    loadByUserDetail[user.id] = {
      id: user.id,
      name: user.name,
      email: user.email,
      weightLoad: loadByUser[user.id] || 0,
      taskCount: userTotal,
      completedTasks: userCompleted,
      progress: userTotal === 0 ? 0 : Number(((userCompleted / userTotal) * 100).toFixed(2))
    };
  });

  return {
    projectId,
    totalTasks: total,
    completedTasks: completed,
    pendingTasks: byStatus.PENDING,
    inProgressTasks: byStatus.IN_PROGRESS,
    progressPercentage: progress,
    totalWeight: totalWeightCalc,
    completedWeight: completedWeightCalc,
    weightProgress: totalWeightCalc === 0 ? 0 : Number(((completedWeightCalc / totalWeightCalc) * 100).toFixed(2)),
    averagePriority: total === 0 ? 0 : Number((totalPriority / total).toFixed(2)),
    tasksByPriority: byPriority,
    overdueTasks: overdueCount,
    loadByUser: loadByUserDetail
  };
};

const getProjectUserMetrics = async (projectId, userId, days) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: { select: { name: true } } }
  });
  if (!user) throw new ApiError(404, 'Usuario no encontrado');

  const project = await prisma.project.findFirst({ where: { id: projectId, isActive: true } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      assignments: { some: { userId } },
      ...buildDateFilter(days)
    },
    include: { assignments: true }
  });

  const total = tasks.length;
  const byStatus = { PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
  let totalWeightCalc = 0;
  let completedWeightCalc = 0;
  let totalPriority = 0;
  const now = new Date();
  let overdueCount = 0;

  tasks.forEach((task) => {
    byStatus[task.status]++;
    totalWeightCalc += task.weight;
    totalPriority += task.priority;
    if (task.status === 'DONE') completedWeightCalc += task.weight;
    if (task.dueDate && task.dueDate < now && task.status !== 'DONE') overdueCount++;
  });

  const completed = byStatus.DONE;
  const progress = total === 0 ? 0 : Number(((completed / total) * 100).toFixed(2));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name
    },
    projectId,
    totalTasks: total,
    completedTasks: completed,
    pendingTasks: byStatus.PENDING,
    inProgressTasks: byStatus.IN_PROGRESS,
    progressPercentage: progress,
    totalWeight: totalWeightCalc,
    completedWeight: completedWeightCalc,
    weightProgress: totalWeightCalc === 0 ? 0 : Number(((completedWeightCalc / totalWeightCalc) * 100).toFixed(2)),
    averagePriority: total === 0 ? 0 : Number((totalPriority / total).toFixed(2)),
    overdueTasks: overdueCount
  };
};

const getAllUsersPerformance = async (projectId, days) => {
  const project = await prisma.project.findFirst({ where: { id: projectId, isActive: true } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');

  const dateFilter = buildDateFilter(days);

  const tasks = await prisma.task.findMany({
    where: { projectId, ...dateFilter },
    include: {
      assignments: true,
      history: { where: { newStatus: 'DONE' }, orderBy: { createdAt: 'asc' }, take: 1 }
    }
  });

  const historyEntries = await prisma.taskHistory.findMany({
    where: {
      task: { projectId, ...dateFilter },
      newStatus: 'DONE'
    },
    include: { task: { select: { createdAt: true, weight: true, priority: true } } },
    orderBy: { createdAt: 'asc' }
  });

  const completionTimesByUser = {};
  const globalCompleted = [];

  historyEntries.forEach((entry) => {
    if (entry.task.createdAt) {
      const hours = Math.max(0, (new Date(entry.createdAt) - new Date(entry.task.createdAt)) / (1000 * 60 * 60));
      const taskAssignments = tasks.find((t) => t.id === entry.taskId)?.assignments || [];
      taskAssignments.forEach((a) => {
        if (!completionTimesByUser[a.userId]) completionTimesByUser[a.userId] = [];
        completionTimesByUser[a.userId].push(hours);
      });
      if (taskAssignments.length > 0) {
        globalCompleted.push(hours);
      }
    }
  });

  const globalAvgCompletion = globalCompleted.length > 0
    ? globalCompleted.reduce((s, v) => s + v, 0) / globalCompleted.length
    : 0;

  const allUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: { select: { name: true } } }
  });

  const performance = allUsers.map((user) => {
    const userTasks = tasks.filter((t) => t.assignments.some((a) => a.userId === user.id));

    const byStatus = { PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
    let totalWeightAssigned = 0;
    let totalWeightCompleted = 0;
    let totalPriorityScore = 0;
    let priorityCompletedScore = 0;
    const now = new Date();
    let overdue = 0;

    userTasks.forEach((t) => {
      byStatus[t.status]++;
      totalWeightAssigned += t.weight;
      totalPriorityScore += t.priority * t.weight;
      if (t.status === 'DONE') {
        totalWeightCompleted += t.weight;
        priorityCompletedScore += t.priority * t.weight;
      }
      if (t.dueDate && t.dueDate < now && t.status !== 'DONE') overdue++;
    });

    const completedTasks = byStatus.DONE;
    const totalTasks = userTasks.length;
    const completionRate = totalTasks === 0 ? 0 : Number(((completedTasks / totalTasks) * 100).toFixed(2));
    const weightCompletionRate = totalWeightAssigned === 0 ? 0
      : Number(((totalWeightCompleted / totalWeightAssigned) * 100).toFixed(2));

    const userCompletionTimes = completionTimesByUser[user.id] || [];
    const userAvgCompletion = userCompletionTimes.length > 0
      ? userCompletionTimes.reduce((s, v) => s + v, 0) / userCompletionTimes.length
      : null;

    const speedRatio = (userAvgCompletion !== null && globalAvgCompletion > 0)
      ? Number((globalAvgCompletion / userAvgCompletion).toFixed(2))
      : null;

    const tasksCompleted = userCompletionTimes.length;

    const efficiencyScore = userAvgCompletion !== null && globalAvgCompletion > 0
      ? Number(((1 - (userAvgCompletion - globalAvgCompletion) / globalAvgCompletion) * 100).toFixed(1))
      : null;

    return {
      user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
      totalTasks,
      completedTasks,
      pendingTasks: byStatus.PENDING,
      inProgressTasks: byStatus.IN_PROGRESS,
      completionRate,
      totalWeightAssigned,
      totalWeightCompleted,
      weightCompletionRate,
      totalPriorityScore,
      priorityCompletedScore,
      priorityEfficiency: totalPriorityScore === 0 ? 0
        : Number(((priorityCompletedScore / totalPriorityScore) * 100).toFixed(2)),
      overdueTasks: overdue,
      avgCompletionHours: userAvgCompletion !== null ? Number(userAvgCompletion.toFixed(1)) : null,
      projectAvgCompletionHours: Number(globalAvgCompletion.toFixed(1)),
      speedRatio,
      efficiencyScore,
    };
  });

  return {
    projectId,
    period: days || 'all',
    globalAvgCompletionHours: Number(globalAvgCompletion.toFixed(1)),
    totalProjectTasks: tasks.length,
    users: performance.sort((a, b) => (b.efficiencyScore || 0) - (a.efficiencyScore || 0))
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
  getAllTasks,
  getTaskById,
  listTasksByProject,
  updateTask,
  updateTaskStatus,
  getKanbanByProject,
  addAttachmentToTask,
  getProjectMetrics,
  getProjectUserMetrics,
  getAllUsersPerformance,
  getOverdueTasks,
  deleteTask
};
