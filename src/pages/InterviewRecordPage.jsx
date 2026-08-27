// ===== 原始录音管理页 =====
function InterviewRecordPage({ personId, onBack }) {
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [playingId, setPlayingId] = React.useState(null);
  const [playingProgress, setPlayingProgress] = React.useState(0);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState('mp3');
  const [audioRef, setAudioRef] = React.useState(null);

  React.useEffect(() => { loadRecords(); }, [personId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { getInterviews } = await import('../api/interview');
      const res = await getInterviews(personId);
      if (res && res.code === 0) {
        setRecords((res.data || []).map((interview, i) => ({
          id: interview.id || interview.interview_id || `rec_${i}`,
          title: interview.title || `采访录音 ${i + 1}`,
          duration: interview.duration || Math.floor(Math.random() * 600 + 60),
          date: interview.created_at || new Date().toISOString().split('T')[0],
          status: interview.status || 'completed',
          size: interview.size || Math.floor(Math.random() * 10000000 + 1000000),
          waveform: Array.from({ length: 60 }, () => Math.random() * 50 + 10),
        })));
      } else { setRecords(MockData.interviewRecords || []); }
    } catch { setRecords(MockData.interviewRecords || []); }
    finally { setLoading(false); }
  };

  const handlePlay = async (recordId) => {
    if (playingId === recordId) {
      setPlayingId(null);
      setPlayingProgress(0);
      return;
    }
    setPlayingId(recordId);
    setPlayingProgress(0);
    showToast('▶️ 播放录音');

    // 模拟进度
    const interval = setInterval(() => {
      setPlayingProgress(p => {
        if (p >= 100) { clearInterval(interval); setPlayingId(null); return 0; }
        return p + 2;
      });
    }, 200);
  };

  const handleExport = async (record) => {
    try {
      // 尝试从后端下载录音文件
      const { get } = await import('../api/request');
      const res = await get(`/asr/recordings/${record.id}/download?format=${exportFormat}`);
      if (res?.data?.download_url) {
        const a = document.createElement('a');
        a.href = res.data.download_url;
        a.download = `${record.title}.${exportFormat}`;
        a.click();
        showToast('导出成功');
      } else {
        showToast('导出功能需要后端支持');
      }
    } catch { showToast('导出失败'); }
    setShowExportModal(false);
  };

  const handleDelete = async (recordId) => {
    if (!confirm('确定删除此录音？此操作不可恢复。')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/interview/records/${recordId}`);
      if (res && res.code === 0) { showToast('已删除'); loadRecords(); }
      else { showToast(res?.message || '删除失败'); }
    } catch { showToast('删除失败'); }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '未知';
    if (bytes > 1048576) return (bytes / 1048576).toFixed(1) + 'MB';
    return (bytes / 1024).toFixed(0) + 'KB';
  };

  const statusMap = {
    completed: { label: '✅ 已完成', color: 'var(--ink-green)', bg: '#E8F5E9' },
    processing: { label: '⏳ 处理中', color: '#D97706', bg: '#FFF3E0' },
    failed: { label: '❌ 失败', color: '#D32F2F', bg: '#FFF3F3' },
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🎙️ 原始录音" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎙️</div>
            暂无录音<br/><span style={{ fontSize: 13 }}>开始一次AI采访即可录制</span>
          </div>
        ) : (
          records.map(record => {
            const status = statusMap[record.status] || statusMap.completed;
            return (
              <div key={record.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => handlePlay(record.id)} style={{
                    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: playingId === record.id ? 'var(--ink-green)' : '#F5F5F5',
                    color: playingId === record.id ? 'white' : 'var(--ink-primary)',
                    fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{playingId === record.id ? '⏸' : '▶'}</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{record.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{record.date} · {formatDuration(record.duration)} · {formatSize(record.size)}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: status.bg, color: status.color }}>{status.label}</span>
                </div>

                {/* 波形图 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 10, height: 30 }}>
                  {record.waveform.map((h, i) => (
                    <div key={i} style={{ width: 2, height: h, borderRadius: 1, transition: 'background 0.2s',
                      background: playingId === record.id ? (i / record.waveform.length * playingProgress < 100 ? 'var(--ink-green)' : 'var(--line-light)') : 'var(--line-light)' }} />
                  ))}
                </div>

                {/* 播放进度 */}
                {playingId === record.id && (
                  <div style={{ height: 3, background: '#E0E0E0', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${playingProgress}%`, background: 'var(--ink-green)', borderRadius: 2, transition: 'width 0.2s' }} />
                  </div>
                )}

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" style={{ height: 32, fontSize: 12, padding: '0 12px' }}
                    onClick={() => { setShowExportModal(record); setExportFormat('mp3'); }}>📥 导出</button>
                  <button onClick={() => handleDelete(record.id)} style={{ background: 'none', border: 'none', color: '#D32F2F', fontSize: 13, cursor: 'pointer', padding: '4px 8px' }}>🗑️</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 导出弹窗 */}
      {showExportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowExportModal(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>导出录音</span>
              <button onClick={() => setShowExportModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-primary)', marginBottom: 16 }}>{showExportModal.title}</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 8 }}>导出格式</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['mp3', 'wav', 'm4a'].map(f => (
                  <button key={f} onClick={() => setExportFormat(f)} style={{
                    padding: '8px 20px', border: `1.5px solid ${exportFormat === f ? 'var(--ink-green)' : 'var(--line-soft)'}`,
                    borderRadius: 8, background: exportFormat === f ? '#E8F5E9' : 'white',
                    cursor: 'pointer', fontSize: 14, color: exportFormat === f ? 'var(--ink-green)' : 'var(--ink-primary)',
                  }}>{f.toUpperCase()}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-block" style={{ height: 44, fontSize: 15 }} onClick={() => handleExport(showExportModal)}>
              导出 {exportFormat.toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { InterviewRecordPage });
