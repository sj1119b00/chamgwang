// 참광 survival - SWORDSMAN skill set (top-down, all automatic). Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const SV=()=>RPG.api.SV, G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, mix=(a,b,k)=>a+(b-a)*k, {V,A,SK,BODY,nearest,countIn,angTo,face,seq,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,ultStart,ultStop,ultHit,burst,fring}=X;

// ============================================================ skills (the RPG's sword set, re-done for a top-down field; all fire on their own)
const SKILL={
  sw_dash:{moves:true,range:560,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), L=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+140), d=SK[id].dmg*A.mul(id);
    const x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L; face(a); seq('gs',['05','07','09']);
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:'#ff6a85'}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.1}; G.inv=Math.max(G.inv,.35);
    add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.4,c:'#ff3355',w:30,grow:true}); add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.3,c:'#ffffff',w:7,grow:true});
    for(let i=0;i<8;i++) smoke(x0+rand(-20,20),y0+rand(-10,10),rand(14,26),{vx:-Math.cos(a)*rand(80,300),vy:-Math.sin(a)*rand(80,300),a:.35,life:rand(.5,1)});
    sfx('whoosh',1.3,.7); sfx('slash',1.15,1);
    after(.07,()=>inLine(x0,y0,x1,y1,80,e=>{ dmg(e,d,{kb:.8,sx:x0,sy:y0}); hitFx(e,'#ff6a85',1.2); })); }},
  sw_rise:{range:380,fn(id){ const e=nearest(380); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), cx=pl.x+Math.cos(a)*190, cy=pl.gy+Math.sin(a)*190, f=pl.f=Math.cos(a)>=0?1:-1;
    seq('gt',['03','06','08'],{w:.05});
    vfxSwing({x:pl.x+f*50,y:pl.gy-BODY,r:230,a0:Math.PI/2,a1:Math.PI/2-Math.PI*f},{k:1.35,hue:15});
    ring(cx,cy,700,'#ff9aa8',.3,{w:5}); sfx('whoosh',1.2,.7); sfx('slash',1.1,.9);
    after(.03,()=>inCircle(cx,cy,220,e=>{ dmg(e,d,{kb:.3,launch:1200,stun:.9,sx:cx,sy:cy}); hitFx(e,'#ff9aa8',1.2); })); }},
  sw_wave:{range:820,fn(id){ const e=nearest(820); if(!e) return false; const a0=angTo(e), d=SK[id].dmg*A.mul(id), n=A.sLv(id)>=5?5:A.sLv(id)>=3?3:1; face(a0);
    seq('gs',['05','07','09']); sfx('whoosh',1.3,.8); sfx('slash',.9,1.1);
    for(let k=0;k<n;k++){ const a=a0+(k-(n-1)/2)*.28, p={x:pl.x+Math.cos(a)*70,y:pl.gy+Math.sin(a)*70,vx:Math.cos(a)*1500,vy:Math.sin(a)*1500,life:.85,d,hits:new Set(),v:{x:0,y:0},c:'#ff6a85'};
      p.v.x=p.x; p.v.y=p.y-BODY; V.pj.push(p); vfx('slash',p.v.x,p.v.y,{follow:p.v,loop:true,life:.85,sc:.8,rot:a+.6,a:.95}); } }},
  sw_spin:{range:340,fn(id){ if(countIn(360)<3&&!nearest(240)) return false; const d=SK[id].dmg*A.mul(id);
    plSeq([['gu04',.04],['gu06',.06,{tr:1,kick:[2.6,-2.4]}],['gu07',.08,{tr:1}],['gu06',.06,{tr:1}],['gu07',.08,{tr:1}],['gu08',.12],['gu12',.06]]);
    for(let i=0;i<4;i++) after(i*.13,()=>{ const a=RT*7+i*1.6, y=pl.gy-BODY*.8;
      vfxSwing({x:pl.x,y,r:300,a0:a,a1:a+2.2},{k:1.3,hue:45}); vfxSwing({x:pl.x,y,r:300,a0:a+Math.PI,a1:a+Math.PI+2.2},{k:1.3,hue:45,a:.7});
      ring(pl.x,pl.gy,1300,'#ffd36a',.35,{w:7}); sfx('whoosh',1.3,.8); sfx('slash',1.2,.9);
      X.inCircleS(pl.x,pl.gy,360,e=>{ dmg(e,d*.5,{kb:1.1,big:i===3}); hitFx(e,'#ffd36a',1.1); }); }); }},
  sw_fly:{range:620,fn(id){ if(V.orbs.length||!nearest(620)) return false; const n=3+Math.floor((A.sLv(id)-1)/2), d=SK[id].dmg*A.mul(id)*.35;
    plSeq([['gs04',.06],['gs06',.06,{kick:[1.6,-1.2]}],['gs08',.14],['gs12',.06]]); sfx('rise',.4,.3);
    for(let i=0;i<n;i++){ const o={a:i/n*TAU,t:0,life:5,d,v:{x:pl.x,y:pl.gy-BODY}}; o.R=380; o.fx=vfx('goldsword',o.v.x,o.v.y,{follow:o.v,loop:true,life:5,sc:1.15,a:1}); V.orbs.push(o); } }},
  sw_plunge:{moves:true,range:460,fn(id){ const e=nearest(460); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), L=Math.max(0,Math.hypot(e.x-pl.x,e.y-pl.gy)-60), up=k=>1-(1-k)*(1-k), dn=k=>k*k; face(a);
    V.dash={x0:pl.x,y0:pl.gy,x1:pl.x+Math.cos(a)*L,y1:pl.gy+Math.sin(a)*L,t:0,dur:.42}; G.inv=Math.max(G.inv,.5);
    const land=()=>{ const cx=pl.x, cy=pl.gy; pl.air=pl.airT=0;
      shock(cx,cy-20,.8); ring(cx,cy,1700,'#ff6a85',.5,{w:9}); ring(cx,cy,900,'#ffffff',.25,{w:4}); gl0(cx,cy-40,260,'#ff6a85',.35,{grow:300,a:.6}); light(cx,cy,900,'#ff6a85',.4,.5);
      for(let i=0;i<16;i++){ const b=rand(0,TAU), s=rand(300,900); V.shards.push({x:cx,y:cy,z:10,vx:Math.cos(b)*s,vy:Math.sin(b)*s*.6,vz:rand(400,1100),s:rand(6,16),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:rand(.8,1.3),rock:true}); }
      for(let i=0;i<10;i++) smoke(cx+rand(-120,120),cy+rand(-50,50),rand(30,60),{vx:rand(-300,300),vy:rand(-120,40),a:.4,life:rand(.8,1.6)});
      trauma=Math.min(1.1,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.3,1);
      inCircle(cx,cy,390,e=>{ dmg(e,d,{kb:1.2,launch:800,stun:.7,big:true,sx:cx,sy:cy}); hitFx(e,'#ff6a85',1.4); }); };
    plSeq([['gt03',.06],['gt08',.18,{air:[0,280],ease:up}],['gs06',.06,{air:[280,300]}],['gs07',.12,{tr:1,air:[300,0],ease:dn}],['gs08',.06,{tr:1,kick:[2.6,-2.6],on:land}],['gs09',.14],['gs12',.08]]); }},
  sw_thrust:{range:400,fn(id){ const e=nearest(400); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id); face(a);
    plSeq([['gk03',.06],['gk04',.06,{kick:[1,-.8]}],['gk05',.05],['gk06',.06,{kick:[1,-.8]}],['gk07',.05],['gk08',.06,{kick:[1,-.8]}],['gk09',.16,{tr:1,kick:[2,-1.6]}],['gk12',.06]]);
    for(let i=0;i<6;i++) after(.06+i*.06,()=>{ const b=a+rand(-.12,.12), x0=pl.x+Math.cos(b)*40, y0=pl.gy+Math.sin(b)*40, x1=pl.x+Math.cos(b)*400, y1=pl.gy+Math.sin(b)*400;
      add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.16,c:'#ff3355',w:16}); add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.12,c:'#ffffff',w:4}); sfx('slash',1.5,.45);
      inLine(x0,y0,x1,y1,60,e=>{ dmg(e,d,{kb:.25,stun:.3}); hitFx(e,'#ffffff',.9); }); }); }},
  sw_counter:{passive:true},
};
function counterReady(){ const id='sw_counter'; return A.unlocked(id)&&(V.cd[id]||0)<=0; }
function counter(src){ const id='sw_counter', d=SK[id].dmg*A.mul(id); V.cd[id]=A.cdOf(id); G.inv=1.1; slow(.25,.35); stamp('카운터',{x:.5,y:.36,size:.14,life:.9,c:'#9ff7ff'}); sfx('boom',1,.8);
  if(src) face(Math.atan2(src.y-pl.gy,src.x-pl.x)); anim.seq=null;
  plSeq([['gc05',.05,{tr:1,kick:[2.8,-2.6]}],['gc06',.08,{tr:1}],['gc07',.18],['gc10',.08],['gc12',.06]]);
  const y=pl.gy-BODY*.8; vfxSwing({x:pl.x,y,r:340,a0:-2.4,a1:.2},{k:1.4,hue:-160}); vfxSwing({x:pl.x,y,r:340,a0:.7,a1:3.3},{k:1.4,hue:-160});
  ring(pl.x,pl.gy,1600,'#9ff7ff',.45,{w:8}); light(pl.x,y,900,'#9ff7ff',.5,.5);
  X.inCircleS(pl.x,pl.gy,440,e=>{ dmg(e,d,{kb:2,big:true,crit:true}); hitFx(e,'#9ff7ff',1.5); }); }

