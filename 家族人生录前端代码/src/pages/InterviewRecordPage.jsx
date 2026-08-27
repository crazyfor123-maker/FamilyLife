// ===== 原始录音管理页 =====
function InterviewRecordPage({ personId, onBack }) {
  const [records, setRecords] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [playingId, setPlayingId] = React.useState(null);
  const [audioRef, setAudioRef] = React.useState(null);

  React.useEffect(() => {
    loadRecords();
  }, [personId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const { getInterviews } = await import('../api/interview');
      const res = await getInterviews(personId);
      if (res && res.code === 0) {
        // 模拟录音数据
        setRecords((res.data || []).map((interview, i) => ({
          id: interview.id || interview.interview_id || `rec_${i}`,
          title: interview.title || `采访录音 ${i + 1}`,
          duration: interview.duration || Math.floor(Math.random() * 600 + 60),
          date: interview.created_at || new Date().toISOString().split('T')[0],
          status: interview.status || 'completed',
          waveform: Array.from({ length: 40 }, () => Math.random() * 60 + 10),
        })));
      } else {
        setRecords(MockData.interviewRecords || []);
      }
    } catch {
      setRecords(MockData.interviewRecords || []);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (recordId) => {
    if (playingId === recordId) {
      setPlayingId(null);
      return;
    }
    setPlayingId(recordId);
    showToast('播放录音（Demo）');
  };

  const handleDelete = async (recordId) => {
    if (!confirm('确定删除此录音？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/interview/records/${recordId}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadRecords();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const statusMap = {
    'completed': { label: '已完成', color: 'var(--ink-green)' },
    'processing': { label: '处理中', color: 'var(--ink-gold)' },
    'failed': { label: '失败', color: '#D32F2F' },
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🎙️ 原始录音" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无录音</div>
        ) : (
          records.map(record => (
            <div key={record.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => handlePlay(record.id)} style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: 'none', cursor: 'pointer',
                  background: playingId === record.id ? 'var(--ink-green)' : '#F5F5F5',
                  color: playingId === record.id ? 'white' : 'var(--ink-primary)',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {playingId === record.id ? '⏸' : '▶'}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{record.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{record.date} · {formatDuration(record.duration)}</div>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: (statusMap[record.status] || statusMap.completed).color + '20',
                  color: (statusMap[record.status] || statusMap.completed).color,
                }}>{statusMap[record.status] || statusMap.completed}.label</span>
                <button onClick={() => handleDelete(record.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
              </div>
              {/* 波形图 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 1, marginTop: 10, height: 30 }}>
                {record.waveform.map((h, i) => (
                  <div key={i} style={{
                    width: 2, height: h,
                    background: playingId === record.id ? 'var(--ink-green)' : 'var(--line-light)',
                    borderRadius: 1, transition: 'background 0.2s',
                  }} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { InterviewRecordPage });
