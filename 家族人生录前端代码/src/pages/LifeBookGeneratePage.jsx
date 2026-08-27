// ===== 人生之书AI生成页 =====
function LifeBookGeneratePage({ personId, onBack }) {
  const [generating, setGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [currentChapter, setCurrentChapter] = React.useState('');
  const [generated, setGenerated] = React.useState(false);
  const [selectedChapters, setSelectedChapters] = React.useState(MockData.bookChapters.map(c => c.id));

  const chapters = MockData.bookChapters;

  const toggleChapter = (id) => {
    setSelectedChapters(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedChapters.length === 0) { showToast('请至少选择一个章节'); return; }
    setGenerating(true);
    setProgress(0);
    setGenerated(false);

    try {
      const { generateLifeBook } = await import('../api/lifebook');
      // 模拟生成进度
      const totalSteps = selectedChapters.length * 3;
      let step = 0;

      const interval = setInterval(() => {
        step++;
        const p = Math.min(95, (step / totalSteps) * 95);
        setProgress(p);
        const chapterIdx = Math.min(step, chapters.length) - 1;
        if (chapterIdx >= 0) setCurrentChapter(chapters[chapterIdx]?.title || '生成中...');
      }, 800);

      // 调用 AI 生成 API
      const res = await generateLifeBook(personId, selectedChapters);
      clearInterval(interval);

      if (res && res.code === 0) {
        setProgress(100);
        setGenerated(true);
        showToast('人生之书生成成功！');
        setTimeout(onBack, 2000);
      } else {
        setGenerating(false);
        showToast(res?.message || '生成失败');
      }
    } catch (err) {
      setGenerating(false);
      showToast('生成失败：' + (err.message || '网络异常'));
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📖 生成人生之书" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {generated ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📖</div>
            <h3 style={{ color: 'var(--ink-primary)', marginBottom: 8 }}>人生之书已生成！</h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>您可以在人生之书页面查看和编辑</p>
          </div>
        ) : generating ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
            <h3 style={{ color: 'var(--ink-primary)', marginBottom: 8 }}>AI 正在生成...</h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: 14, marginBottom: 24 }}>{currentChapter}</p>
            <div style={{ height: 8, background: '#E0E0E0', borderRadius: 4, overflow: 'hidden', maxWidth: 300, margin: '0 auto' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--ink-green), var(--ink-green-light))', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <p style={{ color: 'var(--ink-tertiary)', fontSize: 13, marginTop: 8 }}>{Math.round(progress)}%</p>
          </div>
        ) : (
          <>
            <div className="card-paper" style={{ padding: '16px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 10, fontFamily: 'var(--font-serif)' }}>· 选择章节 ·</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {chapters.map(ch => (
                  <div
                    key={ch.id}
                    onClick={() => toggleChapter(ch.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: selectedChapters.includes(ch.id) ? '2px solid var(--ink-green)' : '1.5px solid var(--line-light)',
                      background: selectedChapters.includes(ch.id) ? '#F1F8E9' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: `2px solid ${selectedChapters.includes(ch.id) ? 'var(--ink-green)' : 'var(--line-light)'}`,
                      background: selectedChapters.includes(ch.id) ? 'var(--ink-green)' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selectedChapters.includes(ch.id) && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: 'var(--ink-primary)', fontWeight: 500 }}>{ch.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{ch.subtitle} · {ch.pages}页</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '14px', marginBottom: 16, fontSize: 13, color: 'var(--ink-secondary)' }}>
              <div style={{ fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 4 }}>📌 生成说明</div>
              <div style={{ lineHeight: 1.7 }}>
                • AI将基于采访素材、家族故事、时间线数据自动生成章节内容<br/>
                • 每章约 15-25 分钟生成时间<br/>
                • 生成后可在书中编辑和调整
              </div>
            </div>

            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
              onClick={handleGenerate} disabled={selectedChapters.length === 0}>
              开始生成（{selectedChapters.length} 章）
            </button>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { LifeBookGeneratePage });
