// ===== 语音引导服务 =====
// 为中老年用户提供语音播报引导

class VoiceGuide {
  constructor() {
    this.isPlaying = false;
    this.currentUtterance = null;
    this.queue = [];
    this.synth = window.speechSynthesis;
    this._boundResume = this._resumeNext.bind(this);
  }

  /**
   * 播放语音引导
   * @param {string} text - 要播报的文本
   * @param {Object} options
   * @param {number} options.volume - 音量 0-1
   * @param {number} options.rate - 语速 0.5-2
   * @param {string} options.lang - 语言
   * @param {Function} options.onComplete - 播放完成回调
   */
  play(text, options = {}) {
    if (!this.synth) {
      console.warn('浏览器不支持 SpeechSynthesis');
      return Promise.resolve();
    }

    const {
      volume = 1,
      rate = 0.8, // 中老年人语速稍慢
      lang = 'zh-CN',
      onComplete,
    } = options;

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;
      utterance.rate = rate;
      utterance.lang = lang;

      // 尝试选择中文语音
      const voices = this.synth.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        if (onComplete) onComplete();
        resolve();
      };

      utterance.onerror = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        resolve();
      };

      this.isPlaying = true;
      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  /**
   * 队列播放（依次播放多个文本）
   */
  playQueue(items) {
    return new Promise((resolve) => {
      this.queue = items.map(item => ({
        text: typeof item === 'string' ? item : item.text,
        options: item.options || {},
      }));
      this._playNext();
    });
  }

  _playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }
    const item = this.queue.shift();
    this.play(item.text, {
      ...item.options,
      onComplete: () => this._playNext(),
    });
  }

  _resumeNext() {
    setTimeout(() => {
      if (this.synth && this.synth.paused) {
        this.synth.resume();
      }
    }, 500);
  }

  /**
   * 停止播放
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.queue = [];
  }

  /**
   * 暂停播放
   */
  pause() {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  /**
   * 恢复播放
   */
  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  /**
   * 获取可用语音列表
   */
  getVoices() {
    if (this.synth) {
      return this.synth.getVoices();
    }
    return [];
  }

  /**
   * 是否支持语音
   */
  static supported() {
    return typeof window !== 'undefined' && !!window.speechSynthesis;
  }
}

// 预置常用引导文本
VoiceGuide.GUIDES = {
  home: '欢迎来到家族人生录。在这里，您可以记录家族故事，管理族谱，进行AI采访。',
  familyCreate: '创建您的第一个家族空间。输入家族名称、家训、起源等信息。',
  personCreate: '添加一位家族成员。填写姓名、出生日期、性别等基本信息。',
  familyTree: '族谱页面展示了您的家族关系图。点击节点可以查看详情。',
  interview: 'AI采访功能会帮您向长辈提问，记录珍贵的家族故事。',
  lifebook: '人生之书是长辈一生的记录。AI会基于采访素材自动生成。',
  timeline: '时间墙按年份展示家族故事。您可以发布新故事或浏览历史。',
  album: '相册可以管理家族照片。点击上传按钮添加照片。',
  backup: '备份功能可以保存您的家族数据到云端。',
  settings: '设置页面可以管理家族信息和权限。',
};

Object.assign(window, { VoiceGuide });
