'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('v1.9.20 baseline and subsequent package versions match lockfile',()=>{
  assert.ok(['1.9.20','1.9.21'].includes(pkg.version));
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
});
test('approved rollback release notes and previous release history exist',()=>{
  assert.deepEqual(notes['1.9.20'],{
    heading:'스티커 기능 종료 및 캘린더 화면 복원',
    items:[
      {title:'스티커 기능 종료',description:'팀 공용 스티커함과 날짜·일정 리액션 기능을 제거했어요.'},
      {title:'캘린더 사용성 정리',description:'스티커 도입 이전의 간결한 캘린더 화면으로 복원했어요. 기존 일정과 공유 기능은 그대로 유지돼요.'}
    ]
  });
  for(const v of ['1.9.19','1.9.18','1.9.17','1.9.16'])assert.ok(notes[v]);
});
test('sticker UI integration and functionality have been removed',()=>{
  for(const f of ['renderer/index.html','renderer/app.js','renderer/sharing.js','desktop/main.cjs','desktop/preload.cjs','desktop/sharing-client.cjs']){
    const source=read(f);
    assert.doesNotMatch(source,/sticker/i,`${f} should have no sticker code`);
  }
});
test('obsolete client sticker modules and tests are absent',()=>{
  for(const f of ['renderer/stickers.js','desktop/sticker-utils.cjs','test/team-stickers-dev.test.cjs']){
    assert.equal(fs.existsSync(path.join(root,f)),false,f);
  }
});
test('existing sharing and latest release behavior are still included',()=>{
  assert.match(read('renderer/sharing.js'),/공유한 사람:/);
  assert.match(read('desktop/update-controller.cjs'),/downloadedVersion/);
  assert.match(read('desktop/update-controller.cjs'),/await check\(true\)/);
});
test('rollback publish script targets v1.9.20 and removes obsolete files safely',()=>{
  const publish=read('PUBLISH_v1.9.20_CMD.bat');
  assert.match(publish,/refs\/tags\/v1\.9\.20/);
  assert.match(publish,/git push origin v1\.9\.20/);
  const cleanup=read('APPLY_v1.9.20_ROLLBACK_CMD.bat');
  for(const f of ['desktop\\sticker-utils.cjs','renderer\\stickers.js','test\\team-stickers-dev.test.cjs'])assert.ok(cleanup.includes(f));
});
