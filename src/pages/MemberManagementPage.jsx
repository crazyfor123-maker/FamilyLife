// ===== 成员管理页 =====
function MemberManagementPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [members, setMembers] = React.useState([]);
  const [currentUserRole, setCurrentUserRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [transferTarget, setTransferTarget] = React.useState(null);

  React.useEffect(() => {
    loadData();
  }, [spaceId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, permRes] = await Promise.all([
        import('../api/member').then(m => m.getMembers(spaceId)).then(res => res?.code === 0 ? (res.data || []) : null).catch(() => null),
        import('../api/permission').then(p => p.getPermission(spaceId)).then(res => res?.code === 0 ? (res.data || {}) : {}).catch(() => ({})),
      ]);

      if (membersRes) {
        setMembers(membersRes);
      } else {
        setMembers([{
          user_id: 1, nickname: '我', name: '我', role: 'owner',
          avatar: '', phone: '', is_current_user: true,
        }]);
      }
      setCurrentUserRole(permRes?.current_role || 'owner');
    } catch {} finally { setLoading(false); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { updateMemberRole } = await import('../api/member');
      const res = await updateMemberRole(spaceId, userId, newRole, 'family');
      if (res && res.code === 0) {
        showToast('角色已更新');
        setMembers(m => m.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
      } else {
        showToast(res?.message || '更新失败');
      }
    } catch {
      showToast('更新失败');
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('确定移除此成员？该成员将无法访问此家族空间。')) return;
    try {
      const { removeMember } = await import('../api/member');
      const res = await removeMember(spaceId, userId);
      if (res && res.code === 0) {
        showToast('已移除');
        setMembers(m => m.filter(x => x.user_id !== userId));
      } else {
        showToast(res?.message || '移除失败');
      }
    } catch { showToast('网络异常'); }
  };

  // ===== F1.10 转移所有权 =====
  const handleTransferOwner = async () => {
    if (!transferTarget) return;
    if (!confirm(`⚠️ 确定将主人权限转移给 ${transferTarget.nickname || transferTarget.name}？转移后你将不再是主人。`)) return;
    try {
      const { transferOwner } = await import('../api/member');
      const res = await transferOwner(spaceId, transferTarget.user_id);
      if (res && res.code === 0) {
        showToast('所有权已转移');
        setShowTransferModal(false);
        loadData();
      } else {
        showToast(res?.message || '转移失败');
      }
    } catch { showToast('转移失败'); }
  };

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  const roleLabel = (role) => {
    if (role === 'owner') return '主人';
    if (role === 'admin') return '管理员';
    if (role === 'viewer') return '仅查看';
    return '成员';
  };

  const roleBadgeClass = (role) => {
    if (role === 'owner') return 'badge badge-gold';
    if (role === 'admin') return 'badge badge-blue';
    if (role === 'viewer') return 'badge badge-gray';
    return 'badge badge-green';
  };

  // ===== F1.10 权限过滤：仅查看成员不可编辑 =====
  const canEditMember = (member) => {
    if (!canManage) return false;
    if (member.role === 'owner') return false; // 不能编辑主人
    return true;
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="成员管理" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 权限说明 */}
        <div className="card-paper" style={{ padding: '14px', marginBottom: 14, fontSize: 13, color: 'var(--ink-secondary)' }}>
          <div style={{ fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 6 }}>🔐 权限说明</div>
          <div style={{ lineHeight: 1.7 }}>
            <div><b>主人</b> — 全部权限，可管理成员、转移所有权、导出数据</div>
            <div><b>管理员</b> — 管理成员、编辑内容、导出数据</div>
            <div><b>成员</b> — 创建和编辑内容</div>
            <div><b>仅查看</b> — 只能浏览，不能编辑或删除</div>
          </div>
        </div>

        {/* 当前用户权限 */}
        <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 12 }}>
          当前权限：<span className={roleBadgeClass(currentUserRole)} style={{ padding: '2px 10px' }}>{roleLabel(currentUserRole)}</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <button className="btn btn-secondary" style={{ height: 40, fontSize: 14 }}
                onClick={() => window.location.hash = '#/invite-member'}>
                <span style={{ marginRight: 4 }}>➕</span>邀请成员
              </button>
              {currentUserRole === 'owner' && (
                <button className="btn btn-secondary" style={{ height: 40, fontSize: 14, background: '#FFF3E0', color: '#D97706' }}
                  onClick={() => {
                    const owners = members.filter(m => m.role === 'owner');
                    if (owners.length >= 1) {
                      setTransferTarget(members.find(m => m.role !== 'owner'));
                      setShowTransferModal(true);
                    } else {
                      showToast('当前只有你一人，无法转移');
                    }
                  }}>
                  <span style={{ marginRight: 4 }}>👑</span>转移所有权
                </button>
              )}
            </div>

            {members.map((member, index) => {
              const isOwner = member.role === 'owner';
              const isCurrentUser = member.is_current_user || member.user_id === 1;
              const editRoles = canEditMember(member) ? ['admin', 'member', 'viewer'] : [];

              return (
                <div key={member.user_id || member.id} className="card" style={{
                  padding: '14px 16px', marginBottom: 8,
                  borderBottom: index < members.length - 1 ? '1px solid var(--line-light)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="avatar avatar-md" style={{
                      background: 'var(--ink-green-soft)', color: 'var(--ink-green)'
                    }}>{(member.nickname || member.name || '成').slice(0, 1)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-primary)' }}>
                        {member.nickname || member.name}
                        {isCurrentUser && <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 6 }}>(我)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                        {member.phone || ''}
                      </div>
                    </div>
                    <span className={roleBadgeClass(member.role)}>{roleLabel(member.role)}</span>
                    {canEditMember(member) && (
                      <select
                        value={member.role}
                        onChange={e => handleRoleChange(member.user_id, e.target.value)}
                        style={{
                          height: 32,
                          border: '1.5px solid var(--line-soft)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0 6px',
                          fontSize: 12,
                          background: 'white',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        {editRoles.map(r => (
                          <option key={r} value={r}>{roleLabel(r)}</option>
                        ))}
                      </select>
                    )}
                    {canEditMember(member) && (
                      <button onClick={() => handleRemove(member.user_id || member.id)}
                        style={{ background: 'none', border: 'none', color: '#D32F2F', fontSize: 13, cursor: 'pointer', padding: '4px 8px' }}>
                        移除
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* 转移所有权弹窗 */}
      {showTransferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowTransferModal(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>👑 转移所有权</span>
              <button onClick={() => setShowTransferModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 16, background: '#FFF3E0', borderRadius: 8, marginBottom: 16, fontSize: 14, color: '#D97706' }}>
              ⚠️ 转移后，你将不再是主人，请选择一位管理员作为新主人。
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 8 }}>选择新主人</label>
              {members.filter(m => m.role !== 'owner').map(m => (
                <div key={m.user_id} onClick={() => setTransferTarget(m)} style={{
                  padding: '12px 14px', border: `1.5px solid ${transferTarget?.user_id === m.user_id ? 'var(--ink-green)' : 'var(--line-soft)'}`,
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  background: transferTarget?.user_id === m.user_id ? '#E8F5E9' : 'white',
                }}>
                  <div className="avatar avatar-sm" style={{ background: 'var(--ink-green-soft)', color: 'var(--ink-green)' }}>
                    {(m.nickname || m.name || '?').slice(0, 1)}
                  </div>
                  <span style={{ fontSize: 15, color: 'var(--ink-primary)' }}>{m.nickname || m.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 'auto' }}>{roleLabel(m.role)}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleTransferOwner}>
              确认转移
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MemberManagementPage });
