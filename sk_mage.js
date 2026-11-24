// 참광 survival - MAGE skill set (top-down, all automatic). Violet arcane and lightning. Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inLine,sfx,view,onScreen,tdV,dropFx,ultStart,ultStop,ultHit,burst,fring}=X;
const C1='#b48cff', C2='#e6d4ff';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const quick=b=>S([['gb04',.04],['gb05',.05],['gb06',.04],['gb07',.08,{kick:[1.6,-1.2]}],['gb09',.08],['gb12',.06]],b);
const raise=()=>S([['gx03',.06],['gx04',.1],['gx06',.22],['gx08',.08,{kick:[1.2,-1]}],['gx10',.2],['gx14',.1]]);
// a lightning strike on a floor point: the ChatGPT bolt sprite, a branching line bolt and a floor flash
function zap(x,y,c=C1,s=1){ const M=VFX.mage_lightning; if(M&&M.f[0].ok) vfx('mage_lightning',x,y+10,{sc:900*s/M.h,sx:(Math.random()<.5?-1:1)*.55,a:.95});
  add({k:'bolt',lines:genBolt(x+rand(-120,120),y-1000*s,x,y-20,90*s,5*s,[]),life:.28,c}); fring(x,y,700*s,c,.3,4); gl0(x,y-40,120*s,c,.16,{a:.55}); light(x,y-200,500*s,c,.2,.35); }

const sk={
  mg_basic:{cls:'mage',type:'basic',name:'매직 볼트',lv:1,desc:'가장 가까운 적에게 휘어 날아가는 마탄을 쏜다. 강화할수록 마탄이 늘어난다.'},
  mg_bolt:{cls:'mage',type:'skill',name:'라이트닝',lv:1,cd:3.5,dmg:2600,desc:'화면 안의 적 3명에게 번개를 내리꽂는다. 강화마다 한 명씩 늘어난다.',evo:'번개가 떨어진 자리에 작은 전기 폭발이 한 번 더 터진다.'},
  mg_orb:{cls:'mage',type:'skill',name:'아케인 오브',lv:1,cd:8,dmg:900,desc:'마력 구슬 3개가 5초 동안 주위를 돌며 닿는 적을 친다.',evo:'구슬이 5개가 되고 더 크게 돈다.'},
  mg_chain:{cls:'mage',type:'skill',name:'체인 라이트닝',lv:2,cd:6,dmg:1800,desc:'번개가 적에서 적으로 6번 튄다. 강화할수록 더 많이 튄다.',evo:'튄 번개가 두 갈래로 갈라진다.'},
  mg_nova:{cls:'mage',type:'skill',name:'프로스트 노바',lv:3,cd:9,dmg:2400,desc:'주위에 냉기를 터뜨려 적을 얼리고 2.5초 동안 느리게 만든다.',evo:'범위가 크게 넓어진다.'},
  mg_vortex:{cls:'mage',type:'skill',name:'그래비티',lv:5,cd:10,dmg:500,desc:'적이 가장 많은 곳에 소용돌이를 열어 2.5초 동안 빨아들인 뒤 터뜨린다.',evo:'빨아들이는 힘과 마지막 폭발이 강해진다.'},
  mg_field:{cls:'mage',type:'skill',name:'썬더 필드',lv:6,cd:11,dmg:700,desc:'5초 동안 몸 주위에 전기 결계를 둘러 안의 적을 계속 감전시킨다.',evo:'결계가 넓어지고 안의 적에게 번개가 떨어진다.'},
  mg_star:{cls:'mage',type:'skill',name:'스타폴',lv:8,cd:9,dmg:3800,desc:'보랏빛 운석 6개를 적 머리 위로 떨어뜨린다.',evo:'운석이 10개가 된다.'},
  mg_beam:{cls:'mage',type:'skill',name:'아케인 레이',lv:10,cd:12,dmg:600,desc:'마력 광선을 뿜으며 한 바퀴 휘둘러 주변을 쓸어버린다.',evo:'광선이 두 줄이 되어 반대 방향으로도 나간다.'},
  mg_ult1:{cls:'mage',type:'ult',name:'헤븐 썬더',lv:3,desc:'궁극기. 하늘에 마법진을 열어 화면의 모든 적에게 번개를 쏟고, 거대한 번개 기둥으로 마무리한다.'},
  mg_ult2:{cls:'mage',type:'ult',name:'메테오 폴',lv:12,desc:'궁극기. 운석 비를 뿌린 뒤 거대한 운석 하나를 떨어뜨린다.'},
};
const order=Object.keys(sk);

