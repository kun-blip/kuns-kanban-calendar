'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
const sharing=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
const pkg=require('../package.json');
const lock=require('../package-lock.json');

class Element {
 constructor(tag='div') {this.tagName=tag;this.children=[];this.parentElement=null;this.listeners={};this.hidden=false;this.open=false;this.disabled=false;this.value='';this.className='';this.type='';this.attributes={};this.style={};this.checked=false;this.textContent='';}
 append(...nodes) {for(const child of nodes){if(typeof child==='string')throw new Error('Unexpected text child');child.parentElement=this;this.children.push(child);}}
 appendChild(child){this.append(child);return child;}
 replaceChildren(...nodes) {this.children=[];this.append(...nodes);}
 addEventListener(type,handler){(this.listeners[type] ||= []).push(handler);}
 setAttribute(key,value){this.attributes[key]=value;}
 focus() {this.focused=true;}
 async fire(type='click'){for(const handler of this.listeners[type]||[]) await handler({target:this});}
 findAll(predicate){return [...(predicate(this)?[this]:[]),...this.children.flatMap(child=>child.findAll(predicate))];}
}
function byText(root,tag,text){return root.findAll(el=>el.tagName===tag && el.textContent===text)[0];}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function sharingHarness(){
 const overlay=new Element(),host=new Element(),generated=new Element(),collab=new Element(),close=new Element(),copy=new Element(),code=new Element();
 const ids={sharingOverlay:overlay,sharingContent:host,sharingGenerated:generated,eventCollabPicker:collab,sharingClose:close,sharingCopyCode:copy,sharingGeneratedCode:code};
 const document={getElementById:id=>ids[id]||null,createElement:tag=>new Element(tag)};
 const changes=[];const notices=[];const contacts=[{id:'11111111-2222-3333-4444-555555555555',nickname:'슬로안',email:'sloan@example.com',group_name:'UA팀',auto_invite:true,auto_accept:true}];
 const bridge={
  sharingStatus:async()=>({signedIn:true,email:'me@example.com',userId:'me'}),
  sharingAutoAcceptInvites:async()=>0,sharingList:async()=>[],sharingContactsList:async()=>contacts,
  sharingInbox:async()=>[],sharingMyRoles:async()=>[],sharingPendingInvite:async()=>'',
  sharingContactUpdate:async(...args)=>{changes.push(args);contacts[0]={...contacts[0],nickname:args[1],email:args[2],group_name:args[3]};},
  sharingContactGroupRename:async(from,to)=>{changes.push(['group',from,to]);contacts[0].group_name=to;},
  sharingSignOut:async()=>({signedIn:false}),
  onSharingInvite:()=>{},
 };
 const window={addEventListener:()=>{},KuunsSharedVisibility:{remoteRows:()=>[],deleteOwnedEvent:async()=>{}}};
 vm.runInNewContext(sharing,{window,document,confirm:()=>true,setInterval:()=>0,console});
 const ui=window.KuunsSharing.createSharingUI({bridge,getEvent:()=>null,getEvents:()=>[],onRemoteEvents:()=>{},onOwnedUpdates:()=>{},notify:msg=>notices.push(msg)});
 return {ui,host,contacts,changes,notices};
}

