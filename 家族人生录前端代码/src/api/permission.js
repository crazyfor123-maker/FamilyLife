// ===== 权限管理 API =====
import { get, post, put, del } from './request';

export async function getPermission(spaceId) {
  return get(`/member/${spaceId}/permission`);
}

export async function updateMemberRole(spaceId, userId, role, editScope) {
  return put(`/member/${spaceId}/members/${userId}/role`, { role, edit_scope: editScope });
}

export async function transferOwner(spaceId, targetUserId) {
  return post(`/member/${spaceId}/transfer-owner`, { targetUserId });
}

export async function getMemberEditLog(spaceId, userId) {
  return get(`/member/${spaceId}/members/${userId}/edit-log`);
}

// ===== 权限常量 =====
export const ROLE = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
};

export const PERMISSIONS = {
  // Owner 拥有全部权限
  owner: ['create', 'edit', 'delete', 'manage_members', 'manage_settings', 'export_data', 'manage_roles'],
  // Admin 拥有除转移所有权外的全部权限
  admin: ['create', 'edit', 'delete', 'manage_members', 'manage_settings', 'export_data'],
  // Member 可以创建和编辑，不能删除和管人
  member: ['create', 'edit'],
  // Viewer 只读
  viewer: ['view'],
};

/**
 * 检查用户是否有指定权限
 * @param {string} userRole - 用户角色
 * @param {string|string[]} requiredPermission - 需要的权限
 * @returns {boolean}
 */
export function hasPermission(userRole, requiredPermission) {
  const allowed = PERMISSIONS[userRole];
  if (!allowed) return false;
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(p => allowed.includes(p));
  }
  return allowed.includes(requiredPermission);
}

/**
 * 检查用户是否有全部指定权限
 */
export function hasAllPermissions(userRole, requiredPermissions) {
  const allowed = PERMISSIONS[userRole];
  if (!allowed) return false;
  return requiredPermissions.every(p => allowed.includes(p));
}

/**
 * 获取用户可编辑的角色列表（owner 可编辑的）
 */
export function getEditableRoles(userRole) {
  if (userRole === ROLE.OWNER) {
    return [ROLE.ADMIN, ROLE.MEMBER, ROLE.VIEWER];
  }
  if (userRole === ROLE.ADMIN) {
    return [ROLE.MEMBER, ROLE.VIEWER];
  }
  return [];
}

/**
 * 检查是否可以删除（需要 owner 或 admin 权限）
 */
export function canDelete(userRole) {
  return userRole === ROLE.OWNER || userRole === ROLE.ADMIN;
}

/**
 * 检查是否可以管理成员
 */
export function canManageMembers(userRole) {
  return userRole === ROLE.OWNER || userRole === ROLE.ADMIN;
}

/**
 * 检查是否可以导出数据
 */
export function canExport(userRole) {
  return userRole === ROLE.OWNER || userRole === ROLE.ADMIN;
}

/**
 * 检查是否可以管理角色
 */
export function canManageRoles(userRole) {
  return userRole === ROLE.OWNER;
}
