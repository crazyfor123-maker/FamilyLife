// ===== 采访提纲管理页 =====
function InterviewOutlinePage({ personId, onBack }) {
  const [outlines, setOutlines] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [activeOutline, setActiveOutline] = React.useState(null);

  React.useEffect(() => {
    loadOutlines();
  }, [personId]);

  const loadOutlines = async () => {
    setLoading(true);
    try {
      const { getInterviews } = await import('../api/interview');
      const res = await getInterviews(personId);
      if (res && res.code === 0) {
        setOutlines(res.data || []);
      } else {
        setOutlines(MockData.outlines || []);
      }
    } catch {
      setOutlines(MockData.outlines || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data) => {
    try {
      const { post } = await import('../api/request');
      const res = await post('/interview/outlines/create', { ...data, person_id: personId });
      if (res && res.code === 0) {
        showToast('提纲创建成功');
        setShowCreate(false);
        loadOutlines();
      } else {
        showToast(res?.message || '创建失败');
      }
    } catch { showToast('创建失败'); }
  };

  const handleDelete = async (outlineId) => {
    if (!confirm('确定删除此采访提纲？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/interview/outlines/${outlineId}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadOutlines();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  const handleStartInterview = (outline) => {
    // 使用此提纲开始采访
    window.location.hash = `#/interview/new?outline=${outline.id}`;
  };

  const outlineTypes = {
    '生平回顾': '📖',
    '童年记忆': '👶',
    '求学经历': '🎓',
    '工作生涯': '💼',
    '家族故事': '👨‍👩‍👧‍👦',
    '人生感悟': '💭',
    '自定义': '📝',
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📋 采访提纲" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }}
            onClick={() => setShowCreate(true)}>
            <Icon.Plus size={14} /> 新建提纲
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          outlines.map(outline => (
            <div key={outline.id || outline.outline_id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28 }}>{outlineTypes[outline.type] || '📝'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)' }}>{outline.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                    {outline.question_count || 0} 个问题 · {outline.category || '自定义'}
                  </div>
                </div>
                <button onClick={() => handleStartInterview(outline)} style={{
                  height: 32, padding: '0 12px', border: 'none', borderRadius: 6,
                  background: 'var(--ink-green)', color: 'white', cursor: 'pointer', fontSize: 12,
                }}>开始采访</button>
                <button onClick={() => handleDelete(outline.id || outline.outline_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.5, margin: '8px 0 0' }}>
                {outline.description || ''}
              </p>
            </div>
          ))
        )}
      </div>

      {/* 新建提纲弹窗 */}
      {showCreate && (
        <OutlineCreateForm onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function OutlineCreateForm({ onSubmit, onClose }) {
  const [form, setForm] = React.useState({
    title: '', type: '自定义', category: '自定义',
    description: '', questions: [],
  });
  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const types = ['生平回顾', '童年记忆', '求学经历', '工作生涯', '家族故事', '人生感悟', '自定义'];

  const handleSubmit = () => {
    if (!form.title.trim()) { showToast('请输入提纲名称'); return; }
    onSubmit(form);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>新建采访提纲</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>提纲名称 *</label>
          <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>类型</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t} onClick={() => update('type', t)} style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
                border: `1.5px solid ${form.type === t ? 'var(--ink-green)' : 'var(--line-light)'}`,
                background: form.type === t ? '#E8F5E9' : 'white',
                color: form.type === t ? 'var(--ink-green)' : 'var(--ink-primary)',
                cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>描述</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            rows={3} style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleSubmit}>创建提纲</button>
      </div>
    </div>
  );
}

Object.assign(window, { InterviewOutlinePage });
