'use strict';
/* Shared-event UI. The user's private calendar remains local; server rows are not persisted in backups. */
(function(root){
  function createSharingUI({bridge,getEvent,getEvents,onRemoteEvents,notify}){
    const $=id=>document.getElementById(id);
    const overlay=$('sharingOverlay'), content=$('sharingContent');
    let session={signedIn:false,email:''}, rows=[], opened=false, selectedId=null, pending='';
    let inFlight=false, timer=null;
    function line(parent, tag, text,cls){const el=document.createElement(tag);el.textContent=text||'';if(cls)el.className=cls;parent.append(el);return el;}
    function button(parent,text,action,cls='btn sm'){
      const b=line(parent,'button',text,cls);b.type='button';b.addEventListener('click',async()=>{
        if(inFlight)return;
        inFlight=true;b.disabled=true;
        try{await action();}catch(e){notify(e?.message||'공유 기능 처리에 실패했습니다.');}
        finally{inFlight=false;b.disabled=false;}
      });return b;
    }
    function isMine(row){return row.local_event_id && getEvents().some(e=>e.id===row.local_event_id);}
    function publishRemote(){
      const joined=rows.filter(r=>!isMine(r)).map(r=>({
        id:'shared:'+r.id, sharedId:r.id, remoteReadOnly:true,
        title:r.title,description:r.description||'',start:r.start_date,end:r.end_date,
        color:r.event_data?.color||'#5367e8',status:r.event_data?.status||'todo',
        completed:r.event_data?.status==='done',gameId:'',recurrence:'none',recurrenceUntil:'',checklist:[],url:'',reminderAt:''
      }));
      onRemoteEvents(joined);
    }
    async function refresh(){
      if(!session.signedIn) {rows=[];onRemoteEvents([]);return;}
      rows=await bridge.sharingList();
      publishRemote();if(opened)render();
    }
    function getOwnedRow(localId){return rows.find(r=>r.local_event_id===localId && isMine(r));}
    async function syncEditedEvent(event){
      if(!session.signedIn||!getOwnedRow(event?.id))return;
      try{await bridge.sharingPublish(event);await refresh();}
      catch(e){notify('공유 일정 반영 실패: '+(e?.message||'연결 확인 필요'));}
    }
    async function handleLocalDelete(localId){
      const row=getOwnedRow(localId);
      if(!row)return;
      try{await bridge.sharingUnshare(row.id);await refresh();}
      catch(e){notify('서버의 공유 일정 삭제 실패: 공유 관리에서 중단해 주세요.');}
    }
    function open(eventId=null){selectedId=eventId;opened=true;overlay.hidden=false;$('sharingGenerated').hidden=true;render();}
    function openRemote(eventId){selectedId=eventId;opened=true;overlay.hidden=false;$('sharingGenerated').hidden=true;render();}
    function close(){opened=false;overlay.hidden=true;selectedId=null;}
    function statusHint(parent,message){line(parent,'p',message,'share-hint');}
    function render(){
      if(!opened)return;content.replaceChildren();
      if(!session.signedIn){
        line(content,'h3','이메일로 로그인','share-heading');
        statusHint(content,'공유 일정은 이메일 인증 후에만 사용할 수 있어요. 개인 일정은 서버로 전송되지 않습니다.');
        const email=line(content,'input','','share-input');email.type='email';email.placeholder='이메일 주소';email.id='sharingEmail';email.autocomplete='email';
        button(content,'인증 번호 보내기',async()=>{const reply=await bridge.sharingRequestOtp(email.value);pending=reply.email;render();notify('인증 메일을 확인해 주세요.');},'btn primary');
        if(pending){
          line(content,'p',pending+'로 보낸 인증 번호를 입력하세요.','share-hint');
          const code=line(content,'input','','share-input');code.id='sharingOtp';code.inputMode='numeric';code.placeholder='6자리 이메일 인증 번호';code.maxLength=8;
          button(content,'로그인',async()=>{session=await bridge.sharingVerifyOtp(pending,code.value);pending='';await refresh();render();notify('일정 공유 로그인이 완료됐어요.');},'btn primary');
        }
        statusHint(content,'메일이 오지 않으면 스팸함을 확인하고, Supabase Email Auth 발송 설정도 확인해 주세요.');
        return;
      }
      const account=line(content,'div','로그인: '+session.email,'share-account');
      button(account,'로그아웃',async()=>{session=await bridge.sharingSignOut();rows=[];onRemoteEvents([]);render();});
      if(selectedId?.startsWith('shared:')){
        const entry=rows.find(r=>'shared:'+r.id===selectedId);
        if(!entry){statusHint(content,'공유된 일정을 찾지 못했습니다. 새로고침을 해주세요.');return;}
        line(content,'h3',entry.title,'share-heading');
        statusHint(content,`${entry.start_date} ~ ${entry.end_date} · 읽기 전용`);
        if(entry.description)line(content,'p',entry.description,'share-description');
        button(content,'내 캘린더에서 공유 일정 제거',async()=>{await bridge.sharingLeave(entry.id);selectedId=null;await refresh();notify('공유 일정에서 나왔어요.');},'btn danger');
        return;
      }
      const selected=selectedId&&getEvent(selectedId);
      if(selected){
        line(content,'h3',selected.title,'share-heading');
        statusHint(content,`${selected.start} ~ ${selected.end}`);
        const existing=getOwnedRow(selected.id);
        if(!existing){
          button(content,'이 일정 공유 시작',async()=>{
            if(!confirm('이 일정의 제목, 날짜, 메모가 초대받은 동료에게 공유됩니다. 계속할까요?'))return;
            await bridge.sharingPublish(selected);await refresh();notify('공유 일정이 준비됐어요. 초대 코드를 만들어 주세요.');
          },'btn primary');
        }else{
          const details=line(content,'div','','share-options');
          button(details,'초대 링크·코드 생성',async()=>{
            const result=await bridge.sharingInvite(existing.id);
            $('sharingGeneratedCode').value=result.token;
            $('sharingGeneratedLink').value=result.link;
            $('sharingGenerated').hidden=false;
            notify('초대 코드를 생성했어요. 코드 하나당 한 번만 수락할 수 있어요.');
          },'btn primary');
          button(details,'남은 초대 코드 전부 취소',async()=>{await bridge.sharingRevoke(existing.id);notify('사용하지 않은 초대 코드를 취소했어요.');});
          button(details,'이 일정 공유 중단',async()=>{if(!confirm('모든 참여자의 캘린더에서 이 공유 일정을 제거할까요?'))return;await bridge.sharingUnshare(existing.id);selectedId=null;await refresh();notify('일정 공유를 중단했어요.');},'btn danger');
        }
      }
      const invite=line(content,'div','','share-section');
      line(invite,'h3','초대 수락','share-heading');
      statusHint(invite,'상대방이 보낸 초대 링크 또는 64자리 초대 코드를 붙여넣으세요.');
      const code=line(invite,'input','','share-input');code.id='sharingAcceptCode';code.placeholder='kuuns-kanban://invite/... 또는 초대 코드';code.value=pendingInvite||'';
      button(invite,'초대 수락',async()=>{await bridge.sharingAccept(code.value);pendingInvite='';await bridge.sharingConsumeInvite();selectedId=null;await refresh();notify('초대를 수락했어요. 달력에 공유 일정이 표시됩니다.');},'btn primary');
      const section=line(content,'div','','share-section');
      line(section,'h3','내 공유 일정 / 초대받은 일정','share-heading');
      button(section,'목록 새로고침',async()=>{await refresh();notify('공유 일정이 갱신됐어요.');});
      if(!rows.length) statusHint(section,'공유 일정이 아직 없습니다.');
      for(const item of rows){
        const row=line(section,'div','','share-list-item');
        const label=line(row,'div','','share-list-copy');
        line(label,'strong',item.title);
        line(label,'small',`${item.start_date} ~ ${item.end_date} · ${isMine(item)?'내가 공유':'초대받음'}`);
        button(row,'보기',async()=>{selectedId=isMine(item)?item.local_event_id:'shared:'+item.id;render();});
      }
    }
    let pendingInvite='';
    $('sharingClose').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    $('sharingCopyCode').addEventListener('click',async()=>{
      try {await bridge.sharingCopyInvite($('sharingGeneratedCode').value);notify('초대 링크와 코드를 복사했어요.');}
      catch{ $('sharingGeneratedCode').select();notify('코드를 선택했어요. Ctrl+C / ⌘C로 복사해 주세요.');}
    });
    $('sharingGenerated').addEventListener('click',e=>e.stopPropagation());
    async function initialize(){
      session=await bridge.sharingStatus();
      if(session.signedIn){try{await refresh();}catch(e){notify('공유 일정 불러오기 실패: '+e.message);}}
      const inv=await bridge.sharingPendingInvite();if(inv)pendingInvite=inv;
      bridge.onSharingInvite?.(code=>{pendingInvite=code;selectedId=null;open();});
      if(pendingInvite)open();
      window.addEventListener('focus',()=>{if(session.signedIn)void refresh().catch(()=>{});});
      timer=setInterval(()=>{if(session.signedIn)void refresh().catch(()=>{});},120000);
    }
    void initialize().catch(e=>notify('공유 기능 준비 실패: '+e.message));
    return {open,openRemote,close,refresh,getOwnedRow,syncEditedEvent,handleLocalDelete};
  }
  root.KuunsSharing={createSharingUI};
})(window);
