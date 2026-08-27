// ===== F4.1 采访会话创建 & F4.7 断点续录 & F4.8 采访暂停-继续 & F4.9 采访结束 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, ERROR_CODES } = require('../utils/helpers');

// ===== 获取默认采访提纲（F4.6） =====
router.get('/outline/default', authenticate, async (req, res) => {
  const { personId } = req.query;
  // 返回通用采访提纲模板
  const defaultOutlines = [
    {
      id: 'outline_childhood',
      title: '童年回忆',
      category: '成长经历',
      questions: [
        '您能描述一下您的童年生活吗？',
        '您小时候住在哪里？是什么样的环境？',
        '您小时候最难忘的事情是什么？',
        '您的父母是如何教育您的？',
        '您小时候最喜欢玩什么？',
      ],
    },
    {
      id: 'outline_education',
      title: '求学经历',
      category: '教育成长',
      questions: [
        '您能讲讲您的求学经历吗？',
        '您上学时最喜欢的科目是什么？',
        '您遇到过什么难忘的老师？',
        '您当时为什么选择那所学校/专业？',
      ],
    },
    {
      id: 'outline_career',
      title: '工作生涯',
      category: '职业发展',
      questions: [
        '您第一份工作是什么？',
        '您职业生涯中最自豪的事情是什么？',
        '您在工作中遇到过最大的挑战是什么？',
        '您对工作有什么感悟？',
      ],
    },
    {
      id: 'outline_family',
      title: '家庭故事',
      category: '家庭生活',
      questions: [
        '您和配偶是怎么认识的？',
        '您觉得家庭对您最重要的影响是什么？',
        '您想对后代说些什么？',
      ],
    },
    {
      id: 'outline_life_wisdom',
      title: '人生智慧',
      category: '人生感悟',
      questions: [
        '您觉得人生最重要的事情是什么？',
        '您遇到过最大的挫折是什么？如何走出来的？',
        '您有什么人生经验想分享给后代？',
      ],
    },
  ];
  res.json({ code: 0, data: { outlines: defaultOutlines } });
});

// ===== 获取人物的采访列表 =====
router.get('/list/:personId', authenticate, async (req, res) => {
  const { personId } = req.params;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [person.space_id, req.user.user_id]
  );
  if (!spaceMember) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权访问' });
  }

  const sessions = await all(
    `SELECT s.*, p.name as person_name
     FROM interview_session s
     JOIN person_profile p ON s.person_id = p.person_id
     WHERE s.person_id = ?
     ORDER BY s.updated_at DESC`,
    [personId]
  );

  res.json({ code: 0, data: sessions });
});

