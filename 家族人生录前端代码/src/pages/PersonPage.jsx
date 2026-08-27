// ===== 人物档案页 =====
function PersonPage({ personId, onBack, onNavigate }) {
  const [activeTab, setActiveTab] = React.useState('timeline');
  const [person, setPerson] = React.useState(null);
  const [interviews, setInterviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      import('../api/person').then(p => p.getPerson(personId)).then(r => r.code === 0 ? r.data : null).catch(() => null),
      import('../api/interview').then(i => i.getInterviews(personId)).then(r => r.code === 0 ? r.data : []).catch(() => []),
    ]).then(([p, ints]) => {
      if (p) setPerson(p);
      setInterviews(ints);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [personId]);

  const p = person || MockData.members.find(m => m.id === personId) || MockData.members[2];
  const isDeceased = p.status === 'deceased';

  const lifeEvents = [
    { year: p.birth_date?.split('-')[0] || p.birthYear, title: '出生', desc: `生于${p.birth_place || p.birthPlace}` },
    { year: (p.birth_date?.split('-')[0] || p.birthYear) + 7, title: '入学读书', desc: '开始在村塾读书，启蒙教育' },
    { year: (p.birth_date?.split('-')[0] || p.birthYear) + 18, title: '参加工作', desc: `${p.occupation || p.occupation}，开启职业生涯` },
    { year: (p.birth_date?.split('-')[0] || p.birthYear) + 25, title: '结婚成家', desc: '与爱人喜结连理，组建家庭' },
    { year: (p.birth_date?.split('-')[0] || p.birthYear) + 28, title: '长子出生', desc: '迎来第一个孩子，初为人父/母' },
    { year: (p.birth_date?.split('-')[0] || p.birthYear) + 55, title: '光荣退休', desc: '从工作岗位退休' },
  ];

  const tabs = [
    { id: 'timeline', label: '人生时间线' },
    { id: 'interview', label: '采访素材' },
    { id: 'album', label: '相册' },
    { id: 'lifebook', label: '人生之书' },
    { id: 'relations', label: '亲属关系' },
    { id: 'messages', label: '家族寄语' },
  ];

  return (
    <div className="page-enter" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <PageHeader title="人物档案" showBack={true} onBack={onBack} />

      <div className="page-content no-tab" style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-tertiary)' }}>加载中...</div>
        ) : (
          <>
            <div style={{
              background: isDeceased ? 'linear-gradient(180deg, #E8E1D3 0%, #FBF8F2 100%)'
                : 'linear-gradient(180deg, #D8E2D0 0%, #FBF8F2 100%)',
              padding: '20px 24px 24px', textAlign: 'center'
            }}>
              <div className="avatar avatar-xl" style={{
                margin: '0 auto 12px', width: 88, height: 88, fontSize: 32,
                background: isDeceased ? 'linear-gradient(135deg, #D4CDBE 0%, #C8C0AE 100%)'
                  : p.gender === '男' ? 'linear-gradient(135deg, #C4D4B8 0%, #A8C498 100%)'
                  : 'linear-gradient(135deg, #E8D0C0 0%, #D4B896 100%)',
                color: isDeceased ? 'var(--ink-secondary)' : p.gender === '男' ? 'var(--ink-green)' : 'var(--tea-brown)',
                border: `3px solid ${isDeceased ? 'var(--line-soft)' : 'var(--white)'}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
              }}>{p.name.slice(-1)}</div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                <h2 className="serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', margin: 0 }}>{p.name}</h2>
                {isDeceased && <span className="badge badge-gray">已故</span>}
              </div>

              <p style={{ fontSize: 14, color: 'var(--ink-secondary)', margin: 0, marginBottom: 12 }}>
                {p.birth_date?.split('-')[0] || p.birthYear} — {p.death_date?.split('-')[0] || '至今'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-green">第{p.generation}代</span>
                <span className="badge badge-brown">{p.occupation || '无'}</span>
                <span className="badge badge-gold">{p.birth_place || '未知'}</span>
              </div>
            </div>

            <div className="card-paper" style={{ margin: '16px', padding: '18px 20px' }}>
              <div style={{ fontSize: 13, color: 'var(--tea-brown)', fontFamily: 'var(--font-serif)', marginBottom: 8, letterSpacing: 2 }}>· 生平简介 ·</div>
              <p style={{ fontSize: 15, color: 'var(--ink-primary)', lineHeight: 1.8, margin: 0, fontFamily: 'var(--font-serif)' }}>
                {p.bio || '暂无简介'}
              </p>
            </div>

            <div style={{ display: 'flex', overflowX: 'auto', gap: 0, padding: '0 16px', borderBottom: '1px solid var(--line-light)', background: 'var(--paper-white)', position: 'sticky', top: 0, zIndex: 10 }}>
              {tabs.map(tab => (
                <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: '12px 14px', fontSize: 14,
                  color: activeTab === tab.id ? 'var(--ink-green)' : 'var(--ink-secondary)',
                  fontWeight: activeTab === tab.id ? 500 : 400, whiteSpace: 'nowrap', cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid var(--ink-green)' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 0.2s'
                }}>{tab.label}</div>
              ))}
            </div>

            <div style={{ padding: '16px' }}>
              {activeTab === 'timeline' && (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--line-soft)' }} />
                  {lifeEvents.map((event, index) => (
                    <div key={index} style={{ position: 'relative', paddingBottom: 20 }}>
                      <div style={{ position: 'absolute', left: -20, top: 4, width: 16, height: 16, borderRadius: '50%', background: 'var(--white)', border: '3px solid var(--pale-gold)', zIndex: 1 }} />
                      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-md)', padding: '14px 16px', boxShadow: 'var(--shadow-soft)' }}>
                        <div style={{ fontSize: 13, color: 'var(--tea-brown)', fontWeight: 500, marginBottom: 4 }}>{event.year}年</div>
                        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-primary)', marginBottom: 4 }}>{event.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{event.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'interview' && (
                <div>
                  {(interviews.length > 0 ? interviews : MockData.interviewQuestions.slice(0, 6)).map((item, index) => (
                    <div key={item.qa_id || item.id || index} className="card" style={{
                      padding: '14px 16px', marginBottom: 10, cursor: 'pointer'
                    }}
                    onClick={() => onNavigate('interviewDetail', { personId: item.session_id || personId })}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--ink-green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon.Play size={14} color="var(--ink-green)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--tea-brown)', marginBottom: 2 }}>{item.chapter || '采访素材'}</div>
                          <div style={{ fontSize: 14, color: 'var(--ink-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.question_text || item.question || '待采访'}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', flexShrink: 0 }}>
                          {item.status || '进行中'}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <button className="btn btn-secondary" style={{ width: '100%', height: 44 }}
                      onClick={() => onNavigate('interviewDetail', { personId: personId })}>
                      <Icon.Mic size={18} /> 查看全部采访
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'album' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                    {[...Array(9)].map((_, i) => (
                      <div key={i} style={{ aspectRatio: 1, background: `linear-gradient(${45 + i * 30}deg, #D4B896 0%, #8B6F47 100%)`, borderRadius: 6, opacity: 0.3 + i * 0.07, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon.Image size={24} color="rgba(255,255,255,0.6)" />
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--ink-tertiary)' }}>共 12 张照片</div>
                </div>
              )}

              {activeTab === 'lifebook' && (
                <div>
                  <div className="card" style={{ padding: 20, cursor: 'pointer', marginBottom: 16, background: 'linear-gradient(135deg, #FBF8F2 0%, #F0EADB 100%)' }}
                    onClick={() => onNavigate('lifebook', { personId: personId })}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 72, height: 100, background: 'linear-gradient(135deg, #D4B896 0%, #8B6F47 100%)', borderRadius: '4px 8px 8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 4px 12px rgba(0,0,0,0.15)', flexShrink: 0 }}>
                        <span style={{ color: 'var(--white)', fontFamily: 'var(--font-serif)', fontSize: 14, textAlign: 'center', padding: '0 4px', fontWeight: 600 }}>人生<br/>之书</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 4 }}>{p.name}的人生之书</div>
                        <div style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 8 }}>7个章节 · 128页 · V2.0</div>
                        <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12, background: 'var(--white)', borderRadius: 'var(--radius-full)', border: '1px solid var(--line-soft)' }}>阅读 →</button>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink-secondary)', marginBottom: 8 }}>章节列表</div>
                  {MockData.bookChapters.map(chapter => (
                    <div key={chapter.id} className="card" style={{ padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 4, height: 32, borderRadius: 2, background: chapter.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{chapter.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>{chapter.subtitle}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{chapter.pages}页</div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'relations' && (
                <div>
                  {[
                    { label: '父亲', members: [3] },
                    { label: '母亲', members: [4] },
                    { label: '配偶', members: [8] },
                    { label: '子女', members: [11, 12] },
                    { label: '兄弟姐妹', members: [9, 10] },
                  ].map((group, index) => (
                    <div key={index} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, color: 'var(--tea-brown)', marginBottom: 8, fontWeight: 500 }}>{group.label}</div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {group.members.map(mid => {
                          const m = MockData.members.find(x => x.id === mid);
                          if (!m) return null;
                          return (
                            <div key={mid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', width: 60 }}
                              onClick={() => onNavigate('person', { personId: m.person_id || m.id })}>
                              <div className="avatar avatar-md" style={{
                                background: m.gender === '男' ? 'linear-gradient(135deg, #D8E2D0 0%, #C4D4B8 100%)' : 'linear-gradient(135deg, #F0E0D0 0%, #E8D0C0 100%)',
                                color: m.gender === '男' ? 'var(--ink-green)' : 'var(--tea-brown)', marginBottom: 4
                              }}>{m.name.slice(-1)}</div>
                              <span style={{ fontSize: 12, color: 'var(--ink-primary)' }}>{m.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'messages' && (
                <div>
                  <div style={{ background: 'var(--paper-warm)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', marginBottom: 20 }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: 'var(--ink-primary)', lineHeight: 1.9, margin: 0, fontStyle: 'italic' }}>
                      "希望子孙后代能记住家的温暖，<br/>传承忠厚传家的家风。"
                    </p>
                    <div style={{ fontSize: 13, color: 'var(--ink-tertiary)', marginTop: 10 }}>—— {p.name}</div>
                  </div>
                  {MockData.messages.slice(0, 3).map(msg => (
                    <div key={msg.id} className="card" style={{ padding: '14px 16px', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                        <div className="avatar avatar-sm" style={{ background: 'var(--ink-green-soft)', color: 'var(--ink-green)', flexShrink: 0 }}>{msg.author.slice(0, 1)}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-primary)' }}>{msg.author}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{msg.time}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--ink-primary)', lineHeight: 1.6, margin: 0 }}>{msg.content}</p>
                    </div>
                  ))}
                  <button className="btn btn-secondary btn-block" style={{ height: 44 }}>写下寄语</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PersonPage });