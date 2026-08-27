// ===== F1.1 手机号验证码登录 & F1.2 自动登录 =====
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { validatePhone, generateToken, hoursFromNow, daysFromNow, ERROR_CODES } = require('../utils/helpers');
const { optionalAuth } = require('../middleware/auth');

// ===== 发送验证码 =====
router.post('/send-code', async (req, res) => {
  const { phone } = req.body;

  if (!phone || !validatePhone(phone)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PHONE, message: '请输入正确的手机号' });
  }

  // 检查今日发送次数
  const today = new Date().toISOString().replace('T', ' ').slice(0, 10);
  const countResult = await get(
    "SELECT COUNT(*) as cnt FROM verification_code WHERE phone = ? AND date(created_at) = date(?)",
    [phone, today]
  );
  if (countResult.cnt >= 10) {
    return res.status(429).json({ code: ERROR_CODES.ACCOUNT_LOCKED, message: '今日发送次数已达上限(10次)' });
  }

  // 生成6位验证码
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = hoursFromNow(0.0833); // 5分钟

  await run(
    'INSERT INTO verification_code (phone, code, expires_at) VALUES (?, ?, ?)',
    [phone, code, expiresAt]
  );

  console.log(`📱 验证码 (${phone}): ${code}`);

  res.json({ code: 0, message: '验证码已发送', expiresIn: 300 });
});

// ===== 登录 =====
router.post('/login', async (req, res) => {
  const { phone, code } = req.body;

  // 手机号校验
  if (!phone || !validatePhone(phone)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PHONE, message: '请输入正确的手机号' });
  }

  // 验证码校验
  if (!code || code.length !== 6) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_CODE, message: '请输入6位验证码' });
  }

  // 查找最新的有效验证码
  const verification = await get(
    'SELECT * FROM verification_code WHERE phone = ? AND code = ? AND used = 0 AND expires_at >= NOW() ORDER BY created_at DESC LIMIT 1',
    [phone, code]
  );

  if (!verification) {
    // 检查是否被锁定（错误3次）
    const errorCount = await get(
      "SELECT COUNT(*) as cnt FROM verification_code WHERE phone = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
      [phone]
    );
    if (errorCount.cnt >= 3) {
      return res.status(429).json({ code: ERROR_CODES.ACCOUNT_LOCKED, message: '操作过于频繁，请15分钟后再试' });
    }
    return res.status(400).json({ code: ERROR_CODES.INVALID_CODE, message: '验证码错误，请重新输入' });
  }

  // 验证码过期
  if (verification.expires_at <= new Date().toISOString().replace('T', ' ').slice(0, 19)) {
    return res.status(400).json({ code: ERROR_CODES.CODE_EXPIRED, message: '验证码已过期，请重新获取' });
  }

  // 标记验证码已使用
  await run('UPDATE verification_code SET used = 1 WHERE id = ?', [verification.id]);

  // 查找或创建用户
  let user = await get('SELECT * FROM user_account WHERE phone = ?', [phone]);
  if (!user) {
    const userId = generateToken();
    const nickname = phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    await run(
      'INSERT INTO user_account (user_id, phone, nickname) VALUES (?, ?, ?)',
      [userId, phone, nickname]
    );
    user = { user_id: userId, phone, nickname, status: 'active' };
    console.log(`🆕 新用户注册: ${phone}`);
  }

  if (user.status === 'disabled') {
    return res.status(403).json({ code: ERROR_CODES.ACCOUNT_LOCKED, message: '账号已被锁定' });
  }

  // 生成登录Token（30天有效期）
  const token = jwt.sign({ user_id: user.user_id, phone: user.phone }, process.env.JWT_SECRET || 'family-life-record-secret-2024', { expiresIn: '30d' });

  // 更新登录时间
  await run('UPDATE user_account SET updated_at = NOW() WHERE user_id = ?', [user.user_id]);

  // 获取用户的家族空间
  const families = await all(
    `SELECT fs.*, sm.role FROM family_space fs
     JOIN space_member sm ON fs.space_id = sm.space_id
     WHERE sm.user_id = ?`,
    [user.user_id]
  );

  res.json({
    code: 0,
    message: '登录成功',
    data: {
      token,
      user: {
        user_id: user.user_id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      families: families || [],
    },
  });
});

// ===== 自动登录（Token验证） =====
router.post('/auto-login', optionalAuth, async (req, res) => {
  if (req.user) {
    const user = await get('SELECT * FROM user_account WHERE user_id = ?', [req.user.user_id]);
    if (!user || user.status === 'disabled') {
      return res.status(401).json({ code: ERROR_CODES.TOKEN_EXPIRED, message: '登录态失效' });
    }
    const families = await all(
      `SELECT fs.*, sm.role FROM family_space fs
       JOIN space_member sm ON fs.space_id = sm.space_id
       WHERE sm.user_id = ?`,
      [user.user_id]
    );
    return res.json({
      code: 0,
      isLoggedIn: true,
      user: { user_id: user.user_id, phone: user.phone, nickname: user.nickname, avatar: user.avatar },
      families: families || [],
    });
  }
  res.json({ code: 0, isLoggedIn: false });
});

// ===== 登出 =====
router.post('/logout', optionalAuth, async (req, res) => {
  res.json({ code: 0, message: '已退出登录' });
});

// ===== 获取用户信息 =====
router.get('/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ code: ERROR_CODES.TOKEN_EXPIRED, message: '未登录' });
  }
  const user = await get('SELECT * FROM user_account WHERE user_id = ?', [req.user.user_id]);
  if (!user) return res.status(404).json({ code: 90001, message: '用户不存在' });

  const families = await all(
    `SELECT fs.*, sm.role FROM family_space fs
     JOIN space_member sm ON fs.space_id = sm.space_id
     WHERE sm.user_id = ?`,
    [user.user_id]
  );

  res.json({ code: 0, data: { ...user, families } });
});

// ===== 更新用户信息 =====
router.put('/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ code: ERROR_CODES.TOKEN_EXPIRED, message: '未登录' });
  }
  const { nickname, avatar } = req.body;
  const updates = [];
  const params = [];
  if (nickname) { updates.push('nickname = ?'); params.push(nickname); }
  if (avatar) { updates.push('avatar = ?'); params.push(avatar); }
  if (updates.length === 0) return res.json({ code: 0, message: '无变更' });

  params.push(req.user.user_id);
  await run(`UPDATE user_account SET ${updates.join(', ')}, updated_at = NOW() WHERE user_id = ?`, params);
  res.json({ code: 0, message: '更新成功' });
});

module.exports = router;
