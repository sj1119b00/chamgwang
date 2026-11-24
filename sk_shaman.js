// 참광 survival - SHAMAN skill set (top-down, all automatic). Jade spirits, seals and falling stone. Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inLine,sfx,view,onScreen,tdV,dropFx,ultStart,ultStop,ultHit,burst,fring,heal}=X;
const C1='#3dffb0', C2='#d8fff0';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const fling=b=>S([['gb03',.04],['gb04',.05],['gb05',.06,{kick:[-.9,.7]}],['gb06',.05,{kick:[1.4,-1]}],['gb07',.08],['gb09',.07],['gb12',.05]],b);
const raise=()=>S([['gx04',.08,{kick:[-.8,.6]}],['gx07',.25],['gx11',.1,{kick:[-1,.8]}],['gx12',.08,{kick:[2,-1.6]}],['gx13',.25],['gx14',.1]]);
const pray=()=>S([['gy02',.1],['gy04',.35],['gy06',.08,{kick:[-.8,.6]}],['gy08',.3],['gy11',.1,{kick:[1.6,-1.2]}],['gy12',.2],['gy14',.1]]);
function puff(x,y,s=1){ const M=VFX.shaman_burst; if(M&&M.f[0].ok) vfx('shaman_burst',x,y-BODY*.5,{sc:.5*s,rot:rand(0,TAU)}); fring(x,y,800*s,C1,.3,5); gl0(x,y-BODY*.5,120*s,C1,.18,{a:.8}); }
// a talisman thrown from the hand that homes in on a target
function talisman(e,d,o={}){ const J=pl.j, sx=J?J.rh[0]:pl.x, sy=J?J.rh[1]:pl.gy-BODY; const a=angTo(e)+rand(-.6,.6);
  const p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.6,d,r:o.r??70,home:e,turn:9,c:C1,v:{x:sx,y:sy},h:BODY*1.1,pw:1.1,...o};
  const M=VFX.shaman_talisman; p.fx=M&&M.f[0].ok?vfx('shaman_talisman',sx,sy,{follow:p.v,loop:true,life:p.life,sc:(o.big?.5:.3),px:M.cx,py:M.cy}):null;
  if(!p.onHit) p.onHit=(e,p)=>puff(p.x,p.y,o.big?1.4:.7);
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
  sh_bomb:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); fling();
    after(.2,()=>talisman(t,0,{big:true,r:60,d:0,home:t,life:1.2,onHit:(e,p)=>{}, onEnd:p=>{ const bx=p.x, by=p.y;
      const boom=k=>{ puff(bx,by,2.2); fring(bx,by,1800,C1,.4,8); trauma=Math.min(1,trauma+.35); sfx('boom',1.1,.8); burst(bx,by,10,{c:C1});
        inCircle(bx,by,260,o=>{ dmg(o,d*(k?.6:1),{kb:1.4,big:true,sx:bx,sy:by}); hitFx(o,C1,1.3); }); };
      gl0(bx,by-BODY*.5,120,C1,.6,{a:.8}); after(.45,()=>boom(0)); if(EVO(id)) after(.8,()=>boom(1)); }})); }},
  sh_spike:{fn(id){ const e=nearest(700); if(!e) return false; const a0=angTo(e), d=D(id), dirs=EVO(id)?[-.45,0,.45]:[0]; face(a0); raise();
    for(const da of dirs) for(let i=0;i<6;i++) after(.25+i*.07,()=>{ const a=a0+da, r=150+i*120, x=pl.x+Math.cos(a)*r, y=pl.gy+Math.sin(a)*r, M=VFX.fx_shaman_spike;
      if(M&&M.f[0].ok) vfx('fx_shaman_spike',x,y,{px:M.ix??.5,py:M.iy??.8,sc:300/M.h}); fring(x,y,500,C1,.3,4); burst(x,y,4,{rock:true,s0:100,s1:400}); sfx('shatter',.4);
      inCircle(x,y,110,o=>{ dmg(o,d,{kb:.4,launch:1100,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.1); }); }); }},
  sh_wisp:{fn(id){ if(V.orbs.some(o=>o.wisp)||!nearest(700)) return false; const n=EVO(id)?6:4, d=D(id); pray(); sfx('bell',.6);
    for(let i=0;i<n;i++){ const o={wisp:true,a:i/n*TAU,life:5,d,R:290,w:3.6,hitR:80,c:C1,h:BODY*.8,v:{x:pl.x,y:pl.gy-BODY}};
      const M=VFX.fx_shaman_wisp; o.fx=M&&M.f[0].ok?vfx('fx_shaman_wisp',o.v.x,o.v.y,{follow:o.v,loop:true,life:5,sc:230/M.w,px:M.ix??.7,py:M.iy??.5}):null; V.orbs.push(o); } }},
  sh_heal:{fn(id){ if(G.hp>A.maxHp()*.7&&countIn(380)<6) return false; const d=D(id), k=EVO(id)?.4:.25; pray(); sfx('choir',.6); stamp('힐',{x:.5,y:.2,size:.08,life:.7,c:C1});
    const Cc=VFX.td_circle, v={x:pl.x,y:pl.gy}, f=Cc&&Cc.f[0].ok?vfx('td_circle',v.x,v.y,{follow:v,loop:true,life:3,sc:760/Cc.w,wy:FSY,hue:110,a:.75}):null;
    V.zones.push({follow:true,r:380,life:3,tick:.5,fx:f,v,fn:e=>{ dmg(e,d,{kb:.5}); hitFx(e,C1,.9); },onTick:()=>{ heal(k/6); gl0(pl.x,pl.gy-BODY,160,'#55ff9a',.4,{a:.5}); for(let i=0;i<4;i++) gl0(pl.x+rand(-120,120),pl.gy+rand(-20,20),rand(6,10),'#aaffcc',1,{vy:-rand(200,400),a:.9}); }}); }},
  sh_rock:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?7:4, d=D(id); raise(); sfx('rumble',.8);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>{ const x=e.x, y=e.y, at=.3+i*.14, hitAt=dropFx('fx_shaman_rock',x,y,560,at)??at;
      after(hitAt,()=>{ fring(x,y,1000,C1,.35,6); burst(x,y,10,{rock:true}); smoke(x,y-20,50,{c:'70,60,48',a:.5}); trauma=Math.min(1,trauma+.2); sfx('boom',1,.6);
        inCircle(x,y,200,o=>{ dmg(o,d,{kb:1.1,launch:500,big:true,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); }); }},
  sh_seal:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y, R=EVO(id)?380:300; face(angTo(t)); raise(); sfx('bell',.9);
    const M=VFX.fx_shaman_seal, f=M&&M.f[0].ok?vfx('fx_shaman_seal',x,y,{loop:true,life:2.6,sc:R*2.3/M.w,wy:FSY,a:.95}):null;
    fring(x,y,R*4,C1,.4,8);
    V.zones.push({x,y,r:R,life:2.5,tick:EVO(id)?.3:2.6,fx:f,fn:e=>{ dmg(e,d*(EVO(id)?.4:1),{kb:0,stun:.4}); }});
    inCircle(x,y,R,o=>{ dmg(o,d,{kb:0,stun:2.5,big:true}); hitFx(o,C1,1.1); }); }},
  sh_wolf:{fn(id){ const e=nearest(900); if(!e) return false; const d=D(id), n=EVO(id)?4:2; face(angTo(e)); pray(); sfx('roar',.6,.5);
    for(let k=0;k<n;k++) after(.25+k*.12,()=>{ const a=angTo(e)+(k-(n-1)/2)*.5, p={x:pl.x,y:pl.gy,vx:Math.cos(a)*1100,vy:Math.sin(a)*1100,life:1.8,d,r:100,hits:new Set(),home:e,turn:3,c:C1,v:{x:0,y:0},h:BODY*.4,pw:1.2,flipY:true};
      p.v.x=p.x; p.v.y=p.y-p.h; const M=VFX.fx_shaman_wolf; p.fx=M&&M.f[0].ok?vfx('fx_shaman_wolf',p.v.x,p.v.y,{follow:p.v,loop:true,life:1.8,sc:320/M.w,rot:a,px:M.ix??.5,py:M.iy??.6}):null;
      if(!p.fx) gl0(p.v.x,p.v.y,90,C1,1.8,{a:.8});
      V.pj.push(p); }); }},
  sh_palm:{fn(id){ const t=densest(560); if(!t) return false; const d=D(id), [x,y]=X.inView(t.x,t.y,.38); face(angTo(t)); pray(); sfx('rise',.7,.6);
    const slam=(k,at)=>{ const hitAt=at, P=spr('palm'); dropFx('fx_shaman_palm',x,y,1500,at+.12,{a:.4});
      if(P) X.draw(.75,q=>{ const fall=Math.min(1,q/.55), e=fall*fall, h=760*(1.25-.25*e), w=h*P.w/P.h, by=lerp(y-1300,y+40,e), a=q<.55?.35+.6*fall:Math.max(0,1-(q-.55)/.2);
        ctx.save(); ctx.globalAlpha=a*.92; ctx.drawImage(P.im,x-w/2,by-h,w,h); ctx.restore(); glow(fx,x,by-h*.45,h*.55,C1,.35*a); },Math.max(0,at-.55));
      after(hitAt,()=>{ fring(x,y,2400,C1,.5,10); fring(x,y,1400,'#ffffff',.3,4); shock(x,y-40,1,1.1); trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
        burst(x,y,16,{rock:true,s0:400,s1:1200}); add({k:'decal',x,y,r:300,life:5}); inCircle(x,y,400,o=>{ dmg(o,d*(k?.6:1),{kb:1.6,big:true,stun:.6,sx:x,sy:y}); hitFx(o,C1,1.4); }); }); };
    V.shadow={x,y,t0:RT,dur:.5,r:360,c:C1}; after(.5,()=>{ V.shadow=null; }); slam(0,.5); if(EVO(id)) slam(1,1.15); }},
};

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js, drawn by gfx.js)
const JADE='#2fe8a4', JD='#053a2c', JW='#e6fff4';
// a slab of rock that shoulders up out of the floor, stands, and sinks back
function menhir(x,y,h,dl=0,life=1.6){ const Cn=X.cine, K=GFX, rk=rockSpr(); if(!rk) return; const st=K.st(0,'alpha',{t:rk.im||rk,L:2,uv01:true}), w=h*.42, rot=rand(-.12,.12);
  K.add(life,(k,t)=>{ const up=t<.16?easeOut(t/.16):t>life-.4?Math.max(0,(life-t)/.4):1; if(up<=0) return; K.floor(K.st(12,'alpha',{L:0}),x,y,w*.9,null,0,[0,0,0],.4*up); K.bill(st,x,y,h*up*.5-h*.08,w*.5,h*up*.5,rot,[.62,.78,.7],1,0,0,1,0); },dl);
  after(dl,()=>{ Cn.gDebris(x,y,4,{s0:150,s1:500,vz:1100,size:18,c:'#56645c'}); Cn.gPuff(x,y,10,w*.7,{c:'#4a554e',c2:'#0a120e',c3:'#7c8c82',vz:120,life:.8,a:.6}); Cn.gRing(x,y,w*1.6,JADE,{c2:JD,life:.3,w:.12}); }); }
