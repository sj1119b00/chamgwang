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

/// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const JADE='#3dffb0';
// STONE RAIN: a bell, a ring of talismans, a seal on the earth - then stones fall to a drum that keeps speeding up, until the last one blots out the light.
function ultStones(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, R=hw*.95;
  S([['gx04',.12,{kick:[-.8,.6]}],['gx07',1.6],['gx11',.12,{kick:[-1,.8]}],['gx12',.1,{kick:[2,-1.6]}],['gx13',2.6],['gx14',9]]);
  Cn.setDark(.78,{c:'2,11,9',spot:{x:x0,y:y0-BODY*.5,r:900,a:.25}}); Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.bell(); Cn.SND.gong(.8); SFX.rumble(1.7);
  const seal=Cn.floorTex('fx_circle_seal',x0,y0,40,{c:JADE,spin:.35,a:.95,life:7}); seal.core=.2;
  for(let i=0;i<8;i++) add({k:'talis',mode:'orbit',cx:x0,cy:y0-BODY*1.1,r:230,a:i/8*TAU,w:3.2,rot:0,x:x0,y:y0,life:1.75});
  // pebbles creep upward off the floor while the seal spreads
  const peb=[]; for(let i=0;i<22;i++) peb.push({x:x0+rand(-hw,hw)*.9,y:y0+rand(-hh,hh)*.8,s:rand(4,11),d:rand(0,1),v:rand(120,300)});
  let t=0; V.ultTick=dt=>{ t+=dt; seal.r=lerp(40,R*.95,easeOut(Math.min(1,t/1.5))); seal.a=t>4.2?Math.max(0,.5*(1-(t-4.2)/.5)):t>1.9?Math.max(.5,.95-(t-1.9)*1.5):.95; Cn.shake(t<1.8?.12:0); };
  V.ultDraw=()=>{ if(t>2) return; for(const p of peb){ const k=t-p.d; if(k<=0) continue; const z=k*p.v; ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(p.x,p.y,p.s,p.s*.4,0,0,TAU); ctx.fill(); ctx.fillStyle='#39413c'; ctx.beginPath(); ctx.arc(p.x,p.y-z,p.s,0,TAU); ctx.fill(); glow(fx,p.x,p.y-z,p.s*2.4,JADE,.2); } };
  Cn.gather(x0,y0-BODY*1.1,{c:JADE,dur:.9,r:900,n:36,cs:[JADE,C2,'#ffffff'],fy:y0});
  // release: the drum
  after(1.82,()=>{ Cn.release(x0,y0,JADE); Cn.SND.gong(.7); Cn.zoom(.86); Cn.cam(null); Cn.setDark(.82,{spot:null}); });
  const T=onScreen(100).sort(()=>Math.random()-.5).slice(0,22), pts=T.map(e=>[e.x,e.y]); while(pts.length<22) pts.push([x0+rand(-hw,hw)*.9,y0+rand(-hh,hh)*.85]);
  let at=2.0, gap=.22;
  pts.forEach(([x,y],i)=>{ const hitAt=dropFx('fx_shaman_rock',x,y,880,at,{shadow:180})??at;
    after(hitAt,()=>{ fring(x,y,1100,JADE,.35,6); burst(x,y,6,{rock:true}); SFX.boom(.9+Math.random()*.3,.55); Cn.shake(.38+i*.012); hitstop=Math.max(hitstop,.018); inCircle(x,y,230,o=>ultHit(o,Dm*.4,x,y));
      smoke(x,y,70,{vy:-80,a:.35,life:1.2,grow:90,c:'46,44,40'}); if(i%3===0) Cn.scar({x,y,r:200,c:JADE,life:7,heat:1.6}); });
    at+=gap; gap=Math.max(.055,gap*.86); });
  // climax: the one that takes the light with it
  const tc=at+.05, [mx,my]=[x0,y0-hh*.2];
  after(tc,()=>{ Cn.omen(mx,my,820,JADE,.72); Cn.zoom(.8); Cn.setDark(.96,{spot:null}); Cn.SND.inhale(.7,.7); duck(.2,.6); });
  const lead=dropFx('fx_shaman_rock',mx,my,3500,tc+.72,{})??tc+.72;
  after(lead,()=>{ V.shadow=null; Cn.impact(mx,my-80,{style:'paper',c:JADE,n:3,r:.16,then:()=>{ Cn.waves(mx,my,JADE,{n:4,s:1.25,dust:26,dc:'58,54,46'}); Cn.scar({x:mx,y:my,r:900,c:JADE,life:10,heat:3.4}); Cn.wash('200,255,230',.28,0,mx,my); Cn.SND.gong(1);
      burst(mx,my,40,{rock:true,s0:400,s1:1500,size:26,vz:1500}); Cn.sweep(mx,my,Dm,{speed:3000,push:1.3}); Cn.setDark(.35); Cn.ashFall(2.8,JADE,34,{glow:true,up:true}); }}); });
  after(lead+.9,()=>{ Cn.smokeRise(mx,my,520,{n:14,dur:1.2,c:'50,48,42',a:.4}); Cn.embers(mx,my,640,JADE,{n:36,dur:1.4}); Cn.setDark(0); Cn.zoom(1); });
  after(lead+1.65,ultStop); }

