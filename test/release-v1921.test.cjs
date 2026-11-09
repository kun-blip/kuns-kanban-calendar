'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('v1.9.21 package version, lockfile and historical release notes',()=>{
  assert.equal(pkg.version,'1.9.21');
  assert.equal(lock.version,'1.9.21');
  assert.equal(lock.packages[''].version,'1.9.21');
  for(const v of ['1.9.20','1.9.19','1.9.18','1.9.17'])assert.ok(notes[v]);
});
test('v1.9.21 approved customer support update notes are exact',()=>{
  assert.deepEqual(notes['1.9.21'],{
    heading:'공유 일정 우선 표시 및 계정 기반 데이터 동기화',
    items:[
      {title:'공유 일정 우선 표시',description:'여러 일정이 겹칠 때 공유 중인 일정을 타임라인 상단에 우선 표시하도록 개선했어요.'},
      {title:'계정 기반 데이터 동기화',description:'개인 일정과 메모, 할 일 등을 계정에 저장하고 다른 기기에서도 확인할 수 있도록 계정 동기화 기능을 추가했어요.'}
    ]
  });
});
test('account sync feature and shared-first ordering are wired into renderer and desktop',()=>{
  assert.match(read('renderer/index.html'),/account-sync\.js/);
  assert.match(read('renderer/app.js'),/KuunsTimelinePriority/);
  assert.match(read('renderer/app.js'),/KuunsAccountSync/);
  assert.match(read('desktop/preload.cjs'),/accountSnapshotGet/);
  assert.match(read('desktop/sharing-client.cjs'),/calendar_account_snapshots/);
});
test('v1.9.21 release contains no mini-office feature',()=>{
  const index=read('renderer/index.html');
  assert.doesNotMatch(index,/mini-office|officeLaunch|KUN.S MINI OFFICE/i);
  for(const f of ['renderer/mini-office.js','renderer/mini-office.css','renderer/office-model.js','renderer/office-sprites']){
    assert.equal(fs.existsSync(path.join(root,f)),false,f);
  }
});
test('new publish script targets only v1.9.21 and checks staging and Git whitespace',()=>{
  const publish=read('PUBLISH_v1.9.21_CMD.bat');
  assert.match(publish,/refs\/tags\/v1\.9\.21/);
  assert.match(publish,/git push origin v1\.9\.21/);
  assert.match(publish,/diff --cached --check/);
  assert.match(publish,/Type PUBLISH/);
  assert.doesNotMatch(publish,/git add -A\s*(?:\r?\n|$)/);
});
