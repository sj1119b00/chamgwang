// 참광 survival - K3: the effect kit on FX3 (lit floor + mesh materials) and GFX (particles, lights, refraction).
// Every piece is layered the way a painted effect is: a dark outer body, a saturated colour mass, a thin white-hot core,
// then light on the floor, heat haze, sparks and what it leaves behind. Loaded by surv.js after gfx.js.
'use strict';
(()=>{
const F=window.FX3, K={}; window.K3=K;
const FSY=.58, PI=Math.PI, TAU_=PI*2;
const eo3=k=>1-(1-k)*(1-k)*(1-k), eo5=k=>1-Math.pow(1-k,5), sat=v=>Math.max(0,Math.min(1,v)), mix=(a,b,k)=>a+(b-a)*k, R=(a,b)=>a+Math.random()*(b-a);
K.eo3=eo3; K.eo5=eo5; K.sat=sat; K.mix=mix;
// palettes: d dark outer mass, b saturated body, m mid-hot (between body and core), h hot core, l light on the floor, s spark
K.PAL={
  crimson:{d:'#2a0009',b:'#ff0a28',m:'#ffb66a',h:'#fff6ea',l:'#ff2440',s:'#ff9aa8'},
  gold:{d:'#3a1c00',b:'#ffa010',m:'#ffe27a',h:'#fffbe8',l:'#ffc040',s:'#ffe9a0'},
  violet:{d:'#16032e',b:'#8a2cff',m:'#d9a0ff',h:'#f6eeff',l:'#a060ff',s:'#d9b8ff'},
  azure:{d:'#02162e',b:'#109cff',m:'#8ae6ff',h:'#effaff',l:'#40c0ff',s:'#b8ecff'},
  jade:{d:'#021f16',b:'#0fd88a',m:'#b4ffc0',h:'#effff8',l:'#30ffb0',s:'#b8ffe0'},
  flame:{d:'#300600',b:'#ff3c06',m:'#ffc030',h:'#fff8dc',l:'#ff7a20',s:'#ffd090'},
  silver:{d:'#070a14',b:'#aab8d8',m:'#e4ecff',h:'#ffffff',l:'#b9c6ff',s:'#e0e8ff'},
};
const pal=p=>typeof p==='string'?K.PAL[p]:(p||K.PAL.crimson);
K.pal=pal;
const TEX=['v3_pillar','v3_scorch','v3_dustring','v3_orb','v3_circ_mage','v3_circ_fist','v3_circ_shaman','v3_circ_pyro','fx_circle_arcane','fx_circle_seal','v3_slash_thin','v3_slash_heavy','v3_thrust','v3_spin_ring','v3_circ_blade','v3_fissure','v3_gash','v3_xburst','fx3_burst','fx3_shock','fx3_smoke','fx3_slash','fx3_fire','fx3_bolt','fx3_tornado','fx3_beam','fx_crack','fx_gash'];
K.pre=()=>{ if(F&&F.on){ for(const t of TEX) F.img(t); F.img('v3_curtain',{repeat:true}); for(const t of ['meteor','sword']) F.img(t); } };
// a point of a tilted local frame in world coordinates (x, floor y, height)
K.at=(M,x,y,z,lx,ly,lz)=>[x+M[0]*lx+M[4]*ly+M[8]*lz,y+(M[1]*lx+M[5]*ly+M[9]*lz)*FSY,z+M[2]*lx+M[6]*ly+M[10]*lz];

// ---------------------------------------------------------------- materials (built once)
let MT=null;
function mats(){ if(MT) return MT; const m=F.mat; MT={
  // slash: smoke-dark outer body, streaked colour mass, white core hugging the outer edge
  slU:m({nz:'wisp',n1:[1.2,1.4,-.6,0],n2:[1.5,1.5,-.3,.1],dist:.14,nk:.9,ero:.25,soft:.3,pm:[5,.5,.9,.5],fd:[.25,.02,0,0],cA:'#000000',cB:'#000000',cC:'#000000',op:1,a:.3}),
  slB:m({nz:'streak',n1:[1.2,6,-1.6,0],n2:[1.5,2,-.7,0],dist:.05,nk:1,pw:1.7,ero:.2,soft:.16,pm:[5,.6,.95,1.3],fd:[.3,.015,0,0],rk:[.5,1.2],gain:2.2,bgain:1.2}),
  slW:m({nz:'wisp',n1:[1.4,1.6,-1,0],n2:[1.5,2,-.5,0],dist:.12,nk:1,pw:1.5,ero:.3,soft:.2,pm:[5,.5,.95,.7],fd:[.3,.02,0,0],rk:[.8,1.4],gain:1,bgain:.7}),
  slC:m({nz:'streak',n1:[1,1.2,-2,0],n2:[2,2,-.9,0],dist:.04,nk:.45,ero:.3,soft:.14,pm:[5,.9,.25,5],fd:[.4,.01,0,0],rk:[.25,.7],gain:3.6,bgain:1.5}),
  // floor shock: a sharp leading ring and a streaked wake behind it
  shL:m({nz:'fbm',n1:[10,.4,0,0],n2:[3,1,.1,0],dist:.03,nk:.5,ero:.14,soft:.2,pm:[2,2.2,0,0],rk:[.5,1.05],gain:2.6,bgain:1.2,layer:'g'}),
  shW:m({nz:'wisp',n1:[5,.6,0,.5],n2:[4,1,0,.2],dist:.08,nk:1,pw:1.3,ero:.2,soft:.3,pm:[1,1.6,.25,0],rk:[.7,1.3],gain:1.4,bgain:.9,layer:'g'}),
  shD:m({nz:'fbm',n1:[8,.4,0,0],pm:[2,1,0,0],nk:.3,ero:.05,soft:.4,gain:.05,layer:'d'}),
  // pillar / wall of light: streaks racing upward, fading with height
  piB:m({nz:'wisp',n1:[1.5,.5,0,-1.6],n2:[2,1,0,-.7],dist:.08,nk:.95,ero:.1,soft:.3,fd:[0,0,.02,.7],rk:[.45,.9],gain:2.6,bgain:1.1}),
  piC:m({nz:'streak',n1:[.5,2,0,-2.4],n2:[2,1,0,-1],dist:.04,nk:.5,ero:.1,soft:.25,fd:[0,0,0,.85],rk:[.15,.5],gain:4.5,bgain:2.2}),
  waB:m({tex:'v3_curtain',texO:{repeat:true},nz:'wisp',n1:[1,.5,0,-1.2],n2:[1.2,.9,.05,-.9],dist:.08,mdist:1,nk:.5,ero:.12,soft:.35,fd:[.06,.06,0,.35],pm:[4,.8,.003,0],rk:[.62,1.15],gain:2.4,bgain:1.05,op:.55}),
  waC:m({tex:'v3_curtain',texO:{repeat:true},nz:'billow',n1:[2,.6,0,-2],n2:[1.6,1.2,-.04,-1.5],dist:.06,mdist:1,nk:.6,pw:1.8,ero:.3,soft:.25,fd:[.1,.1,0,.5],pm:[4,3,.003,0],rk:[.4,1],gain:2.8,bgain:1.4,op:.25}),
  waS:m({tex:'v3_curtain',texO:{repeat:true},nz:'wisp',n1:[1,.5,0,-.7],n2:[1.1,.8,.04,-.6],dist:.1,mdist:1,nk:.6,ero:.1,soft:.4,fd:[.06,.06,0,.3],cA:'#000000',cB:'#000000',cC:'#000000',op:1,a:.62}),
  plS:m({tex:'v3_pillar',nz:'wisp',n1:[1,.6,0,-.8],n2:[1.2,.7,.03,-.7],dist:.06,mdist:1,nk:.4,pw:.6,ero:.1,soft:.4,cA:'#000000',cB:'#000000',cC:'#000000',op:1,a:.5}),
  plB:m({tex:'v3_pillar',nz:'wisp',n1:[1,.5,0,-1.6],n2:[1.3,.6,.04,-1.4],dist:.05,mdist:1,nk:.35,pw:.8,ero:.08,soft:.3,rk:[.5,1.15],gain:2.6,bgain:1.1}),
  plC:m({tex:'v3_pillar',nz:'streak',n1:[.5,2,0,-2.6],n2:[1.5,.8,.02,-2],dist:.03,mdist:1,nk:.25,pw:1.6,ero:.16,soft:.25,rk:[.2,.75],gain:3.4,bgain:1.6}),
  shP:m({tex:'fx3_shock',nz:'wisp',n1:[2,2,.1,.1],n2:[1.5,1.5,.05,.04],dist:.03,mdist:1,nk:.3,ero:.1,soft:.3,rk:[.55,1.1],gain:2.4,bgain:1.1,layer:'g'}),
  shDu:m({tex:'v3_dustring',nz:'billow',n1:[2,2,.03,.02],n2:[1.5,1.5,.04,.03],dist:.04,mdist:1,nk:.35,ero:.16,soft:.35,cA:'#0c0a10',cB:'#2a2630',cC:'#6a6272',rk:[.4,1],gain:1,op:1,a:.62,layer:'g'}),
  soot:m({tex:'v3_scorch',nk:0,pw:.7,ero:.1,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  // dome shell
  doB:m({nz:'veins',n1:[4,1.2,.15,-.5],n2:[3,2,0,.3],dist:.06,nk:1,ero:.1,soft:.25,pm:[4,1.1,.015,0],rk:[.4,.85],gain:2.6}),
  // floor decals
  sig:m({tex:'v3_circ_blade',nk:0,ero:.12,soft:.3,rk:[.55,1.25],gain:2.2,bgain:1.15,layer:'g'}),
  sigN:m({tex:'v3_circ_blade',nz:'veins',n1:[3,3,.05,.03],nk:.9,pw:1.3,ero:.1,soft:.3,rk:[.35,.8],gain:2.6,bgain:1.2,layer:'g'}),
  glowG:m({pm:[3,1.6,0,0],nk:0,ero:.0,soft:.6,rk:[.6,1],gain:1.2,layer:'g'}),
  glowO:m({pm:[3,2,0,0],nk:0,ero:.0,soft:.5,rk:[.35,.8],gain:3}),
  dark:m({pm:[3,.7,0,0],nk:0,ero:0,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  crD:m({tex:'v3_fissure',nk:0,pw:.32,ero:.26,soft:.3,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  crE:m({tex:'v3_fissure',nz:'fbm',n1:[2,2,.04,.03],nk:.5,pw:1.9,ero:.1,soft:.3,rk:[.5,1.1],gain:2.6,bgain:1.2,layer:'g'}),
  gaD:m({tex:'v3_gash',nk:0,pw:.3,ero:.26,soft:.3,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  gaE:m({tex:'v3_gash',nz:'fbm',n1:[3,1,.05,0],nk:.4,pw:1.7,ero:.1,soft:.3,rk:[.5,1.05],gain:2.8,bgain:1.2,layer:'g'}),
  crG:m({tex:'v3_fissure',nk:0,pw:.55,ero:.05,soft:.7,rk:[.9,1.4],gain:1,bgain:.5,layer:'g'}),
  gaG:m({tex:'v3_gash',nk:0,pw:.5,ero:.05,soft:.7,rk:[.9,1.4],gain:1,bgain:.55,layer:'g'}),
  // painted key art (grey on black) coloured through the ramp
  art:m({tex:'fx3_burst',nz:'fbm',n1:[2,2,0,0],nk:.0,ero:.1,soft:.35,rk:[.6,1.05],gain:3,bgain:1.1}),
  smB:m({tex:'v3_gash',nz:'fbm',n1:[4,1,-.6,0],n2:[3,1,-.4,0],dist:.02,mdist:1,nk:.35,pw:1.1,ero:.08,soft:.25,rk:[.45,1],gain:3,bgain:1.2}),
  // ribbon trail: bright spine, streaks along it
  trB:m({nz:'streak',n1:[1,.8,-2.2,0],n2:[2,1,-1,0],dist:.05,nk:.7,ero:.1,soft:.2,pm:[2,1.6,0,0],fd:[.5,.03,0,0],rk:[.4,.85],gain:3.4,bgain:1.2}),
  trC:m({nz:'streak',n1:[1,.5,-3,0],nk:.3,ero:.2,soft:.15,pm:[2,5,0,0],fd:[.5,.02,0,0],rk:[.15,.4],gain:5,bgain:2.5}),
}; return MT; }
K.mats=mats;
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});

// ---------------------------------------------------------------- particles
// sparks: thin hot streaks thrown from a point, with gravity. o: {n, sp:[lo,hi], up, life:[lo,hi], dir, spread, pal, s, g}
K.sparks=(x,y,z,o={})=>{ const P=pal(o.pal), n=Math.round((o.n||12)*(GFX.QK||1)), [s0,s1]=o.sp||[400,1300], [l0,l1]=o.life||[.25,.6];
  for(let i=0;i<n;i++){ const a=o.dir!=null?o.dir+R(-1,1)*(o.spread??.6):R(0,TAU_), s=R(s0,s1), hot=Math.random()<.45;
    GFX.pt({x,y,z,vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:R(.1,1)*(o.up??700),g:o.g??1700,drag:o.drag??1.2,life:R(l0,l1),s:(o.s||3)*R(.6,1.4),m:3,len:o.len||.045,c:GFX.rgb(hot?'#ffffff':P.s),c3:hot?'#ffffff':P.h,c2:P.b,L:3,bounce:o.bounce?.35:0}); } };
// embers: slow glowing motes that rise and wander
K.embers=(x,y,r,o={})=>{ const P=pal(o.pal), n=Math.round((o.n||20)*(GFX.QK||1));
  for(let i=0;i<n;i++){ const a=R(0,TAU_), d=Math.sqrt(Math.random())*r; GFX.pt({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,z:R(0,o.z??120),vx:R(-40,40),vy:R(-20,20),vz:R(60,o.up??260),g:-30,drag:.4,life:R(.9,o.life??2.4),s:R(2.5,6)*(o.s||1),m:8,c:GFX.rgb(Math.random()<.3?P.h:P.s),fade:'in',L:3}); } };
// petals: flat slivers of light that flutter down (the swordsman's signature)
K.petals=(x,y,r,o={})=>{ const P=pal(o.pal), n=Math.round((o.n||24)*(GFX.QK||1));
  for(let i=0;i<n;i++){ const a=R(0,TAU_), d=Math.sqrt(Math.random())*r; GFX.pt({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,z:R(o.z0??200,o.z1??900),vx:R(-160,160)+(o.wx||0),vy:R(-40,40),vz:R(-260,-90),g:0,drag:.3,life:R(1.2,o.life??2.8),s:R(10,22)*(o.s||1)*(Math.random()<.2?2.2:1),sx:R(.22,.5),rot:R(0,TAU_),vr:R(-9,9),m:8,c:GFX.rgb(Math.random()<.35?P.h:P.s),fade:'in',L:3}); } };
// debris: rock chips with shadows that bounce and settle
K.debris=(x,y,o={})=>{ const n=Math.round((o.n||14)*(GFX.QK||1)), [s0,s1]=o.sp||[250,900];
  for(let i=0;i<n;i++){ const a=R(0,TAU_), s=R(s0,s1); GFX.pt({x:x+Math.cos(a)*R(0,o.r||40),y:y+Math.sin(a)*R(0,o.r||40)*FSY,z:4,vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:R(.45,1)*(o.up??1300),g:2600,drag:.25,life:R(1.1,1.9),s:R(o.size0??5,o.size??17),rot:R(0,TAU_),vr:R(-10,10),m:11,b:'alpha',c:GFX.rgb(o.c||'#6a6276'),c2:'#0c0a10',shadow:true,bounce:.38,fk:5,L:2}); } };
// dust: soft puffs rolling outward along the floor
K.dust=(x,y,o={})=>{ const n=Math.round((o.n||12)*(GFX.QK||1)), [s0,s1]=o.sp||[200,620], c=GFX.rgb(o.c||'#3a3442');
  for(let i=0;i<n;i++){ const a=o.dir!=null?o.dir+R(-1,1)*(o.spread??.5):i/n*TAU_+R(-.2,.2), s=R(s0,s1); GFX.pt({x:x+Math.cos(a)*(o.r||0),y:y+Math.sin(a)*(o.r||0)*FSY,z:R(8,40),vx:Math.cos(a)*s,vy:Math.sin(a)*s*FSY,vz:R(20,130),g:0,drag:2.4,life:R(.6,o.life??1.3),s:R(34,70)*(o.s||1),grow:R(50,110),m:5,b:'alpha',c,c2:'#000000',c3:o.c3||'#5a5266',er:.9,ns:R(.9,1.6),w:1,a:o.a??.5,L:0}); } };

// ---------------------------------------------------------------- pieces
// SLASH: a tilted crescent that is swung, hangs for a breath, and burns away from the tail.
//  o: {r, w (band, fraction of r), a0, a1 (swing from a0 to a1, radians in its own plane), rx, ry, rz (tilt of that plane), pal, swing, hold, fade, sparks, light, gain}
K.slash=(x,y,z,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), r=o.r||400, w=o.w??.5, sw=o.swing??.09, hold=o.hold??.08, fade=o.fade??.3, life=sw+hold+fade, M=F.xf({rx:o.rx||0,ry:o.ry||0,rz:o.rz||0}), a0=o.a0??-1.2, a1=o.a1??1.2, g=o.gain||1, C=col(P), seed=Math.random()*9;
  let last=a0;
  GFX.add(life,(k,t)=>{ const hk=eo5(sat(t/sw)), head=mix(a0,a1,hk), tk=sat((t-sw*.5)/(life-sw*.5)), tail=mix(a0,a1,tk*tk*.55), f=sat((t-sw-hold)/fade), rr=r*(1+.07*f+.04*hk), al=1-f*f;
    F.lathe(m.slU,x,y,z,{r0:rr*(1-w*1.3),r1:rr*1.05,a0:tail,a1:head,M,a:al*(o.dark??1),ero:.1+f*.5,t0:seed});
    F.lathe(m.slW,x,y,z,{r0:rr*(1-w*1.15),r1:rr,a0:tail,a1:head,M,...C,ero:.2+f*.7,t0:seed+3});
    F.lathe(m.slB,x,y,z,{r0:rr*(1-w),r1:rr,a0:tail,a1:head,M,...C,gain:1.5*g,ero:.16+f*.75,t0:seed});
    F.lathe(m.slC,x,y,z,{r0:rr*(1-w*.5),r1:rr*1.004,a0:tail,a1:head,M,...C,gain:3.6*g,ero:.3+f*.7,t0:seed});
    // sparks peel off the edge the blade is passing
    if(o.sparks!==0&&hk<1){ for(let i=0;i<3;i++){ const a=mix(last,head,Math.random()), p=K.at(M,x,y,z,Math.cos(a)*rr,Math.sin(a)*rr,0); K.sparks(p[0],p[1],p[2],{pal:P,n:2,dir:a,spread:.5,sp:[300,1100],up:300,life:[.15,.4]}); } }
    last=head; },o.delay||0);
  if(o.light!==0){ const mid=(a0+a1)/2, p=K.at(M,x,y,z,Math.cos(mid)*r*.7,Math.sin(mid)*r*.7,0); const L=()=>GFX.light(p[0],p[1],r*1.6,P.l,(o.light??1),life*.8,{z:p[2]}); if(o.delay) after(o.delay,L); else L(); } };

// CRES: a painted crescent stroke laid on a tilted plane in the world: it is drawn tip to tip in the direction of the swing,
// hangs for a breath, and burns away from the tail. The painting's crescent bulges to its left (the cutting edge).
//  o: {reach (from the swordsman to the cutting edge) or s (half height), dir (floor angle the edge faces), lean (0 flat on the floor .. .9 almost facing the camera), roll (one tip up, the other down), tex, pal, swing, hold, fade, ccw, gain, z, asp}
const ART={fx3_slash:{asp:1.47,piv:[.62,.5],edge:.07,rk:[.55,1.02]},v3_slash_thin:{asp:1.78,piv:[.8,.5],edge:.02,rk:[.5,1]},v3_slash_heavy:{asp:1.5,piv:[.74,.5],edge:.02,rk:[.72,1.3]}};
K.ART=ART;
K.cres=(x,y,z,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), tex=o.tex&&F.ready(o.tex)?o.tex:'fx3_slash', A=ART[tex]||ART.fx3_slash, asp=o.asp||A.asp, s=o.reach?o.reach/((A.piv[0]-A.edge)*2*asp):(o.s||300), sw=o.swing??.07, hold=o.hold??.08, fade=o.fade??.3, life=sw+hold+fade, C=col(P), g=o.gain||1, dir=o.dir||0, ccw=o.ccw?1:-1;
  const mt=F.mat({...m.art,tex,layer:'o',nz:'wisp',n1:[1.5,1.5,.4*ccw,.1],n2:[1.2,1.2,.2,.1],dist:.025,mdist:1,rk:o.rk||A.rk}), sd=Math.random()*9;
  // the painting faces -x; turn it so its edge faces dir
  const rz=dir+PI, cx=x+Math.cos(dir)*s*asp*(A.piv[0]-.5)*2*(o.off??1), cy=y+Math.sin(dir)*s*asp*(A.piv[0]-.5)*2*FSY*(o.off??1);
  GFX.add(life,(k,t)=>{ const hk=eo5(sat(t/sw)), f=sat((t-sw-hold)/fade), ss=s*(1+.1*f+.05*hk), tail=f*1.25;
    // uv pivot; in texture space the crescent runs from the top tip (angle +100deg) round the left to the bottom tip
    const aw=[A.piv[0],A.piv[1],ccw>0?.8:-.8,ccw], aw2=[.06+hk*.8,tail*.62,.22,1];
    F.quad(mt,cx,cy,ss*asp,ss,0,{z,M:F.xfw({sx:ss*asp,sy:ss,rx:-(o.lean??.3),ry:o.roll||0,rz}),...C,a:1-f*f,gain:3*g,bgain:1.1,ero:.1+f*.3,nk:.18+f*.25,aw,aw2,t0:sd}); },o.delay||0);
  const fx=()=>{ if(o.light!==0) GFX.light(x+Math.cos(dir)*s*.6,y+Math.sin(dir)*s*.6*FSY,s*2.6,P.l,o.light??1,life*.8,{z});
    if(o.sparks!==0) K.sparks(x+Math.cos(dir)*s*.8,y+Math.sin(dir)*s*.8*FSY,z,{pal:P,n:o.sparks||10,dir,spread:1.1,sp:[400,1500],up:400,life:[.15,.45]}); };
  if(o.delay) after(o.delay,fx); else fx(); };

// SHOCK: a wave racing over the floor (under the characters): the painted front, a sharp leading ring, its wake, rolling dust, heat haze.
//  o: {r, r0 (start; larger than r = implosion), dur, pal, gain, dust (0 = none), painted (0 = lines only), light, haze, th}
K.shock=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), Rm=o.r||600, dur=o.dur||.55, C=col(P), g=o.gain||1, sd=Math.random()*9, rot=R(0,TAU_), big=o.painted!==0&&Rm>(o.r0||30)&&Rm>=260;
  GFX.add(dur,(k)=>{ const e=eo3(k), r=mix(o.r0||30,Rm,e), th=mix(.3,.1,k)*Rm*(o.th||1), a=(1-k)*(1-k);
    if(big&&o.dust!==0) F.quad(m.shDu,x,y,r*1.16,r*1.16,rot+1,{a:Math.min(1,a*2.2)*.62,ero:.16+k*.5,t0:sd});
    F.ring(m.shW,x,y,Math.max(0,r-th*2.6),r,{...C,a:a*.75,gain:1.4*g,t0:sd});
    if(big) F.quad(m.shP,x,y,r*1.12,r*1.12,rot,{...C,a:Math.min(1,a*1.8),gain:2.4*g,ero:.1+k*.55,t0:sd});
    F.ring(m.shL,x,y,r-th*.3,r+th*.12,{...C,a:Math.min(1,a*1.6),gain:2.6*g,t0:sd});
    if(!(GFX.calm&&GFX.calm())) F.ring(m.shD,x,y,Math.max(0,r-th*2),r+th,{a:a*(o.haze??.8),gain:.06}); },o.delay||0);
  if(o.light!==0) GFX.light(x,y,Rm*1.1,P.l,o.light??.9,dur*.8);
  if(o.dust!==0) K.dust(x,y,{n:o.dust||12,r:(o.r0||30)+20,sp:[Rm*.5,Rm*1.2],c:o.dc}); };

// PILLAR: a painted column of light standing on the floor: dark smoke edge, coloured sheath with ribbons spiralling up, white-hot core,
// a flare and scorch at its foot. It holds for a breath, then burns away from the ground upward. o: {r (core half width), h, dur, hold, pal, rise}
K.pillar=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), r=o.r||80, h=o.h||1400, dur=o.dur||.7, hold=o.hold??dur*.35, C=col(P), g=o.gain||1, sd=Math.random()*9, rise=o.rise??.07, hw=r*4.2, flip=Math.random()<.5?[-1,1,1,0]:[1,1,0,0];
  GFX.add(dur,(k,t)=>{ const up=eo5(sat(t/rise)), f=sat((t-rise-hold)/Math.max(.01,dur-rise-hold)), hh=h*(.25+.75*up)/2, a=1-f*f*f, w=hw*(1+.12*Math.sin(t*40+sd))*(1-.35*f), cut=[0,0,f*1.1,.12];
    F.quad(m.soot,x,y,r*5,r*5,sd,{a:.6*sat(t*10)});
    F.quad(m.glowG,x,y,r*5.5,r*5.5,0,{...C,a:a*(.5+.5*up),gain:1.6*g,bgain:1});
    F.bill(m.plS,x,y,hh,w*1.5,hh*1.04,0,{a:a*.5,fd:cut,t0:sd,uvT:flip});
    F.bill(m.plB,x,y,hh,w*1.15,hh,0,{...C,a,gain:2.6*g,ero:.08+f*.35,fd:cut,t0:sd,uvT:flip});
    F.bill(m.plC,x,y,hh,w*.8,hh,0,{...C,a,gain:3.4*g,ero:.16+f*.5,fd:cut,t0:sd}); },o.delay||0);
  const fx=()=>{ if(o.light!==0) GFX.light(x,y,r*11,P.l,o.light??1.1,dur*.9,{z:200}); K.sparks(x,y,20,{pal:P,n:Math.round(r/5),sp:[200,900],up:h*.9,life:[.4,.9]}); };
  if(o.delay) after(o.delay,fx); else fx(); };

// WALL: fire erupting from a line on the floor (a cut opening): dark smoke behind, the flame curtain, a hot inner sheet, light
// spilling on the floor at its foot. pts: [{x,y,h}], o: {h, dur, pal, delay, rise, ord}
K.wall=(pts,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), h=o.h||900, dur=o.dur||.9, C=col(P), g=o.gain||1, sd=Math.random()*9, rise=o.rise??.14, n=pts.length, L=Math.hypot(pts[n-1].x-pts[0].x,(pts[n-1].y-pts[0].y)/FSY), ord=o.ord??0;
  const cx=(pts[0].x+pts[n-1].x)/2, cy=(pts[0].y+pts[n-1].y)/2, rot=Math.atan2((pts[n-1].y-pts[0].y)/FSY,pts[n-1].x-pts[0].x), jag=pts.map(()=>R(.72,1.12));
  GFX.add(dur,(k,t)=>{ const up=eo3(sat(t/rise)), f=sat((k-.3)/.7), a=1-f*f, hk=up*(1+.12*Math.sin(k*9+sd)), ur=Math.max(.5,L/(h*1.9));
    const P1=pts.map((q,i)=>({x:q.x,y:q.y,h:(q.h??h)*hk*1.18*jag[i]})), P2=pts.map((q,i)=>({x:q.x,y:q.y,h:(q.h??h)*hk*jag[i]*(1+.06*Math.sin(t*13+i*2.1+sd))})), P3=pts.map((q,i)=>({x:q.x,y:q.y,h:(q.h??h)*hk*.6*jag[i]}));
    if(o.licks!==0&&k<.6&&Math.random()<.75){ const i=1+Math.floor(Math.random()*(n-2)), q=pts[i], hh=(q.h??h)*hk*jag[i]; GFX.pt({x:q.x+R(-60,60),y:q.y,z:hh*R(.45,.8),vz:R(300,800),vx:R(-60,60),g:-200,drag:.6,life:R(.35,.7),s:R(22,50),m:5,b:'add',c:GFX.rgb(P.b),c2:P.d,c3:P.m||P.h,er:1,ns:R(1,1.6),w:1.6,a:.9,L:1}); }
    F.quad(m.glowG,cx,cy,L*.55,h*.2,rot,{...C,a:a*.55,gain:1.1,bgain:.8});
    F.wall(m.waS,P1,{a:a*(o.smoke??1),ero:.1+f*.5,uvT:[ur*.8,1,sd+.5,0],t0:sd,ord:ord-.2});
    F.wall(m.waB,P2,{...C,a,gain:2.4*g,ero:.12+f*.7,uvT:[ur,1,sd,0],t0:sd,ord});
    F.wall(m.waC,P3,{...C,a,gain:2.8*g,ero:.25+f*.6,uvT:[ur*1.3,1,sd+.37,0],t0:sd,ord:ord+.1}); },o.delay||0); };

// ARCWALL: fire standing on an arc of a floor circle round (x,y): a true curved wall, so its foot draws the same ellipse as a sigil
// under it. Height is graded round the ring: hb x at the far side (top of the screen), hf x at the near side, so it never hides its centre.
//  o: {r, a0, a1 (radians; -PI/2 is the far side), h, hb, hf, dur, pal, rise, gain, delay}
K.arcwall=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), r=o.r||400, h=o.h||900, dur=o.dur||1.2, C=col(P), g=o.gain||1, sd=Math.random()*9, rise=o.rise??.16, a0=o.a0??0, a1=o.a1??TAU_, lh=[o.hb??1,o.hf??.2], arc=Math.abs(a1-a0)*r, ur=Math.max(.35,arc/(h*1.9)), am=(a0+a1)/2, hm=h*mix(lh[0],lh[1],.5+.5*Math.sin(am));
  GFX.add(dur,(k,t)=>{ const up=eo3(sat(t/rise)), f=sat((k-.3)/.7), a=1-f*f, hk=up*(1+.1*Math.sin(k*9+sd));
    F.ring(m.shL,x,y,r-22,r+22,{a0,a1,...C,a:a*.9,gain:2.2*g,layer:'g',fd:[.08,.08,0,0],t0:sd});
    F.lathe(m.waS,x,y,0,{r0:r*1.03,r1:r*1.03,h0:0,h1:h*hk*1.18,a0,a1,lh,a:a*(o.smoke??1),ero:.1+f*.5,uvT:[ur*.8,1,sd+.5,0],t0:sd,ord:-1});
    F.lathe(m.waB,x,y,0,{r0:r,r1:r,h0:0,h1:h*hk,a0,a1,lh,...C,a,gain:2.4*g,ero:.12+f*.7,uvT:[ur,1,sd,0],t0:sd,ord:0});
    F.lathe(m.waC,x,y,0,{r0:r*.985,r1:r*.985,h0:0,h1:h*hk*.6,a0,a1,lh,...C,a,gain:2.8*g,ero:.25+f*.6,uvT:[ur*1.3,1,sd+.37,0],t0:sd,ord:.1});
    if(o.licks!==0&&k<.6&&Math.random()<.8){ const an=mix(a0,a1,Math.random()), hh=h*hk*mix(lh[0],lh[1],.5+.5*Math.sin(an)); GFX.pt({x:x+Math.cos(an)*r,y:y+Math.sin(an)*r*FSY,z:hh*R(.45,.85),vz:R(300,800),vx:R(-60,60),g:-200,drag:.6,life:R(.35,.7),s:R(20,46)*Math.min(1,hh/500+.4),m:5,b:'add',c:GFX.rgb(P.b),c2:P.d,c3:P.m||P.h,er:1,ns:R(1,1.6),w:1.6,a:.9,L:1}); } },o.delay||0);
  const fx=()=>{ if(o.light!==0) GFX.light(x+Math.cos(am)*r*.8,y+Math.sin(am)*r*.8*FSY,Math.max(arc,hm)*.9,P.l,o.light??.7,dur*.8,{z:160}); };
  if(o.delay) after(o.delay,fx); else fx(); };

