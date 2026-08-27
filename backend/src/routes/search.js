// ===== F9.1 全局搜索 =====
const express = require('express');
const router = express.Router();
const { get, all, run } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ===== 全局搜索（F9.1） =====
router.get('/search', authenticate, async (req, res) => {
  const { q, space_id, type } = req.query;

  if (!q || q.trim().length === 0) {
    return res.status(400).json({ code: 90002, message: '请输入搜索关键词' });
  }

  const keyword = `%${q.trim()}%`;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const results = {
    persons: [],
    stories: [],
    events: [],
    messages: [],
    books: [],
    total: { persons: 0, stories: 0, events: 0, messages: 0, books: 0 },
  };

  // 搜索人物
  if (!type || type === 'persons') {
    results.persons = await all(
      `SELECT * FROM person_profile WHERE space_id = ? AND (name LIKE ? OR bio LIKE ?)
       ORDER BY generation ASC, birth_date ASC
       LIMIT ? OFFSET ?`,
      [space_id, keyword, keyword, pageSize, offset]
    );
    const tp = await get('SELECT COUNT(*) as count FROM person_profile WHERE space_id = ? AND (name LIKE ? OR bio LIKE ?)', [space_id, keyword, keyword]);
    results.total.persons = tp?.count || 0;
  }

  // 搜索故事
  if (!type || type === 'stories') {
    results.stories = await all(
      `SELECT * FROM timeline_story WHERE space_id = ? AND (title LIKE ? OR content LIKE ?)
       ORDER BY happened_at DESC
       LIMIT ? OFFSET ?`,
      [space_id, keyword, keyword, pageSize, offset]
    );
    const ts = await get('SELECT COUNT(*) as count FROM timeline_story WHERE space_id = ? AND (title LIKE ? OR content LIKE ?)', [space_id, keyword, keyword]);
    results.total.stories = ts?.count || 0;
  }

  // 搜索大事记
  if (!type || type === 'events') {
    results.events = await all(
      `SELECT * FROM family_event WHERE space_id = ? AND (title LIKE ? OR description LIKE ?)
       ORDER BY event_date ASC
       LIMIT ? OFFSET ?`,
      [space_id, keyword, keyword, pageSize, offset]
    );
    const te = await get('SELECT COUNT(*) as count FROM family_event WHERE space_id = ? AND (title LIKE ? OR description LIKE ?)', [space_id, keyword, keyword]);
    results.total.events = te?.count || 0;
  }

  // 搜索留言
  if (!type || type === 'messages') {
    results.messages = await all(
      `SELECT * FROM family_message WHERE space_id = ? AND content LIKE ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [space_id, keyword, pageSize, offset]
    );
    const tm = await get('SELECT COUNT(*) as count FROM family_message WHERE space_id = ? AND content LIKE ?', [space_id, keyword]);
    results.total.messages = tm?.count || 0;
  }

  // 搜索书籍
  if (!type || type === 'books') {
    results.books = await all(
      `SELECT b.*, p.name as person_name FROM life_book b
       JOIN person_profile p ON b.person_id = p.person_id
       WHERE b.space_id = ? AND (b.title LIKE ? OR b.status LIKE ?)
       ORDER BY b.updated_at DESC
       LIMIT ? OFFSET ?`,
      [space_id, keyword, keyword, pageSize, offset]
    );
    const tb = await get('SELECT COUNT(*) as count FROM life_book b WHERE b.space_id = ? AND (b.title LIKE ? OR b.status LIKE ?)', [space_id, keyword, keyword]);
    results.total.books = tb?.count || 0;
  }

  res.json({ code: 0, data: { ...results, page, pageSize, totalPages: { persons: Math.ceil(results.total.persons / pageSize), stories: Math.ceil(results.total.stories / pageSize), events: Math.ceil(results.total.events / pageSize), messages: Math.ceil(results.total.messages / pageSize), books: Math.ceil(results.total.books / pageSize) } } });
});

module.exports = router;
