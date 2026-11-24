// 참광 survival - MAGE skill set (top-down, all automatic). Arcane violet lightning, frost, falling stars. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js). The pieces this class needed and the kit does not have yet are local, below (candidates for the kit).
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inLine,sfx,view,onScreen,ultStart,ultStop,ultHit}=X;
const K=window.K3||{}, F=window.FX3||{}, sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k), mix=(a,b,k)=>a+(b-a)*k;
const C1='#b48cff', C2='#e6d4ff';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const quick=b=>S([['gb04',.04],['gb05',.05],['gb06',.04],['gb07',.08,{kick:[1.6,-1.2]}],['gb09',.08],['gb12',.06]],b);
const raise=()=>S([['gx03',.06],['gx04',.1],['gx06',.22],['gx08',.08,{kick:[1.2,-1]}],['gx10',.2],['gx14',.1]]);

// ---------------------------------------------------------------- palettes (d dark mantle / b body / h hot core / l floor light / s spark)
const ARC={d:'#12043c',b:'#7c48ff',m:'#c9a4ff',h:'#f4eeff',l:'#8c68ff',s:'#cfbcff'},   // arcane lightning: blue-leaning violet
  AZV={d:'#04143c',b:'#2c7cff',m:'#8adcff',h:'#f2fbff',l:'#5c9cff',s:'#bcdcff'},       // its azure twin: the colour of the one bolt that matters
  SIL={d:'#090a1c',b:'#7684d6',m:'#bcc8ff',h:'#eef2ff',l:'#aab4ff',s:'#e0e8ff'},       // moon silver: the circles (so the strikes are not the same hue as the script)
  FRO={d:'#03203c',b:'#30c4ff',m:'#a8f0ff',h:'#f2fdff',l:'#58d0ff',s:'#c8f4ff'},       // frost
  STA={d:'#1a0438',b:'#a644ff',m:'#ffb8e0',h:'#fff2d2',l:'#b070ff',s:'#ffd9a0'},       // star: violet with a gold-white heart
  MET={d:'#2a0630',b:'#ff4a0e',m:'#ffc23a',h:'#fff4d4',l:'#ff7a30',s:'#ffc080'},       // meteor: fire inside a violet-black mantle
  COLM={d:'#04143c',b:'#2a5cff',m:'#7ac4ff',h:'#d8f0ff',l:'#5c9cff',s:'#bcdcff'};      // the judgement column's body: deep azure, its white belongs to the bolts
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
const CIRC=()=>F.ready('v3_circ_mage')?'v3_circ_mage':'fx_circle_arcane';
if(F&&F.on) F.img('crystal');

// ---------------------------------------------------------------- local materials (built once)
let MM=null;
function mm(){ if(MM) return MM; const m=K.mats(), mat=F.mat; MM={m,
  arc:mat({...m.art,tex:'fx3_beam',layer:'o',nz:'streak',n1:[2,1,-4,0],n2:[2,1,-2,0],dist:.05,mdist:1,nk:.3,rk:[.45,.95]}),
  sco:mat({...m.crE,tex:'fx_crack',msk:[.4,.45,.15,0],nk:.3,pw:1.2,rk:[.5,1.05]}),
  glowS:mat({...m.glowG,layer:'o'}),
  core:mat({...m.art,tex:'v3_xburst',layer:'o',rk:[.5,1]}),
  gyro:mat({nz:'streak',n1:[3,.5,-1.6,0],n2:[2,1,-.6,0],dist:.04,nk:.6,ero:.1,soft:.2,pm:[2,1.3,0,0],rk:[.4,.9],gain:2.8,bgain:1.2,layer:'o'}),
  spin:mat({...m.art,tex:'v3_spin_ring',layer:'g',nz:'wisp',n1:[1.5,1.5,.2,.1],nk:.25,rk:[.5,1.05]}),
  hole:mat({...m.dark,layer:'o',pm:[3,.55,0,0]}),
}; return MM; }
// the staff's tip as a world point (x, floor y, height)
const tip=()=>{ const J=pl.j; return J&&J.st?{x:J.st[0],y:pl.gy,z:Math.max(0,pl.gy-J.st[1])}:{x:pl.x+pl.f*30,y:pl.gy,z:BODY*1.9}; };

// ---------------------------------------------------------------- local pieces
// ARC: painted lightning strung between two points in the air {x,y,z}; it is redrawn in a new shape twice before it burns out.
//  o: {w, dur, n, jit (sideways throw as a fraction of its length), pal, gain, delay}
function arc(a,b,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), dur=o.dur||.24, n=o.n||7, jit=o.jit??.14, len=Math.hypot(b.x-a.x,(b.y-b.z)-(a.y-a.z))||1, w=o.w||Math.max(46,len*.075), sd=rand(0,9), sh=[0,1,2].map(()=>{ const s=[]; for(let i=0;i<n;i++) s.push([rand(-1,1),rand(-1,1)]); return s; });
  GFX.add(dur,k=>{ const fr=k<.3?0:k<.6?1:2, J=sh[fr], f=sat((k-.55)/.45), ps=[];
    for(let i=0;i<n;i++){ const u=i/(n-1), e=Math.sin(Math.PI*u), j=len*jit*e; ps.push({x:mix(a.x,b.x,u)+J[i][0]*j,y:mix(a.y,b.y,u),z:Math.max(0,mix(a.z,b.z,u)+J[i][1]*j*.7),w:w*(.5+.5*e)*(1-f*.5)}); }
    F.ribbon(m.arc,ps,{...C,a:(fr===1?.7:1)*(1-f),gain:3.2*(o.gain||1),ero:.08+f*.6,t0:sd}); },o.delay||0); }
// SCORCH: the branching burn lightning leaves on stone; it spreads from the strike and cools. o: {r, life, grow, pal, gain}
function scorch(x,y,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), r=o.r||200, life=o.life||2, rot=rand(0,TAU), g=o.gain||1, grow=o.grow??.1;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/grow)), heat=Math.pow(1-k,1.5);
    F.quad(m.sco,x,y,r,r,rot,{...C,a:Math.min(1,heat*1.5),gain:2.6*g*(.4+.6*heat),ero:.1+.5*(1-heat),rv:[i*1.3,.3,0,.1]}); },o.delay||0); }
// MARK: the reticle that closes on something about to be struck: a ring drawn tight around src {x,y}, light pooling inside it
function mark(src,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), r=o.r||130, dur=o.dur||1, sd=rand(0,TAU);
  GFX.add(dur,(k,t)=>{ if(src.dead) return; const i=eo3(sat(t/.25)), out=sat((dur-t)/.1), rr=r*(2.2-1.2*i), pu=1+.2*Math.sin(t*20+sd);
    F.ring(m.m.shL,src.x,src.y,rr*.84,rr,{...C,a:i*out,gain:2*pu,t0:sd});
    if(o.glow!==0) F.quad(m.m.glowG,src.x,src.y,r*.95,r*.95,0,{...C,a:.5*i*out*pu,gain:1.1}); },o.delay||0); }
