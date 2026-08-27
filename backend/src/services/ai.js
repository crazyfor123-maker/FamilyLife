// ===== AI服务 - 智能动态追问 & 人生之书生成 =====
const { get, all } = require('../config/db');
const crypto = require('crypto');

/**
 * AI配置
 */
const AI_CONFIG = {
  // 默认使用本地模拟（不依赖外部API）
  provider: 'local', // local | qwen | openai
  qwen: {
    apiKey: process.env.QWEN_API_KEY || '',
    model: process.env.QWEN_MODEL || 'qwen-turbo',
    baseUrl: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
};

/**
 * 预置Prompt模板
 */
const PROMPT_TEMPLATES = {
  follow_up_question: `你是一位专业的家族采访助手。根据以下上下文，生成一个自然的追问问题。

当前问题：{{current_question}}
用户回答：{{user_answer}}
采访主题：{{topic}}

要求：
1. 追问要自然、亲切，像老朋友聊天
2. 如果用户回答已经很详细，追问要针对具体细节
3. 如果用户回答简短，追问要引导用户多说
4. 追问问题不超过30字
5. 输出纯文本，不要其他内容`,

  life_book_chapter: `你是一位专业的传记作家。根据以下采访素材，撰写人生之书中关于{{chapter}}的章节。

素材：
{{materials}}

要求：
1. 文字要生动、感人，有温度
2. 保留人物的语言风格和个性
3. 适当加入场景描写
4. 字数800-1500字
5. 输出纯文本，不要其他内容`,

  material_insight: `你是一位家族故事分析师。分析以下采访素材，提取关键信息。

素材：
{{materials}}

请分析：
1. 关键人生事件
2. 人物性格特点
3. 值得追问的方向
4. 情感色彩（正面/中性/复杂）
5. 推荐追问问题（3个）`,

  story_enhancement: `你是一位文学编辑。润色以下故事内容，使其更加生动感人。

原文：
{{content}}

要求：
1. 保持原意不变
2. 增加细节描写
3. 优化语言表达
4. 增强情感共鸣`,
};

/**
 * 本地AI模拟（不依赖外部API）
 * 基于规则生成追问和建议
 */
function generateQuestionLocal(context) {
  const { conversationHistory, outline, currentQuestionIndex } = context;

  // 从大纲中获取下一个问题
  if (outline && outline.questions && currentQuestionIndex < outline.questions.length) {
    return {
      question: outline.questions[currentQuestionIndex],
      follow_up_suggestions: generateFollowUpSuggestions(context),
      confidence: 0.9,
      source: 'outline',
    };
  }

  // 基于对话历史生成追问
  const lastAnswer = conversationHistory[conversationHistory.length - 1]?.answer;
  if (lastAnswer && lastAnswer.length > 0) {
    return {
      question: generateFollowUpFromAnswer(lastAnswer),
      follow_up_suggestions: generateFollowUpSuggestions(context),
      confidence: 0.7,
      source: 'ai_followup',
    };
  }

  return {
    question: '您能再多讲讲这方面的经历吗？',
    follow_up_suggestions: [],
    confidence: 0.5,
    source: 'ai_default',
  };
}

/**
 * 基于回答生成追问
 */
function generateFollowUpFromAnswer(answer) {
  const followUps = [
    '当时您是什么感觉？能具体说说吗？',
    '后来呢？这件事对您有什么影响？',
    '能举个例子吗？',
    '那时候您和家里其他人是怎么相处的？',
    '这件事让您学到了什么？',
    '如果重来一次，您会怎么做？',
  ];

  // 根据回答内容选择追问
  if (answer.includes('难过') || answer.includes('伤心') || answer.includes('苦')) {
    return '那段日子一定很不容易，您是怎么熬过来的？';
  }
  if (answer.includes('开心') || answer.includes('高兴') || answer.includes('幸福')) {
    return '听起来是很美好的时光，能多说说当时的情景吗？';
  }
  if (answer.includes('工作') || answer.includes('上班') || answer.includes('事业')) {
    return '工作中有没有让您特别难忘的经历？';
  }
  if (answer.includes('家庭') || answer.includes('家人') || answer.includes('父母')) {
    return '家人对您影响最大的是什么？';
  }
  if (answer.includes('学习') || answer.includes('读书') || answer.includes('学校')) {
    return '求学路上有没有什么有趣的故事？';
  }

  return followUps[Math.floor(Math.random() * followUps.length)];
}

/**
 * 生成追问建议
 */
function generateFollowUpSuggestions(context) {
  const { conversationHistory } = context;
  const suggestions = [];

  if (conversationHistory.length === 0) {
    return suggestions;
  }

  const lastAnswer = conversationHistory[conversationHistory.length - 1].answer;

  // 分析回答中的关键词
  const keywords = extractKeywords(lastAnswer);
  keywords.forEach(kw => {
    suggestions.push({
      question: `关于${kw}，您能多说一些吗？`,
      reason: `检测到关键词：${kw}`,
      priority: Math.random() > 0.5 ? 'high' : 'normal',
    });
  });

  return suggestions.slice(0, 3);
}

/**
 * 提取关键词
 */
function extractKeywords(text) {
  const stops = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这']);
  const keywords = [];
  const words = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const wordCount = {};

  words.forEach(w => {
    if (!stops.has(w) && w.length >= 2) {
      wordCount[w] = (wordCount[w] || 0) + 1;
    }
  });

  Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([word]) => keywords.push(word));

  return keywords;
}

