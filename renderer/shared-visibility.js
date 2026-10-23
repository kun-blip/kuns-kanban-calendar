'use strict';
/* Shared calendar helpers: remote-only fallback and owner-verified delete. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KuunsSharedVisibility=api;
})(typeof window!=='undefined'?window:undefined,function(){
  function remoteRows(rows,localEvents,userId){
    const localIds=new Set((Array.isArray(localEvents)?localEvents:[]).map(e=>e?.id));
    return (Array.isArray(rows)?rows:[]).filter(row=>
      row && (row.owner_id!==userId || !row.local_event_id || !localIds.has(row.local_event_id))
    );
  }
  async function deleteOwnedEvent(row,userId,deleteRemote,deleteLocal){
    if(!row?.id || !userId || row.owner_id!==userId)throw new Error('일정 작성자만 삭제할 수 있어요.');
    // PostgREST DELETE with `Prefer: return=representation` must return the deleted row.
    // An empty response means RLS denied deletion: never erase the local copy in that case.
    const deleted=await deleteRemote(row.id);
    if(!Array.isArray(deleted)||!deleted.some(item=>item?.id===row.id)){
      throw new Error('공유 일정이 서버에서 삭제되지 않았어요. 로그인과 권한을 확인해 주세요.');
    }
    if(row.local_event_id)await deleteLocal(row.local_event_id);
    return true;
  }
  return {remoteRows,deleteOwnedEvent};
});
