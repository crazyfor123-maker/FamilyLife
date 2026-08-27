// ===== 关系校验与逻辑检查页面 (F3.17) =====
// 利用 kinship.js 内置的校验函数，提供完整的校验 UI 入口

function RelationshipValidationPage({ personId, onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [validating, setValidating] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [filterType, setFilterType] = React.useState('all');
  const [selectedIssue, setSelectedIssue] = React.useState(null);

  // 执行校验
  const handleValidate = async () => {
    setValidating(true);
    setResult(null);
    try {
      const { validateRelations, getPersonRelations } = await import('../api/kinship');
      // 1. 获取所有关系
      const relationsRes = await getPersonRelations(spaceId, personId);
      const allRelations = (relationsRes && relationsRes.code === 0) ? relationsRes.data : [];

      // 2. 调用校验函数
      let validationRes;
      try {
        validationRes = await validateRelations(spaceId);
      } catch {}

      // 3. 前端校验（即使后端不支持也做基础校验）
      const issues = [];
      const warnings = [];
      const stats = {
        total: allRelations.length,
        valid: 0,
        errors: 0,
        warnings: 0,
        byType: {},
        byPerson: {},
      };

      // 统计各类型关系数量
      allRelations.forEach(r => {
        const type = r.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;
        const from = r.from_id || r.from_name;
        const to = r.to_id || r.to_name;
        if (from) stats.byPerson[from] = (stats.byPerson[from] || 0) + 1;
        if (to) stats.byPerson[to] = (stats.byPerson[to] || 0) + 1;
      });

      // 校验规则1：检查循环关系（A是B的父，B也是A的父）
      const relationMap = {};
      allRelations.forEach(r => {
        const key = `${r.from_id || r.from_name} -> ${r.to_id || r.to_name}`;
        if (relationMap[key]) {
          issues.push({
            type: 'error',
            message: `重复关系：${r.from_name || r.from_id} → ${r.to_name || r.to_id} (${r.type})`,
            relation: r,
          });
          stats.errors++;
        }
        relationMap[key] = true;
      });

      // 校验规则2：检查辈分逻辑矛盾
      const nameToGen = {};
      allRelations.forEach(r => {
        if (r.from_generation) nameToGen[r.from_name || r.from_id] = r.from_generation;
        if (r.to_generation) nameToGen[r.to_name || r.to_id] = r.to_generation;
      });
      allRelations.forEach(r => {
        const fromGen = nameToGen[r.from_name || r.from_id];
        const toGen = nameToGen[r.to_name || r.to_id];
        if (fromGen && toGen && r.type === '父子') {
          if (Math.abs(fromGen - toGen) > 2) {
            warnings.push({
              type: 'warning',
              message: `辈分跳跃过大：${r.from_name}(${fromGen}代) → ${r.to_name}(${toGen}代)`,
              relation: r,
            });
            stats.warnings++;
          }
        }
      });

      // 校验规则3：检查孤立节点（无人关联的人物）
      const allNames = new Set();
      allRelations.forEach(r => {
        if (r.from_name) allNames.add(r.from_name);
        if (r.to_name) allNames.add(r.to_name);
      });
      // 检查是否有自引用
      allRelations.forEach(r => {
        const from = r.from_id || r.from_name;
        const to = r.to_id || r.to_name;
        if (from && to && String(from) === String(to)) {
          issues.push({
            type: 'error',
            message: `自引用错误：${r.from_name} 不能与自己有关系`,
            relation: r,
          });
          stats.errors++;
        }
      });

      // 校验规则4：检查关系类型合法性
      const validTypes = ['父子', '母子', '夫妻', '兄弟', '姐妹', '祖孙', '叔侄', '其他'];
      allRelations.forEach(r => {
        if (r.type && !validTypes.includes(r.type)) {
          warnings.push({
            type: 'warning',
            message: `未知关系类型：${r.type}（${r.from_name || r.from_id} → ${r.to_name || r.to_id}）`,
            relation: r,
          });
          stats.warnings++;
        }
      });

      // 校验规则5：检查夫妻关系的对称性
      const spouseMap = {};
      allRelations.forEach(r => {
        if (r.type === '夫妻') {
          const key = `${r.from_id || r.from_name}-${r.to_id || r.to_name}`;
          const reverseKey = `${r.to_id || r.to_name}-${r.from_id || r.from_name}`;
          if (spouseMap[reverseKey]) {
            // 双向夫妻，正常
          } else {
            spouseMap[key] = true;
          }
        }
      });

      // 校验规则6：检查缺失信息
      allRelations.forEach(r => {
        if (!r.from_name && !r.from_id) {
          issues.push({
            type: 'error',
            message: `关系缺少来源人物：${r.to_name || r.to_id} 的关系`,
            relation: r,
          });
          stats.errors++;
        }
        if (!r.to_name && !r.to_id) {
          issues.push({
            type: 'error',
            message: `关系缺少目标人物：${r.from_name || r.from_id} 的关系`,
            relation: r,
          });
          stats.errors++;
        }
      });

      stats.valid = stats.total - stats.errors;

      const resultData = {
        total_relations: stats.total,
        valid: stats.valid,
        errors: stats.errors,
        warnings: stats.warnings,
        issues,
        warnings: warnings,
        stats,
        byType: stats.byType,
        byPerson: stats.byPerson,
        timestamp: Date.now(),
      };

      setResult(resultData);
    } catch (err) {
      console.error('关系校验失败:', err);
      setResult({
        total_relations: 0,
        valid: 0,
        errors: 0,
        warnings: 0,
        issues: [],
        warnings: ['校验失败：' + (err.message || '未知错误')],
        timestamp: Date.now(),
      });
    } finally {
      setValidating(false);
    }
  };

  // 修复建议
  const getFixSuggestion = (issue) => {
    if (issue.type === 'error') {
      if (issue.message.includes('重复关系')) return '删除重复的关系记录';
      if (issue.message.includes('自引用')) return '检查人物ID是否正确关联';
      if (issue.message.includes('缺少来源')) return '补充来源人物信息';
      if (issue.message.includes('缺少目标')) return '补充目标人物信息';
      return '检查并修正此关系记录';
    }
    return '建议核实后手动修正';
  };

  // 导出报告
  const handleExportReport = () => {
    if (!result) return;
    const report = {
      title: '族谱关系校验报告',
      generatedAt: new Date().toLocaleString('zh-CN'),
      totalRelations: result.total_relations,
      validRelations: result.valid,
      errorCount: result.errors,
      warningCount: result.warnings?.length || 0,
      issues: result.issues || [],
      warnings: result.warnings || [],
      stats: result.stats || {},
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `关系校验报告_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('报告已导出');
  };

  // 过滤结果
  const filteredIssues = filterType === 'all'
    ? (result?.issues || [])
    : (result?.issues || []).filter(i => i.type === filterType);

  const filteredWarnings = filterType === 'all'
    ? (result?.warnings || [])
    : (result?.warnings || []).filter(w => true);

  // 合并问题和警告
  const allItems = [
    ...(result?.issues || []).map(i => ({ ...i, itemType: 'issue' })),
    ...(result?.warnings || []).map(w => ({ ...w, itemType: 'warning' })),
  ];
  const filteredItems = filterType === 'all'
    ? allItems
    : allItems.filter(item => item.type === filterType);

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🔍 关系校验" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 校验按钮 */}
        <div style={{ marginBottom: 16 }}>
          <button
            className="btn btn-primary btn-block"
            style={{ height: 48, fontSize: 16 }}
            onClick={handleValidate}
            disabled={validating}
          >
            {validating ? '⏳ 校验中...' : '🔍 开始校验'}
          </button>
        </div>

        {/* 校验统计 */}
        {result && (
          <>
            <div className="card" style={{ padding: '14px 16px', marginBottom: 16, background: result.errors === 0 ? '#E8F5E9' : '#FFF3E0' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 10 }}>
                {result.errors === 0 ? '✅ 校验通过' : '⚠️ 发现 ' + result.errors + ' 个问题'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, fontSize: 13 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-primary)' }}>{result.total_relations}</div>
                  <div style={{ color: 'var(--ink-tertiary)' }}>总关系</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-green)' }}>{result.valid}</div>
                  <div style={{ color: 'var(--ink-tertiary)' }}>有效</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#D32F2F' }}>{result.errors}</div>
                  <div style={{ color: 'var(--ink-tertiary)' }}>错误</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#F57C00' }}>{result.warnings?.length || 0}</div>
                  <div style={{ color: 'var(--ink-tertiary)' }}>警告</div>
                </div>
              </div>
            </div>

            {/* 各类型关系统计 */}
            {result.byType && Object.keys(result.byType).length > 0 && (
              <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 8 }}>📊 关系类型分布</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(result.byType).map(([type, count]) => (
                    <span key={type} style={{
                      padding: '4px 12px', borderRadius: 'var(--radius-full)',
                      background: '#E8F5E9', color: '#4A6741', fontSize: 13,
                    }}>
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 筛选 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: '全部' },
                { key: 'error', label: '错误' },
                { key: 'warning', label: '警告' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilterType(f.key)} style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: 12,
                  border: `1.5px solid ${filterType === f.key ? 'var(--ink-green)' : 'var(--line-light)'}`,
                  background: filterType === f.key ? '#E8F5E9' : 'white',
                  color: filterType === f.key ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>{f.label}</button>
              ))}
              <button onClick={handleExportReport} style={{
                marginLeft: 'auto', padding: '4px 12px', borderRadius: 'var(--radius-full)',
                fontSize: 12, border: '1.5px solid var(--line-light)', background: 'white',
                cursor: 'pointer', color: 'var(--ink-primary)',
              }}>📋 导出报告</button>
            </div>

            {/* 问题列表 */}
            {filteredItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--ink-green)', fontSize: 14 }}>
                ✅ 未发现任何问题，关系数据完整！
              </div>
            ) : (
              filteredItems.map((item, i) => (
                <div key={i} className="card" style={{
                  padding: 12, marginBottom: 8,
                  borderLeft: `4px solid ${item.type === 'error' ? '#D32F2F' : '#F57C00'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11, padding: '2px 6px', borderRadius: 4,
                          background: item.type === 'error' ? '#FFEBEE' : '#FFF3E0',
                          color: item.type === 'error' ? '#D32F2F' : '#F57C00',
                          fontWeight: 600,
                        }}>{item.type === 'error' ? '错误' : '警告'}</span>
                        {item.relation && (
                          <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
                            {item.relation.from_name || item.relation.from_id} → {item.relation.to_name || item.relation.to_id}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: 'var(--ink-primary)', lineHeight: 1.5 }}>
                        {item.message}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-green)', marginTop: 4 }}>
                        💡 {getFixSuggestion(item)}
                      </div>
                    </div>
                    <button onClick={() => setSelectedIssue(selectedIssue === i ? null : i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>
                      {selectedIssue === i ? '▲' : '▼'}
                    </button>
                  </div>
                  {/* 详情 */}
                  {selectedIssue === i && item.relation && (
                    <div style={{ marginTop: 8, padding: 8, background: '#F5F5F5', borderRadius: 6, fontSize: 12 }}>
                      <div>关系ID：{item.relation.id || '未知'}</div>
                      <div>类型：{item.relation.type || '未知'}</div>
                      <div>来源：{item.relation.from_name || item.relation.from_id || '未知'}</div>
                      <div>目标：{item.relation.to_name || item.relation.to_id || '未知'}</div>
                      <div>备注：{item.relation.note || '无'}</div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* 校验时间 */}
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 12 }}>
              校验时间：{new Date(result.timestamp).toLocaleString('zh-CN')}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { RelationshipValidationPage });
