'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Library=require('../renderer/tag-library.js');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('old event tags migrate into reusable saved catalog on first launch',()=>{
 const events=[{tags:[{name:'검수',color:'#234567'},{name:'외주',color:'#aa22cc'}]},{tags:[{name:'검수',color:'#112233'}]}];
 const catalog=Library.initial(events);
 assert.deepEqual(catalog.map(t=>t.name),['검수','외주']);
 assert.equal(catalog.find(t=>t.name==='검수').color,'#234567');
});

test('saved tags can be applied to any new event, preserving chosen color',()=>{
 let catalog=Library.initial([]);
 catalog=Library.add(catalog,{name:'쿤',color:'#123456'}).catalog;
 assert.deepEqual(Library.match(catalog,[{name:'쿤',color:'#000000'}]),[{name:'쿤',color:'#123456',textColor:'#ffffff'}]);
 assert.equal(Library.remember(catalog,[{name:'쿤',color:'#222222'}]).length,catalog.length);
});

test('rename and recolor apply to previous events without removing other tags',()=>{
 const events=[{id:'1',tags:[{name:'검수',color:'#111111'},{name:'QA',color:'#123456'}]},
               {id:'2',tags:[{name:'검수',color:'#111111'}]},{id:'3',tags:[]}];
 const result=Library.update(Library.initial(events),'검수','품질검수','#abcdef');
 assert.equal(result.error,null);
 const changed=Library.applyUpdate(events,'검수',result.catalog.find(t=>t.name==='품질검수'));
 assert.deepEqual(changed.map(e=>e.id),['1','2']);
 assert.equal(events[0].tags[0].name,'품질검수');
 assert.equal(events[0].tags[0].color,'#abcdef');
 assert.deepEqual(events[0].tags[1],{name:'QA',color:'#123456'});
});

test('duplicate/invalid tag names are rejected and saved list deletion preserves original event tags',()=>{
 const original=[{name:'기획',color:'#234567'}];
 assert.match(Library.update(original,'기획','이름 공백','#aabbcc').error,/태그/);
 assert.match(Library.add(original,{name:'기획',color:'#111111'}).error,/이미/);
 const events=[{tags:[{name:'기획',color:'#234567'}]}];
 const after=Library.remove(original,'기획');
 assert.deepEqual(after,[]);assert.equal(events[0].tags[0].name,'기획');
});

test('data persistence and restore retain library, including deleted-tag suppression',()=>{
 const app=read('renderer/app.js');
 assert.match(app,/tagLibrary:Array\.isArray\(parsed\.tagLibrary\)/);
 assert.match(app,/tagLibraryHidden:parsed\.tagLibraryHidden/);
 assert.match(app,/data\.tagLibraryHidden\.includes\(tag\.name\)/);
 assert.match(app,/tagLibrary:data\.tagLibrary,tagLibraryHidden:data\.tagLibraryHidden/);
 assert.match(app,/tagLibrary:Array\.isArray\(obj\.tagLibrary\)/);
 assert.match(app,/sharing\?\.syncEditedEvent/);
});

test('tag management is directly below event title; no visible status select remains',()=>{
 const html=read('renderer/index.html');
 const indexTitle=html.indexOf('id="eventTitle"');
 const indexLibrary=html.indexOf('id="tagLibraryField"');
 const indexGame=html.indexOf('id="gameSelect"');
 assert.ok(indexTitle>=0&&indexLibrary>indexTitle&&indexGame>indexLibrary);
 for(const id of ['eventTagChips','tagLibraryList','createTag','tagLibraryName','tagLibraryColor','tagLibrarySave','deleteSavedTag'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/type="hidden" id="eventStatus"/);
 assert.match(html,/script src="\.\/tag-library\.js"/);
});
