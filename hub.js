// 프로메테우스 (PROMETHEUS) — base hub. Replaces the survival menu with a cinematic sci-fi flow set 200 years after the Prometheus Project (story/PROMETHEUS_GAME_STORY.md):
//   title -> descendant select -> Borderline (base at the zone wall) -> zone map (hologram of the continent) -> battle -> zone result -> base
// Base: zone map, simulator (skills, practice), fabricator (gear made, found, upgraded, recycled), lineage (heroes, records, system).
// Draws the regional cast on the battle floor and styles the HUD, pause and result.
// Loaded first by surv.js; its hooks into surv.js / rpg.js / index.html are listed in _gen/hub_patches.py.
'use strict';
(()=>{
const G=RPG, A=G.api, S=G.sv, SV=()=>A.SV;
const ORDER=S.CLS_ORDER;
const NAMES=S.NAMES, CHAP=S.CHAP||[];
const profiles=GameCharacters.profiles;

// ============================================================ the seven experiment zones (story: each has grown a king; the player subdues them)
// play order, king titles and colours are provisional: the story has not fixed them yet
const ZONES=[
  {no:7,name:'볼런티어 섹터',en:'VOLUNTEER SECTOR',king:'싱크 킹',kingEn:'THE SYNC KING',trait:'동기화',lore:'일반 시민 자원자의 평화 구역이었다. 뇌파 동기화 뒤 가장 먼저 무너졌고, 지금은 한 사람의 생각으로 모두가 움직인다.',acc:'#7fdcff',floor:[150,150,150],hp:1,dmg:1,rec:1,x:800,y:330},
  {no:1,name:'아나키 섹터',en:'ANARCHY SECTOR',king:'브루털 킹',kingEn:'THE BRUTAL KING',trait:'폭력',lore:'무정부 폭력 구역. 200년 동안 다듬어진 생존 규칙은 단 하나, 더 강한 자가 옳다.',acc:'#ff4a5a',floor:[135,135,135],hp:1.8,dmg:1.3,rec:6,x:430,y:150},
  {no:2,name:'크레딧 섹터',en:'CREDIT SECTOR',king:'크레딧 킹',kingEn:'THE CREDIT KING',trait:'부',lore:'경제·권력 범죄자 구역. 이곳에서 만든 화폐가 아직도 사람의 목숨값을 정한다.',acc:'#ffc04a',floor:[150,150,150],hp:2.6,dmg:1.5,rec:12,x:260,y:290},
  {no:3,name:'리클레임 섹터',en:'RECLAIM SECTOR',king:'와일드 킹',kingEn:'THE WILD KING',trait:'복원',lore:'환경 파괴자를 가둔 복원 구역. 숲이 도시를 삼켰고, 무너진 탑 사이로 다른 질서가 자랐다.',acc:'#58ffa8',floor:[125,125,125],hp:3.6,dmg:1.8,rec:18,x:660,y:170},
  {no:4,name:'엘리트 섹터',en:'ELITE SECTOR',king:'엠퍼러',kingEn:'THE EMPEROR',trait:'권력',lore:'지도층과 전범의 격리 구역. 권력 없는 권력 다툼이 끝나지 않는다. 왕은 스스로를 황제라 부른다.',acc:'#b98cff',floor:[140,140,140],hp:4.8,dmg:2.1,rec:24,x:520,y:300},
  {no:5,name:'다크넷 섹터',en:'DARKNET SECTOR',king:'글리치 킹',kingEn:'THE GLITCH KING',trait:'해킹',lore:'네트워크가 완전히 끊긴 사이버 범죄 구역. 신호 없는 어둠 속에서 무언가가 아직 깨어 있다.',acc:'#ff4fe0',floor:[160,160,160],hp:6.4,dmg:2.5,rec:30,x:265,y:425},
  {no:6,name:'제네시스 섹터',en:'GENESIS SECTOR',king:'제네시스 킹',kingEn:'THE GENESIS KING',trait:'창조',lore:'창조자와 천재들의 구역. 최초의 혁신 기술이 태어났고, \'남자\'가 경계선을 넘어 탈출한 곳.',acc:'#fff0b8',floor:[78,78,78],hp:8.5,dmg:3,rec:38,x:600,y:400},
];
// the chapters surv.js plays: five exist, two more are added for the full seven
while(CHAP.length<ZONES.length) CHAP.push({...CHAP[CHAP.length-1]});
CHAP.length=Math.min(CHAP.length,ZONES.length);
CHAP.forEach((c,i)=>{ const z=ZONES[i]; Object.assign(c,{name:z.name,en:'ZONE '+String(z.no).padStart(2,'0'),boss:z.king,acc:z.acc,floor:z.floor,hp:z.hp,dmg:z.dmg,rec:z.rec}); });
// the engine's boss warning line (index.html) reads this
Object.defineProperty(window,'BOSS_WARN',{configurable:true,get:()=>{
  if(G.mode!=='surv') return undefined;
  if(S.V.boss?.displayName) return S.V.boss.displayName+' 출현';
  const z=ZONES[S.V.ch]; return z?z.king+' 출현 · '+z.kingEn+' APPROACHES':undefined;
}});

// ============================================================ save (credits, stash, gear) — its own key, the RPG save is untouched
const HK='chamgwang_hub_v1';
const freshH=()=>({v:1,gold:0,stash:[],gear:{},stock:[],uid:1,fresh:0});
let H=(()=>{ try{ const h=JSON.parse(localStorage.getItem(HK)); if(h&&h.v===1) return h; }catch(e){} return freshH(); })();
function hsave(){ if(G.frame&&window.PF?.save?.data){ PF.save.commit(); return; } if(G.noSave||G.contentPending) return; try{ localStorage.setItem(HK,JSON.stringify(H)); }catch(e){} }

// ============================================================ gear
const SLOTS=[['w','무기','WEAPON'],['a','수트','SUIT'],['t','모듈','MODULE']];
const RAR=[['표준','STANDARD','#c9d6e6'],['강화','ENHANCED','#5ad1ff'],['프로토타입','PROTOTYPE','#c77dff'],['특이점','SINGULAR','#ffb547']];
const RM=[1,1.35,1.75,2.3], MAXP=5, BAG=16;
const WT=['시제','표준','개량','퀀텀','싱귤러','오리진'];
const AT=['패브릭 수트','나노 수트','하드라이트 베스트','위상 장갑복','퀀텀 쉘','오리진 수트'];
const TT=['데이터 칩','신경 링크','동기화 코어','신호 증폭기','퀀텀 코어','시그널 프래그먼트'];
const ti=it=>Math.max(0,Math.min(5,it.tier-1));
function itName(it,cls=pl.cls){ const n=it.slot==='w'?WT[ti(it)]+' '+profiles[cls].weapon:it.slot==='a'?AT[ti(it)]:TT[ti(it)]; return n+(it.plus?' +'+it.plus:''); }
function itVal(it){ if(G.frame&&window.PF?.economy) return PF.economy.value(it); const r=RM[it.rar], p=it.plus||0;
  return it.slot==='w'?Math.round((6+it.tier*6)*r)+p*4:it.slot==='a'?Math.round((10+it.tier*14)*r)+p*8:Math.round((4+it.tier*3)*r)+p*2; }
const itStat=it=>it.slot==='w'?`피해 +${itVal(it)}%`:it.slot==='a'?`최대 HP +${itVal(it)}`:`경험치·크레딧 +${itVal(it)}%`;
const sellOf=it=>G.frame&&window.PF?.economy?PF.economy.salvage(it):Math.round((20+it.tier*30)*Math.pow(RM[it.rar],1.5)*(1+(it.plus||0)*.3));
const buyOf=it=>G.frame&&window.PF?.economy?PF.economy.price(it):sellOf(it)*3;
const upOf=it=>G.frame&&window.PF?.economy?PF.economy.refit(it):Math.round((40+it.tier*40)*((it.plus||0)+1)*RM[it.rar]);
function newItem(tier,rar,slot){ return {id:H.uid++,slot:slot||'wat'[Math.random()*3|0],tier:Math.max(1,Math.min(6,tier)),rar,plus:0}; }
function rollRar(ch,first){ const r=Math.random(); if(first) return r<.12+ch*.03?3:2; return r<.04+ch*.015?3:r<.17+ch*.02?2:r<.52?1:0; }
const gearOf=c=>H.gear[c]||(H.gear[c]={});
const byId=id=>H.stash.find(i=>i.id===id);
const equippedBy=id=>{ for(const c in H.gear) for(const s in H.gear[c]) if(H.gear[c][s]===id) return c; return null; };
function stat(slot,c=pl.cls){ const id=gearOf(c)[slot], it=id&&byId(id); return it?itVal(it):0; }
const tierOf=ch=>Math.min(6,1+Math.floor(ch*5/6));
function restock(){ const top=tierOf(Math.min(ZONES.length-1,SV().chClear||0));
  if(G.frame&&window.PF?.economy){ H.stock=['w','a','t'].map((slot,i)=>newItem(top,i===2?1:0,slot)); return; }
  H.stock=[0,1,2].map(i=>newItem(top-(i===0?1:0),i===2?2:1,'wat'[i])); }
if(!H.stock||!H.stock.length) restock();
// gear feeds the numbers the battle already reads: skill damage, max health, experience gained
{ const mul0=A.mul; A.mul=id=>mul0(id)*(1+stat('w')/100);
  const hp0=A.maxHp; A.maxHp=()=>hp0()+stat('a');
  const gx0=A.gainExp; A.gainExp=v=>gx0(Math.round(v*(1+stat('t')/100))); }

// ============================================================ fonts + styles
// language taken from the generated UI sheet (_gen/gen7/m_uikit.png): amber primary on dark glass, teal-grey secondary lines,
// panels with one cut corner, segmented amber bars, rarity slot frames, thin line icons
if(!document.getElementById('hubfont')){ const l=document.createElement('link'); l.id='hubfont'; l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;600&display=swap'; document.head.appendChild(l); }
const KR='"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif', LAT='"Rajdhani","Segoe UI",sans-serif', MONO='"JetBrains Mono",Consolas,monospace';
const AM='#EBA74E', AM2='#B97528', TL='#8DC9BF', TX='#EDEAE4', MU='#9AA6A2', RD='#E2513F';
const CY=AM, MG=RD;
const CUT=s=>`clip-path:polygon(0 0,calc(100% - ${s}px) 0,100% ${s}px,100% 100%,${s}px 100%,0 calc(100% - ${s}px))`;
const css=document.createElement('style'); css.id='hubcss'; css.textContent=`
#rmenu.hub{padding:0!important;background:#050807!important;overflow:hidden!important;touch-action:pan-y}
#rmenu.hub *,#sres .hub *,#rpause .hub *{box-sizing:border-box}
.hub canvas{position:static;inset:auto}
.hub .photo{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .45s ease,filter .45s ease}
.hub .photo.b{opacity:0}
.hub .scrim{position:absolute;inset:0;pointer-events:none}
.hub canvas.fxc{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.hub .grain{position:absolute;inset:0;pointer-events:none;opacity:.08;background-image:repeating-radial-gradient(circle at 17% 23%,#fff 0 .6px,transparent .6px 3px),repeating-radial-gradient(circle at 71% 61%,#000 0 .7px,transparent .7px 2.6px);mix-blend-mode:overlay}
.hub .ui{position:absolute;inset:0;display:flex;flex-direction:column;color:${TX};font:400 14px ${KR};
  padding:max(14px,env(safe-area-inset-top)) max(20px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
.hub .hk{font:600 10px ${MONO};letter-spacing:.18em;color:${TL};text-transform:uppercase}
.hub button{font:600 14px ${KR};color:${TX};cursor:pointer;-webkit-tap-highlight-color:transparent}
.hub button:disabled{opacity:.38;cursor:default}
.hub .btn{position:relative;min-height:44px;padding:9px 18px;border:1px solid rgba(141,201,191,.32);background:rgba(10,18,18,.62);${CUT(10)};
  -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:background .15s,border-color .15s}
.hub button.btn:hover:not(:disabled){background:rgba(141,201,191,.14);border-color:${TL}} .hub .btn:not(:disabled):active{transform:translateY(1px)}
.hub .btn small{display:block;font:600 9.5px ${MONO};letter-spacing:.2em;color:${TL};margin-top:2px;text-transform:uppercase}
.hub .btn.pri,.hub button.btn.pri:hover:not(:disabled){background:linear-gradient(180deg,#F4BA63,${AM} 45%,${AM2});border-color:#FFD99A;color:#1A1006;box-shadow:0 0 22px rgba(235,167,78,.28),inset 0 1px 0 rgba(255,240,210,.6)}
.hub .btn.pri small{color:#4A2C08}
.hub button.btn.pri:hover:not(:disabled){filter:brightness(1.08)}
.hub .panel{position:relative;background:linear-gradient(170deg,rgba(16,26,26,.7),rgba(6,11,11,.78));border:1px solid rgba(141,201,191,.18);${CUT(14)};
  -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.hub .panel::after{content:'';position:absolute;top:0;right:0;width:20px;height:20px;pointer-events:none;background:linear-gradient(45deg,transparent 49%,rgba(235,167,78,.75) 50%,transparent 56%)}
.hub button.panel:hover{border-color:rgba(235,167,78,.55);background:linear-gradient(170deg,rgba(26,38,36,.78),rgba(8,14,14,.82))}
.hub .rule{height:1px;background:linear-gradient(90deg,rgba(141,201,191,.45),rgba(141,201,191,0));margin:8px 0}
.hub .cr{color:${AM}} .hub .mut{color:${MU}}
.hub .seg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px} .hub .seg i{height:6px;background:rgba(141,201,191,.14);transform:skewX(-20deg)} .hub .seg i.on{background:${AM};box-shadow:0 0 6px rgba(235,167,78,.6)}
/* live feeds (the generated GIFs) */
.hub .feed{position:relative;overflow:hidden;border:1px solid rgba(141,201,191,.28);${CUT(12)};background:#050807}
.hub .feed img{display:block;width:100%;height:100%;object-fit:cover}
.hub .feed .tag{position:absolute;left:8px;top:6px;display:flex;align-items:center;gap:6px;font:600 9.5px ${MONO};letter-spacing:.16em;color:${TX};text-shadow:0 1px 2px #000}
.hub .feed .tag i{width:6px;height:6px;border-radius:50%;background:${RD};box-shadow:0 0 6px ${RD};animation:hubblink 1.2s infinite}
@keyframes hubblink{50%{opacity:.25}}
/* title */
.hub .title{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;max-width:52vw;padding-left:2vw}
.hub .title .pre{font:600 clamp(9px,1.3vw,12px) ${MONO};letter-spacing:.42em;color:${TL}}
.hub .title h1,#rmenu.hub .title h1{margin:.1em 0 0;font:900 clamp(40px,7.4vw,84px)/1 ${KR};letter-spacing:.02em;color:#F6F1E8;text-shadow:0 2px 30px rgba(0,0,0,.6)}
.hub .title .en{font:700 clamp(12px,1.9vw,18px) ${LAT};letter-spacing:.62em;color:${AM};margin-top:.35em}
.hub .title .tag{font:400 clamp(11px,1.35vw,13px)/1.6 ${KR};color:#C9CFCB;margin:.9em 0 1.4em;max-width:320px;text-shadow:0 1px 6px #000}
.hub .title .menu{display:flex;flex-direction:column;gap:8px;width:min(300px,40vw)}
.hub .title .menu .btn{text-align:left;padding:10px 18px}
.hub .ver{position:absolute;left:max(20px,env(safe-area-inset-left));bottom:12px;font:400 10px ${MONO};letter-spacing:.2em;color:rgba(201,207,203,.5)}
.hub .tfeed{position:absolute;right:max(20px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));width:min(190px,22vw);aspect-ratio:16/9}
/* top bar */
.hub .top{display:flex;align-items:center;gap:10px;flex:0 0 auto}
.hub .crest{display:flex;align-items:center;gap:10px;padding:4px 14px 4px 4px}
.hub .crest canvas{width:40px;height:40px;border:1px solid rgba(235,167,78,.5);background:radial-gradient(#1d2a28,#070b0b)}
.hub .crest b{display:block;font:700 14px ${KR}} .hub .crest small{font:600 9.5px ${MONO};letter-spacing:.18em;color:${TL}}
.hub .xp{width:140px;height:3px;background:rgba(141,201,191,.15);margin-top:5px} .hub .xp i{display:block;height:100%;background:${AM};box-shadow:0 0 8px ${AM}}
.hub .purse{margin-left:auto;display:flex;gap:8px}
.hub .purse span{display:flex;align-items:center;min-height:40px;padding:0 12px;font:500 12px ${KR};color:${MU}} .hub .purse b{font:700 15px ${MONO};margin-left:8px}
.hub .back{padding:6px 14px}
/* base */
.hub .town{flex:1;display:flex;gap:14px;min-height:0;margin-top:12px}
.hub .bside{width:min(300px,36vw);display:flex;flex-direction:column;gap:8px}
.hub .bside h2{margin:0;font:900 clamp(26px,4.4vw,40px)/1 ${KR};letter-spacing:.04em;text-shadow:0 2px 18px rgba(0,0,0,.7)}
.hub .bside .sub{font:600 10px ${MONO};letter-spacing:.2em;color:${TL}}
.hub .stat{padding:10px 12px;display:flex;flex-direction:column;gap:6px}
.hub .stat .r{display:flex;justify-content:space-between;font-size:12px} .hub .stat .r b{font:600 12px ${MONO}}
.hub .bmain{flex:1;display:flex;flex-direction:column;gap:8px;min-width:0}
.hub .bfeed{flex:1;min-height:0}
.hub .places{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:auto}
.hub .place{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;text-align:left;min-height:84px}
.hub .place svg{width:24px;height:24px;stroke:${AM};fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;margin-bottom:auto}
.hub .place b{font:700 14px ${KR}} .hub .place em{font:400 10.5px ${KR};font-style:normal;color:${MU}} .hub .place em.hot{color:${AM}}
.hub .bdg{position:absolute;top:8px;right:22px;min-width:20px;height:18px;padding:0 6px;background:${AM};font:700 10.5px/18px ${MONO};color:#1A1006}
/* sheets */
.hub .sheet{flex:1;display:flex;gap:12px;min-height:0;margin-top:10px}
.hub .sheet h3{margin:0;font:700 18px ${KR}} .hub .sheet h3 small{display:block;font:600 9.5px ${MONO};letter-spacing:.24em;color:${TL};margin-bottom:3px}
.hub .scroll{overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;min-height:0;scrollbar-width:thin;scrollbar-color:rgba(235,167,78,.5) transparent}
.hub .col{display:flex;flex-direction:column;min-height:0;padding:12px 14px}
.hub .lore{font:400 12.5px/1.6 ${KR};color:#CBD2CE;margin:6px 0 4px}
.hub .kv{display:flex;justify-content:space-between;gap:10px;font:400 12.5px ${KR};padding:5px 0;border-bottom:1px solid rgba(141,201,191,.1)} .hub .kv b{font-weight:700;text-align:right}
/* zone map */
.hub .zlist{width:min(330px,40vw);display:flex;flex-direction:column;padding:6px}
.hub .zrow{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:34px;padding:0 10px;border:0;border-bottom:1px solid rgba(141,201,191,.08);background:transparent;text-align:left;font:500 13px ${KR}}
.hub .zrow .no{font:600 12px ${MONO};color:${MU}} .hub .zrow.on{background:rgba(235,167,78,.14)} .hub .zrow.on .no{color:${AM}} .hub .zrow.lk{color:#6E7976}
.hub .zrow .st{font:700 10px ${KR};padding:2px 6px} .hub .st.done{border:1px solid ${AM};color:${AM}} .hub .st.open{background:${AM};color:#1A1006} .hub .st.lk{border:1px solid #3B4644;color:#6E7976} .hub .st.seal{border:1px solid ${RD};color:${RD}}
.hub .zdet{flex:1;min-width:0;display:flex;flex-direction:column;gap:8px}
.hub .zfeed{flex:1;min-height:0}
.hub .zinfo{padding:10px 14px;display:flex;flex-direction:column}
.hub .zinfo .big{display:flex;align-items:baseline;gap:10px} .hub .zinfo .big b{font:700 40px/1 ${LAT};color:${AM}} .hub .zinfo .big span{font:700 17px ${KR}}
.hub .zgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:6px} .hub .zgrid small{display:block;font:400 10.5px ${KR};color:${MU}} .hub .zgrid b{font:700 12.5px ${KR}}
/* descendants */
.hub .roster{flex:1.3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px;align-content:start}
.hub .hc{position:relative;display:flex;flex-direction:column;align-items:center;padding:6px 6px 8px;border:1px solid rgba(141,201,191,.16);background:rgba(6,11,11,.55);cursor:pointer;${CUT(10)}}
.hub .hc.on{border-color:${AM};background:linear-gradient(180deg,rgba(235,167,78,.2),rgba(6,11,11,.6))}
.hub .hc canvas{width:80px;height:80px;flex:0 0 auto}
.hub .hc b{font:700 13.5px ${KR}} .hub .hc small{font:600 8.5px ${MONO};letter-spacing:.14em;color:${MU}}
.hub .hc i{position:absolute;top:5px;left:9px;font:600 10px ${MONO};font-style:normal;color:${AM}}
.hub .hdet{flex:1;min-width:230px}
.hub .hdet .hero-model{float:right;width:clamp(92px,14vw,188px);height:auto;margin:0 0 4px 4px}
.hub .hdet .rule{clear:both}
.hub .hdet .big{font:900 28px ${KR};letter-spacing:.02em}
.hub .tagl{display:inline-block;margin:4px 0 6px;padding:2px 8px;border:1px solid rgba(235,167,78,.5);font:600 11px ${KR};color:${AM}}
/* lists */
.hub .row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid rgba(141,201,191,.08)}
.hub .row.lock{opacity:.42}
.hub .row .tx{flex:1;min-width:0} .hub .row .tx b{font:700 13.5px ${KR}} .hub .row .tx p{margin:2px 0 0;font:400 11.5px/1.5 ${KR};color:#B5BEBA}
.hub .row .tg{font:600 10px ${KR};color:${TL};margin-left:6px}
.hub .row .lvl{font:600 11.5px ${MONO};color:${AM};min-width:50px;text-align:right}
.hub .row .ic{width:36px;height:36px;border:1px solid rgba(141,201,191,.3);background:#070b0b;object-fit:cover;${CUT(6)}}
.hub .sbtn{min-height:34px;padding:5px 10px;font-size:12px}
.hub .slots{display:flex;flex-direction:column;gap:7px}
.hub .slot{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(141,201,191,.16);background:rgba(6,11,11,.5);min-height:54px;${CUT(9)}}
.hub .gem{position:relative;width:36px;height:36px;flex:0 0 36px;display:grid;place-items:center;border:1px solid var(--r);background:radial-gradient(color-mix(in srgb,var(--r) 20%,transparent),#070b0b);${CUT(7)}}
.hub .gem::after{content:'';position:absolute;right:3px;bottom:3px;width:5px;height:5px;background:var(--r)}
.hub .gem svg{width:20px;height:20px;stroke:var(--r);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.hub .itn{font:700 13.5px ${KR};color:var(--r)} .hub .its{font:400 11.5px ${KR};color:#CBD2CE}
.hub .tabs{display:flex;gap:0;margin-bottom:6px;border-bottom:1px solid rgba(141,201,191,.18)}
.hub .tabs button{min-height:40px;padding:0 16px;border:0;border-bottom:2px solid transparent;background:transparent;font:500 13px ${KR};color:${MU}}
.hub .tabs button.on,#rmenu.hub .tabs button.on{border-bottom-color:${AM};color:${TX};font-weight:700;background:transparent}
.hub .opt{display:flex;align-items:center;justify-content:space-between;padding:10px 4px;border-bottom:1px solid rgba(141,201,191,.1)}
.hub .tog{width:48px;height:24px;border-radius:12px;border:1px solid rgba(141,201,191,.4);background:#0b1212;position:relative;padding:0}
.hub button.tog:hover{background:#0b1212} .hub .tog::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#56625F;transition:left .15s}
.hub .tog.on,.hub button.tog.on:hover{background:${AM};border-color:#FFD99A} .hub .tog.on::after{left:27px;background:#FFF4E0}
.hub .toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);padding:9px 18px;font:600 13px ${KR};pointer-events:none;opacity:0;transition:opacity .2s}
.hub .toast.on{opacity:1}
@media (max-height:440px){
  .hub .title .tag{margin:.6em 0 1em} .hub .title .menu .btn{min-height:40px;padding:7px 16px}
  .hub .place{min-height:68px;padding:8px 10px} .hub .place em{display:none}
  .hub .crest canvas{width:34px;height:34px} .hub .town,.hub .sheet{margin-top:8px}
  .hub .roster{gap:6px;padding:8px} .hub .hc canvas{width:56px;height:56px} .hub .hc small{display:none}
  .hub .hdet .big{font-size:22px} .hub .col{padding:9px 12px} .hub .row{padding:6px 8px}
  .hub .lore{font-size:11.5px;line-height:1.5;margin:4px 0 0} .hub .kv{padding:3px 0;font-size:12px} .hub .rule{margin:6px 0}
  .hub .zrow{min-height:30px} .hub .zinfo .big b{font-size:32px}
  .hub .slot{min-height:44px;padding:5px 8px} .hub .slots{gap:5px} .hub .gem{width:30px;height:30px;flex-basis:30px}
}
@media (orientation:portrait){
  .hub .title{max-width:none;padding-left:0} .hub .places{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hub .sheet,.hub .town{flex-direction:column} .hub .bside,.hub .zlist{width:auto} .hub .hdet{min-width:0} .hub .roster{flex:0 0 auto}
}
/* battle HUD, pause and result */
#shud .me b,#shud .kc b,#shud .kc span,#shud .bb small{font-family:${KR}!important}
#shud .me{padding:8px 10px 6px;background:linear-gradient(170deg,rgba(16,26,26,.78),rgba(6,11,11,.8));border:1px solid rgba(141,201,191,.22);${CUT(10)}}
#shud .rw em{font-family:${MONO}!important;font-size:9.5px!important;color:${TL}!important;letter-spacing:.06em}
#shud .hpb,#shud .xb,#shud .ub{border-color:rgba(141,201,191,.25)!important;border-radius:0!important;background:rgba(3,6,6,.85)!important}
#shud .hpb i{background:linear-gradient(90deg,${TL},#C9F1EA)!important} #shud .xb i{background:${AM}!important;box-shadow:0 0 8px ${AM}}
#shud .ub i{background:linear-gradient(90deg,${AM2},#FFE0A8)!important}
#shud .tm{font-family:${LAT}!important;font-weight:700!important;color:#F6F1E8;letter-spacing:.12em!important;text-shadow:0 2px 12px rgba(0,0,0,.8)!important}
#shud .pz{border-radius:0!important;background:rgba(10,18,18,.7)!important;border-color:rgba(141,201,191,.4)!important;color:${AM}!important;${CUT(7)}}
#shud .bb div{border-color:rgba(235,167,78,.45)!important;background:rgba(3,6,6,.85)!important}
#rpause .hp{width:min(420px,88vw);padding:22px 26px;text-align:center;color:${TX}}
#rpause .hp h2{margin:2px 0 0;font:900 28px ${KR};letter-spacing:.08em}
#rpause .hp .bt{display:flex;flex-direction:column;gap:8px;margin-top:16px}
#sres.hubr{background:radial-gradient(ellipse at center,rgba(5,9,9,.6),rgba(2,4,4,.92))!important}
#sres .hres{width:min(820px,94vw);max-height:94vh;overflow:auto;overflow-x:hidden;padding:18px 22px;text-align:left;color:${TX};display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:center}
#sres .hres .c1,#sres .hres .c2{min-width:0} #sres .hres .c2{display:flex;flex-direction:column;justify-content:center;gap:8px}
#sres .hub .row{flex-direction:row;gap:10px} #sres .hres h2{margin:4px 0;font:900 clamp(30px,5.2vw,46px)/1.05 ${KR};letter-spacing:.04em}
#sres .hres .w{color:#F6F1E8} #sres .hres .l{color:${RD}}
#sres .hres .sub{font:400 12.5px ${KR};color:#B5BEBA}
#sres .hub button.btn,#rpause .hub button.btn{font:600 13.5px ${KR};border-radius:0;color:${TX};background:rgba(10,18,18,.62);border:1px solid rgba(141,201,191,.32)}
#sres .hub button.btn.pri,#rpause .hub button.btn.pri{color:#1A1006;background:linear-gradient(180deg,#F4BA63,${AM} 45%,${AM2});border-color:#FFD99A}
#sres .hres .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:12px 0 0;border-top:1px solid rgba(141,201,191,.18)}
#sres .hres .grid div{padding:8px 2px 0} #sres .hres .grid small{display:block;font:400 10.5px ${KR};color:${MU}} #sres .hres .grid b{font:600 16px ${MONO}}
#sres .hres .sync{margin-top:12px;padding:10px 12px;border:1px solid rgba(235,167,78,.45);background:rgba(235,167,78,.08);display:flex;flex-direction:column;gap:6px;font:600 12px ${KR}}
#sres .hres .bt{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px} #sres .hres .bt .wide{grid-column:1/-1}
@media (max-height:440px){ #sres .hres{padding:12px 18px} }
@media (orientation:portrait){ #sres .hres{grid-template-columns:1fr} }
`; document.head.appendChild(css);
// ============================================================ hologram layer (user, 2026-11-25: "홀로그램 미래세상", buttons that look projected)
// sits after the base sheet with the same selectors, so it wins: projected light instead of cut glass; amber is kept for credits and levels only
const HC='#7FF3FF', HC2='#38C8E0';
const holo=document.createElement('style'); holo.id='hubholo'; holo.textContent=`
.hub .btn,.hub .panel,.hub .hc,.hub .slot,.hub .feed,.hub .row .ic,.hub .gem,.hub .crest canvas{clip-path:none!important}
/* projected button: translucent cyan, scanlines, glowing edge, corner brackets, a light sweep, an emitter line beneath */
.hub .btn{overflow:hidden;border:1px solid rgba(127,243,255,.42);border-radius:2px;color:#DDFBFF;text-shadow:0 0 8px rgba(127,243,255,.55);
  background:linear-gradient(180deg,rgba(127,243,255,.13),rgba(127,243,255,.03)),repeating-linear-gradient(0deg,rgba(127,243,255,.07) 0 1px,transparent 1px 3px),rgba(4,16,20,.55);
  box-shadow:0 0 10px rgba(127,243,255,.16),inset 0 0 16px rgba(127,243,255,.12);transition:box-shadow .18s,border-color .18s,background .18s,text-shadow .18s}
.hub .btn::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(105deg,transparent 42%,rgba(220,255,255,.22) 50%,transparent 58%);transform:translateX(-120%);animation:hubsweep 4.2s ease-in-out infinite}
.hub .btn::after{content:'';position:absolute;inset:3px;pointer-events:none;opacity:.9;background:
  linear-gradient(${HC},${HC}) 0 0/9px 1px no-repeat,linear-gradient(${HC},${HC}) 0 0/1px 9px no-repeat,
  linear-gradient(${HC},${HC}) 100% 0/9px 1px no-repeat,linear-gradient(${HC},${HC}) 100% 0/1px 9px no-repeat,
  linear-gradient(${HC},${HC}) 0 100%/9px 1px no-repeat,linear-gradient(${HC},${HC}) 0 100%/1px 9px no-repeat,
  linear-gradient(${HC},${HC}) 100% 100%/9px 1px no-repeat,linear-gradient(${HC},${HC}) 100% 100%/1px 9px no-repeat}
@keyframes hubsweep{0%,55%{transform:translateX(-120%)}85%,100%{transform:translateX(120%)}}
.hub button.btn:hover:not(:disabled){border-color:${HC};background:linear-gradient(180deg,rgba(127,243,255,.24),rgba(127,243,255,.06)),repeating-linear-gradient(0deg,rgba(127,243,255,.1) 0 1px,transparent 1px 3px),rgba(4,16,20,.55);
  box-shadow:0 0 18px rgba(127,243,255,.35),inset 0 0 22px rgba(127,243,255,.2);text-shadow:-1px 0 rgba(255,80,190,.55),1px 0 rgba(127,243,255,.9),0 0 10px rgba(127,243,255,.7)}
.hub .btn small{color:rgba(127,243,255,.75);text-shadow:none}
.hub .btn.pri,.hub button.btn.pri:hover:not(:disabled){color:#F2FEFF;border-color:rgba(190,250,255,.9);
  background:linear-gradient(180deg,rgba(127,243,255,.34),rgba(56,200,224,.12)),repeating-linear-gradient(0deg,rgba(220,255,255,.12) 0 1px,transparent 1px 3px),rgba(4,22,28,.6);
  box-shadow:0 0 22px rgba(127,243,255,.38),0 6px 18px -8px rgba(127,243,255,.7),inset 0 0 22px rgba(127,243,255,.28);text-shadow:0 0 10px rgba(160,250,255,.9);animation:hubflick 7s infinite steps(1)}
.hub .btn.pri small{color:#BFF8FF}
.hub button.btn.pri:hover:not(:disabled){filter:brightness(1.12)}
@keyframes hubflick{0%,93%,100%{opacity:1}94%{opacity:.72}95%{opacity:1}96%{opacity:.85}}
.hub .btn:disabled{animation:none;box-shadow:none;text-shadow:none}
.hub .btn:disabled::before{display:none}
/* projected panels */
.hub .panel{border:1px solid rgba(127,243,255,.2);border-radius:2px;
  background:linear-gradient(170deg,rgba(10,30,36,.62),rgba(4,12,16,.74)),repeating-linear-gradient(0deg,rgba(127,243,255,.035) 0 1px,transparent 1px 4px);
  box-shadow:inset 0 0 28px rgba(127,243,255,.07),0 0 0 1px rgba(0,0,0,.25)}
.hub .panel::after{inset:-1px;width:auto;height:auto;background:
  linear-gradient(${HC},${HC}) 0 0/14px 1.5px no-repeat,linear-gradient(${HC},${HC}) 0 0/1.5px 14px no-repeat,
  linear-gradient(${HC},${HC}) 100% 100%/14px 1.5px no-repeat,linear-gradient(${HC},${HC}) 100% 100%/1.5px 14px no-repeat;opacity:.85}
.hub button.panel:hover{border-color:rgba(127,243,255,.55);box-shadow:inset 0 0 30px rgba(127,243,255,.14),0 0 16px rgba(127,243,255,.2)}
.hub .rule{background:linear-gradient(90deg,rgba(127,243,255,.5),rgba(127,243,255,0))}
.hub .hk{color:rgba(127,243,255,.8)}
/* everything appears as if projected */
.hub .ui>*{animation:hubproj .42s cubic-bezier(.2,.8,.2,1) both}
@keyframes hubproj{0%{opacity:0;transform:scaleY(.94);filter:brightness(2.2) blur(1px)}40%{opacity:.6}60%{opacity:.35}100%{opacity:1;transform:none;filter:none}}
/* states and small parts move from amber to hologram cyan */
.hub .seg i.on{background:${HC};box-shadow:0 0 8px ${HC}}
.hub .xp i{background:${HC};box-shadow:0 0 8px ${HC}}
.hub .place svg{stroke:${HC};filter:drop-shadow(0 0 4px rgba(127,243,255,.7))}
.hub .bdg{background:${HC};color:#03161A;box-shadow:0 0 10px ${HC}}
.hub .zrow.on{background:linear-gradient(90deg,rgba(127,243,255,.2),rgba(127,243,255,.04))} .hub .zrow.on .no{color:${HC}}
.hub .st.open{background:${HC};color:#03161A} .hub .st.done{border-color:${HC};color:${HC}}
.hub .zinfo .big b{color:${HC};text-shadow:0 0 14px rgba(127,243,255,.6)}
.hub .hc{border-radius:2px} .hub .hc.on{border-color:${HC};background:linear-gradient(180deg,rgba(127,243,255,.2),rgba(4,12,16,.6));box-shadow:0 0 16px rgba(127,243,255,.25),inset 0 0 20px rgba(127,243,255,.15)}
.hub .hc i{color:${HC}} .hub .tagl{border-color:rgba(127,243,255,.45);color:${HC}}
.hub .tabs button.on,#rmenu.hub .tabs button.on{border-bottom-color:${HC};text-shadow:0 0 8px rgba(127,243,255,.6)}
.hub .tog.on,.hub button.tog.on:hover{background:rgba(127,243,255,.35);border-color:${HC};box-shadow:0 0 10px rgba(127,243,255,.5)}
.hub .row .lvl{color:${HC}}
.hub .feed{border-color:rgba(127,243,255,.35);box-shadow:0 0 14px rgba(127,243,255,.15)}
.hub .feed::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(127,243,255,.06) 0 1px,transparent 1px 3px)}
.hub .crest canvas{border-color:rgba(127,243,255,.5);box-shadow:0 0 10px rgba(127,243,255,.25)}
.hub .title .en{color:${HC};text-shadow:0 0 12px rgba(127,243,255,.6)}
.hub .title h1,#rmenu.hub .title h1{text-shadow:-1.5px 0 rgba(255,80,190,.35),1.5px 0 rgba(127,243,255,.45),0 2px 30px rgba(0,0,0,.6)}
/* zone detail: hologram city with the holo map inset */
.hub .zfeed{position:relative} .hub .zmini{position:absolute;right:8px;bottom:8px;width:34%;aspect-ratio:16/9;border-color:rgba(127,243,255,.6)}
.hub .zmap{width:47%;cursor:pointer;background:radial-gradient(ellipse at 50% 45%,rgba(10,40,48,.9),rgba(2,10,14,.94))} .hub .zmap canvas{display:block;width:100%;height:100%}
/* battle buttons: same projected light */
#shud .c{border-radius:3px!important;border:1px solid rgba(127,243,255,.45)!important;background:linear-gradient(180deg,rgba(127,243,255,.14),rgba(127,243,255,.03)),repeating-linear-gradient(0deg,rgba(127,243,255,.07) 0 1px,transparent 1px 3px),rgba(4,16,20,.6)!important;box-shadow:0 0 10px rgba(127,243,255,.18),inset 0 0 12px rgba(127,243,255,.12)!important}
#shud .c span{color:#DDFBFF;text-shadow:0 0 6px rgba(127,243,255,.6),0 1px 2px #000!important}
#shud .c.rdy{border-color:${HC}!important;box-shadow:0 0 14px rgba(127,243,255,.45),inset 0 0 16px rgba(127,243,255,.22)!important}
#shud .c.u{border-color:rgba(190,250,255,.8)!important} #shud .c.u.rd{box-shadow:0 0 18px rgba(127,243,255,.7),inset 0 0 18px rgba(127,243,255,.3)!important}
#shud .ul button{border:1.5px solid rgba(127,243,255,.5)!important;background:radial-gradient(circle,rgba(127,243,255,.18),rgba(4,16,20,.7) 70%)!important;color:#DDFBFF!important;box-shadow:0 0 12px rgba(127,243,255,.25),inset 0 0 14px rgba(127,243,255,.2)}
#shud .ul.rd button{border-color:${HC}!important;box-shadow:0 0 20px rgba(127,243,255,.6),inset 0 0 18px rgba(127,243,255,.35)}
/* result and pause overlays */
#sres .hub button.btn,#rpause .hub button.btn{border-radius:2px;color:#DDFBFF;border:1px solid rgba(127,243,255,.42);
  background:linear-gradient(180deg,rgba(127,243,255,.13),rgba(127,243,255,.03)),repeating-linear-gradient(0deg,rgba(127,243,255,.07) 0 1px,transparent 1px 3px),rgba(4,16,20,.6)}
#sres .hub button.btn.pri,#rpause .hub button.btn.pri{color:#F2FEFF;border-color:rgba(190,250,255,.9);
  background:linear-gradient(180deg,rgba(127,243,255,.34),rgba(56,200,224,.12)),repeating-linear-gradient(0deg,rgba(220,255,255,.12) 0 1px,transparent 1px 3px),rgba(4,22,28,.65)}
#sres .hres .sync{border-color:rgba(127,243,255,.45);background:rgba(127,243,255,.07)}
#shud .xb i{background:${HC}!important;box-shadow:0 0 8px ${HC}}
#shud .me{clip-path:none!important;border-radius:2px;box-shadow:inset 0 0 20px rgba(127,243,255,.08)}
#shud .pz{clip-path:none!important;border-color:rgba(127,243,255,.5)!important;color:${HC}!important;box-shadow:0 0 10px rgba(127,243,255,.25)}
.hub .chz{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.hub .chz .sw{display:flex;align-items:center;gap:5px;height:24px;padding:0 8px 0 4px;border:1px solid rgba(127,243,255,.25);background:rgba(4,16,20,.55);color:#cfefff;font:600 10.5px ${KR};cursor:pointer;border-radius:2px}
.hub .chz .sw i{width:14px;height:14px;border-radius:50%;box-shadow:0 0 8px currentColor;border:1px solid rgba(255,255,255,.5)}
.hub .chz .sw.lk{color:#EBA74E;opacity:.8} .hub .chz .sw.lk i{filter:saturate(.6) brightness(.8)}
.hub .chz .sw.on{border-color:${HC};box-shadow:0 0 10px rgba(127,243,255,.45);background:rgba(127,243,255,.16)}
.hub .chz .sw.arm{border-color:#EBA74E;box-shadow:0 0 12px rgba(235,167,78,.6)}
.hub .top .back,.hub .purse span,.hub .top b,.hub .top .hk{white-space:nowrap}
@media (max-width:760px){ .hub .top .hk{letter-spacing:.08em;font-size:9px} .hub .crest small{display:none} .hub .top .back small{display:none} .hub .top .back{min-width:0;width:auto;padding:0 12px;flex:none} .hub .purse span{padding-left:8px;padding-right:8px} .hub .top{gap:6px} }
`; document.head.appendChild(holo);

// ============================================================ stick figures (enemies in battle, descendants in menus)
// angles are measured from straight down, positive toward the way the figure faces
const P=(o,a,l)=>[o[0]+Math.sin(a)*l,o[1]+Math.cos(a)*l];
function rig(H,o){ const ph=o.ph||0, hurt=o.hurt||0, heavy=!!o.heavy;
  const lean=(heavy?.16:.06)+(o.lean||0)-hurt*.4, hip=[-hurt*H*.05,-H*.47+Math.abs(Math.sin(ph))*H*.015];
  const neck=P(hip,Math.PI-lean,H*.33), head=P(neck,Math.PI-lean*1.2,H*.1), sh=P(hip,Math.PI-lean,H*.3);
  const leg=p=>{ const a=Math.sin(p)*(o.stride??.5), k=P(hip,a,H*.25), b=.15+.55*Math.max(0,Math.sin(p+1.7)); return [k,P(k,a-b,H*.24)]; };
  return {hip,neck,head,sh,hr:H*.075,L1:leg(ph),L2:leg(ph+Math.PI),ph,H,lean}; }
function arms(R,kind,atk){ const H=R.H, sh=R.sh, sw=Math.sin(R.ph)*.45, up=H*.17, fo=H*.16;
  const arm=(a,b)=>{ const e=P(sh,a,up); return [e,P(e,a+b,fo)]; };
  let A1, A2, wa;
  if(kind==='gunner'){ A1=arm(1.35,.2); A2=arm(1.15,.6); wa=1.57; }
  else if(kind==='brute'||kind==='king'){ let a=.55, b=.9; if(atk>=0){ a=atk<.45?.55-atk/.45*3.6:-3.05+(atk-.45)/.55*4.6; b=atk<.45?.6:.2; } A1=arm(a,b); A2=arm(-sw*.6-.1,.5); wa=a+b; }
  else if(kind==='soldier'){ let a=.6, b=1.1; if(atk>=0){ a=atk<.35?.6-atk/.35*2.9:-2.3+(atk-.35)/.65*3.9; b=atk<.35?.9:.15; } A1=arm(a,b); A2=arm(.9,1.0); wa=a+b; }
  else { A1=arm(-sw+.2,.55); A2=arm(sw+.2,.55); wa=(-sw+.2)+.55; }
  return {A1,A2,wa}; }
function limbs(g,R,Am){ const s=R.sh, h=R.hip; g.moveTo(h[0],h[1]); g.lineTo(R.neck[0],R.neck[1]);
  for(const [k,f] of [R.L1,R.L2]){ g.moveTo(h[0],h[1]); g.lineTo(k[0],k[1]); g.lineTo(f[0],f[1]); }
  for(const [e,w] of [Am.A1,Am.A2]){ g.moveTo(s[0],s[1]); g.lineTo(e[0],e[1]); g.lineTo(w[0],w[1]); } }
// a blade of hard light: soft halo, coloured body, white core
function lightLine(g,a,b,w,c){ g.lineCap='round'; g.strokeStyle=c; g.beginPath(); g.moveTo(a[0],a[1]); g.lineTo(b[0],b[1]);
  g.globalAlpha=.3; g.lineWidth=w*2.6; g.stroke(); g.globalAlpha=1; g.lineWidth=w; g.stroke(); g.strokeStyle='#ffffff'; g.lineWidth=w*.4; g.stroke(); }
function hexPath(g,x,y,r){ g.beginPath(); for(let i=0;i<6;i++){ const a=i/6*TAU+Math.PI/6; g[i?'lineTo':'moveTo'](x+Math.cos(a)*r,y+Math.sin(a)*r*1.15); } g.closePath(); }
function visor(g,R,ac){ const vx=R.head[0], vy=R.head[1]-R.hr*.05; g.lineCap='round'; g.strokeStyle=INK; g.lineWidth=R.hr*.62; g.beginPath(); g.moveTo(vx-R.hr*.25,vy); g.lineTo(vx+R.hr*.95,vy); g.stroke(); g.strokeStyle=ac; g.lineWidth=R.hr*.3; g.stroke(); }
const KIND={shard:'soldier',archer:'gunner',brute:'brute',boss:'king'};
const SUIT='#dfe8f2', INK='#05080d';
// a synced zone resident: pale suit, dark outline, a visor band of the zone's light, weapons of hard light
function foeFigure(g,H,kind,o){ const heavy=kind==='brute'||kind==='king', R=rig(H,{ph:o.ph,hurt:o.hurt,heavy,stride:kind==='king'?.35:.5}), Am=arms(R,kind,o.atk), lw=H*(heavy?.07:.055), col=o.col||SUIT, ac=o.eye||CY;
  const hand=Am.A1[1], wl=kind==='king'?H*.55:kind==='brute'?H*.4:H*.32, tip=P(hand,Am.wa,wl);
  if(kind==='king'){ const gr=g.createLinearGradient(0,R.neck[1],0,0); gr.addColorStop(0,hexA(ac,.55)); gr.addColorStop(1,hexA(ac,0)); g.fillStyle=gr; g.beginPath(); g.moveTo(R.neck[0]-H*.03,R.neck[1]); g.lineTo(R.hip[0]-H*.34+Math.sin(R.ph)*H*.04,-H*.01); g.lineTo(R.hip[0]+H*.02,-H*.04); g.closePath(); g.fill(); }
  for(const pass of [0,1]){ g.strokeStyle=pass?col:INK; g.lineWidth=pass?lw:lw+H*.035; g.lineCap='round'; g.lineJoin='round'; g.beginPath(); limbs(g,R,Am); g.stroke();
    g.fillStyle=pass?col:INK; g.beginPath(); g.arc(R.head[0],R.head[1],R.hr+(pass?0:H*.018),0,TAU); g.fill(); }
  visor(g,R,ac);
  // chest seam of light
  { const a=Math.PI-R.lean, c0=P(R.hip,a,H*.12), c1=P(R.hip,a,H*.27); g.strokeStyle=hexA(ac,.85); g.lineWidth=Math.max(1.5,lw*.22); g.beginPath(); g.moveTo(c0[0],c0[1]); g.lineTo(c1[0],c1[1]); g.stroke(); }
  if(kind==='soldier'){ lightLine(g,hand,tip,lw*.5,ac); const s=Am.A2[1]; hexPath(g,s[0]+H*.03,s[1],H*.1); g.fillStyle=hexA(ac,.18); g.fill(); g.strokeStyle=hexA(ac,.9); g.lineWidth=Math.max(1.5,H*.012); g.stroke(); }
  else if(kind==='gunner'){ const back=Am.A2[1], fr=P(hand,1.57,H*.2); g.lineCap='butt'; g.strokeStyle=INK; g.lineWidth=lw*1.5; g.beginPath(); g.moveTo(back[0]-H*.04,back[1]); g.lineTo(fr[0],fr[1]); g.stroke();
    g.strokeStyle='#b7c4d4'; g.lineWidth=lw*.9; g.stroke(); g.strokeStyle=ac; g.lineWidth=Math.max(1.2,lw*.25); g.stroke(); g.lineCap='round';
    if(o.atk>0&&o.atk<.9){ g.fillStyle=hexA(ac,.5+.5*o.atk); g.beginPath(); g.arc(fr[0]+H*.02,fr[1],H*(.03+.04*o.atk),0,TAU); g.fill(); } }
  else if(kind==='brute'){ g.strokeStyle=INK; g.lineWidth=lw*.9; g.beginPath(); g.moveTo(hand[0],hand[1]); g.lineTo(tip[0],tip[1]); g.stroke(); g.strokeStyle='#b7c4d4'; g.lineWidth=lw*.5; g.stroke();
    g.save(); g.translate(tip[0],tip[1]); g.rotate(Math.atan2(tip[1]-hand[1],tip[0]-hand[0])); g.fillStyle=INK; g.fillRect(-H*.07,-H*.09,H*.14,H*.18); g.fillStyle=hexA(ac,.85); g.fillRect(-H*.055,-H*.075,H*.11,H*.15); g.fillStyle='#ffffff'; g.fillRect(-H*.015,-H*.075,H*.03,H*.15); g.restore(); }
  else if(kind==='king'){ lightLine(g,hand,tip,lw*.75,ac);
    const hx=R.head[0], hy=R.head[1]-R.hr*1.7; g.strokeStyle=INK; g.lineWidth=R.hr*.42; g.beginPath(); g.ellipse(hx,hy,R.hr*1.35,R.hr*.42,0,0,TAU); g.stroke(); g.strokeStyle=ac; g.lineWidth=R.hr*.2; g.stroke(); }
  return R; }
// in battle: replaces the painted enemy frames (drawE in surv.js calls this through G.foeDraw)
function drawResident(g,e){ const D=e.d, kind=KIND[D.base||e.type]||'soldier', H=e.h*(e.sv||1), ac=S.CH().acc;
  if(drawDistrict(g,e))return;
  g.save(); g.translate(e.x,e.y-e.z+4);
  const hp=Math.max(0,1-(RT-(e.hitT??-9))/.16); if(hp>0){ const q=hp*hp; g.rotate((e.hdx||0)*.3*q); g.scale(1+.18*q,1+.12*q); g.translate((Math.random()-.5)*H*.08*q,0); }
  if(e.z>0){ g.translate(0,-H*.5); g.rotate(-(.3+(e.sp||0))*e.f); g.translate(0,H*.5); }
  g.scale(e.f,1);
  let atk=-1; if(e.swing>0) atk=1-e.swing/.32; else if(e.castT>0) atk=1-e.castT/(D.boss?.9:.55);
  const hurt=e.hurtT>0?Math.min(1,e.hurtT/.3):e.stun>0?.6:0;
  const col=e.flash>.35?'#ffffff':(e.mkC&&e.mkT>RT)?e.mkC:SUIT;
  foeFigure(g,H,kind,{ph:(e.walkT||0)/(D.heavy?.55:.38)*TAU,atk,hurt,col,eye:ac});
  g.restore(); }
function drawDistrict(g,e,death){
  if(S.V.practice){
    const target=e.practiceTarget;
    if(target?.construct){
      const state=GameFieldEnemies.pose(e,death,RT),height=e.h*(e.sv||1);
      let x=e.x,y=e.y-(e.z||0)+3;
      g.save();
      if(death){
        g.globalAlpha*=1-Math.pow(death.t/death.life,2);
        if(death.vx!=null){x+=death.vx*death.t;y+=(death.vy-death.vz)*death.t+1400*death.t*death.t;}
      }
      GameConstructs.paint(g,'constructs',target.key,state.name,state.progress,x,y,height,e.f||1,false,e);
      g.restore();return true;
    }
    return GameFieldEnemies.draw(target?.sector??ZONES[S.V.ch]?.no,g,e,death);
  }
  if(G.frame)return window.PF?.bestiary?.draw(g,e,death);
  return GameFieldEnemies.draw(ZONES[S.V.ch]?.no,g,e,death);
}
G.foeDraw=e=>{
  e.sp=e.z>0?(e.sp||0)+(e.z>30?.13:0):0;
  drawResident(ctx,e);
  if(e.d.heavy){ const h=e.h*(e.sv||1); glow(fx,e.x+e.f*h*.04,e.y-e.z-h*.86,h*.1,S.CH().acc,.6); }
  return true; };
// a downed resident derezzes: thrown by an ultimate, or squashing into a line of light where he stood
G.foeDying=q=>{ const E=q.e, D=E.d, kind=KIND[D.base||E.type]||'soldier', H=D.h*D.sc, k=q.t/q.life, t=q.t, g=ctx, ac=S.CH().acc;
  if(drawDistrict(g,E,q))return true;
  g.save(); g.globalAlpha=q.vx!=null?Math.min(1,(1-k)*2.5):Math.max(0,1-k*k);
  if(q.vx!=null){ g.translate(E.x+q.vx*t,E.y+q.vy*t-(q.vz*t-1400*t*t)); g.translate(0,-H*.5); g.rotate(q.spin*t); g.translate(0,H*.5); }
  else { g.translate(E.x+(Math.random()-.5)*H*.06*k,E.y-E.z+4); g.scale(1+k*.35,Math.max(.02,1-k)); }
  g.scale(E.f,1); foeFigure(g,H,kind,{ph:0,atk:-1,hurt:1,col:k<.3?'#ffffff':ac,eye:ac}); g.restore(); return true; };

// descendant portrait: a stickman with his discipline's weapon of light (menus only)
function heroFigure(g,H,cls,t,col){ const R=rig(H,{ph:Math.sin(t*1.6)*.12,stride:.25,lean:-.02}), s=R.sh, up=H*.17, fo=H*.16, ac=profiles[cls].accent;
  const arm=(a,b)=>{ const e=P(s,a,up); return [e,P(e,a+b,fo)]; }, br=Math.sin(t*2)*.04;
  let A1=arm(.35+br,.9), A2=arm(-.25-br,.5);
  if(cls==='mage'||cls==='shaman'||cls==='pyro') A1=arm(1.05+br,.5);
  if(cls==='fist'){ A1=arm(.9,2.0); A2=arm(.7,2.2); }
  if(cls==='assassin'){ A1=arm(.8,1.2); A2=arm(-.5,1.6); }
  if(cls==='axe'){ A1=arm(1.15+br,.35); A2=arm(1.0-br,.6); }
  const Am={A1,A2}, lw=H*.06, h1=A1[1];
  for(const pass of [0,1]){ g.strokeStyle=pass?col:INK; g.lineWidth=pass?lw:lw+H*.04; g.lineCap='round'; g.lineJoin='round'; g.beginPath(); limbs(g,R,Am); g.stroke();
    g.fillStyle=pass?col:INK; g.beginPath(); g.arc(R.head[0],R.head[1],R.hr+(pass?0:H*.02),0,TAU); g.fill(); }
  visor(g,R,ac);
  if(cls==='sword') lightLine(g,h1,P(h1,Math.PI-.35,H*.5),lw*.45,ac);
  else if(cls==='assassin') for(const a of [A1,A2]) lightLine(g,a[1],P(a[1],Math.PI-.9,H*.2),lw*.35,ac);
  else if(cls==='axe'){ const hd=P(h1,Math.PI-.5,H*.55); lightLine(g,P(h1,Math.PI-.5,-H*.12),hd,lw*.4,'#8a5a3a'); g.fillStyle=ac; g.beginPath(); g.moveTo(hd[0],hd[1]); g.lineTo(hd[0]-H*.2,hd[1]-H*.06); g.quadraticCurveTo(hd[0]-H*.26,hd[1]+H*.1,hd[0]-H*.16,hd[1]+H*.22); g.lineTo(hd[0]-H*.02,hd[1]+H*.14); g.closePath(); g.fill(); glow(g,hd[0]-H*.18,hd[1]+H*.08,H*.16,'#ff5a14',.8); }
  else if(cls==='fist') for(const a of [A1,A2]) glow(g,a[1][0],a[1][1],H*.1,ac,.9);
  else { const c=[h1[0]+H*.06,h1[1]-H*.08]; glow(g,c[0],c[1],H*.18,ac,.9); g.fillStyle='#ffffff'; g.beginPath(); g.arc(c[0],c[1],H*.03,0,TAU); g.fill();
    g.strokeStyle=hexA(ac,.8); g.lineWidth=Math.max(1,H*.008);
    if(cls==='mage'){ g.beginPath(); g.ellipse(c[0],c[1],H*.09,H*.03,t*.8,0,TAU); g.stroke(); g.beginPath(); g.ellipse(c[0],c[1],H*.09,H*.03,-t*.8+1,0,TAU); g.stroke(); }
    if(cls==='shaman') for(let i=0;i<3;i++){ const a=t*1.5+i*TAU/3; glow(g,R.head[0]+Math.cos(a)*H*.2,R.head[1]+H*.05+Math.sin(a)*H*.07,H*.05,ac,.9); }
    if(cls==='pyro') for(let i=0;i<3;i++) glow(g,c[0]+Math.sin(t*7+i)*H*.02,c[1]-H*(.05+i*.04),H*(.08-i*.02),'#ffb36a',.7); } }

// ============================================================ backdrops: the generated cinematic stills (assets/menu), crossfaded per screen, with rain or dust drifting over them
function seeded(s){ return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
const MENU='assets/menu/';
const SHOT={title:'m_title',hero:'m_heroes',town:'m_base',quest:'m_map',train:'m_base',smith:'m_fab',guild:'m_heroes',arcadia:'m_arcadia'};
// how dark the photo is made under the interface, per screen (left-heavy where the panels sit)
const SCRIM={title:'linear-gradient(90deg,rgba(4,7,7,.88) 0%,rgba(4,7,7,.55) 38%,rgba(4,7,7,0) 62%),linear-gradient(0deg,rgba(4,7,7,.7),rgba(4,7,7,0) 30%)',
  hero:'linear-gradient(0deg,rgba(4,7,7,.82),rgba(4,7,7,.45) 60%,rgba(4,7,7,.6))',
  town:'linear-gradient(0deg,rgba(4,7,7,.85),rgba(4,7,7,.25) 55%,rgba(4,7,7,.55)),linear-gradient(90deg,rgba(4,7,7,.7),rgba(4,7,7,0) 45%)',
  quest:'linear-gradient(90deg,rgba(4,7,7,.86),rgba(4,7,7,.5) 45%,rgba(4,7,7,.7))',
  train:'linear-gradient(0deg,rgba(4,7,7,.88),rgba(4,7,7,.72))',
  smith:'linear-gradient(90deg,rgba(4,7,7,.82) 0%,rgba(4,7,7,.25) 42%,rgba(4,7,7,.25) 58%,rgba(4,7,7,.82) 100%)',
  guild:'linear-gradient(0deg,rgba(4,7,7,.9),rgba(4,7,7,.75))'};
for(const n of [...new Set(Object.values(SHOT)),'v_z7','v_z1','v_z2','v_z3','v_z4','v_z5','v_z6']){ const im=new Image(); im.src=MENU+n+'.webp'; }
const bgBox=document.createElement('div'); bgBox.style.cssText='position:absolute;inset:0;overflow:hidden';
const ph=[document.createElement('div'),document.createElement('div')]; ph.forEach(d=>{ d.className='photo'; bgBox.appendChild(d); }); ph[1].classList.add('b');
const scrim=document.createElement('div'); scrim.className='scrim'; bgBox.appendChild(scrim);
const fxc=document.createElement('canvas'); fxc.className='fxc'; bgBox.appendChild(fxc); const fg=fxc.getContext('2d');
const grain=document.createElement('div'); grain.className='grain'; bgBox.appendChild(grain);
let shown='', front=0, drops=[];
function setShot(scr){ const n=scr==='quest'&&qSel!=null&&qSel!=='seal'?'v_z'+ZONES[qSel].no:SHOT[scr]||'m_base'; scrim.style.background=SCRIM[scr]||SCRIM.train;
  const blur=scr==='train'||scr==='guild'; if(n!==shown){ shown=n; front^=1; ph[front].style.backgroundImage=`url(${MENU}${n}.webp)`; ph[front].classList.remove('b'); ph[front^1].classList.add('b'); }
  ph[front].style.filter=blur?'blur(6px) saturate(.8)':'none'; }
// rain on the title and base (the stills are rainy nights), slow dust elsewhere
function drawFx(t,scr){ const w=fxc.clientWidth|0, h=fxc.clientHeight|0; if(!w||!h) return; const d=Math.min(window.PF_FXDPR||2,window.devicePixelRatio||1); if(fxc.width!==Math.round(w*d)){ fxc.width=Math.round(w*d); fxc.height=Math.round(h*d); drops=[]; }
  const W=fxc.width, H=fxc.height, rain=scr==='title'||scr==='town'; fg.clearRect(0,0,W,H);
  const want=rain?120:36; while(drops.length<want) drops.push({x:Math.random()*W,y:Math.random()*H,v:.6+Math.random()*.8,l:Math.random()});
  if(drops.length>want) drops.length=want;
  fg.lineCap='round';
  for(const p of drops){ if(rain){ p.y+=H*.045*p.v; p.x-=H*.006*p.v; if(p.y>H){ p.y=-20; p.x=Math.random()*W*1.1; }
      fg.strokeStyle=`rgba(200,225,220,${.12+.16*p.v})`; fg.lineWidth=d*.8; fg.beginPath(); fg.moveTo(p.x,p.y); fg.lineTo(p.x+H*.008*p.v,p.y-H*.05*p.v); fg.stroke(); }
    else { p.y-=H*.0016*p.v; p.x+=Math.sin(t*.6+p.l*9)*d*.3; if(p.y<-4){ p.y=H+4; p.x=Math.random()*W; }
      fg.fillStyle=`rgba(235,190,120,${.18+.25*Math.sin(t*1.3+p.l*7)**2})`; fg.fillRect(p.x,p.y,d*1.6,d*1.6); } } }
function drawPortrait(c,cls,t){ const w=c.clientWidth|0; if(!w) return; const dpr=Math.min(2,window.devicePixelRatio||1), s=Math.round(w*dpr); if(c.width!==s){ c.width=s; c.height=s; }
  const g=c.getContext('2d'); g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,s,s); const ok=S.classReady(cls);
  glow(g,s*.5,s*.62,s*.42,profiles[cls].accent,ok?.3:.1);
  if(window.MK){MK.portrait(g,cls,t+ORDER.indexOf(cls),s);return;}
  g.save();
  // Leave room above the raised axe head in its square roster portrait.
  const axe=cls==='axe';
  g.translate(s*(axe ? .38 : .5),s*(axe ? .92 : .96)); heroFigure(g,s*(axe ? .67 : .9),cls,t+ORDER.indexOf(cls),ok?'#EDEAE4':'#3a4644'); g.restore(); }
// a generated GIF as a live feed; it disappears if the file is missing
const feed=(n,label,cls='')=>`<div class="feed ${cls}"><img src="${MENU}${n}.gif" alt="" onerror="this.parentNode.style.display='none'"><span class="tag"><i></i>${label}</span></div>`;

// ============================================================ battle floor: hologram ground per zone (replaces the stone texture v3_gnd / v3_gnd_n of fx3.js's lit floor)
// each zone has its own generated hologram ground (assets/menu/f_<zone>.webp, made seamless offline); the lighting map is derived here from its brightness
const ZK=['z7','z1','z2','z3','z4','z5','z6','z0'];
const FIMG=ZK.map(k=>{ const im=new Image(); im.src=MENU+'f_'+k+'.webp'; return im; });
const NRM={};
function normalOf(i){ if(NRM[i]) return NRM[i]; const im=FIMG[i], N=im.naturalWidth||1024, c=document.createElement('canvas'); c.width=c.height=N; const g=c.getContext('2d'); g.drawImage(im,0,0,N,N);
  const d=g.getImageData(0,0,N,N), px=d.data, L=new Float32Array(N*N); for(let k=0;k<N*N;k++) L[k]=(px[k*4]*.3+px[k*4+1]*.59+px[k*4+2]*.11)/255;
  const at=(x,y)=>L[((y+N)%N)*N+((x+N)%N)], s=2.2;
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){ const dx=(at(x+1,y)-at(x-1,y))*s, dy=(at(x,y+1)-at(x,y-1))*s, l=Math.hypot(dx,dy,1), k=(y*N+x)*4;
    px[k]=(-dx/l*.5+.5)*255; px[k+1]=(dy/l*.5+.5)*255; px[k+2]=(1/l*.5+.5)*255; px[k+3]=255; }
  g.putImageData(d,0,0); return NRM[i]=c; }
let floorZone=-1;
function floorIndex(){ const i=Math.max(0,Math.min(6,S.V.ch|0)); if(G.frame?.run?.zone===7) return ZK.indexOf('z0'); return G.frame?ZK.indexOf('z'+ZONES[i].no):i; }
function floorSwap(){ const F=window.FX3; if(!F||!F.gAlb) return; const i=floorIndex(), im=FIMG[i];
  if(floorZone===i&&F.gAlb.hub) return; if(!im.complete||!im.naturalWidth) return;
  const T=(img,name)=>({im:img,ok:true,t:null,o:{repeat:true,raw:true,mip:true},name,hub:true}); F.gAlb=T(im,'hub_f_'+ZK[i]); F.gNrm=T(normalOf(i),'hub_n_'+ZK[i]); floorZone=i; }
// the canvas floor (no WebGL, or before it is ready) uses the same picture, through G.floorTile in surv.js
G.floorTile=()=>{ const i=floorIndex(), c=document.createElement('canvas'); c.width=c.height=640; const g=c.getContext('2d'); g.fillStyle='#0b1012'; g.fillRect(0,0,640,640);
  if(FIMG[i].naturalWidth) g.drawImage(FIMG[i],0,0,640,640); return c; };

// ============================================================ icons (line drawings)
const ICO={
  quest:'<svg viewBox="0 0 32 32"><path d="M16 3l11 6.5v13L16 29 5 22.5v-13z"/><path d="M16 9l5.5 3.2v6.6L16 22l-5.5-3.2v-6.6z"/><path d="M16 3v6M27 9.5l-5.5 2.7M5 9.5l5.5 2.7"/></svg>',
  train:'<svg viewBox="0 0 32 32"><path d="M16 4l11 6v12l-11 6-11-6V10z"/><path d="M5 10l11 6 11-6M16 16v12"/><circle cx="16" cy="16" r="2"/></svg>',
  smith:'<svg viewBox="0 0 32 32"><path d="M6 24h20M8 20h16M10 16h12"/><path d="M16 4v8"/><path d="M12 8l4 4 4-4"/><circle cx="16" cy="27.5" r="1"/></svg>',
  guild:'<svg viewBox="0 0 32 32"><path d="M10 4c0 8 12 8 12 16s-12 8-12 8"/><path d="M22 4c0 8-12 8-12 16s12 8 12 8"/><path d="M12 9h8M11 15h10M11 21h10M12 27h8"/></svg>',
  w:'<svg viewBox="0 0 24 24"><path d="M5 19L17 7"/><path d="M15 5l4 4"/><path d="M7 14l3 3M4 20l1.5-1.5"/></svg>',
  a:'<svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z"/><path d="M12 8v8M8.5 12h7"/></svg>',
  t:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/><rect x="10" y="10" width="4" height="4"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>',
};

// ============================================================ screens
let scr='title', qSel=null, hSel=null, smTab='bag', booted=false;
const ui=document.createElement('div'); ui.className='ui';
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const ready=S.classReady;
const openCh=()=>Math.min(CHAP.length-1,SV().chClear||0);
const zno=i=>String(ZONES[i].no).padStart(2,'0');
const seg=n=>`<div class="seg">${[0,1,2,3,4,5,6].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>`;
const arrow='<svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="10" x2="16" y2="10"></line><polyline points="11,5 16,10 11,15"></polyline></svg>';
function goFull(){ if(!A.isTouch()) return; const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen) d.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})).catch(()=>{}); }
let toastT=0; function toast(m){ const t=ui.querySelector('.toast'); if(!t) return; t.textContent=m; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),1600); }
function go(s){ scr=s; A.menuRender(); }
function topBar(back,title,en){ const sv=SV(), need=A.needExp(sv.lv);
  return `<div class="top">${back?`<button class="btn back" data-go="town">← 기지<small>BASE</small></button>`:''}
    ${title?`<div style="display:flex;flex-direction:column;margin-right:4px"><b style="font:700 17px ${KR}">${title}</b><span class="hk">${en}</span></div>`:''}
    <div class="crest panel"><canvas data-hero="${pl.cls}"></canvas><div><b>${NAMES[pl.cls]} <span class="mut" style="font:600 11px ${MONO}">LV ${sv.lv}</span></b><small>${profiles[pl.cls].en}</small><div class="xp"><i style="width:${Math.min(100,sv.exp/need*100)}%"></i></div></div></div>
    <div class="purse"><span class="panel">크레딧<b class="cr">${H.gold.toLocaleString()}</b></span><span class="panel">SP<b style="color:${TL}">${sv.sp}</b></span></div></div>`; }
