// ===== 工具函数 =====
const { v4: uuidv4 } = require('uuid');

function generateToken() {
  return uuidv4().replace(/-/g, '');
}

function generateInviteToken() {
  return uuidv4().replace(/-/g, '');
}

function formatTime(date = new Date()) {
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

function toMySQLDateTime(date) {
  // 将 Date 对象转为 MySQL DATETIME 字符串（UTC+8）
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${mi}:${s}`;
}

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toMySQLDateTime(d);
}

function hoursFromNow(hours) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return toMySQLDateTime(d);
}

// 手机号格式校验
function validatePhone(phone) {
  return /^1\d{10}$/.test(phone);
}

// 错误码映射
const ERROR_CODES = {
  // 账号
  INVALID_PHONE: 10001,
  INVALID_CODE: 10002,
  CODE_EXPIRED: 10003,
  ACCOUNT_LOCKED: 10004,
  TOKEN_EXPIRED: 10005,
  // 权限
  NO_PERMISSION: 20001,
  EDIT_SCOPE_CHANGED: 20002,
  // 族谱
  PERSON_NOT_FOUND: 30001,
  RELATION_CONFLICT: 30002,
  RELATION_DUPLICATE: 30003,
  GENERATION_CONFLICT: 30004,
  // 采访
  MIC_PERMISSION_DENIED: 40001,
  AI_SERVICE_UNAVAILABLE: 40002,
  ASR_FAILED: 40003,
  LOCAL_MODEL_NOT_DOWNLOADED: 40004,
  // 人生之书
  INSUFFICIENT_MATERIALS: 50001,
  GENERATION_FAILED: 50002,
  PDF_EXPORT_FAILED: 50003,
  CHAPTER_LOCKED: 50004,
  // 存储
  LOCAL_STORAGE_FULL: 60001,
  CLOUD_STORAGE_FULL: 60002,
  SYNC_FAILED: 60003,
  DATA_CONFLICT: 60004,
  // 网络
  NETWORK_DISCONNECTED: 70001,
  SERVER_UNREACHABLE: 70002,
  REQUEST_TIMEOUT: 70003,
  // 通用
  OPERATION_FAILED: 90001,
  INVALID_PARAMS: 90002,
  SYSTEM_ERROR: 90003,
};

module.exports = {
  generateToken,
  generateInviteToken,
  formatTime,
  daysFromNow,
  hoursFromNow,
  validatePhone,
  ERROR_CODES,
};
