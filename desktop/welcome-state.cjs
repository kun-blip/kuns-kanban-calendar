'use strict';
// Only truly new installations should see the automatic introduction.
// Existing user data must continue to be recognized after app upgrades.
function shouldShowWelcome({ hasMarker = false, hasCalendar = false, hasSettings = false, hasReminders = false, hasBackups = false } = {}) {
  return !hasMarker && !hasCalendar && !hasSettings && !hasReminders && !hasBackups;
}
module.exports = { shouldShowWelcome };
