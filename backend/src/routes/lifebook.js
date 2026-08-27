// ===== F5.1 人生之书生成 & F5.2 书籍章节结构 & F5.3 版本管理 & F5.8 PDF导出 =====
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { get, all, run, exec } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { generateToken, ERROR_CODES } = require('../utils/helpers');

// ===== 获取人物的书籍列表 =====
router.get('/list/:personId', authenticate, async (req, res) => {
  const { personId } = req.params;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [personId]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  const books = await all(
    `SELECT b.*, p.name as person_name, bv.version_number as latest_version, bv.pages as latest_pages
     FROM life_book b
     LEFT JOIN person_profile p ON b.person_id = p.person_id
     LEFT JOIN book_version bv ON b.current_version_id = bv.version_id
     WHERE b.person_id = ?
     ORDER BY b.updated_at DESC`,
    [personId]
  );

  res.json({ code: 0, data: books });
});

// ===== 创建人生之书 =====
router.post('/create', authenticate, async (req, res) => {
  const { person_id, space_id, title, style } = req.body;

  const person = await get('SELECT * FROM person_profile WHERE person_id = ?', [person_id]);
  if (!person) {
    return res.status(404).json({ code: ERROR_CODES.PERSON_NOT_FOUND, message: '人物不存在' });
  }

  const bookId = generateToken();
  const bookStyle = style || 'narrative';

  await run(
    'INSERT INTO life_book (book_id, person_id, space_id, title, status, current_version_id) VALUES (?, ?, ?, ?, "draft", ?)',
    [bookId, person_id, space_id || null, title || `${person.name}的人生之书`, generateToken()]
  );

  // 创建第一版
  await run(
    'INSERT INTO book_version (version_id, book_id, version_number, chapters) VALUES (?, ?, 1, ?)',
    [generateToken(), bookId, JSON.stringify([])]
  );

  res.json({
    code: 0,
    message: '人生之书创建成功',
    data: { book_id: bookId, title: title || `${person.name}的人生之书` },
  });
});

// ===== 获取书籍详情 =====
router.get('/:bookId', authenticate, async (req, res) => {
  const { bookId } = req.params;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  const versions = await all(
    'SELECT * FROM book_version WHERE book_id = ? ORDER BY version_number DESC',
    [bookId]
  );

  res.json({ code: 0, data: { ...book, versions } });
});

// ===== 生成人生之书（F5.1） =====
router.post('/:bookId/generate', authenticate, async (req, res) => {
  const { bookId } = req.params;
  const { chapters } = req.body;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  // 获取采访素材
  const interviews = await all(
    'SELECT * FROM interview_qa WHERE session_id IN (SELECT session_id FROM interview_session WHERE person_id = ?) ORDER BY created_at',
    [book.person_id]
  );

  if (interviews.length === 0) {
    return res.status(400).json({ code: ERROR_CODES.INSUFFICIENT_MATERIALS, message: '素材不足，请先进行采访' });
  }

  // 创建新版本
  const versionId = generateToken();
  const versionNumber = (book.current_version_id ? parseInt(book.current_version_id.split('_').pop() || '0') + 1 : 1);
  const chaptersJson = chapters || JSON.stringify([]);

  await run(
    'INSERT INTO book_version (version_id, book_id, version_number, chapters, word_count) VALUES (?, ?, ?, ?, ?)',
    [versionId, bookId, versionNumber, chaptersJson, 0]
  );

  await run('UPDATE life_book SET current_version_id = ?, status = "published", updated_at = NOW() WHERE book_id = ?', [versionId, bookId]);

  res.json({
    code: 0,
    message: '人生之书生成成功',
    data: { version_id: versionId, interview_count: interviews.length },
  });
});

// ===== 编辑书籍内容（F5.5） =====
router.put('/:bookId', authenticate, async (req, res) => {
  const { bookId } = req.params;
  const { title, status, visibility, chapters } = req.body;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  const updates = [];
  const params = [];
  if (title) { updates.push('title = ?'); params.push(title); }
  if (status) { updates.push('status = ?'); params.push(status); }
  if (visibility) { updates.push('visibility = ?'); params.push(visibility); }
  if (chapters) { updates.push('chapters = ?'); params.push(JSON.stringify(chapters)); }

  if (updates.length === 0) return res.json({ code: 0, message: '无变更' });

  params.push(bookId);
  await run(
    `UPDATE life_book SET ${updates.join(', ')}, updated_at = NOW() WHERE book_id = ?`,
    params
  );

  res.json({ code: 0, message: '更新成功' });
});

