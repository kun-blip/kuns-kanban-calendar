'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Planner=require('../renderer/planner.js');
const source=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');

// Sunday-first week: Nov 1 2026 is Sunday, Nov 7 is Saturday.
test('a single-day Saturday or Sunday launch renders in its actual calendar column',()=>{
  assert.deepEqual(Planner.timelineBounds('2026-11-07','2026-11-07','2026-11-01',0),{
    startIndex:6,endIndex:6,leftContinuation:false,rightContinuation:false
  });
  assert.deepEqual(Planner.timelineBounds('2026-11-08','2026-11-08','2026-11-08',0),{
    startIndex:0,endIndex:0,leftContinuation:false,rightContinuation:false
  });
});

test('single-day weekend events also render with Monday as first day',()=>{
  assert.deepEqual(Planner.timelineBounds('2026-11-07','2026-11-07','2026-11-02',1),{
    startIndex:5,endIndex:5,leftContinuation:false,rightContinuation:false
  });
  assert.deepEqual(Planner.timelineBounds('2026-11-08','2026-11-08','2026-11-02',1),{
    startIndex:6,endIndex:6,leftContinuation:false,rightContinuation:false
  });
});

test('two-day Saturday through Sunday schedule does not produce a weekend timeline bar',()=>{
  assert.equal(Planner.timelineBounds('2026-11-07','2026-11-08','2026-11-02',1),null);
  assert.equal(Planner.timelineBounds('2026-11-07','2026-11-08','2026-11-01',0),null);
  assert.equal(Planner.timelineBounds('2026-11-07','2026-11-08','2026-11-08',0),null);
});

test('multi-day timeline is cropped to working days on each side of weekend',()=>{
  assert.deepEqual(Planner.timelineBounds('2026-11-06','2026-11-09','2026-11-01',0),{
    startIndex:5,endIndex:5,leftContinuation:false,rightContinuation:true
  });
  assert.deepEqual(Planner.timelineBounds('2026-11-06','2026-11-09','2026-11-08',0),{
    startIndex:1,endIndex:1,leftContinuation:true,rightContinuation:false
  });
  assert.deepEqual(Planner.timelineBounds('2026-11-02','2026-11-08','2026-11-02',1),{
    startIndex:0,endIndex:4,leftContinuation:false,rightContinuation:true
  });
});

test('shared and weekly recurring single-day weekend events use the same rule',()=>{
  const shared={id:'shared:123',start:'2026-11-07',end:'2026-11-07',remoteReadOnly:true};
  const recurring={id:'local:456',start:'2026-11-07',end:'2026-11-07',recurrence:'weekly',recurrenceUntil:'2026-11-21'};
  const visible=Planner.expand([shared,recurring],'2026-11-01','2026-11-21');
  assert.equal(visible.length,4);
  for(const event of visible){
    assert.equal(event.start,event.end);
    const weekStart=Planner.week(event.start,0);
    assert.notEqual(Planner.timelineBounds(event.start,event.end,weekStart,0),null);
  }
});

test('weekend policy stays presentation-only: event dates, filters and sharing are not rewritten',()=>{
  assert.match(source,/Planner\.timelineBounds\(e\.start,e\.end,start,data\.weekStart\)/);
  assert.match(source,/if\(start===end\)return 1;/);
  assert.match(html,/주말 하루 일정은 표시되며, 여러 날 일정의 타임라인은 주말을 건너뜁니다/);
  const event={start:'2026-11-07',end:'2026-11-08'};
  Planner.timelineBounds(event.start,event.end,'2026-11-02',1);
  assert.deepEqual(event,{start:'2026-11-07',end:'2026-11-08'});
});
