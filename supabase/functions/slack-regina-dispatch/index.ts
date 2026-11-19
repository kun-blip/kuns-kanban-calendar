// Server-only: gated by explicit operating approval, a completed first test,
// and the independent SLACK_SEND_ENABLED deployment switch.
// No scheduling is installed with this code. Do not deploy or invoke to send
// until the owner approves the exact message and channel.
import { formatSlackEvent, validateSlackDestination, safeSlackFailure } from './message.mjs';

const dbUrl = Deno.env.get('SUPABASE_URL') || '';
// Modern Supabase keys are sent only through apikey, never Bearer JWT.
// Keep the legacy service-role key as a fallback for older projects.
let modernDbKey = '';
try { modernDbKey = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')?.default || ''; }
catch { /* project may not expose modern keys yet */ }
const legacyDbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const dbKey = modernDbKey || legacyDbKey;
const botToken = Deno.env.get('SLACK_BOT_TOKEN') || '';
const dispatchSecret = Deno.env.get('SLACK_DISPATCH_SECRET') || '';
const sendEnabled = Deno.env.get('SLACK_SEND_ENABLED') === 'true';
const channelEnv = Deno.env.get('SLACK_CHANNEL_ID') || '';
const teamEnv = Deno.env.get('SLACK_TEAM_ID') || '';

const json = (data, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validUuid = value => typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);

function secretsMatch(provided, expected) {
  // Secrets are random 32+ byte values; comparison does not short-circuit.
  if (!expected || !provided) return false;
  const a = new TextEncoder().encode(provided), b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i=0; i<Math.max(a.length,b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0);
  return diff === 0;
}

async function db(route, options = {}) {
  const response = await fetch(`${dbUrl}/rest/v1/${route}`, {
    ...options,
    headers: {
      apikey: dbKey,
      ...(modernDbKey ? {} : {Authorization: `Bearer ${dbKey}`}),
      'Content-Type': 'application/json', ...(options.headers || {})
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`database_${response.status}`);
  const payload = await response.text();
  return payload ? JSON.parse(payload) : null;
}

async function rpc(name, values) {
  return db(`rpc/${name}`, {method:'POST',body:JSON.stringify(values)});
}

async function slack(method, values) {
  const response=await fetch(`https://slack.com/api/${method}`, {
    method:'POST', headers:{Authorization:`Bearer ${botToken}`,'Content-Type':'application/json; charset=utf-8'},
    body:JSON.stringify(values),signal:AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`slack_http_${response.status}`);
  const payload=await response.json();
  if (!payload?.ok) throw new Error(safeSlackFailure(payload?.error));
  return payload;
}

async function findMessage(eventId) {
  const rows=await db(`slack_event_messages?select=message_ts,channel_id&event_id=eq.${eventId}&limit=1`);
  return Array.isArray(rows)&&rows.length?rows[0]:null;
}

async function stillConsented(job) {
  if (!validUuid(job.owner_id)) return false;
  const rows=await db(`slack_owner_consents?select=owner_id,channel_id,revoked_at&owner_id=eq.${job.owner_id}&limit=1`);
  return Array.isArray(rows)&&rows.length===1&&rows[0].channel_id===job.channel_id&&rows[0].revoked_at===null;
}

async function dispatchJob(job, configuredChannel) {
  if (!validUuid(job.event_id)||!validUuid(job.owner_id)||!validUuid(job.claim_id)||
      !validateSlackDestination(job.channel_id,configuredChannel))
    throw new Error('invalid_destination');
  const existing=await findMessage(job.event_id);
  let messageTs=existing?.message_ts || null;
  if (existing && existing.channel_id !== configuredChannel) throw new Error('message_wrong_channel');
  if (!(await stillConsented(job))) {
    // Owner revoked company-channel consent since the job was queued. Never send.
    await rpc('slack_complete_outbox',{p_event_id:job.event_id,p_claim_id:job.claim_id,p_message_ts:null});
    return 'skipped';
  }
  if (job.action==='cancel' && !messageTs) {
    await rpc('slack_complete_outbox',{p_event_id:job.event_id,p_claim_id:job.claim_id,p_message_ts:null});
    return 'skipped';
  }
  const text=formatSlackEvent(job);
  const payload={channel:configuredChannel,text,mrkdwn:false,parse:'none',
    unfurl_links:false,unfurl_media:false};
  if (messageTs) {
    await slack('chat.update',{...payload,ts:messageTs});
  } else {
    const sent=await slack('chat.postMessage',payload);
    messageTs=sent.ts;
    if (typeof messageTs !== 'string') throw new Error('slack_missing_ts');
  }
  await rpc('slack_complete_outbox',
    {p_event_id:job.event_id,p_claim_id:job.claim_id,p_message_ts:messageTs});
  return 'sent';
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json({ok:false,error:'method_not_allowed'},405);
  if (!secretsMatch(req.headers.get('x-kuns-dispatch-secret')||'',dispatchSecret))
    return json({ok:false,error:'forbidden'},403);
  if (!sendEnabled) return json({ok:true,locked:true,reason:'deployment_switch_off'});
  if (!dbUrl || !dbKey || !botToken || !channelEnv || !teamEnv)
    return json({ok:false,error:'server_configuration_missing'},503);
  try {
    const controls=await db('slack_integration_control?select=team_id,channel_id,send_enabled&singleton=eq.true');
    const config=Array.isArray(controls)?controls[0]:null;
    if (!config?.send_enabled)
      return json({ok:true,locked:true,reason:'owner_approval_required'});
    if (!validateSlackDestination(config.channel_id,channelEnv) || config.team_id!==teamEnv)
      return json({ok:false,error:'destination_mismatch'},409);
    // A test approval is temporary and is revoked after the first test.
    // Its durable sent receipt, not that approval flag, gates real notifications.
    const tests=await db('slack_first_test_delivery?select=sent_at&singleton=eq.true');
    if (!Array.isArray(tests)||!tests[0]?.sent_at)
      return json({ok:true,locked:true,reason:'first_test_not_completed'});
    // Verify token belongs to the intended company workspace; no message sent.
    const identity=await slack('auth.test',{});
    if (identity.team_id !== teamEnv) return json({ok:false,error:'workspace_mismatch'},409);
    const claimed=await rpc('slack_claim_outbox',{p_limit:5});
    let sent=0, skipped=0, failed=0;
    for (const job of (Array.isArray(claimed)?claimed:[])) {
      try {
        const result=await dispatchJob(job,channelEnv);
        if (result==='sent') sent++; else skipped++;
      } catch (error) {
        failed++;
        const reason = error instanceof Error ? error.message : 'dispatch_error';
        try { await rpc('slack_fail_outbox',{p_event_id:job.event_id,p_claim_id:job.claim_id,p_error:reason}); }
        catch { /* retry after claim expires */ }
      }
    }
    return json({ok:failed===0,locked:false,sent,skipped,failed});
  } catch {
    return json({ok:false,error:'dispatcher_unavailable'},503);
  }
});
