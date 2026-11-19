'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('trusted invite trigger accepts only when recipient opted in or was already a member',()=>{
  const sql=read('supabase/migrations/20261113000000_trusted_invite_server_accept.sql');
  assert.match(sql,/AFTER INSERT OR UPDATE OF status, role, invited_by, invited_email/);
  assert.match(sql,/c\.owner_id = v_recipient_id/);
  assert.match(sql,/c\.auto_accept IS TRUE/);
  assert.match(sql,/u\.email_confirmed_at IS NOT NULL/);
  assert.match(sql,/NOT v_trusted AND NOT v_already_joined/);
  assert.match(sql,/INSERT INTO public\.shared_event_members/);
  assert.match(sql,/status = 'accepted'/);
  assert.match(sql,/REVOKE ALL ON FUNCTION/);
});

test('owner member history refreshes after invite acceptance without reopening editor',()=>{
  const code=read('renderer/sharing.js');
  assert.match(code,/if\(editorHistory\.localId && !editorHistory\.loading\)/);
  assert.match(code,/bridge\.sharingSentInvites\(activeRow\.id\)/);
  assert.match(code,/autoAcceptFailureNotified=true/);
  assert.doesNotMatch(code,/sharingAutoAcceptInvites\?\.\(\)\.catch\(\(\)=>\{\}\)/);
});

test('header retains share and account actions, but secondary actions reside in compact menu',()=>{
  const html=read('renderer/index.html');
  const top=html.indexOf('<div class="top-controls">');
  const sharing=html.indexOf('id="sharingLaunch"',top);
  const toggle=html.indexOf('id="backupMenuToggle"',top);
  const menu=html.indexOf('id="backupMenuPanel"',toggle);
  const end=html.indexOf('id="importFile"',menu);
  assert.ok(top>=0&&sharing>top&&toggle>sharing&&menu>toggle);
  for(const id of ['themeToggle','autostartToggle','widgetToggle','notificationBtn','welcomeOpen','feedbackLaunch','updateLaunch','backupFolderBtn','exportBtn','importBtn']){
    const pos=html.indexOf('id="'+id+'"',menu);
    assert.ok(pos>menu&&pos<end,id+' is missing from the menu');
  }
  assert.match(html,/backup-menu-panel\[hidden\].*display:none!important/);
  const account=read('renderer/account-sync.js');
  assert.match(account,/shared\?\.insertAdjacentElement\('afterend',accountButton\)/);
  assert.match(account,/menu\.appendChild\(legacyButton\)/);
});

test('image feedback capability check avoids posting text to legacy receiver',async()=>{
  const {createFeedbackController}=require('../desktop/feedback.cjs');
  let posts=0,gets=0;
  const controller=createFeedbackController({endpoint:'https://script.google.com/macros/s/sample/exec',version:'1.9.22',
    fetchImpl:async(_url,options)=>{
      if(options.method==='GET'){gets++;return {ok:true,text:async()=>'<!DOCTYPE html><html></html>'};}
      posts++;return {ok:true,text:async()=>'{}'};
    }});
  const bytes=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(80,4)]);
  const result=await controller.submit({type:'버그 신고',message:'이미지 테스트입니다.',image:{mimeType:'image/jpeg',dataBase64:bytes.toString('base64')}});
  assert.equal(result.ok,false);
  assert.equal(gets,1);
  assert.equal(posts,0);
  assert.match(result.message,/이미지 저장/);
  assert.match(read('tools/FEEDBACK_APPS_SCRIPT_IMAGE_SUPPORT.gs'),/function doGet\(e\)/);
  assert.match(read('tools/FEEDBACK_APPS_SCRIPT_IMAGE_SUPPORT.gs'),/FEEDBACK_SPREADSHEET_ID/);
});
