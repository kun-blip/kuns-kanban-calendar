'use strict';
/* Account-scoped local calendar storage. No existing file is deleted during migration.
 * The legacy unscoped file is never used as an active calendar automatically. */
const path=require('node:path');
const fs=require('node:fs');
const {readText,atomicWrite,assertPayload,filenameStamp}=require('./data.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function scopeId(status){
  return status?.signedIn && UUID.test(String(status.userId||'')) ? String(status.userId).toLowerCase() : 'guest';
}
function createAccountProfiles({userDir,status}){
  const scope=()=>scopeId(status());
  const profileRoot=()=>path.join(userDir(),'account-profiles');
  const profileDir=(id=scope())=>{
    if(id!=='guest'&&!UUID.test(String(id)))throw new Error('Invalid calendar account identity');
    return path.join(profileRoot(),String(id).toLowerCase());
  };
  const dataPath=(id=scope())=>path.join(profileDir(id),'calendar-data.json');
  const reminderPath=(id=scope())=>path.join(profileDir(id),'reminders-fired.json');
  const legacyPath=()=>path.join(userDir(),'calendar-data.json');
  const guestLegacyPath=()=>dataPath('guest');
  function migrationSource(){
    // Prefer the unscoped pre-upgrade file. Keep both copies untouched.
    for(const candidate of [legacyPath(),guestLegacyPath()]){
      try{const parsed=assertPayload(readText(candidate,''));if(parsed&&hasContent(parsed))return candidate;}catch{}
    }
    return null;
  }
  function read(id=scope()){
    // Logged-out windows must never display an old guest cache. Preserve the
    // disk file for explicit migration but do not make it an active profile.
    if(id==='guest')return '';
    const raw=readText(dataPath(id),'');
    if(!raw)return '';
    assertPayload(raw);
    return raw;
  }
  function write(id,json){
    if(id==='guest')throw new Error('로그인해야 개인 일정을 저장할 수 있어요.');
    if(id!==scope())throw new Error('계정이 변경되어 이전 화면의 저장을 취소했어요.');
    assertPayload(json);atomicWrite(dataPath(id),json);
    return dataPath(id);
  }
  function hasContent(value){
    return (Array.isArray(value?.events)&&value.events.length>0)
      || (Array.isArray(value?.notes)&&value.notes.length>0)
      || (Array.isArray(value?.todos)&&value.todos.length>0)
      || (Array.isArray(value?.tagLibrary)&&value.tagLibrary.length>0)
      || (Array.isArray(value?.games)&&value.games.length>1)
      || (Array.isArray(value?.shortcuts)&&value.shortcuts.some(Boolean));
  }
  function legacyStatus(){
    const source=migrationSource();
    if(!source)return {available:false,canImport:false,reason:'no-legacy'};
    let legacy=null;
    try{legacy=assertPayload(readText(source,''));}catch{}
    if(!legacy)return {available:false,canImport:false,reason:'no-legacy'};
    const id=scope();
    if(id==='guest')return {available:true,canImport:false,reason:'login-required'};
    if(legacy.cloudAccount?.userId && legacy.cloudAccount.userId!==id){
      return {available:true,canImport:false,reason:'different-owner'};
    }
    let active=null;
    try{active=assertPayload(read(id));}catch{}
    if(active&&hasContent(active))return {available:true,canImport:false,reason:'profile-not-empty'};
    return {available:true,canImport:true,reason:'ready'};
  }
  function importLegacy(){
    const id=scope();
    const check=legacyStatus();
    if(!check.canImport)throw new Error('현재 계정으로 이전 데이터를 가져올 수 없어요. 기존 파일과 계정 상태를 확인해 주세요.');
    const raw=readText(migrationSource()||legacyPath(),'');
    const parsed=assertPayload(raw);
    if(parsed.cloudAccount?.userId&&parsed.cloudAccount.userId!==id)throw new Error('다른 계정의 일정은 가져올 수 없어요.');
    const current=read(id);
    // Save any profile placeholder before overwriting, even if it was empty.
    if(current){const dir=path.join(profileDir(id),'pre-import-backups');
      atomicWrite(path.join(dir,`before-import-${filenameStamp()}-${Date.now()}.json`),current);
    }
    // Unlinked legacy data must never inherit another account's sync metadata.
    const safe={...parsed,cloudAccount:parsed.cloudAccount?.userId===id?parsed.cloudAccount:null};
    atomicWrite(dataPath(id),JSON.stringify(safe));
    return {ok:true,scope:id,legacyPreserved:true};
  }
  return {scope,profileDir,dataPath,reminderPath,legacyPath,guestLegacyPath,read,write,legacyStatus,importLegacy,hasContent};
}
module.exports={scopeId,createAccountProfiles};
