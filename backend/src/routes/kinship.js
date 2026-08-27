// ===== F3.10 关系类型定义 & F3.11 关系建立 & F3.12 关系编辑 & F3.13 关系删除 & F3.14 关系备注 & F3.17 关系校验 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate, requireSpaceRole } = require('../middleware/auth');
const { ERROR_CODES } = require('../utils/helpers');

// ===== F3.10 关系类型定义（系统预定义，只读） =====
router.get('/types', async (req, res) => {
  const baseTypes = [
    { code: 'father', name: '父亲', direction: 'parent', nature: '直系血亲' },
    { code: 'mother', name: '母亲', direction: 'parent', nature: '直系血亲' },
    { code: 'son', name: '儿子', direction: 'child', nature: '直系血亲' },
    { code: 'daughter', name: '女儿', direction: 'child', nature: '直系血亲' },
    { code: 'husband', name: '丈夫', direction: 'spouse', nature: '姻亲' },
    { code: 'wife', name: '妻子', direction: 'spouse', nature: '姻亲' },
    { code: 'brother', name: '兄弟', direction: 'sibling', nature: '旁系血亲' },
    { code: 'sister', name: '姐妹', direction: 'sibling', nature: '旁系血亲' },
  ];
  const specialTypes = [
    { code: 'step_father', name: '继父', direction: 'parent', nature: '收养/过继' },
    { code: 'step_mother', name: '继母', direction: 'parent', nature: '收养/过继' },
    { code: 'adoptive_father', name: '养父', direction: 'parent', nature: '收养/过继' },
    { code: 'adoptive_mother', name: '养母', direction: 'parent', nature: '收养/过继' },
    { code: 'adopted_son', name: '养子', direction: 'child', nature: '收养/过继' },
    { code: 'adopted_daughter', name: '养女', direction: 'child', nature: '收养/过继' },
    { code: 'ex_husband', name: '前夫', direction: 'spouse', nature: '离异' },
    { code: 'ex_wife', name: '前妻', direction: 'spouse', nature: '离异' },
    { code: 'illegitimate', name: '私生子', direction: 'child', nature: '直系血亲' },
    { code: 'no_children', name: '无子嗣', direction: 'none', nature: '特殊标记' },
  ];

  res.json({ code: 0, data: { base: baseTypes, special: specialTypes } });
});

// ===== 反向关系映射 =====
const REVERSE_MAP = {
  father: 'son', mother: 'son',  // 父亲→儿子（需性别判断）
  son: 'father', daughter: 'mother',  // 儿子→父亲，女儿→母亲
  husband: 'wife', wife: 'husband',  // 配偶互换
  brother: 'brother', sister: 'sister',  // 兄弟姐妹互换
  step_father: 'step_son', step_mother: 'step_daughter',
  adoptive_father: 'adopted_son', adoptive_mother: 'adopted_daughter',
  adopted_son: 'adoptive_father', adopted_daughter: 'adoptive_mother',
  ex_husband: 'ex_wife', ex_wife: 'ex_husband',
};

// 根据性别确定反向关系
function getReverseRelation(type, gender) {
  if (type === 'father') return gender === 'male' ? 'son' : 'daughter';
  if (type === 'mother') return gender === 'male' ? 'son' : 'daughter';
  if (type === 'son') return 'father';
  if (type === 'daughter') return 'mother';
  return REVERSE_MAP[type] || type;
}

