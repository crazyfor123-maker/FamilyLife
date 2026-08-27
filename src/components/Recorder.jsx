// ===== 录音组件 =====
import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * 录音组件
 * 使用 MediaRecorder API 录音，Web Audio API 可视化
 */
function Recorder({ onRecordingComplete, maxDuration = 300, voice: initialVoice }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);

  // 初始化录音
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 创建音频上下文和分析器
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // 创建 MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/ogg';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (onRecordingComplete) {
            onRecordingComplete(reader.result, duration);
          }
          cleanup();
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current.start(100); // 每100ms收集一次数据
      setIsRecording(true);
      setIsPaused(false);
      setDuration(0);
      setError(null);

      // 开始计时
      timerRef.current = setInterval(() => {
        setDuration(d => {
          if (d >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return d + 1;
        });
      }, 1000);

      // 开始音量可视化
      visualizeVolume();

      setIsReady(true);
    } catch (err) {
      console.error('录音启动失败:', err);
      setError('无法访问麦克风，请检查权限设置');
    }
  }, [onRecordingComplete, maxDuration]);

  // 停止录音
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  // 暂停/继续录音
  const togglePause = useCallback(() => {
    if (isPaused) {
      mediaRecorderRef.current?.start(100);
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      visualizeVolume();
    } else {
      mediaRecorderRef.current?.pause();
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  // 音量可视化
  const visualizeVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setVolumeLevel(avg);
      animFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, []);

  // 清理
  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioContextRef.current?.close();
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
    setIsReady(false);
    setVolumeLevel(0);
  }, []);

  // 取消
  const cancel = useCallback(() => {
    cleanup();
    setDuration(0);
  }, [cleanup]);

  // 格式化时间
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 音量条宽度
  const volumeWidth = Math.min(100, volumeLevel * 2);

  return (
    <div style={{
      background: '#f8f9fa',
      borderRadius: 12,
      padding: '16px',
      border: '1px solid #e9ecef',
    }}>
      {/* 错误提示 */}
      {error && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 12,
          fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 录音状态 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        {/* 录音指示器 */}
        <div style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: isRecording ? '#dc3545' : '#6c757d',
          boxShadow: isRecording ? '0 0 10px #dc3545' : 'none',
          animation: isRecording ? 'pulse 1s infinite' : 'none',
        }} />

        {/* 计时器 */}
        <span style={{
          fontSize: 20,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          color: isRecording ? '#333' : '#6c757d',
        }}>
          {formatTime(duration)}
        </span>

        {/* 音量指示 */}
        <div style={{
          flex: 1,
          height: 8,
          background: '#dee2e6',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${volumeWidth}%`,
            background: volumeLevel > 180 ? '#dc3545' : volumeLevel > 100 ? '#ffc107' : '#4A6741',
            borderRadius: 4,
            transition: 'width 0.1s',
          }} />
        </div>

        {/* 剩余时间 */}
        <span style={{ fontSize: 12, color: '#6c757d' }}>
          剩余 {maxDuration - duration}s
        </span>
      </div>

      {/* 控制按钮 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!isRecording ? (
          <button
            onClick={startRecording}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            🎙️ 开始录音
          </button>
        ) : (
          <>
            <button
              onClick={togglePause}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: isPaused ? '#4A6741' : '#ffc107',
                color: isPaused ? 'white' : '#333',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
            </button>
            <button
              onClick={stopRecording}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: '#4A6741',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ⏹️ 停止
            </button>
            <button
              onClick={cancel}
              style={{
                padding: '12px 24px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ❌
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default Recorder;
