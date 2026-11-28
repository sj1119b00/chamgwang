// 길 (설계 17.9 "길"): 장소 사이는 걸어서 넘어간다. 지도 가장자리의 길 끝 자리에 들어서면 다음 장소의 맞은편 길로 들어선다(누를 것 없음).
// 장소 id는 'town', 'z0' … 'z<COUNT-1>'. 길 이름은 마을 east, 구역 in(입구 길, 앞 장소로)·out(왕의 방 너머 길, 다음 구역으로. 그 구역을 제압해야 열린다).
// 빠른 이동: 한 번 들른 곳(story.visited)은 마을 관문과 각 야영지 관문에서 고른다.
// 순수 부분(next, open, arm, portals, solid, route, ends)은 node 시험(frame/test/road.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 challenge 다음에 붙인다
(function(){
'use strict';
const zoneOf=p=>{ const m=/^[zv](\d+)$/.exec(p); return m?+m[1]:-1; };
// 그 길로 나가면 닿는 장소와 도착하는 길. 없으면 null
function next(place,exit,count){
  if(place==='town') return exit==='east'&&count>0?{place:'v0',arrive:'in'}:null;
  const z=zoneOf(place); if(z<0||z>=count) return null;
  if(place[0]==='v'){
    if(exit==='in') return z?{place:'v'+(z-1),arrive:'next'}:{place:'town',arrive:'east'};
    if(exit==='field') return {place:'z'+z,arrive:'in'};
    if(exit==='next'&&z+1<count) return {place:'v'+(z+1),arrive:'in'};
  }else if(exit==='in'||exit==='out') return {place:'v'+z,arrive:exit==='out'?'return':'field'};
  return null; }
// 나가는 길(out)은 그 구역을 제압했을 때만 열린다
const open=(story,place,exit)=>exit!=='out'||(story.cleared||0)>zoneOf(place);
// 도착한 자리가 길 끝 안이면 꺼 둔다: 영웅이 그 자리 밖으로 한 번 나가야 켜지고, 켜지면 그대로
const arm=(armed,pos,mouth)=>armed||Math.hypot(pos.x-mouth.x,pos.y-mouth.y)>mouth.r;
// 빠른 이동으로 갈 수 있는 곳: 마을과 들른 구역(구역 번호 차례). visited가 생기기 전의 저장도 깬 구역(cleared 아래)은 들른 곳으로 본다.
// count(구역 수)를 주면 그 밖의 id는 뺀다
const portals=(story,count=Infinity)=>{ const v=story&&story.visited||{}, n=Math.min(story&&story.cleared||0,count), Z=new Set();
  for(let z=0;z<n;z++) Z.add(z);
  for(const k of Object.keys(v)){ const z=zoneOf(k); if(v[k]&&z>=0&&z<count) Z.add(z); }
  return ['town',...[...Z].sort((a,b)=>a-b).map(z=>'z'+z)]; };

// ---- 구역 지도(dun.js build의 M: B, arena, plazas, nodes, grid·key·C)의 길 끝. fsy는 바닥 납작 비율(surv.js FSY)
// 영웅 반지름(dun.js collide의 pushOut 34), 걸어 닿는지 보는 격자 간격
const HERO=34, STEP=50;
// 그 자리에 선 영웅을 dun.js가 밀어내는가(pushOut, collide와 같은 규칙): 지도 경계(안쪽 80, 아래 60), 그 칸(M.grid)의 소품 발자리(반지름을 더한 타원),
// 남은 신호 노드(바닥 거리 170), 왕의 방 벽(둘레 ±70. gap: 문이 열려 남쪽 틈 ±.32rad가 비었다)
function solid(M,x,y,fsy,gap){ const B=M.B;
  if(M.roomBlocked) return M.roomBlocked(x,y);
  if(x<B.l+80||x>B.r-80||y<B.t+80||y>B.b-60) return true;
  if(M.regional?.terrain.some(t=>Math.hypot((x-t.x)/(t.rx+HERO),(y-t.y)/(t.ry+HERO*fsy))<1)) return true;
  const L=M.grid.get(M.key(Math.floor(x/M.C),Math.floor(y/M.C)));
  if(L) for(const p of L) if(Math.hypot((x-p.x)/(p.rx+HERO),(y-p.y)/(p.ry+HERO*fsy))<1) return true;
  for(const n of M.nodes||[]) if(!n.done&&n.e&&Math.hypot(x-n.x,(y-n.y)/fsy)<170) return true;
  const a=M.arena, dx=x-a.x, dy=(y-a.y)/fsy;
  return Math.abs(Math.hypot(dx,dy)-(a.design?globalThis.PF.regionMaps.radius(a,Math.atan2(dy,dx)):a.r))<(a.design?112:70)&&!(gap&&Math.abs(Math.atan2(dy,dx)-Math.PI/2)<.32); }
// (x0,y0)에서 걸어 닿는 칸(STEP 격자, 네 방향). 칸 k의 자리 px(k),py(k), 온 칸 prev[k](-1: 출발 칸, -2: 닿지 않음)
function reach(M,x0,y0,fsy,gap){ const B=M.B, X=B.l+80, Y=B.t+80, nx=Math.floor((B.r-80-X)/STEP)+1, ny=Math.floor((B.b-60-Y)/STEP)+1, N=nx*ny;
  const px=k=>X+k%nx*STEP, py=k=>Y+Math.floor(k/nx)*STEP, free=new Int8Array(N).fill(-1), prev=new Int32Array(N).fill(-2), q=new Int32Array(N);
  const ok=k=>free[k]<0?(free[k]=solid(M,px(k),py(k),fsy,gap)?0:1):free[k];
  // 출발 칸: 그 자리 둘레 7×7칸 가운데 가장 가까운 빈 칸
  const ci=Math.round((x0-X)/STEP), cj=Math.round((y0-Y)/STEP); let s=-1, sd=Infinity, h=0, t=0;
  for(let j=Math.max(0,cj-3);j<=Math.min(ny-1,cj+3);j++) for(let i=Math.max(0,ci-3);i<=Math.min(nx-1,ci+3);i++){ const k=j*nx+i, d=Math.hypot(px(k)-x0,py(k)-y0); if(d<sd&&ok(k)){ sd=d; s=k; } }
  if(s>=0){ prev[s]=-1; q[t++]=s; }
  while(h<t){ const k=q[h++], i=k%nx;
    for(const n of [i>0?k-1:-1,i<nx-1?k+1:-1,k-nx,k+nx]) if(n>=0&&n<N&&prev[n]===-2&&ok(n)){ prev[n]=k; q[t++]=n; } }
  return {N,px,py,prev}; }
// (x0,y0)에서 (x1,y1)까지 걸어가는 꺾임점들(첫 점은 출발 칸, 끝 점은 도착 칸). 도착 자리 둘레(STEP 안)에 닿는 칸이 없으면 null
function route(M,x0,y0,x1,y1,fsy,gap){ const G=reach(M,x0,y0,fsy,gap); let e=-1, ed=Infinity;
  for(let k=0;k<G.N;k++){ if(G.prev[k]===-2) continue; const d=Math.hypot(G.px(k)-x1,G.py(k)-y1); if(d<ed){ ed=d; e=k; } }
  if(e<0||ed>(M.roomBlocked?240:STEP)) return null;
  const L=[]; for(let k=e;k>=0;k=G.prev[k]) L.push({x:G.px(k),y:G.py(k)});
  L.reverse();
  return L.filter((p,i)=>i===0||i===L.length-1||(L[i-1].x-p.x)*(L[i+1].y-p.y)!==(L[i-1].y-p.y)*(L[i+1].x-p.x)); }
// 관문 기둥 사이 반폭(spots.js가 기둥 사이에 문·빛막을 그린다), 나가는 길의 문이 왕의 방 벽 안쪽으로 들어온 거리(바닥 거리),
// 입구 길 원과 안전지대 가장자리 사이 가장 짧은 틈, 입구 길 원과 시작점→노드·왕의 방 직선 사이 가장 짧은 틈
const GW=210, DOOR=200, SAFE_GAP=300, LINE_GAP=100;
// 점(x,y)과 선분 a→b 사이 거리
const segD=(x,y,a,b)=>{ const dx=b.x-a.x, dy=b.y-a.y, t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1))); return Math.hypot(x-a.x-dx*t,y-a.y-dy*t); };
// 길 끝 둘 {x,y(가운데), dir(밖으로 나가는 쪽, 바닥 거리의 단위 벡터), ue(가운데에서 관문 줄까지, 바닥 거리), posts(관문 기둥 둘의 자리, 없으면 null)}.
// 시작점에서 걸어 닿는 칸(왕의 방 문이 열린 지도) 가운데:
//  in  지도 아래 가장자리(시작점에서 왕의 방 반대쪽). 야영지로 물러나는 길에 밟히지 않게 원이 안전지대 가장자리에서 SAFE_GAP 넘게 떨어지고,
//      첫 노드의 반대쪽(가로), 시작점에서 노드·왕의 방으로 가는 직선에서 LINE_GAP 넘게 떨어진다. 기둥은 아래 가장자리 줄에(가장자리에 붙었을 때)
//  out 왕의 방 뒤쪽(지도 위 가장자리 쪽) 벽의 문. 왕의 방 뒤와 지도 위 가장자리 사이는 300 남짓이고 왕의 방 둘레의 표지 건물이 서 있어,
//      거기 둔 길 끝은 가운데 건물 뒤에 가려 화면 맨 위에 걸린다. 그래서 벽 안쪽에 두고 기둥은 그 자리의 벽 위에 세운다.
//      북쪽 가운데의 왕좌 그림을 비켜 동쪽(막혔거나 닿지 않으면 서쪽). 왕의 방 문이 열려야(왕의 문이 열리고, 제압하면 늘) 닿는다
function ends(M,fsy,o){ const st=M.plazas.find(p=>p.k==='start'), a=M.arena, B=M.B, r=o.r, G=reach(M,st.x,st.y,fsy,true);
  const got=(x,y)=>{ for(let k=0;k<G.N;k++) if(G.prev[k]!==-2&&Math.abs(G.px(k)-x)<=STEP&&Math.abs(G.py(k)-y)<=STEP) return true; return false; };
  const n0=(M.nodes||[])[0], side=n0&&n0.x<st.x?1:-1;
  const safe=(x,y)=>Math.hypot(x-st.x,y-st.y)>=o.safe+SAFE_GAP+r&&[...(M.nodes||[]),a].every(q=>segD(x,y,st,q)>r+LINE_GAP);
  const pick=(tx,ty,...want)=>{ for(const f of want){ let b=null, bd=Infinity;
    for(let k=0;k<G.N;k++){ if(G.prev[k]===-2) continue; const x=G.px(k), y=G.py(k), d=Math.hypot(x-tx,y-ty); if(d<bd&&f(x,y)){ bd=d; b={x,y}; } }
    if(b) return b; } return null; };
  // 그런 칸이 없으면(입구 길이 없는 구역은 만들지 않는다) 틈 없이 안전지대 밖의 가장 가까운 닿는 칸, 경고 한 번(지도마다 한 번 불린다)
  const approach=st.x+side*Math.min(3500,(B.r-B.l)*.36);
  let c=pick(approach,B.b-70,(x,y)=>y>=B.b-160&&safe(x,y));
  // Share the exact surveyed junction with the village, including the coordinates used on the printed atlas.
  if(M.regional&&!solid(M,approach,B.b-100,fsy,true)&&got(approach,B.b-100)&&safe(approach,B.b-100)) c={x:approach,y:B.b-100};
  if(!c){ c=pick(approach,B.b-70,(x,y)=>Math.hypot(x-st.x,y-st.y)>=o.safe+r+40);
    console.warn('frame/road.js: 입구 길 자리를 안전지대에서 '+SAFE_GAP+' 떨어진 아래 가장자리에 두지 못해 안전지대 바로 밖에 둔다',c); }
  const inM=c&&{x:c.x,y:c.y,dir:[0,1],ue:(B.b-c.y)/fsy,posts:c.y>=B.b-160?[[c.x-GW,B.b],[c.x+GW,B.b]]:null};
  // 벽 위의 자리(왕의 방 가운데에서 바닥 거리 rr, 북쪽에서 각 t)
  const th=(M.props||[]).find(p=>p.throne), half=th?th.w()/2:0, rr=a.r-DOOR, wall=(d,t)=>[a.x+d*Math.sin(t),a.y-d*Math.cos(t)*fsy];
  // Find the rear opening on the authored wall, outside the throne's footprint.
  const radius=t=>a.design?globalThis.PF.regionMaps.radius(a,t-Math.PI/2):a.r;
  const t0=Math.asin(Math.min(.9,(half+GW+60)/rr));
  for(const angle of [t0,.67,.83,1.02,1.18]) for(const side of [1,-1]){
    const t=side*angle,radiusHere=radius(t),[x,y]=wall(radiusHere-DOOR,t);
    if(solid(M,x,y,fsy,true)||!got(x,y)) continue;
    const left=t-GW/radiusHere,right=t+GW/radiusHere;
    return {in:inM,out:{x,y,dir:[Math.sin(t),-Math.cos(t)],ue:DOOR,posts:[wall(radius(left),left),wall(radius(right),right)]}};
  }
  return {in:inM,out:null}; }
