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
  GATE={d:'#04051a',b:'#23286e',m:'#6f74d8',h:'#d9dcff',l:'#8c68ff',s:'#cfbcff'};      // the storm clouds round the opened sky: night indigo with lit rims
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
const CIRC=()=>F.ready('v3_circ_mage')?'v3_circ_mage':'fx_circle_arcane';
const tx=(a,b)=>F.ready(a)?a:b;   // a painting if it has loaded, else its stand-in
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
  bolt:mat({...m.art,tex:'fx3_bolt',layer:'o',rk:[.5,1]}),
  fork:mat({...m.art,tex:'v3_bolt_fork',layer:'o',pw:1.5,rk:[.7,1.4]}),
  forkD:mat({...m.art,tex:'v3_bolt_fork',layer:'o',op:1,pw:.7,nk:.1,soft:.3,cA:'#03010c',cB:'#0c0430',cC:'#1c0c52',rk:[.5,1.2],gain:1,bgain:1}),
  gate:mat({...m.art,tex:'v3_skygate',layer:'o',nz:'billow',n1:[1.4,1.4,.03,.02],n2:[1.2,1.2,.02,.03],dist:.03,mdist:1,nk:.2,op:.85,rk:[.72,1.5]}),
  arcH:mat({...m.art,tex:'v3_arc_h',layer:'o',nz:'streak',n1:[2,1,-3,0],n2:[2,1,-2,0],dist:.025,mdist:1,nk:.2,rk:[.45,1]}),
  tail:mat({...m.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[1.6,1,-1.4,0],n2:[1.5,1,-.9,0],dist:.05,mdist:1,nk:.25,rk:[.5,1.05]}),
  tailS:mat({...m.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[1.4,1,-.8,0],n2:[1.5,1,-.6,0],dist:.06,mdist:1,nk:.2,op:1,pw:.6,rk:[.5,1.2]}),
  haze:mat({nz:'fbm',n1:[3,1,-2,0],nk:.8,ero:.02,soft:.5,pm:[2,1,0,0],gain:.08,layer:'d'}),
  rock:mat({...m.art,tex:'v3_boulder',layer:'o',op:1,nk:0,ero:.02,soft:.06,cA:'#080606',cB:'#3c302a',cM:'#6e5c50',cC:'#b09a86',rk:[.35,1],gain:1,bgain:1}),
  dustR:mat({...m.art,tex:'v3_dustring',layer:'g',op:1,nz:'billow',n1:[2,2,.03,.03],nk:.3,cA:'#060404',cB:'#2a201c',cM:'#4a3a32',cC:'#7a6456',rk:[.4,1.1],gain:1,bgain:1}),
  craR:mat({...m.art,tex:'v3_crater',layer:'g',nk:0,op:1,pw:.7,ero:.04,soft:.3,rk:[.4,1]}),
  craH:mat({...m.crE,tex:'v3_crater',nk:.3,pw:2.6,rk:[.7,1.5]}),
  orb:mat({...m.art,tex:'v3_orb',layer:'o',nz:'wisp',n1:[1.5,1.5,.2,.1],nk:.2,rk:[.5,1.05]}),
}; return MM; }
// the staff's tip as a world point (x, floor y, height)
const tip=()=>{ const J=pl.j; return J&&J.st?{x:J.st[0],y:pl.gy,z:Math.max(0,pl.gy-J.st[1])}:{x:pl.x+pl.f*30,y:pl.gy,z:BODY*1.9}; };

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
// BOLT: one bolt out of the sky, played from the painted flipbook: leader, the full bolt with its splash on the floor, a re-strike, the
// afterglow. Mirrored at random; h is its height (the sheet is squeezed sideways for tall ones). Falls back to a single painting.
function lbolt(x,y,o={}){ if(!F.on) return; const P=K.pal(o.pal||ARC), h=o.h||1300, dur=o.dur||.42, g=o.gain||1;
  if(F.ready('v3_flip_bolt')) K.flip(x,y,{tex:'v3_flip_bolt',n:12,dur,s:h/2,asp:o.asp||clamp(.74-h/3800,.3,.5),lift:1,z:-h*.06,pal:P,gain:.72*g,rk:[.68,1.3],delay:o.delay});
  else { const m=mm(), C=col(P), w=h*.3, fl=Math.random()<.5; GFX.add(dur*.7,k=>F.bill(m.bolt,x,y,h/2,w,h/2,0,{...C,a:1-k*k,gain:3*g,ero:.08+k*.5,uvT:fl?[-1,1,1,0]:[1,1,0,0]}),o.delay||0); }
  const fx=()=>{ GFX.light(x,y,Math.min(h*.9,1300),P.l,1.2*g,dur*.9,{z:150}); K.sparks(x,y,10,{pal:P,n:12,sp:[300,1300],up:900,life:[.2,.5]}); }; if(o.delay) after(o.delay,fx); else fx(); }
// COLUMN: the colossal braided fork standing from the floor to height h, in three flickering drawings: a dark violet sheath behind it,
// the body kept in the palette's colour by a pushed ramp, and one thin white channel (a narrow beam) down its middle.
function forkCol(x,y,h,o={}){ if(!F.on) return; const m=mm(), P=K.pal(o.pal||JUD), C=col(P), dur=o.dur||.6, w=o.w||h*.3, g=o.gain||1, sd=rand(0,9);
  GFX.add(dur,(k,t)=>{ const fr=t<.1?0:t<.24?1:t<.4?0:1, f=sat((k-.5)/.5), a=(1-f)*(1-f)*(fr&&t<.24?.8:1)*(.9+.1*Math.sin(t*70)), u=fr?[-1,1,1,0]:[1,1,0,0];
    F.quad(m.m.glowG,x,y,w*.7,w*.7,0,{...C,a:a*.5,gain:1.3});
    F.bill(m.forkD,x,y,h*.48,w*1.3,h/2,0,{a:a*.95,ero:.1+f*.6,nk:.1+f*.8,t0:sd,fd:[.28,.28,.14,.1],uvT:u});
    F.bill(m.fork,x,y,h*.48,w*(1+.05*fr),h/2,0,{...C,a,gain:1.9*g*(1-.6*f),ero:.12+f*.35,nk:.12+f*.6,t0:sd,fd:[.16,.16,.07,.1],uvT:u}); },o.delay||0);
  K.beam(x,y,h,x,y,0,{pal:P,w:Math.min(h*.03,60),dur:dur*.5,gain:.6,delay:o.delay||0}); }