// SKY SIGIL: the great circle, but hanging in the air at height z over (x,y), drawn over the field. Handle: {r, a, g (brightness), dead}
function skySigil(x,y,z,o={}){ const h={x,y,z,r:o.r||500,a:1,g:1,eye:0,dead:false}; if(!F.on) return h; const m=mm(), C=col(K.pal(o.pal||ARC)), dur=o.dur||4, tin=o.in??.6, tout=o.out??.4, tex=CIRC(), sp=o.spin??.4,
    ma=F.mat({...m.m.sig,tex,layer:'o'}), mb=F.mat({...m.m.sigN,tex,layer:'o'});
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/tin), out=sat((dur-t)/tout), a=h.a*out, rr=h.r*(.85+.15*eo3(i)), rot=t*sp;
    F.quad(m.m.dark,h.x,h.y,rr*1.05,rr*1.05,0,{a:.42*Math.min(1,a)*i}); F.quad(m.m.glowG,h.x,h.y,rr*.9,rr*.9,0,{...C,a:.2*a*i*h.g,gain:.8,bgain:.6});
    F.quad(m.glowS,h.x,h.y,rr*1.25,rr*1.25,0,{z:h.z,...C,a:.3*a*i*h.g,gain:.7,bgain:.6});
    if(h.eye>0) F.bill(m.m.glowO,h.x,h.y,h.z,rr*.5*h.eye,rr*.3*h.eye,0,{...C,a:Math.min(1,h.eye)*a,gain:2.6});
    F.quad(ma,h.x,h.y,rr,rr,rot,{z:h.z,...C,a:a*.85,gain:2*h.g,rv:[i*1.5,.25,0,.1]});
    F.quad(mb,h.x,h.y,rr,rr,rot,{z:h.z,...C,a:a*(.4+.3*Math.sin(t*6)),gain:2.6*h.g,rv:[i*1.5,.25,0,.1]}); },o.delay||0);
  return h; }
// RING: one cheap ring thrown over the floor (a single draw; K.shock is three) for hits that come in crowds
function ring1(x,y,r,o={}){ if(!F.on) return; const m=mm().m, C=col(K.pal(o.pal||ARC)), dur=o.dur||.28, sd=rand(0,9);
  GFX.add(dur,k=>{ const e=eo3(k), rr=mix(r*.15,r,e), th=r*mix(.28,.1,k); F.ring(m.shL,x,y,rr-th,rr,{...C,a:Math.min(1,(1-k)*(1-k)*1.6),gain:2.4*(o.gain||1),t0:sd}); },o.delay||0); }
// STRIKE: one bolt out of the sky: the painted bolt with real height, the burn it leaves, a small ring thrown over the floor
function strike(x,y,o={}){ const P=K.pal(o.pal||ARC), s=o.s||1, h=o.h||1150*s;
  K.bolt(x,y,{pal:P,h,w:o.w||h*.3,dur:o.dur||.3,crack:0,gain:o.gain||1}); scorch(x,y,{r:(o.r||160)*s,pal:P,life:o.scar||1.8});
  if(o.shock!==0){ ring1(x,y,200*s,{pal:P}); K.dust(x,y,{n:3,r:30,sp:[120,380],a:.35}); } }
// COMET: a painted thing coming down a slanted path onto a floor point: a tail of fire behind it, its shadow closing under it.
//  o: {img, asp, s (half height on landing), s0 (size far away, fraction), h0, dx (how far to the side it starts), dur, ease, tail, spin, rot, pal, tint, big, land()}
function comet(x,y,o={}){ const dur=o.dur||.5; if(!F.on){ if(o.land) after((o.delay||0)+dur,o.land); return; }
  const m=mm(), P=K.pal(o.pal||MET), C=col(P), s=o.s||100, h0=o.h0||1700, dx=o.dx??600, s0=o.s0??.7, sd=rand(0,9), ease=o.ease||(k=>k*k), tl=o.tail??.34, asp=o.asp||1, n=9,
    mt=F.mat({kind:2,tex:o.img||'meteor',nz:'fbm',n1:[2,2,0,0],ero:-1,soft:.01,cB:o.tint||'#ffffff',cC:'#ffffff',gain:o.gain||1.15,op:1});
  const pos=k=>{ const e=ease(sat(k)); return [x+dx*(1-e),h0*(1-e)]; };
  GFX.add(dur,(k,t)=>{ const [px,pz]=pos(k), ss=s*mix(s0,1,k), ps=[], sh=ss*(2.6-k*1.5);
    F.quad(m.m.dark,x,y,sh*1.3,sh*1.3,0,{a:Math.min(o.big?.92:.62,.15+.8*k)});
    F.ring(m.m.shL,x,y,sh*1.14,sh*1.25,{...C,a:.3+.7*k,gain:1.4+k,t0:sd});
    for(let i=0;i<n;i++){ const u=i/(n-1), q=pos(k-(1-u)*tl); ps.push({x:q[0],y,z:q[1]+ss*.35,w:ss*(.12+1.05*u*u)}); }
    F.ribbon(m.m.trB,ps,{...C,gain:2.8,t0:sd,fd:[.75,.01,0,0]}); F.ribbon(m.m.trC,ps,{...C,gain:4.2,t0:sd,fd:[.6,.01,0,0],a:.9});
    if(o.big||s>120) F.bill(m.m.glowO,px,y,pz+ss*.35,ss*1.8,ss*1.8,0,{...C,a:.8,gain:2.2});
    F.bill(mt,px,y,pz+ss*.35,ss*asp,ss,(o.rot||0)+t*(o.spin??3),{});
    if(o.big&&Math.random()<.6) K.sparks(px+rand(-.5,.5)*ss,y,pz+ss*.4,{pal:P,n:2,sp:[200,700],up:300,life:[.3,.7],g:500}); },o.delay||0);
  if(o.land) after((o.delay||0)+dur,o.land); }
// MISSILE: a small arcane comet riding a projectile p: hot head, a short streaked tail along its velocity. Ends when p.fx.life is zeroed.
function missile(p){ const h={life:1,rot:0}; if(!F.on) return h; const m=mm().m, C=col(ARC), sd=rand(0,9); let end=-1;
  const E=GFX.add(1.7,(k,t)=>{ if(h.life<=0&&end<0) end=t; const o=end<0?1:1-sat((t-end)/.07); if(o<=0){ E.dead=true; return; }
    const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, z=p.h||BODY, i=sat(t/.07), ps=[];
    for(let q=0;q<5;q++){ const u=q/4, d=(1-u)*230*i; ps.push({x:p.x-ux*d,y:p.y-uy*d,z,w:(6+28*u)*o}); }
    F.quad(m.glowG,p.x,p.y,95,95,0,{...C,a:.55*o,gain:1});
    F.ribbon(m.trB,ps,{...C,a:o,gain:3,t0:sd,fd:[.7,.02,0,0]}); F.ribbon(m.trC,ps,{...C,a:o,gain:4.5,t0:sd,fd:[.6,.02,0,0]});
    F.bill(m.glowO,p.x,p.y,z,48*i,48*i,0,{...C,a:o,gain:3}); }); return h; }
// ORB: a ball of arcane light held inside two turning rings, pooling its light on the floor under it. o = the orb record of surv.js (x, y, h, life)
function orbFx(o,i,nr=2){ const h={life:1,rot:0}; if(!F.on) return h; const m=mm(), C=col(ARC), sd=i*1.7; let end=-1;
  const E=GFX.add(o.life+.3,(k,t)=>{ if(h.life<=0&&end<0) end=t; const out=end<0?1:1-sat((t-end)/.2), a=sat(t/.25)*out; if(end>=0&&out<=0){ E.dead=true; return; }
    const z=o.h, s=46*(1+.1*Math.sin(t*9+sd));
    F.quad(m.m.glowG,o.x,o.y,125,125,0,{...C,a:.7*a,gain:1.2});
    F.bill(m.m.glowO,o.x,o.y,z,s*1.5,s*1.5,0,{...C,a:.9*a,gain:2.4});
    F.bill(m.core,o.x,o.y,z,s*1.2,s*1.2,t*2+sd,{...C,a,gain:2.2});
    for(let q=0;q<nr;q++) F.lathe(m.gyro,o.x,o.y,z,{r0:s*.95,r1:s*1.32,M:F.xf({rx:1.05+q*.6,ry:(q?-1:1)*.5,rz:t*(q?-3.3:2.6)+sd}),...C,a:a*.9,gain:2.8,t0:sd+q}); });
  return h; }
