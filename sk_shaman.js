// 참광 survival - SHAMAN skill set (top-down, all automatic). Jade spirits, seals and falling stone. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js) plus a few local pieces (LM materials, card, stone, spike, soul, palmFall, gif).
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,sfx,view,onScreen,ultStart,ultStop,ultHit,heal}=X;
const K=K3, F=FX3, P='jade', PJ=K3.PAL.jade, C={cA:PJ.d,cB:PJ.b,cC:PJ.h}, {sat,mix,eo3,eo5}=K3;
const SP={d:'#02281c',b:'#10b07c',h:'#8dffd6',l:'#30ffb0',s:'#b8ffe0'};
const GD={d:'#3a1c00',b:'#f0a818',h:'#ffe9a0',l:'#ffc040',s:'#ffe9a0'};
const HEAL={d:'#04280c',b:'#3cf07a',h:'#f2ffe8',l:'#55ff9a',s:'#c8ffd0'};
const C1='#3dffb0';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const fling=b=>S([['gb03',.04],['gb04',.05],['gb05',.06,{kick:[-.9,.7]}],['gb06',.05,{kick:[1.4,-1]}],['gb07',.08],['gb09',.07],['gb12',.05]],b);
const raise=()=>S([['gx04',.08,{kick:[-.8,.6]}],['gx07',.25],['gx11',.1,{kick:[-1,.8]}],['gx12',.08,{kick:[2,-1.6]}],['gx13',.25],['gx14',.1]]);
const pray=()=>S([['gy02',.1],['gy04',.35],['gy06',.08,{kick:[-.8,.6]}],['gy08',.3],['gy11',.1,{kick:[1.6,-1.2]}],['gy12',.2],['gy14',.1]]);
const SEAL=()=>F.ready('v3_circ_shaman')?'v3_circ_shaman':'fx_circle_seal';

