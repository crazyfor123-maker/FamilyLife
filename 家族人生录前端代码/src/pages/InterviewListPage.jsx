// ===== 采访列表页 =====
function InterviewListPage({ onNavigate }) {
  const [interviews, setInterviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../api/interview').then(i => i.getInterviews(1)).then(res => {
      if (res.code === 0) setInterviews(res.data || []);
      setLoading(false);
    }).catch(() => {
      setInterviews([]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="AI语音采访" showBack={false} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            {interviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
                <p>暂无采访记录</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }}
                  onClick={() => window.location.hash = '#/interview-create'}>
                  开始第一次采访
                </button>
              </div>
            ) : (
              interviews.map(item => (
                <div key={item.session_id} className="card" style={{ padding: 16, marginBottom: 12, cursor: 'pointer' }}
                  onClick={() => onNavigate('interviewDetail', { personId: item.person_id })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ink-green-soft)', color: 'var(--ink-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      <Icon.Mic size={22} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)' }}>{item.title || '采访会话'}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                        {item.status} · {item.qa_count || 0}个问题
                      </div>
                    </div>
                    <Icon.ChevronRight size={18} color="var(--ink-tertiary)" />
                  </div>
                </div>
              ))
            )}

            <div style={{ marginTop: 16 }}>
              <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
                onClick={() => window.location.hash = '#/interview-create'}>
                <Icon.Mic size={20} /> 开始新采访
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { InterviewListPage });