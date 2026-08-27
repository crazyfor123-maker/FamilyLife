// ===== 长文本朗读服务 =====
class AudioPlayer {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isPlaying = false;
    this.currentUtterance = null;
    this.paused = false;
    this.onProgress = null;
    this.onComplete = null;
    this._segments = [];
    this._currentIndex = 0;
  }

  /**
   * 朗读长文本（自动分段）
   * @param {string} text - 要朗读的文本
   * @param {Object} options
   */
  read(text, options = {}) {
    if (!this.synth) {
      console.warn('浏览器不支持语音');
      return;
    }

    // 分段：按句号/换行分割
    const segments = text
      .split(/(?<=[。！？\n])/)
      .filter(s => s.trim().length > 0);

    if (segments.length === 0) return;

    this._segments = segments;
    this._currentIndex = 0;
    this.isPlaying = true;
    this.paused = false;
    this._readNextSegment(options);
  }

  _readNextSegment(options) {
    if (this._currentIndex >= this._segments.length) {
      this.isPlaying = false;
      if (this.onComplete) this.onComplete();
      return;
    }

    const text = this._segments[this._currentIndex];

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = options.volume || 1;
    utterance.rate = options.rate || 0.85;
    utterance.lang = 'zh-CN';

    const voices = this.synth.getVoices();
    const zhVoice = voices.find(v => v.lang.startsWith('zh'));
    if (zhVoice) utterance.voice = zhVoice;

    utterance.onend = () => {
      this._currentIndex++;
      if (this.onProgress) {
        this.onProgress(this._currentIndex, this._segments.length);
      }
      // 间隔 300ms 后读下一段
      setTimeout(() => this._readNextSegment(options), 300);
    };

    this.currentUtterance = utterance;
    this.paused = false;
    this.synth.speak(utterance);
  }

  pause() {
    if (this.synth && this.synth.speaking && !this.paused) {
      this.synth.pause();
      this.paused = true;
    }
  }

  resume() {
    if (this.synth && this.paused) {
      this.synth.resume();
      this.paused = false;
    }
  }

  stop() {
    if (this.synth) this.synth.cancel();
    this.isPlaying = false;
    this.paused = false;
    this._currentIndex = 0;
  }

  /**
   * 朗读进度
   */
  get progress() {
    return {
      current: this._currentIndex,
      total: this._segments.length,
      percent: this._segments.length > 0
        ? (this._currentIndex / this._segments.length) * 100
        : 0,
    };
  }

  static supported() {
    return typeof window !== 'undefined' && !!window.speechSynthesis;
  }
}

Object.assign(window, { AudioPlayer });