// DOME: a shell of energy swelling from a point on the floor.
K.dome=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), Rm=o.r||500, dur=o.dur||.5, C=col(P), g=o.gain||1, sd=Math.random()*9;
  GFX.add(dur,(k)=>{ const e=eo3(k), r=mix(o.r0||40,Rm,e), a=(1-k)*(1-k);
    F.lathe(m.doB,x,y,0,{r0:r,r1:0,h0:0,h1:r*(o.hk??.8),dome:true,...C,a,gain:2.6*g,ero:.1+k*.6,t0:sd}); },o.delay||0); };

// SIGIL: a magic circle that writes itself onto the floor behind a leading spark, turns, and burns out.
//  o: {r, dur, in, out, spin, pal, tex}; returns a handle: r, a (brightness), pal (may be changed while alive), kick(), dead
K.sigil=(x,y,o={})=>{ const h={x,y,r:o.r||400,a:1,pal:o.pal,pk:-9,dead:false,kick(){ h.pk=RT; }}; if(!F.on) return h; const m=mats(), dur=o.dur||3, tin=o.in??.5, tout=o.out??.5, spin=o.spin??.25, g=o.gain||1, rot0=o.rot||0;
  const ma=o.tex?F.mat({...m.sig,tex:o.tex}):m.sig, mb=o.tex?F.mat({...m.sigN,tex:o.tex}):m.sigN;
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const P=pal(h.pal), C=col(P), i=sat(t/tin), out=sat((dur-t)/tout), pk=Math.max(0,1-(RT-h.pk)/.3), a=h.a*out*(1+pk*.8), rr=h.r*(.9+.1*eo3(i));
    F.quad(m.dark,h.x,h.y,rr*1.2,rr*1.2,0,{a:.7*Math.min(1,a)*i});
    F.quad(m.glowG,h.x,h.y,rr*1.3,rr*1.3,0,{...C,a:(.2+.5*pk)*a*i,gain:.6,bgain:.5});
    F.quad(ma,h.x,h.y,rr,rr,rot0+t*spin,{...C,a:a*.9,gain:2.2*g,rv:[i*1.5,.25,0,.1]});
    F.quad(mb,h.x,h.y,rr,rr,rot0+t*spin,{...C,a:a*(.45+.3*Math.sin(t*5)),gain:2.6*g,rv:[i*1.5,.25,0,.1]});
    if(i<1){ const an=t*11+rot0, lr=rr*i*.98; F.quad(m.glowG,h.x+Math.cos(an)*lr,h.y+Math.sin(an)*lr*FSY,rr*.16,rr*.16,0,{...C,a:1,gain:3,bgain:2,rk:[.3,.7]}); if(Math.random()<.5) K.sparks(h.x+Math.cos(an)*lr,h.y+Math.sin(an)*lr*FSY,6,{pal:P,n:1,sp:[100,400],up:400,life:[.2,.4],s:2}); } },o.delay||0);
  return h; };

