'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {scopeId,createAccountProfiles}=require('../desktop/account-profiles.cjs');
const one='78e3101b-bb74-4b19-9494-7e660070ce56';
const two='34217215-57db-48d6-83a4-1be7d72068b6';
const json=(name)=>JSON.stringify({events:[{id:name,title:name,start:'2026-11-09',end:'2026-11-09'}],notes:[{id:name,title:name}],todos:[{id:name,text:name}]});
function mount(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kun-accounts-test-'));
 let status={signedIn:false,userId:null};
 const store=createAccountProfiles({userDir:()=>root,status:()=>status});
 return {root,store,set:next=>status=next,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
const signed=(userId)=>({signedIn:true,userId});
test('signed-out guest is always empty; two authenticated users retain independent files',()=>{
 const ctx=mount();try{
  const {store,set}=ctx;
  assert.equal(store.scope(),'guest');
  assert.equal(store.read(),'');
  // Simulate an old build that had previously saved private data in the guest profile.
  const staleGuest=store.guestLegacyPath();fs.mkdirSync(path.dirname(staleGuest),{recursive:true});fs.writeFileSync(staleGuest,json('guest-data'));
  set(signed(one));assert.equal(store.read(),'');store.write(one,json('account-A'));
  set(signed(two));assert.equal(store.read(),'');store.write(two,json('account-B'));
  set({signedIn:false,userId:null});assert.equal(store.read(),'');
  assert.throws(()=>store.write('guest',json('unsafe')),/로그인/);
  assert.match(fs.readFileSync(staleGuest,'utf8'),/guest-data/,'historical guest data is preserved');
  set(signed(one));assert.match(store.read(),/account-A/);
  assert.doesNotMatch(store.read(),/account-B/);
  set(signed(two));assert.match(store.read(),/account-B/);
  assert.doesNotMatch(store.read(),/account-A/);
  assert.notEqual(store.reminderPath(one),store.reminderPath(two));
 }finally{ctx.close();}
});
test('a pending pre-logout write cannot save old account data into the guest or next account',()=>{
 const ctx=mount();try{
  const {store,set}=ctx;
  set(signed(one));store.write(one,json('A-before'));
  set({signedIn:false});
  assert.throws(()=>store.write(one,json('A-after')),/계정/);
  assert.equal(store.read(),'');
  set(signed(two));
  assert.throws(()=>store.write(one,json('A-after')),/계정/);
  assert.equal(store.read(),'');
  set(signed(one));assert.match(store.read(),/A-before/);
 }finally{ctx.close();}
});
test('unscoped legacy data is retained but is never automatically displayed after logout',()=>{
 const ctx=mount();try{
  fs.writeFileSync(ctx.store.legacyPath(),json('secret-legacy'));
  assert.equal(ctx.store.read(),'');
  ctx.set(signed(one));assert.equal(ctx.store.read(),'');
  ctx.set({signedIn:false});assert.equal(ctx.store.read(),'');
  assert.match(fs.readFileSync(ctx.store.legacyPath(),'utf8'),/secret-legacy/);
 }finally{ctx.close();}
});
test('legacy migration requires explicit import, retains original and blocks other-account attribution',()=>{
 const ctx=mount();try{
  const {store,set}=ctx;
  const legacy=json('legacy');
  fs.writeFileSync(store.legacyPath(),legacy);
  assert.equal(store.legacyStatus().canImport,false);
  set(signed(one));assert.equal(store.legacyStatus().canImport,true);
  assert.deepEqual(store.importLegacy().legacyPreserved,true);
  assert.match(store.read(),/legacy/);
  assert.equal(fs.readFileSync(store.legacyPath(),'utf8'),legacy);
  assert.equal(store.legacyStatus().canImport,false);
  set(signed(two));assert.equal(store.read(),'');
  assert.equal(store.legacyStatus().canImport,true);
  fs.writeFileSync(store.legacyPath(),JSON.stringify({...JSON.parse(legacy),cloudAccount:{userId:one,revision:2,hash:'x'}}));
  assert.equal(store.legacyStatus().reason,'different-owner');
  assert.throws(()=>store.importLegacy(),/가져올/);
 }finally{ctx.close();}
});
test('malformed user ID cannot escape profile storage root',()=>{
 assert.equal(scopeId(signed('../../other')),'guest');
 const ctx=mount();try{
  assert.throws(()=>ctx.store.dataPath('../../other'),/Invalid/);
 }finally{ctx.close();}
});
test('renderer reloads after login/logout and all local saves are scope-bound',()=>{
 const sharing=fs.readFileSync(path.join(__dirname,'../renderer/sharing.js'),'utf8');
 const preload=fs.readFileSync(path.join(__dirname,'../desktop/preload.cjs'),'utf8');
 const main=fs.readFileSync(path.join(__dirname,'../desktop/main.cjs'),'utf8');
 assert.match(sharing,/sharingSignOut\(\)[\s\S]{0,300}location\.reload\(/);
 assert.match(sharing,/sharingVerifyOtp\(pending,code\.value\)[\s\S]{0,300}location\.reload\(/);
 assert.match(preload,/getBootScope=.*ipcRenderer\.sendSync\('calendar:scope'\)/);
 assert.match(preload,/ipcRenderer\.invoke\('calendar:save', json, getBootScope\(\)\)/);
 assert.match(main,/bootScope!==accountProfiles\.scope\(\)/);
});

test('logged-out guest remains empty even when an old guest file is present; explicit import can restore safely',()=>{
 const ctx=mount();try{
  const {store,set}=ctx;
  fs.mkdirSync(path.dirname(store.guestLegacyPath()),{recursive:true});
  const old=json('stale-guest-private');fs.writeFileSync(store.guestLegacyPath(),old);
  assert.equal(store.read(),'');
  assert.equal(store.legacyStatus().reason,'login-required');
  assert.throws(()=>store.write('guest',json('new-private')),/로그인/);
  assert.equal(fs.readFileSync(store.guestLegacyPath(),'utf8'),old);
  set(signed(one));assert.equal(store.read(),'');
  assert.equal(store.legacyStatus().canImport,true);
  const result=store.importLegacy();assert.equal(result.legacyPreserved,true);
  assert.match(store.read(),/stale-guest-private/);
  set({signedIn:false});assert.equal(store.read(),'');
  set(signed(one));assert.match(store.read(),/stale-guest-private/);
 }finally{ctx.close();}
});

test('guest renderer uses a blank view and never saves demo state on sign-out',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
 const preload=fs.readFileSync(path.join(__dirname,'../desktop/preload.cjs'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
 assert.match(preload,/calendarScope:\s*\(\)\s*=>\s*getBootScope\(\)/);
 assert.match(app,/const SIGNED_OUT_DESKTOP=DESKTOP\?\.calendarScope\?\.\(\)==='guest'/);
 assert.match(app,/if\(SIGNED_OUT_DESKTOP\)\{notify\('로그인한 뒤 일정을 저장할 수 있어요.'/);
 assert.match(app,/account-signed-out-shield/);
 assert.match(html,/\.account-signed-out-shield/);
});
