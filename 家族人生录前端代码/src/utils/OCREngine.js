// ===== F3.18-21 Day 1: 真实OCR引擎集成 =====
// Tesseract.js 客户端OCR + 阿里云OCR服务端备选
// 支持：竖排文本、手写体、图片预处理、家谱结构化解析

import Tesseract from 'tesseract.js';

// ===== OCR引擎配置 =====
const OCR_ENGINE_CONFIG = {
  provider: 'tesseract', // tesseract | ali | baidu
  tessdataBase: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.0/worker.min.js',
  lang: 'chi_sim+chi_tra+eng', // 简体中文+繁体中文+英文
  vertical_text: false,
  handwriting: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp', 'gif'],
};

// ===== Tesseract.js OCR引擎 =====
class TesseractOCR {
  constructor(options = {}) {
    this.worker = null;
    this.lang = options.lang || OCR_ENGINE_CONFIG.lang;
    this.verticalText = options.vertical_text || false;
    this.handwriting = options.handwriting || false;
    this.isReady = false;
    this.onProgress = null;
  }

  /**
   * 初始化Tesseract Worker
   */
  async init() {
    if (this.isReady) return this;

    try {
      this.worker = await Tesseract.createWorker(this.lang, 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core' || m.status === 'loading language data') {
            if (this.onProgress) this.onProgress(10);
          } else if (m.status === 'initializing api') {
            if (this.onProgress) this.onProgress(30);
          } else if (m.status === 'loaded language') {
            if (this.onProgress) this.onProgress(50);
          }
        },
      });

      // 竖排文本设置
      if (this.verticalText) {
        await this.worker.setParameters({
          tessedit_pageseg_mode: '7', // 单行文本
          tessedit_write_unambig_images: 'false',
        });
      }

      this.isReady = true;
      console.log('[TesseractOCR] Worker初始化成功');
      return this;
    } catch (err) {
      console.error('[TesseractOCR] Worker初始化失败:', err);
      throw err;
    }
  }

  /**
   * 识别图片（支持Base64/URL/File）
   */
  async recognize(source, options = {}) {
    if (!this.isReady) await this.init();

    const progress = options.onProgress || this.onProgress;

    const result = await Tesseract.recognize(source, this.lang, {
      logger: (m) => {
        if (progress) progress(m);
      },
      ...options,
    });

    // 后处理：清理OCR结果
    const cleanedText = this._postProcess(result.data.text);
    const confidence = result.data.confidence || 0;

    return {
      success: true,
      text: cleanedText,
      confidence: confidence / 100,
      lines: result.data.words?.map(w => ({
        text: w.text,
        confidence: w.confidence / 100,
        bbox: w.bbox,
      })) || [],
      vertical_text: this.verticalText,
      handwriting: this.handwriting,
      note: this.verticalText ? '竖排文本识别模式' : '横排文本识别模式',
    };
  }

  /**
   * 后处理OCR结果
   */
  _postProcess(text) {
    return text
      // 清理多余换行
      .replace(/\n{3,}/g, '\n\n')
      // 清理首尾空白
      .trim()
      // 标准化标点
      .replace(/。/g, '。')
      .replace(/，/g, '，');
  }

  /**
   * 释放Worker
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

// ===== 阿里云OCR引擎 =====
class AliOCR {
  constructor(config = {}) {
    this.appKey = config.appKey || '';
    this.appSecret = config.appSecret || '';
    this.endpoint = config.endpoint || 'ocr-api.cn-shanghai.aliyuncs.com';
    this.isConfigured = !!(this.appKey && this.appSecret);
  }

  /**
   * 识别图片（调用阿里云OCR API）
   */
  async recognize(imageBuffer, options = {}) {
    if (!this.isConfigured) {
      throw new Error('阿里云OCR未配置（需要appKey和appSecret）');
    }

    // 调用阿里云OCR API
    const { post } = await import('../../api/request');
    const result = await post('/ocr/ali/recognize', {
      image: imageBuffer,
      vertical_text: options.vertical_text || false,
      handwriting: options.handwriting || false,
    });

    if (!result || result.code !== 0) {
      throw new Error(result?.message || '阿里云OCR识别失败');
    }

    return {
      success: true,
      text: result.data?.text || '',
      confidence: result.data?.confidence || 0,
      lines: result.data?.lines || [],
      vertical_text: options.vertical_text || false,
      handwriting: options.handwriting || false,
      note: '阿里云OCR识别结果',
    };
  }
}