function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); quick(true); const n=1+Math.floor((L('mg_basic')+1)/2), d=1300*A.mul('mg_basic');
  after(.13,()=>{ const J=pl.j, sx=J&&J.st?J.st[0]:pl.x+pl.f*60, sy=J&&J.st?J.st[1]:pl.gy-BODY*1.3;
    for(let k=0;k<n;k++) after(k*.07,()=>{ const b=a+(k-(n-1)/2)*.35, p={x:pl.x+Math.cos(b)*50,y:pl.gy+Math.sin(b)*50,vx:Math.cos(b)*1500,vy:Math.sin(b)*1500,life:1.4,d,r:70,home:e,turn:7,c:C1,v:{x:sx,y:sy},h:BODY*1.1};
      const M=VFX.mage_bolt; p.fx=M&&M.f[0].ok?vfx('mage_bolt',sx,sy,{follow:p.v,loop:true,life:1.4,sc:.55,rot:b}):null; p.spin=true;
      p.onHit=(e,p)=>{ gl0(p.x,p.y-BODY,90,C1,.2,{a:.8}); fring(p.x,p.y,500,C2,.25,3); };
      V.pj.push(p); });
    gl0(sx,sy,90,C1,.25); sfx('whoosh',1.8,.4); sfx('slash',1.7,.25); });
  return true; }

