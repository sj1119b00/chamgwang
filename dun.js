// 프로메테우스 — zone maps (2026-11-25). Each zone run is one large hand-shaped map instead of an endless floor: streets and plazas,
// generated props from assets/dun (6 per zone), three signal nodes to destroy, supply caches guarded by squads, two record terminals,
// and the king's arena that opens when the nodes are down. RPG first, survival second: the horde is thinner and comes in waves
// tied to where the player is. Loaded by hub.js after surv.js; it wraps the engine's globals and never edits surv.js.
'use strict';
(function boot(){ if(!(window.RPG&&RPG.sv&&RPG.sv.V&&RPG.hub)) return setTimeout(boot,120);
const G=RPG, A=G.api, S=G.sv, V=S.V, FSY=S.FSY, BODY=S.BODY, ZK=['z7','z1','z2','z3','z4','z5','z6'];
const ZONES=G.hub.ZONES;

// ============================================================ props: image, world height, footprint, light
// i = assets/dun/<zone>_<i>.webp; h world height; w spawn weight; big: kept off the streets; street: lines the roads;
// light {x,y: fraction of width / height from the foot, r, c, a, flick, blink}; fire: smoke and embers; float: bobs, no footprint
const PK={
  z7:[{i:0,h:820,w:3,big:1,light:{y:.5,r:240,c:'#7FF3FF',a:.45}},{i:1,h:300,w:2,light:{y:.75,r:220,c:'#7FF3FF',a:.55},holo:1},{i:2,h:440,street:1,fp:.16,light:{x:.22,y:.84,r:290,c:'#a8f8ff',a:.85},holo:1},
      {i:3,h:230,w:2},{i:4,h:430,w:1,light:{y:.55,r:290,c:'#7FF3FF',a:.85},holo:1},{i:5,h:230,w:2}],
  z1:[{i:0,h:330,w:2,wide:1},{i:1,h:380,w:2},{i:2,h:180,street:1,fire:1,light:{y:.95,r:300,c:'#ff8a2a',a:.95,flick:.35}},{i:3,h:680,w:2,big:1,light:{y:.95,r:200,c:'#ff3344',a:.6,blink:1}},
      {i:4,h:250,w:2},{i:5,h:330,w:1,fire:1,light:{x:.12,y:.62,r:200,c:'#ff7a2a',a:.6,flick:.4}}],
  z2:[{i:0,h:560,w:2,big:1},{i:1,h:500,w:2,light:{y:.5,r:260,c:'#ffc04a',a:.7},holo:1},{i:2,h:280,w:2,light:{y:.6,r:200,c:'#ffc04a',a:.5}},{i:3,h:380,w:1,light:{y:.75,r:280,c:'#ffd27a',a:.75},holo:1},
      {i:4,h:240,street:1,float:1,light:{y:.05,r:220,c:'#7FF3FF',a:.5}},{i:5,h:880,w:3,big:1,light:{y:.22,r:260,c:'#ffc04a',a:.6}}],
  z3:[{i:0,h:920,w:3,big:1},{i:1,h:320,w:2,wide:1},{i:2,h:380,street:1,light:{y:.7,r:300,c:'#58ffa8',a:.85,flick:.1}},{i:3,h:430,w:1,light:{y:.75,r:240,c:'#58ffa8',a:.6,flick:.3},holo:1},
      {i:4,h:290,w:3},{i:5,h:620,w:2,big:1}],
  z4:[{i:0,h:660,w:2,big:1},{i:1,h:500,w:2,light:{y:.55,r:260,c:'#b98cff',a:.7},holo:1},{i:2,h:430,w:2},{i:3,h:340,w:1},{i:4,h:540,w:2},
      {i:5,h:270,street:1,fire:1,light:{y:.95,r:300,c:'#c9a0ff',a:.95,flick:.3}}],
  z5:[{i:0,h:580,w:3,big:1,light:{y:.5,r:260,c:'#ff4fe0',a:.7,flick:.25}},{i:1,h:230,w:2,light:{y:.4,r:180,c:'#ff4fe0',a:.45,flick:.5}},{i:2,h:540,w:2,big:1},
      {i:3,h:310,w:1,float:1,light:{y:.5,r:280,c:'#ff4fe0',a:.85,flick:.4},holo:1,glitch:1},{i:4,h:270,w:2,light:{y:.75,r:200,c:'#ff4fe0',a:.55,flick:.5}},{i:5,h:660,street:1,fp:.18,light:{y:.97,r:170,c:'#ff4fe0',a:.75,blink:1}}],
  z6:[{i:0,h:420,w:2,light:{y:.5,r:260,c:'#fff0b8',a:.7}},{i:1,h:460,w:2},{i:2,h:270,street:1,light:{y:.85,r:240,c:'#7FF3FF',a:.6},holo:1},{i:3,h:580,w:2,big:1,light:{y:.35,r:320,c:'#fff0b8',a:.9}},
      {i:4,h:420,w:2,light:{y:.5,r:260,c:'#9fdcff',a:.7}},{i:5,h:320,w:2,wide:1,light:{y:.3,r:200,c:'#fff0b8',a:.4}}],
};
const IMG={}; for(const z of ZK) IMG[z]=PK[z].map(p=>{ const im=new Image(); im.src=`assets/dun/${z}_${p.i}.webp?v=1`; return im; });

// what each zone's ground does between the props
const AMB={z7:'rings',z1:'embers',z2:'gold',z3:'flies',z4:'motes',z5:'glitch',z6:'scan'};
const LOGS={
  z7:['기록 07-A · 동기화 첫날, 거리의 소음이 사라졌다. 모두가 같은 박자로 숨을 쉬었다.','기록 07-B · 싱크 킹은 한 사람이 아니다. 가장 먼저 동기화된 사람의 생각이 왕관이 되었을 뿐이다.'],
  z1:['기록 01-A · 이곳의 법은 하나뿐이다. 무기를 든 자가 다음 날을 산다.','기록 01-B · 브루털 킹은 왕좌를 지키지 않는다. 매일 밤 도전자를 꺾어 그 자리를 다시 얻는다.'],
  z2:['기록 02-A · 화폐는 사라지지 않았다. 숨 쉬는 시간마다 이자가 붙는다.','기록 02-B · 크레딧 킹의 금고에는 돈이 없다. 200년 치 빚 문서만 쌓여 있다.'],
  z3:['기록 03-A · 숲은 도시를 부수지 않았다. 천천히, 아주 천천히 삼켰다.','기록 03-B · 와일드 킹은 숲의 일부가 되었다. 뿌리가 그의 혈관을 따라 자란다.'],
  z4:['기록 04-A · 권력이 없는 곳에서도 사람들은 줄을 선다. 가장 높은 계단은 비어 있다.','기록 04-B · 엠퍼러는 스스로 왕관을 썼다. 그것을 씌워 준 사람은 없다.'],
  z5:['기록 05-A · 신호가 끊긴 지 오래인데, 서버는 아직도 무언가를 계산하고 있다.','기록 05-B · 글리치 킹에게는 몸이 없다. 화면이 깜빡일 때마다 조금씩 가까워진다.'],
  z6:['기록 06-A · 최초의 기술은 여기서 태어났다. 경계선을 넘는 방법도.','기록 06-B · \'남자\'가 떠난 날, 제네시스 킹은 문을 잠그지 않았다. 따라올 사람이 없을 것을 알았기에.'],
};

// the node is an enemy that never moves: skills find it, it dies like one, the map draws it
S.EN.node={img:'brute',hp:30000,spd:0,r:120,dmg:0,gem:30,sc:.56,h:520,heavy:true,node:true};

// ============================================================ the map
let M=null;   // current run's map, null outside a zone run
const rng=seed=>{ let s=seed>>>0||1; return ()=>((s=(s*16807)%2147483647)/2147483647); };
const fd=(ax,ay,bx,by)=>Math.hypot(ax-bx,(ay-by)/FSY);   // distance on the floor (y is foreshortened)
function segDist(px,py,x0,y0,x1,y1){ const dx=x1-x0, dy=(y1-y0)/FSY, qx=px-x0, qy=(py-y0)/FSY, L=dx*dx+dy*dy||1, t=Math.max(0,Math.min(1,(qx*dx+qy*dy)/L)); return Math.hypot(qx-dx*t,qy-dy*t); }
function build(ch){
  const zk=ZK[ch], Z=ZONES[ch], R=rng(9173+ch*7919), X0=pl.x, Y0=pl.gy, mir=ch%2?-1:1;
  const B={l:X0-6000,r:X0+6000,t:Y0-7800,b:Y0+650};
  const RA=1300, arena={x:X0,y:B.t+RA*FSY+380,r:RA};
  const jit=v=>v+(R()-.5)*500;
  const nodes=[[X0-3700*mir,Y0-2100],[X0+3600*mir,Y0-3900],[X0-2500*mir,Y0-5500]].map(([x,y])=>({x:jit(x),y:y+(R()-.5)*300,e:null,done:false,awake:false,wave:2}));
  const roads=[[X0,Y0+200,X0,arena.y+RA*FSY*.6,720]];
  for(const n of nodes) roads.push([X0,n.y,n.x,n.y,560]);
  roads.push([B.l+700,Y0-1000,B.r-700,Y0-1000,480],[X0+2300*mir,Y0-1000,X0+2300*mir,Y0-5600,480]);
  const plazas=[{x:X0,y:Y0,r:900,k:'start'},...nodes.map(n=>({x:n.x,y:n.y,r:760,k:'node'}))];
  const free=(x,y,m)=>x>B.l+260&&x<B.r-260&&y>B.t+260&&y<B.b-200&&fd(x,y,arena.x,arena.y)>RA+m&&!plazas.some(p=>fd(x,y,p.x,p.y)<p.r+m);
  // supply caches and record terminals sit off the main road, inside the blocks
  const chests=[], logs=[];
  for(let k=0;k<80&&chests.length<6;k++){ const x=B.l+600+R()*(B.r-B.l-1200), y=B.t+800+R()*(B.b-B.t-1500);
    if(!free(x,y,420)||roads.some(r=>segDist(x,y,...r)<r[4]/2+250)||chests.some(c=>fd(x,y,c.x,c.y)<2200)) continue; chests.push({x,y,open:false,guard:false}); }
  for(let k=0;k<80&&logs.length<2;k++){ const r=roads[1+(R()*(roads.length-1)|0)], t=.3+R()*.5, x=r[0]+(r[2]-r[0])*t, y=r[1]+(r[3]-r[1])*t+(R()<.5?-1:1)*(r[4]/2+170)*FSY;
    if(!free(x,y,250)||chests.some(c=>fd(x,y,c.x,c.y)<700)||logs.some(l=>fd(x,y,l.x,l.y)<2500)) continue; logs.push({x,y,read:false,txt:LOGS[zk][logs.length]}); }
  for(const c of chests) plazas.push({x:c.x,y:c.y,r:360,k:'chest'}); for(const l of logs) plazas.push({x:l.x,y:l.y,r:260,k:'log'});
  // props: a jittered grid, kept off roads and plazas, with open ground left for the fights
  const kinds=PK[zk], props=[], pick=list=>{ let t=list.reduce((s,p)=>s+p.w,0)*R(); for(const p of list){ t-=p.w; if(t<=0) return p; } return list[0]; };
  const body=kinds.filter(k=>!k.street);
  for(let gx=B.l+300;gx<B.r-200;gx+=640) for(let gy=B.t+300;gy<B.b-200;gy+=560){
    if(R()<.3) continue; const x=gx+(R()-.5)*420, y=gy+(R()-.5)*360, k=pick(body), rd=Math.min(...roads.map(r=>segDist(x,y,...r)-r[4]/2));
    if(rd<(k.big?330:170)||!free(x,y,k.big?360:200)) continue; if(!k.big&&rd>2400&&R()<.4) continue;
    props.push(mkProp(zk,k,x,y,.85+R()*.3,R)); }
  for(const st of kinds.filter(k=>k.street)) for(const r of roads){ const L=fd(r[0],r[1],r[2],r[3]), n=Math.floor(L/1150);
    for(let i=1;i<n;i++){ const t=i/n, x=r[0]+(r[2]-r[0])*t, y=r[1]+(r[3]-r[1])*t, hz=Math.abs(r[3]-r[1])<1, side=(i%2?1:-1);
      const px=hz?x:x+side*(r[4]/2+110), py=hz?y+side*(r[4]/2+110)*FSY:y; if(!free(px,py,140)) continue; props.push(mkProp(zk,st,px,py,.95+R()*.1,R)); } }
  // the king's arena: the zone's tallest landmark ringed outside the wall (the gap to the city kept clear) and one behind the throne
  { const big=kinds.filter(k=>k.big).sort((p,q)=>q.h-p.h), lm=big[0]||kinds[0], side=big[1]||lm, N=9;
    for(let i=0;i<N;i++){ const ang=-Math.PI/2+(i-(N-1)/2)*(Math.PI*1.45/(N-1)); if(Math.abs(Math.atan2(Math.sin(ang-Math.PI/2),Math.cos(ang-Math.PI/2)))<.6) continue;
      const k=i%2?side:lm, x=arena.x+Math.cos(ang)*(RA+380), y=arena.y+Math.sin(ang)*(RA+380)*FSY; props.push(mkProp(zk,k,x,y,i%2?.8:.95,R)); }
    const th=mkProp(zk,lm,arena.x,arena.y-RA*FSY*.82,1.35,R); th.throne=1; props.push(th); }
  // drop props whose footprint lands on another's
  props.sort((a,b)=>b.rx-a.rx); const kept=props.filter(p=>p.throne||fd(p.x,p.y,arena.x,arena.y)<RA+500); props.splice(0,props.length,...props.filter(p=>!kept.includes(p))); for(const p of props){ if(kept.some(q=>Math.hypot((p.x-q.x)/(p.rx+q.rx),(p.y-q.y)/(p.ry+q.ry+40))<1)) continue; kept.push(p); }
  kept.sort((a,b)=>a.y-b.y);
  const grid=new Map(), C=1000, key=(i,j)=>i*100003+j;
  for(const p of kept){ if(!p.solid) continue; for(let i=Math.floor((p.x-p.rx)/C);i<=Math.floor((p.x+p.rx)/C);i++) for(let j=Math.floor((p.y-p.ry)/C);j<=Math.floor((p.y+p.ry)/C);j++){ const k=key(i,j); let L=grid.get(k); if(!L) grid.set(k,L=[]); L.push(p); } }
  const holos=[]; for(const r of roads){ const L=fd(r[0],r[1],r[2],r[3]), n=Math.floor(L/1700); for(let i=0;i<n;i++){ const t=(i+.5)/n, hz=Math.abs(r[3]-r[1])<1, side=R()<.5?-1:1, x=r[0]+(r[2]-r[0])*t+(hz?0:side*(r[4]/2+260)), y=r[1]+(r[3]-r[1])*t+(hz?side*(r[4]/2+260)*FSY:0);
    if(fd(x,y,arena.x,arena.y)<RA+300) continue; holos.push({x,y,w:260+R()*140,h:150+R()*60,z:520+R()*260,ph:R()*TAU,kind:R()*3|0}); } }
  return {holos,ch,zk,Z,B,arena,nodes,roads,plazas,chests,logs,props:kept,grid,C,key,t0:RT,el:0,gold:0,loot:[],done:0,gate:false,king:null,kingDown:false,won:false,amb:[],ambT:0,packT:2,msg:null,objT:0,seed:R()}; }
function mkProp(zk,k,x,y,s,R){ const im=IMG[zk][k.i], h=k.h*s; const o={k,zk,im,x,y,h,s,ph:R()*TAU,solid:!k.float,rx:0,ry:0,fix(){ const w=this.w(); this.rx=w*(k.fp||(k.wide?.44:.34)); this.ry=this.rx*FSY*.62; },w(){ return im.naturalWidth?im.naturalWidth*this.h/im.naturalHeight:this.h*.8; }}; o.fix(); return o; }

// ============================================================ collision: footprints, the map's edge, the arena wall
function pushOut(o,xk,yk,rad=0){ if(!M) return; const x=o[xk], y=o[yk];
  const L=M.grid.get(M.key(Math.floor(x/M.C),Math.floor(y/M.C))); if(L) for(const p of L){ const rx=p.rx+rad, ry=p.ry+rad*FSY, u=(o[xk]-p.x)/rx, v=(o[yk]-p.y)/ry, d=Math.hypot(u,v); if(d<1){ const k=d<1e-3?1:1/d; o[xk]=p.x+(d<1e-3?1:u)*k*rx; o[yk]=p.y+(d<1e-3?0:v)*k*ry; } }
  const B=M.B; o[xk]=Math.max(B.l+80,Math.min(B.r-80,o[xk])); o[yk]=Math.max(B.t+80,Math.min(B.b-60,o[yk]));
  const a=M.arena, dx=o[xk]-a.x, dy=(o[yk]-a.y)/FSY, d=Math.hypot(dx,dy), ang=Math.atan2(dy,dx), inGap=(M.gate||M.free)&&!M.king&&Math.abs(ang-Math.PI/2)<.32;
  if(!inGap&&Math.abs(d-a.r)<70){ const k=(d<a.r?a.r-70:a.r+70)/(d||1); o[xk]=a.x+dx*k; o[yk]=a.y+dy*k*FSY; } }
function solidAt(x,y,m=0){ const o={x,y}; pushOut(o,'x','y',m); return Math.abs(o.x-x)>1||Math.abs(o.y-y)>1; }
function spot(cx,cy,r0,r1,tries=10){ for(let i=0;i<tries;i++){ const a=rand(0,TAU), r=rand(r0,r1), x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r*FSY; if(!solidAt(x,y,60)) return [x,y]; } return null; }

// ============================================================ the run: objectives, waves, rewards
const CAPA=150;
function alive(){ let n=0; for(const e of V.en) if(!e.dead&&!e.d.node) n++; return n; }
function pack(x,y,n,heavy){ for(let i=0;i<n&&alive()<CAPA;i++){ const p=spot(x,y,0,260); if(!p) continue; const r=Math.random(); S.spawn(heavy&&i===0?'brute':(V.t>30||M.free)&&r<.22?'archer':'shard',p[0],p[1]); } }
function offscreen(){ const {hw,hh}=S.view(); for(let i=0;i<12;i++){ const a=rand(0,TAU), x=cam.x+Math.cos(a)*(hw+220), y=cam.y+Math.sin(a)*(hh+260); if(!solidAt(x,y,80)) return [x,y]; } return null; }
function say(t,sub,c){ M.msg={t,sub,c:c||M.Z.acc,t0:RT}; }
function tick(rdt){ const ch=M.ch, Z=M.Z; M.el+=rdt;
  // difficulty grows with time spent and with progress, slower than the five-minute run did
  if(M.won&&RT-M.wonT>2.4&&V.gems.length&&!M.free){ for(const g of V.gems) V.acc+=g.v; V.gems.length=0; }   /* whatever is still on its way is banked */
  /* frame/field.js: a hunting field does not end when the king falls; once his experience is in it turns into open ground (M.free) with the arena door open */
  if(M.won&&RT-M.wonT>2.4&&!M.free&&G.frame&&G.frame.run&&G.frame.run.kind==='field'){ M.free=true; M.king=null; G.frame.run.first=false; }
  V.t=M.free?0:M.won&&RT-M.wonT>2.4?300:Math.min(250,M.el*.42+M.done*38);   /* after the king falls the run waits while his experience flies in */ V.spawn=-50; V.horde=99; V.bossDone=true;
  if(V.over||lock) return;
  // nodes: pinned in place; the closer the hero, the more they call
  for(const n of M.nodes){ if(n.done) continue; const e=n.e; if(e){ e.x=n.x; e.y=n.y; e.kx=e.ky=0; e.stun=1e9; e.z=0; }
    if(e&&e.dead){ n.done=true; M.done++; M.gold+=Math.round(70*(ch+1)); for(let i=0;i<10;i++) V.gems.push({x:n.x+rand(-120,120),y:n.y+rand(-80,80),v:6+ch*2,s:0,mag:false,ph:rand(0,TAU)});
      stamp('노드 파괴',{x:.5,y:.3,size:.1,life:1.3,c:Z.acc,keep:1}); V.items.push({k:'heal',x:n.x,y:n.y+200,t:0}); S.sfx('shatter',1); S.sfx('boom',1,.6); if(window.GFX) GFX.light(n.x,n.y,900,Z.acc,1.4,1.2,{z:200});
      explode(n.x,n.y-380,1.5,Z.acc,'#ffffff'); S.burst(n.x,n.y,26,{s0:300,s1:1300,vz:1600,size:22,c:Z.acc}); for(let i=0;i<3;i++) after(i*.12,()=>S.fring(n.x,n.y,1600+i*700,Z.acc,.7,8)); trauma=Math.min(1,trauma+.45); n.boomT=RT;
      const questField=G.frame?.run?.kind==='field';
      if(M.done===M.nodes.length){
        M.gate=true; say('왕의 문이 열렸다',Z.king+'이(가) 기다린다',Z.acc);
        // 연달아 파괴한 노드의 글만 걷는다. 효과의 수명과 그릴 때 쓰는 난수는 유지한다.
        if(questField) for(const p of parts) if(p.k==='stamp'&&p.txt==='노드 파괴') p.txt='';
      }else if(!questField) say(`신호 노드 ${M.done} / ${M.nodes.length}`,'남은 노드를 찾아 파괴하라');
      else if(M.msg?.t==='신호 노드 감지') M.msg.t0=-Infinity;
      continue; }
    const d=fd(pl.x,pl.gy,n.x,n.y);
    if(!n.awake&&d<1700){ n.awake=true; n.wt=0; say('신호 노드 감지','노드가 방어 병력을 부른다'); }
    if(n.awake&&d<2200){ n.wt-=rdt; if(n.wt<=0){ n.wt=Math.max(3.2,5-ch*.2); n.wave++; const k=4+ch+Math.min(6,n.wave); for(let i=0;i<3;i++){ const p=spot(n.x,n.y,500,900); if(p) pack(p[0],p[1],Math.ceil(k/3),n.wave%3===0&&i===0); } } } }
  // caches: a squad wakes when the hero comes near; opening one pays out
  for(const c of M.chests){ if(c.open) continue; const d=fd(pl.x,pl.gy,c.x,c.y);
    if(!c.guard&&d<1500){ c.guard=true; for(let i=0;i<2;i++){ const p=spot(c.x,c.y,300,600); if(p) pack(p[0],p[1],3+ch,i===0); } }
    if(d<130){ c.open=true; c.t=RT; const g=Math.round((35+Math.random()*30)*(ch+1)); M.gold+=g; V.nums.push({x:c.x,y:c.y-260,t:-.2,txt:'+'+g+' 크레딧',heal:true});
      for(let i=0;i<6;i++) V.gems.push({x:c.x+rand(-80,80),y:c.y+rand(-50,50),v:3+ch,s:0,mag:false,ph:rand(0,TAU)});
      if(Math.random()<.45&&G.hub.newItem){ const rar=G.hub.rollRar?G.hub.rollRar(ch,false):0, R=G.hub.RAR&&G.hub.RAR[rar]; M.loot.push(rar); M.lootT=RT;
        V.nums.push({x:c.x,y:c.y-360,t:-.4,txt:'장비 획득!',big:true}); stamp('장비 획득',{x:.5,y:.36,size:.11,life:1.4,c:R?R[2]:'#EBA74E',keep:1}); say('장비 획득 · '+(R?R[0]+' 등급':''),'구역을 나가면 패브리케이터 보관함에 들어갑니다 (지금까지 '+M.loot.length+'개)',R?R[2]:'#EBA74E'); S.sfx('rise',1.1,.8); }
      if(Math.random()<.5) V.items.push({k:'heal',x:c.x+rand(-90,90),y:c.y+110,t:0});
      S.sfx('rise',.7,.5); if(window.GFX) GFX.light(c.x,c.y,700,'#ffc04a',1.2,.9,{z:120}); S.fring(c.x,c.y,1100,'#EBA74E',.55,6); S.burst(c.x,c.y,12,{s0:200,s1:700,vz:1200,size:14,c:'#ffc04a'}); for(let i=0;i<14;i++) spark(c.x,c.y-80,rand(0,TAU),rand(300,900),{c:i%2?'#ffe6a0':'#EBA74E',life:rand(.3,.7),w:3,g:600}); } }
  // record terminals: a line of the story, and a little experience
  for(const l of M.logs){ if(l.read) continue; if(fd(pl.x,pl.gy,l.x,l.y)<170){ l.read=true; say('레온의 기록',l.txt,'#EBA74E'); V.acc+=20*(ch+1); S.sfx('rise',.5,.3); } }
  // the arena: once inside with the gate open, it seals and the king comes
  const a=M.arena, da=fd(pl.x,pl.gy,a.x,a.y);
  if(M.gate&&!M.king&&!M.free&&da<a.r-260){ const k=S.spawn('boss',a.x,a.y-a.r*FSY*.35); M.king=k; V.boss=k; M.ht=8; clearOutside(true); stamp(Z.king,{x:.5,y:.3,size:.12,life:1.6,c:Z.acc,keep:1}); if(window.SFX&&SFX.siren) SFX.siren(1.6); say(Z.king,Z.kingEn,Z.acc); }
  if(M.king&&!M.king.dead) clearOutside(false);
  if(M.king){ if(M.king.dead){ if(!M.won){ M.won=true; M.wonT=RT; V.mag=3; for(const e of V.en) if(!e.dead&&!e.d.node) S.dmg(e,e.hp*1.3+10,{kb:2}); say(Z.king+' 제압','경험치를 회수하는 중…',Z.acc); } } else { M.ht-=rdt; if(M.ht<=0){ M.ht=Math.max(8,13-ch); for(let i=0;i<3;i++){ const p=spot(a.x,a.y,a.r*.5,a.r*.85); if(p) pack(p[0],p[1],3+ch,i===0&&Math.random()<.5); } } } }
  // the thin ambient horde: small packs from off screen, more as the run goes on
  M.packT-=rdt; if(M.packT<=0&&!M.king){ const dn=M.free?0:M.done; M.packT=Math.max(1.6,3.4-ch*.15-dn*.3); if(alive()<26+ch*4+dn*8){ const p=offscreen(); if(p) pack(p[0],p[1],3+(Math.random()*3|0)+dn,(M.free||M.el>60)&&Math.random()<.12); } }
}
function clearOutside(puff){ const a=M.arena; for(const e of V.en){ if(e.dead||e.d.node||e.d.boss||fd(e.x,e.y,a.x,a.y)<a.r+60) continue; e.dead=true; if(puff) smoke(e.x,e.y-60,rand(30,50),{a:.35,life:.6,grow:60}); } }
// after the engine moved everything: keep it out of the props and inside the map
function collide(){ pushOut(pl,'x','gy',34);
  for(const n of M.nodes){ if(n.done||!n.e) continue; n.e.x=n.x; n.e.y=n.y; const dx=pl.x-n.x, dy=(pl.gy-n.y)/FSY, d=Math.hypot(dx,dy); if(d<170){ const k=170/(d||1); pl.x=n.x+(d?dx:1)*k; pl.gy=n.y+(d?dy:0)*k*FSY; } }
  for(const e of V.en){ if(e.dead||e.d.node) continue; pushOut(e,'x','y',e.d.r*.5); } }

// ============================================================ drawing
const vis=[]; let vi=0;
function visible(){ vis.length=0; const {hw,hh}=S.view(); for(const p of M.props){ if(!p.rx) p.fix(); const w=p.w(); if(p.x+w<cam.x-hw-200||p.x-w>cam.x+hw+200||p.y<cam.y-hh-200||p.y-p.h>cam.y+hh+200) continue; vis.push(p); } vi=0; }
function drawProp(p){ const im=p.im; if(!im.complete||!im.naturalWidth) return; const k=p.k, w=p.w(), h=p.h, bob=k.float?Math.sin(RT*1.6+p.ph)*16+60:0;
  ctx.fillStyle='rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(p.x,p.y,(p.rx||w*.34)*1.18,(p.ry||w*.1)*1.25,0,0,TAU); ctx.fill();
  /* the hero walking behind something tall sees through it */
  let a=1; if(p.y>pl.gy&&p.y-h*.92<pl.gy-40&&Math.abs(pl.x-p.x)<w*.42) a=.42;
  if(k.holo) a*=.9+.1*Math.sin(RT*9+p.ph)*(Math.random()<.04?3:1);
  if(k.glitch&&Math.random()<.06){ ctx.globalAlpha=a*.6; ctx.drawImage(im,p.x-w/2+rand(-14,14),p.y-h-bob,w,h); }
  ctx.globalAlpha=a; ctx.drawImage(im,p.x-w/2,p.y-h-bob,w,h); ctx.globalAlpha=1;
  const L=k.light; if(L){ let f=1; if(L.flick) f=1-L.flick*(.5+.5*Math.sin(RT*13+p.ph*7))*Math.random(); if(L.blink) f=(Math.sin(RT*3+p.ph)>.2)?1:.15;
    glow(fx,p.x+(L.x||0)*w,p.y-h*(L.y||.5)-bob,(L.r||200)*.55,L.c,(L.a||.6)*.35*f); }
}
function drawUpTo(y){ while(vi<vis.length&&vis[vi].y<y) drawProp(vis[vi++]); }
// nodes, caches, terminals: drawn by the map
function drawNode(e){ const x=e.x, y=e.y, c=M.Z.acc, k=e.hp/e.max, t=RT;
  ctx.fillStyle='rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(x,y,190,190*FSY,0,0,TAU); ctx.fill();
  ctx.fillStyle='#0b1418'; ctx.beginPath(); for(let i=0;i<6;i++){ const a=i/6*TAU; ctx[i?'lineTo':'moveTo'](x+Math.cos(a)*150,y+Math.sin(a)*150*FSY); } ctx.closePath(); ctx.fill();
  ctx.strokeStyle=hexA(c,.8); ctx.lineWidth=5; ctx.stroke();
  fx.strokeStyle=hexA(c,.5+.3*Math.sin(t*4)); fx.lineWidth=6; fx.beginPath(); fx.ellipse(x,y,230+20*Math.sin(t*2),(230+20*Math.sin(t*2))*FSY,0,0,TAU); fx.stroke();
  /* the obelisk and its floating crystal */
  ctx.fillStyle='#10191d'; ctx.beginPath(); ctx.moveTo(x-60,y-10); ctx.lineTo(x-34,y-300); ctx.lineTo(x+34,y-300); ctx.lineTo(x+60,y-10); ctx.closePath(); ctx.fill(); ctx.strokeStyle=hexA(c,.6); ctx.lineWidth=3; ctx.stroke();
  ctx.fillStyle=hexA(c,.85); ctx.fillRect(x-4,y-290,8,270);
  const cy=y-420+Math.sin(t*2)*18, s=70+(e.flash||0)*20, sw=Math.cos(t*1.7);
  ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(x,cy-s*1.5); ctx.lineTo(x+s*sw,cy); ctx.lineTo(x,cy+s*1.2); ctx.lineTo(x-s*sw,cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(x,cy-s*1.5); ctx.lineTo(x+s*sw*.5,cy-s*.3); ctx.lineTo(x,cy); ctx.closePath(); ctx.fill();
  glow(fx,x,cy,220,c,.55+.2*Math.sin(t*5)); glow(fx,x,y-200,160,c,.25);
  /* a column of light into the sky, so the node can be found from far away */
  const gr=fx.createLinearGradient(0,y-2200,0,y-300); gr.addColorStop(0,hexA(c,0)); gr.addColorStop(1,hexA(c,.35)); fx.fillStyle=gr; fx.fillRect(x-26,y-2200,52,1900);
  if(window.GFX&&Math.random()<.5) GFX.light(x,y,420,c,.8,.08,{z:300});
  const bw=300, by=y-560; ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(x-bw/2-3,by-3,bw+6,16); ctx.fillStyle=c; ctx.fillRect(x-bw/2,by,bw*k,10);
  if(e.flash>.3) glow(fx,x,cy,180,'#ffffff',e.flash*.6); return true; }
function drawChest(c){ const x=c.x, y=c.y, o=c.open, k=o?Math.min(1,(RT-c.t)/.3):0;
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,y,120,120*FSY*.8,0,0,TAU); ctx.fill();
  ctx.fillStyle='#141c20'; ctx.fillRect(x-95,y-95,190,95); ctx.fillStyle='#1d282d'; ctx.save(); ctx.translate(x-95,y-95); ctx.rotate(-k*.5); ctx.fillRect(0,-46,190,46); ctx.restore();
  ctx.fillStyle=o?'rgba(235,167,78,.35)':'#EBA74E'; ctx.fillRect(x-95,y-60,190,8);
  ctx.strokeStyle='rgba(127,243,255,.55)'; ctx.lineWidth=3; ctx.strokeRect(x-95,y-95,190,95);
  if(!o){ glow(fx,x,y-70,170,'#EBA74E',.35+.15*Math.sin(RT*4)); const b=y-230+Math.sin(RT*3)*14; ctx.fillStyle='#EBA74E'; ctx.beginPath(); ctx.moveTo(x,b+30); ctx.lineTo(x-22,b); ctx.lineTo(x+22,b); ctx.closePath(); ctx.fill(); } }
function drawLog(l){ const x=l.x, y=l.y, c=l.read?'#556677':'#EBA74E';
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(x,y,70,70*FSY,0,0,TAU); ctx.fill();
  ctx.fillStyle='#10181c'; ctx.fillRect(x-26,y-190,52,190); ctx.fillStyle=hexA(c,.9); ctx.fillRect(x-18,y-180,36,6);
  if(!l.read){ const b=y-280+Math.sin(RT*2.5)*10; ctx.save(); ctx.globalAlpha=.75+.25*Math.sin(RT*7); ctx.fillStyle='rgba(235,167,78,.2)'; ctx.strokeStyle='#EBA74E'; ctx.lineWidth=3; ctx.fillRect(x-70,b-46,140,86); ctx.strokeRect(x-70,b-46,140,86);
    ctx.fillStyle='#EBA74E'; for(let i=0;i<4;i++) ctx.fillRect(x-52,b-30+i*18,80+((i*37)%30),5); ctx.restore(); glow(fx,x,b,140,'#EBA74E',.3); } }
// floor: roads, plazas, the arena, the void past the edge
function drawFloor(){ const Z=M.Z, c=Z.acc;
  ctx.lineCap='butt';
  for(const r of M.roads){ const [x0,y0,x1,y1,w]=r, hz=Math.abs(y1-y0)<Math.abs(x1-x0), ww=hz?w*FSY:w;
    ctx.strokeStyle='rgba(0,0,0,.34)'; ctx.lineWidth=ww; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
    ctx.strokeStyle=hexA(c,.22); ctx.lineWidth=4; for(const s of [-1,1]){ ctx.beginPath(); ctx.moveTo(x0+(hz?0:s*ww/2),y0+(hz?s*ww/2:0)); ctx.lineTo(x1+(hz?0:s*ww/2),y1+(hz?s*ww/2:0)); ctx.stroke(); }
    ctx.setLineDash([90,120]); ctx.lineDashOffset=-RT*60; ctx.strokeStyle=hexA(c,.3); ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); ctx.setLineDash([]); }
  for(const p of M.plazas){ if(p.k==='log') continue; const r=p.r*(p.k==='chest'?.75:.9);
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(p.x,p.y,r,r*FSY,0,0,TAU); ctx.fill();
    ctx.strokeStyle=hexA(p.k==='chest'?'#EBA74E':c,.28); ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(p.x,p.y,r*.92,r*.92*FSY,0,0,TAU); ctx.stroke();
    if(p.k!=='chest'){ ctx.setLineDash([30,40]); ctx.lineDashOffset=RT*(p.k==='start'?30:-50); ctx.beginPath(); ctx.ellipse(p.x,p.y,r*.7,r*.7*FSY,0,0,TAU); ctx.stroke(); ctx.setLineDash([]); } }
  const a=M.arena, open=(M.gate||M.free)&&!M.king;
  ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(a.x,a.y,a.r,a.r*FSY,0,0,TAU); ctx.fill();
  ctx.strokeStyle=hexA(c,.35); for(let i=1;i<=4;i++){ ctx.lineWidth=i===4?8:3; ctx.beginPath(); ctx.ellipse(a.x,a.y,a.r*i/4.2,a.r*i/4.2*FSY,0,0,TAU); ctx.stroke(); }
  ctx.lineWidth=3; for(let i=0;i<12;i++){ const ang=i/12*TAU+RT*.05; ctx.beginPath(); ctx.moveTo(a.x+Math.cos(ang)*a.r*.25,a.y+Math.sin(ang)*a.r*.25*FSY); ctx.lineTo(a.x+Math.cos(ang)*a.r*.95,a.y+Math.sin(ang)*a.r*.95*FSY); ctx.stroke(); }
  /* the wall of light around the arena; a gap faces the city once the nodes are down */
  const wc=M.king?'#ff4a5a':open?c:'#ff4a5a', N=72;
  for(let i=0;i<N;i++){ const ang=i/N*TAU; if(open&&Math.abs(Math.atan2(Math.sin(ang-Math.PI/2),Math.cos(ang-Math.PI/2)))<.32) continue;
    const x=a.x+Math.cos(ang)*a.r, y=a.y+Math.sin(ang)*a.r*FSY, hh=(M.king||!M.gate?260:150)*(1+.15*Math.sin(RT*3+i)), g=fx.createLinearGradient(0,y-hh,0,y); g.addColorStop(0,hexA(wc,0)); g.addColorStop(1,hexA(wc,.32)); fx.fillStyle=g; fx.fillRect(x-a.r*TAU/N/2,y-hh,a.r*TAU/N,hh); }
  fx.strokeStyle=hexA(wc,.7); fx.lineWidth=5; fx.beginPath(); fx.ellipse(a.x,a.y,a.r,a.r*FSY,0,0,TAU); fx.stroke();
  if(M.gate||M.king){ for(let i=0;i<6;i++){ const ang=i/6*TAU+RT*.15, x=a.x+Math.cos(ang)*a.r*.62, y=a.y+Math.sin(ang)*a.r*.62*FSY, g=fx.createLinearGradient(0,y-1600,0,y); g.addColorStop(0,hexA(c,0)); g.addColorStop(1,hexA(c,.22+.1*Math.sin(RT*4+i))); fx.fillStyle=g; fx.fillRect(x-18,y-1600,36,1600); }
    ctx.strokeStyle=hexA(c,.5); ctx.lineWidth=4; for(const o of [0,Math.PI/3]){ ctx.beginPath(); for(let i=0;i<=3;i++){ const ang=o+i/3*TAU-RT*.1, x=a.x+Math.cos(ang)*a.r*.62, y=a.y+Math.sin(ang)*a.r*.62*FSY; i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.stroke(); } }
  /* outside the map: dark, with a fence of light along the edge */
  const B=M.B, {hw,hh}=S.view(), X0=cam.x-hw-400, X1=cam.x+hw+400, Y0=cam.y-hh-400, Y1=cam.y+hh+400;
  ctx.fillStyle='rgba(2,7,9,.86)'; if(X0<B.l) ctx.fillRect(X0,Y0,B.l-X0,Y1-Y0); if(X1>B.r) ctx.fillRect(B.r,Y0,X1-B.r,Y1-Y0); if(Y0<B.t) ctx.fillRect(Math.max(X0,B.l),Y0,Math.min(X1,B.r)-Math.max(X0,B.l),B.t-Y0); if(Y1>B.b) ctx.fillRect(Math.max(X0,B.l),B.b,Math.min(X1,B.r)-Math.max(X0,B.l),Y1-B.b);
  fx.strokeStyle=hexA('#7FF3FF',.45); fx.lineWidth=4; fx.setLineDash([60,40]); fx.lineDashOffset=RT*40; fx.strokeRect(B.l,B.t,B.r-B.l,B.b-B.t); fx.setLineDash([]);
  for(const ch of M.chests) drawChest(ch); for(const l of M.logs) drawLog(l);
  ambient(); }
// what moves in the air of each zone
function ambient(){ const {hw,hh}=S.view(), A_=M.amb, kind=AMB[M.zk], c=M.Z.acc;
  M.ambT-=1/60; if(M.ambT<=0&&A_.length<70){ M.ambT=.05; A_.push({x:cam.x+rand(-hw,hw),y:cam.y+rand(-hh,hh*1.1),t:0,life:rand(2,5),ph:rand(0,TAU),s:rand(.6,1.4)}); }
  for(let i=A_.length-1;i>=0;i--){ const p=A_[i]; p.t+=1/60; if(p.t>p.life){ A_.splice(i,1); continue; } const k=p.t/p.life, al=Math.sin(k*Math.PI);
    if(kind==='rings'){ const r=40+k*320*p.s; fx.strokeStyle=hexA(c,.22*al); fx.lineWidth=3; fx.beginPath(); fx.ellipse(p.x,p.y,r,r*FSY,0,0,TAU); fx.stroke(); }
    else if(kind==='embers'){ glow(fx,p.x+Math.sin(p.t*2+p.ph)*30,p.y-p.t*120,10*p.s,'#ff8a3a',.8*al); }
    else if(kind==='gold'){ const y=p.y-p.t*60; glow(fx,p.x,y,12*p.s,'#ffd27a',.8*al); if(p.s>1.25){ ctx.globalAlpha=.6*al; ctx.fillStyle='#ffc04a'; ctx.beginPath(); ctx.ellipse(p.x,y-40,16*Math.abs(Math.cos(p.t*3)),16,0,0,TAU); ctx.fill(); ctx.globalAlpha=1; } }
    else if(kind==='flies'){ glow(fx,p.x+Math.sin(p.t*1.3+p.ph)*80,p.y-120+Math.cos(p.t*1.7+p.ph)*50,9*p.s,'#9effc8',.9*al); }
    else if(kind==='motes'){ glow(fx,p.x+Math.sin(p.t+p.ph)*40,p.y-200+p.t*40,9*p.s,'#d2b6ff',.7*al); }
    else if(kind==='glitch'){ if(Math.random()<.3){ ctx.fillStyle=hexA(Math.random()<.5?c:'#7FF3FF',.35*al); ctx.fillRect(p.x,p.y-rand(0,300),rand(20,140)*p.s,rand(6,22)); } }
    else if(kind==='scan'){ fx.strokeStyle=hexA('#fff0b8',.12*al); fx.lineWidth=3; const y=p.y+k*200; fx.beginPath(); fx.moveTo(p.x-400*p.s,y); fx.lineTo(p.x+400*p.s,y); fx.stroke(); } }
  /* fires smoke, lamps light the ground */
  for(const p of vis){ const L=p.k.light; if(p.k.fire&&Math.random()<.06) smoke(p.x+(L&&L.x||0)*p.w(),p.y-p.h*.9,rand(14,24),{vx:rand(-20,20),vy:rand(-90,-50),a:.25,life:1.6,grow:40});
    if(p.k.fire&&Math.random()<.12) glow(fx,p.x+rand(-20,20),p.y-p.h*(1+Math.random()*.5),8,'#ffb050',.9);
    if(L&&window.GFX&&Math.random()<.35){ let f=1; if(L.blink) f=(Math.sin(RT*3+p.ph)>.2)?1:.1; GFX.light(p.x+(L.x||0)*p.w(),p.y+10,Math.min(290,L.r),L.c,(L.a||.6)*.55*f,.12,{z:p.h*(L.y||.5)*.6}); } } }
// the way to the next objective, drawn at the hero's feet when it is off screen
function holo(){ const {hw,hh}=S.view(), c=M.Z.acc;
  for(const b of M.holos){ if(Math.abs(b.x-cam.x)>hw+400||b.y-b.z-b.h>cam.y+hh+200||b.y<cam.y-hh-200) continue; const x=b.x-b.w/2, y=b.y-b.z-b.h+Math.sin(RT*1.2+b.ph)*10, on=Math.random()<.985?1:.3;
    fx.fillStyle=hexA('#7FF3FF',.05*on); fx.fillRect(b.x-2,y+b.h,4,b.z-6); fx.fillStyle=hexA(c,.11*on); fx.fillRect(x,y,b.w,b.h); fx.strokeStyle=hexA(c,.6*on); fx.lineWidth=3; fx.strokeRect(x,y,b.w,b.h);
    fx.fillStyle=hexA(c,.07); for(let k=0;k<b.h;k+=8) fx.fillRect(x,y+k,b.w,2);
    if(b.kind===0){ for(let k=0;k<5;k++){ const bh=(.25+.7*Math.abs(Math.sin(RT*1.5+k+b.ph)))*(b.h-40); fx.fillStyle=hexA(c,.45*on); fx.fillRect(x+20+k*(b.w-40)/5,y+b.h-20-bh,(b.w-40)/5-10,bh); } }
    else if(b.kind===1){ fx.strokeStyle=hexA(c,.55*on); fx.lineWidth=4; fx.beginPath(); fx.arc(b.x,y+b.h/2,b.h*.3,RT*1.4+b.ph,RT*1.4+b.ph+4.2); fx.stroke(); fx.beginPath(); fx.arc(b.x,y+b.h/2,b.h*.16,0,TAU); fx.stroke(); }
    else { fx.fillStyle=hexA(c,.4*on); for(let k=0;k<4;k++) fx.fillRect(x+18,y+20+k*(b.h-30)/4,(b.w-36)*(.4+.6*Math.abs(Math.sin(k*1.7+b.ph+RT*.4))),(b.h-30)/4-12); }
    glow(fx,b.x,y+b.h/2,b.w*.55,c,.12*on); } }
// frame/quest.js: in a frame hunting field the main quest's arrow at the hero's feet points the way instead
function pointer(){ let tg=null; if(M.king||G.frame&&G.frame.run&&G.frame.run.kind==='field') return; if(M.gate) tg=M.arena; else { let b=1e9; for(const n of M.nodes){ if(n.done) continue; const d=fd(pl.x,pl.gy,n.x,n.y); if(d<b){ b=d; tg=n; } } }
  if(!tg) return; const {hw,hh}=S.view(); if(Math.abs(tg.x-cam.x)<hw*.8&&Math.abs(tg.y-cam.y)<hh*.8) return;
  const ang=Math.atan2((tg.y-pl.gy)/FSY,tg.x-pl.x), r=250, x=pl.x+Math.cos(ang)*r, y=pl.gy+Math.sin(ang)*r*FSY, c=M.Z.acc, p=.6+.4*Math.sin(RT*5);
  fx.save(); fx.translate(x,y); fx.scale(1,FSY); fx.rotate(ang); fx.fillStyle=hexA(c,.75*p); fx.beginPath(); fx.moveTo(60,0); fx.lineTo(-20,-42); fx.lineTo(0,0); fx.lineTo(-20,42); fx.closePath(); fx.fill(); fx.restore(); }

// ============================================================ HUD: objective line, message panel, minimap
const hud=document.getElementById('shud'), css=document.createElement('style'); css.textContent=`
#shud .dmini{position:fixed;top:8px;left:auto;right:62px;bottom:auto;width:128px;height:90px;border:1px solid rgba(127,243,255,.45);background:rgba(3,12,15,.62);box-shadow:0 0 12px rgba(127,243,255,.15);display:none;pointer-events:none}
#shud.dun .dmini{display:block}
@media (max-width:780px){ #shud .dmini{left:10px;right:auto;top:auto;bottom:auto;top:118px;width:116px;height:82px} }
#shud .dmsg{position:fixed;left:50%;top:92px;transform:translateX(-50%);max-width:min(560px,70vw);padding:8px 16px 9px;text-align:center;border:1px solid rgba(127,243,255,.4);background:rgba(3,12,15,.7);color:#e8fbff;font:600 13px/1.45 "Noto Sans KR",sans-serif;opacity:0;transition:opacity .35s;pointer-events:none;box-shadow:0 0 14px rgba(127,243,255,.15)}
#shud .dmsg b{display:block;font:700 15px "Noto Sans KR",sans-serif;letter-spacing:.02em}
#shud .dmsg.on{opacity:1}
#shud.dun .tm{font-size:19px!important;letter-spacing:.03em}`;
document.head.appendChild(css);
const mini=document.createElement('canvas'); mini.className='dmini'; mini.width=336; mini.height=236; hud.appendChild(mini);
const msg=document.createElement('div'); msg.className='dmsg'; hud.appendChild(msg);
let lastMini=0;
function hudTick(){ const $=s=>hud.querySelector(s), Z=M.Z, tm=$('.tm'), kc=$('.kc');
  // frame/quest.js: in a frame hunting field the main quest panel gives the objective; this line keeps only the node count until the zone is subdued
  const obj=G.frame&&G.frame.run&&G.frame.run.kind==='field'&&!M.free?`신호 노드 ${M.done} / ${M.nodes.length}`:M.king?(M.won?'왕 제압':'왕을 쓰러뜨려라'):M.free?'제압한 구역':M.gate?'왕의 문으로':`신호 노드 ${M.done} / ${M.nodes.length}`;
  if(tm) tm.textContent=obj; if(kc) kc.innerHTML=`<span>${Z.no}구역 · ${Z.name}</span><b>처치 ${V.kills} · 보급 ${M.chests.filter(c=>c.open).length}/${M.chests.length}${M.loot.length?` · <span style="color:#EBA74E${RT-(M.lootT||-9)<3?';text-shadow:0 0 8px #EBA74E':''}">장비 ${M.loot.length}</span>`:''}</b>`;
  if(M.msg){ const age=RT-M.msg.t0; msg.innerHTML=`<b style="color:${M.msg.c}">${M.msg.t}</b>${M.msg.sub||''}`; msg.classList.toggle('on',age<(M.msg.sub&&M.msg.sub.length>30?5.5:2.8)); }
  if(RT-lastMini<.1) return; lastMini=RT;
  const g=mini.getContext('2d'), B=M.B, W_=mini.width, H_=mini.height, sx=W_/(B.r-B.l), sy=H_/(B.b-B.t), X=x=>(x-B.l)*sx, Y=y=>(y-B.t)*sy;
  g.clearRect(0,0,W_,H_); g.fillStyle='rgba(127,243,255,.05)'; g.fillRect(0,0,W_,H_);
  g.strokeStyle='rgba(127,243,255,.28)'; g.lineCap='round'; for(const r of M.roads){ g.lineWidth=Math.max(3,r[4]*sx*.8); g.beginPath(); g.moveTo(X(r[0]),Y(r[1])); g.lineTo(X(r[2]),Y(r[3])); g.stroke(); }
  g.fillStyle='rgba(160,190,195,.35)'; for(const p of M.props) if(p.k.big) g.fillRect(X(p.x)-3,Y(p.y)-3,6,6);
  const a=M.arena; g.strokeStyle=M.gate||M.free?Z.acc:'#ff4a5a'; g.lineWidth=2.5; g.beginPath(); g.ellipse(X(a.x),Y(a.y),a.r*sx,a.r*FSY*sy,0,0,TAU); g.stroke();
  for(const c of M.chests){ g.fillStyle=c.open?'rgba(235,167,78,.25)':'#EBA74E'; g.fillRect(X(c.x)-4,Y(c.y)-4,8,8); }
  for(const l of M.logs){ if(l.read) continue; g.strokeStyle='#EBA74E'; g.lineWidth=2; g.strokeRect(X(l.x)-4,Y(l.y)-4,8,8); }
  for(const n of M.nodes){ const x=X(n.x), y=Y(n.y); g.fillStyle=n.done?'rgba(127,243,255,.25)':Z.acc; g.beginPath(); g.moveTo(x,y-9); g.lineTo(x+7,y); g.lineTo(x,y+9); g.lineTo(x-7,y); g.closePath(); g.fill(); }
  for(const e of V.en){ if(e.dead||e.d.node) continue; g.fillStyle=e.d.boss?'#ff4a5a':'rgba(255,90,100,.6)'; const s=e.d.boss?6:2; g.fillRect(X(e.x)-s/2,Y(e.y)-s/2,s,s); }
  const {hw,hh}=S.view(); g.strokeStyle='rgba(255,255,255,.35)'; g.lineWidth=1.5; g.strokeRect(X(cam.x-hw),Y(cam.y-hh),hw*2*sx,hh*2*sy);
  g.fillStyle='#fff'; g.beginPath(); g.arc(X(pl.x),Y(pl.gy),5,0,TAU); g.fill(); }

// ============================================================ engine hooks (globals the engine calls; surv.js wrapped them first)
let runStats=null;
const upd0=update; update=function(rdt){
  if(G.mode==='surv'&&G.stats!==runStats){ runStats=G.stats; if(!V.practice&&!V.over&&!(G.frame&&G.frame.run&&/^(town|village|secret|endless)$/.test(G.frame.run.kind))) start(); else stop(); }
  if(G.mode!=='surv'&&M) stop();
  if(M&&!G.paused) tick(rdt);
  upd0(rdt);
  if(M&&G.mode==='surv'&&!G.paused){ collide(); hudTick(); } };
function start(){ const ch=V.ch; M=build(ch);
  if(SPR.crystal) SPR.crystal.ok=false;
  /* frame/field.js: a zone already subdued is open ground — its nodes are down from the start, no king, the arena door open */
  if(G.frame&&G.frame.run&&G.frame.run.kind==='field'&&!G.frame.run.first){ M.free=true; for(const n of M.nodes) n.done=true; }
  /* frame/challenge.js: a king rematch skips to the arena — the nodes are down, the door open, the hero (cloth and camera with him) just outside its mouth */
  if(G.frame&&G.frame.run&&G.frame.run.kind==='rematch'){ for(const n of M.nodes) n.done=true; M.done=M.nodes.length; M.gate=true; const a=M.arena; pl.x=pl.home=a.x; pl.gy=a.y+(a.r+260)*FSY; for(const q of [...pl.scarf,...pl.coat]) q.init=false; cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-BODY*.6; }
  for(const n of M.nodes){ if(n.done) continue; const e=S.spawn('node',n.x,n.y); e.stun=1e9; n.e=e; }
  /* the run opened with a scatter of crystals around the hero: thin it to a handful */
  V.en=V.en.filter(e=>e.d.node); pack(pl.x,pl.gy-900,4,false);
  for(const p of parts) if(p.k==='banner'){ p.en=`ZONE ${String(M.Z.no).padStart(2,'0')} · ${M.free?'제압한 구역':'신호 노드 3개를 파괴하고 왕을 쓰러뜨려라'}`; }
  // frame/quest.js: in a frame hunting field the main quest says what to do first, so the zone banner keeps only the zone's name
  hud.classList.add('dun'); if(M.free) say('제압한 구역 · 자유롭게 둘러보세요',''); else say(`${M.Z.no}구역 · ${M.Z.name}`,G.frame&&G.frame.run&&G.frame.run.kind==='field'?'':'신호 노드 3개를 찾아 파괴하라. 노드의 빛기둥을 따라가면 된다.'); }
function stop(){ if(!M) return; M=null; if(SPR.crystal) SPR.crystal.ok=true; hud.classList.remove('dun'); msg.classList.remove('on'); }
const prep0=drawBackground_prep; drawBackground_prep=function(){ prep0(); if(!M||G.mode!=='surv') return; applyCam(ctx); applyCam(fx); drawFloor(); ctx.setTransform(1,0,0,1,0,0); };
const de0=drawEnemy; drawEnemy=function(){ if(M&&G.mode==='surv') visible(); de0(); if(M&&G.mode==='surv') drawUpTo(pl.gy??0); };
const dp0=drawPlayer; drawPlayer=function(){ dp0(); if(M&&G.mode==='surv'){ drawUpTo(1e9); holo(); pointer(); } };
const fd0=G.foeDraw; G.foeDraw=function(e){ if(M&&G.mode==='surv'){ drawUpTo(e.y); if(e.d.node) return drawNode(e); } return fd0?fd0(e):false; };
const fy0=G.foeDying; G.foeDying=function(q){ if(q.e.d.node){ const k=q.t/q.life; glow(fx,q.e.x,q.e.y-400,300*(1+k),M?M.Z.acc:'#7FF3FF',(1-k)*.8); return true; } return fy0?fy0(q):false; };
// the result screen reads the run from here
G.dun={get on(){ return !!M; },result(){ if(!M) return null; return {gold:M.gold,loot:M.loot.length,lootR:M.loot.slice(),nodes:M.done,total:M.nodes.length,chests:M.chests.filter(c=>c.open).length,chestsN:M.chests.length,el:M.el,won:M.won}; },get M(){ return M; }};
})();
