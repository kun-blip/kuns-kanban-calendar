'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldAutoPrompt, initUpdateCenter } = require('../renderer/update-center.js');

function environment({ initialState = {phase:'idle', version:'1.7.2'}, initiallyHidden = false, preference = '' } = {}) {
  const ids = ['updateOverlay','updateLaunch','updateAction','updateMessage','updateCurrent',
    'updateProgress','updateProgressBar','updateDialogTitle','updateLaunchText','updateClose',
    'updateLater','feedbackOverlay','welcomeOverlay','shade'];
  const elements = Object.fromEntries(ids.map(id => [id, {
    id, hidden: ['updateOverlay','feedbackOverlay','welcomeOverlay','shade'].includes(id),
    dataset:{pending:'false'},
    style:{}, classList:{flags:new Set(),toggle(name,active){if(active)this.flags.add(name);else this.flags.delete(name);},contains(name){return this.flags.has(name);}}, textContent:'', disabled:false,
    listeners:{}, addEventListener(event,callback){this.listeners[event] = callback;},
    click(){this.listeners.click?.({target:this});}
  }]));
  const doc = {
    hidden:initiallyHidden, activeElement:null, listeners:{},
    getElementById:id=>elements[id],
    addEventListener(event,callback){this.listeners[event] = callback;},
    fire(event){this.listeners[event]?.();}
  };
  const win = {
    listeners:{}, addEventListener(event,callback){this.listeners[event] = callback;},
    fire(event){this.listeners[event]?.();}, confirm:()=>true
  };
  let current = initialState;
  const listeners = {};
  let dismissCalls = 0;
  const bridge = {
    getUpdateState: async () => current,
    getUpdateNoticePreference: async () => ({dismissedVersion:preference}),
    onUpdateState: fn => listeners.state = fn,
    onOpenUpdate: fn => listeners.open = fn,
    dismissUpdateNotice: async () => {dismissCalls++; return {ok:true};},
    checkUpdate: async () => current,
    downloadUpdate: async () => ({...current,phase:'downloading'}),
    installUpdate: async () => ({...current,phase:'installing'})
  };
  return {
    elements, win, doc, bridge,
    dismissCalls:()=>dismissCalls,
    emit(state){current = state; listeners.state(state);},
    openFromTray(){listeners.open();}
  };
}
const drain = async () => { for (let i=0;i<7;i++) await Promise.resolve(); };
const oldVersion = {phase:'available',version:'1.7.2',newVersion:'1.7.3',message:'새 버전'};

test('Only a newer available version is eligible for an automatic popup', () => {
  assert.equal(shouldAutoPrompt({state:oldVersion}),true);
  assert.equal(shouldAutoPrompt({state:{phase:'current'}}),false);
  assert.equal(shouldAutoPrompt({state:oldVersion,dismissedVersion:'1.7.3'}),false);
  assert.equal(shouldAutoPrompt({state:oldVersion,promptedVersion:'1.7.3'}),false);
  assert.equal(shouldAutoPrompt({state:oldVersion,visible:false}),false);
  assert.equal(shouldAutoPrompt({state:oldVersion,blocked:true}),false);
});

test('A newly installed older app opens the update popup automatically on launch', async () => {
  const e = environment({initialState:oldVersion});
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,false,'popup automatically visible without update button click');
  assert.equal(e.elements.updateDialogTitle.textContent,'새로운 업데이트가 있어요!');
  assert.match(e.elements.updateCurrent.textContent,/v1\.7\.2.*v1\.7\.3/);
  assert.equal(e.elements.updateAction.textContent,'다운로드');
});

test('Foreground launch waits for an update check result, then opens automatically', async () => {
  const e = environment();
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,true);
  e.emit(oldVersion);
  assert.equal(e.elements.updateOverlay.hidden,false);
  assert.equal(e.elements.updateDialogTitle.textContent,'새로운 업데이트가 있어요!');
});

test('Background tray launch queues notice until window becomes visible', async () => {
  const e = environment({initialState:oldVersion,initiallyHidden:true});
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,true);
  e.doc.hidden=false;
  e.doc.fire('visibilitychange');
  assert.equal(e.elements.updateOverlay.hidden,false);
});

