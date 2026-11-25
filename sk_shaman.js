// 참광 survival - SHAMAN skill set (top-down, all automatic). Jade spirits, seals and falling stone. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js) plus a few local pieces (bead, stream, charge, spike, strand, sealStone/stampFall; dring, thud, boulder for stone).
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,sfx,view,onScreen,ultStart,ultStop,ultHit,heal}=X;
const K=K3, F=FX3, P='jade', PJ=K3.PAL.jade, C={cA:PJ.d,cB:PJ.b,cC:PJ.h,cM:PJ.m}, {sat,mix,eo3,eo5}=K3;
const SP={d:'#02281c',b:'#10b07c',m:'#5ef0c0',h:'#8dffd6',l:'#30ffb0',s:'#b8ffe0'};
// gold is only for the bars of the binding cage; everything else he calls is jade
const GD={d:'#3a1c00',b:'#f0a818',m:'#ffe27a',h:'#fff6d8',l:'#ffc040',s:'#ffe9a0'};
// broken floor lit by jade: stone first, the colour only on its edges
const ST={d:'#050308',b:'#2f8a6c',m:'#6fd8b0',h:'#bff0dc',l:'#30ffb0',s:'#b8ffe0'};
const HEAL={d:'#04280c',b:'#3cf07a',m:'#c8ffa0',h:'#f2ffe8',l:'#55ff9a',s:'#c8ffd0'};
// ghost fire: the one cold blue he has, for the fires that circle him
const WSP={d:'#03182c',b:'#1c8fd0',m:'#7fdcff',h:'#e6fbff',l:'#48c0ff',s:'#c8f2ff'};
const C1='#3dffb0';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const fling=b=>S([['gb03',.04],['gb04',.05],['gb05',.06,{kick:[-.9,.7]}],['gb06',.05,{kick:[1.4,-1]}],['gb07',.08],['gb09',.07],['gb12',.05]],b);
const raise=()=>S([['gx04',.08,{kick:[-.8,.6]}],['gx07',.25],['gx11',.1,{kick:[-1,.8]}],['gx12',.08,{kick:[2,-1.6]}],['gx13',.25],['gx14',.1]]);
const pray=()=>S([['gy02',.1],['gy04',.35],['gy06',.08,{kick:[-.8,.6]}],['gy08',.3],['gy11',.1,{kick:[1.6,-1.2]}],['gy12',.2],['gy14',.1]]);
if(F&&F.on) for(const t of ['v3_burst_lotus','v3_shock_thick','v3_fissure_b','v3_crater','fx3_bolt']) F.img(t);

// ============================================================ local kit
// materials for the falling stones (shared with the ultimates)
let LM_=null;
function LM(){ if(LM_) return LM_; const m=F.mat, b=K.mats();
  LM_={
    // the painted crater as a dark decal under whatever has landed, its cracks still lit for a moment
    crater:m({tex:'v3_crater',nk:0,pw:.75,ero:.16,soft:.3,cA:'#010302',cB:'#0c1614',cM:'#1c6a52',cC:'#8dffd6',rk:[.6,1.12],gain:1.2,bgain:1,op:1,layer:'g'}),
    // a small sealing mark on the floor where something is about to land (only with boulder's lead > 0)
    mark:m({...b.sig,tex:'fx_circle_seal'}),
  }; return LM_; }
// dust is the colour of the earth (brown, grey); what the spirits leave is dark jade vapour
const DB={c:'#1c1814',c2:'#85776a'}, DGy={c:'#151716',c2:'#7c8680'}, ROCK='#3d524c';
// the pale spirit: jade with almost no white in it, for the big slow volumes
const SPV={d:'#011a13',b:'#0c9a70',m:'#4fe0b4',h:'#a8ffe0',l:'#30ffb0',s:'#b8ffe0'};
// thin lines of spirit light carry a white heart: jade outside, white down the middle
const CW={cA:PJ.b,cB:PJ.m,cM:PJ.h,cC:'#ffffff'};
// the middle of a body, wherever it is now (on the floor or in the air)
const ez=e=>(e.h||170)*.5+(e.z||0);
// the head of his staff
const tip=()=>({x:pl.x+pl.f*BODY*.14,y:pl.gy,z:BODY*1.28}), hand=()=>({x:pl.x+pl.f*BODY*.42,y:pl.gy,z:BODY*.78});
// a cast called while its cooldown is still running is a showing (practice room, capture): it is thrown ahead of him when nothing stands in reach
const demo=id=>(V.cd[id]||0)>0, ahead=r=>({x:pl.x+pl.f*r,y:pl.gy,h:170,z:0,dead:false,fake:1});
// CAST: every skill starts at the staff: a bead of light on its head that swells and lets go, a cross of light through it, the floor under him lit
function cast(o={}){ if(!F.on) return; const b=K.mats(), dur=o.dur||.32, s=o.s||1, PL=o.pal||PJ, CC={cA:PL.b,cB:PL.m,cM:PL.h,cC:'#ffffff'}, lamp=GFX.light(pl.x,pl.gy,440*s,PL.l,.5,.2,{hold:dur,z:BODY});
  GFX.add(dur,k=>{ const p=o.hand?hand():tip(), g=Math.sin(Math.PI*Math.min(1,k*1.1)), r=(26+50*g)*s; lamp.x=pl.x; lamp.y=pl.gy;
    F.bill(b.glowO,p.x,p.y,p.z,r,r,0,{...CC,a:g,gain:3});
    F.bill(b.glowO,p.x,p.y,p.z,r*2.8,r*.2,0,{...CC,a:g*.8,gain:2.2});
    F.quad(b.glowG,pl.x,pl.gy,170*s,170*s,0,{cA:PL.d,cB:PL.b,cM:PL.m,cC:PL.h,a:.55*g,gain:1}); },o.delay||0); }
// SKYLINE: a thread of light let go upward from the staff: his call to what is about to come down
function skyline(o={}){ if(!F.on) return; const b=K.mats(), dur=o.dur||.34, H=o.h||1500, PL=o.pal||PJ, CC={cA:PL.b,cB:PL.m,cM:PL.h,cC:'#ffffff'}, sd=rand(0,9);
  GFX.add(dur,(k,t)=>{ const p=tip(), g=eo3(sat(t/(dur*.55))), f=sat((t-dur*.45)/(dur*.55)), ps=[]; for(let i=0;i<6;i++){ const u=mix(f,g,i/5); ps.push({x:p.x+Math.sin(u*7+sd)*16,y:p.y,z:p.z+u*H,w:(o.w||26)*(.35+.65*Math.sin(Math.PI*i/5))}); }
    F.ribbon(b.trB,ps,{cA:PL.d,cB:PL.b,cC:PL.h,cM:PL.m,gain:2.4,a:1-f*f,t0:sd,fd:[.06,.04,0,0]}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.4})),{...CC,gain:4,a:1-f,t0:sd,fd:[.06,.04,0,0]}); },o.delay||0); }
// STRIKE: the body is thrown first and the damage comes a moment later, so what dies is seen to fly before it goes
function strike(e,d,o={},dl=.14){ if(!e||e.dead||e.fake) return; K.knock(e,{from:[o.sx??pl.x,o.sy??pl.gy],dir:o.dir,dist:o.push||0,up:o.up||0,stun:Math.max(o.stun||0,dl+.12)}); e.flash=Math.min(e.flash,.5);
  after(dl,()=>{ if(!e.dead) dmg(e,d,{kb:0,big:o.big,stun:o.stun,sx:o.sx,sy:o.sy}); }); }
// BEAD: a small hit that sits on the body it struck: a bead of spirit plasma that swells and bursts, a white heart in it, sparks thrown on the way the blow went
let beadT=-1, beadN=0;
function bead(e,s=1,dir){ if(!e) return; if(RT-beadT>.06){ beadT=RT; beadN=0; } if(beadN++>=3){ hitFx(e,C1,.8); return; } const b=K.mats(), o=K.vorb(e.x,e.y,ez(e),{r:46*s,dur:.15,pal:P,spin:6,core:.2,in:.03,out:.06,gain:.9});
  if(F.on) GFX.add(.15,k=>{ o.x=e.x; o.y=e.y; o.z=ez(e); const r=20*s*(1+1.2*k); F.bill(b.glowO,e.x,e.y,o.z,r,r,0,{...CW,a:(1-k)*(1-k),gain:3.2}); });
  K.sparks(e.x,e.y,ez(e),{pal:P,n:Math.round(6*s),dir,spread:.6,sp:[300,1000],up:260,life:[.15,.35],s:3}); GFX.light(e.x,e.y,230*s,PJ.l,.45,.2,{z:80}); }
// SWING: the band of light the head of the staff leaves in the air as he throws: an arc round him that ends on the way the throw goes (a = world angle)
function swing(a,PL=PJ,s=1){ if(!F.on) return; const b=K.mats(), CC={cA:PL.d,cB:PL.b,cC:PL.h,cM:PL.m}, CH={cA:PL.b,cB:PL.m,cM:PL.h,cC:'#ffffff'}, sd=rand(0,9), ta=Math.atan2(Math.sin(a)/FSY,Math.cos(a)), sg=Math.cos(a)>=0?1:-1, R=200*s;
  GFX.add(.26,(k,t)=>{ const g=eo3(sat(t/.1)), f=sat((t-.1)/.16), ps=[]; for(let i=0;i<9;i++){ const u=mix(f,g,i/8), aa=ta+sg*(u-1)*1.9; ps.push({x:pl.x+Math.cos(aa)*R*(.7+.3*u),y:pl.gy+Math.sin(aa)*R*(.7+.3*u)*FSY,z:BODY*(1.15-.5*u),w:(8+78*Math.sin(Math.PI*i/8))*s}); }
    F.ribbon(b.trB,ps,{...CC,gain:2.3,a:1-f*f,t0:sd,fd:[.1,.05,0,0]}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.34})),{...CH,gain:3.8,a:1-f,t0:sd,fd:[.1,.05,0,0]}); }); }
// RAYS: a star of short white-hearted lines thrown out over the floor from a burst (its sharp edge)
function rays(x,y,z,o={}){ if(!F.on) return; const b=K.mats(), n=o.n||8, R=o.r||340, dur=o.dur||.2, PL=o.pal||PJ, CC={cA:PL.d,cB:PL.b,cC:PL.h,cM:PL.m}, CH={cA:PL.b,cB:PL.m,cM:PL.h,cC:'#ffffff'}, L=[]; let a=rand(0,TAU); for(let i=0;i<n;i++){ a+=TAU/n*rand(.7,1.3); L.push([a,rand(.6,1),rand(-.2,.5)]); }
  GFX.add(dur,(k,t)=>{ const g=eo3(k), f=sat((k-.35)/.65); for(const [aa,len,up] of L){ const r0=R*len*mix(.1,.42,g), r1=R*len*mix(.3,1,g), ps=[]; for(let i=0;i<4;i++){ const r=mix(r0,r1,i/3); ps.push({x:x+Math.cos(aa)*r,y:y+Math.sin(aa)*r*FSY,z:z+up*r*.5,w:(o.w||38)*Math.sin(Math.PI*(i+.5)/4)*(1-f)}); }
      F.ribbon(b.trB,ps,{...CC,gain:2.4,a:1-f}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.4})),{...CH,gain:4,a:1-f}); } },o.delay||0); }
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
  if(!F.on) return h; const m=LM(), b=K.mats(), mat={alb:o.rock||ROCK,emis:PJ.b,rimC:PJ.h,spec:.5,rim:.2,bump:o.bump??1.6,tone:o.tone??.3,...(o.det||{})}, vk=o.vk??1;
  // the mark writes itself a moment before the stone is seen, and the shadow closes in on it
  GFX.add(lead+dur,(k,t)=>{ const i=sat(t/(lead+dur*.5)), e=sat((t-lead)/dur);
    if(lead>0) F.quad(m.mark,x,y,s*1.7,s*1.7,t*1.6+sd,{cA:PJ.d,cB:PJ.b,cC:SP.h,a:.3+.6*e,gain:1+e,rv:[i*1.5,.25,0,.1]});
    F.quad(b.dark,x,y,s*(2.6-1.5*k),s*(2.6-1.5*k),0,{a:.12+.6*k*k}); },Math.max(0,d0-lead));
  // the fall: sideways speed is steady and the drop quickens, so the path bends; chips and dust come off it
  GFX.add(dur,(k,t)=>{ const px=x+vx*(1-k), z=h0*(1-k*k)+s*.6, a=sat(k*(o.emerge?5:30));
    F.solid('boulder',v,px,y,z,{M:cxf(Hm*(.6+.4*a),ax*t,ay*t,rz0),...mat,vein:.3*vk,heat:0,clip:0,a});
    if(!F.low&&Math.random()<.6) GFX.pt({x:px+rand(-.5,.5)*s,y,z:z+rand(-.3,.6)*s,vx:rand(-60,60),vy:rand(-20,20),vz:rand(-200,100),g:500,drag:.8,life:rand(.25,.5),s:rand(4,11),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb('#55645e'),c2:'#0a0f0e',fk:4,L:2});
    if(!F.low&&Math.random()<.5) GFX.pt({x:px,y,z:z+s*.5,vx:rand(-40,40),vy:0,vz:rand(40,160),g:-20,drag:.6,life:rand(.3,.55),s:rand(3,6),m:8,c:GFX.rgb(PJ.s),fade:'in',L:3}); },d0);
  // landed: one squashed frame, then it sits half buried in its own small crater
  if(o.stay) GFX.add(o.stay,(k,t)=>{ if(h.dead) return; const f=h.t1<0?0:sat((RT-h.t1)/h.fd); if(f>=1){ h.dead=true; return; } const sq=1-.22*Math.exp(-t*20);
    if(!o.lite) F.quad(m.crater,x,y,s*1.75,s*1.75,crot,{a:sat(t/.04)*(1-f),gain:1.2*Math.exp(-t*2.2)+.25});
    F.solid('boulder',v,x,y,s*(.55-.12*sat(t/.05))-f*f*s*(o.sink?1.7:.4),{M:cxf(Hm,ax*dur,ay*dur,rz0,sq),...mat,vein:(.5*Math.exp(-t*1.4)+.06)*vk,heat:.45*Math.exp(-t*3)*vk,ero:o.sink?0:f*.85,shadow:o.lite?null:[.55,.28,.45*(1-f)]}); },d0+dur);
  return h; }
// STREAM: a bolt of jade let go from the head of the staff that bends toward its target: a ball of plasma at its head, a broad tapering body with
// a white heart behind it that burns away from the staff end when it lands. It strikes the body: a star on it and a streak through it, the body
// is shoved back and carries his sign for a moment, and the floor behind it is scored.
function stream(e,d,da=0){ const a0=angTo(e)+da, SP=1900, TL=820, W=112, hz=BODY*.6, T0=hand(), ox=pl.x+Math.cos(a0)*50, oy=pl.gy+Math.sin(a0)*50, sd=rand(0,9), b=K.mats(), st={t1:-1,ex:0,ey:0,pt:0};
  const p={x:ox,y:oy,vx:Math.cos(a0)*SP,vy:Math.sin(a0)*SP,life:.62,d:0,r:70,home:e,turn:12,c:C1,h:hz,pw:.6,kb:0,
    onHit:(en,q)=>{ const dir=Math.atan2(q.vy/FSY,q.vx), ux=Math.cos(dir), uy=Math.sin(dir)*FSY; K.ehit(en,{pal:P,pw:.95,dir}); bead(en,1.5,dir); K.mark(en,'brand',{pal:P,dur:.9,s:.75}); strike(en,d,{dir,push:200,up:420,stun:.3},.1);
      K.coolLine(en.x+ux*40,en.y+uy*40,en.x+ux*330,en.y+uy*330,{w:34,pal:P,life:.8,hot:.8,grow:.06,gain:1.2,shed:0}); },
    onEnd:q=>{ st.t1=RT; st.ex=q.x; st.ey=q.y; }};
  const head=K.vorb(ox,oy,T0.z,{r:56,dur:.95,pal:P,spin:9,core:.24,in:.04,out:.08,gain:1});
  if(F.on) GFX.add(.95,(k,t)=>{ const dead=st.t1>=0, f=dead?sat((RT-st.t1)/.3):0; if(f>=1){ head.dead=true; return; } const hx=dead?st.ex:p.x, hy=dead?st.ey:p.y, sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, zh=mix(T0.z,hz,sat(t/.14)), n=9, ps=[];
    // the tail is laid behind the head from where it is now, and its far end is still the head of the staff while it is young; once the head has
    // landed the tail burns away toward it
    const far=Math.hypot(hx-T0.x,hy-T0.y), len=Math.min(TL,far)*(1-f*f), yng=sat(1-far/TL), hf=sat(f*4);
    head.x=hx; head.y=hy; head.z=zh; head.a=1-hf; head.r=56*(1+.5*hf);
    if(len>20){ for(let i=0;i<n;i++){ const u=i/(n-1), dd=len*(1-u), wob=Math.sin(u*4-t*20+sd)*16*Math.sin(Math.PI*u), w=W*(.08+.92*u*u)*(1-.5*f); ps.push({x:hx-ux*dd-uy*wob,y:hy-uy*dd+ux*wob*FSY,z:mix(mix(zh,T0.z,yng),zh,u),w}); }
      F.ribbon(b.trB,ps,{...C,gain:2.6,a:1-f*f,t0:sd,fd:[.2,.02,0,0]});
      F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.34})),{...CW,gain:4.2,a:1-f,t0:sd,fd:[.3,.02,0,0]}); }
    F.quad(b.glowG,hx,hy,210,210,0,{...C,a:.5*(1-f),gain:1.1});
    F.bill(b.glowO,hx,hy,zh,58*(1-hf),58*(1-hf),0,{...CW,a:1-hf,gain:3.2});
    if(!dead&&t-st.pt>.02){ st.pt=t; GFX.pt({x:hx-ux*rand(40,300),y:hy-uy*rand(40,300),z:zh+rand(-40,40),vx:p.vx*.3,vy:p.vy*.3,vz:rand(-40,40),g:0,drag:3,life:rand(.16,.3),s:rand(3.5,6.5),m:3,len:.07,c:GFX.rgb(PJ.s),c2:PJ.b,c3:PJ.h,L:3}); } });
  V.pj.push(p); return p; }
// CHARGE: spirit set into a body. A seal closes over its head while a ball of plasma swells on it and the ones round it are drawn in; then it
// goes off: a hard white star and a ring that snaps out, rays over the floor, one short ball of jade fire, everything near it thrown outward.
// What it leaves is a cracked, glowing floor that cools. Evolved: what is left in the ones it caught goes off a second time.
function charge(e,d,evo){ const fuse=.42, b=K.mats(), st={x:e.x,y:e.y,z:ez(e),h:e.h||170};
  const mk=e.fake?null:K.mark(e,'seal',{dur:fuse+.12,s:1.3}), orb=K.vorb(st.x,st.y,st.z,{r:40,dur:fuse+.02,pal:P,spin:7,core:.14,in:.06,out:.02,gain:.9}), lamp=GFX.light(st.x,st.y,400,PJ.l,.3,.15,{hold:fuse,z:90});
  inCircle(st.x,st.y,430,o=>{ if(o!==e) K.knock(o,{from:[2*o.x-st.x,2*o.y-st.y],dist:Math.min(150,Math.hypot(o.x-st.x,o.y-st.y)*.6),stun:fuse,fx:0}); });
  if(F.on) GFX.add(fuse,(k,t)=>{ if(!e.dead){ st.x=e.x; st.y=e.y; st.z=ez(e); } const q=k*k; orb.x=st.x; orb.y=st.y; orb.z=st.z; orb.r=mix(40,150,q); lamp.x=st.x; lamp.y=st.y; lamp.a=.3+.6*q;
    // the ring that closes on the floor round it
    const rr=mix(420,150,eo3(k)); F.ring(b.shL,st.x,st.y,rr*1.04,rr*1.2,{layer:'g',...C,a:sat(t/.06)*.85,gain:1.4+1.4*q}); F.ring(b.shL,st.x,st.y,rr,rr*1.05,{layer:'g',...CW,a:sat(t/.06)*.9,gain:2+2*q});
    F.bill(b.glowO,st.x,st.y,st.z,24+40*q,24+40*q,0,{...CW,a:.9,gain:2.4+2*q}); });
  for(let i=0;i<12;i++) after(i*.03,()=>{ const a=rand(0,TAU), r=rand(260,400); GFX.pt({x:st.x+Math.cos(a)*r,y:st.y+Math.sin(a)*r*FSY,z:st.z+rand(-60,120),vx:-Math.cos(a)*r*2.8,vy:-Math.sin(a)*r*2.8*FSY,vz:rand(-60,60),g:0,drag:.2,life:.33,s:rand(3.5,7),m:3,len:.06,c:GFX.rgb(PJ.s),c2:PJ.b,c3:PJ.h,L:3}); });
  const burst=(x,y,pw)=>{ K.flare(x,y,st.z,{pal:P,s:230*pw,dur:.12,gain:1.8}); rays(x,y,st.z*.6,{n:9,r:400*pw,dur:.22,w:30});
    if(F.on) GFX.add(.26,k=>{ const rr=mix(90,400*pw,eo5(k)); F.ring(b.shL,x,y,rr*.9,rr,{layer:'g',...CW,a:(1-k)*(1-k),gain:3}); F.ring(b.shL,x,y,rr*.97,rr,{layer:'o',h0:0,h1:70*(1-k),...C,a:(1-k)*.7,gain:1.6}); });
    K.vblast(x,y,{s:250*pw,z:st.z*.9,pal:SPV,heat:.7,smoke:0,dur:.34,fire:.3,rise:240,gain:.85}); GFX.light(x,y,680*pw,PJ.l,.85,.35,{z:200});
    K.sparks(x,y,st.z,{pal:P,n:20,sp:[500,1900],up:1100,life:[.25,.6],s:4}); K.chunks(x,y,{n:4,r:60,sp:[300,800],up:1300,s:[18,36],pal:ST,rock:ROCK,life:1}); };
  after(fuse,()=>{ const x=st.x, y=st.y, caught=[];
    if(mk&&mk.live()) mk.pop({pw:1.15,quiet:1}); burst(x,y,1); K.cool(x,y,{kind:'crack',r:230,pal:P,life:1.1,hot:.8,gain:1.2}); GFX.ripple(x,y,360,{life:.3,s:.5});
    hitstop=Math.max(hitstop,.06); trauma=Math.min(1,trauma+.4); sfx('boom',1.1,.8);
    let m=0; inCircle(x,y,260,o=>{ strike(o,d,{push:o===e?0:320,up:o===e?1400:800,big:true,sx:x,sy:y},evo?.5:.16); if(m++<4) K.ehit(o,{pal:P,pw:.85,ring:0,dir:Math.atan2((o.y-y)/FSY,o.x-x+1)}); caught.push(o); });
    if(!evo) return;
    for(const o of caught) K.mark(o,'seal',{dur:.55,s:.9});
    after(.38,()=>{ let i=0; for(const o of caught){ if(o.dead) continue; const h=K.marked(o,'seal'); if(h){ if(i<3) h.pop({quiet:1,pw:.62}); else h.end(); } if(i<5) bead(o,1.2); i++; }
      burst(x,y,.8); trauma=Math.min(1,trauma+.2); sfx('boom',1.3,.6);
      inCircle(x,y,300,o=>{ strike(o,d*.6,{push:200,up:800,big:true,sx:x,sy:y}); }); }); }); }
// SPIKE: one real stone spike punched up through the floor, leaning the way it is told (a = floor angle). Its edge is white-hot as it comes and
// its veins cool while it stands; at the end it does not sink: it breaks where it stands and its pieces fly.  o: {dur, lean, delay}
function spike(x,y,s,a,o={}){ if(!F.on) return; const b=K.mats(), v=(Math.random()*4)|0, rz=rand(0,TAU), ln=o.lean??.34, dur=o.dur||.66, brk=.16, ca=Math.cos(a), sa=Math.sin(a);
  GFX.add(dur,(k,t)=>{ const e=eo3(sat(t/.07)), f=sat((t-(dur-brk))/brk), ck=sat(t/(dur-brk)), H=K.heat(SP,.04+.4*ck), z=s*(e-1)*.95-f*s*.25, fl=Math.exp(-t*8);
    F.solid('spike',v,x,y,z,{M:F.xfw({s:s*(1-.12*f),rz,rx:sa*ln,ry:ca*ln}),alb:o.alb||'#7d9aa6',emis:H.cM,rimC:'#ffffff',spec:.8,rim:.9,vein:mix(.9,.35,ck),heat:.35*fl,ero:f*.9,bump:1.1,tone:.4,shadow:[ca*.6,sa*.6,.45*(1-f)]});
    // the lit edge: a white line up the side the light comes from, brightest as it breaks the floor
    const tx=x+ca*ln*s*.55, tz=s*.62*e; F.bill(b.glowO,mix(x,tx,.5)-s*.07,y,tz*.55,s*.035,tz*.5,-ca*ln*.6,{...CW,a:(.35+.65*fl)*(1-f),gain:2.2+2.4*fl});
    if(fl>.05) F.bill(b.glowO,tx,y,tz+s*.3,s*.16*fl,s*.16*fl,0,{...CW,a:fl,gain:3}); },o.delay||0);
  after((o.delay||0)+dur-brk,()=>{ K.chunks(x,y,{n:3,r:s*.16,sp:[200,620],up:1000,s:[s*.07,s*.14],pal:ST,rock:'#7d9aa6',life:1}); K.debris(x,y,{n:5,r:s*.2,sp:[150,520],up:900,size0:5,size:15,c:'#6c8088'}); K.dust(x,y,{n:3,r:s*.2,sp:[120,360],a:.35,c:'#2e2820'}); }); }
// STRAND: a ribbon of light that climbs out of the floor beside him, turning as it goes, and lets go at the foot. It is carried at (ox, oy) from the hero.
function strand(ox,oy,o={}){ if(!F.on) return; const b=K.mats(), h=o.h||520, dur=o.dur||.6, w=o.w||36, sd=rand(0,9), tw=Math.random()<.5?1:-1, PL=o.pal||HEAL, CC={cA:PL.d,cB:PL.b,cC:PL.h,cM:PL.m}, CH={cA:PL.b,cB:PL.m,cM:PL.h,cC:'#ffffff'}, n=8;
  GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/(dur*.5))), f=sat((t-dur*.4)/(dur*.6)), ps=[], x=pl.x+ox, y=pl.gy+oy;
    for(let i=0;i<n;i++){ const u=mix(f*f,g,i/(n-1)), en=Math.sin(Math.PI*i/(n-1)); ps.push({x:x+Math.sin(u*6*tw+sd)*58*(.25+.75*u),y,z:u*h,w:w*(.3+.7*en)}); }
    F.quad(b.glowG,x,y,80,80,0,{...CC,a:.55*(1-f),gain:1});
    F.ribbon(b.trB,ps,{...CC,gain:2.2,a:1-f*f,t0:sd,fd:[.08,.05,0,0]});
    F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.4})),{...CH,gain:3.6,a:1-f,t0:sd,fd:[.08,.05,0,0]}); },o.delay||0); }
// BLADE: a spear of light that stands up out of the floor and lets go of it: straight, broad at the foot and drawn to a point, white only in its
// lower half. No two are alike: o.h is its height and everything else follows from it. It is carried at (ox, oy) from the hero.
function blade(ox,oy,o={}){ if(!F.on) return; const b=K.mats(), h=o.h||420, dur=o.dur||(.4+h/1400), w=o.w||(14+h*.075), g0=o.g||1, sd=rand(0,9), lx=o.lx??rand(-.12,.12), PL=o.pal||HEAL, CC={cA:PL.d,cB:PL.b,cC:PL.h,cM:PL.m}, CH={cA:PL.b,cB:PL.m,cM:PL.h,cC:'#ffffff'}, WS=[.55,1,.8,.5,.22,.03];
  GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/(dur*.35))), f=sat((t-dur*.45)/(dur*.55)), x=(o.abs?0:pl.x)+ox, y=(o.abs?0:pl.gy)+oy, z0=h*.7*f*f, z1=h*g*(1+.25*f), ps=[];
    for(let i=0;i<6;i++){ const u=i/5, z=mix(z0,z1,u); ps.push({x:x+lx*z,y,z,w:w*WS[i]*(1-.6*f)}); }
    F.quad(b.glowG,x,y,w*2.6,w*2.6,0,{...CC,a:.6*(1-f)*g0,gain:1});
    F.ribbon(b.trB,ps,{...CC,gain:2*g0,a:(1-f*f),t0:sd,fd:[.04,.12,0,0]});
    F.ribbon(b.trC,ps.slice(0,4).map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.3})),{...CH,gain:3.4*g0,a:1-f,t0:sd,fd:[.04,.2,0,0]}); },o.delay||0); }
// STONE HAND: an open hand of jade stone seen from above: the block of the palm, four fingers laid out ahead of it and a thumb to one side.
//  (x, y) is the middle of the palm on the floor, z the height of its underside, S its size (the hand is about 1.6 S long), th the floor angle
//  its fingers point along.  o: {a, ero, vein, heat, emis, sq (squash), sh (shadow)}
//  parts: [u (sideways), v (ahead) of the near end, length, half width, turn, variant, lift] in units of S
const HANDP=[[0,-.62,.84,.43,0,2,0],[-.36,.12,.58,.115,.22,0,.01],[-.125,.17,.78,.125,.07,1,.02],[.125,.17,.72,.125,-.07,3,.02],[.36,.1,.5,.11,-.22,0,.01],[.42,-.5,.52,.135,-.95,1,0]];
const handAt=(x,y,S,th,u,v)=>{ const c=Math.cos(th), s=Math.sin(th); return [x+(c*v+s*u)*S,y+(s*v-c*u)*S*FSY]; };
function handStone(x,y,z,S,th,o={}){ const sq=o.sq||0, TH=S*.14*(1-sq*.3), mat={alb:'#5d9488',emis:o.emis||PJ.b,rimC:'#eafff6',spec:.75,rim:.75,vein:(o.vein??.25)*.4,heat:o.heat||0,ero:o.ero||0,bump:.3,tone:.3,clip:0,a:o.a??1};
  HANDP.forEach((p,i)=>{ const ph=th+p[4], L=p[2]*S, [bx,by]=handAt(x,y,S,th,p[0],p[1]), cx=bx+Math.cos(ph)*L*.5, cy=by+Math.sin(ph)*L*.5*FSY, M=F.xf({sx:p[3]*S/.33,sy:TH/.2,sz:L/1.25,rx:-Math.PI/2,rz:ph-Math.PI/2}); M[12]=-M[8]*.33; M[13]=-M[9]*.33; M[14]=-M[10]*.33;
    F.solid('slab',p[5],cx,cy,z+TH*.5+p[6]*S,{M,...mat,alb:i?'#6aa596':'#5d9488',shadow:o.sh?[.55,.28,o.sh]:null,ord:i?-.1:-.2}); }); }
// PALM: the hand comes into being flat over the crowd, its shadow already lying on them, and is driven down palm first; it presses, and breaks up
//  where it lies. What it leaves is its print burnt into the floor.  o: {s, th, delay (to the first sight of its shadow), omen, fall, scar}
function palmFall(x,y,o={}){ if(!F.on) return; const S=o.s||330, th=o.th||0, omen=o.omen??.14, fall=o.fall??.36, hold=.24, out=.22, d0=o.delay||0, b=K.mats(), HZ=o.h0||560, APP=fall*.6, DROP=fall-APP;
  // its omen: the print of the hand writes itself on the floor in light, finger by finger, and darkens under the stone as it comes
  GFX.add(omen+fall,(k,t)=>{ const q=sat(t/(omen+fall)), [cx,cy]=handAt(x,y,S,th,0,-.2);
    F.quad(b.dark,cx,cy,S*.62,S*.62,0,{a:.2+.6*q*q}); F.ring(b.shL,cx,cy,S*.3,S*.43,{layer:'g',...C,a:.85*sat(t/.08),gain:1.5+1.5*q}); F.ring(b.shL,cx,cy,S*.4,S*.43,{layer:'g',...CW,a:.8*sat(t/.08),gain:2.4+q});
    HANDP.forEach((p,i)=>{ if(!i) return; const g=eo3(sat((t-.03*i)/.12)); if(g<=0) return; const ph=th+p[4], L=p[2]*S*g, [bx,by]=handAt(x,y,S,th,p[0],p[1]), ps=[]; for(let j=0;j<4;j++){ const u=j/3; ps.push({x:bx+Math.cos(ph)*L*u,y:by+Math.sin(ph)*L*u*FSY,z:0,w:p[3]*S*(1-.45*u)}); }
      F.ribbon(b.trB,ps,{...C,layer:'g',gain:1.8+1.4*q,a:.9,t0:i}); F.ribbon(b.trC,ps.map(v=>({x:v.x,y:v.y,z:0,w:v.w*.35})),{...CW,layer:'g',gain:2.8+2*q,a:.9,t0:i}); }); },d0);
  GFX.add(fall+hold+out,(k,t)=>{ const ap=sat(t/APP), q=sat((t-APP)/DROP), tl=t-fall, z=HZ*(1-q*q*q)+(1-eo3(ap))*80, f=sat((tl-hold)/out), sq=tl>0?Math.exp(-tl*22):0, ck=sat(tl/(hold+out)), H=K.heat(SP,tl>0?.05+.6*ck:.25);
    handStone(x,y,z,S,th,{sq,a:ap,vein:tl>0?mix(.8,.25,ck):.3+.3*q,heat:tl>0?.5*Math.exp(-tl*7):.1,ero:Math.max(f*.95,(1-ap)*.6),emis:H.cM,sh:tl>0?.5*(1-f):0});
    // the eye of jade on the back of the hand
    const [ex,ey]=handAt(x,y,S,th,0,-.2), top=z+S*.14+8, la=ap*(1-f); F.ring(b.shL,ex,ey,S*.13,S*.2,{z:top,layer:'o',...CW,a:la,gain:2.4+2*sq}); F.bill(b.glowO,ex,ey,top,S*.1,S*.1,0,{...CW,a:la,gain:3}); },d0+omen);
  after(d0+omen+fall,()=>{ const life=o.scar||2.4; HANDP.forEach((p,i)=>{ const ph=th+p[4], L=p[2]*S, [bx,by]=handAt(x,y,S,th,p[0],p[1]);
      if(i) K.coolLine(bx,by,bx+Math.cos(ph)*L,by+Math.sin(ph)*L*FSY,{w:p[3]*S*1.05,pal:P,life,hot:.85,gain:1.3,grow:.03,shed:i%2?0:undefined}); });
    const [px,py]=handAt(x,y,S,th,0,-.2); K.cool(px,py,{kind:'scorch',r:S*.5,pal:P,life,hot:.85,gain:1.2}); }); }

