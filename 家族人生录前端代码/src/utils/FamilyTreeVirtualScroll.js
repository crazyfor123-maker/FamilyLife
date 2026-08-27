// ===== F3.15 族谱虚拟滚动 - 可视区域检测 + 按需加载 =====
// 核心：IntersectionObserver + 可视区域检测 + 动态节点加载

/**
 * 可视区域检测器
 * 检测哪些节点在 SVG 画布的可视区域内
 */
class ViewportDetector {
  constructor(svgElement, containerElement) {
    this.svg = svgElement;
    this.container = containerElement;
    this.scale = 1;
    this.offset = { x: 0, y: 0 };
    this.onViewportChange = null;
    this._debounceTimer = null;
    this._lastViewport = null;
  }

  /**
   * 更新变换参数（缩放 + 平移）
   */
  updateTransform(scale, offset) {
    this.scale = scale;
    this.offset = offset;
    this._detect();
  }

  /**
   * 检测可视区域内的节点ID
   * @returns {Set<number>} 可视区域内的节点ID集合
   */
  detectVisibleNodeIds(nodes) {
    if (!this.svg || !this.container) return new Set();

    // 获取画布尺寸
    const svgRect = this.svg.getBoundingClientRect();
    const canvasWidth = svgRect.width || 800;
    const canvasHeight = svgRect.height || 600;

    // 可视区域（考虑缩放和平移）
    const viewLeft = -this.offset.x / this.scale;
    const viewTop = -this.offset.y / this.scale;
    const viewRight = (canvasWidth - this.offset.x) / this.scale;
    const viewBottom = (canvasHeight - this.offset.y) / this.scale;

    // 节点尺寸（与FamilyTreePage中一致）
    const nodeWidth = 120;
    const nodeHeight = 60;

    const visibleIds = new Set();
    const visibleNodes = [];

    for (const node of nodes) {
      // 节点边界（相对于SVG坐标系）
      const nodeLeft = node.x;
      const nodeTop = node.y;
      const nodeRight = node.x + nodeWidth;
      const nodeBottom = node.y + nodeHeight;

      // 检测是否部分或全部在可视区域内
      const overlaps = !(nodeRight < viewLeft || nodeLeft > viewRight ||
                         nodeBottom < viewTop || nodeTop > viewBottom);

      if (overlaps) {
        visibleIds.add(node.id);
        visibleNodes.push(node);
      }
    }

    // 检测变化时通知
    const viewportKey = `${viewLeft.toFixed(1)},${viewTop.toFixed(1)},${viewRight.toFixed(1)},${viewBottom.toFixed(1)}`;
    if (viewportKey !== this._lastViewport) {
      this._lastViewport = viewportKey;
      if (this.onViewportChange) {
        this._debounceTimer && clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
          this.onViewportChange({ visibleIds, visibleNodes, viewport: { viewLeft, viewTop, viewRight, viewBottom } });
        }, 50); // 50ms防抖
      }
    }

    return visibleIds;
  }

  /**
   * 检测可视区域变化并触发回调
   */
  _detect() {
    // 由 detectVisibleNodeIds 内部处理
  }

  /**
   * 清理
   */
  destroy() {
    this._debounceTimer && clearTimeout(this._debounceTimer);
    this._debounceTimer = null;
  }
}

/**
 * 动态节点加载器
 * 根据可视区域动态加载/卸载节点
 */
class DynamicNodeLoader {
  constructor() {
    this.allNodes = [];
    this.visibleNodes = [];
    this.visibleIds = new Set();
    this.padding = 100; // 可视区域外缓冲距离（像素）
    this.maxNodes = 80; // 最大渲染节点数
    this.onNodesUpdate = null;
  }

  /**
   * 设置所有节点
   */
  setAllNodes(nodes, connections) {
    this.allNodes = nodes;
    this.connections = connections;
    this._updateVisibleNodes();
  }

  /**
   * 更新可视区域，返回需要渲染的节点
   */
  updateViewport(viewport) {
    if (!viewport) return { nodes: [], connections: [] };

    const { visibleIds, visibleNodes } = viewport;
    this.visibleIds = visibleIds;
    this.visibleNodes = visibleNodes;

    // 如果节点太多，只渲染可视区域附近的节点
    let renderNodes = visibleNodes;
    if (visibleNodes.length > this.maxNodes) {
      // 按距离可视区域中心排序，取最近的maxNodes个
      const centerX = (viewport.viewport.viewLeft + viewport.viewport.viewRight) / 2;
      const centerY = (viewport.viewport.viewTop + viewport.viewport.viewBottom) / 2;

      const sorted = [...visibleNodes].sort((a, b) => {
        const distA = Math.abs(a.x + 60 - centerX) + Math.abs(a.y + 30 - centerY);
        const distB = Math.abs(b.x + 60 - centerX) + Math.abs(b.y + 30 - centerY);
        return distA - distB;
      });

      renderNodes = sorted.slice(0, this.maxNodes);
    }

    // 过滤连接线：只保留两端节点都在可视区域内的
    const renderIds = new Set(renderNodes.map(n => n.id));
    const renderConnections = this.connections?.filter(c => {
      // 配偶线：两端都需要在可视区域
      if (c.isSpouse) return renderIds.has(c.fromId) && renderIds.has(c.toId);
      // 其他连线：至少一端在可视区域内
      return renderIds.has(c.fromId) || renderIds.has(c.toId);
    }) || [];

    this._lastRenderNodes = renderNodes;
    this._lastRenderConnections = renderConnections;

    if (this.onNodesUpdate) {
      this.onNodesUpdate({ nodes: renderNodes, connections: renderConnections, visibleCount: renderNodes.length });
    }

    return { nodes: renderNodes, connections: renderConnections };
  }

