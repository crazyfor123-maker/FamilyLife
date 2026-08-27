// ===== 书籍分享页面 =====
import React, { useState } from 'react';

/**
 * 书籍分享页面
 * 生成分享链接、设置权限、查看统计
 */
function BookSharePage({ bookId, bookTitle }) {
  const [shareUrl, setShareUrl] = useState('');
  const [permissions, setPermissions] = useState({
    canView: true,
    canDownload: false,
    canComment: false,
  });
  const [expiresIn, setExpiresIn] = useState(30);
  const [maxViews, setMaxViews] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [shareToken, setShareToken] = useState(null);

  // 生成分享链接
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/share/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
        },
        body: JSON.stringify({
          book_id: bookId,
          permissions,
          expires_in_days: expiresIn,
          max_views: maxViews,
        }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShareUrl(data.data.share_url);
        setShareToken(data.data.share_token);
        alert('分享链接已生成！');
      }
    } catch (err) {
      alert('生成失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 查看统计
  const handleViewStats = async () => {
    if (!shareToken) return;
    try {
      const res = await fetch(`/api/share/${shareToken}/stats`);
      const data = await res.json();
      if (data.code === 0) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('获取统计失败:', err);
    }
  };

  // 取消分享
  const handleRevoke = async () => {
    if (!shareToken) return;
    if (!confirm('确定要取消分享吗？')) return;

    try {
      await fetch(`/api/share/${shareToken}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
        },
      });
      setShareUrl('');
      setShareToken(null);
      setStats(null);
      alert('分享已取消');
    } catch (err) {
      alert('取消失败: ' + err.message);
    }
  };

  // 复制链接
  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => {
      alert('链接已复制到剪贴板');
    }).catch(() => {
      // fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      alert('链接已复制');
    });
  };

  const expiresInLabels = {
    7: '7天',
    30: '30天',
    90: '90天',
    -1: '永久',
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📤 书籍分享</h2>

      {/* 书籍信息 */}
      <div style={{
        background: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{bookTitle || '人生之书'}</div>
        <div style={{ fontSize: 13, color: '#6c757d' }}>设置权限后生成分享链接</div>
      </div>

      {/* 权限设置 */}
      <div style={{
        background: 'white',
        border: '1px solid #e9ecef',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: 12 }}>⚙️ 权限设置</div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={permissions.canView}
              onChange={(e) => setPermissions(p => ({ ...p, canView: e.target.checked }))}
            />
            {' '}允许查看
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={permissions.canDownload}
              onChange={(e) => setPermissions(p => ({ ...p, canDownload: e.target.checked }))}
            />
            {' '}允许下载
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={permissions.canComment}
              onChange={(e) => setPermissions(p => ({ ...p, canComment: e.target.checked }))}
            />
            {' '}允许评论
          </label>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>有效期</label>
          <select
            value={expiresIn}
            onChange={(e) => setExpiresIn(parseInt(e.target.value))}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #dee2e6' }}
          >
            <option value={7}>7天</option>
            <option value={30}>30天</option>
            <option value={90}>90天</option>
            <option value={-1}>永久</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>最大访问次数（-1为不限）</label>
          <input
            type="number"
            value={maxViews}
            onChange={(e) => setMaxViews(parseInt(e.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #dee2e6',
              width: 120,
            }}
          />
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: '#4A6741',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontSize: 16,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: 16,
        }}
      >
        {loading ? '⏳ 生成中...' : '📤 生成分享链接'}
      </button>

      {/* 分享链接 */}
      {shareUrl && (
        <div style={{
          background: '#e8f5e9',
          border: '1px solid #c8e6c9',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>✅ 分享链接已生成</div>
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <input
              readOnly
              value={shareUrl}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #c8e6c9',
                borderRadius: 6,
                background: 'white',
                fontSize: 13,
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: '8px 16px',
                background: '#4A6741',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              📋 复制
            </button>
          </div>
          <div style={{ fontSize: 12, color: '#6c757d' }}>
            有效期: {expiresInLabels[expiresIn] || `${expiresIn}天`}
            {maxViews > 0 && ` · 最多 ${maxViews} 次访问`}
          </div>
        </div>
      )}

      {/* 统计 */}
      {shareToken && (
        <div style={{
          background: 'white',
          border: '1px solid #e9ecef',
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 'bold' }}>📊 访问统计</div>
            <button onClick={handleViewStats} style={{
              padding: '4px 12px',
              background: 'none',
              border: '1px solid #4A6741',
              color: '#4A6741',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}>
              🔄 刷新
            </button>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#4A6741' }}>{stats.view_count}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>访问量</div>
              </div>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#dc3545' }}>{stats.like_count}</div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>点赞数</div>
              </div>
            </div>
          )}

          <button
            onClick={handleRevoke}
            style={{
              marginTop: 12,
              width: '100%',
              padding: '8px 16px',
              background: 'none',
              border: '1px solid #dc3545',
              color: '#dc3545',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            🗑️ 取消分享
          </button>
        </div>
      )}
    </div>
  );
}

export default BookSharePage;
