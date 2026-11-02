'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const Library=require('../renderer/tag-library.js');
const Tags=require('../renderer/event-tags.js');
const {normalizeEvent}=require('../desktop/sharing-client.cjs');

test('saved tags support independent background and text colors with backward compatible white text',()=>{
 const original=Library.clean([{name:'검수',color:'#abc123'}]);
 assert.equal(original[0].textColor,'#ffffff');
 const custom=Library.add(original,{name:'디자인',color:'#eeeeee',textColor:'#222222'}).catalog;
 assert.deepEqual(custom[1],{name:'디자인',color:'#eeeeee',textColor:'#222222'});
 const changed=Library.update(custom,'디자인','디자인','#fafafa','#111111');
 assert.equal(changed.error,null);
 assert.deepEqual(Library.match(changed.catalog,[{name:'디자인',color:'#000000'}]),[{name:'디자인',color:'#fafafa',textColor:'#111111'}]);
 assert.equal(Library.update(changed.catalog,'디자인','디자인','#cccccc').catalog[1].textColor,'#111111');
 assert.match(Library.update(changed.catalog,'디자인','디자인','#ffffff','bad').error,/색상/);
});

test('tag recolor applies text color to existing events and survives clean/save and sharing',()=>{
 const event={id:'id-01',title:'테스트',start:'2026-11-02',end:'2026-11-02',color:'#526aa6',tags:[{name:'검수',color:'#aaaacc'}]};
 const changed=Library.applyUpdate([event],'검수',{name:'검수',color:'#ffffff',textColor:'#13294b'});
 assert.equal(changed.length,1);
 assert.deepEqual(Tags.clean(event.tags),[{name:'검수',color:'#ffffff',textColor:'#13294b'}]);
 const payload=normalizeEvent(event);
 assert.deepEqual(payload.event_data.tags,[{name:'검수',color:'#ffffff',textColor:'#13294b'}]);
 const oldPayload=normalizeEvent({...event,tags:[{name:'검수',color:'#eeeeee'}]});
 assert.equal(oldPayload.event_data.tags[0].textColor,'#ffffff');
});

test('tag manager is collapsed initially, applies saved tags immediately, and color controls are squares',()=>{
 const html=read('renderer/index.html');
 const app=read('renderer/app.js');
 assert.match(html,/<details class="tag-library-fold" id="tagLibraryFold">/);
 assert.ok(html.indexOf('id="eventTagChips"')<html.indexOf('id="tagLibraryFold"'));
 for(const id of ['tagLibraryColor','tagLibraryTextColor','tagLibraryPreviewChip'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/\.tag-library-editor input\[type=color\][^{]*\{[^}]*width:38px;height:38px/);
 assert.match(app,/\$\('tagLibraryFold'\)\.open=false/);
 assert.match(app,/\$\('tagLibraryFold'\)\.open=true;openTagEditor\(tag\.name\)/);
 assert.match(app,/tag\.textColor\|\|'#ffffff'/);
});

test('preview updates immediately as tag name, background and text color change',()=>{
 const app=read('renderer/app.js');
 const start=app.indexOf(' function updateTagPreview(){');
 const end=app.indexOf(' for(const id of [\'tagLibraryName\'',start);
 assert.ok(start>0&&end>start);
 const controls={
   tagLibraryName:{value:'@검수'},
   tagLibraryColor:{value:'#123456'},
   tagLibraryTextColor:{value:'#ffeeaa'},
   tagLibraryPreviewChip:{textContent:'',style:{backgroundColor:'',color:''}}
 };
 const update=new Function('$','TagLibrary',app.slice(start,end)+'\nreturn updateTagPreview;')(id=>controls[id],Library);
 update();
 assert.deepEqual({text:controls.tagLibraryPreviewChip.textContent,bg:controls.tagLibraryPreviewChip.style.backgroundColor,fg:controls.tagLibraryPreviewChip.style.color},
   {text:'검수',bg:'#123456',fg:'#ffeeaa'});
 controls.tagLibraryName.value='';
 controls.tagLibraryColor.value='#ffffff';
 controls.tagLibraryTextColor.value='#121212';
 update();
 assert.equal(controls.tagLibraryPreviewChip.textContent,'태그 미리보기');
 assert.equal(controls.tagLibraryPreviewChip.style.color,'#121212');
});
