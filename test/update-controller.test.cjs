'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {githubProvider,createUpdateController}=require('../desktop/update-controller.cjs');
class MockUpdater extends EventEmitter{
  constructor(){super();this.downloadCalls=0;this.installCalls=0;this.checkCalls=0;this.feed=null;}
  setFeedURL(feed){this.feed=feed;}
  async checkForUpdates(){this.checkCalls++;this.emit('checking-for-update');this.emit('update-available',{version:'1.6.1'});}
  async downloadUpdate(){this.downloadCalls++;this.emit('download-progress',{percent:42.7});this.emit('update-downloaded',{version:'1.6.1'});}
  quitAndInstall(){this.installCalls++;}
}
const app={getVersion:()=> '1.6.0',isPackaged:true};
const pkg={build:{publish:{provider:'github',owner:'test-owner',repo:'public-release'}}};
const noTimers=()=>0;
test('GitHub publishing configuration must be explicit, valid, and token-free',()=>{
  assert.deepEqual(githubProvider(pkg),{owner:'test-owner',repo:'public-release'});
  assert.equal(githubProvider({build:{publish:{provider:'github',owner:'YOUR_OWNER',repo:''}}}),null);
  assert.equal(githubProvider({build:{publish:{provider:'generic',url:'https://example.com'}}}),null);
  assert.equal(githubProvider({}),null);
});
test('No updater is started before repository is configured',async()=>{
  let called=false;
  const c=createUpdateController({app,pkg:{},updaterFactory:()=>{called=true;},platform:'win32',clock:noTimers,every:noTimers});
  assert.equal(c.start().phase,'disabled');assert.equal(called,false);
  assert.equal((await c.check()).phase,'disabled');
});
test('Installed Windows app checks automatically but awaits download and installation consent',async()=>{
  const updater=new MockUpdater();const statuses=[];let backup=false;
  const c=createUpdateController({app,pkg,updaterFactory:()=>updater,platform:'win32',clock:noTimers,every:noTimers,emit:s=>statuses.push(s),beforeInstall:async()=>{backup=true;}});
  assert.equal(c.start().phase,'idle');
  assert.equal(updater.autoDownload,false);
  assert.equal(updater.autoInstallOnAppQuit,false);
  await c.check(true);
  assert.equal(updater.checkCalls,1);
  assert.equal(c.current().phase,'available');
  assert.equal(updater.downloadCalls,0);
  await c.download();
  assert.equal(updater.downloadCalls,1);
  assert.equal(c.current().phase,'downloaded');
  assert.equal(c.current().percent,100);
  assert.equal(updater.installCalls,0);
  await c.install();
  assert.equal(updater.installCalls,1);assert.equal(backup,true);
  assert.equal(c.current().phase,'installing');
  assert(statuses.find(s=>s.phase==='downloading'&&s.percent===43));
});
test('Development build does not query update service',async()=>{
  const c=createUpdateController({app:{...app,isPackaged:false},pkg,platform:'win32',updaterFactory:()=>{throw Error('unreachable')}});
  assert.equal(c.start().phase,'disabled');
  assert.equal((await c.check()).phase,'disabled');
});
test('Bad repo name is rejected',()=>{
  assert.equal(githubProvider({build:{publish:{provider:'github',owner:'foo/bar',repo:'updates'}}}),null);
});

// Regression: electron-builder can omit build.publish from the packaged package.json.
test('Packaged Windows executable uses bundled GitHub repo config when build.publish is absent',async()=>{
  const cfg={provider:'github',owner:'kun-blip',repo:'kuns-kanban-calendar'};
  assert.deepEqual(githubProvider({version:'1.6.2'},cfg),{owner:'kun-blip',repo:'kuns-kanban-calendar'});
  const updater=new MockUpdater();
  const c=createUpdateController({app:{...app,getVersion:()=> '1.6.2'},pkg:{version:'1.6.2'},packagedConfig:cfg,platform:'win32',updaterFactory:()=>updater,clock:noTimers,every:noTimers});
  assert.equal(c.start().phase,'idle');
  assert.deepEqual(updater.feed,{provider:'github',owner:'kun-blip',repo:'kuns-kanban-calendar'});
  await c.check(true);
  assert.equal(c.current().phase,'available');
});
