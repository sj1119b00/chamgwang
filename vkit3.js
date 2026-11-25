// 참광 survival - volume pieces of the kit (K3.v*), on VOL (vol3.js). Loaded by surv.js after vfx3.js.
// Each piece is a real volume marched by the shader: it has thickness, hides its own far side, is cut by the floor and is lit from
// the upper left. The old card pieces (K3.burst's fireball, K3.flame, K3.smoke, K3.wall) are rerouted here when volumes are available;
// pass {vol:0} to a piece to get the old picture back.
'use strict';
(()=>{
const K=window.K3, V=window.VOL, FSY=.58; if(!K||!V) return;
const sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5, R=(a,b)=>a+Math.random()*(b-a);
const ok=()=>V.on&&!(window.FX3&&FX3.noVol);
K.vok=ok;
// emission ramp and the colour of the cold body for a palette. Fire leaves grey-brown smoke; every other element leaves its own dark vapour.
const hx=c=>{ const r=GFX.rgb(c); return r; }, tohex=a=>'#'+a.map(v=>('0'+Math.round(sat(v)*255).toString(16)).slice(-2)).join('');
const VC={};
function vc(P){ const key=P.b+P.d; let c=VC[key]; if(c) return c; const b=hx(P.b), warm=b[0]>b[2]*1.3&&b[0]>b[1]*.9;
  c=VC[key]={cA:P.d,cB:P.b,cM:P.m||P.h,cC:P.h,
    cS:warm?'#241c18':tohex([b[0]*.1+.03,b[1]*.1+.03,b[2]*.12+.04]),
    cK:warm?'#9a8676':tohex([b[0]*.35+.2,b[1]*.35+.2,b[2]*.35+.22])}; return c; }
K.vc=vc;
const FIRE={smoke:.12,fire:.5,rim:0};
let SD=1; const seed=()=>(SD=(SD*7.31+1.7)%97);

// VBLAST: a fireball that swells out of the floor, splits into lumps with fire in the cracks, cools into a rising ball of smoke.
//  o: {s (radius of the fireball), z (height of its centre above the floor, default: sitting on it), pal, dur, heat (1 = normal),
//      smoke (0..1 how much body is left when the fire is out), rise, squash, delay}
K.vblast=(x,y,o={})=>{ if(!ok()) return; const P=K.pal(o.pal), C=vc(P), s=o.s||300, dur=o.dur||Math.max(.9,Math.min(1.9,.8+s/600)), sd=seed(), z0=o.z??s*.28, hk=o.heat??1, sm=o.smoke??1, rise=o.rise??s*.9, ft=o.fire??.36;
  GFX.add(dur,(k,t)=>{ const g=eo5(sat(t/.16)), cool=sat(t/ft), e=sat((t-.1)/(dur-.1)), r=(.34+.5*g)+.1*e;
    V.add('blast',x,y,z0+rise*e*e,{ex:s*1.25,ey:s*1.25,ez:s*1.1,pa:[r,(o.lump??.48)+.16*e,2.3+(o.freq||0),Math.min(.5,t*.7)],pb:[Math.max(0,1.75*hk*(1-cool*cool)),.85,o.squash||1,.3+.6*e],
      dens:(15-9*e)*(1-sat((k-.5)/.5))*(cool<1?1:sm),gain:1.7*(o.gain||1),seed:sd,smoke:sm,fire:.72,...C,...(o.c?{cS:o.c}:{}),...(o.c2?{cK:o.c2}:{}),amb:.2,key:1.25,rim:.32,glow:.7*(1-cool),ord:o.ord,band:o.band,btop:o.btop,lit:o.lit,flow:o.flow}); },o.delay||0); };

// VSMOKE: a ball of smoke that rolls upward and thins. o: {s, z, dur, rise, c, c2, a, vx, delay}
K.vsmoke=(x,y,o={})=>{ if(!ok()) return; const s=o.s||260, dur=o.dur||1.5, sd=seed(), rise=o.rise??s*.7;
  GFX.add(dur,(k,t)=>{ const e=eo3(k), r=.4+.45*e;
    V.add('blast',x+(o.vx||0)*k,y,(o.z||0)+s*.35+rise*e,{ex:s,ey:s,ez:s*.9,pa:[r,.55+.1*k,2.2,.2+k*.25],pb:[0,1,1,.4+.5*k],dens:(10-5*k)*(o.a??.8)*sat(k*7)*(1-sat((k-.4)/.6)),seed:sd,smoke:1,fire:1,cS:o.c||'#1c1716',cK:o.c2||'#7e6f66',amb:.22,key:1.2,rim:.3,glow:0,steps:20,lit:o.lit,flow:o.flow}); },o.delay||0); };

// VCOLUMN: a pillar of fire (or of any element) standing on the floor, twisting, breaking into tongues at the top.
//  o: {r, h, dur, rise (seconds to full height), pal, twist, turb, heat, delay} -> handle {x,y,a,r,h,dead}
K.vcolumn=(x,y,o={})=>{ const H={x,y,a:1,r:o.r||90,h:o.h||600,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||1.2, sd=seed(), rise=o.rise??.16, out=o.out??.3;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/rise)), f=sat((t-(dur-out))/out), hh=H.h/2;
    V.add('column',H.x,H.y,hh,{ex:H.r*2.2,ey:H.r*2.2,ez:hh,pa:[.46*(1-.3*f),o.taper??.5,o.freq||2.6,o.speed||3.4],pb:[(o.heat??1.2)*(1-.5*f),o.twist??2,(o.turb??.6)+f*.5,up*(1-f*.55)],
      dens:10*H.a*(1-f*f),gain:1.6*(o.gain||1),seed:sd,...FIRE,cS:P.d,...C,cS:P.d,ord:o.ord,band:o.band,btop:o.btop,lit:o.lit,flow:o.flow}); },o.delay||0);
  return H; };

// VFUNNEL: a hollow twister. o: {r (top radius), r0 (foot radius), h, dur, pal, spin, sway, thick, heat, delay} -> handle {x,y,a,r,h,dead}
K.vfunnel=(x,y,o={})=>{ const H={x,y,a:1,r:o.r||200,h:o.h||560,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||2, sd=seed(), rise=o.rise??.3, out=o.out??.4;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/rise)), f=sat((t-(dur-out))/out), hh=H.h/2*(.35+.65*up), rr=H.r*1.3;
    V.add('funnel',H.x,H.y,hh,{ex:rr,ey:rr,ez:hh,pa:[(o.r0??H.r*.2)/rr,.72*(.6+.4*up),(o.thick??.16)*(1-.4*f),o.spin??7],pb:[(o.heat??1.05)*(1-.4*f),o.freq||2.4,o.sway??.1,o.streak??.7],
      dens:10*H.a*(1-f*f)*sat(t*8),gain:1.6*(o.gain||1),seed:sd,...FIRE,...C,cS:P.d,ord:o.ord,band:o.band,btop:o.btop,lit:o.lit,flow:o.flow}); },o.delay||0);
  return H; };

// VORB: a ball of plasma: a veined shell turning round a white core. o: {r, dur, pal, spin, core, in, out, delay} -> handle {x,y,z,r,a,dead}
K.vorb=(x,y,z,o={})=>{ const H={x,y,z:z||0,a:1,r:o.r||100,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'violet'), C=vc(P), dur=o.dur||1.5, sd=seed(), tin=o.in??.15, out=o.out??.2;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const g=eo3(sat(t/tin)), f=sat((t-(dur-out))/out), rr=H.r*1.3*(.4+.6*g)*(1+.6*f);
    V.add('orb',H.x,H.y,H.z,{ex:rr,ey:rr,ez:rr,pa:[.68,.22,o.freq||2.6,o.spin??1.8],pb:[o.heat??.8,o.core??.2,1.1,.9],dens:7.5*H.a*(1-f),gain:.85*(o.gain||1),seed:sd,smoke:0,fire:.5,...C,ord:o.ord,band:o.band,btop:o.btop,lit:o.lit,flow:o.flow}); },o.delay||0);
  return H; };

// VRING: a torus of dust (or of fire with heat>0) rolling outward over the floor: the body of a shock wave.
//  o: {r (final radius), r0, dur, pal, heat, tube (thickness as a fraction of r), c, c2, delay}
K.vring=(x,y,o={})=>{ if(!ok()) return; const Rm=o.r||500, dur=o.dur||.9, sd=seed(), heat=o.heat||0, P=K.pal(o.pal), C=heat?vc(P):{}, tube=o.tube??.16, RB=Math.max(Rm,o.r0||0), r0=(o.r0??Rm*.15)/RB, r1=Rm/RB;
  GFX.add(dur,(k,t)=>{ const e=eo3(k), rr=mix(r0,r1,e)*.78, f=sat((k-.45)/.55);
    V.add('ring',x,y,RB*tube*.9,{ex:RB,ey:RB,ez:RB*tube*1.6,pa:[rr,tube*(.7+.6*e),o.freq||2.4,t*.8],pb:[heat*(1-k),.62,o.lump??.62,0],dens:9*(o.a??1)*(1-f*f)*sat(k*10),seed:sd,smoke:o.smoke??1,fire:.7,
      cS:o.c||'#2a2420',cK:o.c2||'#8a7868',...C,amb:.2,key:1.2,rim:.3,steps:20,ord:o.ord??-1e9,lit:o.lit,flow:o.flow}); },o.delay||0); };

// VJET: a stream of fire (breath, exhaust, a beam of ki) from (x,y,z) along the floor direction dir, optionally pitched up/down.
//  o: {len, r (radius at the far end), r0 (radius at the mouth), dur, pal, pitch, turb, speed, heat, in, out, delay} -> handle {x,y,z,dir,len,a,dead}
K.vjet=(x,y,z,dir,o={})=>{ const H={x,y,z:z||60,dir:dir||0,len:o.len||600,pitch:o.pitch||0,a:1,r:o.r||110,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||.8, sd=seed(), tin=o.in??.14, out=o.out??.22, rad=o.r||110;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const g=sat(t/tin), f=sat((t-(dur-out))/out), L=H.len/2, cd=Math.cos(H.dir), sn=Math.sin(H.dir), cp=Math.cos(H.pitch), rad=H.r, cold=o.heat===0;
    // the box centre sits half a length ahead of the mouth
    V.add('jet',H.x+cd*cp*L,H.y+sn*cp*L*FSY,H.z+Math.sin(H.pitch)*L,{ex:L,ey:rad*1.25,ez:rad*1.25,yaw:H.dir,pitch:H.pitch,pa:[(o.r0??rad*.25)/(rad*1.25),.8,o.freq||2.6,o.speed||5],pb:[(o.heat??1.2),o.turb??.6,.2+g*1.3,-.3+f*1.3],
      dens:10*H.a,gain:1.6*(o.gain||1),seed:sd,...FIRE,...C,cS:P.d,...(cold?{smoke:1,fire:1,rim:.3,cS:o.c||'#2a2420',cK:o.c2||'#8a7868'}:{}),ord:o.ord,band:o.band,btop:o.btop,lit:o.lit,flow:o.flow}); },o.delay||0);
  return H; };

