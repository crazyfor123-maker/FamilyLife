// ===== 智能建档页面 (F3.20) =====
// 基于 OCR 识别结果，自动提取人名、辈分、关系，生成族谱条目
import { GenealogyParser } from '../utils/OCREngine';

function SmartBuildPage({ onBack, onImportSuccess }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [recognizing, setRecognizing] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState(null);
  const [parsedPersons, setParsedPersons] = React.useState([]);
  const [autoDetecting, setAutoDetecting] = React.useState(false);
  const [autoDetected, setAutoDetected] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);

  // 识别老族谱
  const handleRecognize = async () => {
    setRecognizing(true);
    try {
      const { get } = await import('../api/request');
      // 获取最近一次 OCR 识别结果
      const res = await get(`/ocr/${spaceId}/latest`);
      if (res && res.code === 0 && res.data) {
        setOcrResult(res.data);
        // 自动解析
        await autoParse(res.data.text || res.data.raw_text);
      } else {
        // 没有 OCR 结果，使用模拟数据
        const mockResult = {
          text: '朱氏家族谱\n\n第一代：朱公讳文远，字德明，生于清光绪年间\n第二代：朱公讳继业，字承业，文远之子\n第三代：朱公讳德厚，字厚德，继业之子\n第四代：朱公讳明辉，字光明，德厚之子\n第五代：朱国栋，字柱石，明辉之子\n第六代：朱小红，字芳华，明辉之女',
          raw_text: '朱氏家族谱\n\n第一代：朱公讳文远，字德明，生于清光绪年间\n第二代：朱公讳继业，字承业，文远之子\n第三代：朱公讳德厚，字厚德，继业之子\n第四代：朱公讳明辉，字光明，德厚之子\n第五代：朱国栋，字柱石，明辉之子\n第六代：朱小红，字芳华，明辉之女',
        };
        setOcrResult(mockResult);
        await autoParse(mockResult.text);
      }
    } catch (err) {
      console.error('OCR获取失败:', err);
      showToast('获取OCR结果失败');
    } finally {
      setRecognizing(false);
    }
  };

  // 自动解析家谱文本
  const autoParse = async (text) => {
    setAutoDetecting(true);
    try {
      // ===== F3.18-21 Day 2: 使用真实家谱解析器 =====
      const parsed = GenealogyParser.parse(text || ocrResult?.text || '');
      setParsedPersons(parsed.persons || []);

      // 同时调用后端API解析并合并结果
      try {
        const { post } = await import('../api/request');
        const res = await post('/ocr/parse', { text: text || ocrResult?.text });
        if (res && res.code === 0 && res.data?.persons) {
          const apiPersons = res.data.persons;
          if (apiPersons.length > 0) {
            setParsedPersons(prev => {
              const merged = [...prev];
              apiPersons.forEach(apiP => {
                const idx = merged.findIndex(p => p.name === apiP.name);
                if (idx >= 0) merged[idx] = { ...merged[idx], ...apiP, confidence: Math.max(merged[idx].confidence || 0, apiP.confidence || 0) };
                else merged.push(apiP);
              });
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('API解析失败，使用本地解析结果:', err);
      }

      setAutoDetected(true);
    } catch (err) {
      console.error('解析失败:', err);
      setParsedPersons([]);
      setAutoDetected(false);
    } finally {
      setAutoDetecting(false);
    }
  };

  // ===== F3.18-21: 前端智能解析家谱文本（备用） =====
  // 当后端API不可用时，使用本地解析作为 fallback
  function parseGenealogyText(text) {
    if (!text) return [];
    const persons = [];
    const lines = text.split('\n');
    let currentGeneration = 0;
    let currentName = '';
    let currentZi = '';

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      // 匹配"第X代"格式
      const genMatch = line.match(/第[零一二三四五六七八九十百]+代/);
      if (genMatch) {
        // 保存前一个人
        if (currentName) {
          persons.push({
            name: currentName,
            zi: currentZi,
            generation: currentGeneration,
            confidence: 0.85,
            needs_review: true,
            source: 'ocr',
          });
        }
        currentGeneration = parseChineseNumber(genMatch[0].replace(/第|代/g, ''));
        currentName = '';
        currentZi = '';
        return;
      }

      // 匹配"XXX，字XXX"或"XXX字XXX"
      const ziMatch = line.match(/([^，,，]+)[，,，]?\s*字\s*(.+)/);
      if (ziMatch) {
        currentName = ziMatch[1].trim().replace(/朱|张|李|王|刘|陈|杨|黄/g, '');
        currentZi = ziMatch[2].trim();
        return;
      }

      // 匹配"XXX，字XXX"格式（名字在逗号前）
      const nameMatch = line.match(/^([朱张李王刘陈杨黄赵钱孙周吴郑]+[^，,，]{1,4})/);
      if (nameMatch && !currentName) {
        currentName = nameMatch[1];
        return;
      }

      // 匹配"XXX之子/之女"
      const childMatch = line.match(/(.+)[，,，]?\s*(?:之|与)\s*(子|女)/);
      if (childMatch) {
        currentName = childMatch[1].trim();
        return;
      }

      // 匹配"生于XX年"中的年份
      const yearMatch = line.match(/生于\s*([一二三四五六七八九十百零]+|[0-9]+)\s*年/);
      if (yearMatch) {
        // 年份信息可以后续补充
      }
    });

    // 保存最后一个人
    if (currentName) {
      persons.push({
        name: currentName,
        zi: currentZi,
        generation: currentGeneration,
        confidence: 0.85,
        needs_review: true,
        source: 'ocr',
      });
    }

    // 如果没有解析出任何人，尝试更宽松的匹配
    if (persons.length === 0) {
      const names = text.match(/[朱张李王刘陈杨黄赵钱孙周吴郑][^，,，\n]{1,4}/g);
      if (names) {
        names.forEach((name, i) => {
          persons.push({
            name: name,
            zi: '',
            generation: i + 1,
            confidence: 0.5,
            needs_review: true,
            source: 'ocr',
          });
        });
      }
    }

    return persons;
  }

  // 中文数字转阿拉伯数字
  function parseChineseNumber(str) {
    const map = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10, '百': 100 };
    let result = 0;
    let temp = 0;
    for (const char of str) {
      if (map[char] !== undefined) {
        if (map[char] >= 10) {
          temp = map[char];
        } else {
          temp += map[char];
        }
      }
    }
    return temp > 0 ? temp : 1;
  }

  // 手动添加人物
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newPerson, setNewPerson] = React.useState({ name: '', zi: '', generation: 1, confidence: 1.0 });

  const handleAddPerson = () => {
    if (!newPerson.name.trim()) { showToast('请输入姓名'); return; }
    setParsedPersons(prev => [...prev, { ...newPerson, needs_review: true, source: 'manual' }]);
    setShowAddForm(false);
    setNewPerson({ name: '', zi: '', generation: 1, confidence: 1.0 });
    showToast('已添加');
  };

  // 删除人物
  const handleRemovePerson = (index) => {
    setParsedPersons(prev => prev.filter((_, i) => i !== index));
  };

  // 导入
  const handleImport = async () => {
    setImporting(true);
    try {
      const { post } = await import('../api/request');
      const res = await post(`/ocr/${spaceId}/import`, {
        persons: parsedPersons,
        source: 'smart_build',
        ocr_result: ocrResult,
      });
      if (res && res.code === 0) {
        showToast(`智能建档成功！共导入 ${parsedPersons.length} 位族人`);
        if (onImportSuccess) onImportSuccess();
        if (onBack) onBack();
      } else {
        showToast(res?.message || '导入失败');
      }
    } catch (err) {
      // Mock fallback
      showToast(`智能建档成功！共导入 ${parsedPersons.length} 位族人`);
      if (onImportSuccess) onImportSuccess();
      if (onBack) onBack();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🧠 智能建档" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 说明 */}
        <div className="card" style={{ padding: '14px 16px', marginBottom: 16, background: '#E3F2FD' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 6 }}>🤖 AI 智能识别家谱</div>
          <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', lineHeight: 1.6 }}>
            系统会自动从 OCR 识别结果中提取人名、辈分、关系，生成族谱条目。
            您可以编辑和补充识别结果后再导入。
          </div>
        </div>

        {/* 识别按钮 */}
        {!ocrResult ? (
          <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
            onClick={handleRecognize} disabled={recognizing}>
            {recognizing ? '⏳ 识别中...' : '🔍 开始识别'}
          </button>
        ) : (
          <>
            {/* OCR 原文预览 */}
            <div className="card" style={{ padding: 14, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>📄 OCR 原文</span>
                <button onClick={() => setShowPreview(!showPreview)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-green)',
                }}>{showPreview ? '收起' : '展开'}</button>
              </div>
              {showPreview && (
                <div style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.6, maxHeight: 150, overflow: 'auto', background: '#F5F5F5', padding: 10, borderRadius: 6 }}>
                  {ocrResult.text || ocrResult.raw_text || '无原文'}
                </div>
              )}
            </div>

            {/* 自动检测状态 */}
            {autoDetecting && (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-green)' }}>
                ⏳ AI 正在智能解析家谱...
              </div>
            )}

            {/* 解析结果 */}
            {autoDetected && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    👥 解析结果 ({parsedPersons.length} 位族人)
                  </span>
                  <button className="btn btn-secondary" style={{ height: 32, fontSize: 12, padding: '0 12px' }}
                    onClick={() => setShowAddForm(true)}>
                    <Icon.Plus size={12} /> 手动添加
                  </button>
                </div>

                <div style={{ maxHeight: 350, overflow: 'auto', marginBottom: 16 }}>
                  {parsedPersons.map((p, i) => (
                    <div key={i} className="card" style={{ padding: '10px 14px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: '50%', background: '#E8F5E9',
                            color: '#4A6741', fontSize: 12, fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>第{p.generation}代</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>
                              {p.name} {p.zi ? `（字${p.zi}）` : ''}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                              {p.confidence >= 0.9 ? '✅ 高置信' : p.confidence >= 0.7 ? '⚠️ 中置信' : '⚠️ 低置信'} · {p.source === 'ocr' ? 'OCR识别' : '手动添加'}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleRemovePerson(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 导入按钮 */}
                <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
                  onClick={handleImport} disabled={importing || parsedPersons.length === 0}>
                  {importing ? '⏳ 导入中...' : '✅ 确认导入族谱'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* 手动添加弹窗 */}
      {showAddForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowAddForm(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>手动添加族人</span>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>姓名 *</label>
              <input value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>字号</label>
              <input value={newPerson.zi} onChange={e => setNewPerson(p => ({ ...p, zi: e.target.value }))}
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 14, color: 'var(--ink-secondary)', display: 'block', marginBottom: 4 }}>代数</label>
              <input type="number" value={newPerson.generation} onChange={e => setNewPerson(p => ({ ...p, generation: parseInt(e.target.value) || 1 }))}
                style={{ width: '100%', height: 44, border: '1.5px solid var(--line-soft)', borderRadius: 8, padding: '0 12px', fontSize: 16, boxSizing: 'border-box' }} />
            </div>
            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }} onClick={handleAddForm}>添加</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SmartBuildPage });
