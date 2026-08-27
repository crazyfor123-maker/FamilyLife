// ===== 中间件：JWT 认证 + F1.10 分级权限体系 =====
const jwt = require('jsonwebtoken');
const { get } = require('../config/db');

const SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');

// ===== JWT 认证 =====
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ code: 10005, message: '登录态失效' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 10005, message: '登录态失效' });
  }
}

// ===== 可选认证 =====
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded;
    } catch (err) {
      // 忽略错误
    }
  }
  next();
}

// ===== F1.10 权限校验：检查用户在指定空间的角色 =====
// 使用方式：router.get('/xxx', authenticate, requireSpaceRole('owner'), handler)
function requireSpaceRole(...roles) {
  return async (req, res, next) => {
    const spaceId = req.params.spaceId || req.body?.space_id;
    if (!spaceId) return next(); // 无空间ID则跳过

    const member = await get(
      'SELECT role FROM space_member WHERE space_id = ? AND user_id = ?',
      [spaceId, req.user.user_id]
    );

    if (!member) {
      return res.status(403).json({ code: 20001, message: '无权访问此家族空间' });
    }

    if (!roles.includes(member.role)) {
      return res.status(403).json({ code: 20001, message: '您没有权限执行此操作' });
    }

    // 将角色信息附加到请求
    req.user.role = member.role;
    req.user.spaceId = spaceId;
    next();
  };
}

// ===== F1.10 权限过滤：根据角色过滤读操作结果 =====
// 使用方式：在 handler 中调用 filterByRole(rows, user.role, userId)
function filterByRole(rows, role, userId) {
  // owner 和 editor 看到全部数据
  if (role === 'owner' || role === 'editor') return rows;
  // member 只能看到自己的数据（is_self=1）
  return rows.filter(r => r.is_self === 1 || r.created_by === userId);
}

module.exports = { authenticate, optionalAuth, requireSpaceRole, filterByRole, SECRET };
