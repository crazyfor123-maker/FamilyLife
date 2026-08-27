// ===== API 封装：关系模块 =====
import { get, post, put, del } from './request';

export async function getRelationTypes() {
  return get('/kinship/types');
}

export async function createRelation(spaceId, data) {
  return post(`/kinship/${spaceId}/create`, data);
}

export async function updateRelation(spaceId, kinshipId, data) {
  return put(`/kinship/${spaceId}/${kinshipId}`, data);
}

export async function deleteRelation(spaceId, kinshipId) {
  return del(`/kinship/${spaceId}/${kinshipId}`);
}

export async function updateRelationNote(spaceId, kinshipId, note) {
  return post(`/kinship/${spaceId}/${kinshipId}/note`, { note });
}

export async function validateRelations(spaceId) {
  return post(`/kinship/${spaceId}/validate`);
}

export async function getPersonRelations(spaceId, personId) {
  return get(`/kinship/${spaceId}/${personId}/relations`);
}

// ===== 族谱数据转换工具 =====

/**
 * 将关系列表转换为树形结构
 */
export function buildFamilyTree(relations, persons, rootId) {
  const personMap = {};
  persons.forEach(p => {
    personMap[p.id] = {
      ...p,
      children: [],
      spouse: null,
      expanded: true,
    };
  });

  relations.forEach(r => {
    if (r.relation_type === 'parent_child' || r.relation_type === 'child_parent') {
      const parentId = r.relation_type === 'parent_child' ? r.from_id : r.to_id;
      const childId = r.relation_type === 'parent_child' ? r.to_id : r.from_id;
      if (personMap[parentId] && personMap[childId]) {
        personMap[parentId].children.push(personMap[childId]);
      }
    }
    if (r.relation_type === 'spouse') {
      if (personMap[r.from_id] && personMap[r.to_id]) {
        personMap[r.from_id].spouse = personMap[r.to_id];
        personMap[r.to_id].spouse = personMap[r.from_id];
      }
    }
  });

  return personMap[rootId] || null;
}

/**
 * 将树形结构展平为节点列表
 */
export function flattenTree(tree, depth = 0, index = 0) {
  if (!tree) return [];
  return [
    { ...tree, depth, index, x: 0, y: 0, visible: true },
    ...tree.children.flatMap((child, i) => flattenTree(child, depth + 1, i)),
    ...(tree.spouse ? [{
      ...tree.spouse,
      depth,
      index: index + 0.5,
      x: 0, y: 0,
      visible: true,
      isSpouse: true,
    }] : []),
  ];
}

/**
 * 计算节点在 SVG 中的位置
 */
export function layoutTree(nodes, nodeWidth = 100, nodeHeight = 50, hGap = 20, vGap = 80) {
  const depthMap = {};
  nodes.forEach(node => {
    if (!depthMap[node.depth]) depthMap[node.depth] = [];
    depthMap[node.depth].push(node);
  });

  const depths = Object.keys(depthMap).map(Number).sort((a, b) => a - b);
  const totalWidth = depths.length * (nodeWidth + hGap) - hGap;

  depths.forEach((depth, di) => {
    const levelNodes = depthMap[depth];
    const levelWidth = levelNodes.length * (nodeWidth + hGap) - hGap;
    const startX = (totalWidth - levelWidth) / 2;
    levelNodes.forEach((node, ni) => {
      node.x = startX + ni * (nodeWidth + hGap);
      node.y = depth * (nodeHeight + vGap);
    });
  });

  return nodes;
}

/**
 * 展开/收拢子树
 */
export function toggleExpand(tree, nodeId) {
  if (!tree) return tree;
  if (String(tree.id) === String(nodeId)) {
    return { ...tree, expanded: !tree.expanded };
  }
  return {
    ...tree,
    children: tree.children.map(c => toggleExpand(c, nodeId)),
    spouse: tree.spouse ? toggleExpand(tree.spouse, nodeId) : null,
  };
}

/**
 * 搜索节点
 */
export function findNode(tree, predicate) {
  if (!tree) return null;
  if (predicate(tree)) return tree;
  for (const child of (tree.children || [])) {
    const found = findNode(child, predicate);
    if (found) return found;
  }
  if (tree.spouse) {
    const found = findNode(tree.spouse, predicate);
    if (found) return found;
  }
  return null;
}

/**
 * 获取所有后代节点
 */
export function getAllDescendants(tree) {
  if (!tree) return [];
  let result = [];
  for (const child of (tree.children || [])) {
    result.push(child);
    result = result.concat(getAllDescendants(child));
  }
  return result;
}

/**
 * 从 MockData.familyTree 构建人物数据
 */
export function buildPersonsFromTree(familyTree) {
  const persons = [];
  const personMap = {};

  function walk(node) {
    if (!node) return;
    if (!personMap[node.id]) {
      const mockPerson = MockData.members.find(m => m.id === node.id);
      if (mockPerson) {
        personMap[node.id] = {
          id: node.id,
          name: mockPerson.name,
          gender: mockPerson.gender,
          birthYear: mockPerson.birthYear,
          deathYear: mockPerson.deathYear,
          status: mockPerson.status,
          avatar: mockPerson.avatar,
          bio: mockPerson.bio,
          relation: mockPerson.relation,
        };
        persons.push(personMap[node.id]);
      }
    }
    if (node.spouse && !personMap[node.spouse]) {
      const mockPerson = MockData.members.find(m => m.id === node.spouse);
      if (mockPerson) {
        personMap[node.spouse] = {
          id: node.spouse,
          name: mockPerson.name,
          gender: mockPerson.gender,
          birthYear: mockPerson.birthYear,
          deathYear: mockPerson.deathYear,
          status: mockPerson.status,
          avatar: mockPerson.avatar,
          bio: mockPerson.bio,
          relation: mockPerson.relation,
        };
        persons.push(personMap[node.spouse]);
      }
    }
    if (node.children) {
      node.children.forEach(walk);
    }
  }

  walk(familyTree);
  return persons;
}

/**
 * 生成 SVG 族谱的节点路径
 */
export function generateConnectionPaths(nodes) {
  const paths = [];
  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  const tree = MockData.familyTree;
  function walkConnections(node) {
    if (!node) return;
    if (node.children) {
      node.children.forEach(child => {
        const parent = nodeMap[node.id];
        const childNode = nodeMap[child.id];
        if (parent && childNode) {
          const x1 = parent.x + 50;
          const y1 = parent.y + 25;
          const x2 = childNode.x + 50;
          const y2 = childNode.y;
          const midY = (y1 + y2) / 2;
          paths.push({
            d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
            fromId: node.id, fromX: parent.x, fromY: parent.y,
            toId: child.id, toX: childNode.x, toY: childNode.y,
          });
        }
        walkConnections(child);
      });
    }
    if (node.spouse) {
      const parent = nodeMap[node.id];
      const spouseNode = nodeMap[node.spouse];
      if (parent && spouseNode) {
        paths.push({
          d: `M ${parent.x + 50} ${parent.y + 25} L ${spouseNode.x + 50} ${spouseNode.y + 25}`,
          fromId: node.id, fromX: parent.x, fromY: parent.y,
          toId: node.spouse, toX: spouseNode.x, toY: spouseNode.y,
          isSpouse: true,
        });
      }
      walkConnections(node.spouse);
    }
  }

  walkConnections(tree);
  return paths;
}
