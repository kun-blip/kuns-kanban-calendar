'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');

test('v1.9.24 release notes use the approved Slack wording and retain history',()=>{
  assert.ok(['1.9.24','1.9.25'].includes(pkg.version));
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.deepEqual(notes['1.9.24'],{
    heading:'💬 레지나 Slack 연동 추가',
    items:[
      {title:'회사 Slack 채널 연결',description:"회사 Slack 채널 '쌤띵-소재의-방' 연결"},
      {title:'공유 일정별 Slack 알림 동의 및 미리보기',description:'공유 일정별 Slack 알림 동의 설정 및 미리보기 추가'},
      {title:'공유 일정 알림 기능 준비',description:'공유 일정 생성·수정·취소 알림 기능 준비'},
      {title:'개인 데이터 보호',description:'개인 일정, 투두, 고정 메모는 Slack 전송에서 제외'},
      {title:'자동 발송은 별도 승인',description:'일정 자동 알림은 별도 승인 후 활성화'}
    ]
  });
  assert.ok(notes['1.9.23']);
  assert.ok(notes['1.9.8']);
  assert.ok(notes['1.9.9']);
});

test('v1.9.24 development UI shows future shared events and never ships Slack credentials',()=>{
  const ui=read('renderer/slack-integration.js');
  assert.match(ui,/status\.serverSendEnabled===true/);
  assert.match(ui,/localToday\(\)/);
  assert.match(ui,/owner_id===session\.userId/);
  assert.doesNotMatch(ui,/slackSetEventOptin|slackEventOptins/);
  assert.doesNotMatch(ui,/SLACK_BOT_TOKEN|xoxb-/);
  assert.match(read('supabase/functions/slack-regina-dispatch/index.ts'),/slack_first_test_delivery\?select=sent_at/);
  assert.match(read('RUN_v1.9.24_TESTS_CMD.bat'),/npm\.cmd test/);
  assert.match(read('BUILD_v1.9.24_TEST_CMD.bat'),/npm\.cmd run build:win/);
  assert.doesNotMatch(read('BUILD_v1.9.24_TEST_CMD.bat'),/publish:win|publish always|git push/i);
});
