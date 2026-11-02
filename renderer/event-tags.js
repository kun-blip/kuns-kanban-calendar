/* Optional per-event title tags. No HTML injection or external dependencies. */
(function(root,factory){
 const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KuunsEventTags=api;
})(typeof window!=='undefined'?window:undefined,function(){
 'use strict';
 const legacyLabels=['검수','출시','빌드'];
 const defaults={'검수':'#34795e','출시':'#168ab8','빌드':'#a86a32'};
 const color=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toLowerCase():null;
 const validName=n=>/^[\p{L}\p{N}_-]{1,20}$/u.test(n);
 function clean(list){
  const out=[];const used=new Set();
  for(const value of Array.isArray(list)?list:[]){
   const name=String(value?.name||'').trim();if(!validName(name)||used.has(name))continue;
   used.add(name);out.push({name,color:color(value.color)||defaults[name]||'#526aa6'});
   if(out.length===8)break;
  }return out;
 }
 // Complete tokens only: @검수 followed by whitespace/end; in live input end requires explicit commit.
 function extract(title,existing=[],commitEnd=false){
  let rest=String(title||'');const tags=clean(existing);
  const pattern=/(^|\s)@([\p{L}\p{N}_-]{1,20})(?=\s|$)/gu;
  let consumed=false;
  rest=rest.replace(pattern,(full,prefix,name,index,source)=>{
   // Keep the word being composed until a separating space or explicit save.
   if(index+full.length===source.length&&!commitEnd)return full;
   const present=tags.some(t=>t.name===name);
   // Never discard an uncommitted token because the tag limit was reached.
   if(!present&&tags.length>=8)return full;
   if(!present)tags.push({name,color:defaults[name]||'#526aa6'});
   consumed=true;
   return prefix;
  });
  return {title:consumed?rest.replace(/\s{2,}/g,' ').trimStart():rest,tags};
 }
 function legacyTags(title,tags){
  const result=clean(tags);let rest=String(title||'');
  for(const label of legacyLabels){const prefix='['+label+']';if(rest.startsWith(prefix)){
    if(!result.some(t=>t.name===label))result.push({name:label,color:defaults[label]});
    rest=rest.slice(prefix.length).trimStart();
  }}return {title:rest,tags:result};
 }
 return {defaults,clean,extract,legacyTags};
});
