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
// kit update 10: the new solid kinds (real stone, ice, molten) - see fx3.js
const DEEP={stone:1,cobble:1,shard:1,flag:1,meteor:1,ice:1,iceshard:1};
K.DEEP=DEEP;
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
    H.L.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,s,a,big,kd:o.kinds?o.kinds[i%o.kinds.length]:kind,v:(Math.random()*4)|0,rz:R(0,TAU_),ln:R(.06,.3)*(o.lean??1),sq:(o.squash??1)*R(.85,1.25),dl:big?0:(o.stagger??.05)*i+R(0,.04),sd:R(0,9),em:0,dust:false}); }
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
      if(solids) F.solid(p.kd,p.v,p.x,p.y,z,{M:F.xfw({sx:p.s*p.sq,sy:p.s*p.sq*.9,sz:p.s,rz:p.rz,rx:sa*p.ln,ry:ca*p.ln}),alb,emis:P.b,rimC:P.h,spec:.45,rim:.24,vein:glow*.35,heat:heat*.35*(o.heat??1),tone:.3,bump:2.4,ero:f*.85,dust:o.dust,dustC:o.dustC,
        shadow:bigs.includes(p)?[Math.cos(p.sa)*.7+.3,Math.sin(p.sa)*.7+.2,.5*(1-f)]:null,detail:1,strata:DEEP[p.kd]?(p.kd==='flag'?(o.strata??4):(o.strata??0)):(o.strata??5),glow:glow*(1-f*.8)*(.6+.4*sat(tt/.4)),moss:o.moss||0,mossK:o.mossK??.4,ore:o.ore??.3,edge:o.edge??.06,seed:p.sd});
      // soil, pebbles and dust run off it while it climbs and while it breaks up
      if(o.spill!==0&&!F.low){ const climbing=tt<rise*1.6, br=f>0&&f<1, rate=climbing?(p.big?36:16):br?(p.big?30:14):0; p.em+=rate*dt*(GFX.QK||1);
        while(p.em>=1){ p.em-=1; const top=Math.max(0,z+p.s*(1.25*h-.3)), ang=R(0,TAU_), rr=p.s*R(.12,.42);
          if(Math.random()<.65) GFX.pt({x:p.x+Math.cos(ang)*rr,y:p.y+Math.sin(ang)*rr*FSY,z:top*R(.6,1),vx:Math.cos(ang)*R(40,200),vy:Math.sin(ang)*R(20,100),vz:R(80,420),g:2400,drag:.3,life:R(.6,1.2),s:R(3,8)*(.6+p.s/400),rot:R(0,TAU_),vr:R(-12,12),m:11,b:'alpha',c:rgb(Math.random()<.5?'#4a433e':'#6e655c'),c2:'#0a0908',shadow:true,bounce:.3,fk:5,L:2,pri:1});
          else GFX.pt({x:p.x+Math.cos(ang)*rr*1.3,y:p.y+Math.sin(ang)*rr*FSY,z:top*R(.2,.7),vx:Math.cos(ang)*R(20,90),vy:Math.sin(ang)*R(10,50),vz:R(-180,-40),g:0,drag:1.6,life:R(.7,1.3),s:R(14,30)*(.5+p.s/350),grow:R(30,70),m:5,b:'alpha',c:rgb('#3a332e'),c2:'#000000',c3:'#6a5e52',er:.9,ns:R(.9,1.6),w:1,a:.4,L:0,pri:1}); } }
      if(f>0&&!p.br){ p.br=true; if(K.chunks&&p.big&&!F.low) K.chunks(p.x,p.y,{n:3,r:p.s*.3,sp:[120,360],up:600,s:[p.s*.12,p.s*.24],pal:P,kind:DEEP[p.kd]?(p.kd==='ice'?'iceshard':'shard'):kind==='crystal'?'crystal':'boulder',rock:alb,life:1.1}); } } },o.delay||0);
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
K.deity=(x,y,o={})=>{ if(o.rig&&K.deityRig) return K.deityRig(x,y,o); const h=o.h||1700, H={x,y,z:o.z??h*.12,h,a:o.a??1,arms:o.arms||'open',dead:false,t1:-1,end(){ if(H.t1<0) H.t1=RT; },
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

// ================================================================ kit update 10: real assets, replacements for the light pillars, the god's motion (2026-11-25)
// ice (a crystal cluster on frosted floor), meteor (a tumbling molten rock with a plasma face and a breaking tail), lightning (a branched
// channel that re-strikes), impact (flash, ejecta curtain, rolling dust ring, mushroom cloud, molten crater), eruptEarth (the floor bursting up),
// deityRig (K3.deity with {rig:1}: forms from the ground up, breathes, lifts its head, jointed arms with weight, trailing mist, smite / point, scatters away).
// All new: nothing older changes look. Stone and ice use the new solid kinds in fx3.js (stone cobble shard flag meteor ice iceshard).
(()=>{
const K=window.K3, F=window.FX3, V=window.VOL; if(!K||!F||!window.GFX) return;
const FSY=.58, PI=Math.PI, TAU_=PI*2, sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5, R=(a,b)=>a+Math.random()*(b-a), pal=K.pal;
const rgb=c=>typeof c==='string'?GFX.rgb(c):c, col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m}), vok=()=>!!(K.vok&&K.vok());
const ss=(a,b,x)=>{ const t=sat((x-a)/(b-a)); return t*t*(3-2*t); }, hash=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); };
const hexm=(a,b,k)=>{ a=rgb(a); b=rgb(b); return '#'+[0,1,2].map(i=>('0'+Math.round(sat(a[i]+(b[i]-a[i])*k)*255).toString(16)).slice(-2)).join(''); };
let M10=null;
function m10(){ if(M10) return M10; const m=F.mat, n9=K.m9();
  M10={
    // frost on the floor: cells of rime, thicker toward the middle; a ragged ring of snow at its edge
    frost:m({pm:[3,.8,0,0],nz:'veins',n1:[4,4,0,0],n2:[1.6,1.6,0,0],dist:.12,nk:1,pw:1.7,ero:.3,soft:.25,cA:'#06141e',cB:'#2e5670',cM:'#86b4cc',cC:'#e6f6ff',rk:[.45,1],gain:.85,op:1,layer:'g'}),
    snow:m({nz:'billow',n1:[9,9,0,0],n2:[2,2,0,0],dist:.1,nk:1,pw:2.2,ero:.42,soft:.2,rv:[1,.3,.55,.35],cA:'#1e3444',cB:'#9fc2d6',cC:'#f4fbff',rk:[.4,1],gain:.85,op:1,layer:'g'}),
    // the lightning channel: ion haze, the coloured glow, the white thread
    lH:m({pm:[2,1.1,0,0],nk:0,ero:0,soft:.6,rk:[.5,1],gain:1}),
    lG:m({pm:[2,1.7,0,0],nz:'streak',n1:[.6,3,0,0],nk:.2,ero:.02,soft:.4,rk:[.4,1],gain:2.2,bgain:1.1}),
    lC:m({pm:[2,2.6,0,0],nk:0,ero:.02,soft:.25,rk:[.1,.45],gain:4.5,bgain:2}),
    // ejecta curtain: a cone of thrown dirt, ragged and thinning upward; its lit underside
    cur:m({nz:'streak',n1:[11,.7,0,-.35],n2:[4,1.2,0,-.15],dist:.14,nk:1,pw:1.4,ero:.3,soft:.25,fd:[0,0,.03,.55],cA:'#0a0706',cB:'#231b16',cC:'#3e342c',rk:[.3,1],gain:.9,op:1}),
    curL:m({nz:'streak',n1:[11,.7,0,-.35],n2:[4,1.2,0,-.15],dist:.14,nk:1,pw:2.2,ero:.3,soft:.25,fd:[0,0,.02,.85],rk:[.45,1],gain:1.1,bgain:1}),
    flash:n9.flash, pool:n9.pool, shade:n9.shade, mist:n9.mist };
  return M10; }
K.m10=m10;

