'use strict';
const fs = require('node:fs');
const path = require('node:path');
const MAX_DATA = 20 * 1024 * 1024;
function assertPayload(json) {
  if (typeof json !== 'string' || Buffer.byteLength(json, 'utf8') > MAX_DATA) throw new Error('데이터 크기 또는 형식이 올바르지 않습니다.');
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.events) || !Array.isArray(obj.notes)) {
    throw new Error('캘린더 저장 데이터가 올바르지 않습니다.');
  }
  return obj;
}
function readText(file, fallback = '') {
  try { return fs.readFileSync(file, 'utf8'); } catch (err) { if (err.code === 'ENOENT') return fallback; throw err; }
}
function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(temp, data, { encoding: 'utf8' });
    fs.renameSync(temp, file);
  } finally { try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {} }
}
function readJson(file, fallback) {
  const raw = readText(file);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}
function filenameStamp(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}
module.exports = { MAX_DATA, assertPayload, readText, atomicWrite, readJson, filenameStamp };
