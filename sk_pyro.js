// 참광 survival - PYRO skill set (top-down, all automatic). Fire: balls, pillars, rings, breath, tornadoes. Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,dropFx,ultStart,ultStop,ultHit,burst,fring}=X;
const C1='#ff7a2a', C2='#ffd28a';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const push=b=>S([['gb02',.04],['gb03',.05,{kick:[-.8,.6]}],['gb04',.06],['gb05',.04,{kick:[1.6,-1.2]}],['gb06',.08],['gb08',.07],['gb12',.05]],b);
const raise=()=>S([['gx01',.06],['gx03',.12,{kick:[-.8,.6]}],['gx06',.1,{kick:[2,-1.6]}],['gx07',.3],['gx09',.1],['gx12',.1,{kick:[2,-1.6]}],['gx14',.15]]);
// a fire explosion on a floor point
function blast(x,y,s=1){ const M=VFX.pyro_explosion; if(M&&M.f[0].ok) vfx('pyro_explosion',x,y-BODY*.35*s,{sc:.6*s});
  fireBurst(x,y-30*s,.6*s,0); fring(x,y,900*s,C1,.3,5); gl0(x,y-BODY*.4,140*s,C2,.15,{a:.8}); light(x,y-100,500*s,C1,.25,.4);
  for(let i=0;i<(s>1?8:4);i++) smoke(x+rand(-40,40)*s,y-rand(20,80)*s,rand(20,44)*s,{c:'40,30,26',a:.45,vy:rand(-200,-60)}); }
function fireball(x0,y0,a,d,o={}){ const sp=o.sp??1500, p={x:x0,y:y0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:o.life??1,d,r:o.r??80,home:o.home,turn:o.turn??5,c:C1,v:{x:x0,y:y0-BODY},h:o.h??BODY,pw:1.1};
  const M=VFX.pyro_fireball; p.fx=M&&M.f[0].ok?vfx('pyro_fireball',p.v.x,p.v.y,{follow:p.v,loop:true,life:p.life,sc:o.sc??.5,rot:a}):null;
  if(!p.fx) gl0(p.v.x,p.v.y,60,C1,p.life,{a:.9});
  p.onHit=(e,p)=>{ p.hitAny=true; blast(p.x,p.y,o.big?1.4:.8); sfx('fire',.4,.4); inCircle(p.x,p.y,o.big?220:140,q=>{ if(q!==e) dmg(q,d*.5,{kb:.8,sx:p.x,sy:p.y}); }); };
  p.onEnd=p=>{ if(!p.hitAny) blast(p.x,p.y,.7); };
  V.pj.push(p); return p; }

const sk={
  py_basic:{cls:'pyro',type:'basic',name:'파이어 볼',lv:1,desc:'적을 쫓아가 터지는 화염구를 던진다. 강화할수록 화염구가 늘어난다.'},
  py_dash:{cls:'pyro',type:'skill',name:'플레임 대시',lv:1,cd:5,dmg:1800,desc:'불꽃이 되어 돌진하고, 지나간 자리에 2초 동안 불길을 남긴다.',evo:'불길이 4초 동안 남는다.'},
  py_pillar:{cls:'pyro',type:'skill',name:'파이어 필러',lv:1,cd:4,dmg:2800,desc:'적 3명의 발밑에서 화염 기둥을 솟구치게 한다.',evo:'기둥이 5개가 된다.'},
  py_ring:{cls:'pyro',type:'skill',name:'플레임 링',lv:2,cd:7,dmg:2600,desc:'몸에서 불의 고리를 퍼뜨려 주변을 모두 태운다.',evo:'고리가 두 번 퍼진다.'},
  py_boom:{cls:'pyro',type:'skill',name:'익스플로전',lv:3,cd:8,dmg:3600,desc:'적이 몰린 곳을 크게 폭발시킨다.',evo:'폭발 뒤에 작은 폭발이 연달아 터진다.'},
  py_rain:{cls:'pyro',type:'skill',name:'파이어 레인',lv:5,cd:9,dmg:2400,desc:'하늘에서 화염구 8개를 쏟아붓는다.',evo:'화염구가 12개가 된다.'},
  py_breath:{cls:'pyro',type:'skill',name:'플레임 쓰로워',lv:6,cd:10,dmg:400,desc:'2초 동안 앞쪽 부채꼴로 불길을 뿜는다.',evo:'불길이 더 길고 넓어진다.'},
  py_tornado:{cls:'pyro',type:'skill',name:'파이어 토네이도',lv:8,cd:11,dmg:500,desc:'불의 회오리 2개를 일으켜 4초 동안 적을 쫓게 한다.',evo:'회오리가 3개가 된다.'},
  py_nova:{cls:'pyro',type:'skill',name:'슈퍼노바',lv:10,cd:13,dmg:9000,desc:'불꽃을 압축했다가 주변 전체를 날려 버리는 대폭발을 일으킨다.',evo:'범위가 크게 넓어진다.'},
  py_ult1:{cls:'pyro',type:'ult',name:'파이어 스톰',lv:3,desc:'궁극기. 불의 회오리와 화염구를 화면 가득 일으킨 뒤 한꺼번에 폭발시킨다.'},
  py_ult2:{cls:'pyro',type:'ult',name:'드래곤 블레이즈',lv:12,desc:'궁극기. 불꽃의 용이 화면을 휘감아 돌다가 적 한가운데로 내리꽂힌다.'},
};
const order=Object.keys(sk);

