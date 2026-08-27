// ===== 家族设置页 =====
function FamilySettingsPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [form, setForm] = React.useState({
    space_name: '朱氏家族', motto: '耕读传家远，诗书继世长',
    description: '', founding_year: 1920, origin: '浙江绍兴'
  });
  const [loading, setLoading] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  React.useEffect(() => {
    // 加载当前家族信息
    import('../api/family').then(m => m.getFamily(spaceId)).then(res => {
      if (res?.code === 0 && res.data) {
        setForm({
          space_name: res.data.space_name || form.space_name,
          motto: res.data.motto || form.motto,
          description: res.data.description || form.description,
          founding_year: res.data.founding_year || form.founding_year,
          origin: res.data.origin || form.origin,
        });
      }
    }).catch(() => {});
  }, [spaceId]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.space_name.trim()) { showToast('家族名称不能为空'); return; }
    setLoading(true);
    try {
      const { updateFamily } = await import('../api/family');
      const res = await updateFamily(spaceId, form);
      setLoading(false);
      if (res.code === 0) { showToast('保存成功'); setTimeout(onBack, 800); }
      else showToast(res.message || '保存失败');
    } catch { setLoading(false); showToast('网络异常'); }
  };

  const handleDelete = async () => {
    if (!confirm('⚠️ 确定要删除此家族空间？此操作不可恢复，所有数据将被永久删除！')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/family/${spaceId}`);
      if (res && res.code === 0) {
        showToast('家族空间已删除');
        window.location.hash = '#/family-list';
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="家族设置" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· 基本信息 ·</div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>家族名称</label>
            <input type="text" value={form.space_name} onChange={e => update('space_name', e.target.value)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>家训</label>
            <input type="text" value={form.motto} onChange={e => update('motto', e.target.value)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>家族起源</label>
            <input type="text" value={form.origin} onChange={e => update('origin', e.target.value)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}> founding year</label>
            <input type="number" value={form.founding_year} onChange={e => update('founding_year', parseInt(e.target.value) || 0)}
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>简介</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)}
              rows={3} style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, marginTop: 16, fontSize: 16 }}
          onClick={handleSave} disabled={loading}>
          {loading ? '保存中...' : '💾 保存'}
        </button>

        {/* 危险操作 */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line-light)' }}>
          <button className="btn btn-block" style={{ height: 44, fontSize: 14, background: '#FFF3F3', color: '#D32F2F', border: '1px solid #FFD5D5' }}
            onClick={() => setShowDeleteModal(true)}>
            🗑️ 删除家族空间
          </button>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowDeleteModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '85%', maxWidth: 400 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#D32F2F' }}>删除家族空间</div>
              <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginTop: 8, lineHeight: 1.6 }}>
                此操作将永久删除：<br/>
                - 所有家族成员数据<br/>
                - 人物档案与亲属关系<br/>
                - 家族故事与大事记<br/>
                - 人生之书与采访素材<br/><br/>
                <b>此操作不可恢复！</b>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={() => setShowDeleteModal(false)}>取消</button>
              <button className="btn" style={{ flex: 1, height: 44, fontSize: 14, background: '#D32F2F', color: 'white', border: 'none' }} onClick={handleDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FamilySettingsPage });
