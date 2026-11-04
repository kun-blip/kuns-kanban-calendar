'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const notes=require('../desktop/release-notes.json');
test('v1.9.19 historical release notes remain available after rollback',()=>{
  assert.deepEqual(notes['1.9.19'],{
    heading:'팀 공용 스티커 및 일정 리액션',
    items:[
      {title:'팀 공용 스티커 라이브러리 추가',description:'동료들이 직접 스티커를 업로드하고 함께 사용할 수 있어요.'},
      {title:'캘린더 스티커 기능 추가',description:'원하는 날짜에 스티커를 붙여 동료들과 공유할 수 있어요.'},
      {title:'일정 리액션 기능 추가',description:'공유 일정에 스티커로 반응하고 서로의 리액션을 확인할 수 있어요.'}
    ]
  });
});
