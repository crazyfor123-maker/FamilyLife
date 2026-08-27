// ===== 加入家族页 =====
function JoinMemberPage({ onBack }) {
  const [inviteCode, setInviteCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    // 从URL参数自动填入邀请码
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) setInviteCode(code.toUpperCase());
  }, []);

  const handleJoin = async () => {
    if (!inviteCode.trim()) { showToast('请输入邀请码'); return; }
    if (inviteCode.length < 8) { setErrorMsg('邀请码格式不正确'); return; }
    setLoading(true);
    setErrorMsg('');
    try {
      const { joinMember } = await import('../api/member');
      const res = await joinMember(inviteCode.trim());
      setLoading(false);
      if (res.code === 0) {
        showToast('✅ 加入成功！');
        setTimeout(() => {
          if (onBack) onBack();
          else window.location.hash = '#/family-list';
        }, 800);
      } else {
        // 错误信息细化
        if (res.message?.includes('expired') || res.message?.includes('过期')) {
          setErrorMsg('⏰ 邀请码已过期，请联系家人重新生成');
        } else if (res.message?.includes('limit') || res.message?.includes('次数')) {
          setErrorMsg('🚫 邀请码已达使用次数上限，请联系家人重新生成');
        } else if (res.message?.includes('invalid') || res.message?.includes('无效')) {
          setErrorMsg('❌ 邀请码无效，请检查后重试');
        } else {
          setErrorMsg(res.message || '加入失败');
        }
      }
    } catch {
      setLoading(false);
      setErrorMsg('网络异常，请检查网络后重试');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInviteCode(text.toUpperCase().trim());
    } catch {
      showToast('无法读取剪贴板');
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
          <div style={{ padding: '12px 16px', background: '#FFF3F3', border: '1px solid #FFD5D5', borderRadius: 'var(--radius-md)', color: '#D32F2F', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
            {errorMsg}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 8 }}>邀请码</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
              placeholder="请输入邀请码"
              style={{ flex: 1, height: 52, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 14px', fontSize: 20, textAlign: 'center', letterSpacing: 4, background: 'var(--white)', outline: 'none' }} />
            <button className="btn btn-secondary" style={{ height: 52, padding: '0 16px', fontSize: 13 }}
              onClick={handlePaste}>📋 粘贴</button>
          </div>
        </div>

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
          onClick={handleJoin} disabled={loading || !inviteCode.trim()}>
          {loading ? '加入中...' : '🏠 加入家族'}
        </button>

        {/* 没有邀请码？ */}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>还没有邀请码？</span>
          <button onClick={() => window.location.hash = '#/invite-member'}
            style={{ background: 'none', border: 'none', color: 'var(--ink-green)', fontSize: 13, cursor: 'pointer', marginLeft: 4 }}>
            去生成邀请码
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { JoinMemberPage });
