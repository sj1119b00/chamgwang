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
const RED='#ff2a4a', GOLD='#ffcf4a';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH: stillness, one drawn breath, nine cuts nobody sees, the blade goes home - and only then does the world notice.
function ultZero(id){ ultStart(id); const Cn=X.cine, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), N=9, L=Math.hypot(hw,hh)*2.4, hy=y0-BODY*.55;
  // omen: the colour drains, the air is drawn to the hilt
  plSeq([['gs03',.12],['gs04',9]]); pl.target='iaiReady'; pl.ps=18;
  Cn.setDark(.84,{c:'4,2,10',spot:{x:x0,y:hy,r:820,a:.18}}); post.grayT=.9; Cn.zoom(1.55); Cn.roll(-.045); Cn.cam(x0,hy,5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9));
  Cn.gather(x0,hy,{c:RED,dur:.85,r:760,n:34,cs:[RED,'#ffffff','#ff9aa8'],v:.28});
  const T=onScreen(100), cuts=[];
  for(let i=0;i<N;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null, cx=e?e.x:x0+rand(-hw,hw)*.6, cy=e?e.y:y0+rand(-hh,hh)*.6, a=i*Math.PI/N*1.7+rand(-.22,.22);
    cuts.push({cx,cy,a,L,x1:cx-Math.cos(a)*L/2,y1:cy-Math.sin(a)*L/2,x2:cx+Math.cos(a)*L/2,y2:cy+Math.sin(a)*L/2}); }
  // release: the draw is a single impact frame; after it he is simply gone and the cuts arrive faster and faster
  const t0=1.78; let tt=t0+.13; const gaps=[.17,.14,.11,.09,.07,.06,.05,.045,.04];
  after(t0,()=>Cn.impact(x0,hy,{style:'slash',ang:cuts[0].a,c:RED,n:2,v:.55,then:()=>{ pl.visible=false; Cn.zoom(.9); Cn.cam(null); Cn.setDark(.88,{spot:null}); Cn.speed(.95,{c:'#ffb3c0',a:.3,n:22}); gl0(x0,hy,320,'#ffffff',.22,{a:.9}); }}));
  cuts.forEach((c,i)=>{ after(tt,()=>{ add({k:'ghost',j:shiftJ(pl.j,c.cx-pl.x,c.cy-pl.gy),life:.42,c:RED}); cutFx(c,.75); V.cuts.push(c);
      inLine(c.x1,c.y1,c.x2,c.y2,60,e=>{ e.cut=(e.cut||0)+1; e.flash=1; hitFx(e,RED,1.2); });
      Cn.SND.shing(1+i*.07,.45); SFX.slash(1.2+i*.06,.8); Cn.roll((i%2?1:-1)*.035); Cn.shake(.32+i*.03); post.ca=.008; }); tt+=gaps[i]; });
  const t1=tt+.16;
  // climax: he is back where he stood, back turned; the guard clicks home; one held breath; everything he cut comes apart at once
  after(t1,()=>{ pl.visible=true; plSeq([['gs08',.22],['gs09',.22],['gs11',.3],['gs12',9]]); pl.target='iaiDone'; pl.ps=30; Cn.zoom(1.5); Cn.roll(.04); Cn.cam(x0,hy,6);
    Cn.setDark(.92,{spot:{x:x0,y:hy,r:700,a:.12}}); gl0(x0,hy,240,RED,.3,{a:.8}); SFX.whoosh(1.4,.5); duck(.18,.75); });
  after(t1+.62,()=>{ pl.target='sheath'; pl.ps=14; SFX.click(); Cn.SND.tick(.6,.3); });
  after(t1+.9,()=>{ const m=cuts[0]; Cn.impact(m.cx,m.cy-BODY*.5,{style:'slash',ang:m.a,c:RED,n:3,then:()=>{
      Cn.zoom(.86); Cn.roll(0); Cn.cam(null); cutScreen(m.cx,m.cy-BODY*.5,m.a,.028,.2);
      for(const c of V.cuts) cutFx(c,1.7); V.cuts=[];
      const zb=VFX.td_zeroburst; tdV('td_zeroburst',x0,hy,{sc:zb?hw*1.9/zb.w:1});
      cuts.forEach((c,i)=>{ if(i<5) tdV('td_zeroburst',c.cx,c.cy-BODY*.5,{sc:zb?760/zb.w:1,rot:rand(0,TAU),a:.85}); Cn.scar({kind:'gash',x:c.cx,y:c.cy,rot:c.a,len:L*.62,w:300,c:RED,life:4.2,heat:2.2}); });
      Cn.waves(x0,y0,RED,{n:3,dc:'60,20,30'}); Cn.wash('255,40,70',.3,0,x0,y0);
      for(const e of onScreen(300)) if(e.cut) e.flash=1;
      Cn.sweep(x0,y0,D*1.5,{speed:4200,max:.45}); Cn.setDark(.4,{spot:null}); post.grayT=0; SFX.shatter(1); Cn.ashFall(2.8,'#ff5a78',44,{glow:true}); }}); });
  // afterglow: red motes fall through the returning colour, the gashes cool on the floor
  after(t1+1.75,()=>{ Cn.setDark(0); Cn.zoom(1); Cn.embers(x0,y0,700,RED,{n:36,dur:1.6}); });
  after(t1+2.35,ultStop); }

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
