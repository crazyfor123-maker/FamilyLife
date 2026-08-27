// ===== 家族故事时间墙页 =====
function TimelinePage({ onNavigate }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [filter, setFilter] = React.useState('all');
  const [stories, setStories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedStories, setExpandedStories] = React.useState(new Set());
  const [commentInputs, setCommentInputs] = React.useState({});
  const [editingStory, setEditingStory] = React.useState(null);

  React.useEffect(() => {
    loadStories();
  }, [spaceId]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const { getTimeline } = await import('../api/timeline');
      const res = await getTimeline(spaceId);
      if (res && res.code === 0) {
        setStories(res.data || []);
      } else {
        setStories(MockData.stories);
      }
    } catch {
      setStories(MockData.stories);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (storyId) => {
    if (!confirm('确定删除此故事？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/timeline/${storyId}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadStories();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  const handleLike = async (storyId) => {
    try {
      const { post } = await import('../api/request');
      const res = await post(`/timeline/${storyId}/like`);
      if (res && res.code === 0) {
        loadStories();
      }
    } catch {
      // 点赞失败不影响体验
    }
  };

  const handleAddComment = async (storyId) => {
    const text = commentInputs[storyId];
    if (!text || !text.trim()) return;
    try {
      const { post } = await import('../api/request');
      const res = await post(`/timeline/${storyId}/comment`, { content: text.trim() });
      if (res && res.code === 0) {
        showToast('评论成功');
        setCommentInputs(prev => ({ ...prev, [storyId]: '' }));
        loadStories();
      } else {
        showToast(res?.message || '评论失败');
      }
    } catch { showToast('评论失败'); }
  };

  const toggleExpand = (storyId) => {
    setExpandedStories(prev => {
      const next = new Set(prev);
      if (next.has(storyId)) next.delete(storyId);
      else next.add(storyId);
      return next;
    });
  };

  const filters = [
    { id: 'all', label: '全部' },
    { id: '团聚', label: '团聚' },
    { id: '纪念', label: '纪念' },
    { id: '成长', label: '成长' },
    { id: '旅行', label: '旅行' },
    { id: '成就', label: '成就' },
  ];

  const filteredStories = filter === 'all' ? stories : stories.filter(s => (s.story_type || s.type) === filter);

  const groupedByYear = {};
  filteredStories.forEach(story => {
    const y = story.happened_at ? story.happened_at.split('T')[0].split('-')[0] : '未知';
    if (!groupedByYear[y]) groupedByYear[y] = [];
    groupedByYear[y].push(story);
  });
  const years = Object.keys(groupedByYear).sort((a, b) => b - a);

  const typeColors = {
    '日常': '#4A6741',
    '团聚': '#D97706',
    '纪念': '#8B5CF6',
    '成长': '#1565C0',
    '旅行': '#C2185B',
    '成就': '#00897B',
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📚 家族时间墙" showBack={false} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
              border: `1.5px solid ${filter === f.id ? 'var(--ink-green)' : 'var(--line-light)'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: filter === f.id ? 'var(--ink-green)' : 'white',
              color: filter === f.id ? 'var(--white)' : 'var(--ink-secondary)',
              fontWeight: filter === f.id ? 500 : 400,
            }}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }}
                onClick={() => onNavigate('storyPublish')}>
                <Icon.Plus size={14} /> 发布故事
              </button>
            </div>

            {years.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无故事，来发布第一条吧</div>
            ) : (
              years.map(year => (
                <div key={year} style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>{year}年</div>
                  {groupedByYear[year].map(story => {
                    const isExpanded = expandedStories.has(story.story_id || story.id);
                    const storyType = story.story_type || story.type || '日常';
                    return (
                      <div key={story.story_id || story.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div className="avatar avatar-sm" style={{ background: 'var(--ink-green-soft)', color: 'var(--ink-green)' }}>
                            {(story.author || '家').slice(0, 1)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{story.author}</span>
                            <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>
                              {story.happened_at ? new Date(story.happened_at).toLocaleDateString('zh-CN') : ''}
                            </span>
                          </div>
                          <span className="badge" style={{
                            background: (typeColors[storyType] || '#4A6741') + '20',
                            color: typeColors[storyType] || '#4A6741',
                          }}>{storyType}</span>
                          <button onClick={() => setEditingStory(story)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>✏️</button>
                          <button onClick={() => handleDelete(story.story_id || story.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)', margin: '0 0 6px' }}>{story.title}</h4>
                        <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-serif)' }}>
                          {isExpanded || !story.content ? story.content : story.content.slice(0, 120) + '...'}
                        </p>
                        {story.content && story.content.length > 120 && (
                          <button onClick={() => toggleExpand(story.story_id || story.id)} style={{
                            background: 'none', border: 'none', color: 'var(--ink-green)',
                            fontSize: 13, cursor: 'pointer', padding: '4px 0',
                          }}>
                            {isExpanded ? '收起' : '展开全文'}
                          </button>
                        )}
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                          <button onClick={() => handleLike(story.story_id || story.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                            ❤ {story.likes || 0}
                          </button>
                          <span>💬 {((story.comments || story.replies || []) || []).length} 条</span>
                        </div>
                        {/* 评论区 */}
                        <div style={{ marginTop: 10, borderTop: '1px solid var(--line-light)', paddingTop: 8 }}>
                          {((story.comments || story.replies || []) || []).map((c, i) => (
                            <div key={i} style={{ fontSize: 13, color: 'var(--ink-secondary)', padding: '4px 0', borderBottom: '1px solid var(--line-light)' }}>
                              <b style={{ color: 'var(--ink-primary)' }}>{c.author || c.user || '匿名'}:</b> {c.content || c.text || ''}
                              <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginLeft: 8 }}>{c.time || c.created_at || ''}</span>
                            </div>
                          ))}
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <input type="text" value={commentInputs[story.story_id || story.id] || ''}
                              onChange={e => setCommentInputs(prev => ({ ...prev, [story.story_id || story.id]: e.target.value }))}
                              placeholder="写评论..."
                              style={{ flex: 1, height: 34, border: '1.5px solid var(--line-soft)', borderRadius: 6, padding: '0 10px', fontSize: 13 }}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddComment(story.story_id || story.id); }}
                            />
                            <button onClick={() => handleAddComment(story.story_id || story.id)} style={{
                              height: 34, padding: '0 12px', border: 'none', borderRadius: 6,
                              background: 'var(--ink-green)', color: 'white', cursor: 'pointer', fontSize: 12,
                            }}>发送</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* 编辑故事弹窗 */}
      {editingStory && (
        <StoryEditModal story={editingStory} onClose={() => setEditingStory(null)} />
      )}
    </div>
  );
}

// 故事编辑弹窗
function StoryEditModal({ story, onClose }) {
  const [form, setForm] = React.useState({ ...story });
  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    try {
      const { put } = await import('../api/request');
      const res = await put(`/timeline/${story.story_id || story.id}`, form);
      if (res && res.code === 0) {
        showToast('保存成功');
        onClose();
      } else {
        showToast(res?.message || '保存失败');
      }
    } catch { showToast('保存失败'); }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>编辑故事</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>标题</label>
          <input type="text" value={form.title || ''} onChange={e => update('title', e.target.value)}
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>类型</label>
          <input type="text" value={form.story_type || form.type || ''} onChange={e => update('story_type', e.target.value)}
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>内容</label>
          <textarea value={form.content || ''} onChange={e => update('content', e.target.value)}
            rows={5} style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleSubmit}>保存</button>
      </div>
    </div>
  );
}

Object.assign(window, { TimelinePage });
