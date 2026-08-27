// ===== 主应用入口 =====
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');

const authRoutes = require('./routes/auth');
const familyRoutes = require('./routes/family');
const memberRoutes = require('./routes/member');
const personRoutes = require('./routes/person');
const kinshipRoutes = require('./routes/kinship');
const interviewRoutes = require('./routes/interview');
const lifebookRoutes = require('./routes/lifebook');
const timelineRoutes = require('./routes/timeline');
const eventsRoutes = require('./routes/events');
const messageRoutes = require('./routes/message');
const searchRoutes = require('./routes/search');
const storageRoutes = require('./routes/storage');
const ttsRoutes = require('./routes/tts');
const asrRoutes = require('./routes/asr');
const aiRoutes = require('./routes/ai');
const ocrRoutes = require('./routes/ocr');
const shareRoutes = require('./routes/share');
const commentRoutes = require('./routes/comment');
const collabRoutes = require('./routes/collab');
const collabService = require('./services/collab');
const { SECRET: JWT_SECRET } = require('./middleware/auth');

const app = express();
const PORT = 3000;

// 创建HTTP服务器和WebSocket服务器
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/person', personRoutes);
app.use('/api/kinship', kinshipRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/lifebook', lifebookRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/asr', asrRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/collab', collabRoutes);

// WebSocket 认证函数
function wsAuth(req) {
  const url = new URL(req.url, 'http://localhost:3000');
  const token = url.searchParams.get('token') || (req.headers['sec-websocket-protocol'] || '').split(',')[0].trim();
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// WebSocket 处理
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost:3000');
  const pathname = url.pathname;

  // WebSocket 认证
  const user = wsAuth(req);
  if (!user && pathname === '/ws/collab') {
    ws.close(4001, 'Authentication required');
    return;
  }

  if (pathname === '/ws/collab') {
    ws.userId = user.user_id; // 存储认证后的用户ID
    // 协同编辑 WebSocket
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join') {
          collabService.joinSession(message.sessionId, ws.userId).then(result => {
            ws.send(JSON.stringify({ type: 'joined', success: result.success }));
          });
        } else if (message.type === 'op') {
          const result = collabService.applyOp(message.sessionId, ws.userId, message.operation);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify({ type: 'op', op: result.op, version: result.version }));
            }
          });
        } else if (message.type === 'cursor') {
          collabService.updateCursor(message.sessionId, ws.userId, message.cursor, message.selection);
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify({ type: 'cursor', userId: ws.userId, cursor: message.cursor, selection: message.selection }));
            }
          });
        } else if (message.type === 'leave') {
          collabService.leaveSession(message.sessionId, ws.userId);
          ws.send(JSON.stringify({ type: 'left' }));
        } else if (message.type === 'heartbeat') {
          ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
        }
      } catch (err) {
        console.error('WebSocket error:', err.message);
      }
    });

    ws.on('close', () => {
      collabService.sessions.forEach((session, sessionId) => {
        session.participants.forEach((p, userId) => {
          if (userId === ws.userId) {
            collabService.leaveSession(sessionId, userId);
          }
        });
      });
    });
  } else if (pathname === '/ws/asr') {
    // ASR流式识别 WebSocket
    let buffer = Buffer.alloc(0);
    let sessionId = '';

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'init') {
          sessionId = message.sessionId || `asr_${Date.now()}`;
        } else if (message.type === 'audio_chunk') {
          buffer = Buffer.concat([buffer, Buffer.from(message.audio, 'base64')]);
        } else if (message.type === 'stop') {
          // 停止录音，执行识别
          const fs = require('fs');
          const asrService = require('./services/asr');
          const tempPath = path.join(__dirname, '../public/audio/recordings', `stream_${sessionId}_${Date.now()}.wav`);
          fs.writeFileSync(tempPath, buffer);
          const result = asrService.recognize(tempPath, { engine: 'system', language: message.language || 'zh-CN', sessionId, questionIndex: 0 });
          ws.send(JSON.stringify({ type: 'transcript', transcript: result.transcript, confidence: result.confidence, status: result.status }));
          buffer = Buffer.alloc(0);
        }
      } catch (err) {
        console.error('ASR WebSocket error:', err.message);
      }
    });
  } else {
    ws.close(4000, 'Unknown path');
  }
});

// 定期清理过期协同会话
setInterval(() => {
  collabService.cleanupExpiredSessions();
}, 60000); // 每分钟检查一次

// 定期清理过期TTS缓存
setInterval(() => {
  const ttsService = require('./services/tts');
  const deleted = ttsService.cleanupOldFiles(24);
  if (deleted > 0) console.log(`清理了 ${deleted} 个过期TTS文件`);
}, 3600000); // 每小时检查一次

// 健康检查
app.get('/api/health', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    const { get } = require('./config/db');
    await get('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }
  res.json({ status: 'ok', time: new Date().toISOString(), ws: 'available', db: dbStatus });
});

// SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  const distIndex = path.join(__dirname, '../dist/index.html');
  const file = require('fs').existsSync(distIndex) ? distIndex : indexPath;
  if (require('fs').existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).json({ code: 90001, message: '前端构建产物未找到，请先执行 npm run build' });
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 家族人生录后端服务已启动`);
  console.log(`📡 HTTP: http://localhost:${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`📊 健康检查: http://localhost:${PORT}/api/health\n`);
});