function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); push(true); const n=1+Math.floor((L('py_basic')+1)/2), d=1500*A.mul('py_basic');
  after(.2,()=>{ for(let k=0;k<n;k++) after(k*.08,()=>fireball(pl.x+Math.cos(a)*60,pl.gy+Math.sin(a)*60,a+(k-(n-1)/2)*.3,d,{home:e,life:1.2})); sfx('fireball',.8); });
  return true; }

const SKILL={
  py_dash:{fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+120), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, T=EVO(id)?4:2; face(a); push();
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.12}; G.inv=Math.max(G.inv,.35); sfx('fire',.8,.6);
    for(let i=0;i<=6;i++){ const x=lerp(x0,x1,i/6), y=lerp(y0,y1,i/6); fire({x,y:y-10,x2:x,y2:y-70,r:34,r2:22,i:1.1,type:0,life:T,fin:.2,fade:.5}); }
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,70,o=>{ dmg(o,d*.35,{kb:.2}); hitFx(o,C1,.8); })});
    after(.06,()=>inLine(x0,y0,x1,y1,80,o=>{ dmg(o,d,{kb:.8,sx:x0,sy:y0}); hitFx(o,C1,1.1); })); }},
  py_pillar:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?5:3, d=D(id); push(); sfx('fire',.9,.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.15+i*.1,()=>{ const x=e.x, y=e.y, M=VFX.fx_pyro_pillar;
      gl0(x,y,90,C1,.3,{a:.8}); fring(x,y,500,C1,.25,4);
      after(.15,()=>{ if(M&&M.f[0].ok) vfx('fx_pyro_pillar',x,y,{px:M.ix??.5,py:M.iy??.85,sc:620/M.h}); else fire({x,y:y-20,x2:x,y2:y-420,r:60,r2:30,i:1.3,type:0,life:.7,fin:.05,fade:.4});
        light(x,y-200,700,C1,.35,.45); trauma=Math.min(1,trauma+.15); sfx('fire',.5,.5);
        inCircle(x,y,150,o=>{ dmg(o,d,{kb:.3,launch:1200,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); })); }},
  py_ring:{fn(id){ if(countIn(480)<4&&!nearest(250)) return false; const d=D(id); raise();
    const wave=k=>{ const M=VFX.fx_pyro_ring; if(M&&M.f[0].ok) vfx('fx_pyro_ring',pl.x,pl.gy,{sc:1150/M.w,wy:FSY}); fring(pl.x,pl.gy,1600,C1,.45,10); sfx('fire',1,.8); light(pl.x,pl.gy,900,C1,.4,.5);
      [0,.1,.2,.3].forEach((t,i)=>after(t,()=>{ const r=160+i*120; inCircle(pl.x,pl.gy,r,o=>{ if((o.ringT||0)>RT) return; o.ringT=RT+.5; dmg(o,d*(k?.6:1),{kb:1.2}); hitFx(o,C1,1.1); }); })); };
    after(.2,()=>wave(0)); if(EVO(id)) after(.75,()=>wave(1)); }},
  py_boom:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); push(); sfx('fireball',1.2);
    gl0(x,y-BODY*.3,160,C1,.4,{a:.6}); ring(x,y,-900,C1,.35,{r0:500,w:5,sy:FSY,dec:1});
    after(.35,()=>{ blast(x,y,2.4); fring(x,y,2600,C2,.4,8); shock(x,y-60,1,1.1); trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
      inCircle(x,y,330,o=>{ dmg(o,d,{kb:1.8,big:true,launch:700,sx:x,sy:y}); hitFx(o,C1,1.4); });
      if(EVO(id)) for(let i=0;i<5;i++) after(.15+i*.1,()=>{ const b=rand(0,TAU), r=rand(150,380), bx=x+Math.cos(b)*r, by=y+Math.sin(b)*r*.75; blast(bx,by,1); inCircle(bx,by,160,o=>dmg(o,d*.4,{kb:.8,sx:bx,sy:by})); }); }); }},
  py_rain:{fn(id){ const T=onScreen(-40); if(!T.length) return false; const n=EVO(id)?12:8, d=D(id); raise(); sfx('fireball',1);
    for(let i=0;i<n;i++) after(.3+i*.1,()=>{ const e=T[(Math.random()*T.length)|0], x=e?e.x+rand(-60,60):pl.x+rand(-500,500), y=e?e.y+rand(-40,40):pl.gy+rand(-400,400);
      const M=VFX.pyro_fireball, v={x:x-220,y:y-900}; if(M&&M.f[0].ok) vfx('pyro_fireball',v.x,v.y,{follow:v,loop:true,life:.35,sc:.7,rot:Math.atan2(900,220)});
      let k=0; const fall=()=>{ k+=.05; v.x=x-220*(1-k/.35); v.y=y-900*(1-k/.35); if(k<.35) after(.05,fall); }; fall();
      after(.35,()=>{ blast(x,y,1.3); sfx('boom',.9,.5); inCircle(x,y,190,o=>{ dmg(o,d,{kb:1,launch:400,sx:x,sy:y}); hitFx(o,C1,1.1); }); }); }); }},
  py_breath:{fn(id){ const e=nearest(520); if(!e) return false; const flat=b=>{ const c=Math.cos(b)>=0?0:Math.PI, d=Math.atan2(Math.sin(b-c),Math.cos(b-c)); return c+clamp(d,-.6,.6); }; let a=flat(angTo(e)); const d=D(id), R=EVO(id)?640:520, half=EVO(id)?.55:.42; face(a);
    S([['gb03',.05],['gb05',.05],['gb06',2,{kick:[1.2,-1]}],['gb10',.08],['gb12',.06]]); sfx('fire',2,.8);
    const M=VFX.fx_pyro_breath, v={x:pl.x,y:pl.gy-BODY}, f=M&&M.f[0].ok?vfx('fx_pyro_breath',v.x,v.y,{follow:v,loop:true,life:2,sc:R*1.55/M.w,sy:2.3,rot:a,px:M.ix??.05,py:M.iy??.5,a:1}):null;
    V.zones.push({follow:true,r:0,life:2,tick:.1,fx:f,onTick:()=>{ const t=nearest(R+60); if(t){ const b=flat(angTo(t)); a+=Math.atan2(Math.sin(b-a),Math.cos(b-a))*.25; face(a); }
      const J=pl.j, hx=J&&J.rh?J.rh[0]:pl.x+pl.f*50, hy=J&&J.rh?J.rh[1]:pl.gy-BODY; v.x=hx; v.y=hy; if(f) f.rot=a;
      if(!f) for(let i=0;i<3;i++){ const b=a+rand(-half,half), r=rand(100,R); gl0(pl.x+Math.cos(b)*r,pl.gy+Math.sin(b)*r-BODY*.6,rand(30,60),pick([C1,C2,'#ff3b1a']),.3,{a:.7}); }
      for(let k=0;k<2;k++){ const b=a+rand(-half,half)*.6, sp=rand(900,1300); fire({x:pl.x+Math.cos(b)*90,y:pl.gy-BODY*.55+Math.sin(b)*90,r:38,i:1.45,type:0,life:R/sp,fin:.04,fade:.25,vx:Math.cos(b)*sp,vy:Math.sin(b)*sp,gr:150,drag:.6}); }
      inSector(pl.x,pl.gy,a,R,half,o=>{ dmg(o,d,{kb:.3}); hitFx(o,C1,.8); }); }}); }},
  py_tornado:{fn(id){ if(V.zones.some(z=>z.pyt)||countIn(800)<3) return false; const n=EVO(id)?3:2, d=D(id); raise(); sfx('fire',1.6,.7);
    for(let k=0;k<n;k++){ const a=k/n*TAU+rand(0,1), z={pyt:true,x:pl.x+Math.cos(a)*200,y:pl.gy+Math.sin(a)*160,r:170,life:4,tick:.2,v:{x:0,y:0},h:0};
      const M=VFX.fx_pyro_tornado; z.v.x=z.x; z.v.y=z.y; z.fx=M&&M.f[0].ok?vfx('fx_pyro_tornado',z.x,z.y,{follow:z.v,loop:true,life:4,px:M.ix??.5,py:M.iy??.88,sc:760/M.h,a:.95}):null;
      if(!z.fx) z.fe=fire({x:z.x,y:z.y-10,x2:z.x,y2:z.y-360,r:70,r2:120,i:1.2,type:0,life:4,fin:.2,fade:.5,hold:true});
      z.fn=o=>{ dmg(o,d,{kb:.6,stun:.2,sx:z.x,sy:z.y}); hitFx(o,C1,.9); o.pull={x:z.x,y:z.y,s:260}; };
      z.onTick=z=>{ const t=V.en.filter(o=>!o.dead).sort((p,q)=>Math.hypot(p.x-z.x,p.y-z.y)-Math.hypot(q.x-z.x,q.y-z.y))[0];
        if(t){ const b=Math.atan2(t.y-z.y,t.x-z.x); z.x+=Math.cos(b)*70; z.y+=Math.sin(b)*70; } const hx=z.x-pl.x, hy=z.y-pl.gy, hl=Math.hypot(hx,hy); if(hl>420){ z.x=pl.x+hx/hl*420; z.y=pl.gy+hy/hl*420; } if(z.fe){ z.fe.x=z.fe.x2=z.x; z.fe.y=z.y-10; z.fe.y2=z.y-360; } };
      z.onEnd=z=>{ if(z.fe) rel(z.fe); blast(z.x,z.y,1.2); };
      V.zones.push(z); } }},
  py_nova:{fn(id){ const R=EVO(id)?720:560; if(countIn(R)<8) return false; const d=D(id);
    S([['gy01',.1],['gy02',.15],['gy03',.4,{kick:[-.8,.6]}],['gy07',.1,{kick:[-1.4,1]}],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.3],['gy14',.15]]); sfx('rise',1.2,.7);
    for(let i=0;i<30;i++) after(i*.02,()=>gl0(pl.x+rand(-600,600),pl.gy+rand(-500,300)-BODY,rand(6,12),pick([C1,C2]),.5,{tx:pl.x,ty:pl.gy-BODY}));
    const core=fire({x:pl.x,y:pl.gy-BODY,r:20,i:1.6,type:2,pal:0,life:.75,fin:.1,fade:.05,gr:90});
    after(.75,()=>{ const M=VFX.fx_pyro_nova; if(M&&M.f[0].ok) vfx('fx_pyro_nova',pl.x,pl.gy-BODY*.4,{sc:R*2.4/M.w});
      fireBurst(pl.x,pl.gy-BODY*.5,2.2,0); fring(pl.x,pl.gy,R*6,C1,.6,12); fring(pl.x,pl.gy,R*4,'#ffffff',.35,5); shock(pl.x,pl.gy-BODY*.4,1.5,1.1);
      setInv(.08,'inv'); post.flash=.5; trauma=1.3; hitstop=.07; sfx('boom',2.2,1); light(pl.x,pl.gy,2200,C1,1,.6);
      inCircle(pl.x,pl.gy,R,o=>{ dmg(o,d,{kb:2.2,big:true,launch:900}); hitFx(o,C1,1.5); }); }); }},
};

