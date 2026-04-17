const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/project.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.post(
  '/',
  auth,
  role('ADMIN', 'GERENTE'),
  [body('name').notEmpty(), validate],
  projectController.createProject
);

router.get('/', auth, projectController.listProjects);
router.get('/:id', auth, projectController.getProjectById);

router.put(
  '/:id',
  auth,
  role('ADMIN', 'GERENTE'),
  [body('name').optional().notEmpty(), validate],
  projectController.updateProject
);

router.patch(
  '/:id/status',
  auth,
  role('ADMIN', 'GERENTE'),
  [body('status').isIn(['ACTIVE', 'PAUSED', 'FINISHED']), validate],
  projectController.updateProjectStatus
);

router.delete('/:id', auth, role('ADMIN', 'GERENTE'), projectController.deleteProject);
router.get('/:id/metrics', auth, projectController.metrics);

module.exports = router;
