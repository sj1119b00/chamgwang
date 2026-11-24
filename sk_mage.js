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

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const VIO='#a070ff', EMB='#ff7a2a';
// a painted bolt from far above down to a floor point, flickering for a few frames
function skyBolt(x,y,w,life,c){ const Cn=X.cine, flip=Math.random()<.5?-1:1; X.draw(life,k=>{ const t=Cn.tex('fx_lightning',c); if(!t) return; const h=w*1.5, a=(1-k)*(Math.random()<.25?.45:1); fx.save(); fx.translate(x,y+h*.03); fx.scale(flip*(k<.5?1:-1),1); fx.globalAlpha=a; fx.drawImage(t,-w/2,-h,w,h); fx.globalAlpha=a*.7; fx.drawImage(Cn.img('fx_lightning').im,-w/2,-h,w,h); fx.restore(); fx.globalAlpha=1; }); }
// HEAVEN THUNDER: the sky is marked first - a reticle closes on every enemy - then it comes down on each mark in turn, and last of all on the whole field.
function ultThunder(id){ ultStart(id); const Cn=X.cine, x0=pl.x, y0=pl.gy, {hw,hh}=view(), R=Math.max(hw,hh)*1.05, Dm=60000*A.mul(id);
  S([['gx03',.12],['gx04',.3],['gx06',2.3],['gx08',.12,{kick:[1.2,-1]}],['gx10',2],['gx13',.8],['gx14',9]]);
  Cn.setDark(.82,{c:'6,3,20',spot:{x:x0,y:y0-BODY*.5,r:900,a:.3}}); Cn.zoom(1.3); Cn.cam(x0,y0-BODY*1.2,5); SFX.thunder(.35); Cn.drone(46,.3); Cn.storm(5.2,VIO);
  const circ=Cn.floorTex('fx_circle_arcane',x0,y0,50,{c:VIO,spin:-.5,a:.95,life:7}); circ.core=.3;
  let t=0, fl=1.1; V.ultTick=dt=>{ t+=dt; circ.r=lerp(50,hw*.5,easeOut(Math.min(1,t/1.2))); circ.a=t>3.9?Math.max(0,.95-(t-3.9)*2.4):.95;
    // heat lightning: the dark lifts for a frame now and then
    fl-=dt; if(fl<=0&&t<4.2){ fl=rand(.35,.8); Cn.dark=Math.max(0,Cn.dark-.3); Cn.wash('190,170,255',.07); } };
  Cn.gather(x0,y0-BODY*2,{c:VIO,dur:.9,r:900,n:40,cs:[VIO,'#ffffff',C2],fy:y0});
  // the marks
  const T=onScreen(120).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0)).slice(0,32);
  after(1.8,()=>{ Cn.zoom(.9); Cn.cam(null); Cn.setDark(.86,{spot:null}); Cn.roll(-.03); });
  after(2.76,()=>{ Cn.roll(.03); Cn.zoom(.84); });
  T.forEach((e,i)=>after(1.85+i*(.75/Math.max(1,T.length)),()=>{ if(e.dead) return; ring(e.x,e.y,-900,VIO,.3,{r0:300,w:5,dec:1,sy:FSY}); e.mark=RT; Cn.SND.tick(.8+i*.03,.16); add({k:'bolt',lines:genBolt(x0,y0-20,e.x,e.y-20,70,3,[]),life:.22,c:i%2?C1:C2}); e.flash=.6; }));
  X.draw(2.4,()=>{ for(const e of T){ if(e.dead||!e.mark) continue; const k=Math.min(1,(RT-e.mark)/.25), r=(110-40*k)*(1+.06*Math.sin(RT*20)); fx.strokeStyle=hexA('#ffffff',.9*k); fx.lineWidth=3; fx.beginPath(); fx.ellipse(e.x,e.y,r,r*FSY,0,0,TAU); fx.stroke();
      fx.strokeStyle=hexA(VIO,k); fx.lineWidth=7; for(let q=0;q<4;q++){ const a=q*Math.PI/2+RT*2; fx.beginPath(); fx.ellipse(e.x,e.y,r*1.25,r*1.25*FSY,0,a,a+.5); fx.stroke(); } } },1.85);
  // release: the staff comes down and every mark is answered, one after another
  after(2.76,()=>{ Cn.release(x0,y0,VIO); Cn.speed(1.1,{c:C2,a:.22,n:18}); });
  T.forEach((e,i)=>after(2.86+i*(1.0/Math.max(1,T.length)),()=>{ if(e.dead) return; skyBolt(e.x,e.y,440,.24,i%2?VIO:'#ffffff'); add({k:'bolt',lines:genBolt(e.x+rand(-140,140),e.y-1100,e.x,e.y-20,90,5,[]),life:.26,c:i%2?C1:C2}); fring(e.x,e.y,760,VIO,.3,5); gl0(e.x,e.y-40,130,C2,.16,{a:.6}); light(e.x,e.y-200,520,VIO,.2,.35); ultHit(e,Dm*.4,e.x,e.y+200); Cn.dark=Math.max(.25,Cn.dark-.35);
    if(i%4===0){ sfx('thunder',.5); Cn.shake(.45); Cn.scar({kind:'burn',x:e.x,y:e.y,r:150,c:VIO,life:6,heat:1.6}); } }));
  // climax: the pillar
  const tb=densest(1400), [bx,by]=X.inView(tb?tb.x:x0,tb?tb.y:y0-hh*.25,.4);
  after(3.95,()=>{ Cn.roll(0); Cn.cam(bx,by-BODY,7); Cn.omen(bx,by,520,VIO,.6); V.shadow={x:bx,y:by,t0:RT,dur:.6,r:480,c:VIO}; Cn.zoom(.82); Cn.setDark(.94,{spot:{x:bx,y:by,r:800,a:.35}}); Cn.SND.inhale(.6,.6); duck(.25,.5); });
  after(4.55,()=>{ V.shadow=null; Cn.impact(bx,by-80,{style:'bolt',c:VIO,n:3,r:.14,then:()=>{ skyBolt(bx,by,1700,.75,VIO); skyBolt(bx,by,1100,.6,'#ffffff'); after(.12,()=>skyBolt(bx+rand(-120,120),by,1400,.5,C1)); after(.26,()=>skyBolt(bx+rand(-160,160),by,1200,.45,VIO));
      Cn.waves(bx,by,VIO,{n:3,s:1.1,dc:'40,30,70'}); Cn.scar({x:bx,y:by,r:760,c:VIO,life:9,heat:3.2}); Cn.wash('210,190,255',.22,0,bx,by); SFX.thunder(1.3);
      // it jumps from body to body before they fall
      const L=onScreen(200).slice(0,22); for(let i=0;i<L.length;i++){ const a=i?L[i-1]:{x:bx,y:by}, b=L[i]; add({k:'bolt',lines:genBolt(a.x,a.y-BODY*.5,b.x,b.y-BODY*.5,60,4,[]),life:.3,c:i%2?C1:'#ffffff'}); }
      Cn.sweep(bx,by,Dm,{speed:3600}); Cn.setDark(.35,{spot:null}); Cn.ashFall(2.6,'#cdb8ff',30,{glow:true,up:true}); }}); });
  // afterglow: the floor keeps arcing
  for(let i=0;i<16;i++) after(4.9+i*.09,()=>{ const a=rand(0,TAU), r=rand(80,560), x=bx+Math.cos(a)*r, y=by+Math.sin(a)*r*FSY; add({k:'bolt',lines:genBolt(x,y,x+rand(-180,180),y+rand(-80,80),40,2.5,[]),life:.16,c:C2}); if(i%3===0) Cn.SND.tick(2+Math.random(),.08); });
  after(5.6,()=>{ Cn.setDark(0); Cn.zoom(1); Cn.embers(bx,by,600,VIO,{n:30,dur:1.2}); });
  after(6.25,ultStop); }

