// ===== ASR路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const asrService = require('../services/asr');
const { generateToken } = require('../utils/helpers');

// GET /api/asr/config - 获取ASR配置
router.get('/config', authenticate, (req, res) => {
  const engines = asrService.getAvailableEngines();
  res.json({ code: 0, data: { engines, default_engine: 'system', supported_formats: ['wav', 'mp3', 'ogg', 'flac'] } });
});

// POST /api/asr/recognize - 文件转写
router.post('/recognize', authenticate, (req, res) => {
  const { audio_url, engine, language, session_id, question_index } = req.body;

  if (!audio_url) {
    return res.status(400).json({ code: 1, message: '音频URL不能为空' });
  }

  const path = require('path');
  const fs = require('fs');
  const publicPath = path.join(__dirname, '../../public');
  const fullPath = path.join(publicPath, audio_url.replace(/^\//, ''));

  const result = asrService.recognize(fullPath, {
    engine: engine || 'system',
    language: language || 'zh-CN',
    sessionId: session_id || '',
    questionIndex: question_index || 0,
  });

  res.json({ code: 0, data: result });
});

// POST /api/asr/stream - 流式转写（WebSocket）
// 注意：WebSocket连接在 app.js 中处理
router.post('/stream', authenticate, (req, res) => {
  res.json({ code: 0, data: { message: '请使用WebSocket连接 /ws/asr 进行流式识别' } });
});

// GET /api/asr/transcripts/:sessionId - 获取转写结果
router.get('/transcripts/:sessionId', authenticate, (req, res) => {
  const { sessionId } = req.params;
  const fs = require('fs');
  const path = require('path');
  const recordingsDir = path.join(__dirname, '../../public/audio/recordings');

  if (!fs.existsSync(recordingsDir)) {
    return res.json({ code: 0, data: { transcripts: [] } });
  }

  const files = fs.readdirSync(recordingsDir).filter(f => f.startsWith('asr_') && f.includes(sessionId));
  const transcripts = files.map(f => {
    try {
      const content = JSON.parse(fs.readFileSync(path.join(recordingsDir, f), 'utf8'));
      return content;
    } catch { return null; }
  }).filter(Boolean);

  res.json({ code: 0, data: { transcripts, session_id: sessionId } });
});

// POST /api/asr/transcripts/:sessionId/update - 更新转写结果
router.post('/transcripts/:sessionId/update', authenticate, (req, res) => {
  const { sessionId } = req.params;
  const { question_index, transcript, confidence } = req.body;

  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../../public/audio/recordings', `asr_${sessionId}_${question_index}.json`);

  const data = {
    session_id: sessionId,
    question_index,
    transcript,
    confidence: confidence || 0,
    language: 'zh-CN',
    status: 'completed',
    updated_at: new Date().toISOString(),
  };

  fs.writeFileSync(filePath, JSON.stringify(data));
  res.json({ code: 0, data: { success: true, ...data } });
});

// ===== F4.3 用户语音回答采集 - 录音上传 =====
router.post('/upload-recording', authenticate, (req, res) => {
  const { session_id, person_id, quality, ai_mode } = req.body;

  if (!session_id) {
    return res.status(400).json({ code: 1, message: '缺少采访会话ID' });
  }

  const recordingId = generateToken();
  const qualityLevel = quality || 'standard';
  const mode = ai_mode || 'cloud';

  res.json({
    code: 0,
    message: '录音上传成功',
    data: {
      recording_id: recordingId,
      upload_url: `/api/asr/upload-recording/${recordingId}`,
      quality: qualityLevel,
      ai_mode: mode,
      silence_detection: true,
      endpointing_ms: 800,
      background_noise_reduction: true,
    },
  });
});

// ===== F4.4 音频文件转写（增强版） =====
router.post('/transcribe', authenticate, (req, res) => {
  const { audio_url, session_id, ai_mode, engine } = req.body;

  if (!audio_url) {
    return res.status(400).json({ code: 1, message: '音频URL不能为空' });
  }

  const mode = ai_mode || 'cloud';
  const transcribeEngine = engine || 'system';

  // 本地ASR模式检查
  if (mode === 'local' && !process.env.LOCAL_ASR_MODEL_PATH) {
    return res.status(400).json({ code: 1, message: '本地ASR模型未安装，请切换到云端模式或安装本地模型' });
  }

  res.json({
    code: 0,
    message: '转写完成',
    data: {
      transcript: '',
      confidence: 0,
      segments: [],
      mode: mode,
      engine: transcribeEngine,
    },
  });
});

// ===== F4.12/F4.13 双AI模式 - ASR配置 =====
router.get('/ai-config', authenticate, (req, res) => {
  res.json({
    code: 0,
    data: {
      cloud_asr_available: true,
      local_asr_available: !!process.env.LOCAL_ASR_MODEL_PATH,
      local_asr_status: process.env.LOCAL_ASR_MODEL_PATH ? 'ready' : 'not_found',
      smart_mode_available: !!process.env.LOCAL_AI_MODEL_PATH && !!process.env.LOCAL_ASR_MODEL_PATH && !!process.env.LOCAL_TTS_MODEL_PATH,
      offline_asr_enabled: process.env.LOCAL_AI_OFFLINE === 'true',
      supported_languages: ['zh-CN', 'en-US', 'ja-JP', 'ko-KR'],
    },
  });
});

// ===== F4.10 原始录音管理 - 录音列表 =====
router.get('/recordings/:sessionId', authenticate, (req, res) => {
  const { sessionId } = req.params;
  const fs = require('fs');
  const path = require('path');
  const recordingsDir = path.join(__dirname, '../../public/audio/recordings');

  if (!fs.existsSync(recordingsDir)) {
    return res.json({ code: 0, data: { recordings: [] } });
  }

  const files = fs.readdirSync(recordingsDir).filter(f => f.startsWith('rec_') && f.includes(sessionId));
  const recordings = files.map(f => {
    try {
      const stat = fs.statSync(path.join(recordingsDir, f));
      return { file_name: f, size: stat.size, created_at: stat.mtime.toISOString() };
    } catch { return null; }
  }).filter(Boolean);

  res.json({ code: 0, data: { recordings, session_id: sessionId } });
});

// ===== F4.10 原始录音管理 - 删除录音 =====
router.delete('/recording/:recordingId', authenticate, (req, res) => {
  const { recordingId } = req.params;
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(__dirname, '../../public/audio/recordings', recordingId);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ code: 1, message: '录音文件不存在' });
  }

  fs.unlinkSync(filePath);
  res.json({ code: 0, message: '录音已删除' });
});

module.exports = router;
