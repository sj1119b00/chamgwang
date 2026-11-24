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
// PL lava going cold: the scars Solar Crash leaves
const PL={d:'#160200',b:'#d42006',m:'#ff8a1c',h:'#ffe6a0',l:'#ff5a20',s:'#ffb070'};
// seals are dense line art: their hot tone stays coloured so the whole disc does not go white
const PKS={...PK,b:'#0f86dc',m:'#4fc0ff',h:'#8fdcff'}, PGS={...PG,b:'#f09a08',m:'#ffc94a',h:'#ffe08a'}, PVS={...K.PAL.silver,d:'#050a18',b:'#3f5fa8',m:'#8fa8e8',h:'#ffffff'};
const PI=Math.PI, sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5;
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
// a direction on screen (the game's x, y) as an angle in true floor units, and a screen length along it in floor units
const fa=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a)), fl=(a,len)=>Math.hypot(Math.cos(a)*len,Math.sin(a)*len/FSY);
const SEAL=()=>F.ready('v3_circ_fist')?'v3_circ_fist':'fx_circle_seal';
if(F&&F.on) for(const t of ['fx_sun','v3_scorch_ring','v3_burst_fire']) F.img(t);
const GAIN0=window.GFX?GFX.gain:1.25;
let MM=null;
function mm(){ if(MM) return MM; const m=K.mats(), M=F.mat; return MM={
  // beam: the painted beam with streaks racing down it, a filled body, a thin hot spine
  bmA:M({...m.art,tex:'fx3_beam',layer:'o',nz:'streak',n1:[3,1,-5,0],n2:[2,1,-3,0],dist:.03,mdist:1,nk:.4,rk:[.5,1.05]}),
  bmB:M({...m.trB,n1:[2,.8,-6,0],n2:[2,1,-3,0],fd:[.02,.3,0,0]}),
  bmC:M({...m.trC,n1:[1,.5,-8,0],fd:[.01,.3,0,0]}),
  // the light a beam throws on the floor under it
  strip:M({nz:'streak',n1:[3,1,-4,0],nk:.6,ero:.02,soft:.6,pm:[2,1.5,0,0],fd:[.03,.3,0,0],rk:[.7,1.2],gain:1.1,bgain:.9,layer:'g'}),
  orb:M({...m.art,tex:'v3_orb',layer:'o',nz:'wisp',n1:[1.5,1.5,.3,.1],nk:.25,rk:[.5,1.05]}),
  // the diving sun's tail, and the crater it leaves (dark bowl, then the molten cracks cooling)
  tail:M({...m.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[2,1,-1.6,0],n2:[1.5,1,-1,0],dist:.05,mdist:1,nk:.3,rk:[.5,1.05]}),
  // heat haze round a beam (refraction layer), and the ring a sweeping beam burns into the floor: soot, then embers in its cracks
  haze:M({...m.shD,n1:[6,1,-4,0],pm:[2,1.2,0,0],nk:.7}),
  sootW:M({nz:'fbm',n1:[4,2.5,0,0],n2:[2,2,0,0],dist:.12,nk:1,ero:.2,soft:.5,fd:[.03,.01,.2,.5],cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  emberW:M({nz:'veins',n1:[3,2,0,0],n2:[2,2,.02,.01],dist:.06,nk:1,pw:2.6,ero:.3,soft:.3,fd:[1,.01,.2,.5],rk:[.6,1.35],gain:1.5,bgain:1.1,layer:'g'}),
  sheath:M({nz:'wisp',n1:[3,1,-4,0],n2:[2,1,-2,0],dist:.1,nk:.9,ero:.18,soft:.35,pm:[2,1.1,0,0],fd:[.1,.1,0,0],cA:'#01050f',cB:'#03123a',cC:'#07306e',op:1,layer:'o'}),
  fistP:M({...m.art,tex:'v3_fist_punch',layer:'o',nz:'streak',n1:[2,1,-3,0],nk:.2,rk:[.5,1.05]}),
  xb:M({...m.art,tex:'v3_xburst',layer:'o',rk:[.5,1.05]}),
  // the sun's darkened limb, and low fire standing on a floor circle
  limb:M({nk:0,ero:0,soft:.9,cA:'#3a0800',cB:'#3a0800',cC:'#3a0800',op:1,layer:'o'}),
  cell:M({nz:'cells',n1:[2.4,2.4,.03,.02],n2:[1.5,1.5,.04,.03],dist:.08,nk:1,pw:1.4,ero:.35,soft:.4,cA:'#5a1400',cB:'#5a1400',cC:'#5a1400',op:1,layer:'o'}),
  prom:M({...m.art,tex:'fx3_fire',layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.09,mdist:1,rk:[.55,1.05]}),
  swirlG:M({...m.art,tex:'v3_spin_ring',layer:'g',nz:'wisp',n1:[1.5,1.5,.3,.1],nk:.3,rk:[.5,1.05]}),
  lance:M({...m.art,tex:'v3_thrust',layer:'o',nz:'streak',n1:[2,1,-3,0],nk:.3,rk:[.5,1.05]}),
  funnel:M({...m.piB,n1:[2,.7,1.5,-1.1],n2:[2,1,.8,-.5],fd:[0,0,.05,.55]}),
  torn:M({...m.art,tex:'v3_vortex_wisps',layer:'o',nz:'wisp',n1:[1.5,1,.9,-.4],n2:[1.3,1,.6,-.3],dist:.07,mdist:1,nk:.3,rk:[.5,1.05]}),
  sun:M({kind:2,tex:'fx_sun',nz:'fbm',n1:[2.5,2.5,0,.1],n2:[1.6,1.6,.06,.09],dist:.035,mdist:1,cB:'#ffffff',cC:'#000000',gain:1.2,op:0,layer:'o'}),
}; }
// ORB: a ball of compressed ki - halo, the painted sphere turning against a second copy of itself, a white heart. Call every frame it is alive.
function orbDraw(x,y,z,r,P,a=1,g=1){ if(!F.on) return; const m=K.mats(), q=mm(), C=col(P);
  F.bill(m.glowO,x,y,z,r*2.4,r*2.4,0,{...C,a:.55*a,gain:1.3*g});
  F.bill(q.orb,x,y,z,r*2,r*2,RT*5,{...C,a,gain:2.6*g});
  F.bill(q.orb,x,y,z,r*1.35,r*1.35,-RT*8,{...C,a:.8*a,gain:2.8*g,uvT:[-1,1,1,0]});
  F.bill(m.glowO,x,y,z,r*.5,r*.5,0,{cA:P.b,cB:P.h,cC:'#ffffff',a,gain:3*g}); }
// RAY: a short-lived painted beam between two points; it swells and burns away through the noise instead of thinning to a line
//  o: {w, dur, pal, gain, taper (how much narrower the far end is), delay}
function ray(x1,y1,z1,x2,y2,z2,o={}){ if(!F.on) return; const q=mm(), C=col(o.pal||PK), dur=o.dur||.4, w=o.w||90, g=o.gain||1, sd=Math.random()*9, tp=o.taper??.35, flip=Math.random()<.5;
  GFX.add(dur,(k,t)=>{ const i=eo5(sat(t/.07)), f=sat((k-.4)/.6), ps=[], n=8; for(let j=0;j<n;j++){ const u=j/(n-1)*i; ps.push({x:mix(x1,x2,u),y:mix(y1,y2,u),z:mix(z1,z2,u),w:w*(1+.25*f)*(1-tp*u)*(.35+.65*sat(u*8))*(1+.08*Math.sin(t*50+j))}); }
    F.ribbon(q.bmA,ps,{...C,a:1-f*f,gain:2.6*g,bgain:1.5,ero:.1+f*.75,nk:.4+f*.5,t0:sd,uvT:flip?[1,-1,0,1]:[1,1,0,0]}); },o.delay||0); }
// LANCE: the painted thrust (pressure rings on a spear of force) laid along a direction from a point, tilted up toward the camera
//  o: {pal, dur, h (half height), lean, gain, hold, delay}
function lance(x,y,z,a,len,o={}){ if(!F.on) return; const q=mm(), C=col(o.pal||PK), dur=o.dur||.28, h=o.h||len*.2, A2=fa(a), Lf=fl(a,len), g=o.gain||1, sd=Math.random()*9, ca=Math.cos(a), sa=Math.sin(a), hold=o.hold??.4, lean=(o.lean??.5)*Math.abs(ca);
  GFX.add(dur,k=>{ const e=eo5(sat(k/.35)), f=sat((k-hold)/(1-hold)), u=mix(.35,1,e), hl=Lf*u/2;
    F.quad(q.lance,x+ca*len*u/2,y+sa*len*u/2,hl,h,0,{z,M:F.xfw({sx:hl,sy:h*(1+f*.3),rx:-lean,rz:A2}),...C,a:1-f*f,gain:3*g,ero:.08+f*.7,nk:.3+f*.5,t0:sd}); },o.delay||0); }
// FIST: the painted fist of ki (rings trailing behind it) thrown along a direction from a point
function fist(x,y,z,a,len,o={}){ if(!F.on) return; const q=mm(), C=col(o.pal||PK), dur=o.dur||.22, h=o.h||len*.3, A2=fa(a), Lf=fl(a,len), g=o.gain||1, sd=Math.random()*9, ca=Math.cos(a), sa=Math.sin(a), lean=(o.lean??.5)*Math.abs(ca), up=ca<0?-1:1;
  GFX.add(dur,k=>{ const e=eo5(sat(k/.3)), f=sat((k-.45)/.55), u=mix(.45,1,e), hl=Lf*.5;
    F.quad(q.fistP,x+ca*len*(u-.5),y+sa*len*(u-.5),hl,h,0,{z,M:F.xfw({sx:hl,sy:h*up,rx:-lean,rz:A2}),...C,a:1-f*f,gain:1.9*g,ero:.08+f*.7,nk:.2+f*.6,t0:sd}); },o.delay||0); }
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

function basic(){ const e=nearest(360); if(!e) return false; const a=angTo(e), n=V.chain++%4, up=n===3, d=900*A.mul('fs_basic')*(up?2.4:1); face(a);
  S(PUNCH[n],true); if(!V.steer&&Math.hypot(e.x-pl.x,e.y-pl.gy)>200) V.dash={x0:pl.x,y0:pl.gy,x1:e.x-Math.cos(a)*120,y1:e.y-Math.sin(a)*120,t:0,dur:.08,soft:true}; /* the step-in never fights the stick */
  after(up?.2:.1,()=>{ const x=pl.x+Math.cos(a)*150, y=pl.gy+Math.sin(a)*150; sfx('boom',up?.9:.5,.5); sfx('whoosh',1.5,.4);
    if(up){ blow(x,y,2,PG); ray(x,y,20,x,y,460,{w:95,dur:.3,pal:PG}); K.shock(x,y,{r:270,dur:.3,pal:PG,gain:.8,dust:5,light:0,painted:0}); K.sparks(x,y,BODY*.5,{pal:PG,n:8,sp:[80,380],up:1500,life:[.25,.5]}); }
    else { blow(x,y,1.4,PK); ray(pl.x+Math.cos(a)*40,pl.gy+Math.sin(a)*40,BODY*.55,x,y,BODY*.5,{w:54,dur:.17,pal:PK,taper:0}); lance(pl.x+Math.cos(a)*30,pl.gy+Math.sin(a)*30,BODY*.55,a,190,{pal:PK,dur:.16,h:70}); }
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
  GFX.add(3.25,(k,t)=>{ if(lock) return; const x=pl.x, y=pl.gy, a=sat(t/.2)*sat((3.2-t)/.25), fr=Math.floor(t/.09)%2;
    F.quad(q.swirlG,x,y,R*1.15,R*1.15,-t*9,{...C,a:.9*a,gain:2.2});
    if(!F.low) F.lathe(q.funnel,x,y,0,{r0:R*.42,r1:R*1.05,h0:0,h1:R*1.6,...C,a:.14*a,gain:1.1,rk:[.6,1.3],t0:sd});
    F.bill(q.torn,x,y,R*1.25,R*.9,R*1.3,0,{...C,a:.8*a,gain:2,t0:sd,uvT:fr?[-1,1,1,0]:[1,1,0,0]});
    Lt.x=x; Lt.y=y; }); }
// iron body: a golden sheath rising round him, the ring of its reach on the floor
function aura(T){ if(!F.on) return; const m=K.mats(), q=mm(), C=col(PG), sd=Math.random()*9, Lt=GFX.light(pl.x,pl.gy,620,PG.l,.55,.4,{hold:T,z:120});
  GFX.add(T,(k,t)=>{ if(lock) return; const x=pl.x, y=pl.gy, a=sat(t/.25)*sat((T-t)/.4), pu=.85+.15*Math.sin(t*9);
    F.quad(m.glowG,x,y,250,250,0,{...C,a:.35*a,gain:.8});
    F.ring(m.shL,x,y,196,236,{...C,a:.6*a*pu,gain:1.8,t0:sd});
    F.bill(q.torn,x,y,215,150,215,0,{...C,a:.5*a*pu,gain:1.5,rk:[.6,1.3],t0:sd,uvT:Math.floor(t/.22)%2?[-1,1,1,0]:[1,1,0,0]});
    Lt.x=x; Lt.y=y; }); }

const SKILL={
  fs_dash:{moves:true,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+80), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, z=BODY*.55; face(a);
    S(PUNCH[1]); const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.11}; G.inv=Math.max(G.inv,.35); sfx('whoosh',1.3,.7);
    lance(x0,y0,z,a,Ld+150,{pal:PK,dur:.36,h:150,lean:.45,gain:1.2}); ray(x0,y0,z,x1,y1,z,{w:96,dur:.38,pal:PK,taper:0}); K.dust(x0,y0,{n:6,dir:a+PI,spread:.5,sp:[200,520],a:.4}); GFX.light((x0+x1)/2,(y0+y1)/2,Ld*.9,PK.l,.7,.3,{z});
    after(.12,()=>{ inLine(x0,y0,x1,y1,90,o=>{ dmg(o,d*.6,{kb:.6,sx:x0,sy:y0}); hitFx(o,C1,1); });
      const x=x1+Math.cos(a)*110, y=y1+Math.sin(a)*110, r=EVO(id)?330:200; blow(x,y,1.7,PG); sfx('boom',1.2,.8); trauma=Math.min(1,trauma+.35);
      K.shock(x,y,{r:r*1.25,dur:.38,pal:PG,gain:.9}); K.crack(x,y,{r:r*.75,pal:PG,life:2.6}); K.debris(x,y,{n:6,sp:[200,600],up:800});
      if(EVO(id)){ K.dome(x,y,{r,dur:.36,pal:PG,gain:.7,hk:.5}); K.art(x,y,{tex:'fx3_shock',floor:true,s:r*1.2,dur:.45,pal:PG,gain:.8,s0:.3}); }
      inCircle(x,y,r,o=>{ dmg(o,d,{kb:1.6,big:true,sx:x1,sy:y1}); hitFx(o,C2,1.3); }); }); }},
  fs_upper:{fn(id){ const e=nearest(380); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?300:220, cx=pl.x+Math.cos(a)*180, cy=pl.gy+Math.sin(a)*180; face(a);
    S(PUNCH[3]); after(.2,()=>{ K.cres(cx-pl.f*R*.75,cy,BODY*1.2,{reach:R*1.15,dir:pl.f>0?0:PI,lean:.86,tex:'v3_slash_heavy',pal:PG,swing:.07,hold:.07,fade:.3,gain:.9,ccw:pl.f>0,sparks:8}); ray(cx,cy,20,cx,cy,R*3.4,{w:R*.5,dur:.4,pal:PG}); K.art(cx,cy,{tex:'v3_xburst',s:R*.8,z:BODY*.4,lift:0,dur:.22,pal:PG,gain:.7,hold:.2,s0:.5});
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
      const z=BODY*rand(.45,.8), big=i===n-1; fist(pl.x+Math.cos(b)*40,pl.gy+Math.sin(b)*40,z,b,(r+40)*(big?1.25:1),{pal:P,dur:big?.3:.2,h:rand(105,135)*(big?1.4:1)}); blow(x,y,i===n-1?1.8:1.2,P,{z}); if(i===n-1) K.shock(x,y,{r:270,dur:.3,pal:P,gain:.8,light:0,painted:0,dust:4}); sfx('boom',.4,.35);
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
      onTick:z=>{ K.embers(z.x,z.y,150,{pal:PG,n:6,life:1.2}); K.shock(z.x,z.y,{r:250,r0:70,dur:.3,pal:PG,gain:.5,light:0,dust:0,haze:.3,painted:0}); K.dome(z.x,z.y,{r:170,r0:120,dur:.28,pal:PG,gain:.45,hk:1.2}); }}); }},
  fs_giga:{fn(id){ const e=nearest(700); if(!e) return false; const a=angTo(e), d=D(id), Lg=900, ca=Math.cos(a), sa=Math.sin(a), z=BODY*.6; face(a); charge(); sfx('rise',1,.6);
    gather(pl.x+ca*50,pl.gy+sa*50,z,20,PG,.35,200,520); GFX.add(.45,k=>orbDraw(pl.x+ca*50,pl.gy+sa*50,z,10+60*k,PG,1,.85)); K.shock(pl.x,pl.gy,{r0:440,r:60,dur:.42,pal:PG,gain:.6,light:0,dust:0,haze:.4,th:.6});
    after(.45,()=>{ const px=pl.x, py=pl.gy, x1=px+ca*Lg, y1=py+sa*Lg;
      lance(px,py,z,a,Lg+80,{pal:PG,dur:.42,h:300,gain:1.1}); ray(px+ca*60,py+sa*60,z,x1,y1,z,{w:190,dur:.42,pal:PG,taper:.2});
      K.art(px+ca*150,py+sa*150,{tex:'v3_xburst',s:250,z,lift:0,dur:.26,pal:PG,gain:.9,s0:.5}); K.gash(px+ca*120,py+sa*120,x1,y1,{pal:PG,life:2.8,w:120});
      K.shock(px,py,{r:420,dur:.4,pal:PG}); K.dust(px,py,{n:8,dir:a+PI,spread:.7,sp:[300,800]}); for(let i=1;i<=4;i++) K.debris(px+ca*Lg*i/5,py+sa*Lg*i/5,{n:3,sp:[150,500],up:900});
      GFX.light(px+ca*Lg*.5,py+sa*Lg*.5,Lg*.9,PG.l,1.1,.4,{z}); trauma=1; hitstop=.06; sfx('boom',1.8,1);
      inLine(px,py,x1,y1,140,o=>{ dmg(o,d,{kb:2,big:true,launch:600}); hitFx(o,C2,1.5); });
      if(EVO(id)) for(let i=1;i<=5;i++) after(i*.07,()=>{ const x=px+ca*Lg*i/5, y=py+sa*Lg*i/5; K.burst(x,y,{s:130,pal:PK,no:['smoke','crack','debris']}); inCircle(x,y,170,o=>dmg(o,d*.4,{kb:.8,sx:x,sy:y})); }); }); }},
};

/// ---- ultimates. Each is one staged sequence: omen -> release -> development -> climax -> afterglow
const easeIO=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
// a floor angle that keeps counting past a full turn (fa() wraps)
const fac=a=>{ const f=fa(a); return f+TAU*Math.round((a-f)/TAU); };
// how far a ray from a screen point runs before it leaves the picture (a little inside the edge; the tilted camera shows less near the bottom)
function reachOf(x,sy,ca,sa,max){ const v=view(), tl=post.tilt||0, mx=v.hw*(1-tl)*.88, ex=(ca>0?cam.x+mx:cam.x-mx)-x, ey=(sa>0?cam.y+v.hh*.7*(1-tl)/(1+tl*.5):cam.y-v.hh*.84*(1-tl*.5))-sy; return Math.max(300,Math.min(Math.abs(ca)>.02?ex/ca:1e9,Math.abs(sa)>.02?ey/sa:1e9,max)); }
// SCAR: painted floor damage from one grey mask: the dark break, and the light inside it that cools (lives on after the ultimate)
function scar(tex,x,y,r,o={}){ if(!F.on) return; const m=K.mats(), D=F.mat({...m.crD,tex}), E=F.mat({...m.crE,tex}), C=col(o.pal||PK), life=o.life||6, rot=o.rot??rand(0,TAU), ry=r*(o.ry||1), g=o.gain||1;
  GFX.add(life,(k,tt)=>{ const i=eo3(sat(tt/(o.grow??.15))), heat=Math.pow(1-k,1.6), out=sat((1-k)/.25); F.quad(D,x,y,r*i,ry*i,rot,{a:(o.dark??.7)*out}); F.quad(E,x,y,r*i,ry*i,rot,{...C,a:Math.min(1,heat*1.4),gain:2.4*g*(.4+.6*heat),ero:.1+.5*(1-heat)}); },o.delay||0); }
// the finisher throws everything that is not too heavy into the air, away from the blow, a moment before the damage arrives
function launch(x,y,R){ for(const e of V.en){ if(e.dead||e.d.heavy) continue; const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy)||1; if(l>R) continue; e.vz=Math.max(e.vz,rand(900,1600)); e.kx+=dx/l*520; e.ky+=dy/l*520; e.stun=Math.max(e.stun,1.2); } }
// HYPER BEAM: the seal is written and then squeezed as he compresses the ki of the whole field between his hands; one sustained roar
// of light he has to lean into, thick at his hands and thinner far out, dragged right round the field: the floor opens under it,
// stones stand up behind it, a ring of burnt rock is left. It chokes; the field dims; the last of it goes in one pulse down the same
// line while the floor round him breaks upward.
function ultBeam(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), Lb=Math.hypot(hw,hh)*1.25, e0=nearest(1600), a0=e0?angTo(e0):0, x0=pl.x, y0=pl.gy, hz=BODY*.62, P=PK, C=col(P), m=K.mats(), q=mm(); face(a0);
  const S0=[['gx01',.1],['gx02',.14],['gx03',.2],['gx04',1.35,{kick:[-.8,.6]}],['gx08',.1,{kick:[2.2,-1.8]}]]; for(let i=0;i<9;i++) S0.push(['gx'+String(9+i%4).padStart(2,'0'),.3]); S0.push(['gx13',.6],['gx14',9]); S(S0);
  const T=2.5, t0=1.85, tF=t0+.09, dir=pl.f>0?1:-1, hx=x0+pl.f*46, Rf=1250, aS=fac(a0), SR=F.ready('v3_scorch_ring'), srD=SR&&F.mat({...m.crD,tex:'v3_scorch_ring'}), srE=SR&&F.mat({...m.crE,tex:'v3_scorch_ring'});
  // ---- omen, close on him: each beat the cracks spread, the camera closes, the seal is squeezed tighter, the orb and its light grow
  GFX.ambient(.3,.36,.52,3.2); const spot=GFX.light(x0,y0,300,P.l,.4,.6,{hold:9,z:130,flick:.12});
  const sig=K.sigil(x0,y0,{r:hw*.52,dur:9,in:.85,out:.5,spin:.3,pal:PVS,tex:SEAL(),gain:.75,hole:.2});
  Cn.tilt(.04,2); Cn.zoom(1.2); Cn.cam(x0,y0-BODY*.6,5); Cn.roll(.03); const dr=Cn.drone(52,.4); SFX.rumble(1.7); Cn.SND.inhale(1.7,.4);
  [[0,170,1.26],[.45,270,1.34],[.9,380,1.42],[1.35,500,1.5]].forEach(([at,r,z],i)=>after(at,()=>{ K.crack(x0,y0,{r,pal:P,life:5-at,grow:.4,gain:.8+.15*i}); Cn.zoom(z); K.debris(x0,y0,{n:3+i*2,r:r*.6,sp:[60,260],up:500+200*i}); K.dust(x0,y0,{n:4+i*2,r:r*.5,sp:[120,380],a:.35,c:'#141c2a'}); }));
  [.1,.55,.95,1.25,1.5,1.7].forEach((at,i)=>after(at,()=>{ K.shock(x0,y0,{r0:hw*(1.15-i*.1),r:70,dur:.44-i*.03,pal:P,gain:.45+.12*i,light:0,dust:0,painted:0,haze:.5,th:.6}); sig.kick(); }));
  gather(hx,y0,hz,36,P,.9); after(.9,()=>gather(hx,y0,hz,70,P,.85,300,1000));
  for(let i=0;i<24;i++) after(rand(0,1.5),()=>{ const a=rand(0,TAU), d=rand(140,540); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(260,600),g:0,drag:rand(1.6,2.4),life:4,s:rand(12,32),rot:rand(0,TAU),vr:rand(-2,2),m:11,b:'alpha',c:GFX.rgb('#56627a'),c2:'#0a1626',shadow:true,fk:4,L:2,tag:'fr'}); });
  let t=0, firing=false, choke=false, ang=a0, wv=1, bt=0, lastT=RT, aNow=aS, hot=0, tEnd=0, up=0; V.ultTick=dt=>{ t+=dt; if(t<1.8) Cn.shake(.1+t*.12); };
  GFX.add(tF,(k,tt)=>{ const e=k*k; orbDraw(hx,y0,hz,12+100*e+(4+8*k)*Math.sin(tt*(24+30*k)),P,1,.9); spot.a=.4+.75*k; spot.r=300+850*e; sig.r=hw*mix(.52,.3,eo3(sat((tt-.85)/(tF-.85)))); });
  after(t0,()=>{ K.flare(hx,y0,hz,{pal:P,s:70,sx:6,sy:.3,dur:.14,gain:5}); Cn.SND.tick(1.4,.3); });
  // the ring of burnt rock the beam leaves: revealed behind it, hottest under it, re-lit by the last blow, then cooling
  GFX.add(T+6.5,(k,tt)=>{ const arc=Math.abs(aNow-aS); if(arc<.02) return; const out=sat((T+6.5-tt)/1.2), cool=tEnd?Math.pow(sat(1-(RT-tEnd)/4.2),1.5):1;
    if(SR){ const aw=[.5,.5,-aS,aNow>aS?-1:1], aw2=[arc>TAU*.97?1.3:Math.max(0,arc/TAU-.02),0,.09,1]; F.quad(srD,x0,y0,Rf*.92,Rf*.92,0,{a:.85*out,aw,aw2}); F.quad(srE,x0,y0,Rf*.92,Rf*.92,0,{...C,a:Math.min(1,cool*1.3),gain:2.2*(.35+.65*cool),ero:.1+.4*(1-cool),aw,aw2:[aw2[0],tEnd?0:Math.max(0,aw2[0]-.3)*(1-hot),.25,1]}); }
    else { F.ring(q.sootW,x0,y0,190,Rf,{a0:aS,a1:aNow,a:.5*out,n1:[9*arc/TAU,2.2,0,0],n2:[4*arc/TAU,2,0,0]});
      F.ring(q.emberW,x0,y0,190,Rf,{a0:aS,a1:aNow,...C,a:cool,gain:1.5*(.4+.6*cool),n1:[11*arc/TAU,2.6,0,0],n2:[4*arc/TAU,2,.02,.01],fd:[tEnd?mix(1,.04,hot):1,.01,.1,.3]}); } },tF);
  // ---- release, wide and tilted: the beam, and the same sweep of damage as ever
  after(tF,()=>{ firing=true; dr.stop(.1); Cn.tilt(.2,5); Cn.zoom(.68); Cn.cam(null); Cn.roll(0); beamSnd=SFX.beam(1); hitstop=Math.max(hitstop,.08); Cn.shake(1); post.ca=.012; Cn.SND.hit(.7);
    spot.hold=0; spot.life=.2; GFX.ambient(.4,.48,.66,30); after(.14,()=>GFX.ambient(.3,.36,.52,5)); sig.r=hw*.47; sig.a=1.4; sig.kick();
    const c0=Math.cos(a0), s0=Math.sin(a0), sd=Math.random()*9;
    K.art(x0+c0*130,y0+s0*130,{tex:K.btex?K.btex():'v3_xburst',s:hw*.36,z:hz,lift:0,dur:.3,pal:P,gain:.6,hold:.2,s0:.5});
    K.shock(x0,y0,{r:hw*1.4,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.5,{life:.45,s:.7}); K.dust(x0,y0,{n:12,r:60,dir:a0+PI,spread:1,sp:[400,1100],c:'#141c2a'}); K.debris(x0,y0,{n:10,r:120,sp:[200,700],up:900,size0:8,size:26});
    for(const p of GFX.pts) if(p.tag==='fr'){ const dx=p.x-x0, dy=p.y-y0, l=Math.hypot(dx,dy)||1, s=rand(500,1200); p.vx=dx/l*s; p.vy=dy/l*s; p.vz=rand(200,800); p.g=2600; p.drag=.25; p.bounce=.38; p.vr=rand(-10,10); p.life=p.t+rand(1,1.6); }
    const BL=[.15,.55,1].map(()=>GFX.light(x0,y0,900,P.l,0,.25,{hold:T+1.2,z:200}));
    GFX.add(T+1.2,(k,tt)=>{ if(!firing){ for(const l of BL){ l.hold=0; l.life=.01; } return; }
      const tb=Math.min(T,bt+Math.min(.06,RT-lastT)), av=a0+TAU*easeIO(Math.min(1,tb/T))*dir, ca=Math.cos(av), sa=Math.sin(av), len=reachOf(x0,y0-hz,ca,sa,Lb)*eo3(sat(tt/.1)), A2=fa(av), Lf=fl(av,len);
      wv+=((choke?.4:(1+.6*tb/T)*(1+.1*Math.sin(tt*11)))-wv)*.2; aNow=fac(av);
      // thick at his hands, thinner far out, with swells running down its length
      const rib=(w,n,tp,s0=.45)=>{ const ps=[]; for(let i=0;i<n;i++){ const u=i/(n-1); ps.push({x:x0+ca*(70+u*(len-70)),y:y0+sa*(70+u*(len-70)),z:hz,w:w*wv*(s0+(1-s0)*sat(u*9))*(1-tp*u)*(1+.11*Math.sin(u*17-tt*26))}); } return ps; };
      // the floor under it: a strip of light and the trench it is cutting
      F.quad(q.strip,x0+ca*len/2,y0+sa*len/2,Lf/2,340*wv,A2,{...C,a:.8,gain:1.2,t0:sd});
      if(m.gaD&&m.gaE){ F.quad(m.gaD,x0+ca*(len*.5+60),y0+sa*(len*.5+60),Lf*.46,170*wv,A2,{a:.8}); F.quad(m.gaE,x0+ca*(len*.5+60),y0+sa*(len*.5+60),Lf*.46,170*wv,A2,{...C,a:1,gain:2.4,ero:.12}); }
      if(!F.low) F.ribbon(q.haze,rib(660,8,.3),{a:.8,gain:.05,t0:sd});
      F.ribbon(q.sheath,rib(760,12,.4,.12),{a:.8,t0:sd});
      const fr=Math.floor(tt*14)%2;
      F.ribbon(q.bmA,rib(540,12,.5),{...C,gain:2,bgain:1.6,t0:sd,uvT:fr?[1,-1,0,1]:[1,1,0,0]}); F.ribbon(q.bmA,rib(350,12,.5),{...C,gain:2.2,bgain:1.5,t0:sd+4,uvT:fr?[1,1,.13,0]:[1,-1,.13,1]});
      F.ribbon(q.bmB,rib(170,12,.62),{...C,gain:1.9,t0:sd,fd:[.02,.05,0,0]}); F.ribbon(q.bmC,rib(58,12,.62),{...C,gain:3,t0:sd,fd:[.01,.05,0,0]});
      orbDraw(x0+ca*70,y0+sa*70,hz,84*wv,P,1,.9);
      // where it ends: the splash against the edge of the field
      { const ex=x0+ca*len, ey=y0+sa*len, s=(210+34*Math.sin(tt*31))*wv; F.quad(m.glowG,ex,ey,s*2.2,s*2.2,0,{...C,a:.8,gain:1.4}); F.bill(q.xb,ex,ey,hz,s*1.5,s*1.5,tt*9,{...C,a:.9,gain:2}); F.bill(q.orb,ex,ey,hz,s,s,-tt*6,{...C,gain:2.4}); }
      BL.forEach((l,i)=>{ const d=len*[.15,.55,1][i]; l.x=x0+ca*d; l.y=y0+sa*d; l.a=i===2?1.1:.85; }); });
    const tick=()=>{ bt+=.05; lastT=RT; if(bt>T||RPG.mode!=='surv'||!lock){ return; } ang=a0+TAU*easeIO(Math.min(1,bt/T))*dir; face(ang); const ca=Math.cos(ang), sa=Math.sin(ang), x1=x0+ca*Lb, y1=y0+sa*Lb, len=reachOf(x0,y0-hz,ca,sa,Lb), ex=x0+ca*len, ey=y0+sa*len;
      Cn.shake(.55); post.ca=.006;
      K.sparks(ex,ey,hz,{pal:P,n:6,dir:ang+PI,spread:1.2,sp:[500,1700],up:700,life:[.2,.5]}); K.dust(ex,ey,{n:2,r:40,sp:[200,560],a:.45,c:'#101824'}); if(Math.random()<.5) K.debris(ex,ey,{n:2,sp:[200,600],up:1100,size0:8,size:24});
      // stones thrown up along the cut, and standing up out of the floor just behind it
      { const r=rand(260,len*.85), x=x0+ca*r, y=y0+sa*r; K.debris(x,y,{n:2,r:50,sp:[150,520],up:1300,size0:8,size:26}); K.sparks(x,y,40,{pal:P,n:4,dir:ang,spread:.4,sp:[600,1800],up:500,life:[.15,.4]}); if(Math.random()<.5) K.dust(x,y,{n:2,r:40,sp:[160,460],a:.4,c:'#101824'}); }
      if((up+=.05)>=.3){ up=0; const A=fac(ang)-dir*.2; K.upheave(x0,y0,{r:rand(430,Math.min(900,len*.8)),a0:A-.15,a1:A+.15,n:3,s:rand(130,190),dur:1.15,pal:P,rise:.08}); }
      K.dust(x0,y0,{n:1,r:40,dir:ang+PI,spread:.5,sp:[300,700],a:.35});
      V.blast={x:x0,y:y0,p:1.4}; let nf=0; inLine(x0,y0,x1,y1,210,o=>{ if((o.beamT||0)>RT) return; o.beamT=RT+.3; if(nf++<3) blow(o.x,o.y,1.3,P); ultHit(o,Dm*.5,x0,y0); });
      after(.05,tick); }; tick(); });
  // ---- climax: it chokes back into him and the seal is squeezed again (the tell); the field dims; one pulse; the floor breaks upward
  const tC=t0+.1+T, tN=tC+.32+.135;
  after(tC,()=>{ choke=true; Cn.SND.inhale(.4,.5); Cn.tilt(.27,5); Cn.zoom(.58); GFX.ambient(.3,.31,.44,8);
    K.shock(x0,y0,{r0:hw*1.3,r:80,dur:.3,pal:P,gain:.8,light:0,dust:0,painted:0,haze:.6,th:.7}); gather(x0,y0,hz,40,P,.3,300,900);
    GFX.add(tN-tC,k=>{ const e=k*k; sig.r=hw*mix(.47,.3,k); F.bill(m.glowO,x0,y0,hz,140+200*e,140+200*e,0,{...C,a:.8,gain:2.2}); orbDraw(x0+Math.cos(ang)*70,y0+Math.sin(ang)*70,hz,40+80*e,P,1,1); });
    after(tN-tC-.22,()=>{ GFX.gain=GAIN0*.55; K.shock(x0,y0,{r0:hw*.9,r:50,dur:.2,pal:P,gain:1,light:0,dust:0,painted:0,haze:.7,th:.8}); sig.pal=PKS; sig.kick(); });
    after(tN-tC-.1,()=>{ firing=false; }); });
  after(tN,()=>{ GFX.gain=GAIN0; firing=false; beamSnd.stop(); beamSnd=NOP; hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.014; tEnd=RT;
    GFX.ambient(.44,.54,.72,40); after(.16,()=>GFX.ambient(.36,.42,.56,3)); sig.r=hw*.47; sig.a=1.4; sig.kick(); GFX.add(.35,k=>{ hot=eo3(k); });
    const ca=Math.cos(ang), sa=Math.sin(ang), Lr=reachOf(x0,y0-hz,ca,sa,Lb), A2=fa(ang), sd=Math.random()*9;
    // the last of it: the beam itself, swollen in one pulse down its own line, gone in half a second
    GFX.add(.5,(k,tt)=>{ const e=eo5(sat(tt/.06)), f=sat((tt-.13)/.37), rb=(w,tp,s0=.4)=>{ const ps=[]; for(let i=0;i<12;i++){ const v=i/11*e; ps.push({x:x0+ca*(70+v*Lr),y:y0+sa*(70+v*Lr),z:hz,w:w*(s0+(1-s0)*sat(v*7))*(1-tp*v)*(1+.3*f)*(1+.1*Math.sin(v*17-tt*26))}); } return ps; };
      F.quad(q.strip,x0+ca*Lr*e/2,y0+sa*Lr*e/2,fl(ang,Lr*e)/2,640,A2,{...C,a:1-f,gain:1.3,t0:sd});
      if(!F.low) F.ribbon(q.haze,rb(900,.3),{a:.9*(1-f),gain:.07,t0:sd});
      F.ribbon(q.sheath,rb(1250,.4,.1),{a:.8*(1-f*f),ero:.2+f*.5,t0:sd});
      F.ribbon(q.bmA,rb(1000,.45),{...C,a:1-f*f,gain:2.2,bgain:1.7,ero:.1+f*.75,nk:.4+f*.5,t0:sd}); F.ribbon(q.bmB,rb(330,.55),{...C,a:1-f,gain:2,ero:.1+f*.7,t0:sd,fd:[.02,.06,0,0]}); F.ribbon(q.bmC,rb(110,.55),{...C,a:1-f,gain:3,ero:.2+f*.7,t0:sd,fd:[.01,.06,0,0]}); });
    // contact, all in the one frame: the detonation on the floor round him, the thick shock, the floor breaking upward, everything thrown
    K.art(x0,y0,{tex:F.ready('v3_burst_ki')?'v3_burst_ki':'fx3_shock',floor:true,s:hw*1.05,dur:.6,pal:P,gain:.9,hold:.25,s0:.25,rot:rand(0,TAU)});
    K.shock(x0,y0,{r:hw*1.7,dur:.55,pal:P,gain:1.1,light:0}); K.shock(x0,y0,{r:hw*2.3,dur:.8,pal:P,gain:.7,delay:.1,light:0}); GFX.ripple(x0,y0,hw*2,{life:.6,s:.9});
    { const AX=Math.atan2(Math.sin(A2),Math.cos(A2)), cut=(a0,a1)=>{ const lo=AX-.55, hi=AX+.55; return lo>=a1||hi<=a0?[[a0,a1]]:[[a0,lo],[hi,a1]].filter(v=>v[1]-v[0]>.3); };
      // rock stands up behind him and at his sides, but never across the line of the blast
      for(const [a0,a1,r,s,dn] of [[-PI+.2,-.2,430,270,.36],[.35,1,590,200,.22],[PI-1,PI-.35,590,200,.22]]) for(const [b0,b1] of cut(a0,a1)) K.upheave(x0,y0,{r,a0:b0,a1:b1,n:Math.max(2,Math.round((b1-b0)/dn)),s,dur:1.5,pal:P}); }
    K.crack(x0,y0,{alt:1,r:hw*.9,pal:P,life:5,grow:.12,gain:1.1});
    K.gash(x0+ca*230,y0+sa*230,x0+ca*Lr*.92,y0+sa*Lr*.92,{pal:P,life:5,w:280,gain:.9,grow:.1});
    K.debris(x0,y0,{n:26,r:160,sp:[300,1300],up:1800,size0:12,size:40}); K.dust(x0,y0,{n:22,r:120,sp:[500,1400],a:.6,c:'#0e1622'});
    K.sparks(x0,y0,hz,{pal:P,n:36,sp:[500,2000],up:1400,life:[.3,.8]}); K.sparks(x0,y0,hz,{pal:PG,n:18,dir:ang,spread:.5,sp:[900,2600],up:500,life:[.25,.6]});
    GFX.light(x0,y0,hw*1.6,P.l,1.15,.7,{z:260}); GFX.light(x0+ca*Lr*.5,y0+sa*Lr*.5,hw*1.3,P.l,1,.5,{z:200});
    launch(x0,y0,hw*2.2); after(.3,()=>Cn.sweep(x0,y0,Dm,{speed:3600})); Cn.SND.hit(1); SFX.boom(1.6,1); });
  // ---- afterglow in layers: the break keeps spreading, low dark smoke, embers, rubble; the light comes back last
  after(tN+.45,()=>{ Cn.tilt(0,2.5); Cn.zoom(.9); GFX.ambient(.7,.76,.86,1.4);
    K.crack(x0,y0,{alt:1,r:hw*1.25,pal:P,life:4.5,grow:1.2,gain:.8});
    for(let i=0;i<6;i++) K.smoke(x0+rand(-480,480),y0+rand(-220,220),{s:rand(190,280),dur:rand(1.1,1.5),a:.65,rise:70,c:'#0c1218',c2:'#3c5068',delay:i*.09});
    K.embers(x0,y0,hw*.9,{pal:P,n:44,life:2.2}); K.debris(x0,y0,{n:10,r:500,sp:[40,200],up:500,size0:8,size:22});
    GFX.add(.75,k=>orbDraw(x0+Math.cos(ang)*70,y0+Math.sin(ang)*70,hz,46*(1-k),P,1-k,.8));
    for(let i=1;i<=5;i++) after(.1+i*.11,()=>{ sig.a=1-i/5; if(i===5) sig.dead=true; }); });
  after(t0+T+1.5,()=>{ GFX.ambient(1,1,1,2.5); Cn.zoom(1); K.embers(x0,y0,hw*.7,{pal:P,n:20,life:1.4}); });
  after(t0+T+1.75,()=>{ GFX.gain=GAIN0; ultStop(); }); }

