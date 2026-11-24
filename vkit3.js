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
      dens:(15-9*e)*(1-sat((k-.5)/.5))*(cool<1?1:sm),gain:1.7*(o.gain||1),seed:sd,smoke:sm,fire:.72,...C,...(o.c?{cS:o.c}:{}),...(o.c2?{cK:o.c2}:{}),amb:.2,key:1.25,rim:.32,glow:.7*(1-cool),ord:o.ord}); },o.delay||0); };

// VSMOKE: a ball of smoke that rolls upward and thins. o: {s, z, dur, rise, c, c2, a, vx, delay}
K.vsmoke=(x,y,o={})=>{ if(!ok()) return; const s=o.s||260, dur=o.dur||1.5, sd=seed(), rise=o.rise??s*.7;
  GFX.add(dur,(k,t)=>{ const e=eo3(k), r=.4+.45*e;
    V.add('blast',x+(o.vx||0)*k,y,(o.z||0)+s*.35+rise*e,{ex:s,ey:s,ez:s*.9,pa:[r,.55+.1*k,2.2,.2+k*.25],pb:[0,1,1,.4+.5*k],dens:(10-5*k)*(o.a??.8)*sat(k*7)*(1-sat((k-.4)/.6)),seed:sd,smoke:1,fire:1,cS:o.c||'#1c1716',cK:o.c2||'#7e6f66',amb:.22,key:1.2,rim:.3,glow:0,steps:20}); },o.delay||0); };

// VCOLUMN: a pillar of fire (or of any element) standing on the floor, twisting, breaking into tongues at the top.
//  o: {r, h, dur, rise (seconds to full height), pal, twist, turb, heat, delay} -> handle {x,y,a,r,h,dead}
K.vcolumn=(x,y,o={})=>{ const H={x,y,a:1,r:o.r||90,h:o.h||600,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||1.2, sd=seed(), rise=o.rise??.16, out=o.out??.3;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/rise)), f=sat((t-(dur-out))/out), hh=H.h/2;
    V.add('column',H.x,H.y,hh,{ex:H.r*2.2,ey:H.r*2.2,ez:hh,pa:[.46*(1-.3*f),o.taper??.5,o.freq||2.6,o.speed||3.4],pb:[(o.heat??1.2)*(1-.5*f),o.twist??2,(o.turb??.6)+f*.5,up*(1-f*.55)],
      dens:10*H.a*(1-f*f),gain:1.6*(o.gain||1),seed:sd,...FIRE,cS:P.d,...C,cS:P.d,ord:o.ord}); },o.delay||0);
  return H; };

// VFUNNEL: a hollow twister. o: {r (top radius), r0 (foot radius), h, dur, pal, spin, sway, thick, heat, delay} -> handle {x,y,a,r,h,dead}
K.vfunnel=(x,y,o={})=>{ const H={x,y,a:1,r:o.r||200,h:o.h||560,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||2, sd=seed(), rise=o.rise??.3, out=o.out??.4;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/rise)), f=sat((t-(dur-out))/out), hh=H.h/2*(.35+.65*up), rr=H.r*1.3;
    V.add('funnel',H.x,H.y,hh,{ex:rr,ey:rr,ez:hh,pa:[(o.r0??H.r*.2)/rr,.72*(.6+.4*up),(o.thick??.16)*(1-.4*f),o.spin??7],pb:[(o.heat??1.05)*(1-.4*f),o.freq||2.4,o.sway??.1,o.streak??.7],
      dens:10*H.a*(1-f*f)*sat(t*8),gain:1.6*(o.gain||1),seed:sd,...FIRE,...C,cS:P.d,ord:o.ord}); },o.delay||0);
  return H; };

// VORB: a ball of plasma: a veined shell turning round a white core. o: {r, dur, pal, spin, core, in, out, delay} -> handle {x,y,z,r,a,dead}
K.vorb=(x,y,z,o={})=>{ const H={x,y,z:z||0,a:1,r:o.r||100,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'violet'), C=vc(P), dur=o.dur||1.5, sd=seed(), tin=o.in??.15, out=o.out??.2;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const g=eo3(sat(t/tin)), f=sat((t-(dur-out))/out), rr=H.r*1.3*(.4+.6*g)*(1+.6*f);
    V.add('orb',H.x,H.y,H.z,{ex:rr,ey:rr,ez:rr,pa:[.68,.22,o.freq||2.6,o.spin??1.8],pb:[o.heat??.8,o.core??.2,1.1,.9],dens:7.5*H.a*(1-f),gain:.85*(o.gain||1),seed:sd,smoke:0,fire:.5,...C,ord:o.ord}); },o.delay||0);
  return H; };