function viewTitle(){ const sv=SV(), has=sv.lv>1||sv.exp>0||(sv.chClear||0)>0||H.gold>0||!!sv.chars||(G.frame&&window.PF?.save?.data?.story?.visited?.town);
  return `<div class="title"><div class="pre">2248 · AUSTRALIA CONTROL ZONE</div><h1>프로메테우스</h1><div class="en">PROMETHEUS</div>
    <div class="tag">프로젝트로부터 200년. 봉인된 일곱 구역의 왕을 제압하고, 레온이 남긴 기록을 모아라.</div><div class="menu">
    ${!G.frame&&!new URLSearchParams(location.search).has('frame')?'<button class="btn" data-act="campaign">스토리 캠페인<small>일곱 왕과 남부 관제시설</small></button>':''}
    ${has?`<button class="btn pri" data-act="cont">작전 재개<small>RESUME · ${NAMES[pl.cls]} LV ${sv.lv}</small></button>`:`<button class="btn pri" data-act="new">새 작전 시작<small>BEGIN</small></button>`}
    ${has?`<button class="btn" data-go="hero">후손 선택<small>SELECT DESCENDANT</small></button>`:''}
    <button class="btn" data-go="guild">시스템<small>SYSTEM</small></button></div></div>
    ${feed('g_title','LIVE · RIFT','tfeed')}<div class="ver">SIGNAL UNSTABLE · BUILD 2248.11</div>`; }
