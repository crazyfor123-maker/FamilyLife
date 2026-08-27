// ===== API 封装：时间线模块 =====
import { get, post, put, del } from './request';

export async function getTimeline(spaceId) {
  return get(`/timeline/list/${spaceId}`);
}

export async function publishStory(data) {
  return post('/timeline/publish', data);
}

export async function updateStory(storyId, data) {
  return put(`/timeline/${storyId}`, data);
}

export async function deleteStory(storyId) {
  return del(`/timeline/${storyId}`);
}

export async function likeStory(storyId) {
  return post(`/timeline/${storyId}/like`);
}
