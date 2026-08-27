// ===== F6.10 留言发布 & F6.11 留言浏览与回复 & F6.12 留言删除 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, ERROR_CODES } = require('../utils/helpers');

// ===== 获取留言板消息列表 =====
router.get('/list/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const messages = await all(
    `SELECT fm.*, ua.nickname as author_name, ua.avatar as author_avatar
     FROM family_message fm
     JOIN user_account ua ON fm.author_id = ua.user_id
     WHERE fm.space_id = ?
     ORDER BY fm.created_at DESC`,
    [spaceId]
  );

  // 获取回复
  for (const msg of messages) {
    msg.replies = await all(
      `SELECT fm2.*, ua.nickname as author_name, ua.avatar as author_avatar
       FROM family_message fm2
       JOIN user_account ua ON fm2.author_id = ua.user_id
       WHERE fm2.parent_id = ?
       ORDER BY fm2.created_at ASC`,
      [msg.message_id]
    );
  }

  res.json({ code: 0, data: messages });
});

// ===== 发布留言（F6.10） =====
router.post('/publish', authenticate, async (req, res) => {
  const { space_id, content, message_type, audio_url, is_private, parent_id } = req.body;

  if (!space_id) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请选择家族空间' });
  }
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请输入留言内容' });
  }
  if (content.length > 5000) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '留言内容不能超过5000个字符' });
  }

  const messageId = generateToken();
  await run(
    'INSERT INTO family_message (message_id, space_id, author_id, message_type, content, audio_url, is_private, parent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [messageId, space_id, req.user.user_id, message_type || 'daily', content, audio_url || null, is_private || 0, parent_id || null]
  );

  res.json({ code: 0, message: '留言发布成功', data: { message_id: messageId } });
});

// ===== 点赞留言 =====
router.post('/:messageId/like', authenticate, async (req, res) => {
  const { messageId } = req.params;
  await run('UPDATE family_message SET likes = likes + 1 WHERE message_id = ?', [messageId]);
  res.json({ code: 0, message: '点赞成功' });
});

// ===== 删除留言（F6.12） =====
router.delete('/:messageId', authenticate, async (req, res) => {
  const { messageId } = req.params;

  const msg = await get('SELECT * FROM family_message WHERE message_id = ?', [messageId]);
  if (!msg) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '留言不存在' });
  }

  // 作者或管理员可删除
  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [msg.space_id, req.user.user_id]
  );
  if (msg.author_id !== req.user.user_id && (!spaceMember || spaceMember.role !== 'owner' && spaceMember.role !== 'editor')) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅作者或管理员可删除' });
  }

  // F6.12 级联删除：删除回复留言
  await run('DELETE FROM family_message WHERE parent_id = ?', [messageId]);
  await run('DELETE FROM family_message WHERE message_id = ?', [messageId]);
  res.json({ code: 0, message: '留言已删除' });
});

// ===== F3.9 个人家族寄语管理 =====
// 获取个人寄语
router.get('/wishes/person/:personId', authenticate, async (req, res) => {
  const { personId } = req.params;

  const wishes = await all(
    `SELECT fm.*, ua.nickname as author_name, ua.avatar as author_avatar,
            pp.name as target_name
     FROM family_message fm
     JOIN user_account ua ON fm.author_id = ua.user_id
     JOIN person_profile pp ON fm.space_id IN (SELECT space_id FROM person_profile WHERE person_id = ?)
     WHERE fm.space_id IN (SELECT space_id FROM person_profile WHERE person_id = ?)
       AND fm.message_type = 'wish'
     ORDER BY fm.created_at DESC`,
    [personId, personId]
  );

  res.json({ code: 0, data: wishes || [] });
});

// 获取家族寄语列表（公开）
router.get('/wishes/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const wishes = await all(
    `SELECT fm.*, ua.nickname as author_name, ua.avatar as author_avatar
     FROM family_message fm
     JOIN user_account ua ON fm.author_id = ua.user_id
     WHERE fm.space_id = ? AND fm.is_private = 0
     ORDER BY fm.created_at DESC`,
    [spaceId]
  );

  // 获取精选寄语
  const highlighted = wishes.slice(0, 3);

  res.json({ code: 0, data: { messages: wishes, highlighted } });
});

// ===== 发布家族寄语 =====
router.post('/wish', authenticate, async (req, res) => {
  const { space_id, content, message_type, wish_type, is_private } = req.body;

  if (!space_id) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请选择家族空间' });
  }
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请输入寄语内容' });
  }
  if (content.length > 5000) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '寄语内容不能超过5000个字符' });
  }

  const messageId = generateToken();
  await run(
    'INSERT INTO family_message (message_id, space_id, author_id, message_type, wish_type, content, is_private) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [messageId, space_id, req.user.user_id, wish_type || 'daily', wish_type || 'daily', content, is_private || 0]
  );

  res.json({ code: 0, message: '寄语发布成功', data: { message_id: messageId } });
});

// ===== 获取精选寄语 =====
router.get('/wishes/highlight/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const highlighted = await all(
    `SELECT fm.*, ua.nickname as author_name, ua.avatar as author_avatar
     FROM family_message fm
     JOIN user_account ua ON fm.author_id = ua.user_id
     WHERE fm.space_id = ? AND fm.is_private = 0
     ORDER BY fm.likes DESC
     LIMIT 3`,
    [spaceId]
  );

  res.json({ code: 0, data: highlighted });
});

module.exports = router;
