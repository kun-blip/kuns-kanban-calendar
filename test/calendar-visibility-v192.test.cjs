'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const {remoteRows}=require('../renderer/shared-visibility.js');
const owned={id:'owned-remote',owner_id:'me',local_event_id:'local-1',title:'Test'};
const invited={id:'invited-remote',owner_id:'other',local_event_id:'other-local',title:'Invited'};
test('owners with local event keep only one calendar entry',()=>{
  assert.deepEqual(remoteRows([owned,invited],[{id:'local-1'}],'me'),[invited]);
});
test('owners missing their local event see a server fallback',()=>{
  assert.deepEqual(remoteRows([owned,invited],[],'me'),[owned,invited]);
});
test('server-owned fallback remains when linked local id is unavailable',()=>{
  assert.deepEqual(remoteRows([{...owned,local_event_id:null}],[],'me').length,1);
});
test('weekend-only dates remain out of the timeline, preserving the old rule',()=>{
  const {workdayBounds}=require('../renderer/planner.js');
  assert.deepEqual(workdayBounds(0),[1,5]);
  assert.deepEqual(workdayBounds(1),[0,4]);
});
test('calendar no longer renders weekend chips, but still supports shared owner fallback',()=>{
  const sh=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
  const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
  assert.match(sh,/KuunsSharedVisibility\.remoteRows\(rows,getEvents\(\),session\.userId\)/);
  assert.doesNotMatch(app,/weekendEvents\(|weekend-event-chip/);
  assert.doesNotMatch(html,/weekend-event-chip/);
  assert.match(html,/shared-visibility\.js/);
});
