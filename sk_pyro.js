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

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js, drawn by gfx.js)
const FLM='#ff6a1a', FD='#7a1000', FH='#fff0a8';
// one drawing of a fire whirl standing at (x,y): a funnel of flame discs that widen as they climb, each turning and leaning its own way
function twister(x,y,s,ph,a=1){ const K=GFX, st=K.st(5,'add',{c2:K.rgb(FD),c3:K.rgb(FH),L:2}), stG=K.st(8,'add',{L:0}), stR=K.st(2,'add',{c2:K.rgb(FD),c3:K.rgb(FH),L:0}), c=K.rgb(FLM), N=8;
  K.floor(stG,x,y,s*1.5,null,0,c,.5*a); K.floor(stR,x,y,s*.9,null,ph,c,.8*a,.7,K.tq(12,ph),.16,.12); K.floor(K.st(12,'alpha',{L:0}),x,y,s*.8,null,0,[0,0,0],.35*a);
  for(let i=0;i<N;i++){ const u=i/(N-1), z=s*(.15+u*3.1), r=s*(.42+u*.95), w=Math.sin(RT*5+ph+u*4)*s*.28*u; K.bill(st,x+w,y,z,r,r*.62,Math.sin(RT*3+i)*.25,c,a*(1-u*.35),.12+u*.3,K.tq(12,ph+i*1.7)+u,1.3,1.5); } }
