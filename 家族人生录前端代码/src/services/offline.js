// ===== F2.3 数据同步引擎 - 完整实现 =====
// 核心功能：增量同步 + 双向同步 + 冲突检测 + 指数退避重试 + 断点续传
// ===== 9.2 离线工作模式 - 完整实现 =====
// 离线数据缓存策略 + 离线操作队列完整实现 + 联网自动同步触发

import localStorageService from './localStorage';

let syncProgressCallback = null;
let syncCompleteCallback = null;
let lastSyncTime = {};
let isOnline = navigator.onLine;
let isSyncing = false;
let syncQueue = []; // 待处理同步队列
let syncQueueLock = false;

// ===== 离线数据缓存策略 =====
// 定义哪些数据可以离线访问
const OFFLINE_CACHEABLE_TYPES = {
  'persons': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 500, priority: 'high' },
  'interviews': { maxAge: 3 * 24 * 60 * 60 * 1000, maxSize: 200, priority: 'high' },
  'books': { maxAge: 14 * 24 * 60 * 60 * 1000, maxSize: 50, priority: 'medium' },
  'photos': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 1000, priority: 'low' },
  'events': { maxAge: 7 * 24 * 60 * 60 * 1000, maxSize: 100, priority: 'medium' },
  'messages': { maxAge: 3 * 24 * 60 * 60 * 1000, maxSize: 500, priority: 'medium' },
  'kinship': { maxAge: 30 * 24 * 60 * 60 * 1000, maxSize: 1000, priority: 'high' },
};

// 缓存状态追踪
const cacheState = {
  'persons': { cachedAt: 0, count: 0, size: 0 },
  'interviews': { cachedAt: 0, count: 0, size: 0 },
  'books': { cachedAt: 0, count: 0, size: 0 },
  'photos': { cachedAt: 0, count: 0, size: 0 },
  'events': { cachedAt: 0, count: 0, size: 0 },
  'messages': { cachedAt: 0, count: 0, size: 0 },
  'kinship': { cachedAt: 0, count: 0, size: 0 },
};

function isCacheValid(type) {
  const config = OFFLINE_CACHEABLE_TYPES[type];
  if (!config) return false;
  const state = cacheState[type];
  if (!state || !state.cachedAt) return false;
  const age = Date.now() - state.cachedAt;
  return age < config.maxAge;
}

function isCacheExpired(type) {
  return !isCacheValid(type);
}

function getCacheStats() {
  const stats = {};
  for (const [type, config] of Object.entries(OFFLINE_CACHEABLE_TYPES)) {
    const state = cacheState[type];
    stats[type] = {
      cached: !!(state && state.cachedAt),
      age: state?.cachedAt ? Date.now() - state.cachedAt : 0,
      count: state?.count || 0,
      size: state?.size || 0,
      maxAge: config.maxAge,
      maxSize: config.maxSize,
      priority: config.priority,
      expired: isCacheExpired(type),
    };
  }
  return stats;
}

// ===== 离线操作队列完整实现 =====
// 支持增删改查全操作类型
const OFFLINE_OPERATIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  READ: 'read',
};

async function addToOfflineQueue(item) {
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const queueItem = {
    id,
    ...item,
    created_at: Date.now(),
    sync_status: 'pending',
    retry_count: 0,
    operation_type: item.operationType || 'create',
  };
  await localStorageService.put('offlineQueue', queueItem);
  syncQueue.push(queueItem);
  return queueItem;
}

async function getOfflineQueue() {
  const records = await localStorageService.getAll('offlineQueue');
  return records.filter(r => r.sync_status === 'pending').sort((a, b) => a.created_at - b.created_at);
}

async function clearOfflineQueue() {
  const records = await localStorageService.getAll('offlineQueue');
  for (const record of records) {
    if (record.sync_status === 'synced' || record.sync_status === 'failed') {
      await localStorageService.del('offlineQueue', record.id);
    }
  }
}

async function clearOfflineQueueOlderThan(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const records = await localStorageService.getAll('offlineQueue');
  let cleaned = 0;
  for (const record of records) {
    if (record.created_at < cutoff && record.sync_status === 'pending') {
      await localStorageService.del('offlineQueue', record.id);
      cleaned++;
    }
  }
  return cleaned;
}

