'use strict';
function shouldAnnounceUpdate(state, dismissedVersion, announcedVersion) {
  return Boolean(state && state.phase === 'available' &&
    typeof state.newVersion === 'string' && state.newVersion &&
    state.newVersion !== dismissedVersion && state.newVersion !== announcedVersion);
}
module.exports = { shouldAnnounceUpdate };