// ===== F3.11 关系建立 =====
router.post('/:spaceId/create', authenticate, requireSpaceRole('owner', 'editor'), async (req, res) => {
  const { spaceId } = req.params;
  const { personA_id, personB_id, relation_type, start_date, status } = req.body;

  if (!personA_id || !personB_id || !relation_type) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '缺少必填参数' });
  }

  // 检查两人是否已存在相同关系
  const existing = await get(
    'SELECT * FROM kinship WHERE (person_a_id = ? AND person_b_id = ? AND relation_type = ?) OR (person_a_id = ? AND person_b_id = ? AND relation_type = ?)',
    [personA_id, personB_id, relation_type, personB_id, personA_id, relation_type]
  );
  if (existing) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '两人之间已存在该关系' });
  }

  // 获取两人信息用于辈分校验
  const personA = await get('SELECT * FROM person_profile WHERE person_id = ?', [personA_id]);
  const personB = await get('SELECT * FROM person_profile WHERE person_id = ?', [personB_id]);
  if (!personA || !personB) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '人物档案不存在' });
  }

  // 性别一致性校验：personA是关系主体（被描述的人）
  // 例如：A是B的father，则A应该是男性
  if (['father', 'step_father', 'adoptive_father', 'husband', 'ex_husband'].includes(relation_type) && personA.gender !== 'male') {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: `${personA.name}是男性，不能是父亲/丈夫` });
  }
  if (['mother', 'step_mother', 'adoptive_mother', 'wife', 'ex_wife'].includes(relation_type) && personA.gender !== 'female') {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: `${personA.name}是女性，不能是母亲/妻子` });
  }

  // 反向关系性别校验
  const reverseType = getReverseRelation(relation_type, personB.gender);
  const reverseGenderMap = {
    father: 'female', mother: 'male', son: 'female', daughter: 'male',
    husband: 'female', wife: 'male', brother: null, sister: null,
    step_father: 'female', step_mother: 'male',
    adoptive_father: 'female', adoptive_mother: 'male',
    adopted_son: 'male', adopted_daughter: 'female',
    ex_husband: 'female', ex_wife: 'male',
  };
  const expectedGender = reverseGenderMap[reverseType];
  if (expectedGender && personB.gender !== expectedGender) {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: `${personB.name}的性别(${personB.gender})与反向关系"${reverseType}"不匹配` });
  }

  // 建立正向关系
  await run(
    'INSERT INTO kinship (relation_id, space_id, person_a_id, person_b_id, relation_type, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), spaceId, personA_id, personB_id, relation_type, start_date || null, status || null]
  );

  // 自动建立反向关系
  const reverseType2 = getReverseRelation(relation_type, personB.gender);
  await run(
    'INSERT INTO kinship (relation_id, space_id, person_a_id, person_b_id, relation_type) VALUES (?, ?, ?, ?, ?)',
    [uuidv4(), spaceId, personB_id, personA_id, reverseType2]
  );

  // 关系建立后自动校验
  const issues = await validateRelationships(spaceId);

  res.json({
    code: 0,
    message: '关系建立成功',
    data: {
      reverse_relation: { type: reverseType, person: personA.name },
      validation_issues: issues,
    },
  });
});

// ===== F3.12 关系编辑 =====
router.put('/:spaceId/:kinshipId', authenticate, requireSpaceRole('owner', 'editor'), async (req, res) => {
  const { spaceId, kinshipId } = req.params;
  const { relation_type, start_date, status, note } = req.body;

  const kinship = await get(
    'SELECT * FROM kinship WHERE relation_id = ? AND space_id = ?',
    [kinshipId, spaceId]
  );
  if (!kinship) {
    return res.status(404).json({ code: ERROR_CODES.INVALID_PARAMS, message: '关系不存在' });
  }

  const updates = [];
  const values = [];
  if (relation_type) { updates.push('relation_type = ?'); values.push(relation_type); }
  if (start_date !== undefined) { updates.push('start_date = ?'); values.push(start_date); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (note !== undefined) { updates.push('note = ?'); values.push(note); }

  if (updates.length === 0) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '无更新内容' });
  }

  values.push(kinshipId);
  await run(`UPDATE kinship SET ${updates.join(', ')} WHERE relation_id = ?`, values);

  res.json({ code: 0, message: '关系已更新' });
});

// ===== F3.13 关系删除 =====
router.delete('/:spaceId/:kinshipId', authenticate, requireSpaceRole('owner', 'editor'), async (req, res) => {
  const { spaceId, kinshipId } = req.params;

  const kinship = await get(
    'SELECT * FROM kinship WHERE relation_id = ? AND space_id = ?',
    [kinshipId, spaceId]
  );
  if (!kinship) {
    return res.status(404).json({ code: ERROR_CODES.INVALID_PARAMS, message: '关系不存在' });
  }

  // 获取关系双方信息
  const personMap = {};
  const [personA, personB] = await Promise.all([
    get('SELECT gender FROM person_profile WHERE person_id = ?', [kinship.person_a_id]),
    get('SELECT gender FROM person_profile WHERE person_id = ?', [kinship.person_b_id]),
  ]);

  // 删除正向关系
  await run('DELETE FROM kinship WHERE relation_id = ?', [kinshipId]);
  // 删除所有反向关系（可能有多个）
  const reverseType = getReverseRelation(kinship.relation_type, personMap[kinship.person_b_id]?.gender || null);
  await run('DELETE FROM kinship WHERE person_a_id = ? AND person_b_id = ? AND relation_type = ?',
    [kinship.person_b_id, kinship.person_a_id, reverseType]);

  res.json({ code: 0, message: '关系已删除' });
});

