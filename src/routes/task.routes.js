const express = require('express');
const { body } = require('express-validator');
const taskController = require('../controllers/task.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../config/multer');

const router = express.Router();

router.post(
  '/',
  auth,
  role('ADMIN', 'GERENTE'),
  [
    body('title').notEmpty(),
    body('projectId').isInt(),
    body('userIds').optional().isArray(),
    body('assigneeIds').optional().isArray(),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'DONE']),
    validate
  ],
  taskController.createTask
);

router.post(
  '/project/:id',
  auth,
  role('ADMIN', 'GERENTE'),
  [
    body('title').notEmpty(),
    body('userIds').optional().isArray(),
    body('assigneeIds').optional().isArray(),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'DONE']),
    validate
  ],
  taskController.createTaskByProject
);

router.get('/project/:id', auth, taskController.listTasksByProject);
router.get('/kanban/:projectId', auth, taskController.getKanbanByProject);
router.get('/overdue/list', auth, taskController.overdueTasks);

router.patch(
  '/:id/status',
  auth,
  [body('status').isIn(['PENDING', 'IN_PROGRESS', 'DONE']), validate],
  taskController.updateTaskStatus
);

router.put(
  '/:id',
  auth,
  [
    body('title').optional().notEmpty(),
    body('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'DONE']),
    body('userIds').optional().isArray(),
    body('assigneeIds').optional().isArray(),
    validate
  ],
  taskController.updateTask
);

router.post('/:id/attachments', auth, upload.single('file'), taskController.addAttachment);

router.delete(
  '/:id',
  auth,
  role('ADMIN', 'GERENTE'),
  taskController.deleteTask
);

module.exports = router;