// VSHEET: fire standing on a floor line from (x1,y1) to (x2,y2): a wall with real depth, ragged at the top.
//  o: {h, thick, dur, rise, pal, heat, turb, out, delay} -> handle {a,h,dead}
K.vsheet=(x1,y1,x2,y2,o={})=>{ const H={a:1,h:o.h||500,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||1.2, sd=seed(), rise=o.rise??.14, out=o.out??.35,
    dx=x2-x1, dy=(y2-y1)/FSY, L=Math.hypot(dx,dy)/2, yaw=Math.atan2(dy,dx), cx=(x1+x2)/2, cy=(y1+y2)/2, th=o.thick||Math.max(50,H.h*.17);
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/rise)), f=sat((t-(dur-out))/out), hh=H.h/2;
    V.add('sheet',cx,cy,hh,{ex:L,ey:th*1.6,ez:hh,yaw,pa:[.34*(1-.3*f),.98*up*(1-.5*f),o.freq||2.8,o.speed||3.4],pb:[(o.heat??1.05)*(1-.4*f),(o.turb??.85)+f*.4,Math.min(.2,th*1.4/L),0],
      dens:10*H.a*(1-f*f),gain:1.6*(o.gain||1),seed:sd,...FIRE,...C,cS:P.d,ord:o.ord,band:o.band,btop:o.btop,lit:o.lit,flow:o.flow}); },o.delay||0);
  return H; };

// ---------------------------------------------------------------- reroute the old card pieces
const _burst=K.burst, _flame=K.flame, _smoke=K.smoke, _wall=K.wall;
K._burst=_burst; K._flame=_flame; K._smoke=_smoke; K._wall=_wall;
K.burst=(x,y,o={})=>{ if(!ok()||o.vol===0) return _burst(x,y,o); const no=o.no||[], s=o.s||300;
  if(!no.includes('ball')){ const fx=()=>{ K.vblast(x,y,{s:s*.72,z:(o.z||0)+s*.2,pal:o.pal,gain:o.gain,smoke:no.includes('smoke')?.35:1,dur:(o.dur||.6)*2.1});
      if(!no.includes('shock')&&(o.z||0)<80&&s>=180&&!FX3.low) K.vring(x,y,{r:s*1.5,dur:.75,a:.8}); };
    if(o.delay) after(o.delay,fx); else fx(); }
  // the painted flash stays only as a two-frame hit of light: held longer it erodes into white blotches over the volume
  if(!no.includes('flash')){ const ft=o.ftex||K.btex(), fl=()=>K.art(x,y,{tex:ft,s:s*1.15,z:(o.z||0)-s*.3,dur:.13,pal:o.pal,gain:.8*(o.gain||1),hold:.5,s0:.6,rot:Math.random()*6.28}); if(o.delay) after(o.delay,fl); else fl(); }
  return _burst(x,y,{...o,no:[...no,'ball','smoke','flash']}); };
K.flame=(x,y,o={})=>{ if(!ok()||o.vol===0) return _flame(x,y,o); const s=o.s||260, P=K.pal(o.pal||'flame'), dur=o.dur||1.2;
  const H=K.vcolumn(x,y,{r:s*.3,h:s*2,dur,pal:P,rise:.12,out:dur*.35,twist:1.4,turb:.75,taper:.62,delay:o.delay,gain:o.gain}); H.s=s;
  // the old handle scaled by .s: keep that working
  GFX.add(dur,()=>{ H.r=H.s*.3; H.h=H.s*2; },o.delay||0);
  if(o.light!==0) GFX.light(x,y,s*3,P.l,.9,dur*.8,{z:100}); return H; };
K.smoke=(x,y,o={})=>{ if(!ok()||o.vol===0) return _smoke(x,y,o); return K.vsmoke(x,y,{...o,s:(o.s||260)*.8,c:null,c2:null}); };
K.wall=(pts,o={})=>{ if(!ok()||o.vol===0||pts.length<2) return _wall(pts,o); const P=K.pal(o.pal), h=o.h||900, dur=o.dur||.9, n=pts.length;
  // straight runs become one sheet each (at most three), so a bent wall still follows its line
  const cuts=n<=3?[0,n-1]:n<=6?[0,Math.floor((n-1)/2),n-1]:[0,Math.floor((n-1)/3),Math.floor((n-1)*2/3),n-1];
  for(let i=0;i<cuts.length-1;i++){ const a=pts[cuts[i]], b=pts[cuts[i+1]]; let hm=0; for(let j=cuts[i];j<=cuts[i+1];j++) hm=Math.max(hm,pts[j].h??h);
    K.vsheet(a.x,a.y,b.x,b.y,{h:hm*.8,pal:P,dur,rise:o.rise??.14,delay:o.delay,gain:o.gain,ord:o.ord?undefined:undefined}); }
  const cx=(pts[0].x+pts[n-1].x)/2, cy=(pts[0].y+pts[n-1].y)/2; after(o.delay||0,()=>GFX.light(cx,cy,Math.hypot(pts[n-1].x-pts[0].x,pts[n-1].y-pts[0].y)*.8+h*.5,P.l,.8,dur*.9,{z:h*.3})); };
})();

