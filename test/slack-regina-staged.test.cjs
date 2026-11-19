'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const message=import('../supabase/functions/slack-regina-dispatch/message.mjs');

test('Regina never formats arbitrary Slack mentions or private event details',async()=>{
  const {formatSlackEvent}=await message;
  const text=formatSlackEvent({action:'upsert',title:'<@U123> & 테스트',start_date:'2026-11-18',end_date:'2026-11-19',
    description:'secret description',email:'private@example.com',todos:['hidden']});
  assert.match(text,/&lt;@U123&gt; &amp; 테스트/);
  assert.match(text,/2026-11-18 ~ 2026-11-19/);
  assert.doesNotMatch(text,/secret description|private@example.com|hidden/);
});
test('Regina marks deleted shared events by updating their existing card',async()=>{
  const {formatSlackEvent}=await message;
  assert.match(formatSlackEvent({action:'cancel',title:'회의',start_date:'2026-11-18',end_date:'2026-11-18'}),/공유 일정 취소/);
  assert.throws(()=>formatSlackEvent({action:'upsert',title:'bad',start_date:'x',end_date:'y'}));
});
test('only the approved company channel ID is a valid destination',async()=>{
  const {validateSlackDestination,safeSlackFailure}=await message;
  assert.equal(validateSlackDestination('C09S1BE5YN9','C09S1BE5YN9'),true);
  assert.equal(validateSlackDestination('C09S1BE5YN9','C0000000000'),false);
  assert.equal(validateSlackDestination('D09S1BE5YN9','D09S1BE5YN9'),false);
  assert.equal(safeSlackFailure('internal_error_with_token_details'),'slack_api_error');
});
test('staged DB migration has owner-only opt-in and default-off hard gates',()=>{
  const sql=read('supabase/migrations/20261118000000_slack_regina_staged.sql');
  assert.match(sql,/test_message_approved boolean NOT NULL DEFAULT false/);
  assert.match(sql,/send_enabled boolean NOT NULL DEFAULT false/);
  assert.match(sql,/C09S1BE5YN9/);
  assert.match(sql,/ALTER TABLE public\.slack_event_optins ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/owner_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/v_event\.owner_id <> \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/REVOKE ALL ON public\.slack_event_outbox FROM PUBLIC, anon, authenticated/);
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.slack_claim_outbox\(integer\) TO service_role/);
  assert.match(sql,/BEFORE DELETE ON public\.shared_events/);
  assert.doesNotMatch(sql,/calendar_account_snapshots|FROM public\.todos|FROM public\.notes/);
});
test('dispatcher is server-only and checks independent send and first-test completion gates',()=>{
  const worker=read('supabase/functions/slack-regina-dispatch/index.ts');
  assert.match(worker,/x-kuns-dispatch-secret/);
  assert.match(worker,/SLACK_SEND_ENABLED/);
  assert.match(worker,/slack_first_test_delivery\?select=sent_at/);
  assert.doesNotMatch(worker,/config\?\.test_message_approved/);
  assert.match(worker,/config\.team_id!==teamEnv/);
  assert.match(worker,/identity\.team_id !== teamEnv/);
  assert.match(worker,/stillConsented\(job\)/);
  assert.match(worker,/chat\.update/);
  assert.match(worker,/chat\.postMessage/);
  assert.doesNotMatch(read('desktop/preload.cjs')+read('renderer/slack-integration.js'),/SLACK_BOT_TOKEN|xoxb-/);
});
test('first test is separate, one-time and never enables scheduled notifications',()=>{
  const first=read('supabase/functions/slack-regina-test/index.ts');
  const sql=read('supabase/migrations/20261118000000_slack_regina_staged.sql');
  assert.match(first,/SLACK_TEST_SEND_ENABLED/);
  assert.match(first,/slack_claim_first_test/);
  assert.match(first,/slack_complete_first_test/);
  assert.match(first,/test_message_approved/);
  assert.doesNotMatch(first,/slack_claim_outbox|slack_set_event_optin|SLACK_SEND_ENABLED/);
  assert.match(sql,/claimed_at IS NULL AND d\.sent_at IS NULL/);
  assert.match(sql,/public\.slack_first_test_delivery ENABLE ROW LEVEL SECURITY/);
});
test('desktop menu shows only current and upcoming owned shared events without test controls',()=>{
  const html=read('renderer/index.html'), renderer=read('renderer/slack-integration.js');
  assert.match(html,/id="slackIntegrationOpen"/);
  assert.match(html,/id="slackIntegrationOverlay"/);
  assert.match(html,/slack-integration\.js/);
  assert.match(html,/<span>Slack<\/span><\/button>/);
  assert.match(html,/id="slackDialogTitle">💬 레지나<\/h2>/);
  assert.match(renderer,/localToday\(\)/);
  assert.match(renderer,/String\(e\.end_date\|\|e\.start_date\|\|''\)>=today/);
  assert.match(renderer,/owner_id===session\.userId/);
  assert.match(renderer,/status\.serverSendEnabled===true/);
  assert.doesNotMatch(renderer,/status\.testApproved===true/);
  assert.doesNotMatch(renderer,/slackEventOptins|slackSetEventOptin|checkbox|previewEvent/);
  assert.doesNotMatch(html,/slackPreviewText|레지나 메시지 미리보기|첫 연결 테스트 메시지|id="slackIntegrationOpen"[^\n]*Slack 연동 · 레지나/);
  assert.match(html,/종료된 공유 일정은 이 목록에서 자동으로 제외됩니다/);
  assert.match(renderer,/!session\?\.signedIn/);
  assert.doesNotMatch(renderer,/fetch\s*\(\s*['"]https:\/\/slack\.com/);
  const client=read('desktop/sharing-client.cjs'), main=read('desktop/main.cjs'), preload=read('desktop/preload.cjs');
  for(const name of ['slackStatus','slackSetOwnerConsent'])assert.match(main,new RegExp(name));
  assert.doesNotMatch(client+main+preload,/slackOptins|slackSetOptin|slackEventOptins|slackSetEventOptin/);
  assert.match(client,/rpc\/slack_set_owner_consent/);
  assert.match(preload,/slackIntegrationStatus/);
});
test('Regina status panel uses theme-aware colors in light and dark mode',()=>{
  const html=read('renderer/index.html');
  const stateRule=html.match(/\.slack-state\{[^}]+\}/)?.[0];
  assert.ok(stateRule,'Slack status must have a style rule');
  assert.match(stateRule,/background:var\(--primary-soft,/);
  assert.match(html,/:root\{[^}]*--primary-soft:#eff1ff/);
  assert.match(html,/html\[data-theme=dark\]\{[^}]*--primary-soft:#2a3353/);
});

test('company-wide Slack consent draft isolates individual owner consent and prevents backfill',()=>{
  const sql=read('supabase/drafts/slack_regina_companywide_owner_consent.sql');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.slack_owner_consents/);
  assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  assert.match(sql,/owner_id = \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/FUNCTION public\.slack_set_owner_consent\(p_enabled boolean\)/);
  assert.match(sql,/v_owner uuid := \(SELECT auth\.uid\(\)\)/);
  assert.match(sql,/DELETE FROM public\.slack_event_outbox WHERE owner_id=v_owner/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.slack_set_event_optin\(uuid,boolean\)/);
  assert.match(sql,/ownerConsentRequired',true,'ownerConsented',v_consented/);
  assert.match(sql,/c\.send_enabled IS TRUE/);
  assert.match(sql,/o\.revoked_at IS NULL/);
  assert.match(sql,/NEW\.end_date < \(now\(\) AT TIME ZONE 'Asia\/Seoul'\)::date/);
  assert.match(sql,/AFTER INSERT ON public\.shared_events/);
  assert.match(sql,/AFTER UPDATE ON public\.shared_events/);
  assert.match(sql,/BEFORE DELETE ON public\.shared_events/);
  assert.doesNotMatch(sql,/INSERT INTO public\.slack_event_outbox[^\n]*SELECT|UPDATE public\.slack_integration_control SET send_enabled\s*=\s*true|cron\.schedule/);
  assert.doesNotMatch(sql,/calendar_account_snapshots|FROM public\.todos|FROM public\.notes/);
});

test('company-wide dispatcher checks consent before upsert AND cancel; desktop uses signed-in RPC',()=>{
  const worker=read('supabase/functions/slack-regina-dispatch/index.ts');
  assert.match(worker,/slack_owner_consents\?select=owner_id,channel_id,revoked_at/);
  assert.match(worker,/rows\[0\]\.revoked_at===null/);
  assert.match(worker,/if \(!\(await stillConsented\(job\)\)\)/);
  assert.doesNotMatch(worker,/job\.action==='upsert' && !\(await stillConsented\(job\)\)/);
  const client=read('desktop/sharing-client.cjs');
  const main=read('desktop/main.cjs');
  const preload=read('desktop/preload.cjs');
  const renderer=read('renderer/slack-integration.js');
  assert.match(client,/rpc\/slack_set_owner_consent/);
  assert.match(main,/shareHandle\('slackSetOwnerConsent'/);
  assert.match(preload,/slackSetOwnerConsent:enabled=>ipcRenderer\.invoke/);
  assert.match(renderer,/window\.confirm\(question\)/);
  assert.doesNotMatch(renderer,/slack\.com\/api|fetch\(/);
});
