// ===== 人生之书页 =====
function LifeBookPage({ personId, onBack }) {
  const [book, setBook] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    import('../api/lifebook').then(l => l.getLifeBooks(personId)).then(res => {
      if (res.code === 0) setBook(res.data?.[0] || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [personId]);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="人生之书" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : book ? (
          <>
            <div className="card" style={{ padding: 20, marginBottom: 16, background: 'linear-gradient(135deg, #FBF8F2 0%, #F0EADB 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 72, height: 100, background: 'linear-gradient(135deg, #D4B896 0%, #8B6F47 100%)', borderRadius: '4px 8px 8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontSize: 14, textAlign: 'center', fontWeight: 600 }}>人生<br/>之书</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)' }}>{book.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 4 }}>{book.status} · {book.word_count || 0}字</div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 8 }}>章节列表</div>
            {MockData.bookChapters.map(chapter => (
              <div key={chapter.id} className="card" style={{ padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 4, height: 32, borderRadius: 2, background: chapter.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{chapter.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{chapter.subtitle}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{chapter.pages}页</div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn btn-primary btn-block" style={{ flex: 1, height: 44 }}>阅读 →</button>
              <button className="btn btn-secondary btn-block" style={{ flex: 1, height: 44 }}>导出PDF</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📖</div>
            <p>暂无人生之书</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }}>开始生成</button>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { LifeBookPage });