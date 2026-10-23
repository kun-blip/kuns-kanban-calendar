'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateFeedback, createFeedbackController } = require('../desktop/feedback.cjs');
const ENDPOINT = 'https://script.google.com/macros/s/deploy-id/exec';

test('feedback includes only user-written fields and app version', () => {
  const payload = validateFeedback({
    type: '기능 제안', message: '  주간 일정 추가 부탁드려요  ', nickname: '', events: [{title:'secret'}], token: 'secret'
  }, '1.7.0');
  assert.deepEqual(payload, {type: '기능 제안', message: '주간 일정 추가 부탁드려요', nickname:'익명',version:'1.7.0',website:''});
});

test('reject invalid data and oversized text', () => {
  assert.throws(() => validateFeedback({type:'기타',message:'test'},'1.7.0'));
  assert.throws(() => validateFeedback({type:'버그 신고',message:'x'.repeat(2001)},'1.7.0'));
  assert.throws(() => validateFeedback({type:'버그 신고',message:'a'},'1.7.0'));
});

test('successful Apps Script response, cooldown and payload', async () => {
  let now=100000, calls=0, sent;
  const submitter=createFeedbackController({endpoint:ENDPOINT,version:'1.7.0',now:()=>now,
    fetchImpl: async (_url, opts) => {calls++;sent=JSON.parse(opts.body);return {ok:true,text:async()=>'{"ok":true}'};}});
  assert.equal((await submitter.submit({type:'버그 신고',message:'제목이 잘려요'})).ok,true);
  assert.equal(sent.version,'1.7.0');
  assert.equal(calls,1);
  assert.equal((await submitter.submit({type:'버그 신고',message:'다른 내용이에요'})).ok,false);
  now+=60001;
  assert.equal((await submitter.submit({type:'버그 신고',message:'다른 내용이에요'})).ok,true);
  assert.equal(calls,2);
});

test('failed response never presents as success', async () => {
  const ctrl=createFeedbackController({endpoint:ENDPOINT,version:'1.7.0',fetchImpl:async()=>({ok:true,text:async()=>'<html>login</html>'})});
  assert.equal((await ctrl.submit({type:'디자인 개선',message:'버튼 변경'})).ok,false);
});

test('reject non-Apps Script host', () => {
  assert.throws(()=>createFeedbackController({endpoint:'https://example.com/submit',version:'1.7.0'}));
});
