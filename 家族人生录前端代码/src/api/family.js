// ===== API 封装：家族模块 =====
import { get, post, put, del } from './request';

export async function getFamilies() {
  return get('/family/list');
}

export async function createFamily(data) {
  return post('/family/create', data);
}

export async function getFamily(spaceId) {
  return get(`/family/${spaceId}`);
}

export async function updateFamily(spaceId, data) {
  return put(`/family/${spaceId}`, data);
}

export async function deleteFamily(spaceId) {
  return del(`/family/${spaceId}`);
}

export async function switchFamily(spaceId) {
  return post('/family/switch', { spaceId });
}
