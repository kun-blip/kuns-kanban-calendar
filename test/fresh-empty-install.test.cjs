'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {assertPayload}=require('../desktop/data.cjs');
const {shouldShowWelcome}=require('../desktop/welcome-state.cjs');
const appSource=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
const root=path.join(__dirname,'..');

function getFreshState(){
  const match=appSource.match(/const sampleData=\(\)=>\([\s\S]*?\);\nfunction cleanGame\(/);
  assert.ok(match,'The app initial calendar function must be present');
  const expression=match[0].slice(0,-'\nfunction cleanGame('.length);
  const context={defaultGames:()=>[{id:'randomdice2',name:'Randomdice2',icon:''}]};
  vm.createContext(context);
  vm.runInContext(expression+'\nglobalThis.initial=sampleData();',context);
  return JSON.parse(JSON.stringify(context.initial));
}

test('new installs open with zero schedules, notes and daily todos',()=>{
  const data=getFreshState();
  assert.deepEqual(data.events,[]);
  assert.deepEqual(data.notes,[]);
  assert.deepEqual(data.todos,[]);
  assert.deepEqual(data.timelineLayout,{});
  assert.deepEqual(data.timelineRowPins,{});
  assert.equal(data.version,11);
  assert.doesNotThrow(()=>assertPayload(JSON.stringify(data)));
  assert.equal(shouldShowWelcome({}),true);
});

test('initial calendar no longer seeds demo titles, private notes, or real employee data',()=>{
  assert.doesNotMatch(appSource,/예시 · 프로모션 영상 제작|예시 · 콘텐츠 디자인 검수|예시 · 마감 및 피드백|첫 번째 메모/);
  assert.match(appSource,/if\(stored\)\{const parsed=JSON\.parse\(stored\);data=\{/);
  assert.match(appSource,/\}else\{data=sampleData\(\);/);
});

test('existing saved schedules remain valid and are not reset on upgrades',()=>{
  const existing={...getFreshState(),events:[{id:'owned-1',title:'existing calendar entry',start:'2026-11-10',end:'2026-11-11'}],notes:[{id:'1',title:'private user note'}]};
  const restored=assertPayload(JSON.stringify(existing));
  assert.equal(restored.events[0].title,'existing calendar entry');
  assert.equal(restored.notes[0].title,'private user note');
  assert.equal(shouldShowWelcome({hasCalendar:true}),false);
});

test('packaged app bundles code/assets, not an example user calendar JSON file',()=>{
  const pkg=require('../package.json');
  assert.ok(pkg.build.files.includes('renderer/**/*'));
  assert.ok(pkg.build.files.includes('desktop/**/*'));
  assert.ok(!pkg.build.files.some(item=>/calendar-data\.json/.test(item)));
  assert.equal(fs.existsSync(path.join(root,'calendar-data.json')),false);
  assert.equal(fs.existsSync(path.join(root,'desktop/calendar-data.json')),false);
  assert.match(fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8'),/app\.getPath\('userData'\)/);
});
