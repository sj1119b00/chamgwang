// 프로메테우스 — skill colours (2026-11-25). Every skill has a few colours to unlock with credits; each ultimate has two.
// The colour is applied where an effect finally gets its colour (particles, glows, GPU quads, lights, volumes, effect GIFs), while
// that skill's code is running — and in whatever it schedules (timers, projectiles, zones, per-frame effect functions) — so no skill
// file is touched. Colours are recoloured, not rotated: the hue becomes the chosen one, saturation and lightness are kept, so the
// swatch shows exactly what the skill turns into. Loaded by hub.js after surv.js.
'use strict';
(function boot(){ if(!(window.RPG&&RPG.sv&&RPG.sv.V&&RPG.hub&&window.GFX&&RPG.hub.H)) return setTimeout(boot,150);
const G=RPG, A=G.api, S=G.sv, V=S.V;

// ============================================================ palettes
// h: target hue (deg), s: saturation multiplier. Names are plain colour words, like the skill names (no old-style hanja names).
const P={
  fire:   [['블루 플레임',205],['에메랄드 플레임',145],['바이올렛 플레임',280],['화이트 골드',45,.4]],
  thunder:[['골드 볼트',48],['크림슨 볼트',354],['네온 그린',125],['아이스 화이트',195,.35]],
  frost:  [['자수정',275],['로즈 프로스트',330],['민트',160],['골드',46]],
  arcane: [['시안',188],['크림슨',350],['골드',44],['에메랄드',150]],
  star:   [['블루 스타',212],['레드 자이언트',6],['바이올렛',282],['화이트',210,.25]],
  ki:     [['골드',46],['크림슨',356],['에메랄드',140],['바이올렛',275]],
  earth:  [['앰버',36],['자수정',272],['아이스',196],['크림슨',354]],
  spirit: [['스카이',200],['로즈',338],['골드',46],['바이올렛',276]],
  heal:   [['민트',168],['골드',46],['핑크',326],['스카이',200]],
  blade:  [['아이스 블루',196],['골드',45],['바이올렛',278],['에메랄드',150]],
  shadow: [['실버',0,0],['블러드',352],['에메랄드',150],['골드',44]],
  rage:   [['아이스 블루',200],['톡식 그린',105],['바이올렛',278],['골드',46]],
};
function theme(id){ const c=id.split('_')[0], k=id.slice(c.length+1);
  if(c==='py') return 'fire'; if(c==='sw') return 'blade'; if(c==='as') return 'shadow'; if(c==='fs') return 'ki'; if(c==='ax') return 'rage';
  if(c==='mg') return /bolt|chain|field|ult1/.test(k)?'thunder':/nova|ult3/.test(k)?'frost':/star|ult2/.test(k)?'star':'arcane';
  if(c==='sh') return /rock|spike|ult1|ult3/.test(k)?'earth':/heal/.test(k)?'heal':'spirit';
  return 'arcane'; }
const isUlt=id=>S.SK[id]&&S.SK[id].type==='ult';
// the colours one skill offers: four for a skill, two for an ultimate (the first and the third of its theme)
function options(id){ const L=P[theme(id)]; return isUlt(id)?[L[0],L[1]]:L; }
function price(id,k){ return isUlt(id)?[900,1400][k]:[300,450,650,900][k]; }

// ============================================================ save (in the hub save)
const H=()=>G.hub.H, CZ=()=>H().chroma||(H().chroma={own:{},sel:{}});
const owned=(id,k)=>!!CZ().own[id+':'+k], sel=id=>{ const k=CZ().sel[id]; return k!=null&&owned(id,k)?k:-1; };
function buy(id,k){ const h=H(), c=price(id,k); if(owned(id,k)) return true; if(h.gold<c) return false; h.gold-=c; CZ().own[id+':'+k]=1; CZ().sel[id]=k; G.hub.save(); return true; }
function pick(id,k){ if(k<0){ delete CZ().sel[id]; G.hub.save(); return true; } if(!owned(id,k)) return false; CZ().sel[id]=k; G.hub.save(); return true; }

// ============================================================ recolouring
let CTX=null, ULTC=null;   // ULTC: the running ultimate's colour, for figures the mannequin draws on its own later   // {h,s} of the skill whose code is running, or null
function hsl(r,g,b){ const M=Math.max(r,g,b), m=Math.min(r,g,b), l=(M+m)/2; if(M===m) return [0,0,l]; const d=M-m, s=l>.5?d/(2-M-m):d/(M+m);
  const h=M===r?(g-b)/d+(g<b?6:0):M===g?(b-r)/d+2:(r-g)/d+4; return [h*60,s,l]; }
function rgbOf(h,s,l){ h=((h%360)+360)%360/360; if(!s) return [l,l,l]; const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q, f=t=>{ t=(t+1)%1; return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p; }; return [f(h+1/3),f(h),f(h-1/3)]; }
// one colour (0..1 channels, possibly over 1) into the chosen hue; greys and whites stay
function cz3(r,g,b,c){ const m=Math.max(r,g,b,1e-6), k=m>1?m:1; const [h,s,l]=hsl(r/k,g/k,b/k); if(s<.12||l>.97) return [r,g,b];
  const [R,Gg,B]=rgbOf(c.h+(l-.5)*28,Math.min(1,s*(c.s??1)),l); return [R*k,Gg*k,B*k]; }
const SC=new Map();
function czS(str,c){ const key=c.h+'|'+(c.s??1)+'|'+str; let v=SC.get(key); if(v!==undefined) return v;
  let m; v=str;
  if(/^#[0-9a-f]{6}$/i.test(str)){ const n=parseInt(str.slice(1),16), o=cz3((n>>16&255)/255,(n>>8&255)/255,(n&255)/255,c); v='#'+o.map(x=>Math.round(Math.min(1,x)*255).toString(16).padStart(2,'0')).join(''); }
  else if(/^#[0-9a-f]{3}$/i.test(str)){ const o=cz3(parseInt(str[1],16)/15,parseInt(str[2],16)/15,parseInt(str[3],16)/15,c); v='#'+o.map(x=>Math.round(Math.min(1,x)*255).toString(16).padStart(2,'0')).join(''); }
  else if((m=str.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/))){ const o=cz3(m[1]/255,m[2]/255,m[3]/255,c); v=o.map(x=>Math.round(Math.min(1,x)*255)).join(','); }
  else if((m=str.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(.*)\)$/))){ const o=cz3(m[1]/255,m[2]/255,m[3]/255,c); v=`rgba(${o.map(x=>Math.round(Math.min(1,x)*255)).join(',')}${m[4].startsWith(',')?m[4]:',1'})`; }
  if(SC.size>4000) SC.clear(); SC.set(key,v); return v; }
let CNT=0; function cz(x,c=CTX){ if(!c||x==null) return x; CNT++; if(typeof x==='string') return czS(x,c); if(Array.isArray(x)&&x.length>=3&&typeof x[0]==='number'){ const o=cz3(x[0],x[1],x[2],c); return x.length>3?[...o,...x.slice(3)]:o; } return x; }
// an effect GIF's own hue, measured once from a loaded frame, so a hue-rotate lands it on the chosen colour
const VH={};
function vfxHue(name){ if(VH[name]!=null) return VH[name]; const v=VFX[name]; if(!v) return 0; const f=v.f[Math.floor(v.n/2)]||v.f[0]; if(!f||!f.ok) return 0;
  try{ const cv=document.createElement('canvas'), n=48; cv.width=cv.height=n; const g=cv.getContext('2d',{willReadFrequently:true}); g.drawImage(f.im,0,0,n,n); const d=g.getImageData(0,0,n,n).data; let x=0,y=0;
    for(let i=0;i<d.length;i+=4){ const [h,s,l]=hsl(d[i]/255,d[i+1]/255,d[i+2]/255), w=s*d[i+3]/255*(1-Math.abs(l-.5)*1.6); if(w<=0) continue; x+=Math.cos(h*Math.PI/180)*w; y+=Math.sin(h*Math.PI/180)*w; }
    VH[name]=Math.atan2(y,x)*180/Math.PI; }catch(e){ VH[name]=0; } return VH[name]; }

// ============================================================ carrying the colour along with the skill's code
const wrap=fn=>{ if(typeof fn!=='function'||!CTX||fn.__cz) return fn; const c=CTX, w=function(){ const o=CTX; CTX=c; try{ return fn.apply(this,arguments); } finally{ CTX=o; } }; w.__cz=1; return w; };
const varOf=id=>{ const k=sel(id); if(k<0) return null; const o=options(id)[k]; return o?{h:o[1],s:o[2]}:null; };
const enter=(id,fn)=>function(){ const o=CTX; CTX=varOf(id); try{ return fn.apply(this,arguments); } finally{ CTX=o; } };
function hookClass(C){ if(!C||C.__cz) return; C.__cz=1; const cls=Object.keys(S.CLS).find(k=>S.CLS[k]===C); const ids=A.ORDER[cls]||[];
  const basic=ids.find(id=>S.SK[id]&&S.SK[id].type==='basic'); if(C.basic&&basic){ const f=C.basic.fn; C.basic.fn=enter(basic,f); }
  for(const id in C.skills||{}){ const s=C.skills[id]; if(s&&s.fn) s.fn=enter(id,s.fn); }
  for(const id in C.ults||{}){ const f=C.ults[id], g=enter(id,f); C.ults[id]=function(){ ULTC=varOf(id); return g.apply(this,arguments); }; } }
// timers and scheduled draws run later: they take the colour of the skill that scheduled them
const after0=after; after=function(s,fn){ return after0(s,wrap(fn)); };
function vfxCopy(name,c){ const key=name+'@'+c.h+'_'+(c.s??1); if(VFX[key]) return key; const v=VFX[name]; if(!v||!v.f.every(f=>f.ok)) return null;
  const f=v.f.map(fr=>{ const im=fr.im, w=im.naturalWidth||im.width, h=im.naturalHeight||im.height, cv=document.createElement('canvas'); cv.width=w; cv.height=h; const g=cv.getContext('2d',{willReadFrequently:true}); g.drawImage(im,0,0);
    const D=g.getImageData(0,0,w,h), d=D.data, memo=new Map(); for(let i=0;i<d.length;i+=4){ if(!d[i+3]) continue; const k=(d[i]>>3)<<10|(d[i+1]>>3)<<5|(d[i+2]>>3); let o=memo.get(k); if(!o){ o=cz3(d[i]/255,d[i+1]/255,d[i+2]/255,c).map(x=>Math.round(Math.min(1,x)*255)); memo.set(k,o); } d[i]=o[0]; d[i+1]=o[1]; d[i+2]=o[2]; }
    g.putImageData(D,0,0); return {...fr,im:cv,ok:true}; });
  VFX[key]={...v,f}; return key; }
const add0=add; add=function(p){ if(CTX&&p){ if(p.c) p.c=cz(p.c); if(p.c2) p.c2=cz(p.c2); if(p.k==='vfx'&&p.name){ const k=vfxCopy(p.name,CTX); if(k) p.name=k; else p.hue=(p.hue||0)+((CTX.h-vfxHue(p.name))+540)%360-180; } } return add0(p); };
const glow0=glow; glow=function(g,x,y,r,c,a){ return glow0(g,x,y,r,CTX?cz(c):c,a); };
{ const ad=GFX.add; GFX.add=(life,fn,delay)=>ad(life,wrap(fn),delay);
  const pt=GFX.pt; GFX.pt=o=>{ if(CTX&&o){ if(o.c) o.c=cz(o.c); if(o.c2) o.c2=cz(o.c2); if(o.c3) o.c3=cz(o.c3); } return pt(o); };
  const li=GFX.light; GFX.light=(x,y,r,c,a,life,o)=>li(x,y,r,CTX?cz(c):c,a,life,o);
  const stC=new WeakMap(), stOf=st=>{ if(!st||!(st.c2||st.c3)) return st; const key=CTX.h+'|'+(CTX.s??1); let m=stC.get(st); if(!m) stC.set(st,m={}); return m[key]||(m[key]={...st,c2:st.c2&&cz(st.c2),c3:st.c3&&cz(st.c3)}); };
  const q=GFX.q; q.push=function(it){ if(CTX&&it){ if(it.c) it.c=cz(it.c); if(it.st) it.st=stOf(it.st); } return Array.prototype.push.call(this,it); }; }
// the lit mesh renderer (fx3) takes its palette as cA/cB/cC/cM on the options object
if(window.FX3) for(const n of ['bill','lathe','ribbon','quad','solid','wall','img']){ const f=FX3[n]; if(typeof f!=='function') continue;
  FX3[n]=function(...a){ if(CTX){ const i=a.length-1, o=a[i]; if(o&&typeof o==='object'&&!Array.isArray(o)&&!o.__cz&&(o.cA||o.cB||o.cC||o.cM)){ const q={...o,__cz:1}; for(const k of ['cA','cB','cC','cM']) if(q[k]) q[k]=cz(q[k]); a[i]=q; } } return f.apply(this,a); }; }
if(window.VOL&&VOL.add){ const va=VOL.add; VOL.add=(kind,x,y,z,o={})=>{ if(CTX&&o){ o={...o}; for(const k of ['c','c2','c3','cA','cB','cC','cM']) if(o[k]) o[k]=cz(o[k]); } return va(kind,x,y,z,o); }; }
// strokes and fills drawn straight on the 2D canvases (the mannequin's shadow figures, slash lines) while a skill draws
{ const pr=CanvasRenderingContext2D.prototype; for(const k of ['fillStyle','strokeStyle','shadowColor']){ const d=Object.getOwnPropertyDescriptor(pr,k);
  Object.defineProperty(pr,k,{configurable:true,enumerable:d.enumerable,get(){ return d.get.call(this); },set(v){ d.set.call(this,CTX&&typeof v==='string'?cz(v):v); }}); } }
{ const ac=CanvasGradient.prototype.addColorStop; CanvasGradient.prototype.addColorStop=function(o,c){ return ac.call(this,o,CTX&&typeof c==='string'?cz(c):c); }; }
// the mannequin's afterimages and shadow figures keep their colour on the object and are drawn later, outside the skill
function hookMK(){ if(!window.MK||MK.__cz) return; MK.__cz=1;
for(const n of ['ghost','shade']){ const f=MK[n]; if(typeof f!=='function') continue; MK[n]=function(o={}){ if(CTX){ o={...o,c:cz(o.c||(n==='ghost'?'#ff3038':'#bcd0ff'))}; } return f.call(this,o); }; }
if(MK.figure){ const fg=MK.figure; MK.figure=function(g,J,x,y,yaw,o){ if(ULTC&&lock&&o&&o.flat&&!/^#0[0-9a-f]{5}$/i.test(o.flat)){ o={...o,flat:cz(o.flat,ULTC)}; const sc=g.shadowColor; if(sc&&sc[0]==='#') g.shadowColor=cz(sc,ULTC); } return fg.call(this,g,J,x,y,yaw,o); }; } }
// what a skill leaves in the world (projectiles, zones, orbiting blades, per-frame draws) keeps its colour too
function hookArr(a){ if(!a||a.__cz) return; a.__cz=1; a.push=function(...xs){ if(CTX) for(const o of xs){ if(!o||typeof o!=='object') continue; for(const k of ['fn','onHit','onEnd','onTick','hit']) if(typeof o[k]==='function') o[k]=wrap(o[k]); if(o.c) o.c=cz(o.c); } return Array.prototype.push.apply(this,xs); }; }
for(const k of ['ultTick','ultDraw']){ let v=V[k]; Object.defineProperty(V,k,{configurable:true,enumerable:true,get:()=>v,set:f=>{ v=wrap(f); }}); }
const upd0=update; update=function(rdt){ if(!lock) ULTC=null; hookMK(); if(G.mode==='surv'){ for(const c in S.CLS) hookClass(S.CLS[c]); for(const k of ['draws','pj','zones','orbs']) hookArr(V[k]); } return upd0(rdt); };

G.chroma={get n(){ return CNT; },options,price,owned,sel,buy,pick,theme,swatch:(id,k)=>{ const o=options(id)[k]; if(!o) return '#888888'; return czS('#ff3a3a',{h:o[1],s:o[2]}); }};
})();
