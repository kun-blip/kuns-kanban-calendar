/* Safe attribution and stable invitation history display for shared events. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.KuunsSharedEventMeta=api;
})(typeof window!=='undefined'?window:undefined,function(){
 'use strict';
 const validEmail=value=>typeof value==='string'&&value.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
 function ownerEmail(row,myUserId='',myEmail=''){
   if(row?.owner_id && row.owner_id===myUserId && validEmail(myEmail))return myEmail.toLowerCase();
   const value=row?.event_data?.ownerEmail||row?.event_data?.owner_email||row?.owner_email||'';
   return validEmail(value)?value.trim().toLowerCase():'';
 }
 function ownerLabel(row,myUserId='',myEmail=''){
   return ownerEmail(row,myUserId,myEmail)||'이전 버전 공유 일정 · 작성자 정보 없음';
 }
 function summary(members=[],invites=[]){
   const active=(Array.isArray(members)?members:[]).filter(x=>validEmail(x?.email)).map(m=>({
     kind:'member',key:'member:'+String(m.user_id||m.email),email:m.email.trim().toLowerCase(),
     userId:m.user_id,role:m.role==='editor'?'editor':'viewer',status:'참여 중'
   }));
   const activeEmails=new Set(active.map(m=>m.email));
   const sent=(Array.isArray(invites)?invites:[]).filter(x=>validEmail(x?.invited_email)).map(i=>({
     kind:'invite',key:'invite:'+String(i.id||i.invited_email),email:i.invited_email.trim().toLowerCase(),
     inviteId:i.id,role:i.role==='editor'?'editor':'viewer',status:i.status||'pending'
   }));
   const pending=sent.filter(i=>i.status==='pending'&&!activeEmails.has(i.email));
   const history=sent.filter(i=>i.status!=='pending'&&!activeEmails.has(i.email));
   return {active,pending,history};
 }
 return {ownerEmail,ownerLabel,summary};
});
