// ===== API 请求封装 =====
const API_BASE = '/api';

// 从 localStorage 获取 token
function getToken() {
  return localStorage.getItem('flr_token') || '';
}

// 通用请求方法
async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  // 登录态失效，清除 token
  if (data.code === 10005) {
    localStorage.removeItem('flr_token');
    localStorage.removeItem('flr_user');
    window.location.hash = '#login';
  }

  return data;
}

export const api = {
  // ===== 认证 =====
  auth: {
    sendCode(phone) {
      return request('/auth/send-code', { method: 'POST', body: { phone } });
    },
    login(phone, code) {
      return request('/auth/login', { method: 'POST', body: { phone, code } });
    },
    autoLogin() {
      return request('/auth/auto-login', { method: 'POST' });
    },
    logout() {
      return request('/auth/logout', { method: 'POST' });
    },
    getMe() {
      return request('/auth/me');
    },
    updateMe(data) {
      return request('/auth/me', { method: 'PUT', body: data });
    },
  },

  // ===== 家族空间 =====
  family: {
    list() {
      return request('/family/list');
    },
    create(data) {
      return request('/family/create', { method: 'POST', body: data });
    },
    get(spaceId) {
      return request(`/family/${spaceId}`);
    },
    update(spaceId, data) {
      return request(`/family/${spaceId}`, { method: 'PUT', body: data });
    },
    delete(spaceId) {
      return request(`/family/${spaceId}`, { method: 'DELETE' });
    },
    switch(spaceId) {
      return request('/family/switch', { method: 'POST', body: { spaceId } });
    },
  },

  // ===== 成员管理 =====
  member: {
    list(spaceId) {
      return request(`/member/${spaceId}`);
    },
    invite(spaceId, data) {
      return request(`/member/${spaceId}/invite`, { method: 'POST', body: data });
    },
    revokeInvite(spaceId, token) {
      return request(`/member/${spaceId}/invite/${token}`, { method: 'DELETE' });
    },
    join(inviteToken) {
      return request('/member/join', { method: 'POST', body: { inviteToken } });
    },
    remove(spaceId, userId) {
      return request(`/member/${spaceId}/members/${userId}`, { method: 'DELETE' });
    },
    updateRole(spaceId, userId, role) {
      return request(`/member/${spaceId}/members/${userId}/role`, { method: 'PUT', body: { role } });
    },
  },

  // ===== 人物档案 =====
  person: {
    list(spaceId) {
      return request(`/person/list/${spaceId}`);
    },
    create(data) {
      return request('/person/create', { method: 'POST', body: data });
    },
    get(personId) {
      return request(`/person/${personId}`);
    },
    update(personId, data) {
      return request(`/person/${personId}`, { method: 'PUT', body: data });
    },
    delete(personId) {
      return request(`/person/${personId}`, { method: 'DELETE' });
    },
  },

  // ===== 亲属关系 =====
  kinship: {
    getTypes() {
      return request('/kinship/types');
    },
    getRelations(personId) {
      return request(`/kinship/${personId}/relations`);
    },
    create(personA, data) {
      return request(`/kinship/${personA}/relations`, { method: 'POST', body: data });
    },
    update(relationId, data) {
      return request(`/kinship/${relationId}`, { method: 'PUT', body: data });
    },
    delete(relationId) {
      return request(`/kinship/${relationId}`, { method: 'DELETE' });
    },
    updateNote(relationId, notes) {
      return request(`/kinship/${relationId}/note`, { method: 'PUT', body: { notes } });
    },
  },

  // ===== 采访 =====
  interview: {
    list(personId) {
      return request(`/interview/list/${personId}`);
    },
    create(data) {
      return request('/interview/create', { method: 'POST', body: data });
    },
    get(sessionId) {
      return request(`/interview/${sessionId}`);
    },
    start(sessionId) {
      return request(`/interview/${sessionId}/start`, { method: 'POST' });
    },
    pause(sessionId) {
      return request(`/interview/${sessionId}/pause`, { method: 'POST' });
    },
    resume(sessionId) {
      return request(`/interview/${sessionId}/resume`, { method: 'POST' });
    },
    complete(sessionId) {
      return request(`/interview/${sessionId}/complete`, { method: 'POST' });
    },
    getDrafts(spaceId) {
      return request(`/interview/drafts/${spaceId}`);
    },
    delete(sessionId) {
      return request(`/interview/${sessionId}`, { method: 'DELETE' });
    },
  },

  // ===== 人生之书 =====
  lifebook: {
    list(personId) {
      return request(`/lifebook/list/${personId}`);
    },
    create(data) {
      return request('/lifebook/create', { method: 'POST', body: data });
    },
    get(bookId) {
      return request(`/lifebook/${bookId}`);
    },
    generate(bookId, chapters) {
      return request(`/lifebook/${bookId}/generate`, { method: 'POST', body: { chapters } });
    },
    update(bookId, data) {
      return request(`/lifebook/${bookId}`, { method: 'PUT', body: data });
    },
    getVersions(bookId) {
      return request(`/lifebook/${bookId}/versions`);
    },
    exportPdf(bookId) {
      return request(`/lifebook/${bookId}/export-pdf`, { method: 'POST' });
    },
    delete(bookId) {
      return request(`/lifebook/${bookId}`, { method: 'DELETE' });
    },
  },

  // ===== 时间墙 =====
  timeline: {
    list(spaceId) {
      return request(`/timeline/list/${spaceId}`);
    },
    publish(data) {
      return request('/timeline/publish', { method: 'POST', body: data });
    },
    update(storyId, data) {
      return request(`/timeline/${storyId}`, { method: 'PUT', body: data });
    },
    delete(storyId) {
      return request(`/timeline/${storyId}`, { method: 'DELETE' });
    },
    like(storyId) {
      return request(`/timeline/${storyId}/like`, { method: 'POST' });
    },
  },

  // ===== 大事记 =====
  events: {
    list(spaceId) {
      return request(`/events/list/${spaceId}`);
    },
    create(data) {
      return request('/events/create', { method: 'POST', body: data });
    },
    update(eventId, data) {
      return request(`/events/${eventId}`, { method: 'PUT', body: data });
    },
    delete(eventId) {
      return request(`/events/${eventId}`, { method: 'DELETE' });
    },
  },

  // ===== 留言板 =====
  message: {
    list(spaceId) {
      return request(`/message/list/${spaceId}`);
    },
    publish(data) {
      return request('/message/publish', { method: 'POST', body: data });
    },
    like(messageId) {
      return request(`/message/${messageId}/like`, { method: 'POST' });
    },
    delete(messageId) {
      return request(`/message/${messageId}`, { method: 'DELETE' });
    },
  },

  // ===== 搜索 =====
  search: {
    search(q, spaceId, type) {
      const params = new URLSearchParams({ q });
      if (spaceId) params.set('space_id', spaceId);
      if (type) params.set('type', type);
      return request(`/search/search?${params}`);
    },
  },

  // ===== 评论 =====
  comments: {
    // 按 story_id 查询
    list(storyId) {
      return request(`/comments?story_id=${storyId}`);
    },
    // 按 person_id 查询
    listByPerson(personId) {
      return request(`/comments?person_id=${personId}`);
    },
    create(data) {
      return request('/comments', { method: 'POST', body: data });
    },
    like(commentId) {
      return request(`/comments/${commentId}/like`, { method: 'POST' });
    },
    delete(commentId) {
      return request(`/comments/${commentId}`, { method: 'DELETE' });
    },
  },

  // ===== 分享 =====
  share: {
    generate(bookId, data) {
      return request(`/share/${bookId}/generate`, { method: 'POST', body: data });
    },
    update(bookId, data) {
      return request(`/share/${bookId}`, { method: 'PUT', body: data });
    },
    stats(shareToken) {
      return request(`/share/${shareToken}/stats`);
    },
    revoke(shareToken) {
      return request(`/share/${shareToken}/revoke`, { method: 'POST' });
    },
  },

  // ===== 云端存储 =====
  storage: {
    // 兼容 query param 方式
    list(spaceId) {
      return request(`/storage/list?space_id=${spaceId}`);
    },
    all() {
      return request('/storage/list');
    },
    upload(spaceId, data) {
      return request(`/storage/${spaceId}/upload`, { method: 'POST', body: data });
    },
    download(fileId) {
      return request(`/storage/${fileId}/download`);
    },
    delete(spaceId, fileId) {
      return request(`/storage/${spaceId}/files/${fileId}`, { method: 'DELETE' });
    },
    backup(spaceId) {
      return request(`/storage/${spaceId}/backup`, { method: 'POST' });
    },
  },

  // ===== 采访提纲 =====
  interviewOutline: {
    default(personId) {
      const params = new URLSearchParams();
      if (personId) params.set('personId', personId);
      return request(`/interview/outline/default?${params}`);
    },
  },
};
