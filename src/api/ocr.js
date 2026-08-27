// ===== OCR API =====
import { get, post } from './request';

// 获取OCR配置
export function getOCRConfig() {
  return get('/ocr/config');
}

// 上传图片
export function uploadOCRImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  return post('/ocr/upload', formData, true);
}

// OCR识别
export function recognizeOCR(params) {
  return post('/ocr/recognize', params);
}

// OCR识别（直接上传文件）
export function recognizeOCRWithFile(file, options = {}) {
  const formData = new FormData();
  formData.append('image', file);
  if (options.vertical_text) formData.append('vertical_text', 'true');
  if (options.handwriting) formData.append('handwriting', 'true');
  return post('/ocr/recognize/image', formData, true);
}

// 结构化解析
export function parseGenealogy(params) {
  return post('/ocr/parse', params);
}

// 智能建档
export function smartBuild(params) {
  return post('/ocr/smart-build', params);
}

// 批量导入
export function batchImport(params) {
  return post('/ocr/batch-import', params);
}

// OCR结果列表
export function getOCRResults(spaceId) {
  return get(`/ocr/${spaceId}/results`);
}

// OCR历史列表
export function getOCRHistory(spaceId) {
  return get(`/ocr/${spaceId}/history`);
}

// 校对OCR结果
export function reviewOCRResult(spaceId, resultId, data) {
  return post(`/ocr/${spaceId}/review/${resultId}`, data);
}

// 确认OCR结果
export function confirmOCRResult(spaceId, resultId) {
  return post(`/ocr/${spaceId}/review/${resultId}/confirm`, {});
}

// 拒绝OCR结果
export function rejectOCRResult(spaceId, resultId) {
  return post(`/ocr/${spaceId}/review/${resultId}/reject`, {});
}

// 删除OCR结果
export function deleteOCRResult(spaceId, resultId) {
  return del(`/ocr/${spaceId}/review/${resultId}`);
}

// 删除OCR历史
export function deleteOCRHistory(spaceId, historyId) {
  return del(`/ocr/${spaceId}/history/${historyId}`);
}

// 重新识别
export function reOCR(spaceId, historyId) {
  return post(`/ocr/${spaceId}/re-recognize/${historyId}`, {});
}
