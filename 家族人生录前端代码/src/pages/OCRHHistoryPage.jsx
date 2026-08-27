// ===== OCR历史记录页面 =====
function OCRHistoryPage({ onBack }) {
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setHistory([
      { id: 1, name: '老族谱_1950.jpg', date: '2024-01-15', status: 'completed', personCount: 12, confidence: 0.87 },
      { id: 2, name: '族谱照片_2024.jpg', date: '2024-02-20', status: 'completed', personCount: 8, confidence: 0.92 },
      { id: 3, name: '家谱扫描件.pdf', date: '2024-03-10', status: 'processing', personCount: 0, confidence: 0 },
    ]);
    setLoading(false);
  }, []);

  const statusMap = {
    'completed': { label: '已完成', color: 'var(--ink-green)' },
    'processing': { label: '处理中', color: 'var(--ink-gold)' },
    'failed': { label: '失败', color: '#D32F2F' },
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📋 OCR历史" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无历史记录</div>
        ) : (
          history.map(item => {
            const s = statusMap[item.status] || statusMap.completed;
            return (
              <div key={item.id} className="card" style={{ padding: '12px 14px', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                      {item.date} · 识别 {item.personCount} 人 · 置信度 {Math.round(item.confidence * 100)}%
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    background: s.color + '20', color: s.color,
                  }}>{s.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {item.status === 'completed' && (
                    <>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-green)' }}>📝 校对</button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#D32F2F' }}>🗑️</button>
                    </>
                  )}
                  {item.status === 'processing' && (
                    <span style={{ fontSize: 12, color: 'var(--ink-gold)' }}>⏳ 处理中...</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

Object.assign(window, { OCRHistoryPage });
