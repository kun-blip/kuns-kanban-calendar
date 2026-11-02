'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Tags=require('../renderer/event-tags.js');
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
  assert.match(app,/addEventListener\('blur',\(\)=>updateTitleTags\(true\)\)/);
  assert.match(markup,/@ 뒤로 원하는 단어/);
});
