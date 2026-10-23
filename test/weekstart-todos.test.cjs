'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const planner=require('../renderer/planner.js');
const todos=require('../renderer/todos.js');
const html=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
test('Sunday is the backward-compatible default; Monday begins the preceding Monday',()=>{
  assert.equal(planner.week('2026-10-23'),'2026-10-18');
  assert.equal(planner.week('2026-10-23',1),'2026-10-19');
  assert.equal(planner.week('2026-11-01',1),'2026-10-26');
  assert.equal(planner.week('2026-11-01',0),'2026-11-01');
});
test('headers and weekday-only timeline align with both week start preferences',()=>{
  assert.deepEqual(planner.dayOrder(0),[0,1,2,3,4,5,6]);
  assert.deepEqual(planner.dayOrder(1),[1,2,3,4,5,6,0]);
  assert.deepEqual(planner.workdayBounds(0),[1,5]);
  assert.deepEqual(planner.workdayBounds(1),[0,4]);
  for(const startDay of [0,1]){
    const dates=planner.dayOrder(startDay).map(n=>n);
    const [first,last]=planner.workdayBounds(startDay);
    assert.deepEqual(dates.slice(first,last+1),[1,2,3,4,5]);
  }
});
test('editable todo text respects max length, trims and does not change id/done',()=>{
  const original=[{id:'one',text:'기존 업무',done:true},{id:'two',text:'별도 업무',done:false}];
  const result=todos.update(original,'one','  새로운 할 일  ');
  assert.equal(result.changed,true);
  assert.deepEqual(result.todos,[{id:'one',text:'새로운 할 일',done:true},original[1]]);
  assert.deepEqual(original[0],{id:'one',text:'기존 업무',done:true});
  assert.equal(todos.update(result.todos,'one','  ').changed,false);
  assert.equal(todos.update(result.todos,'absent','없는 투두').changed,false);
  assert.equal(todos.update(result.todos,'one','가'.repeat(200)).todos[0].text.length,140);
});
test('both UI surfaces share one todo collection and preserve preference in backups',()=>{
  for(const id of ['weekStartSelect','weekdayHeaders','mainTodoForm','mainTodoList','widgetTodoForm','widgetTodoList'])assert.match(html,new RegExp(`id="${id}"`));
  assert.match(html,/function renderTodoInto\(listId,countId\)/);
  assert.match(html,/renderTodoInto\('mainTodoList','mainTodoCount'\)/);
  assert.match(html,/renderTodoInto\('widgetTodoList','widgetTodoCount'\)/);
  assert.match(html,/weekStart:data.weekStart/);
  assert.match(html,/weekStart:obj.weekStart===1\?1:0/);
  assert.match(html,/Planner\.week\(selectedDate,data\.weekStart\)/);
});
