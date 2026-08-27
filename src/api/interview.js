// ===== API 封装：采访模块 =====
import { get, post, put, del } from './request';

export async function getInterviews(personId) {
  return get(`/interview/list/${personId}`);
}

export async function createInterview(data) {
  return post('/interview/create', data);
}

export async function getInterview(sessionId) {
  return get(`/interview/${sessionId}`);
}

export async function startInterview(sessionId) {
  return post(`/interview/${sessionId}/start`);
}

export async function pauseInterview(sessionId) {
  return post(`/interview/${sessionId}/pause`);
}

export async function resumeInterview(sessionId) {
  return post(`/interview/${sessionId}/resume`);
}

export async function completeInterview(sessionId) {
  return post(`/interview/${sessionId}/complete`);
}

export async function deleteInterview(sessionId) {
  return del(`/interview/${sessionId}`);
}

export async function getDrafts(spaceId) {
  return get(`/interview/drafts/${spaceId}`);
}
