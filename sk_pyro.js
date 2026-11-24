// 참광 survival - PYRO skill set (top-down, all automatic). Fire: balls, pillars, rings, breath, tornadoes. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js) and FX3 meshes; the pieces that only fire needs (whirl, ring of fire, burning line,
// scorch, comet, flamethrower fan, the wings) live in this file.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,ultStart,ultStop,ultHit}=X;
const K=window.K3, F=window.FX3, PI=Math.PI, mix=(a,b,k)=>a+(b-a)*k, sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k);
const C1='#ff7a2a';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
// the auto-caster only calls a skill whose cooldown is ready, and takes `false` for "this cast would be wasted". A direct call (the cooldown is
// not ready: practice hall, a capture) is an order: the skill fires at whatever is on the field.
const ordered=id=>(V.cd[id]||0)>0;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const push=b=>S([['gb02',.04],['gb03',.05,{kick:[-.8,.6]}],['gb04',.06],['gb05',.04,{kick:[1.6,-1.2]}],['gb06',.08],['gb08',.07],['gb12',.05]],b);
const raise=()=>S([['gx01',.06],['gx03',.12,{kick:[-.8,.6]}],['gx06',.1,{kick:[2,-1.6]}],['gx07',.3],['gx09',.1],['gx12',.1,{kick:[2,-1.6]}],['gx14',.15]]);

// ---------------------------------------------------------------- palettes: d dark outer mass, b body, h hot core, l floor light, s spark
const PF={d:'#340600',b:'#ff4208',m:'#ffae24',h:'#fff3c4',l:'#ff6a1c',s:'#ffc478'};   // living fire: deep red-orange body, amber heat, yellow-white core
const PG={d:'#421a00',b:'#ff9410',m:'#ffe070',h:'#fffbe6',l:'#ffae34',s:'#ffe6a0'};   // the hottest part: gold
const PD={d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'};   // the dragon's own fire: crimson
const PB={d:'#06102e',b:'#3a7cff',m:'#bfe2ff',h:'#ffffff',l:'#a8caff',s:'#dff0ff'};   // blue-white: only the very hottest instant
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m||P.b});
if(F&&F.on){ for(const n of ['fx_sun','meteor','fx3_tornado','fx3_fire','fx3_smoke','v3_circ_pyro','v3_comet_tail','v3_crater','v3_scorch','v3_flame_cone','v3_vortex_wisps']) F.img(n); F.img('v3_groundfire',{repeat:true}); for(const n of ['v3_burst_fire','v3_shock_thick','v3_fissure_b','v3_flip_blast','v3_flip_smoke','v3_flip_shock']) F.img(n); }
// ---------------------------------------------------------------- local pieces of the normal skills (redevelopment: one shape per skill,
// the effect lands ON the enemy, nothing about a shape is random per frame - only loose sparks are)
// the yaw the volume pieces expect for a heading given in floor units (the floor's y is already squashed)
const fdir=(dx,dy)=>Math.atan2(dy/FSY,dx);
const h01=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
const rgb3=h=>typeof h==='string'?GFX.rgb(h):h;
const dist2=(e,x,y)=>Math.hypot(e.x-x,(e.y-y)/FSY);
// the burn every fire skill leaves on what it touches (flames climbing the body)
const burn=(e,dur,max,s)=>K.mark(e,'burn',{dur,max:max||1,s:s||.8});
// a spark that is a line along the way it flies
const streak=(x,y,z,vx,vy,vz,life,o={})=>GFX.pt({x,y,z,vx,vy,vz,g:o.g??-60,drag:o.drag??1.2,life,s:o.s||3.5,m:3,len:o.len||.05,c:GFX.rgb(Math.random()<.4?PG.h:PF.s),c2:PF.b,L:3});
// sparks drawn in to a point in the air (something is being pressed together there)
function gather(get,n,dur,r0,r1){ for(let i=0;i<n;i++) after(i*dur/n,()=>{ const [x,y,z]=get(), b=i/n*TAU*2.4+h01(i*3.7), r=mix(r0,r1,h01(i*1.9));
    GFX.pt({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*FSY,z:Math.max(0,z+(h01(i*5.1)-.5)*r),tx:x,ty:y,tz:z,pull:rand(8,11),vx:-Math.sin(b)*300,vy:Math.cos(b)*180,life:rand(.16,.26),s:rand(2.5,4.5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PG.h:PF.s),c2:PF.b,L:3}); }); }
// HOTSPOT: the floor under a target drawing to a hot point: dull red -> orange -> gold-white, only ever brighter. get() -> [x,y] every frame.
function hotspot(get,dur,r){ if(!F.on) return; const km=K.mats(); GFX.add(dur,k=>{ const [x,y]=get(), H=K.heat(PF,1-k*.9), rr=r*(.5+.5*k);
    F.quad(km.dark,x,y,rr*1.2,rr*1.2,0,{a:.45*k});
    F.quad(km.glowG,x,y,rr*1.5,rr*1.5,0,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:.3+.7*k,gain:1.3*H.g*(.5+k)});
    F.quad(km.glowG,x,y,rr*.42,rr*.42,0,{...col(PG),a:k*k,gain:3,rk:[.3,.7]});
    const cr=r*mix(1.7,.95,eo3(k)); F.ring(km.shL,x,y,cr*.74,cr,{...col(PG),a:.6+.4*k,gain:1.5+k}); F.ring(km.shL,x,y,cr*.5,cr*.62,{...col(PF),a:.5*k,gain:1.3}); }); }
// slow embers left hanging where fire was (so nothing ends in one frame)
const embers=(x,y,z,n,r=60)=>K.sparks(x,y,z,{pal:PF,n,sp:[20,r*2.4],up:420,life:[.45,1],s:3});
// COMET: the basic attack in flight: a small gold ball with a white heart, one stream of fire dragged straight behind it, sparks along its track.
function comet(p,o={}){ if(!F.on) return; const s=o.s||56, z=o.z??BODY*.55, life=p.life+.05, km=K.mats(), CG=col(PG), bx=p.x, by=p.y; let pt=0;
  const Lt=GFX.light(p.x,p.y,s*9,PF.l,.7,.15,{hold:p.life,z}), orb=K.vorb(p.x,p.y,z,{r:s,pal:PG,dur:life,in:.05,out:.03,spin:6,core:.34,heat:.95,gain:1}),
    jet=K.vjet(p.x,p.y,z,fdir(-p.vx,-p.vy),{len:s*9,r:s*1.25,r0:s*.85,dur:life,in:.07,out:.03,turb:.6,speed:11,pal:PF,heat:1.45});
  GFX.add(life,(k,t)=>{ if(p.life<=0){ Lt.hold=0; orb.dead=jet.dead=true; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp;
    Lt.x=p.x; Lt.y=p.y; orb.x=p.x; orb.y=p.y; jet.x=p.x-ux*s*.3; jet.y=p.y-uy*s*.3; jet.dir=fdir(-ux,-uy); jet.len=Math.min(s*9,Math.hypot(p.x-bx,(p.y-by)/FSY)+30);
    F.bill(km.glowO,p.x,p.y,z,s*1.5,s*1.5,0,{...CG,a:1,gain:3});
    if(t-pt>.025){ pt=t; streak(p.x,p.y,z+rand(-14,14),-ux*rand(200,500)+rand(-60,60),-uy*rand(200,500)+rand(-40,40),rand(-30,90),rand(.18,.36)); } }); }
// the basic attack's projectile: fast (it lands inside .4 s), bursts at chest height on the body it hits and leaves it burning
function firebolt(x0,y0,a,d,home){ const sp=2400, p={x:x0,y:y0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.4,d:0,r:70,home,turn:9,c:C1,pw:.9,kb:.3};
  comet(p);
  p.onHit=(e,p)=>{ p.hitAny=true; const zc=e.h*.55+e.z, hd=fdir(p.vx,p.vy), ex=e.x, ey=e.y, sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, tp=[];
    for(let i=0;i<=6;i++){ const u=i/6; tp.push({x:mix(x0,ex,u),y:mix(y0,ey,u),z:mix(BODY*.55,zc,u)}); }
    K.trail(tp,{w:44,dur:.34,pal:PF,draw:.02,hold:.1,gain:1.3}); K.trail(tp,{w:15,dur:.4,pal:PW,draw:.02,hold:.16,gain:1.8});
    K.ehit(e,{pal:PG,dir:hd,pw:1.15,ring:0}); blow(e,d,{dir:hd,dist:260,up:760},1.3,{sx:ex-p.vx,sy:ey-p.vy},.5);
    K.vjet(ex-ux*20,ey-uy*20,zc,hd,{len:330,r:120,r0:40,dur:.36,in:.05,out:.22,pal:PF,heat:1.5,turb:.95,speed:14});
    K.vblast(ex,ey,{s:105,z:zc,pal:PG,smoke:0,dur:.3,fire:.2,rise:60,lump:.7}); GFX.light(ex,ey,520,PF.l,.9,.3,{z:zc}); sfx('fire',.4,.4);
    K.sparks(ex,ey,zc,{pal:PG,n:12,dir:hd,spread:.55,sp:[500,1700],up:360,life:[.18,.45],s:3}); K.dust(ex,ey,{n:4,dir:hd,spread:.5,sp:[200,560],a:.34});
    K.cool(ex+ux*60,ey+uy*60,{kind:'scorch',r:95,pal:PF,life:1.5,start:.2,light:0,shed:0});
    K.vcolumn(ex+ux*70,ey+uy*70,{r:32,h:170,dur:.85,rise:.12,out:.45,pal:PF,taper:.6,turb:.9,delay:.14}); K.vsmoke(ex+ux*70,ey+uy*70,{s:70,z:120,dur:.7,delay:.8,a:.3,rise:200});
    after(.6,()=>embers(ex+ux*70,ey+uy*70,30,5,40));
    inCircle(ex,ey,150,q=>{ if(q!==e) blow(q,d*.5,{from:[ex,ey],dist:150,up:300},.9,{sx:ex,sy:ey},.5); }); };
  p.onEnd=p=>{ if(!p.hitAny){ K.vblast(p.x,p.y,{s:70,z:BODY*.5,pal:PF,smoke:0,dur:.35,fire:.22,rise:40}); K.sparks(p.x,p.y,BODY*.5,{pal:PF,n:6,dir:fdir(p.vx,p.vy),spread:.6,sp:[300,900],up:200,life:[.15,.35]}); } };
  V.pj.push(p); return p; }
// TWISTER: a small hollow whirl of fire drawn straight on the volume renderer so that its colour can move through the three heats
// (crimson -> orange -> gold, a step every 1.2 s) while its size stays exactly what it was born with. It goes out from the foot upward.
const TST=[PD,PF,PG];
function tcol(c){ c=Math.max(0,Math.min(1.999,c)); const i=Math.floor(c), u=c-i, p=TST[i], q=TST[i+1], mx=(a,b)=>{ a=rgb3(a); b=rgb3(b); return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u]; };
  return {cA:mx(p.d,q.d),cB:mx(p.b,q.b),cM:mx(p.m,q.m),cC:mx(p.h,q.h),cS:mx(p.d,q.d)}; }
function twister(x,y,v,life){ const H={x,y,dead:false,c:0}, VQ=window.VOL; if(!VQ||!K.vok||!K.vok()) return H; const m=F.on?um1():null, km=F.on?K.mats():null; let bt=-1, dt=0;
  GFX.add(life+.05,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/.35)), f=sat((t-(life-.34))/.34), c=sat((t-1.1)/.25)+sat((t-2.3)/.25), hgt=v.h*(.3+.7*up), cut=hgt*.94*f, hh=(hgt-cut)/2, rr=v.r*1.3, P=TST[Math.min(2,Math.round(c))];
    H.c=c; VQ.add('funnel',H.x,H.y,cut+hh,{ex:rr,ey:rr,ez:hh,pa:[mix(v.r0,v.r*.7,f*f)/rr,.72*(.6+.4*up),v.th,v.spin],pb:[1.05+.12*c,2.4,v.sway,.75],dens:10*sat(t*8)*(1-f*f*f),gain:1.6-.22*c,seed:v.sd,smoke:.12,fire:.5,rim:0,...tcol(c)});
    if(!m) return; const on=sat(t*5)*(1-f);
    const fr=v.r*1.25*(1-f*f); F.quad(km.dark,H.x,H.y,fr,fr,0,{a:.5*sat(t*5)}); F.ring(m.wv,H.x,H.y,v.r0*.6*(1-f),fr,{cA:P.d,cB:P.b,cM:P.m,cC:P.m,a:.85*sat(t*5),gain:1.5,t0:v.sd+t*v.spin*.35});
    if(t-dt>.16&&f<=0){ dt=t; const b=t*v.spin*.5+v.sd; K.dust(H.x+Math.cos(b)*v.r*.7,H.y+Math.sin(b)*v.r*.7*FSY,{n:2,dir:b+PI/2,spread:.3,sp:[260,620],a:.34,s:.9,life:.6}); }
    // the bands: four bright ribbons wound round the near side of the wall, climbing all the time (drawn every frame from the clock, so the turn of the
    // whirl is there in any single frame), and under each a dark one so it stands off the fire
    const CR=col(c>1.5?PW:PG); for(let j=0;j<4;j++){ const q=(j/4+t*.42+v.sd*.1)%1, h0=-.1+q*.95, fa=Math.sin(PI*q)*on*up, tp=[], dp=[]; if(fa<.05) continue;
      for(let i=0;i<=10;i++){ const u=i/10, hz=h0+u*.2; if(hz<.02||hz>.98) continue; const a=.15+u*(PI-.3), rad=mix(v.r0,v.r,Math.pow(hz,1.15))*1.04, ww=(34+30*hz)*Math.sin(PI*u)*fa, px=H.x+Math.cos(a)*rad, py=H.y+Math.sin(a)*rad*FSY+6, pz=cut+(hgt-cut)*hz;
        tp.push({x:px,y:py,z:pz,w:ww}); dp.push({x:px,y:py,z:pz-26,w:ww*1.5}); }
      if(tp.length>2){ F.ribbon(km.slU,dp,{a:.5*fa,t0:v.sd+j}); F.ribbon(km.trB,tp,{...CR,gain:2.6,ero:.12,t0:v.sd+j,a:fa}); F.ribbon(km.trC,tp,{...CR,gain:4,ero:.2,t0:v.sd+j,a:fa}); } } });
  return H; }

const sk={
  py_basic:{cls:'pyro',type:'basic',name:'파이어 볼',lv:1,desc:'적을 쫓아가 터지는 화염구를 던진다. 강화할수록 화염구가 늘어난다.'},
  py_dash:{cls:'pyro',type:'skill',name:'플레임 대시',lv:1,cd:5,dmg:1800,desc:'불꽃이 되어 돌진하고, 지나간 자리에 2초 동안 불길을 남긴다.',evo:'불길이 4초 동안 남는다.'},
  py_pillar:{cls:'pyro',type:'skill',name:'파이어 필러',lv:1,cd:4,dmg:2800,desc:'적 3명의 발밑에서 화염 기둥을 솟구치게 한다.',evo:'기둥이 5개가 된다.'},
  py_ring:{cls:'pyro',type:'skill',name:'플레임 링',lv:2,cd:7,dmg:2600,desc:'몸에서 불의 고리를 퍼뜨려 주변을 모두 태운다.',evo:'고리가 두 번 퍼진다.'},
  py_boom:{cls:'pyro',type:'skill',name:'익스플로전',lv:3,cd:8,dmg:3600,desc:'적이 몰린 곳을 크게 폭발시킨다.',evo:'폭발 뒤에 작은 폭발이 연달아 터진다.'},
  py_rain:{cls:'pyro',type:'skill',name:'파이어 레인',lv:5,cd:9,dmg:2400,desc:'하늘에서 화염구 8개를 쏟아붓는다.',evo:'화염구가 12개가 된다.'},
  py_breath:{cls:'pyro',type:'skill',name:'플레임 쓰로워',lv:6,cd:10,dmg:400,desc:'2초 동안 앞쪽 부채꼴로 불길을 뿜는다.',evo:'불길이 더 길고 넓어진다.'},
  py_tornado:{cls:'pyro',type:'skill',name:'파이어 토네이도',lv:8,cd:11,dmg:500,desc:'불의 회오리 2개를 일으켜 4초 동안 적을 쫓게 한다.',evo:'회오리가 3개가 된다.'},
  py_nova:{cls:'pyro',type:'skill',name:'슈퍼노바',lv:10,cd:13,dmg:9000,desc:'불꽃을 압축했다가 주변 전체를 날려 버리는 대폭발을 일으킨다.',evo:'범위가 크게 넓어진다.'},
  py_ult1:{cls:'pyro',type:'ult',name:'파이어 스톰',lv:3,desc:'궁극기. 등 뒤에 거대한 화염 회오리를 일으켜 화면의 모든 적을 끌어들여 태운 뒤, 회오리를 터뜨려 전부 날려 버린다.'},
  py_ult2:{cls:'pyro',type:'ult',name:'홍염익',lv:12,desc:'궁극기. 등 뒤로 화염의 날개를 펼쳐 열파로 화면의 모든 적을 불태운 뒤, 날갯짓 한 번으로 전부 날려 버린다.'},
  py_ult3:{cls:'pyro',type:'ult',name:'대분화',lv:5,desc:'궁극기. 땅에 손을 짚어 지면을 달구고 화면 끝까지 균열을 낸 뒤, 거대한 버섯 화구를 터뜨려 모든 적을 날리고 전역에 용암탄을 쏟아붓는다.'},
};
const order=Object.keys(sk);

// basic (a comet): a spark is pressed into a gold ball at his hand in the same motion as the throw; it drags one long stream of fire, lands inside .4 s,
// bursts on the chest of what it hits, throws that body back along its flight and leaves it burning
function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); push(true); const n=1+Math.floor((L('py_basic')+1)/2), d=1500*A.mul('py_basic'), hx=pl.x+Math.cos(a)*70, hy=pl.gy+Math.sin(a)*70, hz=BODY*.55;
  K.vorb(hx,hy,hz,{r:44,pal:PG,dur:.09,in:.06,out:.02,spin:7,core:.3,heat:.9,gain:.9}); K.flare(hx,hy,hz,{pal:PG,s:90,dur:.1,gain:2.2}); GFX.light(hx,hy,300,PG.l,.5,.16,{z:hz});
  after(.06,()=>{ for(let k=0;k<n;k++) after(k*.07,()=>firebolt(hx,hy,a+(k-(n-1)/2)*.2,d,e)); sfx('fireball',.8); });
  return true; }

// a blow that is SEEN: the body is thrown (and lit) at once, the damage lands a moment later while it is in the air - so what a hit kills still flies
// FLING: the arc a struck body takes, written in the air as a tail of fire from where it stood to where it comes down (so the throw is read even in
// the frame after the body is gone), with a puff of embers where it lands. A few per frame at most.
// WISP: a tatter of fire along a path - the body of a ribbon without the white spine (so it never reads as a drawn line): it is laid along the path in
// `draw` seconds, holds, then burns away from the tail
function wisp(pts,o={}){ if(!F.on) return; const km=K.mats(), C=col(o.pal||PF), dur=o.dur||.4, draw=o.draw??.1, hold=o.hold||0, w=o.w||40, n=pts.length, sd=h01(pts[0].x+pts[0].y)*9;
  GFX.add(dur,(k,t)=>{ const d=sat(t/draw), f=sat((t-draw-hold)/(dur-draw-hold)), i0=Math.min(n-2,Math.floor((n-1)*f*.8)), i1=Math.max(i0+2,Math.round(n*d)), ps=[];
    for(let i=i0;i<Math.min(n,i1);i++){ const u=(i-i0)/Math.max(1,Math.min(n,i1)-1-i0); ps.push({x:pts[i].x,y:pts[i].y,z:pts[i].z||0,w:w*Math.pow(Math.sin(PI*Math.min(1,.12+u*.88)),.6)*(1-f*.5)}); }
    if(ps.length>1){ F.ribbon(km.slU,ps.map(q=>({x:q.x,y:q.y,z:q.z-14,w:q.w*1.4})),{a:.4*(1-f),t0:sd}); F.ribbon(km.trB,ps,{...C,gain:2.6*(o.gain||1),ero:.12+f*.7,t0:sd,a:1-f*f}); } },o.delay||0); }
let flT=-1, flN=0;
function fling(o,kn){ if(!F.on||o.dead||o.d.boss) return; if(flT!==RT){ flT=RT; flN=0; } if(flN++>=5) return; const wt=o.d.heavy?.35:1, dist=(kn.dist??220)*wt, up=(kn.up||0)*wt; let ux, uy;
  if(kn.dir!=null){ ux=Math.cos(kn.dir); uy=Math.sin(kn.dir)*FSY; } else { const f=kn.from||[pl.x,pl.gy], dx=o.x-f[0], dy=o.y-f[1], l=Math.hypot(dx,dy)||1; ux=dx/l; uy=dy/l; }
  const hp=Math.min(190,up*up/15000)+24, z0=o.h*.5+o.z, x0=o.x, y0=o.y, pts=[]; for(let i=0;i<=7;i++){ const u=i/7; pts.push({x:x0+ux*dist*u,y:y0+uy*dist*u,z:z0*(1-u)+hp*4*u*(1-u)}); }
  wisp(pts,{w:66,dur:.42,pal:PF,draw:.2,hold:.06,gain:.55});
  after(.3,()=>{ const lx=x0+ux*dist, ly=y0+uy*dist; K.sparks(lx,ly,20,{pal:PF,n:5,sp:[120,420],up:520,life:[.25,.55],s:3}); K.dust(lx,ly,{n:3,r:20,sp:[120,320],a:.34,s:.8}); }); }
const blow=(o,dm,kn,bt,opt,bs)=>{ if(o.dead) return; fling(o,kn); K.knock(o,kn); burn(o,bt,1,bs); after(.3,()=>{ if(!o.dead) dmg(o,dm,{kb:0,...opt}); }); };
// LINGER: what a blast leaves burning: a few low fires at fixed spots round (x,y) that go out one after another, each into a thread of smoke
function linger(x,y,n,r,sd,o={}){ for(let i=0;i<n;i++){ const b=h01(sd+i*3.3)*TAU+i*TAU/n, dd=r*(.35+.65*h01(sd+i*5.9)), fx=x+Math.cos(b)*dd, fy=y+Math.sin(b)*dd*FSY, du=(o.dur||.8)+i*(o.step??.22), hh=(o.h||200)*(.7+.6*h01(sd+i*1.7));
    K.vcolumn(fx,fy,{r:(o.r0||36)*(.8+.5*h01(sd+i*7.1)),h:hh,dur:du,rise:.14,out:.45,pal:PF,taper:.62,turb:.9,heat:1.15,delay:(o.delay||0)+i*.03});
    after((o.delay||0)+du-.1,()=>{ K.sparks(fx,fy,hh*.4,{pal:PF,n:3,sp:[20,90],up:380,life:[.4,.8],s:2.6}); if(i%2===0) K.vsmoke(fx,fy,{s:60,z:hh*.5,dur:.7,a:.26,rise:200}); }); } }
// fire catching on a body: a gold flash on it and sparks thrown the way the blow went (no white star, no long streak)
const sear=(o,dir,pw=1)=>{ const z=o.h*.5+o.z; K.flare(o.x,o.y,z,{pal:PG,s:95*pw,dur:.12,gain:2.4}); K.sparks(o.x,o.y,z,{pal:PG,n:Math.round(6*pw),dir,spread:.5,sp:[500,1500],up:320,life:[.15,.4],s:3}); };

