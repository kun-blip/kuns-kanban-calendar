'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const root=path.resolve(__dirname,'..');
const content=name=>fs.readFileSync(path.join(root,name),'utf8');

test('v1.9.11 package and lock versions agree and approved release notes are exact',()=>{
 assert.ok(['1.9.11','1.9.12','1.9.13','1.9.14'].includes(pkg.version)); // Verify historical notes after future releases
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 assert.deepEqual(notes['1.9.11'],{
  heading:'공유 일정 및 캘린더 편집 개선',
  items:[
   {title:'공유 일정 동기화 개선',description:'Mac 공유 일정 반영 속도를 개선하고 새로고침 기능을 추가했어요.'},
   {title:'일정 태그 및 타임라인 편집 개선',description:'@태그 생성, 태그 컬러 설정, 타임라인 우클릭 편집과 날짜 드래그 생성을 지원해요.'},
   {title:'캘린더 사용성 개선',description:'그레이 타임라인 컬러, 테마 모드 텍스트 표시 및 오늘 버튼 동작을 개선했어요.'}
  ]
 });
 assert.equal(notes['1.9.10'].items.length,3, 'older release notes remain accessible');
});

test('new version assets retain manual refresh, tags, theme and timeline features',()=>{
 assert.match(content('renderer/index.html'),/refreshCalendarBtn/);
 assert.match(content('renderer/app.js'),/installRangeSelection/);
 assert.match(content('renderer/app.js'),/contextmenu/);
 assert.match(content('renderer/app.js'),/theme-mode-name/);
 assert.match(content('renderer/app.js'),/#808895/);
 assert.match(content('renderer/sharing.js'),/pendingLocalSync/);
 assert.ok(fs.existsSync(path.join(root,'renderer/event-tags.js')));
});
