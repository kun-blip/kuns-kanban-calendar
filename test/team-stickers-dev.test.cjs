'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createSharingClient}=require('../desktop/sharing-client.cjs');
const {file,uuid,day,name,MAX_STICKER_BYTES}=require('../desktop/sticker-utils.cjs');
const image=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489', 'hex');
const imageUrl='data:image/png;base64,'+image.toString('base64');
const userId='aaebc0d0-1111-4444-8888-111111111111';
const stickerId='aaebc0d0-1111-4444-8888-222222222222';
const eventId='aaebc0d0-1111-4444-8888-333333333333';
const markId='aaebc0d0-1111-4444-8888-444444444444';
function mock(rows={}){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kuuns-stickers-'));
  fs.writeFileSync(path.join(temp,'session.json'),JSON.stringify({access_token:'fake-token',refresh_token:'fake-refresh',user:{id:userId,email:'kun@example.test'},expires_at:Math.floor(Date.now()/1000)+3600}));
  const calls=[];
  const fetchImpl=async (url,opts)=>{
    calls.push({url,opts});
    const pathname=new URL(url).pathname;
    if(pathname.startsWith('/storage/v1/object/')){
      if(opts.method==='GET')return {ok:true,status:200,headers:{get:()=>image.length},arrayBuffer:async()=>image};
      return {ok:true,status:200,headers:{get:()=>null},arrayBuffer:async()=>new ArrayBuffer(0)};
    }
    const data= pathname.includes('team_stickers') ? (opts.method==='POST'?[{id:stickerId}]:[{id:stickerId,uploader_id:userId,image_path:userId+'/'+stickerId+'.png',mime_type:'image/png'}])
      : pathname.includes('team_sticker_marks') ? (opts.method==='POST'?[{id:markId}]:[]) : (rows[pathname]||[]);
    return {ok:true,status:200,text:async()=>JSON.stringify(data)};
  };
  const client=createSharingClient({url:'https://fakeproject.supabase.co',publishableKey:'sb_publishable_fake',sessionPath:path.join(temp,'session.json'),fetchImpl});
  return {client,calls,clean:()=>fs.rmSync(temp,{recursive:true,force:true})};
}
test('PNG/WebP/GIF allowlist validates the file signature and max size',()=>{
  assert.equal(file(imageUrl).mime,'image/png');
  assert.throws(()=>file('data:image/gif;base64,'+image.toString('base64')),/형식/);
  assert.throws(()=>file('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='),/PNG/);
  assert.throws(()=>file('data:image/png;base64,'+Buffer.alloc(MAX_STICKER_BYTES+1).toString('base64')),/2MB/);
});
test('date and UUID values reject malformed input',()=>{
 assert.equal(day('2026-11-03'),'2026-11-03');assert.throws(()=>day('2026-02-30'),/날짜/);
 assert.equal(uuid(stickerId),stickerId);assert.throws(()=>uuid('../unsafe'),/유효/);
 assert.equal(name(' 화이팅 '),'화이팅');assert.throws(()=>name(' '.repeat(40)),/1~32/);
});
test('authenticated team stickers list and private binary read use auth token',async()=>{
 const {client,calls,clean}=mock();try{
  const rows=await client.stickerList();assert.equal(rows[0].id,stickerId);
  const uri=await client.stickerImage(stickerId);assert.equal(uri,imageUrl);
  assert.ok(calls.every(x=>x.opts.headers.Authorization==='Bearer fake-token'));
  assert.ok(calls.some(x=>x.url.includes('/storage/v1/object/authenticated/team-calendar-stickers/')));
 }finally{clean();}
});
test('upload uses user-owned private path and raw validated image',async()=>{
 const {client,calls,clean}=mock();try{
  const result=await client.stickerUpload('응원',imageUrl);assert.equal(result.id,stickerId);
  const upload=calls.find(x=>x.opts.method==='POST'&&x.url.includes('/storage/'));
  assert.ok(upload);assert.equal(upload.opts.headers['Content-Type'],'image/png');
  assert.ok(upload.url.includes('/'+userId+'/'));assert.deepEqual(upload.opts.body,image);
  const record=calls.find(x=>x.opts.method==='POST'&&x.url.includes('/team_stickers'));
  assert.equal(JSON.parse(record.opts.body).uploader_id,userId);
 }finally{clean();}
});
test('date sticker and event reactions are distinct targets',async()=>{
 const {client,calls,clean}=mock();try{
  await client.stickerPlace(stickerId,{date:'2026-11-07'});
  await client.stickerPlace(stickerId,{eventId});
  const payloads=calls.filter(x=>x.opts.method==='POST'&&x.url.includes('/team_sticker_marks')).map(x=>JSON.parse(x.opts.body));
  assert.deepEqual([payloads[0].target_kind,payloads[0].target_date],['date','2026-11-07']);
  assert.deepEqual([payloads[1].target_kind,payloads[1].shared_event_id],['event',eventId]);
  await client.stickerMarks({eventId});await client.stickerMarks({start:'2026-11-01',end:'2026-11-30'});
  assert.ok(calls.some(x=>x.url.includes('shared_event_id=eq.')));
  assert.ok(calls.some(x=>x.url.includes('target_date=gte.')));
  await assert.rejects(()=>client.stickerPlace(stickerId,{eventId:'not-uuid'}),/유효하지 않은/);
 }finally{clean();}
});
test('existing collaborator integration contains picker and restricted upload paths',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../renderer/index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../renderer/app.js'),'utf8');
 const sharing=fs.readFileSync(path.join(__dirname,'../renderer/sharing.js'),'utf8');
 const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261103180000_team_stickers.sql'),'utf8');
 for(const name of ['stickerLaunch','stickerOverlay','stickerActiveMarks','stickerLibraryGrid','stickerUploadForm'])assert.ok(source.includes('id="'+name+'"'));
 assert.ok(app.includes('stickersUI.renderDate(cell,key)'));
 assert.ok(sharing.includes('stickers?.attachEventReactions(section,r.id)'));
 assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'));
 assert.ok(migration.includes("bucket_id='team-calendar-stickers'"));
 assert.ok(migration.includes('actor_id=(SELECT auth.uid())'));
});
