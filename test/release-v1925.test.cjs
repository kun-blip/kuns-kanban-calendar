'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('v1.9.25 approved release notes preserve the combined v1.9.23–v1.9.25 features',()=>{
  const pkg=require('../package.json');
  const lock=require('../package-lock.json');
  const notes=require('../desktop/release-notes.json');
  assert.equal(pkg.version,'1.9.25');
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.match(notes['1.9.25'].heading,/Slack 연동/);
  const all=JSON.stringify(notes['1.9.25']);
  for(const feature of ['전체 메뉴','자동 수락','피드백','등록·수정·취소',
    '소유자','지난 공유 일정','개인 일정','오발송'])assert.ok(all.includes(feature),feature);
  assert.match(all,/운영 승인 후/);
  assert.ok(notes['1.9.23']);
  assert.ok(notes['1.9.22']);
});

test('v1.9.25 release keeps sends locked by default and requires individual owner consent',()=>{
  const sql=read('supabase/drafts/slack_regina_companywide_owner_consent.sql');
  const client=read('desktop/sharing-client.cjs');
  const renderer=read('renderer/slack-integration.js');
  assert.match(sql,/c\.send_enabled IS TRUE/);
  assert.match(sql,/o\.revoked_at IS NULL/);
  assert.match(client,/rpc\/slack_set_owner_consent/);
  assert.match(renderer,/ownerConsentRequired===true/);
  assert.match(renderer,/window\.confirm/);
  assert.doesNotMatch(renderer,/slackSetEventOptin|slackEventOptins/);
  assert.doesNotMatch(client,/SLACK_BOT_TOKEN|xoxb-/);
});

test('v1.9.25 Windows publish script double-confirms and never bypasses safety gates',()=>{
  const publish=read('PUBLISH_v1.9.25_CMD.bat');
  assert.match(publish,/if not "%VERSION%"=="1\.9\.25"/);
  assert.match(publish,/git ls-remote --tags origin refs\/tags\/v1\.9\.25/);
  assert.match(publish,/call npm\.cmd test/);
  assert.match(publish,/Database send_enabled=false/);
  assert.match(publish,/SLACK_SEND_ENABLED=false/);
  assert.match(publish,/FINALCONFIRM/);
  assert.match(publish,/git push origin v1\.9\.25/);
  assert.doesNotMatch(publish,/^git add -A\s*$/m);
});
