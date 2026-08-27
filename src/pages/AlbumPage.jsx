// ===== F6.8 个人相册页 - 瀑布流+云端上传+标注+大图滑动 =====
function AlbumPage({ personId, onBack }) {
  const [photos, setPhotos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showUpload, setShowUpload] = React.useState(false);
  const [viewMode, setViewMode] = React.useState('grid'); // grid | list | waterfall
  const [selectedPhoto, setSelectedPhoto] = React.useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(-1);
  const [editingAnnotation, setEditingAnnotation] = React.useState(null);
  const [swipeDir, setSwipeDir] = React.useState(null);
  const [showAnnotationEditor, setShowAnnotationEditor] = React.useState(false);
  const [annotationDraft, setAnnotationDraft] = React.useState('');
  const [locationDraft, setLocationDraft] = React.useState('');
  const [tagDraft, setTagDraft] = React.useState('');
  const [existingTags, setExistingTags] = React.useState([]);
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);

  React.useEffect(() => {
    loadPhotos();
  }, [personId]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const { getPersonPhotos } = await import('../api/person');
      const res = await getPersonPhotos(personId);
      if (res && res.code === 0) {
        setPhotos((res.data || []).map(p => ({
          ...p,
          annotation: p.annotation || '',
          location: p.location || '',
          tags: p.tags || [],
        })));
      } else {
        setPhotos(generateMockPhotos());
      }
    } catch {
      setPhotos(generateMockPhotos());
    } finally {
      setLoading(false);
    }
  };

  const generateMockPhotos = () =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i + 1, url: '', caption: `照片 ${i + 1}`,
      date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      size: (Math.random() * 5 + 1).toFixed(1) + 'MB',
      category: ['家庭', '旅行', '工作', '生活'][i % 4],
      annotation: '',
      location: '',
      tags: [],
    }));

  // ===== 云端上传 =====
  const handleCloudUpload = async (files) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('photos', file));
    formData.append('person_id', personId);

    try {
      const { post } = await import('../api/request');
      const res = await post('/storage/upload/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res && res.code === 0) {
        loadPhotos();
        showToast(`已上传 ${files.length} 张照片到云端`);
      } else {
        showToast(res?.message || '上传失败');
      }
    } catch {
      // Fallback: 本地预览
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPhotos(prev => [...prev, {
            id: Date.now() + Math.random(),
            url: ev.target.result,
            caption: file.name,
            date: new Date().toISOString().split('T')[0],
            size: (file.size / 1024 / 1024).toFixed(1) + 'MB',
            category: '上传',
            annotation: '',
            location: '',
            tags: [],
          }]);
        };
        reader.readAsDataURL(file);
      });
      showToast(`本地已添加 ${files.length} 张照片`);
    }
    setShowUpload(false);
  };

  // ===== 照片标注 =====
  const handleAnnotation = (photo) => {
    setSelectedPhoto(photo);
    setEditingAnnotation(photo.id);
    setAnnotationDraft(photo.annotation || '');
    setLocationDraft(photo.location || '');
    setTagDraft('');
    setExistingTags(photo.tags || []);
    setShowAnnotationEditor(true);
  };

  const handleSaveAnnotation = () => {
    setPhotos(prev => prev.map(p =>
      p.id === editingAnnotation
        ? { ...p, annotation: annotationDraft, location: locationDraft, tags: [...new Set([...(p.tags || []), ...existingTags])] }
        : p
    ));
    setShowAnnotationEditor(false);
    setEditingAnnotation(null);
    showToast('标注已保存');
  };

  const handleAddTag = () => {
    if (tagDraft.trim() && !existingTags.includes(tagDraft.trim())) {
      setExistingTags(prev => [...prev, tagDraft.trim()]);
      setTagDraft('');
    }
  };

  const handleRemoveTag = (tag) => {
    setExistingTags(prev => prev.filter(t => t !== tag));
  };

  // ===== 大图滑动浏览 =====
  const handlePhotoClick = (photo, index) => {
    setSelectedPhoto(photo);
    setSelectedPhotoIndex(index);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    // 阻止默认滚动
  };

  const handleTouchEnd = (e) => {
    if (selectedPhotoIndex < 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0 && selectedPhotoIndex < photos.length - 1) {
        setSwipeDir('left');
        const nextIdx = selectedPhotoIndex + 1;
        setSelectedPhoto(photos[nextIdx]);
        setSelectedPhotoIndex(nextIdx);
      } else if (deltaX < 0 && selectedPhotoIndex > 0) {
        setSwipeDir('right');
        const prevIdx = selectedPhotoIndex - 1;
        setSelectedPhoto(photos[prevIdx]);
        setSelectedPhotoIndex(prevIdx);
      }
    }
  };

  // ===== 删除 =====
  const handleDelete = (id) => {
    if (!confirm('确定删除此照片？')) return;
    setPhotos(prev => prev.filter(p => p.id !== id));
    showToast('已删除');
  };

  const categories = ['全部', ...new Set(photos.map(p => p.category))];

  // ===== 瀑布流列计算 =====
  const waterfallColumns = React.useMemo(() => {
    const col1 = [], col2 = [], col3 = [];
    photos.forEach((photo, i) => {
      const arr = [col1, col2, col3][i % 3];
      arr.push(photo);
    });
    return [col1, col2, col3];
  }, [photos]);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📷 个人相册" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>{photos.length} 张照片</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : viewMode === 'list' ? 'waterfall' : 'grid')} style={{
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4,
            }}>
              {viewMode === 'grid' ? '☰' : viewMode === 'list' ? '⊞' : '▥'}
            </button>
            <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }}
              onClick={() => setShowUpload(true)}>
              <Icon.Plus size={14} /> 上传
            </button>
          </div>
        </div>

        {/* 分类筛选 */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8 }}>
          {categories.map(c => (
            <span key={c} style={{
              padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
              border: '1.5px solid var(--line-light)', background: 'white',
              color: 'var(--ink-secondary)', whiteSpace: 'nowrap',
            }}>{c}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : viewMode === 'waterfall' ? (
          // ===== 瀑布流布局 =====
          <div style={{ display: 'flex', gap: 8, height: 'calc(100vh - 320px)', overflow: 'auto' }}>
            {[0, 1, 2].map(colIdx => (
              <div key={colIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {waterfallColumns[colIdx].map((photo, idx) => (
                  <div key={photo.id} style={{
                    borderRadius: 8, overflow: 'hidden', background: photo.url ? 'none' : 'linear-gradient(135deg, #D4B896 0%, #E8D8C0 100%)',
                    cursor: 'pointer', position: 'relative',
                  }} onClick={() => handlePhotoClick(photo, idx)}>
                    {photo.url ? (
                      <img src={photo.url} alt={photo.caption} style={{ width: '100%', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon.Image size={24} color="rgba(255,255,255,0.5)" />
                      </div>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDelete(photo.id); }} style={{
                      position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                      color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {photos.map((photo, idx) => (
              <div key={photo.id} style={{
                aspectRatio: 1,
                background: photo.url ? `url(${photo.url}) center/cover` : 'linear-gradient(135deg, #D4B896 0%, #E8D8C0 100%)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
              }} onClick={() => handlePhotoClick(photo, idx)}>
                {!photo.url && <Icon.Image size={24} color="rgba(255,255,255,0.5)" />}
                {photo.annotation && (
                  <div style={{ position: 'absolute', bottom: 2, left: 2, background: 'rgba(0,0,0,0.5)', borderRadius: 3, padding: '1px 4px', fontSize: 9, color: 'white' }}>
                    📝
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); handleDelete(photo.id); }} style={{
                  position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer',
                  color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          photos.map((photo, idx) => (
            <div key={photo.id} className="card" style={{ padding: '10px 12px', marginBottom: 4, display: 'flex', gap: 10, alignItems: 'center' }}
              onClick={() => handlePhotoClick(photo, idx)}>
              <div style={{ width: 50, height: 50, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                background: photo.url ? `url(${photo.url}) center/cover` : '#D4B896' }}>
                {!photo.url && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon.Image size={20} color="rgba(255,255,255,0.5)" />
                </div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photo.caption}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{photo.date} · {photo.size}</div>
                {photo.tags && photo.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                    {photo.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 10, background: '#E8F5E9', color: '#4A6741', padding: '1px 6px', borderRadius: 10 }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); handleAnnotation(photo); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>📝</button>
              <button onClick={e => { e.stopPropagation(); handleDelete(photo.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
            </div>
          ))
        )}
      </div>

      {/* 上传弹窗 */}
      {showUpload && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowUpload(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>上传照片</span>
              <button onClick={() => setShowUpload(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <label style={{ display: 'block', padding: '20px', border: '2px dashed var(--line-light)', borderRadius: 12, textAlign: 'center', cursor: 'pointer', color: 'var(--ink-tertiary)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div>点击选择照片（自动上传到云端）</div>
              <input type="file" accept="image/*" multiple onChange={e => handleCloudUpload(e.target.files)} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {/* 照片大图预览（支持左右滑动） */}
      {selectedPhoto && selectedPhotoIndex >= 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}
          onClick={() => { setSelectedPhoto(null); setSelectedPhotoIndex(-1); }}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <button style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>✕</button>

          {/* 左右导航 */}
          {selectedPhotoIndex > 0 && (
            <button onClick={e => { e.stopPropagation(); setSelectedPhoto(photos[selectedPhotoIndex - 1]); setSelectedPhotoIndex(selectedPhotoIndex - 1); }}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 24, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}>
              ◀
            </button>
          )}
          {selectedPhotoIndex < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setSelectedPhoto(photos[selectedPhotoIndex + 1]); setSelectedPhotoIndex(selectedPhotoIndex + 1); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 24, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer' }}>
              ▶
            </button>
          )}

          {selectedPhoto.url ? (
            <img src={selectedPhoto.url} alt={selectedPhoto.caption} style={{ maxWidth: '90%', maxHeight: '75vh', borderRadius: 8 }} />
          ) : (
            <div style={{ color: 'white', fontSize: 18, width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 8 }}>
              <Icon.Image size={48} color="rgba(255,255,255,0.3)" />
            </div>
          )}
          <div style={{ color: 'white', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
            {selectedPhoto.caption} · {selectedPhoto.date}
            {selectedPhoto.location && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>📍 {selectedPhoto.location}</div>}
            {selectedPhoto.tags && selectedPhoto.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 }}>
                {selectedPhoto.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10 }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8 }}>
            {selectedPhotoIndex + 1} / {photos.length} · 左右滑动浏览
          </div>
        </div>
      )}

      {/* 标注编辑弹窗 */}
      {showAnnotationEditor && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowAnnotationEditor(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>📝 照片标注</span>
              <button onClick={() => setShowAnnotationEditor(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>描述</label>
              <textarea value={annotationDraft} onChange={e => setAnnotationDraft(e.target.value)}
                rows={3} placeholder="描述这张照片..."
                style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>📍 地点</label>
              <input value={locationDraft} onChange={e => setLocationDraft(e.target.value)}
                placeholder="输入地点..."
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>🏷️ 标签</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input value={tagDraft} onChange={e => setTagDraft(e.target.value)}
                  placeholder="添加标签..." style={{ flex: 1, height: 36, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 10px', fontSize: 14, boxSizing: 'border-box' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
                <button onClick={handleAddTag} style={{ padding: '0 12px', background: 'var(--ink-green)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>添加</button>
              </div>
              {existingTags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {existingTags.map(tag => (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#E8F5E9', color: '#4A6741', padding: '3px 8px', borderRadius: 12, fontSize: 12 }}>
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleSaveAnnotation}>保存标注</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { AlbumPage });