// ================================================================ kit update 8: shared parts for the redevelopment (2026-11-24)
// What a blow does to the enemy it lands on (knock, ehit, mark), residue that cools and breaks up (heat, cool, coolLine),
// and a beam that grows once and holds (ray). Needs only FX3 + GFX; the beam's end fire uses VOL when it is there.
(()=>{
const K=window.K3, F=window.FX3, V=window.VOL; if(!K||!F||!window.GFX) return;
const FSY=.58, PI=Math.PI, TAU_=PI*2, sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5, R=(a,b)=>a+Math.random()*(b-a), pal=K.pal;
const rgb=c=>typeof c==='string'?GFX.rgb(c):c, mixc=(a,b,k)=>{ a=rgb(a); b=rgb(b); return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k]; };
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
const hash=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
let M8=null;
function m8(){ if(M8) return M8; const m=F.mat, blk={cA:'#000000',cB:'#000000',cC:'#000000',op:1};
  const soot=tex=>m({tex,nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,...blk,layer:'g'}),
    bed=tex=>m({tex,nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'});
  M8={
    sS:soot('v3_scorch'),sB:bed('v3_scorch'),cS:soot('v3_fissure'),cB:bed('v3_fissure'),c2S:soot('v3_fissure_b'),c2B:bed('v3_fissure_b'),
    crS:soot('v3_crater'),crB:bed('v3_crater'),rS:soot('v3_scorch_ring'),rB:bed('v3_scorch_ring'),gS:soot('v3_gash'),gB:bed('v3_gash'),
    // molten pool: no picture, a crust of plates with light in the seams
    lS:m({pm:[3,.55,0,0],nz:'cells',n1:[2.6,2.6,0,0],nk:.5,ero:.1,soft:.3,...blk,layer:'g'}),
    lB:m({pm:[3,.8,0,0],nz:'veins',n1:[2.2,2.2,.02,.012],n2:[1.6,1.6,.015,.01],dist:.07,nk:1,pw:1.25,ero:.1,soft:.3,rk:[.3,.95],gain:2.6,bgain:1.2,layer:'g'}),
    gl:m({pm:[3,1.6,0,0],nk:0,ero:0,soft:.6,rk:[.6,1],gain:1.2,layer:'g'}),
    // the beam: dark body behind it, a hazy sheath, the streaming colour, the white thread
    yU:m({nz:'wisp',n1:[.9,1,-1.4,0],nk:.55,ero:.1,soft:.45,pm:[2,1.1,0,0],...blk,a:.5}),
    yO:m({nz:'wisp',n1:[.8,1.3,-2.4,0],n2:[1.3,1,-1,0],dist:.07,nk:.85,ero:.06,soft:.55,pm:[2,1.25,0,0],rk:[.7,1.6],gain:1.25,bgain:.85}),
    yB:m({nz:'streak',n1:[.7,3,-4.6,0],n2:[1.6,1,-2,0],dist:.03,nk:.5,ero:.1,soft:.22,pm:[2,2.1,0,0],rk:[.5,1.05],gain:2.8,bgain:1.15}),
    yC:m({nz:'streak',n1:[.6,1,-6.5,0],nk:.16,ero:.12,soft:.2,pm:[2,4.2,0,0],rk:[.12,.4],gain:5,bgain:2.4}),
    go:m({pm:[3,2,0,0],nk:0,ero:0,soft:.5,rk:[.35,.8],gain:3}),
    star:m({tex:'v3_xburst',nz:'fbm',n1:[2,2,0,0],nk:0,ero:.1,soft:.35,rk:[.5,1],gain:3,bgain:1.1}),
    strk:m({tex:'fx3_beam',nz:'streak',n1:[2,1,-3,0],nk:.3,ero:.1,soft:.3,rk:[.45,1],gain:3,bgain:1.2}),
    ring:m({nz:'fbm',n1:[10,.4,0,0],nk:.4,ero:.12,soft:.2,pm:[2,2,0,0],rk:[.45,1],gain:2.8,bgain:1.2,layer:'g'}),
  }; return M8; }

// ---------------------------------------------------------------- cooling
// HEAT: the colours of something cooling. k 0 = white-hot, .2 = the palette's own colour, .6 = a dull ember, 1 = out. -> {cA,cB,cM,cC,g}
//  (pass the colours to any FX3 material call and multiply your gain by g)
K.heat=(P,k)=>{ P=pal(P); const dk=mixc(P.d,'#000000',.35), emb=mixc(P.b,P.d,.62); k=sat(k);
  if(k<.2){ const u=k/.2; return {cA:P.b,cB:mixc(P.m,P.b,u*.7),cM:mixc(P.h,P.m,u),cC:mixc('#ffffff',P.h,u),g:mix(1.4,1.1,u)}; }
  if(k<.6){ const u=(k-.2)/.4; return {cA:mixc(P.b,P.d,u),cB:mixc(mixc(P.m,P.b,.7),emb,u),cM:mixc(P.m,P.b,u),cC:mixc(P.h,P.m,u),g:mix(1.1,.9,u)}; }
  const u=(k-.6)/.4; return {cA:P.d,cB:mixc(emb,dk,u),cM:mixc(P.b,emb,u),cC:mixc(P.m,P.b,.3+.7*u),g:mix(.9,.4,u)}; };
const KIND={scorch:['sS','sB'],crack:['cS','cB'],crack2:['c2S','c2B'],crater:['crS','crB'],ring:['rS','rB'],lava:['lS','lB']};
// what is left of a decal at life fraction k: [edge (radius it has crumbled back to), eat (erosion)]. Whole until .45, then the rim goes first.
const crumble=k=>{ const u=sat((k-.45)/.55); return [mix(1.08,.1,u*u*(3-2*u)),.1+.72*Math.pow(u,1.4)]; };
// chips and embers leaving the rim as it breaks (count follows time, not frames)
function shed(S,want,x,y,rx,ry,rot,edge,P,H,z){ while(S.n<want&&S.n<S.max){ S.n++; const a=R(0,TAU_), lx=Math.cos(a)*rx*edge*R(.8,1), ly=Math.sin(a)*ry*edge*R(.8,1), cr=Math.cos(rot), sr=Math.sin(rot), px=x+lx*cr-ly*sr, py=y+(lx*sr+ly*cr)*FSY;
    if(S.n%3) GFX.pt({x:px,y:py,z:R(2,14),vx:R(-50,50),vy:R(-20,20),vz:R(90,300),g:-40,drag:.7,life:R(.7,1.5),s:R(2.5,5.5),m:8,c:rgb(S.n%2?H.cM:H.cC),fade:'in',L:3});
    else GFX.pt({x:px,y:py,z:3,vx:R(-90,90),vy:R(-50,50),vz:R(160,420),g:1500,drag:.4,life:R(.5,.9),s:R(4,9),rot:R(0,TAU_),vr:R(-9,9),m:11,b:'alpha',c:rgb('#2a2630'),c2:'#07060a',fk:4,L:1}); } }
// COOL: residue on the floor that is born white-hot, cools through the palette's colour to a dull ember, and then breaks up from its rim
//  inward into chips and sparks (it never just fades). kind: scorch | crack | crack2 (three-branched) | crater | ring | lava (molten pool)
//  o: {kind, r, ry (depth radius, default r), rot, pal, life (2..4, default 3), hot (fraction of the life it still glows, .7), start (0..1: begin
//      already this far cooled), grow (seconds to spread), gain, light:0, shed:0 (no particles), delay} -> handle {dead} (set dead=true to remove)
K.cool=(x,y,o={})=>{ const h={dead:false}; if(!F.on) return h; const m=m8(), P=pal(o.pal), KD=KIND[o.kind]||KIND.scorch, ms=m[KD[0]], mb=m[KD[1]], r=o.r||260, ry=o.ry||r, rot=o.rot??R(0,TAU_), life=o.life||3, hot=o.hot??.7, st=o.start||0, grow=o.grow??.14, g=o.gain||1,
    S={n:0,max:o.shed===0?0:Math.min(46,Math.round(r/9)*(F.low?.5:1))}, lava=o.kind==='lava';
  GFX.add(life,(k,t)=>{ if(h.dead) return; const i=eo3(sat(t/grow)), hk=sat(st+(1-st)*k/hot), H=K.heat(P,hk), [edge,eat]=crumble(k), rr=r*i, ryy=ry*i, rim=edge*(1-.22*hk);
    F.quad(ms,x,y,rr*1.04,ryy*1.04,rot,{a:(lava?.92:.82)*sat(t/.06),ero:eat,rv:[edge+.04,.2,0,.1]});
    if(hk<1){ const a=Math.min(1,(1-hk)*3.2);
      if(!F.low) F.quad(m.gl,x,y,rr*1.15,ryy*1.15,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.5*a*(1-hk),gain:1.1*H.g,rv:[edge+.1,.5,o.kind==='ring'?.7:0,.3]});
      F.quad(mb,x,y,rr,ryy,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a,gain:2.7*g*H.g,bgain:1.2*H.g,ero:.08+.5*hk*hk+eat*.5,rv:[rim,.3,0,.1]}); }
    if(S.max){ const lo=hk<.5?t*2.2:0, br=sat((k-.45)/.55); shed(S,Math.floor(Math.min(S.max*.3,lo)+br*S.max*.7),x,y,rr,ryy,rot,br>0?edge:R(.2,.9),P,H); } },o.delay||0);
  if(o.light!==0&&st<.3){ const L=()=>GFX.light(x,y,r*1.7,P.l,.75,life*hot*.6,{z:40}); if(o.delay) after(o.delay,L); else L(); }
  return h; };
// COOLLINE: the same residue along a line on the floor (the track of a beam, the wound of a cut). It is drawn from the first point to the
//  second in `grow` seconds, cools, and breaks up from both ends toward the middle. o: {w (half width), pal, life, hot, start, grow, gain, shed:0, delay}
K.coolLine=(x1,y1,x2,y2,o={})=>{ const h={dead:false}; if(!F.on) return h; const m=m8(), P=pal(o.pal), life=o.life||3, hot=o.hot??.7, st=o.start||0, grow=o.grow??.12, w=o.w||70, g=o.gain||1, dx=x2-x1, dy=(y2-y1)/FSY, L=Math.hypot(dx,dy), rot=Math.atan2(dy,dx),
    uv=Math.random()<.5?[1,-1,0,1]:[1,1,0,0], S={n:0,max:o.shed===0?0:Math.min(40,Math.round(L/40)*(F.low?.5:1))};
  GFX.add(life,(k,t)=>{ if(h.dead) return; const i=eo3(sat(t/grow)), hk=sat(st+(1-st)*k/hot), H=K.heat(P,hk), u=sat((k-.45)/.55), eat=.1+.7*Math.pow(u,1.4), end=.02+.46*u*u, cx=x1+(x2-x1)*i*.5, cy=y1+(y2-y1)*i*.5, hl=L/2*i;
    if(!F.low) F.quad(m.sS,cx,cy,hl*1.06,w*1.7,rot,{a:.5*sat(t/.06),ero:eat,fd:[end,end,0,0]});
    F.quad(m.gS,cx,cy,hl,w,rot,{a:.9*sat(t/.06),ero:eat,uvT:uv,fd:[end,end,0,0]});
    if(hk<1){ const a=Math.min(1,(1-hk)*3.2), ce=Math.min(.49,end+.1+.3*hk);
      if(!F.low) F.quad(m.gl,cx,cy,hl*1.05,w*2.2,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.45*a*(1-hk),gain:H.g});
      F.quad(m.gB,cx,cy,hl,w,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a,gain:2.9*g*H.g,bgain:1.2*H.g,ero:.08+.5*hk*hk+eat*.5,uvT:uv,fd:[ce,ce,0,0]}); }
    if(S.max){ const want=Math.floor((hk<.5?Math.min(S.max*.3,t*3):S.max*.3)+u*S.max*.7); while(S.n<want){ S.n++; const q=u>0?(Math.random()<.5?end:1-end):R(.1,.9), px=x1+(x2-x1)*q, py=y1+(y2-y1)*q;
        GFX.pt({x:px+R(-w,w)*.4,y:py+R(-w,w)*.25,z:R(2,14),vx:R(-50,50),vy:R(-20,20),vz:R(90,300),g:-40,drag:.7,life:R(.7,1.5),s:R(2.5,5.5),m:8,c:rgb(S.n%2?H.cM:H.cC),fade:'in',L:3}); } } },o.delay||0);
  return h; };

