// ===== 全局搜索 API =====
import request from './request.js';

// 全局搜索
export async function search(keyword, params = {}) {
  const { space_id, type, page = 1, page_size = 20 } = params;
  const query = new URLSearchParams({ keyword, page, page_size });
  if (space_id) query.append('space_id', space_id);
  if (type) query.append('type', type);
  return request.get(`/api/search?${query}`);
}

// 搜索建议
export async function searchSuggestions(keyword) {
  return request.get(`/api/search/suggestions?keyword=${encodeURIComponent(keyword)}`);
}