// LAUNCH: everything light within R of an impact is thrown into the air and away from it (they fly before the damage wave takes them)
function launch(x,y,R){ for(const e of V.en){ if(e.dead||e.d.heavy) continue; const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy)||1; if(l>R) continue; const k=1-l/R*.6; e.vz=Math.max(e.vz,rand(900,1600)*k); e.kx+=dx/l*420*k; e.ky+=dy/l*420*k; } }
// CRACKLE: static gathering under something about to be struck (follows src {x,y}): a branching burn that flickers into new shapes
// and grows hotter, small painted arcs jumping across it
function crackle(src,o={}){ if(!F.on) return; const m=mm(), C=col(K.pal(o.pal||ARC)), r=o.r||150, dur=o.dur||1, sd=rand(0,TAU); let na=rand(0,.2);
  GFX.add(dur,(k,t)=>{ if(src.dead) return; const st=Math.floor(t*11), i=sat(t/.2), fl=.7+.3*Math.sin(st*12.9+sd), rr=r*(.65+.35*i+.25*k);
    F.quad(m.sco,src.x,src.y,rr,rr,sd+st*2.4,{...C,a:i*fl,gain:2.2*(.45+.75*k),ero:.3-.2*k,rv:[.5+k*.8,.3,0,.1]});
    if(t>na){ na=t+rand(.2,.34); const a=rand(0,TAU), b=a+rand(2,4); arc({x:src.x+Math.cos(a)*rr*.8,y:src.y+Math.sin(a)*rr*.8*FSY,z:12},{x:src.x+Math.cos(b)*rr*.8,y:src.y+Math.sin(b)*rr*.8*FSY,z:12},{tex:'h',w:r*.3,dur:.13,pal:o.pal}); } },o.delay||0); }
