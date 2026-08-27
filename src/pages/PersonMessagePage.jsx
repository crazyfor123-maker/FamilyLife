// ===== F3.9 个人家族寄语页 =====
function PersonMessagePage({ personId, onBack }) {
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [newMessage, setNewMessage] = React.useState({ content: '', author: '', type: 'text' });
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [filterType, setFilterType] = React.useState('all');

  React.useEffect(() => {
    loadMessages();
  }, [personId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { getPersonMessages } = await import('../api/person');
      const res = await getPersonMessages(personId);
      if (res && res.code === 0) {
        setMessages(res.data || []);
      } else {
        setMessages(MockData.personMessages || []);
      }
    } catch {
      setMessages(MockData.personMessages || []);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newMessage.content.trim()) { showToast('请输入寄语内容'); return; }
    if (!newMessage.author.trim()) { showToast('请输入姓名'); return; }
    try {
      const { createPersonMessage } = await import('../api/person');
      const res = await createPersonMessage(personId, { ...newMessage, type: newMessage.type || 'text' });
      if (res && res.code === 0) {
        showToast('寄语发布成功');
        setShowForm(false);
        setNewMessage({ content: '', author: '', type: 'text' });
        loadMessages();
      } else {
        showToast(res?.message || '发布失败');
      }
    } catch {
      const msg = {
        id: Date.now(),
        content: newMessage.content,
        author: newMessage.author,
        type: newMessage.type || 'text',
        date: new Date().toISOString().split('T')[0],
        likes: 0,
      };
      setMessages(prev => [msg, ...prev]);
      setShowForm(false);
      setNewMessage({ content: '', author: '', type: 'text' });
      showToast('寄语发布成功');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此条寄语？')) return;
    try {
      const { deletePersonMessage } = await import('../api/person');
      const res = await deletePersonMessage(personId, id);
      if (res && res.code === 0) { showToast('已删除'); loadMessages(); }
      else { showToast(res?.message || '删除失败'); }
    } catch { setMessages(prev => prev.filter(m => m.id !== id)); showToast('已删除'); }
  };

  const handleLike = (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: (m.likes || 0) + 1 } : m));
  };

  // 语音录制
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // 模拟语音文件
      setNewMessage(m => ({ ...m, content: `voice_${Date.now()}.mp3`, type: 'voice', voiceDuration: recordingDuration }));
      setRecordingDuration(0);
    } else {
      setIsRecording(true);
      const interval = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      window._recordingInterval = interval;
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const filteredMessages = filterType === 'all' ? messages : messages.filter(m => m.type === filterType);

  const typeLabel = (type) => {
    if (type === 'voice') return '🎤 语音';
    if (type === 'image') return '🖼️ 图片';
    return '📝 文字';
  };

  const typeColors = { voice: '#8B5CF6', image: '#D97706', text: '#4A6741' };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="💌 家族寄语" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 发布按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'text', 'voice', 'image'].map(f => (
              <button key={f} onClick={() => setFilterType(f)} style={{
                padding: '4px 12px', borderRadius: 16, border: `1.5px solid ${filterType === f ? 'var(--ink-green)' : 'var(--line-soft)'}`,
                background: filterType === f ? '#E8F5E9' : 'white', cursor: 'pointer', fontSize: 12,
                color: filterType === f ? 'var(--ink-green)' : 'var(--ink-primary)',
              }}>{f === 'all' ? '全部' : f === 'text' ? '文字' : f === 'voice' ? '语音' : '图片'}</button>
            ))}
          </div>
          <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }} onClick={() => setShowForm(true)}>
            <span style={{ marginRight: 4 }}>➕</span>发布寄语
          </button>
        </div>

        {/* 寄语列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
            暂无家族寄语<br/><span style={{ fontSize: 13 }}>成为第一个留下寄语的人吧</span>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredMessages.map(msg => (
              <div key={msg.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{msg.author || '匿名'}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>{msg.date || ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: typeColors[msg.type] || '#E8F5E9', color: typeColors[msg.type] || 'var(--ink-green)' }}>
                      {typeLabel(msg.type)}
                    </span>
                    <button onClick={() => handleDelete(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                  </div>
                </div>

                {/* 内容 */}
                {msg.type === 'voice' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                    <button onClick={() => showToast('🎤 播放语音')} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'var(--ink-green)', color: 'white', fontSize: 18, cursor: 'pointer' }}>▶</button>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 4, background: '#E0E0E0', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: '0%', background: 'var(--ink-green)', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{msg.voiceDuration ? formatTime(msg.voiceDuration) : '0:00'}</div>
                    </div>
                  </div>
                ) : msg.type === 'image' ? (
                  <div style={{ padding: '10px 0', textAlign: 'center' }}>
                    <div style={{ width: '100%', height: 160, background: '#F5F5F5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-tertiary)' }}>
                      🖼️ 图片预览
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-serif)' }}>
                    {msg.content}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button onClick={() => handleLike(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ❤️ {msg.likes || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 发布弹窗 */}
      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>发布家族寄语</span>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* 类型选择 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[{ id: 'text', label: '📝 文字' }, { id: 'voice', label: '🎤 语音' }, { id: 'image', label: '🖼️ 图片' }].map(t => (
                <button key={t.id} onClick={() => setNewMessage(m => ({ ...m, type: t.id }))} style={{
                  padding: '8px 16px', border: `1.5px solid ${newMessage.type === t.id ? 'var(--ink-green)' : 'var(--line-soft)'}`,
                  borderRadius: 8, background: newMessage.type === t.id ? '#E8F5E9' : 'white',
                  cursor: 'pointer', fontSize: 13,
                }}>{t.label}</button>
              ))}
            </div>

            {newMessage.type === 'text' ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>姓名</label>
                  <input value={newMessage.author} onChange={e => setNewMessage(m => ({ ...m, author: e.target.value }))}
                    placeholder="请输入您的姓名" style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>寄语内容</label>
                  <textarea value={newMessage.content} onChange={e => setNewMessage(m => ({ ...m, content: e.target.value }))}
                    rows={5} placeholder="写下您的寄语..." style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
              </>
            ) : newMessage.type === 'voice' ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <button onClick={toggleRecording} style={{
                  width: 80, height: 80, borderRadius: '50%', border: 'none',
                  background: isRecording ? '#D32F2F' : 'var(--ink-green)', color: 'white',
                  fontSize: 32, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>{isRecording ? '⏹' : '🎤'}</button>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-primary)', marginTop: 12 }}>{formatTime(recordingDuration)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>{isRecording ? '正在录音...' : '点击开始录音'}</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, border: '2px dashed var(--line-light)', borderRadius: 12, cursor: 'pointer' }}
                onClick={() => showToast('📷 上传图片功能开发中')}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
                <div style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>点击上传图片</div>
              </div>
            )}

            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16, marginTop: 16 }} onClick={handleCreate}>发布寄语</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PersonMessagePage });
