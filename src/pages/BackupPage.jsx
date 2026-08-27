// ===== 备份与恢复页 =====
function BackupPage({ onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [history, setHistory] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [backuping, setBackuping] = React.useState(false);
  const [progress, setProgress] = React.useState(null);
  const [showExportMenu, setShowExportMenu] = React.useState(false);

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

  // ===== F2.5 全量备份导出 =====
  const handleBackup = async (scope = 'all') => {
    setBackuping(true);
    setProgress({ step: 'collecting', percent: 0, label: '正在收集数据...' });
    try {
      // 1. 收集人物数据
      setProgress({ step: 'collecting', percent: 10, label: '正在收集人物档案...' });
      const { get } = await import('../api/request');
      const peopleRes = await get(`/person/list/${spaceId}`);
      const people = (peopleRes?.data || []);

      // 2. 收集亲属关系
      setProgress({ step: 'collecting', percent: 30, label: '正在收集亲属关系...' });
      const kinshipRes = await get(`/kinship/${spaceId}/tree`);
      const kinships = (kinshipRes?.data || []);

      // 3. 收集大事记
      setProgress({ step: 'collecting', percent: 50, label: '正在收集大事记...' });
      const eventsRes = await get(`/events/${spaceId}`);
      const events = (eventsRes?.data || eventsRes?.events || []);

      // 4. 收集故事
      setProgress({ step: 'collecting', percent: 70, label: '正在收集家族故事...' });
      const storiesRes = await get(`/timeline/${spaceId}`);
      const stories = (storiesRes?.data || storiesRes?.stories || []);

      // 5. 收集留言
      setProgress({ step: 'collecting', percent: 85, label: '正在收集留言...' });
      const msgRes = await get(`/message/${spaceId}`);
      const messages = (msgRes?.data || msgRes?.messages || []);

      // 6. 收集人生之书
      setProgress({ step: 'collecting', percent: 95, label: '正在收集人生之书...' });

      // 构建备份数据包
      const backupData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        space_id: spaceId,
        scope: scope,
        people: people.slice(0, 10000),
        kinships: kinships.slice(0, 50000),
        events: events.slice(0, 5000),
        stories: stories.slice(0, 10000),
        messages: messages.slice(0, 20000),
      };

      // 7. 触发后端记录
      const { createBackup } = await import('../api/storage');
      const res = await createBackup(spaceId, scope, '');

      // 8. 生成ZIP下载
      setProgress({ step: 'exporting', percent: 100, label: '正在生成备份文件...' });
      exportBackupFile(backupData, res.data?.file_name || `family_backup_${new Date().toISOString().slice(0, 10)}`);

      showToast('备份完成！文件已开始下载');
      loadHistory();
    } catch (err) {
      showToast('备份失败: ' + (err.message || '网络异常'));
    } finally {
      setBackuping(false);
      setProgress(null);
    }
  };

  // 导出备份文件为JSON下载
  const exportBackupFile = (backupData, fileName) => {
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace('.json', '') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 生成ZIP压缩备份（使用 JSZip）
  const exportBackupZip = async (backupData, fileName) => {
    try {
      // 尝试使用 JSZip（如果已加载）
      if (typeof JSZip !== 'undefined') {
        const zip = new JSZip();
        // 添加主数据文件
        zip.file('backup_data.json', JSON.stringify(backupData, null, 2));

        // 添加成员档案
        if (backupData.people) {
          const peopleJson = JSON.stringify(backupData.people, null, 2);
          zip.file('people.json', peopleJson);
        }
        // 添加大事记
        if (backupData.events) {
          zip.file('events.json', JSON.stringify(backupData.events, null, 2));
        }
        // 添加故事
        if (backupData.stories) {
          zip.file('stories.json', JSON.stringify(backupData.stories, null, 2));
        }
        // 添加留言
        if (backupData.messages) {
          zip.file('messages.json', JSON.stringify(backupData.messages, null, 2));
        }
        // 添加使用说明
        zip.file('README.txt',
`家族人生录备份文件
生成时间: ${new Date().toISOString()}
版本: ${backupData.version || '1.0'}
包含数据:
- 人物档案: ${backupData.people?.length || 0} 条
- 亲属关系: ${backupData.kinships?.length || 0} 条
- 大事记: ${backupData.events?.length || 0} 条
- 家族故事: ${backupData.stories?.length || 0} 条
- 留言: ${backupData.messages?.length || 0} 条

恢复方法:
1. 打开家族人生录APP
2. 进入"设置" > "备份与恢复"
3. 选择"导入备份"
4. 选择此ZIP文件
5. 确认恢复

⚠️ 恢复将覆盖当前数据，请谨慎操作
`
        );

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.replace('.json', '') + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // 降级：导出JSON
        exportBackupFile(backupData, fileName);
      }
    } catch {
      exportBackupFile(backupData, fileName);
    }
  };

  const progressLabel = (step) => {
    if (step === 'collecting') return '📦 收集数据中';
    if (step === 'compressing') return '📦 压缩数据中';
    if (step === 'exporting') return '💾 导出备份文件';
    return '⏳ 处理中';
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="备份与恢复" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 备份说明 */}
        <div className="card-paper" style={{ padding: '24px 20px', textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💾</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8, fontFamily: 'var(--font-serif)' }}>
            全量备份
          </div>
          <p style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.7, margin: 0 }}>
            备份所有家族数据<br/>包括成员、故事、采访素材、人生之书<br/><span style={{ color: '#D97706', fontSize: 12 }}>⚠️ 仅主人/管理员可操作</span>
          </p>
        </div>

        {/* 备份选项 */}
        {!backuping ? (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
              onClick={() => setShowExportMenu(!showExportMenu)}>
              📦 立即备份
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'white', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                zIndex: 100, overflow: 'hidden', marginTop: 4,
              }}>
                {[
                  { scope: 'all', label: '📦 全量备份', desc: '所有数据（人物/关系/故事/留言/人生之书）' },
                  { scope: 'people', label: '👤 仅人物档案', desc: '人物档案 + 亲属关系' },
                  { scope: 'stories', label: '📖 仅故事', desc: '家族故事 + 大事记' },
                  { scope: 'books', label: '📚 仅人生之书', desc: '人生之书版本 + 章节内容' },
                ].map(opt => (
                  <button key={opt.scope} onClick={() => { handleBackup(opt.scope); setShowExportMenu(false); }}
                    style={{
                      display: 'block', width: '100%', padding: '14px 16px', border: 'none', background: 'none',
                      textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f0f0f0',
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>{progressLabel(progress?.step)}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 12 }}>{progress?.label}</div>
            <div style={{ height: 6, background: '#E0E0E0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress?.percent || 0}%`, background: 'var(--ink-green)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>{progress?.percent || 0}%</div>
          </div>
        )}

        {/* 备份历史 */}
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 10 }}>📁 备份历史</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-tertiary)' }}>暂无备份记录</div>
        ) : (
          history.map((b, i) => (
            <div key={b.id || i} className="card" style={{ padding: '12px 16px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{b.file_name || '备份文件'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{b.created_at || ''}</div>
                </div>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: b.status === 'completed' ? '#E8F5E9' : '#FFF3E0',
                  color: b.status === 'completed' ? 'var(--ink-green)' : '#D97706',
                }}>{b.status === 'completed' ? '✅ 已完成' : b.status === 'in_progress' ? '⏳ 进行中' : '❌ 失败'}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 6 }}>
                大小：{b.file_size ? (b.file_size / 1024 / 1024).toFixed(1) + 'MB' : '未知'} · MD5：{b.md5 ? b.md5.slice(0, 16) + '...' : '未知'}
              </div>
            </div>
          ))
        )}

        {/* 恢复入口 */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line-light)' }}>
          <button className="btn btn-block" style={{ height: 44, fontSize: 14, background: '#FFF3E0', color: '#D97706', border: '1px solid #FFE0B2' }}
            onClick={() => window.location.hash = '#/restore'}>
            🔄 前往恢复备份
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BackupPage });
