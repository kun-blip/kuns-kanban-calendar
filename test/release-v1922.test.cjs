'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
test('v1.9.22 version, package lock, and historical notes are preserved',()=>{
  assert.equal(pkg.version,'1.9.22');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  for(const old of ['1.9.21','1.9.20','1.9.19','1.9.18'])assert.ok(notes[old]);
});
test('v1.9.22 popup copies user-approved notes exactly',()=>{
  assert.deepEqual(notes['1.9.22'],{
    heading:'타임라인 자유 배치 및 계정별 데이터 보호',
    items:[
      {title:'타임라인 블록 자유 배치',description:'일정 블록을 위아래로 드래그하여 원하는 줄로 이동할 수 있도록 개선했어요. 블록 간 겹침 현상도 수정하고, 공유 일정의 우선 표시 방식을 개선했어요.'},
      {title:'계정별 데이터 분리',description:'일정, 고정 메모, Daily Todo 등 개인 데이터를 로그인 계정별로 분리했어요. 로그아웃하면 이전 계정의 개인 데이터가 화면에 남지 않도록 수정했어요.'},
      {title:'신규 설치 데이터 초기화',description:'처음 설치한 캘린더는 예시 일정이나 메모 없이 빈 화면으로 시작해요.'},
      {title:'기존 데이터 보호 및 복원',description:'업데이트 후에도 기존 개인 데이터는 삭제되지 않아요. 이전 PC에 저장된 데이터는 본인 계정으로 안전하게 가져올 수 있도록 개선했어요.'}
    ]
  });
});
test('v1.9.22 release integrates timeline and account segregation without mini office',()=>{
  const app=read('renderer/app.js');
  const main=read('desktop/main.cjs');
  assert.match(app,/timelineRowPositions|timelineOrder/);
  assert.match(app,/KuunsTimelinePriority/);
  assert.match(main,/createAccountProfiles/);
  assert.match(read('desktop/account-profiles.cjs'),/if\(id==='guest'\)return ''/);
  assert.match(read('desktop/account-profiles.cjs'),/legacyPath\(\)/);
  for(const file of ['renderer/mini-office.js','renderer/mini-office.css','renderer/office-sprites']){
    assert.equal(fs.existsSync(path.join(root,file)),false);
  }
  assert.doesNotMatch(read('renderer/index.html'),/id="officeLaunch"/);
});
test('v1.9.22 publish script targets only its new tag and stages named paths',()=>{
  const script=read('PUBLISH_v1.9.22_CMD.bat');
  assert.match(script,/refs\/tags\/v1\.9\.22/);
  assert.match(script,/git push origin v1\.9\.22/);
  assert.match(script,/diff --cached --check/);
  assert.match(script,/Type PUBLISH again/);
  assert.doesNotMatch(script,/^git add -A\s*$/m);
  assert.doesNotMatch(script,/^git add \.\s*$/m);
  assert.match(read('RUN_v1.9.22_TESTS_CMD.bat'),/npm\.cmd test/);
});
