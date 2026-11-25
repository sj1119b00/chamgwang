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
// PK compressed ki, PG the golden fist
const PK=K.PAL.azure, PG=K.PAL.gold;
const PI=Math.PI, sat=K.sat, mix=K.mix, eo3=K.eo3, eo5=K.eo5;
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m});
// a direction on screen (the game's x, y) as an angle in true floor units, and a screen length along it in floor units
const fa=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a)), fl=(a,len)=>Math.hypot(Math.cos(a)*len,Math.sin(a)*len/FSY);
// @A pieces shared by the skills and the ultimates
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
  fs_ult1:{cls:'fist',type:'ult',name:'파천 기공포',lv:3,desc:'궁극기. 양손에서 반대 방향으로 뿜은 두 줄기 광선이 화면 전체를 쓸고, 쓸고 간 자리마다 땅이 갈라져 바위가 솟는다. 이어 금빛 광선이 사방으로 터져 전장의 모든 적을 날려 버린다.'},
  fs_ult2:{cls:'fist',type:'ult',name:'금강 유성권',lv:12,desc:'궁극기. 하늘로 뛰어올라 금빛 유성이 되어 전장 한가운데에 내리꽂힌다. 화면의 모든 적이 착탄점으로 끌려와 한꺼번에 날아간다.'},
  fs_ult3:{cls:'fist',type:'ult',name:'천원 기공구',lv:5,desc:'궁극기. 화면의 모든 적에게서 기를 빨아올려 머리 위에 거대한 기공구를 키운 뒤 땅에 내리꽂는다. 낙인이 한꺼번에 터지며 전장의 모든 적이 날아간다.'},
};
const order=Object.keys(sk);

// ---------------------------------------------------------------- volume pieces local to the fighter (VOL / K3.v*)
const vok=()=>!!(K.vok&&K.vok());
const DUST={c:'#1a2030',c2:'#7888a4'};
// a stream of ki along a SCREEN direction a (K.vjet wants the true floor angle and length)
const jet=(x,y,z,a,len,o={})=>K.vjet(x,y,z,fa(a),{...o,len:fl(a,len)});
// a compressed orb growing at a point that follows the hero's hands: fn(k) -> [x,y,r]
function condense(dur,z,P,fn,o={}){ const [x,y,r]=fn(0), ob=K.vorb(x,y,z,{r,dur:dur+.03,pal:P,in:.05,out:.03,spin:o.spin??4,core:o.core??.3,gain:o.gain||1.1}), m=K.mats();
  GFX.add(dur,k=>{ const [x,y,r]=fn(k); ob.x=x; ob.y=y; ob.r=r; if(F.on) F.bill(m.glowO,x,y,z,r*.55,r*.55,0,{cA:P.b,cB:P.h,cC:'#ffffff',a:1,gain:3}); }); return ob; }

// @B ---------------------------------------------------------------- basic attack and skills
// One shape per skill, none shared: arc band (basic) / thin straight line (dash) / pillar (upper) / orb (ki) / star crack (stomp) /
// bundle of short lines (rush) / hollow funnel (tornado) / turning plates (aura) / widening cone (giga).
// Azure = ki and fast blows, gold = the heavy blow that ends something. Every hit flash sits on the body that was hit.
const BRAND='v3_circ_fist'; if(window.GFX&&GFX.img) GFX.img(BRAND);
const byD=(x,y)=>(a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y);
const linePts=(x0,y0,z0,x1,y1,z1,n=8)=>{ const p=[]; for(let i=0;i<n;i++){ const u=i/(n-1); p.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z:mix(z0,z1,u)}); } return p; };
// a flat arc round a point, in true floor angles
const arcPts=(x,y,z,r,a0,a1,n=12,dz=0)=>{ const p=[]; for(let i=0;i<n;i++){ const u=i/(n-1), a=mix(a0,a1,u); p.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:z+dz*u}); } return p; };
// sparks shed downward by bodies while they are in the air (the count follows time, not frames)
function tails(Lh,dur,P){ if(!GFX.on) return; let nt=0; GFX.add(dur,(k,t)=>{ if(t<nt) return; nt=t+.06; for(const o of Lh){ if(o.dead||o.z<40) continue;
    GFX.pt({x:o.x+rand(-22,22),y:o.y,z:o.z+rand(0,o.h*.5),vx:rand(-30,30),vy:0,vz:-rand(120,320),g:0,drag:1.5,life:rand(.2,.36),s:rand(2.5,4),m:3,len:.04,c:GFX.rgb(P.s),c2:P.b,L:3}); } }); }

// the damage of a blow that throws. A body it kills is sent the way the blow goes (ux, uy on screen) instead of fading where it stood.
// a short step in to arm's length of a body (never against the stick); returns where he will stand
function stepIn(e,a,keep=150,dur=.09){ const l=Math.hypot(e.x-pl.x,e.y-pl.gy); if(V.steer||l<=keep+40) return [pl.x,pl.gy]; const x1=e.x-Math.cos(a)*keep, y1=e.y-Math.sin(a)*keep; V.dash={x0:pl.x,y0:pl.gy,x1,y1,t:0,dur,soft:true}; return [x1,y1]; }
function fling(e,ux,uy,sp=900,vz=600){ if(!e.dead||!V.dying.length) return; const q=V.dying[V.dying.length-1], w=e.d.heavy?.45:1; if(q.vx!=null||q.e.x!==e.x||q.e.y!==e.y) return;
  q.vx=ux*sp*w; q.vy=uy*sp*w*.8; q.vz=vz; q.spin=rand(-8,8); q.life=Math.max(.45,Math.min(.9,vz/1400)); }
function smash(e,d,o,ux,uy,sp,vz){ dmg(e,d,o); fling(e,ux,uy,sp,vz); }
// the ring of air a fist drives ahead of it: a hoop standing across the blow (its axis is the screen direction a), opening as it travels
function pring(x,y,z,a,r,P,dur=.26,o={}){ if(!F.on) return; const m=K.mats(), C=col(P), M=F.xf({ry:PI/2,rz:fa(a)}), sd=rand(0,9), ca=Math.cos(a), sa=Math.sin(a), tr=o.travel||0, g=o.gain||1;
  GFX.add(dur,k=>{ const e=eo3(k), rr=r*(.4+.6*e), th=rr*mix(.5,.14,k), aa=(1-k)*(1-k), px=x+ca*tr*e, py=y+sa*tr*e;
    F.lathe(m.shW,px,py,z,{r0:Math.max(0,rr-th*2),r1:rr,M,...C,a:aa*.7,gain:1.3*g,t0:sd,layer:'o'});
    F.lathe(m.shL,px,py,z,{r0:rr-th*.5,r1:rr,M,...C,a:Math.min(1,aa*1.8),gain:2.4*g,t0:sd,layer:'o'}); },o.delay||0); }
// a blow landing on a body: a white-hot point on it, the hoop of air driven on through it, sparks the way the blow goes. No star.
function pow(o,P,a,pw=1,ring=1){ if(!o||!F.on) return; const z=o.z+o.h*.5, s=Math.max(110,o.h*.7)*pw, m=K.mats(), ca=Math.cos(a), sa=Math.sin(a), x=o.x, y=o.y; o.flash=1; o.hitT=RT; o.hdx=ca;
  GFX.add(.14,k=>{ F.bill(m.glowO,x,y,z,s*.4*(1+k*.5),s*.4*(1+k*.5),0,{cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff',a:(1-k)*(1-k),gain:1.9}); });
  if(ring) pring(x+ca*20,y+sa*20,z,a,s*.9,P,.24,{travel:s*.8});
  K.sparks(x,y,z,{pal:P,n:Math.round(5*pw),dir:fa(a),spread:.4,sp:[500,1500*pw],up:250,life:[.14,.36],s:3}); }
// a fist of ki with a body: a block of a palm and four knuckles in a row across the blow (always seen in profile on the picture), thrown
// from one point to another behind a thick band, standing on its target for a moment and then crumbling from the wrist
function kiFist(x0,y0,z0,x1,y1,z1,o={}){ if(!F.on) return; const P=o.pal||PK, s=o.s||90, fly=o.fly??.06, hold=o.hold??.04, fade=o.fade??.14, dur=fly+hold+fade, a=Math.atan2(y1-y0,x1-x0), ca=Math.cos(a), sa=Math.sin(a), rz=fa(a), v=(Math.random()*4)|0, m=K.mats(), solid=F.solids&&F.solids(), g0=o.gain||1, alb=o.alb||(P===PG?'#ffc64a':'#6fd0ff');
  K.trail(linePts(x0-ca*s*.4,y0-sa*s*.4,z0,x1-ca*s*.5,y1-sa*s*.5,z1,8),{pal:P,w:s*.62,draw:fly,dur:fly+hold+fade*.6,hold,gain:g0*.75,delay:o.delay||0});
  GFX.add(dur,(k,t)=>{ const u=eo3(sat(t/fly)), f=sat((t-fly-hold)/fade), d=(o.drift||0)*sat((t-fly)/(hold+fade)), x=mix(x0,x1,u)+ca*d, y=mix(y0,y1,u)+sa*d, z=mix(z0,z1,u), g=1-f;
    const part=(fw,q,sx,sy,sz,vi)=>{ const px=x+ca*fw*s-sa*q*s, py=y+sa*fw*s, pz=z-ca*q*s-sz*s*.3;
      if(solid) F.solid('boulder',v+vi,px,py,pz,{M:F.xf({sx:sx*s,sy:sy*s,sz:sz*s,rz}),alb,emis:P.b,rimC:P.h,spec:.6,rim:1.6*g*g0,vein:1.5*g,heat:.9*g,ero:f*.9,bump:.6,tone:.16,clip:0});
      if(vi&&solid) F.bill(m.glowO,px+ca*sx*s*.3,py+sa*sx*s*.3,pz+sz*s*.3,sx*s*.34,sx*s*.34,0,{cA:P.b,cB:P.h,cC:'#ffffff',a:.6*g,gain:1.1*g0});
      else F.bill(m.glowO,px,py,pz+sz*s*.3,sx*s*.6,sz*s*.6,0,{cA:P.b,cB:P.m,cC:'#ffffff',a:g,gain:2}); };
    F.bill(m.glowO,x-ca*s*.3,y-sa*s*.3,z,s*1.5,s*1.5,0,{cA:P.d,cB:P.b,cC:P.h,a:.36*g,gain:.9*g0});
    part(-.5,0,1.1,.9,1.05,0); for(let i=0;i<4;i++) part(.1,(i-1.5)*.29,.44,.44,.4,i+1);
    F.bill(m.glowO,x+ca*s*.3,y+sa*s*.3,z,s*.5,s*.5,0,{cA:P.b,cB:P.h,cC:'#ffffff',a:g*sat(1-t/(fly+.05)),gain:2.2*g0}); },o.delay||0); }
// ki wound in to a point: three bands turning round it on the floor plane and closing, brighter as they close
function spiralIn(fn,z,P,dur,R){ if(!F.on) return; const m=K.mats(), C=col(P), sd=rand(0,TAU);
  GFX.add(dur,(k,t)=>{ const [x,y]=fn(k), rr=R*(1-.82*eo3(k)), al=sat(k*5)*(1-k*k*k);
    for(let i=0;i<3;i++){ const ps=[], ph=sd+t*13+i*TAU/3; for(let j=0;j<10;j++){ const v=j/9, an=ph-v*1.9, rad=rr*(1+.55*v); ps.push({x:x+Math.cos(an)*rad,y:y+Math.sin(an)*rad*FSY,z:z*(1-.6*v),w:(10+R*.07)*Math.pow(1-v,.6)}); }
      F.ribbon(m.trB,ps,{...C,gain:2.2+1.5*k,ero:.15,t0:sd+i,a:al}); F.ribbon(m.trC,ps,{...C,gain:3.4+2*k,ero:.25,t0:sd+i,a:al}); } }); }
// a thin hard ring snapping out over the floor (the edge a shock wave is read by)
function floorRing(x,y,r0,r1,dur,P,o={}){ if(!F.on) return; const m=K.mats(), C=col(P), sd=rand(0,9);
  GFX.add(dur,k=>{ const e=eo5(k), r=mix(r0,r1,e), th=mix(.16,.05,k), a=(1-k)*(1-k*k); F.ring(m.shW,x,y,r*(1-th*2.2),r,{...C,a:a*.6,gain:1.2,t0:sd}); F.ring(m.shL,x,y,r*(1-th),r,{...C,a:Math.min(1,a*1.6),gain:(o.gain||2.6),t0:sd}); },o.delay||0); }

// COMBO PUNCH: the band is the road of the fist itself - a hook from the left, a hook from the right, a straight, and the fourth
// goes up as a standing golden crescent. No wind-up: the band is drawn with the swing. What it hits is thrown the way the fist went,
// behind the hoop of air the fist drove through it.
function basic(){ const e=nearest(V.steer?360:560); if(!e) return false; const a=angTo(e), n=V.chain++%4, up=n===3, d=900*A.mul('fs_basic')*(up?2.4:1), ca=Math.cos(a), sa=Math.sin(a), A2=fa(a), z=BODY*.56, P=up?PG:PK; face(a);
  S(PUNCH[n],true); if(!V.steer&&Math.hypot(e.x-pl.x,e.y-pl.gy)>200) V.dash={x0:pl.x,y0:pl.gy,x1:e.x-Math.cos(a)*120,y1:e.y-Math.sin(a)*120,t:0,dur:.08,soft:true}; /* the step-in never fights the stick */
  const px=V.dash?V.dash.x1:pl.x, py=V.dash?V.dash.y1:pl.gy;
  after(up?.1:.03,()=>{
    if(up){ const p=[]; for(let i=0;i<12;i++){ const u=i/11, r=110+170*Math.sin(u*2.5); p.push({x:px+ca*r,y:py+sa*r,z:20+760*u}); } K.trail(p,{pal:PG,w:112,draw:.09,dur:.46,hold:.1,gain:1.1}); }
    else if(n===2) K.trail(linePts(px+ca*40,py+sa*40,z,px+ca*430,py+sa*430,z+20,8),{pal:PK,w:92,draw:.05,dur:.34,hold:.08});
    else { const s=n?-1:1; K.trail(arcPts(px,py,z,285,A2-s*1.5,A2+s*.55,14,40),{pal:PK,w:98,draw:.06,dur:.36,hold:.08}); } });
  after(up?.2:.1,()=>{ sfx('boom',up?.9:.5,.5); sfx('whoosh',1.5,.4); const Lh=[];
    inSector(pl.x,pl.gy,a,up?300:260,.9,o=>Lh.push(o)); if(!Lh.length) return; Lh.sort(byD(pl.x,pl.gy)); const o=Lh[0];
    Lh.forEach((q,i)=>{ if(i<2) pow(q,P,up?-PI/2:a,up?1.25:n===2?1.15:1,i===0); else hitFx(q,up?C2:C1,.9); if(up&&!i) K.ehit(q,{pal:'gold',pw:1.3,dir:A2});
      smash(q,d,{kb:0,push:up?170:210,up:up?1200:300,stun:up?.8:.25},ca*(up?.25:1),sa*(up?.25:1),up?500:1100,up?1250:520); if(!q.dead) thrown(q,P,ca,sa,.6); });
    if(up){ tails(Lh.slice(0,4),.5,PG); GFX.light(o.x,o.y,460,PG.l,.8,.26,{z:200}); hitstop=Math.max(hitstop,.04); trauma=Math.min(.9,trauma+.25); }
    else { GFX.light(o.x,o.y,340,PK.l,.6,.2,{z:120}); if(n===2) hitstop=Math.max(hitstop,.025); } });
  return true; }

// the ki shot's body: a ball of plasma that follows the projectile and grows a little as it flies, a tail of fixed length behind it, its light on the floor
function kiShot(p){ const a=Math.atan2(p.vy,p.vx), m=K.mats(), ob=K.vorb(p.x,p.y,p.h,{r:105,dur:1.4,pal:PK,in:.04,out:.05,spin:6,core:.34,gain:1.25}), tl=jet(p.x,p.y,p.h,a+PI,250,{r:36,r0:64,dur:1.4,in:.12,out:.05,pal:PK,speed:8,turb:.6,heat:.8,gain:.45}),
    Lt=GFX.light(p.x,p.y,420,PK.l,.8,.2,{hold:1.3,z:p.h});
  const fx=GFX.add(1.4,(k,t)=>{ if(p.life<=0){ fx.dead=true; ob.dead=tl.dead=true; Lt.hold=0; Lt.life=.01; return; } const r=105+30*sat(t/1.1); ob.r=r; ob.x=tl.x=p.x; ob.y=tl.y=p.y; Lt.x=p.x; Lt.y=p.y;
    if(F.on) F.bill(m.glowO,p.x,p.y,p.h,r*.6,r*.6,0,{cA:PK.b,cB:PK.h,cC:'#ffffff',a:1,gain:3}); }); }
// the tornado kick: a hollow funnel of ki that winds up off the floor round him, holds while bands of ki climb round it (the turn you can
// read), grows a little (1 -> 1.3) and is thrown open at the end. Thin and cool enough that he is seen inside it.
function twister(R,T){ const Lt=GFX.light(pl.x,pl.gy,R*2.4,PK.l,.5,.3,{hold:T,z:160}), m=K.mats(), sd=rand(0,9), C=col(PK), OUT=.5;
  const fn=K.vfunnel(pl.x,pl.gy,{r:R*1.05,r0:R*.55,h:R*2.4,dur:T+OUT,rise:.4,out:OUT,pal:PK,spin:10,sway:.06,thick:.12,heat:.85,streak:1,gain:.8});
  K.dust(pl.x,pl.gy,{n:8,r:R*.4,sp:[200,520],a:.35,c:'#141c2a'}); floorRing(pl.x,pl.gy,40,R*1.5,.3,PK);
  GFX.add(T+OUT,(k,t)=>{ if(lock){ fn.a=0; return; } const born=eo3(sat(t/.4)), g=1+.3*sat(t/T), u=sat((t-T)/OUT), x=pl.x, y=pl.gy, rr=R*1.05*g*(.3+.7*born)*(1+.9*u*u), hh=R*2.4*g*(.25+.75*born), al=born*(1-u);
    fn.x=x; fn.y=y; fn.a=.72*(1-.4*u); fn.r=rr; fn.h=hh; Lt.x=x; Lt.y=y; if(!F.on) return;
    /* where it stands on the floor: a wheel of dust dragged round, and the bright rim of its foot */
    if(!F.low) F.quad(m.shDu,x,y,rr*1.05,rr*1.05,-t*5,{a:.55*al,ero:.2+.5*u,t0:sd});
    F.ring(m.shL,x,y,rr*.5,rr*.6,{...C,a:.6*al,gain:1.5,t0:sd+t*1.5});
    /* a hoop climbs the wall on every beat of the kick */
    for(let i=0;i<2;i++){ const v=((t*1.6+i*.5)%1), zf=.08+.9*v, rad=mix(rr*.55,rr,zf)*1.04, ar=Math.sin(PI*v)*al; F.ring(m.shL,x,y,rad*.86,rad,{...C,z:zf*hh,a:ar*.9,gain:2.2,t0:sd+i,layer:'o'}); }
    for(let i=0;i<3;i++){ const ps=[], ph=-t*9+i*TAU/3, h0=.1+.27*i;
      for(let j=0;j<11;j++){ const v=j/10, an=ph+v*2.3, zf=h0+.14*(1-v), rad=mix(rr*.55,rr,zf); ps.push({x:x+Math.cos(an)*rad,y:y+Math.sin(an)*rad*FSY,z:zf*hh,w:(22+10*i)*Math.pow(1-v,.6)*(1-.5*u)}); }
      F.ribbon(m.trB,ps,{...C,gain:2.4,ero:.12+.6*u,t0:sd+i,a:al}); F.ribbon(m.trC,ps,{...C,gain:3.6,ero:.25+.6*u,t0:sd+i,a:al}); } }); }
// iron body: three knots of golden ki run round him at chest height on rings that tilt against each other, each dragging a long band,
// over a bright ring at his feet that sheds gold upward. On every half-second beat the rings are thrown outward and come back; at
// the end they fly apart.
function aura(T){ const sd=rand(0,TAU), Lt=GFX.light(pl.x,pl.gy,620,PG.l,.5,.4,{hold:T,z:150}), m=K.mats(), C=col(PG), zc=BODY*.46, OUT=.5; let nm=0, fell=false;
  const orbs=[0,1,2].map(()=>K.vorb(pl.x,pl.gy,zc,{r:30,dur:T+OUT,pal:PG,in:.2,out:.25,spin:5,core:.4,gain:1}));
  GFX.add(T+OUT,(k,t)=>{ if(lock){ orbs.forEach(o=>o.a=0); return; } const x=pl.x, y=pl.gy, u=t%.5, ins=eo3(sat(t/.25)), out=sat((t-T)/OUT), pu=t<T?(u<.1?eo3(u/.1):1-sat((u-.1)/.3)):0, rad=mix(50,185,ins)+125*pu+200*out*out, al=ins*(1-out);
    Lt.x=x; Lt.y=y; Lt.a=.4+.35*pu;
    const zz=(i,an)=>zc+rad*.3*Math.sin(an+i*2.1), hd=[];
    for(let i=0;i<3;i++){ const th=sd+t*5.2+i*TAU/3, o=orbs[i], ps=[]; o.x=x+Math.cos(th)*rad; o.y=y+Math.sin(th)*rad*FSY; o.z=zz(i,th); o.r=28+12*pu; o.a=1-out; hd.push(o); if(!F.on) continue;
      for(let j=0;j<13;j++){ const v=j/12, an=th-v*(1.75-.5*out); ps.push({x:x+Math.cos(an)*rad,y:y+Math.sin(an)*rad*FSY,z:zz(i,an),w:(26+16*pu)*Math.pow(1-v,.55)}); }
      F.ribbon(m.trB,ps,{...C,gain:2.6+pu,ero:.1+.7*out,t0:sd+i,a:al}); F.ribbon(m.trC,ps,{...C,gain:4,ero:.2+.7*out,t0:sd+i,a:al}); }
    if(F.on) F.ring(m.shL,x,y,rad*.36,rad*.46,{...C,a:.55*al,gain:1.3+pu,t0:sd+t});
    if(GFX.on&&t>nm&&t<T){ nm=t+.045; const a=rand(0,TAU), d=rand(20,70); GFX.pt({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,z:rand(0,60),vx:0,vy:0,vz:rand(260,520),g:0,drag:.8,life:rand(.4,.7),s:rand(3,5),m:3,len:.07,c:GFX.rgb(Math.random()<.35?'#ffffff':PG.s),c2:PG.b,L:3}); }
    if(out>0&&!fell){ fell=true; for(const o of hd) K.sparks(o.x,o.y,o.z,{pal:PG,n:6,sp:[200,700],up:500,life:[.25,.5]}); } }); }

const SKILL={
  // DASH PUNCH: three beats, one thing at a time. The dash leaves one straight line of ki with a white heart; a moment later the bodies
  // on it are thrown to either side; then the golden blow goes out of the fist as one short cone and takes what stands in it away.
  fs_dash:{moves:true,fn(id){ const e=nearest(720); if(!e) return false; const a=angTo(e), Ld=Math.min(640,Math.hypot(e.x-pl.x,e.y-pl.gy)+80), d=D(id), ca=Math.cos(a), sa=Math.sin(a), x0=pl.x, y0=pl.gy, x1=x0+ca*Ld, y1=y0+sa*Ld, z=BODY*.55, A2=fa(a), evo=EVO(id); face(a);
    S(PUNCH[1]); const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.11}; G.inv=Math.max(G.inv,.35); sfx('whoosh',1.3,.7);
    K.trail(linePts(x0-ca*60,y0-sa*60,z*.7,x1,y1,z*.7,12),{pal:PK,w:110,draw:.1,dur:.3,hold:.04,gain:.9}); K.dust(x0,y0,{n:5,dir:a+PI,spread:.5,sp:[200,520],a:.4}); GFX.light((x0+x1)/2,(y0+y1)/2,Ld*.7,PK.l,.45,.3,{z});
    after(.12,()=>{ let c=0; inLine(x0,y0,x1,y1,90,o=>{ const side=(o.y-y0)*ca-(o.x-x0)*sa>=0?1:-1, ux=-sa*side*.9+ca*.4, uy=ca*side*.9+sa*.4; if(c++<3) pow(o,PK,Math.atan2(uy,ux),.8,0);
        smash(o,d*.6,{kb:0,sx:x0,sy:y0},ux,uy,1000,520); if(!o.dead){ K.knock(o,{dir:A2+side*PI/2,dist:240,up:600}); thrown(o,PK,ux,uy,.7); } }); });
    after(.2,()=>{ const x=x1+ca*110, y=y1+sa*110, r=evo?330:200, Lh=[]; sfx('boom',1.2,.8); trauma=Math.min(1,trauma+.35); hitstop=Math.max(hitstop,.05);
      kiFist(x1+ca*70,y1+sa*70,z,x1+ca*(70+r*1.1),y1+sa*(70+r*1.1),z,{pal:PK,s:evo?190:150,fly:.07,hold:.08,fade:.22,gain:1.2,drift:120}); pring(x1+ca*120,y1+sa*120,z,a,r*.7,PK,.34,{travel:r*1.6,delay:.05}); GFX.light(x,y,r*2.2,PK.l,.75,.3,{z:140});
      if(evo) K.cool(x,y,{kind:'scorch',r:r*.6,pal:PK,life:1.5,start:.25,light:0});
      inCircle(x,y,r,o=>Lh.push(o)); Lh.sort(byD(x1,y1)).forEach((o,i)=>{ if(i<2) K.ehit(o,{pal:'azure',pw:i?1.1:1.6,dir:A2}); smash(o,d,{kb:0,big:true,sx:x1,sy:y1,push:evo?520:440,up:evo?1300:1000},ca,sa,1500,650); if(!o.dead) thrown(o,PK,ca,sa,1); }); tails(Lh.slice(0,5),.6,PK); }); }},
  // RISING UPPER: the fist's golden band winds up off the floor and round one pillar of golden ki (the only pillar the fighter has), with
  // hoops climbing it. What stands there goes up with it.
  fs_upper:{fn(id){ const e=nearest(640); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?300:220, [px,py]=stepIn(e,a,190), cx=px+Math.cos(a)*180, cy=py+Math.sin(a)*180, A2=fa(a), ca=Math.cos(a), sa=Math.sin(a); face(a);
    S(PUNCH[3]); GFX.light(cx,cy,R*1.5,PG.l,.5,.22,{z:30});
    after(.2,()=>{ const H=780, rc=R*.36, m=K.mats(), C=col(PG), sd=rand(0,9), p=[];
      K.vcolumn(cx,cy,{r:rc,h:H*1.55,dur:.85,rise:.1,out:.4,pal:PG,twist:4.4,turb:.95,taper:.62,heat:.95,gain:.75});
      for(let i=0;i<18;i++){ const u=i/17, an=A2+PI+u*5.6, r=rc*(1.5-.5*u); p.push({x:cx+Math.cos(an)*r,y:cy+Math.sin(an)*r*FSY,z:30+(H-60)*Math.pow(u,.8)}); }
      K.trail(p,{pal:PG,w:50,draw:.18,dur:.62,hold:.16,gain:1});
      if(F.on) GFX.add(.6,(k,t)=>{ for(let i=0;i<3;i++){ const v=t*1.9-i*.24; if(v<=0||v>=1) continue; const r=rc*(1.55-.5*v)*(1+.25*v); const al=Math.sin(PI*v); F.ring(m.shW,cx,cy,r*.45,r,{...C,z:H*v,a:al*.7,gain:1.3,t0:sd+i,layer:'o'}); F.ring(m.shL,cx,cy,r*.74,r,{...C,z:H*v,a:al*.9,gain:1.9,t0:sd+i,layer:'o'}); } });
      K.sparks(cx,cy,40,{pal:PG,n:7,sp:[80,300],up:1700,life:[.3,.6]}); GFX.light(cx,cy,R*2.6,PG.l,.8,.4,{z:260}); K.cool(cx,cy,{kind:'scorch',r:R*.7,pal:PG,life:1.3,start:.25,light:0});
      sfx('boom',1,.7); sfx('whoosh',1.1,.8); trauma=Math.min(1,trauma+.3); hitstop=Math.max(hitstop,.05); const Lh=[];
      inCircle(cx,cy,R,o=>Lh.push(o)); Lh.sort(byD(cx,cy)).forEach((o,i)=>{ if(i<1) pow(o,PG,-PI/2,1.1,1); if(i<3) K.ehit(o,{pal:'gold',pw:i?1:1.4,ring:0});
        smash(o,d,{kb:.2,up:1500,stun:1,sx:pl.x,sy:pl.gy},ca*.3,sa*.3,420,1250); if(!o.dead){ thrown(o,PG,0,-1,0); if(EVO(id)) after(.9,()=>{ if(!o.dead){ dmg(o,d*.6,{kb:.2}); hitFx(o,C2,1); } }); } });
      tails(Lh.slice(0,8),.8,PG); }); }},
  // KI SHOT: ki is drawn in over the floor to a ball pressed between his hands, sent off dragging its tail. What it goes through is knocked
  // aside and branded; when it bursts at the end of its flight every brand goes off.
  fs_ki:{fn(id){ const e=nearest(900); if(!e) return false; const a0=angTo(e), d=D(id), n=EVO(id)?3:1; face(a0); charge(); sfx('rise',1.2,.4);
    const hx=pl.x+Math.cos(a0)*70, hy=pl.gy+Math.sin(a0)*70; gather(hx,hy,BODY*.9,26,PK,.3,240,600);
    spiralIn(()=>[pl.x+Math.cos(a0)*70,pl.gy+Math.sin(a0)*70],BODY*.9,PK,.38,420); GFX.light(pl.x,pl.gy,460,PK.l,.6,.4,{z:BODY*.9}); after(.2,()=>GFX.light(pl.x,pl.gy,620,PK.l,.85,.22,{z:BODY*.9}));
    condense(.38,BODY*.9,PK,k=>[pl.x+Math.cos(a0)*70,pl.gy+Math.sin(a0)*70,18+92*k*k]);
    after(.38,()=>{ for(let k=0;k<n;k++){ const a=a0+(k-(n-1)/2)*.3, ca=Math.cos(a), sa=Math.sin(a), p={x:pl.x+ca*80,y:pl.gy+sa*80,vx:ca*1150,vy:sa*1150,life:1.05,d:d*.6,kb:0,r:130,hits:new Set(),c:C1,h:BODY*.9,pw:.01}; let c=0;
        p.onHit=o=>{ const side=(o.y-p.y)*ca-(o.x-p.x)*sa>=0?1:-1, ux=ca*.6-sa*side*.8, uy=sa*.6+ca*side*.8; if(c++<5) pow(o,PK,Math.atan2(uy,ux),.85,1); fling(o,ux,uy,900,520);
          if(!o.dead){ K.knock(o,{dir:fa(Math.atan2(uy,ux)),dist:170,up:450}); K.mark(o,'seal',{pal:'azure',tex:BRAND,dur:1.6,s:.6}); } };
        p.onEnd=p=>{ K.vblast(p.x,p.y,{s:340,z:p.h,pal:PK,smoke:0,dur:.6,fire:.36,rise:60,heat:1.15}); floorRing(p.x,p.y,90,420,.34,PK); let ec=0;
          K.sparks(p.x,p.y,p.h,{pal:PK,n:12,dir:fa(a),spread:1.2,sp:[500,1500],up:500}); GFX.light(p.x,p.y,480,PK.l,.8,.3,{z:p.h}); hitstop=Math.max(hitstop,.04); trauma=Math.min(1,trauma+.25); sfx('boom',1,.6);
          inCircle(p.x,p.y,260,o=>{ const dx=o.x-p.x, dy=o.y-p.y, l=Math.hypot(dx,dy)||1; if(ec++<4) K.ehit(o,{pal:'azure',pw:1.2,ring:0}); smash(o,d,{kb:0,push:400,up:1200,sx:p.x,sy:p.y},dx/l,dy/l,1100,750); });
          K.popAll('seal',o=>{ dmg(o,d*.4,{kb:0,push:200,up:900,sx:p.x,sy:p.y}); fling(o,ca,sa,800,700); },{full:3,pw:.7}); };
        kiShot(p); V.pj.push(p); }
      K.dust(pl.x,pl.gy,{n:6,dir:a0+PI,spread:.8,sp:[250,650],a:.4}); pring(pl.x+Math.cos(a0)*100,pl.gy+Math.sin(a0)*100,BODY*.9,a0,120,PK,.26,{travel:60}); sfx('boom',.7,.5); }); }},
  // STOMP: ki is drawn down into the raised foot; then the floor answers and nothing else does - a star of cracks runs out from his foot,
  // white-hot, behind one thick wave over the floor, stones jump where its arms end, and everything standing on it is thrown up and outward.
  fs_stomp:{fn(id){ const R=EVO(id)?620:520; if(countIn(R+140)<2&&!nearest(220)) return false; const d=D(id);
    S([['gy08',.12,{kick:[-1,.8]}],['gy01',.1],['gy12',.08,{kick:[2.4,-2]}],['gy13',.25],['gy16',.1]]);
    gather(pl.x,pl.gy,30,14,PK,.16,220,520); spiralIn(()=>[pl.x,pl.gy],60,PK,.21,300); GFX.light(pl.x,pl.gy,360,PK.l,.45,.22,{z:60});
    const wave=k=>{ const x=pl.x, y=pl.gy, r=R*(k?1.25:1), rc=r*.74, rot=rand(0,TAU), Lh=[];
      K.cool(x,y,{kind:'crack',r:rc*1.15,rot,pal:PK,life:1.6,hot:.7,grow:.04,gain:2.4,light:0}); K.cool(x,y,{kind:'crack2',r:rc*.7,rot:rot+1,pal:PK,life:1.4,hot:.65,grow:.05,gain:1.8,light:0});
      K.flare(x,y+6,24,{pal:PK,s:150,dur:.1,gain:3.2}); K.shock(x,y,{r:r*.92,dur:.42,pal:PK,dust:0,light:0,gain:.6}); floorRing(x,y,60,r*1.02,.36,PK,{gain:3.2}); floorRing(x,y,40,r*.7,.4,PK,{delay:.07,gain:2.2});
      for(let i=0;i<5;i++){ const a=rot+(i+rand(.2,.8))/5*TAU, rr=rc*rand(.7,.92); K.chunks(x+Math.cos(a)*rr,y+Math.sin(a)*rr*FSY,{n:3,r:34,sp:[100,380],up:1400,s:[50,104],pal:PK,rock:'#a9bcd8',life:1.1,delay:.04+i*.015}); }
      K.sparks(x,y,20,{pal:PK,n:8,sp:[400,1200],up:800}); GFX.light(x,y,r*1.35,PK.l,.4,.3,{z:180}); K.dust(x,y,{n:8,r:60,sp:[300,800],a:.35,c:'#141c2a'}); let ec=0;
      trauma=Math.min(1.1,trauma+.5); hitstop=Math.max(hitstop,.06); sfx('boom',1.4,1);
      inCircle(x,y,r,o=>Lh.push(o)); Lh.sort(byD(x,y)).forEach((o,i)=>{ const dx=o.x-x, dy=o.y-y, l=Math.hypot(dx,dy)||1;
        if(ec++<4) K.ehit(o,{pal:'azure',pw:1.1,ring:0,dir:Math.atan2(dy/FSY,dx)}); smash(o,d*(k?.6:1),{kb:0,big:true,push:340,up:1500},dx/l,dy/l,620,1200); if(!o.dead) thrown(o,PK,dx/l,dy/l,0); }); tails(Lh.slice(0,6),.7,PK); };
    after(.22,()=>wave(0)); if(EVO(id)) after(.55,()=>wave(1)); }},
  // RUSH: a fan of short straight fist lines, two or three to a beat, azure and gold in turn, every one ending on a real body. The last beat sends them flying.
  fs_rush:{fn(id){ const e=nearest(640); if(!e) return false; const a=angTo(e), d=D(id), R=EVO(id)?470:380, n=EVO(id)?14:10, A2=fa(a); face(a); stepIn(e,a,210);
    const st=[]; for(let i=0;i<8;i++) st.push(['gy0'+(2+i%4),.05]); st.push(['gy06',.06],['gy07',.08]); S(st);
    K.dust(pl.x,pl.gy,{n:6,dir:a,spread:.6,sp:[250,700],a:.35});
    for(let i=0;i<n;i++) after(i*.06,()=>{ const big=i===n-1, Lh=[], m=big?1:i%3===2?2:1; inSector(pl.x,pl.gy,a,R,.55,o=>Lh.push(o)); Lh.sort(byD(pl.x,pl.gy)); sfx('boom',.4,.35);
      for(let j=0;j<m;j++){ const o=Lh.length?(big?Lh[0]:Lh[(i+j*2)%Math.min(Lh.length,5)]):null, P=big?PG:PK; if(!o&&j) continue; let tx, ty, tz;
        if(o){ tx=o.x+rand(-10,10); ty=o.y+rand(-6,6); tz=o.z+o.h*rand(.45,.6); } else { const b=a+rand(-.4,.4), r=rand(.7,.9)*R; tx=pl.x+Math.cos(b)*r; ty=pl.gy+Math.sin(b)*r; tz=BODY*.5; }
        /* every fist leaves from one of his hands and stops on the body it hits */
        const b=Math.atan2(ty-pl.gy,tx-pl.x), cb=Math.cos(b), sb=Math.sin(b), sd=(j?-1:1)*(i%2?-1:1)*rand(30,70), sx=pl.x+cb*70-sb*sd, sy=pl.gy+sb*70+cb*sd*FSY, sz=BODY*rand(.5,.7), fly=big?.08:.05;
        kiFist(sx,sy,sz,tx-cb*20,ty-sb*20,tz,{pal:P,s:big?165:rand(92,112),fly,hold:big?.1:.03,fade:big?.24:.11,drift:big?170:30,gain:big?1.2:1});
        if(o) after(fly,()=>{ if(o.dead) return; if(big){ K.ehit(o,{pal:'gold',pw:1.6,dir:fa(b)}); pring(o.x,o.y,o.z+o.h*.5,b,150,PG,.3,{travel:200}); } else pow(o,P,b,.85,1); }); }
      for(const o of Lh){ if((o.rushT||0)>RT) continue; o.rushT=RT+.05; const dx=o.x-pl.x, dy=o.y-pl.gy, l=Math.hypot(dx,dy)||1;
        if(big){ smash(o,d,{kb:0,push:500,up:900},dx/l,dy/l,1500,700); if(!o.dead) thrown(o,PG,dx/l,dy/l,1); } else { smash(o,d,{kb:0,push:60,stun:.25},dx/l,dy/l,900,450); o.flash=Math.min(o.flash,.35); } }
      if(big&&Lh.length){ GFX.light(Lh[0].x,Lh[0].y,520,PG.l,.9,.28,{z:120}); hitstop=Math.max(hitstop,.05); trauma=Math.min(1,trauma+.3); } }); }},
  // TORNADO KICK: the hollow funnel round him is the whole skill; what touches it is lifted and dragged in along its turn, and when it
  // is thrown open at the end everything round him goes out with it
  fs_tornado:{fn(id){ if(V.zones.some(z=>z.torn)||countIn(700)<2) return false; const d=D(id), R=EVO(id)?320:240; let fc=0, ft=-1;
    twister(R,3);
    S([['gy02',.05],['gy03',.05],['gy04',.05],['gy05',.05]]); sfx('whoosh',.8,.8);
    V.zones.push({torn:true,follow:true,r:R,life:3,tick:.2,fn:e=>{ const an=Math.atan2((e.y-pl.gy)/FSY,e.x-pl.x), dx=e.x-pl.x, dy=e.y-pl.gy, l=Math.hypot(dx,dy)||1; if(ft!==RT){ ft=RT; fc=0; }
        if(fc++<3) hitFx(e,C1,.8); smash(e,d,{kb:0,stun:.25},-dy/l,dx/l,800,800); if(!e.dead){ K.knock(e,{dir:an+(EVO(id)?2.5:2.2),dist:EVO(id)?200:150,up:950,fx:0}); e.flash=Math.min(e.flash,.3); } },
      onTick:z=>{ if(!anim.seq) S([['gy02',.05],['gy03',.05],['gy04',.05],['gy05',.05]]); sfx('whoosh',1.2,.3); K.dust(z.x,z.y,{n:2,r:R*.5,sp:[150,400],a:.3}); },
      onEnd:()=>{ if(lock) return; const x=pl.x, y=pl.gy; K.shock(x,y,{r:R*1.9,dur:.4,pal:PK,dust:6,light:0}); K.sparks(x,y,BODY,{pal:PK,n:12,sp:[400,1200],up:900}); GFX.light(x,y,R*2.6,PK.l,.8,.3,{z:160}); sfx('boom',.9,.6); trauma=Math.min(1,trauma+.25);
        inCircle(x,y,R*1.35,e=>{ const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy)||1; smash(e,d,{kb:0,push:380,up:1100,sx:x,sy:y},dx/l,dy/l,1300,700); if(!e.dead) thrown(e,PK,dx/l,dy/l,1); }); }}); }},
  // IRON BODY: golden ki running round him on three rings; every beat they strike outward and what they touch is shoved off, branded gold
  fs_aura:{fn(id){ if(V.armor>0||countIn(640)<3) return false; const d=D(id), T=EVO(id)?6:4; V.armor=T; charge(); sfx('rise',.7,.6); stamp('아이언',{x:.5,y:.2,size:.08,life:.8,c:C2}); let fc=0, ft=-1;
    aura(T);
    V.zones.push({follow:true,r:260,life:T,tick:.5,fn:e=>{ const dx=e.x-pl.x, dy=e.y-pl.gy, l=Math.hypot(dx,dy)||1; if(ft!==RT){ ft=RT; fc=0; }
        if(fc++<3) pow(e,PG,Math.atan2(dy,dx),.9,1); else hitFx(e,C2,.9); smash(e,d,{kb:0,push:200,up:350},dx/l,dy/l,1000,520);
        if(!e.dead) thrown(e,PG,dx/l,dy/l,.6); }, onTick:z=>{ sfx('boom',.5,.3); floorRing(pl.x,pl.gy,90,330,.3,PG,{gain:2.2}); }}); }},
  // GIGA IMPACT: gold is drawn in over the floor to a ball crushed in his fist; then all of it at once as one colossal golden fist thrown
  // down the line, hoops of air opening behind it, inside a cone of ki that widens the further it goes. What it meets is carried off;
  // its track cools on the floor.
  fs_giga:{fn(id){ const e=nearest(700); if(!e) return false; const a=angTo(e), d=D(id), Lg=900, ca=Math.cos(a), sa=Math.sin(a), z=BODY*.6, A2=fa(a); face(a); charge(); sfx('rise',1,.6);
    gather(pl.x+ca*120,pl.gy+sa*120,z,30,PG,.36,260,700); condense(.45,z,PG,k=>[pl.x+ca*120,pl.gy+sa*120,16+84*k*k]); spiralIn(()=>[pl.x+ca*120,pl.gy+sa*120],z,PG,.45,560);
    K.cool(pl.x,pl.gy,{kind:'crack',r:300,pal:PG,life:1.3,hot:.8,grow:.4,gain:1.6,light:0});
    GFX.light(pl.x,pl.gy,560,PG.l,.4,.25,{z}); after(.2,()=>GFX.light(pl.x,pl.gy,760,PG.l,.75,.28,{z}));
    after(.45,()=>{ const px=pl.x, py=pl.gy, x1=px+ca*Lg, y1=py+sa*Lg, xm=px+ca*Lg*.5, ym=py+sa*Lg*.5, S2=new Set(), Lh=[];
      jet(px+ca*70,py+sa*70,z,a,Lg*.7,{r:150,r0:40,dur:.42,in:.05,out:.25,pal:PG,speed:16,turb:.4,heat:.9,gain:.3});
      kiFist(px+ca*150,py+sa*150,z+40,px+ca*Lg*.8,py+sa*Lg*.8,z+40,{pal:PG,s:330,fly:.14,hold:.12,fade:.5,gain:1.3,drift:200});
      after(.26,()=>{ K.chunks(px+ca*Lg*.9,py+sa*Lg*.9,{n:6,r:90,sp:[200,700],up:900,s:[40,90],pal:PG,rock:'#8a6a24',life:1}); K.vsmoke&&K.vsmoke(px+ca*Lg*.95,py+sa*Lg*.95,{s:200,dur:.9,rise:160,a:.5,...DUST}); });
      [[.3,150,.05],[.55,210,.09],[.8,270,.13]].forEach(([u,r,dl])=>pring(px+ca*Lg*u,py+sa*Lg*u,z,a,r,PG,.34,{travel:90,delay:dl}));
      K.coolLine(px+ca*150,py+sa*150,x1,y1,{w:130,pal:PG,life:2.5,grow:.12,gain:1.3});
      K.dust(px,py,{n:8,dir:a+PI,spread:.7,sp:[300,800]}); GFX.light(xm,ym,Lg*.62,PG.l,.8,.45,{z}); trauma=1; hitstop=Math.max(hitstop,.07); sfx('boom',1.8,1);
      const hit=o=>{ if(S2.has(o)) return; S2.add(o); Lh.push(o); }; inLine(px,py,x1,y1,140,hit); inLine(xm,ym,x1,y1,230,hit);
      Lh.sort(byD(px,py)).forEach((o,i)=>after(.02+.1*Math.min(1,Math.hypot(o.x-px,o.y-py)/Lg),()=>{ if(o.dead) return; if(i<3) pow(o,PG,a,1.4,0); smash(o,d,{kb:0,big:true,push:520,up:1500,sx:px,sy:py},ca,sa,1900,800); if(!o.dead) thrown(o,PG,ca,sa,1); }));
      tails(Lh.slice(0,6),.7,PG);
      if(EVO(id)) for(let i=1;i<=5;i++) after(i*.07,()=>{ const x=px+ca*Lg*i/5, y=py+sa*Lg*i/5; K.vblast(x,y,{s:120,pal:PG,smoke:0,dur:.6,heat:1.1}); GFX.light(x,y,380,PG.l,.8,.2,{z:100}); inCircle(x,y,170,o=>dmg(o,d*.4,{kb:.8,sx:x,sy:y})); }); }); }},
};
/// ---- ultimates. Each is one staged sequence: omen -> release -> development -> climax -> afterglow
const ROCK='#46587a';
// PACHEON KI CANNON (fs_ult1): a beam with two ends, one from each hand, thrown opposite ways past the edges of the picture and turned half a
// circle, so every direction is crossed once and both halves of the field are being torn up at any moment. Its length never changes and its
// width on the picture is the same whichever way it points. What it passes over stays lit: a white-hot track on the floor, ki streaming up
// off it, and a crag of broken rock heaved up a tenth of a second behind the beam. The beams are squeezed thin while gold is drawn into his
// hands and spreads out from his feet through the cracks, the tracks and the crags; golden beams of three sizes then burst out of him, a thin
// hard ring runs to the edge of the picture, every body on the field is struck and thrown outward, and the crags break into rocks that
// bounce, roll, cool from gold through red and settle into the floor while the tracks go out one after another from his feet outward.
const sm5=k=>k*k*k*(k*(6*k-15)+10);
// a turn at constant speed with a short run-up and run-down (r = the fraction of the time spent on each)
const trap=(k,r=.14)=>{ const v=1/(1-r); return k<r?v*k*k/(2*r):k>1-r?1-v*(1-k)*(1-k)/(2*r):v*(k-r/2); };
// when the turn reaches the fraction u
const itrap=u=>{ let a=0, b=1; for(let i=0;i<24;i++){ const c=(a+b)/2; if(trap(c)<u) a=c; else b=c; } return (a+b)/2; };
// 0 -> 1 with one overshoot (about a tenth) before it settles
const backOut=k=>{ const q=k-1; return 1+2.70158*q*q*q+1.70158*q*q; };
// floor cracks that heat up instead of cooling: fn(t) -> [radius, heat k (1 = out .. 0 = white-hot)]. Same picture and turn as K.cool 'crack', which takes over from it.
function heatCrack(x,y,rot,dur,fn){ if(!F.on) return {dead:true}; const m=K.mats(), h={dead:false};
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const [r,hk]=fn(t), H=K.heat(PK,hk); F.quad(m.crD,x,y,r*1.04,r*1.04,rot,{a:.75*sat(t/.2)}); F.quad(m.crE,x,y,r,r,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(1-hk)*3),gain:2.3*H.g,ero:.1+.45*hk}); });
  return h; }
