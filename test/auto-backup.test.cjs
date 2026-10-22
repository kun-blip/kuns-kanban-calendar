'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { snapshotDaily } = require('../desktop/auto-backup.cjs');
const { atomicWrite } = require('../desktop/data.cjs');
const json = n => JSON.stringify({ version:5, events:[{title:'T'+n}], notes:[] });
test('automatic snapshot preserves the first state saved on a day', () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kuuns-snap-'));
 try {
  const file=path.join(root,'data.json'), dir=path.join(root,'snapshots');
  atomicWrite(file,json(1));
  const date=new Date(2026,9,22);
  assert.equal(snapshotDaily(file,dir,date).created,true);
  atomicWrite(file,json(2));
  assert.equal(snapshotDaily(file,dir,date).created,false);
  assert.equal(fs.readFileSync(path.join(dir,'kuuns-auto-2026-10-22.json'),'utf8'),json(1));
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('automatic snapshot keeps latest 30 valid daily files', () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kuuns-snap-'));
 try {
  const file=path.join(root,'data.json'), dir=path.join(root,'backups');
  for(let i=0;i<34;i++) {
   atomicWrite(file,json(i));
   snapshotDaily(file,dir,new Date(2026,8,1+i),30);
  }
  const files=fs.readdirSync(dir);
  assert.equal(files.length,30);
  assert.equal(files.some(f=>f.endsWith('2026-09-01.json')),false);
  assert.equal(files.some(f=>f.endsWith('2026-10-04.json')),true);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('bad or empty data must not create daily snapshot', () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kuuns-snap-'));
 try {
  const file=path.join(root,'data.json');atomicWrite(file,'{}');
  assert.throws(()=>snapshotDaily(file,path.join(root,'b')));
 } finally{fs.rmSync(root,{recursive:true,force:true});}
});
