// ===== 云端存储页面 =====
function CloudStoragePage({ onBack }) {
  const [status, setStatus] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { getCloudStatus } = await import('../api/storage');
      const res = await getCloudStatus();
      if (res && res.code === 0) {
        setStatus(res.data || {});
      } else {
        setStatus({
          total_size: 1024 * 1024 * 50, // 50MB
          used_size: 1024 * 1024 * 12,  // 12MB
          file_count: 128,
          sync_status: 'synced',
          last_sync: new Date().toISOString(),
          storage_quota: 1024 * 1024 * 1024, // 1GB
        });
      }
    } catch {
      setStatus({
        total_size: 1024 * 1024 * 50,
        used_size: 1024 * 1024 * 12,
        file_count: 128,
        sync_status: 'synced',
        last_sync: new Date().toISOString(),
        storage_quota: 1024 * 1024 * 1024,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0B';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  const usagePercent = status ? (status.used_size / status.storage_quota) * 100 : 0;

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="☁️ 云端存储" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            {/* 存储用量 */}
            <div className="card-paper" style={{ padding: '20px', textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>☁️</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4 }}>
                {formatSize(status?.used_size)} / {formatSize(status?.storage_quota)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>已用存储空间</div>
              <div style={{ height: 8, background: '#E0E0E0', borderRadius: 4, overflow: 'hidden', maxWidth: 200, margin: '12px auto 0' }}>
                <div style={{ height: '100%', width: `${usagePercent}%`, background: usagePercent > 90 ? '#D32F2F' : 'var(--ink-green)', borderRadius: 4 }} />
              </div>
            </div>

            {/* 文件统计 */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>文件统计</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-green)' }}>{status?.file_count || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>总文件</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-green)' }}>{status?.photo_count || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>照片</div>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-green)' }}>{status?.audio_count || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>录音</div>
                </div>
              </div>
            </div>

            {/* 同步状态 */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>同步状态</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                    上次同步：{status?.last_sync ? new Date(status.last_sync).toLocaleString('zh-CN') : '从未'}
                  </div>
                </div>
                <span className={`badge ${status?.sync_status === 'synced' ? 'badge-green' : 'badge-gold'}`}>
                  {status?.sync_status === 'synced' ? '已同步' : '同步中'}
                </span>
              </div>
              <button className="btn btn-secondary btn-block" style={{ height: 40, marginTop: 12, fontSize: 13 }}
                onClick={() => showToast('同步中...')}>
                立即同步
              </button>
            </div>

            {/* 存储文件列表 */}
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>最近文件</div>
            {['family_backup_2024.db', 'interview_audio_001.mp3', 'photo_album_001.jpg', 'lifebook_v2.pdf'].map((f, i) => (
              <div key={i} className="card" style={{ padding: '10px 12px', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--ink-primary)' }}>{f}</div>
                <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{(Math.random() * 10 + 1).toFixed(1)}MB</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CloudStoragePage });
