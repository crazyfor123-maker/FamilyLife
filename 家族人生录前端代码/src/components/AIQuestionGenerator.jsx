// ===== AI动态追问组件 =====
import React, { useState, useEffect } from 'react';
import { generateQuestion, generateFollowup } from '../api/ai';

/**
 * AI动态追问组件
 * 显示AI生成的问题和追问建议
 */
function AIQuestionGenerator({ sessionId, outline, currentQuestionIndex, onQuestionGenerated }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取AI生成的下一个问题
  const fetchQuestion = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await generateQuestion({
        session_id: sessionId,
        conversation_history: [], // TODO: 传入对话历史
        outline,
        current_question_index: currentQuestionIndex,
      });

      if (res.code === 0 && res.data) {
        setCurrentQuestion(res.data);
        if (onQuestionGenerated) onQuestionGenerated(res.data);
      }
    } catch (err) {
      setError('AI生成问题失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取追问建议
  const fetchFollowUps = async (answerText) => {
    if (!answerText) return;
    try {
      const res = await generateFollowup({
        session_id: sessionId,
        answer_text: answerText,
        context: {},
      });

      if (res.code === 0 && res.data?.follow_up_questions) {
        setFollowUps(res.data.follow_up_questions);
      }
    } catch (err) {
      console.error('获取追问建议失败:', err);
    }
  };

  // 采纳追问
  const acceptFollowUp = (question) => {
    if (onQuestionGenerated) onQuestionGenerated({
      question: question.question,
      source: 'ai_followup',
      confidence: 0.8,
    });
    setFollowUps([]);
  };

  return (
    <div style={{
      background: '#f0f7f0',
      borderRadius: 12,
      padding: 16,
      margin: '12px 0',
      border: '1px solid #d4e8d4',
    }}>
      {/* AI生成问题 */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#4A6741' }}>
          🤖 AI正在思考问题...
        </div>
      )}

      {currentQuestion && !loading && (
        <div>
          <div style={{
            fontSize: 13,
            color: '#4A6741',
            fontWeight: 'bold',
            marginBottom: 8,
          }}>
            🤖 AI建议的问题
          </div>
          <div style={{
            background: 'white',
            padding: '12px 16px',
            borderRadius: 8,
            fontSize: 15,
            lineHeight: 1.6,
            borderLeft: '3px solid #4A6741',
          }}>
            {currentQuestion.question}
          </div>
          {currentQuestion.confidence && (
            <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
              置信度: {Math.round(currentQuestion.confidence * 100)}% | 来源: {currentQuestion.source === 'outline' ? '大纲预设' : 'AI生成'}
            </div>
          )}
        </div>
      )}

      {/* 追问建议 */}
      {followUps.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            fontSize: 13,
            color: '#6c757d',
            marginBottom: 8,
          }}>
            💡 追问建议：
          </div>
          {followUps.map((fu, i) => (
            <div
              key={i}
              onClick={() => acceptFollowUp(fu)}
              style={{
                background: 'white',
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 6,
                cursor: 'pointer',
                border: '1px solid #e9ecef',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => e.target.style.borderColor = '#4A6741'}
              onMouseLeave={(e) => e.target.style.borderColor = '#e9ecef'}
            >
              <div style={{ fontSize: 14, marginBottom: 4 }}>{fu.question}</div>
              <div style={{ fontSize: 11, color: '#6c757d' }}>
                {fu.reason} · 优先级: {fu.priority === 'high' ? '⭐高' : '普通'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 13,
          marginTop: 8,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 重新生成按钮 */}
      {!loading && currentQuestion && (
        <button
          onClick={fetchQuestion}
          style={{
            marginTop: 8,
            padding: '6px 16px',
            background: 'none',
            border: '1px solid #4A6741',
            color: '#4A6741',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          🔄 重新生成问题
        </button>
      )}
    </div>
  );
}

export default AIQuestionGenerator;