async function updateOfflineQueueStatus(id, status) {
  const record = await localStorageService.get('offlineQueue', id);
  if (record) {
    record.sync_status = status;
    record.updated_at = Date.now();
    if (status === 'failed') {
      record.retry_count = (record.retry_count || 0) + 1;
    }
    return localStorageService.put('offlineQueue', record);
  }
}

async function getOfflineQueueStatus() {
  const records = await localStorageService.getAll('offlineQueue');
  const pending = records.filter(r => r.sync_status === 'pending').length;
  const synced = records.filter(r => r.sync_status === 'synced').length;
  const failed = records.filter(r => r.sync_status === 'failed').length;
  return { pending, synced, failed, total: records.length };
}

// ===== 指数退避重试 =====
const RETRY_DELAYS = [5000, 15000, 45000, 120000, 300000]; // 5s, 15s, 45s, 2min, 5min
const MAX_RETRIES = 10;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function retryWithBackoff(fn, context = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await fn();
      if (result?.success || result?.synced) return true;
      if (result === true) return true;
    } catch (err) {
      lastError = err;
      const isRetriable = err.status === 429 || err.status >= 500 || err.code === 'NETWORK_ERROR';
      if (!isRetriable) break;
      if (attempt < RETRY_DELAYS.length) {
        console.log(`[F2.3] 同步失败，${RETRY_DELAYS[attempt] / 1000}s 后重试 (${attempt + 1}/${MAX_RETRIES})`);
        await sleep(RETRY_DELAYS[attempt]);
      } else {
        console.warn(`[F2.3] 已达最大重试次数`);
      }
    }
  }
  console.error('[F2.3] 同步最终失败:', lastError);
  return false;
}

// ===== 增量同步 =====
async function syncIncremental(type, lastTimestamp, userId) {
  const localRecords = await localStorageService.getAll(type);
  const localChanged = localRecords.filter(r => r.updated_at > lastTimestamp).map(r => r.id);

  if (localChanged.length === 0) return { synced: 0, total: 0 };

  // 上传本地变更到云端
  const uploaded = await retryWithBackoff(async () => {
    const response = await fetch(`/api/sync/${type}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, changes: localChanged }),
    });
    if (!response.ok) throw { status: response.status, code: 'SYNC_ERROR' };
    return response.json();
  });

  // 拉取云端变更
  const cloudResponse = await fetch(`/api/sync/${type}/pull?since=${lastTimestamp}`, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('family_token')}` },
  });
  const cloudData = cloudResponse.ok ? await cloudResponse.json() : { changed: [] };

  // 更新本地
  for (const record of cloudData.changed || []) {
    if (record.updated_at > lastTimestamp) {
      await localStorageService.put(type, { ...record, source: 'cloud' });
    }
  }

  lastSyncTime[type] = Date.now();
  return { synced: localChanged.length + (cloudData.changed?.length || 0), total: localChanged.length };
}

// ===== 冲突检测与处理 =====
function detectConflict(localRecord, cloudRecord) {
  if (!localRecord || !cloudRecord) return null;
  if (localRecord.updated_at === cloudRecord.updated_at) return 'identical';
  if (localRecord.updated_at > cloudRecord.updated_at) return 'local_newer';
  if (cloudRecord.updated_at > cloudRecord.updated_at) return 'cloud_newer';
  return 'conflict';
}

function resolveConflict(localRecord, cloudRecord) {
  // 以最后修改时间戳为准
  if (cloudRecord.updated_at > localRecord.updated_at) {
    return { ...cloudRecord, conflict_resolved: true, version: 'cloud' };
  }
  return { ...localRecord, conflict_resolved: true, version: 'local' };
}

