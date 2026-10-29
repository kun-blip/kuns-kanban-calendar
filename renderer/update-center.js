'use strict';
// The renderer's update popup is intentionally independent of Windows toasts.
// It must still appear when notifications are disabled and when a tray-started
// app is opened after an update check has already finished.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document && root.kuunsDesktop) api.initUpdateCenter(root, root.document, root.kuunsDesktop);
})(typeof window === 'undefined' ? null : window, function () {
  function shouldAutoPrompt({ state, dismissedVersion = '', promptedVersion = '', visible = true, blocked = false } = {}) {
    return Boolean(state && state.phase === 'available' && typeof state.newVersion === 'string' &&
      state.newVersion && visible && !blocked && state.newVersion !== dismissedVersion &&
      state.newVersion !== promptedVersion);
  }

  function initUpdateCenter(win, doc, bridge) {
    if (!bridge || typeof bridge.getUpdateState !== 'function') return null;
    const el = id => doc.getElementById(id);
    const overlay = el('updateOverlay');
    const launch = el('updateLaunch');
    const action = el('updateAction');
    const msg = el('updateMessage');
    const cur = el('updateCurrent');
    const progress = el('updateProgress');
    const bar = el('updateProgressBar');
    const title = el('updateDialogTitle');
    if (!overlay || !launch || !action || !msg || !cur || !progress || !bar || !title) return null;

    let state = { phase: 'idle', version: '', message: '업데이트 상태를 확인하고 있어요.' };
    let preferencesReady = false;
    let dismissedVersion = '';
    let promptedVersion = '';
    let updateEventSerial = 0;
    const names = {
      idle: '업데이트 확인', disabled: '설정 필요', checking: '확인 중…',
      current: '최신 버전', available: '다운로드', downloading: '다운로드 중…',
      downloaded: '재시작하여 설치', installing: '설치 중…', error: '다시 확인'
    };

    function render() {
      launch.hidden = false;
      const available = ['available', 'downloaded'].includes(state.phase);
      launch.classList.toggle('has-update', available);
      el('updateLaunchText').textContent = available ? '새 버전' : '업데이트';
      cur.textContent = `현재 v${state.version || '-'}${state.newVersion ? ' · 새 버전 v' + state.newVersion : ''}`;
      msg.textContent = state.message || 'GitHub Releases 상태를 확인하세요.';
      progress.hidden = state.phase !== 'downloading';
      bar.style.width = Math.max(0, Math.min(100, Number(state.percent) || 0)) + '%';
      action.textContent = bridge.platform==='darwin'&&state.phase==='available'?'Mac용 DMG 받기':(names[state.phase] || '업데이트 확인');
      action.disabled = ['disabled', 'checking', 'downloading', 'installing'].includes(state.phase);
    }
    function isBlocked() {
      const feedback = el('feedbackOverlay');
      const welcome = el('welcomeOverlay');
      const releaseNotes = el('releaseNotesOverlay');
      const shade = el('shade');
      const active = doc.activeElement;
      const editing = active && (['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) || active.isContentEditable);
      return !overlay.hidden || (feedback && !feedback.hidden) ||
        (welcome && (!welcome.hidden || welcome.dataset?.pending === 'true')) ||
        (releaseNotes && (!releaseNotes.hidden || releaseNotes.dataset?.pending === 'true')) ||
        (shade && !shade.hidden) || Boolean(editing);
    }
    function maybeAutoPrompt() {
      if (!preferencesReady) return;
      if (!shouldAutoPrompt({
        state, dismissedVersion, promptedVersion,
        visible: !doc.hidden, blocked: isBlocked()
      })) return;
      promptedVersion = state.newVersion; // Once per version per app run, never every polling cycle.
      open(true);
    }
    function onState(next) {
      if (!next || typeof next.phase !== 'string') return;
      state = next;
      render();
      maybeAutoPrompt();
    }
    function open(automatic = false) {
      title.textContent = automatic ? '새로운 업데이트가 있어요!' : '프로그램 업데이트';
      overlay.hidden = false;
      render();
    }
    function close() { overlay.hidden = true; }
    function dismiss() {
      const version = state.phase === 'available' ? state.newVersion : '';
      close();
      if (version) {
        dismissedVersion = version; // Session-only. A future app launch may remind again.
        promptedVersion = version;
        if (typeof bridge.dismissUpdateNotice === 'function') {
          Promise.resolve(bridge.dismissUpdateNotice(version)).catch(() => {});
        }
      }
    }

    launch.addEventListener('click', () => open(false));
    el('updateClose').addEventListener('click', dismiss);
    el('updateLater').addEventListener('click', dismiss);
    overlay.addEventListener('click', event => { if (event.target === overlay) dismiss(); });
    doc.addEventListener('keydown', event => {
      if (!overlay.hidden && event.key === 'Escape') { event.stopPropagation(); dismiss(); }
    });
    win.addEventListener('focus', maybeAutoPrompt);
    doc.addEventListener('visibilitychange', maybeAutoPrompt);
    doc.addEventListener('welcome:changed', maybeAutoPrompt);
    doc.addEventListener('release-notes:changed', maybeAutoPrompt);
    // When editing or another modal ends, a pending update should not be lost.
    doc.addEventListener('focusout', () => setTimeout(maybeAutoPrompt, 0));
    doc.addEventListener('click', () => setTimeout(maybeAutoPrompt, 0));
    action.addEventListener('click', async () => {
      action.disabled = true;
      try {
        if (state.phase === 'available') onState(await bridge.downloadUpdate());
        else if (state.phase === 'downloaded') {
          if (!win.confirm('업데이트 설치를 위해 앱을 종료하고 재시작할까요? 데이터는 PC에 그대로 저장됩니다.')) return;
          onState(await bridge.installUpdate());
        } else onState(await bridge.checkUpdate());
      } catch (_err) {
        msg.textContent = '업데이트 작업을 완료하지 못했어요. 잠시 후 다시 확인해 주세요.';
      } finally { render(); }
    });
    bridge.onUpdateState(next => { updateEventSerial++; onState(next); });
    bridge.onOpenUpdate(() => open(false));
    render();

    // Read the preference first, THEN fetch the latest state. This avoids a
    // stale state snapshot overwriting an update-available IPC event on launch.
    (async () => {
      try {
        const pref = await bridge.getUpdateNoticePreference();
        dismissedVersion = pref && pref.dismissedVersion || '';
      } catch (_err) { dismissedVersion = ''; }
      preferencesReady = true;
      try {
        const serialBeforeSnapshot = updateEventSerial;
        const snapshot = await bridge.getUpdateState();
        // Never let an old IPC snapshot replace a fresher update-available event.
        if (serialBeforeSnapshot === updateEventSerial) onState(snapshot);
        else maybeAutoPrompt();
      } catch (_err) { maybeAutoPrompt(); }
    })();
    return { onState, maybeAutoPrompt, dismiss, getState: () => ({...state}) };
  }
  return { shouldAutoPrompt, initUpdateCenter };
});
