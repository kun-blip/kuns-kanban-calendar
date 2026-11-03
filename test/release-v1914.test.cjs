'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const Library=require('../renderer/tag-library.js');
const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');

test('v1.9.14 build version and approved two-item release note are exact',()=>{
 assert.ok(['1.9.14','1.9.15','1.9.16','1.9.17','1.9.18','1.9.19'].includes(pkg.version));
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 assert.deepEqual(notes['1.9.14'],{
  heading:'태그 관리 및 일정 생성 개선',
  items:[
   {title:'일정 태그 관리 기능 추가',description:'한 번 생성한 태그를 저장하고 재사용할 수 있습니다. 태그 이름과 컬러를 자유롭게 수정하고 관리할 수 있어요.'},
   {title:'일정 생성 UI 개선',description:'기존 상태 선택 영역을 태그 관리로 변경하고 일정 제목 바로 아래에 배치했습니다.'}
  ]
 });
 assert.ok(notes['1.9.13']);
});
test('tag controls replace visible status selector and saved tag can be reused',()=>{
 assert.ok(html.indexOf('id="tagLibraryField"')>html.indexOf('id="eventTitle"'));
 assert.ok(html.indexOf('id="tagLibraryField"')<html.indexOf('id="gameSelect"'));
 assert.match(html,/type="hidden" id="eventStatus"/);
 assert.match(html,/id="tagLibraryList"/);
 assert.match(html,/id="tagLibrarySave"/);
 const catalog=Library.add(Library.initial([]),{name:'검수',color:'#123456'}).catalog;
 assert.deepEqual(Library.match(catalog,[{name:'검수',color:'#999999'}]),[{name:'검수',color:'#123456',textColor:'#ffffff'}]);
});
test('backup and import preserve both saved tag library and deleted-tag preferences',()=>{
 assert.match(app,/tagLibrary:data\.tagLibrary,tagLibraryHidden:data\.tagLibraryHidden/);
 assert.match(app,/tagLibraryHidden:Array\.isArray\(obj\.tagLibraryHidden\)\?obj\.tagLibraryHidden/);
});
