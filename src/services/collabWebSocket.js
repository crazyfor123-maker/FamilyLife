// ===== WebSocket协同连接管理 =====
class CollabWebSocket {
  constructor(sessionId, userId, options = {}) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.onMessage = options.onMessage || (() => {});
    this.ws = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.connected = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/collab`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.connected = true;
      // 加入会话
      this.ws.send(JSON.stringify({
        type: 'join',
        sessionId: this.sessionId,
        userId: this.userId,
      }));
      // 心跳
      this.heartbeatTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 30000);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.onMessage(msg);
      } catch (err) {
        console.error('WebSocket消息解析失败:', err);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      // 自动重连
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket错误:', err);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.ws) {
      this.ws.send(JSON.stringify({ type: 'leave', sessionId: this.sessionId, userId: this.userId }));
      this.ws.close();
    }
    this.connected = false;
  }

  joinSession() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'join',
        sessionId: this.sessionId,
        userId: this.userId,
      }));
    }
  }

  leaveSession() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'leave', sessionId: this.sessionId, userId: this.userId }));
    }
  }

  sendOp(operation) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'op',
        sessionId: this.sessionId,
        userId: this.userId,
        operation,
      }));
    }
  }

  updateCursor(position, selection) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'cursor',
        sessionId: this.sessionId,
        userId: this.userId,
        cursor: position,
        selection,
      }));
    }
  }

  on(event, callback) {
    if (event === 'message') {
      this.onMessage = callback;
    }
  }
}

export default CollabWebSocket;
