// 참광 survival - SHAMAN skill set (top-down, all automatic). Jade spirits, seals and falling stone. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js) plus a few local pieces (LM materials, card, stone, spike, soul, palmFall, gif).
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,sfx,view,onScreen,ultStart,ultStop,ultHit,heal}=X;
const K=K3, F=FX3, P='jade', PJ=K3.PAL.jade, C={cA:PJ.d,cB:PJ.b,cC:PJ.h,cM:PJ.m}, {sat,mix,eo3,eo5}=K3;
const SP={d:'#02281c',b:'#10b07c',m:'#5ef0c0',h:'#8dffd6',l:'#30ffb0',s:'#b8ffe0'};
// the seals and talismans are written in gold; what they call down is jade
const SG={d:'#2a1400',b:'#c88a14',m:'#ffc84a',h:'#ffe9a0',l:'#ffc040',s:'#ffe9a0'};
const GD={d:'#3a1c00',b:'#f0a818',m:'#ffe27a',h:'#fff6d8',l:'#ffc040',s:'#ffe9a0'};
// broken floor lit by jade: stone first, the colour only on its edges
const ST={d:'#050308',b:'#2f8a6c',m:'#6fd8b0',h:'#bff0dc',l:'#30ffb0',s:'#b8ffe0'};
const HEAL={d:'#04280c',b:'#3cf07a',m:'#c8ffa0',h:'#f2ffe8',l:'#55ff9a',s:'#c8ffd0'};
const C1='#3dffb0';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const fling=b=>S([['gb03',.04],['gb04',.05],['gb05',.06,{kick:[-.9,.7]}],['gb06',.05,{kick:[1.4,-1]}],['gb07',.08],['gb09',.07],['gb12',.05]],b);
const raise=()=>S([['gx04',.08,{kick:[-.8,.6]}],['gx07',.25],['gx11',.1,{kick:[-1,.8]}],['gx12',.08,{kick:[2,-1.6]}],['gx13',.25],['gx14',.1]]);
const pray=()=>S([['gy02',.1],['gy04',.35],['gy06',.08,{kick:[-.8,.6]}],['gy08',.3],['gy11',.1,{kick:[1.6,-1.2]}],['gy12',.2],['gy14',.1]]);
if(F&&F.on) for(const t of ['v3_boulder','v3_spikes','v3_palmprint','v3_skygate','v3_burst_lotus','v3_shock_thick','v3_fissure_b','v3_crater','v3_flip_lotus','v3_flip_shock','v3_flip_smoke']) F.img(t);
// art that may not have arrived yet: use it when it is loaded, otherwise the stand-in
const TX=(n,fb)=>F.ready(n)?n:fb;
const SEAL=()=>F.ready('v3_circ_shaman')?'v3_circ_shaman':'fx_circle_seal';

