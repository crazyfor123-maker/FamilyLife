// ===== HTTP 请求工具 =====
// Phase 0.2: 支持环境变量/本地开发配置
const API_BASE = (function() {
  // 1. 优先使用环境变量
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }
  // 2. 开发环境默认 localhost
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:3000/api';
  }
  // 3. 生产环境：使用相对路径（Nginx 反向代理）
  return '/api';
})();

function getToken() {
  return localStorage.getItem('family_token') || '';
}

function getHeaders(extra = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(url, options = {}) {
  const { method = 'GET', body, ...rest } = options;
  const fetchOptions = {
    method,
    headers: getHeaders(rest.headers || {}),
    ...rest,
  };
  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${url}`, fetchOptions);
  const data = await response.json();

  if (!response.ok) {
    // Token过期，清除并返回错误
    if (response.status === 401) {
      localStorage.removeItem('family_token');
    }
    return { code: data.code || 90001, message: data.message || '请求失败', data: null };
  }

  return data;
}

export async function get(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  const fullPath = query ? `${url}?${query}` : url;
  return request(fullPath, { method: 'GET' });
}

export async function post(url, body) {
  return request(url, { method: 'POST', body });
}

export async function put(url, body) {
  return request(url, { method: 'PUT', body });
}

export async function del(url) {
  return request(url, { method: 'DELETE' });
}

export function setToken(token) {
  localStorage.setItem('family_token', token);
}

export function clearToken() {
  localStorage.removeItem('family_token');
}
