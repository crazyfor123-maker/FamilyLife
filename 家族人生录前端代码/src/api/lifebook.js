// ===== API 封装：人生之书模块 =====
import { get, post, put, del } from './request';

export async function getLifeBooks(personId) {
  return get(`/lifebook/list/${personId}`);
}

export async function createLifeBook(data) {
  return post('/lifebook/create', data);
}

export async function getLifeBook(bookId) {
  return get(`/lifebook/${bookId}`);
}

export async function generateLifeBook(bookId, chapters) {
  return post(`/lifebook/${bookId}/generate`, { chapters });
}

export async function updateLifeBook(bookId, data) {
  return put(`/lifebook/${bookId}`, data);
}

export async function getLifeBookVersions(bookId) {
  return get(`/lifebook/${bookId}/versions`);
}

export async function exportPdf(bookId) {
  return post(`/lifebook/${bookId}/export-pdf`);
}

export async function deleteLifeBook(bookId) {
  return del(`/lifebook/${bookId}`);
}
