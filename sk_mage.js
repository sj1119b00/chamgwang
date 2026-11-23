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

// ---- ultimates (top-down)
function ultThunder(id){ ultStart(id); const x0=pl.x, y0=pl.gy, {hw,hh}=view(), R=Math.max(hw,hh)*1.05, Dm=60000*A.mul(id);
  ov.dimT=.6; post.grayT=.3; V.zk=1.15; S([['gx03',.1],['gx04',.2],['gx06',1.2],['gx08',.1,{kick:[1.2,-1]}],['gx10',1.2],['gx13',.5],['gx14',.3]]); SFX.thunder(.6);
  const C=VFX.fx_mage_field, circ=tdV('fx_mage_field',x0,y0,{loop:true,life:3.8,sc:.1,wy:FSY,a:.9});
  let t=0; V.ultTick=dt=>{ t+=dt; if(circ){ const k=Math.min(1,t/.7); circ.sc=(.2+.8*(1-(1-k)**3))*R*1.4/C.w; circ.rot+=dt*.5; circ.a=.85-.45*k; } };
  const T=onScreen(150).sort(()=>Math.random()-.5);
  T.forEach((e,i)=>after(.7+(i/Math.max(1,T.length))*1.8,()=>{ if(e.dead) return; zap(e.x,e.y,i%2?C1:C2,1.1); ultHit(e,Dm*.4,e.x,e.y); if(i%6===0){ sfx('thunder',.5); trauma=Math.min(.9,trauma+.12); } }));
  after(2.8,()=>{ V.zk=.92; stamp('헤븐',{x:.5,y:.18,size:.12,life:.7,c:C1}); });
  const tb=densest(1400), [bx,by]=X.inView(tb?tb.x:x0,tb?tb.y:y0-hh*.3,.45); const at=dropFx('fx_mage_megabolt',bx,by,1300,3.2,{a:.6,shadow:400})??3.2;
  after(at,()=>{ setInv(.1,'inv'); stamp('썬더',{x:.5,y:.18,size:.14,life:1,c:C2}); post.flash=.5; trauma=1.3; hitstop=.07; 
    fring(bx,by,3400,C1,.7,12); fring(bx,by,2000,'#ffffff',.4,5); light(x0,y0,2400,C2,1,.6);
    for(const e of onScreen(300)) ultHit(e,Dm,x0,y0); SFX.thunder(1.4); SFX.boom(2,1); buzz([150,40,250]); });
  after(at+1,ultStop); }
function ultMeteor(id){ ultStart(id); const {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3);
  ov.redT=1; ov.dimT=.4; V.zk=.95; S([['gy03',.12],['gy05',.4],['gy06',1.2],['gy07',.6],['gy09',.12,{kick:[1.2,-1]}],['gy10',.4],['gy13',.6],['gy14',.3]]); SFX.rise(.7,.6);
  for(let i=0;i<14;i++) after(.4+i*.11,()=>{ const x=pl.x+rand(-hw,hw)*.9, y=pl.gy+rand(-hh,hh)*.8, at=dropFx('fx_mage_star',x,y,520,0)??0;
    after(at,()=>{ fring(x,y,900,C1,.35,6); sfx('boom',.8,.5); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); }); });
  after(2,()=>{ V.shadow={x:cx,y:cy,t0:RT,dur:1.1,r:520,c:'#ff8a3a'}; SFX.rise(1.4,.8); V.zk=.85; });
  const at=dropFx('fx_mage_meteor',cx,cy,1900,3.2)??3.2;
  after(at,()=>{ V.shadow=null; setInv(.12,'inv'); stamp('메테오',{x:.5,y:.18,size:.14,life:1,c:'#ff8a3a'}); post.flash=.6; trauma=1.4; hitstop=.08; shock(cx,cy-80,1.6,1.1);
    fring(cx,cy,3600,'#ff8a3a',.8,14); fring(cx,cy,2200,'#ffffff',.4,5); light(cx,cy,2600,'#ffb36a',1.2,.6); burst(cx,cy,30,{rock:true,s0:400,s1:1400,size:22});
    for(const e of onScreen(300)) ultHit(e,Dm,cx,cy); SFX.boom(2.4,1); SFX.shatter(1); buzz([200,40,300]); });
  after(at+1.1,()=>{ ov.redT=0; ultStop(); }); }

X.reg('mage',{sk,order,basic:{fn:basic,cd:()=>.85*(1-.05*(L('mg_basic')-1))},skills:SKILL,ults:{mg_ult1:ultThunder,mg_ult2:ultMeteor}});
})();
