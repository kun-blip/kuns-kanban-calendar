'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('Regina lists owned shared events through today, excluding past and other owners',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../renderer/slack-integration.js'),'utf8');
  const createNode=(tag='div')=>({
    tag,children:[],listeners:{},hidden:true,textContent:'',
    append(...children){this.children.push(...children);},
    appendChild(child){this.children.push(child);},
    replaceChildren(...children){this.children=children;},
    addEventListener(type,listener){this.listeners[type]=listener;},
    querySelector(){return {focus(){}};},
    focus(){}
  });
  const elements=Object.fromEntries([
    'slackIntegrationOpen','slackIntegrationOverlay','slackIntegrationClose',
    'slackIntegrationState','slackChannelLabel','slackEventList',
    'slackOwnerConsentButton','slackOwnerConsentState'
  ].map(id=>[id,createNode()]));
  const events=[
    {id:'old',owner_id:'me',title:'지난 일정',start_date:'2026-11-17',end_date:'2026-11-18'},
    {id:'multiday',owner_id:'me',title:'오늘 끝나는 일정',start_date:'2026-11-16',end_date:'2026-11-19'},
    {id:'today',owner_id:'me',title:'오늘 일정',start_date:'2026-11-19',end_date:'2026-11-19'},
    {id:'future',owner_id:'me',title:'미래 일정',start_date:'2026-11-20',end_date:'2026-11-21'},
    {id:'coworker',owner_id:'other',title:'타인 일정',start_date:'2026-11-20',end_date:'2026-11-20'}
  ];
  class FakeDate extends Date {
    constructor(...args){super(...(args.length?args:[2026,10,19,12,0,0]));}
  }
  const desktop={
    sharingStatus:async()=>({signedIn:true,userId:'me'}),
    slackIntegrationStatus:async()=>({configured:true,serverSendEnabled:false,channelName:'쌤띵-소재의-방'}),
    sharingList:async()=>events,
    slackEventOptins(){throw new Error('Legacy opt-in must not be called');}
  };
  const sandbox={
    window:{kuunsDesktop:desktop},Date:FakeDate,
    document:{getElementById:id=>elements[id],createElement:createNode,get activeElement(){return createNode();}}
  };
  vm.runInNewContext(source,sandbox,{filename:'slack-integration.js'});
  elements.slackIntegrationOpen.listeners.click();
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  const rows=elements.slackEventList.children;
  assert.deepEqual(rows.map(row=>row.children[0].textContent),[
    '오늘 끝나는 일정','오늘 일정','미래 일정'
  ]);
  assert.ok(rows.every(row=>row.children.length===2));
  assert.ok(rows.every(row=>row.children[1].tag==='time'));
  assert.equal(elements.slackChannelLabel.textContent,'#쌤띵-소재의-방');
  assert.match(elements.slackIntegrationState.textContent,/자동 알림은 꺼져 있습니다/);
  assert.equal(elements.slackOwnerConsentButton.disabled,true);
  assert.match(elements.slackOwnerConsentState.textContent,/서버에 준비하고 있어요/);
});

test('Regina owner-wide consent is explicit and never sends a Slack message',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../renderer/slack-integration.js'),'utf8');
  const node=()=>({children:[],listeners:{},hidden:true,textContent:'',disabled:false,
    append(...items){this.children.push(...items);},appendChild(item){this.children.push(item);},
    replaceChildren(...items){this.children=items;},
    addEventListener(event,fn){this.listeners[event]=fn;},
    querySelector(){return {focus(){}};},focus(){}});
  const ids=['slackIntegrationOpen','slackIntegrationOverlay','slackIntegrationClose',
    'slackIntegrationState','slackChannelLabel','slackEventList',
    'slackOwnerConsentButton','slackOwnerConsentState'];
  const elements=Object.fromEntries(ids.map(id=>[id,node()]));
  let accepted=false,confirmed=true;
  const confirmations=[],consentChanges=[];
  const desktop={
    sharingStatus:async()=>({signedIn:true,userId:'me'}),
    slackIntegrationStatus:async()=>({configured:true,serverSendEnabled:false,
      channelName:'쌤띵-소재의-방',ownerConsentRequired:true,ownerConsented:accepted}),
    sharingList:async()=>[],
    slackSetOwnerConsent:async value=>{consentChanges.push(value);accepted=value;}
  };
  vm.runInNewContext(source,{
    window:{kuunsDesktop:desktop,confirm:question=>{confirmations.push(question);return confirmed;}},
    document:{getElementById:id=>elements[id],createElement:node,get activeElement(){return node();}}
  });
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
  elements.slackIntegrationOpen.listeners.click();await flush();
  assert.equal(elements.slackOwnerConsentButton.disabled,false);
  assert.equal(elements.slackOwnerConsentButton.textContent,'동의하기');
  confirmed=false;
  await elements.slackOwnerConsentButton.listeners.click();await flush();
  assert.deepEqual(consentChanges,[],'Declining confirmation must not modify consent');
  confirmed=true;
  await elements.slackOwnerConsentButton.listeners.click();await flush();
  assert.deepEqual(consentChanges,[true]);
  assert.match(confirmations[0],/제목과 날짜/);
  assert.match(confirmations[0],/기존 일정을 한꺼번에 보내지 않습니다/);
  assert.equal(elements.slackOwnerConsentButton.textContent,'동의 철회');
  await elements.slackOwnerConsentButton.listeners.click();await flush();
  assert.deepEqual(consentChanges,[true,false]);
  assert.match(confirmations.at(-1),/이미 전송된 Slack 메시지는 남을 수 있습니다/);
  assert.equal(elements.slackOwnerConsentButton.textContent,'동의하기');
});
