// ===== F2.1 本地存储管理页 =====
// 展示本地存储容量统计、按类型查看/清理

import React, { useState, useEffect } from 'react';

function StorageManagePage({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearingType, setClearingType] = useState(null);
  const [confirmClear, setConfirmClear] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { getStorageStats } = await import('../services/localStorage');
      const s = await getStorageStats();
      setStats(s);
    } catch (err) {
      console.error('加载存储统计失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const handleClear = async (type) => {
    try {
      const { clearByType, setCurrentUser } = await import('../services/localStorage');
      const userId = localStorage.getItem('family_user_id') || 'anonymous';
      setCurrentUser(userId);
      const result = await clearByType(type, userId);
      showToast(`已清理 ${result.cleaned} 条记录`);
      setConfirmClear(null);
      loadStats();
    } catch (err) {
      showToast(`清理失败: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ 确定要清除所有本地数据吗？\n\n此操作不可恢复，清除后将无法离线查看任何数据。')) return;
    try {
      const { clearAll } = await import('../services/localStorage');
      await clearAll();
      showToast('所有本地数据已清除');
      onBack();
    } catch (err) {
      showToast(`清除失败: ${err.message}`);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes < 0) return '未知';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const typeIcons = {
    person: '👤',
    interview: '🎙️',
    book: '📖',
    audio: '🎵',
    asr: '📝',
    photo: '📷',
    photo_meta: '🏷️',
    encrypted: '🔒',
    system: '⚙️',
  };

  const typeColors = {
    person: '#4A6741',
    interview: '#1565C0',
    book: '#F57C00',
    audio: '#C2185B',
    asr: '#7B1FA2',
    photo: '#00897B',
    photo_meta: '#5D4037',
    encrypted: '#455A64',
    system: '#9E9E9E',
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FBF8F2' }}>
      <StatusBar />
      <PageHeader title="💾 本地存储管理" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            {/* 总览卡片 */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 12 }}>📊 存储概览</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>总记录数</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-green)' }}>{stats?.totalRecords || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>可用空间</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-primary)' }}>
                    {stats?.diskUsage?.available > 0 ? formatBytes(stats.diskUsage.available) : '未知'}
                  </div>
                </div>
              </div>
              {stats?.diskUsage?.available >= 0 && stats.diskUsage.available < 100 * 1024 * 1024 && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: '#FFF3E0', borderRadius: 8, fontSize: 13, color: '#E65100' }}>
                  ⚠️ 存储空间不足，建议清理数据
                </div>
              )}
            </div>

            {/* 按类型统计 */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 12 }}>📂 分类存储</div>
              {stats?.byType && Object.entries(stats.byType).map(([type, info]) => (
                <div key={type} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: '1px solid var(--line-light)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{typeIcons[type] || '📄'}</span>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--ink-primary)' }}>{info.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{info.count} 条记录</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmClear(type)}
                    style={{
                      padding: '4px 12px', fontSize: 12, border: '1px solid #EF5350',
                      borderRadius: 6, background: 'white', color: '#EF5350', cursor: 'pointer',
                    }}
                  >
                    清理
                  </button>
                </div>
              ))}
            </div>

            {/* 清除所有数据 */}
            <button
              onClick={handleClearAll}
              style={{
                width: '100%', height: 48, fontSize: 15, border: 'none', borderRadius: 8,
                background: '#EF5350', color: 'white', cursor: 'pointer', fontWeight: 500,
              }}
            >
              🗑️ 清除所有本地数据
            </button>

            <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', textAlign: 'center', marginTop: 12, lineHeight: 1.6 }}>
              清除后数据不可恢复<br/>建议先通过「备份与恢复」导出备份
            </div>
          </>
        )}
      </div>

      {/* 确认清理弹窗 */}
      {confirmClear && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setConfirmClear(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '24px 20px', width: '85%', maxWidth: 360 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🗑️</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)' }}>确认清理</div>
            </div>
            <div style={{ background: '#FFF3E0', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 14, color: '#E65100', lineHeight: 1.6 }}>
              确定要清理「{stats?.byType?.[confirmClear]?.label || confirmClear}」数据吗？<br/>此操作不可恢复。
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 44, fontSize: 14 }}
                onClick={() => setConfirmClear(null)}>取消</button>
              <button className="btn" style={{ flex: 1, height: 44, fontSize: 14, background: '#EF5350', color: 'white' }}
                onClick={() => handleClear(confirmClear)}>确认清理</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StorageManagePage;
