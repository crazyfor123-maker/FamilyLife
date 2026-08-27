// ===== 评论路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const commentService = require('../services/comment');

// POST /api/comments - 创建评论
router.post('/', authenticate, async (req, res) => {
  const { story_id, content, parent_comment_id } = req.body;

  if (!story_id || !content) {
    return res.status(400).json({ code: 1, message: '故事ID和内容不能为空' });
  }

  const comment = await commentService.createComment(story_id, req.user.user_id, content, parent_comment_id);
  res.json({ code: 0, data: comment });
});

// GET /api/comments - 获取评论列表（按 story_id 查询）
router.get('/', authenticate, async (req, res) => {
  const { story_id, person_id } = req.query;
  if (!story_id && !person_id) {
    return res.status(400).json({ code: 1, message: '请提供 story_id 或 person_id' });
  }
  const comments = await commentService.getCommentsByTarget(story_id || null, person_id || null);
  res.json({ code: 0, data: comments });
});

// GET /api/comments/:storyId - 获取评论列表
router.get('/:storyId', authenticate, async (req, res) => {
  const { storyId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const result = await commentService.getComments(storyId, page, pageSize);
  res.json({ code: 0, data: result });
});

// POST /api/comments/:commentId/like - 点赞评论
router.post('/:commentId/like', authenticate, async (req, res) => {
  const { commentId } = req.params;
  await commentService.likeComment(commentId);
  res.json({ code: 0, data: { success: true } });
});

// DELETE /api/comments/:commentId - 删除评论
router.delete('/:commentId', authenticate, async (req, res) => {
  const { commentId } = req.params;
  const result = await commentService.deleteComment(commentId, req.user.user_id);
  res.json({ code: result.success ? 0 : 1, data: result });
});

// POST /api/comments/:commentId/reply - 回复评论
router.post('/:commentId/reply', authenticate, async (req, res) => {
  const { commentId } = req.params;
  const { story_id, content } = req.body;

  if (!story_id || !content) {
    return res.status(400).json({ code: 1, message: '故事ID和内容不能为空' });
  }

  const reply = await commentService.replyComment(story_id, req.user.user_id, commentId, content);
  res.json({ code: 0, data: reply });
});

// GET /api/comments/:commentId/replies - 获取回复列表
router.get('/:commentId/replies', async (req, res) => {
  const { commentId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  const replies = await commentService.getReplies(commentId, page, pageSize);
  res.json({ code: 0, data: { replies, page, pageSize } });
});

module.exports = router;
