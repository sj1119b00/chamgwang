// 참광 survival - SWORDSMAN skill set (top-down, all automatic). Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const SV=()=>RPG.api.SV, G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, mix=(a,b,k)=>a+(b-a)*k, {V,A,SK,BODY,nearest,countIn,angTo,face,seq,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,ultStart,ultStop,ultHit,burst,fring}=X;

// ============================================================ skills (redev 2026-11-24). Ordinary skills follow one grammar: ONE shape each
// (band / stem / upright crescent / flying crescent / spiral / orbiting blades / fireball / bundle of stems / X), the effect sits on the enemy
// that was hit (brand, cut, knock), .3-1 s, no screen effects. Crimson is the sword's colour, white only in the core of a line; gold belongs
// to the finishing blows. The basic chain leaves its band on the path of the blade.
const SCR={d:'#2a0006',b:'#f0101e',m:'#ff4258',h:'#ffe2e0',l:'#ff2a3a',s:'#ff9aa0'}, SWH={d:'#5a0010',b:'#ff6a6a',m:'#ffe0d8',h:'#ffffff',l:'#ff8a8a',s:'#ffffff'},
  SGD={d:'#3a1400',b:'#ff9a10',m:'#ffe27a',h:'#fffbe8',l:'#ffc040',s:'#ffe9a0'}, SGW={d:'#5a2a00',b:'#ffd060',m:'#fff2c0',h:'#ffffff',l:'#ffe090',s:'#ffffff'},
  SST={d:'#2a2010',b:'#cfd8ea',m:'#f4f7ff',h:'#ffffff',l:'#eef2ff',s:'#ffffff'}, SFR={d:'#2a0204',b:'#e8201c',m:'#ff9a3a',h:'#fff0d0',l:'#ff4a20',s:'#ffb080'};
const mkOn=()=>!!(window.MK&&MK.on());
// Optional Sonniss layers, local only. Keep the original game audio intact.
const swordFoley=(()=>{
  const gains={sonniss_long_blade:.18,sonniss_steel:.20,sonniss_debris:.21};
  const clips=new Map(), live=new Set(); let started=false;
  function prepare(){
    if(started) return; started=true;
    const Decoder=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    if(!Decoder) return;
    let decoder; try{ decoder=new Decoder(1,1,48000); }catch(_){ return; }
    for(const id of Object.keys(gains)) fetch(`sword-audio/sonniss-local/${id}.mp3`).then(r=>{
      if(!r.ok||!r.headers.get('content-type')?.startsWith('audio/')) return null;
      return r.arrayBuffer().then(b=>decoder.decodeAudioData(b));
    }).then(b=>{ if(b) clips.set(id,b); }).catch(()=>{});
  }
  if(G.mode==='surv'&&pl.cls==='sword') prepare();
  window.addEventListener('pointerdown',()=>{ if(pl.cls==='sword') prepare(); },{passive:true});
  return id=>{
    if(window.SwordPreview||G.mode!=='surv'||pl.cls!=='sword'||G.paused||V.over) return;
    prepare(); const clip=clips.get(id);
    if(!clip||!AC||AC.state!=='running'||live.size>=4) return;
    const source=AC.createBufferSource(), gain=AC.createGain(); source.buffer=clip; gain.gain.value=gains[id];
    source.connect(gain); toOut(gain,0); live.add(source);
    source.onended=()=>{ live.delete(source); source.disconnect(); gain.disconnect(); };
    source.start();
  };
})();
// AIM: the game by itself only fires a skill that is off cooldown, and then it needs somebody in reach (no target -> null, the cast is refused).
// A cast made while the cooldown is still running was asked for from outside (practice room, capture): it is swung anyway, at the nearest
// enemy on the field or simply the way he faces, so the shape of the skill can always be seen
const forced=id=>(id?(V.cd[id]||0):V.bcd)>0;
const aim=(id,R)=>{ const e=nearest(R); if(e) return angTo(e); if(!forced(id)) return null; const f=nearest(2600); return f?angTo(f):(pl.f>0?0:Math.PI); };
// BLOW: the body is thrown first and hurt a moment later, so it is seen leaving the ground before a killing hit removes it
function blow(e,d,o={},lag=.14){ const {push,up,dir,from,...r}=o, fr=from||[pl.x,pl.gy]; K3.knock(e,{dist:push||0,up:up||0,stun:o.stun,...(dir!=null?{dir}:{from:fr})}); after(lag,()=>hurt(e,d,{fl:500+(push||0)*1.6,flUp:500+(up||0)*.35,...r,dir,from:fr})); }
// the brand a cut leaves on a body until it is set off: a small red cut-star on the chest, a thin ring at the feet
const BR=(dur,max=1)=>({dur,max,pal:SCR,s:.46,tex:'v3_xburst'});
// width along a band (0 tail .. 1 head): a ribbon that swells in the middle, and a needle that is widest just behind its point
const tpBand=u=>Math.pow(Math.sin(Math.PI*Math.min(1,u*1.02)),.5), tpNeedle=u=>u<.74?.2+.8*Math.pow(u/.74,1.4):Math.sqrt(Math.max(0,1-Math.pow((u-.74)/.26,2)));
const ln=(x0,y0,x1,y1,z)=>u=>[mix(x0,x1,u),mix(y0,y1,u),z];
// STRIP: a band of light on a path (path(u,t) -> [x,y,z], u 0..1): the head runs it once in `draw`, it holds its whole length, then it burns
// away from the tail toward the head. Colour body + a white core. Nothing about it is random per frame
function strip(path,o={}){ if(!FX3.on) return; const C=pc(o.pal||SCR), CW=pc(o.core||SWH), tr=K3.mats(), n=o.n||12, draw=o.draw??.06, hold=o.hold??.06, fade=o.fade??.2, w=o.w||40, sd=rand(0,9), g=o.gain||1, tp=o.tp||tpBand, cw=o.cw??.4;
  GFX.add(draw+hold+fade,(k,t)=>{ const f=sat((t-draw-hold)/fade), h0=Math.max(.05,eo3(sat(t/draw))), hd=o.rev?h0*(1-f*f*.97):h0, tl=o.rev?0:hd*f*f*(o.eat??.85), ps=[];
    for(let i=0;i<n;i++){ const u=mix(tl,hd,i/(n-1)), p=path(u,t); ps.push({x:p[0],y:p[1],z:p[2]||0,w:w*tp(u)*sat((u-tl)/.1+.12)*(1-.3*f)}); }
    FX3.ribbon(tr.trB,ps,{...C,gain:3*g,a:1-f*f,ero:.1+f*.55,t0:sd}); for(const p of ps) p.w*=cw; FX3.ribbon(tr.trC,ps,{...CW,gain:5*g,a:1-f,ero:.16+f*.55,t0:sd}); },o.delay||0); }
// ---- edge bands (third pass): the light is laid on the path the edge of the blade sweeps, as samples [inner xyz, outer xyz] measured from an anchor
const arcS=(n,fn)=>{ const S=[]; for(let i=0;i<n;i++) S.push(fn(i/(n-1))); return S; };
// read the samples at u, carried to a moving anchor (he may walk while he cuts; a wave flies)
const atS=(S,an)=>u=>{ const q=sat(u)*(S.length-1), i=Math.min(S.length-2,Math.floor(q)), k=q-i, a=S[i], b=S[i+1], p=an(); return [p[0]+mix(a[0],b[0],k),p[1]+mix(a[1],b[1],k),mix(a[2],b[2],k),p[0]+mix(a[3],b[3],k),p[1]+mix(a[4],b[4],k),mix(a[5],b[5],k)]; };
const onHero=()=>[pl.x,pl.gy];
// the body of an edge band: colour that is strongest at the cutting side and feathers away behind it (k 1: that side is v=1, k 4: v=0)
const bandM=k=>lm('band'+k,()=>FX3.mat({nz:'streak',n1:[1,.8,-2.2,0],n2:[2,1,-1,0],dist:.05,nk:.5,ero:.08,soft:.22,pm:[k,1.25,.1,0],fd:[.4,.03,0,0],rk:[.4,.85],gain:3.4,bgain:1.2}));
// EDGE: the light a moving edge leaves. fn(u,t) -> [inner xyz, outer xyz] of the edge at u (0 where it began .. 1 where it is now). A body of colour
// fills the space it swept, brightest toward the outer side, and a white rim runs along the outer ends: the rim is the cutting edge. It is drawn once,
// holds, then is eaten from where it began until nothing is left (no piece stays hanging). The band is pointed at both ends (tp)
function edge(fn,o={}){ if(!FX3.on) return null; const C=pc(o.pal||SCR), CW=pc(o.core||SWH), tr=K3.mats(), n=o.n||14, draw=o.draw??.08, hold=o.hold??.06, fade=o.fade??.2, sd=rand(0,9), g=o.gain||1, tp=o.tp||tpBand, rim=o.rim??.2;
  return GFX.add(draw+hold+fade,(k,t)=>{ const hd=Math.max(.08,o.lin?sat(t/draw):eo3(sat(t/draw))), f=sat((t-draw-hold)/fade), tl=hd*f*f*(3-2*f), sh=1-f*f*f, ps=[], rs=[]; let cr=0;
    for(let i=0;i<n;i++){ const u=mix(tl,hd,i/(n-1)), e=fn(u,t), w=tp(u)*sat((u-tl)/.12+.1)*sh, ix=mix(e[3],e[0],w), iy=mix(e[4],e[1],w), iz=Math.max(6,mix(e[5],e[2],w)), oz=Math.max(6,e[5]), hw=.5*Math.hypot(e[3]-ix,(e[4]-oz)-(iy-iz));
      ps.push({x:(ix+e[3])/2,y:(iy+e[4])/2,z:(iz+oz)/2,w:hw,qx:e[3]-ix,qy:(e[4]-oz)-(iy-iz)}); rs.push({x:e[3],y:e[4],z:oz,w:Math.max(3,hw*rim)}); }
    for(let i=1;i<n;i++){ const a=ps[i-1], b=ps[i]; cr+=(b.x-a.x)*b.qy-((b.y-b.z)-(a.y-a.z))*b.qx; }
    const gg=g*(o.gf?o.gf(t):1); FX3.ribbon(bandM(cr>=0?1:4),ps,{...C,gain:3.2*gg,a:1-f*f*.5,ero:.08+f*.45,t0:sd}); FX3.ribbon(tr.trC,rs,{...CW,gain:5.5*gg,a:1,ero:.16+f*.4,t0:sd}); },o.delay||0); }
// a body that a blow has killed does not stand and fade: it is thrown along the blow, turning (dir is a true-floor angle)
function fling(e,dir,sp=900,up=700){ const q=V.dying[V.dying.length-1]; if(!q||q.vx!=null||q.e.x!==e.x||q.e.y!==e.y) return; const k=e.d.heavy?.4:1; q.e.y-=e.z||0; q.vx=Math.cos(dir)*sp*k*rand(.8,1.2); q.vy=Math.sin(dir)*sp*k*FSY; q.vz=up*rand(.8,1.2); q.spin=rand(5,10)*(Math.cos(dir)>=0?1:-1); q.life=.62; }
// HURT: damage whose kill is seen: the body leaves along `dir` (or away from `from`)
function hurt(e,d,o={}){ const {dir,from,fl,flUp,...r}=o; if(e.dead) return; dmg(e,d,{kb:0,...r}); if(e.dead){ const f=from||[pl.x,pl.gy]; fling(e,dir!=null?dir:Math.atan2((e.y-f[1])/FSY,e.x-f[0]),fl??900,flUp??700); } }
// sparks thrown along the swing: long streaks leaving the arc on its tangent (dir is a true-floor angle, sg the sense of the swing)
function swingSparks(x,y,z,r,dir,sg,P,n,half=1){ for(let i=0;i<n;i++){ const b=dir+sg*rand(-half,half*.8), c=Math.cos(b), s=Math.sin(b), sp=rand(700,1700), ou=rand(100,520), hot=Math.random()<.4;
    GFX.pt({x:x+c*r,y:y+s*r*FSY,z:z+rand(-30,30),vx:-s*sg*sp+c*ou,vy:(c*sg*sp+s*ou)*FSY,vz:rand(-60,260),g:700,drag:2.2,life:rand(.14,.32),s:rand(2.5,4.5),m:3,len:.06,c:GFX.rgb(hot?'#ffffff':P.s),c3:hot?'#ffffff':P.h,c2:P.b,L:3}); } }
// the cut left across a body: a short white-cored stroke through the enemy, square to the blow (a is the screen angle of the blow)
function cutFlash(e,a,P=SCR,len=120){ const px=-Math.sin(a), py=Math.cos(a), z=e.z+e.h*.5; strip(ln(e.x-px*len,e.y-py*len*.8,e.x+px*len,e.y+py*len*.8,z),{pal:P,w:30,draw:.04,hold:.05,fade:.16,n:8}); }
// three thin lines going up from under an enemy that has been thrown into the air
function riseLines(e,P=SCR){ const H=e.h+300; for(let i=0;i<3;i++){ const x=e.x+(i-1)*46, y=e.y+(i===1?8:-6); strip(u=>[x,y,mix(6,H*(i===1?1:.78),u)],{pal:P,w:15,draw:.1,hold:.06,fade:.22,n:7,delay:i*.035,tp:tpNeedle}); } }

const SKILL={
  // DASH: one straight stem through everything on his line. Whoever it passed carries a brand for a beat, then the brand opens and throws it aside
  sw_dash:{moves:true,range:560,fn(id){ const e=nearest(560), a=aim(id,560); if(a==null) return false; const L=e?Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+140):440, d=SK[id].dmg*A.mul(id);
    const x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L, dx=Math.cos(a), dy=Math.sin(a), z=BODY*.5, dir=fa(a); face(a); seq('gs',['05','07','09']); if(mkOn()) MK.play('cutA',{yaw:dir,blend:.05});
    V.dash={x0,y0,x1,y1,t:0,dur:.1}; G.inv=Math.max(G.inv,.35);
    if(mkOn()) for(const t of [.02,.05,.08]) after(t,()=>MK.ghost({life:.32,a:.7,c:'#ff3048'}));
    // the stem is exactly his path (it ends a little past where he stops), and the floor under it keeps the line for a second and a half
    strip(ln(x0-dx*40,y0-dy*40,x1+dx*150,y1+dy*150,z),{pal:SCR,w:150,tp:tpNeedle,draw:.07,hold:.13,fade:.24,n:16,cw:.36,eat:1});
    K3.coolLine(x0+dx*40,y0+dy*40,x1+dx*60,y1+dy*60,{w:36,pal:SCR,life:1.5,hot:.75,grow:.08,shed:0});
    GFX.light(mix(x0,x1,.6),mix(y0,y1,.6),L*1.1,SCR.l,1,.35,{z:80});
    after(.09,()=>{ K3.sparks(x1+dx*150,y1+dy*150,z,{pal:SCR,n:14,dir,spread:.3,sp:[600,1700],up:200,life:[.12,.3]}); K3.dust(x1,y1,{n:5,dir,spread:.8,sp:[150,420],a:.35}); trauma=Math.min(1,trauma+.2); });
    sfx('whoosh',1.3,.7); sfx('slash',1.15,1);
    after(.07,()=>{ const hit=[]; inLine(x0,y0,x1,y1,80,e=>{ hit.push(e); K3.mark(e,'brand',BR(.6)); hitFx(e,'#ff6a85',1); e.stun=Math.max(e.stun,.3); });
      after(.12,()=>{ let k=0, any=false; for(const e of hit){ if(e.dead) continue; any=true; const sd=((e.x-x0)*-dy+(e.y-y0)*dx)>=0?1:-1, m=K3.marked(e,'brand'); if(m) m.end(); if(k++<3) K3.ehit(e,{pal:SCR,pw:1,ring:0,light:0,dir:dir+sd*Math.PI/2}); else hitFx(e,'#ff6a85',1.1); cutFlash(e,a,SCR,120);
          blow(e,d,{dir:dir+sd*1.1,push:320,up:800,crit:false},.16); } if(any) hitstop=Math.max(hitstop,.04); }); }); }},
  // RISING CUT: one upright crescent, twice his height. What it catches goes up with thin lines climbing under it and a brand on it while it hangs
  sw_rise:{range:380,fn(id){ const a=aim(id,380); if(a==null) return false; const d=SK[id].dmg*A.mul(id), dx=Math.cos(a), dy=Math.sin(a), cx=pl.x+dx*190, cy=pl.gy+dy*190, f=pl.f=dx>=0?1:-1;
    seq('gt',['03','06','08'],{w:.05}); if(mkOn()) MK.play('cutB',{yaw:fa(a),blend:.05});
    // the band climbs with the blade: from low in front of him, up past his head, and it ends on the raised sword. It is eaten from the floor upward
    // (when he aims up or down the screen the plane of the cut is turned to face the camera, or it would be seen edge on)
    { const R=430, T=230, zc=BODY*.5, kk=Math.pow(Math.abs(dy),1.5), S=arcS(16,u=>{ const ph=mix(-.28,1.32,u), c=Math.cos(ph), sn=Math.sin(ph), pt=q=>{ const fw=(1-kk)*(60+q*c)+kk*190; return [dx*fw+f*kk*.8*(q*c-R*.55),dy*fw,zc+q*sn]; }; return [...pt(R-T),...pt(R)]; });
      edge(atS(S,onHero),{pal:SCR,draw:.09,lin:1,hold:.12,fade:.26,n:18,rim:.2,gain:1.15,tp:u=>Math.pow(Math.sin(Math.PI*Math.min(1,.12+u*.88)),.6)}); }
    GFX.light(cx,cy,560,SCR.l,1,.35,{z:240}); K3.dust(cx,cy,{n:5,r:40,sp:[150,420],a:.35}); K3.sparks(cx,cy,30,{pal:SCR,n:10,sp:[100,400],up:1700,life:[.25,.55]});
    hitstop=Math.max(hitstop,.04); trauma=Math.min(1,trauma+.22); sfx('whoosh',1.2,.7); sfx('slash',1.1,.9);
    after(.04,()=>{ let k=0; inCircle(cx,cy,230,e=>{ if(k++<5){ riseLines(e); K3.mark(e,'brand',BR(.95)); } hitFx(e,'#ff9aa8',1.1); blow(e,d,{push:60,up:1800,stun:.9,flUp:1500,fl:260},.36); }); }); }},
  // WAVE: one tall crescent thrown off the blade. It flies edge first, leaning, with a wake behind its middle; what it goes through is cut across and carried along its path
  sw_wave:{range:820,fn(id){ const a0=aim(id,820); if(a0==null) return false; const lv=A.sLv(id), tier=lv>=5?2:lv>=3?1:0, d=SK[id].dmg*A.mul(id)*[1,1.3,1.6][tier], R=[250,300,350][tier], dir=fa(a0), cs=Math.cos(a0), sn=Math.sin(a0); face(a0);
    seq('gs',['05','07','09']); if(mkOn()) MK.play('cutA',{yaw:dir,blend:.05}); sfx('whoosh',1.3,.8); sfx('slash',.9,1.1); trauma=Math.min(1,trauma+.15); let k=0;
    const p={x:pl.x+cs*110,y:pl.gy+sn*110,vx:cs*1250,vy:sn*1250,life:.5,d:0,kb:0,r:R*.62,hits:new Set(),
      onHit:e=>{ blow(e,d,{dir,push:340,up:500},.14); if(k<5) cutFlash(e,a0,SCR,130); if(k++<2) K3.ehit(e,{pal:SCR,pw:.9,ring:0,light:0,dir}); else K3.sparks(e.x,e.y,e.z+e.h*.5,{pal:SCR,n:5,dir,spread:.3,sp:[500,1500],up:200,life:[.12,.3]}); if(k===1) hitstop=Math.max(hitstop,.03); }};
    V.pj.push(p); flyCres(p,a0,{R,life:.5}); }},
  // WHIRL: the path of the point of the blade - an open spiral of two turns that widens round him, crimson from first to last, its outer edge white. On the
  // fourth beat the whole band flares white-hot and swells once, and everyone inside it is thrown outward. It is eaten from its inner end outward
  sw_spin:{range:340,fn(id){ if(countIn(360)<3&&!nearest(240)&&!forced(id)) return false; const d=SK[id].dmg*A.mul(id);
    plSeq([['gu04',.04],['gu06',.06,{tr:1,kick:[2.6,-2.4]}],['gu07',.08,{tr:1}],['gu06',.06,{tr:1}],['gu07',.08,{tr:1}],['gu08',.12],['gu12',.06]]);
    const a0=rand(0,TAU), TG=.39, pu=t=>t>=TG?Math.exp(-(t-TG)*9):0;
    edge((u,t)=>{ const th=a0+u*Math.PI*4, r=mix(200,470,Math.pow(u,.9)), hb=92*(.6+.4*u)*(1+.3*pu(t)), c=Math.cos(th), s=Math.sin(th)*FSY, z=mix(BODY*.2,BODY*1.05,u); return [pl.x+c*(r-hb),pl.gy+s*(r-hb),z,pl.x+c*(r+hb),pl.gy+s*(r+hb),z]; },
      {pal:SCR,core:SWH,draw:.44,hold:.06,fade:.3,n:46,rim:.17,tp:u=>1,gf:t=>1+.9*pu(t)});
    for(let i=0;i<4;i++) after(i*.13,()=>{ const last=i===3;
      GFX.light(pl.x,pl.gy,last?950:720,last?'#ff8a8a':SCR.l,last?1.15:.85,last?.4:.22,{z:90}); swingSparks(pl.x,pl.gy,BODY*.5,mix(200,400,(i+1)/4),a0+i*1.6,1,last?SWH:SCR,last?16:6,3.1);
      if(last){ hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.35); }
      sfx('whoosh',1.3,.8); sfx('slash',1.2,.9); let k=0;
      X.inCircleS(pl.x,pl.gy,360,e=>{ const out=Math.atan2((e.y-pl.gy)/FSY,e.x-pl.x);
        if(last){ if(k++<4) K3.ehit(e,{pal:SCR,pw:1.2,ring:0,dir:out}); else hitFx(e,'#ff9aa8',1.1); blow(e,d*.5,{dir:out,push:380,up:900,big:true},.16); }
        else { hitFx(e,'#ff6a85',1); if(k++<4) cutFlash(e,Math.atan2(e.y-pl.gy,e.x-pl.x)+Math.PI/2,SCR,100); hurt(e,d*.5,{dir:out+1.2,push:60,fl:800}); } }); }); }},
  // FLYING SWORDS: gold blades of lit metal are round him the moment he calls them, point first, each with a bright ribbon behind it. Whatever one grazes is
  // run through by a short gold line and knocked along the blade's travel
  sw_fly:{range:620,fn(id){ if(V.orbs.length||(!nearest(620)&&!forced(id))) return false; const n=3+Math.floor((A.sLv(id)-1)/2), d=SK[id].dmg*A.mul(id)*.35;
    plSeq([['gs04',.06],['gs06',.06,{kick:[1.6,-1.2]}],['gs08',.14],['gs12',.06]]); if(mkOn()) MK.play('raise',{yaw:pl.f>0?0:Math.PI}); sfx('rise',.4,.3); sfx('slash',1.4,.5);
    GFX.light(pl.x,pl.gy,680,'#ffc040',1,.4,{z:260}); K3.flare(pl.x,pl.gy,BODY*.7,{pal:SGW,s:150,dur:.12,gain:3.2}); K3.sparks(pl.x,pl.gy,BODY*.6,{pal:SGD,n:14,sp:[300,1000],up:300,life:[.2,.45]});
    for(let i=0;i<n;i++){ const o={a:i/n*TAU,t:0,life:5,d,R:380,c:'#ffcf4a',v:{x:pl.x,y:pl.gy-BODY},hit:orbHit}; V.orbs.push(o); orbBlade(o); } }},
  // PLUNGE: a shadow tightens where he will land; he goes up and over on a wide red band and comes down blade first. The floor gives one ball of fire, its
  // stones, and long tongues of fire along the ground. Everything near goes up and out
  sw_plunge:{moves:true,range:460,fn(id){ const e=nearest(460), a=aim(id,460); if(a==null) return false; const d=SK[id].dmg*A.mul(id), L=e?Math.max(0,Math.hypot(e.x-pl.x,e.y-pl.gy)-60):320, up=k=>1-(1-k)*(1-k), dn=k=>k*k; face(a);
    const tx=pl.x+Math.cos(a)*L, ty=pl.gy+Math.sin(a)*L, SH=GFX.st(12,'alpha',{L:0}), GL=GFX.st(8,'add',{L:0}), red=GFX.rgb('#ff3020');
    V.dash={x0:pl.x,y0:pl.gy,x1:tx,y1:ty,t:0,dur:.42}; G.inv=Math.max(G.inv,.5);
    GFX.add(.42,k=>{ GFX.floor(SH,tx,ty,mix(340,130,k*k),null,0,[0,0,0],.3+.5*k); GFX.floor(GL,tx,ty,mix(520,210,k),null,0,red,.3+.7*k*k); });
    // the leap is drawn: a wide red band on the path of the blade, up over the top of the jump and down into the mark; it is still burning when he lands
    { const sx=pl.x, sy=pl.gy, px=mix(sx,tx,.62), py=mix(sy,ty,.62), pz=BODY*.9+300;
      strip(u=>[mix(sx,px,u),mix(sy,py,u),mix(BODY*.5,pz,Math.sin(u*Math.PI/2))],{pal:SCR,w:86,draw:.28,hold:0,fade:.12,n:12,cw:.36,eat:1});
      strip(u=>[mix(px,tx,u),mix(py,ty,u),mix(pz,10,u)],{pal:SCR,w:150,tp:tpNeedle,draw:.1,hold:.05,fade:.18,n:10,cw:.4,gain:1.25,eat:1,delay:.31});
      K3.sparks(sx,sy,30,{pal:SCR,n:10,sp:[200,700],up:1500,life:[.2,.45]}); K3.dust(sx,sy,{n:5,r:40,sp:[150,420],a:.35}); GFX.light(sx,sy,520,SCR.l,.9,.25,{z:200}); GFX.light(tx,ty,560,SCR.l,.8,.2,{z:60,hold:.34}); }
    const land=()=>{ const cx=pl.x, cy=pl.gy, r0=rand(0,TAU); pl.air=pl.airT=0;
      swordFoley('sonniss_debris');
      K3.vblast(cx,cy-70,{s:260,pal:SFR,smoke:.15,dur:.7,heat:1.25,fire:.24,rise:300}); K3.flare(cx,cy,40,{pal:SFR,s:250,dur:.09,gain:5});
      K3.shock(cx,cy,{r:600,r0:90,dur:.36,pal:SFR,gain:1.25});
      // tongues of fire thrown along the floor from under the blade, uneven in length and spacing
      for(let i=0;i<9;i++){ const b=r0+i*TAU/9+rand(-.2,.2), c=Math.cos(b), s=Math.sin(b)*FSY, R1=rand(430,700); strip(u=>[cx+c*mix(110,R1,u),cy+s*mix(110,R1,u),14+90*Math.sin(u*Math.PI)],{pal:SFR,core:SGW,w:rand(62,96),tp:tpNeedle,draw:.1,hold:.06,fade:.22,n:9,delay:rand(0,.03),eat:1}); }
      K3.cool(cx,cy,{kind:'crater',r:240,pal:SFR,life:2.4,light:0});
      K3.chunks(cx,cy,{n:12,r:60,sp:[300,1100],up:1700,s:[26,60],pal:SFR,rock:'#2a252c'}); K3.sparks(cx,cy,20,{pal:SFR,n:24,sp:[400,1700],up:1400,life:[.3,.7]});
      GFX.light(cx,cy,820,'#ff5a20',1.1,.45,{z:220}); trauma=Math.min(1.1,trauma+.6); hitstop=Math.max(hitstop,.06); sfx('boom',1.3,1); let k=0;
      inCircle(cx,cy,390,e=>{ if(k++<3) K3.ehit(e,{pal:SFR,pw:1.1,ring:0,light:0,dir:Math.atan2((e.y-cy)/FSY,e.x-cx)}); else hitFx(e,'#ff6a85',1.2); blow(e,d,{push:380,up:1700,stun:.7,big:true,from:[cx,cy],sx:cx,sy:cy},.3); }); };
    plSeq([['gt03',.06],['gt08',.18,{air:[0,280],ease:up}],['gs06',.06,{air:[280,300]}],['gs07',.12,{tr:1,air:[300,0],ease:dn}],['gs08',.06,{tr:1,kick:[2.6,-2.6],on:land}],['gs09',.14],['gs12',.08]]);
    if(mkOn()&&MK.CLIPS.swPlunge) MK.play('swPlunge',{yaw:fa(a)}); }},
  // FLURRY: a tight bundle of red stems leaving the blade itself, each putting one more brand on what it pricks; the sixth, white-hot and half again as
  // thick, goes through, sets the brands off and carries the bodies away along it
  sw_thrust:{range:400,fn(id){ const a=aim(id,400); if(a==null) return false; const d=SK[id].dmg*A.mul(id); face(a);
    plSeq([['gk03',.06],['gk04',.06,{kick:[1,-.8]}],['gk05',.05],['gk06',.06,{kick:[1,-.8]}],['gk07',.05],['gk08',.06,{kick:[1,-.8]}],['gk09',.16,{tr:1,kick:[2,-1.6]}],['gk12',.06]]);
    if(mkOn()&&MK.CLIPS.swStab) MK.play('swStab',{yaw:fa(a)});
    for(let i=0;i<6;i++){ const last=i===5, b=a+(last?0:[-.07,.05,-.02,.08,-.04][i]), off=last?0:[-34,26,-10,40,-22][i], zo=last?0:[18,-20,26,-8,10][i], c=Math.cos(b), s=Math.sin(b), nx=-Math.sin(a)*off, ny=Math.cos(a)*off, ex=last?330:140;
      after(.06+i*.06,()=>{ const g=mkOn()?MK.wpt('sb'):null, bx=(g?g[0]:pl.x+c*40)+nx, by=(g?g[1]:pl.gy+s*40)+ny, zz=(g?g[2]:BODY*.5)+zo, x0=pl.x+c*40, y0=pl.gy+s*40, x1=pl.x+c*400, y1=pl.gy+s*400;
        strip(ln(bx,by,x1+c*ex+nx,y1+s*ex+ny,zz),{pal:SCR,core:SWH,w:last?150:96,tp:tpNeedle,draw:.04,hold:last?.12:.09,fade:last?.2:.13,n:10,rev:1,gain:last?1.35:1,cw:last?.52:.4});
        GFX.light(x1,y1,last?700:380,last?'#ff8a8a':SCR.l,last?1.1:.7,last?.34:.14,{z:80}); K3.sparks(x1+c*ex*.6,y1+s*ex*.6,zz,{pal:last?SWH:SCR,n:last?14:3,dir:fa(b),spread:.3,sp:[500,1500],up:200,life:[.12,.3]});
        if(last){ K3.dust(x1,y1,{n:5,dir:fa(b),spread:.8,sp:[150,420],a:.35}); K3.coolLine(x0+c*80,y0+s*80,x1+c*ex*.5,y1+s*ex*.5,{w:20,pal:SCR,life:1.2,hot:.6,grow:.06,shed:0}); hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.3); }
        sfx('slash',1.5,.45); let k=0;
        inLine(x0,y0,x1,y1,70,e=>{ const m=K3.mark(e,'brand',BR(.7,6)); hitFx(e,'#ff6a85',.6);
          if(last){ if(m) m.end(); if(k++<4) K3.ehit(e,{pal:SCR,pw:1.25,ring:0,dir:fa(b)}); blow(e,d,{dir:fa(b),push:440,up:800,stun:.3},.18); }
          else { if(k++<3) cutFlash(e,b,SCR,70); hurt(e,d,{dir:fa(b),push:45,stun:.3,fl:1000,flUp:500}); } }); }); } }},
  sw_counter:{passive:true},
};
function counterReady(){ const id='sw_counter'; return A.unlocked(id)&&(V.cd[id]||0)<=0; }
// COUNTER: the blow is turned and answered at once: two rings of steel edged in gold cross round him as an X; the one who struck is hit hard and thrown
function counter(src){ const id='sw_counter', d=SK[id].dmg*A.mul(id); V.cd[id]=A.cdOf(id); G.inv=1.1; slow(.25,.35); stamp('카운터',{x:.5,y:.36,size:.14,life:.9,c:'#ffe9a0'}); sfx('boom',1,.8);
  const foe=src&&V.en.includes(src)&&!src.dead?src:null; if(src) face(Math.atan2(src.y-pl.gy,src.x-pl.x)); anim.seq=null;
  plSeq([['gc05',.05,{tr:1,kick:[2.8,-2.6]}],['gc06',.08,{tr:1}],['gc07',.18],['gc10',.08],['gc12',.06]]);
  const a=src?Math.atan2(src.y-pl.gy,src.x-pl.x):(pl.f>0?0:Math.PI), z=BODY*.55, dir=fa(a);
  for(const [rl,cc,dl] of [[.5,false,0],[-.5,true,.04]]){
    K3.cres(pl.x,pl.gy,z,{reach:390,dir,lean:.4,roll:rl,tex:'v3_slash_heavy',pal:SGD,swing:.06,hold:.1,fade:.28,gain:.5,ccw:cc,sparks:0,light:0,delay:dl});
    K3.cres(pl.x,pl.gy,z,{reach:372,dir,lean:.4,roll:rl,tex:'v3_slash_thin',pal:SST,swing:.055,hold:.1,fade:.26,gain:.9,ccw:cc,sparks:6,light:0,delay:dl});
    K3.cres(pl.x,pl.gy,z,{reach:330,dir:dir+Math.PI,lean:.4,roll:rl,tex:'v3_slash_thin',pal:SST,swing:.07,hold:.08,fade:.24,gain:.7,ccw:cc,sparks:0,light:0,delay:dl+.03}); }
  K3.flare(pl.x,pl.gy,z,{pal:SGW,s:120,dur:.12,gain:2.4}); GFX.light(pl.x,pl.gy,700,'#ffe090',.8,.35,{z:100}); hitstop=Math.max(hitstop,.05); let k=0;
  X.inCircleS(pl.x,pl.gy,440,e=>{ const main=e===foe; if(main) K3.ehit(e,{pal:SGW,pw:1.6,ring:0}); else if(k++<3) K3.ehit(e,{pal:SGD,pw:1,ring:0,light:0}); else hitFx(e,'#ffe9a0',1.2);
    dmg(e,d,{kb:0,push:main?500:320,up:main?900:0,big:true,crit:true}); }); }

