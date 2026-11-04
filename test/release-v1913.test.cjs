'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const catalog=require('../desktop/release-notes.json');
const source=rel=>fs.readFileSync(path.join(root,rel),'utf8');

test('v1.9.13 package, lock, and approved release notes match',()=>{
 assert.ok(['1.9.13','1.9.14','1.9.15','1.9.16','1.9.17','1.9.18','1.9.19','1.9.20'].includes(pkg.version));
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 assert.deepEqual(catalog['1.9.13'],{
  heading:'일정 태그 입력 개선',
  items:[{title:'일정 태그 입력 개선',description:'@태그 입력 후 Enter를 누르면 즉시 태그가 생성되도록 개선했습니다.'}]
 });
 assert.ok(catalog['1.9.12']);
});
test('Enter handler commits tag and prevents accidental form submit, without a suggestion list',()=>{
 const code=source('renderer/app.js');
 const html=source('renderer/index.html');
 assert.match(code,/eventTitleInput\.addEventListener\('keydown',event=>\{/);
 assert.match(code,/event\.key==='Enter'/);
 assert.match(code,/event\.preventDefault\(\)/);
 assert.match(code,/updateTitleTags\(true\)/);
 assert.match(code,/event\.isComposing/);
 assert.match(code,/compositionend/);
 assert.doesNotMatch(html,/id="tagSuggestions"/);
});
