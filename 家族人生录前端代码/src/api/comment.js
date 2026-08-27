// ===== 评论 API =====
import { get, post, del } from './request';

// 创建评论
export function createComment(params) {
  return post('/comments', params);
}

// 获取评论列表
export function getComments(storyId, page = 1, pageSize = 20) {
  return get(`/comments/${storyId}?page=${page}&pageSize=${pageSize}`);
}

// 点赞评论
export function likeComment(commentId) {
  return post(`/comments/${commentId}/like`);
}

// 删除评论
export function deleteComment(commentId) {
  return del(`/comments/${commentId}`);
}

// 回复评论
export function replyComment(params) {
  return post('/comments', params);
}

// 获取回复列表
export function getReplies(commentId, page = 1, pageSize = 20) {
  return get(`/comments/${commentId}/replies?page=${page}&pageSize=${pageSize}`);
}
