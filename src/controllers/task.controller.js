const taskService = require('../services/task.service');
const { getTaskActivity } = require('../services/taskActivity.service');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/response');

const createTask = catchAsync(async (req, res) => {
  const task = await taskService.createTask(req.body, req.user);
  return sendResponse(res, 201, 'Tarea creada', task);
});

const createTaskByProject = catchAsync(async (req, res) => {
  const task = await taskService.createTask(
    { ...req.body, projectId: Number(req.params.id) },
    req.user
  );
  return sendResponse(res, 201, 'Tarea creada', task);
});

const listAllTasks = catchAsync(async (_req, res) => {
  const tasks = await taskService.getAllTasks();
  return sendResponse(res, 200, 'Tareas obtenidas', tasks);
});

const getTaskById = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(Number(req.params.id));
  return sendResponse(res, 200, 'Tarea obtenida', task);
});

const listTasksByProject = catchAsync(async (req, res) => {
  const tasks = await taskService.listTasksByProject(Number(req.params.id));
  return sendResponse(res, 200, 'Tareas del proyecto', tasks);
});

const getKanbanByProject = catchAsync(async (req, res) => {
  const kanban = await taskService.getKanbanByProject(Number(req.params.projectId));
  return sendResponse(res, 200, 'Tablero Kanban', kanban);
});

const updateTaskStatus = catchAsync(async (req, res) => {
  const task = await taskService.updateTaskStatus(Number(req.params.id), req.body.status, req.user);
  return sendResponse(res, 200, 'Estado de tarea actualizado', task);
});

const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTask(Number(req.params.id), req.body, req.user);
  return sendResponse(res, 200, 'Tarea actualizada', task);
});

const addAttachment = catchAsync(async (req, res) => {
  const fileUrl = '/uploads/' + req.file.filename;
  const attachment = await taskService.addAttachmentToTask(Number(req.params.id), fileUrl, req.user);
  return sendResponse(res, 201, 'Archivo asociado a tarea', attachment);
});

const overdueTasks = catchAsync(async (_req, res) => {
  const tasks = await taskService.getOverdueTasks();
  return sendResponse(res, 200, 'Tareas vencidas', tasks);
});

const deleteTask = catchAsync(async (req, res) => {
  const result = await taskService.deleteTask(Number(req.params.id), req.user);
  return sendResponse(res, 200, 'Tarea eliminada', result);
});

const taskActivity = catchAsync(async (req, res) => {
  const activity = await getTaskActivity(Number(req.params.id));
  return sendResponse(res, 200, 'Actividad de la tarea', activity);
});

module.exports = {
  createTask,
  createTaskByProject,
  listAllTasks,
  getTaskById,
  listTasksByProject,
  getKanbanByProject,
  updateTaskStatus,
  updateTask,
  addAttachment,
  overdueTasks,
  deleteTask,
  taskActivity
};
