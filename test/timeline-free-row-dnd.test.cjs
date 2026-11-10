'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=path.join(__dirname,'..');
function load(file){const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(source,file),'utf8'),ctx);return ctx;}
function row(id,startIndex,endIndex,extra={}){return {e:{id,title:id,...extra},startIndex,endIndex};}
const shared=e=>Boolean(e.sharedId);
const asRowMap=layout=>Object.fromEntries(layout.segs.map(x=>[x.e.id,x.lane]));

test('purple block can move below gray blocks even when dates do not overlap',()=>{
 const p=load('renderer/timeline-priority.js').KuunsTimelinePriority;
 const grayA=row('gray-mon',1,2);
 const grayB=row('gray-tue',2,3);
 const purple=row('purple-thu',4,5,{sharedId:'shared-purple'});
 const before=p.assignLanes([grayA,grayB,purple],shared);
 assert.equal(asRowMap(before)['purple-thu'],0,'unmodified nonoverlapping purple uses first row');
 const after=p.assignLanes([grayA,grayB,{...purple,preferredLane:3}],shared);
 const map=asRowMap(after);
 assert.equal(map['purple-thu'],3,'user-requested fourth row is respected even across different overlap groups');
 assert.equal(map['gray-mon'],0);
 assert.equal(map['gray-tue'],1);
 assert.equal(after.lanes,4,'week grows to fit pinned row');
 assert.equal(purple.preferredLane,undefined,'original event is not modified');
});

test('pinning to a busy row moves overlapping automatic block down without colliding',()=>{
 const p=load('renderer/timeline-priority.js').KuunsTimelinePriority;
 const rows=[row('gray',2,4),row('shared-purple',3,4,{sharedId:'a'}),row('yellow',4,5)];
 const result=p.assignLanes(rows.map(x=>x.e.id==='shared-purple'?{...x,preferredLane:0}:x),shared);
 const map=asRowMap(result);
 assert.equal(map['shared-purple'],0);
 assert.notEqual(map['gray'],map['shared-purple']);
 for(const a of result.segs)for(const b of result.segs){
   if(a===b||a.lane!==b.lane)continue;
   assert.equal(p.overlap(a,b),false,`${a.e.id} overlaps ${b.e.id}`);
 }
});

test('existing shared-first default still works without manual preferences',()=>{
 const p=load('renderer/timeline-priority.js').KuunsTimelinePriority;
 const result=p.assignLanes([row('private',2,4),row('shared',3,3,{sharedId:'a'})],shared);
 const map=asRowMap(result);
 assert.equal(map.shared,0);assert.equal(map.private,1);
});

test('snapshot keeps old fingerprint until first manual pin is saved',()=>{
 const a=load('renderer/account-sync.js').KuunsAccountSync;
 const original={events:[],notes:[],todos:[],games:[],shortcuts:[],timelineLayout:{}};
 assert.equal('timelineRowPins' in a.snapshot(original),false);
 assert.equal('timelineRowPins' in a.snapshot({...original,timelineRowPins:{}}),false);
 const updated=a.snapshot({...original,timelineRowPins:{'2026-11-08':{'shared:id':3}}});
 assert.equal(updated.timelineRowPins['2026-11-08']['shared:id'],3);
 const {validateAccountSnapshot}=require('../desktop/sharing-client.cjs');
 assert.equal(validateAccountSnapshot(updated).timelineRowPins['2026-11-08']['shared:id'],3);
});

test('drag no longer requires overlapping cluster and stores row pins without mutating shared events',()=>{
 const app=fs.readFileSync(path.join(source,'renderer/app.js'),'utf8');
 const drag=app.slice(app.indexOf('function startTimelineDrag'),app.indexOf('function renderColors()'));
 assert.match(drag,/Math\.abs\(dy\)>14/);
 assert.doesNotMatch(drag,/cluster\.length/);
 assert.match(drag,/Math\.min\(9,Math\.round\(laneFloat\)\)/);
 const reorder=app.slice(app.indexOf('function applyTimelineReorder'),app.indexOf('function renderCalendar()'));
 assert.match(reorder,/data\.timelineRowPins\[week\]/);
 assert.doesNotMatch(reorder,/sharing\?\.markLocalDirty|syncEditedEvent/);
});
