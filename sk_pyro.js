// 참광 survival - PYRO skill set (top-down, all automatic). Fire: balls, pillars, rings, breath, tornadoes. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js) and FX3 meshes; the pieces that only fire needs (whirl, ring of fire, burning line,
// scorch, comet, flamethrower fan, the dragon) live in this file.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,ultStart,ultStop,ultHit}=X;
const K=window.K3, F=window.FX3, PI=Math.PI, mix=(a,b,k)=>a+(b-a)*k, sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k);
const C1='#ff7a2a';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const push=b=>S([['gb02',.04],['gb03',.05,{kick:[-.8,.6]}],['gb04',.06],['gb05',.04,{kick:[1.6,-1.2]}],['gb06',.08],['gb08',.07],['gb12',.05]],b);
const raise=()=>S([['gx01',.06],['gx03',.12,{kick:[-.8,.6]}],['gx06',.1,{kick:[2,-1.6]}],['gx07',.3],['gx09',.1],['gx12',.1,{kick:[2,-1.6]}],['gx14',.15]]);

// ---------------------------------------------------------------- palettes: d dark outer mass, b body, h hot core, l floor light, s spark
const PF={d:'#340600',b:'#ff4208',m:'#ffae24',h:'#fff3c4',l:'#ff6a1c',s:'#ffc478'};   // living fire: deep red-orange body, amber heat, yellow-white core
const PG={d:'#421a00',b:'#ff9410',m:'#ffe070',h:'#fffbe6',l:'#ffae34',s:'#ffe6a0'};   // the hottest part: gold
const PD={d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'};   // the dragon's own fire: crimson
const PB={d:'#06102e',b:'#3a7cff',m:'#bfe2ff',h:'#ffffff',l:'#a8caff',s:'#dff0ff'};   // blue-white: only the very hottest instant
const PS=K.PAL.silver||{d:'#070a14',b:'#aab8d8',m:'#e4ecff',h:'#ffffff',l:'#b9c6ff',s:'#e0e8ff'};   // the cold circle the fire is called through
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m||P.b});
const IDENT=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const CIRC=()=>F.ready('v3_circ_pyro')?'v3_circ_pyro':'fx_circle_arcane';
if(F&&F.on){ for(const n of ['dragon_head','dragon_body','fx_sun','meteor','fx3_tornado','fx3_fire','fx3_smoke','v3_circ_pyro','v3_comet_tail','v3_crater','v3_scorch','v3_flame_cone','v3_vortex_wisps']) F.img(n); F.img('v3_groundfire',{repeat:true}); for(const n of ['v3_burst_fire','v3_shock_thick','v3_fissure_b']) F.img(n); }
// the lobed fire burst (the older fireball until its art is in assets)
const BF=()=>F.ready('v3_burst_fire')?'v3_burst_fire':'fx3_burst', BFA=()=>{ const q=F.tex&&F.tex.v3_burst_fire; return q&&q.ok?q.im.naturalWidth/q.im.naturalHeight:1.39; };
// ---------------------------------------------------------------- local materials (built once)
let MT=null;
function mats(){ if(MT) return MT; const m=F.mat, k=K.mats(); MT={
  // whirl: bands of flame wound round a funnel, racing round it and up; a dark hull outside, a streaked core inside
  whB:m({nz:'wisp',n1:[1,1,-1.15,-.45],n2:[2,1,-.5,-.3],dist:.035,nk:1,pw:1.35,ero:.2,soft:.3,fd:[0,0,.2,.4],rk:[.5,1.25],gain:1.9,bgain:1.05}),
  whC:m({nz:'streak',n1:[1,.6,-2,-.75],n2:[2,1,-1,-.4],dist:.03,nk:1,pw:1.5,ero:.3,soft:.25,fd:[0,0,.1,.55],rk:[.45,1.1],gain:2.2,bgain:1.15}),
  // painted tornado and painted flame, coloured through the ramp and pulled by scrolling distortion
  tor:m({...k.art,tex:'fx3_tornado',layer:'o',nz:'wisp',n1:[1.5,1,-.9,-.5],n2:[1.4,1,-.7,-.5],dist:.06,mdist:1,nk:.3,rk:[.6,1.25]}),
  fire:m({...k.art,tex:'fx3_fire',layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.09,mdist:1,rk:[.6,1.2]}),
  sun:m({...k.art,tex:'fx_sun',layer:'o',nz:'cells',n1:[2,2,.1,.07],n2:[1.5,1.5,.1,-.1],dist:.04,mdist:1,nk:.25,rk:[.5,1.02]}),
  // scorch: one alpha-blended decal - charred rim, embers inside that cool to black
  sc:m({tex:'v3_scorch',nz:'cells',n1:[3,3,.012,.008],n2:[2,2,.01,.01],dist:.03,mdist:1,nk:.85,pw:1.5,ero:.03,soft:.22,cA:'#000000',rk:[.45,1.15],op:1,layer:'g'}),
  // the dragon: painted colour art
  dH:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ffffff',cC:'#ffd070',gain:1.2,op:1,layer:'o'}),
  dB:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[4,1,0,0],cB:'#ffffff',cC:'#ffd070',gain:1.15,op:1,layer:'o'}),
  // low fire running along a floor path (the painted strip repeats along it)
  gf:m({tex:'v3_groundfire',texO:{repeat:true},nz:'wisp',n1:[1,.5,0,-1.2],n2:[1.2,.9,.05,-.9],dist:.07,mdist:1,nk:.35,ero:.1,soft:.35,fd:[0,0,0,.12],rk:[.55,1.15],gain:2.4,bgain:1.05,op:.5}),
  // a jet of fire: nozzle at u=0, billowing wide at u=1
  fc:m({...k.art,tex:'v3_flame_cone',layer:'o',nz:'wisp',n1:[1.4,1,-1.5,0],n2:[1.3,1,-1,.05],dist:.06,mdist:1,nk:.3,rk:[.55,1.2]}),
  // separate ribbons of a whirlwind with black between them
  vx:m({...k.art,tex:'v3_vortex_wisps',layer:'o',nz:'wisp',n1:[1.5,1,-.9,-.5],n2:[1.4,1,-.7,-.5],dist:.05,mdist:1,nk:.25,rk:[.5,1.15]}),
  // comet tail (its head flare is at u=1): fire streaming back, and the black-crimson smoke it drags
  ct:m({...k.art,tex:'v3_comet_tail',layer:'o',nz:'streak',n1:[1.5,1,1.8,0],n2:[1.4,1,1.1,.05],dist:.05,mdist:1,nk:.3,rk:[.55,1.2]}),
  ctS:m({...k.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[1.5,1,.7,0],n2:[1.3,1,.5,.04],dist:.07,mdist:1,nk:.4,pw:.7,ero:.12,soft:.4,cA:'#000000',cB:'#140202',cC:'#3c0a04',rk:[.5,1.1],op:1,gain:1,bgain:1}),
  // crater: the hole and its ejecta in soot, the molten cracks inside it
  crtD:m({tex:'v3_crater',nk:0,pw:.6,ero:.08,soft:.45,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  crtE:m({tex:'v3_crater',nz:'cells',n1:[3,3,.01,.008],nk:.45,pw:1.7,ero:.16,soft:.3,rk:[.55,1.2],gain:2.6,bgain:1.2,layer:'g'}),
  // a card of dark smoke
  smk:m({...k.art,tex:'fx3_smoke',layer:'o',nz:'billow',n1:[1.5,1.5,.05,-.12],n2:[1.2,1.2,.03,-.1],dist:.05,mdist:1,nk:.3,op:1,cA:'#080505',cB:'#180b08',cC:'#48241a',rk:[.3,1],gain:1,bgain:1}),
  // the dragon's head as a shape in the floor: glowing (omen) and charred (what it leaves)
  dHg:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ff3a10',cC:'#ffc040',gain:1,op:0,layer:'g'}),
  dHk:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[3,3,.02,.01],cB:'#0c0403',cC:'#ff7a20',gain:1,op:1,layer:'g'}),
  // a soft shadow band on the floor (under a flying body)
  shd:m({pm:[2,1.1,0,0],nk:0,ero:0,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  // the dragon's scales charred into the floor, embers at the edges of the burn
  dBk:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[5,1.2,.01,0],cB:'#4a1a0c',cC:'#ff7a20',gain:1,op:1,layer:'g'}),
  // the scar a walking whirl leaves: a charred, ember-veined track
  arm:m({nz:'cells',n1:[9,1.4,.01,0],n2:[3,1,0,0],dist:.03,nk:.85,pw:1.3,ero:.04,soft:.25,pm:[2,1.1,0,0],cA:'#000000',rk:[.45,1.15],op:1,layer:'g'}),
  dC:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[3,1,0,0],cB:'#ff3008',cC:'#ffb040',gain:1,op:0,layer:'g'}),
}; return MT; }

// ---------------------------------------------------------------- local pieces
// SCORCH: the floor burnt where fire stood. o: {life, pal, heat}
function scorch(x,y,r,o={}){ if(!F.on) return; const m=mats(), P=o.pal||PF, life=o.life||4, rot=rand(0,TAU), sd=rand(0,9), hk=o.heat??1, sp=o.spread||0;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,2.2)*hk, out=sat((1-k)/.3), rr=r*(.65+.35*i)*(1+sp*eo3(sat(t/2.6)));
    F.quad(m.sc,x,y,rr,rr,rot,{cB:'#e03a04',cC:P.s,a:.92*out,bgain:1.5*heat,gain:2.4*heat,t0:sd}); },o.delay||0); }

// CRATER: where something huge went into the floor: soot, ejecta rays, molten cracks cooling from the rim inward. o: {life, pal}
function crater(x,y,r0,o={}){ if(!F.on) return; const m=mats(), C=col(o.pal||PF), life=o.life||5, rot=rand(0,TAU), sd=rand(0,9), sp=o.spread||0;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,1.6), out=sat((1-k)/.25), r=r0*(1+sp*eo3(sat(t/2.6)));
    F.quad(m.crtD,x,y,r,r,rot,{a:.92*out,rv:[i*1.45,.3,0,.1]});
    F.quad(m.crtE,x,y,r,r,rot,{...C,a:Math.min(1,heat*1.5),gain:2.6*(.35+.65*heat),bgain:1.2*(.45+.55*heat),ero:.16+.5*(1-heat),rv:[i*1.45*(1.02-.4*k),.3,0,.1],t0:sd}); },o.delay||0); }

