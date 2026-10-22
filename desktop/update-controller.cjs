 'use strict';
// Electron updater orchestration. It never downloads or installs without user approval.
const validName=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(s);
// The release-config.json file is copied into app.asar. Electron-builder may
// strip build-time fields from the package.json stored inside a packaged app.
// Therefore do not rely on pkg.build.publish at runtime.
function githubProvider(pkg,packagedConfig){
  const valid=cfg=>cfg&&cfg.provider==='github'&&validName(cfg.owner)&&validName(cfg.repo);
  if(valid(packagedConfig))return {owner:packagedConfig.owner,repo:packagedConfig.repo};
  const buildConfig=pkg&&pkg.build&&pkg.build.publish;
  if(valid(buildConfig))return {owner:buildConfig.owner,repo:buildConfig.repo};
  return null;
}
function createUpdateController({app,pkg,packagedConfig,updaterFactory,emit=()=>{},beforeInstall=async()=>{},clock=setTimeout,every=setInterval,platform=process.platform,logger=console}){
  let updater=null,busy=false,interval=null,installing=false;
  const repo=githubProvider(pkg,packagedConfig);
  let state={phase:'disabled',version:app.getVersion(),newVersion:'',percent:0,message:''};
  function publish(phase,extra={}){state={...state,...extra,phase};emit({...state});return {...state};}
  function current(){return {...state};}
  async function check(manual=false){
    if(!updater)return publish('disabled',{message:repo?'설치형 Windows 앱에서 업데이트를 확인할 수 있어요.':'GitHub Releases 저장소를 먼저 연결해 주세요.'});
    if(busy||['downloading','downloaded','installing'].includes(state.phase))return current();
    busy=true;publish('checking',{message:'GitHub Releases에서 새 버전을 확인 중이에요.',percent:0});
    try{await updater.checkForUpdates();}
    catch(e){logger.warn('Update check failed',e);publish('error',{message:'업데이트 확인 실패: 네트워크와 공개 Releases 설정을 확인해 주세요.'});}
    finally{busy=false;}
    return current();
  }
  async function download(){
    if(!updater||state.phase!=='available')return current();
    publish('downloading',{message:'업데이트 다운로드를 시작했어요.',percent:0});
    try{await updater.downloadUpdate();}
    catch(e){logger.warn('Download failed',e);publish('error',{message:'업데이트 다운로드에 실패했어요. 나중에 다시 확인해 주세요.'});}
    return current();
  }
  async function install(){
    if(!updater||state.phase!=='downloaded'||installing)return current();
    installing=true;
    try{
      await beforeInstall();
      publish('installing',{message:'설치를 위해 앱을 종료하고 새 버전으로 재시작합니다.'});
      updater.quitAndInstall(false,true);
    }catch(e){installing=false;logger.warn('Install failed',e);publish('error',{message:'업데이트 설치를 시작하지 못했어요.'});}
    return current();
  }
  function start(){
    if(!repo)return publish('disabled',{message:'GitHub Releases 주소를 설정해야 자동 업데이트를 사용할 수 있어요.'});
    if(!app.isPackaged||platform!=='win32')return publish('disabled',{message:'Windows에 설치된 앱에서 업데이트를 확인할 수 있어요.'});
    try{
      updater=updaterFactory();
      // Use the explicit GitHub feed even when app-update.yml or the packaged
      // package.json does not expose the publishing fields as expected.
      if(typeof updater.setFeedURL==='function')updater.setFeedURL({provider:'github',owner:repo.owner,repo:repo.repo});
    }catch(e){logger.warn('Updater init failed',e);return publish('error',{message:'업데이트 구성 요소를 불러올 수 없어요.'});}
    updater.autoDownload=false;
    updater.autoInstallOnAppQuit=false;
    updater.allowPrerelease=false;
    updater.on('checking-for-update',()=>publish('checking',{message:'업데이트 확인 중이에요.'}));
    updater.on('update-available',info=>publish('available',{newVersion:info.version,message:`새 버전 v${info.version}가 있어요.`,percent:0}));
    updater.on('update-not-available',()=>publish('current',{message:'현재 최신 버전이에요.',newVersion:'',percent:0}));
    updater.on('download-progress',progress=>publish('downloading',{percent:Math.max(0,Math.min(100,Math.round(progress.percent||0))),message:'업데이트 파일을 다운로드 중이에요.'}));
    updater.on('update-downloaded',info=>publish('downloaded',{newVersion:info.version,message:`v${info.version} 다운로드 완료 · 재시작하면 적용돼요.`,percent:100}));
    updater.on('error',e=>{logger.warn('Updater event error',e);publish('error',{message:'업데이트 연결에 문제가 있어요. 공개 Releases와 latest.yml을 확인해 주세요.'});});
    publish('idle',{message:'업데이트가 설정되어 있어요. 자동으로 새 버전을 확인합니다.'});
    clock(()=>{void check(false);},15000);
    interval=every(()=>{void check(false);},6*60*60*1000);
    return current();
  }
  function stop(){if(interval){clearInterval(interval);interval=null;}}
  return {start,check,download,install,current,stop};
}
module.exports={githubProvider,createUpdateController};
