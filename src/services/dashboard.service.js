const prisma = require('../prisma/client');

const getDashboardMetrics = async () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    projects,
    tasks,
    overdueTasks,
    completedThisWeek,
    createdThisWeek
  ] = await Promise.all([
    prisma.project.findMany({ where: { isActive: true }, select: { id: true, name: true, status: true } }),
    prisma.task.findMany({
      select: { id: true, status: true, dueDate: true, projectId: true, priority: true, weight: true }
    }),
    prisma.task.findMany({
      where: { dueDate: { lt: now }, status: { not: 'DONE' } },
      select: { id: true }
    }),
    prisma.taskHistory.findMany({
      where: { newStatus: 'DONE', createdAt: { gte: startOfWeek } },
      select: { taskId: true },
      distinct: ['taskId']
    }),
    prisma.task.findMany({
      where: { createdAt: { gte: startOfWeek } },
      select: { id: true }
    })
  ]);

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
  const byStatus = { PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
  const byPriority = {};
  let totalPriority = 0;
  let totalWeight = 0;
  let completedWeight = 0;

  tasks.forEach((t) => {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    totalPriority += t.priority;
    totalWeight += t.weight;
    if (t.status === 'DONE') completedWeight += t.weight;
  });

  const totalTasks = tasks.length;
  const overdueCount = overdueTasks.length;
  const completedWeek = completedThisWeek.length;
  const createdWeek = createdThisWeek.length;

  const completed = byStatus.DONE;
  const completionRate = totalTasks === 0 ? 0 : Number(((completed / totalTasks) * 100).toFixed(1));
  const weightProgress = totalWeight === 0 ? 0 : Number(((completedWeight / totalWeight) * 100).toFixed(1));

  const projectList = projects.map((p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const pByStatus = { PENDING: 0, IN_PROGRESS: 0, DONE: 0 };
    projectTasks.forEach((t) => { pByStatus[t.status]++; });
    const pTotal = projectTasks.length;
    const pDone = pByStatus.DONE;
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      totalTasks: pTotal,
      pendingTasks: pByStatus.PENDING,
      inProgressTasks: pByStatus.IN_PROGRESS,
      completedTasks: pDone,
      progress: pTotal === 0 ? 0 : Number(((pDone / pTotal) * 100).toFixed(1)),
    };
  });

  const priorityLabels = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Urgente' };
  const tasksByPriority = {};
  Object.entries(byPriority).forEach(([key, count]) => {
    tasksByPriority[priorityLabels[key] || key] = count;
  });

  return {
    totalProjects: projects.length,
    activeProjects,
    totalTasks,
    pendingTasks: byStatus.PENDING,
    inProgressTasks: byStatus.IN_PROGRESS,
    completedTasks: byStatus.DONE,
    overdueTasks: overdueCount,
    completedThisWeek: completedWeek,
    createdThisWeek: createdWeek,
    averagePriority: totalTasks === 0 ? 0 : Number((totalPriority / totalTasks).toFixed(2)),
    completionRate,
    totalWeight,
    completedWeight,
    weightProgress,
    tasksByPriority,
    projects: projectList,
  };
};

module.exports = { getDashboardMetrics };
