// ===== 个人时间线页 =====
function PersonTimelinePage({ personId, onBack }) {
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('all');

  React.useEffect(() => {
    loadEvents();
  }, [personId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { getPersonTimeline } = await import('../api/person');
      const res = await getPersonTimeline(personId);
      if (res && res.code === 0) {
        setEvents(res.data || []);
      } else {
        setEvents(MockData.personEvents || []);
      }
    } catch {
      setEvents(MockData.personEvents || []);
    } finally {
      setLoading(false);
    }
  };

  const filters = [
    { id: 'all', label: '全部' },
    { id: 'birth', label: '出生' },
    { id: 'education', label: '教育' },
    { id: 'career', label: '工作' },
    { id: 'family', label: '家庭' },
    { id: 'health', label: '健康' },
    { id: 'travel', label: '旅行' },
  ];

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.category === filter);

  const categoryIcons = {
    'birth': '👶',
    'education': '🎓',
    'career': '💼',
    'family': '👨‍👩‍👧',
    'health': '🏥',
    'travel': '✈️',
    'default': '📌',
  };

  // 按年份分组
  const groupedByYear = {};
  filteredEvents.forEach(e => {
    const y = e.date ? e.date.split('-')[0] : '未知';
    if (!groupedByYear[y]) groupedByYear[y] = [];
    groupedByYear[y].push(e);
  });
  const years = Object.keys(groupedByYear).sort((a, b) => b - a);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📅 人生时间线" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 筛选 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: 13,
              border: `1.5px solid ${filter === f.id ? 'var(--ink-green)' : 'var(--line-light)'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: filter === f.id ? 'var(--ink-green)' : 'white',
              color: filter === f.id ? 'var(--white)' : 'var(--ink-secondary)',
              fontWeight: filter === f.id ? 500 : 400,
            }}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : years.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无记录</div>
        ) : (
          years.map(year => (
            <div key={year} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>{year}年</div>
              {groupedByYear[year].map((e, i) => (
                <div key={i} className="card" style={{ padding: '10px 12px', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 20 }}>{categoryIcons[e.category] || categoryIcons.default}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{e.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{e.date || ''} · {e.description || ''}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PersonTimelinePage });
