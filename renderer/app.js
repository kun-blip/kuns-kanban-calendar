(() => {
'use strict';
 const KEY='moa_timeline_calendar_v1';
 const Planner=window.KuunsPlanner;
 const TodoOps=window.KuunsTodos;
 const DESKTOP=window.kuunsDesktop||null;
const DEFAULT_GAME_ICON='data:image/webp;base64,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';
 const STATUS_VALUES=['todo','doing','done'];
const STATUS_NAMES={todo:'예정',doing:'진행',done:'완료'};
const eventStatus=e=>['review'].includes(e.status)?'doing':(e.status==='hold'?'todo':(STATUS_VALUES.includes(e.status)?e.status:(e.completed?'done':'todo')));
const COLORS=["#5671dc","#2fa98d","#a353ce","#f0a22c","#ed697b","#7358c4","#64748b","#F44336","#E91E63","#9C27B0","#673AB7","#3F51B5","#2196F3","#03A9F4","#00BCD4","#009688","#4CAF50","#8BC34A","#CDDC39","#FFEB3B","#FFC107"];
const MAX_RECENT_COLORS=8;
const hexColor=value=>typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value.trim())?value.trim().toLowerCase():'';
const allowedColor=value=>{const v=hexColor(value);return v||(COLORS.includes(value)?value:COLORS[0]);};
const $=id=>document.getElementById(id);
const iconLink='<svg class="small-icon" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4 10 14M20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1 1-1h6"/></svg>';
const today=new Date(); const toDateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayKey=toDateKey(today);
 const defaultGames=()=>[{id:'randomdice2',name:'Randomdice2',icon:''}];
const parseKey=k=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(k))return null;const [y,m,d]=k.split('-').map(Number);const v=new Date(y,m-1,d);return v.getFullYear()===y&&v.getMonth()===m-1&&v.getDate()===d?v:null;};
const dateAdd=(date,n)=>new Date(date.getFullYear(),date.getMonth(),date.getDate()+n);
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`id-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const safeLink=v=>{if(typeof v!=='string'||!v.trim())return '';let input=v.trim();if(/^www\./i.test(input))input='https://'+input;try{const url=new URL(input);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const workdayCount=(start,end)=>{const a=parseKey(start),b=parseKey(end);if(!a||!b||b<a)return 0;const days=Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000)+1;let result=Math.floor(days/7)*5;for(let i=0;i<days%7;i++){const day=(a.getDay()+i)%7;if(day!==0&&day!==6)result++;}return result;};
const fmtDate=k=>{const d=parseKey(k);return d?`${d.getMonth()+1}월 ${d.getDate()}일`:k;};
const sampleData=()=>{let y=today.getFullYear(),m=today.getMonth();const dt=d=>toDateKey(new Date(y,m,d));return{version:11,theme:'light',widgetCalendarMode:'month',calendarMode:'month',weekStart:0,notificationsEnabled:true,recentColors:[],todos:[],events:[
{id:uid(),title:'예시 · 프로모션 영상 제작',start:dt(3),end:dt(8),color:COLORS[0],description:'날짜를 클릭하거나 이 블록을 눌러 원하는 일정으로 수정해보세요.',url:'',completed:false},
{id:uid(),title:'예시 · 콘텐츠 디자인 검수',start:dt(13),end:dt(16),color:COLORS[1],description:'가로로 이어지는 타임라인 블록 예시입니다.',url:'',completed:false},
{id:uid(),title:'예시 · 마감 및 피드백',start:dt(22),end:dt(24),color:COLORS[4],description:'예시 일정은 편집하거나 삭제할 수 있습니다.',url:'',completed:false}
],games:defaultGames(),notes:[{id:uid(),title:'첫 번째 메모',body:'자유롭게 메모를 작성해보세요.\n\n일정과 메모는 PC에 자동 저장됩니다. PC 백업을 위해 상단의 [백업 저장] 버튼도 사용해 주세요.',url:'',updatedAt:Date.now(),pinned:true}],view:'compact',widgetMode:false};};
function cleanGame(g){if(!g||typeof g.name!=='string'||!g.name.trim())return null;return{id:String(g.id||uid()).slice(0,100),name:g.name.trim().slice(0,50),icon:typeof g.icon==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(g.icon)&&g.icon.length<200000?g.icon:''};}
 function cleanChecklist(raw){return (Array.isArray(raw)?raw:[]).slice(0,120).filter(x=>x&&typeof x==='object').map(x=>({id:String(x.id||uid()).slice(0,100),text:String(x.text||'').trim().slice(0,160),done:!!x.done})).filter(x=>x.text);}
 function cleanEvent(e){if(!e||typeof e!=='object'||!parseKey(e.start)||!parseKey(e.end)||e.start>e.end||typeof e.title!=='string'||!e.title.trim())return null;return{id:String(e.id||uid()),title:e.title.slice(0,120),start:e.start,end:e.end,color:allowedColor(e.color),description:String(e.description||'').slice(0,5000),url:safeLink(e.url)||'',completed:eventStatus(e)==='done',status:eventStatus(e),gameId:String(e.gameId||''),reminderAt:typeof e.reminderAt==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e.reminderAt)?e.reminderAt:'',recurrence:['weekly','monthly'].includes(e.recurrence)?e.recurrence:'none',recurrenceUntil:parseKey(e.recurrenceUntil)?e.recurrenceUntil:'',checklist:cleanChecklist(e.checklist)};}
function cleanTodo(t){if(!t||typeof t!=='object')return null;return{id:String(t.id||uid()).slice(0,100),text:String(t.text||'').slice(0,140),done:!!t.done};}
function cleanNote(n){if(!n||typeof n!=='object')return null;return{id:String(n.id||uid()),title:String(n.title||'').slice(0,120),body:String(n.body||'').slice(0,50000),url:safeLink(n.url)||'',updatedAt:Number(n.updatedAt)||Date.now(),pinned:!!n.pinned};}
 let removedPersonalPreset=false;
const DEFAULT_SHORTCUTS=()=>window.KuunsQuickLinks.defaultShortcuts();
function cleanShortcut(x){
 if(!x||typeof x!=='object')return null;
 const url=safeLink(x.url),name=String(x.name||'').trim().slice(0,42);
 if(!url||!name)return null;
 const icon=typeof x.icon==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[a-zA-Z0-9+/=]+$/.test(x.icon)&&x.icon.length<150000?x.icon:'';
 return {name,url,icon};
}
function normalizedShortcuts(value){
 const source=Array.isArray(value)?value:DEFAULT_SHORTCUTS();
 const result=source.map(entry=>{
    if(window.KuunsQuickLinks.isLegacyPersonalShortcut(entry)){removedPersonalPreset=true;return null;}
    return cleanShortcut(entry);
  });
 // Legacy v10 data had three slots. Keep them, but never truncate a larger collection.
 while(result.length<3)result.push(null);
 return result;
}
const PLATFORM=DESKTOP?.platform==='darwin'?'macOS':'Windows';
let data,toastTimer=null;try{const stored=DESKTOP?DESKTOP.readData():localStorage.getItem(KEY);if(stored){const parsed=JSON.parse(stored);data={version:11,theme:parsed.theme==='dark'?'dark':'light',widgetCalendarMode:parsed.widgetCalendarMode==='week'?'week':'month',calendarMode:parsed.calendarMode==='week'?'week':'month',weekStart:parsed.weekStart===1?1:0,notificationsEnabled:parsed.notificationsEnabled!==false,recentColors:(Array.isArray(parsed.recentColors)?parsed.recentColors:[]).map(allowedColor).filter(Boolean).slice(0,MAX_RECENT_COLORS),todos:(Array.isArray(parsed.todos)?parsed.todos:[]).map(cleanTodo).filter(Boolean),events:(Array.isArray(parsed.events)?parsed.events:[]).map(cleanEvent).filter(Boolean),notes:(Array.isArray(parsed.notes)?parsed.notes:[]).map(cleanNote).filter(Boolean),view:parsed.view==='detail'?'detail':'compact',shortcuts:normalizedShortcuts(parsed.shortcuts),widgetMode:!!parsed.widgetMode,games:(Array.isArray(parsed.games)?parsed.games:defaultGames()).map(cleanGame).filter(Boolean)};}else{data=sampleData();if(DESKTOP)DESKTOP.saveData(JSON.stringify(data)).catch(()=>notify('저장에 실패했어요.'));else localStorage.setItem(KEY,JSON.stringify(data));}}catch(e){data=sampleData();notify('저장소를 읽지 못했어요. 백업 파일을 사용해 복원할 수 있어요.');}
  data.theme=data.theme==='dark'?'dark':'light';data.widgetCalendarMode=data.widgetCalendarMode==='week'?'week':'month';data.notificationsEnabled=data.notificationsEnabled!==false;data.recentColors=(Array.isArray(data.recentColors)?data.recentColors:[]).map(allowedColor).filter(Boolean).slice(0,MAX_RECENT_COLORS);
  data.shortcuts=normalizedShortcuts(data.shortcuts);
 data.todos=Array.isArray(data.todos)?data.todos:[];
 data.calendarMode=data.calendarMode==='week'?'week':'month';
 data.weekStart=data.weekStart===1?1:0;
data.widgetMode=DESKTOP?false:!!data.widgetMode; // Always start a desktop app in normal calendar mode.
const gameById=id=>data.games.find(g=>g.id===id);
 const gameIcon=game=>game?.icon||(game?.id==='randomdice2'?DEFAULT_GAME_ICON:'');
 let month=new Date(today.getFullYear(),today.getMonth(),1),selectedDate=todayKey,editingId=null,selectedColor=COLORS[0],selectedNoteId=data.notes[0]?.id||null;let memoOpened=false,modalOpened=false,shortcutOpened=false,restoreOpened=false,editingShortcutIndex=0,shortcutEditMode=false;
function notify(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000);}
 function applyTheme(){document.documentElement.dataset.theme=data.theme;document.querySelector('meta[name="color-scheme"]').content=data.theme==='dark'?'dark':'light';$('themeToggle').innerHTML='<span class="theme-icon" aria-hidden="true">'+(data.theme==='dark'?'☀':'☾')+'</span>';$('themeToggle').setAttribute('aria-pressed',String(data.theme==='dark'));$('themeToggle').setAttribute('aria-label',data.theme==='dark'?'라이트 모드로 전환':'다크 모드로 전환');}
 applyTheme();
 $('themeToggle').addEventListener('click',()=>{data.theme=data.theme==='dark'?'light':'dark';applyTheme();save();});
 async function renderAutostart(){if(!DESKTOP?.getAutostart){$('autostartToggle').hidden=true;return;}try{const r=await DESKTOP.getAutostart();if(r.supported===false){$('autostartToggle').hidden=true;return;}else $('autostartToggle').hidden=false;$('autostartToggle').classList.toggle('is-on',!!r.enabled);$('autostartToggle').setAttribute('aria-pressed',String(!!r.enabled));}catch{$('autostartToggle').classList.remove('is-on');}}
 $('autostartToggle').addEventListener('click',async()=>{if(!DESKTOP?.setAutostart)return;try{const prev=await DESKTOP.getAutostart();const next=await DESKTOP.setAutostart(!prev.enabled);await renderAutostart();notify(next.enabled?PLATFORM+' 시작 시 자동 실행을 켰어요.':PLATFORM+' 시작 시 자동 실행을 껐어요.');}catch{notify('자동 실행 설정을 변경하지 못했어요.');}});
 renderAutostart();
function save(){
  try{renderMainTodo();renderWidget();
    const json=JSON.stringify(data);
    if(DESKTOP){
      $('saveState').textContent='PC에 저장 중…';
      DESKTOP.saveData(json).then(()=>$('saveState').textContent='이 PC의 앱 데이터 폴더에 자동 저장됨')
      .catch(()=>{$('saveState').textContent='저장 오류 · 백업을 확인해 주세요';notify('PC 저장에 실패했어요. 저장 공간을 확인해 주세요.');});
    }else{localStorage.setItem(KEY,json);$('saveState').textContent='이 PC에 자동 저장됨';}
  }catch(e){$('saveState').textContent='저장 오류: 백업을 확인해 주세요';notify('저장에 문제가 있어요.');}
}
function closeAll(){modalOpened=false;memoOpened=false;shortcutOpened=false;restoreOpened=false;$('eventModal').hidden=true;$('memoDrawer').hidden=true;$('shortcutModal').hidden=true;$('restoreModal').hidden=true;$('shade').hidden=true;document.body.style.overflow='';}
function displayOverlay(){const any=modalOpened||memoOpened||shortcutOpened||restoreOpened;$('shade').hidden=!any;document.body.style.overflow=any?'hidden':'';}
function monthWeeks(){if(data.calendarMode==='week')return [parseKey(Planner.week(selectedDate,data.weekStart))];let first=new Date(month.getFullYear(),month.getMonth(),1),last=new Date(month.getFullYear(),month.getMonth()+1,0);let start=dateAdd(first,-((first.getDay()-data.weekStart+7)%7));let weekCount=Math.ceil((Math.round((last-start)/86400000)+1)/7);return Array.from({length:weekCount},(_,i)=>dateAdd(start,7*i));}
let filters={game:'all',status:'all',query:''};
let sharedRemoteEvents=[];
let sharing=null;
function allVisibleEvents(){return data.events.concat(sharedRemoteEvents);}
function matchingEvents(){
  const term=filters.query.trim().toLocaleLowerCase();
  return allVisibleEvents().filter(e=>{
    if(filters.game!=='all' && (filters.game==='none'?!!e.gameId:e.gameId!==filters.game))return false;
    if(filters.status!=='all' && eventStatus(e)!==filters.status)return false;
    if(!term)return true;
    const g=gameById(e.gameId);
    return [e.title,e.description,g?.name].some(v=>String(v||'').toLocaleLowerCase().includes(term));
  });
}
function updateGameFilter(){
 const el=$('filterGame'),last=filters.game;
 el.replaceChildren();
 for(const [id,name] of [['all','전체 게임'],...data.games.map(g=>[g.id,g.name]),['none','미분류']]){
  const opt=document.createElement('option');opt.value=id;opt.textContent=name;el.appendChild(opt);
 }
 if(last!=='all'&&last!=='none'&&!data.games.some(g=>g.id===last))filters.game='all';
 el.value=filters.game;
}
$('filterGame').addEventListener('change',e=>{filters.game=e.target.value;renderCalendar();});
$('filterStatus').addEventListener('change',e=>{filters.status=e.target.value;renderCalendar();});
$('filterSearch').addEventListener('input',e=>{filters.query=e.target.value;renderCalendar();});
$('clearFilters').addEventListener('click',()=>{filters={game:'all',status:'all',query:''};$('filterGame').value='all';$('filterStatus').value='all';$('filterSearch').value='';renderCalendar();});
 function renderTodoInto(listId,countId){
  const list=$(listId);list.replaceChildren();
  $(countId).textContent=data.todos.filter(x=>x.done).length+'/'+data.todos.length;
  for(const task of data.todos){
    const row=document.createElement('div');row.className='widget-todo-row';
    const check=document.createElement('input');check.type='checkbox';check.checked=task.done;check.setAttribute('aria-label',task.text+' 완료');check.addEventListener('change',()=>{task.done=check.checked;save();});
    const txt=document.createElement('span');txt.textContent=task.text;if(task.done)txt.classList.add('done');
    const edit=document.createElement('button');edit.type='button';edit.className='widget-todo-edit';edit.title='할 일 수정';edit.setAttribute('aria-label',task.text+' 수정');edit.textContent='✎';
    edit.addEventListener('click',()=>{
      const input=document.createElement('input');input.type='text';input.className='widget-todo-edit-input';input.maxLength=140;input.value=task.text;input.setAttribute('aria-label','할 일 내용 수정');
      const saveBtn=document.createElement('button');saveBtn.type='button';saveBtn.className='widget-todo-save';saveBtn.textContent='✓';saveBtn.title='수정 저장';
      const cancelBtn=document.createElement('button');cancelBtn.type='button';cancelBtn.className='widget-todo-cancel';cancelBtn.textContent='↶';cancelBtn.title='수정 취소';
      const cancel=()=>{input.replaceWith(txt);saveBtn.replaceWith(edit);cancelBtn.remove();};
      const commit=()=>{const result=TodoOps.update(data.todos,task.id,input.value);if(!input.value.trim()){notify('할 일을 입력해 주세요.');input.focus();return;}if(result.changed){data.todos=result.todos;save();}else cancel();};
      input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();}if(event.key==='Escape'){event.preventDefault();cancel();}});
      saveBtn.addEventListener('click',commit);cancelBtn.addEventListener('click',cancel);
      txt.replaceWith(input);edit.replaceWith(saveBtn);saveBtn.after(cancelBtn);input.focus();input.select();
    });
    const del=document.createElement('button');del.type='button';del.className='widget-todo-remove';del.title='이 Todo 삭제';del.setAttribute('aria-label',task.text+' 삭제');del.textContent='×';del.addEventListener('click',()=>{data.todos=data.todos.filter(t=>t.id!==task.id);save();});
    row.append(check,txt,edit,del);list.appendChild(row);
  }
  if(!data.todos.length){const p=document.createElement('p');p.className='widget-empty';p.textContent='할 일이 없어요. 아래에서 새로 등록해 보세요.';list.appendChild(p);}
 }
 function renderWidgetTodo(){renderTodoInto('widgetTodoList','widgetTodoCount');}
 function renderMainTodo(){renderTodoInto('mainTodoList','mainTodoCount');}
 function bindTodoForm(formId,inputId){$(formId).addEventListener('submit',e=>{e.preventDefault();const input=$(inputId),text=input.value.trim();if(!text)return;data.todos.push({id:uid(),text,done:false});input.value='';save();});}
 bindTodoForm('widgetTodoForm','widgetTodoInput');
 bindTodoForm('mainTodoForm','mainTodoInput');
   function renderWidgetMini(){
   const now=new Date(),y=now.getFullYear(),m=now.getMonth(),first=new Date(y,m,1),offset=(first.getDay()-data.weekStart+7)%7,end=new Date(y,m+1,0).getDate();
   const weekly=data.widgetCalendarMode==='week';
   $('miniMonthLabel').textContent=`${y}년 ${m+1}월${weekly?' · 이번 주':''}`;
   $('widgetMiniMode').textContent=weekly?'월간':'주간';
   $('widgetMiniMode').setAttribute('aria-pressed',String(weekly));
   const grid=$('widgetMiniCalendar');grid.replaceChildren();
   Planner.dayOrder(data.weekStart).forEach(day=>{const b=document.createElement('span');b.className='mini-dayhead';b.textContent=['일','월','화','수','목','금','토'][day];b.classList.add(day===0?'is-sunday':day===6?'is-saturday':'is-weekday');grid.appendChild(b);});
   const dates=weekly?Array.from({length:7},(_,i)=>dateAdd(now,-((now.getDay()-data.weekStart+7)%7)+i)):Array.from({length:offset+end},(_,i)=>i<offset?null:new Date(y,m,i-offset+1));
   for(const d of dates){if(!d){grid.appendChild(document.createElement('span'));continue;}
     const key=toDateKey(d),b=document.createElement('button');b.type='button';b.textContent=d.getDate();b.className='mini-day'+(key===todayKey?' today':'')+(key===selectedDate?' selected':'')+(d.getMonth()!==m?' outside':'');
     if(Planner.expand(allVisibleEvents(),key,key).length)b.classList.add('has-event');
     b.title=key+' 날짜 보기';b.addEventListener('click',()=>{selectedDate=key;month=new Date(d.getFullYear(),d.getMonth(),1);setWidgetMode(false);renderCalendar();});grid.appendChild(b);
   }
  }
  $('widgetMiniMode').addEventListener('click',()=>{data.widgetCalendarMode=data.widgetCalendarMode==='week'?'month':'week';save();renderWidgetMini();});function renderWidget(){
 if(!data.widgetMode)return;
 const todayDate=new Date();todayDate.setHours(0,0,0,0);
 const key=toDateKey(todayDate),weekLater=toDateKey(dateAdd(todayDate,7));
   renderWidgetTodo();renderWidgetMini();
  $('widgetDate').textContent=`${todayDate.getFullYear()}년 ${todayDate.getMonth()+1}월 ${todayDate.getDate()}일`;
 const relevant=Planner.expand(allVisibleEvents(),key,weekLater).filter(e=>eventStatus(e)!=='done');
 const current=relevant.filter(e=>e.start<=key&&e.end>=key).sort((a,b)=>a.start.localeCompare(b.start));
 const upcoming=relevant.filter(e=>e.start>key&&e.start<=weekLater).sort((a,b)=>a.start.localeCompare(b.start));
 $('widgetTodayCount').textContent=current.length+'개';
 function fill(list,values,message){
   list.replaceChildren();
   if(!values.length){const empty=document.createElement('p');empty.className='widget-empty';empty.textContent=message;list.appendChild(empty);return;}
   for(const e of values.slice(0,6)){
     const btn=document.createElement('button');btn.type='button';btn.className='widget-item';
     const flag=document.createElement('span');flag.className='widget-flag';flag.style.background=e.color;
     const body=document.createElement('span');body.className='widget-item-copy';
     const title=document.createElement('strong');title.textContent=e.title;
     const hint=document.createElement('small');hint.textContent=`${fmtDate(e.start)} ~ ${fmtDate(e.end)} · ${STATUS_NAMES[eventStatus(e)]}`;
     body.append(title,hint);btn.append(flag,body);btn.addEventListener('click',()=>openEvent(e.id));list.appendChild(btn);
   }
 }
 fill($('widgetTodayEvents'),current,'오늘 진행 중인 일정이 없어요.');
 fill($('widgetUpcomingEvents'),upcoming,'7일 이내에 시작하는 일정이 없어요.');
 const pin=$('widgetPinnedNotes');pin.replaceChildren();
 for(const n of data.notes.filter(x=>x.pinned).slice(0,2)){
    const b=document.createElement('button');b.type='button';b.className='widget-note';
    const title=document.createElement('strong');title.textContent=n.title||'제목 없는 메모';
    const preview=document.createElement('span');preview.textContent=n.body||'메모 내용을 입력해 주세요';
    b.append(title,preview);b.addEventListener('click',()=>{selectedNoteId=n.id;openMemo();});pin.appendChild(b);
 }
 if(!pin.children.length){const p=document.createElement('p');p.className='widget-empty';p.textContent='고정한 메모가 없어요.';pin.appendChild(p);}
}
async function setWidgetMode(on,persist=true){
 data.widgetMode=!!on;
 document.body.classList.toggle('widget-mode',data.widgetMode);
 $('widgetPanel').hidden=!data.widgetMode;
 if(persist)save();
 if(DESKTOP){try{await DESKTOP.setWidgetMode(data.widgetMode);}catch(err){notify('위젯 창 크기를 조절하지 못했어요.');}}
 renderWidget();
}
$('widgetToggle').addEventListener('click',()=>setWidgetMode(true));
$('widgetRestore').addEventListener('click',()=>setWidgetMode(false));
const backupMenuWrap=document.querySelector('.backup-menu-wrap');
function closeBackupMenu(){backupMenuWrap.classList.remove('open');$('backupMenuPanel').hidden=true;$('backupMenuToggle').setAttribute('aria-expanded','false');}
function toggleBackupMenu(force){const open=typeof force==='boolean'?force:$('backupMenuPanel').hidden;backupMenuWrap.classList.toggle('open',open);$('backupMenuPanel').hidden=!open;$('backupMenuToggle').setAttribute('aria-expanded',String(open));}
$('backupMenuToggle').addEventListener('click',e=>{e.stopPropagation();toggleBackupMenu();});
document.addEventListener('click',e=>{if(!backupMenuWrap.contains(e.target))closeBackupMenu();});
['backupFolderBtn','exportBtn','importBtn'].forEach(id=>$(id).addEventListener('click',()=>setTimeout(closeBackupMenu,0)));
$('widgetAddEvent').addEventListener('click',()=>openEvent(null,todayKey));
$('widgetTodayFull').addEventListener('click',()=>{month=new Date(today.getFullYear(),today.getMonth(),1);selectedDate=todayKey;setWidgetMode(false);renderCalendar();});
function renderShortcuts(){
 const nav=$('quickLinks');nav.replaceChildren();
 data.shortcuts.forEach((entry,i)=>{
  const edit=shortcutEditMode||!entry;
  const b=document.createElement(edit?'button':'a');b.className='quick-tile'+(entry?'':' empty')+(shortcutEditMode?' editing':'');
  b.title=entry?`${entry.name}${shortcutEditMode?' 편집':''}`:`바로가기 ${i+1} 추가`;
  b.setAttribute('aria-label',b.title);
  if(!edit){b.href=entry.url;b.target='_blank';b.rel='noopener noreferrer';}
  if(entry?.icon){const img=document.createElement('img');img.src=entry.icon;img.alt='';b.appendChild(img);}
  else if(entry){const span=document.createElement('span');span.className='shortcut-letter';span.textContent=entry.name[0].toUpperCase();b.appendChild(span);}
  else {b.type='button';b.textContent='+';}
  if(edit){b.type='button';b.addEventListener('click',()=>openShortcut(i));}
  nav.appendChild(b);
 });
 if(shortcutEditMode){
   const add=document.createElement('button');add.type='button';
   add.className='quick-tile empty quick-add-tile';add.textContent='+';
   add.title='새 바로가기 추가';add.setAttribute('aria-label','새 바로가기 추가');
   add.addEventListener('click',()=>openShortcut(data.shortcuts.length));
   nav.appendChild(add);
 }
 $('manageShortcuts').textContent=shortcutEditMode?'완료':'편집';
 $('shortcutHint').textContent=shortcutEditMode?'기존 아이콘을 눌러 수정·삭제하거나 마지막 +로 계속 추가하세요.':'편집을 누르면 원하는 만큼 바로가기를 추가할 수 있어요.';
}
function openShortcut(index){
 editingShortcutIndex=index;shortcutOpened=true;
 const entry=data.shortcuts[index];
 $('shortcutModalTitle').textContent=entry?'바로가기 수정':'바로가기 추가';
 $('shortcutName').value=entry?.name||'';$('shortcutUrl').value=entry?.url||'';
 $('shortcutIconFile').value='';$('removeShortcut').hidden=!entry;
 $('shortcutIconPreview').hidden=!entry?.icon;
 if(entry?.icon)$('shortcutIconPreview').src=entry.icon;
 $('shortcutModal').hidden=false;displayOverlay();
}
function closeShortcut(){shortcutOpened=false;$('shortcutModal').hidden=true;displayOverlay();}
$('manageShortcuts').addEventListener('click',()=>{shortcutEditMode=!shortcutEditMode;renderShortcuts();});
$('closeShortcut').addEventListener('click',closeShortcut);
$('cancelShortcut').addEventListener('click',closeShortcut);
$('removeShortcut').addEventListener('click',()=>{if(!confirm('이 바로가기를 삭제할까요?'))return;data.shortcuts.splice(editingShortcutIndex,1);while(data.shortcuts.length<3)data.shortcuts.push(null);save();closeShortcut();renderShortcuts();notify('바로가기를 삭제했어요.');});
$('shortcutForm').addEventListener('submit',async ev=>{
 ev.preventDefault();const name=$('shortcutName').value.trim(),url=safeLink($('shortcutUrl').value);
 if(!name||!url){notify('이름과 http/https 주소를 확인해 주세요.');return;}
 try{
  const original=data.shortcuts[editingShortcutIndex];
  const file=$('shortcutIconFile').files?.[0];
  const icon=file?await resizeGameIcon(file):(original?.icon||'');
  data.shortcuts[editingShortcutIndex]={name,url,icon};save();closeShortcut();renderShortcuts();notify('바로가기를 저장했어요.');
 }catch(err){notify(err.message||'아이콘을 읽지 못했어요.');}
});
function makeSegments(weekStart){
 const start=toDateKey(weekStart),end=toDateKey(dateAdd(weekStart,6));
 // Timeline cells include Mon..Fri, regardless of chosen week start.
 // Weekends stay in the saved start/end dates but are visually skipped.
 const allowed=new Set(matchingEvents().map(e=>e.id));
  const segs=Planner.expand(allVisibleEvents(),start,end).filter(e=>allowed.has(e.id)).map(e=>{
   const st=e.start<start?start:e.start,en=e.end>end?end:e.end;
   const first=Math.round((parseKey(st)-weekStart)/86400000),last=Math.round((parseKey(en)-weekStart)/86400000);
   const [firstWorkday,lastWorkday]=Planner.workdayBounds(data.weekStart);const startIndex=Math.max(firstWorkday,first),endIndex=Math.min(lastWorkday,last);
   if(startIndex>endIndex)return null; // weekend only
   return {e,startIndex,endIndex,leftContinuation:e.start<toDateKey(dateAdd(weekStart,startIndex)),rightContinuation:e.end>toDateKey(dateAdd(weekStart,endIndex))};
 }).filter(Boolean).sort((a,b)=>a.startIndex-b.startIndex || (b.endIndex-b.startIndex)-(a.endIndex-a.startIndex) || a.e.title.localeCompare(b.e.title));
 const laneEnds=[];
 for(const segment of segs){let lane=laneEnds.findIndex(v=>v<segment.startIndex);if(lane<0){lane=laneEnds.length;laneEnds.push(segment.endIndex);}else laneEnds[lane]=segment.endIndex;segment.lane=lane;}
 return {segs,lanes:laneEnds.length};
}
function renderCalendar(){
 const weekMode=data.calendarMode==='week';
 const mStart=weekMode?Planner.week(selectedDate,data.weekStart):toDateKey(new Date(month.getFullYear(),month.getMonth(),1));
 const mEnd=weekMode?Planner.add(mStart,6):toDateKey(new Date(month.getFullYear(),month.getMonth()+1,0));
 $('monthLabel').textContent=weekMode?`${fmtDate(mStart)} ~ ${fmtDate(mEnd)}`:`${month.getFullYear()}년 ${month.getMonth()+1}월`;
 $('monthMode').classList.toggle('selected',!weekMode);$('weekMode').classList.toggle('selected',weekMode);
 const visible=Planner.expand(allVisibleEvents(),mStart,mEnd);const allowed=new Set(matchingEvents().map(e=>e.id));const showing=visible.filter(e=>allowed.has(e.id));
 $('monthSummary').textContent=`${weekMode?'이번 주':'이번 달'} 일정 ${visible.length}개 · 표시 ${showing.length}개 · 완료 ${visible.filter(e=>eventStatus(e)==='done').length}개`;
 const compact=data.view==='compact';$('compactBtn').classList.toggle('selected',compact);$('detailBtn').classList.toggle('selected',!compact);
 $('weekStartSelect').value=String(data.weekStart);
 const headers=$('weekdayHeaders');headers.replaceChildren();
 for(const day of Planner.dayOrder(data.weekStart)){const col=document.createElement('div');col.className='weekday'+(day===0?' is-sunday':day===6?' is-saturday':'');col.textContent=['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][day];headers.appendChild(col);}
 renderMainTodo();

const calendar=$('calendar');calendar.replaceChildren();
for(const weekStart of monthWeeks()){
  const {segs,lanes}=makeSegments(weekStart);const maxShown=compact?2:Infinity,step=compact?29:38;
  const h=compact?128:Math.max(137,48+lanes*38+18);
  const week=document.createElement('div');week.className='week';week.style.height=h+'px';const dayRow=document.createElement('div');dayRow.className='days-row';
  for(let day=0;day<7;day++){
    const d=dateAdd(weekStart,day),key=toDateKey(d);const cell=document.createElement('div');cell.className='date-cell';cell.dataset.date=key;if(d.getMonth()!==month.getMonth())cell.classList.add('other-month');if(key===todayKey)cell.classList.add('is-today');if(key===selectedDate)cell.classList.add('selected-date');if(d.getDay()===0)cell.classList.add('sunday');if(d.getDay()===6)cell.classList.add('saturday');
    const number=document.createElement('button');number.className='date-btn';number.textContent=String(d.getDate());number.setAttribute('aria-label',`${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 작업 보기`);number.addEventListener('click',()=>{selectDate(key);openEvent(null,key);});const hit=document.createElement('button');hit.className='day-hit';hit.tabIndex=-1;hit.setAttribute('aria-label',`${key} 날짜 클릭`);hit.addEventListener('click',()=>{selectDate(key);openEvent(null,key);});cell.append(number,hit);
    if(compact){const hiddenCount=segs.filter(s=>s.lane>=maxShown&&s.startIndex<=day&&s.endIndex>=day).length;if(hiddenCount){const more=document.createElement('button');more.className='more-count';more.textContent=`+${hiddenCount}개 더`;more.title='자세히 보기';more.addEventListener('click',()=>{data.view='detail';save();renderCalendar();});cell.appendChild(more);}}
    dayRow.appendChild(cell);
  }
  week.appendChild(dayRow);
  const layer=document.createElement('div');layer.className='event-layer';
  for(const s of segs){if(s.lane>=maxShown)continue;const block=document.createElement('button');block.type='button';block.className='event-block'+(compact?'':' detailed')+(s.leftContinuation?' continues-before':'')+(s.rightContinuation?' continues-after':'')+(eventStatus(s.e)==='done'?' completed':'')+' status-'+eventStatus(s.e);block.style.setProperty('--event-color',s.e.color);block.style.left=`calc(${(100*s.startIndex/7).toFixed(6)}% + 5px)`;block.style.width=`calc(${(100*(s.endIndex-s.startIndex+1)/7).toFixed(6)}% - 10px)`;block.style.top=(40+step*s.lane)+'px';block.title=`[${STATUS_NAMES[eventStatus(s.e)]}] ${s.e.title} (${workdayCount(s.e.start,s.e.end)}일)\n${s.e.start} ~ ${s.e.end}${s.e.description?'\n'+s.e.description:''}`;
     
     const dot=document.createElement('span');dot.className='event-status-dot';dot.title='상태: '+STATUS_NAMES[eventStatus(s.e)];block.appendChild(dot);
     const g=gameById(s.e.gameId);const src=gameIcon(g);if(src){const pic=document.createElement('img');pic.className='event-game-icon';pic.src=src;pic.alt='';pic.setAttribute('aria-hidden','true');block.appendChild(pic);} const name=document.createElement('span');name.className='event-label';name.textContent=s.e.title;block.appendChild(name);const duration=workdayCount(s.e.start,s.e.end);if(duration>1){const days=document.createElement('span');days.className='event-duration';days.textContent=`(${duration}일)`;block.appendChild(days);}if(s.e.checklist?.length){const progress=document.createElement('span');progress.className='event-check-progress';progress.textContent=s.e.checklist.filter(c=>c.done).length+'/'+s.e.checklist.length;progress.title='작업 체크리스트 진행률';block.appendChild(progress);}
     if(s.e.url){const g=document.createElement('span');g.className='link-glyph';g.textContent='↗';block.appendChild(g);}
     block.addEventListener('click',()=>{if(Date.now()-lastDragAt<400)return;openEvent(s.e.id);});
     if(s.e.remoteReadOnly){block.title+='\n동료가 공유한 읽기 전용 일정입니다.';}else if(s.e.isOccurrence){block.title+='\n반복 일정은 편집창에서 전체 반복을 수정하세요.';}else{
       let finalVisible=s.e.end;
   for(let back=0;back<7;back++){const weekday=parseKey(finalVisible).getDay();if(weekday>0&&weekday<6)break;finalVisible=Planner.add(finalVisible,-1);}
   if(finalVisible===toDateKey(dateAdd(weekStart,s.endIndex))){const grip=document.createElement('span');grip.className='resize-grip';grip.title='드래그하여 종료일 변경';block.appendChild(grip);}
       block.addEventListener('pointerdown',ev=>startTimelineDrag(ev,block,s.e,weekStart));
     }
     layer.appendChild(block);
  }
    week.appendChild(layer);calendar.appendChild(week);
 }
 renderDayPanel();
 }
 let lastDragAt=0;const dragUndo=[];function clearDragUndo(){dragUndo.length=0;$('undoTimeline').disabled=true;}
 function selectDate(key){selectedDate=key;month=new Date(parseKey(key).getFullYear(),parseKey(key).getMonth(),1);renderCalendar();}
 function renderDayPanel(){
  const k=selectedDate,d=parseKey(k),events=Planner.expand(allVisibleEvents(),k,k).filter(e=>matchingEvents().some(f=>f.id===e.id));
  $('dayPanelTitle').textContent=`${d.getMonth()+1}월 ${d.getDate()}일 · ${['일','월','화','수','목','금','토'][d.getDay()]}요일`;
  $('dayPanelSummary').textContent=`이날 관련된 작업 ${events.length}개 · 날짜 선택은 한 번 클릭, 일정 추가는 아래 버튼`;
  const list=$('dayEventList');list.replaceChildren();
  for(const e of events){const b=document.createElement('button');b.type='button';b.className='day-event';const dot=document.createElement('i');dot.style.background=e.color;
   const title=document.createElement('strong');title.textContent=e.title;
   const status=document.createElement('small');status.textContent=STATUS_NAMES[eventStatus(e)]+(e.recurrence&&e.recurrence!=='none'?' · 반복':'');
   b.append(dot,title,status);b.addEventListener('click',()=>openEvent(e.id));list.appendChild(b);}
  if(!events.length){const p=document.createElement('span');p.className='empty-day';p.textContent='등록된 일정이 없습니다.';list.appendChild(p);}
 }
 $('addSelectedDay').addEventListener('click',()=>openEvent(null,selectedDate));
 $('monthMode').addEventListener('click',()=>{data.calendarMode='month';save();renderCalendar();});
 $('weekMode').addEventListener('click',()=>{data.calendarMode='week';save();renderCalendar();});
 $('weekStartSelect').addEventListener('change',event=>{data.weekStart=event.target.value==='1'?1:0;save();renderCalendar();});
 $('undoTimeline').addEventListener('click',()=>{
  const previous=dragUndo.pop();if(!previous)return;
  data.events=previous.map(cleanEvent).filter(Boolean);save();renderCalendar();$('undoTimeline').disabled=!dragUndo.length;notify('타임라인 변경을 되돌렸어요.');
 });
 document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.shiftKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&dragUndo.length){e.preventDefault();$('undoTimeline').click();}
 });
 function startTimelineDrag(ev,block,event,weekStart){
  if(ev.button!==0||event.recurrence&&event.recurrence!=='none')return;
  const isResize=ev.target.closest('.resize-grip')!==null;
  const sourceCell=document.elementsFromPoint(ev.clientX,ev.clientY).find(el=>el.classList?.contains('date-cell'));
  const anchor=sourceCell?.dataset.date||event.start;let target=anchor,moved=false;
  const x0=ev.clientX,y0=ev.clientY,initialWidth=block.getBoundingClientRect().width;block.classList.add('dragging');ev.preventDefault();
  function move(e){
   if(Math.hypot(e.clientX-x0,e.clientY-y0)<5)return;
   moved=true;if(isResize)block.style.width=Math.max(25,initialWidth+e.clientX-x0)+'px';else block.style.setProperty('transform',`translate(${e.clientX-x0}px, ${e.clientY-y0}px)`,'important');const cells=document.elementsFromPoint(e.clientX,e.clientY);
   const cell=cells.find(el=>el.classList?.contains('date-cell'));
   if(cell)target=cell.dataset.date;
  }
  function end(e){window.removeEventListener('pointermove',move);window.removeEventListener('pointercancel',cancel);block.classList.remove('dragging');block.style.removeProperty('transform');if(!moved){block.style.removeProperty('width');return;}
   const delta=Planner.days(anchor,target);if(!delta)return;
   const newStart=isResize?event.start:Planner.add(event.start,delta),newEnd=Planner.add(event.end,delta);
   if(newEnd<newStart)return;
   dragUndo.push(data.events.map(e=>({...e})));if(dragUndo.length>15)dragUndo.shift();
   const original=data.events.find(x=>x.id===event.id);if(!original)return;
   original.start=newStart;original.end=newEnd;
   if(!isResize&&original.reminderAt)original.reminderAt=Planner.add(original.reminderAt.slice(0,10),delta)+original.reminderAt.slice(10);
   lastDragAt=Date.now();$('undoTimeline').disabled=false;save();void sharing?.syncEditedEvent({...original,gameName:gameById(original.gameId)?.name||''});renderCalendar();notify(isResize?'종료일을 변경했어요. ↶ 실행 취소 가능':'일정을 이동했어요. ↶ 실행 취소 가능');
  }
  function cancel(){window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);block.classList.remove('dragging');block.style.removeProperty('transform');block.style.removeProperty('width');}
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',end,{once:true});window.addEventListener('pointercancel',cancel,{once:true});
 }
function renderColors(){
 const palette=$('colorPalette');palette.replaceChildren();
 const options=COLORS.includes(selectedColor)?COLORS:[...COLORS,selectedColor];
 for(const c of options){
   const b=document.createElement('button');b.type='button';b.className='color-dot'+(c===selectedColor?' selected':'');b.style.setProperty('--dot',c);b.setAttribute('aria-label',`타임라인 색상 ${c}`);b.setAttribute('aria-pressed',String(c===selectedColor));b.title=c;
   b.addEventListener('click',()=>{selectedColor=c;renderColors();});palette.appendChild(b);
 }
}

function renderGameSelect(selected='randomdice2'){
 const select=$('gameSelect');select.replaceChildren();
 const none=document.createElement('option');none.value='';none.textContent='타이틀 없음';select.appendChild(none);
 for(const game of data.games){const opt=document.createElement('option');opt.value=game.id;opt.textContent=game.name;select.appendChild(opt);}
 select.value=selected===''?'':(data.games.some(g=>g.id===selected)?selected:(data.games[0]?.id||''));
  $('deleteGameBtn').disabled=!select.value;
  $('editGameToggle').disabled=!select.value;
 }
$('gameSelect').addEventListener('change',()=>{const has=!!$('gameSelect').value;$('deleteGameBtn').disabled=!has;$('editGameToggle').disabled=!has;});
 $('deleteGameBtn').addEventListener('click',()=>{
  const id=$('gameSelect').value, game=gameById(id);if(!game)return;
  const count=data.events.filter(e=>e.gameId===id).length;
  if(!confirm(`‘${game.name}’ 게임 타이틀을 삭제할까요?\n\n${count?`연결된 일정 ${count}개의 제목과 일정은 유지되며, 게임 아이콘과 연결만 해제됩니다.`:'등록된 일정에는 영향을 주지 않습니다.'}`))return;
  data.games=data.games.filter(g=>g.id!==id);for(const e of data.events)if(e.gameId===id)e.gameId='';
  save();renderGameSelect(data.games[0]?.id||'');updateGameFilter();renderCalendar();notify('게임 타이틀을 삭제했어요. 기존 일정은 그대로 남아요.');
 });
let editingGameId=null;
function openGameEditor(id=null){
 const game=id?gameById(id):null;editingGameId=game?.id||null;
 $('gameCreator').hidden=false;
 $('gameNameLabel').textContent=game?'게임 타이틀 수정':'새 게임 타이틀 이름';
 $('newGameName').value=game?.name||'';$('newGameIcon').value='';
 $('gameIconPreview').hidden=!game?.icon;if(game?.icon)$('gameIconPreview').src=game.icon;
 $('removeGameIconWrap').hidden=!game?.icon;$('removeGameIcon').checked=false;
 $('saveGame').textContent=game?'변경사항 저장':'타이틀 등록';$('newGameName').focus();
}
$('addGameToggle').addEventListener('click',()=>{if(!$('gameCreator').hidden&&!editingGameId){$('gameCreator').hidden=true;return;}openGameEditor();});
$('editGameToggle').addEventListener('click',()=>{const id=$('gameSelect').value;if(id)openGameEditor(id);});
$('cancelGame').addEventListener('click',()=>{$('gameCreator').hidden=true;editingGameId=null;});
const resizeGameIcon=async file=>{
 if(!file)return '';if(file.size>5*1024*1024)throw Error('아이콘 파일은 최대 5MB까지 지원해요.');
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('PNG/JPG/WEBP/GIF 이미지만 지원해요.');
 const image=await createImageBitmap(file);
 try{const c=document.createElement('canvas');c.width=96;c.height=96;const context=c.getContext('2d');const sc=Math.min(96/image.width,96/image.height),w=image.width*sc,h=image.height*sc;context.drawImage(image,(96-w)/2,(96-h)/2,w,h);return c.toDataURL('image/webp',.82);}finally{image.close();}
};
$('saveGame').addEventListener('click',async()=>{
 const name=$('newGameName').value.trim();if(!name){notify('게임 타이틀 이름을 입력해 주세요.');return;}
 if(data.games.some(g=>g.id!==editingGameId&&g.name.toLowerCase()===name.toLowerCase())){notify('이미 등록된 게임 타이틀이에요.');return;}
 try{
 const existing=editingGameId?gameById(editingGameId):null;
 if(editingGameId&&!existing)throw new Error('수정할 타이틀을 찾지 못했어요.');
 const file=$('newGameIcon').files?.[0];
 const icon=$('removeGameIcon').checked?'':file?await resizeGameIcon(file):(existing?.icon||'');
 const item=existing||{id:uid(),name,icon};item.name=name;item.icon=icon;
 if(!existing)data.games.push(item);
 save();renderGameSelect(item.id);updateGameFilter();renderCalendar();renderWidget();
 $('gameCreator').hidden=true;$('newGameName').value='';$('newGameIcon').value='';
 editingGameId=null;notify(existing?'게임 타이틀을 수정했어요. 기존 일정의 연결도 유지돼요.':'게임 타이틀을 추가했어요.');
}catch(error){notify(error.message||'아이콘을 불러오지 못했어요.');}
});
function reminderDefault(dateKey){return `${dateKey}T09:00`;}
 function computeReminderAt(){
   const start=$('startDate').value||todayKey, offset=$('reminderTiming').value;
   if(!parseKey(start))return '';
   const date=offset==='custom'?$('customReminderDate').value:toDateKey(dateAdd(parseKey(start),-Number(offset)));
   const time=$('reminderTime').value||'';
   return parseKey(date)&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time)?`${date}T${time}`:'';
 }
 function updateReminderPreview(){
   $('customReminderWrap').hidden=$('reminderTiming').value!=='custom';
   const at=computeReminderAt();$('eventReminderAt').value=at;
   $('reminderSchedule').textContent=at?`🔔 ${at.slice(0,10)} ${at.slice(11)}에 알림 팝업 예정`:'알림 날짜와 시간을 확인해 주세요.';
 }
 function setReminderFields(at){
   const start=$('startDate').value||todayKey, raw=at||reminderDefault(start);
   $('eventReminderOn').checked=!!at;$('remindDateField').hidden=!at;
   $('reminderTime').value=raw.slice(11,16)||'09:00';
   const reminderDate=raw.slice(0,10),delta=parseKey(reminderDate)&&parseKey(start)?Math.round((Date.UTC(parseKey(start).getFullYear(),parseKey(start).getMonth(),parseKey(start).getDate())-Date.UTC(parseKey(reminderDate).getFullYear(),parseKey(reminderDate).getMonth(),parseKey(reminderDate).getDate()))/86400000):null;
   $('reminderTiming').value=[0,1,2,3].includes(delta)?String(delta):'custom';
   $('customReminderDate').value=reminderDate;
   updateReminderPreview();updateNotificationStatus();
 }
function notificationAvailable(){return DESKTOP?true:('Notification' in window&&window.isSecureContext);}
function updateNotificationStatus(){
 const btn=$('notificationBtn');btn.classList.toggle('active',!!data.notificationsEnabled);btn.setAttribute('aria-pressed',String(!!data.notificationsEnabled));
 if(DESKTOP){$('noticeStatus').textContent=data.notificationsEnabled?'알림 예정 시각에 '+PLATFORM+' 시스템 알림을 표시해요. 앱이 트레이에서 실행 중이어야 합니다.':PLATFORM+' 알림이 꺼져 있어요. 이 앱에서 다시 켤 수 있어요.';return;}
 if(!notificationAvailable()){$('noticeStatus').textContent='PC 알림을 지원하지 않는 실행 환경입니다. 앱 내 알림은 사용할 수 있어요.';return;}
 const perm=Notification.permission;
 if(!data.notificationsEnabled){$('noticeStatus').textContent='앱의 알림 표시가 꺼져 있어요. 상단 벨 아이콘으로 다시 켤 수 있어요.';return;}
 $('noticeStatus').textContent=perm==='granted'?'PC 알림이 허용되었어요.':'default'===perm?'PC 알림을 받으려면 상단의 벨 아이콘을 눌러 허용하세요.':'PC 알림이 차단되어 있어요. 브라우저 사이트 설정에서 알림을 허용해 주세요.';
}
async function requestNotifyPermission(){
 if(data.notificationsEnabled){data.notificationsEnabled=false;updateNotificationStatus();save();notify(PLATFORM+' 알림을 껐어요.');return;}
 data.notificationsEnabled=true;
 if(!notificationAvailable()){notify('브라우저 환경에서 PC 알림을 사용할 수 없어요. 앱 내 알림만 사용돼요.');updateNotificationStatus();save();return;}
 try{if(!DESKTOP&&Notification.permission==='default'){const result=await Notification.requestPermission();if(result!=='granted')data.notificationsEnabled=false;notify(result==='granted'?'PC 알림이 허용되었어요.':'PC 알림 권한이 허용되지 않았어요.');}else notify(PLATFORM+' 알림을 켰어요.');}
 catch{data.notificationsEnabled=false;notify('PC 알림 권한 요청에 실패했어요.');}
 updateNotificationStatus();save();
}
$('notificationBtn').addEventListener('click',requestNotifyPermission);
$('eventReminderOn').addEventListener('change',()=>{$('remindDateField').hidden=!$('eventReminderOn').checked;updateReminderPreview();updateNotificationStatus();});
 for(const id of ['startDate','reminderTiming','reminderTime','customReminderDate'])$(id).addEventListener('change',updateReminderPreview);
 for(const id of ['reminderTime','customReminderDate'])$(id).addEventListener('input',updateReminderPreview);
function popupForEvent(title,body,onclick,tag='test'){
 if(data.notificationsEnabled&&notificationAvailable()&&Notification.permission==='granted'){
  try{const n=new Notification(title,{body,icon:DEFAULT_GAME_ICON,tag:'kuuns-reminder-'+tag});if(onclick)n.onclick=()=>{window.focus();onclick();n.close();};return true;}catch(err){/* file:// or platform unsupported: fallback */}
 }return false;
}
$('testNotification').addEventListener('click',async()=>{if(DESKTOP){const result=await DESKTOP.testNotification();notify(result.ok?'테스트 알림을 전송했어요.':PLATFORM+' 알림이 표시되지 않았어요.');return;}if(notificationAvailable()&&Notification.permission==='default')await requestNotifyPermission();const ok=popupForEvent('쿤스 칸반 캘린더','PC 알림 테스트입니다.');notify(ok?'알림을 보냈어요. 윈도우 알림 센터도 확인해 주세요.':'PC 시스템 알림을 표시할 수 없어 앱 내부에 안내했어요.');});
const FIRED_KEY=KEY+'_notified_v3';
function checkReminders(){
 let seen={};try{seen=JSON.parse(localStorage.getItem(FIRED_KEY)||'{}')||{};}catch{}
 let changed=false;
 for(const e of data.events){
  if(!e.reminderAt||e.completed||seen[e.id]===e.reminderAt)continue;
  const moment=new Date(e.reminderAt);if(!Number.isFinite(moment.getTime()))continue;
  const passed=Date.now()-moment.getTime();if(passed<0||passed>24*60*60*1000)continue;
  const detail=`${e.start} ~ ${e.end}${gameById(e.gameId)?' · '+gameById(e.gameId).name:''}`;
  if(data.notificationsEnabled){popupForEvent('📅 '+e.title,detail,()=>openEvent(e.id),e.id);notify(`🔔 ${e.title} · 일정 알림`);} 
  seen[e.id]=e.reminderAt;changed=true;
 }
 if(changed){try{localStorage.setItem(FIRED_KEY,JSON.stringify(seen));}catch{}}
}
if(!DESKTOP){setInterval(checkReminders,30000);window.addEventListener('focus',checkReminders);}
if(!DESKTOP)document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders();});

 let editingChecklist=[];
 function renderEventChecklist(){const list=$('eventChecklist');list.replaceChildren();$('eventChecklistCount').textContent=editingChecklist.filter(c=>c.done).length+'/'+editingChecklist.length+' 완료';
   for(const item of editingChecklist){const row=document.createElement('div');row.className='event-checklist-row';
     const cb=document.createElement('input');cb.type='checkbox';cb.checked=item.done;cb.setAttribute('aria-label',item.text+' 완료');cb.addEventListener('change',()=>{item.done=cb.checked;renderEventChecklist();});
     const label=document.createElement('input');label.type='text';label.maxLength=160;label.className='checklist-text';label.value=item.text;label.setAttribute('aria-label','체크리스트 내용');label.addEventListener('input',()=>{item.text=label.value;});
     const remove=document.createElement('button');remove.className='checklist-remove';remove.type='button';remove.textContent='×';remove.title='항목 삭제';remove.addEventListener('click',()=>{editingChecklist=editingChecklist.filter(x=>x.id!==item.id);renderEventChecklist();});
     row.append(cb,label,remove);list.appendChild(row);}
   if(!editingChecklist.length){const empty=document.createElement('div');empty.className='checklist-empty';empty.textContent='아직 등록된 체크리스트가 없어요.';list.appendChild(empty);}
 }
 function addEventChecklist(){const input=$('eventChecklistInput');const text=input.value.trim();if(!text||editingChecklist.length>=120)return;editingChecklist.push({id:uid(),text:text.slice(0,160),done:false});input.value='';renderEventChecklist();input.focus();}
 $('addChecklist').addEventListener('click',addEventChecklist);
 $('eventChecklistInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addEventChecklist();}});
 function openEvent(id=null,key=selectedDate){if(id && id.startsWith('shared:')){sharing?.openRemote(id);return;}editingId=id;const e=data.events.find(v=>v.id===id);selectedDate=e?e.start:key;selectedColor=allowedColor(e?.color||COLORS[0]);$('modalTitle').textContent=e?'일정 수정':'새 일정';renderGameSelect(e?e.gameId:'randomdice2');$('gameCreator').hidden=true;editingGameId=null;$('eventTitle').value=e?.title||'';$('startDate').value=e?.start||key;$('endDate').value=e?.end||key;$('eventDescription').value=e?.description||'';$('eventUrl').value=e?.url||'';$('eventStatus').value=e?eventStatus(e):'todo';$('eventRecurrence').value=e?.recurrence||'none';$('eventRecurrenceUntil').value=e?.recurrenceUntil||'';editingChecklist=cleanChecklist(e?.checklist);$('eventChecklistInput').value='';renderEventChecklist();updateRecurrenceHint();setReminderFields(e?.reminderAt||'');$('deleteEvent').hidden=!e;$('duplicateEvent').hidden=!e;$('shareEvent').hidden=!e||!DESKTOP?.sharingPublish;$('newEventHint').hidden=!!e;
sharing?.resetDraft(!e);$('eventLinkWrap').hidden=!e?.url;if(e?.url)$('eventOpenLink').href=e.url;renderColors();memoOpened=false;$('memoDrawer').hidden=true;shortcutOpened=false;$('shortcutModal').hidden=true;modalOpened=true;$('eventModal').hidden=false;displayOverlay();renderCalendar();setTimeout(()=>$('eventTitle').focus(),50);}
function updateRecurrenceHint(){const value=$('eventRecurrence').value;$('recurrenceUntilWrap').hidden=value==='none';$('recurrenceHint').textContent=value==='none'?'반복하지 않는 단일 일정입니다.':'주간·월간 반복은 일정 하나로 저장되며 반복 종료일을 설정해야 합니다.';}
$('eventRecurrence').addEventListener('change',updateRecurrenceHint);
function closeEvent(){modalOpened=false;$('eventModal').hidden=true;displayOverlay();renderCalendar();}
$('eventForm').addEventListener('submit',ev=>{ev.preventDefault();const title=$('eventTitle').value.trim(),start=$('startDate').value,end=$('endDate').value,rawLink=$('eventUrl').value.trim(),url=safeLink(rawLink);if(!title){notify('일정 제목을 입력해 주세요.');$('eventTitle').focus();return;}if(!parseKey(start)||!parseKey(end)||start>end){notify('종료일은 시작일과 같거나 뒤여야 해요.');return;}if(rawLink&&!url){notify('링크는 http:// 또는 https:// 주소여야 해요.');$('eventUrl').focus();return;}const record={id:editingId||uid(),title,start,end,color:allowedColor(selectedColor),description:$('eventDescription').value.trim(),url,completed:$('eventStatus').value==='done',status:$('eventStatus').value,gameId:$('gameSelect').value,reminderAt:$('eventReminderOn').checked?computeReminderAt():'',recurrence:$('eventRecurrence').value,recurrenceUntil:$('eventRecurrence').value==='none'?'':$('eventRecurrenceUntil').value,checklist:cleanChecklist(editingChecklist)};if(record.recurrence!=='none'&&(!parseKey(record.recurrenceUntil)||record.recurrenceUntil<record.start)){notify('반복 종료일을 시작일 이후로 지정해 주세요.');return;}if($('eventReminderOn').checked&&(!record.reminderAt||!Number.isFinite(new Date(record.reminderAt).getTime()))){notify('알림 날짜와 시간을 확인해 주세요.');return;}clearDragUndo();if(editingId){const i=data.events.findIndex(e=>e.id===editingId);if(i<0)return;data.events[i]=record;}else data.events.push(record);selectedDate=start;month=new Date(parseKey(start).getFullYear(),parseKey(start).getMonth(),1);save();const invitees=sharing?.draftItems()||[];if(sharing)void sharing.saveAndInvite({...record,gameName:gameById(record.gameId)?.name||''},invitees,!!editingId);closeEvent();checkReminders();notify(editingId?'일정을 수정했어요.':'일정을 추가했어요.');});
$('duplicateEvent').addEventListener('click',()=>{if(!editingId)return;const e=data.events.find(x=>x.id===editingId);if(!e)return;const copy={...e,id:uid(),title:e.title+' (복사)',reminderAt:'',checklist:cleanChecklist(e.checklist).map(c=>({...c,id:uid()}))};data.events.push(copy);clearDragUndo();save();closeEvent();renderCalendar();notify('일정을 복제했어요. 알림은 복제되지 않습니다.');});
$('deleteEvent').addEventListener('click',()=>{if(!editingId||!confirm('이 일정을 삭제할까요?'))return;const removedId=editingId;data.events=data.events.filter(e=>e.id!==editingId);clearDragUndo();save();void sharing?.handleLocalDelete(removedId);closeEvent();notify('일정을 삭제했어요.');});
$('eventUrl').addEventListener('input',()=>{$('eventLinkWrap').hidden=true;});
$('closeEvent').addEventListener('click',closeEvent);$('cancelEvent').addEventListener('click',closeEvent);
function renderPinnedNotes(){
 const list=$('pinnedList');if(!list)return;
 list.replaceChildren();const pinned=data.notes.filter(n=>n.pinned).sort((a,b)=>b.updatedAt-a.updatedAt);
 $('pinnedCount').textContent=String(pinned.length);
 if(!pinned.length){const empty=document.createElement('div');empty.className='pinned-empty';empty.innerHTML='<span class="pinned-empty-icon">✦</span><strong>아직 고정한 메모가 없어요</strong><span>모든 메모 → 메모 선택 → <b>오른쪽에 고정</b></span>';list.appendChild(empty);return;}
 for(const note of pinned){
  const card=document.createElement('article');card.className='pin-bubble';
  const open=document.createElement('button');open.type='button';open.className='pin-bubble-open';open.title='이 메모 자세히 보기';
  const label=document.createElement('div');label.className='pin-bubble-label';label.textContent='📌 PINNED NOTE';
  const title=document.createElement('strong');title.className='pin-bubble-title';title.textContent=note.title.trim()||'제목 없는 메모';
  const preview=document.createElement('div');preview.className='pin-bubble-body';preview.textContent=note.body.trim()||'내용을 입력해 주세요.';
  open.append(label,title,preview);open.addEventListener('click',()=>{selectedNoteId=note.id;openMemo();});card.append(open);
  const link=safeLink(note.url)||extractLinks(note.body)[0];if(link){const a=document.createElement('a');a.className='pin-bubble-link';a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent='↗ 관련 링크 열기';a.title=link;card.appendChild(a);}
  list.append(card);
 }
}
function renderNoteList(){const list=$('noteList');list.replaceChildren();$('noteCount').textContent=`${data.notes.length}개의 메모`;$('memoBadge').textContent=data.notes.length?String(data.notes.length):'';for(const n of [...data.notes].sort((a,b)=>b.updatedAt-a.updatedAt)){const b=document.createElement('button');b.className='note-item'+(n.id===selectedNoteId?' active':'');const title=document.createElement('span');title.className='note-item-title';title.textContent=(n.pinned?'📌 ':'')+(n.title||'제목 없는 메모');const sub=document.createElement('span');sub.className='note-item-sub';sub.textContent=n.body?.replace(/\n/g,' ')||'내용을 입력해 주세요';b.append(title,sub);b.addEventListener('click',()=>{selectedNoteId=n.id;renderNotes();});list.appendChild(b);} }
function extractLinks(text){return [...new Set((String(text).match(/https?:\/\/[^\s<>"']+/gi)||[]).map(t=>t.replace(/[),.;!?]+$/g,'')))].map(safeLink).filter(Boolean).slice(0,20);}
function renderNoteLinks(note){const container=$('noteLinks');if(!container)return;container.replaceChildren();const links=[...new Set([note.url,...extractLinks(note.body)].filter(Boolean))];if(!links.length){container.hidden=true;return;}container.hidden=false;const text=document.createElement('span');text.style.cssText='font-size:12px;color:#768297;font-weight:700;margin-bottom:3px';text.textContent=`저장된 링크 (${links.length})`;container.appendChild(text);for(const url of links){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.title=url;const svg=document.createElement('span');svg.innerHTML=iconLink;svg.style.display='inline-flex';const t=document.createElement('span');t.textContent=url.length>55?url.slice(0,52)+'…':url;a.append(svg,t);container.appendChild(a);}}
function renderNoteEditor(){const area=$('noteEditor'),note=data.notes.find(n=>n.id===selectedNoteId);area.replaceChildren();if(!note){area.innerHTML='<div class="empty-note"><svg viewBox="0 0 24 24"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM7 8h10M7 12h10M7 16h6"/></svg><div class="empty-title">아직 메모가 없어요</div>새 메모를 눌러 가볍게 적어보세요.</div>';return;}
area.innerHTML=`<div class="note-meta" id="noteDateLabel"></div><div class="field"><label for="noteTitle">메모 제목</label><input id="noteTitle" maxlength="120" placeholder="메모 제목"></div><div class="field"><label for="noteBody">메모 내용</label><textarea id="noteBody" maxlength="50000" placeholder="아이디어, 참고사항, URL을 자유롭게 입력하세요."></textarea></div><div class="field"><label for="noteUrl">관련 링크 (선택)</label><input id="noteUrl" maxlength="1500" placeholder="https://..."></div><label class="pin-check"><input id="pinNote" type="checkbox"/><span class="pin-check-icon">📌</span><span><strong>오른쪽에 고정</strong><small>캘린더 옆에 말풍선으로 항상 표시해요.</small></span></label><div class="note-links" id="noteLinks"></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:28px"><span class="note-save-line">✦ 자동 저장 중</span><button class="btn danger sm" id="deleteNote">메모 삭제</button></div>`;
$('noteTitle').value=note.title;$('noteBody').value=note.body;$('noteUrl').value=note.url;$('pinNote').checked=!!note.pinned;$('noteDateLabel').textContent=`최근 수정 · ${new Date(note.updatedAt).toLocaleString('ko-KR')}`;renderNoteLinks(note);
for(const [id,field] of [['noteTitle','title'],['noteBody','body'],['noteUrl','url']]){$(id).addEventListener('input',()=>{if(field==='url'){const raw=$(id).value;note.url=safeLink(raw)||'';}else note[field]=$(id).value;note.updatedAt=Date.now();save();renderNoteList();renderPinnedNotes();renderNoteLinks(note);$('noteSavedAt').textContent='방금 저장됨';});}
$('pinNote').addEventListener('change',()=>{note.pinned=$('pinNote').checked;note.updatedAt=Date.now();save();renderNoteList();renderPinnedNotes();notify(note.pinned?'메모를 오른쪽에 고정했어요.':'메모 고정을 해제했어요.');});
$('noteUrl').addEventListener('blur',()=>{const raw=$('noteUrl').value.trim();if(raw&&!safeLink(raw)){notify('링크는 http:// 또는 https:// 형식만 지원해요.');}else $('noteUrl').value=note.url;});
$('deleteNote').addEventListener('click',()=>{if(!confirm('이 메모를 삭제할까요?'))return;data.notes=data.notes.filter(n=>n.id!==selectedNoteId);selectedNoteId=data.notes[0]?.id||null;save();renderNotes();notify('메모를 삭제했어요.');});}
function renderNotes(){renderNoteList();renderNoteEditor();renderPinnedNotes();}
function openMemo(){modalOpened=false;$('eventModal').hidden=true;shortcutOpened=false;$('shortcutModal').hidden=true;memoOpened=true;$('memoDrawer').hidden=false;renderNotes();displayOverlay();}
function closeMemo(){memoOpened=false;$('memoDrawer').hidden=true;displayOverlay();}
$('memoToggle').addEventListener('click',()=>memoOpened?closeMemo():openMemo());$('closeMemo').addEventListener('click',closeMemo);$('newNote').addEventListener('click',()=>{const n={id:uid(),title:'',body:'',url:'',updatedAt:Date.now(),pinned:false};data.notes.unshift(n);selectedNoteId=n.id;save();renderNotes();$('noteTitle').focus();});
$('shade').addEventListener('click',closeAll);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'&&!e.repeat){e.preventDefault();closeAll();if(data.widgetMode){setWidgetMode(false).then(()=>openEvent(null,selectedDate));}else openEvent(null,selectedDate);}});
$('prevMonth').addEventListener('click',()=>{if(data.calendarMode==='week'){selectedDate=Planner.add(selectedDate,-7);month=new Date(parseKey(selectedDate).getFullYear(),parseKey(selectedDate).getMonth(),1);}else month=new Date(month.getFullYear(),month.getMonth()-1,1);renderCalendar();});$('nextMonth').addEventListener('click',()=>{if(data.calendarMode==='week'){selectedDate=Planner.add(selectedDate,7);month=new Date(parseKey(selectedDate).getFullYear(),parseKey(selectedDate).getMonth(),1);}else month=new Date(month.getFullYear(),month.getMonth()+1,1);renderCalendar();});$('todayBtn').addEventListener('click',()=>{month=new Date(today.getFullYear(),today.getMonth(),1);selectedDate=todayKey;renderCalendar();});$('addEventBtn').addEventListener('click',()=>openEvent(null,month.getFullYear()===today.getFullYear()&&month.getMonth()===today.getMonth()?todayKey:toDateKey(month)));
for(const v of ['compact','detail']){$(v==='compact'?'compactBtn':'detailBtn').addEventListener('click',()=>{data.view=v;save();renderCalendar();});}
// Local backup folder: File System Access API handles persisted in IndexedDB (when available).
  let backupDirectory=null;
  let desktopBackupPath='';
 const BACKUP_DB='kuuns_calendar_backup_settings',BACKUP_STORE='settings';
 function openBackupDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(BACKUP_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(BACKUP_STORE))req.result.createObjectStore(BACKUP_STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
 async function directorySetting(value,mode){const db=await openBackupDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(BACKUP_STORE,mode==='put'?'readwrite':'readonly');const store=tx.objectStore(BACKUP_STORE);const req=mode==='put'?store.put(value,'folder'):store.get('folder');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}}
 function updateBackupPath(){
    if(DESKTOP){$('backupPathStatus').textContent=desktopBackupPath?`백업 폴더: ${desktopBackupPath}`:'백업 폴더: 미지정 · 백업 저장 시 위치 선택';return;}
    const folderSupported=typeof window.showDirectoryPicker==='function';
   $('backupPathStatus').textContent=backupDirectory?`백업 폴더: ${backupDirectory.name} · 백업 저장 시 이곳에 새 파일 생성`:(folderSupported?'백업 폴더: 미지정 · 폴더 지정 또는 저장 시 위치 선택':'백업 폴더 고정: 현재 환경에서 미지원 · 저장 시 위치 선택');
 }
 (async()=>{if(DESKTOP){try{const result=await DESKTOP.getBackupFolder();desktopBackupPath=result.path||'';}catch{}updateBackupPath();return;}try{const stored=await directorySetting(null,'get');if(stored&&stored.kind==='directory')backupDirectory=stored;}catch(err){/* IndexedDB disabled or file origin restrictions */}updateBackupPath();})();
  $('backupFolderBtn').addEventListener('click',async()=>{
    if(DESKTOP){try{const result=await DESKTOP.chooseBackupFolder();if(result.path){desktopBackupPath=result.path;updateBackupPath();if(DESKTOP){const info=await DESKTOP.getAutoBackupStatus();$('autoBackupOpen').textContent='자동 백업: '+info.folder+' · 최근 30개 보관';}notify('PC 백업 폴더를 지정했어요.');}}catch{notify('백업 폴더를 지정할 수 없어요.');}return;}
    if(typeof window.showDirectoryPicker!=='function'){notify('이 브라우저에서는 폴더 고정을 지원하지 않아요. 백업 저장에서 위치를 선택해 주세요.');return;}
   try{const directory=await window.showDirectoryPicker({id:'kuuns-calendar-backups',mode:'readwrite'});backupDirectory=directory;
     try{await directorySetting(directory,'put');notify(`‘${directory.name}’ 폴더를 백업 위치로 지정했어요.`);}catch{notify(`이번 실행에서는 ‘${directory.name}’ 폴더에 백업할 수 있어요. 다음 실행 시 폴더를 다시 지정해야 할 수 있어요.`);}
     updateBackupPath();
   }catch(err){if(err?.name!=='AbortError')notify('백업 폴더를 지정하지 못했어요. 브라우저 권한을 확인해 주세요.');}
 });
 function makeBackup(){return{app:'KUN\'S KANBAN CALENDAR',version:11,theme:data.theme,widgetCalendarMode:data.widgetCalendarMode,weekStart:data.weekStart,notificationsEnabled:data.notificationsEnabled,exportedAt:new Date().toISOString(),events:data.events,notes:data.notes,games:data.games,shortcuts:data.shortcuts,todos:data.todos,calendarMode:data.calendarMode,widgetMode:data.widgetMode,view:data.view};}
 function downloadBackup(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  $('exportBtn').addEventListener('click',async()=>{
    if(DESKTOP){try{const result=await DESKTOP.saveBackup(JSON.stringify(makeBackup(),null,2));if(result.path)notify('백업 저장 완료: '+result.path);else if(!result.canceled)notify('백업을 저장할 수 없어요.');}catch(err){notify('백업 오류: '+(err.message||'폴더 권한을 확인해 주세요.'));}return;}
    const now=new Date(),stamp=`${toDateKey(now)}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
   const name=`쿤스_칸반_캘린더_백업_${stamp}.json`,json=JSON.stringify(makeBackup(),null,2),blob=new Blob([json],{type:'application/json;charset=utf-8'});
   if(backupDirectory){
     try{
       let perm=await backupDirectory.queryPermission({mode:'readwrite'});
       if(perm!=='granted')perm=await backupDirectory.requestPermission({mode:'readwrite'});
       if(perm==='granted'){const file=await backupDirectory.getFileHandle(name,{create:true}),writer=await file.createWritable();await writer.write(blob);await writer.close();notify(`‘${backupDirectory.name}’ 폴더에 백업 파일을 저장했어요.`);return;}
       notify('지정 폴더에 쓰기 권한이 없어 저장 위치를 다시 선택해요.');
     }catch(err){notify('지정 폴더에 쓸 수 없어서 다른 저장 위치로 진행해요.');}
   }
   if(typeof window.showSaveFilePicker==='function'){
     try{const handle=await window.showSaveFilePicker({suggestedName:name,types:[{description:'JSON 백업 파일',accept:{'application/json':['.json']}}]});const writer=await handle.createWritable();await writer.write(blob);await writer.close();notify('선택한 위치에 JSON 백업 파일을 저장했어요.');return;}
     catch(err){if(err?.name==='AbortError')return;notify('저장 위치 선택에 실패하여 기본 다운로드 폴더로 저장해요.');}
   }
   downloadBackup(blob,name);notify('JSON 파일 다운로드를 시작했어요. 브라우저 다운로드 폴더를 확인해 주세요.');
 });
$('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('파일이 너무 큽니다 (최대 10MB).');const obj=JSON.parse(await file.text());if(!obj||!Array.isArray(obj.events)||!Array.isArray(obj.notes))throw Error('올바른 백업 JSON 파일이 아닙니다.');const events=obj.events.map(cleanEvent);const notes=obj.notes.map(cleanNote);if(events.some(x=>!x)||notes.some(x=>!x))throw Error('백업 데이터에 잘못된 일정 또는 메모가 있어요.');if(!confirm(`백업에서 일정 ${events.length}개, 메모 ${notes.length}개를 복원할까요?\n\n현재 저장된 데이터는 백업 데이터로 대체됩니다. 필요하면 먼저 현재 데이터를 백업해 주세요.`))return;data={version:11,theme:obj.theme==='dark'?'dark':'light',widgetCalendarMode:obj.widgetCalendarMode==='week'?'week':'month',weekStart:obj.weekStart===1?1:0,notificationsEnabled:obj.notificationsEnabled!==false,events,notes,games:(Array.isArray(obj.games)?obj.games:defaultGames()).map(cleanGame).filter(Boolean),todos:(Array.isArray(obj.todos)?obj.todos:[]).map(cleanTodo).filter(Boolean),calendarMode:obj.calendarMode==='week'?'week':'month',shortcuts:normalizedShortcuts(obj.shortcuts),widgetMode:!!obj.widgetMode,view:obj.view==='detail'?'detail':'compact'};clearDragUndo();selectedNoteId=data.notes[0]?.id||null;save();closeAll(); let chosenRestore=null;
 async function openRestore(){
  if(!DESKTOP){notify('자동 백업 복원은 데스크톱 앱에서 지원해요.');return;}
  restoreOpened=true;$('restoreModal').hidden=false;displayOverlay();
  const list=$('restoreList');list.replaceChildren();chosenRestore=null;$('restoreApply').disabled=true;
  $('restorePreview').textContent='백업을 선택해 내용을 확인하세요.';
  try{const result=await DESKTOP.listAutoBackups();if(!result.length){list.textContent='저장된 일별 자동 백업이 없어요.';return;}
   for(const item of result){const b=document.createElement('button');b.type='button';b.className='restore-option';b.textContent=item.date+' · '+item.sizeKB+'KB';b.addEventListener('click',async()=>{
    for(const el of list.children)el.classList.remove('selected');b.classList.add('selected');
    try{const result=await DESKTOP.previewAutoBackup(item.name);const obj=JSON.parse(result.json);if(!Array.isArray(obj.events)||!Array.isArray(obj.notes))throw Error('내용이 올바르지 않습니다.');
     chosenRestore={name:item.name,json:result.json};$('restorePreview').replaceChildren();const head=document.createElement('strong');head.textContent='미리보기 · 일정 '+obj.events.length+'개 / 메모 '+obj.notes.length+'개 / Todo '+(obj.todos?.length||0)+'개';$('restorePreview').append(head);
     for(const e of obj.events.slice(0,6)){const row=document.createElement('p');row.textContent=e.start+' · '+e.title;$('restorePreview').appendChild(row);}
     $('restoreApply').disabled=false;
    }catch(err){chosenRestore=null;$('restoreApply').disabled=true;notify('백업 미리보기를 열 수 없어요.');}
   });list.appendChild(b);}
  }catch(err){list.textContent='자동 백업 목록을 불러오지 못했어요.';}
 }
 function closeRestore(){restoreOpened=false;$('restoreModal').hidden=true;displayOverlay();}
 $('closeRestore').addEventListener('click',closeRestore);$('restoreCancel').addEventListener('click',closeRestore);
 $('restoreApply').addEventListener('click',async()=>{
  if(!chosenRestore||!DESKTOP)return;
  if(!confirm('선택한 백업으로 현재 데이터를 교체할까요?\n\n현재 데이터는 복원 직전 별도 백업으로 남깁니다.'))return;
  try{const obj=JSON.parse(chosenRestore.json);const next={version:11,theme:obj.theme==='dark'?'dark':'light',widgetCalendarMode:obj.widgetCalendarMode==='week'?'week':'month',weekStart:obj.weekStart===1?1:0,events:(obj.events||[]).map(cleanEvent).filter(Boolean),notes:(obj.notes||[]).map(cleanNote).filter(Boolean),games:(obj.games||defaultGames()).map(cleanGame).filter(Boolean),shortcuts:normalizedShortcuts(obj.shortcuts),todos:(obj.todos||[]).map(cleanTodo).filter(Boolean),calendarMode:obj.calendarMode==='week'?'week':'month',view:obj.view==='detail'?'detail':'compact',widgetMode:!!obj.widgetMode,notificationsEnabled:obj.notificationsEnabled!==false,recentColors:(Array.isArray(obj.recentColors)?obj.recentColors:[]).map(allowedColor).filter(Boolean).slice(0,MAX_RECENT_COLORS)};
   await DESKTOP.savePreRestore();data=next;applyTheme();clearDragUndo();await DESKTOP.saveData(JSON.stringify(data));closeAll();selectedDate=todayKey;month=new Date(today.getFullYear(),today.getMonth(),1);updateGameFilter();renderCalendar();renderNoteList();renderPinnedNotes();renderShortcuts();await setWidgetMode(data.widgetMode,false);notify('백업 복원이 완료됐어요.');
  }catch(err){notify('복원 실패: '+(err.message||'백업 파일을 확인해 주세요.'));}
 });
 updateGameFilter();renderCalendar();renderNoteList();renderPinnedNotes();renderShortcuts();setWidgetMode(data.widgetMode,false);notify('백업을 불러왔어요.');}catch(err){notify(err.message||'백업 파일을 불러오지 못했어요.');}finally{e.target.value='';}});
 let chosenRestore=null;
 async function openRestore(){
  if(!DESKTOP){notify('자동 백업 복원은 데스크톱 앱에서 지원해요.');return;}
  restoreOpened=true;$('restoreModal').hidden=false;displayOverlay();
  const list=$('restoreList');list.replaceChildren();chosenRestore=null;$('restoreApply').disabled=true;
  $('restorePreview').textContent='백업을 선택해 내용을 확인하세요.';
  try{const result=await DESKTOP.listAutoBackups();if(!result.length){list.textContent='저장된 일별 자동 백업이 없어요.';return;}
   for(const item of result){const b=document.createElement('button');b.type='button';b.className='restore-option';b.textContent=item.date+' · '+item.sizeKB+'KB';b.addEventListener('click',async()=>{
    for(const el of list.children)el.classList.remove('selected');b.classList.add('selected');
    try{const result=await DESKTOP.previewAutoBackup(item.name);const obj=JSON.parse(result.json);if(!Array.isArray(obj.events)||!Array.isArray(obj.notes))throw Error('내용이 올바르지 않습니다.');
     chosenRestore={name:item.name,json:result.json};$('restorePreview').replaceChildren();const head=document.createElement('strong');head.textContent='미리보기 · 일정 '+obj.events.length+'개 / 메모 '+obj.notes.length+'개 / Todo '+(obj.todos?.length||0)+'개';$('restorePreview').append(head);
     for(const e of obj.events.slice(0,6)){const row=document.createElement('p');row.textContent=e.start+' · '+e.title;$('restorePreview').appendChild(row);}
     $('restoreApply').disabled=false;
    }catch(err){chosenRestore=null;$('restoreApply').disabled=true;notify('백업 미리보기를 열 수 없어요.');}
   });list.appendChild(b);}
  }catch(err){list.textContent='자동 백업 목록을 불러오지 못했어요.';}
 }
 function closeRestore(){restoreOpened=false;$('restoreModal').hidden=true;displayOverlay();}
 $('closeRestore').addEventListener('click',closeRestore);$('restoreCancel').addEventListener('click',closeRestore);
 $('restoreApply').addEventListener('click',async()=>{
  if(!chosenRestore||!DESKTOP)return;
  if(!confirm('선택한 백업으로 현재 데이터를 교체할까요?\n\n현재 데이터는 복원 직전 별도 백업으로 남깁니다.'))return;
  try{const obj=JSON.parse(chosenRestore.json);const next={version:11,theme:obj.theme==='dark'?'dark':'light',widgetCalendarMode:obj.widgetCalendarMode==='week'?'week':'month',weekStart:obj.weekStart===1?1:0,events:(obj.events||[]).map(cleanEvent).filter(Boolean),notes:(obj.notes||[]).map(cleanNote).filter(Boolean),games:(obj.games||defaultGames()).map(cleanGame).filter(Boolean),shortcuts:normalizedShortcuts(obj.shortcuts),todos:(obj.todos||[]).map(cleanTodo).filter(Boolean),calendarMode:obj.calendarMode==='week'?'week':'month',view:obj.view==='detail'?'detail':'compact',widgetMode:!!obj.widgetMode,notificationsEnabled:obj.notificationsEnabled!==false,recentColors:(Array.isArray(obj.recentColors)?obj.recentColors:[]).map(allowedColor).filter(Boolean).slice(0,MAX_RECENT_COLORS)};
   await DESKTOP.savePreRestore();data=next;applyTheme();clearDragUndo();await DESKTOP.saveData(JSON.stringify(data));closeAll();selectedDate=todayKey;month=new Date(today.getFullYear(),today.getMonth(),1);updateGameFilter();renderCalendar();renderNoteList();renderPinnedNotes();renderShortcuts();await setWidgetMode(data.widgetMode,false);notify('백업 복원이 완료됐어요.');
  }catch(err){notify('복원 실패: '+(err.message||'백업 파일을 확인해 주세요.'));}
 });
 updateGameFilter();renderCalendar();renderNoteList();renderPinnedNotes();renderShortcuts();setWidgetMode(data.widgetMode,false);updateNotificationStatus();checkReminders();
 if(DESKTOP){DESKTOP.onOpenNormalCalendar?.(()=>{closeAll();setWidgetMode(false);});DESKTOP.onNewEventShortcut?.(()=>{closeAll();if(data.widgetMode)setWidgetMode(false).then(()=>openEvent(null,selectedDate));else openEvent(null,selectedDate);});DESKTOP.onTrayToday?.(()=>{closeAll();selectedDate=toDateKey(new Date());const d=parseKey(selectedDate);month=new Date(d.getFullYear(),d.getMonth(),1);if(data.widgetMode)setWidgetMode(false).then(renderCalendar);else renderCalendar();});$('autoBackupOpen').addEventListener('click',openRestore);DESKTOP.getAutoBackupStatus().then(info=>{if(info && $('autoBackupOpen'))$('autoBackupOpen').textContent='자동 백업: '+(info.folder||'앱 데이터 폴더')+' · 최근 30개 보관';}).catch(()=>{$('autoBackupOpen').textContent='자동 백업 상태 확인 불가';});DESKTOP.onReminderClick(id=>{const event=data.events.find(e=>e.id===id);if(event)openEvent(id);}); document.querySelector('.bottom-hint p:last-child').textContent=PLATFORM+' 앱 · 창을 닫으면 트레이에서 알림을 계속 확인합니다. · 완전 종료: 트레이 아이콘 메뉴';}
if(!DESKTOP){$('autoBackupOpen').textContent='자동 백업: 데스크톱 앱에서 사용 가능';$('autoBackupOpen').disabled=true;}
// A calm wave appears at physical mouse press only. It never captures pointer input.
window.addEventListener('pointerdown',event=>{

 if(event.pointerType!=='mouse'||event.button!==0||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const ripple=document.createElement('span');ripple.className='click-ripple';
 ripple.style.left=event.clientX+'px';ripple.style.top=event.clientY+'px';
 document.body.appendChild(ripple);ripple.addEventListener('animationend',()=>ripple.remove(),{once:true});
 }, {passive:true});



 
// v1.7.0: Google Sheets feedback goes via Electron main-process IPC.
(function initFeedback(){
  const bridge=window.kuunsDesktop;
  const launch=document.getElementById('feedbackLaunch');
  const overlay=document.getElementById('feedbackOverlay');
  if(!bridge?.sendFeedback){launch.hidden=true;return;}
  const form=document.getElementById('feedbackForm');
  const status=document.getElementById('feedbackStatus');
  const submit=document.getElementById('feedbackSubmit');
  let busy=false;
  function open(){
    if(typeof closeAll==='function')closeAll();
    overlay.hidden=false;status.textContent='';status.className='feedback-status';
    document.getElementById('feedbackMessage').focus();
  }
  function close(){if(busy)return;overlay.hidden=true;}
  launch.addEventListener('click',open);
  document.getElementById('feedbackClose').addEventListener('click',close);
  document.getElementById('feedbackLater').addEventListener('click',close);
  overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden){e.stopPropagation();close();}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    const input={type:document.getElementById('feedbackType').value,
      message:document.getElementById('feedbackMessage').value.trim(),
      nickname:document.getElementById('feedbackNickname').value.trim()};
    if(input.message.length<3){status.textContent='내용을 3자 이상 작성해 주세요.';status.className='feedback-status error';return;}
    busy=true;submit.disabled=true;submit.textContent='전송 중…';
    status.textContent='Google Sheets로 전송하고 있어요.';status.className='feedback-status';
    try{
      const result=await bridge.sendFeedback(input);
      if(result?.ok){status.textContent=result.message;status.className='feedback-status success';document.getElementById('feedbackMessage').value='';}
      else{status.textContent=result?.message||'전송하지 못했어요. 다시 확인해 주세요.';status.className='feedback-status error';}
    }catch(_err){status.textContent='피드백을 전송하지 못했어요. 잠시 후 다시 시도해 주세요.';status.className='feedback-status error';}
    finally{busy=false;submit.disabled=false;submit.textContent='피드백 전송';}
  });
})();


// v1.9.0: encrypted transport through the Electron main process; never upload private calendar data automatically.
if(DESKTOP?.sharingStatus){
  sharing=window.KuunsSharing.createSharingUI({bridge:DESKTOP,
    getEvent:id=>data.events.find(e=>e.id===id),getEvents:()=>data.events,
    onDeleteOwnedEvent:async localId=>{
      // Delete only the matching local entry, preserving every other private item.
      if(!localId || !data.events.some(e=>e.id===localId))return;
      const before=data.events;
      data.events=before.filter(e=>e.id!==localId);
      try{
        if(DESKTOP?.saveData)await DESKTOP.saveData(JSON.stringify(data));
        else localStorage.setItem(KEY,JSON.stringify(data));
      }catch(e){
        data.events=before;
        throw new Error('공유 서버에서는 삭제됐지만 PC 저장에 실패했어요. 백업과 저장 공간을 확인해 주세요.');
      }
      clearDragUndo();renderCalendar();renderWidget();
      $('saveState').textContent='이 PC의 앱 데이터 폴더에 자동 저장됨';
    },
    onRemoteEvents:items=>{sharedRemoteEvents=items;renderCalendar();renderWidget();},
    onOwnedUpdates:items=>{
      // Shared fields come from the server; leave private-only fields unchanged.
      let changed=false;
      for(const remote of items){
        if(modalOpened && editingId===remote.local_event_id)continue;
        const local=data.events.find(e=>e.id===remote.local_event_id);
        if(!local)continue;
        for(const [key,value] of Object.entries({title:remote.title,description:remote.description,
          start:remote.start_date,end:remote.end_date,
          color:remote.event_data?.color||local.color,status:remote.event_data?.status||local.status,
          ...(Array.isArray(remote.event_data?.checklist)?{checklist:cleanChecklist(remote.event_data.checklist)}:{}),
          ...(typeof remote.event_data?.url==='string'?{url:safeLink(remote.event_data.url)||''}:{})})){
          if(JSON.stringify(local[key])!==JSON.stringify(value)){local[key]=value;changed=true;}
        }
      }
      if(changed)save();
    },notify});
  $('sharingLaunch').addEventListener('click',()=>{closeAll();sharing.open();});
  $('shareEvent').addEventListener('click',()=>{
    const target=editingId;closeEvent();sharing.open(target);
  });
}else $('sharingLaunch').hidden=true;
if(removedPersonalPreset)save(); // One-time precise migration, preserving other entries.
})();