// CRACK: the floor breaks open around a point: dark fracture, light inside it that cools over the life.
K.crack=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), r=o.r||420, life=o.life||4, C=col(P), rot=o.rot??R(0,TAU_), grow=o.grow??.18, g=o.gain||1, sd=[R(0,1),R(0,1)];
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/grow)), heat=Math.pow(1-k,1.6), out=sat((1-k)/.25);
    F.quad(m.soot,x,y,r*.95,r*.95,rot,{a:.6*out*i});
    F.quad(m.crD,x,y,r,r,rot,{a:out,rv:[i*1.3,.3,0,.1]});
    F.quad(m.crG,x,y,r,r,rot,{...C,a:heat*.8,rv:[i*1.25,.35,0,.1]});
    F.quad(m.crE,x,y,r,r,rot,{...C,a:Math.min(1,heat*1.4),gain:2.6*g*(.5+.5*heat),ero:.12+.5*(1-heat),rv:[i*1.25,.35,0,.1]}); },o.delay||0); };

// GASH: a straight wound in the floor between two points: soot around it, a deep dark split, light at its lips that cools from the ends inward.
K.gash=(x1,y1,x2,y2,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), life=o.life||4, w=(o.w||60)*R(.85,1.2), C=col(P), dx=x2-x1, dy=(y2-y1)/FSY, L=Math.hypot(dx,dy), rot=Math.atan2(dy,dx)+(Math.random()<.5?PI:0), cx=(x1+x2)/2, cy=(y1+y2)/2, grow=o.grow??.1, g=o.gain||1, uv=Math.random()<.5?[1,-1,0,1]:[1,1,0,0];
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/grow)), heat=Math.pow(1-k,1.5), out=sat((1-k)/.25), cool=.1+.38*k;
    F.quad(m.soot,cx,cy,L*.56*i,w*1.5,rot,{a:.55*out});
    F.quad(m.gaD,cx,cy,L/2*i,w,rot,{a:out,uvT:uv});
    F.quad(m.gaG,cx,cy,L/2*i,w,rot,{...C,a:heat*.8,uvT:uv,fd:[cool,cool,0,0]});
    F.quad(m.gaE,cx,cy,L/2*i,w,rot,{...C,a:Math.min(1,heat*1.4),gain:2.8*g*(.5+.5*heat),ero:.1+.5*(1-heat),uvT:uv,fd:[cool,cool,0,0]}); },o.delay||0); };