// SOLAR CRASH: a second sun boils up over him - a real ball of fire, dark at its limb, throwing flares - and the field suddenly has
// long shadows; far off, a patch of floor starts to glow and crack: that is where it is going. He goes up after it and drives it
// down with his fist; it swells as it falls; where it lands the floor erupts, breaks upward in a ring, and is left as a crater
// with lava still creeping along the breaks.
function ultSun(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, tg=b||densest(1600), [cx,cy]=X.inView(tg?tg.x:pl.x,tg?tg.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy, P=PS, C=col(P), CL=col(PL), m=K.mats(), q=mm();
  const up=k=>1-(1-k)*(1-k), dn=k=>k*k, tJ=2.2, tP=tJ+.34, tI=tP+.42, R=300, aT=Math.atan2(cy-y0,cx-x0), LR=Math.min(1500,hw*1.6), rs=360;
  // a target close above him would hide the glowing floor behind the sun: there the sun forms higher and he leaps further
  const d0=y0-cy, near=d0>260, zs=near?clamp(d0+R+rs*FSY+130,BODY*5.6,1500):BODY*5.6, ap=zs-R-330;
  S([['gy09',.2],['gy10',.85],['gy11',.85],['gy10',.3],['gy11',.3,{air:[0,ap-30],ease:up}],['gy12',.16,{air:[ap-30,ap],kick:[2,-1.5]}],['gy13',.5,{air:[ap,0],ease:dn}],['gy14',.4],['gy15',.4],['gy16',9]]);
  // ---- omen, close and climbing: the sun grows beat by beat; the floor where it will land heats up
  GFX.ambient(.4,.33,.36,3); Cn.tilt(.05,2); Cn.zoom(1); Cn.cam(x0,y0-zs*.38,4); const dr=Cn.drone(58,.35); SFX.fire(2.2,.5);
  const sun={x:x0,y:y0,z:zs,r:16,on:true}, SL=GFX.light(x0,y0,LR,'#ffb050',.2,.4,{hold:20,z:zs*.6}), HS=GFX.light(cx,cy,300,'#ff6a20',.2,.4,{hold:20,z:60,flick:.2}); let fly=-1, t=0, pulse=0;
  [0,.5,1,1.5].forEach((at,i)=>after(at,()=>{ if(i<2) K.crack(x0,y0,{r:150+70*i,pal:P,life:4-at,grow:.4}); K.crack(cx,cy,{r:120+85*i,pal:PL,life:tI-at+.4,grow:.45,gain:.8+.15*i}); K.embers(cx,cy,140+70*i,{pal:P,n:6+4*i,life:1.4,up:380}); K.dust(cx,cy,{n:3+i,r:60+40*i,sp:[80,260],a:.35,c:'#2a1c14'}); Cn.zoom(1+(near?.07:.1)*i); Cn.cam(x0,y0-zs*(.38+.07*i),4); }));
  [.2,.62,1,1.36,1.7,2].forEach((at,i)=>after(at,()=>{ K.shock(x0,y0,{r0:hw*(.95-i*.08),r:60,dur:.42,pal:P,gain:.45+.1*i,light:0,dust:0,painted:0,haze:.6,th:.6}); pulse=RT; GFX.ripple(sun.x,sun.y,sun.r*3.4+200,{life:.5,s:.45,z:sun.z}); GFX.ripple(cx,cy,260+60*i,{life:.5,s:.4}); }));
  for(let i=0;i<84;i++) after(1.9*Math.sqrt(Math.random()),()=>{ const a=rand(0,TAU), d=rand(260,900); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,60),tx:x0,ty:y0,tz:zs,pull:rand(3.5,5.5),life:rand(.55,.8),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*420,vy:Math.cos(a)*250,c:GFX.rgb(Math.random()<.35?'#ffffff':P.s),c2:P.b,L:3}); });
  V.ultTick=dt=>{ t+=dt; if(sun.on&&Math.random()<.6){ const a=rand(0,TAU); GFX.pt({x:sun.x+Math.cos(a)*sun.r*.9,y:sun.y,z:sun.z+Math.sin(a)*sun.r*.9,vx:Math.cos(a)*rand(60,220),vz:Math.sin(a)*rand(60,220)+rand(40,160),g:-40,drag:.6,life:rand(.5,1),s:rand(3,8),m:8,c:GFX.rgb(pick([P.s,P.b,'#fff6d0'])),fade:'in',L:3}); } };
  // the floor it is aimed at: soot spreading, a pool of heat that grows and throbs
  { const rot=rand(0,TAU); GFX.add(tI,(k,tt)=>{ const g=sat(tt/2.1), th=.8+.2*Math.sin(tt*(6+8*g)), bo=fly>=0?1.5:1; F.quad(m.soot,cx,cy,rs*(.3+.6*g),rs*(.3+.6*g),rot,{a:.6*g}); F.quad(m.glowG,cx,cy,rs*(.35+.8*g)*bo,rs*(.35+.8*g)*bo,0,{...C,a:.85*g*th*bo,gain:1.8}); HS.a=(.2+.75*g)*bo*.8; HS.r=300+650*g; }); }
  GFX.add(tI+.3,(k,tt)=>{ if(!sun.on) return; let gr=1;
    if(fly<0){ const g=.1+.9*Math.pow(sat(tt/2.15),1.15), pk=Math.max(0,1-(RT-pulse)/.3); sun.r=R*g*(1+.08*pk)+4*Math.sin(tt*9); } else { const e=Math.pow(sat((RT-fly)/.36),2); sun.x=mix(x0,cx,e); sun.y=mix(y0,cy,e); sun.z=mix(zs,130,e); sun.r=R*(1+.5*e); gr=1+.5*e; }
    const x=sun.x, y=sun.y, z=sun.z, r=sun.r, g=Math.min(1,r/R);
    F.quad(m.glowG,x,y,r*2.8,r*2.8,0,{...C,a:.5*g,gain:1});
    if(fly>=0){ const sx=cx-x0, sy=(cy-130)-(y0-zs), sl=Math.hypot(sx,sy)||1, ux=sx/sl, uy=sy/sl, tl=Math.min(1700,320+Math.hypot(x-x0,(y-z)-(y0-zs))*1.3); F.bill(q.tail,x-ux*tl*.44,y,z+uy*tl*.44,tl/2,tl*.22*gr,Math.atan2(uy,ux),{...C,gain:2.4,bgain:1.4,t0:fly}); }
    // flares leaving the rim, the halo, and a larger turning copy of the surface as corona
    for(let i=0;i<4;i++){ const th=i*TAU/4+.6+tt*.13+.4*Math.sin(i*2.1), sz=r*(.42+.2*Math.sin(tt*1.3+i*1.9)), d=r*.86+sz*.8; F.bill(q.prom,x+Math.cos(th)*d,y,z-Math.sin(th)*d,sz*.55,sz,th+PI/2,{...C,a:.9*g,gain:2.2,t0:i*3.1}); }
    F.bill(m.glowO,x,y,z,r*2.8,r*2.8,0,{...C,a:.42,gain:1.2});
    F.bill(q.sun,x,y,z,r*1.5,r*1.5,-tt*.22,{a:.28,ero:-1,soft:.01,gain:1});
    // the ball: boiling surface, big slow convection cells, a limb dark all the way round, the hot face off-centre
    F.bill(q.sun,x,y,z,r*1.25,r*1.25,tt*.3,{a:1,ero:-1,soft:.01,gain:1+.3*g*gr});
    F.bill(q.cell,x,y,z,r*1.02,r*1.02,-tt*.1,{a:.5,rv:[.98,.08,0,0],t0:7});
    F.bill(q.limb,x,y,z,r*1.13,r*1.13,0,{a:.7,rv:[1,.1,.95,.42]});
    F.bill(m.glowO,x-r*.24,y,z+r*.24,r*.95,r*.95,0,{cA:'#ff6a10',cB:'#ffd060',cC:'#ffffff',a:.75,gain:2.2}); F.bill(m.glowO,x-r*.34,y,z+r*.34,r*.36,r*.36,0,{cA:'#ffd060',cB:'#fff4cc',cC:'#ffffff',a:.8,gain:3});
    if(fly>=0) K.sparks(x,y,z,{pal:P,n:3,dir:aT+PI,spread:.7,sp:[200,800],up:300,life:[.2,.5],g:300});
    SL.x=x; SL.y=y; SL.z=z*.6; SL.a=.2+.9*g; });
  // ---- release, wide and tilted: he goes up to it and drives it down (the blow is the tell; the floor it is aimed at flares)
  after(tJ,()=>{ Cn.tilt(.24,4); Cn.zoom(.7); Cn.cam((x0+cx)/2,(y0+cy)/2-BODY*1.6,6); sfx('whoosh',.6,1);
    K.dust(x0,y0,{n:10,r:30,sp:[250,700],c:'#2a1c14'}); K.shock(x0,y0,{r:300,dur:.3,pal:PG,gain:.6,light:0,painted:0});
    K.shock(cx,cy,{r0:rs*1.5,r:90,dur:tI-tJ,pal:PL,gain:.8,light:0,dust:0,painted:0,haze:.5}); K.crack(cx,cy,{r:rs*1.1,pal:PL,life:tI-tJ+.4,grow:.5,gain:1.1}); });
  after(tP,()=>{ hitstop=Math.max(hitstop,.07); Cn.shake(.8); post.ca=.01; Cn.SND.hit(.6);
    K.art(x0,y0,{tex:'v3_xburst',s:220,z:zs-R*.95,lift:0,dur:.26,pal:PG,gain:.8,hold:.2,s0:.5}); K.flare(x0,y0,zs-R*.95,{pal:PG,s:170,sx:2.2,sy:.5,dur:.2,gain:2.5});
    K.sparks(x0,y0,zs-R*.9,{pal:PG,n:26,dir:aT,spread:1.2,sp:[500,1700],up:500}); });
  after(tP+.06,()=>{ fly=RT; dr.stop(.1); Cn.tilt(.27,6); Cn.cam(cx,cy-BODY,10); Cn.zoom(.6); sfx('whoosh',.45,1); });
  after(tI-.2,()=>GFX.ambient(.3,.28,.34,25));
  // ---- contact, all in the one frame: the eruption, the thick shock, the floor breaking upward in a ring, everything thrown
  after(tI,()=>{ sun.on=false; SL.hold=0; SL.life=.01; HS.hold=0; HS.life=.3; hitstop=Math.max(hitstop,.12); Cn.shake(1.6); post.ca=.014;
    GFX.ambient(.5,.4,.36,40); after(.16,()=>GFX.ambient(.44,.34,.34,3)); GFX.light(cx,cy,LR,P.l,1.15,.7,{z:260});
    // a wall of fire going straight up, twice the sun wide, gone in half a second
    K.art(cx,cy,{tex:F.ready('v3_burst_fire')?'v3_burst_fire':'fx3_burst',s:R*2.5,z:-90,dur:.6,pal:P,gain:1,hold:.25,s0:.3}); K.flame(cx,cy,{s:820,dur:.6,pal:P,gain:1.1,light:0}); K.flame(cx-210,cy+20,{s:520,dur:.5,pal:P,light:0,delay:.04}); K.flame(cx+230,cy+16,{s:480,dur:.5,pal:P,light:0,delay:.06});
    K.burst(cx,cy,{s:320,pal:P,scar:6,no:['flash','smoke','crack']}); K.arcwall(cx,cy,{r:340,h:720,a0:-PI+.2,a1:-.2,dur:.7,pal:P,hb:1,hf:.5,light:0});
    K.shock(cx,cy,{r:rs*2.3,dur:.55,pal:P,gain:1.1,light:0}); K.shock(cx,cy,{r:hw*2.2,dur:.8,pal:P,gain:.6,delay:.1,light:0}); GFX.ripple(cx,cy,hw*2,{life:.6,s:.9});
    // rock stands up in a ring, open toward him
    { const aH=Math.atan2((y0-cy)/FSY,x0-cx); K.upheave(cx,cy,{r:500,a0:aH+.75,a1:aH+TAU-.75,n:11,s:250,dur:1.6,pal:P}); }
    scar('v3_crater',cx,cy,560,{pal:PL,life:6.5,dark:.62}); K.crack(cx,cy,{alt:1,r:hw*1.05,pal:PL,life:6.5,grow:.2,gain:1.1});
    K.debris(cx,cy,{n:28,r:200,sp:[300,1300],up:1900,size0:14,size:44}); K.dust(cx,cy,{n:24,r:160,sp:[500,1500],a:.65,c:'#1c120c'});
    for(let i=0;i<4;i++) K.smoke(cx+rand(-260,260),cy+rand(-80,80),{s:rand(300,420),dur:rand(1.2,1.7),delay:.2+i*.09,a:.8,rise:160,c:'#120a06',c2:'#4a3020'});
    launch(cx,cy,hw*2.2); after(.3,()=>Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3})); Cn.SND.hit(1); SFX.boom(1.8,1); SFX.fire(2,.6); });
  // ---- afterglow in layers: lava creeping further along the breaks, low smoke, embers, rubble; no fire left standing
  after(tI+.65,()=>{ K.crack(cx,cy,{alt:1,r:hw*1.5,pal:PL,life:5,grow:1.4,gain:.8}); K.embers(cx,cy,hw,{pal:P,n:60,life:2.6,up:320});
    for(let i=0;i<5;i++) K.smoke(cx+rand(-380,380),cy+rand(-170,170),{s:rand(230,330),dur:rand(1.3,1.8),a:.7,rise:80,delay:i*.12,c:'#120a06',c2:'#4a3020'});
    K.debris(cx,cy,{n:10,r:520,sp:[40,200],up:500,size0:8,size:24}); GFX.light(cx,cy,900,'#ff5a20',.75,.5,{hold:1.5,flick:.25,z:80}); GFX.ambient(.74,.66,.64,1.4); Cn.tilt(0,2.5); Cn.zoom(.9); });
  after(tI+1.5,()=>{ K.embers(cx,cy,hw*.7,{pal:PL,n:30,life:1.6,up:260}); GFX.ripple(cx,cy,500,{life:.6,s:.35}); });
  after(tI+2,()=>{ GFX.ambient(1,1,1,2.5); Cn.zoom(1); Cn.cam(null); });
  after(tI+2.5,ultStop); }

X.reg('fist',{sk,order,basic:{fn:basic,cd:()=>.5*(1-.05*(L('fs_basic')-1))},skills:SKILL,ults:{fs_ult1:ultBeam,fs_ult2:ultSun}});
})();