// one mote of ki drawn in to a point from a long way off (a long streak, so the pull reads)
const suck=(x,y,z,P,r0,r1)=>{ const a=rand(0,TAU), d=rand(r0,r1); GFX.pt({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,z:rand(0,320),tx:x,ty:y,tz:z,pull:rand(5,8),life:rand(.3,.48),s:rand(3,5.5),m:3,len:.09,vx:-Math.sin(a)*420,vy:Math.cos(a)*250,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); };
// the ultimate's own thread of ki: thin, long along its way and spiralling in (k 0..1 = how far the charge has gone: faster and brighter)
const suckU=(x,y,z,P,r0,r1,k=0)=>{ const a=rand(0,TAU), d=rand(r0,r1), z0=rand(0,420); GFX.pt({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*FSY,z:z0,oc:[x,y,z],or:d,oa:a,ow:rand(1.4,2.4)*(1+k),ok:d/rand(.32,.46),oz0:z0,rmin:30,life:.9,s:rand(1.1,1.8)*(1+.6*k),m:3,len:rand(.05,.08),c:GFX.rgb(Math.random()<.25?'#ffffff':P.s),c3:'#ffffff',c2:P.b,fk:9,L:3,pri:1}); };
// what a blow leaves on a body that is being thrown: the blow's colour on the body for a moment (in place of the white cut-out, which turns
// a struck crowd into one white lump) and hard streaks the way it goes (no dust puffs). Call it after the damage and the knock.
function thrown(e,P,ux,uy,pw=1){ if(!(e.mkT>RT)||e.mkF){ e.mkC=P.l; e.mkT=RT+.45; e.mkF=1; } e.flash=Math.min(e.flash,.12); if(!GFX.on||!pw) return;
  for(let i=0;i<4;i++) GFX.pt({x:e.x+rand(-22,22),y:e.y+rand(-10,10),z:e.z+rand(20,e.h*.9),vx:ux*rand(1500,3200)*pw,vy:uy*rand(1500,3200)*pw,vz:rand(0,200),g:0,drag:6,life:rand(.2,.36),s:rand(3,5.5),m:3,len:.08,c:GFX.rgb(P.s),c3:P.h,c2:P.b,L:3}); }
const ROCK1='#3a465e';
const ROCKB='#6a6672', GRAV=2600;
// the beam, drawn here every frame as a pure function of the clock: white thread, streaming colour, hazy sheath, a dark body behind them and
// its light lying on the floor. The mouth opens over a fixed distance on the floor (not a fraction of the length), so the beam has the same
// width on the picture whichever way it points. s0 = how much of it has already left the mouth (it ends by running out to its far end).
let BMT=null;
const bmt=()=>{ if(BMT) return BMT; const blk={cA:'#000000',cB:'#000000',cC:'#000000',op:1};
  BMT={U:F.mat({nz:'wisp',n1:[.9,1,-1.4,0],nk:.55,ero:.1,soft:.45,pm:[2,1.1,0,0],...blk,a:.5}),
    O:F.mat({nz:'wisp',n1:[.8,1.3,-2.4,0],n2:[1.3,1,-1,0],dist:.07,nk:.85,ero:.06,soft:.55,pm:[2,1.25,0,0],rk:[.7,1.6],gain:1.25,bgain:.85}),
    B:F.mat({nz:'streak',n1:[.7,3,-4.6,0],n2:[1.6,1,-2,0],dist:.03,nk:.5,ero:.1,soft:.22,pm:[2,2.1,0,0],rk:[.5,1.05],gain:2.8,bgain:1.15}),
    C:F.mat({nz:'streak',n1:[.6,1,-6.5,0],nk:.16,ero:.12,soft:.2,pm:[2,4.2,0,0],rk:[.12,.4],gain:5,bgain:2.4})}; return BMT; };
const BU=[0,.012,.028,.05,.085,.14,.22,.33,.46,.6,.74,.87,.95,1];
function kiBeam(x,y,z,d,len,w,a,P,t,sd,o={}){ if(!F.on||a<=.01||w<=1||len<=1) return; const M=bmt(), m=K.mats(), c=Math.cos(d), s=Math.sin(d)*FSY, s0=o.s0||0, g=o.gain||1, ul=o.ul||w*16, br=1+.025*Math.sin(t*8.3+sd), n=BU.length, tp=o.taper||260,
    C=col(P), CW={cA:P.b,cB:P.m,cM:P.h,cC:'#ffffff'}, CO={cA:P.d,cB:P.b,cM:P.b,cC:P.m};
  const pts=(k,fl)=>{ const ps=[]; for(let i=0;i<n;i++){ const D=mix(s0,len,BU[i]), mo=.22+.78*Math.pow(sat((D-s0)/tp),.7), tk=i===n-1?.4:i===n-2?.82:1; ps.push({x:x+c*D,y:y+s*D,z:fl?0:z,w:w*k*mo*tk*br*(1+.08*Math.sin(t*29+i*2.1+sd))}); } return ps; };
  const lod=o.lod||0;
  // two white strands wound round the beam's body, running out along it (the twist you can read on its skin)
  if(o.helix&&!F.low){ const hl=Math.min(len,o.helix), px=-s, py=c, pn=Math.hypot(px,py)||1; for(let j=0;j<2;j++){ const hs=[]; for(let i=0;i<26;i++){ const u=i/25, D=s0+hl*u, ph=D/150-t*16+sd+j*PI, rr=w*.62*(.4+.6*Math.pow(sat((D-s0)/tp),.7));
        hs.push({x:x+c*D+px/pn*Math.sin(ph)*rr,y:y+s*D+py/pn*Math.sin(ph)*rr*FSY,z:z+Math.cos(ph)*rr*.8,w:w*.09*(1-.6*u)}); }
      F.ribbon(M.C,hs,{...CW,a:.75*a*(.55+.45*Math.cos(t*7+j)),gain:3.2*g,ulen:ul*.5,t0:sd+3+j}); } }
  if(lod<1) F.ribbon(M.O,pts(2.6,1),{...CO,layer:'g',a:.5*a,gain:1.1*g,ulen:ul,t0:sd+5});
  if(lod<2) F.ribbon(M.U,pts(2.9),{a:.5*a,ulen:ul,t0:sd});
  F.ribbon(M.O,pts(2.3),{...CO,a:.85*a,gain:1.25*g,ulen:ul,t0:sd});
  F.ribbon(M.B,pts(1.3),{...C,a,gain:2.8*g,ulen:ul,t0:sd});
  F.ribbon(M.C,pts(.5),{...CW,a,gain:5*g,ulen:ul*.8,t0:sd+2});
  if(o.mouth!==0){ const mb=1+.06*Math.sin(t*11+sd), mx=x+c*s0, my=y+s*s0; if(lod<2) F.bill(m.glowO,mx,my,z,w*2.1*mb,w*2.1*mb,0,{...C,a:.8*a,gain:2.4*g}); F.bill(m.glowO,mx,my,z,w*.85*mb,w*.85*mb,0,{...CW,a,gain:3*g}); }
  if(o.tip){ const tx=x+c*len, ty=y+s*len; F.bill(m.glowO,tx,ty,z,w*1.5,w*1.5,0,{...C,a:.7*a,gain:2.2*g}); F.quad(m.glowG,tx,ty,w*5,w*5,0,{...C,a:.6*a,gain:1.3}); } }
// a broken piece of rock thrown off a crag: it flies, lands, bounces twice losing speed and spin, slides to rest, cools from white-gold at its
// edges through red to cold stone, and then settles into the floor. Where it is at any moment is a function of time alone.
function rubAt(c,q){ let x=c.x, y=c.y, z=0, ang=0, vx=c.vx, vy=c.vy, vz=c.vz, w=1, tq=q, rest=true;
  for(let b=0;b<3;b++){ const Tb=2*vz/GRAV; if(tq<Tb){ z=vz*tq-.5*GRAV*tq*tq; x+=vx*tq; y+=vy*tq; ang+=w*tq; rest=false; break; } x+=vx*Tb; y+=vy*Tb; ang+=w*Tb; tq-=Tb; vx*=.62; vy*=.62; vz*=.38; w*=.55; }
  if(rest){ const e=(1-Math.exp(-1.3*tq))/1.3; x+=vx*e; y+=vy*e; ang+=w*e; }
  return [x,y,z,ang]; }
function rubble(c,q){ if(q<0) return; const [x,y,z,ang]=rubAt(c,q), cool=sat(q/c.ct), sink=sat((q-c.st)/.8), sk=sink*sink, h=1-cool; if(sink>=1) return; const rc=cool<.25?PG.h:cool<.55?PG.b:'#e03c0c';
  F.solid(c.kind,c.v,x,y,z+c.s*c.kz*(c.kind==='boulder'?.3:.12)-c.s*c.kz*.8*sk,{M:F.xf({sx:c.s*c.kx,sy:c.s*c.ky,sz:c.s*c.kz,rx:c.ax*ang,ry:c.ay*ang,rz:c.rz+c.az*ang}),alb:'#4a4650',emis:rc,rimC:rc,spec:.3,rim:.5*h*h,vein:0,heat:.2*h,bump:1.6,tone:.52,ero:.55*sink,clip:sink>0?1:0,detail:1,strata:5,edge:.12,ore:0,glow:1.2*h*h,seed:c.v*2.3,...(c.kz>.45||(c.kz>.2&&q>.45)?{shadow:[.55,.28,.28*(1-sink)]}:{})}); }
function ultBeam(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), e0=densest(1600)||nearest(1600), a0=e0?angTo(e0):(pl.f>0?0:PI), x0=pl.x, y0=pl.gy, hz=BODY*.62, P=PK, m=K.mats(); face(a0);
  const tA=.32, tH=1.13, tF=1.35, tS=1.5, TS=1.28, tE=2.8, tC=3.2, tK=3.72, tEnd=5.2;
  // the beam's length is fixed for the whole skill: past the far corner of the widest picture the camera shows while it is alive
  const diag=Math.hypot(hw,hh/FSY), Lb=diag/.55*1.15, Lg=diag/.5*1.1, aF=fa(a0), sgn=Math.cos(a0)>=0?1:-1, ca0=Math.cos(a0), sa0=Math.sin(a0), rot=rand(0,TAU), solid=()=>F.on&&F.solids&&F.solids(), sdA=rand(0,9), sdB=rand(0,9);
  const st=[['gx01',.1],['gx02',.14],['gx03',.2],['gx04',tF-.54,{kick:[-.8,.6]}],['gx08',.1,{kick:[2.2,-1.8]}]]; for(let i=0;i<5;i++) st.push(['gx'+String(9+i%4).padStart(2,'0'),.29]); st.push(['gx12',.12],['gx04',tC-tE-.17,{kick:[-.8,.6]}],['gx08',.05,{kick:[2.2,-1.8]}],['gx10',.7],['gx13',.5],['gx14',9]); S(st);
  // ---- preparation and build-up are one climb with no level stretch: the orb, the cracks, the light on the floor, the streams of ki turning
  // up round him and the stones leaving the floor all follow one curve that gets steeper, and the beats on top of it come faster.
  const B=[.06,.3,.5,.66,.8,.91,1,1.07], gch=t=>sat(t/tH), orbR=t=>{ let r=12+92*Math.pow(gch(t),1.7); for(let i=0;i<B.length;i++) r+=9*eo3(sat((t-B[i])/.1)); return r; }, orbXY=r=>[x0+ca0*(40+r*.8),y0+sa0*(24+r*.45)],
    crR=t=>{ let r=70+430*Math.pow(gch(t),1.5); for(let i=0;i<B.length;i++) r+=13*eo3(sat((t-B[i]-.02)/.12)); return r; };
  GFX.ambient(.34,.4,.56,3); Cn.move({x:x0-ca0*120,y:y0-BODY*.6-sa0*70,zoom:1.3,tilt:.04},.4); const dr=Cn.drone(52,.4); SFX.rumble(1.3); Cn.SND.inhale(tH,.4);
  B.forEach((bt,i)=>after(bt,()=>{ const [ox,oy]=orbXY(orbR(bt+.1)), n=10+6*i;
    if(i===1){ K.flare(ox,oy,hz,{pal:'silver',s:130,sx:3.4,sy:.4,dur:.2,gain:4}); Cn.SND.tick(1.5,.35); }
    K.flare(ox,oy,hz,{pal:P,s:70+26*i,dur:.15,gain:1.6+.26*i}); GFX.light(x0,y0,520+170*i,P.l,.5+.08*i,.24,{z:hz}); Cn.SND.tick(.9+i*.12,.14+.02*i); Cn.shake(.08+.06*i);
    for(let j=0;j<n*.5;j++) after(rand(0,.1),()=>suckU(ox,oy,hz,P,380+90*i,760+190*i,i/7));
    if(i>=3) K.sparks(ox,oy,hz,{pal:P,n:5+2*i,sp:[300,900],up:300,life:[.1,.25]}); }));
  const spot=GFX.light(x0,y0,300,P.l,.4,.4,{hold:tF,z:130});
  // stones lifted off the floor by the pressure: slowly at first, then faster and higher; the release throws them
  const RK=[]; for(let i=0;i<5;i++){ const a=i/5*TAU+rand(-.3,.3), r=rand(260,580); RK.push({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,a,s:rand(48,88),v:i,sd:rand(0,9),z1:rand(170,540),d:rand(0,.35),ph:rand(0,TAU),sp:rand(500,1100),vz:rand(300,900),ax:rand(-6,6),ay:rand(-6,6)}); }
  const ob=K.vorb(x0,y0,hz,{r:12,dur:tF+.05,pal:P,in:.2,out:.04,spin:3.5,core:.26,gain:1.05});
  // the aura on his body: a thin sheath of ki standing up off his feet, taller and wider as the charge climbs
  const AU=K.vjet(x0,y0,0,aF,{len:60,r:50,r0:85,pitch:PI/2,dur:tF+.05,in:.3,out:.06,pal:P,heat:.9,turb:.9,speed:6,flow:.8,gain:.55});
  // the pull on the orb: threads spiralling in from off the picture, shells tightening on it, sparks round it, grit lifting, haze
  const GA=K.gather(x0,y0,hz,{dur:tH,max:tF+.1,pal:P,r:240,R:1400,n:.15,shells:3,core:0,floor:0,haze:1,debris:1,sparks:1,gain:.9});
  // four pillars of ki standing up off the floor at his sides, one after another; each only ever grows. In the last fifth of a second
  // they lean over into the two directions the beams will go and their feet run in to his hands: the beams are these pillars laid down.
  // Each pillar is three skins: a hazy sheath (a soft glow card), the cyan body (a jet whose grain runs upward) and a white thread inside it
  // (a thin silver jet). It is born in three steps: the floor at its foot cracks and glows for a seventh of a second, a short point comes
  // out of the crack, and only then does it climb to its height. No two have the same girth.
  const dR=Math.cos(aF)>=0?aF:aF+PI, PZ=[[-.2,430,.16,1.15],[PI+.6,250,.36,.78],[.55,260,.55,.92],[PI-.12,440,.74,1.05]].map(([a,r,tb,gw])=>{ const px=x0+Math.cos(a)*r, py=y0+Math.sin(a)*r*FSY, dd=Math.cos(a)>=0?dR:dR+PI;
    return {px,py,tb,dd,gw,cr:rand(0,TAU),mx:x0+Math.cos(dd)*210,my:y0+Math.sin(dd)*210*FSY,h:K.vjet(px,py,0,dd,{len:20,r:30,r0:66,pitch:PI/2,dur:tF+.1-tb,delay:tb,in:.06,out:.1,pal:P,heat:1.5,turb:.75,speed:9,flow:.9,freq:3.4}),
      hc:K.vjet(px,py,0,dd,{len:20,r:10,r0:18,pitch:PI/2,dur:tF+.1-tb,delay:tb+.03,in:.05,out:.1,pal:'silver',heat:2.6,turb:.3,speed:12,flow:1.2,gain:2.2})}; });
  const pzH=(p,t)=>{ const c=t-p.tb, H=240+1050*Math.pow(gch(t),1.5); return c<=0?0:c<.07?150*eo3(c/.07):150+(H-150)*sm5(sat((c-.07)/.32)); };
  after(tA,()=>Cn.move({zoom:1.5,roll:.03*sgn},tH-tA,'in'));
  after(tH,()=>{ Cn.hush(.2); dr.stop(.1); });
  // ---- what the sweep leaves behind it. The beam has two ends: one from each hand, opposite ways, and the pair is turned half a circle, so
  // every direction is crossed once and both halves of the field are being torn up at any moment. Each direction that has been crossed keeps
  // a white-hot track on the floor from his feet to past the edge of the picture; at eight of them a crag of broken rock is heaved up a tenth
  // of a second behind the beam. When each one starts is fixed here, from the turn itself.
  const NP=8, PL=[], TR=[], whenAt=u=>{ const f=(u%1)*2, pr=f<1?f:f-1; return tS+TS*itrap(Math.min(.985,Math.max(.01,pr))); };
  for(let i=0;i<NP;i++){ const u=(i+.5+rand(-.18,.18))/NP, a=aF+sgn*TAU*u, r=900*rand(.88,1.14), front=Math.sin(a)>.35, t0=whenAt(u)+.1, s=rand(640,800)*(front?.62:1)*(i%3===1?.74:1), sd=i%2?1:-1, ca=Math.cos(a), sa=Math.sin(a), tx=-sa*sd, ty=ca*FSY*sd, rz=a+rand(-.6,.6), ln=rand(.1,.26);
    // one crag: a tall rock, a lower one against it, a shard out of the side, a point out of the top, stones at the foot
    const pc=[{k:'crag',v:i,dx:0,dy:0,dz:-.25,sx:.62,sy:.55,sz:1.25,rz,ln},
      {k:'boulder',v:i+3,dx:tx*.3,dy:ty*.3,dz:-.2,sx:.5,sy:.46,sz:rand(.7,.95),rz:rz+1,ln:ln+.1},
      {k:'spike',v:i+1,dx:-tx*.24+ca*.08,dy:-ty*.24+sa*.08*FSY,dz:0,sx:.4,sy:.4,sz:rand(.42,.55),rz:rz-1,ln:ln+.22}].sort((p,q)=>p.dy-q.dy);
    PL.push({i,u,a,t0,x:x0+ca*r,y:y0+sa*r*FSY,s,sd,pc,ca,sa,up:false,tb:-1,br:rand(0,TAU),f1:[tx*.42+ca*.2,ty*.42+sa*.2*FSY+.05,rand(.2,.3)],f2:[-tx*.46+ca*.1,-ty*.46+sa*.1*FSY+.06,rand(.13,.2)]});
    TR.push({a:a+rand(-.04,.04),r0:230,L:Lb*.8,w:rand(96,128),t0:t0-.1,cd:.065*i+rand(0,.1),gd:rand(0,.08),big:1,n:0});
    // a thinner track between this one and the next
    if(i%2===0){ const u2=(i+1+rand(-.1,.1))/NP; TR.push({a:aF+sgn*TAU*u2,r0:260,L:Lb*.6,w:rand(52,70),t0:whenAt(u2),cd:rand(0,.4),gd:rand(.04,.12),big:0,n:0}); } }
  const PLb=PL.filter(s=>s.y<y0).sort((p,q)=>p.y-q.y), PLf=PL.filter(s=>s.y>=y0).sort((p,q)=>p.y-q.y), RB=[];
  let T=0, tOff=0, nSuck=0, nAur=0, gT=0, gob=null, GG=null, glit=null, lit=null, fired=false, Lfly=null, nTr=0;
  // where the pair of beams points, how wide it is and how much of it is left, at the skill's time t
  // from tE the two far ends are hauled back into his hands (faster and faster) and the beam goes white as it comes in; it is gone at tR
  const tR=tC-.04, bDir=t=>aF+sgn*PI*trap(sat((t-tS)/TS)), bRet=t=>sat((t-tE)/(tR-tE)), bK=t=>sat((t-tF)/(tE-tF)), bW=t=>(105+185*Math.pow(bK(t),1.3))*(1-.5*bRet(t));
  const hx=h=>parseInt(h.slice(1),16), mixh=(p,q,u)=>{ const A2=hx(p), B2=hx(q), f=s=>Math.round(mix((A2>>s)&255,(B2>>s)&255,u)); return '#'+((1<<24)|(f(16)<<16)|(f(8)<<8)|f(0)).toString(16).slice(1); },
    pmix=(p,q,u)=>u<=0?p:u>=1?q:{d:mixh(p.d,q.d,u),b:mixh(p.b,q.b,u),m:mixh(p.m,q.m,u),h:mixh(p.h,q.h,u),l:mixh(p.l,q.l,u),s:mixh(p.s,q.s,u)};
  const rise=s=>{ const d=Math.atan2(s.sa*FSY,s.ca); K.debris(s.x,s.y,{n:9,r:s.s*.3,sp:[150,620],up:1300,size0:8,size:28,c:'#6a6474'}); K.dust(s.x,s.y,{n:7,r:s.s*.3,sp:[120,420],a:.5,s:1.2,life:1.1}); K.sparks(s.x,s.y,30,{pal:P,n:9,sp:[200,800],up:1400,life:[.25,.5]}); GFX.light(s.x,s.y,460,P.l,.85,.32,{z:120}); Cn.shake(.42);
    { const r=s.i%2?rand(1500,1800):rand(1200,1400); K.vjet(x0+s.ca*r,y0+s.sa*r*FSY,70,s.a,{len:rand(650,1000),r:rand(70,100),r0:34,dur:Math.max(.5,tE+.25-s.t0),pitch:.16,turb:1,speed:9,in:.16,out:.36,pal:P,heat:1.3,flow:.6}); }
    K.sparks(x0+s.ca*hw*.8,y0+s.sa*hw*.8*FSY,20,{pal:P,n:8,dir:d,spread:.3,sp:[300,1100],up:1100,life:[.25,.5]}); };
  V.ultTick=dt=>{ T+=dt;
    if(T<tH){ Cn.shake(.05+T*.2); const want=Math.floor(16*T+60*T*T), [ox,oy]=orbXY(orbR(T)); while(nSuck<want){ nSuck++; suckU(ox,oy,hz,P,420,700+620*T/tH,T/tH); }
      // grit and motes wound up off the floor into each standing pillar, and a skin of ki rising round his body; both thicken with the charge
      if(GFX.on){ const k=T/tH, wa=Math.floor(T*(10+34*k)); while(nAur<wa){ nAur++;
          for(const p of PZ){ if(T<p.tb+.05) continue; const a=rand(0,TAU), r=rand(110,230); GFX.pt({x:p.px+Math.cos(a)*r,y:p.py+Math.sin(a)*r*FSY,z:0,oc:[p.px,p.py,rand(180,520)*(.5+k)],or:r,oa:a,ow:rand(5,8),ok:r/rand(.35,.5),oz0:rand(0,20),rmin:8,life:.7,s:rand(1.4,2.4),m:3,len:.06,c:GFX.rgb(Math.random()<.3?'#ffffff':P.s),c3:'#ffffff',c2:P.b,L:3,pri:1}); }
          const a=rand(0,TAU), r=rand(60,95); GFX.pt({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:rand(0,30),vx:-Math.sin(a)*60,vy:Math.cos(a)*30,vz:rand(380,700)*(.6+k),g:0,drag:1.5,life:rand(.35,.55),s:rand(2.2,3.6),m:3,len:.07,c:GFX.rgb(Math.random()<.35?'#ffffff':P.s),c2:P.b,L:3,pri:1}); } } }
    if(fired&&T<tE){ const d=bDir(T); face(Math.atan2(Math.sin(d)*FSY,Math.cos(d))); if(lit){ lit.x=x0+Math.cos(d)*hw*.5; lit.y=y0+Math.sin(d)*hw*.5*FSY; } }
    for(const s of PL) if(!s.up&&T>=s.t0&&T<tC){ s.up=true; rise(s); }
    // every track that has been lit keeps throwing ki up off the floor until the blow: what the beam has crossed stays burning
    if(GFX.on&&T>tS&&T<tC){ for(const tr of TR){ if(T<tr.t0) continue; const want=Math.floor((T-tr.t0)*(tr.big?8:4)); while(tr.n<want){ tr.n++; const r=rand(300,hw*1.7), gd=T>tE+.15, Q=gd?PG:P;
          GFX.pt({x:x0+Math.cos(tr.a)*r+rand(-30,30),y:y0+Math.sin(tr.a)*r*FSY+rand(-16,16),z:rand(0,30),vx:rand(-40,40),vy:0,vz:rand(520,1350),g:0,drag:1.3,life:rand(.3,.58),s:rand(3,5.5),m:3,len:.07,c:GFX.rgb(Math.random()<.35?'#ffffff':Q.s),c2:Q.b,L:3}); } } }
    // gold drawn in while the beam goes out
    if(T>=tE&&T<tC){ const k=(T-tE)/(tC-tE), want=Math.floor(80*k*k+20*k); while(gT<want){ gT++; suckU(x0+ca0*70,y0+sa0*40,hz,PG,600,1500,k); } if(gob&&!gob.dead) gob.r=16+96*k*k; if(glit){ glit.a=.1+.8*k; glit.r=hw*(.5+.8*k); } }
    // a line of light left in the air behind every body the blow has thrown
    if(Lfly&&GFX.on&&T<tK+.1&&T-nTr>.03){ nTr=T; for(const e of Lfly){ if(e.dead) continue; GFX.pt({x:e.x+rand(-8,8),y:e.y,z:e.z+e.h*.5+rand(-12,12),vx:0,vy:0,vz:0,g:0,drag:0,life:rand(.26,.4),s:rand(7,11),m:8,c:GFX.rgb(PG.m),L:3}); } } };
  // ---- drawn as a pure function of the skill's clock (nothing here is decided by which frames happen to be drawn)
  const crag=(s,Tn)=>{ const q=Tn-s.t0; if(!s.up||q<0||(s.tb>=0&&Tn>=s.tb)) return; const k=sat(q/.22), e=backOut(k), hg=sat((Tn-tE-.1)/(tC-tE-.1)), E=hg>0?PG:P, hot=1-sat(q/.9), S=s.s, z=S*(e-1)*.9, f=eo3(k),
      wh=sat(1-Math.abs(hg-.35)/.25), o={alb:'#4e4a54',emis:wh>.5?'#ffffff':E.b,rimC:E.h,spec:.45,rim:.2+.3*hg,vein:.05,heat:.12+.3*hot+.3*hg,bump:2.2,tone:.55,detail:1,strata:7,edge:.12,ore:.05,glow:hg>0?.5+.9*hg+.4*wh:.5+.9*hot,seed:s.i*1.7};
    // the floor it broke through: a dark split under it and the light coming up out of the split
    F.quad(m.crD,s.x,s.y,S*.8,S*.8,s.br,{a:.8*k});
    for(const p of s.pc) F.solid(p.k,p.v,s.x+p.dx*S,s.y+p.dy*S,z+p.dz*S,{...o,M:F.xfw({sx:S*p.sx,sy:S*p.sy,sz:S*p.sz,rz:p.rz,rx:s.sa*p.ln,ry:s.ca*p.ln}),...(p.dz===-.25?{shadow:[s.ca*.8,s.sa*.8,.3*k]}:{})});
    F.solid('boulder',s.i+1,s.x+s.f1[0]*S,s.y+s.f1[1]*S,S*s.f1[2]*.3*f,{...o,M:F.xf({sx:S*s.f1[2],sy:S*s.f1[2]*.9,sz:S*s.f1[2]*.8*f,rz:s.br}),clip:0}); };
  const track=(tr,Tn)=>{ const q=Tn-tr.t0; if(q<0) return; const i=eo3(sat(q/.18)), c=Math.cos(tr.a), s=Math.sin(tr.a)*FSY, L=tr.L*i, er=sat((Tn-tEnd+.3)/1.2);
    // gs: how far along it the gold has spread from his end; ex: how much of it has gone out, from the far end in toward him
    // ex: how much of it has cooled from gold to red, from the far end in toward him; dk: how far that red has gone on to black
    const gs=Tn>=tC?1:sat((Tn-tE-.1-tr.gd)/(tC-tE-.16)), t1=tK-.06+tr.cd*.4, ex=sm5(sat((Tn-t1)/.42)), dk=sm5(sat((Tn-t1-.2)/.55));
    const seg=(u0,u1,H,g,hk,glow)=>{ const hl=L*(u1-u0)/2, cx=x0+c*(tr.r0+L*(u0+u1)/2), cy=y0+s*(tr.r0+L*(u0+u1)/2); if(hl<8) return;
      if(glow&&!F.low) F.quad(m.glowG,cx,cy,hl*1.04,tr.w*2.5,tr.a,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cM,a:.42*(1-hk),gain:H.g});
      F.quad(m.gaE,cx,cy,hl,tr.w,tr.a,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(1-hk)*3),gain:g*H.g,ero:.1+.45*hk*hk,uvT:[u1-u0,1,u0,0],fd:[u0>0?Math.min(.3,.03/(u1-u0)):0,0,0,0]}); };
    F.quad(m.gaD,x0+c*(tr.r0+L/2),y0+s*(tr.r0+L/2),L/2,tr.w*.62,tr.a,{a:.5*sat(q/.06),ero:mix(.26,1,er)});
    if(dk>=1) return;
    if(ex>0){ const hk=mix(.5,.97,dk); seg(1-ex,1,K.heat(PG,hk),2.2,hk,false); }
    if(ex>=1) return;
    if(gs<1){ const hk=mix(.02,.34,sat(q/.7)); seg(gs,1,K.heat(P,hk),2.7,hk,tr.big&&q<.9); }
    if(gs>0){ const hk=Tn<tC?.12:mix(.02,.4,sat((Tn-tC)/.9)), ge=Math.min(gs,1-ex); if(ge>.02) seg(0,ge,K.heat(PG,hk+.3*ex),Tn<tC?2.4:2.9,hk,false); } };
  // the golden beams of the blow: two great ones, two lesser, two thin, at uneven angles. Each is widest in the frame it is born, narrows at
  // once, and ends by leaving his hands: the lesser ones first, their far ends still on the picture.
  // they come in opposed pairs (each pair turns together, so what is left is always balanced on him) and all of them are gone within
  // a quarter of a second, the great pair first narrowing to a thread
  const GB=[]; [[0,240,1,.1],[1.02,124,.3,.16],[2.18,80,.19,.2]].forEach(([da,w,lk,dur])=>{ const j=rand(-.07,.07), dr=rand(.1,.18), ln=lk>=1?Lg:Lg*lk*rand(.9,1.1);
    [0,PI].forEach((h,i)=>GB.push({d:aF+sgn*(da+h+j),w:w*(i?.94:1),len:ln,dur,off:w>200?230:w>100?290:320,sd:rand(0,9),tip:lk<1,dr})); });
  const gbeam=(g,Tn)=>{ const q=Tn-tC; if(q<0||q>g.dur+.14) return; const f=sat((q-g.dur)/.14), w=g.w*(.45+.85*Math.exp(-q/.06))*(1-.85*f), d=g.d+g.dr*eo3(sat(q/(g.dur+.14))), len=g.len*eo3(sat(q/.07));
    kiBeam(x0+Math.cos(d)*g.off,y0+Math.sin(d)*g.off*FSY,hz,d,len,w,1-f*f*f,PG,Tn,g.sd,{s0:len*f*f,ul:g.w*16,tip:g.tip&&q<.16,gain:g.w>150?1:.9,lod:g.w>150?0:2}); };
  GFX.add(tEnd+1.05,(k,tt)=>{ const live=lock&&V.ultTick; if(live) tOff=T-tt; const Tn=live?T:tt+tOff, g=gch(Tn);
    // the light on the floor under him widens with the charge; gold spreads out through it from his feet before the blow
    if(F.on&&Tn<tF+.2){ const R=200+1150*Math.pow(g,1.4); F.quad(m.glowG,x0,y0,R,R,0,{cA:P.d,cB:P.b,cM:P.b,cC:P.m,a:(.14+.36*g)*(1-sat((Tn-tF)/.2)),gain:1.1}); }
    if(F.on&&Tn>tE&&Tn<tC+.5){ const gc=sat((Tn-tE)/(tC-tE)), R=hw*(.15+1.25*gc*gc); F.quad(m.glowG,x0,y0,R,R,0,{cA:PG.d,cB:PG.b,cM:PG.b,cC:PG.m,a:(.2+.36*gc)*(1-sat((Tn-tC)/.2)),gain:1.05}); }
    // the cracks under him heat up from a dull ember; the gold comes out through them from the middle
    if(F.on&&Tn<tC){ const r=crR(Tn), hk=mix(.9,.22,g)-.1*sat((Tn-tF)/1.4), H=K.heat(P,hk), gc=sat((Tn-tE)/(tC-tE-.05)); F.quad(m.crD,x0,y0,r*1.04,r*1.04,rot,{a:.75*sat(Tn/.2)});
      F.quad(m.crE,x0,y0,r,r,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(1-hk)*3),gain:2.3*H.g,ero:.1+.45*hk,rv:[2,.1,gc*1.2,.16]});
      if(gc>0){ const HG=K.heat(PG,.1); F.quad(m.crE,x0,y0,r,r,rot,{cA:HG.cA,cB:HG.cB,cM:HG.cM,cC:HG.cC,a:1,gain:2.6*HG.g,ero:.12,rv:[Math.max(.02,gc*1.2),.16,0,.1]}); } }
    for(const tr of TR) track(tr,Tn);
    // the orb between his hands and the streams turning up round him
    if(Tn<tF&&!ob.dead){ const r=orbR(Tn), [ox,oy]=orbXY(r); ob.r=r; ob.x=ox; ob.y=oy; GA.x=ox; GA.y=oy;
      if(F.on) F.bill(m.glowO,ox,oy,hz,r*.5,r*.5,0,{cA:P.b,cB:P.h,cC:'#ffffff',a:sat(Tn/.2),gain:3+sat((Tn-tH)/.1)}); spot.a=.4+.7*g; spot.r=300+900*g; AU.len=80+300*g; AU.r=46+34*g;
      const lk=sm5(sat((Tn-tH)/(tF-tH))); for(const p of PZ){ const u=p.h, v=p.hc, ph=pzH(p,Tn), c=Tn-p.tb; u.x=v.x=mix(p.px,p.mx,lk); u.y=v.y=mix(p.py,p.my,lk); u.z=v.z=hz*lk; u.pitch=v.pitch=PI/2*(1-lk)+.04*lk; u.len=Math.max(20,mix(ph,760,lk)); v.len=u.len*.97; u.r=(30+34*g)*p.gw*(1-.3*lk); v.r=u.r*.42;
        // the crack it comes out of: glowing before it is born, white-hot under it while it stands
        if(F.on&&c>-.15){ const hk=c<0?mix(.95,.3,(c+.15)/.15):mix(.25,.5,lk), H=K.heat(P,hk), cr=(70+40*p.gw)*(c<0?.6+.4*(c+.15)/.15:1); F.quad(m.crD,p.px,p.py,cr*1.1,cr*1.1,p.cr,{a:.8*(1-lk)}); F.quad(m.crE,p.px,p.py,cr,cr,p.cr,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,(1-hk)*3)*(1-lk),gain:2.4*H.g,ero:.1+.4*hk}); }
        // the hazy sheath round it: a soft glow card the height of the pillar
        if(F.on&&!F.low&&c>0&&lk<.95){ const hh=u.len*.5; F.bill(m.glowO,p.px,p.py,hh,u.r*2.6,hh*1.08,0,{cA:P.d,cB:P.b,cM:P.b,cC:P.m,a:.32*(1-lk)*sat(c/.15),gain:1.1}); } } }
    const sol=solid();
    if(sol){ for(const c of RK){ let x=c.x, y=c.y, z, f=0; const e=sat((Tn-c.d)/(tF-c.d)); if(e<=0) continue;
        if(Tn<tF) z=c.z1*Math.pow(e,2.2)+14*e*Math.sin(Tn*5+c.ph); else { const q=Tn-tF; x+=Math.cos(c.a)*c.sp*q; y+=Math.sin(c.a)*c.sp*q*FSY; z=c.z1+c.vz*q-1500*q*q; if(z<0){ f=sat((q-(c.vz+Math.sqrt(c.vz*c.vz+6000*c.z1))/3000)/.5); if(f>=1) continue; const ql=q-f*.5; x=c.x+Math.cos(c.a)*c.sp*ql; y=c.y+Math.sin(c.a)*c.sp*ql*FSY; z=0; } }
        F.solid('boulder',c.v,x,y,z+c.s*.3,{M:F.xf({s:c.s,rx:c.ax*Tn*.3,ry:c.ay*Tn*.3}),alb:'#34323a',emis:P.b,rimC:P.h,spec:.35,rim:.2+.3*g,vein:0,heat:.1+.2*g,ero:f*.85,bump:1.3,tone:.38,clip:0,detail:1,strata:4,edge:.07,ore:0,glow:.15+.5*g,seed:c.sd,...(c.v<2?{shadow:[.55,.28,.3*(1-f)*sat(e*3)]}:{})}); }
      for(const s of PLb) crag(s,Tn); }
    // the pair of beams
    if(Tn>=tF&&Tn<tR){ const d=bDir(Tn), w=bW(Tn), r=bRet(Tn), wk=sat((r-.4)/.45), Q=pmix(pmix(P,K.PAL.silver,wk),PG,.75*sat((r-.5)/.5)), of=mix(210,70,r*r), len=Math.max(40,Lb*eo3(sat((Tn-tF)/.12))*(1-r*r)), gn=.8+.6*bK(Tn)+1.1*wk, hlx=r>0?0:1500;
      kiBeam(x0+Math.cos(d)*of,y0+Math.sin(d)*of*FSY,hz,d,len,w,1,Q,Tn,sdA,{ul:2600,gain:gn,lod:r>0?1:0,helix:hlx}); kiBeam(x0-Math.cos(d)*of,y0-Math.sin(d)*of*FSY,hz,d+PI,len,w,1,Q,Tn,sdB,{ul:2600,gain:gn,lod:r>0?1:0,helix:hlx}); }
    // the last quarter second before the blow: a gold ring runs in over the floor from the edges to his feet while the light between his
    // hands is squeezed to one white point, brighter as it shrinks
    if(F.on&&Tn>tC-.26&&Tn<tC+.02){ const k=sat((Tn-tC+.26)/.26), r=mix(hw*1.3,70,k*k), gx=x0+ca0*70, gy=y0+sa0*40, C=col(PG);
      F.ring(m.shL,x0,y0,r*.93,r,{...C,a:.35+.65*k,gain:2.2+2*k,t0:sdA}); F.bill(m.glowO,gx,gy,hz,mix(240,34,k),mix(240,34,k),0,{cA:PG.b,cB:PG.h,cC:'#ffffff',a:1,gain:3+4*k}); }
    for(const gb of GB) gbeam(gb,Tn);
    if(sol){ for(const s of PLf) crag(s,Tn); for(const c of RB) rubble(c,Tn-c.t0); }
    // the gold gathering in his hands
 });
  // ---- release
  after(tF,()=>{ ob.dead=true; GA.end(); K.flare(x0,y0,hz,{pal:P,s:260,dur:.16,gain:3}); spot.hold=0; spot.life=.2; fired=true; beamSnd=SFX.beam(1); hitstop=Math.max(hitstop,.08); Cn.shake(1); Cn.peak(x0,y0-hz,{ca:.02,blur:.08,tint:'#40c0ff',a:.2}); Cn.SND.hit(.7);
    Cn.move({x:x0,y:y0-BODY*.6,zoom:.62,tilt:.16,roll:-.05*sgn},.22,'out'); GFX.ambient(.44,.52,.72,30); after(.16,()=>GFX.ambient(.3,.36,.52,5));
    lit=GFX.light(x0,y0,hw*.9,P.l,.9,.3,{hold:tE-tF,z:200});
    K.debris(x0,y0,{n:12,r:120,sp:[200,700],up:900,size0:8,size:26}); [aF,aF+PI].forEach(d=>K.sparks(x0+Math.cos(d)*210,y0+Math.sin(d)*210*FSY,hz,{pal:P,n:14,dir:d,spread:.5,sp:[700,2200],up:300,life:[.15,.4],s:3}));
    const tick=()=>{ if(T>=tE||RPG.mode!=='surv'||!lock) return; const d=bDir(T), turning=T>tS&&T<tS+TS, w=bW(T); let n=0; Cn.shake(.22);
      [d,d+PI].forEach(bd=>{ const c=Math.cos(bd), s=Math.sin(bd)*FSY, kd=bd+(turning?sgn*1.15:0), ux=Math.cos(kd), uy=Math.sin(kd)*FSY;
        inLine(x0+c*210,y0+s*210,x0+c*Lb,y0+s*Lb,w*1.4,e=>{ if((e.bmT||0)>RT) return; e.bmT=RT+.9; dmg(e,e.d.boss?Dm*.8:Math.min(Dm*.4,e.hp*.55),{crit:true,kb:.2,sx:x0,sy:y0}); if(e.dead) return; K.knock(e,{dir:kd,dist:380,up:1400,fx:0});
          if(n++<3) K.ehit(e,{pal:P,pw:1.15,dir:kd,ring:0,light:false}); else hitFx(e,C1,1.3); thrown(e,P,ux,uy,.8); });
        // the floor torn up along it
        { const r=rand(300,hw*1.1), x=x0+c*r, y=y0+s*r; K.debris(x,y,{n:3,r:50,sp:[150,520],up:1300,size0:8,size:26}); K.sparks(x,y,40,{pal:P,n:4,dir:kd,spread:.5,sp:[500,1500],up:600,life:[.15,.4]}); K.dust(x,y,{n:2,r:60,sp:[30,140],a:.38,s:1.1,life:1.4,c:'#18202c',c3:'#a6c2dc'}); } });
      after(.1,tick); }; tick(); });
  after(tS,()=>Cn.move({roll:.05*sgn,zoom:.56},TS,'lin'));
  // ---- the beams are squeezed out; gold is drawn into his hands from the whole field and spreads out through the cracks and the tracks
  after(tR,()=>{ if(beamSnd!==NOP){ beamSnd.stop(); beamSnd=NOP; } });
  after(tE,()=>{ if(lit){ lit.hold=0; lit.life=tR-tE; } Cn.move({zoom:.76,roll:0,tilt:.2},tC-tE,'in'); Cn.SND.inhale(.38,.5); Cn.hush(.34,{a:.8});
    gob=K.vorb(x0+ca0*70,y0+sa0*40,hz,{r:16,dur:tC-tE+.03,pal:PG,in:.06,out:.03,spin:5,core:.3,gain:1.15}); GG=K.gather(x0+ca0*70,y0+sa0*40,hz,{dur:tC-tE,pal:PG,r:220,R:1500,n:.15,shells:2,core:0,floor:0,haze:1,debris:0,sparks:1,gain:1.1}); glit=GFX.light(x0,y0,hw*.5,PG.l,.1,.2,{hold:tC-tE-.05,z:160}); });
  // one white frame as the colour turns
  after(tC-.05,()=>K.flare(x0+ca0*70,y0+sa0*40,hz,{pal:'silver',s:300,sx:1.5,sy:.3,dur:.14,gain:4}));
  // the held breath: everything is in one point between his hands and the world stops for a few frames before it goes
  after(tC-.07,()=>{ hitstop=Math.max(hitstop,.07); });
  // ---- climax: everything in the one frame
  after(tC,()=>{ if(gob) gob.dead=true; if(GG) GG.end();
    Cn.peak(x0,y0-hz,{ca:.03,blur:.13,tint:'#ffd24a',a:.1}); hitstop=Math.max(hitstop,.12); Cn.shake(1.7); GFX.light(x0,y0,hw*1.3,PG.l,1.1,.32,{z:260}); Cn.SND.hit(1); SFX.boom(1.6,1);
    Cn.move({zoom:.5},.2,'out'); GFX.ambient(.52,.46,.38,40); after(.3,()=>GFX.ambient(.4,.36,.36,4));
    // a thin hard ring that leaves fast and slows, a second behind it, and the dark dust it rolls up off the floor round him
    K.shock(x0,y0,{r:hw*2.2,dur:.5,pal:PG,gain:1.3,th:.34,light:0,painted:0,dust:0});
    // the core of the blast: white at the heart, orange skin, lumpy; it swells in a tenth of a second, tears and is gone by half a second
    // (no standing dome of smoke): the smoke it leaves is a few separate lumps, lit on top and dark below, rolling outward off the ring
    K.vblast(x0,y0,{s:470,pal:PG,smoke:.35,fire:.32,heat:1.4,dur:.55,lit:.8,band:1,lump:.62,rise:460});
    for(let i=0;i<4;i++){ const a=aF+i/4*TAU+rand(-.4,.4), r=rand(300,420), sz=rand(170,380); K.vsmoke(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{s:sz,dur:rand(.7,1.15),a:.42,rise:240+sz*.4,vx:Math.cos(a)*rand(500,800),delay:.1+.03*i,c:'#170f0a',c2:'#7a5c34',lit:.9,flow:.5}); }
    K.dust(x0,y0,{n:10,r:330,sp:[900,2100],a:.36,s:1.3,life:.7,c:'#221a14',c3:'#8a7458'}); K.dust(x0,y0,{n:6,r:900,sp:[600,1400],a:.26,s:1.6,life:.8,c:'#221a14',c3:'#8a7458'});
    K.flare(x0,y0,hz,{pal:'silver',s:300,sx:4.6,sy:.3,dur:.2,gain:4}); K.flare(x0,y0,hz,{pal:PG,s:420,dur:.3,gain:3});
    K.cool(x0,y0,{kind:'scorch',r:440,pal:PG,life:tEnd-tC+1,grow:.1,light:0}); K.cool(x0,y0,{kind:'crack',r:800,rot,pal:PG,life:tEnd-tC+.2,grow:.1,gain:1.5,light:0});
    K.sparks(x0,y0,hz,{pal:PG,n:26,sp:[500,2200],up:1400,life:[.3,.8]}); K.debris(x0,y0,{n:14,r:160,sp:[300,1300],up:1800,size0:12,size:36});
    // every body on the field is struck where it stands and thrown outward as the ring reaches it; the blow that kills comes after they are seen to fly
    const Le=X.onScreen(300).sort(byD(x0,y0)); Lfly=Le.slice(0,16); nTr=T;
    Le.forEach((e,i)=>{ const d0=Math.hypot(e.x-x0,(e.y-y0)/FSY); after(Math.min(.2,d0/9000),()=>{ if(e.dead) return; const dx=e.x-x0, dy=e.y-y0, l=Math.hypot(dx,dy)||1;
        dmg(e,e.d.boss?Dm*.4:Math.min(Dm*.2,e.hp*.55),{crit:true,kb:.2,sx:x0,sy:y0}); if(e.dead) return; K.knock(e,{from:[x0,y0],dist:620,up:2100,stun:1.2,fx:0});
        if(i<5) K.ehit(e,{pal:PG,pw:1.3,ring:0,light:false}); else if(i<24) hitFx(e,C2,1.6); thrown(e,PG,dx/l,dy/l,i<14?1.3:0); }); });
    // the crags go down as the ring reaches them: each breaks into rocks of its own sizes that are thrown outward, bounce and roll to rest
    let ns=0;
    for(const s of PL){ if(!s.up) continue; const dl=rand(0,.06); s.tb=tC+dl; const S=s.s;
      // the spike of every other crag is thrown high and comes down late (1.2-1.5 s on), so rock is still landing while the field cools
      [['boulder',.42,.38,.5],['boulder',.26,.24,.22],['spike',.3,.3,.42],['boulder',.15,.15,.13]].forEach(([kind,kx,ky,kz],j)=>{ if(j===3&&s.i%3) return; const hi=j===2&&s.i%2===0, a=s.a+rand(-.7,.7), sp=hi?rand(220,380):rand(260,900)*(j?1:.6), vz=hi?rand(1600,1900):rand(600,1300)*(j?1:.8), tl=2*vz/GRAV*1.53, st=Math.min(2.1,tl+rand(.5,.9));
        const c={kind,v:s.i+j,t0:tC+dl,x:s.x+rand(-.2,.2)*S,y:s.y+rand(-.1,.1)*S,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz,s:S*rand(.65,1.4),kx,ky,kz,rz:rand(0,TAU),ax:rand(-5,5),ay:rand(-5,5),az:rand(-3,3),ct:rand(.9,1.5)+(hi?.6:0),st}; RB.push(c);
        // a puff of dust and grit at each of its three landings, smaller each time
        let tb=0, bz=vz; for(let b=0;b<3;b++){ tb+=2*bz/GRAV; bz*=.38; const tq=tb, n=3-b; after(dl+tq,()=>{ if(!GFX.on) return; const [x,y]=rubAt(c,tq+.001); K.dust(x,y,{n,sp:[60,240],a:.45,s:.7+.25*n*kz,life:.9}); if(b<2) K.debris(x,y,{n:n+1,r:S*kx*.3,sp:[80,300],up:420,size0:5,size:14,c:'#6a6474'}); }); } });
      after(dl,()=>{ const d=Math.atan2(s.sa*FSY,s.ca); K.debris(s.x,s.y,{n:6,r:70,sp:[300,1100],up:1600,size0:8,size:30,c:'#6a6474'}); K.sparks(s.x,s.y,S*.4,{pal:PG,n:6,dir:d,spread:.8,sp:[500,1700],up:900}); GFX.light(s.x,s.y,380,PG.l,.7,.3,{z:100});
        K.dust(s.x,s.y,{n:4,r:S*.25,dir:d,spread:1.1,sp:[200,700],a:.5,s:1.3,life:1.2});
        if(s.i%4===1&&ns<2){ const z=[430,250][ns++]; K.vsmoke(s.x+s.ca*520,s.y+s.sa*520*FSY,{s:z,dur:1.1+z/600,a:.36,rise:120+z*.5,vx:s.ca*(700-z*.5),delay:.05*ns,c:'#16110e',c2:'#5e4c36',lit:.6}); } }); } });
  after(tK,()=>{ for(const e of V.en) e.gdT=0; Cn.sweep(x0,y0,Dm,{speed:5200,max:.3,push:1.5}); });
  // ---- what is left: the tracks go out one after another from his feet outward, the rocks cool and settle into the floor, the smoke drifts off; the camera comes home
  after(tK+.3,()=>{ Cn.back(1.3); GFX.ambient(.8,.82,.88,1.5); });
  after(tK+.1,()=>{ K.embers(x0,y0,hw*.9,{pal:PG,n:40,life:1.4}); });
  after(tEnd,ultStop); }

