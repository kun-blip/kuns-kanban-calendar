'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {createSharingClient,validateAccountSnapshot}=require('../desktop/sharing-client.cjs');
const root=path.join(__dirname,'..');
function loadScript(file){const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'renderer',file),'utf8'),context);return context;}
const event=(title,id)=>({id,title,start:'2026-11-09',end:'2026-11-09',color:'#5671dc'});
const sample=()=>({events:[event('예시 · 프로모션 영상 제작','sample')],notes:[{id:'sample',title:'첫 번째 메모',body:'일정과 메모는 PC에 자동 저장됩니다.'}],todos:[],tagLibrary:[],tagLibraryHidden:[],games:[{id:'randomdice2',name:'Random Dice 2',icon:''}],shortcuts:[],recentColors:[]});
function setupUI(data,cloudGet){
  const el={textContent:'',title:'',className:'',setAttribute(){},addEventListener(){},id:'accountSyncLaunch'};
  const doc={getElementById:()=>el,visibilityState:'visible',addEventListener(){}};
  const context={document:doc,window:null,setTimeout:()=>1,clearTimeout(){},setInterval(){},Date,JSON,Math,console,confirm:()=>false,prompt:()=>null};
  context.window=context;context.addEventListener=()=>{};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'renderer/account-sync.js'),'utf8'),context);
  let uploaded=0,backupCount=0,saveCount=0,importCount=0;
  const bridge={accountSnapshotGet:cloudGet,accountSnapshotCreate:async payload=>{uploaded++;return {payload,revision:1};},accountSnapshotUpdate:async(payload,rev)=>({payload,revision:rev+1})};
  const ctrl=context.KuunsAccountSync.createAccountSync({bridge,getData:()=>data,
    applyCloud:async payload=>{Object.assign(data,JSON.parse(JSON.stringify(payload)));importCount++;},
    saveLocal:async()=>{saveCount++;},backup:async()=>{backupCount++;},notify:()=>{}});
  return {ctrl,el,data,metrics:()=>({uploaded,backupCount,saveCount,importCount})};
}
test('CS timeline lane ordering prioritizes both owned shares and incoming shares before local events',()=>{
  const {KuunsTimelinePriority:prio}=loadScript('timeline-priority.js');
  const rows=[{e:{id:'local',title:'Private'},startIndex:0,endIndex:5},
    {e:{id:'shared:123',title:'Incoming'},startIndex:4,endIndex:6},
    {e:{id:'owned',title:'Owned shared'},startIndex:1,endIndex:3}];
  const ordered=prio.order(rows,e=>e.id.startsWith('shared:')||e.id==='owned');
  assert.deepEqual(Array.from(ordered,x=>x.e.id),['owned','shared:123','local']);
  assert.deepEqual(Array.from(rows,x=>x.e.id),['local','shared:123','owned'],'original segments unmodified');
});
test('CS account snapshot includes all personal calendar content, not private theme or remote shared items',()=>{
  const {KuunsAccountSync:mod}=loadScript('account-sync.js');
  const data={...sample(),events:[event('My event','private')],theme:'dark',cloudAccount:{userId:'x'},sharedRemoteEvents:[{id:'shared:1'}]};
  const snapshot=mod.snapshot(data);
  assert.deepEqual(Array.from(snapshot.events,x=>x.id),['private']);
  assert.equal(Object.hasOwn(snapshot,'theme'),false);
  assert.equal(Object.hasOwn(snapshot,'cloudAccount'),false);
  assert.equal(Object.hasOwn(snapshot,'sharedRemoteEvents'),false);
  assert.equal(mod.fingerprint(snapshot),mod.fingerprint(mod.snapshot(data)));
});
test('CS account onboarding never silently uploads existing PC data to a new account',async()=>{
  const data={...sample(),events:[event('Personal launch','real')]};
  const ui=setupUI(data,async()=>null);
  await ui.ctrl.onAuthChange({signedIn:true,userId:'person-1'});
  assert.equal(ui.metrics().uploaded,0);
  assert.match(ui.el.textContent,/연결하기/);
  assert.equal(data.events[0].title,'Personal launch');
});
test('CS new device safely loads cloud calendar and backs up before replacing demo data',async()=>{
  const local=sample(),remote={...sample(),events:[event('On another device','cloud')]};
  const ui=setupUI(local,async()=>({payload:remote,revision:7}));
  await ui.ctrl.onAuthChange({signedIn:true,userId:'person-2'});
  assert.equal(local.events[0].id,'cloud');
  assert.deepEqual(ui.metrics(),{uploaded:0,backupCount:1,saveCount:2,importCount:1});
  assert.equal(local.cloudAccount.revision,7);
});
test('CS existing unsynced local data does not get silently overwritten by another device',async()=>{
  const local={...sample(),events:[event('Offline editing','offline')]},remote={...sample(),events:[event('Server version','server')]};
  const ui=setupUI(local,async()=>({payload:remote,revision:2}));
  await ui.ctrl.onAuthChange({signedIn:true,userId:'person-3'});
  assert.equal(local.events[0].id,'offline');
  assert.equal(ui.metrics().backupCount,0);
  assert.match(ui.el.textContent,/연결 선택/);
});
test('CS offline changes on a previously linked PC remain local until safe upload',async()=>{
  const baseline={...sample(),events:[event('Before offline','same')]};
  const ctx=loadScript('account-sync.js').KuunsAccountSync;
  const local={...baseline,events:[event('Offline change','same')],cloudAccount:{userId:'person-4',revision:3,hash:ctx.fingerprint(ctx.snapshot(baseline))}};
  const ui=setupUI(local,async()=>({revision:3,payload:baseline}));
  await ui.ctrl.onAuthChange({signedIn:true,userId:'person-4'});
  assert.equal(local.events[0].title,'Offline change');
  assert.equal(ui.metrics().importCount,0);
  assert.match(ui.el.textContent,/동기화됨/);
});
test('CS private account REST client creates, reads and CAS-updates only the authenticated user snapshot',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuuns-cloud-test-'));
  const sessionPath=path.join(dir,'session.json');
  const id='f12e2109-0e14-467d-9ef5-36cf72b915c1';
  fs.writeFileSync(sessionPath,JSON.stringify({access_token:'token',refresh_token:'refresh',expires_at:Math.floor(Date.now()/1000)+30000,user:{id,email:'test@example.com'}}));
  const requests=[];
  const fetchImpl=async (url,opt)=>{
    requests.push({url,method:opt.method,body:opt.body&&JSON.parse(opt.body),auth:opt.headers.Authorization});
    let result;
    if(opt.method==='GET')result=[];
    else if(opt.method==='POST')result=[{user_id:id,revision:1}];
    else result=[{user_id:id,revision:2}];
    return {ok:true,status:200,text:async()=>JSON.stringify(result)};
  };
  const client=createSharingClient({url:'https://project-test.supabase.co',publishableKey:'sb_publishable_test',sessionPath,fetchImpl});
  const payload=sample();
  try{
    assert.equal(await client.accountSnapshotGet(),null);
    assert.equal((await client.accountSnapshotCreate(payload)).revision,1);
    assert.equal((await client.accountSnapshotUpdate(payload,1)).revision,2);
    assert.match(requests[0].url, new RegExp('user_id=eq\\.'+id));
    assert.match(requests[2].url,/revision=eq\.1/);
    assert.equal(requests.every(r=>r.auth==='Bearer token'),true);
    assert.equal(requests[1].body.user_id,id);
    assert.equal(requests[2].body.revision,2);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CS reject oversized or malformed account payloads before any network write',()=>{
  assert.throws(()=>validateAccountSnapshot({events:[],notes:[],todos:[]}),/형식/);
  assert.throws(()=>validateAccountSnapshot({...sample(),notes:[{body:'z'.repeat(6*1024*1024)}]}),/6MB/);
});
test('CS migration restricts account snapshots to owner and has CAS revision guard',()=>{
  const sql=fs.readFileSync(path.join(root,'supabase/migrations/20261109000000_calendar_account_snapshots.sql'),'utf8');
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/user_id\s*=\s*\(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/NEW\.revision IS DISTINCT FROM OLD\.revision \+ 1/);
  assert.match(sql,/REVOKE ALL ON public\.calendar_account_snapshots FROM anon/);
});
