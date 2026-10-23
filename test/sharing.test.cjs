'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {normalizeEvent,validateToken,createSharingClient}=require('../desktop/sharing-client.cjs');
const root=path.join(__dirname,'..');
const config=require('../desktop/sharing-config.json');

test('only deliberately shared fields are included in remote payload',()=>{
 const event=normalizeEvent({id:'some-uuid-123',title:' Test Event ',start:'2026-10-24',end:'2026-10-25',description:'test memo',status:'doing',color:'#112233',checklist:[{text:'private'}],url:'https://private.example/',reminderAt:'secret'});
 assert.equal(event.title,'Test Event');assert.equal(event.local_event_id,'some-uuid-123');
 assert.deepEqual(Object.keys(event.event_data).sort(),['color','status']);
 assert.equal(JSON.stringify(event).includes('private.example'),false);
 assert.equal(JSON.stringify(event).includes('checklist'),false);
});
test('only 64 hex characters or exact custom invitation links are accepted',()=>{
 const token='f'.repeat(64);
 assert.equal(validateToken(token),token);
 assert.equal(validateToken('kuuns-kanban://invite/'+token),token);
 assert.throws(()=>validateToken('https://example.com/?token='+token));
 assert.throws(()=>validateToken('kuuns-kanban://invite/'+token+'/evil'));
 assert.throws(()=>validateToken('1234'));
});
test('unauthenticated clients cannot load, publish or claim shared events',async()=>{
 let requests=0;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuns-share-'));
 try {
   const cli=createSharingClient({url:config.url,publishableKey:config.publishableKey,sessionPath:path.join(dir,'auth.json'),fetchImpl:async()=>{requests++;throw Error('should not call network');}});
   assert.deepEqual(cli.publicStatus(),{signedIn:false,email:'',userId:null});
   await assert.rejects(()=>cli.list(),/인증/);
   await assert.rejects(()=>cli.accept('a'.repeat(64)),/인증/);
   assert.equal(requests,0);
 } finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('OTP login persists session separately and shared reads send authenticated bearer',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuns-share-'));
 const calls=[];
 const fakeFetch=async(uri,opt)=>{
  calls.push({uri,opt});
  const result=uri.endsWith('/otp')?{}:uri.endsWith('/verify')?{access_token:'abc',refresh_token:'refresh',expires_in:3600,user:{id:'b53615c6-e6dd-42b8-8ed2-cb299af49a50',email:'test@example.com'}}:[];
  return {ok:true,text:async()=>JSON.stringify(result)};
 };
 try {
  const sessionFile=path.join(dir,'auth.json');
  const cli=createSharingClient({url:config.url,publishableKey:config.publishableKey,sessionPath:sessionFile,fetchImpl:fakeFetch});
  await cli.requestOtp('test@example.com');
  await cli.verifyOtp('test@example.com','123456');
  assert.equal(cli.publicStatus().signedIn,true);
  const files=fs.readdirSync(dir);assert.deepEqual(files,['auth.json']);
  await cli.list();
  assert.equal(calls[2].opt.headers.Authorization,'Bearer abc');
  assert.equal(calls[2].opt.headers.apikey,config.publishableKey);
  assert.equal(calls[2].uri.includes('/rest/v1/shared_events'),true);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('renderer integration never persists remotely received events into local private data',()=>{
 const src=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
 assert.match(src,/let sharedRemoteEvents=\[\]/);
 assert.match(src,/function allVisibleEvents\(\)\{return data\.events\.concat\(sharedRemoteEvents\);\}/);
 assert.match(src,/const json=JSON\.stringify\(data\)/);
 assert.match(src,/if\(id && id\.startsWith\('shared:'\)\)/);
});
test('Electron IPC is main-frame restricted and protocol token checked',()=>{
 const src=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
 assert.match(src,/sharing:copyInvite/);
 assert.match(src,/isTrustedIpcSender/);
 assert.match(src,/validateToken\(raw\)/);
});
