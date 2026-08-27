// ===== 协同编辑路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const collabService = require('../services/collab');

// POST /api/collab/create - 创建协同会话
router.post('/create', authenticate, async (req, res) => {
  const { book_id } = req.body;

  if (!book_id) {
    return res.status(400).json({ code: 1, message: '书籍ID不能为空' });
  }

  try {
    const session = await collabService.createSession(book_id, req.user.user_id);
    res.json({ code: 0, data: { session_id: session.id, book_id: session.bookId } });
  } catch (err) {
    res.json({ code: 1, message: err.message });
  }
});

// POST /api/collab/join - 加入协同会话
router.post('/join', authenticate, async (req, res) => {
  const { session_id, color } = req.body;

  if (!session_id) {
    return res.status(400).json({ code: 1, message: '会话ID不能为空' });
  }

  const result = await collabService.joinSession(session_id, req.user.user_id, color);
  res.json({ code: result.success ? 0 : 1, data: result });
});

// GET /api/collab/:sessionId/status - 会话状态
router.get('/:sessionId/status', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const status = collabService.getSessionStatus(sessionId);

  if (!status) {
    return res.status(404).json({ code: 1, message: '会话不存在' });
  }

  res.json({ code: 0, data: status });
});

// GET /api/collab/:sessionId/participants - 参与者列表
router.get('/:sessionId/participants', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const status = collabService.getSessionStatus(sessionId);

  if (!status) {
    return res.status(404).json({ code: 1, message: '会话不存在' });
  }

  res.json({ code: 0, data: { participants: status.participants } });
});

// POST /api/collab/:sessionId/leave - 离开会话
router.post('/:sessionId/leave', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  await collabService.leaveSession(sessionId, req.user.user_id);
  res.json({ code: 0, data: { success: true } });
});

// DELETE /api/collab/:sessionId - 关闭会话
router.delete('/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  await collabService.closeSession(sessionId);
  res.json({ code: 0, data: { success: true } });
});

// POST /api/collab/:sessionId/cursor - 更新光标位置
router.post('/:sessionId/cursor', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const { cursor, selection } = req.body;
  collabService.updateCursor(sessionId, req.user.user_id, cursor, selection);
  res.json({ code: 0, data: { success: true } });
});

// POST /api/collab/:sessionId/op - 发送操作
router.post('/:sessionId/op', authenticate, async (req, res) => {
  const { sessionId } = req.params;
  const { operation } = req.body;

  if (!operation) {
    return res.status(400).json({ code: 1, message: '操作内容不能为空' });
  }

  const result = collabService.applyOp(sessionId, req.user.user_id, operation);
  res.json({ code: result.success ? 0 : 1, data: result });
});

module.exports = router;
