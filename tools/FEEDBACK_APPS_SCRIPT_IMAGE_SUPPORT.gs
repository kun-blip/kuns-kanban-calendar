/**
 * KUN'S KANBAN CALENDAR feedback receiver, including optional screenshots.
 * Google Apps Script TEMPLATE. Do not deploy without reviewing existing Sheet
 * column layout, quotas, permissions, and your current doPost implementation.
 *
 * 1. Bind script to the private feedback spreadsheet, or adapt spreadsheet lookup.
 * 2. Create a private Drive folder for screenshots.
 * 3. Set Script Property FEEDBACK_IMAGE_FOLDER_ID to that folder's ID.
 * 4. Confirm the sheet column layout and deploy a NEW web app version.
 *    The app's existing /exec URL remains the same for an edited deployment.
 *
 * NOTE: If this web app is accessible to anyone, anonymous uploads could be
 * abused. For production, add authentication / verified organization identity
 * and rate limits appropriate to your organization before enabling image uploads.
 */
const FEEDBACK_SHEET_NAME = '피드백';
const FEEDBACK_MAX_IMAGE_BYTES = 1200000;

function feedbackJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function feedbackText_(value, maxLen) {
  if (typeof value !== 'string') return '';
  const text = value.trim().slice(0, maxLen);
  // Avoid spreadsheet formula execution from public user-submitted fields.
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}
function feedbackImage_(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('이미지 형식 오류');
  const mime = raw.mimeType;
  if (mime !== 'image/png' && mime !== 'image/jpeg' && mime !== 'image/webp')
    throw new Error('지원하지 않는 이미지 형식');
  const encoded = raw.dataBase64;
  if (typeof encoded !== 'string' || encoded.length > 1600010 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new Error('이미지 인코딩 오류');
  const bytes = Utilities.base64Decode(encoded);
  if (bytes.length < 32 || bytes.length > FEEDBACK_MAX_IMAGE_BYTES) throw new Error('첨부 이미지 크기 초과');
  const first = n => bytes[n] & 255;
  const isJpeg = first(0) === 255 && first(1) === 216 && first(2) === 255;
  const isPng = [137,80,78,71,13,10,26,10].every((n,i)=>first(i)===n);
  const isWebp = String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if (!((mime==='image/jpeg'&&isJpeg)||(mime==='image/png'&&isPng)||(mime==='image/webp'&&isWebp)))
    throw new Error('이미지 헤더 오류');
  const folderId = PropertiesService.getScriptProperties().getProperty('FEEDBACK_IMAGE_FOLDER_ID');
  if (!folderId) throw new Error('이미지 저장 폴더가 설정되지 않았어요.');
  const suffix=mime==='image/jpeg'?'jpg':mime==='image/png'?'png':'webp';
  const name='calendar-feedback-'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid()+'.'+suffix;
  return DriveApp.getFolderById(folderId).createFile(Utilities.newBlob(bytes,mime,name));
}
function doPost(e) {
  let createdFile = null;
  try {
    const obj=JSON.parse(e && e.postData && e.postData.contents || '{}');
    if (!['기능 제안','버그 신고','디자인 개선'].includes(obj.type)) throw new Error('피드백 종류를 확인해 주세요.');
    if (typeof obj.message!=='string' || obj.message.trim().length<3 || obj.message.trim().length>2000)
      throw new Error('피드백은 3~2,000자로 작성해 주세요.');
    const props=PropertiesService.getScriptProperties();
    const configuredSheetId=props.getProperty('FEEDBACK_SPREADSHEET_ID');
    const book=configuredSheetId?SpreadsheetApp.openById(configuredSheetId):SpreadsheetApp.getActiveSpreadsheet();
    if (!book) throw new Error('피드백 시트 연결이 필요해요. FEEDBACK_SPREADSHEET_ID를 설정하세요.');
    const sheetName=props.getProperty('FEEDBACK_SHEET_NAME')||FEEDBACK_SHEET_NAME;
    const sheet=book.getSheetByName(sheetName);
    if (!sheet) throw new Error('피드백 시트 탭 이름을 확인해 주세요.');
    if (obj.image) createdFile=feedbackImage_(obj.image);
    const imageUrl=createdFile?createdFile.getUrl():'';
    // Match these column positions to your EXISTING feedback spreadsheet.
    // [접수 시각, 종류, 내용, 닉네임, 앱 버전, 첨부 이미지 URL]
    sheet.appendRow([
      new Date(), feedbackText_(obj.type,30), feedbackText_(obj.message,2000),
      feedbackText_(obj.nickname||'익명',40), feedbackText_(String(obj.version||''),50), imageUrl
    ]);
    SpreadsheetApp.flush();
    return feedbackJson_({ok:true,imageSaved:!!createdFile,imageUrl});
  } catch (error) {
    // If Sheet append failed, remove an unreferenced uploaded file.
    if (createdFile) {try {createdFile.setTrashed(true);} catch (_) {}}
    return feedbackJson_({ok:false,error:String(error && error.message||'접수 실패').slice(0,200)});
  }
}

/** Client capability probe: prevents partial text-only submissions on old deployments. */
function doGet(e) {
  const capability = e && e.parameter && e.parameter.capability;
  if (capability === 'feedback-image-v1') {
    const configured = !!PropertiesService.getScriptProperties().getProperty('FEEDBACK_IMAGE_FOLDER_ID');
    return feedbackJson_({ok:true,feedbackImageUpload:configured});
  }
  return feedbackJson_({ok:true,feedbackImageUpload:false});
}
