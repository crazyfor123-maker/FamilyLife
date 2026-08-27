// ===== F3.1 人物档案创建 & F3.2 人物查看 & F3.3 人物档案编辑 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, ERROR_CODES } = require('../utils/helpers');

// ===== 获取空间内所有人物 =====
router.get('/list/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权访问' });
  }

  const persons = await all(
    `SELECT * FROM person_profile WHERE space_id = ? ORDER BY
      CASE WHEN is_self = 1 THEN 0 ELSE 1 END,
      generation ASC, birth_date ASC`,
    [spaceId]
  );

  res.json({ code: 0, data: persons });
});

// ===== 创建人物档案（F3.1） =====
router.post('/create', authenticate, async (req, res) => {
  const { space_id, name, gender, birth_date, death_date, status, generation, avatar, birth_place, residence, occupation, education, bio } = req.body;

  // 权限校验：普通成员仅可创建自己的档案
  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [space_id, req.user.user_id]
  );
  if (!spaceMember) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '请先加入家族空间' });
  }

  if (spaceMember.role === 'member') {
    // 检查是否本人
    const selfProfile = await get(
      'SELECT person_id FROM person_profile WHERE space_id = ? AND is_self = 1 AND space_id = ?',
      [space_id, req.user.user_id]
    );
    if (!selfProfile) {
      return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '请先创建本人档案' });
    }
  }

  // 必填校验
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '姓名需2-20个字符' });
  }
  if (!gender || !['male', 'female', 'other', 'unknown'].includes(gender)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请选择性别' });
  }

  // 日期校验
  if (birth_date && death_date && death_date < birth_date) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '逝世日期不能早于出生日期' });
  }
  if (birth_date && birth_date > new Date().toISOString().replace('T', ' ').slice(0, 10)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '出生日期不能晚于今天' });
  }

  const personId = generateToken();
  const isSelf = (status === 'self') ? 1 : 0;

  try {
    await run(
      `INSERT INTO person_profile (person_id, space_id, name, gender, birth_date, death_date, status, generation, avatar, birth_place, residence, occupation, education, bio, is_self, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [personId, space_id, name.trim(), gender, birth_date || null, death_date || null, status || 'unknown', generation || null, avatar || null, birth_place || null, residence || null, occupation || null, education || null, bio || null, isSelf, req.user.user_id]
    );

    // 初始化空数据结构
    await run(
      `INSERT INTO interview_session (session_id, person_id, space_id, status) VALUES (?, ?, ?, 'draft')`,
      [generateToken(), personId, space_id]
    );
    await run(
      `INSERT INTO life_book (book_id, person_id, space_id, status) VALUES (?, ?, ?, 'draft')`,
      [generateToken(), personId, space_id]
    );

    res.json({
      code: 0,
      message: '人物档案创建成功',
      data: { person_id: personId, name: name.trim() },
    });
  } catch (err) {
    console.error('创建人物失败:', err);
    res.status(500).json({ code: ERROR_CODES.OPERATION_FAILED, message: '创建失败，请重试' });
  }
});

// ===== 获取人物详情（F3.2） =====
router.get('/:personId', authenticate, async (req, res) => {
  const { personId } = req.params;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  // 检查权限
  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [person.space_id, req.user.user_id]
  );
  if (!spaceMember) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权访问' });
  }

  // 亲属关系
  const relations = await all(
    `SELECT k.*, pa.name as person_a_name, pb.name as person_b_name
     FROM kinship k
     LEFT JOIN person_profile pa ON k.person_a_id = pa.person_id
     LEFT JOIN person_profile pb ON k.person_b_id = pb.person_id
     WHERE k.person_a_id = ? OR k.person_b_id = ?
     AND k.status = 'active'`,
    [personId, personId]
  );

  // 采访会话数
  const interviewCount = await get(
    "SELECT COUNT(*) as count FROM interview_session WHERE person_id = ? AND status = 'completed'",
    [personId]
  );

  // 人生之书数
  const bookCount = await get(
    "SELECT COUNT(*) as count FROM life_book WHERE person_id = ? AND status != 'draft'",
    [personId]
  );

  res.json({
    code: 0,
    data: {
      ...person,
      relations,
      interview_count: interviewCount.count,
      book_count: bookCount.count,
    },
  });
});

// ===== 编辑人物档案（F3.3） =====
router.put('/:personId', authenticate, async (req, res) => {
  const { personId } = req.params;
  const updates = [];
  const params = [];

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  // 权限校验
  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [person.space_id, req.user.user_id]
  );
  if (!spaceMember) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权编辑' });
  }

  // 普通成员只能编辑自己的档案
  if (spaceMember.role === 'member' && person.is_self !== 1) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅可编辑自己的档案' });
  }

  const fields = ['name', 'gender', 'birth_date', 'death_date', 'status', 'generation', 'avatar', 'birth_place', 'residence', 'occupation', 'education', 'bio'];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }

  if (updates.length === 0) return res.json({ code: 0, message: '无变更' });

  params.push(personId);
  await run(
    `UPDATE person_profile SET ${updates.join(', ')}, updated_at = NOW() WHERE person_id = ?`,
    params
  );

  res.json({ code: 0, message: '更新成功' });
});

// ===== F3.9 个人家族寄语管理 =====
// 获取个人寄语
router.get('/:personId/messages', authenticate, async (req, res) => {
  const { personId } = req.params;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

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

// 发布个人寄语
router.post('/:personId/messages', authenticate, async (req, res) => {
  const { personId } = req.params;
  const { content, author } = req.body;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请输入寄语内容' });
  }

  const messageId = generateToken();
  await run(
    'INSERT INTO family_message (message_id, space_id, author_id, message_type, content, is_private) VALUES (?, ?, ?, ?, ?, ?)',
    [messageId, person.space_id, req.user.user_id, 'wish', content.trim(), 0]
  );

  res.json({ code: 0, message: '寄语发布成功', data: { message_id: messageId } });
});

// 删除个人寄语
router.delete('/:personId/messages/:messageId', authenticate, async (req, res) => {
  const { messageId } = req.params;

  const msg = await get('SELECT * FROM family_message WHERE message_id = ?', [messageId]);
  if (!msg) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '寄语不存在' });
  }

  if (msg.author_id !== req.user.user_id) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅作者可删除' });
  }

  await run('DELETE FROM family_message WHERE message_id = ?', [messageId]);
  res.json({ code: 0, message: '已删除' });
});

// ===== 删除人物 =====
router.delete('/:personId', authenticate, async (req, res) => {
  const { personId } = req.params;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [person.space_id, req.user.user_id]
  );
  if (!spaceMember || spaceMember.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可删除人物' });
  }

  // 级联删除关系
  await run('DELETE FROM kinship WHERE person_a_id = ? OR person_b_id = ?', [personId, personId]);
  await run('DELETE FROM person_profile WHERE person_id = ?', [personId]);

  res.json({ code: 0, message: '人物档案已删除' });
});

module.exports = router;