const sk={
  sh_basic:{cls:'shaman',type:'basic',name:'옥령선',lv:1,desc:'적을 쫓아가는 옥빛 줄기 두 가닥을 쏜다. 강화할수록 줄기가 늘어난다.'},
  sh_bomb:{cls:'shaman',type:'skill',name:'스피릿 봄',lv:1,cd:4,dmg:3000,desc:'적이 몰린 곳의 적에게 혼령 구슬을 심어 잠시 뒤 터뜨린다.',evo:'폭발이 두 번 일어난다.'},
  sh_spike:{cls:'shaman',type:'skill',name:'스톤 스파이크',lv:1,cd:5,dmg:2400,desc:'땅에서 바위 가시를 일직선으로 솟구치게 해 적을 띄운다.',evo:'가시 줄이 세 갈래가 된다.'},
  sh_wisp:{cls:'shaman',type:'skill',name:'스피릿 오브',lv:2,cd:9,dmg:800,desc:'영혼 불꽃 4개가 5초 동안 주위를 돌며 닿는 적을 태운다.',evo:'영혼 불꽃이 6개가 된다.'},
  sh_heal:{cls:'shaman',type:'skill',name:'힐링 서클',lv:3,cd:14,dmg:600,desc:'3초 동안 체력을 25% 회복하는 결계를 펼치고, 안의 적에게 피해를 준다.',evo:'회복량이 40%가 된다.'},
  sh_rock:{cls:'shaman',type:'skill',name:'록 폴',lv:5,cd:8,dmg:3600,desc:'적 머리 위로 큰 바위 4개를 떨어뜨린다.',evo:'바위가 7개가 된다.'},
  sh_seal:{cls:'shaman',type:'skill',name:'바인드',lv:6,cd:10,dmg:1500,desc:'적이 몰린 곳에 빛의 창살을 꽂아 안의 적을 2.5초 동안 묶고, 창살이 꺼질 때 봉인을 터뜨린다.',evo:'창살이 넓어지고 묶인 적이 계속 피해를 받는다.'},
  sh_wolf:{cls:'shaman',type:'skill',name:'혼령 혜성',lv:8,cd:10,dmg:2000,desc:'혼령 혜성 두 줄기를 쏘아 적을 꿰뚫고 옆으로 밀쳐 낸다.',evo:'혜성이 네 줄기가 된다.'},
  sh_palm:{cls:'shaman',type:'skill',name:'옥장(玉掌)',lv:10,cd:11,dmg:7000,desc:'하늘에서 거대한 옥빛 돌손이 손바닥으로 적 무리를 내리눌러 짓누른다.',evo:'손바닥을 두 번 내리친다.'},
  sh_ult1:{cls:'shaman',type:'ult',name:'태산압정',lv:3,desc:'궁극기. 구름을 뚫고 내려온 암산이 전장을 짓눌러 화면의 모든 적을 날려 버린다.'},
  sh_ult2:{cls:'shaman',type:'ult',name:'신령강림',lv:12,desc:'궁극기. 하늘이 갈라지며 빛과 안개로 된 거대한 신령이 강림해, 하늘에서 내리꽂는 심판의 빛으로 화면의 모든 적을 꿰뚫어 날려 버린다.'},
  sh_ult3:{cls:'shaman',type:'ult',name:'지맥 붕괴',lv:5,desc:'궁극기. 지팡이로 지맥을 깨워 땅을 세 번 뒤흔든 뒤, 화면 전체에 바위 가시 숲을 솟구치게 해 모든 적을 꿰어 올리고, 숲을 일제히 터뜨려 파편 폭풍으로 쓸어버린다.'},
};
const order=Object.keys(sk);

// JADE BOLT (basic): bolts of jade from the head of the staff at the moment of the throw, the staff leaving its arc in the air behind them. The
// first pair goes for the nearest one, bending in from either side; the bolts that come with levels take the next nearest.
function basic(){ const e=nearest(850); if(!e) return false; const a=angTo(e); face(a); fling(true); const n=2+Math.floor((L('sh_basic')-1)/2), d=1100*A.mul('sh_basic');
  cast({dur:.3,s:.85,hand:1}); swing(a);
  after(.1,()=>{ const T=V.en.filter(o=>!o.dead&&Math.hypot(o.x-pl.x,o.y-pl.gy)<900).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.gy)-Math.hypot(b.x-pl.x,b.y-pl.gy)); if(!T.length) return;
    for(let k=0;k<n;k++) after(k*.05,()=>{ let t=T[(k>>1)%T.length]; if(t.dead) t=nearest(900); if(t) stream(t,d,(k%2?1:-1)*.3); }); sfx('whoosh',1.6,.45); });
  return true; }
const SKILL={
  // SPIRIT BOMB (a swelling bead): a ball of spirit is lobbed from the hand into the thick of them and sinks into a body; a ring closes on the
  // floor round it while the ball swells and the ones near are drawn in; it goes off there. Evolved: it goes off twice.
  sh_bomb:{fn(id){ const t=densest(800)||nearest(800)||(demo(id)&&(nearest(1300)||ahead(420))); if(!t) return false; const d=D(id), evo=EVO(id); if(!t.fake) face(angTo(t)); fling(); cast({s:1.1,hand:1}); swing(t.fake?(pl.f>0?0:Math.PI):angTo(t));
    after(.12,()=>{ const e=t.dead?(densest(800)||nearest(800)):t; if(!e) return; const T0=hand(), FLY=.24, b=K.mats(), sd=rand(0,9); sfx('whoosh',1.4,.4);
      const at=u=>({x:mix(T0.x,e.x,u),y:mix(T0.y,e.y,u),z:mix(T0.z,ez(e),u)+Math.sin(Math.PI*u)*240}), orb=K.vorb(T0.x,T0.y,T0.z,{r:54,dur:FLY+.03,pal:P,spin:9,core:.25,in:.03,out:.03,gain:1});
      if(F.on) GFX.add(FLY,k=>{ const h=at(k), ps=[]; orb.x=h.x; orb.y=h.y; orb.z=h.z; for(let i=0;i<7;i++){ const q=at(Math.max(0,k-(6-i)*.075)); q.w=5+50*(i/6)*(i/6); ps.push(q); }
        F.ribbon(b.trB,ps,{...C,gain:2.5,a:1,t0:sd,fd:[.25,.02,0,0]}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.36})),{...CW,gain:4,a:1,t0:sd,fd:[.3,.02,0,0]});
        F.bill(b.glowO,h.x,h.y,h.z,50,50,0,{...CW,a:1,gain:3.2}); F.quad(b.dark,h.x,h.y,70,70,0,{a:.4}); F.quad(b.glowG,h.x,h.y,190,190,0,{...C,a:.45,gain:1}); });
      after(FLY,()=>charge(e,d,evo)); }); }},
  // STONE SPIKE (a row of spikes): he strikes the floor with the staff and a seam of light runs out along it; four real stone spikes punch up
  // through the seam one after another, each taller than the last, leaning apart to either side so each is seen by itself. What stands on
  // them is thrown up and aside; the last one is the blow. They break together where they stand. Evolved: three rows.
  sh_spike:{fn(id){ const e=nearest(900)||(demo(id)&&ahead(500)); if(!e) return false; const a0=e.fake?(pl.f>0?0:Math.PI):angTo(e), d=D(id), dirs=EVO(id)?[0,-.45,.45]:[0], x0=pl.x, y0=pl.gy, b=K.mats(); if(!e.fake) face(a0); raise(); cast({s:1.2,dur:.36}); sfx('whoosh',.8,.4);
    dirs.forEach((da,j)=>{ const a=a0+da, cx=Math.cos(a), cy=Math.sin(a), af=Math.atan2(cy/FSY,cx), T0=.2+(j?.05:0), TS=T0+.8, sgn=j===1?-1:1, sd=rand(0,9);
      K.coolLine(x0+cx*90,y0+cy*90,x0+cx*880,y0+cy*880,{w:40,pal:P,life:1.15,grow:.36,delay:T0-.08,shed:0});
      // the seam: its head runs ahead of the spikes, white at the heart
      if(F.on) GFX.add(.56,(k,t)=>{ const g=sat(t/.34), f=sat((t-.3)/.26), r1=mix(70,900,g), r0=mix(70,900,f), ps=[]; for(let i=0;i<6;i++){ const r=mix(r0,r1,i/5); ps.push({x:x0+cx*r,y:y0+cy*r,z:0,w:28+20*(i/5)}); }
        F.ribbon(b.trB,ps,{...C,layer:'g',gain:2.4,a:1-f*f,t0:sd,fd:[.1,.02,0,0]}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:0,w:q.w*.4})),{...CW,layer:'g',gain:3.6,a:1-f,t0:sd,fd:[.1,.02,0,0]});
        if(g<1) F.quad(b.glowG,x0+cx*r1,y0+cy*r1,100,100,0,{...CW,a:.8,gain:1.6}); },T0-.14);
      for(let i=0;i<4;i++) after(T0+i*.08,()=>{ const r=210+i*185, x=x0+cx*r, y=y0+cy*r, s=250+i*58, last=i===3, sd2=(i%2?1:-1)*sgn, ka=af+sd2*1.25;
        spike(x,y,s,af+sd2*.8,{dur:TS-(T0+i*.08),lean:.22+.04*i});
        K.dust(x,y,{n:3,r:s*.2,sp:[150,420],a:.4,c:'#2e2820'}); K.sparks(x,y,20,{pal:P,n:6,sp:[200,900],up:1600,life:[.2,.5]}); GFX.light(x,y,440,PJ.l,.6,.3,{z:90});
        if(last&&!j) K.vsmoke(x,y+10,{s:150,dur:.7,rise:180,a:.35,...DGy});
        sfx('shatter',.4); let m=0;
        inCircle(x,y,170,o=>{ if(o.fake) return; strike(o,d,{dir:ka,up:1650,push:last?280:190,stun:.7,big:true,sx:x-cx*70,sy:y-cy*70},.34); if(!m++) K.ehit(o,{pal:P,pw:last?1.25:.95,dir:ka,ring:0}); else bead(o,1,af); });
        if(last&&!j){ hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.3); GFX.light(x,y,640,PJ.l,.8,.35,{z:200}); K.sparks(x,y,s*.8,{pal:P,n:10,sp:[300,1100],up:900,life:[.25,.6]}); } });
      after(TS-.16,()=>{ sfx('shatter',.7,.7); trauma=Math.min(1,trauma+.12); }); }); }},
  // SPIRIT ORB (orbiting ghost fires): tongues of pale blue spirit fire are breathed out from him and swing round him on an orbit that
  // breathes in and out, each dragging a long tail of light. What one touches is lashed by a whip of its fire, shoved outward, and burns
  // with ghost fire for a moment.
  sh_wisp:{fn(id){ if(V.orbs.some(o=>o.wisp)||!(nearest(700)||demo(id))) return false; const n=EVO(id)?6:4, d=D(id), b=K.mats(), hz=BODY*.5, st={bt:0}, WC={cA:WSP.d,cB:WSP.b,cC:WSP.h,cM:WSP.m}, WW={cA:WSP.b,cB:WSP.m,cM:WSP.h,cC:'#ffffff'}; pray(); sfx('bell',.6); cast({pal:WSP,s:1.2,dur:.4});
    const lamp=GFX.light(pl.x,pl.gy,680,WSP.l,.45,.4,{hold:5,z:120,flick:.25});
    const zap=(e,o)=>{ K.knock(e,{from:[pl.x,pl.gy],dist:130,up:420,fx:0}); K.mark(e,'burn',{pal:WSP,dur:1.2,s:.9}); if(RT-st.bt<.09) return; st.bt=RT; sfx('slash',1.6,.3); const sx=o.x, sy=o.y, sd=rand(0,9), kink=[0,rand(-40,40),rand(-50,50),rand(-30,30),0];
      // the whip: from the fire to the body, kinked, burning away from the fire's end
      if(F.on) GFX.add(.2,(k,t)=>{ const f=sat((t-.06)/.14), ps=[]; for(let i=0;i<5;i++){ const u=mix(f,1,i/4); ps.push({x:mix(sx,e.x,u)+kink[i]*.4,y:mix(sy,e.y,u),z:mix(hz,ez(e),u)+kink[i],w:40*(.5+.5*Math.sin(Math.PI*i/4))+10}); }
        F.ribbon(b.trB,ps,{...WC,gain:2.8,a:1-f*f,t0:sd}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.4})),{...WW,gain:4.2,a:1-f,t0:sd}); });
      K.ehit(e,{pal:WSP,pw:.8,ring:0}); GFX.light(e.x,e.y,300,WSP.l,.55,.22,{z:80}); };
    // the orbit breathes: every other fire is out when its neighbours are in
    const Rf=(i,t)=>mix(50,330+95*Math.sin(t*1.7+i*Math.PI),eo3(sat(t/.4)));
    for(let i=0;i<n;i++){ const o={wisp:true,a:i/n*TAU,life:5,d,R:50,w:3.6,hitR:95,c:WSP.l,h:BODY*.8,v:{x:pl.x,y:pl.gy-BODY},hit:zap}, sd=rand(0,9); V.orbs.push(o);
      const ball=K.vorb(pl.x,pl.gy,hz,{r:38,dur:5.1,pal:WSP,spin:6,core:.3,heat:.8,in:.15,out:.25,gain:1});
      if(F.on) GFX.add(5.1,(k,t)=>{ if((o.t||0)>=o.life){ ball.dead=true; return; } o.R=Rf(i,t); if(o.x==null) return; if(!i){ lamp.x=pl.x; lamp.y=pl.gy; } const a=sat(t/.2)*sat((o.life-o.t)/.3), bob=Math.sin(t*5+sd)*14, z=hz+bob, pts=[], fk=1+.12*Math.sin(t*23+sd)+.08*Math.sin(t*37+sd*2);
        ball.x=o.x; ball.y=o.y; ball.z=z; ball.a=a;
        for(let j=11;j>=0;j--){ const tj=t-j*.03, aa=o.a-j*.03*o.w, Rj=Rf(i,Math.max(0,tj)); pts.push({x:pl.x+Math.cos(aa)*Rj,y:pl.gy+Math.sin(aa)*Rj*.8,z:hz+Math.sin(tj*5+sd)*14+j*3,w:74*(1-j/12)*(1-j/12)+4}); }
        F.quad(b.glowG,o.x,o.y,150,150,0,{...WC,a:.5*a,gain:1});
        F.ribbon(b.trB,pts,{...WC,gain:2.2,a:.9*a,t0:sd,fd:[.3,.02,0,0]}); F.ribbon(b.trC,pts.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.34})),{...WW,gain:3.8,a:.9*a,t0:sd,fd:[.3,.02,0,0]});
        // the tongue of the fire: it stands up from the ball and flickers
        F.bill(b.glowO,o.x,o.y,z+70*fk,40,118*fk,0,{...WC,a:.9*a,gain:2.4}); F.bill(b.glowO,o.x,o.y,z+38*fk,19,64*fk,0,{...WW,a,gain:3.4}); F.bill(b.glowO,o.x,o.y,z,26,26,0,{...WW,a,gain:3});
        if(Math.random()<.35) GFX.pt({x:o.x+rand(-14,14),y:o.y,z:z+rand(40,130),vx:rand(-40,40),vy:rand(-20,20),vz:rand(160,380),g:-40,drag:.5,life:rand(.3,.6),s:rand(3,6),m:3,len:.05,c:GFX.rgb(WSP.s),c2:WSP.b,c3:WSP.h,L:3}); });
      after(4.95,()=>{ if(o.x!=null&&V.orbs.includes(o)){ K.sparks(o.x,o.y,hz,{pal:WSP,n:8,sp:[100,400],up:900,g:500,life:[.25,.5]}); blade(o.x-pl.x,o.y-pl.gy,{h:380,pal:WSP}); } }); } }},
  // HEALING CIRCLE (a ward of rising light): one whole ring of green light runs out from under his feet and stands as the edge of the ward, a low
  // curtain of light on it. A column of light climbs up through him at the cast; every pulse the ring beats, spears of light of different
  // heights stand up along it and motes rise through him, and whatever stands inside burns green for a moment. At the end the ring draws
  // back into him.
  sh_heal:{fn(id){ if(!demo(id)&&G.hp>A.maxHp()*.7&&countIn(380)<6) return false; const d=D(id), k=EVO(id)?.4:.25, st={n:0,beat:-9}, b=K.mats(), R0=380, LIFE=3;
    const HC={cA:HEAL.d,cB:HEAL.b,cM:HEAL.m,cC:HEAL.h}, HW={cA:HEAL.b,cB:HEAL.m,cM:HEAL.h,cC:'#ffffff'}; pray(); sfx('choir',.6); cast({pal:HEAL,s:1.3,dur:.45});
    const lamp=GFX.light(pl.x,pl.gy,760,HEAL.l,.6,.5,{hold:LIFE-.4,z:100});
    const col=K.vcolumn(pl.x,pl.gy,{r:74,h:640,dur:.7,rise:.16,out:.4,pal:HEAL,heat:.8,twist:1.4,turb:.3,taper:.5,speed:3,gain:.55}); col.a=.55;
    if(F.on) GFX.add(LIFE+.35,(q,t)=>{ const x=pl.x, y=pl.gy, g=eo3(sat(t/.3)), f=sat((t-LIFE)/.35), r=R0*g*(1-.45*f*f), bt=Math.exp(-(RT-st.beat)*5), a=(1-f)*(1-f)*sat(t/.05); lamp.x=col.x=x; lamp.y=col.y=y;
      // under his feet
      F.quad(b.glowG,x,y,150+40*bt,150+40*bt,0,{...HC,a:(.45+.4*bt)*a,gain:1.1});
      // the edge of the ward: a soft band, a white line on its outer side, and the curtain that stands on it
      F.ring(b.shL,x,y,r*.84,r,{layer:'g',...HC,a:.55*a,gain:1.3+.8*bt});
      F.ring(b.shL,x,y,r*.965,r,{layer:'g',...HW,a:.95*a,gain:2.2+2*bt});
      F.ring(b.shL,x,y,r,r,{layer:'o',h0:0,h1:60+80*bt,...HC,a:(.22+.26*bt)*a,gain:1.2});
      // the beat: a ring that runs out from him to the edge
      const u=sat((RT-st.beat)/.4); if(u<1&&t>.3){ const rr=mix(60,R0,eo3(u)); F.ring(b.shL,x,y,rr*.9,rr,{layer:'g',...HW,a:(1-u)*.8*a,gain:2}); } });
    // spears along the edge: two tall, the rest short, none the same
    const rise=n=>{ const a0=rand(0,TAU); for(let i=0;i<n;i++){ const a=a0+i/n*TAU+rand(-.3,.3), r=rand(330,375), tall=i%3===0; blade(Math.cos(a)*r,Math.sin(a)*r*FSY,{h:tall?rand(560,720):rand(170,340),g:tall?1.15:.75,delay:i*.05,lx:Math.cos(a)*.1}); } };
    // motes that climb through him: the healing itself
    const motes=n=>{ for(let i=0;i<n;i++){ const a=rand(0,TAU), r=rand(20,110); GFX.pt({x:pl.x+Math.cos(a)*r,y:pl.gy+Math.sin(a)*r*FSY,z:rand(0,60),vx:0,vy:0,vz:rand(260,520),g:-60,drag:.6,life:rand(.5,.9),s:rand(4,8),m:3,len:.07,c:GFX.rgb(HEAL.s),c2:HEAL.b,c3:HEAL.h,L:3}); } };
    rise(5); motes(10);
    V.zones.push({follow:true,r:R0,life:LIFE,tick:.5,fx:null,fn:e=>{ dmg(e,d,{kb:.5}); if(st.n++<8){ blade(e.x,e.y,{abs:1,h:rand(240,330),g:.9,dur:.4}); hitFx(e,C1,.9); K.sparks(e.x,e.y,8,{pal:HEAL,n:4,sp:[80,300],up:900,g:600,life:[.25,.5]}); } else hitFx(e,C1,.9); },
      onTick:()=>{ st.n=0; st.beat=RT; heal(k/6); rise(5); motes(8); K.embers(pl.x,pl.gy,330,{pal:HEAL,n:8,life:1.1,up:520}); GFX.light(pl.x,pl.gy,620,HEAL.l,.5,.3,{z:140}); }}); }},
  // ROCK FALL (round boulders): over each of the nearest heads a shadow gathers inside one closing band of jade; a pale boulder comes down
  // on it dragging light, throws up what it lands on in a burst of dust and a ring of jade, cracks the floor, and breaks up almost at once.
  sh_rock:{fn(id){ const n=EVO(id)?7:4, d=D(id), b=K.mats(); const pick=R=>V.en.filter(o=>!o.dead&&Math.hypot(o.x-pl.x,(o.y-pl.gy)/FSY)<R).sort((p,q)=>Math.hypot(p.x-pl.x,p.y-pl.gy)-Math.hypot(q.x-pl.x,q.y-pl.gy)).slice(0,n); let T=pick(760);
    if(!T.length){ if(!demo(id)) return false; T=pick(1300); if(!T.length) T=[ahead(380)]; } raise(); sfx('rumble',.8); cast({s:1.2,dur:.4}); skyline({h:620,dur:.3,delay:.06,w:30});
    // every stone has a place: a head, or (when there are fewer heads than stones) a spot well clear of the others
    const spots=[]; for(let i=0;i<n;i++){ const e=T[i%T.length], own=i<T.length, a=i*2.4+1, r=own?0:rand(260,340); spots.push({e:own&&!e.fake?e:null,x:e.x+Math.cos(a)*r,y:e.y+Math.sin(a)*r*FSY}); }
    spots.forEach((sp,i)=>{ const e=sp.e, hitAt=.4+i*.06, FALL=.26, s=rand(120,142), tp={x:sp.x,y:sp.y}, sd=rand(0,TAU), H0=1000, vx0=(i%2?1:-1)*rand(60,150), t0=.1+i*.05;
      // the omen: its shadow, and one band of jade that closes on it; it follows the head until the stone is let go
      if(F.on) GFX.add(hitAt-t0,(k,t)=>{ if(e&&!e.dead&&t<hitAt-t0-FALL){ tp.x=e.x; tp.y=e.y; } const g=sat(t/.1), r=s*mix(2,1.2,eo3(k));
        F.quad(b.dark,tp.x,tp.y,s*(1.9-.6*k),s*(1.9-.6*k),0,{a:(.3+.5*k*k)*g});
        F.ring(b.shL,tp.x,tp.y,r*.8,r,{layer:'g',...C,a:.85*g,gain:1.5+1.5*k}); F.ring(b.shL,tp.x,tp.y,r*.95,r,{layer:'g',...CW,a:.8*g*k,gain:2.4}); },t0);
      after(hitAt-FALL,()=>{ const x=tp.x, y=tp.y, r=boulder(x,y,{s,h0:H0,dur:FALL,vx:vx0,lead:0,stay:.5,fd:.2,rock:'#71858c',vk:1.1,tone:.34,bump:.8});
        // the light it drags down
        if(F.on) GFX.add(FALL+.1,(k,t)=>{ const q=sat(t/FALL), f=sat((t-FALL)/.1), ps=[]; for(let j=0;j<6;j++){ const u=Math.max(0,q-(5-j)*.09), px=x+vx0*(1-u), z=H0*(1-u*u)+s*.6; ps.push({x:px,y,z,w:s*.95*(.12+.88*j/5)}); }
          F.ribbon(b.trB,ps,{...C,gain:2.2,a:(1-f)*.9,t0:sd,fd:[.3,.02,0,0]}); F.ribbon(b.trC,ps.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*.3})),{...CW,gain:3.4,a:1-f,t0:sd,fd:[.3,.02,0,0]}); });
        after(FALL,()=>{ thud(x,y,s,{ring:i<3?1:0,smoke:i%2?1:0,n:9,grey:1}); K.chunks(x,y,{n:i?2:4,r:50,sp:[250,700],up:1300,s:[22,44],pal:ST,rock:'#71858c',life:1}); K.cool(x,y,{kind:'crack',r:s*1.9,pal:P,life:1.15,hot:.8,gain:1.2}); rays(x,y,20,{n:6,r:s*2.6,dur:.18,w:22});
          trauma=Math.min(1,trauma+.24); hitstop=Math.max(hitstop,.035); sfx('boom',1,.6);
          // the ring of jade that snaps out from under it
          if(F.on) GFX.add(.26,k=>{ const rr=mix(s*.8,s*3.2,eo3(k)); F.ring(b.shL,x,y,rr*.86,rr,{layer:'g',...CW,a:(1-k)*(1-k),gain:2.8}); });
          let m=0; inCircle(x,y,210,o=>{ strike(o,d,{push:260,up:o===e?1500:1000,big:true,sx:x,sy:y},.3); if(i<4&&(o===e||(!e&&!m++))) K.ehit(o,{pal:P,pw:.9,ring:0,dir:Math.atan2((o.y-y)/FSY,o.x-x+1)}); else bead(o,1); }); });
        after(FALL+.26,()=>r.crumble()); }); }); }},
  // BIND (a cage of light): six thick bars of gold light are driven into the floor round the crowd almost at once; a ring of light runs round
  // their feet, a wall of light climbs between them and a hoop closes it in the air. What stood near is dragged in. The hoop sinks and
  // beats; at every beat the ones inside are jerked toward the middle under the seals turning over their heads. When the bars burn out the
  // seals go off and throw them.
  sh_seal:{fn(id){ const t=densest(800)||nearest(800)||(demo(id)&&(nearest(1300)||ahead(420))); if(!t) return false; const d=D(id), evo=EVO(id), x=t.x, y=t.y, R=evo?380:300, RW=R*.96, b=K.mats(), LIFE=2.5, T0=.1, BH=430, TB=T0+.26, held=[], st={beat:-9}, sd=rand(0,9);
    const CG={cA:GD.b,cB:GD.m,cM:GD.h,cC:'#ffffff'}, CGB={cA:GD.d,cB:GD.b,cM:GD.m,cC:GD.h}; if(!t.fake) face(angTo(t)); raise(); sfx('bell',.9); cast({pal:GD,s:1.2,dur:.4});
    const post=i=>{ const a=i/6*TAU+.26; return [x+Math.cos(a)*RW,y+Math.sin(a)*RW*FSY]; }, at=i=>T0+i*.028;
    GFX.light(x,y,R*2.4,GD.l,.5,.4,{hold:LIFE,z:80});
    for(let i=0;i<6;i++){ const [cx,cy]=post(i), life=LIFE-at(i);
      const bar=K.vcolumn(cx,cy,{r:40,h:BH,dur:life+.25,rise:.04,out:.3,pal:GD,heat:1,twist:.6,turb:.25,taper:.25,speed:2.4,gain:.9,delay:at(i)}); bar.a=.9;
      // the white heart of the bar: it is thrown down out of the air, stands, and thins away upward
      if(F.on) GFX.add(life+.25,(k,tt)=>{ const g=eo3(sat(tt/.05)), f=sat((tt-life)/.25), fl=Math.exp(-tt*8), bt=Math.exp(-(RT-st.beat)*6), zc=mix(BH*1.6,BH*.5,g)+f*BH*.4;
        F.bill(b.glowO,cx,cy,zc,(34+40*fl+12*bt)*(1-f),BH*.56,0,{...CG,a:sat(tt/.03)*(1-f),gain:3.2+2.6*fl+bt});
        F.bill(b.glowO,cx,cy,BH,(60+30*bt)*(1-f),(60+30*bt)*(1-f),0,{...CG,a:.9*g*(1-f),gain:2.6});
        F.quad(b.glowG,cx,cy,100+110*fl,100+110*fl,0,{...CGB,a:(.6+.4*fl)*(1-f),gain:1.2}); },at(i));
      after(at(i)+.04,()=>{ K.flare(cx,cy,30,{pal:GD,s:170,dur:.12,gain:1.5}); K.sparks(cx,cy,12,{pal:GD,n:7,sp:[200,700],up:900,life:[.15,.4]}); K.dust(cx,cy,{n:2,r:10,sp:[80,200],a:.3,c:'#2e2820'}); if(i%2===0) sfx('shatter',.25); }); }
    // the cage: the ring round its foot, the wall that climbs, the hoop that sinks, the sign turning on the floor
    if(F.on) GFX.add(LIFE+.25,(k,tt)=>{ const f=sat((tt-LIFE)/.25), bt=Math.exp(-(RT-st.beat)*6), gw=eo3(sat((tt-T0-.08)/.22)), hz=mix(BH*.92,190,sat((tt-TB)/(LIFE-TB)))*(1+.04*bt), a=(1-f)*(1-f), sw=sat((tt-T0)/.2)*TAU;
      F.ring(b.shL,x,y,RW*.93,RW*1.03,{layer:'g',a0:.26,a1:.26+sw,...CG,a:.95*a,gain:2.4+1.5*bt}); F.ring(b.shL,x,y,RW*.8,RW*1.12,{layer:'g',a0:.26,a1:.26+sw,...CGB,a:.5*a,gain:1.2});
      if(gw>0){ F.ring(b.shL,x,y,RW,RW,{layer:'o',h0:0,h1:hz*gw,...CGB,a:(.3+.25*bt)*a,gain:1.25}); F.ring(b.shL,x,y,RW,RW,{layer:'o',h0:hz*gw*.94,h1:hz*gw*1.06,...CG,a:.95*a*gw,gain:2.8+1.6*bt}); }
      const gs=sat((tt-TB+.1)/.25)*a; if(gs>0){ for(let i=0;i<4;i++){ const a0=tt*.9+i*TAU/4; F.ring(b.shL,x,y,R*.56,R*.66,{layer:'g',a0,a1:a0+1.1,...CG,a:.85*gs,gain:2+1.6*bt}); }
        for(let i=0;i<3;i++){ const a0=-tt*1.3+i*TAU/3; F.ring(b.shL,x,y,R*.3,R*.38,{layer:'g',a0,a1:a0+1.3,...CG,a:.85*gs,gain:2+1.6*bt}); }
        F.quad(b.glowG,x,y,R*.8,R*.8,0,{...CGB,a:(.4+.35*bt)*gs,gain:1.1}); } });
    // closed: what stood just outside is dragged in, and everything inside is held under a seal (the damage is kept for the end, so they are there to be seen held)
    after(TB,()=>{ hitstop=Math.max(hitstop,.03); trauma=Math.min(1,trauma+.18); st.beat=RT;
      const L=[]; inCircle(x,y,R*1.35,o=>L.push(o)); L.sort((p,q)=>Math.hypot(p.x-x,p.y-y)-Math.hypot(q.x-x,q.y-y));
      L.forEach((o,i)=>{ const dd=Math.hypot(o.x-x,(o.y-y)/FSY); if(dd>R*.7) K.knock(o,{from:[2*o.x-x,2*o.y-y],dist:dd-R*.55,fx:0}); o.stun=Math.max(o.stun,LIFE-TB+.1); if(!o.d.heavy&&!o.d.boss) o.vz=Math.max(o.vz,260); if(i<8){ hitFx(o,GD.l,.8); K.mark(o,'seal',{dur:LIFE-TB+.2,s:.85,pal:GD}); } held.push(o); }); });
    for(const bt of [.95,1.5,2.05]) after(bt,()=>{ st.beat=RT; sfx('bell',1.3,.3); let i=0; for(const o of held){ if(o.dead) continue; o.stun=Math.max(o.stun,LIFE-bt+.1); if(!o.d.heavy&&!o.d.boss){ o.vz=Math.max(o.vz,280); o.kx+=(x-o.x)*.6; o.ky+=(y-o.y)*.6; } const h=K.marked(o,'seal'); if(h) h.kick=RT; if(i++<6) K.sparks(o.x,o.y,(o.h||170)+60,{pal:GD,n:3,sp:[100,360],up:200,life:[.15,.3]}); } });
    V.zones.push({x,y,r:R,life:LIFE,tick:evo?.3:9,fx:null,fn:e=>{ dmg(e,d*.4,{kb:0,stun:.4}); },onEnd:()=>{ let i=0;
      for(const o of held){ if(o.dead) continue; const h=K.marked(o,'seal'); if(h){ if(i<6) h.pop({quiet:1,pw:.8}); else h.end(); } if(i<4) K.ehit(o,{pal:GD,pw:.9,ring:0,dir:Math.atan2((o.y-y)/FSY,o.x-x+1)}); strike(o,d,{push:260,up:1000,big:true,sx:x,sy:y},.22); i++; }
      sfx('shatter',.6); trauma=Math.min(1,trauma+.2); GFX.light(x,y,R*1.9,GD.l,.7,.3,{z:160}); rays(x,y,40,{n:8,r:R*1.5,dur:.22,pal:GD});
      if(F.on) GFX.add(.3,k=>{ const rr=mix(R*.4,R*1.5,eo3(k)); F.ring(b.shL,x,y,rr*.9,rr,{layer:'g',...CG,a:(1-k)*(1-k),gain:2.6}); });
      for(let j=0;j<6;j++){ const [cx,cy]=post(j); K.sparks(cx,cy,BH*.5,{pal:GD,n:6,sp:[100,500],up:1100,g:600,life:[.25,.5]}); } }}); }},
  // SPIRIT COMET (lines that run through): comets of spirit light let go from in front of him, crossing. Each is a ball of plasma with a white
  // heart dragging a long broad tail; it runs straight through the crowd and scores the floor under it. What it goes through is struck and
  // thrown aside, and carries his sign. Where it ends it bursts. Two of them (four when evolved).
  sh_wolf:{fn(id){ const e=nearest(900)||(demo(id)&&ahead(600)); if(!e) return false; const d=D(id), n=EVO(id)?4:2; if(!e.fake) face(angTo(e)); pray(); sfx('roar',.6,.5); cast({s:1.2,dur:.4});
    for(let k=0;k<n;k++) after(.18+k*.1,()=>{ const tg=e.fake?e:e.dead?nearest(900):e; if(!tg) return; const sgn=k%2?1:-1, a=(tg.fake?(pl.f>0?0:Math.PI):angTo(tg))+sgn*(.1+.24*(k>>1)), SPD=1350, LIFE=.5, TL=600, b=K.mats(), hz=BODY*.5, sd=rand(0,9), ux=Math.cos(a), uy=Math.sin(a), ta=Math.atan2(uy/FSY,ux),
        sx0=pl.x+ux*200+uy*sgn*70, sy0=pl.gy+uy*200-ux*sgn*70*FSY, st={t1:-1,n:0,ex:0,ey:0,pt:0};
      const p={x:sx0,y:sy0,vx:ux*SPD,vy:uy*SPD,life:LIFE,d:0,r:110,hits:new Set(),c:C1,h:hz,pw:.7,kb:0,
        onHit:(en,q)=>{ const side=(ux*(en.y-q.y)-uy*(en.x-q.x))>=0?1:-1, kd=ta+side*1.15; if(st.n++<2) K.ehit(en,{pal:P,pw:.85,dir:kd,ring:0}); else bead(en,1.2,ta); K.mark(en,'brand',{pal:P,dur:1.2,s:.6}); strike(en,d,{dir:kd,push:290,up:650,stun:.45},.16); },
        onEnd:q=>{ st.t1=RT; st.ex=q.x; st.ey=q.y; K.flare(q.x,q.y,hz,{pal:P,s:230,dur:.14,gain:1.7}); rays(q.x,q.y,hz*.5,{n:7,r:280,dur:.2}); K.sparks(q.x,q.y,hz,{pal:P,n:12,dir:ta,spread:1,sp:[300,1300],up:900,life:[.2,.55],s:4}); K.embers(q.x,q.y,110,{pal:P,n:8,life:.8,up:420}); GFX.light(q.x,q.y,460,PJ.l,.7,.3,{z:120}); }};
      sfx('whoosh',1.2,.5); K.flare(sx0,sy0,hz,{pal:P,s:150,dur:.1,gain:1.4}); K.dust(sx0,sy0,{n:3,dir:ta+Math.PI,spread:.7,sp:[150,400],a:.35});
      // the floor it scores, drawn under it as it goes
      K.coolLine(sx0,sy0,sx0+ux*SPD*LIFE,sy0+uy*SPD*LIFE,{w:54,pal:P,life:1.5,hot:.85,grow:LIFE,gain:1.9,shed:0});
      const lamp=GFX.light(p.x,p.y,460,PJ.l,.45,.3,{hold:LIFE,z:60}), head=K.vorb(sx0,sy0,hz,{r:84,dur:LIFE+.4,pal:P,spin:10,core:.28,in:.05,out:.1,gain:1}), tail=K.vjet(sx0,sy0,hz,ta+Math.PI,{len:430,r:70,r0:62,dur:LIFE+.14,pal:SPV,heat:.85,turb:.45,speed:7,in:.08,out:.14,gain:.65});
      if(F.on) GFX.add(LIFE+.4,(q,t)=>{ const dead=st.t1>=0, f=dead?sat((RT-st.t1)/.3):0; if(f>=1){ head.dead=true; tail.dead=true; lamp.hold=0; return; } const hx=dead?st.ex:p.x, hy=dead?st.ey:p.y, g=eo3(sat(t/.08)), hf=sat(f*4), len=Math.min(TL,Math.hypot(hx-sx0,hy-sy0)+40)*(1-f*f), ps=[], nn=10;
        lamp.x=hx; lamp.y=hy; head.x=hx; head.y=hy; head.z=hz; head.r=84*g*(1+.5*hf); head.a=1-hf; tail.x=hx-ux*30; tail.y=hy-uy*30; tail.z=hz; tail.a=1-hf;
        for(let i=0;i<nn;i++){ const u=i/(nn-1), dd=len*(1-u), wob=Math.sin(u*5-t*26+sd)*24*Math.sin(Math.PI*u); ps.push({x:hx-ux*dd-uy*wob,y:hy-uy*dd+ux*wob*FSY,z:hz+(1-u)*24,w:(8+150*Math.pow(u,1.7))*(1-.5*f)*g}); }
        F.ribbon(b.trB,ps,{...C,gain:2.7,a:1-f*f,t0:sd,fd:[.25,.02,0,0]}); F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.3})),{...CW,gain:4.4,a:1-f,t0:sd,fd:[.3,.02,0,0]});
        F.quad(b.glowG,hx-ux*90,hy-uy*90,280,200,0,{...C,a:.5*(1-f),gain:1.1});
        F.bill(b.glowO,hx,hy,hz,74*g*(1-hf),74*g*(1-hf),0,{...CW,a:1-hf,gain:3.4});
        if(!dead&&t-st.pt>.015){ st.pt=t; GFX.pt({x:hx-ux*rand(40,420)+rand(-40,40),y:hy-uy*rand(40,420),z:hz+rand(-50,70),vx:ux*SPD*.25,vy:uy*SPD*.25,vz:rand(-40,60),g:0,drag:3,life:rand(.18,.34),s:rand(4,7),m:3,len:.08,c:GFX.rgb(PJ.s),c2:PJ.b,c3:PJ.h,L:3}); } });
      V.pj.push(p); }); }},
  // JADE PALM (a hand of stone): the shadow of an open hand falls on the crowd; a great hand of jade stone comes into being flat over them,
  // fingers away from him, and is driven down palm first. What is under it is pressed flat and held, then thrown as the hand breaks up.
  // What it leaves is its print burnt into the floor. Evolved: it strikes twice.
  sh_palm:{fn(id){ const t=densest(560)||nearest(700)||(demo(id)&&(nearest(1200)||ahead(430))); if(!t) return false; const d=D(id), [tx,ty]=X.inView(t.x,t.y,.38), S=330, HS=300; if(!t.fake) face(angTo(t)); pray(); sfx('rise',.7,.6); cast({s:1.3,dur:.45}); skyline({h:560,dur:.3,delay:.05,w:32});
    // it never comes down on top of him: if the crowd is at his feet it lands beside him (the damage stays where the crowd is)
    const near=Math.abs(tx-pl.x)<HS+60&&ty>pl.gy-HS*FSY-60&&ty<pl.gy+HS*FSY+BODY, x=near?pl.x+(tx>=pl.x?1:-1)*(HS+110):tx, y=ty, th0=Math.atan2((y-pl.gy)/FSY,x-pl.x), JD={c:'#0b1814',c2:'#5c9482'};
    const slam=(k,at)=>{ const th=th0+(k?.3:-.12), hx=x-Math.cos(th)*S*.2, hy=y-Math.sin(th)*S*.2*FSY; palmFall(hx,hy,{s:S,th,delay:at-.5,omen:.14,fall:.36,h0:400,scar:2.4});
      after(at,()=>{ dring(x,y,{r:S*1.8,r0:S*.8,dur:.5,tube:.1,a:.3,...JD}); GFX.ripple(x,y,S*2.4,{life:.4,s:.6}); GFX.light(x,y,S*2.6,PJ.l,.8,.45,{z:200}); rays(x,y,20,{n:10,r:S*1.9,dur:.2,w:30});
        if(F.on) GFX.add(.28,q=>{ const rr=mix(S*.7,S*2.1,eo5(q)); F.ring(K.mats().shL,x,y,rr*.9,rr,{layer:'g',...CW,a:(1-q)*(1-q),gain:3}); });
        K.debris(x,y,{n:8,r:S*.8,sp:[250,900],up:1300,size0:7,size:20,c:'#4c6a60'}); K.sparks(x,y,40,{pal:P,n:18,sp:[400,1700],up:1200,life:[.3,.8],s:4});
        trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.07); sfx('boom',1.6,1); const L=[]; let m=0;
        // pressed flat under it and held
        inCircle(tx,ty,400,o=>{ strike(o,d*(k?.6:1),{push:0,up:0,big:true,stun:.75,sx:x,sy:y},.36); if(m++<3) K.ehit(o,{pal:P,pw:1.1,ring:0,dir:Math.atan2((o.y-y)/FSY,o.x-x+1)}); else if(m<6) bead(o,1.1); L.push(o); });
        // the hand breaks up and what is left under it is thrown
        after(.3,()=>{ K.chunks(x,y,{n:6,kind:'slab',r:S*.7,sp:[300,800],up:1400,s:[30,62],pal:ST,rock:'#5d9488',life:1.1}); sfx('shatter',.8,.7); for(const o of L) if(!o.dead) K.knock(o,{from:[x,y],dist:260,up:1100,stun:.5}); }); }); };
    slam(0,.5); if(EVO(id)) slam(1,1.15); }},
};

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow
// CRAG: a mountain built out of real stones: a heavy squat body, shoulders, feet, peaks standing on it, sheets of rock leaning on its flanks and roots
// hanging under it. Listed back to front.
// [kind, variant, dx, dy (depth: + is toward the camera), dz (height at rest), size, rx, ry, rz, squash, colour, the order it joins the rest in the sky,
//  when it lets go once the crag breaks up (seconds; <0 = it is shaken off earlier, by the aftershock)] in units of S
const MT=[
  ['spike',1,-.34,-.1,-.05,.62,Math.PI,.12,.4,1,'#1b2229',1,0],
  ['spike',2,.05,-.05,-.02,.85,Math.PI,-.06,1.9,1,'#1b2229',1,0],
  ['spike',3,.4,-.08,-.05,.55,Math.PI,-.2,3.1,1,'#1b2229',2,0],
  ['boulder',0,0,-.02,1.66,.46,.2,.1,.4,.95,'#4a5862',13,.12],
  ['boulder',2,.74,-.1,1.16,.6,.3,.2,1.1,.72,'#36424c',10,0],
  ['boulder',1,-.74,-.1,1.14,.6,-.3,.3,2.2,.72,'#36424c',9,.22],
  ['boulder',2,0,-.1,1.0,.84,.3,.2,1.1,.85,'#2c363f',8,.32],
  ['boulder',0,0,0,.4,1.22,.2,.1,.4,.85,'#252e36',0,.58],
  ['boulder',1,-1.02,.02,.7,.36,.1,-.3,2.2,1.25,'#3d4851',3,.5],
  ['boulder',3,1.02,.02,.7,.36,-.1,.3,5,1.25,'#3d4851',4,.4],
  ['spike',2,-.34,-.3,1.42,.5,0,-.42,1,1,'#2a343c',11,-1],
  ['spike',3,.36,-.28,1.38,.44,0,.46,2,1,'#2a343c',12,.06],
  ['boulder',1,-.42,.2,.22,.56,.3,-.42,.3,.9,'#4b4339',7,.44],
  ['boulder',3,.46,.22,.2,.54,-.2,.46,2.9,.9,'#4b4339',7,.36],
  ['boulder',2,-.16,.3,.14,.66,.8,.4,3.3,.9,'#3a4148',5,.74],
  ['boulder',1,.3,.28,.1,.5,-.6,.7,.9,.9,'#3a4148',6,.66],
  ['boulder',3,-1.14,.3,.2,.5,.3,.9,2,1.05,'#262c31',6,.48],
  ['boulder',0,1.12,.32,.2,.48,1.2,.2,4.4,1.05,'#262c31',5,-1],
  ['boulder',1,-.5,.42,.02,.3,.4,.2,1.4,.85,'#5a4d40',7,.8],
  ['boulder',2,.08,.44,.02,.24,.7,1.4,.5,.9,'#5a4d40',8,.86],
];
// TAISHAN as a stone giant: which pieces are its arms [side, how far down the arm (shoulder .15, elbow .55, fist 1)], swinging about the shoulder (MP)
const ARM={4:[1,.15],5:[-1,.15],8:[-1,.55],9:[1,.55],16:[-1,1],17:[1,1]}, MP=[.74,1.14];
// the grain of each stone: [moss colour or 0, moss amount, strata bands, chipped edge width, share of the light in its cracks] — big dark trunk, lighter head, earthy feet, heavy fists
const MTX=MT.map((p,j)=>j<3?[0,0,4,.08,.3]:j===3?[0,0,3,.14,.75]:j===7||j===6?[0,0,5,.13,1]:j===4||j===5?[0,0,4,.12,.7]:j===8||j===9?[0,0,6,.1,.45]:j===16||j===17?[0,0,3,.15,.6]:j===10||j===11?[0,0,7,.1,.35]:j>=18||j===12||j===13?['#2a3520',.3,5,.1,.3]:[0,0,4,.1,.45]);
// how hard a loosened piece falls, and which pieces throw a shadow of their own once it stands on the floor
const CG=5200, MSH={7:1,16:1,17:1};
// the crag's stone a quarter darker than the listed colour: the light belongs in its cracks, not on its faces
const MTD=MT.map(p=>{ const v=parseInt(p[10].slice(1),16), c=n=>Math.round(((v>>n)&255)*.75).toString(16).padStart(2,'0'); return '#'+c(16)+c(8)+c(0); });
// the same as rgb, and the dry grey it goes to once its light is out
const MTA=MTD.map(h=>F.rgb?F.rgb(h).slice():[.2,.2,.2]), ASH=[.27,.27,.27];
// where piece p of a crag of size S comes to rest when it lets go from height pz: [rest height, seconds it takes to get there]
const mtFall=(p,S,pz)=>{ const s=S*p[5], zr=p[0]==='boulder'?(p[5]>1.2?s*.04:s*.2):-s*.42; return [zr,Math.max(.14,Math.sqrt(2*Math.max(0,pz-zr)/CG))]; };
// the light that lives inside it and shows through the seams between its blocks [dx, dy, dz (middle), half width, half height] in units of S
const SEAM=[[0,-.12,.64,.85,.3],[-.52,-.1,.42,.4,.22],[.52,-.1,.44,.4,.22]];
// the breaks the blow drives through its face: crooked lines of light [dx, height] in units of S, from under the peak down to its foot
const FIS=[[[-.05,1.02],[.05,.84],[-.1,.66],[.03,.48],[-.07,.3],[.05,.1]],[[.05,.84],[.24,.74],[.33,.54],[.54,.42],[.62,.16]],[[-.1,.66],[-.3,.56],[-.4,.36],[-.66,.27],[-.74,.06]]];
// drawn every frame at (x, floor y) with its base at height z.  o: {a, vein, emis, heat, sq (squash on contact), sp (how far the blow has split it), land (roots are in
//  the ground), asm (fn(order) -> how far that piece has come in, <=0 not yet, >=1 in place), col (seconds since it began to break up; <0 = whole), shed (the same clock
//  for the pieces the aftershock shakes off), cru (fn(piece) -> 0..1 how far that piece of rubble has gone to gravel), glow (0..1 light in the seams), gc (its colours), fis (0..1 the breaks in its face), fc, fg}
function crag(x,y,z,S,o){ const sq=o.sq||0, sp=o.sp||0, gl=o.glow||0, gc=o.gc||C, b=K.mats(), col=o.col??-1, shed=o.shed??-1;
  MT.forEach((p,j)=>{ const root=p[6]===Math.PI, bo=p[0]==='boulder'; if(root&&o.land) return;
    const s=S*p[5], sd=p[2]<-.04?-1:p[2]>.04?1:(j%2?.3:-.3), am=ARM[j], mx=MTX[j];
    // the arms swing about the shoulder in the plane of the body (o.arm radians, + = up over the head), the fist the whole way, the shoulder a little
    let dx=p[2], dz=p[4], ar=0; if(am&&o.arm&&col<0){ const A=am[0]*o.arm*(am[1]<.3?.22:1), ox=dx-am[0]*MP[0], oz=dz-MP[1], c=Math.cos(A), s2=Math.sin(A); dx=am[0]*MP[0]+ox*c-oz*s2; dz=Math.max(.05,MP[1]+ox*s2+oz*c); ar=A; }
    let px=x+dx*S*(1+sq*.14+sp*.09), py=y+p[3]*S*FSY, pz=z+dz*S*(1-sq*.4)-sp*S*(bo?.015:.05), rx=p[6], ry=p[7]+(root?0:sd*sp*.09)+ar*.8, rz=p[8], a=o.a??1, ero=0;
    // coming together: each piece is thrown in from outside and above, quickening, turning, and stops dead in its place
    let sk=1, cuv=0; if(o.asm){ const u=o.asm(p[11]); if(u<=0) return; if(u<1){ const q=1-u*u; px+=sd*q*S*.35; pz-=q*S*.55; rx+=q*1.2; ry+=sd*q*.9; sk=.3+.7*(1-q*q)+.12*Math.sin(u*Math.PI); a*=sat(u*5); } }
    // it breathes while it is whole: each piece heaves a little in its own time
    if(o.tg!=null&&col<0&&!root){ const q=1-o.tg; px+=sd*S*.08*q; pz+=(p[4]-.7)*S*.06*q; }
    if(o.br&&col<0) { pz+=Math.sin((o.tt||0)*5.2+j*1.3)*S*.028*o.br; ry+=Math.sin((o.tt||0)*3.1+j*2.1)*.03*o.br; }
    // breaking up: each piece in its own time falls under its own weight, turning outward, strikes the floor, rocks once and lies there; later it is eaten away
    const f=root?-1:p[12]<0?shed:col<0?-1:col-p[12];
    if(f>0){ const [zr,tl]=mtFall(p,S,pz), u=sat(f/tl), aft=Math.max(0,f-tl), e1=1-sat(f/(tl+.2)), e=1-e1*e1;
      pz=pz-(pz-zr)*u*u+Math.abs(Math.sin(aft*17))*Math.exp(-aft*8)*s*.05; px+=sd*S*(.14+.2*((j*7)%5)/5)*e; py+=Math.max(0,p[3])*S*.12*e*FSY;
      rx+=e*(bo?.9+(j%3)*.4:.25); ry+=sd*e*(bo?.7:1.05);
      const cu=o.cru?o.cru(p):0; cuv=cu; ero=cu*.06; pz-=cu*cu*s*.85; if(cu>=1) return; }
    // light climbs the crag from its foot (o.lvl 0..1), each piece lit in its own time; a fine tremor while it holds (o.trem)
    let pg=gl*(o.lvl==null?1:sat((o.lvl*1.05-p[4])*3.5+.25)); if(o.trem) rz+=Math.sin((o.tt||0)*23+j*1.7)*.02*o.trem;
    // a beat of light running up it from its foot to its head, again and again
    if(o.pul) pg*=1+o.pul*Math.exp(-Math.pow(((o.tt||0)*1.5%1)*1.9-.35-p[4],2)*22);
    // as it cools after the blow its faces go to dull grey ash (o.ash 0..1), the bigger stones last
    const ss=s*sk, ash=o.ash?sat(o.ash*1.3-p[5]*.25):0, al=ash>0?MTA[j].map((v,i)=>v+(ASH[i]-v)*ash):MTD[j];
    // rubble going to gravel splits in two halves that fall apart from each other as they sink
    const HL=cuv>0&&bo&&p[5]>.45?[-1,1]:[0]; for(const h of HL){ const hs=h?.74:1, hx=h*cuv*s*.42, hz=h?-Math.abs(h)*cuv*s*.12:0;
    F.solid(p[0],p[1],px+hx,py,pz+hz,{M:bo?cxf(ss*hs,rx+h*cuv*.5,ry,rz+h*cuv*.9,p[9]*(1-sq*.3)):F.xf({s:ss,rx,ry,rz}),alb:al,emis:o.emis||PJ.b,rimC:'#bfeede',spec:.55,rim:.32,vein:0,heat:root?0:(o.heat||0)*(o.land?.22:.3)*(.4+.6*pg/Math.max(.01,gl))*(.5+.5*mx[4]),ero,bump:1.2,tone:.18,
      detail:1,strata:mx[2],glow:(root?.3:.12+.8*Math.min(1.2,pg)*mx[4])*(o.cool??1),ore:.18,edge:mx[3],seed:j*.137+.05,...(mx[0]?{moss:mx[0],mossK:mx[1]}:{}),
      ...(o.land?{}:{clip:0}),a,ord:-.5+j*.01,shadow:o.land&&MSH[j]&&cuv<.6&&h<1?[.55,.28,.42*(1-cuv/.6)]:null}); } });
  if(o.seam&&gl>.01&&col<.3) for(const q of SEAM) F.bill(b.glowO,x+q[0]*S*(1+sp*.09),y+q[1]*S*FSY,Math.max(q[4]*S*.6,z+q[2]*S*(1-sq*.4)),q[3]*S*(1+sp*.25),q[4]*S,0,{cA:gc.cA,cB:gc.cB,cM:gc.cM,cC:gc.cC,a:gl*(o.a??1)*(col<0?1:1-col/.3),gain:1.7,ord:-.445});
  if((o.fis||0)>.01){ const fc=o.fc||C, fg=o.fg??1, fa=Math.min(1,o.fis);
    // the trunk crack is thick with a white heart in a wide jade bloom; the branches are thin and dull. A beat of light runs down each from the head to the foot
    FIS.forEach((L,li)=>{ const main=!li, tt=o.tt||0, ph=(tt*(main?1.3:1.7)+li*.37)%1, ps=L.map((q,i)=>{ const u=i/(L.length-1), bt=Math.exp(-Math.pow((u-ph*1.4+.2)*3.2,2)); return {x:x+q[0]*S*(1+sp*.06),y:y+2,z:Math.max(24,z+q[1]*S*(1-sq*.4)),w:S*(main?.075:.03)*(.4+.6*Math.sin(Math.PI*(i+.5)/L.length))*Math.min(1.3,o.fis)*(1+.55*bt)}; });
      F.ribbon(b.trB,ps,{cA:fc.cA,cB:fc.cB,cM:fc.cM,cC:fc.cC,gain:(main?2.4:1.1)*fg,a:fa*(main?1:.7),ord:.3,t0:tt*1.6,fd:[.05,.05,0,0]}); if(main) F.ribbon(b.trC,ps.map(q=>({x:q.x,y:q.y,z:q.z,w:q.w*.3})),{cA:fc.cB,cB:fc.cM,cM:fc.cC,cC:'#ffffff',gain:4*fg,a:fa,ord:.31,fd:[.05,.05,0,0]}); }); } }
