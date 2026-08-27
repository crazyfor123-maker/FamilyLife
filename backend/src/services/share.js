// ===== 书籍分享服务 =====
const { get, all, run } = require('../config/db');
const crypto = require('crypto');

/**
 * 生成分享链接
 */
async function generateShareLink(bookId, userId, options = {}) {
  const {
    maxViews = -1,
    expiresInDays = 30,
    permissions = { canView: true, canDownload: false, canComment: false },
  } = options;

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await run(
    'INSERT INTO book_shares (book_id, share_token, permissions, max_views, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [bookId, token, JSON.stringify(permissions), maxViews, expiresAt, userId]
  );

  return {
    share_url: `/share/${token}`,
    token,
    expires_at: expiresAt,
    permissions,
    max_views: maxViews,
  };
}

/**
 * 验证分享访问权限
 */
async function validateShareAccess(token, bookId) {
  const share = await get(
    'SELECT * FROM book_shares WHERE share_token = ? AND is_active = 1',
    [token]
  );

  if (!share) {
    return { valid: false, reason: '分享链接无效或已失效' };
  }

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { valid: false, reason: '分享链接已过期' };
  }

  if (share.max_views > 0) {
    const count = await get(
      'SELECT COUNT(*) as count FROM book_share_views WHERE share_token = ?',
      [token]
    );
    if (count.count >= share.max_views) {
      return { valid: false, reason: '访问次数已达上限' };
    }
  }

  // 获取书籍数据
  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId || share.book_id]);
  if (!book) {
    return { valid: false, reason: '书籍不存在' };
  }

  const permissions = JSON.parse(share.permissions || '{}');

  // 记录访问
  await run(
    'INSERT INTO book_share_views (share_token, book_id) VALUES (?, ?)',
    [token, bookId || share.book_id]
  );

  return {
    valid: true,
    permissions,
    book,
    share,
  };
}

/**
 * 获取分享统计
 */
async function getShareStats(token) {
  const views = await get(
    'SELECT COUNT(*) as count FROM book_share_views WHERE share_token = ?',
    [token]
  );

  const likes = await get(
    'SELECT COUNT(*) as count FROM book_share_likes WHERE share_token = ?',
    [token]
  );

  return {
    token,
    view_count: views?.count || 0,
    like_count: likes?.count || 0,
    unique_viewers: 0, // TODO: 实现去重统计
  };
}

/**
 * 取消分享
 */
async function revokeShare(token) {
  await run('UPDATE book_shares SET is_active = 0 WHERE share_token = ?', [token]);
  return { success: true };
}

/**
 * 更新分享权限
 */
async function updateSharePermissions(token, permissions) {
  await run(
    'UPDATE book_shares SET permissions = ?, updated_at = NOW() WHERE share_token = ?',
    [JSON.stringify(permissions), token]
  );
  return { success: true, permissions };
}

/**
 * 记录分享访问
 */
async function recordShareView(token, bookId) {
  await run(
    'INSERT INTO book_share_views (share_token, book_id) VALUES (?, ?)',
    [token, bookId]
  );
  return { success: true };
}

/**
 * 记录分享点赞
 */
async function recordShareLike(token, bookId) {
  await run(
    'INSERT INTO book_share_likes (share_token, book_id) VALUES (?, ?)',
    [token, bookId]
  );
  return { success: true };
}

/**
 * 更新书籍分享状态
 */
async function updateShare(bookId, userId, shareEnabled, permissions) {
  if (shareEnabled) {
    // 检查是否已有分享
    let existing = await get(
      'SELECT share_token FROM book_shares WHERE book_id = ? AND is_active = 1',
      [bookId]
    );
    if (!existing) {
      const token = require('crypto').randomBytes(16).toString('hex');
      await run(
        'INSERT INTO book_shares (book_id, share_token, permissions, is_active, created_by) VALUES (?, ?, ?, 1, ?)',
        [bookId, token, JSON.stringify(permissions || { canView: true, canDownload: false, canComment: false }), userId]
      );
      return { success: true, share_token: token, share_url: `/share/${token}` };
    }
    return { success: true, share_token: existing.share_token, share_url: `/share/${existing.share_token}` };
  } else {
    await run('UPDATE book_shares SET is_active = 0 WHERE book_id = ? AND is_active = 1', [bookId]);
    return { success: true, share_enabled: false };
  }
}

module.exports = {
  generateShareLink,
  validateShareAccess,
  getShareStats,
  revokeShare,
  updateSharePermissions,
  updateShare,
  recordShareView,
  recordShareLike,
};
