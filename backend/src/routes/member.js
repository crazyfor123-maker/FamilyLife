// ===== F1.7 成员邀请 & F1.8 成员加入 & F1.9 成员管理 & F1.10 分级权限体系 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { generateInviteToken, daysFromNow, ERROR_CODES } = require('../utils/helpers');

// ===== 获取空间成员列表 =====
router.get('/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const member = await get(
    'SELECT role, edit_scope FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权访问' });
  }

  // 支持按角色筛选（参数化，防SQL注入）
  let members;
  const memberParams = [spaceId];
  let roleFilter = '';
  let nameFilter = '';
  if (req.query.role) {
    roleFilter = ' AND sm.role = ?';
    memberParams.push(req.query.role);
  }
  if (req.query.name) {
    nameFilter = ' AND ua.nickname LIKE ?';
    memberParams.push(`%${req.query.name}%`);
  }

  members = await all(
    `SELECT sm.*, ua.phone, ua.nickname, ua.avatar,
            fs.space_name, fs.motto
     FROM space_member sm
     JOIN user_account ua ON sm.user_id = ua.user_id
     LEFT JOIN family_space fs ON sm.space_id = fs.space_id
     WHERE sm.space_id = ? ${roleFilter} ${nameFilter}
     ORDER BY
       CASE sm.role WHEN 'owner' THEN 1 WHEN 'editor' THEN 2 ELSE 3 END,
       sm.joined_at DESC`,
    memberParams
  );

  res.json({ code: 0, data: members });
});

// ===== 生成邀请（F1.7） =====
router.post('/:spaceId/invite', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  const { days = 7, preset_role = 'member' } = req.body;

  // 权限校验：仅 owner 可生成邀请
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member || member.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可生成邀请' });
  }

  const token = generateInviteToken();
  const expiresAt = days === -1 ? null : daysFromNow(days);

  await run(
    'INSERT INTO invitation (token, space_id, preset_role, max_uses, expires_at, created_by) VALUES (?, ?, ?, 10, ?, ?)',
    [token, spaceId, preset_role, expiresAt, req.user.user_id]
  );

  const inviteUrl = `https://family-life-record.app/invite/${token}`;

  res.json({
    code: 0,
    message: '邀请链接生成成功',
    data: {
      token,
      inviteUrl,
      expiresIn: days === -1 ? '永久' : `${days}天`,
      preset_role,
      maxUses: 10,
    },
  });
});

// ===== 作废邀请 =====
router.delete('/:spaceId/invite/:token', authenticate, async (req, res) => {
  const { spaceId, token } = req.params;

  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member || member.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可作废邀请' });
  }

  await run('UPDATE invitation SET status = "revoked" WHERE token = ? AND space_id = ?', [token, spaceId]);
  res.json({ code: 0, message: '邀请已作废' });
});

// ===== 通过邀请加入（F1.8） =====
router.post('/join', authenticate, async (req, res) => {
  const { inviteToken } = req.body;

  const invitation = await get(
    'SELECT * FROM invitation WHERE token = ? AND status = "active"',
    [inviteToken]
  );

  if (!invitation) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '邀请链接已失效' });
  }

  // 检查过期
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
  if (invitation.expires_at && invitation.expires_at <= nowStr) {
    await run('UPDATE invitation SET status = "expired" WHERE token = ?', [inviteToken]);
    return res.status(400).json({ code: ERROR_CODES.CODE_EXPIRED, message: '邀请链接已过期' });
  }

  // 检查使用次数
  if (invitation.used_count >= invitation.max_uses) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '邀请已达使用上限' });
  }

  // 检查是否已是成员
  const existing = await get(
    'SELECT * FROM space_member WHERE space_id = ? AND user_id = ?',
    [invitation.space_id, req.user.user_id]
  );
  if (existing) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '您已是该家族成员' });
  }

  // 加入
  await run(
    'INSERT INTO space_member (space_id, user_id, role) VALUES (?, ?, ?)',
    [invitation.space_id, req.user.user_id, invitation.preset_role]
  );

  // 更新使用次数
  await run('UPDATE invitation SET used_count = used_count + 1 WHERE token = ?', [inviteToken]);

  // 更新成员数
  await run('UPDATE family_space SET member_count = member_count + 1 WHERE space_id = ?', [invitation.space_id]);

  res.json({ code: 0, message: '加入成功', data: { space_id: invitation.space_id, role: invitation.preset_role } });
});

// ===== 移除成员（F1.9） =====
router.delete('/:spaceId/members/:userId', authenticate, async (req, res) => {
  const { spaceId, userId } = req.params;

  const admin = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可移除成员' });
  }

  // 不能移除自己
  if (userId === req.user.user_id) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '不能移除自己' });
  }

  // 不能移除创建者
  const space = await get('SELECT creator_id FROM family_space WHERE space_id = ?', [spaceId]);
  if (space && space.creator_id === userId) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '不能移除创建者' });
  }

  // 保留该成员的创作数据（采访、故事等），仅移除空间成员关系
  await run('DELETE FROM space_member WHERE space_id = ? AND user_id = ?', [spaceId, userId]);
  await run('UPDATE family_space SET member_count = MAX(1, member_count - 1) WHERE space_id = ?', [spaceId]);

  res.json({ code: 0, message: '成员已移除' });
});

// ===== 修改成员角色（F1.9） =====
router.put('/:spaceId/members/:userId/role', authenticate, async (req, res) => {
  const { spaceId, userId } = req.params;
  const { role, edit_scope } = req.body;

  if (!['member', 'editor'].includes(role)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '无效的角色' });
  }

  const admin = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可修改角色' });
  }

  // 不能修改创建者的角色
  const space = await get('SELECT creator_id FROM family_space WHERE space_id = ?', [spaceId]);
  if (space && space.creator_id === userId) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '创建者角色不可修改' });
  }

  // 编辑 scope
  let scopeVal = null;
  if (role === 'editor' && edit_scope) {
    scopeVal = JSON.stringify(edit_scope);
  }

  await run('UPDATE space_member SET role = ?, edit_scope = ? WHERE space_id = ? AND user_id = ?',
    [role, scopeVal, spaceId, userId]);
  res.json({ code: 0, message: '角色已更新' });
});

// ===== 管理员身份转让（F1.9） =====
router.post('/:spaceId/transfer-owner', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  const { targetUserId } = req.body;

  const admin = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!admin || admin.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可转让管理员身份' });
  }

  // 检查目标用户是否是成员
  const target = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, targetUserId]
  );
  if (!target) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '目标用户不是该家族成员' });
  }

  // 不能转让给自己
  if (targetUserId === req.user.user_id) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '不能转让给自己' });
  }

  // 执行转让：更新 creator_id + 角色互换
  await run('UPDATE family_space SET creator_id = ? WHERE space_id = ?', [targetUserId, spaceId]);
  await run('UPDATE space_member SET role = "owner" WHERE space_id = ? AND user_id = ?', [spaceId, targetUserId]);
  await run('UPDATE space_member SET role = "member" WHERE space_id = ? AND user_id = ?', [spaceId, req.user.user_id]);

  res.json({ code: 0, message: '管理员身份已转让' });
});

// ===== F1.10 权限校验中间件（按空间+角色） =====
// 获取用户在指定空间的完整权限信息
router.get('/:spaceId/permission', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const member = await get(
    'SELECT role, edit_scope FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  res.json({ code: 0, data: { role: member.role, edit_scope: member.edit_scope ? JSON.parse(member.edit_scope) : null } });
});

module.exports = router;