const SKILL={
  // FLAME DASH (one line of fire): he crosses as a white-gold streak and the whole line behind him is one stream of fire, thin where he left and thick
  // where he arrived, air torn backward along it; whatever stood on the line is thrown off it sideways and up, burning. Then only the cut is left, cooling.
  py_dash:{moves:true,fn(id){ const e=nearest(560)||(ordered(id)&&nearest(1200)); if(!e) return false; const a=angTo(e), Ld=Math.min(640,Math.hypot(e.x-pl.x,e.y-pl.gy)+140), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, T=EVO(id)?4:2, ca=Math.cos(a), sa=Math.sin(a), jd=fdir(ca,sa), zb=BODY*.42; face(a); push();
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.2+k*.16,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.12}; G.inv=Math.max(G.inv,.35); sfx('fire',.8,.6);
    K.vjet(x0+ca*20,y0+sa*20,zb,jd,{len:Ld*Math.hypot(ca,sa/FSY)-30,r:125,r0:30,dur:.52,in:.11,out:.3,pal:PF,turb:.8,speed:12,heat:1.5});
    const tp=[]; for(let i=0;i<=8;i++){ const u=i/8; tp.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z:zb}); }
    K.trail(tp,{w:95,dur:.5,pal:PG,draw:.1,hold:.2,gain:1.5}); K.trail(tp,{w:30,dur:.62,pal:PW,draw:.09,hold:.3,gain:2});
    K.coolLine(x0+ca*40,y0+sa*40,x1,y1,{w:80,pal:PF,life:T+.5,hot:.85,grow:.12});
    GFX.light((x0+x1)/2,(y0+y1)/2,Math.max(560,Ld*1.2),PF.l,1,.45,{hold:.4,z:120,flick:.15});
    K.dust(x0,y0,{n:8,dir:jd+PI,spread:.6,sp:[260,720],a:.38});
    // the arrival is the blow: the stream he rode bursts forward off him in a fan of three tongues over a lumpy ball of fire, stone is thrown ahead,
    // and whatever stood where he stops is blown on down the line
    after(.1,()=>{ const ix=x1+ca*70, iy=y1+sa*70; K.flare(ix,iy,zb,{pal:PW,s:210,dur:.1,gain:2.3});
      K.vblast(ix+ca*40,iy+sa*40,{s:190,pal:PF,smoke:.6,dur:.7,rise:170,heat:1.1,fire:.32,lump:.72,gain:.85});
      [-.5,0,.5].forEach((o,i)=>K.vjet(ix,iy,zb,fdir(Math.cos(a+o),Math.sin(a+o)),{len:i===1?390:300,r:i===1?120:96,r0:36,dur:.4,in:.05,out:.24,pal:i===1?PG:PF,heat:1.6,turb:.95,speed:14}));
      K.shock(ix,iy,{r:330,dur:.34,pal:PG,dust:0,light:0,painted:0}); K.chunks(ix,iy,{n:4,r:50,sp:[300,760],up:1300,s:[20,36]});
      K.sparks(ix,iy,zb,{pal:PG,n:22,dir:jd,spread:.6,sp:[800,2300],up:420,life:[.18,.5]}); K.dust(ix,iy,{n:8,dir:jd,spread:.7,sp:[300,900],a:.4});
      GFX.light(ix,iy,700,PF.l,.75,.3,{z:140}); K.cool(ix+ca*60,iy+sa*60,{kind:'crater',r:170,pal:PF,life:2.2,light:0}); linger(ix+ca*90,iy+sa*90,2,110,a*5+2,{dur:.8,delay:.36,h:200});
      inCircle(ix+ca*70,iy+sa*70,210,o=>{ blow(o,d*.4,{dir:jd+(h01(o.x)-.5)*.8,dist:340,up:1200},T,{sx:x1,sy:y1}); sear(o,jd,1.2); });
      hitstop=Math.max(hitstop,.07); trauma=Math.min(1,trauma+.4); sfx('boom',1,.7); });
    after(.5,()=>{ for(let i=0;i<4;i++){ const u=.15+i*.24; embers(mix(x0,x1,u),mix(y0,y1,u),30,3,40); } });
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,70,o=>{ dmg(o,d*.35,{kb:.2}); burn(o,.9); })});
    after(.06,()=>{ let hn=0; inLine(x0,y0,x1,y1,95,o=>{ const sd=((o.x-x0)*-sa+(o.y-y0)*ca)>=0?1:-1, nd=fdir(-sa*sd,ca*sd); blow(o,d,{dir:nd,dist:330,up:1000},T,{sx:x0,sy:y0}); if(hn++<5) sear(o,nd,1.2); }); }); }},
  // FIRE PILLAR (a vertical column): a gold ring closes on the floor under each of three, following it - then a column stands up through it: a crimson
  // whirl winding round its foot, the orange body, a white-gold thread up its heart. Each column has its own girth, height and twist. The body is
  // thrown out of it and up.
  py_pillar:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?5:3, d=D(id); push(); sfx('fire',.9,.6);
    const VP=[[120,960,2.6],[92,1180,-3.6],[146,800,1.7],[104,1080,-2.4],[130,900,3.2]];
    T.sort((p,q)=>dist2(p,pl.x,pl.gy)-dist2(q,pl.x,pl.gy)).slice(0,n).forEach((e,i)=>after(i*.1,()=>{ const P=[e.x,e.y], tr=()=>{ if(!e.dead){ P[0]=e.x; P[1]=e.y; } return P; }, [r,h,tw]=VP[i%5];
      hotspot(tr,.2,170); const Lt=GFX.light(P[0],P[1],380,PG.l,.7,.1,{hold:.19,z:20});
      after(.19,()=>{ const [x,y]=tr(); Lt.hold=0;
        // a PILLAR, not a fire: a straight narrow shaft with almost no taper - an orange skin, a broad gold body and a white shaft up its middle that is
        // a third of its width - on a foot that bursts outward over the floor (a ring of fire, stone thrown up, a cracked plate left glowing)
        const hc=h*1.2, DP=.62; K.vcolumn(x,y,{r:r*.78,h:hc,dur:DP,rise:.08,out:.24,pal:PF,twist:tw*.35,turb:.34,taper:.2,heat:1.3}); K.vcolumn(x,y,{r:r*.44,h:hc*.97,dur:DP-.08,rise:.06,out:.2,pal:PG,twist:tw*.2,turb:.16,taper:.1,heat:2,gain:1.3});
        if(F.on){ const km=K.mats(), sd=i*2.3; GFX.add(DP-.06,(k,t)=>{ const up=eo3(sat(t/.07)), f=sat((t-(DP-.3))/.24), hh=hc*.8*up/2, a=1-f*f; F.bill(km.piB,x,y+3,hh,r*.4*(1-.4*f),hh,0,{...col(PG),a:a*.7,gain:1.7,t0:sd}); F.bill(km.piC,x,y+4,hh*.92,r*.17*(1-.5*f),hh*.92,0,{...col(PW),a:a*.9,gain:3.2,t0:sd}); F.quad(km.glowG,x,y,r*2.2,r*2.2,0,{...col(PG),a:a*.7,gain:1.5}); }); }
        K.shock(x,y,{r:300,dur:.34,pal:PG,dust:0,light:0,painted:0}); K.vring(x,y,{r:300,r0:70,dur:.36,heat:1.8,pal:PF,tube:.11,smoke:.2}); K.chunks(x,y,{n:4,r:70,sp:[260,640],up:1500,s:[20,38]}); K.debris(x,y,{n:6,r:60,sp:[300,800],up:1500,size0:7,size:16});
        GFX.light(x,y,640,PF.l,.8,.25,{hold:.4,z:300,flick:.15}); K.sparks(x,y,30,{pal:PG,n:14,sp:[80,360],up:2600,life:[.3,.7]});
        K.cool(x,y,{kind:'crack',r:210,pal:PF,life:2.2,light:0}); K.vsmoke(x,y,{s:120,z:h*.6,dur:.9,delay:.45,a:.34,rise:300}); linger(x,y,1,40,i*2.1,{dur:.7,delay:.5,h:200,r0:40}); after(.55,()=>embers(x,y,40,6,70));
        trauma=Math.min(1,trauma+.15); hitstop=Math.max(hitstop,.04); sfx('fire',.5,.5);
        const ob=fdir(x-pl.x||1,y-pl.gy);
        inCircle(x,y,160,o=>{ const far=Math.hypot(o.x-x,o.y-y)>30; blow(o,d,far?{from:[x,y],dist:260,up:1700}:{dir:ob+(i%2?.9:-.9),dist:260,up:1700},1.6,{stun:.7,sx:x,sy:y}); }); }); })); }},
  // FLAME RING (one ring rolling over the floor): a torus of fire leaves him in every direction behind a white-gold front; each body it rolls over is
  // struck outward off its feet and set alight
  py_ring:{fn(id){ if(countIn(480)<4&&!nearest(250)&&!ordered(id)) return false; const d=D(id), R0=100, R1=880, DUR=.7, VIS=.86; raise();
    // a shock FRONT, not a tube: a thin white-gold edge runs ahead of the fire; the fire behind it is thick and hot at first and thins as it goes, breaking
    // into lumps; a crimson wake fades behind. Nine flames of different heights ride the ring out, and when the ring is spent they are what is left of it:
    // a circle of separate fires that go out one after another.
    const wave=k=>{ const x=pl.x, y=pl.gy, hit=new Set(), VQ=window.VOL, P=k?PG:PF, VC=K.vc(P), N=9, Rr=q=>R1*mix(R0/R1,1,eo3(sat(q)))*.78; let hn=0;
      const RD=[]; for(let i=0;i<N;i++){ const b=i/N*TAU+h01(i*3.7+k)*.5; RD.push({b,h:K.vcolumn(x,y,{r:34+22*h01(i*5.1),h:190+170*h01(i*2.3+k),dur:DUR+.2+((i*4)%N)*.1,rise:.16,out:.34,pal:PF,taper:.6,turb:.9,heat:1.2})}); }
      GFX.add(DUR+1.2,(qq,t)=>{ const q=t/DUR, r=Rr(q), a=sat(q*12); for(const o of RD){ o.h.x=x+Math.cos(o.b)*r; o.h.y=y+Math.sin(o.b)*r*FSY; } if(q>=1) return;
        const tube=.15*(1-.5*q);
        if(VQ&&K.vok&&K.vok()) VQ.add('ring',x,y,R1*tube*.9,{ex:R1,ey:R1,ez:R1*tube*1.6,pa:[r/R1,tube,2.4,t*.8],pb:[2.1*(1-q*.55),.62,.5+.42*q,0],dens:9*a*(1-sat((q-.8)/.2)),seed:k?5.3:2.1,smoke:.15,fire:.7,cS:'#2a2420',cK:'#8a7868',...VC,amb:.2,key:1.2,rim:.3,steps:20,ord:-1e9});
        if(F.on){ const km=K.mats(), fr=r+R1*tube*.55, w=40*(1-.5*q), fa=a*(1-q*q*q); F.ring(km.shL,x,y,fr,fr+w,{...col(PW),a:fa,gain:2.6}); F.ring(km.shL,x,y,fr+w*.8,fr+w*2.4,{...col(PG),a:fa*.5,gain:1.3});
          F.ring(um1().wv,x,y,r*.5,r*.96,{cA:PD.d,cB:PD.b,cM:PF.b,cC:PF.m,a:.55*(1-q)*a,gain:1.2,t0:t*.6}); } });
      after(DUR+.25,()=>RD.forEach((o,i)=>{ if(i%3===0) K.vsmoke(o.h.x,o.h.y,{s:70,z:120,dur:.8,a:.26,rise:220,delay:((i*4)%N)*.1}); }));
      K.flare(x,y,BODY*.5,{pal:PG,s:150,dur:.1,gain:2}); K.sparks(x,y,40,{pal:PF,n:18,sp:[700,1500],up:240,life:[.2,.45]}); GFX.light(x,y,1100,PF.l,1,.5,{z:140}); sfx('fire',1,.8);
      K.cool(x,y,{kind:'ring',r:R1*.8,pal:PF,life:1.5,start:.4,hot:.9,grow:.3,light:0,shed:0,delay:.34});
      trauma=Math.min(1,trauma+.3); hitstop=Math.max(hitstop,.04);
      [.04,.1,.17,.25,.35,.46,.56,.66].forEach(t=>after(t,()=>{ const r=mix(R0,R1,eo3(sat(t/DUR)))*VIS; inCircle(x,y,r,o=>{ if(hit.has(o)) return; hit.add(o); blow(o,d*(k?.6:1),{from:[x,y],dist:320,up:900},1.4,{sx:x,sy:y}); if(hn++<6) sear(o,fdir(o.x-x,o.y-y)); }); })); };
    wave(0); if(EVO(id)) after(.55,()=>wave(1)); }},
  // EXPLOSION (a ball): a gold ring closes on the floor round the one in the thick of them while a ball of plasma is pressed small over its head - then
  // three things you can tell apart: a white-gold heart, one lumpy fireball, a thin ring of fire racing out along the floor. Bodies are blown out of
  // it and up; a small black head of smoke rises off the crater.
  py_boom:{fn(id){ const t=densest(800)||(ordered(id)&&nearest(1300)); if(!t) return false; const d=D(id), P=[t.x,t.y], zt=t.h+130, RB=330, tr=()=>{ if(!t.dead){ P[0]=t.x; P[1]=t.y; } return P; }; face(angTo(t)); push(); sfx('fireball',1.2);
    // the seed leaves his hand: a small white-gold bead lobbed in an arc onto the target, its path left in the air as a ribbon of fire
    const a0=angTo(t), hx=pl.x+Math.cos(a0)*70, hy=pl.gy+Math.sin(a0)*70, hz=BODY*.6, zc=t.h*.6+30, TF=.2, TC=.35, AH=230, arc=[];
    for(let i=0;i<=9;i++){ const u=i/9; arc.push({x:mix(hx,P[0],u),y:mix(hy,P[1],u),z:mix(hz,zc,u)+AH*4*u*(1-u)}); }
    K.flare(hx,hy,hz,{pal:PG,s:120,dur:.1,gain:2.2}); K.trail(arc,{w:46,dur:.4,pal:PF,draw:TF,hold:.12,gain:1.3}); K.trail(arc,{w:16,dur:.44,pal:PW,draw:TF,hold:.16,gain:1.9});
    const Lt=GFX.light(hx,hy,420,PG.l,.5,.1,{hold:TC-.02,z:zt}), orb=K.vorb(hx,hy,hz,{r:40,pal:PG,dur:TC+.02,in:.04,out:.02,spin:10,core:.4,heat:1.2,gain:1.05});
    if(F.on){ const km=K.mats(); let pt=0; GFX.add(TC,(k,tt)=>{ const [x,y]=tr(), u=sat(tt/TF), sw=sat((tt-TF)/(TC-TF)), px=mix(hx,x,u), py=mix(hy,y,u), pz=mix(hz,zc,u)+AH*4*u*(1-u), gs=34+70*sw*sw;
        orb.x=px; orb.y=py; orb.z=pz; orb.r=40+62*sw*sw; Lt.x=px; Lt.y=py; Lt.a=.5+.6*sw; Lt.r=420+500*sw; F.bill(km.glowO,px,py,pz,gs,gs,0,{...col(PG),a:1,gain:3});
        if(u<1&&tt-pt>.02){ pt=tt; streak(px,py,pz,rand(-120,120),rand(-80,80),rand(-200,60),rand(.18,.34)); } }); }
    // it lands on the body and swells there while the floor under the pack draws to a hot point
    after(TF,()=>{ const [x,y]=tr(); hotspot(tr,TC-TF,RB*.8); gather(()=>[P[0],P[1],zc],14,TC-TF-.03,200,380); K.flare(x,y,zc,{pal:PG,s:90,dur:.08,gain:2}); });
    after(TC,()=>{ const [x,y]=tr(); Lt.hold=0; orb.dead=true;
      // black lumps of smoke first, then one lumpy fireball that cools into smoke itself, a white-gold heart, tongues of fire thrown out over the floor
      K.vsmoke(x-70,y-30,{s:230,z:70,dur:1.25,a:.7,rise:520,c:'#0c0706',c2:'#4a2c22',delay:.1}); K.vsmoke(x+90,y-10,{s:190,z:40,dur:1.1,a:.6,rise:380,c:'#0c0706',c2:'#4a2c22',delay:.2});
      K.vblast(x,y,{s:300,pal:PF,smoke:.85,dur:1,rise:320,heat:1.1,fire:.4,lump:.72,gain:.8}); K.vblast(x,y,{s:140,z:130,pal:PG,smoke:0,dur:.28,fire:.2,lump:.4,gain:1});
      K.vring(x,y,{r:RB*1.75,r0:110,dur:.42,heat:2,pal:PG,tube:.075,smoke:.2}); K.flare(x,y,170,{pal:PG,s:150,dur:.08,gain:2});
      for(let i=0;i<4;i++){ const b=.4+i/4*TAU+(h01(i*4.1)-.5)*.7, l0=150, l1=RB*(1+.6*h01(i*2.3)), cb=Math.cos(b), sb=Math.sin(b)*FSY; K.coolLine(x+cb*l0,y+sb*l0,x+cb*l1,y+sb*l1,{w:40,pal:PF,life:2.2,grow:.14,hot:.8,shed:0}); }
      GFX.light(x,y,1400,PF.l,1.1,.45,{z:300}); K.sparks(x,y,120,{pal:PF,n:24,sp:[600,2100],up:1300,life:[.3,.8]}); K.debris(x,y,{n:8,r:110,sp:[400,1300],up:1900,size0:9,size:24}); K.chunks(x,y,{n:6,r:90,sp:[300,820],up:1500,s:[24,46]});
      K.cool(x,y,{kind:'crater',r:250,pal:PF,life:2.6,light:0}); linger(x,y,5,RB*.85,x*.01+3,{dur:.9,step:.22,delay:.34,h:230}); after(.6,()=>embers(x,y,40,10,150));
      trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.07); sfx('boom',1.6,1);
      let hn=0; inCircle(x,y,RB,o=>{ const far=Math.hypot(o.x-x,o.y-y)>24; blow(o,d,far?{from:[x,y],dist:460,up:1700}:{dir:fdir(x-pl.x||1,y-pl.gy),dist:460,up:1900},1.4,{big:true,sx:x,sy:y}); if(hn++<4) sear(o,fdir(o.x-x||1,o.y-y),1.3); });
      if(EVO(id)) for(let i=0;i<5;i++) after(.15+i*.1,()=>{ const b=.6+i/5*TAU, bx=x+Math.cos(b)*290, by=y+Math.sin(b)*290*.75; K.vblast(bx,by,{s:140,pal:PF,smoke:0,dur:.5,rise:160,lump:.6}); K.flare(bx,by,50,{pal:PG,s:100,dur:.1,gain:2}); GFX.light(bx,by,500,PF.l,.6,.25,{z:80});
          inCircle(bx,by,160,o=>{ dmg(o,d*.4,{kb:0,push:200,up:800,sx:bx,sy:by}); burn(o,1); }); }); }); }},
  // FIRE RAIN (slanting streaks): he throws a spark up and streaks of fire come down out of the sky one on another, all on the same slant, each aimed at
  // an enemy of its own under a closing gold ring. They do not burst round: each one ploughs on along its slant - a skid of fire over the floor that
  // carries the body with it.
  py_rain:{fn(id){ const T=onScreen(-40); if(!T.length) return false; const n=EVO(id)?12:8, d=D(id), H0=1500, VX=-560, FALL=.4, PT=Math.atan2(H0,-VX), zh=BODY*1.25; raise(); sfx('fireball',1);
    K.flare(pl.x,pl.gy,zh,{pal:PG,s:150,dur:.14,gain:2.3}); GFX.light(pl.x,pl.gy,520,PG.l,.8,.3,{z:zh}); K.trail([0,.25,.5,.75,1].map(u=>({x:pl.x+u*130,y:pl.gy,z:zh+u*1300})),{w:26,dur:.3,pal:PG,draw:.1,hold:.08,gain:1.6}); K.sparks(pl.x,pl.gy,zh,{pal:PG,n:10,sp:[60,260],up:2400,life:[.2,.45]});
    T.sort((p,q)=>dist2(p,pl.x,pl.gy)-dist2(q,pl.x,pl.gy));
    // no two alike: each streak has its own weight, its own slant and its own time of fall; the heavy ones come down steeper and slower
    for(let i=0;i<n;i++) after(.03+i*.07,()=>{ let e=T[i%T.length]; if(e.dead) e=T.find(q=>!q.dead)||null; const rep=Math.floor(i/T.length), ox=rep?(h01(i*3.1)-.5)*260:0, oy=rep?(h01(i*5.7)-.5)*160:0, P=[e?e.x+ox:pl.x+(h01(i*1.7)-.5)*900,e?e.y+oy:pl.gy+(h01(i*2.9)-.5)*520], tr=()=>{ if(e&&!e.dead){ P[0]=e.x+ox; P[1]=e.y+oy; } return P; };
      const f=.68+.74*h01(i*3.3+.7), vx=VX*(1.7-1.1*h01(i*3.3+.7)), fall=FALL*(.82+.3*f), pt=Math.atan2(H0,Math.abs(vx)), jd=vx<0?PI:0;
      hotspot(tr,fall,120*f);
      const Lt=GFX.light(P[0],P[1],320,PF.l,.4,.1,{hold:fall,z:60}), jet=K.vjet(P[0]+vx,P[1],H0,jd,{len:560*f+160,r:105*f,r0:44*f,pitch:pt,dur:fall+.02,in:.07,out:.02,pal:PF,heat:1.45,turb:.6,speed:9}), orb=K.vorb(P[0]+vx,P[1],H0,{r:54*f,pal:PG,dur:fall+.02,in:.05,out:.02,spin:6,core:.26,heat:.9,gain:.9});
      if(F.on){ const km=K.mats(); GFX.add(fall,k=>{ const [x,y]=tr(), px=x+vx*(1-k), z=H0*(1-k)+60; jet.x=orb.x=px; jet.y=orb.y=y; jet.z=orb.z=z; Lt.x=x; Lt.y=y; Lt.a=.4+.6*k; Lt.r=320+260*k; F.bill(km.glowO,px,y,z,74*f,74*f,0,{...col(PG),a:1,gain:3}); }); }
      // the landing is a blow straight down: a lumpy ball of fire thrown up off the floor, a ring snapped out round it, the stone under it cracked
      // and left glowing, the body thrown clear
      after(fall,()=>{ const [x,y]=tr(), sd=vx<0?1:-1; jet.dead=orb.dead=true; Lt.hold=0;
        K.vblast(x,y,{s:165*f,pal:PF,smoke:.4,dur:.7,rise:230*f,heat:1.15,fire:.3,lump:.72,gain:.85}); if(f>1) K.vblast(x,y,{s:80*f,z:70,pal:PG,smoke:0,dur:.24,fire:.16,lump:.4});
        K.shock(x,y,{r:290*f,dur:.32,pal:PG,dust:0,light:0,painted:0}); K.flare(x,y,60,{pal:PW,s:130*f,dur:.09,gain:2.2}); GFX.light(x,y,700*f,PF.l,.9,.28,{z:120});
        K.sparks(x,y,40,{pal:PG,n:Math.round(10*f),sp:[400,1500],up:1100,life:[.2,.55]}); K.debris(x,y,{n:Math.round(5*f),r:50,sp:[260,800],up:1400,size0:7,size:18}); if(f>1.05) K.chunks(x,y,{n:3,r:50,sp:[240,600],up:1300,s:[18,34]});
        K.cool(x,y,{kind:'crack',r:175*f,pal:PF,life:2,light:0,shed:i%2?0:undefined}); if(f>.95) linger(x+sd*40,y,1,50,i*1.9,{dur:.7,delay:.4,h:190}); else after(.4,()=>embers(x,y,30,4,60));
        trauma=Math.min(1,trauma+.12+.1*f); if(f>1.1) hitstop=Math.max(hitstop,.03); sfx('boom',.9,.5);
        let hn=0; inCircle(x,y,190,o=>{ const far=Math.hypot(o.x-x,o.y-y)>26; blow(o,d,far?{from:[x,y],dist:300,up:1300}:{dir:sd>0?-.3:PI+.3,dist:300,up:1500},1.2,{sx:x-sd*200,sy:y}); if(hn++<1) sear(o,sd>0?0:PI,1.1); }); }); }); }},
  // FLAME THROWER (a cone): two seconds of one cone of fire from his hand. It grows once to its length and keeps it; it turns after its target at a
  // limited rate (never jumps); its mouth stays at one height; when it stops it is cut off at the mouth and the rest runs out to the far end.
  // What stands in it catches fire and is driven back step by step.
  py_breath:{fn(id){ const R=EVO(id)?800:680, e=nearest(R-80)||(ordered(id)&&nearest(1300)); if(!e) return false; const flat=b=>{ const c=Math.cos(b)>=0?0:Math.PI, d=Math.atan2(Math.sin(b-c),Math.cos(b-c)); return c+clamp(d,-.6,.6); }; let a=flat(angTo(e)); const d=D(id), half=EVO(id)?.55:.42, DUR=2, z0=BODY*.55; face(a);
    S([['gb03',.05],['gb05',.05],['gb06',2,{kick:[1.2,-1]}],['gb10',.08],['gb12',.06]]); sfx('fire',2,.8);
    if(F.on){ const km=K.mats(), C=col(PF), CG=col(PG), rad=R*Math.tan(half)*.9, jd0=fdir(Math.cos(a),Math.sin(a)), Lt=GFX.light(pl.x,pl.gy,R*1.3,PF.l,.95,.3,{hold:DUR,z:90,flick:.2}); let va=a, lt=0, pt=0;
      // one cone in three parts that read apart: a white-gold throat at the hand, an orange body that thins toward the end, and three crimson tongues
      // the body splits into at the far end, each with its own length and sway. Lumps of fire run down the cone from the hand so the flow has a direction.
      const VQ=window.VOL, VC=K.vc(PF), jet=K.vjet(pl.x,pl.gy,z0,jd0,{len:R*.92,r:rad*.62,r0:30,dur:DUR+.3,in:.1,out:.3,pal:PF,turb:.9,speed:11,heat:1.3}),
        core=K.vjet(pl.x,pl.gy,z0,jd0,{len:R*.42,r:rad*.17,r0:15,dur:DUR+.14,in:.06,out:.14,pal:PW,turb:.3,speed:16,heat:2,gain:1.25}),
        TG=[[-.7,.6,5.1,PD],[.06,.8,3.7,PF],[.68,.52,6.3,PD]].map(([off,ln,f,P],i)=>({off,ln,f,h:K.vjet(pl.x,pl.gy,z0,jd0,{len:R*ln,r:rad*.3,r0:rad*.2,dur:DUR+.3,in:.2+i*.06,out:.3,pal:P,turb:1,speed:9,heat:1.25})}));
      K.flare(pl.x+Math.cos(a)*56,pl.gy+Math.sin(a)*56,z0,{pal:PW,s:190,dur:.14,gain:2.4}); K.sparks(pl.x+Math.cos(a)*50,pl.gy+Math.sin(a)*50,z0,{pal:PG,n:16,dir:jd0,spread:half,sp:[900,2400],up:200,life:[.15,.4],s:3}); K.dust(pl.x,pl.gy,{n:6,dir:jd0+PI,spread:.7,sp:[200,520],a:.36});
      GFX.add(DUR+.3,(k,t)=>{ const dt=Math.min(.05,t-lt); lt=t; va+=clamp(Math.atan2(Math.sin(a-va),Math.cos(a-va)),-3.4*dt,3.4*dt);
        const on=sat(t/.08), out=sat((DUR+.3-t)/.3), live=t<DUR?1:0, cv=Math.cos(va), sv=Math.sin(va), ox=pl.x+cv*48, oy=pl.gy+sv*48, mx=pl.x+cv*R*.5, my=pl.gy+sv*R*.5, jd=fdir(cv,sv);
        jet.x=core.x=ox; jet.y=core.y=oy; jet.dir=core.dir=jd; Lt.x=mx; Lt.y=my;
        for(const g of TG){ const b=va+g.off*half*.85+Math.sin(t*g.f+g.off*3)*.1, sx=-sv*g.off*rad*.26, sy=cv*g.off*rad*.26; g.h.x=pl.x+cv*R*.46+sx; g.h.y=pl.gy+sv*R*.46+sy; g.h.dir=fdir(Math.cos(b),Math.sin(b)); }
        if(VQ&&K.vok&&K.vok()) for(let i=0;i<3;i++){ const u=(t*1.55+i/3)%1, fd=sat(u*6)*sat((1-u)*3.5)*on*live, s=46+rad*.5*u, sw=Math.sin(t*4+i*2.1)*rad*.22*u; if(fd<=.01) continue;
          VQ.add('blast',pl.x+cv*(60+R*.8*u)-sv*sw,pl.gy+sv*(60+R*.8*u)+cv*sw,z0+10+30*u,{ex:s*1.25,ey:s*1.25,ez:s*1.1,pa:[.62,.62,2.3,.25],pb:[1.9*(1-u*.55),.85,1,.5],dens:12*fd,gain:1.7,seed:3+i*2.1,smoke:0,fire:.72,...VC,amb:.2,key:1.25,rim:.32,glow:.5}); }
        F.quad(km.glowG,mx,my,R*.62,R*.5,0,{...C,a:.3*out*on,gain:1}); if(live){ F.bill(km.glowO,ox,oy,z0,70,70,0,{...col(PW),a:on,gain:3}); F.bill(km.glowO,ox+cv*70,oy+sv*70,z0,110,60,0,{...CG,a:on*.8,gain:2.2}); }
        if(live&&t-pt>.03){ pt=t; const b=va+rand(-half,half)*.8, sp=rand(1100,1900); streak(ox,oy,z0+rand(-10,10),Math.cos(b)*sp,Math.sin(b)*sp,rand(-40,160),rand(.25,.45),{drag:1.4}); } });
      // the end: cut off at the hand; what it leaves is the fan it burned into the floor, low fires at its far edge going out one by one, and whoever
      // still stands in it is blown out of it
      after(DUR,()=>{ const cv=Math.cos(a), sv=Math.sin(a), ex=pl.x+cv*R*.78, ey=pl.gy+sv*R*.78; K.vsmoke(ex,ey,{s:170,z:60,dur:1.1,a:.4,rise:260}); K.vsmoke(pl.x+cv*R*.4,pl.gy+sv*R*.4,{s:110,z:40,dur:.9,a:.3,rise:200,delay:.15});
        [-.7,0,.7].forEach((o,i)=>{ const b=a+o*half; K.coolLine(pl.x+Math.cos(b)*R*.28,pl.gy+Math.sin(b)*R*.28,pl.x+Math.cos(b)*R*(.9-.12*Math.abs(o)),pl.gy+Math.sin(b)*R*(.9-.12*Math.abs(o)),{w:46,pal:PF,life:1.8,grow:.08,hot:.75,start:.15,shed:i?0:undefined}); });
        linger(ex,ey,4,R*.26,a*3+1,{dur:.6,step:.22,h:210});
        inSector(pl.x,pl.gy,a,R,half,o=>{ if(o.dead) return; const kn={from:[pl.x,pl.gy],dist:260,up:700}; fling(o,kn); K.knock(o,kn); sear(o,fdir(o.x-pl.x,o.y-pl.gy),1.1); }); }); }
    V.zones.push({follow:true,r:0,life:DUR,tick:.1,onTick:()=>{ const t=nearest(R+60); if(t){ const b=flat(angTo(t)); a+=clamp(Math.atan2(Math.sin(b-a),Math.cos(b-a)),-.3,.3); face(a); }
      inSector(pl.x,pl.gy,a,R,half,o=>{ dmg(o,d,{kb:0}); if(o.dead) return; burn(o,1.4,2); if(RT-(o.pyB||-9)>.45){ o.pyB=RT; K.knock(o,{dist:190,up:520}); sear(o,fdir(o.x-pl.x,o.y-pl.gy),1); } }); }}); }},
  // FIRE TORNADO (a small funnel): hollow whirls stand up where they are thickest (never on top of him), keep the size they were born with, and go
  // through three heats - crimson, orange, gold - before they go out from the foot upward. Bright ribbons wind up them, a skirt of fire and dust turns
  // on the floor under them; what they catch is dragged in, lifted off its feet and burns.
  py_tornado:{fn(id){ if(V.zones.some(z=>z.pyt)||(countIn(800)<3&&!ordered(id))) return false; const n=EVO(id)?3:2, d=D(id), LIFE=4; raise(); sfx('fire',1.6,.7);
    const VR=[{r:190,r0:34,h:680,spin:8,sway:.1,th:.17,sd:3.1},{r:165,r0:30,h:600,spin:9.5,sway:.13,th:.16,sd:7.7},{r:150,r0:28,h:540,spin:11,sway:.12,th:.16,sd:5.3}];
    const keep=(x,y)=>{ const hx=x-pl.x, hy=y-pl.gy, hl=Math.hypot(hx,hy)||1, l=clamp(hl,420,600); return [pl.x+hx/hl*l,pl.gy+hy/hl*l]; };
    const near=[]; inCircle(pl.x,pl.gy,800,o=>near.push(o)); const c0=densest(800)||near[0]||nearest(1600)||{x:pl.x+400,y:pl.gy}, st=[keep(c0.x,c0.y)];
    while(st.length<n){ let best=null, bd=-1; for(const o of near){ const p=keep(o.x,o.y), md=Math.min(...st.map(s=>Math.hypot(p[0]-s[0],p[1]-s[1]))); if(md>bd){ bd=md; best=p; } }
      if(bd<300){ const b=Math.atan2(st[0][1]-pl.gy,st[0][0]-pl.x)+st.length*TAU/n; best=[pl.x+Math.cos(b)*480,pl.gy+Math.sin(b)*400]; } st.push(best); }
    for(let k=0;k<n;k++){ const v=VR[k], z={pyt:true,x:st[k][0],y:st[k][1],r:190,life:LIFE,tick:.2}; z.px=z.x; z.py=z.y;
      const w=twister(z.x,z.y,v,LIFE), Lt=GFX.light(z.x,z.y,640,PD.l,.85,.3,{hold:LIFE-.3,z:150,flick:.15}); let pt=0;
      K.flare(z.x,z.y,30,{pal:PG,s:110,dur:.12,gain:2}); K.dust(z.x,z.y,{n:6,r:40,sp:[200,500],a:.35});
      GFX.add(LIFE,(kk,t)=>{ const u=sat((z.acc||0)/z.tick), wx=mix(z.px,z.x,u), wy=mix(z.py,z.y,u); w.x=wx; w.y=wy; Lt.x=wx; Lt.y=wy;
        if(t<LIFE-.5&&t-pt>.045/(GFX.QK||1)){ pt=t; const b=rand(0,TAU), rr=rand(170,300); GFX.pt({x:wx+Math.cos(b)*rr,y:wy+Math.sin(b)*rr*FSY,z:rand(4,60),tx:wx,ty:wy,tz:v.h*.7,pull:rand(1.6,2.6),vx:-Math.sin(b)*rand(500,800),vy:Math.cos(b)*rand(300,480),life:rand(.45,.8),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(w.c>1.2?PG.h:PF.s),c2:w.c>.6?PF.b:PD.b,L:3}); } });
      // what it catches is dragged in along a curl of fire drawn from the body to the foot of the whirl, lifted off its feet and carried round
      z.fn=o=>{ dmg(o,d,{kb:0,stun:.2,sx:z.x,sy:z.y}); if(o.dead) return; o.pull={x:z.x,y:z.y,s:640}; burn(o,1.2,3,.6);
        if(RT-(o.pyT||-9)>.55){ o.pyT=RT; const dx=o.x-z.x, dy=o.y-z.y, dl=Math.hypot(dx,dy)||1, tp=[]; K.knock(o,{dir:fdir(-dy-dx*.8,dx-dy*.8),dist:170,up:1500}); sear(o,fdir(-dx,-dy),.9);
          for(let i=0;i<=7;i++){ const u=i/7, b=Math.atan2(dy,dx)+u*1.5, rr=dl*(1-u*.85); tp.push({x:z.x+Math.cos(b)*rr,y:z.y+Math.sin(b)*rr,z:o.h*.4+u*u*v.h*.3}); }
          wisp(tp,{w:50,dur:.42,pal:PD,draw:.16,hold:.1}); } };
      z.onTick=z=>{ z.px=z.x; z.py=z.y; let t=null, bd=1e9; for(const o of V.en){ if(o.dead) continue; const q=Math.hypot(o.x-z.x,o.y-z.y); if(q<bd){ bd=q; t=o; } }
        if(t&&bd>30){ const b=Math.atan2(t.y-z.y,t.x-z.x), s=Math.min(70,bd); z.x+=Math.cos(b)*s; z.y+=Math.sin(b)*s; } const p=keep(z.x,z.y); z.x=p[0]; z.y=p[1]; };
      z.onEnd=z=>{ w.dead=true; Lt.hold=0; K.vsmoke(z.x,z.y,{s:150,z:v.h*.6,dur:1,a:.32,rise:300}); K.sparks(z.x,z.y,v.h*.5,{pal:PG,n:12,sp:[200,800],up:1100,life:[.3,.7]}); K.cool(z.x,z.y,{kind:'scorch',r:150,pal:PF,life:1.8,start:.3,light:0}); };
      V.zones.push(z); } }},
  // SUPERNOVA (a star of rays): fire is pressed to a point over his head for .4 s - then it leaves him along the floor as seven rays (nine when evolved),
  // each with a white-gold thread in it, aimed at the nearest of them; what they pierce burns and is thrown back. The rays stay as cooling cuts.
  py_nova:{fn(id){ const R=EVO(id)?760:620; if(countIn(R)<8&&!ordered(id)) return false; const d=D(id), n=EVO(id)?9:7, zs=BODY*1.7;
    S([['gy01',.06],['gy02',.1],['gy03',.18,{kick:[-.8,.6]}],['gy07',.06,{kick:[-1.4,1]}],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.3],['gy14',.15]]); sfx('rise',.6,.7);
    // the charge is an IN-RUSH (nothing like the thrown seed of the explosion): a crimson ring of fire closes on him over the floor, tatters of fire are
    // dragged in to him along the lines the rays will leave by, and a white-gold point over his head only ever grows
    const Lt=GFX.light(pl.x,pl.gy,700,PG.l,.3,.15,{hold:.4,z:zs}), orb=K.vorb(pl.x,pl.gy,zs,{r:30,pal:PG,dur:.42,in:.05,out:.02,spin:9,core:.4,heat:1.2,gain:1});
    K.vring(pl.x,pl.gy,{r:110,r0:R*.8,dur:.42,heat:1.7,pal:PD,tube:.075,smoke:.1});
    for(let i=0;i<n;i++){ const b=.3+i/n*TAU, cb=Math.cos(b), sb=Math.sin(b)*FSY, tp=[], x=pl.x, y=pl.gy; for(let j=0;j<=6;j++){ const u=j/6, rr=mix(R*.85,90,u), bb=b+(1-u)*.5; tp.push({x:x+Math.cos(bb)*rr,y:y+Math.sin(bb)*rr*FSY,z:20+u*u*zs*.8}); }
      wisp(tp,{w:44,dur:.36,pal:i%2?PD:PF,draw:.22,hold:.02,delay:.04+h01(i*2.3)*.08}); }
    if(F.on){ const km=K.mats(); GFX.add(.4,k=>{ orb.x=Lt.x=pl.x; orb.y=Lt.y=pl.gy; orb.r=30+60*k*k; Lt.a=.3+.8*k; F.bill(km.glowO,pl.x,pl.gy,zs,26+80*k*k,26+80*k*k,0,{...col(PW),a:.4+.6*k,gain:3}); F.quad(km.glowG,pl.x,pl.gy,260-120*k,260-120*k,0,{...col(PF),a:k,gain:1.4}); }); }
    gather(()=>[pl.x,pl.gy,zs],22,.32,260,520);
    after(.4,()=>{ const x=pl.x, y=pl.gy, near=[], dirs=[], sep=TAU/n*.6, ad=(p,q)=>Math.abs(Math.atan2(Math.sin(p-q),Math.cos(p-q))); Lt.hold=0;
      inCircle(x,y,R,o=>near.push(o)); near.sort((p,q)=>dist2(p,x,y)-dist2(q,x,y));
      for(const o of near){ if(dirs.length>=n) break; const b=fdir(o.x-x,o.y-y); if(dirs.every(q=>ad(b,q.b)>sep)) dirs.push({b,e:o}); }
      if(!dirs.length) dirs.push({b:-PI/2});
      while(dirs.length<n){ const s=dirs.map(q=>q.b).sort((p,q)=>p-q); let bg=-1, bm=0; for(let i=0;i<s.length;i++){ const nx=i+1<s.length?s[i+1]:s[0]+TAU, g=nx-s[i]; if(g>bg){ bg=g; bm=s[i]+g/2; } } dirs.push({b:bm}); }
      // the heart of it: a white-gold burst over him and a ring snapped out over the floor; then the rays - no two the same length or girth: one to
      // each of the nearest (it ends ON that body and bursts there), shorter ones filling the gaps
      orb.dead=true; K.flare(x,y,zs*.7,{pal:PW,s:300,dur:.12,gain:2.2}); K.vblast(x,y-14,{s:150,z:zs*.6,pal:PG,smoke:0,dur:.3,fire:.2,lump:.62,gain:.8}); K.shock(x,y,{r:460,dur:.32,pal:PW,dust:0,light:0,painted:0});
      K.cool(x,y,{kind:'crater',r:190,pal:PF,life:2.4,light:0,shed:0}); K.chunks(x,y,{n:5,r:70,sp:[300,800],up:1300,s:[18,34]});
      let pops=0; dirs.forEach((q,i)=>{ const tg=q.e&&!q.e.dead, len=tg?clamp(dist2(q.e,x,y)+40,R*.42,R):R*(.4+.58*h01(i*5.3+1)), gw=tg?(.85+.5*h01(i*3.1)):(.55+.6*h01(i*3.1)), cb=Math.cos(q.b), sb=Math.sin(q.b)*FSY, tx=x+cb*len, ty=y+sb*len;
        K.vjet(x+cb*80,y+sb*80,70,q.b,{len:len*1.2,r:80*gw,r0:34*gw,dur:.5+.14*gw,in:.06,out:.3,pal:PF,heat:1.6,turb:.7,speed:11});
        if(tg) K.vjet(x+cb*70,y+sb*70,74,q.b,{len:len*.7,r:30*gw,r0:16,dur:.36,in:.05,out:.18,pal:PW,heat:2,turb:.3,speed:16,gain:1.2});
        K.coolLine(x+cb*130,y+sb*130,tx,ty,{w:34+22*gw,pal:PF,life:2.5,grow:.1,shed:i%2?0:undefined});
        if(tg&&pops++<5){ const e=q.e, zc=e.h*.5+e.z; K.vblast(e.x,e.y,{s:84,z:zc,pal:PF,smoke:.5,dur:.5,fire:.22,lump:.7,rise:120,delay:.08}); sear(e,q.b,1.3); K.sparks(e.x,e.y,zc,{pal:PG,n:8,dir:q.b,spread:.5,sp:[600,1700],up:400,life:[.18,.45]}); after(.5,()=>embers(tx,ty,30,4,50)); }
        else K.sparks(tx,ty,70,{pal:PF,n:5,dir:q.b,spread:.3,sp:[500,1300],up:260,life:[.15,.4]}); });
      GFX.light(x,y,R*1.5,PF.l,.8,.45,{z:200}); K.dust(x,y,{n:10,r:60,sp:[400,1000],a:.4});
      trauma=Math.min(1.3,trauma+.8); hitstop=Math.max(hitstop,.07); sfx('boom',2.2,1);
      inCircle(x,y,R,o=>{ blow(o,d,{from:[x,y],dist:380,up:950},1,{big:true,sx:x,sy:y},.5); }); }); }},
};

