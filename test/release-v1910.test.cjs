'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const pkg=require('../package.json');
const lock=require('../package-lock.json');
const notes=require('../desktop/release-notes.json');
const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'renderer/update-center.js'),'utf8');
const sharing=fs.readFileSync(path.join(root,'renderer/sharing.js'),'utf8');
const {createUpdateController}=require('../desktop/update-controller.cjs');
const noop=()=>0;
const pkgConfig={build:{publish:{provider:'github',owner:'kun-blip',repo:'kuns-kanban-calendar'}}};
const app={isPackaged:true,getVersion:()=> '1.9.9'};
const asset=(version)=>({name:`KuunsKanbanCalendar-${version}-mac-universal.dmg`,browser_download_url:`https://github.com/kun-blip/kuns-kanban-calendar/releases/download/v${version}/KuunsKanbanCalendar-${version}-mac-universal.dmg`});
const macController=({tag='v1.9.10',assets=[asset('1.9.10')],openExternal=async()=>{}}={})=>createUpdateController({app,pkg:pkgConfig,platform:'darwin',clock:noop,every:noop,
  fetchImpl:async(url)=>{assert.match(url,/api\.github\.com\/repos\/kun-blip\/kuns-kanban-calendar\/releases\/latest/);return {ok:true,json:async()=>({tag_name:tag,assets})};},openExternal});

test('v1.9.10 version and release notes exactly preserve first two v1.9.9 entries',()=>{
 assert.equal(pkg.version,'1.9.10');assert.equal(lock.version,'1.9.10');assert.equal(lock.packages[''].version,'1.9.10');
 assert.deepEqual(notes['1.9.10'].items.slice(0,2),notes['1.9.9'].items.slice(0,2));
 assert.equal(notes['1.9.10'].items.length,3);
 assert.match(notes['1.9.10'].items[2].title,/Mac/);
 assert.match(notes['1.9.10'].items[2].description,/보류/);
 assert.match(notes['1.9.10'].items[2].description,/알림/);
});
test('Blue dots are restricted to update and invitation buttons',()=>{
 assert.match(html,/#sharingLaunch\.needs-attention::after,#updateLaunch\.needs-attention::after/);
 assert.match(html,/background:#3b82f6/);
 assert.doesNotMatch(html,/#feedbackLaunch\.needs-attention/);
 assert.match(ui,/launch\.classList\.toggle\('needs-attention', available\)/);
 assert.match(sharing,/launch\.classList\.toggle\('needs-attention',count>0\)/);
 assert.match(sharing,/const count=session\.signedIn\?inbox\.length:0/);
 assert.match(sharing,/syncInviteBlueDot\(\);\s*renderRemote\(\)/);
 assert.match(sharing,/session=await bridge\.sharingSignOut\(\);rows=\[\];inbox=\[\];contacts=\[\];syncInviteBlueDot\(\)/);
});
test('Mac startup checks availability but never starts the Windows auto installer',async()=>{
 const c=macController();assert.equal(c.start().phase,'idle');
 const result=await c.check();assert.equal(result.phase,'available');assert.equal(result.newVersion,'1.9.10');
 assert.match(result.message,/DMG/);
});
test('Mac downloaded file link is an expected same-repository GitHub release asset',async()=>{
 const opened=[];const c=macController({openExternal:async url=>opened.push(url)});c.start();await c.check();await c.download();
 assert.deepEqual(opened,[asset('1.9.10').browser_download_url]);
 assert.equal(c.current().phase,'available'); // Opening a link does not auto install anything.
});
test('Missing Mac DMG still offers release page but does not pretend to install',async()=>{
 const opened=[];const c=macController({assets:[],openExternal:async u=>opened.push(u)});c.start();
 const result=await c.check();assert.equal(result.phase,'available');assert.match(result.message,/DMG가 아직/);
 await c.download();assert.deepEqual(opened,['https://github.com/kun-blip/kuns-kanban-calendar/releases/latest']);
});
test('No Mac alert when current version is not older than GitHub release',async()=>{
 const c=macController({tag:'v1.9.9'});c.start();assert.equal((await c.check()).phase,'current');
});
