'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, Notification, nativeImage, shell, powerMonitor, screen, session, clipboard } = require('electron');
const { assertPayload, readText, atomicWrite, readJson, filenameStamp } = require('./data.cjs');
const { dueEvents } = require('./reminders.cjs');
const { snapshotDaily, dayStamp } = require('./auto-backup.cjs');
const Planner = require('../renderer/planner.js');
const { centeredCalendarBounds } = require('./window-bounds.cjs');
const { createUpdateController } = require('./update-controller.cjs');
const { shouldAnnounceUpdate } = require('./update-notice.cjs');
const { createFeedbackController } = require('./feedback.cjs');
const { shouldShowWelcome } = require('./welcome-state.cjs');
const { safeExternalUrl } = require('./external-url.cjs');
const { createSharingClient, validateToken } = require('./sharing-client.cjs');
const sharingConfig = require('./sharing-config.json');
const feedbackConfig = require('./feedback-config.json');
const packageJson = require('../package.json');
const packagedReleaseConfig = require('./release-config.json');

const APP_ID = 'com.kuuns.kanban.calendar';
const APP_NAME = '쿤스 칸반 캘린더';
const ICON = path.join(__dirname, '..', 'assets', 'app.png');
const TRAY_ICON = process.platform === 'darwin'
  ? path.join(__dirname, '..', 'assets', 'tray-macTemplate.png') : ICON;
const HTML = path.join(__dirname, '..', 'renderer', 'index.html');
const TRUSTED_RENDERER_URL = pathToFileURL(HTML).href;
app.setName(APP_NAME);
if (process.platform === 'win32') app.setAppUserModelId(APP_ID);

let window = null;
let tray = null;
let quitting = false;
let saveQueue = Promise.resolve();
let reminderBusy = false;
let regularBounds = null;
let isWidget = false;
let timer = null;
let updateController = null;
const feedbackController = createFeedbackController({endpoint:feedbackConfig.endpoint,version:app.getVersion()});
let lastNotifiedUpdateVersion = '';
let dismissedUpdateVersionThisRun = '';
let welcomeEligible = false;
let queuedInviteCode = '';
let sharingClient = null;
function handleInviteUrl(raw) {
  try {
    const token = validateToken(raw);
    queuedInviteCode = token;
    focusWindow();
    if (window && !window.isDestroyed() && !window.webContents.isLoading()) {
      window.webContents.send('sharing:invite', token);
    }
  } catch { /* never accept arbitrary protocol payloads */ }
}

function showAvailableUpdateNotice(state) {
  if (!shouldAnnounceUpdate(state, dismissedUpdateVersionThisRun, lastNotifiedUpdateVersion)) return;
  // The in-app dialog is primary when the calendar is on screen.
  // Use a native OS notification only when it is running in the tray/background.
  if (window && !window.isDestroyed() && window.isVisible()) return;
  if (!Notification.isSupported()) return;
  try {
    const notice = new Notification({
      title: `${APP_NAME} 새 버전`,
      body: `v${state.newVersion} 업데이트가 있어요. 클릭하면 설치 안내를 볼 수 있습니다.`,
      icon: ICON
    });
    notice.on('click', openUpdatePanel);
    notice.show();
    lastNotifiedUpdateVersion = state.newVersion;
  } catch (err) { console.warn('Update notice:', err); }
}
function broadcastUpdate(state) {
  if(window && !window.isDestroyed()) window.webContents.send('update:state',state);
  showAvailableUpdateNotice(state);
  if(tray) updateTrayMenu();
}
function openUpdatePanel(){focusWindow();if(window && !window.isDestroyed())window.webContents.send('update:open');}
const userDir = () => app.getPath('userData');
const dataFile = () => path.join(userDir(), 'calendar-data.json');
const settingsFile = () => path.join(userDir(), 'settings.json');
const firedFile = () => path.join(userDir(), 'reminders-fired.json');
const welcomeFile = () => path.join(userDir(), 'welcome-complete.json');
function detectWelcomeEligibility() {
  // Capture before renderer initialization creates calendar-data.json.
  return shouldShowWelcome({
    hasMarker: fs.existsSync(welcomeFile()),
    hasCalendar: fs.existsSync(dataFile()),
    hasSettings: fs.existsSync(settingsFile()),
    hasReminders: fs.existsSync(firedFile()),
    hasBackups: fs.existsSync(path.join(userDir(), 'auto-backups'))
  });
}
function autoBackupFolder() {
  const configured=loadSettings().backupFolder;
  return configured && fs.existsSync(configured) && fs.statSync(configured).isDirectory()
    ? path.join(configured, 'Kuuns-Auto-Backups')
    : path.join(userDir(), 'auto-backups');
}
function backupSnapshot() {
  try {
    const folder=autoBackupFolder(), now=new Date();
    const dailyFile=path.join(folder, `kuuns-auto-${dayStamp(now)}.json`);
    if(fs.existsSync(dailyFile)) return { ok:true, created:false, destination:dailyFile };
    return snapshotDaily(dataFile(), folder, now, 30);
  }
  catch(err) { console.error('Daily snapshot failed:',err); return { ok:false, reason:err.message }; }
}

