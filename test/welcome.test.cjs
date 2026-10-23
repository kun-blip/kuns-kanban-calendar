'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {shouldShowWelcome}=require('../desktop/welcome-state.cjs');
const {initWelcome}=require('../renderer/welcome.js');
function createEnvironment(shouldShow=true){
  const buttons={};
  const elt=(id,hidden=false)=>{
    const item={id,hidden,disabled:false,dataset:{},textContent:'',listeners:{},focus(){document.activeElement=item;},addEventListener(type,fn){item.listeners[type]=fn;},click(){return item.listeners.click?.({target:item});}};
    buttons[id]=item;return item;
  };
  elt('welcomeOverlay',true);elt('welcomeOpen');elt('welcomeClose');elt('welcomeStart');elt('welcomeStatus');
  const document={hidden:false,activeElement:null,listeners:{},events:[],getElementById:id=>buttons[id],addEventListener(type,fn){this.listeners[type]=fn;},dispatchEvent(e){this.events.push(e.type);this.listeners[e.type]?.(e);}};
  const win={listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}};
  let completions=0;
  const bridge={getWelcomeState:async()=>({shouldShow}),completeWelcome:async()=>{completions++;return {ok:true};}};
  return {buttons,document,win,bridge,completions:()=>completions};
}
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
test('New install without any existing state receives welcome',()=>{
  assert.equal(shouldShowWelcome({}),true);
  for(const flag of ['hasMarker','hasCalendar','hasSettings','hasReminders','hasBackups']){
    assert.equal(shouldShowWelcome({[flag]:true}),false,`existing ${flag} skips welcome`);
  }
});
test('Fresh desktop install auto-shows a centered welcome, then permanently completes',async()=>{
  const e=createEnvironment(true);initWelcome(e.win,e.document,e.bridge);await drain();
  assert.equal(e.buttons.welcomeOverlay.hidden,false);
  assert.equal(e.buttons.welcomeOverlay.dataset.pending,'false');
  await e.buttons.welcomeStart.click();
  assert.equal(e.buttons.welcomeOverlay.hidden,true);
  assert.equal(e.completions(),1);
  assert.ok(e.document.events.includes('welcome:changed'));
  e.buttons.welcomeOpen.click();
  assert.equal(e.buttons.welcomeOverlay.hidden,false,'help button reopens welcome');
  await e.buttons.welcomeClose.click();
  assert.equal(e.completions(),1,'reopening does not overwrite persistence');
});
test('Upgraded existing users skip the automatic welcome but can reopen manually',async()=>{
  const e=createEnvironment(false);initWelcome(e.win,e.document,e.bridge);await drain();
  assert.equal(e.buttons.welcomeOverlay.hidden,true);
  assert.equal(e.buttons.welcomeOverlay.dataset.pending,'false');
  e.buttons.welcomeOpen.click();
  assert.equal(e.buttons.welcomeOverlay.hidden,false);
  await e.buttons.welcomeStart.click();
  assert.equal(e.completions(),0);
});
test('Tray-start defers fresh-install welcome until calendar becomes visible',async()=>{
  const e=createEnvironment(true);e.document.hidden=true;
  initWelcome(e.win,e.document,e.bridge);await drain();
  assert.equal(e.buttons.welcomeOverlay.hidden,true);
  assert.equal(e.buttons.welcomeOverlay.dataset.pending,'true');
  e.document.hidden=false;
  e.document.listeners.visibilitychange();
  assert.equal(e.buttons.welcomeOverlay.hidden,false);
});
test('Failed completion preserves modal and can be retried',async()=>{
  const e=createEnvironment(true);let called=0;
  e.bridge.completeWelcome=async()=>{if(++called===1)return {ok:false};return {ok:true};};
  initWelcome(e.win,e.document,e.bridge);await drain();
  await e.buttons.welcomeStart.click();
  assert.equal(e.buttons.welcomeOverlay.hidden,false);
  assert.match(e.buttons.welcomeStatus.textContent,/다시 시도/);
  await e.buttons.welcomeStart.click();
  assert.equal(e.buttons.welcomeOverlay.hidden,true);
});
