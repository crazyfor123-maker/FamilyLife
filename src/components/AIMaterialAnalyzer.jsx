// ===== AI素材分析组件 =====
import React, { useState, useCallback } from 'react';
import { analyzeMaterial } from '../api/ai';

/**
 * AI素材分析组件
 * 分析采访素材，提供洞察和追问建议
 */
function AIMaterialAnalyzer({ sessionId, materials }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await analyzeMaterial({ session_id: sessionId });
      if (res.code === 0 && res.data) {
        setAnalysis(res.data);
      }
    } catch (err) {
      setError('分析失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // 情感色彩标签
  const sentimentLabels = {
    positive: { text: '😊 正面', color: '#28a745' },
    negative: { text: '😢 负面', color: '#dc3545' },
    neutral: { text: '😐 中性', color: '#6c757d' },
    complex: { text: '🤔 复杂', color: '#ffc107' },
  };

  const sentiment = sentimentLabels[analysis?.sentiment] || sentimentLabels.neutral;

  return (
    <div style={{
      background: '#fafafa',
      borderRadius: 12,
      padding: 16,
      margin: '12px 0',
      border: '1px solid #e9ecef',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>
          🧠 AI素材分析
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            padding: '6px 16px',
            background: loading ? '#6c757d' : '#4A6741',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          {loading ? '分析中...' : '🔄 分析素材'}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 20, color: '#4A6741' }}>
          AI正在分析素材...
        </div>
      )}

      {analysis && !loading && (
        <div>
          {/* 情感分析 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>情感色彩</div>
            <span style={{
              fontSize: 14,
              color: sentiment.color,
              fontWeight: 'bold',
            }}>
              {sentiment.text}
            </span>
          </div>

          {/* 关键词 */}
          {analysis.keywords && analysis.keywords.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>关键词</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {analysis.keywords.map((kw, i) => (
                  <span key={i} style={{
                    background: '#e8f5e9',
                    color: '#4A6741',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontSize: 12,
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 洞察 */}
          {analysis.insights && analysis.insights.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>洞察</div>
              {analysis.insights.map((insight, i) => (
                <div key={i} style={{
                  fontSize: 13,
                  padding: '4px 0',
                  paddingLeft: 12,
                  borderLeft: '2px solid #4A6741',
                  color: '#333',
                }}>
                  {insight}
                </div>
              ))}
            </div>
          )}

          {/* 推荐追问 */}
          {analysis.suggested_questions && analysis.suggested_questions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>推荐追问</div>
              {analysis.suggested_questions.map((q, i) => (
                <div key={i} style={{
                  fontSize: 13,
                  padding: '4px 0',
                  paddingLeft: 12,
                  borderLeft: '2px solid #ffc107',
                  color: '#333',
                }}>
                  {q}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fff3cd',
          color: '#856404',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 13,
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

export default AIMaterialAnalyzer;