// ===== F3.14 关系备注 =====
router.post('/:spaceId/:kinshipId/note', authenticate, requireSpaceRole('owner', 'editor'), async (req, res) => {
  const { kinshipId } = req.params;
  const { note } = req.body;

  if (!note) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '备注内容不能为空' });
  }

  await run('UPDATE kinship SET note = ? WHERE relation_id = ?', [note, kinshipId]);
  res.json({ code: 0, message: '备注已更新' });
});

// ===== F3.17 关系校验 =====
router.post('/:spaceId/validate', authenticate, requireSpaceRole('owner'), async (req, res) => {
  const { spaceId } = req.params;

  const issues = await validateRelationships(spaceId);

  res.json({
    code: 0,
    message: issues.length > 0 ? '发现异常' : '族谱关系正常',
    data: {
      total_issues: issues.length,
      by_type: {
        circular: issues.filter(i => i.type === 'circular').length,
        generation: issues.filter(i => i.type === 'generation').length,
        gender: issues.filter(i => i.type === 'gender').length,
        polygamy: issues.filter(i => i.type === 'polygamy').length,
        date: issues.filter(i => i.type === 'date').length,
        orphan: issues.filter(i => i.type === 'orphan').length,
        isolated: issues.filter(i => i.type === 'isolated').length,
      },
      issues,
    },
  });
});

// 校验函数
async function validateRelationships(spaceId) {
  const issues = [];
  const kinships = await all('SELECT * FROM kinship WHERE space_id = ?', [spaceId]);
  const people = await all('SELECT * FROM person_profile WHERE space_id = ?', [spaceId]);

  if (kinships.length === 0 || people.length === 0) {
    return issues;
  }

  // 1. 循环关系检测
  const personMap = {};
  people.forEach(p => { personMap[p.person_id] = p; });

  // 2. 性别一致性校验
  for (const k of kinships) {
    const personA = personMap[k.person_a_id];
    if (!personA) continue;

    if (['father', 'step_father', 'adoptive_father', 'husband', 'ex_husband'].includes(k.relation_type) && personA.gender !== 'male') {
      issues.push({
        type: 'gender',
        person_id: k.person_a_id,
        description: `人物 ${k.person_a_id} 性别为${personA.gender}，但关系类型为"${k.relation_type}"`,
        suggestion: '请修正关系类型或人物性别',
      });
    }
    if (['mother', 'step_mother', 'adoptive_mother', 'wife', 'ex_wife'].includes(k.relation_type) && personA.gender !== 'female') {
      issues.push({
        type: 'gender',
        person_id: k.person_a_id,
        description: `人物 ${k.person_a_id} 性别为${personA.gender}，但关系类型为"${k.relation_type}"`,
        suggestion: '请修正关系类型或人物性别',
      });
    }
  }

  // 3. 多配偶合理性（两段在世婚姻）
  const activeSpouses = await all(
    'SELECT person_a_id, person_b_id, status FROM kinship WHERE space_id = ? AND relation_type IN ("husband","wife") AND (status IS NULL OR status = "active")',
    [spaceId]
  );
  const spouseCounts = {};
  for (const s of activeSpouses) {
    spouseCounts[s.person_a_id] = (spouseCounts[s.person_a_id] || 0) + 1;
  }
  for (const [personId, count] of Object.entries(spouseCounts)) {
    if (count > 1) {
      issues.push({
        type: 'polygamy',
        person_id: personId,
        description: `人物 ${personId} 有 ${count} 段在世婚姻，可能为重婚`,
        suggestion: '请核实婚姻状态',
      });
    }
  }

  // 4. 孤儿关系检测（只有单亲）
  const parentRelations = await all(
    'SELECT person_a_id, relation_type FROM kinship WHERE space_id = ? AND relation_type IN ("father","mother","step_father","step_mother","adoptive_father","adoptive_mother")',
    [spaceId]
  );
  const parentMap = {};
  for (const p of parentRelations) {
    if (!parentMap[p.person_a_id]) parentMap[p.person_a_id] = new Set();
    parentMap[p.person_a_id].add(p.relation_type);
  }
  for (const [personId, types] of Object.entries(parentMap)) {
    if (types.size < 2) {
      issues.push({
        type: 'orphan',
        person_id: personId,
        description: `人物 ${personId} 只记录了${types.size}位亲属，可能缺失另一方`,
        suggestion: '建议补充完整亲属关系',
      });
    }
  }

  // 5. 无关系人物检测
  const relatedPersons = new Set();
  for (const k of kinships) {
    relatedPersons.add(k.person_a_id);
    relatedPersons.add(k.person_b_id);
  }
  for (const p of people) {
    if (!relatedPersons.has(p.person_id)) {
      issues.push({
        type: 'isolated',
        person_id: p.person_id,
        description: `人物 ${p.name || p.person_id} 未建立任何亲属关系`,
        suggestion: '建议检查是否需要建立关系',
      });
    }
  }

  return issues;
}

