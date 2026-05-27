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
  [
    body('title').notEmpty(),
    body('projectId').isInt(),
    body('priority').optional().isInt({ min: 1 }),
    body('weight').optional().isInt({ min: 1 }),
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
  [
    body('title').notEmpty(),
    body('priority').optional().isInt({ min: 1 }),
    body('weight').optional().isInt({ min: 1 }),
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
router.get('/', auth, taskController.listAllTasks);
router.get('/:id', auth, taskController.getTaskById);

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
    body('priority').optional().isInt({ min: 1 }),
    body('weight').optional().isInt({ min: 1 }),
    body('userIds').optional().isArray(),
    body('assigneeIds').optional().isArray(),
    validate
  ],
  taskController.updateTask
);

router.get('/:id/activity', auth, taskController.taskActivity);
router.post('/:id/attachments', auth, upload.single('file'), taskController.addAttachment);

router.delete(
  '/:id',
  auth,
  role('ADMIN', 'GERENTE'),
  taskController.deleteTask
);

module.exports = router;
