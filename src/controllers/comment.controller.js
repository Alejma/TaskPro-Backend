const commentService = require('../services/comment.service');
const catchAsync = require('../utils/catchAsync');
const sendResponse = require('../utils/response');

const createComment = catchAsync(async (req, res) => {
  const payload = { ...req.body };
  if (req.file) payload.fileUrl = '/uploads/' + req.file.filename;
  const comment = await commentService.createComment(payload, req.user);
  return sendResponse(res, 201, 'Comentario creado', comment);
});

const listCommentsByTask = catchAsync(async (req, res) => {
  const comments = await commentService.listCommentsByTask(Number(req.params.id));
  return sendResponse(res, 200, 'Comentarios obtenidos', comments);
});

module.exports = { createComment, listCommentsByTask };
