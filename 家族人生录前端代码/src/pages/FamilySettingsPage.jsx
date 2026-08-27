// ===== 家族设置页 =====
function FamilySettingsPage({ onBack }) {
  const [form, setForm] = React.useState({
    space_name: '朱氏家族', motto: '耕读传家远，诗书继世长',
    description: '', founding_year: 1920, origin: '浙江绍兴'
  });
  const [loading, setLoading] = React.useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const { updateFamily } = await import('../api/family');
      const res = await updateFamily('1', form);
      setLoading(false);
      if (res.code === 0) { showToast('保存成功'); setTimeout(onBack, 800); }
      else showToast(res.message || '保存失败');
    } catch { setLoading(false); showToast('网络异常'); }
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
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>起源</label>
            <input type="text" value={form.origin} onChange={e => update('origin', e.target.value)}
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
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { FamilySettingsPage });
