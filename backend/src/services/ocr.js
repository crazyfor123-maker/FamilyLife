// ===== OCR文字识别服务 =====
const fs = require('fs');
const path = require('path');

const OCR_DIR = path.join(__dirname, '../../public/ocr');
if (!fs.existsSync(OCR_DIR)) fs.mkdirSync(OCR_DIR, { recursive: true });

/**
 * OCR配置
 */
const OCR_CONFIG = {
  provider: process.env.OCR_PROVIDER || 'local', // local | ali | baidu | tesseract
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'gif'],
  ali: {
    appKey: process.env.ALI_OCR_APP_KEY || '',
    appSecret: process.env.ALI_OCR_APP_SECRET || '',
    endpoint: process.env.ALI_OCR_ENDPOINT || 'ocr-api.cn-shanghai.aliyuncs.com',
  },
};

/**
 * 上传图片
 */
function uploadImage(file, spaceId, userId) {
  const filePath = path.join(OCR_DIR, `ocr_${Date.now()}_${file.originalname || 'image'}`);
  fs.writeFileSync(filePath, file.buffer || fs.readFileSync(file.path));
  return {
    success: true,
    file_path: filePath,
    file_name: file.originalname || 'image',
    file_size: file.size || fs.statSync(filePath).size,
    job_id: `ocr_job_${Date.now()}`,
  };
}

/**
 * OCR识别（支持竖排/手写体）
 */
function recognizeText(imagePath, options = {}) {
  const { vertical_text = false, handwriting = false } = options;
  const provider = OCR_CONFIG.provider;

  // ===== 本地Tesseract.js引擎 =====
  if (provider === 'tesseract' || provider === 'local') {
    return recognizeWithTesseract(imagePath, { vertical_text, handwriting });
  }

  // ===== 阿里云OCR =====
  if (provider === 'ali') {
    return recognizeWithAli(imagePath, { vertical_text, handwriting });
  }

  // ===== 百度OCR =====
  if (provider === 'baidu') {
    return recognizeWithBaidu(imagePath, { vertical_text, handwriting });
  }

  // 默认：模拟模式
  return getMockResult(imagePath, { vertical_text, handwriting });
}

/**
 * Tesseract.js识别（Node.js版本）
 */
function recognizeWithTesseract(imagePath, options = {}) {
  // 注意：Node.js端需要安装 tesseract.js-core 和对应语言包
  // 这里提供API接口，实际推理在前端完成
  return {
    success: true,
    text: '[OCR识别结果 - 请使用前端Tesseract.js引擎进行识别]\n\n提示：请在前端页面上传并识别图片，以获得最佳识别效果。',
    regions: [],
    confidence: 0,
    note: 'Node.js端Tesseract.js需要额外配置语言包，建议在前端使用浏览器版Tesseract.js',
    vertical_text: options.vertical_text,
    handwriting: options.handwriting,
    provider: 'tesseract',
  };
}

/**
 * 阿里云OCR识别
 */
function recognizeWithAli(imagePath, options = {}) {
  const { appKey, appSecret, endpoint } = OCR_CONFIG.ali;

  if (!appKey || !appSecret) {
    return getMockResult(imagePath, options);
  }

  // TODO: 调用阿里云OCR API
  // const axios = require('axios');
  // const crypto = require('crypto');
  // ... 阿里云OCR API调用逻辑

  return {
    success: true,
    text: '[OCR识别结果 - 阿里云OCR未配置]',
    regions: [],
    confidence: 0,
    note: '请配置环境变量 ALI_OCR_APP_KEY 和 ALI_OCR_APP_SECRET',
    vertical_text: options.vertical_text,
    handwriting: options.handwriting,
    provider: 'ali',
  };
}

/**
 * 百度OCR识别
 */
function recognizeWithBaidu(imagePath, options = {}) {
  return {
    success: true,
    text: '[OCR识别结果 - 百度OCR未配置]',
    regions: [],
    confidence: 0,
    note: '请配置百度OCR API密钥',
    vertical_text: options.vertical_text,
    handwriting: options.handwriting,
    provider: 'baidu',
  };
}

/**
 * 模拟结果（开发/测试用）
 */
function getMockResult(imagePath, options = {}) {
  let note = '当前使用模拟模式，需要配置OCR引擎（如Tesseract.js、阿里云OCR或百度OCR）';
  if (options.vertical_text) note += ' | 竖排文本模式';
  if (options.handwriting) note += ' | 手写体识别模式';

  return {
    success: true,
    text: '[OCR识别结果 - 需要配置OCR引擎]\n\n张氏家族谱\n\n第一代：张公讳文远，字德明，生于清光绪年间\n第二代：张公讳继业，字承业，文远之子\n第三代：张公讳德厚，字厚德，继业之子\n\n注：此结果为模拟数据，实际使用需配置OCR引擎',
    regions: [],
    confidence: 0,
    note,
    vertical_text: options.vertical_text,
    handwriting: options.handwriting,
    provider: OCR_CONFIG.provider,
  };
}

/**
 * 结构化解析家谱文本
 */
