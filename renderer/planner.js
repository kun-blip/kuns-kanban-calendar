/* Shared, local-only date planning helpers. No network or framework dependency. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KuunsPlanner=api;
})(typeof window!=='undefined'?window:undefined,function(){
  const valid=k=>/^\d{4}-\d{2}-\d{2}$/.test(k||'')&&!Number.isNaN(Date.parse(k+'T00:00:00Z'));
  const utc=k=>new Date(k+'T12:00:00Z');
  const key=d=>d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');
  function add(k,n){if(!valid(k)||!Number.isFinite(n))return k;const d=utc(k);d.setUTCDate(d.getUTCDate()+n);return key(d);}
  function days(a,b){return valid(a)&&valid(b)?Math.round((utc(b)-utc(a))/86400000):0;}
  function monthly(k,n){const d=utc(k),firstDay=d.getUTCDate(),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n+1,0));const nd=Math.min(firstDay,target.getUTCDate());return key(new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth(),nd)));}
  function week(k){return add(k,-utc(k).getUTCDay());}
  function expand(events,from,to){
    const out=[];
    for(const event of events){
      if(!event||!valid(event.start)||!valid(event.end)||event.end<event.start)continue;
      const duration=days(event.start,event.end),rule=event.recurrence||'none';
      if(rule==='none'){if(event.start<=to&&event.end>=from)out.push(event);continue;}
      const until=valid(event.recurrenceUntil)?event.recurrenceUntil:add(event.start,365*3);
      const cap=rule==='weekly'?520:120;
      for(let n=0;n<cap;n++){
        const start=rule==='weekly'?add(event.start,7*n):monthly(event.start,n);
        if(start>to||start>until)break;
        const end=add(start,duration);
        if(end<from)continue;
        out.push({...event,start,end,seriesId:event.id,occurrenceStart:start,isOccurrence:true});
      }
    }
    return out;
  }
  return {add,days,monthly,week,expand};
});