// ---------------------------------------------------------------- 1. ice
// ICE: a cluster of crystals bursting up through a floor that frosts over: sharp faceted prisms (see-through, deep blue-green where you look into
//  them, cracks and bubbles inside, white rime on the edges and at the foot), sizes spread like a real cluster, leaning out from the middle.
//  Cold mist rolls off, glints catch the light. At the end it shatters into sharp splinters and white powder (or melts: o.end 'melt').
//  o: {n (7), r (cluster radius 260), s:[lo,hi] crystal heights ([120,420], the first is hi), pal ('azure': light in it and on the floor), tint (shallow
//      colour '#8fe4ff'), deep (deep colour '#05304a'), glow (0..1 light inside), clear (.74: how much floor shows through), lean (1), rise (.22), over (.06),
//      stagger (.04), dur (2.5 until it breaks), out (.35), end ('shatter' | 'melt' | 'none' = stays until h.shatter()), frost (1: frosted floor),
//      a0,a1 (arc), shadow (2), delay}
//  -> handle {L (crystals {x,y,s}), dead, shatter(), end() (melt)}
K.ice=(x,y,o={})=>{ const H={L:[],dead:false,t1:-1,mode:'',shatter(){ if(H.t1<0){ H.t1=1; H.mode='shatter'; } },end(){ if(H.t1<0){ H.t1=1; H.mode='melt'; } }}; if(!F.on) return H;
  const P=pal(o.pal||'azure'), n=Math.max(1,Math.round((o.n||7)*(F.low?.6:1))), r=o.r??260, [s0,s1]=o.s||[120,420], rise=o.rise??.22, over=o.over??.06, dur=o.dur||2.5, out=o.out??.35,
    a0=o.a0??0, a1=o.a1??TAU_, m=m10(), glow=o.glow||0, alb=o.tint||'#8fe4ff', dc=o.deep||'#05304a', nsh=o.shadow??2, ends=o.end||'shatter', solids=F.solids&&F.solids();
  for(let i=0;i<n;i++){ const big=i===0, s=big?s1:mix(s0,s1*.85,Math.pow(Math.random(),1.5)); let a=0, d=0;
    for(let tr=0;tr<8;tr++){ a=mix(a0,a1,(i+R(.15,.85))/n)+(tr?R(-.6,.6):0); d=big&&n>2?r*R(0,.15):r*Math.sqrt(R(.25,1))*(1+tr*.08); const px=x+Math.cos(a)*d, py=y+Math.sin(a)*d*FSY;
      if(H.L.every(q=>Math.hypot(q.x-px,(q.y-py)/FSY)>(q.s+s)*.16)) break; }
    H.L.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,s,a,big,v:(Math.random()*4)|0,rz:R(0,TAU_),ln:(big?R(.03,.1):R(.22,.6))*(o.lean??1),wd:R(.85,1.3),dl:big?0:(o.stagger??.04)*i+R(0,.03),sd:R(0,9),sh:false}); }
  if(typeof pl!=='undefined'&&pl.gy!=null) for(const p of H.L){ const dx=p.x-pl.x, dy=p.y-pl.gy; if(dy>-p.s*.3&&dy<p.s*.7&&Math.abs(dx)<p.s*.4){ p.s*=.7; p.x=pl.x+(dx>=0?1:-1)*p.s*R(.5,.7); } }
  H.L.sort((p,q)=>p.y-q.y); const bySize=[...H.L].sort((p,q)=>q.s-p.s), bigs=bySize.slice(0,nsh); bySize.forEach((p,i)=>{ p.rk=i; });
  for(const p of H.L) p.sa=Math.atan2((p.y-y)/FSY,p.x-x);
  const hgt=tt=>{ const u=tt/rise; if(u<1) return (1+over)*(1-Math.pow(1-u,3)); const v=u-1; return 1+over*Math.exp(-v*5)*Math.cos(v*7); };
  const R0=(r+s1*.45)*1.35; let tPrev=0, gE=0, bornAt=-1;
  const brk=p=>{ p.sh=true; const nk=p.big?3:p.rk<4?1:0; if(K.chunks&&nk) K.chunks(p.x,p.y,{n:nk,kind:'iceshard',r:p.s*.15,sp:[220,760],up:1000,s:[p.s*.09,p.s*.2],pal:P,rock:alb,life:1.3});
    for(let i=0;i<Math.round((p.big?9:5)*(GFX.QK||1));i++){ const a=R(0,TAU_), v=R(80,380); GFX.pt({x:p.x+R(-.15,.15)*p.s,y:p.y,z:R(.1,.9)*p.s,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:R(-40,160),g:0,drag:1.5,life:R(.7,1.3),s:R(18,40)*(p.s/300),grow:R(40,90),m:5,b:'alpha',c:rgb('#cfe6f4'),c2:'#5a7f98',c3:'#ffffff',er:.85,ns:R(.9,1.6),w:1,a:.5,L:2,pri:1}); }
    for(let i=0;i<Math.round(7*(GFX.QK||1));i++) GFX.pt({x:p.x+R(-.2,.2)*p.s,y:p.y,z:R(.1,1)*p.s,vx:R(-300,300),vy:R(-120,120),vz:R(100,600),g:900,drag:1,life:R(.2,.5),s:R(3,6),m:8,c:[1,1,1],fade:'in',L:3,pri:1}); };
  GFX.add(dur+out+.5+(o.max||0),(k,t)=>{ if(H.dead) return; if(bornAt<0) bornAt=t;
    if(ends==='none'&&H.t1<0){ k=0; } if(H.t1===1) H.t1=t; const tEnd=H.t1>0?H.t1:(ends==='none'?1e9:dur), mode=H.mode||ends, dt=Math.max(0,t-tPrev); tPrev=t; if(t>tEnd+out+.4){ H.dead=true; return; }
    const fo=sat((t-tEnd-.1)/(out+.2)), gi=eo3(sat(t/.3));
    // frosted floor, the snow ring at its edge
    if(o.frost!==0){ F.quad(m.frost,x,y,R0*gi,R0*gi*.92,o.rot||.4,{a:.5*(1-fo*fo),ero:.38+fo*.5});
      if(!F.low) F.quad(m.snow,x,y,R0*.55*gi,R0*.5*gi,.9,{a:.3*(1-fo),ero:.5+fo*.4}); }
    for(const p of H.L){ const tt=t-p.dl; if(tt<0) continue; const f=sat((t-tEnd-p.dl*.4)/out), h=hgt(tt), ca=Math.cos(p.sa), sa=Math.sin(p.sa);
      if(!p.born){ p.born=true; K.dust(p.x,p.y,{n:p.big?4:2,r:p.s*.15,sp:[p.s*.4,p.s*1.4],a:.3,s:.6+p.s/500,life:1.4,c:'#8fb4cc',c3:'#e4f4ff'});
        for(let i=0;i<Math.round((p.big?8:4)*(GFX.QK||1));i++){ const a=R(0,TAU_), v=R(120,420); GFX.pt({x:p.x,y:p.y,z:R(2,20),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:R(300,800),g:2400,drag:.3,life:R(.5,.9),s:R(3,7),rot:R(0,TAU_),vr:R(-12,12),m:11,b:'alpha',c:rgb('#cfeeff'),c2:'#2e5f80',shadow:true,bounce:.3,fk:5,L:2,pri:1}); } }
      if(mode==='shatter'&&f>0&&!p.sh) brk(p);
      const gone=mode==='shatter'?sat(f*3.5):f, sink=mode==='melt'?f*f*.45:0, sc=.55+.45*Math.min(h,1.1), z=p.s*((h-sink)-1)*.55;
      if(solids&&gone<1) F.solid('ice',p.v,p.x,p.y,z,{M:F.xfw({sx:p.s*.95*p.wd*sc,sy:p.s*.95*p.wd*sc,sz:p.s*sc,rz:p.rz,rx:sa*p.ln,ry:ca*p.ln}),alb,dustC:dc,emis:P.b,rimC:P.h,spec:.6,rim:.35,vein:0,glow,clear:o.clear,frost:o.frost??1,
        ero:gone*.9,bump:1.6,shadow:bigs.includes(p)?[.32,.2,.32*(1-gone)]:null,seed:p.sd}); }
    // glints running over the crystals, and cold vapour sliding off them
    if(!F.low&&fo<.5){ gE+=dt*(10+6*n)*(GFX.QK||1); while(gE>=1){ gE-=1; const p=H.L[(Math.random()*H.L.length)|0]; GFX.pt({x:p.x+R(-.18,.18)*p.s,y:p.y+R(-6,6),z:p.s*R(.15,.95),vx:0,vy:0,vz:0,g:0,life:R(.12,.3),s:R(4,9),m:8,c:[1,1,1],fade:'in',L:3,pri:1});
        if(Math.random()<.25) GFX.pt({x:p.x+R(-.2,.2)*p.s,y:p.y,z:p.s*R(.3,.8),vx:R(-30,30),vy:R(-10,10),vz:R(-60,-15),g:0,drag:.8,life:R(.9,1.6),s:R(16,30)*(p.s/300),grow:R(20,45),m:5,b:'alpha',c:rgb('#bcdcee'),c2:'#4a6e86',c3:'#f0fbff',er:.9,ns:R(.9,1.5),w:1,a:.22,L:2,pri:1}); } } },o.delay||0);
  after(o.delay||0,()=>GFX.light(x,y,(r+s1)*2,P.l,.3+glow*.35,dur,{z:s1*.6,hold:dur*.7}));
  return H; };

