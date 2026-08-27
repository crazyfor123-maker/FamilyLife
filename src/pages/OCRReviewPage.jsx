// ===== OCR人工校对页面 (F3.21) =====
function OCRReviewPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [results, setResults] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [editingId, setEditingId] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [historyList, setHistoryList] = React.useState([]);
  const [selectedHistory, setSelectedHistory] = React.useState(null);
  const [reRecognizing, setReRecognizing] = React.useState(false);
  const [ocrConfig, setOcrConfig] = React.useState(null);

  React.useEffect(() => {
    loadResults();
    loadHistory();
    loadConfig();
  }, [spaceId]);

  const loadConfig = async () => {
    try {
      const { get } = await import('../api/request');
      const res = await get('/ocr/config');
      if (res && res.code === 0) setOcrConfig(res.data);
    } catch (err) { console.warn('加载OCR配置失败:', err); }
  };

  const loadResults = async () => {
    setLoading(true);
    try {
      const { get } = await import('../api/request');
      const res = await get(`/ocr/${spaceId}/results`);
      if (res && res.code === 0) {
        setResults(res.data || []);
      } else {
        setResults(MockData.ocrResults || [
          { id: 1, original: '朱老太爷', confidence: 0.95, name: '朱老太爷', birth: '1920-03-15', status: 'confirmed' },
          { id: 2, original: '朱国栋', confidence: 0.92, name: '朱国栋', birth: '1945-06-20', status: 'confirmed' },
          { id: 3, original: '朱秀芳', confidence: 0.78, name: '朱秀芳', birth: '1948-09-10', status: 'pending' },
          { id: 4, original: '朱明辉', confidence: 0.65, name: '朱明辉', birth: '1950-12-25', status: 'pending' },
          { id: 5, original: '朱小红', confidence: 0.88, name: '朱小红', birth: '1952-01-08', status: 'confirmed' },
        ]);
      }
    } catch { setResults(MockData.ocrResults || []); }
    finally { setLoading(false); }
  };

  const loadHistory = async () => {
    try {
      const { get } = await import('../api/request');
      const res = await get(`/ocr/${spaceId}/history`);
      if (res && res.code === 0) setHistoryList(res.data || []);
      else setHistoryList([
        { id: 1, name: '老族谱_1950.jpg', date: '2024-01-15', status: 'completed', personCount: 12, confidence: 0.87 },
        { id: 2, name: '族谱照片_2024.jpg', date: '2024-02-20', status: 'completed', personCount: 8, confidence: 0.92 },
        { id: 3, name: '家谱扫描件.pdf', date: '2024-03-10', status: 'processing', personCount: 0, confidence: 0 },
      ]);
    } catch {
      setHistoryList([
        { id: 1, name: '老族谱_1950.jpg', date: '2024-01-15', status: 'completed', personCount: 12, confidence: 0.87 },
        { id: 2, name: '族谱照片_2024.jpg', date: '2024-02-20', status: 'completed', personCount: 8, confidence: 0.92 },
        { id: 3, name: '家谱扫描件.pdf', date: '2024-03-10', status: 'processing', personCount: 0, confidence: 0 },
      ]);
    }
  };

  const handleReRecognize = async (historyItem) => {
    setReRecognizing(true);
    try {
      const { get } = await import('../api/request');
      const res = await get(`/ocr/${spaceId}/re-recognize/${historyItem.id}`);
      if (res && res.code === 0) {
        showToast('重新识别完成');
        loadHistory();
      }
    } catch (err) { showToast('重新识别失败'); }
    finally { setReRecognizing(false); }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.original);
  };

  const handleSaveEdit = async (id) => {
    try {
      const { post } = await import('../api/request');
      await post(`/ocr/${spaceId}/review/${id}`, { corrected_text: editText });
      showToast('校对完成');
    } catch {}
    setResults(prev => prev.map(r =>
      r.id === id ? { ...r, original: editText, confidence: 1.0 } : r
    ));
    setEditingId(null);
    setEditText('');
    loadResults();
  };

  const handleConfirm = async (id) => {
    try {
      const { post } = await import('../api/request');
      await post(`/ocr/${spaceId}/review/${id}/confirm`, {});
    } catch {}
    setResults(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'confirmed' } : r
    ));
    showToast('已确认');
  };

  const handleReject = async (id) => {
    try {
      const { post } = await import('../api/request');
      await post(`/ocr/${spaceId}/review/${id}/reject`, {});
    } catch {}
    setResults(prev => prev.map(r =>
      r.id === id ? { ...r, status: 'rejected' } : r
    ));
    showToast('已拒绝');
  };

  const handleRejectAndDelete = async (id) => {
    if (!confirm('确定删除此识别结果？')) return;
    try {
      const { del } = await import('../api/request');
      await del(`/ocr/${spaceId}/review/${id}`);
    } catch {}
    setResults(prev => prev.filter(r => r.id !== id));
    showToast('已删除');
  };

  const confidenceColor = (c) => c >= 0.9 ? 'var(--ink-green)' : c >= 0.7 ? 'var(--ink-gold)' : '#D32F2F';

  const filteredResults = filterStatus === 'all' ? results : results.filter(r => r.status === filterStatus);
  const pendingCount = results.filter(r => r.status === 'pending').length;
  const confirmedCount = results.filter(r => r.status === 'confirmed').length;
  const rejectedCount = results.filter(r => r.status === 'rejected').length;

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📝 OCR人工校对" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 状态统计 */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 16, background: pendingCount > 0 ? '#FFF3E0' : '#E8F5E9' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 10 }}>
            {pendingCount > 0 ? `⚠️ 待校对 ${pendingCount} 条` : '✅ 所有结果已校对完成'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#F57C00' }}>{pendingCount}</div>
              <div style={{ color: 'var(--ink-tertiary)' }}>待校对</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-green)' }}>{confirmedCount}</div>
              <div style={{ color: 'var(--ink-tertiary)' }}>已确认</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#D32F2F' }}>{rejectedCount}</div>
              <div style={{ color: 'var(--ink-tertiary)' }}>已拒绝</div>
            </div>
          </div>
        </div>

        {/* 筛选 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {[{ key: 'all', label: '全部' }, { key: 'pending', label: '待校对' }, { key: 'confirmed', label: '已确认' }, { key: 'rejected', label: '已拒绝' }].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
              border: `1.5px solid ${filterStatus === f.key ? 'var(--ink-green)' : 'var(--line-light)'}`,
              background: filterStatus === f.key ? '#E8F5E9' : 'white',
              color: filterStatus === f.key ? 'var(--ink-green)' : 'var(--ink-primary)',
              cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>

        {/* 历史记录 */}
        {historyList.length > 0 && (
          <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>📋 历史记录</div>
            {historyList.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-primary)' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{h.date} · {h.personCount}人 · {Math.round(h.confidence * 100)}%</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {h.status === 'completed' && (
                    <button onClick={() => handleReRecognize(h)} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      border: '1px solid var(--ink-green)',
                      background: 'white',
                      color: 'var(--ink-green)',
                      cursor: 'pointer',
                    }}>🔄 重识</button>
                  )}
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: h.status === 'completed' ? '#E8F5E9' : '#FFF3E0', color: h.status === 'completed' ? 'var(--ink-green)' : '#F57C00' }}>
                    {h.status === 'completed' ? '已完成' : '处理中'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 识别结果列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : filteredResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            暂无识别结果
            {filterStatus !== 'all' && <div style={{ fontSize: 13, marginTop: 8 }}>当前筛选条件下无数据</div>}
          </div>
        ) : (
          filteredResults.map(item => (
            <div key={item.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 28 }}>📄</div>
                <div style={{ flex: 1 }}>
                  {editingId === item.id ? (
                    <input type="text" value={editText} onChange={e => setEditText(e.target.value)}
                      style={{ width: '100%', height: 36, border: '1.5px solid var(--ink-green)', borderRadius: 6, padding: '0 10px', fontSize: 16, boxSizing: 'border-box' }}
                      autoFocus />
                  ) : (
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-primary)', cursor: 'pointer' }}
                      onClick={() => handleEdit(item)}>{item.original}</div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    识别置信：
                    <span style={{ color: confidenceColor(item.confidence), fontWeight: 600 }}>
                      {Math.round(item.confidence * 100)}%
                    </span>
                  </div>
                </div>
                {editingId === item.id ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => handleSaveEdit(item.id)} style={{ background: 'var(--ink-green)', color: 'white', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✓</button>
                    <button onClick={() => { setEditingId(null); setEditText(''); }} style={{ background: '#F5F5F5', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <span className={`badge ${item.status === 'confirmed' ? 'badge-green' : 'badge-gold'}`}>
                    {item.status === 'confirmed' ? '已确认' : '待校对'}
                  </span>
                )}
              </div>
              {editingId !== item.id && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => handleConfirm(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-green)' }}>✅ 确认</button>
                  <button onClick={() => handleReject(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#D32F2F' }}>❌ 拒绝</button>
                  <button onClick={() => handleRejectAndDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#9E9E9E' }}>🗑️</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { OCRReviewPage });
