// ===== 关系管理页面 =====
function RelationshipManagePage({ personId, onBack }) {
  const [relations, setRelations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreate, setShowCreate] = React.useState(false);
  const [showValidate, setShowValidate] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState(null);
  const [editingNote, setEditingNote] = React.useState(null);
  const [noteText, setNoteText] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');

  React.useEffect(() => {
    loadRelations();
  }, [personId]);

  const loadRelations = async () => {
    setLoading(true);
    try {
      const { getPersonRelations } = await import('../api/kinship');
      const res = await getPersonRelations('1', personId);
      if (res && res.code === 0) {
        setRelations(res.data || []);
      } else {
        setRelations(MockData.relations || []);
      }
    } catch {
      setRelations(MockData.relations || []);
    } finally {
      setLoading(false);
    }
  };

  // 编辑备注
  const startEditNote = (relation) => {
    setEditingNote(relation.id);
    setNoteText(relation.note || '');
  };

  const saveNote = async (relationId) => {
    try {
      const { post } = await import('../api/request');
      const res = await post(`/kinship/1/${relationId}/note`, { note: noteText.trim() });
      if (res && res.code === 0) {
        showToast('备注已更新');
        setEditingNote(null);
        setNoteText('');
        loadRelations();
      } else {
        showToast(res?.message || '保存失败');
      }
    } catch {
      showToast('保存失败');
      setEditingNote(null);
    }
  };

  const cancelEditNote = () => {
    setEditingNote(null);
    setNoteText('');
  };

  // 筛选
  const filteredRelations = filterType === 'all' ? relations : relations.filter(r => r.type === filterType);
  const allTypes = ['all', ...new Set(relations.map(r => r.type))];

  const handleCreate = async (data) => {
    try {
      const { post } = await import('../api/request');
      const res = await post('/relations/create', { ...data, person_id: personId });
      if (res && res.code === 0) {
        showToast('关系创建成功');
        setShowCreate(false);
        loadRelations();
      } else {
        showToast(res?.message || '创建失败');
      }
    } catch { showToast('创建失败'); }
  };

  const handleDelete = async (relationId) => {
    if (!confirm('确定删除此关系？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/relations/${relationId}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadRelations();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  const handleValidate = async () => {
    setShowValidate(true);
    try {
      const { validateRelations } = await import('../api/kinship');
      const res = await validateRelations('1', personId);
      if (res && res.code === 0) {
        setValidationResult(res.data || {});
      } else {
        setValidationResult({
          total_relations: relations.length,
          valid: relations.length,
          issues: [],
          warnings: ['验证功能需要后端支持'],
        });
      }
    } catch {
      setValidationResult({
        total_relations: relations.length,
        valid: relations.length,
        issues: [],
        warnings: ['验证失败'],
      });
    }
  };

  const relationTypeIcons = {
    '父子': '👨‍👦',
    '母子': '👩‍👦',
    '夫妻': '💑',
    '兄弟': '👬',
    '姐妹': '👭',
    '祖孙': '👴‍👦',
    '叔侄': '👨‍👦',
    '其他': '📌',
  };

  const types = ['父子', '母子', '夫妻', '兄弟', '姐妹', '祖孙', '叔侄', '其他'];

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🔗 关系管理" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: 'var(--ink-tertiary)' }}>{relations.length} 个关系</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-tertiary)', alignSelf: 'center' }}>筛选：</span>
            {allTypes.map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
                border: `1.5px solid ${filterType === t ? 'var(--ink-green)' : 'var(--line-light)'}`,
                background: filterType === t ? '#E8F5E9' : 'white',
                color: filterType === t ? 'var(--ink-green)' : 'var(--ink-primary)',
                cursor: 'pointer',
              }}>{t === 'all' ? '全部' : t}</button>
            ))}
          </div>
            <button className="btn btn-secondary" style={{ height: 36, fontSize: 13, padding: '0 12px' }}
              onClick={handleValidate}>
              🔍 校验关系
            </button>
            <button className="btn btn-secondary" style={{ height: 36, fontSize: 13, padding: '0 12px' }}
              onClick={() => setShowCreate(true)}>
              <Icon.Plus size={14} /> 添加关系
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : relations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无关系记录</div>
        ) : (
          relations.map(r => (
            <div key={r.id} className="card" style={{ padding: '12px 14px', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>{relationTypeIcons[r.type] || '📌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>
                    {r.from_name || '未知'} — {r.type} — {r.to_name || '未知'}
                  </div>
                  {editingNote === r.id ? (
                    <div style={{ marginTop: 6 }}>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                        rows={2} style={{
                          width: '100%', border: '1.5px solid var(--ink-green)', borderRadius: 6,
                          padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font-serif)',
                          resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                        }} />
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        <button onClick={() => saveNote(r.id)} style={{
                          background: 'var(--ink-green)', color: 'white', border: 'none',
                          borderRadius: 4, padding: '3px 10px', fontSize: 12, cursor: 'pointer',
                        }}>✓ 保存</button>
                        <button onClick={cancelEditNote} style={{
                          background: '#F5F5F5', border: 'none', borderRadius: 4,
                          padding: '3px 10px', fontSize: 12, cursor: 'pointer',
                        }}>✕ 取消</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', cursor: 'pointer' }}
                      onClick={() => startEditNote(r)}>
                      📝 {r.note || '点击添加备注'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))
        )}

        {/* 校验结果 */}
        {showValidate && validationResult && (
          <div className="card" style={{ padding: 14, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>校验结果</span>
              <button onClick={() => setShowValidate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.7 }}>
              <div>📊 总关系数：{validationResult.total_relations || 0}</div>
              <div>✅ 有效关系：{validationResult.valid || 0}</div>
              <div>⚠️ 问题数：{validationResult.issues?.length || 0}</div>
              {validationResult.warnings && validationResult.warnings.length > 0 && (
                <div style={{ marginTop: 8, color: '#D32F2F' }}>
                  {validationResult.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 添加关系弹窗 */}
      {showCreate && (
        <RelationCreateForm types={types} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function RelationCreateForm({ types, onSubmit, onClose }) {
  const [form, setForm] = React.useState({
    from_id: '', from_name: '', to_id: '', to_name: '',
    type: '其他', note: '',
  });
  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = () => {
    if (!form.from_name.trim() || !form.to_name.trim()) {
      showToast('请填写双方姓名'); return;
    }
    onSubmit(form);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>添加关系</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>姓名1</label>
          <input type="text" value={form.from_name} onChange={e => update('from_name', e.target.value)}
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>关系类型</label>
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
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>姓名2</label>
          <input type="text" value={form.to_name} onChange={e => update('to_name', e.target.value)}
            style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>备注</label>
          <textarea value={form.note} onChange={e => update('note', e.target.value)}
            rows={2} style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleSubmit}>创建关系</button>
      </div>
    </div>
  );
}

Object.assign(window, { RelationshipManagePage });