// ---------------------------------------------------------------- 2. meteor
// METEOR: a tumbling broken rock falling onto (x,y) from the sky: molten seams glowing in its crust, its face toward the air a sheet of white plasma,
//  a fire tail and a longer smoke tail streaming back along its path, embers and burning chips tearing off it, smoke left hanging in the air
//  behind it, its light growing on the floor and a dark spot tightening where it will land. On landing it calls o.land(x,y) and (unless
//  impact:false) sets off K3.impact there. o: {s (body radius 170), h0 (start height 2200), dx,dy (start offset on the floor: where it comes from,
//  -700,-250), dur (.9 fall time), spin (2.2), pal ('flame' seams and fire), rock ('#2a2421'), hot (1: plasma face), tail (1), smoke (1),
//  impact ({...K3.impact options} | false), land(x,y), delay} -> handle {x,y,z (current), dead, landed}
K.meteor=(x,y,o={})=>{ const H={x,y,z:o.h0??2200,dead:false,landed:false}; const d0=o.delay||0;
  if(!F.on){ after(d0+(o.dur||.9),()=>{ H.landed=true; if(o.land) o.land(x,y); }); return H; }
  const m=m10(), P=pal(o.pal||'flame'), S=o.s||170, dur=o.dur||.9, h0=o.h0??2200, x0=x+(o.dx??-700), y0=y+(o.dy??-250), sp=o.spin??2.2, v=(Math.random()*4)|0, ax=R(-1,1), ay=R(-1,1),
    C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, DX=x-x0, DY=(y-y0)/FSY, DZ=-h0, DL=Math.hypot(DX,DY,DZ), dir=[DX/DL,DY/DL,DZ/DL], fdir=Math.atan2(DY,DX), pit=Math.atan2(h0,Math.hypot(DX,DY)||1);
  const pos=u=>{ const k=u*(.4+.6*u); return [x0+DX*k,y0+(y-y0)*k,h0*(1-k)]; };
  let jet=null, smk=null, E=0, tp=0, L=null;
  const land=()=>{ if(H.landed) return; H.landed=true; H.dead=true; if(jet) jet.dead=true; if(smk) smk.dead=true; if(L) L.t=L.life;
    if(o.land) o.land(x,y); if(o.impact!==false) K.impact(x,y,{s:S*2.4,fire:P,pal:P,...(o.impact||{})}); };
  GFX.add(dur+.05,(k,t)=>{ if(H.dead) return; const u=sat(t/dur), [px,py,pz]=pos(u), dt=Math.max(0,t-tp); tp=t; H.x=px; H.y=py; H.z=pz;
    if(u>=1){ land(); return; }
    if(!jet&&vok()&&o.tail!==0){ jet=K.vjet(px,py,pz,fdir+PI,{len:S*6.5,r:S*1.25,r0:S*.85,dur:dur*2,pal:P,pitch:pit,heat:1.35,turb:.75,speed:8,in:.06,out:.05,gain:1.1});
      if(o.smoke!==0) smk=K.vjet(px,py,pz,fdir+PI,{len:S*13,r:S*2.2,r0:S*.9,dur:dur*2,pal:P,pitch:pit,heat:0,turb:.9,speed:5,in:.1,out:.05,c:'#221c18',c2:'#7a6a5e',gain:.9}); }
    // the tails ride behind the body; the smoke tail starts a little further back so the fire stays in front of it
    if(jet){ jet.x=px; jet.y=py; jet.z=pz; } if(smk){ const b=S*1.6; smk.x=px-dir[0]*b; smk.y=py-dir[1]*b*FSY; smk.z=pz-dir[2]*b; }
    // the body: tumbling about its own centre
    const M=F.xfw({s:S*1.6,rx:ax*t*sp,ry:ay*t*sp*.7,rz:t*sp}); M[12]-=M[8]*.35; M[13]-=M[9]*.35; M[14]-=M[10]*.35;
    F.bill(m.flash,px,py,pz,S*2.7,S*2.7,0,{...C,a:.42,gain:1.3});
    F.solid('meteor',v,px,py,pz,{M,clip:0,alb:o.rock||'#2a2421',emis:P.b,rimC:P.h,spec:.3,rim:.3,glow:1.3,hot:[dir[0],dir[1],dir[2],o.hot??1],bump:2.4,dust:0,edge:.04});
    // the plasma face: a hot cap just ahead of it
    const fx=px+dir[0]*S*.55, fy=py+dir[1]*S*.55*FSY, fz=pz+dir[2]*S*.55, fl=.85+.15*hash(Math.floor(t*40));
    F.bill(m.flash,fx,fy,fz,S*1.5*fl,S*1.2*fl,-fdir*.3,{...CW,a:.75,gain:2.2});
    // what tears off it: embers, burning chips, smoke puffs that stay hanging along the path
    E+=dt*150*(GFX.QK||1); while(E>=1){ E-=1; const r=Math.random(), ox=R(-.6,.6)*S, oz=R(-.6,.6)*S;
      if(r<.45) GFX.pt({x:px+ox,y:py,z:pz+oz,vx:-dir[0]*R(300,900)+R(-150,150),vy:-dir[1]*R(300,900)*FSY,vz:-dir[2]*R(300,900)+R(-80,200),g:600,drag:1.2,life:R(.25,.7),s:R(3,6),m:3,len:.04,c:rgb(Math.random()<.4?'#ffffff':P.s),c3:'#ffffff',c2:P.b,L:3,pri:1});
      else if(r<.6) GFX.pt({x:px+ox,y:py,z:pz+oz,vx:-dir[0]*R(100,400)+R(-200,200),vy:R(-100,100),vz:R(-100,300),g:1500,drag:.5,life:R(.5,1),s:R(5,10),rot:R(0,TAU_),vr:R(-10,10),m:8,c:rgb(P.m),fade:'in',L:3,pri:1});
      else GFX.pt({x:px-dir[0]*S*.8+ox,y:py-dir[1]*S*.8*FSY,z:pz-dir[2]*S*.8+oz,vx:R(-40,40),vy:R(-20,20),vz:R(10,60),g:0,drag:.9,life:R(1.2,2.2),s:R(30,60)*(S/170),grow:R(40,90),m:5,b:'alpha',c:rgb('#2e2620'),c2:'#000000',c3:'#6e6258',er:.9,ns:R(.9,1.6),w:1,a:.45,L:2,pri:1}); }
    // on the floor: the light it throws, and a dark spot tightening where it will land
    F.quad(m.shade,x,y,S*(3.2-2*u),S*(3.2-2*u)*.8,.3,{a:.25+.5*u});
    F.quad(m.flash,px,py,S*(2+4*u),S*(2+4*u),0,{...C,a:.12+.4*u*u,gain:1.1,layer:'g'});
    if(!L) L=GFX.light(px,py,S*8,P.l,.5,dur+.2,{z:pz}); L.x=px; L.y=py; L.z=pz; L.a=.4+.7*u; L.r=S*(5+5*u); L.t=0; },d0);
  return H; };

// ---------------------------------------------------------------- 3. lightning
// LIGHTNING: a real bolt from the sky to (x,y): a jagged channel with branches that die in the air, a thread of white of uneven thickness inside
//  a coloured glow and a wide ionised haze; it strikes 3..5 times (return strokes) on the same channel - each a hard flash that falls off fast,
//  the branches changing between strokes - then leaves an afterimage that cools to the palette colour. Where it lands: a flash, sparks, flung dirt,
//  a scorch with cracks, dust, the floor lit and flickering. Drawn as three ribbons (all branches in each).
//  o: {h (sky height 2400), sx,sy (sky start offset, random), w (core width 13), pal ('violet'), strokes (4), span (.5 s over which they come),
//      branches (5), rough (.2), r (scorch radius 170), after (.45 afterimage seconds), scorch:0, light:0, delay}
//  -> handle {pts (the channel), x,y, dead}
K.lightning=(x,y,o={})=>{ const H={x,y,pts:null,dead:false}; if(!F.on) return H;
  const m=m10(), P=pal(o.pal||'violet'), C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, hs=o.h||2400, w=o.w||13, ns=Math.max(1,o.strokes??4), span=o.span??.5, aft=o.after??.45, rough=o.rough??.2,
    A=[x+(o.sx??R(-500,500)),y/FSY+(o.sy??R(-150,150)),hs], B=[x,y/FSY,0];
  const ST=[0]; for(let i=1;i<ns;i++) ST.push(ST[i-1]+span/ns*R(.6,1.4)); const tl=ST[ns-1];
  const zig=(a,b,ro,lv)=>{ let P_=[a,b]; for(let l=0;l<lv;l++){ const Q=[P_[0]]; for(let i=1;i<P_.length;i++){ const p=P_[i-1], q=P_[i], dl=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2])*ro; Q.push([(p[0]+q[0])/2+R(-dl,dl),(p[1]+q[1])/2+R(-dl,dl)*.6,(p[2]+q[2])/2+R(-dl,dl)*.3],q); } P_=Q; } return P_; };
  const main=zig(A,B,rough,6), mw=main.map((p,i)=>(.5+.9*Math.random())*(.75+.5*(i/main.length)));
  // the last few points straighten into the strike point
  for(let i=main.length-4;i<main.length;i++){ const k=(i-(main.length-4))/3; main[i][0]=mix(main[i][0],x,k); main[i][1]=mix(main[i][1],y/FSY,k); }
  H.pts=main.map(p=>({x:p[0],y:p[1]*FSY,z:p[2]}));
  let br=[]; const mkBr=()=>{ br=[]; const nb=o.branches??5; for(let j=0;j<nb;j++){ const i=Math.floor(R(.1,.7)*main.length), s=main[i], len=s[2]*R(.25,.55), a=R(0,TAU_);
      const e=[s[0]+Math.cos(a)*len*.7,s[1]+Math.sin(a)*len*.35,Math.max(40,s[2]-len*R(.6,1))], P_=zig(s,e,.24,4); br.push(P_.map((p,q)=>({x:p[0],y:p[1]*FSY,z:p[2],k:(1-q/(P_.length-1))*R(.5,.8)*(j<2?1:.7)}))); } };
  mkBr();
  const strip=(sc)=>{ const out=[]; main.forEach((p,i)=>out.push({x:p[0],y:p[1]*FSY,z:p[2],w:w*sc*mw[i]})); const last=out[out.length-1]; out.push({...last,w:0});
    for(const b of br){ out.push({...b[0],w:0}); for(const q of b) out.push({x:q.x,y:q.y,z:q.z,w:w*sc*q.k*.55}); out.push({...b[b.length-1],w:0}); } return out; };
  let si=-1;
  const ground=(j)=>{ const p=j===0?1.3:1; GFX.light(x,y,hs*.32,P.l,1*p,.1,{z:220});
    K.sparks(x,y,20,{pal:P,n:Math.round(12*p),sp:[300,1300],up:1000,life:[.15,.45],s:3});
    if(j===0){ GFX.ripple(x,y,(o.r||170)*2.2,{life:.35,s:.8}); K.dust(x,y,{n:8,r:30,sp:[180,560],a:.45,s:.9,life:1.2,c:'#2a2430',c3:'#5a5266'});
      for(let i=0;i<Math.round(14*(GFX.QK||1));i++){ const a=R(0,TAU_), v=R(250,700); GFX.pt({x,y,z:4,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:R(500,1200),g:2600,drag:.25,life:R(.6,1.1),s:R(3,8),rot:R(0,TAU_),vr:R(-12,12),m:11,b:'alpha',c:rgb('#4a4038'),c2:'#08070a',shadow:true,bounce:.3,fk:5,L:2,pri:1}); }
      if(o.scorch!==0){ K.cool(x,y,{kind:'scorch',r:(o.r||170)*1.3,pal:P,life:3,hot:.4,start:.05,light:0}); K.cool(x,y,{kind:'crack2',r:(o.r||170)*1.6,pal:P,life:2.6,hot:.55,grow:.08,light:0}); } } };
  GFX.add(tl+aft+.1,(k,t)=>{ if(H.dead) return; let j=-1; for(let i=0;i<ns;i++) if(t>=ST[i]) j=i;
    if(j!==si){ si=j; if(j>0) mkBr(); ground(j); }
    const ds=t-ST[j], fl=.8+.2*hash(Math.floor(t*55)+j*13), I=Math.min(1.6,Math.exp(-ds*26)*1.6+.16)*fl, af=t>tl?sat((t-tl-.06)/aft):0, glowK=t>tl?Math.max(I,.5*(1-af)):I;
    const s1=strip(1);
    if(!F.low) F.ribbon(m.lH,strip(9),{...C,a:.18*Math.min(1,glowK)*(1-af),gain:1});
    F.ribbon(m.lG,strip(3.2),{...C,a:Math.min(1,glowK)*(1-af*af),gain:1.6+.8*Math.min(1,I),ulen:600});
    if(af<.6) F.ribbon(m.lC,s1,{...CW,a:Math.min(1,I*1.2)*(1-af/.6),gain:3+1.5*Math.min(1,I)});
    // the strike point: a white-hot flash on the floor and its light pool
    const ga=Math.min(1,I)*(1-af);
    F.bill(m.flash,x,y,30,w*(6+7*I),w*(6+7*I)*.75,0,{...CW,a:ga,gain:2.2});
    F.quad(m.flash,x,y,w*13,w*13,0,{...C,a:ga*.65,gain:1.3,layer:'g'});
    if(o.light!==0&&I>.5&&ds<.05) GFX.light(x,y,hs*.3,P.l,.8*I,.06,{z:300}); },o.delay||0);
  return H; };

