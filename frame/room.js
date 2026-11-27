// 방 (설계 5.1, 17.1): 서바이벌 전투 위에 까는 작은 경계 지도 하나(마을, 숨은 던전). dun.js의 구역 지도와 같은 방식으로 엔진 전역을 감싼다.
// 켜져 있는 동안 서바이벌 자체 스폰을 끄고, 영웅을 지도 안에 가두고, 바닥과 소품·지점(spots.js)을 y 순서로 그린다.
// RoomDef {id,w,h,floor,accent,start:{x,y},props:[{img,x,y,h}],spots,foes?:[{type,x,y,n}],boss?:{type,x,y}}. 좌표는 지도 왼쪽 위가 0,0인 월드 단위.
// 그림(frame/art.js)을 쓰는 방: props의 {art,flip?,dim?,light?}, floorArt·floorScale(바닥 조각), rail·rails(레일 띠 [x0,y0,x1,y1], 가로나 세로),
// streets·plazas(밝은 길과 광장, 반복 없는 명암 지도), fence:false(테두리 빛 울타리 끄기). 그림이 아직 없거나 막히면 바닥은 예전처럼, 그림 소품은 그리지 않는다
// 발자리(solid:true인 방, 마을): 그림 소품마다 manifest의 foot(그림 비율 좌표의 볼록 다각형 목록), NPC는 발밑의 작은 원, 그림 포탈은 b_portal_base의 foot.
// 영웅은 발자리 안에 들어가지 못하고 벽을 따라 미끄러진다. 발자리가 없는 방(숨은 방)은 예전 그대로
// 순수 부분(clamp, inside, push, polys, ring, frontY)은 node 시험(frame/test/room.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 spots.js 다음에 붙인다
(function(){
'use strict';
// 지도 가장자리 여백
const EDGE=60;
const lim=(v,a,b)=>Math.min(b,Math.max(a,v));
function clamp(def,x,y){ return {x:lim(x,EDGE,def.w-EDGE),y:lim(y,EDGE,def.h-EDGE)}; }
// ---- 발자리. 다각형은 [[x,y],...] 월드 좌표의 볼록 다각형(감은 방향은 어느 쪽이든)
// 넓이의 부호(감은 방향)
const area=P=>{ let A=0; for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length]; A+=a[0]*b[1]-b[0]*a[1]; } return A; };
function inside(P,x,y){ const s=area(P)>0?1:-1;
  for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length]; if(s*((b[1]-a[1])*(x-a[0])-(b[0]-a[0])*(y-a[1]))>0) return false; }
  return true; }
// 다각형 하나 밖으로(바닥 거리: y를 fsy로 나눠 편 공간에서 반지름 r). 안이면 가장 얕은 벽 쪽으로, 밖인데 r보다 가까우면 가장 가까운 점에서 r만큼. 밀 일이 없으면 null
function out1(P,px,py,r,fsy){ const s=area(P)>0?1:-1, n=P.length; let all=true, best=-Infinity, bx=0, by=0, cd=Infinity, cx=0, cy=0;
  for(let i=0;i<n;i++){ const ax=P[i][0], ay=P[i][1]/fsy, ex=P[(i+1)%n][0]-ax, ey=P[(i+1)%n][1]/fsy-ay, l=Math.hypot(ex,ey)||1;
    const nx=s*ey/l, ny=-s*ex/l, d=nx*(px-ax)+ny*(py-ay);
    if(d>0) all=false;
    if(d>best){ best=d; bx=nx; by=ny; }
    const t=lim(((px-ax)*ex+(py-ay)*ey)/(l*l),0,1), qx=ax+ex*t, qy=ay+ey*t, dd=Math.hypot(px-qx,py-qy);
    if(dd<cd){ cd=dd; cx=qx; cy=qy; } }
  if(all) return [px+bx*(r-best),py+by*(r-best)];
  if(cd<r-1e-9) return [cx+(px-cx)/cd*r,cy+(py-cy)/cd*r];
  return null; }
// 점(영웅의 발)을 모든 발자리 밖으로 민다. 겹친 발자리 사이에서도 몇 번 되풀이해 둘 다의 밖으로
function push(polys,x,y,r,fsy){ let px=x, py=y/fsy;
  for(let k=0;k<4;k++){ let moved=false;
    for(const P of polys){ const q=out1(P,px,py,r,fsy); if(q){ px=q[0]; py=q[1]; moved=true; } }
    if(!moved) break; }
  return {x:px,y:py*fsy}; }
