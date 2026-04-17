const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');

const createProject = async (payload, currentUser) => {
  const project = await prisma.project.create({
    data: {
      name: payload.name,
      description: payload.description,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      ownerId: payload.ownerId || currentUser.id
    }
  });

  await createAuditLog({ action: 'CREATE', entity: 'Project', entityId: project.id, userId: currentUser.id });
  return project;
};

const listProjects = async (currentUser) => {
  if (currentUser.role.name === 'ADMIN') {
    return prisma.project.findMany({ where: { isActive: true }, include: { owner: true } });
  }

  if (currentUser.role.name === 'GERENTE') {
    return prisma.project.findMany({ where: { ownerId: currentUser.id, isActive: true }, include: { owner: true } });
  }

  return prisma.project.findMany({
    where: {
      isActive: true,
      tasks: {
        some: {
          assignments: {
            some: { userId: currentUser.id }
          }
        }
      }
    },
    include: { owner: true }
  });
};

const getProjectById = async (id) => {
  const project = await prisma.project.findFirst({ where: { id, isActive: true }, include: { owner: true } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');
  return project;
};

const updateProject = async (id, payload, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !project.isActive) throw new ApiError(404, 'Proyecto no encontrado');

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: payload.name,
      description: payload.description,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined
    }
  });

  await createAuditLog({ action: 'UPDATE', entity: 'Project', entityId: updated.id, userId: currentUser.id });
  return updated;
};

const updateProjectStatus = async (id, status, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !project.isActive) throw new ApiError(404, 'Proyecto no encontrado');

  const updated = await prisma.project.update({ where: { id }, data: { status } });
  await createAuditLog({ action: 'STATUS_CHANGE', entity: 'Project', entityId: id, userId: currentUser.id });
  return updated;
};

const softDeleteProject = async (id, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');

  const deleted = await prisma.project.update({
    where: { id },
    data: { isActive: false }
  });

  await createAuditLog({ action: 'DELETE', entity: 'Project', entityId: id, userId: currentUser.id });
  return deleted;
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  softDeleteProject
};