// ===== OCR引擎工厂 =====
class OCRFactory {
  static create(provider = 'tesseract', options = {}) {
    switch (provider) {
      case 'ali':
        return new AliOCR(options);
      case 'baidu':
        return new (class {
          async recognize() {
            throw new Error('百度OCR暂未实现');
          }
        })();
      default:
        return new TesseractOCR(options);
    }
  }
}

// ===== 图片预处理 =====
class ImagePreprocessor {
  /**
   * 预处理图片（灰度化/二值化/倾斜校正）
   */
  static async preprocess(imageSource) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // 加载图片
    const src = typeof imageSource === 'string' ? imageSource : await this._toDataURL(imageSource);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });

    canvas.width = img.width;
    canvas.height = img.height;

    // 灰度化
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imageData, 0, 0);

    // 二值化
    const binaryData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bData = binaryData.data;
    const threshold = 128;

    for (let i = 0; i < bData.length; i += 4) {
      const val = bData[i];
      const binary = val > threshold ? 255 : 0;
      bData[i] = binary;
      bData[i + 1] = binary;
      bData[i + 2] = binary;
    }

    ctx.putImageData(binaryData, 0, 0);

    // 返回预处理后的Base64
    return canvas.toDataURL('image/png');
  }

  static async _toDataURL(source) {
    if (typeof source === 'string') {
      if (source.startsWith('data:')) return source;
      if (source.startsWith('http')) return source;
      // 文件路径
      const file = await fetch(source).then(r => r.blob());
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
    if (source instanceof File || source instanceof Blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(source);
      });
    }
    if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
      return source.src || source.toDataURL();
    }
    throw new Error('不支持的图片源类型');
  }
}

// ===== 家谱文本结构化解析 =====
class GenealogyParser {
  /**
   * 解析家谱文本（支持多种格式）
   */
  static parse(text) {
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

      // 检查是否已存在
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

    // 模式4：事件记录（生于/卒于/迁居等）
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
   * 智能建档（解析结果 → 人物档案）
   */
  static async smartBuild(parsed, spaceId) {
    const { post } = await import('../../api/request');
    const created = [];

    for (const person of parsed.persons) {
      try {
        const res = await post('/person/create', {
          space_id: spaceId,
          name: person.name,
          birth_year: person.birth_year || null,
          death_year: person.death_year || null,
          zi: person.zi || '',
          generation: person.generation || null,
          gender: 'unknown',
          description: person.source_line || '',
          source: 'ocr_smart_build',
          confidence: person.confidence,
        });

        if (res && res.code === 0) {
          created.push({ ...person, created_id: res.data?.id });
        }
      } catch (err) {
        console.warn('智能建档失败:', person.name, err);
      }
    }

    return { persons: created, total: created.length };
  }
}

// ===== OCR结果缓存 =====
class OCRResultCache {
  constructor() {
    this.dbName = 'OCRResultCache';
    this.storeName = 'results';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onerror = () => reject(request.error);
    });
  }

  async get(imageHash) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(imageHash);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  }

  async set(imageHash, data) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put({ id: imageHash, data, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async remove(imageHash) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(imageHash);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAll() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clear() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ===== 导出 =====
export {
  OCR_ENGINE_CONFIG,
  TesseractOCR,
  AliOCR,
  OCRFactory,
  ImagePreprocessor,
  GenealogyParser,
  OCRResultCache,
};

export default OCRFactory.create('tesseract');