// ---------------------------------------------------------------- 4. impact
// IMPACT: what a heavy fall really does: a flash, a curtain of dirt thrown out in a cone that opens and falls back, rocks and real stones
//  flung out, a ring of dust rolling over the floor, a mushroom of dust and smoke climbing over it - its foot lit by the fire, its cap dark -
//  and a molten crater whose rim cools. Magic colour lives in the cracks and the afterglow only (pal); the fire is the fire (fire).
//  o: {s (crater radius 420), h (cloud height s*3.4), dur (3.4), fire ('flame'), pal (crack light / afterglow, default = fire), rock ('#4a433d'),
//      cloud (1), ring (1), curtain (1), stones (5), delay}
K.impact=(x,y,o={})=>{ if(!F.on) return; const m=m10(), Pf=pal(o.fire||'flame'), P=pal(o.pal||o.fire||'flame'), s=o.s||420, HH=o.h||s*2.4, dur=o.dur||3.4, C=col(Pf), CW={cA:Pf.b,cB:Pf.m,cM:Pf.h,cC:'#ffffff'}, sd=R(0,9);
  const go=()=>{
    GFX.add(.34,k=>{ const e=eo5(k), a=(1-k)*(1-k); F.bill(m.flash,x,y,s*.35,s*(1+1.5*e),s*(1+1.5*e)*.85,0,{...CW,a,gain:2.4}); F.quad(m.flash,x,y,s*(1.2+1.6*e),s*(1.2+1.6*e),0,{...C,a:a*.7,gain:1.4,layer:'g'}); });
    GFX.light(x,y,s*4,Pf.l,.95,.5,{z:s*.6,hold:.08}); GFX.ripple(x,y,s*2.6,{life:.55,s:1});
    // the crater: churned scorched floor, a molten pool in it, a rim that cools, cracks running out in the magic colour
    K.cool(x,y,{kind:'crater',r:s*1.15,pal:Pf,life:dur,hot:.5,grow:.1});
    K.cool(x,y,{kind:'lava',r:s*.5,pal:P,life:dur,hot:.8,grow:.08,light:0});
    K.cool(x,y,{kind:'ring',r:s*1.35,pal:Pf,life:dur*.85,hot:.4,start:.12,grow:.18,light:0});
    K.cool(x,y,{kind:'crack2',r:s*2.2,pal:P,life:dur,hot:.65,grow:.3,light:0});
    // the ejecta curtain: a cone that opens out and up, then thins and falls back
    if(o.curtain!==0) GFX.add(1.4,(k,t)=>{ const e=eo3(sat(t/.5)), f=sat((t-.4)/1), r0=s*(.5+.5*e), r1=s*(.85+1.75*e), hh=s*(.3+1.15*e)*(1-.4*f*f);
      F.lathe(m.cur,x,y,0,{r0,r1,h0:0,h1:hh,a:.85*(1-f*f),ero:.3+f*.55,t0:sd});
      F.lathe(m.curL,x,y,0,{r0,r1,h0:0,h1:hh*.7,...C,a:.45*(1-e)*(1-f),ero:.3+f*.6,gain:1.1,t0:sd}); });
    const nq=Math.round(40*(GFX.QK||1)), vs=Math.sqrt(s/420);
    for(let i=0;i<nq;i++){ const a=R(0,TAU_), el=R(.6,1.1), v=R(800,1700)*vs, hot=i%5===0;
      GFX.pt({x:x+Math.cos(a)*s*.3,y:y+Math.sin(a)*s*.3*FSY,z:10,vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v*1.25,g:2600,drag:.15,life:R(1,1.8),s:R(5,14)*vs,rot:R(0,TAU_),vr:R(-10,10),m:11,b:'alpha',c:rgb(hot?Pf.d:'#4a3f36'),c2:'#0a0807',shadow:true,bounce:.3,fk:5,L:2,pri:1});
      if(hot) GFX.pt({x,y,z:20,vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v*1.25,g:2600,drag:.15,life:R(.5,1),s:R(3,6),m:3,len:.03,c:rgb(Pf.s),c3:'#ffffff',c2:Pf.b,L:3,pri:1}); }
    if(o.stones!==0&&K.chunks) K.chunks(x,y,{n:o.stones||5,kind:'stone',r:s*.4,sp:[300,900],up:1400,s:[s*.1,s*.22],pal:P,rock:o.rock||'#4a433d',life:1.9});
    // the dust ring rolling out over the floor
    if(o.ring!==0) K.vring(x,y,{r:s*3.2,r0:s*.6,dur:1.6,tube:.13,c:'#171310',c2:'#3c332b',lit:.15,a:.85});
    // the mushroom: a stem of dust lit orange from below, a cap that rolls outward, dark on top
    if(o.cloud!==0&&vok()){ const VC=K.vc(Pf), ph=R(0,TAU_);
      GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/1.2)), f=sat((t-dur*.5)/(dur*.5)), top=HH*(.18+.82*g), hot=Math.max(0,1-t/1.3), cr=s*(.5+1.05*g), fd=1-f*f, lk=hexm('#4a4038',Pf.l,hot*.75);
        const B=(px,py,pz,r,hk,dn,sdd,ez,amb)=>V.add('blast',px,py,pz,{ex:r,ey:r,ez:r*(ez||.85),pa:[.6,.55,2.2,t*.3],pb:[hk,.85,1.2,.35],dens:dn*fd,gain:1.4,seed:sd+sdd,smoke:1,fire:.72,...VC,cS:'#110e0c',cK:lk,amb:amb??.16,key:1.25,rim:.28,glow:.3*hot,lit:.3});
        // the base surge: fire turning to dust at the foot
        B(x,y,s*(.25+.2*g),s*(.75+.85*g),1.5*hot*hot+.05,10*sat(t/.06),0,.55,.22);
        // two lumps of the stem, drifting, lit from below
        const dr=Math.sin(t*1.3+ph)*s*.12; B(x+dr,y-1,top*.36,s*(.4+.35*g),.45*hot,8.5*sat((t-.05)/.25),1,1);
        B(x-dr*.7+s*.08,y-2,top*.66,s*(.36+.4*g),.25*hot,8*sat((t-.12)/.3),2,1);
        // the cap: wide, rolling outward, dark on top
        B(x,y-3,top+cr*.1,cr,.35*hot,9.5*sat((t-.18)/.35),3,.6,.14); },0);
    }
    K.sparks(x,y,40,{pal:Pf,n:28,sp:[800,2300],up:1500,life:[.3,.8],s:4});
    if(P!==Pf||o.pal) K.embers(x,y,s*1.3,{pal:P,n:26,up:380,life:2.6,z:60});
  };
  if(o.delay) after(o.delay,go); else go(); };

// ---------------------------------------------------------------- 5. the floor bursting up
// ERUPTEARTH: the ground at (x,y) breaks and throws itself up: a jumble of broken stone and shards bursting out of a cracked, glowing seam,
//  a ragged fountain of dirt and stones that falls back, light leaking from the cracks, lit dust and smoke rolling up off it (no uniform column).
//  o: {r (220), h (spray height r*3.2), pal ('jade' light in the cracks), glow (.9), n (stones 6), rock ('#57504a'), clods (46), rocks:0 (no stones),
//      dur (2.2), delay} -> the K3.rocks handle (or null)
K.eruptEarth=(x,y,o={})=>{ const P=pal(o.pal||'jade'), r=o.r||220, h=o.h||r*3.2, dur=o.dur||2.2, rk=o.rock||'#57504a';
  const go=()=>{ if(!F.on) return null;
    K.cool(x,y,{kind:'crack2',r:r*2,pal:P,life:dur+.9,hot:.75,grow:.12});
    K.cool(x,y,{kind:'scorch',r:r*1.3,pal:P,life:dur+.9,hot:.3,start:.35,light:0});
    const rks=o.rocks!==0?K.rocks(x,y,{n:o.n||6,r:r*.55,s:[r*.35,r*1.05],kinds:['shard','stone','flag','shard','stone','cobble'],rock:rk,pal:P,glow:o.glow??.9,rise:.13,over:.22,stagger:.025,dur,out:.45,lean:1.6,dust:.6}):null;
    const n=Math.round((o.clods||46)*(GFX.QK||1)), vk=Math.sqrt(r/220);
    for(let i=0;i<n;i++){ const a=R(0,TAU_), el=R(1.05,1.45), v=Math.sqrt(2*2600*h)*R(.45,1), rr=R(0,r*.5);
      GFX.pt({x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*FSY,z:R(0,30),vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v,g:2600,drag:.2,life:R(1,1.8),s:R(4,13)*vk,rot:R(0,TAU_),vr:R(-12,12),m:11,b:'alpha',c:rgb(Math.random()<.5?'#3e352e':'#5e5248'),c2:'#090706',shadow:true,bounce:.25,fk:5,L:2,pri:1}); }
    K.embers(x,y,r*.7,{pal:P,n:16,up:520,z:30,life:1.8});
    GFX.light(x,y,r*3,P.l,.85,dur*.55,{z:60,flick:.2});
    if(K.vsmoke){ K.vsmoke(x+R(-.3,.3)*r,y-r*.12,{s:r*1.5,dur:2.4,rise:h*.55,c:'#1e1915',c2:'#64564a',a:.75,lit:.35,delay:.07});
      K.vsmoke(x+R(-.4,.4)*r,y+r*.15,{s:r*1.1,dur:2,rise:h*.3,c:'#1e1915',c2:'#64564a',a:.6,lit:.35,delay:.2}); }
    K.dust(x,y,{n:10,r:r*.6,sp:[r*1.2,r*3.2],a:.45,s:1.3,life:1.4,c:'#2e2620',c3:'#6a5a4c'});
    if(K.chunks) K.chunks(x,y,{n:4,kind:'stone',r:r*.4,sp:[200,600],up:Math.sqrt(2*3000*h)*.85,s:[r*.12,r*.26],pal:P,rock:rk,life:1.9});
    return rks; };
  if(o.delay){ after(o.delay,go); return null; } return go(); };

