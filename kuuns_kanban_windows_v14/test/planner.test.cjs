const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../renderer/planner.js');
test('week starts on Sunday, add handles month rollover',()=>{
  assert.equal(P.week('2026-10-22'),'2026-10-18');
  assert.equal(P.add('2026-10-31',2),'2026-11-02');
});
test('weekly recurrence makes four occurrences; end date spans across weekend',()=>{
  const ev={id:'a',title:'meet',start:'2026-10-23',end:'2026-10-27',recurrence:'weekly',recurrenceUntil:'2026-11-13'};
  const rows=P.expand([ev],'2026-10-20','2026-11-20');
  assert.equal(rows.length,4);
  assert.deepEqual(rows.map(x=>x.start),['2026-10-23','2026-10-30','2026-11-06','2026-11-13']);
  assert.equal(rows[1].end,'2026-11-03');
});
test('monthly recurrence clamps 31st day',()=>{
  const ev={id:'b',start:'2026-01-31',end:'2026-01-31',recurrence:'monthly',recurrenceUntil:'2026-04-30'};
  const rows=P.expand([ev],'2026-01-01','2026-05-02');
  assert.deepEqual(rows.map(x=>x.start),['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
});
test('nonrecurrence preserved and no duplicate outside range',()=>{
  const a={id:'a',start:'2026-10-03',end:'2026-10-08'};
  assert.equal(P.expand([a],'2026-10-05','2026-10-05')[0],a);
  assert.equal(P.expand([a],'2026-10-09','2026-10-12').length,0);
});
