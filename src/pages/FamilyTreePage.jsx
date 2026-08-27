// ===== F3.15 族谱可视化渲染 - 三种视图 + 虚拟滚动 =====
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getPersonRelations, buildFamilyTree, flattenTree, layoutTree, toggleExpand, findNode, getAllDescendants } from '../api/kinship';
import { ViewportDetector, TreeDynamicLoader } from '../utils/FamilyTreeVirtualScroll';

function FamilyTreePage({ onNavigate, spaceId = '1' }) {
  const [viewMode, setViewMode] = useState('tree'); // tree | radial | list
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [theme, setTheme] = useState('traditional'); // traditional | modern
  const [fontSize, setFontSize] = useState(18); // 默认18sp
  const [showLegend, setShowLegend] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNode, setHighlightedNode] = useState(null);
  // ===== F3.15 虚拟滚动 =====
  const [renderNodes, setRenderNodes] = useState([]);
  const [renderConnections, setRenderConnections] = useState([]);
  const [renderStats, setRenderStats] = useState(null);
  const [showRenderInfo, setShowRenderInfo] = useState(false);
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  // ===== F3.15 虚拟滚动组件 =====
  const viewportDetectorRef = useRef(null);
  const treeLoaderRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchDist, setTouchDist] = useState(null);
  // ===== F3.16 惯性滑动 =====
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  // ===== F3.16 长按操作菜单 =====
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [longPressNode, setLongPressNode] = useState(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const isDark = theme === 'modern';
  const bgColor = isDark ? '#1A1A2E' : '#FBF8F2';
  const textColor = isDark ? '#E0E0E0' : '#212121';
  const nodeBg = isDark ? '#2A2A4A' : '#FFFFFF';
  const lineColor = isDark ? '#4CAF50' : '#4CAF50';
  const spouseLineColor = '#FFB74D';

  // 加载族谱数据
  useEffect(() => { loadTree(); }, []);

  const loadTree = async () => {
    setLoading(true);
    try {
      const relationsRes = await getPersonRelations(spaceId, 1);
      const relations = (relationsRes?.code === 0) ? relationsRes.data : [];
      const tree = buildFamilyTree(relations, [], 1);
      if (!tree) { setLoading(false); return; }

      // ===== F3.15 虚拟滚动：基于树结构而非扁平化 =====
      const allDescendants = getAllDescendants(tree);
      const totalNodes = allDescendants.length;

      // 初始化虚拟滚动组件
      if (!treeLoaderRef.current) {
        treeLoaderRef.current = new TreeDynamicLoader();
        treeLoaderRef.current.onNodesUpdate = (update) => {
          setRenderNodes(update.nodes);
          setRenderConnections(update.connections);
          setRenderStats(update);
        };
      }

      // 初始化可视区域检测器
      if (!viewportDetectorRef.current) {
        viewportDetectorRef.current = new ViewportDetector(svgRef.current, containerRef.current);
        viewportDetectorRef.current.onViewportChange = (viewport) => {
          if (treeLoaderRef.current && viewMode === 'tree') {
            treeLoaderRef.current.updateViewport(viewport);
          }
        };
      }

      // 设置树根（初始展开最近3代）
      if (totalNodes > 100) {
        // 大族谱：初始只展开最近3代
        const initialExpanded = new Set([tree.id]);
        const collectFirst3 = (node, depth) => {
          if (depth >= 3) return;
          if (node.children?.length) {
            node.children.forEach(child => {
              initialExpanded.add(child.id);
              collectFirst3(child, depth + 1);
            });
          }
        };
        collectFirst3(tree, 0);
        treeLoaderRef.current.setTree(tree, initialExpanded);
        setExpandedNodes(initialExpanded);
        console.log(`[F3.15] 大族谱(${totalNodes}人)，初始展开3代，可见节点${treeLoaderRef.current.getStats().visibleByExpand}个`);
      } else {
        // 小族谱：全部展开
        treeLoaderRef.current.setTree(tree, new Set([tree.id]));
        setExpandedNodes(new Set([tree.id]));
        console.log(`[F3.15] 小族谱(${totalNodes}人)，全部渲染`);
      }
    } catch (err) {
      console.error('加载族谱失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 缩放
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(s => Math.max(0.3, Math.min(3, s + delta)));
    // ===== F3.15 缩放时更新可视区域检测 =====
    if (viewportDetectorRef.current) {
      viewportDetectorRef.current.updateTransform(s + delta, offset);
    }
  }, [scale, offset]);

  // 拖拽
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };
  const handleMouseMove = (e) => {
    if (dragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setOffset({ x: newX, y: newY });
      // ===== F3.15 拖拽时更新可视区域检测 =====
      if (viewportDetectorRef.current) {
        viewportDetectorRef.current.updateTransform(scale, { x: newX, y: newY });
      }
    }
  };
  const handleMouseUp = () => setDragging(false);

  // 双指缩放
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setTouchDist(Math.sqrt(dx * dx + dy * dy));
      setTouchStart({ x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                      y: (e.touches[0].clientY + e.touches[1].clientY) / 2 });
    } else if (e.touches.length === 1) {
      setDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
      // ===== F3.16 惯性滑动 =====
      setTouchStartTime(Date.now());
      setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      // ===== F3.16 长按操作菜单 =====
      setLongPressNode(null);
      const timer = setTimeout(() => {
        setLongPressNode(true);
        setShowContextMenu({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }, 500);
      setLongPressTimer(timer);
    }
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = (dist - touchDist) / 200;
      setScale(s => Math.max(0.3, Math.min(3, s + delta)));
      setTouchDist(dist);
    } else if (e.touches.length === 1 && dragging) {
      setOffset({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
      // ===== F3.16 长按菜单：移动时取消 =====
      if (longPressNode) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        setLongPressNode(null);
        setShowContextMenu(null);
      }
    }
  };
  const handleTouchEnd = (e) => {
    // ===== F3.16 惯性滑动 =====
    if (touchStartTime && touchStartPos) {
      const now = Date.now();
      const dt = now - touchStartTime;
      if (dt > 0 && dt < 500) {
        const dx = (e.changedTouches?.[0]?.clientX || e.touches[0]?.clientX) - touchStartPos.x;
        const dy = (e.changedTouches?.[0]?.clientY || e.touches[0]?.clientY) - touchStartPos.y;
        const vx = dx / dt * 16;
        const vy = dy / dt * 16;
        setVelocity({ x: vx, y: vy });
        // 启动惯性动画
        animateInertia(vx, vy);
      }
    }
    // ===== F3.16 长按菜单清理 =====
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setDragging(false);
    setTouchDist(null);
    setTouchStart(null);
    setTouchStartTime(null);
    setTouchStartPos({ x: 0, y: 0 });
  };

  // ===== F3.16 惯性动画 =====
  const animateInertia = (vx, vy) => {
    let frame = 0;
    const maxFrames = 30;
    const friction = 0.92;
    const animate = () => {
      if (frame >= maxFrames || Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) return;
      setOffset(prev => ({
        x: prev.x + vx,
        y: prev.y + vy,
      }));
      setVelocity(prev => ({
        x: prev.x * friction,
        y: prev.y * friction,
      }));
      frame++;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  // 点击节点
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setShowContextMenu(null);
  };

  // 双击展开/收拢
  const handleNodeDblClick = (node) => {
    if (node.children && node.children.length > 0) {
      setExpandedNodes(prev => {
        const next = new Set(prev);
        next.has(node.id) ? next.delete(node.id) : next.add(node.id);
        return next;
      });
      // ===== F3.15 更新树加载器 =====
      if (treeLoaderRef.current) {
        treeLoaderRef.current.setTree(nodes[0], expandedNodes);
      }
    }
  };

  // 双击空白区域缩放
  const handleCanvasDblClick = () => {
    setScale(s => s < 1.5 ? 2 : 1);
  };

  // 搜索定位
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setHighlightedNode(null); return; }
    const found = nodes.find(n => n.name?.toLowerCase().includes(query.toLowerCase()));
    if (found) setHighlightedNode(found.id);
  };

  // 缩放按钮
  const zoomIn = () => {
    const newScale = Math.min(3, scale + 0.2);
    setScale(newScale);
    if (viewportDetectorRef.current) viewportDetectorRef.current.updateTransform(newScale, offset);
  };
  const zoomOut = () => {
    const newScale = Math.max(0.3, scale - 0.2);
    setScale(newScale);
    if (viewportDetectorRef.current) viewportDetectorRef.current.updateTransform(newScale, offset);
  };
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    if (viewportDetectorRef.current) viewportDetectorRef.current.updateTransform(1, { x: 0, y: 0 });
  };
  const expandAll = () => {
    const all = [];
    const collect = (n) => { all.push(n.id); n.children?.forEach(collect); };
    collect(nodes[0]);
    setExpandedNodes(new Set(all));
    if (treeLoaderRef.current) treeLoaderRef.current.setTree(nodes[0], new Set(all));
  };
  const collapseAll = () => {
    setExpandedNodes(new Set());
    if (treeLoaderRef.current) treeLoaderRef.current.setTree(nodes[0], new Set());
  };

  // 渲染节点
  const renderNode = (node) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isDeceased = node.status === 'deceased' || node.deathYear;
    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = highlightedNode === node.id;
    const genderColor = node.gender === '女' ? '#C2185B' : '#1565C0';
    const bgColorNode = isDeceased ? '#9E9E9E' : (isSelected ? '#E8F5E9' : nodeBg);

    return (
      <g key={node.id} transform={`translate(${node.x}, ${node.y})`}
        style={{ cursor: 'pointer', opacity: isHighlighted ? 1 : 0.9 }}>
        {/* 节点矩形 */}
        <rect width={120} height={60} rx={10} fill={bgColorNode}
          stroke={isHighlighted ? '#FF9800' : (isSelected ? '#4CAF50' : (isDeceased ? '#BDBDBD' : '#E0E0E0'))}
          strokeWidth={isHighlighted ? 3 : 1.5}
          onMouseDown={(e) => { e.stopPropagation(); handleNodeClick(node); }}
          onDoubleClick={(e) => { e.stopPropagation(); handleNodeDblClick(node); }}
          onMouseEnter={() => {}} onMouseLeave={() => {}}
        />
        {/* 性别圆点 */}
        <circle cx={14} cy={14} r={5} fill={genderColor} />
        {/* 名字（大字体） */}
        <text x={60} y={28} textAnchor="middle" fontSize={fontSize} fill={textColor} fontWeight={600}>
          {node.name || '未知'}
        </text>
        {/* 辈分标签 */}
        <text x={60} y={42} textAnchor="middle" fontSize={12} fill={isDark ? '#888' : '#666'}>
          第{node.generation || '?'}代
        </text>
        {/* 生卒年 */}
        <text x={60} y={54} textAnchor="middle" fontSize={10} fill={isDark ? '#999' : '#888'}>
          {node.birthYear || '?'}{isDeceased ? '-' + node.deathYear : ' 至今'}
        </text>
        {/* 展开/收拢按钮 */}
        {hasChildren && (
          <g transform="translate(100, 40)" onClick={(e) => { e.stopPropagation(); handleNodeDblClick(node); }}>
            <circle r={10} fill={isExpanded ? '#E8F5E9' : '#FFF3E0'} stroke="#E0E0E0" strokeWidth={1} />
            <text textAnchor="middle" dy={3.5} fontSize={12} fill={isExpanded ? '#4A6741' : '#F57C00'}>
              {isExpanded ? '−' : '+'}
            </text>
          </g>
        )}
        {/* 已故标记 */}
        {isDeceased && <text x={105} y={14} fontSize={10} fill="#757575">✝</text>}
      </g>
    );
  };

  // 渲染连接线（F3.15 连线样式区分：直系/收养/配偶/离异）
  const renderConnections = () => {
    return connections.map((conn, i) => {
      const fromX = conn.fromX + 60;
      const fromY = conn.fromY + 60;
      const toX = conn.toX + 60;
      const toY = conn.toY;
      const midY = (fromY + toY) / 2;

      // ===== F3.15 连线样式区分 =====
      if (conn.isSpouse) {
        // 配偶：橙色虚线
        return (
          <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY}
            stroke={spouseLineColor} strokeWidth={2} strokeDasharray="6,4" />
        );
      }
      if (conn.isDivorced) {
        // 离异：红色点划线
        return (
          <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY}
            stroke="#EF5350" strokeWidth={1.5} strokeDasharray="2,4" />
        );
      }
      if (conn.isAdopted) {
        // 收养：绿色虚线
        return (
          <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY}
            stroke="#66BB6A" strokeWidth={1.5} strokeDasharray="4,4" />
        );
      }
      // 直系血亲实线
      return (
        <path key={`conn-${i}`}
          d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
          fill="none" stroke={lineColor} strokeWidth={1.5} />
      );
    });
  };

  // ===== 三种视图渲染 =====
  const renderTree = () => (
    <svg ref={svgRef} width="100%" height="100%" style={{ touchAction: 'none' }}
      onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      onDoubleClick={handleCanvasDblClick}>
      <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
        {renderConnections.length > 0 ? (
          renderConnections.map((conn, i) => {
            const fromNode = renderNodes.find(n => n.id === conn.fromId);
            const toNode = renderNodes.find(n => n.id === conn.toId);
            if (!fromNode && !toNode) return null;

            const fromX = (fromNode?.x || conn.fromX) + 60;
            const fromY = (fromNode?.y || conn.fromY) + 60;
            const toX = (toNode?.x || conn.toX) + 60;
            const toY = (toNode?.y || conn.toY);
            const midY = (fromY + toY) / 2;

            if (conn.isSpouse) {
              return <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#FFB74D" strokeWidth={2} strokeDasharray="6,4" />;
            }
            if (conn.isDivorced) {
              return <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#EF5350" strokeWidth={1.5} strokeDasharray="2,4" />;
            }
            if (conn.isAdopted) {
              return <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#66BB6A" strokeWidth={1.5} strokeDasharray="4,4" />;
            }
            return <path key={`conn-${i}`} d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`} fill="none" stroke={lineColor} strokeWidth={1.5} />;
          })
        ) : (
          connections.map((conn, i) => {
            const fromX = conn.fromX + 60;
            const fromY = conn.fromY + 60;
            const toX = conn.toX + 60;
            const toY = conn.toY;
            const midY = (fromY + toY) / 2;
            if (conn.isSpouse) return <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#FFB74D" strokeWidth={2} strokeDasharray="6,4" />;
            if (conn.isDivorced) return <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#EF5350" strokeWidth={1.5} strokeDasharray="2,4" />;
            if (conn.isAdopted) return <line key={`conn-${i}`} x1={fromX} y1={fromY} x2={toX} y2={toY} stroke="#66BB6A" strokeWidth={1.5} strokeDasharray="4,4" />;
            return <path key={`conn-${i}`} d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`} fill="none" stroke={lineColor} strokeWidth={1.5} />;
          })
        )}
        {renderNodes.length > 0 ? (
          renderNodes.map(node => renderNode(node))
        ) : (
          nodes.map(node => renderNode(node))
        )}
      </g>
    </svg>
  );

  const renderRadial = () => {
    // 辐射图：以选定人物为中心
    const centerX = 400, centerY = 300;
    const radius = 150;
    // ===== F3.15 限制辐射图节点数量 =====
    const radialNodes = nodes.slice(0, 30);
    return (
      <svg width="100%" height="100%" style={{ touchAction: 'none' }}
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          <circle cx={centerX} cy={centerY} r={40} fill="#E8F5E9" stroke="#4CAF50" strokeWidth={2} />
          <text x={centerX} y={centerY - 5} textAnchor="middle" fontSize={16} fontWeight={600} fill={textColor}>中心人物</text>
          <text x={centerX} y={centerY + 15} textAnchor="middle" fontSize={12} fill="#666">{nodes[0]?.name || '未知'}</text>
          {radialNodes.slice(1).map((node, i) => {
            const angle = (2 * Math.PI * i) / radialNodes.length;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            return (
              <g key={node.id}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke={lineColor} strokeWidth={1} strokeDasharray="4,4" />
                <circle cx={x} cy={y} r={30} fill={nodeBg} stroke="#E0E0E0" strokeWidth={1} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill={textColor}>{node.name || '?'}</text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  const renderList = () => {
    // 列表图：按辈分分组
    const groups = {};
    nodes.forEach(n => {
      const gen = n.generation || n.depth || '?';
      if (!groups[gen]) groups[gen] = [];
      groups[gen].push(n);
    });
    return (
      <div style={{ overflow: 'auto', padding: 16, height: '100%' }}>
        {Object.entries(groups).sort((a, b) => a[0] - b[0]).map(([gen, members]) => (
          <div key={gen} style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: textColor, marginBottom: 12 }}>
              第{gen}代
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {members.map(node => (
                <div key={node.id} onClick={() => handleNodeClick(node)}
                  style={{
                    padding: '12px 16px', borderRadius: 10, background: nodeBg,
                    border: selectedNode?.id === node.id ? '2px solid #4CAF50' : '1px solid #E0E0E0',
                    cursor: 'pointer', minWidth: 120,
                  }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textColor }}>{node.name || '未知'}</div>
                  <div style={{ fontSize: 12, color: isDark ? '#888' : '#666' }}>
                    {node.birthYear || '?'}{node.deathYear ? '-' + node.deathYear : ' 至今'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: bgColor }}>
      {/* 顶部工具栏 */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => onNavigate?.('back')} style={{ padding: '6px 12px', fontSize: 14, border: '1px solid #E0E0E0', borderRadius: 6, background: nodeBg, cursor: 'pointer' }}>
          ← 返回
        </button>
        <span style={{ fontSize: 18, fontWeight: 600, color: textColor, flex: 1 }}>🌳 族谱</span>

        {/* 视图切换 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['tree', 'radial', 'list'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #E0E0E0', borderRadius: 6,
                background: viewMode === mode ? '#4CAF50' : nodeBg, color: viewMode === mode ? 'white' : textColor,
                cursor: 'pointer' }}>
              {mode === 'tree' ? '🌳' : mode === 'radial' ? '🔘' : '📋'}
            </button>
          ))}
        </div>

        {/* 主题切换 */}
        <button onClick={() => setTheme(t => t === 'traditional' ? 'modern' : 'traditional')}
          style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #E0E0E0', borderRadius: 6, background: nodeBg, cursor: 'pointer' }}>
          {isDark ? '🌙' : '☀️'}
        </button>

        {/* 字体大小 */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} style={{ padding: '4px 8px', fontSize: 14, border: '1px solid #E0E0E0', borderRadius: 4, cursor: 'pointer' }}>A-</button>
          <button onClick={() => setFontSize(Math.min(24, fontSize + 2))} style={{ padding: '4px 8px', fontSize: 14, border: '1px solid #E0E0E0', borderRadius: 4, cursor: 'pointer' }}>A+</button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div style={{ padding: '0 12px 8px' }}>
        <input type="text" placeholder="搜索人物..." value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #E0E0E0', borderRadius: 8, background: nodeBg, color: textColor }} />
      </div>

      {/* 族谱画布 */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: dragging ? 'grabbing' : 'grab' }}>
        {viewMode === 'tree' ? renderTree() : viewMode === 'radial' ? renderRadial() : renderList()}

        {/* 缩放控制 */}
        <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
          <button onClick={zoomIn} style={{ width: 36, height: 36, border: '1px solid #E0E0E0', borderRadius: 8, background: nodeBg, cursor: 'pointer', fontSize: 18 }}>+</button>
          <div style={{ textAlign: 'center', fontSize: 10, color: isDark ? '#888' : '#666', padding: '2px 0' }}>
            <div>{Math.round(scale * 100)}%</div>
            {renderStats && (
              <div style={{ fontSize: 9, color: '#4CAF50' }}>
                {renderStats.rendered}/{renderStats.totalInTree} 节点
              </div>
            )}
          </div>
          <button onClick={zoomOut} style={{ width: 36, height: 36, border: '1px solid #E0E0E0', borderRadius: 8, background: nodeBg, cursor: 'pointer', fontSize: 18 }}>−</button>
          <button onClick={resetView} style={{ width: 36, height: 36, border: '1px solid #E0E0E0', borderRadius: 8, background: nodeBg, cursor: 'pointer', fontSize: 14 }}>⟲</button>
        </div>

        {/* 全部展开/收拢 */}
        <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 4, zIndex: 10 }}>
          <button onClick={expandAll} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid #E0E0E0', borderRadius: 6, background: nodeBg, cursor: 'pointer' }}>全部展开</button>
          <button onClick={collapseAll} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid #E0E0E0', borderRadius: 6, background: nodeBg, cursor: 'pointer' }}>全部收拢</button>
          <button onClick={() => setShowLegend(!showLegend)} style={{ padding: '6px 12px', fontSize: 12, border: '1px solid #E0E0E0', borderRadius: 6, background: nodeBg, cursor: 'pointer' }}>图例</button>
        </div>

        {/* 搜索高亮提示 */}
        {highlightedNode && (
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', padding: '8px 16px', background: '#FFF3E0', borderRadius: 8, fontSize: 13, color: '#E65100' }}>
            🔍 已找到「{searchQuery}」，高亮显示
          </div>
        )}
      </div>

      {/* 图例 */}
      {showLegend && (
        <div style={{ padding: '8px 12px', background: isDark ? '#2A2A4A' : '#F5F5F5', fontSize: 12, color: isDark ? '#888' : '#666' }}>
          <b>图例：</b>
          <span style={{ marginLeft: 12 }}>实线=直系血亲</span>
          <span style={{ marginLeft: 12, display: 'inline-block', border: '1px dashed #FFB74D', width: 20, height: 2, verticalAlign: 'middle' }}></span>
          <span style={{ marginLeft: 4 }}>配偶</span>
          <span style={{ marginLeft: 12 }}>灰色=已故</span>
        </div>
      )}

      {/* 底部提示 */}
      <div style={{ padding: '4px 12px 8px', fontSize: 12, color: isDark ? '#666' : '#999', textAlign: 'center' }}>
        💡 双指缩放 · 拖拽平移 · 双击展开/收拢 · 点击查看详情
        {renderStats && <span style={{ marginLeft: 12, color: '#4CAF50' }}>📊 渲染 {renderStats.rendered}/{renderStats.totalInTree} 节点</span>}
      </div>
    </div>
  );
}

export default FamilyTreePage;
