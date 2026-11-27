// 참광 survival - ultimate cinematics. A small director the class files stage their ultimates with:
// darkness with a spotlight, painted cut-ins, anime impact frames, energy gathering, layered shockwaves,
// ground scars that keep glowing after the skill, ash and embers, camera targets, and the sounds that go with each beat.
// Loaded by surv.js before the sk_<class>.js files; everything hangs off RPG.sv.cine.
'use strict';
(()=>{
const G=RPG, X=G.sv, {V,A,BODY,FSY,view,onScreen,ultHit,fring}=X;
const U=()=>W/390;                       // one CSS pixel of a 390-wide phone, in canvas pixels
const LOW=()=>!!(A.SV.opt&&A.SV.opt.calm);   // "reduce flashes and shake" option
const QK=()=>ENG.q.qk;                   // particle budget: one grade for every layer (engine/quality.js)

// ---------------------------------------------------------------- images
const IMG={}, TINT={};
function img(name){ let s=IMG[name]; if(!s){ s=IMG[name]={im:new Image(),ok:false}; s.im.onload=()=>{ s.ok=true; }; s.im.src='assets/'+name+'.webp?v='+ASSET_V; } return s; }
// a white-on-black texture multiplied by a colour (still black where it was black, so it adds cleanly)
function tex(name,c){ const s=img(name); if(!s.ok) return null; if(!c) return s.im; const k=name+c; let cv=TINT[k];
  if(!cv){ cv=TINT[k]=document.createElement('canvas'); cv.width=s.im.naturalWidth; cv.height=s.im.naturalHeight; const g=cv.getContext('2d'); g.drawImage(s.im,0,0); g.globalCompositeOperation='multiply'; g.fillStyle=c; g.fillRect(0,0,cv.width,cv.height); }
  return cv; }
const FXTEX=['fx_crack','fx_crack_k','fx_gash','fx_circle_arcane','fx_circle_seal','fx_sun','fx_ink_a','fx_lightning'];
FXTEX.forEach(img);
const CUTS={sword:['sword_cut1','sword_cut2'],mage:['mage_cut1','mage_cut2'],fist:['fist_cut1','fist_cut2'],shaman:['shaman_cut1','shaman_cut2'],pyro:['pyro_cut1','pyro_cut2']};

// ---------------------------------------------------------------- sound (built from the engine's synth pieces)
const SND={
  // air being drawn in: a rising filtered swell that cuts off dead
  inhale(dur=1,v=.5){ if(!AC) return; const t=AC.currentTime, n=noiseSrc(t,dur), bp=filt('bandpass',180,5), g=AC.createGain();
    bp.frequency.setValueAtTime(180,t); bp.frequency.exponentialRampToValueAtTime(3200,t+dur); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+dur*.96); g.gain.linearRampToValueAtTime(0,t+dur);
    n.connect(bp); bp.connect(g); toOut(g,.5);
    const o=osc('sine',38), og=AC.createGain(); o.frequency.exponentialRampToValueAtTime(92,t+dur); og.gain.setValueAtTime(.0001,t); og.gain.exponentialRampToValueAtTime(.7*v,t+dur*.96); og.gain.linearRampToValueAtTime(0,t+dur); o.connect(og); og.connect(dist); o.start(t); o.stop(t+dur+.05); },
  // the hit itself: a sub drop under a crack, after the silence of the impact frames
  hit(v=1){ if(!AC) return; const t=AC.currentTime, o=osc('sine',130), g=AC.createGain(); o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(24,t+1.1); env(g,t,.005,1.25*v,1.5); o.connect(g); g.connect(master); o.start(t); o.stop(t+1.9);
    const n=noiseSrc(t,.12), hp=filt('highpass',3200), ng=AC.createGain(); env(ng,t,.001,.9*v,.09); n.connect(hp); hp.connect(ng); toOut(ng,.3); SFX.boom(2.2,v); },
  shing(p=1,v=.6){ if(!AC) return; const t=AC.currentTime; [2090,3170,4230,5310,7480].forEach((f,i)=>{ const o=osc('sine',f*p*(1+Math.random()*.004)), g=AC.createGain(); env(g,t,.002,v*.22/(1+i*.5),1.1+Math.random()*.6); o.connect(g); toOut(g,.7); o.start(t); o.stop(t+2); });
    const n=noiseSrc(t,.2), hp=filt('highpass',5200), g=AC.createGain(); env(g,t,.001,.5*v,.12); n.connect(hp); hp.connect(g); toOut(g,.4); },
  gong(v=1){ if(!AC) return; const t=AC.currentTime; [[98,.5,3.4],[147.3,.3,3],[196.6,.22,2.6],[263,.14,2],[412,.08,1.4]].forEach(([f,a,d])=>{ const o=osc('sine',f), g=AC.createGain(); env(g,t,.006,a*v,d); o.connect(g); toOut(g,.9); o.start(t); o.stop(t+d+.1); }); },
  tick(p=1,v=.25){ if(!AC) return; const t=AC.currentTime, o=osc('square',1800*p), g=AC.createGain(), hp=filt('highpass',1200); env(g,t,.001,v,.035); o.connect(hp); hp.connect(g); toOut(g,.5); o.start(t); o.stop(t+.08); },
  cut(){ SFX.whoosh(.55,.9); SFX.click(); SFX.sub(.55); },
  // a long low drone under a charge; returns a handle with stop()
  drone(f=55,v=.35){ if(!AC) return NOP; const t=AC.currentTime, os=[osc('sawtooth',f),osc('sawtooth',f*1.006),osc('sine',f/2)], lp=filt('lowpass',260,4), g=AC.createGain();
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.4); lp.frequency.exponentialRampToValueAtTime(1500,t+3); os.forEach(o=>{ o.connect(lp); o.start(t); }); lp.connect(g); g.connect(dist); toOut(g,.3);
    return {stop(fade=.25){ const t=AC.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value||v,t); g.gain.linearRampToValueAtTime(0,t+fade); os.forEach(o=>{ try{ o.stop(t+fade+.05); }catch(e){} }); }}; },
};

// ---------------------------------------------------------------- state
const C={on:false,t:0,dark:0,darkT:0,dc:'6,4,14',spot:null,cut:null,imp:null,lines:null,scars:[],ash:[],ashT:0,ashC:'#888',flashCap:.22,drones:[],veil:0,veilT:0,veilC:'255,255,255',SND,img,tex};
X.cine=C;
C.preload=cls=>{ (CUTS[cls]||[]).forEach(img); };
C.begin=()=>{ C.on=true; C.hscT=1.22; C.t=0; C.cut=null; C.imp=null; C.lines=null; post.caMax=.012; };
C.end=()=>{ C.on=false; C.mv=null; C.hs=null; C.zkT=1; C.zkK=8; post.tiltT=0; post.tiltK=3; if(C.spotL){ C.spotL.hold=0; C.spotL.life=.3; C.spotL=null; } C.hscT=1; if(C.imp&&C.imp.amb) GFX.amb=C.imp.amb; GFX.ambient(1,1,1,3); if(C.st) C.st.dur=Math.min(C.st.dur,C.st.t+.5); C.darkT=0; C.spot=null; C.lines=null; C.cut=null; C.imp=null; C.veilT=0; V.camT=null; V.camK=0; cam.rollT=0; post.caMax=0; V.blast=null; C.flashCap=.22; for(const d of C.drones) d.stop(); C.drones.length=0; if(beamSnd!==NOP){ beamSnd.stop(); beamSnd=NOP; } };
C.reset=()=>{ C.end(); C.zkT=null; V.zk=1; C.pk=null; post.tint=null; V.hsc=1; GFX.reset(); C.st=null; C.dark=0; C.veil=0; C.scars.length=0; C.ash.length=0; C.ashT=0; };
C.drone=(f,v)=>{ const d=SND.drone(f,v); C.drones.push(d); return d; };

// darkness over the field and the enemies (effects and the hero stay bright); spot = a lit patch of floor
C.setDark=(a,o={})=>{ C.darkT=Math.min(a,LOW()?.55:.74); if(o.c) C.dc=o.c; C.spot=o.spot===undefined?C.spot:o.spot; };
// a full-screen colour wash that fades by itself (white-outs, coloured breaths)
C.wash=(c,a,hold=0,x,y)=>{ a*=.45; C.veilC=c; C.veil=LOW()?a*.4:a; C.veilHold=hold; C.veilP=x==null?null:[x,y]; };
// every camera call eases from where the camera is now (nothing jumps); the latest call for a property wins over a running C.move
const mvDrop=(...ks)=>{ if(C.mv) for(const k of ks) delete C.mv.to[k]; };
C.cam=(x,y,k=7)=>{ mvDrop('x','y','home'); V.camT=x==null?null:{x,y}; V.camK=k; };
// zoom: without k the engine closes the gap in about a tenth of a second; with k (2 slow .. 12 quick) it glides there
C.zoom=(z,k)=>{ mvDrop('zoom'); if(k){ C.zkT=z; C.zkK=k; } else { C.zkT=null; V.zk=z; } };
C.roll=r=>{ mvDrop('roll'); cam.rollT=LOW()?r*.3:r; };
// camera tilt: 0 = the game's top-down view, up to ~.3 = the camera drops toward the floor and the field recedes (k = how fast it gets there)
C.tilt=(t,k=4)=>{ mvDrop('tilt'); post.tiltT=LOW()?t*.5:t; post.tiltK=k; };
// a timed move: from wherever the camera is now to `to` in `dur` seconds along an ease ('io' slow-fast-slow, 'out' fast then settling, 'in' gathering speed, 'lin').
//  to: {x,y (camera centre in the world, like C.cam), zoom, tilt, roll, home:1 (follow the hero again)} - only the listed properties move. It holds there afterwards.
const EZ={io:k=>k*k*(3-2*k),out:k=>1-(1-k)*(1-k)*(1-k),in:k=>k*k*k,lin:k=>k};
C.move=(to,dur=.6,ease='io')=>{ C.mv={t:0,dur:Math.max(.001,dur),ez:EZ[ease]||EZ.io,to:{...to},fr:{x:cam.x,y:cam.y,zoom:V.zk||1,tilt:post.tilt||0,roll:cam.roll||0}}; if(to.zoom!=null) C.zkT=null; };
// glide back to the game camera (the hero, zoom 1, no tilt, no roll)
C.back=(dur=.8,ease='io')=>C.move({home:1,zoom:1,tilt:0,roll:0},dur,ease);
C.easeBack=true;
// the climax on screen: a chromatic split and a radial blur about a world point and a breath of colour over the picture, held for a few frames and eased out.
//  o: {ca (.02), blur (.1), tint ('#rrggbb'), a (strength of the tint, .3), hold (seconds at full, .05 = 3 frames), out (seconds to ease away, .28)}
C.peak=(x,y,o={})=>{ const k=LOW()?.35:1; C.pk={t:0,x,y,hold:o.hold??.05,out:o.out??.28,ca:(o.ca??.02)*k,blur:(o.blur??.1)*k,tint:o.tint?GFX.rgb(o.tint):null,ta:(o.a??.3)*k}; };
// the held breath before the blow: only the floor and the crowd go dark (effects and the hero keep their light), the sound drops, and it all comes back by itself.
//  o: {a (floor light level, .45), c (tint of what light is left), back (how fast it returns, 14), snd:false to leave the sound alone}
C.hush=(dur=.2,o={})=>{ const a=o.a??.45, c=o.c?GFX.rgb(o.c):[1,1,1.12], back=(C.hs&&C.hs.back)||GFX.ambT.slice(); GFX.ambient(a*(.6+.4*c[0]),a*(.6+.4*c[1]),a*(.6+.4*c[2]),30); C.hs={t:0,dur,back,ref:GFX.ambT,k:o.back??14}; if(o.snd!==false&&typeof duck==='function') duck(.15,dur); };
C.shake=s=>{ trauma=Math.min(1.5,Math.max(trauma,LOW()?s*.35:s)); };
C.release=(x,y,c,v=.5)=>{ K.ripple(x,y,1400,{life:.5,s:.6}); K.light(x,y,1600,c,.9,.5); C.gSparks(x,y,BODY*.6,22,c,{vz:900}); C.gDebris(x,y,8,{s0:250,s1:800,r:120}); C.flash(.2); C.shake(.7); post.ca=.01; fring(x,y,2600,c,.5,9); fring(x,y,1500,'#ffffff',.3,4); gl0(x,y-BODY,360,c,.3,{a:.8}); SFX.boom(1.4,v); SND.shing(.7,.4); };
C.flash=a=>{ a*=.72; a=LOW()?a*.35:a; C.flashCap=Math.max(C.flashCap,a); post.flash=Math.max(post.flash,a); };

