/* Persistent, reusable tag definitions. Event records remain independently compatible. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KuunsTagLibrary=api;
})(typeof window!=='undefined'?window:undefined,function(){
 'use strict';
 const MAX=200;
 const VALID=/^[\p{L}\p{N}_-]{1,20}$/u;
 const COLOR=/^#[0-9a-f]{6}$/i;
 const DEFAULT_COLOR='#526aa6';
 const DEFAULT_TEXT_COLOR='#ffffff';
 function normalizeName(value){return String(value||'').replace(/^@/,'').trim();}
 function clean(list){
  const result=[],used=new Set();
  for(const tag of Array.isArray(list)?list:[]){
   const name=normalizeName(tag?.name);
   if(!VALID.test(name)||used.has(name))continue;
   used.add(name);result.push({name,color:COLOR.test(tag?.color||'')?tag.color.toLowerCase():DEFAULT_COLOR,textColor:COLOR.test(tag?.textColor||'')?tag.textColor.toLowerCase():DEFAULT_TEXT_COLOR});
   if(result.length>=MAX)break;
  }return result;
 }
 function initial(events){
   const tags=[]; // Older status labels are not new-tag defaults; keep any genuine event tags.
   for(const event of Array.isArray(events)?events:[]){
     for(const tag of Array.isArray(event?.tags)?event.tags:[])tags.push(tag);
   }
   return clean(tags);
 }
 function withoutUnusedLegacyPresets(list,events){
   const used=new Set((Array.isArray(events)?events:[]).flatMap(event=>(Array.isArray(event?.tags)?event.tags:[]).map(tag=>tag.name)));
   const presets=new Map([['소프트런칭','#34795e'],['라이브','#168ab8']]);
   return clean(list).filter(tag=>used.has(tag.name)||presets.get(tag.name)!==tag.color||tag.textColor!==DEFAULT_TEXT_COLOR);
 }
 function add(list,tag){
   const catalog=clean(list),name=normalizeName(tag?.name);
   if(!VALID.test(name))return {catalog,error:'태그는 공백 없이 한글·영문·숫자·_·-를 사용해 20자 이내로 입력해 주세요.'};
   if(catalog.some(t=>t.name===name))return {catalog,error:'이미 등록된 태그예요.'};
   if(catalog.length>=MAX)return {catalog,error:'저장 가능한 태그는 최대 200개예요.'};
   return {catalog:[...catalog,{name,color:COLOR.test(tag?.color||'')?tag.color.toLowerCase():DEFAULT_COLOR,textColor:COLOR.test(tag?.textColor||'')?tag.textColor.toLowerCase():DEFAULT_TEXT_COLOR}],error:null};
 }
 function remember(list,tags){
   let catalog=clean(list);
   for(const tag of Array.isArray(tags)?tags:[]){
     if(!catalog.some(item=>item.name===tag?.name)){
       catalog=add(catalog,tag).catalog;
     }
   }return catalog;
 }
 function match(list,tags){
   const lookup=new Map(clean(list).map(t=>[t.name,t]));
   return (Array.isArray(tags)?tags:[]).map(tag=>{const saved=lookup.get(tag.name);return {...tag,color:saved?.color||tag.color,textColor:saved?.textColor||(COLOR.test(tag.textColor||'')?tag.textColor.toLowerCase():DEFAULT_TEXT_COLOR)};});
 }
 function update(list,oldName,newName,color,textColor){
   const catalog=clean(list),name=normalizeName(newName),index=catalog.findIndex(x=>x.name===oldName);
   if(index<0)return {catalog,error:'등록된 태그를 찾지 못했어요.'};
   if(!VALID.test(name))return {catalog,error:'태그 이름을 확인해 주세요. (최대 20자, 공백 불가)'};
   if(name!==oldName&&catalog.some(x=>x.name===name))return {catalog,error:'같은 이름의 태그가 있어요.'};
   const nextTextColor=textColor===undefined?catalog[index].textColor:textColor;
   if(!COLOR.test(color||'')||!COLOR.test(nextTextColor||''))return {catalog,error:'태그 배경색과 글자 색상을 확인해 주세요.'};
   catalog[index]={name,color:color.toLowerCase(),textColor:nextTextColor.toLowerCase()};
   return {catalog,error:null};
 }
 function applyUpdate(events,oldName,newTag){
   const changed=[];
   for(const event of Array.isArray(events)?events:[]){
     let touched=false;
     event.tags=(Array.isArray(event.tags)?event.tags:[]).map(tag=>{
       if(tag.name!==oldName)return tag;
       touched=true;return {name:newTag.name,color:newTag.color,textColor:newTag.textColor||DEFAULT_TEXT_COLOR};
     });
     if(touched)changed.push(event);
   }return changed;
 }
 function remove(list,name){return clean(list).filter(tag=>tag.name!==name);}
 return {clean,initial,withoutUnusedLegacyPresets,add,remember,match,update,applyUpdate,remove,normalizeName};
});