function viewHero(){ const sv=SV(); if(!hSel) hSel=pl.cls; const c=hSel, ids=A.ORDER[c]||[], sk=id=>S.SK[id];
  const lvOf=k=>k===sv.cls?sv.lv:((sv.chars&&sv.chars[k])||{lv:1}).lv;
  const sig=ready(c)?[ids.find(i=>sk(i)&&sk(i).type==='basic'),...ids.filter(i=>sk(i)&&sk(i).type==='ult')].filter(Boolean).map(i=>sk(i).name):[];
  const nSk=ids.filter(i=>sk(i)&&sk(i).type==='skill').length;
  return `<div class="top"><button class="btn back" data-go="${booted?'town':'title'}">← 뒤로<small>BACK</small></button><div style="display:flex;flex-direction:column"><b style="font:700 17px ${KR}">후손 선택</b><span class="hk">Bloodline of the man</span></div></div>
  <div class="sheet"><div class="roster panel scroll">${ORDER.map(k=>`<div class="hc ${k===c?'on':''}" data-h="${k}"><i>LV ${lvOf(k)}</i><canvas data-hero="${k}"></canvas><b>${NAMES[k]}</b><small>${profiles[k].en}</small></div>`).join('')}</div>
  <div class="hdet panel col"><div class="scroll" style="flex:1"><canvas class="hero-model" data-hero="${c}" role="img" aria-label="${NAMES[c]} 스틱맨"></canvas><span class="hk">${profiles[c].en}</span><div class="big">${NAMES[c]}</div><div><span class="tagl">${profiles[c].roleLabel}</span> <span class="tagl">LV ${lvOf(c)}</span></div>
    <div class="lore">${profiles[c].lore}</div><div class="rule"></div>
    ${ready(c)?`<div class="kv"><span>기본 공격</span><b>${sig[0]||'-'}</b></div><div class="kv"><span>스킬</span><b>${nSk}개</b></div><div class="kv"><span>궁극기</span><b>${sig.slice(1).join(' · ')||'-'}</b></div>`:`<div class="mut">전투 데이터 동기화 중…</div>`}</div>
    <div style="padding-top:10px"><button class="btn pri" style="width:100%" data-act="pick" ${ready(c)?'':'disabled'}>${c===pl.cls?'이 후손으로 진입':'이 후손으로 교체'}<small>${c===pl.cls?'DEPLOY':'SWITCH'}</small></button></div></div></div>`; }
