// ===== OCR路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ocrService = require('../services/ocr');
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (ocrService.OCR_CONFIG.supportedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'));
    }
  },
});

// GET /api/ocr/config - OCR配置
router.get('/config', authenticate, (req, res) => {
  res.json({ code: 0, data: ocrService.getOCRConfig() });
});

// POST /api/ocr/upload - 上传图片
router.post('/upload', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 1, message: '请上传文件' });
  }

  const result = ocrService.uploadImage(req.file, req.user?.space_id || '', req.user?.user_id || '');
  res.json({ code: 0, data: result });
});

// POST /api/ocr/recognize - 识别文字
router.post('/recognize', authenticate, (req, res) => {
  const { image_path, options } = req.body;

  if (!image_path) {
    return res.status(400).json({ code: 1, message: '图片路径不能为空' });
  }

  // ===== F3.18-21 OCR完善 - 竖排/手写体支持 =====
  const recognitionOptions = {
    vertical_text: options?.vertical_text || false,
    handwriting: options?.handwriting || false,
    ...options,
  };

  const result = ocrService.recognizeText(image_path, recognitionOptions);
  res.json({ code: 0, data: result });
});

// POST /api/ocr/recognize/image - 直接识别上传的图片
router.post('/recognize/image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ code: 1, message: '请上传图片' });
  }

  const { vertical_text, handwriting } = req.body;
  const result = ocrService.recognizeFromBuffer(req.file, {
    vertical_text: vertical_text === 'true',
    handwriting: handwriting === 'true',
  });
  res.json({ code: 0, data: result });
});

// POST /api/ocr/parse - 结构化解析
router.post('/parse', authenticate, (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ code: 1, message: '文本内容不能为空' });
  }

  const result = ocrService.parseGenealogy(text);
  res.json({ code: 0, data: result });
});

// POST /api/ocr/smart-build - 智能建档（从OCR结果自动构建人物档案）
router.post('/smart-build', authenticate, async (req, res) => {
  const { ocr_text, space_id } = req.body;

  if (!ocr_text) {
    return res.status(400).json({ code: 1, message: 'OCR文本不能为空' });
  }

  // 解析OCR结果，提取人物信息
  const parsed = ocrService.parseGenealogy(ocr_text);
  const persons = parsed.persons || [];

  // 创建人物档案
  const created = [];
  for (const person of persons) {
    try {
      // 调用 person.js API 创建档案
      const { get, post } = require('../utils/helpers');
      const personRes = await post('/person/create', {
        space_id,
        name: person.name || '未知',
        birth_year: person.birth_year || null,
        death_year: person.death_year || null,
        gender: person.gender || 'unknown',
        description: person.description || '',
        source: 'ocr_smart_build',
      });
      if (personRes && personRes.code === 0) {
        created.push({ ...person, created_id: personRes.data?.id });
      }
    } catch (err) {
      console.warn('智能建档失败:', person.name, err);
    }
  }

  res.json({ code: 0, data: { persons: created, total: created.length } });
});

// POST /api/ocr/batch-import - 批量导入OCR校对
router.post('/batch-import', authenticate, async (req, res) => {
  const { items, space_id } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ code: 1, message: '请提供要导入的数据' });
  }

  const results = [];
  for (const item of items) {
    try {
      const result = await ocrService.importFromOCR(item, space_id);
      results.push({ ...item, success: true, data: result });
    } catch (err) {
      results.push({ ...item, success: false, error: err.message });
    }
  }

  res.json({ code: 0, data: results, total: results.length });
});

module.exports = router;