// GEUMGANG METEOR FIST (fs_ult2): he crouches and goes up a thin golden thread out of the picture, air and dust drawn up after him.
// From the sky he marks the place with a bolt of gold; where it lands the floor takes fire and the wait is one climb: the sky goes
// red, the patch heats and cracks, a shadow spreads on it while a closed ring of fire falls in on it faster and faster, every enemy
// on screen is dragged toward it, and splinters of the meteor rain over the WHOLE field. The camera looks up: a dark mass of rock
// with a burning face comes down the sky on a slant, hangs, and plunges onto that spot. The floor erupts, a crown of rock stands up
// round him, the cracks run past the edges of the picture and the floor vents behind them in three rings out to the edges - tall
// jets, low bursts, leaning ones, ones that are smoke at once - and everything on screen is thrown outward. Then the second beat:
// he drives the fist in again, the crater throws molten rock over the whole field on arcs, and the shock breaks the crown rock by
// rock into lumps that fall and crumble. What is left cools from white through gold to black.
const ROCK2='#4c4036', ROCK3='#5c4e44', SOOT={c:'#1a120c',c2:'#6e5438'};
// (harmony) what the blow leaves burning in the floor is amber, between the gold of his ki and the fire of the rock
const PA2={d:'#341000',b:'#ff7a0c',m:'#ffd058',h:'#fffae4',l:'#ffa030',s:'#ffe098'};
// a vent where the floor bursts (no column of fire): light leaking out of the split, one throw of soil and gravel up the lean that falls
// back with shadows, burning grit in it, then black smoke rolling up off the split, lit from below at first. No two share a height or a width.
function geyser(x,y,o={}){ const P=o.pal||PG, r=o.r||110, h=o.h||1100, dur=o.dur||.95, m=K.mats(), dl=o.delay||0, ln=o.lean||0, la=o.la||0, ax=Math.cos(la)*Math.sin(ln), ay=Math.sin(la)*Math.sin(ln), hs=Math.min(h*.5,850), v0=Math.sqrt(2*GRAV*hs), sm=o.fs??.4;
  if(GFX.on) after(dl,()=>{ const nq=Math.round(16+r*.1);
    for(let i=0;i<nq;i++){ const a=rand(0,TAU), sp=rand(.06,.34)*v0, v=rand(.5,1)*v0; GFX.pt({x:x+rand(-.4,.4)*r,y:y+rand(-.2,.2)*r,z:rand(0,20),vx:Math.cos(a)*sp+ax*v,vy:(Math.sin(a)*sp+ay*v)*FSY,vz:v*Math.cos(ln),g:GRAV,drag:.2,life:rand(.8,1.4),s:rand(4,12)*(.6+r/260),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3e352e':'#5e5248'),c2:'#090706',shadow:true,bounce:.25,fk:5,L:2}); }
    for(let i=0;i<8;i++){ const v=rand(.5,1.05)*v0; GFX.pt({x:x+rand(-.3,.3)*r,y,z:10,vx:rand(-120,120)+ax*v,vy:ay*v*FSY+rand(-50,50),vz:v*Math.cos(ln),g:GRAV*.8,drag:.3,life:rand(.4,.8),s:rand(2.5,5),m:3,len:rand(.04,.08),c:GFX.rgb(Math.random()<.4?'#ffffff':P.h),c2:'#c8360a',L:3}); }
    for(let i=0;i<6;i++) after(dur*sm*.3+(i+rand(0,.8))*dur*.1,()=>{ const u=i/5; GFX.pt({x:x+rand(-.35,.35)*r+ax*hs*u*.5,y:y+ay*hs*u*.5*FSY,z:rand(10,60)+hs*.25*u,vx:rand(-50,50)+ax*300,vy:ay*300*FSY,vz:rand(280,520),g:-40,drag:.7,life:rand(.7,1.6),s:r*rand(.4,1.15),grow:r*rand(1,2.2),m:5,b:'alpha',c:GFX.rgb(i<2?'#3a2414':'#1a120c'),c2:'#000000',c3:i<2?'#a04a1e':'#5a4634',er:.9,ns:rand(.9,1.6),w:1,a:.58-.05*i,L:0}); }); });
  if(F.on&&o.glow!==0) GFX.add(dur*.55,k=>{ const a=(1-k)*(1-k*.5); F.bill(m.glowO,x,y,r*.4,r*(1.1+.5*k),r*(.7+.3*k),0,{cA:'#5a1200',cB:P.b,cC:P.h,a:a*.9,gain:2.2*(o.gain||1)}); },dl); }
// the mushroom over the crater (K3.impact's cloud, set back behind him so it never stands on him, and gone before the camera goes home):
// a foot of dust lit by the fire that settles, two drifting lumps of stem, a wide cap dark on top
function mush(x,y,s,HH,dur){ if(!vok()) return; const FL=K.pal('flame'), VC=K.vc(FL), sd=rand(0,9), ph=rand(0,TAU);
  GFX.add(dur,(k,t)=>{ const g=eo3(sat(t/1.2)), f=sat((t-dur*.4)/(dur*.6)), top=HH*(.18+.82*g), hot=Math.max(0,1-t/1.3), cr=s*(.5+1.05*g), fd=1-f*f, lk=mixh('#2e2621',FL.l,hot*.75);
    const B=(px,py,pz,r,hk,dn,j,ez,amb)=>VOL.add('blast',px,py,pz,{ex:r,ey:r,ez:r*ez,pa:[.6,.55,2.2,t*.3],pb:[hk,.85,1.2,.35],dens:dn*fd,gain:1.4,seed:sd+j,smoke:1,fire:.72,...VC,cS:'#110e0c',cK:lk,amb,key:1.25,rim:.28,glow:.3*hot,lit:.3});
    B(x,y,s*(.2+.15*g),s*(.45+.6*g),1.05*hot*hot+.05,10*sat(t/.06)*(1-.7*sat(t/1.6)),0,.55,.22);
    const dr=Math.sin(t*1.3+ph)*s*.12; B(x+dr,y-1,top*.36,s*(.4+.3*g),.45*hot,8.5*sat((t-.05)/.25),1,1,.16);
    B(x-dr*.7+s*.08,y-2,top*.66,s*(.36+.35*g),.25*hot,8*sat((t-.12)/.3),2,1,.16);
    B(x,y-3,top+cr*.1,cr,.35*hot,9.5*sat((t-.18)/.35),3,.6,.14); }); }
// fs_ult2's own copy of K3.impact without the cloud and the dust ring (it brings its own): the white flash lasts two frames and stays
// small, so the blow keeps a shape - a fireball, the dark shock, the curtain, the stones flung out with their silhouettes
function impactM(x,y,o){ const m=K.m10(), Pf=K.pal(o.fire||'flame'), P=o.pal, s=o.s, dur=o.dur, C=col(Pf), CW={cA:Pf.b,cB:Pf.m,cM:Pf.h,cC:'#ffffff'}, sd=rand(0,9);
  GFX.add(.05,k=>{ const a=1-k; F.bill(m.flash,x,y,s*.3,s*(.55+.4*k),s*(.5+.35*k),0,{...CW,a,gain:2}); });
  GFX.add(.3,k=>{ const e=eo5(k), a=(1-k)*(1-k); F.quad(m.flash,x,y,s*(.8+.9*e),s*(.8+.9*e),0,{...C,a:a*.55,gain:1.2,layer:'g'}); });
  GFX.light(x,y,s*4,Pf.l,.8,.6,{z:s*.6,hold:.06});
  K.cool(x,y,{kind:'crater',r:s*1.15,pal:Pf,life:dur,hot:.5,grow:.1});
  K.cool(x,y,{kind:'lava',r:s*.5,pal:P,life:dur,hot:.8,grow:.08,light:0});
  K.cool(x,y,{kind:'ring',r:s*1.25,pal:Pf,life:dur*.85,hot:.22,start:.2,grow:.18,light:0});
  K.cool(x,y,{kind:'crack2',r:s*2.2,pal:P,life:dur,hot:.42,grow:.3,light:0});
  GFX.add(1.4,(k,t)=>{ const e=eo3(sat(t/.5)), f=sat((t-.4)/1), r0=s*(.5+.5*e), r1=s*(.85+1.75*e), hh=s*(.3+1.15*e)*(1-.4*f*f);
    F.lathe(m.cur,x,y,0,{r0,r1,h0:0,h1:hh,a:.85*(1-f*f),ero:.3+f*.55,t0:sd}); F.lathe(m.curL,x,y,0,{r0,r1,h0:0,h1:hh*.7,...C,a:.45*(1-e)*(1-f),ero:.3+f*.6,gain:1.1,t0:sd}); });
  // ejecta: lumps big enough to read, dark against the fire, and hot grit with them
  for(let i=0;i<46;i++){ const a=rand(0,TAU), el=rand(.6,1.1), v=rand(800,1800), hot=i%5===0, big=i%4===0;
    GFX.pt({x:x+Math.cos(a)*s*.3,y:y+Math.sin(a)*s*.3*FSY,z:10,vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v*1.25,g:2600,drag:.15,life:rand(1.2,1.9),s:big?rand(26,46):rand(5,13),rot:rand(0,TAU),vr:rand(-10,10),m:11,b:'alpha',c:GFX.rgb(hot?'#5a2a14':'#3e352e'),c2:'#070504',shadow:true,bounce:.3,fk:5,L:2,pri:1});
    if(hot) GFX.pt({x,y,z:20,vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v*1.25,g:2600,drag:.15,life:rand(.5,1),s:rand(3,6),m:3,len:.03,c:GFX.rgb(Pf.s),c3:'#ffffff',c2:Pf.b,L:3,pri:1}); }
  if(K.chunks) K.chunks(x,y,{n:o.stones,kind:'stone',r:s*.4,sp:[400,1000],up:1500,s:[s*.12,s*.26],pal:P,rock:o.rock,life:1.9});
  K.sparks(x,y,40,{pal:Pf,n:10,sp:[700,1900],up:1500,life:[.25,.6],s:4}); }
// a fissure that runs out over the floor (fs_ult2): a jagged line that wanders and narrows as it goes, some with a branch splitting off.
// Two ribbons of the gash residue along it (the burnt lips, the glowing bed); it cools from its far end back toward the crater.
function fissPath(x,y,a,R0,R1,w,d0=0){ const c=Math.cos(a), s=Math.sin(a), n=14, P=[]; let off=0, dv=0;
  for(let i=0;i<=n;i++){ const u=i/n, d=mix(R0,R1,u); if(i){ dv=dv*.45+rand(-1,1)*(R1-R0)/n*.38; off+=dv; } P.push({x:x+c*d-s*off,y:y+(s*d+c*off)*FSY,w:w*(1-.75*u)*(i?rand(.7,1.3):1),d:d0+d-R0}); } return P; }
let MF=null; const mf=()=>MF||(MF={s:F.mat({tex:'v3_gash',nz:'cells',n1:[3,3,0,0],nk:.55,pw:.7,ero:.1,soft:.35,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  b:F.mat({tex:'v3_gash',nz:'veins',n1:[2.4,2.4,.012,.009],n2:[2,2,.01,.01],dist:.02,mdist:1,nk:.6,pw:1.3,ero:.1,soft:.3,rk:[.42,1.05],gain:2.6,bgain:1.2,layer:'g'})});
function fissPts(P,front,ws){ const o=[]; for(let i=0;i<P.length;i++){ const p=P[i]; if(p.d<=front){ o.push({x:p.x,y:p.y,w:p.w*ws}); continue; } if(i){ const q=P[i-1], k=(front-q.d)/(p.d-q.d); o.push({x:mix(q.x,p.x,k),y:mix(q.y,p.y,k),w:mix(q.w,p.w,k)*ws}); } break; } return o; }
function fissure(l,o){ if(!F.on) return; const M=mf(), P=K.pal(o.pal), life=o.life, hot=o.hot, g=o.gain||1;
  GFX.add(life,(k,t)=>{ const front=l.Pt[0].d+o.spd*t, hk=sat(k/hot), H=K.heat(P,hk), u=sat((k-.45)/.55), eat=.1+.7*Math.pow(u,1.4), end=.02+.46*u*u, ce=Math.min(.97,.04+.93*sat((t-.35)/(life*.6)));
    for(const Q of l.Bp?[l.Pt,l.Bp.P]:[l.Pt]){ if(Q[0].d>=front) continue;
      const ps=fissPts(Q,front,1.45); if(ps.length<2) continue; F.ribbon(M.s,ps,{cA:'#120a06',cB:'#2e1c10',cC:'#563a24',a:.42*sat(t/.06),ero:eat,fd:[.02,end,0,0]});
      if(hk<1){ const a=Math.min(1,(1-hk)*3.2); F.ribbon(M.b,fissPts(Q,front,.7),{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a,gain:2.9*g*H.g,bgain:1.2*H.g,ero:.08+.5*hk*hk+eat*.5,fd:[.02,Math.max(ce,end+.1),0,0]}); } } }); }
const hsh=v=>{ const s=Math.sin(v)*43758.5453; return s-Math.floor(s); };
let S2=null; const st2=()=>S2||(S2={ln:GFX.st(3,'add',{c2:GFX.rgb(PG.b),c3:GFX.rgb(PG.h),L:3}),cm:GFX.rgb(PG.m),cs:GFX.rgb(PG.s),cw:[1,1,1]});
// a splinter of the meteor: a short streak down the same slant, a flash where it lands, a print that cools and crumbles
function splinter(x,y,sd,Dm){ const q=st2(), m=K.mats(), T=.2, rot=rand(0,TAU), r=rand(130,190), wd=rand(.35,1.2), sl=rand(.85,1.2), ln=rand(.7,1.4);
  // the streak tapers: a hot head, the tail thinning and reddening behind it
  if(GFX.on) GFX.add(T,k=>{ const z=1700*(1-k), hx=x+sd*1250*sl*(1-k), dx=sd*250*sl*ln, dz=340*ln; for(let j=0;j<3;j++){ const u0=(j+1)/3, u1=j/3; GFX.line(q.ln,hx+dx*u0,y,z+dz*u0,hx+dx*u1,y,z+dz*u1,(3+4*(3-j))*wd,j?q.cm:q.cs,.5+.2*(3-j),0,x,1,0); } GFX.line(q.ln,hx+dx*.25,y,z+dz*.25,hx,y,z,4*wd,q.cw,1,0,x,1,0); });
  after(T,()=>{ K.flare(x,y,40,{pal:PG,s:140,dur:.12,gain:2.4}); K.sparks(x,y,20,{pal:PG,n:9,sp:[200,800],up:1100,life:[.2,.5]}); K.debris(x,y,{n:4,r:40,sp:[120,420],up:900,size0:7,size:18}); K.dust(x,y,{n:4,r:30,sp:[100,300],a:.4,c:'#241c14'}); GFX.light(x,y,620,PG.l,.9,.3,{z:80});
    if(F.on) GFX.add(1.2,k=>{ const H=K.heat(PG,.08+.92*k); F.quad(m.crE,x,y,r,r,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat((1-k)*2.5),gain:2.4*H.g,ero:.1+.3*k}); });
    inCircle(x,y,300,e=>{ dmg(e,e.d.boss?Dm*.006:Math.min(Dm*.006,e.hp*.3),{sx:x,sy:y}); K.knock(e,{from:[x,y],dist:130,up:800,fx:0}); hitFx(e,C2,1.1); }); }); }
// a print burnt into the floor that cools and crumbles
function burnt(x,y,r,life=1.3){ if(!F.on) return; const m=K.mats(), rot=rand(0,TAU); GFX.add(life,k=>{ const H=K.heat(PG,.08+.92*k); F.quad(m.crE,x,y,r,r,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat((1-k)*2.5),gain:2.4*H.g,ero:.1+.3*k}); }); }
// a lump of molten rock thrown out of the crater: it goes over on an arc with a tail, and where it comes down the floor burns
function bomb(x0,y0,x1,y1,T,hp,solid){ const q=st2(), m=K.mats(), P=PG, s=rand(40,64), v=(Math.random()*4)|0, ax=rand(-9,9), ay=rand(-9,9), at=(k)=>[mix(x0,x1,k),mix(y0,y1,k),80+hp*4*k*(1-k)];
  if(F.on) GFX.add(T,(k,t)=>{ const [x,y,z]=at(k), [xa,ya,za]=at(Math.max(0,k-.09)), [xb,yb,zb]=at(Math.max(0,k-.04));
    GFX.line(q.ln,xa,ya,za,x,y,z,s*.34,q.cm,.45,0,x1,1,0); GFX.line(q.ln,xb,yb,zb,x,y,z,s*.12,q.cs,.8,0,x1,1,0);
    if(solid) F.solid('meteor',v,x,y,z-s*.3,{M:F.xf({s,rx:ax*t,ry:ay*t}),alb:'#241a14',emis:'#ff7a10',rimC:P.m,spec:.35,rim:.3,glow:1.2,bump:2.2,dust:0,edge:.05,clip:0,seed:ax});
    GFX.pt({x,y,z,life:.03,s:s*.9,m:8,c:GFX.rgb(P.s),a:.75,L:3}); });
  after(T,()=>{ const r=s*rand(3.4,4.6); K.flare(x1,y1,50,{pal:P,s:s*4,dur:.14,gain:2.6}); K.sparks(x1,y1,20,{pal:P,n:9,sp:[200,900],up:1300,life:[.25,.6]}); K.debris(x1,y1,{n:5,r:50,sp:[150,520],up:1000,size0:8,size:22}); K.dust(x1,y1,{n:5,r:40,sp:[120,420],a:.45,c:'#241c14'});
    GFX.light(x1,y1,760,P.l,.75,.4,{z:90}); burnt(x1,y1,r,1.1); geyser(x1,y1,{r:s*rand(1.2,1.7),h:s*rand(6,10),dur:rand(.42,.6),rise:.08,heat:1,fs:.3,lean:rand(0,.2),la:rand(0,TAU),glow:0});
    inCircle(x1,y1,300,e=>{ K.knock(e,{from:[x1,y1],dist:200,up:1100,fx:0}); hitFx(e,C2,1.1); }); }); }
// a standing rock breaks where it stands: its length comes apart into lumps that drop, roll outward and crumble on the floor
// the lowest lump of each big rock stays where it falls, cooling from red to dark and smoking thinly, until left runs out
function shatter(p,solid,left=0){ const ca=Math.cos(p.a), sa=Math.sin(p.a), g=3000, L=[], life=.95, life2=Math.max(life,left);
  for(const c of p.pc){ const n=c.dx===0&&!p.inner?4:p.inner?2:1, sl=Math.sin(c.ln)*c.s, cl=Math.cos(c.ln)*c.s; for(let j=0;j<n;j++){ const hf=(j+.5)/n, a=p.a+rand(-1.1,1.1), sp=rand(80,330)*(.4+hf*1.3), vz=rand(-80,360)*hf, z0=cl*hf*.85, s=c.s*(.36-.2*hf)*rand(.85,1.15);
      L.push({x:p.x+c.dx+ca*sl*hf,y:p.y+(c.dy+sa*sl*hf)*FSY,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*FSY,vz,z0,tl:(vz+Math.sqrt(vz*vz+2*g*z0))/g,s,v:(c.v+j)%4,tip:j===n-1&&n>1,sh:j===0&&n>2,ax:rand(-5,5),ay:rand(-5,5),r0:rand(0,TAU)}); } }
  K.dust(p.x,p.y,{n:p.inner?4:9,r:p.s*.25,sp:[150,560],a:.55,s:1.3,c:'#2a2018',c3:'#6e5a48'}); K.debris(p.x,p.y,{n:p.inner?3:8,r:p.s*.3,sp:[120,520],up:900,size0:8,size:26,c:'#5c4e44'}); K.flare(p.x,p.y,p.s*.4,{pal:PG,s:p.s*.42,dur:.12,gain:2.2}); K.sparks(p.x,p.y,p.s*.4,{pal:PG,n:p.inner?4:10,sp:[200,900],up:900,life:[.25,.55]});
  // nothing fades out: a lump that has landed and cooled sinks into the broken floor (clipped at the floor) with a breath of dust
  if(solid) GFX.add(life2,(k2,t)=>{ for(const c of L){ const st=c.sh&&life2>life, kk=st?Math.min(1,t/life2):t/life; if(kk>=1) continue; const f=st?sat((kk-.78)/.22):sat((kk-.5)/.5), ck=st?sat(t/1.4):sat(t/.7), tt=Math.min(t,c.tl), z=Math.max(0,c.z0+c.vz*tt-.5*g*tt*tt), rl=t>c.tl?Math.min(.25,t-c.tl):0, px=c.x+c.vx*(tt+rl*.6), py=c.y+c.vy*(tt+rl*.6);
      F.solid(c.tip?'shard':'stone',c.v,px,py,z+(c.tip?c.s*.1:c.s*.3)-f*f*c.s*1.05,{M:F.xfw({s:c.s,sz:c.s*(c.tip?1:.8),rx:c.ax*(tt+rl*.5)+(c.tip?1.3*sat(t/.25):0),ry:c.ay*(tt+rl*.5),rz:c.r0}),alb:mixh('#2c2520','#40372f',ck),emis:mixh('#ff9a30','#c8560a',ck),rimC:PG.b,spec:.35,rim:.1,bump:1.2,dust:.12,bright:.62,tintK:.65,dustC:'#4a3a2c',edge:.1,glow:.7*(1-ck)*(1-ck)*Math.min(1,c.s/110),seed:c.r0,shadow:c.sh?[.55,.28,.3*(1-f)]:null});
      if(GFX.on&&f>0&&f<.6&&Math.random()<.12) GFX.pt({x:px+rand(-.5,.5)*c.s,y:py+rand(-.2,.2)*c.s,z:4,vx:rand(-60,60),vy:rand(-20,20),vz:rand(40,110),g:-10,drag:.8,life:rand(.6,1),s:c.s*rand(.25,.4),grow:c.s*rand(.4,.7),m:5,b:'alpha',c:GFX.rgb('#3a2e24'),c2:'#000000',c3:'#7a6652',er:.9,ns:rand(.9,1.6),w:1,a:.35,L:0});
      if(st&&t>c.tl&&GFX.on&&Math.random()<.08) GFX.pt({x:c.x+c.vx*(c.tl+.15)+rand(-.2,.2)*c.s,y:c.y+c.vy*(c.tl+.15),z:c.s*.5,vx:rand(10,50),vy:0,vz:rand(90,180),g:-20,drag:.6,life:rand(.9,1.4),s:rand(14,24),grow:rand(30,60),m:5,b:'alpha',c:GFX.rgb('#2a2018'),c2:'#000000',c3:'#6e5a48',er:.9,ns:rand(.9,1.6),w:1,a:.28*(1-kk),L:0}); } }); }
function ultMeteor(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, tg=b||densest(1600), [cx,cy]=X.inView(tg?tg.x:pl.x,tg?tg.y:pl.gy,.3), x0=pl.x, y0=pl.gy, P=PG, m=K.mats(), q2=st2(), hz=BODY*.6;
  const tL=.55, tG=.72, tS=.96, tM=1.2, tI=2.2, tK=2.8, tA=3.35, tEnd=5.5, rot=rand(0,TAU), up=k=>1-(1-k)*(1-k), SPD=3600, solid=!!(F.on&&F.solids&&F.solids());
  // the meteor's road: a straight slant out of the sky from the side he left on; its tail has one length
  const sd=x0>cx+40?1:-1, xs=cx+sd*1500, zs=2250, ze=260, RS=380, pit=Math.atan2(zs-ze,Math.abs(xs-cx));
  S([['gy09',tL],['gy11',tG-tL,{air:[0,2400],ease:up}],['gy12',9,{air:[2400,2400]}]]);
  // ---- preparation: he sinks into a crouch, the camera closes on him; the cast flash is blue-white whatever the skill's colour
  GFX.ambient(.46,.42,.44,3); Cn.move({x:x0,y:y0-BODY*.6,zoom:1.4,tilt:.05},.5); const dr=Cn.drone(56,.4); SFX.rumble(2); Cn.SND.inhale(tL,.4);
  gather(x0,y0,hz*.6,34,P,tL-.1,260,760); K.dust(x0,y0,{n:8,r:90,sp:[60,220],a:.35,c:'#241c14'});
  // from the first fifth of a second the ki of the field runs into him in layers: spiralling streaks, shells closing on his fist,
  // motes and sparks round it, grit lifting off the floor toward him, the air over him shimmering, his light on the floor growing
  const GP=K.gather(x0,y0,hz*.9,{dur:tL-.08,delay:.08,pal:P,r:300,R:700,n:.06,shells:2,core:1,floor:1,haze:1,debris:1,sparks:1,gain:.9}); after(tL+.02,()=>{ if(GP&&GP.end) GP.end(); });
  // a ring of glyph light opening on the floor under him, brighter and tighter as the leap nears (one quad: the cracks print)
  if(F.on) GFX.add(tL+.08,(k,t)=>{ const u=sat((t-.1)/(tL-.1)), H=K.heat(PK,mix(.25,.95,u)); if(u<=0) return; F.quad(m.crE,x0,y0,mix(380,240,u),mix(380,240,u),rot+t*.6,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:sat(u*3)*(1-sat((t-tL)/.08)),gain:(1.2+1.6*u)*H.g,ero:.45-.3*u}); });
  after(.3,()=>{ K.flare(x0,y0,hz,{pal:'silver',s:120,sx:3.2,sy:.4,dur:.2,gain:4}); K.flare(x0,y0,hz,{pal:PK,s:150,dur:.24,gain:2.4}); Cn.SND.tick(1.5,.35); GFX.light(x0,y0,700,PK.l,.9,.3,{z:hz}); });
  // ---- the leap: a thin golden thread that leaves the floor after him (its foot lifts out of the top of the picture: nothing shrinks
  // in place), and a cracked print where he stood. The camera waits until the thread is gone before it turns to the field
  if(F.prepDeep) F.prepDeep();
  after(tL,()=>{ if(vok()) K.vsmoke(x0,y0,{s:210,dur:1.1,a:.5,rise:1000,c:'#241a12',c2:'#8a7660',lit:.5});
    // the air he tears up after him: dust wound round his road, and a few thin gold threads whose feet leave the floor and go out of the top of the picture
    for(let i=0;i<16;i++){ const a=rand(0,TAU), r=rand(60,180), ca=Math.cos(a), sa=Math.sin(a); GFX.pt({x:x0+ca*r,y:y0+sa*r*FSY,z:rand(20,160),vx:-sa*rand(300,520)-ca*60,vy:(ca*rand(300,520)-sa*60)*FSY,vz:rand(700,1400),g:-60,drag:1.1,life:rand(.8,1.2),s:rand(36,60),grow:rand(70,130),m:5,b:'alpha',c:GFX.rgb('#3a2c20'),c2:'#000000',c3:'#8a7660',er:.9,ns:rand(.9,1.6),w:1,a:.4,L:2}); }
    if(GFX.on){ const TH=[0,1,2,3].map(i=>({a:i/4*TAU+rand(-.5,.5),w:rand(3,9),r:rand(50,120),sp:rand(.7,1.3)*(i%2?1:-1),d:i*.035})); GFX.add(.6,(k,t)=>{ for(const s of TH){ const u=t-s.d; if(u<0) continue; const top=Math.min(3000,u*7500), foot=Math.max(0,(u-.12)*6200); if(foot>=top) continue; let px=0, py=0, pz=0;
      for(let j=0;j<=7;j++){ const z=mix(foot,top,j/7), a=s.a+z*.0022*s.sp, rr=s.r*(1-.7*z/3000), nx=x0+Math.cos(a)*rr, ny=y0+Math.sin(a)*rr*FSY, ww=s.w*(.55+.45*Math.sin(j*1.9+s.a*3));
        if(j){ GFX.line(q2.ln,px,py,pz,nx,ny,z,ww,q2.cm,.85,0,x0,1,0); GFX.line(q2.ln,px,py,pz,nx,ny,z,ww*.35,q2.cw,1,0,x0,1,0); } px=nx; py=ny; pz=z; } } }); }
    // what the leap leaves: a ring of dust rolling out over the floor, air drawn up after him, smoke where he stood
    K.dust(x0,y0,{n:26,r:60,sp:[700,2000],a:.5,s:1.4,life:1,c:'#2a2018',c3:'#6e5a48'}); K.dust(x0,y0,{n:14,r:120,sp:[300,900],a:.45,s:1.8,life:1.3,c:'#1c140c',c3:'#6e5a48'});
    // what goes up with him: a few tapering streaks of every length and brightness, embers that slow and drift, and lumps of the floor torn up after him
    for(let i=0;i<7;i++) after(rand(0,.35),()=>{ const w=Math.random(); GFX.pt({x:x0+rand(-80,80),y:y0+rand(-24,24),z:rand(0,500),vx:rand(-120,120),vz:rand(1800,4200),drag:.8,life:rand(.2,.5),s:1.5+5*w,m:3,len:rand(.02,.07),c:GFX.rgb(w>.75?'#ffffff':w>.35?P.s:'#ff8a2a'),c2:w>.5?P.b:'#8a2a06',a:.45+.55*w,L:3}); });
    for(let i=0;i<22;i++){ const a=rand(0,TAU), v=rand(200,700); GFX.pt({x:x0+Math.cos(a)*rand(20,90),y:y0+Math.sin(a)*rand(20,90)*FSY,z:rand(20,120),vx:Math.cos(a)*v*.4,vy:Math.sin(a)*v*.4*FSY,vz:rand(500,1500),g:-60,drag:1.6,life:rand(.6,1.3),s:rand(2.5,6),m:8,c:GFX.rgb(Math.random()<.3?P.h:'#ff7a1e'),fade:'in',L:3}); }
    for(let i=0;i<12;i++){ const a=rand(0,TAU), v=rand(500,1100); GFX.pt({x:x0+Math.cos(a)*rand(30,110),y:y0+Math.sin(a)*rand(30,110)*FSY,z:rand(5,40),vx:Math.cos(a)*v*.25,vy:Math.sin(a)*v*.25*FSY,vz:v*rand(1,1.8),g:GRAV,drag:.3,life:rand(.7,1.1),s:rand(7,17),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#4a3e34':'#6a5a4c'),c2:'#090706',shadow:true,bounce:.25,L:2}); } K.cool(x0,y0,{kind:'crack',r:190,pal:P,life:1.5,grow:.08,light:0}); K.dust(x0,y0,{n:12,r:40,sp:[300,900],a:.5,c:'#241c14'});
    K.sparks(x0,y0,30,{pal:P,n:16,sp:[80,380],up:2200,life:[.25,.55]}); K.debris(x0,y0,{n:8,r:70,sp:[150,520],up:1100,size0:8,size:22}); GFX.light(x0,y0,800,P.l,.9,.35,{z:200}); Cn.shake(.55); sfx('whoosh',.6,1); });
  after(tL+.04,()=>{ pl.visible=false; });
  after(tL+.05,()=>{ Cn.move({x:cx,y:cy-BODY*.6-200,zoom:.9,tilt:.1},.95,'io'); GFX.ambient(.54,.4,.38,2); });
  // out of the sky he marks the place: a bolt of gold comes down on it and the floor there takes fire
  after(tS-.17,()=>{ if(GFX.on) GFX.add(.17,k=>{ const k0=Math.max(0,k-.3), X1=mix(x0,cx,k), Y1=mix(y0,cy,k), Z1=2800*(1-k), X0=mix(x0,cx,k0), Y0=mix(y0,cy,k0), Z0=2800*(1-k0); GFX.line(q2.ln,X0,Y0,Z0,X1,Y1,Z1,26,q2.cm,.95,0,cx,1,0); GFX.line(q2.ln,(X0+X1)/2,(Y0+Y1)/2,(Z0+Z1)/2,X1,Y1,Z1,11,q2.cw,1,0,cx,1,0); }); sfx('whoosh',.4,1.6); });
  // the marked spot (no column on it): the air over it shimmers, its cracks open and brighten, and gold streaks come down out of the sky
  // onto it along a tightening spiral - each a short burning stroke that runs down and goes out, more and faster as the rock nears
  after(tS,()=>K.cool(cx,cy,{kind:'crack2',r:RS*1.55,rot:rot+1,pal:P,life:tI-tS+.4,hot:.9,grow:tI-tS-.25,gain:1.3,light:0}));
  if(GFX.on){ const HX=[0,1,2,3,4,5].map(i=>({a:i/6*TAU+rand(-.3,.3),w:rand(5,12),ph:i/6+rand(0,.1),sp:rand(.85,1.15)})); GFX.add(tI-tS-.04,(k,t)=>{ const u=sat(t/(tI-tS-.15));
    if(GFX.haze&&u<.8) GFX.haze(cx,cy,120+80*u,RS*(.9+.5*u),(.45+.5*u)*(1-sat((u-.6)/.2)));
    for(const s of HX){ const ph=(t*(1.1+2.2*u)*s.sp+s.ph)%1, R0=mix(900,420,u), A0=s.a+t*(1+2.5*u), hp=h=>[cx+Math.cos(A0+h*4.2)*(R0*Math.pow(1-h,.8)+24),cy+Math.sin(A0+h*4.2)*(R0*Math.pow(1-h,.8)+24)*FSY,2700*(1-h)+20], h1=ph, h0=Math.max(0,ph-.28), al=Math.min(1,.35+.9*u)*sat((1-ph)*6);
      let p=hp(h0); for(let j=1;j<=6;j++){ const q=hp(mix(h0,h1,j/6)), ww=s.w*(.4+.6*j/6)*(.7+.6*u); GFX.line(q2.ln,p[0],p[1],p[2],q[0],q[1],q[2],ww,q2.cm,.85*al,0,cx,1,0); if(j>3) GFX.line(q2.ln,p[0],p[1],p[2],q[0],q[1],q[2],ww*.35,q2.cw,al,0,cx,1,0); p=q; } } },tS); }
  after(tS,()=>{ K.flare(cx,cy,60,{pal:P,s:300,dur:.16,gain:2.6}); K.flare(cx,cy,60,{pal:'silver',s:200,sx:1.5,sy:.35,dur:.14,gain:3}); K.dust(cx,cy,{n:22,r:50,sp:[600,1800],a:.5,s:1.3,life:.9,c:'#2a2018',c3:'#6e5a48'}); K.sparks(cx,cy,30,{pal:P,n:18,sp:[300,1300],up:1500,life:[.25,.6]});
    K.debris(cx,cy,{n:10,r:80,sp:[200,700],up:1300,size0:8,size:24}); GFX.light(cx,cy,1100,P.l,1.1,.35,{z:120}); Cn.shake(.25); Cn.SND.tick(1.1,.4); });
  // the camera looks up for it, then comes down with it
  after(1.45,()=>{ Cn.move({y:cy-BODY*.6-500,zoom:.72,tilt:.14,roll:0},.5,'io'); GFX.ambient(.62,.38,.33,2.5); });
  // one glide down with the meteor that ends on the blow; the blow itself keeps this angle (hitstop and shake only)
  after(1.8,()=>{ Cn.move({y:cy-BODY*.6-110,zoom:.82,tilt:.2},tI-1.8,'io'); GFX.ambient(.7,.37,.3,4); });
  // ---- build-up, all of it one function of time: the shadow spreads, the aiming arcs close, the light and the cracks grow, gravel lifts, the crowd is dragged in
  const HS=GFX.light(cx,cy,400,P.l,0,.4,{hold:tI,z:90}), SKY=GFX.light(cx,cy-200,hw*1.5,'#ff5a28',0,.4,{hold:tI,z:500}), GV=[]; let t=0, pt=0, et=0, ct=0, smk=0, aft=-1, ML=null, rg=0, rgT=0, sk=0;
  // six stones lift off the patch (three sizes; the three big ones cast shadows), the gravel and grit round them is particles
  for(let i=0;i<6;i++){ const a=i/6*TAU+rand(-.4,.4), r=rand(240,760), big=i%2===0; GV.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,s:big?rand(80,110):rand(40,60),sh:big,v:i%4,kd:['flag','shard','stone','cobble','stone','shard'][i],z1:rand(140,480),d:i*.1+rand(0,.08),ax:rand(-4,4),ay:rand(-4,4)}); }
  V.ultTick=dt=>{ t+=dt;
    // after the blow: embers keep leaving the molten floor and thin smoke the crown, until the camera goes home
    if(t>tI+.5&&t<tEnd-.5){ et-=dt; if(et<=0){ et=.04; const a=rand(0,TAU), r=Math.sqrt(Math.random())*760, c=1-sat((t-tI)/(tEnd-tI));
        GFX.pt({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,z:rand(0,60),vx:rand(-50,50),vy:rand(-20,20),vz:rand(160,520),g:-40,drag:.5,life:rand(.9,1.7),s:rand(3.5,8),m:8,c:GFX.rgb(Math.random()<.2+.4*c?P.h:P.s),fade:'in',L:3});
        if(Math.random()<.4){ const p=CR[(Math.random()*CR.length)|0]; if(!p.gone) GFX.pt({x:p.x+rand(-60,60),y:p.y,z:p.s*rand(.4,.9),vx:rand(20,90),vy:0,vz:rand(120,240),g:-30,drag:.6,life:rand(1,1.6),s:rand(40,70),grow:rand(60,110),m:5,b:'alpha',c:GFX.rgb('#2a2018'),c2:'#000000',c3:'#6e5a48',er:.9,ns:rand(.9,1.6),w:1,a:.32,L:0}); } } }
    // as the cracks cool, from their outer ends inward, the floor along them gives off smoke: the smoking front walks toward the crater
    if(t>tI+.7&&t<tEnd-.2&&GFX.on){ ct-=dt; if(ct<=0){ ct=.03; const l=LN[(Math.random()*LN.length)|0], fr=1-sat((t-tI-.7)/2.3), d=430+(l.Lr-430)*sat(fr+rand(-.08,.12)), [lx,ly]=l.at(d), hot=fr>.35;
        GFX.pt({x:lx+rand(-30,30),y:ly+rand(-15,15),z:rand(0,30),vx:rand(-30,30),vy:0,vz:rand(140,280),g:-30,drag:.6,life:rand(1,1.5),s:rand(30,55),grow:rand(80,140),m:5,b:'alpha',c:GFX.rgb(hot?'#4a2a14':Math.random()<.4?'#3a2a1c':'#1e1610'),c2:'#000000',c3:hot?'#b0582a':'#8a6e52',er:.9,ns:rand(.9,1.6),w:1,a:.42,L:0});
        if(Math.random()<.6) GFX.pt({x:lx+rand(-25,25),y:ly,z:6,vx:rand(-30,30),vy:0,vz:rand(160,420),g:-40,drag:.5,life:rand(.5,.9),s:rand(3,6),m:8,c:GFX.rgb(hot?P.h:P.s),fade:'in',L:3}); } }
    // the crater smokes harder as it cools: smoke lifting off the pool, lit orange from below while it is hot, ash-grey once it is not
    if(t>tA+.3&&t<tEnd-.25&&GFX.on){ smk-=dt; if(smk<=0){ const c=sat((t-tA-.3)/(tEnd-tA-.6)); smk=.07-.035*c; const a=rand(0,TAU), r=Math.sqrt(Math.random())*380;
      GFX.pt({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,z:rand(10,60),vx:rand(-40,40),vy:0,vz:rand(150,290),g:-30,drag:.5,life:rand(1.1,1.7),s:rand(50,90),grow:rand(120,220),m:5,b:'alpha',c:GFX.rgb(c<.45?'#3a2414':'#2c2622'),c2:'#000000',c3:c<.45?'#a04a1e':'#4e4640',er:.9,ns:rand(.9,1.6),w:1,a:.28+.12*c,L:0}); } }
    if(t<tS||t>=tI) return; const g=sat((t-tS)/(tI-tS)), s=240+1300*g*g, L=X.onScreen(300); pt-=dt;
    for(const e of L){ if(Math.hypot(e.x-cx,(e.y-cy)/FSY)>RS+60) e.pull={x:cx,y:cy,s}; e.stun=Math.max(e.stun,.25); }
    if(pt<=0){ pt=.12; for(let i=0;i<Math.min(4,L.length);i++){ const e=L[(Math.random()*L.length)|0]; GFX.pt({x:e.x,y:e.y,z:rand(30,BODY),tx:cx,ty:cy,tz:20,pull:rand(3,5),life:rand(.35,.6),s:rand(2.5,4.5),m:3,len:.03,c:GFX.rgb(Math.random()<.1?'#ffffff':P.s),c2:P.b,L:3}); } }
    // the heat of the sky is drawn down onto the spot: thin golden threads that wind down out of the sky onto it, more and faster as it nears
    sk+=dt*(14+55*g*g); while(sk>=1){ sk--; const R=rand(260,900)*(1-.35*g), a=rand(0,TAU), z0=rand(600,1400); GFX.pt({x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R*FSY,z:z0,oc:[cx,cy,30],or:R,oa:a,ow:rand(1.6,2.6)*(1+g),ok:R/rand(.4,.6),oz0:z0,rmin:24,life:.7,s:rand(1.4,2.4)*(1+.5*g),m:3,len:rand(.04,.07),c:GFX.rgb(Math.random()<.15?'#ffffff':P.h),c3:'#ffffff',c2:P.b,fk:9,L:3,pri:1}); }
    Cn.shake(.05+.2*g); };
  const ts=jet(xs,cy,zs,sd>0?0:PI,2700,{r:560,r0:230,pitch:pit,dur:tI-tM+.04,in:.1,out:.04,heat:0,speed:5,turb:.9,c:'#140e08',c2:'#5e4830',ord:-1e8,delay:tM}), tj=jet(xs,cy,zs,sd>0?0:PI,1900,{r:400,r0:190,pitch:pit,dur:tI-tM+.04,in:.1,out:.04,pal:P,speed:8,turb:.8,heat:1.25,delay:tM});
  // the rock itself: one tumbling broken rock (pitted crust, molten seams); its face toward the air is white plasma, a hot cap just ahead of it
  const cp=Math.cos(pit), sp=Math.sin(pit), M10=K.m10(), FL=K.pal('flame'), CWm={cA:FL.b,cB:FL.m,cM:FL.h,cC:'#ffffff'}; let shed=0, pT=0, trl=0, trT=0;
  GFX.add(tI,(k,tt)=>{ const g=sat((tt-tS)/(tI-tS)); if(g<=0) return;
    // the ring is born out of the bolt's foot: it runs out to the edge of the field in a fifth of a second, then falls back in faster and faster
    if(F.on){ const r=280+620*g, H=K.heat(P,mix(.86,.22,g)), rp=sat(g/.2), g24=sat(g/.3), Ra=g<.3?mix(RS*.35,1750,g24*g24*(3-2*g24)):mix(1750,RS*1.2,Math.pow((g-.3)/.7,2));
      // the meteor's shadow: it lies under the rock (straight below it on the road) and swells and darkens as it comes down onto the spot
      // high up the rock throws a wide faint blur; as it comes down onto the spot the shadow draws in under it, smaller and blacker
      if(tt>=tM){ const u=sat((tt-tM)/(tI-tM)), ue=.3*u+.7*Math.pow(u,2.2), sx=mix(xs,cx,ue), sh=mix(1150,520,Math.pow(ue,.8)); F.quad(m.dark,sx,cy,sh*1.25,sh,0,{a:(.08+.5*ue)*sat(u*4)});
        const rc=mix(560,300,ue); F.quad(m.dark,sx,cy,rc*1.3,rc,0,{a:.9*Math.pow(ue,1.6)}); }
      F.quad(m.crD,cx,cy,r*1.04,r*1.04,rot,{a:.75*sat(g*3)}); F.quad(m.crE,cx,cy,r,r,rot,{cA:H.cA,cB:H.cB,cM:H.cM,cC:H.cC,a:Math.min(1,g*3),gain:2.3*H.g,ero:.1+.4*(1-g)});
      F.quad(m.glowG,cx,cy,RS*(.5+.9*g),RS*(.5+.9*g),0,{...col(P),a:.7*g*g,gain:1.6});
      // the aiming ring: one closed band of fire that falls in on the spot faster and faster, and a broken ring inside turning the other
      // way. The closing ring is a torn band of fire, not a clean stripe: its body burns ragged (scrolling erosion), its white edge breaks in
      // three or four places, embers run round on it and gravel jumps where it has just passed
      { const w=70+90*g, a0=rot+tt*.8, al=sat(g*8);
        // a shock wave that scrapes the floor, not a drawn circle: a dark wall of dust and soil riding on it, its burning foot thick on the
        // near side and thin on the far side, torn open in three places that wander round
        F.lathe(M10.cur,cx,cy,0,{r0:Ra-w*.2,r1:Ra+w*.9,h0:0,h1:150+260*g,a0,a1:a0+TAU,a:al*(.75+.2*g),ero:.38,t0:tt*1.3});
        for(const [b0,b1,wk] of [[.35,2.75,1.35],[3.05,4.55,.55],[4.85,6.0,.5]]){ const c0=PI/2-1.55+b0+.25*Math.sin(tt*1.7+b0), c1=PI/2-1.55+b1+.2*Math.sin(tt*1.3+b1);
          F.lathe(m.shL,cx,cy,0,{r0:Ra-w*.3*wk,r1:Ra+w*.14*wk,a0:c0,a1:c1,cA:'#5a1200',cB:P.b,cC:P.h,cM:P.m,a:al*(.55+.45*wk/1.35),gain:(1.7+1.1*g)*(.7+.3*wk),ero:.6-.22*g,t0:5+tt*1.1+b0}); }
        if(GFX.on){ rg+=rgT?Math.max(0,tt-rgT)*(70+260*g):0; rgT=tt; while(rg>=1){ rg--; const a=rand(0,TAU), ca=Math.cos(a), sa=Math.sin(a), R=Ra+rand(-.4,.4)*w, fr=sa>0;
          const q=Math.random(); if(q<.3) GFX.pt({x:cx+ca*R,y:cy+sa*R*FSY,z:rand(8,40),vx:-sa*(400+700*g)-ca*120,vy:ca*(400+700*g)*FSY-sa*70,vz:rand(60,220),g:500,drag:1.6,life:rand(.18,.35),s:rand(2,3.5),m:3,len:rand(.03,.06),c:GFX.rgb(Math.random()<.2?'#ffe8b0':P.h),c2:'#d0400a',L:3});
          else if(q<.65) GFX.pt({x:cx+ca*(R+w*.4),y:cy+sa*(R+w*.4)*FSY,z:rand(5,30),vx:ca*rand(150,420),vy:sa*rand(150,420)*FSY,vz:rand(60,200),g:-20,drag:1.4,life:rand(.5,.9),s:rand(40,80)*(fr?1.3:.8),grow:rand(60,120),m:5,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3a2a1c':'#24180f'),c2:'#000000',c3:'#9a6a40',er:.9,ns:rand(.9,1.6),w:1,a:.45,L:0});
          else GFX.pt({x:cx+ca*(R+w),y:cy+sa*(R+w)*FSY,z:4,vx:ca*rand(80,260),vy:sa*rand(80,260)*FSY,vz:rand(500,1100),g:GRAV,life:rand(.35,.6),s:rand(3,9),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#5a4c40':'#7e6a58'),c2:'#0a0908',shadow:true,L:2}); } } }
      if(solid) for(const c of GV){ const e=sat((tt-tG-c.d)/.9), z=c.z1*eo3(e)+c.s*.3+Math.sin(tt*2.1+c.ax)*14*e; if(e<=0) continue; F.solid(c.kd,c.v,c.x,c.y,z,{M:F.xf({s:c.s,rx:c.ax*tt*.3,ry:c.ay*tt*.3}),alb:'#3a3029',emis:'#ff7a10',rimC:P.h,spec:.4,rim:.25,bump:2.2,dust:.55,dustC:'#6e5a46',clip:0,edge:.07,glow:.2+.7*g,seed:c.ax+7,shadow:c.sh?[.55,.28,.3]:null});
          if(GFX.on&&Math.random()<.25+.4*g) GFX.pt({x:c.x+rand(-.3,.3)*c.s,y:c.y,z:z-c.s*.2,vx:rand(-30,30),vy:0,vz:-rand(0,80),g:1800,life:rand(.3,.55),s:rand(1.5,3.5),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#5a4c40':'#7e6a58'),c2:'#0a0908',L:2}); } }
    { const rp=sat(g/.2); HS.a=.3*rp+.9*g; HS.r=500+1000*g; SKY.a=.14*rp+.5*g; SKY.r=hw*(1+.7*g); }
    // short discharges crawling over the hot patch, re-struck every few frames, more of them as it nears
    if(GFX.on&&g>.15){ const n=2+Math.round(3*g), sl=Math.floor(tt/.06); for(let j=0;j<n;j++){ const b=sl*7.31+j*13.7, a=hsh(b)*TAU, R0=RS*(.3+.9*hsh(b+1)); let px=cx+Math.cos(a)*R0, py=cy+Math.sin(a)*R0*FSY, pz=10;
        for(let s=0;s<4;s++){ const a2=a+(hsh(b+2+s)-.5)*1.4, l=50+80*hsh(b+5+s), nx=px+Math.cos(a2)*l, ny=py+Math.sin(a2)*l*FSY, nz=10+70*hsh(b+9+s); GFX.line(q2.ln,px,py,pz,nx,ny,nz,4+3*g,q2.cm,.85,0,cx,1,0); GFX.line(q2.ln,px,py,pz,nx,ny,nz,1.6,q2.cw,1,0,cx,1,0); px=nx; py=ny; pz=nz; } } }
    // the meteor: rock, sheath and tail ride one straight line, faster as it nears; it only grows
    // it comes from far up the road: small and slow at first, then it gathers speed and swells as it nears (the tail grows with it)
    if(tt>=tM){ const u=sat((tt-tM)/(tI-tM)), ue=.3*u+.7*Math.pow(u,2.2), x=mix(xs,cx,ue), z=mix(zs,ze,ue), r=mix(150,560,Math.pow(u,1.7)); tj.x=ts.x=x+sd*r*.5*cp; tj.z=ts.z=z+r*.5*sp; tj.r=r*.66; ts.r=r*1.3; tj.len=mix(700,1900,u); ts.len=mix(1300,3600,u);
      // the air behind it boils: heat shimmer in the wake
      if(GFX.haze) GFX.haze(x+sd*r*1.3*cp,cy,z+r*1.3*sp,r*1.7,.75);
      // the road it has come down stays written on the sky: smoke left behind on the line, lit from below near the rock and grey above
      if(GFX.on){ trl+=trT?Math.max(0,tt-trT)*(110+220*u):0; trT=tt; while(trl>=1){ trl--; const w=rand(.1,1)*Math.min(1.6,(tt-tM)*2); GFX.pt({x:x+sd*r*(.4+w*1.6)*cp+rand(-.3,.3)*r,y:cy+rand(-.35,.35)*r,z:z+r*(.4+w*1.6)*sp,vx:rand(-40,40),vy:0,vz:rand(20,90),drag:.6,life:rand(.7,1.1),s:r*rand(.35,.6),grow:r*rand(.5,.9),m:5,b:'alpha',c:GFX.rgb(Math.random()<.35?'#3a2414':'#1a120c'),c2:'#000000',c3:'#8a6448',er:.9,ns:rand(.9,1.6),w:1,a:.5,L:0}); } }
      if(!ML) ML=GFX.light(x,cy,1500,P.l,0,.3,{hold:tI-tt,z:300}); ML.x=x; ML.z=Math.min(600,z); ML.a=1.4*u; ML.r=1300+1100*u;
      if(F.on){ const fl=.85+.15*hsh(Math.floor(tt*40));
        F.bill(M10.flash,x,cy,z,r*1.5,r*1.5,0,{...col(FL),a:.3,gain:1.2});
        if(solid){ const M=F.xfw({s:r*1.6,rx:tt*2.6,ry:tt*1.5,rz:tt*3.4}); M[12]-=M[8]*.35; M[13]-=M[9]*.35; M[14]-=M[10]*.35; F.solid('meteor',1,x,cy,z,{M,clip:0,alb:'#2a2421',emis:FL.b,rimC:FL.h,spec:.3,rim:.3,glow:1.1+.5*u,hot:[-sd*cp,0,-sp,.3+.2*u],bump:2.4,dust:0,edge:.04,seed:3.1});
          // two pieces torn off it ride the same road behind it, burning, each tumbling its own way
          for(let j=0;j<2;j++){ const kb=j?3.3:2.1, rb=r*(j?.2:.34), bx=x+sd*cp*r*kb, bz=z+sp*r*kb+Math.sin(tt*3+j)*r*.15, by=cy+(j?-1:1)*r*.3*FSY; F.solid('meteor',j?3:2,bx,by,bz,{M:F.xfw({s:rb*1.6,rx:tt*(2.2+j),ry:tt*1.7,rz:tt*(3-j)}),clip:0,alb:'#2a2421',emis:FL.b,rimC:FL.h,spec:.3,rim:.3,glow:1.3,hot:[-sd*cp,0,-sp,.35],bump:2.4,dust:0,edge:.04,seed:5.3+j}); } }
        F.bill(M10.flash,x-sd*r*.8*cp,cy,z-r*.8*sp,r*.95*fl,r*.7*fl,sd*.3,{...CWm,a:.6,gain:2}); }
      // molten drops peeled off the leading edge, white where they leave and red as they trail away (count follows time, not frames)
      if(GFX.on){ const fx_=x-sd*r*.45*cp, fz=z-r*.45*sp; shed+=pT?Math.max(0,tt-pT)*(120+260*u):0; pT=tt; while(shed>=1){ shed--; const a=rand(0,TAU), rr=r*rand(.35,.6), w=rand(.4,1);
        GFX.pt({x:fx_+Math.cos(a)*rr*sp*sd,y:cy+Math.sin(a)*rr*.5,z:fz-Math.cos(a)*rr*cp,vx:sd*cp*rand(500,1500)*w,vy:Math.sin(a)*rand(40,160),vz:sp*rand(500,1500)*w,drag:1.2,life:rand(.18,.42),s:rand(2,4.5),m:3,len:rand(.12,.22),c:GFX.rgb(Math.random()<.45?'#ffffff':P.h),c2:'#c8360a',L:3}); } }
      K.sparks(x,cy,z,{pal:P,n:2,dir:sd>0?0:PI,spread:.5,sp:[300,1400],up:900,life:[.2,.55],g:200}); } });
  [.9,1.15,1.4,1.6,1.8,1.95].forEach((at,i)=>after(at,()=>K.embers(cx,cy,260+110*i,{pal:P,n:8+6*i,life:1.1,up:380+40*i})));
  // the spot itself draws in: shells of heat closing on it, sparks round it, grit lifting off it, the air above it shimmering
  const GA=K.gather(cx,cy,120,{dur:tI-tS,delay:tS,pal:P,r:380,R:1300,n:.1,shells:2,core:0,floor:0,haze:0,debris:1,sparks:0,gain:.85});
  // grit off the meteor arrives before it does, down the same slant, thicker as it nears
  // (no straight streaks: short burning flecks that taper to red, and dark stone bits that tumble down under their own weight)
  { const vx=(cx-xs)/.8, vz=(ze-zs)/.8; for(let i=0;i<30;i++) after(1.25+.9*Math.sqrt(Math.random()),()=>{ const z=rand(900,1500), o=rand(-900,900), w=rand(.7,1.3), j=rand(.8,1.25), y=cy+rand(-520,520), x=cx-vx*j*(z/-vz)+o;
    if(i%2) GFX.pt({x,y,z,vx:vx*w*j*.5,vz:vz*w*.5,g:1600,life:rand(.7,1.1),s:rand(5,13),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3a2a20':'#5a2a14'),c2:'#070504',shadow:true,bounce:.2,L:2});
    else GFX.pt({x,y,z,vx:vx*w*j,vz:vz*w,life:z/-vz/w,s:rand(2,4.5),m:3,len:rand(.025,.05),a:rand(.6,1),c:GFX.rgb(Math.random()<.2?'#fff0c0':P.h),c2:'#a8280a',L:3}); }); }
  // the floor breathes in before the blow: dust over the whole patch crawls toward the spot, low, faster as the rock nears
  if(GFX.on) for(let i=0;i<46;i++) after(tL+.12+(tI-tL-.3)*Math.pow(i/46,.8),()=>{ const a=rand(0,TAU), R=rand(500,1300); GFX.pt({x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R*FSY,z:rand(4,30),tx:cx,ty:cy,tz:10,pull:rand(1.6,2.6),life:rand(.6,.9),s:rand(50,95),grow:rand(-20,20),m:5,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3a2a1c':'#2a1e14'),c2:'#000000',c3:'#9a7a58',er:.9,ns:rand(.9,1.6),w:1,a:.4,L:0}); });
  // a breath before it lands the floor under it is already pressed: a ring of dust shoved out flat from under the rock
  after(tI-.09,()=>{ if(GFX.on) for(let i=0;i<30;i++){ const a=i/30*TAU+rand(-.1,.1), r=rand(260,360); GFX.pt({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,z:rand(4,20),vx:Math.cos(a)*rand(900,1500),vy:Math.sin(a)*rand(900,1500)*FSY,vz:rand(20,80),g:-10,drag:2.4,life:rand(.5,.8),s:rand(40,70),grow:rand(80,140),m:5,b:'alpha',c:GFX.rgb('#3a2a1c'),c2:'#000000',c3:'#b08050',er:.9,ns:rand(.9,1.6),w:1,a:.5,L:0}); } });
  // splinters land over the whole field, sooner each time
  [1.0,1.24,1.44,1.6,1.73,1.84,1.93,2.01,2.08].forEach((at,i)=>{ const a=rot+i*2.4, rr=.46+.5*((i*.381)%1), x=cx+Math.cos(a)*hw*1.05*rr, y=cy+Math.sin(a)*hh*1.25*rr; after(at-.2,()=>{ splinter(x,y,sd,Dm); after(.2,()=>{ Cn.shake(.3+.05*i); Cn.SND.tick(.6+.08*i,.2); }); }); });
  // the floor shudders, sooner each time: stones jump off the patch
  [.95,1.3,1.58,1.8,1.97].forEach((at,i)=>after(at,()=>{ const a=rand(0,TAU), r=160+70*i; K.debris(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{n:5+2*i,r:120+40*i,sp:[80,380],up:900+150*i,size0:8,size:24}); K.dust(cx,cy,{n:4+i,r:160+50*i,sp:[80,300],a:.4,c:'#241c14'}); K.dust(cx,cy,{n:8+2*i,r:200+60*i,sp:[500,1500],a:.4,s:1.3,life:.8,c:'#2a2018',c3:'#6e5a48'}); Cn.shake(.2+.07*i); }));
  after(tM,()=>{ sfx('whoosh',.45,1); Cn.SND.inhale(tI-tM,.5); });
  after(tI-.25,()=>{ Cn.hush(.25); dr.stop(.1); });
  // ---- climax. Floor, then dark smoke, then the fire and the rock, then the light, then what flies.
  // the crown: nine rocks, each with its own lean, its own moment to stand and its own moment to break
  // three sizes (big, middle, small) so the crown is a cluster, not a row; each stands a little later the further out it is
  const CR=[], ordF=[4,0,6,2,8,3,7,1,5], SZ=[1.25,.5,.78,.4,1.12,.6,.44,.9,.52], SR=1300, SD=1, rD=r=>Math.max(.02,SD*(1-Math.cbrt(1-sat((r-200)/SR))))+rand(0,.015); for(let i=0;i<9;i++){ const a=(i+rand(.2,.8))/9*TAU, r=620*rand(.8,1.3), front=Math.sin(a)>.35, s=400*SZ[i]*(front?.68:1), ca=Math.cos(a), sa=Math.sin(a), tg=a+PI/2;
    // each is a slab of the crust broken off and thrust up on edge, not a lump: a thick block split along flat cleaves (the shard mesh
    // widened), the big ones with a second slab cracked off leaning further, and broken stone heaped at the foot
    const big=SZ[i]>1, pc=[{dx:0,dy:0,s,v:i%4,kd:big?'flag':SZ[i]>.7?'shard':i%2?'stone':'shard',W:big?[1.5,.7,1.35]:[1.3,1.15,.9],rz:tg+rand(-.3,.3),ln:front?rand(.1,.22):big?rand(.4,.6):rand(.25,.45),d:0}];
    if(!front&&SZ[i]>.7){ const o=rand(-.45,.45); pc.push({dx:(ca*.22+Math.cos(tg)*o)*s,dy:(sa*.22+Math.sin(tg)*o)*s,s:s*rand(.45,.6),v:(i+1)%4,kd:'flag',W:[1.1,.9,1.3],rz:tg+rand(-.6,.6),ln:rand(.6,.9),d:rand(.04,.08)}); }
    { const b=rand(0,TAU); pc.push({dx:Math.cos(b)*s*.42,dy:(Math.sin(b)*.3+.25)*s,s:s*rand(.2,.3),v:(i+2)%4,kd:'stone',W:[1,.85,.62],rz:rand(0,TAU),ln:rand(0,.5),d:rand(.02,.06)}); }
    CR.push({a,x:cx+ca*r,y:cy+sa*r*FSY,d:rD(r),s,big:SZ[i]>1&&!front,pc,tf:tA-tI+.06+ordF[i]*.075,sm:[rand(-1,1),rand(-1,1),rand(-1,1)]}); }
  // and four low teeth inside it, behind him, that stand first and break first
  for(let i=0;i<4;i++){ const a=PI+(i+rand(.2,.8))/4*PI, r=rand(300,380), s=rand(170,280); CR.push({a,x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,d:rD(r),s,inner:true,pc:[{dx:0,dy:0,s,v:(i+2)%4,kd:'shard',W:[1.3,.6,.95],rz:a+PI/2+rand(-.4,.4),ln:rand(.35,.6),d:0}],tf:tA-tI+.03+i*.05,sm:[0,0,0]}); }
  // the cracks that run out past the edges of the picture
  const LN=[]; for(let i=0;i<7;i++){ const a=rot+(i+rand(.2,.8))/7*TAU, Lr=hw*rand(1.3,1.7), w=rand(70,112), Pt=fissPath(cx,cy,a,430,Lr,w);
    // every other one splits: a branch leaves it a third to two thirds of the way out and wanders off on its own, thinner
    let Bp=null; if(i%2===0){ const k=4+((Math.random()*5)|0), q=Pt[k], ba=a+(Math.random()<.5?-1:1)*rand(.35,.7); Bp={d0:q.d,P:fissPath(q.x,q.y,ba,0,(Lr-q.d)*rand(.35,.55),q.w*.6,q.d)}; }
    LN.push({a,c:Math.cos(a),s:Math.sin(a)*FSY,Lr,w,Pt,Bp,at:d=>{ for(let j=1;j<Pt.length;j++) if(Pt[j].d>=d){ const p=Pt[j-1], q=Pt[j], k=(d-p.d)/(q.d-p.d); return [mix(p.x,q.x,k),mix(p.y,q.y,k)]; } const e=Pt[Pt.length-1]; return [e.x,e.y]; }}); }
  // where the floor vents: on the cracks near the crown, on the cracks half way out, and a last ring at the edges of the picture.
  // Four kinds - a tall thin jet, a low fat burst, one that leans, one that is smoke almost at once - and no two lit together
  const VT=[], KD=[0,2,1,3,2,0,3,1,2,0,1,3]; let vn=0;
  // the ring at the edges of the picture is only quick bright jets (no slow smoke cones): up in a tenth of a second, out from the foot, smoke carried off
  const vent=(a,r)=>{ const ed=r>1900, k0=KD[vn++%KD.length], k=ed?(k0===1||k0===3?k0-1:k0):k0===3?1:k0, la=a+rand(-.7,.7); VT.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,r,at:.08+(r-430)/SPD+rand(0,.22),
    o:ed?{r:rand(70,105),h:rand(1100,1700),dur:rand(.5,.7),rise:.1,lean:k===2?rand(.18,.32):rand(0,.08),la,gain:1.25,heat:1.15,fs:.35,taper:.55}:k===0?{r:rand(70,100),h:rand(1500,2100),dur:rand(.8,1),rise:.2,lean:rand(0,.1),la,gain:1.25,heat:1.1,fs:.45,taper:.6}:k===1?{r:rand(150,210),h:rand(520,800),dur:rand(1,1.3),rise:.26,lean:rand(0,.1),la,gain:1,fs:.35,taper:.3}
      :k===2?{r:rand(90,130),h:rand(1000,1400),dur:rand(.85,1.1),rise:.22,lean:rand(.22,.4),la,gain:1.05,fs:.4}:{r:rand(120,170),h:rand(900,1300),dur:rand(1.5,1.9),rise:.3,lean:rand(.05,.18),la,gain:.8,heat:.6,fs:.16}}); };
  LN.forEach((l,i)=>{ if(i%2===0) vent(l.a,rand(1250,1650)); else vent(l.a,rand(2000,2500)); });
  for(let i=0;i<7;i++) vent(rot+.9+(i+rand(.15,.85))/7*TAU,rand(2850,3450));
  after(tI,()=>{ tj.dead=true; ts.dead=true; if(GA&&GA.end) GA.end(); HS.hold=0; HS.life=.3; SKY.hold=0; SKY.life=.25; if(ML){ ML.hold=0; ML.life=.1; }
    pl.x=cx; pl.gy=cy; pl.visible=true; S([['gy13',.5],['gy14',.4],['gy15',.25],['gy16',9]]);
    // the fall itself: a flash, a cone of dirt thrown out and falling back, stones flung, a mushroom of dust and smoke lit orange at its
    // foot and dark on top, a molten crater whose rim cools, cracks in the gold of his ki (the dust ring is the one below)
    impactM(cx,cy,{s:440,dur:tEnd-tI+.3,fire:'flame',pal:PA2,stones:5,rock:'#3a302a'}); mush(cx,cy-190,440,2300,2.3);
    // the body of the shock: dark dust thrown low and fast in every direction, past the edge of the picture, rolling in lumps
    if(GFX.on) for(let i=0;i<54;i++){ const a=rand(0,TAU), v=rand(1700,2900), r0=rand(160,300), sz=rand(70,150); GFX.pt({x:cx+Math.cos(a)*r0,y:cy+Math.sin(a)*r0*FSY,z:rand(10,70),vx:Math.cos(a)*v,vy:Math.sin(a)*v*FSY,vz:rand(60,220),g:-30,drag:2.3,life:rand(1.1,1.7),s:sz,grow:sz*rand(1.4,2.4),m:5,b:'alpha',c:GFX.rgb(i%3?'#1a130e':'#2c2016'),c2:'#000000',c3:i%4?'#6a5240':'#a0603a',er:.9,ns:rand(1,1.8),w:1,a:rand(.5,.75),L:0}); } K.dust(cx,cy,{n:10,r:420,sp:[1800,4200],a:.4,s:1.2,life:.9,c:'#2a2018',c3:'#6e5a48'});
    if(solid) GFX.add(tA-tI+1.3,(k,tt)=>{ const re=aft<0?0:Math.max(0,1-(RT-aft)/.9), cl=sat(tt/1.3), pu=.5+.5*Math.sin(tt*5.2);
      for(const p of CR){ if(p.gone) continue; const ca=Math.cos(p.a), sa=Math.sin(p.a), pk=sat((tt-(p.tf-.32))/.32), jt=pk*Math.sin(tt*47+p.a*5)*.03;
        // a rock about to go: its seams take fire, it shivers and settles a hand's breadth
        for(const c of p.pc){ const q=tt-p.d-c.d-.08; if(q<0) continue;
          // it heaves up out of the floor over a quarter second, hinging up from nearly flat as it climbs, goes a little too far, drops back,
          // rings down, and then keeps settling a little under its own weight
          // it comes up in two shoves over a third of a second (a heave, a catch, a second heave), goes a little too far and settles;
          // just before it breaks it tips outward under its own weight
          const R0=.34, u=sat(q/R0), s1=sat(u/.55), s2=sat((u-.45)/.55), up=.58*s1*s1*(3-2*s1)+.42*s2*s2*(3-2*s2), ov=q>R0?Math.exp(-(q-R0)*6)*Math.sin((q-R0)*22):0, sg=sat((q-R0)/1.6), fo=sat((tt-(p.tf-.2))/.2),
            ln=c.ln+(1-up)*.85+ov*.06+sg*.04+jt+pk*pk*.07+fo*fo*.5, zf=c.s*(up-1)*1.05+c.s*.035*ov-sg*c.s*.035-pk*pk*c.s*.05-fo*fo*c.s*.2;
          // the light is in its cracks, not painted on it: white-hot as it stands, a dull thread once cooled, white again before it breaks
          const W=c.W; F.solid(c.kd,c.v,p.x+c.dx,p.y+c.dy*FSY,zf,{M:F.xfw({sx:c.s*W[0],sy:c.s*W[1],sz:c.s*W[2],rz:c.rz,rx:-sa*ln,ry:ca*ln}),alb:mixh('#241e1a','#3a312a',cl*(1-pk)),emis:mixh('#ffa030','#c8560a',cl*(1-pk)),rimC:P.b,spec:.4,rim:.12,bump:1.9,dust:.1,tone:.45,bright:.58,tintK:.65,dustC:'#4a3a2c',edge:.14,strata:5,glow:(.08+.5*(1-cl)*(1-cl)+.03*pu+.4*re+1.2*pk)*(.45+.55*Math.min(1,c.s/360)),seed:p.a*3+c.v,shadow:c.dx===0&&p.big?[ca*.85,sa*.85,.32]:null});
          // soil and stones pour off its top edge while it comes up, and a stone now and then still drops off it after
          if(GFX.on&&!p.inner&&Math.random()<(q<.35?.9:.1)){ const bg=Math.random()<.18; GFX.pt({x:p.x+c.dx+rand(-.4,.4)*c.s*W[0]+ca*c.s*W[2]*.3*Math.max(0,ln),y:p.y+(c.dy+sa*c.s*W[2]*.3*Math.max(0,ln))*FSY,z:c.s*W[2]*rand(.55,1)*Math.min(1,up),vx:rand(-60,60)+ca*80,vy:(rand(-20,20)+sa*80)*FSY,vz:rand(0,140),g:GRAV,life:rand(.35,.7),s:bg?rand(10,18):rand(3,8),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#4a3c30':'#7e6a58'),c2:'#0a0908',shadow:bg,bounce:.2,L:2}); } } } });
    else K.upheave(cx,cy,{r:620,n:9,s:400,dur:tA-tI+.6,pal:P,rock:ROCK2});
    // each rock breaks the floor as it comes up
    // just before it, the floor there swells and splits: gravel hops on it and dust breathes out of the split
    for(const p of CR) after(p.d,()=>{ K.dust(p.x,p.y,{n:5,r:p.s*.3,sp:[150,520],a:.45,c:'#241c14'}); if(!p.inner) K.debris(p.x,p.y,{n:4,r:p.s*.25,sp:[150,600],up:1200,size0:8,size:26});
      if(GFX.on) for(let i=0;i<12;i++){ const b=rand(0,TAU), d=p.s*rand(.1,.6); GFX.pt({x:p.x+Math.cos(b)*d,y:p.y+Math.sin(b)*d*FSY,z:2,vx:Math.cos(b)*rand(20,90),vy:Math.sin(b)*rand(20,90)*FSY,vz:rand(250,650),g:GRAV,life:rand(.3,.55),s:rand(3,9),rot:rand(0,TAU),vr:rand(-8,8),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#4a3c30':'#6e5e50'),c2:'#0a0908',L:2}); }
      // the floor heaped up round its foot: a low ring of dust rolling off the mound, and broken stones of every size that stay lying there
      if(GFX.on&&!p.inner){ for(let i=0;i<7;i++){ const b=i/7*TAU+rand(-.3,.3), d=p.s*rand(.35,.6); GFX.pt({x:p.x+Math.cos(b)*d,y:p.y+Math.sin(b)*d*FSY,z:rand(4,20),vx:Math.cos(b)*rand(160,320),vy:Math.sin(b)*rand(160,320)*FSY,vz:rand(10,60),g:-10,drag:1.8,life:rand(.8,1.2),s:p.s*rand(.18,.28),grow:p.s*rand(.25,.4),m:5,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3a2c20':'#2a1e14'),c2:'#000000',c3:'#9a7a58',er:.9,ns:rand(.9,1.6),w:1,a:.5,L:0}); }
        for(let i=0;i<9;i++){ const b=rand(0,TAU), d=p.s*rand(.3,.8), bg=i<2; GFX.pt({x:p.x+Math.cos(b)*d*.5,y:p.y+Math.sin(b)*d*.5*FSY,z:rand(20,p.s*.4),vx:Math.cos(b)*rand(120,380),vy:Math.sin(b)*rand(120,380)*FSY,vz:rand(150,500),g:GRAV,drag:.3,life:rand(1.8,2.6),s:bg?rand(16,26):rand(5,12),rot:rand(0,TAU),vr:rand(-6,6),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#4a3c30':'#6a5a4a'),c2:'#0a0908',shadow:bg,bounce:.25,fk:5,L:2}); } } });
    K.sparks(cx,cy,60,{pal:P,n:5,sp:[500,1500],up:1700,life:[.3,.6]}); K.debris(cx,cy,{n:18,r:220,sp:[300,1400],up:1900,size0:12,size:40}); K.dust(cx,cy,{n:12,r:160,sp:[500,1600],a:.6,c:'#1c140c'});
    // the shock goes out first: a hard bright edge running over the floor at one speed (the crown stands up behind it, rock by rock as it passes)
    if(F.on) GFX.add(.42,(k,tt)=>{ const R=(200+SR*eo3(sat(tt/SD)))*1.05+30, w=90+170*k, a=(1-k)*(1-k); F.lathe(m.shL,cx,cy,6,{r0:R-w,r1:R+w*.3,a0:rot,a1:rot+TAU,cA:'#3a0c00',cB:P.b,cC:P.h,cM:P.m,a,gain:1.8*(1-.5*k),ero:.45+.45*k,t0:tt*3}); });
    // one frame of everything, then it lets go
    GFX.add(.5,(k,tt)=>{ const c=.16*Math.max(0,1-tt/.1); if(post.blur>c) post.blur=c; });
    Cn.peak(cx,cy-hz,{ca:.03,blur:.16,hold:.017,out:.06,tint:'#ffc840',a:.12}); hitstop=Math.max(hitstop,.12); Cn.shake(1.7); GFX.light(cx,cy,hw*1.6,P.l,.55,.7,{z:260}); Cn.SND.hit(1); SFX.boom(1.8,1);
    after(.06,()=>Cn.move({x:cx,y:cy-BODY*.6-30,zoom:.62,tilt:.22,roll:0},.55,'io')); GFX.ambient(.66,.54,.38,40); after(.18,()=>GFX.ambient(.6,.46,.38,4));
    // every body on the field is thrown outward in this frame, far: it stays lit while it is in the air, the nearest leave a track
    // from where they stood, and each raises dust where it comes down
    const TH=[]; X.onScreen(300).sort(byD(cx,cy)).forEach((e,i)=>{ const dx=e.x-cx, dy=e.y-cy, l=Math.hypot(dx,dy)||1; TH.push({e,x:e.x,y:e.y,z:e.h*.5,air:false,tr:i%3===0}); K.knock(e,{from:[cx,cy],dist:900,up:1500,fx:0}); if(i<5) K.ehit(e,{pal:P,pw:1.25,ring:0,light:false}); thrown(e,P,dx/l,dy/l,i<4?1:0); });
    if(GFX.on) GFX.add(1.3,(k,tt)=>{ let n=0; for(const h of TH){ const e=h.e; if(e.dead){ h.done=true; continue; } if(h.done) continue; if(e.z>30) h.air=true; if(tt<.5||h.air) e.flash=Math.max(e.flash,.7);
        if(h.air&&e.z<=0){ h.done=true; K.dust(e.x,e.y,{n:4,r:24,sp:[90,300],a:.5,c:'#2a2018',life:.9}); K.debris(e.x,e.y,{n:2,r:20,sp:[60,200],up:500,size0:5,size:12}); continue; }
        if(h.tr&&n++<5&&tt<.3){ const a=.55*(1-tt/.3), bx=mix(e.x,h.x,.3), by=mix(e.y,h.y,.3); GFX.line(q2.ln,bx,by,e.z+e.h*.3,e.x,e.y,e.z+e.h*.5,4,q2.cm,a,0,h.x,1,0); } } }); });
  // ---- the second wave runs outward to the edges of the picture: the cracks run, and the floor vents ring after ring behind them
  LN.forEach((l,i)=>after(tI+.08,()=>fissure(l,{pal:PA2,life:tEnd-tI-.1-i*.05,hot:.62,spd:SPD/1.3,gain:1.05})));
  VT.forEach((v,i)=>after(tI+v.at,()=>{ geyser(v.x,v.y,v.o); K.sparks(v.x,v.y,30,{pal:P,n:7,sp:[100,500],up:1900,life:[.25,.6]}); K.debris(v.x,v.y,{n:4,r:60,sp:[150,600],up:1300,size0:8,size:24}); if(v.r>2800&&i%2) burnt(v.x,v.y,v.o.r*2.6,1.2);
    if(i%2===0||v.r>2800) GFX.light(v.x,v.y,v.r>2800?1100:760,P.l,.95,.5,{z:160}); inCircle(v.x,v.y,340,e=>{ K.knock(e,{from:[v.x,v.y],dist:200,up:1300,fx:0}); hitFx(e,C2,1.2); }); if(i%4===0){ Cn.shake(.4); Cn.SND.tick(.7,.25); } }));
  after(tK,()=>Cn.sweep(cx,cy,Dm,{speed:3600}));
  // ---- what is left keeps moving: the camera pushes slowly in, the pool's light breathes, embers rise
  after(tI+.6,()=>{ Cn.move({zoom:.68,roll:0},tA-tI-.6,'io'); K.embers(cx,cy,hw*.6,{pal:P,n:40,life:2,up:300});
    const GL=GFX.light(cx,cy,1300,P.l,.5,.5,{hold:tEnd-tI-.9,z:120}); GFX.add(tEnd-tI-.9,(k,tt)=>{ GL.a=(.45+.14*Math.sin(tt*4.6)+.08*Math.sin(tt*11.3))*Math.pow(1-k,1.3); GL.r=mix(1300,650,k); }); });
  // ---- the second beat: he drives the fist in once more. The crater throws up a fountain, molten rock goes over the whole field
  // on arcs and burns where it lands, and the shock breaks the crown - the teeth beside him first, then rock after rock
  after(tA-.1,()=>S([['gy13',.45],['gy14',.4],['gy15',.4],['gy16',9]]));
  after(tA,()=>{ aft=RT; hitstop=Math.max(hitstop,.06); Cn.shake(1.2); SFX.boom(1.2,.9); Cn.SND.hit(.7); Cn.peak(cx,cy-hz,{ca:.004,blur:.08,hold:.017,out:.12,tint:'#ffc840',a:.16}); GFX.add(.5,(k,tt)=>{ const c=.08*Math.max(0,1-tt/.1); if(post.blur>c) post.blur=c; }); Cn.move({zoom:.64},.35,'io'); GFX.ambient(.6,.5,.42,3);
    GFX.light(cx,cy,hw*1.4,P.l,.6,1.1,{z:200}); K.flare(cx,cy,120,{pal:P,s:240,dur:.12,gain:2.2}); K.embers(cx,cy,820,{pal:P,n:40,life:1.5,up:520}); K.sparks(cx,cy,60,{pal:P,n:18,sp:[400,1600],up:2400,life:[.3,.8]}); K.debris(cx,cy,{n:16,r:500,sp:[100,500],up:1300,size0:8,size:26});
    K.dust(cx,cy,{n:14,r:300,sp:[900,2600],a:.45,s:1.5,life:1,c:'#2a2018',c3:'#6e5a48'});
    // the crater floor bursts up again: one throw of soil and stones out of the pool, falling back with shadows, and smoke lit from
    // below rolling up behind and beside him (no column)
    if(GFX.on) for(let i=0;i<40;i++){ const a=rand(0,TAU), el=rand(1.05,1.45), v=Math.sqrt(2*GRAV*1300)*rand(.45,1), rr=rand(0,130); GFX.pt({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr*FSY,z:rand(0,30),vx:Math.cos(a)*Math.cos(el)*v,vy:Math.sin(a)*Math.cos(el)*v*FSY,vz:Math.sin(el)*v,g:GRAV,drag:.2,life:rand(1,1.8),s:rand(5,15),rot:rand(0,TAU),vr:rand(-12,12),m:11,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3e352e':'#5e5248'),c2:'#090706',shadow:true,bounce:.25,fk:5,L:2}); }
    if(vok()){ K.vsmoke(cx-90,cy-170,{s:380,dur:1.8,rise:760,c:'#1a1512',c2:'#4e3a2a',a:.5,lit:.5,delay:.05}); K.vsmoke(cx+260,cy-60,{s:170,dur:1.3,rise:460,c:'#1a1512',c2:'#4e3a2a',a:.4,lit:.5,delay:.18}); }
    for(let i=0;i<11;i++){ const a=rot+1.7+(i+rand(.1,.9))/11*TAU, r=i%3===0?rand(900,1500):i%3===1?rand(1700,2500):rand(2700,3400), T=.34+r/5200+rand(0,.12); after(i*.012,()=>bomb(cx+Math.cos(a)*120,cy+Math.sin(a)*120*FSY-60,cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,T,rand(520,900)+r*.12,solid)); }
    after(.5,()=>GFX.ambient(.78,.68,.58,1.4)); after(.75,()=>Cn.move({zoom:.7},1.2,'io'));
    // a low curtain of dust settles over the crater as the crown comes down, rolling slowly outward, then thins away
    after(.35,()=>{ if(GFX.on) for(let i=0;i<11;i++){ const a=i/11*TAU+rand(-.5,.5), r=rand(420,1050); GFX.pt({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*FSY,z:rand(10,40),vx:Math.cos(a)*rand(60,160),vy:Math.sin(a)*rand(60,160)*FSY,vz:rand(10,40),g:-8,drag:.6,life:rand(1,1.8),s:rand(90,240),grow:rand(120,220),m:5,b:'alpha',c:GFX.rgb(Math.random()<.5?'#3a2c20':'#2e2218'),c2:'#000000',c3:'#7a5a3c',er:.9,ns:rand(.9,1.6),w:1,a:.28,L:0}); } }); });
  for(const p of CR) after(tA+p.tf-(tA-tI),()=>{ p.gone=true; shatter(p,solid,p.big?tEnd-tI-p.tf-.15:0); if(p.inner) return; Cn.shake(.3); sfx('whoosh',.3,.3); GFX.light(p.x,p.y,600,P.l,.6,.3,{z:120}); if(vok()&&p.pc.length>2) K.vsmoke(p.x,p.y,{s:p.s*.36,dur:1,a:.5,rise:p.s*.4,...SOOT}); });
  after(tEnd-1.2,()=>Cn.back(1.15)); after(tEnd-.75,()=>GFX.ambient(.86,.84,.8,1.5));
  after(tEnd,ultStop); }

// CHEONWON KI SPHERE (fs_ult3): the field goes dark and the air runs in to him; he raises a fist and a ball of ki lights over his head.
// It is a lit ball (bright on the upper left, in shade below, veins of fire turning over its skin, a thin burning limb) and it grows in
// surges, one on every beat: the ki of every enemy on the screen is drawn off them in threads and up into it, the beat going out over the
// field from the nearest body to the farthest. Then the floor gives under it, stones come off the ground, comets of plasma swing round it
// on leaning orbits - behind it on the far side, in front of it on the near side - faster and faster, and the sky strikes it from every
// side at no fixed interval; each strike lights it. It stops, is squeezed small and white with the orbits wound tight and golden round
// it - and he brings it down behind him. One white frame; then a ball of fire with a dark rolling edge, a hard ring to the edges of the
// picture, the shell of the orb thrown up in burning shards and every body on the field thrown outward, each going up in its own flash.
// What is left cools in steps: the shards come down one after another and stand in the floor, white, then blue, then dark; the current
// that is left runs out along the cracks, fewer times and weaker; the pool goes out.
const hx2=v=>('0'+Math.round(sat(v)*255).toString(16)).slice(-2);
// a mix of two hex colours in 16 steps (the colour cache is keyed by string: the steps keep it bounded)
const mixh=(a,b,k)=>{ const p=GFX.rgb(a), q=GFX.rgb(b); k=Math.round(sat(k)*16)/16; return '#'+hx2(mix(p[0],q[0],k))+hx2(mix(p[1],q[1],k))+hx2(mix(p[2],q[2],k)); };
let S3=null;
const st3=()=>S3||(S3={ln:GFX.st(3,'add',{c2:GFX.rgb(PK.b),c3:GFX.rgb(PK.h),L:3}),arc:GFX.st(15,'add',{t:GFX.img('v3_arc_h').im,uv01:true,c2:GFX.rgb(PK.b),c3:GFX.rgb(PK.h),L:3}),gl:GFX.st(8,'add',{L:2}),cm:GFX.rgb(PK.m),cs:GFX.rgb(PK.s),cl:GFX.rgb(PK.l),cw:[1,1,1]});
// a thread of ki drawn off a point into the orb O ({x,y,z}, read live): its head runs a bent road, faster as it nears, its tail follows
function kiThread(sx,sy,sz,O,dur,o={}){ if(!GFX.on) return; const q=st3(), bend=rand(-.4,.4), lift=rand(.1,.45), w=o.w||10, c=Math.random()<(o.white??.2)?q.cw:q.cm, ph=rand(0,9);
  const at=u=>{ const tx=O.x, ty=O.y, tz=O.z, dx=tx-sx, dy=ty-sy, v=1-u, mx=(sx+tx)/2-dy*bend, my=(sy+ty)/2+dx*bend, mz=sz+(tz-sz)*lift; return [v*v*sx+2*v*u*mx+u*u*tx,v*v*sy+2*v*u*my+u*u*ty,v*v*sz+2*v*u*mz+u*u*tz]; };
  /* the last third winds half a turn round the orb before it goes in (a spiral, not a straight dart) */
  const sw=rand(0,TAU), sg=Math.random()<.5?1:-1, atW=u=>{ const p=at(u), s=sat((u-.62)/.38); if(s<=0) return p; const b=Math.sin(Math.PI*s)*O.r*.85, an=sw+sg*s*Math.PI; p[0]+=Math.cos(an)*b; p[1]+=Math.sin(an)*b*FSY; p[2]+=Math.sin(an)*b*.5; return p; };
  /* twelve untapered links (p2 -1: no pinch at the joints, so no beads), width and light a smooth function of the place on the thread:
     a soft glow of the body colour and a thin white core that grows whiter toward the orb */
  GFX.add(dur,k=>{ const h=Math.pow(k,1.7), tl=Math.max(0,h-.2-.2*k), a=sat(k*8)*sat((1-k)*7), N=12; let p=atW(tl);
    for(let i=1;i<=N;i++){ const v=(i-.5)/N, n=atW(mix(tl,h,i/N)), f=Math.pow(Math.sin(Math.PI*Math.min(1,v*1.15)),.6)*(.35+.65*v);
      GFX.line(q.ln,p[0],p[1],p[2],n[0],n[1],n[2],w*1.5*f,q.cm,a*.32*f,0,ph,-1,0); GFX.line(q.ln,p[0],p[1],p[2],n[0],n[1],n[2],w*.38*f,c===q.cw||v>.55?q.cw:q.cs,a*(.5+.5*v)*f,0,ph,-1,0); p=n; } },o.delay||0); }
// a bolt out of the sky into the orb O: it stands on the orb's skin and leans the way it came (three pictures, like K.bolt)
let BM3=null;
function skyBolt(O,ang,h,w,dur,g){ if(!F.on) return; const m=K.mats(), mt=BM3||(BM3=F.mat({...m.art,tex:'fx3_bolt',layer:'o',rk:[.5,1]})), flip=Math.random()<.5, C=col(PK);
  /* it grows out of the orb's skin over its first two frames (root fixed on the skin), holds two hard frames, then an afterglow that stays
     blue (gain held, the colour does not wash to grey) and is eaten away from the far end over the rest of its life */
  GFX.add(dur,k=>{ const gr=eo3(sat(k/.12)), fr=k<.2?0:k<.32?1:2, f=sat((k-.32)/.68), a=fr===0?1:fr===1?.7:.9*Math.pow(1-f,1.2), hl=h/2*gr, d=O.r*.95+hl;
    F.bill(mt,O.x+Math.sin(ang)*d,O.y,O.z+Math.cos(ang)*d,w*(fr?1.08:1)*(1-.35*f),hl,ang,{...C,a,gain:3*g*(1-.3*f),ero:.08+f*.55,nk:f,uvT:(flip!==(fr===1))?[-1,1,1,0]:[1,1,0,0]}); }); }
// 0 -> 1 with a big overshoot (about a third) before it settles: the orb is born with a pop
const pop3=k=>{ const q=sat(k)-1; return 1+5*q*q*q+4*q*q; };
// a comet of plasma on a leaning orbit round the ball O (radius r): head at the angle th, its tail span radians behind it. The part of
// the orbit that is on the far side AND inside the ball's outline is not drawn - the ball hides it - so the band is seen to go round.
// The far half outside the outline is drawn thin and dim (it is behind the ball, in its shade), the near half full - so the band reads as
// a hoop round a solid, not a flat arc laid over it.
function orbitArc(m,O,r,R,inc,node,th,span,w,C,gain,a,sd){ const N=22, cu=Math.cos(node), su=Math.sin(node), ci=Math.cos(inc), si=Math.sin(inc); let run=[], far=false;
  const q=st3(), flush=()=>{ if(run.length>1){ const fa=far?.28:1, fw=far?.5:1; if(!far) F.ribbon(m.trB,run.map(p=>({...p,w:p.w*2.4})),{...C,gain:gain*.4,ero:.12,t0:sd+3,a:a*.5}); F.ribbon(m.trB,far?run.map(p=>({...p,w:p.w*fw})):run,{...C,gain:gain*(far?.55:1),ero:.1,t0:sd,a:a*fa});
      if(GFX.on) for(let i=1;i<run.length;i++){ const p=run[i-1], n=run[i]; GFX.line(q.ln,n.x,n.y,n.z,p.x,p.y,p.z,p.w*.22*fw,q.cm,a*p.k*fa,0,sd,-1,0); } } run=[]; };
  for(let i=0;i<N;i++){ const v=i/(N-1), q=th-span*v, cq=Math.cos(q), sq=Math.sin(q), dx=R*(cq*cu-sq*su*ci), dd=R*(cq*su+sq*cu*ci), dz=R*sq*si, sy=dd*FSY-dz, f=dd*.81+dz*.58<0;
    if(f&&dx*dx+sy*sy<r*r){ flush(); continue; }
    if(f!==far){ const last=run[run.length-1]; flush(); far=f; if(last) run.push(last); }
    run.push({x:O.x+dx,y:O.y+dd*FSY,z:O.z+dz,w:w*Math.pow(1-v,.55),k:(1-v)*(1-v)}); }
  flush(); }
function ultSphere(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, P=PK, m=K.mats(), q3=st3(), rot=rand(0,TAU), sd=rand(0,90), sd2=rand(0,90), sd3=rand(0,90);
  const tA=.8, tB=1.95, tS=2.6, tH=3.2, tC=3.42, tI=3.62, tK=3.7, tEnd=5.7, Qx=x0, Qy=y0-200, Z0=BODY*1.4, R1=600, RC=.72;
  const BEAT=[1,1.45,tB,2.3,tS,2.85,3.05], BW=[.6,.8,1.3,1,1.3,1.1,1.1], BWS=BW.reduce((a,b)=>a+b,0);
  const e0=nearest(1600); face(e0?angTo(e0):(pl.f>0?0:PI)); S([['gy09',.25],['gy10',.25],['gy11',9]]);
  // the orb: one function of time. Born with a pop, creeps, then grows in surges (one on each beat); it is squeezed before the blow
  const O={x:x0,y:y0,z:Z0,r:8};
  // (a steady creep under the surges, front-loaded so the orb never stands still between the pop and the first beat)
  // (each surge is spread over a third of a second so size and floor light never jump in one frame; the creep starts at the rate the
  // first stage ended with)
  const gro=t=>{ let v=0; for(let i=0;i<BEAT.length;i++) v+=BW[i]*sm5(sat((t-BEAT[i]+.04)/.34)); const d=Math.max(0,t-tA); return .1*(1-Math.exp(-d/.3))+.06*sat(d/(tH-tA))+.84*v/BWS; };
  // what every beat does to the picture: up over a tenth of a second, down over a quarter second
  const pulse=t=>{ let v=0; for(const b of BEAT){ const d=t-b; if(d>0&&d<.55) v=Math.max(v,d<.1?sm5(d/.1):Math.exp(-(d-.1)/.14)); } return v; };
  // the sky's strikes: no fixed interval (some come in pairs), no fixed side
  const STR=[]; { let at=tB+.12; while(at<tH-.04){ const k=sat((at-tB)/(tH-tB)); STR.push({t:at,ang:rand(.3,1.5)*(Math.random()<.5?-1:1),h:rand(1000,1700),k}); at+=Math.random()<.3?rand(.05,.08):rand(.2,.46)*(1-.45*k); } }
  const zap=t=>{ let v=0; for(const s of STR){ const d=t-s.t; if(d>=0&&d<.4) v=Math.max(v,Math.exp(-d/.11)); } return v; };
  const orbAt=t=>{ const g=gro(t), c=sm5(sat((t-tH)/(tC-tH))), rf=76+(R1-76)*g;
    O.r=t<.3?8*t/.3:t<tA?8+30*pop3((t-.3)/.3)+38*Math.pow(sat((t-.45)/(tA-.45)),1.2):rf*(1-(1-RC)*c); O.z=t<tA?Z0+O.r*1.02:Z0+rf*1.02+60*c; O.x=x0; O.y=y0;
    if(t>tC){ const u=sat((t-tC)/(tI-tC)), u2=Math.pow(u,1.6); O.x=mix(x0,Qx,u2); O.y=mix(y0,Qy,u2); O.z=mix(Z0+R1*1.02+60,O.r*.5,u2); } return g; };
  // ---- preparation: the field goes dark at once and the air runs in over the floor; the cast flash is blue-white and the orb pops into being with it
  GFX.ambient(.3,.34,.54,7); Cn.move({x:x0,y:y0-BODY*1.1,zoom:1.45,tilt:.05},.5); const dr=Cn.drone(48,.4); SFX.rumble(2); Cn.SND.inhale(tH,.4); sfx('whoosh',.6,.5);
  /* three rings of the floor's air, one after another, are drawn in to his feet turning faster as they close; each gets brighter as it
     tightens (it is being drunk, not fading) and is swallowed in its last few frames - the last one lands as the first beat goes out */
  if(F.on) GFX.add(1.05,k=>{ for(let i=0;i<3;i++){ const u=sat((k-i*.17)/.66); if(u<=0||u>=1) continue; const rr=mix(hw*1.05,70,u*u*(1.6-.6*u)), a=sat(u*5)*sat((1-u)/.18)*(.55+.6*u);
      if(!F.low) F.quad(m.shDu,x0,y0,rr,rr,rot+i*2+u*u*4,{a:.75*a,t0:sd+i}); F.quad(m.shP,x0,y0,rr*.9,rr*.9,rot+i+u*u*3,{...col(P),a:(.25+.35*u)*a,gain:1.1+.8*u}); } });
  after(.3,()=>{ K.flare(x0,y0,BODY*.7,{pal:'silver',s:120,sx:3.2,sy:.4,dur:.2,gain:4}); K.flare(x0,y0,Z0,{pal:P,s:190,dur:.26,gain:2.4}); Cn.SND.tick(1.5,.35); sfx('whoosh',1.3,.5); Cn.shake(.25); });
  gather(x0,y0,Z0,60,P,tA,500,1500); K.dust(x0,y0,{n:8,r:90,sp:[60,220],a:.35,c:'#141c2a'});
  const spot=GFX.light(x0,y0,300,P.l,0,.4,{hold:tI,z:200});
  // stones torn off the floor when it gives (second stage), of every size: they rise while the orb grows; the blow throws them and they come down
  const RKS=[165,125,95,75,58,46]; const RK=[]; for(let i=0;i<6;i++){ const a=(i+rand(.15,.85))/6*TAU, r=rand(380,1050), vz=rand(700,1500), z1=rand(60,340); RK.push({x:x0+Math.cos(a)*r,y:y0+50+Math.abs(Math.sin(a))*r*FSY,a,s:RKS[i]*rand(.85,1.15),v:i,big:i<3,z1,d:rand(0,.55),sp:rand(500,1500),vz,tl:(vz+Math.sqrt(vz*vz+6800*z1))/3400,ax:rand(-3,3),ay:rand(-3,3)}); }
  // the shell of the orb, thrown up by the blow in burning shards: each comes down at its own time and stands in the floor
  const SH=[]; for(let i=0;i<7;i++){ const a=rot+(i+rand(.2,.8))/7*TAU; SH.push({a,T:.5+.07*i+rand(0,.05),B:1.0+.075*((i*3)%7)+rand(0,.05),d:rand(560,1300),s:rand(200,420),v:i,hp:rand(650,1250),lean:rand(-.55,.55),tw:rand(0,TAU),ax:rand(-8,8),ay:rand(-8,8)}); }
  for(const c of SH){ c.x=Qx+Math.cos(c.a)*c.d; c.y=Qy+60+Math.sin(c.a)*c.d*FSY; }
  // ---- build-up, first stage: every enemy on the screen feeds it. Each beat goes out from him over the field (nearest body first): brand, a
  // little damage, a drag toward him - and the orb, the floor light and the camera answer on the beat's own frame
  after(tA,()=>{ Cn.move({y:y0-(Z0+R1)*.6,zoom:.72,tilt:.16,roll:.02},tB-tA,'io'); GFX.ambient(.24,.28,.54,1.4); });
  BEAT.forEach((at,i)=>after(at,()=>{ let n=0; for(const e of X.onScreen(300)){ const dx=x0-e.x, dy=y0-e.y, l=Math.hypot(dx,dy)||1, th=n++<16;
      after(l/7500,()=>{ if(e.dead) return; const h=K.mark(e,'brand',{pal:'azure',max:5,dur:tI-at+.8}); if(h&&h.fx) h.fx.dead=true; dmg(e,e.d.boss?Dm*.011:Math.min(Dm*.011,e.hp*.1),{sx:x0,sy:y0});
        /* no white cut-out, no tumble: the body keeps its outline, lights for three frames and is dragged a step toward the orb */
        e.flash=Math.min(e.flash,.22); e.hurtT=0; e.hitT=-9; if(l>460&&!e.d.boss){ const v=(e.d.heavy?160:400)*(1+.1*i); e.kx=(e.kx||0)+dx/l*v; e.ky=(e.ky||0)+dy/l*v; }
        if(th){ kiThread(e.x,e.y,e.h*.6,O,rand(.38,.5),{w:9+1.5*i}); kiThread(e.x,e.y,e.h*.3,O,rand(.45,.6),{w:6+i,delay:.05}); }
        /* the beat lands on the body: a short spray of ki torn off it toward the orb, so each beat reads as a wave of hits running out over the field */
        if(GFX.on&&n<48){ const l3=Math.hypot(O.x-e.x,O.y-e.y)||1; for(let j=0;j<4;j++) GFX.pt({x:e.x,y:e.y,z:e.h*rand(.4,.8),vx:(O.x-e.x)/l3*rand(250,600)+rand(-120,120),vy:(O.y-e.y)/l3*rand(250,600)+rand(-80,80),vz:rand(150,500),g:0,drag:2.5,life:rand(.18,.3),s:rand(3,5),m:3,len:.06,c:GFX.rgb(j?P.s:'#ffffff'),c2:P.b,L:3}); } }); }
    Cn.SND.tick(.7+.1*i,.3); sfx('whoosh',.7+.08*i,.4); Cn.shake(.3+.06*i); }));
  // arcs from the orb to the floor, at no fixed interval, closer together as it grows
  { let at=tA+.4; while(at<tH-.05){ const k=sat((at-tA)/(tH-tA)), a=rand(0,TAU), d=rand(.3,1.1), sgn=Math.random()<.5?1:-1; after(at,()=>{ const r=80+O.r*1.1*d; K.bolt(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY*.8+20,{h:Math.max(220,O.z-O.r*.4),w:(150+190*k)*sgn,pal:P,dur:.18,gain:.6+.3*k,crack:0}); Cn.SND.tick(.8+k*.7,.14); }); at+=rand(.14,.5)*(1-.5*k); } }
  // ---- second stage: the floor gives under it. A ring of dust rolls out, the cracks open and heat up, stones come off the ground, the comets
  // light round the orb and the sky starts to answer
  let hc=null;
  after(tB,()=>{ hc=heatCrack(Qx,Qy,rot,tI-tB,t=>{ const u=sat(t/(tH-tB)); return [300+1000*eo3(u),.95-.6*u*u]; }); Cn.move({zoom:.8,tilt:.22,roll:.04},tH-tB,'in'); GFX.ambient(.2,.25,.54,1.2); SFX.rumble(1.4); sfx('whoosh',.5,.8); Cn.shake(.7);
    K.debris(x0,y0,{n:18,r:420,sp:[120,620],up:1200,size0:10,size:30}); K.dust(x0,y0,{n:14,r:300,sp:[300,900],a:.45,c:'#101624'}); });
  STR.forEach(s=>after(s.t,()=>{ skyBolt(O,s.ang,s.h,300+140*s.k,.36,.8+.4*s.k); GFX.light(O.x,O.y,1000,P.l,.6,.2,{z:O.z}); Cn.SND.tick(1.2+s.k*.6,.2); Cn.shake(.2+.25*s.k); }));
  let t=0, th=0, tm=0, tg=0; V.ultTick=dt=>{ t+=dt; if(t>tI) V.fxK=RT;
    /* what is left gives off motes that climb out of the cracks, fewer each second */
    if(t>tI+.35&&t<tEnd-1&&GFX.on){ tm-=dt; if(tm<=0){ const u=(t-tI-.35)/(tEnd-1.35-tI); tm=mix(.018,.14,u); const a=rand(0,TAU), r=rand(80,1150);
        GFX.pt({x:Qx+Math.cos(a)*r,y:Qy+Math.sin(a)*r*FSY,z:rand(0,40),vx:rand(-30,30),vy:0,vz:rand(160,420),g:0,drag:.4,life:rand(.7,1.1),s:rand(4,7.5),m:3,len:.06,c:GFX.rgb(Math.random()<.3?'#ffffff':P.s),c2:P.b,L:3}); } }
    /* grit and ice grains come off the floor and spiral up into the orb, more of them as it fills */
    if(t>tA-.12&&t<tC&&GFX.on){ tg-=dt; if(tg<=0){ const u=sat((t-tA+.12)/(tC-tA+.12)); tg=mix(.04,.012,u); const a=rand(0,TAU), r=rand(220,900)*(.55+.45*u);
        GFX.pt({x:x0+Math.cos(a)*r,y:y0+Math.sin(a)*r*FSY,z:0,oc:[O.x,O.y,O.z],or:r,oa:a,ow:(1.2+2*u)*(Math.random()<.8?1:-1),ok:r*rand(.5,.8),oz0:0,ob:20,rmin:O.r*.9,life:2,s:rand(2.5,5),m:3,len:.03,c:GFX.rgb(Math.random()<.35?'#cfeaff':'#5a6478'),c2:P.b,L:3,pri:1}); } }
    if(t<.15||t>=tH) return; const g=gro(t), w=sat((t-.15)/.6); Cn.shake(.04+.2*g); th-=dt; if(th>0) return; th=t<tA?mix(.05,.022,w):mix(.06,.022,g);
    /* the threads come faster, thicker and whiter as it grows */
    const L=X.onScreen(300), e=L.length&&t>tA?L[(Math.random()*L.length)|0]:null, sp=1-.4*g, wd=1+1.1*g; if(e) kiThread(e.x+rand(-30,30),e.y,rand(20,e.h),O,rand(.42,.62)*sp,{w:rand(5,8)*wd,white:.2+.4*g});
    const a=rand(0,TAU), r=rand(.55,1.15)*hw; kiThread(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,rand(0,160),O,rand(.5,.75)*sp,{w:rand(4,7)*(t<tA?1.5:wd),white:.2+.4*g}); };
  after(tH,()=>{ Cn.hush(.25); dr.stop(.1); Cn.SND.shing(.7,.5); });
  // ---- the one picture, bottom to top: the light it throws on the floor and its shadow, the stones, the ball (far limb, lit body, veins),
  // the comets round it, the shards and the bodies it throws
  const OB=[{rho:1.4,inc:.45,node:rot,ph:0,t0:tB,dir:1},{rho:1.66,inc:-.6,node:rot+2.1,ph:2.3,t0:tB+.18,dir:-1},{rho:1.9,inc:.22,node:rot+4.2,ph:4.4,t0:tS,dir:1}];
  const BR=BEAT.map(()=>rand(0,TAU));
  GFX.add(tEnd,(k,tt)=>{ const g=orbAt(tt), hot=sat((tt-tH)/(tC-tH)), q=tt-tI, pe=pulse(tt), zp=tt<tH?zap(tt):0, born=sat((tt-.3)/.3), fall=sat((tt-tC)/(tI-tC)), tb=Math.max(0,tt-tB), thh=Math.max(0,tt-tH);
    /* the heart: it beats faster as it fills (a few hundredths of its size, and its light with it) */
    const br=tt>tB&&tt<tH?Math.sin(TAU*(1.6*tb+1.3*tb*tb))*sat(tb*3):0;
    /* the size only ever grows; the beat, the strikes and the heart pulse in light. In the last frames before the blow it is drawn into one point */
    /* (drawn in over about three frames, faster as it goes, then it holds as a point for one frame before it goes off) */
    const cl=sat((tt-(tI-.2))/.14), rc=1-.93*Math.pow(cl,1.6);
    if(tt<tI){ const r=O.r*rc, acc=Math.min(1,sat((tt-.3)/(tA-.3))+g*3); spot.a=born*(.15+.25*acc+.6*g+.4*pe+.5*zp+.3*hot)+1.2*cl; spot.r=300+200*born+180*acc+1500*g+200*pe; spot.z=O.z; spot.x=O.x; spot.y=O.y;
      if(F.on){ const pr=230*born+r*2.5, sh=50*born+r*1.25;
        F.quad(m.glowG,O.x,O.y,pr,pr,0,{...col(P),a:born*(.2+.2*g+.3*pe+.35*zp),gain:1+.2*hot});
        /* its shadow lies under it and a little to the lower right (the light is on its upper left) */
        F.quad(m.dark,O.x+r*.3,O.y+r*.14,sh,sh*.8,0,{a:born*Math.min(.9,.45+.5*g)});
        /* the ring every beat sends out over the floor, at the speed the beat reaches the bodies */
        BEAT.forEach((b,i)=>{ const d=tt-b; if(d<=0||d>.3) return; const u=d/.3, rr=r*.9+2400*d+12000*d*d; F.quad(m.shP,x0,y0,rr,rr,BR[i],{...col(P),a:Math.pow(sat(d/.1),.8)*(1-u)*(1-u)*.9,gain:2}); }); } }
    if(F.on&&F.solids&&F.solids()) for(const c of RK){ let x=c.x, y=c.y, z, f=0; const e=eo3(sat((tt-tB-c.d)/.9)); if(e<=0) continue;
      if(q<0) z=c.z1*(e*.7+.3*sat((tt-tB)/(tH-tB)))+14*Math.sin(tt*2.2+c.v); else { const qq=Math.min(q,c.tl); x+=Math.cos(c.a)*c.sp*qq; y+=Math.sin(c.a)*c.sp*qq*FSY; z=Math.max(0,c.z1+c.vz*qq-1700*qq*qq); f=sat((q-c.tl-.1)/.8); if(f>=1) continue; z-=c.s*.95*f*f; }
      const sp_=q<0?tt*.25:tt*.25+Math.min(q,c.tl)*2.2;
      /* layered, chipped stone with frost on its upper faces and the orb's light in its cracks, brighter as the orb fills; dirt falls off it while it rises */
      /* (a pale frosted top that catches the orb's light, a hard blue rim on the flanks against the dark, strata and chipped lips; the light
         in the cracks is kept low so it reads as seams, not as speckles) */
      F.solid('boulder',c.v,x,y,z+c.s*.3,{M:F.xf({s:c.s,rx:c.ax*sp_*.6,ry:c.ay*sp_*.6}),alb:'#343844',emis:f>0?'#0c2050':P.b,rimC:'#3f9dff',spec:.45,rim:.8,vein:0,heat:0,ero:f*f*.25,bump:.9,tone:.22,clip:q>0?1:0,detail:1,strata:6,edge:.08,ore:0,glow:q<0?.06+.18*g:Math.max(0,.24-q),seed:c.v*7.3+sd,shadow:c.big?[.55,.28,.3*(1-f)]:0});
      if(GFX.on&&q<0&&tt>(c.nd||0)&&e<1){ c.nd=tt+.06; GFX.pt({x:x+rand(-.3,.3)*c.s,y,z:z+c.s*.2,vx:rand(-40,40),vy:0,vz:rand(-80,40),g:2600,drag:.5,life:.45,s:rand(3,6)*(c.s/120+.5),c:GFX.rgb('#3a3448'),b:'alpha',pri:1}); } }
    if(tt<tI){ const r=O.r*rc, rr=r*1.3, wk=g*.25+hot*.5, lit=.5*pe+.6*zp+.12*br, ph=1.1*tt+.8*tb*tb+9*thh*thh;
      if(vok()){
        /* the far limb: a thin burning shell a little larger than the ball, drawn first so the ball covers all of it but the edge */
        VOL.add('orb',O.x,O.y,O.z,{ex:rr*1.06,ey:rr*1.06,ez:rr*1.06,pa:[.8,.05,2.4,1],pb:[.22+.2*g+.8*lit+.4*hot,0,0,.2],dens:3.4*born,gain:1.15,seed:sd2,time:ph*.5,smoke:0,fire:.5,cA:'#04124a',cB:'#0c3cc8',cM:mixh('#1a6cff','#ffe9a0',hot),cC:mixh('#8fd0ff','#ffffff',hot),steps:18,ord:O.y-1});
        /* the ball: a body that takes the light (lit on the upper left, in its own shade below), turning; white-hot when it is squeezed */
        VOL.add('orb',O.x,O.y,O.z,{ex:rr,ey:rr,ez:rr,pa:[.6,.3,2,1],pb:[.1+.05*lit+.28*hot*hot,.2,1.3,0],dens:12*sat(tt/.2),gain:.8+.1*hot,seed:sd,time:ph*1.6,smoke:.45,fire:.55,block:.9,shadow:5,sdist:.3,amb:.03,key:1.7+.5*g+1.2*lit,rim:.6,glow:.25,
          cA:'#061a5a',cB:mixh('#1466e0','#5ab8ff',wk),cM:mixh('#3aa6ff','#e8f8ff',hot),cC:'#ffffff',cS:mixh('#040c2c','#0a2260',wk),cK:mixh('#4f9cff','#b8e4ff',wk),ord:O.y});
        /* the veins of fire over its skin: more of them and hotter as it fills */
        VOL.add('orb',O.x,O.y,O.z,{ex:rr,ey:rr,ez:rr,pa:[.62,.07,mix(3.4,3,g),1],pb:[.7+.2*g+lit+.4*hot,0,0,1],dens:(2.3+1.2*g)*born,gain:.9,seed:sd,time:ph,smoke:0,fire:.5,cA:'#0a2a7a',cB:P.b,cM:P.m,cC:'#ffffff',steps:20,ord:O.y+1});
        /* the squeezing shell: on every beat one thin shell closes in from 1.6 to 1.02 of the ball in .3s, brighter each beat, and sinks in;
           in the squeeze two come one after the other, white */
        let sk=-1, sb=0; BEAT.forEach((b,i)=>{ const d=tt-b; if(d>0&&d<.34){ sk=d/.34; sb=i; } }); if(tt>tH&&tt<tC+.05){ sk=((tt-tH)/.22)%1; sb=BEAT.length; }
        if(sk>=0){ const ex=rr*mix(1.3,1.01,eo3(sk)), sa=sat(sk*6)*(1-sk*sk); VOL.add('orb',O.x,O.y,O.z,{ex,ey:ex,ez:ex,pa:[.86,.035,3,1],pb:[Math.min(.75,.35+.08*sb)*sa,0,0,.4],dens:1.15*sa,gain:1,seed:sd3+sb,time:ph,smoke:0,fire:.5,cA:'#0a2a7a',cB:P.b,cM:mixh(P.m,'#ffffff',sb/BEAT.length),cC:'#ffffff',steps:16,ord:O.y+2}); } }
      else if(F.on) F.bill(m.glowO,O.x,O.y,O.z,r,r,0,{cA:P.d,cB:P.b,cC:P.h,a:born,gain:2});
      if(F.on){
        /* its heart shows through only on a beat, on a strike and when it is squeezed */
        const ca=Math.min(1,.5*pe+.5*zp+.45*hot), cs=r*(.18+.12*ca+.15*hot)+O.r*.34*cl*(1-.6*cl); F.bill(m.glowO,O.x,O.y,O.z,cs,cs,0,{cA:P.b,cB:P.h,cC:'#ffffff',a:born*Math.min(1,.5+.5*g+ca+cl),gain:2+.6*hot+4*cl});
        /* plasma crawling on the near side of its outline: 3..8 short forked arcs, placed afresh every other frame (a hash of the frame
           index, not Math.random per draw), white core over a blue glow; heat shimmer in the air under it */
        if(GFX.on&&tt>tA){ const fr=Math.floor(tt*30), na=3+Math.round(5*Math.max(g,hot)), hs=n=>{ const s=Math.sin(n*12.9898+sd*78.233)*43758.5453; return s-Math.floor(s); };
          for(let j=0;j<na;j++){ const b0=hs(fr*7+j), a0=Math.PI*(1.05+.9*b0), len=.35+.5*hs(fr*7+j+.5); let px=O.x+Math.cos(a0)*r*.98, pz=O.z+Math.sin(a0)*r*.98;
            for(let s=1;s<=5;s++){ const an=a0+(hs(fr+j)<.5?1:-1)*len*s/5, rj=r*(.98+.1*(hs(fr*3+j*5+s)-.4)), nx=O.x+Math.cos(an)*rj, nz=O.z+Math.sin(an)*rj, wv=(1-s/6);
              GFX.line(q3.ln,px,O.y,pz,nx,O.y,nz,7*wv,q3.cm,.5,0,j,-1,0); GFX.line(q3.ln,px,O.y,pz,nx,O.y,nz,2.2*wv,q3.cw,.9,0,j,-1,0); px=nx; pz=nz; } }
          GFX.haze(O.x,O.y,Math.max(40,O.z-r*1.1),r*(.9+.5*g),.35+.5*Math.max(g,hot)); }
        /* where a strike lands on the skin */
        for(const s of STR){ const d=tt-s.t; if(d<0||d>.3) continue; const u=d/.3, sz=r*(.22+.34*Math.sqrt(u)), cx=O.x+Math.sin(s.ang)*r*.95, cz=O.z+Math.cos(s.ang)*r*.95; F.bill(m.glowO,cx,O.y,cz,sz,sz,0,{cA:P.b,cB:P.h,cC:'#ffffff',a:(1-u)*(1-u),gain:3});
          /* the strike runs on over the skin from where it landed: four short forks crawling away round the ball, fading with the afterglow */
          if(GFX.on) for(let j=0;j<4;j++){ const a0=Math.atan2(cz-O.z,cx-O.x), sg=j%2?1:-1, sp_=.12+.1*j+.5*Math.sqrt(u); let px=cx, pz=cz;
            for(let n=1;n<=4;n++){ const an=a0+sg*sp_*n/4, rj=r*(1+.06*Math.sin(n*7.1+j*3+s.t*40)), nx=O.x+Math.cos(an)*rj, nz=O.z+Math.sin(an)*rj, wv=(1-u)*(1-n/5);
              GFX.line(q3.ln,px,O.y,pz,nx,O.y,nz,9*wv,q3.cm,.6,0,j,-1,0); GFX.line(q3.ln,px,O.y,pz,nx,O.y,nz,2.6*wv,q3.cw,.95,0,j,-1,0); px=nx; pz=nz; } } }
        /* the comets: faster and longer all the time; wound tight, nearly closed and golden when it is squeezed */
        if(tt>tB){ const hc_=sm5(hot), C=hc_>0?{cA:mixh(P.d,PG.d,hc_),cB:mixh(P.b,PG.b,hc_),cC:mixh(P.h,PG.h,hc_),cM:mixh(P.m,PG.m,hc_)}:col(P), spd=5+4.4*tb+60*thh, Ph=5*tb+2.2*tb*tb+30*thh*thh;
          for(const o of OB){ const a=sat((tt-o.t0)/.3)*(1-fall*fall); if(a<=0) continue; const R=r*mix(o.rho,1.16+.06*o.ph/4.4,hc_);
            orbitArc(m,O,r*1.02,R,o.inc*(1-.5*hc_),o.node+.3*tt,o.ph+o.dir*Ph,o.dir*Math.min(5.6,.9+.13*spd),r*(.2-.09*hc_),C,2.6+1.2*pe+.3*hc_,a,sd+o.ph);
            const th_=o.ph+o.dir*Ph, cu=Math.cos(o.node+.3*tt), su=Math.sin(o.node+.3*tt), inc=o.inc*(1-.5*hc_), cq=Math.cos(th_), sq=Math.sin(th_), dx=R*(cq*cu-sq*su*Math.cos(inc)), dd=R*(cq*su+sq*cu*Math.cos(inc)), dz=R*sq*Math.sin(inc), sy=dd*FSY-dz;
            if(!(dd*.81+dz*.58<0&&dx*dx+sy*sy<r*r)) F.bill(m.glowO,O.x+dx,O.y+dd*FSY,O.z+dz,r*.13,r*.13,0,{cA:C.cB,cB:C.cC,cC:'#ffffff',a,gain:3}); } }
        if(tt>tC){ const u=sat((tt-tC)/(tI-tC)), hh_=r*(.7+2*u); F.bill(m.glowO,O.x,O.y,O.z+hh_*.8,r*.62,hh_,0,{cA:P.d,cB:P.b,cC:P.m,a:.8*u,gain:1.8}); } } }
    // the brand, drawn small: a glow on the chest and a tongue of ki leaning off the body toward the orb, longer with every beat
    if(tt<tI&&GFX.on){ let n=0; for(const e of X.onScreen(200)){ const h=K.marked(e,'brand'); if(!h) continue; if(n++>=56) break; const kk=Math.max(0,1-(RT-h.kick)/.25), sz=e.z+e.h*.75, dx=O.x-e.x, dy=O.y-e.y, dz=O.z-sz, l=Math.hypot(dx,dy,dz)||1, len=36+24*h.n+60*kk, gs=e.h*(.1+.02*h.n)*(1+1.2*kk);
        /* a small hard point on the chest (it no longer washes the whole body pale - the bodies stay dark enemies, not glowing ghosts) */
        GFX.bill(q3.gl,e.x,e.y,e.z+e.h*.6,gs,gs,0,kk>.5?q3.cw:q3.cl,.18+.6*kk); GFX.line(q3.ln,e.x,e.y,sz,e.x+dx/l*len,e.y+dy/l*len,sz+dz/l*len,3.5+h.n,q3.cm,.65,0,e.x,1,0); } }
    // the shards of the shell: white-hot and turning in the air, then standing in the floor where they came down, cooling white -> blue -> dark, and at last crumbling
    if(q>0&&F.on&&F.solids&&F.solids()) for(const c of SH){ const fly=q<c.T, u=sat(q/c.T), hk=fly?0:sat((q-c.T)/(tEnd-tI-c.T-.25)), H=K.heat(P,.22+.78*hk), f=sat((q-c.B)/.3), pc=fly?0:sat((q-c.B+.16)/.16)*(1-f);
      if(f>=1) continue;
      const x=fly?mix(Qx,c.x,u):c.x, y=fly?mix(Qy,c.y,u):c.y, z=fly?200*(1-u)+c.hp*4*u*(1-u):-c.s*.16*sat((q-c.T)/.05);
      /* the turn in the air stays within half a radian of upright so no frame shows a shard lying flat like a plank */
      /* (thick-bodied, not a wedge: the air behind a standing shard bends while it is still cold-bright) */
      if(!fly&&GFX.on&&hk<.85) GFX.haze(x,y,c.s*.55,c.s*.42,.5*(1-hk));
      F.solid('crystal',c.v,x,y,z,{M:F.xf({sx:c.s*1.75,sy:c.s*1.75,sz:c.s*1.2,rx:fly?.5*Math.sin(c.ax*q):c.lean,ry:fly?.5*Math.sin(c.ay*q):c.lean*.6,rz:fly?c.tw+c.ax*q:c.tw}),alb:mixh('#3a78c8','#1a2a4a',hk),emis:H.cB,rimC:H.cM,spec:.9,rim:.8*(1-hk)+.2,vein:.3*(1-hk)+.9*pc,heat:(fly?.32:.85)*(1-hk)*(1-hk)+.5*pc,ero:f*.9,bump:1.2,tone:.2,clip:fly?0:1,shadow:c.v<4?[.55,.28,.32*(1-f)]:0});
      /* it cracks (light runs into its seams), then breaks: chips of ice jump off it, a cold puff rolls round its foot and it falls in */
      if(!fly&&f>0&&!c.br&&GFX.on){ c.br=1; Cn.SND.tick(1.6,.08); for(let i=0;i<9;i++) GFX.pt({x:x+rand(-.25,.25)*c.s,y:y+rand(-20,20),z:rand(.15,.9)*c.s,vx:rand(-260,260),vy:rand(-160,160),vz:rand(150,560),g:2200,drag:.6,life:rand(.4,.7),s:rand(3,6.5),m:3,len:.03,c:GFX.rgb(i<3?'#e8f6ff':'#5a8cc8'),c2:P.b,L:3,pri:1});
        for(let i=0;i<5;i++){ const a=i/5*TAU+rand(0,.6); GFX.pt({x:x+Math.cos(a)*20,y:y+Math.sin(a)*20*FSY,z:c.s*.15,vx:Math.cos(a)*rand(90,200),vy:Math.sin(a)*rand(90,200)*FSY,vz:rand(20,90),g:0,drag:2,life:rand(.7,1),s:rand(22,36),grow:30,c:GFX.rgb('#7c94b4'),a:.2,b:'alpha',fk:1.4,pri:1}); } }
      if(fly&&GFX.on){ const u0=Math.max(0,u-.09); GFX.line(q3.ln,mix(Qx,c.x,u0),mix(Qy,c.y,u0),200*(1-u0)+c.hp*4*u0*(1-u0)+c.s*.4,x,y,z+c.s*.4,c.s*.045,q3.cm,.55,0,c.v,1,0); } }
    // the thrown bodies: each is flung outward turning, trails sparks, and goes up in its own blue-white flash and a spray of splinters
    if(q>0&&GFX.on) for(const d of V.dying){ if(!d.k3){ d.k3=1; if(d.vx==null){ const dx=d.e.x-Qx, dy=d.e.y-Qy, l=Math.hypot(dx,dy)||1, sp=rand(800,1500)*(d.e.d.heavy?.45:1); d.vx=dx/l*sp; d.vy=dy/l*sp*.7; d.vz=rand(700,1250); d.spin=rand(-9,9); } d.life=rand(.5,.75); d.nt=0; }
      const u=sat(d.t/d.life), x=d.e.x+d.vx*d.t, y=d.e.y+d.vy*d.t, z=Math.max(0,d.vz*d.t-1400*d.t*d.t)+70, sz=70+40*u; GFX.bill(q3.gl,x,y,z,sz,sz,0,q3.cl,.4*(1-u*u)); GFX.line(q3.ln,x-d.vx*.14,y-d.vy*.14,Math.max(0,z-(d.vz-2800*d.t)*.14),x,y,z,16,q3.cm,.8*(1-u),0,d.e.x,1,0);
      if(d.t>d.nt){ d.nt=d.t+.045; GFX.pt({x:x+rand(-20,20),y,z:z+rand(-30,50),vx:-d.vx*.15,vy:-d.vy*.15,vz:rand(-60,160),g:500,drag:2,life:rand(.25,.45),s:rand(3,5),m:3,len:.05,c:GFX.rgb(P.s),c2:P.b,L:3}); }
      if(u>.72&&!d.k4){ d.k4=1; const l=Math.hypot(d.vx,d.vy)||1; d.fx=x; d.fy=y; d.fz=z; d.ft=d.t;
        for(let i=0;i<9;i++) GFX.pt({x:x+rand(-20,20),y,z:z+rand(-40,60),vx:d.vx/l*rand(200,900)+rand(-420,420),vy:d.vy/l*rand(200,900)*.7+rand(-240,240),vz:rand(100,800),g:1400,drag:2.2,life:rand(.35,.7),s:rand(3.5,6.5),m:3,len:.07,c:GFX.rgb(i<3?'#ffffff':P.s),c2:P.b,L:3}); }
      if(d.k4){ const w=sat((d.t-d.ft)/.12), fs=50+110*eo3(w); GFX.bill(q3.gl,d.fx,d.fy,d.fz,fs,fs,0,w<.35?q3.cw:q3.cl,.8*(1-w)*(1-w)); } } });
  // ---- climax: he brings it down; contact is one frame
  after(tC,()=>{ S([['gy13',.5],['gy14',.4],['gy15',.4],['gy16',9]]); if(window.MK&&MK.on&&MK.on()) MK.play('fChanA',{speed:3,blend:.05}); sfx('whoosh',.5,1); Cn.SND.inhale(tI-tC,.5); });
  after(tI,()=>{ const life=tEnd-tI+.7, LN=[]; spot.hold=0; spot.life=.2; if(hc) hc.dead=true;
    K.cool(Qx,Qy,{kind:'crater',r:640,pal:P,life,grow:.08,light:0}); K.cool(Qx,Qy,{kind:'crack',r:1500,rot,pal:P,life,hot:.8,grow:.16,gain:2,light:0}); K.cool(Qx,Qy,{kind:'lava',r:310,pal:P,life,hot:.8,grow:.2,gain:1.4,light:0});
    /* the blue left in the cracks lights the floor and goes down slowly (white -> blue -> out over a second and a half), so the picture
       does not drop from the burst to dark cracks in half a second */
    GFX.light(Qx,Qy,hw*1.1,P.l,.75,1.7,{z:90});
    // in order: a hard white heart for three frames, then a shock sphere (a thin bright shell) thrown out fast and slowing, then the floor
    // under it sinks into a dark bowl
    if(F.on) GFX.add(.14,(kk,bt)=>{ const s=150+380*eo3(kk); F.bill(m.glowO,Qx,Qy,230,s,s*.9,0,{cA:"#bfe6ff",cB:"#ffffff",cC:"#ffffff",a:Math.pow(1-kk,1.2),gain:5,ord:Qy+9}); });
    if(vok()) GFX.add(.5,(kk,bt)=>{ const e=1-Math.pow(1-kk,3), R=140+1150*e, sa=sat(bt/.03)*Math.pow(1-kk,1.3); VOL.add('orb',Qx,Qy,200+R*.25,{ex:R,ey:R,ez:R*.75,pa:[.88,.03+.02*kk,3,1],pb:[1.4*sa,0,0,.4],dens:2.4*sa,gain:1.3,seed:sd2+3,time:bt*4,smoke:0,fire:.5,cA:'#04124a',cB:P.b,cM:mixh('#ffffff',P.m,kk),cC:'#ffffff',steps:16,ord:Qy+3}); });
    if(F.on) GFX.add(.9,kk=>{ const e=eo3(sat(kk/.35)), rr=120+560*e; F.quad(m.dark,Qx,Qy,rr,rr*.86,rot,{a:.75*sat(kk/.08)*(1-sat((kk-.6)/.4))}); });
    // the burst, in layers. On the floor: a dark roll of dust and smoke running out to the edges of the picture, and a thin hard ring ahead
    // of it. The body: a ball of fire that only grows - white at the heart for two frames, then blue fire in a dark crust, torn open and
    // eaten away as it climbs. The whole picture is not lit by it: the field goes darker so the fire has an edge.
    if(vok()){ GFX.add(.95,(kk,bt)=>{ const gg=eo5(sat(bt/.16)), cool=sat((bt-.08)/.6), fd=sat((bt-.3)/.65);
        VOL.add('blast',Qx,Qy,240+700*kk*kk,{ex:840,ey:840,ez:780,pa:[.36+.44*gg+.16*kk,.5+.55*fd,2.2+.9*fd,Math.min(.6,bt*.9)],pb:[2*Math.pow(1-cool,1.3),1.8,1,.35+.5*kk],dens:13*Math.pow(1-fd,1.5),gain:1.1,seed:sd3,smoke:sat(bt/.1),fire:.65,cA:'#12409a',cB:P.b,cM:P.m,cC:'#ffffff',cS:'#04060c',cK:'#3c4c6e',amb:.14,key:1.1,rim:.7,glow:.5*sat(1-bt/.05),shadow:4}); });
 }
    K.flare(Qx,Qy,220,{pal:P,s:460,dur:.1,gain:2.6});
    /* the shock ring is a rolling band of ice and dust with an uneven edge, not a drawn line; the faint light on the floor inside it stays */
    /* (lumpy and lit from above: pale tops, dark undersides, the swirl visible in it; it runs out fast, slows and thins) */
    K.vring(Qx,Qy,{r:hw*1.25,dur:.8,tube:.11,c:'#04070e',c2:'#4a6894',a:.7,lit:.6,flow:1.2,lump:.9,freq:3.6});
    if(F.on){ const rr0=rand(0,TAU); GFX.add(.42,kk=>{ const e=eo3(kk), rr=420+hw*1.6*e; F.quad(m.shP,Qx,Qy,rr*.8,rr*.8,rr0+2,{...col(P),a:(1-kk)*(1-kk)*.3,gain:1.3}); }); }
    // the discharge: eight arcs over the floor to the edges of the picture, no two at the same angle or length
    for(let i=0;i<8;i++){ const a=(i+rand(.15,.85))/8*TAU, len=hw*rand(.8,1.3), fa_=fa(a), Lf=fl(a,len), p=rand(0,9), fp=Math.random()<.5?-1:1; LN.push([fa_,360+p*22,260+Lf*.92]);
      if(i%3!==2) K.coolLine(Qx+Math.cos(fa_)*(360+p*22),Qy+Math.sin(fa_)*(360+p*22)*FSY,Qx+Math.cos(fa_)*(260+Lf*.92),Qy+Math.sin(fa_)*(260+Lf*.92)*FSY,{w:rand(30,72),pal:P,life:life-.3,hot:.24+.04*i,grow:.14,gain:1.3});
      GFX.add(.34,kk=>{ const e=eo3(sat(kk/.3)), fr=kk<.3?0:kk<.6?1:2, hl=Lf*e/2, d=260+hl; GFX.floor(q3.arc,Qx+Math.cos(fa_)*d,Qy+Math.sin(fa_)*d*FSY,hl,hl*.22*(fr===1?-fp:fp),fa_,fr===1?q3.cm:q3.cw,fr===1?.6:1-sat((kk-.6)/.4),sat((kk-.6)/.4)*.7,p+fr,1,0); }); }
    // and it answers out of the air: tall strikes round the blast, each a short double tap (strike, a frame dark, a weaker strike) and gone
    [[.6,760,1500,.05],[2.1,1050,1250,.12],[3.3,680,1700,.18],[4.4,1180,1300,.24],[5.5,900,1450,.31]].forEach(([a,r,h_,d])=>{ const bx=Qx+Math.cos(a+rot)*r, by=Qy+Math.sin(a+rot)*r*FSY;
      K.bolt(bx,by,{h:h_,w:h_*.3,pal:P,dur:.11,gain:1,crack:0,delay:d}); K.bolt(bx,by,{h:h_*.9,w:h_*.26,pal:P,dur:.09,gain:.6,crack:0,delay:d+.15}); });
    // what is left of the current runs OUT along the cracks, one crack at a time: five links lit one after another from the pool to the far
    // end, a spark where it runs out. Fewer runs, further apart and weaker each time; the last ones are only short static jumping off the crater's lip
    [[.34,0],[.46,3],[.6,5],[.78,1],[.98,6],[1.16,2],[1.32,4]].forEach(([at,li],pi)=>{ const pw=1-.55*pi/7, c=LN[li], fp0=pi%2?1:-1, nl=pi<3?5:2, sl=pi<3?1:.45; for(let j=0;j<nl;j++) after(at,()=>{ const d=mix(c[1],c[2],(j+.5)/5*sl), hl=(c[2]-c[1])/5*.62*sl, x=Qx+Math.cos(c[0])*d, y=Qy+Math.sin(c[0])*d*FSY, fp=j%2?fp0:-fp0, p=rand(0,9);
        GFX.add(.17,kk=>{ const fr=kk<.35?0:kk<.65?1:2; GFX.floor(q3.arc,x,y,hl,hl*.34*(fr===1?-fp:fp),c[0],fr===1?q3.cm:q3.cw,(fr===1?.6:1-sat((kk-.65)/.35))*(.45+.55*pw),sat((kk-.65)/.35)*.7,p+fr,1,0); });
        if(j===0) Cn.SND.tick(1.3,.12*pw); if(j===nl-1){ GFX.light(x,y,560,P.l,.55*pw,.24,{z:60}); K.sparks(x,y,20,{pal:P,n:6,sp:[200,700],up:700,life:[.2,.45]}); } }); });
    // each shard strikes the floor where it comes down
    for(const c of SH) after(c.T,()=>{ GFX.light(c.x,c.y,520,P.l,.6,.25,{z:80}); K.sparks(c.x,c.y,30,{pal:P,n:9,sp:[250,900],up:900,life:[.2,.5]}); K.dust(c.x,c.y,{n:4,r:40,sp:[150,420],a:.4,c:'#101624'});
      /* a low breath of frost runs out round its foot and settles, and chips of ice jump */
      for(let i=0;i<10;i++){ const a=i/10*TAU+rand(0,.5); GFX.pt({x:c.x+Math.cos(a)*30,y:c.y+Math.sin(a)*30*FSY,z:10,vx:Math.cos(a)*rand(140,300),vy:Math.sin(a)*rand(140,300)*FSY,vz:rand(10,50),g:0,drag:2.2,life:rand(.9,1.3),s:rand(26,44),grow:40,c:GFX.rgb('#a8c8e8'),a:.22,b:'alpha',fk:1.4,pri:1}); }
      for(let i=0;i<5;i++) GFX.pt({x:c.x,y:c.y,z:c.s*.3,vx:rand(-300,300),vy:rand(-200,200),vz:rand(300,700),g:2400,drag:.5,life:.5,s:rand(3,6),m:3,len:.03,c:GFX.rgb('#e8f6ff'),c2:P.b,L:3,pri:1}); Cn.shake(.16); Cn.SND.tick(.6,.16); });
    K.sparks(Qx,Qy,80,{pal:P,n:40,sp:[600,2400],up:1700,life:[.3,.8]}); K.debris(Qx,Qy,{n:24,r:220,sp:[300,1400],up:1900,size0:12,size:38}); K.debris(Qx,Qy,{n:16,r:500,sp:[150,700],up:3000,size0:8,size:22}); K.dust(Qx,Qy,{n:22,r:160,sp:[500,1600],a:.55,c:'#101624'});
    // one frame at full exposure, then it drops at once so the ring, the arcs and the bodies read
    /* the point it was drawn into goes off white and the picture stops for two frames; only then the blur, the colour split and the pull-back */
    Cn.peak(Qx,Qy-BODY*.5,{ca:.008,blur:0,tint:'#eaf6ff',a:.3,hold:.03,out:.04}); hitstop=Math.max(hitstop,.05); after(.05,()=>{ Cn.peak(Qx,Qy-BODY*.5,{ca:.03,blur:.1,tint:'#40c0ff',a:.2,hold:.02,out:.13}); Cn.move({x:Qx,y:Qy-BODY*.4,zoom:.6,tilt:.2,roll:0},.2,'out'); }); Cn.shake(1.8); GFX.light(Qx,Qy,hw*1.3,P.l,1,.3,{z:260}); Cn.SND.hit(1); SFX.boom(1.8,1);
    GFX.ambient(.2,.25,.46,30);
    // every brand goes off at once: the six nearest with the whole burst, the rest with one cheap flash each (the kit's burst on a hundred bodies is hundreds of draws)
    { const ML=V.en.filter(e=>!e.dead&&K.marked(e,'brand')).sort((a,b)=>Math.hypot(a.x-Qx,a.y-Qy)-Math.hypot(b.x-Qx,b.y-Qy)), FL=[];
      ML.forEach((e,i)=>{ const h=K.marked(e,'brand'), n=h.n; if(i<3) h.pop({pw:.5}); else { h.end(); if(FL.length<60) FL.push(e); } dmg(e,e.d.boss?Dm*.015*n:Math.min(Dm*.015*n,e.hp*.5),{crit:true,sx:Qx,sy:Qy}); });
      if(GFX.on&&FL.length) GFX.add(.14,kk=>{ const g=.5+eo3(kk), a=(1-kk)*(1-kk); for(const e of FL){ const sz=e.h*.4*g; GFX.bill(q3.gl,e.x,e.y,e.z+e.h*.55,sz,sz,0,kk<.3?q3.cw:q3.cl,a); } }); }
    for(const e of X.onScreen(300)){ K.knock(e,{from:[Qx,Qy],dist:500,up:1800}); const dx=e.x-Qx, dy=e.y-Qy, l=Math.hypot(dx,dy)||1; thrown(e,P,dx/l,dy/l,0); } });
  after(tK,()=>Cn.sweep(Qx,Qy,Dm,{speed:9000,max:.2}));
  // ---- what is left: the fire is eaten away, the shards come down, the current runs out along the cracks, the light comes back
  after(tI+.55,()=>GFX.ambient(.56,.62,.78,1.6));
  after(tEnd-1.05,()=>{ Cn.back(1); GFX.ambient(.86,.88,.94,1.6); });
  after(tEnd,ultStop); }

X.reg('fist',{sk,order,basic:{fn:basic,cd:()=>.5*(1-.05*(L('fs_basic')-1))},skills:SKILL,ults:{fs_ult1:ultBeam,fs_ult2:ultMeteor,fs_ult3:ultSphere}});
})();
