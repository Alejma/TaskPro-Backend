const projectService = require('../services/project.service');
const taskService = require('../services/task.service');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/response');

const createProject = catchAsync(async (req, res) => {
  const project = await projectService.createProject(req.body, req.user);
  return sendResponse(res, 201, 'Proyecto creado', project);
});

const listProjects = catchAsync(async (req, res) => {
  const projects = await projectService.listProjects(req.user);
  return sendResponse(res, 200, 'Proyectos obtenidos', projects);
});

const getProjectById = catchAsync(async (req, res) => {
  const project = await projectService.getProjectById(Number(req.params.id));
  return sendResponse(res, 200, 'Proyecto obtenido', project);
});

const updateProject = catchAsync(async (req, res) => {
  const project = await projectService.updateProject(Number(req.params.id), req.body, req.user);
  return sendResponse(res, 200, 'Proyecto actualizado', project);
});

const updateProjectStatus = catchAsync(async (req, res) => {
  const project = await projectService.updateProjectStatus(Number(req.params.id), req.body.status, req.user);
  return sendResponse(res, 200, 'Estado del proyecto actualizado', project);
});

const deleteProject = catchAsync(async (req, res) => {
  const project = await projectService.softDeleteProject(Number(req.params.id), req.user);
  return sendResponse(res, 200, 'Proyecto eliminado l?gicamente', project);
});

const metrics = catchAsync(async (req, res) => {
  const data = await taskService.getProjectMetrics(Number(req.params.id));
  return sendResponse(res, 200, 'M?tricas del proyecto', data);
});

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
  metrics
};
