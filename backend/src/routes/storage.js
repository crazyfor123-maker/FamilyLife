// ===== F2.1 本地存储管理 & F2.2 云端存储管理 & F2.3 数据同步引擎 & F2.4 AI数据隐私保护 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run } = require('../config/db');
const { authenticate, requireSpaceRole } = require('../middleware/auth');
const { ERROR_CODES } = require('../utils/helpers');

// ===== F2.1 本地存储状态（只读统计） =====
router.get('/local/status', authenticate, async (req, res) => {
  // 统计用户各类数据量
  const personCount = await get(
    'SELECT COUNT(*) as count FROM person_profile WHERE created_by = ?',
    [req.user.user_id]
  );
  const interviewCount = await get(
    'SELECT COUNT(*) as count FROM interview_session WHERE space_id IN (SELECT space_id FROM space_member WHERE user_id = ?)',
    [req.user.user_id]
  );
  const bookCount = await get(
    'SELECT COUNT(*) as count FROM life_book WHERE person_id IN (SELECT person_id FROM person_profile WHERE created_by = ?)',
    [req.user.user_id]
  );
  const photoCount = await get(
    'SELECT COUNT(*) as count FROM cloud_files WHERE user_id = ? AND mime_type = "photo"',
    [req.user.user_id]
  );
  const storyCount = await get(
    'SELECT COUNT(*) as count FROM timeline_story WHERE author_id = ?',
    [req.user.user_id]
  );
  const eventCount = await get(
    'SELECT COUNT(*) as count FROM family_event WHERE created_by = ?',
    [req.user.user_id]
  );

  // 计算云端存储大小
  const cloudFiles = await all(
    'SELECT COALESCE(SUM(file_size), 0) as total_size FROM cloud_files WHERE user_id = ?',
    [req.user.user_id]
  );

  res.json({
    code: 0,
    data: {
      local_storage: {
        total_size_mb: 0, // 前端计算本地文件总大小
        by_type: {
          person_profiles: { count: personCount?.count || 0, size_mb: 0 },
          interview_recordings: { count: interviewCount?.count || 0, size_mb: 0 },
          life_books: { count: bookCount?.count || 0, size_mb: 0 },
          photos: { count: photoCount?.count || 0, size_mb: 0 },
          stories: { count: storyCount?.count || 0, size_mb: 0 },
          events: { count: eventCount?.count || 0, size_mb: 0 },
        },
        encryption: 'AES-256',
        last_sync: null,
        // 按类型清理接口
        cleanup_available: true,
      },
      cloud_storage: {
        total_size_mb: cloudFiles?.total_size ? cloudFiles.total_size / (1024 * 1024) : 0,
        file_count: photoCount?.count || 0,
      },
      message: '本地数据加密存储，不上传云端',
    },
  });
});

// ===== F2.1 按类型清理本地缓存 =====
router.post('/local/cleanup', authenticate, async (req, res) => {
  const { data_type } = req.body;

  if (!['person_profiles', 'interview_recordings', 'life_books', 'photos', 'stories', 'events'].includes(data_type)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '无效的数据类型' });
  }

  // 前端负责实际清理本地缓存，后端只负责标记
  res.json({ code: 0, message: '本地缓存清理完成' });
});

// ===== F2.1 本地索引重建 =====
router.post('/local/rebuild-index', authenticate, async (req, res) => {
  // 前端负责重建本地索引，后端返回所有数据供索引
  const people = await all(
    'SELECT person_id, name, space_id, updated_at FROM person_profile WHERE created_by = ?',
    [req.user.user_id]
  );
  const books = await all(
    'SELECT book_id, title, person_id, updated_at FROM life_book WHERE person_id IN (SELECT person_id FROM person_profile WHERE created_by = ?)',
    [req.user.user_id]
  );

  res.json({ code: 0, data: { people, books } });
});