// ART: painted key art (grey on black) coloured by the palette; upright by default, o.floor lays it on the ground.
//  o: {tex, s (half size), dur, pal, z, rot, floor, layer, asp, s0, hold}
K.art=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), dur=o.dur||.5, s=o.s||300, C=col(P), g=o.gain||1, rot=o.rot||0, mt=F.mat({...m.art,tex:o.tex||'fx3_burst',layer:o.layer||(o.floor?'g':'o')}), asp=o.asp||1;
  const uvT=o.flip?[-1,1,1,0]:[1,1,0,0], tilt=o.rx!=null||o.ry!=null||o.rz!=null;
  GFX.add(dur,(k)=>{ const e=eo5(k), ss=s*mix(o.s0??.45,1,e), f=sat((k-(o.hold??.35))/(1-(o.hold??.35))), a=1-f*f*f;
    if(tilt) F.quad(mt,x,y,ss*asp,ss,0,{z:o.z||0,M:F.xf({sx:ss*asp,sy:ss,rx:o.rx||0,ry:o.ry||0,rz:o.rz||0}),...C,a,gain:3*g,ero:.1+f*.7,nk:f*.9,uvT});
    else if(o.floor) F.quad(mt,x,y,ss*asp,ss,rot,{...C,a,gain:3*g,ero:.1+f*.7,nk:f*.9,uvT});
    else F.bill(mt,x,y,(o.z||0)+ss*(o.lift??.8),ss*asp,ss,rot,{...C,a,gain:3*g,ero:.1+f*.7,nk:f*.9,uvT}); },o.delay||0); };

