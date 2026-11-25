// BERSERKER normal skills (window.AxeSkills). Plan: _gen/v3/axe_plan.md. Loaded before sk_axe.js, which merges .sk into its table and registers .skills.
// One shape per skill, all of it landing on the enemies: cleave = a standing crescent and a fissure that splits forward and burns, whirl = a tilted
// band of fire turning round him that drags them in, pillar = gold light falling from the sky onto a crowd and fire bursting at its foot,
// bolt = red-gold lightning called down on three, seal = a gold rune disc that binds and then blows up into fire, throw = a burning axe spinning out
// and back, trail = a charge that leaves a low wall of fire burning on its line, burst = one huge ball of fire and a whirl of flame from his body.
'use strict';
(()=>{
const X=RPG.sv, FSY=X.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inLine,sfx,onScreen}=X;
const K=window.K3, F=window.FX3, PI=Math.PI, mix=(a,b,k)=>a+(b-a)*k, sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k);
// fire as a black body (same as sk_axe.js PAL, copied because AxeKit is defined after this file loads)
const PF={d:'#1a0602',b:'#8a1a06',m:'#ff5a14',h:'#fff4d8',l:'#ff6a1c',s:'#ffc24a'};
// the hot body of the volumes: deep red-orange, amber heat, yellow-white core
const PH={d:'#300500',b:'#ff4208',m:'#ffae24',h:'#fff3c4',l:'#ff6a1c',s:'#ffc478'};
const PE={d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'};
const PG={d:'#2a1606',b:'#b8741e',m:'#ffd27a',h:'#fff6dc',l:'#ffae34',s:'#ffe6a0'};
// lightning: red skin, gold body, white thread
const PL={d:'#2a0600',b:'#ff3a10',m:'#ffc24a',h:'#fffbe8',l:'#ff5a20',s:'#ffd080'};
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const ordered=id=>(V.cd[id]||0)>0;
const yawTo=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
const mk=(n,a)=>{ if(window.MK&&MK.on()) MK.play(n,{yaw:yawTo(a),blend:.05}); };
// the blade's centre in the world (falls back to a point in front of him)
const edge=a=>{ if(window.MK&&MK.on()&&MK.M&&MK.M.J) return MK.wpt('xc'); return [pl.x+Math.cos(a)*90,pl.gy+Math.sin(a)*90,BODY*.6]; };
const fd=(dx,dy)=>Math.atan2(dy/FSY,dx);
const away=(e,x,y)=>fd(e.x-x,e.y-y);
let hT=-1, hN=0;
const ehit=(e,o)=>{ if(hT!==RT){ hT=RT; hN=0; } if(hN++<6) K.ehit(e,o); else hitFx(e,'#ff6a1c'); };
const burn=(e,dur)=>K.mark(e,'burn',{dur,max:2,s:.85,pal:PH});
const embers=(x,y,z,n,r=60)=>K.sparks(x,y,z,{pal:PH,n,sp:[20,r*2.4],up:420,life:[.45,1],s:3});
let ART=null, BLD=null; const art=()=>{ if(!ART&&F&&F.on){ const m=K.mats(); ART=F.mat({...m.art,tex:'v3_spin_ring',layer:'o'}); BLD=F.mat({...m.art,tex:'v3_slash_heavy',layer:'o'}); } return ART; };
if(F&&F.on){ for(const n of ['v3_spin_ring','v3_slash_heavy','v3_slash_thin','v3_circ_pyro']) F.img(n); }
const tgt=(id,r,r2)=>nearest(r)||(ordered(id)&&nearest(r2||1300));

const sk={};
const def=(id,name,lv,cd,dm,desc,evo)=>{ sk[id]={cls:'axe',type:'skill',name,lv,cd,dmg:dm,desc,evo}; };
def('ax_cleave','화염 내려찍기',1,4.5,2800,'도끼를 머리 위에서 내려찍어 세로로 선 불의 초승달을 그리고, 앞으로 갈라지는 땅에서 불길을 뿜어 줄지어 선 적을 띄운다.','균열이 더 길게 뻗고 끝에서 큰 불덩이가 터진다.');
def('ax_whirl','선풍부',1,6,1100,'도끼를 휘두르며 세 바퀴 돌아 몸 둘레에 화염 고리를 만든다. 주변 적을 끌어당겨 베고 마지막에 바깥으로 날려 버린다.','한 바퀴를 더 돌고 끌어당기는 범위가 넓어진다.');
def('ax_pillar','천광추',2,7,3400,'적이 몰린 곳에 하늘에서 금빛 빛줄기를 떨어뜨리고, 도끼를 내려찍는 순간 그 밑동에서 화염이 터져 적을 띄운다.','빛줄기가 두 곳에 떨어진다.');
def('ax_bolt','낙뢰부',3,7.5,2600,'도끼를 하늘로 치켜들어 가까운 적 3명에게 붉은 금빛 낙뢰를 내리꽂는다. 맞은 적은 잠시 감전된다.','낙뢰가 5줄기가 된다.');
def('ax_seal','화륜진',5,9,3800,'적 무리 발밑에 금빛 룬진을 새겨 묶어 두었다가, 도끼를 올려베는 순간 진 전체를 불기둥으로 터뜨린다.','진이 넓어지고 묶는 시간이 길어진다.');
def('ax_throw','회전 투부',6,8,1700,'불붙은 도끼를 회전시켜 던진다. 도끼는 적을 꿰뚫고 날아갔다가 다시 손으로 돌아오며 한 번 더 벤다.','도끼가 더 멀리 날아가고 지나간 자리가 불탄다.');
def('ax_trail','염화 돌진',8,9.5,2000,'도끼를 끌며 적을 향해 돌진해 가로베고, 지나간 자리에 낮은 불벽을 남겨 그 위의 적을 계속 태운다.','불벽이 4초 동안 남는다.');
def('ax_burst','폭염',10,13,9000,'도끼에 불을 응축했다가 땅에 내려찍어 몸에서 거대한 화구와 불의 소용돌이를 터뜨려 주변 적을 모두 날려 버린다.','폭발 범위가 크게 넓어진다.');

const SKILL={
  // FLAME CLEAVE: overhead chop -> a crescent standing upright in front of him, and from where the blade hits, a fissure that runs forward splitting the
  // floor; fire bursts out of it in three tongues one after another and throws up whatever stood on the line
  ax_cleave:{fn(id){ const e=tgt(id,560); if(!e) return false; const a=angTo(e), d=D(id), lv=L(id), Lc=(EVO(id)?820:640)+lv*16; face(a); mk('xChop',a); sfx('slash',.9);
    after(.17,()=>{ const ca=Math.cos(a), sa=Math.sin(a), hx=pl.x+ca*120, hy=pl.gy+sa*120, x1=hx+ca*Lc, y1=hy+sa*Lc, jd=fd(ca,sa);
      K.cres(pl.x,pl.gy,BODY*.6,{reach:340,dir:a,lean:.9,roll:-1,tex:'v3_slash_heavy',pal:PH,gain:1.05,swing:.06,hold:.16,fade:.38,sparks:0,light:0});
      K.cres(pl.x,pl.gy,BODY*.6,{reach:300,dir:a,lean:.9,roll:-1,tex:'v3_slash_thin',pal:PG,gain:1.2,swing:.05,hold:.08,fade:.25,sparks:0,light:0});
      K.flare(hx,hy,30,{pal:PH,s:180,dur:.1,gain:1.8}); K.chunks(hx,hy,{n:4,r:50,sp:[260,700],up:1300,s:[18,34]}); K.dust(hx,hy,{n:6,dir:jd,spread:.9,sp:[200,700],a:.4});
      K.coolLine(hx,hy,x1,y1,{w:58,pal:PF,life:2.6,hot:.8,grow:.24});
      K.vsheet(hx+ca*40,hy+sa*40,x1,y1,{h:230,thick:44,dur:.95,rise:.24,out:.5,pal:PH,heat:1.25,turb:.95,delay:.03});
      [.3,.62,1].forEach((u,i)=>{ const px=mix(hx,x1,u), py=mix(hy,y1,u), last=i===2;
        K.vblast(px,py,{s:last?(EVO(id)?260:200):140,pal:PH,smoke:.7,dur:last?1.1:.8,fire:.26,rise:last?220:130,heat:.95,lump:.65,gain:.85,delay:.06+u*.2});
        after(.06+u*.2,()=>{ GFX.light(px,py,last?620:420,PF.l,.8,.3,{z:120}); K.sparks(px,py,40,{pal:PH,n:last?16:8,sp:[100,500],up:1900,life:[.3,.7]}); if(last){ K.cool(px,py,{kind:'crack2',r:190,rot:a,pal:PF,life:2.4}); K.chunks(px,py,{n:3,r:60,sp:[260,640],up:1400,s:[16,30]}); } }); });
      GFX.light(hx,hy,520,PF.l,.9,.25,{z:160}); trauma=Math.min(1,trauma+.28); hitstop=Math.max(hitstop,.05); sfx('boom',.7,.6);
      after(.9,()=>{ for(let i=0;i<3;i++){ const u=.25+i*.35; embers(mix(hx,x1,u),mix(hy,y1,u),30,3,40); } K.vsmoke(x1,y1,{s:110,z:140,dur:.9,a:.3,rise:260}); });
      const hit=new Set(); inLine(pl.x,pl.gy,x1,y1,115,o=>{ if(hit.has(o)) return; hit.add(o); const u=sat(Math.hypot(o.x-hx,o.y-hy)/Lc), sd=((o.x-hx)*-sa+(o.y-hy)*ca)>=0?1:-1;
        after(.04+u*.22,()=>{ if(o.dead) return; ehit(o,{pal:PH,dir:jd,pw:1.3}); K.knock(o,{dir:jd+sd*.6,dist:200,up:1500}); burn(o,1.6); dmg(o,d,{kb:0}); }); }); });
    return true; }},

  // WHIRLWIND AXE: three (four) full turns; each turn draws a ring of crescents round him tilted like a band over the floor, a rolling torus of fire
  // keeps him company; every turn drags what is round him inward, the last one throws it all out
  ax_whirl:{fn(id){ if(countIn(380)<2&&!nearest(230)&&!ordered(id)) return false; const d=D(id), n=EVO(id)?4:3, R=EVO(id)?620:520, e0=nearest(R), a0=e0?angTo(e0):0, ST=.21;
    sfx('slash',.8); K.vring(pl.x,pl.gy,{r:430,r0:360,dur:ST*n+.45,heat:1.4,pal:PH,tube:.12,smoke:.25,delay:.15});
    // three tongues of fire ride the ring round him the way the axe turns, each its own height; they lean out and go when the last turn throws
    const TL=ST*n+.25, sp=-2*PI/(ST*1.05), TG=[0,1,2].map(j=>({b:a0+j*2.1,h:K.vcolumn(pl.x,pl.gy,{r:46,h:[360,280,320][j],dur:TL,rise:.18,out:.3,pal:PH,twist:3,turb:.9,taper:.6,heat:1.25,delay:.15})}));
    GFX.add(TL+.15,(k,t)=>{ const rr=330+40*Math.sin(t*3); for(const g of TG){ const b=g.b+sp*t; g.h.x=pl.x+Math.cos(b)*rr; g.h.y=pl.gy+Math.sin(b)*rr*FSY; } });
    for(let i=0;i<n;i++) after(i*ST,()=>{ const a=a0+i*2.2, last=i===n-1, x=pl.x, y=pl.gy; mk('xSweep',a);
      after(.17,()=>{ for(let j=0;j<3;j++){ const b=a+PI*.5+j*2.1; K.cres(x,y,BODY*.42,{reach:270+i*12,dir:b,lean:.14,roll:.28,tex:j?'v3_slash_thin':'v3_slash_heavy',pal:j?PE:PH,gain:1.15,swing:.07,hold:.05,fade:.24,sparks:j?0:8,light:0}); }
        GFX.light(x,y,700,PF.l,.75,.22,{z:120}); K.dust(x,y,{n:4,sp:[200,600],a:.32}); sfx('slash',.5,.5);
        inCircle(x,y,R,o=>{ const dd=Math.hypot(o.x-x,(o.y-y)/FSY);
          if(!last){ dmg(o,d,{kb:0,stun:.4}); hitFx(o,'#ff6a1c'); if(dd>150) K.knock(o,{dir:fd(x-o.x,y-o.y),dist:Math.min(dd-130,230),stun:.45,fx:0}); }
          else { dmg(o,d*1.6,{kb:0}); ehit(o,{pal:PH,pw:1.2,ring:0}); K.knock(o,{from:[x,y],dist:340,up:1100}); burn(o,1.4); } });
        if(last){ K.vblast(x,y,{s:170,z:BODY*.3,pal:PH,smoke:.4,dur:.6,fire:.25,rise:80,lump:.6}); K.shock(x,y,{r:520,dur:.36,pal:PH,dust:0,light:0});
          K.sparks(x,y,BODY*.4,{pal:PH,n:22,sp:[700,1800],up:300,life:[.2,.5]}); K.cool(x,y,{kind:'ring',r:380,pal:PF,life:2.2,hot:.8,light:0}); K.cool(x,y,{kind:'scorch',r:240,pal:PF,life:2.4,start:.3,light:0});
          trauma=Math.min(1,trauma+.3); hitstop=Math.max(hitstop,.05); after(.5,()=>embers(x,y,30,6,90)); } }); });
    return true; }},

  // HEAVENLY PILLAR: he lifts the axe and a shaft of gold light grows down out of the sky onto the thick of them; he chops and the foot of the light
  // bursts into fire: the bodies fly up out of it, a crater is left smoking and glowing
  ax_pillar:{fn(id){ const t=densest(820)||(ordered(id)&&nearest(1300)); if(!t) return false; const d=D(id), a=angTo(t), PTS=[[t.x,t.y]];
    if(EVO(id)){ const o=onScreen(-60).filter(q=>q!==t&&Math.hypot(q.x-t.x,q.y-t.y)>330).sort((p,q)=>Math.hypot(p.x-pl.x,p.y-pl.gy)-Math.hypot(q.x-pl.x,q.y-pl.gy))[0]; if(o) PTS.push([o.x,o.y]); }
    face(a); mk('xRise',a); sfx('fire',.6,.5); after(.36,()=>mk('xChop',a));
    PTS.forEach(([x,y],i)=>{ const dl=i*.12;
      K.godray(x,y,{r:240,r1:110,h:2600,dur:.75,in:.4,out:.35,pal:PG,gain:1.15,delay:dl});
      GFX.light(x,y,420,PG.l,.7,.4,{z:60});
      after(.56+dl,()=>{ K.flare(x,y,90,{pal:PG,s:220,dur:.12,gain:1.8});
        K.vblast(x,y,{s:280,pal:PH,smoke:1,dur:1.4,fire:.32,rise:340,heat:1,lump:.6,band:.6,gain:.85});
        K.vcolumn(x,y,{r:70,h:640,dur:.6,rise:.08,out:.35,pal:PH,twist:2.6,turb:.8,taper:.55,heat:1.5});
        K.vring(x,y,{r:420,r0:80,dur:.5,heat:1.6,pal:PH,tube:.1,smoke:.3});
        K.chunks(x,y,{n:5,r:70,sp:[300,800],up:1600,s:[20,38]}); K.sparks(x,y,40,{pal:PG,n:18,sp:[100,500],up:2400,life:[.35,.8]});
        K.cool(x,y,{kind:'crater',r:240,pal:PF,life:3,light:0});
        GFX.light(x,y,800,PF.l,.85,.4,{z:260,flick:.15}); trauma=Math.min(1,trauma+.35); hitstop=Math.max(hitstop,.06); sfx('boom',1,.7);
        after(.8,()=>embers(x,y,40,6,90));
        inCircle(x,y,260,o=>{ ehit(o,{pal:PG,pw:1.3,dir:-PI/2,ring:0}); K.knock(o,{from:[x,y],dist:Math.hypot(o.x-x,o.y-y)<40?120:260,up:2000,stun:.9}); burn(o,2); after(.25,()=>{ if(!o.dead) dmg(o,d,{kb:0}); }); }); }); });
    return true; }},

  // AXE OF THUNDER: the axe goes up past his head, its edge flashes, and red-gold lightning is called down on the nearest three (five)
  ax_bolt:{fn(id){ const T=onScreen(-60); if(!T.length) return false; if(!nearest(900)&&!ordered(id)) return false; const d=D(id), n=EVO(id)?5:3;
    const L_=T.sort((p,q)=>Math.hypot(p.x-pl.x,p.y-pl.gy)-Math.hypot(q.x-pl.x,q.y-pl.gy)).slice(0,n), a=angTo(L_[0]); face(a); mk('xRise',a); sfx('thunder',.5,.6);
    after(.2,()=>{ const [bx,by,bz]=edge(a); K.flare(bx,by,bz,{pal:PL,s:170,dur:.2,gain:2.4}); K.sparks(bx,by,bz,{pal:PL,n:14,sp:[200,700],up:900,life:[.2,.45]}); GFX.light(pl.x,pl.gy,460,PL.l,.8,.3,{z:bz}); });
    L_.forEach((e,i)=>after(.26+i*.09,()=>{ if(e.dead) return; const x=e.x, y=e.y;
      K.lightning(x,y,{pal:PL,w:17,strokes:3,span:.35,after:.4,branches:4,sx:(Math.random()-.5)*600,sy:-200});
      K.mark(e,'shock',{dur:1.2,pal:PL}); ehit(e,{pal:PL,pw:1.3,dir:-PI/2}); K.knock(e,{from:[x-1,y-1],dist:90,up:1000,stun:.8});
      dmg(e,d,{kb:0}); inCircle(x,y,150,o=>{ if(o!==e){ dmg(o,d*.4,{kb:0}); hitFx(o,'#ffc24a'); } });
      trauma=Math.min(1,trauma+.15); sfx('thunder',.4,.5); }));
    return true; }},

  // FIRE WHEEL SEAL: the axe bites the floor and a gold rune disc is written under the crowd; it holds them (a seal turning over each one) and pulls
  // them in; then he cuts upward and the disc erupts: a ring of fire columns of different heights round a fireball, every seal bursts
  ax_seal:{fn(id){ const t=densest(760)||(ordered(id)&&nearest(1300)); if(!t) return false; const d=D(id), R=EVO(id)?400:330, HOLD=EVO(id)?1.25:1, a=angTo(t), x=t.x, y=t.y; face(a); mk('xChop',a); sfx('slash',.6);
    after(.18,()=>{ const [bx,by]=edge(a); K.flare(bx,by,20,{pal:PG,s:160,dur:.12,gain:2}); K.cool(bx,by,{kind:'crack',r:110,pal:PG,life:1.6,light:0});
      const S=K.sigil(x,y,{r:R,pal:PG,tex:'v3_circ_pyro',dur:HOLD+.45,in:.28,out:.18,spin:.7,gain:1.1});
      GFX.light(x,y,R*1.8,PG.l,.7,HOLD,{z:40,hold:HOLD*.8});
      inCircle(x,y,R*1.05,o=>{ K.mark(o,'seal',{dur:HOLD+.3,pal:PG,tex:'v3_circ_pyro',s:.7}); o.stun=Math.max(o.stun||0,HOLD+.15); dmg(o,d*.15,{kb:0,stun:HOLD});
        const dd=Math.hypot(o.x-x,(o.y-y)/FSY); if(dd>90) K.knock(o,{dir:fd(x-o.x,y-o.y),dist:Math.min(dd*.55,170),stun:HOLD,fx:0}); });
      after(HOLD*.5,()=>S.kick());
      after(HOLD-.2,()=>mk('xRise',angTo({x,y})));
      after(HOLD,()=>{ S.kick(); K.vblast(x,y,{s:R*.55,pal:PH,smoke:.9,dur:1.3,fire:.3,rise:300,heat:1,lump:.55,gain:.85});
        const N=5; for(let i=0;i<N;i++){ const b=i/N*PI*2+.4, px=x+Math.cos(b)*R*.78, py=y+Math.sin(b)*R*.78*FSY, hh=[640,360,820,420,560][i];
          K.vcolumn(px,py,{r:52+i%2*16,h:hh,dur:.8+i*.05,rise:.1,out:.38,pal:PH,twist:i%2?-2.4:2.4,turb:.85,taper:.55,heat:1.35,delay:i*.03}); }
        K.shock(x,y,{r:R*1.5,dur:.4,pal:PH,dust:0,light:0}); K.sparks(x,y,40,{pal:PH,n:22,sp:[200,700],up:2000,life:[.3,.8]});
        K.cool(x,y,{kind:'ring',r:R,pal:PF,life:3,hot:.8,light:0});
        GFX.light(x,y,R*2.6,PF.l,1,.45,{z:220,flick:.12}); trauma=Math.min(1,trauma+.35); hitstop=Math.max(hitstop,.06); sfx('boom',1,.7);
        let hn=0; inCircle(x,y,R*1.15,o=>{ const h=K.marked(o,'seal'); if(h){ if(hn++<4) h.pop({pw:.9}); else h.end(); } ehit(o,{pal:PH,pw:1.2,ring:0}); K.knock(o,{from:[x,y],dist:280,up:1700}); burn(o,1.8); after(.2,()=>{ if(!o.dead) dmg(o,d,{kb:0}); }); });
        after(1,()=>embers(x,y,30,8,R*.6)); }); });
    return true; }},

  // SPINNING AXE THROW: overhand release; the axe is a wheel of fire turning edge over edge with a stream of flame behind it, it cuts through
  // everything on the way out, hangs at the far end, and comes back to his hand cutting again
  ax_throw:{fn(id){ const e=tgt(id,720,1400); if(!e) return false; const d=D(id), a=angTo(e), ca=Math.cos(a), sa=Math.sin(a), Lt=Math.min(EVO(id)?900:760,Math.hypot(e.x-pl.x,(e.y-pl.gy)/FSY)+220), TO=.42, TB=.42, TH=.08, TT=TO+TH+TB, Z=BODY*.5;
    face(a); mk('xThrow',a); sfx('slash',.7);
    after(.19,()=>{ const x0=pl.x+ca*60, y0=pl.gy+sa*60, xf=x0+ca*Lt, yf=y0+sa*Lt;
      // position along the way out (ease-out), the hang at the far end, the way back to wherever he now stands (ease-in)
      const pos=t=>{ if(t<TO){ const k=eo3(t/TO); return [mix(x0,xf,k),mix(y0,yf,k)]; } if(t<TO+TH) return [xf,yf]; const k=sat((t-TO-TH)/TB), q=k*k; return [mix(xf,pl.x,q),mix(yf,pl.gy,q)]; };
      const vel=t=>{ const p=pos(t), q=pos(t+.02); return fd(q[0]-p[0],q[1]-p[1]); };
      const lt=GFX.light(x0,y0,420,PF.l,.8,TT,{z:Z,hold:TT}), jet=K.vjet(x0,y0,Z,a+PI,{len:260,r:90,r0:40,dur:TT,in:.05,out:.12,pal:PH,heat:1.4,turb:.7,speed:12});
      K.coolLine(x0,y0,xf,yf,{w:46,pal:PF,life:EVO(id)?2.6:1.8,hot:.75,grow:TO});
      let sp=0; GFX.add(TT,(k,t)=>{ const [px,py]=pos(t), dv=vel(t); lt.x=px; lt.y=py; jet.x=px; jet.y=py; jet.dir=dv+PI; const m=art(); if(!m) return;
        const rot=t*-26, s=150; F.bill(m,px,py,Z+s*.1,s,s,rot,{cA:PH.d,cB:PH.b,cM:PH.m,cC:PH.h,a:1,gain:3,ero:.08,nk:.1,uvT:[1,1,0,0]});
        F.bill(m,px,py,Z+s*.1,s*.7,s*.7,rot+1.6,{cA:PG.d,cB:PG.b,cM:PG.m,cC:PG.h,a:.9,gain:3.2,ero:.12,nk:.1,uvT:[-1,1,1,0]});
        // the blade itself: a heavy crescent turning with the wheel, white-hot on its edge
        F.bill(BLD,px,py,Z+s*.1,s*.62,s*.62,rot*1.02+.8,{cA:PE.d,cB:PE.b,cM:PH.m,cC:PH.h,a:1,gain:2.6,ero:.06,nk:.05,uvT:[1,1,0,0]});
        if(t-sp>.03){ sp=t; K.sparks(px,py,Z,{pal:PH,n:2,dir:dv+PI,spread:.6,sp:[200,600],up:200,life:[.15,.35],s:3}); } });
      const hitA=new Set(), hitB=new Set();
      for(let t=0;t<=TT+.001;t+=.04) after(t,()=>{ const [px,py]=pos(t), back=t>TO+TH, H=back?hitB:hitA, dv=vel(t);
        inCircle(px,py,140,o=>{ if(H.has(o)) return; H.add(o); ehit(o,{pal:PH,pw:1.15,dir:dv}); K.knock(o,{dir:dv,dist:back?160:220,up:700}); burn(o,1.4); dmg(o,d,{kb:0}); }); });
      after(TO,()=>{ K.flare(xf,yf,Z,{pal:PH,s:200,dur:.14,gain:2}); K.vblast(xf,yf,{s:130,z:Z*.6,pal:PH,smoke:.5,dur:.6,fire:.24,rise:90}); K.cool(xf,yf,{kind:'scorch',r:150,pal:PF,life:2,light:0}); sfx('fire',.5,.6); });
      after(TT,()=>{ K.flare(pl.x,pl.gy,BODY*.6,{pal:PG,s:150,dur:.1,gain:2}); K.sparks(pl.x,pl.gy,BODY*.6,{pal:PH,n:10,sp:[200,700],up:400,life:[.15,.35]}); }); });
    return true; }},

  // BLAZING CHARGE: he drags the axe and crosses to them; on arrival a flat sweep; behind him the whole line stands as a low ragged wall of fire that keeps
  // burning whatever walks into it, then sinks into a glowing cut that cools
  ax_trail:{moves:true,fn(id){ const e=tgt(id,600,1200); if(!e) return false; const a=angTo(e), d=D(id), T=EVO(id)?4:2.4, ca=Math.cos(a), sa=Math.sin(a), Ld=Math.min(640,Math.hypot(e.x-pl.x,e.y-pl.gy)+120), x0=pl.x, y0=pl.gy, x1=x0+ca*Ld, y1=y0+sa*Ld, jd=fd(ca,sa);
    face(a); mk('xSweep',a); V.dash={x0,y0,x1,y1,t:0,dur:.16}; RPG.inv=Math.max(RPG.inv||0,.35); sfx('fire',.8,.6);
    K.dust(x0,y0,{n:8,dir:jd+PI,spread:.6,sp:[260,720],a:.38}); K.sparks(x0,y0,20,{pal:PH,n:10,dir:jd+PI,spread:.5,sp:[300,900],up:300,life:[.2,.4]});
    K.coolLine(x0,y0,x1,y1,{w:72,pal:PF,life:T+.8,hot:.85,grow:.16});
    K.vsheet(x0,y0,x1,y1,{h:330,thick:58,dur:T,rise:.22,out:.7,pal:PH,heat:1.2,turb:1.05,delay:.04});
    for(let i=0;i<3;i++){ const u=.2+i*.3; K.vcolumn(mix(x0,x1,u),mix(y0,y1,u),{r:44,h:[420,520,380][i],dur:T*.55+i*.2,rise:.14,out:.5,pal:PH,twist:i%2?-2:2,turb:.9,taper:.6,heat:1.2,delay:.04+u*.14}); }
    GFX.light((x0+x1)/2,(y0+y1)/2,Math.max(600,Ld*1.2),PF.l,.8,T,{hold:T*.7,z:120,flick:.2});
    after(.2,()=>{ const hx=x1+ca*80, hy=y1+sa*80;
      K.cres(x1,y1,BODY*.45,{reach:290,dir:a,lean:.16,roll:.2,tex:'v3_slash_heavy',pal:PH,gain:1.25,swing:.07,hold:.08,fade:.3,light:0});
      K.vblast(hx+ca*40,hy+sa*40,{s:190,pal:PH,smoke:.6,dur:.75,fire:.3,rise:150,lump:.7});
      K.cool(hx,hy,{kind:'crack2',r:180,rot:a,pal:PF,life:2.2,light:0}); K.chunks(hx,hy,{n:3,r:50,sp:[300,700],up:1200,s:[18,32]});
      GFX.light(hx,hy,620,PF.l,.9,.3,{z:140}); trauma=Math.min(1,trauma+.3); hitstop=Math.max(hitstop,.05); sfx('boom',.8,.6);
      inCircle(hx,hy,230,o=>{ ehit(o,{pal:PH,pw:1.4,dir:jd}); K.knock(o,{dir:jd+(Math.random()-.5)*.6,dist:320,up:1100}); burn(o,1.6); dmg(o,d,{kb:0}); }); });
    after(.08,()=>{ inLine(x0,y0,x1,y1,100,o=>{ const sd=((o.x-x0)*-sa+(o.y-y0)*ca)>=0?1:-1; K.knock(o,{dir:fd(-sa*sd,ca*sd),dist:200,up:900}); burn(o,1.2); dmg(o,d*.6,{kb:0}); hitFx(o,'#ff6a1c'); }); });
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,80,o=>{ dmg(o,d*.25,{kb:0}); burn(o,1); })});
    after(T-.3,()=>{ for(let i=0;i<3;i++){ const u=.2+i*.3; K.vsmoke(mix(x0,x1,u),mix(y0,y1,u),{s:90,z:120,dur:.9,a:.28,rise:240,delay:i*.1}); embers(mix(x0,x1,u),mix(y0,y1,u),30,3,40); } });
    return true; }},

  // INFERNO BURST: fire is pressed into the axe head (a small hot ball drawing sparks in), he chops the floor and his body is the centre of one huge
  // fireball with a whirl of flame standing up through it and a burning torus rolling out; everything round him is thrown off its feet
  ax_burst:{fn(id){ const R=EVO(id)?780:620; if(countIn(R)<5&&!nearest(260)&&!ordered(id)) return false; const d=D(id), e0=nearest(R), a=e0?angTo(e0):0; face(a);
    mk('xRise',a); sfx('fire',.8,.6);
    const orb=K.vorb(pl.x,pl.gy,BODY,{r:70,dur:.5,in:.4,out:.06,pal:PH,spin:5,core:.35,heat:1.1});
    GFX.add(.48,(k,t)=>{ const [bx,by,bz]=edge(a); orb.x=bx; orb.y=by; orb.z=bz; orb.r=50+90*k; if(Math.random()<.5){ const b=Math.random()*PI*2, r=200+Math.random()*160;
      GFX.pt({x:bx+Math.cos(b)*r,y:by+Math.sin(b)*r*FSY,z:bz+(Math.random()-.5)*r,tx:bx,ty:by,tz:bz,pull:9,life:.22,s:3.5,m:3,len:.05,c:GFX.rgb(PH.s),c2:PH.b,L:3}); } });
    GFX.light(pl.x,pl.gy,500,PF.l,.6,.45,{z:BODY});
    after(.3,()=>mk('xChop',a));
    after(.5,()=>{ const x=pl.x, y=pl.gy;
      K.flare(x,y,BODY*.5,{pal:PH,s:360,dur:.12,gain:2});
      K.vblast(x,y,{s:R*.66,pal:PH,smoke:.85,dur:1.8,fire:.42,rise:R*.75,heat:1.2,lump:.5,band:.7,lit:.5,c:'#1a1614',c2:'#5e5048',gain:.9});
      K.vfunnel(x,y,{r:R*.55,r0:110,h:R*1.6,dur:1.5,rise:.25,out:.55,pal:PH,spin:8,thick:.2,heat:1.45,gain:1.2,delay:.12});
      K.vring(x,y,{r:R*1.25,r0:120,dur:.65,heat:1.7,pal:PH,tube:.12,smoke:.35});
      K.shock(x,y,{r:R*1.3,dur:.45,pal:PH,dust:0,light:0}); K.chunks(x,y,{n:6,r:100,sp:[400,1000],up:1700,s:[22,42]});
      K.sparks(x,y,BODY*.5,{pal:PH,n:30,sp:[600,2000],up:900,life:[.3,.8]});
      K.cool(x,y,{kind:'crater',r:R*.42,pal:PF,life:3.2,light:0}); K.cool(x,y,{kind:'scorch',r:R*.85,pal:PF,life:3.4,start:.3,light:0});
      GFX.light(x,y,Math.min(1400,R*2),PF.l,1.1,.6,{z:300,flick:.15}); trauma=Math.min(1,trauma+.55); hitstop=Math.max(hitstop,.08); sfx('boom',1.3,.8);
      inCircle(x,y,R,o=>{ ehit(o,{pal:PH,pw:1.5,ring:0}); K.knock(o,{from:[x,y],dist:440,up:1700}); burn(o,2.2); after(.28,()=>{ if(!o.dead) dmg(o,d,{kb:0}); }); });
      after(1.4,()=>{ for(let i=0;i<4;i++){ const b=i*1.57+.5, px=x+Math.cos(b)*R*.45, py=y+Math.sin(b)*R*.45*FSY; K.vcolumn(px,py,{r:30,h:190,dur:.9,rise:.15,out:.45,pal:PH,taper:.6,turb:.9,delay:i*.08}); embers(px,py,30,4,50); } }); });
    return true; }}
};

window.AxeSkills={sk,skills:SKILL};
})();