/// ---- ultimates. Each is one staged sequence in the real field: omen -> release -> development -> climax -> afterglow
// FIRE STORM (area: one whirl). He gathers a seed of fire over his raised hand; it goes over his head into the floor behind him and a
// thread of flame stands up there. The thread winds itself into a whirl that grows in three surges, each half again as wide and tall as
// the last and hotter (crimson -> orange -> gold); it leans and its top walks a circle, arms of fire on the floor run into its foot, and
// every enemy on screen is dragged to it, the near ones lifted to circle it. The field holds its breath; the whirl bursts: a ball and a
// pillar of fire where it stood, a wall of fire rolling out past the edges of the screen, every body thrown outward on its own burning
// arc, pieces landing as second blasts. What stays: a pool that cools from its middle outward, the scorched band of the wall, low fires.
const VOLX=window.VOL, c3=h=>typeof h==='string'?F.rgb(h):h, mc=(a,b,k)=>{ a=c3(a); b=c3(b); return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]; };
const PW={d:'#6a3200',b:'#ffc848',m:'#fff2b8',h:'#ffffff'}, STG=[PD,PF,PG,PW], PM={d:'#220200',b:'#a01004',m:'#d8480c',h:'#ff9a40',l:'#ff3410',s:'#ff9a50'};
// the whirl's colours at stage c: 0 crimson, 1 orange, 2 gold, 3 gold-white
function stormCol(c){ c=Math.max(0,Math.min(2.999,c)); const i=Math.floor(c), u=c-i, p=STG[i], q=STG[i+1]; return {cA:mc(p.d,q.d,u),cB:mc(p.b,q.b,u),cM:mc(p.m,q.m,u),cC:mc(p.h,q.h,u),cS:mc(p.d,q.d,u)}; }
const hash1=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
let UM=null;
function um1(){ if(UM) return UM; const m=F.mat; UM={
  hS:m({tex:'v3_fissure',nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  hB:m({tex:'v3_fissure',nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'}),
  gl:m({pm:[3,1.6,0,0],nk:0,ero:0,soft:.6,rk:[.6,1],gain:1.2,layer:'g'}),
  wv:m({nz:'fbm',n1:[3,.35,0,-.3],nk:.35,ero:.02,soft:.9,pm:[2,1.3,0,0],rk:[.2,1.25],gain:1,bgain:1,layer:'g'}) }; return UM; }
// ---- the pieces of the FIRE STORM. Nothing below is random per frame: every shape is a function of the storm's own clock.
const SBX=1.5, FSK={smoke:.12,fire:.5,rim:0};
// the whirl's own colours at stage c (0 crimson, 1 orange, 2 gold, 3 the instant it bursts). The ramp keeps a dark foot at every heat,
// so the hottest stage still has soot, a body colour and a white heart instead of one flat yellow.
const FSP=[{d:'#140200',b:'#b81004',m:'#ff5210',h:'#ffb858'},{d:'#190300',b:'#e02c06',m:'#ff8418',h:'#ffdc84'},{d:'#1c0400',b:'#ec4208',m:'#ffa624',h:'#fff2cc'},{d:'#240800',b:'#ff6410',m:'#ffd050',h:'#ffffff'}];
function fsCol(c){ c=Math.max(0,Math.min(2.999,c)); const i=Math.floor(c), u=c-i, p=FSP[i], q=FSP[i+1]; return {cA:mc(p.d,q.d,u),cB:mc(p.b,q.b,u),cM:mc(p.m,q.m,u),cC:mc(p.h,q.h,u),cS:mc(p.d,q.d,u)}; }
// rotations the way the volume renderer wants them (columns = world images of local x, y, z): a spin `ph` about the whirl's own axis,
// then the axis leaned by `l` toward the floor direction `d`
const fsMul=(A,B)=>{ const o=[]; for(let j=0;j<3;j++) for(let i=0;i<3;i++) o.push(A[i]*B[j*3]+A[3+i]*B[j*3+1]+A[6+i]*B[j*3+2]); return o; };
const fsRz=a=>{ const c=Math.cos(a), s=Math.sin(a); return [c,s,0,-s,c,0,0,0,1]; };
const fsRy=l=>{ const c=Math.cos(l), s=Math.sin(l); return [c,0,-s,0,1,0,s,0,c]; };
const fsRot=(ph,l,d)=>fsMul(fsMul(fsRz(d),fsRy(l)),fsRz(ph-d));
const fsm=k=>k*k*(3-2*k);
// THE WHIRL, drawn from the state object every frame: a white heart up its hollow middle, the wall of fire, and outside it a thinner,
// broken wall of soot turning slower (dark bands across the bright body). It leans, and the lean walks round (st.lean, st.ld);
// st.cut (0..1) is how much of it has been torn away from the foot upward.
function fsDraw(st){ return GFX.add(9,()=>{ if(st.dead||!VOLX||!VOLX.on||st.a<=0) return; const C=fsCol(st.col), sl=Math.sin(st.lean), cl=Math.cos(st.lean), ax=sl*Math.cos(st.ld), ay=sl*Math.sin(st.ld), ht=st.h*(1-st.cut), hh=ht/2, zc=st.h*st.cut+hh, rr=st.r*SBX, rf=mix(st.r0,st.r,Math.pow(st.cut,1.4)), smk=st.smk;
    const x=st.x+ax*zc, y=st.y+ay*zc*FSY, z=cl*zc+st.lift;
    VOLX.add('funnel',x,y,z,{ex:rr,ey:rr,ez:hh,R:fsRot(st.ph,st.lean,st.ld),pa:[rf/rr,.936/SBX,st.thick*1.3/SBX,4],pb:[st.heat,2.4,st.sway,st.streak],dens:8.5*st.a,gain:1.6*st.gain,seed:7.3,smoke:smk,fire:.5,rim:.3*smk,amb:.2,key:1.2,glow:.5*(1-smk),...C,...(smk>.2?{cS:mc(C.cS,'#141010',smk),cK:'#4e403a',key:.95}:{}),ord:st.y});
    if(st.soot>0&&!F.low){ const r2=rr*1.08; VOLX.add('funnel',x,y,z,{ex:r2,ey:r2,ez:hh,R:fsRot(st.ph*.6+2,st.lean,st.ld),pa:[rf*1.12/r2,.936/SBX,st.thick*.42/SBX,2.6],pb:[0,1.7,st.sway,2.2],dens:2*st.soot*st.a,seed:19.4,smoke:1,fire:1,cS:'#0e0605',cK:mc('#5a2410','#a85a20',sat(st.col/2)),amb:.16,key:1,rim:.3,glow:0,steps:16,ord:st.y+6}); }
    // the white heart shows as threads of white-gold wound up the near side of the wall, climbing
    if(st.core>0&&F.on&&st.cut<=0){ const km=K.mats(), CW=col(PG); for(let i=0;i<4;i++){ const r1=h01(i*5.7+1), r2=h01(i*9.3+2), ph=(i/4+r1*.2+st.t*(.34+.2*r2))%1, h0=.04+.7*ph, al=Math.sin(PI*ph)*st.core, ps=[]; if(al<.05) continue;
        for(let j=0;j<=10;j++){ const u=j/10, hz=h0+u*(.16+.14*r2), a=-.2+r1*1.1+u*(PI+.4)*(.55+.45*r2), rad=mix(st.r0,st.r,Math.pow(hz,1.4))*.9, zz=st.h*hz; ps.push({x:st.x+ax*zz+Math.cos(a)*rad,y:st.y+ay*zz*FSY+Math.sin(a)*rad*FSY,z:cl*zz,w:st.r*(.05+.1*hz)*(.6+.8*r1)*Math.pow(Math.sin(PI*u),.6)}); }
        F.ribbon(km.trB,ps,{...CW,gain:2.1,ero:.2,t0:i*2.3,a:al}); } } }); }
// the floor under where it will stand heats up: soot first, then cracks that only ever get brighter (k runs 1 -> 0)
function stormHeat(x,y,r,st){ if(!F.on) return; const m=um1(); GFX.add(8,(k,t)=>{ if(st.gone) return; const i=eo3(sat(t/.5)), hk=mix(.7,.08,Math.sqrt(st.hot)), H=K.heat(PF,hk), rr=r*(.55+.45*i)*(1+.5*st.hot);
    F.quad(m.hS,x,y,rr*1.04,rr*1.04,.7,{a:.8*sat(t/.2),ero:.1,rv:[1.1,.2,0,.1]});
    F.quad(m.gl,x,y,rr*1.15,rr*1.15,.7,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.5*(.25+.75*st.hot),gain:1.1*H.g,rv:[1.1,.5,0,.3]});
    F.quad(m.hB,x,y,rr,rr,.7,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,.3+st.hot),gain:2.7*H.g,bgain:1.2*H.g,ero:.08+.4*hk*hk,rv:[1.05,.3,0,.1]}); }); }
// SUCTION BANDS: thick arms of fire lying on the floor, wound round the foot of the whirl and running into it (the last of each arm
// climbs the foot). They turn with it, the fire in them streams inward, and every surge adds arms, reach and width.
function fsArms(st){ if(!F.on) return; const km=K.mats(), N=5; GFX.add(9,()=>{ if(st.dead||st.arm<=0||st.armA<=0) return; const C=fsCol(Math.max(0,st.col-1));
    for(let i=0;i<N;i++){ const a=sat(st.arm-i)*st.armA; if(a<=0) continue; const b0=(i*2%N)/N*TAU+st.aph+h01(i*3.3)*.5, Ro=st.armR*(.74+.34*h01(i*7.7)), ps=[];
      for(let j=0;j<=17;j++){ const u=j/17, rad=mix(Ro,st.r0*1.5,Math.pow(u,.72)), ang=b0+2.5*u; ps.push({x:st.x+Math.cos(ang)*rad,y:st.y+Math.sin(ang)*rad*FSY,z:14,w:(30+st.armW*Math.pow(Math.sin(PI*Math.min(1,u*.96+.04)),.55))*a}); }
      F.ribbon(km.trB,ps,{...C,gain:1.25*st.gain,ero:.2+(1-a)*.7,t0:i*1.7,a:Math.min(1,a*1.3)}); } }); }
// THE SEED: the spark he gathers over his raised hand hangs there for a moment, then goes over in an arc and drops into the floor
// behind him - that is what lights the whirl
function fsSeed(x0,y0,z0,tx,ty,dur,land){ const orb=K.vorb(x0,y0,z0,{r:46,pal:PG,dur:dur+.03,in:.12,out:.03,spin:7,core:.36,heat:1}), Lt=GFX.light(x0,y0,560,PG.l,.8,.1,{hold:dur,z:z0}), km=F.on?K.mats():null, CG=col(PG); let pt=0;
  const at=t=>{ const u=sat((t-.16)/(dur-.16)), e=u*u; return {x:mix(x0,tx,e),y:mix(y0,ty,e),z:mix(z0,20,e)+420*Math.sin(PI*Math.pow(u,.8))*(1-.4*u)}; };
  GFX.add(dur,(k,t)=>{ const u=sat((t-.16)/(dur-.16)), {x,y,z}=at(t);
    orb.x=x; orb.y=y; orb.z=z; Lt.x=x; Lt.y=y; if(km){ F.bill(km.glowO,x,y,z,84,84,0,{...CG,a:1,gain:2.6}); if(u>0){ const ps=[]; for(let j=7;j>=0;j--){ const p=at(t-j*.024); p.w=6+34*(1-j/7); ps.push(p); } F.ribbon(km.trB,ps,{...col(PF),gain:2.4,ero:.2,t0:1.7,a:1}); } }
    if(t-pt>.016){ pt=t; streak(x,y,z,rand(-90,90),rand(-60,60),rand(-40,180),rand(.22,.42),{s:4,len:.05}); } });
  after(dur,()=>{ orb.dead=true; Lt.hold=0; land(); }); }
// THE WALL of the climax: a torus of fire rolling out past the edges of the screen. Its thickness and heat are uneven round the ring
// (large lumps).
function fsRing(x,y,Rm,r0,dur){ if(!VOLX||!VOLX.on) return; const C=K.vc(PF), tube=.125, a0=r0/Rm;
  GFX.add(dur,(k,t)=>{ const e=eo3(k), rr=mix(a0,1,e)*.78, f=sat((k-.45)/.55);
    VOLX.add('ring',x,y,Rm*tube*.9,{ex:Rm,ey:Rm,ez:Rm*tube*1.9,pa:[rr,tube*(.78+.6*e),1.3,t*.8],pb:[1.5*(1-k),.56,.9,0],dens:9*(1-f*f)*sat(k*10),seed:5.1,smoke:1,fire:.7,cS:'#2a2420',cK:'#8a7868',...C,amb:.2,key:1.2,rim:.3,steps:20,ord:t>.17?1e9:-1e9}); }); }
// the moment the wall of that ring reaches a distance d from the centre
const fsRingT=(d,Rm,r0,dur)=>dur*(1-Math.cbrt(1-sat((d/(.78*Rm)-r0/Rm)/(1-r0/Rm))));
// a burning piece thrown out of the blast: it arcs over the field trailing sparks and lands (a second blast where it does)
function fsShard(sx,sy,tx,ty,T,land){ const km=K.mats(), CG=col(PG), HZ=520+T*500; let pt=0;
  GFX.add(T,(k,t)=>{ const x=mix(sx,tx,k), y=mix(sy,ty,k), z=260*(1-k)+HZ*4*k*(1-k), s=mix(96,62,k);
    if(F.on){ F.bill(km.glowO,x,y,z,s*1.7,s*1.7,0,{...col(PF),a:.8,gain:1.6}); F.bill(km.glowO,x,y,z,s*.7,s*.7,0,{...CG,a:1,gain:3.2}); }
    if(t-pt>.022){ pt=t; streak(x,y,z,(sx-tx)/T*.25+rand(-70,70),(sy-ty)/T*.25+rand(-40,40),rand(-60,120),rand(.25,.5),{s:4.5,len:.06,drag:1.6}); } });
  after(T,land); }
// a low fire left on the field. It does not blink out: in its last .7 s it narrows to a thread, stretches upward and leaves as a tail
// of sparks and a wisp of smoke.
function fsFire(x,y,r,h,dur){ const H=K.vcolumn(x,y,{r,h,dur,rise:.42,out:.45,pal:PF,taper:.55,turb:.8}); let pt=0;
  GFX.add(dur,(k,t)=>{ const f=sat((t-(dur-.7))/.7); H.r=r*(1-.62*f*f); H.h=h*(1+.5*f);
    if(f>0&&t-pt>.05){ pt=t; GFX.pt({x:x+rand(-r,r)*.4,y,z:h*(.5+.6*f),vx:rand(-30,30),vy:0,vz:rand(420,760),g:0,drag:.8,life:rand(.35,.6),s:3.5,m:3,len:.05,c:GFX.rgb(PG.h),c2:PF.b,L:3}); } });
  after(dur-.12,()=>K.vsmoke(x,y,{s:r*1.7,z:h*.6,dur:.9,rise:460,a:.45})); }
// THE POOL the whirl stood on: molten veins that cool from the middle outward (three rings of it, each a step later than the one inside),
// white -> orange -> dull red -> black crust; the crust itself breaks up at the very end.
function fsPool(x,y,r,life){ if(!F.on) return; const m=um1(), CT=life*.62; GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.22)), eat=sat((k-.84)/.16), rr=r*i;
    F.quad(m.hS,x,y,rr*1.06,rr*1.06,2.1,{a:.9*sat(t/.1),ero:.12+.75*eat,rv:[1.1,.25,0,.1]});
    for(let z=0;z<3;z++){ const hk=sat((t-.3-z*.42)/CT); if(hk>=1) continue; const H=K.heat(z?PF:PG,hk), a=Math.min(1,(1-hk)*3), ri=z*.33, ro=z===2?1.05:(z+1)*.33+.05;
      F.quad(m.gl,x,y,rr*1.1,rr*1.1,2.1,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.45*a*(1-hk),gain:1.1*H.g,rv:[ro+.08,.2,ri,.14]});
      F.quad(m.hB,x,y,rr,rr,2.1,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a,gain:2.7*(1+.6*z)*H.g,bgain:1.2*H.g,ero:(.08-.03*z)+.5*hk*hk,rv:[ro,.1,ri,.1]}); } }); }