const SKILL={
  mg_bolt:{fn(id){ const T=onScreen(-80); if(!T.length) return false; const n=3+L(id)-1, d=D(id); quick(); sfx('thunder',.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.08+i*.07,()=>{ if(e.dead) return; zap(e.x,e.y); dmg(e,d,{stun:.4}); hitFx(e,C2,1.3);
      if(EVO(id)) after(.15,()=>{ fring(e.x,e.y,900,C2,.3,6); inCircle(e.x,e.y,160,o=>dmg(o,d*.5,{kb:.6,sx:e.x,sy:e.y})); }); })); }},
  mg_orb:{fn(id){ if(V.orbs.some(o=>o.mage)||!nearest(700)) return false; const n=EVO(id)?5:3, d=D(id); raise(); sfx('rise',.5,.4);
    for(let i=0;i<n;i++){ const o={mage:true,a:i/n*TAU,life:5,d,R:EVO(id)?330:270,w:3.4,hitR:85,c:C1,h:BODY*.8,rot:false,v:{x:pl.x,y:pl.gy-BODY}};
      const M=VFX.fx_mage_orb; o.fx=M&&M.f[0].ok?vfx('fx_mage_orb',o.v.x,o.v.y,{follow:o.v,loop:true,life:5,sc:150/M.h}):null; o.hit=e=>{ sfx('thunder',.15); }; V.orbs.push(o); } }},
  mg_chain:{fn(id){ let e=nearest(650); if(!e) return false; const d=D(id), n=6+L(id), J=pl.j; face(angTo(e)); quick(); sfx('thunder',.5);
    let px=J&&J.st?J.st[0]:pl.x, py=J&&J.st?J.st[1]:pl.gy-BODY, hit=new Set();
    const jump=(e,k,px,py)=>{ if(!e||k>=n) return; hit.add(e); const ex=e.x, ey=e.y-e.h*.5;
      add({k:'bolt',lines:genBolt(px,py,ex,ey,40,4,[]),life:.25,c:C2}); add({k:'bolt',lines:genBolt(px,py,ex,ey,60,2,[]),life:.2,c:C1}); gl0(ex,ey,90,C1,.2,{a:.9});
      dmg(e,d,{stun:.3,sx:px,sy:py+BODY}); hitFx(e,C2,1.2); sfx('slash',2,.2);
      const nx=V.en.filter(o=>!o.dead&&!hit.has(o)&&Math.hypot(o.x-e.x,o.y-e.y)<480).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y));
      after(.06,()=>{ jump(nx[0],k+1,ex,ey); if(EVO(id)&&nx[1]&&k%2===0) jump(nx[1],k+2,ex,ey); }); };
    after(.12,()=>jump(e,0,px,py)); }},
  mg_nova:{fn(id){ const R=EVO(id)?560:400; if(countIn(R)<3&&!nearest(260)) return false; const d=D(id); raise(); sfx('shatter',.8);
    after(.12,()=>{ const M=VFX.fx_mage_nova; if(M&&M.f[0].ok) vfx('fx_mage_nova',pl.x,pl.gy-20,{sc:R*2.3/M.w,wy:FSY,a:1});
      fring(pl.x,pl.gy,R*5,'#9ff7ff',.45,9); fring(pl.x,pl.gy,R*3,'#ffffff',.3,4); gl0(pl.x,pl.gy-BODY*.5,R,'#9ff7ff',.3,{a:.7}); trauma=Math.min(1,trauma+.35);
      inCircle(pl.x,pl.gy,R,e=>{ dmg(e,d,{kb:.9,stun:.8,slow:2.5,big:true}); hitFx(e,'#9ff7ff',1.2); });
      burst(pl.x,pl.gy,14,{c:'#bff4ff',s0:400,s1:1100,size:14}); }); }},
  mg_vortex:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?420:330, pull=EVO(id)?520:360; face(angTo(t)); raise(); sfx('rise',.6,.5);
    const M=VFX.fx_mage_vortex, f=M&&M.f[0].ok?vfx('fx_mage_vortex',x,y,{loop:true,life:2.6,sc:R*2.2/M.w,wy:FSY,a:.95}):null;
    V.zones.push({x,y,r:R,life:2.5,tick:.12,fx:f,fn:(e)=>{ e.pull={x,y,s:pull}; if(Math.random()<.4) dmg(e,d,{kb:0,stun:.15}); },
      onTick:z=>{ for(let i=0;i<3;i++){ const a=rand(0,TAU), r=rand(R*.6,R*1.2); gl0(x+Math.cos(a)*r,y+Math.sin(a)*r*.75,rand(6,12),C1,.5,{tx:x,ty:y}); } },
      onEnd:()=>{ fring(x,y,R*5,C1,.5,10); gl0(x,y-60,R,C2,.3,{a:.9}); trauma=Math.min(1,trauma+.4); sfx('boom',1.2,.8); burst(x,y,16,{c:C1});
        inCircle(x,y,R,e=>{ dmg(e,d*(EVO(id)?12:8),{kb:1.6,launch:900,big:true,sx:x,sy:y}); hitFx(e,C1,1.4); }); }}); }},
  mg_field:{fn(id){ if(V.zones.some(z=>z.field)||!nearest(450)) return false; const d=D(id), R=EVO(id)?420:330; raise(); sfx('thunder',.4);
    const M=VFX.fx_mage_field, v={x:pl.x,y:pl.gy}, f=M&&M.f[0].ok?vfx('fx_mage_field',v.x,v.y,{follow:v,loop:true,life:5,sc:R*2.2/M.w,wy:FSY,a:.95}):null;
    V.zones.push({field:true,follow:true,r:R,life:5,tick:.4,fx:f,v,h:0,fn:e=>{ dmg(e,d,{kb:.2,stun:.2}); hitFx(e,C2,.9); },
      onTick:z=>{ if(EVO(id)){ const T=V.en.filter(e=>!e.dead&&Math.hypot(e.x-z.x,e.y-z.y)<R); const e=T[(Math.random()*T.length)|0]; if(e){ zap(e.x,e.y,C2,.7); dmg(e,d*2,{stun:.3}); } } sfx('thunder',.12); }}); }},
  mg_star:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?10:6, d=D(id); raise(); sfx('rise',.8,.5);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x+rand(-40,40), y=e.y+rand(-30,30), at=.25+i*.12;
      const hitAt=dropFx('fx_mage_star',x,y,720,at,{shadow:170})??at; after(Math.max(0,hitAt-.45),()=>ring(x,y,-700,C1,.45,{r0:260,w:4,sy:FSY,dec:1})); after(Math.max(0,hitAt-.16),()=>add({k:'line',x1:x+200,y1:y-1100,x2:x,y2:y-30,life:.26,c:'#fff4c0',w:18,grow:true}));
      after(hitAt,()=>{ fring(x,y,900,C1,.35,6); gl0(x,y-40,160,C2,.2,{a:.9}); light(x,y-100,600,C1,.25,.4); gl0(x,y-60,110,'#fff4c0',.15,{a:1}); sfx('boom',.8,.5); burst(x,y,6,{c:'#ffe7a0'});
        inCircle(x,y,190,o=>{ dmg(o,d,{kb:1,launch:600,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); }); }},
  mg_beam:{fn(id){ const e=nearest(700); if(!e) return false; const d=D(id), a0=angTo(e), n=EVO(id)?2:1, Lb=950, dir=Math.random()<.5?1:-1; face(a0);
    S([['gb05',.05],['gb07',1.5,{kick:[1.2,-1]}],['gb10',.1],['gb12',.06]]); sfx('rise',.9,.5);
    const M=VFX.fist_beam, segs=[]; let t=0;
    const tick=()=>{ t+=.05; if(t>1.55||G_over()){ segs.forEach(s=>s.life=0); return; } const a=a0+dir*TAU*Math.min(1,t/1.5);
      for(let k=0;k<n;k++){ const b=a+k*Math.PI, x1=pl.x+Math.cos(b)*Lb, y1=pl.gy+Math.sin(b)*Lb;
        add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x1,y2:y1-BODY,life:.08,c:C1,w:46}); add({k:'line',x1:pl.x,y1:pl.gy-BODY,x2:x1,y2:y1-BODY,life:.08,c:'#ffffff',w:12});
        if(M&&M.f[0].ok&&Math.random()<.7) vfx('fist_beam',(pl.x+x1)/2,(pl.gy+y1)/2-BODY,{sc:Lb/M.w,sy:.6,rot:b,hue:80,life:.1,a:.9});
        gl0(x1,y1-BODY,rand(40,80),C2,.15,{a:.8});
        inLine(pl.x,pl.gy,x1,y1,55,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.15; dmg(o,d,{kb:.5,stun:.2}); hitFx(o,C2,1); }); }
      after(.05,tick); };
    after(.08,tick); }},
};
const G_over=()=>V.over||RPG.mode!=='surv';

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js, drawn by gfx.js)
const VIO='#9a6bff', EMB='#ff7a2a', ICE='#d8f4ff';
// HEAVEN THUNDER: a storm ceiling closes over the field and a ring of light opens in it. Every enemy is marked from her staff;
// then the ceiling answers each mark in turn, and last of all one pillar that the whole field arcs from.
function ultThunder(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, x0=pl.x, y0=pl.gy, {hw,hh}=view(), Dm=60000*A.mul(id), ZC=2700;
  const TV=Cn.tone(VIO,{c2:'#1c0a5a',c3:'#ffffff'});
  S([['gx03',.12],['gx04',.3],['gx06',2.2],['gx08',.12,{kick:[1.2,-1]}],['gx10',2],['gx13',.8],['gx14',9]]);
  K.ambient(.36,.38,.6,3); Cn.zoom(1.35); Cn.cam(x0,y0-BODY*1.2,5); SFX.thunder(.35); Cn.drone(46,.3); duck(.3,.6);
  // the ceiling: slabs of cloud sliding in over the camera, and the ring of light in them
  for(let i=0;i<14;i++){ const a=i/14*TAU, r=rand(.5,1.5)*hw; X.cine.gArt('fx2_cloud',x0+Math.cos(a)*r*2.2,y0+Math.sin(a)*r*1.5,'#2e2658',{c2:'#090618',c3:'#5d4fa6',z:ZC+rand(-200,300),w:rand(900,1400),h:rand(330,480),life:5.2,hold:.86,boil:.006,fps:6,a:.9,L:4,delay:rand(0,.7),flipX:i%2===0,at:(k,t)=>[x0+Math.cos(a)*r*(2.2-.6*Math.min(1,t/1.6)),y0+Math.sin(a)*r*(1.5-.4*Math.min(1,t/1.6)),ZC+(i%3)*160]}); }
  Cn.gCircle('fx_circle_arcane',x0,y0,{c:VIO,r:50,life:4.6,tick:(s,t)=>{ s.r=lerp(50,hw*.55,easeOut(Math.min(1,t/1.2))); s.rot=-t*.5; s.a=t>3.9?Math.max(0,1-(t-3.9)/.6):.9; }});
  Cn.gCircle('fx_circle_arcane',x0,y0,{c:ICE,r:100,z:ZC,L:4,life:5.2,delay:.3,tick:(s,t)=>{ s.r=lerp(200,hw*1.9,easeOut(Math.min(1,t/1.3))); s.rot=t*.25; s.a=(t>4.5?Math.max(0,1-(t-4.5)/.6):Math.min(1,t/.5))*.55; }});
  Cn.gather(x0,y0-BODY*2,{c:VIO,dur:.9,r:900,n:30,cs:[VIO,'#ffffff',C2],fy:y0,rings:0,streaks:0});
  // heat lightning in the ceiling: the whole field is lit for a frame
  let fl=RT+.5; K.add(4.2,()=>{ if(RT>=fl){ fl=RT+rand(.3,.75); const x=x0+rand(-hw,hw), y=y0+rand(-hh,hh)*.6; K.light(x,y,2600,'#b9a8ff',.5,.18,{z:ZC}); Cn.gBolt(x,y,ZC,x+rand(-700,700),y+rand(-200,200),ZC-rand(0,200),ICE,{c2:'#1c0a5a',w:14,life:.14,forks:1,L:4}); } });
  // the marks: a thread from the staff to each, a ring that closes on it
  const T=onScreen(120).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)).slice(0,30), stM=Cn.gst(2,'add',TV,0);
  after(1.25,()=>{ Cn.zoom(.9); Cn.cam(null); Cn.roll(-.03); });
  T.forEach((e,i)=>after(1.3+i*(.8/Math.max(1,T.length)),()=>{ if(e.dead) return; e.mark=RT; Cn.SND.tick(.8+i*.03,.16); e.flash=.6;
    Cn.gBolt(x0+pl.f*30,y0,BODY*1.9,e.x,e.y,e.h*.5,VIO,{c2:'#1c0a5a',w:9,life:.16,forks:0,jag:.05}); Cn.gRing(e.x,e.y,190,VIO,{c2:'#1c0a5a',c3:'#cdb8ff',inward:true,life:.3,w:.06,jag:.04,a:.6}); }));
  K.add(2.6,()=>{ for(const e of T){ if(e.dead||!e.mark) continue; const k=Math.min(1,(RT-e.mark)/.2); if(Math.random()<.16*k){ const a=rand(0,TAU); Cn.gBolt(e.x,e.y,8,e.x+Math.cos(a)*rand(70,150),e.y+Math.sin(a)*rand(40,90),8,VIO,{c2:'#1c0a5a',c3:'#efe6ff',w:6,life:.1,forks:0,jag:.2,seg:40}); } K.floor(K.st(8,'add',{L:0}),e.x,e.y,90,null,0,TV.c,.3*k*(.6+.4*Math.sin(RT*22+e.x))); } },1.3);
  // release: the staff comes down; the ceiling answers every mark, one after another, faster
  after(2.36,()=>Cn.impact(x0,y0-BODY,{style:'bolt',c:VIO,n:2,soft:true,flash:.06,blur:.03,v:.5,then:()=>{ Cn.roll(.03); Cn.zoom(.84); K.ambient(.44,.42,.66,6); Cn.gRing(x0,y0,hw*1.5,VIO,{c2:'#1c0a5a',life:.5,w:.07,jag:.08}); K.ripple(x0,y0,hw*1.5,{life:.5,s:.6}); }}));
  T.forEach((e,i)=>after(2.5+Math.pow(i/Math.max(1,T.length),.75)*1.15,()=>{ if(e.dead) return; const sx=e.x+rand(-260,260), sy=e.y+rand(-80,80);
    Cn.gBolt(sx,sy,ZC,e.x,e.y,0,VIO,{c2:'#1c0a5a',c3:'#efe6ff',w:22,life:.22,forks:2}); Cn.gStar(e.x,e.y,e.h*.4,rand(150,230),ICE,{c2:VIO,life:.16,n:5}); Cn.gCrack(e.x,e.y,230,VIO,{c2:'#1c0a5a',life:1,n:7,w:.16});
    Cn.gSparks(e.x,e.y,30,5,ICE,{vz:1300,s0:200,s1:800}); K.light(e.x,e.y,900,'#b9a8ff',1.3,.22); ultHit(e,Dm*.4,e.x,e.y+200);
    if(i%4===0){ sfx('thunder',.5); Cn.shake(.45); Cn.scar({kind:'burn',x:e.x,y:e.y,r:150,c:VIO,life:6,heat:1.6}); Cn.gPuff(e.x,e.y,20,rand(60,100),{vz:rand(120,240),life:1,a:.6}); } }));
  // climax: the ring in the ceiling closes to a point over the thickest of them - and lets everything go at once
  const tb=densest(1400), [bx,by]=X.inView(tb?tb.x:x0,tb?tb.y:y0-hh*.25,.4);
  after(3.75,()=>{ Cn.roll(0); Cn.cam(bx,by-BODY,6); Cn.zoom(.8); K.ambient(.24,.24,.44,5); Cn.SND.inhale(.6,.6); duck(.25,.5);
    K.add(.62,k=>K.floor(K.st(12,'alpha',{L:0}),bx,by,300+500*k,null,0,[0,0,0],.3+.45*k)); Cn.gRing(bx,by,700,ICE,{c2:VIO,inward:true,life:.6,w:.06,jag:.04}); Cn.gSpeed(.6,ICE,{c2:VIO,a:.22,x:bx,y:by,r:.5,n:60,w:.1}); });
  after(4.37,()=>Cn.impact(bx,by-80,{style:'bolt',c:VIO,n:2,r:.14,soft:true,flash:.1,blur:.06,then:()=>{ K.ambient(.5,.46,.7,10); after(.6,()=>K.ambient(1,1,1,2)); for(const d of Cn.drones) d.stop(.05);
      // the pillar: a solid core, three strokes wound round it, re-struck twice
      const stC=Cn.gst(3,'add',Cn.tone(ICE,{c2:VIO,c3:'#ffffff'}),3); K.add(.75,k=>{ K.line(stC,bx,by,0,bx,by,ZC+600,(190+40*Math.sin(RT*60))*(1-k*k),K.rgb(ICE),1-k*k,k*.4,RT*6,-2,.3); });
      for(let i=0;i<5;i++) Cn.gBolt(bx+rand(-380,380),by+rand(-60,60),ZC,bx+rand(-60,60),by,0,VIO,{c2:'#1c0a5a',c3:'#efe6ff',w:40,life:.5,forks:3,delay:i*.07,jag:.1});
      for(let i=0;i<14;i++){ const a=i/14*TAU+rand(-.15,.15), r=hw*rand(.9,1.7); Cn.gBolt(bx,by,14,bx+Math.cos(a)*r,by+Math.sin(a)*r*FSY,14,VIO,{c2:'#1c0a5a',c3:'#efe6ff',w:26,life:.5,forks:3,jag:.12,delay:rand(0,.12)}); after(.3,()=>Cn.scar({kind:'gash',x:bx+Math.cos(a)*r*.5,y:by+Math.sin(a)*r*.5*FSY,rot:Math.atan2(Math.sin(a)*FSY,Math.cos(a)),len:r,w:120,c:VIO,life:6,heat:2.4})); }
      K.ripple(bx,by,hw*2.1,{life:.7,s:1}); Cn.gCrack(bx,by,hw*1.4,VIO,{c2:'#1c0a5a',c3:ICE,life:3,n:19,w:.09}); Cn.scar({x:bx,y:by,r:760,c:VIO,life:9,heat:3.2});
      Cn.gDebris(bx,by,26,{s0:300,s1:1400,vz:2100,size:30}); K.light(bx,by,2600,'#b9a8ff',1.4,.9,{flick:.4}); SFX.thunder(1.3); Cn.shake(1.2);
      // it jumps from body to body before they fall
      const L=onScreen(200).slice(0,20); for(let i=0;i<L.length;i++){ const a=i?L[i-1]:{x:bx,y:by,h:200}, b=L[i]; Cn.gBolt(a.x,a.y,(a.h||200)*.5,b.x,b.y,b.h*.5,i%2?VIO:ICE,{c2:'#1c0a5a',w:16,life:.3,forks:1,delay:.05+i*.012}); }
      Cn.sweep(bx,by,Dm,{speed:3600}); Cn.gMotes(bx,by,hw,VIO,60,{dur:1.6,life:2,white:.5}); }}));
  // afterglow: the floor keeps arcing along the fractures
  for(let i=0;i<14;i++) after(4.8+i*.09,()=>{ const a=rand(0,TAU), r=rand(80,620), x=bx+Math.cos(a)*r, y=by+Math.sin(a)*r*FSY; Cn.gBolt(x,y,10,x+rand(-240,240),y+rand(-110,110),10,ICE,{c2:VIO,w:9,life:.16,forks:1,jag:.2}); if(i%3===0) Cn.SND.tick(2+Math.random(),.08); });
  after(5.5,()=>{ Cn.zoom(1); Cn.cam(null); });
  after(6.1,ultStop); }