// 그림 비율 발자리(manifest foot: [[[0~1,0~1],...],...], 그림 왼쪽 위가 0,0)를 월드 다각형으로. 그림은 가운데 x, 바닥 y, 너비 w, 높이 h
const polys=(foot,x,y,w,h,flip)=>(foot||[]).map(P=>P.map(([u,v])=>[x+(flip?-(u-.5):u-.5)*w,y-(1-v)*h]));
// 바닥의 원(바닥 거리 r)을 n각형으로
function ring(x,y,r,fsy,n=12){ const P=[]; for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; P.push([x+Math.cos(a)*r,y+Math.sin(a)*r*fsy]); } return P; }
// 그 x에서 다각형 아랫변(카메라 쪽)의 y. x가 범위 밖이면 끝의 꼭짓점. 영웅이 이보다 아래(앞)면 그 소품 앞에 그린다
function frontY(P,x){ let x0=Infinity, x1=-Infinity; for(const p of P){ x0=Math.min(x0,p[0]); x1=Math.max(x1,p[0]); }
  x=lim(x,x0,x1); let y=-Infinity;
  for(let i=0;i<P.length;i++){ const a=P[i], b=P[(i+1)%P.length], lo=Math.min(a[0],b[0]), hi=Math.max(a[0],b[0]);
    if(x<lo||x>hi) continue;
    y=Math.max(y,hi===lo?Math.max(a[1],b[1]):a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])); }
  return y; }
const R={clamp,inside,push,polys,ring,frontY,cur:null};

