'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');
const root=path.join(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {createSharingClient,normalizeEvent}=require('../desktop/sharing-client.cjs');
const {createUpdateController}=require('../desktop/update-controller.cjs');
const cfg=require('../desktop/sharing-config.json');
test('existing game title can rename and replace icon without changing event IDs',()=>{
 const app=read('renderer/app.js'),html=read('renderer/index.html');
 assert.match(html,/id="editGameToggle"/);assert.match(html,/id="removeGameIcon"/);
 assert.match(app,/editingGameId=game\?\.id\|\|null/);
 assert.match(app,/const item=existing\|\|\{id:uid\(\),name,icon\}/);
 assert.match(app,/item.name=name;item.icon=icon/);
 assert.match(app,/data\.games\.push\(item\)/);
});
test('shared event includes explicitly selected event fields, excludes private todos and PC reminders',()=>{
 const record=normalizeEvent({id:'evt_123',title:'검수 일정',start:'2026-10-29',end:'2026-10-31',description:'메모',status:'doing',gameName:'랜덤다이스2',url:'https://example.com/',checklist:[{text:'검수',done:true}],todos:[{text:'private'}],reminderAt:'2026-10-28T09:00'});
 assert.equal(record.event_data.gameName,'랜덤다이스2');
 assert.equal(record.event_data.url,'https://example.com/');
 assert.deepEqual(record.event_data.checklist,[{text:'검수',done:true}]);
 assert.equal(JSON.stringify(record).includes('reminderAt'),false);
 assert.equal(JSON.stringify(record).includes('private'),false);
 const unsafe=normalizeEvent({id:'evt_123',title:'X',start:'2026-10-29',end:'2026-10-29',url:'file:///etc/passwd'});
 assert.equal(unsafe.event_data.url,'');
});
test('contact preferences and group names send only authenticated requests',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kun195-'));
 const requests=[];
 const fakeFetch=async(url,opts)=>{
  requests.push({url,opts});
  return {ok:true,text:async()=>JSON.stringify(url.endsWith('/verify')?{access_token:'access',refresh_token:'refresh',expires_in:3600,user:{id:'uid',email:'a@example.com'}}:url.endsWith('sharing_accept_trusted_invites')?1:[])};
 };
 try{
  const cli=createSharingClient({url:cfg.url,publishableKey:cfg.publishableKey,sessionPath:path.join(temp,'auth.json'),fetchImpl:fakeFetch});
  await assert.rejects(()=>cli.autoAcceptInvites(),/인증/);
  await cli.verifyOtp('a@example.com','123456');
  await cli.contactsList();
  await cli.contactAdd('개발자','dev@example.com','UI팀');
  await cli.contactSettings('11111111-2222-3333-4444-555555555555',{auto_accept:true,auto_invite:false});
  await cli.contactGroupRename('UI팀','디자인팀');
  await cli.autoAcceptInvites();
  assert(requests.some(r=>r.url.includes('/sharing_contacts?select=')&&r.url.includes('group_name')));
  assert(requests.some(r=>r.url.includes('sharing_accept_trusted_invites')&&r.opts.headers.Authorization==='Bearer access'));
  assert(requests.some(r=>r.opts.body?.includes('"group_name":"UI팀"')));
 }finally{fs.rmSync(temp,{force:true,recursive:true});}
});
test('Mac update checks latest GitHub release and opens official download page, never installs unsigned binary',async()=>{
 let opened='',created=false;
 const c=createUpdateController({app:{getVersion:()=> '1.9.5',isPackaged:true},pkg:{build:{publish:{provider:'github',owner:'kun-blip',repo:'kuns-kanban-calendar'}}},platform:'darwin',clock:()=>0,every:()=>0,
 updaterFactory:()=>{created=true;throw Error('Should not initialize Squirrel.Mac for unsigned app');},
 fetchImpl:async()=>({ok:true,json:async()=>({tag_name:'v1.9.7',assets:[{name:'KuunsKanbanCalendar-1.9.7-mac-universal.dmg',browser_download_url:'https://github.com/kun-blip/kuns-kanban-calendar/releases/download/v1.9.7/KuunsKanbanCalendar-1.9.7-mac-universal.dmg'}]})}),openExternal:async url=>{opened=url;}});
 assert.equal(c.start().phase,'idle');
 const status=await c.check();assert.equal(status.phase,'available');assert.equal(status.newVersion,'1.9.7');
 await c.download();assert.equal(opened,'https://github.com/kun-blip/kuns-kanban-calendar/releases/download/v1.9.7/KuunsKanbanCalendar-1.9.7-mac-universal.dmg');
 assert.equal(created,false);
 assert.equal(c.current().phase,'available');
});
