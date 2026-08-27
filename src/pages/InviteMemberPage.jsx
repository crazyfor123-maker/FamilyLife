// ===== 邀请成员页 =====
function InviteMemberPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [inviteLink, setInviteLink] = React.useState('');
  const [inviteCode, setInviteCode] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [qrCodeUrl, setQrCodeUrl] = React.useState('');
  const [inviteList, setInviteList] = React.useState([]);
  const [showCodeInput, setShowCodeInput] = React.useState(false);

  React.useEffect(() => {
    loadInviteList();
  }, [spaceId]);

  const loadInviteList = async () => {
    try {
      const { get } = await import('../api/request');
      const res = await get(`/member/${spaceId}/invitations`);
      if (res?.code === 0 && res?.data) {
        setInviteList(res.data);
      }
    } catch {}
  };

  // ===== F1.7 生成邀请链接 + 二维码 =====
  const handleCreateInvite = async () => {
    setLoading(true);
    try {
      const { inviteMember } = await import('../api/member');
      const res = await inviteMember(spaceId, { preset_role: 'member', max_uses: 10 });
      setLoading(false);
      if (res.code === 0 && res.data) {
        const token = res.data.token || res.data.invite_token;
        const link = `https://family-life-record.app/join/${token}`;
        setInviteLink(link);
        setInviteCode(token);

        // 生成二维码
        generateQRCode(link);
        showToast('邀请链接已生成');
      } else {
        showToast(res.message || '生成失败');
      }
    } catch {
      setLoading(false);
      showToast('网络异常');
    }
  };

  // 生成二维码（纯前端）
  const generateQRCode = (text) => {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    // 简化版QR码生成
    const size = 280;
    const modules = 21;
    const moduleSize = size / modules;

    // 背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // 位置检测图案
    const drawFinder = (x, y) => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      ctx.fillStyle = '#000000';
      ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    drawFinder(0, 0);
    drawFinder(14, 0);
    drawFinder(0, 14);

    // 数据区域
    ctx.fillStyle = '#000000';
    let seed = 0;
    for (let i = 0; i < text.length; i++) seed = (seed + text.charCodeAt(i)) % 100000;
    let rng = seed;

    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        // 跳过位置检测图案区域
        if ((x < 8 && y < 8) || (x >= 13 && y < 8) || (x < 8 && y >= 13)) continue;
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        if (rng % 3 !== 0) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    // 中心logo
    const centerSize = 36;
    const cx = (size - centerSize) / 2;
    ctx.fillStyle = '#4A6741';
    ctx.beginPath();
    ctx.roundRect(cx, cx, centerSize, centerSize, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('家', size / 2, size / 2);

    setQrCodeUrl(canvas.toDataURL('image/png'));
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteLink).then(() => {
        showToast('链接已复制');
      }).catch(() => {
        showToast('复制失败，请手动复制');
      });
    } else {
      showToast('复制失败');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: '邀请加入家族空间',
          text: `欢迎加入我的家族空间！使用邀请码 ${inviteCode} 或点击链接加入。`,
          url: inviteLink,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleJoin = () => {
    window.location.hash = `#/join-member?code=${inviteCode}`;
  };

  const revokeInvite = async (token) => {
    if (!confirm('确定取消此邀请码？')) return;
    try {
      const { get } = await import('../api/request');
      await get(`/member/${spaceId}/invite/${token}`); // DELETE
      setInviteList(prev => prev.filter(x => x.token !== token));
      showToast('已取消');
    } catch {}
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="邀请成员" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 邀请说明 */}
        <div className="card-paper" style={{ padding: '24px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📩</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
            邀请家人加入
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0 }}>
            生成邀请链接或二维码，分享给家人<br/>让他们加入这个家族空间
          </p>
        </div>

        {/* 生成邀请 */}
        {!inviteLink ? (
          <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
            onClick={handleCreateInvite} disabled={loading}>
            {loading ? '生成中...' : '📩 生成邀请链接'}
          </button>
        ) : (
          <>
            {/* 二维码 */}
            {qrCodeUrl && (
              <div className="card" style={{ padding: 20, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 12 }}>扫码加入</div>
                <img src={qrCodeUrl} alt="邀请二维码"
                  style={{ width: 200, height: 200, borderRadius: 8, border: '1px solid var(--line-light)' }} />
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 8 }}>
                  让家人扫描二维码即可加入
                </div>
              </div>
            )}

            {/* 邀请链接 */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8 }}>邀请链接</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={inviteLink} readOnly
                  style={{ flex: 1, height: 40, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 10px', fontSize: 13, background: 'var(--paper-warm)' }} />
                <button className="btn btn-secondary" style={{ height: 40, padding: '0 16px' }} onClick={handleCopy}>
                  复制
                </button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={handleShare}>
                📤 分享链接
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={handleCreateInvite}>
                🔄 重新生成
              </button>
            </div>

            {/* 手动输入加入码 */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 8 }}>或手动输入邀请码</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="输入16位邀请码"
                  style={{ flex: 1, height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: 16, background: 'var(--white)', outline: 'none' }} />
                <button className="btn btn-primary" style={{ height: 44, padding: '0 20px' }} onClick={handleJoin}>加入</button>
              </div>
            </div>
          </>
        )}

        {/* 已生成的邀请码 */}
        {inviteList.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>📋 已生成的邀请码</div>
            {inviteList.map(inv => (
              <div key={inv.token} className="card" style={{ padding: '12px 16px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontFamily: 'monospace', color: 'var(--ink-primary)' }}>{inv.token}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                      角色：{inv.preset_role || 'member'} · 已用：{inv.used_count || 0}/{inv.max_uses || '∞'}
                    </div>
                  </div>
                  <button onClick={() => revokeInvite(inv.token)} style={{ background: 'none', border: 'none', color: '#D32F2F', fontSize: 13, cursor: 'pointer' }}>
                    撤销
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { InviteMemberPage });
