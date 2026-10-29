'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
const css=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');

class Element {
 constructor(tag='div') {this.tagName=tag;this.children=[];this.parentElement=null;this.listeners={};this.hidden=false;this.open=false;this.disabled=false;this.value='';this.className='';this.type='';this.attributes={};this.style={};this.checked=false;this.textContent='';}
 append(...children){for(const child of children){child.parentElement=this;this.children.push(child);}}
 replaceChildren(...children){this.children=[];this.append(...children);}
 addEventListener(event,handler){(this.listeners[event]||=[]).push(handler);}
 setAttribute(key,val){this.attributes[key]=val;}
 focus(){this.focused=true;}
 async fire(event='click'){for(const fn of this.listeners[event]||[])await fn({target:this});}
 all(predicate){return [...(predicate(this)?[this]:[]),...this.children.flatMap(n=>n.all(predicate))];}
}
const tick=()=>new Promise(r=>setImmediate(r));
function harness({owned=false}={}){
 const members=[
  {id:'a',nickname:'솔로안',email:'a@example.com',group_name:'소재팀',auto_invite:false},
  {id:'b',nickname:'핑핑',email:'b@example.com',group_name:'소재팀',auto_invite:false},
  {id:'c',nickname:'홀든',email:'c@example.com',group_name:'소재팀',auto_invite:false},
  {id:'d',nickname:'도나',email:'d@example.com',group_name:'로컬팀',auto_invite:false}
 ];
 const ids=Object.fromEntries(['sharingOverlay','sharingContent','sharingGenerated','eventCollabPicker','sharingClose','sharingCopyCode','sharingGeneratedCode'].map(id=>[id,new Element()]));
 const document={createElement:t=>new Element(t),getElementById:id=>ids[id]};
 const ownedRow={id:'11111111-2222-3333-4444-555555555555',owner_id:'mine',local_event_id:'original',title:'원본 일정',start_date:'2026-10-29',end_date:'2026-10-29',revision:1,event_data:{}};
 const sent=[];
 const bridge={sharingStatus:async()=>({signedIn:true,email:'me@example.com',userId:'mine'}),sharingAutoAcceptInvites:async()=>0,sharingList:async()=>owned?[ownedRow]:[],sharingContactsList:async()=>members,sharingInbox:async()=>[],sharingMyRoles:async()=>[],sharingPendingInvite:async()=>'',sharingHistory:async()=>[],sharingMembers:async()=>[],sharingSentInvites:async()=>[],sharingInviteContacts:async(...args)=>{sent.push(args);},onSharingInvite:()=>{}};
 const notices=[];
 const window={addEventListener:()=>{},KuunsSharedVisibility:{remoteRows:()=>[]}};
 vm.runInNewContext(js,{document,window,confirm:()=>true,setInterval:()=>0,console});
 const ui=window.KuunsSharing.createSharingUI({bridge,getEvent:()=>null,getEvents:()=>[],onRemoteEvents:()=>{},notify:t=>notices.push(t)});
 return {ui,ids,members,notices,sent,ownedRow};
}
function byText(element,tag,text){return element.all(node=>node.tagName===tag&&node.textContent===text)[0];}

// Group addition must produce ONE visible selection row and three serialized recipients.
test('group selection stays compact and group permissions apply to every member',async()=>{
 const h=harness();await tick();h.ui.resetDraft();
 const host=h.ids.eventCollabPicker;
 const selector=host.all(el=>el.tagName==='select'&&el.className.includes('share-group-select'))[0];
 assert(selector);
 selector.value='소재팀';await byText(host,'button','+ 그룹 추가').fire();
 const cards=host.all(el=>el.className==='share-pick-row');
 assert.equal(cards.length,1);
 assert.equal(byText(cards[0],'strong','그룹: 소재팀').textContent,'그룹: 소재팀');
 assert.equal(byText(cards[0],'small','3명 전체 초대').textContent,'3명 전체 초대');
 const role=cards[0].all(el=>el.tagName==='select'&&el.className.includes('share-role'))[0];
 role.value='editor';await role.fire('change');
 const actual=h.ui.draftItems();
 assert.equal(actual.length,3);
 assert.deepEqual(new Set(actual.map(x=>x.email)),new Set(['a@example.com','b@example.com','c@example.com']));
 assert(actual.every(x=>x.role==='editor'));
 assert.equal(host.all(el=>el.className==='share-pick-row').length,1);
});