// SPIRIT KING: he only prays. Something enormous opens its eyes behind him, and it is its hands that do the work - the last one covers the sky.
function ultKing(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), x0=pl.x, y0=pl.gy;
  S([['gy01',.12],['gy02',.18],['gy03',.25],['gy04',.7],['gy05',.7],['gy06',.12,{kick:[-.8,.6]}],['gy07',.2],['gy08',.7],['gy09',.7],['gy10',.8],['gy11',.18,{kick:[1.6,-1.2]}],['gy12',.7],['gy13',.8],['gy14',9]]);
  Cn.setDark(.88,{c:'1,9,8',spot:{x:x0,y:y0-BODY*.6,r:820,a:.2}}); Cn.zoom(1.28); Cn.cam(x0,y0-BODY*2.4,4); SFX.choir(5.2); SFX.bell(); Cn.drone(49,.3);
  const dv=spr('deity'), pm=spr('palm'); let t=0, eyes=0, big=null;
  V.ultTick=dt=>{ t+=dt; eyes=Math.max(0,eyes-dt*1.6); if(Math.random()<.5) gl0(x0+rand(-520,520),y0+rand(-200,120),rand(5,12),pick([JADE,C2]),1.1,{vy:-rand(160,420),a:.7,sway:rand(0,TAU)}); };
  // the king rises behind him: dark body against the dark, lit edges, eyes that open
  V.ultDraw=()=>{ if(dv){ const a=Math.min(1,t/1.1)*(t>5?Math.max(0,1-(t-5)/.7):1), h=1750, w=h*dv.w/dv.h, y=y0+160-Math.min(1,t/1.4)*200-(t>5?(t-5)*260:0), bob=Math.sin(RT*1.3)*14;
      ctx.save(); ctx.globalAlpha=.5*a*(big?.12:1); ctx.drawImage(dv.im,x0-w/2,y-h+bob,w,h); ctx.restore(); fx.save(); fx.globalAlpha=(.2+.3*eyes)*a*(big?.08:1); fx.drawImage(dv.im,x0-w/2,y-h+bob,w,h); fx.restore(); fx.globalAlpha=1;
      glow(fx,x0,y-h*.62+bob,760,JADE,(.16+.2*eyes)*a); }
    if(big&&pm){ const k=Math.min(1,(RT-big.t0)/.34), e=k*k, s=lerp(3400,1500,e), w=s*pm.w/pm.h; ctx.save(); ctx.globalAlpha=.25+.75*e; ctx.drawImage(pm.im,big.x-w/2,big.y-s*.55-lerp(1300,0,e),w,s); ctx.restore(); ctx.globalAlpha=1; glow(fx,big.x,big.y-lerp(1300,0,e),s*.6,JADE,.3*e); } };
  Cn.gather(x0,y0-BODY*.9,{c:JADE,dur:1,r:900,n:40,cs:[JADE,C2,'#ffffff'],fy:y0});
  // release: its eyes open
  after(1.95,()=>{ Cn.release(x0,y0,JADE); eyes=1; Cn.zoom(.86); Cn.setDark(.86,{spot:null}); Cn.cam(x0,y0-BODY*1.4,5); SFX.roar(1.1,.5); Cn.SND.gong(.9); });
  const T=onScreen(150), spots=[]; for(let i=0;i<4;i++){ const e=T.length?T[(Math.random()*T.length)|0]:null; spots.push(e?X.inView(e.x,e.y,.75):[x0+rand(-hw,hw)*.7,y0+rand(-hh,hh)*.7]); }
  let at=2.35;
  spots.forEach(([x,y],i)=>{ const hitAt=dropFx('fx_shaman_palm',x,y,1350,at)??at;
    after(hitAt-.4,()=>{ Cn.omen(x,y,420,JADE,.4); Cn.cam(lerp(x0,x,.35),lerp(y0,y,.35)-BODY,6); sfx('whoosh',.5,.9); });
    after(hitAt,()=>{ V.shadow=null; fring(x,y,2800,JADE,.5,10); fring(x,y,1600,'#ffffff',.3,4); Cn.shake(.85); hitstop=Math.max(hitstop,.06); Cn.SND.hit(.6); burst(x,y,14,{rock:true}); Cn.flash(.3); post.ca=.008;
      Cn.scar({x,y,r:330,c:JADE,life:8,heat:2.2}); Cn.scar({kind:'burn',x,y,r:300,c:JADE,life:8,heat:2}); V.blast={x,y,p:1}; inCircle(x,y,480,o=>ultHit(o,Dm*.5,x,y)); smoke(x,y,110,{vy:-60,a:.35,life:1.4,grow:120,c:'30,46,42'}); });
    at+=Math.max(.3,.44-i*.05); });
  // climax: the hand that covers the sky
  const tc=at+.25, bx=x0, by=y0-hh*.12;
  after(tc,()=>{ Cn.zoom(.8); Cn.cam(bx,by-BODY,6); Cn.setDark(.97); Cn.SND.inhale(.55,.7); eyes=1; duck(.2,.5); });
  after(tc+.24,()=>{ big={x:bx,y:by,t0:RT}; Cn.omen(bx,by,860,JADE,.34); });
  after(tc+.58,()=>{ V.shadow=null; Cn.impact(bx,by-60,{style:'paper',c:JADE,n:3,r:.18,then:()=>{ big=null; const K=VFX.fx_shaman_palm; if(K&&K.f[0].ok){ const v=vfx('fx_shaman_palm',bx,by,{px:K.ix,py:K.iy,sc:2300/K.h}); if(v){ v.age=K.hit*K.ms/1000; v.life-=v.age; } }
      Cn.waves(bx,by,JADE,{n:4,s:1.25,dust:22,dc:'30,50,46'}); Cn.scar({kind:'seal',x:bx,y:by,r:720,c:JADE,life:10,heat:4}); Cn.wash('190,255,225',.26,0,bx,by); burst(bx,by,30,{rock:true,s0:400,s1:1400,size:22});
      Cn.sweep(bx,by,Dm,{speed:3200,push:1.2}); Cn.setDark(.4); Cn.ashFall(3,JADE,40,{glow:true,up:true}); }}); });
  // afterglow: it goes back up as light; the bell again
  after(tc+1.3,()=>{ t=Math.max(t,5); SFX.bell(.7); Cn.embers(bx,by,680,JADE,{n:44,dur:1.6}); Cn.setDark(0); Cn.zoom(1); Cn.cam(null); });
  after(tc+2.05,ultStop); }

X.reg('shaman',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('sh_basic')-1))},skills:SKILL,ults:{sh_ult1:ultStones,sh_ult2:ultKing}});
})();
