// ===== 转写文本管理页 =====
function TranscriptPage({ personId, onBack }) {
  const [transcripts, setTranscripts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState(null);
  const [editContent, setEditContent] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedId, setExpandedId] = React.useState(null);
  const [showSearch, setShowSearch] = React.useState(false);

  React.useEffect(() => { loadTranscripts(); }, [personId]);

  const loadTranscripts = async () => {
    setLoading(true);
    try {
      const { getTranscripts } = await import('../api/asr');
      const res = await getTranscripts(personId);
      if (res && res.code === 0) {
        setTranscripts((res.data || []).map(t => ({
          ...t,
          segments: t.segments || [{ start: 0, end: t.duration || 0, text: t.content || '' }],
        }));
      } else { setTranscripts(MockData.transcripts || []); }
    } catch { setTranscripts(MockData.transcripts || []); }
    finally { setLoading(false); }
  };

  const handleSaveEdit = async (id) => {
    try {
      const { updateTranscript } = await import('../api/asr');
      const res = await updateTranscript({ id, content: editContent, person_id: personId });
      if (res && res.code === 0) { showToast('保存成功'); setEditingId(null); setEditContent(''); loadTranscripts(); }
      else { showToast(res?.message || '保存失败'); }
    } catch { showToast('保存失败'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此转写文本？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/asr/transcripts/${id}`);
      if (res && res.code === 0) { showToast('已删除'); loadTranscripts(); }
      else { showToast(res?.message || '删除失败'); }
    } catch { showToast('删除失败'); }
  };

  // 搜索过滤
  const filtered = transcripts.filter(t => {
    if (!searchQuery) return true;
    return (t.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (t.title || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📝 转写文本" showBack={true} onBack={onBack}>
        <button onClick={() => setShowSearch(!showSearch)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '0 8px' }}>🔍</button>
      </PageHeader>

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 搜索栏 */}
        {showSearch && (
          <div style={{ marginBottom: 14 }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索转写内容..." style={{ width: '100%', height: 40, border: '1.5px solid var(--line-soft)', borderRadius: 20, padding: '0 16px', fontSize: 14, background: 'white', outline: 'none' }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 24, top: 18, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--ink-tertiary)' }}>✕</button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            暂无转写文本<br/><span style={{ fontSize: 13 }}>AI采访完成后自动生成</span>
          </div>
        ) : (
          filtered.map(t => {
            const isExpanded = expandedId === t.id;
            const isEditing = editingId === t.id;
            return (
              <div key={t.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{t.title || t.interview_title || '转写文本'}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>{t.date || t.created_at || ''}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>
                      {isExpanded ? '🔽' : '🔼'}
                    </button>
                    <button onClick={() => { setEditingId(t.id); setEditContent(t.content || ''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>✏️</button>
                    <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
                  </div>
                </div>

                {isEditing ? (
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6}
                    style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
                ) : (
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-serif)',
                      maxHeight: isExpanded ? 'none' : 80, overflow: 'hidden', transition: 'max-height 0.3s' }}>
                      {t.content || '暂无内容'}
                    </p>
                    {!isExpanded && t.content?.length > 80 && (
                      <div style={{ fontSize: 12, color: 'var(--ink-green)', cursor: 'pointer', marginTop: 4 }}>展开全文</div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>
                  <span>{t.content?.length || 0} 字</span>
                  <span>时长: {formatDuration(t.duration)}</span>
                </div>

                {/* 分段标记 */}
                {isExpanded && t.segments && t.segments.length > 0 && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--line-light)', paddingTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 6 }}>分段内容</div>
                    {t.segments.map((seg, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--ink-secondary)', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
                        <span style={{ color: 'var(--ink-green)', marginRight: 6 }}>{formatDuration(seg.start)}-{formatDuration(seg.end)}</span>
                        {seg.text}
                      </div>
                    ))}
                  </div>
                )}

                {isEditing && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" style={{ height: 32, fontSize: 12, flex: 1 }} onClick={() => handleSaveEdit(t.id)}>保存</button>
                    <button className="btn btn-secondary" style={{ height: 32, fontSize: 12, flex: 1 }} onClick={() => setEditingId(null)}>取消</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TranscriptPage });
