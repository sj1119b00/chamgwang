// 참광 survival - SWORDSMAN skill set (top-down, all automatic). Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const SV=()=>RPG.api.SV, G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,angTo,face,seq,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,ultStart,ultStop,ultHit,burst,fring}=X;

// ============================================================ skills (the RPG's sword set, re-done for a top-down field; all fire on their own)
const SKILL={
  sw_dash:{range:560,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), L=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+140), d=SK[id].dmg*A.mul(id);
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
      inCircle(pl.x,pl.gy,360,e=>{ dmg(e,d*.5,{kb:1.1,big:i===3}); hitFx(e,'#ffd36a',1.1); }); }); }},
  sw_fly:{range:620,fn(id){ if(V.orbs.length||!nearest(620)) return false; const n=3+Math.floor((A.sLv(id)-1)/2), d=SK[id].dmg*A.mul(id)*.35;
    plSeq([['gs04',.06],['gs06',.06,{kick:[1.6,-1.2]}],['gs08',.14],['gs12',.06]]); sfx('rise',.4,.3);
    for(let i=0;i<n;i++){ const o={a:i/n*TAU,t:0,life:5,d,v:{x:pl.x,y:pl.gy-BODY}}; o.R=380; o.fx=vfx('goldsword',o.v.x,o.v.y,{follow:o.v,loop:true,life:5,sc:1.15,a:1}); V.orbs.push(o); } }},
  sw_plunge:{range:460,fn(id){ const e=nearest(460); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), L=Math.max(0,Math.hypot(e.x-pl.x,e.y-pl.gy)-60), up=k=>1-(1-k)*(1-k), dn=k=>k*k; face(a);
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
function counterReady(){ const id='sw_counter'; return SV().slots.includes(id)&&A.unlocked(id)&&(V.cd[id]||0)<=0; }
function counter(src){ const id='sw_counter', d=SK[id].dmg*A.mul(id); V.cd[id]=A.cdOf(id); G.inv=1.1; slow(.25,.35); setInv(.06,'inv'); stamp('카운터',{x:.5,y:.36,size:.14,life:.9,c:'#9ff7ff'}); sfx('boom',1,.8);
  if(src) face(Math.atan2(src.y-pl.gy,src.x-pl.x)); anim.seq=null;
  plSeq([['gc05',.05,{tr:1,kick:[2.8,-2.6]}],['gc06',.08,{tr:1}],['gc07',.18],['gc10',.08],['gc12',.06]]);
  const y=pl.gy-BODY*.8; vfxSwing({x:pl.x,y,r:340,a0:-2.4,a1:.2},{k:1.4,hue:-160}); vfxSwing({x:pl.x,y,r:340,a0:.7,a1:3.3},{k:1.4,hue:-160});
  ring(pl.x,pl.gy,1600,'#9ff7ff',.45,{w:8}); light(pl.x,y,900,'#9ff7ff',.5,.5);
  inCircle(pl.x,pl.gy,440,e=>{ dmg(e,d,{kb:2,big:true,crit:true}); hitFx(e,'#9ff7ff',1.5); }); }

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
const RED='#ff2a4a', GOLD='#ffcf4a', CRIM='#f0102e';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH: the field holds its breath, one drawn cut opens the air, eight more nobody sees leave seams hanging in space -
// he is already putting the blade away. The guard clicks home and every seam tears open at once.
const DEEP='#4a0014', HOT='#fff1ea';
function ultZero(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), hy=y0-BODY*.55, N=8, L=Math.hypot(hw,hh)*2.5;
  const TR=Cn.tone(CRIM,{c2:DEEP,c3:HOT}), f0=pl.f;
  // the cuts: each through a target, slanted either way, never straight up the screen (a wall needs a base to stand on)
  const T=onScreen(60), cuts=[];
  for(let i=0;i<N;i++){ let cx, cy; for(let g=0;g<12;g++){ const e=T.length&&g<8?T[(Math.random()*T.length)|0]:null; cx=e?e.x:x0+rand(-hw,hw)*.7; cy=e?e.y:y0+rand(-hh,hh)*.7; if(!cuts.some(c=>Math.hypot(c.cx-cx,(c.cy-cy)*.6)<hw*.42)) break; }
    const a=(i%2?-1:1)*rand(.12,1.02);
    cuts.push({cx,cy,a,x1:cx-Math.cos(a)*L/2,y1:cy-Math.sin(a)*L/2,x2:cx+Math.cos(a)*L/2,y2:cy+Math.sin(a)*L/2,t0:0,on:false}); }
  // ---- omen (0 - 1.1): colour drains, the air and the small stones are drawn to the hilt, the reach is marked on the floor
  plSeq([['gs02',.16],['gs03',.2],['gs04',9]]); pl.target='iaiReady'; pl.ps=18;
  K.ambient(.42,.4,.56,4); post.grayT=.5; Cn.zoom(1.62); Cn.roll(-.04); Cn.cam(x0,hy,4.5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9));
  const drop=Cn.gLevitate(x0,y0,640,26,{dur:.8,life:9});
  Cn.SND.inhale(1,.4); const dr=Cn.drone(46,.22);
  Cn.gRing(x0,y0,hw*1.25,RED,{c2:DEEP,inward:true,life:.9,delay:.1,w:.022,jag:.03,a:.6});
  const stS=Cn.gst(3,'add',TR,3), stG=K.st(8,'add',{L:3}), rays=[]; for(let i=0;i<22;i++) rays.push({a:rand(0,TAU),d:rand(0,.75),r:rand(520,980),z:rand(0,260)});
  K.add(1.02,(k,t)=>{ for(const s of rays){ const q=(t-s.d)/.3; if(q<=0||q>=1) continue; const r1=s.r*(1-q*q), r0=Math.min(s.r,r1+s.r*.34*(1-q*.6)), ca=Math.cos(s.a), sa=Math.sin(s.a)*FSY;
        K.line(stS,x0+ca*r0,y0+sa*r0,BODY*.55+s.z*(r0/s.r),x0+ca*r1,y0+sa*r1,BODY*.55+s.z*(r1/s.r),7,TR.c,.9*Math.sin(q*Math.PI),0,s.a,2,.3); }
    K.bill(stG,x0+f0*20,y0,BODY*.6,150+k*130,150+k*130,0,TR.c,.25+.5*k*k); });
  const Lh=K.light(x0,y0,520,RED,0,1.1); K.add(1.05,k=>{ Lh.a=k*k*1.1; Lh.t=0; });
  // ---- the held breath (1.0): everything stops; a glint on the guard
  after(1.0,()=>{ dr.stop(.05); Cn.SND.tick(1.4,.3); Cn.gStar(x0+f0*34,y0,BODY*.62,90,'#ffffff',{c2:RED,life:.16,n:4}); });
  // ---- release (1.14): the draw. One impact frame, a crescent wider than the screen, and he is gone
  const a00=f0>0?Math.PI*.82:Math.PI*.18;
  const draw=()=>{ plSeq([['gs06',.05],['gs07',9]]); Cn.zoom(.92); Cn.roll(.03); Cn.cam(x0,hy,9);
      Cn.gSlash(x0,y0,hw*1.28,a00,a00+f0*Math.PI*1.72,RED,{c2:DEEP,c3:HOT,dur:.13,hold:.07,fade:.34,z:BODY*.55,len:.62});
      Cn.gSlash(x0,y0,hw*.86,a00+f0*.5,a00+f0*Math.PI*1.5,'#ffffff',{c2:RED,dur:.1,hold:.02,fade:.2,z:BODY*.55,len:.5,add:true,delay:.02});
      Cn.gRing(x0,y0,hw*1.7,RED,{c2:DEEP,life:.5,w:.05,jag:.08,a:.8}); K.ripple(x0,y0,hw*1.8,{life:.5,s:.7});
      Cn.gSparks(x0,y0,BODY*.5,26,RED,{s0:700,s1:2400,vz:500}); Cn.gDebris(x0,y0,10,{s0:300,s1:900,r:120});
      K.light(x0,y0,1300,RED,.7,.5); post.ca=.012; Cn.shake(.8); drop(900);
      inCircle(x0,y0,hw*1.2,e=>{ e.flash=1; const d=Math.hypot(e.x-x0,e.y-y0)||1; e.kx+=(e.x-x0)/d*500; e.ky+=(e.y-y0)/d*500; hitFx(e,RED,1); });
      SFX.slash(.7,1.2); Cn.SND.shing(.8,.7); SFX.boom(1.2,.6); };
  after(1.14,()=>Cn.impact(x0,hy,{style:'slash',ang:a00+f0*.9,c:RED,n:2,v:.5,flash:.1,blur:.03,then:draw}));
  after(1.42,()=>{ pl.visible=false; Cn.zoom(.84); Cn.cam(null); K.ambient(.62,.54,.72,6); Cn.gSpeed(1.25,'#ffd5dc',{c2:RED,a:.2,r:.62,n:70,w:.1}); Cn.gStar(x0,y0,BODY*.6,150,'#ffffff',{c2:RED,life:.14}); });
  // ---- the cuts (1.5 - 2.6): seams left hanging in the air, each faster than the last
  const stHot=Cn.gst(3,'add',TR,3), stSeam=K.st(7,'alpha',{c2:K.rgb('#3a0010'),c3:K.rgb(HOT),L:1});
  let open=.1, glowK=1;
  const seams=K.add(20,()=>{ const ph=K.tq(10,3);
    for(const c of cuts){ if(!c.on) continue; const age=RT-c.t0, g=Math.min(1,age/.05);
      K.line(stSeam,c.x1,c.y1,BODY*.3,c.x2,c.y2,BODY*.3,110,TR.c,1,open*(.75+.25*Math.sin(RT*9+c.a*7)),c.a*31+ph*.02,9,glowK);
      if(age<.3){ const k=age/.3, w=lerp(95,6,easeOut(k)); K.line(stHot,c.x1,c.y1,BODY*.3,lerp(c.x1,c.x2,g),lerp(c.y1,c.y2,g),BODY*.3,w,TR.c,1-k*k,k*.6,ph+c.a,2.5,.35); } } });
  let tt=1.5; const gaps=[.2,.17,.14,.11,.09,.075,.06,.05];
  cuts.forEach((c,i)=>{ after(tt,()=>{ c.on=true; c.t0=RT; const dir=i%2?1:-1, ca=Math.cos(c.a), sa=Math.sin(c.a);
      // three afterimages of the cutting pose strung along the line, smeared the way he went
      for(let q=0;q<3;q++){ const u=(q-1)*.3*dir, px=c.cx+ca*L*.5*u, py=c.cy+sa*L*.5*u, st=K.st(0,'alpha',{L:2,c2:[.4,.3,0]}), al=.6+q*.2; K.add(.36,k=>K.pose(st,'sword',q===2?'gs07':'gs06',px,py,ca*dir>=0?1:-1,[1.25,.3+.9*(1-k)**2,.4+.8*(1-k)**2],al*(1-k*k),{sc:1.3,smear:.45,er:k*.3,ph:q*3}),q*.012); }
      Cn.gSlip(c.x1,c.y1,c.x2,c.y2,300,.5,.22);
      Cn.gSparks(c.cx,c.cy,BODY*.3,10,RED,{dir:c.a+(dir>0?0:Math.PI),spread:.25,s0:900,s1:2600,vz:300,len:.04});
      for(let q=0;q<5;q++){ const u=rand(-.42,.42); Cn.gPuff(c.cx+ca*L*u,c.cy+sa*L*u,10,rand(28,60),{vx:ca*dir*rand(100,400),vy:sa*dir*rand(100,400),vz:rand(40,150),life:rand(.5,.9),c:'#4a4458',a:.6}); }
      K.light(c.cx,c.cy,900,RED,1.1,.3);
      inLine(c.x1,c.y1,c.x2,c.y2,70,e=>{ e.cut=(e.cut||0)+1; e.flash=1; const s=((e.x-c.cx)*-sa+(e.y-c.cy)*ca)>=0?1:-1; e.kx+=-sa*s*260; e.ky+=ca*s*260; Cn.gStar(e.x,e.y,e.h*.5,rand(60,95),'#ffffff',{c2:RED,life:.14,n:4}); });
      Cn.SND.shing(1+i*.08,.45); SFX.slash(1.2+i*.07,.8); Cn.roll(dir*.03); Cn.shake(.3+i*.03); post.ca=.008; }); tt+=gaps[i]; });
  const t1=tt+.2;
  // ---- stillness (t1): he is back where he stood, turned away; the seams breathe wider as the blade goes home
  after(t1,()=>{ pl.visible=true; pl.f=-f0; plSeq([['gs09',.2],['gs10',.26],['gs11',.34],['gs12',9]]); pl.target='iaiDone'; pl.ps=30; Cn.zoom(1.7); Cn.roll(.035); Cn.cam(x0,hy,3.6);
    K.ambient(.4,.28,.36,3); post.grayT=.6; K.light(x0,y0,430,'#ffd0d8',1.3,.6,{hold:1.1}); SFX.whoosh(1.4,.5); duck(.16,.9); Cn.drone(38,.2); SFX.heart(1); after(.42,()=>SFX.heart(1));
    Cn.gStar(x0,y0,BODY*.6,120,'#ffffff',{c2:RED,life:.14}); K.add(.8,k=>{ open=.1+.3*k*k; }); });
  // ---- the click (t1+.82), a frame of nothing, then the world notices
  after(t1+.82,()=>{ SFX.click(); Cn.SND.tick(.6,.35); Cn.gStar(x0-f0*30,y0,BODY*.62,110,'#ffffff',{c2:RED,life:.2,n:4}); for(const d of Cn.drones) d.stop(.04); });
  after(t1+1.0,()=>{ const m=cuts[0]; Cn.impact(m.cx,m.cy-BODY*.5,{style:'slash',ang:m.a,c:RED,n:3,then:()=>{
      Cn.zoom(.8); Cn.roll(0); Cn.cam(null); cutScreen(m.cx,m.cy-BODY*.5,m.a,.024,.22); post.grayT=0; K.ambient(.5,.3,.36,10); after(.5,()=>K.ambient(1,1,1,2.2));
      K.add(.16,k=>{ open=.4+.6*easeOut(k); glowK=1+k; }); after(.55,()=>K.add(.7,k=>{ open=1-k; glowK=2-k; }));
      const ord=cuts.map(c=>[c,Math.hypot(c.cx-x0,c.cy-y0)]).sort((a,b)=>a[1]-b[1]);
      ord.forEach(([c],i)=>{ const dl=i*.075, ca=Math.cos(c.a), sa=Math.sin(c.a);
        Cn.gWall(c.x1,c.y1,c.x2,c.y2,rand(900,1500),CRIM,{c2:DEEP,c3:HOT,delay:dl,life:rand(.9,1.2),rise:.1,a:1,cell:70});
        Cn.gSlip(c.x1,c.y1,c.x2,c.y2,420,.9,.4,dl);
        after(dl,()=>{ for(let q=0;q<4;q++){ const u=rand(-.36,.36), px=c.cx+ca*L*u, py=c.cy+sa*L*u; Cn.gDebris(px,py,5,{s0:200,s1:800,vz:1700,size:26}); Cn.gPuff(px,py,20,rand(70,130),{vz:rand(150,320),life:rand(.9,1.5),a:.75}); Cn.gSparks(px,py,20,6,RED,{vz:1500,s0:200,s1:900}); }
          Cn.scar({kind:'gash',x:c.cx,y:c.cy,rot:c.a,len:L*.62,w:300,c:RED,life:5,heat:2.6}); K.light(c.cx,c.cy,1300,RED,1.5,.6); if(i%2===0) SFX.boom(1+i*.1,.5); }); });
      // where seams cross near the middle, the light bursts
      for(let i=0;i<5;i++){ const c=cuts[i]; Cn.gStar(c.cx,c.cy,BODY*.4,rand(260,420),RED,{c2:DEEP,c3:HOT,life:.32,delay:i*.05,n:6}); }
      Cn.gRing(x0,y0,hw*2.1,RED,{c2:DEEP,life:.7,w:.13,jag:.09}); Cn.gRing(x0,y0,hw*1.5,'#ffffff',{c2:RED,life:.5,w:.05,jag:.05,delay:.06}); K.ripple(x0,y0,hw*2.2,{life:.7,s:.9});
      for(const e of onScreen(300)) if(e.cut) e.flash=1;
      Cn.gDebris(x0,y0,14,{r:hw*.8,s0:100,s1:500,v0:1500,vz:3400,sz0:34,size:90,g:2600});
      Cn.sweep(x0,y0,D*1.5,{speed:4200,max:.45}); SFX.shatter(1);
      Cn.gMotes(x0,y0,hw*1.3,RED,70,{fall:true,dur:1.2,life:2.4,m:3,s0:4,s1:9}); Cn.gMotes(x0,y0,hw*1.2,RED,50,{dur:1.6,life:2}); }}); });
  // ---- afterglow: the seams close into scars, red motes sink through the returning colour
  after(t1+2.0,()=>{ Cn.zoom(1); seams.dead=true; for(const c of cuts) for(let q=0;q<3;q++){ const u=rand(-.3,.3); Cn.gPuff(c.cx+Math.cos(c.a)*L*u,c.cy+Math.sin(c.a)*L*u,10,rand(50,90),{vz:rand(80,200),life:rand(1.2,1.9),a:.45}); } });
  after(t1+2.75,ultStop); }

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
  after(.85,()=>Cn.cutin(1,{style:'diag',dir:-1,title:SK[id].name,sub:'SWORD RAIN',c:GOLD,ang:.12,y:.38,h:.3,dur:.95,fy:.4}));
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
