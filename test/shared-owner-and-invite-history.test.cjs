'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const Meta=require('../renderer/shared-event-meta.js');
const Tags=require('../renderer/tag-library.js');
const {createSharingClient,normalizeEvent}=require('../desktop/sharing-client.cjs');
const config=require('../desktop/sharing-config.json');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('shared schedule identifies its owner by email, never invents an identity for legacy records',()=>{
 const mine={owner_id:'user-me',event_data:{}};
 const recent={owner_id:'user-other',event_data:{ownerEmail:'Designer@Example.com'}};
 assert.equal(Meta.ownerLabel(mine,'user-me','owner@example.com'),'owner@example.com');
 assert.equal(Meta.ownerLabel(recent,'user-me','owner@example.com'),'designer@example.com');
 assert.match(Meta.ownerLabel({owner_id:'user-unknown',event_data:{}},'user-me','owner@example.com'),/이전 버전/);
 assert.equal(Meta.ownerEmail({owner_id:'other',event_data:{ownerEmail:'bad-email'}}),'');
 assert.equal(Meta.ownerEmail({owner_id:'other',owner_email:'Legacy@Example.com'}),'legacy@example.com');
});

test('saved permission summary preserves pending, active, historical roles without duplicates',()=>{
 const result=Meta.summary([{user_id:'u-1',email:'a@example.com',role:'editor'}],[
   {id:'invite-1',invited_email:'a@example.com',role:'viewer',status:'accepted'},
   {id:'invite-2',invited_email:'b@example.com',role:'viewer',status:'pending'},
   {id:'invite-3',invited_email:'c@example.com',role:'editor',status:'declined'}]);
 assert.equal(result.active.length,1);
 assert.equal(result.active[0].role,'editor');
 assert.equal(result.pending.length,1);
 assert.equal(result.pending[0].email,'b@example.com');
 assert.equal(result.history.length,1);
 assert.equal(result.history[0].role,'editor');
});

test('the creator email is placed in shared event metadata on publish without adding a new database column',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuns-owner-'));
 const saved=path.join(dir,'auth.json');
 const calls=[];
 fs.writeFileSync(saved,JSON.stringify({access_token:'test-token',expires_at:Math.floor(Date.now()/1000)+9999,
   user:{id:'11111111-1111-4111-8111-111111111111',email:'Owner@Example.com'}}));
 try{
   const client=createSharingClient({url:config.url,publishableKey:config.publishableKey,sessionPath:saved,
     fetchImpl:async (uri,options)=>{
       calls.push({uri,options});
       const result=options.method==='POST'?[{id:'22222222-2222-4222-8222-222222222222'}]:[];
       return {ok:true,text:async()=>JSON.stringify(result)};
     }});
   await client.publish({id:'local-1',title:'검수',start:'2026-11-03',end:'2026-11-03'});
   const sent=JSON.parse(calls.find(call=>call.options.method==='POST').options.body);
   assert.equal(sent.event_data.ownerEmail,'owner@example.com');
   const patch=normalizeEvent({id:'remote-edit',title:'검수',start:'2026-11-03',end:'2026-11-03',ownerEmail:sent.event_data.ownerEmail});
   assert.equal(patch.event_data.ownerEmail,sent.event_data.ownerEmail);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('old workflow tags are not added by default, but genuine user tags are never deleted',()=>{
 assert.deepEqual(Tags.initial([]),[]);
 const saved=[{name:'소프트런칭',color:'#34795e'},{name:'라이브',color:'#168ab8'},
   {name:'검수',color:'#123456'},{name:'라이브',color:'#199999'}];
 const cleaned=Tags.withoutUnusedLegacyPresets(saved,[]);
 assert(!cleaned.some(x=>x.name==='소프트런칭'));
 assert(cleaned.some(x=>x.name==='검수'));
 const used=Tags.withoutUnusedLegacyPresets([{name:'소프트런칭',color:'#34795e'}],[{tags:[{name:'소프트런칭',color:'#34795e'}]}]);
 assert.equal(used.length,1);
 const customized=Tags.withoutUnusedLegacyPresets([{name:'라이브',color:'#123456'}],[]);
 assert.equal(customized.length,1);
});

test('legacy state labels and filtering are absent from user-facing UI',()=>{
 const app=read('renderer/app.js');const html=read('renderer/index.html');const share=read('renderer/sharing.js');
 assert.doesNotMatch(html,/id="filterStatus"/);
 assert.doesNotMatch(app,/STATUS_NAMES/);
 assert.doesNotMatch(share,/\['todo','소프트런칭'\]/);
 assert.doesNotMatch(share,/line\(section,'h4','상태'/);
 assert.match(app,/sharedOwnerLabel/);
 assert.match(share,/loadOwnerInvitationHistory/);
 assert.match(share,/sharingMembers\(row.id\)/);
 assert.match(share,/sharingSentInvites\(row.id\)/);
 assert.match(html,/src="\.\/shared-event-meta.js"/);
});
