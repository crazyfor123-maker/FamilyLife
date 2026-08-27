// ===== 家族大事记页 - 多人协同修订（版本对比/补充记录） =====
function EventsPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState(null);
  const [filterType, setFilterType] = React.useState('all');
  const [showVersionCompare, setShowVersionCompare] = React.useState(false);
  const [compareVersions, setCompareVersions] = React.useState([]);
  const [compareEvent, setCompareEvent] = React.useState(null);
  // ===== F6.8 修订历史 =====
  const [showRevisionHistory, setShowRevisionHistory] = React.useState(false);
  const [revisionHistory, setRevisionHistory] = React.useState([]);
  const [revisionEvent, setRevisionEvent] = React.useState(null);
  const [showSupplement, setShowSupplement] = React.useState(false);
  const [supplementEvent, setSupplementEvent] = React.useState(null);
  const [supplementText, setSupplementText] = React.useState('');
  const [supplementAuthor, setSupplementAuthor] = React.useState('');

  React.useEffect(() => {
    loadEvents();
  }, [spaceId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { getEvents } = await import('../api/events');
      const res = await getEvents(spaceId);
      if (res && res.code === 0) {
        // 确保每条事件有 versions 和 supplements
        setEvents((res.data || []).map(e => ({
          ...e,
          versions: e.versions || [{ version: 1, content: e.description || '', author: e.author_name || '未知', date: e.event_date || new Date().toISOString().split('T')[0] }],
          supplements: e.supplements || [],
          currentVersion: e.current_version || 1,
        })));
      } else {
        setEvents(generateMockEvents());
      }
    } catch {
      setEvents(generateMockEvents());
    } finally {
      setLoading(false);
    }
  };

  const generateMockEvents = () => [
    { event_id: '1', title: '朱老太爷出生', event_type: '出生', event_date: '1920-03-15', description: '出生于江苏苏州一个书香门第', author_name: '朱明', versions: [
      { version: 1, content: '出生于江苏苏州一个书香门第', author: '朱明', date: '2024-01-01' },
      { version: 2, content: '出生于江苏苏州一个书香门第，祖父是当地有名的教书先生', author: '朱华', date: '2024-06-15' },
    ], current_version: 2, supplements: [] },
    { event_id: '2', title: '家族迁徙', event_type: '迁徙', event_date: '1949-05-20', description: '全家迁往台湾', author_name: '朱华', versions: [
      { version: 1, content: '全家迁往台湾', author: '朱华', date: '2024-01-02' },
    ], current_version: 1, supplements: [
      { id: 's1', text: '补充：迁徙时带去了祖父收藏的大量古籍', author: '朱丽', date: '2024-07-10' },
    ] },
  ];

  const handleDelete = async (eventId) => {
    if (!confirm('确定删除此大事记？关联的故事和素材也会被删除。')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/events/${eventId}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadEvents();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  const handleCreate = async (data) => {
    try {
      const { post } = await import('../api/request');
      const res = await post(`/events/${spaceId}/create`, data);
      if (res && res.code === 0) {
        showToast('创建成功');
        setShowCreate(false);
        loadEvents();
      } else {
        showToast(res?.message || '创建失败');
      }
    } catch { showToast('创建失败'); }
  };

  const handleEdit = async (eventId, data) => {
    try {
      const { put } = await import('../api/request');
      const res = await put(`/events/${eventId}`, data);
      if (res && res.code === 0) {
        showToast('更新成功');
        // 保存版本历史
        const event = events.find(e => (e.event_id || e.id) === eventId);
        if (event) {
          const newVersion = (event.current_version || 1) + 1;
          event.versions = [...(event.versions || []), {
            version: newVersion,
            content: data.description || event.description || '',
            author: '当前用户',
            date: new Date().toISOString().split('T')[0],
          }];
          event.current_version = newVersion;
        }
        setEditingEvent(null);
        loadEvents();
      } else {
        showToast(res?.message || '更新失败');
      }
    } catch { showToast('更新失败'); }
  };

  // ===== 版本对比 =====
  const handleVersionCompare = (event) => {
    setCompareEvent(event);
    setCompareVersions(event.versions || []);
    setShowVersionCompare(true);
  };

  // ===== F6.8 修订历史 =====
  const handleRevisionHistory = async (event) => {
    setRevisionEvent(event);
    try {
      const { get } = await import('../api/request');
      const res = await get(`/events/${event.event_id}/revisions`);
      if (res && res.code === 0) {
        setRevisionHistory(res.data || []);
      } else {
        setRevisionHistory([]);
      }
    } catch {
      setRevisionHistory([]);
    }
    setShowRevisionHistory(true);
  };

  // ===== F6.8 差异对比 =====
  const handleDiffCompare = async (eventId, revisionId) => {
    try {
      const { get } = await import('../api/request');
      const res = await get(`/events/${eventId}/diff/${revisionId}`);
      if (res && res.code === 0) {
        setRevisionHistory(prev => prev.map(r => r.id === revisionId ? { ...r, diff: res.data.diffs } : r));
      }
    } catch { /* 忽略 */ }
  };

  const renderDiff = (v1, v2) => {
    if (!v1 || !v2) return null;
    const lines1 = v1.content.split('\n');
    const lines2 = v2.content.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const result = [];
    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i] || '';
      const l2 = lines2[i] || '';
      if (l1 !== l2) {
        result.push(
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
            {l1 ? (
              <div style={{ flex: 1, color: '#C62828', background: '#FFEBEE', padding: '2px 8px', borderRadius: 4 }}>
                - {l1}
              </div>
            ) : (
              <div style={{ flex: 1, color: '#C62828', background: '#FFEBEE', padding: '2px 8px', borderRadius: 4 }}>
                - (无)
              </div>
            )}
            {l2 ? (
              <div style={{ flex: 1, color: '#2E7D32', background: '#E8F5E9', padding: '2px 8px', borderRadius: 4 }}>
                + {l2}
              </div>
            ) : (
              <div style={{ flex: 1, color: '#2E7D32', background: '#E8F5E9', padding: '2px 8px', borderRadius: 4 }}>
                + (无)
              </div>
            )}
          </div>
        );
      }
    }
    return result.length > 0 ? result : <div style={{ color: 'var(--ink-tertiary)', fontSize: 13, padding: '8px 0' }}>内容相同，无差异</div>;
  };

  // ===== 补充记录 =====
  const handleAddSupplement = () => {
    if (!supplementText.trim()) { showToast('请输入补充内容'); return; }
    const event = events.find(e => (e.event_id || e.id) === supplementEvent?.event_id);
    if (event) {
      event.supplements = [...(event.supplements || []), {
        id: 's' + Date.now(),
        text: supplementText,
        author: supplementAuthor || '当前用户',
        date: new Date().toISOString().split('T')[0],
      }];
      showToast('补充记录已添加');
    }
    setShowSupplement(false);
    setSupplementText('');
    setSupplementAuthor('');
    setSupplementEvent(null);
    loadEvents();
  };

  const handleDeleteSupplement = (eventId, supId) => {
    if (!confirm('确定删除此补充记录？')) return;
    const event = events.find(e => (e.event_id || e.id) === eventId);
    if (event) {
      event.supplements = (event.supplements || []).filter(s => s.id !== supId);
      loadEvents();
      showToast('已删除');
    }
  };

  const filteredEvents = filterType === 'all' ? events : events.filter(e => e.event_type === filterType);
  const types = ['all', ...new Set(events.map(e => e.event_type).filter(Boolean))];

  const typeColors = {
    '出生': '#4A6741',
    '婚嫁': '#C2185B',
    '逝世': '#616161',
    '学业': '#1565C0',
    '迁徙': '#F57C00',
    '团聚': '#8B5CF6',
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📅 家族大事记" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 创建按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--ink-tertiary)' }}>{events.length} 条记录</span>
          <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }}
            onClick={() => setShowCreate(true)}>
            <Icon.Plus size={14} /> 添加大事记
          </button>
        </div>

        {/* 类型筛选 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
              border: `1.5px solid ${filterType === t ? 'var(--ink-green)' : 'var(--line-light)'}`,
              background: filterType === t ? '#E8F5E9' : 'white',
              color: filterType === t ? 'var(--ink-green)' : 'var(--ink-primary)',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {t === 'all' ? '全部' : t}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          filteredEvents.map(event => (
            <div key={event.event_id || event.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: typeColors[event.event_type] ? typeColors[event.event_type] + '20' : 'var(--ink-green-soft)',
                  color: typeColors[event.event_type] || 'var(--ink-green)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700
                }}>
                  {(event.event_type || '事').charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)' }}>{event.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                    {event.event_date || event.year || ''}
                  </div>
                </div>
                <span className="badge" style={{
                  background: typeColors[event.event_type] ? typeColors[event.event_type] + '20' : '#E8F5E9',
                  color: typeColors[event.event_type] || 'var(--ink-green)',
                }}>{event.event_type || '其他'}</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.6, margin: '8px 0 0', fontFamily: 'var(--font-serif)' }}>
                {event.description || event.desc || ''}
              </p>

              {/* 版本/补充信息 */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--ink-tertiary)', flexWrap: 'wrap' }}>
                {event.versions && event.versions.length > 1 && (
                  <span style={{ cursor: 'pointer', color: '#1565C0' }} onClick={() => handleVersionCompare(event)}>
                    📋 {event.current_version || 1} 个版本
                  </span>
                )}
                {event.supplements && event.supplements.length > 0 && (
                  <span style={{ cursor: 'pointer', color: '#F57C00' }} onClick={() => setShowSupplement(event)}>
                    📝 {event.supplements.length} 条补充
                  </span>
                )}
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setEditingEvent(event)} style={{ background: 'none', border: '1px solid var(--line-light)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: 'var(--ink-secondary)' }}>✏️ 编辑</button>
                <button onClick={() => handleVersionCompare(event)} style={{ background: 'none', border: '1px solid var(--line-light)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#1565C0' }}>📋 版本对比</button>
                <button onClick={() => handleRevisionHistory(event)} style={{ background: 'none', border: '1px solid var(--line-light)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#6A1B9A' }}>📜 修订历史</button>
                <button onClick={() => setSupplementEvent(event)} style={{ background: 'none', border: '1px solid var(--line-light)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#F57C00' }}>📝 补充记录</button>
                <button onClick={() => handleDelete(event.event_id || event.id)} style={{ background: 'none', border: '1px solid var(--line-light)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, color: '#C62828' }}>🗑️ 删除</button>
              </div>

              {/* 补充记录列表 */}
              {event.supplements && event.supplements.length > 0 && (
                <div style={{ marginTop: 8, borderTop: '1px solid var(--line-light)', paddingTop: 8 }}>
                  {event.supplements.map(sup => (
                    <div key={sup.id} style={{ background: '#FFF8E1', borderRadius: 6, padding: '8px 10px', marginBottom: 4, position: 'relative' }}>
                      <div style={{ fontSize: 12, color: '#F57C00', marginBottom: 2 }}>
                        {sup.author} · {sup.date}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-secondary)', fontFamily: 'var(--font-serif)' }}>{sup.text}</div>
                      <button onClick={() => handleDeleteSupplement(event.event_id || event.id, sup.id)} style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--ink-tertiary)' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 创建/编辑弹窗 */}
      {(showCreate || editingEvent) && (
        <EventFormModal
          event={editingEvent}
          spaceId={spaceId}
          onSubmit={(data) => editingEvent ? handleEdit(editingEvent.event_id || editingEvent.id, data) : handleCreate(data)}
          onClose={() => { setShowCreate(false); setEditingEvent(null); }}
        />
      )}

      {/* 版本对比弹窗 */}
      {showVersionCompare && compareEvent && compareVersions.length >= 2 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowVersionCompare(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 16px', width: '90%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>📋 版本对比 - {compareEvent.title}</span>
              <button onClick={() => setShowVersionCompare(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={compareVersions.length > 1 ? 1 : 0} onChange={e => {}} style={{ flex: 1, height: 36, border: '1.5px solid var(--line-light)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                {compareVersions.map((v, i) => (
                  <option key={v.version} value={i}>第 {v.version} 版 - {v.author} ({v.date})</option>
                ))}
              </select>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 16, color: 'var(--ink-tertiary)' }}>→</span>
              <select value={compareVersions.length > 1 ? compareVersions.length - 1 : 0} onChange={e => {}} style={{ flex: 1, height: 36, border: '1.5px solid var(--line-light)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }}>
                {compareVersions.map((v, i) => (
                  <option key={v.version} value={i}>第 {v.version} 版 - {v.author} ({v.date})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#C62828', marginBottom: 4, fontWeight: 500 }}>📄 旧版本</div>
                <div style={{ background: '#FAFAFA', borderRadius: 6, padding: 10, minHeight: 60, fontFamily: 'var(--font-serif)', lineHeight: 1.6 }}>
                  {compareVersions[0]?.content || '无内容'}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#2E7D32', marginBottom: 4, fontWeight: 500 }}>📄 新版本</div>
                <div style={{ background: '#FAFAFA', borderRadius: 6, padding: 10, minHeight: 60, fontFamily: 'var(--font-serif)', lineHeight: 1.6 }}>
                  {compareVersions[compareVersions.length - 1]?.content || '无内容'}
                </div>
              </div>
            </div>

            {/* Diff 显示 */}
            {compareVersions.length >= 2 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 6 }}>差异对比：</div>
                {renderDiff(compareVersions[0], compareVersions[compareVersions.length - 1])}
              </div>
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center' }}>
              共 {compareVersions.length} 个版本 · 最后更新: {compareVersions[compareVersions.length - 1]?.date}
            </div>
          </div>
        </div>
      )}

      {/* ===== F6.8 修订历史弹窗 ===== */}
      {showRevisionHistory && revisionEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowRevisionHistory(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '20px 16px', width: '90%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>📜 修订历史 - {revisionEvent.title}</span>
              <button onClick={() => setShowRevisionHistory(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {revisionHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无修订记录</div>
            ) : (
              revisionHistory.map((rev, idx) => (
                <div key={rev.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: idx < revisionHistory.length - 1 ? '1px solid var(--line-light)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>
                      修订 #{idx + 1} · {rev.changed_by_name || rev.changed_by || '未知用户'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{rev.changed_at ? new Date(rev.changed_at).toLocaleString('zh-CN') : ''}</div>
                  </div>

                  {/* 变更摘要 */}
                  {rev.change_summary && (
                    <div style={{ fontSize: 12, color: '#F57C00', marginBottom: 6 }}>
                      变更字段: {rev.change_summary.fields ? rev.change_summary.fields.join(', ') : '未知'}
                    </div>
                  )}

                  {/* 差异对比 */}
                  <div style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#C62828', marginBottom: 2 }}>旧值</div>
                      <div style={{ background: '#FFF3E0', borderRadius: 6, padding: '8px 10px', fontFamily: 'var(--font-serif)', lineHeight: 1.6 }}>
                        {rev.old_data?.description || rev.old_data?.title || '无'}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: '#2E7D32', marginBottom: 2 }}>新值</div>
                      <div style={{ background: '#E8F5E9', borderRadius: 6, padding: '8px 10px', fontFamily: 'var(--font-serif)', lineHeight: 1.6 }}>
                        {rev.new_data?.description || rev.new_data?.title || '无'}
                      </div>
                    </div>
                  </div>

                  {/* 详细差异 */}
                  {rev.diff && rev.diff.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginBottom: 4 }}>字段差异：</div>
                      {rev.diff.map((d, i) => (
                        <div key={i} style={{ fontSize: 12, padding: '3px 8px', background: '#F5F5F5', borderRadius: 4, marginBottom: 2 }}>
                          <strong>{d.field}:</strong> {d.old_value ?? 'null'} → {d.new_value ?? 'null'}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 查看差异按钮 */}
                  <button onClick={() => handleDiffCompare(revisionEvent.event_id, rev.id)} style={{ marginTop: 6, background: 'none', border: '1px solid var(--line-light)', borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--ink-secondary)' }}>
                    🔍 查看详细差异
                  </button>
                </div>
              ))
            )}

            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center' }}>
              共 {revisionHistory.length} 条修订记录
            </div>
          </div>
        </div>
      )}

      {/* 补充记录弹窗 */}
      {showSupplement && supplementEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowSupplement(null)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>📝 补充记录 - {supplementEvent.title}</span>
              <button onClick={() => setShowSupplement(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>补充内容</label>
              <textarea value={supplementText} onChange={e => setSupplementText(e.target.value)}
                placeholder="补充关于这条大事记的信息..." rows={4}
                style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>姓名</label>
              <input value={supplementAuthor} onChange={e => setSupplementAuthor(e.target.value)}
                placeholder="您的姓名" style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            </div>

            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleAddSupplement}>添加补充</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 大事记表单弹窗
function EventFormModal({ event, spaceId, onSubmit, onClose }) {
  const [form, setForm] = React.useState(event || {
    title: '', event_type: '其他', event_date: new Date().toISOString().split('T')[0],
    description: '', space_id: spaceId,
  });
  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const types = ['出生', '婚嫁', '逝世', '学业', '迁徙', '团聚', '其他'];

  const handleSubmit = () => {
    if (!form.title.trim()) { showToast('请输入标题'); return; }
    onSubmit(form);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%', maxHeight: '80vh', overflow: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{event ? '编辑大事记' : '新建大事记'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>标题 *</label>
          <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
            placeholder="如：朱老太爷出生"
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>类型</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {types.map(t => (
              <button key={t} onClick={() => update('event_type', t)} style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
                border: `1.5px solid ${form.event_type === t ? 'var(--ink-green)' : 'var(--line-light)'}`,
                background: form.event_type === t ? '#E8F5E9' : 'white',
                color: form.event_type === t ? 'var(--ink-green)' : 'var(--ink-primary)',
                cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>日期</label>
          <input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)}
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>描述</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="详细描述..." rows={3}
            style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleSubmit}>
          {event ? '保存' : '创建'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { EventsPage });