// ---------------------------------------------------------------- cut-in
// styles: 'slit' (a band that opens like a cut), 'diag' (a slanted band that slides in), 'punch' (zooms in from large)
C.cutin=(i,o={})=>(o.dur||1); C.cutinOld=(i,o={})=>{ const key=(CUTS[pl.cls]||[])[i]; C.cut={s:key?img(key):null,t:0,dur:o.dur||1,c:o.c||X.CCOL[pl.cls],title:o.title||'',sub:o.sub||'',style:o.style||'diag',ang:o.ang??-.13,y:o.y??.4,h:o.h??.3,dir:o.dir||1,fx:o.fx??.5,fy:o.fy??.45,zoom:o.zoom??1.08};
  SND.cut(); buzz(30); return C.cut.dur; };
function drawCut(g){ const c=C.cut; if(!c) return; const u=U(), t=c.t, inK=easeOut(clamp(t/.16,0,1)), outK=clamp((t-(c.dur-.13))/.13,0,1), live=1-outK;
  g.save(); g.setTransform(1,0,0,1,0,0);
  g.fillStyle=`rgba(0,0,0,${.55*inK*live})`; g.fillRect(0,0,W,H);
  const bw=W*1.25, bh0=H*c.h; let bh=bh0, ox=0, sc=1, al=1;
  if(c.style==='slit'){ bh=bh0*(inK*(1-easeOut(outK))); }
  else if(c.style==='diag'){ ox=(1-inK)*W*1.5*c.dir-easeOut(outK)*W*1.5*c.dir; }
  else { sc=1+(1-inK)*.8; al=inK*live; bh=bh0*(1-.5*easeOut(outK)); }
  if(bh<2){ g.restore(); return; }
  g.translate(W/2+ox,H*c.y); g.rotate(c.ang); g.scale(sc,sc); g.globalAlpha=al;
  // the band
  g.save(); g.beginPath(); g.rect(-bw/2,-bh/2,bw,bh); g.clip();
  const bg=g.createLinearGradient(0,-bh/2,0,bh/2); bg.addColorStop(0,'#05030a'); bg.addColorStop(.5,hexA(c.c,.55)); bg.addColorStop(1,'#05030a'); g.fillStyle='#05030a'; g.fillRect(-bw/2,-bh/2,bw,bh); g.fillStyle=bg; g.fillRect(-bw/2,-bh/2,bw,bh);
  if(c.s&&c.s.ok){ const im=c.s.im, k=Math.max(bw/im.naturalWidth,bh0/im.naturalHeight)*(c.zoom+t*.07), iw=im.naturalWidth*k, ih=im.naturalHeight*k, drift=(t-.5)*W*.05*c.dir, jx=t<.2?(Math.random()-.5)*10*u*(1-t/.2):0;
    g.rotate(-c.ang); g.drawImage(im,-iw*c.fx+drift+jx,-ih*c.fy,iw,ih); g.rotate(c.ang); }
  // streaks racing through the band, and a light sweep as it lands
  g.globalCompositeOperation='lighter';
  for(let k=0;k<26;k++){ const sy=-bh/2+((k*.618)%1)*bh, sp=(2.2+((k*.37)%1)*3)*W, x=((t*sp+k*311)%(bw*1.6))-bw*.8, l=(.12+((k*.29)%1)*.35)*W; g.fillStyle=k%3?`rgba(255,255,255,${.1+.12*((k*.53)%1)})`:hexA(c.c,.35); g.fillRect(-x*c.dir-l/2,sy,l,(1+((k*.71)%1)*2.4)*u); }
  const sw=clamp(t/.3,0,1); if(sw<1){ const gx=lerp(-bw*.7,bw*.7,sw)*c.dir, lg=g.createLinearGradient(gx-W*.25,0,gx+W*.25,0); lg.addColorStop(0,'rgba(255,255,255,0)'); lg.addColorStop(.5,`rgba(255,255,255,${.75*(1-sw)})`); lg.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=lg; g.fillRect(-bw/2,-bh/2,bw,bh); }
  g.globalCompositeOperation='source-over';
  const vg=g.createLinearGradient(0,-bh/2,0,bh/2); vg.addColorStop(0,'rgba(0,0,0,.55)'); vg.addColorStop(.22,'rgba(0,0,0,0)'); vg.addColorStop(.7,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.75)'); g.fillStyle=vg; g.fillRect(-bw/2,-bh/2,bw,bh);
  g.restore();
  // edges
  for(const s of [-1,1]){ g.fillStyle=c.c; g.fillRect(-bw/2,s*bh/2-2.5*u,bw,5*u); g.fillStyle='#fff'; g.fillRect(-bw/2,s*bh/2-.8*u,bw,1.6*u); }
  g.globalCompositeOperation='lighter'; for(const s of [-1,1]){ const eg=g.createLinearGradient(0,s*bh/2-16*u,0,s*bh/2+16*u); eg.addColorStop(0,hexA(c.c,0)); eg.addColorStop(.5,hexA(c.c,.5)); eg.addColorStop(1,hexA(c.c,0)); g.fillStyle=eg; g.fillRect(-bw/2,s*bh/2-16*u,bw,32*u); } g.globalCompositeOperation='source-over';
  // the name, cut into the lower edge
  if(c.title&&bh>bh0*.5){ const tk=easeOut(clamp((t-.1)/.2,0,1)), fs=Math.min(40*u,W*.92/(c.title.length*1.02)), tx=-W*.44+(1-tk)*W*.5*-c.dir, ty=bh/2-fs*.1;
    g.save(); g.globalAlpha=al*tk; g.translate(tx,ty); g.transform(1,0,-.18,1,0,0); g.textAlign='left'; g.textBaseline='alphabetic'; g.lineJoin='round';
    g.font=`900 ${fs}px ${FONT_K}`; g.lineWidth=fs*.22; g.strokeStyle='#000'; g.strokeText(c.title,0,0); g.shadowColor=c.c; g.shadowBlur=18*u; g.fillStyle='#fff'; g.fillText(c.title,0,0); g.shadowBlur=0;
    if(c.sub){ g.font=`900 ${fs*.3}px "Arial Black",Impact,sans-serif`; g.lineWidth=fs*.09; g.strokeText(c.sub.split('').join(' '),fs*.06,-fs*1.02); g.fillStyle=c.c; g.fillText(c.sub.split('').join(' '),fs*.06,-fs*1.02); }
    g.restore(); }
  g.restore(); }

