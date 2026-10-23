'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const client=fs.readFileSync(path.join(root,'desktop/sharing-client.cjs'),'utf8');
const ui=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
const main=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
const preload=fs.readFileSync(path.join(root,'desktop/preload.cjs'),'utf8');
test('contacts private API and strict roles are wired',()=>{
 for(const name of ['contactsList','contactAdd','contactUpdate','contactRemove','inviteContacts','inbox','respond','members','role','editShared'])assert.match(client,new RegExp(name+':'));
 assert.match(client,/\['viewer','editor'\]/);
});
test('app IPC and preload expose collaboration functionality',()=>{
 for(const channel of ['contactsList','inviteContacts','inbox','respond','role','editShared']){
  assert.ok(main.includes("shareHandle('"+channel+"'"));
  assert.ok(preload.includes("sharing:"+channel));
 }
});
test('event create flow offers inline invited colleagues and remains local-first',()=>{
 assert.match(ui,/function renderEventPicker\(/);
 assert.match(ui,/saveAndInvite\(/);
 assert.match(ui,/sharingInviteContacts/);
 const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
 assert.match(app,/sharing\.saveAndInvite\(record,invitees/);
 assert.match(app,/data\.events\.push\(record\)/);
});
test('role editing and server revision conflict are required',()=>{
 assert.match(client,/p_revision:revision/);
 assert.match(client,/sharing_update_event/);
 assert.match(ui,/sharingEditShared\(r\.id,Number\(r\.revision\)/);
 assert.match(ui,/remoteReadOnly:remoteRole\(r\)!=='editor'/);
});
