// ===== 协同编辑页 =====
function CollabEditorPage({ bookId, onBack }) {
  const [collaborators, setCollaborators] = React.useState([]);
  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState('');
  const [connected, setConnected] = React.useState(false);
  const [currentChapter, setCurrentChapter] = React.useState(0);

  React.useEffect(() => {
    // 模拟 WebSocket 连接
    const timer = setTimeout(() => setConnected(true), 1000);

    // 模拟协作者在线
    setCollaborators([
      { id: 'u1', name: '朱国栋', avatar: '朱', status: 'online', typing: false },
      { id: 'u2', name: '李秀芳', avatar: '李', status: 'online', typing: true },
    ]);

    // 模拟消息
    setMessages([
      { id: 1, user: '朱国栋', text: '第一章的内容我改了一些细节', time: '14:30' },
      { id: 2, user: '李秀芳', text: '第三章的家族故事需要补充', time: '14:35' },
    ]);

    return () => clearTimeout(timer);
  }, [bookId]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      user: '我',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }]);
    setInputText('');
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="👥 协同编辑" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 60px)' }}>
        {/* 在线协作者 */}
        <div className="card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>在线协作者：</span>
          {collaborators.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="avatar avatar-xs" style={{ background: 'var(--ink-green-soft)', color: 'var(--ink-green)' }}>
                {c.avatar}
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink-primary)' }}>{c.name}</span>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.status === 'online' ? 'var(--ink-green)' : '#E0E0E0' }} />
              {c.typing && <span style={{ fontSize: 11, color: 'var(--ink-gold)' }}>正在输入...</span>}
            </div>
          ))}
        </div>

        {/* 聊天消息 */}
        <div style={{ flex: 1, overflow: 'auto', marginBottom: 12 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div className="avatar avatar-xs" style={{ background: msg.user === '我' ? '#E8F5E9' : '#FFF3E0', color: msg.user === '我' ? 'var(--ink-green)' : 'var(--ink-gold)', flexShrink: 0 }}>
                {msg.user.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-primary)' }}>{msg.user}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{msg.time}</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginTop: 2 }}>{msg.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 输入框 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" value={inputText} onChange={e => setInputText(e.target.value)}
            placeholder="输入消息..." style={{ flex: 1, height: 40, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 14 }}
            onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }} />
          <button onClick={handleSendMessage} style={{
            height: 40, padding: '0 16px', border: 'none', borderRadius: 8,
            background: 'var(--ink-green)', color: 'white', cursor: 'pointer', fontSize: 14,
          }}>发送</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CollabEditorPage });
