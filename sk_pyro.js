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
if(F&&F.on){ for(const n of ['dragon_head','dragon_body','fx_sun','meteor','fx3_tornado','fx3_fire','fx3_smoke','v3_circ_pyro','v3_comet_tail','v3_crater','v3_scorch','v3_flame_cone','v3_vortex_wisps']) F.img(n); F.img('v3_groundfire',{repeat:true}); }

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
  // the scar a walking whirl leaves: a charred, ember-veined track
  arm:m({nz:'cells',n1:[9,1.4,.01,0],n2:[3,1,0,0],dist:.03,nk:.85,pw:1.3,ero:.04,soft:.25,pm:[2,1.1,0,0],cA:'#000000',rk:[.45,1.15],op:1,layer:'g'}),
  dC:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[3,1,0,0],cB:'#ff3008',cC:'#ffb040',gain:1,op:0,layer:'g'}),
}; return MT; }

// ---------------------------------------------------------------- local pieces
// SCORCH: the floor burnt where fire stood. o: {life, pal, heat}
function scorch(x,y,r,o={}){ if(!F.on) return; const m=mats(), P=o.pal||PF, life=o.life||4, rot=rand(0,TAU), sd=rand(0,9), hk=o.heat??1;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,2.2)*hk, out=sat((1-k)/.3), rr=r*(.65+.35*i);
    F.quad(m.sc,x,y,rr,rr,rot,{cB:'#e03a04',cC:P.s,a:.92*out,bgain:1.5*heat,gain:2.4*heat,t0:sd}); },o.delay||0); }

// CRATER: where something huge went into the floor: soot, ejecta rays, molten cracks cooling from the rim inward. o: {life, pal}
function crater(x,y,r,o={}){ if(!F.on) return; const m=mats(), C=col(o.pal||PF), life=o.life||5, rot=rand(0,TAU), sd=rand(0,9);
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,1.6), out=sat((1-k)/.25);
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
  GFX.add(dur,(k)=>{ const e=eo3(k), r=mix(R0,R1,e), f=sat((k-.6)/.4), a=1-f*f, hh=h*(.5+.5*sat(k*6))*(1-.4*f), ur=Math.max(2,Math.round(TAU*r/(h*2.4)));
    if(o.smoke!==0&&!F.low) F.lathe(km.waS,x,y,0,{r0:r*1.03,r1:r*1.03*ln,h0:0,h1:hh*1.22,lh,a:a*.85,ero:.1+f*.5,uvT:[ur,1,sd+.5,0],fd:[0,0,0,.3],t0:sd,ord:-1});
    F.lathe(km.waB,x,y,0,{r0:r,r1:r*ln,h0:0,h1:hh,lh,...C,a,gain:2.4*g,ero:.12+f*.7,uvT:[ur,1,sd,0],fd:[0,0,.04,.35],t0:sd});
    F.lathe(km.waC,x,y,0,{r0:r*.985,r1:r*.985*ln,h0:0,h1:hh*.6,lh,...C,a,gain:2.8*g,ero:.25+f*.6,uvT:[ur*2,1,sd+.37,0],fd:[0,0,0,.5],t0:sd}); },o.delay||0); }

