// ===== ASR API =====
import { get, post } from './request';

// 获取ASR配置
export function getASRConfig() {
  return get('/asr/config');
}

// 文件转写
export function recognizeASR(params) {
  return post('/asr/recognize', params);
}

// 获取转写结果
export function getTranscripts(sessionId) {
  return get(`/asr/transcripts/${sessionId}`);
}

// 更新转写结果
export function updateTranscript(params) {
  return post('/asr/transcripts/update', params);
}
