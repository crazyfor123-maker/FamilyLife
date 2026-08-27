// ===== 备份恢复页 =====
function RestorePage({ onBack }) {
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

  const handleRestore = async (backupId) => {
    if (!confirm('确定从此备份恢复？当前数据将被覆盖。')) return;
    try {
      showToast('恢复中...');
      const { restoreBackup } = await import('../api/storage');
      const res = await restoreBackup(spaceId, backupId);
      if (res && res.code === 0) {
        showToast('恢复成功！页面将刷新...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(res?.message || '恢复失败');
      }
    } catch (err) {
      showToast('恢复失败：' + (err.message || '网络异常'));
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="恢复备份" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card-paper" style={{ padding: '20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', margin: 0 }}>
            选择一个备份文件恢复数据<br/><span style={{ color: '#D32F2F', fontSize: 13 }}>⚠️ 恢复将覆盖当前数据</span>
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>暂无可恢复的备份</div>
        ) : (
          history.map((b, i) => (
            <div key={b.id || i} className="card" style={{ padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-primary)' }}>{b.file_name || '备份文件'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{b.created_at || ''}</div>
                </div>
                <button className="btn btn-primary" style={{ height: 36, padding: '0 12px', fontSize: 13 }}
                  onClick={() => handleRestore(b.id)}>恢复</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { RestorePage });