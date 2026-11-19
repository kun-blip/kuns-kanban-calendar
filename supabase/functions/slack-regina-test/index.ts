// ONE carefully approved, at-most-once test message. This function cannot
// enable or trigger ongoing event notifications.
const text = '💬 레지나 · KUN\'S Calendar 연결 테스트\n회사 Slack과 칸반 캘린더의 연동을 확인하는 테스트 메시지입니다.\n일정 알림 자동 전송은 아직 꺼져 있습니다.';
const env=key=>Deno.env.get(key)||'';
const json=(value,status=200)=>Response.json(value,{status});
function databaseKey(){
  try { const modern=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}')?.default;
    if(typeof modern==='string'&&modern)return {key:modern,modern:true}; }
  catch { /* allow older projects to use their legacy key */ }
  return {key:env('SUPABASE_SERVICE_ROLE_KEY'),modern:false};
}
function equal(a,b){if(!a||!b)return false;const x=new TextEncoder().encode(a),y=new TextEncoder().encode(b);let d=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)d|=(x[i]||0)^(y[i]||0);return d===0;}
async function db(route,body){
  const base=env('SUPABASE_URL'),{key,modern}=databaseKey();
  const response=await fetch(`${base}/rest/v1/${route}`,{
    method:body?'POST':'GET',headers:{apikey:key,...(modern?{}:{Authorization:`Bearer ${key}`}),'Content-Type':'application/json'},
    body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error('database_error');
  return response.json();
}
async function slack(method,payload){
  const response=await fetch(`https://slack.com/api/${method}`,{
    method:'POST',headers:{Authorization:`Bearer ${env('SLACK_BOT_TOKEN')}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)
  });
  if(!response.ok)throw new Error('slack_http_error');
  const data=await response.json();if(!data?.ok)throw new Error('slack_api_error');return data;
}
Deno.serve(async req=>{
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  if(!equal(req.headers.get('x-kuns-dispatch-secret')||'',env('SLACK_DISPATCH_SECRET')))
    return json({ok:false,error:'forbidden'},403);
  if(env('SLACK_TEST_SEND_ENABLED')!=='true')return json({ok:true,locked:true});
  if(!env('SUPABASE_URL')||!databaseKey().key||!env('SLACK_BOT_TOKEN')||!env('SLACK_TEAM_ID')||!env('SLACK_CHANNEL_ID'))
    return json({ok:false,error:'server_configuration_missing'},503);
  try {
    const rows=await db('slack_integration_control?select=team_id,channel_id,test_message_approved&singleton=eq.true');
    const c=rows?.[0];
    if(!c?.test_message_approved)return json({ok:true,locked:true,reason:'owner_approval_required'});
    if(c.team_id!==env('SLACK_TEAM_ID')||c.channel_id!==env('SLACK_CHANNEL_ID'))
      return json({ok:false,error:'destination_mismatch'},409);
    if(!/^[CG][A-Z0-9]{8,}$/.test(c.channel_id))return json({ok:false,error:'invalid_channel'},409);
    const who=await slack('auth.test',{});
    if(who.team_id!==c.team_id)return json({ok:false,error:'workspace_mismatch'},409);
    if(await db('rpc/slack_claim_first_test',{})!==true)
      return json({ok:true,alreadyClaimed:true});
    // Deliberately no retry on ambiguous failures. Manual owner review first.
    const result=await slack('chat.postMessage',{channel:c.channel_id,text,mrkdwn:false,parse:'none',unfurl_links:false});
    if(typeof result.ts!=='string')throw new Error('missing_ts');
    await db('rpc/slack_complete_first_test',{p_message_ts:result.ts});
    return json({ok:true,sent:1});
  }catch{return json({ok:false,error:'test_failed_review_before_retry'},503);}
});