function viewTown(){ const sv=SV(), open=openCh(), done=(sv.chClear||0)>=CHAP.length, nxt=ZONES[open], fresh=H.fresh||0, synced=Math.min(7,sv.chClear||0);
  const P=(id,ico,kr,em,hot,badge)=>`<button class="place panel" data-go="${id}" style="position:relative">${ICO[ico]}<b>${kr}</b><em class="${hot?'hot':''}">${em}</em>${badge?`<span class="bdg">${badge}</span>`:''}</button>`;
  return topBar(false)+`<div class="town"><div class="bside"><span class="hk">OUTPOST · ZONE WALL</span><h2>보더라인</h2>
    <div class="stat panel"><div class="r"><span>레온의 기록</span><b>${synced} / 7</b></div>${seg(synced)}<div class="r"><span>균열 안정도</span><b style="color:${RD}">${Math.max(3,41-synced*5)}%</b></div><div class="r"><span>제압한 왕</span><b>${synced}</b></div></div>
    <button class="btn pri" data-go="quest" style="margin-top:auto;text-align:left;display:flex;align-items:center;justify-content:space-between"><span><small style="margin:0 0 2px">${done?'ALL ZONES SUBDUED':'NEXT OPERATION'}</small>${done?'구역 지도':nxt.no+'구역 · '+nxt.name}</span>${arrow}</button></div>
    <div class="bmain">${feed('g_wall','LIVE · ZONE WALL CAM 03','bfeed')}
    <div class="places">${P('quest','quest','구역 지도',done?'일곱 구역 제압':'7개 구역 · '+synced+'곳 제압',false)}
    ${P('train','train','시뮬레이터',sv.sp?'스킬 포인트 '+sv.sp:'스킬 · 모의 전투',sv.sp>0,sv.sp?'SP '+sv.sp:'')}
    ${P('smith','smith','패브리케이터',fresh?'새 장비 '+fresh+'개':'장비 제작 · 강화',fresh>0,fresh?'NEW '+fresh:'')}
    ${P('guild','guild','후손 기록','후손 교체 · 시스템',false)}</div></div></div><div class="toast panel"></div>`; }