// ---------------------------------------------------------------- impact frames
// a few held frames in two inks with jagged speed lines, the game frozen and silent under them; `then` fires on release with the sound
const PAL={bw:[[[0,0,0],[1,1,1]],[[1,1,1],[0,0,0]],[[0,0,0],[1,1,1]]]};
function rgb01(h){ const n=parseInt(h.slice(1),16); return [(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]; }
C.impact=(x,y,o={})=>{ const c=o.c||'#ffffff', k=rgb01(c), dk=k.map(v=>v*.16), n=o.n||3, fd=o.fd||.045;
  let pal=o.pal||(n<3?[[k,[0,0,0]],[dk,[1,1,1]]]:[[[0,0,0],[1,1,1]],[k,[0,0,0]],[dk,[1,1,1]]]); if(LOW()) pal=pal.map(()=>[dk,k]); if(o.soft) pal=[[k.map(v=>v*.08),k.map(v=>.5+v*.3)],[dk.map(v=>v*.4),k.map(v=>.34+v*.4)]];
  C.imp={x,y,c,t:0,fd,n,pal:pal.slice(0,n),seed:(Math.random()*1e4)|0,style:o.style||'radial',ang:o.ang||0,r:o.r??.2,then:o.then,v:o.v??1,flash:o.flash??.14,blur:o.blur??.06,soft:!!o.soft};
  if(o.hard!==true){ C.imp.soft=true; C.imp.fd=fd*1.5; const T=tone(c), d=n*fd*1.5, stI=gst(14,'add',T,5); C.dark=Math.max(C.dark,.78);
    K.add(Math.min(.18,d+.04),k=>K.screen(stI,x,y,T.c,.42*(1-k),.3+.16*k,K.tq(24,3),17,.3)); K.add(d+.08,k=>K.bill(K.st(8,'add',{L:3}),x,y,BODY*.4,300+260*k,300+260*k,0,T.c,.5*(1-k))); if(C.art('fx3_burst').ok) C.gArt('fx3_burst',x,y,c,{add:true,a:.4,c3:c,z:BODY*.4,w:250,h:190,life:d+.1,hold:.2,grow:.5,ease:true,rot:rand(-.6,.6),L:3}); K.light(x,y,1100,c,.9,d+.1); }
  hitstop=Math.max(hitstop,n*C.imp.fd); if(AC) duck(.06,n*C.imp.fd*.9); buzz([0,n*C.imp.fd*1000|0,160]); };
let seedV=1; const srnd=()=>{ seedV=(seedV*16807)%2147483647; return seedV/2147483647; };
function drawImp(g){ const m=C.imp; if(!m||m.soft) return; const i=Math.min(m.n-1,Math.floor(m.t/m.fd)), [bg,fg]=m.pal[i], [sx,sy]=w2s(m.x,m.y), col=`rgb(${fg.map(v=>v*255|0)})`, R=Math.hypot(W,H), mn=Math.min(W,H);
  seedV=m.seed+i*977+1; g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle=col;
  if(m.style==='slash'){ // parallel streaks along the cut, thinning toward its line
    g.translate(sx,sy); g.rotate(m.ang);
    for(let k=0;k<(m.soft?13:34);k++){ const off=(srnd()<.5?-1:1)*(mn*(m.soft?.2:.05)+srnd()*srnd()*R*.6), th=(2+srnd()*srnd()*26)*U(), x0=-R+srnd()*R*.8, l=R*(.5+srnd()*1.4); g.beginPath(); g.moveTo(x0,off); g.lineTo(x0+l*.5,off-th/2); g.lineTo(x0+l,off); g.lineTo(x0+l*.5,off+th/2); g.fill(); }
    if(!m.soft) g.fillRect(-R,-2.5*U(),R*2,5*U()); }
  else { const st=m.style, u=U(); g.translate(sx,sy); g.strokeStyle=col;
    const wedges=N=>{ for(let k=0;k<N;k++){ const a=k/N*TAU+srnd()*.2, r0=mn*(m.r+srnd()*srnd()*.55), wd=.012+srnd()*srnd()*.07; g.beginPath(); g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0); g.lineTo(Math.cos(a-wd)*R,Math.sin(a-wd)*R); g.lineTo(Math.cos(a+wd)*R,Math.sin(a+wd)*R); g.fill(); } };
    if(st==='bolt'){ // forked fractures running out from the strike
      g.lineJoin='miter'; g.lineCap='butt'; for(let k=0;k<14;k++){ let a=k/14*TAU+srnd()*.3, r=mn*(m.r+srnd()*.1); g.lineWidth=(5+srnd()*srnd()*24)*u; g.beginPath(); g.moveTo(Math.cos(a)*r,Math.sin(a)*r); while(r<R){ r+=mn*(.07+srnd()*.15); a+=(srnd()-.5)*.55; g.lineTo(Math.cos(a)*r,Math.sin(a)*r); } g.stroke(); } }
    else if(st==='paper'){ // talisman slips thrown outward, a few rays between them
      for(let k=0;k<30;k++){ const a=srnd()*TAU, r=mn*(m.r+.08+srnd()*1.1), w=(12+srnd()*30)*u, h=w*2.4; g.save(); g.translate(Math.cos(a)*r,Math.sin(a)*r); g.rotate(a+Math.PI/2+(srnd()-.5)*1.2); g.fillRect(-w/2,-h/2,w,h); g.restore(); } wedges(12); }
    else if(st==='ember'){ // tongues of flame licking outward, sparks between
      for(let k=0;k<28;k++){ const a=k/28*TAU+srnd()*.2, r0=mn*(m.r+srnd()*.2), len=mn*(.3+srnd()*1.1), wd=mn*(.025+srnd()*.05), bd=(srnd()-.5)*1.4; g.save(); g.rotate(a); g.beginPath(); g.moveTo(r0,-wd); g.quadraticCurveTo(r0+len*.5,-wd*1.7+bd*wd*3,r0+len,bd*wd*5); g.quadraticCurveTo(r0+len*.5,wd*1.7+bd*wd*3,r0,wd); g.fill(); g.restore(); }
      for(let k=0;k<40;k++){ const a=srnd()*TAU, r=mn*(m.r+srnd()*1.2), s=(2+srnd()*7)*u; g.beginPath(); g.arc(Math.cos(a)*r,Math.sin(a)*r,s,0,TAU); g.fill(); } }
    else { if(st==='fist'){ // broken shock rings round the blow
        g.lineCap='butt'; for(let k=0;k<3;k++){ g.lineWidth=(30-k*8)*u; const rr=mn*(m.r*1.15+k*.19+srnd()*.03); for(let q=0;q<3;q++){ const a0=srnd()*TAU; g.beginPath(); g.arc(0,0,rr,a0,a0+1+srnd()*1.1); g.stroke(); } } }
      wedges(st==='fist'?24:34);
      const ink=img('fx_ink_a'); if(ink.ok&&i===1&&st!=='fist'){ const s=mn*2.1; g.rotate(srnd()*TAU); g.globalAlpha=.9; g.drawImage(ink.im,-s/2,-s/2,s,s); } } }
  g.restore(); }
img('fx_ink_a');

// ---------------------------------------------------------------- speed lines at the screen edge (a charge, a beam, a dive)
C.speed=(dur,o={})=>{ C.lines={t:0,dur,c:o.c||'#ffffff',x:o.x,y:o.y,a:o.a??.5,r:o.r??.34,n:o.n||30}; };
function drawLines(g){ const L=C.lines; if(!L) return; const k=Math.min(1,L.t/.12)*Math.min(1,(L.dur-L.t)/.2); if(k<=0) return; const [sx,sy]=L.x==null?[W/2,H/2]:w2s(L.x,L.y), R=Math.hypot(W,H), mn=Math.min(W,H);
  g.save(); g.setTransform(1,0,0,1,0,0); g.translate(sx,sy); g.globalCompositeOperation='lighter'; g.fillStyle=hexA(L.c,L.a*k*(LOW()?.5:1));
  for(let i=0;i<L.n;i++){ const a=Math.random()*TAU, r0=mn*(L.r+Math.random()*.45), wd=.004+Math.random()*.02; g.beginPath(); g.moveTo(Math.cos(a)*r0,Math.sin(a)*r0); g.lineTo(Math.cos(a-wd)*R,Math.sin(a-wd)*R); g.lineTo(Math.cos(a+wd)*R,Math.sin(a+wd)*R); g.fill(); }
  g.restore(); }

// ---------------------------------------------------------------- storm clouds rolling over the top of the screen, lit from inside now and then
C.storm=(dur,c)=>{ C.st={t:0,dur,c,fl:0}; };
function drawStorm(g){ const s=C.st; if(!s) return; const k=Math.min(1,s.t/.6)*Math.min(1,(s.dur-s.t)/.5); if(k<=0) return; g.save(); g.setTransform(1,0,0,1,0,0);
  if(Math.random()<.05) s.fl=1; s.fl*=.8;
  for(let i=0;i<8;i++){ const x=(((i*.21+RT*.03*(1+i%3))%1.4)-.2)*W, y=H*(.03+.045*(i%4)), rx=W*(.4+.1*(i%3)), ry=H*.1, cg=g.createRadialGradient(x,y,0,x,y,rx); cg.addColorStop(0,`rgba(10,6,24,${.9*k})`); cg.addColorStop(.6,`rgba(10,6,24,${.55*k})`); cg.addColorStop(1,'rgba(10,6,24,0)');
    g.save(); g.translate(x,y); g.scale(1,ry/rx); g.translate(-x,-y); g.fillStyle=cg; g.beginPath(); g.arc(x,y,rx,0,TAU); g.fill();
    if(s.fl>.05&&i%3===0){ const lg=g.createRadialGradient(x,y,0,x,y,rx*.8); lg.addColorStop(0,hexA(s.c,.6*s.fl*k)); lg.addColorStop(1,hexA(s.c,0)); g.globalCompositeOperation='lighter'; g.fillStyle=lg; g.beginPath(); g.arc(x,y,rx*.8,0,TAU); g.fill(); g.globalCompositeOperation='source-over'; }
    g.restore(); }
  g.restore(); }

// ---------------------------------------------------------------- ash / petals drifting down the screen after the blast
C.ashFall=(dur,c='#9a9aa8',n=46,o={})=>{ C.ashT=dur; C.ashD=dur; C.ashC=c; C.ashUp=!!o.up; C.ashGlow=!!o.glow; C.ash.length=0; n=Math.round(n*QK());
  for(let i=0;i<n;i++) C.ash.push({x:Math.random(),y:Math.random()*1.2-.2,v:.08+Math.random()*.16,s:1.2+Math.random()*2.6,ph:Math.random()*TAU,w:.3+Math.random()*.9}); };
function drawAsh(g){ if(C.ashT<=0||!C.ash.length) return; const a=Math.min(1,C.ashT/1)*Math.min(1,(C.ashD-C.ashT)/.5), u=U(); g.save(); g.setTransform(1,0,0,1,0,0); if(C.ashGlow) g.globalCompositeOperation='lighter'; g.fillStyle=C.ashC;
  for(const p of C.ash){ const x=(p.x+Math.sin(RT*p.w+p.ph)*.03)*W, y=p.y*H; g.globalAlpha=a*(.35+.5*Math.abs(Math.sin(RT*2*p.w+p.ph))); g.save(); g.translate(x,y); g.rotate(RT*p.w*2+p.ph); g.fillRect(-p.s*u,-p.s*u*.45,p.s*2*u,p.s*u*.9); g.restore(); }
  g.restore(); }