// basic: a 3-cut chain at the nearest enemy, no wind-up: two thin red bands on the path of the blade, then a wide gold one that scores the floor
function basic(){ const a=aim(null,430); if(a==null) return false; const n=V.chain++%3, big=n===2, r=big?360:300, d=1200*A.mul('sw_basic')*(big?1.7:1), sg=n===0?1:-1; face(a);
  seq(['gs','gu','gs'][n],[['05','06','08'],['04','06','08'],['05','07','09']][n],{basic:true});
  const half=big?1.6:1.25, P=big?SGD:SCR, dir=fa(a), dx=Math.cos(a), dy=Math.sin(a), z=BODY*.5, rl=[.12,-.3,.3][n];
  if(mkOn()) MK.play(['cutA','cutB','cutC'][n],{yaw:dir,blend:.05});
  // the band is the path of the edge itself, and only the part of the swing that crosses in front of him: an open arc toward the enemy, never a ring round him
  { const z0=BODY*[.62,.25,1.5][n], z1=BODY*[.42,1,.12][n], ro=r*1.14, ri=ro*(big?.42:.5), S=arcS(14,u=>{ const b=dir+sg*mix(-half*.88,half*.88,u), c=Math.cos(b), s=Math.sin(b)*FSY, zz=mix(z0,z1,u); return [c*ri,s*ri,zz,c*ro,s*ro,zz+BODY*.28]; });
    edge(atS(S,onHero),{pal:P,core:big?SGW:SWH,draw:big?.07:.055,lin:1,hold:big?.07:.05,fade:big?.2:.15,n:16,rim:big?.24:.2,gain:big?1.15:1});
    GFX.light(pl.x+dx*r*.6,pl.gy+dy*r*.6,r*1.5,P.l,big?.8:.6,.2,{z}); }
  swingSparks(pl.x,pl.gy,z,r*.8,dir,sg,P,big?12:6);
  if(big){ const px=-dy, py=dx, mx=pl.x+dx*r*.72, my=pl.gy+dy*r*.72; K3.coolLine(mx-px*170,my-py*170,mx+px*170,my+py*170,{w:26,pal:SGD,life:1.2,hot:.6,grow:.06,shed:0});
    K3.dust(mx,my,{n:4,dir,spread:1,sp:[150,420],a:.3,s:.8}); hitstop=Math.max(hitstop,.03); trauma=Math.min(1,trauma+.12); }
  sfx('whoosh',1.1+n*.1,.6); sfx('slash',1+n*.06,big?1:.75);
  if(n===0) swordFoley('sonniss_long_blade');
  after(.04,()=>{ let k=0; inSector(pl.x,pl.gy,a,r,half,e=>{ if(big&&k===0) swordFoley('sonniss_steel'); if(big){ if(k++<2) K3.ehit(e,{pal:SGD,pw:1,ring:0,dir}); else hitFx(e,'#ffd36a',1.1); blow(e,d,{dir,push:300,up:600},.12); } else { hitFx(e,'#ff6a85',1); if(k++<3) cutFlash(e,a+sg*Math.PI/2*.8,SCR,110); blow(e,d,{dir,push:170,up:250},.1); } }); });
  return true; }

// ORBIT BLADE: one of the blades circling him (o is the orb the game steps: a, x, y, R, life): lit metal, point first, a ribbon of light where it has been
function orbBlade(o){ if(!FX3.on) return; const C=pc(SGD), CW=pc(SGW), sd=rand(0,9), tr=K3.mats(), lt=GFX.light(pl.x,pl.gy,440,'#ffc040',.7,.3,{hold:o.life,z:100}); let end=-1;
  const e=GFX.add(o.life+.5,(k,t)=>{ if(end<0&&V.orbs.indexOf(o)<0){ end=t; lt.hold=0; lt.life=.2; lt.t=0; } const f=end<0?0:sat((t-end)/.3); if(f>=1){ e.dead=true; return; } if(o.x==null) return;
    const inn=eo3(sat(t/.22)), R=o.R=mix(120,400,inn), z=BODY*.6+14*Math.sin(t*4+sd), ps=[]; lt.x=o.x; lt.y=o.y;
    for(let q=0;q<16;q++){ const b=o.a-q*.115, rr=mix(120,400,eo3(sat((t-q*.115/4.2)/.22))); ps.push({x:pl.x+Math.cos(b)*rr,y:pl.gy+Math.sin(b)*rr*.8,z,w:86*Math.pow(1-q/16,.8)*(.5+.5*inn)*(1-f)}); }
    FX3.ribbon(tr.trB,ps,{...C,gain:3.6,a:1,ero:.1+f*.5,t0:sd}); for(const p of ps) p.w*=.4; FX3.ribbon(tr.trC,ps,{...CW,gain:6.5,a:1,ero:.14+f*.5,t0:sd});
    const tx=-Math.sin(o.a), ty=Math.cos(o.a)*.8/FSY, l=Math.hypot(tx,ty)||1, ux=tx/l, uy=ty/l, Lb=420*(.5+.5*inn), ax=-ux*.94, ay=-uy*.94;
    if(typeof gsword==='function') gsword(o.x+ux*Lb*.45,o.y+uy*Lb*.45*FSY,z-Lb*.15,Lb,{tilt:Math.atan2(ax,.34),pitch:Math.asin(ay),yaw:t*2+sd,ero:f*.9,eroH:f*.9,a:inn,glow:1.3,vein:.9,lite:1,heat:.25,shadow:0}); }); }
// what a circling blade does to the enemy it grazes: a short gold line straight through it along the blade's travel, and a glint
function orbHit(e,o){ const tx=-Math.sin(o.a), ty=Math.cos(o.a)*.8, l=Math.hypot(tx,ty)||1, ux=tx/l, uy=ty/l, z=e.z+e.h*.5; sfx('slash',1.6,.3);
  const dir=Math.atan2(uy/FSY,ux); strip(ln(e.x-ux*120,e.y-uy*120,e.x+ux*240,e.y+uy*240,z),{pal:SGD,core:SGW,w:44,tp:tpNeedle,draw:.05,hold:.05,fade:.16,n:8,eat:1}); K3.ehit(e,{pal:SGD,pw:.85,ring:0,light:0,dir});
  if(e.dead) fling(e,dir,1000,600); else K3.knock(e,{dir,dist:130,up:300}); }
// FLYING CRESCENT: the wave a cut throws, carried by a projectile p ({x,y,life}). One tall crescent, bowed toward where it is going and leaning (so it reads
// from any side): white along its leading edge, red filling in behind, pointed at both horns. A wake of fixed length runs back from its middle (it pays
// out as far as the wave has flown and never changes after that). a is the screen angle of flight. When the projectile ends it is eaten horn to horn
function flyCres(p,a,o={}){ if(!FX3.on) return; const R=o.R||250, life=o.life||.5, dir=fa(a), fx=Math.cos(a), fy=Math.sin(a), lx=-Math.sin(dir)*.8, ly=Math.cos(dir)*.8*FSY, lz=ly>=0?-.55:.55, z=Math.max(BODY*.55,R*.58), TH=R*.8, TL=R*1.1,
    S=arcS(15,u=>{ const ph=mix(-1.2,1.2,u), b=R*(Math.cos(ph)-1), q=R*Math.sin(ph), ox=fx*b+lx*q, oy=fy*b+ly*q, oz=z+lz*q; return [ox-fx*TH,oy-fy*TH,oz,ox,oy,oz]; }),
    L=GFX.light(p.x,p.y,R*3,SCR.l,.9,.18,{hold:life,z});
  edge(atS(S,()=>[p.x,p.y]),{pal:SCR,draw:.05,hold:life-.04,fade:.16,n:15,rim:.2,gain:1.15});
  strip((u,t)=>{ const l=Math.min(TL,1250*t)*(1-u); return [p.x-fx*(l+TH*.3),p.y-fy*(l+TH*.3),z]; },{pal:SCR,w:R*.2,tp:tpNeedle,draw:.02,hold:life-.02,fade:.14,n:10,cw:.3,gain:.7,eat:1});
  let em=0; GFX.add(life,(k,t)=>{ L.x=p.x; L.y=p.y; if(t-em>.035){ em=t; const q=rand(-.9,.9)*R; GFX.pt({x:p.x+lx*q,y:p.y+ly*q,z:z+lz*q,vx:-fx*rand(200,600),vy:-fy*rand(200,600),vz:rand(-40,120),g:300,drag:1.5,life:rand(.2,.4),s:rand(2.5,4.5),m:3,len:.06,c:GFX.rgb(Math.random()<.4?'#ffffff':SCR.s),c2:SCR.b,L:3}); } });
  p.onEnd=()=>{ L.hold=0; L.life=.15; L.t=0; K3.sparks(p.x,p.y,z,{pal:SCR,n:14,dir,spread:.8,sp:[400,1300],up:260,life:[.14,.34]}); }; }

const basicCd=()=>.8*(1-.05*(A.sLv('sw_basic')-1));

// ============================================================ local effect pieces on FX3 / GFX (kit candidates; used by the skills above and by ultRain)
const sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k), eo5=k=>1-Math.pow(1-k,5);
// the gold of the finishing cuts
const GOLDF={d:'#3a1400',b:'#ff9a10',m:'#ffe27a',h:'#fffbe8',l:'#ffc040',s:'#ffe9a0'};
const LM={}, lm=(k,fn)=>LM[k]||(LM[k]=fn(K3.mats())), pc=p=>{ const P=K3.pal(p); return {cA:P.d,cB:P.b,cC:P.h,cM:P.m||P.b}; };
// an angle measured on the screen (the game's squashed floor) as an angle on the true floor, which is what the kit's floor pieces turn by
const fa=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
// RAY: a shaft of light standing on a point (two draws): streaks racing upward, soft at the sides, gone toward the top
const rayB=()=>lm('rayB',()=>FX3.mat({nz:'wisp',n1:[1.2,.5,0,-1.8],n2:[2,1,0,-.7],dist:.06,nk:.9,ero:.08,soft:.3,fd:[.5,.5,.02,.75],rk:[.45,.9],gain:2.6,bgain:1.1,layer:'o'})),
  rayC=()=>lm('rayC',()=>FX3.mat({nz:'streak',n1:[.6,2,0,-2.6],n2:[2,1,0,-1],dist:.03,nk:.45,ero:.08,soft:.25,fd:[.5,.5,0,.85],rk:[.15,.5],gain:4.5,bgain:2.2,layer:'o'}));
function ray(x,y,o={}){ if(!FX3.on) return; const C=pc(o.pal||'gold'), w=o.w||46, h=o.h||1100, dur=o.dur||.5, g=o.gain||1, sd=Math.random()*9, z0=o.z||0, mb=rayB(), mc=rayC();
  GFX.add(dur,(k,t)=>{ const up=eo3(sat(t/(o.rise??.07))), f=sat((k-.4)/.6), ww=w*(1+.3*Math.sin(k*Math.PI))*(1-f*.7), a=1-f*f, hh=h*up/2;
    FX3.bill(mb,x,y,z0+hh,ww*2.2,hh,0,{...C,a,gain:2.4*g,ero:.08+f*.5,t0:sd});
    if(o.core!==0) FX3.bill(mc,x,y,z0+hh,ww*.7,hh,0,{...C,a,gain:4.2*g,t0:sd}); },o.delay||0); }


// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const RED='#ff2a4a', GOLD='#ffcf4a';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH (redev 2026-11-24, third pass): a cut type ultimate over the whole screen, built from ONE shape: the tapered cut (white core,
// red bleed, a crack in the floor under it). Small cuts score the floor round him while he waits; his afterimage runs two lines through
// him from edge to edge (an uneven X); then cut after cut is thrown across the four fields between them, each thinner or thicker than
// the last, until the field is a net. The blade goes home, and on the click the net shows black against the flash, the two lines stand
// up as four walls of crimson blade light and every other cut throws up a fin of its own, nearest first, with every body on the screen
// thrown outward by the same wave. The walls run away from the crossing as they burn; the scars cool from him outward.
const ZE={d:'#1a0500',b:'#e2500c',m:'#ffa23a',h:'#ffe6b0',l:'#ff7a20',s:'#ffb060'}, ZP={d:'#2a0006',b:'#f0101e',m:'#ff4258',h:'#ffe2e0',l:'#ff2a3a',s:'#ff9aa0'}, ZM={d:'#1a0004',b:'#a80a16',m:'#e01428',h:'#ff8a90',l:'#ff2a3a',s:'#ff9aa0'}, ZW={d:'#5a0010',b:'#ff5a5a',m:'#ffe0d8',h:'#ffffff',l:'#ff8a8a',s:'#ffffff'};
function ultZero(id){ ultStart(id);
  const mk=window.MK&&MK.on()?MK:null, Cn=X.cine, K=K3, F=FX3, Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), f0=pl.f, yaw0=f0>0?0:Math.PI, T1=4.1, TE=6.3, DEG=Math.PI/180, C=pc(ZP), CW=pc(ZW),
    tS=RT, V_now=()=>RT-tS, vol=!!(window.VOL&&K.vok&&K.vok()), dist=e=>Math.hypot(e.x-x0,(e.y-y0)/FSY), sx0=x0-f0*20, rot0=rand(0,TAU);
  // a line through him at screen angle a: r is measured along it on the screen; kf turns that into a distance on the true floor
  const mkL=a=>{ const c=Math.cos(a), s=Math.sin(a), th=Math.atan2(s/FSY,c), nx=-Math.sin(th), ny=Math.cos(th);
    return {a,c,s,th,kf:Math.hypot(c,s/FSY),ev:Math.min(hw/Math.abs(c),hh/Math.abs(s)),len:Math.min(hw*2.5/Math.abs(c),hh*2.8/Math.abs(s)),pt:r=>[x0+c*r,y0+s*r],sd:e=>(e.x-x0)*nx+(e.y-y0)/FSY*ny,al:e=>(e.x-x0)*Math.cos(th)+(e.y-y0)/FSY*Math.sin(th),h:null}; };
  // a cut that does not pass through him: centre, screen angle, half length on the screen, half width of its crack
  const mkC=(cx,cy,a,lh,w)=>{ const c=Math.cos(a), s=Math.sin(a), th=Math.atan2(s/FSY,c), ct=Math.cos(th), st=Math.sin(th);
    return {cx,cy,a,c,s,th,kf:Math.hypot(c,s/FSY),lh,w,d:Math.hypot(cx-x0,(cy-y0)/FSY),sd:rand(0,9),far:0,pt:r=>[cx+c*r,cy+s*r],al:e=>(e.x-cx)*ct+(e.y-cy)/FSY*st,off:e=>-(e.x-cx)*st+(e.y-cy)/FSY*ct}; };
  const LA=mkL(-18*DEG), LB=mkL(52*DEG), lines=[LA,LB];
  const soot=tex=>F.mat({tex,nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
    bed=tex=>F.mat({tex,nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'}),
    mS=lm('zS',()=>soot('v3_gash')), mB=lm('zB',()=>bed('v3_gash')), mFS=lm('zFS',()=>soot('v3_fissure_b')), mFB=lm('zFB',()=>bed('v3_fissure_b')),
    mK=lm('zK',()=>F.mat({tex:'v3_gash',nz:'cells',n1:[3,3,0,0],nk:.3,pw:.7,ero:.04,soft:.25,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'o',ord:1e6}));
  // light standing on a line: streaks that run ALONG the line (outward from him) while they climb, so the pattern travels instead of boiling in place
  const mP=lm('zP3',()=>F.mat({nz:'wisp',n1:[2.6,.55,-1.5,-.7],n2:[1.2,.9,-.8,-.4],dist:.07,nk:.85,pw:1.4,ero:.14,soft:.3,fd:[.05,.12,0,.85],rk:[.38,1.02],gain:2.4,bgain:1.1,layer:'o'}));
  const GLW=GFX.st(8,'add'), RGL=GFX.rgb(ZP.l), MKS=GFX.st(3,'add'), RW=GFX.rgb('#ffffff'), RP=GFX.rgb(ZP.m), RD=GFX.rgb(ZP.b);
  // shd: his afterimages are dark bodies rimmed in crimson with a white-lit blade (mk_sword's dshade); SHC is the old white light, kept as a fallback.
  // FZ: the frozen frames of the click (nothing moves but the white point at the crossing). SUCK: 0..1 over the last .3s before the click,
  // while the floor's light is drawn out of every scar into the crossing
  const SHC='#ffeef0', FZ=.1, shd=o=>mk.dshade?mk.dshade(o):mk.shade({...o,c:SHC}), SUCK=()=>sat((V_now()-T1+.32)/.3);
  const hurt=(e,d)=>dmg(e,Math.min(d,Math.max(1,e.hp*.8)),{crit:true,kb:0}), held=e=>{ e.stun=Math.max(e.stun,T1-V_now()+.4); }, nick=(e,d)=>{ hurt(e,d); e.flash=Math.min(e.flash,.35); };
  // SCAR: the one shape of this skill. The cut is drawn once along its line in `draw` (a white-cored needle in the air that thins and burns
  // away behind its point), and under it a crack opens in the floor. With `heat` the crack keeps widening and heating for that long (until
  // the click) and then, after `lag`, cools and crumbles; without it the crack is born hot and cools at once
  const scar=(S,o)=>{ const p0=S.pt(-S.lh), p1=S.pt(S.lh), hl=S.lh*S.kf, w=S.w, heat=o.heat||0, lag=o.lag||0, dr=o.draw, tc=heat+lag;
    strip(ln(p0[0],p0[1],p1[0],p1[1],o.z??BODY*.5),{pal:ZP,core:ZW,w:w*1.5,tp:tpNeedle,draw:dr,hold:.04,fade:.3,n:10,gain:1.1,delay:o.delay||0});
    GFX.add(tc+o.cool,(k,t)=>{ const g=eo3(sat(t/dr)), hot=t<tc, q=heat?sat(t/heat):1, c_=sat((t-tc)/o.cool), H=K.heat(ZP,hot?mix(.72,.1,q):mix(.1,1,c_)), m=S.pt(-S.lh*(1-g)), cr=Math.pow(sat((c_-.4)/.6),1.4), eat=hot?mix(.4,.12,q):.12+.7*cr, ww=w*(heat?mix(1.3,2.8,q*q):2), en=.16+.3*cr;
      const dn=hot&&heat?1-.6*SUCK():1;
      if(heat&&!F.low) GFX.floor(GLW,m[0],m[1],hl*g*.95,ww*3.4,S.th,RGL,(hot?.28*q*dn:.28*(1-c_))*sat(t/.1));
      if(!F.low) F.quad(mS,m[0],m[1],hl*g*1.03,ww*1.7,S.th,{a:.5*sat(t/.06),ero:eat,fd:[en,en,0,0]});
      F.quad(mB,m[0],m[1],hl*g,ww,S.th,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:1,gain:2.5*H.g*(hot?mix(.65,1.25,q)*dn:1),bgain:1.2*H.g,ero:eat,fd:[en,en,0,0],t0:S.sd}); },o.delay||0); };
  // FIN: what a cut of the net throws up on the click: blade light standing on its crack, highest in the middle and gone to nothing at both
  // ends. It is up in four frames, then its crest runs along the cut away from him while it tears apart; rock and sparks leave its foot
  const fin=(S,h,delay,lit)=>{ const sd=S.sd, n=13, dur=.62, out=((S.cx-x0)*S.c+(S.cy-y0)*S.s)>=0?1:-1, ul=Math.max(.3,S.lh*2*S.kf/1500), th=S.th+(out>0?0:Math.PI);
    GFX.add(dur,(k,t)=>{ const up=eo5(sat(t/.07)), f=sat((t-.18)/.44), ps=[];
      for(let i=0;i<n;i++){ const u=i/(n-1), v=u*2-1, w_=v*out, p=S.pt(v*S.lh), env=Math.pow(Math.max(0,1-v*v),.6)*sat((w_+1-f*2)/.4), wv=.5+.5*Math.pow(.5+.5*Math.sin(w_*5-t*14+sd),2);
        ps.push({x:p[0],y:p[1],h:h*up*env*wv}); }
      F.wall(mP,ps,{...C,cC:'#fff0ee',a:.45*(1-f*f),gain:1.8,ero:.16+f*.3,t0:sd,uvT:[ul,1,0,0]}); },delay);
    after(delay,()=>{ if(lit) GFX.light(S.cx,S.cy,S.lh*S.kf*1.2,ZP.l,.55,.35,{z:h*.3}); Cn.shake(.4);
      for(const u of [-.5,0,.5]){ const p=S.pt(u*S.lh); K.sparks(p[0],p[1],50,{pal:u?ZE:ZW,n:7,sp:[600,2000],up:1700,dir:th,spread:.9,life:[.3,.8]}); K.debris(p[0],p[1],{n:4,r:70,sp:[300,1100],up:1800}); }
      K.dust(S.cx,S.cy,{n:6,r:S.lh*S.kf*.5,sp:[300,900],dir:th,spread:1.2,a:.4,s:1.2,life:1.2,c:'#241018',c3:'#5a2c40'}); K.chunks(S.cx,S.cy,{n:2,r:S.lh*S.kf*.4,sp:[300,1000],up:1900,s:[30,72],pal:ZP,rock:'#16121a'}); });
    after(delay+.3,()=>{ const p=S.pt(.4*S.lh*out); K.embers(p[0],p[1],S.lh*S.kf*.5,{pal:ZE,n:9,life:1.1,s:1.3,up:800,z:h*.3}); }); };
  // CUT LINE: what the afterimage leaves along a main line while it crosses in `dur`: a white seam hanging in the air, which thins to an
  // afterglow once it is drawn, and a crack in the floor under it that widens and heats until the click, light leaking up out of it in
  // waves that travel outward
  const cutLine=(L,dur,dir)=>{ const h={dead:false}, hold=T1-V_now(), sd=rand(0,9), tr=K.mats(); let em=0; L.h=h;
    GFX.add(hold+.4,(k,t)=>{ if(h.dead) return; const e=eo3(sat(t/dur)), tip=t<dur?mix(-L.ev,L.ev,e):mix(L.ev,L.len,eo3(sat((t-dur)/.12))), q=sat(t/hold), a0=-L.len, cm=(a0+tip)/2*dir, [cx,cy]=L.pt(cm), hl=(tip-a0)/2*L.kf, thin=eo3(sat((t-dur)/.5));
      const dn=1-.6*SUCK(), H=K.heat(ZP,mix(.9,.1,q)), w=mix(46,150,q*q), ps=[], pw=[], pc_=[], n=17, lo=Math.max(a0,-L.ev*1.3), hi=Math.min(tip,L.ev*1.3), ul=Math.max(.3,(hi-lo)*L.kf/1500);
      if(!F.low) F.quad(mS,cx,cy,hl*1.02,w*1.6,L.th,{a:.5*sat(t/.08),ero:.12});
      F.quad(mB,cx,cy,hl,w,L.th,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:1,gain:2.5*H.g*mix(.6,1.25,q)*dn,bgain:1.2*H.g,ero:mix(.4,.1,q)});
      for(let i=0;i<n;i++){ const u=i/(n-1), rr=mix(lo,hi,u), r=rr*dir, p=L.pt(r), ar=Math.abs(rr)/L.ev, wv=Math.pow(.5+.5*Math.sin(ar*8-t*(5+7*q)+sd),2), age=sat((tip-rr)/(L.ev*.5)+.15), hgt=mix(50,430,Math.pow(q,1.5))*(.45+.55*wv)*age*sat((Math.abs(rr)-260)/420)*(1-.75*SUCK());
        ps.push({x:p[0],y:p[1],z:BODY*.5*(1-.55*q),w:mix(62,20,thin)*(.75+.25*wv)}); pw.push({x:p[0],y:p[1],h:hgt}); pc_.push({x:p[0],y:p[1],h:hgt*.28}); }
      F.wall(mP,pw,{...C,cC:ZP.m,a:.85,gain:1.5,ero:.16,t0:sd,uvT:[ul,1,0,0]}); F.wall(mP,pc_,{...CW,a:.85,gain:1.7,ero:.22,t0:sd+3,uvT:[ul*1.3,1,.37,0]});
      F.ribbon(tr.trB,ps,{...C,gain:mix(3.2,1.8,thin),a:.9,ero:.12+.1*thin,t0:sd}); for(const p of ps) p.w*=.42; F.ribbon(tr.trC,ps,{...CW,gain:mix(5.5,2.6,thin),a:1,ero:.16+.14*thin,t0:sd});
      if(t<dur&&t-em>.016){ em=t; const p=L.pt(tip*dir); for(let i=0;i<2;i++) GFX.pt({x:p[0],y:p[1],z:BODY*.5+rand(-30,30),vx:-L.c*dir*rand(300,1200)+rand(-200,200),vy:-L.s*dir*rand(300,1200)+rand(-120,120),vz:rand(-100,500),g:900,drag:1.6,life:rand(.25,.55),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.5?'#ffffff':ZP.s),c2:ZP.b,L:3}); }
      else if(t>=dur&&t-em>.05){ em=t; const p=L.pt(rand(-1.3,1.3)*L.ev); GFX.pt({x:p[0],y:p[1],z:rand(10,60),vx:rand(-60,60),vy:rand(-30,30),vz:rand(300,700)*(1+q),g:-80,drag:.7,life:rand(.4,.8),s:rand(3,6),m:8,c:GFX.rgb(Math.random()<.5?ZE.m:ZP.s),fade:'in',L:3}); } });
    return h; };
  // one pass: the afterimage crosses from edge to edge; whoever stands near the line is held and cut twice, the cut on the body lying along the line
  const pass=(L,dur,dir)=>{ const a=L.pt(-L.ev*dir), b=L.pt(L.ev*dir); cutLine(L,dur,dir);
    if(mk) shd({x0:a[0],y0:a[1],x1:b[0],y1:b[1],yaw:dir>0?L.th:L.th+Math.PI,wait:0,dur,clip:dir>0?'cutA':'cutD',hold:.2,sc:1.7});
    else { const ps=[]; for(let i=0;i<9;i++){ const u=i/8, p=L.pt(mix(-L.ev,L.ev,u)*dir); ps.push({x:p[0],y:p[1],z:BODY*.5+Math.sin(u*Math.PI)*120}); } K.trail(ps,{pal:ZP,w:70,dur:dur+.25,draw:dur,gain:1}); }
    GFX.light(x0,y0,L.ev*1.3,ZP.l,.6,.4,{z:160}); Cn.shake(.4); SFX.slash(1.1,.9); Cn.SND.shing(1.1,.5); SFX.whoosh(.9,.8);
    for(const e of onScreen(300)){ if(Math.abs(L.sd(e))>400) continue; const u=sat((L.al(e)/L.kf*dir+L.ev)/(2*L.ev));
      after(dur*(1-Math.pow(1-u,1/3))+.02,()=>{ if(e.dead) return; held(e); nick(e,Dm*.05); cutFlash(e,L.a+Math.PI/2,ZP,130); after(.14,()=>{ if(!e.dead) nick(e,Dm*.05); }); }); } };
  // THE TWELVE SHADOWS (the old shadow flurry, folded in): he splits into twelve afterimages standing round the whole field; one after
  // another, faster and faster, each crosses it from edge to edge in one cut, leaves its scar in the floor and a mark on every body it
  // passed; then all twelve come back into him at once
  const cuts=[], marks=[], lagOf=S=>.2+Math.min(.75,S.d/(hw*3.2)), NS=12, SR=[hw*1.25,hh*1.3], SH=[];
  // each crossing is a chord of the field (not a spoke through him), so together they weave a net instead of a star
  for(let i=0;i<NS;i++){ const th=i*Math.PI/NS*5%Math.PI+rand(-.08,.08), c=Math.cos(th), s=Math.sin(th), d=(i%2?1:-1)*rand(.12,.62)*hh, px=-s*d, py=c*d,
      A=c*c/(SR[0]*SR[0])+s*s/(SR[1]*SR[1]), B=2*(px*c/(SR[0]*SR[0])+py*s/(SR[1]*SR[1])), Cq=px*px/(SR[0]*SR[0])+py*py/(SR[1]*SR[1])-1, r=Math.sqrt(Math.max(0,B*B-4*A*Cq)), t0=(-B-r)/(2*A), t1=(-B+r)/(2*A), fl=Math.random()<.5;
    const P0=[x0+px+c*t0,y0+py+s*t0], P1=[x0+px+c*t1,y0+py+s*t1], [a_,b_]=fl?[P1,P0]:[P0,P1]; SH.push({ax:a_[0],ay:a_[1],bx:b_[0],by:b_[1]}); }
  const ORD=[0,5,10,3,8,1,6,11,4,9,2,7], tS0=1.95, when=[]; { let tt=tS0; ORD.forEach((k,j)=>{ when[k]=tt; tt+=Math.max(.06,.15-j*.009); }); }
  const tRet=Math.max(...when)+.2;
  const mark=(e,a,t)=>{ if(!marks.some(m=>m.e===e)) marks.push({e,a,t,sd:rand(0,9)}); };
  const cross=(k,j)=>{ const s=SH[k], dx=s.bx-s.ax, dy=s.by-s.ay, ln_=Math.hypot(dx,dy)||1, a=Math.atan2(dy,dx), S=mkC((s.ax+s.bx)/2,(s.ay+s.by)/2,a,ln_/2*.97,mix(10,17,j/11)), dur=Math.max(.11,.2-j*.008);
    cuts.push(S); scar(S,{draw:dur,heat:T1-V_now(),lag:lagOf(S),cool:1,z:BODY*.45});
    { const ps=[]; for(let i=0;i<7;i++){ const u=i/6, p=S.pt(mix(-S.lh,S.lh,u)); ps.push({x:p[0],y:p[1],z:BODY*.5+Math.sin(u*Math.PI)*60}); } K.trail(ps,{pal:ZP,w:mix(30,70,j/11)*(mk?1:1.4),dur:dur+.22,draw:dur,gain:mix(.85,1.4,j/11)}); }
    SFX.slash(1.1+j*.06,.55); if(j%2===0) Cn.SND.shing(1.15+j*.05,.3); Cn.shake(.22+j*.03); GFX.light(S.cx,S.cy,S.lh*S.kf*.8,ZP.l,.45,.25,{z:140}); hitstop=Math.max(hitstop,.012);
    for(const e of onScreen(300)){ const al=S.al(e); if(Math.abs(S.off(e))>260||Math.abs(al)>S.lh*S.kf) continue; after(dur*sat((al/(S.lh*S.kf)+1)/2),()=>{ if(e.dead) return; held(e); nick(e,Dm*.04); mark(e,a,V_now()); K.sparks(e.x,e.y,e.h*.5,{pal:ZP,n:4,sp:[400,1300],up:300,dir:S.th,spread:.7,life:[.12,.3]}); }); } };
  // the marks: the wound each crossing left on a body, not a stamp: one long slanted cut and a shorter one across it at its own angle (length,
  // slant and width differ per body), crimson with a hot thread in it. It is born as a flash that overshoots and settles, and burns hotter and
  // longer the nearer the click
  GFX.add(T1+FZ+.12-tS0,(k,t)=>{ const tt=V_now(), q=sat((tt-tS0)/(T1-tS0)), qa=.35+.65*q*q;
    for(const m of marks){ const e=m.e; if(e.dead) continue; const ag=tt-m.t, a=sat(ag/.05)*(1-sat((tt-T1-FZ)/.1))*qa; if(a<=0) continue; const z=(e.z||0)+e.h*.55, pop=1+1.2*Math.exp(-ag*16), r1=(m.sd*7.3)%1, r2=(m.sd*3.1)%1;
      const cuts_=[[m.a+.5+r1*.6,mix(26,46,r2)*mix(.8,1.25,q),mix(4,7,q)],[m.a-.9-r2*.5,mix(12,24,r1),mix(2.5,4,q)]];
      for(const [d,s0,w] of cuts_){ const s=s0*pop, cx=Math.cos(d)*s, cz=Math.sin(d)*s; GFX.line(MKS,e.x-cx,e.y,z-cz,e.x+cx,e.y,z+cz,w*1.7/pop,RD,a*.42,0,m.sd,1,0); if(pop>1.25) GFX.line(MKS,e.x-cx*.6,e.y,z-cz*.6,e.x+cx*.6,e.y,z+cz*.6,w*.35,RP,a*(.2+.4*q)*(pop>1.3?1.6:1),0,m.sd,1,0); } } },tS0);
  // WALL: half of one line standing up as blade light, from just outside him to beyond the edge of the field. It runs out from the crossing
  // once; its broken crest keeps travelling outward along the line; then its near end leaves the crossing and runs outward after it, so the
  // wall goes out along its own length instead of fading where it stands. Three colours by height: a white-pink core kept at the foot,
  // crimson light over it, and a dark body (the volume) that goes to black smoke at the top
  const VD=K.vc({d:'#0e0005',b:'#c00c1a',m:'#f02a3c',h:'#ffc8c8',l:'#ff2a3a',s:'#ff9aa0'});
  const wall=(L,sg,h)=>{ const r0=290/L.kf, sd=rand(0,90), th=h*.16, dur=1.6, rm=L.ev*.95, n1=rand(.2,.36), n2=rand(.55,.8),
      prof=u=>(.66+.2*Math.sin(u*7+sd)+.12*Math.sin(u*17+sd*2))*(1-.62*Math.exp(-Math.pow((u-n1)/.045,2)))*(1-.5*Math.exp(-Math.pow((u-n2)/.07,2)));
    let em=0;
    GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/.12)), up=eo3(sat(t/.1)), rc=Math.pow(sat((t-.62)/.9),1.7), f=sat((t-.95)/.65), r1=mix(r0+260,L.len,g), re=Math.min(r1,L.ev*2.3), rin=mix(r0,re,rc);
      if(vol) for(const [ra0,rb,hm,s2] of [[r0,Math.min(r1,rm),1,0],[rm*.8,r1,.74,31]]){ const ra=Math.max(ra0,rin); if(rb-ra<240) continue; const [cx,cy]=L.pt((ra+rb)/2*sg), hl=(rb-ra)/2*L.kf, hz=h*hm/2;
        VOL.add('sheet',cx,cy,hz,{ex:hl,ey:th*1.6,ez:hz,yaw:L.th,pa:[.34*(1-.3*f),.98*up*(1-.5*f),2.2,2.6],pb:[1.02*(1-.8*f),.62+f*.7,mix(Math.min(.2,th*1.4/hl),.44,sat(rc*5)),0],dens:4.2*(1-f*f*f),gain:1.25,seed:sd+s2,smoke:.72+.25*f,fire:.5,rim:0,...VD,cS:'#0b0308'}); }
      const ps=[], pf=[], n=12, span=re-r0;
      for(let i=0;i<n;i++){ const u=i/(n-1), rr=mix(rin,re,u), p=L.pt(rr*sg), pr=prof((rr-r0)/span-t*.2), hd=rc>0?sat((rr-rin)/(L.ev*.2)):1; ps.push({x:p[0],y:p[1],h:h*up*.6*pr*hd*(1-.3*f)}); pf.push({x:p[0],y:p[1],h:h*up*(.17+.1*pr)*hd*(1-.45*f)}); }
      const ul=Math.max(.3,(re-rin)*L.kf/(h*1.6)); F.wall(mP,ps,{...C,cC:ZP.m,a:.55*(1-f*f),gain:1.8,ero:.16+f*.4,t0:sd,uvT:[ul,1,0,0]});
      F.wall(mP,pf,{...CW,a:.9*(1-f*f),gain:2*(1-.35*f),ero:.2+f*.4,t0:sd+3,uvT:[ul*1.6,1,.37,0]});
      if(rc>0&&rc<.97&&t-em>.045){ em=t; const p=L.pt(rin*sg); K.sparks(p[0],p[1],80,{pal:ZE,n:4,sp:[200,700],up:1500,life:[.4,.9]}); K.dust(p[0],p[1],{n:2,r:60,sp:[60,220],a:.4,s:1.5,life:1.1,c:'#1c0a14',c3:'#4a2036'}); } }); };
  // ---- prepare: the stance, the camera comes in. The floor under him splits and heats, and small cuts score the floor round him, each a
  // short one of what is to come, faster and faster, crossing each other the way the two lines will
  if(mk) mk.play('iaiReady',{yaw:yaw0,speed:1.2}); else { plSeq([['gc02',.14],['gc03',.14],['gc04',9]]); pl.target='iaiReady'; pl.ps=18; }
  Cn.move({x:x0,y:y0-BODY*.6,zoom:1.7,tilt:.1},.6); GFX.ambient(.62,.6,.7,3); Cn.SND.inhale(1.1,.5); duck(.3,.6); F.img&&F.img('v3_fissure_b');
  K.cool(x0,y0,{kind:'scorch',r:300,start:.5,life:3,pal:ZP,light:0});
  { const rot=rot0, Lc=GFX.light(x0,y0,300,ZP.l,0,.45,{hold:T1,z:160});
    GFX.add(T1,(k,t)=>{ const q=sat(t/.9), g=eo3(q), q2=sat(t/T1), H=K.heat(ZP,mix(.92,.14,q*q)), r=mix(150,620,g)*(1+.25*q2); Lc.a=sat(t/.5)*(.3+.75*q2*q2)*(1-.75*sat((t-T1+.32)/.1)); Lc.r=300+hw*(.5+1.1*q2);
      if(!F.low) F.quad(mFS,x0,y0,r*1.04,r*1.04,rot,{a:.8*sat(t/.1),ero:mix(.5,.1,g)});
      F.quad(mFB,x0,y0,r,r,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:1,gain:2.6*H.g*mix(.5,1.25,q),bgain:1.2*H.g,ero:mix(.6,.1,g)}); }); }
  after(.38,()=>GFX.ambient(.44,.4,.5,2.4));
  [.34,.46,.56,.64,.71,.77].forEach((d,i)=>after(d,()=>{ const L=i%2?LB:LA, sw=[.52,-.46,-.3,.27,.12,-.1][i], am=L.a+Math.PI/2*(i%4<2?1:-1), rr=mix(130,40,i/5), S=mkC(x0+Math.cos(am)*rr,y0+Math.sin(am)*rr*.62,L.a+sw,mix(200,520,i/5),mix(15,28,i/5));
    scar(S,{draw:.07,cool:.7,z:mix(60,BODY*.5,i/5)}); GFX.light(S.cx,S.cy,S.lh*1.6,ZP.l,.4,.25,{z:60}); Cn.SND.tick(1.2+i*.1,.2); for(const sg of [-1,1]){ const p=S.pt(S.lh*sg); K.sparks(p[0],p[1],40,{pal:ZP,n:3,sp:[300,900],up:500,life:[.15,.4]}); } }));
  // the blade wakes: a white seam runs along it from the hilt to the point, a thin crimson flare where it ends
  const bladeGlow=()=>{ if(!mk){ K.flare(sx0,y0,BODY*.55,{pal:ZW,s:300,sx:3,sy:.25,dur:.2,gain:3}); return; } const tr=K.mats();
    GFX.add(.2,(k,t)=>{ const b=mk.wpt('sb'), s=mk.wpt('st'), u=eo3(sat(t/.12)), a=1-sat((t-.12)/.08), ps=[]; for(let i=0;i<5;i++){ const v=u*i/4; ps.push({x:mix(b[0],s[0],v),y:mix(b[1],s[1],v),z:mix(b[2],s[2],v),w:mix(10,4,i/4)}); }
      F.ribbon(tr.trC,ps,{...CW,gain:5,a}); });
    after(.1,()=>{ const s=mk.wpt('st'); K.flare(s[0],s[1],s[2],{pal:ZW,s:160,sx:3,sy:.25,dur:.18,gain:3.5}); }); };
  after(.3,()=>{ K.dust(x0,y0,{n:12,r:90,sp:[260,620],a:.3,life:.9}); bladeGlow(); GFX.light(x0,y0,700,ZP.l,.7,.3,{z:160}); Cn.SND.shing(1.5,.5); Cn.SND.tick(1.5,.3); });
  // THE GATHER: from here to the click the field's power is drawn into the place he stands (and stays drawn there while he is away):
  // shells tightening, haze, the floor light growing (the kit's), and this skill's own streaks: thin threads of light that leave the cuts
  // already in the floor (and the dark at the edges) and run into the crossing, more, faster, longer and whiter the nearer the click.
  // (The kit's own spiral streaks are off: lit by the climax light they stood up all at once as a screen of needles.)
  const GA=K.gather(sx0,y0,BODY*.5,{dur:T1-.4,max:T1,pal:ZP,r:300,R:1500,n:0,shells:2,gain:1.1});
  { let acc=0, ac2=0, ac3=0, tp=0; GFX.add(T1-.64,(k,t)=>{ const dt=Math.max(0,t-tp); tp=t; const q=sat(t/(T1-.64)); acc+=(8+60*q*q)*dt;
      while(acc>=1){ acc-=1; let px, py; if(cuts.length&&Math.random()<.65){ const S=cuts[Math.floor(Math.random()*cuts.length)], p=S.pt(rand(-1,1)*S.lh); px=p[0]; py=p[1]; } else { const a=rand(0,TAU), d=hw*rand(.35,1.1); px=x0+Math.cos(a)*d; py=y0+Math.sin(a)*d*FSY; }
        GFX.pt({x:px,y:py,z:rand(10,160),vx:0,vy:0,vz:rand(0,120),tx:x0,ty:y0,tz:BODY*.5,pull:mix(4,8,q)*rand(.85,1.15),life:mix(.5,.34,q),s:rand(2.5,4.5)*(1+.4*q),m:3,len:mix(.04,.07,q),c:GFX.rgb(Math.random()<mix(.25,.6,q)?'#ffffff':ZP.s),c3:'#ffffff',c2:ZP.b,L:3}); }
      // crackling sparks circling the point, tighter and faster as it fills; grit and chips lifting off the cracked floor toward it
      ac2+=(6+50*q*q)*dt; while(ac2>=1){ ac2-=1; const a=rand(0,TAU), rr=mix(260,120,q)*rand(.5,1), oz=BODY*.5+rand(-.4,.4)*rr*.5;
        GFX.pt({x:x0,y:y0,z:BODY*.5,oc:[x0,y0,oz],or:rr,oa:a,ow:(Math.random()<.5?1:-1)*rand(6,11)*(1+q),ok:0,oz0:oz,ob:rr*.3,life:rand(.1,.26),s:rand(4,7),m:3,len:.03,c:GFX.rgb(Math.random()<.5?'#ffffff':ZP.s),c3:'#ffffff',c2:ZP.b,fk:4,L:3}); }
      ac3+=(3+16*q)*dt; while(ac3>=1){ ac3-=1; const a=rand(0,TAU), d=rand(120,520);
        GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vx:0,vy:0,vz:rand(60,200),g:-120*(1+q),drag:.6,tx:x0,ty:y0,tz:BODY*.5,pull:rand(.4,1)*(1+q),life:rand(.9,1.5),s:rand(3,7),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4a3a3e'),c2:'#0a0608',shadow:true,fk:4,L:2}); } },.3); }
  // two rings of blade light wound round him at the height of the blade, turning against each other, broken into three arcs each: they tighten,
  // speed up and brighten until the draw, then are cut loose by it (thrown outward and gone). Red haze climbs off the scorched floor under them
  { let am=0, tp=0; GFX.add(1.05,(k,t)=>{ const q=sat(t/.75), out=sat((t-.75)/.3), dt=Math.max(0,t-tp); tp=t;
      for(let rg=0;rg<2;rg++){ const sg=rg?-1:1, R=mix(330,150,eo3(q))*(1+1.6*eo3(out))*(rg?.82:1), zc=BODY*(rg?.35:.6), sp=sg*(2+9*q*q)*t+rg*1.3+rot0, A_=(.12+.55*q)*(1-out)*(1-out), w=mix(3,7,q)*(1-out*.6);
        if(A_<=.01) continue;
        for(let ar=0;ar<3;ar++){ const a0=sp+ar*TAU/3, len=mix(.5,1.3,q); for(let s=0;s<6;s++){ const u0=a0+len*s/6, u1=a0+len*(s+1)/6, f=1-s/6;
          GFX.line(MKS,x0+Math.cos(u0)*R,y0+Math.sin(u0)*R*FSY,zc+Math.sin(u0*2+rg)*R*.08,x0+Math.cos(u1)*R,y0+Math.sin(u1)*R*FSY,zc+Math.sin(u1*2+rg)*R*.08,w*(.4+.6*f),s<2?RW:RD,A_*(.35+.65*f),0,ar,1,0); } } }
      am+=(10+40*q)*dt*(1-out); while(am>=1){ am-=1; const a=rand(0,TAU), d=rand(80,300);
        GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,30),vx:-Math.cos(a)*40,vy:-Math.sin(a)*20,vz:rand(120,320)*(1+q),g:-40,drag:.8,life:rand(.6,1),s:rand(14,26),rot:rand(0,TAU),vr:rand(-1.5,1.5),m:8,c:GFX.rgb(Math.random()<.3?ZP.l:ZP.b),c2:ZP.d,fade:'in',L:2}); } },.12); }
  // the breath before the draw
  after(.76,()=>Cn.hush(.15,{a:.32,snd:false}));
  after(.8,()=>{ Cn.move({zoom:.94,roll:-.04},.9,'lin'); GFX.ambient(.5,.43,.5,1.2); });
  // ---- build: line A (the draw is one hard frame), then line B faster, then the net: cut after cut across the fields, the gaps closing
  after(.9,()=>{ if(mk) mk.play('draw',{yaw:yaw0}); else { pl.target='slashU'; plSeq([['gc05',.03],['gc06',.05],['gc07',9]]); } pass(LA,.5,f0>0?1:-1);
    hitstop=Math.max(hitstop,.05); K.flare(sx0,y0,BODY*.5,{pal:ZW,s:180,sx:1.6,sy:.3,dur:.1,gain:3.5});
    // the draw flash runs out from the blade along line A both ways over three frames, so it is the start of the cut and not a bar switched on
    GFX.add(.2,(k,t)=>{ const g=eo3(sat(t/.06)), a=1-sat((t-.06)/.14), r=LA.ev*.75*g; for(const sg of [-1,1]){ const p=LA.pt(r*sg); GFX.line(MKS,sx0,y0,BODY*.5,p[0],p[1],BODY*.5,mix(26,10,g),RD,a*.8,0,sg,1,0); GFX.line(MKS,sx0,y0,BODY*.5,p[0],p[1],BODY*.5,mix(8,3,g),RW,a,0,sg,1,0); } }); K.dust(x0,y0,{n:12,r:120,sp:[400,1000],a:.4,life:.9}); });
  after(1.4,()=>{ if(mk) mk.play('cutD',{yaw:yaw0+Math.PI*.8}); else plSeq([['gm08',.03],['gm09',.05],['gm10',9]]); pass(LB,.4,f0>0?-1:1); hitstop=Math.max(hitstop,.04); GFX.ambient(.42,.34,.4,1.2); });
  // ---- the split: he breaks into twelve shadows that stand round the field in the draw stance; the camera pulls out to hold them all
  after(1.72,()=>{ if(mk) mk.ghost({life:.35,a:.9,c:'#ff4a5a'}); pl.visible=false; K.flare(sx0,y0,BODY*.5,{pal:ZW,s:200,sx:2.6,sy:.3,dur:.14,gain:4}); K.sparks(x0,y0,BODY*.5,{pal:ZP,n:24,sp:[600,1900],up:500,life:[.2,.5]}); K.dust(x0,y0,{n:10,r:40,sp:[300,900],a:.4});
    GFX.light(x0,y0,hw*.8,ZP.l,.7,.25,{z:160}); Cn.move({zoom:.62,roll:0,y:y0-hh*.06},.75,'io'); GFX.ambient(.36,.3,.38,3); SFX.whoosh(1.5,.7); Cn.SND.tick(1.3,.3); });
  // each afterimage steps out of the dark at its own edge a moment before its turn (a white body on a pool of its own light, a puff of
  // white sparks), so the field fills with them in the order they will cut, faster and faster
  SH.forEach((s,i)=>{ const j=ORD.indexOf(i), ta=Math.max(1.76,when[i]-mix(.42,.24,j/11));
    after(ta,()=>{ const wt=when[i]-ta, dd=Math.max(.11,.2-j*.008); if(mk) shd({x0:s.ax,y0:s.ay,x1:s.bx,y1:s.by,yaw:Math.atan2((s.by-s.ay)/FSY,s.bx-s.ax),wait:wt,dur:dd,clip:['cutA','cutB','cutD','cutC'][i%4],hold:.22});
      GFX.add(wt+dd+.5,(k,t)=>{ const a=sat(t/.08)*(1-sat((t-wt)/.12)), b=sat((t-wt-dd)/.06)*(1-sat((t-wt-dd-.1)/.4)); GFX.floor(GLW,s.ax,s.ay,260,260,0,RGL,a*.34); if(b>0) GFX.floor(GLW,s.bx,s.by,300,300,0,RGL,b*.4); });
      for(let n=0;n<10;n++){ const a=rand(0,TAU), v=rand(200,700); GFX.pt({x:s.ax,y:s.ay,z:rand(20,BODY),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(100,600),g:500,drag:2,life:rand(.2,.4),s:rand(2.5,4.5),m:3,len:.04,c:RGL,c2:ZP.b,L:3}); }
      // where it stops it sheds itself: dark wisps rising off the body as it thins, red cinders in them
      after(wt+dd+.22,()=>{ for(let n=0;n<8;n++) GFX.pt({x:s.bx+rand(-50,50),y:s.by+rand(-20,20),z:rand(40,BODY*1.6),vx:rand(-60,60),vy:rand(-30,30),vz:rand(120,320),g:-60,drag:1,life:rand(.5,.8),s:rand(10,18),rot:rand(0,TAU),vr:rand(-2,2),m:8,b:'alpha',c:GFX.rgb('#140508'),c2:'#000000',fade:'in',L:2});
        for(let n=0;n<6;n++) GFX.pt({x:s.bx,y:s.by,z:rand(40,BODY*1.4),vx:rand(-120,120),vy:rand(-60,60),vz:rand(200,500),g:-100,drag:1.2,life:rand(.4,.7),s:rand(2,3.5),m:3,c:RGL,c2:ZP.b,L:3}); }); }); });
  ORD.forEach((k,j)=>after(when[k],()=>{ cross(k,j); Cn.roll((j%2?1:-1)*.015); GFX.ambient(.36-j*.006,.3-j*.01,.38-j*.01,8); }));
  after(1.9,()=>{ SFX.heart(.9); for(const L of lines) for(const u of [-.75,-.35,.35,.75]){ const p=L.pt(L.ev*u); K.embers(p[0],p[1],90,{pal:ZE,n:7,life:1,s:1.2,up:520,z:40}); } });
  // ---- the return: all twelve come back into the place he left at once, and he is there again with the blade going home
  after(tRet,()=>{ SH.forEach((s,i)=>{ const d=.05+i*.012, ps=[]; if(mk) shd({x0:s.bx,y0:s.by,x1:x0,y1:y0,yaw:Math.atan2((y0-s.by)/FSY,x0-s.bx),wait:d,dur:.2,clip:i%2?'cutA':'cutD',merge:true});
      for(let j=0;j<6;j++){ const u=j/5; ps.push({x:mix(s.bx,x0,u),y:mix(s.by,y0,u),z:BODY*.5+Math.sin(u*Math.PI)*40}); } K.trail(ps,{pal:ZP,w:30,dur:.34,draw:.2,gain:.9,delay:d}); });
    Cn.move({zoom:.8,y:y0-BODY*.6},T1-.34-tRet,'io'); SFX.whoosh(1.2,.8); });
  after(tRet+.12,()=>{ pl.visible=true; if(mk){ mk.play('notoS',{yaw:yaw0,blend:.05,speed:1.09}); mk.ghost({life:.3,a:.8,c:'#ff4a5a'}); } else { plSeq([['gc08',.1],['gc09',.12],['gc10',.14],['gc11',.16],['gc12',9]]); pl.target='iaiDone'; pl.ps=30; } });
  after(tRet+.42,()=>{ K.flare(sx0,y0,BODY*.5,{pal:ZW,s:260,sx:3,sy:.22,dur:.16,gain:4}); Cn.SND.tick(1.4,.4); });
  // ---- the held breath: the camera keeps coming in (no jump), the floor goes dark, and in the last .3s the light of every scar and of the
  // two lines is drawn out of them into the crossing: streaks run in along the cuts and from the edges, a white point swells there
  after(T1-.34,()=>{ Cn.hush(.34); GFX.ambient(.3,.22,.26,14); Cn.move({zoom:.95,roll:0},.34,'io'); SFX.heart(1.2); for(const e of onScreen(300)) held(e);
    for(const S of cuts) for(let n=0;n<3;n++){ const p=S.pt(rand(-1,1)*S.lh); GFX.pt({x:p[0],y:p[1],z:rand(10,80),vx:0,vy:0,vz:rand(50,200),tx:x0,ty:y0,tz:BODY*.5,pull:rand(7,9),life:rand(.28,.34),s:rand(3,5),m:3,len:.05,c:GFX.rgb(n?ZP.s:'#ffffff'),c3:'#ffffff',c2:ZP.b,L:3}); }
    for(let n=0;n<36;n++){ const a=rand(0,TAU), d=hw*rand(.5,1.15); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,300),vx:0,vy:0,vz:0,tx:x0,ty:y0,tz:BODY*.5,pull:rand(7,9),life:rand(.28,.34),s:rand(3,5.5),m:3,len:.06,c:GFX.rgb(n%3?ZP.s:'#ffffff'),c3:'#ffffff',c2:ZP.b,L:3}); } });
  // the white point: it swells through the breath, stands still and full through the frozen frames, and is let go into the blast
  // (it swells, then in the last frames before the click it is crushed to a small hard point: the light is drawn in before it goes)
  GFX.add(.34+FZ+.14,(k,t)=>{ const sw=sat(t/.34), hold=t<.34+FZ, f=sat((t-.34-FZ)/.14), cr=sat((t-.2)/.12), s=mix(40,hw*.15,eo3(sat(t/.2)))*(1-.72*cr)*(1+2.2*f), z=BODY*.5;
    GFX.bill(GLW,x0,y0,z,s*2.2,s*2.2,0,RGL,(.2+.3*sw)*(1-.5*cr)*(1-f)); GFX.bill(GLW,x0,y0,z,s,s,0,RW,(.4+.6*sw)*(hold?1:(1-f)*(1-f))); },T1-.34);
  // ---- the click (T1): everything stops for FZ: the colour split, the white point, the whole net standing black against it, one hard
  // shake and the low hit. Only then (T1+FZ) does it all go: the dark mass, the four walls, the fins, the bodies thrown, the camera out
  const NET=GFX.st(3,'mix',{c3:[0,0,0]}), NK=[0,0,0];
  after(T1+FZ-.02,()=>{ for(const L of lines) if(L.h) L.h.dead=true;
    if(!F.low) [[LA,-1,1100],[LA,1,1700]].forEach(([L,sg,r],i)=>{ const p=L.pt(r*sg); K.vsmoke(p[0],p[1]-260,{s:760+i*60,dur:1.5,rise:520,vx:sg*320,c:'#14060c',c2:'#4a1830',a:.3}); });
    [[LA,-1,2200],[LA,1,1800],[LB,-1,2450],[LB,1,1700]].forEach(([L,sg,h])=>{ wall(L,sg,h); const ps=[], fr=Math.min(L.len,L.ev*2.3); for(let i=0;i<9;i++){ const u=i/8, p=L.pt(mix(200/L.kf,fr,u)*sg); ps.push({x:p[0],y:p[1],z:mix(BODY*.6,h*.3,Math.sin(u*Math.PI*.5))}); } K.trail(ps,{pal:ZW,w:75,dur:.6,draw:.1,hold:.14,gain:1.25}); }); });
  after(T1,()=>{ SFX.click(); Cn.SND.tick(.6,.3);
    Cn.peak(x0,y0-BODY*.5,{ca:.03,blur:.06,tint:'#ff2a3a',a:.12,hold:FZ,out:.14}); hitstop=Math.max(hitstop,FZ); Cn.shake(1.2); GFX.light(x0,y0,hw*1.5,'#ff3a40',.6,.5,{z:320}); Cn.SND.hit(1); SFX.boom(1.5,1); SFX.shatter(.9);
    GFX.ambient(.62,.4,.44,20);
    // the net: black cracks along every cut and both lines, held for the frozen frames and a little after, then gone over five frames
    GFX.add(.32,(k,t)=>{ const a=t<.15?1:Math.pow(1-sat((t-.15)/.17),2);
      for(const S of cuts){ const p=S.pt(-S.lh*1.04), q=S.pt(S.lh*1.04); GFX.line(NET,p[0],p[1],0,q[0],q[1],0,S.w*.9,NK,a*.9,.05,S.sd,6,.5); }
      for(const L of lines){ const p=L.pt(-L.len), q=L.pt(L.len); GFX.line(NET,p[0],p[1],0,q[0],q[1],0,40,NK,a*.85,.05,0,6,.5); } }); });
  after(T1+FZ,()=>{
    GFX.ripple(x0,y0,hw*2.4,{life:.45,s:.5,w:.08});
    after(.02,()=>{ Cn.move({zoom:.5,tilt:.2,y:y0-hh*.2},.7,'out'); Cn.shake(1.6); });
    // residue: each half of a line is two scars, the inner one with the shorter life, so the wound goes dark from the crossing outward
    for(const L of lines) for(const sg of [-1,1]){ const a=L.pt(40*sg), b=L.pt(L.ev*.95*sg), c=L.pt(L.len*sg); K.coolLine(a[0],a[1],b[0],b[1],{w:230,pal:ZP,life:TE-T1+.1,hot:.8,gain:1.3,grow:.08}); K.coolLine(b[0],b[1],c[0],c[1],{w:210,pal:ZP,life:TE-T1+.9,hot:.85,gain:1.3,grow:.1,delay:.05}); }
    K.cool(x0,y0,{kind:'crack2',r:900,rot:rot0,pal:ZP,life:TE-T1+.4,hot:.75,grow:.2});
    // the floor breaks where the cuts cross: three clusters of split stone thrust up (strata, chipped edges, crimson light in the cracks)
    K.rocks(x0,y0-90,{n:4,r:300,s:[70,200],kind:'crag',rock:'#3a1e26',pal:ZP,glow:.9,dur:1.5,out:.5,shadow:1,a0:Math.PI*1.05,a1:Math.PI*1.95});
    for(const sg of [-1,1]) K.rocks(...LA.pt(LA.ev*.6*sg),{n:3,r:200,s:[60,150],rock:'#3a1c24',pal:ZP,glow:.8,dur:1.25,out:.5,shadow:1,delay:.06});
    GA.release({s:1.3});
    // every mark bursts, nearest first and each on its own beat: the wound tears open as one long sliver of light along its own slant (length,
    // angle and life differ per body) that stretches and thins to nothing, and blood-dark droplets and red grit are thrown off it
    marks.filter(m=>!m.e.dead).sort((a,b)=>dist(a.e)-dist(b.e)).forEach((m,i)=>{ const e=m.e, ex=e.x, ey=e.y, ez=(e.z||0)+e.h*.55, r1=(m.sd*7.3)%1, r2=(m.sd*3.1)%1, d=m.a+.5+r1*.6, L_=mix(110,300,r2), lf=mix(.12,.22,r1); after(.03+Math.min(.22,dist(e)/(hw*2.6)*.22)+r2*.06,()=>{
      GFX.add(lf,(k)=>{ const s=L_*eo3(sat(k*1.6))*(1+.2*k), a=(1-k)*(1-k), cx=Math.cos(d)*s, cz=Math.sin(d)*s; GFX.line(MKS,ex-cx,ey,ez-cz,ex+cx,ey,ez+cz,mix(16,2,k),RP,a,0,m.sd,1,0); GFX.line(MKS,ex-cx*.7,ey,ez-cz*.7,ex+cx*.7,ey,ez+cz*.7,mix(4,1,k),RW,a,0,m.sd,1,0); if(k<.35) GFX.bill(GLW,ex,ey,ez,mix(40,90,r2),mix(40,90,r2),0,RGL,(1-k/.35)*.5); });
      for(let n=0;n<5;n++){ const b=d+rand(-.5,.5)+(n%2?Math.PI:0), v=rand(200,600); GFX.pt({x:ex,y:ey,z:ez,vx:Math.cos(b)*v,vy:rand(-80,80),vz:Math.sin(b)*v+rand(100,300),g:1400,drag:.8,life:rand(.35,.6),s:rand(3,6.5),m:3,b:'alpha',c:GFX.rgb('#5a0410'),c2:'#1a0004',L:2}); }
      if(i<5) cutFlash(e,m.a+Math.PI/2,ZP,170); K.sparks(ex,ey,ez,{pal:i%2?ZE:ZP,n:7,sp:[500,1700],up:900,life:[.2,.55]}); if(!e.dead) hurt(e,Dm*.15); }); });
    // the net goes up, nearest first: every cut throws its own fin, and no two are the same height
    cuts.slice().sort((a,b)=>a.d-b.d).forEach((S,i)=>{ fin(S,mix(200,340,sat(S.lh/(hw*1.6)))*rand(.85,1.15),.05+Math.min(.34,S.d/(hw*2.6)*.3),i%3===0); if(i%3===0) after(.05+i*.03,()=>SFX.boom(.9+i*.05,.5)); });
    // every body on the screen is thrown outward by the same wave, nearest first: it goes white, leaves the floor and draws the line of its flight
    { const L=onScreen(300).sort((a,b)=>dist(a)-dist(b)), sk=Math.max(1,Math.ceil(L.length/6)), lone=[]; for(const e of L){ if(lone.length<9&&!lone.some(o=>Math.hypot(o.x-e.x,(o.y-e.y)/FSY)<420)) lone.push(e); } L.forEach((e,i)=>after(.1+Math.min(.3,dist(e)/(hw*2.6)*.3),()=>{ if(e.dead) return; const dx=e.x-x0, dy=e.y-y0, l=Math.hypot(dx,dy)||1, ux=dx/l, uy=dy/l, up=rand(1500,2200), ex=e.x, ey=e.y, ez=e.h*.5;
        K.knock(e,{from:[x0,y0],dist:560,up,stun:1.4}); hurt(e,Dm*.2); GFX.add(.07,()=>{ if(!e.dead) e.flash=1; });
        if(lone.includes(e)) strip(u=>[ex+ux*620*u,ey+uy*620*u,ez+140*u],{pal:ZP,core:ZW,w:40,tp:tpNeedle,draw:.14,hold:.05,fade:.22,n:7,gain:1.2}); })); }
    for(const L of lines) for(const sg of [-1,1]) for(let i=0;i<4;i++){ const p=L.pt((420+i*L.ev*.42)*sg); for(const s of [-1,1]) K.dust(p[0],p[1],{n:4,dir:L.a+s*Math.PI/2,spread:.5,sp:[400,1300],a:.5,s:1.2,life:1.5,c:'#2a1220',c3:'#5a3044'}); K.sparks(p[0],p[1],BODY*.6,{pal:i%2?ZE:ZP,n:8,sp:[500,1900],up:1400,life:[.3,.8]}); } });
  after(T1+FZ+.15,()=>Cn.sweep(x0,y0,Dm,{max:.3}));
  // ---- the walls leave the crossing: low fire follows the scars outward and goes out behind itself, embers climbing, the camera comes home
  after(T1+.85,()=>{ Cn.move({zoom:.62},.9); if(mk) mk.play('stand'); GFX.ambient(.8,.74,.76,1.2); GFX.light(x0,y0,hw*1.8,'#ff4a30',.35,1.4,{z:160}); });
  if(vol&&!F.low) [[LA,-1],[LA,1],[LB,-1],[LB,1]].forEach(([L,sg],i)=>{ const a=L.pt(L.ev*.2*sg), b=L.pt(L.ev*.6*sg), c=L.pt(L.ev*1.1*sg);
    after(T1+.95,()=>K.vsheet(a[0],a[1],b[0],b[1],{h:300+i*30,thick:70,dur:.75,rise:.3,out:.4,pal:ZP,turb:1,heat:.8,band:.55,btop:.62,flow:.5,lit:.5})); after(T1+1.25,()=>K.vsheet(b[0],b[1],c[0],c[1],{h:320+(i%2?-10:10),thick:70,dur:.85,rise:.3,out:.6,pal:ZP,turb:1,heat:.8,band:.55,btop:.62,flow:.5,lit:.5})); });
  // embers leave the scars in a wave that walks outward from him as the fire goes out behind it
  [0,.22,.44,.66,.88].forEach((d,i)=>after(T1+.9+d,()=>{ for(const L of lines) for(const sg of [-1,1]){ const p=L.pt(L.ev*(.2+.26*i)*sg); K.embers(p[0],p[1],320,{pal:i%2?ZP:ZE,n:16,life:1.1,s:1.7,up:900,z:200}); if(i%2===0) K.sparks(p[0],p[1],40,{pal:ZE,n:5,sp:[100,400],up:1300,life:[.5,1]}); } }));
  after(TE-1.2,()=>Cn.back(1.1));
  after(TE,()=>{ ultStop(); if(mk) mk.free(); }); }

