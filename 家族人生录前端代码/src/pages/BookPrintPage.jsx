// ===== 专业印刷排版页 =====
function BookPrintPage({ bookId, onBack }) {
  const [layoutOptions, setLayoutOptions] = React.useState({
    paper_size: 'A4',
    orientation: 'portrait',
    margins: 'normal',
    font_family: 'songti',
    font_size: 16,
    line_height: 2,
    cover_type: 'hardcover',
    binding: 'saddle_stitch',
  });
  const [generating, setGenerating] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [layoutResult, setLayoutResult] = React.useState(null);

  const update = (field, value) => setLayoutOptions(o => ({ ...o, [field]: value }));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { generatePrintLayout } = await import('../api/bookExport');
      const res = await generatePrintLayout(bookId, layoutOptions);
      if (res) {
        setPreviewUrl(res.preview_url);
        setLayoutResult(res);
        showToast('排版预览已生成');
      } else {
        showToast('排版失败');
      }
    } catch {
      // Demo 模式
      setPreviewUrl('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjEyIiBoZWlnaHQ9Ijc5MiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjRkZGRkZGIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5a6e5Lu256CB5Zu+6Zm577yM6KGM6KGY77yPPC90ZXh0Pjwvc3ZnPg==');
      setLayoutResult({ page_count: 42, file_size: '15.2MB' });
      showToast('排版预览已生成（Demo）');
    }
    setGenerating(false);
  };

  const paperSizes = ['A4', 'A5', 'B5', '16开', '32开'];
  const orientations = [
    { value: 'portrait', label: '纵向' },
    { value: 'landscape', label: '横向' },
  ];
  const margins = [
    { value: 'narrow', label: '窄边距' },
    { value: 'normal', label: '正常' },
    { value: 'wide', label: '宽边距' },
  ];
  const fonts = [
    { value: 'songti', label: '宋体' },
    { value: 'heiti', label: '黑体' },
    { value: 'kaishu', label: '楷书' },
    { value: 'fangsong', label: '仿宋' },
  ];
  const coverTypes = [
    { value: 'softcover', label: '软封面' },
    { value: 'hardcover', label: '硬封面' },
    { value: 'leather', label: '真皮封面' },
  ];
  const bindings = [
    { value: 'saddle_stitch', label: '骑马钉' },
    { value: 'perfect_binding', label: '胶装' },
    { value: 'thread_binding', label: '线装' },
  ];

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🖨️ 印刷排版" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 纸张设置 */}
        <div className="card" style={{ padding: '14px', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>纸张设置</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>纸张尺寸</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {paperSizes.map(p => (
                <button key={p} onClick={() => update('paper_size', p)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1.5px solid ${layoutOptions.paper_size === p ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: layoutOptions.paper_size === p ? '#E8F5E9' : 'white',
                  color: layoutOptions.paper_size === p ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>方向</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {orientations.map(o => (
                <button key={o.value} onClick={() => update('orientation', o.value)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1.5px solid ${layoutOptions.orientation === o.value ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: layoutOptions.orientation === o.value ? '#E8F5E9' : 'white',
                  color: layoutOptions.orientation === o.value ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{o.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>页边距</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {margins.map(m => (
                <button key={m.value} onClick={() => update('margins', m.value)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1.5px solid ${layoutOptions.margins === m.value ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: layoutOptions.margins === m.value ? '#E8F5E9' : 'white',
                  color: layoutOptions.margins === m.value ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{m.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 字体设置 */}
        <div className="card" style={{ padding: '14px', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>字体设置</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>字体</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {fonts.map(f => (
                <button key={f.value} onClick={() => update('font_family', f.value)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1.5px solid ${layoutOptions.font_family === f.value ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: layoutOptions.font_family === f.value ? '#E8F5E9' : 'white',
                  color: layoutOptions.font_family === f.value ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>字号</label>
            <input type="range" min="12" max="24" value={layoutOptions.font_size} onChange={e => update('font_size', parseInt(e.target.value))}
              style={{ width: '100%' }} />
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center' }}>{layoutOptions.font_size}pt</div>
          </div>
        </div>

        {/* 封面设置 */}
        <div className="card" style={{ padding: '14px', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>封面装订</div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>封面类型</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {coverTypes.map(c => (
                <button key={c.value} onClick={() => update('cover_type', c.value)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1.5px solid ${layoutOptions.cover_type === c.value ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: layoutOptions.cover_type === c.value ? '#E8F5E9' : 'white',
                  color: layoutOptions.cover_type === c.value ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{c.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, color: 'var(--ink-tertiary)', display: 'block', marginBottom: 4 }}>装订方式</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {bindings.map(b => (
                <button key={b.value} onClick={() => update('binding', b.value)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1.5px solid ${layoutOptions.binding === b.value ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: layoutOptions.binding === b.value ? '#E8F5E9' : 'white',
                  color: layoutOptions.binding === b.value ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{b.label}</button>
              ))}
            </div>
          </div>
        </div>

        {generating && (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>正在生成排版预览...</div>
        )}

        {layoutResult && (
          <div className="card-paper" style={{ padding: '14px', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>排版结果</div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.7 }}>
              页数：{layoutResult.page_count} 页<br/>
              文件大小：{layoutResult.file_size}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
          onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中...' : '生成预览'}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { BookPrintPage });