test('Current release version and lockfile root match, dependency resolution untouched',()=>{
 assert.ok(Number(pkg.version.split('.')[2])>=7,'v1.9.7 regression tests run on newer 1.9.x releases');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.equal(lock.packages['node_modules/webcrypto-core']?.version,'1.9.2');
});
test('contact editing uses inline form, no Electron-unsupported prompt calls',async()=>{
 assert.doesNotMatch(sharing.replace(/\/\/[^\n]*/g,''),/(^|[^a-zA-Z])prompt\s*\(/m);
 const h=sharingHarness();await settle();h.ui.open();
 const edit=byText(h.host,'button','수정');assert(edit,'contact edit button missing');
 await edit.fire();await settle();
 const editor=h.host.findAll(e=>e.className==='share-inline-editor'&&!e.hidden)[0];
 assert(editor && !editor.hidden);
 const inputs=editor.findAll(e=>e.tagName==='input');
 assert.equal(inputs.length,3);
 inputs[0].value='슬로안2';inputs[1].value='sloan2@example.com';inputs[2].value='디자인팀';
 await byText(editor,'button','저장').fire();await settle();
 assert.deepEqual(h.changes[0],['11111111-2222-3333-4444-555555555555','슬로안2','sloan2@example.com','디자인팀']);
 assert.equal(h.contacts[0].auto_accept,true);assert.equal(h.contacts[0].auto_invite,true);
});
test('group renaming works without browser prompt and saves only on confirmation',async()=>{
 const h=sharingHarness();await settle();h.ui.open();
 await byText(h.host,'button','이름 변경').fire();await settle();
 const groupEditor=h.host.findAll(el=>el.className==='share-inline-editor' && !el.hidden)[0];
 assert(groupEditor);const input=groupEditor.findAll(el=>el.tagName==='input')[0];input.value='신규 UA팀';
 await byText(groupEditor,'button','저장').fire();await settle();
 assert.deepEqual(h.changes[0],['group','UA팀','신규 UA팀']);
});
test('share sections are collapsed initially and invite accept stays disabled until input',async()=>{
 const h=sharingHarness();await settle();h.ui.open();
 const sections=h.host.findAll(el=>el.tagName==='details' && el.className==='share-fold');
 assert.equal(sections.length,3);assert(sections.every(x=>x.open===false));
 const code=h.host.findAll(el=>el.tagName==='input'&&el.placeholder?.startsWith('초대 코드'))[0];
 const accept=byText(h.host,'button','초대 수락');assert(accept.disabled);
 code.value='1234';await code.fire('input');assert.equal(accept.disabled,false);
 code.value='  ';await code.fire('input');assert.equal(accept.disabled,true);
});
test('event editor collapses optional fields and preserves form IDs and label values',()=>{
 assert.match(html,/<details class="field event-checklist-section event-fold" id="eventChecklistFold">/);
 assert.match(html,/<details class="field event-fold event-memo-fold" id="eventMemoFold">/);
 assert(html.indexOf('id="eventUrl"')<html.indexOf('id="eventCollabPicker"'));
 for(const id of ['eventChecklist','eventChecklistInput','eventDescription','eventUrl','eventCollabPicker'])assert(html.includes(`id="${id}"`));
 assert.match(html,/label for="eventStatus">상태<\/label>/);
 assert.match(html,/<option value="todo">소프트런칭<\/option>/);
 assert.match(html,/<option value="doing">라이브<\/option>/);
 assert.match(app,/const STATUS_NAMES=\{todo:'소프트런칭',doing:'라이브',done:'완료'\}/);
 assert.match(app,/\$\('eventChecklistFold'\)\.open=false;\$\('eventMemoFold'\)\.open=false/);
 assert.match(app,/\$\('eventMemoPreview'\)\.textContent=value/);
});
test('feedback success hides overlay and shows confirmation only after ok, error remains visible',()=>{
 assert.match(app,/if\(result\?\.ok\)\{document\.getElementById\('feedbackMessage'\)\.value='';overlay\.hidden=true;notify\('또 피드백을 주셨군요\?/);
 assert.match(app,/감사합니다♥',6500/);
 assert.match(app,/else\{status\.textContent=result\?\.message\|\|/);
});
test('sharing fold expanded state survives background synchronization',async()=>{
 const h=sharingHarness();await settle();h.ui.open();
 const initial=h.host.findAll(el=>el.tagName==='details'&&el.className==='share-fold');
 initial[2].open=true;await initial[2].fire('toggle');
 await h.ui.refresh();
 const updated=h.host.findAll(el=>el.tagName==='details'&&el.className==='share-fold');
 assert.equal(updated[0].open,false);
 assert.equal(updated[2].open,true);
});
test('cancel contact edit does not send changes',async()=>{
 const h=sharingHarness();await settle();h.ui.open();
 await byText(h.host,'button','수정').fire();await settle();
 const editor=h.host.findAll(el=>el.className==='share-inline-editor'&&!el.hidden)[0];
 editor.findAll(el=>el.tagName==='input')[0].value='changed but not saved';
 await byText(editor,'button','취소').fire();await settle();
 assert.equal(editor.hidden,true);assert.equal(h.changes.length,0);
});