// SKY SWORD parts (sw_ult2). A sword assembled from lit solids, point down: (x,y) is the floor point under its point, z the height of the
// point, L its whole length. The full build (o.big) is two flagstones for the blade that meet in a ridge toward the camera (so one face takes
// the light and the other stands in shade), a fuller down the middle, two swept quillons, a boss, a grip and a pommel; the small one is a
// wedge and a bar. The floor cuts off what is driven into it.
//  o: {big, tilt (lean in the screen plane), pitch (lean toward the camera), yaw (turn about its own axis), vein, bvein (blade), bevel, heat, ero (blade),
//      eroH (hilt), a, shadow (darkness), alb, emis, glow, edge (edge light), noBlade, noHilt, lite (no pommel),
//      thick (small blade depth, .42), pom (big: pommel in the blade's steel instead of the red stone)}
const gsB=()=>lm('gsB',()=>FX3.mat({nz:'streak',n1:[.7,3,-3.2,0],n2:[1.6,1,-1.4,0],dist:.03,nk:.5,ero:.1,soft:.22,pm:[2,2.1,0,0],rk:[.5,1.05],gain:2.8,bgain:1.15,layer:'o',ord:4})),
  gsC=()=>lm('gsC',()=>FX3.mat({nz:'streak',n1:[.6,1,-4.5,0],nk:.16,ero:.12,soft:.2,pm:[2,4.2,0,0],rk:[.12,.4],gain:5,bgain:2.4,layer:'o',ord:5}));
const gsM=(ex,ey,ez,t,sx,sy,sz,sk=0)=>new Float32Array([ex[0]*sx,ex[1]*sx,ex[2]*sx,0, ey[0]*sy,ey[1]*sy,ey[2]*sy,0, ez[0]*sz-sk*sx*ex[0],ez[1]*sz-sk*sx*ex[1],ez[2]*sz-sk*sx*ex[2],0, t[0],t[1],t[2],1]);
function gsword(x,y,z,L,o={}){ const F=FX3; if(!F.on||!F.solids||!F.solids()) return; const tl=o.tilt||0, pt=o.pitch||0, yw=o.yaw||0, cp=Math.cos(pt), big=!!o.big, nr=v=>{ const d=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/d,v[1]/d,v[2]/d]; }, neg=v=>[-v[0],-v[1],-v[2]],
    a=[Math.sin(tl)*cp,Math.sin(pt),Math.cos(tl)*cp], l0=nr([a[2],0,-a[0]]), n0=[a[1]*l0[2]-a[2]*l0[1],a[2]*l0[0]-a[0]*l0[2],a[0]*l0[1]-a[1]*l0[0]], cw=Math.cos(yw), sw=Math.sin(yw),
    l=[l0[0]*cw+n0[0]*sw,l0[1]*cw+n0[1]*sw,l0[2]*cw+n0[2]*sw], n=[n0[0]*cw-l0[0]*sw,n0[1]*cw-l0[1]*sw,n0[2]*cw-l0[2]*sw], at=(u,s=0,v=l)=>[a[0]*u+v[0]*s,a[1]*u+v[1]*s,a[2]*u+v[2]*s],
    eb=o.ero||0, eh=o.eroH??eb, sh=o.shadow?[.55,.28,o.shadow]:null, vn=o.vein??.35, em=o.emis||'#ffb428', bl=!o.noBlade, hl=!o.noHilt,
    st={alb:o.alb||'#caa24c',emis:em,rimC:'#fff2c8',spec:o.spec??1.1,rim:o.rim??.45,bump:.9,tone:.2,vein:vn,heat:o.heat||0,ero:eb,a:o.a??1}, dk={alb:'#3a2a14',emis:em,rimC:'#ffd890',spec:.6,rim:.3,bump:1.4,tone:.3,vein:vn*.5,heat:0,ero:eh,a:o.a??1},
    ub=L*(big?.64:.7), Wb=L*(big?.125:.2);
  let lf=1, rt=1;
  if(big){ if(bl){ const sz=ub/1.3, sx=Wb, sy=Wb*1.15, bv=o.bevel??.52, cb=Math.cos(bv), sb=Math.sin(bv), bvn=o.bvein??vn*.16, A0=o.alb||[.79,.64,.3], A=typeof A0==='string'?GFX.rgb(A0):A0;
      for(const c of [1,-1]){ const ex=[c*l[0]*cb-n[0]*sb,c*l[1]*cb-n[1]*sb,c*l[2]*cb-n[2]*sb], ey=[n[0]*cb+c*l[0]*sb,n[1]*cb+c*l[1]*sb,n[2]*cb+c*l[2]*sb], lit0=mix(.15,1.3,sat(.5-ey[0]*1.3)), dkc=lit0<.8, lit=lit0*(dkc?1-.25*(o.contrast||0):1-.22*(o.contrast||0)); if(c>0) rt=lit0; else lf=lit0;
        F.solid('slab',3,x,y,z,{M:gsM(ex,ey,neg(a),[a[0]*sz+ex[0]*.2*sx,a[1]*sz+ex[1]*.2*sx,a[2]*sz+ex[2]*.2*sx],sx,sy,sz,.0508),...st,alb:[A[0]*lit*(dkc?1.1:1),A[1]*lit*(dkc?.72:1),A[2]*lit*(dkc?.6:1)],vein:bvn,bump:.2,tone:.08,spec:(dkc?.3:1.7)*(o.gloss||1),rim:(dkc?.08:.55)*(o.gloss||1),shadow:sh,...(o.forge?{detail:o.forge,strata:o.strata??7,ore:o.ore??1,edge:.035,glow:o.cglow||0,seed:c+3.3}:{}),ord:0}); }
      const zr=(ub-L*.05)/1.3; F.solid('spike',2,x,y,z,{M:gsM(l,n,neg(a),at(L*.05+zr),Wb*.3,Wb*.5,zr),...st,alb:[A[0]*1.25,A[1]*1.22,A[2]*1.15],vein:bvn*1.5,bump:.3,tone:.1,spec:1.7,ord:1}); }
    if(hl){ for(const c of [1,-1]){ const ez=nr([l[0]*c-a[0]*.24,l[1]*c-a[1]*.24,l[2]*c-a[2]*.24]), d=a[0]*ez[0]+a[1]*ez[1]+a[2]*ez[2], ex=nr([a[0]-ez[0]*d,a[1]-ez[1]*d,a[2]-ez[2]*d]), zg=L*.155/1.3, o0=at(ub+L*.02);
        F.solid('spike',c>0?0:1,x,y,z,{M:gsM(ex,n,ez,[o0[0]+ez[0]*zg*.1,o0[1]+ez[1]*zg*.1,o0[2]+ez[2]*zg*.1],L*.1,L*.1,zg),...st,vein:vn*.7,ero:eh,shadow:sh,ord:2}); }
      const sb=L*.075; F.solid('boulder',1,x,y,z,{M:gsM(l,n,a,at(ub+L*.02-.4*sb),sb*1.25,sb*.9,sb),...st,vein:vn*1.8,ero:eh,ord:3}); } }
  else { const sz=ub/1.3; F.solid('spike',2,x,y,z,{M:gsM(l,n,neg(a),at(sz),Wb/.6,Wb*(o.thick||.42),sz),...st,shadow:sh,ord:0});
    const zg=L*.36/1.3; F.solid('slab',0,x,y,z,{M:gsM(a,n,l,at(ub,-.35*zg),L*.085,L*.2,zg,-.104),...dk,ord:1}); }
  if(hl){ const zh=(L*.94-ub)/1.3; F.solid('slab',1,x,y,z,{M:gsM(l,n,a,at(ub+.3*zh),L*.062,L*.15,zh*1.1,.1476),...dk,ord:2});
    if(big||(!F.low&&!o.lite)){ const sp=L*(big?.078:.1); F.solid('boulder',0,x,y,z,{M:gsM(l,n,a,at(L*.955-.4*sp),sp,sp,sp),...st,ero:eh,vein:vn*1.5,...(big&&!o.pom?{alb:'#5a0a04',emis:'#ff3018',rimC:'#ffd0b0',heat:.45,spec:2.2,vein:.2}:{}),ord:3}); } }
  // its light. big: a white seam down the ridge, a thin line on each edge (the lit face's edge the brighter); small: one thread down the middle
  const gl=o.glow||0; if(gl>0&&bl){ const mB=gsB(), mC=gsC(), C=pc(GOLDF), CW={cA:GOLDF.b,cB:GOLDF.m,cM:GOLDF.h,cC:'#ffffff'}, sd=x*.013, e0=Math.min(.99,eb*1.3), ga=Math.min(1,gl)*(1-e0), gg=Math.max(1,gl),
      P=(u,s,w)=>{ const q=at(u,s); return {x:x+q[0],y:y+q[1]*FSY,z:Math.max(0,z+q[2]),w}; };
    if(!big){ const w=Wb*.3, ps=[P(ub,0,w),P(ub*.5,0,w),P(0,0,w)]; F.ribbon(mB,ps,{...C,a:ga,gain:3.2*gg,ero:.1+e0*.8,ulen:L*.8,t0:sd}); }
    else { const wr=Wb*.1, ps=[P(ub*.97,0,wr*.7),P(ub*.6,0,wr),P(ub*.25,0,wr),P(ub*.04,0,wr*.5)]; F.ribbon(mB,ps,{...C,a:ga*.8,gain:1.5*gg,ero:.1+e0*.8,ulen:L*.8,t0:sd}); for(const q of ps) q.w*=.34; F.ribbon(mC,ps,{...CW,a:ga,gain:4.2*gg,ero:.12+e0*.8,ulen:L*.6,t0:sd+3});
      const ed=o.edge??1; if(ed>0) for(const c of [1,-1]){ const k=(c>0?rt:lf)>.8?1:.4, w=Wb*.05*ed*(k<1?.6:1); const pe=[P(ub,c*.5*Wb,w),P(ub*.62,c*.5*Wb,w),P(ub*.235,c*.47*Wb,w),P(ub*.1,c*.2*Wb,w),P(0,0,w)];
          F.ribbon(mC,pe,{...CW,a:ga*k,gain:3.2*gg*k,ero:.12+e0*.8,ulen:L*.6,t0:sd+c+5}); } } } }
