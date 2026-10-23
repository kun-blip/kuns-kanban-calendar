'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kuunsDesktop', Object.freeze({
  getUpdateState:()=>ipcRenderer.invoke('update:getState'),
  checkUpdate:()=>ipcRenderer.invoke('update:check'),
  downloadUpdate:()=>ipcRenderer.invoke('update:download'),
  installUpdate:()=>ipcRenderer.invoke('update:install'),
  getUpdateNoticePreference:()=>ipcRenderer.invoke('update:getNoticePreference'),
  dismissUpdateNotice:version=>ipcRenderer.invoke('update:dismissNotice',version),
  sendFeedback:form=>ipcRenderer.invoke('feedback:submit',form),
  getWelcomeState:()=>ipcRenderer.invoke('welcome:getState'),
  completeWelcome:()=>ipcRenderer.invoke('welcome:complete'),
  onUpdateState:handler=>{if(typeof handler==='function')ipcRenderer.on('update:state',(_evt,data)=>handler(data));},
  onOpenUpdate:handler=>{if(typeof handler==='function')ipcRenderer.on('update:open',()=>handler());},
  getAutostart:()=>ipcRenderer.invoke('settings:getAutostart'),
  setAutostart:enabled=>ipcRenderer.invoke('settings:setAutostart',!!enabled),
  onTrayToday:handler=>{if(typeof handler==='function')ipcRenderer.on('tray:today',()=>handler());},
  onNewEventShortcut:handler=>{if(typeof handler==='function')ipcRenderer.on('shortcut:newEvent',()=>handler());},
  onOpenNormalCalendar:handler=>{if(typeof handler==='function')ipcRenderer.on('window:openNormalCalendar',()=>handler());},
  readData: () => ipcRenderer.sendSync('calendar:read'),
  saveData: json => ipcRenderer.invoke('calendar:save', json),
  getBackupFolder: () => ipcRenderer.invoke('backup:getFolder'),
  getAutoBackupStatus: () => ipcRenderer.invoke('backup:autoStatus'),
  listAutoBackups: () => ipcRenderer.invoke('backup:listAuto'),
  previewAutoBackup: name => ipcRenderer.invoke('backup:previewAuto', name),
  savePreRestore: () => ipcRenderer.invoke('backup:preRestore'),
  openAutoBackupFolder: () => ipcRenderer.invoke('backup:openAutoFolder'),
  chooseBackupFolder: () => ipcRenderer.invoke('backup:chooseFolder'),
  saveBackup: json => ipcRenderer.invoke('backup:save', json),
  testNotification: () => ipcRenderer.invoke('notification:test'),
  setWidgetMode: enabled => ipcRenderer.invoke('window:widgetMode', !!enabled),
  onReminderClick: handler => {
    if (typeof handler !== 'function') return;
    ipcRenderer.on('reminder:click', (_event, eventId) => {
      if (typeof eventId === 'string') handler(eventId);
    });
  }
}));
