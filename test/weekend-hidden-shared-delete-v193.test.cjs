'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
const {deleteOwnedEvent,remoteRows}=require('../renderer/shared-visibility.js');
const owner={id:'remote-id',owner_id:'user-a',local_event_id:'local-id',title:'Weekend Test'};
test('owner deletion removes remote first and local copy second',async()=>{
 const calls=[];
 await deleteOwnedEvent(owner,'user-a',async id=>{calls.push('remote:'+id);return [{id}];},async id=>calls.push('local:'+id));
 assert.deepEqual(calls,['remote:remote-id','local:local-id']);
});
test('non-owner cannot delete even if the UI button is tampered with',async()=>{
 let called=false;
 await assert.rejects(deleteOwnedEvent(owner,'user-b',async()=>{called=true;return [];},async()=>{called=true;}),/작성자/);
 assert.equal(called,false);
});
test('remote rejection must preserve local schedule',async()=>{
 let local=false;
 await assert.rejects(deleteOwnedEvent(owner,'user-a',async()=>[],async()=>{local=true;}),/서버에서 삭제되지/);
 assert.equal(local,false);
});
test('remote network errors must preserve local schedule',async()=>{
 let local=false;
 await assert.rejects(deleteOwnedEvent(owner,'user-a',async()=>{throw Error('offline');},async()=>{local=true;}),/offline/);
 assert.equal(local,false);
});
test('server-only owner event deletes without needing a local event id',async()=>{
 let local=false;
 await deleteOwnedEvent({...owner,local_event_id:null},'user-a',async()=>[{id:owner.id}],async()=>{local=true;});
 assert.equal(local,false);
 assert.equal(remoteRows([owner],[],'user-a').length,1);
});
test('shared list and details expose owner delete, with explicit local-data callback',()=>{
 const sh=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
 assert.match(sh,/if\(isMine\(item\)\)btn\(actions,'일정 삭제'/);
 assert.match(sh,/btn\(section,'일정 삭제 \(내 PC \+ 공유\)'/);
 assert.match(sh,/onDeleteOwnedEvent\?\.\(id\)/);
 assert.match(app,/onDeleteOwnedEvent:async localId/);
 assert.match(app,/data\.events=before\.filter\(e=>e\.id!==localId\)/);
});
test('PostgREST unshare returns deleted rows for ownership confirmation',()=>{
 const client=fs.readFileSync(path.join(root,'desktop/sharing-client.cjs'),'utf8');
 assert.match(client,/if \(route\.includes\('\/rest\/v1\/'\)\) headers\.Prefer='return=representation'/);
 assert.match(client,/unshare:async eventId=>authorized\('\/rest\/v1\/shared_events\?id=eq\.'/);
});
