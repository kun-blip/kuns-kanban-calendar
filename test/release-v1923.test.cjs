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
test('v1.9.23 approved pop-up is preserved in later versions',()=>{
  assert.ok(['1.9.23','1.9.24','1.9.25'].includes(pkg.version));
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.deepEqual(notes['1.9.23'],{
    heading:'공유 일정·메뉴·피드백 기능 개선',
    items:[
      {title:'공유 일정 자동 수락 개선',description:'동료가 새 일정을 공유하면 자동 수락 설정에 따라 즉시 참여할 수 있도록 개선했어요. 초대 상태와 참여자 목록도 더욱 정확하게 표시되도록 수정했어요.'},
      {title:'상단 메뉴 UI 개선',description:"상단에 늘어나던 여러 기능 버튼을 '전체 메뉴'로 통합했어요. 더욱 깔끔해진 화면에서 필요한 기능을 편리하게 사용할 수 있어요."},
      {title:'피드백 이미지 첨부 지원',description:'이제 피드백에 캡처 이미지를 Ctrl+V로 붙여넣거나 파일로 첨부할 수 있어요. 첨부된 이미지는 피드백과 함께 저장되어 더욱 정확한 문제 전달이 가능해졌어요.'}
    ]
  });
  for(const old of ['1.9.22','1.9.21','1.9.20','1.9.19'])assert.ok(notes[old]);
});
test('v1.9.23 retains the server auto-accept patch, menu and image confirmation',()=>{
  const sql=read('supabase/migrations/20261113000000_trusted_invite_server_accept.sql');
  assert.match(sql,/AFTER INSERT OR UPDATE OF status, role, invited_by, invited_email/);
  assert.match(sql,/c\.auto_accept IS TRUE/);
  const sharing=read('renderer/sharing.js');
  assert.match(sharing,/sharingSentInvites/);
  const html=read('renderer/index.html');
  assert.match(html,/id="backupMenuToggle"/);
  assert.match(html,/id="feedbackLaunch"/);
  const feedback=read('desktop/feedback.cjs');
  assert.match(feedback,/feedback-image-v1/);
  assert.match(feedback,/imageSaved === true/);
  assert.match(read('renderer/feedback-image.js'),/image/);
});
test('v1.9.23 excludes Mini Office and preserves account profile isolation',()=>{
  assert.doesNotMatch(read('renderer/index.html'),/id="officeLaunch"/);
  for(const f of ['renderer/mini-office.js','renderer/mini-office.css','renderer/office-sprites'])
    assert.equal(fs.existsSync(path.join(root,f)),false);
  assert.match(read('desktop/main.cjs'),/createAccountProfiles/);
});
test('v1.9.23 test and release commands avoid previous staging and pager traps',()=>{
  const publish=read('PUBLISH_v1.9.23_CMD.bat');
  assert.match(publish,/refs\/tags\/v1\.9\.23/);
  assert.match(publish,/git push origin v1\.9\.23/);
  assert.match(publish,/GIT_PAGER=cat/);
  assert.match(publish,/git --no-pager diff --cached --name-status/);
  assert.match(publish,/UNSTAGE/);
  assert.match(publish,/Type PUBLISH again/);
  assert.match(publish,/diff --cached --check/);
  assert.doesNotMatch(publish,/^git add -A\s*$/m);
  assert.match(read('RUN_v1.9.23_TESTS_CMD.bat'),/npm\.cmd test/);
});