function viewQuest(){ const sv=SV(), open=openCh(); if(qSel==null||(qSel!=='seal'&&qSel>open)) qSel=open;
  const seal=qSel==='seal', i=seal?0:qSel, c=CHAP[i], Z=ZONES[i], best=(sv.best||{})[pl.cls+i], clr=i<(sv.chClear||0);
  const rows=ZONES.map((z,k)=>{ const lk=k>open, cl=k<(sv.chClear||0), st=cl?['done','제압']:lk?['lk','잠김']:['open','진행'];
    return `<button class="zrow ${!seal&&k===i?'on':''} ${lk?'lk':''}" data-q="${k}"><span class="no">${String(z.no).padStart(2,'0')}</span><span>${z.name}</span><span class="st ${st[0]}">${st[1]}</span></button>`; }).join('')
    +`<button class="zrow ${seal?'on':''}" data-q="seal"><span class="no" style="color:${RD}">??</span><span style="color:#D98A7E">남부 관제실</span><span class="st seal">봉인</span></button>`;
  const lvc=sv.lv>=c.rec?'#9BD9A4':'#E88A7A';
  const det=seal?`<div class="feed zfeed" style="border-color:rgba(226,81,63,.45)"><img src="${MENU}m_arcadia.webp" alt=""><span class="tag"><i></i>SOUTHERN CONTROL · SIGNAL SEALED</span></div>
    <div class="zinfo panel"><div class="big"><b style="color:${RD}">??</b><span>남부 관제실</span></div><div class="lore">1903년 이후 봉인된 곳. 일곱 왕의 기록이 모두 모이면 이 문이 열린다.</div>
    <div class="btn" style="margin-top:6px;display:flex;align-items:center;border-style:dashed;color:${MU}">신호 봉인 — 레온의 기록 ${Math.min(7,sv.chClear||0)} / 7</div></div>`
   :`<div class="feed zfeed"><img src="${MENU}v_z${ZONES[i].no}.webp" alt=""><span class="tag"><i></i>ZONE ${zno(i)} · ${Z.en}</span><div class="feed zmini zmap"><canvas width="640" height="360" data-zmap></canvas><span class="tag"><i></i>HOLO MAP · SECTOR ${zno(i)}</span></div></div>
    <div class="zinfo panel"><div class="big"><b>${zno(i)}</b><span>${Z.no}구역 · ${Z.name}</span></div><div class="lore">${Z.lore}</div>
    <div class="zgrid"><div><small>구역의 왕</small><b style="color:${Z.acc}">${Z.king}</b></div><div><small>권장 레벨</small><b style="color:${lvc}">LV ${c.rec}</b></div><div><small>${clr?'최고 기록':'첫 제압 보상'}</small><b>${clr?(best?mmss(best):'-'):'레온의 기록'}</b></div></div>
    <button class="btn pri" data-act="embark" style="margin-top:8px;display:flex;align-items:center;justify-content:space-between"><span>구역 진입 · 신호 노드 3개 파괴 후 왕 제압</span>${arrow}</button></div>`;
  return topBar(true,'구역 지도','Prometheus zones · 7 sectors')+`<div class="sheet"><div class="zlist panel scroll">${rows}</div><div class="zdet">${det}</div></div><div class="toast panel"></div>`; }
