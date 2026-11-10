'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const Planner=require('../renderer/planner.js');
const html=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');

test('v1.9.15 package and lock versions agree',()=>{
 assert.ok(['1.9.15','1.9.16','1.9.17','1.9.18','1.9.19','1.9.20','1.9.21','1.9.22'].includes(pkg.version));
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
});
test('v1.9.15 approved three release notes are exact; history retained',()=>{
 assert.deepEqual(notes['1.9.15'],{
  heading:'태그 관리 UI 및 주말 일정 표시 개선',
  items:[
   {title:'태그 관리 UI 개선',description:'저장된 태그 목록을 접고 펼칠 수 있으며, 원하는 태그를 클릭해 일정에 즉시 적용할 수 있어요.'},
   {title:'태그 컬러 설정 개선',description:'태그 배경색과 글자색을 각각 설정하고 실시간 미리보기를 지원해요.'},
   {title:'주말 일정 표시 개선',description:'토요일·일요일의 하루 일정도 캘린더에 표시돼요. 여러 날에 걸친 일정은 기존처럼 주말을 건너뛰어 표시됩니다.'}
  ]
 });
 for(const v of ['1.9.14','1.9.13','1.9.12','1.9.11','1.9.10','1.9.9','1.9.8','1.9.7'])assert.ok(notes[v]);
});
test('tag management remains collapsed until selected, and swatches have live preview',()=>{
 assert.match(html,/<details class="tag-library-fold" id="tagLibraryFold">/);
 assert.match(html,/id="tagLibraryTextColor"/);
 assert.match(html,/id="tagLibraryPreviewChip"/);
 assert.match(app,/tagLibraryFold'\)\.open=false/);
});
test('one-day weekends display while multi-day weekends remain excluded',()=>{
 assert.notEqual(Planner.timelineBounds('2026-11-07','2026-11-07','2026-11-02',1),null);
 assert.equal(Planner.timelineBounds('2026-11-07','2026-11-08','2026-11-02',1),null);
});
