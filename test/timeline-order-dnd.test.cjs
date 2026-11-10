'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function loadScript(file){const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'renderer',file),'utf8'),context);return context;}
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
const event=(id,extra={})=>({id,title:id,start:'2026-11-09',end:'2026-11-09',color:'#5671dc',...extra});
const seg=(id,startIndex,endIndex,extra={})=>({e:event(id,extra),startIndex,endIndex,leftContinuation:false,rightContinuation:false});

test('timeline lane assignment never leaves overlapping segments on the same lane',()=>{
  const {KuunsTimelinePriority:prio}=loadScript('timeline-priority.js');
  const rows=[
    seg('local-long',3,4),
    seg('shared-on-end',4,4,{sharedId:'remote-1'}),
    seg('owned-shared',3,3),
    seg('after-gap',5,5)
  ];
  const placed=prio.assignLanes(rows,e=>!!e.sharedId||e.id==='owned-shared');
  for(const a of placed.segments){
    for(const b of placed.segments){
      if(a===b||a.lane!==b.lane)continue;
      assert.equal(prio.overlap(a,b),false,`${a.e.id} and ${b.e.id} unexpectedly share lane ${a.lane}`);
    }
  }
});

test('manual timeline order beats shared-first fallback inside an overlap cluster',()=>{
  const {KuunsTimelinePriority:prio}=loadScript('timeline-priority.js');
  const rows=[
    seg('shared-top',0,2,{sharedId:'remote-1',timelineOrder:2}),
    seg('local-dragged-first',0,2,{timelineOrder:1}),
    seg('plain-local',0,2,{timelineOrder:3})
  ];
  const placed=prio.assignLanes(rows,e=>!!e.sharedId);
  const ordered=[...placed.segments].sort((a,b)=>a.lane-b.lane).map(x=>x.e.id);
  assert.deepEqual(ordered,['local-dragged-first','shared-top','plain-local']);
});

test('app wires reorder drag mode, persisted timelineOrder, and safer left-right block sizing',()=>{
  const app=read('renderer/app.js');
  assert.match(app,/applyTimelineReorder\(/);
  assert.match(app,/dragMode==='reorder'/);
  assert.match(app,/timelineOrder:Number\.isFinite\(originalEvent\?\.timelineOrder\)\?originalEvent\.timelineOrder:null/);
  assert.match(app,/block\.style\.right=`calc\(\$\{\(100\*\(6-s\.endIndex\)\/7\)\.toFixed\(6\)\}% \+ 5px\)`/);
});


test('read-only shared item can have a custom display-only lane without modifying event',()=>{
  const {KuunsTimelinePriority:prio}=loadScript('timeline-priority.js');
  const sharedRow=seg('remote',0,2,{remoteReadOnly:true,sharedId:'share-a'});
  const localRow=seg('local',0,2);
  const positions=[{...localRow,timelineOrder:1},{...sharedRow,timelineOrder:2}];
  const laidOut=prio.assignLanes(positions,e=>!!e.sharedId);
  assert.deepEqual(Array.from(laidOut.segs.slice().sort((a,b)=>a.lane-b.lane),x=>x.e.id),['local','remote']);
  assert.equal(sharedRow.e.timelineOrder,undefined);
});

test('display-only timeline order is synchronized in account snapshot and validated by server',()=>{
  const {KuunsAccountSync}=loadScript('account-sync.js');
  const {validateAccountSnapshot}=require('../desktop/sharing-client.cjs');
  const snapshot=KuunsAccountSync.snapshot({events:[],notes:[],todos:[],games:[],shortcuts:[],timelineLayout:{'2026-11-08':['local','shared:peer']}});
  assert.deepEqual(snapshot.timelineLayout,{'2026-11-08':['local','shared:peer']});
  assert.deepEqual(validateAccountSnapshot(snapshot).timelineLayout,snapshot.timelineLayout);
});

test('vertical drag is supported on read-only shared blocks without sharing writes',()=>{
  const app=read('renderer/app.js');
  assert.match(app,/remoteReadOnly\)\{block.title.*block.addEventListener\('pointerdown'/);
  assert.match(app,/data\.timelineRowPins\[week\]=/);
  assert.doesNotMatch(app.slice(app.indexOf('function applyTimelineReorder'),app.indexOf('function renderCalendar()')),/sharing\?\.markLocalDirty|syncEditedEvent/);
});
