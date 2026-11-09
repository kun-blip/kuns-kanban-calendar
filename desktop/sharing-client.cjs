'use strict';
const fs = require('node:fs');

function validateEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('올바른 이메일 주소를 입력해 주세요.');
  return value;
}
function validateToken(value) {
  const token = String(value || '').trim().replace(/^kuuns-kanban:\/\/invite\//i, '');
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error('올바른 초대 코드가 아닙니다.');
  return token;
}
function normalizeEvent(value) {
  if (!value || typeof value !== 'object' || !String(value.title || '').trim()) throw new Error('공유할 일정의 제목이 필요합니다.');
  const start = String(value.start || ''), end = String(value.end || '');
  const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v+'T00:00:00Z'));
  if (!validDate(start) || !validDate(end) || end < start) throw new Error('공유 일정의 날짜가 올바르지 않습니다.');
  const eventId = String(value.id || '');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(eventId)) throw new Error('일정 ID 형식이 잘못됐습니다.');
  const safeUrl = typeof value.url === 'string' && /^https?:\/\/[^\s]+$/i.test(value.url) && value.url.length<=1500 ? value.url : '';
  const checklist = Array.isArray(value.checklist) ? value.checklist.slice(0,40).map(c=>({text:String(c?.text||'').slice(0,160),done:!!c?.done})).filter(c=>c.text) : [];
  return {
    local_event_id: eventId,
    title: String(value.title).trim().slice(0, 200),
    description: String(value.description || '').slice(0, 4000),
    start_date: start, end_date: end,
    event_data: {
      color: /^#[0-9a-fA-F]{6}$/.test(value.color || '') ? value.color : '#5367e8',
      status: ['todo','doing','done'].includes(value.status) ? value.status : 'todo',
      url:safeUrl,checklist,gameName:String(value.gameName||'').slice(0,50),
      ...(typeof value.ownerEmail==='string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.ownerEmail.trim()) ? {ownerEmail:value.ownerEmail.trim().toLowerCase().slice(0,254)} : {}),
      tags:Array.isArray(value.tags)?value.tags.slice(0,8).filter(t=>t&&/^[\p{L}\p{N}_-]{1,20}$/u.test(t.name)&&/^#[0-9a-f]{6}$/i.test(t.color)).map(t=>({name:t.name,color:t.color.toLowerCase(),textColor:/^#[0-9a-f]{6}$/i.test(t.textColor||'')?t.textColor.toLowerCase():'#ffffff'})):[]
    }
  };
}
function recordPatch(record) {
  return {title:record.title,description:record.description,start_date:record.start_date,
    end_date:record.end_date,event_data:record.event_data};
}
function safeUuid(v) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v))) throw new Error('유효하지 않은 항목입니다.');
  return v;
}
function validateRole(v){if(!['viewer','editor'].includes(v))throw new Error('유효하지 않은 공유 권한입니다.');return v;}
function validateAccountSnapshot(payload){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('계정 일정 데이터 형식이 잘못됐어요.');
  const fields=['events','notes','todos','tagLibrary','tagLibraryHidden','games','shortcuts','recentColors'];
  const data=Object.fromEntries(fields.map(key=>[key,payload[key]]));
  if(!Array.isArray(data.events)||!Array.isArray(data.notes)||!Array.isArray(data.todos)||!Array.isArray(data.games)||!Array.isArray(data.shortcuts))throw new Error('계정 일정 데이터 형식이 잘못됐어요.');
  const serialized=JSON.stringify(data);
  if(Buffer.byteLength(serialized,'utf8')>6*1024*1024)throw new Error('계정 동기화 데이터가 6MB를 초과했어요. 이미지가 포함된 아이콘을 정리해 주세요.');
  return data;
}
function createSharingClient({url, publishableKey, sessionPath, fetchImpl=fetch}) {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new Error('Supabase URL is invalid');
  if (!/^sb_publishable_/.test(publishableKey)) throw new Error('Supabase publishable key is missing');
  let session = null;
  try { session = JSON.parse(fs.readFileSync(sessionPath, 'utf8')); }
  catch { /* user not logged in */ }
  let renewing = null;
  function persist(value) {
    session = value;
    if (!value) { try {fs.unlinkSync(sessionPath);}catch{} return; }
    fs.writeFileSync(sessionPath, JSON.stringify(value), {encoding:'utf8', mode:0o600});
    if (process.platform !== 'win32') try {fs.chmodSync(sessionPath,0o600);}catch{}
  }
  async function request(route, {method='GET', body, accessToken}={}) {
    const headers = {apikey:publishableKey};
    if (accessToken) headers.Authorization = 'Bearer '+accessToken;
    if (body !== undefined) headers['Content-Type']='application/json';
    if (route.includes('/rest/v1/')) headers.Prefer='return=representation';
    const response=await fetchImpl(url+route, {method,headers,cache:'no-store',body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    const raw=(await response.text()).slice(0,30000);
    let output; try { output=raw?JSON.parse(raw):null; } catch {output=null;}
    if(!response.ok) {
      if(/Email address not authorized/i.test(raw)) throw new Error('Supabase 기본 메일 서비스는 프로젝트 관리자 이메일로만 전송됩니다. 동료 이메일 사용을 위해 SMTP를 연결해 주세요.');
      // Don't show raw server details, sessions, or tokens to users.
      const allowed = {
        400:'요청이 올바르지 않아요. 인증 번호나 초대 코드를 다시 확인해 주세요.',
        401:'인증이 만료되었습니다. 다시 로그인해 주세요.',
        403:'이 일정에 접근할 권한이 없습니다.',
        404:'해당 항목을 찾지 못했습니다.',
        422:'입력 내용을 다시 확인해 주세요.',
        429:'요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
      };
      if (/Edit conflict/i.test(raw)) throw new Error('동료가 먼저 수정했어요. 새로고침한 후 다시 편집해 주세요.');
      if (/Not authorized/i.test(raw)) throw new Error('이 작업을 수행할 권한이 없습니다.');
      throw new Error(allowed[response.status] || `연결 오류(${response.status})가 발생했습니다.`);
    }
    return output;
  }
  async function authorized(route, opts={}) {
    if (!session?.access_token) throw new Error('먼저 이메일 인증을 해주세요.');
    if ((Number(session.expires_at)||0) < Date.now()/1000 + 60) await refresh();
    try { return await request(route, {...opts,accessToken:session.access_token}); }
    catch(e) { if (/인증이 만료/.test(e.message)) { await refresh(); return request(route,{...opts, accessToken:session.access_token}); } throw e; }
  }
  async function refresh() {
    if(renewing) return renewing;
    renewing=(async()=>{
      if(!session?.refresh_token) throw new Error('세션이 만료됐어요. 다시 로그인해 주세요.');
      const result=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});
      persist({...session,...result,expires_at:Math.floor(Date.now()/1000)+Number(result.expires_in||3600)});
      return session;
    })();
    try{return await renewing;}finally{renewing=null;}
  }
  function publicStatus(){return {signedIn:!!session?.access_token,email:session?.user?.email || session?.email || '',userId:session?.user?.id || null};}
  return {
    publicStatus,
    requestOtp: async email => {
      email=validateEmail(email);
      await request('/auth/v1/otp',{method:'POST',body:{email,create_user:true}});
      return {ok:true,email};
    },
    verifyOtp: async (email,token) => {
      email=validateEmail(email);token=String(token||'').trim();
      if(!/^\d{6,8}$/.test(token))throw new Error('이메일로 받은 인증 번호를 입력해 주세요.');
      const result=await request('/auth/v1/verify',{method:'POST',body:{email,token,type:'email'}});
      if(!result?.access_token || !result?.refresh_token)throw new Error('인증에 실패했습니다.');
      persist({...result,email,expires_at:Math.floor(Date.now()/1000)+Number(result.expires_in||3600)});
      return publicStatus();
    },
    signOut: async()=>{ const token=session?.access_token;persist(null);if(token)try{await request('/auth/v1/logout',{method:'POST',accessToken:token});}catch{} return publicStatus(); },
    accountSnapshotGet:async()=>{
      const userId=session?.user?.id;
      if(!userId)throw new Error('먼저 이메일로 로그인해 주세요.');
      const rows=await authorized('/rest/v1/calendar_account_snapshots?select=user_id,payload,revision,updated_at&user_id=eq.'+encodeURIComponent(userId));
      return Array.isArray(rows)&&rows.length?rows[0]:null;
    },
    accountSnapshotCreate:async payload=>{
      const userId=session?.user?.id;
      if(!userId)throw new Error('먼저 이메일로 로그인해 주세요.');
      const normalized=validateAccountSnapshot(payload);
      const rows=await authorized('/rest/v1/calendar_account_snapshots',{method:'POST',body:{user_id:userId,payload:normalized,revision:1}});
      if(!Array.isArray(rows)||rows.length!==1)throw new Error('계정 데이터 등록 결과를 확인하지 못했어요.');
      return rows[0];
    },
    accountSnapshotUpdate:async (payload,expectedRevision)=>{
      const userId=session?.user?.id;
      if(!userId)throw new Error('먼저 이메일로 로그인해 주세요.');
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<1)throw new Error('계정 데이터 버전 정보가 잘못됐어요.');
      const normalized=validateAccountSnapshot(payload);
      const rows=await authorized('/rest/v1/calendar_account_snapshots?user_id=eq.'+encodeURIComponent(userId)+'&revision=eq.'+expectedRevision,{method:'PATCH',body:{payload:normalized,revision:expectedRevision+1,updated_at:new Date().toISOString()}});
      if(!Array.isArray(rows)||rows.length!==1)throw new Error('계정 동기화 충돌: 다른 기기에서 먼저 수정했어요.');
      return rows[0];
    },
    list: async()=> {
      const events=await authorized('/rest/v1/shared_events?select=id,owner_id,local_event_id,title,description,start_date,end_date,event_data,revision,updated_at&order=start_date.asc');
      return Array.isArray(events)?events:[];
    },
    publish:async (event,expectedRevision=null)=>{
      const record=normalizeEvent(event);
      const userEmail=session?.user?.email || session?.email || '';
      if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail))record.event_data.ownerEmail=userEmail.trim().toLowerCase().slice(0,254);
      const userId=session?.user?.id;
      if(!userId)throw new Error('먼저 이메일 인증을 해주세요.');
      const filter='owner_id=eq.'+encodeURIComponent(userId)+'&local_event_id=eq.'+encodeURIComponent(record.local_event_id);
      const exists=await authorized('/rest/v1/shared_events?select=id,revision&'+filter);
      if(Array.isArray(exists)&&exists.length){
        if(expectedRevision !== null && Number(exists[0].revision)!==Number(expectedRevision)) throw new Error('동료가 먼저 수정했어요. 서버의 최신 일정을 확인한 후 다시 편집해 주세요.');
        return authorized('/rest/v1/rpc/sharing_update_event',{method:'POST',body:{p_event_id:exists[0].id,p_revision:exists[0].revision,p_patch:recordPatch(record)}});
      }
      const created=await authorized('/rest/v1/shared_events',{method:'POST',body:{...record,owner_id:userId}});
      if(!created?.[0]?.id)throw new Error('공유 일정 생성 결과를 확인하지 못했어요.');
      return created[0];
    },
    invite:async eventId=>{
      if(!/^[a-f0-9-]{36}$/.test(String(eventId)))throw new Error('유효하지 않은 일정입니다.');
      const result=await authorized('/rest/v1/rpc/create_shared_event_invite',{method:'POST',body:{p_event_id:eventId}});
      return {token:result, link:'kuuns-kanban://invite/'+result};
    },
    accept:async code=>{
      const eventId=await authorized('/rest/v1/rpc/accept_shared_event_invite',{method:'POST',body:{p_token:validateToken(code)}});
      return {id:eventId};
    },
    revoke:async eventId=>authorized('/rest/v1/rpc/revoke_shared_event_invites',{method:'POST',body:{p_event_id:eventId}}),
    leave:async eventId=>{
      const userId=session?.user?.id;
      if(!userId)throw new Error('먼저 로그인해 주세요.');
      return authorized('/rest/v1/rpc/remove_shared_event_member',{method:'POST',body:{p_event_id:eventId,p_user_id:userId}});
    },
    unshare:async eventId=>authorized('/rest/v1/shared_events?id=eq.'+encodeURIComponent(eventId),{method:'DELETE'}),
    contactsList:()=>authorized('/rest/v1/sharing_contacts?select=id,nickname,email,group_name,auto_accept,auto_invite&order=nickname.asc'),
    autoAcceptInvites:()=>authorized('/rest/v1/rpc/sharing_accept_trusted_invites',{method:'POST',body:{}}),
    contactAdd:async (nickname,email,groupName='')=>{
      nickname=String(nickname||'').trim().slice(0,60);email=validateEmail(email);
      if(!nickname)throw new Error('동료 닉네임을 입력해 주세요.');
      const rows=await authorized('/rest/v1/sharing_contacts',{method:'POST',body:{nickname,email,group_name:String(groupName||'').trim().slice(0,60),owner_id:session?.user?.id}});
      return rows?.[0];
    },
    contactUpdate:async(id,nickname,email,groupName='')=>{
      nickname=String(nickname||'').trim().slice(0,60);email=validateEmail(email);
      if(!nickname)throw new Error('동료 닉네임을 입력해 주세요.');
      return authorized('/rest/v1/sharing_contacts?id=eq.'+safeUuid(id),{method:'PATCH',body:{nickname,email,group_name:String(groupName||'').trim().slice(0,60)}});
    },
    contactSettings:(id,settings)=>{
      if(!settings||typeof settings.auto_accept!=='boolean'||typeof settings.auto_invite!=='boolean')throw new Error('동료 설정이 올바르지 않아요.');
      return authorized('/rest/v1/sharing_contacts?id=eq.'+safeUuid(id),{method:'PATCH',body:{auto_accept:settings.auto_accept,auto_invite:settings.auto_invite}});
    },
    contactGroupRename:(from,to)=>{
      from=String(from||'').trim();to=String(to||'').trim();if(!from||!to||to.length>60)throw new Error('그룹 이름을 확인해 주세요.');
      return authorized('/rest/v1/sharing_contacts?group_name=eq.'+encodeURIComponent(from),{method:'PATCH',body:{group_name:to}});
    },
    contactGroupClear:name=>{
      name=String(name||'').trim();if(!name)throw new Error('그룹을 선택해 주세요.');
      return authorized('/rest/v1/sharing_contacts?group_name=eq.'+encodeURIComponent(name),{method:'PATCH',body:{group_name:''}});
    },
    contactRemove:id=>authorized('/rest/v1/sharing_contacts?id=eq.'+safeUuid(id),{method:'DELETE'}),
    inviteContacts:async(eventId,recipients)=>{
      if(!Array.isArray(recipients)||recipients.length<1||recipients.length>20)throw new Error('1~20명의 동료를 선택해 주세요.');
      return authorized('/rest/v1/rpc/sharing_invite_contacts',{method:'POST',body:{p_event_id:safeUuid(eventId),p_recipients:recipients.map(r=>({email:validateEmail(r.email),role:validateRole(r.role)}))}});
    },
    inbox:()=>authorized('/rest/v1/rpc/sharing_pending_invites',{method:'POST',body:{}}),
    respond:(id,accept)=>authorized('/rest/v1/rpc/sharing_respond_invite',{method:'POST',body:{p_invite_id:safeUuid(id),p_accept:!!accept}}),
    myRoles:()=>authorized('/rest/v1/shared_event_members?select=event_id,role,user_id'),
    members:id=>authorized('/rest/v1/rpc/sharing_list_members',{method:'POST',body:{p_event_id:safeUuid(id)}}),
    role:(eventId,userId,role)=>authorized('/rest/v1/rpc/sharing_set_member_role',{method:'POST',body:{p_event_id:safeUuid(eventId),p_member_id:safeUuid(userId),p_role:validateRole(role)}}),
    editShared:async(id,revision,patch)=>{
      if(!Number.isSafeInteger(revision)||revision<1)throw new Error('일정 버전 정보가 올바르지 않습니다.');
      const eventId=safeUuid(id);
      const record=normalizeEvent({...patch,id:'remote-edit'});
      // The author and any future server-owned metadata must survive edits made by
      // a recipient. Never trust the edited form's ownerEmail as an authority.
      const existing=await authorized('/rest/v1/shared_events?select=id,revision,event_data&id=eq.'+encodeURIComponent(eventId));
      if(!Array.isArray(existing)||existing.length!==1)throw new Error('공유 일정을 다시 불러올 수 없어요. 새로고침 후 다시 시도해 주세요.');
      const previous=existing[0].event_data;
      const preserved=previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{};
      const merged={...preserved,...record.event_data};
      // A user editing the schedule cannot alter or accidentally delete the original author.
      delete merged.ownerEmail;
      if(typeof preserved.ownerEmail==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(preserved.ownerEmail.trim())){
        merged.ownerEmail=preserved.ownerEmail.trim().toLowerCase().slice(0,254);
      }
      return authorized('/rest/v1/rpc/sharing_update_event',{method:'POST',body:{p_event_id:eventId,p_revision:revision,p_patch:{...recordPatch(record),event_data:merged}}});
    },
    sentInvites:id=>authorized('/rest/v1/rpc/sharing_list_sent_invites',{method:'POST',body:{p_event_id:safeUuid(id)}}),
    cancelInvite:id=>authorized('/rest/v1/rpc/sharing_cancel_invite',{method:'POST',body:{p_invite_id:safeUuid(id)}}),
    removeMember:(eventId,userId)=>authorized('/rest/v1/rpc/remove_shared_event_member',{method:'POST',body:{p_event_id:safeUuid(eventId),p_user_id:safeUuid(userId)}}),
    history:id=>authorized('/rest/v1/sharing_event_history?select=action,actor_id,revision,created_at&event_id=eq.'+safeUuid(id)+'&order=id.desc&limit=20'),
    normalizeEvent
  };
}
module.exports={createSharingClient,validateToken,validateEmail,normalizeEvent,validateAccountSnapshot};
