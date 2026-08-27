// ===== API 封装：留言模块 =====
import { get, post, del } from './request';

export async function getMessages(spaceId) {
  return get(`/message/list/${spaceId}`);
}

export async function publishMessage(data) {
  return post('/message/publish', data);
}

export async function likeMessage(messageId) {
  return post(`/message/${messageId}/like`);
}

export async function deleteMessage(messageId) {
  return del(`/message/${messageId}`);
}
