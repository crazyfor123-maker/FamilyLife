// ===== 备份恢复页 =====
function RestorePage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [restoring, setRestoring] = React.useState(false);
  const [progress, setProgress] = React.useState(null);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importMode, setImportMode] = React.useState('full'); // full / selective
  const [fileInputRef, setFileInputRef] = React.useState(null);

  React.useEffect(() => {
    loadHistory();
  }, [spaceId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { getBackupHistory } = await import('../api/storage');
      const res = await getBackupHistory(spaceId);
      if (res.code === 0) setHistory(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  // 从备份恢复
  const handleRestore = async (backupId) => {
    if (!confirm('⚠️ 确定从此备份恢复？当前数据将被覆盖！')) return;
    setRestoring(true);
    setProgress({ step: 'fetching', percent: 0, label: '正在获取备份数据...' });

    try {
      // 1. 获取备份数据
      setProgress({ step: 'fetching', percent: 20, label: '正在获取备份数据...' });
      const { downloadBackup } = await import('../api/storage');
      const res = await downloadBackup(spaceId, backupId);

      if (res.code !== 0) {
        showToast('获取备份失败: ' + (res.message || ''));
        setRestoring(false);
        setProgress(null);
        return;
      }

      const backupData = res.data?.backup_data;
      if (!backupData || !backupData.version) {
        showToast('备份数据格式无效');
        setRestoring(false);
        setProgress(null);
        return;
      }

      // 2. 确认恢复范围
      const scope = backupData.scope || 'all';
      const summary = `
        此备份包含:
        - 人物档案: ${backupData.people?.length || 0} 条
        - 亲属关系: ${backupData.kinships?.length || 0} 条
        - 大事记: ${backupData.events?.length || 0} 条
        - 家族故事: ${backupData.stories?.length || 0} 条
        - 留言: ${backupData.messages?.length || 0} 条

        确定恢复这些数据？
      `.trim();

      if (!confirm(summary)) {
        setRestoring(false);
        setProgress(null);
        return;
      }

      // 3. 执行恢复
      setProgress({ step: 'restoring', percent: 40, label: '正在恢复数据...' });
      const { restoreBackup } = await import('../api/storage');
      const restoreRes = await restoreBackup(spaceId, backupData, scope);

      if (restoreRes.code === 0) {
        const result = restoreRes.data || {};
        setProgress({ step: 'done', percent: 100, label: '恢复完成！' });

        let summaryText = '✅ 恢复成功！\n';
        if (result.restored) {
          Object.entries(result.restored).forEach(([k, v]) => {
            summaryText += `${k}: ${v} 条\n`;
          });
        }
        if (result.errors && result.errors.length > 0) {
          summaryText += `\n⚠️ ${result.errors.length} 条记录恢复失败`;
        }

        setTimeout(() => {
          alert(summaryText);
          window.location.reload();
        }, 1000);
      } else {
        showToast('恢复失败: ' + (restoreRes.message || ''));
      }
    } catch (err) {
      showToast('恢复失败: ' + (err.message || '网络异常'));
    } finally {
      setRestoring(false);
      setProgress(null);
    }
  };

  // 文件导入
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowImportModal(false);
    setRestoring(true);
    setProgress({ step: 'parsing', percent: 0, label: '正在解析备份文件...' });

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      if (!backupData.version) {
        showToast('文件格式无效，请选择JSON备份文件');
        setRestoring(false);
        setProgress(null);
        return;
      }

      setProgress({ step: 'restoring', percent: 40, label: '正在恢复数据...' });

      // 确认恢复
      const summary = `
        从文件恢复: ${file.name}
        - 人物档案: ${backupData.people?.length || 0} 条
        - 亲属关系: ${backupData.kinships?.length || 0} 条
        - 大事记: ${backupData.events?.length || 0} 条
        - 家族故事: ${backupData.stories?.length || 0} 条
        - 留言: ${backupData.messages?.length || 0} 条

        确定恢复？当前数据将被覆盖！
      `.trim();

      if (!confirm(summary)) {
        setRestoring(false);
        setProgress(null);
        return;
      }

      const { restoreBackup } = await import('../api/storage');
      const restoreRes = await restoreBackup(spaceId, backupData, backupData.scope || 'full');

      if (restoreRes.code === 0) {
        setProgress({ step: 'done', percent: 100, label: '恢复完成！' });
        setTimeout(() => {
          alert('✅ 数据恢复成功！页面将自动刷新');
          window.location.reload();
        }, 1000);
      } else {
        showToast('恢复失败: ' + (restoreRes.message || ''));
      }
    } catch (err) {
      showToast('文件解析失败: ' + (err.message || ''));
      setRestoring(false);
      setProgress(null);
    }
  };

  const progressLabel = (step) => {
    if (step === 'fetching') return '📥 获取备份数据';
    if (step === 'restoring') return '🔄 正在恢复数据';
    if (step === 'parsing') return '📂 解析备份文件';
    if (step === 'done') return '✅ 恢复完成';
    return '⏳ 处理中';
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="恢复备份" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 恢复说明 */}
        <div className="card-paper" style={{ padding: '20px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔄</div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', margin: 0 }}>
            从备份文件恢复家族数据<br/>
            <span style={{ color: '#D32F2F', fontSize: 13 }}>⚠️ 恢复将覆盖当前所有数据</span>
          </p>
        </div>

        {/* 导入备份文件 */}
        <div style={{ marginBottom: 16 }}>
          <button className="btn btn-block" style={{ height: 48, fontSize: 15, background: '#E3F2FD', color: '#1565C0', border: '1px solid #BBDEFB' }}
            onClick={() => setShowImportModal(true)}>
            📂 导入备份文件（JSON/ZIP）
          </button>
        </div>

        {/* 从历史备份恢复 */}
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>📁 从历史备份恢复</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            暂无可恢复的备份<br/>
            <span style={{ fontSize: 12 }}>请先前往"备份与恢复"创建备份</span>
          </div>
        ) : (
          history.filter(b => b.status === 'completed').map((b, i) => (
            <div key={b.id || i} className="card" style={{ padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-primary)' }}>{b.file_name || '备份文件'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{b.created_at || ''}</div>
                </div>
                <button className="btn btn-primary" style={{ height: 36, padding: '0 12px', fontSize: 13 }}
                  onClick={() => handleRestore(b.id)}>恢复</button>
              </div>
            </div>
          ))
        )}

        {/* 恢复中进度 */}
        {restoring && progress && (
          <div className="card" style={{ padding: 20, marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{progress.step === 'done' ? '✅' : '⏳'}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>{progressLabel(progress?.step)}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 12 }}>{progress?.label}</div>
            <div style={{ height: 6, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress?.percent || 0}%`, background: progress.step === 'done' ? 'var(--ink-green)' : '#1565C0', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>{progress?.percent || 0}%</div>
          </div>
        )}
      </div>

      {/* 导入确认弹窗 */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowImportModal(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>导入备份文件</span>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{
              border: '2px dashed var(--line-light)', borderRadius: 12, padding: 30, textAlign: 'center', marginBottom: 16,
              background: '#FAFAFA', cursor: 'pointer',
            }}
              onClick={() => fileInputRef?.click()}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>点击选择 JSON 备份文件</div>
              <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>支持 .json / .zip 格式</div>
            </div>

            <input ref={setFileInputRef} type="file" accept=".json,.zip" style={{ display: 'none' }}
              onChange={handleFileImport} />

            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', lineHeight: 1.6 }}>
              💡 备份文件来自：设置 → 备份与恢复 → 立即备份<br/>
              或从其他设备导入的 .json 备份文件
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RestorePage });