// ===== F5.6 多媒体嵌入 - 添加照片到章节 =====
router.post('/:bookId/chapters/:chapterIndex/media', authenticate, async (req, res) => {
  const { bookId, chapterIndex } = req.params;
  const { media_type, media_url, caption } = req.body;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  if (!['photo', 'audio', 'video'].includes(media_type)) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '不支持的媒体类型' });
  }

  // 获取最新版本
  const version = await get('SELECT * FROM book_version WHERE book_id = ? ORDER BY version_number DESC LIMIT 1', [bookId]);
  if (!version) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍版本不存在' });
  }

  const chapters = JSON.parse(version.chapters || '[]');
  if (chapterIndex < 0 || chapterIndex >= chapters.length) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '章节索引无效' });
  }

  // 添加媒体到章节
  if (!chapters[chapterIndex].media) chapters[chapterIndex].media = [];
  chapters[chapterIndex].media.push({
    id: generateToken(),
    type: media_type,
    url: media_url,
    caption: caption || null,
    added_at: new Date().toISOString(),
  });

  await run(
    'UPDATE book_version SET chapters = ?, updated_at = NOW() WHERE version_id = ?',
    [JSON.stringify(chapters), version.version_id]
  );

  res.json({ code: 0, message: '媒体添加成功', data: { media_id: chapters[chapterIndex].media[chapters[chapterIndex].media.length - 1].id } });
});

// ===== F5.6 添加语音片段到章节 =====
router.post('/:bookId/chapters/:chapterIndex/audio', authenticate, async (req, res) => {
  const { bookId, chapterIndex } = req.params;
  const { audio_url, caption, start_time, end_time } = req.body;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  if (!audio_url) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '缺少音频URL' });
  }

  // 获取最新版本
  const version = await get('SELECT * FROM book_version WHERE book_id = ? ORDER BY version_number DESC LIMIT 1', [bookId]);
  if (!version) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍版本不存在' });
  }

  const chapters = JSON.parse(version.chapters || '[]');
  if (chapterIndex < 0 || chapterIndex >= chapters.length) {
    return res.status(400).json({ code: ERROR_CODES.INVALID_PARAMS, message: '章节索引无效' });
  }

  if (!chapters[chapterIndex].audio_segments) chapters[chapterIndex].audio_segments = [];
  chapters[chapterIndex].audio_segments.push({
    id: generateToken(),
    url: audio_url,
    caption: caption || null,
    start_time: start_time || 0,
    end_time: end_time || null,
    added_at: new Date().toISOString(),
  });

  await run(
    'UPDATE book_version SET chapters = ?, updated_at = NOW() WHERE version_id = ?',
    [JSON.stringify(chapters), version.version_id]
  );

  res.json({ code: 0, message: '语音片段添加成功', data: { audio_id: chapters[chapterIndex].audio_segments[chapters[chapterIndex].audio_segments.length - 1].id } });
});

// ===== 获取书籍版本列表（F5.3） =====
router.get('/:bookId/versions', authenticate, async (req, res) => {
  const { bookId } = req.params;

  const versions = await all(
    'SELECT * FROM book_version WHERE book_id = ? ORDER BY version_number DESC',
    [bookId]
  );

  res.json({ code: 0, data: versions });
});

// ===== PDF导出（F5.8） =====
router.post('/:bookId/export-pdf', authenticate, async (req, res) => {
  const { bookId } = req.params;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  if (book.status !== 'published') {
    return res.status(400).json({ code: ERROR_CODES.OPERATION_FAILED, message: '仅已发布的书籍可导出' });
  }

  // TODO: 实际PDF生成逻辑
  res.json({
    code: 0,
    message: 'PDF导出成功',
    data: { download_url: `/api/lifebook/${bookId}/pdf/download` },
  });
});

// ===== 删除书籍 =====
router.delete('/:bookId', authenticate, async (req, res) => {
  const { bookId } = req.params;

  const book = await get('SELECT * FROM life_book WHERE book_id = ?', [bookId]);
  if (!book) {
    return res.status(404).json({ code: ERROR_CODES.OPERATION_FAILED, message: '书籍不存在' });
  }

  await run('DELETE FROM book_version WHERE book_id = ?', [bookId]);
  await run('DELETE FROM life_book WHERE book_id = ?', [bookId]);
  res.json({ code: 0, message: '书籍已删除' });
});

module.exports = router;