// ---------------------------------------------------------------- gathering energy
// motes and streaks drawn in to a point, contracting rings on the floor, the air pulled with it
C.gather=(x,y,o={})=>{ const c=o.c||'#ffffff', dur=o.dur||1, n=Math.round((o.n||40)*QK()), R=o.r||900, cs=o.cs||[c,'#ffffff'];
  for(let i=0;i<n;i++) after(i/n*dur*.85,()=>{ const a=rand(0,TAU), r=R*rand(.5,1.1); gl0(x+Math.cos(a)*r,y+Math.sin(a)*r*.75,rand(4,10),pick(cs),.8,{tx:x,ty:y,a:.9}); });
  const N=o.streaks??18, st=[]; for(let i=0;i<N;i++) st.push({a:rand(0,TAU),d:rand(0,dur*.8),r:R*rand(.7,1.2),l:rand(.12,.3)});
  X.draw(dur,k=>{ const t=k*dur; fx.lineCap='round'; for(const s of st){ const q=(t-s.d)/.42; if(q<=0||q>=1) continue; const e=q*q, r1=s.r*(1-e), r0=Math.min(s.r,r1+s.r*s.l*(1-q*.5)), ca=Math.cos(s.a), sa=Math.sin(s.a)*.75;
      fx.globalAlpha=.75*Math.sin(q*Math.PI); fx.strokeStyle=c; fx.lineWidth=5; fx.beginPath(); fx.moveTo(x+ca*r0,y+sa*r0); fx.lineTo(x+ca*r1,y+sa*r1); fx.stroke(); fx.strokeStyle='#fff'; fx.lineWidth=1.6; fx.stroke(); } fx.globalAlpha=1; });
  const rings=o.rings??3; for(let i=0;i<rings;i++) after(i*dur/(rings+.5),()=>ring(x,o.fy??y,-R*2.4,c,.5,{r0:R*1.1,w:4,dec:1,sy:FSY}));
  { const drop=C.gLevitate(x,o.fy??y,R*.7,18,{dur:dur*.8,life:dur+1.2}); after(dur+.9,()=>drop(700)); }
  if(o.snd!==false) SND.inhale(dur,o.v??.45); };

// ---------------------------------------------------------------- shockwaves: several floor rings of different speed and weight, a refraction ring, dust pushed out
C.waves=(x,y,c,o={})=>{ const s=o.s||1, n=o.n||3;
  for(let i=0;i<n;i++) after(i*(o.gap??.09),()=>{ fring(x,y,(3600-i*700)*s,i%2?'#ffffff':c,.75-i*.12,(14-i*4)); fring(x,y,(2300-i*400)*s,i%2?c:'#ffffff',.45,4); });
  if(!LOW()&&X.shock1) X.shock1(x,y-BODY*.4,Math.min(.95,.75*s),1.15);
  const nd=Math.round((o.dust??16)*QK()); for(let i=0;i<nd;i++){ const a=i/nd*TAU+rand(-.2,.2), sp=rand(500,1100)*s; smoke(x+Math.cos(a)*120*s,y+Math.sin(a)*90*s,rand(50,110)*s,{vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.7-40,a:.38,life:rand(1.2,2.2),grow:rand(60,140),c:o.dc||'40,34,52'}); }
  light(x,y-BODY,2600*s,c,1,.6);
  { const k=K.rgb(c), mixc=(t,d)=>'#'+k.map((v,i)=>Math.round(255*(v*t+d[i]*(1-t))).toString(16).padStart(2,'0')).join(''), rock=mixc(.22,[.16,.15,.19]), dust=mixc(.3,[.2,.19,.22]);
    K.ripple(x,y,1500*s,{life:.7,s:.9}); K.light(x,y,2000*s,c,.6,.8); C.gCrack(x,y,900*s,c,{life:3.2,n:15,w:.1});
    C.gDebris(x,y,Math.round(14*s),{s0:300,s1:1500*s,vz:2200,size:28,c:rock}); C.gDebris(x,y,Math.round(5*s),{r:260,s0:100,s1:600,v0:1600,vz:3400,sz0:36,size:80,g:2600,c:rock}); C.gSparks(x,y,40,Math.round(26*s),c,{vz:1400}); C.gMotes(x,y,900*s,c,Math.round(50*s),{dur:1.8,life:2.2});
    } };

// ---------------------------------------------------------------- ground scars (live on after the ultimate, glowing down to embers)
// kinds: crack (radial fractures), gash (a straight cut: rot, len), burn (scorch)
C.scar=o=>{ C.scars.push({t:0,life:9,heat:2.4,kind:'crack',rot:rand(0,TAU),c:'#ffffff',r:400,...o}); if(C.scars.length>16) C.scars.shift(); };
function drawScars(){ for(const s of C.scars){ const k=s.t/s.life, fade=clamp((1-k)/.25,0,1), grow=easeOut(clamp(s.t/.18,0,1)), heat=Math.max(0,1-s.t/s.heat), ha=(.1+.9*heat*heat)*fade;
    if(s.kind==='gash'){ const t0=tex('fx_gash',s.c), L=s.len*grow, wd=(s.w||260);
      ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot); ctx.globalAlpha=.7*fade; ctx.fillStyle='#050308'; ctx.beginPath(); ctx.ellipse(0,0,L/2,5+wd*.018,0,0,TAU); ctx.fill(); ctx.restore(); ctx.globalAlpha=1;
      if(t0){ fx.save(); fx.translate(s.x,s.y); fx.rotate(s.rot); fx.globalAlpha=ha; fx.drawImage(t0,-L/2,-wd/2,L,wd); if(heat>.4){ fx.globalAlpha=(heat-.4)*fade; fx.drawImage(img('fx_gash').im,-L/2,-wd/2,L,wd); } fx.restore(); fx.globalAlpha=1; }
      continue; }
    const r=s.r*grow;
    if(s.kind==='burn'){ const g=ctx.createRadialGradient(0,0,0,0,0,r), kd=img('fx_crack_k'); g.addColorStop(0,`rgba(4,2,6,${.5*fade})`); g.addColorStop(.55,`rgba(8,4,8,${.28*fade})`); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(s.x,s.y); ctx.scale(1,FSY); ctx.rotate(s.rot); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill(); if(kd.ok){ ctx.globalAlpha=.55*fade; ctx.drawImage(kd.im,-r*.8,-r*.8,r*1.6,r*1.6); } ctx.restore(); ctx.globalAlpha=1;
      fx.save(); fx.translate(s.x,s.y); fx.scale(1,FSY); glow(fx,0,0,r*.8,s.c,ha*.5); fx.restore(); continue; }
    if(s.kind==='crater'){ // broken concentric rings punched into the floor
      for(const g of [ctx,fx]){ g.save(); g.translate(s.x,s.y); g.scale(1,FSY); g.rotate(s.rot); g.lineCap='butt';
        for(let i=0;i<4;i++){ const rr=r*(.2+i*.25); for(let q=0;q<5;q++){ const a0=q*TAU/5+i*.7, a1=a0+.7+((i*3+q)%3)*.14; if(g===ctx){ g.strokeStyle=`rgba(3,2,6,${.8*fade})`; g.lineWidth=r*.075; } else { g.strokeStyle=hexA(s.c,Math.min(1,ha*(1.2-i*.2))); g.lineWidth=r*.024; } g.beginPath(); g.arc(0,0,rr,a0,a1); g.stroke(); } }
        g.restore(); }
      fx.save(); fx.translate(s.x,s.y); fx.scale(1,FSY); glow(fx,0,0,r*.5,s.c,ha*.6); fx.restore(); continue; }
    if(s.kind==='seal'){ // a ritual seal branded into the floor
      const t1=tex('fx_circle_seal',s.c), g0=ctx.createRadialGradient(0,0,0,0,0,r); g0.addColorStop(0,`rgba(3,5,5,${.6*fade})`); g0.addColorStop(.8,`rgba(3,5,5,${.4*fade})`); g0.addColorStop(1,'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(s.x,s.y); ctx.scale(1,FSY); ctx.fillStyle=g0; ctx.beginPath(); ctx.arc(0,0,r,0,TAU); ctx.fill(); ctx.restore();
      if(t1){ fx.save(); fx.translate(s.x,s.y); fx.scale(1,FSY); fx.rotate(s.rot); fx.globalAlpha=Math.min(1,ha*1.1); fx.drawImage(t1,-r,-r,r*2,r*2); fx.restore(); fx.globalAlpha=1; } continue; }
    if(s.kind==='swirl'){ // the track a firestorm ground into the floor
      for(const g of [ctx,fx]){ g.save(); g.translate(s.x,s.y); g.scale(1,FSY); g.rotate(s.rot); g.lineCap='round';
        for(let arm=0;arm<4;arm++){ g.beginPath(); for(let q=0;q<=22;q++){ const tt=q/22, a=arm*TAU/4+tt*3.6, rr=r*(.08+.92*tt); q?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); }
          if(g===ctx){ g.strokeStyle=`rgba(4,2,2,${.75*fade})`; g.lineWidth=r*.09; } else { g.strokeStyle=hexA(s.c,ha); g.lineWidth=r*.03; } g.stroke(); }
        g.restore(); }
      fx.save(); fx.translate(s.x,s.y); fx.scale(1,FSY); glow(fx,0,0,r*.6,s.c,ha*.5); fx.restore(); continue; }
    const kd=img('fx_crack_k'), t0=tex('fx_crack',s.c);
    ctx.save(); ctx.translate(s.x,s.y); ctx.scale(1,FSY); ctx.rotate(s.rot);
    const g=ctx.createRadialGradient(0,0,0,0,0,r*.55); g.addColorStop(0,`rgba(3,2,5,${.75*fade})`); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(0,0,r*.55,0,TAU); ctx.fill();
    if(kd.ok){ ctx.globalAlpha=.9*fade; ctx.drawImage(kd.im,-r,-r,r*2,r*2); } ctx.restore(); ctx.globalAlpha=1;
    if(t0){ fx.save(); fx.translate(s.x,s.y); fx.scale(1,FSY); fx.rotate(s.rot); fx.globalAlpha=ha; fx.drawImage(t0,-r,-r,r*2,r*2); if(heat>.45){ fx.globalAlpha=(heat-.45)*1.2*fade; fx.drawImage(img('fx_crack').im,-r,-r,r*2,r*2); } fx.restore(); fx.globalAlpha=1; }
    if(heat>0&&Math.random()<.25*heat) gl0(s.x+rand(-r,r)*.6,s.y+rand(-r,r)*.4,rand(4,9),s.c,rand(.6,1.2),{vy:rand(-160,-60),a:.8,sway:rand(0,TAU)}); } }

