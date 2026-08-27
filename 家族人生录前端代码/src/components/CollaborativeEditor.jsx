// ===== 协同编辑器组件 =====
import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 协同编辑器
 * 基于 WebSocket 的实时协同编辑
 */
function CollaborativeEditor({ bookId, userId, userName, color = '#4A6741', onClose }) {
  const [ws, setWs] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState('connecting'); // connecting, ready, error
  const [remoteCursors, setRemoteCursors] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);

  const wsRef = useRef(null);

  // 创建协同会话
  const createSession = useCallback(async () => {
    try {
      const res = await fetch('/api/collab/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
        },
        body: JSON.stringify({ book_id: bookId }),
      });
      const data = await res.json();
      if (data.code === 0) {
        setSessionId(data.data.session_id);
        setStatus('ready');
        connectWebSocket(data.data.session_id);
      } else {
        setErrorMessage('创建协同会话失败: ' + data.message);
        setStatus('error');
      }
    } catch (err) {
      setErrorMessage('创建失败: ' + err.message);
      setStatus('error');
    }
  }, [bookId]);

  // 连接WebSocket
  const connectWebSocket = useCallback((sid) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collab`;
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      // 加入会话
      newWs.send(JSON.stringify({ type: 'join', sessionId: sid, userId }));
    };

    newWs.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'joined':
          setStatus('ready');
          break;
        case 'op':
          // 广播操作（由编辑器处理）
          break;
        case 'cursor':
          setRemoteCursors(prev => ({
            ...prev,
            [msg.userId]: { cursor: msg.cursor, selection: msg.selection },
          }));
          break;
        case 'heartbeat_ack':
          // 心跳确认
          break;
        case 'left':
          // 有人离开
          setParticipants(prev => prev.filter(p => p.userId !== msg.userId));
          break;
        default:
          break;
      }
    };

    newWs.onclose = () => {
      setStatus('disconnected');
    };

    newWs.onerror = () => {
      setErrorMessage('WebSocket连接错误');
      setStatus('error');
    };

    wsRef.current = newWs;
    setWs(newWs);
  }, [userId]);

  // 发送操作
  const sendOp = useCallback((operation) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'op',
        sessionId,
        userId,
        operation,
      }));
    }
  }, [sessionId, userId]);

  // 更新光标
  const updateCursor = useCallback((position, selection) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && sessionId) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        sessionId,
        userId,
        cursor: position,
        selection,
      }));
    }
  }, [sessionId, userId]);

  // 离开会话
  const leaveSession = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'leave', sessionId, userId }));
      wsRef.current.close();
    }
    if (onClose) onClose();
  }, [sessionId, userId, onClose]);

  // 心跳
  useEffect(() => {
    if (!ws) return;
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [ws]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        width: '90%',
        maxWidth: 900,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 头部 */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: 16 }}>📝 协同编辑</div>
            <div style={{ fontSize: 12, color: '#6c757d' }}>
              {status === 'ready' ? `${participants.length + 1} 人在线` : status}
            </div>
          </div>

          {/* 参与者列表 */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
            }}>
              {userName?.charAt(0) || 'U'}
            </div>
            {participants.map(p => (
              <div key={p.userId} style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: p.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                marginLeft: -8,
                border: '2px solid white',
              }}>
                {p.userId?.charAt(0) || '?'}
              </div>
            ))}
          </div>

          <button onClick={leaveSession} style={{
            padding: '6px 16px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}>
            离开
          </button>
        </div>

        {/* 状态 */}
        {status === 'connecting' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#4A6741' }}>
            正在创建协同会话...
          </div>
        )}
        {status === 'ready' && (
          <div style={{ padding: 40, textAlign: 'center', color: '#4A6741' }}>
            ✅ 协同会话已就绪，正在连接...
          </div>
        )}
        {status === 'error' && errorMessage && (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ color: '#dc3545', marginBottom: 12 }}>❌ {errorMessage}</div>
            <button onClick={createSession} style={{
              padding: '8px 24px',
              background: '#4A6741',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}>
              重试
            </button>
          </div>
        )}

        {/* 远程光标显示 */}
        {Object.keys(remoteCursors).length > 0 && (
          <div style={{ padding: '8px 20px', background: '#f8f9fa', fontSize: 12, color: '#6c757d' }}>
            远程光标: {Object.entries(remoteCursors).map(([uid, c]) => (
              <span key={uid} style={{ marginRight: 12 }}>
                👤 {uid}: 位置 {c.cursor}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CollaborativeEditor;
