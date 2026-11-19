// Deliberately no event description, member email, notes, or todo content.
export function escapeSlack(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatSlackEvent(job) {
  if (!job || !['upsert', 'cancel'].includes(job.action)) throw new Error('Invalid notification action');
  const title = escapeSlack(String(job.title || '').slice(0, 200));
  const start = String(job.start_date || '');
  const end = String(job.end_date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    throw new Error('Invalid notification date');
  const dates = start === end ? start : `${start} ~ ${end}`;
  if (job.action === 'cancel') {
    return `📅 레지나 · 공유 일정 취소\n일정: ${title}\n기간: ${dates}\n※ 이 공유 일정은 캘린더에서 삭제됐습니다.`;
  }
  return `📅 레지나 · 공유 일정\n일정: ${title}\n기간: ${dates}\n※ KUN'S Calendar에서 공유를 허용한 일정입니다.`;
}

export function validateSlackDestination(channel, expected) {
  return /^[CG][A-Z0-9]{8,}$/.test(String(channel || '')) && channel === expected;
}

export function safeSlackFailure(error) {
  const known = ['not_in_channel', 'channel_not_found', 'missing_scope', 'invalid_auth',
    'is_archived', 'message_not_found', 'cant_update_message', 'ratelimited'];
  return known.includes(error) ? error : 'slack_api_error';
}
