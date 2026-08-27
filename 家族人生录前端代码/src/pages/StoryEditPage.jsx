// ===== 故事编辑页 =====
function StoryEditPage({ storyId, onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [form, setForm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../api/timeline').then(t => t.getTimeline(spaceId)).then(res => {
      if (res.code === 0) {
        const found = (res.data || []).find(s => s.story_id === storyId);
        if (found) setForm(found);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [storyId]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const { updateStory } = await import('../api/timeline');
      const res = await updateStory(storyId, form);
      setLoading(false);
      if (res.code === 0) { showToast('保存成功'); setTimeout(onBack, 800); }
      else showToast(res.message || '保存失败');
    } catch { setLoading(false); showToast('网络异常'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>;
  if (!form) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>故事不存在</div>;

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="编辑故事" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· 故事信息 ·</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>标题 *</label>
            <input type="text" value={form.title || ''} onChange={e => update('title', e.target.value)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>类型</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['daily', '团聚', '纪念', '成长', '旅行', '成就'].map(t => (
                <button key={t} onClick={() => update('story_type', t)} style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
                  border: '1.5px solid', cursor: 'pointer',
                  background: form.story_type === t ? 'var(--ink-green)' : 'var(--white)',
                  borderColor: form.story_type === t ? 'var(--ink-green)' : 'var(--line-soft)',
                  color: form.story_type === t ? 'var(--white)' : 'var(--ink-primary)'
                }}>{t === 'daily' ? '日常' : t}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>发生日期</label>
            <input type="date" value={form.happened_at?.split('T')[0] || ''} onChange={e => update('happened_at', e.target.value)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>内容 *</label>
            <textarea value={form.content || ''} onChange={e => update('content', e.target.value)}
              rows={6}
              style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 15, background: 'var(--white)', outline: 'none', fontFamily: 'var(--font-serif)', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-danger btn-block" style={{ flex: 1, height: 48 }}
            onClick={() => { if (confirm('确定删除此故事？')) { import('../api/timeline').then(t => t.deleteStory(storyId)).then(() => onBack()); }}>删除</button>
          <button className="btn btn-primary btn-block" style={{ flex: 2, height: 48, fontSize: 16 }}
            onClick={handleSave} disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StoryEditPage });