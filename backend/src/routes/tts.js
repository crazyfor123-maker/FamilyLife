// ===== TTS路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ttsService = require('../services/tts');

// GET /api/tts/config - 获取可用语音
router.get('/config', authenticate, (req, res) => {
  const voices = ttsService.getAvailableVoices('zh-CN');
  res.json({ code: 0, data: { voices, default_voice: 'zh-CN', languages: ['zh-CN', 'en-US'] } });
});

// POST /api/tts/synthesize - 合成语音
router.post('/synthesize', authenticate, (req, res) => {
  const { text, voice, speed, sessionId, questionIndex } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ code: 1, message: '文本不能为空' });
  }
  if (text.length > 5000) {
    return res.status(400).json({ code: 1, message: '文本不能超过5000个字符' });
  }

  const result = ttsService.synthesize(text, {
    voice: voice || 'zh-CN',
    speed: speed || 1.0,
    language: 'zh-CN',
    sessionId: sessionId || '',
    questionIndex: questionIndex || 0,
  });

  res.json({ code: 0, data: result });
});

// GET /api/tts/audio/:sessionId/:questionIndex - 获取音频URL
router.get('/audio/:sessionId/:questionIndex', authenticate, (req, res) => {
  const { sessionId, questionIndex } = req.params;
  // 查找最近的音频文件
  const ttsService = require('../services/tts');
  const path = require('path');
  const fs = require('fs');
  const recordingsDir = ttsService.RECORDINGS_DIR;

  if (!fs.existsSync(recordingsDir)) {
    return res.json({ code: 0, data: { audio_url: null, note: '音频目录不存在' } });
  }

  const files = fs.readdirSync(recordingsDir).filter(f => f.startsWith(`tts_${sessionId}_`));
  const latestFile = files.length > 0 ? files[files.length - 1] : null;

  res.json({
    code: 0,
    data: {
      audio_url: latestFile ? `/audio/recordings/${latestFile}` : null,
      session_id: sessionId,
      question_index: parseInt(questionIndex),
    },
  });
});

// POST /api/tts/batch - 批量合成
router.post('/batch', authenticate, (req, res) => {
  const { questions, sessionId, speed, voice } = req.body;

  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ code: 1, message: '问题列表不能为空' });
  }

  const results = ttsService.synthesizeBatch(questions, {
    sessionId,
    speed: speed || 1.0,
    voice: voice || 'zh-CN',
  });

  res.json({ code: 0, data: { results, total: results.length } });
});

module.exports = router;
