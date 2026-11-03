'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
test('v1.9.19 package / lockfile version agree',()=>{
  assert.equal(pkg.version,'1.9.19');
  assert.equal(lock.version,'1.9.19');
  assert.equal(lock.packages[''].version,'1.9.19');
});
test('approved three release notes are present, and earlier notes preserved',()=>{
  assert.deepEqual(notes['1.9.19'],{
    heading:'팀 공용 스티커 및 일정 리액션',
    items:[
      {title:'팀 공용 스티커 라이브러리 추가',description:'동료들이 직접 스티커를 업로드하고 함께 사용할 수 있어요.'},
      {title:'캘린더 스티커 기능 추가',description:'원하는 날짜에 스티커를 붙여 동료들과 공유할 수 있어요.'},
      {title:'일정 리액션 기능 추가',description:'공유 일정에 스티커로 반응하고 서로의 리액션을 확인할 수 있어요.'}
    ]
  });
  for(const version of ['1.9.18','1.9.17','1.9.16','1.9.15','1.9.14','1.9.13','1.9.12'])assert.ok(notes[version]);
});
test('sticker UI, store and client integration retained in release',()=>{
  const main=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
  const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
  assert.match(main,/sticker/);
  assert.match(html,/stickerLibraryGrid/);
  assert.ok(fs.existsSync(path.join(root,'desktop/sticker-utils.cjs')));
  assert.ok(fs.existsSync(path.join(root,'renderer/stickers.js')));
  assert.ok(fs.existsSync(path.join(root,'supabase/migrations/20261103180000_team_stickers.sql')));
});
test('v1.9.19 publish script targets correct release tag',()=>{
  const s=fs.readFileSync(path.join(root,'PUBLISH_v1.9.19_CMD.bat'),'utf8');
  assert.match(s,/refs\/tags\/v1\.9\.19/);
  assert.match(s,/git push origin v1\.9\.19/);
  assert.doesNotMatch(s,/git push origin v1\.9\.18/);
});
