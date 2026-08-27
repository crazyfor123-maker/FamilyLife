// ===== API 封装：成员模块 =====
import { get, post, put, del } from './request';

export async function getMembers(spaceId, params = {}) {
  return get(`/member/${spaceId}`, params);
}

export async function inviteMember(spaceId, data) {
  return post(`/member/${spaceId}/invite`, data);
}

export async function revokeInvite(spaceId, token) {
  return del(`/member/${spaceId}/invite/${token}`);
}

export async function joinMember(inviteToken) {
  return post('/member/join', { inviteToken });
}

export async function removeMember(spaceId, userId) {
  return del(`/member/${spaceId}/members/${userId}`);
}

export async function updateMemberRole(spaceId, userId, role, editScope) {
  return put(`/member/${spaceId}/members/${userId}/role`, { role, edit_scope: editScope });
}

export async function transferOwner(spaceId, targetUserId) {
  return post(`/member/${spaceId}/transfer-owner`, { targetUserId });
}

export async function getPermission(spaceId) {
  return get(`/member/${spaceId}/permission`);
}