// FIRELINE: flames standing on a floor path for a while (what a dash, a ring or a dragon leaves burning). pts: [{x,y,h?}]
function fireLine(pts,o={}){ if(!F.on) return; const m=mats(), P=o.pal||PF, C=col(P), CG=col(PG), dur=o.dur||2, h=o.h||150, sd=rand(0,9), g=o.gain||1, tin=o.in??.14, tout=o.out??.5, nt=o.tongues||0;
  GFX.add(dur,(k,t)=>{ const up=eo3(sat(t/tin)), f=sat(1-(dur-t)/tout), a=1-f*f, hh=h*up*(1-.35*f)*(1+.06*Math.sin(t*13+sd));
    F.wall(m.gf,pts,{h:hh,...C,a,gain:2.4*g,ero:.1+f*.6,ulen:h*3.2,uvT:[1,1,sd,0],t0:sd});
    if(!F.low) F.wall(m.gf,pts,{h:hh*.6,...CG,a:a*.9,gain:2.6*g,ero:.2+f*.6,ulen:h*2.1,uvT:[1,1,sd+.4,0],t0:sd+2});
    for(let q=0;q<nt;q++){ const u=(q+.5)/nt*(pts.length-1), i0=Math.floor(u), fr=u-i0, A_=pts[i0], B_=pts[Math.min(pts.length-1,i0+1)], fs=hh*(.62+.2*Math.sin(q*2.4+sd)+.07*Math.sin(t*9+q)); tongue(mix(A_.x,B_.x,fr),mix(A_.y,B_.y,fr),0,fs,0,-1,{...C,a,t0:sd+q,ero:.12+f*.6,gain:2.3*g}); } },o.delay||0); }
const ringPts=(x,y,r,n=32,ky=FSY)=>{ const p=[]; for(let i=0;i<=n;i++){ const b=i/n*TAU; p.push({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*ky,bx:Math.cos(b),by:Math.sin(b)*ky}); } return p; };

// RINGFIRE: a wall of flame racing outward over the floor from a point: a true curved wall (it leans outward and is graded tall
// behind, low in front, so its sides never go edge-on and its middle stays readable), black smoke rolling behind it.
//  o: {r0, r, h, dur, pal, gain, lean, hb, hf, smoke (0 = none)}
function ringFire(x,y,o={}){ if(!F.on) return; const km=K.mats(), P=o.pal||PF, C=col(P), R0=o.r0||60, R1=o.r||500, dur=o.dur||.5, h=o.h||220, sd=rand(0,9), g=o.gain||1, ln=1+(o.lean??.2), lh=[o.hb??1.15,o.hf??.5];
  GFX.add(dur,(k)=>{ const e=eo3(k), r=mix(R0,R1,e), f=sat((k-.55)/.45), a=1-f*f*f, hh=h*(.5+.5*sat(k*6))*(1-.3*f), ur=Math.max(2,Math.round(TAU*r/(h*2.4)));
    if(o.smoke!==0&&!F.low) F.lathe(km.waS,x,y,0,{r0:r*1.03,r1:r*1.03*ln,h0:0,h1:hh*1.22,lh,a:a*.85,ero:.1+f*.5,uvT:[ur,1,sd+.5,0],fd:[0,0,0,.3],t0:sd,ord:-1});
    F.lathe(km.waB,x,y,0,{r0:r,r1:r*ln,h0:0,h1:hh,lh,...C,a,gain:2.4*g,ero:.12+f*1.1,uvT:[ur,1,sd,0],fd:[0,0,.04+f*.5,.35],t0:sd});
    F.lathe(km.waC,x,y,0,{r0:r*.985,r1:r*.985*ln,h0:0,h1:hh*.6,lh,...C,a:a*(1-f),gain:2.8*g,ero:.25+f*1.1,uvT:[ur*2,1,sd+.37,0],fd:[0,0,f*.5,.5],t0:sd}); },o.delay||0); }

// WHIRL: a column of fire turning on the floor: bands of flame wound round a bent funnel, the painted funnel and its separate ribbons
// (both flipping, so it turns), a ring of dust and a skirt of flames at its foot, a dark crown of smoke where the fire ends.
// Returns a handle {x,y,s,a,lean,dead}; move it every frame.
//  o: {s, h, r, dur, in, out, pal, light, gain, flip, rate (turning speed), sway, eye (the foot stands behind whoever is at x,y)}
function whirl(x,y,o={}){ const h={x,y,s:o.s||1,a:1,lean:0,dead:false,L:null}; if(!F.on) return h; const m=mats(), km=K.mats(), P=o.pal||PF, C=col(P), CD=col(PD), CG=col(PG), dur=o.dur||4, tin=o.in??.3, tout=o.out??.35, H0=o.h||640, R0=o.r||165, sd=rand(0,9), g=o.gain||1, M2=new Float32Array(IDENT), sk=ringPts(0,0,1,14), fl0=o.flip?1:0, fr=o.rate||1, sw=o.sway??1, tp=o.top??1;
  if(o.light!==0) h.L=GFX.light(x,y,R0*h.s*3.6,P.l,o.light??.8,.3,{hold:dur-.3,z:140,flick:.18});
  GFX.add(dur,(k,t)=>{ if(h.dead){ if(h.L){ h.L.hold=0; h.L=null; } return; } const i=eo3(sat(t/tin)), out=sat((dur-t)/tout), a=h.a*out, f=1-out, s=h.s, Hh=H0*s*(.12+.88*i)*(1+.03*Math.sin(t*11+sd)), R=R0*s*(.3+.7*i)*(1+f*.35);
    // it bends and sways
    const s2=h.lean*1.6+Math.sin(t*2.9*fr+sd)*.13*sw; M2[8]=s2; const tx=s2*Hh*.5, flp=q=>((Math.floor(t*q*fr+sd)+fl0)&1)?[-1,1,1,0]:[1,1,0,0];
    if(h.L){ h.L.x=h.x; h.L.y=h.y; h.L.r=R0*s*3.6; }
    if(o.eye){ const re=R*.64, lh=[1.15,.3], fy=h.y-R*.44;
      // the foot stands on the floor just behind him: dust rolling round it, the floor lit under it
      if(!F.low) F.quad(km.shDu,h.x,fy,R*1.5,R*1.5,t*2+sd,{a:.6*a,ero:.2+f*.5,t0:sd});
      F.quad(km.glowG,h.x,fy,R*1.05,R*1.05,0,{...CG,a:.8*a,gain:1.4});
      F.lathe(km.waB,h.x,h.y,0,{r0:re,r1:re*1.16,h0:0,h1:Hh*.3,lh,...CD,a:a*.9,gain:2.2*g,ero:.12+f*.6,uvT:[5,1,sd+t*.55,0],fd:[0,0,.03,.35],t0:sd});
      F.lathe(m.whB,h.x,fy,0,{r0:R*.14,r1:R*1.05,h0:0,h1:Hh,M:M2,...CD,a:a*.75,gain:1.5*g,ero:.24+f*.6,fd:[0,0,.06,.35],t0:sd+4});
      F.bill(m.vx,h.x+tx*.5,fy,Hh*.5,Hh*.3,Hh*.52,0,{...CG,a:a*.95,gain:2.5*g,ero:.12+f*.6,nk:.25+f*.5,t0:sd+2,uvT:flp(11)});
      F.bill(m.tor,h.x+tx*.55,fy,Hh*.52,Hh*.37,Hh*.55,0,{...C,a:a*.95,gain:2.3*g,ero:.14+f*.6,nk:.35+f*.5,t0:sd,uvT:flp(8)});
      if(!F.low) F.bill(m.smk,h.x+tx,fy,Hh*1.02,R*1.5,R*.9,0,{a:.75*a*i,ero:.25+f*.5,t0:sd+5,uvT:flp(3)});
      return; }
    // foot: a ring of dust rolling round it, the floor lit under it
    if(!F.low) F.quad(km.shDu,h.x,h.y,R*1.75,R*1.75,t*1.6*fr+sd,{a:.6*a,ero:.2+f*.5,t0:sd});
    F.quad(km.glowG,h.x,h.y,R*1.25,R*1.25,0,{...C,a:.6*a,gain:1.1});
    F.lathe(m.whB,h.x,h.y,0,{r0:R*.22,r1:R,h0:0,h1:Hh,M:M2,...C,a:a*tp,gain:1.7*g,ero:.2+f*.6+(1-tp)*.25,fd:[0,0,.12,.35+(1-tp)*.4],t0:sd+4});
    F.bill(m.vx,h.x+tx*.8,h.y,Hh*.5,Hh*.27,Hh*.5,0,{...CG,a:a*.8*tp,gain:1.9*g,ero:.14+f*.6,nk:.25+f*.5,t0:sd+2,fd:[0,0,0,(1-tp)*1.6],uvT:flp(11)});
    F.bill(m.tor,h.x+tx,h.y,Hh*.53,Hh*.37,Hh*.55,0,{...C,a:a*(.6+.4*tp),gain:2.3*g,ero:.14+f*.6+(1-tp)*.2,nk:.35+f*.5,t0:sd,fd:[0,0,0,(1-tp)*1.8],uvT:flp(8)});
    // the skirt: low flames in a ring round its foot; the crown: dark smoke where the fire ends
    const rs=R*.62; for(const p of sk){ p.x=h.x+p.bx*rs; p.y=h.y+p.by*rs; } if(!F.low) F.wall(km.waB,sk,{h:R*.8,...CD,a:a*.9,gain:2*g,ero:.14+f*.6,uvT:[3,1,sd+t*.9*fr,0],t0:sd});
    if(!F.low) F.bill(m.smk,h.x+tx*2,h.y,Hh*1.0,R*1.35,R*.8,0,{a:.7*a*i,ero:.25+f*.5,t0:sd+5,uvT:flp(3)});
    if(Math.random()<.55*(GFX.QK||1)){ const b=rand(0,TAU), rr=R*rand(.3,.9); GFX.pt({x:h.x+Math.cos(b)*rr,y:h.y+Math.sin(b)*rr*FSY,z:rand(10,Hh*.5),vx:-Math.sin(b)*rand(300,700)*s,vy:Math.cos(b)*rand(200,400)*s,vz:rand(300,900),g:-200,drag:1.4,life:rand(.4,.9),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?P.h:P.s),c2:P.b,L:3}); }
    if(Math.random()<.3*(GFX.QK||1)){ const b=rand(0,TAU); GFX.pt({x:h.x+Math.cos(b)*R*1.1,y:h.y+Math.sin(b)*R*1.1*FSY,z:rand(4,40),vx:-Math.sin(b)*rand(160,360),vy:Math.cos(b)*rand(90,200),vz:rand(40,200),g:-40,drag:.8,life:rand(.5,1.1),s:rand(3,6),m:8,c:GFX.rgb(P.s),fade:'in',L:3}); } },o.delay||0);
  return h; }

// TONGUE: one painted flame whose root sits at a point in the air and whose tip streams along a screen direction (ux right, uy down)
function tongue(x,y,z,s,ux,uy,o){ const m=mats(); F.bill(m.fire,x+ux*s*.86,y,z-uy*s*.86,s*(o.wk||.56),s,Math.atan2(ux,-uy),{pm:[4,.5,.004,0],nk:.4,ero:.12,gain:2.6,...o}); }