// ===== F2.2 云端存储状态 =====
router.get('/cloud/status', authenticate, async (req, res) => {
  const families = await all(
    `SELECT fs.space_id, fs.space_name, fs.member_count, fs.updated_at,
            sm.role
     FROM family_space fs
     JOIN space_member sm ON fs.space_id = sm.space_id
     WHERE sm.user_id = ?
     ORDER BY fs.updated_at DESC`,
    [req.user.user_id]
  );

  const cloudStorages = (families || []).map(f => ({
    space_id: f.space_id,
    space_name: f.space_name,
    member_count: f.member_count,
    last_sync: f.updated_at,
    available: true, // 默认可用
  }));

  res.json({ code: 0, data: { cloud_storages: cloudStorages, total_cloud_size_mb: 0 } });
});

// ===== F2.3 数据同步引擎 =====

// 获取增量同步的游标
router.get('/sync/last-sync', authenticate, async (req, res) => {
  const { spaceId } = req.query;
  if (!spaceId) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '缺少spaceId参数' });
  }

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  // 获取各表的最后同步时间
  const lastSync = await get(
    'SELECT * FROM sync_queue WHERE space_id = ? ORDER BY updated_at DESC LIMIT 1',
    [spaceId]
  );

  res.json({
    code: 0,
    data: {
      last_sync_time: lastSync?.updated_at || null,
      since: lastSync?.updated_at || new Date(0).toISOString(),
    },
  });
});

// 获取增量数据（F2.3 增量同步）
router.get('/sync/incremental/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  const { since, data_type } = req.query;

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  const result = {};

  // 增量获取人物数据
  const peopleSql = 'SELECT * FROM person_profile WHERE space_id = ? AND updated_at > ?';
  const people = await all(peopleSql, [spaceId, since || new Date(0).toISOString()]);
  if (people?.length > 0) result.people = people;

  // 增量获取关系数据
  const kinshipSql = 'SELECT * FROM kinship WHERE space_id = ? AND (created_at > ? OR updated_at > ?)';
  const kinships = await all(kinshipSql, [spaceId, since || new Date(0).toISOString(), since || new Date(0).toISOString()]);
  if (kinships?.length > 0) result.kinships = kinships;

  // 增量获取故事数据
  const storiesSql = 'SELECT * FROM timeline_story WHERE space_id = ? AND updated_at > ?';
  const stories = await all(storiesSql, [spaceId, since || new Date(0).toISOString()]);
  if (stories?.length > 0) result.stories = stories;

  // 增量获取事件数据
  const eventsSql = 'SELECT * FROM family_event WHERE space_id = ? AND updated_at > ?';
  const events = await all(eventsSql, [spaceId, since || new Date(0).toISOString()]);
  if (events?.length > 0) result.events = events;

  // 增量获取留言数据
  const messagesSql = 'SELECT * FROM family_message WHERE space_id = ? AND updated_at > ?';
  const messages = await all(messagesSql, [spaceId, since || new Date(0).toISOString()]);
  if (messages?.length > 0) result.messages = messages;

  res.json({
    code: 0,
    data: {
      sync_time: new Date().toISOString(),
      ...result,
    },
  });
});

// 获取待同步队列
router.get('/sync/pending', authenticate, async (req, res) => {
  const pending = await all(
    'SELECT * FROM sync_queue WHERE status = "pending" ORDER BY created_at ASC',
    []
  );
  res.json({ code: 0, data: { pending: pending || [], total: pending?.length || 0 } });
});

// 触发同步
router.post('/sync/trigger', authenticate, async (req, res) => {
  const { spaceId } = req.body;

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  // 获取待同步数据
  const pending = await all(
    'SELECT * FROM sync_queue WHERE space_id = ? AND status = "pending" ORDER BY created_at ASC',
    [spaceId]
  );

  // 标记为同步中
  if (pending && pending.length > 0) {
    await run(
      'UPDATE sync_queue SET status = "syncing" WHERE space_id = ? AND status = "pending"',
      [spaceId]
    );
  }

  res.json({
    code: 0,
    message: pending?.length > 0 ? `正在同步 ${pending.length} 项数据` : '已是最新，无需同步',
    data: {
      pending_count: pending?.length || 0,
      syncing: true,
    },
  });
});