// ---- ultimates (top-down)
function ultStorm(id){ ultStart(id); const {hw,hh}=view(), Dm=60000*A.mul(id); ov.dimT=.45; ov.redT=1; V.zk=.95; raise(); SFX.fire(2.4,.6);
  after(.3,()=>stamp('파이어',{x:.5,y:.18,size:.12,life:.8,c:C1}));
  const M=VFX.fx_pyro_tornado, tor=[];
  for(let k=0;k<6;k++){ const a=k/6*TAU, z={a,r:hw*.55,x:0,y:0,v:{x:0,y:0}}; tor.push(z); }
  let t=0; V.ultTick=dt=>{ t+=dt; for(const z of tor){ z.a+=dt*1.1; const R=lerp(120,Math.max(hw,hh)*.65,Math.min(1,t/1.2)); z.x=pl.x+Math.cos(z.a)*R; z.y=pl.gy+Math.sin(z.a)*R*.8; z.v.x=z.x; z.v.y=z.y;
      if(Math.random()<.25){ inCircle(z.x,z.y,200,o=>ultHit(o,Dm*.12,z.x,z.y)); } } };
  for(const z of tor) z.fx=M&&M.f[0].ok?vfx('fx_pyro_tornado',z.v.x,z.v.y,{follow:z.v,loop:true,life:3.2,px:M.ix??.5,py:M.iy??.88,sc:720/M.h,a:.95}):null;
  for(let i=0;i<22;i++) after(.5+i*.11,()=>{ const x=pl.x+rand(-hw,hw)*.9, y=pl.gy+rand(-hh,hh)*.85; blast(x,y,1.2); sfx('boom',.8,.4); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  after(3.1,()=>{ const N=VFX.fx_pyro_nova; if(N&&N.f[0].ok) vfx('fx_pyro_nova',pl.x,pl.gy-BODY*.4,{sc:Math.max(hw,hh)*2.2/N.w}); setInv(.1,'inv'); stamp('스톰',{x:.5,y:.18,size:.14,life:1,c:C2});
    post.flash=.6; trauma=1.4; hitstop=.08; shock(pl.x,pl.gy-BODY*.5,1.6,1.1); fring(pl.x,pl.gy,4000,C1,.8,14); fireBurst(pl.x,pl.gy-BODY*.5,2.6,0);
    for(const e of onScreen(300)) ultHit(e,Dm,pl.x,pl.gy); SFX.boom(2.4,1); buzz([200,40,300]); });
  after(4.1,()=>{ ov.redT=0; ultStop(); }); }
function ultDragon(id){ ultStart(id); const {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3);
  ov.dimT=.5; V.zk=.9; SFX.fire(2.6,.6); SFX.roar(1.4,1);
  S([['gy01',.1],['gy02',.15],['gy03',.3,{kick:[-.8,.6]}],['gy04',.5],['gy05',.08],['gy06',.08],['gy07',.1,{kick:[-1.4,1]}],['gy08',.5],['gy09',.6],['gy10',.6],['gy11',.1,{kick:[1.8,-1.4]}],['gy12',.5],['gy13',.6],['gy14',.4]]);
  after(.4,()=>stamp('드래곤',{x:.5,y:.18,size:.12,life:.8,c:C1}));
  const M=VFX.fx_pyro_dragon, dv={x:pl.x,y:pl.gy-BODY*2}, f=M&&M.f[0].ok?vfx('fx_pyro_dragon',dv.x,dv.y,{follow:dv,loop:true,life:3.4,sc:hw*2.2/M.w,px:M.ix??.7,py:M.iy??.5}):null;
  let t=0, px=dv.x, py=dv.y;
  V.ultTick=dt=>{ t+=dt; if(t<2.6){ const a=t*2.6, R=Math.min(hw,hh)*.62; dv.x=pl.x+Math.cos(a)*R; dv.y=pl.gy-BODY+Math.sin(a)*R*.75; }
    else { const k=Math.min(1,(t-2.6)/.4); dv.x=lerp(px,cx,k*k); dv.y=lerp(py,cy-80,k*k); }
    if(f) f.rot=Math.atan2(dv.y-py,dv.x-px); const mx=dv.x-px, my=dv.y-py; if(f&&Math.abs(mx)+Math.abs(my)>.1) f.sy=mx<0?-1:1; px=dv.x; py=dv.y;
    if(Math.random()<.8) fire({x:dv.x,y:dv.y,r:40,i:1,type:0,life:.6,fin:.05,fade:.5,vy:-60}); if(t<2.6&&Math.random()<.35){ const gx=dv.x+rand(-60,60), gy=dv.y+BODY+rand(-30,30); fire({x:gx,y:gy,x2:gx,y2:gy-50,r:30,r2:20,i:1,type:0,life:1.8,fin:.2,fade:.6}); }
    if(t<2.6&&Math.random()<.3) inCircle(dv.x,dv.y+BODY,260,o=>ultHit(o,Dm*.15,dv.x,dv.y)); };
  if(!f) for(let i=0;i<60;i++) after(i*.05,()=>gl0(dv.x,dv.y,90,C1,.4,{a:.8}));
  after(2.6,()=>{ V.shadow={x:cx,y:cy,t0:RT,dur:.4,r:500,c:C1}; });
  after(3.05,()=>{ V.shadow=null; if(f) f.life=0; const N=VFX.fx_pyro_nova; if(N&&N.f[0].ok) vfx('fx_pyro_nova',cx,cy-60,{sc:1700/N.w}); blast(cx,cy,3);
    setInv(.12,'inv'); stamp('블레이즈',{x:.5,y:.18,size:.13,life:1,c:C2}); post.flash=.6; trauma=1.4; hitstop=.08; shock(cx,cy-60,1.6,1.1); fring(cx,cy,3800,C1,.8,14);
    for(const e of onScreen(300)) ultHit(e,Dm,cx,cy); SFX.boom(2.4,1); SFX.roar(1.6,1); buzz([200,40,300]); });
  after(4.1,ultStop); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