test('An active editor postpones the popup rather than losing it', async () => {
  const e = environment({initialState:oldVersion});
  e.doc.activeElement = {tagName:'TEXTAREA'};
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,true);
  e.doc.activeElement = null;
  e.win.fire('focus');
  assert.equal(e.elements.updateOverlay.hidden,false);
});

test('Later dismisses only in current app session; a new launch reminds again', async () => {
  const e = environment({initialState:oldVersion});
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  e.elements.updateLater.click();
  assert.equal(e.elements.updateOverlay.hidden,true);
  assert.equal(e.dismissCalls(),1);
  e.emit(oldVersion);
  assert.equal(e.elements.updateOverlay.hidden,true,'polling does not reopen after later');
  e.elements.updateLaunch.click();
  assert.equal(e.elements.updateOverlay.hidden,false,'manual update button still works');
  assert.equal(e.elements.updateDialogTitle.textContent,'프로그램 업데이트');
  const later = environment({initialState:oldVersion});
  initUpdateCenter(later.win,later.doc,later.bridge);
  await drain();
  assert.equal(later.elements.updateOverlay.hidden,false,'fresh app launch alerts again');
});

test('An unrelated modal delays automatic popup until the modal closes', async () => {
  const e = environment({initialState:oldVersion});
  e.elements.shade.hidden = false;
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,true);
  e.elements.shade.hidden = true;
  e.win.fire('focus');
  assert.equal(e.elements.updateOverlay.hidden,false);
});

test('Manual tray update open works with a current version, but no automatic popup', async () => {
  const e = environment({initialState:{phase:'current',version:'1.7.2',message:'현재 최신 버전이에요.'}});
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,true);
  e.openFromTray();
  assert.equal(e.elements.updateOverlay.hidden,false);
  assert.equal(e.elements.updateDialogTitle.textContent,'프로그램 업데이트');
});


test('A stale IPC state snapshot cannot erase a newer available event', async () => {
  const e = environment();
  let resolveSnapshot;
  e.bridge.getUpdateState = () => new Promise(resolve => { resolveSnapshot = resolve; });
  initUpdateCenter(e.win, e.doc, e.bridge);
  await drain();
  assert.equal(typeof resolveSnapshot, 'function');
  e.emit(oldVersion);
  assert.equal(e.elements.updateOverlay.hidden,false);
  resolveSnapshot({phase:'idle',version:'1.7.2'});
  await drain();
  assert.equal(e.elements.updateAction.textContent,'다운로드');
  assert.match(e.elements.updateCurrent.textContent,/v1\.7\.3/);
});


test('First-launch welcome blocks update popup until the introduction closes', async () => {
  const e = environment({initialState:oldVersion});
  e.elements.welcomeOverlay.dataset.pending='true';
  initUpdateCenter(e.win,e.doc,e.bridge);
  await drain();
  assert.equal(e.elements.updateOverlay.hidden,true,'startup gating');
  e.elements.welcomeOverlay.dataset.pending='false';
  e.elements.welcomeOverlay.hidden=false;
  e.doc.fire('welcome:changed');
  assert.equal(e.elements.updateOverlay.hidden,true,'welcome has priority');
  e.elements.welcomeOverlay.hidden=true;
  e.doc.fire('welcome:changed');
  assert.equal(e.elements.updateOverlay.hidden,false,'update shown after welcome closes');
});

test('Blue dot appears for a newly available release and clears when current',async()=>{
  const e=environment();initUpdateCenter(e.win,e.doc,e.bridge);await drain();
  assert.equal(e.elements.updateLaunch.classList.contains('needs-attention'),false);
  e.emit(oldVersion);
  assert.equal(e.elements.updateLaunch.classList.contains('needs-attention'),true);
  e.emit({phase:'current',version:'1.7.3',newVersion:''});
  assert.equal(e.elements.updateLaunch.classList.contains('needs-attention'),false);
});
test('Mac update is a download-page notification, not automatic installation',async()=>{
  const e=environment({initialState:oldVersion}); e.bridge.platform='darwin';
  initUpdateCenter(e.win,e.doc,e.bridge);await drain();
  assert.equal(e.elements.updateAction.textContent,'Mac 다운로드 페이지 열기');
  assert.equal(e.elements.updateLaunch.classList.contains('needs-attention'),true);
});
