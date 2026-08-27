// ===== 页面头部组件 =====
function PageHeader({ title, showBack = false, onBack, rightAction, rightIcon, onRightAction, titleCenter = true }) {
  return (
    <div className={`page-header ${titleCenter ? 'title-center' : ''}`}>
      {showBack ? (
        <div className="back-btn" onClick={onBack}>
          <Icon.ArrowLeft size={22} />
        </div>
      ) : (
        <div style={{ width: 40 }} />
      )}
      <div className="header-title">{title}</div>
      {rightIcon ? (
        <div className="header-action" onClick={onRightAction}>
          {rightIcon}
        </div>
      ) : rightAction ? (
        <div className="header-action" onClick={onRightAction} style={{ fontSize: 14, color: 'var(--ink-green)', width: 'auto', padding: '0 8px' }}>
          {rightAction}
        </div>
      ) : (
        <div style={{ width: 40 }} />
      )}
    </div>
  );
}

// ===== 状态栏 =====
function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <div className="status-bar-right">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <path d="M1.5 7.5L3 9l1.5-1.5M0 5.5C2.5 3 5 2 8.5 2S14.5 3 17 5.5M4 10h9"/>
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
          <path d="M7.5 1C5 3 3 5.5 3 8c0 1.7 1.3 3 3 3h3c1.7 0 3-1.3 3-3 0-2.5-2-5-4.5-7z"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5"/>
          <rect x="2" y="2" width="18" height="8" rx="1.5" fill="currentColor"/>
          <rect x="22.5" y="4" width="1.5" height="4" rx="0.75" fill="currentColor"/>
        </svg>
      </div>
    </div>
  );
}

// ===== Toast 提示 =====
function showToast(message, duration = 2000) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

Object.assign(window, { PageHeader, StatusBar, showToast });
