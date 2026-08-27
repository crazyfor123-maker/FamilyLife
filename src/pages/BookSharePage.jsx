// ===== 书籍分享页面 =====
function BookSharePage({ bookId, bookTitle }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [shareUrl, setShareUrl] = React.useState('');
  const [permissions, setPermissions] = React.useState({ canView: true, canDownload: false, canComment: false });
  const [expiresIn, setExpiresIn] = React.useState(30);
  const [maxViews, setMaxViews] = React.useState(-1);
  const [loading, setLoading] = React.useState(false);
  const [stats, setStats] = React.useState(null);
  const [shareToken, setShareToken] = React.useState(null);
  const [shareList, setShareList] = React.useState([]);

  React.useEffect(() => { loadShareList(); }, [spaceId]);

  const loadShareList = async () => {
    try {
      const { get } = await import('../api/request');
      const res = await get(`/share/${spaceId}/list`);
      if (res?.code === 0) setShareList(res.data || []);
    } catch {}
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/share/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('family_token')}` },
        body: JSON.stringify({ book_id: bookId, permissions, expires_in_days: expiresIn, max_views: maxViews }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setShareUrl(data.data.share_url);
        setShareToken(data.data.share_token);
        showToast('✅ 分享链接已生成');
        loadShareList();
      } else { showToast(data.message || '生成失败'); }
    } catch (err) { showToast('生成失败: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleViewStats = async () => {
    if (!shareToken) return;
    try {
      const res = await fetch(`/api/share/${shareToken}/stats`);
      const data = await res.json();
      if (data.code === 0) setStats(data.data);
    } catch (err) { console.error('获取统计失败:', err); }
  };

  const handleRevoke = async () => {
    if (!shareToken) return;
    if (!confirm('确定要取消分享吗？')) return;
    try {
      await fetch(`/api/share/${shareToken}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('family_token')}` },
      });
      setShareUrl(''); setShareToken(null); setStats(null);
      showToast('分享已取消');
      loadShareList();
    } catch (err) { showToast('取消失败: ' + err.message); }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(shareUrl).then(() => showToast('链接已复制')).catch(() => showToast('复制失败'));
  };

  const handleShareLink = async () => {
    if (navigator.share && shareUrl) {
      try { await navigator.share({ title: bookTitle || '人生之书', text: '欢迎查看我的家族人生之书', url: shareUrl }); } catch {}
    } else { handleCopy(); }
  };

  const expiresInLabels = { 7: '7天', 30: '30天', 90: '90天', -1: '永久' };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📤 书籍分享" showBack={true} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 书籍信息 */}
        <div className="card-paper" style={{ padding: '20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4, fontFamily: 'var(--font-serif)' }}>
            {bookTitle || '人生之书'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>设置权限后生成分享链接</div>
        </div>

        {/* 权限设置 */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 12 }}>⚙️ 权限设置</div>
          {[
            { key: 'canView', label: '👁️ 允许查看' },
            { key: 'canDownload', label: '📥 允许下载' },
            { key: 'canComment', label: '💬 允许评论' },
          ].map(item => (
            <label key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-light)', cursor: 'pointer' }}>
              <span style={{ fontSize: 14, color: 'var(--ink-primary)' }}>{item.label}</span>
              <input type="checkbox" checked={permissions[item.key]} onChange={e => setPermissions(p => ({ ...p, [item.key]: e.target.checked }))}
                style={{ width: 20, height: 20, accentColor: 'var(--ink-green)' }} />
            </label>
          ))}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 8 }}>有效期</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[7, 30, 90, -1].map(v => (
                <button key={v} onClick={() => setExpiresIn(v)} style={{
                  padding: '6px 14px', border: `1.5px solid ${expiresIn === v ? 'var(--ink-green)' : 'var(--line-soft)'}`,
                  borderRadius: 20, background: expiresIn === v ? '#E8F5E9' : 'white',
                  cursor: 'pointer', fontSize: 13, color: expiresIn === v ? 'var(--ink-green)' : 'var(--ink-primary)',
                }}>{expiresInLabels[v]}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 8 }}>最大访问次数（-1为不限）</div>
            <input type="number" value={maxViews} onChange={e => setMaxViews(parseInt(e.target.value) || -1)}
              style={{ width: 120, padding: '8px 12px', border: '1.5px solid var(--line-soft)', borderRadius: 8, fontSize: 14 }} />
          </div>
        </div>

        {/* 生成按钮 */}
        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16, marginBottom: 16 }}
          onClick={handleGenerate} disabled={loading}>
          {loading ? '⏳ 生成中...' : '📤 生成分享链接'}
        </button>

        {/* 分享链接 */}
        {shareUrl && (
          <div className="card" style={{ padding: 16, marginBottom: 16, background: '#E8F5E9', border: '1px solid #C8E6C9' }}>
            <div style={{ fontWeight: 500, color: 'var(--ink-green)', marginBottom: 8 }}>✅ 分享链接已生成</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input readOnly value={shareUrl} style={{ flex: 1, height: 40, border: '1.5px solid #C8E6C9', borderRadius: 8, padding: '0 12px', fontSize: 13, background: 'white' }} />
              <button className="btn btn-primary" style={{ height: 40, padding: '0 16px', fontSize: 13 }} onClick={handleCopy}>📋 复制</button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
              有效期: {expiresInLabels[expiresIn]} {maxViews > 0 ? `· 最多 ${maxViews} 次访问` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 36, fontSize: 13 }} onClick={handleViewStats}>📊 查看统计</button>
              <button className="btn btn-secondary" style={{ flex: 1, height: 36, fontSize: 13 }} onClick={handleShareLink}>📤 分享</button>
              <button className="btn" style={{ flex: 1, height: 36, fontSize: 13, background: '#FFF3F3', color: '#D32F2F', border: '1px solid #FFD5D5' }} onClick={handleRevoke}>🗑️ 取消</button>
            </div>
          </div>
        )}

        {/* 统计 */}
        {shareToken && stats && (
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 500, color: 'var(--ink-primary)' }}>📊 访问统计</div>
              <button onClick={handleViewStats} style={{ background: 'none', border: '1.5px solid var(--ink-green)', color: 'var(--ink-green)', borderRadius: 6, cursor: 'pointer', padding: '4px 12px', fontSize: 12 }}>🔄 刷新</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: '#F5F5F5', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink-green)' }}>{stats.view_count || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>访问量</div>
              </div>
              <div style={{ background: '#F5F5F5', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#D32F2F' }}>{stats.like_count || 0}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>点赞数</div>
              </div>
            </div>
          </div>
        )}

        {/* 已分享的书籍 */}
        {shareList.length > 0 && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>📚 已分享的书籍</div>
            {shareList.map(s => (
              <div key={s.token} className="card" style={{ padding: '12px 16px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{s.book_title || '人生之书'}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{s.share_url || ''}</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{s.view_count || 0} 次查看</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BookSharePage });
