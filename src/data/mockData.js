// ===== Mock 数据（开发/演示用） =====
export const MockData = {
  // 家族空间
  families: [
    {
      id: 'f1',
      name: '朱氏家族',
      cover: '',
      motto: '耕读传家远，诗书继世长',
      memberCount: 23,
      generation: 5,
      isMain: true,
      foundingYear: 1920,
      origin: '浙江绍兴',
      role: 'owner',
    },
    {
      id: 'f2',
      name: '王氏家族（外婆家）',
      cover: '',
      motto: '勤俭持家，忠厚处世',
      memberCount: 18,
      generation: 4,
      isMain: false,
      foundingYear: 1935,
      origin: '江苏苏州',
      role: 'member',
    },
  ],

  // 家族成员
  members: [
    { id: 'p1', name: '朱老太爷', gender: 'male', birthYear: 1920, deathYear: 2005, birthPlace: '浙江绍兴', occupation: '私塾先生 / 中医师', generation: 1, status: 'deceased', bio: '朱氏家族第一代，自幼熟读经史，后研习岐黄之术，悬壶济世四十余年。', avatar: '', relation: '家族创始人', isSelf: false },
    { id: 'p2', name: '朱老夫人', gender: 'female', birthYear: 1923, deathYear: 2010, birthPlace: '浙江杭州', occupation: '家庭主妇', generation: 1, status: 'deceased', bio: '大家闺秀，知书达理。一生操劳家事，养育五子二女。', avatar: '', relation: '太奶奶', isSelf: false },
    { id: 'p3', name: '朱国栋', gender: 'male', birthYear: 1945, deathYear: null, birthPlace: '浙江绍兴', occupation: '退休教师', generation: 2, status: 'living', bio: '朱家长子，曾任中学校长，桃李满天下。', avatar: '', relation: '爷爷', isSelf: false },
    { id: 'p4', name: '李秀兰', gender: 'female', birthYear: 1948, deathYear: null, birthPlace: '安徽徽州', occupation: '退休医生', generation: 2, status: 'living', bio: '县医院妇产科主任医师，接生过上千个新生命。', avatar: '', relation: '奶奶', isSelf: false },
    { id: 'p5', name: '朱国华', gender: 'male', birthYear: 1950, deathYear: null, birthPlace: '浙江绍兴', occupation: '退休工程师', generation: 2, status: 'living', bio: '朱家次子，高级土木工程师。', avatar: '', relation: '二爷爷', isSelf: false },
    { id: 'p7', name: '朱明远', gender: 'male', birthYear: 1972, deathYear: null, birthPlace: '浙江绍兴', occupation: '企业管理者', generation: 3, status: 'living', bio: '朱家长孙，现任某科技公司高管。', avatar: '', relation: '父亲', isSelf: false },
    { id: 'p8', name: '王雅琴', gender: 'female', birthYear: 1974, deathYear: null, birthPlace: '江苏苏州', occupation: '大学教授', generation: 3, status: 'living', bio: '历史系教授，对家族文化研究颇深。', avatar: '', relation: '母亲', isSelf: false },
    { id: 'p11', name: '朱子轩', gender: 'male', birthYear: 1998, deathYear: null, birthPlace: '上海', occupation: '软件工程师', generation: 4, status: 'living', bio: '朱家第四代长孙，热爱技术与传统文化。', avatar: '', relation: '我（长子）', isSelf: true },
  ],

  // 家族树
  familyTree: {
    root: { id: 'p1', spouse: 'p2' },
    children: [
      { id: 'p3', spouse: 'p4', children: [{ id: 'p7', spouse: 'p8', children: [{ id: 'p11' }, { id: 'p12' }] }] },
      { id: 'p5', spouse: null, children: [] },
    ],
  },

  // 采访问题
  interviewQuestions: [
    { id: 1, chapter: '故乡与童年', question: '您出生在哪里？童年的家乡是什么样子的？', type: 'main' },
    { id: 2, chapter: '故乡与童年', question: '小时候家里的经济条件怎么样？有什么印象深刻的事吗？', type: 'main' },
    { id: 3, chapter: '少年求学时光', question: '您上学时的学习成绩怎么样？最喜欢哪门功课？', type: 'main' },
    { id: 4, chapter: '少年求学时光', question: '求学路上有什么难忘的老师或同学吗？', type: 'main' },
    { id: 5, chapter: '青年立业之路', question: '您的第一份工作是什么？当时的心情是怎样的？', type: 'main' },
    { id: 6, chapter: '成家立业与家庭', question: '您和爱人是怎么认识的？当时的恋爱是什么样的？', type: 'main' },
    { id: 7, chapter: '人生风雨历程', question: '您人生中最艰难的时期是什么时候？是怎么挺过来的？', type: 'main' },
    { id: 8, chapter: '岁月沉淀感悟', question: '走过大半辈子，您觉得人生最重要的是什么？', type: 'main' },
    { id: 9, chapter: '家族寄语与传承', question: '您对子孙后代有什么寄语和期望？', type: 'main' },
  ],

  // 人生之书版本
  bookVersions: [
    { version: 'V2.0', date: '2024-08-15', status: 'completed', pages: 128, desc: '新增采访素材30段' },
    { version: 'V1.5', date: '2024-06-20', status: 'completed', pages: 102, desc: '完善家族寄语章节' },
    { version: 'V1.0', date: '2024-03-10', status: 'completed', pages: 86, desc: '首版人生之书' },
  ],

  // 人生之书目录
  bookChapters: [
    { id: 1, title: '第一章 故乡与童年', subtitle: '1920-1935', pages: 18, color: '#D4B896' },
    { id: 2, title: '第二章 少年求学时光', subtitle: '1935-1945', pages: 14, color: '#A88960' },
    { id: 3, title: '第三章 青年立业之路', subtitle: '1945-1965', pages: 20, color: '#8B6F47' },
    { id: 4, title: '第四章 成家立业与家庭', subtitle: '1965-1980', pages: 22, color: '#6B8B5A' },
    { id: 5, title: '第五章 人生风雨历程', subtitle: '1980-2000', pages: 18, color: '#4A6741' },
    { id: 6, title: '第六章 岁月沉淀感悟', subtitle: '2000-至今', pages: 16, color: '#8B6F47' },
    { id: 7, title: '第七章 家族寄语与传承', subtitle: '寄语后辈', pages: 20, color: '#D4B896' },
  ],

  // 时间墙故事
  stories: [
    { id: 's1', year: 2024, month: 8, day: 15, title: '爷爷八十大寿', content: '今天是爷爷的八十大寿，全家二十多口人齐聚老家，摆了三桌寿宴。爷爷精神矍铄，给每个孩子都发了红包。', author: '朱子轩', authorId: 'p11', images: 3, likes: 23, type: '团聚' },
    { id: 's2', year: 2024, month: 5, day: 3, title: '清明回乡祭祖', content: '今年清明，我们一家三代回绍兴老家祭祖。在太爷爷太奶奶的墓前，父亲给我们讲了很多祖辈的故事。', author: '朱明远', authorId: 'p7', images: 5, likes: 18, type: '纪念' },
    { id: 's3', year: 2023, month: 12, day: 25, title: '一诺第一次登台表演', content: '小一诺幼儿园第一次登台表演舞蹈，虽然动作有点跟不上节奏，但认真的样子可爱极了。', author: '朱明光', authorId: 'p9', images: 4, likes: 31, type: '成长' },
    { id: 's4', year: 2023, month: 10, day: 1, title: '全家自驾游黄山', content: '国庆假期，一家五口自驾去了黄山。爷爷奶奶虽然年纪大了，但精神头十足，一路爬到了光明顶。', author: '朱子轩', authorId: 'p11', images: 6, likes: 27, type: '旅行' },
  ],

  // 大事记
  events: [
    { id: 'e1', year: 1920, month: 3, day: 15, title: '朱老太爷出生', type: '出生', desc: '朱氏家族创始人朱老太爷生于浙江绍兴府。' },
    { id: 'e2', year: 1942, month: 10, day: 8, title: '朱老太爷与朱老夫人成婚', type: '婚嫁', desc: '朱老太爷与杭州大家闺秀喜结连理。' },
    { id: 'e3', year: 1945, month: 7, day: 22, title: '长子朱国栋出生', type: '出生', desc: '朱家第一代长子出生，取名国栋，寓意国家栋梁。' },
    { id: 'e4', year: 1978, month: 12, day: 20, title: '朱明远考入大学', type: '学业', desc: '长孙朱明远考入重点大学，成为家族第一个大学生。' },
    { id: 'e5', year: 1998, month: 9, day: 28, title: '第四代长孙出生', type: '出生', desc: '朱子轩出生于上海，朱家第四代长子。' },
    { id: 'e6', year: 2005, month: 11, day: 3, title: '朱老太爷辞世', type: '逝世', desc: '朱老太爷因病辞世，享年85岁。' },
    { id: 'e7', year: 2020, month: 1, day: 25, title: '家族百年团聚', type: '团聚', desc: '朱家五代人齐聚绍兴老家，纪念家族百年历程。' },
  ],

  // 留言板
  messages: [
    { id: 'm1', author: '朱子轩', authorId: 'p11', content: '爷爷，今天翻到了您年轻时的照片，真精神！', time: '2024-08-20 19:30', type: 'text', replies: [{ author: '朱国栋', content: '子轩乖，爷爷也很高兴能把这些故事讲给你听。', time: '2024-08-20 20:15' }], likes: 8 },
    { id: 'm2', author: '朱明月', authorId: 'p10', content: '（语音留言 00:45）', time: '2024-08-18 10:20', type: 'voice', duration: 45, replies: [], likes: 5 },
    { id: 'm3', author: '朱明远', authorId: 'p7', content: '中秋佳节将至，大家都回老家过节吧？', time: '2024-08-15 09:00', type: 'text', replies: [{ author: '朱国华', content: '好的大哥，我们一家都回。', time: '2024-08-15 11:30' }], likes: 12 },
    { id: 'm4', author: '朱一诺', authorId: 'p13', content: '太爷爷太奶奶，一诺想你们啦！我这次考试考了100分哦～', time: '2024-08-10 16:45', type: 'text', replies: [{ author: '朱国栋', content: '一诺真棒！', time: '2024-08-10 18:00' }], likes: 15 },
  ],

  // 最近动态
  recentActivities: [
    { id: 1, user: '朱子轩', action: '发布了新故事', target: '《爷爷八十大寿》', time: '2小时前' },
    { id: 2, user: '朱明远', action: '更新了族谱', target: '添加了3位成员', time: '昨天' },
    { id: 3, user: '朱一诺', action: '留下了留言', target: '想太爷爷太奶奶了', time: '3天前' },
    { id: 4, user: '朱国栋', action: '完成了采访', target: '第6章 人生风雨历程', time: '5天前' },
  ],
};
