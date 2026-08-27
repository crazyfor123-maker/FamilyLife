// ===== 人物档案创建页 =====
function PersonCreatePage({ onBack }) {
  const [form, setForm] = React.useState({
    name: '', gender: '男', birth_date: '', death_date: '',
    status: 'living', generation: '', birth_place: '', residence: '',
    occupation: '', education: '', bio: '', is_self: 0
  });
  const [loading, setLoading] = React.useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('请输入姓名'); return; }
    setLoading(true);
    try {
      const { createPerson } = await import('../api/person');
      const res = await createPerson(form);
      setLoading(false);
      if (res.code === 0) {
        showToast('创建成功');
        setTimeout(onBack, 800);
      } else {
        showToast(res.message || '创建失败');
      }
    } catch (e) {
      setLoading(false);
      showToast('网络异常，请重试');
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="添加成员" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· 基本信息 ·</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>姓名 *</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
              placeholder="请输入姓名"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>性别</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['男', '女'].map(g => (
                <button key={g} onClick={() => update('gender', g)} style={{
                  flex: 1, height: 40, border: '1.5px solid', borderRadius: 'var(--radius-md)',
                  fontSize: 15, cursor: 'pointer',
                  background: form.gender === g ? 'var(--ink-green)' : 'var(--white)',
                  borderColor: form.gender === g ? 'var(--ink-green)' : 'var(--line-soft)',
                  color: form.gender === g ? 'var(--white)' : 'var(--ink-primary)'
                }}>{g}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>状态</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {[{ v: 'living', l: '在世' }, { v: 'deceased', l: '已故' }].map(s => (
                <button key={s.v} onClick={() => update('status', s.v)} style={{
                  flex: 1, height: 40, border: '1.5px solid', borderRadius: 'var(--radius-md)',
                  fontSize: 15, cursor: 'pointer',
                  background: form.status === s.v ? 'var(--ink-green)' : 'var(--white)',
                  borderColor: form.status === s.v ? 'var(--ink-green)' : 'var(--line-soft)',
                  color: form.status === s.v ? 'var(--white)' : 'var(--ink-primary)'
                }}>{s.l}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>出生年份</label>
              <input type="number" value={form.birth_date?.split('-')[0] || ''} onChange={e => update('birth_date', e.target.value + '-01-01')}
                placeholder="年"
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>代数</label>
              <input type="number" value={form.generation} onChange={e => update('generation', parseInt(e.target.value) || 0)}
                placeholder="代"
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 16px 8px' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· 详细信息 ·</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>出生地</label>
            <input type="text" value={form.birth_place} onChange={e => update('birth_place', e.target.value)}
              placeholder="如：浙江绍兴"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>职业</label>
            <input type="text" value={form.occupation} onChange={e => update('occupation', e.target.value)}
              placeholder="如：退休教师"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>学历</label>
            <input type="text" value={form.education} onChange={e => update('education', e.target.value)}
              placeholder="如：高中"
              style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 6 }}>生平简介</label>
            <textarea value={form.bio} onChange={e => update('bio', e.target.value)}
              placeholder="简要介绍此人的生平事迹..."
              rows={4}
              style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 15, background: 'var(--white)', outline: 'none', fontFamily: 'var(--font-serif)', resize: 'vertical' }} />
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16, marginTop: 16 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { PersonCreatePage });