// ===== 获取人物关系列表 =====
router.get('/:spaceId/:personId/relations', authenticate, async (req, res) => {
  const { spaceId, personId } = req.params;

  // 检查成员身份
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  const relations = await all(
    `SELECT k.*,
            pa.name as person_a_name, pa.gender as person_a_gender,
            pb.name as person_b_name, pb.gender as person_b_gender
     FROM kinship k
     JOIN person_profile pa ON k.person_a_id = pa.person_id
     LEFT JOIN person_profile pb ON k.person_b_id = pb.person_id
     WHERE k.space_id = ? AND (k.person_a_id = ? OR k.person_b_id = ?)
     ORDER BY
       CASE k.relation_type
         WHEN 'father' THEN 1 WHEN 'mother' THEN 2 WHEN 'husband' THEN 3 WHEN 'wife' THEN 4
         WHEN 'son' THEN 5 WHEN 'daughter' THEN 6
         WHEN 'brother' THEN 7 WHEN 'sister' THEN 8
         ELSE 99
       END`,
    [spaceId, personId, personId]
  );

  res.json({ code: 0, data: relations || [] });
});

// ===== F3.15 族谱可视化渲染 - 族谱数据 =====
router.get('/tree/:spaceId', authenticate, async (req, res) => {
  const { spaceId } = req.params;

  // 检查权限
  const member = await get(
    'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
    [spaceId, req.user.user_id]
  );
  if (!member) {
    return res.status(403).json({ code: ERROR_CODES.NO_PERMISSION, message: '您不是该家族成员' });
  }

  // 获取所有人物
  const people = await all(
    'SELECT * FROM person_profile WHERE space_id = ? ORDER BY generation ASC, birth_date ASC',
    [spaceId]
  );

  // 获取所有关系
  const relations = await all(
    'SELECT * FROM kinship WHERE space_id = ? AND status != "inactive"',
    [spaceId]
  );

  // 构建树形结构
  const personMap = {};
  for (const p of people) {
    personMap[p.person_id] = {
      ...p,
      children: [],
      parents: [],
      spouses: [],
      siblings: [],
    };
  }

  // 建立关系
  for (const r of relations) {
    const pa = personMap[r.person_a_id];
    const pb = personMap[r.person_b_id];
    if (!pa || !pb) continue;

    if (['father', 'mother', 'step_father', 'step_mother', 'adoptive_father', 'adoptive_mother'].includes(r.relation_type)) {
      // r.person_a 是 r.person_b 的父母
      if (personMap[r.person_b_id]) {
        personMap[r.person_b_id].parents.push({ ...r, direction: 'to_parent' });
      }
      if (personMap[r.person_a_id]) {
        personMap[r.person_a_id].children.push({ ...r, direction: 'to_child' });
      }
    } else if (r.relation_type === 'husband' || r.relation_type === 'wife') {
      pa.spouses.push({ ...r, direction: 'to_spouse' });
      pb.spouses.push({ ...r, direction: 'to_spouse' });
    } else if (r.relation_type === 'brother' || r.relation_type === 'sister') {
      pa.siblings.push({ ...r, direction: 'to_sibling' });
      pb.siblings.push({ ...r, direction: 'to_sibling' });
    }
  }

  // 找出根节点（没有父母的人物）
  const roots = people.filter(p => !personMap[p.person_id]?.parents?.length);

  res.json({
    code: 0,
    data: {
      people: people,
      relations: relations,
      roots: roots.map(p => personMap[p.person_id]),
      person_map: personMap,
      total_people: people.length,
      total_relations: relations.length,
    },
  });
});

// ===== F3.16 族谱交互 - 搜索人物 =====
router.get('/tree/:spaceId/search', authenticate, async (req, res) => {
  const { spaceId } = req.params;
  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '请输入搜索关键词' });
  }

  const results = await all(
    'SELECT * FROM person_profile WHERE space_id = ? AND (name LIKE ? OR bio LIKE ?) LIMIT 20',
    [spaceId, `%${keyword}%`, `%${keyword}%`]
  );

  res.json({ code: 0, data: results || [] });
});

module.exports = router;
