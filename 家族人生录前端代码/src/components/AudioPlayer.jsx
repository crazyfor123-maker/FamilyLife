// ===== TTS音频播放器组件 =====
import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * 音频播放器组件
 * 支持播放/暂停、进度条、语速调节、音色选择、重播
 */
function AudioPlayer({ audioUrl, text, onPlaybackComplete, speed: initialSpeed = 1.0, voice }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(initialSpeed);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // 加载音频
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      setIsLoaded(false);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  // 音频加载完成
  const handleLoaded = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoaded(true);
    }
  }, []);

  // 播放进度更新
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  // 播放结束
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (onPlaybackComplete) onPlaybackComplete();
  }, [onPlaybackComplete]);

  // 播放/暂停
  const togglePlay = useCallback(() => {
    if (!audioRef.current || !isLoaded) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('播放失败:', err);
      });
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isLoaded]);

  // 调节语速
  const handleSpeedChange = useCallback((newSpeed) => {
    const adjustedSpeed = Math.max(0.5, Math.min(2.0, newSpeed));
    setSpeed(adjustedSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = adjustedSpeed;
    }
  }, []);

  // 快进/快退
  const seek = useCallback((seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }
  }, [currentTime, duration]);

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 重播
  const replay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      setCurrentTime(0);
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 12,
      padding: '12px 16px',
      margin: '8px 0',
      border: '1px solid #e9ecef',
    }}>
      {/* 音频信息 */}
      <div style={{
        fontSize: 13,
        color: '#6c757d',
        marginBottom: 8,
        fontStyle: 'italic',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        🎵 {text || '语音'}
      </div>

      {/* 播放控制 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 快退 */}
        <button
          onClick={() => seek(-5)}
          style={styles.smallBtn}
          title="后退5秒"
          disabled={!isLoaded}
        >
          ⏪
        </button>

        {/* 播放/暂停 */}
        <button
          onClick={togglePlay}
          style={{
            ...styles.playBtn,
            opacity: isLoaded ? 1 : 0.5,
          }}
          disabled={!isLoaded}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        {/* 快进 */}
        <button
          onClick={() => seek(5)}
          style={styles.smallBtn}
          title="前进5秒"
          disabled={!isLoaded}
        >
          ⏩
        </button>

        {/* 重播 */}
        <button
          onClick={replay}
          style={styles.smallBtn}
          title="重播"
          disabled={!isLoaded}
        >
          🔁
        </button>

        {/* 进度条 */}
        <div style={{
          flex: 1,
          height: 6,
          background: '#dee2e6',
          borderRadius: 3,
          cursor: 'pointer',
          position: 'relative',
        }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            if (audioRef.current) {
              audioRef.current.currentTime = pct * duration;
            }
          }}
        >
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#4A6741',
            borderRadius: 3,
            transition: 'width 0.1s',
          }} />
        </div>

        {/* 时间 */}
        <span style={{ fontSize: 12, color: '#6c757d', minWidth: 80, textAlign: 'center' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* 语速调节 */}
        <select
          value={speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          style={{
            width: 60,
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid #dee2e6',
            fontSize: 12,
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={0.75}>0.75x</option>
          <option value={1.0}>1.0x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2.0}>2.0x</option>
        </select>
      </div>

      {/* 隐藏的 audio 元素 */}
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoaded}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}

const styles = {
  smallBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
    opacity: 0.7,
  },
  playBtn: {
    background: '#4A6741',
    border: 'none',
    borderRadius: '50%',
    width: 44,
    height: 44,
    fontSize: 20,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default AudioPlayer;
