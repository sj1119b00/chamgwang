// 참광 survival - SWORDSMAN skill set (top-down, all automatic). Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const SV=()=>RPG.api.SV, G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,angTo,face,seq,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,ultStart,ultStop,ultHit,burst,fring}=X;

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
const RED='#ff2a4a', GOLD='#ffcf4a', CRIM='#f0102e';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH: the field holds its breath, one drawn cut opens the air, seven more nobody sees leave seams hanging in space -
// he is already putting the blade away. The guard clicks home, the first cut answers in gold, and every seam tears open after it.
const DEEP='#4a0014', HOT='#eafaff', STEEL='#bfeaff';
function ultZero(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), hy=y0-BODY*.55, N=7, L=Math.hypot(hw,hh)*2.5;
  const TR=Cn.tone(CRIM,{c2:DEEP,c3:HOT}), TG=Cn.tone(GOLD,{c2:'#7a2a00',c3:'#fffbe8'}), f0=pl.f;
  // the cuts: each through a target, slanted either way, never straight up the screen (a wall needs a base to stand on)
  const T=onScreen(60), cuts=[];
  for(let i=0;i<N;i++){ let cx, cy; for(let g=0;g<12;g++){ const e=T.length&&g<8?T[(Math.random()*T.length)|0]:null; cx=e?e.x:x0+rand(-hw,hw)*.7; cy=e?e.y:y0+rand(-hh,hh)*.7; if(Math.hypot(cx-x0,(cy-y0)*.6)>hw*.3&&!cuts.some(c=>Math.hypot(c.cx-cx,(c.cy-cy)*.6)<hw*.42)) break; }
    const a=(i%2?-1:1)*rand(.14,1.02);
    cuts.push({cx,cy,a,x1:cx-Math.cos(a)*L/2,y1:cy-Math.sin(a)*L/2,x2:cx+Math.cos(a)*L/2,y2:cy+Math.sin(a)*L/2,t0:0,on:false,k:1}); }
  // the master cut: the draw itself, straight through where he stands. It is the one that answers first, and in gold.
  const ma=f0>0?-.2:.2, MC={cx:x0,cy:y0,a:ma,x1:x0-Math.cos(ma)*L/2,y1:y0-Math.sin(ma)*L/2,x2:x0+Math.cos(ma)*L/2,y2:y0+Math.sin(ma)*L/2,t0:0,on:false,k:1.25,gold:false};
  // ---- omen (0 - 1.1): colour drains to indigo, the air and the small stones are drawn to the hilt, the floor cracks under his stance
  plSeq([['gs02',.16],['gs03',.2],['gs04',9]]); pl.target='iaiReady'; pl.ps=18;
  K.ambient(.4,.42,.66,4); post.grayT=.45; Cn.zoom(1.62); Cn.roll(-.04); Cn.cam(x0,hy,4.5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9));
  const drop=Cn.gLevitate(x0,y0,640,26,{dur:.8,life:9});
  Cn.SND.inhale(1,.4); const dr=Cn.drone(46,.22);
  Cn.gRing(x0,y0,hw*1.2,STEEL,{c2:'#16305a',inward:true,life:.95,delay:.05,w:.07,jag:.05,a:.8});
  Cn.gCrack(x0,y0,330,STEEL,{c2:'#16305a',life:1.3,n:9,w:.1,a:.8});
  for(let i=0;i<10;i++) after(.1+i*.08,()=>{ const a=rand(0,TAU); Cn.gPuff(x0+Math.cos(a)*hw*.9,y0+Math.sin(a)*hw*.9*FSY,6,rand(30,56),{vx:-Math.cos(a)*520,vy:-Math.sin(a)*520*FSY,vz:rand(20,90),life:.7,c:'#565a78',a:.5,drag:.6}); });
  const stS=Cn.gst(3,'add',Cn.tone(STEEL,{c2:'#16305a'}),3), stG=K.st(8,'add',{L:3}), rays=[]; for(let i=0;i<22;i++) rays.push({a:rand(0,TAU),d:rand(0,.75),r:rand(520,980),z:rand(0,260)});
  K.add(1.02,(k,t)=>{ for(const s of rays){ const q=(t-s.d)/.3; if(q<=0||q>=1) continue; const r1=s.r*(1-q*q), r0=Math.min(s.r,r1+s.r*.34*(1-q*.6)), ca=Math.cos(s.a), sa=Math.sin(s.a)*FSY;
        K.line(stS,x0+ca*r0,y0+sa*r0,BODY*.55+s.z*(r0/s.r),x0+ca*r1,y0+sa*r1,BODY*.55+s.z*(r1/s.r),7,K.rgb(STEEL),.9*Math.sin(q*Math.PI),0,s.a,2,.3); }
    K.bill(stG,x0+f0*20,y0,BODY*.6,150+k*130,150+k*130,0,TR.c,.25+.5*k*k); });
  const Lh=K.light(x0,y0,520,RED,0,1.1); K.add(1.05,k=>{ Lh.a=k*k*1.1; Lh.t=0; });
  // ---- the held breath (1.0): everything stops; a glint on the guard
  after(1.0,()=>{ dr.stop(.05); Cn.SND.tick(1.4,.3); Cn.gStar(x0+f0*34,y0,BODY*.62,90,'#ffffff',{c2:STEEL,life:.16,n:4}); });
  // ---- release (1.14): the draw. Two inked frames, a crescent wider than the screen, and he is gone
  const a00=f0>0?Math.PI*.82:Math.PI*.18;
  const draw=()=>{ plSeq([['gs06',.05],['gs07',9]]); Cn.zoom(.92); Cn.roll(.03); Cn.cam(x0,hy,9);
      Cn.gSlash(x0,y0,hw*1.28,a00,a00+f0*Math.PI*1.72,CRIM,{c2:DEEP,c3:HOT,dur:.13,hold:.07,fade:.34,z:BODY*.55,len:.62});
      Cn.gSlash(x0,y0,hw*.86,a00+f0*.5,a00+f0*Math.PI*1.5,STEEL,{c2:'#16305a',c3:'#ffffff',dur:.1,hold:.02,fade:.2,z:BODY*.55,len:.5,delay:.02});
      Cn.gRing(x0,y0,hw*1.7,CRIM,{c2:DEEP,life:.5,w:.07,jag:.08,a:.8}); K.ripple(x0,y0,hw*1.8,{life:.5,s:.7});
      Cn.gCrack(x0,y0,620,CRIM,{c2:DEEP,life:1.8,n:11,w:.12});
      Cn.gSparks(x0,y0,BODY*.5,26,STEEL,{s0:700,s1:2400,vz:500}); Cn.gDebris(x0,y0,12,{s0:300,s1:900,r:120});
      for(let i=0;i<14;i++){ const a=i/14*TAU; Cn.gPuff(x0+Math.cos(a)*200,y0+Math.sin(a)*200*FSY,8,rand(50,90),{vx:Math.cos(a)*rand(700,1200),vy:Math.sin(a)*rand(700,1200)*FSY,vz:rand(30,120),life:rand(.6,1),c:'#565a78',a:.6,drag:2.4}); }
      K.light(x0,y0,1300,RED,.7,.5); post.ca=.012; Cn.shake(.8); drop(900); MC.on=true; MC.t0=RT;
      inCircle(x0,y0,hw*1.2,e=>{ e.flash=1; const d=Math.hypot(e.x-x0,e.y-y0)||1; e.kx+=(e.x-x0)/d*900; e.ky+=(e.y-y0)/d*900; hitFx(e,RED,1); });
      SFX.slash(.7,1.2); Cn.SND.shing(.8,.7); SFX.boom(1.2,.6); };
  after(1.14,()=>Cn.impact(x0,hy,{style:'slash',ang:a00+f0*.9,c:STEEL,n:2,v:.5,flash:.1,blur:.03,soft:true,then:draw}));
  after(1.42,()=>{ pl.visible=false; Cn.zoom(.84); Cn.cam(null); K.ambient(.6,.58,.82,6); Cn.gSpeed(1.25,STEEL,{c2:'#16305a',a:.2,r:.62,n:70,w:.1}); Cn.gStar(x0,y0,BODY*.6,150,'#ffffff',{c2:STEEL,life:.14}); });
  // ---- the cuts (1.5 - 2.5): each one a drawn blade for a few frames, then a seam left hanging in the air
  const stBlade=Cn.gst(3,'alpha',TR,3), stBladeG=Cn.gst(3,'alpha',TG,3), stSeam=K.st(7,'alpha',{c2:K.rgb('#16000c'),c3:K.rgb(HOT),L:1}), stSeamG=K.st(7,'alpha',{c2:K.rgb('#1c0c00'),c3:K.rgb('#fffbe8'),L:1}), stCast=K.st(8,'add',{L:0});
  let open=.1, glowK=1, dim=1;
  const seams=K.add(30,()=>{ const ph=K.tq(10,3);
    for(const c of [MC,...cuts]){ if(!c.on) continue; const age=RT-c.t0, T_=c.gold?TG:TR, kk=c.gold?1:dim;
      K.line(c.gold?stSeamG:stSeam,c.x1,c.y1,BODY*.3,c.x2,c.y2,BODY*.3,110*c.k,T_.c,kk,(c.open??open)*(.75+.25*Math.sin(RT*9+c.a*7)),c.a*31+ph*.02,9,glowK);
      if(age<.42){ const k=age/.42, g=Math.min(1,age/.05), w=lerp(210,18,easeOut(k))*c.k; K.line(c.gold?stBladeG:stBlade,c.x1,c.y1,BODY*.3,lerp(c.x1,c.x2,g),lerp(c.y1,c.y2,g),BODY*.3,w,T_.c,1,k*k*.9,ph+c.a,2.2,.55); } } });
  let tt=1.5; const gaps=[.2,.17,.14,.11,.09,.075,.06];
  cuts.forEach((c,i)=>{ after(tt,()=>{ c.on=true; c.t0=RT; const dir=i%2?1:-1, ca=Math.cos(c.a), sa=Math.sin(c.a), f=ca*dir>=0?1:-1;
      // where he passed: one hard silhouette in the cutting pose with its blade arc, and a smeared one behind it
      const stP=K.st(0,'alpha',{L:3,c2:[1,0,0]}), stQ=K.st(0,'alpha',{L:2,c2:[.7,.6,0]}), px=c.cx, py=c.cy+BODY*.2, bx=px-ca*dir*230, by=py-sa*dir*230;
      K.add(.42,k=>K.pose(stQ,'sword','gs06',bx,by,f,[1,.1,.2],.75*(1-k),{sc:1.25,smear:.6,er:k*.4,ph:i}));
      K.add(.5,k=>K.pose(stP,'sword','gs07',px,py,f,k<.16?[.93,.99,1]:[1,.06+.5*(1-k),.16+.5*(1-k)],k<.6?1:1-(k-.6)/.4,{sc:1.4,er:Math.max(0,k-.5)*1.2,ph:i*2}));
      Cn.gArt('fx2_slash',px,py,STEEL,{c2:'#16305a',c3:'#ffffff',z:BODY*.7,w:430*-dir,h:290,rot:c.a,life:.34,hold:.3,L:3,boil:.006});
      Cn.gSlip(c.x1,c.y1,c.x2,c.y2,300,.5,.22);
      Cn.gSparks(c.cx,c.cy,BODY*.3,10,STEEL,{dir:c.a+(dir>0?0:Math.PI),spread:.25,s0:900,s1:2600,vz:300,len:.04});
      for(let q=0;q<6;q++){ const u=rand(-.42,.42); Cn.gPuff(c.cx+ca*L*u,c.cy+sa*L*u,10,rand(34,70),{vx:ca*dir*rand(100,400),vy:sa*dir*rand(100,400),vz:rand(40,150),life:rand(.5,.9),c:'#565a78',a:.6}); }
      K.light(c.cx,c.cy,900,RED,1.1,.3);
      inLine(c.x1,c.y1,c.x2,c.y2,70,e=>{ e.cut=(e.cut||0)+1; e.flash=1; const s=((e.x-c.cx)*-sa+(e.y-c.cy)*ca)>=0?1:-1; e.kx+=-sa*s*260; e.ky+=ca*s*260; Cn.gStar(e.x,e.y,e.h*.5,rand(60,95),'#ffffff',{c2:STEEL,life:.14,n:4}); });
      Cn.SND.shing(1+i*.08,.45); SFX.slash(1.2+i*.07,.8); Cn.roll(dir*.03); Cn.shake(.3+i*.03); post.ca=.008; }); tt+=gaps[i]; });
  const t1=tt+.22;
  // ---- stillness (t1): he is back where he stood, turned away, in the one pool of light; the seams breathe wider as the blade goes home
  after(t1,()=>{ pl.visible=true; pl.f=-f0; plSeq([['gs09',.2],['gs10',.26],['gs11',.34],['gs12',9]]); pl.target='iaiDone'; pl.ps=30; Cn.zoom(1.7); Cn.roll(.035); Cn.cam(x0,hy,3.6);
    K.ambient(.34,.3,.5,3); post.grayT=.5; K.light(x0,y0,430,'#e6f4ff',1.4,.6,{hold:1.1}); SFX.whoosh(1.4,.5); duck(.16,.9); Cn.drone(38,.2); SFX.heart(1); after(.42,()=>SFX.heart(1));
    Cn.gStar(x0,y0,BODY*.6,120,'#ffffff',{c2:STEEL,life:.14}); K.add(.8,k=>{ open=.1+.3*k*k; dim=1-.35*k; }); });
  // ---- the click (t1+.82), a frame of nothing, then the world notices - the master cut first
  after(t1+.82,()=>{ SFX.click(); Cn.SND.tick(.6,.35); Cn.gStar(x0-f0*30,y0,BODY*.62,110,'#ffffff',{c2:GOLD,life:.2,n:4}); for(const d of Cn.drones) d.stop(.04); });
  after(t1+1.0,()=>{ Cn.impact(x0,hy,{style:'slash',ang:ma,c:GOLD,n:2,soft:true,flash:.07,blur:.04,then:()=>{
      Cn.zoom(.8); Cn.roll(0); Cn.cam(null); cutScreen(x0,hy,ma,.026,.24); post.grayT=0; K.ambient(.42,.34,.46,10); after(.7,()=>K.ambient(1,1,1,1.8));
      // gold: the first cut opens under him, a wall twice the height of the rest, one burst where he stands
      MC.gold=true; MC.k=1.9; K.add(.14,k=>{ MC.open=.4+.6*easeOut(k); }); after(.75,()=>K.add(.8,k=>{ MC.open=1-k*.9; }));
      Cn.gWall(MC.x1,MC.y1,MC.x2,MC.y2,2300,GOLD,{c2:'#7a2a00',c3:'#fffbe8',life:1.5,rise:.08,a:.5,cell:70});
      Cn.gStar(x0,y0,BODY*.5,300,GOLD,{c2:'#7a2a00',c3:'#fff3c8',life:.3,n:7}); Cn.gSlip(MC.x1,MC.y1,MC.x2,MC.y2,520,1,.45);
      K.ripple(x0,y0,hw*2.2,{life:.7,s:.9}); Cn.gImpact('sword',x0,y0,hw*.95,{c3:GOLD,rot:ma}); Cn.gSlab(MC.x1,MC.y1,MC.x2,MC.y2,GOLD,{c2:'#7a2a00',w:80,life:5.5}); for(const c of cuts) Cn.gSlab(c.x1,c.y1,c.x2,c.y2,CRIM,{c2:DEEP,c3:HOT,w:rand(38,60),life:rand(4,5),delay:.1+Math.hypot(c.cx-x0,c.cy-y0)/6000});
      
      K.light(x0,y0,2000,GOLD,.9,.9); Cn.gDebris(x0,y0,16,{r:hw*.7,s0:100,s1:500,v0:1500,vz:3400,sz0:34,size:90,g:2600}); Cn.gDebris(x0,y0,22,{s0:300,s1:1300,vz:1900,size:30});
      // crimson: the others follow outward from him, lower and dimmer
      K.add(.16,k=>{ open=.4+.6*easeOut(k); glowK=1+k; dim=.65+.35*k; },.1); after(.7,()=>K.add(.9,k=>{ open=1-k*.88; glowK=2-k; }));
      const ord=cuts.map(c=>[c,Math.hypot(c.cx-x0,c.cy-y0)]).sort((a,b)=>a[1]-b[1]);
      ord.forEach(([c],i)=>{ const dl=.1+i*.075, ca=Math.cos(c.a), sa=Math.sin(c.a);
        Cn.gWall(c.x1,c.y1,c.x2,c.y2,rand(700,1100),CRIM,{c2:DEEP,c3:HOT,delay:dl,life:rand(.9,1.2),rise:.1,a:.6,cell:70});
        Cn.gSlip(c.x1,c.y1,c.x2,c.y2,420,.8,.4,dl);
        K.add(1.1,k=>K.line(stCast,c.x1,c.y1,0,c.x2,c.y2,0,330,TR.c,.34*(1-k)),dl);   // the wall's light on the floor either side of it
        after(dl,()=>{ for(let q=0;q<4;q++){ const u=rand(-.36,.36), px=c.cx+ca*L*u, py=c.cy+sa*L*u; Cn.gDebris(px,py,5,{s0:200,s1:800,vz:1700,size:26}); Cn.gPuff(px,py,20,rand(80,150),{vz:rand(150,320),life:rand(1,1.7),a:.75}); Cn.gSparks(px,py,20,6,RED,{vz:1500,s0:200,s1:900}); }
          Cn.scar({kind:'gash',x:c.cx,y:c.cy,rot:c.a,len:L*.62,w:460,c:RED,life:7,heat:3.2}); K.light(c.cx,c.cy,1300,RED,1.2,.6); if(i%2===0) SFX.boom(1+i*.1,.5); }); });
      Cn.scar({kind:'gash',x:x0,y:y0,rot:ma,len:L*.7,w:640,c:GOLD,life:8,heat:3.6});
      for(const e of onScreen(300)) if(e.cut) e.flash=1;
      Cn.sweep(x0,y0,D*1.5,{speed:4200,max:.45}); SFX.shatter(1); Cn.SND.gong(.6);
      Cn.gMotes(x0,y0,hw*1.3,RED,60,{fall:true,dur:1.4,life:2.6,m:3,s0:4,s1:9}); Cn.gMotes(x0,y0,hw*1.2,GOLD,60,{dur:1.8,life:2.2}); }}); });
  // ---- afterglow: the seams close slowly into scars that smoke; red and gold motes sink through the returning colour
  after(t1+2.0,()=>{ Cn.zoom(1); for(const c of [MC,...cuts]) for(let q=0;q<4;q++){ const u=rand(-.3,.3); Cn.gPuff(c.cx+Math.cos(c.a)*L*u,c.cy+Math.sin(c.a)*L*u,10,rand(60,110),{vz:rand(80,200),life:rand(1.4,2.2),a:.5}); } });
  after(t1+3.1,()=>{ K.add(.5,k=>{ open=.12*(1-k); MC.open=.1*(1-k); dim=1-k; }); after(.5,()=>{ seams.dead=true; }); ultStop(); }); }

