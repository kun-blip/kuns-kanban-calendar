'use strict';
// Only send ordinary web URLs to the operating system. In particular,
// reject script:, file:, app-specific schemes and URL-embedded credentials.
function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
module.exports = { safeExternalUrl };