// METEOR FALL: she looks up, and so does the camera - it is already coming. It crosses the whole sky before it lands, and the land does not forget it.
function ultMeteor(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.4), x0=pl.x, y0=pl.gy;
  S([['gy03',.14],['gy05',.5],['gy06',1.6],['gy07',1.3],['gy09',.14,{kick:[1.2,-1]}],['gy10',.6],['gy13',.9],['gy14',9]]);
  Cn.setDark(.72,{c:'26,5,2',spot:{x:x0,y:y0-BODY*.5,r:900,a:.3}}); Cn.zoom(1.25); Cn.cam(x0,y0-BODY*1.6,5); SFX.rumble(1.6); Cn.drone(40,.3);
  const circ=Cn.floorTex('fx_circle_arcane',cx,cy,30,{c:EMB,spin:1.2,a:.9,life:4}); circ.core=.2;
  const ms=spr('meteor'), M={x:cx+hw*1.5,y:cy-hh*2.6,r:150,on:false,k:0}; let t=0;
  V.ultTick=dt=>{ t+=dt; circ.r=lerp(30,560,easeOut(Math.min(1,t/1.2))); if(t>3.5) circ.kill();
    if(t>1.9&&t<3.55){ const k=Math.min(1,(t-1.9)/1.6), e=k*k*k; M.on=true; M.k=k; M.x=lerp(cx+hw*1.5,cx,e); M.y=lerp(cy-hh*2.6,cy-140,e); M.r=lerp(200,520,k);
      trauma=Math.max(trauma,.12+k*.5); if(Math.random()<.9) fire({x:M.x+M.r*.5,y:M.y-M.r*.9,x2:M.x+M.r*2.4,y2:M.y-M.r*4,r:M.r*.7,r2:M.r*.2,i:1.2,type:1,life:.3,fin:.03,fade:.25});
      if(Math.random()<.5) smoke(M.x+rand(-M.r,M.r)*.5+M.r,M.y-M.r*1.6,M.r*.5,{vx:rand(100,300),vy:rand(-500,-200),a:.4,life:rand(.8,1.4),grow:M.r*.5,c:'40,20,14'}); } else M.on=false; };
  V.ultDraw=()=>{ if(!M.on) return; const d=M.r*2.2, ang=Math.atan2(cy-(cy-hh*2.6),cx-(cx+hw*1.5));
    glow(fx,M.x,M.y,M.r*3,EMB,.55); glow(fx,M.x,M.y,M.r*1.5,'#fff0c0',.5);
    // the trail it drags across the sky
    fx.save(); fx.translate(M.x,M.y); fx.rotate(ang+Math.PI); const g=fx.createLinearGradient(0,0,M.r*9,0); g.addColorStop(0,hexA('#ffe0a0',.8)); g.addColorStop(.3,hexA(EMB,.5)); g.addColorStop(1,hexA('#ff3a10',0)); fx.fillStyle=g; fx.beginPath(); fx.moveTo(0,-M.r*.95); fx.lineTo(M.r*9,-M.r*.2); fx.lineTo(M.r*9,M.r*.2); fx.lineTo(0,M.r*.95); fx.fill(); fx.restore();
    if(ms){ ctx.save(); ctx.translate(M.x,M.y); ctx.rotate(ang+RT*.6); ctx.drawImage(ms.im,-d/2,-d/2*ms.h/ms.w,d,d*ms.h/ms.w); ctx.restore(); } else { ctx.fillStyle='#2a1810'; ctx.beginPath(); ctx.arc(M.x,M.y,M.r,0,TAU); ctx.fill(); }
    fx.strokeStyle=hexA('#fff0c0',.8); fx.lineWidth=M.r*.08; fx.beginPath(); fx.arc(M.x,M.y,M.r*1.05,ang-1.1,ang+1.1); fx.stroke(); };
  Cn.gather(x0,y0-BODY*2,{c:EMB,dur:.9,r:900,n:36,cs:[EMB,'#ffd28a','#ffffff'],fy:y0});
  // release: the camera lets go of her and takes in the sky
  after(1.85,()=>{ Cn.zoom(.78); Cn.cam(lerp(x0,cx,.6),lerp(y0,cy,.6)-hh*.5,3.5); Cn.setDark(.8,{spot:{x:cx,y:cy,r:1000,a:.4}}); Cn.omen(cx,cy,640,EMB,1.65); circ.kill(); SFX.fire(1.7,.7); Cn.SND.inhale(1.65,.7); Cn.speed(1.6,{c:'#ffb070',a:.22,n:16,x:cx,y:cy-200}); });
  for(let i=0;i<7;i++) after(2+i*.17,()=>{ const x=cx+rand(-hw,hw)*.9, y=cy+rand(-hh,hh)*.7, at=.12; add({k:'line',x1:x+500,y1:y-1400,x2:x,y2:y-30,life:.14,c:'#ffb070',w:16}); after(at,()=>{ const P=VFX.pyro_explosion; if(P&&P.f[0].ok) vfx('pyro_explosion',x,y-50,{sc:.7}); fring(x,y,900,EMB,.35,6); sfx('boom',.8,.4); Cn.scar({kind:'burn',x,y,r:170,c:EMB,life:6,heat:2}); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); }); });
  after(3.2,()=>{ Cn.cam(cx,cy-BODY,9); Cn.zoom(.86); });
  // climax
  after(3.5,()=>{ V.shadow=null; Cn.impact(cx,cy-100,{style:'ember',c:EMB,n:3,r:.15,then:()=>{ M.on=false;
      const K=VFX.fx_mage_meteor; if(K&&K.f[0].ok){ const v=vfx('fx_mage_meteor',cx,cy,{px:K.ix,py:K.iy,sc:3000/K.h}); if(v){ v.age=K.hit*K.ms/1000; v.life-=v.age; } }
      const N=VFX.fx_pyro_nova; if(N&&N.f[0].ok) vfx('fx_pyro_nova',cx,cy-60,{sc:2900/N.w,a:.8}); fireBurst(cx,cy-80,2.6,0);
      Cn.waves(cx,cy,EMB,{n:4,s:1.25,dust:22,dc:'60,36,24'}); Cn.scar({x:cx,y:cy,r:860,c:EMB,life:10,heat:4.5}); Cn.scar({kind:'burn',x:cx,y:cy,r:620,c:EMB,life:10,heat:4}); Cn.wash('255,220,170',.34,0,cx,cy);
      burst(cx,cy,34,{rock:true,s0:400,s1:1500,size:24,vz:1500}); Cn.sweep(cx,cy,Dm,{speed:3000,push:1.3}); SFX.shatter(1);
      // the ground keeps going off further and further out
      for(let r=1;r<=2;r++) after(r*.2,()=>{ const n=5+r*3, rr=r*430; for(let i=0;i<n;i++){ const a=i/n*TAU+r, x=cx+Math.cos(a)*rr, y=cy+Math.sin(a)*rr*.75, P=VFX.pyro_explosion; if(P&&P.f[0].ok) vfx('pyro_explosion',x,y-60,{sc:.8}); fring(x,y,900,EMB,.3,5); } sfx('boom',1.2,.6); Cn.shake(.6); });
      Cn.setDark(.4,{spot:null}); Cn.ashFall(3.4,'#7a6a64',56); }}); });
  // afterglow: ash, smoke, a crater that is still molten
  after(4.1,()=>{ Cn.smokeRise(cx,cy,420,{n:14,dur:1.4,c:'36,26,22',a:.42}); Cn.embers(cx,cy,640,EMB,{n:44,dur:2}); });
  after(4.7,()=>{ Cn.setDark(0); Cn.zoom(1); Cn.cam(null); });
  after(5.35,ultStop); }

X.reg('mage',{sk,order,basic:{fn:basic,cd:()=>.85*(1-.05*(L('mg_basic')-1))},skills:SKILL,ults:{mg_ult1:ultThunder,mg_ult2:ultMeteor}});
})();
