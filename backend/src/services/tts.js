// ===== TTS语音合成服务 =====
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AUDIO_DIR = path.join(__dirname, '../../public/audio');
const RECORDINGS_DIR = path.join(AUDIO_DIR, 'recordings');

// 确保目录存在
[AUDIO_DIR, RECORDINGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * 可用的语音配置
 */
const VOICES = {
  'zh-CN': [
    { code: 'xiaoxiao', name: '晓晓', gender: 'female', style: 'warm' },
    { code: 'yunxi', name: '云希', gender: 'male', style: 'steady' },
    { code: 'yunjian', name: '云健', gender: 'male', style: 'energetic' },
    { code: 'xiaoyi', name: '晓艺', gender: 'female', style: 'lively' },
  ],
  'en-US': [
    { code: 'en-US-Standard-A', name: 'English Female', gender: 'female', style: 'neutral' },
    { code: 'en-US-Standard-B', name: 'English Male', gender: 'male', style: 'neutral' },
  ]
};

/**
 * 使用系统TTS引擎合成语音
 * 支持 macOS (say), Linux (espeak), Windows (SAPI)
 */
function synthesize(text, options = {}) {
  const {
    voice = 'zh-CN',
    speed = 1.0,
    language = 'zh-CN',
    sessionId = '',
    questionIndex = 0,
  } = options;

  const timestamp = Date.now();
  const fileName = `tts_${sessionId}_${questionIndex}_${timestamp}.wav`;
  const filePath = path.join(RECORDINGS_DIR, fileName);

  try {
    if (process.platform === 'darwin') {
      // macOS: 使用 say 命令
      const speedAdjust = Math.round((1 / speed) * 100);
      execSync(`say -v "${voice}" -r ${speedAdjust} -o "${filePath}" "${text.replace(/"/g, '\\"')}"`, {
        timeout: 30000,
      });
    } else if (process.platform === 'linux') {
      // Linux: 使用 espeak
      const speedAdjust = Math.round(speed * 150);
      execSync(`espeak -v ${voice} -s ${speedAdjust} -w "${filePath}" "${text.replace(/'/g, "\\'")}"`, {
        timeout: 30000,
      });
    } else {
      // Windows: 使用 SAPI (需要 PowerShell)
      const escaped = text.replace(/"/g, '\"\"');
      execSync(`powershell -Command "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = ${Math.round((speed - 1) * 10)}; $s.Speak('${escaped}')"`, {
        timeout: 30000,
      });
      // Windows 下生成一个占位文件
      fs.writeFileSync(filePath, 'placeholder');
    }

    const stats = fs.statSync(filePath);
    const duration = Math.round(stats.size / 16000); // 粗略估算

    return {
      success: true,
      audio_url: `/audio/recordings/${fileName}`,
      duration: duration || 0,
      format: 'wav',
      file_size: stats.size,
    };
  } catch (err) {
    console.error('TTS合成失败:', err.message);
    // 降级：返回占位音频
    const placeholder = path.join(RECORDINGS_DIR, `tts_placeholder_${Date.now()}.wav`);
    fs.writeFileSync(placeholder, '');
    return {
      success: false,
      audio_url: `/audio/recordings/tts_placeholder_${Date.now()}.wav`,
      duration: 0,
      format: 'wav',
      error: 'TTS合成失败，使用占位音频',
    };
  }
}

/**
 * 批量合成（采访开始前预合成所有问题）
 */
function synthesizeBatch(questions, options = {}) {
  const { sessionId, speed = 1.0, voice = 'zh-CN' } = options;
  const results = [];

  questions.forEach((q, index) => {
    const result = synthesize(q.text || q.question, {
      voice,
      speed,
      language: 'zh-CN',
      sessionId,
      questionIndex: index,
    });
    results.push({ ...result, question_index: index });
  });

  return results;
}

/**
 * 获取可用语音列表
 */
function getAvailableVoices(language = 'zh-CN') {
  return VOICES[language] || VOICES['zh-CN'];
}

/**
 * 删除过期的TTS缓存文件
 */
function cleanupOldFiles(maxAgeHours = 24) {
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  const now = Date.now();
  let deleted = 0;

  try {
    const files = fs.readdirSync(RECORDINGS_DIR);
    files.forEach(file => {
      if (!file.startsWith('tts_')) return;
      const filePath = path.join(RECORDINGS_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        deleted++;
      }
    });
  } catch (err) {
    console.error('清理TTS缓存失败:', err.message);
  }

  return deleted;
}

module.exports = {
  VOICES,
  synthesize,
  synthesizeBatch,
  getAvailableVoices,
  cleanupOldFiles,
  AUDIO_DIR,
  RECORDINGS_DIR,
};
