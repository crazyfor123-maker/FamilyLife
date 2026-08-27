// ===== 家族空间创建页面 =====
function FamilyCreatePage({ onBack }) {
  const [form, setForm] = React.useState({
    name: '',
    motto: '耕读传家远，诗书继世长',
    origin: '',
    description: '',
    founding_year: new Date().getFullYear().toString(),
  });
  const [loading, setLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('请输入家族名称'); return; }
    setLoading(true);
    try {
      const { createFamily } = await import('../api/family');
      const res = await createFamily({
        name: form.name.trim(),
        motto: form.motto.trim() || '家和万事兴',
        origin: form.origin.trim(),
        description: form.description.trim(),
        founding_year: parseInt(form.founding_year) || null,
      });
      setLoading(false);
      if (res && res.code === 0) {
        showToast('家族创建成功！');
        // 刷新家族列表并切换
        const { getFamilies } = await import('../api/family');
        const familiesRes = await getFamilies();
        if (familiesRes && familiesRes.code === 0 && familiesRes.data) {
          const newFamily = familiesRes.data.find(f => f.space_name === form.name.trim());
          if (newFamily) {
            const { switchFamily } = await import('../api/family');
            await switchFamily(String(newFamily.space_id));
            // 通知父组件刷新
            if (onBack && onBack.__isSwitch) {
              onBack();
            } else {
              showToast('已切换到新家族');
              setTimeout(onBack, 800);
            }
          } else {
            setTimeout(onBack, 800);
          }
        } else {
          setTimeout(onBack, 800);
        }
      } else {
        showToast(res?.message || '创建失败');
      }
    } catch (err) {
      setLoading(false);
      showToast('创建失败：' + (err.message || '网络异常'));
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="创建家族" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 家训模板 */}
        <div className="card-paper" style={{ padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 10, fontFamily: 'var(--font-serif)' }}>· 家训模板（可选）·</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              '耕读传家远，诗书继世长',
              '勤俭持家，忠厚处世',
              '家和万事兴',
              '厚德载物，自强不息',
              '修身齐家治国平天下',
              '读书明理，诚信立身',
            ].map(template => (
              <button
                key={template}
                onClick={() => update('motto', template)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12,
                  border: form.motto === template ? '1.5px solid var(--ink-green)' : '1.5px solid var(--line-soft)',
                  cursor: 'pointer',
                  background: form.motto === template ? '#E8F5E9' : 'white',
                  color: form.motto === template ? 'var(--ink-green)' : 'var(--ink-primary)',
                }}
              >
                {template}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· 家族信息 ·</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>家族名称 *</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
              placeholder="例如：朱氏家族"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>家训</label>
            <input type="text" value={form.motto} onChange={e => update('motto', e.target.value)}
              placeholder="请输入家训"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>家族起源</label>
            <input type="text" value={form.origin} onChange={e => update('origin', e.target.value)}
              placeholder="例如：浙江绍兴"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>始迁年份</label>
            <input type="number" value={form.founding_year} onChange={e => update('founding_year', e.target.value)}
              placeholder="例如：1920"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>简介</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)}
              placeholder="简要介绍这个家族..."
              rows={3}
              style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 15, background: 'var(--white)', outline: 'none', fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? '创建中...' : '创建家族'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FamilyCreatePage });