const R={next,open,arm,portals,solid,route,ends};

// ---- 브라우저: boot.js가 challenge 다음에 붙인다. 전역 update, drawBackground_prep, applyCam, ctx, fx, pl, cam, RT, glow, hexA(index.html·엔진)를 쓴다
if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, X=G.sv, V=X.V, FSY=X.FSY, PF=window.PF, F=PF.field;
  const HC='#7FF3FF', RD='#E2513F';
  // 구역 길 끝의 반경(마을은 자료의 r), 도착할 때 길 끝 가운데에서 안쪽으로 들어선 거리(반경의 몫), 넘어간 뒤 영웅을 묶어 두는 시간(초, 화면 전환과 같다),
  // 닫힌 길 대사 사이의 가장 짧은 시간(초, secret.js 닫힌 통로와 같다), 길 끝 안에 머물러야 발동하는 시간(게임 초: 가장자리를 스치면 발동하지 않고,
  // 걸음 430/초로 반경 200 길 끝 가운데를 지나가는 데는 이보다 오래 걸린다)
  const ZR=200, IN=.5, FREEZE=.4, SHUT_GAP=3.5, DWELL=.35;
  const SHUT={text:'왕의 방 너머 통로는 제압 후에 열립니다.'};
  const story=()=>PF.save.data.story;
  const seen=()=>{ const s=story(); return s.visited||(s.visited={}); };
  // 지금 장소 id(마을·사냥터가 아니면 null)
  const here=()=>{ const P=PF.place.cur,r=G.frame.run; return P==='town'?'town':P==='village'&&r?'v'+r.zone:P==='field'&&r&&r.kind==='field'?'z'+r.zone:null; };
  // 장소 이름: 마을, 구역은 hub.js ZONES의 이름(마지막 구역은 남부 관제시설). title은 도착 표시·빠른 이동 목록(challenge.js 결과 창과 같은 모양)
  const Zs=()=>G.hub.ZONES, named=p=>p!=='town'&&zoneOf(p)<Zs().length;
  const name=p=>p==='town'?'마을':(named(p)?Zs()[zoneOf(p)].name:'남부 관제시설')+(p[0]==='v'?' 마을':'');
  const title=p=>named(p)?Zs()[zoneOf(p)].no+'구역 · '+name(p):name(p);
  // 받침 없는 끝 글자와 ㄹ 받침은 '로', 그 밖의 받침은 '으로'
  const ro=s=>{ const c=s.charCodeAt(s.length-1)-0xAC00; return s+(c>=0&&c<11172&&c%28&&c%28!==8?'으로':'로'); };

  // ---- 지금 장소의 길 끝. 구역 지도의 자리는 지도마다 한 번(ends)
  const ENDS=new WeakMap();
  const endsOf=M=>{ let E=ENDS.get(M); if(!E){ E=ends(M,FSY,{safe:F.safeZones[0].r,r:ZR}); ENDS.set(M,E); } return E; };
  R.surveyDoors=M=>F.M===M&&F.safeZones[0]?endsOf(M):null;
  // 길 끝 하나: 나가면 닿는 곳(to), 이름표(그곳 이름 + 로), 열렸는지, 그리고 그리기 값(c: ends의 dir·ue·posts. 마을 길은 동쪽, 관문 기둥 없음)
  function mouth(p,exit,r,c){ const n=next(p,exit,F.COUNT);
    // 앱을 숨기면 제압 기록이 경험치 회수보다 먼저 저장된다. 현재 판의 뒷문은 회수가 끝난 뒤 열린다.
    const pass=exit==='field'?!PF.regionMaps.villageObjective(zoneOf(p)):exit==='next'?(PF.quest?.canDepart?.(zoneOf(p))??story().cleared>zoneOf(p)):open(story(),p,exit)&&(exit!=='out'||!settling()&&!kingUp());
    const dest=p[0]==='v'&&exit==='field'?PF.regionMaps.read(PF.regionMaps.number(zoneOf(p)),'field').name:name(n.place);
    return {exit,x:c.x,y:c.y,r,to:n.place,label:ro(dest),open:pass,dir:c.dir,ue:c.ue,posts:c.posts}; }
  function list(){ const p=here(); if(!p) return [];
    if(p==='town'||p[0]==='v') return (PF.room.cur?.roads||[]).filter(m=>next(p,m.exit,F.COUNT)).map(m=>mouth(p,m.exit,m.r,{x:m.x,y:m.y,dir:m.dir||[1,0],ue:m.r,posts:null}));
    const M=F.M; if(!M) return [];
    const E=endsOf(M), L=[];
    for(const exit of ['in','out']) if(E[exit]&&next(p,exit,F.COUNT)) L.push(mouth(p,exit,ZR,E[exit]));
    return L; }
  R.mouths=()=>list().map(({exit,x,y,r,label,open,to})=>({exit,x,y,r,label,open,to}));
  // 길 끝 바로 안쪽(나가는 쪽의 반대로 반경의 IN만큼, 아직 길 끝 안). 구역 지도에서 그 자리가 막혀 있으면 길 끝 가운데(걸어 닿는 칸)
  function inside(m,M){ const x=m.x-m.dir[0]*m.r*IN, y=m.y-m.dir[1]*m.r*IN; return M&&solid(M,x,y,FSY,true)?{x:m.x,y:m.y}:{x,y}; }
  // field.js begin이 opts.arrive(in·out)로 들어온 판의 첫 화면에 영웅을 세우는 자리
  R.arrival=(M,exit)=>{ const c=endsOf(M)[exit]; return c?inside({...c,r:ZR},M):null; };
  // 지금 구역 지도에서 걸어가는 꺾임점들(순수 route를 지금 지도·왕의 방 문 상태로). 구역 밖이면 null
  R.walk=(x0,y0,x1,y1)=>{ const M=F.M;
    if(M) return route(M,x0,y0,x1,y1,FSY,!!((M.gate||M.free)&&!M.king));
    if(PF.place.cur==='village'&&PF.room.cur){
      const room=PF.room.cur;
      const footprints=PF.room.feet().map(poly=>{
        const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]);
        return {poly,l:Math.min(...xs)-50,r:Math.max(...xs)+50,t:Math.min(...ys)-50,b:Math.max(...ys)+50};
      });
      const surface={B:{l:0,r:room.w,t:0,b:room.h},roomBlocked(x,y){
        const near=footprints.filter(f=>x>=f.l&&x<=f.r&&y>=f.t&&y<=f.b).map(f=>f.poly);
        const corrected=PF.room.push(near,x,y,46,FSY);
        return Math.hypot(x-corrected.x,y-corrected.y)>1;
      }};
      return route(surface,x0,y0,x1,y1,FSY,false);
    }
    return null; };
  const lanes=new WeakMap();
  R.approach=function(){ const M=F.M; if(!M) return [];
    if(!lanes.has(M)){ const m=endsOf(M).in, st=F.safeZones[0], cross=M.roads.find(r=>r[1]===r[3]&&r[0]<st.x&&r[2]>st.x);
      if(M.regional){
        lanes.set(M,[{x:st.x,y:st.y},{x:m.x,y:m.y}]);return lanes.get(M);
      }
      const y=cross?cross[1]:st.y, path=route(M,m.x,y,m.x,m.y,FSY,false)||[];
      lanes.set(M,[{x:m.x,y},...path,{x:m.x,y:m.y+100}]); }
    return lanes.get(M); };

  // ---- 넘어가기. key: 지금 판(RPG.frame.run, 장소에 들어올 때마다 새것), armed: 길마다 켜졌는지, dwell: 길마다 끊이지 않고 안에 머문 시간(게임 초),
  // want: 미룬 넘어가기 {exit(길로 미뤘으면 그 길, 빠른 이동이면 null),to,arrive,run}, frz: 넘어간 뒤 남은 묶어 두기(초),
  // pend: 마을로 넘어갈 때 설 자리(east 길 끝 | camp 관문 앞), hold0: 목록을 열 때의 PF.heat.hold
  let key=null, armed={}, dwell={}, sig='', want=null, frz=0, pend=null, shutT=-9, wOn=false, wFight=false, escHeld=false, hold0=false;
  // 넘어가기를 미루는 때: 궁극기 중, 장면·창·빠른 이동 목록이 열림, 멈춤, 판이 끝남, 화면 전환 중, 왕이 쓰러진 뒤 경험치 회수(제압 정산) 전
  const settling=()=>{ const M=F.M; return !!M&&!M.free&&!!(M.won||M.king&&M.king.dead); };
  // 이 구역의 왕이 살아 있다(왕과 싸우는 중에는 왕의 방 뒤쪽 문을 스쳐도 닫힌 길 대사를 내지 않는다)
  const kingUp=()=>{ const M=F.M, k=M&&M.king; return !!k&&!k.dead; };
  const blocked=()=>PF.story.busy()||!!PF.story.cur||!!PF.win.cur||wOn||G.paused||V.over||frz>0||settling();
  // The last view of the route gives way to the next stretch of the same track.
  const fade=document.createElement('canvas'); fade.id='pfroad'; fade.setAttribute('aria-hidden','true');document.body.appendChild(fade);
  function snapshot(to){
    const source=document.getElementById('out'),top=document.getElementById('top');
    if(!source?.width)return;
    const fac=Math.min(1,1100/source.width);
    fade.width=Math.round(source.width*fac);fade.height=Math.round(source.height*fac);
    const g=fade.getContext('2d');
    render();
    g.drawImage(source,0,0,fade.width,fade.height);
    if(top?.width)g.drawImage(top,0,0,fade.width,fade.height);
    const door=list().find(m=>m.to===to);
    fade.style.setProperty('--pf-pan-x',Math.round(-(door?.dir?.[0]||0)*23)+'px');
    fade.style.setProperty('--pf-pan-y',Math.round(-(door?.dir?.[1]||0)*17)+'px');
  }
  const sign=document.createElement('div'); sign.id='pfplace'; sign.setAttribute('role','status'); sign.innerHTML='<b></b><i></i>'; document.body.appendChild(sign);
  function shade(to){ sign.querySelector('b').textContent=title(to);
    for(const n of [fade,sign]){ n.classList.remove('on'); void n.offsetWidth; n.classList.add('on'); }
    frz=FREEZE; }
  // 그곳으로 옮긴다: 마을은 사냥터를 정산하고 떠난 뒤 pend 자리로(아래 PF.place.on), 구역은 field.js가 그 길 끝 안쪽·야영지에 세운다
  function go(to,arrive){
    snapshot(to);
    if(to==='town'){ if(PF.place.cur==='town') return false; pend=arrive;
      const ok=PF.place.cur==='village'?PF.place.go('town'):F.leave(); if(!ok){ pend=null; return false; } }
    else if(to[0]==='v'){ if(!PF.village.enter(zoneOf(to),arrive)) return false; }
    else if(!F.enter(zoneOf(to),{arrive})) return false;
    shade(to); return true; }
  function cross(from,exit,to,arrive){ if(!go(to,arrive)) return false; if(exit) PF.quest?.travelled?.(from,exit,to); return true; }
  // 그 길로 나간다. 지금 넘어갈 수 없으면(blocked) 한 번만 미뤄 두고, 풀렸을 때 영웅이 아직 그 길 끝 안에 있으면 넘어간다(아래 tick. 그 사이 판이 바뀌면 버린다)
  R.travel=function(exit){ const p=here(), m=list().find(q=>q.exit===exit), n=m&&next(p,exit,F.COUNT);
    if(!m||!m.open) return false;
    if(blocked()){ if(!want) want={from:p,exit,to:n.place,arrive:n.arrive,run:G.frame.run}; return false; }
    return cross(p,exit,n.place,n.arrive); };
  // 길 끝을 지점으로 꽂는다(자리·열림이 바뀌었거나, 다른 곳이 지점 목록을 새로 걸어 빠졌을 때만)
  function sync(L){ const s=L.map(m=>m.exit+':'+m.x+','+m.y+(m.open?'+':'-')).join('|');
    if(s===sig&&L.every(m=>PF.spots.list.some(q=>q.id==='road_'+m.exit))) return;
    sig=s;
    for(const m of L) PF.spots.add({id:'road_'+m.exit,kind:'road',exit:m.exit,x:m.x,y:m.y,r:m.r,label:m.label,open:m.open,dir:m.dir,ue:m.ue,posts:m.posts}); }
  // 매 화면(안쪽 갱신 뒤): 켜진 길 끝 안에 DWELL초 끊이지 않고 머물면 열린 길은 넘어가고(미뤄질 수 있다), 닫힌 길은 대사 한 번(궁극기 중에는 끝난 뒤에).
  // 발동한 길은 밖으로 나갈 때까지 꺼 둔다. 왕과 싸우는 중·제압 정산 전의 닫힌 문은 건너뛴다(끄지도, 머문 시간을 세지도, 대사도 내지 않는다):
  // 문 안에 선 채 왕이 쓰러지면 문이 열린 화면부터 머문 시간을 세어 0.35초 뒤 넘어간다(마무리 장면 등 바쁜 동안은 여느 때처럼 미뤄진다).
  // 장소에 들어온 첫 화면에는 모든 길이 꺼져 있다: 영웅이 서 있는 길 끝(도착한 길)은 밖으로 나가야 켜진다.
  // 미룬 넘어가기는 풀린 화면에 길로 미뤘으면 영웅이 아직 그 길 끝 안에 있을 때만 넘어가고, 아니면(궁극기가 영웅을 옮김) 버리고 그 길은 꺼 둔다.
  // 미룬 것이 막상 넘어가지 못하면(그 사이 잠긴 구역 등) 버리고 경고 한 번(목록은 이미 닫혀 있고 마을 도착 자리 pend도 go가 지운다)
  function tick(rdt){ const r=G.frame.run;
    if(r!==key){ key=r; armed={}; dwell={}; sig=''; if(want&&want.run!==r) want=null; }
    if(G.mode!=='surv'||G.paused) return;
    const L=list(); sync(L);
    if(want&&!blocked()){ const w=want, m=w.exit&&L.find(q=>q.exit===w.exit); want=null;
      if(!w.exit||m&&m.open&&Math.hypot(pl.x-m.x,pl.gy-m.y)<=m.r){ if(cross(w.from,w.exit,w.to,w.arrive)) return; console.warn('frame/road.js: 미뤄 둔 넘어가기('+w.to+')를 하지 못해 버렸다'); }
      else armed[w.exit]=false; }
    for(const m of L){ const was=!!armed[m.exit]; armed[m.exit]=arm(was,{x:pl.x,y:pl.gy},m);
      if(!was||want||Math.hypot(pl.x-m.x,pl.gy-m.y)>m.r||!m.open&&(kingUp()||settling())){ dwell[m.exit]=0; continue; }
      if((dwell[m.exit]=(dwell[m.exit]||0)+rdt)<DWELL) continue;
      if(m.open){ armed[m.exit]=false; dwell[m.exit]=0; R.travel(m.exit); return; }
      if(PF.story.busy()) continue;
      armed[m.exit]=false; dwell[m.exit]=0;
      if(RT-shutT>SHUT_GAP){ shutT=RT; PF.story.bark(m.exit==='field'?{text:PF.regionMaps.villageObjective(r.zone)?.text||'마을의 준비를 마치세요.'}:m.exit==='next'?{text:'이 구역의 왕을 제압하고 마을 주민에게 돌아오세요.'}:SHUT); } } }
  // 묶어 두는 동안은 이동 입력(키·조이스틱)·대쉬·자동 공격이 나가지 않는다. 입력은 지우지 않고 그 화면에만 비운다
  const u0=update; update=function(rdt){
    if(frz>0&&G.mode==='surv'&&!G.paused){ frz=Math.max(0,frz-rdt); const k=V.keys, j=V.joy; V.keys={}; V.joy=null; V.dash=null; V.bcd=Math.max(V.bcd,.1); V.gcd=Math.max(V.gcd,.1);
      try{ u0(rdt); } finally{ V.keys=k; V.joy=j; } }
    else u0(rdt);
    tick(rdt); };

  // ---- 도착 기록과 마을 도착 자리. 마을에 들어온 뒤(town.js가 시작점에 세운 뒤) pend 자리로 옮긴다
  const put=(x,y,f)=>{ pl.x=pl.home=x; pl.gy=y; if(f) pl.f=f; for(const q of [...pl.scarf,...pl.coat]) q.init=false; cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-X.BODY*.6; };
  PF.place.on(to=>{ R.close(); if(to!=='town'){ pend=null; return; }
    seen().town=1; PF.save.commit();
    const a=pend; pend=null; if(!a) return;
    const m=a==='east'&&list().find(q=>q.exit==='east'), t=m?inside(m,null):PF.TOWN.warp;
    put(t.x,t.y,m?-m.dir[0]:0); });
  F.onEvent((n,c)=>{ if(n!=='enter') return; seen()['z'+c.zone]=1; PF.save.commit(); });

  // ---- 바닥(구역 지도·마을 바닥과 안전지대 위, 소품·영웅 아래): 구역 관문에서 안쪽으로 이어지는 길 띠, 열린 길은 밖을 가리키며 흐르는 화살표 셋,
  // 닫힌 길은 관문 바로 안쪽의 붉은·호박색 빗금 띠. u는 밖으로 나가는 쪽, v는 옆(바닥 거리), ue는 길 끝 가운데에서 관문(경계)까지
  const BW=190, LEN={in:640,out:300};
  const poly=(g,P)=>{ g.beginPath(); g.moveTo(P[0][0],P[0][1]); for(let i=1;i<P.length;i++) g.lineTo(P[i][0],P[i][1]); g.closePath(); };
  function floor(s){ const {hw,hh}=X.view(); if(Math.abs(s.x-cam.x)>hw+900||Math.abs(s.y-cam.y)>hh+900) return;
    const [dx,dy]=s.dir, at=(u,v)=>[s.x+dx*u-dy*v,s.y+(dy*u+dx*v)*FSY], c=s.open?HC:RD, ue=s.ue;
    if(s.posts){ const ui=-LEN[s.exit];
      ctx.fillStyle='rgba(0,0,0,.3)'; poly(ctx,[at(ue,-BW),at(ue,BW),at(ui,BW),at(ui,-BW)]); ctx.fill();
      ctx.strokeStyle=hexA(c,.26); ctx.lineWidth=4; for(const v of [-BW,BW]){ const a=at(ue,v), b=at(ui,v); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); }
      if(s.open){ const a=at(ui,0), b=at(ue,0); ctx.setLineDash([90,120]); ctx.lineDashOffset=-RT*60; ctx.strokeStyle=hexA(c,.3); ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); ctx.setLineDash([]); } }
    if(s.open){ const z=s.r/ZR;
      for(let i=0;i<3;i++){ const u=ue-(150+(2-i)*95)*z, k=.25+.55*Math.max(0,Math.sin(RT*3.2-i*1.1)), P=[at(u+46*z,0),at(u-34*z,-92*z),at(u-74*z,-92*z),at(u+6*z,0),at(u-74*z,92*z),at(u-34*z,92*z)];
        ctx.fillStyle='rgba(6,12,14,.5)'; poly(ctx,P); ctx.fill(); fx.fillStyle=hexA(c,k); poly(fx,P); fx.fill(); }
      glow(fx,s.x,s.y,s.r*1.1,c,.1); return; }
    ctx.save(); poly(ctx,[at(ue-130,-BW),at(ue-130,BW),at(ue-20,BW),at(ue-20,-BW)]); ctx.clip();
    for(let i=0,v=-BW-160;v<BW+60;i++,v+=52){ ctx.fillStyle=i%2?'rgba(226,81,63,.5)':'rgba(235,167,78,.42)'; poly(ctx,[at(ue-130,v),at(ue-130,v+26),at(ue-20,v+136),at(ue-20,v+110)]); ctx.fill(); }
    ctx.restore(); glow(fx,s.x,s.y,s.r,RD,.08+.04*Math.sin(RT*3)); }
  const prep0=drawBackground_prep; drawBackground_prep=function(){ prep0(); if(G.mode!=='surv') return;
    const L=PF.spots.list.filter(s=>s.kind==='road'); if(!L.length) return;
    applyCam(ctx); applyCam(fx);
    const lane=R.approach();
    if(lane.length){ ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();lane.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      for(const [width,color] of [[270,'rgba(157,168,163,.42)'],[246,'rgba(48,59,58,.88)'],[10,'rgba(195,181,123,.6)']]){
        ctx.lineWidth=width;ctx.strokeStyle=color;if(width===10)ctx.setLineDash([86,82]);ctx.stroke();
      }
      ctx.restore(); }
    for(const s of L) floor(s); ctx.setTransform(1,0,0,1,0,0); };

  // ---- 빠른 이동 목록: 관문을 누르면 들른 곳(마을과 들른 구역) 목록. 지금 있는 곳은 표시만, 고르면 그곳의 야영지(마을은 관문 앞).
  // win.js 창은 hub.js 화면(#rmenu)을 띄우는 것이라 이 목록은 따로 작은 겹으로 두고, 창과 같은 규칙을 따른다: 궁극기·장면·창·멈춤 중에는 열리지 않고,
  // 열린 동안 뒤 장소를 멈추며(PF.heat.hold, 전투 장소면 일시정지. 그 화면은 frame.css가 숨긴다), 닫을 때 hold를 연 때의 값으로 되돌리고 눌려 있던 이동 키·조이스틱을 비운다.
  // Esc·바깥 누르기로 닫힌다. 관문이 있는 곳(마을, 야영지 안전지대 = PF.place.safe)에서만 연다
  const wp=document.createElement('div'); wp.id='pfwarp'; document.body.appendChild(wp);
  R.list=function(){ const h=here(); if(wOn||!h||!PF.place.safe||G.paused||PF.story.busy()||PF.story.cur||PF.win.cur) return false;
    wp.innerHTML='<div class="pf-wp" role="dialog" aria-label="빠른 이동"><div class="pf-wp-hd"><span>관문 · 빠른 이동</span><small>들른 곳</small><button type="button" class="pf-wp-x">닫기</button></div><div class="pf-wp-l">'+
      portals(story(),F.COUNT).map(p=>{const dest=p.replace(/^z/,'v');return dest===h?`<div class="pf-wp-it here"><b>${title(dest)}</b><small>지금 있는 곳</small></div>`:`<button type="button" class="pf-wp-it" data-warp="${p}"><b>${title(dest)}</b><small>관문 앞</small></button>`;}).join('')+'</div></div>';
    wFight=PF.place.FIGHT.includes(PF.place.cur); wOn=true; hold0=PF.heat.hold; PF.heat.hold=true;
    if(wFight) A.setPause(true);
    document.body.classList.add('pf-warp'); wp.classList.add('on'); return true; };
  R.close=function(){ if(!wOn) return; wOn=false; wp.classList.remove('on'); document.body.classList.remove('pf-warp'); PF.heat.hold=hold0;
    if(wFight) A.setPause(false);
    wFight=false; const joy=document.getElementById('sjoy'); V.keys={}; V.joy=null; if(joy) joy.classList.remove('act'); };
  // 목록이 열린 동안은 바쁨으로 본다: 장면(story.js는 바쁘면 기다린다)·창이 목록 위에 열려 hold를 서로 덮어쓰지 않고, 목록을 닫은 뒤에 열린다
  const busy0=PF.story.busy; PF.story.busy=()=>busy0()||wOn;
  // 들른 곳의 야영지(마을은 관문 앞)로. 관문이 있는 곳에서만, 지금 있는 곳·들르지 않은 곳은 false.
  // 고른 것은 잃지 않는다: 지금 넘어갈 수 없으면(도착 직후 0.4초, 제압 정산 전 등) 미뤄 두었다가 풀리면 넘어간다(true)
  R.warp=function(p){ const h=here(),to=p&&p.replace(/^z/,'v'); if(!h||!PF.place.safe||to===h||!portals(story(),F.COUNT).includes(p)) return false;
    R.close();
    if(blocked()){ want={exit:null,to,arrive:'camp',run:G.frame.run}; return true; }
    return go(to,'camp'); };
  // 터치 기기에서 전체 화면·가로 고정(hub.js 출발 버튼·challenge.js와 같은 도움 함수). 사용자의 누르기 안에서만 되므로 실제 누르기에서 부른다:
  // 목록에서 고를 때, 타이틀의 작전 재개·후손 확정(마을로 들어가는 누르기)
  function goFull(){ if(!A.isTouch()) return; const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen) d.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})).catch(()=>{}); }
  document.addEventListener('click',e=>{ const t=e.target; if(t&&t.closest&&t.closest('#rmenu [data-act=cont],#rmenu [data-act=pick]')) goFull(); },true);
  wp.addEventListener('pointerdown',e=>e.stopPropagation());
  wp.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-warp]');
    if(b){ goFull(); R.warp(b.dataset.warp); } else if(e.target.closest('.pf-wp-x')||!e.target.closest('.pf-wp')) R.close(); });
  Object.defineProperty(R,'listOpen',{get:()=>wOn});
  Object.defineProperty(R,'frozen',{get:()=>frz>0});
  // 키: 목록이 열려 있으면 모두 받기만 하고 Esc는 닫는다(닫은 Esc를 누른 채 있으면 뗄 때까지 받기만: win.js와 같다). 묶어 두는 동안은 대쉬 키를 받지 않는다
  const sk=G.survKey;
  G.survKey=function(e,down){
    if(e.code==='Escape'&&escHeld){ if(down&&e.repeat) return; escHeld=false; }
    if(wOn){ e.preventDefault(); if(down&&e.code==='Escape'&&!e.repeat){ escHeld=true; R.close(); } return; }
    if(frz>0&&/^(Space|ShiftLeft|ShiftRight)$/.test(e.code)){ e.preventDefault(); return; }
    return sk.apply(this,arguments); };
  Object.defineProperty(R,'pending',{get:()=>want&&want.to});
  PF.road=R;
}

if(typeof module!=='undefined') module.exports=R;
})();
