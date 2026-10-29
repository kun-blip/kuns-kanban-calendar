'use strict';
/* v1.9.1 collaboration: only explicitly shared events leave the local PC. */
(function(root){
  function createSharingUI({bridge,getEvent,getEvents,onRemoteEvents,onOwnedUpdates,onDeleteOwnedEvent,notify}){
    const $=id=>document.getElementById(id);
    const overlay=$('sharingOverlay'), content=$('sharingContent');
    let session={signedIn:false,email:'',userId:null}, rows=[],contacts=[],inbox=[],roles=[];
    let opened=false,selectedId=null,pending='',pendingInvite='',inFlight=false;
    let draft=[], details={members:[],invites:[],history:[]}, seen=new Set(),initialInbox=true;
    // Keep each section's expanded state while inbox/contact lists refresh.
    const foldOpen={legacy:false,shared:false,contacts:false};
    const colleagueGroupOpen=new Map();
    let colleagueGroupManagerOpen=false;
    const uuid=v=>typeof v==='string' && /^[0-9a-f-]{36}$/i.test(v);
    function line(parent,tag,text,cls){const el=document.createElement(tag);el.textContent=text??'';if(cls)el.className=cls;parent.append(el);return el;}
    function hint(parent,text){line(parent,'p',text,'share-hint');}
    function btn(parent,text,action,cls='btn sm'){
      const b=line(parent,'button',text,cls);b.type='button';b.addEventListener('click',async()=>{
        if(inFlight)return;inFlight=true;b.disabled=true;
        try{await action();}catch(e){notify(e?.message||'공유 작업 실패');}
        finally{inFlight=false;b.disabled=typeof b._isBlocked==='function'?b._isBlocked():false;}
      });return b;
    }
    function field(parent,placeholder,value='',type='text'){
      const el=line(parent,'input','','share-input');el.type=type;el.placeholder=placeholder;el.value=value;return el;
    }
    function fold(parent,key,title,forceOpen=false){
      const details=line(parent,'details','','share-fold');
      details.open=forceOpen||!!foldOpen[key];
      const summary=line(details,'summary',title,'share-fold-summary');
      summary.setAttribute('aria-label',title+' 접기 또는 펼치기');
      details.addEventListener('toggle',()=>{foldOpen[key]=details.open;});
      return line(details,'div','','share-fold-body');
    }
    function editLabel(parent,caption,placeholder,value='',type='text'){
      const wrapper=line(parent,'label','','share-edit-label');
      line(wrapper,'span',caption);
      return field(wrapper,placeholder,value,type);
    }
    function groupSuggestions(input,groupNames,key){
      const id='contact-groups-'+key.replace(/[^a-z0-9_-]/gi,'');
      const options=line(input.parentElement,'datalist');options.id=id;
      for(const name of groupNames){const option=line(options,'option');option.value=name;}
      input.setAttribute('list',id);
    }
    function roleMenu(parent,role='viewer',onChange){
      const el=line(parent,'select','','share-input share-role');
      for(const [value,label] of [['viewer','보기만'],['editor','편집 가능']]){
        const option=line(el,'option',label);option.value=value;
      }
      el.value=role;el.addEventListener('change',()=>onChange(el.value));return el;
    }
    function isMine(row){return row.owner_id===session.userId;}
    async function deleteOwned(row){
      if(!isMine(row)){notify('작성자만 공유 일정을 삭제할 수 있어요.');return;}
      if(!confirm(`「${row.title}」 일정을 삭제할까요?\n내 PC의 원본 일정과 공유 서버의 일정이 삭제되며, 초대한 동료의 공유 목록에서도 사라집니다.\n삭제 후 복구하려면 백업 파일이 필요합니다.`))return;
      await root.KuunsSharedVisibility.deleteOwnedEvent(
        row,session.userId,id=>bridge.sharingUnshare(id),id=>onDeleteOwnedEvent?.(id)
      );
      selectedId=null;
      await refresh();
      notify('공유 일정과 이 PC의 원본 일정을 삭제했어요.');
    }

    function ownedRow(localId){return rows.find(r=>isMine(r)&&r.local_event_id===localId);}
    function remoteRole(row){return isMine(row)?'owner':(roles.find(r=>r.event_id===row.id && r.user_id===session.userId)?.role || 'viewer');}
    function renderRemote(){
      onOwnedUpdates?.(rows.filter(isMine));
      onRemoteEvents(root.KuunsSharedVisibility.remoteRows(rows,getEvents(),session.userId).map(r=>({
        id:'shared:'+r.id,sharedId:r.id,remoteReadOnly:remoteRole(r)!=='editor',
        title:r.title,description:r.description||'',start:r.start_date,end:r.end_date,
        color:r.event_data?.color||'#5367e8',status:r.event_data?.status||'todo',
        completed:r.event_data?.status==='done',gameId:'',recurrence:'none',recurrenceUntil:'',
        checklist:r.event_data?.checklist||[],url:r.event_data?.url||'',reminderAt:''
      })));
    }
    async function refresh(){
      if(!session.signedIn){rows=[];inbox=[];roles=[];contacts=[];onRemoteEvents([]);return;}
      // An authenticated recipient can explicitly trust a saved sender. This never auto-shares private schedules.
      await bridge.sharingAutoAcceptInvites?.().catch(()=>{});
      const [events,contactsResult,invitesResult,rolesResult]=await Promise.all([
        bridge.sharingList(),bridge.sharingContactsList(),bridge.sharingInbox(),bridge.sharingMyRoles()
      ]);
      rows=Array.isArray(events)?events:[];
      contacts=Array.isArray(contactsResult)?contactsResult:[];
      inbox=Array.isArray(invitesResult)?invitesResult:[];
      roles=Array.isArray(rolesResult)?rolesResult:[];
      renderRemote();renderEventPicker();
      if(!initialInbox){const fresh=inbox.filter(i=>!seen.has(i.invite_id));if(fresh.length)notify(`새로운 일정 초대 ${fresh.length}건이 도착했어요! 상단의 일정 공유를 확인하세요.`);}
      inbox.forEach(i=>seen.add(i.invite_id));initialInbox=false;
      if(opened)render();
    }
    // Groups stay as one selection in the UI; resolve their current members only on save.
    // A selected group's permission takes precedence over any automatic individual selection.
    function resolvedDraftRecipients(selections=draft){
      const recipients=new Map();
      for(const group of selections.filter(item=>item.groupName)){
        for(const contact of contacts.filter(c=>c.group_name===group.groupName)){
          recipients.set(contact.email.toLowerCase(),{email:contact.email.toLowerCase(),role:group.role});
        }
      }
      for(const person of selections.filter(item=>!item.groupName)){
        const email=person.email.toLowerCase();
        if(!recipients.has(email))recipients.set(email,{email,role:person.role});
      }
      return [...recipients.values()];
    }
    function resetDraft(newEvent=false){
      draft=newEvent?contacts.filter(c=>c.auto_invite).slice(0,20).map(c=>({email:c.email,nickname:c.nickname,role:'viewer'})):[];
      renderEventPicker();
    }
    function draftItems(){
      const copy=resolvedDraftRecipients();
      if(copy.length>20){notify('초대는 일정당 최대 20명까지 가능해요. 그룹 또는 동료를 줄인 후 다시 저장해 주세요.');return [];}
      draft=[];return copy;
    }
    function renderEventPicker(){
      const host=$('eventCollabPicker');if(!host)return;
      host.replaceChildren();
      line(host,'h4','동료 초대 (선택)','share-heading');
      if(!session.signedIn){hint(host,'먼저 상단의 일정 공유에서 이메일 로그인을 해주세요.');return;}
      hint(host,'그룹은 한 번에 선택하고 보기/편집 권한도 그룹 전체에 적용돼요.');
      const search=field(host,'닉네임 또는 이메일 검색');search.setAttribute('aria-label','초대할 동료 검색');
      const groups=[...new Set(contacts.map(c=>c.group_name||'').filter(Boolean))].sort();
      const groupHost=line(host,'div','','share-group-picker');
      const choices=line(groupHost,'select','','share-input share-group-select');
      choices.setAttribute('aria-label','초대할 동료 그룹');
      const placeholder=line(choices,'option','그룹 선택');placeholder.value='';
      for(const name of groups){const opt=line(choices,'option',`${name} (${contacts.filter(c=>c.group_name===name).length}명)`);opt.value=name;}
      const addGroup=btn(groupHost,'+ 그룹 추가',()=>{
        const name=choices.value;if(!name)return;
        if(draft.some(item=>item.groupName===name))return;
        const members=contacts.filter(c=>c.group_name===name);
        const memberEmails=new Set(members.map(c=>c.email.toLowerCase()));
        const next=draft.filter(item=>item.groupName||!memberEmails.has((item.email||'').toLowerCase()));
        next.push({groupName:name,role:'viewer'});
        if(resolvedDraftRecipients(next).length>20){notify('한 일정에는 최대 20명까지 초대할 수 있어요.');return;}
        draft=next;choices.value='';draw();
      },'btn sm share-contact-add');
      addGroup.disabled=!groups.length;
      if(!groups.length)groupHost.hidden=true;
      const matches=line(host,'div','','share-picker-results');
      const picks=line(host,'div','','share-picks');
      function draw(){
        matches.replaceChildren();picks.replaceChildren();
        const q=search.value.trim().toLowerCase();
        const covered=new Set(draft.flatMap(d=>d.groupName?contacts.filter(c=>c.group_name===d.groupName).map(c=>c.email.toLowerCase()):[(d.email||'').toLowerCase()]));
        // Do not expand all coworkers on opening the editor. Search is opt-in.
        if(q)for(const person of contacts.filter(c=>!covered.has(c.email.toLowerCase())&&(
          c.nickname.toLowerCase().includes(q)||c.email.toLowerCase().includes(q)
        )).slice(0,5)){
          btn(matches,'+ '+person.nickname+' ('+person.email+')',()=>{
            if(resolvedDraftRecipients([...draft,{email:person.email,nickname:person.nickname,role:'viewer'}]).length>20){notify('한 일정에는 최대 20명까지 초대할 수 있어요.');return;}
            draft.push({email:person.email,nickname:person.nickname,role:'viewer'});search.value='';draw();
          },'btn sm share-contact-add');
        }
        if(draft.length){
          const summary=line(picks,'div',`선택됨: ${draft.length}개 항목 · ${resolvedDraftRecipients().length}명`,'share-pick-summary');
          summary.setAttribute('aria-live','polite');
        }
        for(const selected of draft){
          const row=line(picks,'div','','share-pick-row');
          const info=line(row,'div','','share-pick-info');
          if(selected.groupName){
            line(info,'strong','그룹: '+selected.groupName);
            line(info,'small',`${contacts.filter(c=>c.group_name===selected.groupName).length}명 전체 초대`);
          }else{
            line(info,'strong',selected.nickname);
            line(info,'small',selected.email);
          }
          roleMenu(row,selected.role,value=>{selected.role=value;});
          const remove=btn(row,'×',()=>{
            draft=draft.filter(item=>item!==selected);draw();
          },'btn sm share-pick-remove');
          remove.setAttribute('aria-label',(selected.groupName||selected.nickname)+' 초대 제거');
        }
      }
      search.addEventListener('input',draw);draw();
      if(!contacts.length)hint(host,'등록된 동료가 없어요. 상단 일정 공유 → 동료 관리에서 추가할 수 있어요.');
    }
    async function saveAndInvite(event,recipients,editing){
      const current=ownedRow(event.id);
      if(current){
        try{await bridge.sharingPublish(event,Number(current.revision));}
        catch(e){notify('일정은 내 PC에 저장됐지만 공유 서버 반영에 실패했어요: '+e.message);return;}
      }else if(recipients?.length){
        if(event.recurrence && event.recurrence!=='none'){
          notify('반복 일정은 공유되지 않아요. 일반 일정으로 변경해 주세요.');return;
        }
        if(!confirm(`${recipients.length}명에게 이 일정의 제목·날짜·상세 메모·체크리스트·관련 링크를 공유하고 초대할까요?`))return;
        try{await bridge.sharingPublish(event);}
        catch(e){notify('로컬 일정은 저장됐지만 공유 일정을 만들지 못했어요: '+e.message);return;}
      }
      if(recipients?.length){
        try{
          const updated=await bridge.sharingList();const item=updated.find(r=>r.owner_id===session.userId&&r.local_event_id===event.id);
          if(!item)throw new Error('공유 일정을 찾지 못했어요.');
          await bridge.sharingInviteContacts(item.id,recipients);
          notify(`${recipients.length}명에게 초대가 등록됐어요. 동료가 앱에서 수락하면 공유됩니다.`);
        }catch(e){notify('일정은 저장됐지만 초대 전송에 실패했어요: '+e.message);}
      }
      if(current||recipients?.length)try{await refresh();}catch(e){notify('공유 일정 갱신 실패: '+e.message);}
    }
    function syncEditedEvent(event){return saveAndInvite(event,[],true);}
    async function handleLocalDelete(id){
      const found=ownedRow(id);if(!found)return;
      try{await bridge.sharingUnshare(found.id);await refresh();}catch(e){notify('서버 공유 중단 실패: '+e.message);}
    }
    async function detailLoad(){
      const r=selectedRow();details={members:[],invites:[],history:[]};
      if(!r)return;
      const id=r.id;
      const [history,members,invites]=await Promise.all([
        bridge.sharingHistory(id).catch(()=>[]),isMine(r)?bridge.sharingMembers(id).catch(()=>[]):[],isMine(r)?bridge.sharingSentInvites(id).catch(()=>[]):[]
      ]);
      if(selectedRow()?.id!==id)return;
      details={history,members,invites};if(opened)render();
    }
    function selectedRow(){
      if(selectedId?.startsWith('shared:'))return rows.find(r=>'shared:'+r.id===selectedId);
      return selectedId?ownedRow(selectedId):null;
    }
    function open(id=null){selectedId=id;opened=true;overlay.hidden=false;$('sharingGenerated').hidden=true;render();void detailLoad();}
    function openRemote(id){open(id);}
    function close(){opened=false;overlay.hidden=true;selectedId=null;}
    function renderContacts(parent){
      const section=line(parent,'section','','share-section');line(section,'h3','동료 관리','share-heading');
      hint(section,'내가 등록한 연락처만 보입니다. 이메일은 실제 로그인 계정과 일치해야 해요.');
      const row=line(section,'div','','share-contact-entry');
      const name=field(row,'동료 닉네임');name.maxLength=60;
      const email=field(row,'동료 이메일','','email');
      const group=field(section,'소속 그룹 (선택) — 예: UA팀');group.maxLength=60;
      btn(row,'+ 동료 등록',async()=>{
        await bridge.sharingContactAdd(name.value,email.value,group.value);await refresh();notify('동료를 등록했어요.');
      },'btn primary sm');
      const groups=[...new Set(contacts.map(c=>c.group_name||'').filter(Boolean))].sort();
      const manager=line(section,'details','','share-contact-manager');
      manager.open=colleagueGroupManagerOpen;
      line(manager,'summary',`동료 그룹 관리 (${groups.length}개 그룹)`,'share-fold-summary');
      manager.addEventListener('toggle',()=>{colleagueGroupManagerOpen=manager.open;});
      const groupBody=line(manager,'div','','share-contact-manager-body');
      // Group membership is a collapsible list, not an always-expanded duplicate directory.
      for(const groupName of groups){
        const members=contacts.filter(c=>c.group_name===groupName);
        const groupFold=line(groupBody,'details','','share-contact-group');
        groupFold.open=!!colleagueGroupOpen.get(groupName);
        line(groupFold,'summary',`${groupName} · ${members.length}명`,'share-fold-summary');
        groupFold.addEventListener('toggle',()=>{colleagueGroupOpen.set(groupName,groupFold.open);});
        const inner=line(groupFold,'div','','share-contact-group-body');
        const actions=line(inner,'div','','share-options');
        btn(actions,'이름 변경',()=>{editor.hidden=!editor.hidden;if(!editor.hidden)newGroup.focus();});
        btn(actions,'그룹 해제',async()=>{if(!confirm(groupName+' 그룹을 해제할까요? 연락처는 삭제되지 않아요.'))return;await bridge.sharingContactGroupClear(groupName);await refresh();},'btn sm');
        const editor=line(inner,'div','','share-inline-editor');editor.hidden=true;
        const newGroup=editLabel(editor,'새 그룹 이름','예: 디자인팀',groupName);newGroup.maxLength=60;
        const editActions=line(editor,'div','','share-options');
        btn(editActions,'저장',async()=>{
          const value=newGroup.value.trim();if(!value){notify('그룹 이름을 입력해 주세요.');return;}
          await bridge.sharingContactGroupRename(groupName,value);
          colleagueGroupOpen.set(value,true);colleagueGroupOpen.delete(groupName);
          await refresh();notify('그룹 이름을 변경했어요.');
        },'btn sm primary');
        btn(editActions,'취소',()=>{editor.hidden=true;newGroup.value=groupName;},'btn sm');
        for(const c of members)renderContact(c,inner,groups);
      }
      const ungrouped=contacts.filter(c=>!c.group_name);
      if(ungrouped.length){
        const loose=line(section,'details','','share-contact-group');
        loose.open=!!colleagueGroupOpen.get('');
        line(loose,'summary',`그룹 없음 · ${ungrouped.length}명`,'share-fold-summary');
        loose.addEventListener('toggle',()=>{colleagueGroupOpen.set('',loose.open);});
        const inner=line(loose,'div','','share-contact-group-body');
        for(const c of ungrouped)renderContact(c,inner,groups);
      }
      function renderContact(c,container,groupNames){
        const one=line(container,'div','','share-list-item');const info=line(one,'div','','share-list-copy');
        line(info,'strong',c.nickname);line(info,'small',c.email);
        const settings=line(info,'div','','share-contact-settings');
        const autoInvite=line(settings,'label','','share-setting');const autoInviteCheck=line(autoInvite,'input');autoInviteCheck.type='checkbox';autoInviteCheck.checked=!!c.auto_invite;line(autoInvite,'span','새 일정에 기본 초대');
        const autoAccept=line(settings,'label','','share-setting');const autoAcceptCheck=line(autoAccept,'input');autoAcceptCheck.type='checkbox';autoAcceptCheck.checked=!!c.auto_accept;line(autoAccept,'span','이 동료의 새 초대 자동 수락');
        async function updateSetting(){
          try{
            if(autoAcceptCheck.checked&&!c.auto_accept&&!confirm(`${c.nickname} (${c.email}) 계정에서 오는 새 초대를 앞으로 자동 수락할까요?
이 동료가 공유한 일정만 자동으로 표시됩니다.`)){autoAcceptCheck.checked=false;return;}
            await bridge.sharingContactSettings(c.id,{auto_invite:autoInviteCheck.checked,auto_accept:autoAcceptCheck.checked});
            await refresh();notify('동료별 자동 공유 설정을 저장했어요.');
          }catch(e){notify(e.message||'설정 저장 실패');await refresh();}
        }
        autoInviteCheck.addEventListener('change',updateSetting);autoAcceptCheck.addEventListener('change',updateSetting);
        btn(one,'수정',()=>{editor.hidden=!editor.hidden;if(!editor.hidden)editName.focus();});
        btn(one,'삭제',async()=>{if(!confirm(c.nickname+' 연락처를 삭제할까요?'))return;await bridge.sharingContactRemove(c.id);await refresh();},'btn sm danger');
        // Electron does not support window.prompt(); edit directly in the app.
        const editor=line(container,'div','','share-inline-editor');editor.hidden=true;
        const editName=editLabel(editor,'동료 닉네임','동료 닉네임',c.nickname);editName.maxLength=60;
        const editMail=editLabel(editor,'동료 이메일','name@example.com',c.email,'email');editMail.maxLength=254;
        const editGroup=editLabel(editor,'소속 그룹 (선택)','기존 그룹 선택 또는 새 그룹 입력',c.group_name||'');editGroup.maxLength=60;
        groupSuggestions(editGroup,groupNames,c.id);
        const editorActions=line(editor,'div','','share-options');
        btn(editorActions,'저장',async()=>{
          const nickname=editName.value.trim(),email=editMail.value.trim().toLowerCase(),group=editGroup.value.trim();
          if(!nickname || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
            notify('닉네임과 올바른 이메일을 입력해 주세요.');return;
          }
          await bridge.sharingContactUpdate(c.id,nickname,email,group);
          colleagueGroupOpen.set(group,true);
          await refresh();notify('동료 정보를 수정했어요.');
        },'btn sm primary');
        btn(editorActions,'취소',()=>{
          editName.value=c.nickname;editMail.value=c.email;editGroup.value=c.group_name||'';editor.hidden=true;
        },'btn sm');
      }
    }
    function renderInbox(parent){
      const s=line(parent,'section','','share-section');line(s,'h3',`받은 초대 (${inbox.length})`,'share-heading');
      if(!inbox.length)hint(s,'대기 중인 초대가 없어요.');
      for(const i of inbox){
        const row=line(s,'div','','share-list-item');const info=line(row,'div','','share-list-copy');
        line(info,'strong',i.title);line(info,'small',`${i.start_date} ~ ${i.end_date} · ${i.role==='editor'?'편집 가능':'보기만'}`);
        btn(row,'수락',async()=>{await bridge.sharingRespond(i.invite_id,true);await refresh();notify('일정 초대를 수락했어요.');},'btn sm primary');
        btn(row,'거절',async()=>{await bridge.sharingRespond(i.invite_id,false);await refresh();notify('일정 초대를 거절했어요.');},'btn sm');
      }
    }
    function renderEditor(parent,r){
      const editable=remoteRole(r)==='editor' || isMine(r);
      const section=line(parent,'section','','share-section');
      line(section,'h3',r.title,'share-heading');
      hint(section,`${r.start_date} ~ ${r.end_date} · ${isMine(r)?'작성자':editable?'편집 가능':'읽기 전용'} · 수정 버전 ${r.revision||1}`);
      if(r.event_data?.gameName)line(section,'p','게임 타이틀: '+r.event_data.gameName,'share-hint');
      if(!editable){
        line(section,'h4','상태','share-heading');
        line(section,'p',({'todo':'소프트런칭','doing':'라이브','done':'완료'})[r.event_data?.status]||'소프트런칭','share-description');
        line(section,'h4','자세한 메모','share-heading');
        line(section,'p',r.description||'등록된 메모가 없어요.','share-description');
        if(r.event_data?.url && /^https?:\/\//i.test(r.event_data.url)){
          line(section,'h4','관련 링크','share-heading');
          const link=line(section,'a',r.event_data.url,'share-description');link.href=r.event_data.url;link.target='_blank';link.rel='noopener noreferrer';
        }
        const items=Array.isArray(r.event_data?.checklist)?r.event_data.checklist:[];
        line(section,'h4',`작업 체크리스트 (${items.filter(i=>i.done).length}/${items.length} 완료)`,'share-heading');
        if(!items.length)hint(section,'등록된 체크리스트가 없어요.');
        for(const item of items){const el=line(section,'p',(item.done?'☑ ':'☐ ')+item.text,'share-description');if(item.done)el.style.opacity='.65';}
      }

      else{
        const title=field(section,'일정 제목',r.title);title.maxLength=200;
        const start=field(section,'시작일',r.start_date,'date');
        const end=field(section,'종료일',r.end_date,'date');
        line(section,'label','자세한 메모','share-heading');
        const description=line(section,'textarea','','share-input');description.rows=5;description.value=r.description||'';description.maxLength=4000;
        line(section,'label','관련 링크 (선택)','share-heading');
        const link=field(section,'https://...',r.event_data?.url||'');link.maxLength=1500;
        line(section,'h4','작업 체크리스트','share-heading');
        const checklistHost=line(section,'div','','share-picks');
        let checklist=(Array.isArray(r.event_data?.checklist)?r.event_data.checklist:[]).map(x=>({text:x.text,done:!!x.done}));
        function drawChecklist(){
          checklistHost.replaceChildren();
          checklist.forEach((item,i)=>{
            const row=line(checklistHost,'div','','share-pick-row');
            const cb=line(row,'input');cb.type='checkbox';cb.checked=item.done;cb.addEventListener('change',()=>{item.done=cb.checked;});
            const name=field(row,'체크 항목',item.text);name.maxLength=160;name.addEventListener('input',()=>{item.text=name.value.slice(0,160);});
            btn(row,'삭제',()=>{checklist.splice(i,1);drawChecklist();},'btn sm');
          });
        }
        drawChecklist();
        const addCheck=field(section,'새 체크 항목');
        btn(section,'체크 항목 추가',()=>{if(addCheck.value.trim()&&checklist.length<40){checklist.push({text:addCheck.value.trim().slice(0,160),done:false});addCheck.value='';drawChecklist();}},'btn sm');
        const status=line(section,'select','','share-input');
        for(const [v,label] of [['todo','소프트런칭'],['doing','라이브']]){
          const opt=line(status,'option',label);opt.value=v;
        }
        const originalSharedStatus=r.event_data?.status||'todo';
        let sharedStatusChanged=false;
        status.value=originalSharedStatus==='done'?'doing':originalSharedStatus;
        status.addEventListener('change',()=>{sharedStatusChanged=true;});
        btn(section,'공유 일정 변경 저장',async()=>{
          if(!title.value.trim()||!start.value||!end.value||end.value<start.value){notify('제목과 날짜를 확인해 주세요.');return;}
          const safeUrl=link.value.trim();
          if(safeUrl&&!/^https?:\/\/[^\s]+$/i.test(safeUrl)){notify('관련 링크는 http/https만 지원해요.');return;}
          await bridge.sharingEditShared(r.id,Number(r.revision),{
            id:'remote-edit',title:title.value,start:start.value,end:end.value,
            description:description.value,status:originalSharedStatus==='done'&&!sharedStatusChanged?'done':status.value,color:r.event_data?.color||'#5367e8',
            url:safeUrl,checklist,gameName:r.event_data?.gameName||''
          });
          await refresh();await detailLoad();notify('수정된 일정이 동료에게 동기화됩니다.');
        },'btn primary');
      }
      if(!isMine(r))btn(section,'내 캘린더에서 공유 일정 제거',async()=>{
        if(!confirm('이 공유 일정에서 나갈까요?'))return;
        await bridge.sharingLeave(r.id);selectedId=null;await refresh();notify('일정 공유에서 나왔어요.');
      },'btn sm danger');
      if(details.history.length){
        const hist=line(section,'div','','share-history');line(hist,'strong','최근 활동');
        for(const h of details.history.slice(0,6))line(hist,'small',`${h.action} · ${new Date(h.created_at).toLocaleString('ko-KR')} ${h.revision?'(v'+h.revision+')':''}`);
      }
    }
    function renderOwnerSettings(parent,r){
      const section=line(parent,'section','','share-section');
      line(section,'h3','참여자 및 공유 권한','share-heading');
      for(const m of details.members){
        const row=line(section,'div','','share-list-item');
        const info=line(row,'div','','share-list-copy');line(info,'strong',m.email);
        roleMenu(row,m.role,async next=>{
          if(!confirm(m.email+' 권한을 변경할까요?'))return;
          try{await bridge.sharingRole(r.id,m.user_id,next);await detailLoad();notify('편집 권한을 변경했어요.');}
          catch(e){notify(e?.message||'권한 변경 실패');await detailLoad();}
        });
        btn(row,'내보내기',async()=>{
          if(!confirm(m.email+'의 참여 권한을 취소할까요?'))return;
          await bridge.sharingRemoveMember(r.id,m.user_id);await detailLoad();notify('참여자를 제거했어요.');
        },'btn sm danger');
      }
      line(section,'h3','등록된 동료에게 초대 보내기','share-heading');
      hint(section,'동료별 보기/편집 권한을 설정한 후 한 번에 초대해요. 로그인한 상대방의 받은 초대함에 나타납니다.');
      const picks=[];
      const search=field(section,'동료 닉네임 또는 이메일 검색');
      const groupChoices=line(section,'div','','share-group-picker');
      const groupSelect=line(groupChoices,'select','','share-input share-group-select');
      groupSelect.setAttribute('aria-label','초대할 동료 그룹');
      const empty=line(groupSelect,'option','그룹 선택');empty.value='';
      for(const name of [...new Set(contacts.map(c=>c.group_name).filter(Boolean))].sort()){
        const option=line(groupSelect,'option',`${name} (${contacts.filter(c=>c.group_name===name).length}명)`);option.value=name;
      }
      btn(groupChoices,'+ 그룹 추가',()=>{
        const groupName=groupSelect.value;
        if(!groupName||picks.some(p=>p.groupName===groupName))return;
        const emails=new Set(contacts.filter(c=>c.group_name===groupName).map(c=>c.email.toLowerCase()));
        const next=picks.filter(p=>p.groupName||!emails.has((p.email||'').toLowerCase()));
        next.push({groupName,role:'viewer'});
        if(resolvedDraftRecipients(next).length>20){notify('한 일정에는 최대 20명까지 초대할 수 있어요.');return;}
        picks.splice(0,picks.length,...next);groupSelect.value='';draw();
      },'btn sm share-contact-add');
      if(!contacts.some(c=>c.group_name))groupChoices.hidden=true;
      const results=line(section,'div','','share-picker-results');
      const picked=line(section,'div','','share-picks');
      function draw(){
        results.replaceChildren();picked.replaceChildren();
        const q=search.value.trim().toLowerCase();
        const selectedEmails=new Set(resolvedDraftRecipients(picks).map(p=>p.email));
        if(q)for(const c of contacts.filter(x=>!selectedEmails.has(x.email.toLowerCase())&&(
          x.nickname.toLowerCase().includes(q)||x.email.toLowerCase().includes(q)
        )).slice(0,5)){
          btn(results,'+ '+c.nickname+' ('+c.email+')',()=>{
            if(resolvedDraftRecipients([...picks,{email:c.email,nickname:c.nickname,role:'viewer'}]).length>20){notify('한 일정에는 최대 20명까지 초대할 수 있어요.');return;}
            picks.push({email:c.email,nickname:c.nickname,role:'viewer'});search.value='';draw();
          },'btn sm share-contact-add');
        }
        if(picks.length)line(picked,'div',`선택됨: ${picks.length}개 항목 · ${resolvedDraftRecipients(picks).length}명`,'share-pick-summary');
        for(const p of picks){
          const row=line(picked,'div','','share-pick-row');
          const info=line(row,'div','','share-pick-info');
          line(info,'strong',p.groupName?'그룹: '+p.groupName:p.nickname);
          if(p.groupName)line(info,'small',`${contacts.filter(c=>c.group_name===p.groupName).length}명 전체 초대`);
          else line(info,'small',p.email);
          roleMenu(row,p.role,v=>{p.role=v;});
          const remove=btn(row,'×',()=>{picks.splice(picks.indexOf(p),1);draw();},'btn sm share-pick-remove');
          remove.setAttribute('aria-label',(p.groupName||p.nickname)+' 초대 제거');
        }
      }
      search.addEventListener('input',draw);draw();
      btn(section,'선택한 그룹/동료 초대 확인',async()=>{
        const recipients=resolvedDraftRecipients(picks);
        if(!recipients.length){notify('동료 또는 그룹을 선택해 주세요.');return;}
        if(recipients.length>20){notify('한 일정에는 최대 20명까지 초대할 수 있어요.');return;}
        await bridge.sharingInviteContacts(r.id,recipients);
        await refresh();await detailLoad();notify(recipients.length+'명에게 일정 초대를 전송했어요.');
      },'btn primary');
      if(details.invites?.length){
        line(section,'h3','보낸 초대','share-heading');
        for(const i of details.invites){
          const row=line(section,'div','','share-list-item');
          const info=line(row,'div','','share-list-copy');line(info,'strong',i.invited_email);
          line(info,'small',`${i.status} · ${i.role==='editor'?'편집 가능':'보기만'}`);
          if(i.status==='pending')btn(row,'취소',async()=>{await bridge.sharingCancelInvite(i.id);await detailLoad();},'btn sm');
        }
      }
      const legacy=line(section,'div','','share-options');
      btn(legacy,'1회용 코드 생성',async()=>{
        const result=await bridge.sharingInvite(r.id);
        $('sharingGeneratedCode').value=result.token;$('sharingGeneratedLink').value=result.link;
        $('sharingGenerated').hidden=false;notify('1회용 코드가 생성됐어요.');
      });
      btn(legacy,'코드 초대 취소',async()=>{await bridge.sharingRevoke(r.id);notify('남은 초대 코드를 취소했어요.');});
      hint(section,'공유 중단은 내 PC의 원본 일정을 남깁니다. 원본까지 삭제하려면 아래 일정 삭제를 사용하세요.');
      btn(section,'이 일정 공유 중단',async()=>{
        if(!confirm('모든 참여자의 캘린더에서 공유 일정을 제거할까요?'))return;
        await bridge.sharingUnshare(r.id);selectedId=null;await refresh();notify('공유를 중단했어요.');
      },'btn sm danger');
      btn(section,'일정 삭제 (내 PC + 공유)',async()=>{await deleteOwned(r);},'btn sm danger');
    }
    function render(){
      if(!opened)return;content.replaceChildren();
      if(!session.signedIn){
        line(content,'h3','이메일로 로그인','share-heading');
        hint(content,'이메일 인증을 완료해야 동료 연락처와 일정 공유를 사용할 수 있어요.');
        const email=field(content,'이메일 주소','','email');email.autocomplete='email';
        btn(content,'인증번호 보내기',async()=>{const result=await bridge.sharingRequestOtp(email.value);pending=result.email;render();notify('이메일의 6자리 인증번호를 확인해 주세요.');},'btn primary');
        if(pending){
          hint(content,pending+'으로 보낸 인증번호를 입력하세요.');
          const code=field(content,'6자리 인증번호');code.inputMode='numeric';code.maxLength=8;
          btn(content,'로그인',async()=>{
            session=await bridge.sharingVerifyOtp(pending,code.value);pending='';await refresh();render();notify('로그인이 완료됐어요.');
          },'btn primary');
        }
        return;
      }
      const account=line(content,'div','로그인: '+session.email,'share-account');
      btn(account,'로그아웃',async()=>{session=await bridge.sharingSignOut();rows=[];inbox=[];contacts=[];onRemoteEvents([]);render();renderEventPicker();});
      const r=selectedRow();
      if(r){
        btn(content,'← 초대함 및 연락처 보기',()=>{selectedId=null;render();});
        renderEditor(content,r);
        if(isMine(r))renderOwnerSettings(content,r);
        return;
      }
      if(selectedId&&!r){
        const selected=getEvent(selectedId);
        if(selected){
          line(content,'h3',selected.title,'share-heading');
          btn(content,'이 일정 공유 시작',async()=>{
            if(!confirm('제목, 날짜, 상세 메모, 체크리스트, 관련 링크를 공유 서버에 저장할까요?'))return;
            await bridge.sharingPublish(selected);await refresh();await detailLoad();notify('공유 일정이 준비됐어요.');
          },'btn primary');
        }
      }
      renderInbox(content);
      const codeSection=fold(content,'legacy','기존 초대 코드 수락',!!pendingInvite);
      hint(codeSection,'기존 방식으로 받은 64자리 초대 코드도 계속 사용할 수 있어요.');
      const code=field(codeSection,'초대 코드 또는 kuuns-kanban://invite/...',pendingInvite);
      const accept=btn(codeSection,'초대 수락',async()=>{
        if(!code.value.trim())return;
        await bridge.sharingAccept(code.value.trim());pendingInvite='';await bridge.sharingConsumeInvite();
        await refresh();notify('공유 일정이 캘린더에 표시됩니다.');
      },'btn sm primary');
      accept._isBlocked=()=>!code.value.trim();
      function updateAcceptState(){accept.disabled=accept._isBlocked();accept.title=accept.disabled?'초대 코드를 입력하면 버튼이 활성화돼요.':'초대 코드 수락';}
      code.addEventListener('input',updateAcceptState);updateAcceptState();
      const listing=fold(content,'shared',`공유된 일정 (${rows.length})`);
      btn(listing,'새로고침',async()=>{await refresh();notify('동기화가 완료됐어요.');});
      if(!rows.length)hint(listing,'아직 공유된 일정이 없어요.');
      for(const item of rows){
        const row=line(listing,'div','','share-list-item');
        const info=line(row,'div','','share-list-copy');
        line(info,'strong',item.title);line(info,'small',`${item.start_date} ~ ${item.end_date} · ${isMine(item)?'작성자':remoteRole(item)==='editor'?'편집 가능':'읽기 전용'}`);
        const actions=line(row,'div','','share-list-actions');
        btn(actions,'관리/보기',async()=>{selectedId='shared:'+item.id;render();await detailLoad();});
        if(isMine(item))btn(actions,'일정 삭제',async()=>{await deleteOwned(item);},'btn sm danger');
      }
      renderContacts(fold(content,'contacts',`동료 관리 (${contacts.length})`));
    }
    $('sharingClose').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    $('sharingCopyCode').addEventListener('click',async()=>{
      try{await bridge.sharingCopyInvite($('sharingGeneratedCode').value);notify('초대 코드가 복사됐어요.');}
      catch{$('sharingGeneratedCode').select();notify('코드를 선택했어요. 복사해서 전달하세요.');}
    });
    async function initialize(){
      session=await bridge.sharingStatus();
      if(session.signedIn)try{await refresh();}catch(e){notify('공유 연결 실패: '+e.message);}
      const inv=await bridge.sharingPendingInvite();if(inv)pendingInvite=inv;
      bridge.onSharingInvite?.(code=>{pendingInvite=code;selectedId=null;open();});
      if(pendingInvite)open();
      window.addEventListener('focus',()=>{if(session.signedIn)void refresh().catch(()=>{});});
      setInterval(()=>{if(session.signedIn)void refresh().catch(()=>{});},120000);
    }
    void initialize().catch(e=>notify('공유 기능 준비 실패: '+e.message));
    return {open,openRemote,close,refresh,getOwnedRow:ownedRow,resetDraft,draftItems,
      renderEventPicker,saveAndInvite,syncEditedEvent,handleLocalDelete};
  }
  root.KuunsSharing={createSharingUI};
})(window);
