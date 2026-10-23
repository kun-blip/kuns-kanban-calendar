'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { safeExternalUrl } = require('../desktop/external-url.cjs');
const links = require('../renderer/quick-links.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'renderer/app.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'desktop/main.cjs'), 'utf8');
test('existing Notion links remain, but first-run shortcuts are empty', () => {
  assert.deepEqual(links.defaultShortcuts(), [null, null, null]);
  assert.equal(links.isLegacyPersonalShortcut({ name:'Notion', url:'https://www.notion.so/my-workspace' }), false);
  assert.equal(links.isLegacyPersonalShortcut({ name:'Notion', url:'https://app.notion.com/p/a-different-link' }), false);
  assert.match(app, /removedPersonalPreset\)save\(\)/);
  assert.doesNotMatch(html + app, /app\.notion\.com\/p\//);
});
test('only safe http/https URLs are delegated to the OS', () => {
  assert.equal(safeExternalUrl('https://example.org/path'),'https://example.org/path');
  assert.equal(safeExternalUrl('http://intranet.example/'),'http://intranet.example/');
  for (const input of ['javascript:alert(1)', 'file:///tmp/example', 'custom://test', 'https://user:pass@example.org/', 'https://example.org/\n'])
    assert.equal(safeExternalUrl(input), null);
});
test('local UI enforces script CSP and default-deny browser permissions', () => {
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /script-src 'self'/);
  assert.doesNotMatch(html, /<script>([\s\S]*?)<\/script>/);
  assert.match(main, /setPermissionRequestHandler/);
  assert.match(main, /setPermissionCheckHandler/);
  assert.match(main, /isTrustedIpcSender/);
  assert.match(main, /secureHandle\('calendar:save'/);
});
