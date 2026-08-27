// ===== 加入家族页 =====
function JoinMemberPage({ onBack }) {
  const [inviteCode, setInviteCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const handleJoin = async () => {
    if (!inviteCode.trim()) { showToast('请输入邀请码'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      const { joinMember } = await import('../api/member');
      const res = await joinMember(inviteCode.trim());
      setLoading(false);
      if (res.code === 0) {
        showToast('加入成功');
        setTimeout(onBack, 800);
      } else {
        setErrorMsg(res.message || '邀请码无效');
      }
    } catch {
      setLoading(false);
      setErrorMsg('网络异常，请重试');
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="加入家族" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div className="card-paper" style={{ padding: '24px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👨‍👩‍👧‍👦</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
            加入家族空间
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0 }}>
            请输入家人提供的邀请码<br/>加入家族空间
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: '10px 16px', background: '#FFF3F3', border: '1px solid #FFD5D5', borderRadius: 'var(--radius-md)', color: '#D32F2F', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 8 }}>邀请码</label>
          <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="请输入16位邀请码"
            style={{ width: '100%', height: 52, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 14px', fontSize: 20, textAlign: 'center', letterSpacing: 4, background: 'var(--white)', outline: 'none' }} />
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
          onClick={handleJoin} disabled={loading}>
          {loading ? '加入中...' : '加入家族'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { JoinMemberPage });