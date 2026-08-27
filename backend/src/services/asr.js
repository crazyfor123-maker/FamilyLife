// ===== ASR语音识别服务 =====
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { RECORDINGS_DIR } = require('./tts');

/**
 * 支持的语音识别引擎
 */
const ENGINES = {
  system: { name: '系统引擎', description: '使用系统内置语音识别', available: false },
  ali: { name: '阿里云ASR', description: '阿里云语音识别服务', available: false },
  iflytek: { name: '讯飞ASR', description: '讯飞语音识别服务', available: false },
};

/**
 * 识别音频文件
 * 使用系统或云端ASR引擎
 */
function recognize(audioPath, options = {}) {
  const {
    engine = 'system',
    language = 'zh-CN',
    sessionId = '',
    questionIndex = 0,
  } = options;

  if (!fs.existsSync(audioPath)) {
    return {
      success: false,
      transcript: '',
      confidence: 0,
      error: '音频文件不存在',
    };
  }

  try {
    // 系统引擎：使用 macOS speech recognition 或 placeholder
    if (engine === 'system') {
      // macOS 使用 speechrecognition（需要 macOS 10.15+）
      // 这里使用占位识别结果
      const transcript = `[ASR转写结果 - 需要配置ASR引擎]`;
      const filePath = path.join(RECORDINGS_DIR, `asr_${sessionId}_${questionIndex}_${Date.now()}.json`);
      fs.writeFileSync(filePath, JSON.stringify({
        session_id: sessionId,
        question_index: questionIndex,
        transcript,
        confidence: 0,
        language,
        status: 'placeholder',
      }));

      return {
        success: true,
        transcript,
        confidence: 0,
        language,
        status: 'placeholder',
        note: '当前使用占位模式，需要配置ASR引擎（如阿里云ASR或讯飞ASR）',
      };
    }

    // 阿里云ASR
    if (engine === 'ali') {
      return recognizeAli(audioPath, language);
    }

    // 讯飞ASR
    if (engine === 'iflytek') {
      return recognizeIflytek(audioPath, language);
    }

    return {
      success: false,
      transcript: '',
      confidence: 0,
      error: '不支持的ASR引擎',
    };
  } catch (err) {
    console.error('ASR识别失败:', err.message);
    return {
      success: false,
      transcript: '',
      confidence: 0,
      error: err.message,
    };
  }
}

/**
 * 阿里云ASR识别
 */
function recognizeAli(audioPath, language) {
  // TODO: 实现阿里云ASR调用
  // 需要安装 @alicloud/nls-sdk-streaming
  return {
    success: false,
    transcript: '',
    confidence: 0,
    error: '阿里云ASR引擎未配置',
  };
}

/**
 * 讯飞ASR识别
 */
function recognizeIflytek(audioPath, language) {
  // TODO: 实现讯飞ASR调用
  // 需要安装 iflytek-sdk
  return {
    success: false,
    transcript: '',
    confidence: 0,
    error: '讯飞ASR引擎未配置',
  };
}

/**
 * 流式识别（WebSocket）
 * 前端通过WebSocket发送音频流，后端实时返回转写结果
 */
function createStreamRecognition(ws, options = {}) {
  const { language = 'zh-CN', sessionId = '' } = options;

  let buffer = Buffer.alloc(0);
  let isRecognizing = false;

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());

    if (message.type === 'audio_chunk') {
      buffer = Buffer.concat([buffer, Buffer.from(message.audio, 'base64')]);
    }

    if (message.type === 'stop') {
      // 停止录音，执行识别
      const tempPath = path.join(RECORDINGS_DIR, `stream_${sessionId}_${Date.now()}.wav`);
      fs.writeFileSync(tempPath, buffer);
      const result = recognize(tempPath, { engine: 'system', language, sessionId, questionIndex: 0 });
      ws.send(JSON.stringify({
        type: 'transcript',
        transcript: result.transcript,
        confidence: result.confidence,
      }));
      isRecognizing = false;
    }
  });

  return {
    start() { isRecognizing = true; },
    stop() { /* handled in message handler */ },
  };
}

/**
 * 获取可用引擎列表
 */
function getAvailableEngines() {
  return ENGINES;
}

module.exports = {
  ENGINES,
  recognize,
  createStreamRecognition,
  getAvailableEngines,
};