// basic: a 3-cut chain at the nearest enemy - two cuts, then a wide heavy one
function basic(){ const e=nearest(430); if(!e) return false; const a=angTo(e), n=V.chain++%3, big=n===2, r=big?360:300, d=1200*A.mul('sw_basic')*(big?1.7:1), s=n===1?-1:1; face(a);
  seq(['gs','gu','gs'][n],[['05','06','08'],['04','06','08'],['05','07','09']][n],{basic:true});
  const y=pl.gy-BODY*.85, half=big?1.6:1.25;
  vfxSwing({x:pl.x,y,r:r*.85,a0:a-half*s,a1:a+half*s},{k:1.3,hue:big?40:0});
  add({k:'arc',x:pl.x,y,a0:a-half*s,a1:a+half*s,r:r*.8,sy:1,rot:0,th:big?80:55,c:big?'#ffd36a':'#ff6a85',life:.3,sw:.07});
  add({k:'arc',x:pl.x,y,a0:a-half*s,a1:a+half*s,r:r*.66,sy:1,rot:0,th:22,c:'#ffffff',life:.2,sw:.06});
  sfx('whoosh',1.1+n*.1,.6); sfx('slash',1+n*.06,big?1:.75);
  after(.04,()=>inSector(pl.x,pl.gy,a,r,half,e=>{ dmg(e,d,{kb:big?1.3:.7}); hitFx(e,big?'#ffd36a':'#ff6a85',big?1.3:1); }));
  return true; }
