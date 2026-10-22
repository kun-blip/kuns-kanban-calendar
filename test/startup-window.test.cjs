'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const main=fs.readFileSync(path.join(root,'desktop','main.cjs'),'utf8');
const renderer=fs.readFileSync(path.join(root,'renderer','index.html'),'utf8');
const preload=fs.readFileSync(path.join(root,'desktop','preload.cjs'),'utf8');
test('startup maximizes the normal calendar window',()=>{
  assert.match(main,/window\.once\('ready-to-show',[\s\S]*?window\.maximize\(\)/);
  assert.match(renderer,/data\.widgetMode=DESKTOP\?false:!!data\.widgetMode/);
});
test('returning from widget returns to maximized calendar',()=>{
  const handler=main.slice(main.indexOf("ipcMain.handle('window:widgetMode'"));
  assert.match(handler,/window\.setAlwaysOnTop\(false\)[\s\S]*?window\.setBounds\(bounds,false\)[\s\S]*?window\.maximize\(\)/);
});
test('a second launch can exit widget mode through the renderer',()=>{
  assert.match(main,/window:openNormalCalendar/);
  assert.match(preload,/onOpenNormalCalendar/);
  assert.match(renderer,/onOpenNormalCalendar/);
});
