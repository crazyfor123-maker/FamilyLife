// ===== 备份与恢复页 =====
function BackupPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../api/storage').then(s => s.getBackupHistory(spaceId)).then(res => {
      if (res.code === 0) setHistory(res.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBackup = async () => {
    try {
      const { createBackup } = await import('../api/storage');
      const res = await createBackup(spaceId, 'all', '');
      if (res.code === 0) showToast('备份已开始');
      else showToast(res.message || '备份失败');
    } catch { showToast('网络异常'); }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="备份与恢复" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card-paper" style={{ padding: '24px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
            全量备份
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0 }}>
            备份所有家族数据<br/>包括成员、故事、采访素材、人生之书
          </p>
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16, marginBottom: 16 }}
          onClick={handleBackup}>
          立即备份
        </button>

        <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8 }}>备份历史</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>暂无备份记录</div>
        ) : (
          history.map((b, i) => (
            <div key={b.id || i} className="card" style={{ padding: '12px 16px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, color: 'var(--ink-primary)' }}>{b.file_name || '备份文件'}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{b.created_at || ''}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>
                大小：{b.file_size ? (b.file_size / 1024 / 1024).toFixed(1) + 'MB' : '未知'} · 状态：{b.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BackupPage });