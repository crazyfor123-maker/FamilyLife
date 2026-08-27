// ===== 家族留言板页 =====
function MessageBoardPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showCompose, setShowCompose] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [newMessage, setNewMessage] = React.useState('');

  React.useEffect(() => {
    loadMessages();
  }, [spaceId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { getMessages } = await import('../api/message');
      const res = await getMessages(spaceId);
      if (res && res.code === 0) {
        setMessages(res.data || []);
      } else {
        setMessages(MockData.messages);
      }
    } catch {
      setMessages(MockData.messages);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('确定删除此留言？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/message/${messageId}`);
      if (res && res.code === 0) {
        showToast('已删除');
        loadMessages();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch { showToast('删除失败'); }
  };

  const handleLike = async (messageId) => {
    try {
      const { post } = await import('../api/request');
      await post(`/message/${messageId}/like`);
      loadMessages();
    } catch {}
  };

  const handleReply = async (parentId) => {
    if (!replyContent.trim()) return;
    try {
      const { post } = await import('../api/request');
      const res = await post(`/message/${parentId}/reply`, { content: replyContent.trim() });
      if (res && res.code === 0) {
        showToast('回复成功');
        setReplyContent('');
        setReplyTo(null);
        loadMessages();
      } else {
        showToast(res?.message || '回复失败');
      }
    } catch { showToast('回复失败'); }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const { post } = await import('../api/request');
      const res = await post(`/message/${spaceId}/post`, { content: newMessage.trim() });
      if (res && res.code === 0) {
        showToast('留言成功');
        setNewMessage('');
        setShowCompose(false);
        loadMessages();
      } else {
        showToast(res?.message || '发布失败');
      }
    } catch { showToast('发布失败'); }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="💬 家族留言板" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }}
            onClick={() => setShowCompose(true)}>
            <Icon.Plus size={14} /> 写留言
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          messages.map(msg => (
            <div key={msg.message_id || msg.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div className="avatar avatar-sm" style={{ background: 'var(--ink-green-soft)', color: 'var(--ink-green)' }}>
                  {(msg.author || msg.author_name || '家').slice(0, 1)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{msg.author || msg.author_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{msg.created_at || msg.time || ''}</div>
                </div>
                <button onClick={() => handleDelete(msg.message_id || msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 4 }}>🗑️</button>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-primary)', lineHeight: 1.6, margin: 0 }}>{msg.content || msg.message || ''}</p>

              {/* 回复列表 */}
              {msg.replies && msg.replies.length > 0 && (
                <div style={{ marginTop: 8, borderTop: '1px solid var(--line-light)', paddingTop: 8 }}>
                  {msg.replies.map((r, i) => (
                    <div key={i} style={{ fontSize: 13, color: 'var(--ink-secondary)', padding: '3px 0' }}>
                      <b style={{ color: 'var(--ink-primary)' }}>{r.author || '匿名'}:</b> {r.content || r.text || ''}
                      <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginLeft: 6 }}>{r.time || r.created_at || ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 回复输入框 */}
              {replyTo === (msg.message_id || msg.id) && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <input type="text" value={replyContent} onChange={e => setReplyContent(e.target.value)}
                    placeholder="回复..." style={{ flex: 1, height: 34, border: '1.5px solid var(--line-soft)', borderRadius: 6, padding: '0 10px', fontSize: 13 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleReply(msg.message_id || msg.id); }}
                  />
                  <button onClick={() => handleReply(msg.message_id || msg.id)} style={{ height: 34, padding: '0 10px', border: 'none', borderRadius: 6, background: 'var(--ink-green)', color: 'white', cursor: 'pointer', fontSize: 12 }}>发送</button>
                  <button onClick={() => setReplyTo(null)} style={{ height: 34, padding: '0 10px', border: 'none', borderRadius: 6, background: '#F5F5F5', cursor: 'pointer', fontSize: 12 }}>取消</button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                <button onClick={() => handleLike(msg.message_id || msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>❤ {msg.likes || 0}</button>
                <button onClick={() => setReplyTo(replyTo === (msg.message_id || msg.id) ? null : (msg.message_id || msg.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: 0 }}>💬 回复</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 写留言弹窗 */}
      {showCompose && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowCompose(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>写留言</span>
              <button onClick={() => setShowCompose(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
              placeholder="写下你想说的话..." rows={4}
              style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, fontFamily: 'var(--font-serif)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />
            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handlePostMessage}>
              发布留言
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MessageBoardPage });
