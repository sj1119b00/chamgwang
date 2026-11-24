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
  S(PUNCH[n],true); if(!V.steer&&Math.hypot(e.x-pl.x,e.y-pl.gy)>200) V.dash={x0:pl.x,y0:pl.gy,x1:e.x-Math.cos(a)*120,y1:e.y-Math.sin(a)*120,t:0,dur:.08,soft:true}; /* the step-in never fights the stick */
  after(up?.2:.1,()=>{ const x=pl.x+Math.cos(a)*150, y=pl.gy+Math.sin(a)*150; blow(x,y,up?1.4:.9,up?C2:C1); sfx('boom',up?.9:.5,.5); sfx('whoosh',1.5,.4);
    inSector(pl.x,pl.gy,a,up?300:260,.9,o=>{ dmg(o,d,{kb:up?1.2:.6,launch:up?1100:0,stun:up?.8:.2}); hitFx(o,up?C2:C1,up?1.3:1); });
    if(up) trauma=Math.min(.9,trauma+.25); });
  return true; }

const SKILL={
  fs_dash:{moves:true,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+80), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld; face(a);
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

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const KI='#55ddff', SUN='#ffc23a';
// HYPER BEAM: the ground lets go of its stones while he gathers; then one sustained roar of light he has to lean into, swept right round.
function ultBeam(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), Lb=Math.hypot(hw,hh)*1.25, e0=nearest(1600), a0=e0?angTo(e0):0, M=VFX.fist_beam, x0=pl.x, y0=pl.gy, hy=y0-BODY; face(a0);
  const S0=[['gx01',.1],['gx02',.14],['gx03',.2],['gx04',1.35,{kick:[-.8,.6]}],['gx08',.1,{kick:[2.2,-1.8]}]]; for(let i=0;i<9;i++) S0.push(['gx'+String(9+i%4).padStart(2,'0'),.3]); S0.push(['gx13',.6],['gx14',9]); S(S0);
  Cn.setDark(.8,{c:'2,7,16',spot:{x:x0,y:hy,r:820,a:.2}}); Cn.zoom(1.55); Cn.cam(x0,hy,5); Cn.roll(.03); const dr=Cn.drone(52,.4); SFX.rumble(1.7);
  // omen: stones lift off the floor around him and hang there
  const rocks=[]; for(let i=0;i<Math.round(16*(COARSE?.7:1));i++){ const a=rand(0,TAU), r=rand(120,520); rocks.push({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*.7,s:rand(8,26),d:rand(0,.9),h:rand(120,420),rot:rand(0,TAU),vr:rand(-2,2)}); }
  let t=0, firing=false, ang=a0, wide=1, nova=0; V.ultTick=dt=>{ t+=dt; Cn.shake(t<1.8?.1+t*.12:0); };
  V.ultDraw=()=>{ const gone=t>1.85?Math.min(1,(t-1.85)/.25):0;
    for(const r of rocks){ const k=clamp((t-r.d)/1.1,0,1), z=r.h*easeOut(k)+Math.sin(RT*3+r.rot)*8+gone*900, al=1-gone; if(k<=0||al<=0) continue; ctx.fillStyle=`rgba(0,0,0,${.35*al})`; ctx.beginPath(); ctx.ellipse(r.x,r.y,r.s*1.1,r.s*.4,0,0,TAU); ctx.fill();
      ctx.save(); ctx.globalAlpha=al; ctx.translate(r.x,r.y-z); ctx.rotate(r.rot+RT*r.vr); ctx.fillStyle='#2c2838'; ctx.beginPath(); ctx.moveTo(0,-r.s); ctx.lineTo(r.s*.8,-r.s*.1); ctx.lineTo(r.s*.4,r.s*.8); ctx.lineTo(-r.s*.7,r.s*.5); ctx.lineTo(-r.s*.9,-r.s*.3); ctx.closePath(); ctx.fill(); ctx.strokeStyle=hexA(KI,.6); ctx.lineWidth=2; ctx.stroke(); ctx.restore(); ctx.globalAlpha=1; glow(fx,r.x,r.y-z,r.s*2.2,KI,.18*al); }
    if(t<1.85){ const k=Math.min(1,t/1.6), hx=x0+pl.f*46; glow(fx,hx,hy,60+170*k+12*Math.sin(RT*40),KI,.5+.3*k); glow(fx,hx,hy,26+60*k,'#ffffff',.9); }
    if(firing){ const ca=Math.cos(ang), sa=Math.sin(ang), w=(215+30*Math.sin(RT*47))*wide, sx=x0+ca*70, sy=hy+sa*70;
      fx.save(); fx.translate(sx,sy); fx.rotate(ang);
      for(const [ww,c,al] of [[w*2.4,KI,.16],[w*1.4,KI,.42],[w*.8,'#bff4ff',.8],[w*.38,'#ffffff',1]]){ const g=fx.createLinearGradient(0,-ww/2,0,ww/2); g.addColorStop(0,hexA(c,0)); g.addColorStop(.5,hexA(c,al)); g.addColorStop(1,hexA(c,0)); fx.fillStyle=g; fx.fillRect(0,-ww/2,Lb,ww); }
      if(M&&M.f[0].ok){ const f=M.f[Math.floor(RT/.05)%M.n], th=w*2.1, tw=th*M.w/M.h; fx.globalAlpha=.85; for(let x=0;x<Lb;x+=tw*.92) fx.drawImage(f.im,x,-th/2,tw,th); fx.globalAlpha=1; }
      // rings travelling down the beam
      for(let i=0;i<5;i++){ const u=((RT*2.6+i/5)%1), x=u*Lb; fx.strokeStyle=hexA('#ffffff',.55*(1-u)); fx.lineWidth=5; fx.beginPath(); fx.ellipse(x,0,w*.16,w*(.7+u*.5),0,0,TAU); fx.stroke(); }
      fx.restore(); glow(fx,sx,sy,w*1.9,KI,.7); glow(fx,sx,sy,w*.9,'#ffffff',.9); glow(fx,x0+ca*Lb*.5,hy+sa*Lb*.5,w*3,KI,.12); }
    if(nova&&firing){ const k=Math.min(1,(RT-nova)/.32), ww=40+200*k*k; for(let i=0;i<10;i++){ const a=ang+i*TAU/10; fx.save(); fx.translate(x0,hy); fx.rotate(a); for(const [m,c,al] of [[1.6,KI,.4],[.8,'#bff4ff',.8],[.35,'#ffffff',1]]){ const g=fx.createLinearGradient(0,-ww*m/2,0,ww*m/2); g.addColorStop(0,hexA(c,0)); g.addColorStop(.5,hexA(c,al*k)); g.addColorStop(1,hexA(c,0)); fx.fillStyle=g; fx.fillRect(60,-ww*m/2,Lb*(.3+.7*k),ww*m); } fx.restore(); } } };
  Cn.gather(x0+pl.f*46,hy,{c:KI,dur:.95,r:820,n:46,cs:[KI,'#ffffff','#bff4ff']});
  after(.5,()=>Cn.scar({x:x0,y:y0,r:300,c:KI,life:8,heat:5}));
  // release
  const T=2.5, t0=1.85, dir=pl.f>0?1:-1;
  after(t0,()=>Cn.impact(x0+pl.f*60,hy,{style:'fist',c:KI,n:2,v:.7,r:.1,then:()=>{ firing=true; dr.stop(.1); Cn.zoom(.84); Cn.cam(null); Cn.roll(0); Cn.setDark(.84,{spot:null}); Cn.speed(T,{c:'#bff4ff',a:.26,n:20,x:x0,y:hy}); beamSnd=SFX.beam(1);
      let bt=0, sc=0; const tick=()=>{ bt+=.05; if(bt>T||RPG.mode!=='surv'||!lock){ return; } ang=a0+TAU*easeIO(Math.min(1,bt/T))*dir; face(ang); const x1=x0+Math.cos(ang)*Lb, y1=y0+Math.sin(ang)*Lb;
        Cn.shake(.55); post.ca=.006; if(Math.random()<.6) blow(x0+Math.cos(ang)*rand(300,Lb*.8),y0+Math.sin(ang)*rand(300,Lb*.8),1,KI);
        if((sc+=.05)>=.16){ sc=0; Cn.scar({kind:'gash',x:x0+Math.cos(ang)*Lb*.42,y:y0+Math.sin(ang)*Lb*.42,rot:ang,len:Lb*.78,w:240,c:KI,life:3.4,heat:1.5}); const r=rand(380,760); Cn.scar({kind:'burn',x:x0+Math.cos(ang)*r,y:y0+Math.sin(ang)*r,r:150,c:KI,life:5.5,heat:1.8}); }
        V.blast={x:x0,y:y0,p:1.4}; inLine(x0,y0,x1,y1,210,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.3; blow(o.x,o.y,1.3,KI); ultHit(o,Dm*.5,x0,y0); });
        after(.05,tick); }; tick(); }}));
  // climax: the last of it, all at once
  after(t0+.1+T,()=>{ wide=.5; nova=RT; Cn.SND.inhale(.3,.5); Cn.zoom(.8); });
  after(t0+.1+T+.32,()=>{ Cn.impact(x0,hy,{style:'fist',c:KI,n:3,r:.14,then:()=>{ firing=false; beamSnd.stop(); beamSnd=NOP; Cn.waves(x0,y0,KI,{n:3,s:1.1,dc:'30,44,60'}); Cn.scar({kind:'crater',x:x0,y:y0,r:700,c:KI,life:9,heat:3.4}); Cn.wash('200,240,255',.3,0,x0,y0);
      Cn.sweep(x0,y0,Dm,{speed:3600}); Cn.setDark(.35,{spot:null}); Cn.ashFall(2.4,'#bff4ff',30,{glow:true,up:true}); }}); });
  // afterglow: steam off the floor, his hands still lit
  after(t0+T+1,()=>{ Cn.smokeRise(x0,y0,420,{n:12,dur:1,c:'120,140,160',a:.22}); Cn.embers(x0,y0,560,KI,{n:30,dur:1.3}); Cn.setDark(0); Cn.zoom(1); });
  after(t0+T+1.75,ultStop); }
