// ===== 本地AI离线引擎 - F4.13 完整版 =====
// 使用 ONNX Runtime Web 实现离线AI推理
// 集成：本地TTS引擎 + 本地ASR引擎 + 本地LLM推理 + 离线数据存储 + 性能适配
// 新增：完整模型加载 + 推理引擎 + 会话管理 + 动态追问

import { ModelDownloader } from './ONNXModelLoader';
import { LocalLLMEngine, InterviewSessionManager, FollowupEngine } from './LocalLLMEngine';

class AIOfflineEngine {
  constructor() {
    this.llmEngine = null;
    this.sessionManager = null;
    this.followupEngine = null;
    this.modelDownloader = ModelDownloader;
    this.isLoaded = false;
    this.modelPath = '/models/interview-model.onnx';
    this.ttsModel = null;
    this.asrModel = null;
    this.llmModel = null;
    this.onnxRuntime = null;
    this.ttsSupported = false;
    this.asrSupported = false;
    this.llmSupported = false;
    this.modelVersion = '1.0.0';
    this.modelSize = 0;
    this.quantizedModelPath = '/models/interview-model-q4.onnx'; // 量化模型
    this.fullModelPath = '/models/interview-model.onnx'; // 完整模型
    this.autoSelectModel = true;
    this._initialized = false;
  }

