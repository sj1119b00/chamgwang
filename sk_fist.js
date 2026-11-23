// 참광 survival - FIGHTER skill set (top-down, all automatic). Cyan ki and golden fists. Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,dropFx,ultStart,ultStop,ultHit,burst,fring}=X;
const C1='#55ddff', C2='#ffd84a';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const PUNCH=[[['gb01',.03],['gb02',.04],['gb03',.09,{kick:[1.6,-1.2]}],['gb04',.08]],[['gb05',.03],['gb06',.04],['gb07',.09,{kick:[1.6,-1.2]}],['gb08',.08]],
  [['gb09',.04],['gb10',.09,{kick:[1.6,-1.2]}],['gb08',.08]],[['gb11',.06,{kick:[-1,.8]}],['gb12',.05],['gb13',.12,{kick:[2,-1.6]}],['gb14',.1]]];
const charge=()=>S([['gx03',.08],['gx04',.3,{kick:[-.8,.6]}],['gx08',.1,{kick:[2.2,-1.8]}],['gx10',.25],['gx13',.1]]);
// a fist blow landing on a floor point
function blow(x,y,s=1,c=C1){ const M=VFX.fist_impact; if(M&&M.f[0].ok) vfx('fist_impact',x,y-BODY*.5,{sc:.55*s,rot:rand(0,TAU)});
  fring(x,y,800*s,c,.3,5); gl0(x,y-BODY*.5,120*s,'#ffffff',.12,{a:.8}); for(let i=0;i<6;i++) spark(x,y-BODY*.5,rand(0,TAU),rand(500,1300)*s,{c:pick(['#ffffff',c]),life:rand(.12,.25),w:3,g:0}); }

const sk={
  fs_basic:{cls:'fist',type:'basic',name:'콤보 펀치',lv:1,desc:'가장 가까운 적에게 파고들어 네 번 친다. 네 번째는 띄워 올리는 어퍼.'},
  fs_dash:{cls:'fist',type:'skill',name:'대시 펀치',lv:1,cd:4,dmg:2600,desc:'적에게 순식간에 돌진해 지나간 자리를 쓸고 마지막에 강타한다.',evo:'끝의 강타가 충격파가 되어 주변까지 날린다.'},
  fs_upper:{cls:'fist',type:'skill',name:'라이징 어퍼',lv:1,cd:5,dmg:2200,desc:'앞의 적 무리를 하늘 높이 쳐올린다. 떠 있는 적은 반격하지 못한다.',evo:'범위가 넓어지고 떨어질 때 한 번 더 피해를 준다.'},
  fs_ki:{cls:'fist',type:'skill',name:'기공탄',lv:2,cd:5,dmg:2400,desc:'적을 꿰뚫고 날아가는 기공탄을 쏘고, 끝에서 폭발한다.',evo:'기공탄 세 발을 부채꼴로 쏜다.'},
  fs_stomp:{cls:'fist',type:'skill',name:'스톰프',lv:3,cd:8,dmg:3000,desc:'땅을 내리쳐 주변의 적을 모두 띄우는 충격파를 일으킨다.',evo:'충격파가 두 번 퍼진다.'},
  fs_rush:{cls:'fist',type:'skill',name:'러쉬 펀치',lv:5,cd:7,dmg:500,desc:'앞쪽 부채꼴로 0.8초 동안 주먹을 쏟아붓는다.',evo:'주먹이 더 멀리, 더 많이 나간다.'},
  fs_tornado:{cls:'fist',type:'skill',name:'회오리 킥',lv:6,cd:10,dmg:450,desc:'3초 동안 회오리처럼 돌며 닿는 적을 계속 친다.',evo:'회오리가 커지고 적을 끌어당긴다.'},
  fs_aura:{cls:'fist',type:'skill',name:'아이언 바디',lv:8,cd:14,dmg:800,desc:'4초 동안 금빛 기를 둘러 받는 피해를 크게 줄이고, 닿는 적에게 피해를 준다.',evo:'지속 시간이 6초가 된다.'},
  fs_giga:{cls:'fist',type:'skill',name:'기가 임팩트',lv:10,cd:11,dmg:6000,desc:'기를 모아 정면으로 거대한 일격을 날린다.',evo:'일격이 지나간 길을 따라 폭발이 이어진다.'},
  fs_ult1:{cls:'fist',type:'ult',name:'하이퍼 빔',lv:3,desc:'궁극기. 양손에 모은 기를 거대한 광선으로 뿜어 화면을 한 바퀴 쓸어버린다.'},
  fs_ult2:{cls:'fist',type:'ult',name:'솔라 크래쉬',lv:12,desc:'궁극기. 머리 위에 태양을 만들어 적이 가장 많은 곳에 내던진다.'},
};
const order=Object.keys(sk);

