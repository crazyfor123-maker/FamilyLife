// ===== TTS API =====
import { get, post } from './request';

// 获取可用语音
export function getTTSVoices() {
  return get('/tts/config');
}

// 合成语音
export function synthesizeTTS(params) {
  return post('/tts/synthesize', params);
}

// 获取音频URL
export function getAudioUrl(sessionId, questionIndex) {
  return get(`/tts/audio/${sessionId}/${questionIndex}`);
}

// 批量合成
export function batchSynthesize(params) {
  return post('/tts/batch', params);
}
