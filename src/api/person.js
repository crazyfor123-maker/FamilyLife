// ===== API 封装：人物模块 =====
import { get, post, put, del } from './request';

export async function getPersons(spaceId) {
  return get(`/person/list/${spaceId}`);
}

export async function createPerson(data) {
  return post('/person/create', data);
}

export async function getPerson(personId) {
  return get(`/person/${personId}`);
}

export async function updatePerson(personId, data) {
  return put(`/person/${personId}`, data);
}

export async function deletePerson(personId) {
  return del(`/person/${personId}`);
}

// ===== F3.9 个人家族寄语 =====
export async function getPersonMessages(personId) {
  return get(`/person/${personId}/messages`);
}

export async function createPersonMessage(personId, data) {
  return post(`/person/${personId}/messages`, data);
}

export async function deletePersonMessage(personId, messageId) {
  return del(`/person/${personId}/messages/${messageId}`);
}
