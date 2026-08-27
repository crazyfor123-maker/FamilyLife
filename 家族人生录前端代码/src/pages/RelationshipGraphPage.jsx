// ===== 亲属关系图谱页 =====
function RelationshipGraphPage({ personId, onBack }) {
  const { currentSpaceId } = React.useContext(FamilyContext) || { currentSpaceId: null };
  const spaceId = currentSpaceId || '1';
  const [relations, setRelations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState('list'); // 'list' | 'graph'
  const [selectedRelation, setSelectedRelation] = React.useState(null);
  const [showDetail, setShowDetail] = React.useState(false);

  React.useEffect(() => {
    loadRelations();
  }, [personId, spaceId]);

  const loadRelations = async () => {
    setLoading(true);
    try {
      const { getPersonRelations } = await import('../api/kinship');
      const res = await getPersonRelations(spaceId, personId);
      if (res && res.code === 0) {
        setRelations(res.data || []);
      } else {
        // Mock 关系数据
        setRelations([
          { relation_id: '1', related_name: '朱文远', relation_type: '祖父', status: 'active', birthYear: '1920', deathYear: '2005' },
          { relation_id: '2', related_name: '李秀兰', relation_type: '祖母', status: 'active', birthYear: '1925', deathYear: '2010' },
          { relation_id: '3', related_name: '朱继业', relation_type: '父亲', status: 'active', birthYear: '1945', deathYear: '' },
          { relation_id: '4', related_name: '王芳', relation_type: '母亲', status: 'active', birthYear: '1948', deathYear: '' },
          { relation_id: '5', related_name: '朱德厚', relation_type: '伯父', status: 'active', birthYear: '1943', deathYear: '' },
          { relation_id: '6', related_name: '朱明辉', relation_type: '叔父', status: 'active', birthYear: '1950', deathYear: '' },
          { relation_id: '7', related_name: '朱小红', relation_type: '姐妹', status: 'active', birthYear: '1970', deathYear: '' },
          { relation_id: '8', related_name: '张氏', relation_type: '配偶', status: 'active', birthYear: '1968', deathYear: '' },
        ]);
      }
    } catch {
      setRelations([
        { relation_id: '1', related_name: '朱文远', relation_type: '祖父', status: 'active', birthYear: '1920', deathYear: '2005' },
        { relation_id: '2', related_name: '李秀兰', relation_type: '祖母', status: 'active', birthYear: '1925', deathYear: '2010' },
        { relation_id: '3', related_name: '朱继业', relation_type: '父亲', status: 'active', birthYear: '1945', deathYear: '' },
        { relation_id: '4', related_name: '王芳', relation_type: '母亲', status: 'active', birthYear: '1948', deathYear: '' },
        { relation_id: '5', related_name: '朱德厚', relation_type: '伯父', status: 'active', birthYear: '1943', deathYear: '' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const relationIcons = {
    '祖父': '👴', '祖母': '👵',
    '父亲': '👨', '母亲': '👩',
    '伯父': '👨', '叔父': '👨', '舅父': '👨', '姑母': '👩',
    '兄弟': '👦', '姐妹': '👧',
    '配偶': '💑', '子女': '👶',
    '曾祖父': '👴', '曾祖母': '👵',
  };

  const relationColors = {
    '祖父': '#FF9800', '祖母': '#FF9800',
    '父亲': '#2196F3', '母亲': '#E91E63',
    '伯父': '#4CAF50', '叔父': '#4CAF50', '舅父': '#4CAF50', '姑母': '#9C27B0',
    '兄弟': '#FF5722', '姐妹': '#FF5722',
    '配偶': '#F44336', '子女': '#673AB7',
  };

  const handleViewDetail = (rel) => {
    setSelectedRelation(rel);
    setShowDetail(true);
  };

  // 图谱视图 - 简化版关系图
  const renderGraphView = () => {
    const centerX = 200;
    const centerY = 150;
    const radius = 100;

    // 中心节点
    const centerNode = (
      <g transform={`translate(${centerX}, ${centerY})`}>
        <circle r={30} fill="var(--ink-green-soft)" stroke="var(--ink-green)" strokeWidth={2} />
        <text textAnchor="middle" dy={5} fontSize={14} fill="var(--ink-green)" fontWeight={600}>
          本人
        </text>
      </g>
    );

    // 关系节点
    const nodes = relations.map((rel, i) => {
      const angle = (i / relations.length) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const color = relationColors[rel.relation_type] || '#9E9E9E';
      const icon = relationIcons[rel.relation_type] || '👤';

      return (
        <g key={rel.relation_id} transform={`translate(${x}, ${y})`}
          onClick={() => handleViewDetail(rel)}
          style={{ cursor: 'pointer' }}>
          {/* 连接线 */}
          <line x1={centerX} y1={centerY} x2={x} y2={y}
            stroke={color} strokeWidth={1.5} strokeDasharray="4,4" opacity={0.5} />
          {/* 节点 */}
          <circle r={25} fill="white" stroke={color} strokeWidth={2} />
          <text textAnchor="middle" dy={-8} fontSize={16}>{icon}</text>
          <text textAnchor="middle" dy={10} fontSize={9} fill={color}>{rel.relation_type}</text>
          <text textAnchor="middle" dy={22} fontSize={8} fill="var(--ink-tertiary)">{rel.related_name}</text>
        </g>
      );
    });

    return (
      <svg width="100%" height="300" style={{ background: '#FAFAFA', borderRadius: 12 }}>
        {centerNode}
        {nodes}
      </svg>
    );
  };

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="🌳 亲属关系图谱" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 视图切换 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setViewMode('list')} style={{
            flex: 1, height: 36, border: `1.5px solid ${viewMode === 'list' ? 'var(--ink-green)' : 'var(--line-light)'}`,
            borderRadius: 8, background: viewMode === 'list' ? '#E8F5E9' : 'white',
            color: viewMode === 'list' ? 'var(--ink-green)' : 'var(--ink-primary)',
            cursor: 'pointer', fontSize: 13,
          }}>📋 列表</button>
          <button onClick={() => setViewMode('graph')} style={{
            flex: 1, height: 36, border: `1.5px solid ${viewMode === 'graph' ? 'var(--ink-green)' : 'var(--line-light)'}`,
            borderRadius: 8, background: viewMode === 'graph' ? '#E8F5E9' : 'white',
            color: viewMode === 'graph' ? 'var(--ink-green)' : 'var(--ink-primary)',
            cursor: 'pointer', fontSize: 13,
          }}>🌐 图谱</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : relations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌳</div>
            <p>暂无关系数据</p>
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => onBack()}>去建立关系</button>
          </div>
        ) : viewMode === 'graph' ? (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {renderGraphView()}
            <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center', marginTop: 8 }}>
              点击节点查看详情
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {relations.map(rel => (
              <div key={rel.relation_id} className="card" style={{ padding: '12px 14px', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => handleViewDetail(rel)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${relationColors[rel.relation_type] || '#9E9E9E'}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {relationIcons[rel.relation_type] || '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink-primary)' }}>{rel.related_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>{rel.relation_type} · {rel.birthYear || '?'}年生</div>
                  </div>
                  <span style={{ fontSize: 12, color: relationColors[rel.relation_type] || 'var(--ink-tertiary)' }}>
                    {rel.status === 'deceased' ? '✝' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 关系详情弹窗 */}
      {showDetail && selectedRelation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowDetail(false)}>
          <div style={{ background: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '20px 16px 32px', width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>关系详情</span>
              <button onClick={() => setShowDetail(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${relationColors[selectedRelation.relation_type] || '#9E9E9E'}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                {relationIcons[selectedRelation.relation_type] || '👤'}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)' }}>{selectedRelation.related_name}</div>
                <div style={{ fontSize: 14, color: relationColors[selectedRelation.relation_type] || 'var(--ink-tertiary)' }}>{selectedRelation.relation_type}</div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: 'var(--ink-secondary)', lineHeight: 1.8 }}>
              <div>出生：{selectedRelation.birthYear || '未知'}年</div>
              <div>逝世：{selectedRelation.deathYear || '在世'}</div>
              <div>关系ID：{selectedRelation.relation_id}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1, height: 40, fontSize: 14 }}>编辑关系</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 40, fontSize: 14 }}>查看人物</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { RelationshipGraphPage });