// ---------------------------------------------------------------- the stable beam
// RAY: a beam from (x,y) at height z along the floor direction dir. Three layers of light (white thread, streaming colour, hazy sheath) over a
//  dark body; it GROWS ONCE to its length and holds it exactly (nothing about it is random per frame: the motion is noise flowing along it).
//  A steady flare at the mouth, a ball of fire and sparks at the far end, its light on the floor under it, and a molten track that stays
//  behind and cools when it stops. It ends by being cut off at the mouth: the last of it runs out to the tip.
//  The handle may be moved and turned every frame: {x,y,z,dir,w,a}; read x2,y2 (the tip) and cur (current length). h.end() stops it early.
//  o: {len, w (half width of the colour body), dur (seconds it holds, default 1.6), grow (.16), out (.3), pal, gain, scar:0 (no track), scarLife (3.2),
//      tip:0 (no end fire), light:0, delay}
K.ray=(x,y,z,dir,o={})=>{ const h={x,y,z:z??110,dir:dir||0,len:o.len||1400,w:o.w||70,a:1,x2:x,y2:y,cur:0,t1:-1,dead:false,end(){ if(h.t1<0) h.t1=RT; },tip(){ return [h.x2,h.y2]; }}; if(!F.on){ after((o.delay||0)+(o.dur||1.6),()=>{ h.dead=true; }); return h; }
  const m=m8(), P=pal(o.pal||'azure'), C=col(P), dur=o.dur||1.6, grow=o.grow??.2, out=o.out??.3, g=o.gain||1, sd=R(0,9), n=14, CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, CO={cA:P.d,cB:P.b,cM:P.b,cC:P.m},
    VC=K.vc?K.vc(P):null, vs=sd*3.1, st={ts:-1,sp:0,sx:null,sy:null,n:0,done:false,L1:null,L2:null};
  const scar=()=>{ if(st.done||o.scar===0) return; st.done=true; const c=Math.cos(h.dir), s=Math.sin(h.dir)*FSY, a=Math.min(h.cur*.3,h.w*1.6); if(h.cur>h.w*4) K.coolLine(h.x+c*a,h.y+s*a,h.x2,h.y2,{w:h.w*.95,pal:P,life:o.scarLife||3.2,grow:.01,start:.05}); };
  GFX.add((o.max||dur)+out+.05,(k,t)=>{ if(h.dead) return; if(st.ts<0) st.ts=RT-t; const te=h.t1>=0?Math.min(dur,h.t1-st.ts):dur, f=sat((t-te)/out);
    if(f>=1){ h.dead=true; return; } if(f>0) scar();
    const gk=eo3(sat(t/grow)), cur=h.len*gk, c=Math.cos(h.dir), s=Math.sin(h.dir), s0=cur*f*f, w=h.w*(1-.45*f), a=h.a*(1-f*f*f), br=1+.03*Math.sin(t*8.3+sd), on=sat(t/.05);
    h.cur=cur; h.x2=h.x+c*cur; h.y2=h.y+s*cur*FSY;
    const pts=k_=>{ const ps=[]; for(let i=0;i<n;i++){ const u=i/(n-1), d=mix(s0,cur,u), mouth=Math.pow(sat((i+.35)/2.2),.7), tipk=i===n-1?.5:i===n-2?.86:1; ps.push({x:h.x+c*d,y:h.y+s*d*FSY,z:h.z,w:w*k_*mouth*tipk*br}); } return ps; };
    const ul=h.w*16, mx=h.x+c*(s0+cur)/2, my=h.y+s*(s0+cur)/2*FSY, hl=Math.max(1,(cur-s0)/2);
    // its light lying on the floor straight under it: this is what puts it in the air
    F.ribbon(m.yO,pts(2.6).map(q=>({x:q.x,y:q.y,z:0,w:q.w})),{...CO,layer:'g',a:.5*a*on,gain:1.1*g,ulen:ul,t0:sd+5});
    if(o.scar!==0&&!st.done) F.quad(m.gB,mx,my,hl,w*.9,h.dir,{cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff',a:.9*a*on*gk,gain:2.6*g,ero:.16});
    F.ribbon(m.yU,pts(2.9),{a:.5*a*on,ulen:ul,t0:sd});
    F.ribbon(m.yO,pts(2.3),{...CO,a:.85*a*on,gain:1.25*g,ulen:ul,t0:sd});
    F.ribbon(m.yB,pts(1.3),{...C,a:a*on,gain:2.8*g,ero:.1+f*.35,ulen:ul,t0:sd});
    F.ribbon(m.yC,pts(.5),{...CW,a:a*on,gain:5*g,ero:.12+f*.4,ulen:ul*.8,t0:sd+2});
    // the mouth: a steady flare (two sizes, slow breath)
    const mb=1+.07*Math.sin(t*11+sd), mxp=h.x+c*s0, myp=h.y+s*s0*FSY;
    F.bill(m.go,mxp,myp,h.z,w*2.3*mb,w*2.3*mb,0,{...C,a:.8*a*on,gain:2.4*g});
    F.bill(m.go,mxp,myp,h.z,w*.9*mb,w*.9*mb,0,{...CW,a:a*on,gain:3*g});
    // the far end: a ball of fire where it lands, a hard star turning in it, sparks thrown back
    if(o.tip!==0){ const tb=1+.06*Math.sin(t*9.5+sd*2);
      if(VC&&V&&K.vok&&K.vok()) V.add('blast',h.x2,h.y2,h.z,{ex:w*3.4,ey:w*3.4,ez:w*3,pa:[.62*tb,.5,2.4,t*.9],pb:[1.55,.85,1,.5],dens:11*a*gk,gain:1.6*g,seed:vs,smoke:.3,fire:.72,...VC,amb:.2,key:1.25,rim:.32,glow:.7});
      F.bill(m.star,h.x2,h.y2,h.z,w*2.6*tb,w*2.6*tb,t*1.7+sd,{...C,a:.9*a*gk,gain:2.6*g,ero:.12+f*.5});
      F.bill(m.go,h.x2,h.y2,h.z,w*1.5*tb,w*1.5*tb,0,{...CW,a:a*gk,gain:2.6*g});
      F.quad(m.gl,h.x2,h.y2,w*5,w*5,0,{...C,a:.6*a*gk,gain:1.3*g});
      if(f<=0&&t-st.sp>.035){ st.sp=t; K.sparks(h.x2,h.y2,h.z,{pal:P,n:2,dir:h.dir+PI,spread:1.25,sp:[500,1500],up:520,life:[.2,.5],s:3}); } }
    // a turning beam scorches the floor its tip passes over
    if(o.scar!==0&&gk>=1&&f<=0){ if(st.sx==null){ st.sx=h.x2; st.sy=h.y2; } else if(st.n<26&&Math.hypot(h.x2-st.sx,(h.y2-st.sy)/FSY)>w*2.2){ st.n++; K.cool((h.x2+st.sx)/2,(h.y2+st.sy)/2,{kind:'scorch',r:w*2.4,pal:P,life:o.scarLife||3.2,start:.08,light:0}); st.sx=h.x2; st.sy=h.y2; } }
    if(o.light!==0){ if(!st.L1){ st.L1=GFX.light(h.x,h.y,h.w*7,P.l,.55,.3,{z:h.z}); st.L2=GFX.light(h.x2,h.y2,h.w*9,P.l,.75,.3,{z:h.z}); }
      if(f<=0){ st.L1.t=0; st.L2.t=0; } st.L1.x=h.x; st.L1.y=h.y; st.L2.x=h.x2; st.L2.y=h.y2; if(!GFX.lights.includes(st.L1)&&f<=0){ GFX.lights.push(st.L1,st.L2); } } },o.delay||0);
  const fx=()=>{ K.shock(h.x,h.y,{r:h.w*6,dur:.3,pal:P,dust:4,light:0,painted:0}); K.sparks(h.x,h.y,h.z,{pal:P,n:14,dir:h.dir,spread:.5,sp:[700,2200],up:300,life:[.15,.4],s:3}); };
  if(o.delay) after(o.delay,fx); else fx(); return h; };

// ---------------------------------------------------------------- what a blow does to an enemy
let kf=-1, kn=0;
// KNOCK: throw an enemy back (and up) so it reads: it slides `dist` world units away from a point (or along dir), tumbles in the air if `up`,
//  is stunned while it travels, drags dust behind it. Heavy enemies take a third, the boss does not move.
//  o: {from:[x,y] | dir (floor angle), dist (default 220; 120 a shove, 300 a blow, 500+ sent flying), up (launch speed: 900 a hop, 1500 = 1.5 bodies high, 2200 high), stun, fx:0}
K.knock=(e,o={})=>{ if(!e||e.dead) return; const D=e.d, wt=D.boss?0:D.heavy?.35:1; let ux, uy;
  if(o.dir!=null){ ux=Math.cos(o.dir); uy=Math.sin(o.dir)*FSY; } else { const f=o.from||[pl.x,pl.gy], dx=e.x-f[0], dy=e.y-f[1], l=Math.hypot(dx,dy)||1; ux=dx/l; uy=dy/l; }
  const dist=(o.dist??220)*wt; e.kx+=ux*dist*8; e.ky+=uy*dist*8; e.hdx=ux; e.hitT=RT; e.flash=1;
  if(o.up&&wt) e.vz=Math.max(e.vz,o.up*(D.heavy?.6:1));
  if(wt) e.stun=Math.max(e.stun,o.stun??Math.min(1,.18+dist/650+(o.up||0)/2400));
  if(kf!==RT){ kf=RT; kn=0; }
  if(o.fx!==0&&F.on&&dist>=110&&kn++<10){ const a=Math.atan2(uy/FSY,ux); K.dust(e.x,e.y,{n:3,dir:a,spread:.3,sp:[dist*1.5,dist*3.2],a:.42,s:.85,life:.8});
    for(let i=0;i<3;i++) GFX.pt({x:e.x+R(-20,20),y:e.y+R(-10,10),z:R(20,e.h*.8),vx:ux*dist*R(5,8),vy:uy*dist*R(5,8),vz:0,g:0,drag:7,life:R(.16,.28),s:R(2.5,4),m:3,len:.05,c:[1,1,1],c3:'#ffffff',c2:'#8890a8',L:3}); } };
// EHIT: the mark of a real blow on an enemy, sized to be read on a small body: a white-hot star on it, a streak through it along the blow,
//  a ring snapping out over the floor under it, sparks thrown the way the blow went. Use it for a skill's main hits (K3.hit stays for small ticks).
//  o: {pal | c ('#rrggbb'), pw (1 = normal, 1.6 = heavy), dir (floor angle of the blow; default away from the hero), ring:0, light:1}
K.ehit=(e,o={})=>{ if(!e||!F.on) return; const m=m8(), P=o.c?K.hpal(o.c):pal(o.pal), C=col(P), pw=o.pw||1, s=Math.max(125,e.h*.82)*pw, x=e.x, y=e.y, z=e.h*.5+e.z, dir=o.dir??Math.atan2((e.y-pl.gy)/FSY,e.x-pl.x), rot=R(0,TAU_), sa=Math.atan2(-Math.sin(dir)*FSY,Math.cos(dir)), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'};
  e.flash=1; e.hitT=RT; e.hdx=Math.cos(dir);
  GFX.add(.2,k=>{ const ee=eo5(k), a=1-k*k;
    if(o.ring!==0&&e.z<60){ const r=s*(.5+1.5*ee); F.ring(m.ring,x,y,r*.78,r,{...C,a:a*.8,gain:2}); }
    F.bill(m.strk,x+Math.cos(dir)*s*.5*ee,y+Math.sin(dir)*s*.5*ee*FSY,z,s*(1.1+1.2*ee),s*.26*(1-k*.6),sa,{...C,a,gain:2.3,ero:.1+k*.55});
    F.bill(m.star,x,y,z,s*(.5+.62*ee),s*(.5+.62*ee),rot,{...C,a,gain:2.1,ero:.14+k*.55});
    F.bill(m.go,x,y,z,s*.26*(1+ee*.6),s*.26*(1+ee*.6),0,{...CW,a:a*a,gain:2.4}); });
  K.sparks(x,y,z,{pal:P,n:Math.round(7*pw),dir,spread:.55,sp:[600,1700*pw],up:300,life:[.15,.42],s:3});
  if((o.light??(pw>=1.4))) GFX.light(x,y,s*4.5,P.l,.85,.22,{z}); };

// MARK: a status that stays on an enemy and can be set off. It follows the body, tints it, and is drawn large enough to read on a small sprite.
//  kinds: burn (flames climbing the body, embers) | shock (arcs snapping round it) | frost (a ring of ice at its feet, a pale shell)
//         seal (a turning circle hanging over its head) | brand (a sign glowing on its chest, a ring at its feet)
//  o: {dur (3), pal, s (size, 1), tex (seal/brand picture), max (stacks, 1), onEnd(e,h)} -> handle {e,kind,n (stacks),live(),pop(o),end()}
//  Marking again refreshes the time and adds a stack (up to max). h.pop() sets it off: a burst on the body sized by the stacks - then do your damage.
const MKD={burn:{pal:'flame',c:'#ff7a20'},shock:{pal:'violet',c:'#c9a4ff'},frost:{pal:'azure',c:'#a8ecff'},seal:{pal:'jade',c:'#5dffc0'},brand:{pal:'crimson',c:'#ff5a70'}};
const MST={}; let MKL=[];
function gst(tex,P,L=3){ const key=tex+P.b+P.h; let s=MST[key]; if(!s) s=MST[key]=GFX.st(tex?15:8,'add',{t:tex?GFX.img(tex).im:null,uv01:!!tex,c2:rgb(P.b),c3:rgb(P.h),L}); return s; }
['fx3_fire','v3_arc_h','v3_frost_ring','fx_circle_seal','v3_circ_blade'].forEach(n=>GFX.img(n));
const ST8=GFX.st(8,'add',{L:2}), ST2={};
K.mark=(e,kind,o={})=>{ if(!e||e.dead) return null; const D=MKD[kind]||MKD.seal; e.mk=e.mk||{}; let h=e.mk[kind]; const dur=o.dur??3;
  if(h&&h.live()){ h.t1=RT+dur; h.n=Math.min(o.max||h.max||1,h.n+1); h.kick=RT; e.mkT=h.t1; return h; }
  const P=pal(o.pal||D.pal), sd=R(0,9), s=o.s||1, tint=o.pal?pal(o.pal).l:D.c;
  h=e.mk[kind]={e,kind,n:1,max:o.max||1,t0:RT,t1:RT+dur,kick:RT,dead:false,P,fx:null,
    live(){ return !h.dead&&!e.dead&&RT<h.t1; },
    end(){ if(h.dead) return; h.dead=true; h.t1=Math.min(h.t1,RT); if(h.fx) h.fx.dead=true; if(e.mkC===tint) e.mkT=0; if(o.onEnd) o.onEnd(e,h); },
    // set it off: o {pw (extra size), quiet:1 (flash only, for the far end of a mass detonation)}
    pop(q={}){ if(h.dead) return e; const pw=(q.pw||1)*(1+.25*(h.n-1)), R0=Math.max(e.d.r*1.9,105)*s; h.end(); if(e.dead||!F.on) return e;
      K.ehit(e,{pal:P,pw:1.25*pw,ring:0,light:!q.quiet}); if(q.quiet) return e;
      K.art(e.x,e.y,{tex:kind==='frost'?'v3_frost_ring':K.btex(),s:R0*2*pw,z:e.z+e.h*.1,dur:.26,pal:P,gain:.9,hold:.3,s0:.5,rot:R(0,TAU_),floor:kind==='frost'});
      K.shock(e.x,e.y,{r:R0*3*pw,dur:.32,pal:P,dust:0,light:0,painted:0});
      K.sparks(e.x,e.y,e.h*.5+e.z,{pal:P,n:Math.round(10*pw),sp:[400,1500],up:900,life:[.2,.55],s:3}); return e; }};
  e.mkC=tint; e.mkT=h.t1;
  if(!F.on||!GFX.on) return h;
  MKL=MKL.filter(q=>q.live()&&q.fx&&GFX.fx.includes(q.fx)); if(MKL.length>=64) return h;
  MKL.push(h); let emT=0;
  const stF=kind==='burn'?gst('fx3_fire',P):kind==='shock'?gst('v3_arc_h',P):kind==='frost'?gst('v3_frost_ring',P,0):gst(o.tex||(kind==='brand'?'v3_circ_blade':'fx_circle_seal'),P), cB=rgb(P.m), cL=rgb(P.l), cH=rgb(P.h);
  const st2=ST2[P.b]||(ST2[P.b]=GFX.st(2,'add',{c2:rgb(P.b).map(v=>v*.4),c3:rgb(P.h),L:0}));
  h.fx=GFX.add(600,(k,t)=>{ if(!h.live()){ h.end(); return; } const x=e.x, y=e.y, z=e.z, H=e.h, R0=Math.max(e.d.r*1.9,105)*s*(1+.12*(h.n-1)), left=h.t1-RT, inn=eo5(sat(t/.16)), kk=Math.max(0,1-(RT-h.kick)/.22), out=sat(left/.22), a=out*(1+.6*kk), big=1+.3*(1-inn)+.22*kk, er=1-out;
    if(kind==='burn'){ const hh=H*.95*s*big*(1+.1*(h.n-1)), ph=RT*1.25+sd;
      GFX.floor(ST8,x,y,R0*1.5,null,0,cL,.55*a);
      GFX.bill(stF,x,y,z+hh*.86,hh*.62,hh,0,cB,a,er*.8,ph,1.5,.06);
      GFX.bill(stF,x+H*.1,y,z+hh*.62,-hh*.44,hh*.7,0,cB,a*.9,er*.8,ph*1.31+3,1.8,.07);
      if(t-emT>.11){ emT=t; GFX.pt({x:x+R(-30,30),y,z:z+R(H*.3,H*1.2),vx:R(-40,40),vy:0,vz:R(160,380),g:-60,drag:.5,life:R(.5,1),s:R(3,6),m:8,c:Math.random()<.4?cH:cB,fade:'in',L:3}); } }
    else if(kind==='shock'){ const q=Math.floor(RT*15)+sd*7, fl=.6+.4*hash(q*1.7);
      GFX.bill(ST8,x,y,z+H*.5,H*.75*big,H*.75*big,0,cL,.5*a*fl);
      for(let i=0;i<2+Math.min(2,h.n-1);i++){ const r1=hash(q+i*3.3), r2=hash(q*1.3+i*7.1), hw=R0*1.3*big*(.8+.4*r2); GFX.bill(stF,x+(r1-.5)*H*.3,y,z+H*(.2+.75*r2),hw*(r1<.5?-1:1),hw*.34,(r1-.5)*2.4,cB,a*fl,er*.8,q,1,0); }
      if(t-emT>.16){ emT=t; K.sparks(x,y,z+H*.5,{pal:P,n:1,sp:[300,900],up:300,life:[.1,.25],s:2}); } }
    else if(kind==='frost'){ const g=eo5(sat(t/.2));
      GFX.floor(stF,x,y,R0*1.7*g,null,sd,rgb(P.b),a,Math.max(1-g,er)*.9,0,1,0,2);
      GFX.floor(stF,x,y,R0*1.1*g,null,sd+2,cB,.55*a,Math.max(1-g,er)*.9,0,1,0,3);
      GFX.bill(ST8,x,y,z+H*.5,H*.7,H*.8,0,cL,.4*a*(.85+.15*Math.sin(RT*3+sd))); }
    else if(kind==='brand'){ const pu=1+.07*Math.sin(RT*6.5+sd), hw=H*.62*s*big*pu;
      GFX.floor(st2,x,y,R0*1.5,null,sd,cB,.9*a,.82,RT*.6+sd,.12,.05,2);
      GFX.bill(ST8,x,y,z+H*.55,hw*1.2,hw*1.2,0,cL,.5*a);
      GFX.bill(stF,x,y,z+H*.55,hw,hw,Math.sin(RT*1.3+sd)*.12,cB,a,er*.8,RT*.4+sd,1,.012); }
    else { const rr=R0*1.15*big, zz=z+H+75;
      GFX.floor(ST8,x,y,rr*1.1,null,0,cL,.4*a,0,0,0,0,zz);
      GFX.floor(stF,x,y,rr,null,RT*1.7+sd,cB,a,er*.8,RT*.3+sd,1,.008,zz);
      GFX.bill(ST8,x,y,zz-H*.3,rr*.16,H*.5,0,cL,.5*a); } });
  return h; };
// the live mark of a kind on an enemy (or null)
K.marked=(e,kind)=>{ const h=e&&e.mk&&e.mk[kind]; return h&&h.live()?h:null; };
// set off every live mark of a kind, nearest the hero first: fn(e,h) is called for each (do the damage there). Only the first `full` get the whole burst.
K.popAll=(kind,fn,o={})=>{ const L=RPG.surv.en.filter(e=>!e.dead&&K.marked(e,kind)).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.gy)-Math.hypot(b.x-pl.x,b.y-pl.gy)); let i=0;
  for(const e of L){ const h=e.mk[kind], n=h.n; h.pop({quiet:i>=(o.full??10),pw:o.pw}); if(fn) fn(e,{n,kind}); i++; } return L.length; };
})();

