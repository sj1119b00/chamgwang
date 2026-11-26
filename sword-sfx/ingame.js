/* In-game sound: loaded by index.html. When the local library (sword-sfx/lib, kept out of git because the Sonniss licence
 * forbids redistributing the files) is present, every class plays the library mix instead of the synthesized sounds:
 *   swordsman  -> the hand-timed cue sheets, candidate D (steel 45 / weight 35 / energy 20), synced to the game clock
 *   the others -> ClassFX, which re-voices the game's own sound calls per class
 * Without the library (e.g. the public build) it does nothing and the original sounds stay. Game logic is not touched. */
'use strict';
(()=>{
const BASE='sword-sfx/', SWC='D';
// the version on this script's own URL (index.html: ingame.js?v=...) goes on everything it loads, so a phone never mixes a cached
// old engine with new files (GitHub Pages caches each file for 10 minutes)
const VER=(document.currentScript&&new URL(document.currentScript.src).search)||'';
const load=src=>new Promise((ok,no)=>{ const s=document.createElement('script'); s.src=BASE+src+VER; s.onload=ok; s.onerror=no; document.head.append(s); });
const until=f=>new Promise(r=>{ const h=setInterval(()=>{ if(f()){ clearInterval(h); r(); } },100); });
(async()=>{
  // not inside the comparison lab's frame (it mixes candidates itself) and not in automated capture runs
  if(navigator.webdriver||/[?&]sfx=0/.test(location.search)) return; try{ if(window!==parent&&parent.location.pathname.includes('/sword-sfx/')) return; }catch(_){}
  // local: the library itself; public build: per-class sound packs (no loose files), else nothing and the original sounds stay
  let lib=false, pack=null;
  try{ lib=(await fetch(BASE+'lib/clips/A_click.wav',{method:'HEAD'})).ok; }catch(_){}
  // a busy server can refuse one request: try the pack index a few times before giving up on sound
  for(let i=0;!lib&&!pack&&i<4;i++){ try{ const r=await fetch(BASE+'pack/index.json',{cache:'no-store'}); if(r.ok) pack=await r.json(); else if(r.status===404) break; }catch(_){} if(!pack) await new Promise(r=>setTimeout(r,800*(i+1))); }
  if(!lib&&!pack) return;
  await load('swsfx.js'); await load('classfx.js');
  const E=SwordSFX; await E.init(BASE); if(pack) E.usePack(pack,VER);
  await until(()=>window.RPG?.sv?.CLS?.fist&&RPG.sv.CLS.sword&&window.K3&&RPG.sv.cine&&typeof SFX!=='undefined');
  window.SwordPreview=window.SwordPreview||{};
  // our side joins the game's audio context, so start it only once the game has made one
  const unlock=()=>{ if(E.ctx||(typeof AC!=='undefined'&&AC)) E.resume(); }; addEventListener('pointerdown',unlock,{passive:true}); addEventListener('keydown',unlock);
  if(navigator.userActivation?.hasBeenActive) unlock();
  const inSurv=()=>RPG.mode==='surv';
  let fistLoading=false, fistReady=false, retryFistAt=0;
  async function warmFist(){
    if(fistReady||fistLoading||!E.ctx||performance.now()<retryFistAt) return;
    fistLoading=true;
    try{
      const ids=ClassFX.fistClips();
      if(ids.some(id=>!E.clips[id])){ retryFistAt=Infinity; return; }
      const buffers=await Promise.all(ids.map(id=>E.load(id)));
      fistReady=buffers.every(Boolean);
      buffers.forEach((buffer,i)=>{ if(!buffer) E.buf.delete(ids[i]); });
    }finally{ fistLoading=false; retryFistAt=Math.max(retryFistAt,performance.now()+10000); }
  }
  // sound ends with the picture: effect activity (draw calls + particles + running effects) drives the tail gate
  let bedCls=null;
  let packCls=null;
  (function watch(){ requestAnimationFrame(watch);
    if(E.pack&&pl.cls!==packCls){ packCls=E.packCls=pl.cls; E.packData(pl.cls).catch(()=>{}); }
    // join the game's audio as soon as it exists (the fist waits for its clips, which needs our side running)
    if(!E.ctx&&typeof AC!=='undefined'&&AC) E.graph();
    if(pl.cls==='fist'||RPG.sv.A.SV.cls==='fist') warmFist();
    if(!inSurv()||!E.ctx){
      if(bedCls==='fist'){ E.stopAll(); E.setBed(null); bedCls=null; }
      return;
    }
    if(pl.cls!==bedCls){ if(bedCls==='fist') E.stopAll(); bedCls=pl.cls; E.setBed(ClassFX.BED[pl.cls]||null,-20); }
    E.gate(FX3.stats.draws+.2*GFX.pts.length+GFX.fx.length);
  })();
  ClassFX.install(E,{active:()=>inSurv()&&pl.cls!=='sword'&&(pl.cls!=='fist'||fistReady)});

  // ---- swordsman: cue sheets on the game clock, contacts from K3.knock
  const C=RPG.sv.CLS.sword, D=E.designs.skills; let cur=null, rt0=0, basicAt=-9, basicN=0;
  const sheet=id=>D[id]&&D[id].candidates[SWC];
  // blend D keeps one cue per source (A_sw12, B_sw12, C_sw12 ...): a role is every cue whose id ends with it
  const role=(S,id)=>S.cues.filter(c=>c.id===id||c.id.endsWith('_'+id));
  const start=id=>{ if(!sheet(id)) return; cur=id; rt0=RT; E.preload(id,SWC); E.follow(id,SWC,()=>RT-rt0); };
  const bfn=C.basic.fn; C.basic.fn=function(){ const n=RPG.sv.V.chain%3, r=bfn.apply(this,arguments);
    if(inSurv()){ const S=sheet('basic'); if(S){ for(const q of role(S,n===2?'sw3':'sw12')) E.cue({...q,times:undefined,at:0},E.now(),1,S.trim); basicAt=RT; basicN=n; } }
    return r; };
  for(const [id,s] of Object.entries(C.skills)){ const f=s.fn; s.fn=function(){ const r=f.apply(this,arguments); if(inSurv()&&r!==false) start(id); return r; }; }
  for(const id of Object.keys(C.ults)){ const f=C.ults[id]; C.ults[id]=function(){ const r=f.apply(this,arguments); if(inSurv()) start(id); return r; }; }
  const oh=C.onHurt; C.onHurt=function(){ const r=oh.apply(this,arguments); if(inSurv()) start(r?'sw_counter':'hurt'); return r; };
  let pend=0; const flush=()=>{ const n=pend; pend=0; if(!inSurv()||pl.cls!=='sword') return;
    if(RT-basicAt<.35){ const S=sheet('basic'); if(S) for(const q of role(S,basicN===2?'hit3':'hit')) E.cue(q,E.now(),Math.min(1.6,1+.18*Math.log2(n)),S.trim); }
    else if(cur) E.hit(cur,SWC,'hit',n); };
  const kn=K3.knock; K3.knock=function(){ if(pl.cls==='sword'&&inSurv()){ if(!pend) queueMicrotask(flush); pend++; } return kn.apply(this,arguments); };
  // the sheets replace the swordsman's synthesized calls; an enemy breaking apart keeps a small shared sound
  const NOPH={stop(){}};
  const mute=(obj,names)=>{ for(const n of names){ const f=obj[n]; if(typeof f!=='function') continue; obj[n]=function(...a){
    if(!(inSurv()&&pl.cls==='sword')) return f.apply(this,a);
    if(n==='shatter') for(const [q,t] of ClassFX.map('sword','shatter',a,E.now())) E.cue(q,t,1,0);
    // layer mode: the swordsman's own sounds play under the cue sheets
    if(ClassFX.LAYER) return f.apply(this,a);
    return n==='beam'||n==='drone'?NOPH:undefined; }; } };
  mute(SFX,Object.keys(SFX)); mute(RPG.sv.cine.SND,Object.keys(RPG.sv.cine.SND));
})();
})();