// SKY SWORD - 천검 낙하 (redev 2026-11-24, third pass): a fall type ultimate over the whole screen. He raises his blade and the sky opens: shafts of
// light come down on the field, and down each one a sword (three sizes, each at its own lean), one after another and faster and faster, each
// breaking the floor where it lands and throwing what stood there. The planted swords hum; light is drawn off them in streams toward the point
// of a blade the size of a tower that has been sinking out of the dark over the mark, and on four beats lightning stands between them and it.
// It is drawn back up for a breath and falls. The floor bursts: a white core, a ring of light and a wall of dark dust running out over the
// ground that throws every enemy as it passes; every planted sword lets go as the ring reaches it and fades out where it stands. The tower
// stands in the wound and cools, then (2026-11-27, by the user's order: the swords do not break) grows a little brighter, lets go of its
// light in rising motes and fades out softly.
function ultRain(id){ ultStart(id);
  // (asset pass) build the real-stone meshes now, not on the frame the blow lands
  if(FX3.prepDeep) FX3.prepDeep();
  const mk=window.MK&&MK.on()?MK:null, Cn=X.cine, K=K3, F=FX3, Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), f0=pl.f, yaw0=f0>0?0:Math.PI, tS=RT, now=()=>RT-tS,
    TB=2.4, TD=3.2-1/3, T1=3.2, TC=3.61, TH=3.85, TE=4.95, RD=.62, GR=7400, LB=2700, UB=LB*.64, WB=LB*.125, Px=x0, Py=y0-Math.max(hh*.35,330), G=GOLDF, GW=SGW,
    GWB={d:'#3a2008',b:'#ffb428',m:'#ffe7a0',h:'#ffffff',l:'#ffd070',s:'#fff0c0'}, GX={d:'#120702',b:'#ff5a0a',m:'#ffbe38',h:'#fffbe8',l:'#ffb030',s:'#ffe0a0'}, C=pc(G), CW={cA:G.b,cB:G.m,cM:G.h,cC:'#ffffff'}, gold=GFX.rgb('#ffc040'), RS=hw*1.7,
    LBW={d:'#1a1004',b:'#ffb93c',m:'#fff0cc',h:'#ffffff',l:'#86602a',s:'#fff4dc'}, CB=pc(LBW), CBW={cA:LBW.b,cB:LBW.m,cM:LBW.h,cC:'#ffffff'}, cool=[1,.86,.6], FT=.2,
    SH=GFX.st(12,'alpha',{L:0}), GL=GFX.st(8,'add',{L:0}), RG=GFX.st(2,'add',{L:0,c2:GFX.rgb('#ff7a08'),c3:GFX.rgb('#fff4d0')}), RM=GFX.st(2,'alpha',{L:0,c2:[.03,.02,.012],c3:[.12,.085,.05]}), CRK=GFX.st(13,'add',{L:0,c2:GFX.rgb('#5a1a02'),c3:GFX.rgb('#fff4d0')}), GN=GFX.st(8,'add',{L:0}), SKL=GFX.st(3,'add',{L:0}),
    sw=[], arcs=[], fly=[], bg={lit:-9,cs:0}, hs=n=>{ const s=Math.sin(n*127.1+311.7)*43758.5453; return s-Math.floor(s); },
    fd=(ax,ay,bx,by)=>Math.hypot(ax-bx,(ay-by)/FSY), hurt=(e,d)=>dmg(e,Math.min(d,Math.max(1,e.hp*.8)),{crit:true,kb:0}), pins=[], seal=e=>{ if(!e.pin){ e.pin=now()+.001; pins.push(e); } e.stun=Math.max(e.stun,T1-now()+.3); };
  // the height of the tower's point over the mark at ult time t (a pure function of time): it sinks without stopping, is drawn back up while the field holds its breath, and falls
  const tipZ0=t=>{ const hD=2000; if(t<2) return 900+1600*Math.pow(1-sat((t-1.3)/.7),2.5); if(t<TB) return 900; if(t<TD){ const u=sat((t-TB)/(TD-TB)); return 900+1100*u*u*(3-2*u); }
    if(t<T1){ const u=(t-TD)/(T1-TD); return hD-(hD+30)*u*u; } return -LB*.05; };
  // kit update 14: with the baked sequences loaded the tower is a Blender model (sw_gs_hang: it sinks out of the dark leaning and turning on its
  // axis and is drawn back up; sw_gs_fall: it drops and rights itself point-down; sw_gs_hit: it plunges, tears up the floor in slabs that heave and
  // fall back, shudders, cracks and bursts into hot steel, the hilt drops and topples) and the sixteen are baked plunges (sw_rain_v0..2, mirrored
  // and scaled per sword). The FX3 stand-ins below are then not drawn.
  const BM=K.bakeMeta||{}, BKR=!!(F.on&&BM.sw_gs_hang&&BM.sw_gs_fall&&BM.sw_gs_hit)&&K.bakePre(['sw_gs_hang','sw_gs_fall','sw_gs_hit']), BKS=!!(F.on&&BM.sw_rain_v0&&BM.sw_rain_v1&&BM.sw_rain_v2)&&K.bakePre(['sw_rain_v0','sw_rain_v1','sw_rain_v2']), TF=T1-10/30;   // the baked pictures are used only if every page has arrived; if not (a slow phone, a first cast) the drawn version plays, and they keep loading for the next cast
  // [sequence, frame, height it is drawn at, point dx, point dy, point height] at ult time t (hang, 30 fps from t 1.3, is drawn about its centre
  // of mass, which the marks carry with the point)
  const gsAt=t=>{ if(t<TF){ const mk=BM.sw_gs_hang.marks, N=mk.length-1, f=Math.max(0,Math.min(N,(t-1.3)*30)), i=Math.floor(f), j=Math.min(N,i+1), w=f-i, a=mk[i], b=mk[j];
      return ['sw_gs_hang',f,mix(a[0],b[0],w),mix(a[1],b[1],w),mix(a[2],b[2],w),mix(a[3],b[3],w)]; }
    return t<T1?['sw_gs_fall',Math.min(9,(t-TF)*30),0,0,0,tipZ0(t)]:['sw_gs_hit',(t-T1)*30,0,0,0,-LB*.05]; },
    tipZ=t=>BKR&&t<TF&&t>1.3?gsAt(t)[5]:tipZ0(t);
  // where the point of the tower is (the lightning and the light drawn off the swords go there)
  const tipP=t=>{ if(!BKR||t>=TF) return [Px,Py]; const g=gsAt(t); return [Px+g[3],Py+g[4]]; };
  // how steel cools: white, gold, orange, a dull red, ash (k 0..1)
  const HC=[[0,1,.9,.6],[.22,1,.7,.2],[.5,.85,.42,.08],[.78,.34,.15,.05],[1,.05,.03,.025]], heatC=k=>{ let i=1; while(i<HC.length-1&&HC[i][0]<k) i++; const a=HC[i-1], b=HC[i], u=sat((k-a[0])/(b[0]-a[0])); return [mix(a[1],b[1],u),mix(a[2],b[2],u),mix(a[3],b[3],u)]; };
  // (asset r3) the sixteen swords' own build (a copy of gsword's small build for this ult only; gsword itself is left as it was). With o.rid the
  // blade is two polished faces that meet in a ridge (like the tower's): one face takes the light and is glossy, the other stands in shade, no vein
  // pattern; that costs one draw more, so it is used while the field is quiet and the plain wedge (low relief, no veins) after the blow
  const rsw=(x,y,z,L,o)=>{ const F=FX3; if(!F.on||!F.solids||!F.solids()) return; const tl=o.tilt||0, pt=o.pitch||0, yw=o.yaw||0, cp=Math.cos(pt), nr=v=>{ const d=Math.hypot(v[0],v[1],v[2])||1; return [v[0]/d,v[1]/d,v[2]/d]; },
      a=[Math.sin(tl)*cp,Math.sin(pt),Math.cos(tl)*cp], l0=nr([a[2],0,-a[0]]), n0=[a[1]*l0[2]-a[2]*l0[1],a[2]*l0[0]-a[0]*l0[2],a[0]*l0[1]-a[1]*l0[0]], cw=Math.cos(yw), sn=Math.sin(yw),
      l=[l0[0]*cw+n0[0]*sn,l0[1]*cw+n0[1]*sn,l0[2]*cw+n0[2]*sn], n=[n0[0]*cw-l0[0]*sn,n0[1]*cw-l0[1]*sn,n0[2]*cw-l0[2]*sn], at=(u,s=0)=>[a[0]*u+l[0]*s,a[1]*u+l[1]*s,a[2]*u+l[2]*s],
      ub=L*.7, Wb=L*(o.bw||.2), sz=ub/1.3, ea=o.ero||0, al=o.a??1, A=o.alb, na=[-a[0],-a[1],-a[2]], dk={alb:'#2e2416',emis:'#ffb428',rimC:'#ffd890',spec:.7,rim:.3,bump:.5,tone:.25,vein:0,heat:0,ero:ea,a:al};
    if(o.rid){ const sx=L*(o.bw||.2), sy=sx*1.15, cb=Math.cos(.52), sb=Math.sin(.52);
      for(const c of [1,-1]){ const ex=[c*l[0]*cb-n[0]*sb,c*l[1]*cb-n[1]*sb,c*l[2]*cb-n[2]*sb], ey=[n[0]*cb+c*l[0]*sb,n[1]*cb+c*l[1]*sb,n[2]*cb+c*l[2]*sb], lit0=mix(.15,1.3,sat(.5-ey[0]*1.3)), dkc=lit0<.8, lit=lit0*(dkc?.75:.85);
        F.solid('slab',3,x,y,z,{M:gsM(ex,ey,na,[a[0]*sz+ex[0]*.2*sx,a[1]*sz+ex[1]*.2*sx,a[2]*sz+ex[2]*.2*sx],sx,sy,sz,.0508),alb:[A[0]*lit*(dkc?1.1:1),A[1]*lit*(dkc?.72:1),A[2]*lit*(dkc?.6:1)],emis:'#ffb428',rimC:'#fff4d8',spec:(dkc?.3:2.2)*(o.spec??2.4)/2.4,rim:dkc?.08:.7,bump:.15,tone:.08,vein:0,heat:o.heat||0,ero:ea,a:al,ord:0}); } }
    else F.solid('spike',2,x,y,z,{M:gsM(l,n,na,at(sz),Wb/.6,Wb*(o.thick||.8),sz),alb:A,emis:'#ffb428',rimC:'#fff4d8',spec:o.spec??2.4,rim:o.rim??.8,bump:.1,tone:.05,vein:0,heat:o.heat||0,ero:ea,a:al,ord:0});
    const zg=L*.36/1.3; F.solid('slab',0,x,y,z,{M:gsM(a,n,l,at(ub,-.35*zg),L*.085,L*.2,zg,-.104),...dk,ord:1});
    const zh=(L*.94-ub)/1.3; F.solid('slab',1,x,y,z,{M:gsM(l,n,a,at(ub+.3*zh),L*.062,L*.15,zh*1.1,.1476),...dk,ord:2}); };
  // (asset pass) the floor bursting up round the wound where a light shaft used to stand: the ground splits and gold light leaks out of the
  // splits, soil and stones are thrown up in a cone and come down, and a plume of dust lit from below climbs off it (no meshes: floor decals,
  // particles and one smoke volume)
  const burst=(x,y,h,r)=>{ const sd=x*.013+y*.007, n=Math.round(42*(GFX.QK||1)), dk=heatC(.3);
    GFX.add(1.5,(k,t)=>{ const g=eo3(sat(t/.08)), hot=Math.exp(-t*2.2), fo=1-sat((t-1.1)/.4);
      GFX.floor(SH,x,y,r*1.15*g,null,sd,[0,0,0],.5*fo); GFX.floor(GL,x,y,r*1.1,null,0,gold,(.55*hot+.08)*fo);
      GFX.floor(CRK,x,y,r*1.5*g,null,sd,heatC(.2+.5*(1-hot)),Math.min(.9,.35+.6*hot)*fo,.92,sd*3.1,7,.12+.06*hot); });
    for(let i=0;i<n;i++){ const a=rand(0,TAU), el=rand(1.1,1.48), v=Math.sqrt(2*2600*h)*rand(.4,1), rr=rand(0,r*.45), big=i<8;
      GFX.pt({x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*FSY,z:rand(0,30),vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v,g:2600,drag:.2,life:rand(1,1.6),s:big?rand(22,34):rand(8,18),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(i%3?'#4a3c2c':'#6a5640'),c2:'#0a0806',shadow:true,bounce:.25,fk:5,L:2}); }
    for(let i=0;i<14;i++){ const a=rand(0,TAU), rr=rand(0,r*.6); GFX.pt({x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*FSY,z:rand(0,20),vx:Math.cos(a)*rand(40,200),vy:Math.sin(a)*rand(20,100),vz:rand(500,1400)*Math.sqrt(h/1000),g:500,drag:.9,life:rand(.5,1),s:rand(3,6),m:3,len:.05,c:GFX.rgb(Math.random()<.35?'#ffffff':'#ffd060'),c2:'#ff8a10',L:3}); }
    K.dust(x,y,{n:8,r:r*.5,sp:[r*1.2,r*3],a:.5,s:1.3,life:1.3,c:'#3a2e22',c3:'#8a7456'}); K.flare(x,y,40,{pal:G,s:120,dur:.12,gain:2.4}); GFX.light(x,y,r*3,'#ffc040',.9,.5,{z:60});
    // (asset r2) its dust: puffs of every size that climb, spread outward from the hole and thin out (not one round volume)
    for(let i=0;i<Math.round(9*(GFX.QK||1));i++){ const a=rand(0,TAU), rr=rand(.1,.6)*r, big=i<2, sp=rand(60,240); GFX.pt({x:x+Math.cos(a)*rr,y:y+Math.sin(a)*rr*FSY,z:rand(10,120),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.5,vz:rand(120,420)*Math.sqrt(h/800),g:-30,drag:.9,life:rand(.9,1.6),s:big?rand(40,60):rand(14,36),grow:big?rand(70,110):rand(30,70),m:5,b:'alpha',c:GFX.rgb(i%3?'#4a3e30':'#5e5040'),c2:'#000000',c3:i<4?'#c09050':'#8a7a66',er:.9,ns:rand(.9,1.6),w:1,a:rand(.2,.34),L:0}); } };
  // WAVE: a broad band of light running out over the floor, hard at its front and soft behind, that thins and dims as it goes (five frames or more)
  const wave=(x,y,r0,r1,dur,th=.2,a0=.75)=>{ const sd=x*.013+y*.007, R=r1*1.12; GFX.add(dur,k=>{ const e=1-Math.pow(1-k,1.8), r=mix(r0,r1,e), a=a0*Math.pow(1-k,1.25);
      GFX.floor(GL,x,y,r*1.3,null,0,gold,a*.2); GFX.floor(RG,x,y,R,null,0,gold,a*.55,r/R,sd,th*(1-.45*k),.07); }); };
  // MURK: the same band in dark dust (it follows the light and gives it something to stand against)
  const murk=(x,y,r0,r1,dur,th=.3,a0=.6)=>{ const sd=x*.017+y*.005, R=r1*1.12; GFX.add(dur,k=>{ const e=eo3(k); GFX.floor(RM,x,y,R,null,0,[.06,.042,.026],a0*sat(k*8)*Math.pow(1-k,2.2),mix(r0,r1,e)/R,sd,th*(1-.3*k),.09); }); };
  // SHOCK: the thin line of light at the very front of the great blow. It is uneven round its length, thins as it runs and is gone before it stops
  const shock=(x,y,r0,r1,dur,w,g=1)=>{ const sd=x*.011+y*.007, n=64; GFX.add(dur,k=>{ const e=eo3(k), r=mix(r0,r1,e), a=Math.pow(1-k,2.4), ps=[];
      for(let i=0;i<=n;i++){ const b=i/n*TAU, rr=r*(1+.05*Math.sin(b*3+sd)+.035*Math.sin(b*7+sd*2.3)); ps.push({x:x+Math.cos(b)*rr,y:y+Math.sin(b)*rr*FSY,z:4,w:w*(1-.72*k)*(.7+.3*Math.sin(b*5+sd))}); }
      F.ribbon(gsB(),ps,{...C,a,gain:2.3*g,ero:.1+k*.5,ulen:r1*.9,t0:sd}); for(const p of ps) p.w*=.3; F.ribbon(gsC(),ps,{...CW,a,gain:4.4*g,ero:.12+k*.5,ulen:r1*.6,t0:sd+3}); }); };
  // the time the great ring takes to reach a point d from the mark (it runs out as eo3 over RD)
  const ring=d=>RD*(1-Math.cbrt(Math.max(0,1-Math.min(.97,d/RS))));
  // lightning from a planted sword up to the point of the tower. Its broken line is the sword's own and does not change while it stands: it is drawn from
  // the sword in two frames, thick, and thins to a thread before it burns off from the sword end. The last ones are held until the breath
  const arc=(s,life,hold)=>{ const t=now(); arcs.push({s,t0:t,life,hold,sd:s.i*7.31+1.7}); s.kick=t; bg.lit=t; K.flare(s.x+Math.sin(s.tilt)*s.L*.9,s.y,s.L*.86,{pal:LBW,s:170,dur:.16,gain:3.2}); };
  const arcDraw=(A,t)=>{ const q=t-A.t0; if(q<0||q>=A.life) return; const s=A.s, sd=A.sd, zt=tipZ(t)+30, tq=tipP(t), Px=tq[0], Py=tq[1], ax=s.x+Math.sin(s.tilt)*s.L*.9, az=s.L*.86, d=Math.hypot(Px-ax,zt-az), n=12, P=[], u0=q/A.life;
    for(let i=0;i<n;i++){ const u=i/(n-1), j=Math.sin(u*Math.PI)*d*.085; P.push({x:mix(ax,Px,u)+(hs(sd+i)-.5)*2*j,y:mix(s.y,Py,u),z:mix(az,zt,Math.pow(u,.7))+(hs(sd+i*3.7)-.5)*2*j}); }
    const i1=Math.min(n,2+Math.floor(q/.035*(n-2))), i0=Math.min(i1-2,Math.max(0,Math.floor((q-(A.life-.08))/.08*(n-2)))), fl=.8+.2*Math.sin(t*61+sd*5), wb=A.hold?30+16*sat((t-A.t0)/A.life):mix(58,9,Math.pow(u0,.7)), g=A.hold?1:1.25-.55*u0,
      th=.65+.8*hs(sd*1.9), ps=P.slice(i0,i1).map((p,i)=>({x:p.x,y:p.y,z:p.z,w:wb*th*(1-.55*(i+i0)/n)*(.8+.4*hs(sd+(i+i0)*2.2))}));
    // (detail r3) where it touches: a hot point on the sword and a burst where it meets the tower while it is fresh; after it burns off a thin after-glow of the whole line
    if(q<.12||A.hold){ const c0=A.hold?.6+.4*fl:1-q/.12; GFX.bill(GL,ax,s.y,az,70*th,70*th,0,cool,.6*c0); GFX.bill(GN,ax,s.y,az,26*th,26*th,0,[1,1,.95],.8*c0); if(i1>=n) GFX.bill(GL,Px,Py,zt,110*th,110*th,0,cool,.45*c0); }
    if(!A.hold&&q>A.life-.1) for(let i=0;i<n-1;i++) GFX.line(SKL,P[i].x,P[i].y,P[i].z,P[i+1].x,P[i+1].y,P[i+1].z,4*th,[1,.88,.6],.5*(A.life-q)/.1,.1,0,3,.2);
    F.ribbon(gsB(),ps,{...CB,a:.9,gain:2.3*fl*g,ulen:d*.5,t0:sd}); for(const p of ps) p.w*=.32; F.ribbon(gsC(),ps,{...CBW,a:1,gain:4.6*fl*g,ulen:d*.4,t0:sd+2});
    if(!F.low) for(const kb of [3,7]){ if(kb<i0||kb>=i1) continue; const p=P[kb], gg=sat((q-.03)/.1), sg=hs(sd+kb*9.1)<.5?-1:1, bl=d*.17*gg*(.7+.7*th), br=[{x:p.x,y:p.y,z:p.z,w:wb*.45*th}];
        for(let m=1;m<=3;m++) br.push({x:p.x+sg*bl*m/3*.8+(hs(sd+kb+m*2.3)-.5)*bl*.3,y:p.y,z:p.z+bl*m/3*(.5+hs(sd+kb*1.7))+(hs(sd+kb+m*5.1)-.5)*bl*.3,w:wb*.45*th*Math.pow(1-m/3.3,1.6)}); F.ribbon(gsC(),br,{...CBW,a:.9,gain:3.4*fl*g,ulen:d*.3,t0:sd+kb}); } };
  // ---- one of the sixteen: a shaft of light finds its victim and narrows, the sword comes down it in a seventh of a second with its wake behind it,
  // the wake is still standing when it strikes; a white point, a band of light over the floor, cracks, then dust and stone
  const land=s=>{ s.on=true; const x=s.x, y=s.y, m=s.L/560; GFX.light(x,y,780*m,'#ffc040',1,.6,{z:90});
    // (asset r2) the sky's answer is a real stroke of lightning down onto it (a bent, branching channel that strikes twice and leaves an afterimage), not a shaft of light
    if(s.i%3===0) K.lightning(x,y,{pal:LBW,h:2300,w:5+4*m,strokes:1,span:.1+.06*m,branches:1+(s.i%2),after:.2,r:100*m,scorch:0,rough:.22,sx:rand(-380,380),sy:rand(-120,120)}); K.flare(x,y,50,{pal:GW,s:130*m,dur:.07,gain:5}); K.flare(x,y,70,{pal:G,s:250*m,dur:.32,gain:2}); wave(x,y,40,400*m,.36,.24,.7);
    K.dust(x,y,{n:Math.round(9*m),r:40,sp:[180,560],a:.5,s:1.35*m,life:1.2,c:'#4a3c2a',c3:'#8a7456'}); K.sparks(x,y,16,{pal:G,n:Math.round(11*m),sp:[300,1400],up:1300,life:[.25,.7]}); K.debris(x,y,{n:Math.round(6*m),r:30,sp:[160,640],up:1100,size0:6,size:22,c:'#5e4a32'});
    // (detail r3) its own crown of soil: clods thrown up and out to the side it leans from, each sword its own count and reach
    { const dn=Math.round(7+9*m*hs(s.i*2.3+.1)), lean=-Math.sign(s.tilt||1); for(let j=0;j<dn;j++){ const a=(j/dn)*TAU+hs(s.i+j*.7)*.6, sp=mix(220,760,hs(s.i*3.1+j*1.3))*(1+.6*Math.max(0,Math.cos(a)*lean)); GFX.pt({x:x+Math.cos(a)*20,y:y+Math.sin(a)*20*FSY,z:6,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:mix(500,1300,hs(s.i+j*2.9))*m,g:2600,drag:.3,life:mix(.7,1.2,hs(j+s.i)),s:mix(7,16,hs(j*1.7+s.i))*m,rot:j,vr:(hs(j)-.5)*16,m:11,b:'alpha',c:GFX.rgb(j%3?'#4e3c26':'#6e5638'),c2:'#0c0806',shadow:true,bounce:.3,fk:5,L:2}); } }
    Cn.shake((.2+.16*sat(s.i/15))*m); if(s.i<5) hitstop=Math.max(hitstop,.03); sfx('boom',.8+s.i*.02,.4); sfx('slash',1.4,.4);
    inCircle(x,y,330*Math.max(1,m),e=>{ if(e.dead) return; if(!e.skyH){ e.skyH=1; hurt(e,Dm*.2); } K.knock(e,{from:[x,y],dist:250,up:1150,stun:.9}); seal(e); }); };
  const drop=(s,tl)=>{ if(BKS){ const a=Math.abs(s.tilt), v=a<.15?2:a<.32?0:1; s.bk='sw_rain_v'+v; s.bf=s.x<Px; s.tilt=(s.bf?-1:1)*[.141,.337,.067][v]; }
    s.tl=tl; sw.push(s); after(tl-FT-now(),()=>{ if(s.e&&!s.e.dead){ s.x=s.e.x; s.y=s.e.y; } s.e=null; sfx('whoosh',1.5,.35); }); after(tl-now(),()=>land(s)); };
  // the broken lines the floor takes under a sword: bent cracks through its point, fixed when it is made (longer under a larger sword)
  const mkCr=(nc,m)=>{ const a0=rand(0,TAU), L=[]; for(let j=0;j<nc;j++){ const aa=a0+j*1.9+rand(-.3,.3), ab=aa+Math.PI+rand(-.6,.6), la=rand(170,300)*m, lb=rand(120,240)*m, ps=[];
      for(let i=3;i>=1;i--){ const r=la*i/3, o=rand(-.22,.22)*r*(i<3?1:.5); ps.push({dx:Math.cos(aa)*r-Math.sin(aa)*o,dy:Math.sin(aa)*r+Math.cos(aa)*o,w:13*m*(1-i/4.2)}); } ps.push({dx:0,dy:0,w:15*m});
      for(let i=1;i<=3;i++){ const r=lb*i/3, o=rand(-.22,.22)*r*(i<3?1:.5); ps.push({dx:Math.cos(ab)*r-Math.sin(ab)*o,dy:Math.sin(ab)*r+Math.cos(ab)*o,w:13*m*(1-i/4.2)}); } L.push(ps); } return L; };
  // sixteen places spread over the whole field round the mark (the inner ring first, the outer one as the view opens), closer and closer together in time; each takes the
  // nearest free enemy if there is one. Three sizes, and no two lean the same way
  { const sl=[], TR=[1,0,2,1,0,2,1,0,1,2,0,1,2,0,1,0], LL=[360,560,880]; for(let i=0;i<16;i++){ const out=i>=6, a=out?((i-6)*3%10)/10*TAU+.2:(i*5%6)/6*TAU+.87, r=out?mix(1,.52,(i-6)/9)*(i%2?1:.84):.56; sl.push([Px+Math.cos(a)*hw*.88*r,Py-150+Math.sin(a)*hh*.84*r]); }
    // (detail r2) the first four come down where the close camera sees them, right, left, right, left of him, so the opening beat is heard and seen
    for(let i=0;i<4;i++) sl[i]=[x0+(i%2?-1:1)*hw*(.44+.05*i),y0+(i<2?-1:1)*hh*.18];
    let tl=.55; sl.forEach(([gx,gy],i)=>{ if(fd(gx,gy,x0,y0)<420) gx+=(gx>=x0?1:-1)*460; const at=tl; tl+=.19*Math.pow(.87,i);
      after(at-.5,()=>{ let e=null, bd=400; for(const q of onScreen(0)){ const d=fd(q.x,q.y,gx,gy); if(d<bd&&!q.skyT&&fd(q.x,q.y,Px,Py)>480&&fd(q.x,q.y,x0,y0)>300){ bd=d; e=q; } } if(e) e.skyT=1;
        const L=LL[TR[i]]*mix(.84,1.2,hs(i*7.7+.2)), sg=hs(i*3.3+.4)<.5?-1:1, SA=[[.62,.56,.42],[.44,.29,.12],[.6,.45,.17],[.38,.33,.27],[.72,.6,.34]], vk=(i*3+TR[i])%5;
        drop({i,L,x:e?e.x:gx,y:e?e.y:gy,e,tilt:sg*(.06+.62*hs(i*5.7+1.1)),pitch:mix(-.2,.36,hs(i*2.9+.6)),yaw:rand(-1.2,1.2),kick:-9,boom:-1,on:false,dir:1,ph:rand(0,TAU),al:SA[vk],sp:mix(.6,2.2,hs(i*4.4+.8)),bw:mix(.15,.25,hs(i*6.1+.9)),cr:mkCr(TR[i]===2?3:i<6?2:1,L/560)},at); }); }); }
  // ---- everything that stands is drawn here, as a function of the time since the cast
  const Lp=GFX.light(Px,Py,700,'#ffc040',.2,.3,{hold:99,z:220}), Lt=GFX.light(Px-700,Py+260,2900,'#ffd070',0,.3,{hold:99,z:1300});
  let GH=null;
  const RUNE2=[[[-.5,-.6,.5,.6],[.5,-.6,-.5,.6]],[[0,-.7,0,.7],[-.5,.2,.5,-.3]],[[-.5,-.6,0,.7],[0,.7,.5,-.6],[-.3,0,.3,0]],[[-.4,-.7,-.4,.7],[-.4,.7,.4,0],[.4,0,-.4,-.1]],[[0,-.7,0,.7],[-.5,.4,0,0],[.5,.4,0,0]]];
  // (detail pass) polished steel: a highlight that slides down the ridge of the tower from the guard to the point (batched glow, no draws)
  const glint=(z,t,sp)=>{ const g=(t*.55*sp)%1, zz=z+UB*(1-g), x=Px+LB*.03*f0*(1-g), a=Math.sin(Math.PI*g); GFX.bill(GN,x,Py,zz,WB*.55,46,0,[1,.93,.7],.55*a); GFX.bill(GN,x,Py,zz,WB*.16,150,0,[1,1,.95],.5*a); };
  GFX.add(TE+1.4,()=>{ const t=now(), ch=sat((t-1.9)/1), mB=gsB(), mC=gsC();
    // (asset r2) the thread of light he held up to the sky is gone: the sky answers him with strokes of lightning instead (see 'strike' below)
    // (detail r3) the first breath: a seal turns on the floor round him and tightens, its outer ring and inner ring running opposite ways, runes
    // between them lighting one by one; it is gone into the flood of light at .5 and its echo fades by 1.1 (one batch of streak lines)
    // (asset r2) the seal has depth: a soft band of light under the ground ring, bigger runes, every dash dragging two fading after-images as it turns,
    // and two more rings standing in the air round him (knee and shoulder height, each smaller and turning its own way), so it reads as a cone of rings
    if(t>.06&&t<1.15){ const u=sat((t-.06)/.5), fo=1-sat((t-.7)/.45), R=mix(470,300,eo3(u)), sp=.9+2.4*u, rA=t*sp, rB=-t*(1.4+3*u), ga=fo*sat(u*3), LN=[];
      for(const [lag,la] of [[0,1],[.07,.38],[.15,.16]]) for(let i=0;i<28;i++){ const b=rA-lag*sp+i/28*TAU, e=b+TAU/28*1.04; LN.push([R*Math.cos(b),R*Math.sin(b),R*Math.cos(e),R*Math.sin(e),8,.8*la,3]); if(!lag){ const r2=R*1.07; LN.push([r2*Math.cos(b),r2*Math.sin(b),r2*Math.cos(e),r2*Math.sin(e),3,.5,3]); } }
      for(let i=0;i<12;i++){ const b=rB+i/12*TAU, e=b+TAU/12*.8, r=R*.66; LN.push([r*Math.cos(b),r*Math.sin(b),r*Math.cos(e),r*Math.sin(e),6,.65,3]); }
      for(let i=0;i<12;i++){ if(u*14<i) continue; const b=rA*.6+i/12*TAU, rm=R*.83, c=Math.cos(b), sn=Math.sin(b), tc=-sn, g=R*.1, G2=RUNE2[i%RUNE2.length];
        for(const [p0,q0,p1,q1] of G2) LN.push([c*(rm+q0*g)+tc*p0*g,sn*(rm+q0*g)+c*p0*g,c*(rm+q1*g)+tc*p1*g,sn*(rm+q1*g)+c*p1*g,5,1,3]); }
      for(const [zr,kr,rot,nn,w] of [[BODY*.75,.56,rB*1.3,16,6],[BODY*1.6,.34,rA*1.7,10,5]]){ const r=R*kr*(1+.05*Math.sin(t*9+zr)), zz=zr*(.6+.4*eo3(u)); for(let i=0;i<nn;i++){ const b=rot+i/nn*TAU, e=b+TAU/nn*.62; LN.push([r*Math.cos(b),r*Math.sin(b),r*Math.cos(e),r*Math.sin(e),w,.7*sat(u*2-.3),zz]); } }
      GFX.floor(RG,x0,y0,R*1.3,null,0,gold,.55*ga,.8,rA,.1,.12); GFX.floor(GL,x0,y0,R*1.1,null,0,gold,.12*ga);
      for(const l of LN) GFX.line(SKL,x0+l[0],y0+l[1]*FSY,l[6],x0+l[2],y0+l[3]*FSY,l[6],l[4]*2.2,[1,.6,.14],ga*l[5],.1,0,3,.2);
      for(const l of LN) GFX.line(SKL,x0+l[0],y0+l[1]*FSY,l[6],x0+l[2],y0+l[3]*FSY,l[6],l[4]*.4,[1,.95,.8],ga*l[5]*.8,.06,0,3,.15); }
    // the sky opens over the mark: a wide shaft that only gets brighter, a pool of shadow that tightens under it, gold light that gathers in it
    // (asset r2) no shaft any more, and the gold is kept to the mark itself (it no longer floods the field)
    // (asset r3) no smooth disc of gold under the mark: the floor there breaks open under the weight hanging over it. Cracks run out farther and farther,
    // molten light in them (hotter as the point comes down), the floor between them scorched, and a lip of soil pushed up round their ends
    if(t>.5&&t<T1){ const v=sat((t-.8)/(TD-.8)), cr=mix(160,720,eo3(v)); GFX.floor(SH,Px,Py,mix(hw*.9,hw*.3,v),null,0,[0,0,0],.14+.46*v); GFX.floor(SH,Px,Py,cr*.7,null,.6,[0,0,0],.3*v);
      GFX.floor(RM,Px,Py,cr*1.2,null,0,[.06,.042,.026],.32*v,.72,2.9,.3,.14); GFX.floor(GL,Px,Py,mix(60,150,v),null,0,gold,.18*v*v);
      GFX.floor(CRK,Px,Py,cr,null,.4,heatC(.36-.3*v*v),Math.min(1,.35+.75*v)*sat((t-.8)*4),.92,3.7,10,.13+.08*v); GFX.floor(CRK,Px,Py,cr*.55,null,2.1,heatC(.2-.18*v),(.3+.6*v)*sat((t-1.2)*3),.92,8.3,7,.16+.06*v); Lp.t=0; Lp.a=.1+.24*v*v; Lp.r=mix(600,900,v); }
    // (detail r2) the ki drawn to where the point will stop. Threads run in along their own spirals (each keeps its place from frame to frame, a gold body
    // and a white core), more of them and faster as the build goes on; three rings in the air and their echo on the floor tighten onto the point, each
    // pass smaller and brighter than the last. Everything here is a pure function of t
    if(t>1.2&&t<TB+.08){ const D=TB-1.2, tau=t-1.2, u=sat(tau/D), zc=tipZ(TB)+40, fo=1-sat((t-TB+.02)/.1), ns=Math.floor(10+38*u*u), TS=[];
      for(let i=0;i<ns;i++){ const h=hs(i*1.73+.4), h2=hs(i*3.11+2.2), ui=i<10?0:Math.sqrt((i-10)/38), ph=h*7+(.42+.5*h)*(tau+1.1*tau*tau/D), p=ph-Math.floor(ph), Rs=mix(1000,1700,h2), zs=mix(20,1300,hs(i*5.3+1)),
          at=q=>{ const rr=Rs*Math.pow(1-q,1.5), an=i*2.39996+3.2*q+.12*tau; return [Px+Math.cos(an)*rr,Py+Math.sin(an)*rr*FSY,zc+(zs-zc)*Math.pow(1-q,1.2)]; },
          a=sat((u-ui)*10)*sat(p*6)*sat((1-p)*12)*fo*(.45+.55*u), q0=Math.max(0,p-(.05+.07*u)); if(a>.02) TS.push([at(q0),at(p),a,mix(8,15,u)*(.7+.6*h)]); }
      for(const [A0,A1,a,w] of TS) GFX.line(SKL,A0[0],A0[1],A0[2],A1[0],A1[1],A1[2],w,[1,.72,.22],a,.1,0,3,.2);
      for(const [A0,A1,a,w] of TS) GFX.line(SKL,A0[0],A0[1],A0[2],A1[0],A1[1],A1[2],w*.4,[1,.98,.9],a,.05,0,3,.2);
      // (asset r3) the rings and the flat discs over the point are gone (they read as a flat seal pasted on the view): a vortex of cloud turns round it
      // instead and is drawn in. Puffs of dark cloud lit gold on their inner side ride their own spirals in (a count that follows t, more and faster
      // as the build goes on); the point is a ball of light with depth (a volume), rays leave it in every direction (each its own length, a smooth
      // function of t) and the air round it shimmers (the gather's haze)
      { const want=Math.floor(34*tau+30*tau*tau/D); bg.vx=bg.vx||0; while(bg.vx<want){ bg.vx++; const h=hs(bg.vx*2.17+.3), a=bg.vx*2.39996, r0=mix(380,820,h), z0=zc+mix(-90,90,hs(bg.vx*1.31+4)), big=h>.7;
          GFX.pt({x:Px+Math.cos(a)*r0,y:Py+Math.sin(a)*r0*FSY,z:z0,oc:[Px,Py,zc],or:r0,oa:a,ow:(.9+1.4*u)*(h<.5?1:.8),ok:r0/mix(2.4,1.4,u),oz0:z0,life:mix(1.5,1,u),s:big?mix(60,95,h):mix(28,55,h),grow:mix(30,70,h),m:5,b:'alpha',c:GFX.rgb(h<.5?'#4a3c28':'#5e4c34'),c2:'#0a0604',c3:h<.5?'#ffc860':'#d09048',er:.85,ns:mix(.9,1.6,h),w:1,a:mix(.3,.5,u),fade:'in',L:0}); } }
      { const rr=mix(60,170,u*u)*(1+.06*Math.sin(tau*17)), rg=(.3+.7*u)*fo;
        for(let i=0;i<10;i++){ const h=hs(i*5.17+.9), az=i*2.39996+tau*(.3+.4*h)*(i%2?1:-1), el=(hs(i*3.3+1.7)-.5)*2.4, ln=rr*(.9+1.6*(.5+.5*Math.sin(tau*(2+3*h)+i)))*(.6+.6*u), ce=Math.cos(el), dx=Math.cos(az)*ce, dy=Math.sin(az)*ce, dz=Math.sin(el), r1=rr*.6, r2=rr*.6+ln;
          GFX.line(SKL,Px+dx*r1,Py+dy*r1*FSY,zc+dz*r1,Px+dx*r2,Py+dy*r2*FSY,zc+dz*r2,mix(14,26,h)*(.6+.6*u),[1,.62,.16],.3*rg,.1,0,3,.2);
          GFX.line(SKL,Px+dx*r1,Py+dy*r1*FSY,zc+dz*r1,Px+dx*r2,Py+dy*r2*FSY,zc+dz*r2,mix(3,5,h),[1,.93,.75],.3*rg,.05,0,3,.15); }
        if(!bg.orb) bg.orb=K.vorb(Px,Py,zc,{r:70,pal:GWB,dur:TB+.08-t,in:.6,out:.1,heat:1.1,core:.35,gain:.85,freq:3.2,spin:2.6}); bg.orb.r=rr; } }
    // (detail r2) while it is drawn back up a hot thread joins its point to the floor; while it falls it smears: three long after-glows above it, and its
    // shadow on the floor swells and darkens until it lands
    if(t>TB&&t<T1){ const z=tipZ(t), d=sat((t-TD)/(T1-TD)); if(!BKR) GFX.bill(GN,Px,Py,z*.5,mix(60,26,d),Math.max(10,z*.5),0,[1,.9,.6],.55*(1-d*.5));
      if(t>TD&&!BKR) for(let k=1;k<=3;k++){ const dz=tipZ(t-.022*k)-z; if(dz<20) continue; GFX.bill(GN,Px+LB*.015*f0,Py,z+UB*.5+dz*.5,WB*(.7-.12*k),UB*.5+dz*.5,0,[1,.84,.45],.34/k); }
      // (detail r3) its shadow starts to gather as soon as it is drawn back up, and a shaft of light comes down onto its pommel from the open sky
      const d2=sat((t-TB)/(T1-TB)), cl=sat((t-TB)/.25); GFX.floor(SH,Px,Py,mix(170,600,d2*d2),mix(90,320,d2*d2),0,[0,0,0],.25+.6*d2);
      if(!BKR){ GFX.bill(GL,Px,Py,z+UB+1500,WB*mix(1.9,1.3,d),1600,0,gold,.3*cl); GFX.bill(GN,Px,Py,z+UB+1500,WB*.3,1600,0,[1,.96,.85],.32*cl); } }
    // a needle of light through everything the sky has marked
    if(t<T1) for(const e of pins){ if(e.dead) continue; const q=t-e.pin, g=eo5(sat(q/.14)), pu=1+1.2*Math.exp(-q*9); GFX.bill(GL,e.x,e.y,e.z+190*g,8*pu,190*g,0,gold,.6); GFX.bill(GL,e.x,e.y,e.z+e.h*.5,e.h*.4*pu,e.h*.45*pu,0,gold,.08+.06*ch); GFX.floor(GL,e.x,e.y,110,null,0,gold,.08+.05*ch); }
    for(const s of sw){ const q=t-s.tl, L=s.L, m=L/560;
      if(q<-FT){ const k=sat((q+.5)/(.5-FT)); if(s.e&&!s.e.dead){ s.x=s.e.x; s.y=s.e.y; }
        GFX.floor(SH,s.x,s.y,mix(230,110,k)*m,null,0,[0,0,0],.2+.45*k); GFX.floor(GL,s.x,s.y,mix(280,130,k)*m,null,0,gold,.08+.3*k*k); }
      else { const fall=q<0, d=fall?1+q/FT:1, z=fall?1700*(1-d*d):0, wk=fall?1:1-sat(q/.17);
        // its wake: as long as the fall while it falls, and it stays a sixth of a second after the blow, burning down from the top
        if(wk>0&&!BKS){ const tl=2100*(fall?sat(d*1.6):1-.75*eo3(sat(q/.17))), zb=z+L*.8, ps=[]; for(let i=0;i<4;i++) ps.push({x:s.x,y:s.y,z:zb+tl*i/3,w:52*m*(1-i/3.4)*(fall?1:.4+.6*wk)}); F.ribbon(mB,ps,{...C,a:.9*wk,gain:2.4,ero:fall?0:.1+.5*(1-wk),ulen:1700,t0:s.x*.01}); for(const p of ps) p.w*=.3; F.ribbon(mC,ps,{...CW,a:.9*wk,gain:4,ulen:1300,t0:s.x*.01+2}); }
        if(fall&&BKS){ K.bakeFrame(s.bk,Math.max(0,6+q*30),s.x,s.y,{s:L/700,flip:s.bf,amb:.3,bright:.85,ord:.01}); GFX.floor(SH,s.x,s.y,mix(170,90,d)*m,null,0,[0,0,0],.35+.4*d); }
        else if(fall){ rsw(s.x,s.y,z,L,{tilt:s.tilt*.4,pitch:s.pitch*.4,yaw:s.yaw,alb:s.al.map(v=>v*1.25),spec:s.sp+.8,heat:.25,rid:1,bw:s.bw}); GFX.floor(SH,s.x,s.y,mix(170,90,d)*m,null,0,[0,0,0],.35+.4*d); }
        else { const b=s.boom<0?-1:t-s.boom, wob=.55*Math.exp(-q*9)*Math.cos(q*46), kk=Math.exp(-Math.max(0,t-s.kick)*7), cl=b<0?0:sat(b/.9), hum=.5+.5*Math.sin(t*(5+7*ch)-fd(s.x,s.y,Px,Py)/300+s.ph*.3), trm=(.012+.045*ch+.07*kk)*Math.sin(t*(58+s.i)+s.ph);
          // the floor it broke: a burnt patch, and cracks that are white when it lands, gold while it stands (they beat with the sword), dark after it has gone
          GFX.floor(SH,s.x,s.y,170*m,null,0,[0,0,0],.5*sat(q/.1)*(1-cl));
          // (detail pass: the cracks are one batched floor quad of jagged radial fracture, not ribbons; hot white at the blow, gold while it hums, dark red as it goes)
          if(cl<1){ const kf=s.keep?1-sat((t-T1)/1.3):1, kz=s.keep?1-sat((t-(TE+.6))/.6):1, g=eo3(sat(q/.1)), hot=Math.min(2.2,(.45+1.6*Math.exp(-q*3)+(.4+.6*hum)*ch+1*kk)*(1-cl)*(b<0?1:1.5)*Math.max(.12,kf)), R0=420*m*g, wc=heatC(.32+.18*(1-Math.min(1,hot/2))+cl*.4+.4*(1-kf));
            GFX.floor(SH,s.x,s.y,R0*.62,null,s.ph,[0,0,0],.32*(1-cl)*kz);
            GFX.floor(CRK,s.x,s.y,R0,null,s.ph,wc,Math.min(.85,.3+.3*hot)*(1-cl*cl)*kz,.92,s.i*1.37+.2,s.cr.length*2+4,.13+.05*hot); }
          if(b<0){ const kc=s.keep?1-sat((t-T1)/1.3):1, ce=0; GFX.floor(GL,s.x,s.y,150*m,null,0,gold,(.14+.4*Math.exp(-q*3)+(.1+.22*hum)*(.3+ch)+.3*kk)*kc); GFX.floor(SH,s.x,s.y,74*m,null,0,[0,0,0],.85*(1-ce));
            // (asset r3) the lip of soil it pushed up as it went in
            GFX.floor(RM,s.x,s.y,130*m,null,0,[.06,.042,.026],.6*sat(q/.08)*(1-ce),.6,s.ph,.36,.09);
            // baked: the plunge, then the rest frame; while the field charges (or lightning has just left it) the hum loop
            if(BKS){ const f=6+q*30, hm=ch>.05||kk>.05; K.bakeFrame(s.bk,f<28?f:hm?29+Math.floor(t*30+s.i)%6:28,s.x,s.y,{s:L/700,flip:s.bf,amb:.3,a:1-ce,bright:.8*mix(.45,1,kc)*(1+.6*kk),blend:f<28?1:0,ord:.01}); } else
            rsw(s.x,s.y,-L*.08*sat(q/.04),L,{tilt:s.tilt*(1+wob)+trm*kc,pitch:s.pitch,yaw:s.yaw,alb:s.al.map(v=>v*mix(.8,1,kc)),spec:(s.sp+.5)*mix(.4,1,kc),rim:.3+.4*s.sp,heat:Math.min(.55,(q<.12?.5*(1-q/.12):0)+.04+.45*Math.exp(-q*5)+(.06+.2*hum)*(.25+ch)+.3*kk)*kc,a:1-ce,bw:s.bw,rid:t<T1||(s.keep&&t>T1+.4)?1:0}); GFX.floor(SH,s.x+70*m,s.y+16,150*m,46*m,0,[0,0,0],.5*(1-ce));
            // light is drawn off it toward the point of the tower
            const ta=Math.min(t,TD)-1.9, want=ta>0?Math.floor(4*ta+8*ta*ta/(TD-1.9)):0; s.pc=s.pc||0; while(s.pc<want){ s.pc++; const ax=s.x+Math.sin(s.tilt)*L*.9, uu=sat(ta/(TD-1.9)); const tq=tipP(t); GFX.pt({x:ax+rand(-20,20),y:s.y,z:L*.86,tx:tq[0],ty:tq[1],tz:tipZ(t)+60,pull:rand(2.6,4.2)*(1+.6*uu),life:Math.min(rand(.45,.75),Math.max(.06,TD+.02-t)),s:rand(3,5.5),m:3,len:.07+.07*uu,vx:rand(-200,200),vy:0,vz:rand(500,1100),c:GFX.rgb(Math.random()<.4?'#ffffff':'#ffe08a'),c2:'#ff9a10',L:3}); } }
          else { const fz=sat(b/.3), fa=1-fz*fz*(3-2*fz); GFX.floor(GL,s.x,s.y,170*m,null,0,gold,.4*fa);
            // the ring does not break it out of the floor: it comes apart into points of light that stand in its shape a moment, drift up and go out
            if(fa>0){ if(BKS) K.bakeFrame(s.bk,28,s.x,s.y,{s:L/700,flip:s.bf,amb:.3,bright:.85*(1+.6*fz),a:fa,ord:.01}); else rsw(s.x,s.y,-L*.08,L,{tilt:s.tilt,pitch:s.pitch,yaw:s.yaw,alb:s.al,spec:s.sp+.5,rim:.3+.4*s.sp,heat:.2*fa,a:fa,bw:s.bw}); }
            { const NP=Math.round((26+30*m)*(GFX.QK||1)), want=Math.floor(fz*NP); s.mc=s.mc||0; while(s.mc<want){ s.mc++; const h=Math.random(), bl=h<.75, zz=bl?L*.62*Math.sqrt(rand(.001,1)):L*rand(.6,.82), xw=bl?L*s.bw*.3:h<.9?L*.16:L*.03;
              GFX.pt({x:s.x+Math.sin(s.tilt)*zz+rand(-xw,xw),y:s.y+rand(-4,4),z:zz*Math.cos(s.tilt),vx:rand(-22,22),vy:0,vz:rand(-10,25),g:-rand(60,160),drag:.5,life:rand(.7,1.2),s:rand(6,11)*Math.sqrt(m),m:8,c:GFX.rgb(Math.random()<.45?'#fffbe8':'#ffd060'),c2:'#ff9a20',fade:'in',L:3}); } } } } } }
    for(const A of arcs) arcDraw(A,t);
    // a tail of gold behind every thrown enemy, from where it stood to where it is now
    for(const f of fly){ const q=t-f.t, e=f.e; if(q>=.5) continue; if(!e.dead){ e.flash=Math.max(e.flash||0,.85); f.ex=e.x; f.ey=e.y; f.ez=e.z; } const z0=e.h*.5, a=1-q/.5, tk=mix(.25,.8,sat(q/.3)), ps=[{x:mix(f.x,f.ex,tk),y:mix(f.y,f.ey,tk),z:z0+f.ez*tk*tk,w:5},{x:mix(f.x,f.ex,tk*.4+.6),y:mix(f.y,f.ey,tk*.4+.6),z:z0+f.ez*(tk*.4+.6),w:36},{x:f.ex,y:f.ey,z:z0+f.ez,w:66}];
      F.ribbon(mB,ps,{...C,a,gain:2.4*a,ulen:400,t0:f.x*.01}); if(f.core){ for(const p of ps) p.w*=.32; F.ribbon(mC,ps,{...CW,a,gain:4*a,ulen:300,t0:f.x*.01+2}); } }
    // the tower
    // (2026-11-27) it is held on the last whole frame of sw_gs_hit (14, before the baked cracks) and fades out from TC over a second
    if(BKR&&t>1.3&&t<TC+1){ const g=gsAt(t), fz=sat((t-TC)/.6), fa=1-fz*fz*(3-2*fz), hot=t>T1?Math.exp(-(t-T1)*2.5):0, kk=Math.exp(-Math.max(0,t-bg.lit)*6);
      K.bakeFrame(g[0],g[0]==='sw_gs_hit'?Math.min(14,g[1]):g[1],Px,Py,{z:g[2],amb:g[0]==="sw_gs_hit"?.75:.3,bright:(g[0]==="sw_gs_hit"?.66:.8)*(1+.25*hot+.15*kk+.5*fz),a:fa,blend:g[0]==='sw_gs_fall'?0:1,ord:.01}); }
    if(t>1.5&&t<TE+.2){ const z=tipZ(t), u=sat((t-1.5)/1.8), kk=Math.exp(-Math.max(0,t-bg.lit)*6);
      if(t<TD){ const w=sat((t-TB)/(TD-TB)); Lt.t=0; Lt.a=.2+.4*u+.3*w;
        if(!BKR) gsword(Px,Py,z,LB,{big:1,tilt:.03*f0,yaw:mix(-1.15,.24,u),glow:.5+.7*u*u+.5*kk+.8*w,bvein:.05+.3*ch+.2*kk,vein:.3+.5*u,shadow:.2+.2*u+.15*w,edge:1+.6*kk+.5*w,contrast:1,gloss:1.5,forge:1,alb:[.56,.43,.2]}); if(t>1.6&&!BKR) glint(z,t,1); }
      else if(t<T1){ const d=(t-TD)/(T1-TD), tl=3400*sat(d*2.2); Lt.t=0; Lt.a=.8;
        // the air it tears: a dark wake standing over it, one pale after-image, and long threads of white off its shoulders and its pommel
        if(!BKR) GFX.bill(SH,Px,Py,z+UB+1300,WB*1.6,1700,0,[0,0,0],.45*sat(d*3));
        if(!BKR){ const zg=tipZ(t-.035); if(zg>z+60) gsword(Px,Py,zg,LB,{big:1,tilt:.03*f0,yaw:.24,a:.2,alb:[1.1,.9,.45],noHilt:1}); }
        if(!BKR){ gsword(Px,Py,z,LB,{big:1,tilt:.03*f0,yaw:.24,glow:2.2,bvein:.35,vein:1.2,shadow:.45,edge:1.8,contrast:1,gloss:1.5,forge:1,alb:[.56,.43,.2]}); glint(z,t,3); }
        // (detail r3) speed: thin streaks standing beside it that it leaves behind as it falls, longer as it gains speed
        for(let i=0;i<12;i++){ const h=hs(i*4.13+.7), sg=i%2?1:-1, ox=sg*WB*(.75+1.6*hs(i*2.71+.3)), ln=(500+900*h)*(.4+.9*d), zt=z+UB*(.15+1.1*hs(i*1.9+5))+ln; GFX.line(SKL,Px+ox,Py,zt,Px+ox,Py,zt-ln,mix(5,11,h),[1,.85,.5],.55*sat(d*3),.1,0,3,.2); }
        if(!BKR) for(const [ox,wd,zz,ll] of [[0,150,1.05,1],[-WB*.52,40,.62,.75],[WB*.52,40,.62,.75],[-WB*1.05,26,.66,.5],[WB*1.05,26,.66,.5]]){ const ps=[]; for(let i=0;i<5;i++) ps.push({x:Px+ox+LB*.03*f0*(ox?.2:1),y:Py,z:z+UB*zz+tl*ll*i/4,w:wd*(1-i/4.4)}); if(!ox) F.ribbon(mB,ps,{...C,a:.8,gain:2,ulen:2600,t0:5}); for(const p of ps) p.w*=ox?.5:.3; F.ribbon(mC,ps,{...CW,a:.9,gain:4,ulen:2000,t0:7+ox}); } }
      else { const q=t-T1, cool=sat(q/.75), fz=sat((t-TC)/.6), fa=1-fz*fz*(3-2*fz), hot=1-eo3(cool), tlt=.03*f0*(1+2.4*Math.exp(-q*7)*Math.cos(q*40)), al=[mix(.62,.92,hot),mix(.5,.74,hot),mix(.3,.36,hot)]; Lt.t=0; Lt.a=mix(.5,.8,hot)*fa;
        // it does not crack or burst: from TC it grows a little brighter and fades out where it stands, over a second
        if(!BKR&&fa>0) gsword(Px,Py,z,LB,{big:1,tilt:tlt,yaw:.24,glow:mix(.55,2.2,hot)+fz*.8,bvein:.04+.26*hot,vein:mix(.35,1.5,hot),alb:al,shadow:.42*fa,edge:1+hot,contrast:1,gloss:1.5,forge:1,a:fa});
          // its point is white from the blow and the white drains up it
          if(hot>.02&&!BKR){ const ps=[]; for(let i=0;i<4;i++) ps.push({x:Px,y:Py,z:i/3*mix(380,900,cool),w:WB*.5*(1-i/3.6)}); F.ribbon(mB,ps,{...C,a:hot,gain:2.6*hot,ulen:900,t0:9}); for(const p of ps) p.w*=.4; F.ribbon(mC,ps,{...CW,a:hot,gain:4*hot,ulen:700,t0:11}); }
        // it comes apart into points: as the blade goes, points of light stand where it was (blade, guard and grip, a count that follows time);
        // they hang a moment glittering, then drift up and apart and go out one by one
        if(t>=TC){ const NP=Math.round(460*(GFX.QK||1)), want=Math.floor(fz*NP); while(bg.cs<want){ bg.cs++; const h=Math.random(), bl=h<.7, gd=!bl&&h<.85, zz=bl?UB*Math.sqrt(rand(.001,1)):gd?UB+rand(-25,25):UB+rand(0,LB*.3), xw=bl?WB*.45*Math.min(1,zz/(UB*.12)+.15):gd?WB*1.6:WB*.12;
            GFX.pt({x:Px+rand(-xw,xw)+LB*.03*f0*zz/UB,y:Py+rand(-6,6),z:zz,vx:rand(-26,26),vy:0,vz:rand(-10,30),g:-rand(60,170),drag:.5,life:rand(1,1.6),s:rand(16,30),m:8,c:GFX.rgb(Math.random()<.45?'#fffbe8':'#ffd060'),c2:'#ff9a20',fade:'in',L:3}); } } } } });
  // ---- prepare: the blade goes up, the camera comes in, gold is drawn off the floor toward the sky
  if(mk) mk.play('raise',{yaw:yaw0}); else { plSeq([['gw02',.08],['gw03',.1],['gw04',TD-.28],['gw05',.05],['gw06',.9],['gs12',9]]); pl.target='cast'; pl.ps=10; }
  Cn.move({x:x0,y:y0-BODY*.6,zoom:1.5,tilt:.05},.5); GFX.ambient(.56,.5,.46,3); Cn.SND.inhale(.75,.5); duck(.3,.6);
  for(let i=0;i<36;i++) after(rand(0,.75),()=>{ const a=rand(0,TAU), d=rand(160,620); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,120),tx:x0+f0*14,ty:y0,tz:2600,pull:rand(2.2,3.4),life:rand(.5,.8),s:rand(2.5,5),m:3,len:.06,vx:-Math.sin(a)*300,vy:Math.cos(a)*180,c:GFX.rgb(Math.random()<.4?'#ffffff':'#ffe08a'),c2:'#ff9a10',L:3}); });
  // (detail r3) gold motes leave the floor all over the seal and rise straight up, slow at first and more and faster each moment
  for(let i=0;i<48;i++){ const tt=.06+.85*Math.sqrt(i/48); after(tt,()=>{ const a=rand(0,TAU), d=rand(60,470), k=tt/.9; GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,30),vx:rand(-30,30),vy:0,vz:mix(240,900,k)*rand(.7,1.2),g:-mix(200,900,k),drag:.2,life:rand(.6,1),s:rand(3,6),m:3,len:mix(.03,.09,k)*rand(.6,1.3),c:GFX.rgb(Math.random()<.15?'#ffffff':Math.random()<.5?'#ffd060':'#ffb030'),c2:'#ff8a10',fade:'in',L:3}); }); }
  after(.3,()=>{ K.dust(x0,y0,{n:12,r:90,sp:[260,620],a:.3,life:.9}); K.flare(x0+f0*14,y0,BODY*1.1,{pal:GW,s:150,dur:.22,gain:2.6}); K.flare(x0+f0*14,y0,BODY*1.1,{pal:G,s:300,sx:.25,sy:3,dur:.2,gain:2}); GFX.light(x0,y0,700,'#ffd890',.9,.3,{z:160}); Cn.SND.shing(1.5,.5); Cn.SND.tick(1.5,.3); });
  // the sky answers: light floods the field once from him outward, a broad band over the floor
  // (asset r2) and lightning comes down onto his raised blade (a real stroke that strikes several times), once now and once as he drives it higher
  after(.45,()=>K.lightning(x0+f0*14,y0+4,{pal:LBW,h:2700,w:12,strokes:4,span:.5,branches:5,after:.4,r:150,sx:-f0*rand(250,450),sy:rand(-80,80)}));
    after(.5,()=>{ K.sparks(x0+f0*14,y0,BODY*1.5,{pal:G,n:14,sp:[200,700],up:1300}); GFX.light(Px,Py,hw*1.7,'#ffd070',.55,.9,{z:500}); wave(x0,y0,80,1150,.5,.2,.3); GFX.ripple(x0,y0,1300,{life:.5,s:.35,w:.1}); SFX.whoosh(.8,.6); Cn.SND.shing(.8,.5); });
  // ---- build: the camera drifts up to the mark and falls back, the field darkens to gold; he drives the blade higher as the fall quickens
  if(BKR){ after(.75,()=>Cn.move({x:x0,y:y0-BODY*.6-120,zoom:1.28,tilt:0},.5,'io')); after(1.3,()=>Cn.move({x:Px+250,y:Py-1700,zoom:.5,tilt:0},.8,'io')); }
  after(.8,()=>{ if(!BKR) Cn.move({x:Px,y:Py-420,zoom:.78,tilt:.22},2.4,'lin'); GFX.ambient(.46,.43,.42,1.2); SFX.choir&&SFX.choir(2.6); });
  after(1.7,()=>{ if(mk) mk.play('raise',{yaw:yaw0,speed:.75,blend:.15}); K.dust(x0,y0,{n:10,r:60,sp:[200,520],a:.3,life:.8}); wave(x0,y0,60,620,.4,.22,.55); });
  // lightning stands between the swords and the point on four beats, more of them and closer together each time; on the last every other sword is joined to it until the breath
  [[2.05,1],[2.35,1]].forEach(([bt,nb],j)=>after(bt,()=>{ const L=sw.filter(s=>s.on); if(!L.length) return; for(let i=0;i<Math.min(nb,L.length);i++) arc(L[(j*5+i*3)%L.length],.24); K.flare(Px,Py,tipZ(bt)+30,{pal:G,s:200+60*j,dur:.24,gain:3}); Cn.shake(.2+.08*j); Cn.SND.tick(.9+j*.3,.26); }));
  after(2.65,()=>{ const L=sw.filter(s=>s.on); L.filter((s,j)=>j%2===0).slice(0,2).forEach(s=>arc(s,TD+.03-now(),1)); K.flare(tipP(2.65)[0],tipP(2.65)[1],tipZ(2.65)+30,{pal:G,s:380,dur:.3,gain:3.2}); Cn.shake(.4); Cn.SND.tick(1.9,.3); });
  // its light marks every enemy on the screen that no sword has pinned (far ones first)
  after(2.1,()=>{ const L=onScreen(300).filter(e=>!e.skyH).sort((a,b)=>fd(b.x,b.y,Px,Py)-fd(a.x,a.y,Px,Py)), st=Math.min(.03,.8/Math.max(1,L.length));
    L.forEach((e,i)=>after(i*st,()=>{ if(e.dead||e.skyH) return; e.skyH=1; seal(e); hurt(e,Dm*.2); })); GFX.ambient(.36,.35,.38,2); SFX.heart&&SFX.heart(.9); });
  // ---- the held breath: the lightning goes out, the tower is drawn back up into the dark and the view goes with it
  // (detail pass) the ki of the field is drawn in, spiralling, to the place where the point of the tower will stop; the point sinks into it
  // (detail r2) the kit's random streaks and shells are left out: the threads and tightening rings are drawn above, each keeping its place frame to frame
  after(1.2,()=>{ GH=K3.gather(Px,Py,tipZ(TB)+40,{dur:TB-1.2,pal:G,r:340,R:1400,n:.04,gain:.6,shells:0,sparks:0,core:0,floor:0}); });
  after(TB,()=>{ if(GH) GH.end(); Cn.hush(.25); GFX.ambient(.3,.3,.34,9); if(!BKR) Cn.move({zoom:.7,y:Py-560},.35,'io'); });
  after(T1-.12,()=>{ if(mk) mk.play('slam',{yaw:yaw0}); });
  after(TD,()=>{ SFX.whoosh(.5,1); Cn.SND.shing(.6,.6); GFX.ripple(Px,Py,1100,{life:.24,s:.35,w:.1}); });
  // ---- contact
  const boom=s=>{ s.boom=now(); const x=s.x, y=s.y, m=s.L/560; K.flare(x,y,s.L*.4,{pal:GW,s:150*m,dur:.3,gain:1.6}); GFX.light(x,y,620,'#ffd890',.5,.7,{z:120}); Cn.SND.shing(1.3+hs(s.i)*.5,.12); };
  after(T1,()=>{ Lp.hold=0; Lp.life=.5; Lp.t=0;
    Cn.peak(Px,Py-160,{ca:BKR?0:.03,blur:BKR?.05:.12,tint:'#ffc840',a:.15}); hitstop=Math.max(hitstop,.12); Cn.shake(1.9); Cn.SND.hit(1); SFX.boom(1.5,1); SFX.shatter(.9);
    // the light of it: a white heart, gold round it, orange far out, and it goes down over a second and a half
    GFX.light(Px,Py,680,'#fff8e8',1,.4,{z:260}); GFX.light(Px,Py,hw*1.05,'#ffc040',.85,2.1,{z:320}); GFX.light(Px,Py,hw*1.6,'#ff8a20',.55,2.3,{z:500}); GFX.ambient(.46,.42,.38,20); Cn.move(BKR?{zoom:.56,y:Py-1150}:{zoom:.62,y:Py-hh*.78},.75,'io');
    GFX.add(.6,k=>{ GFX.floor(GL,Px,Py,mix(300,520,k),null,0,[1,.98,.9],Math.pow(1-k,3)); GFX.floor(GL,Px,Py,mix(520,900,eo3(k)),null,0,gold,.6*Math.pow(1-k,1.6)); });
    // dark mass first (one right behind the blade), then the dust, then the fire, then rock
    // (asset r2) the dark mass behind the blow: a plume of puffs of every size thrown up behind the blade, spreading and thinning as it climbs (not one stacked volume)
    for(let i=0;i<Math.round(22*(GFX.QK||1));i++){ const a=rand(Math.PI*1.05,Math.PI*1.95), rr=rand(60,420), big=i<5, sp=rand(80,420); GFX.pt({x:Px+Math.cos(a)*rr,y:Py+Math.sin(a)*rr*FSY-60,z:rand(30,420),vx:Math.cos(a)*sp-120,vy:Math.sin(a)*sp*.4,vz:rand(200,700),g:-20,drag:.9,life:rand(1,1.7),s:big?rand(90,140):rand(26,80),grow:big?rand(120,200):rand(50,140),m:5,b:'alpha',c:GFX.rgb(i%3?'#2a2218':'#3a3024'),c2:'#000000',c3:i<8?'#c08a48':'#6a5a48',er:.9,ns:rand(.9,1.6),w:1,a:rand(.24,.4),L:0}); }
    K.vring(Px,Py,{r:hw*1.15,r0:240,dur:RD+.12,tube:.07,a:.5,lump:.95,c:'#0e0b08',c2:'#5a4a36'}); murk(Px,Py,180,RS*.93,RD+.1,.3,.62);
    K.vblast(Px,Py-30,{s:560,pal:GWB,dur:1.35,heat:1.1,gain:.7,lump:.4,smoke:.35,rise:760,fire:.42,band:.8,btop:.62,flow:.6,lit:.6,c:'#2a2014',c2:'#8a7048'});
    // two more lumps of fire beside the blade, each its own size and time, so the fire has no outline of its own
    // (detail pass) gold shafts of light stand up round the wound instead of more lumps of fire
    // (asset pass) the shafts are now the floor bursting up at the same four places and times
    for(let i=0;i<4;i++){ const a=(i+.5)/4*TAU+.3, d=rand(380,520); after(.03+i*.04,()=>burst(Px+Math.cos(a)*d,Py+Math.sin(a)*d*FSY,rand(600,900),rand(150,200))); }
    // the white core of it for a frame, then the line of light over the floor
    K.flare(Px,Py,120,{pal:GW,s:560,dur:.1,gain:5}); K.flare(Px,Py,90,{pal:GW,s:760,sx:3.2,sy:.2,dur:.16,gain:3.4}); K.flare(Px,Py,80,{pal:G,s:300,dur:.9,gain:2.6}); GFX.ripple(Px,Py,hw*2.4,{life:.5,s:BKR?.2:.6,w:.08});
    if(!BKR){ shock(Px,Py,220,RS,RD,120,1.25); shock(Px,Py,160,RS*.55,RD,54,.8); }
    // what it throws goes out along the floor in claws, uneven round the wound
    for(let i=0;i<6;i++){ const a=(i+rand(-.3,.3))/6*TAU, R=rand(620,1250), H=rand(120,460), c=Math.cos(a), s=Math.sin(a); strip(u=>[Px+c*mix(170,R,u),Py+s*mix(170,R,u)*FSY,20+H*Math.sin(Math.PI*Math.min(1,u*1.1))],{pal:G,core:GW,w:rand(26,44),tp:tpNeedle,draw:rand(.1,.16),hold:.05,fade:.26,n:10}); }
    if(!BKR){ K.chunks(Px,Py,{n:2,kind:'stone',r:240,sp:[400,1500],up:2300,s:[60,110],pal:G,rock:'#4e463a',detail:1,glow:.25}); K.chunks(Px,Py,{n:2,kind:'shard',r:240,sp:[500,1600],up:2100,s:[44,80],pal:G,rock:'#4e463a',detail:1,glow:.25}); } K.sparks(Px,Py,60,{pal:G,n:46,sp:[600,2600],up:2200,life:[.3,.9]}); K.dust(Px,Py,{n:14,r:200,sp:[700,1900],a:.5,s:1.5,life:1.4});
    // (detail pass) rock breaks up round the wound in three uneven clusters: layered dark stone, chipped edges, gold light in its cracks, soil falling off it
    // (asset pass) the stone's own glow is a dull ember orange (its cracks and the edges it crumbles at), not the gold of the blade
    const RKP={...G,b:'#b0620c',h:'#ffc070'};
    // (asset pass) real broken stone: a great layered slab in each cluster, broken blocks, a sharp split piece and a worn boulder, soil on their tops
    // (asset r2) the floor's own plates: layered flagstones and split slabs heaved up at a steep outward lean (no rounded stones), each cluster its own sizes
    // (asset r3) grey stone lit gold, not gold stone: four angular wedges heaved up round the foot of the blade, tipped against each other, and stones
    // of every size thrown round them; they stand until after the ult is over. Dust climbs out of the gaps between them as they come up
    const RH=BKR?{L:[]}:K3.rocks(Px,Py+10,{n:4,r:250,s:[130,240],kinds:['shard','stone','shard','flag'],rock:'#5a5246',pal:RKP,glow:.16,dust:.22,dustC:'#4e4234',edge:.09,ore:0,strata:4,lean:3.4,squash:1.1,rise:.1,over:.22,stagger:.03,dur:TE-T1+.3,out:.45,shadow:2,lx:Px,ly:Py});
    if(!BKR) K3.rocks(Px,Py+10,{n:5,delay:.3,r:560,s:[30,95],kinds:['stone','cobble','shard','stone','flag','cobble'],rock:'#4e473c',pal:RKP,glow:.05,dust:.25,dustC:'#4e4234',edge:.08,ore:0,strata:3,lean:1.6,rise:.14,over:.12,stagger:.05,dur:TE-T1+.5,out:.4,shadow:0,lx:Px,ly:Py});
    if(BKR) for(let j=0;j<10;j++){ const a=j/10*TAU+rand(-.2,.2), rr=rand(180,480); GFX.pt({x:Px+Math.cos(a)*rr,y:Py+Math.sin(a)*rr*FSY,z:rand(10,80),vx:Math.cos(a)*rand(40,140),vy:Math.sin(a)*rand(20,70),vz:rand(220,560),g:-15,drag:1,life:rand(1.2,2),s:rand(34,60),grow:rand(80,140),m:5,b:'alpha',c:GFX.rgb(j%2?'#5a4c3a':'#6e5e48'),c2:'#000000',c3:'#b08a58',er:.9,ns:rand(.9,1.5),w:1,a:rand(.22,.34),L:0}); }
    for(const p of RH.L) for(let j=0;j<3;j++){ const a=rand(0,TAU), rr=p.s*rand(.3,.7); GFX.pt({x:p.x+Math.cos(a)*rr,y:p.y+Math.sin(a)*rr*FSY,z:rand(20,p.s*.6),vx:Math.cos(a)*rand(30,120),vy:Math.sin(a)*rand(15,60),vz:rand(260,620),g:-15,drag:1,life:rand(1.2,2),s:rand(30,55),grow:rand(70,130),m:5,b:'alpha',c:GFX.rgb(j%2?'#5a4c3a':'#6e5e48'),c2:'#000000',c3:'#b08a58',er:.9,ns:rand(.9,1.5),w:1,a:rand(.22,.34),L:0}); }
    K.cool(Px,Py,{kind:'crater',r:430,pal:G,life:TE-T1+1.7,hot:.75}); K.cool(Px,Py,{kind:'crack2',r:900,pal:G,life:TE-T1+1.5,hot:.75,grow:.2,light:0});
      // (detail r3) the wound after the blow: terraces of broken floor round it (dark bands stepping down), and at its heart the metal that ran off the
      // blade, a pool that cools white, gold, orange, a dull red, and crusts over (heat colour as a function of the time since the blow)
      GFX.add(TE-T1+1.5,()=>{ const t=now(); if(t<=T1+.25) return; const q=t-T1-.25, f=sat(q/.3), hk=sat((t-TH)/(TE+1.1-TH)), hc=heatC(.25+.7*hk), fo=1-sat((t-TE-.85)/.5);
        for(const [r0,th,a] of [[300,.22,.5],[430,.16,.42],[560,.12,.32]]) GFX.floor(RM,Px,Py,r0*1.15,null,0,[.05,.035,.02],a*f*fo,.87,r0*.01,th,.12);
        GFX.floor(GL,Px,Py,mix(330,240,hk),null,0,hc,(1-.35*hk)*f*fo); GFX.floor(CRK,Px,Py,mix(420,340,hk),null,1.3,hc,(.95-.45*hk)*f*fo,.9,4.7,9,.18); });
    // dust stands up in lumps where the ring has passed, each its own size, the far ones later
    for(let i=0;i<5;i++){ const r=hw*(.3+.14*i)+rand(-60,60); after(ring(r)+.03,()=>K.dust(Px,Py,{n:7,r,sp:[120,460],a:.4,s:1.9+.2*i,life:1.6,c:'#5a4a34',c3:'#9a8460'})); }
    // the ring throws every enemy as it reaches it, far and high, a tail of gold behind each (a full blow shown on every fourth); the killing wave follows while they are in the air
    onScreen(300).filter(e=>!e.dead).sort((a,b)=>fd(a.x,a.y,Px,Py)-fd(b.x,b.y,Px,Py)).forEach((e,i)=>after(ring(fd(e.x,e.y,Px,Py)),()=>{ if(e.dead) return; const a=Math.atan2((e.y-Py)/FSY,e.x-Px);
      if(i%4===0&&i<32) K.ehit(e,{pal:G,pw:1.4,dir:a,light:0}); else hitFx(e,'#ffd36a',1.3); if(e.pin) hurt(e,Dm*.1); if(fly.length<6) fly.push({e,x:e.x,y:e.y,ex:e.x,ey:e.y,ez:0,t:now(),core:1}); K.knock(e,{from:[Px,Py],dist:620,up:rand(1700,2300),stun:1.5}); }));
    // and every planted sword lets go as the ring reaches it, one after another: it fades out where it stands
    // (asset r3) except the three nearest him: they stay standing in the field and come apart the same way after the rest is over
    const son=sw.filter(s=>s.on); son.slice().sort((a,b)=>fd(a.x,a.y,x0,y0)-fd(b.x,b.y,x0,y0)).slice(0,3).forEach(s=>{ s.keep=1; after(TE+.3-now(),()=>boom(s)); });
    son.filter(s=>!s.keep).sort((a,b)=>fd(a.x,a.y,Px,Py)-fd(b.x,b.y,Px,Py)).forEach((s,i)=>after(.03+ring(fd(s.x,s.y,Px,Py)),()=>boom(s,i))); });
  // the field is left in a dim gold that goes down slowly
  after(T1+.14,()=>GFX.ambient(.44,.39,.33,2.5));
  after(T1+.42,()=>Cn.sweep(Px,Py,Dm,{speed:RS/RD,max:RD}));
  // ---- it stands and cools while the camera looks up along it; it fades out softly, and the camera goes home
  after(T1+.45,()=>K.embers(Px,Py,hw*.9,{pal:G,n:44,life:1.8,up:300,z:500,s:1.4}));
  after(T1+.5,()=>{ if(mk) mk.play('rise',{yaw:yaw0}); });
  after(TC,()=>{ Cn.SND.shing(1.2,.4); Cn.SND.tick(1.4,.3); });
  // smoke lit gold from below climbs out of the wound while the blade fades
  after(TH,()=>{
    // (asset r2) smoke out of the wound in puffs of every size, lit gold from below near the floor, spreading as they climb and thinning (not one column of balls)
    for(let i=0;i<Math.round(16*(GFX.QK||1));i++){ const a=rand(0,TAU), rr=rand(40,260), big=i<3, sp=rand(50,260); GFX.pt({x:Px+Math.cos(a)*rr,y:Py+Math.sin(a)*rr*FSY,z:rand(20,260),vx:Math.cos(a)*sp-60,vy:Math.sin(a)*sp*.4,vz:rand(90,380),g:-25,drag:.8,life:rand(.9,1.5),s:big?rand(70,110):rand(20,60),grow:big?rand(100,160):rand(40,110),m:5,b:'alpha',c:GFX.rgb(i%3?'#2e261c':'#40342a'),c2:'#000000',c3:i<6?'#b08048':'#6a5c4c',er:.9,ns:rand(.9,1.6),w:1,a:rand(.25,.42),L:0}); } });
  // (asset r3) the wound keeps smoking after the burst: a column of puffs climbs out of it and leans away, lit from below while the pool is hot,
  // thinner and greyer as it cools, for a second past the end (a count that follows time)
  after(TH,()=>{ let ns=0; GFX.add(TE-TH+1.3,(k,tt)=>{ const want=Math.floor(16*tt-2.2*tt*tt); while(ns<want){ ns++; const h=hs(ns*3.7+.2), a=ns*2.39996, rr=mix(30,200,h), hot=Math.exp(-(TH+tt-T1)*.7);
      GFX.pt({x:Px+Math.cos(a)*rr,y:Py+Math.sin(a)*rr*FSY,z:mix(20,120,h),vx:Math.cos(a)*40-70,vy:0,vz:mix(240,460,hs(ns*1.9)),g:-20,drag:.5,life:mix(1.4,2.1,h),s:mix(40,80,h),grow:mix(110,190,h),m:5,b:'alpha',c:GFX.rgb(h<.5?'#2c241c':'#3e352c'),c2:'#000000',c3:hot>.4?'#c08a48':'#6e6256',er:.9,ns:mix(.9,1.6,h),w:1,a:mix(.26,.4,h)*(1-.4*k),L:0}); } }); });
  // the tower does not break: from TC it lets go of its light and fades out where it stands (drawn in the standing pass above); a soft ring as it goes
  after(TH,()=>{ GFX.light(Px,Py,hw*.95,'#ffd890',.35,1.2,{z:300}); Cn.SND.shing(.7,.4); GFX.ambient(.5,.46,.42,2); });
  // (detail r2) one slow pull home that starts as the tower bursts, so the collapse is seen from where the camera already is
  after(BKR?TH+.62:TH+.02,()=>Cn.back(BKR?.5:TE-TH-.04,'io'));
  after(TE,()=>{ Lt.hold=0; Lt.life=.1; Lt.t=0; for(const e of V.en){ e.skyT=0; e.skyH=0; e.pin=0; } ultStop(); if(mk) mk.free(); }); }

