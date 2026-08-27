// ===== F3.9 个人家族寄语页 =====
function PersonMessagePage({ personId, onBack }) {
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [newMessage, setNewMessage] = React.useState({ content: '', author: '' });

  React.useEffect(() => {
    loadMessages();
  }, [personId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { getPersonMessages } = await import('../api/person');
      const res = await getPersonMessages(personId);
      // 兼容后端新端点: /person/:personId/messages (F3.9)
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
      const res = await createPersonMessage(personId, newMessage);
      if (res && res.code === 0) {
        showToast('寄语发布成功');
        setShowForm(false);
        setNewMessage({ content: '', author: '' });
        loadMessages();
      } else {
        showToast(res?.message || '发布失败');
      }
    } catch {
      // Mock fallback
      const msg = {
        id: Date.now(),
        content: newMessage.content,
        author: newMessage.author,
        date: new Date().toISOString().split('T')[0],
        likes: 0,
      };
      setMessages(prev => [msg, ...prev]);
      setShowForm(false);
      setNewMessage({ content: '', author: '' });
      showToast('寄语发布成功');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除此条寄语？')) return;
    try {
      const { deletePersonMessage } = await import('../api/person');
      const res = await deletePersonMessage(personId, id);
      if (res && res.code === 0) {
        showToast('已删除');
        loadMessages();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== id));
      showToast('已删除');
    }
  };

  const handleLike = (id) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, likes: (m.likes || 0) + 1 } : m));
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="💌 家族寄语" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 发布按钮 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }}
            onClick={() => setShowForm(true)}>
            <Icon.Plus size={14} /> 发布寄语
          </button>
        </div>

        {/* 寄语列表 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💌</div>
            <div>暂无家族寄语</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>成为第一个留下寄语的人吧</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {messages.map(msg => (
              <div key={msg.id} className="card" style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{msg.author || '匿名'}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>{msg.date || ''}</span>
                  </div>
                  <button onClick={() => handleDelete(msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, fontFamily: 'var(--font-serif)' }}>
                  {msg.content}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <button onClick={() => handleLike(msg.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13,
                    color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
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
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>姓名</label>
              <input value={newMessage.author} onChange={e => setNewMessage(m => ({ ...m, author: e.target.value }))}
                placeholder="请输入您的姓名"
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>寄语内容</label>
              <textarea value={newMessage.content} onChange={e => setNewMessage(m => ({ ...m, content: e.target.value }))}
                rows={5} placeholder="写下您的寄语..."
                style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleCreate}>发布寄语</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { PersonMessagePage });