  /**
   * 检查浏览器是否支持离线AI
   */
  static isSupported() {
    return (
      typeof window !== 'undefined' &&
      'AudioContext' in window &&
      'MediaRecorder' in window &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }

  /**
   * 检查是否支持 ONNX Runtime Web
   */
  static hasONNXRuntime() {
    return typeof window !== 'undefined' && 'onnxruntime' in window;
  }

  /**
   * 检查是否支持 Web Speech API
   */
  static hasWebSpeechAPI() {
    return typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }

  /**
   * 检查是否支持 Web Audio API
   */
  static hasWebAudioAPI() {
    return typeof window !== 'undefined' &&
      ('AudioContext' in window || 'webkitAudioContext' in window);
  }

  /**
   * 初始化引擎（加载所有组件）
   */
  async init() {
    if (this._initialized) return this;

    // 初始化组件
    this.llmEngine = new LocalLLMEngine();
    await this.llmEngine.init();

    this.sessionManager = new InterviewSessionManager();
    await this.sessionManager.init();

    this.followupEngine = new FollowupEngine(this.llmEngine);

    // 检测浏览器能力
    this.asrSupported = AIOfflineEngine.hasWebSpeechAPI();
    this.ttsSupported = 'speechSynthesis' in window;
    this.llmSupported = AIOfflineEngine.hasONNXRuntime();

    // 加载已下载的模型
    if (this.llmSupported) {
      const status = await this.modelDownloader.getStatus();
      if (status.llm) {
        try {
          await this.loadModel('llm');
        } catch (err) {
          console.warn('[AIOfflineEngine] 模型加载失败，降级使用 Web Speech API:', err);
        }
      }
    }

    this._initialized = true;
    return this;
  }

  /**
   * 加载本地AI模型（自动选择完整/量化版本）
   */
  async loadModel(modelType = 'llm', onProgress = null) {
    try {
      // 检查浏览器支持
      if (!AIOfflineEngine.hasONNXRuntime()) {
        console.warn('浏览器不支持 ONNX Runtime Web，降级使用 Web Speech API');
        this._setupWebSpeechFallback();
        return false;
      }

      // 动态加载 ONNX Runtime
      const ort = await this._loadONNXRuntime();
      if (!ort) {
        console.warn('ONNX Runtime 未加载，降级使用 Web Speech API');
        this._setupWebSpeechFallback();
        return false;
      }

      this.onnxRuntime = ort;

      // 自动选择模型：优先量化版本（体积小、速度快）
      let modelPath = this.fullModelPath;
      if (this.autoSelectModel) {
        try {
          const quantizedResp = await fetch(this.quantizedModelPath, { method: 'HEAD' });
          if (quantizedResp.ok) {
            modelPath = this.quantizedModelPath;
            console.log('[AIOfflineEngine] 使用量化模型（推荐）');
          }
        } catch {
          modelPath = this.fullModelPath;
        }
      }

      // 从IndexedDB加载已下载的模型
      const data = await this.llmEngine.cache.get(modelType);
      if (!data) {
        throw new Error(`模型 ${modelType} 未下载，请先下载模型`);
      }

      this.llmModel = await ort.InferenceSession.create(data);
      this.isLoaded = true;
      this.llmSupported = true;
      this.modelPath = modelPath;
      console.log('[AIOfflineEngine] 模型加载成功:', modelPath);
      return true;
    } catch (err) {
      console.error('加载本地AI模型失败:', err);
      this._setupWebSpeechFallback();
      return false;
    }
  }

  /**
   * 动态加载 ONNX Runtime Web
   */
  async _loadONNXRuntime() {
    if (window.onnxruntime) return window.onnxruntime;
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
   * 设置 Web Speech API 降级方案
   */
  _setupWebSpeechFallback() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.asrSupported = !!SpeechRecognition;
    this.ttsSupported = 'speechSynthesis' in window;
    this.isLoaded = true; // 标记为可用（降级模式）
    console.log('[AIOfflineEngine] Web Speech API 降级方案:', {
      ASR: this.asrSupported,
      TTS: this.ttsSupported,
    });
  }

  // ===== 推理接口 =====

  /**
   * 生成AI问题（离线）
   */
  async generateQuestion(context, previousQuestion = '') {
    // 如果LLM模型已加载，使用 ONNX 推理
    if (this.llmEngine?.isReady) {
      try {
        const prompt = `你是家族采访助手。根据以下上下文，生成一个自然、温暖的采访问题。

采访上下文：${context}
上一个问题：${previousQuestion || '无'}

要求：
1. 问题要亲切、自然，像家人聊天
2. 帮助长辈回忆往事
3. 问题长度不超过30字
4. 只输出问题内容

问题：`;
        const result = await this.llmEngine.generate(prompt);
        if (result && result.length > 0) return result.trim();
      } catch (err) {
        console.warn('[AIOfflineEngine] ONNX 推理失败，降级到 Web Speech API:', err);
      }
    }

    // 降级：使用模板生成问题
    return this._generateQuestionTemplate(context, previousQuestion);
  }

  /**
   * 生成追问（离线）
   */
  async generateFollowup(context, answer) {
    if (this.followupEngine) {
      const followup = await this.followupEngine.generateFollowup(context, answer);
      if (followup) return followup;
    }
    return this._generateFollowupTemplate(context, answer);
  }

  /**
   * 本地ASR语音识别
   */
  async recognize(audioStream) {
    if (!this.asrSupported) {
      throw new Error('浏览器不支持 Web Speech API');
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = true;
    recognition.interimResults = true;

    return new Promise((resolve, reject) => {
      let result = '';
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            result += transcript + ' ';
          }
        }
      };
      recognition.onerror = (event) => reject(new Error(`ASR错误: ${event.error}`));
      recognition.onend = () => resolve(result.trim());
      recognition.start();
    });
  }

  /**
   * 本地TTS语音合成
   */
  async speak(text) {
    if (!this.ttsSupported) {
      console.warn('浏览器不支持 TTS');
      return;
    }

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }

  // ===== 会话管理 =====

  /**
   * 创建采访会话
   */
  async createSession(title) {
    if (!this.sessionManager) await this.init();
    return this.sessionManager.createSession(title);
  }

  /**
   * 获取会话
   */
  async getSession(sessionId) {
    if (!this.sessionManager) await this.init();
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * 获取会话列表
   */
  async listSessions() {
    if (!this.sessionManager) await this.init();
    return this.sessionManager.listSessions();
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId) {
    if (!this.sessionManager) await this.init();
    return this.sessionManager.deleteSession(sessionId);
  }

  /**
   * 添加问答记录
   */
  async addQA(sessionId, question, answer) {
    if (!this.sessionManager) await this.init();
    return this.sessionManager.addQA(sessionId, question, answer);
  }

  // ===== 模型管理 =====

  /**
   * 下载模型
   */
  async downloadModel(modelType = 'llm', onProgress = null) {
    return this.modelDownloader.download(modelType, onProgress);
  }

  /**
   * 下载所有模型
   */
  async downloadAllModels(onProgress = null) {
    return this.modelDownloader.downloadAll(onProgress);
  }

  /**
   * 取消下载
   */
  cancelDownload() {
    this.modelDownloader.cancel();
  }

  /**
   * 检查模型下载进度
   */
  async checkModelDownloadProgress() {
    try {
      const response = await fetch('/api/model/download/status');
      if (response.ok) {
        const data = await response.json();
        return {
          downloaded: data.downloaded || 0,
          total: data.total || 0,
          progress: data.progress || 0,
          status: data.status || 'unknown',
        };
      }
    } catch {
      return { downloaded: 0, total: 0, progress: 0, status: 'error' };
    }
    return { downloaded: 0, total: 0, progress: 0, status: 'unknown' };
  }

  /**
   * 获取模型状态
   */
  getStatus() {
    return {
      loaded: this.isLoaded,
      supported: AIOfflineEngine.isSupported(),
      hasONNXRuntime: AIOfflineEngine.hasONNXRuntime(),
      hasWebSpeechAPI: AIOfflineEngine.hasWebSpeechAPI(),
      hasWebAudioAPI: AIOfflineEngine.hasWebAudioAPI(),
      asrSupported: this.asrSupported,
      ttsSupported: this.ttsSupported,
      llmSupported: this.llmSupported,
      llmReady: this.llmEngine?.isReady || false,
      modelPath: this.modelPath,
      modelVersion: this.modelVersion,
      modelSize: this.modelSize,
      autoSelectModel: this.autoSelectModel,
      contextLength: this.llmEngine?.context?.length || 0,
    };
  }

  /**
   * 获取模型使用统计
   */
  async getModelUsage() {
    return this.modelDownloader.getStatus();
  }

  // ===== 内部方法 =====

  _decodeOutput(output) {
    if (!output || !output.output) return '';
    const tensor = output.output;
    const decoder = new TextDecoder();
    if (tensor.data) return decoder.decode(tensor.data);
    return String(tensor);
  }

  _generateQuestionTemplate(context, previousQuestion) {
    const templates = [
      '您能回忆一下小时候最难忘的事情吗？',
      '您年轻时的梦想是什么？',
      '您是如何认识祖太太的？',
      '您工作中最自豪的事情是什么？',
      '您觉得家族最宝贵的传统是什么？',
      '您年轻时做过最勇敢的事是什么？',
      '您的人生哲学是什么？',
      '您最感激的人是谁？为什么？',
      '您觉得这一生最骄傲的成就是什么？',
      '您想对后代说些什么？',
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  _generateFollowupTemplate(context, answer) {
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
   * 释放资源
   */
  async dispose() {
    if (this.llmEngine) {
      await this.llmEngine.dispose();
    }
    this.isLoaded = false;
  }
}

Object.assign(window, { AIOfflineEngine });
export default AIOfflineEngine;
