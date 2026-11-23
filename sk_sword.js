// 참광 survival - SWORDSMAN skill set (top-down, all automatic). Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const SV=()=>RPG.api.SV, G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,angTo,face,seq,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,ultStart,ultStop,ultHit,burst}=X;

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


function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
function ultZero(id){ ultStart(id); const D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), N=8, L=Math.hypot(hw,hh)*2.2;
  plSeq([['gs03',.06],['gs04',.5]]); pl.target='iaiReady'; pl.ps=18; ov.dimT=.55; post.grayT=.6; V.zk=1.3; SFX.heart(1);
  ring(x0,y0-BODY*.6,-1600,'#ff3355',.55,{r0:1100,w:4,dec:1}); light(x0,y0-BODY,900,'#ff3355',.6,.6);
  for(let i=0;i<26;i++) gl0(x0+rand(-700,700),y0+rand(-500,300),rand(4,9),pick(['#ff3355','#ffffff','#ff9aa8']),.7,{tx:x0,ty:y0-BODY});
  const T=onScreen(100), cuts=[];
  for(let i=0;i<N;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null, cx=e?e.x:x0+rand(-hw,hw)*.6, cy=e?e.y:y0+rand(-hh,hh)*.6, a=i*Math.PI/N+rand(-.25,.25);
    cuts.push({cx,cy,a,L,x1:cx-Math.cos(a)*L/2,y1:cy-Math.sin(a)*L/2,x2:cx+Math.cos(a)*L/2,y2:cy+Math.sin(a)*L/2}); }
  after(.55,()=>{ pl.visible=false; V.zk=.95; gl0(x0,y0-BODY,300,'#ffffff',.25,{a:.9}); post.flash=.25; SFX.whoosh(.7,1); });
  cuts.forEach((c,i)=>after(.62+i*.11,()=>{
    add({k:'ghost',j:shiftJ(pl.j,c.cx-pl.x,c.cy-pl.gy),life:.4,c:'#ff3355'}); cutFx(c,.7); V.cuts.push(c);
    inLine(c.x1,c.y1,c.x2,c.y2,60,e=>{ e.cut=(e.cut||0)+1; hitFx(e,'#ff3355',1.2); });
    SFX.slash(1.2+i*.05,.9); trauma=Math.min(.8,trauma+.15); }));
  const t1=.62+N*.11;
  after(t1+.12,()=>{ pl.visible=true; plSeq([['gs08',.3],['gs09',.3],['gs11',.25],['gs12',.6]]); pl.target='iaiDone'; pl.ps=30; V.zk=1.15; gl0(x0,y0-BODY,220,'#ff3355',.3,{a:.8}); SFX.whoosh(1.4,.5); });
  after(t1+.45,()=>{ pl.target='sheath'; pl.ps=14; SFX.click(); duck(.1,.35); stamp('제로',{x:.5,y:.2,size:.11,life:.8}); });
  after(t1+.95,()=>{ setInv(.12,'red'); stamp('슬래시',{x:.5,y:.2,size:.13,life:1}); post.flash=.5; trauma=1.2; hitstop=.06; shock(x0,y0-BODY*.6,1.4,1.2); V.zk=.9;
    for(const c of V.cuts) cutFx(c,1.6); V.cuts=[];
    const zb=VFX.td_zeroburst; tdV('td_zeroburst',x0,y0-BODY*.6,{sc:zb?hw*1.7/zb.w:1});
    cuts.slice(0,4).forEach(c=>tdV('td_zeroburst',c.cx,c.cy-BODY*.5,{sc:zb?700/zb.w:1,rot:rand(0,TAU),a:.85}));
    ring(x0,y0,3000,'#ff3355',.6,{w:10,sy:FSY}); ring(x0,y0,1800,'#ffffff',.35,{w:4,sy:FSY});
    for(const e of onScreen(300)) ultHit(e,D*(e.cut?1.5:1),x0,y0);
    SFX.boom(2,1); SFX.shatter(1); buzz([120,40,200]); });
  after(t1+1.9,ultStop); }
