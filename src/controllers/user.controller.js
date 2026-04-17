const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/response');

const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  return sendResponse(res, 201, 'Usuario creado', user);
});

const listUsers = catchAsync(async (_req, res) => {
  const users = await userService.listUsers();
  return sendResponse(res, 200, 'Usuarios obtenidos', users);
});

const updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUser(Number(req.params.id), req.body);
  return sendResponse(res, 200, 'Usuario actualizado', user);
});

const updateUserStatus = catchAsync(async (req, res) => {
  const user = await userService.updateUserStatus(Number(req.params.id), req.body.isActive);
  return sendResponse(res, 200, 'Estado de usuario actualizado', user);
});

module.exports = { createUser, listUsers, updateUser, updateUserStatus };
