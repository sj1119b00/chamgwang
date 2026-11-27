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
  JUD={d:'#0a0430',b:'#6a4cff',m:'#b4c0ff',h:'#ffffff',l:'#8a80ff',s:'#d6dcff'},        // the judgement column: the storm's violet turned toward azure, white only in its channel
  GRAV={d:'#0a0220',b:'#6a1cff',m:'#c46cff',h:'#f0dcff',l:'#8a4cff',s:'#d0a8ff'},
  GRV2={d:'#06021a',b:'#5a1ce6',m:'#d27cff',h:'#fff2ff',l:'#8a4cff',s:'#e0c0ff'},
  GATE={d:'#04051a',b:'#23286e',m:'#6f74d8',h:'#d9dcff',l:'#8c68ff',s:'#cfbcff'};      // the storm clouds round the opened sky: night indigo with lit rims
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
const tx=(a,b)=>F.ready(a)?a:b;   // a painting if it has loaded, else its stand-in
if(F&&F.on) F.img('crystal');

// ---------------------------------------------------------------- local materials (built once)
let MM=null;
function mm(){ if(MM) return MM; const m=K.mats(), mat=F.mat; MM={m,
  arc:mat({...m.art,tex:'fx3_beam',layer:'o',nz:'streak',n1:[2,1,-4,0],n2:[2,1,-2,0],dist:.05,mdist:1,nk:.3,rk:[.45,.95]}),
  sco:mat({...m.crE,tex:'fx_crack',msk:[.4,.45,.15,0],nk:.3,pw:1.2,rk:[.5,1.05]}),
  glowS:mat({...m.glowG,layer:'o'}),
  gyro:mat({nz:'streak',n1:[3,.5,-1.6,0],n2:[2,1,-.6,0],dist:.04,nk:.6,ero:.1,soft:.2,pm:[2,1.3,0,0],rk:[.4,.9],gain:2.8,bgain:1.2,layer:'o'}),
  hole:mat({...m.dark,layer:'o',pm:[3,.55,0,0]}),
  gate:mat({...m.art,tex:'v3_skygate',layer:'o',nz:'billow',n1:[1.4,1.4,.03,.02],n2:[1.2,1.2,.02,.03],dist:.03,mdist:1,nk:.2,op:.85,rk:[.72,1.5]}),
  arcH:mat({...m.art,tex:'v3_arc_h',layer:'o',nz:'streak',n1:[2,1,-3,0],n2:[2,1,-2,0],dist:.025,mdist:1,nk:.2,rk:[.45,1]}),
  tail:mat({...m.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[1.6,1,-1.4,0],n2:[1.5,1,-.9,0],dist:.05,mdist:1,nk:.25,rk:[.5,1.05]}),
  tailS:mat({...m.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[1.4,1,-.8,0],n2:[1.5,1,-.6,0],dist:.06,mdist:1,nk:.2,op:1,pw:.6,rk:[.5,1.2]}),
  haze:mat({nz:'fbm',n1:[3,1,-2,0],nk:.8,ero:.02,soft:.5,pm:[2,1,0,0],gain:.08,layer:'d'}),
  rock:mat({...m.art,tex:'v3_boulder',layer:'o',op:1,nk:0,ero:.02,soft:.06,cA:'#080606',cB:'#3c302a',cM:'#6e5c50',cC:'#b09a86',rk:[.35,1],gain:1,bgain:1}),
  dustR:mat({...m.art,tex:'v3_dustring',layer:'g',op:1,nz:'billow',n1:[2,2,.03,.03],nk:.3,cA:'#060404',cB:'#2a201c',cM:'#4a3a32',cC:'#7a6456',rk:[.4,1.1],gain:1,bgain:1}),
  craR:mat({...m.art,tex:'v3_crater',layer:'g',nk:0,op:1,pw:.7,ero:.04,soft:.3,rk:[.4,1]}),
  craH:mat({...m.crE,tex:'v3_crater',nk:.3,pw:2.6,rk:[.7,1.5]}),
  seal:mat({...m.art,tex:'fx_circle_seal',layer:'o',nz:'streak',n1:[2,1,-2,0],nk:.2,rk:[.45,1]}),
}; return MM; }
// the staff's tip as a world point (x, floor y, height)
const tip=()=>{ const J=pl.j; return J&&J.st?{x:J.st[0],y:pl.gy,z:Math.max(0,pl.gy-J.st[1])}:{x:pl.x+pl.f*30,y:pl.gy,z:BODY*1.9}; };

// ---------------------------------------------------------------- local volume pieces (on K3.v* / VOL)
const VO=window.VOL, vok=()=>!!(K.vok&&K.vok());
// PLASMA: the short ball of plasma where lightning or a spell goes to ground: swells, tears open, is gone almost without smoke
function plasma(x,y,s,P,o={}){ if(!vok()) return; const C=K.vc(K.pal(P)), dur=o.dur||.5, sd=rand(0,90), z0=o.z??s*.3, rise=o.rise??s*.45, hk=o.heat??1, ft=o.fire??dur*.7, sm=o.smoke??.1, gn=o.gain??.7;
  GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/.09)), cool=sat(t/ft), e=sat((t-.07)/(dur-.07)), r=.3+.46*g+.14*e;
    VO.add('blast',x,y,z0+rise*e*e,{ex:s*1.25,ey:s*1.25,ez:s*1.1,pa:[r,.7,o.freq||3.3,Math.min(.7,t*1.4)],pb:[1.5*hk*(1-cool*cool),1.25,1,.28+.3*e],dens:(11-7*e)*(1-sat((k-.45)/.55)),gain:1.7*gn,seed:sd,smoke:sm,fire:.72,...C,amb:.2,key:1.25,rim:.32,glow:.6*(1-cool)}); },o.delay||0); }

// ---------------------------------------------------------------- local pieces
// ARC: painted lightning strung between two points in the air {x,y,z}; it is redrawn in a new shape twice before it burns out.
//  o: {w, dur, n, jit (sideways throw as a fraction of its length), pal, gain, delay, tex ('h' = the thick painted arc with forks)}
function arc(a,b,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), dur=o.dur||.24, n=o.n||7, hT=o.tex==='h', mt=hT?m.arcH:m.arc, jit=o.jit??(hT?.04:.14), len=Math.hypot(b.x-a.x,(b.y-b.z)-(a.y-a.z))||1, w=o.w||(hT?Math.max(70,len*.12):Math.max(46,len*.075)), sd=rand(0,9), sh=[0,1,2].map(()=>{ const s=[]; for(let i=0;i<n;i++) s.push([rand(-1,1),rand(-1,1)]); return s; });
  GFX.add(dur,k=>{ const fr=k<.3?0:k<.6?1:2, J=sh[fr], f=sat((k-.55)/.45), ps=[];
    for(let i=0;i<n;i++){ const u=i/(n-1), e=Math.sin(Math.PI*u), j=len*jit*e; ps.push({x:mix(a.x,b.x,u)+J[i][0]*j,y:mix(a.y,b.y,u),z:Math.max(0,mix(a.z,b.z,u)+J[i][1]*j*.7),w:w*(.5+.5*e)*(1-f*.5)}); }
    if(o.body) F.ribbon(m.m.trB,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.8})),{...C,a:.7*(1-f),gain:1.8,t0:sd,fd:[.06,.06,0,0],pm:[2,2.2,0,0]});
    F.ribbon(mt,ps,{...C,a:(fr===1?.7:1)*(1-f),gain:3.2*(o.gain||1),ero:.08+f*.6,t0:sd,uvT:!hT||fr===0?[1,1,0,0]:fr===1?[1,-1,0,1]:[-1,1,1,0]}); },o.delay||0); }
// SCORCH: the branching burn lightning leaves on stone; it spreads from the strike and cools. o: {r, life, grow, pal, gain}
function scorch(x,y,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), r=o.r||200, life=o.life||2, rot=rand(0,TAU), g=o.gain||1, grow=o.grow??.1;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/grow)), heat=Math.pow(1-k,1.5);
    F.quad(m.sco,x,y,r,r,rot,{...C,a:Math.min(1,heat*1.5),gain:2.6*g*(.4+.6*heat),ero:.1+.5*(1-heat),rv:[i*1.3,.3,0,.1]}); },o.delay||0); }
// MARK: the reticle that closes on something about to be struck: a ring drawn tight around src {x,y}, light pooling inside it
function mark(src,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), r=o.r||130, dur=o.dur||1, sd=rand(0,TAU);
  GFX.add(dur,(k,t)=>{ if(src.dead) return; const i=eo3(sat(t/.25)), out=sat((dur-t)/.1), rr=r*(2.2-1.2*i), pu=1+.2*Math.sin(t*20+sd);
    F.ring(m.m.shL,src.x,src.y,rr*.84,rr,{...C,a:i*out,gain:2*pu,t0:sd});
    if(o.glow!==0) F.quad(m.m.glowG,src.x,src.y,r*.95,r*.95,0,{...C,a:.5*i*out*pu,gain:1.1}); },o.delay||0); }
// CEILING: a storm ceiling hanging in the air at height z over (x,y), far wider than the screen: slowly turning cloud with a bright eye.
//  Handle: {a (how thick the cloud is: .5 is half transparent), g (brightness), eye (charge in the eye), fl (set to 1 to light the clouds for a moment), dead}
function ceiling(x,y,z,o={}){ const h={x,y,z,r:o.r||1500,a:1,g:1,eye:0,fl:0,dead:false}; if(!F.on) return h; const m=mm(), C=col(K.pal(o.pal||JUD)), G=col(GATE), sd=rand(0,9), dur=o.dur||4, tin=o.in??1, tout=o.out??.5;
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/tin), out=sat((dur-t)/tout), a=h.a*out, fl=h.fl>0?h.fl:0; h.fl=fl*.8;
    F.quad(m.gate,h.x,h.y,h.r,h.r,-t*.3,{z:h.z,...G,a:Math.min(1,a)*sat(t/.4),gain:.7+fl*1.0,bgain:.62+.1*h.g+fl*.8,dist:.04,n1:[1.4,1.4,.1,.06],n2:[1.2,1.2,.05,.07],rv:[.3+eo3(i)*1.0,.25,.16,.12],t0:sd});
    F.quad(m.glowS,h.x,h.y,h.r*.3,h.r*.3,0,{z:h.z,...C,a:(.25+.2*h.g+fl*.4)*a*i,gain:.9,bgain:.7});
    if(h.eye>0) F.bill(m.m.glowO,h.x,h.y,h.z,h.r*.13*h.eye,h.r*.08*h.eye,0,{...C,a:Math.min(1,h.eye)*a,gain:2}); },o.delay||0);
  return h; }
// RING: one cheap ring thrown over the floor (a single draw; K.shock is three) for hits that come in crowds
function ring1(x,y,r,o={}){ if(!F.on) return; const m=mm().m, C=col(K.pal(o.pal||ARC)), dur=o.dur||.28, sd=rand(0,9);
  GFX.add(dur,k=>{ const e=eo3(k), rr=mix(r*.15,r,e), th=r*mix(.28,.1,k); F.ring(m.shL,x,y,rr-th,rr,{...C,a:Math.min(1,(1-k)*(1-k)*1.6),gain:2.4*(o.gain||1),t0:sd}); },o.delay||0); }
// LAUNCH: everything light within R of an impact is thrown into the air and away from it (they fly before the damage wave takes them)
function launch(x,y,R){ for(const e of V.en){ if(e.dead||e.d.heavy) continue; const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy)||1; if(l>R) continue; const k=1-l/R*.6; e.vz=Math.max(e.vz,rand(900,1600)*k); e.kx+=dx/l*420*k; e.ky+=dy/l*420*k; } }
// COMET: a painted thing coming down a slanted path onto a floor point: a painted tail of fire behind it, its shadow growing under it.
//  o: {img, asp, s (half height on landing), s0 (size far away, fraction), h0, dx (how far to the side it starts), dur, ease, tail (length in sizes), tw (tail width), spin, rot, pal, tint, big, land()}
function comet(x,y,o={}){ const dur=o.dur||.5; if(!F.on){ if(o.land) after((o.delay||0)+dur,o.land); return; }
  const m=mm(), P=K.pal(o.pal||MET), C=col(P), s=o.s||100, h0=o.h0||1700, dx=o.dx??600, s0=o.s0??.7, sd=rand(0,9), ease=o.ease||(k=>k*k), tl=o.tail??7, asp=o.asp||1, n=6,
    mt=F.mat({kind:2,tex:o.img||'meteor',nz:'fbm',n1:[2,2,0,0],ero:-1,soft:.01,cB:o.tint||'#ffffff',cC:'#ffffff',gain:o.gain||1.15,op:1});
  const pos=k=>{ const e=ease(sat(k)); return [x+dx*(1-e),h0*(1-e)]; }, dl=Math.hypot(dx,h0)||1, ux=dx/dl, uz=h0/dl, tw=o.tw||1;
  GFX.add(dur,(k,t)=>{ const [px,pz]=pos(k), ss=s*mix(s0,1,k), ps=[], sh=s*(.4+1.05*k*k);
    if(o.shadow!==0) F.quad(m.m.dark,x,y,sh,sh,0,{a:Math.min(o.big?.9:.7,.12+.85*k)});
    if(o.shadow!==0&&(o.big||o.heat)) F.quad(m.m.glowG,x,y,sh*1.5,sh*1.5,0,{...C,a:.5*k*k,gain:1.1});
    for(let i=0;i<n;i++){ const u=i/(n-1), d=(1-u)*ss*tl*tw-ss*.3; ps.push({x:px+ux*d,y,z:pz+ss*.35+uz*d,w:ss*1.1*tw}); }
    if(o.big&&!(GFX.calm&&GFX.calm())) F.ribbon(m.haze,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*1.5})),{a:.8*sat(k*6),gain:.08});
    if(o.big) F.ribbon(m.tailS,ps,{cA:'#0a0608',cB:'#241614',cM:'#3c241c',cC:'#5a3424',a:.8*sat(k*6),gain:1,t0:sd});
    F.ribbon(m.tail,ps,{...C,a:sat(k*8),gain:2.7,t0:sd});
    if(o.big||s>120) F.bill(m.m.glowO,px,y,pz+ss*.35,ss*1.8,ss*1.8,0,{...C,a:.8,gain:2.2});
    F.bill(mt,px,y,pz+ss*.35,ss*asp,ss,(o.rot||0)+t*(o.spin??3),{});
    if(o.big&&Math.random()<.6) K.sparks(px+rand(-.5,.5)*ss,y,pz+ss*.4,{pal:P,n:2,sp:[200,700],up:300,life:[.3,.7],g:500}); },o.delay||0);
  if(o.land) after((o.delay||0)+dur,o.land); }
// CRATER: the painted crater a great impact leaves: scorched floor, the rock relief (alpha), a dark pit, molten light in its cracks and a core that cools
function crater(x,y,o={}){ if(!F.on) return; const m=mm(), C={cA:'#200404',cB:'#c02a06',cM:'#ff7a1a',cC:'#ffc060'}, r=o.r||600, life=o.life||5;
  if(o.lite){ GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.2)), heat=Math.pow(1-k,1.4), out=sat((1-k)/.2);
      F.quad(m.craR,x,y,r,r*1.3,0,{cA:'#030202',cB:'#231b19',cM:'#453a35',cC:'#6e6058',a:out*.95,gain:1,rv:[i*.86,.3,0,.1]});
      F.quad(m.craH,x,y,r,r*1.3,0,{...C,a:Math.min(1,heat*1.4),gain:1.9*(.35+.65*heat),bgain:1.1,ero:.14+.5*(1-heat),rv:[i*.8,.3,0,.1]}); },o.delay||0); return; }
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.25)), heat=Math.pow(1-k,1.4), out=sat((1-k)/.2);
    F.quad(m.m.dark,x,y,r*.9,r*1.15,0,{a:out*.6*i});
    F.quad(m.craR,x,y,r,r*1.3,0,{cA:'#030202',cB:'#231b19',cM:'#453a35',cC:'#6e6058',a:out*.95,gain:1,rv:[i*.86,.3,0,.1]});
    F.quad(m.m.dark,x,y,r*.4,r*.5,0,{a:out*.85*i});
    F.quad(m.craH,x,y,r,r*1.3,0,{...C,a:Math.min(1,heat*1.4),gain:1.9*(.35+.65*heat),bgain:1.1,ero:.14+.5*(1-heat),rv:[i*.8,.3,0,.1]});
    if(o.rim) F.ring(m.m.shW,x,y,r*.4,r*.62,{...C,a:heat*.8,gain:1.3,t0:r});
    F.quad(m.m.glowG,x,y,r*.34,r*.4,0,{...C,a:heat*(.75+.25*Math.sin(t*5)),gain:1.6}); },o.delay||0); }
// CHUNKS: slabs of floor thrown up by an impact: painted boulders on ballistic arcs, each with its shadow sliding under it; they land, sit, and crumble away
function chunks(x,y,o={}){ if(!F.on) return; const m=mm(), n=o.n||6, g=3600, L=[]; let dur=0;
  for(let i=0;i<n;i++){ const a=(i+rand(0,.8))/n*TAU, sp=rand(520,1250), c={vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(1500,2500),s:rand(o.s0||50,o.s||120),rot:rand(0,TAU),vr:rand(-5,5),fl:Math.random()<.5}; c.tl=2*c.vz/g; dur=Math.max(dur,c.tl+.75); L.push(c); }
  GFX.add(dur,(k,t)=>{ for(const c of L){ const tt=Math.min(t,c.tl), px=x+c.vx*tt, py=y+c.vy*tt, z=Math.max(0,c.vz*tt-.5*g*tt*tt), a=t>c.tl+.35?sat(1-(t-c.tl-.35)/.4):1; if(a<=0) continue;
      F.quad(m.m.dark,px,py,c.s*(1+z*.0015),c.s*(1+z*.0015),0,{a:.6*a/(1+z*.003)});
      F.bill(m.rock,px,py,z+c.s*.75,c.s,c.s,c.rot+c.vr*tt,{a,ero:.02+(1-a)*.7,uvT:c.fl?[-1,1,1,0]:[1,1,0,0]}); } },o.delay||0); }
// DUST RING: the dark roll of smoke and grit that hugs the floor outward from a great impact (alpha, under the characters)
function dustRing(x,y,r,o={}){ if(!F.on) return; const m=mm(), dur=o.dur||1.4, rot=rand(0,TAU);
  GFX.add(dur,k=>{ const e=eo3(k), rr=r*(.3+.7*e); F.quad(m.dustR,x,y,rr,rr,rot+k*.3,{a:Math.min(1,(1-k)*1.6)*(o.a??.8),ero:.08+.4*k}); },o.delay||0); }
// ---------------------------------------------------------------- pieces of the normal skills (one shape each: comet stem / sky bolt / satellite / chain / ice crown / funnel / broken rim / star shard / ray)
const CWH=P=>({cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'});
// ZAP: lightning strung between two points in the air {x,y,z}: a soft violet mantle, the painted forked arc, a white wire down its middle.
// It is drawn from a to b in a blink, is redrawn in a new shape twice (lightning does that) and burns out; its length never changes.
//  o: {w, dur, n, jit (sideways throw as a fraction of its length), pal, gain, delay, sky:1 (a is far above the screen: do not pinch that end)}
function zap(a,b,o={}){ if(!F.on) return; const m=mm(), P=K.pal(o.pal||ARC), C=col(P), CW=CWH(P), dur=o.dur||.3, n=o.n||9, len=Math.hypot(b.x-a.x,(b.y-b.z)-(a.y-a.z))||1, w=o.w||Math.max(60,len*.12), jit=o.jit??.05, sd=rand(0,9), g=o.gain||1,
    sh=[0,1,2].map(()=>{ const s=[]; for(let i=0;i<n;i++) s.push([rand(-1,1),rand(-1,1)]); return s; });
  GFX.add(dur,(k,t)=>{ const fr=k<.22?0:k<.45?1:2, J=sh[fr], f=sat((k-.45)/.55), dr=sat(t/.035), ps=[];
    for(let i=0;i<n;i++){ const u=i/(n-1)*dr, e=o.sky?Math.min(1,(1-u)*5):Math.pow(Math.sin(Math.PI*u),.6), j=len*jit*(o.sky?Math.min(1,(1-u)*3):e);
      ps.push({x:mix(a.x,b.x,u)+J[i][0]*j,y:mix(a.y,b.y,u),z:Math.max(0,mix(a.z,b.z,u)+J[i][1]*j*.6),w:w*(.45+.55*e)*(1-f*.55)}); }
    F.ribbon(m.m.trB,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.85})),{...C,a:.7*(1-f),gain:1.8*g,t0:sd,fd:[.06,.06,0,0],pm:[2,2.2,0,0]});
    F.ribbon(m.arcH,ps,{...C,a:(fr===1?.75:1)*(1-f*f),gain:3.1*g,ero:.08+f*.65,t0:sd,uvT:fr===0?[1,1,0,0]:fr===1?[1,-1,0,1]:[-1,1,1,0]});
    F.ribbon(m.m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.2})),{...CW,a:1-f,gain:4.6*g,ero:.1+f*.7,t0:sd+3}); },o.delay||0); }
// SKYBOLT: one stem of lightning from above the top of the screen down to a floor point (or a body on it). Always the same height.
function skybolt(x,y,o={}){ zap({x:x+(o.lean??rand(-1,1)*170),y,z:view().hh*2+300},{x,y,z:o.z||0},{pal:o.pal,w:o.w||95,dur:o.dur||.3,n:13,jit:o.jit??.03,sky:1,gain:o.gain,delay:o.delay}); }
// GROUND: where a sky bolt meets a body: a white-hot knot on it, the branching burn flashing out over the stone under it and cooling, sparks thrown up
function ground(e,P,pw=1){ if(!F.on) return; const m=mm(), C=col(P), CW=CWH(P), x=e.x, y=e.y, z=e.h*.45+e.z, r=150*pw, rot=rand(0,TAU); e.flash=1;
  GFX.add(.4,(k,t)=>{ const g=eo3(sat(t/.05)), heat=(1-k)*(1-k); F.quad(m.sco,x,y,r*(.6+.5*g),r*(.6+.5*g),rot,{...C,a:Math.min(1,heat*1.6),gain:3*(.3+.7*heat),ero:.1+.55*k,rv:[g*1.3,.3,0,.1]});
    if(k<.4){ const a=1-k/.4; F.bill(m.m.glowO,x,y,z,r*.9,r*.9,0,{...C,a:a*.9,gain:2.4}); F.bill(m.m.glowO,x,y,z,r*.34,r*.5,0,{...CW,a,gain:3}); } });
  K.sparks(x,y,z,{pal:P,n:Math.round(9*pw),sp:[300,1200],up:1100,life:[.15,.45],s:3}); }
// STATIC: charge gathering at the feet of something about to be struck (follows src {x,y}): a branching burn on the stone that only gets brighter
function staticFx(src,dur,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), r=o.r||115, sd=rand(0,TAU);
  GFX.add(dur,(k,t)=>{ if(src.dead) return; const rr=r*(.6+.4*k);
    F.quad(m.sco,src.x,src.y,rr,rr,sd,{...C,a:sat(t/.03),gain:1.2+2.2*k,ero:.3-.2*k,rv:[.5+k*.8,.3,0,.1]});
    F.quad(m.m.glowG,src.x,src.y,r,r,0,{...C,a:.55*k,gain:1.1}); },o.delay||0); }
// COMET: the basic shot riding a projectile p: a stem of light of fixed length laid along the path it really flew, so the bend of its
// flight is its shape. A white wire inside a violet ribbon, a hot bead at the head. When p dies the tail runs up into the point of impact.
function cometFx(p){ const h={life:1,rot:0}; if(!F.on) return h; const m=mm().m, C=col(ARC), CW=CWH(ARC), sd=rand(0,9), H=[], LEN=520, n=10, z1=p.h||BODY*.5, z0=p.z0??z1; let end=-1;
  if(p.z0!=null) H.push({x:p.x,y:p.y,z:z0});
  const E=GFX.add(1.8,(k,t)=>{ if(h.life<=0&&end<0) end=t; const o=end<0?0:sat((t-end)/.09); if(o>=1){ E.dead=true; return; }
    // it leaves the staff's tip and comes down to chest height in its first tenth of a second: the stem is laid from the tip itself
    const z=mix(z0,z1,eo3(sat(t/.13)));
    if(!H.length||Math.hypot(p.x-H[0].x,p.y-H[0].y)>16){ H.unshift({x:p.x,y:p.y,z}); if(H.length>36) H.pop(); }
    const Q=[{x:p.x,y:p.y,z},...H], cum=[0]; for(let i=1;i<Q.length;i++) cum.push(cum[i-1]+Math.hypot(Q[i].x-Q[i-1].x,(Q[i].y-Q[i-1].y)/FSY,Q[i].z-Q[i-1].z));
    const tot=Math.min(LEN*(1-o),cum[cum.length-1]), ps=[];
    if(tot>=24){ for(let q=0;q<n;q++){ const u=q/(n-1), d=(1-u)*tot; let i=1; while(i<cum.length-1&&cum[i]<d) i++; const f=sat((d-cum[i-1])/((cum[i]-cum[i-1])||1));
        ps.push({x:mix(Q[i-1].x,Q[i].x,f),y:mix(Q[i-1].y,Q[i].y,f),z:mix(Q[i-1].z,Q[i].z,f),w:(10+96*Math.pow(u,.8))*(1-o*.4)}); }
      F.ribbon(m.trB,ps,{...C,a:1,gain:3,t0:sd,fd:[.7,.02,0,0]});
      F.ribbon(m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.42})),{...CW,a:1,gain:4.6,t0:sd,fd:[.6,.02,0,0]}); }
    F.quad(m.glowG,p.x,p.y,210,210,0,{...C,a:.7*(1-o),gain:1.2});
    // the head: two swept fins off the point (an arrowhead, so the shot has a shape of its own), a hot bead in its notch
    { const va=Math.atan2(p.vy,p.vx), fl=230*(1-o);
      for(const sg of [-1,1]){ const b=va+Math.PI+sg*.55, fp=[]; for(let q=0;q<4;q++){ const u=q/3; fp.push({x:p.x+Math.cos(va)*64+Math.cos(b)*fl*u,y:p.y+Math.sin(va)*64+Math.sin(b)*fl*u,z,w:50*(1-u*u)+3}); }
        F.ribbon(m.trB,fp,{...C,a:1,gain:3.2,t0:sd+sg,fd:[.02,.5,0,0]}); F.ribbon(m.trC,fp.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.4})),{...CW,a:1,gain:4.6,t0:sd+sg,fd:[.02,.5,0,0]}); } }
    F.bill(m.glowO,p.x,p.y,z,170,170,0,{...C,a:.8*(1-o),gain:2.2});
    F.bill(m.glowO,p.x,p.y,z,84,84,0,{...CW,a:1-o,gain:3.2}); }); return h; }
// PIERCE: the basic shot going through a body: a needle of light along its flight through the chest, a ring thrown off its feet, the burn on the stone cooling after
function pierce(e,a){ if(!F.on||e.dead) return; const m=mm().m, C=col(ARC), CW=CWH(ARC), sd=rand(0,9), x=e.x, y=e.y, z=e.h*.5+e.z, c=Math.cos(a), s=Math.sin(a);
  GFX.add(.2,(k,t)=>{ const g=eo3(sat(t/.05)), f=sat((k-.4)/.6), L0=-90+250*f, L1=90+250*g, ps=[]; for(let q=0;q<5;q++){ const u=q/4, d=mix(L0,L1,u); ps.push({x:x+c*d,y:y+s*d,z,w:(30*Math.sin(Math.PI*Math.pow(u,1.6))+3)*(1-f*.5)}); }
    F.ribbon(m.trB,ps,{...C,a:1-f,gain:3.2,t0:sd,fd:[.3,.3,0,0]}); F.ribbon(m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.45})),{...CW,a:1-f,gain:4.8,t0:sd,fd:[.3,.3,0,0]});
    if(k<.5) F.bill(m.glowO,x,y,z,80,80,0,{...CW,a:1-k*2,gain:3}); });
  ring1(x,y,190,{dur:.3,gain:1.1}); scorch(x,y,{r:120,life:.75,grow:.06,gain:.9}); }
// SATELLITE: a ball of plasma inside turning gyroscope rings, its light pooled on the floor under it. It grows once (62 -> 90) and holds.
//  o = the orb record of surv.js (x, y, h, life)
function satFx(o,i,nr=2){ const h={life:1,rot:0}; if(!F.on) return h; const m=mm(), P=i%2?AZV:ARC, C=col(P), CW=CWH(P), sd=i*1.7; let end=-1;
  const ob=K.vorb(o.x,o.y,o.h,{r:40,dur:o.life+.4,pal:P,in:.12,out:.05,spin:3.4,core:.5,heat:.8,gain:.9});
  const E=GFX.add(o.life+.35,(k,t)=>{ if(h.life<=0&&end<0) end=t; const out=end<0?1:1-sat((t-end)/.2); if(out<=0){ E.dead=true; ob.dead=true; return; }
    // born on the staff: it swells there and swings out onto its orbit in its first third of a second (no arcs, no rings - the ball alone)
    const g=eo3(sat(t/.32)), r=mix(30,78,g), a=sat(t/.08)*out, tq=g<1?tip():null, ox=tq?mix(tq.x,o.x,g):o.x, oy=tq?mix(pl.gy,o.y,g):o.y, z=tq?mix(tq.z,o.h,g):o.h, pu=1+.12*Math.sin(t*9+sd);
    ob.x=ox; ob.y=oy; ob.z=z; ob.a=out; ob.r=r;
    // its wake: the stretch of orbit it has just flown, wide at the ball and drawn out to nothing behind it
    if(g>=1){ const RR=o.R??270, cx=o.x-Math.cos(o.a)*RR, cy=o.y-Math.sin(o.a)*RR*.8, sp=1.5*sat((t-.32)/.4), NW=14, ps=[];
      for(let j=NW-1;j>=0;j--){ const u=j/(NW-1), q=o.a-u*sp; ps.push({x:cx+Math.cos(q)*RR,y:cy+Math.sin(q)*RR*.8,z,w:(r*.7*Math.pow(1-u,1.3)+2)*a}); }
      F.ribbon(m.m.trB,ps,{...C,a:.8*a,gain:2.4,t0:sd,fd:[.75,.02,0,0]}); F.ribbon(m.m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.26})),{...CW,a:a,gain:4.2,t0:sd,fd:[.7,.02,0,0]}); }
    F.quad(m.m.glowG,ox,oy,r*2.4,r*2.4,0,{...C,a:.85*a,gain:1.6});
    // the core: a hard white heart with a four-pointed glint, inside the plasma (an energy core, not a ball of wool)
    F.bill(m.m.glowO,ox,oy,z,r*1.5,r*1.5,0,{...C,a:.7*a,gain:2.2}); F.bill(m.m.glowO,ox,oy,z,r*.62*pu,r*.62*pu,0,{...CW,a,gain:3.4});
    F.bill(m.m.glowO,ox,oy,z,r*2.1*pu,r*.13,.4+t*1.3,{...CW,a,gain:3}); F.bill(m.m.glowO,ox,oy,z,r*.13,r*2.1*pu,.4+t*1.3,{...CW,a,gain:3}); });
  return h; }
// CROWN: ice thrown up in a ring round a point, every spike leaning outward. They come up one after another round the circle, stand
// with their veins cooling, then crack. The ones between the centre and the camera are kept short so what stands inside is not hidden.
function crown(x,y,r,n,life,o={}){ if(!F.on||!F.solid) return; const a0=rand(0,TAU), L=[], hh=o.h||250;
  for(let i=0;i<n;i++){ const a=a0+(i+rand(-.25,.25))/n*TAU, near=sat(Math.sin(a)*1.4); L.push({a,rr:r*rand(.9,1.12),h:hh*rand(.8,1.25)*(1-.4*near),v:i%4,rz:rand(0,TAU),d:i*.014,lean:rand(.3,.5)}); }
  L.sort((p,q)=>Math.sin(p.a)-Math.sin(q.a));
  GFX.add(life,(k,t)=>{ const f=sat((t-(life-.22))/.22), ht=sat(1-t/.45);
    for(const c of L){ const e=eo3(sat((t-c.d)/.07)); if(e<=0) continue;
      F.solid('crystal',c.v,x+Math.cos(c.a)*c.rr,y+Math.sin(c.a)*c.rr*FSY,-c.h*.6*(1-e)-f*24,{M:F.xf({s:c.h,ry:c.lean,rz:c.a}),alb:'#4f9cc8',emis:FRO.b,rimC:FRO.h,spec:1.4,rim:.36,vein:.3+.7*ht,heat:.08+1*ht,ero:f*.9,bump:.6,tone:.22,shadow:[.5,.3,.45*(1-f)]}); } },o.delay||0);
  after((o.delay||0)+life-.2,()=>{ K.chunks(x,y,{n:o.cn||7,r:r,sp:[160,520],up:800,s:[18,44],pal:FRO,kind:'crystal',rock:'#4f9cc8',life:.9}); for(let i=0;i<4;i++){ const c=L[(i*3)%L.length]; K.sparks(x+Math.cos(c.a)*c.rr,y+Math.sin(c.a)*c.rr*FSY,c.h*.4,{pal:FRO,n:4,sp:[150,600],up:500,life:[.2,.45]}); } }); }
// WELL: a funnel that tightens for its whole life - narrower and taller, never back - round a dark star hanging in its throat that only grows
// One thing, lying on the ground: a whirlpool of light whose arms run in over the stone and climb, at the last, into a dark star that
// hangs just over its eye. No smoke. Every body inside is tied to the star by a thread that drags at it. It winds tighter for its whole
// life and, in its last quarter second, falls in on itself (the star swallows the arms) - the burst that follows is the skill's own.
function wellFx(x,y,R,dur){ const h={life:1}; if(!F.on) return h; const m=mm(), C=col(GRAV), CW=CWH(GRAV), sd=rand(0,TAU), NA=5, NP=14;
  GFX.add(dur,(k,t)=>{ const i=eo3(sat(t/.3)), cl=sat((t-(dur-.28))/.28), a=i, hs=R*mix(.15,.27,k)*(1+.5*cl), z=R*.42+hs*.4, RO=R*mix(1.3,1.05,k)*(1-.7*cl*cl);
    // the pit it turns in: the floor goes dark under it and is lit violet round the rim
    F.quad(m.m.glowG,x,y,R*1.25,R*1.25,0,{...C,a:.6*a*(1-cl),gain:1.15});
    F.quad(m.m.dark,x,y,R*.8*i,R*.8*i,0,{a:.75*a});
    // the arms: wound in over the stone, thick in the middle of their run, climbing into the star over the last third
    for(let q=0;q<NA;q++){ const ps=[], a0=sd+q*TAU/NA+t*(2.6+3.4*k); for(let j=0;j<NP;j++){ const u=j/(NP-1), rr=mix(RO,hs*.3,Math.pow(u,.85)), g=a0+u*(3+1.8*k), up=sat((u-.62)/.38); ps.push({x:x+Math.cos(g)*rr,y:y+Math.sin(g)*rr*FSY,z:5+z*up*up,w:R*.17*Math.pow(Math.sin(Math.PI*Math.min(1,u*1.04)),.7)*(q%2?.72:1)*(1-.5*cl)+2}); }
      F.ribbon(m.m.trB,ps,{...C,a:.9*a,gain:2.4,t0:sd+q,fd:[.4,.04,0,0]}); F.ribbon(m.m.trC,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*.3})),{...CW,a:a,gain:4.2,t0:sd+q,fd:[.4,.04,0,0]}); }
    // the threads: every body inside is tied to the star (one strip for all of them)
    { const ps=[]; let c=0; for(const e of V.en){ if(e.dead||c>=7) continue; const l=Math.hypot(e.x-x,(e.y-y)/FSY); if(l>R*1.15||l<hs) continue; c++; const ez=e.h*.55+e.z;
        if(ps.length){ const p=ps[ps.length-1]; ps.push({x:p.x,y:p.y,z:p.z,w:0},{x:e.x,y:e.y,z:ez,w:0}); }
        for(let j=0;j<6;j++){ const u=j/5, wv=Math.sin(u*9-t*18+c)*14*Math.sin(Math.PI*u); ps.push({x:mix(e.x,x,u),y:mix(e.y,y,u),z:mix(ez,z,u)+wv,w:mix(44,10,u)}); } }
      if(ps.length>1){ F.ribbon(m.m.trB,ps,{...C,a:.85*a,gain:2.4,t0:sd,fd:[0,0,0,0]}); F.ribbon(m.m.trC,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*.3})),{...CW,a,gain:4.2,t0:sd,fd:[0,0,0,0]}); } }
    // the dark star: a black body with a lit limb and a disc of fire tilted round it, low over the eye where the arms end
    F.bill(m.m.glowO,x,y,z,hs*3*(1-.6*cl),hs*3*(1-.6*cl),0,{...C,a:a*.9,gain:2.2});
    F.bill(m.m.glowO,x,y,z,hs*1.45*(1-.6*cl),hs*1.45*(1-.6*cl),0,{...CW,a,gain:2.8+2*cl});
    { const ds=hs*(1-.85*cl)/(1+.5*cl); F.lathe(m.gyro,x,y,z,{r0:ds*1.3,r1:ds*2.2,M:F.xf({rx:1.3,ry:.22,rz:-t*(6+8*k)+sd}),...CW,a,gain:3,t0:sd}); }
    F.bill(m.hole,x,y,z,hs*1.05*(1-cl),hs*1.05*(1-cl),0,{a}); });
  GFX.light(x,y,R*2,GRAV.l,.8,.4,{hold:dur-.3,z:120}); return h; }
// WARD: a low rim of plasma round the follow point v in three broken arcs that turn slowly; each arc swells along its length and tapers
// to nothing at both ends (so it never reads as a flat ring)
// Nothing circles her (that is the orbs' shape). The field is the ground itself, electrified: a disc of lit stone bounded by one closed,
// jagged wall of lightning that crawls but stays where it is, and a web of arcs that runs over the stone from her feet on every beat
// (thrown by the skill, see mg_field). The wall is drawn outward from her when it is cast and burns out round its length at the end.
function wardFx(v,R,dur){ const h={life:1}; if(!F.on) return h; const m=mm(), C=col(ARC), CW=CWH(ARC), sd=rand(0,9), N=40, lt=GFX.light(v.x,v.y,R*2.1,ARC.l,.6,.3,{hold:dur,z:60}), J=[];
  for(let j=0;j<N;j++) J.push([rand(-1,1),rand(.5,1.4),rand(0,TAU)]);
  const E=GFX.add(dur,(k,t)=>{ if(h.life<=0&&t<dur-.3){ lt.hold=0; E.dead=true; return; } const i=eo3(sat(t/.22)), f=sat((t-(dur-.3))/.3), bt=v.beat?Math.exp(-(RT-v.beat)*7):0, ps=[]; lt.x=v.x; lt.y=v.y;
    // the ground it holds: dark under a violet light that fills it edge to edge, brighter for an instant on every beat
    F.quad(m.m.dark,v.x,v.y,R*i,R*i,0,{a:.34*(1-f)});
    F.quad(m.m.glowG,v.x,v.y,R*1.3*i,R*1.3*i,0,{...C,a:(.5+.35*bt)*(1-f),gain:1.15});
    // the wall: one closed line of lightning standing knee-high on the rim, its weight uneven along it and crawling slowly
    for(let j=0;j<=N;j++){ const q=J[j%N], a=j/N*TAU, rr=R*i*(1+.014*q[0]+.008*Math.sin(t*5+q[2])); ps.push({x:v.x+Math.cos(a)*rr,y:v.y+Math.sin(a)*rr*FSY,z:46+16*Math.sin(t*3+q[2]),w:R*.1*q[1]*(1+.3*Math.sin(a*3+t*1.6+sd))*(1+.5*bt)*(1-f*.6)}); }
    F.ribbon(m.m.trB,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*1.8})),{...C,a:.8*(1-f),gain:2+bt,t0:sd,fd:[0,0,0,0],pm:[2,2.2,0,0]});
    F.ribbon(m.arcH,ps,{...C,a:1-f*f,gain:3.1+1.4*bt,ero:.08+f*.75,t0:sd,fd:[0,0,0,0]});
    F.ribbon(m.m.trC,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:Math.max(7,p.w*.24)})),{...CW,a:1-f,gain:4.5,ero:.1+f*.7,t0:sd+3,fd:[0,0,0,0]}); });
  return h; }
// STAR SHARD: a splinter of a star coming down a slanted line onto a floor point: the crystal itself, a tail of fixed length straight
// behind it, its shadow closing under it. o: {fall, delay, sx (+1 from the right, -1 from the left), v}
const SH_DX=520, SH_H0=1500, SH_LEAN=Math.atan2(SH_DX,SH_H0);
function starShard(x,y,o={}){ if(!F.on||!F.solid) return; const m=mm().m, C=col(STA), CW=CWH(STA), fall=o.fall||.42, sx=o.sx||1, s=270, TL=620, len=Math.hypot(SH_DX,SH_H0), ux=SH_DX*sx/len, uz=SH_H0/len, sd=rand(0,9), n=6, ob=null;
  GFX.add(fall,(k,t)=>{ const e=k*(.4+.6*k), px=x+SH_DX*sx*(1-e), pz=SH_H0*(1-e), tl=TL*sat(t/.08), ps=[], sh=s*(1.5-.9*k), hx=px+ux*s*.45, hz=pz+uz*s*.45;
    // where it will land: a shadow and a ring that close on the point together, the stone lighting under them
    F.quad(m.dark,x,y,sh,sh,0,{a:.15+.55*k});
    F.quad(m.glowG,x,y,sh*1.3,sh*1.3,0,{...C,a:.2+.5*k*k,gain:1.15});
    { const rr=s*(1.45-.75*k); F.ring(m.shL,x,y,rr*.62,rr,{...C,a:.3+.6*k,gain:1.1+1.1*k,t0:sd}); }
    for(let q=0;q<n;q++){ const u=q/(n-1), d=(1-u)*tl+s*.5; ps.push({x:px+ux*d,y,z:pz+uz*d,w:6+70*Math.pow(u,1.25)}); }
    F.ribbon(m.trB,ps,{...C,a:1,gain:3.2,t0:sd,fd:[.7,.02,0,0]});
    F.ribbon(m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.34})),{...CW,a:1,gain:4.6,t0:sd,fd:[.6,.02,0,0]});
    F.solid('crystal',o.v|0,px,y,pz,{M:F.xfw({s,rz:o.rz||0,ry:SH_LEAN*sx}),alb:'#4a30a8',emis:STA.b,rimC:'#fff2d2',spec:1.6,rim:.5,vein:.9,heat:.55,bump:.7,tone:.22,clip:0});
    // its head: a ball of violet plasma round the splinter and a four-pointed glint on it - a star, not a bar
    if(ob){ ob.x=hx; ob.y=y; ob.z=hz; }
    { const tw=1+.12*Math.sin(t*40+sd); F.bill(m.glowO,hx,y,hz,300*tw,22,.5,{...CW,a:1,gain:3}); F.bill(m.glowO,hx,y,hz,22,300*tw,.5,{...CW,a:1,gain:3}); F.bill(m.glowO,hx,y,hz,150,150,0,{...C,a:.9,gain:2.2}); } },o.delay||0); }

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
  mg_ult1:{cls:'mage',type:'ult',name:'천뢰주',lv:3,desc:'궁극기. 먹구름에서 내린 낙뢰로 화면의 모든 적에게 전하를 새기고, 하늘에서 땅까지 선 뇌광 기둥이 세 번 맥동해 전부 터뜨린다.'},
  mg_ult2:{cls:'mage',type:'ult',name:'종언의 별',lv:12,desc:'궁극기. 하늘 끝에서 사선으로 떨어지는 별 하나가 전장에 꽂혀 화면의 모든 적을 날려 버리고, 튀어 나간 별 조각이 사방에서 다시 터진다.'},
  mg_ult3:{cls:'mage',type:'ult',name:'빙옥',lv:5,desc:'궁극기. 냉기의 파도가 세 번 화면 끝까지 굴러 모든 적을 얼리고, 등 뒤에 솟은 빙산이 산산조각 나며 얼어붙은 적을 전부 깨뜨린다.'},
};
const order=Object.keys(sk);

// floor angle (true, unsquashed) of a floor-space direction: what K3.ehit / K3.ray take
const fdir=(dx,dy)=>Math.atan2(dy/FSY,dx);
const hyp=e=>Math.hypot(e.x-pl.x,(e.y-pl.gy)/FSY);
// FLING: a body this blow has just killed is thrown the way the blow went instead of fading where it stood (outside an ultimate the engine
// leaves a corpse in place, so a kill showed no reaction at all). Call right after the dmg() that killed it. o: {dir | sx,sy, push, up}
function fling(e,o={}){ if(!e||!e.dead) return; const q=V.dying[V.dying.length-1]; if(!q||q.vx!=null||q.e.x!==e.x||q.e.y!==e.y) return; let ux, uy;
  if(o.dir!=null){ ux=Math.cos(o.dir); uy=Math.sin(o.dir)*FSY; } else { const dx=e.x-(o.sx??pl.x), dy=e.y-(o.sy??pl.gy), l=Math.hypot(dx,dy)||1; ux=dx/l; uy=dy/l; }
  const sp=(o.push??160)*3.4*(e.d.heavy?.4:1); q.vx=ux*sp; q.vy=uy*sp; q.vz=420+(o.up||0)*.5; q.spin=rand(4,9)*(ux<0?-1:1); q.life=.6; }
// HIT: damage with its reaction - the living are pushed and lifted (dmg's push/up), the killed are flung
function hit(e,d,o={}){ if(!e||e.dead) return; dmg(e,d,o); fling(e,o); }
// basic: a comet that leaves the staff's tip at once, drops to chest height as it bends onto its target and goes through the body as a needle
// of light; the body is knocked along its flight and static clings a moment
function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); quick(true); const n=1+Math.floor((L('mg_basic')+1)/2), d=1300*A.mul('mg_basic'), tp=tip(), side=Math.random()<.5?1:-1;
  for(let k=0;k<n;k++) after(k*.06,()=>{ const tq=tip(), b=a+(n>1?(k-(n-1)/2)*.42:side*.4), p={x:tq.x,y:pl.gy,z0:tq.z,vx:Math.cos(b)*1500,vy:Math.sin(b)*1500,life:1.4,d:0,dd:d,r:70,home:e,turn:7,c:C1,v:{x:tq.x,y:tq.y-tq.z},h:BODY*.5,spin:false};
    p.fx=cometFx(p);
    p.onHit=(e,p)=>{ const dir=fdir(p.vx,p.vy); pierce(e,Math.atan2(p.vy,p.vx)); K.ehit(e,{pal:ARC,pw:.8,dir,light:0}); hit(e,p.dd,{kb:0,push:170,dir,sx:p.x-p.vx,sy:p.y-p.vy}); K.mark(e,'shock',{dur:.7,pal:ARC}); GFX.light(e.x,e.y,340,ARC.l,.7,.3,{z:e.h*.5}); };
    V.pj.push(p); });
  K.flare(tp.x,tp.y,tp.z,{pal:ARC,s:110,dur:.14,gain:2.4}); sfx('whoosh',1.8,.4); sfx('slash',1.7,.25);
  return true; }

// SEAR: where the ray is passing through a body: a white-hot spot on the ray's own line at that body (not on the body's feet), the cut
// glowing across its chest along the ray for a moment after
function sear(e,h){ if(!F.on) return; const m=mm().m, C=col(ARC), CW=CWH(ARC), c=Math.cos(h.dir), s=Math.sin(h.dir), d=Math.max(0,(e.x-h.x)*c+(e.y-h.y)/FSY*s), x=h.x+c*d, y=h.y+s*d*FSY, z=h.z, sa=Math.atan2(-s*FSY,c);
  GFX.add(.24,(k,t)=>{ const a=(1-k)*(1-k); F.bill(m.glowO,x,y,z,150+90*k,150+90*k,0,{...C,a:.9*a,gain:2.4}); F.bill(m.glowO,x,y,z,210,26*(1-k),sa,{...CW,a,gain:3.2}); F.bill(m.glowO,x,y,z,60,60,0,{...CW,a,gain:3.2}); });
  K.sparks(x,y,z,{pal:ARC,n:4,dir:h.dir,spread:.9,sp:[400,1300],up:500,life:[.15,.35],s:3}); }
// SHACKLE: what the chain leaves on a body it has passed through: a hoop of arc turning round its waist and a hot bead on its chest, held
// until the charge goes off (so the bodies on the chain can be counted)
function shackle(e,dur){ if(!F.on) return; const m=mm(), C=col(AZV), CW=CWH(AZV), sd=rand(0,TAU), r=Math.max(70,e.h*.42);
  GFX.add(dur,(k,t)=>{ if(e.dead) return; const i=eo3(sat(t/.1)), o=sat((dur-t)/.12), z=e.h*.5+e.z, a=i*o;
    F.lathe(m.gyro,e.x,e.y,z,{r0:r*1.0,r1:r*1.3,M:F.xf({rx:1.2,ry:.25*Math.sin(t*5+sd),rz:t*7+sd}),...C,a,gain:3.2,t0:sd});
    F.bill(m.m.glowO,e.x,e.y,z,r*.75,r*.75,0,{...C,a:.8*a,gain:2.2}); F.bill(m.m.glowO,e.x,e.y,z,r*.3,r*.3,0,{...CW,a,gain:3}); }); }

// KNOT: the knot of charge the staff hangs over a head: a small ball of plasma that swells until it lets its stroke go, then is spent
function knotFx(q,dur,delay){ if(!F.on) return; const m=mm().m, C=col(ARC), CW=CWH(ARC), ob=K.vorb?K.vorb(q.x,q.y,q.z,{r:20,dur:dur+.05,pal:ARC,in:.04,out:.08,spin:7,core:.5,heat:.9,gain:1,delay}):null;
  GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/.1)), o=sat((dur-t)/.1), r=16+30*g; if(ob){ ob.r=r; ob.a=o; }
    F.bill(m.glowO,q.x,q.y,q.z,r*2.2,r*2.2,0,{...C,a:.7*g*o,gain:2}); F.bill(m.glowO,q.x,q.y,q.z,r*.8,r*.8,0,{...CW,a:g*o,gain:3.2}); },delay||0); }
// CHAIN: the whole chain of lightning kept as one drawing for as long as it lives: taut links of fixed shape from the staff's tip to the
// first body and on from body to body, a turning hoop and a hot bead on every body it holds. Links follow their two ends. When it is
// let go (h.fire()) every link flares white at once, then the chain burns out; it never changes hue.
function chainFx(){ const h={N:[],L:[],t:0,end:-1,dead:false,node(){ return 0; },link(){},fire(){ h.end=h.t; }}; if(!F.on) return h; const m=mm(), C=col(ARC), CW=CWH(ARC), sd=rand(0,9), n=7;
  h.node=(e,r)=>{ h.N.push(e?{e,x:e.x,y:e.y,z:e.h*.55+e.z,r:r||Math.max(50,Math.min(80,e.h*.3)),t:h.t,sd:rand(0,TAU)}:{tip:1,x:0,y:0,z:0,t:h.t}); return h.N.length-1; };
  h.link=(a,b)=>{ const J=[], Kz=[]; for(let i=0;i<n;i++){ J.push(rand(-1,1)); Kz.push(rand(-1,1)); } h.L.push({a,b,J,Kz,t:h.t,sd:rand(0,9)}); };
  const E=GFX.add(5,(k,t)=>{ h.t=t; if(h.end>=0&&t-h.end>.34){ E.dead=true; h.dead=true; return; } const o=h.end<0?0:sat((t-h.end-.06)/.28), fl=h.end<0?0:Math.exp(-(t-h.end)*11), ps=[];
    for(const q of h.N){ if(q.tip){ const p=tip(); q.x=p.x; q.y=p.y; q.z=p.z; } else if(!q.e.dead){ q.x=q.e.x; q.y=q.e.y; q.z=q.e.h*.55+q.e.z; } }
    for(const l of h.L){ const a=h.N[l.a], b=h.N[l.b], g=eo3(sat((t-l.t)/.07)), len=Math.hypot(b.x-a.x,(b.y-a.y)/FSY)||1, nx=-(b.y-a.y)/FSY/len, ny=(b.x-a.x)/len; if(g<.05) continue;
      if(ps.length){ const p=ps[ps.length-1]; ps.push({x:p.x,y:p.y,z:p.z,w:0},{x:a.x,y:a.y,z:a.z,w:0}); }
      for(let i=0;i<n;i++){ const v=i/(n-1), u=v*g, e=Math.sin(Math.PI*v), j=len*.05*e*(l.J[i]+.3*Math.sin(t*21+i*1.9+l.sd));
        ps.push({x:mix(a.x,b.x,u)+nx*j,y:mix(a.y,b.y,u)+ny*j*FSY,z:Math.max(0,mix(a.z,b.z,u)+len*.04*e*l.Kz[i]),w:(34+20*e)*(1+.9*fl)*(1-o*.55)}); } }
    if(ps.length>1){ F.ribbon(m.m.trB,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*1.8})),{...C,a:.75*(1-o),gain:1.9+2.2*fl,t0:sd,fd:[0,0,0,0],pm:[2,2.2,0,0]});
      F.ribbon(m.arcH,ps,{...C,a:1-o*o,gain:3+2.4*fl,ero:.08+o*.7,t0:sd,fd:[0,0,0,0]});
      F.ribbon(m.m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w>0?Math.max(8,q.w*.28):0})),{...CW,a:1-o,gain:4.6+2*fl,ero:.1+o*.7,t0:sd+3,fd:[0,0,0,0]}); }
    for(let i=0;i<h.N.length&&i<13;i++){ const q=h.N[i]; if(q.tip) continue; const a=sat((t-q.t)/.06)*(1-o), r=q.r*(1+.45*fl);
      F.lathe(m.gyro,q.x,q.y,q.z,{r0:r,r1:r*1.32,M:F.xf({rx:1.2,ry:.25*Math.sin(t*5+q.sd),rz:t*7+q.sd}),...C,a,gain:3.2+2*fl,t0:q.sd});
      F.bill(m.m.glowO,q.x,q.y,q.z,r*(.42+.5*fl),r*(.42+.5*fl),0,{...CW,a,gain:3}); } });
  return h; }

const SKILL={
  // LIGHTNING: static under their feet for a tenth of a second, then one stem of lightning each, from above the screen onto the body; the charge clings
  mg_bolt:{fn(id){ const T=onScreen(-80); if(!T.length) return false; const n=3+L(id)-1, d=D(id); quick(); sfx('thunder',.6);
    // the staff throws it: a wire of light from its tip to a knot of charge that swells over each of the nearest heads, and each knot
    // lets go one stroke straight down. Knot and stroke are one whole shape, well inside the screen, and every one is tied to the staff.
    const tp=tip(), HK=440; K.flare(tp.x,tp.y,tp.z,{pal:ARC,s:120,dur:.2,gain:2.6}); GFX.light(pl.x,pl.gy,380,ARC.l,.7,.2,{z:tp.z});
    T.sort((a,b)=>hyp(a)-hyp(b)).slice(0,n).forEach((e,i)=>{ const d0=i*.07, kn={x:e.x+rand(-50,50),y:e.y,z:HK+rand(-30,30)+e.h*.4}; staticFx(e,.12,{delay:d0});
      bolts([{a:{x:tp.x,y:tp.y,z:tp.z},b:kn}],{pal:ARC,w:30,grow:.05,hold:.05,fade:.14,n:9,jit:.06,fork:0,halo:1.3,delay:d0});
      knotFx(kn,.3,d0+.03);
      after(.12+d0,()=>{ if(e.dead) return; const x=e.x, y=e.y, b={x,y,z:e.h*.45+e.z};
        bolts([{a:kn,b}],{pal:ARC,w:i===0?92:76,grow:.035,hold:.09,fade:.24,n:13,jit:.13,fork:2,taper:.8,halo:1.35});
        ground(e,ARC,1.15); K.ehit(e,{pal:ARC,pw:.8,dir:-Math.PI/2,light:0}); GFX.light(x,y,680,ARC.l,1,.28,{z:150});
        ring1(x,y,250,{dur:.3,gain:1.2}); K.cool(x,y,{kind:'crack',r:190,pal:ARC,life:1.5,light:0,shed:0});
        // what is left of it: two short arcs crawl out over the stone from the burn and die, one after the other
        for(let j=0;j<2;j++){ const g=rand(0,TAU), r=rand(190,270); bolts([{a:{x,y,z:6},b:{x:x+Math.cos(g)*r,y:y+Math.sin(g)*r*FSY,z:4}}],{pal:ARC,w:34,grow:.06,hold:.05,fade:.2,n:9,jit:.12,fork:1,flat:1,delay:.2+j*.17}); }
        hit(e,d,{kb:0,up:1250,stun:.4,push:60}); K.mark(e,'shock',{dur:.9,pal:ARC});
        if(i===0){ hitstop=Math.max(hitstop,.04); trauma=Math.min(1,trauma+.22); } else trauma=Math.min(1,trauma+.08);
        // evolved: the charge left in the stone goes off a beat later as a low ring of plasma
        if(EVO(id)) after(.15,()=>{ const x=e.x, y=e.y; K.vring(x,y,{r:260,r0:50,dur:.4,pal:ARC,heat:1,tube:.2}); GFX.light(x,y,520,ARC.l,.8,.22,{z:120}); inCircle(x,y,160,o=>{ dmg(o,d*.5,{kb:0,push:140,sx:x,sy:y}); hitFx(o,C2,1); }); }); }); }); }},
  // ARCANE ORB: satellites in gyroscope rings circling her; whatever one touches takes a short arc from it
  mg_orb:{fn(id){ if(V.orbs.some(o=>o.mage)||!nearest(1300)) return false; const n=EVO(id)?5:3, d=D(id), tp=tip(); raise(); sfx('rise',.5,.4);
    for(let i=0;i<n;i++){ const o={mage:true,a:i/n*TAU,life:5,d,R:EVO(id)?410:350,w:3.2,hitR:105,c:C1,h:BODY*.6,rot:false,v:{x:pl.x,y:pl.gy-BODY}};
      o.x=pl.x+Math.cos(o.a)*o.R; o.y=pl.gy+Math.sin(o.a)*o.R*.8; o.fx=satFx(o,i,n>3?1:2);
      // what it touches is struck along the ball's flight (tangent to the orbit): a hard star on the body, and the body is carried off that way
      o.hit=e=>{ const P=i%2?AZV:ARC, dir=fdir(-Math.sin(o.a),Math.cos(o.a)*.8); sfx('thunder',.15); K.ehit(e,{pal:P,pw:.65,dir,ring:0,light:0}); fling(e,{dir,push:200,up:500});
        if(!e.dead){ K.mark(e,'shock',{dur:.7,pal:P}); K.knock(e,{dir,dist:150,up:500,fx:0}); } GFX.light(e.x,e.y,360,P.l,.7,.22,{z:e.h*.5}); }; V.orbs.push(o); }
    K.flare(tp.x,tp.y,tp.z,{pal:ARC,s:110,dur:.18,gain:2.4}); GFX.light(pl.x,pl.gy,520,ARC.l,.7,.4,{z:100}); }},
  // CHAIN LIGHTNING: a thick arc at chest height from body to body, leaving each one charged; when it reaches the last, the charge
  // goes off down the whole chain in the order it was laid
  mg_chain:{fn(id){ const e0=nearest(1000); if(!e0) return false; const d=D(id), n=6+L(id), tp=tip(), hits=[], seen=new Set(), ch=chainFx(), n0=ch.node(null); let nv=0, live=0, done=false; face(angTo(e0)); quick(); sfx('thunder',.5);
    const finish=()=>{ if(done) return; done=true;
      // the return stroke: every link of the chain flares white at once, end to end, and the charge goes off down it in the order it was laid
      after(.12,()=>{ ch.fire(); if(hits.length) sfx('thunder',.5,.2);
        hits.forEach((e,i)=>after(.03+i*.03,()=>{ if(e.dead||G_over()) return; const h=K.marked(e,'shock'), last=i===hits.length-1; if(h) h.pop({quiet:i>=4&&!last,pw:last?.9:.55});
          hit(e,d*.35,{kb:0,push:last?260:150,up:last?900:500,stun:.3,sx:e.px??pl.x,sy:e.py??pl.gy}); if(last){ GFX.light(e.x,e.y,640,ARC.l,1,.3,{z:150}); trauma=Math.min(1,trauma+.2); sfx('boom',1.4,.4); } })); }); };
    const jump=(e,k,pn,sx,sy)=>{ if(!e||e.dead||k>=n||seen.has(e)) return; seen.add(e); hits.push(e); const v=nv++, x=e.x, y=e.y; let nd=pn; e.px=sx; e.py=sy;
      if(v<16){ nd=ch.node(e); ch.link(pn,nd); }
      K.mark(e,'shock',{dur:2.2,pal:ARC}); if(v<1) K.ehit(e,{pal:ARC,pw:.6,dir:fdir(x-sx,y-sy),ring:0,light:0}); else hitFx(e,C2,1.2);
      hit(e,d*.65,{kb:0,stun:.5,push:90,sx,sy}); sfx('slash',2,.2); if(v<8) GFX.light(x,y,440,ARC.l,.75,.25,{z:120});
      if(k===0){ hitstop=Math.max(hitstop,.04); trauma=Math.min(1,trauma+.15); }
      const nx=V.en.filter(o=>!o.dead&&!seen.has(o)&&Math.hypot(o.x-x,o.y-y)<640).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
      // the evolved chain forks at every other hop
      live++; after(.085,()=>{ live--; jump(nx[0],k+1,nd,x,y); if(EVO(id)&&nx[1]&&k%2===0) jump(nx[1],k+2,nd,x,y); if(!live) finish(); }); };
    after(.08,()=>{ K.flare(tp.x,tp.y,tp.z,{pal:ARC,s:90,dur:.16,gain:2.6}); const e=e0.dead?nearest(1000):e0; if(!e){ ch.fire(); return; } jump(e,0,n0,pl.x,pl.gy); }); }},
  // FROST NOVA: a crown of ice spikes round her and one roll of freezing mist; what it reaches is frozen where it stands and breaks 2.5 s later
  mg_nova:{fn(id){ const R=EVO(id)?560:400, R2=R*1.5; if(!nearest(1200)) return false; const d=D(id); raise(); sfx('shatter',.8);
    { const tp=tip(); K.flare(tp.x,tp.y,tp.z,{pal:FRO,s:90,dur:.14,gain:2.2}); GFX.light(pl.x,pl.gy,420,FRO.l,.6,.15,{z:120}); }
    after(.1,()=>{ const x=pl.x, y=pl.gy, T=[];
      // the ice comes up as a wave: a tall ring round her, then a second, wider and lower, right out at the edge of what it freezes -
      // so the ice is as wide as the blow. Both stand a moment and shatter (outer first), and the stone stays rimed and cracked after.
      crown(x,y,R*.5,EVO(id)?11:8,1.05,{h:270,cn:6});
      crown(x,y,R*.95,EVO(id)?18:14,.8,{h:190,delay:.07,cn:9});
      K.vring(x,y,{r:R2*1.05,r0:R*.35,dur:.9,tube:.1,c:'#16405e',c2:'#d4f4ff',a:.6,lump:.9}); ring1(x,y,R2,{pal:FRO,dur:.5,gain:1.1});
      K.cool(x,y,{kind:'crack',r:R*1.0,pal:FRO,life:2.6,hot:.6,light:0}); K.cool(x,y,{kind:'ring',r:R*.98,pal:FRO,life:2.2,hot:.5,light:0,shed:0});
      GFX.light(x,y,R*2.2,FRO.l,1,.45,{z:80}); hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.35);
      inCircle(x,y,R,e=>{ const ex=e.x, ey=e.y; hit(e,d*.6,{kb:0,push:120,up:400,stun:1.2,slow:2.5,big:true,sx:x,sy:y}); if(e.dead) return; K.mark(e,'frost',{dur:2.7,pal:FRO,s:.6}); if(T.length<6) crown(ex,ey,60,3,1.25,{h:Math.max(120,e.h*.7),cn:3,delay:.05}); T.push(e); });
      T.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).slice(0,3).forEach(e=>K.ehit(e,{pal:FRO,pw:.8,ring:0,dir:fdir(e.x-x,e.y-y)}));
      // the edge of the mist: what stands between R and R2 is not frozen, only chilled (slowed, rimed) as the roll reaches it
      V.en.forEach(e=>{ if(e.dead||T.includes(e)) return; const l=Math.hypot(e.x-x,(e.y-y)/FSY); if(l>R2) return; after(.12+.3*sat((l-R)/(R2-R)),()=>{ if(e.dead) return; dmg(e,d*.12,{kb:0,push:90,slow:1.6,sx:x,sy:y}); K.mark(e,'frost',{dur:1.6,pal:FRO,s:.45}); }); });
      // the ice lets go: every frozen body cracks out of it
      after(2.5,()=>{ if(G_over()) return; let c=0; T.forEach(e=>{ if(e.dead) return; const h=K.marked(e,'frost'); if(!h) return; h.pop({quiet:c++>=4,pw:.7}); hit(e,d*.4,{kb:0,push:200,up:700,sx:x,sy:y}); }); if(c) sfx('shatter',.6); }); }); }},
  // GRAVITY: a funnel that keeps tightening round a dark star and drags the crowd in along streaks of light, then gives it all back upward
  mg_vortex:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?420:330, pull=EVO(id)?520:360; face(angTo(t)); raise(); sfx('rise',.6,.5);
    const line=(sx,sy,sz)=>GFX.pt({x:sx,y:sy,z:sz,tx:x,ty:y,tz:R*.5,pull:rand(4,6),vx:-(sy-y)/FSY*1.6,vy:(sx-x)*FSY*1.6,life:rand(.35,.55),s:rand(2.5,4.5),m:3,len:.09,c:GFX.rgb(Math.random()<.35?'#ffffff':GRAV.s),c2:GRAV.b,L:3});
    V.zones.push({x,y,r:R,life:2.5,tick:.12,fx:wellFx(x,y,R,2.5),fn:(e)=>{ e.pull={x,y,s:pull}; line(e.x,e.y,e.h*.6); if(Math.random()<.4){ hit(e,d,{kb:0,stun:.15,dir:fdir(x-e.x,y-e.y),push:150,up:500}); K.mark(e,'shock',{dur:.5,pal:GRAV}); } },
      onTick:()=>{ for(let i=0;i<3;i++){ const a=rand(0,TAU), r=rand(R*.8,R*1.25); line(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,rand(0,160)); } },
      // it gives it all back: the star bursts where it hung - a ball of dark plasma, splinters of floor and a hard ring thrown out, every
      // body inside lifted and thrown clear, and a cracked floor that stays lit and cools after
      onEnd:()=>{ let c=0; plasma(x,y,R*.5,GRAV,{z:R*.4,dur:.42,smoke:0,gain:.8,rise:R*.4,heat:1.3});
        { const L=[], a0=rand(0,TAU); for(let j=0;j<9;j++){ const g=a0+(j+rand(-.3,.3))/9*TAU, r=R*rand(1.05,1.5); L.push({a:{x,y,z:R*.3},b:{x:x+Math.cos(g)*r,y:y+Math.sin(g)*r*FSY,z:8}}); } bolts(L,{pal:GRAV,w:56,grow:.05,hold:.08,fade:.24,n:9,jit:.07,fork:1,taper:.3}); } ring1(x,y,R*1.7,{pal:GRAV,dur:.4,gain:1.5}); ring1(x,y,R*1.1,{pal:GRAV,dur:.3,gain:1.2});
        K.flare(x,y,R*.5,{pal:GRAV,s:R*.75,dur:.14,gain:2.6}); K.cool(x,y,{kind:'crack2',r:R*1.15,pal:GRAV,life:2.4,light:0}); K.cool(x,y,{kind:'crater',r:R*.5,pal:GRAV,life:2.2,light:0,shed:0});
        K.chunks(x,y,{n:8,r:R*.3,sp:[300,820],up:1500,s:[22,52],pal:GRAV,life:1}); K.sparks(x,y,R*.4,{pal:GRAV,n:22,sp:[500,1500],up:900,life:[.3,.7]});
        GFX.light(x,y,R*2.6,GRAV.l,1.1,.45,{z:260}); hitstop=Math.max(hitstop,.06); trauma=Math.min(1,trauma+.4); sfx('boom',1.2,.8);
        inCircle(x,y,R,e=>{ if(c++<5) K.ehit(e,{pal:GRAV,pw:1.3,ring:0,dir:fdir(e.x-x,e.y-y),light:0}); else hitFx(e,C1,1.4); hit(e,d*(EVO(id)?12:8),{kb:0,push:340,up:1600,big:true,sx:x,sy:y}); }); }}); }},
  // THUNDER FIELD: a broken rim of plasma that walks with her; every beat an arc leaps from her to whatever stands inside and leaves it charged
  mg_field:{fn(id){ const R=EVO(id)?470:380; if(V.zones.some(z=>z.field)||!nearest(1300)) return false; const d=D(id); raise(); sfx('thunder',.4);
    const v={x:pl.x,y:pl.gy}; let na=0, web=[];
    { const tp=tip(); K.flare(tp.x,tp.y,tp.z,{pal:ARC,s:110,dur:.16,gain:2.4}); bolts([{a:{x:tp.x,y:tp.y,z:tp.z},b:{x:pl.x,y:pl.gy,z:4}}],{pal:ARC,w:60,grow:.04,hold:.06,fade:.14,n:7,jit:.08,fork:0}); ring1(pl.x,pl.gy,R,{dur:.24,gain:1.3}); }
    V.zones.push({field:true,follow:true,r:R,life:5,tick:.4,fx:wardFx(v,R,5),v,h:0,fn:e=>{ const dir=fdir(e.x-v.x,e.y-v.y); K.mark(e,'shock',{dur:.6,pal:ARC});
        if(na++<5) web.push({a:{x:v.x,y:v.y,z:6},b:{x:e.x,y:e.y,z:e.h*.4+e.z},w:66}); if(na<=2) K.ehit(e,{pal:ARC,pw:.6,dir,ring:0,light:0}); else hitFx(e,C2,.9);
        hit(e,d,{kb:0,push:130,up:500,stun:.25,sx:v.x,sy:v.y}); },
      onTick:z=>{ sfx('thunder',.12); v.beat=RT;
        // the web: every beat arcs run over the stone from her feet - to each body inside, and the rest out to the wall
        { const a0=rand(0,TAU), ns=Math.max(3,6-web.length); for(let j=0;j<ns;j++){ const a=a0+(j+rand(-.3,.3))/ns*TAU; web.push({a:{x:v.x,y:v.y,z:6},b:{x:v.x+Math.cos(a)*R*.97,y:v.y+Math.sin(a)*R*.97*FSY,z:30},w:38}); }
          bolts(web,{pal:ARC,w:40,grow:.05,hold:.07,fade:.2,n:11,jit:.1,fork:1,flat:1,taper:.6,halo:1.5}); web=[]; }
        // nothing inside this beat: the field reaches out once to the nearest body beyond its wall
        if(!na){ const o=V.en.filter(e=>!e.dead&&Math.hypot(e.x-v.x,(e.y-v.y)/FSY)<R*2).sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y))[0];
          if(o){ bolts([{a:{x:v.x,y:v.y,z:6},b:{x:o.x,y:o.y,z:o.h*.4+o.z}}],{pal:ARC,w:60,grow:.05,hold:.07,fade:.2,n:13,jit:.08,fork:1,flat:1,taper:.7}); K.ehit(o,{pal:ARC,pw:.7,dir:fdir(o.x-v.x,o.y-v.y),ring:0,light:0}); K.mark(o,'shock',{dur:.6,pal:ARC}); hit(o,d*.5,{kb:0,push:110,stun:.2,sx:v.x,sy:v.y}); } }
        na=0;
        // evolved: a bolt out of the sky on one of those inside
        if(EVO(id)){ const T=V.en.filter(e=>!e.dead&&Math.hypot(e.x-z.x,(e.y-z.y)/FSY)<R), e=T[(Math.random()*T.length)|0]; if(e){ const kn={x:e.x,y:e.y,z:440}; knotFx(kn,.14,0); after(.1,()=>{ if(e.dead) return; bolts([{a:kn,b:{x:e.x,y:e.y,z:e.h*.4+e.z}}],{pal:ARC,w:80,grow:.035,hold:.08,fade:.2,n:11,jit:.12,fork:1,taper:.8,halo:1.35}); ground(e,ARC,.8); hit(e,d*2,{kb:0,up:900,stun:.3}); }); } } },
      // it is let go: the wall's charge runs back over the stone to the middle and out again as one ring, then the stone is left scored
      onEnd:z=>{ const L=[], a0=rand(0,TAU); for(let j=0;j<7;j++){ const a=a0+(j+rand(-.3,.3))/7*TAU; L.push({a:{x:z.x+Math.cos(a)*R,y:z.y+Math.sin(a)*R*FSY,z:30},b:{x:z.x,y:z.y,z:6}}); }
        bolts(L,{pal:ARC,w:44,grow:.06,hold:.06,fade:.22,n:11,jit:.1,fork:1,flat:1,taper:.5}); ring1(z.x,z.y,R*1.15,{dur:.34,gain:1.3}); K.cool(z.x,z.y,{kind:'crack',r:R*.8,pal:ARC,life:1.6,hot:.6,light:0,shed:0}); GFX.light(z.x,z.y,R*2,ARC.l,.9,.3,{z:80}); }}); }},
  // STARFALL: splinters of a star come down slantwise, bury themselves and stand in the stone as violet crystal for a breath before they crack
  mg_star:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?10:6, d=D(id); raise(); sfx('rise',.8,.5);
    // the staff calls them: a wire of star-light from its tip up and away to the quarter of the sky they will come from
    { const tp=tip(); K.flare(tp.x,tp.y,tp.z,{pal:STA,s:130,dur:.2,gain:2.6}); for(const sg of [-1,1]) bolts([{a:{x:tp.x,y:tp.y,z:tp.z},b:{x:tp.x+sg*SH_DX*.55,y:tp.y,z:tp.z+SH_H0*.55}}],{pal:STA,w:30,grow:.07,hold:.06,fade:.16,n:7,jit:.02,fork:0,halo:1.4}); GFX.light(pl.x,pl.gy,420,STA.l,.7,.25,{z:tp.z}); }
    T.sort((a,b)=>hyp(a)-hyp(b)).slice(0,n).forEach((e,i)=>{ const x=e.x+rand(-40,40), y=e.y+rand(-30,30), hitAt=Math.max(.42,.3+i*.12), sx=i%2?-1:1, rz=rand(0,TAU), vi=i%4;
      starShard(x,y,{fall:.42,delay:hitAt-.42,sx,rz,v:vi});
      after(hitAt,()=>{ let c=0; spire(x,y,250,1.3,{lean:SH_LEAN*sx,rz,v:vi,brk:.3,n:3,cool:2.4}); K.flare(x,y,90,{pal:STA,s:200,dur:.1,gain:2.6});
        // the burst is hard, not a haze: a ring snapped out over the stone, rays of light run out along it, splinters of the star and of
        // the floor thrown up - and the stone left cracked and glowing
        ring1(x,y,330,{pal:STA,dur:.3,gain:1.5});
        { const L=[], a0=rand(0,TAU); for(let j=0;j<6;j++){ const g=a0+(j+rand(-.25,.25))/6*TAU, r=rand(240,360); L.push({a:{x,y,z:40},b:{x:x+Math.cos(g)*r,y:y+Math.sin(g)*r*FSY,z:6}}); } bolts(L,{pal:STA,w:44,grow:.04,hold:.06,fade:.18,n:7,jit:.04,fork:0,taper:.2,halo:1.4}); }
        K.chunks(x,y,{n:5,r:60,sp:[260,700],up:1300,s:[16,40],pal:STA,kind:'crystal',rock:'#7a5ce0',life:.9});
        K.sparks(x,y,40,{pal:STA,n:10,sp:[400,1300],up:900,life:[.2,.5]}); K.cool(x,y,{kind:'crack2',r:230,pal:STA,life:1.9,light:0,shed:0}); GFX.light(x,y,640,STA.l,1,.32,{z:140}); sfx('boom',.8,.5);
        if(i===0) hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.14);
        inCircle(x,y,200,o=>{ if(c++<2) K.ehit(o,{pal:STA,pw:.9,ring:0,dir:fdir(o.x-x,o.y-y),light:0}); else hitFx(o,C1,1.2); hit(o,d,{kb:0,push:300,up:1500,sx:x,sy:y}); }); }); }); }},
  // ARCANE RAY: one steady ray of fixed length swept once round her (K3.ray: it grows once, holds, and is cut off at the mouth)
  mg_beam:{fn(id){ const e=nearest(700); if(!e) return false; const d=D(id), a0=fdir(e.x-pl.x,e.y-pl.gy), n=EVO(id)?2:1, Lb=950, dir=Math.random()<.5?1:-1, t0=RT, Z=BODY*.62; face(angTo(e));
    S([['gb04',.1],['gb05',.14],['gb07',1.5,{kick:[1.2,-1]}],['gb10',.1],['gb12',.06]]); sfx('rise',.9,.5);
    // the gather: a ball of plasma swells on the staff for a quarter of a second while light runs into it from all round; the ray leaves from it
    { const tp=tip(), ob=null, gm=F.on?mm().m:null, lt=GFX.light(pl.x,pl.gy,300,ARC.l,.2,.1,{hold:.24,z:tp.z});
      GFX.add(.28,(k,t)=>{ const q=tip(); if(gm){ const r=30+80*k*k, CG=col(ARC), CWG=CWH(ARC); F.bill(gm.glowO,q.x,q.y,q.z,r*2.2,r*2.2,0,{...CG,a:.85,gain:2.3}); F.bill(gm.glowO,q.x,q.y,q.z,r*.8,r*.8,0,{...CWG,a:1,gain:3.4}); F.bill(gm.glowO,q.x,q.y,q.z,r*3.4,r*.16,t*5,{...CWG,a:1,gain:3}); F.bill(gm.glowO,q.x,q.y,q.z,r*.16,r*3.4,t*5,{...CWG,a:1,gain:3}); } lt.a=.2+.9*k; lt.r=300+400*k; });
      for(let j=0;j<16;j++){ const g=rand(0,TAU), r=rand(220,420); GFX.pt({x:tp.x+Math.cos(g)*r,y:tp.y+Math.sin(g)*r*FSY,z:tp.z+rand(-120,160),tx:tp.x,ty:tp.y,tz:tp.z,pull:rand(7,10),life:rand(.2,.3),s:rand(3,5),m:3,len:.08,c:GFX.rgb(j%3?ARC.s:'#ffffff'),c2:ARC.b,L:3}); } }
    // and the aim: a hair of light runs out along the line the ray will take, so the cast is read before the ray is there
    if(F.on){ const m=mm().m, C=col(ARC), CW=CWH(ARC); GFX.add(.28,(k,t)=>{ const g=eo3(sat(t/.2)), c=Math.cos(a0), s=Math.sin(a0), ps=[]; for(let j=0;j<5;j++){ const u=j/4, dd=80+Lb*g*u; ps.push({x:pl.x+c*dd,y:pl.gy+s*dd*FSY,z:Z,w:16*(1-u*.6)+2}); }
        F.ribbon(m.trB,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*3.2})),{...C,a:.6,gain:2,fd:[.02,.2,0,0]}); F.ribbon(m.trC,ps,{...CW,a:.9,gain:3.8,fd:[.02,.2,0,0]}); }); }
    const DL=.24, rays=[], aim=()=>{ const a=a0+dir*TAU*sat((RT-t0-.12-DL)/1.42); rays.forEach((h,k)=>{ const b=a+k*Math.PI; h.dir=b; h.x=pl.x+Math.cos(b)*75; h.y=pl.gy+Math.sin(b)*75*FSY; }); };
    GFX.add(1.9,aim);
    for(let k=0;k<n;k++){ const b=a0+k*Math.PI; rays.push(K.ray(pl.x+Math.cos(b)*75,pl.gy+Math.sin(b)*75*FSY,Z,b,{len:Lb,w:50,dur:1.5,pal:ARC,scar:0,tip:0,delay:DL})); }
    after(DL,()=>{ K.flare(pl.x+Math.cos(a0)*90,pl.gy+Math.sin(a0)*90*FSY,Z,{pal:ARC,s:150,dur:.14,gain:2.6}); hitstop=Math.max(hitstop,.03); trauma=Math.min(1,trauma+.2); GFX.light(pl.x,pl.gy,700,ARC.l,1,.3,{z:Z}); });
    // the far end: a small hard point of light and its pool on the floor (the kit's ball of fire is too big for a normal skill)
    { const m=F.on?mm().m:null, C=col(ARC), CW=CWH(ARC), sd=rand(0,9); let sp=0; if(m) GFX.add(2.2,(k,t)=>{ for(const h of rays){ if(h.dead||h.cur<60) continue; const a=sat(h.cur/h.len)*(h.t1<0?1:sat(1-(RT-h.t1)/.2)), c=Math.cos(h.dir), s=Math.sin(h.dir), X2=h.x+c*h.cur, Y2=h.y+s*h.cur*FSY;
        // not a plain bar: slugs of light run down it from the mouth, one after another (each a hard white bead with a hoop of violet round
        // the ray, bigger at the mouth and spent by the far end), and the mouth itself is a bell of light
        { const sa=Math.atan2(-s*FSY,c); for(let j=0;j<4;j++){ const u=((t*1.7+j/4)%1), dd=h.cur*u, px=h.x+c*dd, py=h.y+s*dd*FSY, sz=h.w*mix(3.4,1.3,u)*Math.min(1,u*8)*Math.min(1,(1-u)*6);
            F.bill(m.glowO,px,py,h.z,sz*.42,sz,sa,{...C,a:.9*a,gain:2.6}); F.bill(m.glowO,px,py,h.z,sz*1.5,sz*.34,sa,{...CW,a:a,gain:3.2}); }
          F.bill(m.glowO,h.x+c*h.w*1.6,h.y+s*h.w*1.6*FSY,h.z,h.w*3.4,h.w*2.6,sa,{...C,a:.85*a,gain:2.4}); F.bill(m.glowO,h.x+c*h.w,h.y+s*h.w*FSY,h.z,h.w*1.5,h.w*1.5,0,{...CW,a,gain:3.2}); }
        // the far end bores in: a hard point with a cross of light through it, turned to the ray
        const sa=Math.atan2(-s*FSY,c); F.quad(m.glowG,X2,Y2,190,190,0,{...C,a:.6*a,gain:1.2}); F.bill(m.glowO,X2,Y2,h.z,110,110,0,{...C,a:.8*a,gain:2.4}); F.bill(m.glowO,X2,Y2,h.z,250,20,sa+Math.PI/2,{...CW,a,gain:3}); F.bill(m.glowO,X2,Y2,h.z,150,14,sa,{...CW,a,gain:3}); F.bill(m.glowO,X2,Y2,h.z,44,44,0,{...CW,a,gain:3.2});
        if(t-sp>.05){ K.sparks(X2,Y2,h.z,{pal:ARC,n:2,dir:h.dir+Math.PI,spread:1.2,sp:[400,1200],up:400,life:[.15,.4],s:3}); } } if(t-sp>.05) sp=t; }); }
    // it ends: cut at the mouth, the last of it runs out to the far end and goes off there; the line it lay along at the last stays scored and cools
    const fin=()=>{ rays.forEach(h=>{ if(h.t1>=0) return; const x1=h.x, y1=h.y, x2=h.x2, y2=h.y2; h.end(); if(G_over()||h.cur<60) return; K.coolLine(x1,y1,x2,y2,{w:46,pal:ARC,life:1.5,hot:.6,grow:.12,shed:0});
        after(.22,()=>{ K.flare(x2,y2,Z,{pal:ARC,s:230,dur:.16,gain:2.8}); ring1(x2,y2,260,{dur:.3,gain:1.4}); K.sparks(x2,y2,Z,{pal:ARC,n:12,sp:[400,1300],up:800,life:[.2,.5]}); K.cool(x2,y2,{kind:'crack',r:150,pal:ARC,life:1.4,light:0,shed:0}); GFX.light(x2,y2,520,ARC.l,.9,.3,{z:Z}); }); }); };
    const tick=()=>{ if(RT-t0>1.6+DL||G_over()){ fin(); return; } aim();
      // what the ray crosses is struck sideways, the way the ray is sweeping, and carried along with it
      for(const h of rays) if(h.cur>60){ let c=0; const sw=h.dir+dir*Math.PI*.42; inLine(h.x,h.y,h.x2,h.y2,h.w*1.4,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.15; sear(o,h); if(!o.beamH&&c++<3){ o.beamH=1; K.mark(o,'shock',{dur:.5,pal:ARC}); } hit(o,d,{kb:0,push:190,up:400,stun:.25,dir:sw,sx:o.x-Math.cos(sw)*100,sy:o.y-Math.sin(sw)*100*FSY}); }); }
      after(.05,tick); };
    after(.08+DL,tick); }},
};
const G_over=()=>V.over||RPG.mode!=='surv';

/// ---- ultimates. Each is one staged sequence: omen -> release -> development -> climax -> afterglow. No cut-ins, no blackout: only the ambient drops.
// ---- pieces of 천뢰주 only
// a repeatable throw of the dice for (point i, frame f, seed s): -1..1
const hsh=(i,f,s)=>{ const v=Math.sin(i*127.1+f*311.7+s*74.7)*43758.5453; return (v-Math.floor(v))*2-1; };
// LEVIN: lightning that is alive. Its tip runs from a to b in `grow` seconds (a thin leader), it flares to full weight the moment it arrives and
// thins at once to a wire that hangs for the rest of `dur`; its shape is thrown again every frame (the ends never move, its length never changes).
//  o: {w (weight at the flare), dur, grow, n, jit (sideways throw as a fraction of its length), pal, gain, delay, sky:1 (a is far above the screen),
//      flat:1 (it runs over the floor: thrown sideways, not up), fork (side branches), body:0 (no soft mantle), thin (weight of the wire, fraction)}
function levin(a,b,o={}){ if(!F.on) return; const m=mm(), P=K.pal(o.pal||ARC), C=col(P), CW=CWH(P), dur=o.dur||.36, grow=o.grow??.06, n=o.n||12, w=o.w||90, jit=o.jit??.05, g=o.gain||1, sd=rand(0,90), thin=o.thin??.2,
    len=Math.hypot(b.x-a.x,(b.y-a.y)/FSY,b.z-a.z)||1, fa=Math.atan2((b.y-a.y)/FSY,b.x-a.x), FK=[];
  for(let i=0;i<(o.fork??2);i++){ const sx=Math.random()<.5?-1:1, an=fa+sx*rand(.4,.75); FK.push({u:rand(.28,.75),l:rand(.13,.25),sd:rand(0,90),fx:o.flat?Math.cos(an):sx*.75,fy:o.flat?Math.sin(an)*FSY:0,fz:o.flat?0:-.65}); }
  GFX.add(dur,(k,t)=>{ const fr=Math.floor(t/.035), dr=sat(t/grow), tt=Math.max(0,t-grow), pk=Math.exp(-tt*(o.fall||8)), wk=dr<1?.4:thin+(1-thin)*pk, f=sat((k-.6)/.4), ps=[];
    for(let i=0;i<n;i++){ const u0=i/(n-1), u=u0*dr, e=o.sky?Math.min(1,(1-u0)*4+.25):Math.pow(Math.sin(Math.PI*Math.min(1,u0*.96+.02)),.5), j=len*jit*(.25+.75*Math.min(1,u0*4))*(i===n-1?0:1), ox=.55*hsh(i,0,sd)+.6*hsh(i,fr,sd+1), oz=.55*hsh(i,7,sd)+.6*hsh(i,fr,sd+2);
      ps.push({x:mix(a.x,b.x,u)+ox*j,y:mix(a.y,b.y,u)+(o.flat?oz*j*FSY:0),z:Math.max(0,mix(a.z,b.z,u)+(o.flat?0:oz*j*.6)),w:w*wk*(o.sky?1:.4+.6*e)}); }
    if(o.body!==0) F.ribbon(m.m.trB,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.9})),{...C,a:.75*(1-f),gain:1.8*g*(.5+pk),t0:sd,fd:[.06,.06,0,0],pm:[2,2.2,0,0]});
    F.ribbon(m.arcH,ps,{...C,a:1-f*f,gain:3.1*g*(.55+.7*pk),ero:.08+f*.7,t0:sd+fr,uvT:fr%3===0?[1,1,0,0]:fr%3===1?[1,-1,0,1]:[-1,1,1,0]});
    F.ribbon(m.m.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:Math.max(5,q.w*.22)})),{...CW,a:1-f,gain:4.6*g,ero:.1+f*.7,t0:sd+3});
    if(tt<.16) for(const q of FK){ const i0=Math.min(n-2,Math.floor(q.u*(n-1))); if(i0/(n-1)>dr) continue; const p0=ps[i0], L2=len*q.l, fp=[];
      for(let j=0;j<5;j++){ const v=j/4, jj=L2*.13*v; fp.push({x:p0.x+q.fx*L2*v+hsh(j,fr,q.sd)*jj,y:p0.y+q.fy*L2*v+(o.flat?hsh(j,fr,q.sd+4)*jj*FSY:0),z:Math.max(0,p0.z+q.fz*L2*v+(o.flat?0:hsh(j,fr,q.sd+2)*jj)),w:w*.42*(1-v*.7)*(.4+.6*pk)}); }
      F.ribbon(m.arcH,fp,{...C,a:1-tt/.16,gain:2.6*g,ero:.12,t0:q.sd+fr}); } },o.delay||0); }

// BOLTS: strokes of lightning (a list of {a,b,w}) whose shapes are thrown once and never again; all of them are one strip per coat (three draws).
// Each stroke: A thin leader runs from a to b in `grow` seconds, the whole channel
// flares to full weight for `hold`, and then the same shape thins and breaks up over `fade` (it never grows back, never changes length - except
// that with `ret` its far end is drawn back toward a while it dies). Three coats: a wide soft mantle, the painted arc, a white wire.
//  o: {w, grow, hold, fade, n, jit (sideways throw as a fraction of its length), pal, gain, delay, flat:1 (it runs over the floor), fork (side
//      branches), ret (0..1 how much of its length the dying bolt gives up from the tip), taper (weight left at the far end), halo (mantle width)}
function bolts(list,o={}){ if(!F.on||!list.length) return; const m=mm(), P=K.pal(o.pal||ARC), C=col(P), CW=CWH(P), grow=o.grow??.06, hold=o.hold??.07, fade=o.fade??.16, dur=grow+hold+fade, n=o.n||17, w0=o.w||100, jit=o.jit??.07, g=o.gain||1, sd=rand(0,90), flat=!!o.flat, ret=o.ret||0, tp=o.taper??(flat?.4:.75), hl=o.halo??1.7, nf=o.fork??2;
  const md=(A,i0,i1,amp)=>{ if(i1-i0<2) return; const im=(i0+i1)>>1; A[im]=(A[i0]+A[i1])/2+rand(-1,1)*amp; md(A,i0,im,amp*.56); md(A,im,i1,amp*.56); };
  const B=list.map(it=>{ const a=it.a, b=it.b, len=Math.hypot(b.x-a.x,(b.y-a.y)/FSY,b.z-a.z)||1, fa=Math.atan2((b.y-a.y)/FSY,b.x-a.x), J=len*jit, A1=new Array(n).fill(0), A2=new Array(n).fill(0), PT=[], FK=[]; md(A1,0,n-1,1); md(A2,0,n-1,1);
    for(let i=0;i<n;i++){ const u=i/(n-1); PT.push(flat?{x:mix(a.x,b.x,u)-Math.sin(fa)*A1[i]*J,y:mix(a.y,b.y,u)+Math.cos(fa)*A1[i]*J*FSY,z:Math.max(0,mix(a.z,b.z,u)+Math.abs(A2[i])*J*.25),k:1-(1-tp)*u}:{x:mix(a.x,b.x,u)+A1[i]*J,y:mix(a.y,b.y,u),z:Math.max(0,mix(a.z,b.z,u)+A2[i]*J*.35),k:1-(1-tp)*u}); }
    for(let i=0;i<nf;i++){ const i0=2+((Math.random()*(n-5))|0), sx=Math.random()<.5?-1:1, an=fa+sx*rand(.35,.8), L2=len*rand(.12,.24), p0=PT[i0], fp=[], B1=[0,0,0,0,0,0,0]; md(B1,0,6,1); B1[6]=rand(-1,1)*.6;
      for(let j=0;j<7;j++){ const v=j/6, jj=L2*.16*B1[j]; fp.push(flat?{x:p0.x+Math.cos(an)*L2*v-Math.sin(an)*jj,y:p0.y+(Math.sin(an)*L2*v+Math.cos(an)*jj)*FSY,z:p0.z*(1-v),k:p0.k*.5*(1-v*.7)}:{x:p0.x+sx*L2*v*.8+jj,y:p0.y,z:Math.max(0,p0.z-L2*v*.75),k:p0.k*.5*(1-v*.7)}); }
      FK.push({u:i0/(n-1),fp}); }
    return {PT,FK,w:it.w||w0}; });
  // append the first `lim` (0..1) of a fixed polyline to the strip, cut cleanly at the fraction; strokes are joined by bridges of no width
  const add=(ps,L,lim,wv)=>{ const c=Math.max(0,Math.min(1,lim))*(L.length-1), i1=Math.floor(c), fr=c-i1; if(c<.5) return; if(ps.length){ const l=ps[ps.length-1], q0=L[0]; ps.push({x:l.x,y:l.y,z:l.z,w:0},{x:q0.x,y:q0.y,z:q0.z,w:0}); }
    for(let i=0;i<=i1;i++){ const q=L[i]; ps.push({x:q.x,y:q.y,z:q.z,w:wv*q.k}); }
    if(fr>.02&&i1<L.length-1){ const q=L[i1], r=L[i1+1]; ps.push({x:mix(q.x,r.x,fr),y:mix(q.y,r.y,fr),z:mix(q.z,r.z,fr),w:wv*mix(q.k,r.k,fr)*.6}); } };
  const wd=(ps,s,mn)=>ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w>0?Math.max(mn||0,q.w*s):0}));
  GFX.add(dur,(k,t)=>{ const lead=t<grow, tt=t-grow, f=sat((tt-hold)/fade), lim=lead?t/grow:1-ret*f, wk=lead?.3:1-.72*f, br=lead?.6:tt<hold?1.3:1-.55*f, al=1-f*f*f, ps=[];
    for(const b of B){ add(ps,b.PT,lim,b.w*wk); if(lead||f<.8) for(const q of b.FK) add(ps,q.fp,lead?sat((t/grow-q.u)*4):1-f,b.w*wk); } if(ps.length<2) return;
    if(o.body!==0) F.ribbon(m.m.trB,wd(ps,hl),{...C,a:.8*al*(lead?.5:1),gain:2*g*br,t0:sd,fd:[0,0,0,0],pm:[2,2,0,0]});
    F.ribbon(m.arcH,ps,{...C,a:al,gain:3.1*g*br,ero:.06+f*.6,t0:sd,fd:[0,0,0,0]});
    F.ribbon(m.m.trC,wd(ps,.26,lead?4:8*(1-f*.6)),{...CW,a:al,gain:4.8*g,ero:.08+f*.5,t0:sd+3,fd:[0,0,0,0]}); },o.delay||0); }
const bolt=(a,b,o)=>bolts([{a,b}],o);
// UBOLTS: 천뢰주's own lightning (bolts above stays as the skills use it). The same thrown-once strokes, made alive: the channel swells and
// pinches along its length, the white wire inside it does so on its own, only some branches carry a wire (so the branches differ in brightness),
// the whole stroke flickers in 0.05 s steps while it holds, and its soft mantle is a colder colour than the arc.
//  o: as bolts, plus mp (mantle palette, AZV), bands ([[u0,u1,pal,mp],...] colour steps from a to b: white at the root, colder outward), fl (flicker)
const UWH={d:'#1a1c5a',b:'#8ea8ff',m:'#e4ecff',h:'#ffffff',l:'#b0c4ff',s:'#eef2ff'};
function ubolts(list,o={}){ if(!F.on||!list.length) return; const m=mm(), grow=o.grow??.06, hold=o.hold??.07, fade=o.fade??.16, dur=grow+hold+fade, n=o.n||17, w0=o.w||100, jit=o.jit??.07, g=o.gain||1, sd=rand(0,90), flat=!!o.flat, ret=o.ret||0, tp=o.taper??(flat?.4:.75), hl=o.halo??1.7, nf=o.fork??2, fd=o.fl??.5,
    BD=(o.bands||[[0,1,o.pal||ARC,o.mp||AZV]]).map(b=>{ const P=K.pal(b[2]); return {u0:b[0],u1:b[1],C:col(P),CW:CWH(P),CM:col(K.pal(b[3]||AZV))}; });
  const md=(A,i0,i1,amp)=>{ if(i1-i0<2) return; const im=(i0+i1)>>1; A[im]=(A[i0]+A[i1])/2+rand(-1,1)*amp; md(A,i0,im,amp*.56); md(A,im,i1,amp*.56); };
  const B=list.map(it=>{ const a=it.a, b=it.b, len=Math.hypot(b.x-a.x,(b.y-a.y)/FSY,b.z-a.z)||1, fa=Math.atan2((b.y-a.y)/FSY,b.x-a.x), J=len*jit, A1=new Array(n).fill(0), A2=new Array(n).fill(0), A3=new Array(n).fill(0), A4=new Array(n).fill(0), PT=[], FK=[];
    md(A1,0,n-1,1); md(A2,0,n-1,1); A3[0]=rand(-1,1); A3[n-1]=rand(-1,1); md(A3,0,n-1,1.4); A4[n-1]=rand(-1,1); md(A4,0,n-1,1.6);
    for(let i=0;i<n;i++){ const u=i/(n-1), kw=(1-(1-tp)*u)*(.6+.55*sat(A3[i]*.5+.5)), kc=.12+.34*sat(A4[i]*.5+.5);
      PT.push(flat?{x:mix(a.x,b.x,u)-Math.sin(fa)*A1[i]*J,y:mix(a.y,b.y,u)+Math.cos(fa)*A1[i]*J*FSY,z:Math.max(0,mix(a.z,b.z,u)+Math.abs(A2[i])*J*.25+(it.h||0)*len*Math.sin(Math.PI*Math.pow(u,.8))),k:kw,c:kc}:{x:mix(a.x,b.x,u)+A1[i]*J,y:mix(a.y,b.y,u),z:Math.max(0,mix(a.z,b.z,u)+A2[i]*J*.35),k:kw,c:kc}); }
    for(let i=0;i<nf;i++){ const i0=2+((Math.random()*(n-5))|0), sx=Math.random()<.5?-1:1, an=fa+sx*rand(.35,.8), L2=len*rand(.12,.26), p0=PT[i0], fp=[], B1=[0,0,0,0,0,0,0], kf=rand(.32,.6); md(B1,0,6,1); B1[6]=rand(-1,1)*.6;
      for(let j=0;j<7;j++){ const v=j/6, jj=L2*.16*B1[j]; fp.push(flat?{x:p0.x+Math.cos(an)*L2*v-Math.sin(an)*jj,y:p0.y+(Math.sin(an)*L2*v+Math.cos(an)*jj)*FSY,z:p0.z*(1-v),k:p0.k*kf*(1-v*.75),c:.3}:{x:p0.x+sx*L2*v*.8+jj,y:p0.y,z:Math.max(0,p0.z-L2*v*.75),k:p0.k*kf*(1-v*.75),c:.3}); }
      FK.push({u:i0/(n-1),fp,hot:i%2===0}); }
    return {PT,FK,w:it.w||w0,dl:it.dl||0}; });
  // p3: leader (thin, dim) -> return stroke (wide, white, a frame or two) -> afterglow (half width, dim, slow). it.dl: that stroke's own extra hold (the ones with less go out first)
  const p3=!!o.p3, mdl=B.reduce((a,b)=>Math.max(a,b.dl),0);
  const cut=(L,a,b)=>{ const N=L.length-1, out=[]; if(b-a<.4/N) return out; const at=f=>{ const c=f*N, i=Math.min(N-1,Math.floor(c)), r=c-i, q=L[i], s=L[i+1]; return {x:mix(q.x,s.x,r),y:mix(q.y,s.y,r),z:mix(q.z,s.z,r),k:mix(q.k,s.k,r),c:mix(q.c,s.c,r)}; };
    out.push(at(a)); for(let i=Math.floor(a*N)+1;i<b*N;i++) out.push(L[i]); out.push(at(b)); return out; };
  const put=(S,ps,wf)=>{ if(ps.length<2) return; if(S.length){ const l=S[S.length-1]; S.push({x:l.x,y:l.y,z:l.z,w:0},{x:ps[0].x,y:ps[0].y,z:ps[0].z,w:0}); } for(const q of ps) S.push({x:q.x,y:q.y,z:q.z,w:wf(q)}); };
  GFX.add(dur+mdl,(k,t)=>{ const lead=t<grow, tt=t-grow, f=sat((tt-hold-mdl)/fade), fr=Math.floor(t/.05), fl=lead?1:1-fd+fd*(.5+.5*hsh(fr,3,sd))*1.6, br=(p3?(lead?.75:tt<hold?1.75:.6*(1-.6*f)):(lead?.6:tt<hold?1.3:1-.55*f))*fl, al=1-f*f*f;
    for(const D of BD){ const S=[], W=[];
      for(const b of B){ const fb=sat((tt-hold-b.dl)/fade), lim=lead?t/grow:1-ret*fb, wk=(p3?(lead?.22:tt<hold?1.3-.3*tt/hold:.55*(1-.6*fb)):(lead?.3:1-.72*fb))*(1-fb*fb*fb), a1=Math.min(D.u1+.02,lim); if(wk<=.01) continue;
        if(a1>D.u0){ const ps=cut(b.PT,D.u0,a1); put(S,ps,q=>b.w*wk*q.k); put(W,ps,q=>Math.max(3,b.w*wk*q.k*q.c*(.75+.4*fl))); }
        if(lead||fb<.8) for(const q of b.FK){ if(q.u<D.u0||q.u>=D.u1) continue; const l2=lead?sat((t/grow-q.u)*4):1-fb; if(l2<=.03) continue; const ps=cut(q.fp,0,l2); put(S,ps,p=>b.w*wk*p.k); if(q.hot) put(W,ps,p=>Math.max(2,b.w*wk*p.k*.3)); } }
      if(S.length<2) continue;
      if(o.body!==0) F.ribbon(m.m.trB,S.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*hl})),{...D.CM,a:.75*al*(lead?.5:1),gain:1.8*g*br,t0:sd,fd:[0,0,0,0],pm:[2,2,0,0]});
      F.ribbon(m.arcH,S,{...D.C,a:al,gain:3*g*br,ero:.06+f*.6,t0:sd,fd:[0,0,0,0]});
      if(W.length>1) F.ribbon(m.m.trC,W,{...D.CW,a:al,gain:5*g*fl,ero:.08+f*.5,t0:sd+3,fd:[0,0,0,0]}); } },o.delay||0); }
const ubolt=(a,b,o)=>ubolts([{a,b}],o);

// ---- 천뢰주 (HEAVEN'S THUNDER) - a ray, vertical, whole-screen. One pillar of lightning from above the screen to the floor at B, under a storm that
// is built of separate dark cloud masses round a spout (their shadow lies on the floor; they light up from inside only when something strikes).
// Omen: the cast flash; the bead on the staff rises off it and is drawn out into a streak into the sky. Build: lightning comes down out of the
// cloud faster and heavier all over the screen (twelve strikes; each one is leader -> channel -> the same shape dying, and the stone answers with a
// flash, a ball of plasma, thrown stones, dust and arcs crawling outward); everyone near is thrown, lit and left crawling with static.
// Held breath. 3.6: the column lands (announcement) and fused crystal breaks out of the floor round its foot; it beats; 4.3 is THE blow: lightning
// runs out over the floor all the way round to the edges of the screen with a strike from the sky where each one ends, a front of standing
// lightning and dust rolls out under it, everything is thrown. Then the column burns down from the top; what is left cools and keeps moving:
// heat in the stone going from violet to a dull red, smoke, arcs along the cracks ever fewer, crystals snapping one by one.
function ultThunder(id){ ultStart(id); const Cn=X.cine, x0=pl.x, y0=pl.gy, {hw,hh}=view(), Dm=60000*A.mul(id), P=ARC, m=F.on?mm():null, T0=RT;
  const bx=x0, by=y0-Math.max(550,hh*.3), Rc=hw*.16, Zt=hh*1.95, TC=3.6, TM=4.3, END=6.8, dB=e=>Math.hypot(e.x-bx,(e.y-by)/FSY), st={fl:0,lf:[0,0,0,0,0],kick:-9,ka:1,arcs:1,hit:new Set()};
  // everything before the kill wave hurts but leaves them standing: they have to be seen flying before they die
  const soft=(e,d,o)=>dmg(e,e.d.boss?d:Math.min(d,Math.max(1,(e.hp-1)/2.2)),o);
  // the charged carry the kit's shock mark (arcs snapping round the body, the body tinted) until the column sets them off
  const charge=e=>{ if(!e.dead&&!K.marked(e,'shock')) K.mark(e,'shock',{dur:Math.max(.5,TM+.4-(RT-T0)),pal:P,s:.5}); }, charged=e=>!!K.marked(e,'shock');
  // what a body shows when lightning goes through it: a short white-azure knot of light on it and wires thrown out of it (all additive)
  const zapHit=(e,full,Pb)=>{ if(!m||e.dead) return; const s=Math.max(120,e.h*.85), sd=rand(0,90), CWb=CWH(Pb);
    GFX.add(.2,(k,t)=>{ const fr=Math.floor(t/.035), a=1-k, z=e.h*.5+(e.z||0); if(full) F.bill(m.m.glowO,e.x,e.y,z,s*(.6-.2*k),s*(.6-.2*k),0,{...CWb,a:a*a*.8,gain:2.4});
      const ps=[]; for(let q=0;q<2;q++){ const an=q*2.6+sd+hsh(q,fr,sd)*.8, l=s*(1.3+.5*hsh(q,fr,sd+3)); for(let i=0;i<5;i++){ const u=q?i/4:1-i/4; if(q&&i===0) continue; ps.push({x:e.x+Math.cos(an)*l*u+hsh(i,fr,sd+q)*s*.18*u,y:e.y+2,z:Math.max(0,z+Math.sin(an)*l*u*.8+hsh(i,fr,sd+q+9)*s*.14*u),w:19*(1-u*.6)}); } }
      F.ribbon(m.m.trC,ps,{...CWb,a,gain:4.5,t0:sd+fr,fd:[.02,.02,0,0]}); });
    if(full) K.sparks(e.x,e.y,e.h*.5+(e.z||0),{pal:Pb,n:6,sp:[300,1100],up:700,life:[.15,.4],s:3}); };
  // the burn a strike leaves: white-hot for a blink, then soot with a dull ember in its cracks that stays to the end and crumbles
  const burn=(x,y,r0,lite)=>{ if(!m) return; const rot=rand(0,TAU), life=Math.max(.6,END-.1-(RT-T0)), r=r0*rand(.6,1.5), q=rand(.45,1), e0=rand(.06,.3);
    let ns=0; const sdb=rand(0,99);
    GFX.add(life,(k,t)=>{ const g=eo3(sat(t/.08)), H=K.heat(P,.04+.96*sat(t/.9)), u=sat((k-.8)/.2), now=RT-T0,
        // the ruin: charge left in the burn snaps in it now and then (fewer and weaker as it dies), and thin smoke stands up off it
        lv=sat((now-4.9)/.3)*(1-sat((now-5.6)/1.1)), sp=lv>0?Math.pow(Math.max(0,hsh(Math.floor(now/.06),2,sdb)),5)*lv:0;
      if(!lite) F.quad(m.m.dark,x,y,r*.8*(1-.5*u),r*.8*q*(1-.5*u),rot,{a:.62*g});
      F.quad(m.sco,x,y,r,r*q,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:sp>.15?'#ffffff':H.cC,a:1,gain:2.7*H.g*H.g+5*sp,ero:e0+.25*sat(t/.9)+.5*u-.2*sp,rv:[g*1.3,.3,0,.1]});
      if(now>4.8&&now<6.6&&ns<(now-4.8)*5){ ns++; GFX.pt({x:x+rand(-.3,.3)*r,y:y+rand(-.2,.2)*r,z:rand(5,30),vx:rand(-30,60),vz:rand(140,280),g:0,drag:.6,life:rand(.8,1.3),s:rand(28,50),grow:rand(60,110),m:5,b:'alpha',c:GFX.rgb(ns%2?'#24224a':'#3a3866'),c2:'#000000',c3:'#5a5aa0',er:.9,ns:rand(.9,1.6),w:1,a:.3*(1-sat((now-5.6)/1.2)),L:0});
        if(sp>.2) GFX.pt({x,y,z:10,vx:rand(-200,200),vy:rand(-80,80),vz:rand(200,600),g:1500,life:rand(.15,.3),s:rand(2,3.5),m:3,len:.04,c:GFX.rgb('#ffffff'),c2:P.b,L:3}); } }); };
  // arcs that crawl out over the stone from a strike: two generations, each thrown fresh, each dying back toward the strike
  const crawlL=(x,y,r,n)=>{ const L=[], a0=rand(0,TAU); for(let j=0;j<n;j++){ const a=a0+(j+rand(-.3,.3))/n*TAU, l=r*rand(.7,1.3); L.push({a:{x:x+Math.cos(a)*r*.12,y:y+Math.sin(a)*r*.12*FSY,z:8},b:{x:x+Math.cos(a)*l,y:y+Math.sin(a)*l*FSY,z:0}}); } return L; };
  const CRW={flat:1,grow:.045,hold:.04,fade:.11,ret:.85,n:9,jit:.11,fork:1,body:0};
  const crawl=(x,y,r,Pb,n,w)=>{ bolts(crawlL(x,y,r,n),{...CRW,w,pal:Pb}); bolts(crawlL(x,y,r*1.25,n-1),{...CRW,w,pal:AZV,delay:.1}); };
  S([['gx03',.12],['gx04',.3],['gx06',3.1],['gx08',.12,{kick:[1.2,-1]}],['gx10',1.9],['gx13',.8],['gx14',9]]);
  // ---- omen (0 - 0.9): close on her; the cast flash; static climbs the staff into a bead
  GFX.ambient(.42,.4,.62,3); GFX.light(x0,y0,560,P.l,.8,.6,{hold:.7,z:140});
  Cn.move({x:x0,y:y0-BODY*.6,zoom:1.45,tilt:.08},.6); SFX.thunder(.3); Cn.drone(46,.3);
  after(.3,()=>{ K.flare(x0,y0,BODY*1.1,{pal:AZV,s:300,dur:.24,gain:2.8}); GFX.light(x0,y0,900,AZV.l,1,.3,{z:160}); K.sparks(x0,y0,BODY,{pal:AZV,n:14,sp:[300,1000],up:800,life:[.2,.45]}); Cn.SND.shing(1.25,.5); });
  // the gathering (0 - 0.7): streaks spiral in from off screen onto the staff's tip, shells tighten on it, grit lifts off the floor, the air
  // shimmers; under that a three-coat bead (white heart, violet plasma body, the kit's shells) and short arcs snapping onto its skin, ever more often
  { const tp=tip(), gt=K.gather?K.gather(tp.x,tp.y,tp.z,{dur:.7,pal:P,r:230,R:760,n:.04,shells:3,core:0,gain:.85}):null, ch=K.vorb(tp.x,tp.y,tp.z,{r:30,dur:.72,in:.2,out:.03,pal:P,spin:5,core:.35,heat:.3,gain:.5}), CWa=CWH(AZV), sd0=rand(0,9); let na=0, ns=0, nc=0, nr=0;
    GFX.add(.71,(k,t)=>{ const q=tip(), u=sat(t/.7), r=(30+95*eo3(sat(u/.8)))*(1-.45*eo3(sat((u-.8)/.2))); ch.x=q.x; ch.y=q.y; ch.z=q.z; ch.r=r; if(gt){ gt.x=q.x; gt.y=q.y; gt.z=q.z; }
      // the drawn-in streaks: short and fine (a soft tail behind a bright point, not a ruled line), more and faster as it gathers
      while(ns<t*(50+130*u)){ ns++; const a=rand(0,TAU), r0=rand(380,820), z0=q.z+rand(-q.z*.7,420), spd=r0/rand(.35,.55)*(1+u); GFX.pt({x:q.x+Math.cos(a)*r0,y:q.y+Math.sin(a)*r0*FSY,z:z0,oc:[q.x,q.y,q.z],or:r0,oa:a,ow:rand(1.2,2.2),ok:spd,oz0:z0,rmin:r*.6,life:Math.max(.05,.7-t),s:rand(2.6,4.4)*(1+.5*u),m:3,len:.022+.012*u,c:GFX.rgb(ns%4?AZV.s:'#ffffff'),c3:'#ffffff',c2:P.b,fk:9,L:3,pri:1}); }
      if(m) F.bill(m.m.glowO,q.x,q.y,q.z,10+22*u*u,10+22*u*u,0,{...CWa,a:.5+.5*u,gain:1.6+u});
      // under her a sigil burns into the floor and tightens, turning ever faster; charge climbs off it up to the bead; grit floats up
      if(m) F.quad(m.seal,x0,y0,mix(520,300,eo3(u)),mix(520,300,eo3(u)),-t*(1+5*u*u),{...col(K.pal(P)),a:sat(t/.15)*(.55+.45*u),gain:1.4+2.2*u*u,t0:sd0+t});
      while(nc<t*(30+120*u)){ nc++; const a=rand(0,TAU), r0=rand(180,520); GFX.pt({x:x0+Math.cos(a)*r0,y:y0+Math.sin(a)*r0*FSY,z:4,vz:rand(300,700),tx:q.x,ty:q.y,tz:q.z,pull:rand(3,5)*(1+u),life:rand(.22,.4),s:rand(2.2,3.8),m:3,len:.05+.03*u,c:GFX.rgb(nc%3?P.s:'#ffffff'),c2:P.b,L:3}); }
      while(nr<u*14){ nr++; const a=rand(0,TAU), r0=rand(80,420); GFX.pt({x:x0+Math.cos(a)*r0,y:y0+Math.sin(a)*r0*FSY,z:2,vz:rand(120,320),g:-60,drag:1.4,life:rand(.5,.9),s:rand(6,13),rot:rand(0,TAU),vr:rand(-4,4),m:11,b:'alpha',c:GFX.rgb('#3a3450'),c2:'#08060f',shadow:true,L:2}); }
      while(na<Math.floor(u*5+u*u*9)){ na++; const a=rand(0,TAU), b=a+rand(.5,1.3), r1=r*1.5; bolt({x:q.x+Math.cos(a)*r1,y:q.y,z:q.z+Math.sin(a)*r1*.8},{x:q.x+Math.cos(b)*r*.45,y:q.y,z:q.z+Math.sin(b)*r*.4},{w:10+6*u,grow:.03,hold:.03,fade:.06,n:7,jit:.16,fork:0,body:0,pal:na%2?AZV:P,gain:.8+.5*u}); } });
    // 0.7: it is not let go outward - everything is swallowed by the bead in three frames (tails drawn toward it) and the bead goes up
    after(.7,()=>{ if(gt) gt.end(); const q=tip(), CWa=CWH(AZV);
      if(m) GFX.add(.1,k=>F.bill(m.m.glowO,q.x,q.y,q.z,120*(1-k)+60,120*(1-k)+60,0,{...CWa,a:.45+.4*k,gain:1.6+1.4*k}));
      if(m) GFX.add(.35,(k,t)=>F.quad(mm().seal,x0,y0,300-110*eo3(k),300-110*eo3(k),-.7*6-t*8,{...col(K.pal(P)),a:(1-k)*(1-k),gain:3.6*(1-k*.6),ero:k*.7,t0:sd0+.7+t})); }); }
  // 0.7: the throw. The bead leaves the staff as a bead (it is seen rising for three frames, drawn out longer as it gathers speed); the streak it
  // leaves from the staff to the sky has one shape, thins to a wire and is eaten from the bottom up; the floor answers with rings that fade out slowly
  after(.78,()=>{ const q=tip(), sd=rand(0,90), C=K.vc(P), CA=CWH(AZV), zs=q.z, OF=[]; for(let i=0;i<14;i++) OF.push(rand(-1,1));
    K.flare(q.x,q.y,zs,{pal:AZV,s:200,dur:.16,gain:2.4}); K.dust(x0,y0,{n:10,r:60,sp:[260,760],a:.45});
    { const lt=GFX.light(x0,y0,1000,AZV.l,.05,.4,{z:200,hold:.55}); GFX.add(.56,(k,t)=>{ lt.a=.75*sat(t/.1)*(1-.85*sat((t-.15)/.3)); }); } Cn.shake(.3); SFX.boom(1.8,.25); Cn.SND.shing(1.5,.4);
    // the signal thrown up: it tapers to a hair at the top, forks there, flickers frame to frame, and is gone from the bottom up in 0.4 s
    const FKa=[rand(.5,.9),-rand(.5,.9)], FKl=[rand(.12,.2),rand(.1,.16)];
    GFX.add(.44,(k,t)=>{ const hd=zs+1300*t+10000*t*t, f=sat((t-.16)/.26), wk=.4+.75*eo3(sat(t/.2)), sq=sat(t/.14), fz=.55+.45*Math.abs(hsh(Math.floor(t/.035),7,sd));
      if(t<.12&&vok()){ const r=72*(1-.2*sq), sz=r*(1+2.6*sq); VO.add('orb',q.x,q.y,hd-sz*.4,{ex:r,ey:r,ez:sz,pa:[.68,.22,2.6,5],pb:[.9,.22,1.2,.9],dens:7.5*(1-sat((t-.06)/.06)),gain:.9,seed:sd,smoke:0,fire:.5,...C}); }
      const tail=zs+(hd-zs)*f*f; if(!m||hd-tail<20) return; const ps=[], n=14; for(let i=0;i<n;i++){ const u=i/(n-1); ps.push({x:q.x+OF[i]*(18+40*u*u),y:q.y,z:mix(tail,hd,u),w:62*wk*sat(t/.1)*(1-.88*u)*fz}); }
      { const L=hd-tail, b0=ps[9]; for(let j=0;j<2;j++){ const l=L*FKl[j]; ps.push({...ps[ps.length-1],w:0},{x:b0.x,y:b0.y,z:b0.z,w:0}); for(let s=0;s<4;s++){ const v=(s+1)/4; ps.push({x:b0.x+Math.sin(FKa[j])*l*v+OF[s+j*4]*10,y:b0.y,z:b0.z+Math.cos(FKa[j])*l*v,w:62*wk*.22*(1-v*.8)*fz}); } } }
      F.ribbon(m.m.trB,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*1.6})),{...col(AZV),a:.8*(1-f*.6),gain:2.2,t0:sd-t*8,fd:[.03,.05,0,0],pm:[2,2,0,0]});
      F.ribbon(m.m.trC,ps,{...CA,a:1,gain:5,t0:sd,fd:[.03,.04,0,0]});
      if(t<.5&&Math.random()<.8) GFX.pt({x:q.x+rand(-40,40),y:q.y,z:mix(tail,Math.min(hd,zs+1100),Math.random()),vx:rand(-260,260),vz:rand(200,900),drag:2,life:rand(.25,.5),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); }); });
  // ---- build (0.9 - 3.4): the camera leaves her for B and sinks; the storm gathers (it only ever grows)
  after(.8,()=>Cn.move({x:bx,y:by-120,zoom:.8,tilt:.24,roll:.03},1.9,'io'));
  after(.9,()=>{ GFX.ambient(.36,.34,.56,1.5); SFX.thunder(.45); Cn.SND.inhale(2.4,.4); st.fl=1.2; });
  // the storm: a spout over B and five separate masses of cloud round it at different heights and depths, each arriving in its own time, each
  // drifting; dark (their shadow lies on the floor under them), lit from inside for a blink when lightning leaves them
  const LP=[[-.6,-170,.6,.34],[.57,-90,.67,.37],[-.2,170,.76,.29],[.33,220,.71,.27],[.04,-330,.84,.42]].map((q,i)=>({dx:q[0]*hw,dy:q[1],z:q[2]*Zt,s:q[3]*hw,sd:rand(0,90),t0:.1+i*.2,ph:rand(0,TAU)}));
  // the storm turns round the spout, ever faster, and draws in (tl: seconds since 0.9). Where a mass is at tl
  const swirl=tl=>{ const u=sat(tl/2.6); return .12*tl+.32*tl*tl*(1-.25*u); }, lpos=(L,tl)=>{ const a=swirl(tl)*(.7+.15*L.ph/TAU), ca=Math.cos(a), sa=Math.sin(a), sh=1-.18*sat(tl/2.6); return {x:bx+(L.dx*ca-L.dy*sa*.8)*sh,y:by+(L.dy*ca+L.dx*sa*.3)*sh}; };
  if(vok()){ const sd=rand(0,90), C=K.vc(GATE), CAz=col(AZV), LD=[-.3,-.42,.86];
    GFX.add(4.6,(k,t)=>{ const g=sat(t/2.5), ge=eo3(g), ret=sat((t-3.75)/.75), zb=mix(Zt*.36,280,ge)+Zt*.8*ret*ret, zt=Zt*.8+200, ez=Math.max(60,(zt-zb)/2), rr=hw*mix(.34,.6,ge), fl=st.fl, thin=Math.pow(1-ret,3); st.fl=fl*.84;
      if(m){ F.quad(m.m.dark,bx,by+40,hw*.95*ge,hw*.95*ge,0,{a:.6*sat(t/1.2)*thin}); for(const L of LP){ const gi=eo3(sat((t-L.t0)/1.3)), p=lpos(L,t); F.quad(m.m.dark,p.x+L.z*.12,p.y+90,L.s*1.1*gi,L.s*1.1*gi,0,{a:.5*gi*thin}); } }
      // lit from above: dark bellies, bright upper edges; the lightning lights them from inside (glow, rim)
      VO.add('funnel',bx,by,zb+ez,{ex:rr*1.45,ey:rr*1.45,ez,pa:[mix(.14,.05,ge),.6,.17,4+10*ge*ge],pb:[.01+.75*fl,2.4,.05,.6],dens:8*sat(t*4)*thin,gain:.9,seed:sd,smoke:1,fire:1,...C,cM:'#2a2f70',cC:'#8ea2ff',cS:'#0c0d26',cK:'#b4bcff',ld:LD,amb:.08,key:1.7,rim:(.16+.32*fl)*(1-.6*ret),shadow:8,glow:.3*fl+.22*g*g*(.5+.5*Math.sin(t*(5+16*g)))*(1-ret),ord:-2e9});
      LP.forEach((L,i)=>{ const gi=eo3(sat((t-L.t0)/1.3)); if(gi<=0) return; const lf=Math.max(st.lf[i],fl*.3), p=lpos(L,t); st.lf[i]*=.82;
        VO.add('blast',p.x,p.y,L.z+Zt*.75*ret*ret,{ex:L.s*1.7,ey:L.s*1.7,ez:L.s*1.25,pa:[.2+.27*gi,.88,2.7,.25+.6*g],pb:[.85*lf,1.1,1,.34],dens:10*sat((t-L.t0)*3)*thin,gain:.9,seed:L.sd,smoke:1,fire:1,...C,cM:'#3a3f90',cC:'#c8d4ff',cS:'#1a1c40',cK:'#b4bcff',ld:LD,amb:.07,key:1.7,rim:.2+.4*lf,shadow:9,glow:.6*lf+.18*g*g*(.5+.5*Math.sin(t*(4+14*g)+i*1.7))*(1-ret),steps:20,ord:-1.9e9+i}); });
      if(m&&fl>.05) F.bill(m.m.glowG,bx,by,zb+ez*.9,rr*.75,ez*.7,0,{...CAz,a:Math.min(.3,fl*.2)*(1-ret),gain:1}); },.9); }
  // the sky opens (0.95 - 3.4): where the bead went in, the cloud is torn into arms that wind round the spout; they turn with the storm (ever
  // faster) and tighten. Lit edges only: one strip, plus a white seam on them for the first half second while the sky is being torn open
  if(m){ const sd=rand(0,90), CG=col(GATE), CW=CWH(AZV), NA=4, NS=16, zv=Zt*.74;
    GFX.add(2.5,(k,t)=>{ const tl=t+.05, op=eo3(sat(t/.4)), R0=hw*(.08+.62*op)*(1-.2*k), ph=swirl(tl)*1.6+t*1.2, S=[], fo=1-sat((t-2.2)/.3);
      for(let a=0;a<NA;a++){ const ps=[]; for(let i=0;i<NS;i++){ const s=i/(NS-1), r=R0*(.12+.95*s), an=a*TAU/NA+ph+s*2.4+.25*Math.sin(s*7+t*2+a); ps.push({x:bx+Math.cos(an)*r,y:by+Math.sin(an)*r*FSY,z:zv-s*Zt*.12+40*Math.sin(s*9+a*2+t*3),w:(40+260*s)*(.7+.3*op)*Math.sin(Math.PI*Math.min(1,s*1.05+.02))}); }
        if(S.length){ const l=S[S.length-1]; S.push({x:l.x,y:l.y,z:l.z,w:0},{x:ps[0].x,y:ps[0].y,z:ps[0].z,w:0}); } S.push(...ps); }
      F.ribbon(m.m.trB,S,{...CG,cM:'#6f7cff',cC:'#c4ccff',a:(.2+.2*(1-k))*fo,gain:1.3+1.8*(1-op)+.8*st.fl,t0:sd-t*.6,fd:[.04,.06,0,0],pm:[2,2.2,0,0]});
      if(t<.6) F.ribbon(m.m.trC,S.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.12})),{...CW,a:1-t/.6,gain:4,t0:sd,fd:[.03,.04,0,0]}); },.95);
    // the bead arriving: the sky over the spout flashes where it tears
    after(1.0,()=>{ K.flare(bx,by,zv,{pal:AZV,s:hw*.5,dur:.2,gain:2.2}); { const lt=GFX.light(bx,by,hw,AZV.l,.05,.35,{z:600,hold:.3}); GFX.add(.31,(k,t)=>{ lt.a=.6*sat(t/.1)*(1-.7*sat((t-.14)/.16)); }); } SFX.thunder(.35); st.fl=1.4; }); }
  // the pool of light under the spout: it only grows
  { const pool=GFX.light(bx,by,300,JUD.l,.05,.3,{hold:2.75,z:140}); GFX.add(2.7,(k,t)=>{ pool.a=.08+.85*k*k; pool.r=300+hw*.3*k; if(m) F.quad(m.m.glowG,bx,by,Rc*(.5+1.3*k),Rc*(.5+1.3*k),0,{...col(JUD),a:.2+.6*k*k,gain:1.2}); },.9); }
  // lightning inside the cloud: one mass at a time lights up from within for two frames (nothing hangs in the air)
  for(let i=0;i<24;i++) after(1.15+2.25*Math.pow(i/24,.55),()=>{ if(!st.arcs) return; const j=(Math.random()*LP.length)|0, L=LP[j]; st.lf[j]=1; st.fl=Math.max(st.fl,.35);
    if(m){ const p=lpos(L,RT-T0-.9), lx=p.x+rand(-.4,.4)*L.s, C2=CWH(i%2?AZV:P); GFX.add(.09,k=>{ F.bill(m.m.glowO,lx,p.y,L.z-L.s*.2,L.s*.55,L.s*.3,0,{...C2,a:.32*(1-k),gain:1.5}); }); }
    if(i%3===0) Cn.SND.tick(1.6+Math.random(),.07); });
  // leaders: three thin dry strokes feel their way down to B before the first strike
  [1.24,1.31,1.37].forEach((t,i)=>after(t,()=>{ const lx=bx+(i%2?1:-1)*rand(80,280), ly=by+rand(-60,90); ubolt({x:lx+rand(-260,260),y:ly,z:Zt*.8},{x:lx,y:ly,z:0},{w:36+i*10,grow:.07,hold:.035,fade:.1,jit:.13,n:21,fork:2,pal:i%2?AZV:P,mp:i%2?GRAV:AZV,gain:.9,halo:1.3}); st.fl=.8; st.lf[i]=1;
    after(.07,()=>{ GFX.light(lx,ly,700,P.l,.8,.2,{z:80}); K.sparks(lx,ly,10,{pal:P,n:6,sp:[200,700],up:600,life:[.15,.35]}); K.dust(lx,ly,{n:3,r:20,sp:[160,420],a:.4,s:.7}); crawl(lx,ly,150,P,3,26); }); Cn.SND.tick(1.4+i*.3,.1); }));
  // light sifts down out of it
  for(let i=0;i<34;i++) after(1+i*.066,()=>{ if(!st.arcs) return; const vz=rand(1700,2600), a=rand(0,TAU), r=hw*rand(.05,.5), h=Zt*.8; GFX.pt({x:bx+Math.cos(a)*r,y:by+Math.sin(a)*r*FSY,z:h,vx:rand(-200,200),vz:-vz,life:h/vz,s:rand(2.5,4.5),m:3,len:.09,c:GFX.rgb(i%3?P.s:'#ffffff'),c2:P.b,L:3,fk:6}); });
  // now and then the static jumps from one of the charged to the next
  for(let i=0;i<9;i++) after(1.85+i*.18,()=>{ if(!st.arcs) return; const L=onScreen(200).filter(charged); if(L.length<2) return; const a=L[(Math.random()*L.length)|0]; let b=null, bd=950;
    for(const e of L){ const d=Math.hypot(e.x-a.x,(e.y-a.y)/FSY); if(e!==a&&d<bd&&d>120){ bd=d; b=e; } } if(!b) return;
    bolt({x:a.x,y:a.y,z:a.h*.55},{x:b.x,y:b.y,z:b.h*.55},{w:34,grow:.04,hold:.035,fade:.08,n:9,jit:.1,fork:0,body:0,pal:i%2?AZV:P}); a.flash=Math.max(a.flash,.5); b.flash=Math.max(b.flash,.5); Cn.SND.tick(2+Math.random(),.05); });
  // one strike: out of the underside of a cloud mass to the floor. Leader, channel, the same shape dying. The stone answers at once: a white flash
  // on the floor, a ball of plasma, stones and dust thrown up, arcs crawling out over the floor, a burn that stays. Everyone near is thrown,
  // lit white for a blink, and left carrying the charge. q floor point, w its weight (they get heavier), i its number
  const strike=(q,w,i)=>{ const Pb=i%3===2?AZV:P, x=q.x, y=q.y, j=i%LP.length, L=LP[j], lp=lpos(L,RT-T0-.9), ox=mix(x,lp.x,.3)+rand(-140,140); ubolt({x:ox,y,z:Zt*.78},{x,y,z:0},{w:w*.85+20,grow:.07,hold:.05,fade:.26,jit:.1,n:21,pal:Pb,mp:Pb===AZV?GRAV:AZV,fork:3,gain:1.15,halo:1.45,fl:.15,p3:1}); st.fl=.9; st.lf[j]=1.3;
    after(.07,()=>{ K.flare(x,y,30,{pal:UWH,s:Math.max(260,w*1.5),dur:.1,gain:3.2}); plasma(x,y,w*.7,Pb,{dur:.28,smoke:0,rise:w*.3,z:w*.22,gain:.55}); K.sparks(x,y,20,{pal:UWH,n:9,sp:[400,1600],up:1300,life:[.15,.4]}); GFX.light(x,y,1300,Pb.l,1.25,.4,{z:160});
      if(m){ const CWb=CWH(UWH), CL=col(Pb), lx=lp.x, lz=L.z-L.s*.35;
        // the underside of the mass it left is lit from below for a few frames: a wide flat glow under the cloud, so the cloud has a belly
        // the floor under it: a white-hot disc for two frames that shrinks to nothing (no colour ring lingers: the burn below is what stays)
        const sdk=rand(0,9); GFX.add(.2,(k,t)=>{ const fz=.8+.2*hsh(Math.floor(t/.05),5,sdk), wh=sat(1-t/.06); F.quad(m.m.glowG,x,y,w*(2.6-1.2*k),w*(2.6-1.2*k),0,{...(wh>.3?CWb:CL),a:.85*(1-k)*(1-k)*fz,gain:1.2+1.5*wh}); if(t<.16) F.bill(m.m.glowO,mix(lx,x,.25),lp.y,lz,L.s*1.2,L.s*.5,0,{...CL,a:.45*(1-t/.16)*fz,gain:1.5}); }); }
      K.dust(x,y,{n:7,r:w*.4,sp:[300,950],a:.6,s:1+w/220}); K.chunks(x,y,{n:2,kind:'stone',r:w*.3,sp:[260,760],up:1250,s:[20,40],pal:Pb,rock:'#3a3540',life:1.1});
      // the floor thrown up: dark grit and clods (they bounce), and smoke that stands up off the burn and leans away
      for(let j2=0;j2<Math.round(12*(GFX.QK||1));j2++){ const a=rand(0,TAU), v=rand(250,900); GFX.pt({x,y,z:6,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(500,1300),g:2600,drag:.2,life:rand(.6,1.1),s:rand(4,10),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(j2%3?'#3a3440':'#584c60'),c2:'#08070a',shadow:true,bounce:.3,fk:5,L:2}); }
      for(let j2=0;j2<4;j2++) GFX.pt({x:x+rand(-.3,.3)*w,y:y+rand(-.15,.15)*w,z:rand(15,50),vx:rand(-40,90),vy:rand(-20,20),vz:rand(160,320),g:0,drag:.5,life:rand(1.1,1.7),s:rand(34,60),grow:rand(120,200),m:5,b:'alpha',c:GFX.rgb(j2%2?'#1c1a2c':'#2c2a3c'),c2:'#000000',c3:'#3a3a54',er:.9,ns:rand(.9,1.6),w:1,a:.34,L:0});
      crawl(x,y,w*1.4,Pb,3,w*.24);
      burn(x,y,w*1.6,i%2);
      let nh=0; inCircle(x,y,360,e=>{ soft(e,Dm*.1,{kb:0,sx:x,sy:y}); K.knock(e,{from:[x,y],dist:210,up:1250,stun:1.4,fx:nh<3?1:0}); charge(e); if(nh<3) zapHit(e,true,Pb); if(nh++<2) K.ehit(e,{pal:AZV,pw:1.1,dir:Math.atan2((e.y-y)/FSY,e.x-x),ring:0,light:0}); });
      Cn.shake(.16+i*.03); if(i%2===0) hitstop=Math.max(hitstop,.025); SFX.thunder(.25+i*.05); SFX.boom(1.7-i*.06,.2+i*.03); }); };
  // the twelve places: spread over the whole screen, never two close together; bare floor where there is no one
  const E0=onScreen(200), picks=[], sep=(p,d)=>Math.hypot(p.x-x0,(p.y-y0)/FSY)>420&&picks.every(q=>Math.hypot(q.x-p.x,(q.y-p.y)/FSY)>d), pick=(n,kx)=>{ const yc=by+hh*.3, far=E0.filter(e=>Math.abs(e.x-bx)<hw*kx&&Math.abs(e.y-yc)<hh*kx*.95&&e.y>by-hh*.36&&dB(e)>Rc*2.2).sort((a,b)=>dB(b)-dB(a)), n0=picks.length;
    for(const e of far){ if(picks.length-n0>=n) break; if(sep(e,hw*.3)) picks.push({x:e.x,y:e.y}); }
    for(let i=0;picks.length-n0<n&&i<40;i++){ const a=i*2.4+n, p={x:bx+Math.cos(a)*hw*kx*.92,y:Math.max(by-hh*.36,yc+Math.sin(a)*hh*kx*.85)}; if(sep(p,hw*.26)&&dB(p)>Rc*2) picks.push(p); } };
  pick(3,.5); pick(4,.66); pick(5,.82);
  // they close in a little: the first fall at the edges of the screen, the later ones somewhat nearer the spout (never twice in one place)
  picks.sort((a,b)=>dB(b)-dB(a)).forEach((q,i)=>{ const u=Math.pow(i/11,1.5)*.3, d=dB(q); if(d*(1-u)>Rc*2.1){ q.x=mix(q.x,bx,u); q.y=mix(q.y,by,u); } });
  // they come faster and heavier: .3 s apart at first, on top of one another at the end
  picks.forEach((q,i)=>after(1.4+1.85*(1-Math.pow(1-i/11,1.6)),()=>strike(q,82+i*17,i)));
  // 3.1: the charge jumps to everyone the bolts missed
  after(3.1,()=>{ const all=onScreen(300), src=all.filter(charged), JL=[]; let n=0;
    for(const e of all){ e.stun=Math.max(e.stun,1.5); if(charged(e)) continue; charge(e);
      if(n<10&&src.length){ const s=src.reduce((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)<Math.hypot(b.x-e.x,b.y-e.y)?a:b); if(Math.hypot(s.x-e.x,s.y-e.y)<900){ n++; JL.push({a:{x:s.x,y:s.y,z:s.h*.5},b:{x:e.x,y:e.y,z:e.h*.5}}); } } }
    // all the jumps are one strip (two draws however many there are)
    if(JL.length) bolts(JL,{w:38,grow:.04,hold:.05,fade:.12,n:9,jit:.1,fork:0,body:0,pal:P});
    Cn.SND.shing(1.6,.35); SFX.thunder(.25); st.fl=.7; });
  // ---- the held breath (3.4 - 3.6): the cloud goes quiet (it does not shrink), what hangs in the air is drawn up into it
  after(3.4,()=>{ st.arcs=0; Cn.hush(.22); Cn.move({zoom:.86},.2);
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(150,hw*.55); GFX.pt({x:bx+Math.cos(a)*d,y:by+Math.sin(a)*d*FSY,z:rand(0,200),tx:bx,ty:by,tz:Zt*.7,pull:rand(5,8),life:rand(.2,.3),s:rand(3,6),m:3,len:.07,vz:rand(600,1400),c:GFX.rgb(Math.random()<.4?'#ffffff':JUD.s),c2:JUD.b,L:3}); } });
  // fulgurite: fused crystal that breaks out of the floor round the foot of the column. Not a ring of cones: three masses several times her height
  // leaning away from it (one of them in front of it, hiding its foot), and smaller ones crowding their feet. The great ones come with the
  // column, the rest with the blow. Their veins cool from white through violet to a dull red; then they snap, the small ones first.
  const CR=[[-2.05,.95,900,0,5.8],[-.72,1.05,780,0,5.72],[1.35,.8,640,0,5.76],[2.55,1.1,420,1,5.66],[-2.85,1.5,380,1,5.6],[.62,1.5,320,1,5.63]]
    .map((q,i)=>{ const a=q[0]+rand(-.12,.12), r=Rc*q[1]*rand(.92,1.08), big=i<3; return {i,big,a,x:bx+Math.cos(a)*r,y:by+Math.sin(a)*r*FSY,h:q[2]*rand(.92,1.08),late:q[3],tb:q[4]+rand(-.05,.05),rz:rand(0,TAU),ry:Math.cos(a)*rand(.16,.34),rx:Math.sin(a)*rand(.05,.16),fat:big?rand(1.5,1.8):rand(1,1.3),front:Math.sin(a)>0,dl:q[3]?(q[1]-1.4)*.09:i*.08,v:i%4,sa:rand(-.9,.9)}; });
  // a great crystal is two bodies: a heart that glows from inside (its veins carry the light up from the foot) and a clear shell over it
  // (specular, faces turned to the column take a white rim, its shadow falls away from the column). It is not there at once: a small point of
  // crystal breaks out of a crack and is pushed up and swells over half a second (it sinks back a little: the overshoot). It dies in steps:
  // cracks run white through it while its light goes out, it stands dark for a moment, then it falls apart into pieces and sinks
  const crystals=()=>{ if(!F.solid) return; const t00=RT-T0;
    GFX.add(END-t00,(k,t)=>{ const now=t00+t, ht=Math.pow(sat(1-(now-TC)/2.3),1.4), em=ht>.45?JUD.b:hexmix('#6a1638',JUD.b,ht/.45);
      for(const c of CR){ const t1=now-(c.late?TM:TC)-c.dl; if(t1<=0) continue; const gw=sat(t1/(c.big?.48:.32)), f=sat((now-c.tb)/.08), fs=sat((now-c.tb-.35)/Math.max(.3,END-.15-c.tb-.35)); if(fs>=1) continue;
        // shot up out of the crack from its foot: height first (past full, then settling back), girth after it. Before it breaks the crown snaps off (cr)
        const gx=gw-1, ob=gw<1?1+2.5*gx*gx*gx+1.5*gx*gx:1, gr=.5+.5*eo3(sat(gw*1.7)), cr=c.big&&now>c.tb-.22?.64:1,
          kk=st.ka*Math.exp(-Math.max(0,RT-st.kick)*9),
          cp=sat((now-(c.tb-(c.big?1.3:.8)))/(c.big?1.05:.55)), dk=sat((now-(c.tb-.35))/.3), fk=.55+.45*hsh(c.i,Math.floor(now/.05),3), crk=cp>0&&dk<1?cp*(1-dk)*fk:0, lit=(1-dk)*(1-.6*cp)+.9*kk*(1-dk),
          sg=Math.max(.04,ob)*(1+.03*Math.sin(now*9+c.i)*(1-cp)), z=-c.h*.12*(1-eo3(sat(gw*2)))-c.h*.04*cp, up=sat(t1/.5), hb=(.06+1.4*ht*up)*lit+.35*crk,
          wf=.52*c.fat/1.5*gr, M=F.xfw({sx:c.h*wf,sy:c.h*wf,sz:c.h*sg*cr,rz:c.rz,rx:c.rx+.08*cp*(c.i%2?1:-1),ry:c.ry+.05*cp});
        if(c.big&&cr<1&&!c.snap){ c.snap=1; const hz=c.h*.8; for(let j=0;j<14;j++){ const a=rand(0,TAU), v=rand(150,520); GFX.pt({x:c.x+Math.cos(a)*40,y:c.y+Math.sin(a)*40*FSY,z:hz*rand(.65,1),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(100,600),g:2600,drag:.1,life:rand(.6,1),s:rand(14,30),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(j%3?'#4a3c98':'#c8bcff'),c2:'#08061a',shadow:true,bounce:.25,L:2}); }
          K.sparks(c.x,c.y,hz*.65,{pal:JUD,n:8,sp:[200,800],up:500,life:[.15,.35]}); K.flare(c.x,c.y,hz*.64,{pal:JUD,s:160,dur:.06,gain:2.4}); Cn.SND.tick(1.1,.12); }
        // while it cracks the pieces come off it from the top down: a few shards break off the crown first, then lower and lower (one batch of particles)
        if(cp>0&&f<.6){ c.ns=c.ns||0; const nt=Math.floor((cp*.8+f*.4)*(c.big?16:5)); while(c.ns<nt){ c.ns++; const hz=c.h*sg*(.98-.85*sat(c.ns/(c.big?16:5)))+z, a=rand(0,TAU), rr=c.h*wf*sg*.18;
          GFX.pt({x:c.x+Math.cos(a)*rr,y:c.y+Math.sin(a)*rr*FSY,z:Math.max(20,hz),vx:Math.cos(a)*rand(60,260),vy:Math.sin(a)*rand(60,260)*FSY,vz:rand(-100,250),g:2600,life:rand(.5,.9),s:rand(10,22)*(c.big?1.7:1),rot:rand(0,TAU),vr:rand(-10,10),m:11,b:'alpha',c:GFX.rgb(c.ns%3?'#3a3278':'#8a78e0'),c2:'#0a0820',shadow:true,L:2});
          if(c.ns%3===0) GFX.pt({x:c.x,y:c.y,z:Math.max(20,hz),vx:rand(-300,300),vz:rand(0,500),g:1200,drag:1.2,life:rand(.2,.4),s:rand(2.5,4.5),m:3,len:.05,c:GFX.rgb('#ffffff'),c2:JUD.b,L:3}); } }
        // a great one sits on a lump of scorched basalt the bolt tore up (dust on its top, its cracks lit by the heat), and the glass grows out
        // of it as a cluster: a main crystal and a second leaning away from the bolt. The small ones are lone crystals breaking out of the floor
        const gl=(.08+.32*ht)*lit+.3*crk+.5*kk*(1-dk), ICE={alb:hexmix('#7a50e0','#2a1e60',dk),tintK:.85,dustC:'#0a0224',emis:crk>0||kk>.35?'#dcd4ff':em,rimC:JUD.h,spec:1.2,rim:.38*(1-.5*dk),clear:.2,frost:.35,bump:1.8,ero:f*.85};
        if(c.big){ const zs=-c.h*.16-c.h*.18*(1-eo3(sat(gw*1.5)))-fs*fs*c.h*.2, ca=Math.cos(c.a), sa=Math.sin(c.a);
          F.solid('stone',c.v,c.x,c.y,zs,{M:F.xfw({sx:c.h*.62*gr,sy:c.h*.52*gr,sz:c.h*.34*gr,rz:c.rz}),alb:'#2b2731',emis:em,rimC:JUD.h,spec:.35,rim:.2,glow:(.6*ht*lit+.6*crk)*(1-f*.7),dust:.35+.3*f,dustC:'#4c4452',tone:.3,bump:2.2,ero:fs*.8,seed:c.i*1.7,ord:c.front?1.8:-1.2});
          if(c.i<2&&f<1) F.solid('ice',(c.v+1)%4,c.x+ca*c.h*.16*gr,c.y+sa*c.h*.1*gr,z*.8,{M:F.xfw({sx:c.h*wf*.62,sy:c.h*wf*.62,sz:c.h*.56*sg*cr,rz:c.rz+1.3,rx:c.rx+sa*.45,ry:c.ry+ca*.45}),...ICE,glow:gl*.8,seed:c.i*2.3,ord:c.front?1.9:-1.1}); }
        if(f<1) F.solid('ice',c.v,c.x,c.y,z,{M,...ICE,glow:gl,seed:c.i*1.7,...(c.big?{shadow:[.26,.16,.42*(1-f)]}:{}),ord:c.front?2:-1}); } });
    // as each one comes up: grit and a puff of dust from the crack it breaks out of, a short flash at its foot
    // the charge runs over the glass: with each return stroke a thin arc crawls down the faces of the great ones, crown to foot (one strip for all)
    [3.78,3.9,4.02,4.62,4.92,5.22,5.5].forEach((tq,n)=>after(Math.max(.01,tq-t00),()=>{ const now=RT-T0, L=[];
      for(const c of CR){ if(!c.big||now<TC+c.dl+.2||now>c.tb-.3) continue; const a=rand(0,TAU), r=c.h*.1; L.push({a:{x:c.x+Math.cos(a)*r*.5,y:c.y+4,z:c.h*rand(.7,.85)},b:{x:c.x+Math.cos(a+rand(-1.2,1.2))*r,y:c.y+4,z:c.h*rand(.06,.2)}}); }
      if(L.length) bolts(L,{w:n<3?24:18,grow:.05,hold:.05,fade:.12,n:11,jit:.14,fork:1,body:0,pal:n%2?AZV:JUD,gain:1.1}); }));
    for(const c of CR) after(Math.max(.01,(c.late?TM:TC)+c.dl-t00),()=>{ const s=Math.min(3,c.h/400); K.dust(c.x,c.y,{n:2+((2*s)|0),r:20+c.h*.03,sp:[200,600],a:.5,s:.8+.3*s});
      for(let j=0;j<4+((3*s)|0);j++){ const a=rand(0,TAU), v=rand(150,500); GFX.pt({x:c.x+Math.cos(a)*30,y:c.y+Math.sin(a)*30*FSY,z:rand(10,c.h*.15),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(300,900),g:2600,life:rand(.4,.8),s:rand(5,11),rot:rand(0,TAU),vr:rand(-9,9),m:11,b:'alpha',c:GFX.rgb('#3a3450'),c2:'#08060f',shadow:true,L:2}); } });
    // the break: the great ones fall apart into many large pieces and smoke, the small ones into a few
    for(const c of CR) after(Math.max(.02,c.tb+.04-t00),()=>{ const s=c.h/400; K.chunks(c.x,c.y,{n:c.big?5:2,r:30+Math.min(c.h,1600)*.12,sp:[120,420*Math.min(2,.6+s*.5)],up:300+200*Math.min(2,s),s:c.big?[40,95]:[18+14*s,40+30*s],pal:P,kind:'iceshard',rock:'#9a84ff',life:Math.max(1.1,END-c.tb)}); K.sparks(c.x,c.y,Math.min(c.h,1500)*.4,{pal:P,n:4+((2*Math.min(3,s))|0),sp:[150,600],up:400,life:[.2,.45]}); K.dust(c.x,c.y,{n:3+((2*Math.min(3,s))|0),r:30+Math.min(c.h,1600)*.08,sp:[80,320],a:.5,s:.9+.4*Math.min(3,s)}); Cn.SND.tick(.7+c.i*.05,.16); { const nb=Math.round((c.big?18:6)*(GFX.QK||1)); for(let j=0;j<nb;j++){ const a=rand(0,TAU), hz=c.h*rand(.1,c.big?.85:.6), v=rand(80,360); GFX.pt({x:c.x+Math.cos(a)*30,y:c.y+Math.sin(a)*30*FSY,z:hz,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(-80,300),g:2600,drag:.15,life:rand(.8,1.4),s:rand(12,30)*(c.big?1.3:.8),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(j%4===0?'#c8bcff':j%2?'#4a3c98':'#2c2264'),c2:'#08061a',shadow:true,bounce:.25,fk:4,L:2}); } } if(c.big){ sfx('shatter',.3); Cn.shake(.14); GFX.light(c.x,c.y,600,P.l,.5,.25,{z:300}); } }); };
  // ---- 3.6: the column lands. This is the announcement, not the blow: no blur, a short shake. It is at full height in 0.05 s and keeps it
  after(TC,()=>{
    Cn.peak(bx,by,{ca:.01,blur:.03,a:.12,hold:.03,out:.1}); hitstop=Math.max(hitstop,.05); Cn.shake(.75); Cn.SND.hit(.6); SFX.thunder(1);
    GFX.ambient(.3,.28,.54,30); GFX.light(bx,by,hw*.9,JUD.l,.9,.35,{z:300,hold:.08}); GFX.light(bx,by,hw*.5,JUD.l,.9,.5,{z:200,hold:1.1});
    Cn.move({zoom:.64,tilt:.24,roll:0},.22,'out');
    // floor first, then the dark behind the light
    K.cool(bx,by,{kind:'scorch',r:hw*.4,pal:P,life:END-TC+1.4,hot:.85,gain:1.05});
    K.vsmoke(bx-Rc*.8,by-260,{s:Rc*2,dur:1.8,a:.75,rise:520,c:'#05041a',c2:'#2c2a66'});
    crystals();
    // the thunder's own sign, now on the underside of the storm where the bolt leaves it: a notched ring and two wings of lightning crawling
    // out along the cloud base. Dim between strokes, lit by each return stroke, gone as the channel dies. Foot: a broken crater under the
    // crystals (one decal). Two draws in all
    if(m){ const ZH=Zt*.62, fy=by+Rc*.2, CRA=col(K.pal(JUD)), sdh=rand(0,9);
      GFX.add(2.2,(k,t)=>{ const op=eo3(sat((t-.08)/.35)), kk=st.ka*Math.exp(-Math.max(0,RT-st.kick)*7), out=1-sat((t-1.45)/.6), a=op*out*(.12+.88*Math.min(1,kk*1.6)); if(a<=.01) return;
        const zz=ZH+50*Math.sin(t*1.7), sp=.55+.45*op, W=[], put=ps=>{ if(W.length){ const l=W[W.length-1]; W.push({x:l.x,y:l.y,z:l.z,w:0},{x:ps[0].x,y:ps[0].y,z:ps[0].z,w:0}); } W.push(...ps); };
        F.quad(m.craR,bx,by,Rc*2.1,Rc*2.1*.8,sdh,{cA:'#020108',cB:'#1a1430',cM:'#3a2a60',cC:hexmix(JUD.b,'#5a2040',sat((t-1)/1)),a:.95*Math.min(1,t/.15)});
        // the halo standing behind the eye: a broken ring of light, its rim notched (crown points) and turning slowly
        { const ps=[], R0=Rc*1.0*sp; for(let i=0;i<=56;i++){ const an=i/56*TAU+t*.4, cr=1+.16*Math.pow(Math.max(0,Math.cos(an*8)),6); ps.push({x:bx+Math.cos(an)*R0*cr,y:fy-6,z:zz+Math.sin(an)*R0*cr,w:(34+12*Math.sin(an*3+t*2))*(1+.5*kk)}); } put(ps); }
        // two wings: four feathers of lightning each fanned from the shoulder (the top one raised, the lowest pointing down), tips bending down
        for(const sx of [-1,1]) for(let f=0;f<4;f++){ const ps=[], L=Rc*(2.7-f*.4)*sp, th=.75-f*.38+.05*Math.sin(t*2+f); for(let i=0;i<9;i++){ const u=i/8, an=th-.35*u*u;
            ps.push({x:bx+sx*(Rc*.55+Math.cos(an)*L*u),y:fy-4,z:zz+Rc*.1+Math.sin(an)*L*u+Rc*.06*Math.sin(u*9+t*5+f),w:(60-f*9)*(1-u*.8)*(1+.6*kk)}); } put(ps); }
        F.ribbon(m.m.trB,W,{...CRA,a:a*(.55+.45*kk),gain:2.2+2.4*kk,t0:sdh-t*2,fd:[.02,.03,0,0],pm:[2,2,0,0]}); }); }
    thunderBolt();
    // what the bolt does to the floor (the crater decal is above): a spray of dirt and grit, and real broken stones thrown out of it
    K.chunks(bx,by,{n:2,kind:'stone',r:Rc*.3,sp:[300,900],up:1500,s:[Rc*.07,Rc*.15],pal:P,rock:'#3a3540',life:1.6});
    for(let i=0;i<Math.round(26*(GFX.QK||1));i++){ const a=rand(0,TAU), v=rand(300,1100); GFX.pt({x:bx,y:by,z:6,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(600,1500),g:2600,drag:.2,life:rand(.7,1.3),s:rand(4,11),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(i%4?'#3e3640':'#5a4a70'),c2:'#08070a',shadow:true,bounce:.3,fk:5,L:2,pri:1}); }
    K.flare(bx,by,Rc*.25,{pal:JUD,s:Rc*.6,dur:.1,gain:2}); K.sparks(bx,by,60,{pal:JUD,n:30,sp:[600,2200],up:1900,life:[.3,.9]}); K.dust(bx,by,{n:12,r:Rc,sp:[500,1400],a:.5}); });
  // ---- the bolt (3.6 - 5.05): not a column. One real stroke of lightning out of the belly of the storm onto B: a jagged channel whose branches die
  // in the air, a white thread whose thickness changes from point to point, a dim ionised haze round it. The same channel strikes again and again
  // (each return stroke two or three frames at full light, then a short afterimage; new branches each time); between strokes it hangs at a third.
  // The fifth (4.3) is THE blow: thickest, most branches. Over the held breath it sinks to a glimmer; from 4.7 the channel goes out.
  // RS: [seconds after TC, weight, branches]. Four draws: haze, glow, thread, floor pool
  const RS=[[0,1,5],[.11,.55,3],[.23,.7,4],[.35,1,5],[.7,1.5,8],[.82,.65,4],[.95,.5,3]];
  const thunderBolt=()=>{ if(!m||!K.m10) return; const M=K.m10(), CJ=col(JUD), CWb={cA:JUD.b,cB:JUD.m,cM:JUD.h,cC:'#ffffff'}, w=44, top=Zt*.78, sd=rand(0,99),
      A=[bx+rand(-.12,.12)*hw,by/FSY+rand(-90,30),top], B=[bx,by/FSY,0];
    const zig=(a,b,ro,lv)=>{ let Q0=[a,b]; for(let l=0;l<lv;l++){ const Q=[Q0[0]]; for(let i=1;i<Q0.length;i++){ const p=Q0[i-1], q=Q0[i], dl=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])*ro; Q.push([(p[0]+q[0])/2+rand(-dl,dl),(p[1]+q[1])/2+rand(-dl,dl)*.6,(p[2]+q[2])/2+rand(-dl,dl)*.3],q); } Q0=Q; } return Q0; };
    const main=zig(A,B,.21,6), nM=main.length;
    // the last points straighten into the strike point
    for(let i=nM-4;i<nM;i++){ const k=(i-(nM-4))/3; main[i][0]=mix(main[i][0],bx,k); main[i][1]=mix(main[i][1],by/FSY,k); }
    // thickness along the channel: slow swells and pinches times a grain, heavier toward the floor
    const r1=rand(0,9), r2=rand(0,9), mw=main.map((p,i)=>{ const u=i/(nM-1); return (.42+.58*(.5+.5*Math.sin(u*19+r1))*(.6+.4*Math.sin(u*47+r2)))*(.8+.45*Math.random())*(.7+.6*u); });
    let br=[], jt=[], si=-1;
    const mkStroke=j=>{ br=[]; const nb=RS[j][2], big=RS[j][1]>1.2;
      // a return stroke takes the same channel, shivered a little
      jt=main.map((p,i)=>i===0||i>nM-5?[0,0]:[rand(-1,1)*18,rand(-1,1)*12]);
      for(let b=0;b<nb;b++){ const i=Math.floor(rand(.08,big?.8:.68)*nM), s=main[i], len=s[2]*rand(.22,big?.6:.45), an=rand(0,TAU), e=[s[0]+Math.cos(an)*len*.75,s[1]+Math.sin(an)*len*.4,Math.max(30,s[2]-len*rand(.55,1))], Q=zig(s,e,.25,4);
        br.push(Q.map((p,q)=>({x:p[0],y:p[1]*FSY,z:p[2],k:(1-q/(Q.length-1))*rand(.45,.8)*(b<2?1:.65)})));
        // a branch may fork once more
        if(big&&b<3){ const q0=Q[Math.floor(Q.length*rand(.3,.6))], l2=len*rand(.3,.5), a2=an+rand(-1,1), e2=[q0[0]+Math.cos(a2)*l2,q0[1]+Math.sin(a2)*l2*.5,Math.max(30,q0[2]-l2*.8)], Q2=zig(q0,e2,.25,3); br.push(Q2.map((p,q)=>({x:p[0],y:p[1]*FSY,z:p[2],k:(1-q/(Q2.length-1))*.4}))); } } };
    const strip=(sc,bk)=>{ const out=[]; main.forEach((p,i)=>out.push({x:p[0]+jt[i][0],y:(p[1]+jt[i][1])*FSY,z:p[2],w:w*sc*mw[i]})); out.push({...out[out.length-1],w:0});
      if(bk>.02) for(const b of br){ out.push({...b[0],w:0}); for(const q of b) out.push({x:q.x,y:q.y,z:q.z,w:w*sc*q.k*.6*bk}); out.push({...b[b.length-1],w:0}); } return out; };
    GFX.add(END-TC,()=>{ const t=RT-T0-TC; if(t>1.5) return; let j=0; for(let i=0;i<RS.length;i++) if(t>=RS[i][0]) j=i;
      if(j!==si){ si=j; mkStroke(j); const wt=RS[j][1]; GFX.light(bx,by,hw*(.5+.35*wt),JUD.l,.7+.5*wt,.12,{z:400});
        K.sparks(bx,by,20,{pal:JUD,n:Math.round(10*wt),sp:[300,1400],up:1100,life:[.15,.45],s:3});
        // the return strokes that are not beats nudge the crystals and the sign, flash the cloud and give a crack of sound
        if(j===1||j===2||j>4){ st.kick=RT; st.ka=.3*wt; st.fl=Math.max(st.fl,.75); st.lf=st.lf.map(v=>Math.max(v,.6)); Cn.shake(.1+.1*wt); SFX.thunder(.12+.1*wt); } }
      const wt=RS[j][1], ds=t-RS[j][0], fl=.85+.15*hsh(Math.floor(t*55),j,sd), nw=RT-T0,
        I=(ds<.04?1.6*wt:.3+(1.6*wt-.3)*Math.exp(-(ds-.04)*24))*fl*(nw>TM-.15&&nw<TM?.3:1), af=sat((t-1.1)/.35), bk=sat((I-.35)/.9);
      if(af>=1) return; const Ia=I*(1-af);
      F.ribbon(M.lH,strip(10,bk),{...CJ,a:Math.min(.4,.2*Ia),gain:1.1});
      F.ribbon(M.lG,strip(3.6,bk),{...CJ,a:Math.min(1,Ia*1.1),gain:1.7+.9*Math.min(1.5,I),ulen:600});
      F.ribbon(M.lC,strip(1,bk),{...CWb,a:Math.min(1,Ia*1.1),gain:2.6+1.4*Math.min(1.5,I)}); }); };
  // where the floor bolts of the blow end, the sky answers: strokes from above onto those points (all of one colour are one strip), and at each
  // a flash, plasma under the heavy ones, stones, dust, arcs crawling out, a burn
  const endStrikes=L=>{ if(!L.length) return; [P,AZV].forEach((Pb,c)=>{ const G=L.filter((q,i)=>i%2===c); if(!G.length) return;
      ubolts(G.map(q=>({a:{x:q.x+rand(-180,180),y:q.y,z:Zt*.8},b:{x:q.x,y:q.y,z:0},w:q.big?100:72})),{grow:.04,hold:.06,fade:.16,jit:.1,n:21,pal:Pb,mp:c?GRAV:AZV,fork:2,gain:1.1,halo:1.45});
      after(.05,()=>{ const CWb=CWH(Pb); if(m) GFX.add(.15,k=>{ for(const q of G){ if(!q.big) continue; const s=330*(.7+.5*k); F.bill(m.m.glowO,q.x,q.y,40,s,s,0,{...CWb,a:(1-k)*(1-k),gain:2.6}); } });
        ubolts(G.flatMap(q=>crawlL(q.x,q.y,q.big?330:230,3)),{...CRW,w:28,pal:Pb});
        for(const q of G){ const x=q.x, y=q.y; if(q.big) plasma(x,y,150,Pb,{dur:.44,smoke:0,rise:90,z:50,gain:.85}); K.sparks(x,y,20,{pal:Pb,n:q.big?12:7,sp:[300,1400],up:1100,life:[.2,.5]}); GFX.light(x,y,q.big?1100:700,Pb.l,1.1,.35,{z:120});
          K.dust(x,y,{n:q.big?7:4,r:50,sp:[260,800],a:.5,s:1.2}); if(q.big) K.chunks(x,y,{n:2,r:40,sp:[240,700],up:1200,s:[20,42],pal:Pb,life:1.1}); burn(x,y,q.big?230:170,1); } }); }); };
  // the front of the blow: not a drawn ring. A roll of lit dust runs out over the floor from the column to past the edges of the screen (its radius
  // only grows, its colour is one), and short strokes of lightning stand up out of it wherever it is, each for a few frames
  const front=()=>{ if(!m) return; const R1=hw*1.8, dur=.9, CZ=GFX.rgb('#262a5c'); let sp=0, sb=0;
    GFX.add(dur,(k,t)=>{ const e=1-Math.pow(1-k,2.3), r=mix(Rc*1.3,R1,e), v=(R1-r)/dur*1.1;
      while(sp<t*270&&sp<200){ sp++; const a=rand(0,TAU), c=Math.cos(a), s=Math.sin(a), rr=r*(1.03-.45*Math.pow(Math.random(),1.7));
        GFX.pt({x:bx+c*rr,y:by+s*rr*FSY,z:rand(10,70),vx:c*v*.45+rand(-60,60),vy:s*v*.45*FSY,vz:rand(300,760),g:0,drag:1.7,life:rand(.6,1.05),s:rand(90,170),grow:rand(120,220),m:5,b:'alpha',c:sp%3?CZ:GFX.rgb('#16163a'),c2:'#000000',c3:'#3c4488',er:.9,ns:rand(.9,1.6),w:1,a:.27,L:0});
        if(sp%2) GFX.pt({x:bx+c*rr,y:by+s*rr*FSY,z:rand(10,120),vx:c*v*.7,vy:s*v*.7*FSY,vz:rand(500,1500),g:1800,drag:1,life:rand(.25,.5),s:rand(2.5,5),m:3,len:.06,c:GFX.rgb(sp%4===1?'#ffffff':AZV.s),c2:AZV.b,L:3}); }
      while(sb<t*7&&sb<4&&k<.75){ sb++; const L=[]; for(let j=0;j<7;j++){ const a=rand(0,TAU), x=bx+Math.cos(a)*r, y=by+Math.sin(a)*r*FSY, h=rand(240,520)*(1-.4*k); L.push({a:{x:x+rand(-.3,.3)*h,y,z:h},b:{x,y,z:0}}); } bolts(L,{w:46,grow:.03,hold:.04,fade:.09,n:9,jit:.13,fork:1,pal:AZV,halo:1.5}); } }); };
  // the three beats: the column swells, and lightning runs out from its foot over the floor all the way round - a third of the way, most of the
  // way, and on the third (THE blow, 4.3) to the edges of the screen and past them. Everyone it passes goes off and is thrown outward
  const beat=i=>after(TC+i*.35,()=>{ const all=onScreen(500).sort((a,b)=>dB(a)-dB(b)), M=all.filter(charged), L=i===2?all:M.slice(0,Math.ceil(M.length/(3-i))), Pb=i===1?AZV:JUD, N=[7,9,16][i], F0=[.5,.85,1.25][i], wB=[70,86,112][i], a0=rand(0,TAU);
    st.kick=RT; st.ka=[.45,.65,1][i]; st.fl=[.8,1,1.6][i]; st.lf=st.lf.map(()=>i===2?1.4:.6);
    if(i===1){ Cn.shake(.6); hitstop=Math.max(hitstop,.04); SFX.thunder(.8); SFX.boom(1.1,.5); GFX.light(bx,by,hw*1.2,AZV.l,1,.3,{z:300}); after(.14,()=>Cn.hush(.19)); }
    if(i===2){ Cn.peak(bx,by,{ca:.03,blur:.16,tint:'#9a6cff'}); hitstop=Math.max(hitstop,.12); Cn.shake(1.8); Cn.SND.hit(1); SFX.thunder(1.3); SFX.boom(.9,.7);
      GFX.light(bx,by,hw*1.9,AZV.l,1.35,.4,{z:300,hold:.08}); Cn.move({zoom:.5,tilt:.28,roll:0},.18,'out'); GFX.ripple(bx,by,hw*1.6,{life:.5,s:.9});
      K.cool(bx,by,{kind:'crack',r:1050,pal:AZV,life:END-TM+1.2,hot:.85,grow:.22,gain:1.6}); 
      K.flare(bx,by,Rc*.4,{pal:JUD,s:Rc*1.7,dur:.16,gain:2.6}); K.chunks(bx,by,{n:5,r:Rc,sp:[600,1700],up:2200,s:[50,100],pal:JUD}); K.sparks(bx,by,60,{pal:JUD,n:44,sp:[700,2600],up:2000,life:[.3,.9]});
      if(m){ const CWa=CWH(AZV); GFX.add(.12,k=>{ F.quad(m.m.glowG,bx,by,hw*1.2,hw*1.2,0,{...CWa,a:.34*(1-k),gain:1.2}); F.bill(m.m.glowO,bx,by,Zt*.72,hw*1.5*(1+.3*k),Zt*.13,0,{...CWa,a:.5*(1-k)*(1-k),gain:1.7}); }); }
      front(); }
    K.sparks(bx,by,80,{pal:Pb,n:20,sp:[700,2400],up:900,life:[.25,.6]});
    const RB=[[],[]], ES=[];
    for(let q=0;q<N;q++){ const a=a0+(q+rand(-.28,.28))/N*TAU, long=i===2&&q%2===0, fr=F0*(long?rand(1.35,1.6):rand(.72,1.08)), x=bx+Math.cos(a)*hw*fr, y=by+Math.sin(a)*hh*fr*1.05;
      RB[q%3===1?1:0].push({a:{x:bx+Math.cos(a)*Rc*.45,y:by+Math.sin(a)*Rc*.45*FSY,z:70},b:{x,y,z:0},w:i===2?(q%3===0?rand(130,160):rand(52,80)):wB*rand(.8,1.25),h:i===2&&q%3===0?rand(.04,.08):0});
      if(i===2&&long) after(.06,()=>{ for(const u of [.38,.72]){ const px=mix(bx,x,u), py=mix(by,y,u); K.dust(px,py,{n:3,r:60,sp:[200,620],a:.55,s:1.4}); for(let j=0;j<5;j++) GFX.pt({x:px+rand(-80,80),y:py+rand(-40,40),z:5,vx:rand(-200,200),vy:rand(-60,60),vz:rand(500,1100),g:2600,life:rand(.4,.75),s:rand(7,14),rot:rand(0,TAU),vr:rand(-9,9),m:11,b:'alpha',c:GFX.rgb('#2e2a3c'),c2:'#07060c',shadow:true,L:2}); } });
      if(i===2&&q%4===2&&m) for(let j=0;j<1;j++){ const u=.5; after(.1+j*.05,()=>burn(mix(bx,x,u)+rand(-60,60),mix(by,y,u)+rand(-30,30),rand(150,210),1)); }
      if(i===2){ if(!long) ES.push({x,y,big:q%4===1}); } else if(i===1&&q%3===0) after(.075,()=>{ K.sparks(x,y,20,{pal:Pb,n:7,sp:[300,1100],up:800,life:[.2,.5]}); K.dust(x,y,{n:3,r:30,sp:[200,600],a:.45}); burn(x,y,170,1); GFX.light(x,y,600,Pb.l,.9,.25,{z:60}); }); }
    // on the blow the floor bolts step in colour as they run out: white at the column, azure in the middle, violet at the far ends
    // the blow holds its peak (0.16 s), then the strokes go out one after another, the farthest first, each eaten back from its far end
    if(i===2){ const AB=RB[0].concat(RB[1]), dm=AB.reduce((a,q)=>Math.max(a,Math.hypot(q.b.x-bx,(q.b.y-by)/FSY)),1); for(const q of AB) q.dl=.22*(1-Math.hypot(q.b.x-bx,(q.b.y-by)/FSY)/dm)+rand(0,.03); }
    if(i===2) ubolts(RB[0].concat(RB[1]),{flat:1,grow:.1,hold:.16,fade:.3,ret:.85,n:29,jit:.16,taper:.3,fork:5,bands:[[0,.24,UWH,AZV],[.24,.6,AZV,JUD],[.6,1,P,GRAV]],gain:1.15,halo:1.6,fl:.6});
    else RB.forEach((G,c)=>ubolts(G,{flat:1,grow:.07,hold:[.06,.07][i],fade:[.16,.18][i],ret:.85,n:25,jit:.15,taper:.3,fork:3,fl:.5,pal:c?AZV:P,mp:c?GRAV:AZV,gain:1.15,halo:1.6}));
    if(ES.length) after(.085,()=>endStrikes(ES));
    L.forEach((e,j)=>after(Math.min(.1,dB(e)/(hw*1.6)*.08),()=>{ if(e.dead) return; const h=K.marked(e,'shock'); if(h){ if(j<(i===2?5:3)) h.pop({quiet:j>=1}); else h.end(); } if(!st.hit.has(e)){ st.hit.add(e); soft(e,Dm*.4,{crit:true,kb:0,sx:bx,sy:by}); } K.knock(e,{from:[bx,by],dist:i===2?460:300,up:i===2?1700:1300,fx:j<10?1:0}); if(j<(i===2?3:5)) zapHit(e,j<3,j%2?AZV:Pb); })); });
  // the last breath before the blow: for two frames the light drops out of the whole screen and the column sinks to a glow
  after(TM-.15,()=>{ GFX.ambient(.08,.07,.18,.05); Cn.hush(.14); });
  // the in-breath of the blow: for the last tenth of a second everything is sucked into the foot of the bolt (streaks drawn in, a glow
  // closing on it, the camera pushed in a hair) so the blow is read as the release of it
  after(TM-.16,()=>{ Cn.move({zoom:.7},.15,'in');
    for(let i=0;i<Math.round(60*(GFX.QK||1));i++){ const a=rand(0,TAU), d=rand(hw*.35,hw*1.1), lf=rand(.12,.16), c=Math.cos(a), s=Math.sin(a); GFX.pt({x:bx+c*d,y:by+s*d*FSY,z:rand(10,260),vx:-c*d/lf*.95,vy:-s*d*FSY/lf*.95,vz:0,g:0,life:lf,s:rand(3.5,6.5),m:3,len:.05,c:GFX.rgb(i%3?JUD.s:'#ffffff'),c2:JUD.b,L:3,pri:1}); }
    // a broken ring of standing static closes on the foot of the bolt (one strip, its radius thrown afresh every two frames)
    if(m){ const CWa=CWH(AZV), sdr=rand(0,9); GFX.add(.15,(k,t)=>{ const r=mix(hw*1.05,Rc*.35,k*k), fr=Math.floor(t/.033), ps=[];
      for(let i=0;i<=44;i++){ const an=i/44*TAU, j=1+.09*hsh(i%44,fr,sdr); ps.push({x:bx+Math.cos(an)*r*j,y:by+Math.sin(an)*r*j*FSY,z:20+30*Math.abs(hsh(i%44,fr,sdr+2)),w:(26+40*k)*(.45+.55*Math.abs(hsh(i%44,fr,sdr+4)))}); }
      F.ribbon(m.arcH,ps,{...col(AZV),a:.25+.5*k,gain:1.6+1.2*k,ero:.45-.2*k,t0:sdr+fr,fd:[0,0,0,0]}); }); } });
  after(TM+.02,()=>GFX.ambient(.32,.29,.56,.35));
  beat(0); beat(1); beat(2);
  after(TC+1.0,()=>Cn.sweep(bx,by,Dm));
  // ---- ruin (4.7 - 6.8): the column burns down from the top (above); the camera settles in on what is left, and what is left keeps moving
  after(4.75,()=>{ Cn.move({zoom:.6,tilt:.2},.75); SFX.rumble&&SFX.rumble(.8); });
  // the heat left in the stone: a wide glow at the foot that goes from violet to a dull red and is still there, low, at the end
  // (light only: no glowing disc on the floor - the cracks of the decal carry the heat)
  { const lt=GFX.light(bx,by,hw*.5,P.l,.01,.3,{hold:END-4.7,z:60}); GFX.add(END-4.75,(k,t)=>{ const c=hexmix(P.l,'#a02a5a',sat(k*1.4)); lt.c=GFX.rgb(c); lt.a=.8*(1-.65*k); lt.r=hw*(.5-.12*k); },4.75); }
  after(4.95,()=>{ K.embers(bx,by,hw*.5,{pal:P,n:36,life:1.8,up:380}); });
  after(5.7,()=>{ K.embers(bx,by,hw*.4,{pal:P,n:20,life:1.2,up:300}); });
  // smoke: two slow dark masses that do not stand still - they lean off downwind, spread and thin as they go; and a low smoke that rolls out
  // over the whole burnt floor and is lifting off it to the very end
  after(4.85,()=>K.vsmoke(bx+Rc*.3,by-40,{s:Rc*1.5,dur:2,a:.6,rise:420,vx:Rc*2,c:'#0c0b1c',c2:'#3c3a5a'}));
  for(let i=0;i<44;i++) after(4.9+i*.04,()=>{ const a=rand(0,TAU), r=rand(.15,1)*hw*.45, c=Math.cos(a), s=Math.sin(a); GFX.pt({x:bx+c*r,y:by+s*r*FSY,z:rand(5,30),vx:c*rand(80,220)+60,vy:s*rand(40,120)*FSY,vz:rand(40,120),g:0,drag:.5,life:rand(1.1,1.7),s:rand(50,90),grow:rand(120,200),m:5,b:'alpha',c:GFX.rgb(i%2?'#2a2a4a':'#3a3850'),c2:'#000000',c3:'#4a4a7a',er:.9,ns:rand(.9,1.6),w:1,a:.32*(1-i/60),L:0}); });
  // lightning left in the cracks: five times, each time fewer, weaker and later, it runs out along them from the foot of the column
  [5.12,5.45,5.84,6.24,6.56].forEach((t,i)=>after(t,()=>{ const a0=rand(0,TAU), n=i<2?3:i<4?2:1; for(let q=0;q<n;q++){ const a=a0+q*TAU/n+rand(-.5,.5), r0=rand(60,200), r1=rand(640,1050)*(1-i*.1);
      levin({x:bx+Math.cos(a)*r0,y:by+Math.sin(a)*r0*FSY,z:6},{x:bx+Math.cos(a)*r1,y:by+Math.sin(a)*r1*FSY,z:rand(6,50)},{flat:1,w:84-i*9,dur:.26,grow:.06,n:10,jit:.07,fork:2,body:0,pal:q%2?AZV:P,gain:1.05-i*.1,delay:q*.04}); }
    GFX.light(bx,by,700,P.l,.8-i*.12,.25,{z:60}); K.sparks(bx,by,20,{pal:P,n:6-i,sp:[150,600],up:500,life:[.15,.4]}); Cn.SND.tick(1.6+i*.3,.1); }));
  // every place a strike fell still spits now and then: a short arc standing up out of the burn (fewer as time goes)
  picks.forEach((q,i)=>{ const n=i%3===0?2:1; for(let j=0;j<n;j++) after(4.75+1.85*Math.pow(Math.random(),1.5),()=>{ const a=rand(0,TAU), h=rand(260,520); levin({x:q.x,y:q.y,z:0},{x:q.x+Math.cos(a)*h*.5,y:q.y,z:h},{w:42,dur:.2,grow:.04,n:6,jit:.12,fork:1,body:0,pal:j?AZV:P,gain:.9}); GFX.light(q.x,q.y,380,P.l,.6,.2,{z:40}); K.sparks(q.x,q.y,8,{pal:P,n:3,sp:[120,420],up:420,life:[.15,.35]}); }); });
  after(END-1.3,()=>{ Cn.back(1.2); GFX.ambient(1,1,1,1.6); });
  after(END,()=>ultStop()); }

// ---- STAR OF THE END (종언의 별) - a fall, whole-screen. One star comes down a slant out of the upper right: a broken molten rock, its leading
// face white plasma, fire and smoke tails behind it. It is in the sky for the whole build, growing; its shadow closes on P; three pieces
// break off it and land in the left, right and near thirds of the field (each a small real impact). Held breath. Contact (K3.impact): flash,
// ejecta curtain, rolling dust ring to the edges of the screen, mushroom cloud, molten crater; the floor bursts up as the front passes; seven
// burning pieces are flung over the whole field and go off where they land. What is left: the crater cooling, the broken core lying in it.
const STG={d:'#2a0a4a',b:'#c860ff',m:'#ffd08a',h:'#fffaf0',l:'#ffd070',s:'#ffe2b0'}, STB={d:'#14032c',b:'#8226e6',m:'#dc64c8',h:'#ffdca8',l:'#b070ff',s:'#ffd9a0'}, BRN={d:'#12043c',b:'#5a1ee0',m:'#8a3cff',h:'#e0b8ff',l:'#7a48e0',s:'#cfbcff'}, STV={d:'#12043c',b:'#7038f0',m:'#c48cff',h:'#f0e0ff',l:'#8c68ff',s:'#cfbcff'};
const hx2=v=>('0'+Math.round(sat(v)*255).toString(16)).slice(-2), hexmix=(a,b,k)=>{ const p=GFX.rgb(a), q=GFX.rgb(b); return '#'+hx2(mix(p[0],q[0],k))+hx2(mix(p[1],q[1],k))+hx2(mix(p[2],q[2],k)); };
// SPIRE: a splinter of the star standing in the floor: it comes up out of the stone, its veins cool from white through gold to violet, and at the
// end of its life it cracks into pieces. o: {lean, rz, v, cool (seconds its veins take to cool), brk, n, delay, hot}
function spire(x,y,h,life,o={}){ if(!F.on||!F.solid) return; const vi=o.v??((Math.random()*4)|0), rz=o.rz??rand(0,TAU), cl=o.cool||life*.75, brk=o.brk??.4, h0=o.hot??1;
  GFX.add(life,(k,t)=>{ const e=eo3(sat(t/.1)), f=sat((t-(life-brk))/brk), ht=h0*Math.pow(sat(1-t/cl),1.3), em=ht>.5?hexmix('#ffc860','#fff2d2',(ht-.5)*2):hexmix('#7a34f0','#ffc860',ht*2);
    F.solid('crystal',vi,x,y,-h*.5*(1-e)-f*30,{M:F.xfw({s:h,rz,rx:0,ry:o.lean||0}),alb:'#35286a',emis:em,rimC:'#fff2d2',spec:1.3,rim:.3,vein:.22+.78*ht,heat:.06+1.4*ht,ero:f*.9,bump:.6,tone:.22,shadow:[.5,.3,.45*(1-f)]}); },o.delay||0);
  after((o.delay||0)+life-brk,()=>{ if(o.n!==0) K.chunks(x,y,{n:o.n||3,r:h*.12,sp:[150,480],up:h*2.2,s:[h*.07,h*.15],pal:STA,kind:'crystal'}); K.sparks(x,y,h*.4,{pal:STA,n:6,sp:[150,600],up:500,life:[.2,.5]}); }); }
// the fire of a falling body (its seams, its plasma face, its tail): orange-white. Violet stays in the cracks, the sky and the afterglow only.
const SFI={d:'#140d21',b:'#a94cfa',m:'#cd7ff5',h:'#fff6e0',l:'#c870f3',s:'#ecd4ff'};
// METEOR BODY: one broken rock (the kit's 'meteor' mesh: pitted, cleaved, molten seams glowing in its crust) tumbling about its middle; its face toward
// the air a skin of white plasma (the shader's hot face + a cap pressed onto that face, never a ball in front of it).
//  (x,y,z) its middle, s its radius, v variant, (rx,ry,rz) attitude, d the way it moves [dx,dy,dz] (unit; y in depth units), hk heat 0..1, o: {emis, rock}
// uneven proportions per variant so no two read as the same egg
const MSQ=[[1.1,.86,.95],[.92,1.05,.86],[1.08,.96,.84],[.9,.88,1.06]];
// the dull ember light left in broken stone (so stone that crumbles goes out red-brown, not violet)
const EMB={d:'#09060e',b:'#1e1330',m:'#5f1e98',h:'#9353cb',l:'#7726be',s:'#d38ef6'};
// column-major 4x4 product (a sub-piece's transform carried by the body's)
const mul4=(A,B)=>{ const C=new Float32Array(16); for(let c=0;c<4;c++) for(let r=0;r<4;r++){ let s=0; for(let k=0;k<4;k++) s+=A[k*4+r]*B[c*4+k]; C[c*4+r]=s; } return C; };
// the lumps welded to the main stone (offset in model units, scale, attitude): they break the outline into knuckles and a broken shelf
const LMP=[[.26,.08,.2,.78,.7,.72,.4,1.1,.3],[-.24,-.12,.1,.72,.66,.7,1.7,.4,2.1],[.04,.2,-.12,.7,.74,.62,2.6,2,.8]];
// the shading of molten stone: the face into the air hot orange to white, the rest charred black with seams
const metOpt=(M,d,hk,o)=>({M,clip:0,mode:3,alb:o.rock||'#13101a',emis:o.emis||SFI.b,rimC:'#cb79f4',spec:.25,rim:.18,glow:.14+.4*hk,hot:[d[0],d[1],d[2],.1+.2*hk],bump:2.6,dust:0,edge:.07,detail:1,strata:0,seed:o.seed||1.3});
function metBody(x,y,z,s,v,rx,ry,rz,d,hk,o={}){ if(!F.solid) return; const m=K.m10(), q=MSQ[v&3], M=F.xfw({sx:s*1.45*q[0],sy:s*1.3*q[1],sz:s*1.4*q[2],rx,ry,rz}); M[12]-=M[8]*.35; M[13]-=M[9]*.35; M[14]-=M[10]*.35;
  // an angular broken stone (the kit's cleaved 'stone' mesh drawn with the molten shading), and for the great one knuckles of rock welded on
  // (2026-11-25) the body is a round ball of fire now, not a lumpy stone: the kit's fireball, its heat following hk
  if(K.fireball&&K.real){ K.fireball(x,y,z,s*1.08,{emis:o.emis||SFI.b,hot:'#fff2d0',seed:v*1.7,a:.8+.2*hk}); } else {
  F.solid('stone',v,x,y,z,metOpt(M,d,hk,o));
  if(o.lumps) for(let i=0;i<o.lumps;i++){ const L=LMP[(i+v)%3], B=F.xf({sx:L[3],sy:L[4],sz:L[5],rx:L[6],ry:L[7],rz:L[8]}); B[12]=L[0]-B[8]*.35; B[13]=L[1]-B[9]*.35; B[14]=L[2]+.35-B[10]*.35; F.solid('stone',(v+i+1)&3,x,y,z,metOpt(mul4(M,B),d,hk,{...o,seed:2.1+i})); } }
  const fl=.9+.1*Math.sin(RT*41+v*3);
  if(o.cap!==0) F.bill(m.flash,x+d[0]*s*.55,y+d[1]*s*.55*FSY,z+d[2]*s*.55,s*.85*fl,s*.6*fl,0,{cA:SFI.b,cB:SFI.m,cM:SFI.h,cC:'#ffffff',a:.2+.18*hk,gain:1.6}); }
// SHARD: a piece of the star thrown from a point in the air a {x,y,z} to a floor point b {x,y}: a small burning rock tumbling on an arc, a fire
// tail behind it that thins to nothing, embers and smoke torn off it that stay hanging along the path.
//  o: {dur, s, arc (extra height at the middle of the flight), ease, heat, delay}
function shard(a,b,o={}){ if(!F.on) return; const m=mm().m, dur=o.dur||.5, s=o.s||120, ah=o.arc||0, ez=o.ease||(k=>k), C={cA:'#1a112a',cB:'#9a3ceb',cM:'#cb79f4',cC:'#fff6dc'}, sd=rand(0,9), vi=(Math.random()*4)|0, ax=rand(-7,7), ay=rand(-7,7), st={e:0,tp:0};
  const at=k=>{ const e=ez(sat(k)); return {x:mix(a.x,b.x,e),y:mix(a.y,b.y,e),z:mix(a.z,0,e)+ah*4*e*(1-e)}; };
  GFX.add(dur,(k,t)=>{ const p=at(k), q=at(k+.03), dl=Math.hypot(q.x-p.x,(q.y-p.y)/FSY,q.z-p.z)||1, d=[(q.x-p.x)/dl,(q.y-p.y)/FSY/dl,(q.z-p.z)/dl], ps=[], n=7, i=sat(t/.08), dt=Math.max(0,t-st.tp); st.tp=t;
    for(let j=0;j<n;j++){ const u=j/(n-1), w=at(k-(1-u)*.3*i); ps.push({x:w.x,y:w.y,z:w.z+s*.3,w:s*(.04+.62*u*u)}); }
    F.ribbon(m.trB,ps,{...C,a:.95,gain:3,t0:sd,fd:[.7,.02,0,0]});
    metBody(p.x,p.y,p.z+s*.3,s*.62,vi,ax*t+1.2,ay*t,sd,d,.8,{cap:0});
    st.e+=dt*55; while(st.e>=1){ st.e-=1; if(Math.random()<.55) GFX.pt({x:p.x+rand(-.4,.4)*s,y:p.y,z:p.z+s*.3,vx:-d[0]*rand(100,500),vy:rand(-60,60),vz:-d[2]*rand(100,500)+rand(0,200),g:900,drag:1,life:rand(.25,.6),s:rand(3,6),m:3,len:.04,c:GFX.rgb(Math.random()<.4?'#ffffff':SFI.s),c2:SFI.b,L:3});
      else GFX.pt({x:p.x-d[0]*s*.6,y:p.y-d[1]*s*.6*FSY,z:p.z+s*.3-d[2]*s*.6,vx:rand(-30,30),vy:rand(-15,15),vz:rand(10,60),g:0,drag:.9,life:rand(.9,1.5),s:rand(24,40)*(s/120),grow:rand(40,80),m:5,b:'alpha',c:GFX.rgb('#231c2e'),c2:'#000000',c3:'#594876',er:.9,ns:rand(.9,1.6),w:1,a:.42,L:2}); } },o.delay||0); }
// RAYS: what a great impact throws out over the floor in every direction: streaks of hot matter on low arcs, uneven in length, each burning out from its tail
function rays(x,y,r0,R,o={}){ if(!F.on) return; const m=mm().m, n=o.n||10, a0=rand(0,TAU), L=[], dur=o.dur||.6;
  for(let i=0;i<n;i++) L.push({a:a0+(i+rand(-.3,.3))/n*TAU,l:R*rand(.6,1.25),h:rand(200,620),w:rand(60,125),sd:rand(0,9),d:rand(0,.08),C:i%3?{cA:'#1a112a',cB:'#9a3ceb',cM:'#cb79f4',cC:'#fff6dc'}:col(SFI)});
  GFX.add(dur+.1,(k,t)=>{ for(const q of L){ const u=sat((t-q.d)/dur); if(u<=0||u>=1) continue; const hd=eo3(u), tl=Math.max(0,hd-.34*(1-u*.6)), ps=[], ca=Math.cos(q.a), sa=Math.sin(q.a);
      for(let j=0;j<7;j++){ const v=mix(tl,hd,j/6), d=r0*.5+(q.l-r0*.5)*v; ps.push({x:x+ca*d,y:y+sa*d*FSY,z:Math.sin(Math.PI*Math.min(1,v*1.05))*q.h+20,w:q.w*(.15+.85*j/6)*(1-u*.5)}); }
      F.ribbon(m.trB,ps,{...q.C,a:1-u*u,gain:3.6,t0:q.sd,fd:[.6,.02,0,0]}); } },o.delay||0); }
// VANGUARD: a piece of the star that arrives ahead of it on the same slant: the kit's meteor (molten rock, plasma face, breaking fire and smoke
// tails, embers, its light on the floor and its shadow closing). It lands without the kit's impact; the caller sets off its own.
//  o: {ux,uz (the slant, pointing back up the path), s, dur, len, delay}
function vanguard(tx,ty,o={}){ const L0=o.len||2600; K.meteor(tx,ty,{s:o.s||130,dx:o.ux*L0,dy:0,h0:o.uz*L0,dur:o.dur||.45,spin:3,pal:SFI,impact:false,delay:o.delay}); }
// FRAGMENT: a piece of the star lying where it came down, half sunk in the floor: its seams cool from white-gold through orange to dark, smoke
// threads off it while it is hot, and at the very end it settles and crumbles into the floor (it never just goes out).
//  o: {cool (seconds), v, delay}
function frag(x,y,s,life,o={}){ if(!F.on||!F.solid) return; const vi=o.v??((Math.random()*4)|0), rx=rand(0,TAU), ry=rand(0,TAU), rz=rand(0,TAU), cl=o.cool||life*.6, st={e:0,tp:0};
  GFX.add(life,(k,t)=>{ const e=eo3(sat(t/.14)), ht=Math.pow(sat(1-t/cl),1.2), f=sat((t-(life-.5))/.5), dt=Math.max(0,t-st.tp), q=MSQ[vi&3], M=F.xfw({sx:s*1.6*q[0],sy:s*1.6*q[1],sz:s*1.6*q[2],rx,ry,rz}); st.tp=t; M[12]-=M[8]*.35; M[13]-=M[9]*.35; M[14]-=M[10]*.35;
    F.solid('shard',vi,x,y,s*(.42+.25*(1-e))-s*.16*k-s*1.1*f*f,{M,mode:3,alb:hexmix('#14101a','#09080c',1-ht),emis:ht>.5?hexmix('#a748fa','#f0dcff',(ht-.5)*2):hexmix('#0b0712','#a748fa',ht*2),rimC:hexmix('#282036',SFI.h,ht),spec:.35,rim:.2,glow:.05+1.3*ht,hot:[0,0,-1,0],bump:2.6,dust:.4+.4*(1-ht),dustC:'#2e253d',edge:.08,detail:1,strata:0,seed:vi+.7,ero:f*.45,shadow:o.shadow===0?null:[.5,.3,.45*(1-f)]});
    st.e+=dt*9*ht; while(st.e>=1){ st.e-=1; GFX.pt({x:x+rand(-.4,.4)*s,y:y+rand(-8,8),z:s*rand(.5,.9),vx:rand(-60,-10),vy:rand(-10,10),vz:rand(180,320),g:0,drag:.4,life:rand(1,1.6),s:s*rand(.18,.3),grow:s*rand(.4,.7),m:5,b:'alpha',c:GFX.rgb('#2a2234'),c2:'#000000',c3:'#8a7a9c',er:.9,ns:rand(1.2,2),w:1,a:.36,L:2}); } },o.delay||0);
  after((o.delay||0)+life-.5,()=>{ K.dust(x,y,{n:3,r:s*.4,sp:[80,260],a:.32,c:'#2c2440'}); K.sparks(x,y,s*.3,{pal:SFI,n:3,sp:[100,360],up:300,life:[.2,.4]}); }); }
// BURST: the floor bursting up where the front passes (the kit's eruptEarth, cut to what this spell can afford): a seam that glows violet,
// broken stone thrown up out of it at a lean, a fountain of clods that falls back and bounces, one mass of lit dust rolling up off it
function burst(x,y,r,life){ if(!F.on) return; K.cool(x,y,{kind:'crack2',r:r*1.3,pal:STA,life:life+.6,hot:.45,grow:.12,light:0});
  K.rocks(x,y,{n:3,r:r*.5,s:[r*.4,r*1.05],kinds:['shard','stone','flag'],rock:'#34302f',pal:EMB,glow:.2,ore:0,rise:.13,over:.22,stagger:.025,lean:1.6,dur:Math.max(.6,life-.45),out:.45,dust:.6,dustC:'#2f263e',mound:0,shadow:0});
  for(let i=0;i<24;i++){ const a=rand(0,TAU), el=rand(1.05,1.45), v=Math.sqrt(2*2600*r*2.4)*rand(.45,1), rr=rand(0,r*.5); GFX.pt({x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*FSY,z:rand(0,30),vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v,g:2600,drag:.2,life:rand(1,1.6),s:rand(4,12),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(i%2?'#312740':'#4b3d63'),c2:'#070509',shadow:true,bounce:.25,fk:5,L:2}); }
  K.vsmoke(x,y-r*.1,{s:r*1.3,dur:2,rise:r*1.3,c:'#17131e',c2:'#4e3f68',a:.7,lit:.35,delay:.07}); K.dust(x,y,{n:6,r:r*.6,sp:[r*1.2,r*3],a:.42,c:'#231c2e'}); GFX.light(x,y,r*3,EMB.l,.6,.5,{z:60}); }
// SOOT PIT: the burn one impact leaves. The fractures in it cool white -> rose -> dark violet -> out over `hot` seconds; the black stays on the
// stone after the light has gone and is eaten away only at the very end.
function starPit(x,y,r,life,o={}){ if(!F.on) return; const m=mm(), rot=rand(0,TAU), hot=o.hot||life*.6, P=o.pal||STA, g=o.gain||1;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.12)), hk=sat(t/hot), H=K.heat(P,hk), f=sat((k-.78)/.22);
    F.quad(m.m.soot,x,y,r*1.05*i,r*1.05*i,rot,{a:.85*sat(t/.06),ero:.1+.8*f});
    if(hk<1) F.quad(m.sco,x,y,r*i,r*i,rot+1,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(1-hk)*3),gain:2.4*g*H.g,ero:.1+.5*hk*hk,rv:[i*1.3,.3,0,.1]}); },o.delay||0); }
// STAR HIT: the one grammar of everything that lands in this spell (the vanguard, the thrown splinters, the chain along the front):
// a white flash of a frame or two and a floor light that falls away after it -> a ring that starts small, runs out and thins -> the pit -> smoke.
//  s = scale (1 = a vanguard piece). o: {vol:0 (no volumes), life (of the pit), rock:0, pit:0 (whatever stands there draws its own burn)}
// SMALL IMPACT: the kit's impact for a vanguard piece without its ball of light (that read as a fireball bursting): the crater, its molten
// pool and rim, the violet fractures running out of it, a cone of dirt thrown up that falls back, clods on arcs that bounce, three stones
// PLUME: a roll of smoke that climbs at a steady pace to the end of its life, swelling (g = end size / start size) and drifting by vx
function plume(x,y,o){ const s=o.s, dur=o.dur, sd=rand(0,90), rise=o.rise, g=o.g||1.5;
  GFX.add(dur,(k)=>{ const e=.55*k+.45*(1-Math.pow(1-k,2)), r=.4+.45*e, ss=s*(1+(g-1)*e);
    VO.add('blast',x+(o.vx||0)*e,y,(o.z||0)+ss*.35+rise*e,{ex:ss,ey:ss,ez:ss*.9,pa:[r,.55+.1*k,2.2,.2+k*.45],pb:[0,1,1,.4+.5*k],dens:(10-5*k)*(o.a??.8)*sat(k*7)*(1-sat((k-.45)/.55)),seed:sd,smoke:1,fire:1,cS:o.c,cK:o.c2,amb:.22,key:1.2,rim:.3,glow:0,steps:20,lit:o.lit}); },o.delay||0); }
function smallImpact(x,y,s,dur){ if(!F.on) return; const m=K.m10(), sd=rand(0,9), C=col(SFI);
  K.cool(x,y,{kind:'crater',r:s*1.15,pal:SFI,life:dur,hot:.5,grow:.1}); K.cool(x,y,{kind:'lava',r:s*.45,pal:STV,life:dur,hot:.8,grow:.08,light:0});
  K.cool(x,y,{kind:'crack2',r:s*2.2,pal:STV,life:dur,hot:.65,grow:.3,light:0});
  GFX.add(1.2,(k,t)=>{ const e=eo3(sat(t/.45)), f=sat((t-.35)/.85), r0=s*(.5+.5*e), r1=s*(.85+1.6*e), hh=s*(.3+1.1*e)*(1-.4*f*f);
    F.lathe(m.cur,x,y,0,{r0,r1,h0:0,h1:hh,cA:'#07060c',cB:'#1c1630',cC:'#3a2f56',a:.85*(1-f*f),ero:.3+f*.55,t0:sd}); F.lathe(m.curL,x,y,0,{r0,r1,h0:0,h1:hh*.7,...C,a:.4*(1-e)*(1-f),ero:.3+f*.6,gain:1.1,t0:sd}); });
  for(let i=0;i<22;i++){ const a=rand(0,TAU), el=rand(.6,1.1), v=rand(700,1500)*Math.sqrt(s/420); GFX.pt({x:x+Math.cos(a)*s*.3,y:y+Math.sin(a)*s*.3*FSY,z:10,vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v*1.25,g:2600,drag:.15,life:rand(1,1.6),s:rand(5,13),rot:rand(0,TAU),vr:rand(-10,10),m:11,b:'alpha',c:GFX.rgb(i%5?'#3a2f4c':SFI.d),c2:'#08060a',shadow:true,bounce:.3,fk:5,L:2,pri:1}); }
  K.chunks(x,y,{n:3,kind:'stone',r:s*.4,sp:[300,900],up:1400,s:[s*.1,s*.22],pal:EMB,rock:'#2a2026',life:1.6}); K.sparks(x,y,40,{pal:SFI,n:18,sp:[700,2000],up:1400,life:[.3,.7],s:4}); }
function starHit(x,y,s,o={}){ if(!F.on) return; const life=o.life||3;
  K.flare(x,y,40*s,{pal:STG,s:260*s,dur:.08,gain:3,sx:1.3,sy:.55}); K.flare(x,y,20*s,{pal:SFI,s:360*s,dur:.18,gain:.9,sx:1.5,sy:.45});
  GFX.light(x,y,1000*s,STG.l,.9,.4,{z:200}); GFX.light(x,y,320*s,STB.l,.25,.6,{z:100});
  if(s>=.95) K.shock(x,y,{r:620*s,r0:40*s,dur:.34,pal:STB,gain:.85});
  if(o.pit!==0) starPit(x,y,300*s,life,{hot:life*.62});
  K.sparks(x,y,30*s,{pal:STG,n:Math.round(16*s),sp:[300,1600*s],up:1300,life:[.25,.65]}); K.dust(x,y,{n:Math.round(7*s),r:70*s,sp:[300,850],a:.45,c:'#2c2440'});
  if(o.rock!==0) K.chunks(x,y,{n:s>=.95?3:2,r:50*s,sp:[280,820],up:1400,s:[30*s,70*s],pal:STV,kind:'slab',rock:'#140c20',life:1.1});
  if(o.vol!==0&&vok()){ K.vblast(x,y,{s:230*s,pal:STB,dur:.5,smoke:.3,gain:.5,heat:.9,fire:.2,rise:220*s,c:'#0c0618',c2:'#5a3c80'}); K.vsmoke(x,y-20,{s:200*s,dur:1.25,a:.7,rise:620*s,vx:-120,c:'#0a0616',c2:'#4a3470',delay:.14}); }
  // thin smoke off the pit for as long as it is hot
  for(let i=0;i<Math.round(7*s);i++) after(.25+i*life*.09,()=>GFX.pt({x:x+rand(-60,60)*s,y:y+rand(-30,30)*s,z:rand(10,50),vx:rand(-150,-30),vy:rand(-20,20),vz:rand(300,560),g:0,drag:.7,life:rand(.8,1.3),s:rand(40,70)*s,grow:rand(80,140)*s,m:5,b:'alpha',c:GFX.rgb('#1a1030'),c2:'#000000',c3:'#3a2460',er:.9,ns:rand(.9,1.6),w:1,a:.42,L:2})); }
function ultStar(id){ ultStart(id); if(F&&F.prepDeep) F.prepDeep(); const Cn=X.cine, x0=pl.x, y0=pl.gy, {hw,hh}=view(), Dm=70000*A.mul(id), m=F.on?mm():null;
  const px=x0, py=y0-Math.max(550,hh*.3), Rs=hw*.3, DX=hw*1.4, H0=hh*1.12, T0=.8, TR=.98, TS=1.9, TC=3.4, END=(F.on&&K.bakeMeta&&K.bakeMeta.mt_crater)?5.8:6.8, FL=TC-TS, PIT=Math.atan2(H0,DX), ux=Math.cos(PIT), uz=Math.sin(PIT), Lt=hw*1.5, st={on:1,sp:0,sm:0,hit:new Set(),sl:new Set(),eh:0};
  // kit update 14: with the baked sequences loaded the star (its burning body: a tumbling crust with molten seams and a plasma face) and the crater (the floor blasted up in
  // slabs, the dust wall, the melt) are Blender renders (_gen/blend/mt_star.py); the fireball mesh, the ejecta cone, the rim slabs and the core pieces
  // are then not drawn (the fire/soot jets and the shed puffs stay)
  const BKS=!!(F.on&&K.bakeMeta&&K.bakeMeta.mt_fall&&K.bakeMeta.mt_crater)&&K.bakePre(['mt_fall','mt_crater']);   // the baked pictures are used only if every page has arrived; if not (a slow phone, a first cast) the drawn version plays, and they keep loading for the next cast
  const dP=e=>Math.hypot(e.x-px,(e.y-py)/FSY), soft=(e,d,o)=>dmg(e,e.d.boss?d:Math.min(d,Math.max(1,(e.hp-1)/2.2)),o);
  // where the star is at flight fraction k: [x, height of its middle, radius]. It leaves the tear small and far, comes on steadily, and in the
  // last fifth of a second covers a third of the way and swells to its full size: a dive, not a drift
  const fe=k=>.3*k+.7*k*k*k, fly=k=>{ const e=fe(k), ss=Rs*mix(.42,1.75,Math.pow(k,1.25)); return [px+DX*(1-e),H0*(1-e)+ss*.5,ss,e]; };
  face(-.6); S([['gy03',.14],['gy05',.5],['gy06',1.2],['gy07',1.46],['gy09',.14,{kick:[1.2,-1]}],['gy10',.8],['gy13',1.2],['gy14',9]]);
  // ---- omen (0 - 0.98): close on her; the cast flash; the charge at her staff only ever grows and brightens, then is shot up the sky the way the star will come
  GFX.ambient(.42,.39,.5,3); GFX.light(x0,y0,560,STV.l,.7,.5,{hold:.6,z:140});
  Cn.move({x:x0,y:y0-BODY*.6,zoom:1.4,tilt:.08},.5); SFX.rumble(1.4); Cn.drone(40,.3);
  after(.3,()=>{ K.flare(x0,y0,BODY*1.1,{pal:AZV,s:300,dur:.24,gain:2.8}); GFX.light(x0,y0,900,AZV.l,1,.25,{z:160}); K.sparks(x0,y0,BODY,{pal:AZV,n:14,sp:[300,1000],up:800,life:[.2,.45]}); Cn.SND.shing(1.25,.5); });
  { const tp=tip(), TL=.78, TF=.32, SW=.24, ch=K.vorb(tp.x,tp.y,tp.z,{r:50,dur:TF+SW+.02,in:SW*.9,out:.05,pal:STB,spin:5,core:.24,heat:.6,gain:.85,delay:TL-SW}), sd=rand(0,9), CL=col(STB), CG=col(STG), q0={x:tp.x,y:tp.y,z:tp.z}, a1=rand(0,TAU), a2=rand(0,TAU);
    // the seed of the star: ki drawn in from off screen onto her staff (streaks, tightening shells, grit lifted off the floor, haze), and in it a
    // dark knot of rock that only ever grows, gold light in its cracks; at TL it all lets go up the sky
    const GA=K.gather?K.gather(tp.x,tp.y,tp.z,{dur:TL,r:170,R:1150,pal:STB,n:0,shells:3,gain:.55,core:0,floor:0}):null, GE={s:0,o:0,d:0,tp:0};
    after(TL,()=>{ if(GA) GA.end(); });
    // not a radial burst: the sky answers down the star's own slant - streaks fall onto the staff, thicker and faster toward the shot
    GFX.add(TL+TF+.16,(k,t)=>{ const q=tip(), u=sat(t/TL), f=sat((t-TL)/TF), d=(.35*f+.65*f*f)*4600, hx=q0.x+ux*d, hz=q0.z+uz*d;
      if(t<TL){ q0.x=q.x; q0.y=q.y; q0.z=q.z; if(GA){ GA.x=q.x; GA.y=q.y; GA.z=q.z; } }
      // what feeds the seed (counts follow time, rates only ever rise): streaks falling down the star's own slant onto the staff, violet flame
      // motes spiralling in on it, grit lifted off the floor round her feet
      if(t<TL-.02){ const dt=Math.max(0,t-GE.tp), e=u*u; GE.tp=t;
        GE.s+=(8+70*e)*dt; while(GE.s>=1){ GE.s-=1; const L=rand(700,1300), sp=rand(2600,3800)*(1+.6*u), o=rand(-1,1)*(50+110*u);
          GFX.pt({x:q.x+ux*L-uz*o,y:q.y+rand(-30,30),z:q.z+uz*L+ux*o,vx:-ux*sp,vz:-uz*sp,g:0,drag:0,life:L/sp,s:rand(3,5)+u*2.5,m:3,len:.06+.06*u,c:GFX.rgb(Math.random()<.3?'#ffffff':STB.m),c2:STB.b,L:3}); }
        GE.o+=(14+70*e)*dt; while(GE.o>=1){ GE.o-=1; const a=rand(0,TAU), rr=rand(150,330)*(1-.3*u), z0=q.z+rand(-80,60);
          GFX.pt({x:q.x,y:q.y,z:z0,oc:[q.x,q.y,q.z],or:rr,oa:a,ow:rand(5,8),ok:rr/rand(.3,.5),oz0:z0,rmin:16,life:.6,s:rand(7,12)*(1+.5*u),m:8,c:GFX.rgb(Math.random()<.4?STB.m:STG.s),c2:STB.b,fade:'in',L:3,pri:1}); }
        GE.d+=(4+22*e)*dt; while(GE.d>=1){ GE.d-=1; const a=rand(0,TAU), d=rand(90,380);
          GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vx:-Math.cos(a)*d*.4,vy:-Math.sin(a)*d*.4*FSY,vz:rand(160,300)*(1+u),g:-40,drag:.6,life:rand(.5,.8),s:rand(4,9),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#4a4258':'#6a6078'),c2:'#0a0810',shadow:true,fk:4,L:2,pri:1}); } }
      ch.x=hx; ch.y=q0.y; ch.z=hz; ch.r=mix(50,130,eo3(sat((t-TL+SW)/SW)))*(1-.35*f);
      if(m&&F.solid&&t<TL){ const s=14+36*u*u, M=F.xfw({s:s*1.6,rx:a1+t*2.6,ry:a2+t*1.9,rz:t*1.2}); M[12]-=M[8]*.35; M[13]-=M[9]*.35; M[14]-=M[10]*.35; F.solid('meteor',2,q0.x,q0.y,q0.z,{M,clip:0,alb:'#2a2036',emis:hexmix('#8a40e0','#daa1f7',u),rimC:'#ffe2b0',spec:.3,rim:.3+.5*u,glow:.5+.9*u,hot:[0,0,1,0],bump:2.4,dust:0,edge:.04}); }
      // the streak it leaves: drawn from the staff to the head as it goes, burning away from the staff end once it has gone
      if(m&&f>0){ const ps=[], g=sat((t-TL-TF)/.16), n=7; for(let i=0;i<n;i++){ const v=mix(g,1,i/(n-1)), dd=d*v; ps.push({x:q0.x+ux*dd,y:q0.y,z:q0.z+uz*dd,w:(30+110*v)*(1-g*.6)}); } F.ribbon(m.m.trB,ps,{...CL,a:1-g,gain:3.4,t0:sd,fd:[.5,.02,0,0]}); F.ribbon(m.m.trC,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*.3})),{...CG,a:1-g,gain:4.6,t0:sd+2}); } });
    after(TL-.24,()=>{ Cn.SND.tick(1.8,.2); Cn.move({zoom:1.5},.22,'in'); });
    // the shot: a muzzle flash at the staff, a ring thrown off the floor under her, the camera kicked back
    after(TL,()=>{ const q=tip(); K.flare(q.x,q.y,q.z,{pal:STG,s:230,dur:.12,gain:3}); K.flare(q.x,q.y,q.z,{pal:STB,s:330,dur:.26,gain:1.1,sx:1.5,sy:.6}); K.flare(q.x,q.y,q.z,{pal:STV,s:240,dur:.35,gain:.5}); K.sparks(q.x,q.y,q.z,{pal:STG,n:12,sp:[400,1500],up:1100,dir:-.5,spread:.5,life:[.2,.5]});
      K.shock(x0,y0,{r:560,r0:60,dur:.32,pal:STB,gain:.9}); K.dust(x0,y0,{n:8,r:60,sp:[300,800],a:.4,c:'#2c2440'}); GFX.light(x0,y0,900,STB.l,.85,.8,{z:200}); Cn.SND.shing(.8,.5); sfx('boom',1.5,.4); Cn.shake(.6); hitstop=Math.max(hitstop,.04); }); }
  // ---- build (0.8 - 3.2): the camera is thrown back off her by the shot and opens on the whole field. Where the shot went in the sky tears; its light
  // falls over the field; the shadow of what is coming is already on the floor at P and the stone under it starts to break. One, two, three:
  // pieces arrive ahead of the star. Then the star itself comes out of the tear and down.
  after(T0,()=>{ GFX.ambient(.31,.3,.37,1.1); Cn.move({x:px+hw*.14,y:py-hh*.32,zoom:.64,tilt:.24,roll:.03},.95,'io'); after(.95,()=>Cn.move({x:px+hw*.18,y:py-hh*.33,zoom:.6},1.4,'lin')); Cn.SND.inhale(2.3,.5); SFX.fire(1.5,.5); });
  // the tear: a seam of white-gold in the upper right sky, across the line of the fall. It opens in a fifth of a second, holds with dark behind it,
  // gapes as the star comes through, and burns shut from its ends
  { const rx=px+DX*.96, rz=H0*.96+Rs*.2, nx=-uz, nz=ux, RL=hw*.5, sd=rand(0,90), N=13, D=TS+.6-TR, CG=col(STG), CV=col(STB), ROT=-Math.atan2(nz,nx);
    after(TR,()=>{ GFX.light(px+hw*.8,py-hh*.45,hw*.8,STB.l,.6,.7,{z:500}); K.flare(rx,py,rz,{pal:STG,s:560,dur:.22,gain:3.2}); Cn.shake(.45); sfx('boom',.7,.55); Cn.SND.shing(.6,.4);
      for(let i=0;i<20;i++){ const s=rand(-1,1)*RL, sp=rand(1500,3600); GFX.pt({x:rx+nx*s,y:py,z:rz+nz*s,vx:-ux*sp+rand(-300,300),vz:-uz*sp,g:0,drag:.6,life:rand(.35,.7),s:rand(3,6),m:3,len:.06,c:GFX.rgb(i%3?STG.s:'#ffffff'),c2:STB.b,L:3}); } });
    // while the camera pulls off her the sky darkens and its starlight is drawn to where it will tear: motes over the whole field, high up,
    // streaming toward the seam faster and thicker until it opens (one particle batch, no gap after the shot)
    for(let i=0;i<70;i++){ const u=i/69; after(T0-.08+u*(TR+.25-T0),()=>{ const sx0=px+hw*rand(-1.4,1.2), sy0=py+hh*rand(-1.1,.6), sz0=rand(500,1300), dx=rx-sx0, dz=rz-sz0, lf=rand(.45,.7)*(1-.35*u);
        GFX.pt({x:sx0,y:sy0,z:sz0,vx:dx/lf,vy:(py-sy0)/lf,vz:dz/lf,g:0,drag:0,life:lf,s:rand(6,10)*(1+u),m:3,len:.08+.08*u,c:GFX.rgb(i%3?'#e8e0ff':STG.s),c2:STB.b,fade:'in',L:3}); }); }
    // torn, not ruled: the seam zigzags, its width pinches and bulges point by point (fixed per point, breathing slowly), the bright lip is a
    // thinner ragged line inside the violet one; behind it the dark of the sky with stars in it, and smoke leaking out of both lips
    const NJ=27, JG=[]; for(let i=0;i<NJ;i++){ const a=Math.abs(hsh(i,1,sd)), b=hsh(i,2,sd); JG.push({w:a<.18?.12:.4+.6*a,o:b,c:.5+.5*Math.abs(hsh(i,3,sd))}); }
    let ns=0, stars=null;
    if(m) GFX.add(D,(k,t)=>{ const op=eo3(sat(t/.2)), cl=sat((t-(D-.45))/.45), gp=1+1.2*Math.sin(Math.PI*sat((t-(TS-TR)+.1)/.5)), L=RL*op*(1-.75*cl), br=.85+.15*Math.sin(t*11), ps=[], pi=[];
      F.bill(m.hole,rx,py,rz,L*1.0,RL*.075*gp*(1-cl),ROT,{a:.9*(1-cl)});
      F.bill(m.m.glowO,rx,py,rz,L*1.05,RL*.3*gp,ROT,{...CV,a:.22*(1-cl),gain:1.1});
      for(let i=0;i<NJ;i++){ const u=i/(NJ-1), s=(u*2-1)*L, env=Math.pow(Math.sin(Math.PI*u),.5), q=JG[i], j=(q.o+.25*Math.sin(t*3+i*1.9))*RL*.075*env, w=env*(30+70*op*gp)*(1-cl)*q.w*(.9+.1*Math.sin(t*7+i));
        ps.push({x:rx+nx*s+ux*j,y:py,z:rz+nz*s+uz*j,w}); pi.push({x:rx+nx*s+ux*j*.7,y:py,z:rz+nz*s+uz*j*.7,w:w*.3*q.c}); }
      F.ribbon(m.m.trB,ps,{...CV,a:1-cl,gain:2.6*br,t0:sd+t*.8,fd:[.12,.12,0,0]}); F.ribbon(m.m.trC,pi,{...CG,a:1-cl,gain:4.4*br,t0:sd+3,fd:[.1,.1,0,0]});
      // stars deep in the opening: fixed points that twinkle (one particle batch)
      if(!stars&&op>.6){ stars=1; for(let i=0;i<34;i++){ const s=rand(-.85,.85)*RL, d=rand(-1,1)*RL*.06*(1-Math.abs(s)/RL); GFX.pt({x:rx+nx*s+ux*d,y:py,z:rz+nz*s+uz*d,vx:0,vz:0,g:0,drag:0,life:D-t-.35,s:rand(7,12),m:8,c:GFX.rgb(i%4?'#e8e0ff':'#ffe2b0'),fade:'in',L:3}); } }
      // smoke curling off both lips, out across the line of the fall
      while(ns<t*14*(1-cl)){ ns++; const s=rand(-.8,.8)*L, sg=ns%2?1:-1, v=rand(160,360); GFX.pt({x:rx+nx*s,y:py+rand(-20,20),z:rz+nz*s,vx:ux*v*sg+rand(-40,40),vy:rand(-20,20),vz:uz*v*sg+40,g:0,drag:.5,life:rand(.8,1.3),s:rand(110,170),grow:rand(150,240),m:5,b:'alpha',c:GFX.rgb('#2a1c40'),c2:'#000000',c3:'#9a7cc8',er:.9,ns:rand(.9,1.6),w:1,a:.6,L:3}); } },TR); }
  // the light of what is coming falls across the field from the upper right
  const sky=GFX.light(px+hw*.7,py-hh*.5,hw*.9,STV.l,.05,.3,{hold:TC-TR,z:400}); GFX.add(TC-TR-.05,(k,t)=>{ sky.a=sat(t/.5)*(.12+.3*k*k); },TR);
  const heat=GFX.light(px,py,600,STG.l,.05,.3,{hold:TC-TR+.1,z:200});
  // the floor at P: the shadow of the fall lies on it from the moment the sky opens and only ever spreads and darkens; fractures that only ever
  // spread and grow hotter under it
  // the shadow closes on P (wide and faint -> tight and black); the fractures climb in steps, one for each piece of the vanguard that lands
  // (a kick of light that settles a little higher than before), then race up in the last half second
  if(m){ const rot=rand(0,TAU), D0=TC-TR, VT=[1.46,1.92,2.34]; GFX.add(D0,(k,t)=>{ const sr=Rs*mix(2.6,.95,k*k), i=sat(t/.25); F.quad(m.m.dark,px,py,sr,sr*.92,0,{a:i*(.22+.7*k*k)});
      const T=t+TR; let lv=0, kick=0; for(const v of VT) if(T>v){ lv++; kick+=Math.exp(-(T-v)*7); } const fin=sat((T-(TC-.55))/.55), c=Math.min(1,.12+.2*lv+.35*fin*fin+.25*kick);
      heat.a=.15+.8*c; heat.r=700+1300*c;
      // the web spreads (its pattern grows outward with the hour, never a fixed stamp) and turns a little as new fractures open; light and
      // flakes of stone lift out of it, more and higher as it heats
      const H=K.heat(STA,1-.85*c), r=Rs*(.75+.55*k+.45*c), dt=Math.max(0,t-(st.gt||0)); st.gt=t; st.gl=(st.gl||0)+(6+40*c*c)*dt;
      while(st.gl>=1){ st.gl-=1; const a=rand(0,TAU), d=r*Math.sqrt(rand(.02,.8)), hot=Math.random()<.6; GFX.pt(hot?{x:px+Math.cos(a)*d,y:py+Math.sin(a)*d*FSY,z:4,vx:0,vy:0,vz:rand(380,900)*(.6+c),g:-200,drag:.4,life:rand(.3,.6),s:rand(3,6),m:3,len:.08,c:GFX.rgb(Math.random()<.4?'#ffffff':STG.s),c2:STB.b,L:2}:{x:px+Math.cos(a)*d,y:py+Math.sin(a)*d*FSY,z:2,vx:Math.cos(a)*30,vy:Math.sin(a)*15,vz:rand(260,520)*(.5+c),g:900,drag:.2,life:rand(.5,.8),s:rand(6,13),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#4a4258':'#6a6078'),c2:'#0a0810',shadow:true,fk:4,L:2,pri:1}); }
      // the web is the floor giving way, not a stamp: nothing before the first piece lands; each landing tears it a step wider with a flare that
      // dies back to a dull seam within a third of a second; only in the last half second does it run white-hot
      if(lv) F.quad(m.sco,px,py,r,r,rot+.25*k,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,.35+.9*kick+fin),gain:2.2*(.08+.75*kick*kick+.85*fin*fin),ero:.62-.2*lv*.33-.3*fin,rv:[.1+Math.pow(sat(.12*lv+.2*kick+.55*fin),.8)*1.2,.3,0,.1]}); },TR); }
  // the field slows in the order the shadow reaches it
  for(let i=0;i<12;i++) after(1+i*.18,()=>{ const R=hw*(.25+.14*i); for(const e of onScreen(300)){ if(dP(e)>R) continue; e.slowT=Math.max(e.slowT||0,TC-1-i*.18+.2); if(!st.sl.has(e)){ st.sl.add(e); if(st.sl.size%3===0) hitFx(e,STV.b,.6); } } });
  // dust and grit drawn toward P, pebbles lifting
  for(let i=0;i<14;i++) after(rand(1,2.9),()=>{ const a=rand(0,TAU), d=rand(160,620); GFX.pt({x:px+Math.cos(a)*d,y:py+Math.sin(a)*d*FSY,z:2,vz:rand(140,340),g:-60,life:rand(.7,1.1),s:rand(5,11),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#5a5470'),c2:'#0c0a14',shadow:true,fk:4,L:2}); });
  // the sky is already coming down: fine streaks on the star's slant over the whole field, thicker as it nears, each a spit of dust where it lands
  // it starts while the camera is still pulling off her (no empty beat after the shot), and every seventh is a real stone with a burning head
  for(let i=0;i<84;i++){ const u=i/83, big=i%14===3; after(T0-.02+(TC-T0-.25)*Math.pow(u,.8),()=>{ const tx=px+hw*rand(-1.3,1.4), ty=py+hh*rand(-1.25,.9), L=rand(1100,1700)*(big?1.4:1), sp=rand(3800,5200)*(big?.75:1), tt=L/sp;
      GFX.pt({x:tx+ux*L,y:ty,z:uz*L,vx:-ux*sp,vz:-uz*sp,g:0,drag:0,life:tt,s:(rand(3,5)+u*2)*(big?2.6:1),m:3,len:big?.16:.05,c:GFX.rgb(big?STG.s:i%3?STB.m:'#ffffff'),c2:big?'#a748fa':STB.b,L:3});
      if(big){ GFX.pt({x:tx+ux*L,y:ty,z:uz*L,vx:-ux*sp,vz:-uz*sp,g:0,drag:0,life:tt,s:rand(22,30),m:8,c:GFX.rgb('#f6ecff'),L:3}); for(let j=0;j<4;j++) GFX.pt({x:tx+ux*L*(1-j*.12),y:ty,z:uz*L*(1-j*.12),vx:-ux*sp*.9,vz:-uz*sp*.9,g:0,drag:1.5,life:tt*.9,s:rand(30,50),grow:rand(80,140),m:5,b:'alpha',c:GFX.rgb('#1c1626'),c2:'#000000',c3:'#6a5c7c',er:.9,ns:rand(.9,1.6),w:1,a:.5,L:3}); }
      after(tt,()=>{ K.sparks(tx,ty,6,{pal:i%2?STB:STG,n:big?10:3,sp:[150,big?1100:520],up:big?900:420,life:[.15,.35]}); if(big){ K.flare(tx,ty,30,{pal:STG,s:260,dur:.14,gain:2.4}); K.dust(tx,ty,{n:4,r:40,sp:[200,600],a:.42,c:'#2c2440'}); GFX.light(tx,ty,420,STG.l,.7,.35,{z:90}); } else if(i%3===0) K.dust(tx,ty,{n:2,r:20,sp:[120,300],a:.3,c:'#2c2440'}); }); }); }
  // the vanguard: three pieces onto the thickest of the crowd in the left, the right and the near third. Each lands the same way: flash, ring, pit, smoke
  { const E0=onScreen(200), thick=f=>{ let b=null, bn=0; for(const e of E0){ if(!f(e)||Math.hypot(e.x-x0,e.y-y0)<620||dP(e)<Rs*2.3) continue; let n=0; for(const o of E0) if(Math.hypot(o.x-e.x,(o.y-e.y)/FSY)<420) n++; if(n>bn){ bn=n; b=e; } } return b; };
    const inV=e=>Math.abs(e.x-px-hw*.08)<hw&&e.y>py-hh*1.1&&e.y<py+hh*.62, T=[[1.46,thick(e=>inV(e)&&e.x<px-hw*.3),px-hw*.6,py+hh*.05],[1.92,thick(e=>inV(e)&&e.x>px+hw*.3),px+hw*.62,py-hh*.3],[2.34,thick(e=>inV(e)&&e.y>py+hh*.1&&Math.abs(e.x-px)<hw*.7),px+hw*.42,py+hh*.45]];
    T.forEach(([at,e,fx,fy],i)=>{ const tx=e?e.x:fx, ty=e?e.y:fy, dur=.68, s=175+i*35, k=1.1+i*.14;
      after(at-dur,()=>{ vanguard(tx,ty,{ux,uz,s:s*.75,dur,len:5600+i*300}); Cn.SND.tick(1.2-i*.2,.15); });
      after(at,()=>{
        starHit(tx,ty,k,{life:END-at-.6,vol:0,rock:0,pit:0}); Cn.shake(.45+i*.1); hitstop=Math.max(hitstop,.04); sfx('boom',1.25-i*.17,.45+i*.12);
        smallImpact(tx,ty,210*k,TC-at+.15); frag(tx,ty,s*.42,END-at-.3,{cool:1.8});
        let nb=0; inCircle(tx,ty,460,o=>{ soft(o,Dm*.067,{kb:0,sx:tx,sy:ty}); K.knock(o,{from:[tx,ty],dist:260,up:1300,fx:nb<5?1:0}); if(nb++<2) K.ehit(o,{pal:STG,pw:1.1,dir:Math.atan2(o.y-ty,o.x-tx)}); }); }); }); }
  // the star
  { const sd=rand(0,90), sd2=rand(0,90), a1=rand(0,TAU), a2=rand(0,TAU), vi=(Math.random()*4)|0, DV=[-ux,0,-uz];
    after(TS,()=>{ SFX.rumble(1.2); Cn.drone(34,.5); });
    if(BKS) K.bake('mt_fall',px,py,{delay:TS,amb:.2,ord:.02});
    GFX.add(FL+.02,(k0,t)=>{ if(t>=FL) return; const k=sat(t/FL), [sx,cz,ss,fk]=fly(k), hk=fk, g=eo3(sat(t/.3));
      // its shadow runs over the floor under it and closes on P: the gap between the two is its height
      if(m){ const sr=ss*(.55+.75*fk); F.quad(m.m.dark,sx,py,sr,sr*.9,0,{a:sat(t/.25)*(.3+.6*fk)}); }
      // a thick tail of soot of fixed length back along the line it travels: dark rolls lit pale on top, the fire only near the head
      if(vok()&&!BKS){ const L=Lt/2, rad=ss*1.25; VO.add('jet',sx+ux*(ss*.3+L),py,cz+uz*(ss*.3+L),{ex:L,ey:rad,ez:rad,yaw:0,pitch:PIT,pa:[.78,.42,2.4,11+8*fk],pb:[.95+.2*hk,.7,.2+g*1.3,-.3],dens:11,gain:.8,seed:sd,smoke:.9,fire:.18,rim:0,band:.7,flow:.6,lit:.95,cA:'#0d0b12',cB:'#2e253d',cM:'#645184',cC:'#e8dcd0',cS:'#08060a',cK:'#483a5f'}); }
      // the friction fire: a skin of flame pressed back off its leading face, white-yellow at the face, orange-red behind (the rock is drawn over it)
      if(vok()&&!BKS){ const Lf=ss*(1.5+1.3*fk), rf=ss*.9; VO.add('jet',sx+ux*(ss*.15+Lf),py,cz+uz*(ss*.15+Lf),{ex:Lf,ey:rf,ez:rf,yaw:0,pitch:PIT,pa:[.7,.42,2.6,14+8*fk],pb:[1.1+.2*hk,.6,.5+g,-.5],dens:8*sat(t*8),gain:.6,seed:sd2,smoke:.25,fire:.9,rim:0,band:.6,flow:.8,lit:.5,cA:'#1a112a',cB:'#9536e8',cM:'#c56af3',cC:'#fff2d0',cS:'#0c0408',cK:'#4a2c38'}); }
      // the rock: one broken, pitted body tumbling about its middle, molten seams brighter as it nears, its leading face a skin of white plasma
      // the fire torn off its back: one tongue welded to the rock, as wide as the rock where it leaves it, stretched longer the faster it goes,
      // white-yellow at the rock and cooling to dull red down its length, its edges licking (two ribbons: the flame and its white heart)
      // (no ribbon: the flame is a stream of burning puffs shed off its back every frame, left hanging in the air where the rock was, each
      // shrinking and cooling from white-gold to red as it falls behind, so the tail is never the same shape twice and never leaves the rock)
      if(!BKS){ const dt=Math.max(0,t-(st.ft||0)); st.ft=t; st.fi=(st.fi||0)+dt*(70+90*fk);
        while(st.fi>=1){ st.fi-=1; const r=rand(.3,.8), c=Math.random(), hot=c<.35, sz=Math.min(150,ss*(hot?rand(.16,.28):rand(.24,.42))), sp=rand(60,260);
          GFX.pt({x:sx+ux*ss*r+rand(-.45,.45)*ss*uz,y:py+rand(-.3,.3)*ss*FSY,z:cz+uz*ss*r+rand(-.45,.45)*ss*ux,vx:ux*sp+rand(-60,60),vy:rand(-40,40),vz:uz*sp+rand(0,90),g:-60,drag:1.4,life:hot?rand(.14,.24):rand(.25,.42),s:sz,grow:-sz*(hot?2.6:1.6),m:8,c:GFX.rgb(hot?(c<.12?'#fff6e0':'#daa1f7'):c<.7?'#ae56fb':'#9130e6'),fade:'in',L:3}); } }
      if(!BKS) metBody(sx,py,cz,ss*.74,vi,a1+t*4.4,a2+t*2.9,t*1.8,DV,hk,{emis:hexmix('#a443fa','#daa1f7',hk),lumps:3});
      // what it sheds: sparks and burning chips streaming back, and smoke torn off the tail that stays hanging in the air where it was left
      if(st.on){ while(st.sp<t*34){ st.sp++; const r=rand(.3,1.4), sp=rand(300,1300), chip=st.sp%4===0; GFX.pt(chip?{x:sx+ux*ss*r+rand(-.6,.6)*ss,y:py+rand(-.4,.4)*ss*FSY,z:cz+uz*ss*r+rand(-.6,.6)*ss,vx:ux*sp*.4+rand(-200,200),vy:rand(-120,120),vz:uz*sp*.3,g:1400,drag:.5,life:rand(.5,1),s:rand(6,12),rot:rand(0,TAU),vr:rand(-10,10),m:8,c:GFX.rgb(SFI.m),fade:'in',L:3}:{x:sx+ux*ss*r+rand(-.7,.7)*ss,y:py,z:cz+uz*ss*r+rand(-.7,.7)*ss,vx:ux*sp,vz:uz*sp,g:300,drag:1.2,life:rand(.35,.8),s:rand(3,6.5),m:3,len:.06,c:GFX.rgb(st.sp%3?SFI.s:'#ffffff'),c2:SFI.b,L:3}); }
        while(!BKS&&st.sm<t*26){ st.sm++; const r=rand(.8,2.8), hang=st.sm%2; GFX.pt({x:sx+ux*ss*r+rand(-.6,.6)*ss,y:py+rand(-.3,.3)*ss*FSY,z:cz+uz*ss*r+rand(-.6,.6)*ss,vx:ux*(hang?rand(20,90):300),vz:uz*(hang?rand(20,90):300)+(hang?30:120),g:0,drag:.8,life:hang?rand(1.3,2):rand(.8,1.3),s:rand(60,110),grow:rand(120,200)*(hang?.6:1),m:5,b:'alpha',c:GFX.rgb('#16121d'),c2:'#000000',c3:'#594876',er:.9,ns:rand(.9,1.6),w:1,a:hang?.38:.45,L:3}); } } },TS); }
  // ---- the held breath (3.2 - 3.4): the star does not slow - it is in its dive; what it sheds stops, the floor goes dark under it
  // (the camera does not chase it here: it holds its ground so the last rush of the dive reads as speed)
  after(TC-.2,()=>{ st.on=0; Cn.hush(.2); Cn.move({y:py-hh*.26,zoom:.66},.2); });
  // ---- contact (3.4)
  after(TC,()=>{ heat.hold=0; sky.hold=0; const Rm=hw*2.3, FD=1.0, arr=d=>FD*(1-Math.cbrt(1-Math.min(.96,d/(Rm*.78)))), LF=END-TC;
    Cn.peak(px,py,{ca:0,blur:0,tint:'#ffd9a8',a:.26,hold:.03,out:.08}); hitstop=Math.max(hitstop,.12); Cn.shake(1.8); Cn.SND.hit(1); SFX.shatter(1); SFX.boom(.6,1);
    GFX.ambient(.46,.42,.48,40); after(.14,()=>GFX.ambient(.42,.39,.45,1.2)); after(.06,()=>Cn.shake(1.1)); after(.16,()=>Cn.shake(.7)); GFX.light(px,py,hw*1.3,'#ffcf96',.5,.3,{z:280,hold:.03}); GFX.light(px,py,hw*.55,STG.l,.6,1.6,{z:120,hold:.6}); { const gl=GFX.light(px,py,hw*.7,'#d38ef6',.01,.4,{z:110,hold:LF-.5}); GFX.add(LF-.4,(k,t)=>{ gl.a=1.0*sat(t/.8)*Math.pow(1-k,1.3)*(.78+.22*Math.sin(t*5.3)); gl.c=GFX.rgb(hexmix('#d38ef6','#7a3ad0',sat(k*1.2))); },.5); after(1.3,()=>GFX.ambient(.4,.38,.44,1.2)); }
    Cn.move({x:px,y:py-hh*.2,zoom:.5,roll:-.03},.2,'out'); after(.4,()=>Cn.move({roll:0},.6));
    // the floor: the pit, and fractures that run from it to the edges of the screen. Their light takes close on three seconds to go from white
    // through rose and dark violet to nothing; the black they leave stays on the stone and breaks up only after that
    // the impact itself (kit): the flash, a cone of ejecta thrown up and out that falls back, stones, the mushroom of dust and smoke (its foot lit by
    // the fire, its cap dark) and a molten crater whose rim cools. The fire is fire; the violet is only in its cracks and afterglow
    if(BKS) K.bake('mt_crater',px,py,{amb:.3,ord:.01});
    if(!BKS) K.impact(px,py,{s:Rs*1.1,h:Rs*3.4,fire:SFI,pal:STA,dur:LF-.1,ring:0,cloud:0,curtain:0,stones:BKS?0:6,rock:'#2a2026'});
    // the ejecta curtain (the kit's, drawn here so its dirt takes the violet of the spell instead of brown)
    if(m&&!BKS){ const s=Rs*1.1, cs=rand(0,9), km=K.m10(); GFX.add(1.4,(k,t)=>{ const e=eo3(sat(t/.5)), f=sat((t-.4)/1), r0=s*(.5+.5*e), r1=s*(.85+1.75*e), hh=s*(.3+1.15*e)*(1-.4*f*f);
        F.lathe(km.cur,px,py,0,{r0,r1,h0:0,h1:hh,cA:'#07060c',cB:'#1c1630',cC:'#3a2f56',a:.8*(1-f*f),ero:.3+f*.55,t0:cs}); F.lathe(km.curL,px,py,0,{r0,r1,h0:0,h1:hh*.7,...col(SFI),a:.45*(1-e)*(1-f),ero:.3+f*.6,gain:1.1,t0:cs}); }); }
    if(!BKS) K.cool(px,py,{kind:'crack2',r:2000,pal:STG,life:LF+.5,hot:.55,grow:.3,gain:.8});
    { const a0=rand(0,TAU), N=3; for(let i=0;i<N;i++){ const a=a0+(i+rand(-.25,.25))/N*TAU, r0=Rs*rand(.9,1.2), r1=hw*rand(1.0,1.5), ca=Math.cos(a), sa=Math.sin(a)*FSY; K.coolLine(px+ca*r0,py+sa*r0,px+ca*r1,py+sa*r1,{w:rand(26,38),pal:i%2?STG:STA,life:LF+.6-rand(0,.4),hot:.5,grow:.3,gain:1.3,shed:i%2?undefined:0}); } }
    // the dark first (thrown dust round the fire), then the front, then the white heart
    for(let i=0;i<36;i++) after(.03+rand(0,.09),()=>{ const a=rand(0,TAU), r=Rs*rand(.7,1.6), sp=rand(300,1100); GFX.pt({x:px+Math.cos(a)*r,y:py+Math.sin(a)*r*FSY,z:rand(10,160),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(600,2000),g:900,drag:1.1,life:rand(.8,1.5),s:rand(70,200),grow:rand(180,320),m:5,b:'alpha',c:GFX.rgb('#0c0816'),c2:'#000000',c3:'#3a2460',er:.9,ns:rand(.9,1.6),w:1,a:rand(.5,.8),L:2}); });
    // the shock runs on flat over the floor as a skirt of dust (no flat rings of light: the rolling dust ring below carries the front)
    if(m&&!BKS){ const dr=rand(0,TAU); GFX.add(.6,k=>{ const e=eo3(k), rr=hw*1.5*(.3+.7*e); F.quad(m.dustR,px,py,rr,rr,dr+k*.3,{cA:'#050409',cB:'#1e1830',cM:'#3a2f56',cC:'#64548c',a:Math.min(1,(1-k)*1.6)*.7,ero:.08+.4*k}); },.06); }
    // the instant of contact: a starburst of hard white spikes round the heart, two frames, one ribbon
    if(m&&!BKS){ const a0=rand(0,TAU), NS=9, SL=[]; for(let i=0;i<NS;i++) SL.push({a:a0+(i+rand(-.3,.3))/NS*TAU,l:Rs*rand(1.7,2.7),w:rand(60,110)});
      GFX.add(.09,(k)=>{ const ps=[]; for(const q of SL){ const c=Math.cos(q.a), s=Math.sin(q.a), L=q.l*(.6+.4*k); if(ps.length){ const l=ps[ps.length-1]; ps.push({x:l.x,y:l.y,z:l.z,w:0},{x:px,y:py,z:Rs*.2,w:0}); } ps.push({x:px,y:py,z:Rs*.2,w:q.w*(1-k*.5)},{x:px+c*L*.5,y:py+s*L*.5*FSY,z:Rs*.2+s*L*.15,w:q.w*.45},{x:px+c*L,y:py+s*L*FSY,z:Rs*.2+s*L*.3,w:2}); }
        F.ribbon(m.m.trB,ps,{...CWH(STG),a:1-k*k,gain:4.5,t0:0,fd:[.05,.3,0,0]}); }); }
    // the shock read plainly: one thin white front thrown out over the floor in the first frames, gone before the dust catches it up
    if(!BKS) after(.04,()=>K.shock(px,py,{r:hw*1.7,r0:Rs*.5,dur:.42,pal:{d:'#251a36',b:'#daa1f7',m:'#fff0d8',h:'#ffffff',l:'#ffe0b0',s:'#ffffff'},gain:1}));
    // the dust surge: real rolls of grit hugging the floor and running out from the pit, thicker on the side the star was going (to the left),
    // slowing, swelling, curling up off the floor and thinning as they go (particles: they move every frame and fade, never a stamped ring)
    for(let i=0;i<72;i++){ const a=rand(0,TAU), lean=.55+.45*Math.max(0,-Math.cos(a)), sp=rand(1300,2900)*lean, r0=Rs*rand(.5,.9), fl=i%3===0;
      GFX.pt({x:px+Math.cos(a)*r0,y:py+Math.sin(a)*r0*FSY,z:rand(10,70),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:fl?rand(300,700):rand(40,180),g:fl?-60:0,drag:1.5,life:rand(1.3,2.1),s:rand(90,170)*lean,grow:rand(260,420),m:5,b:'alpha',c:GFX.rgb(i%2?'#201a2a':'#2c243b'),c2:'#000000',c3:'#6a568c',er:.9,ns:rand(.9,1.6),w:1,a:rand(.5,.7),L:2}); }
    // the smoke column: a dark stem lit orange at its foot by the fire, climbing, its head rolling over and carried off to the left, thinning
    // (own plumes, not the kit's smoke: that one eases out and sits still for its second half; these keep climbing and swelling to the end)
    if(vok()){ plume(px,py,{s:Rs*.7,g:1.5,dur:2.4,rise:Rs*2.6,c:'#100d15',c2:'#644b90',a:1,lit:.7,delay:.1});
      plume(px-Rs*.1,py-4,{s:Rs*1.0,g:1.7,z:Rs*1.1,dur:2.8,rise:Rs*2.6,vx:-Rs*1.1,c:'#0d0b11',c2:'#715c96',a:1,lit:.5,delay:.35});
      plume(px-Rs*.3,py-8,{s:Rs*1.2,g:1.8,z:Rs*2.2,dur:2.5,rise:Rs*2.2,vx:-Rs*1.6,c:'#0c090f',c2:'#5c4a79',a:.85,lit:.4,delay:.9}); }
    if(!BKS) rays(px,py,Rs,hw*1.5,{n:9,dur:.5});
    K.flare(px,py,Rs*.3,{pal:{...STG,b:'#ffffff',m:'#ffffff'},s:Rs*.45,dur:.1,gain:3});
    for(let i=0;i<30;i++){ const a=rand(0,TAU), sp=rand(900,3600), big=i%4===0; GFX.pt({x:px+Math.cos(a)*Rs*.4,y:py+Math.sin(a)*Rs*.4*FSY,z:rand(40,200),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(900,2200)*(big?1.2:1),g:2600,drag:.3,life:rand(.7,1.2),s:big?rand(28,46):rand(8,20),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(i%3?'#2e253d':'#423658'),c2:'#000000',shadow:true,fk:4,L:3}); }
    K.sparks(px,py,60,{pal:STG,n:56,sp:[900,3400],up:2000,life:[.3,.9]}); K.dust(px,py,{n:18,r:160,sp:[700,2000],a:.5,c:'#2c2440'});
    if(!BKS) GFX.ripple(px,py,hw*2,{life:.55,s:1});
    // the rim of the pit lifted: bedded slabs of the floor broken along their layers and tipped up outward, sharp pieces between them
    if(!BKS){ const a0=rand(0,TAU), N=4, HS=[380,280,330,250]; for(let i=0;i<N;i++){ const a=a0+(i+rand(-.25,.25))/N*TAU, r=Rs*rand(1.1,1.3), x=px+Math.cos(a)*r, y=py+Math.sin(a)*r*FSY; if(Math.hypot(x-x0,y-y0)<430) continue;
        K.rocks(x,y,{n:i%2?2:3,r:HS[i]*.45,s:[HS[i]*.22,HS[i]],kinds:i%2?['shard','flag','shard']:['flag','shard','flag'],rock:'#271f33',pal:EMB,glow:.12,strata:5,edge:.09,ore:0,lean:2.4,lx:px,ly:py,rise:.16,over:.2,dur:4.75-TC+i*.03,out:.5,dust:.6,dustC:'#2f263e',mound:0,shadow:i%2?0:1,delay:.03+i*.02}); } }
    // the front tears the floor up as it goes: two rings of upheaval out to the edges of the screen, each cluster going off as the front reaches it;
    // between them the lone fountains of grit and light (starHit) keep the ring readable
    { const a0=rand(0,TAU), RG=[[.68,3,360],[1.2,4,300]]; let c=0;
      RG.forEach(([R,n,h],j)=>{ for(let i=0;i<n;i++){ const a=a0+j*.7+(i+rand(-.25,.25))/n*TAU, rr=R*rand(.9,1.1), x=px+Math.cos(a)*hw*rr, y=py-hh*.12+Math.sin(a)*hh*rr*1.05; if(Math.hypot(x-x0,y-y0)<440) continue;
          const at=arr(dP({x,y}))+rand(0,.05), nn=c++, lf=Math.max(1.3,5.25+rand(0,.2)-TC-at);
          // every third bursts up (the kit's floor eruption: a glowing seam, broken stone thrown up, a fountain of clods, lit dust); the rest are
          // bedded slabs tipped up out of the floor
          after(at,()=>{ const hh2=h*rand(.8,1.3); if(nn%3===0) burst(x,y,hh2*.6,lf);
            else K.rocks(x,y,{n:2,r:hh2*.35,s:[hh2*.25,hh2*.85],kinds:nn%2?['flag','shard']:['shard','flag'],rock:'#271f33',pal:EMB,glow:.1,strata:5,edge:.09,ore:0,lean:2.2,lx:px,ly:py,rise:.15,over:.22,dur:Math.max(.6,lf-.5),out:.5,dust:.6,dustC:'#2f263e',shadow:0});
            starHit(x,y,.62,{vol:0,rock:0,pit:0,life:lf+1}); if(nn%2===0){ Cn.shake(.25); sfx('boom',1.6-j*.15,.25); } }); }
        for(let i=0;i<n+1;i++){ const a=a0+j*.7+(i+.5+rand(-.2,.2))/n*TAU, rr=R*rand(.9,1.1), x=px+Math.cos(a)*hw*rr, y=py-hh*.12+Math.sin(a)*hh*rr*1.05; if(Math.hypot(x-x0,y-y0)<440) continue;
          after(arr(dP({x,y}))+rand(0,.05),()=>{ K.sparks(x,y,20,{pal:STG,n:8,sp:[300,1100],up:1100,life:[.25,.6]}); K.dust(x,y,{n:4,r:50,sp:[300,800],a:.42,c:'#2c2440'}); }); } }); }
    // everyone on the screen: those under it are gone at once; the rest are struck white and thrown outward as the front reaches them. The kill wave follows 0.3 s behind
    { const L=onScreen(500).sort((a,b)=>dP(a)-dP(b)); let nv=0, nh=0; L.forEach((e,j)=>{ const d=dP(e), dir=Math.atan2((e.y-py)/FSY,e.x-px);
        if(d<Rs*1.05&&!e.d.boss&&!e.d.heavy&&nv<14){ nv++; const ex=e.x, ey=e.y, eh=e.h; for(let q=0;q<6;q++) GFX.pt({x:ex+rand(-30,30),y:ey,z:rand(0,eh),vx:Math.cos(dir)*rand(100,500),vz:rand(1200,2600),g:-200,drag:1.6,life:rand(.5,.9),s:rand(3,6),m:3,len:.07,c:GFX.rgb('#ffffff'),c2:STB.b,L:3}); dmg(e,Dm,{crit:true,kb:0,sx:px,sy:py}); return; }
        after(arr(d),()=>{ if(e.dead) return; soft(e,Dm*.5,{crit:true,kb:0,sx:px,sy:py}); K.knock(e,{from:[px,py],dist:640,up:1700+rand(0,600),fx:1}); if(j%3===0&&nh++<10) K.ehit(e,{pal:STG,pw:1.5,dir}); else hitFx(e,STG.m,1.2); }); }); }
    after(.3,()=>Cn.sweep(px,py,Dm,{speed:5200,max:.65}));
    // what is left of the star lies in the pit: its broken core half sunk in the melt and two pieces beside it, cooling from white-gold to dark
    if(!BKS) frag(px+Rs*.06,py+10,Rs*.34,END-TC-.15,{cool:2.6,v:2,delay:.1}); if(!BKS) frag(px-Rs*.34,py+50,Rs*.2,END-TC-.3,{cool:2,v:1,delay:.14}); if(!BKS) frag(px+Rs*.4,py-30,Rs*.16,END-TC-.4,{cool:1.8,v:3,delay:.18});
    // seven more are thrown over the whole field on high arcs and come down one after another out to the edges of the screen: each goes off where it lands
    { const a0=rand(0,TAU), cx=px, cy=py-hh*.15, L=[]; for(let i=0;i<7;i++){ const out=i>=3, n=out?4:3, a=a0+(out?.5:0)+(out?i-3:i)/n*TAU+rand(-.2,.2); let x=cx+Math.cos(a)*hw*(out?rand(1.05,1.28):rand(.55,.75)), y=cy+Math.sin(a)*hh*(out?rand(1.0,1.2):rand(.6,.8)); const d=Math.hypot(x-x0,y-y0); if(d<440){ x=x0+(x-x0)/(d||1)*440; y=y0+(y-y0)/(d||1)*440; } L.push({x,y,d:Math.hypot(x-px,(y-py)/FSY)}); }
      L.sort((a,b)=>a.d-b.d).forEach((q,i)=>{ const dur=.2+i*.085, lf=(5.0+(6-i)*.13)-TC-dur;
        shard({x:px,y:py,z:Rs*.4},{x:q.x,y:q.y},{dur,s:120,arc:520+i*90});
        after(dur,()=>{ starHit(q.x,q.y,.85,{vol:0,rock:0,pit:0,life:lf+1.2}); Cn.shake(.3); sfx('boom',1.5-i*.07,.35);
          frag(q.x,q.y,62,END-TC-dur-.2,{cool:1.6,shadow:0});
          inCircle(q.x,q.y,560,e=>{ if(!st.hit.has(e)){ st.hit.add(e); soft(e,Dm*.35,{crit:true,kb:0,sx:q.x,sy:q.y}); K.knock(e,{from:[q.x,q.y],dist:280,up:1300,fx:0}); if(st.eh++<8) K.ehit(e,{pal:STG,pw:1.1,dir:Math.atan2(e.y-q.y,e.x-q.x)}); } }); }); }); } });
  // ---- ruin (3.7 - 6.8): nothing stands still and nothing goes out at once: the pit spits, the smoke climbs off it and leans away, the light in the
  // fractures goes from rose to dark violet to soot, the splinters cool, craze and come apart one after another
  for(let i=0;i<20;i++) after(TC+.2+i*.13,()=>{ K.sparks(px+rand(-1,1)*Rs*.45,py+rand(-1,1)*Rs*.2,30,{pal:i%3?STA:STG,n:Math.max(2,7-(i*.3|0)),sp:[300,1300],up:1500-i*50,life:[.4,.9]}); });
  // what was thrown highest comes down late, all over the field
  for(let i=0;i<14;i++){ const at=TC+1.0+i*.065+rand(0,.05), tx=px+hw*rand(-1.2,1.2), ty=py+hh*rand(-1.1,.8), sz=rand(9,17); if(Math.hypot(tx-x0,ty-y0)<300) continue;
    after(at-.32,()=>GFX.pt({x:tx+140,y:ty,z:1150,vx:-437,vz:-3590,g:0,drag:0,life:.32,s:sz,rot:rand(0,TAU),vr:rand(-9,9),m:11,b:'alpha',c:GFX.rgb('#1a1226'),c2:'#0a0612',shadow:true,fk:4,L:3}));
    after(at,()=>{ K.dust(tx,ty,{n:3,r:24,sp:[160,420],a:.36,c:'#2c2440'}); K.sparks(tx,ty,8,{pal:STV,n:4,sp:[200,700],up:600,life:[.2,.45]}); if(i%5===0) K.chunks(tx,ty,{n:2,r:10,sp:[100,360],up:620,s:[sz*1.6,sz*2.6],pal:STV,kind:'slab',rock:'#140c20',life:.7}); }); }
  // the mushroom (K3.impact above) is the smoke column; under it a steady run of smaller rolls off the pit, carried off to the left
  after(TC+.5,()=>{ SFX.rumble&&SFX.rumble(.8); });
  for(let i=0;i<40;i++) after(TC+.35+i*.048,()=>{ const u=i/39; GFX.pt({x:px+rand(-1,1)*Rs*.5,y:py+rand(-1,1)*Rs*.2,z:rand(40,260),vx:rand(-520,-160),vy:rand(-30,30),vz:rand(700,1300)*(1-.4*u),g:0,drag:.75,life:rand(.7,1.15),s:rand(70,120)*(1-.4*u),grow:rand(170,280),m:5,b:'alpha',c:GFX.rgb('#120e17'),c2:'#000000',c3:'#4c3e65',er:.9,ns:rand(.9,1.6),w:1,a:.5*(1-.5*u),L:2}); });
  after(TC+.7,()=>K.embers(px,py,hw*.8,{pal:STA,n:44,life:2.2,up:400}));
  after(TC+1.7,()=>K.embers(px,py,hw*.5,{pal:STV,n:24,life:1.5,up:340}));
  after(TC+2.5,()=>K.embers(px,py,hw*.35,{pal:STV,n:14,life:1.3,up:260}));
  after(4.4,()=>Cn.move({x:px,y:py-280,zoom:.74,tilt:.16},.9));
  after(4.9,()=>{ Cn.SND.tick(.9,.15); });
  after(5.75-.76,()=>{ Cn.SND.tick(.7,.2); });
  after(5.75-.5,()=>{ sfx('shatter',.4); Cn.shake(.25); });
  // the scorch: a soft burnt gradient spreading under the pit (dark at the heart, thinning to the clean stone), still there when the light ends
  if(m) GFX.add(END-TC-.2,(k,t)=>{ const i=eo3(sat(t/.5)); F.quad(m.m.dark,px,py,hw*.95*i,hw*.95*.9*i,0,{a:.45*i}); },TC+.2);
  // the floor cooling: thin threads of smoke keep rising off the fractures to the very end, fewer and fainter as they go out
  for(let i=0;i<34;i++){ const u=i/33; after(TC+1.1+u*(END-TC-1.25),()=>{ const a=rand(0,TAU), d=rand(.15,1)*hw*.75; GFX.pt({x:px+Math.cos(a)*d,y:py+Math.sin(a)*d*FSY*.8,z:rand(4,20),vx:rand(-60,-10),vy:rand(-10,10),vz:rand(220,380),g:0,drag:.3,life:rand(1.2,1.8),s:rand(36,60),grow:rand(90,150),m:5,b:'alpha',c:GFX.rgb('#2a2234'),c2:'#000000',c3:'#8a7a9c',er:.9,ns:rand(1.2,2),w:1,a:.38*(1-.5*u),L:2}); }); }
  after(END-1.4,()=>{ Cn.back(1.3); GFX.ambient(1,1,1,1.4); });
  after(END,()=>ultStop()); }










// ---- ICE PRISON (빙옥) - an area, whole-screen: freeze, then break. Three rolls of cold run from her to the edges of the screen, each taller
// and wider than the last; whoever they pass grows ice: a spike at the feet, then to the waist, then a crystal shut round the whole body.
// Behind her an iceberg comes up out of the floor a piece at a time (it only ever grows) against a bank of dark cold. Held breath: the snow
// in the air stops and everything left on the screen freezes solid. A beat before the break the berg is shot through with white cracks and
// held; then it comes apart into great blocks thrown out over the whole field, and every body of ice on the screen bursts with it.
// What is left: stumps and fallen blocks that give way one after another into steam, a fence of ice thrown up by the front, cracks that cool.
const ICE=FRO, ICN={d:'#020a1c',b:'#1e6cd2',m:'#86d2f6',h:'#f0fbff',l:'#4c9cf0',s:'#c8f4ff'}, ICM={d:'#021430',b:'#1478e6',m:'#46b4ff',h:'#bfeaff',l:'#3c9cff',s:'#bfeaff'};
const tp3=(M,q,x,y,z)=>({x:x+M[0]*q[0]+M[4]*q[1]+M[8]*q[2],y:y+(M[1]*q[0]+M[5]*q[1]+M[9]*q[2])*FSY,z:z+M[2]*q[0]+M[6]*q[1]+M[10]*q[2]});
const IMT={}, imt=()=>IMT.e||(IMT.e=F.mat({nz:'streak',n1:[1,.5,-.3,0],nk:.12,ero:0,soft:.3,pm:[2,2.2,0,0],fd:[.03,.04,0,0],rk:[.3,.8],gain:3,bgain:1.2,layer:'o'}));
// several strokes in one ribbon (one draw): zero-width joins between them; each stroke's own strength goes into its width
const strip=(S,ps,k)=>{ if(ps.length<2) return; if(S.length){ const l=S[S.length-1]; S.push({x:l.x,y:l.y,z:l.z,w:0},{x:ps[0].x,y:ps[0].y,z:ps[0].z,w:0}); } for(const p of ps) S.push({x:p.x,y:p.y,z:p.z,w:p.w*k}); };
// LANCES: what a breaking berg throws over the floor in every direction: streaks of ice dust on low arcs, uneven, each thinning from its tail
function lances(x,y,r0,R,o={}){ if(!F.on) return; const m=mm().m, n=o.n||12, a0=rand(0,TAU), L=[], dur=o.dur||.55;
  for(let i=0;i<n;i++) L.push({a:a0+(i+rand(-.3,.3))/n*TAU,l:R*rand(.6,1.2),h:rand(60,220),w:rand(14,30),sd:rand(0,9),d:rand(0,.07),C:col(i%3?ICE:ICN)});
  GFX.add(dur+.1,(k,t)=>{ for(const q of L){ const u=sat((t-q.d)/dur); if(u<=0||u>=1) continue; const hd=eo3(u), tl=Math.max(0,hd-.32*(1-u*.6)), ps=[], ca=Math.cos(q.a), sa=Math.sin(q.a);
      for(let j=0;j<7;j++){ const v=mix(tl,hd,j/6), d=r0*.5+(q.l-r0*.5)*v; ps.push({x:x+ca*d,y:y+sa*d*FSY,z:Math.sin(Math.PI*Math.min(1,v*1.05))*q.h+20,w:q.w*(.15+.85*j/6)*(1-u*.5)}); }
      F.ribbon(m.trB,ps,{...q.C,a:1-u*u,gain:3,t0:q.sd,fd:[.6,.02,0,0]}); } },o.delay||0); }
function ultIce(id){ ultStart(id); if(F&&F.prepDeep) F.prepDeep(); const Cn=X.cine, x0=pl.x, y0=pl.gy, {hw,hh}=view(), Dm=70000*A.mul(id), m=F.on?mm():null, CW=CWH(ICE), T0=RT, now=()=>RT-T0;
  const bx=x0, by=y0-420, TH=3.2, TK=3.31, TC=3.45, HS=.08, END=(F.on&&K.bakeMeta&&K.bakeMeta.ice_break)?6.7:6.0, st={snow:1,hit:new Set(),enc:new Map(),nm:0,fx:0}, EH=[0,.7,1.3,2.3];
  const dH=e=>Math.hypot(e.x-x0,(e.y-y0)/FSY), dB=(x,y)=>Math.hypot(x-bx,(y-by)/FSY), soft=(e,d,o)=>dmg(e,e.d.boss?d:Math.min(d,Math.max(1,(e.hp-1)/2.2)),o);
  // how ice comes out of the floor: pushed up over d seconds (the big ones over eight or nine frames), a little past its height, and it settles
  const riseK=(u,d=.32)=>{ if(u<=0) return 0; if(u<d){ const p=u/d; return 1.05*p*p*(3-2*p); } return 1+.05*Math.exp(-(u-d)*9)*Math.cos((u-d)*16); };
  // frost left on the floor (never the black of a burn): it flashes white as it forms and settles to pale blue rime, then breaks up and goes
  // Three states in turn: glowing cracks that frost over white (rime), the rime melting to a dark wet sheen with a cold glint moving on it,
  // and last the wet patch drying from its rim inward to nothing, steam lifting off the shrinking edge
  const frostMark=(x,y,r,life,grow,g)=>{ if(!m) return; const rot=rand(0,TAU), t1=life*.3, t2=life*.58;
    GFX.add(life,(k,t)=>{ const h0=sat(t/t1), w=sat((t-t1)/(t2-t1)), rc=Math.pow(sat((t-t2)/(life-t2)),.8), sh=.5+.5*Math.sin(t*5+rot),
        H={cA:hexmix('#1a3a58','#061428',w),cB:hexmix(hexmix('#bfe6ff','#dcecf6',h0),'#24507c',w),cM:hexmix(hexmix('#ffffff','#f2f8fc',h0),hexmix('#5c9ccc','#bfe8ff',sh),w),cC:'#ffffff'}, i=eo3(sat(t/grow)),
        o={cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat(t/.06)*(1-rc*rc*.3),ero:.12+.2*h0+.2*w,rv:[(.3+.9*i)*(1-rc)+.02,.3+.2*w,0,.1]};
      F.quad(m.sco,x,y+r*.05,r*i,r*i,rot,{...o,a:o.a*.75,gain:g*.55*(.45+.55*(1-h0))*(1-.35*w)}); });
    for(let j=0;j<5;j++) after(t2+(life-t2)*(j+.5)/5,()=>{ const rr=r*.5*(1-(j+.5)/5); for(let q=0;q<2;q++){ const a=rand(0,TAU); steam(x+Math.cos(a)*rr,y+Math.sin(a)*rr*FSY,r*.05,1,.12); } }); };
  // cold steam (drifts one way, spreads and thins) and ice chips (tumble, bounce, lie)
  const steam=(x,y,r,n,a=.15)=>{ for(let i=0;i<n;i++){ const g=rand(0,TAU), d=rand(0,r); GFX.pt({x:x+Math.cos(g)*d,y:y+Math.sin(g)*d*FSY,z:rand(10,70),vx:rand(200,420),vy:rand(-30,30),vz:rand(80,180),g:0,drag:.3,life:rand(.75,1.15),s:rand(30,56),grow:rand(190,300),m:5,b:'alpha',c:GFX.rgb('#d6ecfa'),c2:'#000000',c3:'#9cc4e0',er:.95,ns:rand(.9,1.6),w:1,a,fade:'in',L:2}); } };
  const chips=(x,y,z,n,sp,up,sz=1)=>{ n=Math.ceil(n*.6); for(let i=0;i<n;i++){ const g=rand(0,TAU), s=rand(sp*.3,sp); GFX.pt({x:x+rand(-20,20),y:y+rand(-10,10),z:z+rand(0,30),vx:Math.cos(g)*s,vy:Math.sin(g)*s*FSY,vz:rand(.4,1)*up,g:2600,drag:.25,life:rand(.8,1.4),s:rand(4,9)*sz,rot:rand(0,TAU),vr:rand(-10,10),m:11,b:'alpha',c:GFX.rgb(i%2?'#e8f8ff':'#a8dcff'),c2:'#1c4c8c',shadow:true,bounce:.38,fk:5,L:2}); } };
  // one body of ice (kit update 10 'ice' kind): see-through, darker blue-green the deeper the eye looks in, cracks and bubbles inside, rime on
  // the edges and at the foot, a fresnel rim. Kinds 'stone' 'shard' 'flag' drawn with the ice shader (mode 2) are broken ice: irregular lumps
  // with flat cleaved faces and hollows. q.vein: the light inside (white as the berg nears the break, with q.emis)
  const iceS=(kind,v,x,y,z,M,q={})=>F.solid(kind,v,x,y,z,{M,mode:kind==='ice'||kind==='iceshard'?undefined:2,alb:q.alb||'#4f9fd4',dustC:q.deep||'#031a40',emis:q.emis||'#5cb8ff',rimC:'#eefaff',spec:.6,rim:q.rim??.45,
    vein:q.vein??0,clear:q.clear??.72,frost:q.frost??1,bump:q.bump??1.6,ero:q.ero||0,a:q.a??1,shadow:q.sh,clip:q.clip,seed:q.seed});
  // a cluster of crystals (a serac): the main one and ns more around its foot, shorter, leaning outward, one of them a thin plate; each rises a
  // little after the main one. Offsets and widths are fractions of the main crystal's width scale
  const mkMem=(v,ns)=>{ const L=[{ox:0,oy:0,hk:1,wk:.78,sq:1,rx:0,ry:0,rz:0,v,dl:0,sd:rand(0,9),ti:0}], s0=Math.random()<.5?-1:1;
    for(let j=0;j<ns;j++){ const s=j%2?-s0:s0; L.push({ox:s*rand(.16,.28),oy:rand(-.04,.08),hk:rand(.36,.62)*(j>1?.7:1),wk:rand(.5,.72),sq:j===1?rand(.45,.6):rand(.85,1.1),rx:rand(-.12,.12),ry:s*rand(.16,.36),rz:rand(0,TAU),v:(v+1+j)%4,dl:.05+j*.06,sd:rand(0,9),ti:j===1?2:1}); } return L; };
  // the colour of a crystal follows its thickness: a thick one deep blue-green and less clear, a thin one or a plate pale, clear and white-rimed
  const TONE=[{alb:'#2a78ac',deep:'#011822',dc:-.08,frost:.9,rim:.4},{alb:'#7cc0e4',deep:'#07405c',dc:.08,frost:1.3,rim:.55},{alb:'#cdeefa',deep:'#0e5c7a',dc:.17,frost:1.7,rim:.75}];
  // draws a cluster risen u seconds of d; returns the main crystal's matrix and height offset (for the cracks laid inside it)
  // q.stg: the berg grows rather than slides: four pushes, each one fast then held a moment, the height built up from the foot and the
  // width filling out behind it (so the facets seem to stack up), a little past full at the last push and it settles
  const stepK=(u,d)=>{ if(u<=0) return 0; if(u>=d) return riseK(u,d); const p=u/d*4, i=Math.floor(p), f=Math.min(1,(p-i)/.55); return 1.05*(i+f*f*(3-2*f))/4; };
  const drawC=(c,u,d,hgt,W0,q)=>{ let R=null; for(const s of c.mem){ const es=q.stg?stepK(u-s.dl,d):riseK(u-s.dl,d); if(es<=0||(q.cut&&s.hk>=.5)) continue; const hs=q.stg?.06+.94*es:1, h=hgt*s.hk*hs, w=W0*s.wk*(q.stg?.4+.6*Math.min(1,es*1.3):1), z=q.stg?-h*.1*(1-es):-h*.85*(1-es), M=F.xfw({sx:w,sy:w*s.sq,sz:h,rz:c.rz+s.rz,rx:s.rx,ry:c.ry+s.ry}), tn=TONE[s.ti||0];
      iceS(s.k||'ice',s.v,c.x+s.ox*W0,c.y+s.oy*W0*FSY,z,M,{...q,alb:tn.alb,deep:tn.deep,clear:Math.min(.95,(q.clear??.74)+tn.dc),frost:q.frost??tn.frost,rim:tn.rim,sh:s.dl?null:q.sh,seed:s.sd}); if(!s.dl) R={M,z}; } return R; };
  // how many rolls of cold have gone out (0..3, each eased in over a third of a second): what the slow build of the berg's white foot follows
  const rolls=T=>[.9,1.55,2.2].reduce((s,p)=>s+sat((T-p)/.35),0);
  // the fractures inside a piece: a wandering line (a slow drift plus fine kinks, never a regular zigzag) from foot to point, thinning upward,
  // and a short branch off it partway up. Points are [dx,dy,height 0..1,width]
  const crk=n=>{ const L=[]; for(let q=0;q<n;q++){ let dx=rand(-.03,.03), dy=rand(-.03,.03), vx=rand(-.012,.012), vy=rand(-.012,.012); const P=[];
      for(let j=0;j<14;j++){ vx+=rand(-.008,.008); vy+=rand(-.008,.008); dx+=vx; dy+=vy; P.push([dx+rand(-.008,.008),dy+rand(-.008,.008),.04+j*.071,1.25-.8*j/13]); }
      L.push(P); const b=3+((Math.random()*4)|0), s=Math.random()<.5?-1:1, B=[P[b]]; let bx2=P[b][0], by2=P[b][1];
      for(let j=1;j<6;j++){ bx2+=s*rand(.012,.024); by2+=rand(-.01,.01); B.push([bx2,by2,P[b][2]+j*.05,.7*(1-j/6)]); } L.push(B); } return L; };
  // the berg: centre first, then left and right alternately, each leaning outward; the further out the nearer the camera (drawn later).
  // d = how long each takes to be pushed up; ck = the fractures that light up inside each one a beat before it breaks
  const B=[{dx:0,dy:0,h:2400,ry:.04,t:1.12,d:.7,v:0},{dx:-400,dy:36,h:1250,ry:-.2,t:1.24,d:.62,v:1},{dx:380,dy:52,h:1020,ry:.25,t:1.36,d:.6,v:2},{dx:-760,dy:86,h:760,ry:-.38,t:1.5,d:.55,v:3},{dx:720,dy:98,h:640,ry:.44,t:1.62,d:.55,v:1}].map((c,i)=>({...c,x:bx+c.dx,y:by+c.dy,rz:rand(0,TAU),ck:crk(i?2:3),mem:mkMem(c.v,i?2:3)}));
  // kit update 14: with the baked sequences loaded the berg freezes out of the air (Blender: needles nucleating at three hearts, branching,
  // thickening) and its break is a rigid-body simulation; the pieces below (B, RBL and their blocks) are then not drawn
  const BKI=!!(F.on&&K.bakeMeta&&K.bakeMeta.ice_form&&K.bakeMeta.ice_break)&&K.bakePre(['ice_form','ice_break']);   // the baked pictures are used only if every page has arrived; if not (a slow phone, a first cast) the drawn version plays, and they keep loading for the next cast
  // the field: small clusters (two baked variants, mirrored, scaled to each piece's height; the scene's cluster is about 585 tall)
  const BKS=!!(F.on&&K.bakeMeta&&K.bakeMeta.ice_spire0_form&&K.bakeMeta.ice_spire1_break)&&K.bakePre('ice_spire*')&&BKI;
  const spO=c=>({s:c.h/585,flip:c.v%4>1,amb:.45});
  // broken ice heaped against the foot of each piece (comes up with it): cleaved lumps, a splinter, a slab
  const RBL=[]; B.forEach((c,i)=>[i%2?-1:1].forEach(sd=>RBL.push({x:c.x+sd*c.h*rand(.16,.24),y:c.y+rand(34,70),h:c.h*rand(.13,.2),ry:sd*rand(.3,.6),rz:rand(0,TAU),v:i+(sd>0?1:0),t:c.t+rand(.1,.3),k:['stone','shard','flag'][i%3],w:rand(.7,1)})));
  const F0=[0,1,2,3,4,5].map(i=>{ const a=Math.PI*(1.04+.92*((i*7)%6+.5)/6)+rand(-.08,.08), r=rand(150,210); return {x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,h:95+i*24,ry:Math.cos(a)*.55,rz:rand(0,TAU),t:.5+i*.085,v:i}; });
  // the field: ice of every size between the berg's and a body's stands up over the whole floor as the cold passes, ring after ring out to the
  // edges of the screen (nearer the berg = taller and earlier), each leaning outward. Nothing tall in front of her.
  const W=[]; { const w0=rand(0,TAU); (BKS?[[5,.46,600,860]]:[[6,.4,520,800],[10,.62,340,520],[5,.8,240,360]]).forEach(([n,kr,h0,h1],r)=>{ for(let i=0;i<n;i++){ const a=w0+r*.37+(i+rand(-.28,.28))/n*TAU, d=hw*kr*rand(.88,1.12), x=x0+Math.cos(a)*d, y=y0+Math.sin(a)*d*FSY*1.05; if(dB(x,y)<760||Math.abs(y-y0)>hh*1.55) continue;
        let h=rand(h0,h1); if(y>y0&&Math.abs(x-x0)<380) h=Math.min(h,(y-y0)*.5); const v=i+r, sh=r>=2&&Math.random()<.35;
        // the tall ones a pair (a crystal and a shorter one leaning off it), the rest single crystals of every shape and width, some of the
        // smallest a splinter driven in aslant
        // the rest: a lean crystal, a splinter driven in aslant, a squat broken lump of ice or a toppled slab, each leaning its own way
        const ty=sh?1:(i+r*3)%5, lump=ty===2||ty===4;
        const mem=r<1?mkMem(v%4,1):[{ox:0,oy:0,hk:lump?rand(.38,.55):1,wk:lump?rand(.6,.85):ty===1?rand(.9,1.2):rand(.45,.95),sq:lump?rand(.6,.9):rand(.7,1.2),rx:rand(-.3,.3)*(ty===1?1.6:1),ry:0,rz:0,v:v%4,dl:0,sd:rand(0,9),k:ty===1?'iceshard':lump?'stone':'ice',ti:lump?0:(i%3===0?2:1)}];
        W.push({x,y,a,d,h,ry:Math.cos(a)*rand(.25,.5),rz:rand(0,TAU),v,r,mem,t:1.55+.45*Math.min(1,d/(hw*1.25))+rand(0,.05)}); } }); }
  S([['gx03',.12],['gx04',.3],['gx06',2.9],['gx08',.12,{kick:[1.2,-1]}],['gx10',1.2],['gx13',.8],['gx14',9]]);
  // ---- omen (0 - 0.8): close on her; the cast flash; the staff goes into the ground and frost starts to spread from her feet
  GFX.ambient(.5,.58,.76,3); Cn.move({x:x0,y:y0-BODY*.6,zoom:1.4,tilt:.06},.5); Cn.drone(52,.3); SFX.rumble&&SFX.rumble(.8);
  after(.3,()=>{ K.flare(x0,y0,BODY*1.1,{pal:AZV,s:300,dur:.24,gain:2.8}); GFX.light(x0,y0,900,AZV.l,1,.25,{z:160}); K.sparks(x0,y0,BODY,{pal:AZV,n:14,sp:[300,1000],up:800,life:[.2,.45]}); Cn.SND.shing(1.25,.5); });
  after(.55,()=>{ GFX.light(x0,y0,700,ICE.l,.9,.3,{z:60}); K.sparks(x0,y0,10,{pal:ICE,n:16,sp:[300,900],up:260,life:[.2,.45]}); K.dust(x0,y0,{n:6,r:40,sp:[200,520],a:.35,c:'#5c7c98'}); Cn.shake(.22); sfx('shatter',.4); });
  // the pool of cold light under her (small: it must not light the berg's faces flat) and the bead of cold on the staff, which swells at each
  // roll of cold and settles over a few frames; both only grow, until the break
  { const pool=GFX.light(x0,y0,400,ICE.l,.05,.3,{hold:TC-.05,z:140}); GFX.add(TC,(k,t)=>{ pool.a=.12+.3*k*k; pool.r=400+260*k; });
    const tp=tip(), ch=K.vorb(tp.x,tp.y,tp.z,{r:26,dur:TC-.35,in:.25,out:.03,pal:ICE,spin:4,core:.26,heat:.5,gain:.5,delay:.35}), PU=[.9,1.55,2.2];
    // the cold gathering on the staff (kit 9): streaks of frost spiralling in from off screen, three shells tightening, grit lifting, haze;
    // inside the bead a small crystal that turns and grows, white veins brightening. Mist creeps in low over the floor toward her feet.
    const ga=K.gather?K.gather(tp.x,tp.y,tp.z,{dur:2.85,max:3.2,r:170,R:700,pal:ICE,shells:2,core:0,floor:0,n:.75,gain:.45,delay:.35}):null, ms={n:0,tp:0};
    if(ga) after(TC,()=>ga.release({s:.7,ring:0}));
    GFX.add(TC-.35,(k,t)=>{ const q=tip(), T=t+.35; let pu=0; for(const p of PU){ const u=T-p; if(u>0) pu+=Math.exp(-u*6)*sat(u/.06); } ch.x=q.x; ch.y=q.y; ch.z=q.z; ch.r=(26+74*k)*(1+.45*pu);
      if(ga){ ga.x=q.x; ga.y=q.y; ga.z=q.z; }
      if(F.solid){ const s=(34+96*k)*(1+.25*pu), M=F.xfw({sx:s*.7,sy:s*.7,sz:s,rz:T*1.3,rx:0,ry:.35}); F.solid('crystal',1,q.x,q.y,q.z-s*.45,{M,alb:'#123468',emis:hexmix('#9ad6ff','#ffffff',.3+.5*k),rimC:'#ffffff',spec:3,rim:1,vein:1,heat:.3+.5*k,bump:.2,tone:.5,a:.85*sat(t/.3),clip:0}); }
      const dt=Math.max(0,t-ms.tp); ms.tp=t; if(T<TH){ ms.n+=(8+34*k*k)*dt; while(ms.n>=1){ ms.n-=1; const a=rand(0,TAU), r0=rand(hw*.7,hw*1.15), z=rand(6,40);
        GFX.pt({x:x0+Math.cos(a)*r0,y:y0+Math.sin(a)*r0*FSY,z,oc:[x0,y0,14],or:r0,oa:a,ow:rand(.5,.9),ok:r0/rand(1.3,1.9),oz0:z,rmin:110,life:2.2,s:rand(36,64),grow:rand(40,90),m:5,b:'alpha',c:GFX.rgb('#dcf0fc'),c2:'#000000',c3:'#a8d0ec',er:.95,ns:rand(.9,1.5),w:1,a:.09+.06*k,fade:'in',L:2}); } } },.35);
    // frost branching out over the floor from her feet (one ribbon): each limb grows out with the frost's edge, with a tine off it
    if(m){ const LB=[]; for(let j=0;j<11;j++){ const a=j/11*TAU+rand(-.2,.2), l=rand(.7,1.05), P=[]; let aa=a; for(let s=0;s<6;s++){ aa+=rand(-.25,.25); P.push([aa,l*s/5]); } LB.push({P,tn:2+((Math.random()*3)|0),ts:Math.random()<.5?-1:1}); }
      GFX.add(TC-.4,(k,t)=>{ const r=hw*(.07+.12*Math.pow(k,.8)+.25*rolls(t+.4)/3)*1.05, S=[], f=sat(t/.4); for(const b of LB){ const ps=b.P.map(([aa,d],s)=>({x:x0+Math.cos(aa)*d*r,y:y0+Math.sin(aa)*d*r*FSY,z:2,w:(9-7*s/5)*f})); strip(S,ps,1);
          const p=b.P[b.tn], ta=p[0]+b.ts*.7; strip(S,[{x:x0+Math.cos(p[0])*p[1]*r,y:y0+Math.sin(p[0])*p[1]*r*FSY,z:2,w:5*f},{x:x0+Math.cos(p[0])*p[1]*r+Math.cos(ta)*r*.18,y:y0+(Math.sin(p[0])*p[1]*r+Math.sin(ta)*r*.18)*FSY,z:2,w:.5}],1); }
        F.ribbon(imt(),S,{cA:'#3c8cd0',cB:'#d8f4ff',cM:'#ffffff',cC:'#ffffff',a:.55-.2*k,gain:1.9-.6*k,fd:[.1,.1,0,0]}); },.4); } }
  // frost writing itself over the floor round her feet only (the berg keeps the eye); a faint copy is drawn over the fog so it never blinks out.
  // It only spreads and brightens.
  if(m){ const rot=rand(0,TAU); GFX.add(TC-.4,(k,t)=>{ const H=K.heat(ICE,1-.62*k), r=hw*(.07+.12*Math.pow(k,.8)+.25*rolls(t+.4)/3), a=sat(t/.3), o={cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a,ero:.4-.3*k,rv:[.2+k*1.15,.3,0,.1]};
      F.quad(m.sco,x0,y0+r*.1,r,r,rot,{...o,gain:.55*(.25+.75*k*k)});
      F.quad(m.sco,x0,y0+r*.1,r,r,rot,{...o,gain:.3*(.25+.75*k*k),layer:'o',ord:-20}); },.4); }
  // snow lifting slowly off the floor all over the field
  for(let i=0;i<96;i++){ const at=.35+i*.029; after(at,()=>{ if(!st.snow) return; const a=rand(0,TAU), d=rand(100,hw*1.05); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(8,140),vx:-Math.sin(a)*rand(40,150),vy:Math.cos(a)*rand(30,90),vz:rand(110,300),g:0,drag:.5,life:Math.max(.25,Math.min(rand(.9,1.5),TH-at)),s:rand(5,11),m:8,c:GFX.rgb(i%3?'#ffffff':ICE.s),fade:'in',L:3}); }); }
  // ---- build (0.8 - 3.2): the camera leaves her for the berg and is back far enough to hold its whole height before the first piece is up,
  // then only drifts back and rolls one way; three rolls of cold, the berg a piece at a time, the field ring after ring
  after(.8,()=>{ GFX.ambient(.3,.42,.7,1.4); Cn.move({y:y0-700,zoom:.68,tilt:.22},.7); Cn.SND.inhale(2.3,.4); });
  after(1.52,()=>Cn.move({y:y0-730,zoom:.61,roll:.03},1.66,'lin'));
  // the key light on the berg from the upper left in front, and a deep blue one from behind on the right: one side of every piece bright,
  // the other dark
  { const k1=GFX.light(bx-900,by+420,2700,'#e4f6ff',.05,.3,{hold:TC-1.1,z:1700}), k2=GFX.light(bx+1100,by-260,2200,'#2460f0',.05,.3,{hold:TC-1.1,z:500}); GFX.add(TC-1.1,(k,t)=>{ const g=sat(t/.5); k1.a=.4*g; k2.a=.5*g; },1.1);
    // the light in the berg's heart: from 2.2 it swells, pulsing faster and faster, until the break
    const k3=GFX.light(bx,by+40,900,'#bfe8ff',.01,.3,{hold:TC-2.2,z:700}); GFX.add(TC-2.2,(k,t)=>{ const T=t+2.2, p=Math.pow(k,1.6); k3.a=.05+.75*p*(.65+.35*Math.sin(T*T*6)); k3.r=900+1100*p; },2.2); }
  // ice on a body: stage 1 a spike at the feet, 2 to the waist, 3 a crystal closed round it, well over its head (held). The first 26 get the
  // mesh, everyone the colour.
  const frost=(e,n)=>{ if(e.dead) return; let c=st.enc.get(e); if(!c){ c={e,n:0,k0:0,v:st.enc.size%4,rz:rand(0,TAU),ry:rand(-.2,.2),sd:e.x<x0?-1:1,mesh:(!e.d.boss&&st.nm<18)?(st.nm++,1):0,i:st.enc.size}; st.enc.set(e,c); }
    const n1=Math.min(3,n||c.n+1); if(n1<=c.n) return; c.n=n1; c.k0=now(); e.mkC='#a8ecff'; e.mkT=RT+(TC-now())+.25; e.slowT=Math.max(e.slowT||0,TC-now()+.3);
    if(c.n>=3) e.stun=Math.max(e.stun,TC-now()+.15); else if(c.n===2) e.stun=Math.max(e.stun,.4);
    if(c.mesh){ K.sparks(e.x,e.y,e.h*.3,{pal:ICE,n:c.n>=3?8:4,sp:[150,520],up:460,life:[.15,.35]}); if(c.n>=3) chips(e.x,e.y,10,3,360,520); } else if(st.fx++%3===0) hitFx(e,ICE.b,.6); };
  const drawEnc=(c,T,wh,em)=>{ const e=c.e; if(e.dead||!c.mesh||!c.n) return; const u=T-c.k0, full=c.n>=3, h=e.h*mix(EH[c.n-1],EH[c.n],riseK(u)), sk=full?sat(u/.2):0, off=c.sd*e.d.r*.75*(1-sk), wd=h*(full?.95:1.1);
    const M=F.xfw({sx:wd,sy:wd,sz:h,rz:c.rz,rx:0,ry:c.ry*.4*sk+c.sd*.3*(1-sk)}); iceS('ice',c.v,e.x+off,e.y+5,e.z||0,M,{emis:em,vein:.15+.9*wh,clear:full?.6:.8,seed:c.rz}); };
  // a roll of cold: starts at her feet from nothing and stands up as a wall as it goes (taller than it is thick, each one taller than the last)
  // The inner rolls are tight, dense and turn fast; each one further out is looser, more broken and slower. The underside of each wall
  // is in its own shadow (dark blue), the top takes the light. fo: where in its life it starts to thin (the last one, the break's, thins
  // over most of its life as it is thrown out past the edges)
  const wave=(R,dur,tube,H,a,i,cx=x0,cy=y0,e0=0,fo=.6)=>{ if(!vok()) return; const sd=rand(0,90), RB=R/.78, sp=Math.max(.35,1.5-.38*i), br=1+.55*i; GFX.add(dur,(k,t)=>{ const e=e0+(1-e0)*(1.5*k-.5*k*k), rr=Math.max(.012,e)*.78, f=sat((k-fo)/(1-fo)), th=tube*Math.max(.1,e)*1.25*(1+.25*f), Hh=H*.5*Math.max(.15,e);
      VO.add('ring',cx,cy,Hh*.9,{ex:RB,ey:RB,ez:H*.55,pa:[rr,th,2.4+.5*i,t*sp],pb:[0,th*H*.8/Hh*br*(1+f),.7+.15*i,.3*i],dens:7.5*a*(1-f)*(1-f*.5)*sat(t/.24),seed:sd,smoke:1,fire:.7,cS:'#03142a',cK:'#eafaff',ld:[-.3,-.2,.93],amb:.1,key:1.9,rim:.6,steps:20,ord:-1e9}); }); };
  // the gale that rides each roll: streaks of snow climbing the wall in a spiral, all turning the same way. The last one stays, circling the
  // field at the edge of the screen; in the held breath it stops where it is, and the break throws it outward.
  const gale=(R,dur,H,i,keep)=>{ if(!m) return; const n=F.low?6:(keep?14:10), L=[], t00=now(), life=keep?TC+.3-t00:dur*1.05; for(let j=0;j<n;j++) L.push({a:rand(0,TAU),sp:rand(.8,1.25),h:rand(.5,1)*H,w:rand(20,46)*(.45+.28*i)*.6,sd:rand(0,9),ph:rand(0,1),C:j%3?CW:col(ICN)});
    GFX.add(life,(k,t)=>{ const kk=Math.min(1,t/dur), e=1.5*kk-.5*kk*kk, T=t00+t, tt=Math.min(T,TH), bl=sat((T-TC)/.28), r=R*e*(1+.7*bl), fo=keep?1-bl:1-sat((kk-.7)/.3), fi=sat(t/.2);
      for(const q of L){ const p=(tt*.8*q.sp+q.ph)%1, ps=[], am=Math.sin(Math.PI*p); for(let j=0;j<7;j++){ const v=Math.max(0,p-.4*(1-j/6)), ang=q.a+(tt*1.3+1.4*Math.pow(Math.max(0,tt-2.2),2))*q.sp+v*1.5, rr=r*(1+.05*v); ps.push({x:x0+Math.cos(ang)*rr,y:y0+Math.sin(ang)*rr*FSY,z:10+q.h*v,w:q.w*(.25+.75*j/6)}); }
        F.ribbon(m.m.trB,ps,{...q.C,a:am*fo*fi*.85,gain:1.6,t0:q.sd,fd:[.5,.05,0,0]}); } }); };
  [[.9,.52,1,.1,520,.6,0],[1.55,.9,1,.1,760,.5,0],[2.2,1.4,1,.1,1000,.36,hw*1.12]].forEach(([at,kr,dur,tube,H,a,keep],i)=>after(at,()=>{ const R=hw*kr, tp=tip(); wave(R,dur,tube,H,a,i); gale(keep||R,keep?dur*.8:dur,H,i,!!keep);
    K.flare(tp.x,tp.y,tp.z,{pal:ICE,s:120+30*i,dur:.36,gain:1.5}); K.sparks(x0,y0,24,{pal:ICE,n:14+8*i,sp:[R*.6,R*1.5],up:240,life:[.25,.55]});
    GFX.light(x0,y0,i?R*.35:R*.6,ICE.l,i?.25:.45,.6,{z:90});
    // snow and ice grit riding the front of the roll, thrown outward and up its face (streaked along their flight)
    for(let j=0;j<(F.low?16:36);j++) after(rand(0,dur*.55),()=>{ const a=rand(0,TAU), kk=sat((now()-at)/dur), e=1.5*kk-.5*kk*kk, d=Math.max(60,R*e*.95), v=R/dur*rand(.7,1.1)*(1-kk*.6); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(10,80),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(300,700)*(1+.3*i),g:900,drag:1.2,life:rand(.35,.6),s:rand(3,6),m:3,len:.06,c:[1,1,1],c3:'#ffffff',c2:ICE.b,L:3}); }); if(!i){ GFX.ripple(x0,y0,R*1.1,{life:.6,s:.35}); Cn.shake(.07); } sfx('shatter',.35+.12*i); SFX.boom(1.5-.25*i,.22+.1*i);
    // snow crystals whipped round along the wall (streaked the way it turns): many and fast on the inner rolls, few and slow further out
    for(let j=0;j<(F.low?10:28-6*i);j++) after(rand(.1,dur*.9),()=>{ const a=rand(0,TAU), kk=sat((now()-at)/dur), e=1.5*kk-.5*kk*kk, d=Math.max(80,R*e*rand(.85,1.05)), v=rand(900,1500)*(1.3-.3*i); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(40,H*.7),vx:-Math.sin(a)*v,vy:Math.cos(a)*v*FSY,vz:rand(-60,120),g:0,drag:.8,life:rand(.25,.45),s:rand(2.5,4.5),m:3,len:.07,c:[1,1,1],c3:'#ffffff',c2:'#8fd0ff',L:3}); });
    // the cold that creeps low over the floor ahead of the wall: broad thin sheets of mist sliding outward a hand's height off the ground
    for(let j=0;j<(F.low?6:14);j++) after(rand(0,dur*.5),()=>{ const a=rand(0,TAU), kk=sat((now()-at)/dur), d=Math.max(80,R*(1.5*kk-.5*kk*kk)*.85), v=R/dur*rand(.35,.6); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(4,22),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(0,25),g:0,drag:.9,life:rand(.9,1.3),s:rand(60,100),grow:rand(220,320),m:5,b:'alpha',c:GFX.rgb('#d4eaf8'),c2:'#000000',c3:'#94bcd8',er:.95,ns:rand(1.2,2),w:1,a:.13,fade:'in',L:2}); });
    // the cold reaches each one as the front passes them; the last roll reaches everyone on the screen
    for(const e of onScreen(300)){ const d=dH(e); if(d>R&&i<2) continue; after(dur*(1.5-Math.sqrt(2.25-2*Math.min(.98,d/R))),()=>{ if(e.dead) return; soft(e,Dm*.1,{kb:0,sx:x0,sy:y0}); frost(e); }); } }));
  // the bank of dark cold behind the berg (first, so the ice has something to stand against): three lumps wider than the berg
  if(vok()){ const sd=[rand(0,90),rand(0,90),rand(0,90)], PL=[[-600,-190,820],[40,-270,720],[620,-220,740]];
    GFX.add(TC+1-1.05,(k,t)=>{ const g=eo3(sat(t/1.7)), f=sat((t-(TC-1.05))/1), up=f*420; PL.forEach(([dx,dy,s],i)=>VO.add('blast',bx+dx*(1+.3*f),by+dy,s*(.26+.3*g)+up,{ex:s,ey:s,ez:s*.9,pa:[.38+.4*g+.1*f,.58,2.2,.2+t*.06],pb:[0,1,1,.4+.3*g+.25*f],dens:8*sat(t*1.6)*(1-f)*(1-f),seed:sd[i],smoke:1,fire:1,cS:'#040a1a',cK:'#a4d8ff',ld:[-.1,.85,-.5],amb:.12,key:1.1,rim:.4,lit:1.1*g,glow:0,steps:20})); },1.05);
    // the cold drawn down out of the bank's lit underside: thin streaks falling and fanning out toward the rolls, thicker as the berg grows
    for(let i=0;i<64;i++){ const at=1.2+i*.03; after(at,()=>{ if(now()>TH) return; const P=PL[i%3], d=rand(.15,.55)*P[2], a=rand(0,TAU), x=bx+P[0]+Math.cos(a)*d, y=by+P[1]+Math.sin(a)*d*.3, z=P[2]*.45+rand(0,160), ox=x-x0, oy=(y-y0)/FSY, l=Math.hypot(ox,oy)||1, sp=rand(500,900);
      GFX.pt({x,y,z,vx:ox/l*sp*.6-oy/l*sp*.5,vy:(oy/l*sp*.6+ox/l*sp*.5)*FSY,vz:-rand(900,1500),g:0,drag:.6,life:rand(.35,.6),s:rand(2.5,4.5),m:3,len:.06,c:[.85,.95,1],c3:'#ffffff',c2:'#6cb4f0',a:.8,L:3}); }); } }
  // the berg, its rubble, the spikes round her, the field and the ice on the bodies: one draw loop from 0.55 to the break, far to near.
  // Rising is monotone. Under the berg the floor goes dark where it stands and white with frost round it. In the held breath the veins go
  // white; from TK the fractures climb each piece from foot to point.
  if(F.solid){ const frot=rand(0,TAU);
    // pre: the last second before the held breath, the light inside the berg pulsing faster and brighter and its crack field spreading.
    // The berg outlives the break by HS (the frames the break is held), white, cracked through; only then is it blocks.
    GFX.add(TC-.55+HS,(k,t)=>{ const T=t+.55, wh=Math.pow(sat((T-TH)/(TK-TH)),2), ck=sat((T-TK)/(TC-TK-.03)), em=hexmix(ICE.b,'#ffffff',wh*.8), D=[], g0=sat((T-1.12)/1.6), pre=Math.pow(sat((T-2.05)/(TH-2.05)),1.3), pls=.5+.5*Math.sin(T*T*6), aft=T>TC, emB=hexmix(ICE.b,'#ffffff',Math.max(wh*.8,.45*pre*(.6+.4*pls)));
      if(g0>0&&!aft){ const H=K.heat(ICE,.55-.3*wh); F.quad(m.m.dark,bx,by+70,560+620*g0,330+150*g0,0,{a:.62*sat((T-1.12)/.5)}); F.quad(m.sco,bx,by+90,700+900*g0,700+900*g0,frot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat((T-1.12)/.4),ero:.45-.3*g0,rv:[.25+g0,.3,0,.1],gain:.7+.5*wh}); }
      if(!aft) for(const c of st.enc.values()) D.push([c.e.y,3,c]);
      if(BKI){ if(T>.96) D.push([by,5,{t:.96}]); } else B.forEach((c,i)=>{ if(T>c.t) D.push([c.y,0,c,i]); });
      if(!aft){ if(!BKI) for(const c of RBL) if(T>c.t) D.push([c.y,4,c]);
      for(const c of F0) if(T>c.t) D.push([c.y,1,c]);
      for(const c of W) if(T>c.t) D.push([c.y,2,c]); }
      D.sort((p,q)=>p[0]-q[0]);
      // the fractures inside every piece of the berg, one ribbon: from 2.05 they creep up from the feet with the pulse, from TK they run to the points
      const CS=[], cv=Math.max(ck,.8*pre);
      for(const [yy,kd,c,i] of D){ const u=T-c.t;
        if(kd===3){ drawEnc(c,T,wh,em); continue; }
        // the baked berg: the light in its heart pulses with the pre-break, and it goes white in the held breath
        if(kd===5){ const gl=.45*pre*pls+.9*wh; K.bakeFrame('ice_form',Math.min(K.bakeMeta.ice_form.n-1,u*30),bx,by,{bright:1+gl,tint:hexmix('#ffffff','#dff4ff',Math.min(1,gl)),amb:.35,ord:.01}); continue; }
        if(kd===0){ const g=sat(u/Math.max(.3,TH-c.t)), hgt=c.h*(.88+.12*g), R=drawC(c,u,c.d,hgt,Math.min(hgt,1600),{stg:1,cut:aft,sh:[.4,.24,.34],emis:emB,vein:.06+.05*rolls(T)+.3*pre+.35*pre*pls+.3*wh,clear:.74-.1*wh-.08*pre});
          if(R&&cv>0){ const M=R.M, z=R.z; for(const P of c.ck){ const ps=[]; for(const p of P){ if(p[2]>cv*1.05+.05) break; const q=tp3(M,[p[0],p[1],p[2]*.92],c.x,c.y,z); ps.push({x:q.x,y:q.y,z:q.z,w:(4+hgt*.003)*(p[3]||1)*(ck>0?1:.6+.4*pls)}); } strip(CS,ps,1); } }
          continue; }
        if(kd===4){ const e=stepK(u,.5), e2=.15+.85*Math.min(1,e); iceS(c.k,c.v,c.x,c.y,-c.h*.15*(1-e),F.xfw({sx:c.h*c.w*(.5+.5*e2),sy:c.h*c.w*.85*(.5+.5*e2),sz:c.h*(c.k==='shard'?1.1:1.4)*e2,rz:c.rz,rx:0,ry:c.ry}),{emis:em,vein:.08+.9*wh,seed:c.rz}); continue; }
        if(kd===1){ const e=riseK(u,.3); iceS('ice',c.v,c.x,c.y,-c.h*.8*(1-e),F.xfw({sx:c.h*.7,sy:c.h*.62,sz:c.h,rz:c.rz,rx:0,ry:c.ry}),{emis:em,vein:.1+.9*wh,seed:c.rz}); continue; }
        if(BKS){ K.bakeFrame('ice_spire'+(c.v%2)+'_form',Math.min(29,u*30),c.x,c.y,{...spO(c),bright:.82+.5*wh,tint:'#d6e8ff'}); continue; }
        drawC(c,u,.38,c.h,c.h*1.1,{emis:em,vein:.06+.04*rolls(T)+.9*wh,clear:c.r<1?.72:.8,sh:c.r<1?[.4,.24,.3]:null}); }
      if(CS.length>1) F.ribbon(imt(),CS,{cA:ICE.m,cB:'#ffffff',cM:'#ffffff',cC:'#ffffff',a:1,gain:ck>0?5:1.6+3*pre*pls}); },.55); }
  // each piece of the berg: the floor splits and glows a beat before, then it breaks out: grit and ice thrown, a roll of frost round its foot
  // (no jolt of the camera: the berg must not seem to shift), and frost steam keeps pouring off the foot for as long as it stands
  if(!BKI) B.forEach((c,i)=>{ after(c.t-.16,()=>{ GFX.light(c.x,c.y,c.h*.6,ICE.l,.9,.3,{z:40}); K.sparks(c.x,c.y,6,{pal:ICE,n:8,sp:[200,700],up:500,life:[.15,.35]}); sfx('shatter',.2); });
    after(c.t,()=>{ chips(c.x,c.y,10,10,700,900+c.h*.4,1.3); K.sparks(c.x,c.y,30,{pal:ICE,n:14,sp:[300,1200],up:1100,life:[.25,.6]}); K.dust(c.x,c.y,{n:6,r:c.h*.1,sp:[250,700],a:.4,c:'#4c6c8c'});
      K.vring(c.x,c.y,{r:c.h*.5,r0:c.h*.1,dur:.8,tube:.2,c:'#0e3a5c',c2:'#d8f4ff',a:.6}); SFX.boom(.9+.15*i,.45-.05*i); sfx('shatter',.3);
      for(let j=0;j<12;j++) after(.12+j*.17,()=>{ if(now()<TC-.1) steam(c.x+rand(-1,1)*c.h*.2,c.y+rand(20,60),c.h*.06,1,.17); }); }); });
  // the berg comes up in four pushes (stepped rise in drawC): at each push the floor round its foot heaves, a ring of grit and broken ice
  // is thrown out low and a puff of frost rolls off the foot
  if(!BKI) B.forEach((c,i)=>{ for(let s=1;s<4;s++) after(c.t+c.d*s/4,()=>{ const r=c.h*(.12+.03*s); for(let j=0;j<5;j++){ const a=rand(0,TAU); chips(c.x+Math.cos(a)*r,c.y+Math.sin(a)*r*FSY,6,2,520,560+c.h*.2,1.1); }
    K.dust(c.x,c.y,{n:4,r:r,sp:[220,560],a:.36,c:'#5a7c9c'}); K.sparks(c.x,c.y,c.h*.06,{pal:ICE,n:6,sp:[200,700],up:500,life:[.15,.35]}); steam(c.x,c.y+30,r*.5,2,.16); if(!i) sfx('shatter',.18); }); });
  // each piece of the field as it comes up
  W.forEach((c,i)=>after(c.t,()=>{ K.sparks(c.x,c.y,20,{pal:ICE,n:5,sp:[250,900],up:800,life:[.2,.45]}); chips(c.x,c.y,10,c.r<2?4:2,460,640); if(c.r<2){ K.dust(c.x,c.y,{n:3,r:30,sp:[200,600],a:.4,c:'#4c6c8c'}); if(i%2===0) sfx('shatter',.2); } }));
  // ---- the held breath (3.2 - 3.45): nothing grows; the snow in the air stops where it is; everything left on the screen freezes solid
  after(TH,()=>{ st.snow=0; Cn.hush(.25); Cn.move({zoom:.68},.22); for(const e of onScreen(300)){ e.stun=Math.max(e.stun,.4); frost(e,3); }
    for(let i=0;i<70;i++){ const a=rand(0,TAU), d=rand(100,hw*1.05); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(40,520),g:0,life:TC-TH+.02,s:rand(5,11),m:8,c:GFX.rgb(i%3?'#ffffff':ICE.s),L:3}); } });
  // the fracture (3.31): white cracks start up every piece of the berg from its foot
  after(TK,()=>{ Cn.shake(.3); sfx('shatter',.7); Cn.SND.tick(1.4,.5); GFX.light(bx,by,1500,'#ffffff',.8,.25,{z:600}); B.forEach(c=>K.sparks(c.x,c.y,c.h*.3,{pal:ICE,n:6,sp:[200,700],up:300,life:[.1,.25]})); });
  // ---- climax (3.45): the berg bursts; the break runs outward over the field and takes every piece of ice and every frozen body with it
  after(TC,()=>{ Cn.peak(bx,by-200,BKI?{ca:0,blur:.05,tint:'#cfeeff',a:.22,hold:.02,out:.1}:{ca:.02,blur:.16,tint:'#cfeeff',a:.3,hold:.02,out:.14}); hitstop=Math.max(hitstop,.13); Cn.shake(1.2); after(HS,()=>{ Cn.shake(1.9); SFX.boom(.5,.8); }); Cn.SND.hit(1); SFX.shatter(1); SFX.boom(.6,1);
    GFX.ambient(.5,.62,.8,30); after(.14,()=>GFX.ambient(.4,.52,.74,5)); GFX.light(bx,by,hw*1.5,ICE.l,.8,.5,{z:300,hold:.1}); GFX.light(x0,y0,hw*.5,ICE.l,.42,1.2,{z:120,hold:.3});
    Cn.move({zoom:.54,roll:0},.2,'out');
    // the floor first
    frostMark(bx,by+60,1000,END-TC-.02,.25,1.1); frostMark(x0,y0,760,END-TC-.02,.3,.8);
    // two white frames at the heart; then the shock: a wall of frost rolling out to the edges, streaks of ice dust low over the floor in every
    // direction, and the ice storm (splinters flung flat and fast past everything)
    K.flare(bx,by,560,{pal:ICE,s:260,dur:.1,gain:2.2}); lances(bx,by,300,hw*1.25,{n:10,dur:.5}); GFX.ripple(bx,by,hw*1.9,{life:.55,s:.3});
    wave(hw*1.7,.75,.07,620,.3,3,bx,by+40,.2,.04);
    // the storm wall does not switch off: it is thrown outward and comes apart into blown snow over the next half second
    for(let j=0;j<(F.low?30:70);j++) after(.05+rand(0,.45),()=>{ const a=rand(0,TAU), d=hw*rand(.7,1.15), v=rand(900,1800); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(60,520),vx:Math.cos(a)*v-Math.sin(a)*v*.4,vy:(Math.sin(a)*v+Math.cos(a)*v*.4)*FSY,vz:rand(-80,200),g:200,drag:1.6,life:rand(.5,.9),s:rand(18,34),grow:rand(60,140),m:5,b:'alpha',c:GFX.rgb('#e8f6ff'),c2:'#000000',c3:'#b4d8f0',er:.9,ns:rand(.9,1.4),w:1,a:.22,fade:'in',L:3}); });
    for(let i=0;i<(F.low?30:70);i++){ const a=rand(0,TAU), sp=rand(2200,6200), r=rand(150,500); GFX.pt({x:bx+Math.cos(a)*r,y:by+Math.sin(a)*r*FSY,z:rand(30,520),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(-150,350),g:0,drag:2.4,life:rand(.3,.7),s:rand(3,6.5),m:3,len:.045,c:[1,1,1],c3:'#ffffff',c2:'#8fc8f0',L:3}); }
    K.sparks(bx,by,500,{pal:ICE,n:50,sp:[700,2800],up:1800,life:[.3,.9]}); K.dust(bx,by,{n:12,r:300,sp:[600,1500],a:.4,c:'#4c6c8c'}); chips(bx,by,500,26,2200,1700,1.6);
    for(const c of F0){ chips(c.x,c.y,c.h*.4,3,600,800); }
    // the break reaches each body as it passes: the shell bursts off it (blocks of it tumble away), it is thrown outward; the kill wave follows
    const hit=(e,j)=>{ if(st.hit.has(e)||e.dead) return; st.hit.add(e); const c=st.enc.get(e);
      if(c&&c.mesh){ chips(e.x,e.y,e.h*.5,j<16?9:5,900,1000,1.9); K.sparks(e.x,e.y,e.h*.5,{pal:ICE,n:j<16?8:4,sp:[300,1200],up:800,life:[.15,.4]}); if(j<2&&dB(e.x,e.y)<hw*.7) K.flare(e.x,e.y,e.h*.7,{pal:ICE,s:130,dur:.12,gain:1.6});
        if(j<3) K.chunks(e.x,e.y,{n:2,kind:'iceshard',s:[44,76],sp:[320,760],up:1150,life:1.05,pal:ICE}); } else if(j%3===0) hitFx(e,ICM.m,1);
      if(j<2) K.ehit(e,{pal:ICE,pw:1.3,dir:Math.atan2((e.y-by)/FSY,e.x-bx)});
      soft(e,Dm*.75,{crit:true,kb:0,sx:x0,sy:y0}); K.knock(e,{from:[bx,by+200],dist:520,up:1800,fx:st.hit.size<10?1:0}); };
    onScreen(400).sort((a,b)=>dB(a.x,a.y)-dB(b.x,b.y)).forEach((e,j)=>after(Math.min(.2,.03+dB(e.x,e.y)/14000),()=>hit(e,j)));
    after(.4,()=>Cn.sweep(x0,y0,Dm));
    if(!F.solid) return;
    // the blocks: every piece of the berg leaves its stump and bursts into blocks of every size, thrown all round her over the field: fast at
    // first, slowing, dropping; each turns in the air, lands on its side, skips once and lies there. The tall pieces of the field snap as the
    // break passes them (the nearest throw a block too) and leave stumps; the small ones just go to chips.
    const g=5200, BG=[], SP=[], TP=[], a0=rand(0,TAU), NP=[3,2,2,1,1], SZ=[[.34,.13,.09,.07,.06],[.24,.09,.07],[.2,.08],[.26,.1],[.2]]; let q=0;
    // the blocks are broken ice, not gems: cleaved splinters and slabs (scale x,y,z per kind, drawn with the ice shader)
    const BKK=['ice','stone','iceshard','stone'], BK={iceshard:[.42,.34,.72],ice:[.36,.3,.8],stone:[.5,.42,.4]};
    const blk=(sx,sy,z0,s,a,r,t0,v,ox=x0,oy=y0)=>{ const lx=ox+Math.cos(a)*r, ly=oy+Math.sin(a)*r*FSY, dd=Math.hypot(lx-sx,(ly-sy)/FSY), tf=.36+dd/7000+rand(0,.05), l=Math.hypot(lx-sx,ly-sy)||1; BG.push({x:sx,y:sy,z0,s,tf,tb:.17+s/2600,t0,vz:(.5*g*tf*tf-z0)/tf,v,lx,ly,ux:(lx-sx)/l,uy:(ly-sy)/l,RY:(Math.random()<.5?-1:1)*rand(1.15,1.45),RX:rand(-.3,.3),rz:rand(-.7,.7),sp:rand(3,5.5)*(Math.random()<.5?-1:1),k:BKK[(Math.random()*BKK.length)|0]}); };
    // a few great blocks and a spray of small ones, all thrown outward from the heart of the berg (each piece's fan opens away from it)
    if(BKI) K.bake('ice_break',bx,by,{from:2,delay:HS,hold:1.0,out:.6,amb:.35,ord:.01,tint:'#dff4ff',bright:1});
    if(!BKI) B.forEach((c,i)=>{ const hb=Math.min(c.h,1520), ca=c.dx?Math.atan2(.5,Math.sign(c.dx)):-Math.PI/2; SP.push({x:c.x,y:c.y,h:hb*.2,w:hb*1.05,ry:c.ry*2.2+(i?0:.35),rz:c.rz,v:c.v,t0:HS,brk:1.5+i*.1});
      for(let k=1;k<NP[i];k++,q++) blk(c.x+rand(-70,70),c.y,Math.min(c.h*(.12+.2*k),1400),hb*SZ[i][k]*rand(.6,1.45),(i?ca+rand(-.5,.5):a0+q/5*TAU+rand(-.2,.2)),(k?rand(1100,2300):rand(700,1100))*(i?1:1.15),HS,(c.v+k)%4,bx,by+260); });
    for(const c of W){ c.bt=.03+dB(c.x,c.y)/14000; if(BKS) continue; if(c.r<1) SP.push({x:c.x,y:c.y,h:c.h*.3,w:c.h*1.3,ry:c.ry*1.6,rz:c.rz,v:c.v,t0:c.bt,brk:.95+(c.a%TAU+TAU)%TAU/TAU*.75,sm:1}); if(c.r<1){ const ra=Math.atan2((c.y-by)/FSY,c.x-bx); blk(c.x,c.y,c.h*.5,c.h*rand(.2,.48),ra+rand(-.2,.2),rand(400,700),c.bt,c.v,c.x,c.y); } }
    // the berg comes down from the top: the upper part of every tall crystal snaps off (the tallest first), topples outward as it drops, hits
    // the floor and bursts into splinters. Until it goes each is drawn whole, white and cracked through, where it stood
    if(!BKI) B.forEach(c=>{ const W0=Math.min(c.h,1600); for(const s of c.mem){ if(s.hk<.5) continue; const h=c.h*s.hk, out=c.dx?Math.sign(c.dx):(s.ox?Math.sign(s.ox):(Math.random()<.5?-1:1));
      TP.push({x:c.x+s.ox*W0,y:c.y+s.oy*W0*FSY,h,w:W0*s.wk,sq:s.sq,v:s.v,rz:c.rz+s.rz,ry0:c.ry+s.ry,rx:s.rx,vx:out*rand(420,820)*(c.dx?1:.7),vy:rand(80,260),vz:rand(0,300),tr:HS+.02+(1-h/2400)*.16,spr:out*rand(1.7,2.6),sd:s.sd,ti:s.ti||0,on:0,done:0}); } });
    BG.sort((p,q2)=>q2.s-p.s).forEach((c,i)=>{ c.big=i<6; c.brk=.95+((i*5)%BG.length)/BG.length*.75; });
    const hp=p=>1-Math.pow(1-p,2.3), sm=f=>f*f*(3-2*f), mat=(ht,f,o)=>{ const fl=f>0?Math.pow(1-f,1.5):0, w=Math.max(ht,fl*.6); return {emis:hexmix('#5cb8ff','#ffffff',w*.75),vein:.08+1.1*w,ero:.05+f*.15,...o}; };
    GFX.add(END-.04-TC,(k,t)=>{ const D=[];
      for(const c of st.enc.values()) if(c.mesh&&!st.hit.has(c.e)) D.push([c.e.y,3,c]);
      for(const c of W) if(t<c.bt+(c.r<1?0:.22)) D.push([c.y,0,c]);
      for(const c of SP){ const u=t-c.t0, f=sat((u-c.brk)/.7); if(u>0&&f<1) D.push([c.y,1,c,u,f]); }
      for(const c of BG){ const u=t-c.t0, f=sat((u-c.brk)/.7); if(u>0&&f<1) D.push([u<c.tf?mix(c.y,c.ly,hp(u/c.tf)):c.ly+c.uy*c.s*.5*sat((u-c.tf)/c.tb),2,c,u,f]); }
      for(const c of TP) if(!c.done) D.push([c.y+(t>c.tr?c.vy*(t-c.tr):0),4,c]);
      D.sort((p,q2)=>p[0]-q2[0]);
      for(const [yy,kd,c,u,f] of D){
        if(kd===3){ drawEnc(c,TC+t,1,'#ffffff'); continue; }
        if(kd===4){ const u2=t-c.tr, tn=TONE[c.ti];
          if(u2<0){ iceS('ice',c.v,c.x,c.y,0,F.xfw({sx:c.w,sy:c.w*c.sq,sz:c.h,rz:c.rz,rx:c.rx,ry:c.ry0}),{emis:'#ffffff',vein:1.2,clear:.6,alb:tn.alb,deep:tn.deep,seed:c.sd}); continue; }
          if(!c.on){ c.on=1; const zb=c.h*.42; chips(c.x,c.y,zb,10,700,500,1.6); K.sparks(c.x,c.y,zb,{pal:ICE,n:12,sp:[300,1100],up:500,life:[.15,.4]}); steam(c.x,c.y+20,c.w*.3,2,.2); }
          const z=c.h*.42+c.vz*u2-.5*g*u2*u2, ry=c.ry0+c.spr*u2*(1+u2);
          if(z<-c.h*.12){ c.done=1; const lx=c.x+c.vx*u2, ly=c.y+c.vy*u2; chips(lx,ly,20,14,1000,900,2); K.sparks(lx,ly,40,{pal:ICE,n:16,sp:[300,1400],up:900,life:[.2,.5]}); K.dust(lx,ly,{n:6,r:c.h*.12,sp:[300,800],a:.45,c:'#6a8aa8'});
            GFX.light(lx,ly,c.h*.8,ICE.l,.7,.3,{z:100}); Cn.shake(.2+c.h/6000); SFX.boom(1.2-c.h/4000,.35); sfx('shatter',.35);
            // it does not vanish: it breaks where it lies, from the end that struck first. The great ones hold the frame, the floor under them
            // fractures and frost runs out from the cracks, and the fallen crystal is left as segments sliding apart along its length
            const big=c.h>1500, ln=c.h*.58, dx=Math.sign(c.vx)||1, ns=big?3:1;
            if(big){ hitstop=Math.max(hitstop,.07); Cn.shake(.75); frostMark(lx,ly,c.h*.42,END-TC-t-.02,.12,1.2); K.dust(lx,ly,{n:10,r:c.h*.2,sp:[500,1200],a:.45,c:'#6a8aa8'}); steam(lx,ly+20,c.h*.12,4,.2); SFX.boom(.7,.5); }
            for(let j=0;j<ns;j++){ const sx=lx-dx*ln*(j/ns)*.9, sy=ly-c.vy*.05*j; blk(sx,sy,30,c.w*(big?.4:.42)*(1-j*.15),Math.atan2(c.vy*.3,dx)+rand(-.35,.35)+(j-1)*.25,rand(140,320)*(big?1:.7),t,c.v+j,sx,sy); const b=BG[BG.length-1]; b.big=0; b.brk=.55+j*.12+rand(0,.15); b.tf=.18+rand(0,.06); b.vz=(.5*g*b.tf*b.tf-30)/b.tf; }
            continue; }
          iceS('ice',c.v,c.x+c.vx*u2,yy,z,F.xfw({sx:c.w*.92,sy:c.w*c.sq*.92,sz:c.h*.58,rz:c.rz,rx:c.rx+c.spr*.3*u2,ry}),{emis:hexmix('#5cb8ff','#ffffff',.8),vein:.9,clear:.66,alb:tn.alb,deep:tn.deep,seed:c.sd}); continue; }
        if(kd===0&&BKS){ if(t<c.bt) K.bakeFrame('ice_spire'+(c.v%2)+'_form',29,c.x,c.y,{...spO(c),bright:1.25,tint:'#d6e8ff'}); continue; }
        if(kd===0){ const sk=sat((t-c.bt)/.22); drawC(c,9,.38,c.h*(1-.8*sk),c.h*1.1,mat(1,0,{ero:.6*sk})); continue; }
        if(kd===1){ const ht=Math.pow(sat(1-u/1.3),1.4), sc=1-.3*sm(f), hz=c.h*1.5*sc*riseK(u*3+.1), M=F.xfw({sx:c.w*.3*sc,sy:c.w*.26*sc,sz:hz,rz:c.rz,rx:.22,ry:c.ry});
          iceS('ice',c.v,c.x,c.y,-hz*.2-c.h*.5*f,M,mat(ht,f,{frost:.45+f,ero:.05+.95*sm(f),sh:c.sm?null:[.5,.3,.4*(1-f)]})); continue; }
        const fly=u<c.tf, land=u-c.tf, P=sat(u/(c.tf+c.tb)), E=1-(1-P)*(1-P), sc=1-.3*sm(f), s=c.s*sc; let x, z;
        if(fly){ x=mix(c.x,c.lx,hp(u/c.tf)); z=Math.max(0,c.z0+c.vz*u-.5*g*u*u)+c.s*.2; }
        else { const b=sat(land/c.tb), bq=1-(1-b)*(1-b); x=c.lx+c.ux*c.s*(.5*bq+.55*sm(f)); z=c.s*.34*4*b*(1-b)+c.s*.07-c.s*.3*sm(f); }
        const air=fly||land<c.tb, ht=Math.pow(sat(1-u/1.3),1.4), K2=BK[c.k], M=F.xf({sx:s*K2[0],sy:s*K2[1],sz:s*K2[2]*(1-.35*sm(f)),rx:c.RX*E+(c.RX<0?-1:1)*.9*sm(f),ry:c.RY+c.sp*(1-E),rz:c.rz+(1-E)*1.4});
        if(fly&&u>.03&&c.big){ const ps=[]; for(let j=0;j<5;j++){ const t2=Math.max(0,u-.11*(1-j/4)), h2=hp(t2/c.tf); ps.push({x:mix(c.x,c.lx,h2),y:mix(c.y,c.ly,h2),z:Math.max(0,c.z0+c.vz*t2-.5*g*t2*t2)+c.s*.4,w:Math.min(26,c.s*.07)*(.2+.8*j/4)}); } F.ribbon(m.m.trB,ps,{...CW,a:.6*(1-u/c.tf),gain:2.6,t0:c.rz,fd:[.7,.02,0,0]}); }
                iceS(c.k,c.v,x,yy,z-c.s*.18*sm(f),M,mat(ht,f,{frost:.45+f,ero:.05+.95*sm(f),clip:air?0:1,sh:[.5,.3,air?.6:.42*(1-f)],seed:c.rz})); } });
    // what happens to each of them, in order
    W.forEach((c,i)=>after(c.bt,()=>{ if(BKS) K.bake('ice_spire'+(c.v%2)+'_break',c.x,c.y,{...spO(c),from:2,hold:.3,out:.6}); chips(c.x,c.y,c.h*.4,c.r<2?8:4,900,1100,c.r<2?1.8:1.3); K.sparks(c.x,c.y,c.h*.5,{pal:ICE,n:c.r<2?8:4,sp:[400,1500],up:900,life:[.2,.5]}); if(c.r<1) GFX.light(c.x,c.y,600,ICE.l,.5,.3,{z:120}); }));
    BG.forEach((c,i)=>{ after(c.t0+c.tf,()=>{ K.dust(c.lx,c.ly,{n:5,r:c.s*.15,sp:[250,650],a:.42,c:'#4c6c8c'}); K.sparks(c.lx,c.ly,40,{pal:ICE,n:12,sp:[300,1200],up:900,life:[.2,.5]}); chips(c.lx,c.ly,20,c.big?12:7,900,1000,c.big?2.2:1.5); GFX.light(c.lx,c.ly,c.s*2.4,ICE.l,.8,.35,{z:150}); Cn.shake(.14+c.s/2200); SFX.boom(1.3-c.s/1500,.3); sfx('shatter',.25);
        if(c.big){ K.chunks(c.lx,c.ly,{n:2,kind:'iceshard',s:[46,84],sp:[300,720],up:1000,life:1.05,pal:ICE}); frostMark(c.lx,c.ly,c.s*.9,END-TC-c.t0-c.tf-.02,.15,.9); } });
      after(c.t0+c.tf+c.tb,()=>{ chips(c.lx+c.ux*c.s*.5,c.ly+c.uy*c.s*.5,10,4,420,480,1.2); K.dust(c.lx+c.ux*c.s*.5,c.ly+c.uy*c.s*.5,{n:2,r:c.s*.1,sp:[150,400],a:.35,c:'#4c6c8c'}); });
      after(c.t0+c.brk,()=>{ steam(c.lx,c.ly,c.s*.2,c.big?4:3,.22); chips(c.lx,c.ly,c.s*.25,c.big?8:4,260,420,.7); K.sparks(c.lx,c.ly,c.s*.3,{pal:ICE,n:c.big?10:5,sp:[80,360],up:300,life:[.3,.7]}); Cn.SND.tick(.7+i*.05,.16); });
      after(c.t0+c.brk+.35,()=>{ K.sparks(c.lx,c.ly,c.s*.3,{pal:ICE,n:6,sp:[60,260],up:240,life:[.4,.8]}); steam(c.lx+c.ux*c.s*.4,c.ly+c.uy*c.s*.4,c.s*.15,2,.2); if(i%2===0) sfx('shatter',.2); }); });
    SP.forEach((c,i)=>{ after(c.t0+c.brk,()=>{ steam(c.x,c.y+20,c.w*.12,c.sm?1:3); }); after(c.t0+c.brk+.35,()=>{ K.sparks(c.x,c.y,c.h*.5,{pal:ICE,n:c.sm?3:6,sp:[60,260],up:240,life:[.4,.8]}); if(!c.sm) steam(c.x,c.y+20,c.w*.1,2); if(!i) sfx('shatter',.3); }); }); });
  // ---- ruin (3.7 - 6.0): frost falling, cold steam rising off the cracks and drifting off one way as it thins, the camera settles
  for(let i=0;i<14;i++) after(3.85+i*.11,()=>{ const a=rand(0,TAU), d=rand(0,700); steam(bx+Math.cos(a)*d,by+60+Math.sin(a)*d*FSY,120,2,.13); });
  after(3.9,()=>K.embers(bx,by,hw*.7,{pal:ICE,n:30,life:2,up:260}));
  for(let i=0;i<50;i++) after(TC+.2+i*.036,()=>{ const vz=rand(200,420), z=rand(420,1000); GFX.pt({x:x0+rand(-1,1)*hw*.95,y:y0+rand(-1,.7)*hh*.9,z,vx:rand(40,120),vz:-vz,g:0,life:Math.min(1.9,z/vz),s:rand(5,10),m:8,c:GFX.rgb(i%3?'#ffffff':ICE.s),fade:'in',L:3,fk:6}); });
  after(3.95,()=>Cn.move({y:y0-330,zoom:.72,tilt:.15},.9));
  after(END-1.3,()=>{ Cn.back(1.2); GFX.ambient(1,1,1,1.6); });
  after(END,()=>ultStop()); }

X.reg('mage',{sk,order,basic:{fn:basic,cd:()=>.85*(1-.05*(L('mg_basic')-1))},skills:SKILL,ults:{mg_ult1:ultThunder,mg_ult2:ultStar,mg_ult3:ultIce}});
})();