// TRAIL: a ribbon of light through fixed world points (a dash cut hanging in the air). pts: [{x,y,z}], o: {w, dur, pal, draw (seconds to draw it), hold}
K.trail=(pts,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), dur=o.dur||.5, w=o.w||40, C=col(P), g=o.gain||1, sd=Math.random()*9, draw=o.draw??.06, n=pts.length;
  GFX.add(dur,(k,t)=>{ const d=sat(t/draw), f=sat((t-draw-(o.hold||0))/(dur-draw-(o.hold||0))), cnt=Math.max(2,Math.round(n*d)), ps=[];
    for(let i=0;i<cnt;i++){ const u=i/(n-1), tp=Math.pow(Math.sin(PI*Math.min(1,u*1.02)),.5); ps.push({x:pts[i].x,y:pts[i].y,z:pts[i].z||0,w:w*tp*(1-f*.6)}); }
    F.ribbon(m.trB,ps,{...C,gain:3.4*g,ero:.1+f*.8,t0:sd,a:1-f*f});
    F.ribbon(m.trC,ps,{...C,gain:5*g,ero:.2+f*.8,t0:sd,a:1-f}); },o.delay||0); };

// SEAM: a cut left hanging in the air: torn open in one bright stroke, then it hums as a jagged tear of light with sparks running
// along it and a line of light on the floor beneath, until told to go (h.end()). h.kick() makes it pulse. o: {z, w, pal, max}
K.seam=(x1,y1,x2,y2,o={})=>{ const h={on:true,t1:-1,pk:-9,end(){ if(h.t1<0) h.t1=RT; },kick(){ h.pk=RT; }}; if(!F.on) return h; const m=mats(), P=pal(o.pal), w=o.w||34, z=o.z??100, C=col(P), sd=Math.random()*9, n=12, draw=o.draw??.06, max=o.max||8, pts=[];
  for(let i=0;i<n;i++){ const u=i/(n-1); pts.push({x:mix(x1,x2,u),y:mix(y1,y2,u),z}); }
  const dx=x2-x1, dy=(y2-y1)/FSY, L=Math.hypot(dx,dy), rot=Math.atan2(dy,dx), cx=(x1+x2)/2, cy=(y1+y2)/2; let sp=0;
  GFX.add(max,(k,t)=>{ if(!h.on) return; const d=sat(t/draw), fl=sat(1-(t-draw)/.25), out=h.t1<0?0:sat((RT-h.t1)/.12), pk=Math.max(0,1-(RT-h.pk)/.25); if(out>=1){ h.on=false; return; }
    const cnt=Math.max(2,Math.round(n*d)), ps=[], hum=.85+.15*Math.sin(t*31+sd), en=Math.max(fl,pk*.85), wk=(.5+.5*en)*(1+out*2);
    for(let i=0;i<cnt;i++) ps.push({x:pts[i].x,y:pts[i].y,z,w:w*wk});
    const u1=(cnt-1)/(n-1);
    // its light on the floor, straight below: this is what makes it hang in the air
    F.quad(m.gaG,cx,cy,L/2*d,w*2.2,rot,{...C,a:(.35+.5*en)*(1-out),bgain:.5});
    F.ribbon(m.smB,ps,{...C,gain:(2+2.6*en)*(1+out*2),bgain:1.1+.5*en,ero:.2-.12*en,t0:sd,a:(.7+.3*en)*hum*(1-out),uvT:[u1,1,0,0],ulen:0});
    if(!(GFX.calm&&GFX.calm())) F.ribbon(m.shD,ps.map(q=>({x:q.x,y:q.y,z,w:w*2})),{layer:'d',a:.5*(1-out),gain:.03});
    if(d>=1&&RT-sp>.06){ sp=RT; const q=pts[Math.round(Math.random()*(n-1))], a=Math.atan2(y2-y1,x2-x1)+(Math.random()<.5?0:PI); K.sparks(q.x,q.y,z,{pal:P,n:1+Math.round(pk*3),dir:a,spread:.15,sp:[500,1500],up:60,g:300,life:[.15,.35],s:2}); if(Math.random()<.35) K.sparks(q.x,q.y,z,{pal:P,n:1,sp:[0,60],up:-10,g:900,life:[.3,.5],s:2}); } });
  return h; };