if(typeof window!=='undefined'&&window.RPG){
  const G=RPG, X=G.sv, V=X.V, FSY=X.FSY, PF=window.PF;
  // 지금 방의 opts와 RPG.frame.run(방을 연 쪽이 걸어 둔 것), 왕, 소품, 엔진과 다른 바닥 그림
  let o=null, run=null, boss=null, cleared=false, entering=false, keepX=null, props=[], floorIm=null, floorPat=null, crys0=true;
  // 그림 바닥: 지금 깔고 있는 조각 캔버스와 무늬, 레일 띠(가로, 세로로 돌린 것), 명암 지도
  let floorSrc=null, artPat=null, railSrc=null, railH=null, railV=null, shade=null;
  const IM={}, img=src=>IM[src]||(IM[src]=Object.assign(new Image(),{src}));
  const pw=p=>{ if(p.art){ const m=PF.art.meta(p.art); return m?m.w*p.h/m.h:p.h*.8; } return p.im.naturalWidth?p.im.naturalWidth*p.h/p.im.naturalHeight:p.h*.8; };
  // 영웅의 옷자락(목도리·외투 사슬): index.html updChain이 init이 꺼진 점을 다음 갱신에 영웅 자리에 다시 놓는다
  const cloth=()=>{ for(const p of [...pl.scarf,...pl.coat]) p.init=false; };

  // ---- 발자리(solid 방만): 그림 소품은 그 그림이 떠 있을 때만(그리지 않는 것은 막지 않는다), 그림이 하나 뜰 때마다(PF.art.ver) 다시 만든다.
  // 지점은 목록이 바뀔 때마다: NPC는 발밑의 원(NPC_R), 그림 포탈은 b_portal_base의 foot. 영웅의 반지름은 dun.js 구역 지도와 같다(바닥 거리)
  const HERO_R=34, NPC_R=36;
  let solVer=-1, solList=null, solProps=[], solSpots=[];
  const spotFoot=new Map();
  const bx=P=>{ let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity; for(const [x,y] of P){ x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y); y1=Math.max(y1,y); } return {P,x0,x1,y0,y1}; };
  const footArt=k=>{ const m=k&&PF.art.img(k)&&PF.art.meta(k); return m&&m.foot?m:null; };
  function solids(){ if(!R.cur||!R.cur.solid) return false;
    if(solVer!==PF.art.ver){ solVer=PF.art.ver; solList=null; solProps=[];
      for(const p of props){ const m=p.art&&footArt(p.art); p.foot=m?polys(m.foot,p.x,p.y,pw(p),p.h,p.flip):null; if(p.foot) for(const P of p.foot) solProps.push(bx(P)); } }
    const L=PF.spots.list;
    if(L!==solList){ solList=L; solSpots=[]; spotFoot.clear();
      for(const s of L){ let f=null, m=null;
        if(s.kind==='npc') f=[ring(s.x,s.y,NPC_R,FSY)];
        else if(s.kind==='portal'&&(m=footArt(s.art))){ const H=s.h||PF.spots.GATE_H; f=polys(m.foot,s.x,s.y,H*m.w/m.h,H,false); }
        if(!f) continue; spotFoot.set(s,f); for(const P of f) solSpots.push(bx(P)); } }
    return true; }
  // (x,y)에서 m 안에 걸치는 발자리 다각형
  function nearFeet(x,y,m){ const L=[]; for(const b of solProps.concat(solSpots)) if(x>b.x0-m&&x<b.x1+m&&y>b.y0-m&&y<b.y1+m) L.push(b.P); return L; }
  // 지금 막고 있는 발자리 전부(시험·확인용)
  R.feet=()=>solids()?solProps.concat(solSpots).map(b=>b.P):[];
  // 그리는 차례: 발자리가 있으면 영웅 x에서의 앞쪽 가장자리(영웅이 그보다 앞이면 소품 앞에 선다), 없으면 놓인 자리 y
  function sortY(f,y){ if(!f) return y; const x=pl.x; let a=-Infinity, b=-Infinity;
    for(const P of f){ const v=frontY(P,x); let x0=Infinity, x1=-Infinity; for(const p of P){ x0=Math.min(x0,p[0]); x1=Math.max(x1,p[0]); } if(x>=x0&&x<=x1) a=Math.max(a,v); else b=Math.max(b,v); }
    return a>-Infinity?a:b; }
  // 지도 밖 어둠의 짙기(바닥의 가장자리 어둠과 같다: 경계에서 0, FADE 밖에서 .94)
  const edgeA=(d,x,y)=>Math.min(1,Math.hypot(Math.max(0,-x,x-d.w),Math.max(0,-y,y-d.h))/FADE)*.94;

  // 방을 끈다. run은 건드리지 않는다(다시 들어올 때 새 run이 이미 걸려 있다).
  // 수정은 들어오기 전 값으로 돌리되, 들어올 때 그림이 아직 받아지는 중이었으면(그 뒤 onload가 켠 값을 방이 매 화면 껐다) 그림이 다 받아졌는지로 돌린다
  const crysLoaded=()=>{ const im=SPR.crystal.im; return !!(im&&im.complete&&im.naturalWidth); };
  function off(){ if(!R.cur) return; const oo=o; document.body.classList.remove('pf-'+R.cur.id); R.cur=null; o=null; boss=null; PF.spots.clear(); if(SPR.crystal) SPR.crystal.ok=crys0||crysLoaded(); if(oo&&oo.onLeave) oo.onLeave(); }
  R.enter=function(def,opts){
    off();
    entering=true; try{ G.survStart(opts.ch); } finally{ entering=false; }
    // 서바이벌이 처음에 뿌린 적과 챕터 띠(이름·5:00), 전투 바닥의 수정 무더기를 지운다(수정은 dun.js 구역 지도와 같은 방법).
    // 수정은 나갈 때 들어오기 전 값으로 돌린다. dun.js 구역 지도가 아직 남아 있으면(전투 뒤 toMenu로 바로 들어옴) 그 지도가 끝날 때 돌려줄 값(true)이다
    V.en=[]; if(SPR.crystal){ crys0=G.dun.on||SPR.crystal.ok; SPR.crystal.ok=false; }
    for(let i=parts.length-1;i>=0;i--) if(parts[i].k==='banner') parts.splice(i,1);
    // 영웅을 지도의 시작점으로(옷자락은 새 자리에서 다시 시작), 카메라도 바로 그 자리로
    const st=clamp(def,def.start.x,def.start.y);
    pl.x=pl.home=keepX=st.x; pl.gy=st.y; cloth();
    cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-X.BODY*.6;
    R.cur=def; o=opts; run=G.frame.run; cleared=false;
    props=(def.props||[]).map(p=>({...p,prop:true,im:p.art?null:img(p.img)}));
    // 지도 가장자리의 어둠에 걸친 소품은 바닥과 같은 만큼 어둡게: 그림 바닥(dB)과 꼭대기(dT)의 어둡기(dim과 겹친다, 0.05 단위)
    for(const p of props){ const D=p.dim||0, q=v=>Math.round(v*20)/20; p.dB=q(1-(1-D)*(1-edgeA(def,p.x,p.y))); p.dT=q(1-(1-D)*(1-edgeA(def,p.x,p.y-p.h))); }
    shade=null; floorSrc=null; solVer=-1; solList=null; puddles=null;
    // 바닥: 이 챕터의 엔진 바닥(hub.js가 f_z<구역>.webp를 조명까지 넣어 그린다)과 같으면 그대로 두고, 다르면 지도 안에 깐다
    floorIm=def.floor&&def.floor!=='assets/menu/f_z'+G.hub.ZONES[opts.ch].no+'.webp'?img(def.floor):null; floorPat=null; fades=null;
    for(const f of def.foes||[]) for(let i=0;i<(f.n||1);i++){ const p=clamp(def,f.x+rand(-140,140),f.y+rand(-90,90)); X.spawn(f.type,p.x,p.y); }
    boss=def.boss?X.spawn(def.boss.type,def.boss.x,def.boss.y):null; if(boss) V.boss=boss;
    PF.spots.set(def.spots||[],opts.onSpot);
    document.body.classList.add('pf-'+def.id);
  };
  // 방을 나간다. 방이 걸어 둔 run이면 지운다(그 뒤 다른 곳이 연 전투에서 dun.js가 구역 지도를 만들게).
  // 다음 전투는 영웅을 다른 자리로 옮기므로 옷자락도 다시 시작하게 한다(방 자리에 남아 늘어나지 않게)
  R.leave=function(){ if(!R.cur) return; if(G.frame.run===run) G.frame.run=null; run=null; off(); cloth(); };
  // 다른 곳이 전투를 새로 열거나(창 안의 구역 진입·모의 전투) 끝내면(toMenu) 방도 나간다
  const ss=G.survStart; G.survStart=function(){ if(!entering) R.leave(); return ss.apply(this,arguments); };
  const se=G.survEnd; G.survEnd=function(){ R.leave(); return se.apply(this,arguments); };

  // 매 화면: 서바이벌 자체 스폰을 끄고(dun.js와 같은 값), 엔진이 움직인 뒤 영웅과 적을 지도 안에 둔다
  const upd0=update; update=function(rdt){
    if(R.cur&&G.mode!=='surv') R.leave();
    if(R.cur&&!G.paused){ V.spawn=-50; V.horde=99; V.bossDone=true; V.t=0; }
    // 적이 없는 방(마을)은 안전지대: 체력이 늘 차 있다(장비·레벨로 최대 체력이 올라도 회복 스킬이 허공에 나가지 않게)
    if(R.cur&&!(R.cur.foes&&R.cur.foes.length)&&!R.cur.boss) G.hp=G.api.maxHp();
    upd0(rdt);
    // 구역 전투 뒤 곧바로 들어오면 첫 화면에 dun.js가 stop()하며 수정을 다시 켠다. 방에 있는 동안은 늘 끈다
    if(R.cur&&SPR.crystal) SPR.crystal.ok=false;
    if(!R.cur||G.paused) return;
    const def=R.cur; let c=clamp(def,pl.x,pl.gy); pl.x=c.x; pl.gy=c.y;
    if(solids()){ const L=nearFeet(pl.x,pl.gy,HERO_R+12); if(L.length){ c=push(L,pl.x,pl.gy,HERO_R,FSY); c=clamp(def,c.x,c.y); pl.x=c.x; pl.gy=c.y; } }
    keepX=pl.x;
    for(const e of V.en){ if(e.dead) continue; c=clamp(def,e.x,e.y); e.x=c.x; e.y=c.y; }
    if(boss&&boss.dead&&!cleared){ cleared=true; if(o.onClear) o.onClear(); } };
  // index.html의 resize()는 영웅을 화면 왼쪽(pl.home)으로, 카메라를 화면 가운데로 옮긴다(폰 회전, heat.js·엔진의 해상도 조절).
  // 방에서는 제자리에 둔다. 엔진은 resize를 이벤트로도(처음 등록한 함수 그대로) 전역 이름으로도 부르므로 둘 다 받는다
  const stay=()=>{ if(!R.cur||keepX==null||lock) return; pl.x=pl.home=keepX; cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-X.BODY*.6; };
  const rs0=resize; resize=function(){ rs0.apply(this,arguments); stay(); };
  addEventListener('resize',stay);

  // ---- 그리기. 바닥: 엔진과 다른 바닥 그림, 지도 밖의 어둠(가장자리에서 FADE만큼 부드럽게 짙어진다), 가장자리의 빛 울타리
  const FADE=900, DARK='rgba(2,7,9,.94)', CLEAR='rgba(2,7,9,0)';
  // 가장자리 띠 넷(직선)과 모서리 넷(원형). 그라디언트는 월드 좌표라 방마다 한 번 만든다
  let fades=null;
  function mkFades(w,h){ const F=FADE, stop=g=>{ g.addColorStop(0,CLEAR); g.addColorStop(1,DARK); return g; };
    const lin=(ax,ay,bx,by)=>stop(ctx.createLinearGradient(ax,ay,bx,by)), rad=(x,y)=>stop(ctx.createRadialGradient(x,y,0,x,y,F));
    return [[-F,0,0,h,lin(0,0,-F,0)],[w,0,w+F,h,lin(w,0,w+F,0)],[0,-F,w,0,lin(0,0,0,-F)],[0,h,w,h+F,lin(0,h,0,h+F)],
      [-F,-F,0,0,rad(0,0)],[w,-F,w+F,0,rad(w,0)],[-F,h,0,h+F,rad(0,h)],[w,h,w+F,h+F,rad(w,h)]]; }
  // 캔버스 픽셀/월드 단위(그림을 화면 크기에 맞게 미리 줄일 때 쓴다). 1.25배 넉넉히
  const PXW=()=>S*cam.z*1.25;
  // 명암 지도(Q 월드 단위가 1칸, 지도 둘레 FADE까지): 푸르스름한 어두운 바탕에 넓은 얼룩, 밝은 길·광장(차가운 회색), 건물 밑의 어둠,
  // 가로등 바로 밑의 작은 따뜻한 빛(호박색은 불빛 가까이에만). 바닥 위에 soft-light로 한 번 겹쳐 같은 조각의 반복을 가리고 길을 드러낸다
  const Q=16;
  function mkShade(d){ const M=FADE, cv=document.createElement('canvas'); cv.width=Math.ceil((d.w+2*M)/Q); cv.height=Math.ceil((d.h+2*M)/Q);
    const g=cv.getContext('2d'); g.fillStyle='rgb(92,98,101)'; g.fillRect(0,0,cv.width,cv.height); g.setTransform(1/Q,0,0,1/Q,M/Q,M/Q);
    let sd=0x2545F491; const rnd=()=>{ sd^=sd<<13; sd^=sd>>>17; sd^=sd<<5; return (sd>>>0)/4294967296; };
    const blob=(x,y,r,c,a,sy=1)=>{ g.save(); g.translate(x,y); g.scale(1,sy); const q=g.createRadialGradient(0,0,0,0,0,r); q.addColorStop(0,`rgba(${c},${a})`); q.addColorStop(1,`rgba(${c},0)`); g.fillStyle=q; g.fillRect(-r,-r,2*r,2*r); g.restore(); };
    for(let i=0;i<300;i++){ const v=rnd()<.5?55:150; blob(rnd()*(d.w+2*M)-M,rnd()*(d.h+2*M)-M,180+rnd()*620,`${v},${v+4},${v+5}`,.26,.6); }
    g.lineCap='round';
    // 길: 넓고 밝은 보도 띠 위에, 가운데 차도는 어둡고 젖은 색(배수로 줄 사이). 광장은 밝게
    const road=(k,c,a)=>{ for(const [x0,y0,x1,y1,hw] of d.streets||[]){ g.strokeStyle=`rgba(${c},${a})`; g.lineWidth=hw*2*k; g.beginPath(); g.moveTo(x0,y0); g.lineTo(x1,y1); g.stroke(); } };
    road(1.7,'172,180,182',.22); road(1.3,'172,180,182',.3);
    for(const [x,y,rx,ry] of d.plazas||[]) blob(x,y,rx,'172,180,182',.5,ry/rx);
    road(.78,'34,46,52',.42);
    for(const p of props) if(p.art&&p.h>=800) blob(p.x,p.y-p.h*.14,pw(p)*.62,'26,31,33',.55,.42);
    for(const p of props) if(p.light) blob(p.x,p.y+30,300,'214,176,124',.42,.6);
    for(const s of d.spots||[]) if(s.kind==='portal') blob(s.x,s.y+60,620,'150,196,186',.45,.6);
    return cv; }
  // 가로등 불빛 웅덩이와 젖은 바닥에 길게 비친 불빛(한 번 만든 그림을 더한다): 넓고 흐린 번짐과 가운데의 가늘고 밝은 줄
  let poolIm=null, streakIm=null, coreIm=null, puddles=null;
  function mkGlows(){ const mk=(w,h,f)=>{ const c=document.createElement('canvas'); c.width=w; c.height=h; f(c.getContext('2d'),w,h); return c; };
    poolIm=mk(128,128,(g,w)=>{ const q=g.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2); q.addColorStop(0,'rgba(255,196,128,.9)'); q.addColorStop(.35,'rgba(255,170,96,.35)'); q.addColorStop(1,'rgba(255,150,80,0)'); g.fillStyle=q; g.fillRect(0,0,w,w); });
    const streak=(c0,c1,c2)=>(g,w,h)=>{ const v=g.createLinearGradient(0,0,0,h); v.addColorStop(0,`rgba(${c0},0)`); v.addColorStop(.08,`rgba(${c0},.9)`); v.addColorStop(.4,`rgba(${c1},.5)`); v.addColorStop(1,`rgba(${c2},0)`); g.fillStyle=v; g.fillRect(0,0,w,h);
      g.globalCompositeOperation='destination-in'; const x=g.createLinearGradient(0,0,w,0); x.addColorStop(0,'rgba(0,0,0,0)'); x.addColorStop(.5,'rgba(0,0,0,1)'); x.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=x; g.fillRect(0,0,w,h); };
    streakIm=mk(64,256,streak('255,200,140','255,180,110','255,170,100'));
    coreIm=mk(16,256,streak('255,236,200','255,206,150','255,190,120')); }
  // 빗물 웅덩이(d.puddles [x,y,rx,ry]): 방마다 한 번, 웅덩이마다 작은 캔버스(월드 1단위 = PQ px)에 미리 그린다.
  // 겹친 타원 몇 개로 된 모양에 어둡고 매끈한 물(먼 쪽은 흐린 하늘빛), 가까운 가로등의 세로 반사(길바닥보다 진하다), 먼 쪽 가장자리의 얇은 반짝임
  const PQ=.5;
  function mkPuddles(d){ let sd=0x9E3779B9; const rnd=()=>{ sd^=sd<<13; sd^=sd>>>17; sd^=sd<<5; return (sd>>>0)/4294967296; };
    const lamps=props.filter(p=>p.light);
    return (d.puddles||[]).map(([x,y,rx,ry])=>{ const W=Math.ceil(rx*2*PQ)+8, H=Math.ceil(ry*2*PQ)+8, mk=()=>{ const c=document.createElement('canvas'); c.width=W; c.height=H; return [c,c.getContext('2d')]; };
      const [sh,s]=mk(); s.filter='blur(2px)'; s.fillStyle='#fff';
      for(let i=0;i<6;i++){ const ex=(rnd()-.5)*rx*.9, ey=(rnd()-.5)*ry*.6, a=rx*(.32+rnd()*.3), b=ry*(.45+rnd()*.35); s.beginPath(); s.ellipse(W/2+ex*PQ,H/2+ey*PQ,a*PQ,b*PQ,(rnd()-.5)*.2,0,TAU); s.fill(); }
      const [c,g]=mk(), q=g.createLinearGradient(0,0,0,H);
      q.addColorStop(0,'rgba(120,138,142,.5)'); q.addColorStop(.3,'rgba(12,18,21,.46)'); q.addColorStop(1,'rgba(6,10,12,.42)'); g.fillStyle=q; g.fillRect(0,0,W,H);
      // 빗방울 물결 몇 개(가는 고리)
      g.lineWidth=1; for(let i=0;i<4;i++){ const ex=(rnd()-.5)*rx*1.1*PQ, ey=(rnd()-.5)*ry*.7*PQ, rr=(10+rnd()*14)*PQ*2; g.strokeStyle=`rgba(190,206,210,${.16+rnd()*.12})`; g.beginPath(); g.ellipse(W/2+ex,H/2+ey,rr,rr*.32,0,0,TAU); g.stroke(); }
      for(const l of lamps){ const dx=l.x-x; if(Math.abs(dx)>rx+40||l.y>y+ry||y-l.y>1000) continue; const cx=W/2+dx*PQ, k=.35+.65*(1-Math.max(0,y-l.y)/1000), hw=Math.max(5,22*PQ);
        const v=g.createLinearGradient(cx-hw,0,cx+hw,0); v.addColorStop(0,'rgba(255,186,118,0)'); v.addColorStop(.5,`rgba(255,214,160,${.85*k})`); v.addColorStop(1,'rgba(255,186,118,0)'); g.fillStyle=v; g.fillRect(cx-hw,0,2*hw,H); }
      g.globalCompositeOperation='destination-in'; g.drawImage(sh,0,0);
      const [rc,r]=mk(); r.drawImage(sh,0,0); r.globalCompositeOperation='destination-out'; r.drawImage(sh,0,2); r.globalCompositeOperation='source-in'; r.fillStyle='rgba(170,186,190,.32)'; r.fillRect(0,0,W,H);
      g.globalCompositeOperation='source-over'; g.drawImage(rc,0,0);
      return {x,y,c}; }); }
  // 길 가장자리의 배수로(d.curbs [x0,y0,x1,y1,보도 쪽], 가로나 세로): 넓고 옅은 젖은 홈과 가운데의 짙은 줄, 보도 쪽 연석 돌(이음매마다 끊긴다),
  // 일정 간격의 빗물받이 쇠창살
  function curbs(d,X0,Y0,X1,Y1){
    for(const [x0,y0,x1,y1,side=1] of d.curbs||[]){ const hz=y0===y1, a=hz?Math.max(Math.min(x0,x1),X0):Math.max(Math.min(y0,y1),Y0), e=hz?Math.min(Math.max(x0,x1),X1):Math.min(Math.max(y0,y1),Y1);
      if(e<=a||(hz?y0<Y0||y0>Y1:x0<X0||x0>X1)) continue;
      const line=(o,wd,c,t0=a,t1=e)=>{ ctx.fillStyle=c; if(hz) ctx.fillRect(t0,y0+o-wd/2,t1-t0,wd); else ctx.fillRect(x0+o-wd/2,t0,wd,t1-t0); };
      line(side*4,30,'rgba(2,6,9,.2)'); line(0,9,'rgba(2,6,9,.42)');
      for(let t=Math.floor(a/110)*110;t<e;t+=110) line(-side*13,11,'rgba(168,180,184,.1)',Math.max(a,t+4),Math.min(e,t+106));
      for(let t=Math.ceil(a/640)*640;t<e;t+=640){ ctx.fillStyle='rgba(0,0,0,.55)'; if(hz) ctx.fillRect(t-30,y0-7,60,14); else ctx.fillRect(x0-8,t-34,16,68);
        ctx.fillStyle='rgba(150,170,176,.16)'; for(let i=-2;i<=2;i++){ if(hz) ctx.fillRect(t+i*11-1.5,y0-5,3,10); else ctx.fillRect(x0-6,t+i*12-1.5,12,3); } } } }
  // 그림 바닥: 포장 조각을 화면 크기로 줄여 깔고(지도 밖까지, 어둠이 덮는다), 레일 띠, 명암 지도, 가로등 불빛. 바닥 그림이 아직 없으면 false
  function artFloor(d,X0,Y0,X1,Y1){ const im=PF.art.img(d.floorArt); if(!im) return false;
    const k=PXW(), s=d.floorScale||1, nw=im.naturalWidth, nh=im.naturalHeight, src=PF.art.tile(d.floorArt,nw*s*k,nh*s*FSY*k);
    if(src!==floorSrc){ floorSrc=src; artPat=ctx.createPattern(src,'repeat'); artPat.setTransform(new DOMMatrix().scale(nw*s/src.width,nh*s*FSY/src.height)); }
    ctx.fillStyle=artPat; ctx.fillRect(X0,Y0,X1-X0,Y1-Y0);
    const ri=d.rail&&PF.art.img(d.rail);
    if(ri&&d.rails){ const rw=ri.naturalWidth*s, rh=ri.naturalHeight*s, rs=PF.art.tile(d.rail,rw*k,rh*k);
      if(rs!==railSrc){ railSrc=rs; railH=ctx.createPattern(rs,'repeat-x'); const v=document.createElement('canvas'); v.width=rs.height; v.height=rs.width;
        const g=v.getContext('2d'); g.translate(v.width,0); g.rotate(Math.PI/2); g.drawImage(rs,0,0); railV=ctx.createPattern(v,'repeat-y'); railV.cw=v.width; railV.ch=v.height; }
      for(const [x0,y0,x1,y1] of d.rails){
        if(y0===y1){ const b=rh*FSY, a=Math.max(x0,X0), e=Math.min(x1,X1); if(e<=a||y0+b<Y0||y0-b>Y1) continue;
          railH.setTransform(new DOMMatrix().translate(0,y0-b/2).scale(rw/rs.width,b/rs.height)); ctx.fillStyle=railH; ctx.fillRect(a,y0-b/2,e-a,b); }
        else { const a=Math.max(y0,Y0), e=Math.min(y1,Y1); if(e<=a||x0+rh<X0||x0-rh>X1) continue;
          railV.setTransform(new DOMMatrix().translate(x0-rh/2,0).scale(rh/railV.cw,rw*FSY/railV.ch)); ctx.fillStyle=railV; ctx.fillRect(x0-rh/2,a,rh,e-a); } } }
    if(!shade) shade=mkShade(d);
    ctx.globalCompositeOperation='soft-light'; ctx.drawImage(shade,-FADE,-FADE,shade.width*Q,shade.height*Q);
    ctx.globalCompositeOperation='source-over';
    if(!puddles) puddles=mkPuddles(d);
    for(const p of puddles){ const w=p.c.width/PQ, h=p.c.height/PQ; if(p.x+w/2<X0||p.x-w/2>X1||p.y+h/2<Y0||p.y-h/2>Y1) continue; ctx.drawImage(p.c,p.x-w/2,p.y-h/2,w,h); }
    curbs(d,X0,Y0,X1,Y1);
    if(!poolIm) mkGlows();
    ctx.globalCompositeOperation='lighter';
    // 건물이 젖은 바닥에 흐릿하게 비친다(밝은 창과 등만 눈에 띄게 남는다)
    ctx.globalAlpha=.66;
    for(const p of props){ if(!p.art||p.h<800) continue; const w=pw(p), h=p.h; if(p.x+w/2<X0||p.x-w/2>X1||p.y>Y1||p.y+h*.5<Y0) continue;
      const r=PF.art.refl(p.art,w*k,h*k,p.dB); if(!r) continue;
      if(p.flip){ ctx.save(); ctx.translate(p.x,0); ctx.scale(-1,1); ctx.drawImage(r,-w/2,p.y-6,w,h*.5); ctx.restore(); }
      else ctx.drawImage(r,p.x-w/2,p.y-6,w,h*.5); }
    ctx.globalAlpha=1;
    // 가로등: 발밑의 작은 불빛과, 젖은 바닥에 길게 내려 비친 불빛(넓은 번짐 + 가운데의 밝은 줄)
    for(const p of props){ if(!p.light||p.x<X0-400||p.x>X1+400||p.y<Y0-200||p.y-p.h>Y1) continue;
      const h=p.h, f=.5+.04*Math.sin(RT*1.3+p.x);
      ctx.globalAlpha=.3*f; ctx.drawImage(poolIm,p.x-250,p.y+20-250*FSY,500,500*FSY);
      ctx.globalAlpha=.62*f; ctx.drawImage(streakIm,p.x-60,p.y-10,120,h*1.15);
      ctx.globalAlpha=.7*f; ctx.drawImage(coreIm,p.x-9,p.y-4,18,h*.9); }
    ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    return true; }
  function floor(){ const d=R.cur, c=d.accent||'#7FF3FF', {hw,hh}=X.view(), F=FADE;
    const X0=cam.x-hw-400, X1=cam.x+hw+400, Y0=cam.y-hh-400, Y1=cam.y+hh+400;
    if(!(d.floorArt&&artFloor(d,X0,Y0,X1,Y1))&&floorIm&&floorIm.naturalWidth){ if(!floorPat){ floorPat=ctx.createPattern(floorIm,'repeat'); floorPat.setTransform(new DOMMatrix().scale(1,FSY)); } ctx.fillStyle=floorPat; ctx.fillRect(0,0,d.w,d.h); }
    if(X0<0||X1>d.w||Y0<0||Y1>d.h){
      if(!fades) fades=mkFades(d.w,d.h);
      for(const [a,b,e,f,g] of fades) if(e>X0&&a<X1&&f>Y0&&b<Y1){ ctx.fillStyle=g; ctx.fillRect(a,b,e-a,f-b); }
      ctx.fillStyle=DARK;
      if(X0<-F) ctx.fillRect(X0,Y0,-F-X0,Y1-Y0);
      if(X1>d.w+F) ctx.fillRect(d.w+F,Y0,X1-d.w-F,Y1-Y0);
      if(Y0<-F) ctx.fillRect(-F,Y0,d.w+2*F,-F-Y0);
      if(Y1>d.h+F) ctx.fillRect(-F,d.h+F,d.w+2*F,Y1-d.h-F); }
    if(d.fence!==false){ fx.strokeStyle=hexA(c,.3); fx.lineWidth=4; fx.setLineDash([60,40]); fx.lineDashOffset=RT*40; fx.strokeRect(0,0,d.w,d.h); fx.setLineDash([]); } }
  // 소품: 그림자, 영웅이 키 큰 소품 뒤에 가면 비쳐 보임(dun.js와 같다).
  // 그림 소품은 화면 크기로 줄인 캔버스를 그린다(flip 좌우 뒤집기, dim 어둡게). 그림이 아직 없으면 그리지 않는다. 가로등은 등불에 은은한 빛
  function drawProp(p){ const w=pw(p), h=p.h; let im=p.im;
    if(p.art) im=PF.art.fit(p.art,w*PXW(),h*PXW(),p.dB,p.dT);
    else if(!im.complete||!im.naturalWidth) im=null;
    if(!im) return;
    const rx=w*.34;
    if(p.art&&h>=800){ ctx.fillStyle='rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(p.x,p.y-h*.1,w*.46,h*.12,0,0,TAU); ctx.fill(); }
    else { ctx.fillStyle='rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(p.x,p.y,rx*1.18,rx*FSY*.62*1.25,0,0,TAU); ctx.fill(); }
    ctx.globalAlpha=p.sy>pl.gy&&p.y-h*.92<pl.gy-40&&Math.abs(pl.x-p.x)<w*.42?.42:1;
    if(p.flip){ ctx.save(); ctx.translate(p.x,0); ctx.scale(-1,1); ctx.drawImage(im,-w/2,p.y-h,w,h); ctx.restore(); }
    else ctx.drawImage(im,p.x-w/2,p.y-h,w,h);
    ctx.globalAlpha=1;
    if(p.light) glow(fx,p.x+(p.flip?-1:1)*w*.02,p.y-h*.8,120,'#FFB874',.28); }
  // 화면에 걸리는 소품과 지점을 한 줄로 y 순서로. 영웅·적 사이사이에 끼워 그린다
  // 항목은 [그리는 차례 y, 소품이나 지점]. 발자리가 있는 방이면 차례는 sortY(영웅 x에서의 앞쪽 가장자리)
  const vis=[]; let vi=0;
  function visible(){ vis.length=0; const {hw,hh}=X.view(), sol=solids();
    for(const p of props){ const w=pw(p); if(p.x+w<cam.x-hw-200||p.x-w>cam.x+hw+200||p.y<cam.y-hh-200||p.y-p.h>cam.y+hh+200) continue; p.sy=sol?sortY(p.foot,p.y):p.y; vis.push([p.sy,p]); }
    for(const s of PF.spots.list) vis.push([sol?sortY(spotFoot.get(s),s.y):s.y,s]);
    vis.sort((a,b)=>a[0]-b[0]); vi=0; }
  function drawUpTo(y){ while(vi<vis.length&&vis[vi][0]<y){ const q=vis[vi++][1]; if(q.prop) drawProp(q); else PF.spots.draw(q); } }
  const on=()=>R.cur&&G.mode==='surv';
  const prep0=drawBackground_prep; drawBackground_prep=function(){ prep0(); if(!on()) return; applyCam(ctx); applyCam(fx); floor(); ctx.setTransform(1,0,0,1,0,0); };
  const de0=drawEnemy; drawEnemy=function(){ if(on()) visible(); de0(); if(on()) drawUpTo(pl.gy??0); };
  const dp0=drawPlayer; drawPlayer=function(){ dp0(); if(on()) drawUpTo(1e9); };
  const fd0=G.foeDraw; G.foeDraw=function(e){ if(on()) drawUpTo(e.y); return fd0?fd0(e):false; };

  PF.room=R;
}

if(typeof module!=='undefined') module.exports=R;
})();
