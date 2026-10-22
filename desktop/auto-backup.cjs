'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { assertPayload, atomicWrite, readText } = require('./data.cjs');

// Preserve the earliest valid snapshot of each local day. A later faulty edit
// cannot rewrite the same day's first backup. Retain the newest 30 days.
function dayStamp(now = new Date()) {
  const pad = v => String(v).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
}
function snapshotDaily(sourceFile, backupFolder, now = new Date(), retain = 30) {
  const raw = readText(sourceFile, '');
  if (!raw) return { ok:false, reason:'empty' };
  assertPayload(raw);
  fs.mkdirSync(backupFolder, { recursive:true });
  const basename = `kuuns-auto-${dayStamp(now)}.json`;
  const destination = path.join(backupFolder, basename);
  let created = false;
  if (!fs.existsSync(destination)) {
    // The app holds a single-instance lock; atomicWrite prevents truncated snapshots.
    atomicWrite(destination, raw);
    created = true;
  }
  const files = fs.readdirSync(backupFolder)
    .filter(name => /^kuuns-auto-\d{4}-\d{2}-\d{2}\.json$/.test(name))
    .sort().reverse();
  // Never prune away the daily backup created/verified above.
  for (const name of files.slice(Math.max(1, retain))) fs.rmSync(path.join(backupFolder,name));
  return { ok:true, created, destination, retained:Math.min(files.length,Math.max(1,retain)) };
}
module.exports = { dayStamp, snapshotDaily };