// STRIKE: one bolt out of the sky: the painted bolt with real height, the burn it leaves, a small ring thrown over the floor
function strike(x,y,o={}){ const P=K.pal(o.pal||ARC), s=o.s||1, h=o.h||1150*s;
  lbolt(x,y,{pal:P,h,asp:o.asp,dur:o.dur||.42,gain:o.gain||1}); scorch(x,y,{r:(o.r||160)*s,pal:P,life:o.scar||1.8});
  if(o.shock!==0){ ring1(x,y,200*s,{pal:P}); K.dust(x,y,{n:3,r:30,sp:[120,380],a:.35}); } }
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
    F.bill(m.orb,o.x,o.y,z,s*1.7,s*1.7,-t*2.4+sd,{...C,a,gain:2.3,t0:sd});
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
function fieldFx(v,R,dur){ const h={life:1}; if(!F.on) return h; const m=mm(), C=col(ARC), C2_=col(AZV), sd=rand(0,9), N=30;
  const E=GFX.add(dur,(k,t)=>{ if(h.life<=0&&t<dur-.3){ E.dead=true; return; } const i=eo3(sat(t/.35)), a=i*sat((dur-t)/.3), rr=R*(.6+.4*i), pts=[];
    F.quad(m.m.glowG,v.x,v.y,rr*1.15,rr*1.15,0,{...C,a:.16*a,gain:.6,bgain:.5});
    { const st=Math.floor(t*9); F.quad(m.sco,v.x,v.y,rr*1.05,rr*1.05,sd+st*2.4,{...C,a:a*(.55+.25*Math.sin(st*12.9)),gain:1.5,ero:.16,rv:[i*1.3,.3,.22,.12]}); }
    F.ring(m.m.shL,v.x,v.y,rr*.95,rr*1.02,{...C,a:a*(.5+.2*Math.sin(t*11)),gain:1.4,t0:sd});
    for(let q=0;q<=N;q++){ const b=q/N*TAU; pts.push({x:v.x+Math.cos(b)*rr,y:v.y+Math.sin(b)*rr*FSY,h:(90+120*Math.abs(Math.sin(b*3+t*3)))*a*(1-.45*Math.sin(b))}); }
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
    if(t>=next){ next=t+.2; const u=rand(.35,1), sx=mix(pl.x,x1,u), sy=mix(pl.gy,y1,u); K.sparks(x1,y1,z1,{pal:ARC,n:3,sp:[300,900],up:500,life:[.15,.35]}); scorch(sx,sy,{r:120,life:.9,gain:.9}); K.dust(x1,y1,{n:1,dir:b,spread:1,sp:[150,400],a:.3,s:.8}); } });
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
      if(EVO(id)) after(.15,()=>{ ring1(e.x,e.y,250,{pal:AZV,dur:.3}); K.art(e.x,e.y,{tex:tx('v3_burst_arcane','v3_xburst'),floor:true,s:230,dur:.34,pal:AZV,gain:.85,hold:.25,s0:.4,rot:rand(0,TAU)}); GFX.light(e.x,e.y,560,AZV.l,.9,.25,{z:120}); K.sparks(e.x,e.y,30,{pal:ARC,n:10,sp:[300,1000],up:600}); inCircle(e.x,e.y,160,o=>dmg(o,d*.5,{kb:.6,sx:e.x,sy:e.y})); }); })); }},
  // ARCANE ORB: gyroscope orbs circling her, throwing a spark at whatever they touch
  mg_orb:{fn(id){ if(V.orbs.some(o=>o.mage)||!nearest(700)) return false; const n=EVO(id)?5:3, d=D(id); raise(); sfx('rise',.5,.4);
    for(let i=0;i<n;i++){ const o={mage:true,a:i/n*TAU,life:5,d,R:EVO(id)?330:270,w:3.4,hitR:85,c:C1,h:BODY*.8,rot:false,v:{x:pl.x,y:pl.gy-BODY}};
      o.x=pl.x+Math.cos(o.a)*o.R; o.y=pl.gy+Math.sin(o.a)*o.R*.8; o.fx=orbFx(o,i,n>3?1:2);
      o.hit=e=>{ sfx('thunder',.15); arc({x:o.x,y:o.y,z:o.h},{x:e.x,y:e.y,z:e.h*.5},{w:24,dur:.14,n:5}); K.sparks(e.x,e.y,e.h*.5,{pal:ARC,n:4,sp:[250,800],up:400,life:[.12,.3]}); }; V.orbs.push(o); }
    K.sigil(pl.x,pl.gy,{r:170,dur:.7,in:.2,out:.3,spin:2,pal:ARC,tex:CIRC()}); GFX.light(pl.x,pl.gy,520,ARC.l,.7,.5,{z:100}); }},
  // CHAIN LIGHTNING: one painted arc after another, enemy to enemy
  mg_chain:{fn(id){ let e=nearest(650); if(!e) return false; const d=D(id), n=6+L(id), J=pl.j; face(angTo(e)); quick(); sfx('thunder',.5);
    let px=J&&J.st?J.st[0]:pl.x, py=J&&J.st?J.st[1]:pl.gy-BODY, hit=new Set(), nv=0;
    const jump=(e,k,px,py,s3)=>{ if(!e||k>=n) return; hit.add(e); const ex=e.x, ey=e.y-e.h*.5, t3={x:e.x,y:e.y,z:e.h*.5};
      // the evolved chain forks at every other hop, so one cast can be dozens of hits: the first ones get the full dressing, the rest less and less
      const v=nv++; if(v<14) arc(s3,t3,{pal:k%2?AZV:ARC,tex:'h',dur:.34,body:v<8,w:Math.max(95,Math.hypot(t3.x-s3.x,t3.y-s3.y)*.16)}); if(v<10) K.sparks(e.x,e.y,e.h*.5,{pal:ARC,n:6,sp:[250,900],up:500,life:[.12,.32]});
      if(v<9){ K.art(e.x,e.y,{tex:tx('v3_burst_arcane','v3_xburst'),s:120,z:e.h*.5,lift:0,dur:.24,pal:k%2?AZV:ARC,gain:.85,hold:.2,s0:.5,rot:rand(0,TAU)}); GFX.light(e.x,e.y,620,ARC.l,1,.3,{z:150}); if(k%2===0) scorch(e.x,e.y,{r:110,life:.8}); }
      dmg(e,d,{stun:.3,sx:px,sy:py+BODY}); hitFx(e,C2,1.2); sfx('slash',2,.2);
      const nx=V.en.filter(o=>!o.dead&&!hit.has(o)&&Math.hypot(o.x-e.x,o.y-e.y)<480).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
      after(.06,()=>{ jump(nx[0],k+1,ex,ey,t3); if(EVO(id)&&nx[1]&&k%2===0) jump(nx[1],k+2,ex,ey,t3); }); };
    after(.12,()=>{ const s3={x:px,y:pl.gy,z:Math.max(0,pl.gy-py)}; K.flare(s3.x,s3.y,s3.z,{pal:ARC,s:90,dur:.18,gain:2.6}); jump(e,0,px,py,s3); }); }},
  // FROST NOVA: a painted ring of frost thrown over the floor, a shell of cold, crystals standing where it passed
  mg_nova:{fn(id){ const R=EVO(id)?560:400; if(countIn(R)<3&&!nearest(260)) return false; const d=D(id); raise(); sfx('shatter',.8);
    after(.12,()=>{ const x=pl.x, y=pl.gy, n=EVO(id)?9:6, a0=rand(0,TAU);
      K.art(x,y,{tex:'v3_frost_ring',floor:true,s:R*1.22,dur:1.15,pal:FRO,gain:.9,hold:.55,s0:.3,rot:a0});
      K.shock(x,y,{r:R*1.2,dur:.42,pal:FRO,gain:1,dust:0,painted:0}); K.dome(x,y,{r:R*.8,dur:.36,pal:FRO,gain:.7,hk:.55});
      for(let i=0;i<n;i++){ const b=a0+i/n*TAU, r=R*rand(.62,.9), s=rand(70,120); K.pic(x+Math.cos(b)*r,y+Math.sin(b)*r*FSY,s*.7,{img:'crystal',s,asp:.43,dur:rand(.9,1.3),in:.07,out:.4,tint:[.5,2.3,1.5],edge:'#e8fbff',gain:1.25,rot:Math.cos(b)*.3,delay:.04+r/R*.1}); }
      GFX.light(x,y,R*2.2,FRO.l,1,.5,{z:80}); GFX.ripple(x,y,R*1.3,{life:.4,s:.5}); K.sparks(x,y,40,{pal:FRO,n:18,sp:[R*1.2,R*3],up:500,life:[.2,.5]}); K.dust(x,y,{n:10,r:60,sp:[R*.8,R*1.8],c:'#4a6c84',c3:'#bfe8ff',a:.4});
      trauma=Math.min(1,trauma+.35);
      inCircle(x,y,R,e=>{ dmg(e,d,{kb:.9,stun:.8,slow:2.5,big:true}); hitFx(e,'#9ff7ff',1.2); }); }); }},
  // GRAVITY: a well in the floor that pulls the light and the crowd in, then gives it all back at once
  mg_vortex:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?420:330, pull=EVO(id)?520:360, P=K.PAL.violet; face(angTo(t)); raise(); sfx('rise',.6,.5);
    V.zones.push({x,y,r:R,life:2.5,tick:.12,fx:well(x,y,R,2.6),fn:(e)=>{ e.pull={x,y,s:pull}; if(Math.random()<.4) dmg(e,d,{kb:0,stun:.15}); },
      onTick:z=>{ for(let i=0;i<3;i++){ const a=rand(0,TAU), r=rand(R*.7,R*1.25); GFX.pt({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:rand(0,160),tx:x,ty:y,tz:110,pull:rand(3,5),vx:-Math.sin(a)*700,vy:Math.cos(a)*400,life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.3?'#ffffff':P.s),c2:P.b,L:3}); } },
      onEnd:()=>{ K.burst(x,y,{s:R*.62,pal:P,smoke:1,no:['shock','crack']}); ring1(x,y,R*1.5,{pal:P,dur:.4}); scorch(x,y,{r:R*.9,pal:P,life:2.4}); K.dome(x,y,{r:R*1.05,dur:.4,pal:P,gain:.7}); trauma=Math.min(1,trauma+.4); sfx('boom',1.2,.8);
        inCircle(x,y,R,e=>{ dmg(e,d*(EVO(id)?12:8),{kb:1.6,launch:900,big:true,sx:x,sy:y}); hitFx(e,C1,1.4); }); }}); }},
  // THUNDER FIELD: a ward that walks with her, fenced with lightning, biting whatever steps inside
  mg_field:{fn(id){ if(V.zones.some(z=>z.field)||!nearest(450)) return false; const d=D(id), R=EVO(id)?420:330; raise(); sfx('thunder',.4);
    const v={x:pl.x,y:pl.gy}; let na=0;
    V.zones.push({field:true,follow:true,r:R,life:5,tick:.4,fx:fieldFx(v,R,5),v,h:0,fn:e=>{ dmg(e,d,{kb:.2,stun:.2}); hitFx(e,C2,.9); if(na++<5){ arc({x:v.x,y:v.y,z:BODY*1.7},{x:e.x,y:e.y,z:e.h*.5},{pal:na%2?AZV:ARC,w:30,dur:.2}); K.sparks(e.x,e.y,e.h*.5,{pal:ARC,n:3,sp:[250,700],up:400,life:[.12,.3]}); } },
      onTick:z=>{ na=0; if(EVO(id)){ const T=V.en.filter(e=>!e.dead&&Math.hypot(e.x-z.x,e.y-z.y)<R); const e=T[(Math.random()*T.length)|0]; if(e){ strike(e.x,e.y,{pal:AZV,s:.7}); dmg(e,d*2,{stun:.3}); } }
        for(let i=0;i<2;i++){ const a=rand(0,TAU), b=a+rand(.6,1.4); arc({x:z.x+Math.cos(a)*R,y:z.y+Math.sin(a)*R*FSY,z:16},{x:z.x+Math.cos(b)*R*rand(.3,1),y:z.y+Math.sin(b)*R*FSY*rand(.3,1),z:16},{tex:'h',w:44,dur:.22}); }
        { const a=Math.PI+rand(.2,2.9), px=z.x+Math.cos(a)*R, py=z.y+Math.sin(a)*R*FSY; lbolt(px,py,{pal:AZV,h:rand(380,520),w:120,dur:.26,gain:.7}); }
        GFX.light(z.x,z.y,R*1.7,ARC.l,.5,.3,{z:60}); sfx('thunder',.12); }}); }},
  // STARFALL: violet crystals out of the sky, each with its tail and its closing shadow
  mg_star:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?10:6, d=D(id); raise(); sfx('rise',.8,.5);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x+rand(-40,40), y=e.y+rand(-30,30), hitAt=Math.max(.3,.25+i*.12), fall=Math.min(.42,hitAt);
      mark({x,y},{r:150,dur:hitAt+.05,pal:STA,glow:0});
      comet(x,y,{img:'crystal',asp:.43,s:105,s0:.8,h0:1500,dx:480,dur:fall,delay:hitAt-fall,pal:STA,spin:0,rot:-.3,tail:5,tw:.9,gain:1.5});
      after(hitAt,()=>{ K.burst(x,y,{s:150,pal:STA,no:i%2?['smoke','crack','debris','shock','flash']:['smoke','crack','debris','shock'],dur:.45,gain:.8}); ring1(x,y,330,{pal:STA,dur:.4}); scorch(x,y,{r:180,pal:STA,life:1.6}); K.debris(x,y,{n:4,r:30,sp:[200,600],up:800,size:11,c:'#5a4c7a'}); sfx('boom',.8,.5);
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
// HEAVEN THUNDER: storm cloud rolls in over the top of the field, too wide for the screen. Bolts drop out of it - a few dry ones at the
// edges, then one for every enemy, then faster and closer, walking in on one place. The storm holds its breath; and the whole ceiling
// empties itself down one column onto that place, breaking the floor and throwing everything on it into the air.
function ultThunder(id){ ultStart(id); const Cn=X.cine, x0=pl.x, y0=pl.gy, {hw,hh}=view(), Dm=60000*A.mul(id), P=ARC, m=F.on?mm():null;
  S([['gx03',.12],['gx04',.3],['gx06',2.3],['gx08',.12,{kick:[1.2,-1]}],['gx10',2],['gx13',.8],['gx14',9]]);
  const tb=densest(1400), [bx,by]=X.inView(tb?tb.x:x0,tb?tb.y:y0-hh*.25,.4);
  // the ceiling hangs so that its eye sits at the top edge of the screen; every bolt is as tall as it takes to reach up into the cloud
  const yC=y0-hh*1.02, Hs=clamp(by-yC,hh*.7,hh*1.5), sky0={x:bx,y:by,z:Hs}, hTo=y=>Math.max(650,y-yC-rand(250,700));
  // ---- omen (close on her, something new every 0.2 s): the light leaves, the circle writes itself, cloud starts to roll in, static climbs the staff
  GFX.ambient(.33,.31,.52,3.5); GFX.light(x0,y0,560,P.l,.85,.5,{hold:1.6,z:140});
  const sig=K.sigil(x0,y0,{r:hw*.4,dur:2.3,in:.6,out:.6,spin:-.6,pal:SIL,tex:CIRC(),hole:.26});
  Cn.tilt(.08,4); Cn.zoom(1.45,6); Cn.cam(x0,y0-BODY*1.3,6); SFX.thunder(.35); Cn.drone(46,.3);
  for(let i=0;i<3;i++) after(.05+i*.22,()=>K.shock(x0,y0,{r0:hw*(.9-i*.14),r:50,dur:.36,pal:P,gain:.5,light:0,dust:0,haze:.5,th:.6}));
  for(let i=0;i<40;i++) after(rand(0,.8),()=>{ const a=rand(0,TAU), d=rand(320,820); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,300),tx:x0,ty:y0,tz:BODY*2,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); });
  const sky=ceiling(bx,by,Hs,{r:hw*1.75,dur:5.05,in:1.3,out:.5,delay:.2}); sky.a=.42;
  for(let i=0;i<6;i++) after(.2+i*.12,()=>{ const a=rand(0,TAU), b=a+rand(.6,1.3)*(i%2?1:-1), r=hw*rand(.18,.4); arc({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:14},{x:x0+Math.cos(b)*r,y:y0+Math.sin(b)*r*FSY,z:14},{tex:'h',w:60,dur:.2}); if(i%2===0) Cn.SND.tick(2+Math.random(),.08); });
  after(.4,()=>{ sky.fl=1; GFX.ambient(.42,.39,.66,40); after(.06,()=>GFX.ambient(.32,.3,.52,9)); sfx('thunder',.3); });
  for(let i=0;i<10;i++) after(rand(.2,.8),()=>{ const a=rand(0,TAU), d=rand(120,420); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.7,1.1),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  after(.6,()=>{ const tp=tip(); K.flare(tp.x,tp.y,tp.z,{pal:P,s:110,dur:.3,gain:2.4}); sig.kick(); });
  // ---- the call (0.8 s): a line of light from the staff into the cloud; the camera lets go of her and takes in the sky
  after(.8,()=>{ const tp=tip(); K.beam(tp.x,tp.y,tp.z,bx,by,Hs,{pal:P,w:80,dur:.5}); K.flare(tp.x,tp.y,tp.z,{pal:P,s:150,dur:.3,gain:3}); K.sparks(tp.x,tp.y,tp.z,{pal:P,n:16,sp:[300,900],up:900});
    K.shock(x0,y0,{r:hw*.7,dur:.4,pal:P,gain:.8,dust:8}); sky.fl=1.2; GFX.ambient(.3,.28,.5,4); Cn.tilt(.13,3); Cn.zoom(.78,3.5); Cn.cam(null); Cn.shake(.3); Cn.SND.shing(.6,.4); SFX.thunder(.5); });
  // light sifts down out of the cloud
  for(let i=0;i<56;i++) after(1+i*.06,()=>{ const vz=rand(1500,2400), px=x0+rand(-hw,hw), py=y0+rand(-hh,hh)*.5, h=hTo(py)+300; GFX.pt({x:px,y:py,z:h,vz:-vz,life:h/vz,s:rand(2.5,4.5),m:3,len:.07,c:GFX.rgb(i%3?P.s:'#ffffff'),c2:P.b,L:3,fk:6}); });
  // lightning crawls through the cloud the whole time, faster as the storm builds
  for(let i=0;i<22;i++) after(1+3.3*Math.pow(i/22,.75),()=>{ const a=rand(.2,2.9), b=a+rand(-1,1), r1=hw*rand(.5,1.7), r2=hw*rand(.5,1.7); arc({x:bx+Math.cos(a)*r1,y:by+Math.sin(a)*r1*FSY,z:Hs},{x:bx+Math.cos(b)*r2,y:by+Math.sin(b)*r2*FSY,z:Hs},{tex:'h',dur:.2,pal:i%2?AZV:P}); sky.fl=Math.max(sky.fl,.8); });
  // bolts that land on top of one another are thinned so a crowd is struck by lightning, not by a white wall
  // the cloud lights up from inside where each bolt leaves it
  const done=[], hit=(x,y,i,o={})=>{ const near=done.filter(q=>RT-q.t<.22&&Math.hypot(q.x-x,q.y-y)<230).length, h=clamp(hTo(y),900,2600), zc=Math.max(500,y-yC-rand(380,520)); done.push({x,y,t:RT});
    strike(x,y,{pal:i%5===3?AZV:P,dur:.42,h,gain:(near>1?.5:near?.65:.9)*(o.g||1),r:near?120:175,scar:o.scar||(i%3?1.1:2.2),shock:near?0:i%2}); sky.fl=Math.max(sky.fl,.6);
    if(m) GFX.add(.2,k=>F.quad(m.glowS,x,y,520,520,0,{z:zc,...col(GATE),a:(1-k)*.7,gain:1.3,bgain:1.4})); };
  // ---- three volleys (1.3, 1.9, 2.5 s): two bolts at once, then four, then eight, each louder; the cloud thickens for each and thins again
  const volley=(nb,t)=>after(t,()=>{ const o0=rand(0,1); for(let i=0;i<nb;i++){ const sx=x0+hw*.9*(((i+o0)%nb+.5)/nb*2-1)+rand(-50,50), sy=y0+rand(-hh,hh)*.36; after(rand(0,.05),()=>hit(sx,sy,i*2,{g:.75+nb*.03})); }
    sky.fl=1.3; sky.a=.42+nb*.035; after(.35,()=>{ sky.a=.42; }); sig.kick(); GFX.ambient(.38+nb*.012,.35+nb*.012,.6+nb*.016,40); after(.07,()=>GFX.ambient(.3,.28,.5,9)); sfx('thunder',.25+nb*.05); Cn.shake(.12+nb*.05); });
  volley(2,1.3); volley(4,1.9); volley(8,2.5);
  // ---- the marks: static gathers under every enemy
  const T=onScreen(120).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)).slice(0,32), nT=Math.max(1,T.length);
  after(1.8,()=>Cn.roll(-.03));
  T.forEach((e,i)=>after(1.85+i*(.75/nT),()=>{ if(e.dead) return; crackle(e,{r:150,dur:1.06+i*(.25/nT),pal:P}); e.mark=RT; e.flash=.6; Cn.SND.tick(.8+i*.03,.16); }));
  // ---- release (2.76 s): the staff comes down and every mark is answered, nearest first
  after(2.76,()=>{ sky.a=.55; Cn.roll(.03); Cn.zoom(.72,5); K.shock(x0,y0,{r:hw*1.3,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.4,{life:.45,s:.6}); K.sparks(x0,y0,BODY,{pal:P,n:24,sp:[400,1500],up:700}); K.dust(x0,y0,{n:10,r:60,sp:[300,800]});
    Cn.shake(.7); post.ca=.01; SFX.boom(1.4,.5); Cn.SND.shing(.7,.4); sky.g=1.5; });
  T.forEach((e,i)=>after(2.86+i*(1.0/nT),()=>{ if(e.dead) return; hit(e.x,e.y,i); ultHit(e,Dm*.4,e.x,e.y+200);
    if(i%4===0){ sfx('thunder',.5); Cn.shake(.45); K.debris(e.x,e.y,{n:4,r:30,sp:[200,600],up:900,size:12}); GFX.ambient(.46,.42,.72,40); after(.07,()=>GFX.ambient(.3,.28,.5,9)); } }));
  // the storm is the same size whether the field is full or nearly empty: the rest of it falls on bare stone, spiralling outward
  { const nF=Math.max(6,20-T.length), a0=rand(0,TAU); for(let i=0;i<nF;i++){ const u=(i+.5)/nF, a=a0+i*2.4, r=Math.sqrt(u); after(2.86+u*.98+rand(-.03,.03),()=>hit(x0+Math.cos(a)*r*hw*.9,y0-hh*.08+Math.sin(a)*r*hh*.5,i+1)); } }
  // ---- escalation (3.86 - 4.32 s): twice as fast, heavier, and walking in on the place the column will fall
  for(let i=0;i<18;i++) after(3.86+.46*(i/18),()=>{ const a=i*2.4, r=hw*(1.0-.72*i/18); hit(bx+Math.cos(a)*r,by+Math.sin(a)*r*.75,i,{g:1.05,scar:2.6}); sky.a=.62; if(i%3===0){ Cn.shake(.3+i*.02); sfx('thunder',.4); GFX.ambient(.46,.42,.72,40); after(.05,()=>GFX.ambient(.3,.28,.5,9)); } });
  // ---- the landing is announced (4.05 s): a pool of light and a shadow grow on the floor, a thin shaft feels its way down; the camera goes wide and low
  after(4.05,()=>{ Cn.roll(0); Cn.tilt(.28,4); Cn.cam(bx,by-Hs*.2,6); Cn.zoom(.74,5); Cn.SND.inhale(.5,.6); sky.g=1.9;
    const pool=GFX.light(bx,by,500,JUD.l,.2,.2,{hold:.5,z:120}); GFX.add(.5,k=>{ pool.a=.2+.8*k; pool.r=500+500*k; sky.eye=k*k*1.3; if(m){ F.quad(m.m.dark,bx,by,hw*(.2+.3*k),hw*(.2+.3*k),0,{a:.5*k}); F.ring(m.m.shL,bx,by,hw*(.9-.5*k),hw*(.94-.5*k),{...col(JUD),a:k,gain:1.6}); } });
    K.beam(bx,by,Hs,bx,by,0,{pal:JUD,w:26,dur:.5,gain:.7});
    for(let i=0;i<36;i++) after(rand(0,.45),()=>{ const a=rand(0,TAU), d=rand(100,hw*.6); GFX.pt({x:bx+Math.cos(a)*d,y:by+Math.sin(a)*d*FSY,z:rand(0,80),tx:bx,ty:by,tz:Hs*.6,pull:rand(3,5),life:rand(.4,.6),s:rand(3,6),m:3,len:.06,vz:rand(300,900),c:GFX.rgb(Math.random()<.4?'#ffffff':JUD.s),c2:JUD.b,L:3}); });
    for(let i=0;i<3;i++) after(.08+i*.1,()=>{ arc(sky0,{x:bx+rand(-140,140),y:by,z:Hs*(1-(i+1)/3.4)},{tex:'h',w:110,dur:.12,pal:JUD}); sky.fl=.7; }); });
  // ---- the held breath (4.35 s): everything dims and is drawn in
  after(4.35,()=>{ GFX.gain=.55; GFX.ambient(.3,.3,.34,40); sky.g=.6; duck(.12,.3); Cn.zoom(.8,12); K.shock(bx,by,{r0:hw*1.3,r:90,dur:.2,pal:JUD,gain:.6,light:0,dust:0,painted:0,th:.7}); });
  // ---- contact (4.55 s): column, front, flying stone, broken floor and everyone on it thrown into the air, all in the same frame
  after(4.55,()=>{ GFX.gain=1.25; hitstop=Math.max(hitstop,.12); Cn.shake(1.6); post.ca=.012; Cn.zoom(.7,14); sky.g=2.4; sky.eye=1.5; sky.fl=1.5; sky.a=.75; GFX.add(.45,k=>{ sky.eye=1.5*(1-k); sky.g=2.4-1.4*k; sky.a=.75-.45*k; });
    forkCol(bx,by,Hs*1.5,{pal:JUD,dur:.6,w:Math.min(Hs*.36,hw*.72)});
    if(F.ready('v3_flip_arcane')){ K.flip(bx,by,{tex:'v3_flip_arcane',s:hw*.55,lift:.45,dur:.55,pal:JUD,gain:.9}); K.flip(bx,by,{tex:'v3_flip_shock',floor:true,s:hw*1.1,dur:.5,pal:AZV,gain:.9,rot:rand(0,TAU)}); }
    else K.art(bx,by,{tex:tx('v3_burst_arcane','v3_xburst'),s:hw*.6,lift:.3,dur:.3,pal:JUD,gain:.85,hold:.25,s0:.6});
    K.shock(bx,by,{r:hw*1.5,dur:.45,pal:AZV,gain:1.1}); GFX.ripple(bx,by,hw*1.8,{life:.5,s:.9});
    K.upheave(bx,by,{r:hw*.42,n:7,s:240,a0:Math.PI*1.08,a1:Math.PI*1.92,pal:JUD,dur:1.5,rock:'#2c2648'});
    K.crack(bx,by,{alt:1,r:hw*.95,ry:1.2,pal:P,life:4.3,grow:1.1,gain:.4}); scorch(bx,by,{r:hw*1.05,pal:P,life:4,grow:.9,gain:.75});
    K.debris(bx,by,{n:28,r:160,sp:[500,1700],up:2100,size0:9,size:36}); K.dust(bx,by,{n:18,r:120,sp:[500,1400],a:.5}); K.sparks(bx,by,40,{pal:JUD,n:44,sp:[500,2200],up:1800,life:[.3,.9]});
    launch(bx,by,hw*1.3);
    GFX.light(bx,by,hw*1.6,JUD.l,1.15,.7,{z:260,hold:.2}); GFX.ambient(.42,.42,.7,40); after(.14,()=>GFX.ambient(.34,.32,.5,5));
    // the field takes it: lesser bolts walk outward from the column; it jumps from body to body before they fall
    for(let i=0;i<8;i++){ const a=i/8*TAU+rand(-.3,.3), r=hw*(.62+.09*i+rand(0,.12)); after(.08+i*.035,()=>{ hit(bx+Math.cos(a)*r,by+Math.sin(a)*r*.8,i,{g:.8,scar:2.6}); if(i%3===0) Cn.shake(.5); }); }
    const B=onScreen(200).slice(0,10); for(let i=0;i<B.length;i++){ const a=i?B[i-1]:{x:bx,y:by,h:BODY*2}, b=B[i]; if(Math.hypot(a.x-b.x,a.y-b.y)>700||Math.hypot(b.x-bx,b.y-by)>1300) continue; arc({x:a.x,y:a.y,z:a.h*.5},{x:b.x,y:b.y,z:b.h*.5},{pal:i%2?AZV:P,tex:'h',dur:.3,delay:i*.012}); }
    after(.28,()=>Cn.sweep(bx,by,Dm,{speed:3600})); SFX.thunder(1.3); Cn.SND.hit(1); });
  // ---- aftermath, in layers that last different times: floor arcs (short), low dark smoke and embers (medium), the spreading break and the burn (long)
  for(let i=0;i<12;i++) after(4.85+i*.09,()=>{ const a=rand(0,TAU), r=rand(80,560), x=bx+Math.cos(a)*r, y=by+Math.sin(a)*r*FSY; arc({x,y,z:10},{x:x+rand(-240,240),y:y+rand(-100,100),z:10},{tex:'h',w:50,dur:.16}); if(i%4===0) GFX.light(x,y,300,P.l,.5,.15); if(i%3===0) Cn.SND.tick(2+Math.random(),.08); });
  after(4.9,()=>{ K.embers(bx,by,hw*.7,{pal:P,n:40,life:2,up:400}); for(let i=0;i<3;i++) K.smoke(bx+(i-1)*rand(240,360),by-rand(0,140),{s:rand(340,460),dur:rand(1.3,1.7),a:.55,delay:i*.1,rise:200}); });
  after(5.2,()=>{ GFX.ambient(.8,.78,.9,1.8); Cn.tilt(0,2.5); Cn.zoom(.82,3); });
  after(5.6,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(6.25,()=>{ GFX.gain=1.25; ultStop(); }); }

// METEOR FALL: she looks up - it is already coming. No circle marks the place: its shadow does, a spot that grows for three seconds while
// embers drift down and smaller stones walk the field. Then it crosses the whole sky on its tail of fire; the field holds its breath;
// and where it lands the floor stands up in a ring of rock, everything on it is thrown clear, and a pit is left glowing.
function ultMeteor(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.4), x0=pl.x, y0=pl.gy, P=MET, Rm=620, m=F.on?mm():null;
  S([['gy03',.14],['gy05',.5],['gy06',1.6],['gy07',1.3],['gy09',.14,{kick:[1.2,-1]}],['gy10',.6],['gy13',.9],['gy14',9]]);
  // ---- omen (close on her, something new every 0.2 s): warm dusk, heat climbing the staff, the first embers, a spot of shadow on the floor
  GFX.ambient(.44,.32,.42,3); GFX.light(x0,y0,520,P.l,.6,.5,{hold:1,z:140});
  Cn.tilt(.08,4); Cn.zoom(1.4,6); Cn.cam(x0,y0-BODY*1.4,6); SFX.rumble(1.6); Cn.drone(40,.3);
  for(let i=0;i<32;i++) after(rand(0,.75),()=>{ const a=rand(0,TAU), d=rand(320,820); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,300),tx:x0,ty:y0,tz:BODY*2,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.6?P.s:ARC.s),c2:P.b,L:3}); });
  for(let i=0;i<3;i++) after(.1+i*.2,()=>{ const tp=tip(); K.flare(tp.x,tp.y,tp.z,{pal:P,s:70+i*40,dur:.28,gain:2+i*.4}); K.shock(x0,y0,{r0:hw*(.7-i*.12),r:50,dur:.3,pal:P,gain:.45,light:0,dust:0,haze:.5,th:.6}); });
  // embers drift down over the whole field, thicker as it nears
  for(let i=0;i<64;i++) after(.2+3.2*Math.pow(i/64,.7),()=>GFX.pt({x:cx+rand(-hw,hw)*1.1,y:cy+rand(-hh,hh)*.6,z:rand(900,1700),vx:-rand(150,420),vz:-rand(700,1300),life:1.3,s:rand(3,6),m:3,len:.06,c:GFX.rgb(Math.random()<.3?'#ffffff':P.s),c2:P.b,L:3,fk:5}));
  // the shadow: a spot at 0.2 s, the size of the stone when it lands; warm light pools round it, pebbles lift, the dust starts to move
  if(m) GFX.add(3.3,k=>{ const r=70+Rm*1.25*k*k; F.quad(m.m.dark,cx,cy,r*1.1,r*1.1,0,{a:Math.min(.92,.35+.6*k)}); },.2);
  const heat=GFX.light(cx,cy,700,P.l,.05,.3,{hold:3.5,z:200});
  GFX.add(3.1,k=>{ heat.a=.1+1.05*k*k; heat.r=700+800*k; if(k>.45) Cn.shake((k-.45)*.8); },.4);
  for(let i=0;i<14;i++) after(rand(.3,2.4),()=>{ const a=rand(0,TAU), d=rand(120,520); GFX.pt({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.8,1.3),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  for(let i=0;i<5;i++) after(.6+i*.5,()=>K.dust(cx,cy,{n:8,r:200+i*40,sp:[250,700],a:.3,c:'#4a3630'}));
  // the floor there answers once a second: a painted shock pulse, each wider and hotter than the last, and the air above it shimmering
  for(let i=0;i<4;i++) after(.35+i*.8,()=>{ K.flip(cx,cy,{tex:'v3_flip_shock',floor:true,s:Rm*(.55+i*.22),dur:.6,pal:P,gain:.55+i*.12,rot:rand(0,TAU)}); GFX.ripple(cx,cy,Rm*(.8+i*.25),{life:.6,s:.35+i*.12}); Cn.SND.tick(.5+i*.1,.12); });
  // ---- release (0.8 s): the camera lets go of her and takes in the field
  after(.8,()=>{ Cn.tilt(.15,3); Cn.zoom(.66,3.5); Cn.cam(mix(x0,cx,.6),mix(y0,cy,.6)-hh*.2,3.5); GFX.ambient(.4,.28,.36,4); SFX.fire(1.7,.7); Cn.SND.inhale(1.65,.7); K.shock(x0,y0,{r:hw*.6,dur:.4,pal:P,gain:.7,dust:6}); });
  // grit first (1.0 - 1.6 s), then stones (2.1 - 3.1 s): each bigger than the last, each a burst of the same fire the great one will make
  // (the colour pass is queued first so that the smoke pass, queued after it, is drawn underneath)
  const blast=(x,y,s,o={})=>{ if(!F.ready('v3_flip_blast')){ K.art(x,y,{tex:tx('v3_burst_fire','fx3_burst'),s,lift:.34,dur:.3,pal:P,gain:.7,hold:.3,s0:.5}); return; } K.flip(x,y,{tex:'v3_flip_blast',s,lift:.62,dur:o.dur||.7,pal:P,gain:o.gain||.9,nb:o.nb,delay:o.delay}); if(o.smoke!==0) K.flip(x,y,{tex:'v3_flip_blast',smoke:true,nb:1,c:'#0c0808',c2:'#2c1e1a',s:s*1.08,lift:.62,dur:(o.dur||.7)*1.25,delay:o.delay}); };
  const pop=(x,y,s)=>{ blast(x,y,s*1.25,{nb:s<200?1:0,smoke:s<200?0:1,dur:.6}); K.sparks(x,y,30,{pal:P,n:Math.round(s/22),sp:[s*1.5,s*5],up:s*3.4,life:[.3,.7]}); K.debris(x,y,{n:Math.round(s/40),r:s*.3,sp:[s,s*3.4],up:s*4,size0:6,size:20,c:'#5a4038'}); GFX.light(x,y,s*4,P.l,1,.4,{z:150}); };
  for(let i=0;i<4;i++){ const x=cx+rand(-hw,hw)*.85, y=cy+rand(-hh,hh)*.5, at=1.0+i*.2; comet(x,y,{s:60,s0:.8,h0:1700,dx:680,dur:.45,delay:at-.45,pal:P,spin:5,tail:6}); after(at,()=>{ pop(x,y,90); scorch(x,y,{r:120,pal:P,life:1.6}); sfx('boom',1.4,.25); }); }
  for(let i=0;i<7;i++){ const x=cx+rand(-hw,hw)*.9, y=cy+rand(-hh,hh)*.7, at=2.12+i*.17;
    comet(x,y,{s:270,s0:.7,h0:1900,dx:760,dur:.56,delay:at-.56,pal:P,spin:4,tail:6,heat:1});
    after(at,()=>{ pop(x,y,330); K.flip(x,y,{tex:'v3_flip_shock',floor:true,s:480,dur:.45,pal:P,gain:.8,nb:1,rot:rand(0,TAU)}); sfx('boom',.8,.4); Cn.shake(.45);
      crater(x,y,{r:rand(270,350),life:3,lite:1}); if(i%3===0) K.crack(x,y,{alt:1,r:rand(300,400),pal:P,life:2.6,grow:.6});
      inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); }); }
  // ---- the stone: one and a half seconds across the whole sky (the shadow under it has been growing since the start)
  comet(cx,cy,{s:Rm,s0:.5,h0:hh*2.5,dx:hw*1.5,dur:1.6,delay:1.9,ease:k=>k*k*k,tail:7,tw:1.1,spin:.6,pal:P,big:true,shadow:0});
  after(3.0,()=>{ Cn.tilt(.27,5); Cn.cam(cx,cy-BODY*2.5,8); Cn.zoom(.62,6); });
  // ---- the held breath (3.3 s): everything dims and is drawn in
  after(3.3,()=>{ GFX.gain=.58; GFX.ambient(.34,.25,.3,30); duck(.12,.3); Cn.zoom(.68,12); K.shock(cx,cy,{r0:hw*1.4,r:110,dur:.2,pal:P,gain:.6,light:0,dust:0,painted:0,th:.7}); });
  // ---- contact (3.5 s): fire twice the size of the stone, the front, the floor standing up, everything thrown clear - all in the same frame
  after(3.5,()=>{ GFX.gain=1.25; heat.hold=0; hitstop=Math.max(hitstop,.12); Cn.shake(1.7); post.ca=.012; Cn.zoom(.58,14);
    // the fire is flipbooks, so its shape changes every frame and rolls into dark smoke instead of crumbling: one great blast, two lesser ones
    // a beat later, a painted shock on the floor; under them, for the first frames only, the painted burst laid flat at twice the stone's size
    K.art(cx,cy,{tex:tx('v3_burst_fire','fx3_burst'),floor:true,s:Rm*2,dur:.2,pal:P,gain:.6,hold:.6,s0:.6,rot:rand(0,TAU)});
    blast(cx,cy,Rm*1.5,{dur:.85,gain:.95}); blast(cx-Rm*.75,cy+60,Rm*.85,{dur:.7,delay:.06,gain:.85}); blast(cx+Rm*.7,cy-90,Rm*.9,{dur:.75,delay:.09,gain:.85});
    K.flip(cx,cy,{tex:'v3_flip_shock',floor:true,s:hw*1.25,dur:.55,pal:P,gain:.95,rot:rand(0,TAU)});
    K.shock(cx,cy,{r:hw*1.5,dur:.45,pal:P,gain:1}); GFX.ripple(cx,cy,hw*1.9,{life:.5,s:1});
    K.sparks(cx,cy,60,{pal:P,n:56,sp:[700,2800],up:2000,life:[.3,.9]}); K.debris(cx,cy,{n:30,r:220,sp:[600,1900],up:2100,size0:9,size:34,c:'#5a4038'}); K.dust(cx,cy,{n:20,r:160,sp:[600,1600],a:.5,c:'#4a3630'});
    // the floor: rock stands up round the far side of the pit (never between her and the camera), fissures run out of it and keep running
    K.upheave(cx,cy,{r:Rm*.92,n:7,s:320,a0:Math.PI*1.04,a1:Math.PI*1.96,pal:P,dur:1.8,rock:'#3a2c28',tex:'v3_break_fire'});
    K.upheave(cx,cy,{r:Rm*1.0,n:2,s:180,a0:-.2,a1:.3,pal:P,dur:1.5,rock:'#3a2c28',tex:'v3_break_fire',delay:.03}); K.upheave(cx,cy,{r:Rm*1.0,n:2,s:180,a0:Math.PI-.3,a1:Math.PI+.2,pal:P,dur:1.5,rock:'#3a2c28',tex:'v3_break_fire',delay:.03});
    crater(cx,cy,{r:hw*.8,life:5.2,rim:1}); K.crack(cx,cy,{alt:1,r:hw*1.15,ry:1.15,pal:P,life:5,grow:1.3});
    dustRing(cx,cy,hw*1.45,{dur:1.3}); chunks(cx,cy,{n:5,s0:70,s:140});
    launch(cx,cy,hw*1.4);
    GFX.light(cx,cy,hw*1.6,P.l,1.1,.8,{z:260,hold:.2}); GFX.ambient(.54,.42,.38,40); after(.14,()=>GFX.ambient(.44,.32,.36,5));
    after(.3,()=>Cn.sweep(cx,cy,Dm,{speed:3000,push:1.3})); SFX.shatter(1); Cn.SND.hit(1);
    // the ground keeps going off further and further out: low bursts hugging the floor, no standing fires
    for(let r=1;r<=2;r++) after(r*.16,()=>{ const n=2+r*2, rr=r*540; for(let i=0;i<n;i++){ const a=i/n*TAU+r+rand(-.25,.25), d=rr*rand(.85,1.15), x=cx+Math.cos(a)*d, y=cy+Math.sin(a)*d*.75; blast(x,y,rand(150,210),{nb:1,smoke:0,dur:.45,gain:.6}); K.sparks(x,y,30,{pal:P,n:7,sp:[300,1100],up:1100,life:[.3,.7]}); if(i%2) K.debris(x,y,{n:4,r:30,sp:[200,700],up:1000,size:14,c:'#5a4038'}); } sfx('boom',1.2,.6); Cn.shake(.6); }); });
  // ---- aftermath, in layers that last different times: low wide smoke and embers (medium), rubble (medium), the glowing pit and the spreading fissures (long)
  after(3.95,()=>{ for(let i=0;i<4;i++) K.smoke(cx+(i-1.5)*rand(220,300),cy-rand(0,150),{s:rand(420,560),dur:rand(1.4,1.8),a:.6,delay:i*.07,rise:170}); K.embers(cx,cy,hw*.8,{pal:P,n:50,life:2.2,up:420}); });
  after(4.45,()=>{ Cn.tilt(0,2.5); Cn.zoom(.8,3); });
  after(4.7,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(5.35,()=>{ GFX.gain=1.25; ultStop(); }); }

X.reg('mage',{sk,order,basic:{fn:basic,cd:()=>.85*(1-.05*(L('mg_basic')-1))},skills:SKILL,ults:{mg_ult1:ultThunder,mg_ult2:ultMeteor}});
})();
