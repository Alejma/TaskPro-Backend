const express = require('express');
const { body } = require('express-validator');
const { loginController } = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.post(
  '/login',
  [body('email').isEmail(), body('password').isString().isLength({ min: 6 }), validate],
  loginController
);

module.exports = router;
