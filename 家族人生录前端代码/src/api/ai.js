// ===== AI API =====
import { get, post } from './request';

// 获取AI配置
export function getAIConfig() {
  return get('/ai/config');
}

// 测试AI连接
export function testAIConnection() {
  return post('/ai/test-connection', {});
}

// AI生成下一个问题
export function generateQuestion(params) {
  return post('/ai/generate-question', params);
}

// AI生成人生之书章节
export function generateStory(params) {
  return post('/ai/generate-story', params);
}

// AI分析素材
export function analyzeMaterial(params) {
  return post('/ai/analyze-material', params);
}

// AI动态追问
export function generateFollowup(params) {
  return post('/ai/generate-followup', params);
}

// 获取所有Prompt模板
export function getPromptTemplates() {
  return get('/ai/prompts');
}
