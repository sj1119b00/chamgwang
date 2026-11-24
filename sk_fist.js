// 참광 survival - FIGHTER skill set (top-down, all automatic). Azure ki and golden fists, staged on the K3 effect kit.
// Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inSector,inLine,sfx,view,ultStart,ultStop,ultHit}=X;
const K=window.K3, F=window.FX3;
const C1='#55ddff', C2='#ffd84a';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const PUNCH=[[['gb01',.03],['gb02',.04],['gb03',.09,{kick:[1.6,-1.2]}],['gb04',.08]],[['gb05',.03],['gb06',.04],['gb07',.09,{kick:[1.6,-1.2]}],['gb08',.08]],
  [['gb09',.04],['gb10',.09,{kick:[1.6,-1.2]}],['gb08',.08]],[['gb11',.06,{kick:[-1,.8]}],['gb12',.05],['gb13',.12,{kick:[2,-1.6]}],['gb14',.1]]];
const charge=()=>S([['gx03',.08],['gx04',.3,{kick:[-.8,.6]}],['gx08',.1,{kick:[2.2,-1.8]}],['gx10',.25],['gx13',.1]]);

// ---------------------------------------------------------------- palettes and local pieces (FX3 / GFX primitives)
// PK compressed ki, PG the golden fist, PS the sun
const PK=K.PAL.azure, PG=K.PAL.gold, PS={d:'#300600',b:'#ff5a0c',m:'#ffc238',h:'#fff4cc',l:'#ff9a30',s:'#ffd890'};
// seals are dense line art: their hot tone stays coloured so the whole disc does not go white
const PKS={...PK,b:'#0f86dc',m:'#4fc0ff',h:'#8fdcff'}, PGS={...PG,b:'#f09a08',m:'#ffc94a',h:'#ffe08a'}, PVS={...K.PAL.silver,b:'#8c9cc4',m:'#c4d2f4',h:'#e6eeff'};
const PI=Math.PI, sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5;
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
// a direction on screen (the game's x, y) as an angle in true floor units, and a screen length along it in floor units
const fa=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a)), fl=(a,len)=>Math.hypot(Math.cos(a)*len,Math.sin(a)*len/FSY);
const SEAL=()=>F.ready('v3_circ_fist')?'v3_circ_fist':'fx_circle_seal';
if(F&&F.on) F.img('fx_sun');
let MM=null;
function mm(){ if(MM) return MM; const m=K.mats(), M=F.mat; return MM={
  // beam: the painted beam with streaks racing down it, a filled body, a thin hot spine
  bmA:M({...m.art,tex:'fx3_beam',layer:'o',nz:'streak',n1:[3,1,-5,0],n2:[2,1,-3,0],dist:.03,mdist:1,nk:.4,rk:[.5,1.05]}),
  bmB:M({...m.trB,n1:[2,.8,-6,0],n2:[2,1,-3,0],fd:[.02,.3,0,0]}),
  bmC:M({...m.trC,n1:[1,.5,-8,0],fd:[.01,.3,0,0]}),
  // the light a beam throws on the floor under it
  strip:M({nz:'streak',n1:[3,1,-4,0],nk:.6,ero:.02,soft:.6,pm:[2,1.5,0,0],fd:[.03,.3,0,0],rk:[.7,1.2],gain:1.1,bgain:.9,layer:'g'}),
  swirl:M({...m.art,tex:'v3_spin_ring',layer:'o',nz:'wisp',n1:[1.5,1.5,.3,.1],nk:.3,rk:[.5,1.05]}),
  swirlG:M({...m.art,tex:'v3_spin_ring',layer:'g',nz:'wisp',n1:[1.5,1.5,.3,.1],nk:.3,rk:[.5,1.05]}),
  lance:M({...m.art,tex:'v3_thrust',layer:'o',nz:'streak',n1:[2,1,-3,0],nk:.3,rk:[.5,1.05]}),
  funnel:M({...m.piB,n1:[2,.7,1.5,-1.1],n2:[2,1,.8,-.5],fd:[0,0,.05,.55]}),
  torn:M({...m.art,tex:'fx3_tornado',layer:'o',nz:'wisp',n1:[1.5,1,.9,-.4],n2:[1.3,1,.6,-.3],dist:.07,mdist:1,nk:.3,rk:[.5,1.05]}),
  sun:M({kind:2,tex:'fx_sun',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ffffff',cC:'#000000',gain:1.2,op:0,layer:'o'}),
}; }
// every texture this class uses is drawn once, invisibly, the first time he acts: a texture uploaded in the middle of a busy frame
// disturbs that frame's noise (the pillars and funnels flash solid white), so the uploads are done while nothing else is on screen
let warmed=false, warmT=0;
function warm(){ if(warmed||!F.on||RT<warmT) return; warmT=RT+2; const m=K.mats(), N=['v3_xburst','v3_thrust','v3_spin_ring','fx3_tornado','fx3_beam','fx3_shock','fx3_fire','fx3_smoke','fx3_burst','v3_slash_thin','v3_slash_heavy','v3_fissure','v3_gash','fx_sun',SEAL()], L=N.map(t=>F.mat({...m.art,tex:t}));
  const e=GFX.add(2,()=>{ let all=true; N.forEach((t,i)=>{ if(F.ready(t)) F.quad(L[i],pl.x,pl.gy,4,4,0,{a:0}); else all=false; }); warmed=all; e.dead=true; if(!all) warmT=0; }); }
// ORB: a ball of compressed ki - halo, two counter-turning painted swirls, a white heart. Call every frame it is alive.
function orbDraw(x,y,z,r,P,a=1,g=1){ if(!F.on) return; const m=K.mats(), q=mm(), C=col(P);
  F.bill(m.glowO,x,y,z,r*2.4,r*2.4,0,{...C,a:.55*a,gain:1.3*g});
  F.bill(q.swirl,x,y,z,r*1.6,r*1.6,RT*7,{...C,a,gain:2.8*g});
  F.bill(q.swirl,x,y,z,r*1.1,r*1.1,-RT*11,{...C,a,gain:3*g,uvT:[-1,1,1,0]});
  F.bill(m.glowO,x,y,z,r*.55,r*.55,0,{cA:P.b,cB:P.h,cC:'#ffffff',a,gain:3*g}); }
// LANCE: the painted thrust (pressure rings on a spear of force) laid along a direction from a point, tilted up toward the camera
//  o: {pal, dur, h (half height), lean, gain, hold, delay}
function lance(x,y,z,a,len,o={}){ if(!F.on) return; const q=mm(), C=col(o.pal||PK), dur=o.dur||.28, h=o.h||len*.2, A2=fa(a), Lf=fl(a,len), g=o.gain||1, sd=Math.random()*9, ca=Math.cos(a), sa=Math.sin(a), hold=o.hold??.4, lean=(o.lean??.5)*Math.abs(ca);
  GFX.add(dur,k=>{ const e=eo5(sat(k/.35)), f=sat((k-hold)/(1-hold)), u=mix(.35,1,e), hl=Lf*u/2;
    F.quad(q.lance,x+ca*len*u/2,y+sa*len*u/2,hl,h,0,{z,M:F.xfw({sx:hl,sy:h*(1+f*.3),rx:-lean,rz:A2}),...C,a:1-f*f,gain:3*g,ero:.08+f*.7,nk:.3+f*.5,t0:sd}); },o.delay||0); }
// a fist landing on a point: painted needles, sparks, light on the floor
function blow(x,y,s=1,P=PK,o={}){ const z=o.z??BODY*.5;
  K.art(x,y,{tex:'v3_xburst',s:105*s,z,lift:0,dur:.2,pal:P,gain:.8,hold:.25,s0:.4,rot:rand(0,TAU)});
  K.sparks(x,y,z,{pal:P,n:Math.round(4+3*s),sp:[350,1100*s],up:420,life:[.14,.34]});
  GFX.light(x,y,300*s,P.l,.7,.22,{z}); }
// ki drawn out of the air into a point
function gather(x,y,z,n,P,dur,r0=380,r1=860){ for(let i=0;i<n;i++) after(rand(0,dur),()=>{ const a=rand(0,TAU), d=rand(r0,r1);
  GFX.pt({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,z:rand(0,420),tx:x,ty:y,tz:z,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); }); }

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

function basic(){ warm(); const e=nearest(360); if(!e) return false; const a=angTo(e), n=V.chain++%4, up=n===3, d=900*A.mul('fs_basic')*(up?2.4:1); face(a);
  S(PUNCH[n],true); if(!V.steer&&Math.hypot(e.x-pl.x,e.y-pl.gy)>200) V.dash={x0:pl.x,y0:pl.gy,x1:e.x-Math.cos(a)*120,y1:e.y-Math.sin(a)*120,t:0,dur:.08,soft:true}; /* the step-in never fights the stick */
  after(up?.2:.1,()=>{ const x=pl.x+Math.cos(a)*150, y=pl.gy+Math.sin(a)*150; sfx('boom',up?.9:.5,.5); sfx('whoosh',1.5,.4);
    if(up){ blow(x,y,1.5,PG); K.shock(x,y,{r:230,dur:.3,pal:PG,gain:.7,dust:5,light:0}); K.sparks(x,y,BODY*.5,{pal:PG,n:8,sp:[80,380],up:1500,life:[.25,.5]}); }
    else { blow(x,y,.9,PK); lance(pl.x+Math.cos(a)*30,pl.gy+Math.sin(a)*30,BODY*.55,a,150,{pal:PK,dur:.15,h:42}); }
    inSector(pl.x,pl.gy,a,up?300:260,.9,o=>{ dmg(o,d,{kb:up?1.2:.6,launch:up?1100:0,stun:up?.8:.2}); hitFx(o,up?C2:C1,up?1.3:1); });
    if(up) trauma=Math.min(.9,trauma+.25); });
  return true; }

// the ki shot's body: an orb that follows the projectile with a comet tail and its own light on the floor
function kiShot(p){ if(!F.on) return; const m=K.mats(), C=col(PK), Lt=GFX.light(p.x,p.y,420,PK.l,.8,.2,{hold:1.3,z:p.h}), sd=Math.random()*9;
  const fx=GFX.add(1.4,(k,t)=>{ if(p.life<=0){ fx.dead=true; Lt.hold=0; Lt.life=.01; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, ps=[];
    for(let i=0;i<6;i++){ const u=i/5; ps.push({x:p.x-ux*340*(1-u),y:p.y-uy*340*(1-u),z:p.h,w:48*(.25+.75*u)}); }
    F.ribbon(m.trB,ps,{...C,gain:3,t0:sd}); F.ribbon(m.trC,ps,{...C,gain:4.5,t0:sd});
    orbDraw(p.x,p.y,p.h,56+5*Math.sin(t*40),PK,1,.85); Lt.x=p.x; Lt.y=p.y; }); }
// the tornado kick: a spinning floor ring, a funnel of streaks, and the painted twister standing in it, all following him
function twister(R){ if(!F.on) return; const q=mm(), C=col(PK), sd=Math.random()*9, Lt=GFX.light(pl.x,pl.gy,R*2.4,PK.l,.6,.3,{hold:3,z:120});
  GFX.add(3.25,(k,t)=>{ const x=pl.x, y=pl.gy, a=sat(t/.2)*sat((3.2-t)/.25), fr=Math.floor(t/.09)%2;
    F.quad(q.swirlG,x,y,R*1.15,R*1.15,-t*9,{...C,a:.9*a,gain:2.2});
    F.lathe(q.funnel,x,y,0,{r0:R*.42,r1:R*1.05,h0:0,h1:R*1.8,...C,a:.3*a,gain:1.2,rk:[.6,1.3],t0:sd});
    F.bill(q.torn,x,y,R*1.05,R*.86,R*1.05,0,{...C,a:.24*a,gain:1.3,rk:[.6,1.3],t0:sd,uvT:fr?[-1,1,1,0]:[1,1,0,0]});
    Lt.x=x; Lt.y=y; }); }
// iron body: a golden sheath rising round him, the ring of its reach on the floor
function aura(T){ if(!F.on) return; const m=K.mats(), q=mm(), C=col(PG), sd=Math.random()*9, Lt=GFX.light(pl.x,pl.gy,620,PG.l,.55,.4,{hold:T,z:120});
  GFX.add(T,(k,t)=>{ const x=pl.x, y=pl.gy, a=sat(t/.25)*sat((T-t)/.4), pu=.85+.15*Math.sin(t*9);
    F.quad(m.glowG,x,y,250,250,0,{...C,a:.35*a,gain:.8});
    F.ring(m.shL,x,y,196,236,{...C,a:.6*a*pu,gain:1.8,t0:sd});
    F.lathe(q.funnel,x,y,0,{r0:150,r1:176,h0:0,h1:330,...C,a:.3*a*pu,gain:1.1,rk:[.7,1.4],t0:sd});
    Lt.x=x; Lt.y=y; }); }

const SKILL={
  fs_dash:{moves:true,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+80), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, z=BODY*.55; face(a);
    S(PUNCH[1]); const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.11}; G.inv=Math.max(G.inv,.35); sfx('whoosh',1.3,.7);
    lance(x0,y0,z,a,Ld+150,{pal:PK,dur:.36,h:150,lean:.45,gain:1.2}); K.beam(x0,y0,z,x1,y1,z,{w:88,dur:.36,pal:PK,gain:.8}); K.dust(x0,y0,{n:6,dir:a+PI,spread:.5,sp:[200,520],a:.4}); GFX.light((x0+x1)/2,(y0+y1)/2,Ld*.9,PK.l,.7,.3,{z});
    after(.12,()=>{ inLine(x0,y0,x1,y1,90,o=>{ dmg(o,d*.6,{kb:.6,sx:x0,sy:y0}); hitFx(o,C1,1); });
      const x=x1+Math.cos(a)*110, y=y1+Math.sin(a)*110, r=EVO(id)?330:200; blow(x,y,1.7,PG); sfx('boom',1.2,.8); trauma=Math.min(1,trauma+.35);
      K.shock(x,y,{r:r*1.25,dur:.38,pal:PG,gain:.9}); K.crack(x,y,{r:r*.75,pal:PG,life:2.6}); K.debris(x,y,{n:6,sp:[200,600],up:800});
      if(EVO(id)){ K.dome(x,y,{r,dur:.36,pal:PG,gain:.7,hk:.5}); K.art(x,y,{tex:'fx3_shock',floor:true,s:r*1.2,dur:.45,pal:PG,gain:.8,s0:.3}); }
      inCircle(x,y,r,o=>{ dmg(o,d,{kb:1.6,big:true,sx:x1,sy:y1}); hitFx(o,C2,1.3); }); }); }},
  fs_upper:{fn(id){ const e=nearest(380); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?300:220, cx=pl.x+Math.cos(a)*180, cy=pl.gy+Math.sin(a)*180; face(a);
    S(PUNCH[3]); after(.2,()=>{ K.cres(cx-pl.f*R*.75,cy,BODY*1.2,{reach:R*1.15,dir:pl.f>0?0:PI,lean:.86,tex:'v3_slash_heavy',pal:PG,swing:.07,hold:.07,fade:.3,gain:.9,ccw:pl.f>0,sparks:8}); K.beam(cx,cy,20,cx,cy,R*3.4,{w:R*.42,dur:.36,pal:PG,gain:.7}); K.art(cx,cy,{tex:'v3_xburst',s:R*.8,z:BODY*.4,lift:0,dur:.22,pal:PG,gain:.7,hold:.2,s0:.5});
      K.shock(cx,cy,{r:R*1.25,dur:.36,pal:PG,gain:.8}); K.sparks(cx,cy,40,{pal:PG,n:14,sp:[80,420],up:1900,life:[.3,.6]}); K.debris(cx,cy,{n:7,r:R*.5,sp:[80,360],up:1500});
      sfx('boom',1,.7); sfx('whoosh',1.1,.8); trauma=Math.min(1,trauma+.3);
      inCircle(cx,cy,R,o=>{ dmg(o,d,{kb:.3,launch:1400,stun:1,sx:pl.x,sy:pl.gy}); hitFx(o,C2,1.3); if(EVO(id)) after(.9,()=>{ if(!o.dead){ dmg(o,d*.6,{kb:.2}); blow(o.x,o.y,.6); } }); }); }); }},
  fs_ki:{fn(id){ const e=nearest(900); if(!e) return false; const a0=angTo(e), d=D(id), n=EVO(id)?3:1; face(a0); charge(); sfx('rise',1.2,.4);
    const hx=pl.x+Math.cos(a0)*70, hy=pl.gy+Math.sin(a0)*70; gather(hx,hy,BODY*.9,10,PK,.3,160,380); GFX.add(.42,k=>orbDraw(pl.x+Math.cos(a0)*70,pl.gy+Math.sin(a0)*70,BODY*.9,8+44*k,PK,1,.8));
    after(.42,()=>{ for(let k=0;k<n;k++){ const a=a0+(k-(n-1)/2)*.3, p={x:pl.x+Math.cos(a)*80,y:pl.gy+Math.sin(a)*80,vx:Math.cos(a)*1250,vy:Math.sin(a)*1250,life:1.1,d,r:110,hits:new Set(),c:C1,h:BODY*.9,pw:1.3};
        p.onEnd=p=>{ K.burst(p.x,p.y,{s:135,pal:PK,no:['smoke','crack','debris']}); sfx('boom',1,.6); inCircle(p.x,p.y,200,o=>dmg(o,d,{kb:1.2,sx:p.x,sy:p.y})); };
        kiShot(p); V.pj.push(p); }
      K.shock(pl.x,pl.gy,{r:250,dur:.3,pal:PK,gain:.6,dust:5}); K.flare(pl.x+Math.cos(a0)*90,pl.gy+Math.sin(a0)*90,BODY*.9,{pal:PK,s:150,dur:.2,gain:2.5}); sfx('boom',.7,.5); }); }},
  fs_stomp:{fn(id){ const R=EVO(id)?620:520; if(countIn(R)<3&&!nearest(220)) return false; const d=D(id);
    S([['gy08',.12,{kick:[-1,.8]}],['gy01',.1],['gy12',.08,{kick:[2.4,-2]}],['gy13',.25],['gy16',.1]]);
    const wave=k=>{ const x=pl.x, y=pl.gy, r=R*(k?1.25:1);
      K.art(x,y,{tex:'fx3_shock',floor:true,s:r*1.05,dur:.5,pal:PK,gain:.75,hold:.3,s0:.25,rot:rand(0,TAU)}); K.shock(x,y,{r:r*1.1,dur:.45,pal:PK}); K.crack(x,y,{r:r*.62,pal:PK,life:3,grow:.1});
      GFX.ripple(x,y,r*1.2,{life:.4,s:.6}); K.debris(x,y,{n:12,r:120,sp:[250,900],up:1300}); K.sparks(x,y,20,{pal:PK,n:16,sp:[400,1400],up:900});
      trauma=Math.min(1.1,trauma+.5); hitstop=Math.max(hitstop,.04); sfx('boom',1.4,1);
      inCircle(x,y,r,o=>{ dmg(o,d*(k?.6:1),{kb:1.4,launch:900,big:true}); hitFx(o,C1,1.2); }); };
    after(.22,()=>wave(0)); if(EVO(id)) after(.55,()=>wave(1)); }},
  fs_rush:{fn(id){ const e=nearest(420); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?470:380, n=EVO(id)?14:10; face(a);
    const st=[]; for(let i=0;i<8;i++) st.push(['gy0'+(2+i%4),.05]); st.push(['gy06',.06],['gy07',.08]); S(st);
    K.dust(pl.x,pl.gy,{n:6,dir:a,spread:.6,sp:[250,700],a:.35});
    for(let i=0;i<n;i++) after(i*.06,()=>{ const b=a+rand(-.5,.5), r=rand(140,R), x=pl.x+Math.cos(b)*r, y=pl.gy+Math.sin(b)*r, P=i%2?PK:PG;
      const z=BODY*rand(.45,.8); lance(pl.x+Math.cos(b)*40,pl.gy+Math.sin(b)*40,z,b,r-20,{pal:P,dur:.17,h:rand(70,100)}); K.beam(pl.x+Math.cos(b)*50,pl.gy+Math.sin(b)*50,z,x,y,z,{w:rand(40,58),dur:.16,pal:P,gain:.8}); blow(x,y,.85,P,{z}); sfx('boom',.4,.35);
      inSector(pl.x,pl.gy,a,R,.55,o=>{ if((o.rushT||0)>RT) return; o.rushT=RT+.05; dmg(o,d,{kb:.3,stun:.25}); hitFx(o,C2,.9); }); }); }},
  fs_tornado:{fn(id){ if(V.zones.some(z=>z.torn)||countIn(500)<2) return false; const d=D(id), R=EVO(id)?320:240;
    twister(R); K.shock(pl.x,pl.gy,{r:R*1.3,dur:.35,pal:PK,gain:.7,light:0});
    S([['gy02',.05],['gy03',.05],['gy04',.05],['gy05',.05]]); sfx('whoosh',.8,.8);
    V.zones.push({torn:true,follow:true,r:R,life:3,tick:.2,fn:e=>{ dmg(e,d,{kb:.9,stun:.2}); hitFx(e,C1,.9); if(EVO(id)) e.pull={x:pl.x,y:pl.gy,s:300}; },
      onTick:z=>{ if(!anim.seq) S([['gy02',.05],['gy03',.05],['gy04',.05],['gy05',.05]]); sfx('whoosh',1.2,.3);
        K.cres(z.x,z.y,BODY*.5,{reach:R*.95,dir:rand(0,TAU),lean:.22,tex:'v3_slash_thin',pal:PK,swing:.06,hold:.02,fade:.15,gain:.8,light:0,sparks:3}); K.dust(z.x,z.y,{n:2,r:R*.5,sp:[150,400],a:.3}); }}); }},
  fs_aura:{fn(id){ if(V.armor>0||countIn(420)<4) return false; const d=D(id), T=EVO(id)?6:4; V.armor=T; charge(); sfx('rise',.7,.6); stamp('아이언',{x:.5,y:.2,size:.08,life:.8,c:C2});
    aura(T); K.shock(pl.x,pl.gy,{r:300,dur:.4,pal:PG,gain:.8}); K.dome(pl.x,pl.gy,{r:230,dur:.4,pal:PG,gain:.7,hk:.9}); K.flare(pl.x,pl.gy,BODY,{pal:PG,s:200,dur:.3,gain:2});
    V.zones.push({follow:true,r:230,life:T,tick:.5,fn:e=>{ dmg(e,d,{kb:1.1}); hitFx(e,C2,1); },
      onTick:z=>{ K.embers(z.x,z.y,150,{pal:PG,n:6,life:1.2}); K.shock(z.x,z.y,{r:250,r0:70,dur:.3,pal:PG,gain:.5,light:0,dust:0,haze:.3}); }}); }},
  fs_giga:{fn(id){ const e=nearest(700); if(!e) return false; const a=angTo(e), d=D(id), Lg=900, ca=Math.cos(a), sa=Math.sin(a), z=BODY*.6; face(a); charge(); sfx('rise',1,.6);
    gather(pl.x+ca*50,pl.gy+sa*50,z,20,PG,.35,200,520); GFX.add(.45,k=>orbDraw(pl.x+ca*50,pl.gy+sa*50,z,10+60*k,PG,1,.85)); K.shock(pl.x,pl.gy,{r0:440,r:60,dur:.42,pal:PG,gain:.6,light:0,dust:0,haze:.4,th:.6});
    after(.45,()=>{ const px=pl.x, py=pl.gy, x1=px+ca*Lg, y1=py+sa*Lg;
      lance(px,py,z,a,Lg+80,{pal:PG,dur:.42,h:300,gain:1.1}); K.beam(px+ca*60,py+sa*60,z,x1,y1,z,{w:175,dur:.36,pal:PG,gain:.85});
      K.art(px+ca*150,py+sa*150,{tex:'v3_xburst',s:250,z,lift:0,dur:.26,pal:PG,gain:.9,s0:.5}); K.gash(px+ca*120,py+sa*120,x1,y1,{pal:PG,life:2.8,w:120});
      K.shock(px,py,{r:420,dur:.4,pal:PG}); K.dust(px,py,{n:8,dir:a+PI,spread:.7,sp:[300,800]}); for(let i=1;i<=4;i++) K.debris(px+ca*Lg*i/5,py+sa*Lg*i/5,{n:3,sp:[150,500],up:900});
      GFX.light(px+ca*Lg*.5,py+sa*Lg*.5,Lg*.9,PG.l,1.1,.4,{z}); trauma=1; hitstop=.06; sfx('boom',1.8,1);
      inLine(px,py,x1,y1,140,o=>{ dmg(o,d,{kb:2,big:true,launch:600}); hitFx(o,C2,1.5); });
      if(EVO(id)) for(let i=1;i<=5;i++) after(i*.07,()=>{ const x=px+ca*Lg*i/5, y=py+sa*Lg*i/5; K.burst(x,y,{s:130,pal:PK,no:['smoke','crack','debris']}); inCircle(x,y,170,o=>dmg(o,d*.4,{kb:.8,sx:x,sy:y})); }); }); }},
};

/// ---- ultimates. Each is one staged sequence: omen -> release -> development -> climax -> afterglow
const easeIO=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
// HYPER BEAM: the seal writes itself and the floor lets go of its stones while he compresses the ki of the whole field between
// his hands; then one sustained roar of light he has to lean into, swept right round the field, scorching the floor as it goes;
// it chokes, leaks from him in every direction, and the last of it goes at once.
function ultBeam(id){ ultStart(id); warm(); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), Lb=Math.hypot(hw,hh)*1.25, e0=nearest(1600), a0=e0?angTo(e0):0, x0=pl.x, y0=pl.gy, hz=BODY*.62, P=PK, C=col(P), m=K.mats(), q=mm(); face(a0);
  const S0=[['gx01',.1],['gx02',.14],['gx03',.2],['gx04',1.35,{kick:[-.8,.6]}],['gx08',.1,{kick:[2.2,-1.8]}]]; for(let i=0;i<9;i++) S0.push(['gx'+String(9+i%4).padStart(2,'0'),.3]); S0.push(['gx13',.6],['gx14',9]); S(S0);
  const T=2.5, t0=1.85, tF=t0+.09, dir=pl.f>0?1:-1, hx=x0+pl.f*46;
  // ---- omen
  GFX.ambient(.3,.36,.52,3.2); const spot=GFX.light(x0,y0,520,P.l,.5,.6,{hold:9,z:130,flick:.12});
  const sig=K.sigil(x0,y0,{r:hw*.6,dur:9,in:1.3,out:.5,spin:.2,pal:PVS,tex:SEAL(),gain:.45});
  K.crack(x0,y0,{r:250,pal:P,life:6,grow:1.4});
  Cn.zoom(1.4); Cn.cam(x0,y0-BODY*.6,4.5); Cn.roll(.03); const dr=Cn.drone(52,.4); SFX.rumble(1.7); Cn.SND.inhale(1.7,.4);
  for(let i=0;i<4;i++) after(.12+i*.4,()=>K.shock(x0,y0,{r0:hw*(1.1-i*.15),r:70,dur:.5,pal:P,gain:.5+.1*i,light:0,dust:0,haze:.5,th:.6}));
  gather(hx,y0,hz,60,P,1.7);
  for(let i=0;i<22;i++) after(rand(0,1),()=>{ const a=rand(0,TAU), d=rand(140,520); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(260,600),g:0,drag:rand(1.6,2.4),life:4,s:rand(12,30),rot:rand(0,TAU),vr:rand(-2,2),m:11,b:'alpha',c:GFX.rgb('#56627a'),c2:'#0a1626',shadow:true,fk:4,L:2,tag:'fr'}); });
  let t=0, firing=false, ang=a0, wide=1, wv=1, bt=0, lastT=RT; V.ultTick=dt=>{ t+=dt; if(t<1.8) Cn.shake(.1+t*.12); };
  GFX.add(tF,(k,tt)=>{ orbDraw(hx,y0,hz,14+72*eo3(k)+4*Math.sin(tt*40),P,1,.9); spot.a=.5+.6*k; spot.r=520+460*k; });
  after(t0,()=>{ K.flare(hx,y0,hz,{pal:P,s:70,sx:6,sy:.3,dur:.14,gain:5}); Cn.SND.tick(1.4,.3); });
  // ---- release: the beam, and the same sweep of damage as ever
  after(tF,()=>{ firing=true; dr.stop(.1); Cn.zoom(.84); Cn.cam(null); Cn.roll(0); beamSnd=SFX.beam(1); hitstop=Math.max(hitstop,.08); Cn.shake(1); post.ca=.012; Cn.SND.hit(.7);
    spot.hold=0; spot.life=.2; GFX.ambient(.44,.52,.7,30); after(.14,()=>GFX.ambient(.3,.36,.52,5)); sig.a=1.5;
    const c0=Math.cos(a0), s0=Math.sin(a0), sd=Math.random()*9;
    K.art(x0+c0*130,y0+s0*130,{tex:'v3_xburst',s:hw*.36,z:hz,lift:0,dur:.3,pal:P,gain:.6,hold:.2,s0:.5});
    K.shock(x0,y0,{r:hw*1.4,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.5,{life:.45,s:.7}); K.dust(x0,y0,{n:12,r:60,dir:a0+PI,spread:1,sp:[400,1100]}); K.debris(x0,y0,{n:10,r:120,sp:[200,700],up:900});
    for(const p of GFX.pts) if(p.tag==='fr'){ const dx=p.x-x0, dy=p.y-y0, l=Math.hypot(dx,dy)||1, s=rand(500,1200); p.vx=dx/l*s; p.vy=dy/l*s; p.vz=rand(200,800); p.g=2600; p.drag=.25; p.bounce=.38; p.vr=rand(-10,10); p.life=p.t+rand(1,1.6); }
    const BL=[200,760,1400].map(()=>GFX.light(x0,y0,900,P.l,0,.25,{hold:T+1.2,z:200}));
    GFX.add(T+1.2,(k,tt)=>{ if(!firing){ for(const l of BL){ l.hold=0; l.life=.01; } return; }
      const tb=Math.min(T,bt+Math.min(.06,RT-lastT)), av=a0+TAU*easeIO(Math.min(1,tb/T))*dir, ca=Math.cos(av), sa=Math.sin(av), len=Lb*eo3(sat(tt/.1)), A2=fa(av); wv+=(wide-wv)*.2;
      const rib=(w,n)=>{ const ps=[]; for(let i=0;i<n;i++){ const u=i/(n-1); ps.push({x:x0+ca*(70+u*len),y:y0+sa*(70+u*len),z:hz,w:w*wv*(.4+.6*sat(u*10))*(1+.07*Math.sin(tt*46+i*1.7))}); } return ps; };
      F.quad(q.strip,x0+ca*len/2,y0+sa*len/2,fl(av,len)/2,340*wv,A2,{...C,a:.8,gain:1.2,t0:sd});
      const fr=Math.floor(tt*14)%2;
      F.ribbon(q.bmA,rib(520,12),{...C,gain:2.2,bgain:1.7,t0:sd,uvT:fr?[1,-1,0,1]:[1,1,0,0]}); F.ribbon(q.bmA,rib(340,12),{...C,gain:2.4,bgain:1.5,t0:sd+4,uvT:fr?[1,1,.13,0]:[1,-1,.13,1]});
      F.ribbon(q.bmB,rib(165,12),{...C,gain:2.4,t0:sd}); F.ribbon(q.bmC,rib(58,12),{...C,gain:4.5,t0:sd});
      orbDraw(x0+ca*70,y0+sa*70,hz,84*wv,P,1,.9);
      BL.forEach((l,i)=>{ const d=[200,760,1400][i]; l.x=x0+ca*d; l.y=y0+sa*d; l.a=.9; }); });
    let sc=0; const tick=()=>{ bt+=.05; lastT=RT; if(bt>T||RPG.mode!=='surv'||!lock){ return; } ang=a0+TAU*easeIO(Math.min(1,bt/T))*dir; face(ang); const ca=Math.cos(ang), sa=Math.sin(ang), x1=x0+ca*Lb, y1=y0+sa*Lb;
      Cn.shake(.55); post.ca=.006;
      if(Math.random()<.6){ const r=rand(300,Lb*.6), x=x0+ca*r, y=y0+sa*r; K.sparks(x,y,40,{pal:P,n:5,dir:ang,spread:.4,sp:[600,1800],up:500,life:[.15,.4]}); K.debris(x,y,{n:2,sp:[150,500],up:900}); }
      if((sc+=.05)>=.25){ sc=0; const g0=rand(150,260), g1=Lb*rand(.45,.66); K.gash(x0+ca*g0,y0+sa*g0,x0+ca*g1,y0+sa*g1,{pal:P,life:2.3,w:rand(130,190),grow:.08}); for(let j=0;j<2;j++){ const r=rand(350,g1); K.flame(x0+ca*r,y0+sa*r,{s:rand(150,230),dur:rand(.5,.75),pal:P,light:0,delay:.06+j*.08}); } K.dust(x0+ca*500,y0+sa*500,{n:3,r:60,sp:[150,420],a:.35}); }
      K.dust(x0,y0,{n:1,r:40,dir:ang+PI,spread:.5,sp:[300,700],a:.35});
      V.blast={x:x0,y:y0,p:1.4}; let nf=0; inLine(x0,y0,x1,y1,210,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.3; if(nf++<3) blow(o.x,o.y,1.3,P); ultHit(o,Dm*.5,x0,y0); });
      after(.05,tick); }; tick(); });
  // ---- climax: it chokes back into him, leaks in ten directions, and the last of it goes at once
  const tC=t0+.1+T, tN=tC+.32+.135;
  after(tC,()=>{ wide=.45; Cn.SND.inhale(.4,.5); Cn.zoom(.8); GFX.ambient(.3,.32,.46,8); const sd=Math.random()*9; after(tN-tC-.1,()=>{ firing=false; sig.pal=PGS; sig.kick(); });
    K.shock(x0,y0,{r0:hw*1.3,r:80,dur:.42,pal:P,gain:.8,light:0,dust:0,haze:.6,th:.7});
    GFX.add(tN-tC,k=>{ const e=k*k; for(let i=0;i<10;i++){ const a=ang+(i+.5)*TAU/10, ca=Math.cos(a), sa=Math.sin(a), ln=Lb*(.12+.4*e), ps=[]; for(let j=0;j<5;j++){ const u=j/4; ps.push({x:x0+ca*(60+u*ln),y:y0+sa*(60+u*ln),z:hz,w:(30+110*e)*(1-u*.5)}); }
        F.ribbon(q.bmA,ps,{...C,gain:2.4,bgain:1.6,a:.4+.6*k,t0:sd+i}); }
      F.bill(m.glowO,x0,y0,hz,(160+240*e),(160+240*e),0,{...C,a:.8,gain:2.4}); }); });
  after(tN,()=>{ firing=false; beamSnd.stop(); beamSnd=NOP; hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.014;
    GFX.ambient(.5,.6,.8,40); after(.16,()=>GFX.ambient(.36,.42,.56,3)); sig.a=1.5; sig.kick();
    for(let i=0;i<10;i++){ const a=ang+(i+.5)*TAU/10+rand(-.1,.1), ca=Math.cos(a), sa=Math.sin(a), big=i%2, ln=Lb*(big?rand(.62,.8):rand(.36,.5)); K.beam(x0+ca*170,y0+sa*170,hz,x0+ca*ln,y0+sa*ln,hz,{w:big?rand(190,240):rand(110,150),dur:big?.62:.46,pal:P,gain:.8,delay:big?0:.05}); if(big) K.gash(x0+ca*200,y0+sa*200,x0+ca*ln*.8,y0+sa*ln*.8,{pal:P,life:4.6,w:180,gain:1.1,grow:.06}); }
    { const CG=col(PG), sd=Math.random()*9; GFX.add(.75,(k,tt)=>{ const up=eo3(sat(tt/.08)), f=sat((k-.45)/.55), r=105*(1+.25*Math.sin(k*PI))*(1-f*.7), al=1-f*f;
      F.lathe(m.piB,x0,y0,0,{r0:r,r1:r*1.1,h0:400,h1:400+2000*up,...CG,a:al,gain:2.2,ero:.1+f*.5,t0:sd,fd:[0,0,.12,.7]}); F.lathe(m.piC,x0,y0,0,{r0:r*.4,r1:r*.4,h0:400,h1:400+2000*up,...CG,a:al,gain:3.2,t0:sd,fd:[0,0,.12,.85]}); }); }
    K.art(x0,y0,{tex:'fx3_shock',floor:true,s:hw*.8,dur:.6,pal:PG,gain:.8,hold:.3,s0:.25}); K.art(x0,y0,{tex:'v3_xburst',floor:true,s:hw*.75,dur:.4,pal:PG,gain:.6,hold:.2,s0:.4}); K.dome(x0,y0,{r:hw*.85,dur:.5,pal:PG,gain:.8}); K.shock(x0,y0,{r:hw*.9,dur:.45,pal:PG,gain:1,dust:0});
    K.shock(x0,y0,{r:hw*1.8,dur:.6,pal:P,gain:1.2}); K.shock(x0,y0,{r:hw*2.4,dur:.85,pal:P,gain:.7,delay:.1,light:0}); K.crack(x0,y0,{r:hw*.9,pal:P,life:5,grow:.14,gain:1.2});
    GFX.ripple(x0,y0,hw*2,{life:.6,s:.9}); K.debris(x0,y0,{n:24,r:160,sp:[300,1200],up:1700,size:22}); K.dust(x0,y0,{n:20,r:120,sp:[500,1400],a:.5}); K.sparks(x0,y0,hz,{pal:P,n:40,sp:[500,2000],up:1400,life:[.3,.8]});
    GFX.light(x0,y0,hw*2,PG.l,1.3,.8,{z:260});
    Cn.sweep(x0,y0,Dm,{speed:3600}); Cn.SND.hit(1); SFX.boom(1.6,1); });
  // ---- afterglow: steam off the scorched floor, the scars cooling, the light coming back
  after(t0+T+1,()=>{ for(let i=0;i<4;i++) K.smoke(x0+rand(-260,260),y0+rand(-120,120),{s:rand(190,280),dur:rand(1.1,1.5),a:.5,c:'#18222e',c2:'#56708a',delay:i*.08}); K.embers(x0,y0,hw*.9,{pal:P,n:40,life:2.2}); GFX.ambient(.8,.84,.9,1.6); Cn.zoom(.95); });
  after(t0+T+1.45,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); sig.a=.6; });
  after(t0+T+1.75,()=>{ sig.dead=true; ultStop(); }); }