// WELL: a hole in the floor that drinks the light: a turning painted spiral, rings falling into it, a dark star hanging over it
function well(x,y,R,dur){ const h={life:1}; if(!F.on) return h; const m=mm(), C=col(K.PAL.violet), sd=rand(0,9);
  GFX.add(dur,(k,t)=>{ const i=eo3(sat(t/.3)), out=sat((dur-t)/.12), a=i*out, z=120+12*Math.sin(t*5), hs=R*.16*(1+.08*Math.sin(t*7));
    F.quad(m.m.dark,x,y,R*.8*i,R*.8*i,0,{a:.85*a});
    F.quad(m.spin,x,y,R*1.18*i,R*1.18*i,-t*4.2,{...C,a:a*.9,gain:2.2});
    F.quad(m.spin,x,y,R*.62*i,R*.62*i,-t*7+1,{...C,a:a*.8,gain:2.8});
    for(let q=0;q<2;q++){ const u=(t*1.25+q*.5)%1, r=R*1.2*(1-u*u)+20; F.ring(m.m.shL,x,y,r*.92,r,{...C,a:a*Math.sin(Math.PI*u)*.7,gain:2,t0:sd}); }
    F.bill(m.m.glowO,x,y,z,R*.36,R*.36,0,{...C,a:a*.8,gain:2});
    F.lathe(m.gyro,x,y,z,{r0:R*.2,r1:R*.44,M:F.xf({rx:1.15,ry:.35,rz:t*5}),...C,a:a*.9,gain:2.6,t0:sd});
    F.bill(m.hole,x,y,z,hs,hs,0,{a}); });
  GFX.light(x,y,R*2,K.PAL.violet.l,.8,.4,{hold:dur-.3,z:120,flick:.25}); return h; }
// FIELD: a ward that walks with her (v = the zone's follow point): the circle turning on the floor, a low fence of lightning on its rim
function fieldFx(v,R,dur){ const h={life:1}; if(!F.on) return h; const m=mm(), C=col(ARC), C2_=col(AZV), sd=rand(0,9), ma=F.mat({...m.m.sig,tex:CIRC()}), N=30;
  const E=GFX.add(dur,(k,t)=>{ if(h.life<=0&&t<dur-.3){ E.dead=true; return; } const i=eo3(sat(t/.35)), a=i*sat((dur-t)/.3), rr=R*(.6+.4*i), pts=[];
    F.quad(m.m.glowG,v.x,v.y,rr*1.15,rr*1.15,0,{...C,a:.16*a,gain:.6,bgain:.5});
    F.quad(ma,v.x,v.y,rr,rr,t*.5,{...C,a:a*.5,gain:1.6,rv:[i*1.5,.25,0,.1]});
    F.ring(m.m.shL,v.x,v.y,rr*.95,rr*1.02,{...C,a:a*(.5+.2*Math.sin(t*11)),gain:1.4,t0:sd});
    for(let q=0;q<=N;q++){ const b=q/N*TAU; pts.push({x:v.x+Math.cos(b)*rr,y:v.y+Math.sin(b)*rr*FSY,h:(60+70*Math.abs(Math.sin(b*3+t*3)))*a}); }
    F.wall(m.m.waB,pts,{...C2_,a:a*.85,gain:2.4,uvT:[6,1,t*.5,0],t0:sd}); });
  return h; }
// RAY: the swept beam. ang(t) gives its floor angle; k picks the forward or the backward ray. Handle {life}
function rayFx(ang,k,Lb,dur){ const h={life:1}; if(!F.on) return h; const m=mm(), C=col(ARC), sd=rand(0,9), lt=GFX.light(pl.x,pl.gy,620,ARC.l,.9,.2,{hold:dur,z:120}); let next=0;
  const E=GFX.add(dur,(kk,t)=>{ if(h.life<=0){ lt.hold=0; E.dead=true; return; } const b=ang(t)+k*Math.PI, i=sat(t/.1), f=sat((dur-t)/.12), a=i*f, tp=tip(), x1=pl.x+Math.cos(b)*Lb, y1=pl.gy+Math.sin(b)*Lb, ps=[], n=12, z1=BODY*.5;
    const dx=x1-pl.x, dy=(y1-pl.gy)/FSY, fl=Math.hypot(dx,dy), rot=Math.atan2(dy,dx);
    F.quad(m.m.glowG,(pl.x+x1)/2,(pl.gy+y1)/2,fl*.56,130,rot,{...C,a:.3*a,gain:1,pm:[2,1.2,0,0],fd:[.1,.1,0,0]});
    for(let q=0;q<n;q++){ const u=q/(n-1); ps.push({x:mix(tp.x,x1,u),y:mix(tp.y,y1,u),z:mix(tp.z,z1,u),w:(150+110*u)*(.5+.5*i)*f*(1+.07*Math.sin(t*46+q))}); }
    F.ribbon(m.m.trB,ps,{...C,a:a*.8,gain:2.2,t0:sd,fd:[.04,.03,0,0],pm:[2,2.6,0,0]});
    F.ribbon(m.arc,ps,{...C,a,gain:2.2,ero:.05,t0:sd,n1:[2,1,-6,0]});
    F.bill(m.m.glowO,tp.x,tp.y,tp.z,90,90,0,{...C,a,gain:3}); F.bill(m.core,x1,y1,z1,150,150,t*9,{...C,a,gain:2.4});
    lt.x=mix(pl.x,x1,.6); lt.y=mix(pl.gy,y1,.6);
    if(t>=next){ next=t+.13; const u=rand(.35,1), sx=mix(pl.x,x1,u), sy=mix(pl.gy,y1,u); K.sparks(x1,y1,z1,{pal:ARC,n:3,sp:[300,900],up:500,life:[.15,.35]}); scorch(sx,sy,{r:120,life:.9,gain:.9}); K.dust(x1,y1,{n:1,dir:b,spread:1,sp:[150,400],a:.3,s:.8}); } });
  return h; }