// the bodies thrown by the blast: each one flies its own arc outward (st.fly holds the arcs, the storm clock moves them) dragging a
// tail of fire, so the throw reads through the flash
function fsFlight(st){ if(!F.on) return; const km=K.mats(), CF=col(PF), CG=col(PG); GFX.add(1.6,()=>{ let n=0; for(const q of st.fly){ const L=q.ps.length; if(L<2||n++>=24) continue;
      F.ribbon(km.trB,q.ps.map((p,i)=>({x:p.x,y:p.y,z:p.z,w:10+90*i/(L-1)})),{...CF,gain:2.8,ero:.2,t0:n*1.3,a:1});
      if(!q.done){ const p=q.ps[L-1]; F.bill(km.glowO,p.x,p.y,p.z,95,95,0,{...CG,a:.8,gain:1.5}); } } }); }
function ultStorm(id){ timers.length=0; ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, cx=x0, cy=y0-440, RTOP=hw*.44, HT=1900, DIR=1, T1=.85, T2=3.5, TC=3.75, TF=TC+.08, TE=6.5;
  // three surges, each one at least half again as wide and tall as the last: crimson, orange, gold. It leans further with each.
  const BT=[T1,1.75,2.65], RV=[.36,.6,1], HV=[.4,.66,1], CV=[0,1,2], LN=[.04,.08,.13], AT=[2,4,5];
  S([['gx01',.1],['gx03',.75,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',2.66],['gx09',.15],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  const st={x:cx,y:cy,r:44,r0:22,h:70,ph:0,col:0,heat:.56,thick:.12,sway:.08,streak:.95,gain:.7,smk:.12,a:0,lift:0,cut:0,lean:0,ld:1,core:0,soot:0,arm:0,armA:1,armR:500,armW:60,aph:0,hot:0,wind:0,t:0,gone:0,fly:null,fly0:0,dead:false}; let t=0, wn=0, en=0, bn=0, sn=0, smT=0, tn=0;
  // ---- prepare (0 - .85): close on him, the air turns cold blue; sparks wind in to his raised hand and become one seed of fire, which
  // goes over his head into the floor behind him
  GFX.ambient(.34,.37,.56,4); Cn.move({x:x0,y:y0-260,zoom:1.3,tilt:.08,roll:-.04},.7,'io'); SFX.fire(3.6,.5); Cn.drone(44,.3);
  const Lt=GFX.light(cx,cy,500,PD.l,.35,.4,{hold:TC,z:160,flick:.08}), hx=x0+10, hz=BODY*1.75;
  stormHeat(cx,cy,330,st); fsDraw(st); fsArms(st);
  for(let i=0;i<36;i++) after(i*.008,()=>{ const a=i*2.4, d=260+hash1(i)*420; GFX.pt({x:hx+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:hz+(hash1(i+50)-.5)*300,tx:hx,ty:y0,tz:hz,pull:6+hash1(i+9)*3,life:.3+hash1(i+3)*.14,s:3+hash1(i+7)*3,m:3,len:.06,vx:-Math.sin(a)*DIR*520,vy:Math.cos(a)*DIR*520*FSY,c:GFX.rgb(i%3?PF.s:PF.h),c2:PF.b,L:3}); });
  after(.3,()=>{ K.flare(hx,y0,hz,{pal:PB,s:260,dur:.2,gain:2.6}); K.flare(hx,y0,hz,{pal:PB,s:110,dur:.28,gain:3}); GFX.light(x0,y0,700,PB.l,.9,.3,{z:hz}); Cn.SND.shing(1.3,.35);
    fsSeed(hx,y0,hz,cx,cy,T1-.3,()=>{ K.flare(cx,cy,60,{pal:PG,s:240,dur:.14,gain:2.4}); K.sparks(cx,cy,30,{pal:PG,n:18,sp:[250,900],up:1500}); GFX.light(cx,cy,800,PG.l,.9,.3,{z:80});
      K.vcolumn(cx,cy,{r:30,h:HT*HV[0]*.95,rise:.16,dur:.5,out:.3,pal:PG,taper:.3,twist:4,heat:1.5}); }); });
  // a surge: the floor lights, the arms reach further, and everything on screen catches fire (or burns higher), the near ones first
  const beat=i=>{ for(const e of onScreen(300)){ const d=Math.hypot(e.x-cx,(e.y-cy)/FSY); after(.1+d/(hw*1.3)*.55,()=>{ if(st.gone||e.dead) return; e._fs=1; e.hdx=e.x<cx?1:-1; e.hitT=RT; }); }
    GFX.light(cx,cy,hw*(.8+.3*i),[PD.l,PF.l,PG.l][i],.7,.4,{z:120}); Cn.shake(.32+.14*i); SFX.whoosh(.6+.15*i,.9-.12*i); if(i){ sfx('fire',.5,.5); K.sparks(cx,cy,60,{pal:i>1?PG:PF,n:12+6*i,sp:[500,1700],up:1300,life:[.3,.7]}); } };
  // ---- one clock for everything that grows
  V.ultTick=dt=>{ t+=dt; st.t=t; st.hot=sat(t/TC); const tt=t-T1; if(tt<0) return;
    const k=sat(tt/(T2-T1)), slow=t>T2&&t<TC?.4:1;
    if(!st.gone){ while(bn<3&&t>=BT[bn]) beat(bn++);
      // the levels it has grown to (steps, each eased: it is born as a thread - height first, then width), the tightening before a
      // surge, the overshoot and the yank after it
      let g=0, gh=0, c=0, ln=0, at=0, pin=0, ov=0, yank=0, sp=0;
      for(let i=0;i<3;i++){ const u=t-BT[i], p=i?1:0; if(u>=0){ g+=(RV[i]-p*RV[i-p])*(i?eo3(sat(u/.5)):fsm(sat((u-.05)/.4))); gh+=(HV[i]-p*HV[i-p])*(i?eo3(sat(u/.42)):fsm(sat(u/.3))); c+=(CV[i]-p*CV[i-p])*sat(u/.45); ln+=(LN[i]-p*LN[i-p])*sat(u/.6); at+=(AT[i]-p*AT[i-p])*sat((u-.1)/.5); sp+=2.6+5*Math.exp(-u/.4); if(i){ const rel=Math.exp(-u/.07); pin+=rel; ov+=(1-rel)*Math.exp(-u/.26); } yank+=Math.exp(-u/.28)*(i?1:.35); }
        else if(i&&u>-.34){ pin+=fsm(sat((u+.34)/.34)); } }
      // between the surges it does not hold still: it breathes (narrow and tall, then wide and squat) and its top walks a circle
      const br=Math.sin(t*4.6)*sat(tt-.45)*(.04+.03*g);
      st.wind=sat(g*.75+.25*k); st.a=sat(tt*9);
      st.r=mix(44,RTOP,g)*(1-.22*pin+.14*ov+br); st.r0=mix(22,250,g)*(1-.35*pin); st.h=(70+(HT-70)*gh)*(1+.08*pin-.04*ov-br*.7); st.col=c+.14*ov; st.heat=mix(.56,.65,sat(g))+.06*ov;
      st.thick=mix(.12,.15,sat(g))*(1+.25*pin); st.sway=mix(.07,.15,sat(g)); st.streak=mix(.95,1.35,sat(c/2)); st.gain=mix(.72,.66,sat(g))+.08*ov; st.ph+=dt*DIR*((1.4+sp)*slow-4);
      st.lean=ln*(1+.6*ov+.5*pin); st.ld+=dt*DIR*mix(1.3,2.4,sat(g))*slow; st.core=sat((c-.7)/1.1); st.soot=sat((c-1.05)/.7);
      st.arm=at; st.armR=mix(420,hw*.98,sat(g))*(1+.12*ov); st.armW=mix(50,150,sat(g))*(1+.5*ov-.3*pin); st.aph+=dt*DIR*(1.5+1.2*sat(g)+2.4*yank)*slow;
      st.x=cx+Math.sin(t*1.25)*mix(8,50,sat(g)); st.y=cy+Math.cos(t*1.05)*mix(4,24,sat(g));
      Lt.r=mix(500,hw*1.25,sat(g)); Lt.a=mix(.35,1.05,sat(g))+.2*ov; Lt.c=mc(PD.l,PG.l,sat(c/2));
      // black smoke leaves the mouth behind it, puff after puff, each one rolling up and away and thinning (never a blot that stays)
      if(tt>.4&&t<T2&&t-smT>.36&&!F.low){ smT=t; const sx=sn++%2?1:-1; K.vsmoke(st.x+sx*st.r*.55,st.y-230,{s:st.r*.6+110,z:st.h*.6,dur:1.3,rise:st.h*.34+260,a:.9,vx:sx*st.r*.8}); }
      const burning=[]; for(const e of onScreen(300)) if(e._fs){ burning.push(e); e.mkC=PM.l; e.mkT=RT+.25; }
      // the wind: long sparks running round the whole field and into the foot of the whirl; every other one is torn off something that burns
      { const want=Math.floor((14*tt+20*tt*tt*.5)*(GFX.QK||1)*(t>T2?.3:1)); let n=0;
        while(wn<want&&n++<12){ wn++; const src=wn%2&&burning.length?burning[Math.floor(hash1(wn*4.7)*burning.length)]:null, a=hash1(wn*1.37)*TAU, d=260+Math.pow(hash1(wn*2.11),.7)*hw*1.25, v=mix(1500,3400,k)*(.7+.6*hash1(wn*3.3)), z=src?src.z+src.h*(.4+.6*hash1(wn*5.1)):20+hash1(wn*5.1)*160, hot=wn%5===0;
          const px=src?src.x:cx+Math.cos(a)*d, py=src?src.y:cy+Math.sin(a)*d*FSY, pa=src?Math.atan2((py-cy)/FSY,px-cx):a;
          GFX.pt({x:px,y:py,z,tx:st.x,ty:st.y,tz:z*.5+mix(60,260,st.wind),pull:mix(.7,1.6,k)*(src?1.8:1),vx:-Math.sin(pa)*DIR*v*(src?.6:1),vy:Math.cos(pa)*DIR*v*FSY*(src?.6:1),life:.4+hash1(wn*7.7)*.34,s:hot?9:6,m:3,len:mix(.1,.16,k),c:GFX.rgb(hot?PG.m:PF.b),c3:hot?PG.h:PF.m,c2:PD.b,L:3}); } }
      // every enemy on screen is dragged in - a lurch at each surge; the near ones leave the floor and circle it
      for(const e of onScreen(300)){ if(e.d.boss) continue; const wt=e.d.heavy?.3:1, h1=e._st??(e._st=hash1(e.x*.37+e.y*.11)), dx=e.x-cx, dy=(e.y-cy)/FSY; let d=Math.hypot(dx,dy)||1, a=Math.atan2(dy,dx); const Ro=mix(420,700,h1)*(1.2-.3*sat(g))+st.r*.5;
        if(d>Ro) d=Math.max(Ro,d-(mix(90,420,sat(g))+1700*yank)*wt*slow*dt); a+=DIR*(mix(.3,2.4,sat(g))+1.3*yank)*Math.pow(Math.min(1,Ro/d),1.5)*wt*slow*dt; e.x=cx+Math.cos(a)*d; e.y=cy+Math.sin(a)*d*FSY; e.kx=e.ky=0;
        if(yank>.45&&d>Ro&&(e._dk||0)<t){ e._dk=t+.09; K.dust(e.x,e.y,{n:1,dir:a,spread:.25,sp:[260,620],a:.4,s:.9,life:.5}); }
        if(d<Ro*1.25&&!e.d.heavy){ const zt=mix(140,820,hash1(h1*91))*sat(g*1.3); e.z+=(zt-e.z)*(1-Math.exp(-dt*3.5)); e.vz=3000*dt+.01; } } }
    else { const td=t-st.gone, f=sat(td/1.4), burn=sat(td/.42), tear=fsm(sat((td-.04)/.4));
      // it flares gold-white, and the blast eats it from the foot upward: the wall is torn off in sparks as the cut climbs, what is
      // left of the top goes on turning as black smoke for a moment and is carried up
      st.col=2+.95*sat(td/.05)*(1-burn); st.heat=(.68+.2*sat(td/.05))*(1-burn*burn); st.smk=mix(.12,1,burn); st.cut=tear*.97; st.lift=260*tear; st.r=RTOP*(1+.22*tear); st.h=HT*(1+.16*tear); st.streak=1.35+.5*f; st.ph+=dt*DIR*mix(10,3,f); st.gain=mix(.92,.76,burn);
      st.core=0; st.soot=(1-burn)*.8; st.armA=1-sat(td/.2); st.lean=LN[2]*(1-tear); if(tear>=1) st.a=0;
      { const want=td<.56?Math.floor(td*260*(GFX.QK||1)):0; let n=0; while(tn<want&&n++<14){ tn++; const a=hash1(tn*1.7)*TAU, zc=HT*st.cut, rad=mix(250,RTOP,Math.pow(st.cut,1.4)), v=1500+1500*hash1(tn*3.9);
          GFX.pt({x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad*FSY,z:zc+hash1(tn*5.3)*160,vx:(-Math.sin(a)*DIR*.8+Math.cos(a)*.6)*v,vy:(Math.cos(a)*DIR*.8+Math.sin(a)*.6)*v*FSY,vz:300+500*hash1(tn*7.1),g:900,drag:1.6,life:.4+hash1(tn*2.3)*.4,s:tn%4?5:8,m:3,len:.12,c:GFX.rgb(tn%3?PG.m:PG.h),c3:PG.h,c2:PF.b,L:3}); } }
      // the thrown bodies fly their arcs
      if(st.fly){ const tf=t-st.fly0; for(const q of st.fly){ const e=q.e; if(q.done){ if(q.ps.length&&(q.dt+=dt)>.016){ q.dt=0; q.ps.shift(); } continue; } if(e.dead){ q.done=true; continue; } const u=sat(tf/q.T), eo=1-(1-u)*(1-u);
          e.x=q.x+q.ux*q.D*eo; e.y=q.y+q.uy*q.D*eo*FSY; e.z=q.z*(1-u)+q.ap*4*u*(1-u); e.vz=3000*dt+.01; e.kx=e.ky=0; e.stun=Math.max(e.stun,.5);
          q.ps.push({x:e.x,y:e.y,z:e.z+e.h*.5}); if(q.ps.length>14) q.ps.shift();
          if(u>=1){ q.done=true; e.z=0; e.vz=0; K.dust(e.x,e.y,{n:3,dir:Math.atan2(q.uy,q.ux),spread:.5,sp:[200,520],a:.4,s:.9,life:.6}); V.blast=null; ultHit(e,Dm,cx,cy); } } }
      // embers and ash coming down over the whole field until the end
      const te=td-.3, want=te>0&&te<TE-TC-.45?Math.floor(42*te*(GFX.QK||1)):0; let n=0; while(en<want&&n++<8){ en++; const a=hash1(en*1.9)*TAU, d=Math.sqrt(hash1(en*4.3))*hw*.95, big=en%3===0;
        GFX.pt({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*FSY,z:500+hash1(en*6.1)*800,vx:(hash1(en*2.7)-.5)*260,vy:0,vz:-(380+hash1(en*8.3)*340),g:0,drag:.25,life:1.1+hash1(en*3.1)*.8,s:big?3.5:2.5+hash1(en*9.7)*1.5,m:3,len:.014,c:GFX.rgb(big?PF.s:PF.b),c2:PD.b,c3:PF.m,fade:'in',L:3}); } } };
  // ---- gather (.85 - 3.5): the whirl is born; the camera pulls back early and then only drifts, so that every surge is seen to grow
  after(T1,()=>{ Cn.move({x:x0,y:y0-620,zoom:.64,tilt:.2,roll:.02},.8,'out'); after(.8,()=>Cn.move({y:y0-1090,zoom:.5,roll:.05},T2-T1-.8,'lin')); GFX.ambient(.72,.42,.34,.7); });
  for(let i=0;i<6;i++) after(1+i*.4,()=>{ sfx('fire',.3,.3); V.fxK=RT; for(const e of onScreen(300)){ dmg(e,e.d.boss?Dm*.06:Math.min(Dm*.06,e.hp*.12),{kb:0}); e.flash=.35; } });
  after(2.6,()=>Cn.SND.inhale(.9,.55));
  // ---- breath (3.5 - 3.75): it keeps its size; the floor goes dark, the wind dies, the spin drags
  after(T2,()=>{ Cn.hush(.25); Cn.move({zoom:.55},.25,'io'); });
  // ---- climax (3.75): gold-white. The flash is held for a few frames (nothing moves yet) ...
  after(TC,()=>{ st.gone=t; Lt.hold=0; Lt.life=.2;
    Cn.peak(cx,cy,{ca:.03,blur:.16,tint:'#ff7a2a',hold:.07}); hitstop=Math.max(hitstop,.12); Cn.shake(1.7); GFX.light(cx,cy,hw*1.7,PG.l,.95,.5,{z:300}); Cn.SND.hit(1);
    Cn.move({zoom:.44,roll:0},.26,'out'); GFX.ambient(.95,.62,.45,30); after(.2,()=>GFX.ambient(.52,.38,.36,3));
    K.flare(cx,cy,420,{pal:PB,s:420,dur:.09,gain:2.4}); K.flare(cx,cy,260,{pal:PW,s:300,dur:.16,gain:1.8});
    // the body of the blast, inside the wall: a ball of fire swelling at the foot and a white-gold pillar driven up through the whirl
    K.vblast(cx,cy+30,{s:RTOP*.74,pal:PF,dur:1.5,fire:.42,rise:560,heat:1,lump:.72,gain:.85});
    K.vcolumn(cx,cy,{r:RTOP*.3,h:HT*1.35,rise:.12,dur:1.05,out:.55,pal:PG,heat:1.5,taper:.35,twist:3.2,turb:.75});
    K.cool(cx,cy,{kind:'scorch',r:1250,pal:PF,life:2.4,light:0}); fsPool(cx,cy,1000,TE-TC-.05);
    K.sparks(cx,cy,300,{pal:PG,n:18,sp:[700,2600],up:2200,life:[.4,1]}); K.chunks(cx,cy,{n:8,r:200,sp:[400,1500],up:1900});
    // the fires on them burst with it
    onScreen(300).filter(e=>e._fs).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)).forEach((e,i)=>{ e._fs=0; if(i<5) K.ehit(e,{pal:PG,pw:1.5,dir:Math.atan2((e.y-cy)/FSY,e.x-cx),light:i<2}); dmg(e,e.d.boss?Dm*.12:Math.min(Dm*.12,e.hp*.2),{kb:0}); });
    after(.05,()=>Cn.shake(1)); after(.1,()=>Cn.shake(.8));
    after(.3,()=>{ for(const e of onScreen(300)) if(e.d.boss) ultHit(e,Dm,cx,cy); }); });
  // ... then (3.83) everything is let go at once: the wall of fire rolls out, every body on screen is thrown outward on its own arc,
  // burning pieces are flung across the field and blow up where they land
  after(TF,()=>{ const RM=hw*1.6, R0=hw*.1, RD=.85; fsRing(cx,cy,RM,R0,RD); Cn.shake(1.2); K.dust(cx,cy,{n:16,r:140,sp:[600,1500],a:.45});
    st.fly=[]; st.fly0=t; for(const e of onScreen(300)){ if(e.d.boss) continue; const wt=e.d.heavy?.35:1, dx=e.x-cx, dy=(e.y-cy)/FSY, d=Math.hypot(dx,dy)||1, h1=hash1(e.x*.37+e.y*.11);
      st.fly.push({e,x:e.x,y:e.y,z:e.z,ux:dx/d,uy:dy/d,D:(900+700*h1)*wt,ap:(560+520*hash1(h1*57))*wt,T:.55+.25*h1,ps:[],dt:0,done:false}); e.hdx=dx>0?1:-1; e.hitT=RT; e.flash=1; }
    fsFlight(st);
    // six pieces: each lands inside the ring a little later than the last and goes up as a second blast; four of them (on both sides) leave a low fire
    [.2,2.3,2.95,3.75,4.6,5.5].forEach((a,i)=>{ const d=[900,1400,820,1250,880,1150][i], tx=cx+Math.cos(a)*d, ty=cy+Math.sin(a)*d*FSY, T=.2+.07*i;
      fsShard(cx+Math.cos(a)*120,cy+Math.sin(a)*120*FSY,tx,ty,T,()=>{ K.vblast(tx,ty,{s:250+60*(i%3),pal:PF,dur:.95,fire:.34,smoke:.7,rise:300,lump:.72}); K.flare(tx,ty,120,{pal:PG,s:200,dur:.12,gain:2}); K.sparks(tx,ty,40,{pal:PG,n:10,sp:[300,1100],up:1100,life:[.2,.55]}); GFX.light(tx,ty,620,PF.l,.8,.35,{z:80}); Cn.shake(.35);
        if(i!==1&&i!==4){ K.cool(tx,ty,{kind:'scorch',r:210,pal:PF,life:2.1,start:.15,light:0}); fsFire(tx,ty,74,380,Math.max(.9,TE-.2-.2*[2,0,0,3,0,1][i]-(TF+T))); } }); });
    // what the wall leaves where it passed: a scorched band and patches of burning ground, each lit as the wall reaches it and
    // cooling by itself; half of them carry a low fire that goes out one after another
    K.cool(cx,cy,{kind:'ring',r:hw*.86,pal:PF,life:2.2,start:.3,grow:.35,light:0,delay:fsRingT(hw*.6,RM,R0,RD)});
    [.6,1.75,2.7,3.9,4.75,5.9].forEach((a,i)=>{ const d=hw*(.62+.4*h01(i*6.7+2)), px=cx+Math.cos(a)*d, py=cy+Math.sin(a)*d*FSY, tw=fsRingT(d,RM,R0,RD);
      K.cool(px,py,{kind:'scorch',r:170+110*h01(i*3.1),ry:120+60*h01(i*4.3),rot:a+PI/2,pal:PF,life:1.5+.8*h01(i*8.9),start:.12,light:0,delay:tw});
      if(i%2===0) after(tw,()=>fsFire(px,py,60,300,.8+.28*i)); }); });
  // ---- what is left (3.85 - 6.2): black smoke climbs where it stood, the pool crusts over from its middle outward, embers come down
  after(TC+.18,()=>{ K.vsmoke(cx-120,cy-40,{s:480,z:240,dur:2.2,rise:800,a:.9}); K.vsmoke(cx+150,cy-90,{s:540,z:700,dur:2.1,rise:1000,a:.85,delay:.25}); GFX.light(cx,cy,1000,PF.l,.55,1.7,{z:60}); });
  after(TC+.8,()=>K.vsmoke(cx+20,cy-10,{s:400,z:140,dur:1.7,rise:500,a:.8}));
  after(TE-1.3,()=>{ Cn.back(1.2); GFX.ambient(1,1,1,2); });
  after(TE,()=>{ st.dead=true; ultStop(); }); }

// CRIMSON WINGS (screen piece: one pair of wings, four poses). He crosses his arms; a ball of fire is crushed into the point behind his
// shoulders and a pair of wings breaks out of it folded and raised - the tips are seen running out. They UNFOLD (the three feathers of a
// side fan apart, the wing comes down level), are drawn UP, and STRIKE the floor: the ground splits along both wings and a wave of heat
// runs out over the whole field. Then he TURNS once: the wings sweep the full circle of the screen, lifting and throwing every body they
// pass. They rise wide for a breath and CLAP shut in front of him across the lower field; the game stops on that frame, and then a wall
// of fire rolls out past the edges of the screen. What stays: the print of both wings burnt into the floor, cooling from white to a dull
// red and breaking up, fires that burn down to nothing, soft smoke, feathers coming down.
// The pose is a pure function of the clock (wpose): keys of [time, lead angle from straight up-field (deg), pitch, fan between feathers
// (deg), 1 = an accelerating stroke]. Nothing about the wings is random, and no length ever gets shorter.
const WK=[[.86,30,.5,5,0],[1.15,32,.54,6,0],[1.6,80,.36,20,0],[1.9,56,.92,22,0],[2.1,108,.03,26,1],[2.4,92,.22,14,0],[2.7,90,.24,4,0],[3.2,90,.26,4,0],[3.5,90,.26,12,0],[3.75,84,.5,34,0],[3.95,140,0,13,1]];
const WT0=.86, WU0=1.15, WS1=2.1, WR0=2.4, WR1=3.5, WH=3.75, WCL=3.95, WLF=[1,.92,.78], WRD=[300,290,250];
const smo=k=>k*k*(3-2*k);
// the turn: it starts and ends gently but most of it runs at one speed
const wturn=u=>u+.65*(smo(u)-u);
function wpose(t){ let i=0; while(i<WK.length-2&&t>WK[i+1][0]) i++; const A=WK[i], B=WK[i+1], u=sat((t-A[0])/(B[0]-A[0])), k=B[4]?u*u:smo(u);
  return {a:mix(A[1],B[1],k)*PI/180,p:mix(A[2],B[2],k),fan:mix(A[3],B[3],k)*PI/180,rot:TAU*wturn(sat((t-WR0)/(WR1-WR0))),swp:.3*smo(sat((t-WR0)/.3))*(1-smo(sat((t-WR1+.3)/.3)))}; }
// the wings only ever get longer: out of his back, with the unfolding, after the strike, for the last breath
const wlen=t=>mix(.55,.85,smo(sat((t-WU0)/.45)))+.15*smo(sat((t-WS1)/.38))+.12*smo(sat((t-WR1)/.25));
// feather j of side sd at clock t (the outer feathers run a little behind the leading one: the whip of a stroke, the sweep-back of the turn)
function wfe(W,sd,j,t){ const tj=t-j*.03, q=wpose(tj), dir=-PI/2+q.rot+sd*(q.a+j*q.fan)-j*q.swp, pit=q.p*(1-.14*j);
  return {dir,pit,len:W.L*wlen(tj)*WLF[j],cd:Math.cos(dir),sn:Math.sin(dir),cp:Math.cos(pit),sp:Math.sin(pit),g:smo(sat((tj-WT0)/.3))}; }
// the point a fraction u of the way along a feather
const wpt=(W,f,u)=>({x:W.x+f.cd*(30+f.cp*f.len*u),y:W.y+f.sn*(30+f.cp*f.len*u)*FSY,z:W.z+f.sp*f.len*u});
let WMT=null;
function wmat(){ return WMT||(WMT={bone:F.mat({nz:'streak',n1:[1,.8,-.5,0],n2:[2,1,-.3,0],dist:.05,nk:.6,ero:.1,soft:.3,pm:[2,1.6,0,0],fd:[.5,.03,0,0],cA:'#050101',cB:'#0d0301',cC:'#1a0702',op:1})}); }
// the wings, drawn from the state every frame. Per feather, bottom to top: its shadow on the floor (it parts from the feather as the wing
// is raised and meets it when the wing strikes), the body of fire, a head of light on the tip while it runs out, the dark arm along the
// leading edge of the wing, a thin hot quill.
function wingDraw(W){ return GFX.add(9,()=>{ if(W.dead||W.al<=0) return; const C=fsCol(W.col), QC=fsCol(Math.min(2.99,W.col+.9)), kq=K.mats(), wm=F.on?wmat():null, t=W.t, CG=col(PG);
    for(let sd=-1;sd<=1;sd+=2) for(let j=0;j<3;j++){ const f=wfe(W,sd,j,t), g=f.g; if(g<=0) continue; const L=f.len/2, rad=WRD[j]*W.rk, m=wpt(W,f,.5);
      if(F.on){ const sh=m.z*.14; F.quad(kq.dark,m.x-f.cd*f.cp*L*.2,m.y-f.sn*f.cp*L*.2*FSY+sh,(L*f.cp*.78+rad*.4)*g,rad*.8,f.dir,{a:.55*W.al*g*W.sha}); }
      if(VOLX&&VOLX.on) VOLX.add('jet',m.x,m.y,m.z,{ex:L,ey:rad*1.25,ez:rad*1.25,yaw:f.dir,pitch:f.pit,pa:[.2,.8,2.6,4.2+W.flow],pb:[W.heat,.62,.05+g*1.3,W.tail],dens:10*W.al,gain:1.6*W.gain,seed:3.1+j*2.7+sd,smoke:.12,fire:.5,rim:0,...C});
      if(!F.on) continue;
      if(g<1&&!j){ const h=wpt(W,f,.74*g), s=150*(1-.4*g); F.bill(kq.glowO,h.x,h.y,h.z,s,s,0,{...CG,a:sat((1-g)*5),gain:3}); }
      const u0=Math.max(.04,W.tail+.1), u1=.72*g; if(u1-u0<.05) continue;
      if(!j){ const ps=[], oa=f.dir-sd*PI/2, ox=Math.cos(oa)*rad*.3, oy=Math.sin(oa)*rad*.3*FSY, ue=Math.min(u1,.5);
        for(let i=0;i<7;i++){ const u=mix(u0,ue,i/6), p=wpt(W,f,u); ps.push({x:p.x+ox*(.3+u),y:p.y+oy*(.3+u),z:p.z+10+Math.sin(PI*i/6)*f.len*.022,w:(78*(1-u*1.5)+14)*W.rk}); }
        F.ribbon(wm.bone,ps,{a:.8*W.al}); }
      const ps=[]; for(let i=0;i<8;i++){ const u=mix(u0,u1,i/7), p=wpt(W,f,u); ps.push({x:p.x,y:p.y,z:p.z+Math.sin(PI*u)*f.len*.03,w:(26-6*j)*W.rk*Math.pow(Math.sin(PI*Math.min(1,.12+i/7*.9)),.6)}); }
      F.ribbon(kq.trB,ps,{cA:QC.cA,cB:QC.cB,cM:QC.cM,cC:QC.cC,gain:2.2*W.qg,ero:.12,t0:j*1.7+sd,a:W.al}); } }); }
// the bodies the wings throw: each flies its own arc (W.fly holds the arcs, the clock in ultWings moves them) dragging a tail of fire
function wingFlight(W){ if(!F.on) return; const km=K.mats(), CF=col(PF), CG=col(PG); GFX.add(9,()=>{ if(W.done) return; let n=0;
    for(const q of W.fly){ const L=q.ps.length; if(L<2||n++>=12) continue;
      F.ribbon(km.trB,q.ps.map((p,i)=>({x:p.x,y:p.y,z:p.z,w:12+125*i/(L-1)})),{...CF,gain:2.8,ero:.2,t0:n*1.3,a:1});
      if(!q.done&&n<=5){ const p=q.ps[L-1]; F.bill(km.glowO,p.x,p.y,p.z,125,125,0,{...CG,a:.8,gain:1.5}); } } }); }
// THE PRINT of the wings burnt into the floor: one long scorch per feather (list of {x,y,rx,ry,rot,c}), white-hot veins in it that cool
// through orange to a dull red (each feather at its own pace), and at the end the crust itself breaks up
function wingPrint(list,life){ if(!F.on) return; const m=um1(); GFX.add(life,(k,t)=>{ const eat=sat((k-.7)/.3);
    for(const q of list){ const i=eo3(sat(t/.16)), hk=sat(Math.pow(t/(life*.8),1.5)+q.c*.5), H=K.heat(PF,hk);
      F.quad(m.hS,q.x,q.y,q.rx*i*1.05,q.ry*1.12,q.rot,{a:.85*sat(t/.08),ero:.12+.8*eat,rv:[1.1,.25,0,.1]});
      if(hk>=1) continue;
      if(q.i&1) F.quad(m.gl,q.x,q.y,q.rx*i*1.08,q.ry*1.25,q.rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.6*(1-hk),gain:1.3*H.g,rv:[1.05,.45,0,.2]});
      F.quad(m.hB,q.x,q.y,q.rx*i,q.ry,q.rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(1-hk)*3),gain:2.7*H.g,bgain:1.2*H.g,ero:.08+.5*hk*hk+.4*eat,rv:[1.02,.2,0,.1]}); } }); }