function swordFall(x,y,d){ const S_=VFX.td_swordfall, v=tdV('td_swordfall',x,y,{px:S_&&S_.ix,py:S_&&S_.iy,sc:S_?980/S_.h:1}); if(S_) V.shads.push({x,y,t0:RT,dur:S_.hit*S_.ms/1000,r:120});
  const land=()=>{ add({k:'line',x1:x,y1:y-700,x2:x,y2:y-40,life:.16,c:'#ffe58a',w:14}); ring(x,y,700,'#ffcf4a',.3,{w:4,sy:FSY}); gl0(x,y-30,90,'#ffcf4a',.18,{a:.8}); for(let i=0;i<5;i++) spark(x,y-20,-Math.PI/2+rand(-1.3,1.3),rand(300,900),{c:pick(['#ffffff','#ffcf4a']),life:rand(.15,.3),w:2,g:900});
    burst(x,y,3,{rock:true,s0:150,s1:450}); sfx('boom',.5,.35); sfx('slash',1.6,.35); inCircle(x,y,160,e=>{ dmg(e,d,{kb:.6,stun:.5,sx:x,sy:y}); hitFx(e,'#ffcf4a',1); }); };
  if(v){ after(S_.hit*S_.ms/1000,land); return; }
  const s=swordAt(x,y-900,{c:'#ffcf4a',len:130,tx:x,ty:y-10,onHit:land}); s.mode='fly'; s.v=2600; s.acc=9000; }
function ultRain(id){ ultStart(id); const D=9000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), R=Math.max(hw,hh)*1.05;
  plSeq([['gs03',.08],['gs04',.1],['gs05',2.7],['gs06',.08],['gs07',.12],['gs08',.4],['gs12',.3]]); pl.target='cast'; pl.ps=10; ov.dimT=.8; V.zk=1.2; light(x0,y0-BODY*1.5,1200,'#ffcf4a',3.5,.5); SFX.rise(.6,.5);
  for(let i=0;i<3;i++) after(i*.22,()=>{ ring(x0,y0,R*3.2,'#ffcf4a',.8,{w:9,sy:FSY,dec:.3}); ring(x0,y0,R*2.2,'#ffffff',.5,{w:3,sy:FSY,dec:.3}); });
  const pts=onScreen(100).sort(()=>Math.random()-.5).slice(0,70).map(e=>[e.x,e.y]); while(pts.length<36) pts.push([x0+rand(-hw,hw)*.9,y0+rand(-hh,hh)*.9]);
  pts.forEach(([x,y],i)=>after(.6+i*(2/pts.length)+rand(0,.05),()=>swordFall(x,y,D)));
  const b=V.boss&&!V.boss.dead?V.boss:null, cx=b?b.x:x0, cy=b?b.y:y0+hh*.25;   // lands just in front of the hero, so the whole blade is on screen
  after(2.8,()=>{ V.shadow={x:cx,y:cy,t0:RT}; V.zk=.9; SFX.rise(1.2,.7); pl.target='slashU'; pl.ps=20; });
  const K=VFX.td_colossal, lead=K&&K.f[0].ok?K.hit*K.ms/1000:0;   // the GIF's own fall plays first, its impact frame lands on the beat
  after(3.35-lead,()=>{ if(!tdV('td_colossal',cx,cy,{px:K.ix,py:K.iy,sc:1700/K.h})) add({k:'pillar',x:cx,w:220,life:1,c:'#ffcf4a'}); });
  after(3.35,()=>{ V.shadow=null;
    setInv(.1,'inv'); stamp('레인',{x:.5,y:.16,size:.13,life:1}); post.flash=.5; trauma=1.3; hitstop=.07; shock(cx,cy-60,1.5,1.1); light(cx,cy,2200,'#ffe58a',1,.6);
    ring(cx,cy,3200,'#ffcf4a',.7,{w:12,sy:FSY}); ring(cx,cy,1800,'#ffffff',.4,{w:5,sy:FSY});
    for(let i=0;i<30;i++){ const a=rand(0,TAU), s=rand(400,1300); V.shards.push({x:cx,y:cy,z:10,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6,vz:rand(500,1400),s:rand(8,20),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:rand(1,1.6),rock:true}); }
    for(const e of onScreen(300)) ultHit(e,D*8,cx,cy);
    SFX.boom(2.2,1); SFX.shatter(1); buzz([150,40,250]); });
  after(4.3,ultStop); }

X.reg('sword',{basic:{fn:basic,cd:basicCd},skills:SKILL,ults:{sw_ult1:ultZero,sw_ult2:ultRain},onHurt:src=>{ if(!counterReady()) return false; counter(src); return true; },
  glow:()=>{ if(counterReady()) glow(fx,pl.x,pl.gy-BODY,150,'#9ff7ff',.12+.08*Math.sin(RT*6)); }});
})();
