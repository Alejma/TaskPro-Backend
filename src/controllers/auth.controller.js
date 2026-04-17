const { login } = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/response');

const loginController = catchAsync(async (req, res) => {
  const data = await login(req.body.email, req.body.password);
  return sendResponse(res, 200, 'Login exitoso', data);
});

module.exports = { loginController };
