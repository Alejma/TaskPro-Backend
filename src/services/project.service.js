const prisma = require('../prisma/client');
const ApiError = require('../utils/apiError');
const { createAuditLog } = require('./audit.service');

const normalizeMemberIds = (memberIds) => {
  if (!Array.isArray(memberIds)) return null;

  const normalized = [...new Set(memberIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  return normalized;
};

const formatProjectResponse = (project) => {
  if (!project) return project;
  
  const formatted = { ...project };
  if (formatted.members && Array.isArray(formatted.members)) {
    formatted.members = formatted.members.map((m) => m.user);
  }
  return formatted;
};

const syncProjectMembers = async (projectId, memberIds, tx) => {
  if (!Array.isArray(memberIds)) return;

  await tx.projectMember.deleteMany({ where: { projectId } });

  if (memberIds.length > 0) {
    const validUsers = await tx.user.findMany({ where: { id: { in: memberIds } }, select: { id: true } });
    const validUserIds = validUsers.map((u) => u.id);

    const invalidIds = memberIds.filter((id) => !validUserIds.includes(id));
    if (invalidIds.length > 0) {
      throw new ApiError(400, `Usuario(s) no encontrado(s): ${invalidIds.join(', ')}`);
    }

    await tx.projectMember.createMany({
      data: memberIds.map((userId) => ({ projectId, userId })),
      skipDuplicates: true
    });
  }
};

const createProject = async (payload, currentUser) => {
  const memberIds = normalizeMemberIds(payload.memberIds);

  const project = await prisma.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        name: payload.name,
        description: payload.description,
        startDate: payload.startDate ? new Date(payload.startDate) : null,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        ownerId: payload.ownerId || currentUser.id
      }
    });

    await syncProjectMembers(createdProject.id, memberIds, tx);
    return createdProject;
  });

  await createAuditLog({ action: 'CREATE', entity: 'Project', entityId: project.id, userId: currentUser.id });
  return getProjectById(project.id);
};

const listProjects = async (currentUser) => {
  let projects;
  
  if (currentUser.role.name === 'ADMIN') {
    projects = await prisma.project.findMany({
      where: { isActive: true },
      include: {
        owner: true,
        members: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
  } else if (currentUser.role.name === 'GERENTE') {
    projects = await prisma.project.findMany({
      where: { ownerId: currentUser.id, isActive: true },
      include: {
        owner: true,
        members: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
  } else {
    projects = await prisma.project.findMany({
      where: {
        isActive: true,
        OR: [
          {
            members: {
              some: { userId: currentUser.id }
            }
          },
          {
            tasks: {
              some: {
                assignments: {
                  some: { userId: currentUser.id }
                }
              }
            }
          }
        ]
      },
      include: {
        owner: true,
        members: { include: { user: { select: { id: true, name: true, email: true } } } }
      }
    });
  }

  return projects.map(formatProjectResponse);
};

const getProjectById = async (id) => {
  const project = await prisma.project.findFirst({
    where: { id, isActive: true },
    include: {
      owner: true,
      members: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');
  return formatProjectResponse(project);
};

const updateProject = async (id, payload, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !project.isActive) throw new ApiError(404, 'Proyecto no encontrado');

  const memberIds = normalizeMemberIds(payload.memberIds);

  const updated = await prisma.$transaction(async (tx) => {
    const updatedProject = await tx.project.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        startDate: payload.startDate ? new Date(payload.startDate) : undefined,
        endDate: payload.endDate ? new Date(payload.endDate) : undefined
      }
    });

    await syncProjectMembers(id, memberIds, tx);
    return updatedProject;
  });

  await createAuditLog({ action: 'UPDATE', entity: 'Project', entityId: updated.id, userId: currentUser.id });
  return getProjectById(updated.id);
};

const updateProjectMembers = async (id, memberIds, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !project.isActive) throw new ApiError(404, 'Proyecto no encontrado');

  const normalizedMemberIds = normalizeMemberIds(memberIds);
  if (normalizedMemberIds === null) {
    throw new ApiError(400, 'memberIds debe ser un arreglo');
  }

  await prisma.$transaction(async (tx) => {
    await syncProjectMembers(id, normalizedMemberIds, tx);
  });

  await createAuditLog({ action: 'ASSIGN_USERS', entity: 'Project', entityId: id, userId: currentUser.id });
  return getProjectById(id);
};

const updateProjectStatus = async (id, status, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || !project.isActive) throw new ApiError(404, 'Proyecto no encontrado');

  await prisma.project.update({ where: { id }, data: { status } });
  await createAuditLog({ action: 'STATUS_CHANGE', entity: 'Project', entityId: id, userId: currentUser.id });
  return getProjectById(id);
};

const softDeleteProject = async (id, currentUser) => {
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) throw new ApiError(404, 'Proyecto no encontrado');

  await prisma.project.update({
    where: { id },
    data: { isActive: false }
  });

  await createAuditLog({ action: 'DELETE', entity: 'Project', entityId: id, userId: currentUser.id });
  return { id, isActive: false, message: 'Proyecto eliminado lógicamente' };
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  updateProjectMembers,
  updateProjectStatus,
  softDeleteProject
};
