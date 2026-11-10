'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const html=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
const share=fs.readFileSync(path.join(__dirname,'../renderer/sharing.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
test('v1.9.16 build and lock versions are aligned',()=>{
 assert.ok(['1.9.16','1.9.17','1.9.18','1.9.19','1.9.20','1.9.21','1.9.22'].includes(pkg.version));assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
});
test('v1.9.16 approved three patch notes are exact and prior notes retained',()=>{
 assert.deepEqual(notes['1.9.16'],{
  heading:'공유 일정 및 초대 이력 개선',
  items:[
   {title:'공유 일정 작성자 표시',description:'공유된 일정의 작성자를 확인할 수 있도록 개선했어요.'},
   {title:'공유 권한 및 초대 이력 개선',description:'기존에 초대한 동료와 보기/편집 권한을 일정 편집창에서도 확인할 수 있어요.'},
   {title:'불필요한 상태 UI 정리',description:'이전 상태 기능의 잔여 표시를 제거하고 일정 화면을 간결하게 정리했어요.'}
  ]
 });
 assert.ok(notes['1.9.15']);assert.ok(notes['1.9.14']);assert.ok(notes['1.9.7']);
});
test('owner metadata, share permission history and legacy status cleanup UI remain wired',()=>{
 assert.match(html,/src="\.\/shared-event-meta\.js"/);
 assert.match(share,/공유한 사람:/);
 assert.match(share,/loadOwnerInvitationHistory/);
 assert.match(share,/sharingMembers\(row.id\)/);
 assert.match(share,/sharingSentInvites\(row.id\)/);
 assert.doesNotMatch(html,/id="filterStatus"/);
});
