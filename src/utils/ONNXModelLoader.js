// ===== F4.13 Day 1: ONNX Runtime Web 集成 =====
// 模型下载器（分片下载 + 断点续传）
// 模型加载器（支持完整模型和量化模型）
// 模型缓存策略（IndexedDB存储）

import { get, post } from '../api/request';

const MODEL_STORE_NAME = 'modelStore';
const MODEL_STORE_OBJECT = 'models';
const DB_NAME = 'FamilyAIModels';
const DB_VERSION = 1;

// ===== IndexedDB 模型缓存 =====
class ModelCache {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(MODEL_STORE_OBJECT)) {
          db.createObjectStore(MODEL_STORE_OBJECT, { keyPath: 'name' });
        }
      };
      request.onsuccess = () => { this.db = request.result; resolve(); };
      request.onerror = () => reject(request.error);
    });
  }

  async get(name) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(MODEL_STORE_OBJECT, 'readonly');
      const store = tx.objectStore(MODEL_STORE_OBJECT);
      const req = store.get(name);
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  }

  async set(name, data) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(MODEL_STORE_OBJECT, 'readwrite');
      const store = tx.objectStore(MODEL_STORE_OBJECT);
      const req = store.put({ name, data, updatedAt: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async remove(name) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(MODEL_STORE_OBJECT, 'readwrite');
      const store = tx.objectStore(MODEL_STORE_OBJECT);
      const req = store.delete(name);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getAll() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(MODEL_STORE_OBJECT, 'readonly');
      const store = tx.objectStore(MODEL_STORE_OBJECT);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async clear() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(MODEL_STORE_OBJECT, 'readwrite');
      tx.objectStore(MODEL_STORE_OBJECT).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getUsage() {
    const models = await this.getAll();
    let totalSize = 0;
    for (const m of models) {
      if (m.data instanceof ArrayBuffer) {
        totalSize += m.data.byteLength;
      } else if (m.data instanceof Blob) {
        totalSize += m.data.size;
      }
    }
    return { models: models.length, totalSize };
  }
}

// ===== 分片下载器（支持断点续传） =====
class ChunkDownloader {
  constructor() {
    this.chunkSize = 10 * 1024 * 1024; // 10MB per chunk
    this.abortController = null;
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * 分片下载大文件
   * @param {string} url - 文件URL
   * @param {Function} onProgress - 进度回调 (0-100)
   * @param {Function} onChunk - 每块下载完成回调 (chunkIndex, buffer)
   * @returns {Promise<ArrayBuffer>} 完整文件
   */
  async download(url, onProgress, onChunk) {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // 获取文件大小
    const headResp = await fetch(url, { method: 'HEAD', signal });
    const totalSize = parseInt(headResp.headers.get('Content-Length') || '0');

    // 检查已有进度（断点续传）
    const savedChunks = await this._getSavedChunks(url);
    const downloadedSize = Object.values(savedChunks).reduce((sum, chunk) => sum + chunk.byteLength, 0);

    const chunks = new Array(Math.ceil(totalSize / this.chunkSize));
    let downloaded = downloadedSize;

    // 加载已保存的块
    for (const [idx, buffer] of Object.entries(savedChunks)) {
      chunks[parseInt(idx)] = buffer;
    }

    // 下载缺失的块
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i]) continue; // 已有

      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, totalSize) - 1;

      const resp = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        signal,
      });

      if (!resp.ok) throw new Error(`下载块 ${i} 失败: ${resp.status}`);

      const buffer = await resp.arrayBuffer();
      chunks[i] = buffer;

      // 保存进度
      await this._saveChunk(url, i, buffer);

      downloaded += buffer.byteLength;
      if (onProgress) onProgress((downloaded / totalSize) * 100);
      if (onChunk) onChunk(i, buffer);
    }

    // 合并
    const merged = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    // 清理保存的块
    await this._clearSavedChunks(url);

    return merged.buffer;
  }

  async _getSavedChunks(url) {
    const cache = new ModelCache();
    const key = `chunk_${url}`;
    const chunks = await cache.get(key);
    return chunks || {};
  }

  async _saveChunk(url, index, buffer) {
    const cache = new ModelCache();
    const key = `chunk_${url}`;
    const chunks = await cache.get(key) || {};
    chunks[index] = buffer;
    await cache.set(key, chunks);
  }

  async _clearSavedChunks(url) {
    const cache = new ModelCache();
    const key = `chunk_${url}`;
    await cache.remove(key);
  }
}

// ===== 模型下载管理器 =====
class ModelDownloader {
  constructor() {
    this.downloader = new ChunkDownloader();
    this.downloadUrl = '/api/interview/ai/download-model';
    this.onProgress = null;
    this.isDownloading = false;
  }

  /**
   * 下载模型（支持进度回调）
   * @param {string} modelType - llm | tts | asr | all
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<boolean>}
   */
  async download(modelType = 'llm', onProgress = null) {
    this.onProgress = onProgress;
    this.isDownloading = true;

    try {
      // 获取下载URL
      const resp = await post(this.downloadUrl, { model_type: modelType });
      if (!resp || resp.code !== 0) {
        throw new Error(resp?.message || '获取下载URL失败');
      }

      const downloadUrl = resp.data?.download_url;
      if (!downloadUrl) {
        throw new Error('未返回下载URL');
      }

      // 使用分片下载器下载
      const buffer = await this.downloader.download(
        downloadUrl,
        (progress) => {
          if (onProgress) onProgress(progress);
        },
        (chunkIndex, buffer) => {
          if (onProgress) {
            onProgress(progress => progress); // 通知块下载完成
          }
        }
      );

      // 保存到IndexedDB
      const cache = new ModelCache();
      await cache.set(modelType, buffer);

      // 保存模型元数据
      const meta = {
        type: modelType,
        version: '1.0.0',
        size: buffer.byteLength,
        downloadedAt: Date.now(),
        modelPath: `indexeddb://${modelType}`,
      };
      await cache.set(`meta_${modelType}`, meta);

      return true;
    } catch (err) {
      console.error('[ModelDownloader] 下载失败:', err);
      throw err;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * 下载所有模型（llm+tts+asr）
   */
  async downloadAll(onProgress = null) {
    const models = ['llm', 'tts', 'asr'];
    let totalProgress = 0;

    for (const model of models) {
      const progress = await this.download(model, (p) => {
        if (onProgress) {
          // 总进度 = 当前模型进度 / 总模型数 * 100
          const perModelWeight = 100 / models.length;
          onProgress((totalProgress + (p / 100) * perModelWeight));
        }
      });
      if (!progress) return false;
      totalProgress += 100 / models.length;
    }

    if (onProgress) onProgress(100);
    return true;
  }

  /**
   * 取消下载
   */
  cancel() {
    this.downloader.abort();
    this.isDownloading = false;
  }

  /**
   * 检查模型是否已下载
   */
  async isDownloaded(modelType) {
    const cache = new ModelCache();
    const data = await cache.get(modelType);
    return !!data;
  }

  /**
   * 获取模型状态
   */
  async getStatus() {
    const cache = new ModelCache();
    const models = await cache.getAll();
    const status = { llm: false, tts: false, asr: false };
    const metas = {};

    for (const m of models) {
      if (m.name.startsWith('meta_')) {
        metas[m.name] = m.data;
      }
    }

    for (const type of ['llm', 'tts', 'asr']) {
      const hasData = await this.isDownloaded(type);
      status[type] = hasData;
    }

    const usage = await cache.getUsage();
    return { ...status, usage, metas };
  }
}

export { ModelCache, ChunkDownloader, ModelDownloader };
export default new ModelDownloader();
