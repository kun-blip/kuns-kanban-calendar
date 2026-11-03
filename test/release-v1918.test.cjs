'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
test('v1.9.18 package and lockfile version match',()=>{
  assert.equal(pkg.version,'1.9.18');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
});
test('v1.9.18 approved patch notes retain previous release history',()=>{
  assert.deepEqual(notes['1.9.18'],{
    heading:'최신 버전 업데이트 및 공유 일정 표시 개선',
    items:[
      {title:'최신 버전 업데이트 개선',description:'중간 버전을 거치지 않고 가장 최근에 배포된 버전을 다시 확인하도록 개선했어요.'},
      {title:'공유 일정 표시 간소화',description:'타임라인의 공유자 표시는 제거하고, 공유 상세 화면에서만 확인할 수 있도록 정리했어요.'}
    ]
  });
  for(const version of ['1.9.17','1.9.16','1.9.15','1.9.14','1.9.13','1.9.12','1.9.11','1.9.10','1.9.9','1.9.8','1.9.7'])assert.ok(notes[version]);
});
test('v1.9.18 updater and shared owner visibility regression tests are included',()=>{
  const updater=fs.readFileSync(path.join(__dirname,'../desktop/update-controller.cjs'),'utf8');
  const sharing=fs.readFileSync(path.join(__dirname,'../renderer/sharing.js'),'utf8');
  assert.match(updater,/downloadedVersion/);
  assert.match(updater,/await check\(true\)/);
  assert.match(sharing,/공유한 사람:/);
  assert.ok(fs.existsSync(path.join(__dirname,'update-latest-release-and-owner-visibility.test.cjs')));
});