function iconOf(id){ return G.sv_icon?G.sv_icon(id):''; }
function chromaRow(id){ const C=G.chroma; if(!C) return ''; const L=C.options(id), cur=C.sel(id);
  return `<div class="chz"><button class="sw ${cur<0?'on':''}" data-cz="${id}|-1" title="기본"><i style="background:linear-gradient(135deg,#ddd,#555)"></i></button>`+L.map((o,k)=>{ const own=C.owned(id,k);
    return `<button class="sw ${cur===k?'on':''} ${own?'':'lk'}" data-cz="${id}|${k}"><i style="background:${C.swatch(id,k)}"></i><span>${own?o[0]:C.price(id,k)}</span></button>`; }).join('')+'</div>'; }
function viewTrain(){ const sv=SV(), ids=A.ORDER[pl.cls]||[];
  const rows=ids.map(id=>{ const s=S.SK[id]; if(!s) return ''; const un=A.unlocked(id), lv=A.sLv(id), ev=lv>=5;
    const tag=s.type==='ult'?'궁극기':s.type==='basic'?'기본 공격':S.DASH_ID&&S.DASH_ID[pl.cls]===id?'대쉬 버튼 · 직접 사용':`재사용 ${A.cdOf(id).toFixed(1)}초 · 자동`;
    const act=un&&s.type!=='ult'?`<button class="btn sbtn ${sv.sp>0&&!ev?'pri':''}" data-up="${id}" ${sv.sp<1||ev?'disabled':''}>${ev?'진화 완료':lv===4?'진화':'강화'}</button>`:'';
    /* what a level does, in numbers: damage now, and what the next point buys (each level +15% damage, -5% wait; the fifth evolves it) */
    const k=1+.15*(lv-1), nk=(1+.15*lv)/k, cur=s.dmg?s.dmg*A.mul(id):0;
    const now=s.type==='ult'?'':s.dmg?`기준 피해 <b>${S.fmtN(Math.round(cur))}</b>${s.cd?' · 재사용 '+A.cdOf(id).toFixed(1)+'초':''}`:`현재 피해 배율 <b>×${A.mul(id).toFixed(2)}</b>`;
    const nxt=s.type==='ult'||ev?'':`LV ${lv+1} 강화 · ${s.dmg?'기준 피해 '+S.fmtN(Math.round(cur*nk)):'피해 배율 ×'+(A.mul(id)*nk).toFixed(2)}${s.cd?` · 재사용 ${(s.cd*(1-.05*lv)).toFixed(1)}초`:''}${lv===4?' · <b>진화</b>':''}`;
    const up=un&&s.type!=='ult'?`<div class="sup" style="margin-top:4px;font-size:11.5px;line-height:1.5;color:${TL}">${now}${nxt?`<br><span style="color:${AM}">${nxt}</span>`:'<br><span style="color:'+AM+'">강화 완료 · 진화 효과 적용 중</span>'}</div>`:'';
    return `<div class="row ${un?'':'lock'}">${iconOf(id)}<div class="tx"><b>${s.name}</b><span class="tg">${tag}</span><p>${un?s.desc+(s.evo&&s.type!=='ult'?` <span class="cr">진화: ${s.evo}</span>`:''):'LV '+s.lv+'에 해제'}</p>${up}${un?chromaRow(id):''}</div><div class="lvl">${s.type==='ult'?'':ev?'★ EVO':'LV '+lv+'/5'}</div>${act}</div>`; }).join('');
  return topBar(true,'시뮬레이터','Skill matrix')+`<div class="sheet"><div class="panel col" style="flex:2;min-width:0"><div class="scroll" style="flex:1">${ready(pl.cls)?rows:'<div class="mut">전투 데이터 동기화 중…</div>'}</div></div>
    <div class="panel col" style="flex:1;min-width:190px"><div class="scroll" style="flex:1"><h3><small>COMBAT SIMULATION</small>모의 전투</h3><div class="lore">홀로그램 표적을 상대로 모든 스킬과 궁극기를 시험합니다. 기록과 보상은 남지 않습니다.</div>
    <div class="rule"></div><div class="kv"><span>스킬 포인트</span><b style="color:${AM}">${sv.sp}</b></div><div class="kv"><span>크레딧</span><b style="color:${AM}">${H.gold}</b></div><div class="lore" style="margin-top:6px">스킬 아래 색을 눌러 크레딧으로 해금하고 바꿀 수 있습니다. 궁극기는 두 가지 색이 있습니다.</div><div class="kv"><span>다음 레벨까지</span><b>${Math.max(0,A.needExp(sv.lv)-sv.exp)} EXP</b></div></div>
    <div style="padding-top:10px"><button class="btn" style="width:100%" data-act="practice" ${ready(pl.cls)?'':'disabled'}>시뮬레이션 시작<small>RUN</small></button></div></div></div><div class="toast panel"></div>`; }
