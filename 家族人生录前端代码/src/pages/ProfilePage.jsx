// ===== 我的页面 =====
function ProfilePage({ onNavigate, onLogout }) {
  const [elderlyFont, setElderlyFont] = React.useState(() => {
    return localStorage.getItem('elderly_font') === '1';
  });
  const [highContrast, setHighContrast] = React.useState(() => {
    return localStorage.getItem('high_contrast') === '1';
  });

  React.useEffect(() => {
    document.documentElement.classList.toggle('elderly-font', elderlyFont);
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('elderly_font', elderlyFont ? '1' : '0');
    localStorage.setItem('high_contrast', highContrast ? '1' : '0');
  }, [elderlyFont, highContrast]);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="我的" showBack={false} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="avatar avatar-lg" style={{ background: 'var(--ink-green-soft)', color: 'var(--ink-green)' }}>我</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)' }}>用户</div>
            <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginTop: 2 }}>点击编辑个人信息</div>
          </div>
          <Icon.ChevronRight size={20} color="var(--ink-tertiary)" />
        </div>

        {/* 中老年模式 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8, paddingLeft: 4 }}>适老模式</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              {
                label: '超大字体',
                desc: '增大所有文字和按钮尺寸',
                icon: '🔤',
                type: 'toggle',
                value: elderlyFont,
                onToggle: () => setElderlyFont(v => !v),
              },
              {
                label: '高对比度',
                desc: '增强文字与背景对比度',
                icon: '🌓',
                type: 'toggle',
                value: highContrast,
                onToggle: () => setHighContrast(v => !v),
              },
              {
                label: '语音引导',
                desc: '开启操作语音播报',
                icon: '🔊',
                type: 'link',
                page: 'voiceGuide',
              },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 2 ? '1px solid var(--line-light)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (item.type === 'toggle') item.onToggle();
                else if (item.page) onNavigate(item.page);
              }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: 'var(--ink-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{item.desc}</div>
                </div>
                {item.type === 'toggle' ? (
                  <label style={{ position: 'relative', width: 44, height: 24, flexShrink: 0 }}>
                    <input type="checkbox" checked={item.value} onChange={() => {}}
                      style={{ display: 'none' }} />
                    <span style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: item.value ? 'var(--ink-green)' : '#E0E0E0',
                      borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
                    }} />
                    <span style={{
                      position: 'absolute', top: 2, left: item.value ? 24 : 2,
                      width: 20, height: 20, background: 'white', borderRadius: '50%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s',
                    }} />
                  </label>
                ) : (
                  <Icon.ChevronRight size={18} color="var(--ink-tertiary)" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8, paddingLeft: 4 }}>家族管理</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              { label: '我的家族', icon: Icon.Home, page: 'familyList' },
              { label: '成员管理', icon: Icon.Users, page: 'memberManage' },
              { label: '邀请成员', icon: Icon.UserPlus, page: 'inviteMember' },
              { label: '家族设置', icon: Icon.Settings, page: 'familySettings' },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 3 ? '1px solid var(--line-light)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (item.page) onNavigate(item.page);
                else showToast(`${item.label}功能开发中`);
              }}>
                <item.icon size={20} color="var(--ink-green)" />
                <span style={{ fontSize: 15, color: 'var(--ink-primary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8, paddingLeft: 4 }}>存储与备份</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              { label: '本地存储', icon: Icon.Storage, page: 'cloudStorage' },
              { label: '云端同步', icon: Icon.Cloud, page: 'cloudStorage' },
              { label: '备份与恢复', icon: Icon.Backup, page: 'restore' },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 2 ? '1px solid var(--line-light)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                if (item.page) onNavigate(item.page);
                else showToast(`${item.label}功能开发中`);
              }}>
                <item.icon size={20} color="var(--ink-green)" />
                <span style={{ fontSize: 15, color: 'var(--ink-primary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8, paddingLeft: 4 }}>隐私与帮助</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              { label: 'AI隐私保护', icon: '🔒', page: 'aiPrivacy' },
              { label: '素材管理中心', icon: '📦', page: 'materialCenter' },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 1 ? '1px solid var(--line-light)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => onNavigate(item.page)}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 15, color: 'var(--ink-primary)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8, paddingLeft: 4 }}>关于</div>
          <div className="card" style={{ padding: 0 }}>
            {[
              { label: '版本', value: 'V1.0.0' },
              { label: '隐私政策', value: '' },
              { label: '用户协议', value: '' },
            ].map((item, i) => (
              <div key={item.label} style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: i < 2 ? '1px solid var(--line-light)' : 'none'
              }}>
                <span style={{ fontSize: 15, color: 'var(--ink-primary)', flex: 1 }}>{item.label}</span>
                {item.value && <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>{item.value}</span>}
                <Icon.ChevronRight size={18} color="var(--ink-tertiary)" />
              </div>
            ))}
          </div>
        </div>

        <button className="btn btn-danger btn-block" style={{ height: 48 }} onClick={onLogout}>
          退出登录
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { ProfilePage });