// VRING: a torus of dust (or of fire with heat>0) rolling outward over the floor: the body of a shock wave.
//  o: {r (final radius), r0, dur, pal, heat, tube (thickness as a fraction of r), c, c2, delay}
K.vring=(x,y,o={})=>{ if(!ok()) return; const Rm=o.r||500, dur=o.dur||.9, sd=seed(), heat=o.heat||0, P=K.pal(o.pal), C=heat?vc(P):{}, tube=o.tube??.16, RB=Math.max(Rm,o.r0||0), r0=(o.r0??Rm*.15)/RB, r1=Rm/RB;
  GFX.add(dur,(k,t)=>{ const e=eo3(k), rr=mix(r0,r1,e)*.78, f=sat((k-.45)/.55);
    V.add('ring',x,y,RB*tube*.9,{ex:RB,ey:RB,ez:RB*tube*1.6,pa:[rr,tube*(.7+.6*e),o.freq||2.4,t*.8],pb:[heat*(1-k),.62,o.lump??.62,0],dens:9*(o.a??1)*(1-f*f)*sat(k*10),seed:sd,smoke:o.smoke??1,fire:.7,
      cS:o.c||'#2a2420',cK:o.c2||'#8a7868',...C,amb:.2,key:1.2,rim:.3,steps:20,ord:o.ord??-1e9}); },o.delay||0); };

// VJET: a stream of fire (breath, exhaust, a beam of ki) from (x,y,z) along the floor direction dir, optionally pitched up/down.
//  o: {len, r (radius at the far end), r0 (radius at the mouth), dur, pal, pitch, turb, speed, heat, in, out, delay} -> handle {x,y,z,dir,len,a,dead}
K.vjet=(x,y,z,dir,o={})=>{ const H={x,y,z:z||60,dir:dir||0,len:o.len||600,pitch:o.pitch||0,a:1,r:o.r||110,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||.8, sd=seed(), tin=o.in??.14, out=o.out??.22, rad=o.r||110;
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const g=sat(t/tin), f=sat((t-(dur-out))/out), L=H.len/2, cd=Math.cos(H.dir), sn=Math.sin(H.dir), cp=Math.cos(H.pitch), rad=H.r, cold=o.heat===0;
    // the box centre sits half a length ahead of the mouth
    V.add('jet',H.x+cd*cp*L,H.y+sn*cp*L*FSY,H.z+Math.sin(H.pitch)*L,{ex:L,ey:rad*1.25,ez:rad*1.25,yaw:H.dir,pitch:H.pitch,pa:[(o.r0??rad*.25)/(rad*1.25),.8,o.freq||2.6,o.speed||5],pb:[(o.heat??1.2),o.turb??.6,.2+g*1.3,-.3+f*1.3],
      dens:10*H.a,gain:1.6*(o.gain||1),seed:sd,...FIRE,...C,cS:P.d,...(cold?{smoke:1,fire:1,rim:.3,cS:o.c||'#2a2420',cK:o.c2||'#8a7868'}:{}),ord:o.ord}); },o.delay||0);
  return H; };

// VSHEET: fire standing on a floor line from (x1,y1) to (x2,y2): a wall with real depth, ragged at the top.
//  o: {h, thick, dur, rise, pal, heat, turb, out, delay} -> handle {a,h,dead}
K.vsheet=(x1,y1,x2,y2,o={})=>{ const H={a:1,h:o.h||500,dead:false}; if(!ok()) return H; const P=K.pal(o.pal||'flame'), C=vc(P), dur=o.dur||1.2, sd=seed(), rise=o.rise??.14, out=o.out??.35,
    dx=x2-x1, dy=(y2-y1)/FSY, L=Math.hypot(dx,dy)/2, yaw=Math.atan2(dy,dx), cx=(x1+x2)/2, cy=(y1+y2)/2, th=o.thick||Math.max(50,H.h*.17);
  GFX.add(dur,(k,t)=>{ if(H.dead) return; const up=eo3(sat(t/rise)), f=sat((t-(dur-out))/out), hh=H.h/2;
    V.add('sheet',cx,cy,hh,{ex:L,ey:th*1.6,ez:hh,yaw,pa:[.34*(1-.3*f),.98*up*(1-.5*f),o.freq||2.8,o.speed||3.4],pb:[(o.heat??1.05)*(1-.4*f),(o.turb??.85)+f*.4,Math.min(.2,th*1.4/L),0],
      dens:10*H.a*(1-f*f),gain:1.6*(o.gain||1),seed:sd,...FIRE,...C,cS:P.d,ord:o.ord}); },o.delay||0);
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