// ============================================================ local kit (candidates for vfx3.js)
// materials: painted art pushed through the jade ramp
let LM_=null;
function LM(){ if(LM_) return LM_; const m=F.mat, b=K.mats();
  LM_={
    // the painted boulder: dark rock, jade-lit faces, veins of spirit light where the painting is hot
    // the painted boulder (grey mask) through a stone-to-jade ramp: dark rock, lit faces, veins of spirit light in the cracks
    rock:m({tex:'v3_boulder',nz:'cells',n1:[2.6,2.6,0,0],nk:0,pw:.6,ero:.05,soft:.07,cA:'#030807',cB:'#3a5750',cM:'#3dffb0',cC:'#d8fff0',rk:[.8,1.06],gain:1.5,op:1}),
    // the painted crater as a dark decal under whatever has landed, its cracks still lit for a moment
    crater:m({tex:'v3_crater',nk:0,pw:.75,ero:.16,soft:.3,cA:'#010302',cB:'#0c1614',cM:'#1c6a52',cC:'#8dffd6',rk:[.6,1.12],gain:1.2,bgain:1,op:1,layer:'g'}),
    // a small sealing mark on the floor where something is about to land
    mark:m({...b.sig,tex:'fx_circle_seal'}),
    // the tip of the painted crystal as a spike of jade
    // the painted cluster of stone spikes, lit faces turning jade
    spike:m({tex:'v3_spikes',nz:'billow',n1:[2,2,0,-.2],nk:0,pw:.8,ero:.07,soft:.1,fd:[.05,.05,.07,0],cA:'#020d0a',cB:'#3b5f56',cM:'#3fd0a0',cC:'#c8ffe8',rk:[.8,1.25],gain:1.3,op:1}),
    // one talisman banner cut out of the sealing circle drawing, and the dark paper behind it
    charm:m({tex:'v3_circ_shaman',uvT:[.118,.224,.441,.719],nk:0,ero:.15,soft:.3,cA:GD.d,cB:GD.b,cC:GD.h,rk:[.6,1.5],gain:1.2,bgain:1.05}),
    back:m({nz:'fbm',n1:[2,2,0,.3],nk:.35,ero:.02,soft:.2,fd:[.14,.14,.07,.07],cA:'#120600',cB:'#2a0c04',cC:'#5a1408',rk:[.5,1],op:1}),
    fire:m({...b.art,tex:'fx3_fire',layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.09,mdist:1,rk:[.55,1.05]}),
    palm:m({kind:2,tex:'palm',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#5ed8bc',cC:PJ.b,gain:.9,op:1}),
    // the hand's print: the painting as a mask, filled with veins of light that cool
    print:m({tex:'v3_palmprint',nz:'fbm',n1:[3,3,.02,.03],n2:[2,2,.01,0],dist:.012,nk:.2,ero:.1,soft:.25,cA:PJ.d,cB:PJ.b,cM:PJ.m,cC:PJ.h,rk:[.55,1.08],gain:1.7,bgain:1,layer:'g'}),
    printD:m({tex:'v3_palmprint',nk:0,pw:.9,ero:.1,soft:.25,cA:'#020504',cB:'#0c1815',cM:'#1c3830',cC:'#42665a',rk:[.5,1.1],gain:1,op:1,layer:'g'}),
    // the opened sky: storm cloud in dark jade, the light pouring through its centre in gold
    gate:m({tex:'v3_skygate',nz:'billow',n1:[1.5,1.5,.02,.02],n2:[1.2,1.2,.03,-.02],dist:.03,nk:.15,ero:.05,soft:.3,cA:'#010605',cB:'#0a5c46',cM:'#d8a23a',cC:'#fff0c0',rk:[.66,1.12],gain:1.1,bgain:.75,op:.8,ord:-1}),
    king:m({kind:2,tex:'deity',nz:'fbm',n1:[1.1,1.1,0,.06],n2:[1.6,1.6,0,.0873],dist:.014,mdist:1,cB:'#b0f0d4',cC:PJ.b,gain:1,op:1,ord:-5}),
  }; return LM_; }
// CARD: a paper talisman standing in the air (call every frame it is alive)
function card(x,y,z,s,rot,a=1,g=1){ const m=LM(); F.bill(m.back,x,y,z,s*.5,s,rot,{a:a*.85}); F.bill(m.charm,x,y,z,s*.52,s,rot,{a,gain:1.2*g}); }
// POP: a small jade hit (needles, sparks, a breath of light on the floor)
function pop(x,y,s=1,z=BODY*.5){ K.art(x,y,{tex:'v3_xburst',s:95*s,z:z-70*s,dur:.2,pal:P,gain:.9,hold:.2,s0:.5}); K.sparks(x,y,z,{pal:P,n:Math.round(6*s),sp:[250,800],up:300,life:[.15,.35]}); GFX.light(x,y,280*s,PJ.l,.6,.25); }
// STONE: the painted boulder falling out of the sky along a slanted path, dragging a ribbon of spirit light, its shadow and a ring closing under it.
//  o: {s (half size), h0, dur, vx (sideways start offset), delay, stay (seconds it stays in the ground)}; returns a handle {crumble()}
function stone(x,y,o={}){ const s=o.s||110, h0=o.h0||2200, dur=o.dur||.42, vx=o.vx??-h0*.22, r0=rand(-.5,.5), r1=o.rot??rand(-.38,.38), sx=rand(.85,1.15), sd=rand(0,9), d0=o.delay||0, uvT=Math.random()<.5?[-1,1,1,0]:[1,1,0,0], crot=rand(0,TAU);
  const h={x,y,s,t1:-1,fd:o.fd||.4,dead:false,crumble(){ if(h.t1>=0||h.dead) return; h.t1=RT; const big=s>300, n=Math.round(clamp(s/16,3,26)*(GFX.QK||1));
      // it breaks up: chips come off its whole height and fall, dust rolls out from its foot
      for(let i=0;i<n;i++){ const a=rand(0,TAU), v=rand(60,big?520:260); GFX.pt({x:x+rand(-.6,.6)*s,y:y+rand(-8,8),z:rand(.2,1.7)*s,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(-80,260),g:2400,drag:.3,life:rand(.9,1.6),s:rand(big?10:5,big?34:14),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4c6a60'),c2:'#0a0f0e',shadow:true,bounce:.35,fk:5,L:2}); }
      K.dust(x,y,{n:big?16:3,r:s*.5,sp:[s*.8,s*2.2],a:.45,c:'#2c3835'}); }};
  if(!F.on) return h; const m=LM(), b=K.mats(), lead=o.lead??.3;
  // the mark writes itself a moment before the stone is seen
  if(lead>0) GFX.add(lead+dur,(k,t)=>{ const i=sat(t/(lead+dur*.5)), e=sat((t-lead)/dur);
    F.quad(m.mark,x,y,s*1.8,s*1.8,t*1.6+sd,{cA:PJ.d,cB:PJ.b,cC:SP.h,a:.35+.65*e,gain:1.1+e,rv:[i*1.5,.25,0,.1]}); },Math.max(0,d0-lead));
  // the fall: a thick rock smeared along its path, a tail of dust behind it, and only then the thread of spirit light
  const at=kk=>{ const ee=kk*kk; return [x+vx*(1-ee),h0*(1-ee)+s*.96]; };
  GFX.add(dur,k=>{ const [px,z]=at(k), rot=mix(r0,r1,k), a=sat(k*(o.emerge?6:40)), pts=[], dp=[];
    for(let i=4;i>=0;i--){ const [qx,qz]=at(Math.max(0,k-i*.1)); pts.push({x:qx,y,z:qz+s*.3,w:s*.4*(1-i*.2)}); dp.push({x:qx,y,z:qz+s*.15,w:s*1.05*(1-i*.13)}); }
    if(!F.low&&!o.plain) F.ribbon(b.trB,dp,{cA:'#060a09',cB:'#26332f',cM:'#3c4c46',cC:'#5a6a64',op:1,gain:1,bgain:1,a:.75*a,t0:sd});
    F.ribbon(b.trB,pts,{...C,gain:1.6,a:.7*a,t0:sd});
    if(!F.low&&!o.plain){ const [gx,gz]=at(Math.max(0,k-.08)); F.bill(m.rock,gx,y,gz,s*sx*1.04,s*1.14,rot,{a:.4*a,uvT,t0:sd}); }
    F.bill(m.rock,px,y,z,s*sx,s*1.1,rot,{a,uvT,t0:sd});
    if(o.charm) F.bill(m.charm,px,y,z+s*.15,s*.2,s*.38,rot+.25,{a:sat(k*6),gain:1.4}); },d0);
  // landed: one squashed frame, then it sits in its own small crater
  if(o.stay) GFX.add(o.stay,(k,t)=>{ if(h.dead) return; const f=h.t1<0?0:sat((RT-h.t1)/h.fd); if(f>=1){ h.dead=true; return; }
    const sq=1+.34*Math.exp(-t*22), hh=s*(2-sq);
    F.quad(m.crater,x,y,s*1.75,s*1.75,crot,{a:sat(t/.04)*(1-f),gain:1.2*Math.exp(-t*2.2)+.25});
    F.bill(m.rock,x+Math.sin(r1)*hh*.5,y,hh*.78,s*sx*sq,hh,r1,{ero:.05+f*.85,nk:Math.min(1,f*2.5)*.9,gain:1.5+(o.hot?1.3*sat(t/.9):0),uvT,fd:[0,0,.13,0],ord:-2,t0:sd});
    if(o.charm&&t<.45){ const q=t/.45; F.bill(m.charm,x+Math.sin(r1)*hh*.5,y,hh*.9,s*.2,s*.38,r1+.25,{a:1-q*q,gain:1.4+q*3,ero:.15+q*.6,ord:-1.5}); } },d0+dur);
  return h; }
// KING: the painted deity as a stack of strips so the lower body can thin into mist and the field shows through it: full above the waist,
// alpha and erosion ramping down to the hem. The noise runs unbroken across the strips, and it pushes the cloth about harder the lower it is;
// a shear makes him lean and a squeeze makes him turn.  o: {z0 (height of the hem), a, ero, gain, lean, turn}
function kingDraw(x,y,s,o){ const m=LM(), N=F.low?5:9, asp=.84*(1-.16*(o.turn||0)), lean=o.lean||0, yaw=o.yaw||0, a0=o.a??.92, e0=o.ero??-.05, W1=.12, K0=1.1/W1, W2=1.6/K0;
  // yaw turns the painted plane about the vertical: in this camera one shoulder comes forward and down, the other goes back and up
  F.bill(m.king,x+lean*s*1.5,y,o.z0+s*1.5,1,1,0,{M:F.xf({sx:s*asp,sz:s*.5,ry:lean*.8,rz:yaw}),a:a0,ero:e0,soft:.12,gain:o.gain,dist:.014,uvT:[1,.5,0,.5],n1:[1.1,.55,0,W1],n2:[1.6,.8,0,W2],time:RT+K0*.5});
  for(let j=0;j<N;j++){ const u=(j+.5)/N, v0=j/(2*N);
    F.bill(m.king,x+lean*s*u,y,o.z0+s*u,1,1,0,{M:F.xf({sx:s*asp,sz:s/(2*N),rz:yaw}),a:a0*mix(.1,1,Math.pow(u,1.25)),ero:Math.max(e0,(1-u)*.42-.05),soft:.16,gain:o.gain,dist:mix(.05,.016,u),uvT:[1,.5/N,0,v0],n1:[1.1,.55/N,0,W1],n2:[1.6,.8/N,0,W2],time:RT+K0*v0}); } }
// SPIKE: a jade shard punching up out of the floor, holding, then sinking back as it burns out
function spike(x,y,o={}){ if(!F.on) return; const m=LM(), b=K.mats(), s=o.s||170, dur=o.dur||.7, sd=rand(0,9), uvT=o.flip?[-1,1,1,0]:[1,1,0,0];
  GFX.add(dur,(k,t)=>{ const up=eo5(sat(t/.08)), f=sat((k-.55)/.45), hh=s*(.25+.75*up)*(1-f*.35), a=1-f*f;
    F.quad(b.dark,x,y,s*.75,s*.75,0,{a:.6*a}); F.quad(b.glowG,x,y,s*.8,s*.8,0,{...C,a:.7*a,gain:1.2});
    F.bill(m.spike,x,y,hh*.97,s*.7,hh,0,{a:sat(t/.04),ero:.07+f*.8,nk:f*.8,uvT,t0:sd}); },o.delay||0); }
// SOUL: a spirit flame hanging in the air at (x,y,z) (call every frame)
function soul(x,y,z,s,rot,sd,a=1){ const m=LM(), b=K.mats(); F.quad(b.glowG,x,y,s*.9,s*.9,0,{...C,a:.55*a,gain:1.1});
  F.bill(m.fire,x,y,z+s*.55,s*.58,s,rot,{...C,a,gain:2.6,ero:.12,nk:.4,t0:sd,pm:[4,.5,.004,0]});
  F.bill(b.glowO,x,y,z,s*.3,s*.3,0,{...C,a:.9*a,gain:2.4}); }
// PALM: the spirit hand comes down out of the sky facing us, tips forward and slaps flat onto the floor; it presses, burns away, and leaves its print.
//  o: {s (half length), fall, hold, out, h0, ox (sideways start offset), rz (turn on the floor), delay, scar (seconds the print glows)}
function palmFall(x,y,o={}){ if(!F.on) return; const m=LM(), b=K.mats(), Ln=o.s||420, Wd=Ln*.53, fall=o.fall??.36, hold=o.hold??.14, out=o.out??.34, h0=o.h0||1700, ox=o.ox||0, oxp=o.oxp||3, pre=o.pre||0, sd=rand(0,9), d0=o.delay||0, rz=o.rz||0, fr=o.from, arc=o.arc||0, s0=o.s0||1;
  // where the hand is at q (0..1 of the strike): out of the sky, or from a shoulder out along an arc, growing as it comes
  const at=q=>{ if(fr){ const e=q*q; return [mix(fr[0],x,e),mix(fr[1],y,e),mix(fr[2],0,e)+Math.sin(Math.PI*Math.pow(q,.8))*arc+12,mix(s0,1,eo3(q))]; } return [x+ox*(1-Math.pow(q,oxp)),y,h0*(1-q*q*q)+12,1]; };
  // its shadow is on the floor before the hand arrives, and grows as it comes
  GFX.add(pre+fall+hold+out,(k,t)=>{ const q=sat(t/(pre+fall)), f=sat((t-pre-fall-hold)/out); F.quad(b.dark,x,y,Wd*(.7+1.2*q),Ln*(.7+.8*q),rz,{a:(.12+.6*q*q)*(1-f)}); },Math.max(0,d0-pre));
  GFX.add(fall+hold+out,(k,t)=>{ const q=sat(t/fall), [px,py,z,sc]=at(q), tip=sat((q-.5)/.5), lean=-1.05*(1-tip*tip), f=sat((t-fall-hold)/out), sqz=t>fall?Math.exp(-(t-fall)*18):0, pr=(1+.14*(1-q))*sc, pw=pr*(1+.2*sqz), pl_=pr*(1-.1*sqz);
    if(fr){ const af=1-sat((t-fall)/.14); if(af>0){ const pts=[]; for(let i=0;i<=6;i++){ const [ax,ay,az]=at(q*i/6); pts.push({x:ax,y:ay,z:az,w:mix(o.aw||70,Wd*sc*.85,i/6)}); }
        // the arm: a sleeve of light from the shoulder to the wrist along the way the hand came
        F.ribbon(b.trB,pts,{cA:PJ.d,cB:'#0a8a62',cM:PJ.b,cC:PJ.m,gain:1,a:.7*af,t0:sd,ord:-1.3}); } }
    else if(q<1) F.ribbon(b.trB,[{x:px,y,z:z+Ln*3.2,w:Wd*.2},{x:px,y,z:z+Ln*2,w:Wd*.6},{x:px,y,z:z+Ln*.3,w:Wd*.8}],{...C,gain:1.5,a:.55*q,t0:sd});
    // a dark edge under it, the hand, and the lit lotus in its palm
    if(!F.low) F.quad(m.palm,px,py,1,1,0,{z:z-6,M:F.xfw({sx:Wd*pw*1.08,sy:Ln*pl_*1.06,rx:lean,rz}),cB:'#00120c',a:.85*(1-f),ero:f*1.05-.05,soft:.08,ord:-1.2,t0:sd});
    F.quad(m.palm,px,py,1,1,0,{z,M:F.xfw({sx:Wd*pw,sy:Ln*pl_,rx:lean,rz}),a:.97,ero:f*1.05-.05,soft:.08,ord:-1.1,t0:sd});
    // the heel of the hand catches the light from below
    if(!F.low){ const hp=K.at(F.xfw({sx:Wd*pw,sy:Ln*pl_,rx:lean,rz}),px,py,z,0,.55,0); F.quad(b.glowO,hp[0],hp[1],1,1,0,{z:hp[2]+3,M:F.xfw({sx:Wd*pw*.8,sy:Ln*pl_*.36,rx:lean,rz}),...C,a:.2*(1-f),gain:1,ord:-1.05}); }
    F.quad(b.glowO,px,py,1,1,0,{z:z+4,M:F.xfw({sx:Wd*pw*.62,sy:Wd*pw*.62,rx:lean,rz}),cA:GD.d,cB:GD.b,cM:GD.m,cC:GD.h,a:(.5+.4*q)*(1-f),gain:1.5,ord:-1}); },d0);
  // what it leaves: the floor pressed in and dark in the shape of the hand; the light in it is gone within a second
  GFX.add(o.scar||3,(k,t)=>{ const i=sat(t/.08), heat=sat(1-t/.8);
    F.quad(m.printD,x,y,Ln*.72,Ln*1.07,rz,{a:.8*i*sat((1-k)/.35)});
    if(heat>0) F.quad(m.print,x,y,Ln*.7,Ln*1.05,rz,{a:heat*i,gain:1.6*(.25+.75*heat*heat),ero:.1+(1-heat)*.5,t0:sd}); },d0+fall); }
// GIF: one of the old painted effect loops drawn as a lit sprite in the effect layer (so it blooms and sits with the kit pieces)
const GS=new Map();
function gif(name,t,x,y,z,hw,rot,fy=1,a=1){ const M=VFX[name]; if(!M) return false; const f=M.f[Math.floor(t*1000/M.ms)%M.n]; if(!f||!f.ok) return false;
  let st=GS.get(f.im); if(!st){ st=GFX.st(0,'alpha',{t:f.im,uv01:true,L:1}); GS.set(f.im,st); }
  GFX.bill(st,x,y,z,hw,hw*M.h/M.w*fy,rot,[1.25,1.25,1.25],a,0,0,1,0); return true; }

// a talisman thrown from the hand that homes in on a target
function talisman(e,d,o={}){ const a=angTo(e)+rand(-.6,.6);
  const p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.6,d,r:o.r??70,home:e,turn:9,c:C1,h:BODY*1.1,pw:1.1,...o};
  if(!p.onHit) p.onHit=(e,p)=>pop(p.x,p.y,o.big?1.4:.75,p.h);
  const s=o.big?78:44, sd=rand(0,9), b=K.mats();
  if(F.on) GFX.add(p.life+.05,()=>{ if(p.life<=0) return; const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, rot=Math.atan2(uy,ux)+Math.PI/2, tl=o.big?260:190;
    F.ribbon(b.trB,[{x:p.x-ux*tl,y:p.y-uy*tl,z:p.h,w:s*.1},{x:p.x-ux*tl*.5,y:p.y-uy*tl*.5,z:p.h,w:s*.42},{x:p.x,y:p.y,z:p.h,w:s*.5}],{...C,gain:2,a:.8,t0:sd});
    F.quad(b.glowG,p.x,p.y,s*1.5,s*1.5,0,{...C,a:.5,gain:1});
    card(p.x,p.y,p.h,s,rot);
    if(Math.random()<.35) GFX.pt({x:p.x,y:p.y,z:p.h+rand(-20,20),vx:rand(-60,60),vy:rand(-40,40),vz:rand(20,120),g:-30,drag:.6,life:rand(.3,.6),s:rand(2.5,5),m:8,c:GFX.rgb(PJ.s),fade:'in',L:3}); });
  V.pj.push(p); return p; }

const sk={
  sh_basic:{cls:'shaman',type:'basic',name:'탈리스만',lv:1,desc:'적을 쫓아가는 부적 두 장을 던진다. 강화할수록 부적이 늘어난다.'},
  sh_bomb:{cls:'shaman',type:'skill',name:'카드 봄',lv:1,cd:4,dmg:3000,desc:'적이 몰린 곳에 큰 부적을 붙여 잠시 뒤 터뜨린다.',evo:'폭발이 두 번 일어난다.'},
  sh_spike:{cls:'shaman',type:'skill',name:'스톤 스파이크',lv:1,cd:5,dmg:2400,desc:'땅에서 바위 가시를 일직선으로 솟구치게 해 적을 띄운다.',evo:'가시 줄이 세 갈래가 된다.'},
  sh_wisp:{cls:'shaman',type:'skill',name:'스피릿 오브',lv:2,cd:9,dmg:800,desc:'영혼 불꽃 4개가 5초 동안 주위를 돌며 닿는 적을 태운다.',evo:'영혼 불꽃이 6개가 된다.'},
  sh_heal:{cls:'shaman',type:'skill',name:'힐링 서클',lv:3,cd:14,dmg:600,desc:'3초 동안 체력을 25% 회복하는 결계를 펼치고, 안의 적에게 피해를 준다.',evo:'회복량이 40%가 된다.'},
  sh_rock:{cls:'shaman',type:'skill',name:'록 폴',lv:5,cd:8,dmg:3600,desc:'적 머리 위로 큰 바위 4개를 떨어뜨린다.',evo:'바위가 7개가 된다.'},
  sh_seal:{cls:'shaman',type:'skill',name:'바인드',lv:6,cd:10,dmg:1500,desc:'적이 몰린 곳에 봉인진을 펼쳐 안의 적을 2.5초 동안 묶는다.',evo:'봉인진이 커지고 묶인 적이 계속 피해를 받는다.'},
  sh_wolf:{cls:'shaman',type:'skill',name:'스피릿 울프',lv:8,cd:10,dmg:2000,desc:'영혼 늑대 두 마리를 풀어 적을 꿰뚫으며 달리게 한다.',evo:'늑대가 네 마리가 된다.'},
  sh_palm:{cls:'shaman',type:'skill',name:'스피릿 핸드',lv:10,cd:11,dmg:7000,desc:'하늘에서 거대한 영혼의 손바닥을 내려쳐 적 무리를 짓누른다.',evo:'손바닥이 두 번 내려친다.'},
  sh_ult1:{cls:'shaman',type:'ult',name:'스톤 레인',lv:3,desc:'궁극기. 하늘을 열어 화면 전체에 바위를 쏟아붓는다.'},
  sh_ult2:{cls:'shaman',type:'ult',name:'스피릿 킹',lv:12,desc:'궁극기. 거대한 영혼의 손이 연달아 내려쳐 화면을 쓸어버린다.'},
};
const order=Object.keys(sk);

function basic(){ const e=nearest(850); if(!e) return false; face(angTo(e)); fling(true); const n=2+Math.floor((L('sh_basic')-1)/2), d=1100*A.mul('sh_basic');
  after(.2,()=>{ const T=V.en.filter(o=>!o.dead&&Math.hypot(o.x-pl.x,o.y-pl.gy)<900).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.gy)-Math.hypot(b.x-pl.x,b.y-pl.gy));
    for(let k=0;k<n;k++) after(k*.06,()=>talisman(T[k%Math.max(1,T.length)]||e,d)); sfx('whoosh',1.6,.45); });
  return true; }

const SKILL={
  // CARD BOMB: a big talisman sticks where it lands and burns down like a fuse inside a closing ring, then goes up
  sh_bomb:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); fling();
    after(.2,()=>talisman(t,0,{big:true,r:60,d:0,home:t,life:1.2,onHit:(e,p)=>{}, onEnd:p=>{ const bx=p.x, by=p.y, fuse=EVO(id)?.8:.45;
      const boom=k=>{ K.burst(bx,by,{s:k?190:235,pal:P,scar:3,no:['shock']}); K.shock(bx,by,{r:330,dur:.4,pal:P,light:0}); GFX.ripple(bx,by,380,{life:.4,s:.6}); trauma=Math.min(1,trauma+.35); sfx('boom',1.1,.8);
        inCircle(bx,by,260,o=>{ dmg(o,d*(k?.6:1),{kb:1.4,big:true,sx:bx,sy:by}); hitFx(o,C1,1.3); }); };
      if(F.on) GFX.add(fuse,(k,t)=>{ const pu=.5+.5*Math.sin(t*(18+k*30)); card(bx,by,BODY*.55,70*(1+.08*pu),Math.sin(t*40)*.05*k,1,1+k*1.2*pu); F.bill(K.mats().glowO,bx,by,BODY*.55,60+90*k,60+90*k,0,{...C,a:.35+.5*k*pu,gain:2.2}); });
      K.shock(bx,by,{r0:300,r:50,dur:.42,pal:P,gain:.6,light:0,dust:0,haze:.3,th:.6}); GFX.light(bx,by,420,PJ.l,.7,.2,{hold:fuse,z:90,flick:.3});
      after(.45,()=>boom(0)); if(EVO(id)) after(.8,()=>boom(1)); }})); }},
  // STONE SPIKE: the floor splits along a line and jade shards punch up through it one after another
  sh_spike:{fn(id){ const e=nearest(700); if(!e) return false; const a0=angTo(e), d=D(id), dirs=EVO(id)?[-.45,0,.45]:[0]; face(a0); raise();
    for(const da of dirs){ const a=a0+da, cx=Math.cos(a), cy=Math.sin(a); K.gash(pl.x+cx*80,pl.gy+cy*80,pl.x+cx*820,pl.gy+cy*820,{pal:P,w:70,life:2.2,grow:.5,delay:.2});
      for(let i=0;i<6;i++) after(.25+i*.07,()=>{ const r=150+i*120, x=pl.x+cx*r, y=pl.gy+cy*r;
        spike(x,y,{s:rand(190,230)+i*18,flip:i%2});
        if(i%2===0&&!da) K.art(x,y,{tex:'fx3_shock',floor:true,s:230,dur:.45,pal:SP,gain:.7,hold:.3,s0:.3,rot:rand(0,TAU)});
        K.debris(x,y,{n:3,r:30,sp:[150,500],up:900,c:'#4c6a60'}); K.dust(x,y,{n:2,r:30,sp:[120,320],a:.4}); K.sparks(x,y,20,{pal:P,n:5,sp:[200,700],up:1100,life:[.2,.45]}); GFX.light(x,y,420,PJ.l,.8,.3,{z:80}); sfx('shatter',.4);
        inCircle(x,y,110,o=>{ dmg(o,d,{kb:.4,launch:1100,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.1); }); }); } }},
  // SPIRIT ORB: soul flames circling him, each with its pool of light on the floor
  sh_wisp:{fn(id){ if(V.orbs.some(o=>o.wisp)||!nearest(700)) return false; const n=EVO(id)?6:4, d=D(id); pray(); sfx('bell',.6);
    K.shock(pl.x,pl.gy,{r:340,dur:.4,pal:P,gain:.7,dust:6}); const lamp=GFX.light(pl.x,pl.gy,620,PJ.l,.5,.4,{hold:5,z:120,flick:.25});
    for(let i=0;i<n;i++){ const o={wisp:true,a:i/n*TAU,life:5,d,R:290,w:3.6,hitR:80,c:C1,h:BODY*.8,v:{x:pl.x,y:pl.gy-BODY}}, sd=rand(0,9); V.orbs.push(o);
      if(F.on) GFX.add(5.1,(k,t)=>{ if((o.t||0)>=o.life||o.x==null) return; if(!i){ lamp.x=pl.x; lamp.y=pl.gy; } const a=sat(t/.25)*sat((o.life-o.t)/.3);
        soul(o.x,o.y,BODY*.45,150,-Math.sin(o.a)*.38,sd,a);
        if(Math.random()<.3) GFX.pt({x:o.x,y:o.y,z:BODY*.6+rand(-30,60),vx:rand(-50,50),vy:rand(-30,30),vz:rand(60,200),g:-40,drag:.5,life:rand(.4,.8),s:rand(3,6),m:8,c:GFX.rgb(Math.random()<.3?PJ.h:PJ.s),fade:'in',L:3}); }); } }},
  // HEALING CIRCLE: a soft green seal that walks with him; every pulse lifts light out of it
  sh_heal:{fn(id){ if(G.hp>A.maxHp()*.7&&countIn(380)<6) return false; const d=D(id), k=EVO(id)?.4:.25; pray(); sfx('choir',.6); stamp('힐',{x:.5,y:.2,size:.08,life:.7,c:C1});
    const sg=K.sigil(pl.x,pl.gy,{r:400,dur:3,in:.35,out:.45,spin:.5,pal:HEAL,tex:'fx_circle_seal'}), lamp=GFX.light(pl.x,pl.gy,700,HEAL.l,.55,.5,{hold:2.6,z:100});
    GFX.add(3,()=>{ sg.x=lamp.x=pl.x; sg.y=lamp.y=pl.gy; }); K.shock(pl.x,pl.gy,{r:420,dur:.45,pal:HEAL,gain:.8,light:0,dust:0});
    V.zones.push({follow:true,r:380,life:3,tick:.5,fx:null,fn:e=>{ dmg(e,d,{kb:.5}); hitFx(e,C1,.9); },onTick:()=>{ heal(k/6);
      sg.kick(); K.shock(pl.x,pl.gy,{r:400,dur:.45,pal:HEAL,gain:.5,light:0,dust:0,haze:0}); K.embers(pl.x,pl.gy,330,{pal:HEAL,n:12,life:1.3,up:520}); K.sparks(pl.x,pl.gy,10,{pal:HEAL,n:6,sp:[60,260],up:900,g:300,life:[.3,.6]}); }}); }},
  // ROCK FALL: jade-veined boulders out of the sky onto their marks
  sh_rock:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?7:4, d=D(id); raise(); sfx('rumble',.8);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x, y=e.y, at=.3+i*.14, hitAt=at;
      stone(x,y,{s:165,h0:1900,dur:.3,delay:hitAt-.3,stay:.9,fd:.3}).t1=RT+hitAt+.55;
      after(hitAt,()=>{ K.burst(x,y,{s:150,pal:P,no:['smoke','shock','crack'],dur:.45}); K.art(x,y,{tex:TX('v3_shock_thick','fx3_shock'),floor:true,s:420,dur:.42,pal:SP,gain:.8,hold:.3,s0:.3,rot:rand(0,TAU)}); K.dust(x,y,{n:6,r:60,sp:[200,560],a:.45,c:'#2c3835'}); K.debris(x,y,{n:8,r:40,sp:[220,760],up:1200,size0:5,size:20,c:'#4c6a60'}); trauma=Math.min(1,trauma+.2); sfx('boom',1,.6);
        inCircle(x,y,200,o=>{ dmg(o,d,{kb:1.1,launch:500,big:true,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); }); }},
  // BIND: the sealing circle writes itself under the crowd and six talismans stand guard on its rim
  sh_seal:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?380:300; face(angTo(t)); raise(); sfx('bell',.9);
    const sg=K.sigil(x,y,{r:R*1.08,dur:2.6,in:.3,out:.4,spin:.2,pal:SP,gain:.95,hole:.1,tex:SEAL()}); for(let i=1;i<5;i++) after(i*.5,()=>sg.kick()); K.shock(x,y,{r0:R*1.7,r:R*.5,dur:.34,pal:P,gain:.4,light:0,dust:0,thick:0}); GFX.light(x,y,R*2.2,PJ.l,.5,.4,{hold:2.2,z:80});
    if(F.on) GFX.add(2.6,(k,t)=>{ const dn=eo5(sat(t/.22)), out=sat((2.6-t)/.3); for(let i=0;i<6;i++){ const a=i/6*TAU+.5, cx=x+Math.cos(a)*R*.94, cy=y+Math.sin(a)*R*.94*FSY; card(cx,cy,mix(900,62,dn)+Math.sin(t*4+i)*6,54,0,out*sat(t/.1),1+.5*Math.sin(t*7+i)); } });
    for(let i=0;i<6;i++){ const a=i/6*TAU+.5; K.sparks(x+Math.cos(a)*R*.94,y+Math.sin(a)*R*.94*FSY,10,{pal:P,n:3,sp:[150,450],up:500,life:[.15,.35]}); }
    V.zones.push({x,y,r:R,life:2.5,tick:EVO(id)?.3:2.6,fx:null,fn:e=>{ dmg(e,d*(EVO(id)?.4:1),{kb:0,stun:.4}); },onEnd:()=>{ K.shock(x,y,{r:R*1.3,dur:.35,pal:P,gain:.6,light:0,dust:0,haze:0}); }});
    inCircle(x,y,R,o=>{ dmg(o,d,{kb:0,stun:2.5,big:true}); hitFx(o,C1,.6); }); }},
  // SPIRIT WOLF: the painted wolves run as lit sprites, dragging ribbons of light and kicking the dust up
  sh_wolf:{fn(id){ const e=nearest(900); if(!e) return false; const d=D(id), n=EVO(id)?4:2; face(angTo(e)); pray(); sfx('roar',.6,.5);
    for(let k=0;k<n;k++) after(.25+k*.12,()=>{ const a=angTo(e)+(k-(n-1)/2)*.5, p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.8,d,r:100,hits:new Set(),home:e,turn:3,c:C1,h:BODY*.4,pw:1.2}, sd=rand(0,9), b=K.mats();
      K.flare(pl.x,pl.gy,BODY*.6,{pal:P,s:100,dur:.2,gain:1}); K.dust(pl.x,pl.gy,{n:3,dir:a+Math.PI,spread:.7,sp:[150,400],a:.35}); const lamp=GFX.light(p.x,p.y,460,PJ.l,.6,.3,{hold:1.8,z:60});
      if(F.on) GFX.add(1.85,(q,t)=>{ if(p.life<=0){ lamp.hold=0; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp; lamp.x=p.x; lamp.y=p.y;
        F.ribbon(b.trB,[{x:p.x-ux*520,y:p.y-uy*520,z:p.h,w:10},{x:p.x-ux*300,y:p.y-uy*300,z:p.h,w:50},{x:p.x-ux*60,y:p.y-uy*60,z:p.h,w:74}],{...C,gain:1.5,a:.7*sat(t/.3),t0:sd});
        if(!gif('fx_shaman_wolf',t+sd,p.x,p.y,p.h+40,230,Math.atan2(uy,ux),ux<0?-1:1,sat(t/.22))) F.bill(b.glowO,p.x,p.y,p.h,90,90,0,{...C,gain:2.6});
        if(Math.random()<.25) K.dust(p.x-ux*80,p.y-uy*80,{n:1,dir:Math.atan2(uy,ux)+Math.PI,spread:.6,sp:[100,300],a:.3,s:.7}); });
      V.pj.push(p); }); }},
  // SPIRIT HAND: the hand slaps flat onto the crowd and leaves its print burning in the floor
  sh_palm:{fn(id){ const t=densest(560); if(!t) return false; const d=D(id), [x,y]=X.inView(t.x,t.y,.38); face(angTo(t)); pray(); sfx('rise',.7,.6);
    const slam=(k,at)=>{ const hitAt=at;
      K.shock(x,y,{r0:560,r:140,dur:.34,pal:P,gain:.6,light:0,dust:0,haze:.3,th:.6,delay:Math.max(0,at-.5)}); palmFall(x,y,{s:430,delay:hitAt-.34,fall:.34,h0:1700,pre:.16,rz:k?.3:-.2,scar:3});
      after(hitAt,()=>{ slamFx(x,y,.8); K.crack(x,y,{alt:1,r:450,pal:P,life:3,grow:.1,gain:.5}); trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
        inCircle(x,y,400,o=>{ dmg(o,d*(k?.6:1),{kb:1.6,big:true,stun:.6,sx:x,sy:y}); hitFx(o,C1,1.4); }); }); };
    slam(0,.5); if(EVO(id)) slam(1,1.15); }},
};
// what a palm does to the floor it lands on (k = scale)
function slamFx(x,y,k=1,o={}){ if(!o.quiet){ K.flip(x,y,{tex:'v3_flip_lotus',s:300*k,dur:.75,pal:P,gain:.9,lift:.7,delay:.06}); if(!F.ready('v3_flip_lotus')) K.art(x,y,{tex:'v3_xburst',s:480*k,z:-60*k,dur:.3,pal:P,gain:.85,hold:.2,s0:.5}); }
  if(F.ready('v3_flip_shock')) K.flip(x,y,{tex:'v3_flip_shock',floor:true,s:820*k,dur:.5,pal:SP,gain:.8,s0:.35,rot:rand(0,TAU)}); else K.art(x,y,{tex:TX('v3_shock_thick','fx3_shock'),floor:true,s:860*k,dur:.6,pal:SP,gain:.85,hold:.3,s0:.3,rot:rand(0,TAU)});
  GFX.ripple(x,y,1000*k,{life:.45,s:.7}); puffs(x,y,300*k,3,260*k);
  K.debris(x,y,{n:Math.round(14*k),r:260*k,sp:[250,1000],up:1400,size0:8,size:26,c:'#4c6a60'}); K.dust(x,y,{n:Math.round(10*k),r:300*k,sp:[400,1100],a:.45,c:'#2c3835'});
  K.sparks(x,y,40,{pal:P,n:Math.round(22*k),sp:[400,1700],up:1300,life:[.3,.8]}); if(o.light!==0) GFX.light(x,y,Math.min(1500*k,view().hw*1.6),PJ.l,Math.min(1.2,1.05*k),.5,{z:220}); }
