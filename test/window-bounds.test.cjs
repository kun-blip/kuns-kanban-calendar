 'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {centeredCalendarBounds,DEFAULT_CALENDAR_SIZE}=require('../desktop/window-bounds.cjs');

test('uses 1400×1050 and centers on a roomy monitor',()=>{
  assert.deepEqual(DEFAULT_CALENDAR_SIZE,{width:1400,height:1050});
  assert.deepEqual(centeredCalendarBounds({x:0,y:0,width:1920,height:1200}),{
    x:260,y:75,width:1400,height:1050
  });
});
test('fits a 1920×1040 Windows work area without taskbar overlap',()=>{
  const b=centeredCalendarBounds({x:0,y:0,width:1920,height:1040});
  assert.deepEqual(b,{x:260,y:16,width:1400,height:1008});
});
test('stays fully within small display and preserves negative secondary monitor coordinates',()=>{
  const b=centeredCalendarBounds({x:-1280,y:120,width:1280,height:720});
  assert.deepEqual(b,{x:-1264,y:136,width:1248,height:688});
});
test('centers at a secondary display origin and accepts custom sizes',()=>{
  const b=centeredCalendarBounds({x:1920,y:0,width:2560,height:1440});
  assert.deepEqual(b,{x:2500,y:195,width:1400,height:1050});
});
test('rejects invalid work areas',()=>{
  assert.throws(()=>centeredCalendarBounds({x:0,y:0,width:0,height:1080}),TypeError);
});
