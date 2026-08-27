// ===== API 封装：认证模块 =====
import { get, post, put, setToken, clearToken } from './request';

export async function sendCode(phone) {
  return post('/auth/send-code', { phone });
}

export async function login(phone, code) {
  const res = await post('/auth/login', { phone, code });
  if (res.code === 0 && res.data?.token) {
    setToken(res.data.token);
  }
  return res;
}

export async function autoLogin() {
  return post('/auth/auto-login');
}

export async function logout() {
  clearToken();
  return post('/auth/logout');
}

export async function getMe() {
  return get('/auth/me');
}

export async function updateMe(data) {
  return put('/auth/me', data);
}
