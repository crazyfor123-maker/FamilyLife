// ===== AI 隐私保护页面 =====
function AIPrivacyPage({ onBack }) {
  const [settings, setSettings] = React.useState({
    desensitize_name: true,
    desensitize_address: true,
    desensitize_phone: true,
    desensitize_id_card: true,
    local_processing: true,
    audit_enabled: true,
    data_retention_days: 30,
  });
  const [auditResult, setAuditResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const update = (field, value) => setSettings(s => ({ ...s, [field]: value }));

  const handleSave = async () => {
    setLoading(true);
    try {
      const { post } = await import('../api/request');
      const res = await post('/ai/privacy/settings', settings);
      if (res && res.code === 0) {
        showToast('设置已保存');
      } else {
        showToast(res?.message || '保存失败');
      }
    } catch { showToast('保存失败'); }
    setLoading(false);
  };

  const handleAudit = async () => {
    setLoading(true);
    try {
      const { aiAudit } = await import('../api/ai');
      const res = await aiAudit();
      if (res && res.code === 0) {
        setAuditResult(res.data || {});
      } else {
        showToast(res?.message || '审计失败');
      }
    } catch { showToast('审计失败'); }
    setLoading(false);
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🔒 AI 隐私保护" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 隐私说明 */}
        <div className="card-paper" style={{ padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>· 隐私保护说明 ·</div>
          <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.7 }}>
            AI 在处理您的家族数据时，可以自动脱敏个人信息（姓名、地址、电话、身份证号等），确保数据在云端处理时的安全性。
          </div>
        </div>

        {/* 脱敏设置 */}
        <div className="card" style={{ padding: '14px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>个人信息脱敏</div>
          {[
            { key: 'desensitize_name', label: '姓名脱敏', desc: '将姓名替换为 * 号' },
            { key: 'desensitize_address', label: '地址脱敏', desc: '将详细地址替换为城市级' },
            { key: 'desensitize_phone', label: '电话脱敏', desc: '将电话号码中间 4 位替换为 *' },
            { key: 'desensitize_id_card', label: '身份证号脱敏', desc: '将身份证号替换为 ****' },
          ].map(item => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-light)' }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink-primary)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{item.desc}</div>
              </div>
              <label style={{ position: 'relative', width: 44, height: 24 }}>
                <input type="checkbox" checked={settings[item.key]} onChange={e => update(item.key, e.target.checked)}
                  style={{ display: 'none' }} />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: settings[item.key] ? 'var(--ink-green)' : '#E0E0E0',
                  borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                }} />
                <span style={{
                  position: 'absolute', top: 2, left: settings[item.key] ? 24 : 2,
                  width: 20, height: 20, background: 'white', borderRadius: '50%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                }} />
              </label>
            </div>
          ))}
        </div>

        {/* 数据处理设置 */}
        <div className="card" style={{ padding: '14px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>数据处理</div>
          {[
            { key: 'local_processing', label: '本地处理优先', desc: '优先在本地设备处理数据' },
            { key: 'audit_enabled', label: '数据审计', desc: '自动检测敏感数据并提醒' },
          ].map(item => (
            <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line-light)' }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--ink-primary)' }}>{item.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{item.desc}</div>
              </div>
              <label style={{ position: 'relative', width: 44, height: 24 }}>
                <input type="checkbox" checked={settings[item.key]} onChange={e => update(item.key, e.target.checked)}
                  style={{ display: 'none' }} />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: settings[item.key] ? 'var(--ink-green)' : '#E0E0E0',
                  borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                }} />
                <span style={{
                  position: 'absolute', top: 2, left: settings[item.key] ? 24 : 2,
                  width: 20, height: 20, background: 'white', borderRadius: '50%',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                }} />
              </label>
            </div>
          ))}

          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>数据保留天数</label>
            <input type="number" value={settings.data_retention_days} onChange={e => update('data_retention_days', parseInt(e.target.value) || 30)}
              style={{ width: 80, height: 36, border: '1.5px solid var(--line-soft)', borderRadius: 6, padding: '0 8px', fontSize: 14, textAlign: 'center' }} />
            <span style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginLeft: 4 }}>天</span>
          </div>
        </div>

        {/* 数据审计 */}
        <div className="card" style={{ padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>数据审计</span>
            <button className="btn btn-secondary" style={{ height: 32, fontSize: 12, padding: '0 10px' }}
              onClick={handleAudit} disabled={loading}>
              {loading ? '审计中...' : '运行审计'}
            </button>
          </div>
          {auditResult && (
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.7 }}>
              <div>📊 扫描文件：{auditResult.total_files || 0}</div>
              <div>⚠️ 敏感数据：{auditResult.sensitive_count || 0}</div>
              <div>✅ 已脱敏：{auditResult.desensitized_count || 0}</div>
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
          onClick={handleSave} disabled={loading}>
          保存设置
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AIPrivacyPage });
