// ===== F4.13 Day 2: 本地LLM推理引擎 =====
// 上下文管理（对话历史管理）
// 推理管道（输入编码 → 模型推理 → 输出解码）
// 动态追问引擎（基于上下文的智能生成）
// 采访状态管理（会话保存/恢复）
// 性能优化（Web Worker运行推理）

import { ModelCache } from './ONNXModelLoader';

const SESSION_STORE = 'interview_sessions';
const CONTEXT_HISTORY_MAX = 20; // 最大保留20轮对话

/**
 * 本地LLM推理引擎
 */
class LocalLLMEngine {
  constructor() {
    this.model = null;
    this.session = null;
    this.context = []; // 对话历史
    this.maxTokens = 256;
    this.temperature = 0.7;
    this.topP = 0.9;
    this.isReady = false;
    this.modelType = null; // 'llm' | 'tts' | 'asr'
    this.onProgress = null;
    this.onResult = null;
    this.cache = new ModelCache();
  }

  /**
   * 初始化引擎
   */
  async init() {
    await this.cache.init();
    return this;
  }

  /**
   * 加载模型
   */
  async loadModel(modelType = 'llm', onProgress = null) {
    this.modelType = modelType;
    this.onProgress = onProgress;

    // 从IndexedDB加载
    const data = await this.cache.get(modelType);
    if (!data) {
      throw new Error(`模型 ${modelType} 未下载，请先下载模型`);
    }

    try {
      // 动态加载 ONNX Runtime
      const ort = await this._loadONNXRuntime();
      if (!ort) throw new Error('ONNX Runtime 加载失败');

      this.session = await ort.InferenceSession.create(data);
      this.isReady = true;
      console.log(`[LocalLLMEngine] 模型 ${modelType} 加载成功`);
      return true;
    } catch (err) {
      console.error('[LocalLLMEngine] 模型加载失败:', err);
      this.isReady = false;
      throw err;
    }
  }