const basicCd=()=>.8*(1-.05*(A.sLv('sw_basic')-1));


// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const RED='#ff2a4a', GOLD='#ffcf4a';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH: a sigil writes itself under him; one drawn breath; a crescent the width of the field; eight cuts nobody sees,
// left hanging in the air as humming seams; the blade goes home in silence - and only then does every seam tear open, one after another.
function ultZero(id){ ultStart(id); const Cn=X.cine, K=K3, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), N=8, hy=y0-BODY*.55, P='crimson', f0=pl.f;
  // ---- omen: the light cools and drops, the circle writes itself, the air is drawn to the hilt
  plSeq([['gs03',.12],['gs04',9]]); pl.target='iaiReady'; pl.ps=18;
  GFX.ambient(.44,.42,.6,3.5); const spot=GFX.light(x0,y0,520,'#ff3a55',.75,.6,{hold:9,z:120});
  const sig=K.sigil(x0,y0,{r:hw*.6,dur:9,in:1.05,out:.3,spin:.32,pal:P}), sig2=K.sigil(x0,y0,{r:hw*.86,dur:9,in:1.2,out:.3,spin:-.2,pal:P,gain:.55});
  sig2.a=.5; K.crack(x0,y0,{r:230,pal:P,life:5.5,grow:1.1});
  Cn.zoom(1.42); Cn.roll(-.04); Cn.cam(x0,hy,4.5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9)); Cn.SND.inhale(1.15,.5);
  for(let i=0;i<3;i++) after(.15+i*.32,()=>K.shock(x0,y0,{r0:hw*(1.05-i*.12),r:60,dur:.42,pal:P,gain:.5,light:0,dust:0,haze:.5,th:.6}));
  for(let i=0;i<46;i++) after(rand(0,.95),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,420),tx:x0+f0*30,ty:y0,tz:BODY*.55,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.4?'#ffffff':'#ff7a90'),c2:'#ff0a28',L:3}); });
  for(let i=0;i<10;i++) after(rand(.2,1),()=>{ const a=rand(0,TAU), d=rand(120,420); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.7,1.1),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  // the eight cuts: finite strokes through the crowd at spread angles
  const T=onScreen(100), cuts=[], L=hw*1.95;
  for(let i=0;i<N;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null, cx=clamp(e?e.x:x0+rand(-hw,hw)*.6,x0-hw*.62,x0+hw*.62), cy=clamp(e?e.y:y0+rand(-hh,hh)*.5,y0-hh*.6,y0+hh*.6), a=(i*5%N)*Math.PI/N+.31+rand(-.1,.1);
    cuts.push({cx,cy,a,L,x1:cx-Math.cos(a)*L/2,y1:cy-Math.sin(a)*L/2,x2:cx+Math.cos(a)*L/2,y2:cy+Math.sin(a)*L/2,seam:null}); }
  // ---- the draw: one crescent across the whole field, the camera gives it room
  const t0=1.3;
  after(t0-.07,()=>{ K.flare(x0+f0*40,y0,BODY*.6,{pal:P,s:60,sx:5,sy:.35,dur:.16,gain:5}); Cn.SND.tick(1.4,.3); });
  after(t0,()=>{ spot.hold=0; spot.life=.25; pl.target='slashU'; plSeq([['gs05',.03],['gs07',.05],['gs09',9]]); const dir=f0>0?0:Math.PI;
    K.cres(x0,y0,BODY*.55,{reach:hw*.8,dir,lean:.5,roll:-.12*f0,tex:'fx3_slash',pal:P,swing:.08,hold:.18,fade:.46,gain:1.05,sparks:0,ccw:f0<0});
    K.cres(x0,y0,BODY*.55,{reach:hw*.88,dir,lean:.5,roll:-.12*f0,tex:'v3_slash_thin',pal:P,swing:.07,hold:.12,fade:.34,gain:1.4,sparks:0,light:0,ccw:f0<0});
    K.art(x0+f0*90,y0,{tex:'v3_xburst',s:hw*.36,z:BODY*.1,dur:.3,pal:P,gain:1.05,hold:.2,s0:.6});
    K.shock(x0,y0,{r:hw*1.5,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.6,{life:.45,s:.7});
    K.sparks(x0+f0*60,y0,BODY*.6,{pal:P,n:40,sp:[500,1900],up:500,dir,spread:1.5});
    K.dust(x0,y0,{n:14,r:80,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,700],up:900});
    hitstop=Math.max(hitstop,.085); Cn.shake(1); post.ca=.005; Cn.zoom(.9); Cn.cam(null); Cn.roll(.03); SFX.slash(.8,1.2); Cn.SND.shing(.8,.7); SFX.whoosh(.7,1);
    X.inCircleS(x0,y0,hw*1.1,e=>{ e.flash=1; e.stun=Math.max(e.stun,3.2); e.kx+=(e.x-x0>0?1:-1)*120; hitFx(e,RED,1); }); });
  after(t0+.11,()=>{ pl.visible=false; K.flare(x0,y0,BODY*.6,{pal:P,s:150,dur:.2,gain:2.5}); sig.a=.4; sig2.a=.25; });
  // ---- the flurry: he is gone; each cut is a thrown crescent, and stays in the air where it was made
  let tt=t0+.26; const gaps=[.17,.15,.13,.11,.09,.075,.06,.05];
  cuts.forEach((c,i)=>{ after(tt,()=>{ const dx=Math.cos(c.a), dy=Math.sin(c.a);
      c.seam=K.seam(c.x1,c.y1,c.x2,c.y2,{z:105,w:22,pal:P});
      K.cres(c.cx-dx*hw*.3,c.cy-dy*hw*.3,105,{reach:hw*rand(.75,.95),dir:c.a,lean:rand(.25,.7),roll:(i%2?1:-1)*rand(.15,.55),tex:i%2?'v3_slash_thin':'fx3_slash',pal:P,swing:.05,hold:.04,fade:.26,gain:.95,light:0,sparks:6,ccw:i%2});
      // where he passed: the figure mid-stroke, lit by his own blade, already fading
      const ax=c.cx+dx*rand(-120,120), ay=c.cy+dy*rand(-120,120), ff=dx>=0?1:-1, st=GFX.st(0,'add',{c2:[.3,0,0],c3:[1,.3,.4]});
      GFX.add(.4,k=>{ GFX.pose(st,'sword',i%2?'gs07':'gu06',ax+dx*70*k,ay+dy*70*k,ff,[1,.42,.5],(1-k)*(1-k)*.9,{smear:.45*(1-k),sc:1.25}); });
      GFX.light(c.cx,c.cy,L*.5,'#ff2440',.8,.28,{z:105});
      inLine(c.x1,c.y1,c.x2,c.y2,60,e=>{ e.cut=(e.cut||0)+1; e.flash=1; e.stun=Math.max(e.stun,3); K.sparks(e.x,e.y,e.h*.5,{pal:P,n:5,dir:c.a+(Math.random()<.5?0:Math.PI),spread:.5,sp:[400,1300],up:300,life:[.15,.35]}); });
      for(let q=0;q<4;q++){ const u=rand(.2,.8), px=mix(c.x1,c.x2,u), py=mix(c.y1,c.y2,u); K.dust(px,py,{n:2,dir:c.a+(q%2?1:-1)*Math.PI/2,spread:.4,sp:[150,420],a:.38,s:.8}); }
      Cn.SND.shing(1+i*.07,.45); SFX.slash(1.2+i*.06,.8); Cn.roll((i%2?1:-1)*.045); Cn.shake(.34+i*.035); post.ca=.003; Cn.zoom(.9-i*.008); }); tt+=gaps[i]; });
  const t1=tt+.2;
  // ---- stillness: he is back where he stood, back turned; the seams pulse like a heartbeat, faster and faster; the guard clicks home
  after(t1,()=>{ pl.visible=true; pl.f=f0; plSeq([['gs08',.22],['gs09',.22],['gs11',.3],['gs12',9]]); pl.target='iaiDone'; pl.ps=30; Cn.zoom(1.3); Cn.roll(.035); Cn.cam(x0,hy,3);
    GFX.ambient(.4,.38,.56,6); GFX.light(x0,y0,460,'#ffe8e0',.7,.4,{hold:.75,z:160}); K.flare(x0,y0,BODY*.5,{pal:P,s:200,dur:.3,gain:2}); SFX.whoosh(1.4,.5); duck(.18,.75); K.dust(x0,y0,{n:10,r:40,sp:[150,380],a:.35}); sig.a=.8; sig2.a=.4; });
  [.12,.34,.52,.66,.76].forEach((d,j)=>after(t1+d,()=>{ for(const c of cuts) if(c.seam) c.seam.kick(); SFX.heart(.7+j*.08); GFX.light(x0,y0,hw*1.2,'#ff2440',.25+j*.07,.2,{z:100}); K.shock(x0,y0,{r0:hw*.5,r:70,dur:.2,pal:P,gain:.35,light:0,dust:0,haze:.3,th:.5}); Cn.zoom(1.3+j*.025); }));
  after(t1+.6,()=>{ pl.target='sheath'; pl.ps=14; SFX.click(); Cn.SND.tick(.6,.3); K.flare(x0-f0*30,y0,BODY*.62,{pal:P,s:46,sx:6,sy:.3,dur:.22,gain:6}); });
  // ---- climax: the seams tear open nearest first, each into a wall of fire that throws what it cut into the air
  const tc=t1+.86, ord=cuts.map(c=>[c,Math.hypot(c.cx-x0,c.cy-y0)]).sort((a,b)=>a[1]-b[1]), step=.055;
  after(tc,()=>{ hitstop=Math.max(hitstop,.07); Cn.shake(1.1); post.ca=.005; Cn.zoom(.86); Cn.roll(-.03); Cn.cam(null); GFX.ambient(.5,.36,.44,30); sig.a=1.5; sig2.a=1; SFX.shatter(.8); });
  ord.forEach(([c],j)=>{ after(tc+j*step,()=>{ if(c.seam) c.seam.end(); const dx=Math.cos(c.a), dy=Math.sin(c.a), n=7, pts=[], big=j===0, nx=-dy, ny=dx;
      for(let q=0;q<n;q++){ const u=q/(n-1); pts.push({x:mix(c.x1,c.x2,.04+u*.92),y:mix(c.y1,c.y2,.04+u*.92),h:(big?1700:rand(1000,1400))*(.4+.6*Math.sin(Math.PI*u))}); }
      K.wall(pts,{pal:P,dur:big?2:rand(1.5,1.85),gain:big?1.1:.9,rise:.16,ord:c.cy});
      K.gash(c.x1,c.y1,c.x2,c.y2,{pal:P,life:6,w:big?200:150,gain:1.15,grow:.07});
      // light spills to one side of the wall, so the floor shows which way it faces
      GFX.light(c.cx+nx*160,c.cy+ny*160*FSY+60,L*.42,'#ff2440',.75,1,{z:160});
      K.sparks(c.cx,c.cy,60,{pal:P,n:16,sp:[500,1800],up:1700,life:[.3,.9]}); K.debris(c.cx,c.cy,{n:big?10:6,r:L*.3,sp:[200,800],up:1500,size0:8,size:26});
      K.dust(c.cx,c.cy,{n:6,r:L*.2,sp:[200,600],a:.4});
      // what stood on the line is thrown clear of it
      inLine(c.x1,c.y1,c.x2,c.y2,90,e=>{ const sd=((e.x-c.cx)*nx+(e.y-c.cy)*ny)>=0?1:-1; e.flash=1; e.stun=Math.max(e.stun,1.2); if(!e.d.heavy){ e.vz=Math.max(e.vz,rand(700,1150)); e.kx+=nx*sd*rand(260,520); e.ky+=ny*sd*rand(160,320); } K.sparks(e.x,e.y,e.h*.5,{pal:P,n:4,sp:[300,1100],up:900}); });
      Cn.SND.shing(.7+j*.05,.4); SFX.boom(.9+j*.04,.5); Cn.shake(.5+j*.06); Cn.roll((j%2?1:-1)*.03); }); });
  // the last beat: the circle itself bursts and the floor under him gives way
  const tf=tc+N*step+.04;
  after(tf,()=>{ hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.006; Cn.zoom(.82); Cn.roll(0);
    sig.dead=true; sig2.dead=true; K.art(x0,y0,{tex:'v3_xburst',s:hw*.8,floor:true,dur:.4,pal:P,gain:.7,hold:.2,s0:.5}); K.art(x0,y0,{tex:'v3_circ_blade',s:hw*.78,floor:true,dur:.55,pal:P,gain:.6,hold:.05,s0:.8});
    K.crack(x0,y0,{r:hw*1.1,pal:P,life:6,grow:.14,gain:1.2}); K.shock(x0,y0,{r:hw*1.8,dur:.6,pal:P,gain:1.1}); K.shock(x0,y0,{r:hw*2.4,dur:.9,pal:P,gain:.6,delay:.1,light:0});
    GFX.ripple(x0,y0,hw*2,{life:.6,s:.9}); K.dome(x0,y0,{r:hw*.95,dur:.45,pal:P,gain:.7}); K.debris(x0,y0,{n:26,r:200,sp:[300,1300],up:1900,size0:9,size:28}); K.dust(x0,y0,{n:22,r:120,sp:[500,1400],a:.5});
    GFX.light(x0,y0,hw*2,'#ff5a6a',1,.6,{z:200}); GFX.ambient(.4,.3,.4,3);
    Cn.sweep(x0,y0,D*1.5,{speed:4200,max:.45}); post.grayT=0; SFX.shatter(1); Cn.SND.hit(1); SFX.boom(1.6,1);
    K.petals(x0,y0-hh*.2,hw*1.2,{pal:P,n:90,z0:300,z1:1600,life:3.2,s:1.25}); });
  // ---- afterglow: smoke stands where the walls were, petals of light come down, the wounds in the floor cool
  after(tf+.35,()=>{ ord.slice(0,5).forEach(([c],j)=>K.smoke(c.cx,c.cy,{s:rand(240,340),dur:rand(1.6,2.2),delay:j*.07,c:'#1c0a12',c2:'#5a2030',a:.6,rise:300})); });
  after(tf+.6,()=>{ K.petals(x0,y0,hw*1.2,{pal:P,n:70,z0:500,z1:1400,life:2.8,s:1.25}); K.embers(x0,y0,hw*.95,{pal:P,n:46,life:2.4,s:1.3}); GFX.ambient(.72,.64,.72,1.1); Cn.zoom(.94); });
  after(tf+1.45,()=>{ GFX.ambient(1,1,1,1.3); Cn.zoom(1); });
  after(tf+1.9,()=>ultStop()); }

