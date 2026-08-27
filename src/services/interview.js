// ===== F4.3/F4.7/F4.8/F4.12/F4.13 采访系统核心服务 =====
// 语音采集 + 断点续录 + 暂停/继续 + 双AI模式 + 本地AI离线

class InterviewService {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioStream = null;
    this.recordingTimer = null;
    this.recordingSeconds = 0;
    this.silenceDetector = null;
    this.silenceStartTime = null;
    this.silenceThreshold = 5000; // 5秒静音检测
    this.endpointThreshold = 3000; // 3秒端点检测
    this.maxDuration = 300000; // 5分钟
    this.volumeLevel = 0;
    this.onVolumeChange = null;
    this.onSilenceWarning = null;
    this.onEndpointDetected = null;
    this.paused = false;
    this.currentSessionId = null;
    this.aiMode = 'cloud'; // cloud | local | hybrid
    this.localModelReady = false;
    this.localModelDownloading = false;
    this.modelDownloadProgress = 0;
    this.isOnline = navigator.onLine;
    // ===== F4.13 Day 2: 本地LLM集成 =====
    this.llmEngine = null;
    this.sessionManager = null;
    this.followupEngine = null;
    this.currentSessionId = null;
    this.contextHistory = [];
    this.lastActivityTime = Date.now();
    this.autoPauseTimeout = null;
    this.autoPauseDelay = 30000; // 30秒自动暂停
    this.resumeInterval = null;
    this.interviewState = {
      phase: 'prepare',
      currentQuestionIndex: 0,
      questions: [],
      qaRecords: [],
      recordingTime: 0,
      aiMode: 'cloud',
      timestamp: Date.now(),
    };
    // ===== F4.3 后台录音 =====
    this.isPageVisible = true;
    this.visibilityChangeHandler = null;
    this.pageVisibilityTimer = null;
  }

  // ===== F4.12 双AI模式管理 =====
  async init() {
    const savedMode = localStorage.getItem('interview_ai_mode');
    if (savedMode && ['cloud', 'local', 'hybrid'].includes(savedMode)) {
      this.aiMode = savedMode;
    }
    this.localModelReady = await this.checkLocalModel();
    this.updateOnlineStatus();
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
    // ===== F4.3 后台录音 - Page Visibility API =====
    this.initPageVisibility();
    // ===== F4.7 断点数据过期清理 =====
    this.initDraftCleanup();
    // ===== F4.13 Day 2: 初始化本地LLM =====
    await this.initLocalLLM();
  }

  // ===== F4.3 后台录音 - Page Visibility API =====
  initPageVisibility() {
    if (typeof document === 'undefined' || !document) return;
    this.visibilityChangeHandler = () => {
      const wasVisible = this.isPageVisible;
      this.isPageVisible = !document.hidden;

      if (wasVisible && !this.isPageVisible) {
        // 页面变为不可见（后台），继续录音但降低采样率
        console.log('[F4.3] 页面进入后台，继续录音');
        // 保持 AudioContext 活跃（防止浏览器冻结）
        if (this.audioStream) {
          this._keepAudioContextAlive();
        }
      } else if (!wasVisible && this.isPageVisible) {
        // 页面恢复可见
        console.log('[F4.3] 页面恢复前台');
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }

  _keepAudioContextAlive() {
    // 在后台时，使用 AudioContext 保持麦克风活跃
    if (this.audioStream && !this.pageVisibilityTimer) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext({ sampleRate: 16000 });
      const source = ctx.createMediaStreamSource(this.audioStream);
      const destination = ctx.createMediaStreamDestination();
      source.connect(destination);
      // 连接但静音输出，防止浏览器冻结 AudioContext
      destination.connect(ctx.destination);
      // 每10秒重置一次
      this.pageVisibilityTimer = setInterval(() => {
        if (!this.isPageVisible) {
          // 创建新的 AudioContext 防止浏览器冻结
          ctx.close().then(() => {
            const newCtx = new AudioContext({ sampleRate: 16000 });
            const newSource = newCtx.createMediaStreamSource(this.audioStream);
            const newDest = newCtx.createMediaStreamDestination();
            newSource.connect(newDest);
            newDest.connect(newCtx.destination);
          });
        } else {
          clearInterval(this.pageVisibilityTimer);
          this.pageVisibilityTimer = null;
          ctx.close();
        }
      }, 10000);
    }
  }

  cleanupPageVisibility() {
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    if (this.pageVisibilityTimer) {
      clearInterval(this.pageVisibilityTimer);
      this.pageVisibilityTimer = null;
    }
  }

  // ===== F4.7 断点数据过期清理 =====
  initDraftCleanup() {
    // 每6小时清理一次过期草稿
    this.draftCleanupInterval = setInterval(() => {
      this._cleanupExpiredDrafts();
    }, 6 * 60 * 60 * 1000);
  }

  async _cleanupExpiredDrafts() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天
    try {
      const { get } = await import('../api/request');
      const res = await get('/interview/drafts/cleanup');
      if (res && res.code === 0) {
        console.log('[F4.7] 服务端清理了', res.data?.cleaned || 0, '条过期草稿');
      }
    } catch {
      // 降级：本地清理
      try {
        const draftsStr = localStorage.getItem('interview_drafts');
        if (draftsStr) {
          const drafts = JSON.parse(draftsStr);
          let cleaned = 0;
          for (const key of Object.keys(drafts)) {
            if (drafts[key].updated_at < cutoff) {
              delete drafts[key];
              cleaned++;
            }
          }
          if (cleaned > 0) {
            localStorage.setItem('interview_drafts', JSON.stringify(drafts));
            console.log('[F4.7] 本地清理了', cleaned, '条过期草稿');
          }
        }
      } catch (err) {
        console.warn('[F4.7] 清理草稿失败:', err);
      }
    }
  }

  cleanupDraftCleanup() {
    if (this.draftCleanupInterval) {
      clearInterval(this.draftCleanupInterval);
      this.draftCleanupInterval = null;
    }
  }

  // ===== F4.13 Day 2: 初始化本地LLM =====
  async initLocalLLM() {
    try {
      const { AIOfflineEngine } = await import('../utils/AIOfflineEngine');
      const engine = new AIOfflineEngine();
      await engine.init();
      this.llmEngine = engine;

      // 检查LLM模型是否已加载
      const status = engine.getStatus();
      if (status.llmReady) {
        this.localModelReady = true;
        console.log('[F4.13] 本地LLM模型已加载');
      }
    } catch (err) {
      console.warn('[F4.13] 本地LLM初始化失败:', err);
    }
  }

  // ===== F4.13 Day 2: 模型下载 =====
  async downloadLocalModel() {
    this.localModelDownloading = true;
    this.modelDownloadProgress = 0;

    try {
      if (!this.llmEngine) await this.initLocalLLM();
      if (!this.llmEngine) throw new Error('LLM引擎未初始化');

      const success = await this.llmEngine.downloadModel('llm', (progress) => {
        this.modelDownloadProgress = progress;
        if (this.onModelDownloadProgress) {
          this.onModelDownloadProgress(progress);
        }
      });

      if (success) {
        this.localModelReady = true;
        this.aiMode = 'local';
        localStorage.setItem('interview_ai_mode', 'local');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[F4.13] 模型下载失败:', err);
      this.localModelDownloading = false;
      this.modelDownloadProgress = 0;
      return false;
    } finally {
      this.localModelDownloading = false;
    }
  }

  // ===== F4.13 Day 2: AI生成问题（优先本地LLM） =====
  async generateQuestion(context, previousQuestion) {
    // 优先使用本地LLM
    if (this.llmEngine?.isReady) {
      try {
        const question = await this.llmEngine.generateQuestion(context, previousQuestion);
        if (question && question.length > 0) return question;
      } catch (err) {
        console.warn('[F4.13] 本地LLM推理失败，降级到云端:', err);
      }
    }

    // 降级：使用云端AI
    if (this.isOnline) {
      try {
        const { post } = await import('../api/request');
        const res = await post('/interview/ai/generate-question', {
          context,
          previous_question: previousQuestion || '',
        });
        if (res && res.code === 0 && res.data?.question) {
          return res.data.question;
        }
      } catch (err) {
        console.warn('[F4.13] 云端AI生成失败:', err);
      }
    }

    // 降级：模板生成
    return this._generateQuestionTemplate(context, previousQuestion);
  }

  // ===== F4.13 Day 2: 生成追问 =====
  async generateFollowup(context, answer) {
    if (this.llmEngine?.isReady) {
      try {
        const followup = await this.llmEngine.generateFollowup(context, answer);
        if (followup) return followup;
      } catch (err) {
        console.warn('[F4.13] 追问生成失败:', err);
      }
    }
    return this._generateFollowupTemplate(context, answer);
  }

  // ===== F4.13 Day 2: 会话管理 =====
  async createSession(title) {
    if (!this.llmEngine) await this.initLocalLLM();
    if (!this.llmEngine) return null;
    const session = await this.llmEngine.createSession(title);
    this.currentSessionId = session.id;
    return session;
  }

  async getSession(sessionId) {
    if (!this.llmEngine) await this.initLocalLLM();
    if (!this.llmEngine) return null;
    return this.llmEngine.getSession(sessionId);
  }

  async listSessions() {
    if (!this.llmEngine) await this.initLocalLLM();
    if (!this.llmEngine) return [];
    return this.llmEngine.listSessions();
  }

  async addQA(sessionId, question, answer) {
    if (!this.llmEngine) await this.initLocalLLM();
    if (!this.llmEngine) return null;
    return this.llmEngine.addQA(sessionId, question, answer);
  }

  // ===== F4.13 Day 2: 模型状态 =====
  async getModelStatus() {
    if (!this.llmEngine) await this.initLocalLLM();
    if (!this.llmEngine) return null;
    return this.llmEngine.getStatus();
  }

  async getModelUsage() {
    if (!this.llmEngine) await this.initLocalLLM();
    if (!this.llmEngine) return null;
    return this.llmEngine.getModelUsage();
  }

  async checkLocalModel() {
    try {
      const modelPath = '/local-model/interview-model.bin';
      const response = await fetch(modelPath, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  async downloadLocalModel() {
    this.localModelDownloading = true;
    this.modelDownloadProgress = 0;

    try {
      const response = await fetch('/api/model/download/interview-model', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'interview-model' }),
      });

      if (!response.ok) throw new Error('模型下载失败');

      const reader = response.body.getReader();
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedLength += value.length;
        this.modelDownloadProgress = contentLength > 0 ? (receivedLength / contentLength) * 100 : 0;

        // 通知下载进度
        if (this.onModelDownloadProgress) {
          this.onModelDownloadProgress(this.modelDownloadProgress);
        }
      }

      this.localModelReady = true;
      this.aiMode = 'local';
      localStorage.setItem('interview_ai_mode', 'local');
      return true;
    } catch (err) {
      console.error('[F4.12] 模型下载失败:', err);
      this.localModelDownloading = false;
      this.modelDownloadProgress = 0;
      return false;
    }
  }

  async switchMode(mode) {
    if (mode === this.aiMode) return true;

    // 检查是否可以切换
    if (mode === 'local' && !this.localModelReady) {
      // 尝试下载模型
      const success = await this.downloadLocalModel();
      if (!success) return false;
    }

    if (mode === 'cloud') {
      // 首次切换到云端显示隐私提示
      const firstTimeCloud = !localStorage.getItem('privacy_notice_accepted');
      if (firstTimeCloud) {
        // 需要UI层显示隐私提示
        this.onPrivacyNotice = true;
      }
    }

    this.aiMode = mode;
    localStorage.setItem('interview_ai_mode', mode);
    return true;
  }

  getEffectiveMode() {
    if (this.aiMode === 'hybrid') {
      return this.isOnline ? 'cloud' : 'local';
    }
    return this.aiMode;
  }

  updateOnlineStatus() {
    this.isOnline = navigator.onLine;
    // 混合模式自动切换
    if (this.aiMode === 'hybrid') {
      if (this.isOnline && this.getEffectiveMode() === 'cloud') {
        console.log('[F4.12] 网络恢复，切换到云端AI');
      } else if (!this.isOnline && this.getEffectiveMode() === 'local') {
        console.log('[F4.12] 网络断开，切换到本地AI');
      }
      // ===== F4.12 智能混合模式 - 网络质量检测 =====
      if (this.isOnline) {
        this._checkNetworkQuality();
      }
    }
  }

  // ===== F4.12 智能混合模式 - 网络质量检测 =====
  async _checkNetworkQuality() {
    if (!this.isOnline) return;
    const startTime = Date.now();
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      const latency = Date.now() - startTime;
      if (response.ok && latency < 500) {
        // 网络质量良好，使用云端AI
        console.log('[F4.12] 网络质量良好（' + latency + 'ms），使用云端AI');
      } else if (latency >= 500 && latency < 2000) {
        // 网络质量一般，根据模型可用性切换
        console.log('[F4.12] 网络质量一般（' + latency + 'ms），根据模型可用性切换');
        if (this.localModelReady) {
          console.log('[F4.12] 本地模型就绪，切换到本地AI');
        }
      } else {
        // 网络质量差，切换到本地AI
        console.log('[F4.12] 网络质量差（' + latency + 'ms），切换到本地AI');
      }
    } catch {
      console.log('[F4.12] 网络检测失败，切换到本地AI');
    }
  }

  // ===== F4.3 语音采集 =====
  async startRecording() {
    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        throw { code: 'MIC_PERMISSION_DENIED', message: '请允许麦克风权限' };
      }
      if (err.name === 'NotFoundError') {
        throw { code: 'MIC_NOT_FOUND', message: '未检测到麦克风设备' };
      }
      throw { code: 'MIC_ERROR', message: '麦克风被其他应用占用' };
    }

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm',
      audioBitsPerSecond: 128000,
    });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.mediaRecorder.start(1000); // 每秒收集一次数据
    this.recordingSeconds = 0;
    this.paused = false;
    this.silenceStartTime = null;
    this.lastActivityTime = Date.now();

    // 启动录音计时器
    this.recordingTimer = setInterval(() => {
      if (!this.paused) {
        this.recordingSeconds++;
        if (this.recordingSeconds >= 300) {
          // 5分钟限制
          this.stopRecording();
          throw { code: 'MAX_DURATION', message: '单段回答最长5分钟，已自动保存' };
        }
      }
    }, 1000);

    // 启动音量检测
    this.startVolumeDetection();

    // 启动静音检测
    this.startSilenceDetection();

    return { sessionId: this.currentSessionId, startTime: Date.now() };
  }

  startVolumeDetection() {
    if (!this.audioStream) return;
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(this.audioStream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const detectVolume = () => {
      if (!this.audioStream || this.paused) {
        requestAnimationFrame(detectVolume);
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      this.volumeLevel = sum / dataArray.length;

      if (this.onVolumeChange) {
        if (this.volumeLevel < 10) {
          this.onVolumeChange('low', '请靠近麦克风');
        } else if (this.volumeLevel > 200) {
          this.onVolumeChange('high', '请稍微远离麦克风');
        } else {
          this.onVolumeChange('normal', '');
        }
      }
      requestAnimationFrame(detectVolume);
    };
    detectVolume();
  }

  startSilenceDetection() {
    if (this.resumeInterval) clearInterval(this.resumeInterval);
    this.resumeInterval = setInterval(() => {
      if (this.paused) return;

      // 检测是否有声音活动
      const hasActivity = this.volumeLevel > 15;

      if (hasActivity) {
        this.silenceStartTime = null;
      } else if (!this.silenceStartTime) {
        this.silenceStartTime = Date.now();
      } else if (Date.now() - this.silenceStartTime > this.silenceThreshold) {
        // 连续5秒静音，提示"您还在吗？"
        if (this.onSilenceWarning) {
          this.onSilenceWarning('您还在吗？请说话继续录音...');
        }
        // 再等待5秒，如果还是静音则暂停
        setTimeout(() => {
          if (!this.silenceStartTime || Date.now() - this.silenceStartTime > 10000) {
            this.pauseRecording();
          }
        }, 5000);
      }

      // 端点检测：停顿3秒自动结束
      if (this.onEndpointDetected && Date.now() - this.lastActivityTime > this.endpointThreshold) {
        this.onEndpointDetected('检测到回答结束，正在保存...');
      }
    }, 500);
  }

  pauseRecording() {
    if (this.paused) return;
    this.paused = true;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
    this.silenceStartTime = null;
    this.lastActivityTime = Date.now();
  }

  resumeRecording() {
    if (!this.paused) return;
    this.paused = false;
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
    this.silenceStartTime = null;
    this.lastActivityTime = Date.now();
  }

  async stopRecording() {
    this.paused = false;
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval);
      this.resumeInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      await new Promise(resolve => {
        this.mediaRecorder.onstop = resolve;
      });
    }

    // 停止音频轨道
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    // 生成录音文件
    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = [];
    this.volumeLevel = 0;

    return {
      blob,
      duration: this.recordingSeconds,
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
    };
  }

  // ===== F4.7 断点续录（服务端持久化） =====
  async saveInterviewProgress() {
    const state = {
      ...this.interviewState,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
    };

    // 本地保存（快速）
    localStorage.setItem('interview_resume', JSON.stringify(state));

    // 服务端保存（断点持久化）
    if (this.currentSessionId && this.isOnline) {
      try {
        await fetch(`/api/interview/${this.currentSessionId}/resume`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phase: state.phase,
            currentQuestionIndex: state.currentQuestionIndex,
            recordingTime: state.recordingTime,
            questions: state.questions,
            qaRecords: state.qaRecords,
            aiMode: state.aiMode,
            timestamp: state.timestamp,
          }),
        });
      } catch (err) {
        console.error('[F4.7] 服务端断点保存失败:', err);
      }
    }
  }

  async loadInterviewProgress(sessionId) {
    // 优先加载服务端断点
    if (sessionId && this.isOnline) {
      try {
        const response = await fetch(`/api/interview/${sessionId}/resume`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          this.interviewState = {
            ...this.interviewState,
            ...data,
            timestamp: Date.now(),
          };
          return this.interviewState;
        }
      } catch (err) {
        console.error('[F4.7] 服务端断点加载失败:', err);
      }
    }

    // 回退到本地
    const localData = localStorage.getItem('interview_resume');
    if (localData) {
      const data = JSON.parse(localData);
      this.interviewState = data;
      return data;
    }
    return null;
  }

  async getUnfinishedSessions() {
    const sessions = [];

    // 从服务端获取
    if (this.isOnline) {
      try {
        const response = await fetch('/api/interview/unfinished', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          sessions.push(...data.map(s => ({ ...s, source: 'cloud' })));
        }
      } catch (err) {
        console.error('[F4.7] 获取未完成会话失败:', err);
      }
    }

    // 从本地获取
    const localData = localStorage.getItem('interview_resume');
    if (localData) {
      const data = JSON.parse(localData);
      if (data.phase !== 'finished' && data.phase !== 'prepare') {
        sessions.push({ ...data, source: 'local' });
      }
    }

    return sessions;
  }

  async clearInterviewProgress(sessionId) {
    // 清除本地
    localStorage.removeItem('interview_resume');

    // 清除服务端
    if (sessionId && this.isOnline) {
      try {
        await fetch(`/api/interview/${sessionId}/resume`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
          },
        });
      } catch (err) {
        console.error('[F4.7] 清除服务端断点失败:', err);
      }
    }

    this.interviewState = {
      phase: 'prepare',
      currentQuestionIndex: 0,
      questions: [],
      qaRecords: [],
      recordingTime: 0,
      aiMode: this.aiMode,
      timestamp: Date.now(),
    };
  }

  // ===== F4.8 暂停/继续 =====
  async pauseInterview() {
    // 停止录音
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      await this.stopRecording();
    }

    // 保存进度
    await this.saveInterviewProgress();

    // 更新状态
    this.interviewState.phase = 'paused';
    this.interviewState.timestamp = Date.now();

    // 设置自动暂停超时
    this.autoPauseTimeout = setTimeout(() => {
      this.autoPauseInterview();
    }, this.autoPauseDelay);
  }

  async autoPauseInterview() {
    this.interviewState.phase = 'auto_paused';
    await this.saveInterviewProgress();
  }

  async resumeInterview() {
    if (this.autoPauseTimeout) {
      clearTimeout(this.autoPauseTimeout);
      this.autoPauseTimeout = null;
    }
    this.interviewState.phase = 'asking';
    await this.saveInterviewProgress();
  }

  async endInterview() {
    await this.pauseInterview();
    this.interviewState.phase = 'finished';
    this.interviewState.timestamp = Date.now();
    await this.saveInterviewProgress();
  }

  // ===== F4.13 本地AI离线 =====
  async initLocalAI() {
    if (!this.localModelReady) {
      const downloaded = await this.downloadLocalModel();
      if (!downloaded) return false;
    }

    try {
      // 加载本地TTS
      this.localTTS = await this.loadLocalTTS();
      // 加载本地ASR
      this.localASR = await this.loadLocalASR();
      // 加载本地LLM
      this.localLLM = await this.loadLocalLLM();
      return true;
    } catch (err) {
      console.error('[F4.13] 本地AI初始化失败:', err);
      return false;
    }
  }

  async loadLocalTTS() {
    // 尝试使用Web Speech API作为本地TTS引擎
    if ('speechSynthesis' in window) {
      // 预加载中文语音
      let zhVoice = null;
      const loadVoices = () => {
        const voices = speechSynthesis.getVoices();
        zhVoice = voices.find(v => v.lang.startsWith('zh')) || voices[0] || null;
      };
      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices;

      return {
        speak: (text, options = {}) => {
          return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;
            if (zhVoice) utterance.voice = zhVoice;
            utterance.onend = () => resolve();
            utterance.onerror = (e) => resolve(); // TTS错误不阻塞
            speechSynthesis.speak(utterance);
          });
        },
        stop: () => speechSynthesis.cancel(),
        getVoices: () => speechSynthesis.getVoices(),
        isSupported: true,
      };
    }
    throw new Error('浏览器不支持TTS');
  }

  async loadLocalASR() {
    // 尝试使用Web Speech API作为本地ASR引擎
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null;

      const createRecognition = () => {
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        return recognition;
      };

      return {
        start: (onResult, onError) => {
          if (!recognition || recognition.readyState === 2) {
            recognition = createRecognition();
          }
          recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript;
              } else {
                interimTranscript += transcript;
              }
            }
            // 返回最终+中间结果，供上游区分
            onResult({ final: finalTranscript, interim: interimTranscript });
          };
          recognition.onerror = (event) => {
            if (event.error === 'no-speech') {
              // 无声不报错，继续监听
              return;
            }
            onError(event.error);
          };
          recognition.onend = () => {
            // 自动重启（保持持续识别）
            try { recognition = createRecognition(); recognition.start(); } catch(e) {}
          };
          recognition.start();
        },
        stop: () => { if (recognition) { recognition.stop(); recognition = null; } },
        restart: () => { if (recognition) { recognition.stop(); recognition = null; } },
      };
    }
    throw new Error('浏览器不支持ASR，请使用Chrome/Edge/Safari最新版本的浏览器');
  }

  async loadLocalLLM() {
    // 本地LLM推理（离线模式）
    // 在实际实现中，这里会加载ONNX Runtime Web或WebLLM
    // 当前使用规则引擎生成上下文相关的追问
    return {
      generateFollowup: async (context) => {
        const text = context?.text || '';
        const history = context?.history || [];

        // 基于上下文的智能追问模板
        const followups = {
          emotion: [
            '那时候您的心情是怎样的？',
            '这段经历对您有什么特别的意义？',
            '现在回想起来，您有什么感触？',
          ],
          detail: [
            '能具体说说当时的场景吗？',
            '那天都有哪些人在场？',
            '能描述一下当时的环境吗？',
          ],
          reflection: [
            '回头看那段岁月，您最大的收获是什么？',
            '如果重来一次，您会有什么不同的选择？',
            '那段经历教会了您什么？',
          ],
          relationship: [
            '您和家人当时是怎么相处的？',
            '您和那位长辈的关系怎么样？',
            '您觉得 family 对您影响最大的是什么？',
          ],
          default: [
            '能详细说说吗？',
            '后来呢？',
            '那对您意味着什么？',
            '您能多分享一些吗？',
          ],
        };

        // 根据上下文关键词匹配追问类型
        const emotionKeywords = ['开心', '难过', '感动', '害怕', '激动', '后悔', '幸福', '痛苦'];
        const detailKeywords = ['那天', '那时', '地方', '人', '场景', '环境'];
        const reflectionKeywords = ['现在', '回想', '如果', '收获', '教训', '意义'];
        const relationshipKeywords = ['家人', '父母', '孩子', '朋友', '同事', '老师'];

        let category = 'default';
        for (const kw of emotionKeywords) {
          if (text.includes(kw)) { category = 'emotion'; break; }
        }
        if (category === 'default') {
          for (const kw of detailKeywords) {
            if (text.includes(kw)) { category = 'detail'; break; }
          }
        }
        if (category === 'default') {
          for (const kw of reflectionKeywords) {
            if (text.includes(kw)) { category = 'reflection'; break; }
          }
        }
        if (category === 'default') {
          for (const kw of relationshipKeywords) {
            if (text.includes(kw)) { category = 'relationship'; break; }
          }
        }

        const options = followups[category] || followups.default;
        // 避免重复追问（基于历史）
        const usedTexts = history.map(h => h.followup || '');
        const available = options.filter(o => !usedTexts.includes(o));
        return available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : followups.default[Math.floor(Math.random() * followups.default.length)];
      },
      synthesizeQuestion: async (question) => question,
      isAvailable: true,
    };
  }

  async processWithLocalAI(type, data) {
    const effectiveMode = this.getEffectiveMode();

    if (effectiveMode === 'local') {
      if (!this.localLLM) {
        const success = await this.initLocalAI();
        if (!success) throw new Error('本地AI模型未加载');
      }

      switch (type) {
        case 'tts':
          return this.localTTS?.speak(data.text);
        case 'asr':
          return { text: '本地ASR结果' };
        case 'followup':
          return this.localLLM?.generateFollowup(data.context);
        default:
          throw new Error(`未知的本地AI类型: ${type}`);
      }
    }

    // 云端模式
    return this.processWithCloudAI(type, data);
  }

  async processWithCloudAI(type, data) {
    switch (type) {
      case 'tts':
        return fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      case 'asr':
        return fetch('/api/asr/recognize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
            'Content-Type': 'application/json',
          },
          body: data,
        });
      case 'followup':
        return fetch('/api/ai/followup', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('family_token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
      default:
        throw new Error(`未知的AI类型: ${type}`);
    }
  }

  // ===== 通用 =====
  getAIStatus() {
    const effectiveMode = this.getEffectiveMode();
    return {
      mode: effectiveMode,
      isOnline: this.isOnline,
      localModelReady: this.localModelReady,
      localModelDownloading: this.localModelDownloading,
      modelDownloadProgress: this.modelDownloadProgress,
    };
  }

  getInterviewState() {
    return { ...this.interviewState };
  }

  setInterviewState(state) {
    this.interviewState = { ...this.interviewState, ...state };
  }

  cleanup() {
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    if (this.resumeInterval) clearInterval(this.resumeInterval);
    if (this.autoPauseTimeout) clearTimeout(this.autoPauseTimeout);
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    // ===== F4.3 后台录音 - 清理 =====
    this.cleanupPageVisibility();
    // ===== F4.7 断点数据过期清理 - 清理 =====
    this.cleanupDraftCleanup();
  }
}

export default new InterviewService();
