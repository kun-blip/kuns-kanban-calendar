'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {compareVersions,shouldShowReleaseNotes,currentNotes}=require('../desktop/release-notes-state.cjs');
const {shouldPrompt,initReleaseNotes}=require('../renderer/release-notes.js');
const catalog=require('../desktop/release-notes.json');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8');
const preload=fs.readFileSync(path.join(root,'desktop/preload.cjs'),'utf8');
const updater=fs.readFileSync(path.join(root,'renderer/update-center.js'),'utf8');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const drain=async()=>{for(let i=0;i<14;i++) await Promise.resolve();};

class Element {
  constructor(tag='div',id=''){
    this.tagName=tag.toUpperCase();this.id=id;this.dataset={pending:'false'};this.hidden=true;
    this.disabled=false;this.textContent='';this.value='';this.className='';this.children=[];
    this.listeners={};
  }
  focus(){Element.document.activeElement=this;}
  addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
  async fire(type='click',event={}){for(const f of this.listeners[type]||[]) await f({target:this,preventDefault(){},stopPropagation(){},...event});}
  append(...children){this.children.push(...children);}
  appendChild(node){this.children.push(node);return node;}
  replaceChildren(...children){this.children=[...children];}
}
function env({shouldShow=true, hidden=false, welcome=false, update=false, ackResult={ok:true}}={}) {
  const ids=['releaseNotesOverlay','releaseNotesOpen','releaseNotesClose','releaseNotesDone','releaseNotesTitle',
    'releaseNotesSubtitle','releaseNotesVersion','releaseNotesList','releaseNotesStatus','welcomeOverlay',
    'feedbackOverlay','updateOverlay','sharingOverlay','shade','eventModal'];
  const elements=Object.fromEntries(ids.map(id=>[id,new Element('div',id)]));
  elements.welcomeOverlay.hidden=!welcome;elements.updateOverlay.hidden=!update;
  elements.releaseNotesOverlay.hidden=true;
  const document={hidden,activeElement:null,listeners:{},events:[],getElementById:id=>elements[id],
    createElement:tag=>new Element(tag),addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);},
    dispatchEvent(event){this.events.push(event.type);for(const f of this.listeners[event.type]||[])f(event);},
    async fire(type){for(const f of this.listeners[type]||[])await f({type});}};
  Element.document=document;
  const window={listeners:{},addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);},
    async fire(type){for(const f of this.listeners[type]||[])await f();}};
  let ackCalls=0;
  const bridge={
    getReleaseNotesStartup:async()=>({shouldShow,version:'1.9.8'}),
    getReleaseNotesCatalog:async()=>({currentVersion:'1.9.8',releases:catalog}),
    acknowledgeReleaseNotes:async()=>{ackCalls++;return ackResult;}
  };
  return {elements,document,window,bridge,ackCalls:()=>ackCalls};
}

