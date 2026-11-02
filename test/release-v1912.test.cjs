'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const {extract}=require('../renderer/event-tags.js');

test('v1.9.12 version and lock are consistent; approved patch note is exact',()=>{
  assert.ok(['1.9.12','1.9.13','1.9.14'].includes(pkg.version));
  assert.equal(lock.version,pkg.version);
  assert.equal(lock.packages[''].version,pkg.version);
  assert.deepEqual(notes['1.9.12'],{
    heading:'자유 입력형 일정 태그 지원',
    items:[{
      title:'자유 입력형 일정 태그 지원',
      description:'@ 뒤에 원하는 단어를 입력해 자유롭게 태그를 생성할 수 있습니다. 고정 태그 추천 목록을 제거하고 입력 편의성을 개선했습니다.'
    }]
  });
  assert.ok(notes['1.9.11'],'previous notes are preserved');
});

test('v1.9.12 custom tag entry is unrestricted and fixed suggestions are absent',()=>{
  const form=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
  assert.doesNotMatch(form,/id="tagSuggestions"/);
  assert.doesNotMatch(app,/Tags\.suggestions/);
  assert.deepEqual(extract('영상 @점검 @크리에이티브 ',[],false).tags.map(x=>x.name),['점검','크리에이티브']);
  assert.deepEqual(extract('영상 @새태그',[],true).tags.map(x=>x.name),['새태그']);
});
