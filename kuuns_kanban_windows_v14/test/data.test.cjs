const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { assertPayload, atomicWrite, readText, readJson, filenameStamp } = require('../desktop/data.cjs');
test('캘린더 데이터 검사 및 JSON 보호', () => {
  assert.equal(assertPayload(JSON.stringify({ events:[], notes:[], games:[] })).events.length,0);
  assert.throws(() => assertPayload('{"events":[],"notes":{}}'));
  assert.throws(() => assertPayload('abc'));
});
test('PC 앱 저장: 원자적 쓰기와 재로드', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kuuns-test-'));
  try {
    const file=path.join(dir,'app','calendar-data.json');
    atomicWrite(file, '{"events":[],"notes":[]}');
    assert.deepEqual(readJson(file,null), {events:[],notes:[]});
    atomicWrite(file, '{"events":[{"id":"b"}],"notes":[]}');
    assert.ok(readText(file).includes('"b"'));
    assert.deepEqual(fs.readdirSync(path.dirname(file)), ['calendar-data.json']);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('백업 이름에 파일 경로로 안전한 타임스탬프', () => {
  assert.match(filenameStamp(new Date(2026,9,22,10,5,2)),/^2026-10-22_10-05-02$/);
});
