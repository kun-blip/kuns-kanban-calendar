'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const fs=require('node:fs');
const path=require('node:path');
const {compareVersions,createUpdateController}=require('../desktop/update-controller.cjs');

class LatestReleaseUpdater extends EventEmitter{
  constructor(latest='1.9.17') {super();this.latest=latest;this.checked=0;this.downloads=[];this.installs=0;this.failCheck=false;}
  setFeedURL(feed){this.feed=feed;}
  async checkForUpdates(){
    this.checked++;
    this.emit('checking-for-update');
    if(this.failCheck)throw Error('offline');
    this.emit('update-available',{version:this.latest});
  }
  async downloadUpdate(){this.downloads.push(this.latest);this.emit('update-downloaded',{version:this.latest});}
  quitAndInstall(){this.installs++;}
}
function controller(updater){
  const c=createUpdateController({
    app:{isPackaged:true,getVersion:()=> '1.9.15'},
    pkg:{build:{publish:{provider:'github',owner:'test-owner',repo:'test-repo'}}},
    updaterFactory:()=>updater,platform:'win32',clock:()=>0,every:()=>0,logger:{warn(){}}
  });
  c.start();return c;
}
test('new update check chooses the latest release directly, skipping intermediate versions',async()=>{
  const updater=new LatestReleaseUpdater('1.9.17');
  const c=controller(updater);
  await c.check();
  assert.equal(c.current().newVersion,'1.9.17');
  await c.download();
  assert.deepEqual(updater.downloads,['1.9.17']);
  await c.install();
  assert.equal(updater.installs,1);
});
test('a previously downloaded older installer never prevents detecting a newer release',async()=>{
  const updater=new LatestReleaseUpdater('1.9.16');
  const c=controller(updater);
  await c.check();await c.download();
  assert.equal(c.current().phase,'downloaded');
  updater.latest='1.9.17';
  await c.check();
  assert.equal(c.current().phase,'available');
  assert.equal(c.current().newVersion,'1.9.17');
  await c.download();
  assert.deepEqual(updater.downloads,['1.9.16','1.9.17']);
  assert.equal(c.current().phase,'downloaded');
  await c.install();
  assert.equal(updater.installs,1);
});
test('install action rechecks latest and blocks installing a superseded downloaded version',async()=>{
  const updater=new LatestReleaseUpdater('1.9.16');
  const c=controller(updater);
  await c.check();await c.download();
  updater.latest='1.9.17';
  await c.install();
  assert.equal(updater.installs,0);
  assert.equal(c.current().phase,'available');
  assert.equal(c.current().newVersion,'1.9.17');
  await c.download();await c.install();
  assert.equal(updater.installs,1);
  assert.deepEqual(updater.downloads,['1.9.16','1.9.17']);
});
test('when latest remains the downloaded version, install proceeds after rechecking',async()=>{
  const updater=new LatestReleaseUpdater('1.9.16');
  const c=controller(updater);
  await c.check();await c.download();await c.check();
  assert.equal(c.current().phase,'downloaded');
  await c.install();
  assert.equal(updater.installs,1);
});
test('offline recheck blocks stale install rather than silently installing an old version',async()=>{
  const updater=new LatestReleaseUpdater('1.9.16');
  const c=controller(updater);
  await c.check();await c.download();
  updater.failCheck=true;
  await c.install();
  assert.equal(updater.installs,0);
  assert.equal(c.current().phase,'error');
});
test('semantic version checks are numeric, including double digit patch and minor updates',()=>{
  assert.equal(compareVersions('1.9.17','1.9.9'),1);
  assert.equal(compareVersions('1.10.0','1.9.99'),1);
  assert.equal(compareVersions('1.9.17','1.9.17'),0);
  assert.equal(compareVersions('1.9.16','1.9.17'),-1);
});
test('calendar timeline and widget do not show owner; share details still show owner',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
  const sharing=fs.readFileSync(path.join(__dirname,'../renderer/sharing.js'),'utf8');
  const meta=fs.readFileSync(path.join(__dirname,'../renderer/shared-event-meta.js'),'utf8');
  assert.doesNotMatch(app,/sharedOwnerLabel|sharedOwnerEmail|event-shared-owner|공유한 사람:/);
  assert.match(sharing,/hint\(section,'공유한 사람: '\+ownerDisplay\(r\)\)/);
  assert.match(meta,/ownerEmail/);
});
