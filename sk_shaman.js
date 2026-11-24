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
// dust is the colour of the earth (brown, grey); what the spirits leave is dark jade vapour
const DB={c:'#1c1814',c2:'#85776a'}, DGy={c:'#151716',c2:'#7c8680'}, JV={c:'#0a3a2e',c2:'#6fd8b4'}, ROCK='#3d524c';
// the pale spirit: jade with almost no white in it, for the big slow volumes
const SPV={d:'#011a13',b:'#0c9a70',m:'#4fe0b4',h:'#a8ffe0',l:'#30ffb0',s:'#b8ffe0'};
// POP: a small jade hit: a bead of spirit plasma that bursts, needles, sparks, a breath of light on the floor
function pop(x,y,s=1,z=BODY*.5){ K.vorb(x,y,z,{r:46*s,dur:.22,pal:P,spin:6,core:.3,in:.05,out:.14,gain:1.1}); K.art(x,y,{tex:'v3_xburst',s:80*s,z:z-60*s,dur:.14,pal:P,gain:.9,hold:.3,s0:.5}); K.sparks(x,y,z,{pal:P,n:Math.round(6*s),sp:[250,800],up:300,life:[.15,.35]}); GFX.light(x,y,280*s,PJ.l,.6,.25); }
// a transform that turns a solid about its middle instead of its foot
const cxf=(s,rx,ry,rz,sq=1)=>{ const M=F.xf({sx:s*(2-sq),sy:s*(2-sq),sz:s*sq,rx,ry,rz}); M[12]=-M[8]*.4; M[13]=-M[9]*.4; M[14]=-M[10]*.4; return M; };
// DRING: a broken front of dust rolling outward over the floor: lumps of different height, not a smooth ring; it thins as it spreads
function dring(x,y,o={}){ if(!K.vok||!K.vok()) return; const Rm=o.r||500, dur=o.dur||.8, sd=rand(0,90), tube=o.tube??.16, r0=(o.r0??Rm*.2)/Rm;
  GFX.add(dur,(k,t)=>{ const e=eo3(k), rr=mix(r0,1,e)*.78, f=sat((k-.3)/.7);
    VOL.add('ring',x,y,Rm*tube*.9,{ex:Rm,ey:Rm,ez:Rm*tube*2,pa:[rr,tube*(.8+.7*e),o.freq||3.4,t*1.2],pb:[0,.5,o.lump??.95,0],dens:8*(o.a??1)*(1-f)*(1-f)*sat(k*10),seed:sd,smoke:1,fire:.7,cS:o.c||DB.c,cK:o.c2||DB.c2,amb:.2,key:1.2,rim:.3,steps:20,ord:-1e9}); },o.delay||0); }
// THUD: what a stone does to the floor it lands on: a roll of brown dust, a ball of it rising, chips, a little jade out of the cracks
function thud(x,y,s,o={}){ if(o.ring!==0) dring(x,y,{r:s*3,r0:s*.8,dur:.6,tube:.15,a:.5,...(o.grey?DGy:DB)}); if(o.smoke!==0) K.vsmoke(x+rand(-20,20),y+8,{s:s*1.15,dur:1.3,rise:s*1.1,a:.7,...(o.grey?DGy:DB)});
  K.flare(x,y,s*.4,{pal:P,s:s*.9,dur:.12,gain:1.6}); K.debris(x,y,{n:o.n??7,r:s*.4,sp:[220,760],up:1200,size0:5,size:20,c:'#4c5a54'}); K.dust(x,y,{n:5,r:s*.5,sp:[200,560],a:.4,c:'#2e2820',c3:'#6a5c4a'}); K.sparks(x,y,30,{pal:P,n:5,sp:[300,1000],up:900});
  GFX.light(x,y,s*4.5,PJ.l,.5,.3,{z:160}); }