function basic(){ const e=nearest(360); if(!e) return false; const a=angTo(e), n=V.chain++%4, up=n===3, d=900*A.mul('fs_basic')*(up?2.4:1); face(a);
  S(PUNCH[n],true); if(Math.hypot(e.x-pl.x,e.y-pl.gy)>200) V.dash={x0:pl.x,y0:pl.gy,x1:e.x-Math.cos(a)*120,y1:e.y-Math.sin(a)*120,t:0,dur:.08};
  after(up?.2:.1,()=>{ const x=pl.x+Math.cos(a)*150, y=pl.gy+Math.sin(a)*150; blow(x,y,up?1.4:.9,up?C2:C1); sfx('boom',up?.9:.5,.5); sfx('whoosh',1.5,.4);
    inSector(pl.x,pl.gy,a,up?300:260,.9,o=>{ dmg(o,d,{kb:up?1.2:.6,launch:up?1100:0,stun:up?.8:.2}); hitFx(o,up?C2:C1,up?1.3:1); });
    if(up) trauma=Math.min(.9,trauma+.25); });
  return true; }

const SKILL={
  fs_dash:{fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+80), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld; face(a);
    S(PUNCH[1]); const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.11}; G.inv=Math.max(G.inv,.35); sfx('whoosh',1.3,.7);
    add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.35,c:C1,w:34,grow:true}); add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.25,c:'#ffffff',w:8,grow:true});
    after(.12,()=>{ inLine(x0,y0,x1,y1,90,o=>{ dmg(o,d*.6,{kb:.6,sx:x0,sy:y0}); hitFx(o,C1,1); });
      const x=x1+Math.cos(a)*110, y=y1+Math.sin(a)*110; blow(x,y,1.6,C2); sfx('boom',1.2,.8); trauma=Math.min(1,trauma+.35);
      const r=EVO(id)?330:200; if(EVO(id)){ const M=VFX.fx_fist_shock; if(M&&M.f[0].ok) vfx('fx_fist_shock',x,y,{px:M.ix??.5,py:M.iy??.5,sc:r*2.6/M.w}); fring(x,y,1800,C1,.4,8); }
      inCircle(x,y,r,o=>{ dmg(o,d,{kb:1.6,big:true,sx:x1,sy:y1}); hitFx(o,C2,1.3); }); }); }},
  fs_upper:{fn(id){ const e=nearest(380); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?300:220, cx=pl.x+Math.cos(a)*180, cy=pl.gy+Math.sin(a)*180; face(a);
    S(PUNCH[3]); after(.2,()=>{ const M=VFX.fist_impact; if(M&&M.f[0].ok) vfx('fist_impact',cx,cy-BODY,{sc:1,rot:-Math.PI/2});
      for(let i=0;i<14;i++) add({k:'line',x1:cx+rand(-R,R)*.6,y1:cy-rand(0,40),x2:cx+rand(-R,R)*.6,y2:cy-rand(500,900),life:rand(.2,.35),c:pick([C1,'#ffffff',C2]),w:rand(3,7)});
      fring(cx,cy,1200,C1,.35,7); sfx('boom',1,.7); sfx('whoosh',1.1,.8); trauma=Math.min(1,trauma+.3);
      inCircle(cx,cy,R,o=>{ dmg(o,d,{kb:.3,launch:1400,stun:1,sx:pl.x,sy:pl.gy}); hitFx(o,C2,1.3); if(EVO(id)) after(.9,()=>{ if(!o.dead){ dmg(o,d*.6,{kb:.2}); blow(o.x,o.y,.6); } }); }); }); }},
  fs_ki:{fn(id){ const e=nearest(900); if(!e) return false; const a0=angTo(e), d=D(id), n=EVO(id)?3:1; face(a0); charge(); sfx('rise',1.2,.4);
    after(.42,()=>{ for(let k=0;k<n;k++){ const a=a0+(k-(n-1)/2)*.3, p={x:pl.x+Math.cos(a)*80,y:pl.gy+Math.sin(a)*80,vx:Math.cos(a)*1250,vy:Math.sin(a)*1250,life:1.1,d,r:110,hits:new Set(),c:C1,v:{x:0,y:0},h:BODY*.9,pw:1.3};
        p.v.x=p.x; p.v.y=p.y-p.h; const M=VFX.fx_fist_kiball; p.fx=M&&M.f[0].ok?vfx('fx_fist_kiball',p.v.x,p.v.y,{follow:p.v,loop:true,life:1.1,sc:360/M.w,rot:a,px:M.ix??.75,py:M.iy??.5}):null;
        if(!p.fx) gl0(p.v.x,p.v.y,80,C1,1.1,{a:.9});
        p.onEnd=p=>{ blow(p.x,p.y,1.5,C1); sfx('boom',1,.6); inCircle(p.x,p.y,200,o=>dmg(o,d,{kb:1.2,sx:p.x,sy:p.y})); };
        V.pj.push(p); } sfx('boom',.7,.5); }); }},
  fs_stomp:{fn(id){ const R=EVO(id)?620:520; if(countIn(R)<3&&!nearest(220)) return false; const d=D(id);
    S([['gy08',.12,{kick:[-1,.8]}],['gy01',.1],['gy12',.08,{kick:[2.4,-2]}],['gy13',.25],['gy16',.1]]);
    const wave=k=>{ const M=VFX.fx_fist_shock; if(M&&M.f[0].ok) vfx('fx_fist_shock',pl.x,pl.gy,{px:M.ix??.5,py:M.iy??.5,sc:R*2.4*(k?1.2:1)/M.w});
      fring(pl.x,pl.gy,R*5,C1,.45,10); fring(pl.x,pl.gy,R*3,'#ffffff',.3,4); shock(pl.x,pl.gy-40,.8); trauma=Math.min(1.1,trauma+.5); hitstop=Math.max(hitstop,.04); sfx('boom',1.4,1);
      burst(pl.x,pl.gy,14,{rock:true,s0:300,s1:1000}); inCircle(pl.x,pl.gy,R*(k?1.25:1),o=>{ dmg(o,d*(k?.6:1),{kb:1.4,launch:900,big:true}); hitFx(o,C1,1.2); }); };
    after(.22,()=>wave(0)); if(EVO(id)) after(.55,()=>wave(1)); }},
  fs_rush:{fn(id){ const e=nearest(420); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?470:380, n=EVO(id)?14:10; face(a);
    const st=[]; for(let i=0;i<8;i++) st.push(['gy0'+(2+i%4),.05]); st.push(['gy06',.06],['gy07',.08]); S(st);
    const M=VFX.fx_fist_barrage; if(M&&M.f[0].ok) for(let k=0;k<2;k++) after(k*.35,()=>vfx('fx_fist_barrage',pl.x+Math.cos(a)*R*.45,pl.gy+Math.sin(a)*R*.45-BODY*.8,{sc:R*1.2/M.w,rot:a,px:.45,a:.95}));
    for(let i=0;i<n;i++) after(i*.06,()=>{ const b=a+rand(-.5,.5), r=rand(140,R), x=pl.x+Math.cos(b)*r, y=pl.gy+Math.sin(b)*r;
      if(!M||!M.f[0].ok) add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x,y2:y-BODY,life:.12,c:pick([C1,C2]),w:12}); blow(x,y,.55,i%2?C1:C2); sfx('boom',.4,.35);
      inSector(pl.x,pl.gy,a,R,.55,o=>{ if((o.rushT||0)>RT) return; o.rushT=RT+.05; dmg(o,d,{kb:.3,stun:.25}); hitFx(o,C2,.9); }); }); }},
  fs_tornado:{fn(id){ if(V.zones.some(z=>z.torn)||countIn(500)<2) return false; const d=D(id), R=EVO(id)?320:240;
    const M=VFX.fx_fist_tornado, v={x:pl.x,y:pl.gy}, f=M&&M.f[0].ok?vfx('fx_fist_tornado',v.x,v.y,{follow:v,loop:true,life:3,px:M.ix??.5,py:M.iy??.85,sc:R*2.4/M.w,a:.9}):null;
    S([['gy02',.05],['gy03',.05],['gy04',.05],['gy05',.05]]); sfx('whoosh',.8,.8);
    V.zones.push({torn:true,follow:true,r:R,life:3,tick:.2,fx:f,v,fn:e=>{ dmg(e,d,{kb:.9,stun:.2}); hitFx(e,C1,.9); if(EVO(id)) e.pull={x:pl.x,y:pl.gy,s:300}; },
      onTick:z=>{ if(!anim.seq) S([['gy02',.05],['gy03',.05],['gy04',.05],['gy05',.05]]); sfx('whoosh',1.2,.3); for(let i=0;i<3;i++){ const b=rand(0,TAU); add({k:'line',x1:z.x+Math.cos(b)*R*.3,y1:z.y-rand(20,300),x2:z.x+Math.cos(b+1.2)*R,y2:z.y-rand(20,300),life:.2,c:C1,w:4}); } }}); }},
  fs_aura:{fn(id){ if(V.armor>0||countIn(420)<4) return false; const d=D(id), T=EVO(id)?6:4; V.armor=T; charge(); sfx('rise',.7,.6); stamp('아이언',{x:.5,y:.2,size:.08,life:.8,c:C2});
    const M=VFX.fx_fist_aura, v={x:pl.x,y:pl.gy}, f=M&&M.f[0].ok?vfx('fx_fist_aura',v.x,v.y,{follow:v,loop:true,life:T,px:M.ix??.5,py:M.iy??.6,sc:300/M.w,a:.95,wy:FSY/.75}):null;
    V.zones.push({follow:true,r:230,life:T,tick:.5,fx:f,v,fn:e=>{ dmg(e,d,{kb:1.1}); hitFx(e,C2,1); }}); }},
  fs_giga:{fn(id){ const e=nearest(700); if(!e) return false; const a=angTo(e), d=D(id), Lg=900; face(a); charge(); sfx('rise',1,.6);
    gl0(pl.x,pl.gy-BODY,160,C2,.45,{a:.9}); for(let i=0;i<20;i++) gl0(pl.x+rand(-400,400),pl.gy+rand(-300,200)-BODY,rand(5,10),C2,.45,{tx:pl.x,ty:pl.gy-BODY});
    after(.45,()=>{ const x1=pl.x+Math.cos(a)*Lg, y1=pl.gy+Math.sin(a)*Lg, M=VFX.fist_beam;
      if(M&&M.f[0].ok) vfx('fist_beam',(pl.x+x1)/2,(pl.gy+y1)/2-BODY,{sc:Lg/M.w,sy:1.1,rot:a,life:.35,a:1});
      add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x1,y2:y1-BODY,life:.3,c:C1,w:90,grow:true}); add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x1,y2:y1-BODY,life:.22,c:'#ffffff',w:26,grow:true});
      blow(pl.x+Math.cos(a)*160,pl.gy+Math.sin(a)*160,1.8,C2); trauma=1; hitstop=.06; post.flash=Math.min(.4,post.flash+.2); sfx('boom',1.8,1);
      inLine(pl.x,pl.gy,x1,y1,140,o=>{ dmg(o,d,{kb:2,big:true,launch:600}); hitFx(o,C2,1.5); });
      if(EVO(id)) for(let i=1;i<=5;i++) after(i*.07,()=>{ const x=pl.x+Math.cos(a)*Lg*i/5, y=pl.gy+Math.sin(a)*Lg*i/5; blow(x,y,1.2,C1); inCircle(x,y,170,o=>dmg(o,d*.4,{kb:.8,sx:x,sy:y})); }); }); }},
};

