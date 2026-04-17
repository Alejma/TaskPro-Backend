const express = require('express');
const { body } = require('express-validator');
const commentController = require('../controllers/comment.controller');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.post(
  '/',
  auth,
  [body('content').notEmpty(), body('taskId').isInt(), validate],
  commentController.createComment
);

router.get('/task/:id', auth, commentController.listCommentsByTask);

module.exports = router;
