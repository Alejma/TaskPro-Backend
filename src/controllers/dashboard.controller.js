const dashboardService = require('../services/dashboard.service');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/response');

const metrics = catchAsync(async (_req, res) => {
  const data = await dashboardService.getDashboardMetrics();
  return sendResponse(res, 200, 'Métricas del dashboard', data);
});

module.exports = { metrics };