// ---------------------------------------------------------------- 6. the god's motion (K3.deity with {rig:1})
// Arm poses for the right arm (the left mirrors it): A azimuth (0 out to the side, PI/2 toward the camera), e elevation (+ up), b elbow bend;
//  L forward lean of the body, hp head pitch (- chin down, + head up). A pose may leave L / hp out.
const POSE={open:{A:.15,e:-.5,b:.35},raise:{A:.05,e:1.05,b:.4},down:{A:.1,e:-1.2,b:.1},press:{A:.75,e:-.15,b:-.75},up:{A:-.2,e:1.35,b:.5,L:-.25,hp:.15},
  smite:{A:1.1,e:-.6,b:-.12,L:.55,hp:-.2},point:{A:.95,e:.05,b:0,L:.15},rest:{A:.3,e:-.95,b:.3,L:0},bow:{A:.4,e:-1.1,b:.3,L:.35,hp:-.5}};
K.POSE=POSE;
const EAS={io:u=>u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2,out:u=>1-Math.pow(1-u,3),in:u=>u*u*u,lin:u=>u,heavy:u=>{ const c=1.9; return 1+(c+1)*Math.pow(u-1,3)+c*Math.pow(u-1,2); }};
// DEITY (rig): a giant of light and mist with a skeleton. It condenses from the ground up (robe, chest, arms, head), breathes, lifts its head to look
//  down on the field, moves shoulder - elbow - hand with weight (eased, with overshoot on heavy moves), its sleeves of mist trail behind the hands,
//  and it leaves by scattering upward. Thickness and self-shadow are set by `solid`.
//  o: everything K3.deity takes, plus {rig:1, pose ('rest'), look (head pitch it lifts to, 0), bow (start with the head down, 1), solid (0..1, .55),
//      in (formation seconds, .9), breath (1), sleeves (1)}
//  handle: {x,y,z,h,a, pose(name|{A,e,b,L,hp}, dur=.6, ease='io', arm=-1), look(hp, dur), act('smite', {arm, up, hold, down, hit(H)}) | act('point', {arm, to:[x,y], dur, hit(H)}),
//           head(), hand(i), end(), busy()}
K.deityRig=(x,y,o={})=>{ const h=o.h||850, H={x,y,z:o.z??h*.06,h,a:o.a??1,dead:false,t1:-1,Q:[],tw:null,
    end(){ if(H.t1<0) H.t1=RT; }, busy(){ return !!H.tw||H.Q.length>0; },
    pose(p,dur=.6,ease='io',arm=-1,fn){ H.Q.push({p,dur,ease,arm,fn}); return H; },
    look(hp,dur=.6,ease='io'){ H.Q.push({p:{hp},dur,ease,arm:-1}); return H; },
    act(kind,q={}){ const arm=q.arm??-1;
      if(kind==='smite'){ H.pose('up',q.up??.5,'out',arm); H.Q.push({hold:q.hold??.1}); H.pose('smite',q.down??.13,'in',arm,()=>{ hitFx(arm); if(q.hit) q.hit(H); }); H.pose(q.after||'rest',q.settle??.55,'heavy',arm); }
      else if(kind==='point'){ const i=arm<0?1:arm, sx=i?1:-1, sh=[H.x+sx*H.h*.14,H.y], tx=(q.to||[H.x,H.y+600])[0]-sh[0], ty=((q.to||[H.x,H.y+600])[1]-sh[1])/FSY, dz=H.z+H.h*.72, A=Math.atan2(ty,tx*sx);
        H.pose({A,e:-Math.atan2(dz,Math.hypot(tx,ty))*.8,b:0,L:.2},q.dur??.35,'heavy',i,()=>{ hitFx(i); if(q.hit) q.hit(H); }); }
      return H; },
    head(){ return J.head.slice(); }, hand(i){ return (i?J.h1:J.h0).slice(); }};
  if(!F.on) return H;
  const m=m10(), P=pal(o.pal||'gold'), VC=K.vc?K.vc(P):null, C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, dur=o.dur||3, tin=o.in??.9, out=o.out??.8, g=o.gain||1, sd=R(0,9), sol=o.solid??.55;
  const p0=typeof o.pose==='object'?o.pose:POSE[o.pose||'rest']||POSE.rest;
  // the live pose: two arms, lean, head pitch; and a lagging copy that drives the robe and the mist
  const S={ar:[{A:p0.A,e:p0.e,b:p0.b},{A:p0.A,e:p0.e,b:p0.b}],L:p0.L||0,hp:o.bow===0?(o.look||0):-.55}, LG=JSON.parse(JSON.stringify(S));
  if(o.bow!==0) H.Q.push({hold:tin*.55}), H.Q.push({p:{hp:o.look??.05},dur:.7,ease:'heavy',arm:-1});
  const J={head:[x,y,H.z+h*.86],h0:[x,y,0],h1:[x,y,0]}, HIST=[[],[]];
  const HL=o.halo!==0?K.halo(x,y,H.z+h*.86,{r:h*.13,pal:P,dur:(o.max||dur)+tin,in:tin*.8,out,tilt:-.95,gain:.6*g,a:.75,delay:(o.delay||0)+tin*.75}):null;
  const hitFx=arm=>{ for(let i=0;i<2;i++){ if(arm>=0&&arm!==i) continue; const p=i?J.h1:J.h0; K.flare(p[0],p[1],p[2],{pal:P,s:h*.22,dur:.3,gain:2.6}); K.sparks(p[0],p[1],p[2],{pal:P,n:10,sp:[400,1400],up:400,life:[.2,.5],s:3}); } };
  const lerpP=(a,b,u)=>({A:mix(a.A,b.A??a.A,u),e:mix(a.e,b.e??a.e,u),b:mix(a.b,b.b??a.b,u)});
  const step=t=>{ if(!H.tw&&H.Q.length){ const q=H.Q.shift(); if(q.hold!=null) H.tw={t0:t,dur:q.hold,hold:1}; else { const tg=typeof q.p==='string'?POSE[q.p]:q.p; H.tw={t0:t,dur:Math.max(.01,q.dur),ease:EAS[q.ease]||EAS.io,arm:q.arm,fn:q.fn,tg,from:JSON.parse(JSON.stringify({ar:S.ar,L:S.L,hp:S.hp}))}; } }
    const w=H.tw; if(!w) return; const u=sat((t-w.t0)/w.dur);
    if(!w.hold){ const e=w.ease(u), tg=w.tg;
      for(let i=0;i<2;i++) if(w.arm<0||w.arm===i){ if(tg.A!=null||tg.e!=null||tg.b!=null) S.ar[i]=lerpP(w.from.ar[i],tg,e); }
      if(tg.L!=null) S.L=mix(w.from.L,tg.L,e); if(tg.hp!=null) S.hp=mix(w.from.hp,tg.hp,e); }
    if(u>=1){ H.tw=null; if(w.fn) w.fn(); } };
  // a limb of mist between two points (true-depth units relative to the figure's foot): A is the frayed end
  const seg=(A,B,ey,ra,rb,flow,rag,a,glow,ord,loose,dk)=>{ const dx=B[0]-A[0], dy=B[1]-A[1], dz=B[2]-A[2], L2=Math.hypot(dx,dy,dz)/2||1;
    V.add('wisp',H.x+(A[0]+B[0])/2,H.y+(A[1]+B[1])/2*FSY,H.z+(A[2]+B[2])/2,{ex:L2+ey*.35,ey,ez:ey,yaw:Math.atan2(dy,dx),pitch:Math.atan2(dz,Math.hypot(dx,dy)),pa:[ra,rb,2.4,flow],pb:[glow*(o.glow??.24),loose,(o.rimK??.9),rag],
      dens:(o.dens??3.6)*(1+1.4*sol)*a*dk,gain:1.1*g,seed:sd+ord,smoke:.25+.3*sol,fire:.75,block:.55+.35*sol,cA:P.d,cB:P.b,cM:P.m,cC:P.h,cS:VC?VC.cS:P.d,cK:P.m,amb:.22,key:1.15+.3*sol,rim:.9,glow:.2,sdist:.15+.1*sol,shadow:2.5+3*sol,ord:H.y+ord,steps:22,lit:.6+.3*sol}); };
  const dirv=(A,e,s)=>[s*Math.cos(e)*Math.cos(A),Math.cos(e)*Math.sin(A),Math.sin(e)];
  let tp=0, hs=0, eF=0, eX=0;
  GFX.add((o.max||dur)+out+.05,(k,t)=>{ if(H.dead) return; const dt=Math.max(0,t-tp); tp=t;
    const te=H.t1>=0?Math.min(dur,t-(RT-H.t1)):dur, f=sat((t-te)/out); if(f>=1){ H.dead=true; if(HL) HL.end(); return; } if(f>0&&HL) HL.end();
    step(t);
    // the lag: follows the pose a beat late (secondary motion)
    const lk=1-Math.exp(-dt*3.2); for(let i=0;i<2;i++) for(const c of ['A','e','b']) LG.ar[i][c]+=(S.ar[i][c]-LG.ar[i][c])*lk; LG.L+=(S.L-LG.L)*lk;
    const hh=H.h, hv=sat(t/tin)*1.2, br=o.breath===0?0:Math.sin(t*1.7+sd), up=f*f*hh*.3, A0=H.a*(1-f);
    const al=[ss(0,.28,hv),ss(.28,.55,hv),ss(.45,.75,hv),ss(.65,.95,hv)].map(v=>v*A0), loose=v=>.85+1.4*(1-v)+.8*f;
    // joints (x right, y toward the camera in true depth, z up), relative to the foot
    const Lb=S.L, sway=(LG.L-S.L)*.5, hp=S.hp;
    const waist=[0,Lb*hh*.04,hh*.5+up], neck=[0,Lb*hh*.1,hh*(.77+.006*br)+up], hem=[sway*hh*.15,(sway+Lb*.3)*hh*.12-hh*.02,hh*.02+up*.6];
    const head=[0,neck[1]+hh*(.03+.06*Math.max(0,-hp))*(1)+Lb*hh*.02,neck[2]+hh*(.085+.03*Math.min(0,hp)*1.2)];
    if(VC&&vok()){
      seg(hem,waist,hh*.22*(1+.02*br),1,.36,.9,1.5,al[0],1,0,loose(al[0]),1);
      seg(waist,neck,hh*.13*(1+.035*br),.78,1,.7,.3,al[1],1.2,1,loose(al[1]),1.15);
      seg([head[0],head[1]-hh*.02,head[2]-hh*.07],[head[0],head[1]+hh*.02,head[2]+hh*.06],hh*.068,.9,.85,.6,.2,al[3],1.5,3,loose(al[3]),1.2); }
    for(let i=0;i<2;i++){ const s=i?1:-1, a=S.ar[i], sh=[s*hh*.14,Lb*hh*.08,hh*(.715+.008*br)+up], d1=dirv(a.A,a.e,s), d2=dirv(a.A+a.b*.35,a.e+a.b,s), el=[sh[0]+d1[0]*hh*.2,sh[1]+d1[1]*hh*.2,sh[2]+d1[2]*hh*.2], hd=[el[0]+d2[0]*hh*.19,el[1]+d2[1]*hh*.19,el[2]+d2[2]*hh*.19];
      if(VC&&vok()){ seg(sh,el,hh*.062,1,.85,1,.3,al[2]*.95,1,2+i*.1+d1[1],loose(al[2]),1.1); seg(hd,el,hh*.052,.6,.95,1.2,.5,al[2]*.9,1.25,2.2+i*.1+d2[1],loose(al[2]),1.1); }
      const wp=[H.x+hd[0],H.y+hd[1]*FSY,H.z+hd[2]]; if(i) J.h1=wp; else J.h0=wp;
      // hands glow a little; the sleeve of mist streams from the elbow through the hand and trails where the hand has been
      F.bill(m.flash,wp[0],wp[1],wp[2],hh*.06,hh*.06,0,{...CW,a:.5*al[2],gain:2*g});
      const Hs=HIST[i]; if(t-hs>.035||!Hs.length){ Hs.unshift([...wp]); if(Hs.length>11) Hs.pop(); }
      if(o.sleeves!==0&&Hs.length>2&&al[2]>.02){ const ep=[H.x+el[0],H.y+el[1]*FSY,H.z+el[2]], pts=[{x:ep[0],y:ep[1],z:ep[2],w:hh*.03}]; Hs.forEach((q,j)=>{ const u=j/(Hs.length-1); pts.push({x:q[0],y:q[1],z:q[2]-u*u*hh*.08,w:hh*(.045-.03*u)}); });
        F.ribbon(m.mist,pts,{...C,a:.7*al[2],gain:1.3*g,ulen:hh*.8,t0:sd+i*5}); } }
    if(t-hs>.035) hs=t;
    J.head=[H.x+head[0],H.y+head[1]*FSY,H.z+head[2]]; if(HL){ HL.x=J.head[0]; HL.y=J.head[1]-hh*.03; HL.z=J.head[2]+hh*.02; }
    // eyes: they light as the head comes up
    if(o.eyes!==0){ const lit=ss(-.35,0,hp)*al[3]*(.85+.15*Math.sin(t*7+sd)), ez=J.head[2]-hh*.005;
      for(let s=-1;s<=1;s+=2){ F.bill(m.flash,J.head[0]+s*hh*.027,J.head[1]+hh*.04*FSY,ez,hh*.06,hh*.018,0,{...CW,a:lit,gain:5*g}); } }
    if(o.shadow!==0) F.quad(m.shade,H.x+hh*.12,H.y+hh*.08,hh*.32,hh*.24,.3,{a:.75*A0*al[0]});
    // forming: motes of mist spiralling in at the height it has reached; leaving: motes streaming up and away
    if(hv<1.05){ eF+=dt*60*(GFX.QK||1); while(eF>=1){ eF-=1; const zf=H.z+Math.min(1,hv)*hh, a=R(0,TAU_), r0=hh*R(.25,.45); GFX.pt({x:H.x+Math.cos(a)*r0,y:H.y+Math.sin(a)*r0*FSY,z:zf,oc:[H.x,H.y,zf],or:r0,oa:a,ow:R(2,3.5),ok:r0*R(1,1.8),oz0:zf,rmin:hh*.05,life:.9,s:R(6,12),m:8,c:rgb(Math.random()<.4?P.h:P.m),fade:'in',L:3,pri:1}); } }
    if(f>0){ eX+=dt*120*(GFX.QK||1); while(eX>=1){ eX-=1; const zz=H.z+hh*R(.1,.95)+up, a=R(0,TAU_), rr=hh*R(.03,.16); GFX.pt({x:H.x+Math.cos(a)*rr,y:H.y+Math.sin(a)*rr*FSY,z:zz,vx:Math.cos(a)*R(60,260),vy:Math.sin(a)*R(30,120),vz:R(120,420),g:-50,drag:.5,life:R(.7,1.4),s:R(6,13),m:8,c:rgb(Math.random()<.4?P.h:P.m),fade:'in',L:3,pri:1}); } } },o.delay||0);
  return H; };
})();

