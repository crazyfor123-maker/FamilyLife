// ===== AI路由 =====
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const aiService = require('../services/ai');
const { get, all, run } = require('../config/db');

// GET /api/ai/config - 获取AI配置
router.get('/config', authenticate, (req, res) => {
  res.json({ code: 0, data: aiService.getAIConfig() });
});

// POST /api/ai/test-connection - 测试AI连接
router.post('/test-connection', authenticate, (req, res) => {
  res.json({ code: 0, data: aiService.testConnection() });
});

// POST /api/ai/generate-question - AI生成下一个问题
router.post('/generate-question', authenticate, async (req, res) => {
  const { session_id, conversation_history, outline, current_question_index } = req.body;

  if (!session_id) {
    return res.status(400).json({ code: 1, message: '会话ID不能为空' });
  }

  // 保存对话历史到数据库
  if (conversation_history) {
    for (const msg of conversation_history) {
      await run(
        'INSERT INTO ai_conversations (session_id, role, content, model) VALUES (?, ?, ?, ?)',
        [session_id, msg.role || 'user', msg.content || '', 'local']
      );
    }
  }

  const question = aiService.generateQuestionLocal({
    conversationHistory: conversation_history || [],
    outline,
    currentQuestionIndex: current_question_index || 0,
  });

  // 保存AI回复
  await run(
    'INSERT INTO ai_conversations (session_id, role, content, model, tokens_used) VALUES (?, ?, ?, ?, 0)',
    [session_id, 'assistant', question.question, 'local']
  );

  res.json({ code: 0, data: question });
});

// POST /api/ai/generate-story - AI生成人生之书内容
router.post('/generate-story', authenticate, async (req, res) => {
  const { book_id, materials, style, chapter } = req.body;

  if (!book_id || !chapter) {
    return res.status(400).json({ code: 1, message: '书籍ID和章节名不能为空' });
  }

  const result = aiService.generateChapter(book_id, chapter, materials);

  // 保存生成记录
  await run(
    'INSERT INTO ai_analytics (session_id, analytics_type, analytics_data) VALUES (?, ?, ?)',
    [book_id, 'chapter_generation', JSON.stringify(result)]
  );

  res.json({ code: 0, data: result });
});

// POST /api/ai/analyze-material - 分析采访素材
router.post('/analyze-material', authenticate, async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ code: 1, message: '会话ID不能为空' });
  }

  const result = aiService.analyzeMaterials(session_id);

  await run(
    'INSERT INTO ai_analytics (session_id, analytics_type, analytics_data) VALUES (?, ?, ?)',
    [session_id, 'material_analysis', JSON.stringify(result)]
  );

  res.json({ code: 0, data: result });
});

// POST /api/ai/generate-followup - AI动态追问
router.post('/generate-followup', authenticate, async (req, res) => {
  const { session_id, answer_text, context } = req.body;

  if (!session_id || !answer_text) {
    return res.status(400).json({ code: 1, message: '会话ID和回答内容不能为空' });
  }

  const followUps = aiService.generateFollowUpSuggestions({
    conversationHistory: [{ answer: answer_text }],
  });

  res.json({ code: 0, data: { follow_up_questions: followUps } });
});

// GET /api/ai/prompts - 获取所有Prompt模板
router.get('/prompts', authenticate, (req, res) => {
  res.json({ code: 0, data: aiService.PROMPT_TEMPLATES });
});

module.exports = router;
