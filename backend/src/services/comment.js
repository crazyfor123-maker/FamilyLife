// ===== 评论服务 =====
const { get, all, run } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * 创建评论
 */
async function createComment(storyId, authorId, content, parentCommentId = null) {
  const commentId = uuidv4();
  await run(
    'INSERT INTO story_comments (id, story_id, author_id, parent_comment_id, content) VALUES (?, ?, ?, ?, ?)',
    [commentId, storyId, authorId, parentCommentId, content]
  );
  return { id: commentId, story_id: storyId, author_id: authorId, content, created_at: new Date().toISOString() };
}

/**
 * 获取评论列表（按 story_id）
 */
async function getComments(storyId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const comments = await all(
    `SELECT sc.*, ua.nickname as author_name, ua.avatar as author_avatar,
            (SELECT COUNT(*) FROM story_comments WHERE parent_comment_id = sc.id) as reply_count
     FROM story_comments sc
     JOIN user_account ua ON sc.author_id = ua.user_id
     WHERE sc.story_id = ? AND sc.status = 'active'
     ORDER BY sc.created_at ASC
     LIMIT ? OFFSET ?`,
    [storyId, pageSize, offset]
  );

  const total = await get(
    'SELECT COUNT(*) as count FROM story_comments WHERE story_id = ? AND status = "active"',
    [storyId]
  );

  return {
    comments,
    total: total?.count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((total?.count || 0) / pageSize),
  };
}

/**
 * 获取评论列表（按 story_id 或 person_id）
 */
async function getCommentsByTarget(storyId, personId) {
  let comments;
  if (storyId) {
    comments = await all(
      `SELECT sc.*, ua.nickname as author_name, ua.avatar as author_avatar,
              (SELECT COUNT(*) FROM story_comments WHERE parent_comment_id = sc.id) as reply_count
       FROM story_comments sc
       JOIN user_account ua ON sc.author_id = ua.user_id
       WHERE sc.story_id = ? AND sc.status = 'active'
       ORDER BY sc.created_at ASC`,
      [storyId]
    );
  } else if (personId) {
    comments = await all(
      `SELECT sc.*, ua.nickname as author_name, ua.avatar as author_avatar,
              (SELECT COUNT(*) FROM story_comments WHERE parent_comment_id = sc.id) as reply_count
       FROM story_comments sc
       JOIN user_account ua ON sc.author_id = ua.user_id
       WHERE sc.person_id = ? AND sc.status = 'active'
       ORDER BY sc.created_at ASC`,
      [personId]
    );
  }
  return comments || [];
}

/**
 * 点赞评论
 */
async function likeComment(commentId) {
  await run('UPDATE story_comments SET likes = likes + 1 WHERE id = ?', [commentId]);
  return { success: true };
}

/**
 * 删除评论
 */
async function deleteComment(commentId, userId) {
  const comment = await get('SELECT * FROM story_comments WHERE id = ?', [commentId]);
  if (!comment) return { success: false, error: '评论不存在' };

  if (comment.author_id !== userId) {
    return { success: false, error: '无权删除此评论' };
  }

  await run('UPDATE story_comments SET status = "deleted" WHERE id = ?', [commentId]);
  return { success: true };
}

/**
 * 获取回复列表
 */
async function getReplies(parentCommentId, page = 1, pageSize = 20) {
  const offset = (page - 1) * pageSize;
  const replies = await all(
    `SELECT sc.*, ua.nickname as author_name, ua.avatar as author_avatar
     FROM story_comments sc
     JOIN user_account ua ON sc.author_id = ua.user_id
     WHERE sc.parent_comment_id = ? AND sc.status = 'active'
     ORDER BY sc.created_at ASC
     LIMIT ? OFFSET ?`,
    [parentCommentId, pageSize, offset]
  );
  return replies;
}

/**
 * 回复评论
 */
async function replyComment(storyId, authorId, parentCommentId, content) {
  return createComment(storyId, authorId, content, parentCommentId);
}

module.exports = {
  createComment,
  getComments,
  getCommentsByTarget,
  likeComment,
  deleteComment,
  getReplies,
  replyComment,
};
