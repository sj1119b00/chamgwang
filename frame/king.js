// 왕의 패턴과 빨간 예고 (설계 17.3): 구역의 왕은 패턴 3~4개(frame/data/kings.js)를 번갈아 쓴다. 모든 피해 패턴은 바닥에 빨간 모양이 먼저 뜨고,
// 예고 시간 동안 안쪽이 가장자리까지 차오른 그 순간에 모양 안에 있을 때만 맞는다. 왕의 다른 피해(예전 원형 표시, 몸 닿기)는 surv.js 가드가 끈다(RPG.frame.kingOn).
// 모양의 좌표는 바닥 평면이다: x는 pl.x와 같고 y는 pl.gy/FSY(바닥의 세로 압축을 푼 값, dun.js fd와 같은 약속). 바닥에서 둥근 원은 화면에서 FSY만큼 납작한 타원이고, 맞는 범위도 그 타원이다.
// 순수 부분(hit, windup, phase, pick)은 node 시험(frame/test/king.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 data/kings 다음에 붙인다
(function(){
'use strict';
// 두 각의 차이(-π..π)
const ad=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
// 점 (x,y)가 모양 안인가. 띠는 (x,y)에서 ang 쪽으로 len, 폭 w(가운데 선에서 양쪽으로 w/2). 고리는 r0~r1(r0 안쪽은 안전)
function hit(s,x,y){ const dx=x-s.x, dy=y-s.y;
  if(s.type==='circle') return dx*dx+dy*dy<=s.r*s.r;
  if(s.type==='ring'){ const d=Math.hypot(dx,dy); return d>=s.r0&&d<=s.r1; }
  if(s.type==='line'){ const c=Math.cos(s.ang), n=Math.sin(s.ang), u=dx*c+dy*n; return u>=0&&u<=s.len&&Math.abs(dy*c-dx*n)<=s.w/2; }
  if(s.type==='cone'){ const d=Math.hypot(dx,dy); return d<=s.r&&(d===0||Math.abs(ad(Math.atan2(dy,dx),s.ang))<=s.half); }
  return false; }
// 예고 시간(초): 첫 구역 1.2초에서 구역마다 0.07초씩 짧아지고 0.7초 아래로는 내려가지 않는다
const windup=zone=>Math.max(.7,1.2-.07*zone);
// 단계: 체력 70% 초과 1, 40% 초과 2, 그 아래 3
const phase=f=>f>.7?1:f>.4?2:3;
// 그 단계에서 쓸 수 있는 패턴 가운데 직전과 다른 것 하나(쓸 수 있는 것이 하나뿐이면 그것)
function pick(def,ph,last,rnd){ const all=def.patterns.filter(p=>p.from<=ph), L=all.length>1?all.filter(p=>p.id!==last):all;
  return L[Math.min(L.length-1,Math.floor(rnd()*L.length))].id; }
const K={hit,windup,phase,pick};

if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, X=G.sv, V=X.V, FSY=X.FSY, PF=window.PF, RED='#ff4a5a', HOT='#ffb347';
  // 돌진할 때 왕이 띠를 달리는 시간, 왕이 나온 뒤 첫 패턴까지, 3단계에서 이어지는 두 패턴 사이, 단계가 바뀔 때 멈춤(모두 초).
  // 돌진 끝과 부하 자리가 왕의 방 벽에서 떨어지는 거리, 돌진할 만한 가장 짧은 길(바닥 평면), 돌진 끝이 소품 발판에서 떨어지는 거리(월드, 왕 몸의 반쯤),
  // 부하를 부를 수 있는 살아 있는 적 수, 기록 길이
  const DASH_T=.35, FIRST=1.5, CHAIN=.5, STOP=.8, DASH_M=120, DASH_MIN=300, DASH_PAD=120, WALL=220, CAP=150, LOG_MAX=300;
  // 멈췄다(일시정지·창·장면) 다시 움직일 때 예고에 남겨 두는 가장 짧은 시간(초). 거의 다 찬 채 멈춘 예고가 닫은 화면에 바로 터지지 않게
  const RESUME=.4;
  K.log=[];
  // tel: 지금 깔린 예고 {id,p,shapes,t,win,seen,x,y}. x,y는 예고 동안 왕을 세워 두는 월드 자리, seen은 한 번이라도 그려졌는지.
  // dash: 돌진 중인 왕의 길(월드). combo: 3단계에서 짝의 첫 패턴을 냈다. held: 깔린 예고가 멈췄다(다음 갱신에서 RESUME을 남긴다)
  let king=null, def=null, zone=0, tel=null, dash=null, wait=FIRST, ph=1, last=null, combo=false, held=false;
  // 싸우는 왕: dun.js 지도의 왕이 살아 있고 지금 전투에 있다
  function live(){ const M=G.dun&&G.dun.M, k=M&&M.king; return k&&!k.dead&&G.mode==='surv'&&V.en.includes(k)?k:null; }
  // surv.js가 왕마다 읽는다(참이면 예전 원형 표시 공격과 몸 닿기 피해가 나가지 않는다)
  Object.defineProperty(G.frame,'kingOn',{get:()=>!!live(),configurable:true,enumerable:true});
  const busy=()=>PF.story&&PF.story.busy?PF.story.busy():(lock||!!V.ultTick);
  const hero=()=>[pl.x,pl.gy/FSY];
  const rnd=(a,b)=>a+Math.random()*(b-a);
  // 효과·소리 도움 함수(surv.js sfx·burst·fring)는 없으면 건너뛴다: 다른 작업이 효과·소리를 고쳐 이름이 빠져도 그 효과만 빠지고 예고·발동·피해는 그대로
  // (이름은 cue: index.html의 전역 fx(효과 캔버스)를 가리지 않게)
  const cue=(name,...a)=>{ if(typeof X[name]==='function') X[name](...a); };
  const alive=()=>V.en.reduce((n,e)=>n+(!e.dead&&!e.d.node?1:0),0);
  const stop=()=>{ tel=null; dash=null; held=false; };
  function reset(k){ king=k; stop(); last=null; combo=false; wait=FIRST; if(!k) return;
    const r=G.frame.run; zone=r&&r.kind==='field'?r.zone:G.dun.M.ch;
    def=PF.KINGS.find(d=>d.zone===zone)||PF.KINGS[PF.KINGS.length-1]; ph=phase(k.hp/k.max); }
  // 왕의 방(바닥 평면의 원) 안에서 (x,y)부터 ang 쪽으로 벽에서 m 앞까지의 거리, 그리고 방 안으로 당긴 점
  function reach(x,y,ang,m){ const a=G.dun.M.arena, R=a.r-m, qx=x-a.x, qy=y-a.y/FSY, b=qx*Math.cos(ang)+qy*Math.sin(ang), d=b*b-(qx*qx+qy*qy-R*R); return d>0?Math.max(0,Math.sqrt(d)-b):0; }
  function inRoom(x,y){ const a=G.dun.M.arena, cx=a.x, cy=a.y/FSY, R=a.r-WALL, dx=x-cx, dy=y-cy, d=Math.hypot(dx,dy); return d<=R?[x,y]:[cx+dx/d*R,cy+dy/d*R]; }
  // 돌진할 길: 벽 앞(DASH_M)이나 소품 발판(왕좌 등) 앞에서 멈춘다. 발판 안에서 멈추면 dun.js pushOut이 왕을 밀어내다 방 벽 밖으로 넘긴다
  function runLen(x,y,ang){ const max=reach(x,y,ang,DASH_M), c=Math.cos(ang), s=Math.sin(ang), m=DASH_PAD, L=G.dun.M.props.filter(p=>p.solid&&Math.abs(p.x-x)<max+p.rx+m);
    for(let d=40;d<=max;d+=40){ const wx=x+c*d, wy=(y+s*d)*FSY; if(L.some(p=>Math.hypot((wx-p.x)/(p.rx+m),(wy-p.y)/(p.ry+m*FSY))<1)) return d-40; }
    return max; }

  // ---- 예고 시작: 모양은 이 순간의 왕·영웅 자리로 정해지고 따라오지 않는다
  function begin(k){ const kx=k.x, ky=k.y/FSY, [hx,hy]=hero(), ang=Math.atan2(hy-ky,hx-kx), run=runLen(kx,ky,ang), sh=[];
    // 벽이나 왕좌에 막혀 달릴 길이 없으면 이번에는 돌진을 빼고 고른다(1단계에 피해 패턴이 둘 이상이라 늘 남는다)
    const id=pick(run<DASH_MIN?{patterns:def.patterns.filter(q=>q.id!=='charge')}:def,ph,last,Math.random), p=def.patterns.find(q=>q.id===id);
    if(id==='slam') sh.push({type:'circle',x:hx,y:hy,r:p.r});
    else if(id==='charge') sh.push({type:'line',x:kx,y:ky,ang,len:Math.min(p.len,run),w:p.w});
    else if(id==='sweep') sh.push({type:'cone',x:kx,y:ky,ang,half:p.half,r:p.r});
    else if(id==='ring') sh.push({type:'ring',x:kx,y:ky,r0:p.r0,r1:p.r1});
    else if(id==='fan') for(let i=0;i<p.n;i++){ const a=ang+(i-(p.n-1)/2)*p.step; sh.push({type:'line',x:kx,y:ky,ang:a,len:Math.min(p.len,reach(kx,ky,a,0)),w:p.w}); }
    else if(id==='summon'){ const a0=Math.random()*Math.PI*2; for(let i=0;i<p.n;i++){ const a=a0+i/p.n*Math.PI*2, [x,y]=inRoom(hx+Math.cos(a)*p.d,hy+Math.sin(a)*p.d); sh.push({type:'circle',x,y,r:p.r}); } }
    last=id; held=false; tel={id,p,shapes:sh,t:0,win:windup(zone),seen:false,x:k.x,y:k.y};
    k.castT=tel.win; cue('sfx','click'); }
  // 발동 이펙트(기존 폭발·연기). 좌표는 바닥 평면 → 월드(y×FSY)
  function boom(t){ const s=t.shapes[0], id=t.id;
    if(id==='slam'){ explode(s.x,s.y*FSY,.55,HOT,RED); cue('burst',s.x,s.y*FSY,10,{s0:200,s1:600,vz:1300,size:16}); }
    else if(id==='sweep'){ for(let i=0;i<=6;i++){ const a=s.ang-s.half+i/6*s.half*2, d=s.r*.7; smoke(s.x+Math.cos(a)*d,(s.y+Math.sin(a)*d)*FSY,rnd(40,65),{a:.45,life:.9,grow:80}); }
      explode(s.x+Math.cos(s.ang)*s.r*.45,(s.y+Math.sin(s.ang)*s.r*.45)*FSY,.4,HOT,RED); }
    else if(id==='ring'){ const d=(s.r0+s.r1)/2; for(let i=0;i<14;i++){ const a=i/14*Math.PI*2; smoke(s.x+Math.cos(a)*d,(s.y+Math.sin(a)*d)*FSY,rnd(45,70),{a:.45,life:.9,grow:80}); }
      cue('fring',s.x,s.y*FSY,s.r1/.35,HOT,.35,8); cue('sfx','boom',.9,.7); }
    else if(id==='fan'||id==='charge'){ for(const l of t.shapes) for(let i=1;i<=4;i++){ const d=l.len*i/4; smoke(l.x+Math.cos(l.ang)*d,(l.y+Math.sin(l.ang)*d)*FSY,rnd(35,55),{a:.4,life:.8,grow:60}); }
      cue('sfx',id==='fan'?'boom':'whoosh',.8,.6); }
    else if(id==='summon'){ for(const c of t.shapes) smoke(c.x,c.y*FSY,rnd(50,70),{a:.5,life:1,grow:90}); cue('sfx','rise',.6,.4); } }
  // 발동: 그 순간 영웅이 모양 안이면 최대 체력×dmg. 왕에게서 오는 피해는 이 길 하나뿐이다
  function fire(k){ const t=tel, p=t.p, [hx,hy]=hero(), harm=p.id!=='summon', inside=harm&&t.shapes.some(s=>hit(s,hx,hy));
    tel=null;
    K.log.push({t:RT,id:p.id,warned:t.seen&&t.t>=t.win,hit:inside}); if(K.log.length>LOG_MAX) K.log.shift();
    boom(t);
    if(p.id==='summon') for(const s of t.shapes) for(let i=0;i<p.k;i++) if(alive()<CAP) X.spawn('shard',s.x+rnd(-.5,.5)*s.r,(s.y+rnd(-.5,.5)*s.r)*FSY);
    if(p.id==='charge'){ const s=t.shapes[0]; dash={t:0,x0:k.x,y0:k.y,x1:s.x+Math.cos(s.ang)*s.len,y1:(s.y+Math.sin(s.ang)*s.len)*FSY}; }
    if(ph===3&&!combo){ combo=true; wait=CHAIN; } else { combo=false; wait=rnd(def.gap[0],def.gap[1]); }
    // 피해는 마지막에: 이것으로 영웅이 쓰러지면 field.js가 왕을 지우고(down 사건) 여기 상태도 비운다.
    // 도전의 피해 배율(높은 난이도: PF.balance.scale.dmg, 평소 1)을 곱하되, 배율이 붙은 한 대는 최대 체력의 60%를 넘지 않는다.
    // 직업의 받는 피해 배율(balance.js takenK, 근접 0.8)은 맨 끝에 곱한다: 60%로 막힌 한 대에서도 근접이 원거리의 0.8배
    if(inside){ const B=PF.balance, mx=A.maxHp(), sk=(B&&B.scale&&B.scale.dmg)||1, tk=B&&B.takenK?B.takenK(pl.cls):1, d=mx*p.dmg*sk;
      X.hurt((sk>1?Math.min(d,mx*.6):d)*tk,{x:k.x,y:k.y,king:k,pat:p.id}); } }

  // ---- 매 화면(surv.js·dun.js·field.js가 왕을 움직인 뒤)
  function step(dt){ const k=live();
    if(k!==king) reset(k);
    if(!k) return;
    // 궁극기·장면 중에는 깔린 예고를 지우고(발동하지 않는다) 새로 시작하지 않는다. 끝난 뒤 적어도 1초 쉰다
    if(busy()){ stop(); wait=Math.max(wait,1); return; }
    // 창이나 장면이 열려 있으면 새로 시작하지 않고 그대로 둔다(전투 장소에서는 둘 다 일시정지라 여기까지 오지 않는다)
    if(PF.win&&PF.win.cur||PF.story&&PF.story.cur){ if(tel) held=true; return; }
    const p=phase(k.hp/k.max);
    if(p>ph){ ph=p; stop(); combo=false; wait=STOP; k.stun=Math.max(k.stun,STOP); A.toast('왕이 거세진다'); return; }
    if(dash){ const q=Math.min(1,(dash.t+=dt)/DASH_T); k.x=dash.x0+(dash.x1-dash.x0)*q; k.y=dash.y0+(dash.y1-dash.y0)*q; k.kx=k.ky=0;
      if(Math.random()<.6) smoke(k.x+rnd(-60,60),k.y,rnd(35,55),{a:.4,life:.7,grow:60});
      if(q>=1){ explode(k.x,k.y,.45,HOT,RED); dash=null; }
      return; }
    if(tel){ if(held){ held=false; tel.t=Math.min(tel.t,tel.win-RESUME); }
      tel.t+=dt; k.x=tel.x; k.y=tel.y; k.kx=k.ky=0; if(tel.t>=tel.win) fire(k); return; }
    if((wait-=dt)<=0) begin(k); }
  const u0=update; update=function(rdt){ const dt=hitstop>0?0:rdt*timeScale; u0(rdt);
    if(G.mode==='surv'&&!G.paused) step(dt); else if(G.mode!=='surv'&&king) reset(null); };
  // 일시정지(창·장면이 전투 장소에서 켜는 것과 플레이어의 일시정지)가 켜지는 순간 깔린 예고를 멈춘 것으로 적는다.
  // 창·장면이 떠 있는 동안은 heat.js가 갱신을 아예 건너뛰므로 갱신 안에서는 멈춤을 볼 수 없다
  const sp0=A.setPause; A.setPause=function(p){ if(p&&tel) held=true; return sp0.apply(this,arguments); };
  if(PF.field) PF.field.onEvent(n=>{ if(n==='down'||n==='leave') reset(null); });

  // ---- 바닥의 빨간 예고: 바닥 그리기 뒤, 캐릭터 앞(surv.js drawEnemy의 젬·영웅 고리·적보다 먼저).
  // 길은 바닥 평면에서 만들고(세로 FSY 압축) 선은 압축 없이 화면 픽셀 굵기로 긋는다
  function trace(g,s,k){
    if(s.type==='circle'){ g.moveTo(s.x+s.r*k,s.y); g.arc(s.x,s.y,s.r*k,0,Math.PI*2); }
    else if(s.type==='ring'){ const r=s.r0+(s.r1-s.r0)*k; g.moveTo(s.x+r,s.y); g.arc(s.x,s.y,r,0,Math.PI*2); g.moveTo(s.x+s.r0,s.y); g.arc(s.x,s.y,s.r0,Math.PI*2,0,true); }
    else if(s.type==='line'){ const c=Math.cos(s.ang), n=Math.sin(s.ang), L=s.len*k, h=s.w/2; g.moveTo(s.x-n*h,s.y+c*h); g.lineTo(s.x+c*L-n*h,s.y+n*L+c*h); g.lineTo(s.x+c*L+n*h,s.y+n*L-c*h); g.lineTo(s.x+n*h,s.y-c*h); g.closePath(); }
    else if(s.type==='cone'){ g.moveTo(s.x,s.y); g.arc(s.x,s.y,s.r*k,s.ang-s.half,s.ang+s.half); g.closePath(); } }
  function draw(){ const t=tel, k=Math.min(1,t.t/t.win), px=(W/innerWidth)/(S*cam.z), hot=k>.8&&Math.sin(t.t*42)>0;
    const shape=(g,q)=>{ g.save(); g.scale(1,FSY); g.beginPath(); for(const s of t.shapes) trace(g,s,q); g.restore(); };
    t.seen=true;
    ctx.save(); ctx.lineJoin='round';
    shape(ctx,1); ctx.fillStyle=hexA(RED,.16); ctx.fill(); ctx.strokeStyle='rgba(30,0,6,.75)'; ctx.lineWidth=7*px; ctx.stroke();
    shape(ctx,k); ctx.fillStyle=hexA(RED,.24+.22*k); ctx.fill();
    shape(ctx,1); ctx.strokeStyle=hot?'#ffd6da':RED; ctx.lineWidth=(3+1.5*k)*px; ctx.stroke();
    ctx.restore();
    fx.save(); shape(fx,1); fx.lineJoin='round'; fx.strokeStyle=hexA(RED,.3+.35*k); fx.lineWidth=8*px; fx.stroke(); fx.restore(); }
  const de0=drawEnemy; drawEnemy=function(){ if(tel&&G.mode==='surv'&&!lock) draw(); de0(); };

  Object.defineProperty(K,'cur',{get:()=>tel});
  Object.defineProperty(K,'def',{get:()=>king?def:null});
  PF.king=K;
}

if(typeof module!=='undefined') module.exports=K;
})();