function ultWings(id){ timers.length=0; ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, T1=.8, TL=WCL, TR=TL+.1, TE=6.2;
  S([['gx01',.1],['gx03',.7,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',TL-1.04],['gx09',.06],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  const W={x:x0,y:y0-36,z:BODY*.95,L:hw*1.45,col:.4,heat:1,gain:.52,qg:.8,rk:1,flow:0,sha:1,eh:0,tail:-.3,al:1,t:0,hot:0,gone:0,dead:false,done:false,fly:[]}; let t=0, fn=0, en=0, eh=0, sn=0, TS=null, fin=false;
  const tick=e=>e.d.boss?Dm*.1:Math.min(Dm*.1,e.hp*.14);
  // a body thrown along the floor direction dir: D far, ap high, for T seconds
  const fling=(e,dir,D,ap,T)=>{ if(e.dead||e.d.boss) return; const wt=e.d.heavy?.35:1; for(const q of W.fly) if(q.e===e) q.done=true;
    W.fly.push({e,x:e.x,y:e.y,z:e.z,ux:Math.cos(dir),uy:Math.sin(dir),D:D*wt,ap:ap*wt,T,t0:t,ps:[],dt:0,done:false}); e.hdx=Math.cos(dir)>0?1:-1; e.hitT=RT; e.flash=1; };
  // ---- prepare (0 - .86): close on him, the air turns cold blue, sparks are drawn in behind his back, the floor under him starts to glow
  GFX.ambient(.34,.37,.56,4); Cn.move({x:x0,y:y0-BODY*.6,zoom:1.45,tilt:.08},.7,'io'); SFX.fire(3.2,.5); Cn.drone(44,.3);
  const Lt=GFX.light(x0,y0-100,500,PD.l,.35,.4,{hold:TL,z:300,flick:.08});
  stormHeat(x0,y0,250,W); wingDraw(W); wingFlight(W);
  // a ball of fire gathers over his raised hands, is drawn down into the point behind his shoulders and crushed small there; that point
  // goes white for two frames and the wings break out of it (the wings' root IS where the ball went)
  { const OZ=BODY*1.5, OT=WT0, ob=K.vorb(x0,W.y-50,OZ,{r:36,dur:OT-.34,pal:PF,in:.3,out:.04,core:.3,delay:.34});
    GFX.add(OT,(k,tt)=>{ const u=sat((tt-.34)/(OT-.5)), c=smo(sat((tt-(OT-.16))/.16)); ob.r=(36+68*u*u)*(1-.74*c); ob.z=mix(OZ,W.z,c); ob.y=mix(W.y-50,W.y,c); },0);
    after(OT-.03,()=>{ K.flare(x0,W.y,W.z,{pal:PW,s:330,dur:.1,gain:3}); K.flare(x0,W.y,W.z,{pal:PG,s:560,dur:.16,gain:1.6}); GFX.light(x0,y0,900,PG.l,.9,.25,{z:W.z}); Cn.shake(.35); SFX.whoosh(.6,.8);
      Cn.move({x:x0,y:y0-BODY*1.5,zoom:.64,tilt:.12},.36,'out'); GFX.ambient(.72,.42,.34,.9); K.dust(x0,y0,{n:10,r:80,sp:[300,800],a:.4});
      for(const sd of [-1,1]){ const a=-PI/2+sd*30*PI/180; K.sparks(x0,W.y,W.z,{pal:PG,n:14,dir:a,spread:.22,sp:[1400,3600],up:1500,life:[.2,.5]}); } }); }
  after(.3,()=>{ K.flare(x0,y0,BODY*.7,{pal:PB,s:300,dur:.22,gain:2.6}); K.flare(x0,y0,BODY*.7,{pal:PB,s:120,dur:.3,gain:3}); GFX.light(x0,y0,700,PB.l,.9,.3,{z:BODY*.7}); Cn.SND.shing(1.3,.35); });
  for(let i=0;i<70;i++) after(.05+i*.0105,()=>{ const a=-PI/2+(hash1(i*1.3)-.5)*4.4, d=520+hash1(i)*900; GFX.pt({x:x0+Math.cos(a)*d,y:W.y+Math.sin(a)*d*FSY,z:40+hash1(i+50)*620,vx:-Math.cos(a)*1500,vy:-Math.sin(a)*1500*FSY,drag:2,tx:x0,ty:W.y-50,tz:BODY*1.5,pull:3.4+hash1(i+9)*1.6,life:.5+hash1(i+3)*.25,s:3+hash1(i+7)*2.5,m:3,len:.1,c:GFX.rgb(i%3?PF.m:PG.m),c3:PF.m,c2:PD.b,L:3}); });
  // what a wing does to a body it passes in the turn: alight (one more stack), struck, lifted off its feet and thrown on round and outward
  const wingHit=(e,th)=>{ K.mark(e,'burn',{dur:4.5,max:3,pal:PM,s:.48}); dmg(e,tick(e),{kb:0}); if(e.dead) return; const h=hash1(e.x*.37+e.y*.11), ph=fdir(e.x-x0,e.y-W.y);
    if(t-W.eh>.08){ W.eh=t; K.ehit(e,{pal:PG,pw:1.1,dir:th+PI/2}); } else if(eh++<3) sear(e,th+PI/2,1.2); else hitFx(e,C1,.9);
    fling(e,ph+.95,430+330*h,300+320*hash1(h*57),.3+.08*h); };
  // ---- one clock for everything that moves
  V.ultTick=dt=>{ t+=dt; W.t=t; eh=0; W.hot=sat(t/TL)*.8;
    for(const q of W.fly){ const e=q.e; if(q.done){ if(q.ps.length&&(q.dt+=dt)>.016){ q.dt=0; q.ps.shift(); } continue; } if(e.dead){ q.done=true; continue; } const u=sat((t-q.t0)/q.T), eo=1-(1-u)*(1-u);
      e.x=q.x+q.ux*q.D*eo; e.y=q.y+q.uy*q.D*eo*FSY; e.z=q.z*(1-u)+q.ap*4*u*(1-u); e.vz=3000*dt+.01; e.kx=e.ky=0; e.stun=Math.max(e.stun,.5);
      q.ps.push({x:e.x,y:e.y,z:e.z+e.h*.5}); if(q.ps.length>12) q.ps.shift();
      if(u>=1){ q.done=true; e.z=0; e.vz=0; K.dust(e.x,e.y,{n:3,dir:Math.atan2(q.uy,q.ux),spread:.5,sp:[200,520],a:.4,s:.9,life:.6}); } }
    if(W.fly.length>40) W.fly=W.fly.filter(q=>!q.done||q.ps.length);
    if(t<T1) return;
    if(!W.gone){ const k=sat((t-T1)/(TL-T1)), ks=smo(sat((t-WS1+.2)/.2))*(1-smo(sat((t-WS1)/.3))), kt=smo(sat((t-WR0)/.25))*(1-smo(sat((t-WR1)/.2))), kh=smo(sat((t-WR1)/.25)), kc=sat((t-WH)/(WCL-WH)), ku=smo(sat((t-WU0)/.45));
      W.col=Math.min(2.9,.4+.5*ku+.3*smo(sat((t-WS1)/.3))+.3*smo(sat((t-WR0)/.4))+.3*kh+.9*kc*kc+.35*ks); W.heat=1+.1*k+.12*ks+.1*kt+.3*kc*kc; W.gain=.52+.06*k+.06*ks+.14*kc*kc;
      W.qg=.8+.4*k+.4*ks+.6*kc*kc; W.rk=1+.14*ku+.12*kh; W.flow=2.5*ks+2*kt+4*kc*kc;
      Lt.r=mix(500,hw*1.3,k); Lt.a=mix(.35,1,k); Lt.c=mc(PD.l,PG.l,k);
      // the turn: each wing strikes what its leading edge passes
      if(t>WR0&&t<WR1+.05){ if(!TS){ TS=onScreen(300); for(const e of TS) e._wd=[null,null]; } const q=wpose(t);
        for(let s=0;s<2;s++){ const th=-PI/2+q.rot+(s?1:-1)*q.a; for(const e of TS){ if(e.dead) continue; const ph=fdir(e.x-x0,e.y-W.y), d=Math.atan2(Math.sin(th-ph),Math.cos(th-ph)), pv=e._wd[s]; e._wd[s]=d; if(pv!=null&&pv<0&&d>=0&&pv>-1.2) wingHit(e,th); } }
        // fire torn off the wing tips, thrown on along the turn
        const want=Math.floor((t-WR0)*90*(GFX.QK||1)); let n=0; while(sn<want&&n++<8){ sn++; const sd=sn%2?1:-1, f=wfe(W,sd,sn%3,t), p=wpt(W,f,.45+.3*hash1(sn*1.7)), v=1200+1400*hash1(sn*3.3), ta=f.dir+PI/2-.5;
          GFX.pt({x:p.x,y:p.y,z:p.z+40,vx:Math.cos(ta)*v,vy:Math.sin(ta)*v*FSY,vz:200+500*hash1(sn*5.1),g:700,drag:1.4,life:.35+.3*hash1(sn*2.3),s:sn%4?5:8,m:3,len:.1,c:GFX.rgb(sn%3?PG.m:PG.h),c3:PG.h,c2:PF.b,L:3}); } }
      // feathers of fire coming down over the field (their number follows the clock, not the frame rate; none while it holds its breath)
      const tt=Math.min(t,WR1)-1.2, want=tt>0?Math.floor((8*tt+6*tt*tt)*(GFX.QK||1)):0; let n=0;
      while(fn<want&&n++<6){ fn++; const px=x0+(hash1(fn*1.37)-.5)*hw*2.4, py=y0+(hash1(fn*2.11)-.5)*hh*2.4, hot=fn%4===0;
        GFX.pt({x:px,y:py,z:500+hash1(fn*5.1)*700,vx:(hash1(fn*2.7)-.5)*420,vy:60,vz:-(280+hash1(fn*8.3)*240),g:0,drag:.3,life:1.3+hash1(fn*3.1)*.8,s:hot?7:5,m:3,len:.3,c:GFX.rgb(hot?PG.m:PF.s),c3:hot?PG.h:PF.m,c2:PD.b,fade:'in',L:3}); } }
    else { const td=t-W.gone, f=sat(td/.3), wf=1-sat(td/.07); W.tail=-.3+1.4*f; W.al=1-Math.pow(sat((f-.5)/.5),2); W.col=Math.max(1.2,2.3-td*5,2.9*wf); W.gain=mix(.7,.52,f)+.3*wf; W.qg=1.8+1*wf; W.sha=1-f; if(f>=1) W.dead=true;
      // embers and burning feathers coming down over the whole field, thinning out to the end
      const te=td-.25, want=te>0?Math.floor((56*Math.min(te,1.6)-17*Math.pow(Math.min(te,1.6),2))*(GFX.QK||1)):0; let n=0; while(en<want&&n++<8){ en++; const px=x0+(hash1(en*1.9)-.5)*hw*2.8, py=y0+(hash1(en*4.3)-.5)*hh*2.8, lf=en%3===0;
        GFX.pt({x:px,y:py,z:600+hash1(en*6.1)*800,vx:(hash1(en*2.7)-.5)*(lf?380:160),vy:0,vz:-(260+hash1(en*8.3)*260),g:0,drag:.25,life:1.5+hash1(en*3.1)*.9,s:lf?7:10+hash1(en*9.7)*8,m:lf?3:8,len:.3,c:GFX.rgb(en%3?PF.s:PF.h),c2:PD.b,fade:'in',L:3}); } } };
  // ---- the wings unfold (1.2 - 1.75) and are drawn up (1.75 - 2.1)
  after(WU0,()=>{ Cn.move({y:y0-BODY*.8,zoom:.6,tilt:.16},.9,'io'); SFX.whoosh(.7,.9); Cn.shake(.25); GFX.light(x0,W.y,1300,PF.l,.7,.4,{z:W.z}); });
  after(1.6,()=>{ SFX.whoosh(.5,.6); Cn.SND.inhale(.35,.4); });
  // ---- the strike (2.22): both wings hit the floor. The ground splits along them, fire stands up out of the split from his side outward,
  // and a wave of heat runs out over the whole field: everything on it catches fire and is knocked back; what stood under a wing is thrown
  after(WS1,()=>{ hitstop=Math.max(hitstop,.05); Cn.shake(1); sfx('boom',1.1,.7); SFX.whoosh(.9,.6); GFX.light(x0,y0,hw*1.3,PG.l,.9,.4,{z:120}); const F0=[-1,1].map(sd=>wfe(W,sd,0,WS1));
    F0.forEach((f,si)=>{ const a=wpt(W,f,.07), b=wpt(W,f,.66), c=wpt(W,f,.4);
      K.coolLine(a.x,a.y+24,b.x,b.y+24,{w:125,pal:PF,life:4.3,grow:.16,hot:.6}); K.cool(c.x,c.y+24,{kind:'crack2',r:560,rot:f.dir,pal:PF,life:3.4,grow:.18,light:0});
      for(let i=0;i<4;i++){ const u=.16+.15*i+(hash1(i*3.7+si)-.5)*.05, p=wpt(W,f,u), hs=hash1(i*5.3+si*2); K.vcolumn(p.x,p.y+30+(hs-.5)*90,{r:62+50*hs,h:300+420*hash1(i*9.1+si*4),dur:.5+.2*hs,rise:.08,out:.34,pal:i>2?PG:PF,taper:.55,turb:.8,delay:.03+i*.035}); }
      K.sparks(c.x,c.y,50,{pal:PG,n:14,dir:f.dir,spread:.6,sp:[900,2800],up:1700,life:[.3,.8]}); K.dust(c.x,c.y,{n:10,r:220,sp:[500,1500],a:.42}); K.flare(c.x,c.y,60,{pal:PW,s:300,dur:.07,gain:2.4}); });
    for(let i=0;i<36;i++){ const a=i/36*TAU+hash1(i)*.2, v=3600+hash1(i*3.1)*3200; GFX.pt({x:x0+Math.cos(a)*200,y:y0+Math.sin(a)*200*FSY,z:20+hash1(i*7)*70,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:0,g:0,drag:.3,life:.2+hash1(i*5)*.2,s:5,m:3,len:.07,c:GFX.rgb(i%3?PF.m:PG.m),c2:PD.b,L:3}); }
    K.dust(x0,y0,{n:18,r:160,sp:[1200,3000],a:.34});
    if(F.on){ const kq=K.mats(), CF=col(PF), R1=hw*1.7; GFX.add(.5,k=>{ const r=mix(220,R1,eo3(k)); F.ring(kq.glowG,x0,y0,r*.72,r,{...CF,a:.4*(1-k)*sat(k*10),gain:1.2}); }); }
    let nh=0; const es=onScreen(300).map(e=>[e,Math.hypot(e.x-x0,(e.y-y0)/FSY)]).sort((a,b)=>a[1]-b[1]);
    for(const [e,d] of es){ const ph=fdir(e.x-x0,e.y-W.y), under=d<W.L*.7&&F0.some(f=>Math.abs(Math.atan2(Math.sin(f.dir-ph),Math.cos(f.dir-ph)))<.5), big=under||nh<4; if(big) nh++;
      after(under?0:Math.min(.45,d/6500),()=>{ if(e.dead) return; K.mark(e,'burn',{dur:4.5,max:3,pal:PM,s:.45}); dmg(e,tick(e),{kb:0}); if(e.dead) return;
        if(big&&nh<7) K.ehit(e,{pal:PF,pw:under?1.3:.9,dir:ph}); else hitFx(e,C1,.9);
        if(under) fling(e,ph+(hash1(e.x)-.5)*.8,360+260*hash1(e.y),520+300*hash1(e.x*.3),.42); else K.knock(e,{from:[x0,y0],dist:200,up:800,fx:0}); e.flash=.5; }); } });
  // ---- the turn (2.6 - 3.4): the camera goes out and over him and rolls with the wings
  after(WR0,()=>{ Cn.move({y:y0-BODY*.4,zoom:.55,tilt:.2,roll:.05},WR1-WR0,'io'); SFX.whoosh(1.1,.5); sfx('fire',.6,.5); GFX.ambient(.86,.5,.36,2); });
  after(WR0+.55,()=>{ SFX.whoosh(1.2,.7); Cn.shake(.5); });
  after(WR1-.3,()=>Cn.SND.inhale(.5,.5));
  // ---- breath (3.4 - 3.65): the wings rise wide, as long as they will ever be; the floor goes dark
  after(WR1,()=>{ Cn.hush(TL-WR1); Cn.move({y:y0+BODY*.5,zoom:.6,roll:0},.3,'io'); });
  after(WH,()=>SFX.whoosh(1,.6));
  // ---- the clap (3.77): the wings meet on the floor in front of him. White on the lines where they lie, the game stops on that frame
  // with every body already in the air; a tenth of a second later the wings let go and the wall of fire leaves
  after(TL,()=>{ Lt.hold=0; Lt.life=.2; const FA=[-1,1].map(sd=>[0,1,2].map(j=>wfe(W,sd,j,TL+.1))), mp=wpt(W,FA[0][1],.4), cyf=mp.y;
    Cn.peak(x0,cyf,{ca:.03,blur:.16,tint:'#ff7a2a'}); hitstop=Math.max(hitstop,.12); Cn.shake(1.8); GFX.light(x0,y0,hw*1.7,PG.l,1,.5,{z:300}); Cn.SND.hit(1);
    Cn.move({x:x0,y:y0+BODY*.2,zoom:.5,tilt:.14,roll:.03},.22,'out'); after(.32,()=>Cn.move({zoom:.6,tilt:.18,roll:0},TE-1.2-TL-.32,'io')); GFX.ambient(.95,.62,.45,30); after(.2,()=>GFX.ambient(.52,.38,.36,3));
    K.flare(x0,cyf,200,{pal:PB,s:460,dur:.06,gain:2.4}); K.flare(x0,cyf,120,{pal:PW,s:640,dur:.1,gain:2.4});
    for(const fs of FA){ const p=wpt(W,fs[0],.45); K.flare(p.x,p.y,70,{pal:PW,s:800,dur:.09,gain:3}); K.sparks(p.x,p.y,60,{pal:PG,n:12,dir:fs[0].dir,spread:.5,sp:[900,2800],up:1800,life:[.35,.9]}); }
    // the burns go off: the nearest few with the whole burst, a handful more with a flash, the rest just take the damage (draw budget)
    onScreen(300).filter(e=>K.marked(e,'burn')).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)).forEach((e,i)=>{ const h=K.marked(e,'burn'), n=h.n; if(i<1) h.pop({pw:.8}); else if(i<5) h.pop({quiet:1}); else h.end(); dmg(e,e.d.boss?Dm*.03*n:Math.min(Dm*.03*n,e.hp*.2),{kb:0}); });
    let nh=0; for(const e of onScreen(300)){ if(e.dead) continue; const ph=fdir(e.x-x0,e.y-y0), h=hash1(e.x*.37+e.y*.11); if(e.d.boss){ K.knock(e,{from:[x0,y0],dist:500,up:1800}); continue; }
      if(nh++<3) K.ehit(e,{pal:PG,pw:1.5,dir:ph}); fling(e,ph,900+700*h,520+520*hash1(h*57),.55+.25*h); }
    // ---- release: the wings let go from the root, the wall of fire rolls out, their print is left burning on the floor
    after(TR-TL,()=>{ W.gone=t; Cn.shake(1.2);
      K.vring(x0,y0,{r:hw*1.7,r0:hw*.12,dur:1.05,heat:1.45,pal:PF,tube:.105});
      K.cool(x0,y0-30,{kind:'scorch',r:620,pal:PF,life:3.2,light:0}); K.cool(x0,y0-30,{kind:'crack',r:560,pal:PF,life:3.2,grow:.2,light:0});
      const PR=[], LL=W.L*wlen(TL)*.72;
      for(const sd of [-1,1]) for(let i=0;i<4;i++){ const hs=hash1(i*3.7+sd), a=-PI/2+sd*(90+19*i+(hs-.5)*5)*PI/180, l=LL*(.6+.4*Math.sin(PI*(i+.6)/4.4)), c=Math.cos(a), s=Math.sin(a);
        PR.push({x:x0+c*(150+l*.5),y:W.y+s*(150+l*.5)*FSY,rx:l*.5,ry:270+120*hs,rot:a,c:.02+.2*hash1(i*5.3+sd*2),a,l,sd,i}); }
      wingPrint(PR,TE-TR+.9);
      // low fires in the print, no two alike, each burning down to nothing - shorter and thinner until only sparks are left - the far ones last
      PR.filter(q=>q.i>0).forEach((q,n)=>{ const hs=hash1(q.i*7.7+q.sd*3), u=.3+.5*hash1(q.i*2.9+q.sd), cx=x0+Math.cos(q.a)*(150+q.l*u), cy=W.y+Math.sin(q.a)*(150+q.l*u)*FSY;
        const r0=70+90*hs, h0=300+560*hash1(q.i*9.1+q.sd*4), dur=1+1*u+.3*hs, dl=.05+.05*n, c=K.vcolumn(cx,cy,{r:r0,h:h0,dur,rise:.14,out:.25,pal:PF,taper:.55,turb:.8,delay:dl});
        GFX.add(dur,kk=>{ const qq=smo(sat((kk-.2)/.8)); c.h=h0*(1-.9*qq); c.r=r0*(1-.72*qq); },dl);
        after(dl+dur-.25,()=>embers(cx,cy,40,5,50));
        if(q.i!==2) K.vsmoke(cx,cy,{s:240+90*hs,z:140,dur:1.6,rise:620,a:.28,vx:q.sd*140,c:'#241f1d',c2:'#8a7c72',delay:dl+dur*.45}); });
      for(const sd of [-1,1]){ const q=PR[sd<0?1:5]; K.vsmoke(q.x,q.y,{s:560,z:160,dur:2.1,rise:820,a:.34,vx:sd*260,c:'#241f1d',c2:'#8a7c72',delay:.3+(sd>0?.14:0)}); }
      K.sparks(x0,y0,200,{pal:PG,n:14,sp:[700,2600],up:2200,life:[.4,1]}); K.chunks(x0,cyf,{n:5,r:260,sp:[500,1600],up:1900});
      GFX.light(x0,y0+100,1100,PF.l,.5,1.8,{z:60}); });
    after(.05,()=>Cn.shake(1)); after(.2,()=>Cn.shake(.8));
    after(.3,()=>Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3})); });
  // ---- what is left (3.9 - 6): the print cools and breaks up, the fires burn down, smoke drifts off, feathers come down
  const end=()=>{ if(fin) return; fin=true; W.dead=W.done=true; for(const q of W.fly) if(!q.done&&!q.e.dead){ q.e.z=0; q.e.vz=0; } ultStop(); };
  after(TE-1.2,()=>{ Cn.back(1.1); GFX.ambient(1,1,1,2); });
  after(TE,end); }

