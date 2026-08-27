// ===== 家族空间列表页 =====
function FamilyListPage({ onBack, currentFamilyId, onSwitchFamily }) {
  const [families, setFamilies] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../api/family').then(({ getFamilies }) =>
      getFamilies().then(res => {
        if (res.code === 0) {
          setFamilies(res.data || []);
        }
        setLoading(false);
      }).catch(() => {
        // 后端不可用时降级为MockData
        setFamilies(MockData.families.map(f => ({
          space_id: String(f.id),
          space_name: f.name,
          cover: f.cover,
          motto: f.motto,
          member_count: f.memberCount,
          generation: f.generation,
          is_main: f.isMain,
          founding_year: f.foundingYear,
          origin: f.origin
        })));
        setLoading(false);
      })
    );
  }, []);

  const currentId = currentFamilyId || (families[0] ? String(families[0].space_id) : null);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader
        title="我的家族"
        showBack={true}
        onBack={onBack}
      />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
              {families.map(family => (
                <div
                  key={family.space_id}
                  className="card"
                  style={{
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: String(family.space_id) === currentId ? '2px solid var(--ink-green)' : '1px solid var(--line-light)'
                  }}
                  onClick={() => {
                    onSwitchFamily(family.space_id);
                    showToast(`已切换到${family.space_name}`);
                    setTimeout(onBack, 600);
                  }}
                >
                  <div style={{
                    height: 88,
                    background: String(family.space_id) === currentId
                      ? 'linear-gradient(135deg, #D8E2D0 0%, #E8D8C0 100%)'
                      : 'linear-gradient(135deg, #F0EADB 0%, #EDE5D4 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'var(--white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 22,
                      fontWeight: 700,
                      color: 'var(--ink-green)'
                    }}>
                      {(family.space_name || '家').charAt(0)}
                    </div>
                    {family.is_main && (
                      <span className="badge badge-gold" style={{
                        position: 'absolute', top: 10, right: 10
                      }}>
                        本家
                      </span>
                    )}
                    {String(family.space_id) === currentId && (
                      <span className="badge badge-green" style={{
                        position: 'absolute', top: 10, left: 10
                      }}>
                        当前
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8
                    }}>
                      <span className="serif" style={{
                        fontSize: 17,
                        fontWeight: 600,
                        color: 'var(--ink-primary)'
                      }}>
                        {family.space_name}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13,
                      color: 'var(--ink-secondary)',
                      margin: 0,
                      marginBottom: 10,
                      fontFamily: 'var(--font-serif)'
                    }}>
                      「{family.motto || '家和万事兴'}」
                    </p>
                    <div style={{
                      display: 'flex',
                      gap: 16,
                      fontSize: 12,
                      color: 'var(--ink-tertiary)'
                    }}>
                      <span>{family.member_count || 0}位成员</span>
                      <span>{family.generation || 0}代人</span>
                      <span>源于{family.origin || '未知'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              <button
                className="btn btn-secondary btn-block"
                style={{ flex: 1, height: 48 }}
                onClick={() => setOverlayPage('familyCreate')}
              >
                <Icon.Plus size={18} />
                创建家族
              </button>
              <button
                className="btn btn-secondary btn-block"
                style={{ flex: 1, height: 48 }}
                onClick={() => setOverlayPage('joinFamily')}
              >
                <Icon.Users size={18} />
                加入家族
              </button>
            </div>

            <div style={{
              background: 'var(--paper-warm)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              fontSize: 13,
              color: 'var(--ink-secondary)',
              lineHeight: 1.7
            }}>
              <div style={{ fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 4 }}>
                💡 关于家族空间
              </div>
              您可以创建或加入多个家族空间。每个家族空间独立管理成员、故事和记忆，方便您记录不同家族分支的历史。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FamilyListPage });