// METEOR FALL: she points, and a shadow starts to grow on the floor. Small ones first, to show how far there is to fall;
// then the one that has been coming the whole time crosses the screen above the camera and the ground does not forget it.
function ultMeteor(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.4), x0=pl.x, y0=pl.gy;
  const ms=spr('meteor'), TE=Cn.tone(EMB,{c2:'#6a1000',c3:'#fff2b0'}), HOT='#ffd08a';
  S([['gy03',.14],['gy05',.5],['gy06',1.5],['gy07',1.2],['gy09',.14,{kick:[1.2,-1]}],['gy10',.6],['gy13',.9],['gy14',9]]);
  K.ambient(.5,.4,.42,3); Cn.zoom(1.3); Cn.cam(x0,y0-BODY*1.4,5); SFX.rumble(1.6); Cn.drone(40,.3); duck(.3,.6);
  Cn.gCircle('fx_circle_arcane',cx,cy,{c:EMB,r:30,life:3.5,tick:(s,t)=>{ s.r=lerp(30,640,easeOut(Math.min(1,t/1.3))); s.rot=t*1.1; s.a=t>3?Math.max(0,1-(t-3)/.4):.85; }});
  Cn.gather(x0,y0-BODY*2,{c:EMB,dur:.9,r:900,n:30,cs:[EMB,HOT,'#ffffff'],fy:y0,rings:0,streaks:0});
  const drop=Cn.gLevitate(cx,cy,820,24,{dur:1.6,life:5,c:'#6a5a58'});
  // a small one: comes in on the same slant as the big one will
  const SL=[hw*1.5,-hh*.5], small=(x,y,dl)=>{ const land=()=>{ Cn.gFire(x,y,10,150,{n:7}); Cn.gStar(x,y,40,260,EMB,{c2:'#6a1000',c3:'#fff2b0',life:.2,n:6}); Cn.gRing(x,y,420,EMB,{c2:'#6a1000',life:.35,w:.12,jag:.1}); Cn.gCrack(x,y,300,EMB,{c2:'#6a1000',life:1.6,n:8,w:.15});
      Cn.gDebris(x,y,6,{s0:200,s1:700,vz:1300,size:20}); K.light(x,y,900,EMB,1.1,.35); sfx('boom',.8,.4); Cn.shake(.4); Cn.scar({kind:'burn',x,y,r:170,c:EMB,life:6,heat:2}); inCircle(x,y,220,o=>ultHit(o,Dm*.3,x,y)); };
    if(ms) Cn.gDrop(x,y,{img:ms.im,h:230,w:230*ms.w/ms.h,z0:3400,dur:.42,dx:SL[0]*.45,dy:SL[1]*.45,spin:6,trail:EMB,tw:.5,tl:5,delay:dl,land,sink:.5,pz:.0005}); else after(dl+.42,land); };
  // release: the camera lets go of her; the field is shown the size of the shadow
  after(1.5,()=>Cn.impact(x0,y0-BODY,{style:'ember',c:EMB,n:2,soft:true,flash:.06,blur:.03,v:.5,then:()=>{ Cn.zoom(.8); Cn.cam(lerp(x0,cx,.7),lerp(y0,cy,.7)-hh*.2,3.2); K.ambient(.42,.3,.3,3); SFX.fire(1.7,.7); Cn.SND.inhale(1.7,.7);
      K.add(1.75,k=>K.floor(K.st(12,'alpha',{L:0}),cx,cy,200+760*k*k,null,0,[0,0,0],.2+.6*k)); Cn.gSpeed(1.7,HOT,{c2:EMB,a:.18,x:cx,y:cy,r:.55,n:60,w:.1}); }}));
  for(let i=0;i<8;i++) small(cx+rand(-hw,hw)*.95,cy+rand(-hh,hh)*.7,1.62+i*.15);
  // the big one: a rock the size of the screen at first (it is level with the camera), dragging fire, shrinking onto its shadow
  const BH=880, stT=Cn.gst(3,'add',TE,2); let lastP=0;
  if(ms) Cn.gDrop(cx,cy,{img:ms.im,h:BH,w:BH*ms.w/ms.h,z0:6200,dur:1.5,dx:SL[0],dy:SL[1],spin:1.4,delay:1.78,sink:.5,pz:.00042,L:3,trail:EMB,tw:.62,tl:4.2,
    tick:(x,y,z,q)=>{ const sc=1+z*.00042; K.bill(K.st(8,'add',{L:2}),x,y,z+BH*.5,BH*1.5*sc,BH*1.5*sc,0,TE.c,.55); K.light(cx,cy,1500+1500*q,EMB,.5+q*.9,.1);
      if(RT-lastP>.03){ lastP=RT; Cn.gPuff(x+rand(-1,1)*BH*.3*sc,y,z+BH*sc*rand(.6,1.1),BH*rand(.3,.55)*sc,{c:EMB,c2:'#6a1000',c3:'#fff2b0',add:true,vx:SL[0]*.25,vy:SL[1]*.25,vz:rand(300,900),life:rand(.4,.7),a:.9,rise:1.5,L:2}); trauma=Math.max(trauma,.1+q*.45); } }});
  after(2.9,()=>{ Cn.cam(cx,cy-BODY,8); Cn.zoom(.86); });
  // climax
  after(3.28,()=>Cn.impact(cx,cy-100,{style:'ember',c:EMB,n:2,r:.15,soft:true,flash:.12,blur:.07,then:()=>{ for(const d of Cn.drones) d.stop(.05); K.ambient(.62,.4,.3,10); after(.9,()=>K.ambient(1,1,1,1.6)); drop(1600);
      Cn.gStar(cx,cy,80,980,EMB,{c2:'#6a1000',c3:'#ffffff',life:.4,n:9}); for(let i=0;i<4;i++) Cn.gRing(cx,cy,hw*(1.1+i*.45),i%2?HOT:EMB,{c2:'#6a1000',life:.55+i*.12,w:.14-i*.03,jag:.11,delay:i*.06});
      K.ripple(cx,cy,hw*2.3,{life:.8,s:1.1}); Cn.gCrack(cx,cy,hw*1.5,EMB,{c2:'#6a1000',c3:'#fff2b0',life:4,n:17,w:.11}); Cn.scar({x:cx,y:cy,r:860,c:EMB,life:10,heat:4.5}); Cn.scar({kind:'burn',x:cx,y:cy,r:620,c:EMB,life:10,heat:4});
      Cn.gFire(cx,cy,20,520,{n:22,life:1.1,sp:900}); { const sa=Math.atan2(-SL[1],-SL[0]); Cn.gSkid(cx,cy,sa,hw*1.5,EMB,{c2:'#6a1000',c3:'#fff2b0',w:230,life:6,heat:3.4}); Cn.gDebris(cx,cy,14,{dir:sa,spread:.5,s0:700,s1:2200,vz:1500,size:34,c:'#5a4844'}); } for(let i=0;i<10;i++){ const a=i/10*TAU; after(.05,()=>Cn.gFire(cx+Math.cos(a)*420,cy+Math.sin(a)*420*FSY,10,260,{n:5,life:.9})); }
      Cn.gDebris(cx,cy,34,{s0:400,s1:1700,vz:2400,size:36,c:'#5a4844'}); Cn.gDebris(cx,cy,14,{r:320,s0:100,s1:600,v0:1700,vz:3800,sz0:44,size:110,g:2600,c:'#5a4844'});
      K.light(cx,cy,2800,EMB,1.5,1.2); Cn.sweep(cx,cy,Dm,{speed:3000,push:1.3}); SFX.shatter(1); Cn.shake(1.4);
      // the ground keeps going off further and further out
      for(let r=1;r<=2;r++) after(r*.22,()=>{ const n=5+r*3, rr=r*470; for(let i=0;i<n;i++){ const a=i/n*TAU+r, x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*.75; Cn.gFire(x,y,10,200,{n:5}); Cn.gBeam(x,y,900,90,EMB,{c2:'#6a1000',c3:'#fff2b0',life:.4}); Cn.gRing(x,y,380,EMB,{c2:'#6a1000',life:.3,w:.12}); } sfx('boom',1.2,.6); Cn.shake(.6); }); }}));
  // afterglow: a column of smoke over a crater that is still molten, ash coming down
  after(3.8,()=>{ for(let i=0;i<18;i++) after(i*.07,()=>Cn.gPuff(cx+rand(-300,300),cy+rand(-120,120),rand(40,300),rand(160,300),{c:'#2a2026',c2:'#08060a',c3:'#5a484a',vz:rand(260,620),life:rand(1.6,2.6),a:.85,grow:160})); Cn.gMotes(cx,cy,hw,EMB,70,{dur:2,life:2.4}); Cn.gMotes(cx,cy,hw*1.2,'#8a7a78',50,{fall:true,dur:1.6,life:2.6,m:11,s0:3,s1:7,white:0}); });
  after(4.5,()=>{ Cn.zoom(1); Cn.cam(null); });
  after(5.3,ultStop); }

X.reg('mage',{sk,order,basic:{fn:basic,cd:()=>.85*(1-.05*(L('mg_basic')-1))},skills:SKILL,ults:{mg_ult1:ultThunder,mg_ult2:ultMeteor}});
})();
