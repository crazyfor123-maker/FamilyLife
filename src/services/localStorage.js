// ===== F2.1 本地存储管理 - 完整实现 =====
// 核心功能：AES-256-GCM加密 + 密钥派生 + 容量统计 + 数据隔离 + 索引优化

const DB_NAME = 'FamilyLifeRecord';
const DB_VERSION = 3;
const STORES = ['persons', 'interviews', 'books', 'offlineQueue', 'settings',
  'encryptedData', 'audioFiles', 'asrTexts', 'photos', 'photoFiles'];
const STORE_TYPE_MAP = {
  persons: 'person', interviews: 'interview', books: 'book',
  offlineQueue: 'system', settings: 'system', encryptedData: 'encrypted',
  audioFiles: 'audio', asrTexts: 'asr', photos: 'photo_meta', photoFiles: 'photo',
};
const STORE_LABELS = {
  person: '人物档案', interview: '采访数据', book: '人生之书',
  audio: '录音文件', asr: '转写文本', photo: '照片素材',
  photo_meta: '照片元数据', encrypted: '加密数据', system: '系统数据',
};

let db = null;
let currentUserId = null;
let keyCache = null;

// ===== 密钥管理（F2.1 核心） =====
async function deriveKey(userId) {
  if (keyCache && keyCache.userId === userId) return keyCache.key;
  const salt = new TextEncoder().encode('FamilyLifeRecord_Salt_2024_v1');
  const keyMaterial = await crypto.subtle.importKey('raw',
    new TextEncoder().encode(userId), { name: 'PBKDF2' }, false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  keyCache = { userId, key };
  return key;
}

async function encryptData(key, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plaintext));
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)),
    checksum: Array.from(new Uint8Array(hash)), timestamp: Date.now() };
}

async function decryptData(key, encrypted) {
  const iv = new Uint8Array(encrypted.iv);
  const data = new Uint8Array(encrypted.data);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const plaintext = new TextDecoder().decode(decrypted);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plaintext));
  const checksumMatch = Array.from(new Uint8Array(hash)).every((v, i) => v === encrypted.checksum[i]);
  if (!checksumMatch) throw new Error('数据已损坏，可从备份恢复');
  try { return JSON.parse(plaintext); } catch { return plaintext; }
}

// ===== IndexedDB 初始化 =====
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      STORES.forEach(store => {
        if (!database.objectStoreNames.contains(store)) {
          database.createObjectStore(store, { keyPath: 'id' });
        }
      });
    };
    request.onsuccess = () => { db = request.result; resolve(db); };
    request.onerror = () => reject(request.error);
  });
}

// ===== 通用加密存储 =====
async function encryptedPut(storeName, key, data, userId) {
  await openDB();
  const keyObj = await deriveKey(userId);
  const encrypted = await encryptData(keyObj, data);
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put({ id: key, data: encrypted, user_id: userId, updated_at: Date.now() });
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
}

async function encryptedGet(storeName, key, userId) {
  await openDB();
  const keyObj = await deriveKey(userId);
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const record = await new Promise((resolve, reject) => {
    const r = store.get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = reject;
  });
  if (!record || record.user_id !== userId) return null;
  return decryptData(keyObj, record.data);
}

// ===== 通用存储（非加密） =====
async function put(storeName, record) {
  await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(record);
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
}

async function get(storeName, key) {
  await openDB();
  const tx = db.transaction(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const r = tx.objectStore(storeName).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = reject;
  });
}

async function getAll(storeName) {
  await openDB();
  const tx = db.transaction(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const r = tx.objectStore(storeName).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = reject;
  });
}

async function del(storeName, key) {
  await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).delete(key);
  return new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
}

// ===== 索引优化（F2.1 Task 4） =====
async function queryByIndex(storeName, indexName, value) {
  await openDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  return new Promise((resolve, reject) => {
    const r = index.getAll(value);
    r.onsuccess = () => resolve(r.result);
    r.onerror = reject;
  });
}

// ===== 容量统计（F2.1 Task 2） =====
async function getStorageStats() {
  const stats = { totalRecords: 0, byType: {}, diskUsage: { available: -1 } };
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    stats.diskUsage = { usage: estimate.usage, quota: estimate.quota,
      available: estimate.quota - estimate.usage };
  }
  for (const store of STORES) {
    const records = await getAll(store).catch(() => []);
    const type = STORE_TYPE_MAP[store] || 'other';
    const size = records.reduce((sum, r) => sum + JSON.stringify(r).length, 0);
    if (!stats.byType[type]) stats.byType[type] = { count: 0, size: 0, label: STORE_LABELS[type] || type };
    stats.byType[type].count += records.length;
    stats.byType[type].size += size;
    stats.totalRecords += records.length;
  }
  return stats;
}

// ===== 按类型清理（F2.1 Task 3） =====
async function clearByType(type, userId) {
  let cleaned = 0;
  const storesToClear = Object.entries(STORE_TYPE_MAP).filter(([, t]) => t === type).map(([s]) => s);
  for (const store of storesToClear) {
    const records = await getAll(store).catch(() => []);
    for (const record of records) {
      if (record.user_id === userId) {
        await del(store, record.id);
        cleaned++;
      }
    }
  }
  return { cleaned };
}

async function clearAll() {
  await openDB();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ===== 数据隔离（F2.1 Task 5） =====
function setCurrentUser(userId) {
  currentUserId = userId;
  keyCache = null;
}

// ===== 原始录音与AI转写分开存储 =====
async function saveAudioFile(file, userId) {
  const id = `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return encryptedPut('audioFiles', id, { fileName: file.name, size: file.size, type: file.type }, userId);
}

async function saveASRText(text, userId) {
  const id = `asr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return encryptedPut('asrTexts', id, { text, length: text.length }, userId);
}

// ===== 离线队列管理 =====
async function addToOfflineQueue(item) {
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return put('offlineQueue', { id, ...item, created_at: Date.now(), sync_status: 'pending' });
}

async function getOfflineQueue() {
  const records = await getAll('offlineQueue');
  return records.filter(r => r.sync_status === 'pending').sort((a, b) => a.created_at - b.created_at);
}

async function updateOfflineQueueStatus(id, status) {
  const record = await get('offlineQueue', id);
  if (record) {
    record.sync_status = status;
    record.updated_at = Date.now();
    return put('offlineQueue', record);
  }
}

// ===== 导出 =====
export default {
  put, get, getAll, del, queryByIndex,
  encryptedPut, encryptedGet,
  getStorageStats, clearByType, clearAll,
  setCurrentUser, saveAudioFile, saveASRText,
  addToOfflineQueue, getOfflineQueue, updateOfflineQueueStatus,
};