// GREAT ERUPTION (py_ult3, explosion: one mushroom of fire over a volcano he raises). He puts his hand to the floor. Up the field from him the
// floor bulges and red light leaks from under it; four cracks run from that point out past the edges of the screen and only ever get
// brighter. The rock is driven up out of the floor in five heaves, each one sending a shock over the field, and where the shock crosses a
// crack the crack blows open along its length: walls of fire stand on the cracks, more of them with every heave, until the field is burning.
// The field holds its breath. The cone bursts: a stem of fire with a head rolling open on it (all of it inside the screen), surges of fire
// tumble out over the floor in every direction, each a different size and reach, the rock of the cone comes down in pieces that bounce and
// lie burning, everything on the field is thrown outward trailing fire - and then the bombs it threw come down all over the field.
// What stays: the mushroom turning to smoke and breaking up, a crater, thrown rock, cracks and lava cooling to black, ash.
// (This block stands on its own: it uses nothing from the other two ultimates.)
const VQ3=window.VOL, e3h=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); }, e3c=h=>typeof h==='string'?GFX.rgb(h):h, e3x=(a,b,k)=>{ a=e3c(a); b=e3c(b); return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]; }, e3s=k=>k*k*(3-2*k);
const E3B=[[0,-20,800,760,.6,1,.8,1],[-340,70,540,430,2.1,0,.5,1.25],[320,-60,500,400,4.4,2,.5,1.12],[-110,-170,420,520,1.2,2,.5,1.1]], E3T=[1.5,2.2,2.7], E3ROCK='#2c211e';
if(F&&F.on) for(const n of ['v3_gash','v3_fissure','v3_fissure_b']) F.img(n);
let E3M=null;
function e3m(){ if(E3M) return E3M; const m=F.mat, blk={cA:'#000000',cB:'#000000',cC:'#000000',op:1},
    soot=tex=>m({tex,nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,...blk,layer:'g'}),
    bed=tex=>m({tex,nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'});
  E3M={gS:soot('v3_gash'),gB:bed('v3_gash'),fS:soot('v3_fissure'),fB:bed('v3_fissure'),gl:m({pm:[3,1.6,0,0],nk:0,ero:0,soft:.6,rk:[.6,1],gain:1.2,layer:'g'})}; return E3M; }
// the four cracks: each a wandering line of four runs from the foot of the mound out past the edge of the screen, with one fork off it
function e3Line(x,y,a0,d0,len,n,w0,w1,sd,g0,uv){ const p=[{x:x+Math.cos(a0)*d0,y:y+Math.sin(a0)*d0*FSY}], sl=[], rot=[], w=[], step=(len-d0)/n; let a=a0;
  for(let j=0;j<n;j++){ const q=p[j]; a=a0+(e3h(sd*7.3+j*3.1)-.5)*.62+(j&1?.1:-.1); p.push({x:q.x+Math.cos(a)*step,y:q.y+Math.sin(a)*step*FSY}); sl.push(step); rot.push(a); w.push(mix(w0,w1,j/Math.max(1,n-1))); }
  return {p,sl,rot,w,n,a:a0,g0,uv}; }
function e3Branches(Px,Py,Lb){ const out=[]; [[12,1],[118,.9],[205,1.05],[-58,.8]].forEach(([deg,lk],i)=>{ const b=e3Line(Px,Py,deg*PI/180,250,Lb*lk,4,170,84,i+1,0,i&1?[1,-1,0,1]:[1,1,0,0]); out.push(b);
    const q=b.p[2], fa=b.rot[1]+(i&1?-1:1)*(.55+.2*e3h(i*5.1)); out.push(e3Line(q.x,q.y,fa,0,Lb*lk*.3,2,96,60,i+11,.5,i&1?[1,1,0,0]:[1,-1,0,1])); }); return out; }
// a point a fraction u of the way along a crack
function e3At(b,u){ const s=Math.min(b.n-.001,u*b.n), j=Math.floor(s), f=s-j; return [mix(b.p[j].x,b.p[j+1].x,f),mix(b.p[j].y,b.p[j+1].y,f)]; }
// the cracks and the split floor under the mound, drawn from the state every frame: heating while he gathers (the heat only goes up, and the red
// under the floor beats with the rock's own pulse), white at the burst, then cooling to a dull ember and breaking up from the far ends inward.
// While a crack is still running its head is a point of white-gold light.
function e3Cracks(M,BR){ if(!F.on) return; const m=e3m(), km=K.mats(), CG=col(PG), LIFE=4.5;
  GFX.add(9,()=>{ if(M.dead) return; const td=M.gone?M.t-M.gone:-1, hk=td<0?mix(.94,.16,Math.pow(M.hot,.85)):sat(td/(LIFE*.74)), H=K.heat(PF,hk), H0=H, HP=K.heat(PF,Math.min(hk,mix(.12,.42,sat((M.t-.5)/1.2)))), u=td<0?0:sat((td/LIFE-.45)/.55), eat=.1+.7*Math.pow(u,1.4), end=.02+.46*u*u, a=Math.min(1,(1-hk)*3.2), a0=a, ce=Math.min(.49,end+.06+.2*hk), fi=eo3(sat((M.t-.2)/.7)), fr=560*(.35+.65*fi)*(1+.3*M.up), beat=.6+.55*M.pu;
    if(fi>0&&td<0){ F.quad(m.fS,M.x,M.y,fr*1.04,fr*1.04,.7,{a:.8*sat((M.t-.2)/.3),ero:.1,rv:[1.1,.2,0,.1]});
      F.quad(m.gl,M.x,M.y,fr*1.9,fr*1.9,.7,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:Math.min(1,(.5+.5*M.hot)*beat*fi),gain:1.5*H.g*beat,rv:[1.1,.5,0,.3]});
      F.quad(m.gl,M.hx,M.hy-20,300*M.gp,300*M.gp,0,{cA:HP.cA,cB:HP.cB,cM:HP.cM,cC:HP.cM,a:.8*M.gp*beat,gain:1.4*HP.g});
      F.quad(m.fB,M.x,M.y,fr,fr,.7,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(.45+M.hot)*fi),gain:2.7*H.g*beat,bgain:1.2*H.g,ero:.08+.4*hk*hk,rv:[1.05,.3,0,.1]}); }
    for(const b of BR) for(let j=0;j<b.n;j++){ const part=sat((b.pre?M.gp:sat((M.g-b.g0)/(1-b.g0)))*b.n-j); if(part<=0) break; const p=b.p[j], q=b.p[j+1], ex=mix(p.x,q.x,part), ey=mix(p.y,q.y,part), cx=(p.x+ex)/2, cy=(p.y+ey)/2, hl=b.sl[j]*part*.56, w=b.w[j], rot=b.rot[j], H=b.pre&&td<0?HP:H0, a=b.pre&&td<0?1:a0;
      if(!b.g0&&j<3&&!(b.pre&&td>=0)) F.quad(m.gS,cx,cy,hl*1.04,w*1.5,rot,{a:.85,ero:eat,fd:[end,end,0,0]});
      if(hk<1){ if(!F.low&&!b.g0&&j<2&&!(b.pre&&td>=0)) F.quad(m.gl,cx,cy,hl*1.05,w*2.3,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.5*a*(b.pre&&td<0?.8:1-hk),gain:H.g});
        F.quad(m.gB,cx,cy,hl,w,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a,gain:2.9*H.g,bgain:1.2*H.g,ero:.08+.5*hk*hk+eat*.5,uvT:b.uv,fd:[ce,ce,0,0]}); }
      if(td<0&&part<1&&!b.g0)F.quad(km.glowG,ex,ey,150,150,0,{...CG,a:1,gain:2.8}); } }); }