// the floor heating up before something lands on it: soot first, then the light in the cracks climbs from a dull ember to white
let WM_=null;
function WM(){ if(WM_) return WM_; const m=F.mat, blk={cA:'#000000',cB:'#000000',cC:'#000000',op:1};
  WM_={s:m({tex:'v3_fissure',nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,...blk,layer:'g'}),
    b:m({tex:'v3_fissure',nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'}),
    // one length of a crack running over the floor: its soot and the light in it
    gs:m({tex:'v3_gash',nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,...blk,layer:'g'}),
    gb:m({tex:'v3_gash',nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'})}; return WM_; }
if(F&&F.on){ F.img('v3_fissure'); F.img('v3_gash'); }
// TAISHAN (sh_ult1): a falling mountain. A pillar of spirit light narrows on him while rings close in over the floor, and the floor above him splits:
// cracks run out from the mark toward every edge of the screen while a shadow spreads over the field. High in the cloud the crag is put together out of
// real stone, piece after piece thrown in and locking, its seams brighter with each one; gravel is drawn up into it; the peak crowns it last. Three stones
// run ahead of it into the crowd. It hangs for a breath and drops, faster and faster, the camera dropping with it.
// The contact frame is held: white at its foot, its face split by lines of light. Then a white-edged shock runs out to the edges, light bursts up out
// of the cracks one after another on its way out, dust rolls off in lumps, and everything on the screen is thrown. The floor answers: the ends of the
// cracks tear open at the edges of the screen in stone and light, and a shoulder is shaken off it. Its light cools; it cracks through, and comes down
// piece by piece under its own weight into rubble that is eaten away, leaving the pit and the burnt cracks.
function ultStones(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, BS=1100, Px=x0, Py=y0-Math.max(550,hh*.3), b=K.mats(), w=WM();
  const TB=.9, TA0=1.15, TA1=2.5, TH=2.5, TF=2.68, TC=2.98, HS=.12, TR=TC+HS, TS=TR+.55, TK=4.25, TG=4.9, TEND=6.1, Z0=300, Z1=700, AF=.4, st={kick:-9}, rocks=[];
  const WHT={...SPV,b:'#9dffe0',m:'#f2fff9',h:'#ffffff'}, GDP={...SPV,b:'#ffb640',m:'#fff0c0',h:'#ffffff'};
  // drawn straight into the particle layer (no mesh draws): streaks of light, soft glows, a ring on the floor. KJ = jade light, IN = the threads drawn in [angle, reach, phase, speed, white, height]
  const SLN=GFX.st(3,'add',{c2:GFX.rgb(PJ.b),c3:[1,1,1],L:3}), SGL=GFX.st(8,'add',{L:3}), SRG=GFX.st(2,'add',{c2:GFX.rgb(PJ.b),c3:[1,1,1],L:3}), KJ=GFX.rgb('#7dffd0'), KG=GFX.rgb('#ffd27a'), IN=[];
  const EYE=[.12,.5,.08];
  for(let i=0;i<40;i++) IN.push([rand(0,TAU),rand(.7,1.15),rand(0,1),rand(.8,1.3),Math.random()<.4,rand(30,700)]);
  // how far everything it heated has cooled (0 white .. 1 out), and the aftershock: up in .15s, then dying away
  const hk=t=>sat((t-TC)/2.7), pu=t=>t<TS?0:sat((t-TS)/.15)*Math.exp(-Math.max(0,t-TS-.15)*2.6);
  // when the piece of that order begins to come in
  const arr=o=>TA0+o*(TA1-TA0-AF)/13;
  // the height of the crag's foot at time t (it rises as it is built, hangs, and drops)
  // the giant's arms: hanging; lifted over its head while it hangs; wound up in the drop and hammered down to land with it (TC); lifted again and hammered down for the aftershock (TS)
  const armAt=t=>{ if(t<2.1||t>=TK) return 0; if(t<TF) return 2.4*eo3(sat((t-2.1)/(TF-2.1))); if(t<TC-.07) return mix(2.4,2.75,sat((t-TF)/(TC-.07-TF))); if(t<TC){ const u=sat((t-TC+.07)/.07); return mix(2.75,-.18,u*u); }
    if(t<TS-.45) return mix(-.18,0,eo3(sat((t-TR)/.25))); if(t<TS-.07) return 2.1*eo3(sat((t-TS+.45)/.38)); if(t<TS){ const u=sat((t-TS+.07)/.07); return mix(2.1,-.18,u*u); } return mix(-.18,0,eo3(sat((t-TS)/.3))); };
  // where a fist meets the floor, side -1/1: a white heart, a column of dust, stone thrown up
  const fist=(sd,g)=>{ const fx=Px+sd*BS*.95, fy=Py+BS*.34*FSY; K.flare(fx,fy,60,{pal:WHT,s:420*g,sx:1.6,sy:.6,dur:.16,gain:3.4}); GFX.light(fx,fy,900*g,'#e8fff4',.9,.3,{z:120});
    K.vsmoke(fx,fy,{s:300*g,dur:1.5,rise:1100*g,a:.85,c:'#141412',c2:'#8a8f86'}); K.debris(fx,fy,{n:Math.round(12*g),r:120,sp:[300,1200],up:2300,size0:10,size:34,c:'#4c5a54'}); K.dust(fx,fy,{n:8,r:200,sp:[250,800],a:.5,c:'#2e3332',c3:'#7d8682',life:1.3}); K.sparks(fx,fy,40,{pal:P,n:10,sp:[400,1500],up:1400,life:[.2,.5]}); };
  const zAt=t=>{ if(t>=TC) return 0; const as=sat((t-TA0)/(TH-TA0)), zs=as*as*(3-2*as), fq=sat((t-TF)/(TC-TF)); return mix(Z0,Z1,zs)*(1-fq*fq); };
  // all the time it is whole, grit and small stones keep running off it and falling, with now and then a spark of its light
  for(let tt=1.75;tt<TK;tt+=.06) after(tt,()=>{ if(!F.on) return; const zb=zAt(tt), up=tt<TC; for(let i=0;i<(up?2:1);i++){ const sd=Math.random()<.5?-1:1;
      GFX.pt({x:Px+sd*BS*rand(.15,1),y:Py+rand(-.05,.3)*BS*FSY,z:zb+BS*rand(.2,up?1:.8),vx:sd*rand(30,160),vy:0,vz:rand(-60,160),g:2600,drag:.2,life:rand(1,1.5),s:rand(7,20),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb('#4c5a64'),c2:'#0a0f0e',shadow:true,bounce:.3,fk:5,L:2}); }
    if(Math.random()<.5) GFX.pt({x:Px+rand(-.8,.8)*BS,y:Py+rand(0,.3)*BS*FSY,z:zb+BS*rand(.2,.9),vx:0,vy:0,vz:-rand(200,500),g:1400,drag:.5,life:rand(.3,.6),s:rand(3,5),m:3,len:.05,c:[.6,1,.85],c3:'#ffffff',c2:PJ.b,L:3}); });
  // cloud over the mark [x from, x to, height, size, seed], and gravel that lifts off the floor round it and is drawn up into the crag [angle, radius, height, size, start, turn, spin, when it is taken]
  const CL=[[-1500,-900,1500,820,3.1],[1450,880,1650,780,5.7],[80,20,2300,900,8.2]], GV=[]; for(let i=0;i<8;i++) GV.push([i/8*TAU+rand(-.3,.3)+.4,rand(430,1100),rand(180,520),rand(80,150),.3+i*.12,rand(0,6),rand(-1.2,1.2),1.5+i*.13]);
  // the cracks: six crooked lines from under the mark out past the edge of the widest view, each in four lengths
  const NR=6, NS=4, RY=[], RL=hw*2.2; for(let i=0;i<NR;i++){ const a=i/NR*TAU+.3+rand(-.22,.22), L=RL*rand(.86,1), p=[], r0=BS*.42, zg=Math.random()<.5?1:-1; [0,.2,.42,.66,1].forEach((u,j)=>{ const r=r0+(L-r0)*u, aa=a+(j?zg*(j%2?1:-1)*rand(.1,.2)*(1.3-u*.6):0); p.push([Px+Math.cos(aa)*r,Py+Math.sin(aa)*r*FSY]); });
    RY.push({a,p,uv:[0,1,2,3].map(()=>Math.random()<.5?[1,-1,0,1]:[1,1,0,0])}); }
  // one length of a crack as it is now: [middle x, middle y, half length, angle] (null before it has begun)
  const CT0=[.35,.9,1.6,TR+.01], CTD=[.6,.7,.9,.16], seg=(r,i,j,t)=>{ const t0=CT0[j]+(j<3?i*.08:0); if(t<t0) return null; const gi=eo3(sat((t-t0)/CTD[j])), p=r.p[j], n=r.p[j+1], dx=n[0]-p[0], dy=(n[1]-p[1])/FSY; return [p[0]+(n[0]-p[0])*gi*.5,p[1]+(n[1]-p[1])*gi*.5,Math.hypot(dx,dy)/2*gi,Math.atan2(dy,dx)]; };
  // stone driven up out of the cracks, leaning the way each crack runs [x, y, size, angle, variant, turn, when]: one row with the blow, and where the cracks reach the edges of the screen a taller row (each with a lesser one beside it) when the floor answers
  const HV=RY.map((r,i)=>{ const q=r.p[2]; return [q[0],q[1],rand(470,600),r.a,(Math.random()*4)|0,rand(0,TAU),TR+.1+i*.015]; }), EJ=[];
  RY.forEach((r,i)=>{ const q=r.p[3], n=r.a+Math.PI/2; EJ.push([q[0],q[1],rand(800,980),r.a,(Math.random()*4)|0,rand(0,TAU),TS+.02+i*.03]); EJ.push([q[0]+Math.cos(n)*210-Math.cos(r.a)*150,q[1]+(Math.sin(n)*210-Math.sin(r.a)*150)*FSY,rand(440,560),r.a+.25,(Math.random()*4)|0,rand(0,TAU),TS+.07+i*.03]); });
  S([['gx04',.12,{kick:[-.8,.6]}],['gx07',2.56],['gx11',.12,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',1.7],['gx14',9]]);
  // GEYSER: light bursting up out of a crack: a pillar with a white heart that jumps up and thins, sparks and stone thrown with it
  const geyser=(x,y,H,W,dl=0,big=0)=>after(dl,()=>{ if(F.on) GFX.add(big>0?.75:.5,(k,t)=>{ const up=eo3(sat(t/.08)), f=sat((k-.25)/.75), h=H*(.3+.7*up)*.5, nw=1-.6*f; F.bill(b.glowO,x,y,h,W*1.7*nw,h*1.08,0,{...C,a:.75*(1-f)*(1-f),gain:1.5}); F.bill(b.glowO,x,y,h*.92,W*.42*nw,h,0,{...CW,a:1-f,gain:3.2}); });
    K.sparks(x,y,40,{pal:P,n:big>0?14:7,sp:[300,1200],up:big>0?2400:1700,life:[.3,.7]}); if(big!==-1) K.debris(x,y,{n:big>0?9:5,r:90,sp:[250,900],up:big>0?2000:1500,size0:8,size:big>0?30:22,c:'#4c5a54'}); GFX.light(x,y,big>0?900:560,PJ.l,.7,.4,{z:120}); });
  // BILLOW: dust thrown off in separate lumps that roll outward, swell and thin: dark inside, lit along the rim. None is sent over the hero.
  const billow=(n,r0,r1,s,dur,o={})=>{ if(!K.vok||!K.vok()) return; const L=[], bx=o.x??Px, by=o.y??Py; for(let i=0;i<n;i++) L.push([o.full?i/n*TAU+rand(-.3,.3):Math.PI/2+.55+i/(n-1)*(TAU-1.1)+rand(-.12,.12),rand(.82,1.15),rand(.8,1.25),rand(0,90)]);
    GFX.add(dur,(k,t)=>{ const e1=1-k, e=1-e1*e1*e1, f=sat((k-.35)/.65); for(const q of L){ const r=mix(r0,r1*q[1],e), ss=s*q[2]*(.7+.5*e);
        VOL.add('blast',bx+Math.cos(q[0])*r,by+Math.sin(q[0])*r*FSY,ss*(.3+.4*e),{ex:ss*1.2,ey:ss*1.2,ez:ss,pa:[.5+.25*e,.6,2.4,.2+t*.5],pb:[0,1,1.2,.45+.4*k],dens:11*sat(k*12)*(1-f)*(1-f)*(o.a??1),seed:q[3],smoke:1,fire:1,cS:'#060a09',cK:o.cK||'#62827a',amb:.12,key:1.7,rim:.5,glow:0,steps:16,lit:o.lit??.75}); } },o.delay||0); };
  // ---- ready: close on him; the cast signal; a pillar of spirit light that beats and narrows, rings closing in on him over the floor, light drawn in to his feet
  GFX.ambient(.66,.72,.72,1.5); Cn.move({x:x0,y:y0-BODY*.6,zoom:1.35,tilt:.08},.5); SFX.rumble(2.6); Cn.drone(46,.3);
  after(.3,()=>{ K.flare(x0,y0,BODY*1.5,{pal:'azure',s:230,dur:.28,gain:2.6}); K.sparks(x0,y0,BODY*1.4,{pal:'azure',n:10,sp:[200,900],up:900,life:[.2,.45]}); GFX.light(x0,y0,900,'#bfe4ff',.9,.5,{z:200}); Cn.SND.shing(1,.5); SFX.bell();
    const pc=K.vcolumn(x0,y0-30,{r:70,h:2300,dur:1.2,pal:SPV,rise:.2,out:.3,heat:.9,twist:4,turb:.8,taper:.25,gain:.9,flow:.6}); K.embers(x0,y0,260,{pal:P,n:22,life:1.3,up:900});
    // ki drawn in from off the screen in spiralling threads, shells tightening on him, sparks and grit drawn up; at TB it climbs to the crag
    st.gat=K.gather(x0,y0-10,170,{dur:1.3,pal:P,r:640,R:1700,n:1.1,shells:3,core:0,gain:.9,debris:1,haze:1,sparks:1}); after(1.15,()=>st.gat.end());
    // three streams of ki at their own speeds: fast white threads (below), grit and pebbles dragged slowly along the floor, and small stones lifting and spiralling up the pillar
    for(let i=0;i<34;i++) after(i*.026,()=>{ if(!F.on) return; const u=i/34, a=rand(0,TAU), r=rand(900,1500)*(1-.3*u);
      GFX.pt({x:x0,y:y0,z:4,oc:[x0,y0,0],or:r,oa:a,ow:.9+1.6*u,ok:r/(1.05-.4*u),rmin:90,oz0:4,ob:6,life:1.2,s:rand(5,10)+u*5,rot:rand(0,TAU),vr:rand(-4,4),m:11,b:'alpha',c:GFX.rgb('#55605a'),c2:'#0a0f0e',pri:1,fk:3,L:2});
      if(i%2) GFX.pt({x:x0,y:y0,z:30,oc:[x0,y0,0],or:rand(180,320),oa:a,ow:2.6+3*u,ok:60,rmin:60,oz0:rand(20,120),ob:40,vz:rand(260,520)*(1+u),g:-200,life:rand(.7,1),s:rand(10,18),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb('#3d4a46'),c2:PJ.b,pri:1,fk:3,L:2}); });
    // the pillar swells and brightens the whole time; a white heart runs up its middle; three strands of ki wind up round it; threads of light are drawn in from every side
    if(F.on) GFX.add(1.2,(k,t)=>{ const kk=k*k, fo=1-sat((k-.88)/.12); pc.r=mix(44,150,Math.pow(k,1.3))*(1+.1*Math.sin(t*21)*(1-k)); pc.a=mix(.3,1.5,k);
      GFX.line(SLN,x0,y0-30,20,x0,y0-30,2200,mix(12,96,kk),[1,1,1],(.35+.65*k)*sat(t/.15)*fo,0,-t*(5+9*k),5,.35);
      for(let s3=0;s3<3;s3++) for(let j=0;j<16;j++){ const h0=j/16, h1=(j+1)/16, an=h=>s3*TAU/3+h*7-t*(5+9*k), rd=h=>pc.r*(1.9-.7*h)+50, A0=an(h0), A1=an(h1), R0=rd(h0), R1=rd(h1);
        GFX.line(SLN,x0+Math.cos(A0)*R0,y0-30+Math.sin(A0)*R0*FSY,h0*1900+20,x0+Math.cos(A1)*R1,y0-30+Math.sin(A1)*R1*FSY,h1*1900+20,5+7*k,j%3?KJ:[1,1,1],(.2+.7*k)*Math.sin(Math.PI*h0+.1)*(.45+.55*Math.sin(h0*11-t*16+s3*2))*fo,0,t*4+s3,1,0); }
      const nI=Math.round(12+28*k), sp=.8+2.4*k; for(let i=0;i<nI;i++){ const q=IN[i], ph=(q[2]+t*sp*q[3])%1, tl=.05+.04*k, pos=f=>{ const ff=Math.max(0,f)**2, r=1900*q[1]*(1-ff)+70, a=q[0]+3.2*ff; return [x0+Math.cos(a)*r,y0-10+Math.sin(a)*r*FSY,mix(q[5],170,ff)]; }, al=sat(ph*5)*sat((1-ph)*7)*(.6+.4*k)*(1-sat((k-.66)/.22));
        for(let g=0;g<3;g++){ const A=pos(ph-tl*g/3), B=pos(ph-tl*(g+1)/3); GFX.line(SLN,A[0],A[1],A[2],B[0],B[1],B[2],(2.5+2.5*k)*(1-g*.25),q[4]?[1,1,1]:KJ,al*(1-g*.3),0,t*3,1,0); } }
      for(const [t0,t1] of [[0,.62],[.28,.85]]){ const u=sat((t-t0)/(t1-t0)); if(u<=0||u>=1) continue; const e=Math.pow(u,1.6), r=mix(1500,130,e), th=mix(48,14,e); F.ring(b.shW,x0,y0,Math.max(0,r-th*3),r,{...C,a:sat(u*6)*(.45+.55*u),gain:1.1+1.8*u}); }
      if(!st['rf'+(t<.75?0:1)]&&(t>.61&&t<.75||t>.84)){ st['rf'+(t<.75?0:1)]=1; K.flare(x0,y0,160,{pal:WHT,s:260,dur:.2,gain:2.8}); GFX.light(x0,y0,700,PJ.l,.6,.25,{z:160}); } }); });
  const lamp=GFX.light(Px,Py,BS*1.5,PJ.l,.05,.4,{hold:TC,z:700});
  for(let i=0;i<30;i++) after(.1+i*.085,()=>{ const u=i/30, a=rand(0,TAU), r=rand(.1,1)*(400+u*hw*.9); GFX.pt({x:Px+Math.cos(a)*r,y:Py+Math.sin(a)*r*FSY,z:2,vz:rand(160,300)+u*900,g:-300-u*900,drag:.5,life:rand(.5,.9),s:rand(5,11)+u*6,rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#5c6a66'),c2:'#0a0f0e',shadow:true,fk:4,L:2}); });
  // ---- gathering: the camera lifts and pulls back in one move; cloud collects high over the mark
  after(TB,()=>{ Cn.move({x:Px,y:Py-1000,zoom:.5,tilt:.28},1.05,'out'); GFX.ambient(.46,.52,.56,1.8); SFX.rumble(2); });
  // ---- contact: one held frame. White at the foot of it, its face split by light, the screen pulled toward it
  const contact=()=>{ if(st.hit) return; st.hit=1; fist(-1,1); fist(1,1); Cn.flash(.55); Cn.peak(Px,Py,{ca:.03,blur:.16,tint:'#58d6a8',hold:HS,out:.34}); hitstop=Math.max(hitstop,HS); GFX.light(Px,Py+BS*.3,hw*1.9,PJ.l,.8,.5,{z:420}); GFX.light(Px,Py+BS*.2,BS*1.6,'#f2fff8',1,.22,{z:120});
    K.flare(Px,Py+BS*.3,70,{pal:WHT,s:BS*.7,sx:2.6,sy:.3,dur:HS+.12,gain:3.8}); K.flare(Px,Py+BS*.32,90,{pal:GDP,s:BS*.4,sx:1,sy:1,dur:HS+.12,gain:4.2}); K.flare(Px,Py+BS*.37,70,{pal:P,s:1100,sx:2.4,sy:.45,dur:HS+.08,gain:2.4});
    Cn.SND.hit(1); Cn.SND.gong(1); SFX.boom(1.6,1); Cn.move({x:Px,y:Py-BS*.5,zoom:.44,roll:-.035},HS,'out'); K.vcolumn(Px,Py+BS*.3,{r:200,h:1800,dur:.3,rise:.04,out:.2,pal:WHT,heat:1.2,twist:1.5,turb:.2,flow:.8}); GFX.ambient(.6,.68,.66,.3); };
  // ---- release: the hold lets go into shake; a white-edged shock, light out of the cracks, lumps of dust, and everything on the screen is thrown
  const release=()=>{ if(st.rel) return; st.rel=1; Cn.shake(1.5); after(.12,()=>Cn.shake(1.1)); after(.26,()=>Cn.shake(.7)); Cn.move({roll:0},.35,'out'); SFX.shatter(1); SFX.boom(1.3,.9);
    billow(7,BS*.72,BS*1.8,520,1);
    K.chunks(Px,Py+BS*.3,{n:3,kind:'slab',r:BS*.9,sp:[700,1900],up:2600,s:[90,220],pal:ST,rock:ROCK,life:2.2});
    K.debris(Px,Py+BS*.2,{n:40,r:BS*.8,sp:[600,2600],up:2600,size0:14,size:44,c:'#4c5a54'}); K.sparks(Px,Py+BS*.3,80,{pal:P,n:36,sp:[900,3200],up:1500,life:[.3,.9]});
    GFX.ripple(Px,Py,hw*2.2,{life:.5,s:.9}); K.cool(Px,Py,{kind:'crater',r:BS*1.22,pal:P,life:TEND-TR+1.2,grow:.06,light:0}); K.cool(Px,Py,{kind:'crack2',r:hw*1.25,pal:P,life:TEND-TR+1,hot:.6,grow:.3,rot:.5,light:0});
    // the shock itself: a white line with a jade wake, from under it to past the edge of the screen
    if(F.on) GFX.add(.55,k=>{ const e=1-(1-k)*(1-k), r=BS*.6+(RL*1.1-BS*.6)*e, th=160+300*e; F.ring(b.shW,Px,Py,Math.max(0,r-th*4),r,{...C,a:1-k,gain:2.2}); }); jwave(Px,Py,BS*.6,RL*1.1,.5,2.2);
    // a second, hotter front right on the floor: white-gold, thin, running ahead of the jade one
    if(F.on) GFX.add(.45,k=>{ const e=1-(1-k)*(1-k)*(1-k), R=BS*.55+RL*1.2*e; GFX.bill(SRG,Px,Py,4,R,R*FSY,0,KG,(1-k)*1.2,.93,k*3,.06*(1-.5*k),.04); });
    K.sparks(Px,Py+BS*.3,120,{pal:GDP,n:26,sp:[1200,3600],up:900,life:[.25,.6]});
    // light out of the cracks, one burst after another on the way out
    RY.forEach((r,i)=>geyser(r.p[2][0],r.p[2][1],900,110,.1+i*.015));
    // every enemy on the screen: the floor bursts under it as the front reaches it, it is thrown outward, and struck when it comes down
    const E=onScreen(400), ev=Math.max(1,Math.ceil(E.length/10)), gv=Math.max(1,Math.ceil(E.length/10)); E.forEach((e,i)=>{ const d=Math.hypot(e.x-Px,(e.y-Py)/FSY), dl=Math.min(.5,d/7000), dir=Math.atan2((e.y-Py)/FSY,e.x-Px);
      after(dl,()=>{ if(e.dead) return; K.knock(e,{from:[Px,Py],dist:620,up:2100}); K.dust(e.x,e.y,{n:4,r:70,sp:[150,450],a:.45,c:'#3a3f40',c3:'#8d9692',life:.9}); if(i%ev===0&&d>BS*1.1) K.ehit(e,{pal:P,pw:1.6,dir}); else K.sparks(e.x,e.y,ez(e),{pal:P,n:4,dir,spread:.5,sp:[400,1100],up:300,life:[.15,.35],s:3}); if(i%gv===(gv>1?1:0)&&d>BS*.8) geyser(e.x,e.y,520,80,0,-1); });
      after(dl+.42,()=>{ if(!e.dead) ultHit(e,Dm*.75,Px,Py); }); });
    for(const r of rocks){ K.sparks(r.x,r.y,r.s*.8,{pal:P,n:10,sp:[200,800],up:1900,g:900,life:[.3,.7]}); K.dust(r.x,r.y,{n:5,r:r.s*.7,sp:[200,520],a:.4,c:'#2e2820'}); }
    after(.4,()=>K.embers(Px,Py+BS*.3,hw*.9,{pal:P,n:40,life:2,up:380})); };
  // stones shaken off its head and shoulders
  const fallrock=(n,top)=>{ for(let j=0;j<n;j++){ const a=rand(0,TAU), vv=rand(80,520); GFX.pt({x:Px+rand(-1,1)*BS*.9,y:Py+rand(-.1,.3)*BS,z:rand(.4,top)*BS,vx:Math.cos(a)*vv,vy:Math.sin(a)*vv*FSY,vz:rand(-100,300),g:2600,drag:.3,life:rand(.9,1.5),s:rand(14,40),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4c5a64'),c2:'#0a0f0e',shadow:true,bounce:.3,fk:5,L:2}); } };
  // ---- the floor answers: where the cracks reach the edges of the screen they tear open in stone and light; the crag jolts, a shoulder comes off it
  const shock2=()=>{ if(st.s2) return; st.s2=1; fist(-1,.8); fist(1,.8); hitstop=Math.max(hitstop,.05); Cn.shake(1.1); SFX.boom(1.3,.9); Cn.SND.hit(.8); SFX.shatter(.8); GFX.light(Px,Py+BS*.4,hw*1.4,PJ.l,.6,.5,{z:200}); Cn.move({zoom:.46},.25,'out');
    EJ.forEach((h,i)=>{ if(i%2) return; const dl=h[6]-TS; geyser(h[0],h[1],1500,130,dl,1); K.vcolumn(h[0],h[1],{r:90,h:1500,dur:.95,rise:.1,out:.5,pal:SPV,heat:1.1,twist:2.4,turb:.7,delay:dl});
      after(dl,()=>{ if(i%4===0) K.chunks(h[0],h[1],{n:1,kind:'slab',r:120,sp:[300,900],up:1900,s:[50,100],pal:ST,rock:ROCK,life:1.6}); if(i<8) K.cool(h[0],h[1],{kind:'scorch',r:300,pal:P,life:TEND-TS+.8,light:0}); let m=0; inCircle(h[0],h[1],520,e=>{ if(m++<1) K.ehit(e,{pal:P,pw:1.5,dir:h[3]}); }); }); });
    jwave(Px,Py,BS*.9,RL*1.05,.55,1.5);
    billow(5,BS*.8,BS*1.5,300,.8,{a:.8}); fallrock(14,1.5); K.debris(Px,Py+BS*.3,{n:14,r:BS*.9,sp:[300,1300],up:1500,size0:10,size:30,c:'#4c5a54'}); K.sparks(Px,Py+BS*.3,60,{pal:P,n:24,sp:[500,2000],up:1300,life:[.3,.8]});
    for(const e of onScreen(400)) if(!e.dead){ K.knock(e,{from:[Px,Py],dist:260,up:1200}); ultHit(e,Dm*.25,Px,Py); } };
  // ---- it begins to come down: dust low over the floor from the first frame, stones off its head
  const gravel=()=>{ if(st.gr) return; st.gr=1; K.dust(Px,Py+BS*.25,{n:18,r:BS*.9,sp:[200,700],a:.5,c:'#2e3332',c3:'#7d8682',life:1.4}); SFX.rumble(.8); };
  const fallStart=()=>{ if(st.fs) return; st.fs=1; SFX.rumble(1.4); SFX.shatter(.9); Cn.shake(.6); K.dust(Px,Py+BS*.15,{n:14,r:BS*1.1,sp:[250,800],a:.45,c:'#2a2f2e',c3:'#6f7975',life:1.5}); fallrock(12,1.3); K.dust(Px,Py+BS*.3,{n:16,r:BS*.8,sp:[300,900],a:.45,c:'#3a3f40',c3:'#8d9692',life:1.2}); };
  // ---- the mountain, its shadow, the cracks and the floor: one clock for all of them
  if(F.on) GFX.add(TEND+.1,(k,t)=>{ const as=sat((t-TA0)/(TH-TA0)), fq=sat((t-TF)/(TC-TF)), landed=t>=TC, tl=Math.max(0,t-TR), hv=landed?hk(t):1, pre=sat((t-.3)/(TH-.3)), col=t<TK?-1:t-TK, shed=t<TS+.12?-1:t-TS-.12, eat=sat((t-TG)/1), p2=pu(t), pk=sat((t-(TK-.35))/.35), cru=p=>sat((t-TG-Math.max(0,p[12])*.5)/.75);
    if(landed) contact(); if(t>=TR) release(); if(t>=TS) shock2(); if(t>=TK) fallStart(); if(t>=TG-.2) gravel();
    // cloud: dark, heavy, torn open where it comes through
    if(t>TB&&t<TC&&K.vok&&K.vok()){ const ci=sat((t-TB)/.6), part=Math.max(sat((t-2.3)/1.2)*.5,fq), gq=eo3(sat((t-TB)/1.3)); CL.forEach((c,j)=>{ const sg=j===2?0:Math.sign(c[0]);
        VOL.add('blast',Px+mix(c[0],c[1],gq)+sg*part*part*700,Py,c[2]-part*220,{ex:c[3]*(1+.35*part),ey:c[3],ez:c[3]*.7,pa:[.55+.2*ci,.58,2.2,.2+t*.06],pb:[0,1,1,.5+.3*part],dens:10*ci*(1-part)*(1-part),seed:c[4],smoke:1,fire:1,cS:'#0b0e11',cK:'#66727a',amb:.22,key:1.1,rim:.5,glow:0,steps:20}); }); }
    // the crag's height and whether it is seen yet
    const zs=as*as*(3-2*as), zc=mix(Z0,Z1,zs), z=landed?-BS*.06*sat((t-TS)/.1):zc*(1-fq*fq);
    // the gathering climbs from his feet to the underside of the crag and rides it down
    
    // gravel: it lifts, hangs, and is taken up into the crag
    if(t<TH) for(const v of GV){ if(t<v[4]) continue; const tt=t-v[4], gx=Px+Math.cos(v[0])*v[1], gy=Py+Math.sin(v[0])*v[1]*FSY; if(Math.hypot(gx-x0,gy-y0)<300) continue; const up=1-Math.exp(-tt*1.1), su=sat((t-v[7])/.42), s2=su*su; if(su>=1) continue;
        F.solid('rock',(v[5]|0)%4,mix(gx,Px,s2),mix(gy,Py,s2),mix(v[2]*up+v[3]*.4,zc+BS*.35,s2),{M:cxf(v[3]*sat(.3+tt*2),v[5]+tt*v[6]*(1-up*.8)+s2*5,tt*.4*(1-up*.8),v[5]),alb:ROCK,emis:PJ.b,rimC:PJ.h,spec:.45,rim:.25,vein:.1+.2*up+s2*.5,heat:0,bump:1.2,tone:.18,detail:1,strata:4,glow:.15+.35*up+.7*s2,ore:.2,edge:.09,seed:v[5]*.1,clip:0,shadow:su>0?null:[.55,.28,.4],ord:-.6}); }
    // the floor under the mark: soot, then the shadow, then the light in the cracks over both
    const Hp=K.heat(SPV,mix(.7,.22,pre)), Hc=landed?K.heat(SPV,hv*(1-.5*p2)):Hp;
    if(!landed){ const i=eo3(sat((t-.12)/.7)), rr=mix(300,BS*.78,eo3(sat(t/2.7)))*i; F.quad(w.s,Px,Py,rr*1.04,rr*1.04,.6,{a:.8*i,ero:.1,rv:[1.1,.2,0,.1]}); st.rr=rr; lamp.a=.06+.42*pre*pre; }
    if(!F.low) RY.forEach((r,i)=>{ for(let j=landed?1:0;j<NS;j++){ const g=seg(r,i,j,t); if(g) F.quad(w.gs,g[0],g[1],g[2]*1.06,[230,200,170,150][j],g[3],{a:.9,ero:.1+.7*eat,uvT:r.uv[j],fd:[.03,.03,0,0]}); } });
    // its shadow: small and faint at first, spreading and darkening the whole time it comes; it closes hard in the drop, and lies thrown to one side once it stands
    if(t>.35&&col<.5){ const g=sat((t-.35)/(TH-.35)), r=BS*(mix(.3,1.02,g)+.26*fq); F.quad(b.dark,Px+(landed?BS*.2:0),Py+BS*.12,r*(landed?1.12:1),r,0,{a:(mix(.3,.74,g)+.2*fq)*(col<0?1:1-col/.5)}); }
    if(!landed) F.quad(w.b,Px,Py,st.rr,st.rr,.6,{cA:Hp.cA,cB:Hp.cB,cM:Hp.cM,cC:Hp.cC,a:sat(t/.4),gain:2.4*Hp.g,bgain:1.1*Hp.g,ero:.5-.42*pre,rv:[1,.3,0,.1]});
    if(hv<1||!landed) RY.forEach((r,i)=>{ for(let j=landed?1:0;j<NS;j++){ const g=seg(r,i,j,t); if(!g) continue; const wd=[150,128,108,95][j]*(landed?1.7+.5*p2:1);
        F.quad(w.gb,g[0],g[1],g[2],wd,g[3],{cA:Hc.cA,cB:Hc.cB,cM:Hc.cM,cC:Hc.cC,a:landed?Math.min(1,(1-hv)*3.2):1,gain:(landed?3.2:mix(1.5,2.8,pre))*Hc.g,bgain:1.2*Hc.g,ero:landed?.08+.5*hv*hv+eat*.5:.3-.2*pre,uvT:r.uv[j],fd:[.03,.03,0,0]}); } });
    // the stone driven up out of the cracks: it comes in two frames, shudders, stands with light at its foot, and goes back down as the crag breaks up
    const fang=(h,i,tk)=>{ if(t<h[6]) return; const s=h[2], tt=t-h[6], e=tt<.08?eo3(tt/.08)*1.12:tt<.14?mix(1.12,.97,(tt-.08)/.06):mix(.97,1,sat((tt-.14)/.1)), f=sat((t-tk)/.5); if(f>=1) return; const ca=Math.cos(h[3]), sa=Math.sin(h[3]), ln=(.36+.1*Math.exp(-tt*9)*Math.sin(tt*30)+.07*p2)*(1+f*.8);
      F.solid('spike',h[4],h[0],h[1],s*(e-1)*.95-f*f*s*.95,{M:F.xfw({s,rz:h[5],rx:sa*ln,ry:ca*ln}),alb:'#2a333b',emis:Hc.cM,rimC:'#bfeede',spec:.55,rim:.35,vein:0,heat:.25*Math.exp(-tt*3),ero:0,bump:1.2,tone:.18,detail:1,strata:5,glow:.3+.9*(1-hv),ore:.15,edge:.08,seed:i*.29+.4,shadow:s>620?[ca*.6,sa*.6,.4*e*(1-f)]:null}); };
    HV.forEach((h,i)=>fang(h,i,TK+.5+i*.08)); EJ.forEach((h,i)=>{ if(!(i%2)) fang(h,i,TK+.25+i*.05); });
    // each piece that reaches the floor: dust and chips where it lands
    MT.forEach((p,j)=>{ const f=p[6]===Math.PI?-1:p[12]<0?shed:col<0?-1:col-p[12]; if(f<=0||st['c'+j]) return; const [zr,ft]=mtFall(p,BS,p[4]*BS); if(f<ft) return; st['c'+j]=1; const sd=p[2]<-.04?-1:p[2]>.04?1:0, px=Px+p[2]*BS+sd*BS*.2, py=Py+p[3]*BS*FSY+BS*.1, s=BS*p[5], big=p[5]>.95;
      K.dust(px,py,{n:big?12:6,r:s*.35,sp:[200,big?900:600],a:.5,c:'#3a3f40',c3:'#8d9692',life:1.1}); K.debris(px,py,{n:big?10:5,r:s*.3,sp:[200,900],up:big?1500:1000,size0:8,size:28,c:'#4c5a54'}); K.sparks(px,py,40,{pal:P,n:big?8:4,sp:[200,900],up:900,life:[.25,.6]}); Cn.shake(big?.5:.22); if(big) SFX.boom(.9,.7); else if(j%2) sfx('shatter',.35); });
    // each piece of the rubble as it goes to gravel
    if(t>=TG) MT.forEach((p,j)=>{ if(p[6]===Math.PI||st['g'+j]||t<TG+Math.max(0,p[12])*.5) return; st['g'+j]=1; const sd=p[2]<-.04?-1:p[2]>.04?1:0, s=BS*p[5], gx=Px+p[2]*BS+sd*BS*.22, gy=Py+p[3]*BS*FSY+BS*.08, n=Math.round(clamp(s/90,4,12)*(GFX.QK||1));
      for(let i=0;i<n;i++){ const a=rand(0,TAU), vv=rand(80,480); GFX.pt({x:gx+rand(-.4,.4)*s,y:gy+rand(-10,10),z:rand(.05,.5)*s,vx:Math.cos(a)*vv,vy:Math.sin(a)*vv*FSY,vz:rand(60,520),g:2600,drag:.3,life:rand(.7,1.2),s:rand(12,34),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4c5a64'),c2:'#0a0f0e',shadow:true,bounce:.35,fk:5,L:2}); }
      K.dust(gx,gy,{n:5,r:s*.3,sp:[150,500],a:.45,c:'#3a3f40',c3:'#8d9692',life:1}); if(j%3===0){ sfx('shatter',.3); Cn.shake(.15); } });
    if(t<TA0||t>TG+1.2) return;
    // each piece as it locks into the rest: a spark at the joint, a jolt, the seams lit
    for(let o=0;o<=13;o++){ if(st['a'+o]||t<arr(o)+AF) continue; st['a'+o]=1; if(!o) continue; st.kick=t; const last=o===13; Cn.shake(last?.4:.14); sfx('boom',last?1:.5,last?.6:.3); K.sparks(Px+rand(-.4,.4)*BS,Py,zc+BS*rand(.3,.9),{pal:P,n:last?16:7,sp:[300,1300],up:200,life:[.2,.5]}); GFX.light(Px,Py,BS*1.3,PJ.l,last?.5:.25,.3,{z:500}); }
    // streaks torn off it and the air it drags down while it falls
    if(!landed&&fq>0){ for(let i=0;i<5;i++){ const dx=(i/4-.5)*1.7*BS+Math.sin(i*5.1)*90, top=z+BS*(.55+.6*(1-Math.abs(i/4-.5)*1.5)), len=(260+1900*fq)*(.6+.4*Math.sin(i*2.3+1)); F.bill(b.glowO,Px+dx,Py,top+len*.5,34+16*Math.sin(i*3.7),len*.5,0,{...CW,a:.6*fq,gain:1.5,ord:-.7}); }
      if(!F.low) for(let i=0;i<2;i++){ const sd=Math.random()<.5?-1:1; GFX.pt({x:Px+sd*BS*rand(.4,1),y:Py+rand(-.2,.3)*BS*FSY,z:z+BS*rand(.1,.9),vx:sd*rand(20,120),vy:0,vz:rand(1200,2600),g:0,drag:1.2,life:rand(.2,.4),s:rand(3,5),m:3,len:.1,c:[.8,.9,.9],c3:'#c8e8dc',c2:'#566a66',L:3}); } }
    if(!landed&&t>TC-.14){ const u=sat((t-TC+.14)/.14); F.bill(b.glowO,Px,Py+BS*.3*FSY,40,BS*(.2+1.1*u*u),BS*(.08+.25*u*u),0,{...CW,a:.4+.6*u,gain:2+2.5*u,ord:.4}); }
    const sqz=landed?(t<TR?.3:.3*Math.exp(-tl*22))+.1*p2:0, kk=sat((t-st.kick)/.05)*Math.exp(-Math.max(0,t-st.kick-.05)*7);
    const gl=landed?Math.max(t<TR?1:Math.exp(-tl*1.3),.85*p2,.9*pk):.1+.5*as*as+.3*kk+.25*fq, Hm=landed?K.heat(SPV,hv*.9*(1-.6*Math.max(p2,pk))):null, Hf=K.heat(SPV,landed?hv*.85*(1-.7*Math.max(p2,pk)):mix(.62,.34,as));
    crag(Px+(t>TH&&!landed?Math.sin(t*64)*5*(1-fq):0),Py,z,BS,{a:1,tg:landed?null:eo3(sat((t-1.95)/.75)),arm:armAt(t),ash:landed?sat((t-TK-.3)/1.3):0,land:landed,sq:sqz,sp:landed?1+.6*sat((t-TS)/.15):0,asm:t<TA1+.05?o=>(t-arr(o))/AF:null,col,shed,cru,glow:gl,lvl:landed?1:sat((t-1.85)/(TC-1.85)),cool:landed?Math.max(1-sat((t-TK-.2)/1.5),.6*Math.exp(-Math.abs(t-5.3)*9)*sat((t-TK)/.1)):1,trem:landed?0:sat((t-2.15)/.5)*(1-fq),tt:t,br:landed?(t<TK?1.2:0):sat((t-1.6)/.4)*(1-fq),pul:landed?(t>TS+.2&&t<TK+.3?.9:0):sat((t-1.9)/.4)*1.3*(1-fq),gc:Hm?{cA:Hm.cA,cB:Hm.cB,cM:Hm.cM,cC:Hm.cC}:null,
      emis:Hm?(col>0?F.rgb(Hm.cM).map((v,i)=>v+([1,.48,.16][i]-v)*sat(col/.7)):Hm.cM):PJ.b,heat:landed?Math.max(t<TR?1.1:1.1*Math.exp(-tl*1.6),.12*(1-hv))+.5*p2+.5*pk*(col<0?1:Math.exp(-col*3)):.03+.5*as*as+.12*kk+.3*fq,
      fis:landed?(col<.3?(t<TR?1.2:Math.max(.25,1-hv*1.6)+.4*p2+.5*pk)*(col<0?1:1-col/.3):0):.55*sat((as-.45)/.55)+.3*fq,fc:Hf,fg:landed?Hf.g:.55});
    // its eyes: two points of light in the head stone, lit as the head locks on, white-gold at the blow, going out as it cools
    { const hp=MT[3], ha=t-(arr(hp[11])+AF); if(ha>0&&!st.eyf){ st.eyf=1; for(const sx of [-1,1]) K.flare(Px+sx*BS*EYE[0],Py+EYE[1]*BS*FSY,z+hp[4]*BS+EYE[2]*BS,{pal:WHT,s:220,sx:1.8,sy:.5,dur:.18,gain:3}); } if(ha>-.3&&col<.4){ const spl=landed?1+.6*sat((t-TS)/.15):0, ex=Px+hp[2]*BS*(1+sqz*.14+spl*.09), ey=Py+hp[3]*BS*FSY+EYE[1]*BS*FSY, ez=z+hp[4]*BS*(1-sqz*.4)-spl*BS*.015+EYE[2]*BS+Math.sin(t*5.2+3.9)*BS*.016*(landed?(t<TK?.6:0):1);
        const ea=(ha<0?.18*sat((ha+.3)/.3):sat(ha/.12)*(1+1.5*Math.exp(-ha*6)))*(landed?Math.max(.2,1-sat((t-TK)/.4)):1)*(col>0?1-col/.4:1), hot=landed&&t<TS+.3;
        for(const sx of [-1,1]){ const xx=ex+sx*BS*EYE[0]; const ew=ha<0?.2:.25+.75*sat(ha/.12); F.bill(b.glowO,xx,ey,ez,240*ew,90*ew,sx*.12,{...(hot?{cA:GDP.b,cB:GDP.m,cM:'#ffffff',cC:'#ffffff'}:CW),a:Math.min(1,ea),gain:3.2*(.7+.3*ea),ord:.5}); } } } });
  // ---- three stones run ahead of it into the thickest of the crowd to the left, to the right and in front of the mark
  { const E=onScreen(200), ok=e=>Math.hypot(e.x-x0,e.y-y0)>380&&Math.hypot(e.x-Px,(e.y-Py)/FSY)>BS*1.05&&e.y<y0-40&&e.y>Py-520,
      pick=(fn,fb)=>{ let best=null, bn=-1; for(const e of E){ if(!fn(e)||!ok(e)) continue; let n=0; for(const o of E) if(Math.hypot(o.x-e.x,o.y-e.y)<420) n++; if(n>bn){ bn=n; best=e; } } return best?[best.x,best.y]:fb; },
      spots=[pick(e=>e.x<Px-hw*.45,[Px-hw*.72,Py+60]),pick(e=>e.x>Px+hw*.45,[Px+hw*.7,Py-60]),pick(e=>Math.abs(e.x-Px)>hw*.3&&e.y>Py+200,[Px+hw*.5,y0-90])];
    [[1.25,200],[1.75,270],[2.25,340]].forEach(([at,s],i)=>{ const [x,y]=spots[i], sd=x<Px?-1:1, FL=.5, r=boulder(x,y,{s,h0:1900,dur:FL,delay:at-FL,vx:sd*rand(260,420),lead:0,stay:9,lite:1,fd:.6,sink:1,emerge:1,vk:0,bump:1.3,tone:.2,rock:'#333e47',det:{detail:1,strata:4,glow:.5,ore:.15,edge:.09,seed:i*.31+.2}}); rocks.push(r);
      if(F.on) GFX.add(.7,k=>{ const rr=s*(2.5-1.4*k); F.quad(b.dark,x,y,rr,rr,0,{a:.1+.55*k*k}); },at-.7);
      after(at,()=>{ thud(x,y,s,{grey:i===1,n:8,smoke:0,ring:0}); billow(4,s*.7,s*2.3,s*.95,.7,{x,y,full:1,a:.8,lit:.35,cK:"#4e6a62"}); K.chunks(x,y,{n:3,r:s*.4,sp:[300,800],up:1500,s:[30,70],pal:ST,rock:ROCK,life:1.4}); K.cool(x,y,{kind:'crater',r:s*1.9,pal:P,life:TEND-at+.4,light:0});
        Cn.shake(.3+i*.1); hitstop=Math.max(hitstop,.03); SFX.boom(.8+i*.15,.6+i*.1);
        const near=[]; for(const e of onScreen(300)){ if(Math.hypot(e.x-x,e.y-y)<420){ K.knock(e,{from:[x,y],dist:260,up:900}); near.push(e); } else if(!e.d.boss&&!e.d.heavy){ e.vz=Math.max(e.vz,400); e.stun=Math.max(e.stun,.35); } }
        after(.22,()=>{ for(const e of near) if(!e.dead) ultHit(e,Dm,x,y); }); }); }); }
  // ---- held breath: it stops in the air; then the drop, the camera dropping with it. (The blow itself is driven by the mountain's own clock; these are only the fallback.)
  after(TH,()=>{ Cn.hush(.2); Cn.move({zoom:.55,roll:.03},.18); });
  after(TF,()=>{ SFX.whoosh(.5,1); Cn.move({y:Py-BS*.62,zoom:.57},TC-TF,'lin'); });
  after(TC+.05,contact); after(TR+.05,release); after(TS+.05,shock2);
  // ---- wreckage: the stones that ran ahead crumble too; the camera comes home over the rubble
  after(TK,()=>{ GFX.light(Px,Py+BS*.3,BS*1.8,PJ.l,.5,1.6,{z:200}); after(.5,()=>K.embers(Px,Py+BS*.3,BS*1.2,{pal:P,n:36,life:1.8,up:420})); const L=rocks.slice().sort((p,q)=>Math.hypot(p.x-x0,p.y-y0)-Math.hypot(q.x-x0,q.y-y0)); L.forEach((r,j)=>after(.3+j*.3,()=>{ r.crumble(); K.dust(r.x,r.y,{n:6,r:r.s*.6,sp:[150,420],a:.4,c:'#2e2820'}); sfx('shatter',.4); })); });
  after(TEND-1.3,()=>{ Cn.back(1.2); GFX.ambient(1,1,1,1.3); });
  after(TEND,()=>{ for(const r of rocks) if(r.t1<0) r.crumble(); ultStop(); }); }

// JBEAM: a ray of spirit light from a point in the air {x,y,z} to a point on the floor {x,y}: thick where it leaves, drawn thin, swelling again where it lands, a pulse running down it;
// it runs out in four frames, holds, and burns away from the near end.  o: {w, hold, out, z, delay, onHit}
function jbeam(a,T,o={}){ if(!F.on){ if(o.onHit) after((o.delay||0)+.07,o.onHit); return; } const b=K.mats(), hold=o.hold??.2, out=o.out??.22, W=o.w||70, n=9, sd=rand(0,9), J=[], st={hit:0}; for(let i=0;i<n;i++) J.push([rand(-1,1),rand(-1,1)]);
  const bx=T.x, by=T.y, bz=o.z??70, len=Math.hypot(bx-a.x,(by-bz)-(a.y-a.z))||1;
  GFX.add(.07+hold+out,(k,t)=>{ const g=sat(t/.07), f=sat((t-.07-hold)/out), ps=[], pc=[];
    for(let i=0;i<n;i++){ const u=mix(f,1,i/(n-1))*g, en=Math.sin(Math.PI*u), jj=len*.016*en, w=W*(1.5-1.6*u+1.3*u*u*u)*(1+.2*Math.sin(u*11-t*46+sd))*(1-f*.55), px=mix(a.x,bx,u)+J[i][0]*jj, py=mix(a.y,by,u), pz=Math.max(0,mix(a.z,bz,u)+J[i][1]*jj);
      ps.push({x:px,y:py,z:pz,w:w*(o.l3?2.9:1.9)}); pc.push({x:px,y:py,z:pz,w:w*(o.l3?.24:.45)}); }
    // three layers when asked: a wide faint haze, the coloured body, and a thin white heart running hotter than both
    // (the lesser rays are one thin jade-to-white line, so the great ones lead)
    if(o.l3){ F.ribbon(b.trB,ps,{...C,a:(1-f*f)*.5,gain:1.3,t0:sd,fd:[.03,.02,0,0]}); F.ribbon(b.trB,ps.map(q=>({...q,w:q.w*.36})),{...CW,a:1-f*f,gain:2.6,t0:sd+3,fd:[.03,.02,0,0]});
      F.ribbon(b.trC,pc,{cA:'#ffffff',cB:'#ffffff',cM:'#ffffff',cC:'#ffffff',a:1-f,gain:5.5,t0:sd,fd:[.03,.02,0,0]}); }
    else F.ribbon(b.trB,ps.map(q=>({...q,w:q.w*.5})),{...CW,a:1-f*f,gain:2.8,t0:sd,fd:[.03,.02,0,0]});
    if(g>=1){ const r=W*(o.l3?1.5:3)*(1-f*.6); if(o.tip) F.bill(b.glowO,bx,by,bz,r,r,0,{...CW,a:1-f,gain:2.6}); if(!st.hit){ st.hit=1; if(o.onHit) o.onHit(); } } },o.delay||0); }
// JHIT: where a ray lands: a pillar of light standing up out of the floor, a burst, stone thrown, and the floor left burnt.  o: {h, vol (0 none / 1 a column of spirit fire / 2 a ball of it), scorch}
function jhit(x,y,o={}){ const b=K.mats(), H=o.h||560, W=o.w||120;
  // the pillar: one jet of light, white down its middle and jade to its edges, streaks running up it; it shoots up, thins, and its foot lets go first
  if(F.on&&o.pil!==0){ const u2=U2(), sd=rand(0,9); GFX.add(.55,(k,t)=>{ const up=eo3(sat(t/.09)), f=sat((k-.25)/.75), h=mix(.2,1,up)*H*.5*(1+.25*f), lift=H*.1*f*f; F.bill(u2.jet,x,y,h+lift,W*.6*(1-.55*f),h,0,{...CW,a:1-f*f,gain:2.6*(1-.4*f),ero:.06+.5*f,t0:sd}); }); }
  if(o.pil===0) K.flare(x,y,70,{pal:P,s:W*2.3,dur:.18,gain:2.4}); K.sparks(x,y,40,{pal:P,n:7,sp:[500,1600],up:600,life:[.15,.35]}); K.debris(x,y,{n:6,r:90,sp:[250,900],up:1500,size0:8,size:22,c:'#4c5a54'}); GFX.light(x,y,560,PJ.l,.7,.35,{z:120});
  if(o.vol===1) K.vcolumn(x,y,{r:W*.62,h:H*1.15,dur:.75,rise:.1,out:.4,pal:SPV,heat:1.1,twist:2.4,turb:.7}); else if(o.vol===2) K.vblast(x,y,{s:W*2.2,pal:SPV,heat:.9,smoke:.8,dur:1.1,rise:W*2.2,fire:.3,...DGy});
  if(o.scorch) K.cool(x,y,{kind:'scorch',r:o.scorch,pal:P,life:o.life||3.4,light:0}); }
// JWAVE: a bright line running out over the floor at one speed, thinning as it goes: broken into arcs of different length, each a little ahead of or behind the rest
function jwave(x,y,R0,R,dur,g=1,delay=0){ if(!F.on) return; const b=K.mats(), sd=rand(0,9), SG=[], ns=F.low?3:5; let a=rand(0,TAU); for(let i=0;i<ns;i++){ const w=TAU/ns*rand(.8,1.25), l=w*rand(.5,.86); SG.push([a,a+l,rand(-.045,.045),rand(.55,1)]); a+=w; }
  GFX.add(dur,k=>{ const r=mix(R0,R,k), th=mix(90,36,k), a=sat(k*8)*(1-k)*(1-.5*k);
    if(!F.low) F.ring(b.shW,x,y,Math.max(0,r-th*4.5),r,{...C,a:a*.6,gain:1.3*g,t0:sd});
    for(let i=0;i<SG.length;i++){ const q=SG[i], rs=r*(1+q[2]); F.ring(b.shL,x,y,rs-th*.6,rs+th*.4,{...C,a:Math.min(1,a*1.4)*q[3],gain:1.6*g,ero:.3,t0:sd,a0:q[0],a1:q[1]}); } },delay); }
// JDUST: the front of dust under it: it stands tall, rolls out at a steady pace, and is lit from behind by the spirit light it carries.  o: {r, r0, dur, tube, a, heat, c, c2}
function jdust(x,y,o={}){ if(!K.vok||!K.vok()) return; const Rm=o.r||500, dur=o.dur||.8, sd=rand(0,90), tube=o.tube??.16, r0=(o.r0??Rm*.2)/Rm;
  GFX.add(dur,(k,t)=>{ const e=mix(k,eo3(k),.3), rr=mix(r0,1,e)*.78, f=sat((k-.2)/.8);
    VOL.add('ring',x,y,Rm*tube*1.4,{ex:Rm,ey:Rm,ez:Rm*tube*3.4,pa:[rr,tube*(.8+.5*e),o.freq||3.4,t*1.2],pb:[(o.heat||0)*(1-k),.42,1,0],dens:8*(o.a??1)*(1-f)*(1-f)*sat(k*10),seed:sd,smoke:1,fire:.7,
      cA:SPV.d,cB:SPV.b,cM:SPV.m,cC:SPV.h,cS:o.c||'#07110f',cK:o.c2||'#3f8f7a',amb:.2,key:1.2,rim:.7,steps:20,ord:-1e9}); },o.delay||0); }
// materials only the spirit descent uses (detail pass): a jet of light, a paper talisman, a floor seal
let U2_=null;
function U2(){ if(U2_) return U2_; const m=F.mat; U2_={
  // a jet of spirit light: soft at both sides (white heart, jade edge through the ramp), streaks racing up it, frayed at the top
  jet:m({nz:'streak',n1:[.25,.6,0,-2.2],n2:[.6,.4,.02,-1.2],dist:.04,nk:.25,pw:2,ero:.04,soft:.35,fd:[.5,.5,.08,.5],rk:[.3,.85],gain:2.4,bgain:1.2}),
  // a talisman: paper (warm, half opaque), strokes of light written down it, its border dark where it chars and eaten when it burns
  tal:m({nz:'veins',n1:[.3,.55,0,0],n2:[.6,.6,.01,.02],dist:.02,nk:.75,pw:1.2,ero:.04,soft:.2,fd:[.14,.14,.08,.08],rk:[.2,1.2],gain:1,bgain:1}),
  // the seal of the summoning on the floor: its painted circle, its grain running
  seal:m({tex:'fx_circle_seal',nz:'veins',n1:[3,3,.05,.03],nk:.7,pw:1.2,ero:.1,soft:.3,rk:[.4,.95],gain:1.8,bgain:1.1,layer:'g'}),
}; return U2_; }
// SPIRIT DESCENT (sh_ult2): he only prays. The ki of the field is drawn in over the place behind him; the sky parts there and a shaft of light comes down,
// and in it a god of light and mist condenses - head first out of the cloud, then shoulders and a robe that runs down to the floor, a halo of light lines
// behind its head, talismans drawn in light circling it, a pedestal of stone bursting up under its hem. Every step of the descent sends a thin jade wave
// across the field that binds whatever it reaches. Its eyes open. It lifts both hands over its head and the light of the sky is drawn in between them;
// it holds its breath - and presses down: judgement falls out of the sky onto every sector round it, one after another, each ray breaking the floor
// open where it lands. It lifts its hands again and presses a second time: the halo drops to the floor and rolls out as a ring of light, spirit fire
// breaks out in three rings and everything is thrown. Then its eyes go out and it is drawn back up into the cloud, unravelling into motes, while the
// stone under it cools and sinks.
function ultTotem(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, kx=x0, ky=y0-480, b=K.mats(), m9=K.m9();
  const TB=.85, TO=2.4, TR=2.3, TH=3.3, TS=3.44, TC=3.55, TL=3.9, TS2=4.3, T2=4.45, TK=4.95, TX2=5.15, TEND=6.9, st={mt:0,ht:0,tt:0,dt:0,wt:0}, JT=[[.85,.5,.3],[1.5,.32,.66],[2.1,.24,1]];
  // the god: its height, how high its hem floats, its light (jade, with white-gold for the halo, the shaft and the talismans)
  const GH=2050, GS=GH/1300, GZ=GH*.06, u2=U2(), DGv={c:'#050807',c2:'#a6c8ba'}, GOLD={d:'#2a1a04',b:'#e0b050',m:'#ffeab0',h:'#fffaf0',l:'#ffe0a0',s:'#fff2d0'}, CG={cA:GOLD.b,cB:GOLD.m,cM:GOLD.h,cC:'#ffffff'}, VC=K.vc?K.vc(SPV):null, gsd=rand(0,9);
  const sm3=u=>u*u*(3-2*u);
  // its arms (pitch of both, + is up): hanging open while it forms; lifted over its head in one long move; pressed down; lifted again, not as high; pressed down again
  const armAt=t=>{ if(t<TR) return -.7; if(t<TH) return mix(-.7,.85,sm3((t-TR)/(TH-TR))); if(t<TS) return mix(.85,.98,eo3((t-TH)/(TS-TH))); if(t<TC){ const u=(t-TS)/(TC-TS); return mix(.98,-.8,u*u); }
    if(t<TL) return -.8+.06*Math.exp(-(t-TC)*8)*Math.sin((t-TC)*30); if(t<TS2) return mix(-.8,.5,sm3((t-TL)/(TS2-TL))); if(t<T2){ const u=(t-TS2)/(T2-TS2); return mix(.5,-.85,u*u); } return mix(-.85,-.6,sat((t-T2-.3)/1)); };
  // where it is at time t: the head comes down out of the cloud first, the robe runs down from the shoulders, and at the end it is all drawn back up
  // its going (from TK, under half a second): it comes apart from the head down - head, then arms, then the robe - each part bursting into motes drawn up the shaft
  const godAt=t=>{ const hA=eo3(sat((t-TB)/.65)), fK=sat((t-TK)/.5), up=fK*fK*GH*.12, bL=eo3(sat((t-1.2)/.9)), fH=sat((t-TK)/.2), fA=sat((t-TK-.07)/.24), fR=sat((t-TK-.14)/.36);
    return {hA,fK,up,bL,fH,fA,fR,hz:GZ+GH*.86+(1-hA)*900+up,sz:GZ+GH*.69+up,top:GZ+GH*.8+up}; };
  const handAt=(t,s)=>{ const g=godAt(t), p=armAt(t), L=GH*.38; return [kx+s*(GH*.11+Math.cos(p)*L),ky,g.sz+Math.sin(p)*L]; };
  // one limb of light and mist along its local x (its grain flows, its edge is lit, its far end frays)
  const wv=(x,y,z,ex,ey,yaw,pitch,ra,rb,flow,rag,a,glow,ord)=>VOL.add('wisp',x,y,z,{ex,ey,ez:ey,yaw,pitch,pa:[ra,rb,2.4,flow],pb:[glow*.4,.85,1.5,rag],dens:4.2*a,gain:1.1,seed:gsd+ord,smoke:.42,fire:.75,block:.7,
    cA:SPV.d,cB:SPV.b,cM:SPV.m,cC:SPV.h,cS:'#020806',cK:SPV.m,amb:.08,key:1.3,rim:1.6,glow:.2,sdist:.15,shadow:2.5,ord:y+ord,steps:22,lit:.6});
  // the bound: every body a wave has reached, with the pool of light under it (size and strength differ from one to the next)
  const BD=new Map(), bind=e=>{ if(!BD.has(e)) BD.set(e,{h:rand(0,1),t0:-1}); };
  // the floor splits outward from under it at every step: six cracks of three bent lengths, one length to a step, the last to the edges of the screen
  const CK=[]; for(let i=0;i<5;i++){ let a=i/5*TAU+.25+rand(-.2,.2), px=kx+Math.cos(a)*300, py=ky+Math.sin(a)*300*FSY, alt=i%2?1:-1;
    for(let q=0;q<3;q++){ if(q){ a+=alt*rand(.3,.55); alt=-alt; } const l=hw*[.3,.42,.62][q]*rand(.85,1.15), nx=px+Math.cos(a)*l, ny=py+Math.sin(a)*l*FSY, ov=q?.15:0;
      CK.push({x1:px-(nx-px)*ov,y1:py-(ny-py)*ov,x2:nx,y2:ny,w:rand(74,96)*(1-.15*q),ts:JT[q][0]+.04,gr:[.42,.3,.36][q],rot:a,L:l*(1+ov),uv:Math.random()<.5?[1,-1,0,1]:[1,1,0,0],q}); px=nx; py=ny; } }
  for(const s of CK) for(const u of [.5,1]) after(s.ts+s.gr*u,()=>{ const sx=mix(s.x1,s.x2,u), sy=mix(s.y1,s.y2,u); K.sparks(sx,sy,14,{pal:P,n:4,dir:s.rot,spread:.7,sp:[300,1100],up:800,life:[.2,.5]}); K.dust(sx,sy,{n:2,r:40,sp:[120,380],a:.4,c:'#2e2820'}); });
  // stones torn out of the field and drawn in to the pedestal under its hem, one after another, from every side
  const DR=[]; for(let i=0;i<10;i++){ const a=((i*.618034)%1)*TAU+.4, r=hw*(.56+.4*((i*37)%10)/10), sx=kx+Math.cos(a)*r, sy=ky+160+Math.sin(a)*r*FSY*.82; if(Math.hypot(sx-x0,sy-y0)<420) continue;
    const ta=Math.atan2((sy-ky)/FSY,sx-kx)+rand(-.3,.3), tr=rand(330,520);
    DR.push({sx,sy,ts:1.5+i*.075,s:rand(130,210),tx:kx+Math.cos(ta)*tr,ty:ky+Math.sin(ta)*tr*FSY,tz:rand(60,150),v:i%4,sp:rand(3,6)*(i%2?1:-1),rot:rand(0,TAU),hit:0}); }
  const LIFT=.22, FLY=.62, drAt=(d,tt)=>{ const lu=sat(tt/LIFT), u=sat((tt-LIFT)/FLY), e=u*u; return [mix(d.sx,d.tx,e),mix(d.sy,d.ty,e),mix(-d.s*.2+(d.s*.5+240)*eo3(lu),d.tz,e)+Math.sin(Math.PI*u)*420,lu,u]; };
  for(const d of DR) after(d.ts,()=>{ K.debris(d.sx,d.sy,{n:7,r:d.s*.6,sp:[200,700],up:1100,size0:6,size:18,c:'#4c5a54'}); K.dust(d.sx,d.sy,{n:4,r:d.s*.6,sp:[150,420],a:.45,c:'#2e2820',c3:'#6a5c4a'}); K.sparks(d.sx,d.sy,30,{pal:P,n:6,sp:[300,1000],up:1200,life:[.25,.55]});
    GFX.light(d.sx,d.sy,520,PJ.l,.55,.35,{z:100}); sfx('shatter',.25); });
  // spirit fire breaking out of the floor at one place: a white heart, a pillar of light, stone thrown, the floor lit, and whatever stands near thrown off its feet.
  //  v: 0 light only / 1 a column of fire / 2 a ball of fire and dust
  const erupt=(x,y,pw,v)=>{ jhit(x,y,{h:640*pw,w:120*pw,vol:0,pil:pw>=1.05?1:0}); if(v) K.flare(x,y,90,{pal:P,s:330*pw,dur:.16,gain:2.6});
    if(v===1) K.vcolumn(x,y,{r:95*pw,h:900*pw,dur:.9,rise:.1,out:.45,pal:SPV,heat:1.1,twist:2.4,turb:.8}); else if(v===2) K.vblast(x,y,{s:340*pw,pal:SPV,heat:1,smoke:.3,dur:.8,rise:420*pw,fire:.24,...DGv});
    for(const e of onScreen(200)) if(Math.hypot(e.x-x,(e.y-y)/FSY)<430*pw){ K.knock(e,{from:[x,y],dist:340,up:1900,stun:1}); e.flash=.3; } };
  // where a ray of judgement lands: the floor shock read as a ring of grit and light streaks skidding out flat over the stone (particles, no extra draw)
  const shock=(x,y,pw)=>{ const n=Math.round(16*pw); for(let i=0;i<n;i++){ const a=i/n*TAU+rand(-.1,.1), v=rand(1300,2100)*pw, lt=i%2; GFX.pt({x:x+Math.cos(a)*40,y:y+Math.sin(a)*40*FSY,z:lt?14:6,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:lt?60:0,g:0,drag:5.5,life:lt?rand(.2,.32):rand(.35,.6),s:lt?rand(4,6):rand(7,12),m:lt?3:11,len:lt?.06:0,b:lt?undefined:'alpha',rot:rand(0,TAU),c:GFX.rgb(lt?'#ffffff':'#3a3a32'),c3:'#ffffff',c2:lt?PJ.b:'#0a0a08',L:lt?3:2,pri:1}); } };
  // the smoke the palms raise: a rolling column that is near black underneath and in its folds, lit pale jade on its upper side by the god above it,
  // its grain climbing; round it a curl of darker smoke and lit flecks spirals up, so it reads as turning, not as a blot
  const jsmoke=(x,y,s,dur,delay)=>{ if(K.vok&&K.vok()){ const sd=rand(0,90); GFX.add(dur,(k,t)=>{ const e=eo3(k), r=.42+.42*e;
      VOL.add('blast',x,y,s*.32+s*.9*e,{ex:s*(1+.25*k),ey:s*(1+.25*k),ez:s*.95,pa:[r,.6+.1*k,2.6,.25+k*.3],pb:[0,1,1,.45+.45*k],dens:11*sat(k*6)*(1-sat((k-.45)/.55)),seed:sd,smoke:1,fire:1,
        cS:'#010302',cK:'#4e9a7e',amb:.04,key:1.3,rim:.7,glow:0,steps:20,lit:.55,flow:1.6}); },delay); }
    after(delay,()=>{ for(let i=0;i<22;i++){ const a=i/22*TAU, rr=s*rand(.7,1.05), lt=i%3===0; GFX.pt({x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*FSY,z:rand(10,s*.3),oc:[x,y,s*1.7],or:rr,oa:a,ow:rand(1.8,2.8),ok:rr*rand(.35,.55),oz0:rand(10,s*.3),ob:0,
      life:rand(1.1,1.7),s:lt?rand(8,13):rand(26,44),rot:rand(0,TAU),vr:rand(-1,1),m:lt?3:8,len:lt?.04:0,b:lt?undefined:'alpha',c:GFX.rgb(lt?'#bff5dd':'#0e1513'),c3:lt?'#ffffff':undefined,c2:lt?PJ.b:'#020303',fade:'in',L:lt?3:2}); } }); };
  // a hit on a body: a star of sharp white-hearted streaks thrown on the way the blow went, a thin cross of light, no blot
  const spark=(e,dir,pw)=>{ const z=ez(e); K.sparks(e.x,e.y,z,{pal:P,n:Math.round(12*pw),dir,spread:.55,sp:[700,1900],up:350,life:[.1,.26],s:3.5}); K.flare(e.x,e.y,z,{pal:P,s:150*pw,sx:2.2,sy:.35,dur:.12,gain:2.2}); GFX.light(e.x,e.y,320,PJ.l,.5,.18,{z}); };
  // everything on the screen is thrown outward, lit while it is in the air; the nearest few trail light back to where they stood
  const throwAll=(dist,up,rib)=>{ const FL2=[]; let n=0; for(const e of onScreen(300)){ const h=((e.x*13+e.y*7)%10+10)%10/10, dx=e.x-kx, dy=e.y-ky, l=Math.hypot(dx,dy)||1, ux=dx/l, uy=dy/l, dd=dist*(.8+.4*h); K.knock(e,{from:[kx,ky],dist:dd,up:up*(.85+.35*h),stun:1.2}); e.flash=.3; FL2.push(e);
      if(n++<36){ for(let i=0;i<4;i++) GFX.pt({x:e.x+rand(-20,20),y:e.y+rand(-10,10),z:rand(20,e.h),vx:ux*dd*rand(4,7.5),vy:uy*dd*rand(4,7.5),vz:rand(0,300),g:0,drag:6,life:rand(.22,.4),s:rand(4,6.5),m:3,len:.07,c:GFX.rgb(PJ.h),c3:'#ffffff',c2:PJ.b,L:3});
        if(n<=rib&&F.on&&!F.low){ const p0={x:e.x,y:e.y,z:e.h*.5}; GFX.add(.5,k=>{ if(e.dead&&k>.2) return; const q={x:e.x,y:e.y,z:e.h*.5+(e.z||0)}, a=(1-k)*(1-k); F.ribbon(b.trB,[{...q,w:48},{x:mix(q.x,p0.x,.5),y:mix(q.y,p0.y,.5),z:mix(q.z,p0.z,.5)*1.15,w:30},{...p0,w:8}],{...CW,a:.9*a,gain:2.2,fd:[.02,.5,0,0]}); }); } } }
    GFX.add(.3,()=>{ for(const e of FL2) if(!e.dead) e.flash=Math.max(e.flash,.22); }); };
  // talismans: five paper cards written in light, circling the god on one smooth orbit (it speeds up evenly while it gathers), each turning slowly on its own axis
  const TAL=[0,1,2,3,4].map(i=>({a0:i/5*TAU+.3,z:[620,1180,880,1420,760][i]*GS,r:[880,960,820,1000,900][i]*GS,t0:2.1+i*.06,sp:.8+.15*i}));
  const talAt=(q,t)=>{ const g=godAt(t), tt=t-q.t0, ga=Math.max(0,t-TR), a=q.a0+.9*tt+.3*ga*ga/(1+ga); return {x:kx+Math.cos(a)*q.r,y:ky+Math.sin(a)*q.r*FSY,z:q.z+g.up*.6+45*Math.sin(t*1.9+q.a0*3),sp:t*q.sp*1.6+q.a0,a}; };
  S([['gy01',.12],['gy02',.18],['gy03',.25],['gy04',.6],['gy05',.6],['gy06',.12,{kick:[-.8,.6]}],['gy07',.2],['gy08',.5],['gy09',.5],['gy10',.43],['gy11',.15,{kick:[1.6,-1.2]}],['gy12',.7],['gy13',.9],['gy14',9]]);
  // ---- ready: close on him; the cast signal; the ki of the field begins to be drawn in over the place behind him
  GFX.ambient(.62,.7,.7,1.2); Cn.move({x:x0,y:y0-BODY*.6,zoom:1.35,tilt:.1},.5); SFX.rumble(2.6); Cn.drone(46,.3);
  after(.3,()=>{ K.flare(x0,y0,BODY*1.5,{pal:'azure',s:230,dur:.28,gain:2.6}); K.sparks(x0,y0,BODY*1.4,{pal:'azure',n:10,sp:[200,900],up:900,life:[.2,.45]}); GFX.light(x0,y0,700,'#bfe4ff',.9,.35,{z:200}); Cn.SND.shing(1,.5); SFX.bell(); GFX.ambient(.45,.5,.52,.55); });
  const lamp=GFX.light(kx,ky+60,1500,PJ.l,.05,.5,{hold:TEND,z:260}), eyeL=GFX.light(kx,ky+160,1300,PJ.l,0,.5,{hold:TEND,z:GZ+GH*.88});
  for(let i=0;i<26;i++) after(.1+i*.085,()=>{ const u=i/26, a=rand(0,TAU), r=rand(.1,1)*(300+u*500); GFX.pt({x:kx+Math.cos(a)*r,y:ky+Math.sin(a)*r*FSY,z:2,vz:rand(160,300)+u*260,g:-60,drag:.5,life:rand(.5,.9),s:rand(5,11)+u*5,rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#5c6a66'),c2:'#0a0f0e',shadow:true,fk:4,L:2}); });
  const G1=K.gather(kx,ky,420,{dur:TB-.3,max:TB-.2,r:300,R:1700,pal:P,n:2,delay:.3});
  // the gathering, layered: the seal of the summoning turns on the floor and tightens as it brightens; a thread of light climbs out of it toward the sky,
  // thicker and brighter the nearer the sky is to opening; both let go into the shaft
  if(F.on) GFX.add(TB+.25,(k,t)=>{ const u=sat((t-.15)/(TB-.15)), e=u*u, f=sat((t-TB)/.25), a=sat(t/.2)*(1-f);
    F.quad(u2.seal,kx,ky,mix(1000,560,eo3(u))*(1+.5*f),mix(1000,560,eo3(u))*(1+.5*f),t*mix(.4,2.2,e),{...C,a:a*(.35+.65*e),gain:1+1.6*e,ero:.35-.25*u});
    const ph=mix(300,2600,eo3(sat((t-.2)/(TB-.2)))); F.bill(u2.jet,kx,ky-4,ph*.5,mix(40,130,e)*(1+1.5*f),ph*.5,0,{...CW,a:a*sat((t-.2)/.15),gain:2+2*e,t0:gsd}); });
  let RAY=null, HL=null;
  // ---- the sky parts: the shaft of light comes down where the ki went, and the god's head comes down inside it
  after(TB,()=>{ G1.release({s:1.4}); RAY=K.godray(kx,ky,{r:560,r1:330,h:3200,pal:{d:'#0c2a22',b:'#7fd8b8',m:'#e8fff4',h:'#ffffff',l:'#c0ffe8',s:'#f0fff8'},dur:TK-TB+.1,in:.22,out:.55,a:.2,gain:1,pool:0}); K.flare(kx,ky+300,30,{pal:GOLD,s:380,dur:.3,gain:2.4});
    Cn.move({x:x0,y:y0-700,zoom:.9,tilt:.2},.6,'io'); GFX.ambient(.42,.47,.5,1.4); SFX.choir(3.2); });
  after(TB+.6,()=>Cn.move({x:x0,y:y0-1200,zoom:.64,tilt:.26},1.15,'lin'));
  after(2.6,()=>Cn.move({x:x0,y:y0-1300,zoom:.52,tilt:.28},.7,'io'));
  // ---- its halo: a ring of white-gold light lines with a fan of rays, opening behind its head as the shoulders come
  after(1.5,()=>{ HL=K.halo(kx,ky-30,GZ+GH*.86,{r:GH*.2,pal:GOLD,dur:T2-1.5,in:.35,out:.12,spin:.5,gain:.55,rays:0}); });
  // ---- the pedestal: stone bursts up under its hem as the robe reaches the floor
  after(2.1,()=>{ K.rocks(kx,ky+10,{n:5,r:470,s:[100,250],kind:'crag',pal:P,glow:.9,rock:'#343e44',dur:TX2-2.1,out:.7,strata:5,edge:.08});
    jdust(kx,ky+40,{r:950,r0:220,dur:.9,tube:.12,a:.45,c:'#0a1412',c2:'#6fae9a'}); });
  // ---- the three steps of the descent: a thin wave of jade that binds what it reaches, and the floor splitting under the place
  JT.forEach(([at],i)=>after(at,()=>{ const R=hw*[.6,1,1.5][i], dur=[.55,.58,1.05][i], R0=260;
    Cn.shake([.25,.35,.6][i]); SFX.boom(.8+i*.2,.6+i*.13); if(i===2){ sfx('shatter',.6); K.debris(kx,ky+40,{n:14,r:300,sp:[250,900],up:1500,size0:8,size:22,c:'#4c5a54'}); }
    K.sparks(kx,ky+40,40,{pal:P,n:8+i*4,sp:[300,1200],up:1500,life:[.3,.7]});
    // only the first step sends the bright line; the next two roll a front of dark dust (the pedestal's own dust rides with the third), so each step reads differently
    if(i===0) jwave(kx,ky,R0,R,dur,.8); else if(i===1) jdust(kx,ky+30,{r:R,r0:R0,dur:dur*1.3,tube:.07,a:.4,c:'#060c0a',c2:'#5f9c88'});
    GFX.light(kx,ky+80,R*.9,PJ.l,.22+.06*i,1.3,{z:140}); GFX.ripple(kx,ky,R,{life:dur*.7,s:.35+.15*i});
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-kx,(e.y-ky)/FSY); if(i<2&&d>R) continue; const en=sat((d-R0)/(R-R0));
      after(dur*en,()=>{ if(e.dead) return; bind(e); K.knock(e,{from:[kx,ky],dist:60,up:480+i*160,stun:.5+i*.25,fx:0});
        const part=Dm*.667; dmg(e,e.d.boss?part:Math.min(part,Math.max(1,e.hp*.22)),{kb:.15,stun:.5+i*.25,sx:kx,sy:ky}); e.flash=Math.min(e.flash,.45); const q=BD.get(e); if(q&&q.t0<0) q.t0=at+dur*en; }); } }));
  // ---- it lifts its hands and the light of the sky is drawn in between them, over its head
  const G2=K.gather(kx,ky,GZ+GH*1.1,{dur:TH-TR,max:TC-TR+.1,r:400,R:1300,pal:P,n:.55,delay:TR,shells:0,haze:0});
  // ---- its eyes open: light floods the floor in front of it
  after(TO,()=>{ const g=godAt(TO); for(const s of [-1,1]) K.flare(kx+s*GH*.03,ky,g.hz+GH*.015,{pal:P,s:200,sx:1.5,sy:.6,dur:.3,gain:2.2}); Cn.SND.shing(.7,.5); SFX.bell(.7); Cn.shake(.3); hitstop=Math.max(hitstop,.05); K.sparks(kx,ky,g.hz,{pal:P,n:14,sp:[200,900],up:300,life:[.25,.6]}); });
  // ---- the god, the floor under it, the stones drawn in to it, the talismans: one clock
  if(F.on) GFX.add(TEND+.3,(k,t)=>{ const tl=t-TC, t2=t-T2, land=t>=TC, w=WM(), lm=LM(), fd=sat((t-(TEND-.3))/.55), dt=Math.max(0,t-st.tt); st.tt=t;
    const g=sat((t-.15)/(TH-.15)), hk=sat((t-TH)/(TC-TH)), ap=t2>=0?Math.exp(-t2*4):0, gd=godAt(t), pulse=(land?Math.exp(-tl*5):0)+(t2>=0?Math.exp(-t2*5):0);
    // the floor under it: soot, and light in the cracks that climbs from a dull ember to white, and goes out slowly after the blows
    { const i=eo3(sat((t-.1)/.6)), H=K.heat(SPV,land?sat(.1+.9*sat(tl/2.9)-.25*ap):mix(.96,.1,g)), rr=mix(380,640,g)*i;
      F.quad(w.s,kx,ky,rr*1.04,rr*1.04,.6,{a:.8*i*(1-fd),ero:.1,rv:[1.1,.2,0,.1]}); F.quad(w.b,kx,ky,rr,rr,.6,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat(t/.4)*(1-fd),gain:2.4*H.g,bgain:1.1*H.g,ero:land?.08+.5*sat(tl/2.9):.5-.42*g,rv:[1,.3,0,.1]}); }
    // the cracks running out to the edges: dull embers that step toward white; after the blows they cool and go out
    { const kq=land?Math.max(.06,.1+.9*sat(tl/2.8)-.3*ap):mix(.9,.34,g)-.24*hk, H=K.heat(SPV,sat(kq)), er=land?.12+.6*sat((tl-1.2)/1.7):.12+.3*(1-g), fa=land?1-sat((tl-2.5)/.5):1;
      if(fa>0) for(const s of CK){ if(t<s.ts) continue; const i=sat((t-s.ts)/s.gr), cx=s.x1+(s.x2-s.x1)*i*.5, cy=s.y1+(s.y2-s.y1)*i*.5, hl=s.L/2*i;
        if(!s.q&&!land&&!F.low) F.quad(w.gs,cx,cy,hl,s.w*1.25,s.rot,{a:.85*sat((t-s.ts)/.06)*fa,ero:.1,uvT:s.uv,fd:[.03,.03,0,0]});
        F.quad(w.gb,cx,cy,hl,s.w,s.rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:fa,gain:2.5*H.g,bgain:1.15*H.g,ero:er,uvT:s.uv,fd:[.13,.13,0,0]});
        if(i<1) F.quad(b.glowG,s.x1+(s.x2-s.x1)*i,s.y1+(s.y2-s.y1)*i,s.w*2.6,s.w*.7,s.rot,{...CW,a:.75,gain:1.4}); } }
    // the stones drawn in: each leaves a hole, lifts, and flies to the pedestal faster and faster, a thread of light behind it
    for(const d of DR){ const tt=t-d.ts; if(tt<0) continue; if(tt<1.5) F.quad(lm.crater,d.sx,d.sy,d.s*1.5,d.s*1.5,d.rot,{a:sat(tt/.05)*(1-sat((tt-.9)/.6)),gain:1.2*Math.exp(-tt*2.2)+.25});
      if(tt>=LIFT+FLY){ if(!d.hit){ d.hit=1; K.flare(d.tx,d.ty,d.tz,{pal:P,s:190,dur:.14,gain:2}); K.sparks(d.tx,d.ty,d.tz,{pal:P,n:6,sp:[200,800],up:500,life:[.2,.5]}); K.dust(d.tx,d.ty,{n:3,r:80,sp:[120,380],a:.45,c:'#2e2820',c3:'#6a5c4a'}); GFX.light(d.tx,d.ty,600,PJ.l,.3,.25,{z:d.tz}); Cn.shake(.08); sfx('shatter',.2); } continue; }
      const [px,py,pz,lu,u]=drAt(d,tt); F.solid('boulder',d.v,px,py,pz,{M:cxf(d.s*(.6+.4*lu),d.sp*tt,d.sp*.6*tt,d.rot),alb:'#3a444b',emis:PJ.b,rimC:PJ.h,spec:.45,rim:.3,vein:.1+.25*u,heat:0,tone:.3,bump:2.4,detail:1,strata:4,glow:.4+.6*u,edge:.08,ore:.25,seed:d.rot,shadow:[.55,.28,.38*(1-u*u)]});
      if(u>0&&!F.low){ const ps=[]; for(let j=0;j<6;j++){ const tq=tt-j*.035; if(tq<LIFT) break; const q=drAt(d,tq); ps.push({x:q[0],y:q[1],z:q[2],w:d.s*.2*(1-j/6)}); } if(ps.length>1) F.ribbon(b.trB,ps,{...C,a:.55*u,gain:1.3,fd:[.02,.4,0,0]}); } }
    if(!land){ lamp.a=.08+.3*g;
      // the pools of light under the bound: they come up where the wave passed and brighten as it draws breath
      let nb=0; for(const [e,q] of BD){ if(e.dead||q.t0<0||t<q.t0) continue; if(nb++>=(F.low?6:10)) break; const u=sat((t-q.t0)/.3), rr2=(70+90*q.h)*(.6+.4*eo3(u))*(1+.3*hk), aa=(.3+.5*((q.h*7)%1))*u*(.75+.25*Math.sin(t*3.1+q.h*40))+.4*hk;
        F.quad(b.glowO,e.x,e.y,rr2*1.5,rr2*1.5,0,{...C,layer:'g',a:Math.min(1,aa*.7),gain:.6+.9*hk}); }
      if(t>st.mt&&BD.size){ st.mt=t+.09; let j=(Math.random()*BD.size)|0; for(const [e,q] of BD){ if(j--) continue; if(!e.dead&&q.t0>=0&&t>q.t0) K.embers(e.x,e.y,50,{pal:P,n:2,life:.8,up:520+400*q.h,z:20}); break; } } }
    else lamp.a=.55*Math.exp(-tl*1.3)+.3*ap;
    // the shaft narrows and brightens while it gathers, flares wide at each blow, and the halo follows the head
    if(RAY) RAY.r=mix(560,380,sat((t-TR)/(TH-TR)))+520*(land?Math.exp(-tl*6):0)+380*(t2>=0?Math.exp(-t2*6):0)+(land?180*sat(tl/.4):0);
    if(HL){ HL.z=gd.hz+GH*.02; HL.a=.8+.2*pulse; }
    // the nimbus behind the ring: a soft disc of white-gold light behind its head, so the face sits on light instead of on the dark field
    if(HL&&t>1.5&&t<T2+.12){ const ia=sat((t-1.6)/.4)*(1-sat((t-T2)/.12)); F.bill(m9.flash,kx,ky-34,gd.hz+GH*.02,GH*.2,GH*.2,0,{cA:GOLD.d,cB:GOLD.b,cM:GOLD.m,cC:'#fff8e8',a:.38*ia*(1+.4*pulse),gain:1.3}); }
    if(t<TB) return;
    // ---- the god itself: robe, head and arms of light and mist, its shadow, its eyes, the bands of mist round it
    const gl=1+.6*sat((t-TR)/(TH-TR))+.8*pulse, p=armAt(t), aA=sat((t-1.65)/.45)*(1-gd.fA), rA=1-gd.fR;
    if(gd.bL>0&&rA>0) F.quad(m9.shade,kx+GH*.12,ky+GH*.08,GH*.32,GH*.24,.3,{a:.7*gd.bL*rA});
    if(VC&&K.vok()){ const L=GH*.8*gd.bL; if(L>20&&rA>0) wv(kx,ky,gd.top-L/2,L/2*(1+.03*Math.sin(t*2.3)),GH*.2*mix(.55,1,sat(L/(GH*.5))),0,Math.PI/2,.95,.62,.9,1.6,sat(gd.bL*2)*rA*rA,1.1*gl,0);
      if(gd.fH<1) wv(kx,ky,gd.hz,GH*.085,GH*.075,0,Math.PI/2,.95,.85,.6,.2,gd.hA*(1-gd.fH),1.5*gl,2);
      if(aA>0) for(let s=0;s<2;s++){ const sg=s?1:-1, L2=GH*.19, ax=kx+sg*GH*.11; wv(ax+sg*Math.cos(p)*L2,ky,gd.sz+Math.sin(p)*L2,L2,GH*.075,s?0:Math.PI,p,1,.35,1.1,.6,aA*.9,gl,1); } }
    // the weave of its coming: while the robe runs down from the shoulders its lower edge is a bright seam, and motes from the shaft are drawn into it
    if(gd.bL>0&&gd.bL<1&&t<TH){ const zf=gd.top-GH*.8*gd.bL, sa=Math.sin(Math.PI*gd.bL); F.bill(b.glowO,kx,ky+2,zf,GH*.24*mix(.55,1,gd.bL),GH*.03,0,{...CW,a:.85*sa,gain:2.4});
      if(t>st.wt){ st.wt=t+.02; for(let i=0;i<3;i++){ const a=rand(0,TAU), rr=GH*rand(.25,.5), sx=kx+Math.cos(a)*rr, sz=zf+rand(-.1,.5)*GH; GFX.pt({x:sx,y:ky+Math.sin(a)*rr*FSY*.4,z:sz,vx:(kx-sx)*3.2,vy:0,vz:(zf-sz)*3.2,g:0,drag:0,life:.28,s:rand(3,6),m:3,len:.08,c:GFX.rgb(Math.random()<.5?'#ffffff':PJ.m),c3:'#ffffff',c2:PJ.b,L:3,pri:1}); } } }
    // light on its face and in its palms: small white hearts, so the head and hands read as the brightest points of the figure
    if(aA>0) for(let s=-1;s<=1;s+=2){ const hp=handAt(t,s), hr=GH*.05*(1+.4*pulse); F.bill(m9.flash,hp[0],hp[1]-2,hp[2],hr,hr,0,{...CW,a:aA*(.7+.3*Math.sin(t*7+s)),gain:3.2}); }
    if(gd.hA>0&&gd.fH<1) F.bill(m9.flash,kx,ky-3,gd.hz-GH*.01,GH*.065,GH*.08,0,{...CW,a:.55*gd.hA*(1-gd.fH),gain:2+pulse});
    // the flow inside the robe: a band of mist running down its front from the shoulders to the hem, its grain always moving downward
    if(gd.bL>.1&&rA>0){ const zt=gd.sz-GH*.02, zb=gd.top-GH*.8*gd.bL, pr=[]; for(let i=0;i<7;i++){ const u=i/6; pr.push({x:kx+GH*.03*Math.sin(t*1.6+u*4),y:ky-6,z:mix(zt,zb,u),w:GH*mix(.05,.13,u)}); } F.ribbon(m9.mist,pr,{...C,a:.6*sat(gd.bL*1.5)*rA,gain:1.5,ulen:GH*.5,t0:gsd-t*1.3}); }
    // its sleeves: long bands of mist hanging from each forearm, swinging behind the hands as the arms move (both in one strip, split by zero-width joints)
    if(aA>0){ const sl=[]; for(let s=-1;s<=1;s+=2){ const hp=handAt(t,s), ex=kx+s*GH*.11; for(let i=0;i<7;i++){ const u=i/6, bx=mix(ex,hp[0],.35+.65*Math.min(1,u*1.6)), dz=-GH*.26*u*u, sw=GH*.05*u*Math.sin(t*2.6+u*3+s);
        sl.push({x:bx+s*GH*.04*u+sw,y:ky+4,z:mix(gd.sz,hp[2],Math.min(1,u*1.6))+dz,w:(i===0||i===6)?0:GH*mix(.03,.075,u)}); } }
      F.ribbon(m9.mist,sl,{...C,a:.7*aA,gain:1.4,ulen:GH*.4,t0:gsd+3-t*1.1}); }
    // its hem dissolving into a low ring of mist rolling round the pedestal, so the robe has no hard bottom edge
    if(gd.bL>.5&&rA>0){ const hm=[], hz2=gd.top-GH*.8*gd.bL+GH*.04; for(let i=0;i<=14;i++){ const an=i/14*TAU+t*.5, rr=GH*(.2+.03*Math.sin(an*3+t*1.4)); hm.push({x:kx+Math.cos(an)*rr,y:ky+Math.sin(an)*rr*FSY*.5,z:hz2+GH*.025*Math.sin(an*2-t*2),w:GH*.075}); }
      F.ribbon(m9.mist,hm,{...C,a:.65*sat((gd.bL-.5)*3)*rA,gain:1.1,ulen:GH*.6,t0:gsd+7+t*.4}); }
    const eo=(t<TO?.35*sat((t-(TO-.5))/.5):1)*(1-sat((t-TK)/.24))*gd.hA, ez=gd.hz+GH*.015;
    if(eo>0) for(let s=-1;s<=1;s+=2){ F.bill(m9.flash,kx+s*GH*.03,ky-2,ez,GH*.08*(1+.5*pulse),GH*.022,0,{...CW,a:eo,gain:5}); F.bill(m9.flash,kx+s*GH*.03,ky-2,ez,GH*.02,GH*.017,0,{cA:'#ffffff',cB:'#ffffff',cM:'#ffffff',cC:'#ffffff',a:eo,gain:6}); }
    eyeL.a=.6*eo; eyeL.z=ez;
    if(gd.bL>.05&&rA>0) for(let j=0;j<2;j++){ const pts=[], ph=t*(.7+j*.25)+j*2.1, a=sat(gd.bL*1.5)*rA; for(let i=0;i<11;i++){ const u=i/10, an=ph+u*3.6*(j%2?1:-1), rad=GH*(.18+.22*u)*(1+.1*Math.sin(t*1.7+i*.6)), zz=GZ+GH*(.12+.62*(j%2?u:1-u))*gd.bL+gd.up*(1+u);
        pts.push({x:kx+Math.cos(an)*rad,y:ky+Math.sin(an)*rad*FSY,z:zz,w:GH*.035*(1-u*.6)}); } F.ribbon(m9.mist,pts,{...C,a:.75*a,gain:1.3,ulen:GH*.9,t0:gsd+j*5}); }
    // sparks circling its hands while it draws the sky in, faster as it goes
    if(t>TR&&t<TC&&t>st.ht){ const u=sat((t-TR)/(TH-TR)); st.ht=t+mix(.05,.018,u); for(let s=-1;s<=1;s+=2){ const hp=handAt(t,s), rr=rand(60,130);
        GFX.pt({x:hp[0],y:hp[1],z:hp[2],oc:[hp[0],hp[1],hp[2]],or:rr,oa:rand(0,TAU),ow:s*rand(6,10),ok:0,oz0:hp[2]+rand(-40,40),ob:rr*.4,life:rand(.15,.3),s:rand(4,7),m:3,len:.03,c:GFX.rgb(Math.random()<.4?'#ffffff':PJ.m),c3:'#ffffff',c2:PJ.b,fk:4,L:3,pri:1}); } }
    // the talismans: lit one after another, circling faster while it gathers; when it goes they burn from the end of the line into embers
    // each card is a strip of paper, not a plate: bent along its length and fluttering as it flies, turning edge-on and back; while it gathers its script
    // catches one card after another (dull red strokes to bright orange), its edges smoulder, and a thread of light ties it to the god's chest
    const thr=[], emit=t>st.dt;
    for(let i=0;i<TAL.length;i++){ const q=TAL[i]; if(t<q.t0) continue; const on=eo3(sat((t-q.t0)/.25)), bt=t-T2+.2-i*.03, burn=sat(bt/.3); if(burn>=1) continue;
      const ig=sat((t-(TR+.05+i*.2))/.3), c=talAt(q,t), cs=Math.cos(c.sp), sw=.22+.78*Math.abs(cs), tw=95*GS*sw*mix(.4,1,on), th=175*GS*mix(.6,1,on), bd=th*(.16+.1*Math.sin(t*5.3+i*1.7))*Math.sign(cs||1), cp=[];
      for(let j=0;j<5;j++){ const v=j/4-.5, fl=Math.sin(t*9+i*2+j*1.3)*th*.05; cp.push({x:c.x+bd*(1-4*v*v)*.6+fl*v*2,y:c.y,z:c.z+v*2*th,w:tw*(1-.12*Math.abs(Math.sin(t*7+j+i)))}); }
      F.ribbon(u2.tal,cp,{cA:'#1a0502',cB:'#c09a58',cM:ig>.5?'#ffd08a':'#e8d29a',cC:ig>.02?'#ff3a10':'#8a1408',a:on,gain:.75+.55*ig+2*burn,bgain:.7+.25*pulse+.2*ig,ero:.04+.8*burn*burn,op:1-burn,t0:q.a0*7});
      if(ig>0&&burn<.5){ const gz=gd.sz-GH*.08; thr.push({x:c.x,y:c.y,z:c.z,w:0},{x:c.x,y:c.y,z:c.z,w:16*ig},{x:mix(c.x,kx,.5),y:mix(c.y,ky,.5),z:mix(c.z,gz,.5)+60*Math.sin(t*3+i),w:9*ig},{x:kx,y:ky-4,z:gz,w:3},{x:kx,y:ky-4,z:gz,w:0}); }
      // embers off the smouldering edges; once it burns, black ash and bright flecks fall away from it
      if(emit&&(ig>0||bt>0)){ for(let m=0;m<(bt>0?3:1);m++){ const v=rand(-1,1), sd2=Math.random()<.5?-1:1, ex=c.x+sd2*tw*.9+bd*(1-v*v)*.6, ez2=c.z+v*th;
        GFX.pt({x:ex,y:c.y,z:ez2,vx:rand(-60,60),vy:rand(-20,20),vz:rand(80,260),g:-90,drag:1,life:rand(.35,.7),s:rand(3,5.5),m:8,c:GFX.rgb(Math.random()<.5?'#ff8a30':'#ffe0a0'),fade:'in',L:3,pri:1});
        if(bt>0) GFX.pt({x:c.x+rand(-tw,tw),y:c.y+rand(-15,15),z:c.z+rand(-th,th),vx:rand(-90,90),vy:rand(-30,30),vz:rand(-60,80),g:240,drag:1.4,life:rand(1.4,2.2),s:rand(5,9),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb(Math.random()<.3?'#5a3020':'#1a1512'),c2:'#050403',L:2}); } } }
    if(thr.length>1) F.ribbon(b.trC,thr,{cA:GOLD.b,cB:GOLD.m,cM:GOLD.h,cC:'#ffffff',a:.75,gain:2.2,fd:[.02,.02,0,0]});
    if(emit) st.dt=t+.03;
    // as it goes it comes apart from the head down: a bright seam runs down the figure, and above it every part bursts into motes that are drawn up the shaft
    if(gd.fK>0&&gd.fK<1){ const bz=gd.top-GH*.8*gd.bL, zt=gd.hz+GH*.06, zf=mix(zt,bz,eo3(gd.fK)), sa=Math.sin(Math.PI*gd.fK);
      F.bill(b.glowO,kx,ky+2,zf,GH*mix(.09,.24,gd.fK),GH*.035,0,{...CW,a:.9*sa,gain:2.8});
      if(t>st.ht){ st.ht=t+.016; for(let i=0;i<9;i++){ const a=rand(0,TAU), zz=zf+rand(0,GH*.22), rr=GH*rand(.03,.2)*(zz>gd.sz?.45:1), big=Math.random()<.2;
        GFX.pt({x:kx+Math.cos(a)*rr,y:ky+Math.sin(a)*rr*FSY,z:zz,vx:-Math.cos(a)*rr*1.2,vy:0,vz:rand(900,1800),g:-500,drag:.3,life:rand(.45,.9),s:big?rand(9,14):rand(4,8),m:big?8:3,len:.06,c:GFX.rgb(Math.random()<.45?'#ffffff':PJ.m),c3:'#ffffff',c2:PJ.b,fade:big?'in':undefined,L:3,pri:1}); } } }
    // what it leaves on the floor: a wide pool of spirit light under where it stood, cooling from jade to a dull ember and out over the last two seconds
    // what it leaves on the floor: the seal of its coming burnt into the stone where it stood, white-hot as it goes, cooling to jade, to a dull ember,
    // its lines breaking up and going out from the rim inward over the last two seconds
    if(t>TK){ const u=sat((t-TK)/(TEND-TK)), H=K.heat(SPV,mix(.95,.04,Math.pow(u,.7))), rs=mix(1150,1080,u); F.quad(u2.seal,kx,ky+40,rs,rs,1.2+.25*(1-Math.exp(-(t-TK)*1.5)),{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat((t-TK)/.25)*(1-sat((u-.85)/.15)),gain:1.6*H.g*(1-.65*u),ero:.04+.2*u*u}); } });
  // ---- it holds its breath
  after(TR,()=>{ SFX.rumble(1); Cn.shake(.2); });
  // ---- while it holds its breath the rays are aimed: twelve sectors round it, each takes its farthest bound body (or the open floor); a hair of light
  // hangs from the sky over every mark and a point of light tightens on the floor under it, so each ray is called before it falls
  const NS=F.low?8:12, TG=[];
  after(TH,()=>{ Cn.hush(.25); Cn.move({zoom:.6},.25); const SEC=[];
    for(const e of onScreen(200)){ const d=Math.hypot(e.x-kx,(e.y-ky)/FSY); if(d<420) continue; const j=Math.floor((Math.atan2((e.y-ky)/FSY,e.x-kx)+Math.PI)/TAU*NS)%NS; if(!SEC[j]||SEC[j][0]<d) SEC[j]=[d,e]; }
    for(let j=0;j<NS;j++){ const a=-Math.PI+(j+.5)/NS*TAU, e=SEC[j]&&SEC[j][1], rr=hw*(.62+.3*((j*37)%10)/10), T=e?{x:e.x,y:e.y}:{x:kx+Math.cos(a)*rr,y:ky+Math.sin(a)*rr*FSY};
      if(Math.hypot(T.x-x0,T.y-y0)<260){ T.x+=T.x<x0?-260:260; } TG.push({j,a,e,T,rk:Math.floor(Math.abs(Math.atan2(Math.sin(a-Math.PI/2),Math.cos(a-Math.PI/2)))/(TAU/NS)),big:j%2===0}); }
    if(F.on) GFX.add(TC-TH+.02,(k,t)=>{ const u=sat(t/(TC-TH)), pts=[]; for(const q of TG){ const T=q.T, sx=mix(T.x,kx,.3), sy=mix(T.y,ky,.3), w=mix(4,14,u*u)*(q.big?1.3:1);
        pts.push({x:sx,y:sy,z:2800,w:0},{x:sx,y:sy,z:2700,w},{x:T.x,y:T.y,z:40,w:w*.6},{x:T.x,y:T.y,z:0,w:0});
        if(Math.random()<.35) GFX.pt({x:T.x+rand(-60,60),y:T.y+rand(-30,30),z:rand(0,60),vx:0,vy:0,vz:rand(80,240),g:0,drag:.5,life:.25,s:rand(3,5),m:8,c:GFX.rgb('#ffffff'),fade:'in',L:3,pri:1}); }
      F.ribbon(b.trC,pts,{...CW,a:.25+.6*u,gain:2.2,fd:[.02,.02,0,0]}); }); });
  // ---- the first judgement: it presses down and rays fall out of the sky round it
  const FL=[kx-580,ky+430*FSY], FR=[kx+580,ky+430*FSY], F2L=[kx-650,ky+480*FSY], F2R=[kx+650,ky+480*FSY], LIFE=TEND-TC+.9;
  after(TC,()=>{ G2.release({s:1.7}); Cn.peak(kx,ky+250,{ca:0,blur:.03,tint:'#e8fff4',a:.07,hold:.04,out:.2}); hitstop=Math.max(hitstop,.12); Cn.shake(1.6); GFX.light(kx,ky+120,hw*1.9,'#e8fff4',.5,.4,{z:520}); Cn.SND.hit(1); Cn.SND.gong(1); SFX.roar(1.1,.6); SFX.boom(1.6,1); SFX.shatter(1);
    Cn.move({x:x0,y:y0-760,zoom:.46,roll:-.03},.2,'out'); GFX.ambient(.4,.45,.46,.3); after(.35,()=>Cn.move({zoom:.53,roll:0},.5));
    const g=godAt(TC); for(const s of [-1,1]) K.flare(kx+s*GH*.03,ky,g.hz+GH*.015,{pal:P,s:280,dur:.2,gain:2.4});
    // under each palm: a ball of spirit fire and stone dust, the floor broken round it
    for(const q of [FL,FR]){ K.vblast(q[0],q[1],{s:430,z:120,pal:SPV,heat:.8,gain:.8,smoke:0,dur:.5,fire:.3,rise:300}); jsmoke(q[0],q[1],340,1.3,.5); K.flare(q[0],q[1],120,{pal:P,s:300,dur:.16,gain:2}); GFX.light(q[0],q[1],560,'#f2fff8',1,.2,{z:140}); K.cool(q[0],q[1],{kind:'crack',r:560,pal:P,life:LIFE,grow:.08,light:0});
      K.chunks(q[0],q[1],{n:3,r:300,sp:[500,1400],up:2200,s:[70,170],pal:ST,rock:ROCK,life:1.9}); K.debris(q[0],q[1],{n:12,r:300,sp:[400,1700],up:2100,size0:12,size:34,c:'#4c5a54'}); K.sparks(q[0],q[1],80,{pal:P,n:18,sp:[600,2400],up:1700,life:[.3,.9]}); }
    K.cool(kx,ky+140,{kind:'crack2',r:980,pal:P,life:LIFE,grow:.3,rot:.5,light:0});
    // dust lit from behind, standing tall, rolling to the edges of the screen at one pace
    jdust(kx,ky+120,{r:hw*1.9,r0:620,dur:.62,tube:.062,a:.55,heat:.35}); GFX.ripple(kx,ky,hw*2.2,{life:.5,s:.9});
    // rays out of the sky: twelve sectors round it, each takes its farthest bound body (or the open floor). They do not fall together: the two in front go first
    // and the rest follow round both sides to the back, one every twentieth of a second, and each one breaks the floor open where it lands
    for(const {j,e,T,rk,big} of TG){
      jbeam({x:mix(T.x,kx,.3),y:mix(T.y,ky,.3),z:2700},T,{tip:big,l3:big,w:big?135:46,hold:big?.26:.16,delay:.05*rk,onHit:()=>{ erupt(T.x,T.y,big?1.35:.8,big?2:1); shock(T.x,T.y,big?1.3:.7); Cn.shake(big?.4:.2); sfx('shatter',.35);
        if(big){ K.chunks(T.x,T.y,{n:2,r:120,sp:[300,900],up:1700,s:[50,110],pal:ST,rock:ROCK,life:1.5}); K.flare(T.x,T.y,40,{pal:P,s:520,sx:1.6,sy:.5,dur:.14,gain:2.6}); }
        if(j%4===0) K.cool(T.x,T.y,{kind:'crater',r:300,pal:P,life:LIFE-.05*rk,light:0}); else if(j%4===2) K.coolLine(mix(kx,T.x,.42),mix(ky+120,T.y,.42),T.x,T.y,{w:80,pal:P,life:LIFE-.4,grow:.1}); else K.cool(T.x,T.y,{kind:'scorch',r:big?260:170,pal:P,life:LIFE-.3,light:0});
        if(e&&!e.dead&&j%4===0) spark(e,Math.atan2((e.y-ky)/FSY,e.x-kx),1.2); } }); }
    after(.08,()=>throwAll(260,1500,4));
    after(.4,()=>K.embers(kx,ky+200,hw*.9,{pal:P,n:30,life:2,up:380})); });
  // ---- it lifts its hands again
  after(TL,()=>{ SFX.rumble(.6); for(const q of [FL,FR]){ K.debris(q[0],q[1],{n:8,r:260,sp:[250,900],up:1500,size0:8,size:24,c:'#4c5a54'}); K.dust(q[0],q[1],{n:5,r:240,sp:[150,480],a:.45,c:'#2e2820',c3:'#6a5c4a'}); } });
  // ---- the second judgement: the halo drops to the floor and rolls out as a ring of light; spirit fire breaks out of the floor in three rings, one after
  // another, out to the edges of the screen and behind it; everything is thrown, and the wave that kills follows
  // the light of the sky drawn to one point between its palms in two frames, the field darkening round it, then a stillness before it lets go
  // it comes in a third of a second: light streaks pulled from the whole screen onto the point between its palms, a shell closing on it from wide and faint
  // to tight and white (it fades in, never pops), the point swelling as it fills; the field dims over the last tenth, then it lets go
  after(T2-.3,()=>{ const hp=handAt(T2-.05,-1), hq=handAt(T2-.05,1), cx=(hp[0]+hq[0])/2, cz=(hp[2]+hq[2])/2;
    for(let i=0;i<60;i++){ const a=rand(0,TAU), r=rand(700,1500), sx=cx+Math.cos(a)*r, sz=cz+Math.sin(a)*r*.8, lf=rand(.16,.28); GFX.pt({x:sx,y:ky-4,z:sz,vx:(cx-sx)/lf,vy:0,vz:(cz-sz)/lf,g:0,drag:0,life:lf,s:rand(4,7),m:3,len:.07,c:GFX.rgb(Math.random()<.5?'#ffffff':GOLD.m),c3:'#ffffff',c2:GOLD.b,L:3,pri:1}); }
    if(F.on) GFX.add(.31,(k,t)=>{ const u=sat(t/.3), r=mix(900,60,eo3(u)), a=sat(t/.1);
      F.bill(m9.shell,cx,ky-4,cz,r,r,t*6,{...CW,a:a*(.25+.75*u),gain:1.2+2.6*u,ero:.3-.2*u}); F.bill(m9.flash,cx,ky-4,cz,20+90*u*u,20+90*u*u,0,{...CW,a,gain:2.5+4*u}); }); });
  after(T2-.1,()=>{ GFX.ambient(.16,.18,.2,.08); lamp.a=.05; });
  after(T2,()=>{ Cn.peak(kx,ky+260,{ca:.45,blur:.05,tint:'#fff6dc',a:.12,hold:.05,out:.22}); hitstop=Math.max(hitstop,.15); Cn.shake(2.3); GFX.light(kx,ky+200,hw*1.9,PJ.l,.6,.45,{z:420}); Cn.SND.hit(1); Cn.SND.gong(.8); SFX.boom(1.5,1); SFX.shatter(1);
    Cn.move({zoom:.44,roll:.025},.18,'out'); after(.3,()=>Cn.move({zoom:.52,roll:0},.6)); GFX.ambient(.48,.58,.57,.3);
    // the halo drops and rolls out: fast at first, braking hard, dimming as it goes, dust and sparks thrown off its edge onto the floor
    // the light rolls out over the floor (the big broken line below): dust and gold sparks thrown off its front as it brakes
    for(let i=0;i<3;i++) after(.08+i*.12,()=>{ const rr=mix(300,hw*2.3*.78,[.45,.72,.9][i]); for(let m=0;m<8;m++){ const a=m/8*TAU+rand(-.2,.2), px=kx+Math.cos(a)*rr, py=ky+60+Math.sin(a)*rr*FSY; K.dust(px,py,{n:1,dir:a,spread:.3,sp:[150,400],a:.35,c:'#2e2820',c3:'#6a5c4a'}); if(m%2===i%2) K.sparks(px,py,10,{pal:GOLD,n:3,dir:a,spread:.5,sp:[300,900],up:300,life:[.15,.3]}); } });
    for(const q of [F2L,F2R]){ jsmoke(q[0],q[1],320,1.25,.1); K.flare(q[0],q[1],120,{pal:P,s:320,dur:.16,gain:2.2}); GFX.light(q[0],q[1],560,'#f2fff8',1,.2,{z:140}); K.cool(q[0],q[1],{kind:'crater',r:400,pal:P,life:TEND-T2+.9,light:0});
      K.chunks(q[0],q[1],{n:3,r:300,sp:[500,1400],up:2000,s:[70,160],pal:ST,rock:ROCK,life:1.8}); K.debris(q[0],q[1],{n:12,r:300,sp:[400,1700],up:2100,size0:12,size:34,c:'#4c5a54'}); K.sparks(q[0],q[1],80,{pal:P,n:16,sp:[600,2400],up:1700,life:[.3,.9]}); }
    dring(kx,ky+150,{r:hw*1.5,r0:520,dur:.7,tube:.085,a:.6,...DGy}); jwave(kx,ky+120,300,hw*2.3,.75,1.5); GFX.ripple(kx,ky,hw*2.4,{life:.55,s:1});
    [[hw*.42,5,2],[hw*.8,8,1],[hw*1.2,9,2]].forEach(([R,n,v],i)=>{ for(let m=0;m<n;m++){ const a=(m+.5*(i%2))/n*TAU+rand(-.12,.12), rr=R*rand(.9,1.1), x=kx+Math.cos(a)*rr, y=ky+150+Math.sin(a)*rr*FSY; if(Math.hypot(x-x0,(y-y0)/FSY)<360) continue;
        // not one shape repeated: three great columns lead (on the outer ring), the rest are spread from small sparks of light to tall shafts, each at its own beat
        const hero=i===2&&m%3===0, pw=hero?1.9:[1,1.1,1.2][i]*rand(.5,1.35);
        after(.05+i*.1+(m%3)*.02+(hero?0:rand(0,.06)),()=>{ erupt(x,y,pw,hero?1:(m%2?v:0)); if(hero){ shock(x,y,1.6); Cn.shake(.5); } if(m%4===0){ Cn.shake(.3); sfx('shatter',.4); } }); } });
    after(.06,()=>{ throwAll(520,2100,6); let n=0; for(const e of onScreen(200)){ if(n++>=6) break; spark(e,Math.atan2((e.y-ky)/FSY,e.x-kx),1); } });
    // the kill wave rolls out by distance (near ones go first, far ones later) and throws them less far, so the dying do not fly as one even rain
    after(.34,()=>Cn.sweep(kx,ky,Dm,{speed:2200,push:.65,max:.9}));
    after(.5,()=>K.embers(kx,ky+200,hw*.9,{pal:P,n:40,life:2,up:380})); });
  // ---- its eyes go out and it is drawn back up into the cloud; the pedestal cools and sinks
  after(TK,()=>{ const g=godAt(TK); for(const s of [-1,1]) K.sparks(kx+s*GH*.03,ky,g.hz,{pal:P,n:8,sp:[150,700],up:200,life:[.3,.7]}); SFX.bell(.5); Cn.shake(.2); });
  // smoke left standing over the places the palms and the judgement struck: dark underneath, lit on top, drifting up and thinning till the end
  for(let i=0;i<34;i++) after(TK+.1+i*.05,()=>{ const q=[FL,FR,F2L,F2R][i%4], lit=i%3===0; GFX.pt({x:q[0]+rand(-160,160),y:q[1]+rand(-60,60),z:rand(20,120),vx:rand(-40,40),vy:0,vz:rand(90,200),g:-30,drag:.4,life:rand(1.3,2),s:rand(50,80),rot:rand(0,TAU),vr:rand(-.6,.6),m:8,b:'alpha',c:GFX.rgb(lit?'#6f948a':'#1a2220'),c2:'#050706',fade:'in',L:2});
    if(lit) K.embers(q[0],q[1],140,{pal:P,n:3,life:1.2,up:300,z:30}); });
  // the pedestal settles as the god leaves: only a low rumble and embers lifting off the cooling seal (no second blast after the finale)
  after(TX2,()=>{ SFX.rumble(1.2); K.embers(kx,ky+100,700,{pal:P,n:24,life:1.6,up:420,z:40}); });
  // ---- wreckage: the camera comes home over the field
  after(TEND-1.2,()=>{ Cn.back(1.1); GFX.ambient(1,1,1,1.1); });
  after(TEND,()=>{ lamp.hold=0; eyeL.hold=0; ultStop(); }); }

// ---- sh_ult3
// the floor splitting along a line: soot, and light in the crack (drawn every frame; the colours come from K.heat)
let VM_=null;
function VM(){ if(VM_) return VM_; const m=F.mat, blk={cA:'#000000',cB:'#000000',cC:'#000000',op:1};
  VM_={s:m({tex:'v3_gash',nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,...blk,layer:'g'}),
    b:m({tex:'v3_gash',nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'})}; return VM_; }
if(F&&F.on) F.img('v3_gash');
// EARTH VEIN COLLAPSE (sh_ult3): he drives his staff into the floor. Five cracks race from under him to the edges of the screen and fill
// with light; the light runs back down them to his feet and the ground heaves, three times, each harder: the cracks branch and widen,
// thick blocks of the floor are forced up out of the joints one after another, thin shafts of jade climb, stones hang higher, everything
// standing is thrown into the air. A breath - and the floor breaks upward in one wave from him to beyond the screen: five kinked towers of
// stone first, then a ring of crags, split flagstones and needle fans, then the far teeth; whatever stood where one came up is thrown by it.
// The forest stands while the vein beats through it twice, each beat faster, and cracks climb the stone. Then he strikes again and it all
// breaks at once, from him outward in three beats: crowns fly, flagstones topple, trunks burst into boulders, and the storm of stone throws
// everything on the screen. What is left lies glowing, cools, and goes up as motes of light.
function ultQuake(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, b=K.mats(), vm=VM();
  const GRF=6000, TS=.42, RUN=.5, PT=[1,1.4,1.75], TH=2.1, TC=2.35, WV=5600, TA1=3, TA2=3.42, TX=3.85, TB=[0,.14,.28], TEND=5.95, GR=3000, NH=40, HT=[], HF=[1,.72,.5], QK=GFX.QK||1;
  const WHT={...SPV,b:'#9dffe0',m:'#f2fff9',h:'#ffffff'};
  // detailed stone (kit update 9): strata, chipped edges, cracks that carry the vein light; the faces stay dark stone
  const DT=(sd,gl,st=4)=>({detail:1,strata:st,glow:gl,edge:.07,ore:.3,seed:sd});
  for(let k=0;k<=NH;k++) HT.push(K.heat(SPV,k/NH));
  const hi=k=>HT[Math.round(sat(k)*NH)];
  // the same forest every time: a fixed seed
  let sd_=20261124; const rs=()=>{ sd_=(Math.imul(sd_,1664525)+1013904223)>>>0; return sd_/4294967296; }, rr=(a,c)=>a+(c-a)*rs();
  // a pulse of light: up in two frames, down in six
  const pls=u=>u<0?0:u<.035?u/.035:Math.exp(-(u-.035)*22);
  // rotate a model matrix (and its offset) by R
  const mul3=(R,M)=>{ const o=new Float32Array(16); for(let c=0;c<4;c++){ const a=M[c*4], b2=M[c*4+1], d=M[c*4+2]; o[c*4]=R[0]*a+R[4]*b2+R[8]*d; o[c*4+1]=R[1]*a+R[5]*b2+R[9]*d; o[c*4+2]=R[2]*a+R[6]*b2+R[10]*d; } o[15]=1; return o; };
  // ---- the cracks: five trunks of four bent pieces whose tip runs at one speed, and branches off every trunk at every heave
  const WB=[], JN=[], TRK=[], FRC=[.19,.23,.27,.31], CUM=[0,.19,.42,.69,1], TA=[-2.92,-1.78,-.52,.78,2.18].map(a=>a+rr(-.12,.12)), LT=Math.max(hw*1.55,2600);
  TA.forEach((a,i)=>{ let px=x0+Math.cos(a)*90, py=y0+Math.sin(a)*90*FSY, ang=a, alt=i%2?-1:1, cum=0; const w=rr(98,124), J=[], T=[[px,py,a]];
    for(let q=0;q<4;q++){ if(q){ ang+=alt*rr(.3,.6); alt=-alt; } const l=LT*FRC[q]*rr(.85,1.15), nx=px+Math.cos(ang)*l, ny=py+Math.sin(ang)*l*FSY;
      WB.push({x1:px-(nx-px)*(q?.22:0),y1:py-(ny-py)*(q?.22:0),x2:nx+(nx-px)*.06,y2:ny+(ny-py)*.06,w:w*(1-.13*q),ts:TS+RUN*cum,gr:RUN*FRC[q]*1.15,tr:q?2:1,near:q<2}); cum+=FRC[q]; px=nx; py=ny; J.push([nx,ny,ang]); T.push([nx,ny,ang]); }
    JN.push(J); TRK.push(T);
    PT.forEach((pt,j)=>{ for(let m=0;m<(j===2?2:1);m++){ const [bx,by,ja]=J[(i+j+m*2)%3], ba=ja+((i+j+m)%2?1:-1)*rr(.6,1.1), bl=LT*rr(.14,.26)*(m?.7:1);
        WB.push({x1:bx-Math.cos(ba)*bl*.2,y1:by-Math.sin(ba)*bl*.2*FSY,x2:bx+Math.cos(ba)*bl,y2:by+Math.sin(ba)*bl*FSY,w:rr(52,72),ts:pt+.02+.06*m,gr:.24,tr:0}); } }); });
  for(const s of WB){ const dx=s.x2-s.x1, dy=(s.y2-s.y1)/FSY; s.L=Math.hypot(dx,dy); s.rot=Math.atan2(dy,dx); s.uv=rs()<.5?[1,-1,0,1]:[1,1,0,0];
    for(const u of [.5,1]) after(s.ts+s.gr*u,()=>{ const sx=mix(s.x1,s.x2,u), sy=mix(s.y1,s.y2,u); K.sparks(sx,sy,14,{pal:P,n:s.tr?6:3,dir:s.rot,spread:.7,sp:[300,1100],up:800,life:[.2,.5]}); if(s.tr) K.dust(sx,sy,{n:2,r:40,sp:[120,380],a:.4,c:'#2e2820'}); }); }
  // a point on a trunk: f = 0 under him, 1 at its far end
  const along=(i,f)=>{ let q=0; while(q<3&&f>CUM[q+1]) q++; const T=TRK[i], u=sat((f-CUM[q])/FRC[q]); return [mix(T[q][0],T[q+1][0],u),mix(T[q][1],T[q+1][1],u),T[q+1][2]]; };
  // light running along the trunks: [start, time, direction]. The first comes home from the edges and sets off the first heave.
  const RN=[[.7,.3,-1],[PT[1],.22,1],[PT[2],.2,1]];
  // ---- blocks of the floor forced up beside the first joints, one after another; every heave drives them higher
  const PL=[], pn=[0,0], JS=[.42,.3,.24];
  JN.forEach((J,i)=>{ for(let q=0;q<(i%2?1:2);q++){ const [jx,jy,ja]=J[q], sd=(i+q)%2?1:-1, ps=ja+sd*(1.57+rr(-.35,.35)), s=rr(280,420), fh=(i+q)%2, cp=Math.cos(ps), sp=Math.sin(ps), ln=rr(.3,.62), gw=s*rr(1.05,1.5), p={x:jx+cp*s*.24,y:jy+sp*s*.24*FSY,hx:jx,hy:jy,cp,sp,s,v:(rs()*4)|0,fh,dl:.1*pn[fh]++,rk:[]};
      p.M=F.xfw({sx:gw,sy:gw*rr(.8,1.1),sz:s,rz:rr(0,TAU),rx:-sp*ln,ry:cp*ln}); p.tc=TC+Math.min(.5,Math.hypot(p.x-x0,(p.y-y0)/FSY)/WV);
      for(let m=0;m<1;m++){ const rs2=s*rr(.15,.24); p.rk.push({x:p.x+rr(-.3,.3)*s,y:p.y+rr(.04,.14)*s,s:rs2,v:(rs()*4)|0,M:F.xf({s:rs2,rx:rr(-.6,.6),ry:rr(-.6,.6),rz:rr(0,TAU)})}); }
      PL.push(p); } });
  const jh=(p,t)=>{ let h=0; for(let i=p.fh;i<3;i++){ const u=sat((t-PT[i]-p.dl)/.16); h+=JS[i-p.fh]*(eo3(u)+.14*Math.sin(u*Math.PI)); } return h; };
  // ---- the forest. A site is one place where the floor breaks: a trunk with a crown growing out of its shoulder at another angle, or a pair
  // of split flagstones, or a fan of needles, with boulders at the foot. Every piece knows how it will break: fly, topple, or burst (base).
  const FR=[], SITE=[], IMP=[], ALBS=['#3a5652','#48605a','#2e4846','#53665f'];
  const xfp=(p,ln,kz=1,kw=1)=>F.xfw({sx:p.s*p.w*kw,sy:p.s*p.w*kw*p.wy,sz:p.s*kz,rz:p.rz,rx:p.ly*ln,ry:p.lx*ln});
  const site=(j,x,y,s,t0)=>{ const st={j,x,y,s,t0,d:Math.hypot(x-x0,(y-y0)/FSY),oa:Math.atan2((y-y0)/FSY,x-x0),tb:TX+TB[j]+rr(0,.05),big:!j,P:[]}; SITE.push(st); return st; };
  const mk=(st,x,y,lx,ly,s,kind,w,ln,o={})=>{ const p={st,j:st.j,x,y,lx,ly,s,kind,w,ln,wy:(o.wy||1)*(kind==='slab'?1.6:1),t0:st.t0+(o.dt||0),tb:st.tb+(o.bd||0),v:(rs()*4)|0,rz:o.rz??rr(0,TAU),up:(o.up||.1)*2.8,sh:o.sh||0,par:o.par||null,at:o.at||0,mode:o.mode||'fly',alb:ALBS[(rs()*4)|0],hk:o.hk??rr(.1,.45),te:TEND-1.25+rr(0,.4),fr:o.fr||0,zb:0};
    p.M=xfp(p,ln); p.ax=[p.M[8],p.M[9],p.M[10]]; if(p.par){ const q=p.par; p.x=q.x+q.ax[0]*p.at; p.y=q.y+q.ax[1]*p.at*FSY; p.zb=q.zb+q.ax[2]*p.at; }
    p.sy=p.par?p.par.y+(p.fr?1:.5):p.y;
    if(p.mode==='fly'){ const fa=st.oa+rr(-1.1,1.1), sp=rr(500,1500)*(o.fs||1); p.vx=Math.cos(fa)*sp; p.vy=Math.sin(fa)*sp*FSY; p.vz=rr(450,1000)*(o.fz||1); p.w1=rr(-5,5); p.w2=rr(-5,5); p.w3=rr(-3,3);
      p.Mc=new Float32Array(p.M); p.Mc[12]=-p.ax[0]*.4; p.Mc[13]=-p.ax[1]*.4; p.Mc[14]=-p.ax[2]*.4; p.cx=p.x+p.ax[0]*.4; p.cy=p.y+p.ax[1]*.4*FSY; p.z0=p.zb+p.ax[2]*.4; p.zr=Math.min(70,p.s*.1);
      p.tl=(p.vz+Math.sqrt(p.vz*p.vz+2*GRF*Math.max(1,p.z0-p.zr)))/GRF; p.vb=Math.min(700,Math.abs(p.vz-GRF*p.tl)*.26); p.tbn=2*p.vb/GRF; p.ex=p.cx+p.vx*(p.tl+p.tbn*.3); p.ey=p.cy+p.vy*(p.tl+p.tbn*.3); p.te=Math.min(TEND-.9,Math.max(p.te,p.tb+p.tl+p.tbn+.3)); }
    else { p.ex=p.x; p.ey=p.y; if(p.mode==='top'){ const ul=Math.hypot(p.lx,p.ly)||1; p.tR=a=>F.xf({rx:-p.ly/ul*a,ry:p.lx/ul*a}); p.Mt=mul3(p.tR(1.05),p.M); p.ex=p.x+p.Mt[8]*.5; p.ey=p.y+p.Mt[9]*.5*FSY; } else if(p.mode==='base') p.Ms=xfp(p,ln,.3,1.06); }
    FR.push(p); st.P.push(p); return p; };
  const rock=(st,x,y,s)=>FR.push({mode:'rock',st,x,y,s,sy:y,v:(rs()*4)|0,M:F.xf({s,rx:rr(-.6,.6),ry:rr(-.6,.6),rz:rr(0,TAU)}),te:TEND-1.1+rr(0,.3),ex:x,ey:y,fr:0});
  // a trunk with a crown: the crown leaves the shoulder at its own angle, so no two stand alike; nb boulders wait inside it
  const trunk=(st,x,y,ca,sa,s,w,ln,nb,o={})=>{ const sd=rs()<.5?1:-1, ka=Math.atan2(sa,ca)+sd*rr(.8,1.5), B=mk(st,x,y,ca,sa,s*.76,'spike',w,ln,{up:o.up||.12,sh:o.sh,mode:'base',hk:o.hk??rr(.3,.8),bd:.07});
    mk(st,0,0,Math.cos(ka),Math.sin(ka),s*rr(.5,.62),'spike',w*rr(.6,.74),rr(.22,.44),{par:B,at:rr(.44,.54),hk:.08,fz:1.25});
    for(let m=0;m<nb;m++) mk(st,0,0,rr(-1,1),rr(-1,1),s*rr(.16,.23),m%2?'slab':'boulder',m%2?1.1:1,rr(0,1),{par:B,at:.24+.3*m,fr:1,sh:o.sh,wy:m%2?1.5:1,bd:.07,hk:1});
    return B; };
  // five towers close around him: the tallest straight behind, none standing over him
  [[-1.52,780,2550],[-2.52,820,1300],[-.66,860,1180],[2.68,1000,1040],[.4,1060,940]].forEach(([a,rad,s],i)=>{ const ca=Math.cos(a), sa=Math.sin(a), gx=x0+ca*rad, gy=y0+sa*rad*FSY, st=site(0,gx,gy,s,TC+.03+i*.045), sd=i%2?1:-1; st.main=!i;
    mk(st,gx+sd*s*.2,gy-s*.03,sd*.95,-.2,s*rr(.36,.46),'slab',1.1,.3+.04*i,{dt:.05,wy:1.6,rz:rr(-.5,.5),bd:.03});
    trunk(st,gx,gy,ca,sa,s,i?rr(.78,.94):.6,.08+.035*i,2,{up:.15,sh:1,hk:rr(.45,.75)});
    if(i<1) mk(st,gx-sd*s*.17,gy+s*.05,-sd*.9,.35,s*rr(.24,.3),'spike',1,.42,{dt:.08,mode:'top',bd:.05});
    for(let m=0;m<1;m++) rock(st,gx+(m?-1:1)*sd*s*rr(.14,.24),gy+s*rr(.03,.09),s*rr(.1,.15)); });
  // a ring of crags, split flagstones and needle fans; closer in front of him, where the screen ends sooner
  { const n=10, off=rr(0,TAU); for(let i=0;i<n;i++){ const a=off+(i+rr(.25,.75))/n*TAU, ca=Math.cos(a), sa=Math.sin(a), ty=[0,1,2,0,2][i%5]; let px=x0+ca*1700*rr(.9,1.12); const py=y0+sa*(sa<0?1500:900)*rr(.9,1.1)*FSY; if(sa>.3&&Math.abs(px-x0)<520) px=x0+(ca>=0?1:-1)*rr(560,760);
      const d=Math.hypot(px-x0,(py-y0)/FSY), sx=ca>=0?1:-1, s=(ty===0?rr(680,900):ty===1?rr(560,740):rr(720,920))*(1+.22*sa), st=site(1,px,py,s,TC+.1+d/WV+rr(0,.03)); st.gl=i%2===0;
      if(ty===0) trunk(st,px,py,ca,sa,s,rr(.74,1),rr(.2,.4),1,{up:.11,sh:sa<0});
      else if(ty===1){ mk(st,px-sx*s*.1,py,-sx*.8,sa*.5,s*.84,'slab',1.05,rr(.2,.34),{wy:1.7,rz:rr(-.45,.45),up:.11,sh:sa<0,fs:.6}); mk(st,px+sx*s*.16,py+s*.03,sx*.9,sa*.4,s*rr(.7,.86),'spike',rr(.6,.76),rr(.46,.62),{dt:.04,mode:'top'}); }
      else { mk(st,px,py,ca,sa,s,'spike',rr(.44,.54),rr(.12,.22),{up:.09}); mk(st,px-sx*s*.12,py+s*.02,-sx*.9,sa*.5,s*rr(.66,.76),'spike',rr(.46,.56),rr(.4,.52),{dt:.03,mode:'top'}); mk(st,px+sx*s*.13,py+s*.04,sx*.9,.3,s*rr(.42,.52),'spike',rr(.56,.7),rr(.56,.7),{dt:.06,mode:'top'}); }
      const rq=[rr(.12,.2),rr(.04,.08),rr(.14,.19)]; if(i%2===0) rock(st,px+sx*s*rq[0],py+s*rq[1],s*rq[2]); } }
  { const n=10, off=rr(0,TAU); for(let i=0;i<n;i++){ const a=off+(i+rr(.2,.8))/n*TAU, ca=Math.cos(a), sa=Math.sin(a), px=x0+ca*2800*rr(.86,1.1), py=y0+sa*(sa<0?2500:1200)*rr(.88,1.1)*FSY, d=Math.hypot(px-x0,(py-y0)/FSY), st=site(2,px,py,(i%2?rr(360,500):rr(300,480))*(1+.2*sa),TC+Math.min(.6,.1+d/WV)+rr(0,.03));
      if(i%4===1) mk(st,px,py,ca,sa,st.s,'slab',1.2,rr(.3,.5),{wy:1.6,rz:rr(-.5,.5),up:.09}); else mk(st,px,py,ca,sa,st.s,'spike',i%2?rr(.5,.7):rr(.8,1.15),rr(.3,.5),{up:.09,mode:i%4?'top':'fly'});
      } }
  FR.sort((p,q)=>p.sy-q.sy);
  for(const st of SITE){ const C=st.P.find(p=>p.par&&!p.fr)||st.P[0]; st.tip=[C.x+C.ax[0]*.95,C.y+C.ax[1]*.95*FSY,C.zb+C.ax[2]*.95]; }
  // stones that lift off the floor: [x, y, size, kind, variant, spin, phase, first heave that moves it]
  const GV=[]; for(let i=0;i<11;i++){ const a=i/11*TAU+rr(-.2,.2)+.3, r=rr(430,Math.min(hw*.9,1900)), gx=x0+Math.cos(a)*r, gy=y0+Math.sin(a)*r*FSY, o=[gx,gy,rr(110,230),i%3===1?'slab':'boulder',(rs()*4)|0,rr(-1.3,1.3),rr(0,6),i%3]; if(Math.abs(gx-x0)<340&&gy>y0-260&&gy<y0+760) continue; GV.push(o); }
  const STEP=[160,280,430];
  // shards of stone thrown from a height, and the white snap on a body that is hit
  const shards=(x,y,H,n,sz,sp=1100,jade=0)=>{ n=Math.round(n*QK); for(let q=0;q<n;q++){ const a=rand(0,TAU), vv=rand(250,sp), jd=jade&&Math.random()<.55; GFX.pt({x:x+rand(-50,50),y,z:rand(.2,1)*H,vx:Math.cos(a)*vv,vy:Math.sin(a)*vv*FSY,vz:rand(-200,1000),g:2600,drag:.25,life:rand(1,1.7),s:q<n*.18?rand(sz*.9,sz*1.7):rand(5,sz*.55),rot:rand(0,TAU),vr:rand(-10,10),m:11,b:'alpha',c:GFX.rgb(jd?'#3fb08e':'#4c5a54'),c2:jd?'#08241c':'#0a0f0e',shadow:true,bounce:.38,fk:5,L:2}); } };
  const pop=(e,big,jade)=>{ if(!F.on||e.d.boss) return; const z=e.h*.5+(e.z||0); GFX.pt({x:e.x,y:e.y,z,life:.15,s:(big?64:44)*(jade?.55:1),c:GFX.rgb(jade?SPV.s:'#eafff6'),m:8,L:3});
    for(let q=0;q<3;q++) GFX.pt({x:e.x+rand(-16,16),y:e.y,z:e.h*.2,vz:rand(1500,2500),g:3000,life:rand(.3,.5),s:rand(4,6.5),m:3,len:.08,c:GFX.rgb(SPV.h),c3:'#ffffff',c2:SPV.b,L:3}); };
  S([['gx04',.08,{kick:[-.8,.6]}],['gx07',.2],['gx11',.07,{kick:[-1,.8]}],['gx12',.07,{kick:[2,-1.6]}],['gx13',1.73],['gx11',.1,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',1.3],['gx11',.1,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',1.5],['gx14',9]]);
  // ---- ready: close on him; the cast signal; the staff goes into the floor
  GFX.ambient(.62,.7,.7,1.2); Cn.move({x:x0,y:y0-BODY*.6,zoom:1.4,tilt:.08},.45); SFX.rumble(2); Cn.drone(46,.3);
  after(.28,()=>{ K.flare(x0,y0,BODY*1.5,{pal:'azure',s:230,dur:.28,gain:2.6}); K.sparks(x0,y0,BODY*1.4,{pal:'azure',n:10,sp:[200,900],up:900,life:[.2,.45]}); GFX.light(x0,y0,700,'#bfe4ff',.9,.35,{z:200}); Cn.SND.shing(1,.5); SFX.bell(); });
  const lamp=GFX.light(x0,y0,900,PJ.l,.05,.4,{hold:TEND,z:160});
  // ---- the ki of the field drawn into the staff: streaks spiral in, shells tighten, grit lifts toward it, haze; it lets go at the break
  const gx0=x0+pl.f*BODY*.16, gz0=BODY*.42, GA=K.gather(gx0,y0+4,gz0,{dur:TH-TS-.08,max:TC-TS+.4,r:250,R:1000,pal:P,n:0,gain:.85,delay:TS+.08});
  // the gather is stopped, not released: its release burst was drawn late, as a stray ring round him after the break
  after(TC,()=>GA.end());
  // the spirits of the vein: thick wisps leave the far ends of the cracks and spiral into him (a jade body, a white core), more and faster with
  // every heave; round him the ki winds in tilted bands that tighten as it builds; motes climb the jade shafts at the joints
  const wisp=(u)=>{ if(!F.on) return; const i=(Math.random()*5)|0, [sx,sy]=along(i,rand(.55,.95)), r0=Math.hypot(sx-gx0,(sy-y0)/FSY), a=Math.atan2((sy-y0)/FSY,sx-gx0), ow=rand(1.3,2)*(1+.5*u)*(i%2?1:-1), ok=r0/rand(1,1.3)*(1+.6*u), z0=rand(60,260);
    for(let m=0;m<2;m++) GFX.pt({x:sx,y:sy,z:z0,oc:[gx0,y0+4,gz0],or:r0,oa:a,ow,ok,oz0:z0,rmin:40,life:1.9,s:m?rand(9,11):rand(40,52)*(1+.3*u),m:m?3:8,len:m?.014:0,c:GFX.rgb(m?'#ffffff':SPV.s),c3:'#ffffff',c2:SPV.b,fk:9,L:3,pri:1}); };
  const band=(u)=>{ if(!F.on) return; const tl=rand(-.6,.6), rb=rand(110,190)*(1-.35*u), zc=gz0+rand(-90,110);
    for(let m=0;m<3;m++) GFX.pt({x:gx0,y:y0+4,z:zc,oc:[gx0,y0+4,zc],or:rb,oa:rand(0,TAU)+m*.09,ow:(7+6*u)*(Math.random()<.5?1:-1),ok:0,oz0:zc,ob:rb*tl,life:rand(.22,.34),s:m?3:4.5,m:3,len:.05,c:GFX.rgb(m?SPV.s:'#ffffff'),c3:'#ffffff',c2:SPV.b,L:3,pri:1}); };
  { let ta=TS+.1; while(ta<TC-.05){ const u=sat((ta-TS)/(TH-TS)); after(ta,()=>{ const nw=1+Math.round(3*u*u), nb=1+Math.round(3*u); for(let q=0;q<nw;q++) wisp(u); for(let q=0;q<nb;q++) band(u);
      if(F.on) for(let q=0;q<1+Math.round(2*u);q++){ const a=rand(0,TAU), d=rand(150,600); GFX.pt({x:gx0+Math.cos(a)*d,y:y0+4+Math.sin(a)*d*FSY,z:2,vx:0,vy:0,vz:rand(60,200),g:-120*(1+u),drag:.6,tx:gx0,ty:y0+4,tz:gz0,pull:rand(.4,1)*(1+u),life:rand(1,1.6),s:rand(4,8),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#5a524c'),c2:'#0a0908',shadow:true,fk:4,L:2,pri:1}); }
      // the field's ki runs home along the cracks: bright streaks hugging the floor and small jade chips skidding in, more and faster with every heave
      if(F.on) for(let q=0;q<1+Math.round(4*u);q++){ const i=(Math.random()*5)|0, [sx,sy]=along(i,rand(.18,.92)), dx=gx0-sx, dy=(y0+4-sy)/FSY, dl=Math.hypot(dx,dy)||1, v=(800+1700*u)*rand(.8,1.2), ch=Math.random()<.3, lf=Math.min(1.3,dl/v*.95);
        if(ch) GFX.pt({x:sx,y:sy,z:rand(6,24),vx:dx/dl*v*.8,vy:dy/dl*v*.8*FSY,vz:rand(40,160),g:900,bounce:.3,drag:0,life:lf,s:rand(5,10),rot:rand(0,TAU),vr:rand(-14,14),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#5fe0b6':'#3a8f78'),c2:'#04140f',shadow:true,fk:4,L:2,pri:1});
        else GFX.pt({x:sx,y:sy,z:rand(4,18),vx:dx/dl*v,vy:dy/dl*v*FSY,vz:0,g:0,drag:0,life:lf,s:rand(3,5)*(1+.4*u),m:3,len:.08,c:GFX.rgb(Math.random()<.4?'#ffffff':SPV.s),c3:'#ffffff',c2:SPV.b,fade:'in',L:3,pri:1}); }
      for(const s of SH) if(F.on&&Math.random()<.8){ const [jx,jy]=s.at; GFX.pt({x:jx+rand(-20,20),y:jy,z:rand(10,120),vz:rand(700,1300),g:-200,drag:.3,life:rand(.35,.6),s:rand(3.5,5.5),m:3,len:.06,c:GFX.rgb(Math.random()<.5?'#ffffff':SPV.s),c3:'#ffffff',c2:SPV.b,L:3,pri:1}); } }); ta+=.045; } }
  // little arcs jumping from the staff to the nearest crack joints, more often as the heaves come
  const arc=(i)=>{ if(!F.on) return; const [jx,jy]=JN[i][0], n=9; let px=gx0, py=y0+4, pz=gz0;
    for(let q=1;q<=n;q++){ const u=q/n, w=Math.sin(u*Math.PI)*rand(-1,1)*70, nx=mix(gx0,jx,u)+w, ny=mix(y0+4,jy,u)+w*.3*FSY, nz=mix(gz0,6,u)+Math.sin(u*Math.PI)*rand(10,60);
      for(let m=0;m<3;m++){ const f=m/3; GFX.pt({x:mix(px,nx,f),y:mix(py,ny,f),z:mix(pz,nz,f),life:rand(.06,.11),s:m?3.2:4.5,m:8,c:GFX.rgb(m?SPV.s:'#ffffff'),L:3,pri:1}); } px=nx; py=ny; pz=nz; }
    GFX.pt({x:jx,y:jy,z:8,life:.1,s:16,m:8,c:GFX.rgb(SPV.h),L:3,pri:1}); };
  { let ta=PT[0]-.15, k=0; while(ta<TH-.02){ const i=k%5, kk=k; after(ta,()=>{ arc(i); if(kk%2) arc((i+2)%5); }); ta+=Math.max(.07,.22-.13*sat((ta-PT[0])/(TH-PT[0]))); k++; } }
  after(TS,()=>{ Cn.shake(.35); hitstop=Math.max(hitstop,.03); SFX.boom(.8,.6); sfx('shatter',.5); K.flare(x0,y0,30,{pal:P,s:260,sx:1.8,sy:.5,dur:.16,gain:2.2}); K.dust(x0,y0,{n:10,r:80,sp:[250,700],a:.45,c:'#2e2820'}); K.debris(x0,y0,{n:10,r:90,sp:[250,800],up:1100,size0:6,size:18,c:'#4c5a54'});
    K.sparks(x0,y0,30,{pal:P,n:12,sp:[300,1200],up:1100,life:[.25,.55]}); GFX.ripple(x0,y0,700,{life:.35,s:.4}); });
  after(RN[0][0],()=>{ SFX.rumble(.6); Cn.SND.shing(.5,.8); });
  // ---- gathering: one slow pull back while the ground heaves three times
  after(TS+.3,()=>{ Cn.move({zoom:.92,tilt:.14,roll:.022},TH-TS-.3,'lin'); GFX.ambient(.5,.56,.58,1.4); });
  const SH=[]; JN.forEach((J,i)=>{ const fh=i%2; after(PT[fh]+.05,()=>{ SH.push({fh,at:[J[0][0],J[0][1]],h:K.vcolumn(J[0][0],J[0][1],{r:30,h:300,dur:TC-PT[fh]+.05,rise:.2,out:.16,pal:SPV,heat:1.35,twist:1.4,turb:.5,taper:.5,flow:.6,gain:.75})}); K.flare(J[0][0],J[0][1],40,{pal:P,s:130,sx:.6,sy:1.8,dur:.16,gain:1.6}); }); });
  PT.forEach((pt,i)=>after(pt,()=>{ Cn.shake(.25+.12*i); SFX.boom(.75+.2*i,.5+.15*i); if(i) sfx('shatter',.35+.15*i); GFX.ripple(x0,y0,hw*(.6+.3*i),{life:.4,s:.3+.14*i});
    K.chunks(x0,y0,{n:3+i,kind:'slab',r:hw*.75,sp:[60,260],up:900+350*i,s:[40,80+22*i],pal:ST,rock:ROCK,life:1.1-.1*i});
    for(let q=0;q<10+5*i;q++){ const a=rand(0,TAU), r=rand(.15,1)*hw*.95; GFX.pt({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:2,vz:rand(260,420)+i*200,g:500,drag:.5,life:rand(.5,.9),s:rand(5,11)+i*2,rot:rand(0,TAU),vr:rand(-4,4),m:11,b:'alpha',c:GFX.rgb('#5c6a66'),c2:'#0a0f0e',shadow:true,fk:4,L:2}); }
    // each block breaks out in its turn: dust and stone off its foot, sparks out of the joint
    for(const p of PL) if(p.fh<=i) after(p.dl,()=>{ K.dust(p.x,p.y,{n:5,r:p.s*.3,sp:[150,460],a:.5,c:'#2e2820'}); K.debris(p.x,p.y,{n:5+2*i,r:p.s*.3,sp:[150,600],up:900+200*i,size0:6,size:20,c:'#4c5a54'}); K.sparks(p.hx,p.hy,20,{pal:P,n:4+2*i,sp:[200,800],up:1200,life:[.25,.6]}); if(p.fh===i){ Cn.shake(.16); sfx('shatter',.3); } });
    const part=Dm*.67; for(const e of onScreen(300)){ K.knock(e,{dist:0,up:500+280*i,stun:.6,fx:0}); dmg(e,e.d.boss?part:Math.min(part,Math.max(1,e.hp*.2)),{kb:0,stun:.6,sx:x0,sy:y0}); e.flash=Math.min(e.flash,.3); } }));
  // ---- the cracks, the blocks, the hanging stones and the forest: one clock
  if(F.on) GFX.add(TEND+.3,(k,t)=>{ const hk=sat((t-TH)/(TC-TH)), land=t>=TC, tl=t-TC, tx=t-TX; let np=0, pu=0; PT.forEach((pt,i)=>{ np+=eo3(sat((t-pt)/.2)); pu=Math.max(pu,pls(t-pt)*(.7+.15*i)); });
    const g=sat((t-TS)/.4)*.3+np*.23;
    // cracks: they fill with light behind the running tip and step toward white; after the break the trunks stay, cool and crumble
    { const ab=land?1:sat((t-TS)/(TH-TS)), kq=land?.08+.9*sat(tl/2.7):mix(.6,.22,g)-.2*hk, H=hi(kq), wk=(1+.2*np)*(land?1:.78+.4*ab), er=land?.12+.6*sat((tl-1)/1.9):.1+.3*(1-g);
      if(!land||tl<2.9) for(const s of WB){ if(t<s.ts||(land&&!s.near)) continue; const i=sat((t-s.ts)/s.gr), cx=s.x1+(s.x2-s.x1)*i*.5, cy=s.y1+(s.y2-s.y1)*i*.5, hl=s.L/2*i, w=s.w*wk, e0=s.tr?.02:.04, fill=sat((t-s.ts)/.3);
        if(s.near&&!land) F.quad(vm.s,cx,cy,hl,w*1.25,s.rot,{a:.85*sat((t-s.ts)/.06),ero:.1,uvT:s.uv,fd:[e0,e0,0,0]});
        F.quad(vm.b,cx,cy,hl,w,s.rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:1,gain:(1.6+1.3*fill+.9*pu)*H.g*(land?1:.62+.7*ab),bgain:1.15*H.g,ero:er,uvT:s.uv,fd:[e0+.1,e0+.1,0,0]});
        // the running tip: a small white-hot point throwing sparks ahead of itself (no soft blob)
        if(i<1){ const hx=s.x1+(s.x2-s.x1)*i, hy=s.y1+(s.y2-s.y1)*i; F.quad(b.glowG,hx,hy,s.w*.9,s.w*.32,s.rot,{...CW,a:.95,gain:2});
          if(Math.random()<.7){ const v=rand(500,1300), da=rand(-.35,.35), ca=Math.cos(s.rot+da), sa=Math.sin(s.rot+da); GFX.pt({x:hx,y:hy,z:rand(4,30),vx:ca*v,vy:sa*v*FSY,vz:rand(100,500),g:1400,drag:1.2,life:rand(.12,.28),s:rand(3,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':SPV.s),c3:'#ffffff',c2:SPV.b,L:3,pri:1}); } } } }
    // light running along the trunks
    if(!land) for(const [r0,rd,dir] of RN){ const u=(t-r0)/rd; if(u<0||u>1) continue; const f=dir<0?.66*(1-u*u):.04+.96*eo3(u), a=Math.sqrt(Math.sin(u*Math.PI));
      for(let i=0;i<5;i++){ const [ax,ay,an]=along(i,f); F.quad(b.glowG,ax,ay,340,120,an,{...C,a:.7*a,gain:1.5}); F.quad(b.glowG,ax,ay,190,54,an,{...CW,a,gain:2.2}); } }
    lamp.r=land?hw*.8:800+420*np; lamp.a=land?.06+.25*Math.exp(-tl*10)+(tx>0?.3*Math.exp(-tx*8):0):.07+.1*np+.3*pu+.25*hk;
    // blocks forced up out of the joints, light in the break under each, boulders shaken loose at the foot
    for(const p of PL){ if(t>=p.tc) continue; const h=jh(p,t); if(h<.01) continue; const H=hi(.5-.3*sat(h)), pq=pls(t-PT[p.fh]-p.dl)+(t>PT[1]+p.dl?pls(t-PT[Math.max(1,p.fh)]-p.dl):0)+pls(t-PT[2]-p.dl);
      F.quad(b.glowG,p.hx,p.hy,p.s*.6,p.s*.6,0,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat(h*2.2)*(.55+.45*pu),gain:1.5*H.g});
      F.solid('spike',p.v,p.x,p.y,p.s*(h-1)*.95,{M:p.M,alb:'#2e363c',emis:PJ.b,rimC:PJ.m,spec:.35,rim:.16+.3*pq,vein:.03,heat:.15+.6*pq,bump:.7,tone:.3,shadow:[.4,.2,.42*sat(h*3)],...DT(p.v+p.s*.01,.3+.2*np+.9*pq,5)});
      if(!F.low) for(const r of p.rk) F.solid('boulder',r.v,r.x,r.y,-r.s*(1-sat(h*4))*.9-r.s*.1,{M:r.M,alb:'#323b41',emis:PJ.b,rimC:PJ.h,spec:.4,rim:.15,vein:.03,heat:.5*pq,bump:.7,tone:.3,...DT(r.s*.03,.3+.9*pq)}); }
    for(const q of SH){ let hg=0; for(let i=q.fh;i<3;i++) hg+=eo3(sat((t-PT[i])/.3)); q.h.h=260+430*hg; q.h.r=28+9*hg; }
    // stones lifted by each heave; they hang, stop dead for the breath, and drop when the floor breaks
    if(tl<.14) for(const v of GV){ let z=0, on=0; for(let i=v[7];i<3;i++) if(t>=PT[i]){ const u=eo3(sat((t-PT[i])/.4)); z+=STEP[i]*u*(v[2]>170?.8:1.1); on=1; } if(!on) continue; const tt=t-PT[v[7]], bob=Math.sin(Math.min(t,TH)*2.2+v[6])*14, zz=land?z+bob-30000*tl*tl:z+bob; if(zz<0) continue;
      const spin=Math.min(t,TH)-PT[v[7]];
      F.solid(v[3],v[4],v[0],v[1],zz+v[2]*.4,{M:cxf(v[2],v[6]+spin*v[5]*.5,spin*.3,v[6]),alb:'#323d3c',emis:PJ.b,rimC:PJ.h,spec:.5,rim:.22+.2*hk,vein:.03,heat:0,bump:.7,tone:.3,clip:0,a:sat(tt*8),shadow:land||v[2]<150?null:[.55,.28,.4],...DT(v[6],.35+.3*np+.7*hk)}); }
    if(!land) return;
    if(t>TX-.02) for(const e of onScreen(300)) if(e.flash>.34) e.flash=.34;
    // one bed of light under the whole forest: a snap of two frames, then a low glow that cools; the vein beats through it and it snaps again at the break
    { const cq=sat(tl/2.6), bt=.5*pls((t-TA1)*.4)+.6*pls((t-TA2)*.5), a=(.06+.5*Math.exp(-tl*40))*(1-cq)*(1-cq)*sat(tl/.02)+.14*bt+(tx>0?.3*Math.exp(-tx*16)+.1*Math.exp(-tx*2.2):0);
      if(a>.004){ const H=hi(tx>0?.1+.8*sat(tx/1.6):.05+.9*cq-.4*bt); F.quad(b.glowG,x0,y0-150,2100,2100,0,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a,gain:.66*H.g}); } }
    // thin spikes that came up under whoever stood in the open
    for(const q of IMP){ const ts=t-q.t0; if(ts<0||t>TX+.25) continue; const e=eo3(sat(ts/.07)), u=sat(tx/.2), hot=sat(1-ts/.9);
      F.solid('spike',q.v,q.x,q.y,q.s*(e-1)*.95-q.s*u*u*.9,{M:q.M,alb:'#323c44',emis:hi(.03+.9*(1-hot)).cM,rimC:PJ.h,spec:.4,rim:.3+.5*hot,vein:.03,heat:.12+.5*hot,ero:u*.2,bump:.7,tone:.3,...DT(q.s*.01,.4+.9*hot)}); }
    // light on the floor at the foot of every near site: born white, cooling, beating with the vein, snapping at the break
    if(!F.low) for(const st of SITE){ if(st.j>1||st.gl===false||t<st.t0) continue; const ts=t-st.t0, tb=t-st.tb, hot=sat(1-(ts-.25)/1.1), wv=.6*pls((t-TA1-st.d/4500)*.45)+pls((t-TA2-st.d/8000)*.5), c2=sat((tb+.75)/.75), a=tb>0?Math.exp(-tb*3):sat(ts/.04)*(.14+.86*hot)*(st.gl===false?.5:1)+.7*wv+.5*c2*c2; if(a<.01) continue;
      const H=hi(tb>0?.1+.8*sat(tb/1.2):.24+.7*(1-hot)-.5*wv-.4*c2); F.quad(b.glowG,st.x,st.y,st.s*.5,st.s*.5,0,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat(a),gain:1.25*H.g}); }
    // the forest: every piece is born at its own moment, white-hot at the foot, and cools to bare stone; the vein beats through it; it cracks; it breaks
    for(const p of FR){ const f=sat((t-p.te)/.85); if(f>=1) continue;
      if(p.mode==='rock'){ const ts=t-p.st.t0-.05; if(ts<0||F.low) continue; const e=eo3(sat(ts/.2)), ht=Math.max(1-sat(ts/1.1),t>=p.st.tb?Math.exp(-(t-p.st.tb)*2.5):0);
        F.solid('boulder',p.v,p.x,p.y,-p.s*(1-e)*.9-p.s*.1-p.s*f*f*1.1,{M:p.M,alb:'#323b41',emis:PJ.b,rimC:PJ.h,spec:.4,rim:.15,vein:.03,heat:.6*ht,ero:f*.22,bump:.7,tone:.3,...DT(p.s*.02,.3+1.1*ht+.4*Math.sin(f*Math.PI))}); continue; }
      const ts=t-p.t0, tt=t-p.tb; if(ts<0||(p.fr&&tt<0)||(F.low&&(p.fr||p.j>1&&p.mode!=='base'&&p.par))) continue;
      if(tt<0){ const q=p.par||p, tq=t-q.t0, gu=tq/q.up, gv=(gu-1)*q.up/.25, e=gu<1?1.14*sat(gu)*sat(gu)*(3-2*sat(gu)):1+.14*Math.exp(-gv*4.5)*Math.cos(gv*6.5), hot=sat(1-(ts-.25)/.75), wv=.6*pls((t-TA1-p.st.d/4500)*.45)+pls((t-TA2-p.st.d/8000)*.5), ko=.68*(Math.abs(p.rz*7.31)%1), crk=sat((tt+.8-ko)/.12), c2=crk*crk, sk=crk>.5?Math.sin(t*78+p.rz)*p.s*.016*(crk-.5):0, H=hi(.24+.7*(1-hot)-.5*c2-.45*wv), hf=HF[p.j];
        // the vein beat reaches the foot first (heat) and the cracks higher up a moment later (glow)
        const wv2=.6*pls((t-TA1-p.st.d/4500-.07)*.45)+pls((t-TA2-p.st.d/8000-.06)*.5), big=p.st.main&&!p.par?2.1:p.st.big&&!p.par?1.35:1;
        // jade-stone faces: up-facing facets take a pale jade sheen, glints in the grain, light seeping through veins inside, a bright rim on the turned edges
        F.solid(p.kind,p.v,p.x+sk,p.y,p.zb+q.s*(e-1)*.95,{M:p.M,alb:p.alb,emis:H.cM,rimC:'#c8fff0',spec:.75,rim:.3+.4*hot*hot*hf+.35*wv+.25*c2,vein:.38+.3*c2,heat:(.04+.7*hot)*hf*p.hk+.6*wv*p.hk+.15*c2,bump:.8,tone:.42,shadow:p.sh?[.55,.28,.42]:null,...DT(p.rz,(.1+.7*hot*hf+.9*wv2+.9*c2)*big,p.kind==='slab'?6:5),moss:'#6fd8b4',mossK:.55,ore:.9}); continue; }
      // after the break: dark stone; only the cracks still glow, cooling white -> jade -> dark; at the end it sinks into its dust instead of dissolving
      // cooling: the jade sheen and vein light die, the stone greys to ash, then it sinks into the floor in its own dust (no dissolve)
      const hb=Math.exp(-tt*9), h2=(tt<.45?1:Math.exp(-(tt-.45)*1.5))*(1-f), H=hi(.04+.9*(1-h2)), fg=Math.sin(f*Math.PI), cg=sat((tt-.3)/1.1), A0=GFX.rgb(p.alb), sk2=Math.pow(f,1.5)*p.s*1.15,
        o={alb:[mix(A0[0],.43,cg),mix(A0[1],.45,cg),mix(A0[2],.44,cg)],emis:H.cM,rimC:PJ.h,spec:.3+.4*(1-cg),rim:.14+.5*hb+.25*h2,vein:.2*h2,heat:.6*hb+.3*h2,ero:f*.08,bump:.7,tone:.3,...DT(p.rz,.1+2.4*hb+.9*h2,p.kind==='slab'?6:5),edge:.14,moss:'#6fd8b4',mossK:.55*(1-cg),ore:.9*(1-cg)};
      if(p.mode==='fly'){ const t2=tt-p.tl, b2=t2>0?Math.min(t2,p.tbn):0, ta=Math.min(tt,p.tl), tu=ta+b2*.3, wr=ta+b2*.55, z=t2<0?Math.max(p.zr,p.z0+p.vz*tt-.5*GRF*tt*tt):p.zr+Math.max(0,p.vb*b2-.5*GRF*b2*b2);
        o.M=mul3(F.xf({rx:p.w1*wr,ry:p.w2*wr,rz:p.w3*wr}),p.Mc); if(p.sh&&tt<p.tl) o.shadow=[.55,.28,.4]; F.solid(p.kind,p.v,p.cx+p.vx*tu,p.cy+p.vy*tu,z-sk2,o); }
      else if(p.mode==='top'){ const q=sat(tt/.42); o.M=q>=1?p.Mt:mul3(p.tR(1.05*q*q),p.M); F.solid(p.kind,p.v,p.x,p.y,p.zb-sk2,o); }
      else { o.M=p.M; F.solid(p.kind,p.v,p.x,p.y,p.zb-p.s*.6*eo3(sat(tt/.3))-sk2,o); } } });
  // ---- held breath: the stones stop, everything on the floor holds still
  after(TH,()=>{ Cn.hush(.25); Cn.move({zoom:1},.25); for(const e of onScreen(300)) e.stun=Math.max(e.stun,.5); });
  // ---- the floor breaks, one wave outward
  after(TC,()=>{ Cn.peak(x0,y0-BODY*.5,{ca:.016,blur:.028,tint:'#58d6a8',a:.16,hold:.02,out:.09}); hitstop=Math.max(hitstop,.1); Cn.shake(1.5); GFX.light(x0,y0,hw*1.2,'#8dffd6',.55,.14,{z:320}); Cn.SND.hit(1); Cn.SND.gong(1); SFX.boom(1.6,1); SFX.shatter(1);
    Cn.move({zoom:.86,roll:0},.2,'out'); GFX.ambient(.6,.7,.66,.3); GFX.ripple(x0,y0,hw*2.2,{life:.5,s:.3});
    K.cool(x0,y0,{kind:'crack2',r:1000,pal:P,life:TEND-TC+.5,grow:.2,rot:.5,light:0}); K.cool(x0,y0-200,{kind:'scorch',r:520,pal:P,life:TEND-TC+.6,grow:.1,light:0});
    // the blocks are swallowed as the wave reaches them
    PL.forEach((p,i)=>after(p.tc-TC,()=>{ shards(p.x,p.y,p.s*.6,6,30,800); K.dust(p.x,p.y,{n:3,r:p.s*.2,sp:[150,460],a:.45,c:'#2e2820'}); if(i%2===0) K.chunks(p.x,p.y,{n:2,kind:'slab',r:60,sp:[200,700],up:1900,s:[p.s*.2,p.s*.32],pal:ST,rock:ROCK,life:1.1}); }));
    // everything on the screen is thrown: by the piece that came up beside it, by a spike of its own in the open, or by the wave
    const bk={}; let ni=0;
    for(const e of onScreen(300)){ const d=Math.hypot(e.x-x0,(e.y-y0)/FSY); let te=Math.min(.58,.04+d/WV), from=[x0,y0], near=0, bd=1e9;
      for(const st of SITE){ const ds=Math.hypot(e.x-st.x,(e.y-st.y)/FSY); if(ds<st.s*.3+150&&ds<bd){ bd=ds; te=st.t0-TC+.03; from=[st.x,st.y]; near=1; } }
      const imp=!near&&!e.d.boss&&d>380&&ni++%2===0&&IMP.length<6, bi=(te/.05)|0;
      if(imp){ const s=rand(300,420); IMP.push({x:e.x,y:e.y+6,s,t0:TC+te-.04,v:(Math.random()*4)|0,M:F.xfw({sx:s*.55,sy:s*.55,sz:s,rz:rand(0,TAU),rx:rand(-.15,.15),ry:rand(-.2,.2)})}); }
      after(te,()=>{ if(e.dead) return; K.knock(e,{from,dist:near?150:70,up:rand(1900,2500),stun:TX-TC-te+.4,fx:0}); e.flash=Math.min(e.flash,.4); pop(e,near||imp);
        if((near||imp)&&(bk[bi]=(bk[bi]||0)+1)<=2) K.ehit(e,{pal:P,pw:1.3,ring:0,light:0,dir:near?Math.atan2((e.y-from[1])/FSY,e.x-from[0]):undefined}); }); }
    // the wave's earth: shaded dust thrown off in a broken ring between the forest's sites (the flat grey torus here read as a band)
    after(.2,()=>{ for(let q=0;q<14;q++){ const a=q/14*TAU+rand(-.15,.15), r=rand(1100,1700); K.dust(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{n:3,dir:a,spread:.6,sp:[300,800],a:.5,c:'#2a2722',c3:'#9a917e',life:1.1,s:1.2}); } });
    after(.5,()=>Cn.move({y:y0-620,zoom:.66,tilt:.2},1,'io'));
    after(.7,()=>K.embers(x0,y0,hw*.9,{pal:P,n:40,life:1.6,up:380})); });
  // every site announces itself: a white snap where it pierces the floor, stone and sparks thrown clear; the towers carry fire up their side and burst at the crest
  for(const st of SITE) after(st.t0,()=>{ const big=st.big, p=st.P.find(q=>q.mode==='base')||st.P[0];
    K.flare(st.x,st.y,50,{pal:WHT,s:st.s*(big?.3:.22),sx:1.5,sy:.6,dur:.1,gain:3}); K.flare(st.x,st.y,40,{pal:P,s:st.s*(big?.36:.28),sx:1.7,sy:.55,dur:.18,gain:big?2:1.4}); K.sparks(st.x,st.y,50,{pal:P,n:big?14:st.j>1?5:8,sp:[300,1300],up:2300+(big?400:0),g:1500,life:[.35,.9]});
    shards(st.x,st.y,st.s*.3,big?12:st.j>1?4:7,big?34:24,900); K.dust(st.x,st.y,{n:big?6:3,r:st.s*.3,sp:[200,600],a:.45,c:'#2e2820'});
    if(st.j>1) return; Cn.shake(big?.7:.4); GFX.light(st.x,st.y,st.s,PJ.l,big?.5:.6,.2,{z:200});
    // earth thrown off the foot in a shaded swirl (lit grey tops, dark undersides) instead of a flat brown torus
    if(big){ SFX.boom(1.2,.8); sfx('shatter',.7); K.dust(st.x,st.y,{n:9,r:st.s*.22,sp:[350,950],a:.55,c:'#2a2620',c3:'#a39883',life:1.3,s:1.3}); if(st.s>1100) K.chunks(st.x,st.y,{n:2,kind:'slab',r:st.s*.16,sp:[300,900],up:1900,s:[60,120],pal:ST,rock:ROCK,life:1.1});
      const M=p.M, dir=Math.atan2(M[9],M[8]), sdx=p.lx>=0?1:-1; K.vjet(p.x+sdx*p.s*p.w*.24,p.y+12,20,dir,{pitch:Math.atan2(M[10],Math.hypot(M[8],M[9])),len:st.s*.9,r:st.s*.085,r0:st.s*.05,dur:.6,in:.3,out:.24,pal:SPV,heat:1.1,turb:.5,speed:7,gain:.75}); }
    after(big?.5:.4,()=>{ const [tx,ty,tz]=st.tip; K.flare(tx,ty,tz,{pal:P,s:st.s*(big?.2:.13),sx:.55,sy:1.9,dur:big?.3:.2,gain:big?2.6:2}); K.sparks(tx,ty,tz,{pal:P,n:big?16:6,sp:[200,900],up:700,g:1200,life:[.5,1.1]}); }); });
  // ---- the vein beats through the standing forest twice, the second faster: light runs outward stone by stone, dust shakes off, bodies jump
  [[TA1,4500,.5],[TA2,8000,.8]].forEach(([ta,spd,pw],n)=>after(ta,()=>{ SFX.rumble(.6+.3*n); SFX.boom(.5+.3*n,.5); Cn.shake(.2+.2*n); GFX.ripple(x0,y0,hw*1.8,{life:.5,s:.3+.2*n}); K.flare(x0,y0,30,{pal:P,s:300,sx:1.8,sy:.5,dur:.16,gain:1.8});
    for(const st of SITE) after(st.d/spd,()=>{ if(st.j<2) K.dust(st.x,st.y,{n:2+n,r:st.s*.3,sp:[120,360],a:.4,c:'#2e2820'}); K.sparks(st.tip[0],st.tip[1],st.tip[2]*(.4+.5*Math.random()),{pal:P,n:(st.big?6:3)+2*n,sp:[80,500],up:500,g:900,life:[.4,.9]}); if(n) shards(st.x,st.y,st.s*.8,st.big?4:2,18,400); });
    // gravel lifts off the whole floor before the break
    if(n) for(let q=0;q<Math.round(46*QK);q++){ const a=rand(0,TAU), r=Math.sqrt(Math.random())*hw*1.5; GFX.pt({x:x0+Math.cos(a)*r,y:y0-200+Math.sin(a)*r*FSY,z:2,vz:rand(260,620),g:-500,drag:.6,life:rand(.4,.62),s:rand(6,15),rot:rand(0,TAU),vr:rand(-4,4),m:11,b:'alpha',c:GFX.rgb('#5c6a66'),c2:'#0a0f0e',shadow:true,fk:4,L:2}); }
    if(n) for(const e of onScreen(300)){ const d=Math.hypot(e.x-x0,(e.y-y0)/FSY); after(d/spd,()=>{ if(!e.dead){ K.knock(e,{dist:0,up:900,stun:TX-ta+.3,fx:0}); e.flash=Math.min(e.flash,.3); } }); } }));
  // ---- the break: a breath, the staff comes down again, and the whole forest bursts from him outward in three beats
  after(TX-.2,()=>Cn.hush(.2));
  // the staff draws the forest's light into one point: a ring of motes tightens onto a white core that swells for .3s, then the break
  after(TX-.32,()=>{ if(!F.on) return; const m9=K.m9(); GFX.add(.33,(k,t)=>{ const u=sat(t/.3), R=340*(1-u*u)+40;
    // a shell of light tightening onto the staff, and a white core swelling inside it (drawn, not spawned, so every frame shows it)
    F.bill(m9.shell,gx0,y0+4,gz0,R,R,t*(5+12*u),{...C,a:.35+.6*u,gain:1.6+1.8*u,ero:.1+.3*(1-u)});
    F.bill(m9.flash,gx0,y0+4,gz0,40+150*u*u,40+150*u*u,0,{...CW,a:.5+.5*u,gain:2+2.2*u});
    if(Math.random()<.8){ const a=rand(0,TAU), d=rand(500,900); GFX.pt({x:gx0+Math.cos(a)*d,y:y0+4+Math.sin(a)*d*FSY,z:gz0+rand(-80,200),vx:-Math.cos(a)*d*4,vy:-Math.sin(a)*d*4*FSY,vz:0,g:0,drag:0,life:.24,s:4,m:3,len:.05,c:GFX.rgb('#ffffff'),c3:'#ffffff',c2:SPV.b,L:3,pri:1}); } }); });
  after(TX,()=>{ Cn.peak(x0,y0-BODY*.5,{ca:.012,blur:.02,tint:'#dcfff1',a:.34,hold:.03,out:.1});
    // the shock: a ring of white streaks racing out past the edges of the screen
    if(F.on) for(let q=0;q<Math.round(72*QK);q++){ const a=q/72*TAU+rand(-.03,.03), v=rand(6500,8500); GFX.pt({x:gx0+Math.cos(a)*90,y:y0+4+Math.sin(a)*90*FSY,z:rand(10,60),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:0,g:0,drag:1.2,life:.38,s:rand(5,8),m:3,len:.07,c:GFX.rgb(q%3?'#ffffff':SPV.s),c3:'#ffffff',c2:SPV.b,L:3,pri:1}); } hitstop=Math.max(hitstop,.13); Cn.shake(1.6); GFX.light(x0,y0,hw*1.4,'#8dffd6',.4,.14,{z:320}); Cn.SND.hit(1); SFX.boom(1.7,1); SFX.shatter(1);
    Cn.move({zoom:.57},.18,'out'); GFX.ripple(x0,y0,hw*2.4,{life:.5,s:.12});
    // a starburst with a shape: five tapered rays out of the staff, held for the hit-stop, then drawn in fast
    if(F.on){ const RA=[.3,1.5,2.55,3.75,5.0].map(a=>a+rand(-.15,.15)), RL=[1,.7,.9,.65,.8]; GFX.add(.34,(k,t)=>{ const hl=t<.08?1:Math.pow(1-sat((t-.08)/.26),2.2), gr=eo3(sat(t/.035));
      const fm=K.m9().flash; for(let i=0;i<5;i++) F.bill(fm,gx0,y0+4,gz0,1300*RL[i]*gr*(.25+.75*hl),60*(.4+.6*hl),RA[i],{...CW,a:hl,gain:3.6}); }); }
    for(let j=1;j<3;j++) after(TB[j],()=>{ Cn.shake(1.2-.3*j); SFX.boom(1.3-.2*j,.8); SFX.shatter(.8); });
    const bk={}; for(const e of onScreen(300)){ const d=Math.hypot(e.x-x0,(e.y-y0)/FSY), j=d<1250?0:d<2250?1:2; after(TB[j]+rand(0,.04),()=>{ if(e.dead) return; K.knock(e,{from:[x0,y0],dist:520,up:rand(1300,1800),stun:1.2,fx:0}); e.flash=.3; pop(e,1,1); }); }
    dring(x0,y0-200,{r:3000,r0:600,dur:.5,tube:.075,a:.42,...DGy});
    after(.36,()=>Cn.sweep(x0,y0,Dm,{speed:5200,push:1.3,max:.4}));
    after(.5,()=>K.embers(x0,y0,2400,{pal:P,n:36,life:1.6,up:460})); });
  for(const st of SITE) after(st.tb,()=>{ const big=st.big, H=st.s*.5;
    K.flare(st.x,st.y,H,{pal:WHT,s:Math.min(380,st.s*(big?.36:.26)),dur:.12,gain:2.8}); K.flare(st.tip[0],st.tip[1],st.tip[2]*.8,{pal:P,s:Math.min(220,st.s*.22),dur:.16,gain:2}); shards(st.x,st.y,st.s*.9,big?16:st.j>1?5:9,big?40:28,1100,1); K.sparks(st.x,st.y,H,{pal:P,n:big?12:5,sp:[300,1400],up:900,g:1500,life:[.35,.9]});
    if(st.j<2){ GFX.light(st.x,st.y,st.s,PJ.l,.45,.2,{z:H}); K.dust(st.x,st.y,{n:big?8:4,r:st.s*.25,sp:[200,620],a:.5,c:'#3a3f40',c3:'#8d9692',life:1.1}); }
    if(big){ K.cool(st.x,st.y,{kind:'crater',r:st.s*.3,pal:P,life:TEND-TX+.4,start:.2,grow:.15,light:0}); if(st.s>1100) K.dust(st.x,st.y,{n:7,r:st.s*.18,sp:[250,700],a:.55,c:'#2a2d2c',c3:'#9aa29e',life:1.2}); } });
  // every piece that flies lands in its own dust; every piece that topples slams down; in the end each one goes up as motes of light
  for(const p of FR){ if(p.mode==='fly'&&(p.j<2||p.sh||p.s>250)) after(p.tb+p.tl,()=>{ K.dust(p.ex,p.ey,{n:p.sh?5:3,r:p.s*.12,sp:[120,400],a:.45,c:'#3a3f40'}); if(p.sh){ K.sparks(p.ex,p.ey,20,{pal:P,n:4,sp:[100,500],up:700,g:1200,life:[.3,.7]}); if(p.s>500) Cn.shake(.2); } });
    if(p.mode==='top') after(p.tb+.42,()=>{ K.dust(p.ex,p.ey,{n:3,r:p.s*.2,sp:[150,460],a:.45,c:'#3a3f40'}); if(p.j<2) shards(p.ex,p.ey,60,3,20,500); });
    // as it sinks it crumbles: grit rolls off it and a glint or two of crystal floats up
    if(p.mode!=='rock'&&(p.j<2||p.mode==='base')) after(p.te+.12,()=>{ if(!F.on) return; shards(p.ex,p.ey,p.s*.25,p.j?2:4,16,320,1); const n=Math.round((p.j?3:6)*QK); for(let q=0;q<n;q++){ const a=rand(0,TAU), r=rand(.1,.5)*p.s*.4; GFX.pt({x:p.ex+Math.cos(a)*r,y:p.ey+Math.sin(a)*r*FSY,z:rand(10,p.s*.25),vx:Math.cos(a)*rand(60,240),vy:Math.sin(a)*rand(30,120),vz:rand(100,400),g:2200,drag:.4,life:rand(.5,.9),s:rand(5,12),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4a524e'),c2:'#0a0f0e',shadow:true,bounce:.3,fk:4,L:2,pri:1}); }
      for(let q=0;q<2;q++) GFX.pt({x:p.ex+rand(-40,40),y:p.ey,z:rand(10,60),vz:rand(120,260),g:-60,drag:.8,life:rand(.7,1.1),s:rand(3,5),m:3,len:.04,c:GFX.rgb(SPV.s),c3:'#ffffff',c2:SPV.b,fade:'in',L:3,pri:1}); });
    after(p.te,()=>K.embers(p.ex,p.ey,p.s*(p.mode==='rock'?.5:.22),{pal:P,n:p.mode==='rock'||p.j>1?2:5,life:1.2,up:560,s:1.8})); }
  after(TEND-1.3,()=>{ Cn.back(1.2); GFX.ambient(1,1,1,1.3); });
  after(TEND,()=>{ lamp.hold=0; ultStop(); }); }

X.reg('shaman',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('sh_basic')-1))},skills:SKILL,ults:{sh_ult1:ultStones,sh_ult2:ultTotem,sh_ult3:ultQuake}});
})();