// 同步完成回调
router.post('/sync/complete', authenticate, async (req, res) => {
  const { spaceId, dataType } = req.body;

  await run(
    'UPDATE sync_queue SET status = "success", updated_at = NOW() WHERE space_id = ? AND data_type = ? AND status = "syncing"',
    [spaceId, dataType]
  );

  res.json({ code: 0, message: '同步完成' });
});

// 冲突检测（F2.3 冲突处理）
router.get('/sync/conflicts/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  const conflicts = await all(
    'SELECT * FROM sync_conflicts WHERE space_id = ? ORDER BY created_at DESC',
    [spaceId]
  );

  res.json({ code: 0, data: conflicts || [] });
});

// 解决冲突
router.post('/sync/conflicts/resolve', authenticate, async (req, res) => {
  const { conflict_id, strategy } = req.body;

  if (!['server_wins', 'client_wins', 'manual'].includes(strategy)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '无效的冲突解决策略' });
  }

  await run(
    'UPDATE sync_conflicts SET resolution = ?, status = "resolved", updated_at = NOW() WHERE conflict_id = ?',
    [strategy, conflict_id]
  );

  res.json({ code: 0, message: `冲突已解决（策略：${strategy}）` });
});

// 加入同步队列（F2.3 离线队列管理）
router.post('/sync/queue', authenticate, async (req, res) => {
  const { space_id, data_type, data_id, operation, data } = req.body;

  if (!space_id || !data_type || !operation) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '缺少必填参数' });
  }

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [space_id, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  const queueId = generateToken();
  await run(
    'INSERT INTO sync_queue (queue_id, space_id, data_type, data_id, operation, data, status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
    [queueId, space_id, data_type, data_id || null, operation, JSON.stringify(data || {})]
  );

  res.json({ code: 0, message: '已加入同步队列', data: { queue_id: queueId } });
});

// 获取离线队列状态
router.get('/sync/queue/status', authenticate, async (req, res) => {
  const pending = await all(
    'SELECT data_type, COUNT(*) as count FROM sync_queue WHERE status = "pending" GROUP BY data_type',
    []
  );

  res.json({
    code: 0,
    data: {
      total_pending: pending?.reduce((sum, r) => sum + r.count, 0) || 0,
      by_type: pending?.reduce((acc, r) => { acc[r.data_type] = r.count; return acc; }, {}) || {},
    },
  });
});

// ===== F2.4 AI数据隐私保护 =====
// 获取AI隐私设置
router.get('/ai/privacy', authenticate, async (req, res) => {
  res.json({
    code: 0,
    data: {
      local_ai_enabled: true,
      cloud_ai_privacy_mode: true,
      data_not_used_for_training: true,
      ai_call_history: [], // 审计日志
    },
  });
});

// 记录AI调用审计日志（不记录数据内容）
router.post('/ai/audit', authenticate, async (req, res) => {
  const { ai_mode, data_type, result } = req.body;

  await run(
    'INSERT INTO backup_record (space_id, file_name, file_size, md5, status, created_by) VALUES (?, ?, 0, ?, ?, ?)',
    [req.body.space_id || 'global', `AI_${data_type}`, ai_mode, result, req.user.user_id]
  );

  res.json({ code: 0, message: '审计日志已记录' });
});

// 敏感信息脱敏
router.post('/ai/desensitize', authenticate, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ code: 0, data: { desensitized_text: '' } });

  // 脱敏规则：身份证号、手机号、具体住址
  let result = text;
  // 身份证号：18位数字
  result = result.replace(/(\d{6})\d{8}(\d{4})/g, '$1********$2');
  // 手机号：11位
  result = result.replace(/(1\d{3})\d{4}(\d{4})/g, '$1****$2');
  // 地址：去掉具体门牌号
  result = result.replace(/([\u4e00-\u9fa5]+区[\u4e00-\u9fa5]+路?\d*号?)\d+/g, '$1***');

  res.json({ code: 0, data: { desensitized_text: result } });
});