// the cone: blocks of rock driven up through the floor with plates of the floor leaning on them - lit solids. Every heave (M.up steps) pushes it
// higher and wider; fire shows only at its foot and in its seams, never as a pattern on its faces; from the fourth heave pieces of it lift
// off and hang shaking over it, smoke stands on its top, and in the last half second it bloats and white light breaks out between the blocks
function e3Mound(M,SL){ if(!F.on||!(F.solids&&F.solids())) return; const km=K.mats(), CG=col(PG), CF=col(PF);
  GFX.add(9,()=>{ if(M.dead) return; const td=M.gone?M.t-M.gone:-1, hot=M.hot, up=M.up, t=M.t;
    if(td<0&&up>0){ const top=620*up*(1+.2*M.sw);
      // smoke standing on the summit, taller with every heave
      if(VQ3&&VQ3.on&&t>1.5){ const q=sat((t-1.5)/(M.T2-1.5)), ez=170+330*q+90*M.sw; VQ3.add('column',M.x-40,M.y-70,top*.8+ez,{ex:330*(.7+.5*q),ey:330*(.7+.5*q),ez,pa:[.46,.16,2.1,2.2],pb:[0,1.1,.95,1],dens:8.5*sat((t-1.5)/.4),gain:1,seed:13.7,smoke:1,fire:1,rim:.3,amb:.2,key:1.05,glow:0,cS:'#0f0b0a',cK:e3x('#4a3c36','#b0602c',q),ord:M.y-6}); }
      for(let i=0;i<E3B.length;i++){ const b=E3B[i], ub=sat(up*b[7]), g=(.3+.7*ub)*(1+.04*M.pu*hot+.14*M.sw), sz=b[3]*(.22+.78*ub)*(1+.05*M.pu*hot+.22*M.sw), q=1-sat(ub/.3), sp=.55+.45*ub,
          jx=M.tr*(Math.sin(t*53+i*2.1)*.6+Math.sin(t*31.7+i*1.3)*.4), jy=M.tr*.5*Math.sin(t*44.3+i*3.7);
        F.solid('boulder',b[5],M.x+b[0]*sp+jx,M.y+b[1]*sp*FSY+jy,sz*(.3-1.25*q*q),{M:F.xf({sx:b[2]*g,sy:b[2]*g,sz,rz:b[4]+.12*M.sw*(i&1?1:-1)}),alb:E3ROCK,emis:e3x(PF.b,PG.h,.8*M.sw),rimC:PG.m,spec:.3,rim:.08+.1*hot,vein:(.04+.2*hot)*(1-M.sw),heat:.05+b[6]*hot*hot*(1.2+1.1*M.pu)+(.7+1.6*b[6])*M.sw,bump:.6,tone:.22,shadow:[.5,.26,.5]}); }
      // pieces lifting off it
      for(let i=0;i<4;i++){ const ts=2.25+i*.2; if(t<ts) continue; const lf=e3s(sat((t-ts)/(M.T2+.2-ts))), a=.4+i*1.05, r=(300+70*e3h(i*3.3))*(1+.15*M.sw), s=46+50*e3h(i*5.9);
        F.solid('boulder',i,M.x+Math.cos(a)*r+M.tr*1.4*Math.sin(t*37+i*2.3),M.y+Math.sin(a)*r*FSY,top*(.35+.25*e3h(i*7.1))+(260+240*e3h(i*2.1))*lf+M.tr*1.2*Math.sin(t*41+i),{M:F.xf({s,rx:t*(1+i*.3),ry:t*.7,rz:i}),alb:E3ROCK,emis:PF.b,rimC:PG.m,spec:.3,rim:.3,vein:.5,heat:.5+.4*M.sw,bump:.6,tone:.22,clip:0}); } }
    for(let i=0;i<SL.length;i++){ const s=SL[i], e=eo3(sat((M.t-s.t0)/.5)); if(e<=0||td>.6) continue; const f=td<0?0:sat(td/.6), fb=td<0?0:sat((td-.2)/.4), ln=mix(mix(s.l0,s.l1,up)-.18*M.sw,s.l2,eo3(f)), d=s.d*(.62+.38*up+.08*M.sw)+s.o*eo3(f), jq=td<0?M.tr*.7:0, x=M.x+s.ca*d+jq*Math.sin(M.t*47+i*1.9), y=M.y+s.sa*d*FSY+jq*.5*Math.sin(M.t*39+i*2.7), ht=td<0?.03+.25*hot*hot*(1+.8*M.pu)+.2*M.sw:.8;
      F.solid(s.k,s.v,x,y,s.s*(e-1)*.9+1000*f*(1-f),{M:F.xfw({s:s.s,rz:s.rz+f*s.sp,rx:s.sa*ln,ry:s.ca*ln}),alb:E3ROCK,emis:PF.b,rimC:PG.m,spec:.4,rim:.14,vein:td<0?(.06+.2*hot)*(1-M.sw):.4,heat:ht,ero:fb*.9,bump:.6,tone:.22,shadow:[s.ca*.7+.3,s.sa*.5+.2,.5*(1-fb)]}); }
    // the fire inside it, seen between the blocks: a glow low in the cone that beats, and at the end shafts of white-gold light breaking out
    if(td<0&&up>.2){ const gk=sat(hot*hot*(.35+.65*M.pu)+M.sw), zc=200*up, w=330*up;
      F.bill(km.glowO,M.x,M.y-30,zc,w*1.3,w*.8,0,{...CF,a:.5*gk,gain:1.5,ord:M.y-30}); } }); }
// a shock running out over the floor: a hard white-gold front with ragged fire behind it and the dust it kicks up. It never stops and never pops -
// it travels to its last frame while it dims. o: {r (how far the front gets), r0, dur, w, sd, dust}. e3RingAt = when the front passes distance d
function e3Wave(x,y,o){ if(!F.on) return; const m=um1(), km=K.mats(), CG=col(PG), dur=o.dur, w=o.w||110, sd=o.sd||1.3, n=o.dust??10, NA=o.na||6; let dn=0;
  GFX.add(dur,k=>{ const e=1-(1-k)*(1-k), r=mix(o.r0||0,o.r,e), f=1-k;
    // the front is broken: arcs of different length, reach and weight with floor between them (never one clean circle)
    for(let i=0;i<NA;i++){ const h=e3h(sd*3.1+i*1.7), a0=sd+(i+.3*e3h(sd+i*4.3))/NA*TAU, a1=a0+TAU/NA*(.9+.5*h), rr=r*(.92+.14*e3h(sd*1.3+i*2.9));
      F.ring(m.wv,x,y,Math.max(0,rr-w*(.8+1*h)),rr,{cA:PF.d,cB:PF.b,cM:PF.m,cC:PF.m,a:.75*f*(.55+.45*h),gain:1.5,t0:sd+i,a0,a1});
      F.ring(km.glowG,x,y,Math.max(0,rr-w*.34),rr,{...CG,a:Math.min(1,f*1.6)*(.25+.5*h),gain:2.2,a0:a0+.1,a1:a1-.1}); }
    const want=Math.floor(k*3.3); while(dn<want&&dn<3){ dn++; for(let i=0;i<n;i++){ const a=sd+i/n*TAU+dn*.4; K.dust(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,{n:1,dir:a,spread:.3,sp:[200,520],a:.34,s:.9,life:.5}); } } },o.delay||0); }
const e3RingAt=(d,o)=>o.dur*(1-Math.sqrt(1-sat((d-(o.r0||0))/(o.r-(o.r0||0)))));
// a flame that burns down: it gets shorter and thinner the whole time it lives and is small when it goes out
const e3Fire=(x,y,r,h,dur,delay,pal)=>after(delay||0,()=>{ const H=K.vcolumn(x,y,{r,h,dur,rise:.14,out:.25,pal:pal||PF,taper:.55,turb:.8}); GFX.add(dur,k=>{ const q=Math.pow(k,1.3); H.h=h*(1-.82*q); H.r=r*(1-.55*q); }); });
// a body thrown through the air burning: it drags fire behind it for as long as it flies
const e3Fling=(e,dur)=>{ let lt=0, lx=e.x, ly=e.y, lz=e.z; GFX.add(dur,(k,t)=>{ if(e.dead) return; const z=e.z+e.h*.5, dt=t-lt; if(dt<.05) return;
    const vx=(e.x-lx)/dt, vy=(e.y-ly)/dt, vz=(e.z-lz)/dt; lt=t; lx=e.x; ly=e.y; lz=e.z; if(Math.hypot(vx,vy,vz)<200) return;
    GFX.pt({x:e.x,y:e.y,z,vx:vx*.1,vy:vy*.1,vz:vz*.1,g:0,drag:2,life:.3,s:70*(1-.5*k),m:8,c:GFX.rgb(PF.b),c2:PD.d,L:3});
    for(let i=0;i<2;i++) GFX.pt({x:e.x+rand(-22,22),y:e.y+rand(-8,8),z:z+rand(-30,30),vx:vx*.3,vy:vy*.3,vz:vz*.3,g:0,drag:3,life:rand(.22,.4),s:rand(16,28)*(1-.4*k),m:3,len:.16,c:GFX.rgb(i?PF.b:PF.m),c3:PF.m,c2:PD.b,L:2}); }); };
// the mushroom, drawn from the state every frame: a thick stem that shoots up once and stays, a head that rolls open on top of it - all of it
// inside the screen. The fire goes out of it from the foot up; the same body goes on as black smoke, leaning away from him and thinning
function e3Mush(M){ return GFX.add(9,()=>{ if(M.dead||!M.gone||!VQ3||!VQ3.on) return; const td=M.t-M.gone, C=K.vc(PF), up=eo3(sat(td/.24)), burn=sat((td-.5)/.8), late=e3s(sat((td-1)/1.4)), fd=sat((td-1.05)/1.1), thin=Math.pow(1-fd,1.8), fh=sat((td-1.2)/1.1), thinH=Math.pow(1-fh,1.8), dy=-300*late, HS=820,
      lift=600*e3s(fd), top=2*HS+140*late, ez=Math.max(60,(top-140*late-lift)/2), zc=top-ez, wide=1+.22*late+.25*fd;
    if(fd>=1&&fh>=1) return;
    if(!F.low&&td>.1) VQ3.add('column',M.x,M.y+dy*.35-40,zc*.92,{ex:300*3.3*(1+.3*late),ey:300*3.3*(1+.3*late),ez:ez*.92,pa:[.46,.16,2.1,2.2],pb:[0,1.1,.95,eo3(sat((td-.1)/.4))],dens:9*sat((td-.1)/.3)*thin,gain:1,seed:13.7,smoke:1,fire:1,rim:.3,amb:.2,key:1.05,glow:0,cS:'#0f0b0a',cK:e3x('#a85a2c','#4a3c36',sat(td/1.4)),ord:M.y-3});
    VQ3.add('column',M.x,M.y+dy*.35,zc,{ex:300*2.2*wide,ey:300*2.2*wide,ez,pa:[.36,.08,2.9,4.2-2.4*burn],pb:[1.18*(1-burn*burn),1.7,.85+.3*burn+.4*fd,up],dens:10.5*thin,gain:1.12,seed:5.3,smoke:mix(.14,1,burn),fire:.5,rim:.3*burn,amb:.2,key:1.15,glow:.5*(1-burn),...C,cS:e3x(PF.d,'#120d0c',burn),cK:burn>.2?'#55443c':C.cK,ord:M.y-2});
    const g=K.eo5(sat(td/.34)), cool=sat(td/1.1), e=sat((td-.1)/2.3), zh=1240*eo3(sat(td/.3))+200*late, sH=780*(1+.16*late);
    VQ3.add('blast',M.x,M.y+dy,zh,{ex:sH*1.25,ey:sH*1.25,ez:sH*.86,pa:[.3+.52*g+.1*e,.5+.16*e,2.3,Math.min(.5,td*.5)],pb:[1.75*(1-cool*cool),.85,1,.3+.6*e],dens:(15-8*e)*thinH,gain:1.4,seed:9.1,smoke:1,fire:.72,...C,cS:'#16100e',cK:e3x('#b8683a','#5a4a42',cool),amb:.2,key:1.2,rim:.32,glow:.7*(1-cool),ord:M.y-1}); }); }
// the surges: bodies of fire tumbling out over the floor from the foot of the burst, every one a different size, speed and reach. Each rolls
// out once, slows, burns down to smoke where it stopped and thins (not a ring: there is floor between them)
function e3Surge(M,LB){ LB.forEach((L,i)=>after(L.dl,()=>{ const a=Math.atan2(L.sa,L.ca), dur=L.T+.3, H=K.vjet(M.x+L.ca*200,M.y+L.sa*200*FSY,80,a,{len:260,r:L.s*.62,r0:150,dur,in:.1,out:.34,pal:PF,heat:1.3,gain:.82,turb:.95,speed:7,pitch:.04+.1*e3h(i*5.7)});
    // the tongue runs out along the floor once (it only gets longer), then lets go of the cone and burns off toward its far end
    GFX.add(dur,(k,t)=>{ H.len=260+L.R*eo3(sat(t/L.T)); });
    const tx=M.x+L.ca*(200+L.R*.92), ty=M.y+L.sa*(200+L.R*.92)*FSY;
    after(L.T*.7,()=>{ K.dust(tx,ty,{n:6,r:L.s*.4,dir:a,spread:.8,sp:[300,800],a:.42}); K.sparks(tx,ty,30,{pal:PF,n:8,dir:a,spread:.7,sp:[300,1000],up:900,life:[.3,.7]}); });
    if(i%2===0) K.vsmoke(tx,ty,{s:L.s*.62,z:40,dur:1.15,rise:280,a:.6,delay:L.T}); })); }
// the rock of the cone coming down: each piece flies an arc dragging sparks, lands (dust, sparks, a kick), bounces once, rolls to a stop and lies
// there with its fire going out; in the last second it crumbles
function e3Rocks(M,RK,life){ if(!F.on||!(F.solids&&F.solids())) return; const pos=(r,t)=>{ if(t<r.T){ const u=t/r.T; return [u,r.z0*(1-u)+4*r.H*u*(1-u)]; } const u2=sat((t-r.T)/.34); return [1+r.b*u2,4*r.H*.09*u2*(1-u2)]; };
  for(const r of RK) after(r.T,()=>{ const x=M.x+r.ca*r.d, y=M.y+r.sa*r.d*FSY; K.dust(x,y,{n:7,r:r.s*.5,sp:[250,700],a:.45}); K.sparks(x,y,20,{pal:PF,n:9,sp:[250,900],up:1300,life:[.3,.7]}); GFX.light(x,y,520,PF.l,.8,.3,{z:60}); Cn3.shake(.22); sfx('boom',.5,.3); if(r.f) e3Fire(x+r.ca*r.d*r.b,y+r.sa*r.d*r.b*FSY-10,50+r.s*.2,220+r.s,1.3+r.s*.004,.34); });
  GFX.add(life,(k,t)=>{ const ero=sat((k-.72)/.28)*.9, hk=sat(t/2.2); for(const r of RK){ const [u,z]=pos(r,t), tt=Math.min(t,r.T+.34), x=M.x+r.ca*r.d*u, y=M.y+r.sa*r.d*u*FSY;
      F.solid('boulder',r.v,x,y,z+r.s*.34,{M:F.xf({s:r.s,rx:r.ax*tt,ry:r.ay*tt,rz:r.v+r.az*tt}),alb:E3ROCK,emis:PF.b,rimC:PG.m,spec:.35,rim:.2,vein:.5*(1-hk),heat:.7*(1-hk),ero,bump:1.2,tone:.22,clip:0,shadow:[.55,.28,.45*(1-ero)]});
      if(t<r.T&&t-r.lt>.035){ r.lt=t; streak(x,y,z+r.s*.3,rand(-120,120),rand(-60,60),rand(-60,160),rand(.25,.5),{s:5,len:.07}); } } }); }
let Cn3=null;
// one bomb thrown out of the head: a burning rock on an arc that stays drawn behind it as a thick line of fire, its shadow closing on the floor.
// f is its size (they are not all the same)
function e3Bomb(M,tx,ty,T,f,vi,land){ const sx=M.x+(e3h(vi*3.1)-.5)*360, sy=M.y, sz=1250, km=K.mats(), s=70*f, N=12, pts=[], pos=k=>[mix(sx,tx,k),mix(sy,ty,k),Math.max(30,sz*(1-k)*(1+1.3*k))];
  for(let i=0;i<=N;i++){ const [x,y,z]=pos(i/N); pts.push({x,y,z}); }
  K.trail(pts,{w:170*f,dur:T+.34,pal:PF,draw:T,hold:.06,gain:.7});
  const orb=K.vorb(sx,sy,sz,{r:s*1.55,pal:PG,dur:T+.02,in:.05,out:.02,spin:6,core:.42,heat:.9,gain:.9}), Lt=GFX.light(tx,ty,320,PF.l,.1,.1,{hold:T,z:60});
  GFX.add(T,(k,t)=>{ const [x,y,z]=pos(k), q=k*k*k; orb.x=x; orb.y=y; orb.z=z; Lt.a=.1+.9*q; Lt.r=(260+340*q)*f; if(!F.on) return;
    if(k>.35) F.quad(km.dark,mix(x,tx,.5),mix(y,ty,.5),mix(190,80,q)*f,mix(190,80,q)*f*.8,0,{a:.5*q}); });
  after(T,()=>{ orb.dead=true; Lt.hold=0; land(); }); }
