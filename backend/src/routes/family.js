// ===== F1.3 家族空间管理 & F1.4 家族空间创建 & F1.5 家族空间切换 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, ERROR_CODES } = require('../utils/helpers');

// ===== 获取用户的家族空间列表 =====
router.get('/list', authenticate, async (req, res) => {
  const families = await all(
    `SELECT fs.*, sm.role, sm.edit_scope
     FROM family_space fs
     JOIN space_member sm ON fs.space_id = sm.space_id
     WHERE sm.user_id = ?
     ORDER BY fs.updated_at DESC`,
    [req.user.user_id]
  );

  res.json({ code: 0, data: families });
});

// ===== 创建家族空间（F1.4） =====
router.post('/create', authenticate, async (req, res) => {
  const { space_name, cover, motto, description, founding_year, origin } = req.body;

  // 校验
  if (!space_name || space_name.trim().length < 2 || space_name.trim().length > 20) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '家族名称需2-20个字符' });
  }

  const spaceId = generateToken();
  const userId = req.user.user_id;

  try {
    await run(
      'INSERT INTO family_space (space_id, space_name, creator_id, cover, motto, description, founding_year, origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [spaceId, space_name.trim(), userId, cover || null, motto || null, description || null, founding_year || null, origin || null]
    );

    // 创建者自动成为owner
    await run(
      'INSERT INTO space_member (space_id, user_id, role) VALUES (?, ?, ?)',
      [spaceId, userId, 'owner']
    );

    // 初始化空数据结构（人物档案）
    await run(
      'INSERT INTO person_profile (person_id, space_id, name, status, is_self) VALUES (?, ?, ?, ?, 0)',
      [generateToken(), spaceId, space_name.trim(), 'unknown']
    );

    res.json({
      code: 0,
      message: '家族空间创建成功',
      data: { space_id: spaceId, space_name: space_name.trim() },
    });
  } catch (err) {
    console.error('创建家族空间失败:', err);
    res.status(500).json({ code: ERROR_CODES.OPERATION_FAILED, message: '创建失败，请重试' });
  }
});

// ===== 获取空间详情 =====
router.get('/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const family = await get(
    `SELECT fs.*, sm.role, sm.edit_scope
     FROM family_space fs
     JOIN space_member sm ON fs.space_id = sm.space_id
     WHERE fs.space_id = ? AND sm.user_id = ?`,
    [spaceId, req.user.user_id]
  );

  if (!family) {
    return res.status(404).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权访问此家族空间' });
  }

  // 成员数
  const memberCount = await get(
    'SELECT COUNT(*) as count FROM space_member WHERE space_id = ?',
    [spaceId]
  );
  family.member_count = memberCount.count;

  // 世代数
  const generationCount = await get(
    'SELECT COUNT(DISTINCT generation) as count FROM person_profile WHERE space_id = ? AND generation IS NOT NULL',
    [spaceId]
  );
  family.generation = generationCount.count;

  res.json({ code: 0, data: family });
});

// ===== 更新空间信息 =====
router.put('/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  const { space_name, cover, motto, description, founding_year, origin } = req.body;

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member || member.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可修改空间信息' });
  }

  const updates = [];
  const params = [];
  if (space_name) { updates.push('space_name = ?'); params.push(space_name.trim()); }
  if (cover) { updates.push('cover = ?'); params.push(cover); }
  if (motto) { updates.push('motto = ?'); params.push(motto); }
  if (description) { updates.push('description = ?'); params.push(description); }
  if (founding_year) { updates.push('founding_year = ?'); params.push(founding_year); }
  if (origin) { updates.push('origin = ?'); params.push(origin); }

  if (updates.length === 0) return res.json({ code: 0, message: '无变更' });

  params.push(spaceId);
  await run(
    `UPDATE family_space SET ${updates.join(', ')}, updated_at = NOW() WHERE space_id = ?`,
    params
  );

  res.json({ code: 0, message: '更新成功' });
});

// ===== 删除空间 =====
router.delete('/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member || member.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可删除空间' });
  }

  // 级联删除（保留创作数据的关联，仅清理空间级关系）
  await run('DELETE FROM space_member WHERE space_id = ?', [spaceId]);
  // 清理关联的采访草稿
  await run("DELETE FROM interview_session WHERE space_id = ? AND status = 'draft'", [spaceId]);
  // 清理关联的人生之书草稿
  await run("DELETE FROM life_book WHERE space_id = ? AND status = 'draft'", [spaceId]);
  await run('DELETE FROM family_space WHERE space_id = ?', [spaceId]);

  res.json({ code: 0, message: '空间已删除' });
});

// ===== 切换当前空间 =====
router.post('/switch', authenticate, async (req, res) => {
  const { spaceId } = req.body;

  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(404).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该空间的成员' });
  }

  res.json({ code: 0, message: '空间切换成功', data: { space_id: spaceId, role: member.role } });
});

module.exports = router;
