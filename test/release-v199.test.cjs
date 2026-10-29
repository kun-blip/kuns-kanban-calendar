'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
const sharing=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
const catalog=require('../desktop/release-notes.json');
const pkg=require('../package.json');
const lock=require('../package-lock.json');

test('v1.9.9 version and lockfile aligned',()=>{
 assert.equal(pkg.version,'1.9.9');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
});
test('v1.9.9 patch note wording stays exactly identical to v1.9.8',()=>{
 assert.deepEqual(catalog['1.9.9'],catalog['1.9.8']);
 assert.equal(catalog['1.9.9'].items.length,3);
});
test('event status dropdown has exactly soft launch and live choices',()=>{
 const markup=html.match(/<select id="eventStatus"[^>]*>([\s\S]*?)<\/select>/)?.[1];
 assert.ok(markup,'status select exists');
 assert.deepEqual([...markup.matchAll(/<option value="([^"]+)">([^<]+)<\/option>/g)].map(x=>[x[1],x[2]]),[['todo','소프트런칭'],['doing','라이브']]);
 const filter=html.match(/<select id="filterStatus"[^>]*>([\s\S]*?)<\/select>/)?.[1];
 assert.ok(filter);assert(!filter.includes('예정 -')&&!filter.includes('진행 -'));
 assert.match(app,/const STATUS_NAMES=\{todo:'소프트런칭',doing:'라이브',done:'완료'\}/);
});
test('old completed records remain untouched until user explicitly switches status',()=>{
 assert.match(app,/originalEvent&&eventStatus\(originalEvent\)==='done'&&!editingStatusChanged\?'done'/);
 assert.match(app,/completed:chosenStatus==='done',status:chosenStatus/);
 assert.match(sharing,/originalSharedStatus==='done'&&!sharedStatusChanged\?'done':status.value/);
 assert.match(sharing,/for\(const \[v,label\] of \[\['todo','소프트런칭'\],\['doing','라이브'\]\]\)/);
});
test('event details and share accordion arrows use geometric chevrons centered in both states',()=>{
 for(const stem of ['event-fold-summary','share-fold-summary']){
   const rule=html.match(new RegExp('\\.'+stem+':after\\{([^}]+)\\}'));
   assert.ok(rule,stem);assert.match(rule[1],/content:''/);assert.match(rule[1],/align-self:center/);assert.match(rule[1],/rotate\(45deg\)/);
 }
 assert.match(html,/\.event-fold\[open\]>\.event-fold-summary:after\{transform:translateY\(2px\) rotate\(225deg\)\}/);
 assert.match(html,/\.share-fold\[open\]>\.share-fold-summary:after\{transform:translateY\(2px\) rotate\(225deg\)\}/);
});