  /**
   * 更新可视节点（旧API兼容）
   */
  _updateVisibleNodes() {
    // 兼容旧API
  }

  /**
   * 获取渲染统计
   */
  getStats() {
    return {
      total: this.allNodes.length,
      visible: this.visibleNodes.length,
      rendered: this._lastRenderNodes?.length || 0,
      maxRender: this.maxNodes,
    };
  }
}

/**
 * 树状图动态加载（树结构专用）
 * 基于展开/折叠状态 + 可视区域检测
 */
class TreeDynamicLoader {
  constructor() {
    this.treeRoot = null;
    this.expandedNodes = new Set();
    this.allNodes = [];
    this.visibleIds = new Set();
    this.padding = 100;
    this.maxNodes = 80;
    this.onNodesUpdate = null;
  }

  /**
   * 设置树根
   */
  setTree(root, expandedNodes) {
    this.treeRoot = root;
    this.expandedNodes = expandedNodes;

    // 根据展开状态计算所有可见节点
    this.allNodes = this._getVisibleTreeNodes(root, expandedNodes);
  }

  /**
   * 获取树中可见的节点（基于展开状态）
   */
  _getVisibleTreeNodes(node, expanded, depth = 0, visited = new Map()) {
    if (!node) return [];

    // 防止循环引用
    if (visited.has(node.id)) return [];
    visited.set(node.id, true);

    const result = [node];

    if (node.children && node.children.length > 0 && expanded.has(node.id)) {
      for (const child of node.children) {
        result.push(...this._getVisibleTreeNodes(child, expanded, depth + 1, visited));
      }
    }

    return result;
  }

  /**
   * 更新可视区域，返回需要渲染的节点
   */
  updateViewport(viewport) {
    if (!viewport || !this.allNodes.length) return { nodes: [], connections: [] };

    // 使用可视区域检测过滤
    const visibleIds = viewport.visibleIds;
    if (visibleIds.size === 0) return { nodes: [], connections: [] };

    // 过滤出可视区域内的节点
    let renderNodes = this.allNodes.filter(n => visibleIds.has(n.id));

    // 如果节点太多，限制渲染数量
    if (renderNodes.length > this.maxNodes) {
      const centerX = (viewport.viewport.viewLeft + viewport.viewport.viewRight) / 2;
      const centerY = (viewport.viewport.viewTop + viewport.viewport.viewBottom) / 2;

      renderNodes.sort((a, b) => {
        const distA = Math.abs(a.x + 60 - centerX) + Math.abs(a.y + 30 - centerY);
        const distB = Math.abs(b.x + 60 - centerX) + Math.abs(b.y + 30 - centerY);
        return distA - distB;
      });

      renderNodes = renderNodes.slice(0, this.maxNodes);
    }

    // 过滤连接线
    const renderIds = new Set(renderNodes.map(n => n.id));
    const renderConnections = this.connections?.filter(c =>
      renderIds.has(c.fromId) || renderIds.has(c.toId)
    ) || [];

    this._lastRenderNodes = renderNodes;
    this._lastRenderConnections = renderConnections;

    if (this.onNodesUpdate) {
      this.onNodesUpdate({ nodes: renderNodes, connections: renderConnections, visibleCount: renderNodes.length });
    }

    return { nodes: renderNodes, connections: renderConnections };
  }

  /**
   * 获取渲染统计
   */
  getStats() {
    return {
      totalInTree: this._countTreeNodes(this.treeRoot),
      visibleByExpand: this.allNodes.length,
      rendered: this._lastRenderNodes?.length || 0,
      maxRender: this.maxNodes,
    };
  }

  _countTreeNodes(node) {
    if (!node) return 0;
    return 1 + (node.children?.reduce((sum, c) => sum + this._countTreeNodes(c), 0) || 0);
  }
}

export {
  ViewportDetector,
  DynamicNodeLoader,
  TreeDynamicLoader,
};