// WHIRL: a column of fire turning on the floor: bands of flame wound round a bent funnel, a gold core, the painted
// funnel for its ragged outline, a skirt of flames and the floor glowing at its foot. Returns a handle {x,y,s,a,lean,dead}; move it every frame.
//  o: {s, h, r, dur, in, out, pal, light, gain}
function whirl(x,y,o={}){ const h={x,y,s:o.s||1,a:1,lean:0,dead:false,L:null}; if(!F.on) return h; const m=mats(), km=K.mats(), P=o.pal||PF, C=col(P), CD=col(PD), CG=col(PG), dur=o.dur||4, tin=o.in??.3, tout=o.out??.35, H0=o.h||640, R0=o.r||165, sd=rand(0,9), g=o.gain||1, M1=new Float32Array(IDENT), M2=new Float32Array(IDENT), sk=ringPts(0,0,1,14);
  if(o.light!==0) h.L=GFX.light(x,y,R0*h.s*3.6,P.l,o.light??.8,.3,{hold:dur-.3,z:140,flick:.18});
  GFX.add(dur,(k,t)=>{ if(h.dead){ if(h.L){ h.L.hold=0; h.L=null; } return; } const i=eo3(sat(t/tin)), out=sat((dur-t)/tout), a=h.a*out, f=1-out, s=h.s, Hh=H0*s*(.12+.88*i)*(1+.03*Math.sin(t*11+sd)), R=R0*s*(.3+.7*i)*(1+f*.35);
    // it bends: the stem leans one way, the crown trails and sways the other
    const s1=h.lean+Math.sin(t*2.9+sd)*.1, s2=h.lean*1.8-Math.sin(t*2.9+sd+.9)*.17; M1[8]=s1; M2[8]=s2; M2[12]=(s1-s2)*Hh*.45; const tx=s1*Hh*.45+s2*Hh*.55;
    if(h.L){ h.L.x=h.x; h.L.y=h.y; h.L.r=R0*s*3.6; }
    if(!F.low) F.quad(km.dark,h.x,h.y,R*1.15,R*1.15,0,{a:.55*a});
    F.quad(km.glowG,h.x,h.y,R*1.6,R*1.6,0,{...C,a:.85*a,gain:1.3});
    // eye: the foot opens round whoever stands in it - the fire turns above and about him, not over him
    if(o.eye){ const re=R*.64, lh=[1.15,.3];
      F.lathe(km.waB,h.x,h.y,0,{r0:re,r1:re*1.16,h0:0,h1:Hh*.34,lh,...CD,a:a*.95,gain:2.2*g,ero:.12+f*.6,uvT:[5,1,sd+t*.55,0],fd:[0,0,.03,.35],t0:sd});
      F.lathe(km.waC,h.x,h.y,0,{r0:re*.97,r1:re*1.1,h0:0,h1:Hh*.2,lh,...C,a:a*.9,gain:2.6*g,ero:.26+f*.6,uvT:[8,1,sd+t*.8,0],fd:[0,0,0,.5],t0:sd});
      F.lathe(m.whB,h.x,h.y,0,{r0:R*.42,r1:R*1.05,h0:Hh*.3,h1:Hh,M:M2,...CD,a:a*.7,gain:1.5*g,ero:.24+f*.6,fd:[0,0,.4,.35],t0:sd+4});
      F.bill(m.vx,h.x+tx*.5,h.y,Hh*.62,Hh*.3,Hh*.44,0,{...CG,a:a*.95,gain:2.5*g,ero:.12+f*.6,nk:.25+f*.5,t0:sd+2,fd:[0,0,.2,0],uvT:(Math.floor(t*11+sd)&1)?[-1,1,1,0]:[1,1,0,0]});
      F.bill(m.tor,h.x+tx*.55,h.y,Hh*.6,Hh*.37,Hh*.48,0,{...C,a:a*.95,gain:2.3*g,ero:.14+f*.6,nk:.35+f*.5,t0:sd,fd:[0,0,.3,0],uvT:(Math.floor(t*8+sd)&1)?[-1,1,1,0]:[1,1,0,0]}); return; }
    F.lathe(m.whB,h.x,h.y,0,{r0:R*.2,r1:R*.6,h0:0,h1:Hh*.72,M:M1,...CD,a,gain:1.7*g,ero:.2+f*.6,fd:[0,0,.12,.5],t0:sd});
    F.lathe(m.whB,h.x,h.y,0,{r0:R*.36,r1:R,h0:Hh*.28,h1:Hh,M:M2,...C,a,gain:1.7*g,ero:.2+f*.6,fd:[0,0,.35,.35],t0:sd+4});
    F.bill(m.vx,h.x+tx*.4,h.y,Hh*.5,Hh*.27,Hh*.5,0,{...C,a:a*.85,gain:1.9*g,ero:.14+f*.6,nk:.25+f*.5,t0:sd+2,uvT:(Math.floor(t*11+sd)&1)?[-1,1,1,0]:[1,1,0,0]});
    F.bill(m.tor,h.x+tx*.55,h.y,Hh*.53,Hh*.37,Hh*.55,0,{...C,a:a*.95,gain:2.3*g,ero:.14+f*.6,nk:.35+f*.5,t0:sd,uvT:(Math.floor(t*8+sd)&1)?[-1,1,1,0]:[1,1,0,0]});
    // the skirt: low flames in a ring round its foot
    const rs=R*.62; for(const p of sk){ p.x=h.x+p.bx*rs; p.y=h.y+p.by*rs; } if(!F.low) F.wall(km.waB,sk,{h:R*.8,...C,a:a*.9,gain:2*g,ero:.14+f*.6,uvT:[3,1,sd+t*.9,0],t0:sd});
    if(Math.random()<.55*(GFX.QK||1)){ const b=rand(0,TAU), rr=R*rand(.3,.9); GFX.pt({x:h.x+Math.cos(b)*rr,y:h.y+Math.sin(b)*rr*FSY,z:rand(10,Hh*.5),vx:-Math.sin(b)*rand(300,700)*s,vy:Math.cos(b)*rand(200,400)*s,vz:rand(300,900),g:-200,drag:1.4,life:rand(.4,.9),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?P.h:P.s),c2:P.b,L:3}); } },o.delay||0);
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
    after(.1,()=>{ K.burst(x1,y1,{s:150,pal:PG,z:BODY*.2,smoke:0,no:['crack','debris','smoke']}); scorch(x1,y1,190,{life:T+.8}); K.sparks(x1,y1,BODY*.5,{pal:PF,n:16,dir:a,spread:.9,sp:[400,1500],up:500}); });
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,70,o=>{ dmg(o,d*.35,{kb:.2}); hitFx(o,C1,.8); })});
    after(.06,()=>inLine(x0,y0,x1,y1,80,o=>{ dmg(o,d,{kb:.8,sx:x0,sy:y0}); hitFx(o,C1,1.1); })); }},
  // FIRE PILLAR: the floor under three of them glows, then a column of fire stands up through each
  py_pillar:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?5:3, d=D(id); push(); sfx('fire',.9,.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.15+i*.1,()=>{ const x=e.x, y=e.y;
      K.shock(x,y,{r0:190,r:36,dur:.16,pal:PF,gain:.7,light:0,dust:0,haze:0,th:.6}); GFX.light(x,y,360,PF.l,.7,.2);
      after(.15,()=>{ K.pillar(x,y,{r:50,h:760,dur:.42,pal:PD,gain:.55}); K.flame(x,y,{s:430,dur:.75,pal:PF,light:0}); K.flame(x,y,{s:250,dur:.6,pal:PG,light:0}); K.art(x,y,{tex:'v3_xburst',s:150,z:20,dur:.2,pal:PG,hold:.15,s0:.5});
        K.shock(x,y,{r:230,dur:.32,pal:PF,gain:.8,light:0}); scorch(x,y,170,{life:3}); K.sparks(x,y,20,{pal:PF,n:12,sp:[150,600],up:1500,life:[.3,.7]}); K.dust(x,y,{n:6,r:40,sp:[200,480],a:.35});
        trauma=Math.min(1,trauma+.15); sfx('fire',.5,.5);
        inCircle(x,y,150,o=>{ dmg(o,d,{kb:.3,launch:1200,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); })); }},
  // FLAME RING: a wall of fire leaves him in every direction
  py_ring:{fn(id){ if(countIn(480)<4&&!nearest(250)) return false; const d=D(id); raise();
    const wave=k=>{ const x=pl.x, y=pl.gy; ringFire(x,y,{r0:70,r:560,h:230,dur:.52,gain:k?.85:1,smoke:k?0:1}); K.shock(x,y,{r:620,dur:.5,pal:PF,gain:.9}); GFX.ripple(x,y,640,{life:.45,s:.6});
      K.art(x,y,{tex:'v3_spin_ring',floor:true,s:330,dur:.4,pal:PG,gain:.8,hold:.2,s0:.35,rot:rand(0,TAU)}); K.sparks(x,y,40,{pal:PF,n:18,sp:[500,1500],up:420,life:[.25,.55]}); sfx('fire',1,.8);
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
// FIRE STORM: six flames light on the rim of his circle and twist up into whirls; they walk out across the whole field burning their
// paths into the floor while the ground erupts between them; then all six come home, wind into one column - and the column lets go.
function ultStorm(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, RM=Math.max(hw,hh)*.68;
  S([['gx01',.1],['gx03',1.5,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',1.9],['gx09',.4],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  // ---- omen: the light leaves the field, the sun circle writes itself, heat is drawn in, six flames light one by one
  GFX.ambient(.3,.32,.46,3.5); const spot=GFX.light(x0,y0,540,'#ff6a1c',.75,.5,{hold:9,z:120,flick:.15});
  const sig=K.sigil(x0,y0,{r:hw*.5,dur:5.9,in:1.1,out:.6,spin:.3,pal:PS,tex:CIRC()});
  K.crack(x0,y0,{r:250,pal:PF,life:6,grow:1.4});
  Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); Cn.drone(44,.3); Cn.SND.inhale(1.2,.4);
  for(let i=0;i<3;i++) after(.2+i*.4,()=>K.shock(x0,y0,{r0:hw*(1-i*.14),r:70,dur:.45,pal:PF,gain:.45,light:0,dust:0,haze:.5,th:.6}));
  for(let i=0;i<50;i++) after(rand(0,1.6),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,360),tx:x0,ty:y0,tz:BODY*.9,pull:rand(4,6.5),life:rand(.45,.7),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*560,vy:Math.cos(a)*330,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
  const tor=[]; let t=0, out=false, home=0, done=false;
  const RC=hw*.43;
  for(let k=0;k<6;k++){ const a=k/6*TAU, z={a,x:x0+Math.cos(a)*110,y:y0+Math.sin(a)*110*.8,R0:110,sc:rand(0,.1),n:k,s1:rand(1.25,1.6),path:[],w:null,cx:x0+Math.cos(a+.52)*RC,cy:y0+Math.sin(a+.52)*RC*FSY}; tor.push(z); const tl=.5+k*.2;
    after(tl,()=>{ z.cd=K.flame(z.cx,z.cy,{s:185,dur:1.82-tl+.3,pal:PF,light:0}); K.sparks(z.cx,z.cy,20,{pal:PF,n:8,sp:[100,420],up:800,life:[.2,.5]}); GFX.light(z.cx,z.cy,380,PF.l,.75,.4); K.shock(z.cx,z.cy,{r:130,dur:.25,pal:PF,gain:.5,light:0,dust:0,haze:0}); if(sig.kick) sig.kick(); Cn.SND.tick(1+k*.1,.25); }); }
  V.ultTick=dt=>{ t+=dt; if(!out) return;
    for(const z of tor){ z.a+=dt*(home?2.6:1.25); const R=home?lerp(z.R0,0,Math.min(1,(t-home)/.5)**2):lerp(110,RM,easeOut(Math.min(1,(t-1.9)/1.1))); if(!home) z.R0=R; z.x=x0+Math.cos(z.a)*R; z.y=y0+Math.sin(z.a)*R*.8;
      if(z.w){ z.w.x=z.x; z.w.y=z.y; z.w.s=z.s1*(.4+.6*sat((R-110)/520)); z.w.lean=-Math.sin(z.a)*(home?-.22:.16); if(home) z.w.a=1-.6*Math.min(1,(t-home)/.5); }
      if(Math.random()<.3) inCircle(z.x,z.y,210,o=>ultHit(o,Dm*.12,z.x,z.y));
      if((z.sc+=dt)>.11&&!home){ z.sc=0; z.path.push({x:z.x,y:z.y,t}); } } };
  // the arms: each whirl's path stays alight behind it, so the field carries a burning spiral
  if(F.on){ const m=mats(); GFX.add(6.3,(k,tt)=>{ if(!tor[0].path.length) return; const heat=t<4.42?1.15:Math.max(.12,1-(t-4.42)/1.3), fade=sat((1-k)/.2);
      for(const z of tor) if(z.path.length>1) F.ribbon(m.arm,z.path,{w:58,cB:'#e03a04',cC:PF.s,a:.9*fade,bgain:1.5*heat,gain:2.4*heat,t0:z.n}); },1.82); }
  if(F.on){ const gm=mats().gf, C=col(PF), CDk=col(PD), sd=rand(0,9); GFX.add(9,()=>{ if(done||!tor[0].path.length) return; const blown=sat(1-(t-4.42)/.45); if(blown<=0) return;
      for(const z of tor){ const P_=z.path, n=P_.length; if(n<2) continue; for(const p of P_){ const age=t-p.t; p.h=200*sat(age/.2)*sat(1.15-(age-1.5)/1.2)*(1+.12*Math.sin(p.t*37+t*9)); }
        F.wall(gm,P_,{...C,a:blown,gain:2.4,ero:.1+(1-blown)*.6,ulen:560,uvT:[1,1,z.n*.37,0],t0:sd+z.n});
        for(let i=2;i<n-1;i+=3){ const p=P_[i], dx=P_[i+1].x-P_[i-1].x, dy=P_[i+1].y-P_[i-1].y; if(p.h>40&&Math.abs(dy)>Math.abs(dx)*.9) tongue(p.x,p.y,0,p.h*1.3,0,-1,{...((i+z.n)%2?C:CDk),a:blown,t0:sd+i+z.n,ero:.12+(1-blown)*.6,gain:2.3}); } } }); }
  // ---- release: the six flames twist up and walk out
  after(1.82,()=>{ out=true; sig.pal=PF; if(sig.kick) sig.kick(); spot.hold=0; spot.life=.3; Cn.zoom(.84); Cn.cam(null); Cn.shake(.8); post.ca=.01; hitstop=Math.max(hitstop,.05); SFX.boom(1.4,.5); Cn.SND.shing(.7,.4);
    GFX.ambient(.5,.38,.36,30); after(.14,()=>GFX.ambient(.3,.31,.44,5));
    K.art(x0,y0,{tex:'v3_xburst',s:hw*.42,z:BODY*.4,dur:.3,pal:PG,gain:1,hold:.18,s0:.5}); K.shock(x0,y0,{r:hw*1.4,dur:.55,pal:PF}); GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7});
    ringFire(x0,y0,{r0:100,r:420,h:190,dur:.45,smoke:0}); K.sparks(x0,y0,BODY*.6,{pal:PF,n:36,sp:[500,1900],up:900}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,800],up:1000});
    for(const z of tor){ K.flame(z.cx,z.cy,{s:300,dur:.45,pal:PG,light:0}); z.w=whirl(z.x,z.y,{s:z.s1*.4,h:640,r:185,dur:2.6,in:.4,out:.25}); } });
  // ---- development: the field erupts between the whirls
  for(let i=0;i<16;i++) after(2.1+i*.1,()=>{ const x=x0+rand(-hw,hw)*.9, y=y0+rand(-hh,hh)*.85;
    K.burst(x,y,{s:200,pal:PF,smoke:i%3?0:1,no:['crack','debris','shock']}); K.flame(x,y,{s:rand(280,360),dur:.75,pal:i%2?PF:PD,light:0});
    sfx('boom',.8,.4); Cn.shake(.3); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  // ---- they come home and wind into one
  after(3.75,()=>{ home=t; Cn.zoom(1.05); Cn.SND.inhale(.5,.7); GFX.ambient(.3,.3,.4,8); sig.a=1.5;
    for(let i=0;i<2;i++) K.shock(x0,y0,{r0:hw*(1.3-i*.3),r:90,dur:.42,delay:i*.16,pal:PF,gain:.6,light:0,dust:0,haze:.6,th:.7});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(500,1100); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,400),tx:x0,ty:y0,tz:300,pull:rand(5,8),life:rand(.4,.6),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*900,vy:Math.cos(a)*520,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } });
  let big=null;
  after(4.12,()=>{ big=whirl(x0,y0,{s:2.9,h:640,r:150,dur:.75,in:.24,out:.3,gain:1.1,light:1.2,eye:true}); Cn.shake(.5); SFX.whoosh(.6,1); });
  // one held breath: the light drops and everything waits
  after(4.33,()=>{ GFX.ambient(.3,.3,.36,40); hitstop=Math.max(hitstop,.07); if(sig.kick) sig.kick(); });
  // ---- climax: the column lets go
  after(4.42,()=>{ out=false; for(const z of tor) if(z.w) z.w.dead=true;
    hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.014; Cn.zoom(.82); SFX.boom(2.2,1); Cn.SND.hit(1);
    GFX.ambient(.62,.42,.34,40); after(.18,()=>GFX.ambient(.4,.33,.38,3));
    K.art(x0,y0,{tex:'v3_xburst',s:hw*.56,z:BODY*.5,dur:.24,pal:PB,gain:1.15,hold:.16,s0:.55}); K.flare(x0,y0,BODY,{pal:PB,s:300,dur:.3,gain:2.4}); GFX.light(x0,y0,hw*1.6,PB.l,1,.16,{z:260});
    K.burst(x0,y0,{s:hw*.66,pal:PG,smoke:3,scar:6,no:['crack','flash']}); K.flame(x0,y0,{s:1050,dur:1.25,pal:PF,light:0}); K.flame(x0,y0,{s:620,dur:1,pal:PG,light:0,gain:.9});
    ringFire(x0,y0,{r0:160,r:hw*1.7,h:700,dur:1.05,gain:1.1,hf:.4}); ringFire(x0,y0,{r0:120,r:hw*1.0,h:340,dur:.9,delay:.18,pal:PD,smoke:0});
    K.crack(x0,y0,{r:hw*.95,pal:PF,life:5.5,grow:.14,gain:1.2}); K.shock(x0,y0,{r:hw*1.8,dur:.6,pal:PF,gain:1.2}); K.shock(x0,y0,{r:hw*2.4,dur:.9,pal:PF,gain:.7,delay:.1,light:0});
    GFX.ripple(x0,y0,hw*2,{life:.6,s:.9}); K.dome(x0,y0,{r:hw*.85,dur:.45,pal:PF,gain:.7}); K.debris(x0,y0,{n:24,r:160,sp:[300,1300],up:1800,size:22}); K.dust(x0,y0,{n:20,r:120,sp:[500,1400],a:.5});
    K.sparks(x0,y0,80,{pal:PF,n:50,sp:[600,2400],up:1800,life:[.4,1]}); GFX.light(x0,y0,hw*2.2,PF.l,1.3,1,{z:300});
    Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3});
    // what is left burns where it fell
    for(let i=0;i<8;i++){ const a=rand(0,TAU), r=rand(260,820), fx=x0+Math.cos(a)*r, fy=y0+Math.sin(a)*r*.75; K.flame(fx,fy,{s:rand(110,190),dur:rand(1.5,2.3),pal:PF,delay:.25+i*.04,light:0}); scorch(fx,fy,rand(120,170),{life:4,delay:.25+i*.04}); } });
  // ---- afterglow: smoke climbs off the scars, embers drift, the colour comes back
  after(4.95,()=>{ for(let i=0;i<5;i++){ const a=rand(0,TAU), r=rand(0,520); K.smoke(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{s:rand(240,380),dur:rand(1.3,1.9),delay:i*.08,a:.55,c:'#1c120e',c2:'#4a3026'}); }
    K.embers(x0,y0,hw*.9,{pal:PF,n:60,life:2.4,up:320}); GFX.ambient(.8,.7,.68,1.6); Cn.zoom(.95); });
  after(5.35,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); sig.a=.6; });
  after(5.95,()=>{ done=true; sig.dead=true; for(const z of tor) if(z.w) z.w.dead=true; if(big) big.dead=true; ultStop(); }); }

