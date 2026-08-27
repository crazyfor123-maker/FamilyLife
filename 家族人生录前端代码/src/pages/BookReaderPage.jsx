// ===== APP 内翻页阅读器 =====
function BookReaderPage({ bookId, onBack }) {
  const [chapters, setChapters] = React.useState(MockData.bookChapters);
  const [currentChapter, setCurrentChapter] = React.useState(0);
  const [readingProgress, setReadingProgress] = React.useState(0);
  const [showTOC, setShowTOC] = React.useState(false);

  const totalChapters = chapters.length;
  const chapter = chapters[currentChapter];

  const nextPage = () => {
    if (currentChapter < totalChapters - 1) {
      setCurrentChapter(c => c + 1);
      setReadingProgress(0);
    }
  };

  const prevPage = () => {
    if (currentChapter > 0) {
      setCurrentChapter(c => c - 1);
      setReadingProgress(0);
    }
  };

  const goToChapter = (index) => {
    setCurrentChapter(index);
    setReadingProgress(0);
    setShowTOC(false);
  };

  // 模拟章节内容
  const chapterContent = [
    '朱老太爷出生在浙江绍兴府的一个书香门第。那时的绍兴，水乡纵横，乌篷船在河道间穿梭，青石板路被岁月打磨得光滑如镜。',
    '他的父亲是当地有名的私塾先生，家中藏书丰富。自幼的朱老太爷便跟着父亲读书，从《三字经》到《四书五经》，一字一句地研读。',
    '童年的记忆中最深的，是秋天的桂花香。老家院子里有一棵老桂花树，每到秋天，满院飘香。祖母会用桂花做桂花糕，那是他最期待的美味。',
    '十二岁那年，父亲将他送进当地的私塾。私塾先生是一位严厉但慈爱的老人，要求学生每日晨读、午习、晚写。',
    '少年时的朱老太爷最喜欢在河边读书，河水潺潺，两岸芦苇摇曳。他常常读着读着就入了神，忘了时间。',
    '十五岁那年，他开始跟随父亲学习中医。从《黄帝内经》到《伤寒论》，一本本经典著作在他手中翻过。',
    '青年时期的朱老太爷，正值国家动荡年代。但他始终没有放下书本，在战火中坚持求学。',
    '他曾在县城的一家药铺当学徒，一边学医一边自学。白天抓药配药，晚上读书写字，生活艰辛但充实。',
    '二十岁那年，他正式拜师学医。师父是一位德高望重的老中医，传授给他许多看家本领。',
    '出师后，他在家乡开了一家小诊所。虽然简陋，但来求医的人络绎不绝。他用精湛的医术赢得了乡邻的敬重。',
    '三十五岁那年，他娶了杭州大家闺秀李秀兰。两人相敬如宾，共同养育了五个孩子。',
    '建国后，他被分配到县医院工作。从私人诊所到公立医院，他始终坚守医德，为病人服务。',
    '四十五岁那年，长子朱国栋出生。他给儿子取名"国栋"，寓意国家栋梁。',
    '在那个特殊的年代，他经历了种种磨难，但始终没有放弃对医学的追求。',
    '改革开放后，县医院的条件改善了。他带了很多徒弟，把毕生所学倾囊相授。',
    '六十五岁退休那天，他把自己用了一辈子的听诊器挂在了诊所的墙上。',
    '退休后的朱老太爷没有闲着，他开始整理自己一生的行医心得，写了一本《行医笔记》。',
    '他每天坚持晨练，打太极拳、散步。他说："身体是革命的本钱。"',
    '八十大寿那天，他给全家人写了一封信，信中写道："人生如逆旅，我亦是行人。"',
    '晚年的他最喜欢做的事，就是给孙子孙女讲故事。从家族历史到人生感悟，他讲得娓娓道来。',
    '二零一零年，朱老太爷安详离世，享年八十七岁。他的一生，是勤勉、正直、仁爱的一生。',
  ];

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title={chapter ? chapter.title : '人生之书'} showBack={true} onBack={onBack}>
        <button onClick={() => setShowTOC(!showTOC)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '0 8px' }}>
          📑
        </button>
      </PageHeader>

      {/* 目录面板 */}
      {showTOC && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
          onClick={() => setShowTOC(false)}>
          <div style={{ position: 'absolute', top: 50, left: 20, right: 20, maxHeight: '80vh', background: 'white', borderRadius: 12, padding: 20, overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>目录</span>
              <button onClick={() => setShowTOC(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {chapters.map((ch, i) => (
              <div key={ch.id} onClick={() => goToChapter(i)} style={{
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 4,
                background: i === currentChapter ? '#E8F5E9' : 'transparent',
                cursor: 'pointer',
                borderLeft: i === currentChapter ? '3px solid var(--ink-green)' : '3px solid transparent',
              }}>
                <div style={{ fontSize: 14, fontWeight: i === currentChapter ? 600 : 400, color: i === currentChapter ? 'var(--ink-green)' : 'var(--ink-primary)' }}>
                  {ch.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{ch.subtitle} · {ch.pages}页</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 阅读区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px', overflow: 'auto' }}>
        {/* 章节标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--tea-brown)', marginBottom: 4, fontFamily: 'var(--font-serif)' }}>
            第 {currentChapter + 1} 章
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-primary)', margin: 0, fontFamily: 'var(--font-serif)' }}>
            {chapter?.title}
          </h2>
          <div style={{ fontSize: 14, color: 'var(--ink-tertiary)', marginTop: 4 }}>{chapter?.subtitle}</div>
        </div>

        {/* 内容 */}
        <div style={{ flex: 1, fontSize: 18, lineHeight: 2, color: 'var(--ink-primary)', fontFamily: 'var(--font-serif)', padding: '0 8px' }}>
          {chapterContent.slice(currentChapter * 2, (currentChapter + 1) * 2).map((para, i) => (
            <p key={i} style={{ marginBottom: 16, textIndent: '2em' }}>{para}</p>
          ))}
        </div>

        {/* 进度条 */}
        <div style={{ padding: '12px 0 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 4 }}>
            <span>第 {currentChapter + 1} / {totalChapters} 章</span>
            <span>{chapter?.pages} 页</span>
          </div>
          <div style={{ height: 4, background: '#E0E0E0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((currentChapter + 1) / totalChapters) * 100}%`, background: 'var(--ink-green)', borderRadius: 2, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      {/* 翻页按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px 16px' }}>
        <button onClick={prevPage} disabled={currentChapter === 0} style={{
          height: 44, padding: '0 20px', border: '1.5px solid var(--line-light)', borderRadius: 8,
          background: 'white', color: currentChapter === 0 ? 'var(--line-light)' : 'var(--ink-primary)',
          cursor: currentChapter === 0 ? 'not-allowed' : 'pointer', fontSize: 14,
        }}>
          ← 上一章
        </button>
        <button onClick={nextPage} disabled={currentChapter === totalChapters - 1} style={{
          height: 44, padding: '0 20px', border: '1.5px solid var(--ink-green)', borderRadius: 8,
          background: 'white', color: 'var(--ink-green)',
          cursor: currentChapter === totalChapters - 1 ? 'not-allowed' : 'pointer', fontSize: 14,
        }}>
          下一章 →
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { BookReaderPage });
