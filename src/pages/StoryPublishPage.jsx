// ===== 故事发布页 =====
function StoryPublishPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const [form, setForm] = React.useState({
    title: '', content: '', story_type: 'daily',
    happened_at: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = React.useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { showToast('请输入标题'); return; }
    setLoading(true);
    try {
      const { publishStory } = await import('../api/timeline');
      const res = await publishStory({ ...form, space_id: currentSpaceId || '1' });
      setLoading(false);
      if (res.code === 0) { showToast('发布成功'); setTimeout(onBack, 800); }
      else showToast(res.message || '发布失败');
    } catch { setLoading(false); showToast('网络异常'); }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="发布故事" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· 故事信息 ·</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>标题 *</label>
            <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
              placeholder="给故事起个名字"
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
            <input type="date" value={form.happened_at} onChange={e => update('happened_at', e.target.value)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>内容 *</label>
            <textarea value={form.content} onChange={e => update('content', e.target.value)}
              placeholder="记录这个故事的详细内容..."
              rows={6}
              style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 15, background: 'var(--white)', outline: 'none', fontFamily: 'var(--font-serif)', resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-secondary btn-block" style={{ flex: 1, height: 48 }}>
            <Icon.Image size={18} /> 添加图片
          </button>
          <button className="btn btn-primary btn-block" style={{ flex: 2, height: 48, fontSize: 16 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '发布中...' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StoryPublishPage });