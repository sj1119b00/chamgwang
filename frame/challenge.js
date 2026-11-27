// 도전 (설계 6.3, 10장): 깬 구역마다 높은 난이도·왕 재대결·끝없이 버티기. 본편(화 진행 chClear·story.cleared, 옛 기록 best)은 건드리지 않고,
// 결과 창(hub.js 결과 창의 모양)에서 도전 보상만 주고 도전 기록(best2)을 쓴다. 보상형 광고 자리(ads.js)는 도전에서만: 쓰러졌을 때 한 번 부활, 결과 창의 보상 2배.
// 순수 부분(KINDS, HARD, reward, better)은 node 시험(frame/test/challenge.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 ads 다음에 붙인다
(function(){
'use strict';
const KINDS=['hard','rematch','endless'];
// 높은 난이도의 배율(임시값): 밸런스 표가 정한 몹 체력·공격력에 곱한다
const HARD={hp:1.8,dmg:1.5};
// 보상 크레딧(임시 공식). r: {win, t(초)}. 진 높은 난이도·재대결은 0, 끝없이 버티기는 버틴 시간에 비례
function reward(kind,ch,r){ const k=ch+1;
  if(kind==='endless') return Math.floor(r.t/30)*20*k;
  if(!r.win) return 0;
  return kind==='hard'?300*k:kind==='rematch'?150*k:0; }
// 새 기록: 끝없이 버티기는 가장 긴 시간, 나머지는 가장 짧은 승리 시간. 기록이 없으면 undefined
function better(kind,prev,r){
  if(kind==='endless') return prev===undefined?r.t:Math.max(prev,r.t);
  if(!r.win) return prev;
  return prev===undefined?r.t:Math.min(prev,r.t); }
const C={KINDS,HARD,reward,better};

// ---- 브라우저: boot.js가 balance, ads 다음에 붙인다. 전역 update, pl, lock, parts, stamp, slow, timeScale, slowHold, RT(index.html)를 쓴다
if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, X=G.sv, V=X.V, PF=window.PF, F=PF.field, B=PF.balance;
  const AM='#EBA74E', RD='#E2513F', HC='#7FF3FF';
  const NAME={hard:'높은 난이도',rematch:'왕 재대결',endless:'끝없이 버티기'}, EN={hard:'HARD MODE',rematch:'KING REMATCH',endless:'ENDLESS'};
  // 부활 뒤 무적(초), 끝없이 버티기에서 왕이 쓰러진 뒤 다시 나오기까지(초), 판이 끝나고 창이 뜨기까지(밀리초, hub.js 결과 창과 같다)
  const REV_INV=2, BOSS_GAP=240, SHOW={win:1400,lose:900};
  const resEl=document.getElementById('sres'), joy=document.getElementById('sjoy'), tm=document.querySelector('#shud .tm');
  const quit=document.querySelector('#rpause [data-p=quit]'), quitH=quit&&quit.innerHTML, q0=quit&&quit.onclick;
  const story=()=>PF.save.data.story, best2=()=>PF.save.data.best2;
  // 기록 열쇠는 구역 번호(구역 7은 장 6을 빌리지만 기록은 따로)
  const key=(kind,zone)=>kind+':'+pl.cls+':'+zone;
  // 광고를 기다리는 가장 긴 시간(밀리초). 어떤 보상형 광고보다 길다. 시험에서 줄인다
  C.adWait=90000;
  // 터치 기기에서 전체 화면·가로 고정(field.js 출발 버튼과 같다)
  function goFull(){ if(!A.isTouch()) return; const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen) d.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})).catch(()=>{}); }
  const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
  const zname=z=>{ const Zs=G.hub.ZONES; return z<Zs.length?Zs[z].no+'구역 · '+Zs[z].name:'마지막 화 (임시)'; };
  const recText=(kind,v)=>v===undefined?'기록 없음':(kind==='endless'?'최장 ':'최단 ')+mmss(v);
  const banner=t=>{ for(const p of parts) if(p.k==='banner') p.en=t; };
  // 그 구역의 표(balance.js)가 도전 판에도 머문다
  B.kinds.push(...KINDS);
  // 지금 도전 {kind,zone,ch,run,state:'run'|'offer'|'result',revived,doubled,pay,stale,M,bossT,t,el,win}. 도전이 아니면 null
  let cur=null, entering=false;

  // ---- 시작: 깬 구역만, 마을에서만. 표를 먼저 건다(전투가 처음 뿌리는 적도 표 값). 깬 구역이라 경험치 25%, 끝없이 버티기는 시간에 따른 증가를 켠 채로
  C.start=function(kind,zone){
    if(!KINDS.includes(kind)||!Number.isInteger(zone)||zone<0||zone>=F.COUNT||F.state(story().cleared,zone)!=='cleared') return false;
    if(cur||lock||PF.place.cur!=='town'||!PF.place.can('town',kind)||PF.story.cur||!X.CLS[pl.cls]) return false;
    const ch=F.chOf(zone), run={kind,zone,ch};
    PF.win.close();
    B.apply(zone,{repeat:true,flat:kind!=='endless'});
    if(kind==='hard') B.scale={hp:HARD.hp,dmg:HARD.dmg};
    G.frame.run=run; PF.place.go(kind);
    cur={kind,zone,ch,run,state:'run',revived:false,doubled:false,stale:G.dun.M,M:null,bossT:null,t:0,el:null,win:false};
    entering=true; try{ G.survStart(ch); } finally{ entering=false; }
    if(kind==='endless'){ V.endless=true; banner('끝없이 버티기 · 쓰러질 때까지'); }
    if(quit) quit.innerHTML='마을로<small>RETURN · 보상 없음</small>';
    return true; };
  // 마을로(결과 창의 버튼, 일시정지 창의 나가기): 판을 닫고(아래 survEnd 감싸기가 정리한다) 마을
  C.leave=function(){ if(!cur) return false; G.survEnd(); PF.place.go('town'); return true; };
  // 정리: 표를 되돌리고(balance.js restore) 판을 지운다. 전투를 끝내거나 새로 여는 모든 길(마을로, toMenu, 창 안의 모의 전투)이 여기를 지난다
  function clean(){ const c=cur; if(!c) return; cur=null;
    B.restore(); V.endless=false; resEl.classList.remove('hubr');
    if(G.frame.run===c.run) G.frame.run=null;
    if(quit) quit.innerHTML=quitH; }
  const se=G.survEnd; G.survEnd=function(){ if(cur) clean(); return se.apply(this,arguments); };
  const ss=G.survStart; G.survStart=function(){ if(cur&&!entering) clean(); return ss.apply(this,arguments); };
  if(quit) quit.onclick=function(e){ if(cur){ A.setPause(false); C.leave(); return; } return q0?q0.call(this,e):undefined; };

  // ---- surv.js finish()의 갈고리(secret.js → field.js 앞): 도전 판만 받고 나머지는 앞 갈고리로. 도전에서는 finish 본문(옛 기록 best, 화 진행 chClear,
  // 첫 클리어 경험치, hub.js 정산)이 돌지 않는다. 끝없이 버티기는 시간이 다 되어도(300초) 이어진다
  const of0=G.frame.onFinish;
  G.frame.onFinish=function(win){ const r=G.frame.run;
    if(!(cur&&r===cur.run)) return of0?of0.apply(this,arguments):false;
    if(r.kind==='endless'&&win) return true;
    if(cur.state==='run') over(win);
    return true; };
  // surv.js finish()의 첫 부분(V.over=true; joyHide(); G.keys={}; V.acc 담기; stamp CLEAR / slow + stamp 다운)과 같은 일. 그 뒤(best·chClear·첫 클리어 경험치·hubResult 정산)는 하지 않는다.
  // 판이 끝남: finish가 하던 화면 일(멈춤, 조이스틱·키, 모아 둔 경험치, 글자)만 한다. 시간은 지도(dun.js M.el, 멈춘 동안 늘지 않음), 끝없이 버티기는 V.t.
  // 쓰러졌고 이 판에서 아직 부활하지 않았고 광고 스위치가 켜져 있으면 부활 제안, 아니면 결과 창
  function over(win){ const c=cur, M=c.M;
    V.over=true; V.joy=null; if(joy) joy.classList.remove('act'); G.keys={};
    if(V.acc>0){ A.gainExp(V.acc); V.run+=V.acc; V.acc=0; }
    c.win=!!win; c.el=M?M.el:null; c.t=M?M.el:V.t;
    if(win) stamp('CLEAR',{x:.5,y:.4,size:.14,life:1.6,c:'#ffcf4a'}); else { slow(.25,.8); stamp('다운',{x:.5,y:.4,size:.14,life:1.4,c:'#ff4a5a'}); }
    if(!win&&!c.revived&&PF.ads.enabled) offer(c); else result(c,win?SHOW.win:SHOW.lose); }
  // 창을 ms 뒤에 보인다. 그사이 판이 바뀌었으면(부활, 결과 창으로 넘어감, 마을로) 보이지 않는다
  function later(c,ms){ const st=c.state;
    if(!ms) resEl.classList.add('on');
    else setTimeout(()=>{ if(cur===c&&c.state===st&&G.mode==='surv') resEl.classList.add('on'); },ms); }
  // 광고는 이 한 곳으로 부른다. 예외·거절·true가 아닌 값, 그리고 C.adWait 안에 답이 없으면(열린 광고 창은 닫는다) 모두 false(보상 없음). 답은 한 번만 받는다
  const ask=slot=>new Promise(res=>{ let tid=0, done=false;
    const fin=v=>{ if(done) return; done=true; clearTimeout(tid); res(v===true); };
    // 광고 창 닫기(cancel)가 던져도 답(false)은 낸다: 답이 없으면 부활 제안·결과 창의 버튼이 꺼진 채 굳는다
    tid=setTimeout(()=>{ console.warn('frame/challenge.js: 광고('+slot+')가 '+C.adWait+'ms 안에 답하지 않아 보상 없이 진행한다'); try{ if(PF.ads.cancel) PF.ads.cancel(); } finally{ fin(false); } },C.adWait);
    new Promise(r=>r(PF.ads.show(slot))).then(fin,e=>{ console.warn('frame/challenge.js: 광고('+slot+')가 실패해 보상 없이 진행한다',e); fin(false); }); });

  // ---- 광고 자리 1: 부활 제안. 받으면 그 자리에서 다시, 그만하기·광고를 끝까지 안 봄·실패면 결과 창
  function offer(c){ c.state='offer'; resEl.classList.add('hubr');
    resEl.innerHTML=`<div class="hub"><div class="hres panel pf-rev"><span class="hk" style="color:${RD}">${EN[c.kind]} · SIGNAL LOST</span><h2 class="l">쓰러짐</h2>
      <div class="sub">${zname(c.zone)} · ${NAME[c.kind]} · ${mmss(Math.round(c.t))}</div><div class="sub">광고를 끝까지 보면 이 자리에서 체력이 가득 찬 채 다시 일어납니다 (이 판에 한 번)</div>
      <div class="bt"><button class="btn pri" type="button" data-r="revive">광고 보고 한 번 부활<small>REWARDED AD</small></button><button class="btn" type="button" data-r="stop">그만하기<small>결과 보기</small></button></div></div></div>`;
    later(c,SHOW.lose);
    const bs=[...resEl.querySelectorAll('[data-r]')];
    for(const b of bs) b.onclick=e=>{ e.stopPropagation(); if(cur!==c||c.state!=='offer'||b.disabled) return; for(const x of bs) x.disabled=true;
      if(b.dataset.r==='stop') return result(c,0);
      ask('revive').then(ok=>{ if(cur!==c||c.state!=='offer') return; if(ok) revive(c); else result(c,0); }); }; }
  // 부활: over가 바꾼 것(멈춤, 느려진 시간, 창)을 되돌리고, 광고를 보는 동안 흐른 지도 시간도 되돌린다. 쓰러진 자리에서 체력 가득, 무적 REV_INV초
  function revive(c){ c.revived=true; c.state='run';
    resEl.classList.remove('on','hubr'); resEl.innerHTML='';
    V.over=false; timeScale=1; slowHold=0; if(c.M&&c.el!=null) c.M.el=c.el;
    G.hp=A.maxHp(); G.inv=REV_INV; }
  function result(c,ms){ c.state='result';
    G.hubResult({win:c.win,t:c.t,ch:c.ch,kills:V.kills,el:resEl});
    later(c,ms); }

  // ---- 결과 창: hub.js 결과 창(G.hubResult)을 감싼다. 도전 판이면 hub.js 정산 대신 도전 보상만 크레딧에, 도전 기록(best2)을 고쳐 쓰고 같은 모양의 창.
  // 광고 자리 2: 스위치가 켜져 있고 보상이 있으면 "광고 보고 보상 2배"(끝까지 보면 같은 금액을 한 번 더, 버튼은 사라진다)
  const hr0=G.hubResult;
  G.hubResult=function(o){ const c=cur; if(!(c&&G.frame.run===c.run)) return hr0.apply(this,arguments); return show(c,o); };
  // 지급과 기록은 한 판에 한 번(c.pay): 다시 그려도 같은 값으로 그리고 더 주지 않는다. 반올림한 초 하나로 보상·기록·표시를 함께 정한다
  function show(c,o){ const el=o.el, win=!!o.win;
    if(!c.pay){ const t=Math.round(o.t), gold=reward(c.kind,c.ch,{win,t}), k=key(c.kind,c.zone), prev=best2()[k], rec=better(c.kind,prev,{win,t});
      c.pay={t,gold,prev,rec}; G.hub.H.gold+=gold; if(rec!==undefined) best2()[k]=rec; PF.save.commit(); }
    const {t,gold,prev,rec}=c.pay, good=win||c.kind==='endless', ad=PF.ads.enabled&&gold>0&&!c.doubled;
    el.classList.add('hubr');
    el.innerHTML=`<div class="hub"><div class="hres panel"><div class="c1"><span class="hk" style="color:${good?HC:RD}">${EN[c.kind]} · ${win?'CLEAR':good?'RECORD':'SIGNAL LOST'}</span>
      <h2 class="${good?'w':'l'}">${NAME[c.kind]}</h2>
      <div class="sub">${zname(c.zone)} · ${win?'성공':'쓰러짐'}${rec!==undefined&&rec!==prev?' · <b style="color:'+AM+'">새 기록</b>':''}</div>
      <div class="grid"><div><small>시간</small><b>${mmss(t)}</b></div><div><small>보상</small><b class="cr" data-pf="gold">+${c.doubled?gold*2:gold}</b></div><div><small>${c.kind==='endless'?'최장 기록':'최단 기록'}</small><b>${rec===undefined?'-':mmss(rec)}</b></div><div><small>처치</small><b>${o.kills}</b></div></div></div>
      <div class="c2"><div class="sub">${X.NAMES[pl.cls]} LV ${A.SV.lv} · 도전은 화 진행과 본편 기록에 들지 않습니다</div>
      <div class="bt">${ad?`<button class="btn wide" type="button" data-r="double">광고 보고 보상 2배<small>REWARDED AD · +${gold}</small></button>`:''}<button class="btn pri wide" type="button" data-r="town">마을로<small>RETURN</small></button></div></div></div></div>`;
    const db=el.querySelector('[data-r=double]'), gb=el.querySelector('[data-pf=gold]');
    if(db) db.onclick=e=>{ e.stopPropagation(); if(cur!==c||db.disabled||c.doubled) return; db.disabled=true;
      ask('double').then(ok=>{ if(cur!==c) return; if(ok&&!c.doubled){ c.doubled=true; G.hub.H.gold+=gold; PF.save.commit(); gb.textContent='+'+gold*2; db.remove(); } else db.disabled=false; }); };
    el.querySelector('[data-r=town]').onclick=e=>{ e.stopPropagation(); if(cur===c) C.leave(); }; }

  // ---- 매 화면(안쪽 갱신 뒤). 재대결·높은 난이도: 지도가 처음 보인 화면에 상자를 비우고(도전은 도전 보상만 준다) 안내 글.
  // 끝없이 버티기: 시간 자리에 버틴 시간, 왕(surv.js 자체 보스)이 쓰러지고 BOSS_GAP초 뒤 다시(surv.js는 bossDone이 꺼져 있고 BOSS_T가 지났으면 바로 낸다)
  function begin(c,M){ c.M=M;
    for(const q of M.chests){ q.open=true; q.t=-9; }
    M.msg={t:NAME[c.kind]+' · '+M.Z.king,sub:c.kind==='rematch'?'왕의 방으로 들어가면 왕이 나온다':`몹 체력 ×${HARD.hp} · 공격력 ×${HARD.dmg} (임시값) · 신호 노드 3개를 파괴하고 왕을 쓰러뜨려라`,c:AM,t0:RT};
    banner('ZONE '+String(M.Z.no).padStart(2,'0')+' · '+NAME[c.kind]); }
  function tick(){ const c=cur;
    if(c.kind!=='endless'){ const M=G.dun.M; if(!c.M&&M&&M!==c.stale) begin(c,M); return; }
    if(c.state==='run'){ if(V.bossDone&&!V.boss&&c.bossT==null) c.bossT=V.t; if(c.bossT!=null&&V.t-c.bossT>=BOSS_GAP){ V.bossDone=false; c.bossT=null; } }
    if(tm) tm.textContent=mmss(V.t); }
  const u0=update; update=function(rdt){ u0(rdt); if(cur&&G.mode==='surv'&&!G.paused) tick(); };

  // ---- 지도 창(구역 고르기): 깬 구역이면 세 도전 버튼과 각 기록(지금 후손). 마을에서 연 창에서만 누를 수 있다
  const mo=G.menuOverride;
  G.menuOverride=function(el){ const r=mo.apply(this,arguments); if(G.hub.scr==='quest') mapRow(el); return r; };
  function mapRow(el){ const q=G.hub.qSel, zone=q==='seal'?F.COUNT-1:q, box=el.querySelector('.zinfo');
    if(!box||!Number.isInteger(zone)||F.state(story().cleared,zone)!=='cleared') return;
    const ok=PF.place.cur==='town'&&!PF.win.readOnly, d=document.createElement('div'); d.className='pf-chal';
    d.innerHTML=KINDS.map(k=>`<button class="btn" type="button" data-chal="${k}"${ok?'':' disabled'}>${NAME[k]}<small>${recText(k,best2()[key(k,zone)])}</small></button>`).join('');
    d.querySelectorAll('[data-chal]').forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); if(b.disabled) return; if(C.start(b.dataset.chal,zone)) goFull(); else A.toast('지금은 도전을 시작할 수 없습니다'); }; });
    box.appendChild(d); }

  Object.defineProperty(C,'cur',{get:()=>cur&&{kind:cur.kind,zone:cur.zone,ch:cur.ch,state:cur.state,revived:cur.revived}});
  PF.challenge=C;
}

if(typeof module!=='undefined') module.exports=C;
})();
