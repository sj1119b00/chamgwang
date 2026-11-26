// 참광 survival - kit update 14 (2026-11-26): baked Blender sequences. Loaded by surv.js after vkit3.js (bake3_meta.js before it).
// A big piece that has to move like a real thing (ice freezing out of the air, the floor torn up into rock, a sword falling, a meteor, the
// pieces something breaks into) is built, simulated (rigid bodies, fracture) and rendered in Blender through a camera that matches the game's
// projection exactly (_gen/blend/lib.py), then packed into atlas pages (_gen/blend/pack.py). Here it is played back in the world: one picture
// per frame, standing at its ground point, so what moves is the real motion of the simulation, not a picture being moved.
// The pages hold premultiplied colour (glow is kept under zero alpha), loaded raw, drawn with the painted-texture kind of FX3.
'use strict';
(()=>{
const K=window.K3, F=window.FX3, M=window.BAKE_META||{}; if(!K||!F) return;
const sat=x=>x<0?0:x>1?1:x, rgb=c=>typeof c==='string'?GFX.rgb(c):c, TEX=(n,p)=>'bk_'+n+'_'+p;
const MAT={};
function page(n,p){ const k=TEX(n,p); return MAT[k]||(MAT[k]=F.mat({kind:2,tex:k,texO:{raw:true},nz:'fbm',ero:-1,soft:.06,cB:'#ffffff',cC:'#ffffff',gain:1,op:1})); }
function pre(n){ const m=M[n]; if(!m||!F.on) return false; let ok=true; for(let p=0;p<m.pages;p++){ F.img(TEX(n,p),{raw:true}); ok=ok&&F.ready(TEX(n,p)); } return ok; }
K.bakeMeta=M;
// K3.bakePre(name | [names] | 'prefix*'): start loading the pages now (call well before the piece is needed)
K.bakePre=a=>{ const L=Array.isArray(a)?a:[a]; let ok=true; for(const s of L){ if(s.endsWith('*')){ const pf=s.slice(0,-1); for(const n in M) if(n.startsWith(pf)) ok=pre(n)&&ok; } else ok=pre(s)&&ok; } return ok; };
// one frame (fractional: the next frame is laid over it by the fraction, so 30 fps reads smoothly at 60)
function drawFrame(n,m,f,x,y,z,o){ const N=m.n; f=Math.max(0,Math.min(N-1,f)); const i0=Math.floor(f), w=o.blend===0?0:f-i0, s=o.s||1, fl=o.flip?-1:1;
  const am=GFX.amb||[1,1,1], ak=o.amb??.5, t0=o.tint?rgb(o.tint):[1,1,1], br=o.bright??1,
    tint=[0,1,2].map(i=>t0[i]*br*((1-ak)+ak*Math.min(1.25,am[i]*1.1)));
  const hw=m.cw*m.upx*.5*s, hh=m.ch*m.upy*.5*s, dx=(m.cw*.5-m.ox)*m.upx*s*fl, dz=(m.oy-m.ch*.5)*m.upy*s;
  const one=(i,a)=>{ if(a<=.003) return; const p=Math.floor(i/m.per), j=i-p*m.per, r=Math.floor(j/m.cols), c=j-r*m.cols, nIn=Math.min(m.per,N-p*m.per), prow=Math.ceil(nIn/m.cols),
      PW=m.cols*m.cw, PH=prow*m.ch, du=m.cw/PW, dv=m.ch/PH, u0=c*du, v0=1-(r+1)*dv; if(!F.ready(TEX(n,p))) return;
    F.bill(page(n,p),x+dx,y,z+dz,hw,hh,o.rot||0,{uvT:fl<0?[-du,dv,u0+du,v0]:[du,dv,u0,v0],cB:tint,a,ord:o.ord??0}); };
  const a=o.a??1; one(i0,a); if(w>.02&&i0+1<N) one(i0+1,a*w); }
// K3.bake(name, x, y, o) -> handle. (x,y) = the game ground point the scene was built around (its origin), o:
//  {z, s (scale), speed, from, to (frames), hold (seconds kept on the last frame), out (fade over the last seconds), in (fade-in seconds),
//   flip (mirror left-right), a, tint, bright, amb (how much the scene's ambient darkens it, 0..1), ord, loop, delay, blend (0 = no cross-fade),
//   at(t) -> frame override, onFrame(frame, h)}
// h: {x,y,z,s,a,f (current frame), dead, stop()}; move h.x/h.y/h.a while it plays
K.bake=(name,x,y,o={})=>{ const m=M[name], h={x,y,z:o.z||0,s:o.s||1,a:o.a??1,f:0,dead:false,stop(){ h.dead=true; }}; if(!m||!F.on){ h.dead=true; return h; }
  pre(name); const fr0=o.from||0, fr1=Math.min(m.n-1,o.to??m.n-1), sp=(o.speed||1)*m.fps, play=(fr1-fr0)/sp, hold=o.hold||0, dur=o.loop?(o.dur||9999):play+hold;
  GFX.add(dur,(k,t)=>{ if(h.dead) return; let f=o.at?o.at(t):fr0+t*sp; if(o.loop) f=fr0+((f-fr0)%(fr1-fr0+1)); f=Math.min(f,fr1); h.f=f;
    const fi=o.in?sat(t/o.in):1, fo=o.out?sat((dur-t)/o.out):1;
    if(o.onFrame) o.onFrame(f,h);
    drawFrame(name,m,f,h.x,h.y,h.z,{...o,s:h.s,a:h.a*fi*fo}); },o.delay||0);
  return h; };
// draw one frame of a sequence directly (for callers that drive the frame themselves every frame)
K.bakeFrame=(name,f,x,y,o={})=>{ const m=M[name]; if(!m||!F.on) return; pre(name); drawFrame(name,m,f,x,y,o.z||0,o); };
// keep the pages of the equipped ultimate's sequences loading in the background. A class can carry 10+ pages (64 MB each decoded),
// so only the sequences of the ultimate in the slot are kept warm (ULT: name prefix -> ultimate id); untagged ones go by class.
const ULT={ice_:'mg_ult3',mt_fall:'mg_ult2',mt_crater:'mg_ult2',mt_gold:'fs_ult2',ax3_:'ax_ult3',ax1_:'ax_ult1',sw_:'sw_ult2',sh_:'sh_ult1',dv_:'sh_ult2'};
const ultOf=n=>{ for(const p in ULT) if(n.startsWith(p)) return ULT[p]; return null; };
let lastKey=null; setInterval(()=>{ const c=typeof pl!=='undefined'&&pl?pl.cls:null, sv=window.RPG&&RPG.api&&RPG.api.SV, u=sv?sv.ult:null, key=c+'|'+u;
  if(!c||key===lastKey||!F.on) return; lastKey=key;
  for(const n in M){ const un=ultOf(n); if(un?un===u:(M[n].cls===c||(M[n].cls||'').split(',').includes(c))) pre(n); } },1500);
})();
