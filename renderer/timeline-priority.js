'use strict';
(function(root){
  // Assign lanes in shared-first order so compact view does not hide shared
  // schedules beneath personal blocks when many events overlap.
  function compare(a,b,isShared){
    return Number(!!isShared(b.e))-Number(!!isShared(a.e))
      || a.startIndex-b.startIndex
      || (b.endIndex-b.startIndex)-(a.endIndex-a.startIndex)
      || String(a.e.title||'').localeCompare(String(b.e.title||''));
  }
  function order(segments,isShared){return [...segments].sort((a,b)=>compare(a,b,isShared));}
  root.KuunsTimelinePriority={compare,order};
})(typeof window!=='undefined'?window:globalThis);
