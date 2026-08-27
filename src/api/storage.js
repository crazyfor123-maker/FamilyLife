// ===== API 封装：搜索 + 存储模块 =====
import { get, post } from './request';

// 搜索
export async function search(query, spaceId, type) {
  const params = { q: query };
  if (spaceId) params.space_id = spaceId;
  if (type) params.type = type;
  return get('/search/search', params);
}

// 存储
export async function getLocalStatus() {
  return get('/storage/local/status');
}

export async function getCloudStatus() {
  return get('/storage/cloud/status');
}

export async function getSyncPending() {
  return get('/storage/sync/pending');
}

export async function triggerSync(spaceId) {
  return post('/storage/sync/trigger', { spaceId });
}

export async function completeSync(spaceId, dataType) {
  return post('/storage/sync/complete', { spaceId, dataType });
}

export async function getAiPrivacy() {
  return get('/storage/ai/privacy');
}

export async function aiAudit(data) {
  return post('/storage/ai/audit', data);
}

export async function desensitizeText(text) {
  return post('/storage/ai/desensitize', { text });
}

export async function getBackupHistory(spaceId) {
  return get(`/storage/${spaceId}/backup/history`);
}

export async function createBackup(spaceId, scope, password) {
  return post(`/storage/${spaceId}/backup`, { scope, password });
}

// F2.5/F2.6 备份下载
export async function downloadBackup(spaceId, backupId) {
  return post(`/storage/${spaceId}/backup/download`, { backup_id: backupId });
}

// F2.6 数据恢复
export async function restoreBackup(spaceId, backupData, restoreMode = 'full') {
  return post(`/storage/${spaceId}/restore`, {
    backup_data: backupData,
    restore_mode: restoreMode,
  });
}

// F2.6 ZIP导入（前端先解压后调用 restoreBackup）
export async function importZipBackup(spaceId, zipBase64) {
  return post('/storage/backup/import-zip', { spaceId, zip_data: zipBase64 });
}
