// ===== F6.1 时间墙浏览 & F6.2 故事发布 & F6.3 故事编辑 & F6.4 故事删除 & F6.5 故事互动 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, formatTime, ERROR_CODES } = require('../utils/helpers');

// ===== 获取时间墙故事列表（F6.1） =====
router.get('/list/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const stories = await all(
    `SELECT ts.*, ua.nickname as author_name, ua.avatar as author_avatar
     FROM timeline_story ts
     JOIN user_account ua ON ts.author_id = ua.user_id
     WHERE ts.space_id = ?
     ORDER BY ts.happened_at DESC, ts.created_at DESC`,
    [spaceId]
  );

  res.json({ code: 0, data: stories });
});

// ===== 发布故事（F6.2） =====
router.post('/publish', authenticate, async (req, res) => {
  const { space_id, title, content, story_type, happened_at, images } = req.body;

  if (!space_id) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请选择家族空间' });
  }
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请输入故事内容' });
  }
  if (title && title.trim().length > 0 && title.trim().length < 2) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '标题需至少2个字符' });
  }
  if (title && title.trim().length > 500) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '标题不能超过500个字符' });
  }

  const storyId = generateToken();
  const imagesJson = images ? JSON.stringify(images) : '[]';

  await run(
    'INSERT INTO timeline_story (story_id, space_id, author_id, title, content, story_type, happened_at, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [storyId, space_id, req.user.user_id, title || '', content, story_type || 'daily', happened_at || null, imagesJson]
  );

  res.json({ code: 0, message: '故事发布成功', data: { story_id: storyId } });
});

// ===== 编辑故事（F6.3） =====
router.put('/:storyId', authenticate, async (req, res) => {
  const { storyId } = req.params;
  const { title, content, story_type, happened_at, images } = req.body;

  const story = await get('SELECT * FROM timeline_story WHERE story_id = ?', [storyId]);
  if (!story) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '故事不存在' });
  }

  // 检查权限
  if (story.author_id !== req.user.user_id) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅作者可编辑' });
  }

  const updates = [];
  const params = [];
  if (title) { updates.push('title = ?'); params.push(title); }
  if (content) { updates.push('content = ?'); params.push(content); }
  if (story_type) { updates.push('story_type = ?'); params.push(story_type); }
  if (happened_at) { updates.push('happened_at = ?'); params.push(happened_at); }
  if (images) { updates.push('images = ?'); params.push(JSON.stringify(images)); }

  if (updates.length === 0) return res.json({ code: 0, message: '无变更' });

  params.push(storyId);
  await run(
    `UPDATE timeline_story SET ${updates.join(', ')}, updated_at = NOW() WHERE story_id = ?`,
    params
  );

  res.json({ code: 0, message: '故事已更新' });
});

// ===== 删除故事（F6.4） =====
router.delete('/:storyId', authenticate, async (req, res) => {
  const { storyId } = req.params;

  const story = await get('SELECT * FROM timeline_story WHERE story_id = ?', [storyId]);
  if (!story) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '故事不存在' });
  }

  // 作者或管理员可删除
  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [story.space_id, req.user.user_id]
  );
  if (story.author_id !== req.user.user_id && (!spaceMember || spaceMember.role !== 'owner' && spaceMember.role !== 'editor')) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅作者或管理员可删除' });
  }

  await run('DELETE FROM timeline_story WHERE story_id = ?', [storyId]);
  res.json({ code: 0, message: '故事已删除' });
});

// ===== 点赞（F6.5） =====
router.post('/:storyId/like', authenticate, async (req, res) => {
  const { storyId } = req.params;

  await run('UPDATE timeline_story SET likes = likes + 1 WHERE story_id = ?', [storyId]);
  res.json({ code: 0, message: '点赞成功' });
});

module.exports = router;
