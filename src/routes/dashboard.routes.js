const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/metrics', auth, dashboardController.metrics);

module.exports = router;
