const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dueEvents } = require('../desktop/reminders.cjs');
test('알림 예정 시각부터 24시간 안에 한 번만 표시', () => {
  const now = new Date('2026-10-22T12:00:00').getTime();
  const calendar = { events: [
    { id: 'a', reminderAt: '2026-10-22T11:59', completed: false },
    { id: 'b', reminderAt: '2026-10-22T12:01', completed: false },
    { id: 'c', reminderAt: '2026-10-22T10:00', completed: true },
    { id: 'd', reminderAt: '2026-10-21T10:00', completed: false }
  ]};
  assert.deepEqual(dueEvents(calendar, {}, now).map(e => e.id), ['a']);
  assert.deepEqual(dueEvents(calendar, {a: '2026-10-22T11:59'}, now), []);
});
test('일정 알림 시각을 변경하면 다시 알림 대상이 될 수 있음', () => {
  const now = new Date('2026-10-22T12:00:00').getTime();
  assert.equal(dueEvents({ events: [{ id:'a', reminderAt:'2026-10-22T12:00' }] }, { a:'2026-10-22T11:00' }, now).length, 1);
});
test('잘못된 알림 날짜는 무시', () => {
  const now = new Date('2026-10-22T12:00:00').getTime();
  assert.equal(dueEvents({events:[{id:'x',reminderAt:'hello'}]}, {}, now).length, 0);
});
