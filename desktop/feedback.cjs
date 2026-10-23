'use strict';
// Sends user-written feedback only. Calendar events, notes, local file paths and
// machine identifiers are never read by this module or included in the payload.
const TYPES = new Set(['기능 제안', '버그 신고', '디자인 개선']);

function validateFeedback(input, version) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('피드백 내용을 확인해 주세요.');
  const { type, message, nickname = '' } = input;
  if (typeof type !== 'string' || !TYPES.has(type))
    throw new Error('피드백 종류를 선택해 주세요.');
  if (typeof message !== 'string' || message.trim().length < 3 || message.trim().length > 2000)
    throw new Error('내용은 3자 이상, 2,000자 이하로 작성해 주세요.');
  if (typeof nickname !== 'string' || nickname.trim().length > 40)
    throw new Error('닉네임은 40자 이내로 작성해 주세요.');
  return { type, message: message.trim(), nickname: nickname.trim() || '익명', version: String(version), website: '' };
}

function createFeedbackController({ endpoint, version, fetchImpl = globalThis.fetch, now = Date.now, delay = setTimeout, cancelDelay = clearTimeout }) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname))
    throw new Error('올바른 Google Apps Script 웹 앱 주소가 필요합니다.');
  let busy = false;
  let lastSentAt = -Infinity;

  async function submit(input) {
    let payload;
    try { payload = validateFeedback(input, version); }
    catch (err) { return { ok: false, message: err.message }; }
    if (busy) return { ok: false, message: '이전 피드백을 전송 중이에요.' };
    if (now() - lastSentAt < 60_000)
      return { ok: false, message: '잠시 후 다음 피드백을 보낼 수 있어요. (1분 간격)' };

    busy = true;
    const aborter = new AbortController();
    const timeout = delay(() => aborter.abort(), 15_000);
    try {
      // text/plain is accepted by Apps Script doPost(e), without a browser CORS
      // preflight. This call runs in Electron's main process, not in renderer.
      const response = await fetchImpl(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow',
        signal: aborter.signal
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); }
      catch { throw new Error('Apps Script 응답 형식을 확인해 주세요.'); }
      if (!body || body.ok !== true)
        throw new Error(body && typeof body.error === 'string' ? body.error : '접수 실패');
      lastSentAt = now();
      return { ok: true, message: '피드백이 전송되었어요. 감사합니다!' };
    } catch (err) {
      // A network failure can happen after the server has appended the row.
      // Do not claim success; advise checking the sheet before resubmitting.
      console.warn('Feedback send failed:', err.message);
      return { ok: false, message: '전송 결과를 확인하지 못했어요. 시트 접수 여부와 인터넷 연결을 확인한 뒤 다시 시도해 주세요.' };
    } finally {
      cancelDelay(timeout);
      busy = false;
    }
  }
  return { submit };
}
module.exports = { validateFeedback, createFeedbackController };
