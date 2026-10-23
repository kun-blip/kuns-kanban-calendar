'use strict';
// The welcome screen is deliberately independent of calendar user data:
// upgrades never trigger it, and clearing events does not reset it.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document) api.initWelcome(root, root.document, root.kuunsDesktop);
})(typeof window === 'undefined' ? null : window, function () {
  function initWelcome(win, doc, bridge) {
    const el = id => doc.getElementById(id);
    const overlay = el('welcomeOverlay');
    const openButton = el('welcomeOpen');
    const closeButton = el('welcomeClose');
    const startButton = el('welcomeStart');
    const status = el('welcomeStatus');
    if (!overlay || !openButton || !closeButton || !startButton || !status) return null;
    // Block an early update-available event while checking first-launch state.
    // On a fresh machine this takes precedence over the update popup.
    overlay.dataset.pending = bridge?.getWelcomeState ? 'true' : 'false';
    let needsFirstRun = false;
    let deciding = false;
    let completed = false;
    let visibleBefore = null;
    const announceChange = () => doc.dispatchEvent(new Event('welcome:changed'));
    function show() {
      if (!overlay.hidden) return;
      visibleBefore = doc.activeElement;
      overlay.hidden = false;
      overlay.dataset.pending = 'false';
      status.textContent = '';
      closeButton.focus();
      announceChange();
    }
    function showIfVisible() {
      if (deciding && !doc.hidden) { deciding = false; show(); }
    }
    async function close() {
      if (completed) return;
      completed = true;
      startButton.disabled = true;
      closeButton.disabled = true;
      if (needsFirstRun) {
        try {
          const result = await bridge.completeWelcome();
          if (!result?.ok) throw new Error(result?.message || '저장할 수 없습니다.');
          needsFirstRun = false;
        } catch (_) {
          completed = false;
          startButton.disabled = false;
          closeButton.disabled = false;
          status.textContent = '안내를 저장하지 못했어요. 다시 시도해 주세요.';
          return;
        }
      }
      overlay.hidden = true;
      overlay.dataset.pending = 'false';
      startButton.disabled = false;
      closeButton.disabled = false;
      completed = false;
      if (visibleBefore && typeof visibleBefore.focus === 'function') visibleBefore.focus();
      announceChange();
    }
    openButton.addEventListener('click', show);
    closeButton.addEventListener('click', close);
    startButton.addEventListener('click', close);
    doc.addEventListener('keydown', event => {
      if (overlay.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); void close(); }
      if (event.key === 'Tab') {
        // Two focusable controls only; keep keyboard focus inside the modal.
        if (event.shiftKey && doc.activeElement === closeButton) {
          event.preventDefault(); startButton.focus();
        } else if (!event.shiftKey && doc.activeElement === startButton) {
          event.preventDefault(); closeButton.focus();
        }
      }
    });
    doc.addEventListener('visibilitychange', showIfVisible);
    win.addEventListener('focus', showIfVisible);
    if (!bridge?.getWelcomeState || !bridge?.completeWelcome) {
      overlay.dataset.pending = 'false';
      announceChange();
    } else {
      Promise.resolve().then(() => bridge.getWelcomeState()).then(result => {
        needsFirstRun = Boolean(result?.shouldShow);
        if (needsFirstRun) { deciding = true; showIfVisible(); }
        else { overlay.dataset.pending = 'false'; announceChange(); }
      }).catch(() => { overlay.dataset.pending = 'false'; announceChange(); });
    }
    return { show, close, isVisible: () => !overlay.hidden };
  }
  return { initWelcome };
});