// ============================================================ local kit (candidates for vfx3.js)
// materials: painted art pushed through the jade ramp
let LM_=null;
function LM(){ if(LM_) return LM_; const m=F.mat, b=K.mats();
  LM_={
    // the painted boulder: dark rock, jade-lit faces, veins of spirit light where the painting is hot
    stone:m({tex:'meteor',msk:[.55,.35,0,.22],nz:'fbm',n1:[2.2,2.2,0,0],nk:0,ero:.07,soft:.1,cA:'#030807',cB:'#27413b',cC:'#3dffb0',rk:[.62,1.15],gain:1.7,op:1}),
    // the same boulder sunk into the floor: only its upper part, the cut edge faded into the rubble
    sunk:m({tex:'meteor',msk:[.55,.35,0,.22],uvT:[1,.74,0,.26],nz:'fbm',n1:[2.2,2.2,0,0],nk:0,ero:.07,soft:.1,fd:[0,0,.16,0],ord:-2,cA:'#030807',cB:'#27413b',cC:'#3dffb0',rk:[.62,1.15],gain:1.7,op:1}),
    // a small sealing mark on the floor where something is about to land
    mark:m({...b.sig,tex:'fx_circle_seal'}),
    // the tip of the painted crystal as a spike of jade
    spike:m({tex:'crystal',msk:[.3,.3,.3,.25],uvT:[1,.46,0,.54],nz:'fbm',n1:[2,2,0,0],nk:0,ero:.1,soft:.12,fd:[0,0,.16,0],cA:'#03140f',cB:'#17b888',cC:'#e6fff4',rk:[.62,1.1],gain:1.8,op:1}),
    // one talisman banner cut out of the sealing circle drawing, and the dark paper behind it
    charm:m({tex:'v3_circ_shaman',uvT:[.118,.224,.441,.719],nk:0,ero:.15,soft:.3,cA:GD.d,cB:GD.b,cC:GD.h,rk:[.6,1.5],gain:1.2,bgain:1.05}),
    back:m({nz:'fbm',n1:[2,2,0,.3],nk:.35,ero:.02,soft:.2,fd:[.14,.14,.07,.07],cA:'#120600',cB:'#2a0c04',cC:'#5a1408',rk:[.5,1],op:1}),
    fire:m({...b.art,tex:'fx3_fire',layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.09,mdist:1,rk:[.55,1.05]}),
    palm:m({kind:2,tex:'palm',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#78e0cc',cC:PJ.b,gain:.9,op:1}),
    // the hand's print: the painting as a mask, filled with veins of light that cool
    print:m({tex:'palm',msk:[.5,.5,0,0],nz:'fbm',n1:[3,3,.02,.03],n2:[2,2,.01,0],dist:.015,nk:.25,pw:1.8,ero:.12,soft:.25,cA:PJ.d,cB:PJ.b,cC:PJ.h,rk:[.6,1.1],gain:1.8,bgain:1,layer:'g'}),
    printD:m({tex:'palm',msk:[0,0,0,1],nk:0,ero:.2,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
    king:m({kind:2,tex:'deity',nz:'fbm',n1:[1.1,1.1,0,.06],cB:'#b0f0d4',cC:PJ.b,gain:1,op:1,ord:-5}),
  }; return LM_; }
// CARD: a paper talisman standing in the air (call every frame it is alive)
function card(x,y,z,s,rot,a=1,g=1){ const m=LM(); F.bill(m.back,x,y,z,s*.5,s,rot,{a:a*.85}); F.bill(m.charm,x,y,z,s*.52,s,rot,{a,gain:1.2*g}); }
// POP: a small jade hit (needles, sparks, a breath of light on the floor)
function pop(x,y,s=1,z=BODY*.5){ K.art(x,y,{tex:'v3_xburst',s:95*s,z:z-70*s,dur:.2,pal:P,gain:.9,hold:.2,s0:.5}); K.sparks(x,y,z,{pal:P,n:Math.round(6*s),sp:[250,800],up:300,life:[.15,.35]}); GFX.light(x,y,280*s,PJ.l,.6,.25); }
// STONE: the painted boulder falling out of the sky along a slanted path, dragging a ribbon of spirit light, its shadow and a ring closing under it.
//  o: {s (half size), h0, dur, vx (sideways start offset), delay, stay (seconds it stays in the ground)}; returns a handle {crumble()}
function stone(x,y,o={}){ const s=o.s||110, h0=o.h0||2200, dur=o.dur||.42, vx=o.vx??-h0*.22, r0=rand(0,TAU), vr=rand(-2.5,2.5), sd=rand(0,9), d0=o.delay||0, fl=Math.random()<.5, h={x,y,s,t1:-1,fd:o.fd||.4,dead:false,crumble(){ if(h.t1<0) h.t1=RT; }};
  if(!F.on) return h; const m=LM(), b=K.mats(), lead=o.lead??.3;
  // the mark writes itself a moment before the stone is seen
  GFX.add(lead+dur,(k,t)=>{ const i=sat(t/(lead+dur*.5)), e=sat((t-lead)/dur); F.quad(b.dark,x,y,s*(1.2+e*1.1),s*(1.2+e*1.1),0,{a:.2+.5*e*e});
    F.quad(m.mark,x,y,s*2.1,s*2.1,t*1.6+sd,{cA:PJ.d,cB:PJ.b,cC:SP.h,a:.35+.65*e,gain:1.1+e,rv:[i*1.5,.25,0,.1]}); },Math.max(0,d0-lead));
  GFX.add(dur,k=>{ const e=k*k, z=h0*(1-e)+s*.8, px=x+vx*(1-e), pts=[];
    for(let i=5;i>=0;i--){ const kk=Math.max(0,k-i*.08), ee=kk*kk; pts.push({x:x+vx*(1-ee),y,z:h0*(1-ee)+s*.8,w:s*(1-i*.16)}); }
    F.ribbon(b.trB,pts,{...C,gain:1.8,a:.8,t0:sd});
    F.bill(m.stone,px,y,z,s,s,r0+vr*k,{t0:sd}); },d0);
  if(o.stay) GFX.add(o.stay,(k,t)=>{ if(h.dead) return; const f=h.t1<0?0:sat((RT-h.t1)/h.fd); if(f>=1){ h.dead=true; return; }
    const sq=1+.16*Math.exp(-t*16), hh=s*.74*(2-sq);
    F.quad(b.dark,x,y,s*1.5,s*1.5,0,{a:.7*(1-f)});
    F.bill(m.sunk,x,y,hh*.96,s*sq,hh,0,{ero:.07+f*.95,gain:1.7+f*3+(o.hot?.9*sat(t/1.1):0),uvT:fl?[-1,.74,1,.26]:null,t0:sd}); },d0+dur);
  return h; }
// SPIKE: a jade shard punching up out of the floor, holding, then sinking back as it burns out
function spike(x,y,o={}){ if(!F.on) return; const m=LM(), b=K.mats(), s=o.s||170, dur=o.dur||.7, lean=o.lean||0, sd=rand(0,9);
  GFX.add(dur,(k,t)=>{ const up=eo5(sat(t/.07)), f=sat((k-.55)/.45), hh=s*up*(1-f*.5), a=1-f*f;
    F.quad(b.glowG,x,y,s*.7,s*.7,0,{...C,a:.8*a,gain:1.2});
    F.bill(m.spike,x+lean*hh*.4,y,hh*.98,s*.34,hh,lean,{a,ero:.1+f*.7,nk:f*.7,t0:sd}); },o.delay||0); }
// SOUL: a spirit flame hanging in the air at (x,y,z) (call every frame)
function soul(x,y,z,s,rot,sd,a=1){ const m=LM(), b=K.mats(); F.quad(b.glowG,x,y,s*.9,s*.9,0,{...C,a:.55*a,gain:1.1});
  F.bill(m.fire,x,y,z+s*.55,s*.58,s,rot,{...C,a,gain:2.6,ero:.12,nk:.4,t0:sd,pm:[4,.5,.004,0]});
  F.bill(b.glowO,x,y,z,s*.3,s*.3,0,{...C,a:.9*a,gain:2.4}); }
// PALM: the spirit hand comes down out of the sky facing us, tips forward and slaps flat onto the floor; it presses, burns away, and leaves its print.
//  o: {s (half length), fall, hold, out, h0, ox (sideways start offset), rz (turn on the floor), delay, scar (seconds the print glows)}
function palmFall(x,y,o={}){ if(!F.on) return; const m=LM(), b=K.mats(), Ln=o.s||420, Wd=Ln*.53, fall=o.fall??.36, hold=o.hold??.14, out=o.out??.34, h0=o.h0||1700, ox=o.ox||0, sd=rand(0,9), d0=o.delay||0, rz=o.rz||0;
  GFX.add(fall+hold+out,(k,t)=>{ const q=sat(t/fall), e=q*q*q, z=h0*(1-e)+12, tip=sat((q-.5)/.5), lean=-1.05*(1-tip*tip), px=x+ox*(1-e), f=sat((t-fall-hold)/out), pr=t>fall?1+.07*Math.exp(-(t-fall)*22):1+.14*(1-q);
    F.quad(b.dark,x,y,Wd*(.8+1*q),Ln*(.8+.7*q),rz,{a:(.15+.5*q)*(1-f)});
    if(q<1) F.ribbon(b.trB,[{x:px,y,z:z+Ln*3.2,w:Wd*.2},{x:px,y,z:z+Ln*2,w:Wd*.6},{x:px,y,z:z+Ln*.3,w:Wd*.8}],{...C,gain:1.5,a:.55*q,t0:sd});
    F.quad(m.palm,px,y,Wd*pr,Ln*pr,0,{z,M:F.xfw({sx:Wd*pr,sy:Ln*pr,rx:lean,rz}),a:.97,ero:f*1.05-.05,soft:.08,t0:sd}); },d0);
  GFX.add(o.scar||4,(k,t)=>{ const i=sat(t/.08), heat=Math.pow(1-k,1.5);
    F.quad(m.printD,x,y,Wd*1.04,Ln*1.04,rz,{a:.55*i*sat((1-k)/.5)});
    F.quad(m.print,x,y,Wd,Ln,rz,{a:Math.min(1,heat*1.6)*i,gain:1.8*(.3+.7*heat),ero:.13+k*.62,t0:sd}); },d0+fall); }
// GIF: one of the old painted effect loops drawn as a lit sprite in the effect layer (so it blooms and sits with the kit pieces)
const GS=new Map();
function gif(name,t,x,y,z,hw,rot,fy=1,a=1){ const M=VFX[name]; if(!M) return false; const f=M.f[Math.floor(t*1000/M.ms)%M.n]; if(!f||!f.ok) return false;
  let st=GS.get(f.im); if(!st){ st=GFX.st(0,'alpha',{t:f.im,uv01:true,L:1}); GS.set(f.im,st); }
  GFX.bill(st,x,y,z,hw,hw*M.h/M.w*fy,rot,[1.25,1.25,1.25],a,0,0,1,0); return true; }

// a talisman thrown from the hand that homes in on a target
function talisman(e,d,o={}){ const a=angTo(e)+rand(-.6,.6);
  const p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.6,d,r:o.r??70,home:e,turn:9,c:C1,h:BODY*1.1,pw:1.1,...o};
  if(!p.onHit) p.onHit=(e,p)=>pop(p.x,p.y,o.big?1.4:.75,p.h);
  const s=o.big?78:44, sd=rand(0,9), b=K.mats();
  if(F.on) GFX.add(p.life+.05,()=>{ if(p.life<=0) return; const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, rot=Math.atan2(uy,ux)+Math.PI/2, tl=o.big?260:190;
    F.ribbon(b.trB,[{x:p.x-ux*tl,y:p.y-uy*tl,z:p.h,w:s*.1},{x:p.x-ux*tl*.5,y:p.y-uy*tl*.5,z:p.h,w:s*.42},{x:p.x,y:p.y,z:p.h,w:s*.5}],{...C,gain:2,a:.8,t0:sd});
    F.quad(b.glowG,p.x,p.y,s*1.5,s*1.5,0,{...C,a:.5,gain:1});
    card(p.x,p.y,p.h,s,rot);
    if(Math.random()<.35) GFX.pt({x:p.x,y:p.y,z:p.h+rand(-20,20),vx:rand(-60,60),vy:rand(-40,40),vz:rand(20,120),g:-30,drag:.6,life:rand(.3,.6),s:rand(2.5,5),m:8,c:GFX.rgb(PJ.s),fade:'in',L:3}); });
  V.pj.push(p); return p; }

const sk={
  sh_basic:{cls:'shaman',type:'basic',name:'탈리스만',lv:1,desc:'적을 쫓아가는 부적 두 장을 던진다. 강화할수록 부적이 늘어난다.'},
  sh_bomb:{cls:'shaman',type:'skill',name:'카드 봄',lv:1,cd:4,dmg:3000,desc:'적이 몰린 곳에 큰 부적을 붙여 잠시 뒤 터뜨린다.',evo:'폭발이 두 번 일어난다.'},
  sh_spike:{cls:'shaman',type:'skill',name:'스톤 스파이크',lv:1,cd:5,dmg:2400,desc:'땅에서 바위 가시를 일직선으로 솟구치게 해 적을 띄운다.',evo:'가시 줄이 세 갈래가 된다.'},
  sh_wisp:{cls:'shaman',type:'skill',name:'스피릿 오브',lv:2,cd:9,dmg:800,desc:'영혼 불꽃 4개가 5초 동안 주위를 돌며 닿는 적을 태운다.',evo:'영혼 불꽃이 6개가 된다.'},
  sh_heal:{cls:'shaman',type:'skill',name:'힐링 서클',lv:3,cd:14,dmg:600,desc:'3초 동안 체력을 25% 회복하는 결계를 펼치고, 안의 적에게 피해를 준다.',evo:'회복량이 40%가 된다.'},
  sh_rock:{cls:'shaman',type:'skill',name:'록 폴',lv:5,cd:8,dmg:3600,desc:'적 머리 위로 큰 바위 4개를 떨어뜨린다.',evo:'바위가 7개가 된다.'},
  sh_seal:{cls:'shaman',type:'skill',name:'바인드',lv:6,cd:10,dmg:1500,desc:'적이 몰린 곳에 봉인진을 펼쳐 안의 적을 2.5초 동안 묶는다.',evo:'봉인진이 커지고 묶인 적이 계속 피해를 받는다.'},
  sh_wolf:{cls:'shaman',type:'skill',name:'스피릿 울프',lv:8,cd:10,dmg:2000,desc:'영혼 늑대 두 마리를 풀어 적을 꿰뚫으며 달리게 한다.',evo:'늑대가 네 마리가 된다.'},
  sh_palm:{cls:'shaman',type:'skill',name:'스피릿 핸드',lv:10,cd:11,dmg:7000,desc:'하늘에서 거대한 영혼의 손바닥을 내려쳐 적 무리를 짓누른다.',evo:'손바닥이 두 번 내려친다.'},
  sh_ult1:{cls:'shaman',type:'ult',name:'스톤 레인',lv:3,desc:'궁극기. 하늘을 열어 화면 전체에 바위를 쏟아붓는다.'},
  sh_ult2:{cls:'shaman',type:'ult',name:'스피릿 킹',lv:12,desc:'궁극기. 거대한 영혼의 손이 연달아 내려쳐 화면을 쓸어버린다.'},
};
const order=Object.keys(sk);

function basic(){ const e=nearest(850); if(!e) return false; face(angTo(e)); fling(true); const n=2+Math.floor((L('sh_basic')-1)/2), d=1100*A.mul('sh_basic');
  after(.2,()=>{ const T=V.en.filter(o=>!o.dead&&Math.hypot(o.x-pl.x,o.y-pl.gy)<900).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.gy)-Math.hypot(b.x-pl.x,b.y-pl.gy));
    for(let k=0;k<n;k++) after(k*.06,()=>talisman(T[k%Math.max(1,T.length)]||e,d)); sfx('whoosh',1.6,.45); });
  return true; }

const SKILL={
  // CARD BOMB: a big talisman sticks where it lands and burns down like a fuse inside a closing ring, then goes up
  sh_bomb:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); fling();
    after(.2,()=>talisman(t,0,{big:true,r:60,d:0,home:t,life:1.2,onHit:(e,p)=>{}, onEnd:p=>{ const bx=p.x, by=p.y, fuse=EVO(id)?.8:.45;
      const boom=k=>{ K.burst(bx,by,{s:k?190:235,pal:P,scar:3,no:['shock']}); K.shock(bx,by,{r:330,dur:.4,pal:P,light:0}); GFX.ripple(bx,by,380,{life:.4,s:.6}); trauma=Math.min(1,trauma+.35); sfx('boom',1.1,.8);
        inCircle(bx,by,260,o=>{ dmg(o,d*(k?.6:1),{kb:1.4,big:true,sx:bx,sy:by}); hitFx(o,C1,1.3); }); };
      if(F.on) GFX.add(fuse,(k,t)=>{ const pu=.5+.5*Math.sin(t*(18+k*30)); card(bx,by,BODY*.55,70*(1+.08*pu),Math.sin(t*40)*.05*k,1,1+k*1.2*pu); F.bill(K.mats().glowO,bx,by,BODY*.55,60+90*k,60+90*k,0,{...C,a:.35+.5*k*pu,gain:2.2}); });
      K.shock(bx,by,{r0:300,r:50,dur:.42,pal:P,gain:.6,light:0,dust:0,haze:.3,th:.6}); GFX.light(bx,by,420,PJ.l,.7,.2,{hold:fuse,z:90,flick:.3});
      after(.45,()=>boom(0)); if(EVO(id)) after(.8,()=>boom(1)); }})); }},
  // STONE SPIKE: the floor splits along a line and jade shards punch up through it one after another
  sh_spike:{fn(id){ const e=nearest(700); if(!e) return false; const a0=angTo(e), d=D(id), dirs=EVO(id)?[-.45,0,.45]:[0]; face(a0); raise();
    for(const da of dirs){ const a=a0+da, cx=Math.cos(a), cy=Math.sin(a); K.gash(pl.x+cx*80,pl.gy+cy*80,pl.x+cx*820,pl.gy+cy*820,{pal:P,w:70,life:2.2,grow:.5,delay:.2});
      for(let i=0;i<6;i++) after(.25+i*.07,()=>{ const r=150+i*120, x=pl.x+cx*r, y=pl.gy+cy*r;
        spike(x,y,{s:190+i*14,lean:rand(-.16,.16)}); spike(x+rand(-50,50),y+rand(18,34),{s:100+i*6,lean:rand(-.4,.4),dur:.6});
        K.debris(x,y,{n:3,r:30,sp:[150,500],up:900,c:'#4c6a60'}); K.dust(x,y,{n:2,r:30,sp:[120,320],a:.4}); K.sparks(x,y,20,{pal:P,n:5,sp:[200,700],up:1100,life:[.2,.45]}); GFX.light(x,y,420,PJ.l,.8,.3,{z:80}); sfx('shatter',.4);
        inCircle(x,y,110,o=>{ dmg(o,d,{kb:.4,launch:1100,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.1); }); }); } }},
  // SPIRIT ORB: soul flames circling him, each with its pool of light on the floor
  sh_wisp:{fn(id){ if(V.orbs.some(o=>o.wisp)||!nearest(700)) return false; const n=EVO(id)?6:4, d=D(id); pray(); sfx('bell',.6);
    K.shock(pl.x,pl.gy,{r:340,dur:.4,pal:P,gain:.7,dust:6}); const lamp=GFX.light(pl.x,pl.gy,620,PJ.l,.5,.4,{hold:5,z:120,flick:.25});
    for(let i=0;i<n;i++){ const o={wisp:true,a:i/n*TAU,life:5,d,R:290,w:3.6,hitR:80,c:C1,h:BODY*.8,v:{x:pl.x,y:pl.gy-BODY}}, sd=rand(0,9); V.orbs.push(o);
      if(F.on) GFX.add(5.1,(k,t)=>{ if((o.t||0)>=o.life||o.x==null) return; if(!i){ lamp.x=pl.x; lamp.y=pl.gy; } const a=sat(t/.25)*sat((o.life-o.t)/.3);
        soul(o.x,o.y,BODY*.45,150,-Math.sin(o.a)*.38,sd,a);
        if(Math.random()<.3) GFX.pt({x:o.x,y:o.y,z:BODY*.6+rand(-30,60),vx:rand(-50,50),vy:rand(-30,30),vz:rand(60,200),g:-40,drag:.5,life:rand(.4,.8),s:rand(3,6),m:8,c:GFX.rgb(Math.random()<.3?PJ.h:PJ.s),fade:'in',L:3}); }); } }},
  // HEALING CIRCLE: a soft green seal that walks with him; every pulse lifts light out of it
  sh_heal:{fn(id){ if(G.hp>A.maxHp()*.7&&countIn(380)<6) return false; const d=D(id), k=EVO(id)?.4:.25; pray(); sfx('choir',.6); stamp('힐',{x:.5,y:.2,size:.08,life:.7,c:C1});
    const sg=K.sigil(pl.x,pl.gy,{r:400,dur:3,in:.35,out:.45,spin:.5,pal:HEAL,tex:'fx_circle_seal'}), lamp=GFX.light(pl.x,pl.gy,700,HEAL.l,.55,.5,{hold:2.6,z:100});
    GFX.add(3,()=>{ sg.x=lamp.x=pl.x; sg.y=lamp.y=pl.gy; }); K.shock(pl.x,pl.gy,{r:420,dur:.45,pal:HEAL,gain:.8,light:0,dust:0});
    V.zones.push({follow:true,r:380,life:3,tick:.5,fx:null,fn:e=>{ dmg(e,d,{kb:.5}); hitFx(e,C1,.9); },onTick:()=>{ heal(k/6);
      K.pillar(pl.x,pl.gy,{r:54,h:520,dur:.45,pal:HEAL,gain:.55,light:0}); K.shock(pl.x,pl.gy,{r:400,dur:.45,pal:HEAL,gain:.5,light:0,dust:0,haze:0}); K.embers(pl.x,pl.gy,330,{pal:HEAL,n:9,life:1.3,up:420}); }}); }},
  // ROCK FALL: jade-veined boulders out of the sky onto their marks
  sh_rock:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?7:4, d=D(id); raise(); sfx('rumble',.8);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x, y=e.y, at=.3+i*.14, hitAt=at;
      stone(x,y,{s:135,h0:1900,dur:.3,delay:hitAt-.3,stay:.55,fd:.3}).t1=RT+hitAt+.22;
      after(hitAt,()=>{ K.burst(x,y,{s:150,pal:P,scar:2.5,no:['smoke','shock'],dur:.45}); K.shock(x,y,{r:300,dur:.38,pal:P,light:0,dust:6,dc:'#2c3835'}); K.debris(x,y,{n:6,r:40,sp:[200,700],up:1100,c:'#4c6a60'}); trauma=Math.min(1,trauma+.2); sfx('boom',1,.6);
        inCircle(x,y,200,o=>{ dmg(o,d,{kb:1.1,launch:500,big:true,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); }); }},
  // BIND: the sealing circle writes itself under the crowd and six talismans stand guard on its rim
  sh_seal:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?380:300; face(angTo(t)); raise(); sfx('bell',.9);
    K.sigil(x,y,{r:R*1.08,dur:2.6,in:.3,out:.4,spin:.2,pal:P,tex:SEAL()}); K.shock(x,y,{r0:R*1.7,r:R*.3,dur:.34,pal:P,gain:.8,dust:0}); GFX.light(x,y,R*2.2,PJ.l,.6,.4,{hold:2.2,z:80});
    if(F.on) GFX.add(2.6,(k,t)=>{ const dn=eo5(sat(t/.22)), out=sat((2.6-t)/.3); for(let i=0;i<6;i++){ const a=i/6*TAU+.5, cx=x+Math.cos(a)*R*.94, cy=y+Math.sin(a)*R*.94*FSY; card(cx,cy,mix(900,62,dn)+Math.sin(t*4+i)*6,54,0,out*sat(t/.1),1+.5*Math.sin(t*7+i)); } });
    for(let i=0;i<6;i++){ const a=i/6*TAU+.5; K.sparks(x+Math.cos(a)*R*.94,y+Math.sin(a)*R*.94*FSY,10,{pal:P,n:3,sp:[150,450],up:500,life:[.15,.35]}); }
    V.zones.push({x,y,r:R,life:2.5,tick:EVO(id)?.3:2.6,fx:null,fn:e=>{ dmg(e,d*(EVO(id)?.4:1),{kb:0,stun:.4}); },onEnd:()=>{ K.shock(x,y,{r:R*1.3,dur:.35,pal:P,gain:.6,light:0,dust:0,haze:0}); }});
    inCircle(x,y,R,o=>{ dmg(o,d,{kb:0,stun:2.5,big:true}); hitFx(o,C1,1.1); }); }},
  // SPIRIT WOLF: the painted wolves run as lit sprites, dragging ribbons of light and kicking the dust up
  sh_wolf:{fn(id){ const e=nearest(900); if(!e) return false; const d=D(id), n=EVO(id)?4:2; face(angTo(e)); pray(); sfx('roar',.6,.5);
    for(let k=0;k<n;k++) after(.25+k*.12,()=>{ const a=angTo(e)+(k-(n-1)/2)*.5, p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.8,d,r:100,hits:new Set(),home:e,turn:3,c:C1,h:BODY*.4,pw:1.2}, sd=rand(0,9), b=K.mats();
      K.flare(pl.x,pl.gy,BODY*.6,{pal:P,s:150,dur:.25,gain:2}); const lamp=GFX.light(p.x,p.y,460,PJ.l,.6,.3,{hold:1.8,z:60});
      if(F.on) GFX.add(1.85,(q,t)=>{ if(p.life<=0){ lamp.hold=0; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp; lamp.x=p.x; lamp.y=p.y;
        F.ribbon(b.trB,[{x:p.x-ux*520,y:p.y-uy*520,z:p.h,w:10},{x:p.x-ux*300,y:p.y-uy*300,z:p.h,w:50},{x:p.x-ux*60,y:p.y-uy*60,z:p.h,w:74}],{...C,gain:1.7,a:.7,t0:sd});
        if(!gif('fx_shaman_wolf',t+sd,p.x,p.y,p.h+40,230,Math.atan2(uy,ux),ux<0?-1:1,sat(t/.1))) F.bill(b.glowO,p.x,p.y,p.h,90,90,0,{...C,gain:2.6});
        if(Math.random()<.25) K.dust(p.x-ux*80,p.y-uy*80,{n:1,dir:Math.atan2(uy,ux)+Math.PI,spread:.6,sp:[100,300],a:.3,s:.7}); });
      V.pj.push(p); }); }},
  // SPIRIT HAND: the hand slaps flat onto the crowd and leaves its print burning in the floor
  sh_palm:{fn(id){ const t=densest(560); if(!t) return false; const d=D(id), [x,y]=X.inView(t.x,t.y,.38); face(angTo(t)); pray(); sfx('rise',.7,.6);
    const slam=(k,at)=>{ const hitAt=at;
      K.shock(x,y,{r0:560,r:140,dur:.34,pal:P,gain:.6,light:0,dust:0,haze:.3,th:.6,delay:Math.max(0,at-.5)}); palmFall(x,y,{s:430,delay:hitAt-.34,fall:.34,h0:1700,rz:k?.3:-.2,scar:3.5});
      after(hitAt,()=>{ slamFx(x,y,.8); trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
        inCircle(x,y,400,o=>{ dmg(o,d*(k?.6:1),{kb:1.6,big:true,stun:.6,sx:x,sy:y}); hitFx(o,C1,1.4); }); }); };
    slam(0,.5); if(EVO(id)) slam(1,1.15); }},
};
// what a palm does to the floor it lands on (k = scale)
function slamFx(x,y,k=1){ K.art(x,y,{tex:'v3_xburst',s:520*k,z:-60*k,dur:.26,pal:P,gain:.9,hold:.18,s0:.55}); K.art(x,y,{tex:'fx3_shock',floor:true,s:820*k,dur:.6,pal:SP,gain:.85,hold:.3,s0:.3,rot:rand(0,TAU)}); K.shock(x,y,{r:1000*k,dur:.5,pal:P,gain:1}); GFX.ripple(x,y,1000*k,{life:.45,s:.7});
  K.crack(x,y,{r:560*k,pal:P,life:4,grow:.12}); K.debris(x,y,{n:Math.round(14*k),r:260*k,sp:[250,1000],up:1400,size:20,c:'#4c6a60'}); K.dust(x,y,{n:Math.round(14*k),r:300*k,sp:[400,1100],a:.45,c:'#2c3835'});
  K.sparks(x,y,40,{pal:P,n:Math.round(26*k),sp:[400,1700],up:1300,life:[.3,.8]}); GFX.light(x,y,1500*k,PJ.l,1.2,.5,{z:120}); }

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow
// STONE RAIN: a bell; the sealing circle spreads from his feet across the field while eight talismans circle him and climb; they go up as light -
// and stones come down, to a drum that keeps speeding up, each one staying where it lands. The last is a mountain: when it hits, every stone in the earth answers.
function ultStones(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, R=hw*.95, stuck=[];
  S([['gx04',.12,{kick:[-.8,.6]}],['gx07',1.6],['gx11',.12,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',2.6],['gx14',9]]);
  // ---- omen
  GFX.ambient(.3,.42,.4,3.5); const spot=GFX.light(x0,y0,620,PJ.l,.8,.6,{hold:9,z:150});
  Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.bell(); Cn.SND.gong(.8); SFX.rumble(1.7);
  const sig=K.sigil(x0,y0,{r:140,dur:12,in:1.3,out:.5,spin:.3,pal:SP,gain:.6,tex:SEAL()});
  GFX.add(1.5,k=>{ sig.r=mix(140,R*.95,eo3(k)); });
  K.crack(x0,y0,{r:250,pal:P,life:5,grow:1.3});
  for(let i=0;i<3;i++) after(.2+i*.4,()=>K.shock(x0,y0,{r0:hw*(1.1-i*.12),r:70,dur:.5,pal:P,gain:.5,light:0,dust:0,haze:.4,th:.6}));
  for(let i=0;i<12;i++) after(i*.15,()=>Cn.shake(.12));
  const cp=(i,t)=>{ const rr=mix(90,260,eo3(sat(t/.6))), an=i/8*TAU+t*3.2; return [x0+Math.cos(an)*rr,y0+Math.sin(an)*rr*FSY,BODY*1.1+Math.sin(t*5+i)*18+eo3(sat((t-1.2)/.6))*220,an]; };
  if(F.on) GFX.add(1.82,(k,t)=>{ const a=sat(t/.25); for(let i=0;i<8;i++){ const [cx,cy,cz,an]=cp(i,t); card(cx,cy,cz,46,Math.cos(an)*.3,a,1+sat((t-1.2)/.6)); } });
  for(let i=0;i<44;i++) after(rand(0,1.5),()=>{ const a=rand(0,TAU), d=rand(380,900); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,300),tx:x0,ty:y0,tz:BODY*1.9,pull:rand(4,6.5),life:rand(.45,.7),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*420,vy:Math.cos(a)*260,c:GFX.rgb(Math.random()<.35?'#ffffff':PJ.s),c2:PJ.b,L:3}); });
  for(let i=0;i<24;i++) after(rand(.1,1.6),()=>{ GFX.pt({x:x0+rand(-hw,hw)*.85,y:y0+rand(-hh,hh)*.5,z:2,vz:rand(140,340),g:-80,life:rand(.8,1.4),s:rand(5,13),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#5c6a66'),c2:'#0a0f0e',shadow:true,fk:4,L:2}); });
  // ---- release: the talismans go up as light and the sky is open
  after(1.82,()=>{ spot.hold=0; spot.life=.3; for(let i=0;i<8;i++){ const [cx,cy,cz]=cp(i,1.82); K.beam(cx,cy,cz,cx,cy,3400,{w:40,dur:.45,pal:GD,gain:.6}); }
    K.beam(x0,y0,BODY*1.7,x0,y0,3600,{w:150,dur:.85,pal:P,gain:.7}); K.flare(x0,y0,BODY*1.9,{pal:P,s:220,dur:.35,gain:2.2}); sig.a=.55; K.shock(x0,y0,{r:hw*1.4,dur:.5,pal:P}); GFX.ripple(x0,y0,hw*1.5,{life:.45,s:.6});
    K.sparks(x0,y0,BODY,{pal:P,n:30,sp:[400,1500],up:1700}); K.dust(x0,y0,{n:12,r:80,sp:[400,1000],c:'#2c3835'}); K.debris(x0,y0,{n:8,r:120,sp:[250,800],up:900,c:'#4c6a60'});
    GFX.ambient(.3,.36,.37,5); Cn.shake(.7); post.ca=.01; SFX.boom(1.4,.5); Cn.SND.shing(.7,.4); Cn.SND.gong(.7); Cn.zoom(.86); Cn.cam(null); });
  // ---- the rain
  const T=onScreen(100).sort(()=>Math.random()-.5).slice(0,22), pts=T.map(e=>[e.x,e.y]); while(pts.length<22) pts.push([x0+rand(-hw,hw)*.9,y0+rand(-hh,hh)*.85]);
  let at=2.0, gap=.22;
  pts.forEach(([x,y],i)=>{ const hitAt=at; stuck.push(stone(x,y,{s:rand(100,130),h0:2300,dur:.42,delay:hitAt-.42,vx:-560,stay:9}));
    after(hitAt,()=>{ K.art(x,y,{tex:'v3_xburst',s:240,z:-40,dur:.2,pal:P,gain:.9,hold:.15,s0:.5}); K.art(x,y,{tex:'fx3_burst',s:150,asp:1.39,z:-30,dur:.42,pal:P,gain:.8,hold:.25,s0:.4});
      K.art(x,y,{tex:'fx3_shock',floor:true,s:400,dur:.5,pal:SP,gain:.8,hold:.3,s0:.3,rot:rand(0,TAU)}); if(i%3===0) K.crack(x,y,{r:240,pal:P,life:3});
      K.debris(x,y,{n:5,r:50,sp:[200,700],up:1100,c:'#4c6a60'}); K.dust(x,y,{n:5,r:60,sp:[200,520],a:.4,c:'#2c3835'}); K.sparks(x,y,30,{pal:P,n:8,sp:[300,1100],up:900}); GFX.light(x,y,820,PJ.l,1,.35,{z:60});
      SFX.boom(.9+Math.random()*.3,.55); Cn.shake(.38+i*.012); hitstop=Math.max(hitstop,.018); inCircle(x,y,230,o=>ultHit(o,Dm*.4,x,y)); });
    at+=gap; gap=Math.max(.055,gap*.86); });
  // ---- climax: the one that takes the light with it
  const tc=at+.05, mx=x0, my=y0-hh*.2, lead=tc+.72;
  after(tc,()=>{ GFX.ambient(.3,.32,.34,5); Cn.zoom(.8); Cn.SND.inhale(.7,.7); duck(.2,.6);
    K.sigil(mx,my,{r:780,dur:.8,in:.3,out:.15,spin:2.4,pal:P,tex:'fx_circle_seal',gain:.8}); for(let i=0;i<2;i++) K.shock(mx,my,{r0:1100,r:260,dur:.34,pal:P,gain:.6,light:0,dust:0,haze:.4,th:.6,delay:i*.34}); });
  const big=stone(mx,my,{s:540,h0:3800,dur:.5,delay:lead-.5,vx:-760,stay:9,fd:.6,hot:1});
  after(lead,()=>{ hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.014; Cn.zoom(.86); GFX.ambient(.5,.62,.58,40); after(.14,()=>GFX.ambient(.32,.4,.4,4)); sig.a=1.2; after(.5,()=>{ sig.a=.6; });
    K.art(mx,my,{tex:'v3_xburst',s:hw*.85,z:-100,dur:.34,pal:P,gain:.75,hold:.2,s0:.55}); K.art(mx,my,{tex:'fx3_burst',s:640,asp:1.39,z:-120,dur:.7,pal:SP,gain:.75,hold:.25,s0:.4});
    K.art(mx,my,{tex:'fx3_shock',floor:true,s:hw*1.5,dur:.8,pal:SP,gain:.9,hold:.3,s0:.25});
    for(let i=0;i<9;i++){ const a=i/9*TAU+rand(-.2,.2), d=rand(520,680); stuck.push(stone(mx+Math.cos(a)*d,my+Math.sin(a)*d*FSY+40,{s:rand(45,85),h0:700,dur:.16,delay:rand(0,.08),vx:Math.cos(a)*-260,lead:0,stay:9})); } K.dome(mx,my,{r:hw*.95,dur:.5,pal:P,gain:.8}); K.shock(mx,my,{r:hw*1.8,dur:.6,pal:P,gain:1.2}); K.shock(mx,my,{r:hw*2.6,dur:.9,pal:P,gain:.7,delay:.1,light:0}); GFX.ripple(mx,my,hw*2,{life:.6,s:.9});
    K.crack(mx,my,{r:hw*.98,pal:P,life:5.5,grow:.14,gain:1.2});
    K.debris(mx,my,{n:26,r:260,sp:[300,1300],up:1800,size:26,c:'#4c6a60'}); K.dust(mx,my,{n:22,r:300,sp:[500,1500],a:.5,c:'#2c3835'}); K.sparks(mx,my,60,{pal:P,n:50,sp:[500,2200],up:1700,life:[.3,.9]});
    GFX.light(mx,my,hw*2.2,PJ.l,1.3,.7,{z:200}); for(let i=0;i<3;i++) K.smoke(mx+rand(-380,380),my+rand(-60,80),{s:rand(260,380),dur:rand(1.3,1.8),delay:.15+i*.1,a:.7,c:'#0b1614',c2:'#2a4a40'});
    for(const s of stuck){ const d=Math.hypot(s.x-mx,s.y-my); after(Math.min(.6,d/3000),()=>{ s.crumble(); K.flame(s.x,s.y,{s:rand(230,300),dur:.7,pal:P,light:0}); K.sparks(s.x,s.y,40,{pal:P,n:5,sp:[200,700],up:1300}); }); }
    Cn.sweep(mx,my,Dm,{speed:3000,push:1.3}); Cn.SND.hit(1); Cn.SND.gong(1); SFX.boom(1.6,1); SFX.shatter(1); });
  // ---- afterglow
  after(lead+.9,()=>{ K.embers(mx,my,hw*.9,{pal:P,n:46,life:2.2}); GFX.ambient(.8,.9,.86,1.6); Cn.zoom(1); sig.a=.3; });
  after(lead+1.15,()=>big.crumble());
  after(lead+1.65,()=>{ GFX.ambient(1,1,1,2); sig.dead=true; for(const s of stuck) s.dead=true; ultStop(); }); }

// SPIRIT KING: he only prays. Behind him a gate writes itself on the floor and something enormous burns into the world out of the mist, feet in the seal.
// Its eyes open; four times its hand comes down flat on the crowd and leaves its print; the last hand covers the field, and a wall of light stands up around it.
function ultKing(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, kx=x0, ky=y0-300, KS=950, st={pt:-9,out:-1,done:false};
  S([['gy01',.12],['gy02',.18],['gy03',.25],['gy04',.7],['gy05',.7],['gy06',.12,{kick:[-.8,.6]}],['gy07',.2],['gy08',.7],['gy09',.7],['gy10',.8],['gy11',.18,{kick:[1.6,-1.2]}],['gy12',.7],['gy13',.8],['gy14',9]]);
  // ---- omen
  GFX.ambient(.3,.4,.4,3); Cn.zoom(1.18); Cn.cam(x0,y0-BODY*4.4,4); SFX.choir(5.2); SFX.bell(); Cn.drone(49,.3);
  const gate=K.sigil(kx,ky,{r:hw*.7,dur:12,in:1.5,out:.6,spin:-.16,pal:SP,tex:SEAL(),gain:.55}); K.crack(kx,ky,{r:680,pal:P,life:6.5,grow:1.5,delay:.5});
  const lamp=GFX.light(kx,ky,hw*1.7,PJ.l,.05,.8,{hold:12,z:300});
  for(let i=0;i<3;i++) after(.15+i*.4,()=>K.shock(kx,ky,{r0:hw*(1.2-i*.12),r:120,dur:.55,pal:P,gain:.5,light:0,dust:0,haze:.4,th:.6}));
  for(let i=0;i<9;i++) after(.25+i*.5,()=>{ if(st.out<0) K.smoke(kx+rand(-520,520),ky+rand(-50,70),{s:rand(220,330),dur:1.9,c:'#07261d',c2:'#2c7a62',a:.5,rise:130}); });
  for(let i=0;i<13;i++) after(i*.42,()=>{ K.embers(x0,y0-200,hw,{pal:P,n:8,life:2.4,up:320}); if(i>1&&st.out<0) K.embers(kx,ky,420,{pal:i%2?GD:P,n:6,life:2.2,z:1500,up:300}); });
  // the king burns in out of the mist
  if(F.on){ const m=LM(), b=K.mats(); GFX.add(12,(k,t)=>{ if(st.done) return; const i=sat((t-.4)/1.4), f=st.out<0?0:sat((RT-st.out)/.8), pu=Math.exp(-(RT-st.pt)*3.5); if(f>=1){ st.done=true; lamp.hold=0; return; }
      const s=KS*(.9+.1*eo3(i))*(1+pu*.025), z=s*.97+Math.sin(t*1.3)*10+f*300-(1-eo3(i))*170;
      lamp.a=(.2+.55*i+pu*.35)*(1-f);
      F.quad(b.dark,kx,ky,640,640,0,{a:.62*i*(1-f)}); F.quad(b.glowG,kx,ky,860,860,0,{...C,a:(.3+.3*pu)*i*(1-f),gain:.9});
      F.bill(m.king,kx,ky,z,s*.84,s,0,{a:.95*Math.pow(sat(i*1.5),1.3)*(1-f*f),ero:Math.max(.42-i*1.1,f*.8-.05),soft:.12,gain:.82+.3*pu}); }); }
  // ---- release: its eyes open
  after(1.95,()=>{ st.pt=RT; K.flare(kx,ky,KS*1.62,{pal:P,s:300,sx:3,sy:.3,dur:.5,gain:4}); K.flare(kx,ky,KS*1.62,{pal:GD,s:420,dur:.6,gain:1.6}); K.art(kx,ky,{tex:'fx3_shock',floor:true,s:hw*1.1,dur:.7,pal:SP,gain:.8,hold:.3,s0:.3}); K.shock(kx,ky,{r:hw*1.6,dur:.55,pal:P}); GFX.ripple(kx,ky,hw*1.6,{life:.5,s:.6});
    K.sparks(kx,ky,60,{pal:P,n:34,sp:[300,1400],up:2200,life:[.4,1]}); K.dust(kx,ky,{n:14,r:300,sp:[400,1000],c:'#2c3835'});
    GFX.ambient(.3,.36,.38,5); Cn.shake(.7); post.ca=.01; Cn.zoom(.86); Cn.cam(x0,y0-BODY*1.4,5); SFX.roar(1.1,.5); Cn.SND.gong(.9); SFX.boom(1.4,.5); });
  // ---- four hands
  const T=onScreen(150), spots=[]; for(let i=0;i<4;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null; spots.push(e?X.inView(e.x,e.y,.75):[x0+rand(-hw,hw)*.7,y0+rand(-hh,hh)*.7]); }
  let at=2.35;
  spots.forEach(([x,y],i)=>{ const hitAt=at;
    after(hitAt-.4,()=>{ st.pt=RT; K.flare(kx+(i%2?1:-1)*KS*.6,ky,KS*1.2,{pal:P,s:170,dur:.3,gain:2.2}); K.shock(x,y,{r0:680,r:170,dur:.36,pal:P,gain:.6,light:0,dust:0,haze:.3,th:.6}); Cn.cam(lerp(x0,x,.35),lerp(y0,y,.35)-BODY,6); sfx('whoosh',.5,.9); });
    palmFall(x,y,{s:520,delay:hitAt-.36,fall:.36,h0:2000,ox:(kx-x)*.3,rz:(y>ky+200?Math.PI:0)+(i%2?1:-1)*rand(.1,.35),scar:4});
    after(hitAt,()=>{ slamFx(x,y,1); Cn.shake(.85); hitstop=Math.max(hitstop,.06); Cn.SND.hit(.6); post.ca=.008; V.blast={x,y,p:1}; inCircle(x,y,480,o=>ultHit(o,Dm*.5,x,y)); });
    at+=Math.max(.3,.44-i*.05); });
  // ---- climax: the hand that covers the field
  const tc=at+.25, bx=x0, by=y0-hh*.12, py=y0+730;
  after(tc,()=>{ Cn.zoom(.8); Cn.cam(bx,y0+60,6); GFX.ambient(.3,.32,.34,5); Cn.SND.inhale(.55,.7); st.pt=RT; duck(.2,.5);
    for(let i=0;i<2;i++) K.shock(bx,py,{r0:1400,r:320,dur:.29,pal:P,gain:.6,light:0,dust:0,haze:.4,th:.6,delay:i*.29}); });
  palmFall(bx,py,{s:1150,delay:tc+.58-.44,fall:.44,h0:3400,hold:.34,out:.55,scar:3.4,rz:Math.PI});
  after(tc+.58,()=>{ hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; GFX.ambient(.5,.62,.58,40); after(.14,()=>GFX.ambient(.32,.4,.4,4)); st.pt=RT; gate.a=1.5;
    slamFx(bx,py,1.7); K.dome(bx,py,{r:hw*.95,dur:.5,pal:P,gain:.8}); K.shock(bx,py,{r:hw*2.6,dur:.9,pal:P,gain:.7,delay:.1,light:0});
    for(let q=0;q<4;q++){ const pts=[]; for(let j=0;j<=6;j++){ const a=(q+j/6)*Math.PI/2; pts.push({x:bx+Math.cos(a)*800,y:py+Math.sin(a)*800*FSY,h:rand(520,980)}); } K.wall(pts,{pal:P,dur:rand(1.1,1.4),gain:.6,delay:.05+q*.03}); }
    Cn.sweep(bx,by,Dm,{speed:3200,push:1.2}); Cn.SND.hit(1); SFX.boom(1.6,1); SFX.shatter(1); });
  // ---- afterglow: it goes back up as light; the bell again
  after(tc+1.3,()=>{ st.out=RT; SFX.bell(.7); K.embers(bx,by,hw*.9,{pal:P,n:50,life:2.4}); K.embers(kx,ky,500,{pal:P,n:24,life:2.4,z:1400,up:420}); GFX.ambient(.8,.9,.86,1.6); Cn.zoom(1); Cn.cam(null); gate.a=.5; });
  after(tc+2.05,()=>{ GFX.ambient(1,1,1,2); gate.dead=true; ultStop(); }); }

X.reg('shaman',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('sh_basic')-1))},skills:SKILL,ults:{sh_ult1:ultStones,sh_ult2:ultKing}});
})();
