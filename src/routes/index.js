const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const commentRoutes = require('./comment.routes');
const dashboardRoutes = require('./dashboard.routes');
const auth = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/comments', commentRoutes);
router.use('/dashboard', dashboardRoutes);
router.get('/usuarios', auth, userController.listUsersSimple);

module.exports = router;