const sk={
  mg_basic:{cls:'mage',type:'basic',name:'매직 볼트',lv:1,desc:'가장 가까운 적에게 휘어 날아가는 마탄을 쏜다. 강화할수록 마탄이 늘어난다.'},
  mg_bolt:{cls:'mage',type:'skill',name:'라이트닝',lv:1,cd:3.5,dmg:2600,desc:'화면 안의 적 3명에게 번개를 내리꽂는다. 강화마다 한 명씩 늘어난다.',evo:'번개가 떨어진 자리에 작은 전기 폭발이 한 번 더 터진다.'},
  mg_orb:{cls:'mage',type:'skill',name:'아케인 오브',lv:1,cd:8,dmg:900,desc:'마력 구슬 3개가 5초 동안 주위를 돌며 닿는 적을 친다.',evo:'구슬이 5개가 되고 더 크게 돈다.'},
  mg_chain:{cls:'mage',type:'skill',name:'체인 라이트닝',lv:2,cd:6,dmg:1800,desc:'번개가 적에서 적으로 6번 튄다. 강화할수록 더 많이 튄다.',evo:'튄 번개가 두 갈래로 갈라진다.'},
  mg_nova:{cls:'mage',type:'skill',name:'프로스트 노바',lv:3,cd:9,dmg:2400,desc:'주위에 냉기를 터뜨려 적을 얼리고 2.5초 동안 느리게 만든다.',evo:'범위가 크게 넓어진다.'},
  mg_vortex:{cls:'mage',type:'skill',name:'그래비티',lv:5,cd:10,dmg:500,desc:'적이 가장 많은 곳에 소용돌이를 열어 2.5초 동안 빨아들인 뒤 터뜨린다.',evo:'빨아들이는 힘과 마지막 폭발이 강해진다.'},
  mg_field:{cls:'mage',type:'skill',name:'썬더 필드',lv:6,cd:11,dmg:700,desc:'5초 동안 몸 주위에 전기 결계를 둘러 안의 적을 계속 감전시킨다.',evo:'결계가 넓어지고 안의 적에게 번개가 떨어진다.'},
  mg_star:{cls:'mage',type:'skill',name:'스타폴',lv:8,cd:9,dmg:3800,desc:'보랏빛 운석 6개를 적 머리 위로 떨어뜨린다.',evo:'운석이 10개가 된다.'},
  mg_beam:{cls:'mage',type:'skill',name:'아케인 레이',lv:10,cd:12,dmg:600,desc:'마력 광선을 뿜으며 한 바퀴 휘둘러 주변을 쓸어버린다.',evo:'광선이 두 줄이 되어 반대 방향으로도 나간다.'},
  mg_ult1:{cls:'mage',type:'ult',name:'헤븐 썬더',lv:3,desc:'궁극기. 하늘에 마법진을 열어 화면의 모든 적에게 번개를 쏟고, 거대한 번개 기둥으로 마무리한다.'},
  mg_ult2:{cls:'mage',type:'ult',name:'메테오 폴',lv:12,desc:'궁극기. 운석 비를 뿌린 뒤 거대한 운석 하나를 떨어뜨린다.'},
};
const order=Object.keys(sk);

// basic: a small arcane comet that bends toward its target and pops in a needle flash
function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); quick(true); const n=1+Math.floor((L('mg_basic')+1)/2), d=1300*A.mul('mg_basic');
  after(.13,()=>{ const J=pl.j, sx=J&&J.st?J.st[0]:pl.x+pl.f*60, sy=J&&J.st?J.st[1]:pl.gy-BODY*1.3;
    for(let k=0;k<n;k++) after(k*.07,()=>{ const b=a+(k-(n-1)/2)*.35, p={x:pl.x+Math.cos(b)*50,y:pl.gy+Math.sin(b)*50,vx:Math.cos(b)*1500,vy:Math.sin(b)*1500,life:1.4,d,r:70,home:e,turn:7,c:C1,v:{x:sx,y:sy},h:BODY*1.1};
      p.fx=missile(p); p.spin=false;
      p.onHit=(e,p)=>{ K.art(p.x,p.y,{tex:'v3_xburst',s:100,z:BODY*.55,lift:0,dur:.2,pal:ARC,gain:.9,hold:.2,s0:.5}); GFX.light(p.x,p.y,340,ARC.l,.7,.22,{z:BODY*.5}); K.sparks(p.x,p.y,BODY*.6,{pal:ARC,n:5,sp:[250,800],up:300,life:[.12,.3]}); };
      V.pj.push(p); });
    K.flare(sx,pl.gy,Math.max(0,pl.gy-sy),{pal:ARC,s:70,dur:.16,gain:2.2}); sfx('whoosh',1.8,.4); sfx('slash',1.7,.25); });
  return true; }

