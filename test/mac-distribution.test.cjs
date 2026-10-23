'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pkg = require('../package.json');
const main = fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
const pre = fs.readFileSync(path.join(root,'desktop/preload.cjs'),'utf8');
const html = fs.readFileSync(path.join(root,'renderer/index.html'),'utf8') + fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
const workflow = fs.readFileSync(path.join(root,'.github/workflows/windows-installer.yml'),'utf8');
const { createUpdateController } = require('../desktop/update-controller.cjs');
test('Mac and Windows artifacts share a GitHub release, Windows updater remains configured',()=>{
 assert.match(pkg.version,/^1\.8\.\d+$/);
 assert.equal(pkg.build.win.target[0].target,'nsis');
 assert.equal(pkg.build.mac.target[0].target,'dmg');
 assert.deepEqual(pkg.build.mac.target[0].arch,['universal']);
 assert.equal(pkg.build.mac.identity,'-'); // Explicit ad-hoc signing for unsigned Mac diagnostic builds
 assert.equal(pkg.build.mac.hardenedRuntime,false);
 assert.match(pkg.scripts['build:mac'],/--mac dmg --universal --publish never -c\.productName=KuunsKanbanCalendar/);
 assert.equal(pkg.build.mac.extendInfo.CFBundleDisplayName, '쿤스 칸반 캘린더');
 assert.equal(pkg.build.productName, '쿤스 칸반 캘린더'); // Windows stays unchanged
 assert.equal(pkg.build.appId, 'com.kuuns.kanban.calendar');
 assert.match(workflow,/needs: windows-release/);
 assert.match(workflow,/gh release upload/);
 assert.match(workflow,/macos-26/);
 assert.match(workflow,/Check macOS executable and helper bundle names/);
 assert.match(workflow,/Launch built Mac app on macOS 26 Apple Silicon/);
 assert.match(workflow,/codesign --verify --deep --strict/);
 assert.match(workflow,/Signature=adhoc/);
});
test('Mac test app never silently downloads/installs unsigned updates',()=>{
 let called = false;
 const controller=createUpdateController({
   app:{isPackaged:true,getVersion:()=>pkg.version},pkg,platform:'darwin',
   updaterFactory:()=>{called=true;}
 });
 const state=controller.start();
 assert.equal(state.phase,'disabled');
 assert.match(state.message,/서명되지 않아 자동 업데이트를 지원하지 않아요/);
 assert.equal(called,false);
});
test('Mac menu bar, command shortcut, tray and system-specific help are configured',()=>{
 assert.match(main,/TRAY_ICON = process\.platform === 'darwin'/);
 assert.match(main,/Menu\.setApplicationMenu\(Menu\.buildFromTemplate/);
 assert.match(main,/process\.platform==='darwin'\?input\.meta:input\.control/);
 assert.match(pre,/platform: process\.platform/);
 assert.match(html,/const PLATFORM=DESKTOP\?\.platform==='darwin'\?'macOS':'Windows'/);
 assert.doesNotMatch(html,/Windows v1\.5\.4/);
 assert.equal(fs.existsSync(path.join(root,'assets/app-mac.png')),true);
});