// TAIL: the painted comet tail laid behind a moving point: smoke, fire, a gold heart. (ux,uy) = unit screen heading, L = length, w = half width
function tail(x,y,z,ux,uy,L,w,sd,a=1){ const m=mats(), th=Math.atan2(uy,ux), hl=L/2, cx=x-ux*hl*.88, cz=z+uy*hl*.88;
  if(!F.low) F.bill(m.ctS,cx-ux*hl*.2,y,cz+uy*hl*.2,hl*1.2,w*1.45,th,{a:.75*a,t0:sd});
  F.bill(m.ct,cx,y,cz,hl,w,th,{...col(PF),a,gain:2.5,ero:.1,t0:sd});
  F.bill(m.ct,cx+ux*hl*.34,y,cz-uy*hl*.34,hl*.66,w*.6,th,{...col(PG),a:.95*a,gain:2.9,ero:.14,t0:sd+3}); }
// COMET: the look of a fire projectile - a gold heart, the painted tail of fire and smoke behind it, embers, its light on the floor. Reads p every frame.
function comet(p,o={}){ if(!F.on) return; const km=K.mats(), s=o.s||64, sd=rand(0,9), z=o.z??BODY*.6, CG=col(PG), Lt=GFX.light(p.x,p.y,s*7,PF.l,.75,.18,{hold:p.life,z});
  GFX.add(p.life+.05,(k,t)=>{ if(p.life<=0){ Lt.hold=0; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, i=sat(t/.1); Lt.x=p.x; Lt.y=p.y;
    tail(p.x+ux*s*.3,p.y,z-uy*s*.3,ux,uy,s*5.2*(.3+.7*i),s*1.05,sd);
    F.bill(km.glowO,p.x,p.y,z,s*.6,s*.6,0,{...CG,a:1,gain:2.6});
    if(Math.random()<.5) GFX.pt({x:p.x,y:p.y,z:z+rand(-20,20),vx:-ux*rand(60,300)+rand(-80,80),vy:-uy*rand(60,300)+rand(-50,50),vz:rand(-40,160),g:-60,drag:1,life:rand(.25,.55),s:rand(2.5,5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); }); }

function launch(x,y,R,p=1){ for(const e of V.en){ if(e.dead) continue; const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy)||1; if(l>R) continue; e.stun=Math.max(e.stun||0,.6); e.flash=1; if(!e.d.heavy){ e.vz=Math.max(e.vz||0,rand(900,1600)*p); e.kx+=dx/l*rand(500,900)*p; e.ky+=dy/l*rand(350,650)*p; } } }
// a fire explosion on a floor point (s 1 = a fireball going off)
function blast(x,y,s=1,o={}){ const big=s>=1.2, R=150*s; K.burst(x,y,{s:R,pal:PF,z:o.z||0,smoke:o.smoke??(big?2:1),no:o.no||(s>=2?[]:big?['crack']:['crack','debris']),scar:4}); if(o.scorch!==0) scorch(x,y,R*1.2,{life:big?4.5:2.8}); }
function fireball(x0,y0,a,d,o={}){ const sp=o.sp??1500, p={x:x0,y:y0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:o.life??1,d,r:o.r??80,home:o.home,turn:o.turn??5,c:C1,pw:1.1};
  comet(p,{s:o.big?96:74});
  p.onHit=(e,p)=>{ p.hitAny=true; blast(p.x,p.y,o.big?1.4:.8); sfx('fire',.4,.4); inCircle(p.x,p.y,o.big?220:140,q=>{ if(q!==e) dmg(q,d*.5,{kb:.8,sx:p.x,sy:p.y}); }); };
  p.onEnd=p=>{ if(!p.hitAny) blast(p.x,p.y,.7); };
  V.pj.push(p); return p; }

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
  py_ult1:{cls:'pyro',type:'ult',name:'파이어 스톰',lv:3,desc:'궁극기. 불의 회오리와 화염구를 화면 가득 일으킨 뒤 한꺼번에 폭발시킨다.'},
  py_ult2:{cls:'pyro',type:'ult',name:'드래곤 블레이즈',lv:12,desc:'궁극기. 불꽃의 용이 화면을 휘감아 돌다가 적 한가운데로 내리꽂힌다.'},
};
const order=Object.keys(sk);

// basic: a small comet of fire that homes and bursts
function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); push(true); const n=1+Math.floor((L('py_basic')+1)/2), d=1500*A.mul('py_basic');
  after(.2,()=>{ const hx=pl.x+Math.cos(a)*60, hy=pl.gy+Math.sin(a)*60; K.flare(hx,hy,BODY*.6,{pal:PG,s:70,dur:.14,gain:2.4});
    for(let k=0;k<n;k++) after(k*.08,()=>fireball(hx,hy,a+(k-(n-1)/2)*.3,d,{home:e,life:1.2})); sfx('fireball',.8); });
  return true; }