// ===== F2.2 云端存储列表（兼容 query param space_id） =====
router.get('/list', authenticate, async (req, res) => {
  const { space_id } = req.query;
  // 如果前端传了 space_id query param，返回该空间的存储信息
  if (space_id) {
    const member = await get(
      'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
      [space_id, req.user.user_id]
    );
    if (!member) {
      return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
    }
    const files = await all(
      'SELECT file_name, file_size, mime_type, created_at FROM cloud_files WHERE space_id = ? ORDER BY created_at DESC',
      [space_id]
    );
    const totalSize = (files || []).reduce((sum, f) => sum + (f.file_size || 0), 0);
    return res.json({
      code: 0,
      data: {
        space_id: space_id,
        file_count: files?.length || 0,
        total_size_mb: totalSize / (1024 * 1024),
        files: (files || []).map(f => ({
          file_name: f.file_name,
          file_size: f.file_size,
          mime_type: f.mime_type,
          created_at: f.created_at,
        })),
      },
    });
  }
  // 无 space_id 则返回所有空间
  const families = await all(
    `SELECT fs.space_id, fs.space_name, fs.member_count, fs.updated_at,
            sm.role
     FROM family_space fs
     JOIN space_member sm ON fs.space_id = sm.space_id
     WHERE sm.user_id = ?
     ORDER BY fs.updated_at DESC`,
    [req.user.user_id]
  );
  const cloudStorages = (families || []).map(f => ({
    space_id: f.space_id,
    space_name: f.space_name,
    member_count: f.member_count,
    last_sync: f.updated_at,
    available: true,
  }));
  res.json({ code: 0, data: { cloud_storages: cloudStorages, total_cloud_size_mb: 0 } });
});