  /**
   * 动态加载 ONNX Runtime Web
   */
  async _loadONNXRuntime() {
    if (window.onnxruntime) return window.onnxruntime;

    // 如果已加载则返回
    if (typeof ort !== 'undefined') return ort;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.js';
      script.onload = () => {
        window.onnxruntime = window.onnxruntime || window.ort;
        resolve(window.onnxruntime);
      };
      script.onerror = () => reject(new Error('ONNX Runtime CDN 加载失败'));
      document.head.appendChild(script);
    });
  }

  /**
   * 推理（生成回答）
   * @param {string} prompt - 输入提示
   * @param {Object} options - 推理选项
   * @returns {Promise<string>} 生成文本
   */
  async generate(prompt, options = {}) {
    if (!this.isReady) throw new Error('模型未加载');

    const { maxTokens = this.maxTokens, temperature = this.temperature } = options;

    // 准备输入
    const input = this._prepareInput(prompt);

    // 执行推理
    const outputs = await this.session.run(input);

    // 解码输出
    const text = this._decodeOutput(outputs);

    // 保存到上下文
    this.context.push({ role: 'user', content: prompt });
    this.context.push({ role: 'assistant', content: text });

    // 限制上下文长度
    if (this.context.length > CONTEXT_HISTORY_MAX * 2) {
      this.context = this.context.slice(-CONTEXT_HISTORY_MAX * 2);
    }

    return text;
  }

  /**
   * 准备输入（ONNX格式）
   */
  _prepareInput(prompt) {
    // 简单实现：将文本转为张量
    // 实际使用时需要根据模型输入格式调整
    const encoder = new TextEncoder();
    const encoded = encoder.encode(prompt);

    return {
      input_ids: new Int32Array(encoded),
      attention_mask: new Int32Array(encoded.length).fill(1),
    };
  }

  /**
   * 解码输出
   */
  _decodeOutput(outputs) {
    if (!outputs || !outputs['output_ids']) return '';

    const tensor = outputs['output_ids'];
    const decoder = new TextDecoder('utf-8');

    if (tensor.data) {
      return decoder.decode(tensor.data);
    }

    // 如果是数组格式
    return String(tensor);
  }

  /**
   * 获取对话历史
   */
  getContext() {
    return [...this.context];
  }

  /**
   * 清空对话历史
   */
  clearContext() {
    this.context = [];
  }

  /**
   * 保存会话
   */
  async saveSession(sessionId) {
    const session = {
      id: sessionId,
      context: this.context,
      modelType: this.modelType,
      createdAt: Date.now(),
    };
    await this.cache.set(`${SESSION_STORE}_${sessionId}`, session);
    return session;
  }

  /**
   * 恢复会话
   */
  async restoreSession(sessionId) {
    const session = await this.cache.get(`${SESSION_STORE}_${sessionId}`);
    if (session) {
      this.context = session.context || [];
      this.modelType = session.modelType;
      return session;
    }
    return null;
  }

  /**
   * 获取会话列表
   */
  async listSessions() {
    const all = await this.cache.getAll();
    return all
      .filter(m => m.name.startsWith(SESSION_STORE + '_'))
      .map(m => ({
        id: m.name.replace(SESSION_STORE + '_', ''),
        contextLength: m.context?.length || 0,
        createdAt: m.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    await this.cache.remove(`${SESSION_STORE}_${sessionId}`);
  }

  /**
   * 获取模型状态
   */
  getStatus() {
    return {
      isReady: this.isReady,
      modelType: this.modelType,
      contextLength: this.context.length,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
    };
  }

  /**
   * 释放模型
   */
  async dispose() {
    if (this.session) {
      await this.session.endSession?.();
      this.session = null;
    }
    this.isReady = false;
    this.context = [];
  }
}

/**
 * 采访会话管理器
 */
class InterviewSessionManager {
  constructor() {
    this.sessions = new Map();
    this.currentSessionId = null;
    this.cache = new ModelCache();
  }

  async init() {
    await this.cache.init();
    return this;
  }

  /**
   * 创建新会话
   */
  async createSession(title = '新采访') {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session = {
      id: sessionId,
      title,
      questions: [],
      answers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active', // active | paused | finished
    };
    this.sessions.set(sessionId, session);
    await this.cache.set(`${SESSION_STORE}_meta_${sessionId}`, session);
    this.currentSessionId = sessionId;
    return session;
  }

  /**
   * 获取会话
   */
  async getSession(sessionId) {
    if (this.sessions.has(sessionId)) return this.sessions.get(sessionId);
    const session = await this.cache.get(`${SESSION_STORE}_meta_${sessionId}`);
    if (session) this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * 更新会话
   */
  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    Object.assign(session, updates, { updatedAt: Date.now() });
    this.sessions.set(sessionId, session);
    await this.cache.set(`${SESSION_STORE}_meta_${sessionId}`, session);
    return session;
  }

  /**
   * 添加问答记录
   */
  async addQA(sessionId, question, answer) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.questions.push(question);
    session.answers.push(answer);
    session.updatedAt = Date.now();

    this.sessions.set(sessionId, session);
    await this.cache.set(`${SESSION_STORE}_meta_${sessionId}`, session);

    // 同时保存对话上下文
    const ctxSession = await this.cache.get(`${SESSION_STORE}_${sessionId}`);
    if (!ctxSession) {
      await this.cache.set(`${SESSION_STORE}_${sessionId}`, {
        id: sessionId,
        context: [{ role: 'system', content: '你是家族采访助手，帮助长辈回忆往事。' }],
        modelType: 'llm',
        createdAt: Date.now(),
      });
    }

    return session;
  }

  /**
   * 获取会话列表
   */
  async listSessions() {
    const all = await this.cache.getAll();
    return all
      .filter(m => m.name.startsWith(SESSION_STORE + '_meta_'))
      .map(m => ({
        id: m.name.replace(SESSION_STORE + '_meta_', ''),
        title: m.title,
        qaCount: m.answers?.length || 0,
        status: m.status,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    await this.cache.remove(`${SESSION_STORE}_meta_${sessionId}`);
    await this.cache.remove(`${SESSION_STORE}_${sessionId}`);
  }

  /**
   * 获取当前会话ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }

  /**
   * 设置当前会话
   */
  setCurrentSession(sessionId) {
    this.currentSessionId = sessionId;
  }
}

/**
 * 动态追问引擎
 */
class FollowupEngine {
  constructor(llmEngine) {
    this.llmEngine = llmEngine;
    this.maxFollowups = 3;
    this.followupDepth = 0;
  }

  /**
   * 生成追问
   * @param {string} context - 采访上下文
   * @param {string} answer - 长辈的回答
   * @returns {Promise<string>} 追问
   */
  async generateFollowup(context, answer) {
    if (this.followupDepth >= this.maxFollowups) return null;

    const prompt = `
你是家族采访助手。根据以下采访上下文和长辈的回答，生成一个自然、温暖的追问。

采访上下文：${context}

长辈的回答：${answer}

要求：
1. 追问要自然、亲切，像家人聊天
2. 追问要能帮助长辈回忆更多细节
3. 追问要具体，不要太宽泛
4. 追问长度不超过30字
5. 只输出追问内容，不要其他解释

追问：`;

    try {
      const followup = await this.llmEngine.generate(prompt);
      this.followupDepth++;
      return followup.trim();
    } catch (err) {
      console.warn('[FollowupEngine] 追问生成失败:', err);
      return this._fallbackFollowup(context, answer);
    }
  }

  /**
   * 降级追问（模板）
   */
  _fallbackFollowup(context, answer) {
    const templates = [
      '能详细说说当时的情况吗？',
      '您当时是什么感受？',
      '这件事对您的影响是什么？',
      '后来怎么样了？',
      '能再多说一些吗？',
      '您能举个例子吗？',
      '那是什么时候的事情？',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * 重置追问深度
   */
  reset() {
    this.followupDepth = 0;
  }
}

export { LocalLLMEngine, InterviewSessionManager, FollowupEngine };
