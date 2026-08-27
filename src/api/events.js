// ===== API 封装：大事记模块 =====
import { get, post, put, del } from './request';

export async function getEvents(spaceId) {
  return get(`/events/list/${spaceId}`);
}

export async function createEvent(data) {
  return post('/events/create', data);
}

export async function updateEvent(eventId, data) {
  return put(`/events/${eventId}`, data);
}

export async function deleteEvent(eventId) {
  return del(`/events/${eventId}`);
}