function focusWindow() {
  if (!window || window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
function loadSettings() {
  const v = readJson(settingsFile(), {});
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}
function writeSettings(v) { atomicWrite(settingsFile(), JSON.stringify(v, null, 2)); }
function readCalendar() {
  const raw = readText(dataFile(), '');
  if (!raw) return null;
  try { return assertPayload(raw); } catch { return null; }
}
function showNotification(title, body, eventId = '') {
  if (!Notification.isSupported()) return false;
  try {
    const notice = new Notification({ title, body, icon: ICON, silent: false });
    notice.on('click', () => {
      focusWindow();
      if (eventId && window && !window.isDestroyed()) window.webContents.send('reminder:click', eventId);
    });
    notice.show();
    return true;
  } catch (err) { console.error('System notification failed:', err); return false; }
}
async function checkReminders() {
  if (reminderBusy) return;
  reminderBusy = true;
  try {
    await saveQueue.catch(() => {});
    const calendar = readCalendar();
    const fired = readJson(firedFile(), {});
    if (!fired || typeof fired !== 'object' || Array.isArray(fired)) return;
    if (calendar && calendar.notificationsEnabled === false) return;
    const due = dueEvents(calendar, fired);
    let changed = false;
    for (const e of due) {
      const game = (calendar.games || []).find(g => g && g.id === e.gameId);
      const body = `${e.start} ~ ${e.end}${game ? ` · ${game.name}` : ''}`;
      if (showNotification(`📅 ${e.title}`, body, e.id)) {
        fired[e.id] = e.reminderAt;
        changed = true;
      }
    }
    if (changed) {
      // Bounded history; retain only existing events / current reminder time.
      const keys = new Set((calendar.events || []).map(e => e.id));
      for (const id of Object.keys(fired)) if (!keys.has(id)) delete fired[id];
      atomicWrite(firedFile(), JSON.stringify(fired, null, 2));
    }
  } catch (err) { console.error('Reminder check:', err); }
  finally { reminderBusy = false; }
}
function dayKey(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function todayEvents(){const data=readCalendar();if(!data||!Array.isArray(data.events))return [];
 const key=dayKey();return Planner.expand(data.events,key,key).filter(e=>e.status!=='done'&&!e.completed).slice(0,25);
}
function showTodayPanel(){focusWindow();if(window&&!window.isDestroyed()){window.webContents.send('tray:today');}}
function autostartState(){const saved=loadSettings();let enabled=!!saved.autostart;
 if(process.platform==='win32'&&app.isPackaged){try{enabled=!!app.getLoginItemSettings({path:process.execPath,args:['--hidden']}).openAtLogin;}catch{}}
 return enabled;
}
function setAutostart(enabled){if(process.platform!=='win32')return {enabled:false,unsupported:true};
 if(!app.isPackaged)return {enabled:false,development:true};
 app.setLoginItemSettings({openAtLogin:!!enabled,path:process.execPath,args:['--hidden']});
 const settings=loadSettings();settings.autostart=!!enabled;writeSettings(settings);updateTrayMenu();
 return {enabled:autostartState()};
}
function createWindow() {
  const normalBounds = centeredCalendarBounds(screen.getPrimaryDisplay().workArea);
  window = new BrowserWindow({
    title: APP_NAME, ...normalBounds,
    minWidth: Math.min(460, normalBounds.width), minHeight: Math.min(500, normalBounds.height),
    backgroundColor: '#f7f8fb', show: false, autoHideMenuBar: true,
    icon: ICON,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, spellcheck: false }
  });
  window.once('ready-to-show', () => {
    if (!window || window.isDestroyed()) return;
    // A fresh application launch always opens the normal calendar, filling the
    // monitor work area. Maximization follows Windows DPI and taskbar settings.
    window.maximize();
    if (!process.argv.includes('--hidden')) window.show();
  });
  // Re-emit the most recent result on every tray-to-window transition.
  // This covers checks that finished before a hidden window was opened.
  window.on('show', () => {
    if (updateController && !window.isDestroyed()) window.webContents.send('update:state', updateController.current());
  });
  window.webContents.on('before-input-event',(event,input)=>{
    if(input.type==='keyDown'&&(process.platform==='darwin'?input.meta:input.control)&&!input.alt&&!input.shift&&String(input.key).toLowerCase()==='n'){
      event.preventDefault();focusWindow();window.webContents.send('shortcut:newEvent');
    }
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    const safe = safeExternalUrl(url);
    if (safe) void shell.openExternal(safe).catch(() => {});
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== TRUSTED_RENDERER_URL) {
      event.preventDefault();
      const safe = safeExternalUrl(url);
      if (safe) void shell.openExternal(safe).catch(() => {});
    }
  });
  window.on('close', event => {
    if (!quitting && tray) { event.preventDefault(); window.hide(); }
  });
  window.webContents.on('did-finish-load', () => {
    if (queuedInviteCode) window.webContents.send('sharing:invite', queuedInviteCode);
  });
  window.loadFile(HTML);
}
function updateTrayMenu() {
  if (!tray) return;
  const today=todayEvents();
  const todayList=today.slice(0,10).map(e=>({label:(e.title||'제목 없는 일정').slice(0,70),click:showTodayPanel}));
  const entries=[
    {label:'캘린더 열기',click:focusWindow},
    {label:`오늘 할 일 확인 (${today.length}${today.length===25?'+':''})`,click:showTodayPanel},
    {label:'오늘의 일정',submenu:todayList.length?todayList:[{label:'예정된 작업이 없습니다.',enabled:false}]},
    {type:'separator'},
    {label:'자동 백업 폴더 열기',click:()=>{const folder=autoBackupFolder();fs.mkdirSync(folder,{recursive:true});shell.openPath(folder);}},
    {label:'업데이트 확인',click:()=>{openUpdatePanel();void updateController?.check(true);}},
    {type:'separator'},
    ...(process.platform === 'win32' ? [{label:'Windows 시작할 때 자동 실행',type:'checkbox',checked:autostartState(),click:item=>{try{setAutostart(item.checked);}catch(err){console.error('Autostart failed:',err);updateTrayMenu();}}}] : []),
    {type:'separator'},
    {label:'완전히 종료',click:()=>{quitting=true;app.quit();}}
  ];
  tray.setContextMenu(Menu.buildFromTemplate(entries));
}
function createTray() {
  try {
    tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
    tray.setToolTip(`${APP_NAME} · 일정 알림 실행 중`);
    tray.on('double-click', focusWindow);
    tray.on('click', focusWindow);
    updateTrayMenu();
  } catch (err) { console.warn('Unable to create tray:', err); }
}
// IPC is accessible only from the main frame of the bundled calendar page.
function isTrustedIpcSender(event) {
  return !!window && !window.isDestroyed() && event.sender === window.webContents
    && event.senderFrame === window.webContents.mainFrame
    && event.senderFrame?.url === TRUSTED_RENDERER_URL;
}
function secureHandle(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    if (!isTrustedIpcSender(event)) throw new Error('Untrusted IPC sender');
    return handler(event, ...args);
  });
}
function registerIpc() {
  const shareHandle = (channel, fn) => secureHandle('sharing:'+channel, async (_event, ...args) => {
    if (!sharingClient) throw new Error('일정 공유 서비스를 준비하지 못했습니다.');
    return fn(...args);
  });
  shareHandle('status',()=>sharingClient.publicStatus());
  shareHandle('requestOtp',email=>sharingClient.requestOtp(email));
  shareHandle('verifyOtp',(email,code)=>sharingClient.verifyOtp(email,code));
  shareHandle('signOut',()=>sharingClient.signOut());
  shareHandle('list',()=>sharingClient.list());
  shareHandle('publish',(event,revision)=>sharingClient.publish(event,revision));
  shareHandle('invite',id=>sharingClient.invite(id));
  shareHandle('accept',code=>sharingClient.accept(code));
  shareHandle('revoke',id=>sharingClient.revoke(id));
  shareHandle('leave',id=>sharingClient.leave(id));
  shareHandle('unshare',id=>sharingClient.unshare(id));
  shareHandle('contactsList',()=>sharingClient.contactsList());
  shareHandle('contactAdd',(name,email)=>sharingClient.contactAdd(name,email));
  shareHandle('contactUpdate',(id,name,email)=>sharingClient.contactUpdate(id,name,email));
  shareHandle('contactRemove',id=>sharingClient.contactRemove(id));
  shareHandle('inviteContacts',(id,items)=>sharingClient.inviteContacts(id,items));
  shareHandle('inbox',()=>sharingClient.inbox());
  shareHandle('respond',(id,yes)=>sharingClient.respond(id,yes));
  shareHandle('myRoles',()=>sharingClient.myRoles());
  shareHandle('members',id=>sharingClient.members(id));
  shareHandle('role',(eventId,userId,role)=>sharingClient.role(eventId,userId,role));
  shareHandle('editShared',(id,revision,patch)=>sharingClient.editShared(id,revision,patch));
  shareHandle('sentInvites',id=>sharingClient.sentInvites(id));
  shareHandle('cancelInvite',id=>sharingClient.cancelInvite(id));
  shareHandle('removeMember',(eventId,userId)=>sharingClient.removeMember(eventId,userId));
  shareHandle('history',id=>sharingClient.history(id));
  secureHandle('sharing:pendingInvite',()=>queuedInviteCode);
  secureHandle('sharing:consumeInvite',()=>{queuedInviteCode='';return {ok:true};});
  secureHandle('sharing:copyInvite',(_evt,code)=>{
    const token=validateToken(code);
    clipboard.writeText(`쿤스 칸반 캘린더 일정 초대\n앱에서 '일정 공유 → 초대 수락'을 열어 아래 링크/코드를 입력해 주세요.\nkuuns-kanban://invite/${token}\n초대 코드: ${token}\n유효 기간: 7일 · 1회 사용`);
    return {ok:true};
  });
  secureHandle('welcome:getState', () => ({ shouldShow: welcomeEligible }));
  secureHandle('welcome:complete', () => {
    if (!welcomeEligible) return { ok: true };
    try {
      atomicWrite(welcomeFile(), JSON.stringify({ completed: true, at: new Date().toISOString() }));
      welcomeEligible = false;
      return { ok: true };
    } catch (err) {
      console.error('Could not save welcome completion:', err);
      return { ok: false, message: '첫 실행 안내 상태를 저장할 수 없습니다.' };
    }
  });
  secureHandle('update:getState',()=>updateController?.current()||{phase:'disabled',version:app.getVersion(),message:'업데이트 준비 중'});
  secureHandle('update:check',()=>updateController?.check(true));
  secureHandle('update:download',()=>updateController?.download());
  secureHandle('update:install',()=>updateController?.install());
  // 'Later' lasts for the current app session only, not permanently across launches.
  secureHandle('update:getNoticePreference',()=>({dismissedVersion:dismissedUpdateVersionThisRun}));
  secureHandle('update:dismissNotice',(_event,version)=>{
    const state=updateController?.current();
    if(typeof version!=='string'||!state||state.newVersion!==version)return {ok:false};
    dismissedUpdateVersionThisRun=version;
    return {ok:true,dismissedVersion:version};
  });
  secureHandle('feedback:submit',(_event,input)=>feedbackController.submit(input));
  secureHandle('settings:getAutostart',()=>({enabled:autostartState(),packaged:app.isPackaged, supported:process.platform==='win32'}));
  secureHandle('settings:setAutostart',(_event,enabled)=>setAutostart(!!enabled));
  ipcMain.on('calendar:read', event => {
    if (!isTrustedIpcSender(event)) { event.returnValue = ''; return; }
    try { event.returnValue = readText(dataFile(), ''); }
    catch { event.returnValue = ''; }
  });
  secureHandle('calendar:save', async (_event, json) => {
    assertPayload(json);
    // Serialize writes and use atomic rename to prevent a truncated data file.
    saveQueue = saveQueue.catch(() => {}).then(() => {
      // Snapshot before edit, so the first saved state of each day remains recoverable.
      backupSnapshot();
      atomicWrite(dataFile(), json);
      backupSnapshot();
      updateTrayMenu();
    });
    await saveQueue;
    void checkReminders();
    return { ok: true, path: dataFile() };
  });
  // Read-only, strictly whitelisted access to daily snapshots.
  secureHandle('backup:listAuto', async () => {
    await saveQueue.catch(() => {});
    const folder = autoBackupFolder();
    if (!fs.existsSync(folder)) return [];
    return fs.readdirSync(folder)
      .filter(name => /^kuuns-auto-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort().reverse().slice(0, 30)
      .map(name => { const info=fs.statSync(path.join(folder,name));
        return {name,date:name.slice(11,21),sizeKB:Math.max(1,Math.round(info.size/1024))};
      });
  });
  secureHandle('backup:previewAuto', async (_event,name) => {
    if(typeof name!=='string'||!/^kuuns-auto-\d{4}-\d{2}-\d{2}\.json$/.test(name))throw new Error('Invalid backup filename');
    const file=path.join(autoBackupFolder(),name);
    const info=fs.statSync(file);
    if(!info.isFile()||info.size>10*1024*1024)throw new Error('Invalid backup size');
    const json=readText(file,'');assertPayload(json);
    return {name,json};
  });
  secureHandle('backup:preRestore', async () => {
    await saveQueue.catch(() => {});
    const raw=readText(dataFile(),'');if(!raw)return {ok:false};
    assertPayload(raw);
    const folder=autoBackupFolder();fs.mkdirSync(folder,{recursive:true});
    const dest=path.join(folder,`kuuns-before-restore-${filenameStamp()}-${Date.now()}.json`);
    atomicWrite(dest,raw);return {ok:true,path:dest};
  });
  secureHandle('backup:autoStatus', () => ({ folder:autoBackupFolder(), retain:30 }));
  secureHandle('backup:openAutoFolder', async () => {
    const folder=autoBackupFolder();fs.mkdirSync(folder,{recursive:true});
    const error=await shell.openPath(folder);
    return { ok:!error, folder, error };
  });
  secureHandle('backup:getFolder', () => {
    return { path: loadSettings().backupFolder || '' };
  });
  secureHandle('backup:chooseFolder', async () => {
    const result = await dialog.showOpenDialog(window, {
      title: '백업 폴더 지정', defaultPath: loadSettings().backupFolder || app.getPath('documents'),
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const folder = result.filePaths[0];
    const settings = loadSettings(); settings.backupFolder = folder; writeSettings(settings);
    updateTrayMenu();
    return { path: folder };
  });
  secureHandle('backup:save', async (_event, json) => {
    assertPayload(json);
    const name = `쿤스_칸반_캘린더_백업_${filenameStamp()}.json`;
    let folder = loadSettings().backupFolder;
    let target = '';
    if (folder && fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
      target = path.join(folder, name);
    } else {
      const choice = await dialog.showSaveDialog(window, {
        title: '캘린더 JSON 백업 저장', defaultPath: path.join(app.getPath('documents'), name),
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (choice.canceled || !choice.filePath) return { canceled: true };
      target = choice.filePath;
    }
    // Never overwrite an earlier backup with the same timestamp.
    if (fs.existsSync(target)) target = path.join(path.dirname(target), `${path.parse(target).name}_${Date.now()}${path.extname(target)}`);
    atomicWrite(target, json);
    return { path: target };
  });
  secureHandle('window:widgetMode', (_event, enabled) => {
    if (!window || window.isDestroyed()) return {ok:false};
    const requested=!!enabled;
    if (requested===isWidget)return {ok:true,widgetMode:isWidget};
    if (requested){
      regularBounds=window.getBounds();
      // Store the active display before unmaximizing: getBounds() changes on
      // Windows when a maximized window returns to its restored size.
      const area=screen.getDisplayMatching(regularBounds).workArea;
      if (window.isMaximized()) window.unmaximize();
      // Keep the familiar widget dimensions (580 x at most 1120 logical px).
      const width=Math.min(580,Math.max(320,area.width-32));
      const height=Math.min(1120,Math.max(380,area.height-32));
      window.setMinimumSize(Math.min(460,width),Math.min(680,height));
      const x=Math.max(area.x,Math.min(regularBounds.x,area.x+area.width-width));
      const y=Math.max(area.y,Math.min(regularBounds.y,area.y+area.height-height));
      window.setBounds({x,y,width,height},false);
      window.setAlwaysOnTop(true,'floating');
      isWidget=true;
    } else {
      window.setAlwaysOnTop(false);
      if (window.isFullScreen()) window.setFullScreen(false);
      if (window.isMaximized()) window.unmaximize();
      // Restore the full calendar on the monitor currently hosting the widget.
      // The reference bounds provide an appropriate unmaximized fallback, and
      // maximize() makes the actual initial size match the Windows work area.
      const area=screen.getDisplayMatching(window.getBounds()).workArea;
      const bounds=centeredCalendarBounds(area);
      window.setMinimumSize(Math.min(460,bounds.width),Math.min(500,bounds.height));
      window.setBounds(bounds,false);
      window.maximize();
      regularBounds=bounds;
      isWidget=false;
    }
    return {ok:true,widgetMode:isWidget};
  });
  secureHandle('notification:test', () => {
    const ok = showNotification(APP_NAME, '시스템 알림 테스트입니다. 일정 알림도 이 방식으로 표시됩니다.');
    return { ok };
  });
}
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', (_event, commandLine) => {
    const link=commandLine.find(x=>/^kuuns-kanban:\/\/invite\//i.test(x));
    if(link)handleInviteUrl(link);
    focusWindow();
    // A second desktop launch should open the normal calendar, not silently
    // return to a widget that was left in the background.
    if (isWidget && window && !window.isDestroyed()) {
      window.webContents.send('window:openNormalCalendar');
    } else if (window && !window.isDestroyed()) {
      window.maximize();
    }
  });
  app.on('open-url', (event, url) => { event.preventDefault(); if (/^kuuns-kanban:\/\/invite\//i.test(url)) handleInviteUrl(url); });
  app.whenReady().then(() => {
    if(app.isPackaged) {
      try {app.setAsDefaultProtocolClient('kuuns-kanban');} catch(err) {console.warn('Deep link association unavailable',err);}
    }
    const startingLink=process.argv.find(x=>/^kuuns-kanban:\/\/invite\//i.test(x));
    if(startingLink)handleInviteUrl(startingLink);
    sharingClient=createSharingClient({url:sharingConfig.url,publishableKey:sharingConfig.publishableKey,
      sessionPath:path.join(app.getPath('userData'),'sharing-auth.json')});
    // This local-only app uses native OS notifications; its web page needs no browser permissions.
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    welcomeEligible = detectWelcomeEligibility();
    registerIpc(); createWindow(); createTray();
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(Menu.buildFromTemplate([
        { label: APP_NAME, submenu: [
          { role: 'about' }, { type: 'separator' },
          { label: '캘린더 열기', click: focusWindow },
          { label: '오늘의 일정', click: showTodayPanel },
          { type: 'separator' }, { role: 'hide' }, { role: 'quit' }
        ] },
        { role: 'editMenu' },
        { role: 'windowMenu' }
      ]));
    }
    updateController=createUpdateController({
      app,pkg:packageJson,packagedConfig:packagedReleaseConfig,updaterFactory:()=>require('electron-updater').autoUpdater,
      emit:broadcastUpdate,
      beforeInstall:async()=>{await saveQueue.catch(()=>{});backupSnapshot();quitting=true;}
    });
    updateController.start();
    backupSnapshot();
    timer = setInterval(() => { backupSnapshot(); void checkReminders(); }, 20_000);
    powerMonitor.on('resume', () => { void checkReminders(); void updateController?.check(false); });
    void checkReminders();
    app.on('activate', focusWindow);
  });
  app.on('before-quit', () => { quitting = true; if (timer) clearInterval(timer);updateController?.stop(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !tray) app.quit(); });
}
