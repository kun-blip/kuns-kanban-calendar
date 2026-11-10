'use strict';
// Sends user-written feedback only. Calendar events, notes, local file paths and
// machine identifiers are never read by this module or included in the payload.
const TYPES = new Set(['기능 제안', '버그 신고', '디자인 개선']);
const MAX_IMAGE_BYTES = 1200000;
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function validateImage(image) {
  if (!image || typeof image !== 'object' || Array.isArray(image))
    throw new Error('첨부 이미지 형식을 확인해 주세요.');
  if (!IMAGE_MIMES.has(image.mimeType) || typeof image.dataBase64 !== 'string' ||
      image.dataBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(image.dataBase64))
    throw new Error('지원하지 않는 이미지이거나 너무 큰 이미지예요.');
  const bytes=Buffer.from(image.dataBase64,'base64');
  if (bytes.length < 32 || bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== image.dataBase64)
    throw new Error('이미지 크기 또는 인코딩을 확인해 주세요.');
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg=bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
  const webp=bytes.subarray(0,4).toString('ascii')==='RIFF' && bytes.subarray(8,12).toString('ascii')==='WEBP';
  if (!((image.mimeType==='image/png'&&png)||(image.mimeType==='image/jpeg'&&jpg)||(image.mimeType==='image/webp'&&webp)))
    throw new Error('첨부 이미지 파일의 내용을 확인해 주세요.');
  return {
    filename: image.mimeType==='image/jpeg'?'feedback-screenshot.jpg':image.mimeType==='image/png'?'feedback-screenshot.png':'feedback-screenshot.webp',
    mimeType:image.mimeType, dataBase64:image.dataBase64
  };
}

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
  const payload={type, message: message.trim(), nickname: nickname.trim() || '익명', version: String(version), website: ''};
  if (input.image !== undefined && input.image !== null) payload.image=validateImage(input.image);
  return payload;
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
    const timeout = delay(() => aborter.abort(), payload.image ? 30_000 : 15_000);
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
      // Old Apps Script deployments may return ok while ignoring the image.
      // Never tell the sender the screenshot was submitted unless Drive saved it.
      if (payload.image && !(body.imageSaved === true && typeof body.imageUrl === 'string' && /^https:\/\/drive\.google\.com\//.test(body.imageUrl)))
        return {ok:false,message:'서버가 이미지 저장을 확인하지 않았어요. 텍스트만 접수됐을 수 있으니 중복 전송 전에 시트를 확인해 주세요. (Apps Script 이미지 접수 기능 업데이트 필요)'};
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