// SWORD RAIN: a blade raised to a sky that answers - rings of falling swords walk outward from him, stay standing in the earth, and the last one is the size of a tower.
function ultRain(id){ ultStart(id); const Cn=X.cine, D=9000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), R=hw*.92, stuck=[], sw=spr('sword');
  plSeq([['gs03',.1],['gs04',.18],['gs05',4.6],['gs06',.08],['gs07',.12],['gs08',.5],['gs12',9]]); pl.target='cast'; pl.ps=10;
  Cn.setDark(.74,{c:'10,7,2',spot:{x:x0,y:y0,r:1000,a:.25}}); Cn.zoom(1.32); Cn.cam(x0,y0-BODY*1.3,5);
  const circ=Cn.floorTex('fx_circle_arcane',x0,y0,40,{c:GOLD,spin:.5,a:.95,life:6}); circ.core=.25;
  let t=0, beam=0, big=0; V.ultTick=dt=>{ t+=dt; circ.r=lerp(40,R*.92,easeOut(Math.min(1,t/1.6))); circ.a=t>3.5?Math.max(.22,.95-(t-3.5)*1.6):.95; if(t>4.45) circ.a=Math.max(0,.22-(t-4.45)*.5); beam=Math.min(1,t/.5)*(t>4.2?Math.max(0,1-(t-4.2)/.3):1); };
  // the pillar of light from the raised blade, and the swords he has already planted
  V.ultDraw=()=>{ if(beam>0){ const bx=x0+pl.f*18, by=y0-BODY*2.05, w=(46+10*Math.sin(RT*31))*beam, g=fx.createLinearGradient(bx-w,0,bx+w,0); g.addColorStop(0,hexA(GOLD,0)); g.addColorStop(.5,hexA('#fff6d0',.9*beam)); g.addColorStop(1,hexA(GOLD,0));
      fx.fillStyle=g; fx.fillRect(bx-w,by-3000,w*2,3000); glow(fx,bx,by,170,GOLD,.5*beam); }
    if(big&&sw){ const q=RT-big, k=Math.min(1,q/.3), e=k*k*k, h=2700, w=h*sw.w/sw.h, a=q>1.05?Math.max(0,1-(q-1.05)/.4):1; if(a>0){ ctx.save(); ctx.translate(big_x,big_y-(1-e)*2600); ctx.rotate(.05); ctx.scale(1,-1); ctx.globalAlpha=a; ctx.drawImage(sw.im,-w/2,-h*.13,w,h); ctx.restore(); ctx.globalAlpha=1;
        glow(fx,big_x,big_y-h*.45-(1-e)*2600,h*.42,GOLD,.3*a); } }
    for(const s of stuck){ const k=Math.min(1,(RT-s.t0)/.08), h=300, w=sw?h*sw.w/sw.h:20; ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot); ctx.globalAlpha=.95; if(sw){ ctx.scale(1,-1); ctx.drawImage(sw.im,-w/2,-h*.16-h*(1-k)*.4,w,h); } else { ctx.fillStyle='#e8d8a0'; ctx.fillRect(-4,-h*.8,8,h*.8); } ctx.restore(); ctx.globalAlpha=1; glow(fx,s.x,s.y-90,70,GOLD,.28+.1*Math.sin(RT*6+s.x)); } };
  Cn.gather(x0,y0-BODY*2,{c:GOLD,dur:.9,r:900,n:40,fy:y0});
  const land=(x,y)=>{ stuck.push({x,y,t0:RT,rot:rand(-.22,.22)}); add({k:'line',x1:x,y1:y-800,x2:x,y2:y-40,life:.16,c:'#ffe58a',w:14}); fring(x,y,700,GOLD,.3,4); gl0(x,y-30,90,GOLD,.18,{a:.8});
    for(let i=0;i<4;i++) spark(x,y-20,-Math.PI/2+rand(-1.3,1.3),rand(300,900),{c:pick(['#ffffff',GOLD]),life:rand(.15,.3),w:2,g:900});
    burst(x,y,2,{rock:true,s0:150,s1:450}); sfx('boom',.5,.3); sfx('slash',1.6,.3); inCircle(x,y,170,e=>{ dmg(e,D,{kb:.6,stun:.5,sx:x,sy:y}); hitFx(e,GOLD,1); }); };
  const fall=(x,y)=>{ const S_=VFX.td_swordfall, lead=S_&&S_.f[0].ok?S_.hit*S_.ms/1000:.12; if(S_&&S_.f[0].ok){ vfx('td_swordfall',x,y,{px:S_.ix,py:S_.iy,sc:1000/S_.h}); V.shads.push({x,y,t0:RT,dur:lead,r:120}); } after(lead,()=>land(x,y)); };
  // release: the sky answers in rings that walk outward from him
  after(1.82,()=>{ Cn.release(x0,y0,GOLD); Cn.zoom(.84); Cn.cam(null); Cn.setDark(.78,{spot:null}); SFX.choir(2.6); });
  const T=onScreen(60);
  for(let k=0;k<5;k++){ const n=5+k*3, rr=230+k*(Math.max(hw,hh)*.2); after(1.98+k*.3,()=>{ Cn.SND.shing(.8+k*.08,.4); Cn.shake(.3);
      for(let i=0;i<n;i++){ const a=i/n*TAU+k*.4, e=T.length&&i%2?T[(Math.random()*T.length)|0]:null; after(rand(0,.12),()=>fall(e?e.x:x0+Math.cos(a)*rr,e?e.y:y0+Math.sin(a)*rr*.8)); } }); }
  // climax: the tower
  const b=V.boss&&!V.boss.dead?V.boss:null, [cx,cy]=b?[b.x,b.y]:[x0+pl.f*hw*.42,y0+hh*.16], big_x=cx, big_y=cy;
  after(3.6,()=>{ V.shadow={x:cx,y:cy,t0:RT,dur:.85,r:520,c:GOLD}; Cn.omen(cx,cy,560,GOLD,.85); Cn.zoom(.8); Cn.setDark(.9,{spot:{x:cx,y:cy,r:900,a:.3}}); Cn.SND.inhale(.85,.6); Cn.speed(.85,{c:GOLD,a:.3,x:cx,y:cy-300}); pl.target='slashU'; pl.ps=20; });
  const K=VFX.td_colossal, lead=K&&K.f[0].ok?K.hit*K.ms/1000:0;
  after(4.15,()=>{ big=RT; sfx('whoosh',.4,1); });
  after(4.45-lead,()=>{ if(!sw&&!tdV('td_colossal',cx,cy,{px:K.ix,py:K.iy,sc:1900/K.h})) add({k:'pillar',x:cx,w:220,life:1,c:GOLD}); });
  after(4.45,()=>{ V.shadow=null; Cn.impact(cx,cy-80,{c:GOLD,n:3,r:.16,then:()=>{ Cn.zoom(.9); Cn.waves(cx,cy,GOLD,{n:3,s:1.1}); for(let q=0;q<4;q++) Cn.scar({kind:'gash',x:cx,y:cy,rot:q*Math.PI/4+.2,len:1500-q%2*500,w:320,c:GOLD,life:8,heat:3}); Cn.scar({kind:'burn',x:cx,y:cy,r:380,c:GOLD,life:8,heat:3}); Cn.wash('255,236,170',.22,0,cx,cy);
      burst(cx,cy,26,{rock:true,s0:400,s1:1400,size:20}); Cn.sweep(cx,cy,D*8,{speed:3400});
      // every planted sword goes up in light, nearest first
      for(const s of stuck.splice(0)){ const d=Math.hypot(s.x-cx,s.y-cy); after(Math.min(.6,d/3000),()=>{ add({k:'line',x1:s.x,y1:s.y-900,x2:s.x,y2:s.y,life:.3,c:'#fff3c0',w:26}); fring(s.x,s.y,900,GOLD,.35,5); gl0(s.x,s.y-80,150,GOLD,.25,{a:.8}); sfx('shatter',.25); }); }
      SFX.shatter(1); Cn.setDark(.35,{spot:null}); Cn.ashFall(2.8,'#ffe9a0',40,{glow:true,up:true}); }}); });
  after(5.5,()=>{ Cn.setDark(0); Cn.zoom(1); Cn.embers(cx,cy,620,GOLD,{n:36,dur:1.4}); });
  after(6.1,ultStop); }

X.reg('sword',{basic:{fn:basic,cd:basicCd},skills:SKILL,ults:{sw_ult1:ultZero,sw_ult2:ultRain},onHurt:src=>{ if(!counterReady()) return false; counter(src); return true; },
  glow:()=>{ if(counterReady()) glow(fx,pl.x,pl.gy-BODY,150,'#9ff7ff',.12+.08*Math.sin(RT*6)); }});
})();
