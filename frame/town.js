// 마을 (설계 5.1, 5.3, 17.1, 17.9): 적이 없는 작은 지도(room.js). NPC에게 다가가 누르면 창이 열리고, 관문은 들른 곳 목록(빠른 이동, road.js)을 연다.
// 동쪽 큰길 끝은 첫 구역으로 가는 길(road.js). 오른쪽 위에 구석 아이콘.
// 타이틀의 "작전 재개"와 후손 확정은 hub.js의 기지 화면 대신 마을로 온다. boot.js가 spots, room, data/town 다음에 붙인다
(function(){
'use strict';
const G=window.RPG, A=G.api, PF=window.PF;
const KR='"Noto Sans KR","Malgun Gothic",sans-serif';
// 구석 아이콘: 창 id → [이름, 선 그림]
const SVG=d=>`<svg viewBox="0 0 32 32" aria-hidden="true">${d}</svg>`;
const ICON={
  raid:['레이드',SVG('<path d="M15 3 5 14l6 14 5-8 5 8 6-14-8-9-4 8 4 2-5 6 1-8-4-1z"/>')],
  map:['지도',SVG('<path d="M4 8l7-3 10 3 7-3v19l-7 3-10-3-7 3z"/><path d="M11 5v19M21 8v19"/>')],
  skills:['스킬',SVG('<path d="M18 3L7 18h8l-2 11 12-16h-8z"/>')],
  gear:['가방',SVG('<path d="M6 12h20l-2 16H8z"/><path d="M12 12V9a4 4 0 0 1 8 0v3"/>')],
  records:['기록',SVG('<rect x="7" y="4" width="18" height="24"/><path d="M11 10h10M11 15h10M11 20h6"/>')],
  settings:['설정',SVG('<circle cx="16" cy="16" r="4.5"/><path d="M16 4v5M16 23v5M4 16h5M23 16h5M7.5 7.5l3.5 3.5M21 21l3.5 3.5M7.5 24.5l3.5-3.5M21 11l3.5-3.5"/>')]};
const TOWN_ICONS=['map','raid','skills','gear','records','settings'];

// 마을에서는 체력·경험치와 이동 조작(조이스틱·대시)을 표시한다.
const css=document.createElement('style'); css.id='pftown'; css.textContent=`
body.pf-town #shud .sk,body.pf-town #shud .ul,body.pf-town #shud .mid,body.pf-town #shud .pz,body.pf-town #shud .bb,
body.pf-town #shud .dmini,body.pf-town #shud .dmsg,body.pf-town #shud .me .rw:nth-child(4){display:none!important}
#pfui .pf-ico{position:absolute;top:max(8px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right));display:flex;gap:6px;pointer-events:auto}
#pfui .pf-ico .btn{width:48px;height:48px;min-height:0;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}
#pfui .pf-ico svg{width:22px;height:22px;fill:none;stroke:#7FF3FF;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 4px rgba(127,243,255,.7))}
#pfui .pf-ico span{font:600 10px ${KR};color:#DDFBFF}`;
document.head.appendChild(css);
const ui=document.getElementById('pfui');
const bar=document.createElement('div'); bar.className='pf-ico'; ui.appendChild(bar);
bar.addEventListener('pointerdown',e=>e.stopPropagation());
bar.addEventListener('click',e=>{ const b=e.target.closest('[data-w]'); if(!b) return; e.stopPropagation(); PF.win.open(b.dataset.w); });
function icons(list){ bar.innerHTML=list.filter(id=>ICON[id]).map(id=>`<button class="btn" data-w="${id}" aria-label="${ICON[id][0]}">${ICON[id][1]}<span>${ICON[id][0]}</span></button>`).join(''); }

// NPC·관문을 누르면. 대사는 Task 6, 숨은 흔적은 Task 7, 빠른 이동은 Task 16이 잇는다
function onSpot(s){ const i=s.act.indexOf(':'), k=s.act.slice(0,i), id=s.act.slice(i+1);
  if(k==='win') PF.win.open(id);
  else if(k==='portal'&&id==='warp') PF.road.list();
  else if(k==='talk'&&PF.story) PF.story.talk(id); }
// 들어오는 장면: 타이틀·후손 화면에서 마을로 올 때만(창을 닫거나 사냥터에서 돌아올 때는 아니다) 마을 전경 한 장(scene_town)을
// 화면 가득 1.6초, 천천히 다가가며 흐려진다(frame.css). 누르거나 키를 누르면 바로 끝난다. 그 첫 누르기(와 뒤따르는 click 한 번)·키는 장면만 끝내고
// 게임·구석 아이콘에는 가지 않는다. 뒤따르는 click을 막는 것은 0.7초까지(입력을 오래 막지 않는다). 그림이 없으면 건너뛰고, 마을을 나가면 끝낸다
const ent=document.createElement('div'); ent.id='pfentry'; document.body.appendChild(ent);
let entT=0, eatClick=0;
function entryEnd(){ clearTimeout(entT); ent.classList.remove('on'); ent.style.backgroundImage=''; }
function entry(){ const im=PF.art.img('scene_town'); if(!im) return;
  entryEnd(); ent.style.backgroundImage=`url("${im.src}")`; void ent.offsetWidth; ent.classList.add('on'); entT=setTimeout(entryEnd,1650); }
// 누르기는 창 전체의 잡기 단계에서, 키는 rpg.js가 전투 중 키를 모두 넘기는 G.survKey(아래)에서 받는다(rpg.js가 키를 먼저 잡고 전파를 끊는다)
function skip(e){ if(!ent.classList.contains('on')) return false; entryEnd(); e.preventDefault(); if(e.type==='pointerdown'){ e.stopPropagation(); eatClick=performance.now()+700; } return true; }
addEventListener('pointerdown',skip,true);
addEventListener('click',e=>{ if(performance.now()<eatClick){ eatClick=0; e.stopPropagation(); e.preventDefault(); } },true);
// 마을에 들어올 때의 직업(기록 창에서 후손을 바꾸면 다시 들어온다)
let cls0=null, pending=false;
function enter(){ G.frame.run={kind:'town',zone:0,ch:0}; cls0=pl.cls;
  PF.bestiary?.preload(Math.min(PF.save.data.story.cleared||0,7));
  PF.room.enter(PF.TOWN,{ch:0,onSpot,onLeave(){ icons([]); entryEnd(); }});
  icons(TOWN_ICONS); A.menuEl.classList.remove('on'); }
PF.place.on((to,from)=>{ if(to!=='town') return; enter(); if(from==='title'||from==='hero') entry(); });
// place.js 표에 town→town이 없으므로 이미 마을이면 바로 다시 들어온다. 지금 하던 일(toMenu는 그린 뒤 메뉴를 다시 켠다)이 끝난 직후에 한 번만
function goSoon(){ if(pending) return; pending=true; queueMicrotask(()=>{ pending=false; if(PF.place.cur==='town') enter(); else PF.place.go('town'); }); }
// 창이 없는데 hub.js가 기지 화면을 그리면(작전 재개, 후손 확정, 전투 뒤 toMenu) 메뉴를 숨기고 마을로 간다.
// 기지 화면은 숨은 메뉴 안에 그대로 그려 둔다(타이틀 단추가 남아 눌리지 않게). 창이 열려 있었으면 win.js가 창을 닫는다.
// 그 창(기록)에서 후손을 바꿨으면 그 직업으로 마을에 다시 들어온다
const mo=G.menuOverride;
G.menuOverride=function(el){
  const w=PF.win.cur, r=mo.apply(this,arguments);
  if(!w&&G.hub.scr==='town'){ el.classList.remove('on'); goSoon(); }
  else if(!PF.win.cur&&PF.room.cur===PF.TOWN&&pl.cls!==cls0) goSoon();
  return r; };
// 마을에서는 궁극기(1~3)를 막고 Esc로 열린 창을 닫는다. 대시는 화면 버튼과 같은 입력 처리를 거친다.
// 들어오는 장면이 떠 있으면 누른 키는 장면만 끝낸다(그 키는 게임에 가지 않는다)
const k0=G.survKey;
G.survKey=function(e,down){
  if(down&&skip(e)) return;
  if((PF.room.cur===PF.TOWN||PF.place.cur==='village')&&/^(Escape|Digit[1-3])$/.test(e.code)){ e.preventDefault(); if(down&&e.code==='Escape') PF.win.close(); return; }
  return k0.apply(this,arguments); };
PF.town={icons,get entry(){ return ent.classList.contains('on'); }};
})();