// DRAGON BLAZE: a cold circle writes itself and turns to fire; something scaled turns under it and the floor heaves; a wall of flame
// climbs round the circle and the dragon comes up through it - crimson scales wrapped in fire and black smoke, gold fire in its jaws.
// It takes one lap low over the field: the stone lights under it, its track stays alight, and its wake throws a wall of fire round the
// whole arena. Then it rears over them, and pours itself into the floor where they stand thickest: a crater, and the fire comes back up.
function ultDragon(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy;
  S([['gy01',.12],['gy02',.2],['gy03',.4,{kick:[-.8,.6]}],['gy04',1.1],['gy05',.1],['gy06',.1],['gy07',.12,{kick:[-1.4,1]}],['gy08',.8],['gy09',.8],['gy10',.8],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.6],['gy13',.7],['gy14',9]]);
  const RR=Math.min(hw,hh)*.66, RO=RR*1.5, T0=1.9, TD=2.2, DD=.42, END=TD+DD, ZF=280, N=36, HS=300, HA=900/595, WB=122, SR=520;
  // ---- omen
  GFX.ambient(.3,.31,.44,3.5); const spot=GFX.light(x0,y0,760,'#ff5a18',.8,.5,{hold:9,z:140,flick:.2});
  Cn.zoom(1.18); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); const dr=Cn.drone(41,.4); SFX.rumble(1.7);
  const sig=K.sigil(x0,y0,{r:30,dur:2.9,in:1.1,out:.45,spin:-.8,pal:PS,tex:CIRC(),hole:.16}); after(.9,()=>{ sig.pal=PD; if(sig.kick) sig.kick(); });
  K.crack(x0,y0,{r:460,pal:PD,life:5.2,grow:1.7});
  for(let i=0;i<3;i++) after(.25+i*.45,()=>K.shock(x0,y0,{r0:hw*(1.05-i*.12),r:80,dur:.45,pal:PD,gain:.45,light:0,dust:0,painted:0,haze:.5,th:.6}));
  for(let i=0;i<56;i++) after(rand(.1,1.7),()=>{ const a=rand(0,TAU), d=rand(80,SR); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vx:rand(-30,30),vz:rand(160,460),g:-80,drag:.5,life:rand(.6,1.1),s:rand(3,6.5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),fade:'in',L:3}); });
  for(const tq of [1.28,1.6]) after(tq,()=>{ K.shock(x0,y0,{r:SR*1.25,dur:.36,pal:PD,gain:.7,light:0,dust:6}); K.debris(x0,y0,{n:9,r:SR*.7,sp:[60,280],up:680,size:16}); GFX.light(x0,y0,900,PD.l,.85,.3,{z:80}); Cn.shake(.5); if(sig.kick) sig.kick(); SFX.boom(.6,.35); });
  // a wall of flame climbs round the circle just before it comes
  K.arcwall(x0,y0,{r:SR*1.02,h:330,hb:1,hf:.28,dur:1.3,rise:.7,pal:PD,gain:.9,delay:.9,light:.5});
  // path of the head: floor position and height, lt seconds after it leaves the circle. The dive is one arc: on along the lap, up, over and in.
  const lap=lt=>{ const a=-PI/2+lt*3.0, R=RR*Math.min(1,lt/.45); return [x0+Math.cos(a)*R,y0+Math.sin(a)*R*.75]; }, zl=lt=>ZF*eo3(sat(lt/.35))+Math.sin(lt*6)*38;
  // the dive keeps turning the way the lap turned and winds inward onto the mark (the circle it flies shrinks and slides over to the
  // target), so the body never has to double back on itself; its height swells once and falls away
  const sz=zl(TD), pos=lt=>{ if(lt<=0) return {x:x0,y:y0,z:0}; if(lt<TD){ const [x,y]=lap(lt); return {x,y,z:zl(lt)}; }
    const k=sat((lt-TD)/DD), w=k*(.7+.3*k), a=-PI/2+lt*3.0, R=RR*(1-w); return {x:lerp(x0,cx,w)+Math.cos(a)*R,y:lerp(y0,cy,w)+Math.sin(a)*R*.75,z:sz*(1-Math.pow(k,1.8))+1300*k*k*Math.pow(1-k,1.5)}; };
  let t=0, sc=0, fl=0, arcT=.2, dive=0, done=false; const trail=[];
  V.ultTick=dt=>{ t+=dt; sig.r=lerp(30,SR,easeOut(Math.min(1,t/1))); Cn.shake(t<1.8?.1+t*.1:0);
    if(t<T0){ if((sc+=dt)>.09){ sc=0; const a=rand(0,TAU), r=rand(.55,1)*SR; K.flame(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{s:rand(70,150)*(.5+t*.4),dur:.5,pal:PD,light:0}); } return; }
    const lt=t-T0; if(dive||lt>=TD) return; const p=pos(lt);
    if((sc+=dt)>.11){ sc=0; trail.push({x:p.x,y:p.y,t}); if((fl=(fl+1)%3)===0) K.flame(p.x+rand(-40,40),p.y+rand(-20,20),{s:rand(130,190),dur:rand(1.5,2.1),pal:PF,light:0}); }
    // its wake throws a wall of fire outward, sector by sector, until the whole field is ringed
    if(lt>.35&&(arcT+=dt)>.3){ arcT=0; const a=-PI/2+lt*3.0; K.arcwall(x0,y0,{r:RO,a0:a-1.0,a1:a-.08,h:760,hb:1,hf:.26,dur:1.8,rise:.22,pal:PF,gain:1.05,light:0}); GFX.light(x0+Math.cos(a-.5)*RO,y0+Math.sin(a-.5)*RO*FSY,700,PD.l,.6,1,{z:160}); }
    if(Math.random()<.35){ V.blast={x:p.x,y:p.y,p:.8}; inCircle(p.x,p.y,270,o=>ultHit(o,Dm*.15,p.x,p.y-BODY)); } };
  // the shape under the floor before it comes: a scaled body turning under the circle
  if(F.on){ const m=mats(); GFX.add(1.5,(k,tt)=>{ const a=sat(tt/.5)*(1-sat((tt-1.4)/.1)), r=sig.r*.74, w=r*.36, a0=-tt*2.6;
      for(let q=0;q<2;q++) F.lathe(m.dC,x0,y0,0,{r0:r-w/2,r1:r+w/2,a0:a0+q*PI,a1:a0+q*PI+PI*.92,a:a*(.5+.5*k),ero:.3-.34*k,soft:.2,gain:.9+k*.9}); },.4); }
  // the track it flew: a charred, ember-veined scar that stays, and flames standing on it until the floor takes the dragon back
  if(F.on){ const m=mats(), km=K.mats(), CD=col(PD), C=col(PF), sd=rand(0,9); GFX.add(8,(k)=>{ const n=trail.length; if(n<2) return; const heat=t<4.52?1.2:Math.max(.15,1-(t-4.52)/1.5), fade=sat((1-k)/.15), burn=done?0:sat(1-(t-5.0)/.7);
      F.ribbon(m.arm,trail,{w:78,cB:'#e03a04',cC:PF.s,a:.9*fade,bgain:1.5*heat,gain:2.4*heat});
      if(burn>0){ for(const p of trail){ const age=t-p.t; p.h=200*sat(age/.2)*(1+.12*Math.sin(p.t*37+t*9)); } F.wall(m.gf,trail,{...CD,a:burn,gain:2.4,ero:.1+(1-burn)*.6,ulen:640,t0:sd});
        for(let i=1;i<n-1;i+=3){ const p=trail[i], dx=trail[i+1].x-trail[i-1].x, dy=trail[i+1].y-trail[i-1].y; if(p.h>40&&Math.abs(dy)>Math.abs(dx)*.8) tongue(p.x,p.y,0,p.h*1.3,0,-1,{...(i%2?C:CD),a:burn,t0:sd+i,ero:.12+(1-burn)*.6,gain:2.3}); } } },T0); }
  // ---- the dragon itself: drawn from the path every frame
  if(F.on){ const m=mats(), km=K.mats(), C=col(PF), CD=col(PD), CG=col(PG), sd=rand(0,9), pts=[], au=[], sm=[];
    const L1=GFX.light(x0,y0,1150,'#ff6a1c',0,.3,{hold:9,z:260,flick:.12}), L2=GFX.light(x0,y0,820,'#ff3410',0,.3,{hold:9,z:180,flick:.12});
    const shape=u=>u<.1?mix(.72,1,u/.1):Math.pow(Math.max(0,1-(u-.1)/.9),.75);
    const LB=2500, SL=LB/(N-1), SD=.0125;
    GFX.add(9,()=>{ const lt0=t-T0, gone=Math.max(0,lt0-END)*8500; if(done||gone>LB){ L1.hold=L2.hold=0; return; } if(lt0<=0) return; const lt=Math.min(lt0,END);
      // lay the body along the path the head has flown, at even spacing (so it never stretches); once the head is in the floor the rest pours after it
      pts.length=0; au.length=0; sm.length=0; const i0=Math.ceil(gone/SL); let prev=pos(lt), acc=0, tgt=i0*SL-gone, q=lt;
      for(let i=0;i<i0&&i<N;i++) pts.push({x:prev.x,y:prev.y,z:0,w:0});
      for(let j=1;j<=230&&pts.length<N&&q>0;j++){ q=lt-j*SD; const p=pos(q), d=Math.hypot(p.x-prev.x,(p.y-p.z)-(prev.y-prev.z));
        while(pts.length<N&&d>0&&acc+d>=tgt){ const f=(tgt-acc)/d, i=pts.length, u=i/(N-1), wv=Math.sin(lt0*10-u*8)*28*Math.min(1,u*4); pts.push({x:mix(prev.x,p.x,f),y:mix(prev.y,p.y,f),z:Math.max(0,mix(prev.z,p.z,f)+wv),w:WB*shape(u)*sat((tgt+40)/160)*sat(lt0/.08)}); tgt+=SL; }
        acc+=d; prev=p; }
      while(pts.length<N) pts.push({x:x0,y:y0,z:0,w:0});
      // round the path off where it turns hard (twice over), and thin the body where it still bends tighter than its own width
      for(let pass=0;pass<2;pass++){ let ax=pts[0].x, ay=pts[0].y, az=pts[0].z; for(let i=1;i<N-1;i++){ const p=pts[i], b=pts[i+1], nx=(ax+2*p.x+b.x)/4, ny=(ay+2*p.y+b.y)/4, nz=(az+2*p.z+b.z)/4; ax=p.x; ay=p.y; az=p.z; if(p.w>0&&b.w>0){ p.x=nx; p.y=ny; p.z=nz; } } }
      for(let i=1;i<N-1;i++){ const a=pts[i-1], p=pts[i], b=pts[i+1], ux=p.x-a.x, uy=(p.y-p.z)-(a.y-a.z), vx=b.x-p.x, vy=(b.y-b.z)-(p.y-p.z), ul=Math.hypot(ux,uy)||1, vl=Math.hypot(vx,vy)||1, c=(ux*vx+uy*vy)/(ul*vl); if(c<.8) p.w*=Math.max(.35,.5+.5*c/.8); }
      for(let i=N-1;i>=0;i--){ const p=pts[i]; au.push({x:p.x,y:p.y,z:p.z,w:p.w*2.5}); sm.push({x:p.x,y:p.y,z:p.z+p.w*.5,w:p.w*3.4}); }
      const hp=pts[0], hq=pts[2], dx=hp.x-hq.x, dy=(hp.y-hp.z)-(hq.y-hq.z), th=Math.atan2(dy,dx), right=dx>=0, head=lt0<END, hk=sat(lt0/.25), mid=pts[Math.min(N-1,i0+(N>>1))], live=head?1:sat(1-gone/LB), dv=sat((lt0-TD)/DD);
      L1.x=hp.x; L1.y=hp.y; L1.a=1.25*live; L2.x=mid.x; L2.y=mid.y; L2.a=.9*live*sat(lt/.4);
      // on the floor: its shadow, and the light it throws down
      if(head){ F.quad(km.dark,hp.x,hp.y,340,340,0,{a:.5*hk}); F.quad(km.glowG,hp.x,hp.y,600,600,0,{...C,a:.85*hk,gain:1.4}); }
      if(mid.w>1){ if(!F.low) F.quad(km.dark,mid.x,mid.y,290,290,0,{a:.42}); F.quad(km.glowG,mid.x,mid.y,430,430,0,{...CD,a:.6,gain:1.2}); }
      // what it drags: black-crimson smoke, and the fire streaming back along the body
      if(!F.low) F.ribbon(m.ctS,sm,{a:.8*live,t0:sd});
      F.ribbon(m.ct,au,{...CD,gain:2.2,ero:.1,t0:sd,a:.95*live});
      // the mane: painted flames rooted along the spine, blown back and up
      for(let i=1;i<N-6;i+=3){ const p=pts[i], pq=pts[i+2], bx=pq.x-p.x, by=(pq.y-pq.z)-(p.y-p.z), bl=Math.hypot(bx,by)||1; if(p.w<8) continue; const tx_=bx/bl*.75, ty_=by/bl*.75-.66, tl=Math.hypot(tx_,ty_)||1; tongue(p.x,p.y,p.z+p.w*.2,p.w*(2.5-i*.03),tx_/tl,ty_/tl,{...(i%2?C:CD),t0:sd+i,a:.9*live,gain:2.2}); }
      // the body: two lengths of scales
      const h2=N>>1; F.ribbon(m.dB,pts.slice(0,h2+1),{ero:-1,a:live,gain:1.25}); F.ribbon(m.dB,pts.slice(h2),{ero:-1,a:live,gain:1.25});
      // the head, and the gold-white fire in its jaws
      if(head){ const rot=right?th-.22:th-PI+.22, s=HS*(1+hp.z/1600), HW=s*HA, ax=(right?-.5:.5)*HW, az=-.42*s, co=Math.cos(rot), si=Math.sin(rot), ox=ax*co+az*si, oy=ax*si-az*co, hx=hp.x-ox, hz=hp.z+oy, fd_=right?1:-1;
        F.bill(km.glowO,hx,hp.y,hz,s*1.7,s*1.7,0,{...CD,a:.45*hk,gain:1.2});
        const mx=fd_*.44*HW, mz=-.22*s, bx=hx+mx*co+mz*si, bz=hz-(mx*si-mz*co), fa=right?rot+.22:rot+PI-.22, fl_=s*(1.15+1.1*dv)*(1+.08*Math.sin(t*23));
        F.bill(m.fc,bx+Math.cos(fa)*fl_*.46,hp.y,bz-Math.sin(fa)*fl_*.46,fl_*.5,fl_*.24,fa,{...CG,a:.95*hk,gain:2.8,ero:.12,t0:sd+7,uvT:(Math.floor(t*12)&1)?[1,-1,0,1]:[1,1,0,0]});
        F.bill(m.dH,hx,hp.y,hz,HW,s,rot,{ero:mix(.9,-.1,hk),soft:.1,uvT:right?[1,1,0,0]:[-1,1,1,0]});
        F.bill(km.glowO,bx,hp.y,bz,s*.24,s*.24,0,{...CG,a:.8*hk,gain:2.2+Math.sin(t*37)*.4});
        // where the painted neck ends and the body begins: buried in the smoke it drags and the flames of its mane
        const pb=pts[3], qx_=pb.x-hp.x, qy_=(pb.y-pb.z)-(hp.y-hp.z), ql=Math.hypot(qx_,qy_)||1, jx=qx_/ql, jy=qy_/ql, kx=-fd_*.74*HW, kz=-.66*s, ex=hx+kx*co+kz*si, ez=hz-(kx*si-kz*co), nl=Math.hypot(jx*.8,jy*.8-.6)||1;
        if(!F.low) F.bill(m.ctS,ex+jx*s*.62,hp.y,ez-jy*s*.62,s*.95,s*.62,Math.atan2(-jy,-jx),{a:.95*hk,t0:sd+5});
        tongue(ex-jx*s*.1,hp.y,ez+jy*s*.1+s*.1,s*1.05,jx*.8/nl,(jy*.8-.6)/nl,{...C,t0:sd+11,a:.95*hk,gain:2.3}); tongue(ex+jx*s*.25,hp.y,ez-jy*s*.25-s*.12,s*.85,jx*.9/nl,(jy*.9-.35)/nl,{...CD,t0:sd+13,a:.95*hk,gain:2.2}); }
      // embers shed along its length
      for(let e=0;e<2;e++){ const p=pts[(Math.random()*(N-4))|0]; if(p.w>4) GFX.pt({x:p.x+rand(-40,40),y:p.y,z:p.z+rand(-40,40),vx:rand(-90,90),vy:rand(-40,40),vz:rand(-60,220),g:120,drag:.8,life:rand(.4,.9),s:rand(2.5,6.5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); } }); }
  // ---- release: it comes up through the circle
  after(1.87,()=>{ dr.stop(.1); SFX.roar(1.8,1); spot.hold=0; spot.life=.3; hitstop=Math.max(hitstop,.06); Cn.shake(1); post.ca=.012; Cn.zoom(.86); Cn.cam(null);
    GFX.ambient(.52,.36,.34,30); after(.14,()=>GFX.ambient(.3,.3,.42,5));
    K.burst(x0,y0,{s:420,pal:PG,smoke:2,no:['crack']}); K.flame(x0,y0,{s:680,dur:.8,pal:PD,light:0}); K.flame(x0,y0,{s:400,dur:.6,pal:PF,light:0}); ringFire(x0,y0,{r0:120,r:SR*1.25,h:260,dur:.55,pal:PD});
    GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7}); K.debris(x0,y0,{n:18,r:180,sp:[250,1100],up:1600,size:22}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); GFX.light(x0,y0,hw*1.6,PG.l,1.1,.5,{z:240}); });
  // ---- it chooses: a cold mark on the floor where it will go in
  after(4.1,()=>{ dive=t; Cn.cam(cx,cy-BODY,9); Cn.zoom(.9); GFX.ambient(.3,.3,.38,8); SFX.roar(1.2,1); Cn.SND.inhale(.42,.7);
    K.sigil(cx,cy,{r:500,dur:1.5,in:.3,out:.4,spin:1.4,pal:PS,tex:CIRC()}); GFX.light(cx,cy,800,PS.l,.6,.2,{hold:.4,z:60});
    for(let i=0;i<2;i++) K.shock(cx,cy,{r0:820-i*240,r:60,dur:.36,delay:i*.12,pal:PS,gain:.6,light:0,dust:0,painted:0,haze:.5,th:.7}); });
  // ---- climax: one held breath, then it pours into the floor and the floor gives the fire back
  after(4.44,()=>{ GFX.ambient(.3,.3,.36,40); hitstop=Math.max(hitstop,.07); });
  after(4.52,()=>{ hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.8); SFX.boom(2.2,1); Cn.SND.hit(1); SFX.roar(1.6,.8);
    GFX.ambient(.62,.42,.34,40); after(.18,()=>GFX.ambient(.4,.33,.38,3));
    K.burst(cx,cy,{s:hw*.72,pal:PG,smoke:3,no:['crack']}); K.art(cx,cy,{tex:'fx3_burst',s:hw*.52,asp:1.39,z:280,dur:.8,pal:PD,gain:.9,hold:.3,s0:.5,rot:.4}); K.flame(cx,cy,{s:940,dur:1.15,pal:PF,light:0}); K.flame(cx,cy,{s:540,dur:.9,pal:PG,light:0,gain:.9});
    crater(cx,cy,hw*.86,{life:6.5}); K.crack(cx,cy,{r:hw*1.02,pal:PG,life:5,grow:.14,gain:1.1}); K.shock(cx,cy,{r:hw*2.4,dur:.9,pal:PF,gain:.7,delay:.1,light:0,painted:0,dust:0});
    GFX.ripple(cx,cy,hw*2,{life:.6,s:.9}); K.dome(cx,cy,{r:hw*.8,dur:.45,pal:PD,gain:.7}); K.debris(cx,cy,{n:26,r:160,sp:[300,1400],up:1900,size:24}); K.dust(cx,cy,{n:20,r:120,sp:[500,1400],a:.5});
    K.sparks(cx,cy,80,{pal:PG,n:50,sp:[600,2400],up:1800,life:[.4,1]}); GFX.light(cx,cy,hw*2.4,PG.l,1.35,1,{z:300});
    // the fire it carried comes back up through the floor: two crowns of geysers, running outward
    for(let ring=0;ring<2;ring++){ const n=ring?8:6, r=hw*(ring?.86:.44); for(let i=0;i<n;i++){ const a=i/n*TAU+ring*.3+rand(-.1,.1), gx=cx+Math.cos(a)*r, gy=cy+Math.sin(a)*r*FSY, dl=.12+ring*.2+i*.024, sz=ring?rand(320,430):rand(400,500);
        K.flame(gx,gy,{s:sz,dur:rand(.9,1.3),pal:ring?PD:PF,delay:dl,light:0}); after(dl,()=>{ if(!ring) K.art(gx,gy,{tex:'v3_xburst',s:sz*.5,z:30,dur:.2,pal:PG,hold:.15,s0:.5}); K.sparks(gx,gy,20,{pal:PF,n:7,sp:[150,600],up:1500}); if(i%3===0) K.debris(gx,gy,{n:4,r:40,sp:[200,600],up:1100}); });
        if(i%3===0) K.flame(gx,gy,{s:rand(130,180),dur:rand(1.4,2),pal:PF,delay:dl+.7,light:0}); } }
    Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}); });
  // ---- afterglow
  after(5.1,()=>{ for(let i=0;i<5;i++){ const a=rand(0,TAU), r=rand(0,480); K.smoke(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{s:rand(260,400),dur:rand(1.3,1.9),delay:i*.08,a:.6,c:'#160c0a',c2:'#4a2a22'}); }
    K.embers(cx,cy,hw*.85,{pal:PF,n:60,life:2.4,up:320}); GFX.ambient(.8,.7,.68,1.6); });
  after(5.5,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(6.15,()=>{ done=true; sig.dead=true; ultStop(); }); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