// ================================================================ kit update 9: detail parts for the ultimates (2026-11-25)
// rocks (detailed stone that rises with an overshoot and sheds soil), gather (ki drawn in from off screen, tightening shells),
// the divine (god rays, a parting sky, a halo of light lines, a giant figure of light and mist). All new: no old piece changes look.
(()=>{
const K=window.K3, F=window.FX3, V=window.VOL; if(!K||!F||!window.GFX) return;
const FSY=.58, PI=Math.PI, TAU_=PI*2, sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5, R=(a,b)=>a+Math.random()*(b-a), pal=K.pal;
const rgb=c=>typeof c==='string'?GFX.rgb(c):c, col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m}), vok=()=>!!(K.vok&&K.vok());
let M9=null;
function m9(){ if(M9) return M9; const m=F.mat, blk={cA:'#000000',cB:'#000000',cC:'#000000',op:1};
  M9={
    soot:m({tex:'v3_scorch',nz:'cells',n1:[3,3,0,0],nk:.5,pw:.75,ero:.1,soft:.4,...blk,layer:'g'}),
    pool:m({pm:[3,1.4,0,0],nz:'billow',n1:[2,2,.03,.02],nk:.35,ero:0,soft:.6,rk:[.55,1],gain:1.2,layer:'g'}),
    // a shell of ki tightening on the point: a ring band with flowing grain
    shell:m({nz:'streak',n1:[1.6,1.6,.25,-.35],n2:[1.4,1.4,-.12,.1],dist:.05,nk:.6,pw:1.3,ero:.12,soft:.25,rv:[.98,.14,.84,.16],rk:[.5,1.1],gain:2,bgain:1.05}),
    core:m({pm:[3,2.2,0,0],nz:'fbm',n1:[3,3,.4,-.3],nk:.25,ero:0,soft:.5,rk:[.3,.75],gain:3}),
    flash:m({pm:[3,1.6,0,0],nk:0,ero:0,soft:.5,rk:[.35,.8],gain:3}),
    // god ray: streaks falling down a cone of light, faded at both ends, with dust grain drifting in it
    ray:m({nz:'streak',n1:[5,.5,0,.5],n2:[3,1.5,.03,.25],dist:.05,nk:.85,pw:1.2,ero:.05,soft:.45,fd:[0,0,.3,.45],rk:[.45,1.05],gain:1.5,bgain:1}),
    rayG:m({nz:'grain',n1:[14,5,.02,.35],n2:[2,2,.02,.1],dist:.04,nk:1,pw:2.4,ero:.25,soft:.2,fd:[0,0,.2,.4],rk:[.3,.9],gain:2.4,bgain:1.3}),
    // the sky: a dark ring of cloud turning round a bright hole, its inner edge lit from the hole
    cloud:m({nz:'billow',n1:[2.6,2.6,0,0],n2:[1.8,1.8,.015,.02],dist:.16,nk:.95,pw:.8,ero:.12,soft:.45,rv:[1,.35,.34,.2],...blk,a:.78}),
    cloudL:m({nz:'billow',n1:[2.6,2.6,0,0],n2:[1.8,1.8,.015,.02],dist:.16,nk:1,pw:1.6,ero:.12,soft:.35,rv:[.62,.28,.3,.1],rk:[.5,1.1],gain:1.6,bgain:1}),
    // halo: a thin ring of light and a fan of light lines round it
    halo:m({nz:'fbm',n1:[6,.5,.1,0],n2:[4,1,.03,0],dist:.02,nk:.25,ero:.06,soft:.25,pm:[2,2.5,0,0],rk:[.3,.85],gain:3}),
    rays:m({nz:'fbm',n1:[56,.16,.0,-.06],n2:[3,1,0,.05],dist:.01,nk:1,pw:2.6,ero:.16,soft:.25,fd:[0,0,.2,.65],rk:[.35,.95],gain:2.6,bgain:1.2}),
    // flowing bands of mist (the robe's loose ends)
    mist:m({nz:'wisp',n1:[1.4,1,-.7,0],n2:[1.2,1,-.3,.1],dist:.12,nk:.9,ero:.2,soft:.4,pm:[2,1.3,0,0],fd:[.25,.3,0,0],rk:[.55,1.15],gain:1.3,bgain:.95}),
    shade:m({pm:[3,.9,0,0],nz:'billow',n1:[2,2,.02,.01],nk:.4,ero:.05,soft:.5,...blk,layer:'g',a:.55}),
  }; return M9; }
