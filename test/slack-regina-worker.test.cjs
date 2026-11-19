'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
let importSequence=0;

async function setup(name,values,respond=()=>Response.json({ok:true})){
  let handler;
  const calls=[];
  const originalDeno=global.Deno,originalFetch=global.fetch;
  global.Deno={env:{get:key=>values[key]},serve:fn=>{handler=fn;}};
  global.fetch=async (url,options)=>{
    calls.push({url:String(url),options});
    return respond(String(url),options);
  };
  const target=pathToFileURL(path.join(__dirname,'../supabase/functions',name,'index.ts'));
  await import(target.href+'?id='+String(++importSequence));
  return {handler,calls,restore(){global.Deno=originalDeno;global.fetch=originalFetch;}};
}
const defaults={SUPABASE_URL:'https://mock.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test_server_only',
  SLACK_BOT_TOKEN:'secret_test_bot_token',SLACK_CHANNEL_ID:'C09S1BE5YN9',SLACK_TEAM_ID:'T8LGNJGSK',
  SLACK_DISPATCH_SECRET:'test_random_dispatch_secret_of_32_bytes'};
const request=()=>new Request('https://mock.supabase.co/functions/v1/slack',{method:'POST',
  headers:{'x-kuns-dispatch-secret':defaults.SLACK_DISPATCH_SECRET}});

test('dispatch cannot send anything with server switch off',async()=>{
  const setupResult=await setup('slack-regina-dispatch',{...defaults,SLACK_SEND_ENABLED:'false'});
  try{
    const result=await (await setupResult.handler(request())).json();
    assert.equal(result.locked,true);
    assert.equal(setupResult.calls.length,0);
  }finally{setupResult.restore();}
});

test('dispatch rejects requests that lack the server secret',async()=>{
  const mock=await setup('slack-regina-dispatch',{...defaults,SLACK_SEND_ENABLED:'true'});
  try{
    const result=await mock.handler(new Request('https://mock/functions/v1/slack',{method:'POST'}));
    assert.equal(result.status,403);
    assert.equal(mock.calls.length,0);
  }finally{mock.restore();}
});