// BOULDER: a real stone out of the sky. It tumbles down a curved path with its shadow closing under it, drives itself into the floor,
// sits there in its own crater, and later crumbles.  o: {s (radius), h0, dur, vx (sideways start offset), delay, stay, lead, fd}; returns {crumble()}
function boulder(x,y,o={}){ const s=o.s||110, Hm=s*2.05, h0=o.h0||2200, dur=o.dur||.42, vx=o.vx??-h0*.22, d0=o.delay||0, v=(Math.random()*4)|0, ax=rand(-6,6), ay=rand(-6,6), rz0=rand(0,TAU), crot=rand(0,TAU), lead=o.lead??.3, sd=rand(0,9);
  const h={x,y,s,t1:-1,fd:o.fd||.4,dead:false,crumble(){ if(h.t1>=0||h.dead) return; h.t1=RT; const big=s>300, n=Math.round(clamp(s/16,3,22)*(GFX.QK||1));
      for(let i=0;i<n;i++){ const a=rand(0,TAU), vv=rand(60,big?520:260); GFX.pt({x:x+rand(-.6,.6)*s,y:y+rand(-8,8),z:rand(.2,1.5)*s,vx:Math.cos(a)*vv,vy:Math.sin(a)*vv*FSY,vz:rand(-80,260),g:2400,drag:.3,life:rand(.9,1.6),s:rand(big?10:5,big?34:14),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4c6a60'),c2:'#0a0f0e',shadow:true,bounce:.35,fk:5,L:2}); }
      K.dust(x,y,{n:big?12:3,r:s*.5,sp:[s*.8,s*2.2],a:.4,c:'#2e2820'}); }};
  if(!F.on) return h; const m=LM(), b=K.mats(), mat={alb:o.rock||ROCK,emis:PJ.b,rimC:PJ.h,spec:.5,rim:.2,bump:1.6,tone:.3};
  // the mark writes itself a moment before the stone is seen, and the shadow closes in on it
  GFX.add(lead+dur,(k,t)=>{ const i=sat(t/(lead+dur*.5)), e=sat((t-lead)/dur);
    if(lead>0) F.quad(m.mark,x,y,s*1.7,s*1.7,t*1.6+sd,{cA:PJ.d,cB:PJ.b,cC:SP.h,a:.3+.6*e,gain:1+e,rv:[i*1.5,.25,0,.1]});
    F.quad(b.dark,x,y,s*(2.6-1.5*k),s*(2.6-1.5*k),0,{a:.12+.6*k*k}); },Math.max(0,d0-lead));
  // the fall: sideways speed is steady and the drop quickens, so the path bends; chips and dust come off it
  GFX.add(dur,(k,t)=>{ const px=x+vx*(1-k), z=h0*(1-k*k)+s*.6, a=sat(k*(o.emerge?5:30));
    F.solid('boulder',v,px,y,z,{M:cxf(Hm*(.6+.4*a),ax*t,ay*t,rz0),...mat,vein:.3,heat:0,clip:0,a});
    if(!F.low&&Math.random()<.6) GFX.pt({x:px+rand(-.5,.5)*s,y,z:z+rand(-.3,.6)*s,vx:rand(-60,60),vy:rand(-20,20),vz:rand(-200,100),g:500,drag:.8,life:rand(.25,.5),s:rand(4,11),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb('#55645e'),c2:'#0a0f0e',fk:4,L:2});
    if(!F.low&&Math.random()<.5) GFX.pt({x:px,y,z:z+s*.5,vx:rand(-40,40),vy:0,vz:rand(40,160),g:-20,drag:.6,life:rand(.3,.55),s:rand(3,6),m:8,c:GFX.rgb(PJ.s),fade:'in',L:3}); },d0);
  // landed: one squashed frame, then it sits half buried in its own small crater
  if(o.stay) GFX.add(o.stay,(k,t)=>{ if(h.dead) return; const f=h.t1<0?0:sat((RT-h.t1)/h.fd); if(f>=1){ h.dead=true; return; } const sq=1-.22*Math.exp(-t*20);
    if(!o.lite) F.quad(m.crater,x,y,s*1.75,s*1.75,crot,{a:sat(t/.04)*(1-f),gain:1.2*Math.exp(-t*2.2)+.25});
    F.solid('boulder',v,x,y,s*(.55-.12*sat(t/.05))-f*f*s*.4,{M:cxf(Hm,ax*dur,ay*dur,rz0,sq),...mat,vein:.5*Math.exp(-t*1.4)+.06,heat:.45*Math.exp(-t*3),ero:f*.85,shadow:o.lite?null:[.55,.28,.45*(1-f)]}); },d0+dur);
  return h; }
// KING: the painted deity as a stack of strips so the lower body can thin into mist and the field shows through it: full above the waist,
// alpha and erosion ramping down to the hem. The noise runs unbroken across the strips, and it pushes the cloth about harder the lower it is;
// a shear makes him lean and a squeeze makes him turn.  o: {z0 (height of the hem), a, ero, gain, lean, turn}
function kingDraw(x,y,s,o){ const m=LM(), N=F.low?5:9, asp=.84*(1-.16*(o.turn||0)), lean=o.lean||0, yaw=o.yaw||0, a0=o.a??.92, e0=o.ero??-.05, W1=.12, K0=1.1/W1, W2=1.6/K0;
  // yaw turns the painted plane about the vertical: in this camera one shoulder comes forward and down, the other goes back and up
  F.bill(m.king,x+lean*s*1.5,y,o.z0+s*1.5,1,1,0,{M:F.xf({sx:s*asp,sz:s*.5,ry:lean*.8,rz:yaw}),a:a0,ero:e0,soft:.12,gain:o.gain,dist:.014,uvT:[1,.5,0,.5],n1:[1.1,.55,0,W1],n2:[1.6,.8,0,W2],time:RT+K0*.5});
  for(let j=0;j<N;j++){ const u=(j+.5)/N, v0=j/(2*N);
    F.bill(m.king,x+lean*s*u,y,o.z0+s*u,1,1,0,{M:F.xf({sx:s*asp,sz:s/(2*N),rz:yaw}),a:a0*mix(.1,1,Math.pow(u,1.25)),ero:Math.max(e0,(1-u)*.42-.05),soft:.16,gain:o.gain,dist:mix(.05,.016,u),uvT:[1,.5/N,0,v0],n1:[1.1,.55/N,0,W1],n2:[1.6,.8/N,0,W2],time:RT+K0*v0}); } }
// PALM: the spirit hand comes down out of the sky facing us, tips forward and slaps flat onto the floor; it presses, burns away, and leaves its print.
//  o: {s (half length), fall, hold, out, h0, ox (sideways start offset), rz (turn on the floor), delay, scar (seconds the print glows)}
function palmFall(x,y,o={}){ if(!F.on) return; const m=LM(), b=K.mats(), Ln=o.s||420, Wd=Ln*.53, fall=o.fall??.36, hold=o.hold??.14, out=o.out??.34, h0=o.h0||1700, ox=o.ox||0, oxp=o.oxp||3, pre=o.pre||0, sd=rand(0,9), d0=o.delay||0, rz=o.rz||0, fr=o.from, arc=o.arc||0, s0=o.s0||1;
  // where the hand is at q (0..1 of the strike): out of the sky, or from a shoulder out along an arc, growing as it comes
  const at=q=>{ if(fr){ const e=q*q; return [mix(fr[0],x,e),mix(fr[1],y,e),mix(fr[2],0,e)+Math.sin(Math.PI*Math.pow(q,.8))*arc+12,mix(s0,1,eo3(q))]; } return [x+ox*(1-Math.pow(q,oxp)),y,h0*(1-q*q*q)+12,1]; };
  // its shadow is on the floor before the hand arrives, and grows as it comes
  GFX.add(pre+fall+hold+out,(k,t)=>{ const q=sat(t/(pre+fall)), f=sat((t-pre-fall-hold)/out); F.quad(b.dark,x,y,Wd*(.7+1.2*q),Ln*(.7+.8*q),rz,{a:(.12+.6*q*q)*(1-f)}); },Math.max(0,d0-pre));
  // the arm: a stream of spirit vapour from the shoulder to the wrist, so the hand is never loose in the air
  const arm=fr&&K.vok&&K.vok()?K.vjet(fr[0],fr[1],fr[2],0,{len:60,r:Wd*.8,r0:(o.aw||70)*1.7,dur:fall+.26,pal:SPV,heat:.8,turb:.55,speed:8,in:.06,out:.2,gain:.85,delay:d0}):null;
  GFX.add(fall+hold+out,(k,t)=>{ const q=sat(t/fall), [px,py,z,sc]=at(q), tip=sat((q-.5)/.5), lean=-1.05*(1-tip*tip), f=sat((t-fall-hold)/out), sqz=t>fall?Math.exp(-(t-fall)*18):0, pr=(1+.14*(1-q))*sc, pw=pr*(1+.2*sqz), pl_=pr*(1-.1*sqz);
    if(arm){ const dx=px-fr[0], dy=(py-fr[1])/FSY, dz=z-fr[2], L=Math.hypot(dx,dy,dz)||1; arm.dir=Math.atan2(dy,dx); arm.pitch=Math.asin(clamp(dz/L,-1,1)); arm.len=Math.max(60,L*1.15); arm.a=1-sat((t-fall-.04)/.2); }
    else if(fr){ const af=1-sat((t-fall)/.14); if(af>0){ const pts=[]; for(let i=0;i<=6;i++){ const [ax,ay,az]=at(q*i/6); pts.push({x:ax,y:ay,z:az,w:mix(o.aw||70,Wd*sc*.85,i/6)}); }
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
  // CARD BOMB: the big talisman sticks; spirit light is drawn into it and winds into a bead that swells; it goes up as one lumped
  // ball of jade fire that cools into dark vapour, with brown dust rolling out underneath. Evolved: a second charge leaves as a pillar.
  sh_bomb:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); fling();
    after(.2,()=>talisman(t,0,{big:true,r:60,d:0,home:t,life:1.2,onHit:(e,p)=>{}, onEnd:p=>{ const bx=p.x, by=p.y, fuse=EVO(id)?.8:.45, cz=BODY*.55;
      const boom=k=>{ hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.35); sfx('boom',1.1,.8); K.flare(bx,by,cz,{pal:GD,s:k?150:210,dur:.13,gain:3}); GFX.light(bx,by,900,PJ.l,1,.4,{z:200});
        if(!k){ K.vblast(bx,by,{s:250,pal:P,heat:.95,smoke:.7,dur:1.25,fire:.3,rise:260}); dring(bx,by,{r:470,r0:120,dur:.75,tube:.17,a:.8,...DB}); K.crack(bx,by,{r:300,pal:P,life:2.6,grow:.08,gain:.5});
          K.chunks(bx,by,{n:5,r:60,sp:[250,700],up:1300,s:[26,54],pal:ST,rock:ROCK}); K.sparks(bx,by,60,{pal:P,n:16,sp:[400,1500],up:1200,life:[.25,.7]}); GFX.ripple(bx,by,380,{life:.35,s:.6}); }
        // the echo does not burst again: what is left in the paper leaves upward
        else { K.vcolumn(bx,by,{r:85,h:1000,dur:.85,rise:.1,out:.4,pal:P,heat:.95,twist:3.2,turb:.7,taper:.6}); K.sparks(bx,by,40,{pal:GD,n:12,sp:[100,500],up:2200,g:900,life:[.3,.7]}); K.vsmoke(bx,by,{s:170,dur:1.1,rise:240,a:.6,...JV}); }
        inCircle(bx,by,260,o=>{ dmg(o,d*(k?.6:1),{kb:1.4,big:true,sx:bx,sy:by}); hitFx(o,C1,1.3); }); };
      // the gathering: a bead of plasma winding up round the paper, motes falling into it
      const orb=K.vorb(bx,by,cz,{r:40,dur:fuse+.03,pal:P,spin:6,core:.14,in:.08,out:.03,gain:.9});
      if(F.on) GFX.add(fuse,(k,t)=>{ const pu=.5+.5*Math.sin(t*(18+k*30)); orb.r=mix(40,EVO(id)?105:125,k*k)*(1+.06*pu); card(bx,by,cz,70*(1+.08*pu),Math.sin(t*40)*.05*k,1,1+k*1.2*pu); });
      for(let i=0;i<12;i++) after(i*.03,()=>{ const a=rand(0,TAU), r=rand(240,380); GFX.pt({x:bx+Math.cos(a)*r,y:by+Math.sin(a)*r*FSY,z:rand(20,260),vx:-Math.cos(a)*r*2.6,vy:-Math.sin(a)*r*2.6*FSY,vz:rand(-80,120),g:0,drag:.2,life:.36,s:rand(3,6),m:3,len:.05,c:GFX.rgb(PJ.s),c2:PJ.b,c3:PJ.h,L:3}); });
      K.shock(bx,by,{r0:300,r:50,dur:.42,pal:P,gain:.5,light:0,dust:0,haze:.3,th:.6}); GFX.light(bx,by,420,PJ.l,.7,.2,{hold:fuse,z:90,flick:.3});
      after(.45,()=>boom(0)); if(EVO(id)) after(.8,()=>boom(1)); }})); }},
  // STONE SPIKE: a crack runs out along the floor and real stone spikes punch up through it one after another, each taller than the last,
  // leaning the way the crack ran; brown dust hangs over the line; they sink back and crumble.
  sh_spike:{fn(id){ const e=nearest(700); if(!e) return false; const a0=angTo(e), d=D(id), dirs=EVO(id)?[-.45,0,.45]:[0]; face(a0); raise();
    for(const da of dirs){ const a=a0+da, cx=Math.cos(a), cy=Math.sin(a); K.gash(pl.x+cx*80,pl.gy+cy*80,pl.x+cx*820,pl.gy+cy*820,{pal:P,w:70,life:2.2,grow:.5,delay:.2});
      for(let i=0;i<6;i++) after(.25+i*.07,()=>{ const r=150+i*120, x=pl.x+cx*r, y=pl.gy+cy*r, s=170+i*34, last=i===5;
        if(K.upheave) K.upheave(x,y,{r:6,n:1,s,a0:a,a1:a,jit:0,pal:ST,dur:last?1.2:.95-i*.03,rise:.07,rock:ROCK,per:last?3:2,lean:1.5});
        if(i%2===1) K.vsmoke(x,y,{s:120+i*16,dur:1.2,rise:150+i*30,a:.6,...DB});
        if(last&&!da){ K.flare(x,y,s*.9,{pal:P,s:150,dur:.2,gain:2}); K.chunks(x,y,{n:4,r:40,sp:[200,600],up:1400,s:[24,48],pal:ST,rock:ROCK}); hitstop=Math.max(hitstop,.04); trauma=Math.min(1,trauma+.25); }
        K.sparks(x,y,20,{pal:P,n:4,sp:[200,700],up:1100,life:[.2,.45]}); GFX.light(x,y,420,PJ.l,.8,.3,{z:80}); sfx('shatter',.4);
        inCircle(x,y,110,o=>{ dmg(o,d,{kb:.4,launch:1100,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.1); }); }); } }},
  // SPIRIT ORB: will-o'-the-wisps. Each is a small ball of turning plasma with a tail of light along its orbit and a pool of light under it;
  // they are breathed out of a thin twister that stands round him for a moment.
  sh_wisp:{fn(id){ if(V.orbs.some(o=>o.wisp)||!nearest(700)) return false; const n=EVO(id)?6:4, d=D(id); pray(); sfx('bell',.6);
    const tw=K.vfunnel(pl.x,pl.gy,{r:330,r0:230,h:430,dur:.85,rise:.3,out:.45,pal:SPV,spin:6,thick:.06,heat:.65,gain:.5,streak:1}); tw.a=.3; GFX.add(.85,()=>{ tw.x=pl.x; tw.y=pl.gy; });
    const lamp=GFX.light(pl.x,pl.gy,620,PJ.l,.5,.4,{hold:5,z:120,flick:.25}), b=K.mats();
    for(let i=0;i<n;i++){ const o={wisp:true,a:i/n*TAU,life:5,d,R:290,w:3.6,hitR:80,c:C1,h:BODY*.8,v:{x:pl.x,y:pl.gy-BODY}}, sd=rand(0,9), hz=BODY*.5; V.orbs.push(o);
      const ball=K.vorb(pl.x,pl.gy,hz,{r:58,dur:5.1,pal:SPV,spin:4,core:.1,heat:.6,in:.3,out:.25,gain:.6});
      if(F.on) GFX.add(5.1,(k,t)=>{ if((o.t||0)>=o.life||o.x==null){ ball.dead=true; return; } if(!i){ lamp.x=pl.x; lamp.y=pl.gy; } const a=sat(t/.25)*sat((o.life-o.t)/.3), bob=Math.sin(t*5+sd)*14, pts=[];
        ball.x=o.x; ball.y=o.y; ball.z=hz+bob; ball.a=a;
        for(let j=5;j>=0;j--){ const aa=o.a-j*.13; pts.push({x:pl.x+Math.cos(aa)*o.R,y:pl.gy+Math.sin(aa)*o.R*.8,z:hz+Math.sin((t-j*.036)*5+sd)*14,w:44*(1-j/6)}); }
        F.ribbon(b.trB,pts,{...C,gain:1.5,a:.6*a,t0:sd}); F.quad(b.glowG,o.x,o.y,130,130,0,{...C,a:.5*a,gain:1});
        if(Math.random()<.3) GFX.pt({x:o.x,y:o.y,z:hz+rand(-30,60),vx:rand(-50,50),vy:rand(-30,30),vz:rand(60,200),g:-40,drag:.5,life:rand(.4,.8),s:rand(3,6),m:8,c:GFX.rgb(Math.random()<.3?PJ.h:PJ.s),fade:'in',L:3}); });
      after(4.95,()=>{ if(o.x!=null&&V.orbs.includes(o)){ K.sparks(o.x,o.y,hz,{pal:P,n:5,sp:[100,400],up:500,life:[.2,.4]}); K.flare(o.x,o.y,hz,{pal:P,s:70,dur:.15,gain:1.6}); } }); } }},
  // HEALING CIRCLE: a soft green seal that walks with him, and a low slow curtain of green vapour turning on its rim; every pulse lifts light out of it
  sh_heal:{fn(id){ if(G.hp>A.maxHp()*.7&&countIn(380)<6) return false; const d=D(id), k=EVO(id)?.4:.25; pray(); sfx('choir',.6); stamp('힐',{x:.5,y:.2,size:.08,life:.7,c:C1});
    const sg=K.sigil(pl.x,pl.gy,{r:400,dur:3,in:.35,out:.45,spin:.5,pal:HEAL,tex:'fx_circle_seal'}), lamp=GFX.light(pl.x,pl.gy,700,HEAL.l,.55,.5,{hold:2.6,z:100});
    const veil=K.vfunnel(pl.x,pl.gy,{r:400,r0:350,h:210,dur:3.05,rise:.5,out:.6,pal:HEAL,spin:2.2,thick:.06,heat:.55,gain:.45,sway:.03,streak:1}); veil.a=.4;
    GFX.add(3.05,()=>{ sg.x=lamp.x=veil.x=pl.x; sg.y=lamp.y=veil.y=pl.gy; }); K.shock(pl.x,pl.gy,{r:420,dur:.45,pal:HEAL,gain:.7,light:0,dust:0});
    V.zones.push({follow:true,r:380,life:3,tick:.5,fx:null,fn:e=>{ dmg(e,d,{kb:.5}); hitFx(e,C1,.9); },onTick:()=>{ heal(k/6);
      sg.kick(); K.embers(pl.x,pl.gy,330,{pal:HEAL,n:14,life:1.3,up:560}); K.sparks(pl.x,pl.gy,10,{pal:HEAL,n:6,sp:[60,260],up:900,g:300,life:[.3,.6]}); GFX.light(pl.x,pl.gy,560,HEAL.l,.45,.3,{z:140}); }}); }},
  // ROCK FALL: real boulders out of the sky onto their marks; brown dust rolls out from each and they stay driven into the floor
  sh_rock:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?7:4, d=D(id); raise(); sfx('rumble',.8);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x, y=e.y, at=.3+i*.14, hitAt=at, s=rand(120,150);
      boulder(x,y,{s,h0:1900,dur:.34,vx:rand(-1,1)*520,delay:hitAt-.34,stay:1,fd:.35}).t1=RT+hitAt+.6;
      after(hitAt,()=>{ thud(x,y,s,{ring:i%2===0||n<=4?1:0,smoke:i%2?1:0,grey:i%3===0}); if(i%2===0) K.chunks(x,y,{n:3,r:50,sp:[250,650],up:1200,s:[22,44],pal:ST,rock:ROCK}); trauma=Math.min(1,trauma+.2); hitstop=Math.max(hitstop,.03); sfx('boom',1,.6);
        inCircle(x,y,200,o=>{ dmg(o,d,{kb:1.1,launch:500,big:true,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); }); }},
  // BIND: the sealing circle writes itself under the crowd, six talismans drop onto its rim, and a slow pillar of spirit vapour stands up
  // out of the mark with a thin bar of light over each talisman: a cage. When it ends the pillar sinks and the paper burns.
  sh_seal:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?380:300; face(angTo(t)); raise(); sfx('bell',.9);
    const sg=K.sigil(x,y,{r:R*1.08,dur:2.6,in:.3,out:.4,spin:.2,pal:SG,gain:.95,hole:.1,tex:SEAL()}); for(let i=1;i<5;i++) after(i*.5,()=>sg.kick()); K.shock(x,y,{r0:R*1.7,r:R*.5,dur:.34,pal:P,gain:.4,light:0,dust:0,thick:0}); GFX.light(x,y,R*2.2,PJ.l,.5,.4,{hold:2.2,z:80});
    const post=i=>{ const a=i/6*TAU+.5; return [x+Math.cos(a)*R*.94,y+Math.sin(a)*R*.94*FSY]; };
    if(F.on) GFX.add(2.6,(k,t)=>{ const dn=eo5(sat(t/.22)), out=sat((2.6-t)/.3); for(let i=0;i<6;i++){ const [cx,cy]=post(i); card(cx,cy,mix(900,62,dn)+Math.sin(t*4+i)*6,54,0,out*sat(t/.1),1+.5*Math.sin(t*7+i)); } });
    after(.22,()=>{ const col=K.vcolumn(x,y,{r:R*.55,h:900,dur:2.4,rise:.45,out:.55,pal:SPV,heat:.66,twist:1.1,turb:.55,taper:.3,speed:1.6,gain:.75}); col.a=.6;
      for(let i=0;i<6;i++){ const [cx,cy]=post(i); const bar=K.vcolumn(cx,cy,{r:17,h:560,dur:2.35,rise:.2,out:.3,pal:GD,heat:1,twist:.6,turb:.25,taper:.2,speed:2.4,gain:.8,delay:i*.03}); bar.a=.8;
        K.sparks(cx,cy,10,{pal:GD,n:3,sp:[150,450],up:500,life:[.15,.35]}); K.dust(cx,cy,{n:2,r:10,sp:[80,200],a:.3,c:'#2e2820'}); } hitstop=Math.max(hitstop,.03); trauma=Math.min(1,trauma+.15); });
    V.zones.push({x,y,r:R,life:2.5,tick:EVO(id)?.3:2.6,fx:null,fn:e=>{ dmg(e,d*(EVO(id)?.4:1),{kb:0,stun:.4}); },onEnd:()=>{ for(let i=0;i<6;i++){ const [cx,cy]=post(i); K.sparks(cx,cy,62,{pal:GD,n:5,sp:[100,400],up:900,life:[.25,.5]}); } K.vsmoke(x,y,{s:R*.5,dur:1.1,rise:260,a:.5,...JV}); }});
    inCircle(x,y,R,o=>{ dmg(o,d,{kb:0,stun:2.5,big:true}); hitFx(o,C1,.6); }); }},
  // SPIRIT WOLF: the painted wolves run inside a stream of spirit vapour that trails behind them, kick the dust up, and go out as a puff
  sh_wolf:{fn(id){ const e=nearest(900); if(!e) return false; const d=D(id), n=EVO(id)?4:2; face(angTo(e)); pray(); sfx('roar',.6,.5);
    for(let k=0;k<n;k++) after(.25+k*.12,()=>{ const a=angTo(e)+(k-(n-1)/2)*.5, sd=rand(0,9), b=K.mats(),
        p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.8,d,r:100,hits:new Set(),home:e,turn:3,c:C1,h:BODY*.4,pw:1.2,onHit:(en,q)=>pop(en.x,en.y,.9,BODY*.5),
          onEnd:q=>{ K.vsmoke(q.x,q.y,{s:130,z:20,dur:.8,rise:200,a:.6,...JV}); K.sparks(q.x,q.y,q.h,{pal:P,n:8,sp:[200,700],up:600,life:[.2,.5]}); }};
      K.flare(pl.x,pl.gy,BODY*.6,{pal:P,s:100,dur:.2,gain:1}); K.dust(pl.x,pl.gy,{n:3,dir:a+Math.PI,spread:.7,sp:[150,400],a:.35}); const lamp=GFX.light(p.x,p.y,460,PJ.l,.6,.3,{hold:1.8,z:60});
      const tail=K.vjet(p.x,p.y,p.h+30,a+Math.PI,{len:520,r:95,r0:60,dur:1.85,pal:SPV,heat:.85,turb:.5,speed:6,in:.25,out:.2,gain:.8});
      if(F.on) GFX.add(1.85,(q,t)=>{ if(p.life<=0){ lamp.hold=0; tail.dead=true; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp; lamp.x=p.x; lamp.y=p.y;
        tail.x=p.x-ux*20; tail.y=p.y-uy*20; tail.dir=Math.atan2(uy/FSY,ux)+Math.PI;
        if(!K.vok||!K.vok()) F.ribbon(b.trB,[{x:p.x-ux*520,y:p.y-uy*520,z:p.h,w:10},{x:p.x-ux*300,y:p.y-uy*300,z:p.h,w:50},{x:p.x-ux*60,y:p.y-uy*60,z:p.h,w:74}],{...C,gain:1.5,a:.7*sat(t/.3),t0:sd});
        if(!gif('fx_shaman_wolf',t+sd,p.x,p.y,p.h+40,230,Math.atan2(uy,ux),ux<0?-1:1,sat(t/.22))) F.bill(b.glowO,p.x,p.y,p.h,90,90,0,{...C,gain:2.6});
        if(Math.random()<.25) K.dust(p.x-ux*80,p.y-uy*80,{n:1,dir:Math.atan2(uy,ux)+Math.PI,spread:.6,sp:[100,300],a:.3,s:.7}); });
      V.pj.push(p); }); }},
  // SPIRIT HAND: its shadow gathers, the hand slaps flat onto the crowd, the floor rolls away from under it as a wall of dust,
  // and the hand itself goes up as vapour, leaving its print burning in the floor
  sh_palm:{fn(id){ const t=densest(560); if(!t) return false; const d=D(id), [tx,ty]=X.inView(t.x,t.y,.38); face(angTo(t)); pray(); sfx('rise',.7,.6);
    // the hand never comes down on top of him: if the crowd is at his feet it lands beside him (the damage stays where the crowd is)
    const near=Math.abs(tx-pl.x)<280&&ty>pl.gy-300&&ty<pl.gy+340, x=near?pl.x+(tx>=pl.x?1:-1)*300:tx, y=ty;
    const slam=(k,at)=>{ const hitAt=at;
      K.shock(x,y,{r0:560,r:140,dur:.34,pal:P,gain:.6,light:0,dust:0,haze:.3,th:.6,delay:Math.max(0,at-.5)}); palmFall(x,y,{s:430,delay:hitAt-.34,fall:.34,h0:1700,pre:.16,rz:k?.3:-.2,scar:3});
      after(hitAt,()=>{ slamFx(x,y,.8); K.crack(x,y,{alt:1,r:450,pal:P,life:3,grow:.1,gain:.5}); trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
        inCircle(tx,ty,400,o=>{ dmg(o,d*(k?.6:1),{kb:1.6,big:true,stun:.6,sx:tx,sy:ty}); hitFx(o,C1,1.4); }); }); };
    slam(0,.5); if(EVO(id)) slam(1,1.15); }},
};
// what a palm does to the floor it lands on (k = scale): the painted shock front as the sharp edge, a thick roll of dust as its body,
// slabs of floor thrown up, and the hand's own light leaving as vapour
function slamFx(x,y,k=1,o={}){ if(F.ready('v3_flip_shock')) K.flip(x,y,{tex:'v3_flip_shock',floor:true,s:820*k,dur:.5,pal:SP,gain:.8,s0:.35,rot:rand(0,TAU)}); else K.art(x,y,{tex:TX('v3_shock_thick','fx3_shock'),floor:true,s:860*k,dur:.6,pal:SP,gain:.85,hold:.3,s0:.3,rot:rand(0,TAU)});
  dring(x,y,{r:800*k,r0:300*k,dur:.75,tube:.13,a:.55,...DB}); if(!o.quiet) K.vblast(x,y,{s:230*k,z:90*k,pal:SPV,heat:.7,smoke:.8,dur:1.2,fire:.25,rise:420*k,squash:1.5});
  GFX.ripple(x,y,1000*k,{life:.45,s:.7});
  K.chunks(x,y,{n:Math.round(5*k),r:300*k,sp:[300,800],up:1500,s:[30,64],pal:ST,rock:ROCK}); K.debris(x,y,{n:Math.round(8*k),r:260*k,sp:[250,1000],up:1400,size0:8,size:22,c:'#4c5a54'}); K.dust(x,y,{n:Math.round(6*k),r:300*k,sp:[400,1100],a:.4,c:'#2e2820'});
  K.sparks(x,y,40,{pal:P,n:Math.round(18*k),sp:[400,1700],up:1300,life:[.3,.8]}); if(o.light!==0) GFX.light(x,y,Math.min(1500*k,view().hw*1.6),PJ.l,Math.min(1.2,1.05*k),.5,{z:220}); }

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow
// everything standing near a landing is thrown up and outward a moment before the damage reaches it
function fling2(x,y,R){ for(const e of onScreen(300)){ if(e.dead||e.d.heavy) continue; const dx=e.x-x, dy=e.y-y, d=Math.hypot(dx,dy)||1; if(d>R) continue; const k=1-d/R*.5; e.vz=Math.max(e.vz,rand(900,1600)*k); e.kx+=dx/d*rand(300,700)*k; e.ky+=dy/d*rand(300,700)*k; e.stun=Math.max(e.stun,.8); } }
// MOUNTAIN: a floating crag built out of real stones: a heavy body, shoulders of smaller boulders round it, and roots of stone hanging
// from under it. Drawn every frame at (x, floor y, height of its underside z). o: {t, a, ero, sq (squash on contact), heat, sd}
const MT=[];
function mountain(x,y,z,S,o){ if(!MT.length){ const r=(a,b)=>a+Math.random()*(b-a);
    // [kind, variant, dx, dz, depth, size, rx, ry, rz, spin] in units of S; depth<0 = behind the body
    MT.push(['boulder',0,0,.95,0,1.5,.2,.1,.4,.05]);
    for(let i=0;i<5;i++){ const a=i/5*TAU+r(-.3,.3), bk=Math.sin(a)<0; MT.push(['boulder',i,Math.cos(a)*r(.52,.7),.95+r(-.12,.3),bk?-1:1,r(.55,.85),r(-1,1),r(-1,1),r(0,6),r(-.12,.12)]); }
    for(let i=0;i<5;i++){ const u=(i+.5)/5-.5; MT.push(['spike',i,u*1.05+r(-.06,.06),.62-Math.abs(u)*.2+r(-.04,.04),i%2?-1:1,r(.55,.8)*(1-Math.abs(u)*.5),Math.PI+r(-.2,.2),u*.5,r(0,6),0]); }
    MT.sort((p,q)=>p[4]-q[4]); }
  const t=o.t||0, sq=o.sq||0;
  for(const p of MT){ const s=S*p[5]*(o.sc||1), inv=p[0]==='spike';
    F.solid(p[0],p[1],x+p[2]*S*(1+sq*.3),y,z+p[3]*S*(1-sq*.45),{M:inv?F.xf({s,rx:p[6],ry:p[7],rz:p[8]}):cxf(s,p[6]+t*p[9],p[7],p[8]+t*p[9]*2,1-sq*.35),alb:inv?'#2c3f3a':ROCK,emis:PJ.b,rimC:o.rimC||GD.h,spec:.5,rim:o.rim??.3,vein:.18+(o.heat||0)*.5,heat:0,ero:o.ero||0,bump:1.5,tone:.4,clip:0,a:o.a??1,ord:-.5+p[4]*.01}); } }
// STONE RAIN: a bell; the sealing circle writes itself thin across the floor and his eight talismans fly out to the eight directions and plant
// themselves. A pillar of spirit vapour goes up from him and the sky tears open over the top of the field. The stones come down sector by
// sector - real stones, tumbling, each landing in its own roll of dust and staying where it struck. Then the mountain hangs in the open sky with
// the eight talismans holding it: they burn off one by one, it drops, and it does not land - it bursts into slabs and a storm of dust.
function ultStones(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, R=hw*.9, stuck=[], ring=[], g0=GFX.gain;
  S([['gx04',.12,{kick:[-.8,.6]}],['gx07',1.6],['gx11',.12,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',2.6],['gx14',9]]);
  // ---- the hits (same count, places and times as ever; only their order follows the eight directions round the circle)
  const sec=(x,y)=>Math.floor((((Math.atan2((y-y0)/FSY,x-x0)+Math.PI/2)%TAU+TAU)%TAU)/(TAU/8))%8;
  const T=onScreen(100).sort(()=>Math.random()-.5).slice(0,22), pts=T.map(e=>[e.x,e.y]); while(pts.length<22) pts.push([x0+rand(-hw,hw)*.9,y0+rand(-hh,hh)*.85]);
  pts.sort((p,q)=>sec(p[0],p[1])-sec(q[0],q[1]));
  let at=2.0, gap=.22; const times=pts.map(()=>{ const t=at; at+=gap; gap=Math.max(.055,gap*.86); return t; });
  const tc=at+.05, mx=x0, my=y0-hh*.2, lead=tc+.72, BS=900, Hh=560, tF=lead-.2, tB=i=>tc+.3+i*.042, gx=x0, gy=y0, gz=2250, GR=1500;
  // ---- omen: close on him; the circle writes itself, the talismans circle once and fly out to their posts; vapour starts to turn round him
  GFX.ambient(.5,.58,.56,3.5); const spot=GFX.light(x0,y0,620,PJ.l,.8,.6,{hold:9,z:150});
  Cn.zoom(1.42); Cn.tilt(.08,3); Cn.cam(x0,y0-BODY,5); SFX.bell(); Cn.SND.gong(.8); SFX.rumble(1.7);
  const sig=K.sigil(x0,y0,{r:140,dur:12,in:1.2,out:.5,spin:.3,pal:SG,gain:.7,hole:.16,tex:'fx_circle_seal'}); sig.a=.4;
  GFX.add(1.3,k=>{ sig.r=mix(140,R,eo3(k)); }); after(1.3,()=>{ sig.r=R; });
  for(let i=0;i<10;i++) after(i*.15,()=>Cn.shake(.12));
  const tw=K.vfunnel(x0,y0,{r:300,r0:210,h:300,dur:1.95,rise:1.5,out:.2,pal:SPV,spin:3,thick:.07,heat:.7,gain:.7,streak:1}); tw.a=.28; GFX.add(1.8,k=>{ tw.h=mix(300,1100,k*k); tw.r=mix(300,420,k); });
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
  // ---- release: the vapour round him goes up into the sky as one twisting pillar, the posts answer, and the sky is open
  after(1.82,()=>{ spot.hold=0; spot.life=.3; for(let i=0;i<8;i++){ const [bx,by]=pst(i); pulse[i]=RT; K.sparks(bx,by,90,{pal:GD,n:5,sp:[60,300],up:2600,g:600,life:[.4,.9]}); K.flare(bx,by,110,{pal:GD,s:110,dur:.3,gain:2}); }
    K.vcolumn(x0,y0-30,{r:120,h:2500,dur:1.35,rise:.2,out:.6,pal:P,heat:.95,twist:3.4,turb:.6,taper:.25,speed:5}); K.flare(x0,y0,BODY*1.9,{pal:P,s:220,dur:.35,gain:2.2}); sig.a=.3; for(let q=1;q<=6;q++) after(q*.08,()=>{ sig.r=mix(R,R*.5,eo3(q/6)); sig.a=mix(.3,.22,q/6); });
    dring(x0,y0,{r:hw*.8,r0:200,dur:.8,tube:.1,a:.6,...DGy}); GFX.ripple(x0,y0,hw*1.5,{life:.45,s:.6});
    K.sparks(x0,y0,BODY,{pal:P,n:30,sp:[400,1500],up:1700}); K.debris(x0,y0,{n:8,r:120,sp:[250,800],up:900,c:'#4c6a60'});
    GFX.light(x0,y0,hw*1.2,PJ.l,.9,.5,{z:260}); GFX.ambient(.46,.52,.52,5); Cn.shake(.7); post.ca=.01; SFX.boom(1.4,.5); Cn.SND.shing(.7,.4); Cn.SND.gong(.7); Cn.zoom(.68); Cn.tilt(.21,4); Cn.cam(null); });
  // ---- the sky tears open over the top of the field, turns slowly, and closes behind the mountain
  const sky={open:1.82,close:99};
  if(F.on){ const m=LM(); GFX.add(9,(k,t)=>{ const i=sat((t-sky.open)/.6), c=sat((t-sky.close)/.5); if(i<=0||c>=1) return; const pu=.85+.15*Math.sin(t*5), rr=GR*(.8+.2*eo3(i))*(1-c*.25);
      F.quad(m.gate,gx,gy,rr,rr,t*(.22+c*2)+c*c*2,{z:gz,a:(1-c*c)*sat(i*2),gain:.9*pu,ero:.05+c*.6,rv:[.05+i*1.5,.3,0,.1]}); }); }
  const lampG=GFX.light(gx,gy-500,hw*1.3,GD.l,.0,.5,{hold:9,z:400}); after(1.82,()=>{ lampG.a=.4; });
  // ---- the rain: direction by direction; the post of that direction calls each stone out of the gate and it tumbles down onto its mark
  pts.forEach(([x,y],i)=>{ const hitAt=times[i], k8=sec(x,y), px=gx+rand(-750,750), py=gy-gz+rand(60,560), near=Math.abs(x-x0)<230&&y>y0-40&&y-y0<330, s=near?rand(80,105):rand(105,180), slow=i<10;
    const st=boulder(x,y,{s,h0:Math.max(900,y-py),dur:.38,delay:hitAt-.38,vx:px-x,emerge:1,stay:9,lite:s<158}); stuck.push(st); if(near) st.t1=RT+hitAt+.5;
    after(hitAt-.38,()=>{ pulse[k8]=RT; });
    after(hitAt,()=>{ thud(x,y,s,{ring:slow||i%2===0?1:0,smoke:slow?(i%2?1:0):(i%4===1?1:0),grey:i%3===0,n:5}); if(s>150&&i<9) K.chunks(x,y,{n:3,r:50,sp:[250,700],up:1300,s:[26,50],pal:ST,rock:ROCK,life:1.2});
      SFX.boom(.9+Math.random()*.3,.55); Cn.shake(.38+i*.012); hitstop=Math.max(hitstop,.018); inCircle(x,y,230,o=>ultHit(o,Dm*.4,x,y)); }); });
  // ---- the mountain: announced by its shadow and a pool of light, held in the sky by the eight talismans, let go one by one
  let bind=null;
  after(tc,()=>{ GFX.ambient(.46,.48,.5,5); Cn.zoom(.58); Cn.tilt(.28,4); Cn.SND.inhale(.7,.7); duck(.2,.6); for(let q=1;q<=4;q++) after(q*.07,()=>{ sig.a=.22*(1-q/4); if(q===4) sig.dead=true; }); Cn.cam(mx,my-520,5);
    bind=K.sigil(mx,my,{r:BS*.8,dur:lead-tc+2.1,in:.4,out:.8,spin:1.1,pal:SP,tex:'fx_circle_seal',gain:.7,hole:.1}); bind.a=.75; GFX.light(mx,my,900,PJ.l,.7,.3,{hold:.72,z:200});
    // it comes through the gate wrapped in cloud, which it sheds
    K.vsmoke(mx-BS*.5,my,{s:520,z:Hh+BS*.5,dur:1,rise:-200,a:.55,...DGy}); K.vsmoke(mx+BS*.45,my,{s:460,z:Hh+BS*.7,dur:.9,rise:-160,a:.5,...DGy}); });
  for(let i=0;i<8;i++) after(tB(i),()=>{ const an=i/8*TAU, hx=mx+Math.cos(an)*BS*.62, hz=mz(tB(i))+BS*(1+Math.sin(an)*.55); K.sparks(hx,my,hz,{pal:GD,n:7,sp:[300,1100],up:500,life:[.25,.6]}); K.flare(hx,my,hz,{pal:GD,s:150,dur:.2,gain:2}); Cn.shake(.3+i*.05); Cn.SND.tick(1.6-i*.08,.3); });
  if(F.on){ const b=K.mats(), tA=tc+.04;
    GFX.add(lead-tA+.1,(k,t)=>{ const T_=tA+t, i=eo3(sat(t/.3)), an=sat((T_-tc)/.72), hit=T_>=lead, z=mz(T_), hot=sat((T_-tc-.25)/.4), q=sat((T_-tF)/.2);
      F.quad(b.dark,mx,my,BS*(1.5-.55*an),BS*(1.5-.55*an),0,{a:.2+.6*an*an});
      // jade from the seal under it on its belly; gold on its shoulders from the charms that hold it
      if(!hit) F.bill(b.glowO,mx,my,z+BS*.2,BS*.9,BS*.4,0,{...C,a:.4*sat(t/.2),gain:1.2,ord:-.7});
      mountain(mx,my,z+(1-i)*700,BS,{t:T_,sc:mix(.7,1,i),a:sat(t/.14),heat:hot,rim:.3+.3*q,sq:hit?sat((T_-lead)/.08):0,ero:hit?.25+(T_-lead)*6:0}); },tA); }
  after(tF,()=>{ sky.close=tF+.1; lampG.hold=0; GFX.ambient(.44,.44,.46,40); GFX.gain=g0*.5; if(bind) bind.a=.3; SFX.whoosh(.5,1); });
  // ---- contact: it bursts. Shock front, slabs, the floor breaking upward behind it, the crowd thrown - all on the one frame
  after(lead,()=>{ GFX.gain=g0; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; sig.dead=true; if(bind){ bind.a=1; bind.kick(); after(.4,()=>{ bind.a=.5; }); }
    // one hot core for two frames; the body of the burst is stone dust with spirit light inside it
    K.flare(mx,my,BS*.3,{pal:P,s:520,dur:.16,gain:2.6}); K.vblast(mx,my,{s:BS*.62,z:BS*.25,pal:SPV,heat:.6,gain:.8,smoke:1,dur:1.9,fire:.3,rise:BS*.7});
    dring(mx,my,{r:BS*1.9,r0:BS*.5,dur:1.1,tube:.12,a:.7,...DGy}); K.vsmoke(mx-BS*.7,my+40,{s:420,dur:1.7,rise:520,a:.7,delay:.1,...DGy}); K.vsmoke(mx+BS*.72,my+30,{s:380,dur:1.6,rise:460,a:.7,delay:.16,...DB});
    if(F.ready('v3_flip_shock')) K.flip(mx,my,{tex:'v3_flip_shock',floor:true,s:BS*1.25,dur:.55,pal:SP,gain:.85,s0:.3}); else K.art(mx,my,{tex:TX('v3_shock_thick','fx3_shock'),floor:true,s:BS*1.3,dur:.5,pal:SP,gain:.8,hold:.3,s0:.3});
    GFX.ripple(mx,my,hw*2,{life:.5,s:.9});
    if(F.on){ const m=LM(), cr=rand(0,TAU); GFX.add(5,(k,t)=>{ F.quad(m.crater,mx,my,BS*1.25,BS*1.25,cr,{a:sat(t/.05)*sat((1-k)/.3),gain:1.3*Math.exp(-t*1.6)+.25}); }); }
    K.crack(mx,my,{alt:1,r:BS*1.15,pal:P,life:4.2,grow:.1,gain:.6});
    // the floor breaks upward only behind the strike, so he is never fenced in
    if(K.upheave) K.upheave(mx,my,{r:BS*.66,n:5,s:340,a0:Math.PI+.2,a1:TAU-.2,pal:ST,dur:1.5,rise:.08,stagger:.008,rock:ROCK});
    // its pieces: real slabs thrown clear, and a few that land and stay
    K.chunks(mx,my,{n:6,r:BS*.45,sp:[500,1500],up:2300,s:[90,230],pal:ST,rock:ROCK,life:2.3});
    for(let i=0;i<6;i++){ const a=i/6*TAU+rand(-.3,.3), d=rand(BS*.75,BS*1.25), cx=mx+Math.cos(a)*d, cy=my+Math.sin(a)*d*FSY; if(Math.abs(cx-x0)<300&&cy>y0-60&&cy-y0<420) continue; ring.push(boulder(cx,cy,{s:rand(90,170),h0:rand(500,900),dur:rand(.3,.48),vx:(mx-cx)*.85,lead:0,stay:9,lite:1})); }
    K.debris(mx,my,{n:22,r:BS*.5,sp:[400,1700],up:2200,size0:14,size:40,c:'#4c5a54'}); K.sparks(mx,my,60,{pal:P,n:36,sp:[500,2200],up:1700,life:[.3,.9]});
    GFX.light(mx,my,hw*1.6,PJ.l,1.2,.45,{z:260});
    fling2(mx,my,BS*1.9);
    // every stone already in the earth answers, nearest first
    stuck.forEach((s,j)=>{ const d=Math.hypot(s.x-mx,s.y-my); after(.08+Math.min(.5,d/3400),()=>{ s.crumble(); K.sparks(s.x,s.y,40,{pal:P,n:5,sp:[200,700],up:1300}); }); });
    after(.3,()=>Cn.sweep(mx,my,Dm,{speed:3000,push:1.3})); Cn.SND.hit(1); Cn.SND.gong(1); SFX.boom(1.6,1); SFX.shatter(1); });
  // ---- aftermath, each thing on its own clock: the dust rolls off, motes of spirit light rise out of the crater, the slabs, the seal last
  after(lead+.6,()=>{ K.embers(mx,my,hw*.9,{pal:P,n:40,life:1.8}); GFX.ambient(.8,.9,.86,2); Cn.zoom(1); Cn.tilt(0,3); Cn.cam(null); });
  after(lead+1.15,()=>{ GFX.gain=g0; GFX.ambient(1,1,1,2.5); sig.dead=true; for(const s of stuck) s.dead=true; ultStop(); });
  after(lead+2.3,()=>{ for(const s of ring) s.crumble(); }); }

// SPIRIT KING: he only prays. Behind him a gold gate writes itself on the floor, fog rolls out of it, and something enormous rises inside a slow
// twister of spirit vapour, its robes thinning into the fog. Its eyes open. Four times it turns, and its own hand goes out from its shoulder on an
// arm of vapour, grows, and comes down flat on the crowd. Then it gathers everything into one shoulder, and the last hand goes out beside him and
// covers a third of the field: the floor breaks upward round it and pillars of spirit light go up between its fingers.
function ultKing(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, kx=x0, ky=y0-500, KS=670, g0=GFX.gain, st={pt:-9,out:-1,done:false,l0:0,l1:0,lt:-9,sd:rand(0,9)};
  const leanNow=()=>mix(st.l0,st.l1,eo3(sat((RT-st.lt)/.26))), act=(l)=>{ st.l0=leanNow(); st.l1=l; st.lt=RT; st.pt=RT; }, sh=side=>[kx+side*KS*.6+leanNow()*KS*1.2,ky,KS*1.18];
  S([['gy01',.12],['gy02',.18],['gy03',.25],['gy04',.7],['gy05',.7],['gy06',.12,{kick:[-.8,.6]}],['gy07',.2],['gy08',.7],['gy09',.7],['gy10',.8],['gy11',.18,{kick:[1.6,-1.2]}],['gy12',.7],['gy13',.8],['gy14',9]]);
  // ---- omen: close on him and what rises behind him; the camera keeps drifting back so the rise is never a still
  GFX.ambient(.5,.58,.58,3); Cn.zoom(1.3); Cn.tilt(.1,3); Cn.cam(x0,y0-BODY*4,4); SFX.choir(5.2); SFX.bell(); Cn.drone(49,.3);
  after(.7,()=>{ Cn.zoom(1.12); Cn.tilt(.14,1.5); Cn.cam(x0,y0-BODY*5,1.5); }); after(1.3,()=>{ Cn.zoom(.98); Cn.tilt(.17,1.5); });
  const gate=K.sigil(kx,ky,{r:hw*.6,dur:12,in:1.1,out:.6,spin:-.16,pal:SG,tex:SEAL(),gain:.55,hole:.12}); gate.a=.6;
  const lamp=GFX.light(kx,ky,hw*1.4,PJ.l,.05,.8,{hold:12,z:300});
  // fog rolls out of the gate along the floor, twice; a slow twister stands up round the place he will rise
  dring(kx,ky,{r:hw*.8,r0:160,dur:1.7,tube:.1,a:.6,delay:.3,...JV}); dring(kx,ky,{r:hw*.7,r0:160,dur:1.6,tube:.12,a:.55,delay:1.05,...JV});
  const tw=K.vfunnel(kx,ky-20,{r:470,r0:330,h:500,dur:2.25,rise:.6,out:.35,pal:SPV,spin:2.6,thick:.07,heat:.7,gain:.7,sway:.04,streak:1,delay:.2}); tw.a=.45;
  GFX.add(2,k=>{ tw.h=mix(500,1500,eo3(k)); tw.r=mix(470,640,k); },.25);
  for(let i=0;i<6;i++) after(.4+i*.24,()=>{ Cn.shake(.1+i*.03); gate.kick(); K.sparks(kx+rand(-400,400),ky+rand(-40,60),20,{pal:i%2?GD:P,n:5,sp:[40,200],up:1900,g:500,life:[.5,1.1]}); });
  // fog round its feet the whole time it stands
  if(!F.low) for(let i=0;i<3;i++) after(.25+i*.6,()=>{ if(st.out<0) K.vsmoke(kx+(i%2?1:-1)*rand(260,470),ky+rand(-30,40),{s:rand(240,300),dur:1.9,a:.3,rise:120,...JV}); });
  for(let i=0;i<13;i++) after(i*.42,()=>{ K.embers(x0,y0-200,hw,{pal:P,n:8,life:2.4,up:320}); if(i>1&&st.out<0) K.embers(kx,ky,340,{pal:i%2?GD:P,n:6,life:2.2,z:1100,up:300}); });
  // the king: rising out of the floor, breathing, turning toward each strike
  if(F.on){ const m=LM(), b=K.mats(); GFX.add(12,(k,t)=>{ if(st.done) return; const i=sat((t-.3)/1.5), f=st.out<0?0:sat((RT-st.out)/.8), pu=Math.exp(-(RT-st.pt)*3.5); if(f>=1){ st.done=true; lamp.hold=0; return; }
      const ln=leanNow(), s=KS*(.78+.22*eo3(i))*(1+.02*Math.sin(t*2.3)+pu*.035), z0=Math.sin(t*1.3)*10+f*260-(1-eo3(i))*620, vis=Math.pow(sat(i*1.5),1.3)*(1-f*f);
      lamp.a=(.2+.5*i+pu*.35)*(1-f);
      F.quad(b.dark,kx,ky,470,470,0,{a:.6*i*(1-f)}); F.quad(b.glowG,kx,ky,640,640,0,{...C,a:(.3+.3*pu)*i*(1-f),gain:.9});
      kingDraw(kx,ky,s,{z0,a:.9*vis,ero:Math.max(.42-i*1.1,f*.8-.05),gain:.82+.35*pu,lean:ln,turn:Math.min(1.5,Math.abs(ln)/.22),yaw:-.2+ln*1.5}); }); }
  // ---- release: its eyes open; the twister lets go as a roll of vapour; the camera pulls wide
  after(1.95,()=>{ st.pt=RT; K.flare(kx,ky,KS*1.62,{pal:P,s:240,sx:3,sy:.3,dur:.5,gain:4}); K.flare(kx,ky,KS*1.62,{pal:GD,s:340,dur:.6,gain:1.6}); dring(kx,ky,{r:hw*1.05,r0:400,dur:1,tube:.1,a:.75,...JV}); GFX.ripple(kx,ky,hw*1.5,{life:.5,s:.6});
    K.sparks(kx,ky,60,{pal:P,n:30,sp:[300,1400],up:2000,life:[.4,1]}); K.dust(kx,ky,{n:10,r:300,sp:[400,1000],c:'#2c3835'});
    GFX.ambient(.46,.52,.54,5); Cn.shake(.7); post.ca=.01; Cn.zoom(.64); Cn.tilt(.25,4); Cn.cam(x0,y0-BODY*1.2,5); SFX.roar(1.1,.5); Cn.SND.gong(.9); SFX.boom(1.4,.5); });
  // ---- four hands: it turns, and its own hand goes out from the shoulder on an arm of vapour and comes down flat. None lands on him.
  const T=onScreen(150), spots=[]; for(let i=0;i<4;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null; let [sx,sy]=e?X.inView(e.x,e.y,.75):[x0+rand(-hw,hw)*.7,y0+rand(-hh,hh)*.7];
    const hx=sx, hy=sy; if(Math.abs(sx-x0)<470&&sy>y0-330&&sy<y0+560) sx=x0+(sx>=x0?1:-1)*rand(480,560); spots.push([sx,sy,hx,hy]); }
  let at=2.35;
  spots.forEach(([x,y,hx,hy],i)=>{ const hitAt=at, side=x>=kx?1:-1, fall=.4;
    after(hitAt-.34,()=>act(side*.34));
    after(hitAt-.46,()=>{ GFX.light(x,y,700,PJ.l,.7,.2,{hold:.42,z:150}); Cn.cam(lerp(x0,x,.35),lerp(y0,y,.35)-BODY,6); sfx('whoosh',.5,.9); });
    after(hitAt-fall,()=>{ const f=sh(side); K.flare(f[0],f[1],f[2],{pal:P,s:150,dur:.3,gain:2.2}); palmFall(x,y,{s:500,fall,from:f,arc:520,s0:.3,aw:70,pre:0,rz:(y>ky+200?Math.PI:0)+(i%2?1:-1)*rand(.1,.35),scar:3}); });
    if(F.on) GFX.add(.46,(k)=>{ F.quad(K.mats().dark,x,y,265*(.6+.9*k),500*(.6+.7*k),0,{a:.12+.5*k*k}); },hitAt-.46);
    after(hitAt,()=>{ slamFx(x,y,1,{quiet:i%2}); K.crack(x,y,{alt:1,r:520,pal:P,life:3,grow:.1,gain:.5}); Cn.shake(.85); hitstop=Math.max(hitstop,.06); Cn.SND.hit(.6); post.ca=.008; V.blast={x,y,p:1}; inCircle(hx,hy,480,o=>ultHit(o,Dm*.5,hx,hy)); });
    after(hitAt+.2,()=>{ st.l0=leanNow(); st.l1=0; st.lt=RT; });
    at+=Math.max(.3,.44-i*.05); });
  // ---- the gathering: everything it has left winds into one shoulder (a bead that swells), the gate spins up, motes fall into it
  const tc=at+.25, sd=Math.random()<.5?1:-1, bx=x0+sd*740, py=y0+250, by=y0-hh*.12, tH=tc+.58, GL=940, tG=tH-.5, t0g=spots.length?at-.3+.12:at;
  { const f0=sh(sd), orb=K.vorb(f0[0],f0[1],f0[2],{r:40,dur:tG-t0g+.1,pal:P,spin:7,core:.2,in:.1,out:.1,gain:1.1,delay:t0g}), spin=K.vfunnel(kx,ky-20,{r:460,r0:200,h:1700,dur:tG-t0g+.35,rise:.25,out:.3,pal:SPV,spin:9,thick:.06,heat:.85,gain:.9,streak:1.2,delay:t0g}); spin.a=.8;
    GFX.add(tG-t0g+.1,k=>{ const f=sh(sd); orb.x=f[0]; orb.z=f[2]; orb.r=mix(40,300,k*k); },t0g);
    after(t0g,()=>{ act(sd*.12); gate.kick(); Cn.zoom(.62); Cn.tilt(.27,3); Cn.cam(kx,ky-260,7); SFX.rumble(.8); K.shock(kx,ky,{r0:hw*1.1,r:260,dur:.5,pal:P,gain:.6,light:0,dust:0,haze:.4,th:.6}); const lg=GFX.light(kx+sd*400,ky,900,PJ.l,.2,.3,{hold:tG-t0g,z:700}); GFX.add(tG-t0g,k=>{ lg.a=.2+.7*k; }); });
    for(let i=0;i<16;i++) after(t0g+i*(tG-t0g)/16,()=>{ const f=sh(sd), a=rand(0,TAU), r=rand(500,900), q=.38; Cn.shake(.06+i*.02); if(i%4===0) gate.kick();
      GFX.pt({x:f[0]+Math.cos(a)*r,y:f[1],z:f[2]+Math.sin(a)*r*.7,vx:-Math.cos(a)*r/q,vy:0,vz:-Math.sin(a)*r*.7/q,g:0,drag:0,life:q,s:rand(4,8),m:3,len:.07,c:GFX.rgb(i%3?PJ.s:GD.s),c2:PJ.b,c3:PJ.h,L:3}); }); }
  // ---- climax: the hand goes out beside him, growing, its shadow and a pool of light on the field before it
  after(tc,()=>{ Cn.zoom(.58); Cn.tilt(.28,4); Cn.cam(lerp(x0,bx,.3),y0+40,6); GFX.ambient(.46,.48,.5,5); Cn.SND.inhale(.55,.7); act(sd*.26); duck(.2,.5); GFX.light(bx,py,900,PJ.l,.7,.3,{hold:.58,z:200}); });
  if(F.on) GFX.add(.58,(k)=>{ F.quad(K.mats().dark,bx,py,GL*.53*(.5+1*k),GL*(.5+.8*k),0,{a:.15+.55*k*k}); },tc);
  after(tG,()=>{ const f=sh(sd); K.flare(f[0],f[1],f[2],{pal:P,s:260,dur:.3,gain:2.6}); K.sparks(f[0],f[1],f[2],{pal:P,n:16,sp:[300,1200],up:300,life:[.2,.5]}); palmFall(bx,py,{s:GL,fall:.5,from:f,arc:1150,s0:.22,aw:110,hold:.3,out:.5,scar:3.4,rz:Math.PI-sd*.35}); });
  after(tH-.2,()=>{ GFX.ambient(.44,.44,.46,40); GFX.gain=g0*.5; gate.a=.3; });
  // ---- contact: shock, slabs, the floor breaking upward round the hand, the crowd thrown - on the one frame; then the pillars, one after another
  after(tH,()=>{ GFX.gain=g0; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; act(0); gate.a=.9; gate.kick();
    slamFx(bx,py,1.8,{quiet:1,light:0}); K.flare(bx,py,120,{pal:GD,s:420,dur:.16,gain:2.4}); GFX.light(bx,py,hw*1.6,PJ.l,1.2,.45,{z:260});
    if(F.on){ const m=LM(), cr=rand(0,TAU); GFX.add(4.5,(k,t)=>{ F.quad(m.crater,bx,py,GL*1.05,GL*1.05,cr,{a:.8*sat(t/.05)*sat((1-k)/.3),gain:1.2*Math.exp(-t*1.6)+.2}); }); }
    K.crack(bx,py,{alt:1,r:GL*1.05,pal:P,life:4,grow:.1,gain:.55});
    // the floor breaks upward on the far side of the hand from him
    const ca=sd>0?-.25:Math.PI+.25; if(K.upheave) K.upheave(bx,py,{r:GL*.74,n:7,s:300,a0:ca-1.25,a1:ca+1.25,pal:ST,dur:1.4,rise:.08,stagger:.008,rock:ROCK});
    // spirit light goes up between the fingers: three pillars, back to front, each a different height
    [[-.42,-.5,1900,230,.07],[.38,-.28,1450,190,.2],[-.05,.3,1050,160,.33]].forEach(([ux,uy,h,r,dl],j)=>{ const cx=bx+ux*GL*.8, cy=py+uy*GL*FSY;
      K.vcolumn(cx,cy,{r,h,dur:1.05-j*.08,rise:.12,out:.5,pal:j===1?GD:P,heat:.9,twist:2.8,turb:.8,taper:.12,speed:4.5,delay:dl});
      after(dl,()=>{ Cn.shake(.5); K.sparks(cx,cy,60,{pal:j===1?GD:P,n:12,sp:[150,700],up:2600,g:900,life:[.4,.9]}); GFX.light(cx,cy,800,j===1?GD.l:PJ.l,.8,.4,{z:400}); sfx('boom',1.3+j*.15,.5); }); });
    fling2(bx,py,GL*1.7);
    after(.3,()=>Cn.sweep(x0,by,Dm,{speed:3200,push:1.2})); Cn.SND.hit(1); SFX.boom(1.6,1); SFX.shatter(1); });
  // ---- afterglow: it goes back up as a column of vapour; the bell again; the print stays pressed into the floor
  after(tc+1.25,()=>{ st.out=RT; SFX.bell(.7); const up=K.vcolumn(kx,ky-10,{r:230,h:1900,dur:1.15,rise:.5,out:.55,pal:SPV,heat:.68,twist:1.6,turb:.6,taper:.3,speed:4,gain:.8}); up.a=.55;
    K.embers(bx,py,hw*.6,{pal:P,n:30,life:2}); K.embers(kx,ky,400,{pal:P,n:24,life:2.2,z:1000,up:420}); GFX.ambient(.8,.9,.86,2); Cn.zoom(1); Cn.tilt(0,3); Cn.cam(null); gate.a=.4; });
  after(tc+2.05,()=>{ GFX.gain=g0; GFX.ambient(1,1,1,2.5); gate.dead=true; ultStop(); }); }

X.reg('shaman',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('sh_basic')-1))},skills:SKILL,ults:{sh_ult1:ultStones,sh_ult2:ultKing}});
})();