K.m9=m9;

// ---------------------------------------------------------------- 1. rocks
// ROCKS: a cluster of detailed stones (strata, chipped edges, top light, dark hollows, glowing cracks, moss/ore) that burst up through
//  the floor - 0 -> overshoot -> settle - shedding soil, pebbles and dust as they come, sitting in a scorched mound, and crumble at the end.
//  One call places the whole cluster: one big stone and smaller ones round it, sizes spread like real rubble.
//  o: {n (5), r (cluster radius, 260), s:[lo,hi] (stone height range in world units, [90,280]), kind ('rock' | 'crag' | 'slab' | 'spike' | 'boulder' | 'crystal'),
//      rock (stone colour '#57524e'), pal (crack light colour), glow (0..2 light in the cracks, 0), moss ('#rrggbb' or 0), ore (0..1 glints, .3),
//      strata (bands per height, 5), edge (chipped edge width .06), lean (outward lean, 1), squash (wider than tall, 1), a0,a1 (arc), rise (.26), over (.14),
//      stagger (.05), dur (2.4: from the first stone up to the start of the crumble), out (.5), spill (1: soil and pebbles), mound (1), shadow (2: shadows for the biggest N), delay}
//  -> handle {L (stones: {x,y,s}), dead, end() (crumble now)}
K.rocks=(x,y,o={})=>{ const H={L:[],dead:false,t1:-1,end(){ if(H.t1<0) H.t1=1; }}; if(!F.on) return H;
  const P=pal(o.pal), n=Math.max(1,Math.round((o.n||5)*(F.low?.6:1))), r=o.r??260, [s0,s1]=o.s||[90,280], kind=o.kind||'rock', alb=o.rock||'#57524e',
    rise=o.rise??.26, over=o.over??.14, dur=o.dur||2.4, out=o.out??.5, a0=o.a0??0, a1=o.a1??TAU_, m=m9(), nsh=o.shadow??2, glow=o.glow||0, solids=F.solids&&F.solids();
  for(let i=0;i<n;i++){ const big=i===0, s=big?s1:mix(s0,s1*.8,Math.pow(Math.random(),1.8)); let a=0, d=0;
    // keep stones from sinking into each other: try a few places and take the first that leaves room
    for(let tr=0;tr<8;tr++){ a=mix(a0,a1,(i+R(.15,.85))/n)+(tr?R(-.6,.6):0); d=big&&n>2?r*R(0,.2):r*Math.sqrt(R(.3,1))*(1+tr*.08); const px=x+Math.cos(a)*d, py=y+Math.sin(a)*d*FSY;
      if(H.L.every(q=>Math.hypot(q.x-px,(q.y-py)/FSY)>(q.s+s)*.42)) break; }
    H.L.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,s,a,big,v:(Math.random()*4)|0,rz:R(0,TAU_),ln:R(.06,.3)*(o.lean??1),sq:(o.squash??1)*R(.85,1.25),dl:big?0:(o.stagger??.05)*i+R(0,.04),sd:R(0,9),em:0,dust:false}); }
  if(typeof pl!=='undefined'&&pl.gy!=null) for(const p of H.L){ const dx=p.x-pl.x, dy=p.y-pl.gy; if(dy>-p.s*.45&&dy<p.s*.9&&Math.abs(dx)<p.s*.75){ p.s*=.75; p.x=pl.x+(dx>=0?1:-1)*p.s*R(.85,1.05); } }
  H.L.sort((p,q)=>p.y-q.y); const bigs=[...H.L].sort((p,q)=>q.s-p.s).slice(0,nsh);
  const lx=o.lx??x, ly=o.ly??y; for(const p of H.L) p.sa=Math.atan2((p.y-ly)/FSY,p.x-lx);
  // rise curve: 0 -> 1+over at u=1, then a damped settle to 1
  const hgt=tt=>{ const u=tt/rise; if(u<1) return (1+over)*(1-Math.pow(1-u,3)); const v=u-1; return 1+over*Math.exp(-v*4.5)*Math.cos(v*6.5); };
  let tPrev=0;
  GFX.add(dur+out+.2,(k,t)=>{ if(H.dead) return; if(H.t1===1) H.t1=t; const tEnd=H.t1>0?H.t1:dur, dt=Math.max(0,t-tPrev); tPrev=t;
    if(o.mound!==0) F.quad(m.soot,x,y,r*1.35+s1*.6,(r*1.35+s1*.6)*.9,o.rot||0,{a:.75*sat(t/.15)*(1-sat((t-tEnd-out)/.3))});
    for(const p of H.L){ const tt=t-p.dl; if(tt<0) continue; const f=sat((t-tEnd-p.dl*.5)/out), h=hgt(tt), sink=f*f*.35, z=p.s*((h-sink)-1)*.95, ca=Math.cos(p.sa), sa=Math.sin(p.sa), heat=sat(1-tt/.6);
      if(!p.dust){ p.dust=true; K.dust(p.x,p.y,{n:p.big?5:3,r:p.s*.25,sp:[p.s*.8,p.s*2.4],a:.42,s:.6+p.s/400,life:1.1,c:'#241f1c',c3:'#4a4038'}); if(p.big) GFX.light(p.x,p.y,p.s*2.2,P.l,.22+glow*.18,.45,{z:p.s*.5}); }
      if(solids) F.solid(kind,p.v,p.x,p.y,z,{M:F.xfw({sx:p.s*p.sq,sy:p.s*p.sq*.9,sz:p.s,rz:p.rz,rx:sa*p.ln,ry:ca*p.ln}),alb,emis:P.b,rimC:P.h,spec:.45,rim:.24,vein:glow*.35,heat:heat*.35*(o.heat??1),tone:.3,bump:2.4,ero:f*.85,
        shadow:bigs.includes(p)?[Math.cos(p.sa)*.7+.3,Math.sin(p.sa)*.7+.2,.5*(1-f)]:null,detail:1,strata:o.strata??5,glow:glow*(1-f*.8)*(.6+.4*sat(tt/.4)),moss:o.moss||0,mossK:o.mossK??.4,ore:o.ore??.3,edge:o.edge??.06,seed:p.sd});
      // soil, pebbles and dust run off it while it climbs and while it breaks up
      if(o.spill!==0&&!F.low){ const climbing=tt<rise*1.6, br=f>0&&f<1, rate=climbing?(p.big?36:16):br?(p.big?30:14):0; p.em+=rate*dt*(GFX.QK||1);
        while(p.em>=1){ p.em-=1; const top=Math.max(0,z+p.s*(1.25*h-.3)), ang=R(0,TAU_), rr=p.s*R(.12,.42);
          if(Math.random()<.65) GFX.pt({x:p.x+Math.cos(ang)*rr,y:p.y+Math.sin(ang)*rr*FSY,z:top*R(.6,1),vx:Math.cos(ang)*R(40,200),vy:Math.sin(ang)*R(20,100),vz:R(80,420),g:2400,drag:.3,life:R(.6,1.2),s:R(3,8)*(.6+p.s/400),rot:R(0,TAU_),vr:R(-12,12),m:11,b:'alpha',c:rgb(Math.random()<.5?'#4a433e':'#6e655c'),c2:'#0a0908',shadow:true,bounce:.3,fk:5,L:2,pri:1});
          else GFX.pt({x:p.x+Math.cos(ang)*rr*1.3,y:p.y+Math.sin(ang)*rr*FSY,z:top*R(.2,.7),vx:Math.cos(ang)*R(20,90),vy:Math.sin(ang)*R(10,50),vz:R(-180,-40),g:0,drag:1.6,life:R(.7,1.3),s:R(14,30)*(.5+p.s/350),grow:R(30,70),m:5,b:'alpha',c:rgb('#3a332e'),c2:'#000000',c3:'#6a5e52',er:.9,ns:R(.9,1.6),w:1,a:.4,L:0,pri:1}); } }
      if(f>0&&!p.br){ p.br=true; if(K.chunks&&p.big&&!F.low) K.chunks(p.x,p.y,{n:3,r:p.s*.3,sp:[120,360],up:600,s:[p.s*.12,p.s*.24],pal:P,kind:kind==='crystal'?'crystal':'boulder',rock:alb,life:1.1}); } } },o.delay||0);
  return H; };

