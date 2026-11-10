'use strict';
/* Account-owned private calendar data. Incoming shared events stay in the sharing tables.
 * Never silently adopt another PC's local data into an account or replace a local
 * calendar with a cloud snapshot. A revision mismatch blocks further writes. */
(function(root){
  const FIELDS=['events','notes','todos','tagLibrary','tagLibraryHidden','games','shortcuts','recentColors','timelineLayout','timelineRowPins'];
  function snapshot(data){
    const result=Object.fromEntries(FIELDS.map(field=>[field,data?.[field]??(['timelineLayout','timelineRowPins'].includes(field)?{}:[])]));
    // Preserve the old snapshot fingerprint until a manual row is actually saved.
    if(!Object.keys(result.timelineRowPins||{}).length)delete result.timelineRowPins;
    return result;
  }
  function fingerprint(value){
    const text=JSON.stringify(value);let a=2166136261,b=5381;
    for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619)>>>0;b=((b<<5)+b+text.charCodeAt(i))>>>0;}
    return `${text.length}:${a.toString(16)}:${b.toString(16)}`;
  }
  function meaningful(data){
    // Fresh installations are empty. This legacy check recognizes untouched demo data
    // from older releases without treating it as a user-authored calendar.
    const events=Array.isArray(data?.events)?data.events:[];
    const notes=Array.isArray(data?.notes)?data.notes:[];
    return events.some(e=>!String(e.title||'').startsWith('예시 ·'))
      || notes.some(n=>n.title!=='첫 번째 메모')
      || (Array.isArray(data?.todos)&&data.todos.length>0)
      || (Array.isArray(data?.tagLibrary)&&data.tagLibrary.length>0&&events.length===0)
      || (Array.isArray(data?.games)&&data.games.length>1)
      || (notes.length>0&&notes[0]?.title==='첫 번째 메모'&&!String(notes[0]?.body||'').includes('일정과 메모는 PC에 자동 저장됩니다.'));
  }
  function createAccountSync({bridge,getData,applyCloud,saveLocal,backup,notify}){
    if(!bridge?.accountSnapshotGet)return null;
    let currentUser='',revision=0,enabled=false,blocked=false,disposed=0,uploadTimer=null,writing=false,nextAttemptAt=0;
    let accountButton=document.getElementById('accountSyncLaunch');
    if(!accountButton){
      accountButton=document.createElement('button');accountButton.id='accountSyncLaunch';accountButton.type='button';
      accountButton.className='btn';accountButton.setAttribute('aria-label','계정 일정 동기화');
      const shared=document.getElementById('sharingLaunch');shared?.insertAdjacentElement('afterend',accountButton);
    }
    // Legacy v1.9.21 and earlier stored every user's data in one global file.
    // Keep that file unchanged. Adoption is opt-in and requires an authenticated owner.
    let legacyButton=null;
    if(bridge.legacyCalendarStatus&&bridge.importLegacyCalendar){
      legacyButton=document.createElement('button');
      legacyButton.type='button';legacyButton.className='btn';legacyButton.textContent='이전 PC 데이터 가져오기';
      legacyButton.title='옛 버전의 PC 일정을 직접 확인하고 현재 로그인 계정으로 옮기기';
      legacyButton.hidden=true;
      accountButton.insertAdjacentElement('afterend',legacyButton);
      legacyButton.addEventListener('click',async()=>{
        const result=await bridge.legacyCalendarStatus();
        if(!result?.canImport){
          notify(result?.reason==='different-owner'?'이전 파일에 다른 계정의 연결 정보가 있어 자동 가져오기를 막았어요.':
            '현재 계정에 이미 일정 데이터가 있어 자동으로 덮어쓰지 않아요. 이전 파일은 PC에 그대로 보관돼 있어요.',6500);
          return;
        }
        if(!confirm('예전 버전의 PC 저장 데이터를 현재 로그인 계정으로 가져올까요?\n기존 원본 파일은 삭제하지 않고 그대로 보관합니다. 다른 사람이 사용한 데이터라면 취소해 주세요.'))return;
        try{
          await bridge.importLegacyCalendar();
          notify('이전 데이터를 계정 전용 저장소로 복사했어요.');
          if(typeof root.location?.reload==='function')root.location.reload();
        }catch(error){notify(error?.message||'이전 데이터를 가져오지 못했어요.',6000);}
      });
    }
    async function refreshLegacyButton(){
      if(!legacyButton)return;
      try{const status=await bridge.legacyCalendarStatus();
        legacyButton.hidden=!(currentUser&&status?.available&&status.reason!=='different-owner');
        legacyButton.textContent=status?.canImport?'이전 PC 데이터 가져오기':'이전 PC 데이터 보관 중';
      }
      catch{legacyButton.hidden=true;}
    }
    function display(text,detail){accountButton.textContent='☁ '+text;accountButton.title=detail;}
    function meta(){const m=getData()?.cloudAccount;return m&&m.userId===currentUser&&Number.isSafeInteger(m.revision)?m:null;}
    function localHash(){return fingerprint(snapshot(getData()));}
    async function storeMeta(row){
      const userId=currentUser;getData().cloudAccount={userId,revision:row.revision,hash:fingerprint(snapshot(getData()))};
      revision=row.revision;await saveLocal();
    }
    async function pull(row){
      const startingUser=currentUser;
      if(!row?.payload)throw new Error('계정 데이터를 찾지 못했어요.');
      await saveLocal(); // Flush unsaved in-memory edits before capturing a backup.
      await backup(); // Preserve a restorable copy before replacing any device data.
      if(startingUser!==currentUser)return;
      await applyCloud(row.payload);
      if(startingUser!==currentUser)return;
      await storeMeta(row);
      enabled=true;blocked=false;display('동기화됨','내 계정에 모든 개인 일정·메모·할 일 등이 저장됩니다.');
      void refreshLegacyButton();
      notify('계정에 저장된 일정으로 동기화했어요. 기존 PC 데이터는 백업했어요.');
    }
    async function createRemote(){
      const startingUser=currentUser;
      const row=await bridge.accountSnapshotCreate(snapshot(getData()));
      if(startingUser!==currentUser)return;
      await storeMeta(row);enabled=true;blocked=false;display('동기화됨','계정 데이터 저장 완료');
      void refreshLegacyButton();
      notify('이 PC의 데이터를 계정에 연결했어요. 다른 기기에서도 로그인하면 볼 수 있어요.');
    }
    async function updateRemote(remote){
      // Explicit override only, and still compare-and-swap against a fresh revision.
      const startingUser=currentUser;
      const row=await bridge.accountSnapshotUpdate(snapshot(getData()),remote.revision);
      if(startingUser!==currentUser)return;
      await storeMeta(row);enabled=true;blocked=false;display('동기화됨','계정 데이터 저장 완료');
      notify('이 PC의 데이터를 계정에 저장했어요.');
    }
    async function write(){
      if(!enabled||!currentUser||blocked||writing)return;
      const m=meta();if(!m){blocked=true;display('확인 필요','계정 연결 정보가 바뀌었어요. 클릭해서 확인해 주세요.');return;}
      const beforeHash=localHash();if(beforeHash===m.hash)return;
      const startingUser=currentUser,startingSerial=disposed;
      writing=true;display('저장 중','변경 사항을 계정에 저장하는 중');
      try{
        const row=await bridge.accountSnapshotUpdate(snapshot(getData()),m.revision);
        if(startingSerial!==disposed||startingUser!==currentUser)return;
        // Local edits may have happened while the network request was in flight.
        const nowHash=localHash();
        if(nowHash===beforeHash)await storeMeta(row);
        else {getData().cloudAccount={userId:currentUser,revision:row.revision,hash:beforeHash};revision=row.revision;await saveLocal();}
        nextAttemptAt=0;display('동기화됨','계정 일정이 저장됐어요.');
      }catch(error){
        if(startingSerial!==disposed||startingUser!==currentUser)return;
        if(/충돌/.test(error?.message||'')){blocked=true;enabled=false;display('충돌 확인','다른 기기에서 먼저 저장했어요. 클릭해서 어느 데이터를 사용할지 선택해 주세요.');notify('다른 기기에서 먼저 수정했어요. 계정 동기화 버튼을 눌러 확인해 주세요.',6000);}
        else{nextAttemptAt=Date.now()+30000;display('재시도','네트워크 오류로 PC에는 저장됐어요. 30초 후 재시도할게요.');}
      }finally{writing=false;if(startingSerial===disposed&&!blocked&&enabled&&localHash()!==(meta()?.hash||''))schedule();}
    }
    function schedule(){if(uploadTimer)clearTimeout(uploadTimer);uploadTimer=setTimeout(()=>{uploadTimer=null;void write();},Math.max(1200,nextAttemptAt-Date.now()));}
    function onLocalChange(){if(enabled&&!blocked&&currentUser&&localHash()!==(meta()?.hash||''))schedule();}
    async function checkRemote(force=false){
      if(!currentUser||!enabled||writing||blocked)return;
      const row=await bridge.accountSnapshotGet();
      if(!row){blocked=true;enabled=false;display('확인 필요','계정 서버 기록을 찾을 수 없어요.');return;}
      const m=meta();if(!m){blocked=true;enabled=false;display('확인 필요','계정 연결 정보가 바뀌었어요.');return;}
      if(row.revision===m.revision){if(force)notify('계정 데이터가 최신 상태예요.');return;}
      if(localHash()===m.hash){await pull(row);return;}
      blocked=true;enabled=false;display('충돌 확인','다른 기기와 현재 PC의 데이터가 달라요.');
      notify('계정과 PC의 수정 내용이 서로 달라요. 계정 동기화를 눌러 선택해 주세요.',6000);
    }
    async function onAuthChange(status){
      const serial=++disposed;
      if(uploadTimer){clearTimeout(uploadTimer);uploadTimer=null;}
      nextAttemptAt=0;enabled=false;blocked=false;currentUser=status?.signedIn&&status?.userId?status.userId:'';revision=0;
      if(!currentUser){display('계정 동기화','일정 공유에서 이메일 로그인 후 사용해 주세요.');void refreshLegacyButton();return;}
      void refreshLegacyButton();
      display('확인 중','계정 데이터가 있는지 확인하고 있어요.');
      try{
        const row=await bridge.accountSnapshotGet();if(serial!==disposed)return;
        const m=meta();
        // An upgrade from the old shared device file must never silently adopt
        // a server snapshot before the user chooses what to do with that file.
        const legacy=await bridge.legacyCalendarStatus?.().catch(()=>null);
        if(serial!==disposed)return;
        if(legacy?.canImport && row && !meaningful(getData())){
          display('이전 데이터 확인','옛 PC 데이터가 보관돼 있어요. 계정 데이터 또는 이전 데이터를 직접 선택해 주세요.');
          void refreshLegacyButton();return;
        }
        if(!row){display('연결하기','이 PC 데이터를 계정에 처음 저장하려면 클릭해 주세요.');return;}
        if(m&&m.revision===row.revision){revision=row.revision;enabled=true;display('동기화됨','계정 일정 동기화 중');if(localHash()!==m.hash)schedule();return;}
        if((m&&localHash()===m.hash)||(!m&&!meaningful(getData()))){await pull(row);return;}
        blocked=true;display('연결 선택','계정 데이터와 현재 PC의 데이터가 달라요. 클릭해서 선택해 주세요.');
        notify('계정 일정과 이 PC의 일정 중 무엇을 사용할지 선택해 주세요.',5500);
      }catch(error){if(serial!==disposed)return;display('연결 오류','계정 동기화에 연결하지 못했어요. 클릭해서 재시도해 주세요.');notify('계정 동기화 연결에 실패했어요. PC 데이터는 안전하게 남아 있어요.');}
    }
    function chooseConflictAction(){
      return new Promise(resolve=>{
        const shade=document.createElement('div');
        shade.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(12,18,30,.76);display:flex;align-items:center;justify-content:center;padding:22px';
        const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
        panel.setAttribute('aria-label','계정 동기화 데이터 선택');
        panel.style.cssText='width:min(520px,100%);background:#202838;color:#f2f5fc;padding:26px;border:1px solid #566078;border-radius:16px;box-shadow:0 16px 70px #080e20';
        const title=document.createElement('h2');title.textContent='계정 동기화 데이터 선택';title.style.cssText='margin:0 0 8px;font-size:20px';
        const info=document.createElement('p');info.textContent='이 PC와 계정의 데이터가 달라요. 어떤 데이터를 사용할지 선택해 주세요. 데이터는 자동으로 합쳐지지 않습니다.';info.style.cssText='line-height:1.6;font-size:14px;color:#c4cbda';
        const actions=document.createElement('div');actions.style.cssText='display:grid;gap:10px;margin-top:18px';
        function finish(value){document.removeEventListener('keydown',onKey);shade.remove();resolve(value);}
        function onKey(e){if(e.key==='Escape')finish('cancel');}
        function action(label,description,value){
          const button=document.createElement('button');button.type='button';
          button.className='btn';button.style.cssText='width:100%;min-height:48px;text-align:left;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;padding:10px 14px';
          const strong=document.createElement('strong');strong.textContent=label;
          const small=document.createElement('small');small.textContent=description;small.style.color='#c2c9d8';
          button.append(strong,small);button.addEventListener('click',()=>finish(value));actions.appendChild(button);return button;
        }
        const first=action('계정 데이터를 이 PC로 가져오기','현재 PC 데이터를 먼저 백업한 뒤 계정 데이터로 교체','cloud');
        action('이 PC 데이터를 계정에 덮어쓰기','다른 기기의 최근 수정이 사라질 수 있어요','local');
        action('취소','아무것도 변경하지 않음','cancel');
        panel.append(title,info,actions);shade.appendChild(panel);document.body.appendChild(shade);
        shade.addEventListener('click',e=>{if(e.target===shade)finish('cancel');});
        document.addEventListener('keydown',onKey);
        first.focus();
      });
    }
    async function choose(){
      if(!currentUser){notify('먼저 일정 공유에서 이메일 로그인을 해주세요.');return;}
      if(writing){notify('계정 저장을 완료한 후 다시 시도해 주세요.');return;}
      try{
        const remote=await bridge.accountSnapshotGet();
        if(!remote){
          if(confirm('이 PC의 개인 일정·메모·할 일·태그·게임 분류·바로가기를 로그인 계정에 저장할까요?\n다른 기기에서도 이 계정으로 동기화할 수 있어요.'))await createRemote();
          return;
        }
        if(enabled&&!blocked){await checkRemote(true);return;}
        const legacy=await bridge.legacyCalendarStatus?.().catch(()=>null);
        if(legacy?.canImport&&!meaningful(getData())){
          if(confirm('이 PC에 이전 버전의 일정이 별도 보관돼 있어요. 기존 파일은 그대로 남겨두고 계정에 저장된 데이터부터 불러올까요?'))await pull(remote);
          return;
        }
        const choice=await chooseConflictAction();
        if(choice==='cloud'){if(confirm('기존 PC 일정 데이터를 먼저 백업하고 계정 데이터로 교체할까요?'))await pull(remote);}
        else if(choice==='local'){if(confirm('정말 이 PC의 일정으로 계정 데이터를 덮어쓸까요? 다른 기기의 최신 수정 내용이 사라질 수 있어요.'))await updateRemote(remote);}
      }catch(error){display('확인 필요','계정 동기화 오류: '+(error?.message||''));notify('계정 동기화 실패: '+(error?.message||'다시 시도해 주세요.'),6500);}
    }
    accountButton.addEventListener('click',()=>{void choose();});
    display('계정 동기화','이메일로 로그인하면 다른 기기와 일정 동기화 가능');
    const passive=()=>{if(enabled&&!blocked&&document.visibilityState!=='hidden'){if(localHash()!==(meta()?.hash||''))schedule();else void checkRemote().catch(()=>{});}};
    window.addEventListener('focus',passive);document.addEventListener('visibilitychange',passive);window.addEventListener('online',passive);
    setInterval(passive,30000);
    return {onAuthChange,onLocalChange,checkRemote,choose};
  }
  root.KuunsAccountSync={snapshot,fingerprint,meaningful,createAccountSync};
})(typeof window!=='undefined'?window:globalThis);
