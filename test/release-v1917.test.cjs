'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');

test('v1.9.17 package and lockfile versions match',()=>{
 assert.equal(pkg.version,'1.9.17');
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
});
test('v1.9.17 approved patch notes are exact, earlier releases remain available',()=>{
 assert.deepEqual(notes['1.9.17'],{
  heading:'공유 일정 정보 유지 및 공동 편집 안정성 개선',
  items:[
   {title:'공유 일정 정보 유지 개선',description:'기존 공유 일정의 작성자 및 초대·권한 정보가 다음 버전에서도 안정적으로 유지되도록 보완했어요.'},
   {title:'공동 편집 안정성 개선',description:'동료가 공유 일정을 수정해도 기존 작성자 정보가 유지되도록 개선했어요.'}
  ]
 });
 for(const version of ['1.9.16','1.9.15','1.9.14','1.9.13','1.9.12','1.9.11','1.9.10','1.9.9','1.9.8','1.9.7']) assert.ok(notes[version]);
});
test('shared-event preservation code and upgrade regression cases are shipped',()=>{
 const client=fs.readFileSync(path.join(__dirname,'../desktop/sharing-client.cjs'),'utf8');
 assert.match(client,/delete merged\.ownerEmail/);
 assert.match(client,/공유 일정을 다시 불러올 수 없어요/);
 assert.ok(fs.existsSync(path.join(__dirname,'sharing-upgrade-continuity-dev.test.cjs')));
});