// ---------------------------------------------------------------- 2. gather (ki drawn in)
// GATHER: power being drawn into a point, rising steadily for `dur` seconds (speed, brightness and density only ever grow):
//  long thin streaks spiralling in from off screen with white cores, shells of light tightening round the point and brightening (grain flowing
//  inside them), a core swelling in it, small sparks and motes orbiting it, grit and dust lifting off the floor toward it, heat haze round it,
//  its light on the floor growing. o: {dur (1.6), r (outer shell radius, 380), R (where the streaks start, 1700), pal, n (density x1),
//  spin (1 or -1), core:0, shells (3), debris:0, haze:0, floor:0, sparks:0, gain, delay}
//  -> handle {x,y,z (move it every frame if you like), u (0..1 progress), dead, release(q) (let it go: a flash and everything snaps outward;
//     q {s (size x1), ring:0}), end() (just stop)}
K.gather=(x,y,z,o={})=>{ const H={x,y,z:z??160,u:0,dead:false,rel:-1,t1:-1,release(q={}){ if(H.rel<0){ H.rel=RT; H.rq=q; } },end(){ if(H.t1<0) H.t1=RT; }}; if(!F.on) return H;
  const m=m9(), P=pal(o.pal), C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, VC=K.vc?K.vc(P):null, dur=o.dur||1.6, r=o.r||380, RR=o.R||1300, nk=(o.n??1)*(GFX.QK||1), sp=o.spin||1, g=o.gain||1, ns=o.shells??3,
    E={s:0,o:0,d:0,r:0}, sd=R(0,9); let L=null, tp=0;
  const fin=()=>{ H.dead=true; if(L) L.t=L.life; };
  GFX.add((o.max||dur)+6,(k,t)=>{ if(H.dead) return;
    if(H.t1>=0&&RT-H.t1>.18){ fin(); return; }
    if(H.rel>=0){ const q=H.rq||{}, s=q.s||1, P2=P; fin();
      GFX.add(.38,(kk,tt)=>{ const e=eo5(kk), a=1-kk; F.bill(m.flash,H.x,H.y,H.z,r*(.5+1.1*e)*s,r*(.5+1.1*e)*s,0,{...CW,a:a*a,gain:2.4*g});
        if(q.ring!==0) for(let i=0;i<2;i++) F.bill(m.shell,H.x,H.y,H.z,r*s*(.4+(1.4+i*.6)*e),r*s*(.4+(1.4+i*.6)*e),tt*3+i,{...C,a:a*(1-i*.4),gain:2*g,ero:.1+kk*.6}); });
      for(let i=0;i<Math.round(26*nk);i++){ const a=R(0,TAU_), v=R(900,2600)*s; GFX.pt({x:H.x,y:H.y,z:H.z,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:R(-500,900),g:600,drag:1.6,life:R(.25,.6),s:R(3,6),m:3,len:.03,c:rgb(Math.random()<.4?'#ffffff':P.s),c3:'#ffffff',c2:P.b,L:3,pri:1}); }
      GFX.light(H.x,H.y,r*4*s,P.l,1.1,.35,{z:H.z}); GFX.ripple(H.x,H.y,r*2.4*s,{life:.45,s:.8}); return; }
    const u=H.u=sat(t/dur), e=u*u, dt=Math.max(0,t-tp); tp=t; const fo=H.t1>=0?1-sat((RT-H.t1)/.18):1;
    // streaks: count follows time (rate grows with u), each one spirals in on the point and dies on arrival
    E.s+=(40+200*e)*nk*dt; while(E.s>=1){ E.s-=1; const a=R(0,TAU_), r0=RR*R(.55,1.05), spd=r0/R(.75,1.15)*(1+.9*u);
      const z0=H.z+R(-H.z*.8,700); GFX.pt({x:H.x+Math.cos(a)*r0,y:H.y+Math.sin(a)*r0*FSY,z:z0,oc:[H.x,H.y,H.z],or:r0,oa:a,ow:sp*R(.9,1.7),ok:spd,oz0:z0,rmin:r*.18,life:2.4,s:R(4,7)*(1+.4*u),m:3,len:.13,c:rgb(Math.random()<.35?'#ffffff':P.s),c3:'#ffffff',c2:P.b,fk:9,L:3,pri:1}); }
    // sparks and motes orbiting it (tight, fast, short-lived arcs)
    if(o.sparks!==0){ E.o+=(14+60*e)*nk*dt; while(E.o>=1){ E.o-=1; const a=R(0,TAU_), rr=r*R(.35,.95)*(1-.35*u), mote=Math.random()<.3;
      GFX.pt({x:H.x,y:H.y,z:H.z,oc:[H.x,H.y,H.z+R(-.5,.5)*r*.6],or:rr,oa:a,ow:sp*(mote?R(2,3.5):R(6,10)),ok:0,oz0:H.z+R(-.5,.5)*r*.6,ob:rr*.35,life:mote?R(.5,.9):R(.12,.3),s:mote?R(9,15):R(5,8),m:mote?8:3,len:.03,c:rgb(mote?P.m:'#ffffff'),c3:'#ffffff',c2:P.b,fk:4,fade:mote?'in':undefined,L:3,pri:1}); } }
    // grit and dust lifting off the floor toward it
    if(o.debris!==0){ E.d+=(4+28*e)*nk*dt; while(E.d>=1){ E.d-=1; const a=R(0,TAU_), d=r*R(.6,2.2);
      if(Math.random()<.7) GFX.pt({x:H.x+Math.cos(a)*d,y:H.y+Math.sin(a)*d*FSY,z:2,vx:0,vy:0,vz:R(60,200),g:-120*(1+u),drag:.6,tx:H.x,ty:H.y,tz:H.z,pull:R(.4,1)*(1+u),life:R(1,1.8),s:R(3,7),rot:R(0,TAU_),vr:R(-8,8),m:11,b:'alpha',c:rgb('#5a524c'),c2:'#0a0908',shadow:true,fk:4,L:2,pri:1});
      else K.dust(H.x+Math.cos(a)*d,H.y+Math.sin(a)*d*FSY,{n:1,dir:a+PI,spread:.1,sp:[d*.6,d*1.1],a:.3+.2*u,s:.7,life:.9}); } }
    // the shells: each one starts wide and faint and tightens onto the core, brighter the later it is; their phase speeds up with u
    E.r+=dt*(.55+1.6*u);
    for(let i=0;i<ns;i++){ const p=(E.r+i/ns)%1, rad=r*(1.15-.95*Math.pow(p,1.4))*(1-.25*u), a=Math.sin(p*PI)*(.25+.85*u)*fo;
      F.bill(m.shell,H.x,H.y,H.z,rad,rad,t*(1.2+i*.7)*sp+i*2.1,{...C,a,gain:(1.1+1.3*u)*g,ero:.08+.3*(1-u),t0:sd+i*3}); }
    // the core
    const cr=r*(.08+.14*u)*(1+.05*Math.sin(t*23));
    if(o.core!==0){ F.bill(m.core,H.x,H.y,H.z,cr*2.2,cr*2.2,0,{...CW,a:(.5+.5*u)*fo,gain:(1.4+1.4*u)*g});
      if(VC&&vok()) V.add('orb',H.x,H.y,H.z,{ex:cr*2.4,ey:cr*2.4,ez:cr*2.4,pa:[.62,.24,3,3+6*u],pb:[.7+1.1*u,.22,1.3+u,.8],dens:(4+6*u)*fo,gain:.9*g,seed:sd,smoke:0,fire:.5,...VC}); }
    if(o.haze!==0) GFX.haze(H.x,H.y,H.z,r*(1.1+.5*u),(.25+.55*u)*fo,RT*(1+u));
    if(o.floor!==0){ F.quad(m.pool,H.x,H.y,r*(.8+.9*u),r*(.8+.9*u),t*.3,{...C,a:(.1+.4*u)*fo,gain:(.6+.6*u)*g});
      if(!L){ L=GFX.light(H.x,H.y,r*3,P.l,.2,dur+6,{z:H.z}); } L.a=(.15+.85*u)*fo; L.r=r*(2.2+2*u); L.x=H.x; L.y=H.y; L.z=H.z; L.t=0; } },o.delay||0);
  return H; };

// ---------------------------------------------------------------- 3. the divine
// GODRAY: a shaft of light falling from the sky onto (x,y): a cone (narrow at the source, wide on the floor), streaks running down it,
//  dust drifting through it, a pool where it lands. o: {r (radius on the floor, 260), r1 (radius at the source, r*.35), h (height of the source, 2600),
//  dur (2.5), in (.35), out (.5), pal, a, gain, dust:0, pool:0, delay} -> handle {x,y,r,a,dead,end()}
K.godray=(x,y,o={})=>{ const H={x,y,r:o.r||260,a:o.a??1,dead:false,t1:-1,end(){ if(H.t1<0) H.t1=RT; }}; if(!F.on) return H;
  const m=m9(), P=pal(o.pal||'gold'), CL={cA:P.d,cB:P.b,cM:P.m,cC:P.h}, CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, dur=o.dur||2.5, tin=o.in??.35, out=o.out??.5, hs=o.h||2600, g=o.gain||1, sd=R(0,9); let dE=0, tp=0;
  GFX.add((o.max||dur)+out+.05,(k,t)=>{ if(H.dead) return; const te=H.t1>=0?Math.min(dur,t-(RT-H.t1)+0):dur, f=sat((t-te)/out); if(f>=1){ H.dead=true; return; }
    const i=eo3(sat(t/tin)), a=H.a*i*(1-f*f), rr=H.r*(.6+.4*i)*(1-.3*f), r1=(o.r1??H.r*.35)*(.4+.6*i), dt=Math.max(0,t-tp); tp=t;
    // the shaft grows down from the sky: its foot reaches the floor at i=1
    const h0=hs*(1-i)*.9;
    F.lathe(m.ray,H.x,H.y,0,{r0:rr,r1:r1,h0,h1:hs,...CL,a:.26*a,gain:1.1*g,t0:sd});
    F.lathe(m.rayG,H.x,H.y,0,{r0:rr*.7,r1:r1*.7,h0,h1:hs,...CW,a:.45*a,gain:1.5*g,t0:sd+4});
    if(o.pool!==0) F.quad(m.pool,H.x,H.y,rr*1.5,rr*1.5,t*.2,{...CL,a:.5*a*i,gain:1.1*g});
    if(o.dust!==0&&!F.low){ dE+=36*dt*a*(GFX.QK||1); while(dE>=1){ dE-=1; const ang=R(0,TAU_), d=Math.sqrt(Math.random()), zz=R(0,hs*.7), rad=mix(rr,r1,zz/hs)*d;
        GFX.pt({x:H.x+Math.cos(ang)*rad,y:H.y+Math.sin(ang)*rad*FSY,z:zz,vx:R(-25,25),vy:R(-12,12),vz:R(-90,-20),g:0,drag:.2,life:R(1,2),s:R(1.6,3.4),m:8,c:rgb(Math.random()<.5?'#ffffff':P.m),fade:'in',L:3,pri:1}); } } },o.delay||0);
  if(o.light!==0) after(o.delay||0,()=>GFX.light(x,y,H.r*3,P.l,.9*H.a,dur,{z:300,hold:dur*.6}));
  return H; };

// SKYSWIRL: the sky parting over (x,y): a dark ring of cloud turning round an opening that widens, its inner rim lit by what is above.
//  Drawn as a disc high in the air (z), so from the top-down view it sits above the place. o: {r (2000), z (1800), open (final hole size 0..1, .5),
//  dur (3), in (.6), out (.8), spin (.25 rad/s), pal, a, delay} -> handle {x,y,r,a,open,dead,end()}
K.skyswirl=(x,y,o={})=>{ const H={x,y,r:o.r||2000,a:o.a??1,open:o.open??.5,dead:false,t1:-1,end(){ if(H.t1<0) H.t1=RT; }}; if(!F.on) return H;
  const m=m9(), P=pal(o.pal||'gold'), CL={cA:P.d,cB:P.b,cM:P.m,cC:P.h}, dur=o.dur||3, tin=o.in??.6, out=o.out??.8, zz=o.z??1800, sp=o.spin??.25, sd=R(0,9);
  GFX.add((o.max||dur)+out+.05,(k,t)=>{ if(H.dead) return; const te=H.t1>=0?Math.min(dur,t-(RT-H.t1)):dur, f=sat((t-te)/out); if(f>=1){ H.dead=true; return; }
    const i=eo3(sat(t/tin)), a=H.a*i*(1-f), op=H.open*eo3(sat(t/(tin*2.2)))*(1+.5*f), rot=t*sp;
    F.quad(m.cloud,H.x,H.y,H.r,H.r,rot,{z:zz,a:.6*a,rv:[1,.45,.12+op*.5,.2],t0:sd});
    F.quad(m.cloudL,H.x,H.y,H.r,H.r,rot,{z:zz,cA:P.d,cB:P.m,cM:P.h,cC:'#ffffff',a:.42*a,gain:1,rv:[.18+op*.6,.25,.1+op*.5,.1],t0:sd}); },o.delay||0);
  return H; };

