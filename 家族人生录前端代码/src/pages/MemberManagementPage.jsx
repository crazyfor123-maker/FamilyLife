// ===== 成员管理页 =====
function MemberManagementPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [members, setMembers] = React.useState([]);
  const [currentUserRole, setCurrentUserRole] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      import('../api/member').then(m => m.getMembers(spaceId)).then(res => {
        if (res.code === 0) return res.data || [];
        return null;
      }).catch(() => null),
      import('../api/permission').then(p => p.getPermission(spaceId)).then(res => {
        if (res && res.code === 0) return res.data || {};
        return {};
      }).catch(() => ({})),
    ]).then(([membersRes, permRes]) => {
      if (membersRes) {
        setMembers(membersRes);
      } else {
        setMembers(MockData.members.slice(0, 5).map(m => ({
          user_id: m.id,
          nickname: m.name,
          name: m.name,
          role: m.relation === '家族创始人' ? 'owner' : 'member',
          avatar: m.avatar || '',
          phone: '',
        })));
      }
      setCurrentUserRole(permRes.current_role || 'owner');
      setLoading(false);
    });
  }, [spaceId]);

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
    if (!confirm('确定移除此成员？')) return;
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

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="成员管理" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 权限说明 */}
        <div className="card-paper" style={{ padding: '14px', marginBottom: 14, fontSize: 13, color: 'var(--ink-secondary)' }}>
          <div style={{ fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 6 }}>🔐 权限说明</div>
          <div style={{ lineHeight: 1.7 }}>
            <div><b>主人</b> — 全部权限，可转移所有权</div>
            <div><b>管理员</b> — 管理成员、编辑内容、导出数据</div>
            <div><b>成员</b> — 创建和编辑内容</div>
            <div><b>仅查看</b> — 只能浏览</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-secondary" style={{ height: 40, fontSize: 14 }}
                onClick={() => window.location.hash = '#/invite-member'}>
                <Icon.Plus size={16} /> 邀请成员
              </button>
            </div>

            {members.map((member, index) => {
              const isOwner = member.role === 'owner';
              const isCurrentUser = member.user_id === 1; // 简化：当前用户 ID=1
              const editRoles = canManage && !isOwner ? ['admin', 'member', 'viewer'] : [];

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
                    {canManage && !isOwner && (
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
                    {canManage && !isOwner && (
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
    </div>
  );
}

Object.assign(window, { MemberManagementPage });