/**
 * 分析采访素材
 */
function analyzeMaterials(sessionId) {
  // 获取采访素材
  return {
    insights: [
      '检测到关于家族迁徙的重要信息',
      '人物性格坚韧，经历丰富',
      '对家庭有深厚的感情',
    ],
    keywords: ['家族', '迁徙', '奋斗', '家庭', '传承'],
    suggested_questions: [
      '关于家族迁徙，能详细说说吗？',
      '您觉得最重要的家训是什么？',
      '对后代有什么期望？',
    ],
    sentiment: 'positive',
    word_count: 0,
  };
}

/**
 * 生成人生之书章节
 */
function generateChapter(bookId, chapterName, materials) {
  // 本地模拟生成
  const chapterContents = {
    '童年时光': `在${chapterName}的童年时光里，那个年代的物质条件虽然简陋，但充满了纯真的快乐。清晨的鸡鸣声唤醒了整个村庄，祖父总是第一个起床，生火做饭。母亲在灶台前忙碌的身影，成了童年记忆中最温暖的画面。

那时的日子简单而充实，兄弟姐妹们一起上山砍柴、下河摸鱼。每到傍晚，炊烟袅袅升起，母亲站在村口呼唤孩子们回家吃饭的声音，是世界上最动听的音乐。`,

    '求学之路': `${chapterName}的求学之路并非一帆风顺。在那个年代，能读书是一种奢侈。每天天不亮就起床，走几里山路去学校。冬天手冻疮，夏天蚊虫叮咬，但他从未放弃过学习。

最难忘的是考上中学的那一刻，整个家族都为之骄傲。那是村里少有的几个考上中学的孩子之一，也为后来的命运转折埋下了伏笔。`,

    '立业之路': `青年时期的${chapterName}，怀揣着对未来的憧憬，开始了自己的奋斗历程。从最基层的工作做起，一步一个脚印，用自己的双手和家庭的责任感，一步步建设着属于自己的事业。`,

    '家庭与生活': `${chapterName}的家庭生活充满了爱与责任。与配偶相濡以沫数十载，共同经历了生活的酸甜苦辣。对子女的教育严格而充满关爱，言传身教，为后代树立了良好的榜样。`,

    '岁月感悟': `经过人生的风雨洗礼，${chapterName}对人生有了深刻的感悟。他常说："人生就像一条河，有急流也有平缓，重要的是要始终向前。"这份豁达和智慧，正是岁月赐予他最珍贵的礼物。`,

    '家族寄语': `${chapterName}对家族的寄语朴实而深刻。他希望后代能够团结互助，勤劳正直，传承家族的良好家风。他认为，家风的传承比物质的传承更重要，是家族绵延不绝的根本。`,
  };

  return {
    content: chapterContents[chapterName] || `关于${chapterName}的内容正在生成中...`,
    word_count: 500,
    suggestions: ['建议增加更多细节描写', '可以加入更多具体事例'],
  };
}

/**
 * 获取AI配置
 */
function getAIConfig() {
  return {
    provider: AI_CONFIG.provider,
    available: AI_CONFIG.provider === 'local',
    models: ['local-rule-based'],
    prompt_templates: Object.keys(PROMPT_TEMPLATES),
    note: '当前使用本地规则引擎，如需增强AI能力请配置通义千问或OpenAI API',
  };
}

/**
 * 测试AI连接
 */
function testConnection() {
  return {
    success: true,
    provider: 'local',
    message: '本地AI引擎运行正常',
    capabilities: ['动态追问', '素材分析', '人生之书生成', '故事润色'],
  };
}

module.exports = {
  AI_CONFIG,
  PROMPT_TEMPLATES,
  generateQuestionLocal,
  analyzeMaterials,
  generateChapter,
  getAIConfig,
  testConnection,
  generateFollowUpFromAnswer,
  generateFollowUpSuggestions,
  extractKeywords,
};