// ================================================================ kit update 11: photographed stone and ice, round burning meteors (2026-11-25)
// The lumpy displaced-noise meshes of kit update 10 (stone cobble shard flag ice iceshard meteor) read as rough 3D. Those kinds are now drawn as
// photographs (assets/v3_real_*.webp: rocks, crags, glacier ice, ice chunks) standing in the world, and a meteor is a round ball of fire.
// F.solid keeps its signature, so every caller changes look without being rewritten. The older kinds (boulder slab spike crystal plate rock crag)
// are untouched. New names for callers: 'pstone' (a photographed rock), 'pcrag' (a torn-up outcrop standing on the floor), 'pice' (glacier ice).
// K3.real=0 turns all of this off (the meshes come back).
(()=>{
const K=window.K3, F=window.FX3; if(!K||!F||!window.GFX) return;
const FSY=.58, sat=K.sat, rgb=c=>typeof c==='string'?GFX.rgb(c):c;
const AT={
  rocks:{tex:'v3_real_rocks',cells:[[.01709,.00977,.21533,.48047,.8963],[.25488,.03125,.24023,.4375,1.0982],[.53027,.00977,.18945,.48047,.7886],[.76807,.00977,.21338,.48047,.8882],[.01318,.50977,.22314,.48047,.9289],[.25732,.50977,.23535,.48047,.9797],[.52393,.50977,.20166,.48047,.8394],[.76367,.50977,.22266,.48047,.9268]]},
  crags:{tex:'v3_real_crags',cells:[[.02734,.00977,.27783,.98047,.5667],[.33789,.1377,.32324,.85254,.7583],[.6709,.11426,.32324,.87598,.738]]},
  ice:{tex:'v3_real_ice',cells:[[.00391,.05859,.32422,.93359,.6946],[.33594,.30859,.66016,.68359,1.9314]]},
  ice2:{tex:'v3_real_ice2',cells:[[.0791,.00521,.17432,.65625,.3542],[.3501,.00521,.29834,.65625,.6062],[.66992,.08268,.3252,.57878,.7492],[.00391,.72201,.24219,.27279,1.1838],[.27246,.67188,.20508,.32292,.8468],[.50391,.72266,.24219,.27214,1.1866],[.75391,.6875,.24219,.30729,1.0508]]},
  chunks:{tex:'v3_real_icechunks',cells:[[.02344,.00977,.20312,.48047,.8455],[.28662,.00977,.17627,.48047,.7337],[.50488,.01758,.24023,.46387,1.0358],[.76172,.00977,.22607,.48047,.9411],[.01855,.50977,.2124,.48047,.8841],[.27197,.50977,.20605,.48047,.8577],[.50488,.51465,.24023,.46973,1.0229],[.76318,.50977,.22363,.48047,.9309]]}};
// kind -> [atlas, cells it may use, height of the picture in units of the model's height, stands on the floor]
const KM={stone:['rocks',[0,3,4,5,7,6],.86,0],cobble:['rocks',[5,7,0,4],.8,0],flag:['rocks',[1,3,5],.8,0],shard:['rocks',[2,6,1],.95,0],pstone:['rocks',[0,1,2,3,4,5,6,7],.86,0],
  pcrag:['crags',[0,1,2],1,1],ice:['ice',[0],1.05,1],pice:['ice',[0],1.05,1],picewall:['ice',[1],1,1],iceshard:['chunks',[0,1,2,3,4,5,6,7],.9,0],meteor:['ball']};
K.real=1; K.REAL=AT;
// glacier ice: the tall masses for a big piece, low broken ridges mixed in for a small one [atlas, cell, height factor]
const ICB=[['ice2',1,1.05],['ice',0,1.05],['ice2',0,1.12],['ice2',2,1]], ICS=[['ice2',3,.6],['ice2',1,1],['ice2',4,.7],['ice2',0,1.08],['ice2',5,.6],['ice2',2,.95],['ice2',6,.66],['ice',0,1]];
let MR=null;
function mr(){ if(MR) return MR; const m=F.mat, n9=K.m9?K.m9():null; MR={};
  for(const k in AT) MR[k]=m({kind:2,tex:AT[k].tex,nz:'fbm',n1:[3,3,0,0],ero:-1,soft:.06,cB:'#ffffff',cC:'#ffffff',gain:1,op:1});
  // the ball: a churning incandescent face, its corona, its white heart
  MR.face=m({pm:[3,.42,0,0],nz:'billow',n1:[1.6,1.6,.35,.22],n2:[2.2,2.2,-.2,.3],dist:.1,nk:.75,pw:1.25,ero:.12,soft:.3,rk:[.34,.95],gain:2.1,bgain:1.2});
  MR.cor=m({pm:[3,1.5,0,0],nz:'wisp',n1:[2,2,.5,.3],nk:.5,ero:.02,soft:.5,rk:[.4,.95],gain:1.5});
  MR.core=m({pm:[3,1.9,0,0],nk:0,ero:0,soft:.5,rk:[.2,.6],gain:3.4});
  MR.shade=n9?n9.shade:m({pm:[3,.9,0,0],nk:0,ero:.05,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g',a:.55});
  return MR; }
if(F.on) for(const k in AT) F.img(AT[k].tex);
const hx=c=>'#'+c.map(v=>('0'+Math.round(sat(v)*255).toString(16)).slice(-2)).join('');
// BALL: a round burning body at (x,y,z), radius r: dark-red corona, a churning face of fire, a white heart. e = its colour, h = its hottest colour.
K.fireball=(x,y,z,r,o={})=>{ if(!F.on) return; const m=mr(), e=rgb(o.emis||'#ff7a1e'), h=rgb(o.hot||'#fff0c0'), a=o.a??1, t=(typeof RT!=='undefined'?RT:0)+(o.seed||0),
    d=hx(e.map(v=>v*.22)), b=hx(e), mm=hx(e.map((v,i)=>v*.45+h[i]*.55)), hh=hx(h), fl=.94+.06*Math.sin(t*37)+.04*Math.sin(t*61+1.3), ord=o.ord??0;
  F.bill(m.cor,x,y,z,r*2.5*fl,r*2.5*fl,t*.6,{cA:d,cB:b,cM:mm,cC:hh,a:.55*a,ord:ord-.02});
  F.bill(m.face,x,y,z,r*1.22,r*1.22,t*(o.spin??1.1),{cA:d,cB:b,cM:mm,cC:'#ffffff',a,ord,uvT:[1,1,t*.07%1,0]});
  F.bill(m.core,x,y,z,r*.8*fl,r*.8*fl,0,{cA:b,cB:mm,cM:hh,cC:'#ffffff',a:.6*a,ord:ord+.02}); };
// kit update 12 (2026-11-25): every photographed piece comes and goes the same soft way, so a field of them reads as one thing breathing in and out
// rather than pictures put up one by one: it condenses out of light (a little small and bright, then its own colour), its foot melts into the floor in
// a breath of dust or mist, and when it leaves it flares to light and thins, motes lifting off it. LIFE remembers when each piece was first seen.
const LIFE=new Map(); let lifeSweep=0;
const GLOW={rocks:[1,.86,.66],crags:[1,.86,.66],ice:[.82,.96,1],ice2:[.82,.96,1],chunks:[.82,.96,1]}, PUFF={rocks:['#3a322a','#8a7a66'],crags:['#3a322a','#8a7a66'],ice:['#9fc4dc','#f0fbff'],ice2:['#9fc4dc','#f0fbff'],chunks:['#9fc4dc','#f0fbff']};
// (a standing piece is found again by where it stands, within a stride, so one that trembles or sways keeps its life)
function life(key,now,x,y,st){ let A=LIFE.get(key); if(!A){ A=[]; LIFE.set(key,A); } let L=null;
  for(const q of A){ if(now-q.last>.3) continue; if(!st||(Math.abs(q.x-x)<150&&Math.abs(q.y-y)<100)){ L=q; break; } }
  if(!L){ L=A.find(q=>now-q.last>.3); if(L){ L.t0=now; L.out=0; } else { L={t0:now,out:0}; A.push(L); } L.fresh=1; } else L.fresh=0;
  L.last=now; L.x=x; L.y=y;
  if(now-lifeSweep>6){ lifeSweep=now; for(const [k,v] of LIFE) if(v.every(q=>now-q.last>2)) LIFE.delete(k); } return L; }
const SOL0=F.solid;
F.solid=(kind,vi,x,y,z,o={})=>{ const km=KM[kind]; if(!km||!F.on||!K.real) return SOL0(kind,vi,x,y,z,o);
  const M=o.M, sx=M?Math.hypot(M[0],M[1],M[2]):(o.sx??o.s??100), sz=M?Math.hypot(M[8],M[9],M[10]):(o.sz??o.s??100), ux=M?M[8]/sz:0, uy=M?M[9]/sz:0, uz=M?M[10]/sz:1;
  let px=x+(M?M[12]:0), py=y+(M?M[13]*FSY:0), pz=(z||0)+(M?M[14]:0); const gone=sat(o.ero||0), al=(o.a??1);
  if(km[0]==='ball'){ K.fireball(px+ux*sz*.35,py+uy*sz*.35*FSY,pz+uz*sz*.35,sx*.5,{emis:o.emis,hot:o.rimC,a:al*(1-gone),ord:o.ord,seed:(vi|0)*1.7}); return {}; }
  const sd=o.seed!=null?Math.floor(Math.abs(o.seed)*7.3):0, pick=km[1], m=mr(); let sk=km[0], ci=pick[((vi|0)+sd)%pick.length], hk=km[2];
  // a rock kind asked for with the ice shading (mode 2) is broken ice
  if(o.mode===2&&sk==='rocks'){ sk='chunks'; ci=((vi|0)+sd)%8; hk=.9; }
  if(kind==='ice'||kind==='pice'){ const L=sz<430?ICS:ICB, e=L[((vi|0)+sd)%L.length]; sk=e[0]; ci=e[1]; hk=e[2]; }
  const set=AT[sk]; if(!F.ready(set.tex)) return SOL0(kind[0]!=='p'?kind:(kind.startsWith('pice')?'ice':'stone'),vi,x,y,z,o);
  const c=set.cells[ci], stand=km[3]&&o.clip!==0;
  // tint: the caller's stone colour only as a hue over the photograph; the scene's ambient darkens it with the floor
  const rockish=sk==='rocks'||sk==='crags', a0=rgb(o.alb||'#8a8a8a'), mx=Math.max(a0[0],a0[1],a0[2],.02), am=GFX.amb||[1,1,1], tk=o.tintK??(rockish?.42:.45), br=(o.bright??1)*(rockish?.7:1.02),
    em=o.glow?rgb(o.emis||'#ffffff'):null, gk=em?Math.min(.3,o.glow*.14):0,
    tint=[0,1,2].map(i=>((1-tk)+tk*a0[i]/mx)*br*(.45+.55*Math.min(1.3,am[i]))*(1-gk)+(em?em[i]*gk*1.6:0));
  // (texture v runs from the bottom of the image)
  let H=sz*hk, W=H*c[4], u0=c[0], v0=1-c[1]-c[3], du=c[2], dv=c[3], rot, cz;
  if(stand||(km[3]===0&&o.clip!==0&&M==null)){ rot=Math.max(-.6,Math.min(.6,Math.atan2(ux,uz)));
    // standing on the floor: what is under it is cut off (it rises out of the ground)
    let zb=pz-sz*(km[3]?.04:.14); if(zb<0){ const f=sat(1+zb/H); if(f<=.02) return {}; v0+=dv*(1-f); dv*=f; cz=H*f*.5; H*=f; } else cz=zb+H*.5; H*=.5; W*=.5; }
  else { rot=Math.atan2(ux,uz)+(M?Math.atan2(M[1],M[0])+Math.atan2(M[9],M[10])*.6:0); px+=ux*sz*.35; py+=uy*sz*.35*FSY; cz=pz+uz*sz*.35; H*=.5; W*=.5;
    if(o.clip!==0&&cz-H<0){ const f=sat((cz+H)/(2*H)); if(f<=.02) return {}; v0+=dv*(1-f); dv*=f; const top=cz+H; H*=f; cz=top-H; } }
  const flip=(((vi|0)+sd)>>1)%2===1;
  // one soft life for every piece (o.pop:1 = the old hard appearance)
  let foot=0;
  if(!o.pop){ const now=typeof RT!=='undefined'?RT:0, st=stand||(km[3]===0&&o.clip!==0&&M==null), Lf=life(kind+':'+(vi|0)+':'+(o.seed??''),now,x,y,st),
      u=sat((now-Lf.t0)/(o.bloom??.42)), ui=u*u*(3-2*u), gi=Math.pow(1-u,1.6), go=gone>0?Math.sin(Math.PI*Math.min(1,gone*1.5))*.9+(gone>.66?0:0):0, g=Math.max(gi,go), G=em||GLOW[sk];
    for(let i=0;i<3;i++) tint[i]=tint[i]*(1+.6*g)+G[i]*g*1.1;
    const sc=.88+.12*ui+.05*sat(gone*2); W*=sc; if(st){ H*=sc; cz*=sc; foot=.16; } else H*=sc;
    o={...o,a:(o.a??1)*ui};
    // its breath: dust or mist rolling off its foot as it comes, motes lifting off it as it goes (particles, no draws)
    if(!F.low){ const pc=o.puffC||(em?[hx(em.map(v=>v*.16+.05)),hx(em.map(v=>v*.4+.2))]:PUFF[sk]), s2=Math.max(W,H);
      if(Lf.fresh&&st&&s2>60) for(let i=0;i<3;i++){ const a=Math.random()*6.283, v=s2*(.5+Math.random()*.8); GFX.pt({x:px+Math.cos(a)*W*.5,y:py+2,z:s2*.08,vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY*.6,vz:s2*.25,g:0,drag:1.4,life:.9+Math.random()*.5,s:s2*.28,grow:s2*.7,m:5,b:'alpha',c:rgb(pc[0]),c2:'#000000',c3:pc[1],er:.9,ns:1.2,w:1,a:.4,L:2}); }
      if(gone>.08&&!Lf.out){ Lf.out=1; for(let i=0;i<4;i++) GFX.pt({x:px+(Math.random()-.5)*W*1.4,y:py,z:cz+(Math.random()-.5)*H*1.4,vx:(Math.random()-.5)*60,vy:0,vz:60+Math.random()*220,g:-60,drag:.6,life:.6+Math.random()*.7,s:4+Math.random()*6,m:8,c:G,fade:'in',L:3}); } } }
  if(o.shadow&&!F.low) F.quad(m.shade,px+W*.35,py+W*.1,W*1.25,W*.6,0,{a:Math.min(.7,(o.shadow[2]||.3)*1.6)*(1-gone)*al});
  // leaving: it fades as it is eaten (the noise alone leaves a speckle on a photograph)
  F.bill(m[sk],px,py,cz,W,H,rot,{uvT:flip?[-du,dv,u0+du,v0]:[du,dv,u0,v0],cB:tint,fd:[0,0,foot,0],a:(o.a??1)*(1-gone*gone),ero:gone>0?gone*.45-.05:-1,soft:.12,ord:o.ord??0});
  return {}; };
})();

// ================================================================ kit update 13: fire that burns as one body (2026-11-25)
// Fires set down one by one (a column here, a column there) each rise and die alone: they read as separate stamps. FIREFIELD takes the same
// places and makes them one fire: it catches from an origin and runs outward as a front, low flames stand along the lines between
// neighbouring fires so their feet join, the tongues swell until they lean into one another and one pulse runs through all of them,
// one wind carries all their sparks and smoke the same way; then the joining flames go out first, the body breaks into patches, and the patches
// burn down from the far edge inward.
//  K3.firefield(x,y,o) -> {pts,dead,end()}
//  o: {pts:[[x,y,s],..] (floor points and tongue heights; or n + r + s:[lo,hi] to scatter them round (x,y)), from:[x,y] (where it catches, default x,y),
//      speed (3200: how fast the front runs), dur (2.4), out (1: over how long it breaks up and dies), pal ('flame'), link (1.9: neighbours nearer than
//      this many mean gaps are joined), linkH (.34: the joining flames' height as a share of the tongues), wind (-110: drift of sparks and smoke, x/s),
//      keep ([x,y,r]: nothing is set down in front of this point), smoke (1), sparks (1), light (1), girth (1), delay}
(()=>{
const K=window.K3, F=window.FX3, V=window.VOL; if(!K||!F||!window.GFX) return;
const FSY=.58, sat=K.sat, mix=K.mix, eo3=K.eo3, R=(a,b)=>a+Math.random()*(b-a), rgb=c=>typeof c==='string'?GFX.rgb(c):c;
K.firefield=(x,y,o={})=>{ const H={pts:[],dead:false,end(){ H.cut=1; }}; if(!F.on||!(K.vok&&K.vok())) return H;
  const P=K.pal(o.pal||'flame'), dur=o.dur||2.4, out=o.out??1, sp=o.speed||3200, [fx,fy]=o.from||[x,y], wind=o.wind??-110, gk=o.girth||1, d0=o.delay||0;
  let L=(o.pts||[]).map(p=>({x:p[0],y:p[1],s:p[2]||400}));
  if(!L.length){ const n=o.n||7, r=o.r||600, [s0,s1]=o.s||[260,620]; for(let i=0;i<n;i++){ const a=(i+R(.1,.9))/n*6.2832, d=r*Math.sqrt(R(.12,1)); L.push({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,s:mix(s0,s1,Math.pow(Math.random(),1.6))}); } }
  if(o.keep){ const [kx,ky,kr]=o.keep; L=L.filter(p=>!(p.y>ky-20&&Math.abs(p.x-kx)<kr&&p.y-ky<kr)); }
  if(F.low&&L.length>4) L=L.filter((p,i)=>i%2===0);
  if(!L.length) return H;
  const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/FSY); let dmax=1;
  // fires spread evenly over a field can never touch: they are drawn together into a few bodies (one per five or so), each round the one that
  // stands furthest from the bodies already chosen, so there are masses of fire with dark floor between them rather than a scatter of candles
  const CL=[]; { const gk2=o.gather??.5, nk=Math.max(1,Math.round(L.length/(o.per||5))); let c=L.reduce((a,b)=>b.s>a.s?b:a,L[0]); CL.push({x:c.x,y:c.y,L:[]});
    while(CL.length<nk){ let best=null, bd=-1; for(const p of L){ const d=Math.min(...CL.map(q=>dist(p,q))); if(d>bd){ bd=d; best=p; } } CL.push({x:best.x,y:best.y,L:[]}); }
    for(const p of L){ let q=CL[0], bd=1e9; for(const c2 of CL){ const d=dist(p,c2); if(d<bd){ bd=d; q=c2; } } const pull=Math.max(gk2,1-(p.s*.9+260)/Math.max(1,bd)); p.x=mix(p.x,q.x,Math.min(.85,pull)); p.y=mix(p.y,q.y,Math.min(.85,pull)); p.c=q; q.L.push(p); }
    for(const q of CL){ q.r=Math.max(120,...q.L.map(p=>dist(p,q))); q.s=q.L.reduce((a,p)=>a+p.s,0)/Math.max(1,q.L.length); } }
  for(const p of L){ p.d=Math.hypot(p.x-fx,(p.y-fy)/FSY); dmax=Math.max(dmax,p.d); }
  // when each catches (the front), and when each dies (the far edge first, the heart of it last)
  for(const p of L){ p.t0=p.d/sp+R(0,.04); p.t1=dur-out*(.15+.75*p.d/dmax)+R(-.06,.06); p.ph=R(0,6.28); p.tw=R(1.2,2.8); p.tp=R(.22,.5); }
  // joins: each to its nearest neighbour or two, once, if they are near enough
  const mean=L.length>1?L.reduce((s,p)=>s+Math.min(...L.filter(q=>q!==p).map(q=>dist(p,q))),0)/L.length:0, lim=mean*(o.link??1.9), J=[], seen=new Set();
  if(L.length>1) L.forEach((p,i)=>{ const nb=L.map((q,j)=>[dist(p,q),j]).filter(e=>e[1]!==i).sort((a,b)=>a[0]-b[0]).slice(0,2);
    nb.forEach(([d,j],k)=>{ const key=Math.min(i,j)+':'+Math.max(i,j), reach=((p.s+L[j].s)*.14+92)*gk*(o.reach??3.4); if(d>lim||d>reach||(k&&d>lim*.8)||seen.has(key)) return; seen.add(key); J.push([p,L[j],d]); }); });
  H.pts=L;
  after(d0,()=>{ if(H.dead) return;
    for(const p of L){ const life=Math.max(.5,p.t1-p.t0);
      p.h=K.vcolumn(p.x,p.y,{r:(p.s*.14+46)*gk,h:p.s*.8,dur:life,rise:.22,out:life*.42,pal:P,heat:1.25,twist:p.tw,turb:1.15,taper:p.tp,gain:.85,band:1,btop:.62,lit:.6,flow:1.4,delay:p.t0}); p.r0=p.h.r; p.h0=p.h.h; }
    // the joining flames: they come when both ends burn and go first, so the body is seen to break up
    for(const [a,b,d] of J){ const tb=Math.max(a.t0,b.t0)+.12, te=Math.min(a.t1,b.t1)-out*.45, life=te-tb; if(life<.35) continue;
      K.vsheet(a.x,a.y,b.x,b.y,{h:Math.min(a.s,b.s)*(o.linkH??.46)*R(.8,1.25),thick:(Math.min(a.s,b.s)*.14+46)*gk*.75,dur:life,rise:.3,out:Math.min(.6,life*.5),pal:P,heat:1.1,turb:1,band:1,btop:.6,lit:.5,flow:1.2,gain:.8,delay:tb}); }
    for(const q of CL){ if(q.L.length<2) continue; const t0=Math.min(...q.L.map(p=>p.t0))+.08, t1=Math.max(...q.L.map(p=>p.t1))-out*.3, life=t1-t0; if(life<.4) continue; const sd=R(0,90), rr=Math.min(q.r+q.s*.2,q.s*.8+110);
      GFX.add(life,(k,t)=>{ if(H.dead) return; const g=eo3(sat(t/.4)), f=sat((t-(life-.55))/.55);
        V.add('blast',q.x,q.y,q.s*.13,{ex:rr*1.25*(.6+.4*g),ey:rr*1.05*(.6+.4*g),ez:q.s*.3,pa:[.56,.62,2.6,.2+t*.9],pb:[1.25*(1-.5*f),1.25,1.1,.5+.3*f],dens:5.5*g*(1-f)*(1-f),gain:1.25,seed:sd,smoke:.12,fire:.6,
          cA:P.d,cB:P.b,cM:P.m,cC:P.h,cS:P.d,cK:'#5a3a2a',amb:.1,key:1.1,rim:.4,glow:.5,steps:16,band:1,btop:.62,lit:.5,flow:1.1,ord:-1}); },t0); }
    let E=0, tp=0, S=0; const cx=L.reduce((s,p)=>s+p.x,0)/L.length, cy=L.reduce((s,p)=>s+p.y,0)/L.length, Lg=o.light===0?null:GFX.light(cx,cy,dmax*1.5+500,P.l,.1,dur,{z:160,flick:.14});
    GFX.add(dur,(k,t)=>{ if(H.dead) return; const dt=Math.max(0,t-tp); tp=t; let live=0;
      for(const p of L){ if(!p.h||t<p.t0) continue; const u=t-p.t0, al=t<p.t1?1:0; live+=al;
        // the tongues fatten until they lean into their neighbours, and one pulse runs out through all of them from where it caught
        const fat=1+.7*sat(u/.7), pulse=1+.13*Math.sin(t*5.2-p.d*.0042)+.05*Math.sin(t*11+p.ph); p.h.r=p.r0*fat; p.h.h=p.h0*pulse; if(H.cut) p.h.a=Math.max(0,p.h.a-dt*3); }
      if(Lg) Lg.a=.75*sat(t/.35)*sat((dur-t)/out)*(live?1:.4);
      // one wind for everything it throws off
      if(o.sparks!==0&&live){ E+=dt*(7+5*live)*(GFX.QK||1); while(E>=1){ E-=1; const p=L[(Math.random()*L.length)|0]; if(t<p.t0||t>p.t1) continue;
          GFX.pt({x:p.x+R(-.25,.25)*p.s,y:p.y,z:p.s*R(.2,.8),vx:wind*R(.8,1.6)+R(-40,40),vy:R(-20,20),vz:R(160,520),g:-60,drag:.5,life:R(.6,1.3),s:R(2.5,5.5),m:3,len:.035,c:rgb(Math.random()<.3?P.h:P.s),c2:P.b,L:3}); } }
      // and one roof of smoke over the whole of it, not a puff per fire: it gathers as the body breaks up and drifts off down the wind
      if(o.smoke!==0&&!S&&t>dur-out*1.1){ S=1; const n=Math.min(3,1+(L.length>>2)); for(let i=0;i<n;i++){ const p=L[(i*5+1)%L.length]; K.vsmoke(mix(cx,p.x,.6),mix(cy,p.y,.6),{s:(dmax*.38+260)*R(.8,1.2),z:220+90*i,dur:out+1.3+.4*i,rise:R(380,620),a:.3,c:'#1c120e',c2:'#5a3a2a',lit:.4,vx:wind,delay:.18*i}); } } }); });
  return H; };
})();