// SMOKE: a painted cloud that rolls up and thins out (dark, alpha blended; tint with o.c)
K.smoke=(x,y,o={})=>{ if(!F.on) return; const m=mats(), dur=o.dur||1.4, s=o.s||260, c=o.c||'#16121c', mt=F.mat({...m.art,tex:'fx3_smoke',layer:'o',nz:'billow',n1:[1.5,1.5,.05,-.12],n2:[1.2,1.2,.03,-.1],dist:.05,mdist:1,op:1,cA:c,cB:c,cC:o.c2||'#3a3340',rk:[.3,1],gain:1,bgain:1}), sd=Math.random()*9, flip=Math.random()<.5;
  GFX.add(dur,(k)=>{ const e=eo3(k), ss=s*mix(.5,1.25,e), f=sat((k-.3)/.7);
    F.bill(mt,x+(o.vx||0)*k,y,(o.z||0)+ss*.6+(o.rise??s*.6)*e,ss*1.5,ss,0,{fd:[.12,.12,.12,.12],a:(o.a??.8)*(1-f*f)*sat(k*8),ero:.22+f*.55,nk:.3+f*.6,t0:sd,uvT:flip?[-1,1,1,0]:[1,1,0,0]}); },o.delay||0); };

// BURST: an explosion standing in the world: a white flash of needles, the painted fireball swelling and tearing apart, smoke
// rolling up after it, a shock ring and haze on the floor, sparks and rock. o: {s, pal, z, parts:{flash,ball,smoke,shock,sparks,debris,crack}}
K.burst=(x,y,o={})=>{ if(!F.on) return; const P=pal(o.pal), s=o.s||300, z=o.z||0, on=k=>!(o.no&&o.no.includes(k)), g=o.gain||1;
  const fx=()=>{ if(on('flash')) K.art(x,y,{tex:'v3_xburst',s:s*1.15,z:z-s*.3,dur:.22,pal:P,gain:1.1*g,hold:.15,s0:.5});
    if(on('ball')) K.art(x,y,{tex:'fx3_burst',s:s,asp:1.39,z:z-s*.25,dur:o.dur||.6,pal:P,gain:g,hold:.25,s0:.4,rot:R(-.3,.3)});
    if(on('smoke')) for(let i=0;i<(o.smoke??2);i++) K.smoke(x+R(-.3,.3)*s,y+R(-.1,.1)*s,{s:s*R(.6,.9),z,dur:R(1.1,1.7),delay:.12+i*.08,a:.7,rise:s*.8});
    if(on('shock')&&z<80){ K.shock(x,y,{r:s*2.3,dur:.5,pal:P,gain:g}); GFX.ripple(x,y,s*2.4,{life:.45,s:.7}); }
    if(on('sparks')) K.sparks(x,y,z+30,{pal:P,n:Math.round(s/12),sp:[s*1.5,s*5],up:s*3,life:[.3,.8]});
    if(on('debris')&&z<80) K.debris(x,y,{n:Math.round(s/28),r:s*.3,sp:[s*.8,s*3],up:s*4});
    if(on('crack')&&z<80) K.crack(x,y,{r:s*1.25,pal:P,life:o.scar||4});
    GFX.light(x,y,s*4.5,P.l,1.2*g,.45,{z:z+60}); };
  if(o.delay) after(o.delay,fx); else fx(); };