test('release notes compare semantic versions without string ordering bugs',()=>{
  assert.equal(compareVersions('1.9.10','1.9.9'),1);
  assert.equal(compareVersions('1.9.8','1.9.8'),0);
  assert.equal(compareVersions('1.9.7','1.9.8'),-1);
  assert.equal(compareVersions('garbage','1.9.7'),null);
});
test('upgrade shows notes once; initial install, same version, downgrade, development do not',()=>{
  const base={currentVersion:'1.9.8',hasNotes:true,packaged:true,existingUser:true};
  assert.equal(shouldShowReleaseNotes(base),true,'existing pre-marker user upgrading');
  assert.equal(shouldShowReleaseNotes({...base,existingUser:false}),false,'fresh install');
  assert.equal(shouldShowReleaseNotes({...base,previousVersion:'1.9.7'}),true,'new version');
  assert.equal(shouldShowReleaseNotes({...base,previousVersion:'1.9.8'}),false,'repeat launch');
  assert.equal(shouldShowReleaseNotes({...base,previousVersion:'1.9.9'}),false,'downgrade');
  assert.equal(shouldShowReleaseNotes({...base,packaged:false}),false,'developer run');
  assert.equal(shouldShowReleaseNotes({...base,hasNotes:false}),false,'unwritten notes');
});
test('versioned changelog is actual, local and complete; old release is still viewable',()=>{
  assert.ok(['1.9.8','1.9.9','1.9.10'].includes(pkg.version));assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.equal(currentNotes(catalog,'1.9.8').items.length,3);
  assert.equal(currentNotes(catalog,'1.9.8').heading,'그룹 초대 및 동료 관리 개선');
  assert.deepEqual(currentNotes(catalog,'1.9.8').items.map(item=>item.title),[
    '그룹 전체 일괄 초대','그룹별 보기/편집 권한 설정','동료 목록 접기/펼치기'
  ]);
  assert.equal(currentNotes(catalog,'1.9.7').items.length,3);
  assert.deepEqual(currentNotes(catalog,'1.9.9').items,currentNotes(catalog,'1.9.8').items); // user requested identical wording
  for(const id of ['releaseNotesOverlay','releaseNotesOpen','releaseNotesClose','releaseNotesDone','releaseNotesVersion','releaseNotesList'])
    assert(html.includes(`id="${id}"`),`missing ${id}`);
  assert(html.indexOf('./release-notes.js')<html.indexOf('./update-center.js'), 'release notes blocks an early update popup');
  for(const name of ['releaseNotes:getStartup','releaseNotes:getCatalog','releaseNotes:acknowledge'])assert(main.includes(name));
  assert(preload.includes('getReleaseNotesStartup'));
  assert(updater.includes("releaseNotes.dataset?.pending === 'true'"));
  assert(updater.includes("doc.addEventListener('release-notes:changed', maybeAutoPrompt)"));
});
test('updated existing user sees popup and confirmation persists exactly once',async()=>{
  const e=env();const api=initReleaseNotes(e.window,e.document,e.bridge);
  assert.equal(e.elements.releaseNotesOverlay.dataset.pending,'true','block competing update dialog during initialization');
  await drain();
  assert.equal(e.elements.releaseNotesOverlay.hidden,false);
  assert.equal(e.elements.releaseNotesTitle.textContent,'v1.9.8 업데이트 패치노트');
  assert.equal(e.elements.releaseNotesList.children.length,3);
  assert.equal(e.elements.releaseNotesSubtitle.textContent,'그룹 초대 및 동료 관리 개선');
  assert.equal(e.elements.releaseNotesList.children[0].children[0].textContent,'그룹 전체 일괄 초대');
  await e.elements.releaseNotesDone.fire();
  assert.equal(e.elements.releaseNotesOverlay.hidden,true);
  assert.equal(e.ackCalls(),1);
  assert.equal(api.getState().pendingVersion,'');
  await e.window.fire('focus');assert.equal(e.elements.releaseNotesOverlay.hidden,true);
  await e.elements.releaseNotesOpen.fire();assert.equal(e.elements.releaseNotesOverlay.hidden,false);
  await e.elements.releaseNotesVersion.fire('change',{target:e.elements.releaseNotesVersion});
  e.elements.releaseNotesVersion.value='1.9.7';await e.elements.releaseNotesVersion.fire('change');
  assert.equal(e.elements.releaseNotesTitle.textContent,'v1.9.7 업데이트 패치노트');
  await e.elements.releaseNotesClose.fire();
  assert.equal(e.ackCalls(),1,'manually reopened popup never acknowledges again');
});
test('new users and already acknowledged upgrades do not see an automatic popup',async()=>{
  const e=env({shouldShow:false});initReleaseNotes(e.window,e.document,e.bridge);await drain();
  assert.equal(e.elements.releaseNotesOverlay.hidden,true);
  assert.equal(e.elements.releaseNotesOverlay.dataset.pending,'false');
  await e.elements.releaseNotesOpen.fire();assert.equal(e.elements.releaseNotesOverlay.hidden,false);
});
test('background tray launch and welcome screen defer release notes until visible',async()=>{
  const e=env({hidden:true,welcome:true});initReleaseNotes(e.window,e.document,e.bridge);await drain();
  assert.equal(e.elements.releaseNotesOverlay.hidden,true);
  e.document.hidden=false;await e.document.fire('visibilitychange');
  assert.equal(e.elements.releaseNotesOverlay.hidden,true,'welcome blocks release notes');
  e.elements.welcomeOverlay.hidden=true;await e.document.fire('welcome:changed');
  assert.equal(e.elements.releaseNotesOverlay.hidden,false);
});
test('active update dialog defers release notes and failed acknowledgement stays open',async()=>{
  const e=env({update:true,ackResult:{ok:false,message:'retry save'}});
  const api=initReleaseNotes(e.window,e.document,e.bridge);await drain();
  assert.equal(e.elements.releaseNotesOverlay.hidden,true);
  e.elements.updateOverlay.hidden=true;await e.window.fire('focus');
  assert.equal(e.elements.releaseNotesOverlay.hidden,false);
  await e.elements.releaseNotesDone.fire();
  assert.equal(e.elements.releaseNotesOverlay.hidden,false);
  assert.match(e.elements.releaseNotesStatus.textContent,/retry save/);
  assert.equal(api.getState().pendingVersion,'1.9.8');
});
test('auto prompt pure guard respects pending, focus, blocking',()=>{
  assert.equal(shouldPrompt({pending:'1.9.8'}),true);
  assert.equal(shouldPrompt({pending:'',visible:true}),false);
  assert.equal(shouldPrompt({pending:'1.9.8',visible:false}),false);
  assert.equal(shouldPrompt({pending:'1.9.8',blocked:true}),false);
});