// ---- ultimates (top-down)
function ultBeam(id){ ultStart(id); const {hw,hh}=view(), Dm=60000*A.mul(id), Lb=Math.hypot(hw,hh)*1.1, e=nearest(1600), a0=e?angTo(e):0, M=VFX.fist_beam; face(a0);
  ov.dimT=.5; V.zk=1.2; const S0=[['gx01',.08],['gx02',.1],['gx03',.12],['gx04',.4,{kick:[-.8,.6]}]]; for(let i=0;i<2;i++) S0.push(['gx0'+(5+i%3),.3]); S0.push(['gx08',.1,{kick:[2.2,-1.8]}]); for(let i=0;i<8;i++) S0.push(['gx'+String(9+i%4).padStart(2,'0'),.3]); S0.push(['gx13',.3],['gx14',.3]); S(S0);
  sfx('rise',.8,.6); for(let i=0;i<40;i++) after(i*.02,()=>gl0(pl.x+rand(-500,500),pl.gy+rand(-400,300)-BODY,rand(6,12),pick([C1,'#ffffff']),.5,{tx:pl.x+pl.f*40,ty:pl.gy-BODY}));
  after(.5,()=>{ const J=pl.j; gl0(pl.x+pl.f*50,pl.gy-BODY,220,C1,1.2,{a:.8}); stamp('하이퍼',{x:.5,y:.18,size:.12,life:.8,c:C1}); });
  let t=0; const T=2.6;
  after(1.2,()=>{ V.zk=.9; stamp('빔',{x:.5,y:.18,size:.14,life:1,c:'#ffffff'}); post.flash=.35; trauma=1; SFX.boom(1.6,.8);
    const tick=()=>{ t+=.05; if(t>T||RPG.mode!=='surv'){ return; } const a=a0+TAU*Math.min(1,t/T)*(pl.f>0?1:-1), x1=pl.x+Math.cos(a)*Lb, y1=pl.gy+Math.sin(a)*Lb, mx=(pl.x+x1)/2, my=(pl.gy+y1)/2-BODY;
      if(M&&M.f[0].ok) vfx('fist_beam',mx,my,{sc:Lb/M.w,sy:1.5,rot:a,life:.09,a:1});
      add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x1,y2:y1-BODY,life:.09,c:C1,w:150}); add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x1,y2:y1-BODY,life:.09,c:'#ffffff',w:44});
      trauma=Math.max(trauma,.5); if(Math.random()<.5) blow(pl.x+Math.cos(a)*rand(300,Lb),pl.gy+Math.sin(a)*rand(300,Lb),1,C1);
      inLine(pl.x,pl.gy,x1,y1,160,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.3; ultHit(o,Dm*.5,pl.x,pl.gy); });
      after(.05,tick); };
    tick(); });
  after(1.2+T,()=>{ setInv(.1,'inv'); post.flash=.4; shock(pl.x,pl.gy-BODY,1.2,1.1); fring(pl.x,pl.gy,3400,C1,.6,12); for(const o of onScreen(200)) ultHit(o,Dm,pl.x,pl.gy); SFX.boom(2,1); });
  after(1.2+T+.8,ultStop); }
