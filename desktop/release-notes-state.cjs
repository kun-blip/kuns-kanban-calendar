'use strict';
// Durable version marker lives outside calendar-data.json; existing schedules
// and notes are never read or changed by the release-notes feature.
const semver = /^\d+\.\d+\.\d+$/;
function compareVersions(left, right) {
  if (!semver.test(left || '') || !semver.test(right || '')) return null;
  const a = left.split('.').map(Number), b = right.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
function shouldShowReleaseNotes({ currentVersion, previousVersion, existingUser = false,
  packaged = true, hasNotes = false } = {}) {
  if (!packaged || !semver.test(currentVersion || '') || !hasNotes) return false;
  if (typeof previousVersion === 'string' && previousVersion.length) {
    return compareVersions(currentVersion, previousVersion) === 1;
  }
  // Migration from v1.9.7 (or earlier): it has no release-notes marker,
  // so use the existing first-launch detection *before* creating user data.
  return Boolean(existingUser);
}
function currentNotes(catalog, version) {
  const entry = catalog && catalog[version];
  if (!entry || !Array.isArray(entry.items) || !entry.items.length) return null;
  return { version, heading: entry.heading || '', items: entry.items.map(({title,description})=>({title,description})) };
}
module.exports = { compareVersions, shouldShowReleaseNotes, currentNotes };