// SOLAR CRASH: a second sun gathers over him and the field suddenly has long shadows; a seal writes itself where it will land.
// He goes up after it and drives it down with his fist; where it lands the floor erupts outward ring after ring.
function ultSun(id){ ultStart(id); warm(); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, tg=b||densest(1600), [cx,cy]=X.inView(tg?tg.x:pl.x,tg?tg.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy, P=PS, C=col(P), m=K.mats(), q=mm();
  const up=k=>1-(1-k)*(1-k), dn=k=>k*k, tJ=2.2, tP=tJ+.34, tI=tP+.42, zs=BODY*5.6, R=300, aT=Math.atan2(cy-y0,cx-x0);
  S([['gy09',.2],['gy10',.85],['gy11',.85],['gy10',.3],['gy11',.3,{air:[0,330],ease:up}],['gy12',.16,{air:[330,360],kick:[2,-1.5]}],['gy13',.5,{air:[360,0],ease:dn}],['gy14',.4],['gy15',.4],['gy16',9]]);
  // ---- omen: dusk; the sun grows out of fire drawn up from the floor; shadows stretch away from it
  GFX.ambient(.4,.33,.36,3); Cn.zoom(1.05); Cn.cam(x0,y0-BODY*3.1,5); const dr=Cn.drone(58,.35); SFX.fire(2.2,.5);
  const sig=K.sigil(cx,cy,{r:540,dur:9,in:1.4,out:.5,spin:-.18,pal:PKS,tex:SEAL(),gain:.7});
  K.crack(x0,y0,{r:210,pal:P,life:5,grow:1.5});
  for(let i=0;i<3;i++) after(.2+i*.5,()=>K.shock(x0,y0,{r0:hw*(.9-i*.12),r:60,dur:.5,pal:P,gain:.5,light:0,dust:0,haze:.6,th:.6}));
  for(let i=0;i<64;i++) after(rand(0,1.8),()=>{ const a=rand(0,TAU), d=rand(260,900); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,60),tx:x0,ty:y0,tz:zs,pull:rand(3.5,5.5),life:rand(.55,.8),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*420,vy:Math.cos(a)*250,c:GFX.rgb(Math.random()<.35?'#ffffff':P.s),c2:P.b,L:3}); });
  const sun={x:x0,y:y0,z:zs,r:16,on:true}, SL=GFX.light(x0,y0,1700,'#ffb050',.2,.4,{hold:20,z:zs*.6}); let fly=-1, t=0;
  V.ultTick=dt=>{ t+=dt; if(sun.on&&Math.random()<.5){ const a=rand(0,TAU); GFX.pt({x:sun.x+Math.cos(a)*sun.r*.9,y:sun.y,z:sun.z+Math.sin(a)*sun.r*.9,vx:Math.cos(a)*rand(40,160),vz:rand(60,260),g:-40,drag:.6,life:rand(.5,1),s:rand(3,7),m:8,c:GFX.rgb(pick([P.s,P.b,'#fff6d0'])),fade:'in',L:3}); } };
  GFX.add(tI+.3,(k,tt)=>{ if(!sun.on) return;
    if(fly<0){ const g=eo3(sat(tt/1.9)); sun.r=16+(R-16)*g+5*Math.sin(tt*9)*g; } else { const e=Math.pow(sat((RT-fly)/.36),2); sun.x=mix(x0,cx,e); sun.y=mix(y0,cy,e); sun.z=mix(zs,110,e); }
    const x=sun.x, y=sun.y, z=sun.z, r=sun.r, g=r/R;
    // everything on the field throws a long shadow away from it
    let n=0; for(const e of V.en){ if(e.dead||n>=34) continue; const dx=e.x-x, dy=(e.y-y)/FSY, l=Math.hypot(dx,dy)||1; if(l>1700) continue; n++; const len=Math.min(520,110+l*.3)*g; F.quad(m.dark,e.x+dx/l*len*.5,e.y+dy/l*len*.5*FSY,len*.62,e.d.r*.62,Math.atan2(dy,dx),{a:.5}); }
    F.quad(m.glowG,x,y,r*2.8,r*2.8,0,{...C,a:.5*g,gain:1});
    F.bill(m.glowO,x,y,z,r*3,r*3,0,{...C,a:.5,gain:1.3});
    F.bill(q.sun,x,y,z,r*1.75,r*1.75,-tt*.22,{a:.5,ero:-1,soft:.01,gain:1});
    F.bill(q.sun,x,y,z,r*1.25,r*1.25,tt*.35,{a:1,ero:-1,soft:.01});
    F.bill(m.glowO,x,y,z,r*.9,r*.9,0,{cA:'#ff6a10',cB:'#ffd060',cC:'#ffffff',a:.5,gain:2});
    if(fly>=0) K.sparks(x,y,z,{pal:P,n:3,dir:aT+PI,spread:.7,sp:[200,800],up:300,life:[.2,.5],g:300});
    SL.x=x; SL.y=y; SL.z=z*.6; SL.a=.2+1.1*g; });
  // ---- release: he goes up to it and drives it down
  after(tJ,()=>{ Cn.zoom(.94); Cn.cam((x0+cx)/2,(y0+cy)/2-BODY*1.6,6); sfx('whoosh',.6,1); sig.a=1.3; sig.kick();
    K.dust(x0,y0,{n:10,r:30,sp:[250,700]}); K.shock(x0,y0,{r:300,dur:.3,pal:PG,gain:.6,light:0});
    K.shock(cx,cy,{r0:640,r:120,dur:tI-tJ,pal:PG,gain:.7,light:0,dust:0,haze:.4});
    GFX.add(tI-tJ,k=>F.quad(m.dark,cx,cy,R*(1.9-k*.6),R*(1.9-k*.6),0,{a:.15+.5*k*k})); });
  after(tP,()=>{ hitstop=Math.max(hitstop,.07); Cn.shake(.8); post.ca=.01; Cn.SND.hit(.6);
    K.art(x0,y0,{tex:'v3_thrust',s:120,asp:2.5,z:(zs+520)/2,lift:0,rot:-PI/2,dur:.3,pal:PG,gain:1,hold:.3,s0:.6}); K.art(x0,y0,{tex:'v3_xburst',s:330,z:zs-R*.9,lift:0,dur:.26,pal:PG,gain:.8,hold:.2,s0:.5}); K.flare(x0,y0,zs-R*.9,{pal:PG,s:240,dur:.2,gain:2.5});
    K.sparks(x0,y0,zs-R*.8,{pal:PG,n:26,dir:aT,spread:1.2,sp:[500,1700],up:500}); });
  after(tP+.06,()=>{ fly=RT; dr.stop(.1); Cn.cam(cx,cy-BODY,10); Cn.zoom(.84); sfx('whoosh',.45,1);
    const tl=K.beam(x0,y0,zs,x0,y0,zs,{w:250,dur:.75,pal:P,gain:.8}); GFX.add(.4,()=>{ tl.x2=sun.x; tl.y2=sun.y; tl.z2=sun.z; }); });
  // ---- climax: the sun lands; the floor gives way and erupts outward, ring after ring
  after(tI,()=>{ sun.on=false; SL.hold=0; SL.life=.01; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014;
    GFX.ambient(.62,.46,.36,40); after(.16,()=>GFX.ambient(.44,.34,.34,3)); sig.pal=PGS; sig.a=1.5; sig.kick(); GFX.light(cx,cy,hw*2.2,P.l,1.3,.9,{z:260});
    K.burst(cx,cy,{s:460,pal:P,scar:6,no:['smoke']}); K.pillar(cx,cy,{r:130,h:2400,dur:.5,pal:P,gain:.4}); for(let i=0;i<3;i++) K.smoke(cx+rand(-200,200),cy+rand(-60,60),{s:rand(300,400),dur:rand(1.2,1.7),delay:.15+i*.08,a:.7,rise:380,c:'#1c120c',c2:'#4a3020'});
    GFX.add(5,k=>F.quad(m.dark,cx,cy,520,520,0,{a:.55*sat(k*30)*(1-k)})); K.flame(cx,cy,{s:1000,dur:1.15,pal:P,gain:1.1}); K.flame(cx-150,cy+30,{s:620,dur:.95,pal:P,light:0,delay:.05}); K.flame(cx+170,cy+20,{s:560,dur:.9,pal:P,light:0,delay:.08});
    K.dome(cx,cy,{r:hw*.95,dur:.55,pal:P,gain:.8}); K.shock(cx,cy,{r:hw*2.4,dur:.9,pal:P,gain:.8,delay:.08,light:0}); K.crack(cx,cy,{r:hw*.95,pal:P,life:6,grow:.16,gain:1.2});
    GFX.ripple(cx,cy,hw*2,{life:.6,s:.9}); K.debris(cx,cy,{n:26,r:200,sp:[300,1300],up:1900,size:24}); K.dust(cx,cy,{n:20,r:160,sp:[500,1500],a:.5,c:'#3a2c24'});
    const a1=rand(0,TAU); for(let i=0;i<6;i++){ const a=a1+i*TAU/6+rand(-.15,.15), ca=Math.cos(a), sa=Math.sin(a); K.gash(cx+ca*330,cy+sa*330,cx+ca*1500,cy+sa*1500,{pal:P,life:5.5,w:150,gain:1.1,grow:.2}); }
    [[430,5],[860,6],[1300,8]].forEach(([rr,nn],j)=>{ const ph=rand(0,TAU); for(let i=0;i<nn;i++){ const a=ph+(i+rand(-.3,.3))*TAU/nn, r2=rr*rand(.82,1.18), px=cx+Math.cos(a)*r2, py=cy+Math.sin(a)*r2*FSY, dl=r2/3200+rand(0,.05);
        K.flame(px,py,{s:rand(210,400)*(1-.08*j),dur:rand(.8,1.3),pal:P,light:i%3?0:1,delay:dl}); after(dl,()=>{ K.sparks(px,py,20,{pal:P,n:5,sp:[200,700],up:1300}); if(i%2) K.debris(px,py,{n:3,sp:[150,500],up:1100}); }); } });
    Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}); Cn.SND.hit(1); SFX.boom(1.8,1); SFX.fire(2,.6); });
  // ---- afterglow: the crater still burns; embers come down through the returning light
  after(tI+.7,()=>{ K.embers(cx,cy,hw,{pal:P,n:60,life:2.6,up:320}); for(let i=0;i<4;i++) K.smoke(cx+rand(-300,300),cy+rand(-140,140),{s:rand(220,320),dur:rand(1.2,1.7),a:.6,delay:i*.1,c:'#1c120c',c2:'#4a3020'}); GFX.add(1.8,k=>{ sig.a=1-k*.9; }); GFX.light(cx,cy,1000,'#ff7a20',.8,.5,{hold:1.2,flick:.2,z:80}); GFX.ambient(.8,.72,.7,1.6); Cn.zoom(.95); });
  after(tI+1.9,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(tI+2.5,()=>{ sig.dead=true; ultStop(); }); }

X.reg('fist',{sk,order,basic:{fn:basic,cd:()=>.5*(1-.05*(L('fs_basic')-1))},skills:SKILL,ults:{fs_ult1:ultBeam,fs_ult2:ultSun}});
})();
