// ===== 人生之书版本管理页 =====
function LifeBookVersionPage({ bookId, onBack }) {
  const [versions, setVersions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [comparing, setComparing] = React.useState(null);
  const [diffText, setDiffText] = React.useState('');

  React.useEffect(() => {
    loadVersions();
  }, [bookId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { getLifeBookVersions } = await import('../api/lifebook');
      const res = await getLifeBookVersions(bookId);
      if (res && res.code === 0) {
        setVersions(res.data || []);
      } else {
        setVersions(MockData.bookVersions || []);
      }
    } catch {
      setVersions(MockData.bookVersions || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (v1, v2) => {
    setComparing([v1.id, v2.id]);
    try {
      const { getLifeBookVersions } = await import('../api/lifebook');
      const res = await getLifeBookVersions(bookId, { compare: true, v1: v1.id, v2: v2.id });
      if (res && res.code === 0 && res.data?.diff) {
        setDiffText(res.data.diff);
      } else {
        setDiffText(`版本差异对比（Demo）\n\n版本 ${v1.version} → 版本 ${v2.version}\n\n修改章节：${Math.floor(Math.random() * 5 + 1)} 个\n新增内容：${Math.floor(Math.random() * 5000 + 500)} 字\n删除内容：${Math.floor(Math.random() * 2000 + 100)} 字`);
      }
    } catch {
      setDiffText(`版本差异对比（Demo）\n\n版本 ${v1.version} → 版本 ${v2.version}\n修改章节：${Math.floor(Math.random() * 5 + 1)} 个\n新增内容：${Math.floor(Math.random() * 5000 + 500)} 字`);
    }
  };

  const handleSwitch = async (versionId) => {
    if (!confirm('确定切换到此版本？当前内容将被覆盖。')) return;
    try {
      const { put } = await import('../api/request');
      const res = await put(`/lifebook/${bookId}/versions/${versionId}/switch`);
      if (res && res.code === 0) {
        showToast('已切换到该版本');
        onBack();
      } else {
        showToast(res?.message || '切换失败');
      }
    } catch { showToast('切换失败'); }
  };

  const statusMap = {
    'current': { label: '当前', color: 'var(--ink-green)' },
    'draft': { label: '草稿', color: 'var(--ink-gold)' },
    'published': { label: '已发布', color: '#1565C0' },
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📚 版本管理" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无版本记录</div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>版本列表</div>
            {versions.map((v, i) => (
              <div key={v.id} className="card" style={{ padding: 12, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-tertiary)' }}>v{v.version}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink-primary)' }}>{v.description || `版本 ${v.version}`}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{v.created_at || v.date || ''} · {v.word_count || 0}字</div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: (statusMap[v.status] || statusMap.current).color + '20',
                    color: (statusMap[v.status] || statusMap.current).color,
                  }}>{statusMap[v.status] || statusMap.current}.label</span>
                  {v.status !== 'current' && (
                    <button onClick={() => handleSwitch(v.id)} style={{
                      height: 28, padding: '0 8px', border: 'none', borderRadius: 4,
                      background: '#F5F5F5', cursor: 'pointer', fontSize: 11,
                    }}>切换</button>
                  )}
                </div>
              </div>
            ))}

            {/* 版本对比 */}
            {comparing && (
              <div className="card" style={{ padding: 14, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>版本对比</span>
                  <button onClick={() => setComparing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
                <pre style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-serif)', background: '#F9F9F9', padding: 12, borderRadius: 8 }}>
                  {diffText}
                </pre>
              </div>
            )}

            {/* 对比按钮 */}
            {versions.length >= 2 && !comparing && (
              <button className="btn btn-secondary btn-block" style={{ height: 40, marginTop: 12, fontSize: 13 }}
                onClick={() => handleCompare(versions[versions.length - 1], versions[versions.length - 2])}>
                对比最新版本
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { LifeBookVersionPage });
