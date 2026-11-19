'use strict';
// Shared-calendar status UI. Slack tokens and outgoing messages stay server-side.
(function () {
  const desktop = window.kuunsDesktop;
  const openButton = document.getElementById('slackIntegrationOpen');
  const overlay = document.getElementById('slackIntegrationOverlay');
  if (!openButton || !overlay) return;
  const $ = id => document.getElementById(id);
  let ownEvents = [], lastFocus = null;
  let ownerConsented = false, consentSupported = false;

  function localToday() {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'),
      String(now.getDate()).padStart(2,'0')].join('-');
  }

  function renderList() {
    const container = $('slackEventList');
    container.replaceChildren();
    if (!ownEvents.length) {
      const p = document.createElement('p');
      p.className = 'slack-note';
      p.textContent = '오늘 이후에 남아 있는 공유 일정이 없어요.';
      container.appendChild(p);
      return;
    }
    ownEvents.forEach(event => {
      const row = document.createElement('div');
      row.className = 'slack-event-row';
      const title = document.createElement('span');
      title.textContent = event.title;
      const date = document.createElement('time');
      date.dateTime = event.start_date;
      date.textContent = event.start_date === event.end_date
        ? event.start_date : `${event.start_date} ~ ${event.end_date}`;
      row.append(title,date);
      container.appendChild(row);
    });
  }

  async function load() {
    ownEvents=[];
    ownerConsented=false;consentSupported=false;
    $('slackIntegrationState').textContent='레지나 연동 상태 확인 중…';
    $('slackOwnerConsentButton').disabled=true;
    $('slackOwnerConsentButton').textContent='상태 확인 중';
    $('slackOwnerConsentState').textContent='본인의 동의를 확인하고 있어요.';
    $('slackEventList').replaceChildren();
    if (!desktop?.sharingStatus) {
      $('slackIntegrationState').textContent='Slack 설정은 설치형 캘린더에서 이용할 수 있어요.';
      $('slackOwnerConsentState').textContent='설치형 앱에서만 동의할 수 있습니다.';
      return;
    }
    try {
      const session = await desktop.sharingStatus();
      if (!session?.signedIn || !session?.userId) {
        $('slackIntegrationState').textContent='캘린더 계정에 먼저 로그인해 주세요. 로그아웃 상태에서는 개인 정보에 접근하지 않습니다.';
        $('slackOwnerConsentState').textContent='로그인한 본인만 동의 여부를 변경할 수 있습니다.';
        renderList();
        return;
      }
      const [status,events] = await Promise.all([
        desktop.slackIntegrationStatus(),desktop.sharingList()
      ]);
      if (!status?.configured) throw new Error('Slack configuration missing');
      const name = String(status.channelName||'쌤띵-소재의-방').slice(0,80);
      $('slackChannelLabel').textContent=`#${name}`;
      consentSupported=status.ownerConsentRequired===true && typeof desktop.slackSetOwnerConsent==='function';
      ownerConsented=consentSupported && status.ownerConsented===true;
      const button=$('slackOwnerConsentButton');
      button.disabled=!consentSupported;
      button.textContent=consentSupported?(ownerConsented?'동의 철회':'동의하기'):'준비 중';
      $('slackOwnerConsentState').textContent=!consentSupported
        ? '회사 전체 일정 알림의 본인 동의 기능을 서버에 준비하고 있어요.'
        : ownerConsented
          ? '동의 완료 · 내가 공유한 일정의 새 등록·수정·취소 알림이 운영 시작 후 전송될 수 있어요. 기존 일정을 일괄 전송하지는 않습니다.'
          : `동의 전 · 내가 공유한 일정은 #${name}에 전송되지 않습니다. 동료들도 각각 본인 계정으로 동의해야 합니다.`;
      $('slackIntegrationState').textContent=status.serverSendEnabled===true
        ? '회사 공유 일정 자동 알림이 운영 중입니다. 동의한 소유자의 공유 일정만 알림 대상입니다.'
        : '🔒 일정 자동 알림은 꺼져 있습니다. 운영 승인을 받기 전까지 Slack에 발송하지 않습니다.';
      const today = localToday();
      ownEvents=(Array.isArray(events)?events:[])
        .filter(e=>e.owner_id===session.userId && String(e.end_date||e.start_date||'')>=today)
        .sort((a,b)=>String(a.start_date).localeCompare(String(b.start_date)))
        .slice(0,150);
      renderList();
    } catch {
      $('slackIntegrationState').textContent='🔒 발송 잠금 중 · Slack 서버 연동 준비 단계입니다. 데이터베이스 설정 후 다시 확인할 수 있어요.';
      $('slackOwnerConsentState').textContent='서버 연결 후 동의 여부를 확인할 수 있습니다.';
      renderList();
    }
  }
  $('slackOwnerConsentButton').addEventListener('click',async()=>{
    if (!consentSupported) return;
    const next=!ownerConsented;
    const channel=$('slackChannelLabel').textContent;
    const question=next
      ? `내가 소유한 모든 공유 일정의 제목과 날짜를 회사 Slack ${channel}에 알리는 데 동의할까요?\n\n앞으로 생성·변경·취소되는 공유 일정만 대상이며 기존 일정을 한꺼번에 보내지 않습니다. 개인 일정·투두·고정 메모는 제외됩니다.\n\n동의 후에도 운영 승인이 있기 전에는 전송되지 않습니다.`
      : `내가 공유한 일정의 향후 회사 Slack 알림 동의를 철회할까요?\n\n이미 전송된 Slack 메시지는 남을 수 있습니다.`;
    if (!window.confirm(question)) return;
    const button=$('slackOwnerConsentButton');
    button.disabled=true;
    try { await desktop.slackSetOwnerConsent(next);await load(); }
    catch {
      button.disabled=false;
      $('slackOwnerConsentState').textContent='동의 설정을 저장하지 못했어요. 다시 시도해 주세요.';
    }
  });
  function close() { overlay.hidden=true;lastFocus?.focus?.(); }
  openButton.addEventListener('click',()=>{
    lastFocus=document.activeElement;overlay.hidden=false;
    overlay.querySelector('.slack-dialog').focus();void load();
  });
  $('slackIntegrationClose').addEventListener('click',close);
  overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
})();