// SWORD RAIN: a blade raised to a sky that answers. A second circle opens high overhead, and what falls out of it falls a long way:
// rings of swords walk outward from him and stay standing in the earth - then the one the size of a tower comes down, and the planted ones answer it.
function ultRain(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, D=9000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), R=hw*.95, sw=spr('sword'), stuck=[];
  const TG=Cn.tone(GOLD,{c2:'#6a2600',c3:'#fffbe8'}), SKY='#9fd8ff', ZS=2500;
  const b=V.boss&&!V.boss.dead?V.boss:null, [cx,cy]=b?[b.x,b.y]:[x0+pl.f*hw*.3,y0-hh*.14];
  // ---- omen (0 - 1.3): dusk falls, the circle under him spreads, its twin opens far above the field
  plSeq([['gs03',.1],['gs04',.18],['gs05',9]]); pl.target='cast'; pl.ps=10;
  K.ambient(.46,.44,.62,3); Cn.zoom(1.4); Cn.cam(x0,y0-BODY*1.2,4.5); duck(.3,.6);
  const c1=Cn.gCircle('fx_circle_arcane',x0,y0,{c:GOLD,r:40,life:7,tick:(s,t)=>{ s.r=lerp(40,R,easeOut(Math.min(1,t/1.3))); s.rot=t*.5; s.a=t>4.6?Math.max(0,1-(t-4.6)/.6):1; }});
  const c2=Cn.gCircle('fx_circle_arcane',x0,y0,{c:SKY,r:40,z:ZS,life:7,L:4,delay:.35,tick:(s,t)=>{ s.r=lerp(100,R*1.7,easeOut(Math.min(1,t/1.2))); s.rot=-t*.3; s.a=(t>4.1?Math.max(0,1-(t-4.1)/.5):Math.min(1,t/.5))*.5; }});
  Cn.gather(x0,y0-BODY*2,{c:GOLD,dur:.9,r:900,n:30,fy:y0,rings:0,streaks:0}); Cn.SND.inhale(1.1,.4); SFX.choir(3);
  const drop=Cn.gLevitate(x0,y0,700,20,{dur:.9,life:6,c:'#6d6470'});
  // the column from the raised blade to the circle overhead
  const stB=Cn.gst(3,'add',TG,2), stG=K.st(8,'add',{L:2}); let beam=0;
  K.add(4.4,(k,t)=>{ beam=Math.min(1,t/.5)*(t>4?Math.max(0,1-(t-4)/.4):1); const bx=x0+pl.f*18; K.line(stB,bx,y0,BODY*2,bx,y0,ZS,34+8*Math.sin(RT*31),TG.c,.85*beam,0,RT*4,3,.35); K.bill(stG,bx,y0,BODY*2.05,230,230,0,TG.c,.6*beam); K.bill(stG,x0,y0,ZS,520,520,0,K.rgb(SKY),.35*beam); });
  const Lc=K.light(x0,y0,900,GOLD,0,1.4,{hold:3.2}); K.add(1,k=>{ Lc.a=k*1.1; });
  // one sword out of the sky
  const land=(x,y)=>{ Cn.gStar(x,y,30,rand(110,170),GOLD,{c2:'#6a2600',life:.16,n:5}); Cn.gRing(x,y,260,GOLD,{c2:'#6a2600',life:.3,w:.12,jag:.1}); Cn.gCrack(x,y,190,GOLD,{c2:'#6a2600',life:1.1,n:7,w:.16});
    Cn.gDebris(x,y,3,{s0:150,s1:450,vz:900,size:15}); Cn.gPuff(x,y,8,rand(40,70),{vz:rand(60,140),life:rand(.5,.8),c:'#5a5468',a:.6}); Cn.gSparks(x,y,20,4,GOLD,{vz:1100,s0:200,s1:700});
    K.light(x,y,520,GOLD,.9,.25); sfx('boom',.5,.3); sfx('slash',1.6,.3); inCircle(x,y,170,e=>{ dmg(e,D,{kb:.6,stun:.5,launch:500,sx:x,sy:y}); hitFx(e,GOLD,1); }); };
  const fall=(x,y,dl=0)=>{ const s={x,y,gone:1e9}; after(dl+.3,()=>stuck.push(s)); if(!sw){ after(dl+.3,()=>land(x,y)); return; } Cn.gDrop(x,y,{art:'fx2_gsword',artc:GOLD,c2:'#5a2200',c3:'#fffbe8',h:470,w:470*.44,z0:ZS,dur:.32,pz:.0006,rot:rand(-.5,.5),dx:rand(-500,500),dy:rand(-200,200),trail:GOLD,stick:9,delay:dl,land,sink:.2,alive:()=>RT<s.gone}); };
  // ---- release (1.35): the cut downward; the sky lets go
  after(1.3,()=>Cn.impact(x0,y0-BODY,{style:'radial',c:GOLD,n:2,soft:true,flash:.08,blur:.03,v:.5,then:()=>{ plSeq([['gs06',.06],['gs07',.1],['gs08',9]]); Cn.zoom(.84); Cn.cam(null); K.ambient(.5,.46,.6,5);
      Cn.gRing(x0,y0,hw*1.6,GOLD,{c2:'#6a2600',life:.5,w:.07,jag:.07}); K.ripple(x0,y0,hw*1.6,{life:.5,s:.6}); drop(700); Cn.SND.shing(.7,.5); }}));
  // rings of swords walking outward, the drum speeding up
  const T=onScreen(60); let tt=1.5;
  for(let k=0;k<5;k++){ const n=4+k*2, rr=230+k*(Math.max(hw,hh)*.2); after(tt,()=>{ Cn.SND.shing(.8+k*.08,.4); Cn.shake(.3+k*.05);
      for(let i=0;i<n;i++){ const a=i/n*TAU+k*.4, e=T.length&&i%2?T[(Math.random()*T.length)|0]:null; fall(e&&!e.dead?e.x:x0+Math.cos(a)*rr,e&&!e.dead?e.y:y0+Math.sin(a)*rr*.8,rand(0,.16)); } }); tt+=.4-k*.05; }
  // ---- climax (3.4): the sky circle closes to a point over the target; a shadow the size of the field; the tower falls
  after(3.3,()=>{ Cn.zoom(.78); Cn.cam(cx,cy-300,3); K.ambient(.3,.28,.42,3); Cn.SND.inhale(.9,.6); Cn.drone(40,.25); pl.target='slashU'; pl.ps=20;
    K.add(.95,k=>{ K.floor(K.st(12,'alpha',{L:0}),cx,cy,200+900*k,null,0,[0,0,0],.25+.5*k); });
    Cn.gRing(cx,cy,820,GOLD,{c2:'#6a2600',inward:true,life:.9,w:.05,jag:.04,a:.8}); Cn.gSpeed(.9,GOLD,{c2:'#6a2600',a:.25,x:cx,y:cy,r:.5,n:60,w:.1}); });
  const BH=2500, BW=sw?BH*sw.w/sw.h:500;
  if(sw) Cn.gDrop(cx,cy,{art:'fx2_gsword',artc:GOLD,c2:'#5a2200',c3:'#fffbe8',h:BH,w:BH*.44,z0:5200,dur:.48,rot:.04,trail:GOLD,stick:1.5,fade:.6,delay:3.78,sink:.12,pz:.00016,L:3});
  after(4.26,()=>Cn.impact(cx,cy-80,{c:GOLD,n:2,r:.16,soft:true,flash:.1,blur:.06,then:()=>{ Cn.zoom(.86); for(const d of Cn.drones) d.stop(.05); K.ambient(.5,.4,.3,10); after(.6,()=>K.ambient(1,1,1,2));
      Cn.gStar(cx,cy,60,900,GOLD,{c2:'#6a2600',c3:'#ffffff',life:.4,n:8}); for(let i=0;i<3;i++) Cn.gRing(cx,cy,hw*(1.3+i*.5),i===1?'#ffffff':GOLD,{c2:'#6a2600',life:.6+i*.12,w:.12-i*.03,jag:.09,delay:i*.07});
      K.ripple(cx,cy,hw*2.2,{life:.7,s:1}); Cn.gCrack(cx,cy,hw*1.5,GOLD,{c2:'#6a2600',life:3,n:17,w:.1}); Cn.gImpact('sword',cx,cy,hw*.92,{c3:GOLD}); Cn.scar({kind:'burn',x:cx,y:cy,r:420,c:GOLD,life:9,heat:3});
      Cn.gDebris(cx,cy,30,{s0:300,s1:1500,vz:2200,size:34}); Cn.gDebris(cx,cy,14,{r:300,s0:100,s1:600,v0:1600,vz:3600,sz0:40,size:100,g:2600});
      for(let i=0;i<16;i++){ const a=i/16*TAU; Cn.gPuff(cx+Math.cos(a)*260,cy+Math.sin(a)*260*FSY,12,rand(110,190),{vx:Math.cos(a)*rand(700,1300),vy:Math.sin(a)*rand(700,1300)*FSY,vz:rand(60,200),life:rand(1,1.7),c:'#5a5468',a:.75,drag:2}); }
      K.light(cx,cy,2400,GOLD,1.1,1); Cn.sweep(cx,cy,D*8,{speed:3400}); SFX.shatter(1); Cn.SND.gong(.8);
      // every planted sword answers, nearest first: a column of light, and it is gone
      for(const s of stuck){ const d=Math.hypot(s.x-cx,s.y-cy), dl=Math.min(.7,d/2600); s.gone=RT+dl; Cn.gBeam(s.x,s.y,1900,70,GOLD,{c2:'#6a2600',life:.5,delay:dl}); after(dl,()=>{ K.light(s.x,s.y,600,GOLD,.7,.3); sfx('shatter',.25); Cn.gSparks(s.x,s.y,40,5,GOLD,{vz:1600,s0:100,s1:500}); }); }
      Cn.gMotes(cx,cy,hw*1.2,GOLD,80,{dur:2,life:2.4,white:.4}); }}));
  after(5.5,()=>{ Cn.zoom(1); Cn.cam(null); Cn.gMotes(x0,y0,hw,GOLD,40,{fall:true,dur:1,life:2,m:3,s0:3,s1:8}); });
  after(6.2,()=>{ for(const s of stuck) s.gone=Math.min(s.gone,RT); ultStop(); }); }

X.reg('sword',{basic:{fn:basic,cd:basicCd},skills:SKILL,ults:{sw_ult1:ultZero,sw_ult2:ultRain},onHurt:src=>{ if(!counterReady()) return false; counter(src); return true; },
  glow:()=>{ if(counterReady()) glow(fx,pl.x,pl.gy-BODY,150,'#9ff7ff',.12+.08*Math.sin(RT*6)); }});
})();
