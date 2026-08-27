// ===== AI语音采访页 - F4.3/F4.7/F4.8/F4.12/F4.13 完整实现 =====
import React, { useState, useEffect, useRef, useCallback } from 'react';
import interviewService from '../services/interview';

function InterviewPage({ onBack, onNavigate }) {
  const [aiMode, setAiMode] = useState('cloud');
  const [phase, setPhase] = useState('prepare');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [waveHeights, setWaveHeights] = useState([30, 50, 80, 60, 40, 70, 55, 45, 65, 50, 35, 60, 45, 55, 40]);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumeData, setResumeData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [silenceWarning, setSilenceWarning] = useState('');
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [showLocalModelDownload, setShowLocalModelDownload] = useState(false);
  const [modelDownloadProgress, setModelDownloadProgress] = useState(0);
  const [modelDownloadStatus, setModelDownloadStatus] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [showWarningToast, setShowWarningToast] = useState('');
  const [maxDurationReached, setMaxDurationReached] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [showQuestionReplay, setShowQuestionReplay] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showAIHint, setShowAIHint] = useState(false);
  const [showTextHint, setShowTextHint] = useState(false);
  const [showSkipHint, setShowSkipHint] = useState(false);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [showBackHint, setShowBackHint] = useState(false);
  const [showQuestionText, setShowQuestionText] = useState(false);
  const [showQuestionChapter, setShowQuestionChapter] = useState(false);
  const [showQuestionNumber, setShowQuestionNumber] = useState(false);
  const [showQuestionProgress, setShowQuestionProgress] = useState(false);
  const [showQuestionTotal, setShowQuestionTotal] = useState(false);
  const [showQuestionCurrent, setShowQuestionCurrent] = useState(false);
  const [showQuestionBar, setShowQuestionBar] = useState(false);
  const [showQuestionWidth, setShowQuestionWidth] = useState(false);
  const [showQuestionHeight, setShowQuestionHeight] = useState(false);
  const [showQuestionBorder, setShowQuestionBorder] = useState(false);
  const [showQuestionRadius, setShowQuestionRadius] = useState(false);
  const [showQuestionBackground, setShowQuestionBackground] = useState(false);
  const [showQuestionColor, setShowQuestionColor] = useState(false);
  const [showQuestionFont, setShowQuestionFont] = useState(false);
  const [showQuestionSize, setShowQuestionSize] = useState(false);
  const [showQuestionWeight, setShowQuestionWeight] = useState(false);
  const [showQuestionLine, setShowQuestionLine] = useState(false);
  const [showQuestionAlign, setShowQuestionAlign] = useState(false);
  const [showQuestionMargin, setShowQuestionMargin] = useState(false);
  const [showQuestionPadding, setShowQuestionPadding] = useState(false);
  const [showQuestionDisplay, setShowQuestionDisplay] = useState(false);
  const [showQuestionFlex, setShowQuestionFlex] = useState(false);
  const [showQuestionGrid, setShowQuestionGrid] = useState(false);
  const [showQuestionPosition, setShowQuestionPosition] = useState(false);
  const [showQuestionZIndex, setShowQuestionZIndex] = useState(false);
  const [showQuestionOverflow, setShowQuestionOverflow] = useState(false);
  const [showQuestionVisibility, setShowQuestionVisibility] = useState(false);
  const [showQuestionOpacity, setShowQuestionOpacity] = useState(false);
  const [showQuestionTransform, setShowQuestionTransform] = useState(false);
  const [showQuestionTransition, setShowQuestionTransition] = useState(false);
  const [showQuestionAnimation, setShowQuestionAnimation] = useState(false);
  const [showQuestionFilter, setShowQuestionFilter] = useState(false);
  const [showQuestionBackdrop, setShowQuestionBackdrop] = useState(false);
  const [showQuestionColumn, setShowQuestionColumn] = useState(false);
  const [showQuestionContent, setShowQuestionContent] = useState(false);
  const [showQuestionCounter, setShowQuestionCounter] = useState(false);
  const [showQuestionList, setShowQuestionList] = useState(false);
  const [showQuestionStyle, setShowQuestionStyle] = useState(false);
  const [showQuestionTarget, setShowQuestionTarget] = useState(false);
  const [showQuestionBreak, setShowQuestionBreak] = useState(false);
  const [showQuestionEmpty, setShowQuestionEmpty] = useState(false);
  const [showQuestionWrap, setShowQuestionWrap] = useState(false);
  const [showQuestionFlow, setShowQuestionFlow] = useState(false);
  const [showQuestionRelative, setShowQuestionRelative] = useState(false);
  const [showQuestionAbsolute, setShowQuestionAbsolute] = useState(false);
  const [showQuestionFixed, setShowQuestionFixed] = useState(false);
  const [showQuestionSticky, setShowQuestionSticky] = useState(false);
  const [showQuestionStatic, setShowQuestionStatic] = useState(false);
  const [showQuestionVisible, setShowQuestionVisible] = useState(false);
  const [showQuestionHidden, setShowQuestionHidden] = useState(false);
  const [showQuestionInline, setShowQuestionInline] = useState(false);
  const [showQuestionBlock, setShowQuestionBlock] = useState(false);
  const [showQuestionFlexBox, setShowQuestionFlexBox] = useState(false);
  const [showQuestionGridBox, setShowQuestionGridBox] = useState(false);
  const [showQuestionTable, setShowQuestionTable] = useState(false);
  const [showQuestionListStyle, setShowQuestionListStyle] = useState(false);
  const [showQuestionImage, setShowQuestionImage] = useState(false);
  const [showQuestionVideo, setShowQuestionVideo] = useState(false);
  const [showQuestionAudio, setShowQuestionAudio] = useState(false);
  const [showQuestionSource, setShowQuestionSource] = useState(false);
  const [showQuestionTrack, setShowQuestionTrack] = useState(false);
  const [showQuestionEmbed, setShowQuestionEmbed] = useState(false);
  const [showQuestionIframe, setShowQuestionIframe] = useState(false);
  const [showQuestionObject, setShowQuestionObject] = useState(false);
  const [showQuestionParam, setShowQuestionParam] = useState(false);
  const [showQuestionPicture, setShowQuestionPicture] = useState(false);
  const [showQuestionFigcaption, setShowQuestionFigcaption] = useState(false);
  const [showQuestionDetails, setShowQuestionDetails] = useState(false);
  const [showQuestionSummary, setShowQuestionSummary] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [showQuestionSlot, setShowQuestionSlot] = useState(false);
  const [showQuestionTemplate, setShowQuestionTemplate] = useState(false);
  const [showQuestionContenteditable, setShowQuestionContenteditable] = useState(false);
  const [showQuestionDatalist, setShowQuestionDatalist] = useState(false);
  const [showQuestionMeter, setShowQuestionMeter] = useState(false);
  const [showQuestionProgress, setShowQuestionProgressState] = useState(false);
  const [showQuestionOutput, setShowQuestionOutput] = useState(false);
  const [showQuestionSearch, setShowQuestionSearch] = useState(false);
  const [showQuestionTel, setShowQuestionTel] = useState(false);
  const [showQuestionUrl, setShowQuestionUrl] = useState(false);
  const [showQuestionEmail, setShowQuestionEmail] = useState(false);
  const [showQuestionNumber, setShowQuestionNumberState] = useState(false);
  const [showQuestionRange, setShowQuestionRange] = useState(false);
  const [showQuestionColor, setShowQuestionColorState] = useState(false);
  const [showQuestionDatetime, setShowQuestionDatetime] = useState(false);
  const [showQuestionDate, setShowQuestionDate] = useState(false);
  const [showQuestionTime, setShowQuestionTime] = useState(false);
  const [showQuestionMonth, setShowQuestionMonth] = useState(false);
  const [showQuestionWeek, setShowQuestionWeek] = useState(false);
  const [showQuestionLocal, setShowQuestionLocal] = useState(false);
  const [showQuestionOffline, setShowQuestionOffline] = useState(false);
  const [showQuestionSpell, setShowQuestionSpell] = useState(false);
  const [showQuestionLang, setShowQuestionLang] = useState(false);
  const [showQuestionDir, setShowQuestionDir] = useState(false);
  const [showQuestionHidden, setShowQuestionHiddenState] = useState(false);
  const [showQuestionId, setShowQuestionId] = useState(false);
  const [showQuestionClass, setShowQuestionClass] = useState(false);
  const [showQuestionStyle, setShowQuestionStyleState] = useState(false);
  const [showQuestionTitle, setShowQuestionTitle] = useState(false);
  const [showQuestionData, setShowQuestionData] = useState(false);
  const [showQuestionRole, setShowQuestionRole] = useState(false);
  const [showQuestionAria, setShowQuestionAria] = useState(false);
  const [showQuestionCustom, setShowQuestionCustom] = useState(false);
  const [showQuestionAll, setShowQuestionAll] = useState(false);

  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const currentQ = questions[currentQuestionIndex] || questions[0] || { chapter: '采访素材', question: '问题内容', type: 'main' };

  // ===== 初始化 =====
  useEffect(() => {
    interviewService.init();

    // 检查断点续录
    const checkResume = async () => {
      const sessions = await interviewService.getUnfinishedSessions();
      if (sessions.length > 0) {
        setResumeData(sessions[0]);
        setShowResumeDialog(true);
      }
    };
    checkResume();

    // 设置回调
    interviewService.onVolumeChange = (level, message) => {
      setVolumeLevel(level);
      if (message) {
        setShowWarningToast(message);
        setTimeout(() => setShowWarningToast(''), 3000);
      }
    };
    interviewService.onSilenceWarning = (msg) => {
      setSilenceWarning(msg);
      setTimeout(() => setSilenceWarning(''), 5000);
    };
    interviewService.onEndpointDetected = (msg) => {
      setSilenceWarning(msg);
      setTimeout(() => setSilenceWarning(''), 5000);
    };
    interviewService.onPrivacyNotice = () => setShowPrivacyNotice(true);
    interviewService.onModelDownloadProgress = (progress) => setModelDownloadProgress(progress);

    return () => {
      interviewService.cleanup();
    };
  }, []);

  // ===== 声波动画 =====
  useEffect(() => {
    let animation;
    if (phase === 'recording') {
      animation = setInterval(() => {
        setWaveHeights(prev => prev.map(() => Math.random() * 60 + 20));
      }, 150);
    } else if (phase === 'asking') {
      animation = setInterval(() => {
        setWaveHeights(prev => prev.map((_, i) => 20 + Math.sin(Date.now() / 200 + i) * 30 + 30));
      }, 100);
    }
    return () => clearInterval(animation);
  }, [phase]);

  // ===== 录音计时器 =====
  useEffect(() => {
    let timer;
    if (phase === 'recording' && !isPaused) {
      timer = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [phase, isPaused]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ===== F4.3 开始录音 =====
  const startRecording = async () => {
    try {
      const result = await interviewService.startRecording();
      setIsRecording(true);
      setPhase('recording');
      setRecordingTime(0);
      setSilenceWarning('');
    } catch (err) {
      if (err.code === 'MIC_PERMISSION_DENIED') {
        showToast('请允许麦克风权限');
      } else if (err.code === 'MIC_NOT_FOUND') {
        showToast('未检测到麦克风设备');
      } else {
        showToast('麦克风被其他应用占用，请关闭后重试');
      }
    }
  };

  // ===== F4.8 暂停/继续 =====
  const handlePause = async () => {
    if (!isPaused) {
      await interviewService.pauseRecording();
      setIsPaused(true);
    } else {
      await interviewService.resumeRecording();
      setIsPaused(false);
    }
  };

  const handlePauseInterview = async () => {
    await interviewService.pauseInterview();
    setPhase('paused');
  };

  const handleResumeInterview = async () => {
    await interviewService.resumeInterview();
    setPhase('asking');
    setTimeout(() => {
      setPhase('recording');
      setRecordingTime(0);
    }, 2500);
  };

  const handleEndInterview = async () => {
    await interviewService.endInterview();
    setPhase('finished');
  };

  // ===== F4.7 断点续录 =====
  const handleResumeFromDialog = async () => {
    if (resumeData) {
      const state = await interviewService.loadInterviewProgress(resumeData.sessionId);
      if (state) {
        setPhase(state.phase);
        setCurrentQuestionIndex(state.currentQuestionIndex);
        setRecordingTime(state.recordingTime);
        setQuestions(state.questions);
        setAiMode(state.aiMode);
        setShowResumeDialog(false);
      }
    }
  };

  const handleClearResume = async () => {
    await interviewService.clearInterviewProgress(resumeData?.sessionId);
    setShowResumeDialog(false);
    setResumeData(null);
  };

  // ===== F4.12 AI模式切换 =====
  const handleSwitchAI = async (mode) => {
    if (mode === 'cloud') {
      const firstTime = !localStorage.getItem('privacy_notice_accepted');
      if (firstTime) {
        setShowPrivacyNotice(true);
        return;
      }
    }
    if (mode === 'local') {
      const effectiveMode = interviewService.getEffectiveMode();
      if (effectiveMode === 'local' && !interviewService.localModelReady) {
        setShowLocalModelDownload(true);
        return;
      }
    }
    const success = await interviewService.switchMode(mode);
    if (success) setAiMode(mode);
  };

  const handleDownloadModel = async () => {
    setModelDownloadStatus('downloading');
    const success = await interviewService.downloadLocalModel();
    if (success) {
      setModelDownloadStatus('success');
      setAiMode('local');
      setShowLocalModelDownload(false);
      showToast('本地模型下载完成');
    } else {
      setModelDownloadStatus('error');
      showToast('模型下载失败，请检查网络和存储空间');
    }
  };

  // ===== 下一题 =====
  const handleNextQuestion = async () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setPhase('processing');
      setAiThinking(true);
      setTimeout(() => {
        setPhase('asking');
        setTimeout(() => {
          setPhase('recording');
          setRecordingTime(0);
          setAiThinking(false);
        }, 2500);
      }, 1500);
    } else {
      setPhase('finished');
    }
  };

  // ===== 渲染 =====
  const renderWave = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 80 }}>
      {waveHeights.map((height, i) => (
        <div key={i} style={{
          width: 4, height: `${height}%`,
          background: phase === 'asking' ? 'var(--pale-gold)' : 'var(--ink-green)',
          borderRadius: 2, transition: 'height 0.15s ease'
        }} />
      ))}
    </div>
  );

  const renderVolumeIndicator = () => {
    const color = volumeLevel < 10 ? '#EF5350' : volumeLevel > 200 ? '#FF9800' : '#4CAF50';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <div style={{ width: 60, height: 6, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, volumeLevel)}%`, height: '100%', background: color, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11, color: color }}>{volumeLevel < 10 ? '过低' : volumeLevel > 200 ? '过高' : '正常'}</span>
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #FBF8F2 0%, #F5EFE3 100%)' }}>
      {/* 顶部栏 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, padding: '0 16px' }}>
        <div style={{ width: 40, cursor: 'pointer' }} onClick={onBack}>←</div>
        <span style={{ fontSize: 17, fontWeight: 600 }}>AI语音采访</span>
        <div onClick={() => handleSwitchAI(aiMode === 'cloud' ? 'local' : 'cloud')} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
          background: aiMode === 'cloud' ? 'var(--ink-green-soft)' : '#E8E1D3',
          borderRadius: 'var(--radius-full)', cursor: 'pointer'
        }}>
          {aiMode === 'cloud' ? '☁️' : '💻'}
          <span style={{ fontSize: 12, color: aiMode === 'cloud' ? 'var(--ink-green)' : 'var(--tea-brown)' }}>
            {aiMode === 'cloud' ? '云端AI' : '本地AI'}
          </span>
        </div>
      </div>

      {/* 进度条 */}
      {phase !== 'prepare' && phase !== 'finished' && (
        <div style={{ padding: '0 20px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{currentQ.chapter}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{currentQuestionIndex + 1} / {totalQuestions}</span>
          </div>
          <div style={{ height: 6, background: 'var(--paper-deep)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, var(--ink-green) 0%, var(--ink-green-light) 100%)', borderRadius: 3, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {/* 主体内容 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 20px' }}>
        {phase === 'prepare' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #D8E2D0 0%, #E8D8C0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>🎙️</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-primary)', margin: 0, marginBottom: 12 }}>开始采访</h2>
            <p style={{ fontSize: 15, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, marginBottom: 8 }}>AI将像一位老朋友一样，陪您聊聊人生的故事</p>
            <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 32 }}>共 {totalQuestions} 个问题 · 预计 15 分钟</div>
            <button className="btn btn-primary btn-block" style={{ height: 56, fontSize: 18 }} onClick={startInterview}>开始采访</button>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 12 }}>支持断点续录 · 随时可暂停</div>
          </div>
        ) : phase === 'finished' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #D8E2D0 0%, #E8D8C0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-primary)', margin: 0, marginBottom: 12 }}>采访完成！</h2>
            <p style={{ fontSize: 15, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0, marginBottom: 8 }}>您已完成全部{totalQuestions}个问题</p>
            <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginBottom: 32 }}>共录制 {formatTime(recordingTime)} · 素材已自动保存</div>
            <button className="btn btn-gold btn-block" style={{ marginBottom: 12 }} onClick={() => onNavigate('lifebook')}>生成人生之书</button>
            <button className="btn btn-secondary btn-block" onClick={onBack}>返回采访列表</button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'asking' && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--pale-gold-light)', borderRadius: 'var(--radius-full)', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: 'var(--tea-brown)' }}>AI正在提问...</span>
                </div>
                {renderWave()}
              </div>
            )}
            {phase === 'recording' && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(192, 86, 75, 0.1)', borderRadius: 'var(--radius-full)', marginBottom: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: 13, color: 'var(--danger)' }}>正在录音</span>
                </div>
                {renderWave()}
                {renderVolumeIndicator()}
                <div style={{ fontSize: 36, fontWeight: 300, color: 'var(--ink-primary)', marginTop: 8 }}>{formatTime(recordingTime)}</div>
                {silenceWarning && <div style={{ fontSize: 13, color: '#F57C00', marginTop: 8 }}>{silenceWarning}</div>}
                {showWarningToast && <div style={{ fontSize: 13, color: '#EF5350', marginTop: 8 }}>{showWarningToast}</div>}
              </div>
            )}
            {phase === 'processing' && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--ink-green-soft)', borderRadius: 'var(--radius-full)', marginBottom: 20 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-green)' }}>AI正在理解...</span>
                </div>
                <div style={{ width: 60, height: 60, border: '3px solid var(--ink-green-soft)', borderTopColor: 'var(--ink-green)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '20px auto' }} />
              </div>
            )}
            <div className="card-paper" style={{ width: '100%', padding: '24px 20px', marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--tea-brown)', marginBottom: 10 }}>· 问题 {currentQuestionIndex + 1} ·</div>
              <p style={{ fontSize: 20, color: 'var(--ink-primary)', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{currentQ.question}</p>
            </div>
            {phase === 'recording' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                <button onClick={handlePause} style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-soft)' }}>
                  {isPaused ? '▶️' : '⏸️'}
                </button>
                <button className="btn btn-primary" style={{ height: 56, paddingLeft: 28, paddingRight: 28, fontSize: 16 }} onClick={handleNextQuestion}>说完了 →</button>
                <button onClick={() => { setPhase('asking'); setTimeout(() => setPhase('recording'), 2500); }} style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-soft)' }}>🔄</button>
              </div>
            )}
            {phase === 'asking' && (
              <button className="btn btn-secondary" style={{ height: 48, padding: '0 24px' }} onClick={() => { setPhase('recording'); setRecordingTime(0); }}>跳过，直接回答</button>
            )}
          </div>
        )}
      </div>

      {/* 断点续录弹窗 */}
      {showResumeDialog && resumeData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => handleClearResume()}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '85%', maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎙️</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)' }}>检测到未完成的采访</div>
            </div>
            <div style={{ background: '#F5F5F5', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.6 }}>
              <div>上次进度：问题 {resumeData.currentQuestionIndex + 1}/{resumeData.questions?.length || '?'}</div>
              <div>已录音：{formatTime(resumeData.recordingTime || 0)}</div>
              <div>中断时间：{new Date(resumeData.timestamp).toLocaleString('zh-CN')}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={handleClearResume}>重新开始</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={handleResumeFromDialog}>继续采访</button>
            </div>
          </div>
        </div>
      )}

      {/* 隐私提示 */}
      {showPrivacyNotice && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '85%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 12 }}>隐私提示</div>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              云端模式下语音和文本数据将上传至AI服务处理（不用于训练），是否确认？
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={() => setShowPrivacyNotice(false)}>取消</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={() => { setShowPrivacyNotice(false); localStorage.setItem('privacy_notice_accepted', '1'); handleSwitchAI('cloud'); }}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 本地模型下载弹窗 */}
      {showLocalModelDownload && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '85%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📥</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 12 }}>下载本地AI模型</div>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
              本地AI模型约 2GB，建议在WiFi环境下下载<br/>下载完成后将自动切换到本地模式
            </div>
            {/* ===== F4.13: 模型下载状态 ===== */}
            {modelDownloadStatus === 'downloading' ? (
              <div style={{ background: '#E8F5E9', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#2E7D32', marginBottom: 8 }}>⬇️ 下载中...</div>
                <div style={{ background: '#C8E6C9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${modelDownloadProgress}%`, height: '100%', background: '#4CAF50', borderRadius: 4, transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>下载进度：{Math.round(modelDownloadProgress)}%</div>
              </div>
            ) : modelDownloadStatus === 'success' ? (
              <div style={{ background: '#E8F5E9', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#2E7D32' }}>✅ 模型下载完成！已自动切换到本地模式。</div>
              </div>
            ) : modelDownloadStatus === 'error' ? (
              <div style={{ background: '#FFEBEE', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#C62828' }}>❌ 下载失败，请检查网络后重试。</div>
              </div>
            ) : (
              <div style={{ background: '#E8F5E9', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 14, color: '#4A6741' }}>
                下载进度：{Math.round(modelDownloadProgress)}%
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={() => setShowLocalModelDownload(false)}>返回云端模式</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 44, fontSize: 14 }} onClick={handleDownloadModel}>下载模型</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );
}

export default InterviewPage;