function ultSun(id){ ultStart(id); const {hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3);
  ov.dimT=.5; V.zk=1.05; S([['gy09',.15],['gy10',.6],['gy11',.6],['gy10',.4],['gy11',.4],['gy12',.12,{kick:[2,-1.5]}],['gy13',.8],['gy14',.2],['gy15',.2],['gy16',.3]]); SFX.rise(.6,.6);
  const sun={x:pl.x,y:pl.gy-BODY*2.6,r:30}; let t=0;
  V.ultTick=dt=>{ t+=dt; if(t<2.2){ sun.r=30+t*110; sun.x=pl.x; sun.y=pl.gy-BODY*2.6; } else { const k=Math.min(1,(t-2.2)/.5); sun.x=lerp(pl.x,cx,k); sun.y=lerp(pl.gy-BODY*2.6,cy-60,k*k); }
    if(t<2.75&&Math.random()<.6) gl0(sun.x+rand(-sun.r,sun.r),sun.y+rand(-sun.r,sun.r),rand(10,24),pick([C2,'#ff9a2a']),.4,{a:.8}); };
  V.ultDraw=()=>{ if(t>=2.75) return; const g=ctx.createRadialGradient(sun.x,sun.y,sun.r*.1,sun.x,sun.y,sun.r); g.addColorStop(0,'#fffbe8'); g.addColorStop(.55,'#ffd84a'); g.addColorStop(.9,'#ff8a1a'); g.addColorStop(1,'rgba(255,90,20,.0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sun.x,sun.y,sun.r,0,TAU); ctx.fill(); glow(fx,sun.x,sun.y,sun.r*2.6,C2,.55); fx.strokeStyle=hexA('#ffffff',.7); fx.lineWidth=4; fx.beginPath(); fx.arc(sun.x,sun.y,sun.r*.92,0,TAU); fx.stroke(); };
  // the glow is redrawn every frame, so keep a particle under it too (the HUD pass clears fx)
  after(.8,()=>stamp('솔라',{x:.5,y:.18,size:.12,life:.8,c:C2}));
  after(2.2,()=>{ V.shadow={x:cx,y:cy,t0:RT,dur:.5,r:480,c:C2}; V.zk=.9; sfx('whoosh',.5,1); });
  const at=dropFx('fx_fist_sunblast',cx,cy,1700,2.75,{a:.85})??2.75;
  after(at,()=>{ V.shadow=null; add({k:'decal',x:cx,y:cy,r:420,life:6}); burst(cx,cy,20,{rock:true,s0:300,s1:900}); setInv(.12,'inv'); stamp('크래쉬',{x:.5,y:.18,size:.14,life:1,c:'#ffffff'}); post.flash=.6; trauma=1.4; hitstop=.08; shock(cx,cy-60,1.6,1.1);
    fring(cx,cy,3600,C2,.8,14); fring(cx,cy,2200,'#ffffff',.4,5); light(cx,cy,2600,C2,1.2,.6); burst(cx,cy,24,{c:C2,s0:400,s1:1400});
    for(const e of onScreen(300)) ultHit(e,Dm,cx,cy); SFX.boom(2.4,1); buzz([200,40,300]); });
  after(at+1,ultStop); }

X.reg('fist',{sk,order,basic:{fn:basic,cd:()=>.5*(1-.05*(L('fs_basic')-1))},skills:SKILL,ults:{fs_ult1:ultBeam,fs_ult2:ultSun},
  glow:()=>{ if(V.armor>0) glow(fx,pl.x,pl.gy-BODY,200,C2,.25+.1*Math.sin(RT*8)); }});
})();
