// ===== OT操作转换算法 =====
/**
 * 操作类型：insert, delete, format, replace
 */

/**
 * 转换两个操作，使得它们可以按任意顺序应用
 * @param {Object} op1 - 操作1
 * @param {Object} op2 - 操作2
 * @param {string} op1Type - 操作1类型
 * @param {string} op2Type - 操作2类型
 * @returns {Object} 转换后的操作
 */
function transformOp(op1, op2, op1Type, op2Type) {
  const pos1 = op1.position || op1.start || 0;
  const len1 = op1.length || (op1.text ? op1.text.length : 0);
  const pos2 = op2.position || op2.start || 0;
  const len2 = op2.length || (op2.text ? op2.text.length : 0);

  // 相同位置的操作需要特殊处理
  if (op1Type === 'insert' && op2Type === 'insert' && pos1 === pos2) {
    // 后发生的操作位置后移
    return { op: { ...op2, position: pos2 + len1 }, priority: 'op2' };
  }

  // 删除操作转换
  if (op1Type === 'delete' && op2Type === 'insert') {
    if (pos2 >= pos1 + len1) {
      // 插入在删除范围之后，位置不变
      return { op: { ...op2, position: pos2 }, priority: 'op1' };
    } else if (pos2 >= pos1) {
      // 插入在删除范围内，位置不变但长度调整
      return { op: { ...op2, position: pos2 }, priority: 'op1' };
    }
    return { op: { ...op2 }, priority: 'op1' };
  }

  if (op1Type === 'insert' && op2Type === 'delete') {
    if (pos1 >= pos2 + len2) {
      // 插入在删除范围之后，位置前移
      return { op: { ...op1, position: pos1 - len2 }, priority: 'op2' };
    } else if (pos1 >= pos2) {
      return { op: { ...op1, position: pos2 }, priority: 'op2' };
    }
    return { op: { ...op1 }, priority: 'op2' };
  }

  // 默认：位置不变
  return { op: { ...op2 }, priority: 'op2' };
}

/**
 * 应用操作到内容
 */
function applyOp(content, operation) {
  if (!content) return content;

  const { type, position, text, length } = operation;

  switch (type) {
    case 'insert':
      return content.slice(0, position) + text + content.slice(position);
    case 'delete':
      return content.slice(0, position) + content.slice(position + length);
    case 'replace':
      return content.slice(0, position) + text + content.slice(position + (length || 0));
    case 'format':
      return content; // 格式化不改变内容
    default:
      return content;
  }
}

/**
 * 检测冲突
 */
function detectConflict(ops) {
  const conflicts = [];
  for (let i = 0; i < ops.length; i++) {
    for (let j = i + 1; j < ops.length; j++) {
      const op1 = ops[i];
      const op2 = ops[j];
      const pos1 = op1.position || op1.start || 0;
      const pos2 = op2.position || op2.start || 0;
      const len1 = op1.length || (op1.text ? op1.text.length : 0);
      const len2 = op2.length || (op2.text ? op2.text.length : 0);

      // 检测位置重叠
      if (pos1 < pos2 + len2 && pos2 < pos1 + len1) {
        conflicts.push({
          op1,
          op2,
          type: 'position_overlap',
          position: Math.max(pos1, pos2),
        });
      }
    }
  }
  return conflicts;
}

/**
 * 操作序列化/反序列化
 */
function serializeOp(op) {
  return JSON.stringify(op);
}

function deserializeOp(str) {
  return JSON.parse(str);
}

module.exports = {
  transformOp,
  applyOp,
  detectConflict,
  serializeOp,
  deserializeOp,
};