// PUFFS: painted dust rolling up round a landing (flipbook: the cloud itself changes shape as it rises)
function puffs(x,y,r,n,s,o={}){ for(let i=0;i<n;i++){ const a=(i+rand(.1,.9))/n*TAU; K.flip(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,{tex:'v3_flip_smoke',smoke:true,nb:1,c:o.c||'#0d1816',c2:o.c2||'#4a6a60',s:s*rand(.8,1.2),dur:rand(.8,1.15),lift:.75,rise:s*.25,vx:Math.cos(a)*s*.3,delay:(o.delay||0)+i*.02}); } }

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow
// LOTUS: the gold lotus of light opening on the floor (the one peak of each ultimate); the old needle star stands in if the painting is missing
function lotus(x,y,s,layer){ if(F.ready('v3_burst_lotus')) K.art(x,y,{tex:'v3_burst_lotus',floor:true,layer,s,dur:.38,pal:GD,gain:.7,hold:.6,s0:.3,rot:rand(0,TAU)}); else K.art(x,y,{tex:'v3_xburst',s:s*.7,z:-90,dur:.4,pal:GD,gain:.8,hold:.2,s0:.5});
  // and the flower itself opening above it: the painted flipbook, two layers so it stays crisp at this size
  K.flip(x,y,{tex:'v3_flip_lotus',s:Math.min(760,s*.8),dur:.95,pal:GD,gain:.85,lift:.72}); K.flip(x,y,{tex:'v3_flip_lotus',s:Math.min(400,s*.42),dur:.7,pal:GD,gain:1.1,lift:.9,delay:.08,nb:1}); }