const easeIO=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;

// SOLAR CRASH: a second sun over a field that suddenly has long shadows. He goes up after it and brings it down with his fist.
function ultSun(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy;
  const up=k=>1-(1-k)*(1-k), dn=k=>k*k;
  S([['gy09',.2],['gy10',.75],['gy11',.75],['gy10',.25],['gy11',.3,{air:[0,330],ease:up}],['gy12',.16,{air:[330,360],kick:[2,-1.5]}],['gy13',.5,{air:[360,0],ease:dn}],['gy14',.4],['gy15',.4],['gy16',9]]);
  Cn.setDark(.76,{c:'18,9,0',spot:{x:x0,y:y0-BODY*2.4,r:1000,a:.25}}); Cn.zoom(1.2); Cn.cam(x0,y0-BODY*2.3,5); const dr=Cn.drone(58,.35); SFX.fire(2.2,.5);
  const sun={x:x0,y:y0-BODY*3.1,r:20,on:true}; let t=0, fly=null, rays=0;
  V.ultTick=dt=>{ t+=dt; if(!fly){ sun.r=20+easeOut(Math.min(1,t/1.9))*340; } else { const k=Math.min(1,(t-fly)/.26); sun.x=lerp(x0,cx,k*k); sun.y=lerp(y0-BODY*3.1,cy-80,k*k); sun.r=360; if(Math.random()<.9) gl0(sun.x,sun.y,sun.r*.8,SUN,.25,{a:.6}); }
    if(sun.on&&Math.random()<.5) gl0(sun.x+rand(-1,1)*sun.r,sun.y+rand(-1,1)*sun.r,rand(8,20),pick([SUN,'#ff8a1a','#fff6d0']),.5,{a:.8,vy:-rand(40,160)});
    if(rays>0) rays-=dt; };
  V.ultDraw=()=>{ if(sun.on){ // everything on the field throws a long shadow away from it
      const L=V.sorted||[]; ctx.fillStyle='rgba(0,0,0,.42)'; let n=0; for(const e of L){ if(n++>90) break; const dx=e.x-sun.x, dy=e.y-(sun.y+BODY*3), l=Math.hypot(dx,dy)||1, len=Math.min(420,90+l*.28)*Math.min(1,sun.r/200); ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(Math.atan2(dy,dx)); ctx.beginPath(); ctx.ellipse(len*.5,0,len*.5,e.d.r*.5,0,0,TAU); ctx.fill(); ctx.restore(); }
      const tx=Cn.img('fx_sun'), r=sun.r; glow(fx,sun.x,sun.y,r*3.2,SUN,.45); glow(fx,sun.x,sun.y,r*1.7,'#ff8a1a',.5);
      if(tx.ok){ for(const [k,sp,al] of [[1.55,.35,.9],[1.75,-.22,.5]]){ fx.save(); fx.translate(sun.x,sun.y); fx.rotate(RT*sp); fx.globalAlpha=al; fx.drawImage(tx.im,-r*k,-r*k,r*k*2,r*k*2); fx.restore(); } fx.globalAlpha=1;
        ctx.save(); ctx.translate(sun.x,sun.y); ctx.rotate(RT*.35); ctx.beginPath(); ctx.arc(0,0,r*.86,0,TAU); ctx.clip(); ctx.drawImage(tx.im,-r*1.55,-r*1.55,r*3.1,r*3.1); ctx.restore(); }
      else { const g=ctx.createRadialGradient(sun.x,sun.y,r*.1,sun.x,sun.y,r); g.addColorStop(0,'#fffbe8'); g.addColorStop(.6,'#ffd84a'); g.addColorStop(1,'rgba(255,90,20,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sun.x,sun.y,r,0,TAU); ctx.fill(); }
      glow(fx,sun.x,sun.y,r*.7,'#ffffff',.55); }
    if(rays>0){ const k=rays/.7; fx.save(); fx.translate(cx,cy-60); fx.rotate(RT*.8); const rg=fx.createRadialGradient(0,0,0,0,0,2200); rg.addColorStop(0,hexA('#fff6d0',.7*k)); rg.addColorStop(.5,hexA('#ffc23a',.28*k)); rg.addColorStop(1,hexA('#ff8a1a',0)); fx.fillStyle=rg; for(let i=0;i<14;i++){ const a=i/14*TAU, w=.05+.03*Math.sin(i*7.3); fx.beginPath(); fx.moveTo(0,0); fx.lineTo(Math.cos(a-w)*2600,Math.sin(a-w)*2600*.75); fx.lineTo(Math.cos(a+w)*2600,Math.sin(a+w)*2600*.75); fx.fill(); } fx.restore(); } };
  Cn.gather(x0,y0-BODY*3.1,{c:SUN,dur:1,r:1000,n:50,cs:[SUN,'#ff8a1a','#ffffff'],fy:y0});
  // release: he goes up to it
  after(1.95,()=>{ Cn.zoom(.95); Cn.setDark(.82,{spot:null}); Cn.omen(cx,cy,580,SUN,.82); sfx('whoosh',.6,1); Cn.speed(.5,{c:SUN,a:.25,x:x0,y:y0-BODY*3}); });
  after(2.42,()=>Cn.impact(x0,y0-BODY*3,{style:'fist',c:SUN,n:2,v:.7,r:.1,then:()=>{ fly=t; dr.stop(.1); Cn.cam(cx,cy-BODY,10); Cn.zoom(.84); sfx('whoosh',.45,1); }}));
  // climax
  after(2.42+.09+.27,()=>{ V.shadow=null; Cn.impact(cx,cy-80,{style:'fist',c:SUN,n:3,r:.15,then:()=>{ sun.on=false; rays=.7;
      const K=VFX.fx_fist_sunblast; if(K&&K.f[0].ok){ const v=vfx('fx_fist_sunblast',cx,cy,{px:K.ix,py:K.iy,sc:2900/K.h,a:.9}); if(v){ v.age=K.hit*K.ms/1000; v.life-=v.age; } }
      fireBurst(cx,cy-80,2.4,0); Cn.waves(cx,cy,SUN,{n:4,s:1.25,dc:'70,50,20'}); Cn.scar({kind:'crater',x:cx,y:cy,r:900,c:SUN,life:10,heat:4.5}); Cn.scar({kind:'burn',x:cx,y:cy,r:560,c:SUN,life:10,heat:4}); Cn.wash('255,236,180',.34,0,cx,cy);
      burst(cx,cy,24,{rock:true,s0:300,s1:1200,vz:1400}); burst(cx,cy,20,{c:SUN,s0:400,s1:1400}); Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}); Cn.setDark(.35); Cn.ashFall(2.6,'#ffe9a0',36,{glow:true,up:true}); }}); });
  // afterglow: the floor is glass and still hot
  after(3.5,()=>{ Cn.embers(cx,cy,680,SUN,{n:46,dur:1.6}); Cn.smokeRise(cx,cy,380,{n:8,dur:1,c:'60,44,30',a:.3}); });
  after(4.2,()=>{ Cn.setDark(0); Cn.zoom(1); Cn.cam(null); });
  after(4.85,ultStop); }

X.reg('fist',{sk,order,basic:{fn:basic,cd:()=>.5*(1-.05*(L('fs_basic')-1))},skills:SKILL,ults:{fs_ult1:ultBeam,fs_ult2:ultSun},
  glow:()=>{ if(V.armor>0) glow(fx,pl.x,pl.gy-BODY,200,C2,.25+.1*Math.sin(RT*8)); }});
})();