// BOLT: painted lightning standing from the floor to the sky; it strikes in two flickering drawings.
K.bolt=(x,y,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal||'violet'), h=o.h||1300, w=o.w||h*.34, dur=o.dur||.32, C=col(P), g=o.gain||1, mt=F.mat({...m.art,tex:'fx3_bolt',layer:'o',rk:[.5,1]}), flip=Math.random()<.5;
  const fx=()=>{ GFX.add(dur,(k)=>{ const fr=k<.22?0:k<.5?1:2, a=fr===1?.55:1-Math.max(0,k-.5)*2, f=sat((k-.5)/.5);
      F.bill(mt,x,y,h/2,w*(fr?1.08:1),h/2,0,{...C,a,gain:3.4*g,ero:.08+f*.7,nk:f,uvT:(flip!==(fr===1))?[-1,1,1,0]:[1,1,0,0]});
      F.quad(m.glowG,x,y,w*1.4,w*1.4,0,{...C,a:a*.9,gain:1.6}); });
    GFX.light(x,y,h*.9,P.l,1.3*g,dur*1.2,{z:120}); K.sparks(x,y,10,{pal:P,n:14,sp:[300,1300],up:900,life:[.2,.5]}); if(o.crack!==0) K.crack(x,y,{r:w*.9,pal:P,life:3}); };
  if(o.delay) after(o.delay,fx); else fx(); };

