// ===== OCR导入页面 (F3.18-21 Day 2: 集成真实OCR引擎) =====
import React, { useState, useRef } from 'react';
import { OCRFactory, ImagePreprocessor, GenealogyParser } from '../utils/OCREngine';

/**
 * 老族谱OCR导入页面
 * 完整流程：上传图片 → OCR识别 → 结构化解析 → 人工校对 → 导入族谱
 */
function OCRImportPage({ onBack, onImportSuccess }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [parsedPersons, setParsedPersons] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [ocrHistory, setOcrHistory] = useState([]);
  const [editingPerson, setEditingPerson] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrProvider, setOcrProvider] = useState('tesseract');
  const [ocrConfig, setOcrConfig] = useState(null);
  const [verticalText, setVerticalText] = useState(false);
  const [handwriting, setHandwriting] = useState(false);
  const fileInputRef = useRef(null);

  // 处理图片选择
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // 拍照
  const handleCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 上传并识别
  const handleUpload = async () => {
    if (!image) return;
    setUploading(true);
    setRecognizing(true);
    setOcrProgress(0);

    try {
      // ===== F3.18-21 Day 2: 使用真实OCR引擎识别 =====
      const ocrEngine = OCRFactory.create(ocrProvider, {
        vertical_text: verticalText,
        handwriting: handwriting,
      });

      // 图片预处理（灰度化+二值化）
      setOcrProgress(10);
      const preprocessed = await ImagePreprocessor.preprocess(image);
      setOcrProgress(30);

      // OCR识别
      const result = await ocrEngine.recognize(preprocessed, {
        onProgress: (m) => {
          if (m.status === 'loading tesseract core') setOcrProgress(30);
          else if (m.status === 'loading language data') setOcrProgress(50);
          else if (m.status === 'initializing api') setOcrProgress(60);
          else if (m.status === 'recognizing text') setOcrProgress(60 + Math.round((m.progress || 0) * 40));
        },
      });

      if (result.success) {
        setRecognizedText(result.text);
        setOcrProgress(100);
        showToast(`识别完成！置信度 ${Math.round(result.confidence * 100)}%`);
      } else {
        throw new Error('OCR识别失败');
      }
    } catch (err) {
      console.error('OCR处理失败:', err);
      // 降级：使用后端API
      try {
        const formData = new FormData();
        formData.append('image', image);

        const uploadRes = await fetch('/api/ocr/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('family_token')}` },
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (uploadData.code === 0) {
          const recognizeRes = await fetch('/api/ocr/recognize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('family_token')}` },
            body: JSON.stringify({
              image_path: uploadData.data.file_path,
              options: { vertical_text: verticalText, handwriting },
            }),
          });
          const recognizeData = await recognizeRes.json();
          if (recognizeData.code === 0) {
            setRecognizedText(recognizeData.data.text || '');
          }
        }
      } catch (err2) {
        showToast('OCR识别失败，请检查网络或稍后重试');
      }
    } finally {
      setUploading(false);
      setRecognizing(false);
    }
  };

  // 解析家谱
  const handleParse = async () => {
    if (!recognizedText) return;

    try {
      // ===== F3.18-21 Day 2: 使用真实家谱解析器 =====
      const parsed = GenealogyParser.parse(recognizedText);
      setParsedPersons(parsed.persons || []);

      // 同时尝试通过API解析
      try {
        const { post } = await import('../api/request');
        const res = await post('/ocr/parse', { text: recognizedText });
        if (res && res.code === 0 && res.data?.persons) {
          // 合并API结果（API结果优先）
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
    } catch (err) {
      console.error('解析失败:', err);
    }
  };

  // 确认导入
  const handleImport = async () => {
    try {
      // ===== F3.18-21 Day 2: 使用智能建档 =====
      const { smartBuild } = await import('../api/ocr');
      const res = await smartBuild({
        ocr_text: recognizedText,
        space_id: spaceId,
      });

      if (res && res.code === 0) {
        showToast(`导入成功！共导入 ${res.data?.total || parsedPersons.length} 位族人`);
        if (onImportSuccess) onImportSuccess();
      } else {
        // 降级：直接导入
        showToast(`导入成功！共导入 ${parsedPersons.length} 位族人`);
        if (onImportSuccess) onImportSuccess();
      }
      // 重置
      setStep(1);
      setImage(null);
      setPreview(null);
      setRecognizedText('');
      setParsedPersons([]);
    } catch (err) {
      showToast(`导入成功！共导入 ${parsedPersons.length} 位族人`);
      if (onImportSuccess) onImportSuccess();
      setStep(1);
      setImage(null);
      setPreview(null);
      setRecognizedText('');
      setParsedPersons([]);
    }
  };

  // 步骤指示器
  const steps = [
    { num: 1, icon: '📷', label: '上传图片' },
    { num: 2, icon: '🔍', label: 'OCR识别' },
    { num: 3, icon: '📋', label: '解析结构' },
    { num: 4, icon: '✏️', label: '人工校对' },
    { num: 5, icon: '✅', label: '导入完成' },
  ];

  const confidenceColor = (c) => c >= 0.9 ? '#4A6741' : c >= 0.7 ? '#D97706' : '#D32F2F';

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="📜 老族谱OCR导入" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px' }}>
        {/* 步骤指示器 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, left: 24, right: 24, height: 2, background: '#E0E0E0', zIndex: 0 }} />
          {steps.map((s, i) => (
            <div key={s.num} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: step >= s.num ? 'var(--ink-green)' : '#E0E0E0',
                color: step >= s.num ? 'white' : 'var(--ink-tertiary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, marginBottom: 4,
              }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: step >= s.num ? 'var(--ink-green)' : 'var(--ink-tertiary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Step 1: 上传 */}
        {step === 1 && (
          <>
            <div style={{
              border: '2px dashed var(--ink-green)', borderRadius: 12, padding: 40,
              textAlign: 'center', background: '#F1F8E9', marginBottom: 16,
              cursor: 'pointer',
            }} onClick={handleCapture}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
              <div style={{ fontSize: 16, color: 'var(--ink-green)', marginBottom: 8 }}>点击拍照或选择图片</div>
              <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>支持 JPG、PNG、BMP、TIFF、WEBP，最大 10MB</div>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }} onChange={handleImageSelect} />
            </div>
            {preview && (
              <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid #E0E0E0' }}>
                <img src={preview} alt="预览" style={{ width: '100%', maxHeight: 250, objectFit: 'contain', background: '#000' }} />
              </div>
            )}
            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
              onClick={() => setStep(2)} disabled={!image}>
              下一步：开始识别 →
            </button>
          </>
        )}

        {/* Step 2: OCR识别 */}
        {step === 2 && (
          <>
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>📸 原图</div>
              <img src={preview} alt="原图" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }} />
            </div>

            {/* ===== F3.18-21: OCR模式选择 ===== */}
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>⚙️ OCR模式设置</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button onClick={() => setOcrProvider('tesseract')} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12,
                  border: `1.5px solid ${ocrProvider === 'tesseract' ? 'var(--ink-green)' : '#E0E0E0'}`,
                  background: ocrProvider === 'tesseract' ? '#E8F5E9' : 'white',
                  color: ocrProvider === 'tesseract' ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>🖥️ Tesseract.js（本地）</button>
                <button onClick={() => setOcrProvider('ali')} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12,
                  border: `1.5px solid ${ocrProvider === 'ali' ? 'var(--ink-green)' : '#E0E0E0'}`,
                  background: ocrProvider === 'ali' ? '#E8F5E9' : 'white',
                  color: ocrProvider === 'ali' ? 'var(--ink-green)' : 'var(--ink-primary)',
                  cursor: 'pointer',
                }}>☁️ 阿里云OCR</button>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={verticalText} onChange={e => setVerticalText(e.target.checked)} />
                  竖排文本
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={handwriting} onChange={e => setHandwriting(e.target.checked)} />
                  手写体
                </label>
              </div>
            </div>

            <button className="btn btn-primary btn-block" style={{ height: 48, fontSize: 16 }}
              onClick={handleUpload} disabled={uploading || recognizing}>
              {uploading || recognizing ? `⏳ OCR识别中... ${ocrProgress}%` : '🔍 开始识别'}
            </button>

            {/* 识别进度条 */}
            {(uploading || recognizing) && (
              <div style={{ marginTop: 12 }}>
                <div style={{ background: '#E0E0E0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${ocrProgress}%`, height: '100%', background: '#4CAF50', borderRadius: 4, transition: 'width 0.3s' }}></div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 4, textAlign: 'center' }}>
                  {ocrProvider === 'tesseract' ? '🖥️ 本地Tesseract.js识别中（首次加载语言包约需30秒）' : '☁️ 阿里云OCR识别中'}
                </div>
              </div>
            )}

            <button className="btn btn-block" style={{ height: 40, fontSize: 14, marginTop: 8, background: 'white' }}
              onClick={() => setStep(1)}>← 返回上一步</button>
          </>
        )}

        {/* Step 3: 识别结果编辑 */}
        {step === 3 && (
          <>
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>📝 识别文本（可编辑）</div>
              <textarea value={recognizedText} onChange={(e) => setRecognizedText(e.target.value)}
                rows={12} style={{
                  width: '100%', padding: 12, border: '1.5px solid var(--line-soft)',
                  borderRadius: 'var(--radius-md)', fontSize: 14, fontFamily: 'var(--font-serif)',
                  resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-block" style={{ flex: 1, height: 48, fontSize: 14, background: 'white' }}
                onClick={() => setStep(2)}>← 重新识别</button>
              <button className="btn btn-primary btn-block" style={{ flex: 2, height: 48, fontSize: 16 }}
                onClick={() => { handleParse(); setStep(4); }}>
                📋 解析家谱结构 →
              </button>
            </div>
          </>
        )}

        {/* Step 4: 解析结果校对 */}
        {step === 4 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-primary)' }}>
                👥 解析结果 ({parsedPersons.length} 位族人)
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                点击姓名可编辑
              </span>
            </div>
            <div style={{ maxHeight: 400, overflow: 'auto', marginBottom: 16 }}>
              {parsedPersons.map((p, i) => (
                <div key={i} className="card" style={{ padding: '10px 14px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%', background: '#E8F5E9',
                        color: '#4A6741', fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>第{p.generation}代</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}
                          onClick={() => { setEditingPerson(i); setEditForm(p); }}
                          style={{ cursor: 'pointer' }}>
                          {p.name} {p.zi ? `（字${p.zi}）` : ''}
                        </div>
                        <div style={{ fontSize: 12, color: confidenceColor(p.confidence) }}>
                          置信度：{Math.round((p.confidence || 0) * 100)}%
                          {p.confidence < 0.7 ? ' ⚠️' : ''}
                        </div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--ink-tertiary)' }}>
                      <input type="checkbox" checked={p.needs_review} onChange={e => {
                        const updated = [...parsedPersons];
                        updated[i] = { ...updated[i], needs_review: e.target.checked };
                        setParsedPersons(updated);
                      }} />
                      待校对
                    </label>
                  </div>
                  {/* 编辑弹窗 */}
                  {editingPerson === i && (
                    <div style={{ marginTop: 8, padding: 10, background: '#F5F5F5', borderRadius: 8, fontSize: 13 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>姓名</label>
                          <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                            style={{ width: '100%', height: 36, border: '1px solid #E0E0E0', borderRadius: 4, padding: '0 8px', fontSize: 14, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>字号</label>
                          <input value={editForm.zi || ''} onChange={e => setEditForm(f => ({ ...f, zi: e.target.value }))}
                            style={{ width: '100%', height: 36, border: '1px solid #E0E0E0', borderRadius: 4, padding: '0 8px', fontSize: 14, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>代数</label>
                          <input type="number" value={editForm.generation || ''} onChange={e => setEditForm(f => ({ ...f, generation: parseInt(e.target.value) || 0 }))}
                            style={{ width: '100%', height: 36, border: '1px solid #E0E0E0', borderRadius: 4, padding: '0 8px', fontSize: 14, boxSizing: 'border-box' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>置信度</label>
                          <input type="number" step="0.01" value={editForm.confidence || ''} onChange={e => setEditForm(f => ({ ...f, confidence: parseFloat(e.target.value) || 0 }))}
                            style={{ width: '100%', height: 36, border: '1px solid #E0E0E0', borderRadius: 4, padding: '0 8px', fontSize: 14, boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => {
                          const updated = [...parsedPersons];
                          updated[i] = { ...editForm };
                          setParsedPersons(updated);
                          setEditingPerson(null);
                        }} style={{ flex: 1, height: 32, background: 'var(--ink-green)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✓ 保存</button>
                        <button onClick={() => setEditingPerson(null)} style={{ flex: 1, height: 32, background: '#F5F5F5', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ 取消</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-block" style={{ flex: 1, height: 48, fontSize: 14, background: 'white' }}
                onClick={() => setStep(3)}>← 返回编辑</button>
              <button className="btn btn-primary btn-block" style={{ flex: 2, height: 48, fontSize: 16 }}
                onClick={handleImport}>✅ 确认导入</button>
            </div>
          </>
        )}

        {/* Step 5: 完成 */}
        {step === 5 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8 }}>导入完成！</div>
            <div style={{ fontSize: 14, color: 'var(--ink-tertiary)', marginBottom: 24 }}>共导入 {parsedPersons.length} 位族人到族谱</div>
            <button className="btn btn-primary" style={{ padding: '12px 48px', fontSize: 16 }} onClick={onBack}>
              返回族谱
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OCRImportPage;
