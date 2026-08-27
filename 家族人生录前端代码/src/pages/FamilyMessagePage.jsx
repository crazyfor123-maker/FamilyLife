// ===== 家族寄语页面 =====
function FamilyMessagePage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [wishType, setWishType] = React.useState('daily');
  const [highlighted, setHighlighted] = React.useState([]);

  // 加载寄语
  const loadMessages = async () => {
    setLoading(true);
    try {
      const { getMessages } = await import('../api/message');
      const res = await getMessages(spaceId);
      if (res && res.code === 0) {
        // 从消息数据中提取寄语类型（如果后端返回）
        const allMsgs = res.data || [];
        setMessages(allMsgs.filter(m => m.wish_type || m.message_type === 'wish'));
        setHighlighted(allMsgs.filter(m => m.is_highlighted).slice(0, 3));
      } else {
        // 降级：使用 Mock 数据
        setMessages(MockData.wishes || []);
        setHighlighted((MockData.wishes || []).filter(w => w.is_highlighted).slice(0, 3));
      }
    } catch (err) {
      console.error('加载寄语失败:', err);
      setMessages(MockData.wishes || []);
      setHighlighted((MockData.wishes || []).filter(w => w.is_highlighted).slice(0, 3));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadMessages();
  }, [spaceId]);

  // 发布寄语
  const handleSubmit = async () => {
    if (!content.trim()) { showToast('请输入寄语内容'); return; }
    setLoading(true);
    try {
      const { post } = await import('../api/request');
      const res = await post(`/message/${spaceId}/wish`, {
        message_type: wishType,
        content: content.trim(),
        is_private: false,
      });
      if (res && res.code === 0) {
        showToast('发布成功');
        setContent('');
        loadMessages();
      } else {
        showToast(res?.message || '发布失败');
      }
    } catch (err) {
      showToast('发布失败：' + (err.message || '网络异常'));
    } finally {
      setLoading(false);
    }
  };

  // 点赞
  const handleLike = async (messageId) => {
    try {
      const { post } = await import('../api/request');
      await post(`/message/${spaceId}/${messageId}/like`);
      loadMessages();
    } catch (err) {
      showToast('点赞失败');
    }
  };

  // 表情反应
  const handleReaction = async (messageId, emoji) => {
    try {
      const { post } = await import('../api/request');
      await post(`/message/${spaceId}/${messageId}/reaction`, { emoji });
      loadMessages();
    } catch (err) {
      showToast('表情反应失败');
    }
  };

  // 删除寄语
  const handleDelete = async (messageId) => {
    if (!confirm('确定删除此寄语？')) return;
    try {
      const { del } = await import('../api/request');
      const res = await del(`/message/${spaceId}/wish/${messageId}`);
      if (res && res.code === 0) {
        showToast('删除成功');
        loadMessages();
      } else {
        showToast(res?.message || '删除失败');
      }
    } catch (err) {
      showToast('删除失败');
    }
  };

  const sentimentColors = {
    warm: '#4A6741',
    happy: '#D97706',
    touching: '#8B5CF6',
    inspiring: '#2E5C8A',
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="💌 家族寄语" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 精选寄语 */}
        {highlighted.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 16,
            color: 'white',
          }}>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>✨ 精选寄语</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', lineHeight: 1.5 }}>
              "{highlighted[0]?.content || '传承家风，代代相传'}"
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
              — {highlighted[0]?.author_name || '家族成员'}
            </div>
          </div>
        )}

        {/* 发布区域 */}
        <div className="card" style={{ padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>发布寄语</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { id: 'daily', label: '📝 日常', color: '#4A6741' },
              { id: 'holiday', label: '🎉 节日', color: '#D97706' },
              { id: 'wisdom', label: '🧠 智慧', color: '#8B5CF6' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setWishType(item.id)}
                style={{
                  padding: '4px 12px',
                  background: wishType === item.id ? item.color : 'white',
                  color: wishType === item.id ? 'white' : 'var(--ink-primary)',
                  border: `1.5px solid ${wishType === item.id ? item.color : 'var(--line-soft)'}`,
                  borderRadius: 16,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的家族寄语..."
            rows={3}
            style={{
              width: '100%',
              padding: 10,
              border: '1.5px solid var(--line-soft)',
              borderRadius: 'var(--radius-md)',
              resize: 'vertical',
              fontSize: 15,
              fontFamily: 'var(--font-serif)',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || loading}
            style={{
              marginTop: 10,
              width: '100%',
              height: 44,
              background: content.trim() && !loading ? 'var(--ink-green)' : 'var(--line-soft)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: content.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: 15,
            }}
          >
            {loading ? '发布中...' : '发布寄语'}
          </button>
        </div>

        {/* 寄语列表 */}
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>最新寄语</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            暂无寄语，来发布第一条吧~
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.message_id || msg.id} className="card" style={{ padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink-primary)' }}>{msg.author_name || '匿名'}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginLeft: 8 }}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleDateString('zh-CN') : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    background: '#e8f5e9',
                    color: '#4A6741',
                    borderRadius: 12,
                  }}>
                    {msg.wish_type === 'holiday' ? '🎉 节日' : msg.wish_type === 'wisdom' ? '🧠 智慧' : '📝 日常'}
                  </span>
                  <button
                    onClick={() => handleDelete(msg.message_id || msg.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 2 }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-primary)', marginBottom: 8 }}>
                {msg.content || msg.message}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--ink-tertiary)' }}>
                <button onClick={() => handleLike(msg.message_id || msg.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                  ❤️ {msg.likes || 0}
                </button>
                <button onClick={() => handleReaction(msg.message_id || msg.id, '😊')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>😊</button>
                <button onClick={() => handleReaction(msg.message_id || msg.id, '👍')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>👍</button>
                <button onClick={() => handleReaction(msg.message_id || msg.id, '🙏')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0 }}>🙏</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

Object.assign(window, { FamilyMessagePage });