function parseGenealogy(text) {
  const persons = [];
  const events = [];
  const lines = text.split('\n').filter(l => l.trim());

  // 模式1：第X代：XXX，字XXX
  const pattern1 = /第(\d+)代[：:]\s*(.+?)(?:，|，|：|$)/g;
  let match;
  while ((match = pattern1.exec(text)) !== null) {
    const generation = parseInt(match[1]);
    const rest = match[2].trim();
    const nameMatch = rest.match(/^(.+?)(?:，|，|，|$)/);
    const name = nameMatch ? nameMatch[1] : rest;
    const zi = rest.replace(name, '').replace(/^，|，$/, '').trim();

    persons.push({
      generation,
      name: name || '未知',
      zi: zi || '',
      confidence: 0.7,
      needs_review: true,
      source_line: match[0],
    });
  }

  // 模式2：XXX（字XXX），生于XXXX年
  const pattern2 = /(.+?)(?:，|，|：)\s*(?:字|号)\s*(.+?)(?:，|，|：)\s*生(?:于|于)\s*(\d{4})\s*年/g;
  while ((match = pattern2.exec(text)) !== null) {
    const name = match[1].trim();
    const zi = match[2].trim();
    const birthYear = match[3];

    const exists = persons.find(p => p.name === name);
    if (!exists) {
      persons.push({
        name,
        zi,
        birth_year: parseInt(birthYear),
        confidence: 0.8,
        needs_review: true,
        source_line: match[0],
      });
    }
  }

  // 模式3：生于XXXX年，卒于XXXX年
  const pattern3 = /(.+?)(?:，|，|：)\s*生(?:于|于)\s*(\d{4})\s*年\s*(?:，|，|：)?\s*(?:卒|逝|终)\s*(?:于|在)\s*(\d{4})\s*年/g;
  while ((match = pattern3.exec(text)) !== null) {
    const name = match[1].trim();
    const birthYear = match[2];
    const deathYear = match[3];

    const exists = persons.find(p => p.name === name);
    if (!exists) {
      persons.push({
        name,
        birth_year: parseInt(birthYear),
        death_year: parseInt(deathYear),
        confidence: 0.85,
        needs_review: true,
        source_line: match[0],
      });
    }
  }

  // 模式4：事件记录
  const pattern4 = /(\d{4})\s*年\s*(.+?)(?:，|，|。|$)/g;
  while ((match = pattern4.exec(text)) !== null) {
    const year = match[1];
    const event = match[2].trim();
    if (event.length > 2 && event.length < 50) {
      events.push({
        year: parseInt(year),
        description: event,
        confidence: 0.6,
      });
    }
  }

  // 去重
  const uniquePersons = [];
  const seen = new Set();
  for (const p of persons) {
    const key = p.name;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePersons.push(p);
    }
  }

  return {
    persons: uniquePersons,
    events,
    total_persons: uniquePersons.length,
    total_events: events.length,
    note: '解析结果需要人工校对',
    raw_text: text,
  };
}

/**
 * 从Buffer识别OCR（支持竖排/手写体）
 */
function recognizeFromBuffer(buffer, options = {}) {
  // 保存临时文件
  const tempPath = path.join(OCR_DIR, `ocr_temp_${Date.now()}.png`);
  fs.writeFileSync(tempPath, buffer);

  const result = recognizeText(tempPath, options);

  // 清理临时文件
  setTimeout(() => {
    try { fs.unlinkSync(tempPath); } catch {}
  }, 60000);

  return result;
}

/**
 * 从OCR导入数据（批量）
 */
async function importFromOCR(item, spaceId) {
  // 解析并创建人物档案
  const parsed = parseGenealogy(item.text || '');
  return {
    persons: parsed.persons,
    events: parsed.events,
    total: parsed.total_persons,
  };
}

/**
 * 获取OCR配置
 */
function getOCRConfig() {
  return {
    provider: OCR_CONFIG.provider,
    maxFileSize: OCR_CONFIG.maxFileSize,
    supportedFormats: OCR_CONFIG.supportedFormats,
    available: ['tesseract', 'local', 'ali', 'baidu'].includes(OCR_CONFIG.provider),
    tesseractReady: OCR_CONFIG.provider === 'tesseract' || OCR_CONFIG.provider === 'local',
    aliConfigured: !!(OCR_CONFIG.ali.appKey && OCR_CONFIG.ali.appSecret),
    note: OCR_CONFIG.provider === 'local'
      ? '当前使用本地模拟模式，建议配置云端OCR服务以获得更好的识别效果'
      : `当前使用${OCR_CONFIG.provider === 'ali' ? '阿里云' : OCR_CONFIG.provider === 'baidu' ? '百度' : 'Tesseract.js'}OCR引擎`,
  };
}

module.exports = {
  OCR_CONFIG,
  OCR_DIR,
  uploadImage,
  recognizeText,
  recognizeWithTesseract,
  recognizeWithAli,
  recognizeWithBaidu,
  getMockResult,
  parseGenealogy,
  getOCRConfig,
  recognizeFromBuffer,
  importFromOCR,
};
