'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Tags=require('../renderer/event-tags.js');
const Planner=require('../renderer/planner.js');
const {normalizeEvent}=require('../desktop/sharing-client.cjs');
const file=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('@tag tokens become independent colored chips while preserving the title',()=>{
 const result=Tags.extract(' @검수 @출시 신규 영상 검토 ',[],true);
 assert.equal(result.title,'신규 영상 검토 ');
 assert.deepEqual(result.tags.map(t=>t.name),['검수','출시']);
 assert.equal(result.tags[0].color,'#34795e');
});
test('unfinished @tag input is not consumed before user commits it',()=>{
 const original=Tags.extract('프로모션 @검수',[],false);
 assert.equal(original.title,'프로모션 @검수');assert.equal(original.tags.length,0);
 const committed=Tags.extract('프로모션 @검수',[],true);
 assert.equal(committed.title.trim(),'프로모션');assert.equal(committed.tags[0].name,'검수');
});
test('tag list is bounded, deduplicated and validates colors',()=>{
 const tags=Tags.clean([{name:'검수',color:'#ABCDEF'},{name:'검수',color:'#123456'},{name:'bad tag',color:'red'},{name:'빌드',color:'bogus'}]);
 assert.deepEqual(tags,[{name:'검수',color:'#abcdef'},{name:'빌드',color:'#a86a32'}]);
});
test('old [검수] prefixes render as tags without overwriting data',()=>{
 const old='[검수] Board Quest';const converted=Tags.legacyTags(old,[]);
 assert.equal(old,'[검수] Board Quest');
 assert.equal(converted.title,'Board Quest');assert.equal(converted.tags[0].name,'검수');
});
test('shared payload transmits valid tag name/color and never arbitrary HTML',()=>{
 const item=normalizeEvent({id:'e-001',title:'캠페인',start:'2026-11-16',end:'2026-11-19',tags:[{name:'검수',color:'#34795e'},{name:'<script>',color:'#ff0000'}]});
 assert.deepEqual(item.event_data.tags,[{name:'검수',color:'#34795e'}]);
 assert.equal(item.end_date,'2026-11-19');
});
test('calendar code offers manual refresh and refreshes on focus, visibility and online',()=>{
 const app=file('renderer/app.js');const sharing=file('renderer/sharing.js');
 assert.match(app, /refreshCalendarBtn'\)\.addEventListener\('click'/);
 assert.match(sharing, /visibilitychange/);assert.match(sharing, /30000/);
 assert.match(sharing, /pendingLocalSync/);
});
test('today navigation refreshes current clock and shows selected day',()=>{
 const app=file('renderer/app.js');
 assert.match(app,/todayBtn'\)\.addEventListener\('click',\(\)=>\{updateToday\(\)/);
 assert.match(app,/scrollIntoView/);
});
test('date selection range preserves inclusive start/end boundaries',()=>{
 assert.equal(Planner.add('2026-11-16',3),'2026-11-19');
 assert.equal(Planner.days('2026-11-16','2026-11-19'),3);
 const app=file('renderer/app.js');
 assert.match(app,/openEvent\(null,start,end\)/);
 assert.match(app,/installRangeSelection\(hit\)/);
});
test('timeline context menu handles local edit and delete',()=>{
 const app=file('renderer/app.js');
 assert.match(app,/block\.addEventListener\('contextmenu'/);
 assert.match(app,/void sharing\?\.handleLocalDelete\(local\.id\)/);
 assert.match(app,/color-dot/);
});
test('timeline offers gray swatch and theme switch includes text',()=>{
 const app=file('renderer/app.js');
 assert.match(app, /"#808895"/);
 assert.match(app, /theme-mode-name/);
});