const SKILL={
  // LIGHTNING: painted bolts with real height on a few enemies, each leaving its burn on the stone
  mg_bolt:{fn(id){ const T=onScreen(-80); if(!T.length) return false; const n=3+L(id)-1, d=D(id); quick(); sfx('thunder',.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.08+i*.07,()=>{ if(e.dead) return; strike(e.x,e.y,{pal:i%2?AZV:ARC,h:1000,shock:i%2?0:1}); dmg(e,d,{stun:.4}); hitFx(e,C2,1.3);
      if(EVO(id)) after(.15,()=>{ ring1(e.x,e.y,250,{pal:AZV,dur:.3}); scorch(e.x,e.y,{r:230,life:.6,gain:1.3,pal:AZV}); K.sparks(e.x,e.y,30,{pal:ARC,n:10,sp:[300,1000],up:600}); inCircle(e.x,e.y,160,o=>dmg(o,d*.5,{kb:.6,sx:e.x,sy:e.y})); }); })); }},
  // ARCANE ORB: gyroscope orbs circling her, throwing a spark at whatever they touch
  mg_orb:{fn(id){ if(V.orbs.some(o=>o.mage)||!nearest(700)) return false; const n=EVO(id)?5:3, d=D(id); raise(); sfx('rise',.5,.4);
    for(let i=0;i<n;i++){ const o={mage:true,a:i/n*TAU,life:5,d,R:EVO(id)?330:270,w:3.4,hitR:85,c:C1,h:BODY*.8,rot:false,v:{x:pl.x,y:pl.gy-BODY}};
      o.x=pl.x+Math.cos(o.a)*o.R; o.y=pl.gy+Math.sin(o.a)*o.R*.8; o.fx=orbFx(o,i,n>3?1:2);
      o.hit=e=>{ sfx('thunder',.15); arc({x:o.x,y:o.y,z:o.h},{x:e.x,y:e.y,z:e.h*.5},{w:24,dur:.14,n:5}); K.sparks(e.x,e.y,e.h*.5,{pal:ARC,n:4,sp:[250,800],up:400,life:[.12,.3]}); }; V.orbs.push(o); }
    K.sigil(pl.x,pl.gy,{r:170,dur:.7,in:.2,out:.3,spin:2,pal:ARC,tex:CIRC()}); GFX.light(pl.x,pl.gy,520,ARC.l,.7,.5,{z:100}); }},
  // CHAIN LIGHTNING: one painted arc after another, enemy to enemy
  mg_chain:{fn(id){ let e=nearest(650); if(!e) return false; const d=D(id), n=6+L(id), J=pl.j; face(angTo(e)); quick(); sfx('thunder',.5);
    let px=J&&J.st?J.st[0]:pl.x, py=J&&J.st?J.st[1]:pl.gy-BODY, hit=new Set();
    const jump=(e,k,px,py,s3)=>{ if(!e||k>=n) return; hit.add(e); const ex=e.x, ey=e.y-e.h*.5, t3={x:e.x,y:e.y,z:e.h*.5};
      arc(s3,t3,{pal:k%2?AZV:ARC,w:72,dur:.26}); K.art(e.x,e.y,{tex:'v3_xburst',s:85,z:e.h*.5,lift:0,dur:.2,pal:ARC,gain:.8,hold:.2,s0:.5}); GFX.light(e.x,e.y,520,ARC.l,.9,.28,{z:150}); K.sparks(e.x,e.y,e.h*.5,{pal:ARC,n:6,sp:[250,900],up:500,life:[.12,.32]}); if(k%2===0) scorch(e.x,e.y,{r:110,life:.8});
      dmg(e,d,{stun:.3,sx:px,sy:py+BODY}); hitFx(e,C2,1.2); sfx('slash',2,.2);
      const nx=V.en.filter(o=>!o.dead&&!hit.has(o)&&Math.hypot(o.x-e.x,o.y-e.y)<480).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
      after(.06,()=>{ jump(nx[0],k+1,ex,ey,t3); if(EVO(id)&&nx[1]&&k%2===0) jump(nx[1],k+2,ex,ey,t3); }); };
    after(.12,()=>{ const s3={x:px,y:pl.gy,z:Math.max(0,pl.gy-py)}; K.flare(s3.x,s3.y,s3.z,{pal:ARC,s:90,dur:.18,gain:2.6}); jump(e,0,px,py,s3); }); }},
  // FROST NOVA: a painted ring of frost thrown over the floor, a shell of cold, crystals standing where it passed
  mg_nova:{fn(id){ const R=EVO(id)?560:400; if(countIn(R)<3&&!nearest(260)) return false; const d=D(id); raise(); sfx('shatter',.8);
    after(.12,()=>{ const x=pl.x, y=pl.gy, n=EVO(id)?11:8, a0=rand(0,TAU);
      K.art(x,y,{tex:'fx3_shock',floor:true,s:R*1.3,dur:.8,pal:FRO,gain:1,hold:.35,s0:.25});
      K.shock(x,y,{r:R*1.2,dur:.42,pal:FRO,gain:1,dust:0}); K.dome(x,y,{r:R*.8,dur:.36,pal:FRO,gain:.7,hk:.55});
      for(let i=0;i<n;i++){ const b=a0+i/n*TAU, r=R*rand(.62,.9), s=rand(70,120); K.pic(x+Math.cos(b)*r,y+Math.sin(b)*r*FSY,s*.7,{img:'crystal',s,asp:.43,dur:rand(.9,1.3),in:.07,out:.4,tint:[.5,2.3,1.5],edge:'#e8fbff',gain:1.25,rot:Math.cos(b)*.3,delay:.04+r/R*.1}); }
      GFX.light(x,y,R*2.2,FRO.l,1,.5,{z:80}); GFX.ripple(x,y,R*1.3,{life:.4,s:.5}); K.sparks(x,y,40,{pal:FRO,n:18,sp:[R*1.2,R*3],up:500,life:[.2,.5]}); K.dust(x,y,{n:10,r:60,sp:[R*.8,R*1.8],c:'#4a6c84',c3:'#bfe8ff',a:.4});
      trauma=Math.min(1,trauma+.35);
      inCircle(x,y,R,e=>{ dmg(e,d,{kb:.9,stun:.8,slow:2.5,big:true}); hitFx(e,'#9ff7ff',1.2); }); }); }},
  // GRAVITY: a well in the floor that pulls the light and the crowd in, then gives it all back at once
  mg_vortex:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?420:330, pull=EVO(id)?520:360, P=K.PAL.violet; face(angTo(t)); raise(); sfx('rise',.6,.5);
    V.zones.push({x,y,r:R,life:2.5,tick:.12,fx:well(x,y,R,2.6),fn:(e)=>{ e.pull={x,y,s:pull}; if(Math.random()<.4) dmg(e,d,{kb:0,stun:.15}); },
      onTick:z=>{ for(let i=0;i<3;i++){ const a=rand(0,TAU), r=rand(R*.7,R*1.25); GFX.pt({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:rand(0,160),tx:x,ty:y,tz:110,pull:rand(3,5),vx:-Math.sin(a)*700,vy:Math.cos(a)*400,life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.3?'#ffffff':P.s),c2:P.b,L:3}); } },
      onEnd:()=>{ K.burst(x,y,{s:R*.62,pal:P,smoke:1,scar:3}); K.dome(x,y,{r:R*1.05,dur:.4,pal:P,gain:.7}); trauma=Math.min(1,trauma+.4); sfx('boom',1.2,.8);
        inCircle(x,y,R,e=>{ dmg(e,d*(EVO(id)?12:8),{kb:1.6,launch:900,big:true,sx:x,sy:y}); hitFx(e,C1,1.4); }); }}); }},
  // THUNDER FIELD: a ward that walks with her, fenced with lightning, biting whatever steps inside
  mg_field:{fn(id){ if(V.zones.some(z=>z.field)||!nearest(450)) return false; const d=D(id), R=EVO(id)?420:330; raise(); sfx('thunder',.4);
    const v={x:pl.x,y:pl.gy}; let na=0;
    V.zones.push({field:true,follow:true,r:R,life:5,tick:.4,fx:fieldFx(v,R,5),v,h:0,fn:e=>{ dmg(e,d,{kb:.2,stun:.2}); hitFx(e,C2,.9); if(na++<5){ arc({x:v.x,y:v.y,z:BODY*1.7},{x:e.x,y:e.y,z:e.h*.5},{pal:na%2?AZV:ARC,w:30,dur:.2}); K.sparks(e.x,e.y,e.h*.5,{pal:ARC,n:3,sp:[250,700],up:400,life:[.12,.3]}); } },
      onTick:z=>{ na=0; if(EVO(id)){ const T=V.en.filter(e=>!e.dead&&Math.hypot(e.x-z.x,e.y-z.y)<R); const e=T[(Math.random()*T.length)|0]; if(e){ strike(e.x,e.y,{pal:AZV,s:.7}); dmg(e,d*2,{stun:.3}); } }
        for(let i=0;i<2;i++){ const a=rand(0,TAU), b=a+rand(.6,1.4); arc({x:z.x+Math.cos(a)*R,y:z.y+Math.sin(a)*R*FSY,z:16},{x:z.x+Math.cos(b)*R*rand(.3,1),y:z.y+Math.sin(b)*R*FSY*rand(.3,1),z:16},{w:22,dur:.22,jit:.2}); }
        GFX.light(z.x,z.y,R*1.7,ARC.l,.5,.3,{z:60}); sfx('thunder',.12); }}); }},
  // STARFALL: violet crystals out of the sky, each with its tail and its closing shadow
  mg_star:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?10:6, d=D(id); raise(); sfx('rise',.8,.5);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x+rand(-40,40), y=e.y+rand(-30,30), hitAt=Math.max(.3,.25+i*.12), fall=Math.min(.42,hitAt);
      mark({x,y},{r:150,dur:hitAt+.05,pal:STA,glow:0});
      comet(x,y,{img:'crystal',asp:.43,s:105,s0:.8,h0:1500,dx:480,dur:fall,delay:hitAt-fall,pal:STA,spin:0,rot:-.3,tail:.4,gain:1.5});
      after(hitAt,()=>{ K.burst(x,y,{s:150,pal:STA,no:['smoke','crack','debris','shock'],dur:.45,gain:.8}); ring1(x,y,330,{pal:STA,dur:.4}); scorch(x,y,{r:180,pal:STA,life:1.6}); K.debris(x,y,{n:4,r:30,sp:[200,600],up:800,size:11,c:'#5a4c7a'}); sfx('boom',.8,.5);
        inCircle(x,y,190,o=>{ dmg(o,d,{kb:1,launch:600,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); }); }},
  // ARCANE RAY: a painted beam swept once round her, scoring the floor as it goes
  mg_beam:{fn(id){ const e=nearest(700); if(!e) return false; const d=D(id), a0=angTo(e), n=EVO(id)?2:1, Lb=950, dir=Math.random()<.5?1:-1; face(a0);
    S([['gb05',.05],['gb07',1.5,{kick:[1.2,-1]}],['gb10',.1],['gb12',.06]]); sfx('rise',.9,.5);
    const ang=tt=>a0+dir*TAU*Math.min(1,Math.max(0,tt)/1.5), rays=[]; let t=0;
    for(let k=0;k<n;k++) rays.push(rayFx(tt=>ang(tt-.03),k,Lb,1.62));
    const tick=()=>{ t+=.05; if(t>1.55||G_over()){ rays.forEach(s=>s.life=0); return; } const a=ang(t);
      for(let k=0;k<n;k++){ const b=a+k*Math.PI, x1=pl.x+Math.cos(b)*Lb, y1=pl.gy+Math.sin(b)*Lb;
        inLine(pl.x,pl.gy,x1,y1,55,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.15; dmg(o,d,{kb:.5,stun:.2}); hitFx(o,C2,1); }); }
      after(.05,tick); };
    after(.08,tick); }},
};
const G_over=()=>V.over||RPG.mode!=='surv';