// STONE RAIN: a bell, a seal spreading over the earth, chains of light that hold everything where it stands -
// then stones fall to a drum that keeps speeding up, the last one blots out the light, and the earth answers with its own teeth.
function ultStones(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, R=hw*.95, rk=rockSpr(), rim=rk&&(rk.im||rk);
  const TJ=Cn.tone(JADE,{c2:JD,c3:JW});
  S([['gx04',.12,{kick:[-.8,.6]}],['gx07',1.6],['gx11',.12,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',2.6],['gx14',9]]);
  K.ambient(.4,.5,.48,3); Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.bell(); Cn.SND.gong(.8); SFX.rumble(1.7); duck(.3,.6);
  Cn.gCircle('fx_circle_seal',x0,y0,{c:JADE,r:40,life:6,tick:(s,t)=>{ s.r=lerp(40,R,easeOut(Math.min(1,t/1.5))); s.rot=t*.3; s.a=t>4.6?Math.max(0,1-(t-4.6)/.6):t>1.9?.6:.95; }});
  for(let i=0;i<8;i++) add({k:'talis',mode:'orbit',cx:x0,cy:y0-BODY*1.1,r:230,a:i/8*TAU,w:3.2,rot:0,x:x0,y:y0,life:1.75});
  const drop=Cn.gLevitate(x0,y0,hw*.9,34,{dur:1.4,life:5,c:'#56645c'});
  Cn.gather(x0,y0-BODY*1.1,{c:JADE,dur:.9,r:900,n:30,cs:[JADE,C2,'#ffffff'],fy:y0,rings:0,streaks:0});
  const Lh=K.light(x0,y0,900,JADE,0,1.6,{hold:3}); K.add(1.2,k=>{ Lh.a=k; });
  // chains: a thread of light from the seal's rim up through each of them; they stop where they stand
  const T=onScreen(100).sort(()=>Math.random()-.5).slice(0,22), stCh=Cn.gst(3,'add',TJ,2);
  T.forEach((e,i)=>after(.9+i*.03,()=>{ if(e.dead) return; e.bound=RT; e.stun=Math.max(e.stun||0,5); Cn.SND.tick(1.1,.08); Cn.gStar(e.x,e.y,e.h*.6,70,JW,{c2:JADE,life:.14,n:4}); }));
  K.add(4.1,()=>{ for(const e of T){ if(e.dead||!e.bound) continue; const k=Math.min(1,(RT-e.bound)/.2), a=Math.atan2(e.y-y0,e.x-x0), bx=e.x-Math.cos(a)*140, by=e.y-Math.sin(a)*140*FSY;
      K.line(stCh,bx,by,0,lerp(bx,e.x,k),lerp(by,e.y,k),e.h*.7*k,13,TJ.c,.9,0,RT*3+e.x,-6,.5); K.line(stCh,bx+70,by,0,lerp(bx+70,e.x,k),lerp(by,e.y,k),e.h*.4*k,10,TJ.c,.7,0,RT*3+e.y,-6,.5); } },.9);
  // release: the drum
  after(1.8,()=>Cn.impact(x0,y0-BODY,{style:'paper',c:JADE,n:2,soft:true,flash:.06,blur:.03,v:.5,then:()=>{ Cn.SND.gong(.7); Cn.zoom(.86); Cn.cam(null); K.ambient(.44,.52,.5,5); Cn.gRing(x0,y0,hw*1.5,JADE,{c2:JD,life:.5,w:.07,jag:.07}); K.ripple(x0,y0,hw*1.5,{life:.5,s:.6}); }}));
  const pts=T.map(e=>[e.x,e.y]); while(pts.length<20) pts.push([x0+rand(-hw,hw)*.9,y0+rand(-hh,hh)*.85]);
  let at=2.0, gap=.22;
  pts.forEach(([x,y],i)=>{ const h=rand(300,460), land=()=>{ Cn.gStar(x,y,40,rand(200,280),JW,{c2:JADE,life:.16,n:6}); Cn.gRing(x,y,400,JADE,{c2:JD,life:.32,w:.13,jag:.1}); Cn.gCrack(x,y,280,JADE,{c2:JD,life:1.4,n:8,w:.15});
      Cn.gDebris(x,y,6,{s0:200,s1:700,vz:1300,size:22,c:'#56645c'}); Cn.gPuff(x,y,10,rand(80,120),{c:'#4a554e',c2:'#0a120e',c3:'#7c8c82',vz:rand(100,220),life:1,a:.65}); K.light(x,y,800,JADE,.9,.25);
      SFX.boom(.9+Math.random()*.3,.55); Cn.shake(.38+i*.012); hitstop=Math.max(hitstop,.018); inCircle(x,y,230,o=>ultHit(o,Dm*.4,x,y)); if(i%3===0) Cn.scar({x,y,r:200,c:JADE,life:7,heat:1.6}); };
    if(rim) Cn.gDrop(x,y,{img:rim,h,w:h*1.05,z0:3600,dur:.36,c:[.62,.78,.7],spin:rand(-5,5),trail:JADE,tw:.3,tl:3,delay:at-.36,land,sink:.5,pz:.0005,stick:.5,fade:.5,burn:.5}); else after(at,land);
    at+=gap; gap=Math.max(.06,gap*.86); });
  // climax: the one that takes the light with it - and then the earth's own teeth, ring after ring
  const tc=at+.05, mx=x0, my=y0-hh*.2, BH=1500;
  after(tc,()=>{ Cn.zoom(.8); K.ambient(.2,.26,.26,4); Cn.SND.inhale(.75,.7); duck(.2,.6); K.add(.8,k=>K.floor(K.st(12,'alpha',{L:0}),mx,my,300+900*k,null,0,[0,0,0],.3+.5*k)); Cn.gRing(mx,my,900,JW,{c2:JADE,inward:true,life:.75,w:.05,jag:.04}); });
  if(rim) Cn.gDrop(mx,my,{img:rim,h:BH*1.7,w:BH*.8,z0:6500,dur:.7,c:[.62,.78,.7],rot:.06,trail:JADE,tw:.4,tl:2,delay:tc+.1,sink:.14,pz:.0004,L:3,stick:1.7,fade:.5,burn:.7});
  after(tc+.8,()=>Cn.impact(mx,my-80,{style:'paper',c:JADE,n:2,r:.16,soft:true,flash:.1,blur:.06,then:()=>{ K.ambient(.6,.7,.64,10); after(.8,()=>K.ambient(1,1,1,1.8)); drop(1500); Cn.SND.gong(1);
      Cn.gStar(mx,my,80,900,JADE,{c2:JD,c3:'#ffffff',life:.4,n:8}); for(let i=0;i<4;i++) Cn.gRing(mx,my,hw*(1.1+i*.45),i%2?JW:JADE,{c2:JD,life:.55+i*.12,w:.14-i*.03,jag:.11,delay:i*.06});
      K.ripple(mx,my,hw*2.3,{life:.8,s:1.1}); Cn.gCrack(mx,my,hw*1.5,JADE,{c2:JD,c3:JW,life:4,n:17,w:.1}); Cn.scar({x:mx,y:my,r:900,c:JADE,life:10,heat:3.4});
      Cn.gDebris(mx,my,34,{s0:400,s1:1600,vz:2300,size:36,c:'#56645c'}); Cn.gDebris(mx,my,12,{r:320,s0:100,s1:600,v0:1700,vz:3600,sz0:44,size:100,g:2600,c:'#56645c'});
      for(let r=1;r<=3;r++){ const n=5+r*3, rr=r*400; for(let i=0;i<n;i++){ const a=i/n*TAU+r*.5; menhir(mx+Math.cos(a)*rr,my+Math.sin(a)*rr*FSY,rand(380,560)+r*60,.08+r*.14,1.5-r*.1); } after(.08+r*.14,()=>{ sfx('boom',1.1,.5); Cn.shake(.5); }); }
      K.light(mx,my,2600,JADE,1.3,1); Cn.sweep(mx,my,Dm,{speed:3000,push:1.3}); Cn.gMotes(mx,my,hw,JADE,70,{dur:1.8,life:2.2,white:.4}); }}));
  after(tc+1.9,()=>{ Cn.zoom(1); for(let i=0;i<10;i++) Cn.gPuff(mx+rand(-400,400),my+rand(-200,200),20,rand(110,190),{c:'#4a554e',c2:'#0a120e',c3:'#7c8c82',vz:rand(140,320),life:rand(1.2,2),a:.55}); });
  after(tc+2.6,ultStop); }

// SPIRIT KING: he only prays. Something enormous comes into being behind him out of the dark, opens its eyes,
// and it is its hands that do the work - each one bigger than the screen while it is still high, the last one covering the sky.
function ultKing(id){ ultStart(id); ov.lbT=0; const Cn=X.cine, K=GFX, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy, dv=spr('deity'), pm=spr('palm');
  const TJ=Cn.tone(JADE,{c2:JD,c3:JW});
  S([['gy01',.12],['gy02',.18],['gy03',.25],['gy04',.7],['gy05',.7],['gy06',.12,{kick:[-.8,.6]}],['gy07',.2],['gy08',.7],['gy09',.7],['gy10',.8],['gy11',.18,{kick:[1.6,-1.2]}],['gy12',.7],['gy13',.8],['gy14',9]]);
  K.ambient(.3,.4,.4,3); Cn.zoom(1.28); Cn.cam(x0,y0-BODY*2.4,4); SFX.choir(5.2); SFX.bell(); Cn.drone(49,.3); duck(.3,.6);
  Cn.gCircle('fx_circle_seal',x0,y0,{c:JADE,r:40,life:6.4,tick:(s,t)=>{ s.r=lerp(40,hw*.7,easeOut(Math.min(1,t/1.5))); s.rot=-t*.25; s.a=t>5.6?Math.max(0,1-(t-5.6)/.6):.8; }});
  Cn.gMotes(x0,y0,hw*.8,JADE,90,{dur:5,life:2.2,white:.3});
  // the king: burns into being out of noise, tall as the field, breathing; its eyes are the light
  let eyes=0, gone=0, t00=RT; const KH=1800, KW=dv?KH*dv.w/dv.h:900, stK=dv&&K.st(0,'alpha',{t:dv.im,L:1,uv01:true,c3:K.rgb(JW)}), stG=K.st(8,'add',{L:1});
  const Le=K.light(x0,y0-200,1500,JADE,0,9,{hold:9});
  const king=K.add(9,()=>{ const t=RT-t00, form=Math.min(1,t/1.5), out=gone?Math.min(1,(RT-gone)/.8):0, bob=Math.sin(RT*1.3)*14; eyes=Math.max(0,eyes-Math.min(.1,RT-(king.lt||RT))*.9); king.lt=RT; Le.a=(.25+eyes)*(1-out); Le.t=0;
    if(dv) K.bill(stK,x0,y0-260,KH*.5+bob+out*500,KW*.5,KH*.5,0,[.5+.4*eyes,.9,.78],(.5+.2*eyes)*(1-out),Math.max(1-form,out),t*.2,1.2,.004);
    K.bill(stG,x0,y0-60,KH*.66+bob,900,900,0,TJ.c,(.15+.35*eyes)*(1-out)); K.bill(stG,x0-KW*.06,y0-60,KH*.83+bob,90+160*eyes,40+70*eyes,0,[1,1,1],eyes*(1-out)); K.bill(stG,x0+KW*.06,y0-60,KH*.83+bob,90+160*eyes,40+70*eyes,0,[1,1,1],eyes*(1-out)); });
  Cn.gather(x0,y0-BODY*.9,{c:JADE,dur:1,r:900,n:30,cs:[JADE,C2,'#ffffff'],fy:y0,rings:0,streaks:0});
  // release: its eyes open
  after(1.95,()=>Cn.impact(x0,y0-BODY*2,{style:'paper',c:JADE,n:2,soft:true,flash:.07,blur:.03,v:.6,then:()=>{ eyes=1; Cn.zoom(.86); Cn.cam(x0,y0-BODY*1.4,5); K.ambient(.36,.46,.44,5); SFX.roar(1.1,.5); Cn.SND.gong(.9); Cn.gRing(x0,y0,hw*1.6,JADE,{c2:JD,life:.55,w:.07,jag:.07}); K.ripple(x0,y0,hw*1.6,{life:.5,s:.6}); }}));
  // a hand: falls palm-first from above the camera onto its own shadow
  const palm=(x,y,h,z0,dur,dl,land,L)=>{ if(pm) Cn.gDrop(x,y,{img:pm.im,h,w:h*pm.w/pm.h,z0,dur,delay:dl,land,sink:.45,pz:.00042,L:L??3,c:[.8,1,.92],stick:.5,fade:.45,burn:.45,trail:JADE,tw:.5,tl:1.6}); else after(dl+dur,()=>land(x,y)); };
  const T=onScreen(150), spots=[]; for(let i=0;i<4;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null; spots.push(e?X.inView(e.x,e.y,.75):[x0+rand(-hw,hw)*.7,y0+rand(-hh,hh)*.7]); }
  let at=2.35;
  spots.forEach(([x,y],i)=>{ after(at-.42,()=>{ eyes=Math.max(eyes,.7); Cn.cam(lerp(x0,x,.35),lerp(y0,y,.35)-BODY,6); sfx('whoosh',.5,.9); K.add(.42,k=>K.floor(K.st(12,'alpha',{L:0}),x,y,160+380*k,null,0,[0,0,0],.25+.45*k)); });
    palm(x,y,1150,3800,.4,at-.4,()=>{ Cn.gStar(x,y,40,520,JW,{c2:JADE,life:.24,n:7}); Cn.gRing(x,y,900,JADE,{c2:JD,life:.45,w:.13,jag:.1}); Cn.gRing(x,y,600,'#ffffff',{c2:JADE,life:.3,w:.06,delay:.04}); K.ripple(x,y,900,{life:.45,s:.8});
      Cn.gCrack(x,y,620,JADE,{c2:JD,life:2,n:11,w:.12}); Cn.gDebris(x,y,14,{s0:300,s1:1100,vz:1700,size:26,c:'#56645c'}); for(let q=0;q<8;q++){ const a=q/8*TAU; Cn.gPuff(x+Math.cos(a)*240,y+Math.sin(a)*240*FSY,10,rand(90,140),{c:'#4a554e',c2:'#0a120e',c3:'#7c8c82',vx:Math.cos(a)*700,vy:Math.sin(a)*700*FSY,vz:rand(60,160),life:.9,a:.6,drag:2.4}); }
      K.light(x,y,1500,JADE,1.2,.4); Cn.shake(.85); hitstop=Math.max(hitstop,.06); Cn.SND.hit(.6); post.ca=.008;
      Cn.scar({x,y,r:330,c:JADE,life:8,heat:2.2}); Cn.scar({kind:'burn',x,y,r:300,c:JADE,life:8,heat:2}); V.blast={x,y,p:1}; inCircle(x,y,480,o=>ultHit(o,Dm*.5,x,y)); });
    at+=Math.max(.3,.44-i*.05); });
  // climax: the hand that covers the sky
  const tc=at+.25, bx=x0, by=y0-hh*.12;
  after(tc,()=>{ Cn.zoom(.8); Cn.cam(bx,by-BODY,6); K.ambient(.18,.26,.25,4); Cn.SND.inhale(.6,.7); eyes=1; duck(.2,.5); K.add(.6,k=>K.floor(K.st(12,'alpha',{L:0}),bx,by,300+1000*k,null,0,[0,0,0],.3+.5*k)); Cn.gRing(bx,by,1000,JW,{c2:JADE,inward:true,life:.58,w:.05,jag:.04}); });
  palm(bx,by,2500,6200,.44,tc+.16,()=>{},3);
  after(tc+.6,()=>Cn.impact(bx,by-60,{style:'paper',c:JADE,n:2,r:.18,soft:true,flash:.1,blur:.06,then:()=>{ K.ambient(.6,.72,.66,10); after(.8,()=>K.ambient(1,1,1,1.8)); for(const d of Cn.drones) d.stop(.05);
      Cn.gStar(bx,by,80,1000,JADE,{c2:JD,c3:'#ffffff',life:.42,n:9}); for(let i=0;i<4;i++) Cn.gRing(bx,by,hw*(1.1+i*.45),i%2?JW:JADE,{c2:JD,life:.55+i*.12,w:.14-i*.03,jag:.11,delay:i*.06});
      K.ripple(bx,by,hw*2.3,{life:.8,s:1.1}); Cn.gCrack(bx,by,hw*1.5,JADE,{c2:JD,c3:JW,life:4,n:15,w:.1}); Cn.scar({kind:'seal',x:bx,y:by,r:720,c:JADE,life:10,heat:4});
      Cn.gDebris(bx,by,30,{s0:400,s1:1500,vz:2200,size:32,c:'#56645c'}); Cn.gDebris(bx,by,12,{r:320,s0:100,s1:600,v0:1700,vz:3600,sz0:44,size:100,g:2600,c:'#56645c'});
      K.light(bx,by,2700,JADE,1.4,1.1); Cn.sweep(bx,by,Dm,{speed:3200,push:1.2}); Cn.shake(1.3); Cn.gMotes(bx,by,hw*1.2,JADE,90,{dur:2,life:2.4,white:.4}); }}));
  // afterglow: it goes back up as light; the bell again
  after(tc+1.3,()=>{ gone=RT; SFX.bell(.7); Cn.zoom(1); Cn.cam(null); });
  after(tc+2.1,()=>{ king.dead=true; Le.hold=0; Le.life=.01; ultStop(); }); }

X.reg('shaman',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('sh_basic')-1))},skills:SKILL,ults:{sh_ult1:ultStones,sh_ult2:ultKing}});
})();