// everything standing near a landing is thrown up and outward a moment before the damage reaches it
function fling2(x,y,R){ for(const e of onScreen(300)){ if(e.dead||e.d.heavy) continue; const dx=e.x-x, dy=e.y-y, d=Math.hypot(dx,dy)||1; if(d>R) continue; const k=1-d/R*.5; e.vz=Math.max(e.vz,rand(900,1600)*k); e.kx+=dx/d*rand(300,700)*k; e.ky+=dy/d*rand(300,700)*k; e.stun=Math.max(e.stun,.8); } }
// STONE RAIN: a bell; the sealing circle writes itself thin across the floor and his eight talismans fly out to the eight directions and plant
// themselves. They throw light into the sky and it tears open over the top of the field. The stones come down sector by sector, each one called by
// the talisman of its direction and carried by a charm of its own. Then the mountain hangs in the open sky with the eight talismans holding it: they
// burn off one by one, it drops, and it does not land - it shatters. What is left is the crater, the thrown slabs and a seal burnt into the floor.
function ultStones(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, R=hw*.9, stuck=[], ring=[], g0=GFX.gain;
  S([['gx04',.12,{kick:[-.8,.6]}],['gx07',1.6],['gx11',.12,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',2.6],['gx14',9]]);
  // ---- the hits (same count, places and times as ever; only their order follows the eight directions round the circle)
  const sec=(x,y)=>Math.floor((((Math.atan2((y-y0)/FSY,x-x0)+Math.PI/2)%TAU+TAU)%TAU)/(TAU/8))%8;
  const T=onScreen(100).sort(()=>Math.random()-.5).slice(0,22), pts=T.map(e=>[e.x,e.y]); while(pts.length<22) pts.push([x0+rand(-hw,hw)*.9,y0+rand(-hh,hh)*.85]);
  pts.sort((p,q)=>sec(p[0],p[1])-sec(q[0],q[1]));
  let at=2.0, gap=.22; const times=pts.map(()=>{ const t=at; at+=gap; gap=Math.max(.055,gap*.86); return t; });
  const tc=at+.05, mx=x0, my=y0-hh*.2, lead=tc+.72, BS=900, Hh=560, tF=lead-.2, tB=i=>tc+.3+i*.042, gx=x0, gy=y0, gz=2250, GR=1500;
  // ---- omen: close on him; the circle writes itself, the talismans circle once and fly out to their posts
  GFX.ambient(.5,.58,.56,3.5); const spot=GFX.light(x0,y0,620,PJ.l,.8,.6,{hold:9,z:150});
  Cn.zoom(1.42); Cn.tilt(.08,3); Cn.cam(x0,y0-BODY,5); SFX.bell(); Cn.SND.gong(.8); SFX.rumble(1.7);
  const sig=K.sigil(x0,y0,{r:140,dur:12,in:1.2,out:.5,spin:.3,pal:SG,gain:.7,hole:.16,tex:'fx_circle_seal'}); sig.a=.4;
  GFX.add(1.3,k=>{ sig.r=mix(140,R,eo3(k)); }); after(1.3,()=>{ sig.r=R; });
  for(let i=0;i<10;i++) after(i*.15,()=>Cn.shake(.12));
  const pst=i=>{ const a=i/8*TAU-Math.PI/2+TAU/16; return [x0+Math.cos(a)*R*.86,y0+Math.sin(a)*R*.86*FSY]; }, tOut=i=>.8+i*.06, pulse=new Array(8).fill(-9);
  // the mountain's height above its mark at time T (it hangs, drops a notch each time a talisman burns, then falls)
  const mz=T_=>{ const nb=clamp(Math.floor((T_-tB(0))/.042)+1,0,8), q=sat((T_-tF)/.2); return (Hh-nb*24)*(1-q*q); };
  if(F.on) GFX.add(lead+.1,(k,t)=>{ for(let i=0;i<8;i++){ const [bx,by]=pst(i), to=tOut(i); let cx,cy,cz,rot=0,a=sat(t/.25),g=1,s=46;
        if(t<to){ const rr=mix(90,210,eo3(sat(t/.5))), an=i/8*TAU+t*3.4; cx=x0+Math.cos(an)*rr; cy=y0+Math.sin(an)*rr*FSY; cz=BODY*1.1+Math.sin(t*5+i)*18; rot=Math.cos(an)*.3; }
        else if(t<tc){ const q=eo3(sat((t-to)/.3)), an=i/8*TAU+to*3.4; cx=mix(x0+Math.cos(an)*210,bx,q); cy=mix(y0+Math.sin(an)*210*FSY,by,q); cz=mix(BODY*1.1,96,q)+Math.sin(Math.PI*q)*260+Math.sin(t*3+i)*5; s=mix(46,84,q); g=1+1.6*Math.exp(-(RT-pulse[i])*5)+(t>1.5&&t<1.9?1:0); rot=Math.sin(t*2+i)*.04; }
        else { if(t>tB(i)+.1) continue; const q=eo3(sat((t-tc)/.26)), an=i/8*TAU, hx=mx+Math.cos(an)*BS*.62, hz=mz(t)+BS*(1+Math.sin(an)*.55); cx=mix(bx,hx,q); cy=mix(by,my,q); cz=mix(96,hz,q); s=mix(84,BS*.15,q); const bq=sat((t-tB(i))/.1); a=1-bq; g=1.3+bq*4; rot=Math.cos(an)*.5*q; }
        F.bill(LM().charm,cx,cy,cz,s*.52,s,rot,{a,gain:1.2*g}); if(t<to) F.bill(LM().back,cx,cy,cz,s*.5,s,rot,{a:a*.85,ord:-.1}); } });
  for(let i=0;i<8;i++) after(tOut(i)+.3,()=>{ const [bx,by]=pst(i); pulse[i]=RT; K.sparks(bx,by,90,{pal:GD,n:6,sp:[150,600],up:700,life:[.2,.45]}); K.dust(bx,by,{n:2,r:20,sp:[100,260],a:.35}); GFX.light(bx,by,360,GD.l,.6,.3,{z:90}); Cn.SND.tick(1+i*.06,.25); });
  after(.8,()=>{ Cn.zoom(1.02); });
  for(let i=0;i<24;i++) after(rand(.1,1.6),()=>{ GFX.pt({x:x0+rand(-hw,hw)*.85,y:y0+rand(-hh,hh)*.5,z:2,vz:rand(140,340),g:-80,life:rand(.8,1.4),s:rand(5,13),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#5c6a66'),c2:'#0a0f0e',shadow:true,fk:4,L:2}); });
  // ---- release: the eight posts throw their light up and the sky is open
  after(1.82,()=>{ spot.hold=0; spot.life=.3; for(let i=0;i<8;i++){ const [bx,by]=pst(i); K.beam(bx,by,150,mix(bx,gx,.6),by,3600,{w:44,dur:.5,pal:GD,gain:.6}); pulse[i]=RT; }
    K.beam(x0,y0,BODY*1.7,x0,y0,3800,{w:150,dur:.85,pal:P,gain:.7}); K.flare(x0,y0,BODY*1.9,{pal:P,s:220,dur:.35,gain:2.2}); sig.a=.3; for(let q=1;q<=6;q++) after(q*.08,()=>{ sig.r=mix(R,R*.5,eo3(q/6)); sig.a=mix(.3,.22,q/6); }); K.shock(x0,y0,{r:hw*1.3,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.5,{life:.45,s:.6});
    K.sparks(x0,y0,BODY,{pal:P,n:30,sp:[400,1500],up:1700}); K.dust(x0,y0,{n:12,r:80,sp:[400,1000],c:'#2c3835'}); K.debris(x0,y0,{n:8,r:120,sp:[250,800],up:900,c:'#4c6a60'});
    GFX.ambient(.46,.52,.52,5); Cn.shake(.7); post.ca=.01; SFX.boom(1.4,.5); Cn.SND.shing(.7,.4); Cn.SND.gong(.7); Cn.zoom(.68); Cn.tilt(.21,4); Cn.cam(null); });
  // ---- the sky tears open over the top of the field, turns slowly, and closes behind the mountain
  const sky={open:1.82,close:99};
  if(F.on){ const m=LM(); GFX.add(9,(k,t)=>{ const i=sat((t-sky.open)/.6), c=sat((t-sky.close)/.5); if(i<=0||c>=1) return; const pu=.85+.15*Math.sin(t*5), rr=GR*(.8+.2*eo3(i))*(1-c*.25);
      F.quad(m.gate,gx,gy,rr,rr,t*(.22+c*2)+c*c*2,{z:gz,a:(1-c*c)*sat(i*2),gain:.9*pu,ero:.05+c*.6,rv:[.05+i*1.5,.3,0,.1]}); }); }
  const lampG=GFX.light(gx,gy-500,hw*1.3,GD.l,.0,.5,{hold:9,z:400}); after(1.82,()=>{ lampG.a=.4; });
  // ---- the rain: direction by direction; the post of that direction calls each stone, and a charm rides it down onto its mark
  pts.forEach(([x,y],i)=>{ const hitAt=times[i], k8=sec(x,y), px=gx+rand(-750,750), py=gy-gz+rand(60,560), s=rand(125,195);
    stuck.push(stone(x,y,{s,h0:Math.max(900,y-py),dur:.38,delay:hitAt-.38,vx:px-x,emerge:1,charm:1,stay:9}));
    after(hitAt-.38,()=>{ pulse[k8]=RT; });
    after(hitAt,()=>{ K.flip(x+rand(-30,30),y+16,{tex:'v3_flip_smoke',smoke:true,nb:1,c:'#0d1816',c2:'#4a6a60',s:s*1.5,dur:.9,lift:.75,rise:s*.4});
      if(s>160&&F.ready('v3_flip_shock')) K.flip(x,y,{tex:'v3_flip_shock',floor:true,nb:1,s:s*3,dur:.45,pal:SP,gain:.8,s0:.35,rot:rand(0,TAU)}); else K.art(x,y,{tex:TX('v3_shock_thick','fx3_shock'),floor:true,s:s*2.6,dur:.4,pal:SP,gain:.75,hold:.3,s0:.3,rot:rand(0,TAU)});
      K.debris(x,y,{n:7,r:50,sp:[220,760],up:1200,size0:5,size:20,c:'#4c6a60'}); K.dust(x,y,{n:6,r:60,sp:[200,560],a:.45,c:'#2c3835'}); K.sparks(x,y,30,{pal:i%2?P:GD,n:8,sp:[300,1100],up:900}); GFX.light(x,y,850,PJ.l,.7,.35,{z:180});
      SFX.boom(.9+Math.random()*.3,.55); Cn.shake(.38+i*.012); hitstop=Math.max(hitstop,.018); inCircle(x,y,230,o=>ultHit(o,Dm*.4,x,y)); }); });
  // ---- the mountain: announced by its shadow and a pool of light, held in the sky by the eight talismans, let go one by one
  let bind=null;
  after(tc,()=>{ GFX.ambient(.46,.48,.5,5); Cn.zoom(.58); Cn.tilt(.28,4); Cn.SND.inhale(.7,.7); duck(.2,.6); for(let q=1;q<=4;q++) after(q*.07,()=>{ sig.a=.22*(1-q/4); if(q===4) sig.dead=true; }); Cn.cam(mx,my-520,5);
    bind=K.sigil(mx,my,{r:BS*.8,dur:lead-tc+2.1,in:.4,out:.8,spin:1.1,pal:SP,tex:'fx_circle_seal',gain:.7,hole:.1}); bind.a=.75; GFX.light(mx,my,900,PJ.l,.7,.3,{hold:.72,z:200}); });
  for(let i=0;i<8;i++) after(tB(i),()=>{ const an=i/8*TAU, hx=mx+Math.cos(an)*BS*.62, hz=mz(tB(i))+BS*(1+Math.sin(an)*.55); K.sparks(hx,my,hz,{pal:GD,n:7,sp:[300,1100],up:500,life:[.25,.6]}); K.flare(hx,my,hz,{pal:GD,s:150,dur:.2,gain:2}); Cn.shake(.3+i*.05); Cn.SND.tick(1.6-i*.08,.3); });
  if(F.on){ const m=LM(), b=K.mats(), sdm=rand(0,9), tA=tc+.04;
    GFX.add(lead-tA+.12,(k,t)=>{ const T_=tA+t, i=eo3(sat(t/.3)), q=sat((T_-tF)/.2), an=sat((T_-tc)/.72), hit=T_>=lead, z=mz(T_), sc=mix(.72,1,i), hot=sat((T_-tc-.25)/.4);
      F.quad(b.dark,mx,my,BS*(.45+.95*an),BS*(.45+.95*an),0,{a:.2+.55*an*an});
      if(q>0&&!hit&&!F.low){ F.ribbon(b.trB,[{x:mx,y:my,z:z+BS*3.4,w:BS*.2},{x:mx,y:my,z:z+BS*2.4,w:BS*.7},{x:mx,y:my,z:z+BS*1.2,w:BS*.95}],{cA:'#060a09',cB:'#26332f',cM:'#3c4c46',cC:'#5a6a64',op:1,gain:1,bgain:1,a:.7*q,t0:sdm,ord:-.6});
        F.bill(m.rock,mx,my,z+BS*.96+BS*.5*q,BS*1.03,BS*1.2,0,{a:.35,t0:sdm,ord:-.55}); }
      // rim light: gold from the charms above it, jade coming up from the seal under it
      if(!hit){ F.bill(m.rock,mx,my,z+BS*.96*sc,BS*sc*1.05,BS*sc*1.04,0,{cA:'#000000',cB:GD.b,cM:GD.m,cC:GD.h,op:0,a:.4*sat(t/.2),gain:1.3,rk:[.3,.9],t0:sdm,ord:-.56}); F.bill(b.glowO,mx,my,z+BS*.25,BS*.9,BS*.5,0,{...C,a:.5*sat(t/.2),gain:1.3,ord:-.57}); }
      // the contact frame: it is already coming apart
      F.bill(m.rock,mx,my,z+BS*(hit?.66:.96)*sc,BS*sc*(hit?1.34:1),BS*sc*(hit?.68:1),0,{cB:'#4f7268',a:sat(t/.12),gain:1.6+hot*1.2,ero:hit?.3+(T_-lead)*4:.05,nk:hit?.9:0,t0:sdm,ord:-.5}); },tA); }
  after(tF,()=>{ sky.close=tF+.1; lampG.hold=0; GFX.ambient(.44,.44,.46,40); GFX.gain=g0*.5; if(bind) bind.a=.3; SFX.whoosh(.5,1); });
  // ---- contact: it shatters. Shock, slabs, the floor breaking upward, the crowd thrown - all on the one frame
  after(lead,()=>{ GFX.gain=g0; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; sig.dead=true; if(bind){ bind.a=1; bind.kick(); after(.4,()=>{ bind.a=.5; }); }
    lotus(mx,my,hw*.9); if(F.ready('v3_flip_shock')) K.flip(mx,my,{tex:'v3_flip_shock',floor:true,s:BS*1.25,dur:.55,pal:SP,gain:.85,s0:.3}); puffs(mx,my,BS*.55,4,500); puffs(mx,my,BS*.15,1,600,{delay:.08});
    GFX.ripple(mx,my,hw*2,{life:.5,s:.9});
    if(F.on){ const m=LM(), cr=rand(0,TAU); GFX.add(5,(k,t)=>{ F.quad(m.crater,mx,my,BS*1.25,BS*1.25,cr,{a:sat(t/.05)*sat((1-k)/.3),gain:1.3*Math.exp(-t*1.6)+.25}); }); }
    K.crack(mx,my,{alt:1,r:BS*1.15,pal:P,life:4.2,grow:.1,gain:.6});
    if(K.upheave){ K.upheave(mx,my,{r:BS*.62,n:5,s:340,a0:Math.PI+.15,a1:TAU-.15,pal:ST,dur:1.5,rise:.08,stagger:.008,rock:'#3b5f56'}); K.upheave(mx,my,{r:BS*.66,n:4,s:170,a0:.3,a1:Math.PI-.3,pal:ST,dur:1.3,rise:.08,stagger:.008,rock:'#3b5f56'}); }
    // its pieces: thrown clear, they land and stay
    for(let i=0;i<6;i++){ const a=i/6*TAU+rand(-.3,.3), d=rand(BS*.75,BS*1.25), cx=mx+Math.cos(a)*d, cy=my+Math.sin(a)*d*FSY; if(Math.hypot(cx-x0,(cy-y0)/FSY)<260) continue; ring.push(stone(cx,cy,{s:rand(110,220),h0:rand(500,900),dur:rand(.3,.48),vx:(mx-cx)*.85,lead:0,plain:1,stay:9})); }
    K.debris(mx,my,{n:30,r:BS*.5,sp:[400,1700],up:2200,size0:14,size:46,c:'#4c6a60'}); K.dust(mx,my,{n:26,r:BS*.5,sp:[600,1700],a:.55,s:1.5,c:'#2c3835'}); K.sparks(mx,my,60,{pal:P,n:36,sp:[500,2200],up:1700,life:[.3,.9]});
    GFX.light(mx,my,hw*1.6,GD.l,1.2,.4,{z:260});
    fling2(mx,my,BS*1.9);
    // every stone already in the earth answers, nearest first
    stuck.forEach((s,j)=>{ const d=Math.hypot(s.x-mx,s.y-my); after(.08+Math.min(.5,d/3400),()=>{ s.crumble(); if(j%3===0) K.flip(s.x,s.y+10,{tex:'v3_flip_smoke',smoke:true,nb:1,c:'#0d1816',c2:'#4a6a60',s:s.s*1.5,dur:.8,lift:.8,rise:s.s*.4}); K.sparks(s.x,s.y,40,{pal:P,n:5,sp:[200,700],up:1300}); }); });
    after(.3,()=>Cn.sweep(mx,my,Dm,{speed:3000,push:1.3})); Cn.SND.hit(1); Cn.SND.gong(1); SFX.boom(1.6,1); SFX.shatter(1); });
  // ---- aftermath, each thing on its own clock: dust first, then the flames, the crater's glow, the slabs, the seal last
  after(lead+.6,()=>{ K.embers(mx,my,hw*.9,{pal:P,n:40,life:1.8}); GFX.ambient(.8,.9,.86,2); Cn.zoom(1); Cn.tilt(0,3); Cn.cam(null); });
  after(lead+1.15,()=>{ GFX.gain=g0; GFX.ambient(1,1,1,2.5); sig.dead=true; for(const s of stuck) s.dead=true; ultStop(); });
  after(lead+2.3,()=>{ for(const s of ring) s.crumble(); }); }

// SPIRIT KING: he only prays. Behind him a gold gate writes itself on the floor and something enormous rises out of the mist, its robes flowing and
// thinning into fog. Its eyes open. Four times it turns, and its own hand goes out from its shoulder on an arm of light, grows, and comes down flat on
// the crowd. The fifth time the hand goes out over his head and covers the field: the floor breaks upward round it and a lotus opens in its palm.
function ultKing(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, kx=x0, ky=y0-500, KS=670, g0=GFX.gain, st={pt:-9,out:-1,done:false,l0:0,l1:0,lt:-9,sd:rand(0,9)};
  const leanNow=()=>mix(st.l0,st.l1,eo3(sat((RT-st.lt)/.26))), act=(l)=>{ st.l0=leanNow(); st.l1=l; st.lt=RT; st.pt=RT; }, sh=side=>[kx+side*KS*.6+leanNow()*KS*1.2,ky,KS*1.18];
  S([['gy01',.12],['gy02',.18],['gy03',.25],['gy04',.7],['gy05',.7],['gy06',.12,{kick:[-.8,.6]}],['gy07',.2],['gy08',.7],['gy09',.7],['gy10',.8],['gy11',.18,{kick:[1.6,-1.2]}],['gy12',.7],['gy13',.8],['gy14',9]]);
  // ---- omen: close on him and what rises behind him
  GFX.ambient(.5,.58,.58,3); Cn.zoom(1.3); Cn.tilt(.1,3); Cn.cam(x0,y0-BODY*4,4); SFX.choir(5.2); SFX.bell(); Cn.drone(49,.3);
  const gate=K.sigil(kx,ky,{r:hw*.6,dur:12,in:1.1,out:.6,spin:-.16,pal:SG,tex:SEAL(),gain:.55,hole:.12}); gate.a=.6;
  const lamp=GFX.light(kx,ky,hw*1.4,PJ.l,.05,.8,{hold:12,z:300});
  for(let i=0;i<3;i++) after(.15+i*.4,()=>K.shock(kx,ky,{r0:hw*(1.2-i*.12),r:120,dur:.55,pal:P,gain:.5,light:0,dust:0,haze:.4,th:.6}));
  // fog round its feet the whole time it stands
  if(!F.low) for(let i=0;i<13;i++) after(.25+i*.42,()=>{ if(st.out<0) K.smoke(kx+rand(-440,440),ky+rand(-60,40),{s:rand(200,300),dur:1.9,c:'#061a15',c2:'#245a4a',a:.6,rise:110}); });
  for(let i=0;i<13;i++) after(i*.42,()=>{ K.embers(x0,y0-200,hw,{pal:P,n:8,life:2.4,up:320}); if(i>1&&st.out<0) K.embers(kx,ky,340,{pal:i%2?GD:P,n:6,life:2.2,z:1100,up:300}); });
  // the king: rising out of the floor, breathing, turning toward each strike
  if(F.on){ const m=LM(), b=K.mats(); GFX.add(12,(k,t)=>{ if(st.done) return; const i=sat((t-.3)/1.4), f=st.out<0?0:sat((RT-st.out)/.8), pu=Math.exp(-(RT-st.pt)*3.5); if(f>=1){ st.done=true; lamp.hold=0; return; }
      const ln=leanNow(), s=KS*(.9+.1*eo3(i))*(1+.02*Math.sin(t*2.3)+pu*.035), z0=Math.sin(t*1.3)*10+f*260-(1-eo3(i))*330, vis=Math.pow(sat(i*1.5),1.3)*(1-f*f);
      lamp.a=(.2+.5*i+pu*.35)*(1-f);
      F.quad(b.dark,kx,ky,470,470,0,{a:.6*i*(1-f)}); F.quad(b.glowG,kx,ky,640,640,0,{...C,a:(.3+.3*pu)*i*(1-f),gain:.9});
      if(!F.low) F.bill(m.fire,kx+ln*s*1.1,ky,z0+s*1.12,s*1.02,s*1.22,ln*.6,{cA:PJ.d,cB:'#0a7a58',cM:PJ.b,cC:PJ.m,a:.5*vis,gain:1.2+pu,ero:.14,nk:.45,t0:st.sd,pm:[4,.5,.004,0],ord:-6});
      kingDraw(kx,ky,s,{z0,a:.9*vis,ero:Math.max(.42-i*1.1,f*.8-.05),gain:.82+.35*pu,lean:ln,turn:Math.min(1.5,Math.abs(ln)/.22),yaw:-.2+ln*1.5}); }); }
  // ---- release: its eyes open; the camera pulls wide
  after(1.95,()=>{ st.pt=RT; K.flare(kx,ky,KS*1.62,{pal:P,s:240,sx:3,sy:.3,dur:.5,gain:4}); K.flare(kx,ky,KS*1.62,{pal:GD,s:340,dur:.6,gain:1.6}); K.art(kx,ky,{tex:TX('v3_shock_thick','fx3_shock'),floor:true,s:hw*.95,dur:.7,pal:SP,gain:.8,hold:.3,s0:.3}); K.shock(kx,ky,{r:hw*1.3,dur:.55,pal:P}); GFX.ripple(kx,ky,hw*1.5,{life:.5,s:.6});
    K.sparks(kx,ky,60,{pal:P,n:30,sp:[300,1400],up:2000,life:[.4,1]}); K.dust(kx,ky,{n:14,r:300,sp:[400,1000],c:'#2c3835'});
    GFX.ambient(.46,.52,.54,5); Cn.shake(.7); post.ca=.01; Cn.zoom(.64); Cn.tilt(.25,4); Cn.cam(x0,y0-BODY*1.2,5); SFX.roar(1.1,.5); Cn.SND.gong(.9); SFX.boom(1.4,.5); });
  // ---- four hands: it turns, and its own hand goes out from the shoulder on an arm of light and comes down flat
  const T=onScreen(150), spots=[]; for(let i=0;i<4;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null; spots.push(e?X.inView(e.x,e.y,.75):[x0+rand(-hw,hw)*.7,y0+rand(-hh,hh)*.7]); }
  let at=2.35;
  spots.forEach(([x,y],i)=>{ const hitAt=at, side=x>=kx?1:-1, fall=.4;
    after(hitAt-.34,()=>act(side*.34));
    after(hitAt-.46,()=>{ GFX.light(x,y,700,PJ.l,.7,.2,{hold:.42,z:150}); Cn.cam(lerp(x0,x,.35),lerp(y0,y,.35)-BODY,6); sfx('whoosh',.5,.9); });
    after(hitAt-fall,()=>{ const f=sh(side); K.flare(f[0],f[1],f[2],{pal:P,s:150,dur:.3,gain:2.2}); palmFall(x,y,{s:500,fall,from:f,arc:520,s0:.3,aw:60,pre:0,rz:(y>ky+200?Math.PI:0)+(i%2?1:-1)*rand(.1,.35),scar:3}); });
    if(F.on) GFX.add(.46,(k)=>{ F.quad(K.mats().dark,x,y,265*(.6+.9*k),500*(.6+.7*k),0,{a:.12+.5*k*k}); },hitAt-.46);
    after(hitAt,()=>{ slamFx(x,y,1); K.crack(x,y,{alt:1,r:520,pal:P,life:3,grow:.1,gain:.5}); Cn.shake(.85); hitstop=Math.max(hitstop,.06); Cn.SND.hit(.6); post.ca=.008; V.blast={x,y,p:1}; inCircle(x,y,480,o=>ultHit(o,Dm*.5,x,y)); });
    after(hitAt+.2,()=>{ st.l0=leanNow(); st.l1=0; st.lt=RT; });
    at+=Math.max(.3,.44-i*.05); });
  // ---- climax: the hand goes out over his head, growing, its shadow and a pool of light on the field before it
  const tc=at+.25, bx=x0, by=y0-hh*.12, py=y0+730, sd=Math.random()<.5?1:-1, tH=tc+.58, GL=1150;
  after(tc,()=>{ Cn.zoom(.58); Cn.tilt(.28,4); Cn.cam(bx,y0+60,6); GFX.ambient(.46,.48,.5,5); Cn.SND.inhale(.55,.7); act(sd*.26); duck(.2,.5); GFX.light(bx,py,900,PJ.l,.7,.3,{hold:.58,z:200});
    });
  if(F.on) GFX.add(.58,(k)=>{ F.quad(K.mats().dark,bx,py,GL*.53*(.5+1*k),GL*(.5+.8*k),0,{a:.15+.55*k*k}); },tc);
  after(tH-.5,()=>{ const f=sh(sd); K.flare(f[0],f[1],f[2],{pal:P,s:220,dur:.35,gain:2.4}); palmFall(bx,py,{s:GL,fall:.5,from:f,arc:1250,s0:.22,aw:90,hold:.3,out:.5,scar:3.4,rz:Math.PI}); });
  after(tH-.2,()=>{ GFX.ambient(.44,.44,.46,40); GFX.gain=g0*.5; gate.a=.3; });
  // ---- contact: shock, slabs, the floor breaking upward round the hand, the crowd thrown, the lotus opening - on the one frame
  after(tH,()=>{ GFX.gain=g0; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; act(0); gate.a=.9; gate.kick();
    slamFx(bx,py,2,{quiet:1,light:0}); lotus(bx,py,hw*.8,'o'); puffs(bx,py,GL*.5,3,460,{delay:.06}); GFX.light(bx,py,hw*1.6,GD.l,1.2,.4,{z:260});
    if(F.on){ const m=LM(), cr=rand(0,TAU); GFX.add(4.5,(k,t)=>{ F.quad(m.crater,bx,py,GL*1.05,GL*1.05,cr,{a:.8*sat(t/.05)*sat((1-k)/.3),gain:1.2*Math.exp(-t*1.6)+.2}); }); }
    K.crack(bx,py,{alt:1,r:GL*1.05,pal:P,life:4,grow:.1,gain:.55});
    // the floor breaks upward round the hand, open on the side where he stands
    if(K.upheave) K.upheave(bx,py,{r:GL*.74,n:10,s:320,a0:-.55,a1:Math.PI+.55,pal:ST,dur:1.4,rise:.08,stagger:.008,rock:'#3b5f56'});
    if(K.arcwall) K.arcwall(bx,py,{r:GL*.8,h:700,a0:Math.PI+.5,a1:TAU-.5,hb:1,hf:1,dur:1,pal:P,gain:.55,delay:.04});
    fling2(bx,py,GL*1.7);
    after(.3,()=>Cn.sweep(bx,by,Dm,{speed:3200,push:1.2})); Cn.SND.hit(1); SFX.boom(1.6,1); SFX.shatter(1); });
  // ---- afterglow: it goes back up as light; the bell again; the print stays pressed into the floor
  after(tc+1.25,()=>{ st.out=RT; SFX.bell(.7); K.embers(bx,by,hw*.9,{pal:P,n:44,life:2}); K.embers(kx,ky,400,{pal:P,n:24,life:2.2,z:1000,up:420}); GFX.ambient(.8,.9,.86,2); Cn.zoom(1); Cn.tilt(0,3); Cn.cam(null); gate.a=.4; });
  after(tc+2.05,()=>{ GFX.gain=g0; GFX.ambient(1,1,1,2.5); gate.dead=true; ultStop(); }); }

X.reg('shaman',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('sh_basic')-1))},skills:SKILL,ults:{sh_ult1:ultStones,sh_ult2:ultKing}});
})();