/// ---- ultimates. Each is one staged sequence: omen -> release -> development -> climax -> afterglow. No cut-ins, no blackout: only the ambient drops.
// HEAVEN THUNDER: a circle writes itself under her and a second one opens in the sky; every enemy is marked on the floor and overhead;
// the sky answers each mark in turn, working outward from her; and last the sky circle empties itself down one column onto the thickest of them.
function ultThunder(id){ ultStart(id); const Cn=X.cine, x0=pl.x, y0=pl.gy, {hw,hh}=view(), Dm=60000*A.mul(id), P=ARC;
  S([['gx03',.12],['gx04',.3],['gx06',2.3],['gx08',.12,{kick:[1.2,-1]}],['gx10',2],['gx13',.8],['gx14',9]]);
  const tb=densest(1400), [bx,by]=X.inView(tb?tb.x:x0,tb?tb.y:y0-hh*.25,.4);
  // the ceiling the storm hangs from: high enough to read as sky, low enough that the circle up there stays on the screen
  const Rs=hw*.7, Hs=clamp(by-(y0-hh)-Rs*FSY-140,750,1300), sky0={x:bx,y:by,z:Hs};
  // ---- omen: the light leaves the field, the circle writes itself, static crawls over it and climbs the staff
  GFX.ambient(.33,.31,.52,3.5); GFX.light(x0,y0,560,P.l,.85,.5,{hold:2.7,z:140});
  K.sigil(x0,y0,{r:hw*.48,dur:4.7,in:1.1,out:.6,spin:-.4,pal:SIL,tex:CIRC()});
  Cn.zoom(1.3); Cn.cam(x0,y0-BODY*1.2,5); SFX.thunder(.35); Cn.drone(46,.3);
  for(let i=0;i<3;i++) after(.1+i*.3,()=>K.shock(x0,y0,{r0:hw*(.95-i*.14),r:50,dur:.4,pal:P,gain:.5,light:0,dust:0,haze:.5,th:.6}));
  for(let i=0;i<44;i++) after(rand(0,1.1),()=>{ const a=rand(0,TAU), d=rand(320,820); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,300),tx:x0,ty:y0,tz:BODY*2,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); });
  for(let i=0;i<10;i++) after(.2+i*.15,()=>{ const a=rand(0,TAU), b=a+rand(.6,1.3)*(i%2?1:-1), r=hw*rand(.2,.46); arc({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:14},{x:x0+Math.cos(b)*r,y:y0+Math.sin(b)*r*FSY,z:14},{w:44,dur:.22,jit:.2}); if(i%3===0) Cn.SND.tick(2+Math.random(),.08); });
  for(let i=0;i<10;i++) after(rand(.2,1),()=>{ const a=rand(0,TAU), d=rand(120,420); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.7,1.1),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  after(.7,()=>{ const tp=tip(); K.flare(tp.x,tp.y,tp.z,{pal:P,s:90,dur:.5,gain:2}); });
  // ---- the call: a line of light from the staff, and the sky opens over the place it will end
  let sky=null;
  after(1.15,()=>{ const tp=tip(); K.beam(tp.x,tp.y,tp.z,bx,by,Hs,{pal:P,w:70,dur:.55}); K.flare(tp.x,tp.y,tp.z,{pal:P,s:150,dur:.3,gain:3}); K.sparks(tp.x,tp.y,tp.z,{pal:P,n:16,sp:[300,900],up:900});
    K.shock(x0,y0,{r:hw*.7,dur:.4,pal:P,gain:.8,dust:8});
    sky=skySigil(bx,by,Hs,{r:Rs,dur:3.95,in:.7,out:.4,spin:.5,pal:SIL}); GFX.ambient(.3,.28,.5,4); Cn.zoom(.95); Cn.cam(mix(x0,bx,.5),mix(y0,by,.5)-Hs*.4,3.5); Cn.shake(.3); Cn.SND.shing(.6,.4); SFX.thunder(.5); });
  // light sifts down out of the open sky onto the floor under it
  for(let i=0;i<52;i++) after(1.5+i*.058,()=>{ const a=rand(0,TAU), d=Math.sqrt(Math.random())*Rs*.9, vz=rand(900,1500); GFX.pt({x:bx+Math.cos(a)*d,y:by+Math.sin(a)*d*FSY,z:Hs,vz:-vz,life:Hs/vz,s:rand(2.5,4.5),m:3,len:.07,c:GFX.rgb(i%3?P.s:'#ffffff'),c2:P.b,L:3,fk:6}); });
  // the sky circle charges while the marks close: lightning crawls across it and dry leaders reach down and fail
  for(let i=0;i<11;i++) after(1.65+i*.1,()=>{ const a=rand(0,TAU), b=a+rand(1.6,3.2); arc({x:bx+Math.cos(a)*Rs*.9,y:by+Math.sin(a)*Rs*.9*FSY,z:Hs},{x:bx+Math.cos(b)*Rs*.9,y:by+Math.sin(b)*Rs*.9*FSY,z:Hs},{w:50,dur:.2,jit:.1});
    if(i%3===1){ const c=rand(0,TAU), px=bx+Math.cos(c)*Rs*.7, py=by+Math.sin(c)*Rs*.7*FSY; arc({x:px,y:py,z:Hs},{x:px+rand(-120,120),y:py,z:Hs*rand(.45,.65)},{w:44,dur:.16,jit:.18}); GFX.light(px,py,520,P.l,.5,.16,{z:200}); GFX.ambient(.4,.37,.64,40); after(.06,()=>GFX.ambient(.3,.28,.5,9)); } });
  // ---- the marks: a reticle closes on every enemy
  const T=onScreen(120).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)).slice(0,32), nT=Math.max(1,T.length);
  after(1.8,()=>{ Cn.zoom(.9); Cn.cam(null); Cn.roll(-.03); });
  T.forEach((e,i)=>after(1.85+i*(.75/nT),()=>{ if(e.dead) return; mark(e,{r:120,dur:1.06+i*(.25/nT),pal:P}); e.mark=RT; e.flash=.6; Cn.SND.tick(.8+i*.03,.16); }));
  // ---- release: the staff comes down and every mark is answered, nearest first
  after(2.76,()=>{ Cn.roll(.03); Cn.zoom(.84); K.shock(x0,y0,{r:hw*1.3,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.4,{life:.45,s:.6}); K.sparks(x0,y0,BODY,{pal:P,n:24,sp:[400,1500],up:700}); K.dust(x0,y0,{n:10,r:60,sp:[300,800]});
    Cn.shake(.7); post.ca=.01; SFX.boom(1.4,.5); Cn.SND.shing(.7,.4); if(sky) sky.g=1.5; });
  // bolts that land on top of one another are thinned so a crowd is struck by lightning, not by a white wall
  const done=[], hit=(x,y,i)=>{ const near=done.filter(q=>RT-q.t<.28&&Math.hypot(q.x-x,q.y-y)<230).length; done.push({x,y,t:RT});
    strike(x,y,{pal:P,dur:.42,h:Hs*rand(.95,1.1),w:Hs*(near?.2:.3),gain:near>1?.45:near?.6:.9,r:near?120:175,shock:near?0:i%2}); };
  T.forEach((e,i)=>after(2.86+i*(1.0/nT),()=>{ if(e.dead) return; hit(e.x,e.y,i); ultHit(e,Dm*.4,e.x,e.y+200);
    if(i%4===0){ sfx('thunder',.5); Cn.shake(.45); K.debris(e.x,e.y,{n:4,r:30,sp:[200,600],up:900,size:12}); GFX.ambient(.48,.44,.76,40); after(.07,()=>GFX.ambient(.3,.28,.5,9)); } }));
  // the storm is the same size whether the field is full or nearly empty: the rest of it falls on bare stone, spiralling outward
  { const nF=Math.max(8,26-T.length), a0=rand(0,TAU); for(let i=0;i<nF;i++){ const u=(i+.5)/nF, a=a0+i*2.4, r=Math.sqrt(u); after(2.86+u*.98+rand(-.03,.03),()=>hit(x0+Math.cos(a)*r*hw*.9,y0-hh*.08+Math.sin(a)*r*hh*.5,i+1)); } }
  // ---- climax omen: everything left in the sky is drawn to the one circle; a leader feels its way down
  after(3.95,()=>{ Cn.roll(0); Cn.cam(bx,by-Hs*.42,7); Cn.zoom(.82); GFX.ambient(.3,.3,.42,6); Cn.SND.inhale(.6,.6); duck(.25,.5); if(sky) sky.g=1.9;
    GFX.add(.6,k=>{ if(sky) sky.eye=k*k*1.2; });
    K.sigil(bx,by,{r:Rs*.8,dur:2.3,in:.35,out:.6,spin:-1.2,pal:SIL,tex:CIRC()}); GFX.light(bx,by,760,AZV.l,.7,.2,{hold:.5,z:100});
    for(let i=0;i<3;i++) K.shock(bx,by,{r0:hw*(.9-i*.2),r:60,dur:.34,delay:i*.17,pal:P,gain:.6,light:0,dust:0,haze:.5,th:.6});
    for(let i=0;i<40;i++) after(rand(0,.5),()=>{ const a=rand(0,TAU), d=rand(100,Rs); GFX.pt({x:bx+Math.cos(a)*d,y:by+Math.sin(a)*d*FSY,z:rand(0,80),tx:bx,ty:by,tz:Hs,pull:rand(3,5),life:rand(.4,.6),s:rand(3,6),m:3,len:.06,vz:rand(300,900),c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); });
    for(let i=0;i<4;i++) after(.1+i*.12,()=>arc(sky0,{x:bx+rand(-90,90),y:by,z:Hs*(1-(i+1)/4.3)},{w:60,dur:.14,jit:.12})); });
  // one held breath: the storm stops, the light goes down
  after(4.43,()=>{ GFX.ambient(.3,.3,.34,40); if(sky) sky.g=.7; duck(.12,.3); });
  // ---- climax: the sky circle empties itself down one column - the only azure bolt of the storm
  after(4.55,()=>{ hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.014; Cn.zoom(.86); if(sky){ sky.g=2.4; sky.eye=1.5; GFX.add(.5,k=>{ sky.eye=1.5*(1-k); sky.g=2.4-1.2*k; }); }
    // the column: a painted beam standing from the floor to the sky circle, and the bolts that ride it
    K.beam(bx,by,Hs,bx,by,0,{pal:COLM,w:Hs*.42,dur:.8,gain:.55}); K.beam(bx,by,Hs,bx,by,0,{pal:AZV,w:Hs*.14,dur:.6,gain:.7});
    if(F.on){ const mt=mm().gyro, Cc=col(AZV), sd=rand(0,9); GFX.add(.6,k=>{ for(let q=0;q<3;q++){ const u=sat(k*1.25-q*.12), r=80+Hs*.36*eo3(u); if(u>0&&u<1) F.ring(mt,bx,by,r*.82,r,{z:Hs*(.82-q*.27),...Cc,a:(1-u)*(1-u),gain:2.4,t0:sd+q}); } }); }
    K.bolt(bx,by,{pal:AZV,h:Hs*1.03,w:Hs*.62,dur:.8,gain:.72,crack:0}); K.bolt(bx+rand(-60,60),by,{pal:AZV,h:Hs*1.03,w:Hs*.44,dur:.5,delay:.16,gain:.75,crack:0}); K.bolt(bx+rand(-80,80),by,{pal:AZV,h:Hs*1.03,w:Hs*.5,dur:.5,delay:.34,gain:.75,crack:0});
    K.art(bx,by,{tex:'v3_xburst',s:hw*.42,lift:.3,dur:.3,pal:AZV,gain:.9,hold:.2,s0:.5});
    K.dome(bx,by,{r:hw*.6,dur:.45,pal:AZV,gain:.8,hk:.6}); K.shock(bx,by,{r:hw*1.7,dur:.6,pal:AZV,gain:1.2}); K.shock(bx,by,{r:hw*2.3,dur:.85,pal:AZV,gain:.7,delay:.1,light:0});
    K.crack(bx,by,{r:hw*.75,pal:P,life:4.2,grow:.14,gain:1.1}); scorch(bx,by,{r:hw*.95,pal:AZV,life:3.6,grow:.2,gain:1.2});
    GFX.ripple(bx,by,hw*2,{life:.6,s:.9}); K.debris(bx,by,{n:26,r:140,sp:[300,1300],up:1900,size:24}); K.dust(bx,by,{n:18,r:120,sp:[500,1400],a:.5}); K.sparks(bx,by,40,{pal:P,n:44,sp:[500,2200],up:1800,life:[.3,.9]});
    GFX.light(bx,by,hw*2.4,AZV.l,1.3,.9,{z:260,hold:.25}); GFX.ambient(.5,.58,.9,40); after(.16,()=>GFX.ambient(.36,.33,.5,4));
    // the field takes it: a ring of lesser bolts walks outward from the column
    for(let i=0;i<8;i++){ const a=i/8*TAU+rand(-.3,.3), r=hw*(.62+.09*i+rand(0,.12)); after(.12+i*.05,()=>{ strike(bx+Math.cos(a)*r,by+Math.sin(a)*r*.8,{pal:P,h:Hs*rand(.75,.95),gain:.7,r:200}); if(i%3===0) Cn.shake(.5); }); }
    // and it jumps from body to body before they fall
    const B=onScreen(200).slice(0,10); for(let i=0;i<B.length;i++){ const a=i?B[i-1]:{x:bx,y:by,h:BODY*2}, b=B[i]; if(Math.hypot(a.x-b.x,a.y-b.y)>700||Math.hypot(b.x-bx,b.y-by)>1300) continue; arc({x:a.x,y:a.y,z:a.h*.5},{x:b.x,y:b.y,z:b.h*.5},{pal:i%2?AZV:P,w:80,dur:.32,delay:i*.012,jit:.1}); }
    Cn.sweep(bx,by,Dm,{speed:3600}); SFX.thunder(1.3); Cn.SND.hit(1); });
  // ---- afterglow: the floor keeps arcing while the burn cools and the light comes back
  for(let i=0;i<16;i++) after(4.9+i*.09,()=>{ const a=rand(0,TAU), r=rand(80,560), x=bx+Math.cos(a)*r, y=by+Math.sin(a)*r*FSY; arc({x,y,z:10},{x:x+rand(-240,240),y:y+rand(-100,100),z:10},{w:40,dur:.18,jit:.22}); if(i%4===0) GFX.light(x,y,300,P.l,.5,.15); if(i%3===0) Cn.SND.tick(2+Math.random(),.08); });
  after(4.95,()=>{ K.embers(bx,by,hw*.7,{pal:P,n:40,life:2,up:400}); K.smoke(bx,by,{s:300,dur:1.5,a:.5}); });
  after(5.3,()=>GFX.ambient(.8,.78,.9,1.8));
  after(5.6,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(6.25,ultStop); }

// METEOR FALL: she looks up - it is already coming. A circle marks where; its shadow grows there while smaller stones walk the field;
// then it crosses the whole sky on its tail of fire, and the land does not forget it.
function ultMeteor(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.4), x0=pl.x, y0=pl.gy, P=MET;
  S([['gy03',.14],['gy05',.5],['gy06',1.6],['gy07',1.3],['gy09',.14,{kick:[1.2,-1]}],['gy10',.6],['gy13',.9],['gy14',9]]);
  // ---- omen: warm dusk, her own small circle, and the summoning circle writing itself on the place it will land
  GFX.ambient(.44,.32,.42,3); GFX.light(x0,y0,520,ARC.l,.7,.5,{hold:1.6,z:140});
  K.sigil(x0,y0,{r:230,dur:2.2,in:.5,out:.4,spin:.8,pal:ARC,tex:CIRC()});
  const circ=K.sigil(cx,cy,{r:560,dur:3.6,in:1.2,out:.12,spin:.5,pal:ARC,tex:CIRC()});
  Cn.zoom(1.12); Cn.cam(mix(x0,cx,.4),mix(y0,cy,.4)-BODY,4); SFX.rumble(1.6); Cn.drone(40,.3);
  for(let i=0;i<36;i++) after(rand(0,1.1),()=>{ const a=rand(0,TAU), d=rand(320,820); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,300),tx:x0,ty:y0,tz:BODY*2,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.5?P.s:ARC.s),c2:P.b,L:3}); });
  for(let i=0;i<12;i++) after(rand(.3,1.6),()=>{ const a=rand(0,TAU), d=rand(120,520); GFX.pt({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.8,1.3),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  // the heat arrives before the stone does
  const heat=GFX.light(cx,cy,900,P.l,.05,.3,{hold:3.5,z:200});
  GFX.add(1.6,k=>{ heat.a=.1+1.1*k*k; heat.r=900+700*k; Cn.shake(.1+k*.42); },1.9);
  // ---- release: the camera lets go of her; the small ones come first
  after(1.85,()=>{ Cn.zoom(.78); Cn.cam(mix(x0,cx,.6),mix(y0,cy,.6)-hh*.2,3.5); GFX.ambient(.4,.28,.36,4); SFX.fire(1.7,.7); Cn.SND.inhale(1.65,.7); K.shock(x0,y0,{r:hw*.6,dur:.4,pal:ARC,gain:.7,dust:6}); });
  for(let i=0;i<7;i++){ const x=cx+rand(-hw,hw)*.9, y=cy+rand(-hh,hh)*.7, at=2.12+i*.17;
    comet(x,y,{s:150,s0:.75,h0:1900,dx:760,dur:.56,delay:at-.56,pal:P,spin:4});
    after(at,()=>{ K.burst(x,y,{s:250,pal:P,smoke:1,scar:3}); sfx('boom',.8,.4); Cn.shake(.4); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); }); }
  for(let i=0;i<3;i++) K.shock(cx,cy,{r0:hw*(.95-i*.2),r:80,dur:.36,delay:2.75+i*.25,pal:P,gain:.6,light:0,dust:0,haze:.6,th:.6});
  for(let i=0;i<2;i++) after(2.5+i*.45,()=>K.dust(cx,cy,{n:10,r:260,sp:[300,800],a:.32,c:'#4a3630'}));
  // ---- the stone: one and a half seconds across the whole sky
  comet(cx,cy,{s:470,s0:.5,h0:hh*2.5,dx:hw*1.5,dur:1.6,delay:1.9,ease:k=>k*k*k,tail:.3,spin:.6,pal:P,big:true});
  after(3.2,()=>{ Cn.cam(cx,cy-BODY,9); Cn.zoom(.86); });
  // ---- climax
  after(3.5,()=>{ circ.dead=true; heat.hold=0; hitstop=Math.max(hitstop,.12); Cn.shake(1.6); post.ca=.014;
    K.burst(cx,cy,{s:720,pal:P,dur:.9,smoke:3,scar:5.5,gain:.9}); K.flame(cx,cy,{s:980,dur:1.25,pal:P,light:0,gain:.9});
    K.art(cx,cy,{tex:'fx3_shock',floor:true,s:hw*.95,dur:1,pal:P,gain:.8,hold:.3,s0:.3});
    for(let w=0;w<2;w++){ const pts=[], n=9, a0=w?.42:Math.PI+.42, a1=w?Math.PI-.42:TAU-.42; for(let q=0;q<=n;q++){ const a=mix(a0,a1,q/n); pts.push({x:cx+Math.cos(a)*450,y:cy+Math.sin(a)*450*FSY,h:(w?rand(200,340):rand(620,900))*(.6+.4*Math.sin(Math.PI*q/n))}); } K.wall(pts,{pal:P,dur:w?.9:1.2,gain:.9,ord:pts[4].y}); }
    K.dome(cx,cy,{r:hw*.75,dur:.5,pal:P,gain:.8}); K.shock(cx,cy,{r:hw*2.3,dur:.85,pal:P,gain:.8,delay:.08,light:0});
    GFX.ripple(cx,cy,hw*2,{life:.6,s:1}); K.debris(cx,cy,{n:26,r:200,sp:[400,1500],up:1900,size:26,c:'#5a4038'}); K.dust(cx,cy,{n:22,r:160,sp:[600,1600],a:.55,c:'#4a3630'});
    GFX.light(cx,cy,hw*2.4,P.l,1.15,1.2,{z:260,hold:.3}); GFX.ambient(.7,.48,.4,40); after(.16,()=>GFX.ambient(.44,.32,.36,4));
    Cn.sweep(cx,cy,Dm,{speed:3000,push:1.3}); SFX.shatter(1); Cn.SND.hit(1);
    // the ground keeps going off further and further out
    for(let r=1;r<=2;r++) after(r*.2,()=>{ const n=3+r*2, rr=r*520; for(let i=0;i<n;i++){ const a=i/n*TAU+r+rand(-.25,.25), d=rr*rand(.85,1.15), x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d*.75, s=rand(170,300); K.art(x,y,{tex:'fx3_burst',s,asp:1.39,z:-s*.25,dur:.55,pal:P,gain:.75,hold:.25,s0:.4,rot:rand(-.3,.3)}); K.sparks(x,y,30,{pal:P,n:8,sp:[300,1100],up:1100,life:[.3,.7]}); if(i%2) K.flame(x,y,{s:rand(160,400),dur:rand(.8,1.5),pal:P,light:0,delay:.15}); else K.debris(x,y,{n:4,r:30,sp:[200,700],up:1000,size:14,c:'#5a4038'}); }
      K.shock(cx,cy,{r0:rr*.7,r:rr*1.5,dur:.4,pal:P,gain:.7,light:0}); sfx('boom',1.2,.6); Cn.shake(.6); }); });
  // ---- afterglow: ash, smoke, a crater that is still molten
  after(4.1,()=>{ for(let i=0;i<5;i++) K.smoke(cx+rand(-300,300),cy+rand(-120,120),{s:rand(260,380),dur:rand(1.2,1.6),a:.55,delay:i*.08,c:'#1c1210',c2:'#4a3028'}); K.embers(cx,cy,hw*.8,{pal:P,n:44,life:2.2,up:420}); for(let i=0;i<4;i++){ const a=rand(0,TAU), r=rand(100,420); K.flame(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{s:rand(120,330),dur:rand(.9,1.25),pal:P,light:0}); } });
  after(4.7,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(5.35,ultStop); }

X.reg('mage',{sk,order,basic:{fn:basic,cd:()=>.85*(1-.05*(L('mg_basic')-1))},skills:SKILL,ults:{mg_ult1:ultThunder,mg_ult2:ultMeteor}});
})();
