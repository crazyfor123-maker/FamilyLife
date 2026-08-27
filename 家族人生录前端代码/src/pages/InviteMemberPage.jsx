// ===== 邀请成员页 =====
function InviteMemberPage({ onBack }) {
  const [inviteLink, setInviteLink] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleCreateInvite = async () => {
    setLoading(true);
    try {
      const { inviteMember } = await import('../api/member');
      const res = await inviteMember('1', { preset_role: 'member', max_uses: 10 });
      setLoading(false);
      if (res.code === 0 && res.data) {
        const link = `https://family-life-record.app/join/${res.data.token}`;
        setInviteLink(link);
        showToast('邀请链接已生成');
      } else {
        showToast(res.message || '生成失败');
      }
    } catch {
      setLoading(false);
      showToast('网络异常');
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink);
      showToast('链接已复制');
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="邀请成员" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card-paper" style={{ padding: '24px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📩</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
            邀请家人加入
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0 }}>
            生成邀请链接或二维码，分享给家人<br/>让他们加入这个家族空间
          </p>
        </div>

        {!inviteLink ? (
          <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
            onClick={handleCreateInvite} disabled={loading}>
            {loading ? '生成中...' : '生成邀请链接'}
          </button>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8 }}>邀请链接</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="text" value={inviteLink} readOnly
                style={{ flex: 1, height: 40, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 10px', fontSize: 13, background: 'var(--paper-warm)' }} />
              <button className="btn btn-secondary" style={{ height: 40, padding: '0 16px' }} onClick={handleCopy}>
                复制
              </button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8 }}>或手动输入邀请码</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="输入16位邀请码"
              style={{ flex: 1, height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
            <button className="btn btn-primary" style={{ height: 44, padding: '0 20px' }}>加入</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InviteMemberPage });