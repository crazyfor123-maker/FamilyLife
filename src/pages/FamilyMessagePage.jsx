// ===== 家族寄语页面 =====
function FamilyMessagePage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [wishType, setWishType] = React.useState('daily');
  const [highlighted, setHighlighted] = React.useState([]);
  const [showReplyModal, setShowReplyModal] = React.useState(null);
  const [replyContent, setReplyContent] = React.useState('');
  const [filterType, setFilterType] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  React.useEffect(() => { loadMessages(); }, [spaceId]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { getMessages } = await import('../api/message');
      const res = await getMessages(spaceId);
      const allMsgs = res?.data || res?.messages || MockData.wishes || [];
      setMessages(allMsgs);
      setHighlighted(allMsgs.filter(m => m.is_highlighted).slice(0, 3));
    } catch {
      setMessages(MockData.wishes || []);
      setHighlighted((MockData.wishes || []).filter(w => w.is_highlighted).slice(0, 3));
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!content.trim()) { showToast('请输入寄语内容'); return; }
    setLoading(true);
    try {
      const { post } = await import('../api/request');
      const res = await post(`/message/${spaceId}/wish`, { message_type: wishType, content: content.trim(), is_private: false });
      if (res && res.code === 0) {
        showToast('发布成功');
        setContent('');
        loadMessages();
      } else { showToast(res?.message || '发布失败'); }
    } catch (err) { showToast('发布失败：' + (err.message || '网络异常')); }
    finally { setLoading(false); }
  };

  const handleReply = async (messageId) => {
    if (!replyContent.trim()) { showToast('请输入回复内容'); return; }
    try {
      const { post } = await import('../api/request');
      const res = await post(`/message/${spaceId}/${messageId}/reply`, { content: replyContent.trim() });
      if (res && res.code === 0) {
        showToast('回复成功');
        setShowReplyModal(null);
        setReplyContent('');
        loadMessages();
      } else { showToast(res?.message || '回复失败'); }
    } catch (err) { showToast('回复失败'); }
  };

  const handleDelete = async (messageId) => {
    if (!confirm('确定删除此寄语？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/message/${spaceId}/wish/${messageId}`);
      if (res && res.code === 0) { showToast('删除成功'); loadMessages(); }
      else { showToast(res?.message || '删除失败'); }
    } catch { showToast('删除失败'); }
  };

  // 筛选
  const filteredMessages = messages.filter(m => {
    if (filterType !== 'all' && m.wish_type && m.wish_type !== filterType) return false;
    if (searchQuery && !m.content?.includes(searchQuery) && !m.message?.includes(searchQuery)) return false;
    return true;
  });

  const wishTypeLabels = { daily: '📝 日常', holiday: '🎉 节日', wisdom: '🧠 智慧', birthday: '🎂 生日', other: '📌 其他' };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="💌 家族寄语" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 精选寄语 */}
        {highlighted.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 12, padding: '16px 20px', marginBottom: 16, color: 'white' }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>✨ 精选寄语</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', lineHeight: 1.5 }}>"{highlighted[0]?.content || highlighted[0]?.message || '传承家风，代代相传'}"</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>— {highlighted[0]?.author_name || '家族成员'}</div>
          </div>
        )}

        {/* 搜索和筛选 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索寄语..." style={{ flex: 1, height: 38, border: '1.5px solid var(--line-soft)', borderRadius: 20, padding: '0 14px', fontSize: 13, background: 'white', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ id: 'all', label: '全部' }, { id: 'daily', label: '日常' }, { id: 'holiday', label: '节日' }, { id: 'wisdom', label: '智慧' }].map(f => (
              <button key={f.id} onClick={() => setFilterType(f.id)} style={{
                padding: '4px 14px', borderRadius: 16, border: `1.5px solid ${filterType === f.id ? 'var(--ink-green)' : 'var(--line-soft)'}`,
                background: filterType === f.id ? '#E8F5E9' : 'white', cursor: 'pointer', fontSize: 12,
                color: filterType === f.id ? 'var(--ink-green)' : 'var(--ink-primary)',
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        {/* 发布区域 */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>发布寄语</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {[{ id: 'daily', label: '📝 日常', color: '#4A6741' }, { id: 'holiday', label: '🎉 节日', color: '#D97706' }, { id: 'wisdom', label: '🧠 智慧', color: '#8B5CF6' }].map(item => (
              <button key={item.id} onClick={() => setWishType(item.id)} style={{
                padding: '4px 12px', background: wishType === item.id ? item.color : 'white',
                color: wishType === item.id ? 'white' : 'var(--ink-primary)',
                border: `1.5px solid ${wishType === item.id ? item.color : 'var(--line-soft)'}`,
                borderRadius: 16, cursor: 'pointer', fontSize: 12,
              }}>{item.label}</button>
            ))}
          </div>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="写下你的家族寄语..." rows={3}
            style={{ width: '100%', padding: 10, border: '1.5px solid var(--line-soft)', borderRadius: 'var(--radius-md)', resize: 'vertical', fontSize: 15, fontFamily: 'var(--font-serif)', boxSizing: 'border-box', outline: 'none' }} />
          <button onClick={handleSubmit} disabled={!content.trim() || loading} style={{
            marginTop: 10, width: '100%', height: 44,
            background: content.trim() && !loading ? 'var(--ink-green)' : 'var(--line-soft)',
            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
            cursor: content.trim() && !loading ? 'pointer' : 'not-allowed', fontSize: 15,
          }}>{loading ? '发布中...' : '发布寄语'}</button>
        </div>

        {/* 寄语列表 */}
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>最新寄语 ({filteredMessages.length})</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>暂无寄语，来发布第一条吧~</div>
        ) : (
          filteredMessages.map((msg) => (
            <div key={msg.message_id || msg.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink-primary)' }}>{msg.author_name || msg.nickname || '匿名'}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleDateString('zh-CN') : msg.date || ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', background: '#E8F5E9', color: '#4A6741', borderRadius: 12 }}>
                    {wishTypeLabels[msg.wish_type] || wishTypeLabels[messagesType] || '📝 日常'}
                  </span>
                  <button onClick={() => handleDelete(msg.message_id || msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }}>🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-primary)', marginBottom: 8 }}>
                {msg.content || msg.message}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--ink-tertiary)' }}>
                <button onClick={() => { /* like */ }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>❤️ {msg.likes || 0}</button>
                <button onClick={() => { setShowReplyModal(msg.message_id || msg.id); setReplyContent(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>💬 回复</button>
              </div>
              {/* 回复列表 */}
              {msg.replies && msg.replies.length > 0 && (
                <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '2px solid var(--line-light)' }}>
                  {msg.replies.map((r, i) => (
                    <div key={i} style={{ padding: '6px 0', fontSize: 13, color: 'var(--ink-secondary)' }}>
                      <b style={{ color: 'var(--ink-primary)' }}>{r.author_name || r.nickname || '匿名'}:</b> {r.content || r.reply}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 回复弹窗 */}
      {showReplyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowReplyModal(null)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>回复</span>
              <button onClick={() => setShowReplyModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)} rows={4} placeholder="写下你的回复..."
              style={{ width: '100%', border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 15, boxSizing: 'border-box', resize: 'vertical' }} />
            <button className="btn btn-primary btn-block" style={{ height: 44, fontSize: 15, marginTop: 12 }} onClick={() => handleReply(showReplyModal)}>发送回复</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { FamilyMessagePage });
