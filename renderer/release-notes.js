'use strict';
// Release notes are separate from update downloads and calendar data.
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root && root.document && root.kuunsDesktop) api.initReleaseNotes(root,root.document,root.kuunsDesktop);
})(typeof window === 'undefined' ? null : window, function() {
  function shouldPrompt({pending, visible=true, blocked=false}={}) {
    return Boolean(pending && visible && !blocked);
  }
  function initReleaseNotes(win,doc,bridge) {
    const el = id => doc.getElementById(id);
    const overlay=el('releaseNotesOverlay'), manualButton=el('releaseNotesOpen');
    const closeButton=el('releaseNotesClose'), doneButton=el('releaseNotesDone');
    const title=el('releaseNotesTitle'), subtitle=el('releaseNotesSubtitle');
    const versionSelect=el('releaseNotesVersion'), list=el('releaseNotesList');
    const status=el('releaseNotesStatus');
    if(!overlay||!manualButton||!closeButton||!doneButton||!versionSelect||!list||!status||
      !bridge?.getReleaseNotesStartup||!bridge?.getReleaseNotesCatalog||!bridge?.acknowledgeReleaseNotes) return null;
    overlay.dataset.pending='true'; // block update-available popup during async startup detection
    let catalog={}, currentVersion='', pendingVersion='', showingAutomatic=false;
    let ready=false, busy=false, visibleBefore=null;
    const notify=()=>doc.dispatchEvent(new Event('release-notes:changed'));
    function setPendingFlag(){overlay.dataset.pending=pendingVersion?'true':'false';notify();}
    function isBlocked() {
      const ids=['welcomeOverlay','feedbackOverlay','updateOverlay','sharingOverlay','shade','eventModal'];
      return ids.some(id=>{const node=el(id);return node&&(!node.hidden||node.dataset?.pending==='true');}) ||
        Boolean(doc.activeElement&&(['INPUT','TEXTAREA','SELECT'].includes(doc.activeElement.tagName)||doc.activeElement.isContentEditable));
    }
    function renderVersion(version) {
      const note=catalog[version];
      if(!note||!Array.isArray(note.items)) return;
      title.textContent=`v${version} 업데이트 패치노트`;
      subtitle.textContent=note.heading||'이번 업데이트에서 달라진 내용을 확인하세요.';
      versionSelect.value=version;
      list.replaceChildren();
      for(const item of note.items) {
        const section=doc.createElement('div');section.className='release-notes-item';
        const strong=doc.createElement('strong');strong.textContent=item.title||'';
        const paragraph=doc.createElement('p');paragraph.textContent=item.description||'';
        section.append(strong,paragraph);list.appendChild(section);
      }
    }
    function open(version=currentVersion,automatic=false){
      if(!catalog[version])return;
      showingAutomatic=automatic && version===pendingVersion;
      visibleBefore=doc.activeElement;
      status.textContent='';
      renderVersion(version);
      overlay.hidden=false;
      overlay.dataset.pending='false';
      closeButton.focus();notify();
    }
    function maybeShow(){
      if(!ready || !catalog[pendingVersion])return;
      if(!shouldPrompt({pending:pendingVersion,visible:!doc.hidden,blocked:isBlocked()}))return;
      open(pendingVersion,true);
    }
    async function close(){
      if(busy)return;
      if(showingAutomatic && pendingVersion){
        busy=true;doneButton.disabled=true;closeButton.disabled=true;
        try {
          const result=await bridge.acknowledgeReleaseNotes(pendingVersion);
          if(!result?.ok)throw new Error(result?.message||'저장할 수 없습니다.');
          pendingVersion='';showingAutomatic=false;
        }catch(error){
          status.textContent=error.message||'확인 상태를 저장하지 못했어요. 다시 시도해 주세요.';
          busy=false;doneButton.disabled=false;closeButton.disabled=false;
          return;
        }
        busy=false;doneButton.disabled=false;closeButton.disabled=false;
      }
      overlay.hidden=true;setPendingFlag();
      if(visibleBefore&&typeof visibleBefore.focus==='function')visibleBefore.focus();
    }
    manualButton.addEventListener('click',()=>open(currentVersion,false));
    closeButton.addEventListener('click',()=>{void close();});
    doneButton.addEventListener('click',()=>{void close();});
    versionSelect.addEventListener('change',()=>renderVersion(versionSelect.value));
    overlay.addEventListener('click',event=>{if(event.target===overlay)void close();});
    doc.addEventListener('keydown',event=>{
      if(overlay.hidden)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();void close();}
      if(event.key==='Tab'){
        const controls=[closeButton,versionSelect,doneButton].filter(node=>!node.disabled);
        if(event.shiftKey&&doc.activeElement===controls[0]){event.preventDefault();controls.at(-1).focus();}
        else if(!event.shiftKey&&doc.activeElement===controls.at(-1)){event.preventDefault();controls[0].focus();}
      }
    });
    win.addEventListener('focus',maybeShow);
    doc.addEventListener('visibilitychange',maybeShow);
    doc.addEventListener('welcome:changed',maybeShow);
    doc.addEventListener('click',()=>setTimeout(maybeShow,0));
    doc.addEventListener('focusout',()=>setTimeout(maybeShow,0));
    Promise.all([bridge.getReleaseNotesStartup(),bridge.getReleaseNotesCatalog()]).then(([startup,info])=>{
      currentVersion=info?.currentVersion||'';
      catalog=info?.releases||{};
      versionSelect.replaceChildren();
      for(const version of Object.keys(catalog).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}))){
        const option=doc.createElement('option');option.value=version;option.textContent=`v${version}`;
        versionSelect.appendChild(option);
      }
      pendingVersion=startup?.shouldShow&&startup?.version===currentVersion?currentVersion:'';
      manualButton.disabled=!catalog[currentVersion];
      ready=true;
      if(pendingVersion){maybeShow();}
      else{setPendingFlag();}
    }).catch(()=>{ready=true;pendingVersion='';manualButton.disabled=true;setPendingFlag();});
    return {open,close,maybeShow,getState:()=>({pendingVersion,visible:!overlay.hidden})};
  }
  return {shouldPrompt,initReleaseNotes};
});
