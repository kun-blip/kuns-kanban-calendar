'use strict';
// Personal links must never ship as presets. This matcher only removes the
// precise legacy sample shortcut; unrelated user-created Notion links remain.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.KuunsQuickLinks = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const LEGACY_PRESET_FINGERPRINT = '821028ee';
  function fingerprint(value) {
    let h = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  function isLegacyPersonalShortcut(entry) {
    if (!entry || typeof entry.url !== 'string') return false;
    try {
      const url = new URL(entry.url);
      return url.protocol === 'https:' && url.hostname === 'app.notion.com'
        && fingerprint(url.href) === LEGACY_PRESET_FINGERPRINT;
    } catch { return false; }
  }
  const defaultShortcuts = () => [null, null, null];
  return { fingerprint, isLegacyPersonalShortcut, defaultShortcuts };
});
