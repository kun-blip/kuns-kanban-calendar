'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Tags=require('../renderer/event-tags.js');
const TagLibrary=require('../renderer/tag-library.js');
const source=(name)=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('custom Korean, English and mixed @words become colored tags without a whitelist',()=>{
  const result=Tags.extract('@회의 @QA테스트 @프로모션_2 영상 편집',[],false);
  assert.deepEqual(result.tags.map(t=>t.name),['회의','QA테스트','프로모션_2']);
  assert.equal(result.title,'영상 편집');
  assert.ok(result.tags.every(tag=>/^#[0-9a-f]{6}$/i.test(tag.color)));
});

test('single pending @word is not taken before separator; explicit save commits',()=>{
  assert.deepEqual(Tags.extract('@',[],false),{title:'@',tags:[]});
  assert.deepEqual(Tags.extract('상세 작업 @디자인',[],false),{title:'상세 작업 @디자인',tags:[]});
  const saved=Tags.extract('상세 작업 @디자인',[],true);
  assert.equal(saved.title,'상세 작업 ');
  assert.deepEqual(saved.tags.map(t=>t.name),['디자인']);
});

test('repeating a tag does not duplicate it or leave the typed token in title',()=>{
  const tags=[{name:'검수',color:'#123456'}];
  const result=Tags.extract('신규 영상 @검수 @검수 편집',tags,false);
  assert.equal(result.title,'신규 영상 편집');
  assert.deepEqual(result.tags,tags);
});

test('extra @word is preserved when event already has eight tags',()=>{
  const existing=Array.from({length:8},(_,i)=>({name:`tag${i}`,color:'#123456'}));
  const result=Tags.extract('작업 @추가태그 이후',existing,false);
  assert.equal(result.title,'작업 @추가태그 이후');
  assert.equal(result.tags.length,8);
});

test('unrelated whitespace and punctuation remain unchanged',()=>{
  const before='예상  UI 화면.  @마케팅!';
  assert.equal(Tags.extract(before,[],true).title,before);
  assert.deepEqual(Tags.extract(before,[],true).tags,[]);
});

test('custom tag color is retained and old manually typed prefixes still show',()=>{
  const selected=Tags.clean([{name:'회의',color:'#18beef'}]);
  assert.deepEqual(Tags.extract('팀 회의 @회의 ',selected,false).tags,selected);
  assert.deepEqual(Tags.legacyTags('[검수] 영상 편집',[]).tags.map(t=>t.name),['검수']);
});

test('fixed suggestion dropdown is absent and IME composition is respected',()=>{
  const markup=source('renderer/index.html');
  const app=source('renderer/app.js');
  assert.doesNotMatch(markup,/id="tagSuggestions"/);
  assert.doesNotMatch(markup,/class="tag-suggestions"/);
  assert.doesNotMatch(app,/Tags\.suggestions/);
  assert.match(app,/event\.isComposing/);
  assert.match(app,/compositionend/);
  assert.match(app,/addEventListener\('blur',\(\)=>\{commitTitleTagOnCompositionEnd=false;updateTitleTags\(true\);\}\)/);
  assert.match(markup,/@단어를 입력하고 Enter/);
});


test('Enter commits an arbitrary @tag immediately without submitting the form',()=>{
  const app=source('renderer/app.js');
  const start=app.indexOf(' function updateTitleTags(commitEnd=false)');
  const end=app.indexOf(' function openEvent(',start);
  assert.ok(start>=0&&end>start,'tag handlers found in renderer');
  const listeners={};
  const input={
    value:'콘텐츠 제작 @쿤',selectionStart:'콘텐츠 제작 @쿤'.length,
    addEventListener(type,handler){listeners[type]=handler;},
    setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
  };
  let renderCount=0;
  const setup=new Function('$','Tags','TagLibrary','document','renderTagChips','renderTagLibrary','rememberEditedTags','data',
    'let editingTags=[];\n'+app.slice(start,end)+'\nreturn {getTags:()=>editingTags};');
  const state=setup(()=>input,Tags,TagLibrary,{activeElement:input},()=>{renderCount++;},()=>{},()=>{},{tagLibrary:[],tagLibraryHidden:[]});
  let prevented=false;
  listeners.keydown({key:'Enter',repeat:false,isComposing:false,keyCode:13,
    preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.deepEqual(state.getTags().map(tag=>tag.name),['쿤']);
  assert.equal(input.value,'콘텐츠 제작 ');
  assert.equal(renderCount,1);

  // Once the tag was consumed, a second Enter behaves normally.
  prevented=false;
  listeners.keydown({key:'Enter',repeat:false,isComposing:false,keyCode:13,
    preventDefault(){prevented=true;}});
  assert.equal(prevented,false);
  assert.equal(state.getTags().length,1);
});

test('Korean IME Enter commits after compositionend without losing Hangul',()=>{
  const app=source('renderer/app.js');
  const start=app.indexOf(' function updateTitleTags(commitEnd=false)');
  const end=app.indexOf(' function openEvent(',start);
  const listeners={};
  const input={value:'@',selectionStart:1,
    addEventListener(type,handler){listeners[type]=handler;},
    setSelectionRange(start){this.selectionStart=start;}};
  let renderCount=0;
  const setup=new Function('$','Tags','TagLibrary','document','renderTagChips','renderTagLibrary','rememberEditedTags','data',
    'let editingTags=[];\n'+app.slice(start,end)+'\nreturn {getTags:()=>editingTags};');
  const state=setup(()=>input,Tags,TagLibrary,{activeElement:input},()=>{renderCount++;},()=>{},()=>{},{tagLibrary:[],tagLibraryHidden:[]});
  listeners.compositionstart();
  input.value='@쿤';input.selectionStart=2;
  let prevented=false;
  listeners.keydown({key:'Enter',repeat:false,isComposing:true,keyCode:229,
    preventDefault(){prevented=true;}});
  assert.equal(prevented,false,'IME can finish composing its Hangul syllable');
  assert.equal(state.getTags().length,0,'tag is not consumed during composition');
  listeners.compositionend();
  assert.equal(input.value,'');
  assert.deepEqual(state.getTags().map(tag=>tag.name),['쿤']);
  assert.equal(renderCount,1);
});

test('IME compositionend without Enter keeps the partial @word editable',()=>{
  const app=source('renderer/app.js');
  const start=app.indexOf(' function updateTitleTags(commitEnd=false)');
  const end=app.indexOf(' function openEvent(',start);
  const listeners={};
  const input={value:'@쿤',selectionStart:2,
    addEventListener(type,handler){listeners[type]=handler;},
    setSelectionRange(start){this.selectionStart=start;}};
  const setup=new Function('$','Tags','TagLibrary','document','renderTagChips','renderTagLibrary','rememberEditedTags','data',
    'let editingTags=[];\n'+app.slice(start,end)+'\nreturn {getTags:()=>editingTags};');
  const state=setup(()=>input,Tags,TagLibrary,{activeElement:input},()=>{},()=>{},()=>{},{tagLibrary:[],tagLibraryHidden:[]});
  listeners.compositionstart();
  listeners.compositionend();
  assert.equal(input.value,'@쿤');
  assert.equal(state.getTags().length,0);
  listeners.blur();
  assert.equal(input.value,'');
  assert.equal(state.getTags()[0].name,'쿤');
});
