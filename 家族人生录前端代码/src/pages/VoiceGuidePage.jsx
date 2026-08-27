// ===== F9.4 中老年UI适配 - 语音引导页面 =====
import React, { useState, useEffect, useRef } from 'react';
import { useFamily } from '../context/FamilyContext';

function VoiceGuidePage() {
  const { currentSpaceId } = useFamily();
  const [guideStep, setGuideStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [guideMode, setGuideMode] = useState('auto'); // auto / manual
  const [fontSize, setFontSize] = useState(18); // 基础字体大小
  const [highContrast, setHighContrast] = useState(false);
  const audioRef = useRef(null);

  // 语音引导步骤
  const guideSteps = [
    {
      title: '欢迎使用家族人生录',
      text: '欢迎来到家族人生录！这是一个记录家族故事、传承家族文化的应用。我会一步步引导您使用。',
      icon: '👋',
    },
    {
      title: '认识家族空间',
      text: '家族空间是您和家人共享的数据空间。在这里您可以创建人物档案、建立亲属关系、记录家族大事。',
      icon: '🏠',
    },
    {
      title: '创建人物档案',
      text: '点击"人物档案"按钮，可以添加家族成员的信息。包括姓名、性别、出生日期等基本信息。',
      icon: '👤',
    },
    {
      title: '建立亲属关系',
      text: '在"族谱"页面，您可以建立家族成员之间的亲属关系，系统会自动生成族谱图谱。',
      icon: '🌳',
    },
    {
      title: 'AI智能采访',
      text: '点击"AI采访"按钮，AI会像记者一样向您或家人提问，帮助您记录人生故事。全程语音互动，非常简单。',
      icon: '🎙️',
    },
    {
      title: '生成人生之书',
      text: '采访完成后，系统会自动生成一本精美的人生之书，还可以导出为PDF分享给家人。',
      icon: '📖',
    },
    {
      title: '完成',
      text: '以上就是家族人生录的主要功能。您可以随时回来查看这个引导。祝您使用愉快！',
      icon: '✅',
    },
  ];

  // 语音朗读
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.85; // 语速稍慢，适合中老年人
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      audioRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 自动引导
  useEffect(() => {
    if (guideMode === 'auto' && guideSteps[guideStep]) {
      const step = guideSteps[guideStep];
      speakText(step.text);
    }
  }, [guideStep, guideMode]);

  // 下一步
  const nextStep = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep(guideStep + 1);
    }
  };

  // 上一步
  const prevStep = () => {
    if (guideStep > 0) {
      setGuideStep(guideStep - 1);
    }
  };

  // 停止语音
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  const current = guideSteps[guideStep];

  return (
    <div className={`voice-guide-page ${highContrast ? 'high-contrast' : ''}`}
         style={{ fontSize: `${fontSize}px`, minHeight: '100vh', background: highContrast ? '#000' : '#f5f5f5', color: highContrast ? '#fff' : '#333' }}>
      <div className="voice-guide-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* 顶部工具栏 */}
        <div className="guide-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                    style={{ fontSize: '24px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#e0e0e0', cursor: 'pointer' }}>
              A-
            </button>
            <span style={{ fontSize: '16px', color: '#666' }}>字体: {fontSize}px</span>
            <button onClick={() => setFontSize(Math.min(32, fontSize + 2))}
                    style={{ fontSize: '24px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: '#e0e0e0', cursor: 'pointer' }}>
              A+
            </button>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => setHighContrast(!highContrast)}
                    style={{ fontSize: '16px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: highContrast ? '#ff9800' : '#e0e0e0', cursor: 'pointer', color: highContrast ? '#fff' : '#333' }}>
              {highContrast ? '高对比度 ✅' : '高对比度'}
            </button>
            <button onClick={() => setGuideMode(guideMode === 'auto' ? 'manual' : 'auto')}
                    style={{ fontSize: '16px', padding: '8px 16px', border: 'none', borderRadius: '8px', background: guideMode === 'auto' ? '#4caf50' : '#e0e0e0', cursor: 'pointer', color: guideMode === 'auto' ? '#fff' : '#333' }}>
              {guideMode === 'auto' ? '自动引导 ✅' : '手动引导'}
            </button>
          </div>
        </div>

        {/* 进度指示 */}
        <div className="guide-progress" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
          {guideSteps.map((_, i) => (
            <div key={i} onClick={() => setGuideStep(i)}
                 style={{ width: '12px', height: '12px', borderRadius: '50%', background: i === guideStep ? '#4caf50' : i < guideStep ? '#81c784' : '#e0e0e0', cursor: 'pointer', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* 当前步骤内容 */}
        <div className="guide-step-content" style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>{current.icon}</div>
          <h2 style={{ fontSize: '28px', marginBottom: '15px', color: '#333' }}>{current.title}</h2>
          <p style={{ fontSize: `${fontSize + 4}px`, lineHeight: '1.8', color: '#555', marginBottom: '20px' }}>{current.text}</p>

          {/* 语音控制 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '20px' }}>
            <button onClick={stopSpeaking} disabled={!isPlaying}
                    style={{ fontSize: '20px', padding: '12px 30px', border: 'none', borderRadius: '25px', background: isPlaying ? '#f44336' : '#e0e0e0', color: isPlaying ? '#fff' : '#666', cursor: isPlaying ? 'pointer' : 'default' }}>
              ⏹ 停止
            </button>
            <button onClick={() => speakText(current.text)}
                    style={{ fontSize: '20px', padding: '12px 30px', border: 'none', borderRadius: '25px', background: '#4caf50', color: '#fff', cursor: 'pointer' }}>
              🔊 重听
            </button>
          </div>

          {/* 导航按钮 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button onClick={prevStep} disabled={guideStep === 0}
                    style={{ fontSize: '20px', padding: '15px 40px', border: 'none', borderRadius: '25px', background: guideStep === 0 ? '#e0e0e0' : '#2196f3', color: guideStep === 0 ? '#999' : '#fff', cursor: guideStep === 0 ? 'default' : 'pointer' }}>
              ← 上一步
            </button>
            <button onClick={nextStep}
                    style={{ fontSize: '20px', padding: '15px 40px', border: 'none', borderRadius: '25px', background: guideStep === guideSteps.length - 1 ? '#4caf50' : '#2196f3', color: '#fff', cursor: 'pointer' }}>
              {guideStep === guideSteps.length - 1 ? '✅ 完成' : '下一步 →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceGuidePage;