// FIRE STORM: six whirlwinds walk out from his hands, graze the whole field, then come home and become one that fills the screen.
function ultStorm(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, RM=Math.max(hw,hh)*.68;
  S([['gx01',.1],['gx03',1.5,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',1.9],['gx09',.4],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  K.ambient(.46,.36,.36,3); Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); Cn.drone(44,.3); duck(.3,.6);
  // omen: sparks wind in round him in a spiral; the floor under him starts to glow
  K.add(1.8,(k,t)=>{ for(let i=0;i<2;i++){ const a=t*9+rand(0,.6), r=lerp(680,60,k)*rand(.8,1.1); K.pt({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:rand(20,200),vx:-Math.sin(a)*500,vy:Math.cos(a)*500*FSY,vz:rand(60,200),drag:2,life:.4,s:rand(6,13),c:K.rgb(pick([FLM,'#ffd28a','#ff3a10'])),m:8,b:'add'}); } });
  Cn.gCrack(x0,y0,360,FLM,{c2:FD,c3:FH,life:2,n:10,w:.12}); const Lh=K.light(x0,y0,800,FLM,0,2,{hold:4}); K.add(1.6,k=>{ Lh.a=k*1.1; });
  Cn.gather(x0,y0-BODY*.6,{c:FLM,dur:.9,r:860,n:20,cs:[FLM,'#ffd28a'],rings:0,streaks:0});
  const tor=[]; let out=false, home=0, t0=RT, big=0;
  const storm=K.add(9,()=>{ if(!out) return; const t=RT-t0;
    for(const z of tor){ z.a=z.a0+1.25*(Math.min(RT,home||RT)-t0-1.9)+(home?2.6*(RT-home):0); const R=home?lerp(z.R0,0,Math.min(1,(RT-home)/.5)**2):lerp(110,RM,easeOut(Math.min(1,(t-1.9)/1.1))); if(!home) z.R0=R; z.x=x0+Math.cos(z.a)*R; z.y=y0+Math.sin(z.a)*R*.8;
      twister(z.x,z.y,z.s*(home?1+Math.min(1,(RT-home)/.5)*.5:1),z.ph);
      if(Math.random()<.3){ inCircle(z.x,z.y,210,o=>ultHit(o,Dm*.12,z.x,z.y)); K.pt({x:z.x+rand(-80,80),y:z.y,z:rand(100,600),vx:rand(-300,300),vz:rand(300,900),g:900,life:.6,s:rand(4,9),c:K.rgb(FH),m:3,b:'add',len:.05}); }
      if(RT-(z.sc||0)>.3&&!home){ z.sc=RT; Cn.scar({kind:'burn',x:z.x,y:z.y,r:170,c:FLM,life:5,heat:1.8}); K.light(z.x,z.y,700,FLM,.6,.3); } }
    if(big){ const k=Math.min(1,(RT-big)/.25), o=Math.max(0,1-(RT-big-.9)/.5); if(o>0) twister(x0,y0,lerp(200,640,easeOut(k)),3,o); } });
  // release
  after(1.82,()=>Cn.impact(x0,y0-BODY,{style:'ember',c:FLM,n:2,soft:true,flash:.07,blur:.03,v:.5,then:()=>{ out=true; Cn.zoom(.84); Cn.cam(null); K.ambient(.5,.38,.36,5); SFX.boom(1.4,.5);
      Cn.gRing(x0,y0,hw*1.5,FLM,{c2:FD,life:.5,w:.08,jag:.1}); K.ripple(x0,y0,hw*1.5,{life:.5,s:.6}); Cn.gFire(x0,y0,10,260,{n:10});
      for(let k=0;k<6;k++) tor.push({a:k/6*TAU,a0:k/6*TAU,x:x0,y:y0,R0:110,s:rand(150,200),ph:k*2.1}); }}));
  for(let i=0;i<14;i++) after(2.1+i*.11,()=>{ const x=x0+rand(-hw,hw)*.9, y=y0+rand(-hh,hh)*.85; Cn.gFire(x,y,10,170,{n:6}); Cn.gStar(x,y,60,230,FLM,{c2:FD,c3:FH,life:.18,n:6}); Cn.gRing(x,y,380,FLM,{c2:FD,life:.3,w:.13}); K.light(x,y,800,FLM,.8,.25); sfx('boom',.8,.4); Cn.shake(.3); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  // climax: they come home
  after(3.75,()=>{ home=RT; Cn.zoom(1.02); Cn.SND.inhale(.5,.7); K.ambient(.3,.22,.24,4); Cn.gRing(x0,y0,hw*1.3,FH,{c2:FLM,inward:true,life:.5,w:.06,jag:.06}); });
  after(4.3,()=>Cn.impact(x0,y0-BODY,{style:'ember',c:FLM,n:2,r:.15,soft:true,flash:.1,blur:.06,then:()=>{ tor.length=0; big=RT; Cn.zoom(.8); K.ambient(.7,.48,.36,10); after(1,()=>K.ambient(1,1,1,1.6)); for(const d of Cn.drones) d.stop(.05);
      Cn.gStar(x0,y0,80,900,FLM,{c2:FD,c3:'#ffffff',life:.4,n:9}); for(let i=0;i<4;i++) Cn.gRing(x0,y0,hw*(1.1+i*.45),i%2?FH:FLM,{c2:FD,life:.55+i*.12,w:.15-i*.03,jag:.12,delay:i*.06});
      K.ripple(x0,y0,hw*2.3,{life:.8,s:1.1}); Cn.gCrack(x0,y0,hw*1.4,FLM,{c2:FD,c3:FH,life:4,n:16,w:.11}); Cn.scar({kind:'swirl',x:x0,y:y0,r:900,c:FLM,life:10,heat:4.5}); Cn.scar({kind:'burn',x:x0,y:y0,r:640,c:FLM,life:10,heat:4});
      for(let i=0;i<12;i++){ const a=i/12*TAU; Cn.gFire(x0+Math.cos(a)*520,y0+Math.sin(a)*520*FSY,10,240,{n:5,life:.9}); }
      Cn.gDebris(x0,y0,24,{s0:400,s1:1500,vz:2000,size:30,c:'#5a4038'}); K.light(x0,y0,2800,FLM,1.5,1.3); Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3}); Cn.shake(1.2); SFX.shatter(.7);
      Cn.gMotes(x0,y0,hw*1.2,FLM,90,{dur:2.2,life:2.4,white:.2}); }}));
  // afterglow: what is left burns where it fell; smoke; ash
  after(5.0,()=>{ for(let i=0;i<7;i++){ const a=rand(0,TAU), r=rand(200,700), x=x0+Math.cos(a)*r, y=y0+Math.sin(a)*r*.75; for(let q=0;q<5;q++) after(q*.16,()=>Cn.gFire(x,y,6,rand(70,110),{n:3,life:.7,smoke:q===4})); }
    Cn.gMotes(x0,y0,hw*1.2,'#8a7a78',50,{fall:true,dur:1.4,life:2.4,m:11,s0:3,s1:7,white:0}); Cn.zoom(1); });
  after(5.95,()=>{ storm.dead=true; ultStop(); }); }

// DRAGON BLAZE: it climbs out of the circle under his feet, takes one burning lap of the field low over their heads,
// goes up until it is above the camera - and comes down on the one it chose.
function ultDragon(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy;
  const hd=spr('dragon_head'), RR=Math.min(hw,hh)*.7, c=K.rgb(FLM);
  S([['gy01',.12],['gy02',.2],['gy03',.4,{kick:[-.8,.6]}],['gy04',1.1],['gy05',.1],['gy06',.1],['gy07',.12,{kick:[-1.4,1]}],['gy08',.8],['gy09',.8],['gy10',.8],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.6],['gy13',.7],['gy14',9]]);
  K.ambient(.42,.32,.34,3); Cn.zoom(1.28); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); const dr=Cn.drone(41,.4); SFX.rumble(1.7); duck(.3,.6);
  Cn.gCircle('fx_circle_seal',x0,y0,{c:FLM,r:30,life:2.6,tick:(s,t)=>{ s.r=lerp(30,360,easeOut(Math.min(1,t))); s.rot=-t*.8; s.a=t>2.2?Math.max(0,1-(t-2.2)/.4):.9; }});
  Cn.gCrack(x0,y0,380,FLM,{c2:FD,c3:FH,life:2.2,n:10,w:.12}); K.add(1.85,k=>{ if(Math.random()<.5) Cn.gFire(x0+rand(-240,240),y0+rand(-90,90),4,rand(40,80),{n:2,life:.5,smoke:false}); Cn.shake(.08+k*.12); });
  Cn.gather(x0,y0-BODY*.4,{c:FLM,dur:.9,r:860,n:24,cs:[FLM,'#ffd28a','#ff3a10'],rings:0,streaks:0});
  // the dragon: a head and the path it has flown; the body is drawn along that path, thinning to the tail
  const D={x:x0,y:y0,z:60,on:false,P:[],sc:0}; let tS=0, dive=0, rise=0;
  const stB=K.st(5,'add',{c2:K.rgb(FD),c3:K.rgb(FH),L:2}), stSp=K.st(3,'add',{c2:K.rgb(FD),c3:K.rgb(FH),L:2}), stG=K.st(8,'add',{L:2}), stSh=K.st(12,'alpha',{L:0}), stH=hd&&K.st(0,'alpha',{t:hd.im,L:3,uv01:true}), Ld=K.light(x0,y0,1300,FLM,0,9,{hold:9});
  const lapP=T=>{ const lt=Math.max(0,T-tS), a=-Math.PI/2+lt*2.9, R=RR*Math.min(1,lt/.45); return [x0+Math.cos(a)*R,y0+Math.sin(a)*R*.8,(260+Math.sin(lt*5)*110)*Math.min(1,lt/.3)+40,a]; };
  const riseP=T=>{ const s=lapP(rise), k=clamp((T-rise)/.7,0,1), a=s[3]+k*2.2; return [lerp(s[0],lerp(x0,cx,.5),k)+Math.cos(a)*RR*.4*(1-k)*k*2,lerp(s[1],lerp(y0,cy,.5)-hh*.3,k),lerp(s[2],3000,easeOut(k))]; };
  const diveP=T=>{ const s=riseP(dive), k=clamp((T-dive)/.42,0,1), e=k*k; return [lerp(s[0],cx,e),lerp(s[1],cy,e),lerp(s[2],40,e)]; };
  const posP=T=>dive&&T>=dive?diveP(T):rise&&T>=rise?riseP(T):lapP(T);
  const drag=K.add(9,()=>{ if(!D.on) return; const PZ=.0004, P=D.P; P.length=0; for(let i=0;i<60;i++){ const T=RT-i*.02; if(T<tS) break; P.push(posP(T)); }
    [D.x,D.y,D.z]=P[0]; Ld.x=D.x; Ld.y=D.y; Ld.a=1.1; Ld.t=0; const n=P.length;
    for(let i=n-1;i>=0;i--){ const p=P[i], u=i/60, sc=1+p[2]*PZ, r=(320*(1-u*.82)+40*Math.sin(RT*9-i*.5))*sc; K.floor(stSh,p[0],p[1],r*.8,null,0,[0,0,0],.3*(1-u)/(1+p[2]*.002));
      if(i%2===0&&i+2<n){ const q=P[i+2]; K.line(stSp,p[0],p[1],p[2],q[0],q[1],q[2],r*.62,c,.95*(1-u*.5),u*.5,K.tq(12,i),-2,.5); }
      K.bill(stB,p[0],p[1],p[2]+r*.3,r,r,RT*2+i,c,.8*(1-u*.6),.1+u*.55,K.tq(12,i*.7),1.2,1.5); }
    const p=P[0], q=P[Math.min(3,n-1)], sc=1+p[2]*PZ, ang=Math.atan2((p[1]-p[2])-(q[1]-q[2]),p[0]-q[0]); K.bill(stG,p[0],p[1],p[2],420*sc,420*sc,0,c,.7);
    if(stH){ const h=900*sc, w=h*hd.w/hd.h, fl=Math.cos(ang)<0?-1:1, stN=K.st(5,'add',{c2:K.rgb(FD),c3:K.rgb(FH),L:4}); K.bill(stH,p[0],p[1],p[2],w*.5,h*.5*fl,ang,[1,1,1],1,0,0,1,0);
      for(let j=0;j<4;j++){ const d=w*(.26+j*.1); K.bill(stN,p[0]-Math.cos(ang)*d,p[1],p[2]+Math.sin(ang)*d,h*(.42+j*.03),h*(.42+j*.03),RT*3+j,c,.95,.12+j*.06,K.tq(12,j*2.3),1.2,1.5); } }
    if(!dive&&!rise){ if(RT-D.sc>.11){ D.sc=RT; Cn.gFire(D.x+rand(-40,40),D.y+rand(-20,20),4,rand(60,100),{n:3,life:.8}); Cn.scar({kind:'burn',x:D.x,y:D.y,r:150,c:FLM,life:6,heat:2.6}); }
      if(Math.random()<.35){ V.blast={x:D.x,y:D.y,p:.8}; inCircle(D.x,D.y,270,o=>ultHit(o,Dm*.15,D.x,D.y)); } } });
  // release: the roar; it comes up out of the floor
  after(1.87,()=>Cn.impact(x0,y0-BODY,{style:'ember',c:FLM,n:2,v:.6,r:.12,soft:true,flash:.07,blur:.04,then:()=>{ dr.stop(.1); SFX.roar(1.8,1); Cn.zoom(.82); Cn.cam(null); K.ambient(.5,.36,.34,5); D.on=true; tS=RT;
      Cn.gRing(x0,y0,hw*1.6,FLM,{c2:FD,life:.5,w:.09,jag:.1}); K.ripple(x0,y0,hw*1.6,{life:.5,s:.7}); Cn.gFire(x0,y0,10,320,{n:14}); Cn.gDebris(x0,y0,12,{s0:300,s1:900,vz:1500,c:'#5a4038'}); Cn.gSpeed(2.1,'#ffb070',{c2:FLM,a:.14,r:.62,n:70,w:.09}); }}));
  // it goes up over the camera
  after(3.75,()=>{ rise=RT; Cn.zoom(.78); Cn.cam(lerp(x0,cx,.6),lerp(y0,cy,.6)-BODY,4); K.ambient(.34,.24,.26,4); SFX.roar(1.2,1); Cn.SND.inhale(.9,.7);
    K.add(1.12,k=>K.floor(K.st(12,'alpha',{L:0}),cx,cy,200+640*k,null,0,[0,0,0],.25+.5*k)); Cn.gRing(cx,cy,820,FH,{c2:FLM,inward:true,life:1.05,w:.05,jag:.05}); });
  // climax: the dive
  after(4.45,()=>{ dive=RT; Cn.cam(cx,cy-BODY,9); Cn.zoom(.88); });
  after(4.88,()=>Cn.impact(cx,cy-80,{style:'ember',c:FLM,n:2,r:.15,soft:true,flash:.12,blur:.07,then:()=>{ D.on=false; drag.dead=true; Ld.hold=0; Ld.life=.01; K.ambient(.7,.46,.34,10); after(1,()=>K.ambient(1,1,1,1.6));
      Cn.gStar(cx,cy,80,1000,FLM,{c2:FD,c3:'#ffffff',life:.42,n:9}); for(let i=0;i<4;i++) Cn.gRing(cx,cy,hw*(1.1+i*.45),i%2?FH:FLM,{c2:FD,life:.55+i*.12,w:.15-i*.03,jag:.12,delay:i*.06});
      K.ripple(cx,cy,hw*2.3,{life:.8,s:1.1}); Cn.gCrack(cx,cy,hw*1.5,FLM,{c2:FD,c3:FH,life:4,n:17,w:.11}); Cn.scar({x:cx,y:cy,r:880,c:FLM,life:10,heat:4.5}); Cn.scar({kind:'burn',x:cx,y:cy,r:620,c:FLM,life:10,heat:4});
      Cn.gFire(cx,cy,20,540,{n:24,life:1.1,sp:1000}); for(let r=1;r<=2;r++) after(r*.2,()=>{ const n=5+r*3; for(let i=0;i<n;i++){ const a=i/n*TAU+r; Cn.gFire(cx+Math.cos(a)*r*430,cy+Math.sin(a)*r*430*FSY,10,220,{n:5}); } sfx('boom',1.2,.6); Cn.shake(.6); });
      Cn.gDebris(cx,cy,30,{s0:400,s1:1600,vz:2300,size:34,c:'#5a4038'}); Cn.gDebris(cx,cy,12,{r:320,s0:100,s1:600,v0:1700,vz:3600,sz0:44,size:100,g:2600,c:'#5a4038'});
      K.light(cx,cy,2800,FLM,1.5,1.3); Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}); SFX.roar(1.6,.8); Cn.shake(1.4); Cn.gMotes(cx,cy,hw*1.2,FLM,90,{dur:2.2,life:2.4,white:.2}); }}));
  // afterglow: the lap it flew is still burning
  after(5.5,()=>{ for(let i=0;i<12;i++) after(i*.07,()=>Cn.gPuff(cx+rand(-300,300),cy+rand(-120,120),rand(40,260),rand(150,260),{c:'#2a2026',c2:'#08060a',c3:'#5a484a',vz:rand(240,560),life:rand(1.5,2.4),a:.8,grow:150})); Cn.gMotes(cx,cy,hw*1.2,'#8a7a78',50,{fall:true,dur:1.4,life:2.4,m:11,s0:3,s1:7,white:0}); Cn.zoom(1); Cn.cam(null); });
  after(6.3,()=>{ drag.dead=true; ultStop(); }); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
