const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const auth = require('../middlewares/auth.middleware');
const role = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.post(
  '/',
  auth,
  role('ADMIN'),
  [
    body('name').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('roleName').isIn(['ADMIN', 'GERENTE', 'COLABORADOR']),
    validate
  ],
  userController.createUser
);

router.get('/', auth, userController.listUsers);

router.put(
  '/:id',
  auth,
  [
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('roleName').optional().isIn(['ADMIN', 'GERENTE', 'COLABORADOR']),
    validate
  ],
  userController.updateUser
);

router.patch('/:id/status', auth, [body('isActive').isBoolean(), validate], userController.updateUserStatus);

module.exports = router;