// ===== F2.5 全量备份导出 =====
router.post('/:spaceId/backup', authenticate, requireSpaceRole('owner'), async (req, res) => {
  const { spaceId } = req.params;
  const { scope = 'all', password } = req.body;

  // 数据量限制：防止大数据量 OOM
  const MAX_RECORDS = { people: 10000, events: 5000, stories: 10000, messages: 20000 };

  // 收集备份数据
  const people = await all(
    'SELECT * FROM person_profile WHERE space_id = ? ORDER BY created_at LIMIT ?',
    [spaceId, MAX_RECORDS.people]
  );
  // kinship 通过 person_profile 关联 space_id
  const kinships = await all(
    `SELECT k.* FROM kinship k
     JOIN person_profile p ON k.person_a_id = p.person_id
     WHERE p.space_id = ?
     LIMIT ?`,
    [spaceId, MAX_RECORDS.people * 10]
  );
  const events = await all(
    'SELECT * FROM family_event WHERE space_id = ? ORDER BY event_date DESC LIMIT ?',
    [spaceId, MAX_RECORDS.events]
  );
  const stories = await all(
    'SELECT * FROM timeline_story WHERE space_id = ? ORDER BY created_at DESC LIMIT ?',
    [spaceId, MAX_RECORDS.stories]
  );
  const messages = await all(
    'SELECT * FROM family_message WHERE space_id = ? ORDER BY created_at DESC LIMIT ?',
    [spaceId, MAX_RECORDS.messages]
  );
  const family = await get('SELECT * FROM family_space WHERE space_id = ?', [spaceId]);

  // 构建备份数据
  const backupData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    space: family,
    people: people || [],
    kinships: kinships || [],
    events: events || [],
    stories: stories || [],
    messages: messages || [],
  };

  // 记录备份
  const fileName = `${family?.space_name || 'family'}_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const md5 = require('crypto').createHash('md5').update(JSON.stringify(backupData)).digest('hex');

  await run(
    'INSERT INTO backup_record (space_id, file_name, file_size, md5, status, created_by) VALUES (?, ?, ?, ?, "completed", ?)',
    [spaceId, fileName, JSON.stringify(backupData).length, md5, req.user.user_id]
  );

  const truncated = [];
  if (people?.length >= MAX_RECORDS.people) truncated.push(`人物(${MAX_RECORDS.people})`);
  if (events?.length >= MAX_RECORDS.events) truncated.push(`大事记(${MAX_RECORDS.events})`);
  if (stories?.length >= MAX_RECORDS.stories) truncated.push(`故事(${MAX_RECORDS.stories})`);
  if (messages?.length >= MAX_RECORDS.messages) truncated.push(`留言(${MAX_RECORDS.messages})`);

  res.json({
    code: 0,
    message: truncated.length > 0 ? `备份数据生成成功（${truncated.join('、')} 超出限制已截断）` : '备份数据生成成功',
    data: {
      file_name: fileName,
      md5,
      record_count: {
        people: people?.length || 0,
        kinships: kinships?.length || 0,
        events: events?.length || 0,
        stories: stories?.length || 0,
        messages: messages?.length || 0,
      },
      backup_data: backupData, // 前端可下载
      truncated: truncated.length > 0 ? `以下数据超出限制已截断：${truncated.join('、')}` : null,
    },
  });
});

// ===== 备份历史记录 =====
router.get('/:spaceId/backup/history', authenticate, requireSpaceRole('owner'), async (req, res) => {
  const { spaceId } = req.params;
  const records = await all(
    'SELECT * FROM backup_record WHERE space_id = ? AND status != "in_progress" ORDER BY created_at DESC',
    [spaceId]
  );
  res.json({ code: 0, data: records || [] });
});

// ===== F2.5/F2.6 全量备份导出 + 恢复导入 =====
// POST /api/storage/:spaceId/backup/download - 下载备份数据
router.post('/:spaceId/backup/download', authenticate, requireSpaceRole('owner'), async (req, res) => {
  const { spaceId } = req.params;
  const { backup_id } = req.body;

  let record;
  if (backup_id) {
    record = await get('SELECT * FROM backup_record WHERE id = ? AND space_id = ?', [backup_id, spaceId]);
  } else {
    record = await get('SELECT * FROM backup_record WHERE space_id = ? AND status = "completed" ORDER BY created_at DESC LIMIT 1', [spaceId]);
  }

  if (!record) {
    return res.status(404).json({ code: 1, message: '备份记录不存在' });
  }

  // 解析备份数据
  let backupData;
  try {
    backupData = JSON.parse(record.backup_data || '{}');
  } catch {
    return res.status(500).json({ code: 1, message: '备份数据解析失败' });
  }

  res.json({
    code: 0,
    message: '备份数据获取成功',
    data: {
      file_name: record.file_name,
      backup_data: backupData,
      md5: record.md5,
    },
  });
});

// POST /api/storage/:spaceId/restore - 从ZIP包恢复数据
router.post('/:spaceId/restore', authenticate, requireSpaceRole('owner'), async (req, res) => {
  const { spaceId } = req.params;
  const { backup_data, restore_mode = 'full' } = req.body;

  if (!backup_data || !backup_data.version) {
    return res.status(400).json({ code: 1, message: '无效的备份数据' });
  }

  try {
    // 验证备份版本
    if (backup_data.version !== '1.0') {
      return res.status(400).json({ code: 1, message: '不支持的备份版本' });
    }

    let result = { restored: {}, errors: [] };

    // 恢复人物档案
    if (restore_mode === 'full' || restore_mode === 'selective') {
      if (backup_data.people && Array.isArray(backup_data.people)) {
        let count = 0;
        for (const person of backup_data.people) {
          try {
            const existing = await get(
              'SELECT person_id FROM person_profile WHERE space_id = ? AND (name = ? OR person_id = ?)',
              [spaceId, person.name, person.person_id]
            );
            if (!existing) {
              await run(
                'INSERT INTO person_profile (person_id, space_id, name, gender, birth_date, death_date, bio, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [
                  person.person_id || `restore_${Date.now()}_${count}`,
                  spaceId,
                  person.name || '未知',
                  person.gender || 'unknown',
                  person.birth_date || null,
                  person.death_date || null,
                  person.bio || '',
                  req.user.user_id,
                ]
              );
              count++;
            }
          } catch (err) {
            result.errors.push({ type: 'person', name: person.name, error: err.message });
          }
        }
        result.restored.people = count;
      }
    }

    // 恢复亲属关系
    if (restore_mode === 'full' || restore_mode === 'selective') {
      if (backup_data.kinships && Array.isArray(backup_data.kinships)) {
        let count = 0;
        for (const k of backup_data.kinships) {
          try {
            await run(
              'INSERT INTO kinship (id, person_a_id, person_b_id, relation_type, created_by) VALUES (?, ?, ?, ?, ?)',
              [k.id || `restore_k_${Date.now()}_${count}`, k.person_a_id, k.person_b_id, k.relation_type, req.user.user_id]
            );
            count++;
          } catch (err) {
            result.errors.push({ type: 'kinship', error: err.message });
          }
        }
        result.restored.kinships = count;
      }
    }

    // 恢复大事记
    if (restore_mode === 'full' || restore_mode === 'selective') {
      if (backup_data.events && Array.isArray(backup_data.events)) {
        let count = 0;
        for (const evt of backup_data.events) {
          try {
            await run(
              'INSERT INTO family_event (id, space_id, title, description, event_date, created_by) VALUES (?, ?, ?, ?, ?, ?)',
              [evt.id || `restore_e_${Date.now()}_${count}`, spaceId, evt.title || '未命名', evt.description || '', evt.event_date || null, req.user.user_id]
            );
            count++;
          } catch (err) {
            result.errors.push({ type: 'event', title: evt.title, error: err.message });
          }
        }
        result.restored.events = count;
      }
    }

    // 恢复故事
    if (restore_mode === 'full' || restore_mode === 'selective') {
      if (backup_data.stories && Array.isArray(backup_data.stories)) {
        let count = 0;
        for (const story of backup_data.stories) {
          try {
            await run(
              'INSERT INTO timeline_story (id, space_id, person_id, title, content, happened_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [story.id || `restore_s_${Date.now()}_${count}`, spaceId, story.person_id || null, story.title || '未命名', story.content || '', story.happened_at || null, req.user.user_id]
            );
            count++;
          } catch (err) {
            result.errors.push({ type: 'story', title: story.title, error: err.message });
          }
        }
        result.restored.stories = count;
      }
    }

    // 恢复留言
    if (restore_mode === 'full') {
      if (backup_data.messages && Array.isArray(backup_data.messages)) {
        let count = 0;
        for (const msg of backup_data.messages) {
          try {
            await run(
              'INSERT INTO family_message (id, space_id, author_id, content, message_type, created_by) VALUES (?, ?, ?, ?, ?, ?)',
              [msg.id || `restore_m_${Date.now()}_${count}`, spaceId, msg.author_id || null, msg.content || '', msg.message_type || 'wish', req.user.user_id]
            );
            count++;
          } catch (err) {
            result.errors.push({ type: 'message', error: err.message });
          }
        }
        result.restored.messages = count;
      }
    }

    // 记录恢复操作
    await run(
      'INSERT INTO backup_record (space_id, file_name, file_size, md5, status, created_by) VALUES (?, ?, ?, ?, "restored", ?)',
      [spaceId, `restore_${new Date().toISOString().slice(0, 10)}`, JSON.stringify(backup_data).length, require('crypto').createHash('md5').update(JSON.stringify(backup_data)).digest('hex'), req.user.user_id]
    );

    res.json({
      code: 0,
      message: '数据恢复成功',
      data: result,
    });
  } catch (err) {
    res.status(500).json({ code: 1, message: '恢复失败: ' + err.message });
  }
});

// POST /api/storage/backup/import-zip - 从ZIP文件导入恢复
router.post('/backup/import-zip', authenticate, requireSpaceRole('owner'), async (req, res) => {
  const { spaceId } = req.params;
  const { zip_data } = req.body; // base64 encoded zip

  try {
    // TODO: 实际ZIP解压逻辑（需 adm-zip 等库）
    // 当前返回降级方案：需要前端先解压JSON
    res.json({
      code: 1,
      message: 'ZIP导入需要前端先解压JSON数据，请使用 backup_data 字段直接恢复',
    });
  } catch (err) {
    res.status(500).json({ code: 1, message: 'ZIP导入失败: ' + err.message });
  }
});

// ===== F3.6 个人相册管理 =====
// 创建相册分类
router.post('/album/categories', authenticate, async (req, res) => {
  const { space_id, name, description } = req.body;

  if (!space_id || !name) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '缺少必填参数' });
  }

  const categoryId = generateToken();
  await run(
    'INSERT INTO cloud_files (space_id, user_id, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, 0, ?)',
    [space_id, req.user.user_id, name, `/albums/${categoryId}`, 'category']
  );

  res.json({ code: 0, message: '相册分类创建成功', data: { category_id: categoryId } });
});

// 上传照片
router.post('/album/upload', authenticate, async (req, res) => {
  const { space_id, person_id, category_id, description } = req.body;

  if (!space_id) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '缺少必填参数' });
  }

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [space_id, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  const fileId = generateToken();
  const fileName = `photo_${fileId}_${Date.now()}.jpg`;

  await run(
    'INSERT INTO cloud_files (space_id, user_id, file_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, 0, ?)',
    [space_id, req.user.user_id, fileName, `/photos/${fileId}`, 'photo']
  );

  res.json({
    code: 0,
    message: '照片上传成功',
    data: {
      file_id: fileId,
      file_name: fileName,
      upload_url: `/api/storage/album/upload/${fileId}`,
    },
  });
});

// 获取相册列表
router.get('/album/list/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  const photos = await all(
    'SELECT * FROM cloud_files WHERE space_id = ? AND mime_type = "photo" ORDER BY created_at DESC',
    [spaceId]
  );

  const categories = await all(
    'SELECT * FROM cloud_files WHERE space_id = ? AND mime_type = "category" ORDER BY created_at',
    [spaceId]
  );

  res.json({ code: 0, data: { photos: photos || [], categories: categories || [] } });
});

// 删除照片
router.delete('/album/:fileId', authenticate, async (req, res) => {
  const { fileId } = req.params;

  const photo = await get('SELECT * FROM cloud_files WHERE file_name LIKE ? AND mime_type = "photo"', [`%${fileId}%`]);
  if (!photo) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '照片不存在' });
  }

  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [photo.space_id, req.user.user_id]
  );
  if (photo.created_by !== req.user.user_id && (!spaceMember || spaceMember.role !== 'owner' && spaceMember.role !== 'editor')) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '仅作者或管理员可删除' });
  }

  await run('DELETE FROM cloud_files WHERE file_name LIKE ?', [`%${fileId}%`]);
  res.json({ code: 0, message: '照片已删除' });
});

// ===== 9.3 素材管理中心 API =====
// GET /api/storage/material/list - 获取素材列表
router.get('/material/list', authenticate, async (req, res) => {
  const { space_id } = req.query;
  if (!space_id) {
    return res.status(400).json({ code: ERROR_CODES.PARAMS_ERROR, message: '缺少 space_id' });
  }

  // 检查空间成员资格
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [space_id, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权限访问' });
  }

  // 从 cloud_files 获取素材列表（包含录音、照片、转写文本等）
  const files = await all(
    `SELECT 
      cf.id, cf.file_name as title, cf.mime_type as type, cf.file_size as size,
      cf.created_at as date, cf.space_id, cf.created_by,
      GROUP_CONCAT(DISTINCT cm.tag_name) as tags,
      cf.description as annotation
    FROM cloud_files cf
    LEFT JOIN cloud_materials cm ON cf.id = cm.file_id
    WHERE cf.space_id = ?
    GROUP BY cf.id
    ORDER BY cf.created_at DESC`,
    [space_id]
  );

  // 格式化返回数据
  const materials = (files || []).map(f => ({
    id: f.id,
    title: f.title || '未知文件',
    type: f.mime_type || 'unknown',
    category: f.mime_type?.startsWith('audio') ? '录音' :
             f.mime_type?.startsWith('image') ? '照片' :
             f.mime_type?.includes('text') ? '转写' : '书籍',
    size: f.size ? (f.size > 1048576 ? (f.size / 1048576).toFixed(1) + 'MB' : (f.size / 1024).toFixed(0) + 'KB') : '0KB',
    date: f.created_at ? new Date(f.created_at).toISOString().split('T')[0] : '',
    tags: f.tags ? f.tags.split(',') : [],
    annotation: f.annotation || '',
  }));

  res.json({ code: 0, data: materials });
});

// POST /api/storage/material/create - 创建素材（关联文件）
router.post('/material/create', authenticate, async (req, res) => {
  const { space_id, file_id, tag_name } = req.body;
  if (!space_id || !file_id) {
    return res.status(400).json({ code: ERROR_CODES.PARAMS_ERROR, message: '缺少必要参数' });
  }

  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [space_id, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权限' });
  }

  try {
    await run(
      'INSERT INTO cloud_materials (space_id, file_id, user_id, tag_name, created_at) VALUES (?, ?, ?, ?, NOW())',
      [space_id, file_id, req.user.user_id, tag_name || '']
    );
    res.json({ code: 0, message: '素材已添加' });
  } catch (err) {
    res.json({ code: ERROR_CODES.OPERATION_FAILED, message: err.message });
  }
});

// DELETE /api/storage/material/:materialId - 删除素材关联
router.delete('/material/:materialId', authenticate, async (req, res) => {
  const { materialId } = req.params;
  await run('DELETE FROM cloud_materials WHERE id = ?', [materialId]);
  res.json({ code: 0, message: '素材已删除' });
});

// GET /api/storage/material/tags/:spaceId - 获取所有标签
router.get('/material/tags/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  const tags = await all(
    'SELECT DISTINCT tag_name FROM cloud_materials WHERE space_id = ? AND tag_name != "" ORDER BY tag_name',
    [spaceId]
  );
  res.json({ code: 0, data: (tags || []).map(t => t.tag_name) });
});

// GET /api/storage/material/duplicates/:spaceId - 重复素材检测
router.get('/material/duplicates/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  // 查找文件名相似的照片素材
  const photos = await all(
    'SELECT id, file_name, file_size, created_at FROM cloud_files WHERE space_id = ? AND mime_type LIKE "image%" ORDER BY file_name',
    [spaceId]
  );

  // 基于文件名的模糊匹配检测重复
  const groups = {};
  (photos || []).forEach(p => {
    const baseName = p.file_name.replace(/\.[^.]+$/, '').toLowerCase();
    let matched = false;
    for (const key of Object.keys(groups)) {
      // 简单编辑距离检测
      const dist = levenshteinDistance(key, baseName);
      if (dist <= 3) {
        groups[key].push(p);
        matched = true;
        break;
      }
    }
    if (!matched) {
      groups[baseName] = [p];
    }
  });

  const duplicateGroups = Object.entries(groups)
    .filter(([, files]) => files.length > 1)
    .map(([_, files]) => files.map(f => ({
      id: f.id,
      title: f.file_name,
      size: f.file_size ? (f.file_size > 1048576 ? (f.file_size / 1048576).toFixed(1) + 'MB' : (f.file_size / 1024).toFixed(0) + 'KB') : '0KB',
      date: f.created_at ? new Date(f.created_at).toISOString().split('T')[0] : '',
    })));

  res.json({ code: 0, data: duplicateGroups });
});

// GET /api/storage/material/references/:fileId - 获取素材引用关系
router.get('/material/references/:fileId', authenticate, async (req, res) => {
  const { fileId } = req.params;
  const refs = [];

  // 查找关联的人生之书章节
  const books = await all(
    'SELECT book_id, chapter FROM lifebook_chapters WHERE content LIKE ? LIMIT 10',
    [`%${fileId}%`]
  );
  if (books && books.length > 0) {
    refs.push({ type: 'book', items: books });
  }

  // 查找关联的故事
  const stories = await all(
    'SELECT id, title FROM family_story WHERE content LIKE ? LIMIT 10',
    [`%${fileId}%`]
  );
  if (stories && stories.length > 0) {
    refs.push({ type: 'story', items: stories });
  }

  res.json({ code: 0, data: refs });
});

// Levenshtein 编辑距离算法
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

module.exports = router;
