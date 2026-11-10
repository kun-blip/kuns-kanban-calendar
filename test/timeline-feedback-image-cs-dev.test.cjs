'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function moduleScript(name){
  const context={};vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'renderer',name),'utf8'),context);
  return context;
}
const event=(id,startIndex,endIndex,shared=false)=>({e:{id,title:id,shared},startIndex,endIndex});
const shared=e=>e.shared;
const laneMap=rows=>Object.fromEntries(rows.segs.map(s=>[s.e.id,s.lane]));

test('separate personal and shared schedules reuse top lane when they do not overlap',()=>{
  const {KuunsTimelinePriority:p}=moduleScript('timeline-priority.js');
  const rows=[event('personal-Mon-Tue',1,2),event('shared-Wed-Thu',3,4,true),event('personal-Sat',6,6)];
  const grouped=p.assignLanes(rows,shared);
  assert.deepEqual(laneMap(grouped),{'personal-Mon-Tue':0,'shared-Wed-Thu':0,'personal-Sat':0});
  assert.equal(grouped.lanes,1);
  assert.equal(rows[0].lane,undefined,'do not modify original rows');
});
test('shared schedule claims top row only inside overlap groups',()=>{
  const {KuunsTimelinePriority:p}=moduleScript('timeline-priority.js');
  const grouped=p.assignLanes([
    event('local-Mon',1,1),event('local-Wed-Fri',3,5),event('shared-Thu',4,4,true),event('local-Sat',6,6)
  ],shared);
  assert.deepEqual(laneMap(grouped),{'local-Mon':0,'shared-Thu':0,'local-Wed-Fri':1,'local-Sat':0});
  assert.equal(grouped.lanes,2);
});
test('overlapping shared entries occupy upper lanes and nonoverlapping group resets',()=>{
  const {KuunsTimelinePriority:p}=moduleScript('timeline-priority.js');
  const grouped=p.assignLanes([
    event('personal-week',0,2),event('shared-A',0,1,true),event('shared-B',1,2,true),event('personal-later',4,5)
  ],shared);
  const lanes=laneMap(grouped);
  assert.equal(lanes['shared-A'],0);
  assert.equal(lanes['shared-B'],1);
  assert.equal(lanes['personal-week'],2);
  assert.equal(lanes['personal-later'],0);
  assert.equal(grouped.lanes,3);
});
test('empty timeline has no rows and single schedule starts at row zero',()=>{
  const {KuunsTimelinePriority:p}=moduleScript('timeline-priority.js');
  assert.equal(p.assignLanes([],shared).lanes,0);
  assert.equal(p.assignLanes([event('only',0,6)],shared).segs[0].lane,0);
  const src=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
  assert.match(src,/KuunsTimelinePriority\.assignLanes\(segs\.map\(segment=>/);
});

test('feedback form supports screenshot paste, preview, removal, and upload affordance',()=>{
  const html=fs.readFileSync(path.join(root,'renderer/index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'renderer/app.js'),'utf8');
  const file=fs.readFileSync(path.join(root,'renderer/feedback-image.js'),'utf8');
  for(const id of ['feedbackImageDrop','feedbackImageInput','feedbackImagePreview','feedbackImageThumb','feedbackImageRemove'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/feedback-image\.js/);
  assert.match(app,/addEventListener\('paste'/);
  assert.match(app,/feedbackImagePreview/);
  assert.match(file,/MAX_SEND_BYTES=1200000/);
});

const { validateFeedback, createFeedbackController }=require('../desktop/feedback.cjs');
const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(80,7)]);
const image={filename:'screen.jpg',mimeType:'image/jpeg',dataBase64:jpeg.toString('base64')};
test('feedback image validates MIME, magic bytes and strict size limit',()=>{
  const form={type:'버그 신고',message:'이 부분이 잘려요',image};
  const data=validateFeedback(form,'1.9.21');
  assert.equal(data.image.mimeType,'image/jpeg');
  assert.equal(data.image.filename,'feedback-screenshot.jpg');
  assert.throws(()=>validateFeedback({...form,image:{...image,mimeType:'image/svg+xml'}},'1.9.21'),/이미지/);
  assert.throws(()=>validateFeedback({...form,image:{...image,dataBase64:Buffer.alloc(1200001).toString('base64')}},'1.9.21'),/이미지/);
  assert.throws(()=>validateFeedback({...form,image:{...image,dataBase64:Buffer.alloc(100).toString('base64')}},'1.9.21'),/이미지/);
});
test('legacy Apps Script response cannot pretend screenshot was saved',async()=>{
  const sender=createFeedbackController({endpoint:'https://script.google.com/macros/s/demo/exec',version:'1.9.21',
    fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({ok:true})})});
  const result=await sender.submit({type:'버그 신고',message:'이미지가 빠졌어요',image});
  assert.equal(result.ok,false);
  assert.match(result.message,/이미지 저장/);
});
test('backend explicitly acknowledges persisted screenshot to mark feedback successful',async()=>{
  let sent;
  const sender=createFeedbackController({endpoint:'https://script.google.com/macros/s/demo/exec',version:'1.9.21',
    fetchImpl:async(_,options)=>{sent=JSON.parse(options.body);return {ok:true,text:async()=>JSON.stringify({ok:true,imageSaved:true,imageUrl:'https://drive.google.com/file/d/example/view'})};}});
  const result=await sender.submit({type:'버그 신고',message:'캡처도 확인해 주세요',image});
  assert.equal(result.ok,true);
  assert.equal(sent.image.dataBase64,image.dataBase64);
});
