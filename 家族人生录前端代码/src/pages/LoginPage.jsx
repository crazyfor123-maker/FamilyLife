// ===== 启动/登录页 =====
function LoginPage({ onLogin }) {
  const [step, setStep] = React.useState('phone'); // phone | code
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (phone.length !== 11) {
      showToast('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { sendCode } = await import('../api/auth');
      const res = await sendCode(phone);
      setLoading(false);
      if (res.code === 0) {
        setStep('code');
        setCountdown(60);
        showToast('验证码已发送');
      } else {
        setErrorMsg(res.message || '发送失败，请重试');
      }
    } catch (e) {
      setLoading(false);
      setErrorMsg('网络异常，请检查连接');
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    const codeStr = newCode.join('');
    if (codeStr.length === 6) {
      setTimeout(async () => {
        setLoading(true);
        setErrorMsg('');
        try {
          const { login } = await import('../api/auth');
          const res = await login(phone, codeStr);
          setLoading(false);
          if (res.code === 0) {
            showToast('登录成功');
            setTimeout(() => onLogin(), 600);
          } else {
            setErrorMsg(res.message || '验证码错误');
          }
        } catch (e) {
          setLoading(false);
          setErrorMsg('网络异常，请重试');
        }
      }, 300);
    }
  };

  return (
    <div className="page-enter" style={{
      width: '100%', height: '100%',
      background: 'linear-gradient(180deg, #FBF8F2 0%, #F5EFE3 50%, #EDE5D4 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '0 28px'
    }}>
      <StatusBar />

      {/* Logo区域 */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 50
      }}>
        <div style={{
          width: 96, height: 96,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D8E2D0 0%, #E8D8C0 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(74, 103, 65, 0.15)'
        }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="10" r="6" fill="#4A6741" opacity="0.8"/>
            <circle cx="14" cy="24" r="5" fill="#8B6F47" opacity="0.8"/>
            <circle cx="34" cy="24" r="5" fill="#8B6F47" opacity="0.8"/>
            <circle cx="20" cy="38" r="5" fill="#D4B896" opacity="0.9"/>
            <circle cx="28" cy="38" r="5" fill="#D4B896" opacity="0.9"/>
            <line x1="24" y1="16" x2="24" y2="19" stroke="#8B6F47" strokeWidth="2" strokeLinecap="round"/>
            <line x1="24" y1="19" x2="16" y2="22" stroke="#8B6F47" strokeWidth="2" strokeLinecap="round"/>
            <line x1="24" y1="19" x2="32" y2="22" stroke="#8B6F47" strokeWidth="2" strokeLinecap="round"/>
            <line x1="14" y1="29" x2="20" y2="33" stroke="#D4B896" strokeWidth="2" strokeLinecap="round"/>
            <line x1="34" y1="29" x2="28" y2="33" stroke="#D4B896" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 34,
          fontWeight: 700,
          color: 'var(--ink-primary)',
          margin: 0,
          marginBottom: 8,
          letterSpacing: 4
        }}>
          家族人生录
        </h1>
        <p style={{
          fontSize: 15,
          color: 'var(--ink-secondary)',
          margin: 0,
          fontFamily: 'var(--font-serif)',
          letterSpacing: 2
        }}>
          记录家族记忆，传承人生故事
        </p>
      </div>

      {/* 表单区域 */}
      <div style={{ flex: 1 }}>
        {errorMsg && (
          <div style={{
            padding: '10px 16px',
            background: '#FFF3F3',
            border: '1px solid #FFD5D5',
            borderRadius: 'var(--radius-md)',
            color: '#D32F2F',
            fontSize: 14,
            marginBottom: 16,
            textAlign: 'center'
          }}>
            {errorMsg}
          </div>
        )}

        {step === 'phone' ? (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              margin: 0,
              marginBottom: 8
            }}>
              欢迎回家
            </h2>
            <p style={{
              fontSize: 15,
              color: 'var(--ink-secondary)',
              margin: 0,
              marginBottom: 32
            }}>
              请输入手机号登录
            </p>

            <div style={{ marginBottom: 24 }}>
              <label style={{
                fontSize: 14,
                color: 'var(--ink-secondary)',
                display: 'block',
                marginBottom: 8
              }}>手机号</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--white)',
                border: '1.5px solid var(--line-soft)',
                borderRadius: 'var(--radius-md)',
                padding: '0 16px',
                height: 56
              }}>
                <span style={{
                  color: 'var(--ink-primary)',
                  fontSize: 18,
                  marginRight: 12
                }}>+86</span>
                <div style={{
                  width: 1,
                  height: 20,
                  background: 'var(--line-soft)',
                  marginRight: 12
                }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 18,
                    color: 'var(--ink-primary)',
                    background: 'transparent',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: 1
                  }}
                />
              </div>
            </div>

            <button
              className={`btn ${phone.length === 11 ? 'btn-primary' : 'btn-secondary'} btn-block`}
              onClick={handleSendCode}
              disabled={loading || phone.length !== 11}
              style={{ marginTop: 8, height: 56, fontSize: 18 }}
            >
              {loading ? '发送中...' : '获取验证码'}
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              margin: 0,
              marginBottom: 8
            }}>
              输入验证码
            </h2>
            <p style={{
              fontSize: 15,
              color: 'var(--ink-secondary)',
              margin: 0,
              marginBottom: 32
            }}>
              验证码已发送至 {phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 24
            }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="tel"
                  value={digit}
                  onChange={e => handleCodeChange(index, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Backspace' && !digit && index > 0) {
                      document.getElementById(`code-${index - 1}`)?.focus();
                    }
                  }}
                  style={{
                    width: '100%',
                    height: 56,
                    textAlign: 'center',
                    fontSize: 24,
                    fontWeight: 600,
                    color: 'var(--ink-primary)',
                    border: digit ? '1.5px solid var(--ink-green)' : '1.5px solid var(--line-soft)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--white)',
                    outline: 'none',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              {countdown > 0 ? (
                <span style={{
                  fontSize: 14,
                  color: 'var(--ink-tertiary)'
                }}>
                  {countdown}秒后可重新获取
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--ink-green)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setCountdown(60);
                    showToast('验证码已重新发送');
                  }}
                >
                  重新获取验证码
                </span>
              )}
            </div>

            <button
              className="btn btn-primary btn-block"
              style={{ marginBottom: 10, height: 52, fontSize: 17 }}
              onClick={() => {
                setLoading(true);
                setErrorMsg('');
                const codeStr = code.join('');
                import('../api/auth').then(({ login }) =>
                  login(phone, codeStr).then(res => {
                    setLoading(false);
                    if (res.code === 0) {
                      showToast('登录成功');
                      setTimeout(() => onLogin(), 600);
                    } else {
                      setErrorMsg(res.message || '验证码错误');
                    }
                  })
                );
              }}
              disabled={loading}
            >
              {loading ? '登录中...' : '登 录'}
            </button>

            <button
              className="btn btn-ghost btn-block"
              onClick={() => setStep('phone')}
              style={{ color: 'var(--ink-secondary)' }}
            >
              ← 返回修改手机号
            </button>
          </div>
        )}
      </div>

      {/* 游客体验入口 */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <span
          style={{
            fontSize: 14,
            color: 'var(--ink-green)',
            cursor: 'pointer',
            fontWeight: 500
          }}
          onClick={() => {
            showToast('正在进入游客模式...');
            setTimeout(() => onLogin(), 600);
          }}
        >
          先随便逛逛 → 游客体验
        </span>
      </div>

      {/* 底部协议 */}
      <div style={{
        paddingBottom: 32,
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--ink-tertiary)',
        lineHeight: 1.6
      }}>
        <p style={{ margin: 0 }}>登录即表示同意</p>
        <p style={{ margin: 0 }}>
          <span style={{ color: 'var(--ink-green)' }}>《用户协议》</span>
          <span> 和 </span>
          <span style={{ color: 'var(--ink-green)' }}>《隐私政策》</span>
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { LoginPage });