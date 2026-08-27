// ===== 协同编辑会话管理 =====
const { get, all, run } = require('../config/db');
const crypto = require('crypto');
const { transformOp, applyOp, detectConflict } = require('./ot');

class CollaborativeEditor {
  constructor() {
    this.sessions = new Map(); // sessionId -> session data
    this.heartbeatTimers = new Map(); // userId -> timer
  }

  /**
   * 创建协同会话
   */
  async createSession(bookId, userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');

    // 获取书籍内容作为基础
    const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
    const versions = await all('SELECT chapters FROM book_version WHERE book_id = ? ORDER BY version_number DESC LIMIT 1', [bookId]);
    const baseContent = versions?.[0]?.chapters ? JSON.parse(versions[0].chapters) : [];

    await run(
      'INSERT INTO collab_sessions (book_id, session_id, creator_id, status, version, base_content) VALUES (?, ?, ?, "active", 1, ?)',
      [bookId, sessionId, userId, JSON.stringify(baseContent)]
    );

    // 添加创建者为参与者
    await this.addParticipant(sessionId, userId, '#4A6741');

    const session = {
      id: sessionId,
      bookId,
      creatorId: userId,
      participants: new Map([[userId, { userId, color: '#4A6741', cursor: 0, active: true }]]),
      version: 1,
      ops: [],
      baseContent,
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * 加入协同会话
   */
  async joinSession(sessionId, userId, color = null) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: '会话不存在' };

    if (session.participants.size >= 10) {
      return { success: false, error: '参与者已达上限' };
    }

    const colorMap = ['#4A6741', '#C45B3D', '#2E5C8A', '#8B5CF6', '#D97706', '#059669', '#DC2626', '#7C3AED', '#0891B2', '#4F46E5'];
    const participantColor = color || colorMap[session.participants.size % colorMap.length];

    await this.addParticipant(sessionId, userId, participantColor);
    session.participants.set(userId, { userId, color: participantColor, cursor: 0, active: true });

    // 发送心跳
    this.startHeartbeat(sessionId, userId);

    return { success: true, session: this.getSessionStatus(sessionId) };
  }

  /**
   * 离开协同会话
   */
  async leaveSession(sessionId, userId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.participants.delete(userId);
    this.stopHeartbeat(sessionId, userId);

    await run(
      'UPDATE collab_participants SET is_active = 0 WHERE session_id = ? AND user_id = ?',
      [sessionId, userId]
    );

    if (session.participants.size === 0) {
      this.sessions.delete(sessionId);
    }
  }

  /**
   * 应用操作
   */
  applyOp(sessionId, userId, operation) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: '会话不存在' };

    if (!session.participants.has(userId)) {
      return { success: false, error: '未加入会话' };
    }

    const opWithMeta = { ...operation, userId, version: session.version, timestamp: Date.now() };
    session.ops.push(opWithMeta);
    session.version++;

    // 存储操作
    run(
      'INSERT INTO collab_ops (session_id, user_id, op_type, op_data, version) VALUES (?, ?, ?, ?, ?)',
      [sessionId, userId, operation.type, JSON.stringify(operation), session.version]
    );

    // 检测冲突
    const conflicts = detectConflict(session.ops.slice(-10));

    return {
      success: true,
      op: opWithMeta,
      version: session.version,
      conflicts,
      participants: Array.from(session.participants.values()),
    };
  }

  /**
   * 更新光标位置
   */
  updateCursor(sessionId, userId, cursor, selection = null) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (participant) {
      participant.cursor = cursor;
      participant.selection = selection;
    }
  }

  /**
   * 获取会话状态
   */
  getSessionStatus(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.id,
      bookId: session.bookId,
      version: session.version,
      participantCount: session.participants.size,
      participants: Array.from(session.participants.values()),
      opCount: session.ops.length,
      createdAt: session.createdAt,
    };
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // 保存最终版本
    const finalContent = session.baseContent; // TODO: 合并所有ops

    await run(
      'UPDATE collab_sessions SET status = "closed", updated_at = NOW() WHERE session_id = ?',
      [sessionId]
    );

    // 清理
    this.sessions.delete(sessionId);
    session.participants.forEach(p => this.stopHeartbeat(sessionId, p.userId));
  }

  /**
   * 添加参与者
   */
  async addParticipant(sessionId, userId, color) {
    await run(
      'INSERT OR REPLACE INTO collab_participants (session_id, user_id, color) VALUES (?, ?, ?)',
      [sessionId, userId, color]
    );
  }

  /**
   * 心跳检测
   */
  startHeartbeat(sessionId, userId) {
    const timer = setInterval(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.participants.has(userId)) {
        run(
          'UPDATE collab_participants SET last_heartbeat = NOW() WHERE session_id = ? AND user_id = ?',
          [sessionId, userId]
        );
      } else {
        clearInterval(timer);
      }
    }, 30000); // 30秒心跳
    this.heartbeatTimers.set(`${sessionId}_${userId}`, timer);
  }

  stopHeartbeat(sessionId, userId) {
    const timer = this.heartbeatTimers.get(`${sessionId}_${userId}`);
    if (timer) clearInterval(timer);
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const INACTIVE_TIMEOUT = 10 * 60 * 1000; // 10分钟无活跃参与者视为过期
    const HEARTBEAT_TIMEOUT = 3 * 60 * 1000; // 3分钟无心跳视为不活跃

    this.sessions.forEach((session, sessionId) => {
      // 更新参与者的心跳时间
      let hasActiveParticipants = false;
      const participants = Array.from(session.participants.values());

      participants.forEach(p => {
        const lastHeartbeat = p.lastHeartbeat || now;
        if (now - lastHeartbeat < HEARTBEAT_TIMEOUT) {
          hasActiveParticipants = true;
        }
      });

      // 如果没有活跃参与者且会话已空闲超过10分钟，则关闭
      if (!hasActiveParticipants && session.participants.size === 0) {
        this.closeSession(sessionId);
      } else if (!hasActiveParticipants && session.participants.size > 0) {
        // 有参与者但都不活跃，标记为空闲
        if (!session.idleAt) {
          session.idleAt = now;
        } else if (now - session.idleAt > INACTIVE_TIMEOUT) {
          this.closeSession(sessionId);
        }
      } else {
        // 有活跃参与者，重置空闲计时
        session.idleAt = null;
      }
    });
  }
}

module.exports = new CollaborativeEditor();