// HALO: a nimbus of light standing behind a head or a body: a thin turning ring of light, a fan of light lines round it (lines, not a picture).
//  o: {r (220), pal, dur (2.5), in (.3), out (.4), spin (.4), rays:0, tilt (-.95 = facing the camera; 0 = lying on the floor), a, gain, delay}
//  -> handle {x,y,z,r,a,dead,end()}
K.halo=(x,y,z,o={})=>{ const H={x,y,z:z||400,r:o.r||220,a:o.a??1,dead:false,t1:-1,end(){ if(H.t1<0) H.t1=RT; }}; if(!F.on) return H;
  const m=m9(), P=pal(o.pal||'gold'), C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, dur=o.dur||2.5, tin=o.in??.3, out=o.out??.4, sp=o.spin??.4, tl=o.tilt??-.95, g=o.gain||1, sd=R(0,9);
  GFX.add((o.max||dur)+out+.05,(k,t)=>{ if(H.dead) return; const te=H.t1>=0?Math.min(dur,t-(RT-H.t1)):dur, f=sat((t-te)/out); if(f>=1){ H.dead=true; return; }
    const i=eo5(sat(t/tin)), a=H.a*i*(1-f*f), rr=H.r*(.7+.3*i)*(1+.15*f), rot=t*sp;
    if(o.rays!==0) F.lathe(m.rays,H.x,H.y,H.z,{r0:rr*.55,r1:rr*2.1,M:F.xfw({rx:tl,rz:rot*.5}),...C,a:.8*a,gain:2.2*g,t0:sd});
    F.lathe(m.halo,H.x,H.y,H.z,{r0:rr*.92,r1:rr*1.08,M:F.xfw({rx:tl,rz:rot}),...CW,a,gain:3*g,t0:sd+2});
    F.lathe(m.halo,H.x,H.y,H.z,{r0:rr*.66,r1:rr*.72,M:F.xfw({rx:tl,rz:-rot*1.6}),...C,a:.7*a,gain:2.4*g,t0:sd+5}); },o.delay||0);
  return H; };

// DEITY: a giant figure of translucent light and mist standing over (x,y): a robed body that frays into mist at the hem, shoulders and arms,
//  a head with two glowing eyes, a halo, bands of mist streaming round it, its shadow on the floor and rim light so it reads from above.
//  Built from volume pieces (VOL 'wisp': grain flowing inside, edges unravelling into mist), so it needs volumes; without them only the halo,
//  eyes and mist are drawn. Sizes: h is its height in world units (hero = 250; 1400..2200 fills half the screen).
//  o: {h (1700), z (how high it floats, h*.12), pal ('gold'), dur (3), in (.7: it condenses from mist), out (.6: it dissolves upward),
//      arms ('open' | 'raise' | 'down' | 'press' - palms pushing down), eyes:0, halo:0, mist (2 bands), shadow:0, gain, a, delay}
//  -> handle {x,y,z,h,a,arms,dead,end(), head() -> [x,y,z], hand(i) -> [x,y,z] (0 left, 1 right)}
K.deity=(x,y,o={})=>{ const h=o.h||1700, H={x,y,z:o.z??h*.12,h,a:o.a??1,arms:o.arms||'open',dead:false,t1:-1,end(){ if(H.t1<0) H.t1=RT; },
    head(){ return [H.x,H.y,H.z+H.h*.86]; },hand(i){ const A=ARM[H.arms]||ARM.open, s=i?1:-1; return [H.x+s*H.h*A[2],H.y,H.z+H.h*A[3]]; }};
  if(!F.on) return H; const m=m9(), P=pal(o.pal||'gold'), VC=K.vc?K.vc(P):null, C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, dur=o.dur||3, tin=o.in??.7, out=o.out??.6, g=o.gain||1, sd=R(0,9);
  const HL=o.halo!==0?K.halo(x,y,H.z+h*.86,{r:h*.15,pal:P,dur:(o.max||dur)+tin,in:tin*1.2,out,tilt:-.95,gain:.9*g,delay:(o.delay||0)+tin*.4}):null;
  // the wisp needs the light of the body to dominate its smoke: low smoke density, the palette's own colour as its dark
  const wv=(dx,dz,ex,ey,yaw,pitch,ra,rb,flow,rag,a,glow,ord)=>V.add('wisp',H.x+dx,H.y,H.z+dz,{ex,ey,ez:ey,yaw,pitch,pa:[ra,rb,2.4,flow],pb:[glow*(o.glow??.4),.85,(o.rimK??1.05),rag],dens:(o.dens??3.6)*a,gain:1.1*g,seed:sd+ord,smoke:.25,fire:.75,block:.55,
    cA:P.d,cB:P.b,cM:P.m,cC:P.h,cS:VC?VC.cS:P.d,cK:P.m,amb:.25,key:1.1,rim:.9,glow:.2,sdist:.15,shadow:2.5,ord:H.y+ord,steps:22,lit:.6});
  GFX.add((o.max||dur)+out+.05,(k,t)=>{ if(H.dead) return; if(HL){ HL.x=H.x; HL.y=H.y; HL.z=H.z+H.h*.86; }
    const te=H.t1>=0?Math.min(dur,t-(RT-H.t1)):dur, f=sat((t-te)/out); if(f>=1){ H.dead=true; if(HL) HL.end(); return; } if(f>0&&HL) HL.end();
    const i=eo3(sat(t/tin)), a=H.a*i*(1-f*f), hh=H.h, A=ARM[H.arms]||ARM.open, br=1+.03*Math.sin(t*2.3+sd), up=f*hh*.25, rise=(1-i)*hh*.08;
    if(o.shadow!==0) F.quad(m.shade,H.x+hh*.12,H.y+hh*.08,hh*.32,hh*.24,.3,{a:.8*a});
    if(VC&&vok()){
      // robe/body: wide frayed hem below, narrowing to the chest
      wv(0,hh*.4+up+rise,hh*.4*br,hh*.2,0,PI/2,.95,.5,.9,1.3,a,1.1,0);
      // head
      wv(0,hh*.86+up+rise,hh*.085,hh*.075,0,PI/2,.95,.85,.6,.2,a,1.5,2);
      // arms from the shoulders
      for(let s=0;s<2;s++){ const sg=s?1:-1, ax=sg*hh*.11, az=hh*.69+up+rise, L2=hh*A[0];
        const yaw=s?0:PI, pitch=A[1], cx=ax+sg*Math.cos(pitch)*L2, cz=az+Math.sin(pitch)*L2; wv(cx,cz,L2,hh*.075,yaw,pitch,1,.35,1.1,.6,a*.9,1,1); } }
    // eyes: two hard points with a short horizontal flare
    if(o.eyes!==0){ const ez=H.z+hh*.875+up+rise, ea=a*sat((t-tin*.6)/.25)*(.85+.15*Math.sin(t*7+sd));
      for(let s=-1;s<=1;s+=2){ F.bill(m.flash,H.x+s*hh*.03,H.y-2,ez,hh*.07,hh*.02,0,{...CW,a:ea,gain:5*g}); F.bill(m.flash,H.x+s*hh*.03,H.y-2,ez,hh*.018,hh*.016,0,{cA:'#ffffff',cB:'#ffffff',cM:'#ffffff',cC:'#ffffff',a:ea,gain:6*g}); } }
    // bands of mist streaming round the body (its sleeves and sash)
    const nb=o.mist??2; for(let b=0;b<nb;b++){ const pts=[], ph=t*(.7+b*.25)+b*2.4+sd; for(let j=0;j<11;j++){ const u=j/10, an=ph+u*3.6*(b%2?1:-1), rad=hh*(.2+.2*u), zz=H.z+hh*(.15+.6*(b%2?u:1-u))+up;
        pts.push({x:H.x+Math.cos(an)*rad,y:H.y+Math.sin(an)*rad*FSY,z:zz,w:hh*.035*(1-u*.6)}); }
      F.ribbon(m.mist,pts,{...C,a:.75*a,gain:1.3*g,ulen:hh*.9,t0:sd+b*5}); } },o.delay||0);
  return H; };
// arm poses: [half length / h, pitch (rad, + up), hand x / h, hand z / h]
const ARM={open:[.19,-.55,.5,.5],raise:[.19,.8,.43,1.02],down:[.19,-1.1,.31,.32],press:[.2,-.75,.47,.4]};

// DIVINE: the whole descent in one call - the sky parts, a god ray falls, the figure condenses inside it with its halo, and at `strike`
//  seconds a judgement of light comes down over the whole screen (rays on many points, the floor flares). The pieces are the ones above.
//  o: {h (figure height 1800), pal ('gold'), dur (3.6), strike (dur*.6, or -1 none), hw/hh (area of the judgement, default the view), arms, delay}
//  -> {sky, ray, god, strike()} (call strike() yourself instead of passing a time)
K.divine=(x,y,o={})=>{ const P=pal(o.pal||'gold'), dur=o.dur||3.6, h=o.h||1800, d=o.delay||0, vw=typeof view==='function'?view():{hw:2000,hh:1200};
  const sky=K.skyswirl(x,y-h*.1,{r:h*1.6,z:h*1.1,pal:P,dur,in:.7,out:.8,delay:d});
  const ray=K.godray(x,y,{r:h*.34,r1:h*.2,h:h*1.9,pal:P,dur,in:.45,out:.6,a:.42,delay:d+.15});
  const god=K.deity(x,y-30,{h,pal:P,dur:dur-.5,in:.8,out:.7,arms:o.arms||'open',delay:d+.45});
  const R0={sky,ray,god,strike(){ const hw=o.hw||vw.hw, hh=o.hh||vw.hh; for(let i=0;i<7;i++){ const px=x+R(-hw,hw)*.9, py=y+R(-hh,hh)*.9/FSY*.6;
      K.godray(px,py,{r:R(90,170),h:h*1.4,pal:P,dur:.35,in:.08,out:.35,dust:0,delay:i*.03}); }
    GFX.light(x,y,hw*1.2,P.l,1.1,.6,{z:400}); GFX.ripple(x,y,h*.8,{life:.5,s:.8}); }};
  const st=o.strike??dur*.6; if(st>=0) after(d+st,R0.strike);
  return R0; };
})();