function itemCard(it,sub){ const r=RAR[it.rar]; return `<div class="gem" style="--r:${r[2]}">${ICO[it.slot]}</div><div class="tx" style="flex:1;min-width:0"><div class="itn" style="--r:${r[2]}">${itName(it)}</div><div class="its">${itStat(it)} <span class="mut" style="font-size:10.5px">· ${r[0]} · T${it.tier}</span>${sub?' '+sub:''}</div></div>`; }
function viewSmith(){ const g=gearOf(pl.cls);
  const slots=SLOTS.map(([s,kr,en])=>{ const it=g[s]&&byId(g[s]); return `<div class="slot">${it?itemCard(it):`<div class="gem" style="--r:#3d4a48">${ICO[s]}</div><div class="tx" style="flex:1"><div class="itn" style="--r:#7f8c88">${kr} 비어 있음</div><div class="its mut">${en}</div></div>`}
    ${it?`<button class="btn sbtn" data-upg="${it.id}" ${it.plus>=MAXP||H.gold<upOf(it)?'disabled':''}>${it.plus>=MAXP?'최대':'강화 '+upOf(it)}</button>`:''}</div>`; }).join('');
  const bag=H.stash.filter(it=>equippedBy(it.id)!==pl.cls).sort((a,b)=>b.rar-a.rar||b.tier-a.tier);
  const list=smTab==='bag'?(bag.length?bag.map(it=>{ const who=equippedBy(it.id); const cur=g[it.slot]&&byId(g[it.slot]), d=cur?itVal(it)-itVal(cur):itVal(it);
      return `<div class="row">${itemCard(it,`<span style="color:${d>0?'#9BD9A4':d<0?'#E88A7A':MU};font-size:10.5px">${d>0?'▲'+d:d<0?'▼'+(-d):'='}</span>${who?` <span class="mut" style="font-size:10.5px">(${NAMES[who]} 장착)</span>`:''}`)}<button class="btn sbtn pri" data-eq="${it.id}">장착</button><button class="btn sbtn" data-sell="${it.id}" ${who?'disabled':''}>분해 ${sellOf(it)}</button></div>`; }).join(''):'<div class="mut" style="padding:12px 4px">보관함이 비었습니다. 구역에서 장비를 회수해 오세요.</div>')
    :H.stock.map((it,k)=>`<div class="row">${itemCard(it)}<button class="btn sbtn pri" data-buy="${k}" ${H.gold<buyOf(it)||H.stash.length>=BAG?'disabled':''}>${buyOf(it)} CR</button></div>`).join('')+'<div class="mut" style="padding:10px 4px;font-size:11.5px">구역에 다녀오면 제작 목록이 갱신됩니다.</div>';
  return topBar(true,'패브리케이터','Fabrication bay')+`<div class="sheet"><div class="panel col scroll" style="width:min(300px,36vw)"><h3><small>LOADOUT · ${profiles[pl.cls].en}</small>장착 장비</h3><div class="rule"></div><div class="slots">${slots}</div>
    <div class="rule"></div><div class="kv"><span>피해</span><b>+${stat('w')}%</b></div><div class="kv"><span>최대 HP</span><b>${A.maxHp()}</b></div><div class="kv"><span>경험치·크레딧</span><b>+${stat('t')}%</b></div></div>
    <div style="flex:1"></div>
    <div class="panel col" style="width:min(360px,42vw);min-width:0"><div class="tabs"><button class="${smTab==='bag'?'on':''}" data-tab="bag">보관함 ${H.stash.length}/${BAG}</button><button class="${smTab==='shop'?'on':''}" data-tab="shop">제작</button></div><div class="scroll" style="flex:1">${list}</div></div></div><div class="toast panel"></div>`; }
const SPDS=[[1,'보통'],[1.2,'빠름'],[1.4,'매우 빠름']];
function viewGuild(){ const sv=SV(), o=sv.opt||{};
  const T=(k,kr,en)=>`<div class="opt"><div><b style="font:700 14px ${KR}">${kr}</b><div class="hk" style="font-size:9px">${en}</div></div><button class="tog ${o[k]?'on':''}" data-opt="${k}" aria-label="${kr}"></button></div>`;
  const rec=CHAP.map((c,i)=>{ const b=(sv.best||{})[pl.cls+i], z=ZONES[i]; return `<div class="kv"><span>${z.no}구역 · ${z.name}</span><b>${i<(sv.chClear||0)?'<span style="color:'+AM+'">제압</span> · ':''}${b?mmss(b):'-'}</b></div>`; }).join('');
  return `<div class="top"><button class="btn back" data-go="${booted?'town':'title'}">← ${booted?'기지':'뒤로'}<small>${booted?'BASE':'BACK'}</small></button><div style="display:flex;flex-direction:column"><b style="font:700 17px ${KR}">${booted?'후손 기록':'시스템'}</b><span class="hk">${booted?'Lineage · system':'System'}</span></div></div>
  <div class="sheet">${booted?`<div class="panel col scroll" style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:12px"><canvas data-hero="${pl.cls}" style="width:76px;height:76px"></canvas><div><b style="font:900 20px ${KR}">${NAMES[pl.cls]}</b><div class="mut">LV ${sv.lv} · ${profiles[pl.cls].roleLabel} · 레온의 기록 ${Math.min(7,sv.chClear||0)}/7</div></div></div>
    <button class="btn" style="margin-top:10px" data-go="hero">후손 교체<small>SWITCH DESCENDANT</small></button><div class="rule"></div><span class="hk" style="margin-bottom:4px">ZONE RECORDS</span>${rec}</div>`:''}
    <div class="panel col" style="flex:1;min-width:0"><h3><small>SYSTEM</small>시스템</h3><div class="rule"></div>${T('calm','섬광·흔들림 줄이기','Reduce flash & shake')}${T('lowfx','이펙트 품질 낮춤','Low effect quality')}
    <div class="opt"><div><b style="font:700 14px ${KR}">이동 속도</b><div class="hk" style="font-size:9px">Move speed</div></div><button class="btn sbtn" data-spd="1">${SPDS.find(x=>x[0]===(o.spd||1))[1]}</button></div>
    ${booted?`<button class="btn" style="margin-top:auto" data-go="title">타이틀 화면<small>TITLE</small></button>`:''}</div></div><div class="toast panel"></div>`; }

// ============================================================ the menu itself
G.menuOverride=el=>{ const sv=SV(); sv.opt=sv.opt||{}; sv.opt.stick=true;
  el.classList.remove('mob'); el.classList.add('hub');
  if(bgBox.parentNode!==el||ui.parentNode!==el){ el.innerHTML=''; el.appendChild(bgBox); el.appendChild(ui); }
  if(scr!=='title'&&scr!=='hero'&&scr!=='guild') booted=true;
  const html=scr==='title'?viewTitle():scr==='hero'?viewHero():scr==='quest'?viewQuest():scr==='train'?viewTrain():scr==='smith'?viewSmith():scr==='guild'?viewGuild():viewTown();
  setShot(scr);
  ui.innerHTML=html;
  if(scr==='smith'&&H.fresh){ H.fresh=0; hsave(); }
  const R=()=>A.menuRender(), on=(q,f)=>ui.querySelectorAll(q).forEach(b=>b.onclick=e=>{ e.stopPropagation(); f(b); });
  on('[data-go]',b=>go(b.dataset.go));
  on('[data-act=campaign]',()=>location.assign('?frame'));
  on('[data-act=cont]',()=>{ booted=true; go('town'); });
  on('[data-act=new]',()=>{ hSel=pl.cls; go('hero'); });
  on('[data-h]',b=>{ hSel=b.dataset.h; R(); });
  on('[data-act=pick]',()=>{ const c=hSel; if(!ready(c)) return; if(c!==pl.cls){ A.swapClass(c); setClass(c,true); } booted=true; go('town'); });
  on('[data-q]',b=>{ const v=b.dataset.q; if(v==='seal'){ qSel='seal'; R(); return; } const k=+v; if(k>openCh()){ toast('앞 구역의 왕을 먼저 제압해야 합니다'); return; } qSel=k; R(); });
  { const zc=ui.querySelector('canvas[data-zmap]'); if(zc){ drawZmap(zc,performance.now()/1000); zc.onclick=e=>{ e.stopPropagation(); const k=zmapPick(zc,e); if(k==='seal'){ qSel='seal'; R(); } else if(k>=0){ if(k>openCh()){ toast('앞 구역의 왕을 먼저 제압해야 합니다'); return; } qSel=k; R(); } }; } }
  on('[data-act=embark]',()=>{ if(!ready(pl.cls)||qSel==='seal') return; goFull(); G.survStart(qSel); });
  on('[data-act=practice]',()=>{ if(!ready(pl.cls)) return; goFull(); G.survStart(openCh(),{practice:true}); });
  on('[data-cz]',b=>{ const C=G.chroma; if(!C) return; const [id,ks]=b.dataset.cz.split('|'), k=+ks; if(k<0||C.owned(id,k)){ C.pick(id,k); R(); return; }
    const c=C.price(id,k); if(H.gold<c){ toast(`크레딧이 부족합니다 · ${c} 필요`); return; } if(b.dataset.arm!=='1'){ ui.querySelectorAll('[data-arm]').forEach(x=>{ x.dataset.arm=''; x.classList.remove('arm'); }); b.dataset.arm='1'; b.classList.add('arm'); toast(`${C.options(id)[k][0]} · ${c} 크레딧 — 한 번 더 누르면 해금`); return; }
    C.buy(id,k); R(); toast(`${C.options(id)[k][0]} 해금`); });
  on('[data-up]',b=>{ const id=b.dataset.up; if(sv.sp<1||A.sLv(id)>=5) return; sv.sp--; sv.sl[id]=A.sLv(id)+1; A.save(); R(); });
  on('[data-opt]',b=>{ const k=b.dataset.opt; sv.opt[k]=!sv.opt[k]; A.save(); R(); });
  on('[data-tab]',b=>{ smTab=b.dataset.tab; R(); });
  on('[data-spd]',()=>{ const i=SPDS.findIndex(x=>x[0]===(sv.opt.spd||1)); sv.opt.spd=SPDS[(i+1)%SPDS.length][0]; A.save(); R(); toast('이동 속도 · '+SPDS.find(x=>x[0]===sv.opt.spd)[1]); });
  on('[data-eq]',b=>{ const it=byId(+b.dataset.eq); if(!it) return; const who=equippedBy(it.id); if(who) delete gearOf(who)[it.slot]; gearOf(pl.cls)[it.slot]=it.id; hsave(); R(); toast(itName(it)+' 장착'); });
  on('[data-sell]',b=>{ const it=byId(+b.dataset.sell); if(!it||equippedBy(it.id)) return; H.gold+=sellOf(it); H.stash=H.stash.filter(x=>x!==it); hsave(); R(); toast('분해 · '+sellOf(it)+' 크레딧'); });
  on('[data-buy]',b=>{ const k=+b.dataset.buy, it=H.stock[k]; if(!it||H.gold<buyOf(it)||H.stash.length>=BAG) return; H.gold-=buyOf(it); H.stock.splice(k,1); it.id=H.uid++; H.stash.push(it); hsave(); R(); toast(itName(it)+' 제작 완료'); });
  on('[data-upg]',b=>{ const it=byId(+b.dataset.upg); if(!it||it.plus>=MAXP||H.gold<upOf(it)) return; H.gold-=upOf(it); it.plus=(it.plus||0)+1; hsave(); R(); toast(itName(it)+' 강화 완료'); });
};
// ============================================================ holo map: the continent cut into the seven sectors; the chosen one is lit in its own colour
const AUS=[[114,-22],[113.5,-25],[115,-30],[115,-34],[117.5,-35],[123,-33.8],[126,-32.3],[131,-31.5],[134,-32.8],[136,-35],[137.5,-33],[138,-35],[140,-37.8],[143.5,-38.8],[146.3,-39],[148,-37.8],[150,-37.4],[150.5,-35.5],[151.3,-33.8],[153,-31],[153.6,-28],[153,-25.5],[151,-23.5],[149,-21],[146,-18.8],[145.4,-16],[145,-14.5],[143.5,-14],[142.5,-10.7],[141.5,-13],[141.5,-16.5],[140,-17.6],[137.5,-16],[135.5,-14.8],[136.8,-12.2],[133,-11.3],[131,-12.2],[130,-13],[129.5,-15],[128,-15],[126.5,-14],[125,-15],[123.5,-17],[122,-18.2],[120,-19.8],[117,-20.6]];
const TAS=[[144.7,-40.7],[148.3,-40.9],[148,-43.2],[146,-43.6],[145.2,-42.2]];
const ZSEED=[[150.3,-29.5],[121.5,-20.5],[144.5,-36.3],[133.5,-15.5],[133,-25.5],[118.5,-29.5],[143.8,-21.5]], SEAL=[138.6,-34.9];
const MW=640, MH=360, MSC=9.7, mpt=([lo,la])=>[MW/2+(lo-133.5)*MSC,(-la-8.5)*MSC];
let ZM=null;
function zmapBuild(){ const mk=()=>{ const c=document.createElement('canvas'); c.width=MW; c.height=MH; return c; };
  const c=mk(), g=c.getContext('2d'); g.beginPath(); for(const P of [AUS,TAS]){ P.forEach((p,i)=>{ const [x,y]=mpt(p); i?g.lineTo(x,y):g.moveTo(x,y); }); g.closePath(); } g.fillStyle='#fff'; g.fill();
  const land=g.getImageData(0,0,MW,MH).data, SD=ZSEED.map(mpt), lab=new Int8Array(MW*MH).fill(-1);
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){ const i=y*MW+x; if(land[i*4+3]<128) continue; let b=0, bd=1e9; SD.forEach(([sx,sy],k)=>{ const d=(x-sx)**2+(y-sy)**2; if(d<bd){ bd=d; b=k; } }); lab[i]=b; }
  const masks=ZSEED.map((_,k)=>{ const m=mk(), mg=m.getContext('2d'), D=mg.createImageData(MW,MH); for(let i=0;i<lab.length;i++) if(lab[i]===k){ D.data[i*4]=D.data[i*4+1]=D.data[i*4+2]=D.data[i*4+3]=255; } mg.putImageData(D,0,0); return m; });
  const edge=mk(), eg=edge.getContext('2d'), E=eg.createImageData(MW,MH);
  for(let y=1;y<MH-1;y++) for(let x=1;x<MW-1;x++){ const i=y*MW+x, a=lab[i]; if(a<0) continue; const n=[lab[i+1],lab[i-1],lab[i+MW],lab[i-MW]];
    if(n.some(v=>v!==a)){ const coast=n.some(v=>v<0); E.data[i*4]=127; E.data[i*4+1]=243; E.data[i*4+2]=255; E.data[i*4+3]=coast?235:120; } }
  eg.putImageData(E,0,0);
  const ctr=ZSEED.map((_,k)=>{ let sx=0, sy=0, n=0; for(let i=0;i<lab.length;i++) if(lab[i]===k){ sx+=i%MW; sy+=i/MW|0; n++; } return [sx/n,sy/n]; });
  ZM={lab,masks,edge,ctr,tint:new Map(),scratch:mk()}; }
