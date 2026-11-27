// 숨은 자리 (설계 9장, 17.1): 자료(frame/data/secrets.js)로 정의한 흔적·숨은 던전·숨은 구역, 그리고 dun.js 구역 지도의 상자·기록 단말을 "숨은 곳"으로 센다.
// 흔적은 언제나 열리고, 숨은 던전·숨은 구역은 깬 구역에서만 들어간다(그 전에는 닫힌 통로). 들어가면 작은 방(room.js)으로 옮기고, 끝나면 들어간 자리로 돌아온다.
// 찾은 것은 story.found에 처음 한 번만 적는다. 보상은 흔적이면 들어올 때마다 다, 던전·숨은 구역은 처음 다 주고 다음부터 일부(자료의 repeat).
// 지도 창(구역 고르기)의 고른 구역 옆에 "숨은 곳 찾은 수 / 전체 수".
// 순수 부분(usable, count, builtinId, reward)은 node 시험(frame/test/secret.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 data/secrets 다음에 붙인다
(function(){
'use strict';
// 지금 열 수 있는가: 조건(found)이 안 찼으면 보이지 않고, 흔적이 아니면 구역을 깬 뒤에만 열린다
function usable(s,ctx){ const o=s.open||{}, f=ctx.found||{};
  if(o.type==='found'&&!(o.ids||[]).every(id=>f[id])) return 'hidden';
  return s.kind==='trace'||ctx.zoneCleared?'open':'locked'; }
// dun.js 지도의 상자·기록 단말 자리의 id. 구역 번호로 짓는다(구역 7은 ch 6 지도를 빌리지만 기록은 따로)
const builtinId=(zone,type,i)=>'z'+zone+'_'+type+i;
// 한 구역의 찾은 수 / 전체 수: 자료의 자리 + 지도의 기본 자리(builtin개)
function count(list,zone,found,builtin){ const f=found||{}, mine=list.filter(s=>s.zone===zone), re=new RegExp('^z'+zone+'_(chest|log)\\d+$');
  const b=Object.keys(f).filter(k=>f[k]&&re.test(k)).length;
  return {found:mine.filter(s=>f[s.id]).length+Math.min(builtin,b),total:mine.length+builtin}; }
// 보상 크레딧: 처음(발견 기록이 처음 적힐 때)은 다, 다음부터는 credits×repeat(반올림). repeat가 없으면(흔적) 늘 다
const reward=(s,first)=>{ const k=s.content||{}, c=k.credits||0; return first||k.repeat==null?c:Math.round(c*k.repeat); };
const S={usable,builtinId,count,reward};

// ---- 브라우저: boot.js가 field, story 다음에 붙인다. 전역 update, drawBackground_prep, applyCam, ctx, pl, lock, RT(index.html)를 쓴다
if(typeof window!=='undefined'&&window.RPG){
  const G=RPG, A=G.api, V=G.sv.V, FSY=G.sv.FSY, PF=window.PF;
  const AM='#EBA74E', RD='#E2513F', KR='"Noto Sans KR","Malgun Gothic",sans-serif';
  // 지점 이름(임시), 지점 반경(흔적, 포탈·닫힌 통로), 숨은 던전의 보스가 쓰러진 뒤 돌아가기까지(초)
  const LABEL={trace:'임시 흔적',dungeon:'임시 숨은 던전',zone:'임시 숨은 구역'}, LOCKED='잠긴 통로', R_TRACE=120, R_GATE=200, CLEAR_T=1.2;
  const LOCK_BARK={text:'구역을 제압한 뒤 다시 올 수 있습니다'};
  const story=()=>PF.save.data.story;
  const found=()=>{ const s=story(); return s.found||(s.found={}); };
  const byId=id=>PF.SECRETS.find(s=>s.id===id);
  const busy=()=>PF.story.busy();
  // 숨은 구역의 임시 장면: story.js는 장면을 화 자료(PF.EP)에서만 찾으므로 자료의 장면 화를 붙인다.
  // 화 번호 100 이상만 붙인다: 1~8은 사냥터의 화(story.js가 구역+1로 찾아 도입·대면·마무리를 사냥터 사건에 쓴다)라 숨은 곳의 장면이 섞이면 안 된다
  for(const e of PF.SECRET_EP||[]) if(e.ep>=100&&!PF.EP.some(x=>x.ep===e.ep)) PF.EP.push(e);

  // 방 안의 시간 자리에 방 이름을 쓴다(글자가 길어 작게). 지도 창의 "숨은 곳"은 고른 구역 이름 옆
  const css=document.createElement('style'); css.id='pfsecret'; css.textContent=`
body.pf-secret #shud .tm{font:700 19px ${KR}!important;letter-spacing:.03em}
.hub .zinfo .big .pf-found{margin-left:auto;font:600 12px ${KR};color:#9AA6A2;white-space:nowrap}
.hub .zinfo .big .pf-found b{font:700 13px ${KR};color:${AM};text-shadow:none}`;
  document.head.appendChild(css);
  const tm=document.querySelector('#shud .tm'), bbName=document.querySelector('#shud .bb small');

  // 이번 판(RPG.frame.run)에서 이미 쓴 흔적. 판이 바뀌면(마을·구역에 다시 들어오면) 다시 쓸 수 있다.
  // ver: 자리 상태가 바뀔 수 있는 일(흔적을 씀, 발견 기록)마다 올린다(사냥터 자리를 그때만 다시 건다)
  let usedRun=null, used={}, ver=0;
  const usedNow=()=>{ if(usedRun!==G.frame.run){ usedRun=G.frame.run; used={}; } return used; };
  // 지금 판에서 그 자리의 상태. 던전·숨은 구역은 그 구역을 깬 사냥터에서만 열린다(들어가기는 사냥터에서만 되므로
  // 방·마을의 목록에 꽂힌 자리는 흔적만 열리고, 그 밖의 종류는 깬 상태와 상관없이 닫힌 통로)
  function stateOf(s){ const r=G.frame.run;
    return usedNow()[s.id]?'hidden':usable(s,{zoneCleared:!!(r&&r.kind==='field'&&r.zone===s.zone&&!r.first),found:found()}); }
  // 자리를 지점으로. o는 좌표의 기준(구역 지도의 시작점, 방이면 0,0). 닫힌 통로는 표식 지점에 바닥의 닫힌 문(drawLocked)
  function spotOf(s,u,o){ const x=o.x+s.x, y=o.y+s.y, act='secret:'+s.id;
    if(s.kind==='trace') return {id:s.id,kind:'trace',x,y,r:R_TRACE,label:LABEL.trace,act};
    if(u==='locked') return {id:s.id,kind:'mark',x,y,r:R_GATE,label:LOCKED,act,locked:true};
    return {id:s.id,kind:'portal',x,y,r:R_GATE,label:LABEL[s.kind],act}; }

  // ---- 지점 연결: 'secret:<id>' 지점은 누가 꽂았든(사냥터·마을) 여기서 받는다(spots.js는 목록마다 받는 쪽이 하나).
  // 방 자료에 꽂힌 이름 없는 자리(마을의 town_t1)는 자료와 지금 상태(stateOf)대로 채우고, 이번 판에 쓴 흔적이나 보이지 않는 자리는 뺀다
  const set0=PF.spots.set;
  PF.spots.set=function(l,fn){ const L=[];
    for(const p of l){ const m=/^secret:(.+)$/.exec(p.act||''), s=m&&byId(m[1]);
      if(!s){ L.push(p); continue; }
      const u=stateOf(s);
      if(u!=='hidden') L.push(spotOf(s,u,{x:0,y:0})); }
    return set0.call(this,L,p=>{ const m=/^secret:(.+)$/.exec(p.act||''); if(m) use(m[1]); else if(fn) fn(p); }); };
  let lockT=-9;
  function use(id){ const s=byId(id); if(!s) return;
    if(s.kind==='trace') return trace(s);
    const u=stateOf(s);
    if(u==='open') S.enter(id);
    else if(u==='locked'&&RT-lockT>3.5){ lockT=RT; PF.story.bark(LOCK_BARK); } }
  // 흔적: 보상(들어올 때마다 다), 처음이면 발견 기록, 대사. 이번 판에는 다시 누를 수 없다
  function trace(s){ const k=s.content||{}, u=usedNow(), f=found(); if(u[s.id]) return; u[s.id]=1; ver++;
    const c=reward(s,!f[s.id]);
    if(c){ G.hub.H.gold+=c; V.nums.push({x:pl.x,y:pl.gy-260,t:-.2,txt:'+'+c+' 크레딧',heal:true}); }
    if(!f[s.id]) f[s.id]=1;
    PF.save.commit();
    PF.spots.remove(s.id);
    if(k.bark) PF.story.bark(k.bark); }

  // ---- 사냥터: 이 판의 지도가 보이면 자리를 걸고(상태가 바뀌면 다시), 상자·기록 단말이 처음 열리거나 읽히면 적는다(보상은 dun.js가 준다).
  // fr {run,M,o:시작점,list:이 구역의 자리,cid·lid:상자·기록 단말 id,first,ver}: 판마다 한 번 만들고, 매 화면은 새로 만드는 것 없이 본다.
  // 자리는 깬 상태(run.first)나 ver가 바뀐 화면에만 다시 건다. note: 숨은 곳에서 돌아온 알림(돌아온 구역의 지도가 생기면 띄운다)
  let fr=null, note=null;
  function fieldTick(){ const r=G.frame.run, M=G.dun.M;
    if(!(r&&r.kind==='field'&&M&&M.ch===r.ch&&PF.place.cur==='field')){ fr=null; return; }
    if(!fr||fr.run!==r||fr.M!==M){ const st=M.plazas.find(p=>p.k==='start');
      fr={run:r,M,o:{x:st.x,y:st.y},list:PF.SECRETS.filter(s=>s.zone===r.zone),
        cid:M.chests.map((c,i)=>builtinId(r.zone,'chest',i)),lid:M.logs.map((l,i)=>builtinId(r.zone,'log',i)),first:null,ver:-1};
      if(note){ M.msg={t:note.t,sub:'',c:note.c,t0:RT}; note=null; } }
    const f=found(); let n=0;
    for(let i=0;i<fr.cid.length;i++) if(M.chests[i].open&&!f[fr.cid[i]]){ f[fr.cid[i]]=1; n++; }
    for(let i=0;i<fr.lid.length;i++) if(M.logs[i].read&&!f[fr.lid[i]]){ f[fr.lid[i]]=1; n++; }
    if(n){ ver++; PF.save.commit(); }
    if(fr.first===r.first&&fr.ver===ver) return;
    fr.first=r.first; fr.ver=ver;
    for(const s of fr.list){ const v=stateOf(s); if(v==='hidden') PF.spots.remove(s.id); else PF.spots.add(spotOf(s,v,fr.o)); } }

  // ---- 숨은 던전·숨은 구역: 사냥터를 정산하고 닫은 뒤 방으로. cur {s,back:{zone,ch,at},want,done,doneT,reading}. want: 궁극기가 끝나면 할 나가기
  let cur=null;
  const quit=document.querySelector('#rpause [data-p=quit]'), quitH=quit&&quit.innerHTML, q0=quit&&quit.onclick;
  if(quit) quit.onclick=function(e){ if(cur){ A.setPause(false); S.exit('quit'); return; } return q0?q0.call(this,e):undefined; };
  function left(){ cur=null; if(quit) quit.innerHTML=quitH; }
  function roomSpot(p){ const c=cur; if(!c) return;
    if(p.act==='portal:back') S.exit('quit');
    else if(p.act==='read'&&!c.reading){ c.reading=true; PF.spots.remove(p.id);
      PF.story.play(c.s.content.scene).then(()=>{ if(cur===c) S.exit('clear'); }); } }
  // 깬 구역에서 열린 자리만
  S.enter=function(id){ const s=byId(id), r=G.frame.run, k=s&&s.content;
    if(cur||!k||!k.room||busy()||!(r&&r.kind==='field'&&r.zone===s.zone&&PF.place.cur==='field')) return false;
    if(stateOf(s)!=='open') return false;
    const back={zone:r.zone,ch:r.ch,at:{x:pl.x,y:pl.gy}};
    // 사냥터를 닫는 leave 사건에 {via:'secret'}이 붙는다(돌아오는 enter에는 {resume:true}): 한 판으로 세는 쪽(balance.js 등)이 가른다
    PF.field.via='secret';
    try{ G.survEnd(); } finally{ PF.field.via=null; }
    G.frame.run={kind:'secret',id,zone:back.zone,ch:back.ch};
    PF.place.go('secret');
    cur={s,back,want:null,done:false,doneT:0,reading:false};
    PF.room.enter(k.room,{ch:back.ch,onSpot:roomSpot,onClear(){ if(cur&&!cur.done){ cur.done=true; cur.doneT=RT; } },onLeave:left});
    if(quit) quit.innerHTML='돌아가기<small>RETURN · 보상 없음</small>';
    return true; };
  // 모아 둔 경험치(surv.js가 0.5초마다 담는 V.acc)를 담는다. 제압이면 바닥에 남은 젬도
  function bank(sweep){ if(sweep){ for(const g of V.gems) V.acc+=g.v; V.gems.length=0; } if(V.acc>0){ A.gainExp(V.acc); V.run+=V.acc; V.acc=0; } }
  // 나가기: clear는 보상(처음은 다, 다음부터 repeat 몫)과 발견 기록, quit(돌아가기 포탈·일시정지 창)과 down(쓰러짐)은 보상 없이.
  // 모두 들어간 구역의 들어간 자리로(resume: 같은 판을 이어 간다, 못 가면 마을로). 진행(story.cleared, SV.chClear)은 건드리지 않는다. 궁극기 중이면 끝난 뒤에
  S.exit=function(how){ const c=cur; if(!c) return false;
    if(busy()){ c.want=how; return false; }
    const s=c.s, b=c.back, f=found();
    bank(how==='clear');
    note=how==='down'?{t:'쓰러짐 · 숨은 곳에서 돌아왔습니다',c:RD}:null;
    if(how==='clear'){ const g=reward(s,!f[s.id]); G.hub.H.gold+=g; if(!f[s.id]){ f[s.id]=1; ver++; } note={t:`${LABEL[s.kind]} · 크레딧 +${g}`,c:AM}; }
    PF.save.commit();
    if(PF.field.enter(b.zone,{at:b.at,resume:true})) return true;
    note=null; G.survEnd(); PF.place.go('town'); return true; };
  // 방 안의 쓰러짐은 결과 창 대신 나가기(field.js의 갈고리를 감싼다). 나가기는 갱신이 끝난 뒤에 한다
  const of0=G.frame.onFinish;
  G.frame.onFinish=function(win){ const r=G.frame.run;
    if(r&&r.kind==='secret'){ if(!win&&cur&&!cur.done&&!cur.want) cur.want='down'; return true; }
    return of0?of0.apply(this,arguments):false; };
  // 매 화면(안쪽 갱신 뒤): 방이면 HUD 이름, 보스가 쓰러지고 CLEAR_T 뒤 제압(그동안 무적), 체력 0이면 쓰러짐. 사냥터면 자리와 발견 기록
  function roomTick(){ const c=cur; if(G.mode!=='surv'||G.paused) return;
    if(tm) tm.textContent=LABEL[c.s.kind];
    if(bbName&&V.boss) bbName.textContent='중간 보스 (임시)';
    if(c.done) G.inv=Math.max(G.inv,.1);
    if(!c.want){ if(c.done&&RT-c.doneT>=CLEAR_T) c.want='clear'; else if(!c.done&&G.hp<=0) c.want='down'; }
    if(c.want&&!busy()) S.exit(c.want); }
  const u0=update; update=function(rdt){ u0(rdt); if(cur) roomTick(); else fieldTick(); };

  // ---- 닫힌 통로: 바닥의 어두운 고리와 붉은 빗장(구역 지도 바닥 위, 영웅·적 아래). 그 위에 표식 지점이 떠 있다
  function drawLocked(p){ const x=p.x, y=p.y, r=150, ry=r*FSY;
    ctx.fillStyle='rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(x,y,r+24,ry+14,0,0,TAU); ctx.fill();
    ctx.strokeStyle='rgba(150,165,170,.55)'; ctx.lineWidth=6; ctx.setLineDash([24,18]); ctx.beginPath(); ctx.ellipse(x,y,r,ry,0,0,TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle='rgba(226,81,63,.55)'; ctx.lineWidth=9; ctx.beginPath(); ctx.moveTo(x-r*.6,y-ry*.6); ctx.lineTo(x+r*.6,y+ry*.6); ctx.moveTo(x+r*.6,y-ry*.6); ctx.lineTo(x-r*.6,y+ry*.6); ctx.stroke(); }
  const prep0=drawBackground_prep; drawBackground_prep=function(){ prep0(); if(G.mode!=='surv') return;
    const L=PF.spots.list.filter(p=>p.locked); if(!L.length) return;
    applyCam(ctx); for(const p of L) drawLocked(p); ctx.setTransform(1,0,0,1,0,0); };

  // ---- 지도 창(구역 고르기): 고른 구역 이름 옆에 "숨은 곳 찾은 수 / 전체 수". 무엇이 어디에 남았는지는 보이지 않는다. 봉인 줄은 구역 7이 열렸을 때만
  const mo=G.menuOverride;
  G.menuOverride=function(el){ const r=mo.apply(this,arguments); if(G.hub.scr==='quest') mapLine(el); return r; };
  function mapLine(el){ const q=G.hub.qSel, zone=q==='seal'?PF.field.COUNT-1:q, big=el.querySelector('.zinfo .big');
    if(!big||!Number.isInteger(zone)||PF.field.state(story().cleared,zone)==='locked') return;
    const c=count(PF.SECRETS,zone,found(),PF.SECRET_BUILTIN), d=document.createElement('span'); d.className='pf-found';
    d.innerHTML=`숨은 곳 <b>${c.found} / ${c.total}</b>`; big.appendChild(d); }

  Object.defineProperty(S,'cur',{get:()=>cur&&cur.s.id});
  PF.secret=S;
}

if(typeof module!=='undefined') module.exports=S;
})();
