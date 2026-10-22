'use strict';
// The time in the HTML UI is intentionally interpreted in the local Windows timezone.
const DAY_MS = 86400000;
function dueEvents(calendar, fired = {}, now = Date.now()) {
  if (!calendar || !Array.isArray(calendar.events)) return [];
  return calendar.events.filter(e => {
    if (!e || !e.id || !e.reminderAt || e.completed || fired[e.id] === e.reminderAt) return false;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e.reminderAt)) return false;
    const timestamp = new Date(e.reminderAt).getTime();
    const overdue = now - timestamp;
    return Number.isFinite(timestamp) && overdue >= 0 && overdue <= DAY_MS;
  });
}
module.exports = { dueEvents };