// a flat texture laid on the floor (magic circles): returns a handle {x,y,r,rot,a,c,life}; set .life=0 to remove
C.floorTex=(name,x,y,r,o={})=>{ const h={name,x,y,r,rot:o.rot||0,a:o.a??1,c:o.c,spin:o.spin||0,dead:false,sq:o.sq??FSY}; const t0=RT;
  const d=()=>{ if(h.dead) return; h.rot+=h.spin/60; const t=tex(h.name,h.c); if(!t||h.r<=0||h.a<=0) return; fx.save(); fx.translate(h.x,h.y); fx.scale(1,h.sq); fx.rotate(h.rot); fx.globalAlpha=Math.min(1,h.a); fx.drawImage(t,-h.r,-h.r,h.r*2,h.r*2);
    if(h.core){ fx.globalAlpha=Math.min(1,h.a*h.core); fx.drawImage(img(h.name).im,-h.r,-h.r,h.r*2,h.r*2); } fx.restore(); fx.globalAlpha=1; };
  V.draws.push({t0,life:o.life||60,fn:d}); h.kill=()=>{ h.dead=true; }; return h; };

// ---------------------------------------------------------------- the kill wave: everyone on screen dies in a ripple outward from a point, flung away from it
C.sweep=(cx,cy,D,o={})=>{ const sp=o.speed||3200, L=o.list||onScreen(300); V.blast={x:cx,y:cy,p:o.push??1};
  for(const e of L){ const d=Math.hypot(e.x-cx,e.y-cy), t=Math.min(o.max??.7,d/sp); after(t,()=>{ if(e.dead) return; ultHit(e,D,cx,cy); if(o.fx) o.fx(e); }); } };

// the place something huge is about to land: a lit, closing target on the floor
C.omen=(x,y,r,c,dur)=>{ K.add(dur,k=>K.floor(K.st(12,'alpha',{L:0}),x,y,r*(.4+.9*k),null,0,[0,0,0],.2+.45*k)); X.draw(dur,k=>{ const e=k*k, rr=r*(1.3-.3*e), pu=.8+.2*Math.sin(RT*26);
    ctx.fillStyle=`rgba(0,0,0,${.2+.45*e})`; ctx.beginPath(); ctx.ellipse(x,y,r*(.3+.7*e),r*(.3+.7*e)*FSY,0,0,TAU); ctx.fill();
    fx.fillStyle=hexA(c,(.05+.16*e)*pu); fx.beginPath(); fx.ellipse(x,y,rr,rr*FSY,0,0,TAU); fx.fill();
    fx.strokeStyle=hexA(c,.5+.5*e); fx.lineWidth=12; fx.beginPath(); fx.ellipse(x,y,rr,rr*FSY,0,0,TAU); fx.stroke(); fx.strokeStyle=hexA('#ffffff',.5+.4*e); fx.lineWidth=3; fx.stroke();
    const ri=r*(1-e)*1.25; if(ri>4){ fx.strokeStyle=hexA('#ffffff',.7); fx.lineWidth=5; fx.beginPath(); fx.ellipse(x,y,ri,ri*FSY,0,0,TAU); fx.stroke(); }
    fx.strokeStyle=hexA(c,.9); fx.lineWidth=9; for(let q=0;q<4;q++){ const a=q*Math.PI/2+RT*2.4; fx.beginPath(); fx.ellipse(x,y,rr*1.12,rr*1.12*FSY,0,a,a+.42); fx.stroke(); } }); };
// lingering embers rising from an area for a while
C.embers=(x,y,R,c,o={})=>{ const dur=o.dur||2.5, n=Math.round((o.n||40)*QK()); for(let i=0;i<n;i++) after(rand(0,dur),()=>{ const a=rand(0,TAU), r=R*Math.sqrt(Math.random()); gl0(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,rand(3,8),Math.random()<.3?'#ffffff':c,rand(.9,1.8),{vy:rand(-240,-80),vx:rand(-30,30),a:.85,sway:rand(0,TAU)}); }); };
C.smokeRise=(x,y,R,o={})=>{ const n=Math.round((o.n||10)*QK()); for(let i=0;i<n;i++) after(rand(0,o.dur||1),()=>smoke(x+rand(-R,R),y+rand(-R,R)*FSY,rand(60,130),{vx:rand(-30,30),vy:rand(-160,-70),a:o.a??.34,life:rand(1.8,3),grow:rand(40,90),c:o.c||'30,26,38'})); };


// ---------------------------------------------------------------- GPU kit: the shaded pieces the ultimates are built from (gfx.js draws them)
// tone(c): body colour with its dark rim and hot core
const K=GFX, tone=(c,o={})=>{ const k=K.rgb(c); return {c:k,c2:o.c2?K.rgb(o.c2):k.map(v=>v*.2),c3:o.c3?K.rgb(o.c3):[1,.96,.9]}; };
const gst=(m,b,T,L=1,o={})=>K.st(m,b,{c2:T.c2,c3:T.c3,L,...o});
C.tone=tone; C.gst=gst; K.calm=LOW;
// a crescent cut swept over the floor round (x,y) from angle a0 to a1 at height z: the head races ahead, the tail burns away behind it
C.gSlash=(x,y,r,a0,a1,c,o={})=>{ const T=tone(c,o), st=gst(1,o.add?'add':'alpha',T,o.L??2), span=Math.abs(a1-a0), dir=a1>=a0?1:-1, dur=o.dur||.14, hold=o.hold??.08, fade=o.fade||.26, sd=Math.random()*9, sq=o.sq??1;
  K.add(dur+hold+fade,(k,t)=>{ const h=easeOut(Math.min(1,t/dur)), tl=t<dur+hold?Math.max(0,h-(o.len??.8)):lerp(Math.max(0,1-(o.len??.8)),1,easeOut((t-dur-hold)/fade));
    K.floor(st,x,y,r,r*dir*sq,a0,T.c,o.a??1,h,K.tq(o.fps||14,sd),span,tl,o.z||0); },o.delay||0); };
// a hard-edged shock ring racing over the floor
C.gRing=(x,y,R,c,o={})=>{ const T=tone(c,o), st=gst(2,o.alpha?'alpha':'add',T,o.L??0), life=o.life||.5, sd=Math.random()*9;
  K.add(life,k=>{ const e=o.inward?1-k*k:1-(1-k)*(1-k)*(1-k); K.floor(st,x,y,R,null,sd,T.c,(o.a??1)*Math.min(1,(1-k)*2.4)*clamp((e-.12)/.2,0,1),.05+e*.9,K.tq(12,sd),(o.w??.1)*(1-k*.6),o.jag??.06,o.z||0); },o.delay||0); };
// an impact star: pops in two drawings, holds one, burns out
C.gStar=(x,y,z,s,c,o={})=>{ const T=tone(c,o), st=gst(4,o.alpha?'alpha':'add',T,o.L??3), life=o.life||.2, sd=Math.random()*9;
  K.add(life,k=>{ const g=k<.25?.6+k*1.6:1-(k-.25)*.6; K.bill(st,x,y,z,s*g,s*g*(o.sy??1),0,T.c,o.a??1,1,K.tq(o.fps||16,sd),o.n||5,.3*(1-k)); },o.delay||0); };
// cel smoke / dust / flame puffs that billow and eat themselves away
C.gPuff=(x,y,z,s,o={})=>{ const T=tone(o.c||'#3a3446',{c2:o.c2||'#0c0a12',c3:o.c3||'#7a7488'}); K.pt({x,y,z,vx:o.vx||0,vy:o.vy||0,vz:o.vz??rand(60,160),drag:o.drag??1.6,life:o.life||rand(.8,1.4),s,grow:o.grow??s*.7,c:T.c,m:5,b:o.add?'add':'alpha',st:null,er:1,ns:o.ns||rand(.8,1.3),w:o.rise??1,fk:6,a:o.a??.9,c2:o.c2||'#0c0a12',c3:o.c3||'#7a7488',L:o.L??1}); };
// rock torn out of the floor: thrown up, falls under gravity, bounces, casts a shadow
C.gDebris=(x,y,n,o={})=>{ n=Math.round(n*QK()); for(let i=0;i<n;i++){ const a=o.dir!=null?o.dir+rand(-(o.spread??.6),o.spread??.6):rand(0,TAU), sp=rand(o.s0??200,o.s1??900);
    K.pt({x:x+rand(-1,1)*(o.r||30),y:y+rand(-1,1)*(o.r||30)*FSY,z:rand(4,30),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(o.v0??500,o.vz??1500),g:o.g??3000,life:rand(1,1.9),s:rand(o.sz0??8,o.size??24),c:K.rgb(o.c||'#3d3944'),c2:'#0b0910',m:11,b:'alpha',rot:rand(0,TAU),vr:rand(-12,12),bounce:.35,shadow:true,fk:5,ph:rand(0,9)}); } };
// stones that lift off the floor and hang there (the air before a strike); returns a release function that drops them
C.gLevitate=(x,y,R,n,o={})=>{ const L=[]; n=Math.round(n*QK()); for(let i=0;i<n;i++){ const a=rand(0,TAU), r=R*Math.sqrt(rand(.05,1)), p={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:2,vz:rand(60,220),drag:1.5,life:o.life||4,s:rand(6,o.size??17),c:K.rgb(o.c||'#3d3944'),c2:'#0b0910',m:11,b:'alpha',rot:rand(0,TAU),vr:rand(-1.5,1.5),shadow:true,fk:8,ph:rand(0,9)}; L.push(p); after(rand(0,o.dur||.8),()=>K.pt(p)); }
  return (vz=0)=>{ for(const p of GFX.pts) if(L.includes(p)){ p.g=3200; p.vz=vz?rand(vz*.4,vz):0; p.drag=0; p.bounce=.3; p.life=p.t+1.4; if(vz){ const a=Math.atan2(p.y-y,p.x-x); p.vx=Math.cos(a)*rand(200,700); p.vy=Math.sin(a)*rand(200,700)*FSY; } } }; };