// FLAME: a painted tongue of fire standing on the floor, pulled upward by scrolling distortion. Returns a handle {x,y,s,dead}.
K.flame=(x,y,o={})=>{ const h={x,y,s:o.s||260,a:1,dead:false}; if(!F.on) return h; const m=mats(), P=pal(o.pal||'flame'), dur=o.dur||1.2, C=col(P), g=o.gain||1, sd=Math.random()*9, flip=Math.random()<.5,
    mt=F.mat({...m.art,tex:'fx3_fire',layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.09,mdist:1,rk:[.55,1.05]});
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/.12), f=sat((k-.6)/.4), ss=h.s*(.6+.4*eo3(i));
    F.quad(m.glowG,h.x,h.y,ss*.9,ss*.9,0,{...C,a:.8*(1-f)*h.a,gain:1.3});
    F.bill(mt,h.x,h.y,(o.z||0)+ss*.92,ss*.58,ss,0,{...C,a:(1-f*f)*h.a,gain:3*g,ero:.1+f*.6,nk:.35+f*.5,t0:sd,pm:[4,.5,.004,0],uvT:flip?[-1,1,1,0]:[1,1,0,0]}); },o.delay||0);
  if(o.light!==0) GFX.light(x,y,(o.s||260)*3,P.l,.9,dur*.8,{z:100}); return h; };

// BEAM: a painted beam between two points in the air (z heights), streaming along its length. Returns a handle with a (alpha) and the end points.
K.beam=(x1,y1,z1,x2,y2,z2,o={})=>{ const h={x1,y1,z1,x2,y2,z2,a:1,w:o.w||90,dead:false}; if(!F.on) return h; const m=mats(), P=pal(o.pal||'azure'), dur=o.dur||.6, C=col(P), g=o.gain||1, sd=Math.random()*9,
    mt=F.mat({...m.art,tex:'fx3_beam',texO:{repeat:false},layer:'o',nz:'streak',n1:[2,1,-3,0],n2:[2,1,-2,0],dist:.03,mdist:1,nk:.35,rk:[.5,1]});
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/.06), f=sat((k-.7)/.3), ps=[], n=10; for(let q=0;q<n;q++){ const u=q/(n-1); ps.push({x:mix(h.x1,h.x2,u),y:mix(h.y1,h.y2,u),z:mix(h.z1,h.z2,u),w:h.w*(.4+.6*i)*(1-f*.7)*(1+.08*Math.sin(t*50+q))}); }
    F.ribbon(mt,ps,{...C,a:h.a*(1-f),gain:3.2*g,ero:.1+f*.5,t0:sd}); },o.delay||0);
  return h; };

// DROP: a painted thing (colour image with alpha: meteor, sword, rock) falling from the sky onto a point, its shadow closing in under it.
//  o: {img, s (half height), h0 (start height), dur, rot, vx (sideways drift start), tint, land()}
K.drop=(x,y,o={})=>{ if(!F.on){ if(o.land) after(o.dur||.5,o.land); return; } const m=mats(), dur=o.dur||.5, s=o.s||200, h0=o.h0||1800, im=F.img(o.img||'meteor'), asp=o.asp||1,
    mt=F.mat({kind:2,tex:o.img||'meteor',nz:'fbm',n1:[2,2,0,0],ero:-1,soft:.01,cB:o.tint||'#ffffff',cC:'#ffffff',gain:o.gain||1.1,op:1}), sh=F.mat({...m.dark});
  GFX.add(dur,(k)=>{ const e=k*k, z=h0*(1-e), dx=(o.vx||0)*(1-e);
    F.quad(sh,x,y,s*(1.6-e*.7),s*(1.6-e*.7),0,{a:.25+.5*e});
    F.bill(mt,x+dx,y,z+s*(o.lift??1),s*asp,s,o.rot||0,{}); },o.delay||0);
  if(o.land) after((o.delay||0)+dur,o.land); };

// PIC: a painted colour image (with alpha) standing in the world or lying on the floor: summons, weapons, bodies.
// It burns in and out through the noise. Returns a handle {x,y,z,s,a,rot,dead} that may be moved every frame.
//  o: {img, s (half height), asp, dur, in, out, tint, edge (colour of the burning edge), flip, floor, add}
K.pic=(x,y,z,o={})=>{ const h={x,y,z,s:o.s||300,a:1,rot:o.rot||0,dead:false}; if(!F.on) return h; const dur=o.dur||1, tin=o.in??.15, tout=o.out??.25, asp=o.asp||1,
    mt=F.mat({kind:2,tex:o.img,nz:'fbm',n1:[2.5,2.5,0,.1],cB:o.tint||'#ffffff',cC:o.edge||'#ffffff',gain:o.gain||1,op:o.add?0:1,layer:o.floor?'g':'o'});
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/tin), out=sat((dur-t)/tout), ero=Math.max(1-i,1-out)*1.05-.05;
    if(o.floor) F.quad(mt,h.x,h.y,h.s*asp,h.s,h.rot,{a:h.a,ero,soft:.08});
    else F.bill(mt,h.x,h.y,h.z,h.s*asp,h.s,h.rot,{a:h.a,ero,soft:.08,uvT:o.flip?[-1,1,1,0]:[1,1,0,0]}); },o.delay||0);
  return h; };

// FLARE: a soft hot glow in the air (the muzzle of a cut, a glint on the hilt)
K.flare=(x,y,z,o={})=>{ if(!F.on) return; const m=mats(), P=pal(o.pal), dur=o.dur||.25, s=o.s||160, C=col(P);
  GFX.add(dur,(k)=>{ const a=(1-k)*(1-k); F.bill(m.glowO,x,y,z,s*(1+k*.6)*(o.sx||1),s*(1+k*.6)*(o.sy||1),0,{...C,a,gain:(o.gain||3)}); },o.delay||0); };
// options: "reduce flashes and shake" stops refraction and softens the kit; "effect quality: low" thins particles and floor lights
const OPT=()=>(RPG.api&&RPG.api.SV&&RPG.api.SV.opt)||{};
if(window.GFX){ GFX.calm=()=>!!OPT().calm; K.tune=()=>{ const low=!!OPT().lowfx; GFX.QK=low?.4:(typeof COARSE!=='undefined'&&COARSE?.7:1); if(F) F.low=low; }; K.tune(); }
if(F&&F.on) K.pre();
})();
