// ===== 协同编辑 API =====
import { get, post, put, del } from './request';

// 创建协同会话
export function createCollabSession(params) {
  return post('/collab/create', params);
}

// 加入协同会话
export function joinCollabSession(params) {
  return post('/collab/join', params);
}

// 获取会话状态
export function getCollabStatus(sessionId) {
  return get(`/collab/${sessionId}/status`);
}

// 获取参与者列表
export function getCollabParticipants(sessionId) {
  return get(`/collab/${sessionId}/participants`);
}

// 离开会话
export function leaveCollabSession(sessionId) {
  return post(`/collab/${sessionId}/leave`);
}

// 关闭会话
export function closeCollabSession(sessionId) {
  return del(`/collab/${sessionId}`);
}

// 更新光标
export function updateCollabCursor(sessionId, params) {
  return post(`/collab/${sessionId}/cursor`, params);
}

// 发送操作
export function sendCollabOp(sessionId, operation) {
  return post(`/collab/${sessionId}/op`, { operation });
}