test('group selection can be removed as one item; individual search stays compact by default',async()=>{
 const h=harness();await tick();h.ui.resetDraft();
 const host=h.ids.eventCollabPicker;
 assert.equal(host.all(el=>el.className==='share-picker-results')[0].children.length,0);
 const choice=host.all(e=>e.className?.includes('share-group-select'))[0];
 choice.value='소재팀';await byText(host,'button','+ 그룹 추가').fire();
 assert.equal(host.all(el=>el.className==='share-pick-row').length,1);
 await host.all(el=>el.className.includes('share-pick-remove'))[0].fire();
 assert.equal(host.all(el=>el.className==='share-pick-row').length,0);
 assert.equal(h.ui.draftItems().length,0);
});

test('group management provides nested collapsible colleague lists',async()=>{
 const h=harness();await tick();h.ui.open();
 const manager=h.ids.sharingContent.all(el=>el.className==='share-contact-manager')[0];
 assert(manager);assert.equal(manager.open,false);
 const groups=manager.all(el=>el.className==='share-contact-group');
 assert.equal(groups.length,2);assert(groups.every(g=>g.open===false));
 assert.equal(groups.reduce((count,g)=>count+g.all(el=>el.className==='share-list-item').length,0),4);
 manager.open=true;await manager.fire('toggle');
 groups[0].open=true;await groups[0].fire('toggle');
 await h.ui.refresh();
 const updated=h.ids.sharingContent.all(el=>el.className==='share-contact-manager')[0];
 assert(updated.open);
 assert(updated.all(el=>el.className==='share-contact-group')[0].open);
});

test('event editor buttons stay visible with independently scrollable form; close button fixed and fold styles match',()=>{
 for(const token of ['#eventModal:not([hidden]){display:flex;flex-direction:column;overflow:hidden;height:', '#eventModal .modal-body{min-height:0;flex:1;overflow-y:auto;', '#eventModal .modal-foot{background:', '#sharingClose{align-self:flex-start;flex:0 0 36px;width:36px;', '.event-checklist-section.event-fold,.event-memo-fold.event-fold{background:', 'html[data-theme=dark] .event-checklist-section.event-fold,html[data-theme=dark] .event-memo-fold.event-fold{background:#242c3b!important'])assert(css.includes(token),token);
});


test('published event sharing dialog also invites an entire group with one permission setting',async()=>{
 const h=harness({owned:true});await tick();h.ui.open('shared:'+h.ownedRow.id);await tick();
 const host=h.ids.sharingContent;
 const groupChoices=host.all(el=>el.className?.includes('share-group-select'))[0];
 assert(groupChoices,'group selector missing in sharing dialog');
 groupChoices.value='소재팀';await byText(host,'button','+ 그룹 추가').fire();
 const cards=host.all(el=>el.className==='share-pick-row');
 assert.equal(cards.length,1);
 const role=cards[0].all(el=>el.tagName==='select'&&el.className?.includes('share-role'))[0];
 role.value='editor';await role.fire('change');
 await byText(host,'button','선택한 그룹/동료 초대 확인').fire();await tick();
 assert.equal(h.sent.length,1);
 assert.equal(h.sent[0][0],h.ownedRow.id);
 assert.equal(h.sent[0][1].length,3);
 assert(h.sent[0][1].every(person=>person.role==='editor'));
});


test('adding a second group preserves the first, rather than replacing it',async()=>{
 const h=harness();await tick();h.ui.resetDraft();
 const host=h.ids.eventCollabPicker;
 const selector=host.all(e=>e.className?.includes('share-group-select'))[0];
 selector.value='로컬팀';await byText(host,'button','+ 그룹 추가').fire();
 selector.value='소재팀';await byText(host,'button','+ 그룹 추가').fire();
 assert.equal(host.all(el=>el.className==='share-pick-row').length,2);
 const invitees=h.ui.draftItems();
 assert.equal(invitees.length,4);
 assert.equal(new Set(invitees.map(x=>x.email)).size,4);
});
