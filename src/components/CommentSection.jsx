// ===== 评论组件 =====
import React, { useState, useEffect } from 'react';

/**
 * 评论组件
 * 评论列表、发表、回复、点赞
 */
function CommentSection({ storyId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // 加载评论
  const loadComments = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/comments/${storyId}?page=${pageNum}&pageSize=20`);
      const data = await res.json();
      if (data.code === 0) {
        if (pageNum === 1) {
          setComments(data.data.comments || []);
        } else {
          setComments(prev => [...prev, ...(data.data.comments || [])]);
        }
        setTotalPages(data.data.totalPages || 1);
      }
    } catch (err) {
      console.error('加载评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments(1);
  }, [storyId]);

  // 发表评论
  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
        },
        body: JSON.stringify({
          story_id: storyId,
          content: content.trim(),
          parent_comment_id: replyingTo || null,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        loadComments(1);
        setContent('');
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('发表评论失败:', err);
    }
  };

  // 点赞
  const handleLike = async (commentId) => {
    try {
      await fetch(`/api/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
        },
      });
      loadComments(page);
    } catch (err) {
      console.error('点赞失败:', err);
    }
  };

  // 格式化时间
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return d.toLocaleDateString('zh-CN');
  };

  return (
    <div style={{ marginTop: 20 }}>
      {/* 评论计数 */}
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#333' }}>
        💬 评论 ({comments.length})
      </div>

      {/* 发表区域 */}
      <div style={{
        background: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
      }}>
        {replyingTo && (
          <div style={{ fontSize: 12, color: '#4A6741', marginBottom: 8 }}>
            回复: <span style={{ fontWeight: 'bold' }}>@{replyingTo.author_name}</span>
            <button onClick={() => setReplyingTo(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyingTo ? `回复 @${replyingTo.author_name}` : '写下你的评论...'}
          rows={3}
          style={{
            width: '100%',
            padding: 8,
            border: '1px solid #dee2e6',
            borderRadius: 6,
            resize: 'vertical',
            fontSize: 14,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 12, color: '#6c757d' }}>
            {content.length}/500
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            style={{
              padding: '6px 20px',
              background: content.trim() ? '#4A6741' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: content.trim() ? 'pointer' : 'not-allowed',
              fontSize: 14,
            }}
          >
            发布
          </button>
        </div>
      </div>

      {/* 评论列表 */}
      <div>
        {comments.map((comment) => (
          <div key={comment.id} style={{
            padding: '12px 0',
            borderBottom: '1px solid #f0f0f0',
          }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {/* 头像 */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#4A6741',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                flexShrink: 0,
              }}>
                {comment.author_name?.charAt(0) || 'U'}
              </div>

              {/* 内容 */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 'bold', fontSize: 14 }}>{comment.author_name}</span>
                  <span style={{ fontSize: 11, color: '#6c757d' }}>{formatTime(comment.created_at)}</span>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 6 }}>
                  {comment.content}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6c757d' }}>
                  <button
                    onClick={() => handleLike(comment.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#dc3545',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ❤️ {comment.likes || 0}
                  </button>
                  <button
                    onClick={() => setReplyingTo(comment)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#4A6741',
                    }}
                  >
                    💬 回复
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 加载更多 */}
        {page < totalPages && (
          <button
            onClick={() => { setPage(p => p + 1); loadComments(page + 1); }}
            style={{
              display: 'block',
              margin: '12px auto',
              padding: '8px 24px',
              background: 'none',
              border: '1px solid #4A6741',
              color: '#4A6741',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            加载更多
          </button>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: 20, color: '#4A6741' }}>
            加载中...
          </div>
        )}

        {comments.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 20, color: '#6c757d' }}>
            暂无评论，来发表第一条评论吧~
          </div>
        )}
      </div>
    </div>
  );
}

export default CommentSection;
