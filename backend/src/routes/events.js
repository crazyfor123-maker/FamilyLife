// ===== F6.6 大事记创建 & F6.7 大事记浏览 & F6.8 大事记编辑 & F6.9 大事记删除 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, ERROR_CODES } = require('../utils/helpers');

// ===== 获取空间大事记列表（F6.7） =====
router.get('/list/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const events = await all(
    `SELECT fe.*, ua.nickname as author_name
     FROM family_event fe
     JOIN user_account ua ON fe.created_by = ua.user_id
     WHERE fe.space_id = ?
     ORDER BY fe.event_date ASC`,
    [spaceId]
  );

  res.json({ code: 0, data: events });
});

// ===== 创建大事记（F6.6） =====
router.post('/create', authenticate, async (req, res) => {
  const { space_id, title, event_type, event_date, description } = req.body;

  if (!space_id || !title || title.trim().length < 2) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请输入有效的大事件名称' });
  }

  const eventId = generateToken();
  await run(
    'INSERT INTO family_event (event_id, space_id, title, event_type, event_date, description, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [eventId, space_id, title.trim(), event_type || 'other', event_date || null, description || null, req.user.user_id]
  );

  res.json({ code: 0, message: '大事记创建成功', data: { event_id: eventId } });
});

// ===== 编辑大事记（F6.8） =====
router.put('/:eventId', authenticate, async (req, res) => {
  const { eventId } = req.params;
  const { title, event_type, event_date, description } = req.body;

  const event = await get('SELECT * FROM family_event WHERE event_id = ?', [eventId]);
  if (!event) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '事件不存在' });
  }

  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [event.space_id, req.user.user_id]
  );
  if (!spaceMember || (spaceMember.role !== 'owner' && spaceMember.role !== 'editor')) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅管理员和授权编辑可编辑' });
  }

  const updates = [];
  const params = [];
  if (title) { updates.push('title = ?'); params.push(title.trim()); }
  if (event_type) { updates.push('event_type = ?'); params.push(event_type); }
  if (event_date) { updates.push('event_date = ?'); params.push(event_date); }
  if (description) { updates.push('description = ?'); params.push(description); }

  if (updates.length === 0) return res.json({ code: 0, message: '无变更' });

  // ===== F6.8 修订历史：保存旧版本 =====
  const oldVersion = { ...event };
  delete oldVersion.event_id;
  params.push(eventId);

  // 保存修订记录
  try {
    await run(
      `INSERT INTO event_revision (event_id, old_data, new_data, changed_by, changed_at, change_summary)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [eventId, JSON.stringify(oldVersion), JSON.stringify({ title, event_type, event_date, description }), req.user.user_id, JSON.stringify({ fields: updates.map(u => u.split(' = ')[0]) })]
    );
  } catch (err) {
    console.warn('保存修订记录失败:', err);
    // 不阻断主流程
  }

  params.push(eventId);
  await run(
    `UPDATE family_event SET ${updates.join(', ')}, updated_at = NOW() WHERE event_id = ?`,
    params
  );

  res.json({ code: 0, message: '大事记已更新' });
});

// ===== 删除大事记（F6.9） =====
router.delete('/:eventId', authenticate, async (req, res) => {
  const { eventId } = req.params;

  const event = await get('SELECT * FROM family_event WHERE event_id = ?', [eventId]);
  if (!event) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '事件不存在' });
  }

  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [event.space_id, req.user.user_id]
  );
  if (!spaceMember || spaceMember.role !== 'owner') {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅创建者可删除' });
  }

  // ===== F6.9 级联删除确认：删除关联留言 =====
  const cascadeInfo = {};

  // 1. 删除关联故事
  const stories = await all('SELECT id FROM timeline_story WHERE event_id = ?', [eventId]);
  cascadeInfo.stories = stories?.length || 0;
  await run('DELETE FROM timeline_story WHERE event_id = ?', [eventId]);

  // 2. 删除关联素材
  const materials = await all('SELECT id FROM family_material WHERE event_id = ?', [eventId]);
  cascadeInfo.materials = materials?.length || 0;
  await run('DELETE FROM family_material WHERE event_id = ?', [eventId]);

  // 3. ===== 级联删除关联留言 =====
  const messages = await all(
    `SELECT id FROM family_message WHERE event_id = ? OR related_event_id = ?`,
    [eventId, eventId]
  );
  cascadeInfo.messages = messages?.length || 0;
  if (messages && messages.length > 0) {
    const ids = messages.map(m => m.id).join(',');
    await run(`DELETE FROM family_message WHERE id IN (${ids})`);
    // 级联删除回复
    await run(`DELETE FROM family_message WHERE parent_id IN (${ids})`);
  }

  // 4. 删除事件本身
  await run('DELETE FROM family_event WHERE event_id = ?', [eventId]);

  res.json({ code: 0, message: '大事记已删除', cascade_info: cascadeInfo });
});

// ===== F6.8 获取修订历史 =====
router.get('/:eventId/revisions', authenticate, async (req, res) => {
  const { eventId } = req.params;

  const revisions = await all(
    `SELECT er.*, ua.nickname as changer_name
     FROM event_revision er
     LEFT JOIN user_account ua ON er.changed_by = ua.user_id
     WHERE er.event_id = ?
     ORDER BY er.changed_at DESC`,
    [eventId]
  );

  // 解析 JSON 字段
  const parsed = (revisions || []).map(r => ({
    id: r.id,
    event_id: r.event_id,
    old_data: JSON.parse(r.old_data || '{}'),
    new_data: JSON.parse(r.new_data || '{}'),
    change_summary: JSON.parse(r.change_summary || '{}'),
    changed_by: r.changed_by,
    changed_by_name: r.changer_name || '',
    changed_at: r.changed_at,
  }));

  res.json({ code: 0, data: parsed });
});

// ===== F6.8 获取差异对比 =====
router.get('/:eventId/diff/:revisionId', authenticate, async (req, res) => {
  const { eventId, revisionId } = req.params;

  const revision = await get('SELECT * FROM event_revision WHERE id = ?', [revisionId]);
  if (!revision) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '修订记录不存在' });
  }

  const oldData = JSON.parse(revision.old_data || '{}');
  const newData = JSON.parse(revision.new_data || '{}');

  // 计算差异
  const diffs = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  for (const key of allKeys) {
    if (oldData[key] !== newData[key]) {
      diffs.push({
        field: key,
        old_value: oldData[key] ?? null,
        new_value: newData[key] ?? null,
        changed: true,
      });
    }
  }

  res.json({ code: 0, data: { diffs, revision } });
});

module.exports = router;