// ===== 创建采访会话（F4.1） =====
router.post('/create', authenticate, async (req, res) => {
  const { person_id, space_id, outline_id, ai_mode, max_duration, tts_voice, tts_speed } = req.body;

  // 权限校验
  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [person_id]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [space_id, req.user.user_id]
  );
  if (!spaceMember) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '请先加入家族空间' });
  }

  // 普通成员仅可创建本人采访
  if (spaceMember.role === 'member' && person.is_self !== 1) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '普通成员仅可创建本人采访' });
  }

  const sessionId = generateToken();
  const duration = max_duration || 30;
  const mode = ai_mode || 'cloud';

  await run(
    `INSERT INTO interview_session (session_id, person_id, space_id, outline_id, ai_mode, status, max_duration, tts_voice, tts_speed)
     VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [sessionId, person_id, space_id, outline_id || null, mode, duration, tts_voice || null, tts_speed || 1.0]
  );

  res.json({
    code: 0,
    message: '采访会话创建成功',
    data: {
      session_id: sessionId,
      person_name: person.name,
      ai_mode: mode,
      max_duration: duration,
    },
  });
});

// ===== F4.12 双AI模式切换 =====
// 获取AI模式配置
router.get('/ai/config', authenticate, async (req, res) => {
  const { space_id } = req.query;

  // 检查本地AI模型可用性
  const localModelAvailable = process.env.LOCAL_AI_MODEL_PATH ? true : false;
  const localTtsAvailable = process.env.LOCAL_TTS_MODEL_PATH ? true : false;
  const localAsrAvailable = process.env.LOCAL_ASR_MODEL_PATH ? true : false;

  // 获取用户偏好模式
  const userPrefs = await get(
    'SELECT ai_mode_preference FROM user_account WHERE user_id = ?',
    [req.user.user_id]
  );

  // 检测本地模型状态
  const localModelStatus = localModelAvailable ? 'ready' : 'not_found';

  res.json({
    code: 0,
    data: {
      current_mode: userPrefs?.ai_mode_preference || 'cloud',
      cloud_available: true,
      local_available: localModelAvailable,
      local_model_status: localModelStatus,
      local_tts_available: localTtsAvailable,
      local_asr_available: localAsrAvailable,
      smart_mode_available: localModelAvailable && localTtsAvailable && localAsrAvailable,
    },
  });
});

// 切换AI模式
router.post('/ai/switch-mode', authenticate, async (req, res) => {
  const { ai_mode } = req.body;

  if (!['cloud', 'local', 'smart'].includes(ai_mode)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '无效的AI模式' });
  }

  if (ai_mode === 'local') {
    // 检查本地模型可用性
    if (!process.env.LOCAL_AI_MODEL_PATH) {
      return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '本地AI模型未安装，请先下载模型' });
    }
  }

  // 保存用户偏好
  await run(
    'UPDATE user_account SET ai_mode_preference = ? WHERE user_id = ?',
    [ai_mode, req.user.user_id]
  );

  res.json({
    code: 0,
    message: `已切换到${ai_mode === 'cloud' ? '云端' : ai_mode === 'local' ? '本地' : '智能混合'}AI模式`,
    data: { ai_mode },
  });
});

// 下载本地AI模型
router.post('/ai/download-model', authenticate, async (req, res) => {
  const { model_type } = req.body;

  if (!['llm', 'tts', 'asr', 'all'].includes(model_type)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '无效的模型类型' });
  }

  // ===== F4.13 Day 3: 实际模型下载逻辑 =====
  const modelPaths = {
    llm: '/models/interview-model.onnx',
    tts: '/models/tts-model.onnx',
    asr: '/models/asr-model.onnx',
  };

  const modelNames = {
    llm: 'LLM推理模型',
    tts: 'TTS语音合成模型',
    asr: 'ASR语音识别模型',
  };

  const model = model_type === 'all' ? 'llm' : model_type;
  const modelPath = modelPaths[model];

  // 检查模型文件是否存在
  const fs = require('fs');
  const path = require('path');
  const modelsDir = path.join(__dirname, '../../public/models');
  const fullPath = path.join(modelsDir, path.basename(modelPath));

  if (!fs.existsSync(fullPath)) {
    // 模型不存在，返回下载URL（模拟）
    return res.json({
      code: 0,
      message: `模型 ${modelNames[model]} 尚未上传，请联系管理员部署`,
      data: {
        download_url: `/api/interview/ai/model/download?type=${model_type}`,
        status: 'not_found',
        model_name: modelNames[model],
        note: '模型文件需要先上传到 public/models/ 目录',
      },
    });
  }

  // 模型存在，返回下载信息
  const stats = fs.statSync(fullPath);
  res.json({
    code: 0,
    message: `模型 ${modelNames[model]} 就绪`,
    data: {
      download_url: `/api/interview/ai/model/download?type=${model_type}`,
      status: 'ready',
      model_name: modelNames[model],
      file_size: stats.size,
      file_size_human: stats.size > 1048576
        ? (stats.size / 1048576).toFixed(1) + 'MB'
        : (stats.size / 1024).toFixed(0) + 'KB',
      model_path: modelPath,
    },
  });
});

// GET /api/interview/ai/model/download - 模型下载端点
router.get('/ai/model/download', authenticate, async (req, res) => {
  const { type } = req.query;

  const modelPaths = {
    llm: '/models/interview-model.onnx',
    tts: '/models/tts-model.onnx',
    asr: '/models/asr-model.onnx',
  };

  const model = type === 'all' ? 'llm' : type;
  const modelPath = modelPaths[model];
  const fullPath = path.join(__dirname, '../../public', modelPath);

  const fs = require('fs');
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ code: 1, message: '模型文件不存在' });
  }

  res.sendFile(fullPath);
});

// 获取智能混合模式配置
router.get('/ai/smart-config', authenticate, async (req, res) => {
  const { space_id } = req.query;

  res.json({
    code: 0,
    data: {
      enabled: process.env.SMART_AI_ENABLED === 'true',
      fallback_to_cloud: true, // 本地不可用时自动切换云端
      offline_enabled: process.env.LOCAL_AI_OFFLINE === 'true',
      data_storage: 'local', // 离线数据存储在本地
    },
  });
});

// ===== 获取采访会话详情 =====
router.get('/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  const session = await get('SELECT * FROM interview_session WHERE session_id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '采访会话不存在' });
  }

  // 检查权限
  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [session.person_id]);
  const spaceMember = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [person.space_id, req.user.user_id]
  );
  if (!spaceMember) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '无权访问' });
  }

  // 获取问答
  const qas = await all(
    'SELECT * FROM interview_qa WHERE session_id = ? ORDER BY sort_order',
    [sessionId]
  );

  res.json({ code: 0, data: { ...session, questions: qas } });
});

// ===== 开始采访（改为 in_progress） =====
router.post('/:sessionId/start', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  const session = await get('SELECT * FROM interview_session WHERE session_id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '采访会话不存在' });
  }

  await run("UPDATE interview_session SET status = 'in_progress', updated_at = NOW() WHERE session_id = ?", [sessionId]);
  res.json({ code: 0, message: '采访已开始' });
});

// ===== 暂停采访（F4.8） =====
router.post('/:sessionId/pause', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  const session = await get('SELECT * FROM interview_session WHERE session_id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '采访会话不存在' });
  }

  await run("UPDATE interview_session SET status = 'paused', updated_at = NOW() WHERE session_id = ?", [sessionId]);
  res.json({ code: 0, message: '采访已暂停' });
});

// ===== 继续采访（F4.8） =====
router.post('/:sessionId/resume', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  const session = await get('SELECT * FROM interview_session WHERE session_id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '采访会话不存在' });
  }

  await run("UPDATE interview_session SET status = 'in_progress', updated_at = NOW() WHERE session_id = ?", [sessionId]);
  res.json({ code: 0, message: '采访已继续' });
});

// ===== 断点续录（F4.7）- 获取用户的草稿会话 =====
router.get('/drafts/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  const drafts = await all(
    `SELECT s.*, p.name as person_name
     FROM interview_session s
     JOIN person_profile p ON s.person_id = p.person_id
     WHERE s.space_id = ? AND s.status IN ('draft', 'paused', 'in_progress')
     ORDER BY s.updated_at DESC`,
    [spaceId]
  );

  res.json({ code: 0, data: drafts });
});

// ===== 结束采访（F4.9） =====
router.post('/:sessionId/complete', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  const session = await get('SELECT * FROM interview_session WHERE session_id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '采访会话不存在' });
  }

  await run(
    "UPDATE interview_session SET status = 'completed', updated_at = NOW() WHERE session_id = ?",
    [sessionId]
  );

  // 统计问答数
  const qaCount = await get('SELECT COUNT(*) as count FROM interview_qa WHERE session_id = ?', [sessionId]);

  res.json({ code: 0, message: '采访已结束', data: { qa_count: qaCount.count } });
});

// ===== 删除采访会话 =====
router.delete('/:sessionId', authenticate, async (req, res) => {
  const { sessionId } = req.params;

  const session = await get('SELECT * FROM interview_session WHERE session_id = ?', [sessionId]);
  if (!session) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '采访会话不存在' });
  }

  // 仅可删除草稿或暂停的
  if (!['draft', 'paused'].includes(session.status)) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '仅可删除草稿或暂停的采访' });
  }

  await run('DELETE FROM interview_qa WHERE session_id = ?', [sessionId]);
  await run('DELETE FROM interview_session WHERE session_id = ?', [sessionId]);
  res.json({ code: 0, message: '采访已删除' });
});

module.exports = router;