// ECLIPSE SWORD DANCE (sw_ult3, detail pass 2026-11-25): a sky piece. A blood moon rises behind him and every cut he makes feeds it:
// eight cuts leave his blade one after another, faster and faster, each a long crescent that winds out round him to the edge of the
// screen and stays hanging there as a glowing scar, a cut left burning on every body it passed; red light bleeds off the cut bodies and
// up into the moon while a black disc slides over it. The blade goes home as the eclipse goes total (a corona, a last bead of light).
// On the click the moon cracks and the great crimson crescent stands up out of it, moonlight falls on every body on the screen and the
// wheel opens: two great cuts round him and two greater ones over them that leave the screen. What they burnt into the floor is eaten
// from one end to the other. (The afterimages that ran between the bodies moved to sw_ult1.)
const MOONP={d:'#120004',b:'#c0102a',m:'#ff3a52',h:'#ffd8d8',l:'#e01430',s:'#ff8a98'}, MOONW={d:'#4a0010',b:'#ff4a5a',m:'#ffd8d0',h:'#ffffff',l:'#ff8a8a',s:'#ffffff'}, MOOND={d:'#060002',b:'#6a0616',m:'#b00c22',h:'#ff5a6a',l:'#a00a20',s:'#ff6a7a'};
// MOON WAVE: a great crescent lying over the floor that leaves (x,y) along dir. It is drawn once by the swing, then keeps going: it runs
// out fast and slows, growing as it goes, while it burns away from its tail, so it is never the same two frames running. Two darker
// echoes follow it (the afterglow), a white core rides its edge, sparks leave it forward. Nothing random per frame but the sparks.
// Returns {tAt(D): when its edge is D from the start, pt(e,th): a point of its edge at progress e, th radians off its axis}
function moonWave(x,y,dir,o){ const r0=o.r0, r1=o.r1, tv=o.travel||0, dur=o.dur||.5, cd=Math.cos(dir), sn=Math.sin(dir), EZ=1.9, ez=u=>1-Math.pow(1-sat(u),EZ),
    h={tE:e=>dur*(1-Math.pow(1-sat(e),1/EZ)),tAt:D=>h.tE((D-r0)/(r1-r0+tv)),pt:(e,th)=>{ const R=mix(r0,r1,e), d=tv*e; return [x+cd*d+Math.cos(dir+th)*R,y+(sn*d+Math.sin(dir+th)*R)*FSY]; }};
  if(!FX3.on) return h; const F=FX3, tx2=F.ready('v3_slash_thin')?'v3_slash_thin':'fx3_slash', A1=K3.ART.fx3_slash, A2=K3.ART[tx2], P=K3.pal(o.pal), C=pc(P), CD=pc(o.dark), CW=pc(o.core), sd=rand(0,9), ccw=o.ccw?1:-1, z=o.z??BODY*.4, g=o.gain||1;
  const mm=(k,tex,A_)=>lm(k,m=>F.mat({...m.art,tex,layer:'o',nz:'wisp',n1:[1.5,1.5,.5,.1],n2:[1.2,1.2,.2,.1],dist:.03,mdist:1,rk:A_.rk})), m1=mm('mw1','fx3_slash',A1), m2=mm('mw2'+tx2,tx2,A2);
  const put=(mt,A_,e,hk,f,Cc,gain,a,gr)=>{ const R=mix(r0,r1,e)*gr, s=R/((A_.piv[0]-A_.edge)*2*A_.asp), d=tv*e, off=s*A_.asp*(A_.piv[0]-.5)*2;
    F.quad(mt,x+cd*(d+off),y+sn*(d+off)*FSY,s*A_.asp,s,0,{z,M:F.xfw({sx:s*A_.asp,sy:s,rx:-(o.lean??.26),ry:o.roll||0,rz:dir+Math.PI}),...Cc,a,gain,bgain:1.1,ero:.1+f*.5,nk:.1+f*.4,aw:[A_.piv[0],A_.piv[1],ccw>0?.8:-.8,ccw],aw2:[.06+hk*.8,f*.6,.22,1],t0:sd}); };
  const L=GFX.light(x,y,r1*1.1,P.l,o.lit??.9,.25,{hold:dur*.8,z:220}); let em=0;
  GFX.add(dur,(k,t)=>{ const u=t/dur, e=ez(u), hk=eo5(sat(t/.07)), f=sat((u-.42)/.58), d=tv*e, R=mix(r0,r1,e); L.x=x+cd*(d+R*.8); L.y=y+sn*(d+R*.8)*FSY;
    put(m1,A1,ez(u-.13),1,sat(f+.2),CD,2*g*(1-f),.85*(1-f*f),1);
    put(m1,A1,e,hk,f,C,3*g*(1-.4*f),1-f*f,1); put(m2,A2,e,hk,f,CW,3.6*g*(1-.6*f),1-f,1.03);
    if(u<.8&&t-em>.03){ em=t; for(let i=0;i<4;i++){ const th=rand(-1,1), [px,py]=h.pt(e,th), a=dir+th*.5, sp=rand(900,2400)*(1-.6*u), hot=Math.random()<.35;
        GFX.pt({x:px,y:py,z:z+rand(-40,120),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(-40,380),g:600,drag:1.8,life:rand(.25,.55),s:rand(3,6),m:3,len:.07,c:GFX.rgb(hot?'#ffffff':P.s),c3:hot?'#ffffff':P.h,c2:P.b,L:3}); } } },o.delay||0);
  return h; }
