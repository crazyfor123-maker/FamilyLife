// ===== 分享 API =====
import { get, post, put, del } from './request';

// 生成分享链接
export function generateShare(params) {
  return post('/share/generate', params);
}

// 获取分享页面数据
export function getShareData(token) {
  return get(`/share/${token}`);
}

// 获取分享统计
export function getShareStats(token) {
  return get(`/share/${token}/stats`);
}

// 更新分享权限
export function updateSharePermissions(token, permissions) {
  return put(`/share/${token}/permissions`, { permissions });
}

// 取消分享
export function revokeShare(token) {
  return del(`/share/${token}`);
}

// 记录访问
export function recordShareView(token, bookId) {
  return post(`/share/${token}/view`, { book_id: bookId });
}

// 点赞
export function likeShare(token, bookId) {
  return post(`/share/${token}/like`, { book_id: bookId });
}
