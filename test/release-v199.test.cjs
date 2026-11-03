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

test('version and lockfile aligned after v1.9.9',()=>{
 assert.match(pkg.version,/^1\.9\.(?:9|10|11|12|13|14|15|16|17|18|19)$/);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
});
test('v1.9.9 patch note wording stays exactly identical to v1.9.8',()=>{
 assert.deepEqual(catalog['1.9.9'],catalog['1.9.8']);
 assert.equal(catalog['1.9.9'].items.length,3);
});
test('old status values remain readable, while editor uses the tag library',()=>{
 assert.match(html,/id="eventStatus" value="todo"/);
 assert.doesNotMatch(html,/id="eventStatus" class="status-select"/);
 assert.match(html,/id="tagLibraryField"/);
 assert.doesNotMatch(html,/id="filterStatus"/);
 assert.doesNotMatch(app,/STATUS_NAMES/);
});
test('old completed records remain untouched until user explicitly switches status',()=>{
 assert.match(app,/originalEvent&&eventStatus\(originalEvent\)==='done'&&!editingStatusChanged\?'done'/);
 assert.match(app,/completed:chosenStatus==='done',status:chosenStatus/);
 assert.match(sharing,/status:originalSharedStatus/);
 assert.doesNotMatch(sharing,/sharedStatusChanged/);
});
test('event details and share accordion arrows use geometric chevrons centered in both states',()=>{
 for(const stem of ['event-fold-summary','share-fold-summary']){
   const rule=html.match(new RegExp('\\.'+stem+':after\\{([^}]+)\\}'));
   assert.ok(rule,stem);assert.match(rule[1],/content:''/);assert.match(rule[1],/align-self:center/);assert.match(rule[1],/rotate\(45deg\)/);
 }
 assert.match(html,/\.event-fold\[open\]>\.event-fold-summary:after\{transform:translateY\(2px\) rotate\(225deg\)\}/);
 assert.match(html,/\.share-fold\[open\]>\.share-fold-summary:after\{transform:translateY\(2px\) rotate\(225deg\)\}/);
});
