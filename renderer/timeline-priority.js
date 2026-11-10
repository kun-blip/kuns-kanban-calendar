'use strict';
(function(root){
  function titleOf(segment){
    return String(segment?.e?.title||'');
  }
  function manualOrderOf(event){
    return Number.isFinite(event?.timelineOrder)?event.timelineOrder:null;
  }
  function compare(a,b,isShared){
    const aManual=Number.isFinite(a?.timelineOrder)?a.timelineOrder:manualOrderOf(a?.e);
    const bManual=Number.isFinite(b?.timelineOrder)?b.timelineOrder:manualOrderOf(b?.e);
    if(aManual!==null||bManual!==null){
      if(aManual===null)return 1;
      if(bManual===null)return -1;
      if(aManual!==bManual)return aManual-bManual;
    }
    return Number(!!isShared(b.e))-Number(!!isShared(a.e))
      || a.startIndex-b.startIndex
      || (b.endIndex-b.startIndex)-(a.endIndex-a.startIndex)
      || titleOf(a).localeCompare(titleOf(b));
  }
  function order(segments,isShared){
    return [...segments].sort((a,b)=>compare(a,b,isShared));
  }
  function overlap(a,b){
    return a.startIndex<=b.endIndex && b.startIndex<=a.endIndex;
  }
  function chronology(a,b){
    return a.startIndex-b.startIndex
      || a.endIndex-b.endIndex
      || titleOf(a).localeCompare(titleOf(b));
  }
  function clusterSegments(segments){
    const ordered=[...segments].sort(chronology);
    const clusters=[];
    let current=[];
    let maxEnd=-1;
    for(const segment of ordered){
      if(!current.length || segment.startIndex<=maxEnd){
        current.push(segment);
        if(segment.endIndex>maxEnd)maxEnd=segment.endIndex;
        continue;
      }
      clusters.push(current);
      current=[segment];
      maxEnd=segment.endIndex;
    }
    if(current.length)clusters.push(current);
    return clusters;
  }
  // Pinned display rows are visual preferences; never change the event's dates or permissions.
  // An explicit row preference works even when the segment has no overlapping neighbor.
  function assignLanes(segments,isShared){
    const prepared=segments.map(segment=>({...segment}));
    const clusters=clusterSegments(prepared);
    const placed=[];
    let laneCount=0;
    clusters.forEach((cluster,clusterIndex)=>{
      const lanes=[];
      const pinned=cluster.filter(s=>Number.isInteger(s.preferredLane)&&s.preferredLane>=0&&s.preferredLane<=9)
        .sort((a,b)=>a.preferredLane-b.preferredLane||compare(a,b,isShared));
      const automatic=order(cluster.filter(s=>!pinned.includes(s)),isShared);
      for(const segment of [...pinned,...automatic]){
        let lane=pinned.includes(segment)?segment.preferredLane:0;
        while(lanes[lane]?.some(other=>overlap(other,segment)))lane++;
        if(!lanes[lane])lanes[lane]=[];
        lanes[lane].push(segment);
        segment.lane=lane;
        segment.clusterIndex=clusterIndex;
        placed.push(segment);
        laneCount=Math.max(laneCount,lane+1);
      }
    });
    return {segments:placed,segs:placed,lanes:laneCount,clusters};
  }
  root.KuunsTimelinePriority={compare,order,overlap,clusterSegments,assignLanes};
})(typeof window!=='undefined'?window:globalThis);
