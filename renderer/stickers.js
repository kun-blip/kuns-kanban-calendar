'use strict';
/* Shared custom stickers: metadata and placements live on the authenticated server. */
(function(root){
 function createStickerUI({bridge,notify,onCalendarUpdate}){
  const $=id=>document.getElementById(id);
  const overlay=$('stickerOverlay'),grid=$('stickerLibraryGrid'),marksHost=$('stickerActiveMarks'),status=$('stickerStatus');
  const imageCache=new Map();let stickers=[],dateMarks=[],mode='library',target=null,ownerId=null,loggedIn=false,opened=false,busy=false;
  let dateRange='',dateReadAt=0,registryReadAt=0;
  const byId=id=>stickers.find(s=>s.id===id);
  const activeMarks=new Map();
  function msg(value){status.textContent=value||'';}
  function line(parent,tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;parent.appendChild(el);return el;}
  function action(parent,text,handler,cls='btn sm'){
    const b=line(parent,'button',text,cls);b.type='button';b.addEventListener('click',async()=>{
      if(busy)return;busy=true;b.disabled=true;
      try{await handler();}catch(err){msg(err?.message||'스티커 작업을 완료하지 못했어요.');notify(err?.message||'스티커 작업 실패');}
      finally{busy=false;b.disabled=false;}
    });return b;
  }
  async function ensureSignIn(){
    if(!bridge?.stickerList)return false;
    const s=await bridge.sharingStatus();ownerId=s?.userId||null;loggedIn=!!s?.signedIn;
    if(!loggedIn){msg('스티커를 공유하려면 일정 공유 메뉴에서 이메일 로그인을 해주세요.');}
    return loggedIn;
  }
  async function refreshRegistry(force=false){
    if(!await ensureSignIn())return;
    if(!force&&registryReadAt&&Date.now()-registryReadAt<60000)return;
    const rows=await bridge.stickerList();stickers=Array.isArray(rows)?rows:[];registryReadAt=Date.now();
  }
  async function refreshDates(start,end,force=false){
    if(!bridge?.stickerMarks||!/^\d{4}-\d\d-\d\d$/.test(start)||!/^\d{4}-\d\d-\d\d$/.test(end))return;
    if(!await ensureSignIn())return;
    if(!force&&dateRange===start+'|'+end&&Date.now()-dateReadAt<30000)return;
    try{
      await refreshRegistry();
      const result=await bridge.stickerMarks({start,end});dateMarks=Array.isArray(result)?result:[];
      dateRange=start+'|'+end;dateReadAt=Date.now();onCalendarUpdate?.();
    }catch(e){notify('스티커를 불러오지 못했어요. '+e.message);}
  }
  async function readImage(id){
    if(!imageCache.has(id))imageCache.set(id,bridge.stickerImage(id).catch(()=>''));
    return imageCache.get(id);
  }
  function mountImage(parent,id,cls='sticker-image'){
    const img=document.createElement('img');img.alt=byId(id)?.name||'스티커';img.className=cls;img.loading='lazy';parent.appendChild(img);
    const show=()=>readImage(id).then(src=>{if(src&&img.isConnected)img.src=src;}).catch(()=>{});
    if(typeof IntersectionObserver==='function'){
      const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();void show();}},{rootMargin:'120px'});
      observer.observe(img);
    }else void show();
    return img;
  }
  function renderDate(cell,date){
    if(!loggedIn||!bridge?.stickerMarks)return;
    const entries=dateMarks.filter(m=>m.target_date===date),button=line(cell,'button',undefined,'date-sticker-button');
    button.type='button';button.title=date+' 스티커 붙이기';button.setAttribute('aria-label',date+' 날짜 스티커 보기 및 붙이기');
    if(!entries.length){button.classList.add('sticker-empty');button.textContent='＋';}
    else{
      for(const item of entries.slice(0,2))mountImage(button,item.sticker_id,'date-sticker-img');
      if(entries.length>2)line(button,'small','+'+(entries.length-2));
    }
    button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();void openDate(date);});
  }
  function setOpen(next){opened=next;overlay.hidden=!next;}
  function close(){setOpen(false);target=null;}
  function setTitle(text){$('stickerTitle').textContent=text;}
  async function openLibrary(){mode='library';target=null;setTitle('우리 팀 스티커함');setOpen(true);await draw();}
  async function openDate(date){mode='date';target={date};setTitle(date+' · 날짜 스티커');setOpen(true);await draw();}
  async function openEvent(eventId){mode='event';target={eventId};setTitle('일정 리액션 스티커');setOpen(true);await draw();}
  async function loadMarks(){
    if(mode==='library')return [];
    if(mode==='event')return bridge.stickerMarks({eventId:target.eventId});
    return bridge.stickerMarks({start:target.date,end:target.date});
  }
  function renderAssigned(items){
    marksHost.replaceChildren();marksHost.hidden=mode==='library';
    if(mode==='library')return;
    line(marksHost,'strong',mode==='date'?'이 날짜에 붙인 스티커':'이 일정의 리액션','sticker-subheading');
    if(!items.length)line(marksHost,'p','아직 스티커가 없어요. 첫 번째 스티커를 붙여보세요!','sticker-helper');
    const row=line(marksHost,'div',undefined,'sticker-assigned-list');
    for(const mark of items){
      const item=line(row,'div',undefined,'sticker-assigned-item');mountImage(item,mark.sticker_id);
      const label=mark.actor_id===ownerId?'나':mark.actor_email||'동료';line(item,'small',label);
      if(mark.actor_id===ownerId)action(item,'×',async()=>{await bridge.stickerUnplace(mark.id);await refreshMarksAfterAction();},'sticker-remove');
    }
  }
  async function draw(){
    msg('');grid.replaceChildren();marksHost.replaceChildren();
    $('stickerUploadForm').hidden=false;
    $('stickerUploadHint').textContent='전체 동료가 함께 쓰는 스티커 · PNG, WebP, GIF · 최대 2MB';
    if(!await ensureSignIn()){grid.textContent='로그인 후 스티커를 불러올 수 있어요.';marksHost.hidden=true;$('stickerUploadForm').hidden=true;return;}
    msg('불러오는 중…');
    try{await refreshRegistry();const items=await loadMarks();if(!opened)return;activeMarks.clear();for(const mark of items)activeMarks.set(mark.sticker_id+'|'+mark.actor_id,mark);
      renderAssigned(items);grid.replaceChildren();
      if(!stickers.length)line(grid,'p','아직 스티커가 없어요. 아래에서 첫 스티커를 등록해보세요.','sticker-helper');
      for(const sticker of stickers){
        const tile=line(grid,'div',undefined,'sticker-tile');tile.dataset.search=sticker.name.toLocaleLowerCase();
        const pick=line(tile,'button',undefined,'sticker-pick');pick.type='button';pick.title=sticker.name;
        mountImage(pick,sticker.id);line(pick,'span',sticker.name);
        if(mode==='library')pick.disabled=true;
        else{
          const mine=activeMarks.has(sticker.id+'|'+ownerId);if(mine)pick.classList.add('sticker-selected');
          pick.addEventListener('click',async()=>{
            if(busy)return;busy=true;pick.disabled=true;
            try{
              if(mine)await bridge.stickerUnplace(activeMarks.get(sticker.id+'|'+ownerId).id);
              else await bridge.stickerPlace(sticker.id,mode==='date'?{date:target.date}:{eventId:target.eventId});
              await refreshMarksAfterAction();
            }catch(err){msg(err?.message||'스티커를 적용할 수 없어요.');notify(err?.message||'스티커 적용 실패');}
            finally{busy=false;}
          });
        }
        const sub=line(tile,'div',undefined,'sticker-tile-footer');line(sub,'small',sticker.uploader_id===ownerId?'내 스티커':'공용 스티커');
        if(sticker.uploader_id===ownerId)action(sub,'삭제',async()=>{
          if(!confirm('이 스티커를 팀 라이브러리에서 삭제할까요? 이미 붙인 스티커도 함께 삭제돼요.'))return;
          await bridge.stickerDelete(sticker.id);imageCache.delete(sticker.id);registryReadAt=0;dateReadAt=0;
          if(dateRange){const [from,to]=dateRange.split('|');await refreshDates(from,to,true);}
          await draw();if(mode==='event'&&target?.eventId)document.querySelectorAll('.sticker-event-reactions[data-event-id="'+target.eventId+'"]').forEach(el=>void renderReactionGroup(el,target.eventId));
          notify('스티커를 삭제했어요.');
        },'sticker-delete');
      }
      filterLibrary();msg('');
    }catch(err){msg('스티커를 불러오지 못했어요. '+(err?.message||''));}
  }
  function filterLibrary(){const query=$('stickerSearch').value.trim().toLocaleLowerCase();for(const item of grid.querySelectorAll('.sticker-tile'))item.hidden=!!query&&!item.dataset.search.includes(query);}
  async function refreshMarksAfterAction(){
    if(mode==='date'){
      dateReadAt=0;const {date}=target;await refreshDates(dateRange?.split('|')[0]||date,dateRange?.split('|')[1]||date,true);
    }
    await draw();
    if(mode==='event'&&target?.eventId)document.querySelectorAll('.sticker-event-reactions[data-event-id="'+target.eventId+'"]').forEach(el=>void renderReactionGroup(el,target.eventId));
  }
  async function renderReactionGroup(holder,eventId){
    const list=holder.querySelector('.sticker-reaction-list');
    if(!list)return;
    try{
      if(!await ensureSignIn())return;await refreshRegistry();const entries=await bridge.stickerMarks({eventId});if(!holder.isConnected)return;
      list.replaceChildren();if(!entries.length){line(list,'small','아직 리액션이 없어요.');return;}
      const groups=new Map();for(const item of entries){const g=groups.get(item.sticker_id)||[];g.push(item);groups.set(item.sticker_id,g);}
      for(const [id,group] of groups){const tile=line(list,'div',undefined,'sticker-reaction-badge');mountImage(tile,id);line(tile,'span','×'+group.length);tile.title=group.map(x=>x.actor_email||'동료').join(', ');}
    }catch{list.textContent='스티커 리액션을 불러오지 못했어요.';}
  }
  function attachEventReactions(section,eventId){
    if(!bridge?.stickerMarks)return;
    const holder=line(section,'div',undefined,'sticker-event-reactions');holder.dataset.eventId=eventId;
    const header=line(holder,'div',undefined,'sticker-reaction-title');line(header,'strong','스티커 리액션');
    action(header,'＋ 스티커 붙이기',()=>openEvent(eventId),'btn sm');
    const list=line(holder,'div',undefined,'sticker-reaction-list');line(list,'span','불러오는 중…','sticker-helper');
    void renderReactionGroup(holder,eventId);
  }
  function onAuthChanged(){
    stickers=[];dateMarks=[];imageCache.clear();registryReadAt=0;dateReadAt=0;dateRange='';loggedIn=false;ownerId=null;
    close();onCalendarUpdate?.();
  }
  async function initialize(){
    $('stickerLaunch')?.addEventListener('click',()=>void openLibrary());
    $('stickerClose')?.addEventListener('click',close);
    $('stickerSearch')?.addEventListener('input',filterLibrary);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.stopPropagation();close();}});
    $('stickerUploadForm')?.addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;
      const file=$('stickerFile').files?.[0];if(!file){msg('스티커 이미지를 선택해 주세요.');return;}
      if(file.size>2*1024*1024){msg('스티커는 2MB 이내여야 합니다.');return;}
      if(!['image/png','image/webp','image/gif'].includes(file.type)){msg('PNG, WebP, GIF만 지원해요.');return;}
      const title=$('stickerName').value.trim()||file.name.replace(/\.[^.]+$/,'').slice(0,32);
      busy=true;$('stickerUploadBtn').disabled=true;msg('스티커 업로드 중…');
      try{
        const dataUrl=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(Error('이미지를 읽지 못했어요.'));fr.readAsDataURL(file);});
        await bridge.stickerUpload(title,dataUrl);$('stickerFile').value='';$('stickerName').value='';registryReadAt=0;
        await draw();notify('스티커가 팀 전체 스티커함에 등록됐어요.');
      }catch(err){msg(err?.message||'업로드하지 못했어요.');}finally{busy=false;$('stickerUploadBtn').disabled=false;}
    });
    try{await refreshRegistry();}catch{};
  }
  return {initialize,refreshDates,renderDate,attachEventReactions,openLibrary,openDate,openEvent,close,onAuthChanged};
 }
 root.KuunsStickers={createStickerUI};
 if(typeof module==='object'&&module.exports)module.exports={createStickerUI};
})(typeof window!=='undefined'?window:globalThis);
