'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createSharingClient}=require('../desktop/sharing-client.cjs');
const Meta=require('../renderer/shared-event-meta.js');
const config=require('../desktop/sharing-config.json');

const EVENT_ID='22222222-2222-4222-8222-222222222222';
const OWNER_ID='11111111-1111-4111-8111-111111111111';
const MEMBER_ID='33333333-3333-4333-8333-333333333333';
const INVITE_ID='44444444-4444-4444-8444-444444444444';
const oldShare={
 id:EVENT_ID,owner_id:OWNER_ID,local_event_id:'local-sharing-continuity',title:'v1.9.16 공유 유지 테스트',
 description:'작성자와 초대권한 보존',start_date:'2026-11-03',end_date:'2026-11-10',revision:4,
 event_data:{color:'#5367e8',ownerEmail:'Owner@Example.com',status:'doing',url:'',tags:[]}
};
function harness(handler,user={id:MEMBER_ID,email:'member@example.com'}){
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'kuns-1917-upgrade-'));
 const sessionPath=path.join(folder,'sharing-auth.json');
 fs.writeFileSync(sessionPath,JSON.stringify({access_token:'fixture-access',expires_at:Math.floor(Date.now()/1000)+3600,user}));
 const calls=[];
 const client=createSharingClient({url:config.url,publishableKey:config.publishableKey,sessionPath,
  fetchImpl:async(uri,options)=>{
   const suffix=uri.slice(config.url.length);
   const body=options.body?JSON.parse(options.body):null;
   calls.push({suffix,method:options.method||'GET',body});
   const value=await handler({suffix,method:options.method||'GET',body});
   return {ok:true,text:async()=>JSON.stringify(value)};
  }});
 return {client,calls,dispose:()=>fs.rmSync(folder,{recursive:true,force:true})};
}

test('v1.9.16 saved shared event owner, accepted member role, and pending invitation remain readable without mutation',async()=>{
 const h=harness(({suffix})=>{
  if(suffix.includes('/shared_events?'))return [oldShare];
  if(suffix.includes('sharing_list_members'))return [{user_id:MEMBER_ID,email:'member@example.com',role:'editor'}];
  if(suffix.includes('sharing_list_sent_invites'))return [{id:INVITE_ID,invited_email:'pending@example.com',role:'viewer',status:'pending'}];
  throw new Error('unexpected request: '+suffix);
 },{id:OWNER_ID,email:'owner@example.com'});
 try{
  const [events,members,invites]=await Promise.all([h.client.list(),h.client.members(EVENT_ID),h.client.sentInvites(EVENT_ID)]);
  assert.equal(Meta.ownerEmail(events[0],OWNER_ID,'owner@example.com'),'owner@example.com');
  assert.equal(Meta.ownerEmail(events[0],MEMBER_ID,'member@example.com'),'owner@example.com');
  const view=Meta.summary(members,invites);
  assert.equal(view.active.length,1);assert.equal(view.active[0].role,'editor');
  assert.equal(view.pending.length,1);assert.equal(view.pending[0].role,'viewer');
  assert.equal(view.pending[0].email,'pending@example.com');
  assert(h.calls.every(c=>!c.suffix.includes('sharing_update_event')&&!c.suffix.includes('sharing_invite_contacts')));
 }finally{h.dispose();}
});

test('recipient edits a v1.9.16 schedule: original author is kept from server, not the editable form',async()=>{
 const h=harness(({suffix,method,body})=>{
  if(suffix.includes('/shared_events?'))return [{id:EVENT_ID,revision:4,event_data:{ownerEmail:'Owner@Example.com',serverMarker:'preserve-me',status:'todo'}}];
  if(suffix.includes('sharing_update_event'))return [{id:EVENT_ID,revision:5,event_data:body.p_patch.event_data}];
  throw new Error('unexpected request: '+suffix+' '+method);
 });
 try{
  await h.client.editShared(EVENT_ID,4,{
   title:'다음 주로 이동',description:'날짜 수정',start:'2026-11-10',end:'2026-11-10',
   ownerEmail:'attacker@example.com',color:'#aabbcc',status:'doing'
  });
  const request=h.calls.find(c=>c.suffix.includes('sharing_update_event'));
  assert.ok(request,'shared event RPC must run after loading server metadata');
  assert.equal(request.body.p_revision,4,'optimistic concurrency must remain enabled');
  assert.equal(request.body.p_patch.start_date,'2026-11-10');
  assert.equal(request.body.p_patch.event_data.ownerEmail,'owner@example.com');
  assert.equal(request.body.p_patch.event_data.serverMarker,'preserve-me');
  assert.equal(request.body.p_patch.event_data.color,'#aabbcc');
  assert.equal(h.calls.filter(c=>c.suffix.includes('sharing_update_event')).length,1);
  assert.equal(h.calls[0].method,'GET');
 }finally{h.dispose();}
});

test('if server metadata cannot be read, do not update a shared event with missing authorship',async()=>{
 const h=harness(({suffix})=>{
  if(suffix.includes('/shared_events?'))return [];
  throw new Error('write should not be attempted');
 });
 try{
  await assert.rejects(h.client.editShared(EVENT_ID,4,{title:'날짜 변경',start:'2026-11-03',end:'2026-11-03'}),/공유 일정을 다시 불러올 수 없어요/);
  assert.equal(h.calls.length,1);
 }finally{h.dispose();}
});

test('author saving the v1.9.16 test event on newer code preserves ownership; no new invitations are created',async()=>{
 const h=harness(({suffix})=>{
  if(suffix.includes('/shared_events?'))return [{id:EVENT_ID,revision:4}];
  if(suffix.includes('sharing_update_event'))return [{id:EVENT_ID,revision:5}];
  throw new Error('unexpected request: '+suffix);
 },{id:OWNER_ID,email:'owner@example.com'});
 try{
  await h.client.publish({id:'local-sharing-continuity',title:oldShare.title,start:'2026-11-03',end:'2026-11-10'},4);
  const rpc=h.calls.find(c=>c.suffix.includes('sharing_update_event'));
  assert.ok(rpc);assert.equal(rpc.body.p_patch.event_data.ownerEmail,'owner@example.com');
  assert(h.calls.every(c=>!c.suffix.includes('sharing_invite_contacts')));
 }finally{h.dispose();}
});

test('app upgrade keeps the same userData storage location and does not change the shared auth filename',()=>{
 const main=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8');
 assert.match(main,/app\.getPath\('userData'\)/);
 assert.match(main,/['"]sharing-auth\.json['"]/);
});
