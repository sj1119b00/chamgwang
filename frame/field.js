// 사냥터 (설계 6.1, 17.1, 17.9): dun.js의 구역 지도를 끝나지 않는 사냥터로 쓴다. 입구에 안전지대와 빠른 이동 관문. 앞 장소·다음 구역으로는 지도 가장자리의 길(road.js)로 넘어간다.
// 쓰러지면 가장 가까운 안전지대에서 부활하거나 마을로 돌아간다. 깬 구역은 다시 들어가면 자유롭게 둘러보는 곳(dun.js M.free)이다.
// 순수 부분(COUNT, chOf, state, inSafe, respawn)은 node 시험(frame/test/field.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 town 다음에 붙인다
(function(){
'use strict';
// 구역 수(7구역 + 자리만 있는 마지막 화). 구역 7은 ch 6(제네시스 섹터)을 빌려 쓴다
const COUNT=8;
const chOf=zone=>Math.min(zone,COUNT-2);
// 깬 구역 수(story.cleared)로 본 구역의 상태
const state=(cleared,zone)=>zone<cleared?'cleared':zone===cleared?'open':'locked';
// 안전지대는 월드 좌표의 원이다(바닥에 그리는 원도 같은 원)
const inSafe=(zones,x,y)=>zones.some(z=>Math.hypot(x-z.x,y-z.y)<z.r);
// 가장 가까운 안전지대의 중심. 안전지대가 없으면 null
function respawn(zones,x,y){ let best=null, bd=Infinity;
  for(const z of zones){ const d=Math.hypot(x-z.x,y-z.y); if(d<bd){ bd=d; best=z; } }
  return best?{x:best.x,y:best.y}:null; }
const F={COUNT,chOf,state,inSafe,respawn};

if(typeof window!=='undefined'&&window.RPG){
  const G=RPG, A=G.api, X=G.sv, V=X.V, FSY=X.FSY, PF=window.PF;
  const HC='#7FF3FF', AM='#EBA74E', RD='#E2513F', KR='"Noto Sans KR","Malgun Gothic",sans-serif';
  // 안전지대 반경(월드 단위), 안에서 초당 차는 최대 체력의 몫, 쓰러진 뒤 무적 시간(초)
  const SAFE_R=520, REGEN=.15, DOWN_INV=2;
  // 지금 사냥터 판. 사냥터가 아니면 null. M은 이 판의 dun.js 지도(들어온 뒤 첫 화면에 생긴다. stale은 그 전 판의 지도), paid는 이미 정산한 몫
  let cur=null, entering=false;
  const subs=[];
  F.safeZones=[];
  const live=()=>!!cur&&G.mode==='surv';
  const story=()=>PF.save.data.story;

  // 사냥터의 화면 겹: 구석 아이콘은 일시정지(.pz) 왼쪽에, 구역 미니맵은 체력판 아래로(dun.js의 좁은 화면 배치와 같다),
  // 가운데 목표 글은 아이콘 줄을 비켜 둔다
  const css=document.createElement('style'); css.id='pffield'; css.textContent=`
body.pf-field #pfui .pf-ico{right:60px}
body.pf-field #shud .dmini{left:10px;right:auto;top:118px;width:116px;height:82px}
body.pf-field #shud .mid{margin-right:162px}`;
  document.head.appendChild(css);

  // x: 사건에 덧붙이는 값. 숨은 곳으로 들어가며 닫는 leave는 {via:'secret'}(secret.js가 F.via를 세우고 판을 닫는다), 숨은 곳에서 돌아오는 enter는 {resume:true}(opts.resume)
  function emit(name,c,x){ const ctx=Object.assign({zone:c.zone,ch:c.ch,first:c.first},x);
    for(const f of subs.slice()){ try{ f(name,ctx); }catch(e){ console.error('frame/field.js: 사건 '+name+'을(를) 받는 쪽에서 오류',e); } } }
  F.onEvent=fn=>{ subs.push(fn); };
  F.via=null;
  // 영웅을 옮긴 뒤: 옷자락은 새 자리에서 다시 시작하고(room.js와 같다), 카메라는 바로 그 자리로
  const cloth=()=>{ for(const q of [...pl.scarf,...pl.coat]) q.init=false; };
  const snap=()=>{ cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-X.BODY*.6; };

  // ---- 보상 정산: hub.js settle(결과 창 없는 지급)로 아직 주지 않은 몫만 준다.
  // 노드·왕까지의 진행 보상은 win에서 한 번, 떠날 때(leave)는 주운 것(상자 크레딧·장비)과 처치 몫(nodes 0).
  // 앱을 숨길 때(hide)는 주운 것만 담고 처치 몫은 남겨 둔다: 떠날 때·제압 때 그 값(0.2·0.6)으로 받는다(숨길 때마다 떠날 때 값으로 미리 받지 않게).
  // 제작 목록: 판을 끝낼 때(승리·떠남)는 예전 게임처럼 settle이 새로 채운다(restock). 앱을 숨길 때만 settle이 채운 목록을 앞 목록으로 되돌린다(앱을 오갈 때마다 바뀌지 않게)
  function pay(c,kind){ const M=c&&c.M; if(!M) return null;
    const gold=M.gold-c.paid.gold, loot=M.loot.slice(c.paid.loot), kills=kind==='hide'?0:V.kills-c.paid.kills;
    if(kind!=='win'&&!gold&&!loot.length&&!kills) return {gold:0,gear:0};
    c.paid={gold:M.gold,loot:M.loot.length,kills:c.paid.kills+kills};
    const H=G.hub.H, g0=H.gold, n0=H.stash.length, stock=H.stock;
    G.hub.settle({win:kind==='win',ch:c.ch,kills,first:c.first,t:0},{gold,loot:loot.length,lootR:loot,nodes:0});
    if(kind==='hide') H.stock=stock;
    PF.save.commit();
    return {gold:H.gold-g0,gear:H.stash.length-n0}; }
  // 모아 둔 경험치(surv.js가 0.5초마다 담는 V.acc)를 바로 담는다. 판이 끝나는 길(surv.js finish가 하던 일)과 앱을 숨길 때
  const bank=()=>{ if(V.acc>0){ A.gainExp(V.acc); V.run+=V.acc; V.acc=0; } };
  // 왕이 쓰러졌는가(궁극기 중이라 dun.js가 아직 M.won을 처리하지 못한 때도). 쓰러짐으로 지운 왕은 M.king·c.king에서 빠져 있다
  const kingDown=c=>{
    const M=c.M,k=M&&(M.king||c.king);
    if(c.zone===7&&k?.dead&&k.finalStage==='arcadia'){
      if(c.first) story().finalStage='signal';
      return false;
    }
    return !!M&&(!!M.won||!!(k&&k.dead&&(c.zone!==7||k.finalStage==='signal')));
  };
  // 첫 제압의 기록: 진행, 첫 클리어 경험치(surv.js finish의 150*(ch+1)), 승리 정산. 한 판에 한 번(c.won).
  // 경험치 회수(2.4초)가 끝나기 전에 불리면(떠남·앱 숨김) 날아오던 젬도 담는다
  function winBook(c){ if(c.won) return; c.won=true; const M=c.M;
    if(!M.free){ for(const g of V.gems) V.acc+=g.v; V.gems.length=0; }
    if(c.first){
      const s=story(); s.cleared=Math.max(s.cleared,c.zone+1);
      if(c.zone===7) s.finalStage='separated';
      A.SV.chClear=Math.min(7,s.cleared);
      bank();
      const target=PF.balance.rows[c.zone].lvOut;
      c.memoryXP=PF.economy.memoryXP(c.ch,A.SV.lv,A.SV.exp,target,A.needExp);
      A.gainExp(c.memoryXP); V.run+=c.memoryXP;
    }
    c.run.first=false;
    if(c.first) emit('kingCleared',c);
    c.winPay=pay(c,'win'); }

  // ---- 관문과 구석 아이콘. 관문은 들른 곳 목록(road.js). 일시정지 창의 나가기는 사냥터에서 마을로 간다(보상을 정산하므로 글도 바꾼다)
  function onSpot(s){ if(s.act==='portal:warp') PF.road.list(); }
  const quit=document.querySelector('#rpause [data-p=quit]'), quit0=quit&&quit.onclick, quitH=quit&&quit.innerHTML;
  const ultimate=()=>lock||!!V.ultTick;
  if(quit) quit.onclick=function(e){ if(cur){ A.setPause(false); F.leave(); return; } return quit0?quit0.call(this,e):undefined; };

  // 판을 닫는다(정산 뒤 포탈·아이콘·안전지대를 치운다). 왕이 쓰러졌는데 아직 win 처리 전이면(경험치 회수 2.4초 안, 궁극기로 미뤄짐) 그 기록부터.
  // 사건은 판을 다 닫은 뒤에 낸다: 그 판에서 아직 내지 않은 win, 그리고 마을로 떠날 때만 leave
  // 정산이 오류를 내도(hub.js 내보내기가 빠짐 등) 판은 닫는다: 닫지 못하면 떠나려 할 때마다 같은 오류가 나 사냥터에 갇힌다
  function end(leaving){ const c=cur; if(!c) return;
    try{ if(kingDown(c)) winBook(c); pay(c,'leave'); bank(); }
    finally{ PF.spots.clear(); PF.town.icons([]); document.body.classList.remove('pf-field'); if(quit) quit.innerHTML=quitH;
      F.safeZones=[]; if(G.frame.run===c.run) G.frame.run=null; cur=null; }
    if(c.won&&!c.shown) emit('win',c);
    if(leaving) emit('leave',c,F.via?{via:F.via}:null); }
  // 앱을 닫거나 숨기면(사냥터 판은 끝나지 않으므로) 주운 것(상자 크레딧·장비)을 정산하고 저장한다. 처치 몫은 떠날 때·제압 때까지 남긴다. 왕이 쓰러져 있으면 첫 제압 기록도
  function hide(){ const c=cur; if(!c||!c.M) return; if(kingDown(c)) winBook(c); pay(c,'hide'); bank(); PF.save.commit(); }
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') hide(); });
  addEventListener('pagehide',hide);

  F.enter=function(zone,opts){ opts=opts||{};
    const st=Number.isInteger(zone)&&zone>=0&&zone<COUNT?state(story().cleared,zone):'locked';
    if(st==='locked'||ultimate()||!PF.place.can(PF.place.cur,'field')) return false;
    if(cur) end(false);
    if(PF.place.FIGHT.includes(PF.place.cur)) G.survEnd();
    const ch=chOf(zone), run={kind:'field',zone,ch,first:st==='open'};
    PF.bestiary?.preload(zone);
    G.frame.run=run; PF.place.go('field');
    entering=true; try{ G.survStart(ch); } finally{ entering=false; }
    cloth();
    // 안전지대(와 관문)는 시작점: dun.js가 지도를 만드는 영웅 자리(구역 입구). opts.at·opts.arrive(in·out: 그 길 끝 바로 안쪽, road.js)는 영웅만,
    // 그 지도가 생긴 뒤(첫 화면) 옮긴다. arrive가 camp거나 없으면 시작점 그대로
    const p={x:pl.x,y:pl.gy};
    cur={zone,ch,first:run.first,run,stale:G.dun.M,M:null,at:opts.at?{x:opts.at.x,y:opts.at.y}:null,arrive:opts.arrive,paid:{gold:0,loot:0,kills:0},done:0,kingSeen:false,half:false,won:false,shown:false,winPay:null,king:null};
    F.safeZones=[{x:p.x,y:p.y,r:SAFE_R}];
    // 빠른 이동 관문(id는 예전 마을 포탈 그대로): 안전지대 안, 영웅의 오른쪽 아래(이름표가 화면 위쪽의 목표 글·안내 판에 가리지 않게). 고리까지 원 안에 든다.
    // 그림이 있으면 마을의 고리 문(b_portal_base)을 작게(h) 그린다(spots.js). 없으면 예전 빛기둥
    PF.spots.set([{id:'portal_town',kind:'portal',art:'b_portal_base',h:CAMP.gate,x:p.x+280,y:p.y+150,r:200,label:'관문 · 빠른 이동',act:'portal:warp'}],onSpot);
    PF.town.icons(['skills','gear','settings']);
    document.body.classList.add('pf-field');
    if(quit) quit.innerHTML='마을로<small>RETURN · 보상 정산</small>';
    PF.place.safe=true;
    emit('enter',cur,opts.resume?{resume:true}:null);
    return true; };
  F.leave=function(){ if(!cur) return false;
    if(ultimate()){ cur.leaveAfterUlt=true; return true; }
    end(true); G.survEnd(); PF.place.go('town'); return true; };
  F.closeForTravel=function(){ if(cur){ end(true); G.survEnd(); } };
  // 다른 곳이 전투를 끝내거나(toMenu) 새로 열면(창 안의 모의 전투) 그 전에 정산하고 판을 닫는다
  const se=G.survEnd; G.survEnd=function(){ if(cur) end(true); return se.apply(this,arguments); };
  const ss=G.survStart; G.survStart=function(){ if(cur&&!entering) end(true); return ss.apply(this,arguments); };

  // ---- surv.js finish()의 갈고리: 사냥터에서는 판이 끝나지 않는다. 쓰러짐은 부활, 승리(시간 끝)는 무시(dun.js가 이어 간다)
  G.frame.onFinish=function(win){ const r=G.frame.run; if(!(r&&r.kind==='field')) return false; if(!win&&cur&&!lock) down(); return true; };
  function down(){ const c=cur;
    const began=PF.defeat.begin({checkpoint:'가까운 안전지대에서 부활',choose(action){
      if(action==='town'){F.leave();return;}
      returnToSafety(c);
    }});
    if(began) emit('down',c);
  }
  function returnToSafety(c){ const M=c.M, k=M&&M.king;
    PF.regionMaps?.releaseDuel(M);
    // 왕과 싸우던 중이면 왕과 왕의 방 무리를 지우고 문이 열린 상태로 되돌린다. 다시 들어가면 dun.js가 새 왕을 낸다
    if(k&&!k.dead){ const a=M.arena;
      for(const e of V.en) if(!e.dead&&!e.d.node&&(e===k||Math.hypot(e.x-a.x,(e.y-a.y)/FSY)<(a.design?PF.regionMaps.radius(a,Math.atan2((e.y-a.y)/FSY,e.x-a.x)):a.r)+60)) e.dead=true;
      M.king=null; V.boss=null; c.king=null; c.half=false; V.mk.length=0;
      for(let i=V.pj.length-1;i>=0;i--) if(V.pj[i].orb) V.pj.splice(i,1); }
    const p=respawn(F.safeZones,pl.x,pl.gy)||{x:pl.x,y:pl.gy};
    pl.x=pl.home=p.x; pl.gy=p.y; pl.air=pl.airT=0; V.dash=null; anim.seq=null; cloth(); snap();
    G.hp=A.maxHp(); G.inv=DOWN_INV; PF.place.safe=true;
    if(M) M.msg={t:'쓰러짐 · 안전지대에서 다시 일어났습니다',sub:'',c:RD,t0:RT};
  }

  // ---- 매 화면. 안쪽 갱신 전: 안전지대 안이면 피해를 받지 않고(surv.js의 무적 시간 G.inv) 자동 공격·스킬이 나가지 않는다(기본·스킬 대기 V.bcd·V.gcd)
  const u0=update; update=function(rdt){
    const on=live()&&!G.paused;
    if(on&&!lock&&inSafe(F.safeZones,pl.x,pl.gy)){ G.inv=Math.max(G.inv,.1); V.bcd=Math.max(V.bcd,.1); V.gcd=Math.max(V.gcd,.1); }
    u0(rdt);
    if(on&&live()&&!G.paused) step(rdt);
    keepX=fightNow()?pl.x:null; };
  // ---- index.html의 resize()는 궁극기 중이 아니면 영웅을 화면 왼쪽 자리(pl.home, 옛 옆 시점 모드의 자리)로 옮긴다: heat.js의 해상도 조절(5초마다), 화면 크기·방향·주소창 변화.
  // 방(room.js가 따로 지킨다)이 아닌 전투 장소(사냥터와 도전)에서는 제자리에 둔다. 창·장면이 떠 있으면 그쪽(win.js·story.js)이 되돌린다.
  // 엔진은 resize를 전역 이름으로도(heat.js) 이벤트로도(index.html이 처음 등록한 함수 그대로) 부르므로 둘 다 받는다. 이벤트 쪽은 마지막 갱신 뒤의 자리(keepX)로
  let keepX=null;
  const fightNow=()=>G.mode==='surv'&&!lock&&!PF.room.cur&&!(PF.win&&PF.win.cur)&&!(PF.story&&PF.story.cur)&&PF.place.FIGHT.includes(PF.place.cur);
  const rs0=resize; resize=function(){ const k=fightNow()?{x:pl.x,cx:cam.x}:null; rs0.apply(this,arguments); if(k){ pl.x=pl.home=k.x; if(cam.x!==k.cx) snap(); } };
  addEventListener('resize',()=>{ if(keepX!=null&&fightNow()){ pl.x=pl.home=keepX; snap(); } });
  // 이 판의 지도가 처음 보인 화면
  function begin(M){ const c=cur; c.M=M; c.done=M.done;
    if(PF.continent) F.safeZones.push(...PF.continent.shelters(M));
    const q=c.at||(c.arrive==='in'||c.arrive==='out')&&PF.road.arrival(M,c.arrive);
    if(q){
      const dx=q.x-pl.x, dy=q.y-pl.gy;
      pl.x=pl.home=q.x; pl.gy=q.y;
      for(const part of [...pl.scarf,...pl.coat]){
        part.x+=dx; part.px+=dx; part.y+=dy; part.py+=dy;
        part.init=false;
      }
      snap(); c.at=null;
    }
    if(c.zone===COUNT-1&&M.msg) M.msg={...M.msg,t:'남부 관제시설 · 균열의 심부',sub:'일곱 기억이 관제실의 봉인을 푼다.',t0:RT}; }
  // 지도를 보고 사건을 낸다. 받는 쪽이 판을 옮기면(cur가 바뀜) 거기서 멈춘다
  function watch(M){ const c=cur;
    while(c.done<M.done){ c.done++; emit('node'+c.done,c); if(cur!==c) return; }
    if(M.king&&M.king!==c.king){ c.king=M.king;c.half=false;
      if(!c.kingSeen){ c.kingSeen=true; emit('king',c); if(cur!==c) return; } }
    const k=c.king; if(k&&!k.dead&&!c.half&&!lock&&k.hp<k.max*.5){ c.half=true; emit(k.finalStage==='signal'?'signalHp50':'kingHp50',c); if(cur!==c) return; }
    if(M.won&&M.free&&!c.shown&&!lock) win(c,M); }
  // 왕이 쓰러지고 경험치 회수가 끝남(dun.js가 M.free로 넘어감): 기록(앱을 숨길 때 이미 했으면 그대로. 진행이 올라 나가는 길이 열린다), 알림. 결과 창은 없다
  function win(c,M){ c.shown=true; winBook(c);
    const r=c.winPay||{gold:0,gear:0};
    M.msg={t:`${c.zone===7?'신호체 분리':'구역 제압'} · 크레딧 +${r.gold} · 장비 ${r.gear}`,sub:c.memoryXP?'기억 동기화 · '+c.memoryXP+' EXP':'',c:AM,t0:RT};
    emit('win',c); }
  function step(rdt){ const M=G.dun.M;
    if(cur.leaveAfterUlt&&!ultimate()){ F.leave(); return; }
    if(M&&!cur.M&&M!==cur.stale) begin(M);
    if(cur.M&&cur.M===M){ watch(M); if(!live()) return; }
    const Z=F.safeZones;
    const shelter=Z.find(z=>z.kind&&Math.hypot(pl.x-z.x,pl.gy-z.y)<z.r);
    // 안전지대 안의 적은 경계 밖으로, 적 탄은 경계에서 사라진다
    for(const e of V.en){ if(e.dead||e.d.node) continue;
      for(const z of Z){ const dx=e.x-z.x, dy=e.y-z.y, d=Math.hypot(dx,dy);
        const calm=shelter===z&&e!==M?.king?680:0;
        if(d<z.r+calm){ const far=Math.max(z.r+1,Math.min(z.r+calm+1,d+rdt*1250)), k=far/(d||1);
          e.x=z.x+(d?dx:1)*k; e.y=z.y+(d?dy:0)*k; } } }
    for(let i=V.pj.length-1;i>=0;i--){ const p=V.pj[i]; if(p.orb&&inSafe(Z,p.x,p.y)) V.pj.splice(i,1); }
    // 체력이 0이 된 길이 hurt가 아니어도(직접 넣은 값 등) 쓰러짐으로 받는다
    if(G.hp<=0&&!lock){down();return;}
    const safe=inSafe(Z,pl.x,pl.gy); PF.place.safe=safe;
    if(safe&&!lock){ const mx=A.maxHp(); G.hp=Math.max(G.hp,Math.min(mx,G.hp+mx*REGEN*rdt)); } }

  // ---- 바닥: 안전지대 경계(dun.js 바닥 위, 소품·영웅 아래)와 작은 "안전지대" 글자.
  // 그림(safe_mark)이 있으면 차가운 흰빛 고리 그림을 경계 원에 맞춰 깔고(그림 속 고리가 반지름의 MARK_R 자리), 투광등 탑 아래에 차가운 흰빛 웅덩이.
  // 없으면 예전 청록 원
  const MARK_R=.906;
  function label(x,y,r){ const px=(W/innerWidth)/(S*cam.z), fs=12*px, ty=y+r-fs*1.6;
    ctx.save(); ctx.font=`700 ${fs}px ${KR}`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
    ctx.lineWidth=4*px; ctx.strokeStyle='rgba(2,10,12,.85)'; ctx.strokeText('안전지대',x,ty); ctx.fillStyle='#E4ECEC'; ctx.fillText('안전지대',x,ty); ctx.restore(); }
  function drawSafe(z){ const {x,y,r}=z, mk=PF.art.img('safe_mark');
    if(z.kind) return;
    if(mk){ const k=S*cam.z*1.25, R=r/MARK_R, im=PF.art.fit('safe_mark',2*R*k,2*R*k)||mk;
      ctx.globalAlpha=.92; ctx.drawImage(im,x-R,y-R,2*R,2*R); ctx.globalAlpha=1;
      if(PF.art.img('camp_beacon')){ const b=CAMP.props.find(p=>p.art==='camp_beacon'), f=.94+.06*Math.sin(RT*.9);
        ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.34*f; ctx.drawImage(coldPool(),x+b.dx-380,y+b.dy+90-380*FSY,760,760*FSY);
        ctx.globalAlpha=.22*f; ctx.drawImage(coldPool(),x+b.dx-170,y+b.dy+20-170*FSY,340,340*FSY); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
      return label(x,y,r); }
    ctx.fillStyle='rgba(127,243,255,.07)'; ctx.beginPath(); ctx.arc(x,y,r,0,TAU); ctx.fill();
    fx.strokeStyle=hexA(HC,.8); fx.lineWidth=7; fx.beginPath(); fx.arc(x,y,r,0,TAU); fx.stroke();
    fx.setLineDash([40,34]); fx.lineDashOffset=-RT*40; fx.strokeStyle=hexA(HC,.4); fx.lineWidth=4; fx.beginPath(); fx.arc(x,y,r-26,0,TAU); fx.stroke(); fx.setLineDash([]);
    label(x,y,r); }
  const prep0=drawBackground_prep; drawBackground_prep=function(){ prep0(); if(!live()) return; applyCam(ctx); applyCam(fx); for(const z of F.safeZones) drawSafe(z); ctx.setTransform(1,0,0,1,0,0); };

  // ---- 입구 야영지(그림만, 걸어서 지나갈 수 있다): 안전지대 중심에서 {dx,dy}(그림 바닥), 월드 높이 h. 천막은 왼쪽 뒤, 투광등 탑은 가운데 뒤(차가운 흰빛),
  // 보급품은 왼쪽 앞. 오른쪽 아래의 관문(작은 고리 문, 높이 gate)과 시작점(중심)·관문으로 가는 길은 비워 둔다.
  // 영웅·적과 y 순서로 섞어 그리고, 영웅이 키 큰 그림 뒤에 가면 비쳐 보인다(room.js와 같다). 그림이 없으면 그리지 않는다
  const CAMP={gate:440,props:[{art:'camp_tent',dx:-270,dy:-110,h:380},{art:'camp_beacon',dx:40,dy:-240,h:470},{art:'camp_supplies',dx:-290,dy:250,h:260}]};
  let cold=null;
  const coldPool=()=>cold||(cold=(()=>{ const n=document.createElement('canvas'); n.width=n.height=128; const g=n.getContext('2d'), q=g.createRadialGradient(64,64,0,64,64,64);
    q.addColorStop(0,'rgba(214,232,236,.8)'); q.addColorStop(.35,'rgba(190,214,222,.32)'); q.addColorStop(1,'rgba(170,200,210,0)'); g.fillStyle=q; g.fillRect(0,0,128,128); return n; })());
  const camp=[]; let ci=0;
  function campList(){ camp.length=0; ci=0; const z=F.safeZones[0]; if(!z) return; const {hw,hh}=X.view();
    for(const c of CAMP.props){ const im=PF.art.img(c.art); if(!im) continue; const x=z.x+c.dx, y=z.y+c.dy, w=c.h*im.naturalWidth/im.naturalHeight;
      if(x+w<cam.x-hw-200||x-w>cam.x+hw+200||y<cam.y-hh-200||y-c.h>cam.y+hh+200) continue; camp.push({c,x,y,w,im}); }
    camp.sort((a,b)=>a.y-b.y); }
  function campProp(q){ const {c,x,y,w,im}=q, h=c.h, k=S*cam.z*1.25, src=PF.art.fit(c.art,w*k,h*k)||im;
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x,y-h*.04,w*.46,w*.46*FSY*.42,0,0,TAU); ctx.fill();
    ctx.globalAlpha=y>pl.gy&&y-h*.92<pl.gy-40&&Math.abs(pl.x-x)<w*.42?.42:1; ctx.drawImage(src,x-w/2,y-h,w,h); ctx.globalAlpha=1;
    // 투광등 머리와 초록 경광등의 작은 빛(fx, 미리 그린 빛 그림)
    if(c.art==='camp_beacon'){ glow(fx,x-w*.33,y-h*.79,110,'#DDEEF0',.34); glow(fx,x-w*.18,y-h*.97,46,'#7FE0A0',.3+.12*Math.sin(RT*3)); } }
  function campUpTo(y){ while(ci<camp.length&&camp[ci].y<y) campProp(camp[ci++]); }
  const de0=drawEnemy; drawEnemy=function(){ if(live()) campList(); de0(); if(live()) campUpTo(pl.gy??0); };
  const dp0=drawPlayer; drawPlayer=function(){ dp0(); if(live()) campUpTo(1e9); };
  const fd0=G.foeDraw; G.foeDraw=function(e){ if(live()) campUpTo(e.y); return fd0?fd0(e):false; };

  // 이 판의 dun.js 지도(들어온 뒤 첫 화면부터. 그 전과 사냥터 밖에서는 null)
  Object.defineProperty(F,'M',{get:()=>cur&&cur.M});
  PF.field=F;
}

if(typeof module!=='undefined') module.exports=F;
})();