function zTint(k,c){ const key=k+c; let t=ZM.tint.get(key); if(t) return t; t=document.createElement('canvas'); t.width=MW; t.height=MH; const g=t.getContext('2d'); g.drawImage(ZM.masks[k],0,0); g.globalCompositeOperation='source-in'; g.fillStyle=c; g.fillRect(0,0,MW,MH); ZM.tint.set(key,t); return t; }
function drawZmap(cv,t){ if(!ZM) zmapBuild(); const g=cv.getContext('2d'), sel=qSel==='seal'||qSel==null?-1:qSel, open=openCh(), clr=SV().chClear||0;
  g.clearRect(0,0,MW,MH);
  g.strokeStyle='rgba(127,243,255,.07)'; g.lineWidth=1; g.beginPath(); for(let x=16;x<MW;x+=32){ g.moveTo(x,0); g.lineTo(x,MH); } for(let y=12;y<MH;y+=32){ g.moveTo(0,y); g.lineTo(MW,y); } g.stroke();
  ZONES.forEach((z,k)=>{ const on=k===sel, lk=k>open; g.globalAlpha=on?.5+.14*Math.sin(t*3.2):lk?.06:k<clr?.22:.13; g.drawImage(zTint(k,on||k<clr?z.acc:HC),0,0); });
  if(sel>=0){ const z=ZONES[sel], s=ZM.scratch, sg=s.getContext('2d');
    g.save(); g.globalAlpha=.55; g.shadowColor=z.acc; g.shadowBlur=26; g.drawImage(zTint(sel,z.acc),0,0); g.restore();
    /* a scan band sweeps down the lit sector only */
    sg.clearRect(0,0,MW,MH); const yb=((t*.45)%1)*MH*1.3-MH*.15, gr=sg.createLinearGradient(0,yb-40,0,yb+40); gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(.5,'rgba(255,255,255,.75)'); gr.addColorStop(1,'rgba(255,255,255,0)');
    sg.fillStyle=gr; sg.fillRect(0,yb-40,MW,80); sg.fillStyle='rgba(255,255,255,.18)'; for(let y=0;y<MH;y+=4) sg.fillRect(0,y,MW,1);
    sg.globalCompositeOperation='destination-in'; sg.drawImage(ZM.masks[sel],0,0); sg.globalCompositeOperation='source-over'; g.globalAlpha=.5; g.drawImage(s,0,0); }
  g.globalAlpha=.85; g.drawImage(ZM.edge,0,0); g.globalAlpha=1;
  g.textAlign='center'; g.textBaseline='middle';
  ZONES.forEach((z,k)=>{ const [x,y]=ZM.ctr[k], on=k===sel, lk=k>open; g.font=`700 ${on?30:19}px ${MONO}`; g.fillStyle=on?'#fff':lk?'rgba(127,243,255,.3)':k<clr?z.acc:'rgba(200,250,255,.8)';
    if(on){ g.shadowColor=z.acc; g.shadowBlur=16; } g.fillText(String(z.no).padStart(2,'0'),x,y); g.shadowBlur=0;
    if(on){ g.font=`600 13px ${MONO}`; g.fillStyle=z.acc; g.fillText(z.en,x,y+24); } });
  const [sx,sy]=mpt(SEAL), b=.5+.5*Math.sin(t*5); g.fillStyle=`rgba(226,81,63,${.5+.5*b})`; g.beginPath(); g.arc(sx,sy,5+2*b,0,TAU); g.fill();
  g.strokeStyle=`rgba(226,81,63,${.6*(1-b)})`; g.lineWidth=2; g.beginPath(); g.arc(sx,sy,9+10*(1-b),0,TAU); g.stroke(); }
function zmapPick(cv,e){ if(!ZM) return -1; const r=cv.getBoundingClientRect(), x=Math.floor((e.clientX-r.left)/r.width*MW), y=Math.floor((e.clientY-r.top)/r.height*MH);
  const [sx,sy]=mpt(SEAL); if((x-sx)**2+(y-sy)**2<18*18) return 'seal'; return ZM.lab[y*MW+x]??-1; }

let lastBg=0;
function menuVisible(){ return (G.mode==='menu'||(window.PF&&PF.win&&PF.win.cur))&&A.menuEl.classList.contains('on')&&bgBox.isConnected; }
function paintMenu(t){ drawFx(t/1000,scr);
  for(const c of A.menuEl.querySelectorAll('canvas[data-hero]')) drawPortrait(c,c.dataset.hero,t/1000);
  for(const c of A.menuEl.querySelectorAll('canvas[data-zmap]')) drawZmap(c,t/1000); }
(function loop(t){ if(G.frame&&G.frame.runMenuAnimation) return G.frame.runMenuAnimation(menuVisible,paintMenu,floorSwap);
  requestAnimationFrame(loop); floorSwap(); if(!menuVisible()||t-lastBg<33) return; lastBg=t; paintMenu(t); })(0);

// ============================================================ zone result: credits, gear, Leon's record (surv.js finish() hands over through G.hubResult)
// the payment alone, no screen (frame/field.js settles a hunting field with it). D: what the zone map's caches hold, G.dun.result() unless given
function settle(o,D=G.dun&&G.dun.result()){ const tb=1+stat('t')/100; let gold, item=null, sold=0;
  if(o.win){ const base=G.frame&&window.PF?.economy?PF.economy.victory(o.ch,o.kills,o.first):60*(o.ch+1)+o.kills*.6;
    gold=Math.round(base*tb); item=newItem(tierOf(o.ch),rollRar(o.ch,o.first)); }
  else { gold=Math.round(30*(o.ch+1)*Math.min(1,(D?D.nodes/3:o.t/300))*tb+o.kills*.2); if((D?D.nodes>0:o.t>90)&&Math.random()<.35) item=newItem(tierOf(o.ch),0); }
  /* the zone map's caches: their credits, and gear found on the way */
  if(D){ gold+=Math.round(D.gold*tb); for(let i=0;i<D.loot&&H.stash.length<BAG;i++){ H.stash.push(newItem(tierOf(o.ch),D.lootR?D.lootR[i]:rollRar(o.ch,false))); H.fresh=(H.fresh||0)+1; } }
  H.gold+=gold; if(item){ if(H.stash.length<BAG){ H.stash.push(item); H.fresh=(H.fresh||0)+1; } else { sold=sellOf(item); H.gold+=sold; } }
  restock(); hsave(); return {gold,item,sold,D}; }
G.hubResult=o=>{ const {gold,item,sold,D}=settle(o);
  const Z=ZONES[o.ch], el=o.el, rec=Math.min(7,SV().chClear||0); el.classList.add('hubr');
  el.innerHTML=`<div class="hub"><div class="hres panel"><div class="c1"><span class="hk" style="color:${o.win?AM:RD}">${o.win?'ZONE '+zno(o.ch)+' · SUBDUED':'SIGNAL LOST'}</span><h2 class="${o.win?'w':'l'}">${o.win?'구역 제압':'신호 소실'}</h2>
    <div class="sub">${Z.no}구역 · ${Z.name} · ${D?`${mmss(D.el)} · 노드 ${D.nodes}/${D.total} · 보급 ${D.chests}/${D.chestsN}`:mmss(o.t)+' 생존'}${o.win?' · '+Z.king+' 제압':''}${!D&&!o.win&&Math.round(o.t)>o.prev?' · 최고 기록':''}</div>
    ${o.win&&o.first?`<div class="sync"><div style="display:flex;justify-content:space-between"><span>레온의 기록 동기화</span><b style="font-family:${MONO};color:${AM}">${rec} / 7</b></div>${seg(rec)}${o.next?`<span class="mut" style="font-weight:400">${ZONES[o.ch+1].no}구역 신호가 열렸다 — ${ZONES[o.ch+1].name}</span>`:''}</div>`:''}
    <div class="grid"><div><small>처치</small><b>${o.kills}</b></div><div><small>입힌 피해</small><b>${S.fmtN(Math.round(o.dmg))}</b></div><div><small>경험치</small><b>+${o.exp}</b></div><div><small>크레딧</small><b class="cr">+${gold+sold}</b></div></div></div><div class="c2">
    ${item?`<span class="hk">${sold?'보관함이 가득 차 분해함':'RECOVERED GEAR'}</span><div class="loot row panel" style="padding:10px 12px">${itemCard(item)}</div>`:''}
    <div class="sub">${NAMES[pl.cls]} LV ${SV().lv} · 스킬 포인트 ${SV().sp}</div>
    <div class="bt">${o.next?`<button class="btn pri wide" data-r="next">다음 구역 · ${ZONES[o.ch+1].name}<small>NEXT ZONE</small></button>`:''}<button class="btn ${o.next?'':'pri'}" data-r="again">재진입<small>RE-ENTER</small></button><button class="btn" data-r="town">기지로 귀환<small>RETURN</small></button></div></div></div></div>`;
  setTimeout(()=>{ if(G.mode==='surv') el.classList.add('on'); },o.win?1400:900);
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ const r=b.dataset.r; el.classList.remove('hubr');
    if(r==='again') o.again(); else if(r==='next') o.go(o.ch+1); else { scr='town'; A.toMenu(); } }); };

// pause: same dress, and extracting returns to base
{ const p=document.getElementById('rpause'); if(p){ p.innerHTML=`<div class="hub"><div class="hp panel"><span class="hk">PAUSED · LINK HELD</span><h2>일시 정지</h2><div class="rule"></div><div class="bt"><button class="btn pri" data-p="go">재개<small>RESUME</small></button><button class="btn" data-p="quit">기지로 철수<small>EXTRACT · 보상 없음</small></button></div></div></div>`;
  p.querySelector('[data-p=go]').onclick=()=>A.setPause(false); p.querySelector('[data-p=quit]').onclick=()=>{ scr='town'; A.toMenu(); }; } }

// after a run the menu opens on the base
{ const tm=A.toMenu; A.toMenu=G.api.toMenu=function(){ if(booted) scr='town'; return tm.apply(this,arguments); }; }
G.hub={get H(){ return H; },get scr(){ return scr; },get qSel(){ return qSel; },go,newItem,rollRar,RAR,stat,settle,restock,ZONES,drawOpticTarget:drawResident,save:hsave,reset(){ H=freshH(); restock(); hsave(); }};
// zone maps (dun.js) and skill colours (chroma.js) build on surv.js, which this file loads before
for(const f of ['dun','chroma']){ const sc=document.createElement('script'); sc.src=f+'.js?v=2'; document.head.appendChild(sc); }
if(G.mode==='menu') A.menuRender();
})();