const SKILL={
  // FLAME DASH: he goes as a streak of fire; the line he crossed stays alight
  py_dash:{moves:true,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+120), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, T=EVO(id)?4:2; face(a); push();
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.12}; G.inv=Math.max(G.inv,.35); sfx('fire',.8,.6);
    const tp=[], fp=[]; for(let i=0;i<=8;i++){ const u=i/8; tp.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z:BODY*.5}); fp.push({x:mix(x0,x1,u)+rand(-8,8),y:mix(y0,y1,u)+rand(-6,6)}); }
    K.trail(tp,{w:118,dur:.46,pal:PF,draw:.1,hold:.08}); K.trail(tp,{w:44,dur:.32,pal:PG,draw:.1,gain:1.2});
    fireLine(fp,{h:190,dur:T,in:.2,out:.6,tongues:Math.max(4,Math.round(Ld/80))}); K.gash(x0,y0,x1,y1,{pal:PF,life:T+1.2,w:96,grow:.12});
    GFX.light((x0+x1)/2,(y0+y1)/2,Math.max(520,Ld*1.2),PF.l,1,.5,{hold:T-.4,z:120,flick:.2});
    K.flame(x0,y0,{s:230,dur:.5,pal:PF,light:0}); K.shock(x0,y0,{r:280,dur:.32,pal:PF,gain:.7,light:0,painted:0,dust:0}); K.dust(x0,y0,{n:8,dir:a+PI,spread:.7,sp:[220,620],a:.4});
    if(F.on) GFX.add(.2,k=>tail(mix(x0,x1,eo3(k))+Math.cos(a)*60,mix(y0,y1,eo3(k)),BODY*.5-Math.sin(a)*60,Math.cos(a),Math.sin(a),Math.max(420,Ld*.9),150,3,1-k*k));
    K.debris((x0+x1)/2,(y0+y1)/2,{n:8,r:Ld*.4,sp:[150,600],up:900,size0:6,size:16}); for(let i=0;i<3;i++) K.smoke(mix(x0,x1,.2+i*.3),mix(y0,y1,.2+i*.3),{s:rand(120,170),z:0,dur:rand(1.2,1.7),delay:.25+i*.1,a:.5,rise:70,c:'#140c0a',c2:'#3c2620'});
    after(.1,()=>{ K.burst(x1,y1,{s:150,pal:PG,z:BODY*.2,smoke:0,no:['crack','debris','smoke']}); scorch(x1,y1,190,{life:T+.8}); K.upheave(x1,y1,{r:110,n:5,s:130,a0:a-1.1,a1:a+1.1,pal:PF,dur:1}); K.sparks(x1,y1,BODY*.5,{pal:PF,n:16,dir:a,spread:.9,sp:[400,1500],up:500}); });
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,70,o=>{ dmg(o,d*.35,{kb:.2}); hitFx(o,C1,.8); })});
    after(.06,()=>inLine(x0,y0,x1,y1,80,o=>{ dmg(o,d,{kb:.8,sx:x0,sy:y0}); hitFx(o,C1,1.1); })); }},
  // FIRE PILLAR: the floor under three of them glows, then a column of fire stands up through each
  py_pillar:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?5:3, d=D(id); push(); sfx('fire',.9,.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.15+i*.1,()=>{ const x=e.x, y=e.y;
      K.shock(x,y,{r0:190,r:36,dur:.16,pal:PF,gain:.7,light:0,dust:0,haze:0,th:.6}); GFX.light(x,y,360,PF.l,.7,.2);
      after(.15,()=>{ K.pillar(x,y,{r:50,h:760,dur:.42,pal:PD,gain:.55}); K.flame(x,y,{s:430,dur:.75,pal:PF,light:0}); K.flame(x,y,{s:250,dur:.6,pal:PG,light:0}); K.art(x,y,{tex:'v3_xburst',s:150,z:20,dur:.2,pal:PG,hold:.15,s0:.5});
        K.shock(x,y,{r:230,dur:.32,pal:PF,gain:.8,light:0}); scorch(x,y,170,{life:3}); K.upheave(x,y,{r:90,n:4,s:120,a0:PI*1.05,a1:PI*1.95,pal:PF,dur:.9}); K.debris(x,y,{n:5,r:50,sp:[200,600],up:1100,size0:6,size:16}); K.sparks(x,y,20,{pal:PF,n:12,sp:[150,600],up:1500,life:[.3,.7]}); K.dust(x,y,{n:6,r:40,sp:[200,480],a:.35});
        trauma=Math.min(1,trauma+.15); sfx('fire',.5,.5);
        inCircle(x,y,150,o=>{ dmg(o,d,{kb:.3,launch:1200,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); })); }},
  // FLAME RING: a wall of fire leaves him in every direction
  py_ring:{fn(id){ if(countIn(480)<4&&!nearest(250)) return false; const d=D(id); raise();
    const wave=k=>{ const x=pl.x, y=pl.gy; ringFire(x,y,{r0:70,r:560,h:230,dur:.52,gain:k?.85:1,smoke:k?0:1}); K.shock(x,y,{r:620,dur:.5,pal:PF,gain:.9}); GFX.ripple(x,y,640,{life:.45,s:.6});
      K.art(x,y,{tex:'v3_spin_ring',floor:true,s:330,dur:.4,pal:PG,gain:.8,hold:.2,s0:.35,rot:rand(0,TAU)}); K.sparks(x,y,40,{pal:PF,n:18,sp:[500,1500],up:420,life:[.25,.55]}); sfx('fire',1,.8);
      if(!k){ fireLine(ringPts(x,y,535,30),{h:150,dur:1.1,in:.12,out:.6,delay:.34,pal:PD,tongues:10}); K.upheave(x,y,{r:300,n:6,s:120,a0:PI*1.05,a1:PI*1.95,pal:PF,dur:.9,delay:.12}); K.embers(x,y,520,{pal:PF,n:22,life:1.5}); for(let q=0;q<5;q++){ const b=q/5*TAU+rand(0,1); scorch(x+Math.cos(b)*500,y+Math.sin(b)*500*FSY,rand(90,130),{life:2,delay:.3}); } }
      [0,.1,.2,.3].forEach((t,i)=>after(t,()=>{ const r=160+i*120; inCircle(pl.x,pl.gy,r,o=>{ if((o.ringT||0)>RT) return; o.ringT=RT+.5; dmg(o,d*(k?.6:1),{kb:1.2}); hitFx(o,C1,1.1); }); })); };
    after(.2,()=>wave(0)); if(EVO(id)) after(.75,()=>wave(1)); }},
  // EXPLOSION: the air over the crowd is drawn to a point, and the point goes off
  py_boom:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); push(); sfx('fireball',1.2);
    K.shock(x,y,{r0:470,r:40,dur:.34,pal:PF,gain:.75,light:0,dust:0,th:.7}); K.flare(x,y,BODY*.4,{pal:PG,s:90,dur:.36,gain:2.2}); GFX.light(x,y,520,PF.l,.7,.4);
    after(.35,()=>{ blast(x,y,2.4,{smoke:3}); ringFire(x,y,{r0:90,r:400,h:210,dur:.45,smoke:0}); K.shock(x,y,{r:700,dur:.6,pal:PF,gain:.7,delay:.06,light:0}); K.embers(x,y,300,{pal:PF,n:16,life:1.6});
      trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
      inCircle(x,y,330,o=>{ dmg(o,d,{kb:1.8,big:true,launch:700,sx:x,sy:y}); hitFx(o,C1,1.4); });
      if(EVO(id)) for(let i=0;i<5;i++) after(.15+i*.1,()=>{ const b=rand(0,TAU), r=rand(150,380), bx=x+Math.cos(b)*r, by=y+Math.sin(b)*r*.75; blast(bx,by,1); inCircle(bx,by,160,o=>dmg(o,d*.4,{kb:.8,sx:bx,sy:by})); }); }); }},
  // FIRE RAIN: burning rocks come down out of the sky, each trailing its own flame
  py_rain:{fn(id){ const T=onScreen(-40); if(!T.length) return false; const n=EVO(id)?12:8, d=D(id); raise(); sfx('fireball',1);
    for(let i=0;i<n;i++) after(.3+i*.1,()=>{ const e=T[(Math.random()*T.length)|0], x=e?e.x+rand(-60,60):pl.x+rand(-500,500), y=e?e.y+rand(-40,40):pl.gy+rand(-400,400), h0=1500, vx=-520, sd=rand(0,9);
      GFX.light(x,y,420,PF.l,.5,.35);
      K.drop(x,y,{img:'meteor',s:70,h0,dur:.35,vx,rot:rand(0,TAU),tint:'#ffd8a8',gain:1.4,land:()=>{ blast(x,y,1.3); sfx('boom',.9,.5); inCircle(x,y,190,o=>{ dmg(o,d,{kb:1,launch:400,sx:x,sy:y}); hitFx(o,C1,1.1); }); }});
      if(F.on){ const km=K.mats(), ln=Math.hypot(vx,h0), ux=-vx/ln, uy=h0/ln; GFX.add(.35,k=>{ const q=k*k, z=h0*(1-q)+70, px=x+vx*(1-q), al=sat(k*8);
          tail(px+ux*50,y,z-uy*50,ux,uy,620,112,sd,al); F.bill(km.glowO,px,y,z,110,110,0,{...col(PF),a:.55*al,gain:1.5}); }); } }); }},
  // FLAME THROWER: two seconds of a fan of fire from his hand
  py_breath:{fn(id){ const e=nearest(520); if(!e) return false; const flat=b=>{ const c=Math.cos(b)>=0?0:Math.PI, d=Math.atan2(Math.sin(b-c),Math.cos(b-c)); return c+clamp(d,-.6,.6); }; let a=flat(angTo(e)); const d=D(id), R=EVO(id)?640:520, half=EVO(id)?.55:.42; face(a);
    S([['gb03',.05],['gb05',.05],['gb06',2,{kick:[1.2,-1]}],['gb10',.08],['gb12',.06]]); sfx('fire',2,.8);
    if(F.on){ const m=mats(), km=K.mats(), C=col(PF), CG=col(PG), sd=rand(0,9), dur=2, Lt=GFX.light(pl.x,pl.gy,R*1.3,PF.l,.95,.3,{hold:dur,z:90,flick:.25}), wk=Math.tan(half)*.8;
      // the painted jet, laid from his hand along the aim: a red-orange body, a gold heart, both flickering
      GFX.add(dur+.25,(k,t)=>{ const i=eo3(sat(t/.22)), out=sat((dur+.25-t)/.25), f=1-out, J=pl.j, ox=J&&J.rh?J.rh[0]:pl.x+pl.f*50, z=J&&J.rh?Math.max(40,pl.gy-J.rh[1]):BODY*.55, mx=pl.x+Math.cos(a)*R*.55, my=pl.gy+Math.sin(a)*R*.55, ca=Math.cos(a), sa=Math.sin(a);
        Lt.x=mx; Lt.y=my; F.quad(km.glowG,mx,my,R*.62,R*.5,0,{...C,a:.8*out*i,gain:1.3});
        const L1=R*1.14*(.25+.75*i)*(1+.04*Math.sin(t*21)), L2=L1*.62, fl=(Math.floor(t*12)&1)?[1,-1,0,1]:[1,1,0,0], fl2=(Math.floor(t*12+.5)&1)?[1,-1,0,1]:[1,1,0,0];
        F.bill(m.fc,ox+ca*L1*.5,pl.gy,z-sa*L1*.5,L1*.5,L1*wk,a,{...C,a:out,gain:2.5,ero:.1+f*.6,t0:sd,uvT:fl});
        F.bill(m.fc,ox+ca*L2*.5,pl.gy,z-sa*L2*.5,L2*.5,L2*wk*.8,a,{...CG,a:out,gain:2.9,ero:.16+f*.6,t0:sd+3,uvT:fl2});
        F.bill(km.glowO,ox,pl.gy,z,64,64,0,{...CG,a:out,gain:2.6});
        if(out>=1) for(let q=0;q<2;q++){ const b=a+rand(-half,half)*.8, sp=rand(700,1300); GFX.pt({x:ox,y:pl.gy,z:z+rand(-10,10),vx:Math.cos(b)*sp,vy:Math.sin(b)*sp,vz:rand(-40,200),g:-120,drag:1.5,life:rand(.3,.6),s:rand(2.5,5),m:3,len:.04,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } }); }
    V.zones.push({follow:true,r:0,life:2,tick:.1,onTick:()=>{ const t=nearest(R+60); if(t){ const b=flat(angTo(t)); a+=Math.atan2(Math.sin(b-a),Math.cos(b-a))*.25; face(a); }
      if(Math.random()<.3){ const b=a+rand(-half,half)*.7, r=rand(.5,.95)*R; scorch(pl.x+Math.cos(b)*r,pl.gy+Math.sin(b)*r,rand(70,110),{life:1.8}); }
      inSector(pl.x,pl.gy,a,R,half,o=>{ dmg(o,d,{kb:.3}); hitFx(o,C1,.8); }); }}); }},
  // FIRE TORNADO: whirls of fire that hunt for four seconds
  py_tornado:{fn(id){ if(V.zones.some(z=>z.pyt)||countIn(800)<3) return false; const n=EVO(id)?3:2, d=D(id); raise(); sfx('fire',1.6,.7);
    for(let k=0;k<n;k++){ const a=k/n*TAU+rand(0,1), z={pyt:true,x:pl.x+Math.cos(a)*200,y:pl.gy+Math.sin(a)*160,r:170,life:4,tick:.2};
      z.px=z.x; z.py=z.y; const w=whirl(z.x,z.y,{s:.95,h:560,r:170,dur:4.05,in:.35,out:.3}); K.shock(z.x,z.y,{r:260,dur:.3,pal:PF,gain:.6,light:0}); let sc=0;
      GFX.add(4,(kk,t)=>{ const u=sat((z.acc||0)/z.tick), wx=mix(z.px,z.x,u), wy=mix(z.py,z.y,u); w.lean=clamp((w.x-wx)*.02,-.25,.25); w.x=wx; w.y=wy; });
      z.fn=o=>{ dmg(o,d,{kb:.6,stun:.2,sx:z.x,sy:z.y}); hitFx(o,C1,.9); o.pull={x:z.x,y:z.y,s:260}; };
      z.onTick=z=>{ z.px=z.x; z.py=z.y; const t=V.en.filter(o=>!o.dead).sort((p,q)=>Math.hypot(p.x-z.x,p.y-z.y)-Math.hypot(q.x-z.x,q.y-z.y))[0];
        if(t){ const b=Math.atan2(t.y-z.y,t.x-z.x); z.x+=Math.cos(b)*70; z.y+=Math.sin(b)*70; } const hx=z.x-pl.x, hy=z.y-pl.gy, hl=Math.hypot(hx,hy); if(hl>420){ z.x=pl.x+hx/hl*420; z.y=pl.gy+hy/hl*420; }
        if((sc^=1)) scorch(z.x,z.y,150,{life:2.6}); };
      z.onEnd=z=>{ w.dead=true; blast(z.x,z.y,1.2); };
      V.zones.push(z); } }},
  // SUPERNOVA: a small sun is pressed together over his hands, and let go
  py_nova:{fn(id){ const R=EVO(id)?720:560; if(countIn(R)<8) return false; const d=D(id);
    S([['gy01',.1],['gy02',.15],['gy03',.4,{kick:[-.8,.6]}],['gy07',.1,{kick:[-1.4,1]}],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.3],['gy14',.15]]); sfx('rise',1.2,.7);
    const x=pl.x, y=pl.gy, zs=BODY*1.25;
    for(let i=0;i<34;i++) after(i*.018,()=>{ const b=rand(0,TAU), r=rand(300,640); GFX.pt({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*FSY,z:rand(0,300),tx:x,ty:y,tz:zs,pull:rand(5,8),vx:-Math.sin(b)*400,vy:Math.cos(b)*240,life:rand(.35,.55),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
    for(let i=0;i<2;i++) K.shock(x,y,{r0:R*(.9-i*.25),r:50,dur:.36,delay:i*.3,pal:PF,gain:.55,light:0,dust:0,haze:.4,th:.6});
    if(F.on){ const m=mats(), km=K.mats(), sd=rand(0,9), Lt=GFX.light(x,y,700,PG.l,.2,.2,{hold:.75,z:zs}); GFX.ambient(.62,.56,.6,4);
      GFX.add(.78,(k,t)=>{ const e=k*k, s=mix(26,120,e)*(1+.05*Math.sin(t*40)); Lt.a=.3+.9*e; F.quad(km.glowG,x,y,260*e+60,260*e+60,0,{...col(PF),a:.8*e,gain:1.4});
        F.bill(km.glowO,x,y,zs,s*2.1,s*2.1,0,{...col(PF),a:.7,gain:1.6+e}); F.bill(m.sun,x,y,zs,s,s,t*2.2,{...col(PG),gain:2.4+e*1.2,ero:.08,t0:sd}); }); }
    after(.75,()=>{ K.burst(x,y,{s:R*.62,pal:PF,z:0,smoke:3,scar:4.5}); K.art(x,y,{tex:'v3_xburst',s:R*.8,z:zs*.5,dur:.26,pal:PG,gain:1,hold:.15,s0:.5});
      ringFire(x,y,{r0:110,r:R*1.05,h:300,dur:.6}); K.dome(x,y,{r:R*.9,dur:.42,pal:PF,gain:.7}); K.shock(x,y,{r:R*1.5,dur:.7,pal:PF,gain:.8,delay:.08,light:0}); GFX.ripple(x,y,R*1.4,{life:.5,s:.8});
      K.debris(x,y,{n:14,r:120,sp:[300,1100],up:1500,size:20}); K.embers(x,y,R*.8,{pal:PF,n:26,life:2}); scorch(x,y,R*.6,{life:4.5});
      GFX.ambient(1,1,1,2.5); post.ca=.01; trauma=1.3; hitstop=.07; sfx('boom',2.2,1);
      inCircle(pl.x,pl.gy,R,o=>{ dmg(o,d,{kb:2.2,big:true,launch:900}); hitFx(o,C1,1.5); }); }); }},
};

/// ---- ultimates. Each is one staged sequence in the real field: omen -> release -> development -> climax -> afterglow
// FIRE STORM: (close) a cold circle writes itself and grows; four flames light on its rim, each twists up into a small whirl, the circle
// turns to gold. (wide) It catches: four whirls - no two alike - walk out across the field, each leaving a ragged burning scar, while the
// ground erupts between them. They come home and wind into one column standing behind him. The field dims, the column draws in -
// and lets go: one ring of fire racing outward, the floor breaking under it, everything near thrown into the air. The pinwheel stays.
function ultStorm(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, RM=Math.max(hw,hh)*.68, g0=GFX.gain, NW=4, KX=Math.min(1,hw*1.02/RM), KY=1;
  S([['gx01',.1],['gx03',1.5,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',1.9],['gx09',.4],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  // ---- omen (close): something changes every quarter second - the circle grows, flames light, each twists up, the circle turns gold
  GFX.ambient(.3,.32,.46,3.5); const spot=GFX.light(x0,y0,540,'#ff6a1c',.75,.5,{hold:9,z:120,flick:.15});
  const sig=K.sigil(x0,y0,{r:hw*.2,dur:5.9,in:.5,out:.6,spin:.5,pal:PS,tex:CIRC(),hole:.14});
  K.crack(x0,y0,{alt:1,r:330,pal:PF,life:5,grow:1.6});
  Cn.tilt(.1,3); Cn.zoom(1.4); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); Cn.drone(44,.3); Cn.SND.inhale(1.2,.4);
  for(let i=0;i<3;i++) after(.15+i*.38,()=>K.shock(x0,y0,{r0:hw*(.9-i*.12),r:70,dur:.4,pal:i?PF:PS,gain:.45,light:0,dust:0,painted:0,haze:.5,th:.6}));
  for(let i=0;i<50;i++) after(rand(0,1.6),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,360),tx:x0,ty:y0,tz:BODY*.9,pull:rand(4,6.5),life:rand(.45,.7),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*560,vy:Math.cos(a)*330,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
  const tor=[], VAR=[{h:840,r:150,rate:1.3,sway:1.5,pal:PF,ln:.2,top:.75},{h:500,r:235,rate:.8,sway:.6,pal:PD,ln:-.24,top:.85},{h:700,r:180,rate:1,sway:1,pal:PF,ln:-.08,top:.7},{h:600,r:205,rate:1.15,sway:1.25,pal:PG,ln:.26,top:.8}]; let t=0, out=false, home=0, done=false;
  const RC=hw*.4;
  for(let k=0;k<NW;k++){ const a=k/NW*TAU+.4, z={a,x:x0+Math.cos(a)*110*KX,y:y0+Math.sin(a)*110*KY,R0:110,sc:rand(0,.1),n:k,s1:[1.55,1.2,1.4,1.3][k],v:VAR[k],path:[],w:null,cx:x0+Math.cos(a)*RC,cy:y0+Math.sin(a)*RC*FSY}; tor.push(z); const tl=.3+k*.24;
    after(tl,()=>{ K.flame(z.cx,z.cy,{s:170,dur:1.22-tl+.2,pal:PF,light:0}); K.sparks(z.cx,z.cy,20,{pal:PF,n:8,sp:[100,420],up:800,life:[.2,.5]}); GFX.light(z.cx,z.cy,380,PF.l,.75,.4); K.shock(z.cx,z.cy,{r:130,dur:.25,pal:PF,gain:.5,light:0,dust:0,haze:0}); if(sig.kick) sig.kick(); Cn.SND.tick(1+k*.1,.25); });
    after(1.18+k*.07,()=>{ whirl(z.cx,z.cy,{s:.42,h:z.v.h,r:z.v.r,rate:z.v.rate*1.3,sway:z.v.sway,pal:z.v.pal,flip:k&1,dur:.82-k*.07,in:.3,out:.16,light:0}); K.sparks(z.cx,z.cy,30,{pal:PF,n:6,sp:[200,600],up:900}); }); }
  after(1.0,()=>{ sig.pal=PG; if(sig.kick) sig.kick(); GFX.light(x0,y0,600,PG.l,.7,.4,{z:100}); });
  after(1.4,()=>{ Cn.zoom(1.55); if(sig.kick) sig.kick(); });
  V.ultTick=dt=>{ t+=dt; sig.r=hw*lerp(.2,.5,easeOut(Math.min(1,t/1.5))); if(!out) return;
    for(const z of tor){ z.a+=dt*(home?2.6:1.25); const R=home?lerp(z.R0,0,Math.min(1,(t-home)/.5)**2):lerp(110,RM,easeOut(Math.min(1,(t-1.9)/1.1))); if(!home) z.R0=R; z.x=x0+Math.cos(z.a)*R*KX; z.y=y0+Math.sin(z.a)*R*KY;
      if(z.w){ z.w.x=z.x; z.w.y=z.y; z.w.s=z.s1*(.4+.6*sat((R-110)/520)); z.w.lean=z.v.ln-Math.sin(z.a)*(home?-.22:.14); if(home) z.w.a=1-.6*Math.min(1,(t-home)/.5); }
      // four whirls carry what six did: the same number of burns a second over the field
      if(Math.random()<.45) inCircle(z.x,z.y,210,o=>ultHit(o,Dm*.12,z.x,z.y));
      // the scar it leaves: its width wanders, and the fire on it stands in ragged tongues with gaps
      if((z.sc+=dt)>.11&&!home){ z.sc=0; const q=z.path.length; z.path.push({x:z.x+rand(-14,14),y:z.y+rand(-10,10),t,w:mix(30,112,.5+.5*Math.sin(q*1.25+z.n*2.1))*rand(.8,1.2),j:Math.random()<.22?.12:rand(.5,1.4)}); } } };
  if(F.on){ const m=mats(); GFX.add(6.3,(k,tt)=>{ if(!tor[0].path.length) return; const heat=t<4.42?.8:Math.max(.08,.8-(t-4.42)/1.1), fade=sat((1-k)/.2);
      for(const z of tor) if(z.path.length>1) F.ribbon(m.arm,z.path,{cB:'#b02804',cC:PF.s,a:.92*fade,bgain:1.3*heat,gain:2*heat,t0:z.n}); },1.82); }
  if(F.on){ const gm=mats().gf, C=col(PF), CDk=col(PD), sd=rand(0,9); GFX.add(9,()=>{ if(done||!tor[0].path.length) return; const blown=sat(1-(t-4.42)/.3); if(blown<=0) return;
      for(const z of tor){ const P_=z.path, n=P_.length; if(n<2) continue; for(const p of P_){ const age=t-p.t; p.h=200*p.j*sat(age/.2)*sat(1.15-(age-1.3)/1.1)*(1+.14*Math.sin(p.t*37+t*9)); }
        F.wall(gm,P_,{...(z.n===1?CDk:C),a:blown,gain:2.4,ero:.1+(1-blown)*.6,ulen:560,uvT:[1,1,z.n*.37,0],t0:sd+z.n});
        for(let i=2;i<n-1;i+=3){ const p=P_[i], dx=P_[i+1].x-P_[i-1].x, dy=P_[i+1].y-P_[i-1].y; if(p.h>40&&Math.abs(dy)>Math.abs(dx)*.9) tongue(p.x,p.y,0,p.h*1.3,0,-1,{...((i+z.n)%2?C:CDk),a:blown,t0:sd+i+z.n,ero:.12+(1-blown)*.6,gain:2.3}); } } }); }
  // ---- release (wide): the circle catches, the four whirls leave the rim and walk out
  after(1.82,()=>{ out=true; sig.pal=PF; if(sig.kick) sig.kick(); spot.hold=0; spot.life=.3; Cn.tilt(.2,5); Cn.zoom(.68); Cn.cam(null); Cn.shake(.8); post.ca=.01; hitstop=Math.max(hitstop,.05); SFX.boom(1.4,.5); Cn.SND.shing(.7,.4);
    GFX.ambient(.42,.35,.38,30); after(.14,()=>GFX.ambient(.3,.31,.44,5));
    K.shock(x0,y0,{r:hw*1.3,dur:.55,pal:PF,gain:.75,light:.7}); GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7});
    ringFire(x0,y0,{r0:100,r:420,h:190,dur:.45,smoke:0}); K.sparks(x0,y0,BODY*.6,{pal:PF,n:36,sp:[500,1900],up:900}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,800],up:1000});
    for(const z of tor) z.w=whirl(z.x,z.y,{s:z.s1*.4,h:z.v.h,r:z.v.r,rate:z.v.rate,sway:z.v.sway,pal:z.v.pal,top:z.v.top,flip:z.n&1,dur:2.6,in:.4,out:.25}); });
  // ---- development: the field erupts between the whirls, each eruption leaving its smoke
  for(let i=0;i<16;i++) after(2.1+i*.1,()=>{ const x=x0+rand(-hw,hw)*.9, y=y0+rand(-hh,hh)*.85, sz=rand(.75,1.3);
    K.art(x,y,{tex:BF(),s:210*sz,asp:BFA(),z:-40,dur:.5,pal:i%3?PF:PG,gain:1,hold:.25,s0:.4,rot:rand(-.5,.5),flip:i&1}); K.flame(x,y,{s:rand(260,380)*sz,dur:.6,pal:i%2?PF:PD,light:0}); if(i%2===0) K.smoke(x,y,{s:230*sz,dur:1.2,delay:.2,a:.6,c:'#140c0a',c2:'#3a221a'});
    K.sparks(x,y,30,{pal:PF,n:10,sp:[300,1100],up:900,life:[.3,.7]}); GFX.light(x,y,700*sz,PF.l,.9,.4,{z:120});
    sfx('boom',.8,.4); Cn.shake(.3); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  // ---- they come home and wind into one, standing on the floor behind him (this is the announcement: .67 s before it lets go)
  after(3.75,()=>{ home=t; Cn.tilt(.28,4); Cn.zoom(.7); Cn.SND.inhale(.5,.7); GFX.ambient(.3,.3,.4,8); sig.a=1.5;
    for(let i=0;i<2;i++) K.shock(x0,y0,{r0:hw*(1.3-i*.3),r:90,dur:.42,delay:i*.16,pal:PF,gain:.6,light:0,dust:0,painted:0,haze:.6,th:.7});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(500,1100); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,400),tx:x0,ty:y0,tz:300,pull:rand(5,8),life:rand(.4,.6),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*900,vy:Math.cos(a)*520,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } });
  let big=null;
  after(4.1,()=>{ big=whirl(x0,y0,{s:2.9,h:640,r:150,dur:.4,in:.18,out:.08,gain:1.1,light:1.1,eye:true}); Cn.shake(.5); SFX.whoosh(.6,1); K.dust(x0,y0-190,{n:12,r:200,sp:[300,800],a:.5}); });
  // ---- it draws in (.15 s): the field dims, the column narrows, the air and the fire of the arms are pulled to it
  after(4.27,()=>{ GFX.gain=.6; GFX.ambient(.3,.3,.36,40); if(big&&F.on) GFX.add(.15,k=>{ big.s=mix(2.9,1.3,k*k); }); if(sig.kick) sig.kick();
    for(let i=0;i<2;i++) K.shock(x0,y0,{r0:hw*(.9-i*.25),r:70,dur:.15,delay:i*.04,pal:PG,gain:.7,light:0,dust:0,painted:0,haze:.7,th:.8});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(300,900); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,500),tx:x0,ty:y0-130,tz:200,pull:rand(9,14),life:rand(.14,.2),s:rand(3,6),m:3,len:.06,c:GFX.rgb(Math.random()<.5?PG.h:PF.s),c2:PF.b,L:3}); } });
  after(4.36,()=>{ hitstop=Math.max(hitstop,.06); });
  // ---- contact: one frame - the column is gone and ONE ring of fire leaves him, the floor breaks under it, rock stands up behind him,
  // slabs fly, everything near is thrown into the air (and dies there a moment later)
  after(4.42,()=>{ out=false; GFX.gain=g0; for(const z of tor) if(z.w) z.w.dead=true; if(big) big.dead=true; const by=y0-140;
    hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.58); SFX.boom(2.2,1); Cn.SND.hit(1);
    GFX.ambient(.44,.36,.37,40); after(.18,()=>GFX.ambient(.36,.32,.38,3));
    K.flare(x0,by,BODY*1.4,{pal:PB,s:330,dur:.22,gain:2.6}); GFX.light(x0,by,hw*.8,PB.l,.6,.14,{z:300});
    K.art(x0,by,{tex:BF(),s:hw*.62,asp:BFA(),z:60,dur:.34,pal:PG,gain:1.05,hold:.3,s0:.3,rot:rand(-.3,.3)});
    ringFire(x0,y0,{r0:140,r:hw*1.75,h:700,dur:.8,gain:1.15,hf:.4}); K.shock(x0,y0,{r:hw*1.6,dur:.5,pal:PD,gain:.9,light:0,dust:0}); GFX.ripple(x0,y0,hw*2,{life:.55,s:.9});
    K.crack(x0,y0,{alt:1,r:hw*1.0,pal:PF,life:3.4,grow:.12,gain:.7}); K.crack(x0,y0,{alt:1,r:hw*.62,pal:PD,life:5.4,grow:.2,gain:.8,rot:rand(0,TAU)});
    K.debris(x0,y0,{n:34,r:200,sp:[400,1700],up:2000,size0:14,size:36}); K.dust(x0,y0,{n:20,r:140,sp:[600,1500],a:.5}); K.sparks(x0,by,120,{pal:PF,n:60,sp:[700,2600],up:1800,life:[.4,1]}); GFX.light(x0,y0,hw*1.6,PF.l,1.15,.5,{z:300});
    launch(x0,y0,hw*1.3,1); after(.3,()=>Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3})); });
  // ---- aftermath, in layers that end at different times: the burn that keeps spreading, low dark smoke, embers, rubble; no bonfire
  after(4.5,()=>{ scorch(x0,y0,hw*.55,{life:6.2,heat:1.5,spread:.7}); for(let i=0;i<6;i++){ const a=rand(0,TAU), r=rand(hw*.2,hw*.9); scorch(x0+Math.cos(a)*r,y0+Math.sin(a)*r*.75,rand(120,210),{life:rand(2.2,4.2),delay:.1+i*.06,heat:1.3}); } });
  after(4.8,()=>{ for(let i=0;i<6;i++){ const a=rand(0,TAU), r=rand(0,hw*.7); K.smoke(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{s:rand(260,400),z:0,dur:rand(1.5,2.2),delay:i*.07,a:.6,rise:90,c:'#140c0a',c2:'#3c2620'}); }
    K.embers(x0,y0,hw*1.0,{pal:PF,n:70,life:2.6,up:300}); K.debris(x0,y0,{n:10,r:hw*.5,sp:[60,260],up:500,size0:8,size:20}); });
  after(4.95,()=>{ GFX.ambient(.8,.7,.68,1.6); Cn.tilt(0,2.5); Cn.zoom(.95); });
  after(5.35,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); sig.a=.5; });
  after(5.95,()=>{ done=true; GFX.gain=g0; sig.dead=true; for(const z of tor) if(z.w) z.w.dead=true; if(big) big.dead=true; ultStop(); }); }

