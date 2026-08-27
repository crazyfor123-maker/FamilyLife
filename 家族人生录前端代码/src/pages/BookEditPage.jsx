// ===== 书籍编辑页 - 多媒体增强（语音插入/照片排版/语音条播放） =====
function BookEditPage({ bookId, onBack }) {
  const [book, setBook] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [showVoiceModal, setShowVoiceModal] = React.useState(false);
  const [images, setImages] = React.useState([]);
  const [audioFiles, setAudioFiles] = React.useState([]);
  const [playingAudio, setPlayingAudio] = React.useState(null);
  const [photoLayout, setPhotoLayout] = React.useState('single'); // single | 2col | 3col | gallery | fullpage | wrap
  const [showLayoutSelector, setShowLayoutSelector] = React.useState(false);
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    import('../api/lifebook').then(l => l.getLifeBook(bookId)).then(res => {
      if (res.code === 0) setBook(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookId]);

  // ===== 图片上传 =====
  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, {
          id: Date.now() + Math.random(),
          url: ev.target.result,
          name: file.name,
          inserted: false,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  // ===== 语音录制 =====
  const handleRecordVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAudioFiles(prev => [...prev, {
            id: Date.now() + Math.random(),
            url: ev.target.result,
            name: `录音_${new Date().toLocaleTimeString()}`,
            duration: '0:00',
          }]);
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      showToast('录音中... 点击停止按钮结束');

      // 停止录音弹窗
      const stopRecording = () => {
        mediaRecorder.stop();
        stream.getTracks().forEach(t => t.stop());
        setShowVoiceModal(false);
      };

      // 临时弹窗
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:999;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="background:white;border-radius:16px;padding:32px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">🎤</div>
          <div style="font-size:16px;margin-bottom:20px;">录音中... 点击停止结束</div>
          <button style="padding:12px 32px;background:#C62828;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">⏹ 停止录音</button>
        </div>
      `;
      overlay.querySelector('button').onclick = stopRecording;
      overlay.onclick = (e) => { if (e.target === overlay) { stopRecording(); overlay.remove(); } };
      document.body.appendChild(overlay);
    } catch {
      showToast('无法访问麦克风');
    }
  };

  // ===== 插入语音片段 =====
  const handleInsertVoice = (audio) => {
    if (!book) return;
    const content = book.content || '';
    const newContent = content + `\n\n[语音: ${audio.name}](audio:${audio.url})\n`;
    setBook({ ...book, content: newContent });
    setShowVoiceModal(false);
    showToast('语音已插入');
  };

  // ===== F5.6 照片排版：环绕模式 =====
  const handleInsertImageWrap = (img) => {
    if (!book) return;
    const content = book.content || '';
    const wrapHTML = `
      <div style="display:flex;gap:12px;margin:12px 0;">
        <div style="flex:1;">
          <img src="${img.url}" style="width:100%;border-radius:8px;max-height:180px;object-fit:cover;" alt="${img.name}" />
        </div>
        <div style="flex:1.5;">
          <p style="font-size:14px;line-height:1.8;margin:0;">${img.name} 的说明文字...</p>
        </div>
      </div>
    `;
    const newContent = content + wrapHTML + '\n';
    setBook({ ...book, content: newContent });
    setShowImageModal(false);
    showToast('图片已插入（环绕排版）');
  };

  // ===== F5.6 插入图片（带排版选择 + 整页大图 + 环绕） =====
  const handleInsertImage = (img) => {
    if (!book) return;
    const content = book.content || '';
    let newContent;

    switch (photoLayout) {
      case 'gallery':
        newContent = content + `\n\n<!-- gallery -->\n![${img.name}](${img.url})\n<!-- /gallery -->\n`;
        break;
      case '2col':
        newContent = content + `\n\n<div style="display:flex;gap:8px;"><img src="${img.url}" style="flex:1;height:120px;object-fit:cover;border-radius:8px;" alt="${img.name}"></div>\n`;
        break;
      case '3col':
        newContent = content + `\n\n<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;"><img src="${img.url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;" alt="${img.name}"></div>\n`;
        break;
      case 'fullpage':
        // ===== F5.6 整页大图排版 =====
        newContent = content + `\n\n<!-- fullpage -->\n<div style="width:100%;margin:16px 0;"><img src="${img.url}" style="width:100%;max-height:600px;object-fit:cover;border-radius:12px;" alt="${img.name}"></div>\n<!-- /fullpage -->\n`;
        break;
      case 'wrap':
        // ===== F5.6 文字环绕图片 =====
        handleInsertImageWrap(img);
        return;
      default:
        newContent = content + `\n\n![${img.name}](${img.url})\n`;
    }
    setBook({ ...book, content: newContent });
    setShowImageModal(false);
    showToast('图片已插入');
  };

  const handleDeleteImage = (id) => {
    setImages(prev => prev.filter(i => i.id !== id));
  };

  const handleDeleteAudio = (id) => {
    setAudioFiles(prev => prev.filter(a => a.id !== id));
  };

  const handlePlayAudio = (audio) => {
    if (playingAudio === audio.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingAudio(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(audio.url);
      audioRef.current = audio;
      audio.play();
      audio.onended = () => setPlayingAudio(null);
      setPlayingAudio(audio.id);
    }
  };

  const handleSave = async () => {
    if (!book) return;
    try {
      const { put } = await import('../api/request');
      const res = await put(`/lifebook/${bookId}`, { content: book.content });
      if (res && res.code === 0) {
        showToast('保存成功');
        setTimeout(onBack, 800);
      } else {
        showToast(res?.message || '保存失败');
      }
    } catch { showToast('保存失败'); }
  };

  // ===== 解析内容中的多媒体 =====
  const renderMultimedia = React.useMemo(() => {
    if (!book?.content) return [];
    const parts = [];
    const lines = book.content.split('\n');
    let inGallery = false;
    let galleryImages = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('<!-- gallery -->')) {
        inGallery = true;
        galleryImages = [];
        continue;
      }
      if (line.includes('<!-- /gallery -->')) {
        inGallery = false;
        parts.push({ type: 'gallery', images: [...galleryImages] });
        galleryImages = [];
        continue;
      }
      // ===== F5.6 整页大图 =====
      if (line.includes('<!-- fullpage -->')) {
        let fullpageUrl = '';
        let fullpageCaption = '';
        let i2 = i + 1;
        while (i2 < lines.length) {
          const line2 = lines[i2];
          if (line2.includes('<!-- /fullpage -->')) { i2++; break; }
          const imgMatch2 = line2.match(/<img src="([^"]+)"[^>]*alt="([^"]+)"/);
          if (imgMatch2) { fullpageUrl = imgMatch2[1]; fullpageCaption = imgMatch2[2]; }
          i2++;
        }
        if (fullpageUrl) {
          parts.push({ type: 'fullpage', url: fullpageUrl, caption: fullpageCaption });
        }
        i = i2 - 1;
        continue;
      }
      if (inGallery) {
        const match = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
        if (match) galleryImages.push({ caption: match[1], url: match[2] });
        continue;
      }
      // 语音片段
      const voiceMatch = line.match(/\[语音: ([^\]]+)\]\(audio:([^)]+)\)/);
      if (voiceMatch) {
        parts.push({ type: 'voice', name: voiceMatch[1], url: voiceMatch[2] });
        continue;
      }
      // 普通图片
      const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        parts.push({ type: 'image', caption: imgMatch[1], url: imgMatch[2] });
        continue;
      }
      if (line.trim()) {
        parts.push({ type: 'text', content: line });
      }
    }
    return parts;
  }, [book?.content]);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>;
  if (!book) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>书籍不存在</div>;

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="编辑人生之书" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px', overflow: 'auto' }}>
        {/* 预览区域 */}
        <div className="card-paper" style={{ padding: '20px', marginBottom: 16, maxHeight: '40vh', overflow: 'auto' }}>
          <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 12, fontFamily: 'var(--font-serif)' }}>· {book.title} ·</div>
          <div style={{ fontFamily: 'var(--font-serif)', lineHeight: 1.8 }}>
            {renderMultimedia.map((part, idx) => {
              if (part.type === 'text') {
                return <div key={idx} style={{ marginBottom: 4 }}>{part.content}</div>;
              }
              if (part.type === 'image') {
                return (
                  <div key={idx} style={{ margin: '12px 0', textAlign: 'center' }}>
                    <img src={part.url} alt={part.caption} style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'contain' }} />
                    {part.caption && <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>{part.caption}</div>}
                  </div>
                );
              }
              if (part.type === 'gallery') {
                return (
                  <div key={idx} style={{ margin: '12px 0' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 4 }}>📸 照片集</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                      {part.images.map((img, i) => (
                        <img key={i} src={img.url} alt={img.caption} style={{ width: '100%', aspectRatio: 1, objectFit: 'cover', borderRadius: 6 }} />
                      ))}
                    </div>
                  </div>
                );
              }
              // ===== F5.6 整页大图渲染 =====
              if (part.type === 'fullpage') {
                return (
                  <div key={idx} style={{ margin: '16px 0', textAlign: 'center' }}>
                    <img src={part.url} alt={part.caption} style={{ width: '100%', maxHeight: 600, objectFit: 'cover', borderRadius: 12 }} />
                    {part.caption && <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>{part.caption}</div>}
                  </div>
                );
              }
              if (part.type === 'voice') {
                const isPlaying = playingAudio === `v${idx}`;
                return (
                  <div key={idx} style={{ margin: '12px 0', display: 'flex', alignItems: 'center', gap: 10, background: '#F3E5F5', padding: '10px 12px', borderRadius: 8 }}>
                    <button onClick={() => handlePlayAudio({ id: `v${idx}`, url: part.url })} style={{
                      width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: isPlaying ? '#C62828' : '#7B1FA2', color: 'white', fontSize: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{isPlaying ? '⏸' : '▶'}</button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#4A148C' }}>{part.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>语音片段</div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* 编辑区域 */}
        <div className="card-paper" style={{ padding: '16px', marginBottom: 12 }}>
          <textarea value={book.content || ''}
            rows={8}
            placeholder="编辑人生之书内容..."
            style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', padding: '12px', fontSize: 15, background: 'var(--white)', outline: 'none', fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        {/* 工具栏 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ height: 40, fontSize: 13, flex: 1, minWidth: 80 }}
            onClick={() => setShowImageModal(true)}>
            <Icon.Image size={16} /> 插入图片
          </button>
          <button className="btn btn-secondary" style={{ height: 40, fontSize: 13, flex: 1, minWidth: 80 }}
            onClick={() => setShowVoiceModal(true)}>
            🎤 插入语音
          </button>
          <button className="btn btn-secondary" style={{ height: 40, fontSize: 13, flex: 1, minWidth: 80 }}
            onClick={() => setShowLayoutSelector(!showLayoutSelector)}>
            🖼️ 排版
          </button>
          <button className="btn btn-primary" style={{ height: 40, fontSize: 13, flex: 2, minWidth: 80 }}
            onClick={handleSave}>
            保存
          </button>
        </div>

        {/* 排版选择器 */}
        {showLayoutSelector && (
          <div style={{ background: '#F5F5F5', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 8 }}>图片排版方式：</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'single', label: '单张', icon: '🖼️' },
                { key: '2col', label: '双栏', icon: '📐' },
                { key: '3col', label: '三栏', icon: '📊' },
                { key: 'gallery', label: '相册集', icon: '📸' },
                { key: 'fullpage', label: '整页大图', icon: '🖼️' },
                { key: 'wrap', label: '文字环绕', icon: '📝' },
              ].map(layout => (
                <button key={layout.key} onClick={() => { setPhotoLayout(layout.key); setShowLayoutSelector(false); }} style={{
                  padding: '8px 12px', borderRadius: 6, border: `2px solid ${photoLayout === layout.key ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: photoLayout === layout.key ? '#E8F5E9' : 'white',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                }}>
                  <span style={{ fontSize: 18 }}>{layout.icon}</span>
                  <span style={{ fontSize: 11 }}>{layout.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 已上传图片预览 */}
        {images.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>已上传图片</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {images.map(img => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <img src={img.url} alt={img.name} style={{ width: '100%', aspectRatio: 1, objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => handleInsertImage(img)} style={{
                    position: 'absolute', bottom: 4, right: 4, background: 'var(--ink-green)',
                    color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28,
                    cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>+</button>
                  <button onClick={() => handleDeleteImage(img.id)} style={{
                    position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)',
                    color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22,
                    cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 已录制语音预览 */}
        {audioFiles.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>已录制语音</div>
            {audioFiles.map(audio => (
              <div key={audio.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F3E5F5', padding: '10px 12px', borderRadius: 8, marginBottom: 6 }}>
                <button onClick={() => handlePlayAudio(audio)} style={{
                  width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: playingAudio === audio.id ? '#C62828' : '#7B1FA2', color: 'white', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{playingAudio === audio.id ? '⏸' : '▶'}</button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#4A148C' }}>{audio.name}</div>
                </div>
                <button onClick={() => handleInsertVoice(audio)} style={{ padding: '4px 10px', background: '#7B1FA2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>插入</button>
                <button onClick={() => handleDeleteAudio(audio.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 图片上传弹窗 */}
      {showImageModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowImageModal(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>插入图片</span>
              <button onClick={() => setShowImageModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <label style={{ display: 'block', padding: '20px', border: '2px dashed var(--line-light)', borderRadius: 12, textAlign: 'center', cursor: 'pointer', color: 'var(--ink-tertiary)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div>点击选择图片</div>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {/* 语音插入弹窗 */}
      {showVoiceModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowVoiceModal(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>🎤 插入语音</span>
              <button onClick={() => setShowVoiceModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <button onClick={handleRecordVoice} style={{ display: 'block', width: '100%', padding: '20px', border: '2px dashed var(--line-light)', borderRadius: 12, textAlign: 'center', cursor: 'pointer', color: 'var(--ink-tertiary)', marginBottom: 12 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎤</div>
              <div>点击录音</div>
            </button>
            {audioFiles.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>已录制</div>
                {audioFiles.map(audio => (
                  <div key={audio.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-light)' }}>
                    <button onClick={() => handlePlayAudio(audio)} style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: playingAudio === audio.id ? '#C62828' : '#7B1FA2', color: 'white', fontSize: 14,
                    }}>{playingAudio === audio.id ? '⏸' : '▶'}</button>
                    <span style={{ flex: 1 }}>{audio.name}</span>
                    <button onClick={() => handleInsertVoice(audio)} style={{ padding: '4px 10px', background: '#7B1FA2', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>插入</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BookEditPage });
