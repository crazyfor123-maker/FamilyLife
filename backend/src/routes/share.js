// ===== 分享路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const shareService = require('../services/share');

// PUT /api/share/:bookId - 更新书籍分享状态
router.put('/:bookId', authenticate, async (req, res) => {
  const { bookId } = req.params;
  const { share_enabled, permissions } = req.body;
  await shareService.updateShare(bookId, req.user.user_id, share_enabled, permissions);
  res.json({ code: 0, data: { success: true, share_enabled, permissions } });
});

// POST /api/share/generate - 生成分享链接
router.post('/generate', authenticate, async (req, res) => {
  const { book_id, max_views, expires_in_days, permissions } = req.body;

  if (!book_id) {
    return res.status(400).json({ code: 1, message: '书籍ID不能为空' });
  }

  const result = await shareService.generateShareLink(book_id, req.user.user_id, {
    maxViews: max_views,
    expiresInDays: expires_in_days || 30,
    permissions: permissions || { canView: true, canDownload: false, canComment: false },
  });

  const shareDomain = process.env.SHARE_DOMAIN || 'https://family-life-record.com';
  res.json({ code: 0, data: { ...result, share_url: `${shareDomain}${result.share_url}` } });
});

// GET /api/share/:token - 获取分享页面数据
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  const result = await shareService.validateShareAccess(token, req.query.book_id);

  if (!result.valid) {
    return res.status(403).json({ code: 1, message: result.reason });
  }

  res.json({ code: 0, data: result });
});

// GET /api/share/:token/stats - 分享统计
router.get('/:token/stats', async (req, res) => {
  const { token } = req.params;
  const stats = await shareService.getShareStats(token);
  res.json({ code: 0, data: stats });
});

// PUT /api/share/:token/permissions - 更新权限
router.put('/:token/permissions', authenticate, async (req, res) => {
  const { token } = req.params;
  const { permissions } = req.body;

  await shareService.updateSharePermissions(token, permissions);
  res.json({ code: 0, data: { success: true, permissions } });
});

// DELETE /api/share/:token - 取消分享
router.delete('/:token', authenticate, async (req, res) => {
  const { token } = req.params;
  await shareService.revokeShare(token);
  res.json({ code: 0, data: { success: true } });
});

// POST /api/share/:token/view - 记录访问
router.post('/:token/view', async (req, res) => {
  const { token } = req.params;
  const { book_id } = req.body;
  await shareService.recordShareView(token, book_id);
  res.json({ code: 0, data: { success: true } });
});

// POST /api/share/:token/like - 点赞
router.post('/:token/like', async (req, res) => {
  const { token } = req.params;
  const { book_id } = req.body;
  await shareService.recordShareLike(token, book_id);
  res.json({ code: 0, data: { success: true } });
});

module.exports = router;
