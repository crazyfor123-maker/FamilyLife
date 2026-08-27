// ===== 搜索页 =====
function SearchPage({ onBack, onNavigate }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { search } = await import('../api/storage');
      const res = await search(query, '1');
      if (res.code === 0) setResults(res.data || []);
      else setResults([]);
    } catch {
      // 降级：在MockData中搜索
      const q = query.toLowerCase();
      const all = [
        ...MockData.members.map(m => ({ type: 'member', id: m.id, name: m.name, desc: m.occupation })),
        ...MockData.events.map(e => ({ type: 'event', id: e.id, name: e.title, desc: e.desc })),
        ...MockData.stories.map(s => ({ type: 'story', id: s.id, name: s.title, desc: s.author })),
      ];
      setResults(all.filter(item => item.name.toLowerCase().includes(q) || (item.desc || '').toLowerCase().includes(q)));
    }
    setLoading(false);
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="搜索" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="搜索人物、故事、大事记..."
            style={{
              flex: 1, height: 44, border: '1.5px solid var(--line-soft)',
              borderRadius: 'var(--radius-md)', padding: '0 14px', fontSize: 16,
              background: 'var(--white)', outline: 'none', fontFamily: 'var(--font-sans)'
            }}
          />
          <button className="btn btn-primary" style={{ height: 44, padding: '0 20px', fontSize: 15 }}
            onClick={doSearch}>搜索</button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>搜索中...</div>}

        {!loading && results.length > 0 && (
          <div>
            {results.map((r, i) => (
              <div key={i} className="card" style={{ padding: '12px 16px', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => {
                  if (r.type === 'member') onNavigate('person', { personId: r.id });
                  else if (r.type === 'story') onNavigate('timeline');
                  else if (r.type === 'event') onNavigate('events');
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ink-green-soft)', color: 'var(--ink-green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                    {(r.name || '?').charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-primary)' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{r.desc || r.type}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>没有找到相关结果</div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SearchPage });