function ultErupt(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, Px=x0, Py=y0-Math.max(560,hh*.3), T1=.9, T2=3.2, TC=3.45, TE=6.4; Cn3=Cn;
  S([['gy01',.1],['gy02',.15],['gy03',TC-.3,{kick:[-.8,.6]}],['gy07',.05,{kick:[-1.4,1]}],['gy11',.14,{kick:[1.8,-1.4]}],['gy12',.5],['gy14',9]]);
  const M={x:Px,y:Py,t:0,hot:0,g:0,gp:0,up:0,pu:0,sw:0,tr:0,hs:0,T2,hx:x0,hy:y0,gone:0,dead:false}, BR=e3Branches(Px,Py,hw*1.5); let t=0, pn=0, an=0, fn=0;
  { const b=e3Line(x0,y0,-PI/2,70,(y0-Py)/FSY-150,3,84,120,31,0,[1,1,0,0]); b.pre=1; BR.push(b); }
  const SL=[0,1,2,3,4,5].map(i=>{ const a=.4+i/6*TAU+(e3h(i*4.1)-.5)*.4; return {k:'plate',ca:Math.cos(a),sa:Math.sin(a),d:500+90*e3h(i*2.3),o:560+300*e3h(i*6.7),s:220+160*e3h(i*5.7),v:i%4,rz:a+PI/2,l0:-1.05,l1:-.62-.2*e3h(i*3.3),l2:1.05,sp:(e3h(i*7.7)-.5)*5,t0:.95+i*.2}; });
  // where the cracks blow open, and on which heave: [crack, from, to (fractions of its length, inside one straight run), heave]
  const FIS=[[0,.28,.48,0],[2,.28,.48,1],[4,.3,.49,1],[6,.28,.48,2],[0,.54,.74,2],[4,.54,.74,2]];
  // the surges of the burst (none aimed at him: he is straight down the field) and the rock that comes down
  const LB=[-36,10,58,122,151,198,240,301].map((deg,i)=>{ const a=deg*PI/180, h=e3h(i*3.9+2), near=deg>40&&deg<140; return {ca:Math.cos(a),sa:Math.sin(a),R:near?hw*.45:hw*(.5+1.15*h),s:near?320:340+360*e3h(i*6.3),T:.4+.5*e3h(i*2.1),dl:.16*e3h(i*8.7),sd:3.1+i*1.7}; });
  const RK=[-40,8,150,190,236,300].map((deg,i)=>{ const a=deg*PI/180+(e3h(i*2.7)-.5)*.2; return {ca:Math.cos(a),sa:Math.sin(a),d:hw*(.5+.75*e3h(i*4.3+1)),T:.62+.5*e3h(i*5.1),H:1000+900*e3h(i*3.3),z0:300,b:.1+.08*e3h(i*7.3),s:140+150*e3h(i*6.1),v:i%4,ax:(e3h(i*1.3)-.5)*14,ay:(e3h(i*2.9)-.5)*14,az:(e3h(i*4.9)-.5)*8,f:i%3===0,lt:0}; });
  let SJ=null;
  // ---- prepare (0 - .9): close on him, the air turns cold blue; the floor up the field bulges, splits, and red light beats under it
  GFX.ambient(.4,.4,.58,4); Cn.move({x:x0,y:(y0+Py)/2-BODY*.3,zoom:1.18,tilt:.1},.7,'io'); SFX.fire(3,.45); Cn.drone(38,.34);
  const Lt=GFX.light(Px,Py,700,PD.l,.6,.3,{hold:TC,z:140,flick:.08});
  e3Cracks(M,BR); e3Mound(M,SL); e3Mush(M);
  after(.3,()=>{ K.flare(x0,y0,BODY*.7,{pal:PB,s:300,dur:.22,gain:2.6}); K.flare(x0,y0,BODY*.7,{pal:PB,s:120,dur:.3,gain:3}); GFX.light(x0,y0,700,PB.l,.9,.3,{z:BODY*.7}); Cn.SND.shing(1.3,.35);
    GFX.light(x0,y0-150,620,PF.l,.8,.5,{z:40}); K.dust(x0,y0-30,{n:8,r:40,sp:[200,600],a:.4}); K.sparks(x0,y0-40,10,{pal:PF,n:10,dir:-PI/2,spread:.5,sp:[300,1100],up:700,life:[.25,.6]}); Cn.shake(.25); sfx('boom',.5,.35); });
  // the floor over the swelling rock breaks up: dirt and chips thrown off it, a little more each time
  [.3,.52,.72].forEach((tb,i)=>after(tb,()=>{ K.dust(Px,Py,{n:6+3*i,r:160+60*i,sp:[150,480+80*i],a:.42}); K.chunks(Px,Py,{n:2,r:140+50*i,sp:[120,420],up:700+150*i,s:[16,32],rock:E3ROCK,pal:PF,life:.8}); K.sparks(Px,Py,20,{pal:PF,n:5+3*i,sp:[150,600],up:900+200*i,life:[.3,.6]}); Cn.shake(.12+.05*i); }));
  // ---- one clock for everything that grows
  const J=tv=>eo3(sat((t-tv)/.16));
  V.ultTick=dt=>{ t+=dt; M.t=t; M.gp=eo3(sat((t-.32)/.5)); if(!M.gone){ M.hot=Math.pow(sat(t/T2),1.25); const k=sat((t-T1)/1.75); M.g=1-(1-k)*(1-k);
      // the cone: it is driven up in heaves (a first one as the cracks start, one with every shock), creeping between them, bloating at the end
      M.sw=Math.pow(sat((t-(T2-.6))/.6),2); M.up=sat(.13*e3s(sat((t-.2)/.65))+.15*J(T1)+.17*J(E3T[0])+.2*J(E3T[1])+.22*J(E3T[2])+.07*sat((t-T1)/(T2-T1))+.06*M.sw);
      // the beat under the floor quickens (about one a second -> four a second); while the field holds its breath it stops shaking and stays lit
      const tq=Math.max(0,Math.min(t,T2)-.3), hs=sat((t-T2)/.1); M.hs=hs; M.pu=Math.max(Math.pow(.5-.5*Math.cos(TAU*(1.1*tq+.5*tq*tq)),1.5),hs); M.tr=30*sat((t-1)/1.6)*(.35+.65*M.hot)*(1+.8*M.sw)*(1-hs);
      Lt.r=mix(700,hw*1.3,M.hot); Lt.a=mix(.6,1,M.hot)*(.7+.3*M.pu); Lt.c=e3x(PD.l,PF.l,M.hot);
      // fire gets out of the top of it after the second shock: one jet, only ever taller and wider
      if(t>=E3T[1]){ if(!SJ) SJ=K.vcolumn(Px,Py-30*FSY,{r:60,h:300,dur:TC-E3T[1]+.4,rise:.25,out:.1,pal:PG,twist:2.2,turb:.9,taper:.45,heat:1.4,ord:Py-4});
        const q=sat((t-E3T[1])/(T2-E3T[1])), zs=560*M.up; SJ.h=zs+(350+900*q)*(1+.15*M.sw); SJ.r=70+90*q; SJ.x=Px+M.tr*.6*Math.sin(t*41); }
      // embers lifting off the hot floor all over the field, and sparks spat out of the cracks, more as they heat (their number follows the clock,
      // not the frame rate; none while the field holds its breath)
      const wf=Math.floor(Math.min(t,T2)*(8+7*Math.min(t,T2))*(GFX.QK||1)); let n=0;
      while(fn<wf&&n++<4){ fn++; GFX.pt({x:Px+(e3h(fn*1.9)-.5)*hw*2.8,y:Py-hh*.7+e3h(fn*4.3)*hh*2.3,z:4,vx:(e3h(fn*2.7)-.5)*70,vy:0,vz:140+e3h(fn*8.3)*420,g:-40,drag:.3,life:.8+e3h(fn*3.1)*.9,s:3+e3h(fn*9.7)*3.5,m:8,c:GFX.rgb(fn%3?PF.m:PG.m),c2:PD.b,fade:'in',L:3}); }
      const tt=Math.min(t,T2)-T1, want=tt>0?Math.floor((10*tt+9*tt*tt)*(GFX.QK||1)):0; n=0;
      while(pn<want&&n++<6){ pn++; const b=BR[(pn%4)*2], lead=pn%3===0&&M.g<.98, [px,py]=e3At(b,lead?M.g:e3h(pn*1.37)*M.g), hot=pn%4===0;
        GFX.pt({x:px+(e3h(pn*2.9)-.5)*90,y:py+(e3h(pn*4.7)-.5)*50,z:6,vx:(e3h(pn*6.1)-.5)*260,vy:(e3h(pn*7.7)-.5)*120,vz:500+e3h(pn*3.3)*900,g:900,drag:.5,life:.5+e3h(pn*9.1)*.5,s:hot?6:4,m:3,len:.06,c:GFX.rgb(hot?PG.m:PF.m),c3:hot?PG.h:PF.m,c2:PD.b,L:3}); } }
    else { const te=t-M.gone-.45, want=te>0&&te<2.1?Math.floor(52*te*(GFX.QK||1)):0; let n=0;
      // ash and embers coming down over the whole field
      while(an<want&&n++<8){ an++; const px=Px+(e3h(an*1.9)-.5)*hw*2.4, py=Py-hh*.9+e3h(an*4.3)*hh*2.3, ash=an%3!==0;
        if(ash) GFX.pt({x:px,y:py,z:500+e3h(an*6.1)*700,vx:-60+(e3h(an*2.7)-.5)*140,vy:-30,vz:-(170+e3h(an*8.3)*170),g:0,drag:.2,life:1.7+e3h(an*3.1)*.8,s:5+e3h(an*9.7)*6,rot:e3h(an*5.3)*TAU,vr:(e3h(an*7.9)-.5)*6,m:11,b:'alpha',c:GFX.rgb('#3a3436'),c2:'#0c0a0c',fk:4,L:1});
        else GFX.pt({x:px,y:py,z:600+e3h(an*6.1)*800,vx:(e3h(an*2.7)-.5)*160,vy:0,vz:-(280+e3h(an*8.3)*260),g:0,drag:.25,life:1.5+e3h(an*3.1)*.9,s:6+e3h(an*9.7)*5,m:8,c:GFX.rgb(an%2?PF.s:PF.h),fade:'in',L:3}); } } };
  // one heave of the cone: the rock is slammed up from below (a flash at its foot, stone and dirt thrown off it, the camera kicked) and the shock
  // of it runs out over the whole field. i = how hard (0..3)
  const heave=(i,WO)=>{ K.flare(Px,Py+40,160+60*i,{pal:PG,s:320+110*i,dur:.1,gain:2.4}); GFX.light(Px,Py,1000+260*i,PG.l,1,.3,{z:300});
    K.chunks(Px,Py,{n:3,r:330+40*i,sp:[300,900],up:1250+260*i,s:[26,60],rock:E3ROCK,pal:PF,life:.9}); K.debris(Px,Py,{n:6+2*i,r:300,sp:[300,900],up:1400+200*i,size0:8,size:20}); K.dust(Px,Py,{n:12,r:400,sp:[300,900],a:.42}); K.sparks(Px,Py-40,260+140*i,{pal:PG,n:12+5*i,sp:[300,1000],up:1800+320*i,life:[.4,.9]});
    Cn.shake(.36+.14*i); hitstop=Math.max(hitstop,.035); sfx('boom',.8+.25*i,.45+.12*i); e3Wave(Px,Py,WO); };
  // a crack blowing open along its length: a wall of fire stands on it and stays (it burns until the burst), a spout goes up out of the middle of
  // it, lava is thrown and pools at its foot, and whoever stood on the crack goes up with it, burning
  const fissure=(b,u0,u1,i,dl)=>after(dl,()=>{ if(M.gone) return; const [ax,ay]=e3At(b,u0), [bx,by]=e3At(b,u1), [cx,cy]=e3At(b,(u0+u1)/2), h=[520,700,880][i]*(.85+.3*e3h(u0*9+i)), left=Math.max(.3,TC-t); 
    // three fires in a row on the crack, lit one after another along it, each a different height; they only ever grow
    [[.14,.7],[.5,1.3],[.84,.95]].forEach(([u,hk],j)=>after(j*.07,()=>{ if(M.gone) return; const fx=mix(ax,bx,u), fy=mix(ay,by,u), h0=h*hk, lf=Math.max(.3,TC-t), Hc=K.vcolumn(fx,fy,{r:105+30*hk+12*i,h:h0,dur:lf+.3,rise:.16,out:.3,pal:PF,twist:3,turb:1.15,taper:.62,heat:1.1,gain:.8}); GFX.add(lf+.3,k=>{ Hc.h=h0*(1+.3*k); }); }));
    K.flare(cx,cy,80,{pal:PG,s:200+50*i,dur:.12,gain:2.3});
    K.cool(cx,cy,{kind:'lava',r:230+40*i,rot:b.rot[1],pal:PF,life:left+.2,hot:.95,light:0}); GFX.light(cx,cy,820+160*i,PF.l,1,.3,{hold:left,z:240,flick:.2});
    K.sparks(cx,cy,30,{pal:PG,n:14+4*i,sp:[300,1000],up:2000+300*i,life:[.35,.9]}); K.debris(cx,cy,{n:9,r:100,sp:[250,800],up:1500,size0:8,size:20}); K.dust(cx,cy,{n:8,r:160,sp:[300,800],a:.42});
    for(let j=0;j<9;j++){ const u=e3h(j*3.7+i), lx=mix(ax,bx,u), ly=mix(ay,by,u); GFX.pt({x:lx,y:ly,z:20,vx:(e3h(j*5.1+i)-.5)*900,vy:(e3h(j*6.7+i)-.5)*420,vz:900+e3h(j*2.3+i)*1300,g:2600,drag:.2,life:.7+e3h(j*8.1)*.5,s:8+e3h(j*4.4)*7,m:8,c:GFX.rgb(j%2?PG.m:PF.b),c2:PD.b,L:3}); }
    sfx('fire',.6,.45); Cn.shake(.2+.08*i);
    inLine(ax,ay,bx,by,280,e=>{ K.knock(e,{from:[cx,cy],dist:200,up:1750,fx:0}); e3Fling(e,.7); }); });
  // ---- gather (.9 - 3.2): the camera pulls back and up the field, leaning; the cracks run out; the cone is heaved up
  after(T1,()=>{ Cn.move({x:Px,y:Py-120,zoom:.7,tilt:.24,roll:-.03},T2-T1,'lin'); GFX.ambient(.74,.36,.3,.7); SFX.whoosh(.5,.7); heave(0,{r:hw*.9,r0:300,dur:.4,sd:2.2,dust:8}); });
  // each plate of the floor that is levered up throws its own dirt
  SL.forEach(s=>after(s.t0+.05,()=>{ const px=Px+s.ca*s.d*.7, py=Py+s.sa*s.d*.7*FSY; K.dust(px,py,{n:4,r:60,sp:[150,480],a:.4}); K.chunks(px,py,{n:2,r:50,sp:[150,420],up:800,s:[14,28],rock:E3ROCK,pal:PF,life:.9}); }));
  // three shocks, each harder: the hit travels with the shock - each body is struck as the front passes under it (never the whole field in one
  // frame) and hops off the floor in its own dust; the cracks the front crosses blow open
  E3T.forEach((tv,i)=>after(tv,()=>{ const WO={r:hw*1.75,r0:360,dur:.55,sd:4.1+i*2.3}; heave(i+1,WO);
    for(const f of FIS) if(f[3]===i){ const b=BR[f[0]], [cx,cy]=e3At(b,(f[1]+f[2])/2); fissure(b,f[1],f[2],i,e3RingAt(Math.hypot(cx-Px,(cy-Py)/FSY),WO)); }
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-Px,(e.y-Py)/FSY);
      after(e3RingAt(d,WO),()=>{ if(e.dead) return; dmg(e,e.d.boss?Dm*.04:Math.min(Dm*.04,e.hp*.12),{kb:0,sx:Px,sy:Py}); K.knock(e,{from:[Px,Py],dist:70+40*i,up:640+170*i,stun:.15,fx:0}); K.dust(e.x,e.y,{n:2,r:20,sp:[100,320],a:.22,s:.6,life:.35}); e.flash=Math.min(e.flash,.34); }); } }));
  after(2.6,()=>Cn.SND.inhale(.6,.55));
  // the last half second before the breath: it is coming apart - stone flies off it, sparks fountain out of the top, the floor shakes harder each time
  [.52,.32,.14].forEach((b,i)=>after(T2-b,()=>{ K.sparks(Px,Py-40,520+60*i,{pal:PG,n:10+5*i,sp:[200,700+150*i],up:1700+300*i,life:[.4,.9]}); K.debris(Px,Py,{n:5+3*i,r:360,sp:[250,700],up:1300+150*i,size0:8,size:22}); GFX.light(Px,Py,900+200*i,PG.l,.7,.2,{z:300}); Cn.shake(.22+.1*i); sfx('boom',.5+.15*i,.3+.08*i); }));
  // ---- breath (3.2 - 3.45): nothing grows; the floor goes dark, the light in the seams stays
  after(T2,()=>Cn.hush(TC-T2));
  // ---- climax (3.45): the cone bursts
  after(TC,()=>{ M.gone=t; Lt.hold=0; Lt.life=.2; if(SJ) SJ.dead=true;
    Cn.peak(Px,Py-200,{ca:.03,blur:.16,tint:'#ff5a1a'}); hitstop=Math.max(hitstop,.12); Cn.shake(1.8); GFX.light(Px,Py,hw*1.6,PG.l,1,.5,{z:400}); Cn.SND.hit(1); sfx('boom',2.2,1);
    Cn.move({y:Py-430,zoom:.5,tilt:.14,roll:0},.2,'out'); GFX.ambient(.95,.58,.42,30); after(.2,()=>GFX.ambient(.72,.5,.44,3));
    K.flare(Px,Py,300,{pal:PB,s:460,dur:.06,gain:2.4});
    e3Surge(M,LB); e3Rocks(M,RK,TE-TC-.05);
    // lava thrown out over the floor between the cracks, cooling where it fell
    [[-20,1.25,96],[160,1.05,110],[250,.85,84]].forEach(([deg,lk,w],i)=>{ const a=deg*PI/180; K.coolLine(Px+Math.cos(a)*300,Py+Math.sin(a)*300*FSY,Px+Math.cos(a)*hw*lk,Py+Math.sin(a)*hw*lk*FSY,{w,pal:PF,life:3.6,grow:.3,hot:.75,delay:.04*i}); });
    K.cool(Px,Py,{kind:'crater',r:600,pal:PF,life:4.4,light:0}); K.cool(Px,Py,{kind:'crack2',r:980,pal:PF,life:4.4,grow:.2,light:0});
    K.chunks(Px,Py,{n:5,r:300,sp:[500,1800],up:2400,s:[40,84],rock:E3ROCK,pal:PF,life:1.5}); K.sparks(Px,Py,300,{pal:PG,n:20,sp:[700,2600],up:2600,life:[.4,1]}); K.dust(Px,Py,{n:16,r:260,sp:[600,1500],a:.45});
    // every body on the field is thrown outward and up, burning, and drags its fire through the air
    { const L=onScreen(300).sort((a,b)=>Math.hypot(a.x-Px,a.y-Py)-Math.hypot(b.x-Px,b.y-Py)); L.forEach((e,i)=>{ K.knock(e,{from:[Px,Py],dist:620,up:2100,fx:0}); e3Fling(e,.9); if(i<3) K.ehit(e,{pal:PG,dir:Math.atan2((e.y-Py)/FSY,e.x-Px),pw:1.6,ring:0}); }); }
    after(.05,()=>Cn.shake(1)); after(.1,()=>Cn.shake(.8));
    after(.5,()=>Cn.sweep(Px,Py,Dm,{speed:3600,push:1.3,max:.5})); });
  // ---- the bombs (3.7 - 4.4 thrown, down by 5): eight, of four sizes, one into every part of the field
  const KD=['scorch','lava','crack','scorch','crack2','lava','scorch','crack'], BF=[1,1.45,.75,1.2,.8,1.5,1,.7];
  for(let i=0;i<8;i++) after(TC+.25+i*.1,()=>{ const a=.35+((i*3)%8)/8*TAU, d=hw*(.5+.42*e3h(i*3.7+1)), f=BF[i]; let tx=Px+Math.cos(a)*d, ty=Py+Math.sin(a)*d*FSY*1.25, best=null, bd=420;
    for(const e of onScreen(200)){ const q=Math.hypot(e.x-tx,(e.y-ty)/FSY); if(q<bd){ bd=q; best=e; } } if(best){ tx=best.x; ty=best.y; }
    const hd=Math.hypot(tx-x0,(ty-y0)/FSY); if(hd<300){ tx=x0+(tx-x0||1)/(hd||1)*300; ty=y0+(ty-y0)/(hd||1)*300; }
    // every one lands the same way at its own size: one frame of white at the point, a shock snapping out over the floor (three frames), a ball of
    // fire that rolls up into smoke, and a flame left burning down in the hole
    e3Bomb(M,tx,ty,.46+.1*f,f,i,()=>{ K.flare(tx,ty,60,{pal:PB,s:230*f,dur:.06,gain:2.8}); GFX.light(tx,ty,780*f,PG.l,1,.3,{z:120});
      e3Wave(tx,ty,{r:440*f,r0:40,dur:.24,w:72*f,sd:1.7+i,dust:6,na:3});
      K.vblast(tx,ty,{s:210*f,pal:PF,dur:.85,fire:.3,rise:170*f,smoke:.8,lump:.6}); e3Fire(tx,ty,58*f,340*f,Math.min(1.1+.5*e3h(i*2.3),Math.max(.5,TE-t)),.14);
      K.cool(tx,ty,{kind:f<1?'scorch':KD[i],r:(210+80*e3h(i*5.9))*f,ry:(210+80*e3h(i*5.9))*f*(.55+.45*e3h(i*7.3)),rot:e3h(i*9.1)*TAU,pal:PF,life:2.7+.5*e3h(i*1.1),gain:1.3,light:0});
      K.sparks(tx,ty,40,{pal:PG,n:Math.round(10*f),sp:[300,1100],up:1900,life:[.3,.7]}); K.debris(tx,ty,{n:Math.round(7*f),r:50,sp:[260,860],up:1500,size0:8*f,size:20*f}); K.dust(tx,ty,{n:6,r:50,sp:[300,800],a:.4});
      Cn.shake(.3+.14*f); hitstop=Math.max(hitstop,.025); sfx('boom',.6+.2*f,.45);
      inCircle(tx,ty,300,e=>{ const h=K.marked(e,'burn'); if(h) h.pop({quiet:1}); dmg(e,Dm*.0225,{push:280,up:1300,sx:tx,sy:ty}); }); }); });
  // ---- what is left (4.0 - 6.4): fires round the rim of the crater, each a different size, burn down; the mushroom breaks up into smoke that
  // lifts and thins inside the screen; ash comes down
  [.5,1.7,2.9,4.1,5.4].forEach((a,i)=>e3Fire(Px+Math.cos(a)*(470+90*e3h(i*3.1)),Py+Math.sin(a)*(470+90*e3h(i*3.1))*FSY,56+44*e3h(i*5.3),230+300*e3h(i*7.7),1.1+1*e3h(i*2.9),TC+.5+.12*i));
  after(TC+.5,()=>GFX.light(Px,Py,1000,PF.l,.5,2,{z:60}));
  [[-200,-80,640,340,0],[170,-140,900,300,.18],[-20,-200,1150,260,.34]].forEach(([dx,dy,z,s,dl])=>after(TC+1.25+dl,()=>K.vsmoke(Px+dx,Py+dy,{s,z,dur:1.25,rise:300,a:.7,vx:-140})));
  after(TE-1,()=>{ Cn.back(.95); GFX.ambient(1,1,1,2); });
  after(TE,()=>{ M.dead=true; ultStop(); }); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultWings,py_ult3:ultErupt}});
})();