// DRAGON BLAZE: no circle - the floor splits and glows, and three times a scaled back arches out of the stone and dives under again,
// closer each time. Then it comes up through the floor: crimson scales wrapped in fire and black smoke, gold fire in its jaws. One lap low
// over the field, passing behind him and in front of him, its shadow and its light running under it, its track burning. Its shadow falls
// on the place it has chosen; the field holds its breath; it goes in - rock stands up round the hole, everything near is thrown into the
// air - and what stays is a crater and a dragon burnt into the floor.
function ultDragon(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy, g0=GFX.gain;
  S([['gy01',.12],['gy02',.2],['gy03',.4,{kick:[-.8,.6]}],['gy04',1.1],['gy05',.1],['gy06',.1],['gy07',.12,{kick:[-1.4,1]}],['gy08',.8],['gy09',.8],['gy10',.8],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.6],['gy13',.7],['gy14',9]]);
  const RX=hw*.72, RY=RX*1.16, T0=1.9, TD=2.2, DD=.42, END=TD+DD, ZF=300, N=40, HS=380, HA=900/595, WB=150, LB=3200;
  // ---- omen (close): the floor splits and glows under him, embers wind in, and its back breaches three times
  GFX.ambient(.3,.31,.44,3.5); const spot=GFX.light(x0,y0,820,'#ff4a14',.8,.5,{hold:9,z:140,flick:.25});
  Cn.tilt(.1,3); Cn.zoom(1.3); Cn.cam(x0,y0-BODY*1.4,5); SFX.fire(5,.6); const dr=Cn.drone(41,.4); SFX.rumble(1.7);
  K.crack(x0,y0,{alt:1,r:440,pal:PD,life:4.6,grow:1.5,gain:1.1}); K.crack(x0,y0,{r:210,pal:PG,life:3.6,grow:.9});
  for(let i=0;i<70;i++) after(rand(.05,1.75),()=>{ const a=rand(0,TAU), d=rand(500,1000); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,260),tx:x0,ty:y0,tz:20,pull:rand(2.6,4),life:rand(.6,.9),s:rand(3,6),m:3,len:.06,vx:-Math.sin(a)*820,vy:Math.cos(a)*480,c:GFX.rgb(Math.random()<.4?PG.h:PF.s),c2:PD.b,L:3}); });
  // one arch of its back: out of the floor at A, over, and under again at B, the scales sliding through
  const arch=(ax,ay,bx,by,Hh,dl)=>{ after(dl,()=>{ K.upheave(ax,ay,{r:64,n:4,s:120,a0:PI,a1:TAU,pal:PD,dur:.9}); K.sparks(ax,ay,20,{pal:PF,n:14,sp:[200,900],up:1100}); GFX.light((ax+bx)/2,(ay+by)/2,620,PD.l,1,.5,{z:120}); Cn.shake(.4); SFX.boom(.7,.3); });
    after(dl+.3,()=>{ K.upheave(bx,by,{r:64,n:4,s:120,a0:PI,a1:TAU,pal:PD,dur:.9}); K.sparks(bx,by,20,{pal:PF,n:14,sp:[200,900],up:900}); K.dust(bx,by,{n:6,r:30,sp:[200,500],a:.45}); Cn.shake(.3); });
    if(!F.on) return; const m=mats(), n=14, sd=rand(0,9), P_=[], S_=[], A_=[], ux=bx-ax, uy=by-ay, len=Math.hypot(ux,uy)||1, C=col(PF), CD=col(PD);
    GFX.add(.64,(k,tt)=>{ const s1=sat(tt/.3), s0=sat((tt-.32)/.3); if(s1-s0<.04) return; P_.length=0; S_.length=0; A_.length=0;
      for(let i=0;i<n;i++){ const e=i/(n-1), s=mix(s0,s1,e), w=WB*.6*Math.pow(Math.sin(PI*(.02+.96*e)),.4), x=ax+ux*s, y=ay+uy*s, z=Hh*Math.sin(PI*s); P_.push({x,y,z,w}); S_.push({x,y,z:0,w:w*1.25}); }
      for(let i=n-1;i>=0;i--){ const p=P_[i]; A_.push({x:p.x,y:p.y,z:p.z,w:p.w*2.3}); }
      F.ribbon(m.shd,S_,{a:.55});
      F.ribbon(m.ct,A_,{...CD,gain:2,ero:.1,t0:sd,a:.9});
      for(let i=2;i<n-1;i+=3){ const p=P_[i], tl=Math.hypot(ux/len*.6,uy/len*.6+.8); tongue(p.x,p.y,p.z+p.w*.2,p.w*2.2,-ux/len*.6/tl,(-uy/len*.6-.8)/tl,{...(i%2?C:CD),t0:sd+i,a:.9,gain:2.2}); }
      F.ribbon(m.dB,P_,{ero:-1,a:1,gain:1.25,ulen:LB*.5,uvT:[1,1,(1-s1)*.5+sd*.01,0]}); },dl); };
  [[-2.5,.3,150],[-1.57,.74,180],[-.64,1.18,210]].forEach(([f,dl,Hh])=>{ const r=430; arch(x0+Math.cos(f-.85)*r,y0+Math.sin(f-.85)*r*.8,x0+Math.cos(f+.85)*r,y0+Math.sin(f+.85)*r*.8,Hh,dl); });
  after(1.5,()=>{ Cn.zoom(1.42); K.shock(x0,y0,{r0:hw*.8,r:80,dur:.34,pal:PD,gain:.6,light:0,dust:0,painted:0,haze:.6,th:.7}); });
  // path of the head: floor position and height, lt seconds after it leaves the floor
  const lap=lt=>{ const a=-PI/2+lt*3.0, g=Math.min(1,lt/.45); return [x0+Math.cos(a)*RX*g,y0+Math.sin(a)*RY*g]; }, zl=lt=>ZF*eo3(sat(lt/.35))+Math.sin(lt*6)*38;
  // the dive keeps turning the way the lap turned and winds inward onto the mark (the circle it flies shrinks and slides over to the
  // target), so the body never has to double back on itself; its height swells once and falls away
  const sz=zl(TD), pos=lt=>{ if(lt<=0) return {x:x0,y:y0,z:0}; if(lt<TD){ const [x,y]=lap(lt); return {x,y,z:zl(lt)}; }
    const k=sat((lt-TD)/DD), w=k*(.7+.3*k), a=-PI/2+lt*3.0, g=1-w; return {x:lerp(x0,cx,w)+Math.cos(a)*RX*g,y:lerp(y0,cy,w)+Math.sin(a)*RY*g,z:sz*(1-Math.pow(k,1.8))+1300*k*k*Math.pow(1-k,1.5)}; };
  let t=0, sc=0, fl=0, dive=0, done=false; const trail=[];
  V.ultTick=dt=>{ t+=dt; Cn.shake(t<1.8?.1+t*.1:0);
    if(t<T0) return;
    const lt=t-T0; if(dive||lt>=TD) return; const p=pos(lt);
    // the track it burns: ragged in width, flames standing on it
    if((sc+=dt)>.1){ sc=0; const q=trail.length; trail.push({x:p.x+rand(-20,20),y:p.y+rand(-14,14),t,w:mix(70,170,.5+.5*Math.sin(q*1.1))*rand(.8,1.2),j:Math.random()<.18?.2:rand(.6,1.4)}); }
    if(Math.random()<.35){ V.blast={x:p.x,y:p.y,p:.8}; inCircle(p.x,p.y,270,o=>ultHit(o,Dm*.15,p.x,p.y-BODY)); } };
  // a coil on the floor round a point: from its head end at angle a0 winding back, radius r0 -> r1, a body's width
  const coil=(x,y,r0,r1,a0,turns,n,w)=>{ const o=[]; for(let i=0;i<n;i++){ const u=i/(n-1), a=a0-u*turns*TAU, r=mix(r0,r1,u); o.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:0,w:w*(u<.08?mix(.55,1,u/.08):Math.pow(1-(u-.08)/.92,.7))}); } return o; };
  // the track it flew: a charred scar that stays, and low flames standing on it until the floor takes the dragon back
  if(F.on){ const m=mats(), CD=col(PD), C=col(PF), sd=rand(0,9); GFX.add(8,(k)=>{ const n=trail.length; if(n<2) return; const heat=t<4.52?.8:Math.max(.08,.8-(t-4.52)/1.2), fade=sat((1-k)/.15), burn=done?0:sat(1-(t-4.6)/.5);
      F.ribbon(m.arm,trail,{cB:'#a82404',cC:PF.s,a:.92*fade,bgain:1.3*heat,gain:2*heat});
      if(burn>0){ for(const p of trail){ const age=t-p.t; p.h=260*p.j*sat(age/.2)*sat(1.3-(age-1.1)/1.3)*(1+.14*Math.sin(p.t*37+t*9)); } F.wall(m.gf,trail,{...CD,a:burn,gain:2.4,ero:.1+(1-burn)*.6,ulen:820,t0:sd});
        for(let i=1;i<n-1;i+=3){ const p=trail[i], dx=trail[i+1].x-trail[i-1].x, dy=trail[i+1].y-trail[i-1].y; if(p.h>60&&Math.abs(dy)>Math.abs(dx)*.8) tongue(p.x,p.y,0,p.h*1.25,0,-1,{...(i%2?C:CD),a:burn,t0:sd+i,ero:.12+(1-burn)*.6,gain:2.3}); } } },T0); }
  // ---- the dragon itself: drawn from the path every frame
  if(F.on){ const m=mats(), km=K.mats(), C=col(PF), CD=col(PD), CG=col(PG), sd=rand(0,9), pts=[], sh=[]; let face=true;
    const L1=GFX.light(x0,y0,1350,'#ff6a1c',0,.3,{hold:9,z:280,flick:.12}), L2=GFX.light(x0,y0,980,'#ff3410',0,.3,{hold:9,z:200,flick:.12});
    const shape=u=>u<.1?mix(.72,1,u/.1):Math.pow(Math.max(0,1-(u-.1)/.9),.75), SL=LB/(N-1), SD=.0125, h2=N>>1, UL=h2*SL, far=p=>p.y<y0-30;
    GFX.add(9,()=>{ const lt0=t-T0, gone=Math.max(0,lt0-END)*11000; if(done||gone>LB){ L1.hold=L2.hold=0; return; } if(lt0<=0) return; const lt=Math.min(lt0,END);
      // lay the body along the path the head has flown, at even spacing (so it never stretches); once the head is in the floor the rest pours after it
      pts.length=0; sh.length=0; const i0=Math.ceil(gone/SL); let prev=pos(lt), acc=0, tgt=i0*SL-gone, q=lt;
      for(let i=0;i<i0&&i<N;i++) pts.push({x:prev.x,y:prev.y,z:0,w:0});
      for(let j=1;j<=230&&pts.length<N&&q>0;j++){ q=lt-j*SD; const p=pos(q), d=Math.hypot(p.x-prev.x,(p.y-p.z)-(prev.y-prev.z));
        while(pts.length<N&&d>0&&acc+d>=tgt){ const f=(tgt-acc)/d, i=pts.length, u=i/(N-1), wv=Math.sin(lt0*10-u*8)*28*Math.min(1,u*4); pts.push({x:mix(prev.x,p.x,f),y:mix(prev.y,p.y,f),z:Math.max(0,mix(prev.z,p.z,f)+wv),w:WB*shape(u)*sat((tgt+40)/160)*sat(lt0/.08)}); tgt+=SL; }
        acc+=d; prev=p; }
      while(pts.length<N) pts.push({x:x0,y:y0,z:0,w:0});
      // round the path off where it turns hard (twice over), and thin the body where it still bends tighter than its own width
      for(let pass=0;pass<2;pass++){ let ax=pts[0].x, ay=pts[0].y, az=pts[0].z; for(let i=1;i<N-1;i++){ const p=pts[i], b=pts[i+1], nx=(ax+2*p.x+b.x)/4, ny=(ay+2*p.y+b.y)/4, nz=(az+2*p.z+b.z)/4; ax=p.x; ay=p.y; az=p.z; if(p.w>0&&b.w>0){ p.x=nx; p.y=ny; p.z=nz; } } }
      for(let i=1;i<N-1;i++){ const a=pts[i-1], p=pts[i], b=pts[i+1], ux=p.x-a.x, uy=(p.y-p.z)-(a.y-a.z), vx=b.x-p.x, vy=(b.y-b.z)-(p.y-p.z), ul=Math.hypot(ux,uy)||1, vl=Math.hypot(vx,vy)||1, c=(ux*vx+uy*vy)/(ul*vl); if(c<.8) p.w*=Math.max(.35,.5+.5*c/.8); }
      const hp=pts[0], hq=pts[2], dx=hp.x-hq.x, dy=(hp.y-hp.z)-(hq.y-hq.z), dl=Math.hypot(dx,dy)||1, th=Math.atan2(dy,dx), head=lt0<END, hk=sat(lt0/.25), mid=pts[Math.min(N-1,i0+h2)], live=head?1:sat(1-gone/LB), dv=sat((lt0-TD)/DD);
      if(Math.abs(dx)/dl>.14) face=dx>=0; const right=face;
      L1.x=hp.x; L1.y=hp.y; L1.a=1.25*live; L2.x=mid.x; L2.y=mid.y; L2.a=.9*live*sat(lt/.4);
      // on the floor: the shadow running under the whole of it, and the light it throws down
      for(const p of pts) sh.push({x:p.x,y:p.y,z:0,w:p.w*1.35}); F.ribbon(m.shd,sh,{a:.6*live});
      if(head) F.quad(km.glowG,hp.x,hp.y,720,720,0,{...C,a:.8*hk,gain:1.4});
      if(mid.w>1) F.quad(km.glowG,mid.x,mid.y,520,520,0,{...CD,a:.6,gain:1.2});
      // it passes behind him and in front of him: every stretch of the body is drawn under the figures where it flies beyond him, over them
      // where it flies on this side. The scale strip runs on unbroken (mirrored at the middle), and so do the smoke and the fire it drags.
      for(let a=0;a<N-1;){ const fr=far(pts[a]), hf=a<h2?0:1; let e=a+1; while(e<N-1&&far(pts[e])===fr&&(e<h2?0:1)===hf) e++; const seg=pts.slice(a,e+1), ly=fr?'g':'o', d0=a*SL/UL;
        if(seg[0].w+seg[seg.length-1].w>2){ const rv=seg.slice().reverse(), u0=1-e*SL/LB;
          if(!F.low) F.ribbon(m.ctS,rv.map(p=>({x:p.x,y:p.y,z:p.z+p.w*.5,w:p.w*3.2})),{a:.6*live,t0:sd,ulen:LB,uvT:[1,1,u0,0],layer:ly});
          F.ribbon(m.ct,rv.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*2.5})),{...CD,gain:2.2,ero:.1,t0:sd,a:.95*live,ulen:LB,uvT:[1,1,u0,0],layer:ly});
          for(let i=a+1;i<e;i+=3){ const p=pts[i], pq=pts[Math.min(N-1,i+2)], bx=pq.x-p.x, by=(pq.y-pq.z)-(p.y-p.z), bl=Math.hypot(bx,by)||1; if(p.w<8||i>N-6) continue; const tx_=bx/bl*.75, ty_=by/bl*.75-.66, tl=Math.hypot(tx_,ty_)||1; tongue(p.x,p.y,p.z+p.w*.2,p.w*(2.5-i*.03),tx_/tl,ty_/tl,{...(i%2?C:CD),t0:sd+i,a:.9*live,gain:2.2,layer:ly}); }
          F.ribbon(m.dB,seg,{ero:-1,a:live,gain:1.25,ulen:UL,uvT:hf?[-1,1,2-d0,0]:[1,1,d0,0],layer:ly}); }
        a=e; }
      // the head, and the gold-white fire in its jaws. Where it turns across the view it narrows, so the change of side is a turn, not a jump
      if(head){ const ly=far(hp)?'g':'o', sq=mix(.36,1,sat(Math.abs(dx)/dl/.45)), rot=right?th-.22:th-PI+.22, s=HS*(1+hp.z/1600), HW=s*HA*sq, ax=(right?-.5:.5)*HW, az=-.42*s, co=Math.cos(rot), si=Math.sin(rot), ox=ax*co+az*si, oy=ax*si-az*co, hx=hp.x-ox, hz=hp.z+oy, fd_=right?1:-1;
        F.bill(km.glowO,hx,hp.y,hz,s*1.7,s*1.7,0,{...CD,a:.45*hk,gain:1.2,layer:ly});
        const mx=fd_*.44*HW, mz=-.22*s, bx=hx+mx*co+mz*si, bz=hz-(mx*si-mz*co), fa=right?rot+.22:rot+PI-.22, fl_=s*(1.15+1.1*dv)*(1+.08*Math.sin(t*23))*(.5+.5*sq);
        F.bill(m.fc,bx+Math.cos(fa)*fl_*.46,hp.y,bz-Math.sin(fa)*fl_*.46,fl_*.5,fl_*.24,fa,{...CG,a:.95*hk,gain:2.8,ero:.12,t0:sd+7,uvT:(Math.floor(t*12)&1)?[1,-1,0,1]:[1,1,0,0],layer:ly});
        F.bill(m.dH,hx,hp.y,hz,HW,s,rot,{ero:mix(.9,-.1,hk),soft:.1,uvT:right?[1,1,0,0]:[-1,1,1,0],layer:ly});
        F.bill(km.glowO,bx,hp.y,bz,s*.24,s*.24,0,{...CG,a:.8*hk,gain:2.2+Math.sin(t*37)*.4,layer:ly});
        // where the painted neck ends and the body begins: buried in dark red smoke and the flames of its mane
        const pb=pts[3], qx_=pb.x-hp.x, qy_=(pb.y-pb.z)-(hp.y-hp.z), ql=Math.hypot(qx_,qy_)||1, jx=qx_/ql, jy=qy_/ql, kx=-fd_*.74*HW, kz=-.66*s, ex=hx+kx*co+kz*si, ez=hz-(kx*si-kz*co), nl=Math.hypot(jx*.8,jy*.8-.6)||1, ux_=-fd_*.6*HW, uz_=-.72*s;
        F.bill(m.smk,hx+ux_*co+uz_*si,hp.y,hz-(ux_*si-uz_*co),s*.86*sq,s*.66,rot,{cA:'#140302',cB:'#3a0a05',cC:'#9a2c0c',a:.92*hk,ero:.16,t0:sd+9,uvT:right?[1,1,0,0]:[-1,1,1,0],layer:ly});
        tongue(ex-jx*s*.1,hp.y,ez+jy*s*.1+s*.1,s*1.05,jx*.8/nl,(jy*.8-.6)/nl,{...C,t0:sd+11,a:.95*hk,gain:2.3,layer:ly}); tongue(ex+jx*s*.25,hp.y,ez-jy*s*.25-s*.12,s*.85,jx*.9/nl,(jy*.9-.35)/nl,{...CD,t0:sd+13,a:.95*hk,gain:2.2,layer:ly}); }
      // embers shed along its length
      for(let e=0;e<2;e++){ const p=pts[(Math.random()*(N-4))|0]; if(p.w>4) GFX.pt({x:p.x+rand(-40,40),y:p.y,z:p.z+rand(-40,40),vx:rand(-90,90),vy:rand(-40,40),vz:rand(-60,220),g:120,drag:.8,life:rand(.4,.9),s:rand(2.5,6.5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); } }); }
  // ---- release (wide): it comes up through the floor - rock stands up behind it, no burst of fire but its own
  after(1.87,()=>{ dr.stop(.1); SFX.roar(1.8,1); spot.hold=0; spot.life=.3; hitstop=Math.max(hitstop,.06); Cn.shake(1); post.ca=.012; Cn.tilt(.22,5); Cn.zoom(.66); Cn.cam(null);
    GFX.ambient(.4,.33,.36,30); after(.14,()=>GFX.ambient(.3,.3,.42,5));
    K.upheave(x0,y0,{r:240,n:9,s:270,a0:PI*.96,a1:TAU+PI*.04,pal:PD,dur:1.5}); K.shock(x0,y0,{r:hw*1.05,dur:.5,pal:PD,gain:.8,light:0}); K.crack(x0,y0,{alt:1,r:560,pal:PF,life:3.2,grow:.12});
    for(let i=0;i<3;i++) K.smoke(x0+rand(-160,160),y0-60,{s:rand(260,340),z:rand(60,220),dur:rand(1.1,1.5),delay:.08+i*.1,a:.7,rise:140,c:'#120a08',c2:'#3a2018'});
    GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7}); K.sparks(x0,y0,60,{pal:PF,n:36,sp:[500,1800],up:1300}); K.debris(x0,y0,{n:22,r:200,sp:[250,1100],up:1700,size0:12,size:30}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); GFX.light(x0,y0,hw*1.4,PF.l,1.05,.5,{z:240});
    });
  // ---- it chooses (announced .42 s ahead): its shadow falls on the place, the floor there glows and splits, embers are drawn to it
  after(4.1,()=>{ dive=t; Cn.cam(cx,cy-BODY,9); Cn.tilt(.28,5); Cn.zoom(.66); GFX.ambient(.3,.3,.38,8); SFX.roar(1.2,1); Cn.SND.inhale(.42,.7);
    if(F.on){ const km=K.mats(); GFX.add(.43,k=>{ const r=560*(.45+.55*k); F.quad(km.dark,cx,cy,r,r,0,{a:.3+.5*k}); F.quad(km.glowG,cx,cy,90+300*k,90+300*k,0,{...col(PG),a:.75*k,gain:1.5}); }); }
    K.crack(cx,cy,{alt:1,r:380,pal:PG,life:1.3,grow:.4}); GFX.light(cx,cy,800,PG.l,.7,.2,{hold:.4,z:60});
    for(let i=0;i<2;i++) K.shock(cx,cy,{r0:820-i*240,r:60,dur:.36,delay:i*.12,pal:PG,gain:.6,light:0,dust:0,painted:0,haze:.5,th:.7});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(400,900); GFX.pt({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*FSY,z:rand(0,300),tx:cx,ty:cy,tz:10,pull:rand(5,8),life:rand(.3,.42),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*700,vy:Math.cos(a)*400,c:GFX.rgb(Math.random()<.5?PG.h:PF.s),c2:PF.b,L:3}); } });
  // ---- the field holds its breath: everything dims and waits
  after(4.33,()=>{ GFX.gain=.6; GFX.ambient(.3,.3,.36,40); });
  after(4.44,()=>{ hitstop=Math.max(hitstop,.07); });
  // ---- contact: one frame - shock front, rock standing up round the hole, slabs and dust thrown out, everything near in the air
  after(4.52,()=>{ GFX.gain=g0; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.6); SFX.boom(2.2,1); Cn.SND.hit(1); SFX.roar(1.6,.8);
    GFX.ambient(.44,.36,.37,40); after(.18,()=>GFX.ambient(.36,.32,.38,3));
    crater(cx,cy,hw*.56,{life:7.2,spread:.16}); K.shock(cx,cy,{r:hw*1.5,dur:.5,pal:PD,gain:1,light:0}); GFX.ripple(cx,cy,hw*1.8,{life:.55,s:.9});
    K.upheave(cx,cy,{r:hw*.5,n:12,s:340,a0:PI*.94,a1:TAU+PI*.06,pal:PD,dur:1.7}); K.upheave(cx,cy,{r:hw*.86,n:7,s:210,a0:PI*1.1,a1:PI*1.9,pal:PD,dur:1.3,delay:.07});
    K.art(cx,cy,{tex:BF(),s:hw*.6,asp:BFA(),z:30,dur:.36,pal:PD,gain:1,hold:.3,s0:.35,rot:rand(0,TAU)}); K.flare(cx,cy,BODY,{pal:PG,s:300,dur:.22,gain:2.4});
    K.debris(cx,cy,{n:34,r:220,sp:[400,1700],up:2100,size0:14,size:38}); K.dust(cx,cy,{n:22,r:160,sp:[600,1500],a:.55}); K.sparks(cx,cy,80,{pal:PG,n:50,sp:[600,2400],up:1800,life:[.4,1]}); GFX.light(cx,cy,hw*1.6,PG.l,1.15,.5,{z:300});
    launch(cx,cy,hw*1.25,1); after(.3,()=>Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}));
    // what stays: the dragon burnt into the floor - a coil of charred scales round the crater, its head at the end of it. Low fire runs out
    // along it once, tail to head, and dies; low smoke hangs over it
    if(F.on){ const m=mats(), C=col(PF), CD=col(PD), a0=rand(-2.4,-.7), NC=38, P_=coil(cx,cy,hw*.9,hw*.16,a0,1.6,NC,hw*.12), sd=rand(0,9), hd=P_[0], hs=hw*.3, ha=a0+PI/2, hf=NC>>1, A1=P_.slice(0,hf+1), A2=P_.slice(hf);
      for(let i=0;i<NC;i++) P_[i].j=rand(.6,1.35);
      GFX.add(7.4,(k,tt)=>{ const fade=sat((1-k)/.18), heat=Math.max(.1,1.2-tt/1.8), sh=sat(tt/.4+.1), er=.34-.3*sat(tt/.6);
        F.ribbon(m.dBk,A1,{a:.96*fade*sh,ero:er,soft:.12,gain:1+2.2*heat}); F.ribbon(m.dBk,A2,{a:.96*fade*sh,ero:er,soft:.12,gain:1+2.2*heat,uvT:[-1,1,1,0]});
        F.quad(m.dHk,hd.x+Math.cos(ha)*hs*.75,hd.y+Math.sin(ha)*hs*.75*FSY,hs*HA,hs,ha,{a:.96*fade*sat((tt-.3)/.3),ero:.1,soft:.14,gain:1+2.2*heat,uvT:[1,-1,0,1]});
        if(tt<1.5){ let any=0; for(let i=0;i<NC;i++){ const p=P_[i], ig=(1-i/(NC-1))*.4, up=sat((tt-ig)/.12), dn=sat(1-(tt-ig-.35)/.6); p.h=(90+170*p.w/(hw*.12))*p.j*up*dn*(1+.12*Math.sin(tt*11+i)); if(p.h>4) any=1; }
          if(any){ F.wall(m.gf,P_,{...CD,a:1,gain:2.4,ero:.1,ulen:700,t0:sd}); for(let i=2;i<NC-1;i+=4){ const p=P_[i], dx=P_[i+1].x-P_[i-1].x, dy=P_[i+1].y-P_[i-1].y; if(p.h>50&&Math.abs(dy)>Math.abs(dx)*.8) tongue(p.x,p.y,0,p.h*1.2,0,-1,{...(i%8===2?C:CD),a:1,t0:sd+i,gain:2.3}); } } } }); } });
  // ---- afterglow: low dark smoke over the crater, embers, rubble settling; the colour and the camera come back
  after(4.9,()=>{ for(let i=0;i<6;i++){ const a=rand(0,TAU), r=rand(0,hw*.6); K.smoke(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{s:rand(260,400),z:0,dur:rand(1.5,2.2),delay:i*.07,a:.6,rise:90,c:'#120a08',c2:'#3a2218'}); }
    K.embers(cx,cy,hw*.9,{pal:PF,n:70,life:2.6,up:300}); K.debris(cx,cy,{n:10,r:hw*.5,sp:[60,260],up:500,size0:8,size:20}); });
  after(5.1,()=>{ GFX.ambient(.8,.7,.68,1.6); Cn.tilt(0,2.5); Cn.zoom(.9); });
  after(5.5,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(6.15,()=>{ done=true; GFX.gain=g0; ultStop(); }); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
