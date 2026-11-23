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

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const FLM='#ff7a2a';
const flame=(x,y,r,life,i=1)=>fire({x,y,x2:x,y2:y-r*1.6,r,r2:r*.5,i,type:0,life,fin:.15,fade:.5});
// FIRE STORM: six whirlwinds walk out from his hands, graze the whole field, then come home and become one.
function ultStorm(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, RM=Math.max(hw,hh)*.68;
  S([['gx01',.1],['gx03',1.5,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',1.9],['gx09',.4],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  Cn.setDark(.74,{c:'20,5,0',spot:{x:x0,y:y0-BODY*.5,r:900,a:.25}}); Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); Cn.drone(44,.3);
  // omen: sparks wind in around him in a spiral
  let t=0, sp=0; const M=VFX.fx_pyro_tornado, tor=[]; let out=false, home=0;
  V.ultTick=dt=>{ t+=dt; if(t<1.8){ sp+=dt; while(sp>.02){ sp-=.02; const a=t*9+rand(0,.6), r=lerp(620,60,t/1.8)*rand(.8,1.1); gl0(x0+Math.cos(a)*r,y0-BODY*.5+Math.sin(a)*r*.7,rand(5,11),pick([FLM,'#ffd28a','#ff3a10']),.35,{a:.9,vy:-90}); } }
    if(!out) return;
    for(const z of tor){ z.a+=dt*(home?2.6:1.25); const R=home?lerp(z.R0,0,Math.min(1,(t-home)/.5)**2):lerp(110,RM,easeOut(Math.min(1,(t-1.9)/1.1))); if(!home) z.R0=R; z.x=x0+Math.cos(z.a)*R; z.y=y0+Math.sin(z.a)*R*.8; z.v.x=z.x; z.v.y=z.y;
      if(Math.random()<.3) inCircle(z.x,z.y,210,o=>ultHit(o,Dm*.12,z.x,z.y));
      if((z.sc=(z.sc||0)+dt)>.34&&!home){ z.sc=0; Cn.scar({kind:'burn',x:z.x,y:z.y,r:170,c:FLM,life:5,heat:1.8}); } } };
  Cn.gather(x0,y0-BODY*.6,{c:FLM,dur:.9,r:860,n:30,cs:[FLM,'#ffd28a'],streaks:12});
  after(.85,()=>Cn.cutin(0,{style:'diag',dir:-1,title:SK[id].name,sub:'FIRE STORM',c:FLM,ang:.13,y:.38,h:.31,dur:.95,fy:.38,fx:.42}));
  // release
  after(1.82,()=>{ Cn.release(x0,y0,FLM); { out=true; Cn.zoom(.84); Cn.cam(null); Cn.setDark(.8,{spot:null}); Cn.speed(1.9,{c:'#ffb070',a:.2,n:16});
      for(let k=0;k<6;k++){ const z={a:k/6*TAU,x:x0,y:y0,v:{x:x0,y:y0},R0:110}; z.fx=M&&M.f[0].ok?vfx('fx_pyro_tornado',x0,y0,{follow:z.v,loop:true,life:2.45,px:M.ix??.5,py:M.iy??.88,sc:rand(760,1080)/M.h,a:.95}):null; tor.push(z); } } });
  for(let i=0;i<16;i++) after(2.1+i*.1,()=>{ const x=x0+rand(-hw,hw)*.9, y=y0+rand(-hh,hh)*.85; blast(x,y,1.25); sfx('boom',.8,.4); Cn.shake(.3); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  // climax: they come home
  after(3.75,()=>{ home=t; Cn.zoom(1.05); Cn.SND.inhale(.5,.7); Cn.setDark(.9,{spot:{x:x0,y:y0,r:800,a:.3}}); });
  after(4.2,()=>{ const P=VFX.fx_pyro_pillar; if(P&&P.f[0].ok) vfx('fx_pyro_pillar',x0,y0,{px:P.ix,py:P.iy,sc:1900/P.h}); });
  after(4.32,()=>Cn.impact(x0,y0-BODY,{style:'ember',c:FLM,n:3,r:.15,then:()=>{ out=false; Cn.zoom(.82); const N=VFX.fx_pyro_nova; if(N&&N.f[0].ok) vfx('fx_pyro_nova',x0,y0-BODY*.4,{sc:RM*3.4/N.w}); fireBurst(x0,y0-BODY*.5,2.6,0);
      Cn.waves(x0,y0,FLM,{n:4,s:1.25,dc:'66,34,20'}); Cn.scar({kind:'swirl',x:x0,y:y0,r:900,c:FLM,life:10,heat:4.5}); Cn.scar({kind:'burn',x:x0,y:y0,r:640,c:FLM,life:10,heat:4}); Cn.wash('255,214,160',.3,0,x0,y0);
      Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3}); Cn.setDark(.4,{spot:null}); Cn.ashFall(3.2,'#8a6a5a',54);
      // what is left burns where it fell
      for(let i=0;i<7;i++){ const a=rand(0,TAU), r=rand(200,700); flame(x0+Math.cos(a)*r,y0+Math.sin(a)*r*.75,rand(40,70),rand(1.6,2.4),.9); } }}));
  after(4.9,()=>{ Cn.smokeRise(x0,y0,520,{n:12,dur:1.2,c:'40,26,20',a:.4}); Cn.embers(x0,y0,700,FLM,{n:46,dur:1.8}); });
  after(5.3,()=>{ Cn.setDark(0); Cn.zoom(1); });
  after(5.95,ultStop); }

// DRAGON BLAZE: it climbs out of the circle under his feet, takes one burning lap of the field so everyone gets a look, and then it chooses.
function ultDragon(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy;
  S([['gy01',.12],['gy02',.2],['gy03',.4,{kick:[-.8,.6]}],['gy04',1.1],['gy05',.1],['gy06',.1],['gy07',.12,{kick:[-1.4,1]}],['gy08',.8],['gy09',.8],['gy10',.8],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.6],['gy13',.7],['gy14',9]]);
  Cn.setDark(.82,{c:'16,3,0',spot:{x:x0,y:y0-BODY*.5,r:860,a:.22}}); Cn.zoom(1.28); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); const dr=Cn.drone(41,.4); SFX.rumble(1.7);
  const circ=Cn.floorTex('fx_circle_seal',x0,y0,30,{c:FLM,spin:-.8,a:.95,life:3}); circ.core=.2;
  const M=VFX.fx_pyro_dragon, dv={x:x0,y:y0-BODY}, RR=Math.min(hw,hh)*.66; let f=null, t=0, px=x0, py=y0, sc=0, dive=0;
  V.ultTick=dt=>{ t+=dt; circ.r=lerp(30,330,easeOut(Math.min(1,t/1)))*(t>2.2?Math.max(0,1-(t-2.2)/.4):1); Cn.shake(t<1.8?.1+t*.1:0);
    if(t<1.9){ if(Math.random()<.7) flame(x0+rand(-240,240),y0+rand(-90,90),rand(20,44),.5,.8); return; }
    const lt=t-1.9;
    if(!dive){ const a=-Math.PI/2+lt*3.0, R=RR*Math.min(1,lt/.45); dv.x=x0+Math.cos(a)*R; dv.y=y0-BODY+Math.sin(a)*R*.75; }
    else { const k=Math.min(1,(t-dive)/.42); dv.x=lerp(dv.sx,cx,k*k); dv.y=lerp(dv.sy,cy-80,k*k); }
    if(f){ f.rot=Math.atan2(dv.y-py,dv.x-px); if(Math.abs(dv.x-px)>.1) f.sy=dv.x<px?-1:1; } px=dv.x; py=dv.y;
    if(Math.random()<.85) fire({x:dv.x,y:dv.y,r:46,i:1,type:0,life:.6,fin:.05,fade:.5,vy:-60});
    if(!dive){ if((sc+=dt)>.11){ sc=0; const gx=dv.x+rand(-40,40), gy=dv.y+BODY+rand(-20,20); flame(gx,gy,rand(26,40),2.2,.9); Cn.scar({kind:'burn',x:gx,y:gy,r:150,c:FLM,life:6,heat:2.6}); }
      if(Math.random()<.35){ V.blast={x:dv.x,y:dv.y+BODY,p:.8}; inCircle(dv.x,dv.y+BODY,270,o=>ultHit(o,Dm*.15,dv.x,dv.y)); } } };
  Cn.gather(x0,y0-BODY*.4,{c:FLM,dur:.9,r:860,n:36,cs:[FLM,'#ffd28a','#ff3a10']});
  after(.85,()=>Cn.cutin(1,{style:'punch',title:SK[id].name,sub:'DRAGON BLAZE',c:FLM,ang:-.1,y:.38,h:.33,dur:1,fy:.4,fx:.55}));
  // release: the roar
  after(1.87,()=>Cn.impact(x0,y0-BODY,{c:FLM,n:2,v:.6,r:.12,then:()=>{ dr.stop(.1); SFX.roar(1.8,1); post.blur=.14; Cn.zoom(.82); Cn.cam(null); Cn.setDark(.84,{spot:null}); Cn.speed(2.1,{c:'#ffb070',a:.2,n:16});
      f=M&&M.f[0].ok?vfx('fx_pyro_dragon',dv.x,dv.y,{follow:dv,loop:true,life:2.75,sc:hw*3.6/M.w,px:M.ix??.7,py:M.iy??.5}):null; fring(x0,y0,2600,FLM,.5,10); fireBurst(x0,y0-BODY*.5,1.6,0); }}));
  // climax: the dive
  after(4.1,()=>{ dive=t; dv.sx=dv.x; dv.sy=dv.y; Cn.omen(cx,cy,600,FLM,.43); Cn.cam(cx,cy-BODY,9); Cn.zoom(.9); Cn.setDark(.92,{spot:{x:cx,y:cy,r:800,a:.3}}); SFX.roar(1.2,1); Cn.SND.inhale(.42,.7); });
  after(4.53,()=>{ V.shadow=null; Cn.impact(cx,cy-80,{style:'ember',c:FLM,n:3,r:.15,then:()=>{ if(f) f.life=0; const N=VFX.fx_pyro_nova; if(N&&N.f[0].ok) vfx('fx_pyro_nova',cx,cy-60,{sc:2100/N.w}); blast(cx,cy,3); fireBurst(cx,cy-80,2.6,0);
      Cn.waves(cx,cy,FLM,{n:4,s:1.25,dc:'66,34,20'}); Cn.scar({x:cx,y:cy,r:880,c:FLM,life:10,heat:4.5}); Cn.scar({kind:'burn',x:cx,y:cy,r:620,c:FLM,life:10,heat:4}); Cn.wash('255,214,160',.38);
      Cn.wash('255,214,160',.3,0,cx,cy); burst(cx,cy,26,{rock:true,s0:400,s1:1400,size:22}); Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}); SFX.roar(1.6,.8); Cn.setDark(.4,{spot:null}); Cn.ashFall(3.2,'#8a6a5a',54); }}); });
  // afterglow: the lap it flew is still burning
  after(5.1,()=>{ Cn.smokeRise(cx,cy,480,{n:14,dur:1.2,c:'40,26,20',a:.42}); Cn.embers(cx,cy,680,FLM,{n:46,dur:1.8}); });
  after(5.5,()=>{ Cn.setDark(0); Cn.zoom(1); Cn.cam(null); });
  after(6.15,ultStop); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
