// ===== 转写文本管理页 =====
function TranscriptPage({ personId, onBack }) {
  const [transcripts, setTranscripts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState(null);
  const [editContent, setEditContent] = React.useState('');

  React.useEffect(() => {
    loadTranscripts();
  }, [personId]);

  const loadTranscripts = async () => {
    setLoading(true);
    try {
      const { getTranscripts } = await import('../api/asr');
      const res = await getTranscripts(personId);
      if (res && res.code === 0) {
        setTranscripts(res.data || []);
      } else {
        setTranscripts(MockData.transcripts || []);
      }
    } catch {
      setTranscripts(MockData.transcripts || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const { updateTranscript } = await import('../api/asr');
      const res = await updateTranscript({
        id,
        content: editContent,
        person_id: personId,
      });
      if (res && res.code === 0) {
        showToast('保存成功');
        setEditingId(null);
        setEditContent('');
        loadTranscripts();
      } else {
        showToast(res?.message || '保存失败');
      }
    } catch { showToast('保存失败'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此转写文本？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/asr/transcripts/${id}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadTranscripts();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📝 转写文本" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : transcripts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无转写文本</div>
        ) : (
          transcripts.map(t => (
            <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{t.title || t.interview_title || '转写文本'}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>{t.date || t.created_at || ''}</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { setEditingId(t.id); setEditContent(t.content || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>✏️</button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
                </div>
              </div>
              {editingId === t.id ? (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  rows={4} style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
              ) : (
                <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-serif)' }}>
                  {t.content?.slice(0, 200)}{t.content?.length > 200 ? '...' : ''}
                </p>
              )}
              <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>
                {t.content?.length || 0} 字 · {t.duration || '0:00'}
              </div>
              {editingId === t.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" style={{ height: 32, fontSize: 12, flex: 1 }}
                    onClick={() => handleSaveEdit(t.id)}>保存</button>
                  <button className="btn btn-secondary" style={{ height: 32, fontSize: 12, flex: 1 }}
                    onClick={() => setEditingId(null)}>取消</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TranscriptPage });