// sparks: short hot streaks thrown from a point
C.gSparks=(x,y,z,n,c,o={})=>{ const k=K.rgb(c); n=Math.round(n*QK()); for(let i=0;i<n;i++){ const a=o.dir!=null?o.dir+rand(-(o.spread??.5),o.spread??.5):rand(0,TAU), sp=rand(o.s0??500,o.s1??1700);
    K.pt({x,y,z,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(o.v0??100,o.vz??900),g:o.g??1800,drag:0,life:rand(.25,o.life??.6),s:rand(2.5,o.w??6),c:Math.random()<.35?[1,1,1]:k,m:3,b:'add',len:o.len??.05,fk:3}); } };
// motes of light that rise (embers) or drift down (petals, ash) through the air, nearer ones larger
C.gMotes=(x,y,R,c,n,o={})=>{ const k=K.rgb(c), dur=o.dur||1.5; n=Math.round(n*QK()); for(let i=0;i<n;i++) after(rand(0,dur),()=>{ const a=rand(0,TAU), r=R*Math.sqrt(Math.random()), dn=!!o.fall;
    K.pt({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:dn?rand(500,1400):rand(0,80),vx:rand(-60,60),vy:rand(-20,20),vz:dn?rand(-420,-180):rand(120,460),drag:.3,life:rand(1,o.life??2.2),s:rand(o.s0??5,o.s1??14),c:Math.random()<(o.white??.25)?[1,.95,.9]:k,m:o.m??8,b:'add',fade:'in',rot:rand(0,TAU),vr:rand(-4,4),sx:o.sx??1,a:o.a??.9}); }); };
// a wall of light torn out of a line on the floor
C.gWall=(x1,y1,x2,y2,h,c,o={})=>{ const T=tone(c,o), st=gst(6,'add',T,o.L??2), life=o.life||.9, sd=Math.random()*9, n=Math.max(3,Math.hypot(x2-x1,y2-y1)/(o.cell||190));
  K.add(life,(k,t)=>{ const up=easeOut(Math.min(1,t/(o.rise||.1))); K.wall(st,x1,y1,x2,y2,h*up*(1+k*.25),T.c,o.a??1,Math.max(0,(k-.18)/.82)**1.3,sd+t*(o.flow??1.5),n,0); },o.delay||0); };
// the image on either side of a line slides apart for a moment (refraction buffer)
C.gSlip=(x1,y1,x2,y2,w,s,life=.25,delay=0)=>{ if(LOW()) return; const st=K.st(10,'mix',{rt:'dist'}); K.add(life,k=>{ const [ax,ay]=K.w2s(x1,y1), [bx,by]=K.w2s(x2,y2), l=Math.hypot(bx-ax,by-ay)||1; K.line(st,x1,y1,0,x2,y2,0,w,[0,0,0],1,s*Math.sin(Math.min(1,k*1.6)*Math.PI)*(1-k*.4),0,(bx-ax)/l,-(by-ay)/l); },delay); };
// speed streaks racing toward a point of the screen
C.gSpeed=(dur,c,o={})=>{ const T=tone(c,o), st=gst(14,'add',T,5), sd=Math.random()*9; K.add(dur,k=>{ K.screen(st,o.x,o.y,T.c,(o.a??.7)*Math.min(1,k*8)*Math.min(1,(1-k)*4),o.r??.3,K.tq(o.fps||16,sd),o.n??11,o.w??.22); },o.delay||0); };
// something falling out of the sky onto (x,y): drawn larger while it is high (nearer the camera), its shadow closing in under it, a streak behind it.
// o: {img, h (world height), w, z0, dur, c (tint), flip, rot, trail (colour), stick (seconds it stays planted), sink, land(x,y)}
C.gDrop=(x,y,o={})=>{ const im=o.img, h=o.h||300, w=o.w||h*.4, z0=o.z0||3000, dur=o.dur||.35, AT=o.art?tone(o.artc||'#ffffff',{c2:o.c2,c3:o.c3}):null, tint=AT?AT.c:(o.c||[1,1,1]), st=AT?gst(15,'alpha',AT,o.L??2,{t:C.art(o.art).im,uv01:true}):K.st(0,'alpha',{t:im,L:o.L??2,uv01:true}), TT=o.trail?tone(o.trail):null, stT=TT&&gst(3,'add',TT,o.L??2), stS=K.st(12,'alpha',{L:0}), pz=o.pz??.00035, rot=o.rot||0, sink=o.sink??.14, stick=o.stick||0, fl=o.flip?-1:1;
  const fxd=K.add(dur+stick,(k,t)=>{ if(o.alive&&!o.alive()){ fxd.dead=true; return; } const q=Math.min(1,t/dur), z=z0*(1-q*q), sc=1+z*pz, landed=t>=dur, a=landed?Math.min(1,(dur+stick-t)/(o.fade||.35)):Math.min(1,q*4);
    if(!landed){ K.floor(stS,x,y,w*(1.2+2.2*(1-q)),null,0,[0,0,0],(.15+.5*q*q)); if(stT){ const ox=(o.dx||0)*(z/z0), oy=(o.dy||0)*(z/z0), z2=Math.min(z0,z+h*(o.tl||3.2)), ox2=(o.dx||0)*(z2/z0), oy2=(o.dy||0)*(z2/z0); K.line(stT,x+ox,y+oy,z+h*.6,x+ox2,y+oy2,z2+h*.6,w*(o.tw||.34)*sc,TT.c,.7*q,0,t*9,2,.5); } }
    else K.floor(stS,x,y,w*.9,null,0,[0,0,0],.45*a);
    const ox=(o.dx||0)*(z/z0), oy=(o.dy||0)*(z/z0); if(o.tick&&!landed) o.tick(x+ox,y+oy,z,q);
    K.bill(st,x+ox,y+oy,z+h*(.5-sink)*sc,w*.5*sc,h*.5*sc*fl,rot+(o.spin||0)*t,tint,a,landed&&o.burn?Math.max(0,1-(dur+stick-t)/(o.burn)):0,3,1,0); },o.delay||0);
  if(o.land) after((o.delay||0)+dur,()=>o.land(x,y)); };
// a column of light standing on a point of the floor
C.gBeam=(x,y,h,w,c,o={})=>{ const T=tone(c,o), st=gst(3,'add',T,o.L??2), life=o.life||.4, sd=Math.random()*9; K.add(life,k=>{ const e=Math.min(1,k*6); K.line(st,x,y,0,x,y,h*e,w*(1-k*.7),T.c,(o.a??1)*(1-k*k),k*.5,sd+k*3,2,.4); },o.delay||0); };
// fractures of light running out over the floor from an impact, cooling as they go
C.gCrack=(x,y,R,c,o={})=>{ const T=tone(c,o), st=gst(13,'add',T,0), life=o.life||1.6, sd=Math.random()*9; K.add(life,k=>{ K.floor(st,x,y,R,null,sd,T.c,(o.a??1)*(1-k)*(1-k),Math.min(1,.2+k*5),sd,o.n||13,o.w||.11); },o.delay||0); };
// a flat texture on the floor (or floating at height z): magic circles. returns the effect; set .r/.a/.rot on its state object
C.gCircle=(name,x,y,o={})=>{ const s=K.img(name), T=tone(o.c||'#ffffff',{c3:o.c3}), S_={r:o.r||300,a:o.a??1,rot:o.rot||0,z:o.z||0,er:0}, st=name.startsWith('fx2_')?gst(15,'add',T,o.L??0,{t:s.im,uv01:true}):K.st(0,'add',{t:s.im,L:o.L??0,uv01:true}); if(name==='fx2_circ_mage'){ T.c=T.c.map(v=>v*.32); T.c2=T.c2.map(v=>v*.5); }   /* this one is a filled dial: keep its plate dim so only the linework glows */ S_.fx=K.add(o.life||5,(k,t)=>{ if(o.tick) o.tick(S_,t,k); K.floor(st,x,y,S_.r,null,S_.rot,T.c,S_.a,S_.er,2,1.5,o.warp||0,S_.z); },o.delay||0); return S_; };
// a lightning stroke between two points in space: a jagged path redrawn every other frame, with forks; hard white core in a coloured sheath
C.gBolt=(x1,y1,z1,x2,y2,z2,c,o={})=>{ const T=tone(c,o), st=gst(3,'add',T,o.L??3), life=o.life||.25, w=o.w||26, len=Math.hypot(x2-x1,(y2-z2)-(y1-z1)), n=Math.max(5,Math.round(len/(o.seg||105))), jag=o.jag??.07, stO=gst(3,'add',{c2:T.c2,c3:T.c},o.L??3), sd=Math.random()*99; let key=-1, P=null, F=[];
  const build=()=>{ P=[]; F=[]; const s1=rand(0,TAU), s2=rand(0,TAU), f1=rand(1.5,3.5), f2=rand(5,9); for(let i=0;i<=n;i++){ const u=i/n, env=Math.sin(u*Math.PI), e=env*len*jag, sway=(Math.sin(u*f1*TAU+s1)*.7+Math.sin(u*f2*TAU+s2)*.3)*e*1.3; P.push([lerp(x1,x2,u)+sway+(i&&i<n?rand(-e,e)*.35:0),lerp(y1,y2,u),lerp(z1,z2,u)+(i&&i<n?rand(-e,e)*.2:0)]); }
    const nf=o.forks??2; for(let k=0;k<nf;k++){ const i=1+((Math.random()*(n-2))|0), p=P[i], a=rand(0,TAU), l=len*rand(.08,.2); F.push([p,[p[0]+Math.cos(a)*l,p[1],p[2]-Math.abs(Math.sin(a))*l*.8-l*.3]]); } };
  K.add(life,k=>{ const q=Math.floor(RT*(o.fps||18)); if(q!==key){ key=q; build(); } const a=(o.a??1)*(k<.5?1:1-(k-.5)*2)*(Math.random()<.2?.6:1), ww=w*(1-k*.5);
    for(let i=0;i<n;i++){ const p=P[i], q2=P[i+1], ex=(q2[0]-p[0])*.12, ey=(q2[1]-p[1])*.12, ez=(q2[2]-p[2])*.12; const tw=1.5-1.05*(i/n); K.line(stO,p[0]-ex,p[1]-ey,p[2]-ez,q2[0]+ex,q2[1]+ey,q2[2]+ez,ww*2.4*tw,T.c,a*.4,0,sd+i,-1.5,.25); K.line(st,p[0]-ex,p[1]-ey,p[2]-ez,q2[0]+ex,q2[1]+ey,q2[2]+ez,ww*tw,T.c,a,0,sd+i,-1.5,.25); }
    for(const f of F) K.line(st,f[0][0],f[0][1],f[0][2],f[1][0],f[1][1],f[1][2],ww*.45,T.c,a*.8,0,sd,1.5,.25); },o.delay||0); };
// a burst of drawn flame at a point: hot tongues that climb and thin into dark smoke
C.gFire=(x,y,z,s,o={})=>{ const n=Math.round((o.n||8)*QK()), c=o.c||'#ff7a1a', c3=o.c3||'#fff2b0', c2=o.c2||'#8a1400';
  for(let i=0;i<n;i++){ const a=rand(0,TAU), r=s*rand(0,.6), sp=rand(0,o.sp??s*1.2); C.gPuff(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,z+rand(0,s*.3),s*rand(.35,.7),{c,c2,c3,add:true,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(s*.6,s*2.2),life:rand(.35,o.life??.8),a:1,rise:1.6,grow:s*.4,drag:2.2}); }
  if(o.smoke!==false) for(let i=0;i<Math.ceil(n*.6);i++) after(rand(.1,.4),()=>{ const a=rand(0,TAU), r=s*rand(0,.7); C.gPuff(x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,z+s*.5,s*rand(.5,.9),{c:'#2a2026',c2:'#08060a',c3:'#55464a',vz:rand(s*.5,s*1.3),life:rand(1.1,2),a:.8,grow:s*.5}); }); };
// --- aftermath pieces: what each ultimate leaves behind is its own
// the floor either side of a cut no longer meets: one lip in shadow, the other catching light, for a few seconds
C.gSlab=(x1,y1,x2,y2,c,o={})=>{ const T=tone(c,o), life=o.life||4, stD=K.st(3,'alpha',{c2:[0,0,0],c3:[.02,.02,.03],L:0}), stE=gst(3,'add',T,0), dx=x2-x1, dy=y2-y1, l=Math.hypot(dx,dy)||1, nx=-dy/l, ny=dx/l, w=o.w||46, sd=Math.random()*9;
  K.add(life,(k,t)=>{ const up=easeOut(Math.min(1,t/.12)), a=Math.min(1,(1-k)*3), off=w*.55*up; K.line(stD,x1+nx*off,y1+ny*off,0,x2+nx*off,y2+ny*off,0,w*up,[.03,.02,.04],.8*a,0,sd,2,.5);
    K.line(stE,x1-nx*off*.3,y1-ny*off*.3,14*up,x2-nx*off*.3,y2-ny*off*.3,14*up,w*.16,T.c,a*(.35+.65*Math.max(0,1-t/1.6)),0,sd,2,.55); },o.delay||0); };
// a ring-shaped trench melted into the floor at radius R: dark channel, molten edge that cools, heat still rising
C.gTrench=(x,y,R,c,o={})=>{ const T=tone(c,o), life=o.life||5, stD=K.st(2,'alpha',{c2:[0,0,0],c3:[.03,.03,.04],L:0}), stE=gst(2,'add',T,0), sd=Math.random()*9, q=1/1.08;
  K.add(life,(k,t)=>{ const a=Math.min(1,(1-k)*3), heat=Math.max(0,1-t/(o.heat||2.4)); K.floor(stD,x,y,R*1.08,null,sd,[.03,.03,.05],.85*a,q,sd,.09,.035); K.floor(stE,x,y,R*1.08,null,sd,T.c,a*(.12+.6*heat),q,K.tq(8,sd),.018+.02*heat,.035);
    if(heat>0&&Math.random()<.5*heat){ const an=rand(0,TAU); C.gPuff(x+Math.cos(an)*R,y+Math.sin(an)*R*FSY,6,rand(40,80),{c:o.steam||'#8fa6bb',c2:'#1a2634',c3:'#d6e8f4',vz:rand(140,300),life:.9,a:.4}); } },o.delay||0); };
// a long scorched gouge where something came in at an angle: dark trough, glowing bed that cools, fire still licking along it
C.gSkid=(x,y,ang,len,c,o={})=>{ const T=tone(c,o), life=o.life||5, stD=K.st(3,'alpha',{c2:[0,0,0],c3:[.03,.02,.02],L:0}), stE=gst(3,'add',T,0), ca=Math.cos(ang), sa=Math.sin(ang)*FSY, sd=Math.random()*9, w=o.w||150;
  K.add(life,(k,t)=>{ const g=easeOut(Math.min(1,t/.18)), a=Math.min(1,(1-k)*3), heat=Math.max(0,1-t/(o.heat||3)); K.line(stD,x,y,0,x+ca*len*g,y+sa*len*g,0,w,[.04,.02,.02],.85*a,0,sd,3,.6); K.line(stE,x,y,0,x+ca*len*g,y+sa*len*g,0,w*.36,T.c,a*(.2+.8*heat),.25,sd+t*.4,4,.6);
    if(heat>.1&&Math.random()<.35*heat){ const u=rand(.05,.95); if(o.fire!==false) C.gFire(x+ca*len*u,y+sa*len*u,6,rand(50,90),{n:2,life:.6,smoke:Math.random()<.3}); } },o.delay||0); };
// --- drawn key art (assets/fx2_*.webp: three grey tones on black) recoloured per class and animated the way a drawing is:
// it pops in over two drawings, "boils" (its outline is redrawn slightly differently every other frame), and burns away through noise
C.ART={}; C.art=n=>C.ART[n]||(C.ART[n]=K.img(n));
['fx2_burst','fx2_slash','fx2_fire','fx2_bolt','fx2_smoke','fx2_shock','fx2_tornado','fx2_cloud','fx2_deity','fx2_palm','fx2_meteor','fx2_gsword','fx2_monolith','fx2_dragonhead','fx2_dragonbody','fx2_imp_sword','fx2_imp_mage','fx2_imp_fist','fx2_imp_shaman','fx2_imp_pyro','fx2_circ_sword','fx2_circ_mage','fx2_circ_fist','fx2_circ_shaman','fx2_circ_pyro'].forEach(C.art);
['fx3_burst','fx3_fire','fx3_tornado','fx3_bolt','fx3_smoke','fx3_shock','fx3_slash','fx3_beam'].forEach(C.art);   /* detailed painted versions; until one has loaded its procedural fallback is used */
// what a class's ultimate leaves in the floor: its own drawing, in stone colours with the class light in the cracks; cools and fades over a few seconds
const IMP={sword:['fx2_imp_sword',1.01],mage:['fx2_imp_mage',1],fist:['fx2_imp_fist',.8],shaman:['fx2_imp_shaman',1],pyro:['fx2_imp_pyro',.7]};
C.gImpact=(cls,x,y,w,o={})=>{ const c=o.c3||'#ffffff'; if(cls==='fist') C.scar({kind:'crater',x,y,r:w*.95,c,life:10,heat:4.2}); else if(cls==='shaman') C.scar({kind:'seal',x,y,r:w*.78,c,life:10,heat:4}); else if(cls==='pyro'){ C.scar({kind:'swirl',x,y,r:w*.75,c:'#ff6a1a',life:10,heat:4.5}); C.scar({kind:'burn',x,y,r:w*.55,c:'#ff6a1a',life:10,heat:4}); } else { C.scar({x,y,r:w*.92,c,life:10,heat:cls==='mage'?4.4:3.4}); if(cls==='mage') C.scar({kind:'burn',x,y,r:w*.66,c,life:10,heat:4}); } };
// o: {floor (lie on the floor) | z, w, h (half sizes; h defaults to w), rot, life, hold (fraction of life before it starts to burn away), grow, boil, add, L, delay, flipX}
C.gArt=(name,x,y,c,o={})=>{ const s=C.art(name), T=tone(c,o), st=gst(15,o.add?'add':'alpha',T,o.L??2,{t:s.im,uv01:true}), life=o.life||.5, hold=o.hold??.35, w=o.w||300, h=o.h||w, sd=Math.random()*9, boil=o.boil??.012, fx_=o.flipX?-1:1;
  return K.add(life,(k,t)=>{ if(!s.ok) return; const pop=t<.05?.72:t<.1?.92:1, g=pop*(1+(o.grow||0)*(o.ease?easeOut(k):k)), er=k<hold?0:(k-hold)/(1-hold), ph=K.tq(o.fps||12,sd), P=o.at?o.at(k,t):null, px=P?P[0]:x, py=P?P[1]:y, pz=P?P[2]:(o.z||0);
    if(o.floor) K.floor(st,px,py,w*g*fx_,h*g,o.rot||0,T.c,o.a??1,er,ph,2.2,boil,pz); else K.bill(st,px,py,pz,w*g*fx_,h*g,o.rot||0,T.c,o.a??1,er,ph,2.2,boil); },o.delay||0); };
// drawn art, one call per frame (for things that are redrawn every frame at a moving place)
const ARTST={};
C.artNow=(name,x,y,z,w,h,c,o={})=>{ const s=C.art(name); if(!s.ok) return false; const T=tone(c,o), key=name+c+(o.add?1:0)+(o.L??2)+(o.c2||'')+(o.c3||''), st=ARTST[key]||(ARTST[key]=gst(15,o.add?'add':'alpha',T,o.L??2,{t:s.im,uv01:true}));
  K.bill(st,x,y,z,w,h,o.rot||0,T.c,o.a??1,o.er||0,o.ph??K.tq(12,0),2.2,o.boil??.012); return true; };
// where the drawings exist they replace the procedural shapes for anything large enough to be looked at
{ const star0=C.gStar, ring0=C.gRing, fire0=C.gFire, puff0=C.gPuff, bolt0=C.gBolt;
  C.gStar=(x,y,z,s,c,o={})=>{ if(s<240||!C.art('fx3_burst').ok) return star0(x,y,z,s,c,o);
    C.gArt('fx3_burst',x,y,c,{add:true,a:.62,c2:o.c2,c3:o.c3||c,z:z+s*.25,w:s*1.15,h:s*1.05,life:Math.max(.5,(o.life||.2)*1.7),hold:.3,rot:rand(-.5,.5),grow:.3,ease:true,flipX:Math.random()<.5,L:o.L??3,delay:o.delay}); };
  C.gRing=(x,y,R,c,o={})=>{ if(o.inward||R<600||!C.art('fx3_shock').ok) return ring0(x,y,R,c,o);
    C.gArt('fx3_shock',x,y,c,{add:true,c2:o.c2,c3:o.c3||c,floor:true,w:R*.28,grow:2.9,ease:true,life:(o.life||.5)*1.2,hold:.5,rot:rand(0,TAU),a:o.a??1,L:0,delay:o.delay,z:o.z||0,boil:.008}); };
  C.gFire=(x,y,z,s,o={})=>{ if(!C.art('fx3_fire').ok) return fire0(x,y,z,s,o); const n=Math.max(1,Math.round((o.n||8)/3*QK())), c=o.c||'#ff7a1a';
    for(let i=0;i<n;i++){ const a=rand(0,TAU), r=n>1?s*rand(.1,.7):0, h=s*rand(1.1,1.7); C.gArt('fx3_fire',x+Math.cos(a)*r,y+Math.sin(a)*r*FSY,c,{c2:o.c2||'#8a1400',c3:o.c3||'#fff2b0',add:true,z:z+h*.92,w:h*.62,h,life:rand(.4,o.life??.8),hold:.35,flipX:Math.random()<.5,grow:.25,boil:.02,delay:rand(0,.1),L:2}); }
    if(o.smoke!==false) after(.15,()=>C.gPuff(x,y,z+s*.6,Math.max(110,s*.9),{c:'#2a2026',c2:'#08060a',c3:'#55464a',vz:rand(s*.5,s*1.2),life:rand(1.1,1.9),a:.8})); };
  C.gPuff=(x,y,z,s,o={})=>{ if(s<120||o.add||!C.art('fx3_smoke').ok) return puff0(x,y,z,s,o); const life=o.life||rand(.8,1.4), vx=o.vx||0, vy=o.vy||0, vz=o.vz??rand(60,160), d=o.drag??1.6, mv=t=>(1-Math.exp(-d*t))/d;
    C.gArt('fx3_smoke',x,y,o.c||'#3a3446',{c2:o.c2||'#0c0a12',c3:o.c3||'#7a7488',w:s*1.25,h:s*1.1,life,hold:.45,grow:.6,boil:.015,a:o.a??.9,flipX:Math.random()<.5,L:o.L??1,at:(k,t)=>[x+vx*mv(t),y+vy*mv(t),z+s*.6+vz*mv(t)]}); };
  C.gBolt=(x1,y1,z1,x2,y2,z2,c,o={})=>{ const dz=z1-z2; if(dz<1500||!C.art('fx3_bolt').ok) return bolt0(x1,y1,z1,x2,y2,z2,c,o);
    const len=Math.hypot(x1-x2,dz-(y1-y2)), hh=len/2, rot=Math.atan2(x1-x2,dz-(y1-y2)), w=hh*.52*clamp((o.w||26)/26,.7,1.7), life=o.life||.25, fl=Math.random()<.5;
    for(let q=0;q<2;q++) C.gArt('fx3_bolt',(x1+x2)/2,(y1+y2)/2,c,{c2:o.c2,c3:o.c3||'#ffffff',add:true,z:(z1+z2)/2,w,h:hh,rot,life:q?life*.7:life,hold:.5,flipX:q?!fl:fl,boil:.01,fps:18,L:o.L??3,delay:(o.delay||0)+q*life*.55,a:q?.8:1}); };
}
// ---------------------------------------------------------------- per-frame
C.step=rdt=>{ C.t+=rdt; GFX.step(rdt);
  if(C.mv){ const m=C.mv; m.t+=rdt; const k=m.ez(Math.min(1,m.t/m.dur)), T=m.to, F0=m.fr;
    if(T.home||T.x!=null||T.y!=null){ V.camT={x:lerp(F0.x,T.home?pl.x:(T.x??F0.x),k),y:lerp(F0.y,T.home?pl.gy-BODY*.6:(T.y??F0.y),k)}; V.camK=45; }
    if(T.zoom!=null) V.zk=lerp(F0.zoom,T.zoom,k);
    if(T.tilt!=null){ post.tiltT=post.tilt=lerp(F0.tilt,LOW()?T.tilt*.5:T.tilt,k); post.tiltK=4; }
    if(T.roll!=null) cam.rollT=cam.roll=lerp(F0.roll,LOW()?T.roll*.3:T.roll,k);
    if(m.t>=m.dur){ if(T.home){ V.camT=null; V.camK=0; } C.mv=null; } }
  if(C.zkT!=null){ V.zk=lerp(V.zk||1,C.zkT,1-Math.exp(-rdt*(C.zkK||6))); if(Math.abs(V.zk-C.zkT)<.012){ V.zk=C.zkT; C.zkT=null; } }
  if(C.pk){ const p=C.pk; p.t+=rdt; const u=(p.t-p.hold)/p.out, e=u<=0?1:u>=1?0:(1-u)*(1-u);
    if(e<=0){ C.pk=null; post.caMax=C.on?.012:0; post.tint=null; }
    else { post.caMax=Math.max(C.on?.012:.0018,p.ca); post.ca=Math.max(post.ca,p.ca*e); post.blur=Math.max(post.blur,p.blur*e); if(p.x!=null){ const [sx,sy]=w2s(p.x,p.y); post.bc=[sx/W,1-sy/H]; } post.tint=p.tint?[p.tint[0],p.tint[1],p.tint[2],p.ta*e]:null; } }
  if(C.hs){ const h=C.hs; h.t+=rdt; if(h.t>=h.dur){ if(GFX.ambT===h.ref) GFX.ambient(h.back[0],h.back[1],h.back[2],h.k); C.hs=null; } }
  post.tilt=(post.tilt||0)+((post.tiltT||0)-(post.tilt||0))*(1-Math.exp(-rdt*(post.tiltK||4))); V.hsc=lerp(V.hsc||1,C.hscT||1,1-Math.exp(-rdt*5)); if(LOW()){ trauma=Math.min(trauma,.4); post.flash=Math.min(post.flash,.12); } C.dark=lerp(C.dark,C.darkT,1-Math.exp(-rdt*(C.darkT>C.dark?6:3.2)));
  if(C.veilHold>0) C.veilHold-=rdt; else C.veil*=Math.exp(-rdt*7);
  C.flashCap=Math.max(.22,C.flashCap-rdt*2.2);
  if(C.cut){ C.cut.t+=rdt; if(C.cut.t>=C.cut.dur) C.cut=null; }
  if(C.lines){ C.lines.t+=rdt; if(C.lines.t>=C.lines.dur) C.lines=null; }
  if(C.st){ C.st.t+=rdt; if(C.st.t>=C.st.dur) C.st=null; }
  if(C.imp){ const m=C.imp; m.t+=rdt; const i=Math.min(m.n-1,Math.floor(m.t/m.fd)), [a,b]=m.pal[i];
    if(m.soft&&m.t<m.n*m.fd){ }
    else if(m.t>=m.n*m.fd){ if(m.amb) GFX.amb=m.amb; C.imp=null; post.invT=0; post.inv=0; SND.hit(m.v); C.shake(1.3*m.v); C.flash(m.flash??.42); post.ca=.012; post.blur=LOW()?0:(m.blur??.09); if(m.then) m.then(); }
    else { post.inkA=a; post.inkB=b; post.invT=Math.max(post.invT,.03); post.inv=1; } }
  for(let i=C.scars.length-1;i>=0;i--){ const s=C.scars[i]; s.t+=rdt; if(s.t>=s.life) C.scars.splice(i,1); }
  if(C.ashT>0){ C.ashT-=rdt; for(const p of C.ash){ p.y+=(C.ashUp?-1:1)*p.v*rdt; if(p.y>1.05) p.y=-.05; if(p.y<-.06) p.y=1.04; } if(C.ashT<=0) C.ash.length=0; } };
// floor layer: scars (under the enemies)
C.drawFloor=drawScars;
// after the enemies: the darkness that the effects and the hero stand out against
C.drawWorld=()=>{ if(C.dark<.01) return; const {hw,hh}=view(), m=1.4, x0=cam.x-hw*m, y0=cam.y-hh*m, a=C.dark;
  if(C.spot){ const s=C.spot, g=ctx.createRadialGradient(s.x,s.y,s.r*.15,s.x,s.y,s.r); g.addColorStop(0,`rgba(${C.dc},${a*(s.a??.15)})`); g.addColorStop(1,`rgba(${C.dc},${a})`); ctx.fillStyle=g; }
  else ctx.fillStyle=`rgba(${C.dc},${a})`;
  ctx.fillRect(x0,y0,hw*2*m,hh*2*m);
  const rc=X.CH().acc, L=V.sorted||[]; for(let i=0;i<L.length&&i<160;i++){ const e=L[i]; glow(fx,e.x,e.y-e.h*.55,e.h*.5,rc,.2*a+e.flash*.5); } };
// over everything, in screen space
C.drawTop=()=>{ const g=tctx; drawStorm(g); drawAsh(g); drawLines(g);
  if(C.veil>.005){ g.save(); g.setTransform(1,0,0,1,0,0); const [vx,vy]=C.veilP?w2s(C.veilP[0],C.veilP[1]):[W/2,H/2], a=Math.min(1,C.veil), vg=g.createRadialGradient(vx,vy,0,vx,vy,Math.max(W,H)*.75);
    vg.addColorStop(0,`rgba(${C.veilC},${a})`); vg.addColorStop(.45,`rgba(${C.veilC},${a*.35})`); vg.addColorStop(1,`rgba(${C.veilC},0)`); g.globalCompositeOperation='lighter'; g.fillStyle=vg; g.fillRect(0,0,W,H); g.restore(); }
  drawImp(g); drawCut(g);
  // the letterbox goes over the overlays too, so the bars stay one flat black
  if(ov.lb>.01){ const b=H*(window.LBK??.11)*ov.lb; g.save(); g.setTransform(1,0,0,1,0,0); g.fillStyle='#000'; g.fillRect(0,0,W,b); g.fillRect(0,H-b,W,b); g.restore(); } };

// hooks into the frame
const upd=update; update=function(rdt){ upd(rdt); if(G.mode==='surv'&&!G.paused) C.step(rdt); };
const dp=drawParts; drawParts=function(L){ dp(L); if(L===4&&G.mode==='surv') C.drawTop(); };
})();