test('modern Supabase server keys use apikey without an invalid Bearer JWT',async()=>{
  const values={...defaults,SUPABASE_SECRET_KEYS:JSON.stringify({default:'sb_secret_test_key'}),
    SLACK_SEND_ENABLED:'true',SLACK_TEST_SEND_ENABLED:'true'};
  const respond=(url)=>{
    if(url.includes('slack_integration_control'))return Response.json([{
      team_id:'T8LGNJGSK',channel_id:'C09S1BE5YN9',test_message_approved:false,send_enabled:false
    }]);
    throw Error('No Slack call permitted while approvals are off');
  };
  const mock=await setup('slack-regina-dispatch',values,respond);
  try{
    const result=await (await mock.handler(request())).json();
    assert.equal(result.locked,true);
    assert.equal(mock.calls.length,1);
    assert.equal(mock.calls[0].options.headers.apikey,'sb_secret_test_key');
    assert.equal(Object.hasOwn(mock.calls[0].options.headers,'Authorization'),false);
  }finally{mock.restore();}
  const testSource=fs.readFileSync(path.join(__dirname,'../supabase/functions/slack-regina-test/index.ts'),'utf8');
  assert.match(testSource,/SUPABASE_SECRET_KEYS/);
  assert.match(testSource,/modern\?\{\}:\{Authorization:/);
});

test('first-test approval does not unlock the regular event queue',async()=>{
  const mock=await setup('slack-regina-dispatch',{...defaults,SLACK_SEND_ENABLED:'true'},(url)=>{
    if(url.includes('slack_integration_control'))return Response.json([{
      team_id:'T8LGNJGSK',channel_id:'C09S1BE5YN9',test_message_approved:true,send_enabled:false
    }]);
    throw Error('No other endpoint should be called');
  });
  try{
    const result=await (await mock.handler(request())).json();
    assert.equal(result.locked,true);
    assert.equal(mock.calls.length,1);
  }finally{mock.restore();}
});

test('regular notifications stay locked until the first test has actually been sent',async()=>{
  const mock=await setup('slack-regina-dispatch',{...defaults,SLACK_SEND_ENABLED:'true'},(url)=>{
    if(url.includes('slack_integration_control'))return Response.json([{
      team_id:'T8LGNJGSK',channel_id:'C09S1BE5YN9',send_enabled:true,test_message_approved:true
    }]);
    if(url.includes('slack_first_test_delivery'))return Response.json([{sent_at:null}]);
    throw Error('No Slack call permitted before the first test is sent');
  });
  try{
    const result=await (await mock.handler(request())).json();
    assert.equal(result.locked,true);
    assert.equal(result.reason,'first_test_not_completed');
    assert.equal(mock.calls.length,2);
  }finally{mock.restore();}
});

test('owner-consented share goes only to the approved channel, as a sanitized message',async()=>{
  const job={event_id:'00000000-0000-4000-8000-000000000001',claim_id:'00000000-0000-4000-8000-000000000002',
    owner_id:'00000000-0000-4000-8000-000000000003',
    channel_id:'C09S1BE5YN9',action:'upsert',title:'<@U123> 회의',start_date:'2026-11-18',end_date:'2026-11-18'};
  const mock=await setup('slack-regina-dispatch',{...defaults,SLACK_SEND_ENABLED:'true'},(url,options)=>{
    if(url.includes('slack_integration_control'))return Response.json([{
      team_id:'T8LGNJGSK',channel_id:'C09S1BE5YN9',test_message_approved:false,send_enabled:true
    }]);
    if(url.includes('slack_first_test_delivery'))return Response.json([{sent_at:'2026-11-18T10:26:35Z'}]);
    if(url.includes('auth.test'))return Response.json({ok:true,team_id:'T8LGNJGSK'});
    if(url.includes('rpc/slack_claim_outbox'))return Response.json([job]);
    if(url.includes('slack_event_messages'))return Response.json([]);
    if(url.includes('slack_owner_consents'))return Response.json([{owner_id:job.owner_id,
      channel_id:job.channel_id,revoked_at:null}]);
    if(url.includes('chat.postMessage'))return Response.json({ok:true,ts:'1700000000.000001'});
    if(url.includes('rpc/slack_complete_outbox'))return Response.json(true);
    throw Error('Unexpected endpoint: '+url);
  });
  try{
    const result=await (await mock.handler(request())).json();
    assert.equal(result.sent,1);
    const call=mock.calls.find(c=>c.url.includes('chat.postMessage'));
    assert.ok(call);
    const payload=JSON.parse(call.options.body);
    assert.equal(payload.channel,'C09S1BE5YN9');
    assert.equal(payload.mrkdwn,false);
    assert.match(payload.text,/&lt;@U123&gt;/);
  }finally{mock.restore();}
});

test('revoked owner consent skips both new and cancelled Slack messages',async()=>{
  const base={event_id:'00000000-0000-4000-8000-000000000001',
    owner_id:'00000000-0000-4000-8000-000000000003',
    claim_id:'00000000-0000-4000-8000-000000000002',
    channel_id:'C09S1BE5YN9',title:'회의',start_date:'2026-11-20',end_date:'2026-11-20'};
  for(const action of ['upsert','cancel']){
    const mock=await setup('slack-regina-dispatch',{...defaults,SLACK_SEND_ENABLED:'true'},url=>{
      if(url.includes('slack_integration_control'))return Response.json([{
        team_id:'T8LGNJGSK',channel_id:'C09S1BE5YN9',send_enabled:true}]);
      if(url.includes('slack_first_test_delivery'))return Response.json([{sent_at:'2026-11-18T10:26:35Z'}]);
      if(url.includes('auth.test'))return Response.json({ok:true,team_id:'T8LGNJGSK'});
      if(url.includes('rpc/slack_claim_outbox'))return Response.json([{...base,action}]);
      if(url.includes('slack_event_messages'))return Response.json([{
        message_ts:'1700000000.000001',channel_id:base.channel_id}]);
      if(url.includes('slack_owner_consents'))return Response.json([{
        owner_id:base.owner_id,channel_id:base.channel_id,revoked_at:'2026-11-19T12:00:00Z'}]);
      if(url.includes('rpc/slack_complete_outbox'))return Response.json(true);
      throw Error('Unexpected endpoint: '+url);
    });
    try{
      const result=await (await mock.handler(request())).json();
      assert.equal(result.sent,0);
      assert.equal(result.skipped,1);
      assert.ok(!mock.calls.some(c=>c.url.includes('chat.update')||c.url.includes('chat.postMessage')));
    }finally{mock.restore();}
  }
});

test('first test remains locked until approved, then posts only its single message',async()=>{
  const values={...defaults,SLACK_TEST_SEND_ENABLED:'false'};
  const mock=await setup('slack-regina-test',values,(url)=>{
    if(url.includes('slack_integration_control'))return Response.json([{team_id:'T8LGNJGSK',channel_id:'C09S1BE5YN9',test_message_approved:true}]);
    if(url.includes('auth.test'))return Response.json({ok:true,team_id:'T8LGNJGSK'});
    if(url.includes('rpc/slack_claim_first_test'))return Response.json(true);
    if(url.includes('chat.postMessage'))return Response.json({ok:true,ts:'1700000000.000001'});
    if(url.includes('rpc/slack_complete_first_test'))return Response.json(true);
    throw Error('Unexpected endpoint: '+url);
  });
  try{
    assert.equal((await (await mock.handler(request())).json()).locked,true);
    assert.equal(mock.calls.length,0);
    values.SLACK_TEST_SEND_ENABLED='true';
    const result=await (await mock.handler(request())).json();
    assert.equal(result.sent,1);
    const call=mock.calls.find(c=>c.url.includes('chat.postMessage'));
    assert.ok(call);
    assert.match(JSON.parse(call.options.body).text,/자동 전송은 아직 꺼져 있습니다/);
    assert.ok(!mock.calls.some(c=>c.url.includes('slack_claim_outbox')));
  }finally{mock.restore();}
});