function ultMoon(id){ ultStart(id);
  const mk=window.MK&&MK.on()?MK:null, Cn=X.cine, K=K3, F=FX3, Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), f0=pl.f, yaw0=f0>0?0:Math.PI, T1=2.85, TE=4.9, tS=RT, now=()=>RT-tS, PI=Math.PI, tr=K.mats(), CP=pc(MOONP), CW=pc(MOONW);
  const Ex=x0, Ey=y0-170, EZ=380, ER=250, live=()=>V.en.filter(e=>!e.dead&&Math.abs(e.x-x0)<hw*1.75&&e.y-y0>-hh*2.3&&e.y-y0<hh*1.3), dist=e=>Math.hypot(e.x-x0,(e.y-y0)/FSY);
  const hurt=(e,d)=>dmg(e,Math.min(d,Math.max(1,e.hp*.8)),{crit:true,kb:0});
  // gt: the clock of the pieces drawn below (the one the scars, the cuts on the bodies and the threads are timed on). beat: a stroke has landed
  let gt=0, bT=-9, bS=0, sE=0; const beat=s=>{ bT=gt; bS=s; }, marks=[], scars=[];
  // the cut a stroke leaves on a body: it holds the body still and red until the click. The first of them are drawn (a white-hot slash)
  const brand=e=>{ if(!e.mnB&&marks.length<28) marks.push({e,t0:gt,rot:(Math.random()<.5?1:-1)*rand(.5,1.05),sd:rand(0,9)}); e.mnB=Math.min(3,(e.mnB||0)+1); e.mnK=gt; e.stun=Math.max(e.stun,T1-now()+.4); e.mkC='#e01430'; e.mkT=RT+T1-now()+.1; };
  // MOON SHADOW: the dark that spreads over the floor from under him, deepest in the held breath, eaten away after the cut
  const mD=lm('mnD',()=>F.mat({tex:'v3_scorch',nz:'cells',n1:[2,2,.01,.008],nk:.35,pw:.8,ero:.04,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}));
  GFX.add(T1+1.5,(k,t)=>{ const g=eo3(sat(t/.7)), q=sat(t/T1), hs=sat((t-T1+.3)/.12)*(1-sat((t-T1)/.12)), f=sat((t-T1-.5)/1), r=mix(260,hw*2.7,g); F.quad(mD,x0,y0,r,r,.4,{a:(mix(.25,.42,q)+.08*hs)*(1-f*f),ero:.04+f*.7}); });
  // THE RED STAIN: this skill's own omen. Its hot front runs out from under his feet once; after that the floor only answers the blows:
  // it comes up for a moment under each stroke that lands and sinks again, and is all but gone in the held breath
  const mR=lm('mnR',()=>F.mat({tex:'v3_scorch',nz:'wisp',n1:[1.6,1.6,.03,.02],nk:.3,pw:.9,ero:.1,soft:.85,cA:MOOND.d,cB:MOOND.b,cC:MOONP.m,cM:MOONP.b,gain:1.5,layer:'g'}));
  const mF=lm('mnF',()=>F.mat({tex:'v3_scorch_ring',nz:'cells',n1:[3,3,.04,.03],nk:.5,pw:.9,ero:.1,soft:.35,cA:MOOND.d,cB:MOOND.b,cC:MOONP.m,cM:MOONP.b,gain:1.6,layer:'g'}));
  GFX.add(T1+.3,(k,t)=>{ const g=eo3(sat(t/.8)), f=sat((t-T1)/.3), r=mix(160,hw*.95,g), pu=bS*Math.exp(-Math.max(0,t-bT)/.16), hs=1-sat((t-T1+.5)/.3);
    F.quad(mR,x0,y0,r,r,1.3,{a:(1-f*f),gain:(.025+.14*pu)*hs+.1*sat(1-t/.5),ero:.3-.14*pu+f*.5});
    if(t<.95){ const q=t/.95, rf=mix(hw*1.2,170,eo3(q)); F.quad(mF,x0,y0,rf,rf*mix(.86,1,q),.5-t*1.4,{a:sat(q*6)*(1-q*q),gain:1.25*(.4+q*.6),ero:.55-q*.4}); } });
  // (detail r3) the gathering before the moon: the space round him is drawn in. Thin bright threads spiral in from far off, more and
  // faster every moment; chips of the floor lift and drift in on their shadows; three thin rings close on him; the air over him shimmers
  { const RF=GFX.st(2,'add'), RC=GFX.rgb(MOONP.l), sw=f0>0?-1:1; let ac=0, ac2=0, tp=0;
    GFX.add(.85,(k,t)=>{ const q=sat(t/.7), dt=Math.max(0,t-tp); tp=t;
      ac+=(30+170*q*q)*dt; while(ac>=1){ ac-=1; const a=rand(0,TAU), rr=rand(420,1050)*(1-.3*q);
        GFX.pt({x:x0,y:y0,z:20,oc:[x0,y0,BODY*.5],or:rr,oa:a,ow:sw*rand(1.4,2.4)*(1+q),ok:rr*rand(1.3,1.9)*(1+q),oz0:rand(4,70),ob:0,rmin:70,life:1.3,s:rand(2,3.6)*(1+.5*q),m:3,len:.025,c:GFX.rgb(Math.random()<.3+.3*q?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); }
      ac2+=(8+34*q)*dt; while(ac2>=1){ ac2-=1; const a=rand(0,TAU), d=rand(90,420);
        GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vx:0,vy:0,vz:rand(80,240),g:-60,drag:.8,tx:x0,ty:y0,tz:BODY*.7,pull:rand(.5,1.1)*(1+q),life:rand(.8,1.2),s:rand(3,7),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb('#4a3a3e'),c2:'#0a0608',shadow:true,fk:4,L:2}); }
      for(let i=0;i<3;i++){ const u=sat((t-i*.17)/.5); if(u<=0||u>=1) continue; GFX.floor(RF,x0,y0,hw*1.15,null,0,RC,(.3+.5*q)*Math.sin(PI*u),.92*mix(1,.12,eo3(u)),t*3+i,.022,.04); }
      GFX.haze(x0,y0,BODY*.6,mix(160,340,q),.3+.5*q); }); }
  // THE HANGING SCARS, THE CUTS ON THE BODIES: one piece draws them all, on one clock
  const TH0=T1-.52, SWV=[.72,.88,1.38,.8,1.02,1.45,.94,1.55], SBV=[.8,.9,1.2,.85,.95,1.25,.92,1.3], SHZ=GFX.st(3,'add',{c2:GFX.rgb(MOOND.d),c3:GFX.rgb(MOONP.b)}); let sD=0;
  GFX.add(T1+.5,(k,t)=>{ gt=t; const up=sat((t-TH0)/.5), pu=bS*Math.exp(-Math.max(0,t-bT)/.2), pop=sat((t-T1)/.05);
    // a scar is a thin white line in a red glow where a stroke went. Each comes up when the next stroke lands, all of them come up white as
    // the blade goes home, and on the click each burns off from his end outward
    // (detail r2) from 1.85s the whole web turns round him toward the eclipse, faster and faster, and is drawn in: the far end of every
    // scar is swept up toward the black sun more than the end at his blade. Brightness only climbs until the click.
    const sk=sat((Math.min(t,T1)-1.85)/(T1-1.85)), spn=(f0>0?1:-1)*1.8*sk*sk*sk, cs=Math.cos(spn), sn=Math.sin(spn), pl_=.42*sk*sk;
    // (detail r3) no two scars alike: the accents are thick and hot, the others thinner and dimmer; each has a wide dim haze round its red
    // body (batched lines, no draw of its own), and the floor under it is dragged along as the web turns
    const dragT=sk>0&&t<T1&&t-sD>.04; if(dragT) sD=t;
    for(const s of scars){ if(t<s.t0) continue; const inn=sat((t-s.t0)/.2), f=sat((t-T1-.03-s.j*.012)/.3), b=(1+1.6*up*up+.9*pu+1.5*pop*(1-f)+1.2*sk*sk)*SBV[s.j], n_=s.ps.length, ps=[], wv=SWV[s.j];
      for(let i=0;i<n_;i++){ const p=s.ps[i], dx=p.x-x0, dy=(p.y-y0)/FSY, rx=x0+dx*cs-dy*sn, ry=y0+(dx*sn+dy*cs)*FSY, w=pl_*(.35+.65*i/(n_-1)); ps.push({x:mix(rx,Ex,w),y:mix(ry,Ey,w),z:mix(p.z,EZ*.8,w)}); }
      const W_=mix(30,52,up)*(1+.35*pu)*(1+.4*sk)*wv;
      for(let i=0;i<n_-2;i+=2){ const p=ps[i], q=ps[i+2], ex=(q.x-p.x)*.35, ey=(q.y-p.y)*.35, ez=(q.z-p.z)*.35, tp_=Math.sin(PI*(i+1)/(n_-1)); GFX.line(SHZ,p.x-ex,p.y-ey,p.z-ez,q.x+ex,q.y+ey,q.z+ez,W_*2.2*tp_,MBR,.09*inn*(1-f)*Math.min(1.6,b*.5),0,s.sd+i,1,0); }
      if(dragT&&Math.random()<.35+.6*sk){ const p=ps[2+Math.floor(Math.random()*(n_-3))], ta=Math.atan2((p.y-y0)/FSY,p.x-x0)+(f0>0?1:-1)*PI/2, sp=rand(200,500)*(.5+sk);
        for(let i=0;i<3;i++) GFX.pt({x:p.x+rand(-30,30),y:p.y+rand(-20,20),z:rand(3,14),vx:Math.cos(ta)*sp,vy:Math.sin(ta)*sp*FSY,vz:rand(10,60),g:0,drag:1.6,life:rand(.35,.6),s:rand(2,3.5)*wv,m:3,len:.06,c:GFX.rgb(MOONP.l),c2:MOOND.d,a:.5,L:3}); }
      s.cur=ps; F.ribbon(tr.trB,ps,{...CP,w:W_,gain:1.15*b,a:inn*(1-f*f),ero:.3-.12*up+f*.55,t0:s.sd+t*1.4*sk}); F.ribbon(tr.trC,ps,{...CW,w:mix(8,15,up)*(1+.3*sk)*Math.sqrt(wv),gain:2.6*b,a:inn*(1-f),ero:.2+f*.6,t0:s.sd+t*1.4*sk}); }
    // light runs off the scars up into the eclipse, more of it every moment until the click
    if(sk>0&&t<T1&&t-sE>.03){ sE=t; const m_=Math.round(2+12*sk*sk); for(let i=0;i<m_&&scars.length;i++){ const s=scars[Math.floor(Math.random()*scars.length)], p=(s.cur||s.ps)[Math.floor(Math.random()*16)];
        GFX.pt({x:p.x,y:p.y,z:p.z,tx:Ex,ty:Ey,tz:EZ,pull:rand(2.4,3.6)*(1+sk),life:rand(.35,.55),s:rand(2.5,4.5),m:3,len:.1,c:GFX.rgb(Math.random()<.35?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); } }
    if(t>T1+.12) return;
    // the cut on a body: a slash of white heat across the chest, longer for every cut it has taken, swelling when a new one lands
    // (detail r3) one batched line pair per body, no cross: the cut is drawn across it in a tenth of a second, white-hot, then cools to a
    // smouldering red seam that flares when another cut lands on it
    for(const m of marks){ const e=m.e; if(e.dead||!e.mnB) continue; const inn=eo5(sat((t-m.t0)/.1)), kk=Math.max(0,1-(t-(e.mnK||0))/.2), n=e.mnB, L=(e.h*.5+50)*(1+.2*(n-1))*(1+.25*up),
        hot=Math.max(kk,1-sat((t-m.t0-.1)/.3)), cz=e.z+e.h*.55, ux=Math.cos(m.rot)*L*.5, uz=Math.sin(m.rot)*L*.5, h1=mix(-1,1,inn), fl=.8+.2*Math.sin(t*13+m.sd);
      GFX.line(MB,e.x-ux,e.y,cz-uz,e.x+ux*h1,e.y,cz+uz*h1,(8+10*hot)*fl,MBR,(.5+.3*up)*inn,0,m.sd,1,0);
      GFX.line(MB,e.x-ux,e.y,cz-uz,e.x+ux*h1,e.y,cz+uz*h1,(1.5+4*hot)*fl,MBW,Math.min(1,(.25+.75*hot)*(1+up)),0,m.sd+3,1,0); } });
  // ---- THE ECLIPSE: a blood moon hangs behind him, high over the floor (E). It rises as he draws, and every cut that lands feeds it: red
  // light bleeds off the cut bodies and is drawn up into it while a black disc slides over its face, the corona flaring up round the
  // dark as it closes. Total in the held breath; a last bead of light on the rim; on the click it cracks, and the crescent stands out of it.
  // Three upright discs, one draw each: the corona (a flowing ring of fire), the moon (a lit sphere: white-hot middle, dark red limb,
  // mottled face), the shadow (opaque black, a hair larger, so the total eclipse leaves only the corona). The light it throws turns red.
  const mCo=lm('mnCo',()=>F.mat({nz:'wisp',n1:[2.6,2.6,.05,-.35],n2:[1.6,1.6,-.08,.12],dist:.12,nk:.85,pw:1.1,ero:.12,soft:.3,pm:[3,1.1,0,0],rv:[1,.2,.46,.05],rk:[.35,.85],gain:2.4,bgain:1.15})),
    mMo=lm('mnMo2',()=>F.mat({nz:'fbm',n1:[1.4,1.4,.004,.002],n2:[2.4,2.4,.01,0],dist:.05,nk:.26,pw:1,ero:.1,soft:.03,pm:[3,.62,0,0],rk:[.55,1.02],gain:1.2,bgain:1})),
    mSh=lm('mnSh',()=>F.mat({nz:'fbm',n1:[3,3,.02,0],nk:.05,pw:1,ero:.18,soft:.025,pm:[3,.3,0,0],cA:'#000000',cB:'#050002',cC:'#0a0204',op:1}));
  const EC0=.55, EC1=T1-.3, ecl=t=>{ const u=sat((t-EC0)/(EC1-EC0)); return u*u*(3-2*u); };
  const EL=GFX.light(Ex,Ey,700,MOONP.l,.2,.3,{hold:T1+1.5,z:EZ}); let eP=0, eT=0, eW=0;
  // (detail r2) after the click: c<.16 the crescent; .16..CB the dark collapses (5 frames: it shrinks, pulls the moon in after it, its rim
  // tightens and burns white); at CB it bursts; then the moon is a dying ember that sinks and cools for a second and a half
  const CB=.34;
  // (detail r3) THE HOLE'S BODY, all in batched lines and the distortion buffer (no draw of its own): the space round the dark is bent (a
  // refraction ring and a shimmer); a thin white-hot photon ring hugs its rim; a disc of red matter turns round it in the floor plane, three
  // bands, hottest inside, brighter on the side that comes toward us; the half of the disc behind the dark is hidden by it and its far side
  // is seen bent up over the top of the hole (the lensed arc). (cx,cz) centre, r radius, a strength, p how far it has closed, w spin rate
  const HB=GFX.st(3,'add'), LNS=GFX.st(9,'mix',{rt:'dist'}), HW=GFX.rgb('#fff2ee'), HR=GFX.rgb(MOONP.m), HD=GFX.rgb(MOONP.b), hsg=f0>0?-1:1, PTG=GFX.st(8,'add'), SRF=GFX.st(2,'add');
  const hole=(cx,cz,r,a,t,p,w)=>{ if(a<=.01||r<2) return;
    GFX.bill(LNS,cx,Ey,cz,r*2.7,r*2.7,0,[0,0,0],a,.44,0,.17,.75*(.5+.5*Math.min(1,p))); GFX.haze(cx,Ey,cz,r*2.3,.35+.4*Math.min(1,p));
    const N=40, rr=r*1.03; for(let i=0;i<N;i++){ const a0=(i-.3)/N*TAU, a1=(i+1.3)/N*TAU, fl=.7+.3*Math.sin(i*1.7+t*23), c0=Math.cos(a0)*rr, s0=Math.sin(a0)*rr, c1=Math.cos(a1)*rr, s1=Math.sin(a1)*rr;
      GFX.line(HB,cx+c0,Ey,cz+s0,cx+c1,Ey,cz+s1,(5+5*p)*fl,HR,.75*a,0,i,1,0); GFX.line(HB,cx+c0,Ey,cz+s0,cx+c1,Ey,cz+s1,(1.4+2.2*p)*fl,HW,a*Math.min(1,.45+.55*p),0,i+3,1,0); }
    const DY=FSY*.5;
    for(let b=0;b<3;b++){ const Rb=r*(1.25+.42*b), M=40, rot=t*(3.4-.8*b)*w*hsg, wd=(20-5*b)*(.6+.5*Math.min(1,p)), col=b===0?HW:b===1?HR:HD;
      for(let i=0;i<M;i++){ const a0=rot+(i-.3)/M*TAU, a1=rot+(i+1.3)/M*TAU, s0=Math.sin(a0), s1=Math.sin(a1);
        if((s0<0||s1<0)&&Math.min(Math.hypot(Math.cos(a0)*Rb,s0*Rb*DY),Math.hypot(Math.cos(a1)*Rb,s1*Rb*DY))<rr*1.05) continue;
        const fl=.5+.5*Math.pow(.5+.5*Math.sin(i/M*TAU*3+b*2.1),2), dop=.6+.4*Math.cos(a0+.4)*-hsg;
        GFX.line(HB,cx+Math.cos(a0)*Rb,Ey+s0*Rb*DY,cz,cx+Math.cos(a1)*Rb,Ey+s1*Rb*DY,cz,wd*fl,col,a*(b===0?.8:.55)*dop,0,i+b*7,1,0);
        if(b<2) GFX.line(HB,cx+Math.cos(a0)*Rb,Ey+s0*Rb*DY,cz,cx+Math.cos(a1)*Rb,Ey+s1*Rb*DY,cz,wd*2.8*fl,HD,.3*a*dop,0,i+11,1,0); } }
    const ra=r*1.2; for(let i=0;i<18;i++){ const a0=(i-.3)/18*PI, a1=(i+1.3)/18*PI, fe=Math.sin(PI*(i+.5)/18);
      GFX.line(HB,cx+Math.cos(a0)*ra,Ey,cz+Math.sin(a0)*ra*.9,cx+Math.cos(a1)*ra,Ey,cz+Math.sin(a1)*ra*.9,(6+5*Math.min(1,p))*fe,HR,.6*a*fe,0,i+20,1,0);
      GFX.line(HB,cx+Math.cos(a0)*ra,Ey,cz+Math.sin(a0)*ra*.9,cx+Math.cos(a1)*ra,Ey,cz+Math.sin(a1)*ra*.9,2.2*fe,HW,.5*a*fe,0,i+40,1,0); } };
  let hP=0;
  GFX.add(T1+1.7,(k,t)=>{ const inn=eo3(sat((t-.35)/.7)), p=ecl(t), pu=bS*Math.exp(-Math.max(0,t-bT)/.18), tot=sat((t-EC1+.05)/.12), c=t-T1, z=mix(EZ-170,EZ,inn)+8*Math.sin(t*1.7);
    if(inn<=0) return; const R=ER*(1+.03*Math.sin(t*2.3));
    // the air round the eclipse bends: a slow pulse of heat-haze rings, closer together and stronger as it closes
    if(c<CB&&t>.55&&t-eW>mix(.36,.18,p)){ eW=t; GFX.ripple(Ex,Ey,R*mix(2.2,3,p),{life:.5,s:mix(.25,.6,p),w:.07,z}); }
    if(c<0){
      // the black sun comes in from the side his blade points away from and stops dead centre over the moon. It is opaque from the first
      // frame: it grows out of a dark point on the moon's limb, so the moon is darkened bit by bit instead of a see-through disc turning black
      // (detail r3) the space bends first (the lens and the disc come up round an empty point), then the dark swells out of that point,
      // size and opacity together over half a second, so it is never a ring that fills in one frame
      const gr=eo3(sat((t-.52)/.6)), ox=-f0*R*1.3*(1-p), oz=R*.25*(1-p), RSh=R*1.03*mix(.05,1,gr), cs=Math.max(R*.5,RSh)*mix(1.18,1.75,p*p)*(1+.14*pu), cg=mix(1.5,2.1,p*p)*(1+.9*pu)+1.8*tot, hb=sat((t-.4)/.3);
      F.bill(mCo,Ex+ox,Ey,z+oz,cs,cs,t*mix(.15,1.1,p),{...CP,a:inn*mix(0,1,gr)*.8,gain:cg,ero:mix(.2,.08,p),pm:[3,mix(.55,1.1,p),0,0],t0:1.3});
      F.bill(mMo,Ex,Ey,z,R,R,.3,{...CP,a:inn,gain:mix(1.05,.75,p)*(1+.3*pu)*(1-.5*tot),t0:2.1});
      if(t>.52) F.bill(mSh,Ex+ox,Ey,z+oz,RSh,RSh,0,{a:sat((t-.52)/.3),ero:0,soft:.1});
      hole(Ex+ox,z+oz,Math.max(RSh,R*.22*hb),hb*inn,t,p,1+1.5*p+pu);
      // matter spirals into it out of the disc, more of it as it closes
      if(t>.5&&t-hP>.025){ hP=t; const m_=Math.round(1+5*p+3*pu); for(let i=0;i<m_;i++){ const rr=RSh*rand(1.6,3);
        GFX.pt({x:Ex+ox,y:Ey,z:z+oz,oc:[Ex+ox,Ey,z+oz],or:rr,oa:rand(0,TAU),ow:hsg*rand(3,5)*(1+p),ok:rr*rand(1.2,2),oz0:z+oz+rand(-.15,.15)*rr,ob:rr*.05,rmin:RSh*1.02,life:1.2,s:rand(2,4),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); } }
      EL.a=(.25+.9*p*(1-tot*.6))*inn;
      // the thread that ties him to it: light leaves his blade and spirals up into the eclipse, thicker as it closes
      if(t>.45&&t-eT>.035){ eT=t; const q=mk?mk.wpt('st'):[x0+f0*60,y0,BODY*.55], m_=Math.round(1+4*p);
        for(let i=0;i<m_;i++) GFX.pt({x:q[0]+rand(-14,14),y:q[1],z:q[2]+rand(-10,10),vx:rand(-300,300),vy:rand(-80,80),vz:rand(100,400),tx:Ex,ty:Ey,tz:z,pull:rand(2,3)*(1+p),life:rand(.45,.7),s:rand(2.5,4.5),m:3,len:.11,c:GFX.rgb(Math.random()<.4?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); }
      // red light bleeding off the cut bodies, drawn up into the moon; more of it with every cut
      if(t>.8&&t<T1-.08&&t-eP>.04){ eP=t; const live_=marks.filter(m=>!m.e.dead), n=Math.min(live_.length,Math.round(1+5*p+3*pu));
        for(let i=0;i<n;i++){ const e=live_[Math.floor(Math.random()*live_.length)].e;
          GFX.pt({x:e.x+rand(-20,20),y:e.y,z:e.z+e.h*rand(.3,.7),tx:Ex+rand(-.5,.5)*R,ty:Ey,tz:z+rand(-.5,.5)*R,pull:rand(2.2,3.4)*(1+p),life:rand(.45,.7),s:rand(3,5.5),m:3,len:.09,c:GFX.rgb(Math.random()<.25?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); } }
      return; }
    const S=1+.45*eo3(sat(c/.16)), RS=R*S, zc=z+(S-1)*R*.9, kc=sat((c-.16)/(CB-.16)), kk=kc*kc;
    if(c<CB){
      // THE CRESCENT, THEN THE COLLAPSE: the moon flares behind the dark as the dark slips a third of the way off it; then the dark falls in on
      // itself, back to the middle and down to a point, pulling the moon in after it, and its rim tightens round it and burns to white
      // (detail r3) no slipping off to one side any more: the dark stays dead centre and closes evenly on itself, the disc and the photon
      // ring tightening with it and spinning faster, brighter the smaller it gets; in the last frames all of it is one white point (held)
      const RD=RS*.98*(1-.96*kk), RM=RS*(1-.8*kk), cr=Math.max(RD*1.35,RM*.6)+RS*.5*(1-kc), pt_=sat((kc-.78)/.22);
      F.bill(mCo,Ex,Ey,zc,cr*1.9,cr*1.9,t*(1.2+6*kk),{...(kc>.45?CW:CP),a:1-pt_*.7,gain:(3+7*kk)*(1+.5*Math.exp(-c/.06)),ero:.08,pm:[3,mix(1.1,1.6,kk),0,0],t0:1.3});
      F.bill(mMo,Ex,Ey,zc,RM,RM,.3+kk,{...CP,a:1-pt_,gain:mix(1.7,2.6,kk)*(1+.6*Math.exp(-c/.08)),pm:[3,.3,0,0],rk:[.34,.98],ero:.1,t0:2.1});
      F.bill(mSh,Ex,Ey,zc,RD,RD,0,{a:1-pt_,ero:0,soft:.08});
      hole(Ex,zc,RD,1-pt_*.6,t,1+1.5*kk,3+8*kk);
      if(pt_>0) GFX.bill(PTG,Ex,Ey,zc,60+110*pt_,60+110*pt_,0,HW,pt_,0,0,0,0);
      EL.a=1.2+.8*kk; EL.r=900*S*(1-.4*kk);
      if(kc>0&&t-eP>.03){ eP=t; for(let i=0;i<6;i++){ const a=rand(0,TAU), rr=RS*rand(1.2,2.6); GFX.pt({x:Ex+Math.cos(a)*rr,y:Ey,z:zc+Math.sin(a)*rr,tx:Ex,ty:Ey,tz:zc,pull:rand(6,9),life:rand(.12,.2),s:rand(3,5),m:3,len:.12,c:GFX.rgb(Math.random()<.5?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); } }
      return; }
    // THE EMBER: what is left of the moon after the burst. A red-hot sphere that sinks a little, shrinks, darkens from white-red to blood
    // to nothing over a second and a half, while the shock ring of the burst opens round it and burns out
    const b=c-CB, g=sat(b/.85), ag=1-g, sh=eo3(sat(b/.45));
    // (detail r3) what is left of the pull: the bent space where the hole was shrinks, wobbles and lets go over a second, the last
    // sparks of the disc still circling into it
    { const lg=sat(b/1.05); if(lg<1){ const lr=RS*mix(.9,.1,eo3(lg))*(1+.12*Math.sin(b*40)*(1-lg)); GFX.bill(LNS,Ex,Ey,zc,lr*2.7,lr*2.7,0,[0,0,0],(1-lg)*sat(b/.12),.44,0,.17,.8); GFX.haze(Ex,Ey,zc,lr*2.6,.6*(1-lg));
      if(t-hP>.05&&lg<.8){ hP=t; for(let i=0;i<3;i++){ const rr=lr*rand(1.4,2.4); GFX.pt({x:Ex,y:Ey,z:zc,oc:[Ex,Ey,zc],or:rr,oa:rand(0,TAU),ow:hsg*rand(4,6),ok:rr*1.6,oz0:zc,ob:rr*.06,rmin:12,life:.8,s:rand(2,3.5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); } } } }
    if(sh<1) F.bill(mCo,Ex,Ey,zc,RS*(.5+2.6*sh),RS*(.5+2.6*sh),t*1.5,{...CW,a:(1-sh)*(1-sh),gain:4.5*(1-sh),ero:.08+sh*.5,pm:[3,1.4,0,0],t0:1.3});
    if(g<1) F.bill(mMo,Ex,Ey,zc-120*g*g,RS*(.3+.12*eo3(sat(b/.12)))*(1-.35*g),RS*(.3+.12*eo3(sat(b/.12)))*(1-.35*g),.3+t*.2,{...(g<.15?CW:CP),a:ag,gain:mix(3,.55,Math.sqrt(g)),pm:[3,.3,0,0],rk:[.34,.98],ero:.1+g*g*.9,t0:2.1});
    EL.a=1.4*ag*ag; EL.r=900*S*(.6-.25*g);
    if(g<.8&&t-eP>.06){ eP=t; for(let i=0;i<2;i++){ const a=rand(0,TAU); GFX.pt({x:Ex+Math.cos(a)*RS*.3,y:Ey,z:zc-120*g*g+Math.sin(a)*RS*.3,vx:rand(-120,120),vy:rand(-40,40),vz:rand(-300,60),g:500,drag:.8,life:rand(.5,.9),s:rand(3,5),m:3,len:.04,c:GFX.rgb(MOONP.s),c2:MOOND.b,L:3}); } } });
  // the gathering: in the last second before the click everything streams into the eclipse
  const GH=K.gather?K.gather(Ex,Ey,EZ,{dur:T1-1.65,delay:1.65,r:ER*1.7,R:1500,pal:MOONP,shells:2,core:0,floor:0,n:.9,spin:f0>0?-1:1}):null;
  // ---- prepare: the stance, the camera comes in, the light drops to the colour of an eclipse, the stain and its sparks run out low
  if(mk) mk.play('iaiReady',{yaw:yaw0,speed:1.3}); else { plSeq([['gc02',.14],['gc03',.14],['gc04',9]]); pl.target='iaiReady'; pl.ps=18; }
  Cn.move({x:x0,y:y0-BODY*.6-150,zoom:1.4,tilt:.1},.55); GFX.ambient(.56,.4,.44,6); Cn.SND.inhale(1.1,.5); duck(.3,.6); GFX.light(x0,y0,900,MOONP.l,.85,.5,{z:120,hold:.3});
  // the blade wakes in its sheath: a white line runs along it hilt to point and leaves a thin red flare at the point
  after(.3,()=>{ K.dust(x0,y0,{n:12,r:90,sp:[260,620],a:.3,life:.9,c:'#3a1018',c3:'#8a2c3c'}); GFX.light(x0,y0,600,MOONP.l,.7,.26,{z:160}); Cn.SND.shing(1.5,.5);
    const q0=mk?mk.wpt('sb'):[x0,y0,BODY*.5], q1=mk?mk.wpt('st'):[x0+f0*150,y0,BODY*.5];
    strip(ln(q0[0],q0[1],q1[0],q1[1],(q0[2]+q1[2])/2),{pal:MOONW,core:MOONW,w:18,draw:.12,hold:.08,fade:.2,n:8,tp:tpNeedle}); after(.1,()=>K.flare(q1[0],q1[1],q1[2],{pal:MOONW,s:150,sx:3,sy:.25,dur:.22,gain:3})); });
  // ---- build: eight strokes. Each leaves his blade and winds out round him, a third of a turn and more, to the edge of what the camera
  // sees: the first ones short, the last ones past the edge; never two neighbours in a row. Three are accents
  const NS=8, sg=f0>0?1:-1, ACC=[2,5,7], SPN=[2.2,1.9,2.5,2.1,2.7,2.3,2.6,3], RCH=[.5,.64,.74,.82,.9,.96,1.02,1.08], TS=[.78,1.02,1.24,1.44,1.62,1.78,1.92,2.05], arms=[];
  for(let j=0;j<NS;j++){ const a0=yaw0+sg*(j*2.4-.5), sp=sg*SPN[j], a1=a0+sp, Rw=Math.min(hw*1.34/Math.max(.05,Math.abs(Math.cos(a1))),hh*2.2/Math.max(.05,Math.abs(Math.sin(a1))))*RCH[j];
    arms.push({a0,sp,Rw,path:u=>{ const a=a0+sp*u, r=mix(150,Rw,Math.pow(u,.8)); return [x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,BODY*.5+Math.sin(u*PI)*70]; }}); }
  // (detail r2) both ends of a cut come to a point: the tail at his blade, and the head, which grows out of its own tip as it is drawn
  const tpCut=u=>Math.pow(Math.sin(PI*u),.55);
  // the ult's own copy of strip(): the drawn head is sharpened too, so a cut being drawn never shows a square end
  const stripU=(path,o)=>{ if(!FX3.on) return; const C=pc(o.pal), CC=pc(o.core), n=o.n||12, draw=o.draw, hold=o.hold, fade=o.fade, w=o.w, sd=rand(0,9), g=o.gain||1, tp=o.tp||tpCut, cw=o.cw??.4;
    GFX.add(draw+hold+fade,(k,t)=>{ const f=sat((t-draw-hold)/fade), hd=Math.max(.04,eo3(sat(t/draw))), tl=hd*f*f*(o.eat??.85), ps=[];
      for(let i=0;i<n;i++){ const u=mix(tl,hd,i/(n-1)), p=path(u,t); ps.push({x:p[0],y:p[1],z:p[2]||0,w:w*tp(u)*sat((u-tl)/.12)*Math.pow(sat((hd-u)/.16),.7)*(1-.3*f)}); }
      F.ribbon(tr.trB,ps,{...C,gain:3*g,a:1-f*f,ero:.1+f*.55,t0:sd}); for(const p of ps) p.w*=cw; F.ribbon(tr.trC,ps,{...CC,gain:5*g,a:1-f,ero:.16+f*.55,t0:sd}); }); };
  // (detail r3) a body cut by a stroke throws hot chips and a few sparks the way the cut went (batched points, no sticker on it)
  const chips=(e,dir)=>{ const z=e.z+e.h*.55; for(let i=0;i<7;i++){ const a=dir+rand(-.5,.5), sp=rand(300,900), hot=i<3;
      GFX.pt({x:e.x,y:e.y,z,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(150,520),g:1400,drag:1.2,life:rand(.3,.6),s:hot?rand(2.5,4):rand(4,7),rot:rand(0,TAU),vr:rand(-12,12),...(hot?{m:3,len:.04,c:GFX.rgb('#ffffff'),c2:MOONP.b,L:3}:{m:11,b:'alpha',c:GFX.rgb('#3a2228'),c2:'#0a0406',L:2})}); } };
  const stroke=(j,d)=>{ const A_=arms[j], q=j/(NS-1), acc=ACC.includes(j), pe=A_.path(1), pq=A_.path(.92), dir=Math.atan2((pe[1]-pq[1])/FSY,pe[0]-pq[0]), bx=pe[0], by=pe[1];
    // the cut itself: a long filled crescent, white along its core, that is drawn from his blade to its end in d and burns off from his end
    stripU(A_.path,{pal:MOONP,core:MOONW,w:mix(170,240,q)*(acc?1.25:1),draw:d,hold:.1,fade:.3,n:20,cw:.3,eat:.9}); stripU(u=>{ const p=A_.path(u); return [p[0],p[1]+26,p[2]-60]; },{pal:MOOND,core:MOOND,w:mix(230,320,q)*(acc?1.25:1),draw:d,hold:.14,fade:.36,n:16,cw:.2,gain:.6,eat:.9});
    if(mk){ mk.play(['cutA','cutB','cutD','cutC'][j%4],{yaw:A_.a0+sg*.5,blend:.05}); }
    K.flare(x0+Math.cos(A_.a0)*120,y0+Math.sin(A_.a0)*120*FSY,BODY*.55,{pal:MOONW,s:90,sx:3,sy:.4,dur:.1,gain:3.4});
    SFX.slash(1+q*.7,acc?1:.7); Cn.SND.shing(.9+q*.6,.35); if(j%3===0) SFX.whoosh(1+q*.5,.6);
    // every body within reach of its path is cut as the head passes it
    { const S=[]; for(let i=0;i<=14;i++){ const u=.08+.92*i/14, p=A_.path(u); S.push([p[0],p[1],u]); } let n=0;
      for(const e of live()){ let bd=1e9, bu=0; for(const s of S){ const dd=Math.hypot(e.x-s[0],(e.y-s[1])/FSY); if(dd<bd){ bd=dd; bu=s[2]; } } if(bd>(acc?300:250)) continue; const k=n++;
        after(d*bu,()=>{ if(e.dead) return; brand(e); hurt(e,Dm*.04); if(k<3) cutFlash(e,dir,MOONP,150); if(k<10) chips(e,dir); K.knock(e,{dir,dist:70,up:500,stun:T1-now()+.4,fx:0}); }); } }
    // where it ends: the scar is left hanging, the floor answers, a short heavy cut closes it
    after(d,()=>{ const ps=[]; for(let i=0;i<16;i++){ const p=A_.path(.1+.9*i/15); ps.push({x:p[0],y:p[1],z:p[2]}); } scars.push({ps,t0:gt+.04,j,sd:rand(0,9)}); beat(acc?1:.6);
      Cn.shake(acc?.7:mix(.25,.42,q)); if(acc) hitstop=Math.max(hitstop,.035); GFX.light(bx,by,acc?1100:mix(560,800,q),MOONP.l,acc?1:mix(.6,.9,q),.3,{z:140}); GFX.light(x0,y0,A_.Rw*.9,MOONP.l,.35,.25,{z:160});
      // (detail r2) the end of a cut: no textured crescent card any more (its square edges showed for a frame); the tip throws sparks on along its line
      const R=(acc?1.35:1)*mix(330,430,q); swingSparks(bx,by,BODY*.5,R*.3,dir,sg,MOONP,acc?16:9); }); };
  after(.68,()=>{ Cn.move({zoom:1,roll:.03,tilt:.16},.5); GFX.ambient(.56,.4,.44,1); if(mk) mk.play('draw',{yaw:yaw0}); else { pl.target='slashU'; plSeq([['gc05',.03],['gc06',.05],['gc07',9]]); } });
  TS.forEach((t,j)=>after(t,()=>stroke(j,mix(.15,.09,j/(NS-1)))));
  // the camera backs off and rolls while the scars gather; the light keeps sinking toward the red
  after(1.18,()=>{ Cn.move({zoom:.7,roll:.05,tilt:.2},1.05,'lin'); GFX.ambient(.52,.36,.4,1); }); after(1.8,()=>GFX.ambient(.48,.31,.35,1.2));
  // everything the strokes did not reach is cut in one wave, nearest first
  after(2.22,()=>{ const L=live().filter(e=>!e.mnB).sort((a,b)=>dist(a)-dist(b)), st=Math.min(.03,.16/Math.max(1,L.length));
    L.forEach((e,i)=>after(i*st,()=>{ if(e.dead) return; brand(e); if(i<16) chips(e,Math.atan2((e.y-y0)/FSY,e.x-x0)); })); GFX.light(x0,y0,hw*1.4,MOONP.l,.5,.4,{z:200}); Cn.SND.tick(.9,.3); SFX.heart(.9); beat(.7); });
  // ---- the held breath: the blade goes home, the floor goes dark, the camera comes in on him faster and faster as the threads draw tight,
  // every cut body is pulled a step toward him, a glint runs to the guard
  after(T1-.6,()=>{ if(mk) mk.play('notoS',{yaw:yaw0,blend:.1,speed:1.25}); else { plSeq([['gc08',.1],['gc09',.12],['gc10',.14],['gc11',.16],['gc12',9]]); pl.target='iaiDone'; pl.ps=30; } });
  after(T1-.5,()=>{ Cn.move({zoom:1.08,y:y0-BODY*.6-150,roll:0,tilt:.14},.44,'io'); SFX.whoosh(.7,.5); Cn.SND.shing(1.7,.3); });
  after(T1-.3,()=>{ Cn.hush(.3,{a:.18,c:'#ff8a96'}); if(mk){ const q=mk.wpt('sb'); K.flare(q[0],q[1],q[2],{pal:'silver',s:30,sx:4,sy:.4,dur:.24,gain:5}); }
    for(const e of live()){ if(dist(e)>420) K.knock(e,{dir:Math.atan2((y0-e.y)/FSY,x0-e.x),dist:120,up:0,stun:.5,fx:0}); }
    for(const m of marks.slice(0,16)){ const e=m.e; if(!e.dead) GFX.pt({x:e.x,y:e.y,z:e.h*.6,tx:Ex,ty:Ey,tz:EZ,pull:rand(4,6),life:rand(.24,.3),s:rand(4,7),m:3,len:.08,c:GFX.rgb('#ffffff'),c2:MOONP.b,L:3}); } });
  // MOONLIGHT: a shaft of red light falls out of the sky onto a body as the wheel reaches it (a batched line, no draw of its own), and a
  // thin cold ring is left on the floor where it struck
  const MB=GFX.st(3,'add'), MBR=GFX.rgb(MOONP.l), MBW=GFX.rgb('#ffe8e8');
  const moonBeam=(e,i)=>{ const x=e.x, y=e.y, zb=(e.z||0)+e.h*.5, top=1300, sd=rand(0,9), w0=i<8?17:11;
    GFX.add(.36,(k,t)=>{ const dn=eo3(sat(t/.08)), zl=mix(zb+900,zb,dn), zt=mix(zb+1400,zb+520,eo3(sat(t/.16))), f=sat((t-.08)/.28), a=(1-f)*(1-f);
      GFX.line(MB,x,y,zt,x,y,zl,w0*(1-.4*f),MBR,.45*a,0,sd,1,0); GFX.line(MB,x,y,mix(zt,zl,.6),x,y,zl,w0*.3*(1-.6*f),MBW,.85*a,0,sd+3,1,0); }); };
  // ---- the click: the crescent stands up behind him and is gone in a third of a second; out of it the wheel opens
  let W=[], W2=[];
  after(T1,()=>{ SFX.click(); Cn.SND.tick(.6,.3); if(GH) GH.end();
    Cn.peak(x0,y0-BODY*.5,{ca:.016,blur:.04,tint:'#ffffff',a:.16,hold:.05,out:.16}); K.flare(x0,y0,BODY*.6,{pal:MOONW,s:560,dur:.12,gain:4.5}); hitstop=Math.max(hitstop,.12); Cn.shake(1.9); GFX.light(x0,y0,hw*.9,'#ff5a6a',.7,.22,{z:500}); Cn.SND.hit(1); SFX.boom(1.5,1); SFX.shatter(.9);
    GFX.ambient(.4,.27,.3,20); Cn.move({zoom:.58,tilt:.1,y:y0-hh*.12},.46,'io'); GFX.ripple(x0,y0,hw*2.4,{life:.45,s:.5,w:.08});
    // the inner wheel: two cuts, one each way, low over the floor
    W=[[yaw0-.3,1,0,f0>0],[yaw0+PI-.38,.86,.09,f0<=0]].map(([dir,k,dl,ccw])=>({dl,dir,w:moonWave(x0,y0,dir,{r0:520,r1:hw*1.1*k,travel:hw*.5*k,dur:.66,delay:dl,pal:MOONP,dark:MOOND,core:MOONW,ccw,lean:.26,gain:.85,lit:.45})}));
    // the outer wheel: two greater ones across the first pair, higher, tilted the other way, that run out past the edges of the screen
    W2=[[yaw0+.95,1,.1,f0<=0,.22],[yaw0+PI+.8,.92,.17,f0>0,-.2]].map(([dir,k,dl,ccw,roll])=>({dl,dir,w:moonWave(x0,y0,dir,{r0:700,r1:hw*1.6*k,travel:hw*.95*k,dur:.8,delay:dl,pal:MOONP,dark:MOOND,core:MOONW,ccw,lean:.36,roll,gain:.72,z:BODY*1.1,lit:.3})}));
    // THE HOLLOW: the floor inside the wheel goes black as it opens, so the white edge, the red body and the dark stand apart
    GFX.add(1.05,(k,t)=>{ const e=1-Math.pow(1-sat(t/.66),1.9), r=mix(420,hw*1.5,e), f=sat((t-.5)/.55); F.quad(mD,x0,y0,r,r,2.1+t*.5,{a:.82*sat(t/.05)*(1-f*f),ero:.03+f*.6}); F.quad(mD,x0,y0,r*.62,r*.62,.6-t*.4,{a:.6*sat(t/.05)*(1-f),ero:.03+f*.6}); });
    K.cool(x0,y0,{kind:'crack2',r:460,pal:MOONP,life:TE-T1+.7,hot:.8,grow:.2,light:0});
    // under the crescent the floor breaks up behind him: a small cluster of dark stone, red light in its cracks
    if(K.rocks) K.rocks(x0,y0-230,{n:3,r:190,s:[90,210],kind:'crag',pal:MOONP,rock:'#3a2c30',glow:.8,strata:6,edge:.08,dur:1.5,lean:.15}); else K.chunks(x0,y0-120,{n:6,r:300,sp:[400,1300],up:2000,s:[36,84],pal:MOONP,rock:'#1c1218'});
    // THE FUSES: what each cut burns into the floor as it passes. A hot line that cools, and then is eaten from one end to the other by a
    // white point that throws embers up and leaves smoke standing behind it; nothing of it is left when he stands up
    [...W,...W2].forEach(({dl,w},wi)=>{ const e=.56, n=18, big=wi>1, rev=wi%2===1, src=[]; for(let i=0;i<n;i++){ const p=w.pt(e,mix(-1.12,1.12,rev?1-i/(n-1):i/(n-1))); src.push(p); }
      const d=dl+w.tE(e), life=big?1.05:Math.min(1.2,TE-T1-d-.06), tb=big?.32:.42+wi*.1, te=life-.08, at=u=>{ const f=sat(u)*(n-1), i=Math.min(n-2,Math.floor(f)), k=f-i; return [mix(src[i][0],src[i+1][0],k),mix(src[i][1],src[i+1][1],k)]; };
      const Lt=GFX.light(src[0][0],src[0][1],620,MOONP.l,.42,.3,{hold:life,z:120}); let em=0, sm=0;
      // under the two near ones the floor itself is split and molten in five patches along the cut; each cools and breaks up as the point reaches it
      if(!big) for(let i=0;i<4;i++){ const a=at(i/4), b=at((i+1)/4), c=at((i+.5)/4), m=1-Math.abs(i-1.5)/2.6; K.cool(c[0],c[1],{kind:['crack2','lava','lava','crack2'][i],r:470+230*m,ry:220+120*m,rot:Math.atan2((b[1]-a[1])/FSY,b[0]-a[0]),pal:MOONP,life:tb+(te-tb)*(i+.9)/4+.45,hot:.8,gain:1.35,grow:.08,light:0,delay:d+i*.014}); }
      GFX.add(life,(k,t)=>{ const b=sat((t-tb)/(te-tb)), bb=b*b*(3-2*b), inn=eo3(sat(t/.1)), H=K.heat(MOONP,mix(.02,.62,sat(t/(te*.8)))), ps=[], m=12;
        for(let i=0;i<m;i++){ const u=mix(bb,1,i/(m-1)), p=at(u*inn); ps.push({x:p[0],y:p[1],z:6,w:(big?80:130)*Math.pow(Math.sin(PI*sat(.04+u*.92)),.45)*sat(.25+(u-bb)*9)}); }
        if(bb<.985){ F.ribbon(tr.trB,ps,{...H,gain:2.7*H.g,a:1,ero:.14+.2*k,t0:wi*2.3}); if(t<.7){ for(const p of ps) p.w*=.3; F.ribbon(tr.trC,ps,{...CW,gain:4.5,a:1-t/.7,ero:.2+t*.5,t0:wi}); } }
        const hp=at(bb*inn); Lt.x=hp[0]; Lt.y=hp[1];
        if(b>0&&b<1){ 
          if(t-em>.03){ em=t; for(let i=0;i<6;i++) GFX.pt({x:hp[0]+rand(-60,60),y:hp[1]+rand(-30,30),z:rand(6,40),vx:rand(-160,160),vy:rand(-60,60),vz:rand(260,820),g:260,drag:.9,life:rand(.45,.95),s:rand(3,6),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':MOONP.s),c2:MOONP.b,L:3}); }
          if(t-sm>.3){ sm=t; if(!FX3.low&&!big) K.vsmoke(hp[0],hp[1],{s:230,z:10,dur:1.25,rise:520,a:.28,c:'#2a0c12',c2:'#7a2a36',lit:.35}); K.dust(hp[0],hp[1],{n:3,r:30,sp:[40,160],a:.35,life:1,s:1.3,c:'#3a2026',c3:'#8a5058'}); } } },d); });
    // every cut on the screen opens as the wheel reaches it: a red stroke across each body, the nearest in full, and the body is thrown outward
    live().sort((a,b)=>dist(a)-dist(b)).forEach((e,i)=>{ const sd=(e.x-x0)*f0>=0?0:1, d=W[sd].dl+W[sd].w.tAt(dist(e));
      if(i<24) after(Math.max(0,d-.07),()=>moonBeam(e,i));
      after(d,()=>{ if(e.dead) return; const n=e.mnB||0, a=Math.atan2(e.y-y0,e.x-x0); e.mnB=0; e.mkT=0; if(n){ hurt(e,Dm*.1*n); if(i<5){ K.ehit(e,{pal:MOONP,pw:1.2+.2*n,light:0}); K.sparks(e.x,e.y,e.h*.5+e.z,{pal:MOONP,n:10,sp:[400,1500],up:900,life:[.2,.55],s:3}); } }
        if(i<7) cutFlash(e,a,MOONP,180); else if(i<14) chips(e,a); else if(i>=19&&i<40) hitFx(e,'#ff5a70',1.1); if(i>=5&&i<8) K.ehit(e,{pal:MOONP,pw:1.3,light:0}); else if(i>=11&&i<19) hitFx(e,i%2?'#ff5a70':'#ffffff',1.4);
        K.knock(e,{from:[x0,y0],dist:400,up:rand(1800,2200),stun:1.2}); }); }); });
  // (detail r2) the collapsed dark bursts: one white flash where it was, a stop, a hard shake, its light thrown down on the whole floor
  // (detail r3) the point is held for a few frames before it goes
  after(T1+CB-.07,()=>{ hitstop=Math.max(hitstop,.06); });
  // the burst: two frames of white and a hard shake, then the light falls away hard so the burst and what follows are not the same
  // strength; a shock ring runs out over the floor and a second one stands up round the point; the floor under it is torn up and thrown
  // (chips, batched) and left as a crater whose cracks glow and cool
  after(T1+CB,()=>{ const z=EZ+ER*.45*.9; K.flare(Ex,Ey,z,{pal:MOONW,s:520,dur:.12,gain:5.5}); K.sparks(Ex,Ey,z,{pal:MOONP,n:30,sp:[600,2400],up:400,life:[.25,.6],s:3.5});
    Cn.peak(Ex,Ey-z,{ca:.02,blur:.03,tint:'#ffffff',a:.34,hold:.03,out:.1}); GFX.ambient(.3,.2,.24,14); after(.42,()=>GFX.ambient(.66,.5,.52,1.6));
    GFX.light(Ex,Ey,hw*1.6,'#ffd0d4',1.3,.3,{z}); GFX.ripple(Ex,Ey,ER*4,{life:.4,s:.8,w:.08,z}); GFX.ripple(Ex,Ey,hw*1.2,{life:.55,s:.6,w:.06}); hitstop=Math.max(hitstop,.04); Cn.shake(1.9); SFX.boom(1.3,.8);
    K.cool(Ex,Ey,{kind:'crater',r:430,ry:300,pal:MOONP,life:TE-T1-CB+.6,hot:.75,grow:.1,gain:1.3,light:0,shed:0});
    for(let i=0;i<36;i++){ const a=rand(0,TAU), d=rand(80,330), sp=rand(250,800); GFX.pt({x:Ex+Math.cos(a)*d,y:Ey+Math.sin(a)*d*FSY,z:4,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz:rand(700,1500),g:2600,drag:.3,bounce:.3,life:rand(1,1.6),s:rand(5,13),rot:rand(0,TAU),vr:rand(-10,10),m:11,b:'alpha',c:GFX.rgb(i%3?'#3a2c30':'#5a3a40'),c2:'#0a0608',shadow:true,fk:5,L:2}); }
    GFX.add(.5,(k,t)=>{ const e=eo3(sat(t/.45)), a=(1-k)*(1-k), N=48, rf=mix(60,hw*1.1,e), ru=mix(40,ER*3.2,e);
      GFX.floor(SRF,Ex,Ey,hw*1.15,null,0,HR,a,.92*rf/(hw*1.15),t*4,.03,.4);
      for(let i=0;i<N;i++){ const a0=i/N*TAU, a1=(i+1)/N*TAU; GFX.line(HB,Ex+Math.cos(a0)*ru,Ey+Math.sin(a0)*ru*FSY*.35,z+Math.sin(a0)*ru*.8,Ex+Math.cos(a1)*ru,Ey+Math.sin(a1)*ru*FSY*.35,z+Math.sin(a1)*ru*.8,(14*(1-e)+3)*(.7+.3*Math.sin(i*2.3)),i%2?HW:HR,a*.8,0,i,1,0); } }); });
  after(T1+.5,()=>Cn.sweep(x0,y0,Dm,{max:.35}));
  // ---- what is left: petals come down while the fuses burn, the light comes back, he stands
  after(T1+.3,()=>{ K.petals(x0,y0-200,hw*1.5,{pal:MOONP,n:60,z0:400,z1:1700,life:1.7,s:2.6}); });
  after(T1+.62,()=>{ if(mk) mk.play('stand'); for(const e of V.en){ e.mnB=0; } Cn.move({zoom:.62,tilt:.06,roll:-.02},.5); GFX.light(x0,y0,hw*1.3,'#c0102a',.4,1.2,{z:300}); });
  after(T1+1.5,()=>GFX.ambient(.78,.66,.68,.6));
  after(TE-1.05,()=>Cn.back(1));
  after(TE,()=>{ for(const e of V.en) e.mnB=0; ultStop(); if(mk) mk.free(); }); }

X.reg('sword',{basic:{fn:basic,cd:basicCd},skills:SKILL,ults:{sw_ult1:ultZero,sw_ult2:ultRain,sw_ult3:ultMoon},onHurt:src=>{ if(!counterReady()) return false; counter(src); return true; },
  glow:()=>{ if(counterReady()) glow(fx,pl.x,pl.gy-BODY,150,'#ffe9a0',.12+.08*Math.sin(RT*6)); }});
})();
