// ===== 首页（家族空间首页）=====
function HomePage({ onNavigate, currentFamily }) {
  const [members, setMembers] = React.useState([]);
  const [stories, setStories] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentFamily) return;
    const spaceId = String(currentFamily.space_id);
    Promise.all([
      import('../api/member').then(m => m.getMembers(spaceId)).then(r => r.code === 0 ? r.data : null).catch(() => null),
      import('../api/timeline').then(t => t.getTimeline(spaceId)).then(r => r.code === 0 ? r.data : null).catch(() => null),
    ]).then(([m, s]) => {
      if (m) setMembers(m);
      if (s) setStories(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [currentFamily]);

  const memberCount = members.length || (currentFamily?.member_count || MockData.families[0]?.memberCount || 0);
  const generation = currentFamily?.generation || MockData.families[0]?.generation || 5;
  const foundingYear = currentFamily?.founding_year || MockData.families[0]?.foundingYear || 1920;

  const features = [
    { id: 'interview', label: 'AI语音采访', icon: Icon.Mic, color: '#4A6741', bg: '#E8EFE3', page: 'interviewDetail' },
    { id: 'lifebook', label: '人生之书', icon: Icon.Book, color: '#8B6F47', bg: '#F0E6D6', page: 'lifebook' },
    { id: 'tree', label: '族谱图谱', icon: Icon.Tree, color: '#6B8B5A', bg: '#E0EAD6', page: 'tree' },
    { id: 'timeline', label: '时间墙', icon: Icon.Clock, color: '#D4B896', bg: '#F5ECDC', page: 'timeline' },
    { id: 'events', label: '大事记', icon: Icon.Flag, color: '#A88960', bg: '#F0E4D0', page: 'events' },
    { id: 'message', label: '家族寄语', icon: Icon.Message, color: '#4A6741', bg: '#E8EFE3', page: 'familyMessages' },
    { id: 'ocr', label: 'OCR导入', icon: Icon.Search, color: '#8B6F47', bg: '#F0E6D6', page: 'ocrImport' },
    { id: 'share', label: '书籍分享', icon: Icon.Book, color: '#D4B896', bg: '#F5ECDC', page: 'bookShare' },
  ];

  return (
    <div className="page-enter">
      <div style={{
        background: 'linear-gradient(180deg, #D8E2D0 0%, #FBF8F2 100%)',
        padding: '8px 20px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -20,
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 184, 150, 0.3) 0%, transparent 70%)'
        }} />
        <div style={{
          position: 'absolute', bottom: 10, left: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74, 103, 65, 0.1) 0%, transparent 70%)'
        }} />

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16
        }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            onClick={() => onNavigate('familyList')}
          >
            <span className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-primary)' }}>
              {currentFamily?.space_name || '朱氏家族'}
            </span>
            <Icon.ChevronRight size={18} color="var(--ink-secondary)" />
          </div>
          <div
            style={{ display: 'flex', gap: 4, cursor: 'pointer' }}
            onClick={() => onNavigate('search')}
          >
            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Search size={22} color="var(--ink-primary)" />
            </div>
          </div>
        </div>

        <div className="card-paper" style={{ padding: '18px 20px', textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 12, color: 'var(--tea-brown)', fontFamily: 'var(--font-serif)', marginBottom: 6, letterSpacing: 3 }}>
            · 家 训 ·
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-primary)',
            margin: 0, fontWeight: 600, letterSpacing: 2
          }}>
            {currentFamily?.motto || '耕读传家远，诗书继世长'}
          </p>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="card" style={{
          marginTop: -12, padding: '18px 16px',
          display: 'flex', justifyContent: 'space-around',
          marginBottom: 20, position: 'relative', zIndex: 2
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink-green)', fontFamily: 'var(--font-serif)' }}>{memberCount}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 2 }}>家族成员</div>
          </div>
          <div style={{ width: 1, background: 'var(--line-light)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--tea-brown)', fontFamily: 'var(--font-serif)' }}>{generation}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 2 }}>世代传承</div>
          </div>
          <div style={{ width: 1, background: 'var(--line-light)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--pale-gold)', fontFamily: 'var(--font-serif)' }}>{2024 - foundingYear}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginTop: 2 }}>年家族史</div>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', margin: 0 }}>
              家族功能
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {features.map(feature => {
              const IconComp = feature.icon;
              return (
                <div
                  key={feature.id}
                  className="card"
                  style={{
                    padding: '18px 8px 14px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                  }}
                  onClick={() => onNavigate(feature.page)}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: feature.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <IconComp size={24} color={feature.color} />
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}>
                    {feature.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', margin: 0 }}>
              最近动态
            </h3>
            <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>查看全部</span>
          </div>

          <div className="card" style={{ padding: '4px 0' }}>
            {(stories || MockData.stories).slice(0, 3).map((item, index) => (
              <div
                key={item.story_id || item.id}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: index < 2 ? '1px solid var(--line-light)' : 'none'
                }}
              >
                <div className="avatar avatar-sm" style={{
                  background: 'var(--ink-green-soft)', color: 'var(--ink-green)',
                  marginRight: 12, flexShrink: 0
                }}>
                  {(item.author || '家').slice(0, 1)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--ink-primary)' }}>
                    <span style={{ fontWeight: 500 }}>{item.author}</span>
                    <span style={{ color: 'var(--ink-secondary)' }}> 发布了故事</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>
                    {item.title || '暂无内容'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', flexShrink: 0, marginLeft: 8 }}>
                  {item.happened_at ? new Date(item.happened_at).toLocaleDateString('zh-CN') : '最近'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-paper" style={{ padding: '20px', marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--tea-brown)', fontFamily: 'var(--font-serif)', marginBottom: 10, letterSpacing: 2 }}>
            · 今日家族箴言 ·
          </div>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink-primary)',
            margin: 0, lineHeight: 1.8, fontStyle: 'italic'
          }}>
            "家是温暖的港湾，<br/>爱是永远的传承。"
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomePage });