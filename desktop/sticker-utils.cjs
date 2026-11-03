'use strict';
const ALLOWED_MIMES = Object.freeze({'image/png':'.png','image/webp':'.webp','image/gif':'.gif'});
const MAX_STICKER_BYTES = 2 * 1024 * 1024;
function uuid(value){const str=String(value||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))throw new Error('유효하지 않은 스티커 항목입니다.');return str;}
function day(value){const str=String(value||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(str)||!Number.isFinite(Date.parse(str+'T00:00:00Z'))||new Date(str+'T00:00:00Z').toISOString().slice(0,10)!==str)throw new Error('날짜 형식이 올바르지 않습니다.');return str;}
function name(value){const str=String(value||'').trim();if(!str||str.length>32||/[\u0000-\u001f<>]/.test(str))throw new Error('스티커 이름은 1~32자로 입력해 주세요.');return str;}
function file(dataUrl){
  if(typeof dataUrl!=='string'||dataUrl.length>MAX_STICKER_BYTES*1.4)throw new Error('스티커는 2MB 이내여야 합니다.');
  const match=/^data:(image\/(?:png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if(!match)throw new Error('PNG, WebP, GIF 파일만 사용할 수 있어요.');
  const bytes=Buffer.from(match[2],'base64');const mime=match[1];
  if(bytes.length<16||bytes.length>MAX_STICKER_BYTES)throw new Error('스티커는 2MB 이내여야 합니다.');
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  const gif=['GIF87a','GIF89a'].includes(bytes.toString('ascii',0,6));
  if(!(mime==='image/png'&&png||mime==='image/webp'&&webp||mime==='image/gif'&&gif))throw new Error('이미지 파일 형식이 올바르지 않습니다.');
  return {mime,ext:ALLOWED_MIMES[mime],bytes};
}
function imagePath(value){const path=String(value||'');if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|webp|gif)$/i.test(path))throw new Error('유효하지 않은 스티커 파일입니다.');return path;}
module.exports={uuid,day,name,file,imagePath,MAX_STICKER_BYTES};