// ===== 双向同步 =====
async function syncAll(userId) {
  if (!isOnline) return { status: 'offline', queued: (await getOfflineQueueStatus()).pending };
  if (isSyncing) return { status: 'syncing' };

  isSyncing = true;
  const types = Object.keys(OFFLINE_CACHEABLE_TYPES);
  let totalSynced = 0;
  let totalFailed = 0;

  try {
    for (const type of types) {
      const lastTime = lastSyncTime[type] || 0;
      try {
        const result = await syncIncremental(type, lastTime, userId);
        totalSynced += result.synced;
        // 更新缓存状态
        cacheState[type].cachedAt = Date.now();
        cacheState[type].count = (await localStorageService.getAll(type)).length;
        if (syncProgressCallback) syncProgressCallback({ type, synced: result.synced, total: result.total });
      } catch (err) {
        totalFailed++;
        console.error(`[F2.3] ${type} 同步失败:`, err);
      }
    }

    // 处理离线队列
    const queue = await getOfflineQueue();
    for (const item of queue) {
      const success = await retryWithBackoff(async () => {
        const response = await fetch(`/api/sync/${item.type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, userId }),
        });
        return response.ok;
      });
      await updateOfflineQueueStatus(item.id, success ? 'synced' : 'failed');
    }

    if (syncCompleteCallback) syncCompleteCallback({ totalSynced, totalFailed });
  } finally {
    isSyncing = false;
  }

  return { totalSynced, totalFailed };
}

// ===== 断点续传 =====
async function uploadWithResume(file, userId) {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedChunks = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);
    formData.append('chunkIndex', i);
    formData.append('totalChunks', totalChunks);
    formData.append('userId', userId);

    const response = await fetch('/api/storage/upload/chunk', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('family_token')}` },
      body: formData,
    });

    if (!response.ok) {
      // 保存断点
      await localStorageService.put('offlineQueue', {
        id: `resume_${file.name}_${i}`,
        type: 'file_upload',
        fileName: file.name,
        chunkIndex: i,
        totalChunks,
        created_at: Date.now(),
        sync_status: 'pending',
      });
      throw { code: 'RESUME_REQUIRED' };
    }

    uploadedChunks++;
    if (syncProgressCallback) {
      syncProgressCallback({ type: 'file', synced: uploadedChunks, total: totalChunks });
    }
  }

  return { success: true, totalChunks };
}

// ===== 9.2 联网自动同步触发 =====
// 网络恢复后智能调度同步
async function triggerAutoSync(userId) {
  if (!isOnline) return;
  if (isSyncing) return;

  console.log('[9.2] 网络恢复，触发自动同步');

  // 优先处理高优先级数据
  const priorityTypes = ['kinship', 'persons', 'interviews', 'events', 'messages', 'books', 'photos'];

  for (const type of priorityTypes) {
    const lastTime = lastSyncTime[type] || 0;
    // 如果缓存过期，强制同步
    if (isCacheExpired(type)) {
      console.log(`[9.2] ${type} 缓存过期，强制同步`);
      await syncIncremental(type, 0, userId);
    } else {
      await syncIncremental(type, lastTime, userId);
    }
  }

  // 处理离线队列
  const queue = await getOfflineQueue();
  if (queue.length > 0) {
    console.log(`[9.2] 处理 ${queue.length} 条离线操作`);
    for (const item of queue) {
      const success = await retryWithBackoff(async () => {
        const response = await fetch(`/api/sync/${item.type}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item, userId }),
        });
        return response.ok;
      });
      await updateOfflineQueueStatus(item.id, success ? 'synced' : 'failed');
    }
  }
}

// ===== 网络状态监听 =====
function initNetworkListeners() {
  window.addEventListener('online', () => {
    isOnline = true;
    console.log('[F2.3] 网络恢复，触发同步');
    triggerAutoSync(localStorage.getItem('family_user_id') || 'anonymous');
  });
  window.addEventListener('offline', () => {
    isOnline = false;
    console.log('[F2.3] 网络断开');
  });
}

// ===== 导出 =====
export default {
  syncAll, syncIncremental, detectConflict, resolveConflict,
  uploadWithResume, setSyncProgressCallback: (cb) => { syncProgressCallback = cb; },
  setSyncCompleteCallback: (cb) => { syncCompleteCallback = cb; },
  initNetworkListeners,
  getLastSyncTime: () => ({ ...lastSyncTime }),

  // ===== 9.2 离线工作模式新增 =====
  OFFLINE_OPERATIONS,
  OFFLINE_CACHEABLE_TYPES,
  isCacheValid,
  isCacheExpired,
  getCacheStats,
  addToOfflineQueue,
  getOfflineQueue,
  clearOfflineQueue,
  clearOfflineQueueOlderThan,
  updateOfflineQueueStatus,
  getOfflineQueueStatus,
  triggerAutoSync,
  get isSyncing() { return isSyncing; },
};
