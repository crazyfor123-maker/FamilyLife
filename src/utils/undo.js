// ===== 全局防误操作：删除二次确认 + 5秒撤销 =====

/**
 * 显示撤销提示条
 * @param {string} message - 提示文本
 * @param {Function} onUndo - 撤销回调
 * @param {number} timeout - 超时时间（毫秒），默认5000
 */
function showUndoToast(message, onUndo, timeout = 5000) {
  // 移除已有提示
  const existing = document.querySelector('.undo-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'undo-toast';
  toast.innerHTML = `
    <span>${message}</span>
    <button class="undo-btn">撤销</button>
    <span class="undo-timer">${Math.ceil(timeout / 1000)}s</span>
  `;
  document.body.appendChild(toast);

  let remaining = timeout;
  const timer = setInterval(() => {
    remaining -= 1000;
    const timerEl = toast.querySelector('.undo-timer');
    if (timerEl) timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;
    if (remaining <= 0) {
      clearInterval(timer);
      toast.remove();
    }
  }, 1000);

  toast.querySelector('.undo-btn').addEventListener('click', () => {
    clearInterval(timer);
    toast.remove();
    if (onUndo) onUndo();
  });

  toast.addEventListener('click', (e) => {
    if (e.target !== toast.querySelector('.undo-btn')) {
      clearInterval(timer);
      toast.remove();
    }
  });

  // 自动超时移除
  setTimeout(() => {
    clearInterval(timer);
    if (toast.parentNode) toast.remove();
  }, timeout);

  return toast;
}

/**
 * 安全的删除操作（自动二次确认 + 撤销）
 * @param {string} message - 确认提示
 * @param {Function} onConfirm - 确认后的回调
 * @param {Function} onUndo - 撤销回调
 * @param {number} timeout - 撤销超时
 */
function safeDelete(message, onConfirm, onUndo, timeout = 5000) {
  if (!confirm(message)) return false;
  const result = onConfirm();
  if (result && onUndo) {
    showUndoToast('操作已执行，可撤销', onUndo, timeout);
  }
  return result;
}

// 挂载到全局
if (typeof window !== 'undefined') {
  window.showUndoToast = showUndoToast;
  window.safeDelete = safeDelete;
}
