// 참광 survival - SWORDSMAN skill set (top-down, all automatic). Registers with surv.js through RPG.sv.
'use strict';
(()=>{
const SV=()=>RPG.api.SV, G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, mix=(a,b,k)=>a+(b-a)*k, {V,A,SK,BODY,nearest,countIn,angTo,face,seq,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,tdV,ultStart,ultStop,ultHit,burst,fring}=X;

// ============================================================ skills (the RPG's sword set, re-done for a top-down field; all fire on their own)
const SKILL={
  // DASH: a painted lance runs the line he crosses; afterimages on the way, a scorched streak under it, a needle burst where it ends
  sw_dash:{moves:true,range:560,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), L=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+140), d=SK[id].dmg*A.mul(id);
    const x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L; face(a); seq('gs',['05','07','09']);
    V.dash={x0,y0,x1,y1,t:0,dur:.1}; G.inv=Math.max(G.inv,.35);
    const K=K3, P='crimson', dx=Math.cos(a), dy=Math.sin(a), f=pl.f, st=GFX.st(0,'add',{c2:[.82,0,0],c3:[1,.2,.3]});
    for(let i=0;i<3;i++){ const k=(i+.4)/3.4; GFX.add(.2+k*.14,q=>GFX.pose(st,'sword','gs07',mix(x0,x1,k),mix(y0,y1,k),f,[1,.16,.26],(1-q)*(1-q)*.4)); }
    lance(x0-dx*70,y0-dy*70,x1+dx*120,y1+dy*120,{pal:P,draw:.09,hold:.07,fade:.24,core:30}); K.shock(x1,y1,{r:290,dur:.32,pal:P,gain:.7,dust:0,light:0,delay:.08});
    K.gash(x0,y0,x1,y1,{pal:P,life:1.3,w:36,gain:.9,grow:.09}); GFX.light(mix(x0,x1,.6),mix(y0,y1,.6),L*.9,'#ff2440',.9,.35,{z:80});
    K.dust(x0,y0,{n:6,dir:a+Math.PI,spread:.7,sp:[200,600],a:.4});
    after(.08,()=>{ K.art(x1+dx*50,y1+dy*50,{tex:'v3_xburst',s:160,z:BODY*.05,dur:.22,pal:P,gain:.9,hold:.2,s0:.5}); K.sparks(x1,y1,BODY*.5,{pal:P,n:12,dir:a,spread:.6,sp:[500,1500],up:400}); K.dust(x1,y1,{n:5,dir:a,spread:.9,sp:[150,400],a:.35}); });
    sfx('whoosh',1.3,.7); sfx('slash',1.15,1);
    after(.07,()=>inLine(x0,y0,x1,y1,80,e=>{ dmg(e,d,{kb:.8,sx:x0,sy:y0}); hitFx(e,'#ff6a85',1.2); })); }},
  // RISING CUT: one upright crescent pulled out of the floor; the stone it left opens, grit and sparks go up with the enemies
  sw_rise:{range:380,fn(id){ const e=nearest(380); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), cx=pl.x+Math.cos(a)*190, cy=pl.gy+Math.sin(a)*190, f=pl.f=Math.cos(a)>=0?1:-1;
    seq('gt',['03','06','08'],{w:.05});
    const K=K3, P='crimson', dx=Math.cos(a), dy=Math.sin(a);
    upCres(pl.x+dx*40,pl.gy+dy*40,BODY*1.2,{s:370,dir:fa(a),roll:-.1*f,pal:P,swing:.08,hold:.08,fade:.3,gain:1.15,ccw:f>0,sparks:6});
    K.gash(pl.x+dx*50,pl.gy+dy*50,cx+dx*150,cy+dy*150,{pal:P,life:1.4,w:34,gain:.9,grow:.08}); K.shock(cx,cy,{r:270,dur:.34,pal:P,gain:.75,dust:6});
    K.sparks(cx,cy,20,{pal:P,n:14,sp:[150,600],up:1600,life:[.25,.6]}); K.debris(cx,cy,{n:5,r:60,sp:[100,350],up:1100,size:12});
    sfx('whoosh',1.2,.7); sfx('slash',1.1,.9);
    after(.03,()=>inCircle(cx,cy,220,e=>{ dmg(e,d,{kb:.3,launch:1200,stun:.9,sx:cx,sy:cy}); hitFx(e,'#ff9aa8',1.2); })); }},
  // WAVE: painted crescents that fly, edge first, each carrying its own light across the floor
  sw_wave:{range:820,fn(id){ const e=nearest(820); if(!e) return false; const a0=angTo(e), d=SK[id].dmg*A.mul(id), n=A.sLv(id)>=5?5:A.sLv(id)>=3?3:1; face(a0);
    seq('gs',['05','07','09']); sfx('whoosh',1.3,.8); sfx('slash',.9,1.1);
    K3.flare(pl.x+Math.cos(a0)*70,pl.gy+Math.sin(a0)*70,BODY*.55,{pal:'crimson',s:130,dur:.18,gain:2.4}); K3.dust(pl.x,pl.gy,{n:5,dir:a0+Math.PI,spread:.8,sp:[150,450],a:.35});
    for(let k=0;k<n;k++){ const a=a0+(k-(n-1)/2)*.28, p={x:pl.x+Math.cos(a)*70,y:pl.gy+Math.sin(a)*70,vx:Math.cos(a)*1500,vy:Math.sin(a)*1500,life:.85,d,hits:new Set(),v:{x:0,y:0},c:'#ff6a85'};
      p.v.x=p.x; p.v.y=p.y-BODY; V.pj.push(p); upArt(); flyCres(p,fa(a),{pal:'crimson',s:215,life:.85,tex:'v3_cres_up',lean:.85,soak:1,gain:1.15}); } }},
  // WHIRL: the painted ring of cuts turns around him for the whole spin; every pulse throws a shock across the floor, the last one gold
  sw_spin:{range:340,fn(id){ if(countIn(360)<3&&!nearest(240)) return false; const d=SK[id].dmg*A.mul(id);
    plSeq([['gu04',.04],['gu06',.06,{tr:1,kick:[2.6,-2.4]}],['gu07',.08,{tr:1}],['gu06',.06,{tr:1}],['gu07',.08,{tr:1}],['gu08',.12],['gu12',.06]]);
    const K=K3, sd=rand(0,9), mt=FX3.mat({...K.mats().art,tex:'v3_spin_ring',layer:'o',nz:'wisp',n1:[1.5,1.5,.3,.1],n2:[1.2,1.2,.2,.1],dist:.03,mdist:1,rk:[.55,1.05]}); let pT=-9, fin=false;
    GFX.add(.8,(k,t)=>{ const i=sat(t/.08), f=sat((t-.56)/.24), r=390*(.7+.3*eo3(i))*(1+.14*f), pu=Math.exp(-Math.max(0,t-pT)*10), C=pc(fin?'gold':'crimson'), a=i*(1-f*f);
      FX3.quad(mt,pl.x,pl.gy,r*.72,r*.72,t*9,{layer:'g',...C,a:a*.55,gain:1.8,ero:.14+f*.6,nk:.3,t0:sd+3});
      FX3.quad(mt,pl.x,pl.gy,r,r,0,{z:BODY*.55,M:FX3.xfw({sx:r,sy:r,rx:-.1,rz:-t*13}),...C,a,gain:2.3+1.5*pu,bgain:1.1,ero:.12+f*.6,nk:.2+f*.6,t0:sd}); });
    for(let i=0;i<4;i++) after(i*.13,()=>{ const P=i===3?'gold':'crimson', b=RT*7+i*1.6; pT=i*.13; fin=i===3;
      K.shock(pl.x,pl.gy,{r:i===3?520:430,dur:.3,pal:P,gain:i===3?1:.65,dust:i%2?0:5,light:0}); GFX.light(pl.x,pl.gy,760,K.pal(P).l,.9,.24,{z:90});
      for(let q=0;q<2;q++){ const c=b+q*Math.PI; K.sparks(pl.x+Math.cos(c)*300,pl.gy+Math.sin(c)*300*FSY,BODY*.55,{pal:P,n:5,dir:c-1.4,spread:.4,sp:[500,1400],up:300,life:[.15,.35]}); }
      sfx('whoosh',1.3,.8); sfx('slash',1.2,.9);
      X.inCircleS(pl.x,pl.gy,360,e=>{ dmg(e,d*.5,{kb:1.1,big:i===3}); hitFx(e,'#ffd36a',1.1); }); }); }},
  // FLYING SWORDS: painted golden blades called out of a small circle, circling him point first with ribbons of light behind them
  sw_fly:{range:620,fn(id){ if(V.orbs.length||!nearest(620)) return false; const n=3+Math.floor((A.sLv(id)-1)/2), d=SK[id].dmg*A.mul(id)*.35;
    plSeq([['gs04',.06],['gs06',.06,{kick:[1.6,-1.2]}],['gs08',.14],['gs12',.06]]); sfx('rise',.4,.3);
    K3.sigil(pl.x,pl.gy,{r:250,dur:.75,in:.22,out:.35,spin:2.2,pal:'gold'}); K3.flare(pl.x,pl.gy,BODY*.9,{pal:'gold',s:150,dur:.25,gain:2.2}); GFX.light(pl.x,pl.gy,620,'#ffc040',.8,.4,{z:100});
    for(let i=0;i<n;i++){ const o={a:i/n*TAU,t:0,life:5,d,v:{x:pl.x,y:pl.gy-BODY}}; o.R=380; o.fx={life:5,rot:0}; V.orbs.push(o); orbSword(o); } }},
  // PLUNGE: he comes down blade first: a shaft of red, a needle burst, the floor cracked and thrown outward
  sw_plunge:{moves:true,range:460,fn(id){ const e=nearest(460); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), L=Math.max(0,Math.hypot(e.x-pl.x,e.y-pl.gy)-60), up=k=>1-(1-k)*(1-k), dn=k=>k*k; face(a);
    V.dash={x0:pl.x,y0:pl.gy,x1:pl.x+Math.cos(a)*L,y1:pl.gy+Math.sin(a)*L,t:0,dur:.42}; G.inv=Math.max(G.inv,.5);
    const land=()=>{ const cx=pl.x, cy=pl.gy, K=K3, P='crimson'; pl.air=pl.airT=0;
      K.burst(cx,cy,{s:205,pal:P,no:['ball','smoke'],scar:3}); K.dust(cx,cy,{n:10,r:70,sp:[300,820],a:.45});
      upCres(cx,cy,BODY*1.3,{s:380,dir:fa(a),roll:.1*pl.f,pal:P,swing:.05,hold:.06,fade:.28,gain:1.15,ccw:pl.f<0,sparks:0,light:0});
      trauma=Math.min(1.1,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.3,1);
      inCircle(cx,cy,390,e=>{ dmg(e,d,{kb:1.2,launch:800,stun:.7,big:true,sx:cx,sy:cy}); hitFx(e,'#ff6a85',1.4); }); };
    plSeq([['gt03',.06],['gt08',.18,{air:[0,280],ease:up}],['gs06',.06,{air:[280,300]}],['gs07',.12,{tr:1,air:[300,0],ease:dn}],['gs08',.06,{tr:1,kick:[2.6,-2.6],on:land}],['gs09',.14],['gs12',.08]]); }},
  // FLURRY: five quick red lances and a sixth in gold that goes through
  sw_thrust:{range:400,fn(id){ const e=nearest(400); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id); face(a);
    plSeq([['gk03',.06],['gk04',.06,{kick:[1,-.8]}],['gk05',.05],['gk06',.06,{kick:[1,-.8]}],['gk07',.05],['gk08',.06,{kick:[1,-.8]}],['gk09',.16,{tr:1,kick:[2,-1.6]}],['gk12',.06]]);
    for(let i=0;i<6;i++) after(.06+i*.06,()=>{ const b=a+rand(-.12,.12), x0=pl.x+Math.cos(b)*40, y0=pl.gy+Math.sin(b)*40, x1=pl.x+Math.cos(b)*400, y1=pl.gy+Math.sin(b)*400;
      const last=i===5, P=last?'gold':'crimson', ex=last?110:40;
      lance(x0-Math.cos(b)*30,y0-Math.sin(b)*30,x1+Math.cos(b)*ex,y1+Math.sin(b)*ex,{pal:P,z:BODY*.5+rand(-22,22),w:last?200:140,draw:.04,hold:last?.06:.03,fade:last?.22:.14,gain:last?1.1:1,core:last?26:18}); if(last||i===0) ping(last?x1:x0,last?y1:y0,last?280:170,{pal:P,dur:.28});
      GFX.light(x1,y1,last?620:400,K3.pal(P).l,last?1:.7,last?.3:.14,{z:80}); K3.sparks(x1,y1,BODY*.5,{pal:P,n:last?12:4,dir:b,spread:.5,sp:[400,1300],up:300,life:[.12,.3]});
      if(last){ K3.art(x1+Math.cos(b)*30,y1+Math.sin(b)*30,{tex:'v3_xburst',s:150,z:BODY*.05,dur:.22,pal:P,gain:.9,hold:.2,s0:.5}); K3.dust(x1,y1,{n:5,dir:b,spread:.9,sp:[150,420],a:.35}); }
      sfx('slash',1.5,.45);
      inLine(x0,y0,x1,y1,60,e=>{ dmg(e,d,{kb:.25,stun:.3}); hitFx(e,'#ffffff',.9); }); }); }},
  sw_counter:{passive:true},
};
function counterReady(){ const id='sw_counter'; return A.unlocked(id)&&(V.cd[id]||0)<=0; }
// COUNTER: the blow is turned and answered at once: two cyan crescents cross around him and a cold ring runs out over the floor
function counter(src){ const id='sw_counter', d=SK[id].dmg*A.mul(id); V.cd[id]=A.cdOf(id); G.inv=1.1; slow(.25,.35); stamp('카운터',{x:.5,y:.36,size:.14,life:.9,c:'#9ff7ff'}); sfx('boom',1,.8);
  if(src) face(Math.atan2(src.y-pl.gy,src.x-pl.x)); anim.seq=null;
  plSeq([['gc05',.05,{tr:1,kick:[2.8,-2.6]}],['gc06',.08,{tr:1}],['gc07',.18],['gc10',.08],['gc12',.06]]);
  const K=K3, a=src?Math.atan2(src.y-pl.gy,src.x-pl.x):(pl.f>0?0:Math.PI), z=BODY*.55;
  K.cres(pl.x,pl.gy,z,{reach:350,dir:fa(a),lean:.36,roll:.26,tex:'v3_slash_heavy',pal:CYAN,swing:.06,hold:.07,fade:.3,sparks:8});
  K.cres(pl.x,pl.gy,z,{reach:350,dir:fa(a+Math.PI),lean:.36,roll:.26,tex:'fx3_slash',pal:CYAN,swing:.06,hold:.07,fade:.3,delay:.05,sparks:8,light:0});
  K.shock(pl.x,pl.gy,{r:560,dur:.42,pal:CYAN,gain:.9}); GFX.ripple(pl.x,pl.gy,600,{life:.4,s:.6}); K.flare(pl.x,pl.gy,z,{pal:CYAN,s:190,dur:.2,gain:2.6}); GFX.light(pl.x,pl.gy,900,'#40e0ff',1,.45,{z:100});
  X.inCircleS(pl.x,pl.gy,440,e=>{ dmg(e,d,{kb:2,big:true,crit:true}); hitFx(e,'#9ff7ff',1.5); }); }

// basic: a 3-cut chain at the nearest enemy - two cuts, then a wide heavy one. Small clean painted crescents; the third is the gold one
function basic(){ const e=nearest(430); if(!e) return false; const a=angTo(e), n=V.chain++%3, big=n===2, r=big?360:300, d=1200*A.mul('sw_basic')*(big?1.7:1), s=n===1?-1:1; face(a);
  seq(['gs','gu','gs'][n],[['05','06','08'],['04','06','08'],['05','07','09']][n],{basic:true});
  const half=big?1.6:1.25, P=big?'gold':'crimson';
  K3.cres(pl.x,pl.gy,BODY*.5,{s:big?235:185,dir:fa(a),lean:big?.42:.4,roll:s*.2,tex:big?'v3_slash_heavy':'fx3_slash',pal:P,swing:.055,hold:.04,fade:big?.24:.18,gain:1,ccw:s<0,sparks:big?8:3,light:big?.9:.6});
  if(big) K3.dust(pl.x+Math.cos(a)*r*.6,pl.gy+Math.sin(a)*r*.6,{n:4,dir:a,spread:1,sp:[150,420],a:.3,s:.8});
  sfx('whoosh',1.1+n*.1,.6); sfx('slash',1+n*.06,big?1:.75);
  after(.04,()=>inSector(pl.x,pl.gy,a,r,half,e=>{ dmg(e,d,{kb:big?1.3:.7}); hitFx(e,big?'#ffd36a':'#ff6a85',big?1.3:1); }));
  return true; }

const basicCd=()=>.8*(1-.05*(A.sLv('sw_basic')-1));

// ============================================================ local effect pieces on FX3 / GFX (kit candidates; used by the skills above and by ultRain)
const sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k), eo5=k=>1-Math.pow(1-k,5);
const CYAN={d:'#01202e',b:'#10b8ff',m:'#9ffff0',h:'#f2ffff',l:'#40e0ff',s:'#b8f6ff'};
const LM={}, lm=(k,fn)=>LM[k]||(LM[k]=fn(K3.mats())), pc=p=>{ const P=K3.pal(p); return {cA:P.d,cB:P.b,cC:P.h,cM:P.m||P.b}; };
const inView=(x,y,m=300)=>{ const v=view(); return Math.abs(x-cam.x)<v.hw+m&&y-cam.y>-v.hh-m&&y-cam.y<v.hh+m*5; };
// an angle measured on the screen (the game's squashed floor) as an angle on the true floor, which is what the kit's floor pieces turn by
const fa=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
// the clean upright crescent is not in the kit's crescent table yet: describe it there (aspect, pivot of the arc, edge, ramp) the first time it is used
const upArt=()=>{ if(!K3.ART.v3_cres_up) K3.ART.v3_cres_up={asp:.667,piv:[.8,.5],edge:.11,rk:[.4,1]}; };
// UPRIGHT CRESCENT: the thin painted edge standing in front of him, with the same stroke a little larger and soaked in colour behind it (so it has body at phone size)
function upCres(x,y,z,o){ upArt(); K3.cres(x,y,z,{...o,s:o.s*1.15,tex:'v3_cres_up',lean:.9,off:.5,rk:[.04,.5],gain:.5*(o.gain||1),sparks:0,light:0}); K3.cres(x,y,z,{...o,s:o.s*1.06,tex:'v3_cres_up',lean:.9,off:.5,rk:[.07,.6],gain:.75*(o.gain||1),sparks:0,light:0}); K3.cres(x,y,z,{...o,tex:'v3_cres_up',lean:.9,off:.5}); }
const swMat=()=>lm('sword',()=>FX3.mat({kind:2,tex:'sword',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ffffff',cC:'#fff0b0',gain:1,op:1,layer:'o'}));
// the painted blade floating at (x, y, z), centred, its point turned to rot (0 = up, on the screen)
function swordC(x,y,z,L,rot,o={}){ FX3.bill(swMat(),x,y,z,L*.197,L/2,rot,{a:o.a??1,ero:o.ero??-1,soft:.08,gain:o.gain??1.1,cB:o.tint||'#ffffff',cC:o.edge||'#fff0b0'}); }
// ORBIT SWORD: one of the blades circling him (o is the orb the game steps: a, x, y, R, life): point first, a ribbon of light where it has been
function orbSword(o){ if(!FX3.on) return; const C=pc('gold'), sd=rand(0,9), GL=GFX.st(8,'add',{L:0}), gold=GFX.rgb('#ffc040'), lt=GFX.light(pl.x,pl.gy,340,'#ffc040',.42,.3,{hold:o.life,z:100}); let end=-1;
  const e=GFX.add(o.life+.5,(k,t)=>{ if(end<0&&V.orbs.indexOf(o)<0){ end=t; lt.hold=0; lt.life=.2; lt.t=0; } const f=end<0?0:sat((t-end)/.28); if(f>=1){ e.dead=true; return; } if(o.x==null) return;
    const R=o.R??270, z=(o.h??BODY*.7)+16*Math.sin(t*5+sd), i=sat(t/.22), ps=[]; lt.x=o.x; lt.y=o.y;
    for(let q=0;q<9;q++){ const b=o.a-q*.1; ps.push({x:pl.x+Math.cos(b)*R,y:pl.gy+Math.sin(b)*R*.8,z,w:30*(1-q/9)}); }
    FX3.ribbon(K3.mats().trB,ps,{...C,gain:2.2,a:.75*i*(1-f),ero:.12,t0:sd}); GFX.floor(GL,o.x,o.y,95,null,0,gold,.3*i*(1-f));
    swordC(o.x,o.y,z,260*(.6+.4*i),Math.atan2(-Math.sin(o.a),-Math.cos(o.a)*.8),{a:i,ero:f?-1+f*2:-1,gain:1.15+.8*(1-i),tint:'#ffe2a0'}); }); }
// FIELD SWORD: the greatsword mask as a three-tone sprite in the batched GFX layer, so a whole field of them is one draw.
//  (x,y,z) is the point, L the length, tilt the lean; k brightness (far ones darker), a alpha, er erosion 0..1
let FSW=null;
function fsword(x,y,z,L,tilt,k=1,a=1,er=0){ if(!FSW){ const s=GFX.img('v3_greatsword'); FSW={s,st:GFX.st(15,'alpha',{t:s.im,uv01:true,c2:GFX.rgb('#3a1800'),c3:GFX.rgb('#fff0b8'),L:2})}; } if(!FSW.s.ok) return;
  const hh=L/2; GFX.bill(FSW.st,x+Math.sin(tilt)*hh,y,z+Math.cos(tilt)*hh,L*.25,hh,tilt,[k,.6*k,.07*k],a,er,x*.01,1,0); }
// CRATER: the painted crater (or another floor painting, o.tex) on the floor as dark rock with heat in its seams that cools over its life; front:true lays its near rim over whatever stands in it
function crater(x,y,o={}){ if(!FX3.on) return; const C=pc(o.pal||'gold'), r=o.r||500, life=o.life||5, sd=rand(0,9), tex=o.tex||'v3_crater',
    mD=lm('ctD'+tex,m=>FX3.mat({...m.art,tex,layer:'g',nk:0,ero:.07,soft:.25,op:1,cA:'#000000',cB:'#0e0b12',cC:'#4a424e',rk:[.35,1.1],gain:1,bgain:1})),
    mE=lm('ctE'+tex,m=>FX3.mat({...m.art,tex,layer:'g',nz:'fbm',n1:[2,2,.03,.02],nk:.35,pw:2.4,ero:.22,soft:.3,rk:[.45,1.1],gain:2.4,bgain:1.1}));
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.12)), heat=Math.pow(1-k,1.5), out=sat((1-k)/.2), rr=r*(.72+.28*i), aD=.82*out*i, aE=Math.min(1,heat*1.5)*i, gE=2.6*(.35+.65*heat), eE=.22+.35*(1-heat);
    FX3.quad(mD,x,y,rr,rr,0,{a:aD}); FX3.quad(mE,x,y,rr,rr,0,{...C,a:aE,gain:gE,ero:eE,t0:sd});
    if(o.front&&t<o.front){ const fo=sat((o.front-t)/.3); FX3.quad(mD,x,y,rr,rr,0,{a:aD*fo,layer:'o',ord:2,fd:[0,0,0,.6]}); FX3.quad(mE,x,y,rr,rr,0,{...C,a:aE*fo,gain:gE,ero:eE,t0:sd,layer:'o',ord:2.1,fd:[0,0,0,.6]}); } },o.delay||0); }
if(window.GFX&&GFX.on) GFX.img('v3_greatsword');
// RAY: a shaft of light standing on a point (two draws): streaks racing upward, soft at the sides, gone toward the top
const rayB=()=>lm('rayB',()=>FX3.mat({nz:'wisp',n1:[1.2,.5,0,-1.8],n2:[2,1,0,-.7],dist:.06,nk:.9,ero:.08,soft:.3,fd:[.5,.5,.02,.75],rk:[.45,.9],gain:2.6,bgain:1.1,layer:'o'})),
  rayC=()=>lm('rayC',()=>FX3.mat({nz:'streak',n1:[.6,2,0,-2.6],n2:[2,1,0,-1],dist:.03,nk:.45,ero:.08,soft:.25,fd:[.5,.5,0,.85],rk:[.15,.5],gain:4.5,bgain:2.2,layer:'o'}));
function ray(x,y,o={}){ if(!FX3.on) return; const C=pc(o.pal||'gold'), w=o.w||46, h=o.h||1100, dur=o.dur||.5, g=o.gain||1, sd=Math.random()*9, z0=o.z||0, mb=rayB(), mc=rayC();
  GFX.add(dur,(k,t)=>{ const up=eo3(sat(t/(o.rise??.07))), f=sat((k-.4)/.6), ww=w*(1+.3*Math.sin(k*Math.PI))*(1-f*.7), a=1-f*f, hh=h*up/2;
    FX3.bill(mb,x,y,z0+hh,ww*2.2,hh,0,{...C,a,gain:2.4*g,ero:.08+f*.5,t0:sd});
    if(o.core!==0) FX3.bill(mc,x,y,z0+hh,ww*.7,hh,0,{...C,a,gain:4.2*g,t0:sd}); },o.delay||0); }
// PING: one thin shock ring (a single draw), on the floor or - with z - in the air
function ping(x,y,r,o={}){ if(!FX3.on) return; const C=pc(o.pal||'gold'), dur=o.dur||.28, sd=Math.random()*9, m=K3.mats();
  GFX.add(dur,k=>{ const e=eo3(k), rr=mix(o.r0??r*.15,r,e), th=r*mix(.28,.08,k)*(o.th||1), a=(1-k)*(1-k); FX3.ring(m.shL,x,y,Math.max(0,rr-th*.5),rr+th*.15,{...C,a:Math.min(1,a*1.6),gain:2.4*(o.gain||1),t0:sd,z:o.z||0,layer:o.z?'o':'g'}); },o.delay||0); }
// SKY GATE: a hole torn in the clouds high above the field (the painted cloud gate at height z, laid flatter than the floor's ellipse so it reads as sky):
// a dark cloud mass, edges lit from inside, a hot core, and its light pouring down as a wide shaft onto a pool on the floor. Returns a handle {x,y,z,r,a,sr (shaft radius as a part of r),pk (set to RT to pulse),dead}
function skyGate(x,y,z,o={}){ const h={x,y,z,r:o.r||900,a:1,sr:.22,pk:-9,dead:false}; if(!FX3.on) return h; const C=pc(o.pal||'gold'), dur=o.dur||3, tin=o.in??.4, tout=o.out??.4, lean=o.lean??.14, sd=rand(0,9),
    mC=lm('sgC',m=>FX3.mat({...m.art,tex:'v3_skygate',layer:'o',nz:'billow',n1:[1.5,1.5,.02,.01],n2:[1.2,1.2,.02,.02],dist:.03,mdist:1,nk:.25,ero:.1,soft:.3,op:1,cA:'#05060c',cB:'#2a3048',cC:'#8e96b8',rk:[.4,1.05],gain:1,bgain:1})),
    mL=lm('sgL',m=>FX3.mat({...m.art,tex:'v3_skygate',layer:'o',nz:'billow',n1:[1.5,1.5,.02,.01],n2:[1.2,1.2,.02,.02],dist:.03,mdist:1,nk:.2,pw:2.2,ero:.2,soft:.3,rk:[.4,1.05],gain:2.6,bgain:1.15})),
    mS=lm('sgS',()=>FX3.mat({nz:'streak',n1:[3,.3,.2,-.7],n2:[2,1,0,-.4],dist:.04,nk:.75,ero:0,soft:.55,fd:[0,0,.32,.1],rk:[.6,1.15],gain:1.5,bgain:1,layer:'o'}));
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/tin), out=sat((dur-t)/tout), pu=Math.max(0,1-(RT-h.pk)/.3), br=Math.max(1,h.a)*(1+.6*pu), a=Math.min(1,h.a)*out, rr=h.r*(.55+.45*eo3(i)), M=FX3.xfw({sx:rr,sy:rr,rx:lean,rz:t*(o.spin??.12)});
    const rs=rr*h.sr*(1+.12*pu); FX3.lathe(mS,h.x,h.y,0,{r0:rs*.8,r1:rs,h0:0,h1:h.z,...C,a:(.13+.1*pu)*a*i,gain:.8*br,t0:sd}); FX3.lathe(mS,h.x,h.y,0,{r0:rs*.56,r1:rs*.74,h0:0,h1:h.z,...C,a:(.11+.08*pu)*a*i,gain:.95*br,n1:[2.2,.4,-.28,-1.1],t0:sd+4}); if(!FX3.low) FX3.lathe(mS,h.x,h.y,0,{r0:rs*1.05,r1:rs*1.3,h0:0,h1:h.z,...C,a:.05*a*i,gain:.6*br,nk:.3,n1:[1.4,.2,.1,-.4],t0:sd+7});
    FX3.quad(K3.mats().glowG,h.x,h.y,rr*.9,rr*.9,0,{...C,a:.32*a*i,gain:.9*br,bgain:.7});
    FX3.quad(mC,h.x,h.y,rr,rr,0,{z:h.z,M,a:.9*a,ero:.1+(1-i)*.9+(1-out)*.8,t0:sd});
    FX3.quad(mL,h.x,h.y,rr,rr,0,{z:h.z,M,...C,a,gain:2.6*br,ero:.2+(1-i)*.8+(1-out)*.7,t0:sd}); },o.delay||0);
  return h; }
// LANCE: the painted thrust (its tip is the far end) on a camera-facing ribbon from (x0,y0) to (x1,y1) at height z: the tip leads,
// the body is revealed behind it, then it burns away from the tail
function lance(x0,y0,x1,y1,o={}){ if(!FX3.on) return; const C=pc(o.pal||'crimson'), z=o.z??BODY*.55, draw=o.draw??.06, hold=o.hold??.06, fade=o.fade??.2, life=draw+hold+fade, L=Math.hypot(x1-x0,y1-y0), w=o.w||Math.max(100,L/3.7*1.25), sd=Math.random()*9, g=o.gain||1,
    mt=lm('lance',m=>FX3.mat({...m.art,tex:'v3_thrust',layer:'o',nz:'streak',n1:[2,1,-3,0],n2:[2,1,-2,0],dist:.02,mdist:1,pw:.5,rk:[.4,1.05]})),
    mb=lm('lanceB',m=>FX3.mat({...m.art,tex:'fx3_beam',layer:'o',nz:'streak',n1:[2,1,-3,0],n2:[2,1,-2,0],dist:.03,mdist:1,nk:.35,rk:[.45,1]})), wb=o.body??w*.42;
  if(o.core){ const ps=[]; for(let i=0;i<7;i++) ps.push({x:mix(x0,x1,.06+i/6*.9),y:mix(y0,y1,.06+i/6*.9),z}); K3.trail(ps,{pal:o.pal||'crimson',w:o.core,dur:life*.85,draw,hold,gain:.8,delay:o.delay||0}); }
  GFX.add(life,(k,t)=>{ const p=Math.max(.06,eo5(sat(t/draw))), f=sat((t-draw-hold)/fade), n=5, ps=[]; for(let i=0;i<n;i++){ const u=i/(n-1)*p; ps.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z,w:w*(1+f*.2)}); }
    if(wb>0){ const pb=[]; for(let i=0;i<9;i++){ const u=i/8, uu=u*p; pb.push({x:mix(x0,x1,uu),y:mix(y0,y1,uu),z,w:wb*(u<.18?.25+.75*u/.18:Math.sqrt(Math.max(0,1-Math.pow((u-.18)/.82,2.2))))*(1-f*.5)}); } FX3.ribbon(mb,pb,{...C,a:1-f*f,gain:2.8*g,ero:.08+f*.6,t0:sd}); }
    FX3.ribbon(mt,ps,{...C,a:1-f*f,gain:3*g,bgain:1.1,ero:.08+f*.7,nk:.15+f*.7,uvT:[p,1,1-p,0],fd:[.02+f*.6,0,0,0],t0:sd}); },o.delay||0); }
// FLYING CRESCENT: a painted crescent held open and carried by a projectile p ({x,y,life}), cutting edge first; it burns out when the projectile ends
function flyCres(p,dir,o={}){ if(!FX3.on) return; const P=K3.pal(o.pal||'crimson'), C=pc(P), tex=o.tex&&FX3.ready(o.tex)?o.tex:'fx3_slash', A_=K3.ART[tex], s=o.s||150, asp=o.asp||A_.asp, life=o.life||.85, sd=Math.random()*9, z=o.z??BODY*.55, rz=dir+Math.PI,
    mt=FX3.mat({...K3.mats().art,tex,layer:'o',nz:'wisp',n1:[1.5,1.5,.9,.1],n2:[1.2,1.2,.4,.1],dist:.03,mdist:1,rk:A_.rk}), ms=o.soak?FX3.mat({...K3.mats().art,tex,layer:'o',nz:'wisp',n1:[1.5,1.5,.9,.1],n2:[1.2,1.2,.4,.1],dist:.03,mdist:1,rk:[.07,.6]}):null, L=GFX.light(p.x,p.y,s*3.4,P.l,.8,.18,{hold:life,z});
  let end=-1, acc=0; const e=GFX.add(life+.3,(k,t)=>{ if(end<0&&(p.life<=0||t>=life)){ end=t; L.hold=0; L.life=.15; L.t=0; } const i=sat(t/.07), f=end<0?0:sat((t-end)/.16); if(f>=1){ e.dead=true; return; }
    const ss=s*(.7+.3*eo3(i))*(1+.15*f), off=ss*asp*(A_.piv[0]-.5)*2, cx=p.x+Math.cos(dir)*off*.55, cy=p.y+Math.sin(dir)*off*.55*FSY; L.x=p.x; L.y=p.y;
    if(ms){ const s2=ss*1.08; FX3.quad(ms,cx,cy,s2*asp,s2,0,{z,M:FX3.xfw({sx:s2*asp,sy:s2,rx:-(o.lean??.5),ry:o.roll||0,rz}),...C,a:i*(1-f*f),gain:2.4*(o.gain||1),bgain:1.1,ero:.1+f*.6,nk:.3+f*.6,aw:[A_.piv[0],A_.piv[1],-.8,-1],aw2:[.9,0,.1,1],t0:sd+2}); }
    FX3.quad(mt,cx,cy,ss*asp,ss,0,{z,M:FX3.xfw({sx:ss*asp,sy:ss,rx:-(o.lean??.5),ry:o.roll||0,rz}),...C,a:i*(1-f*f),gain:3*(o.gain||1),bgain:1.1,ero:.1+.05*Math.sin(t*40+sd)+f*.6,nk:.3+f*.6,aw:[A_.piv[0],A_.piv[1],-.8,-1],aw2:[.9,0,.1,1],t0:sd});
    acc+=1; if(end<0&&acc%2===0) GFX.pt({x:p.x+rand(-20,20),y:p.y+rand(-50,50)*FSY,z:z+rand(-40,60),vx:-Math.cos(dir)*rand(100,400),vy:-Math.sin(dir)*rand(100,400)*FSY,vz:rand(-40,160),g:300,drag:1.5,life:rand(.2,.45),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); }); }


// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const RED='#ff2a4a', GOLD='#ffcf4a';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH: a silver circle writes itself under him; one drawn breath; a crescent the width of the field - then four more, each wider than
// the last, each through its own band of the field and at its own tilt, and he is seen at the end of every one. The blade goes home in
// silence, close; the circle turns to gold, the four scars tear open, and the light he held back comes down as a blade and breaks the floor.
function ultZero(id){ if(window.MK&&MK.on()&&MK.ultZero) return MK.ultZero(id); ultStart(id); const mk=window.MK&&MK.on()?MK:null, NT=mk?.5:0, F3ok=n=>window.FX3&&FX3.ready(n), Cn=X.cine, K=K3, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), hy=y0-BODY*.55, P={d:'#240004',b:'#e8121c',m:'#ffc4b4',h:'#ffffff',l:'#ff3a2c',s:'#ffc0b0'}, EMB={d:'#0c0001',b:'#8a1208',m:'#e0522a',h:'#ffd8a8',l:'#c02810',s:'#ff9a70'}, f0=pl.f, RR=hw*.8,
    GOLD2={d:'#3a0a00',b:'#ffa820',m:'#ffe9a0',h:'#ffffff',l:'#ffc880',s:'#fff0c0'}, STEEL={d:'#04060e',b:'#5f78c0',m:'#b8ccff',h:'#f4f8ff',l:'#9ab4ff',s:'#d0dcff'}, cl=(v,a,b)=>Math.max(a,Math.min(b,v)),
    tp=(x,y)=>{ const dx=x-pl.x, dy=y-pl.gy; pl.x=x; pl.gy=y; for(const p of [...(pl.scarf||[]),...(pl.coat||[])]){ p.x+=dx; p.y+=dy; if(p.px!=null){ p.px+=dx; p.py+=dy; } } };
  // ---- omen: the light turns cold, the circle writes itself, the air is drawn to the hilt
  if(mk) mk.play('iaiReady',{yaw:f0>0?0:Math.PI,speed:1.1}); else { plSeq([['gc02',.14],['gc03',.14],['gc04',9]]); pl.target='iaiReady'; pl.ps=18; }
  GFX.ambient(.46,.58,.68,3.5); const spot=GFX.light(x0,y0-60,560,'#d8e4ff',.8,.6,{hold:9,z:200});
  const sig=K.sigil(x0,y0,{r:hw*.6,dur:9,in:.62,out:.3,spin:.32,pal:STEEL,gain:.36,hole:.3,tex:F3ok('v3_circ_blade2')?'v3_circ_blade2':null}), sig2=K.sigil(x0,y0,{r:hw*.86,dur:9,in:.75,out:.3,spin:-.2,pal:STEEL,gain:.24,hole:.64});
  sig2.a=.6; K.crack(x0,y0,{r:230,pal:P,life:4.6,grow:.7});
  Cn.zoom(mk?2.3:1.5); Cn.roll(-.04); Cn.cam(x0,hy,4.5); Cn.tilt(.1,1.5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9)); Cn.SND.inhale(1.15,.5);
  for(let i=0;i<3;i++) after(.08+i*.22,()=>K.shock(x0,y0,{r0:hw*(1.05-i*.12),r:60,dur:.42,pal:'silver',gain:.5,light:0,dust:0,haze:.5,th:.6,painted:0}));
  for(let i=0;i<46;i++) after(rand(0,.6),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,420),tx:x0+f0*30,ty:y0,tz:BODY*.55,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.4?'#ffffff':'#c8d8ff'),c2:'#8aa0d8',L:3}); });
  for(let i=0;i<10;i++) after(rand(.1,.7),()=>{ const a=rand(0,TAU), d=rand(120,420); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.7,1.1),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  // four cuts: [centre x (in half-widths), centre y (in half-heights), direction, lean, roll, ccw]
  const cuts=[[-.05,-.34,.22,.62,-.18,0],[.08,.3,Math.PI-.28,.5,.2,1],[-.2,-.12,-.5,.7,-.32,0],[.14,.12,Math.PI/2+.3,.36,.24,1]].map((q,i)=>{ const s=f0>0?1:-1, th=s>0?q[2]:Math.PI-q[2];
    return {x:x0+q[0]*s*hw,y:y0+q[1]*hh,th,lean:q[3],roll:q[4]*s,ccw:s>0?q[5]:1-q[5],reach:hw*(1.2+.1*i),dx:Math.cos(th),dy:Math.sin(th)}; });
  const STR=[[['gm05',.03],['gm06',.05],['gm07',9]],[['gs05',.03],['gs07',.05],['gs09',9]],[['gm08',.03],['gm09',.05],['gm10',9]],[['gm10',.03],['gm11',.05],['gm12',9]]];
  const pivot=c=>[c.x-c.dx*c.reach*.38,c.y-c.dy*c.reach*.38*FSY], band=(c,fn)=>X.inCircleS(c.x,c.y,c.reach*.62,fn);
  // ---- the draw: one crescent across the whole field, the camera gives it room
  const t0=.85;
  after(t0-.07,()=>{ if(mk) mk.play('draw'); K.flare(x0+f0*40,y0,BODY*.6,{pal:'silver',s:60,sx:5,sy:.35,dur:.16,gain:5}); Cn.SND.tick(1.4,.3); });
  after(t0,()=>{ spot.hold=0; spot.life=.25; if(!mk){ pl.target='slashU'; plSeq([['gc05',.03],['gc06',.05],['gc07',9]]); } const dir=f0>0?0:Math.PI;
    K.cres(x0-f0*hw*.25,y0,BODY*.55,{reach:hw*1.12,dir,lean:.58,roll:-.12*f0,tex:'fx3_slash',pal:P,swing:.08,hold:.18,fade:.46,gain:1,sparks:0,ccw:f0<0});
    K.cres(x0-f0*hw*.25,y0,BODY*.55,{reach:hw*1.2,dir,lean:.58,roll:-.12*f0,tex:'v3_slash_thin',pal:P,swing:.07,hold:.12,fade:.34,gain:.95,sparks:0,light:0,ccw:f0<0});
    K.art(x0+f0*90,y0,{tex:'v3_burst_sword',s:hw*.5,z:BODY*.1,dur:.34,pal:P,gain:1,hold:.2,s0:.55,rot:rand(-.3,.3)});
    K.shock(x0,y0,{r:hw*1.7,dur:.55,pal:P}); GFX.ripple(x0,y0,hw*1.8,{life:.45,s:.7});
    K.sparks(x0+f0*60,y0,BODY*.6,{pal:P,n:40,sp:[500,1900],up:500,dir,spread:1.5});
    K.dust(x0,y0,{n:14,r:80,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,700],up:900});
    sig.pal=EMB; sig2.pal=EMB; hitstop=Math.max(hitstop,.085); Cn.shake(1); post.ca=.005; Cn.zoom(mk?1:.7); Cn.cam(x0,y0-hh*.04,6); Cn.roll(.03); Cn.tilt(.14,6); SFX.slash(.8,1.2); Cn.SND.shing(.8,.7); SFX.whoosh(.7,1);
    X.inCircleS(x0,y0,hw*1.3,e=>{ e.flash=1; e.stun=Math.max(e.stun,3.2); e.kx+=(e.x-x0>0?1:-1)*120; hitFx(e,RED,1); }); });
  // ---- the flurry: four cuts, each wider than the last; he stands at the end of each for a blink, blade out
  let tt=t0+.26, prev=[x0,y0]; const gaps=[.2,.18,.16,.14];
  cuts.forEach((c,i)=>{ after(tt,()=>{ const [px,py]=pivot(c), ex=cl(c.x+c.dx*c.reach*.3,x0-hw*.78,x0+hw*.78), ey=cl(c.y+c.dy*c.reach*.3*FSY,y0-hh*.66,y0+hh*.6), ff=c.dx>=0?1:-1, was=prev;
      // where he was: the figure made of the blade's own light, already gone
      if(mk) mk.ghost({life:.3}); else { const st=GFX.st(0,'add',{c2:[.55,.35,0],c3:[1,.5,.3]}); GFX.add(.26,k=>{ GFX.pose(st,'sword','gs07',was[0]+c.dx*90*k,was[1]+c.dy*50*k,ff,[1,.4,.25],(1-k)*(1-k),{smear:.25+.5*k,sc:1.15}); }); }
      K.trail([0,.25,.5,.75,1].map(u=>({x:mix(was[0],ex,u),y:mix(was[1],ey,u),z:105})),{w:26,dur:.2,draw:.04,pal:P,gain:.7});
      tp(ex,ey); prev=[ex,ey]; pl.f=ff; pl.visible=true; if(mk) mk.play(['cutA','cutB','cutD','cutC'][i%4],{yaw:c.th,from:was,slide:.05}); else { pl.target='slashU'; plSeq(STR[i%4]); }
      K.cres(px,py,BODY*.55,{reach:c.reach,dir:c.th,lean:c.lean,roll:c.roll,tex:'fx3_slash',pal:P,swing:.07,hold:.14,fade:.42,gain:1,sparks:0,ccw:c.ccw});
      K.cres(px,py,BODY*.55,{reach:c.reach*1.07,dir:c.th,lean:c.lean,roll:c.roll,tex:'v3_slash_thin',pal:P,swing:.06,hold:.1,fade:.3,gain:.9,sparks:0,light:0,ccw:c.ccw});
      // its shape stays in the floor as embers
      K.art(c.x,c.y,{tex:'fx3_slash',floor:true,rot:c.th+Math.PI,s:c.reach*.5,asp:1.47,dur:2.4,hold:.1,s0:.96,pal:EMB,gain:.6});
      for(let j=0;j<2;j++) K.smoke(c.x-c.dx*c.reach*rand(.05,.3),c.y-c.dy*c.reach*rand(.05,.3)*FSY,{s:rand(190,270),dur:rand(.9,1.3),delay:.05+j*.06,c:'#160406',c2:'#5a1a10',a:.5,rise:150});
      K.flip(c.x,c.y,{tex:'v3_flip_cut',s:c.reach*.3,z:BODY*.2,dur:.5,pal:P,gain:.9}); K.flip(c.x+c.dx*c.reach*.3,c.y+c.dy*c.reach*.3*FSY,{tex:'v3_flip_smoke',s:rand(170,230),dur:rand(.9,1.2),delay:.08,smoke:true,nb:1,c:'#150608',c2:'#5a2a22',rise:120});
      K.sparks(ex,ey,BODY*.6,{pal:P,n:26,sp:[500,1800],up:500,dir:c.th,spread:1.2});
      K.dust(c.x,c.y,{n:8,dir:c.th,spread:.9,sp:[300,800],a:.4}); K.debris(c.x,c.y,{n:6,r:160,sp:[200,800],up:1100,size0:8,size:22});
      GFX.light(c.x,c.y,c.reach*1.3,'#ff4a20',.9,.32,{z:120});
      band(c,e=>{ e.cut=(e.cut||0)+1; e.flash=1; e.stun=Math.max(e.stun,3); hitFx(e,RED,1.2); if(!e.d.heavy){ e.vz=Math.max(e.vz,rand(500,900)); e.kx+=c.dx*rand(120,260); e.ky+=c.dy*rand(70,150); } });
      hitstop=Math.max(hitstop,.045); Cn.SND.shing(1+i*.12,.5); SFX.slash(1.1+i*.1,.9); Cn.roll((i%2?1:-1)*.05); Cn.shake(.5+i*.1); post.ca=.004; Cn.zoom(mk?1.15-i*.05:.7-i*.012); if(mk) Cn.cam(ex,ey-BODY*.4,15); }); tt+=gaps[i]; });
  const t1=tt+.16;
  // ---- stillness: he is back where he stood, back turned; the camera comes close and sinks; the circle beats like a heart
  after(t1,()=>{ const was=prev; if(mk) mk.ghost({life:.34}); else { const st=GFX.st(0,'add',{c2:[.55,.35,0],c3:[1,.5,.3]}); GFX.add(.26,k=>{ GFX.pose(st,'sword','gs07',was[0],was[1],pl.f,[1,.4,.25],(1-k)*(1-k),{smear:.3+.5*k,sc:1.15}); }); }
    tp(x0,y0); pl.visible=true; pl.f=f0; if(mk) mk.play('noto',{yaw:f0>0?0:Math.PI,from:was,slide:.06}); else { plSeq([['gc08',.1],['gc09',.12],['gc10',.14],['gc11',.16],['gc12',9]]); pl.target='iaiDone'; pl.ps=30; } Cn.zoom(mk?2.3:1.32); Cn.roll(.035); Cn.cam(x0,hy,mk?6:3); Cn.tilt(.24,2.2);
    GFX.ambient(.44,.5,.62,8); GFX.light(x0,y0-40,480,'#ffe8e0',.8,.3,{hold:.4,z:200});
    K.flare(x0,y0,BODY*.5,{pal:'silver',s:200,dur:.3,gain:2}); SFX.whoosh(1.4,.5); duck(.18,.75); K.dust(x0,y0,{n:10,r:40,sp:[150,380],a:.35}); sig.a=.7; sig2.a=.4; });
  [.08,.22].forEach((d,j)=>after(t1+d,()=>{ sig.kick(); sig2.kick(); SFX.heart(.7+j*.08); GFX.light(x0,y0,hw*1.1,'#c8d4ff',.14+j*.05,.16,{z:100}); K.shock(x0,y0,{r0:hw*.5,r:70,dur:.2,pal:'silver',gain:.35,light:0,dust:0,haze:.3,th:.5,painted:0}); Cn.zoom(mk?2.36+j*.08:1.34+j*.05); }));
  after(t1+.24+NT,()=>{ pl.target='sheath'; pl.ps=14; SFX.click(); Cn.SND.tick(.6,.3); K.flare(x0-f0*30,y0,BODY*.62,{pal:'silver',s:50,sx:7,sy:.3,dur:.24,gain:6}); });
  // ---- the tear: the circle turns to gold; the four scars open one after another and throw what stands on them
  const tc=t1+.38+NT;
  after(tc,()=>{ hitstop=Math.max(hitstop,.07); Cn.shake(1.1); post.ca=.005; Cn.zoom(.66); Cn.roll(-.03); Cn.tilt(.28,5); GFX.ambient(.46,.44,.52,30); sig.pal=GOLD2; sig2.pal=GOLD2; sig.a=1.1; sig2.a=.7; sig.hole=.46; sig.kick(); SFX.shatter(.8); Cn.cam(x0,y0-hh*.26,5); });
  cuts.forEach((c,j)=>{ after(tc+j*.07,()=>{ const [px,py]=pivot(c);
      K.cres(px,py,BODY*.4,{reach:c.reach*.74,dir:c.th,lean:c.lean,roll:c.roll,tex:'v3_slash_thin',pal:P,swing:.04,hold:.08,fade:.24,gain:.7,rk:[.9,1.75],sparks:14,light:.6,ccw:c.ccw});
      K.art(c.x,c.y,{tex:'fx3_slash',floor:true,rot:c.th+Math.PI,s:c.reach*.52,asp:1.47,dur:.95,hold:.12,s0:.96,pal:P,gain:.7});
      K.flip(c.x,c.y,{tex:'v3_flip_cut',s:c.reach*.34,z:BODY*.2,dur:.5,pal:GOLD2,gain:.8});
      for(const u of [-.3,0,.3]){ const qx=c.x+c.dx*c.reach*u, qy=c.y+c.dy*c.reach*u*FSY; K.debris(qx,qy,{n:4,r:100,sp:[200,800],up:1500,size0:8,size:24}); K.dust(qx,qy,{n:4,r:70,sp:[200,600],a:.4}); }
      band(c,e=>{ e.flash=1; e.stun=Math.max(e.stun,1.6); hitFx(e,'#ffb66a',1.4); if(!e.d.heavy){ const a=Math.atan2(e.y-y0,e.x-x0); e.vz=Math.max(e.vz,rand(1500,2200)); e.kx+=Math.cos(a)*rand(260,520); e.ky+=Math.sin(a)*rand(160,320); } });
      Cn.SND.shing(.7+j*.08,.4); SFX.boom(.9+j*.05,.5); Cn.shake(.5+j*.08); Cn.roll((j%2?1:-1)*.03); }); });
  // ---- the held breath: everything leans in toward the place the blade will land
  const tf=tc+.52, bx=x0, by=y0-RR*FSY*.52;
  after(tf-.5,()=>{ if(mk){ mk.play('raise'); Cn.zoom(1.5); Cn.cam(x0,hy,7); } else plSeq([['gw02',.08],['gw03',.1],['gw04',9]]); K.flare(x0,y0,BODY*1.25,{pal:GOLD2,s:70,dur:.3,gain:4}); });
  after(tf-.6,()=>{ K.blade(bx,by,{h:hh*1.45,omen:.38,drop:.42,hold:.42,dur:.95,pal:GOLD2,gain:1,tilt:-.2*f0}); GFX.light(bx,by,hw*.8,'#ffc870',.5,.3,{hold:.5,z:260}); });
  after(tf-.2,()=>{ GFX.gain=.5; Cn.zoom(mk?1.05:.78); K.shock(bx,by,{r0:hw*1.7,r:90,dur:.2,pal:GOLD2,gain:.6,light:0,dust:0,painted:0,th:.7}); sig.r*=.86; sig2.r*=.86;
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(500,1100); GFX.pt({x:bx+Math.cos(a)*d,y:by+Math.sin(a)*d*FSY,z:rand(0,500),tx:bx,ty:by,tz:120,pull:9,life:.24,s:rand(3,6),m:3,len:.06,c:GFX.rgb('#fff0c0'),c2:'#ffa820',L:3}); } });
  after(tf,()=>{ GFX.gain=.7; Cn.zoom(.68); Cn.tilt(.3,9); SFX.whoosh(.5,1); });
  // ---- the peak: the blade lands behind him and the floor breaks
  if(mk) after(tf+.12,()=>mk.play('slam'));
  after(tf+.2,()=>{ if(!mk) plSeq([['gw05',.05],['gw06',.34],['gw09',.14],['gw10',.14],['gw11',.16],['gw12',9]]); GFX.gain=1.25; hitstop=Math.max(hitstop,.13); Cn.shake(1.9); post.ca=.006; Cn.zoom(.58); Cn.roll(.05); after(.22,()=>Cn.roll(0));
    K.upheave(bx,by,{r:hw*.44,n:7,s:hw*.36,pal:GOLD2,rock:'#2a252c',dur:1.5,a0:Math.PI*.9,a1:Math.PI*2.1}); K.upheave(x0,y0,{r:hw*1.05,n:5,per:1,s:hw*.24,pal:GOLD2,rock:'#2a252c',dur:.95,delay:.06,stagger:.03,a0:Math.PI*.12,a1:Math.PI*.88,jit:.22}); K.upheave(x0,y0,{r:hw*1.1,n:4,per:1,s:hw*.22,pal:GOLD2,rock:'#2a252c',dur:.95,delay:.12,stagger:.02,a0:Math.PI*1.1,a1:Math.PI*1.9,jit:.25});
    K.flip(bx,by,{tex:'v3_flip_shock',floor:true,s:hw*1.55,dur:.75,pal:GOLD2,gain:1}); K.flip(bx,by,{tex:'v3_flip_cut',s:hw*.8,z:BODY*.5,dur:.6,pal:GOLD2,gain:.9});
    // the blow itself: a painted explosion that rolls and turns to smoke, and smoke rising where the floor broke
    K.flip(bx,by,{tex:'v3_flip_blast',s:hw*.66,dur:1,smoke:true,nb:1,c:'#120806',c2:'#4c3a30',lift:.62}); K.flip(bx,by,{tex:'v3_flip_blast',s:hw*.66,dur:1,pal:GOLD2,gain:.85,lift:.62});
    for(let i=0;i<4;i++){ const a=-Math.PI*(.12+.25*i); K.flip(bx+Math.cos(a)*rand(160,300),by+Math.sin(a)*rand(40,110),{tex:'v3_flip_smoke',s:rand(240,330),dur:rand(1.2,1.7),delay:.08+i*.05,smoke:true,c:'#140a0a',c2:'#5e4a44',rise:140}); }
    K.flare(bx,by,BODY*.3,{pal:GOLD2,s:hw*.34,dur:.09,gain:7}); K.flare(bx,by,BODY*.3,{pal:GOLD2,s:hw*.7,sx:3.2,sy:.3,dur:.14,gain:4});
    // the cutting wind of it: one gold crescent round the foot of the blade
    K.cres(bx-f0*hw*.45,by+30,BODY*.3,{reach:hw*1.5,dir:f0>0?0:Math.PI,lean:.78,roll:0,tex:'fx3_slash',pal:GOLD2,swing:.06,hold:.1,fade:.36,gain:.8,sparks:0,light:0,ccw:f0<0});
    GFX.light(bx,by,hw*1.6,'#ffd090',.8,.45,{z:420}); GFX.light(bx,by-120,hw*1.2,'#ffe6b0',.8,.45,{z:300}); GFX.ripple(bx,by,hw*2.8,{life:.7,s:1.3,w:.14});
    sig.dead=true; sig2.dead=true; K.art(x0,y0,{tex:'v3_circ_blade',s:hw*.95,floor:true,dur:.6,pal:GOLD2,gain:.7,hold:.05,s0:.62}); K.sparks(bx,by,20,{pal:GOLD2,n:50,sp:[600,2200],up:1300,life:[.4,1]});
    K.crack(bx,by+30,{r:hw*1.25,ry:1.25,pal:GOLD2,life:6,grow:.2,gain:1.3,alt:1}); K.crack(x0,y0+hh*.3,{r:hw*1.1,pal:P,life:5.5,grow:.7,gain:1,alt:1,rot:rand(0,TAU)}); K.crack(x0-hw*.5,y0-hh*.1,{r:hw*.9,pal:P,life:5,grow:1,gain:.9,alt:1,rot:rand(0,TAU)}); K.crack(x0+hw*.55,y0+hh*.05,{r:hw*.8,pal:P,life:5,grow:1.3,gain:.9,rot:rand(0,TAU)});
    K.shock(bx,by,{r:hw*3,dur:.55,pal:GOLD2,gain:1.4}); K.shock(x0,y0,{r:hw*1.8,dur:.6,pal:P,gain:.8,delay:.08,light:0});
    K.chunks(bx,by,{n:7,r:120,sp:[350,1200],up:2200,s:[40,96],pal:GOLD2,rock:'#2a252c'}); K.debris(bx,by,{n:12,r:300,sp:[300,1500],up:2100,size0:10,size:28}); K.dust(bx,by,{n:22,r:160,sp:[500,1500],a:.5});
    let nb=0; for(const e of onScreen(200)){ if(nb++<9) K.hit(e.x,e.y,e.h*.5+e.z,'#ffd27a',1.5); e.flash=1; e.stun=Math.max(e.stun,1.2); if(!e.d.heavy){ const a=Math.atan2(e.y-by,e.x-bx); e.kx+=Math.cos(a)*rand(360,700); e.ky+=Math.sin(a)*rand(210,420); e.vz=Math.max(e.vz,rand(1500,2300)); } }
    after(.45,()=>Cn.sweep(x0,y0,D*1.5,{speed:4200,max:.3})); post.grayT=0; SFX.shatter(1); Cn.SND.hit(1); SFX.boom(1.6,1);
    K.petals(x0,y0-hh*.2,hw*1.3,{pal:P,n:110,z0:300,z1:1700,life:3.4,s:1.6}); after(1,()=>GFX.light(x0,y0,hw*1.7,'#ff4a20',.4,2.3,{z:140})); });
  // ---- afterglow: the camera rises again; smoke stands over the scars, petals of light come down, the broken floor cools
  after(tf+.42,()=>{ cuts.forEach((c,j)=>K.smoke(c.x,c.y,{s:rand(240,340),dur:rand(1.6,2.2),delay:j*.07,c:'#1c0a12',c2:'#5a2030',a:.55,rise:300})); });
  after(tf+.7,()=>{ if(mk) mk.play('rise'); K.petals(x0,y0,hw*1.3,{pal:P,n:80,z0:500,z1:1400,life:3,s:1.6}); K.embers(x0,y0,hw*1.1,{pal:P,n:50,life:2.4,s:1.3}); GFX.ambient(.7,.72,.78,1.1); Cn.zoom(.8); Cn.tilt(.12,1.6); Cn.cam(null); });
  after(tf+1.55,()=>{ GFX.ambient(1,1,1,1.3); Cn.zoom(1); Cn.tilt(0,2.5); });
  after(tf+2,()=>{ GFX.gain=1.25; tp(x0,y0); ultStop(); if(mk) mk.free(); }); }

// SWORD RAIN: a blade raised to a sky that answers - rings of falling swords walk outward from him, stay standing in the earth, and the last one is the size of a tower.
function ultRain(id){ ultStart(id); const Cn=X.cine, K=K3, D=9000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), P='gold', f0=pl.f, ZS=2400, LS=430, HOLD=.62, RW=Math.min(980,hw), stuck=[], tipX=x0+f0*14, tipZ=BODY*2.25, tU=RT, g0=GFX.gain,
    SH=GFX.st(12,'alpha',{L:0}), SH2=GFX.st(12,'alpha',{L:3}), GL=GFX.st(8,'add',{L:0}), gold=GFX.rgb('#ffc040');
  // ---- omen (under a second, close on him): the blade goes up to the sky, a gold seal snaps onto the floor, motes climb the blade, and a column of light leaves its point
  plSeq([['gw02',.08],['gw03',.1],['gw04',4.22],['gw05',.05],['gw06',.7],['gs12',9]]); pl.target='cast'; pl.ps=10;
  GFX.ambient(.42,.36,.32,4); const spot=GFX.light(x0,y0,560,'#ffc040',.7,.5,{hold:5.3,z:140});
  K.sigil(x0,y0,{r:hw*.4,dur:1.9,in:.3,out:.6,spin:.7,pal:P,hole:.35});
  Cn.zoom(1.45); Cn.tilt(.05,4); Cn.cam(x0,y0-BODY*1.5,6); duck(.3,.7); Cn.SND.inhale(.6,.5);
  for(let i=0;i<34;i++) after(rand(0,.5),()=>{ const a=rand(0,TAU), d=rand(200,640); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,200),tx:tipX,ty:y0,tz:tipZ,pull:rand(6,9),life:rand(.3,.45),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*400,vy:Math.cos(a)*240,vz:rand(100,400),c:GFX.rgb(Math.random()<.4?'#ffffff':'#ffe08a'),c2:'#ff9a10',L:3}); });
  K.flare(tipX,y0,tipZ,{pal:P,s:60,dur:.3,gain:3,delay:.2});
  after(.38,()=>{ ray(tipX,y0,{pal:P,z:tipZ,w:64,h:ZS,dur:.5,gain:.9,rise:.12}); K.flare(tipX,y0,tipZ,{pal:P,s:150,dur:.3,gain:4}); K.sparks(tipX,y0,tipZ,{pal:P,n:16,sp:[200,700],up:1100}); K.flip(x0,y0,{tex:'v3_flip_shock',floor:true,s:hw*.5,pal:P,dur:.45,gain:.8}); K.dust(x0,y0,{n:6,r:40,sp:[200,500],a:.4}); Cn.SND.shing(.7,.5); SFX.whoosh(.8,.6); Cn.shake(.3); });
  // ---- the sky answers: a hole tears open in the clouds high over the field and its light pours down on him; the camera falls back and sinks to take it in
  let sky=null;
  after(.58,()=>{ sky=skyGate(x0,y0,ZS,{r:hw*1.7,dur:4.5,in:.45,out:.4,pal:P}); K.flare(x0,y0,ZS,{pal:P,s:460,dur:.5,gain:3}); GFX.light(x0,y0,hw*1.15,'#ffc040',.6,.5,{hold:2.9,z:320}); Cn.SND.shing(1.1,.5); SFX.choir(2.6); });
  after(.8,()=>{ Cn.zoom(.67); Cn.tilt(.2,3); Cn.cam(x0,y0-hh*.26,3.5); GFX.ambient(.36,.31,.3,3); });
  after(1.2,()=>{ if(sky){ sky.a=1.5; sky.pk=RT; } K.shock(x0,y0,{r:hw*1.1,dur:.5,pal:P,gain:.6,light:0}); GFX.ripple(x0,y0,hw*1.3,{life:.5,s:.6}); K.dust(x0,y0,{n:12,r:60,sp:[300,800],a:.4}); Cn.shake(.4); });
  after(1.5,()=>{ if(sky){ sky.a=1; sky.pk=RT; } K.sparks(x0,y0,ZS-200,{pal:P,n:30,sp:[200,900],up:-200,life:[.4,.9]}); });
  // ---- the rain: few swords, each twice the height of a man. Every landing is a cut that reads from across the field (the painted cut burst at the point,
  // a shock ring on the floor, a puff of dust, a shadow); a sword stands for a breath and crumbles into the hole it made
  const land=(x,y,tilt,sc)=>{ const s={x,y,t0:RT,tilt,sc,ph:rand(0,9),out:0,gone:false}; stuck.push(s);
    if(inView(x,y,500)){ GFX.light(x,y,700,'#ffc040',1.1,.32,{z:80}); GFX.add(.28,k=>GFX.floor(GL,x,y,(90+300*k)*sc*.6,null,0,gold,.95*(1-k)*(1-k)));
      K.flip(x,y,{tex:'v3_flip_cut',s:190*sc,z:20,lift:.45,pal:P,dur:.42,gain:1}); K.flip(x,y,{tex:'v3_flip_shock',floor:true,s:230*sc,pal:P,dur:.5,gain:.9});
      if(!FX3.low) K.flip(x,y,{tex:'v3_flip_smoke',smoke:true,s:150*sc,z:0,dur:1,c:'#1a161e',c2:'#5c5466',rise:140,delay:.05,a:.8});
      K.dust(x,y,{n:5,sp:[200,620],a:.5,s:1.2}); K.sparks(x,y,14,{pal:P,n:12,sp:[300,1500],up:1100,life:[.15,.45]}); K.debris(x,y,{n:5,r:30,sp:[160,640],up:1100,size0:6,size:22}); Cn.shake(.32);
      after(HOLD,()=>{ if(s.gone) return; K.sparks(x,y,LS*sc*.5,{pal:P,n:10,sp:[80,360],up:500,life:[.25,.5]}); K.flip(x,y,{tex:'v3_flip_smoke',smoke:true,s:110*sc,dur:.8,c:'#1a161e',c2:'#5c5466',rise:100,a:.6,nb:1}); }); }
    sfx('boom',.7,.4); sfx('slash',1.4,.4); inCircle(x,y,300,e=>{ dmg(e,D*1.6,{kb:.7,stun:.5,sx:x,sy:y}); hitFx(e,GOLD,1.2); }); };
  const fall=(e,px,py)=>{ const j=rand(0,.12), s={x:e?e.x:px,y:e?e.y:py,lock:false}, sc=[1.7,2,2.4][(Math.random()*3)|0], tilt=rand(.1,.28)*(Math.random()<.5?-1:1), hang=.3+j, Z=ZS-rand(120,300)-LS*sc;
    after(hang,()=>{ if(e){ s.x=e.x; s.y=e.y; } s.lock=true; after(.2,()=>land(s.x,s.y,tilt,sc)); });
    GFX.add(hang+.2,(k,t)=>{ if(!s.lock&&e){ s.x=e.x; s.y=e.y; } if(!inView(s.x,s.y,500)) return; const d=sat((t-hang)/.2), i=sat(t/.16), z=(Z-90*sat(t/hang))*(1-d*d);
      GFX.floor(SH,s.x,s.y,mix(190,90,k)*sc*.6,null,0,[0,0,0],.2+.55*k); GFX.floor(GL,s.x,s.y,mix(230,100,k)*sc*.6,null,0,gold,.06+.24*k*k);
      fsword(s.x,s.y,z,LS*sc*(.8+.2*i),tilt*(1-d*.4),.9+1.2*(1-i)+d*.8,i);
      if(d>0){ const tl=1700*Math.sin(Math.PI*Math.min(1,d*1.1)); FX3.bill(rayB(),s.x,s.y,z+LS*sc*.75+tl/2,34*sc,tl/2,0,{...pc(P),a:.9,gain:1.6,ero:.05,t0:px}); } }); };
  const T=onScreen(60);
  for(let k=0;k<5;k++){ const n=2+k, rr=230+k*(Math.max(hw,hh)*.2);
    after(1.68+k*.3,()=>{ for(let i=0;i<n;i++){ const a=i/n*TAU+k*.9; fall(T.length&&i%2?T[(Math.random()*T.length)|0]:null,x0+Math.cos(a)*rr,y0+Math.sin(a)*rr*.8); } if(sky) sky.pk=RT; });
    after(1.98+k*.3,()=>{ Cn.SND.shing(.8+k*.08,.4); });
    after(2.18+k*.3,()=>{ K.shock(x0,y0,{r:rr*1.1,r0:Math.max(60,rr-420),dur:.4,pal:P,gain:.34,dust:0,light:0,thick:0,painted:k<3?1:0,haze:.4}); if(sky) sky.pk=RT; }); }
  // swords and their scars in one batched pass: the scar is a dark hole with gold fracture light that cools and outlives the ultimate
  GFX.add(8.6,()=>{ const now=RT, al=sat((8.4-(now-tU))/.6); for(const s of stuck){ if(!inView(s.x,s.y,500)) continue; const q=now-s.t0, sc=s.sc, f=s.gone?1:sat((q-HOLD)/.28);
      let heat=Math.max(.3,Math.pow(Math.max(0,1-q/2.2),1.5)); if(s.out) heat=Math.pow(Math.max(0,1-(now-s.out)/2.8),1.4)*1.35;
      GFX.floor(GL,s.x,s.y,70*sc,null,0,gold,.55*heat*al); GFX.floor(SH,s.x,s.y,34*sc,null,0,[0,0,0],.85*sat(q/.1)*al); GFX.floor(GL,s.x,s.y,15*sc,null,0,gold,.9*heat*al);
      if(f<1){ GFX.floor(SH,s.x+34*sc,s.y+8,74*sc,30*sc,0,[0,0,0],.6*(1-f));
        fsword(s.x,s.y,-LS*sc*(.05*sat(q/.05)+.14*f),LS*sc,s.tilt*(1+.5*Math.exp(-q*9)*Math.cos(q*48)),(1+.9*Math.exp(-q*7))*(1+f),1,f*.95);
        GFX.floor(SH2,s.x,s.y+4,22*sc,null,0,[0,0,0],.85*(1-f)); } } });
  // ---- the finisher is his own: every sword that fell comes back out of its hole, they gather into a wheel of blades round the mark, point inward,
  // and on his command the wheel closes: all of them cross on one point and stand there as a crown of swords
  let cx=x0+f0*hw*.42, cy=y0+hh*.16; const FB=[], LF=LS*2, wrapA=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const wheelA=(b,tt)=>b.a0+.9*Math.max(0,tt-4)+16*Math.pow(Math.max(0,Math.min(tt,4.65)-4.43),2), wheelR=tt=>tt<4.43?RW:mix(RW,150,Math.pow(sat((tt-4.43)/.22),3));
  // where blade b is at ult time tt: {x,y,z (its point), tilt, a (alpha), k (brightness)} - a pure function of time, so trails can ask where it was
  const bpos=(b,tt)=>{ const t1=3.6+b.d; if(tt<t1) return null;
    if(tt<4){ const u=eo3(sat((tt-t1)/.3)); return {x:b.x,y:b.y,z:mix(b.z0,250,u)+14*Math.sin(tt*9+b.ph),tilt:b.tilt*(1-u),a:1,k:1.2+1.2*(1-u)}; }
    if(tt<4.65){ const A_=wheelA(b,tt), R=wheelR(tt), sx=cx+Math.cos(A_)*R, sy=cy+Math.sin(A_)*R*FSY, u=eo3(sat((tt-4)/.38)), x=mix(b.x,sx,u), y=mix(b.y,sy,u), ti=Math.atan2(x-cx,-(y-cy)), c=sat((tt-4.43)/.22);
      return {x,y,z:mix(mix(250,340,u),70,c*c),tilt:wrapA(ti)*u,a:1,k:1.3+1.3*c}; }
    const A_=wheelA(b,4.65), q=tt-4.65, hx=Math.cos(A_)*.82, hy=Math.sin(A_)*.5-1; return {x:cx+Math.cos(A_)*150,y:cy+Math.sin(A_)*150*FSY,z:-LF*.07*sat(q/.05),tilt:Math.atan2(hx,-hy)*(1+.12*Math.exp(-q*9)*Math.cos(q*46)),a:1,k:1+1.6*Math.exp(-q*6)}; };
  const contact=()=>{ GFX.gain=g0; if(sky){ const S_=sky, a0=S_.a, r0=S_.r; GFX.add(.3,k=>{ S_.a=a0*(1-k); S_.r=r0*(1+.3*k); }); after(.3,()=>{ S_.dead=true; }); }
    hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.64); Cn.roll(-.03); GFX.ambient(.44,.38,.31,40); after(.15,()=>GFX.ambient(.4,.34,.3,3));
    // the cut: the painted cut burst three times over at the crossing, and one more at each place two blades met on the way in
    for(let i=0;i<3;i++) K.flip(cx,cy,{tex:'v3_flip_cut',s:[620,460,820][i],z:60,lift:.35,pal:P,dur:.5+i*.06,gain:[1.1,1.2,.7][i],rot:[0,.5,-.35][i],delay:i*.03});
    for(let i=0;i<6;i++){ const a=i/6*TAU+.4, r=rand(330,470); K.flip(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{tex:'v3_flip_cut',s:rand(240,320),z:40,lift:.45,pal:P,dur:.4,rot:rand(-.6,.6),delay:.03+i*.025,nb:1}); }
    K.flip(cx,cy,{tex:'v3_flip_shock',floor:true,s:hw*.95,pal:P,dur:.55,gain:1.1}); K.shock(cx,cy,{r:hw*1.5,dur:.55,pal:P,gain:1}); K.shock(cx,cy,{r:hw*2.2,dur:.85,pal:P,gain:.6,delay:.1,light:0,painted:0,dust:0}); GFX.ripple(cx,cy,hw*2,{life:.6,s:.9});
    // the ground break round the crown, slabs, grit, dust rolling up into dark smoke
    crater(cx,cy,{r:520,life:3.2,pal:P}); K.upheave(cx,cy,{r:560,n:9,s:230,a0:Math.PI*1.04,a1:Math.PI*1.96,pal:P,dur:1.5}); K.upheave(cx,cy,{r:600,n:4,s:120,a0:.25,a1:Math.PI-.25,pal:P,dur:1.2,jit:.2});
    K.debris(cx,cy,{n:18,r:300,sp:[300,1100],up:1700,size0:14,size:34}); K.dust(cx,cy,{n:20,r:160,sp:[500,1400],a:.55}); K.sparks(cx,cy,40,{pal:P,n:40,sp:[500,2200],up:1900,life:[.3,.9]});
    for(let i=0;i<4;i++){ const a=i/4*TAU+rand(0,1); K.flip(cx+Math.cos(a)*300,cy+Math.sin(a)*300*FSY,{tex:'v3_flip_smoke',smoke:true,s:rand(300,400),dur:rand(1.2,1.6),c:'#16121a',c2:'#5c5466',rise:240,delay:.08+i*.07}); }
    GFX.light(cx,cy,hw*1.6,'#ffc040',1.2,1,{z:260});
    // everything near it is thrown into the air on the same frame; the killing blow follows while they are still flying
    X.inCircleS(cx,cy,1000,e=>{ const dx=e.x-cx, dy=e.y-cy, l=Math.hypot(dx,dy)||1; e.flash=1; e.stun=Math.max(e.stun,.9); if(!e.d.heavy){ e.vz=Math.max(e.vz,rand(900,1600)); e.kx+=dx/l*rand(260,620); e.ky+=dy/l*rand(160,380); } });
    after(.3,()=>Cn.sweep(cx,cy,D*8,{speed:3400})); SFX.shatter(1); Cn.SND.hit(1); SFX.boom(1.6,1);
    for(const s of stuck){ const d=Math.hypot(s.x-cx,s.y-cy); after(Math.min(.7,d/2300),()=>{ s.out=RT; }); }
    K.embers(cx,cy,hw*1.1,{pal:P,n:50,life:2.4,up:420,s:2}); };
  after(3.45,()=>{ const dn=V.boss&&!V.boss.dead?V.boss:X.densest(hw*.9,320);
    if(dn){ let dx=dn.x-x0, dy=dn.y-y0, l=Math.hypot(dx,dy); if(l<1){ dx=f0; dy=.3; l=Math.hypot(dx,dy); } const m=Math.max(l,300)/l; cx=clamp(x0+dx*m,x0-hw*.62,x0+hw*.62); cy=clamp(y0+dy*m,y0-hh*.32,y0+hh*.34); }
    if(cy>y0-140&&Math.abs(cx-x0)<540) cx=x0+(cx>=x0?1:-1)*540;
    Cn.zoom(.6); Cn.tilt(.28,2.5); Cn.cam(mix(x0,cx,.6),mix(y0,cy,.6)-hh*.24,3); GFX.ambient(.34,.3,.3,3); Cn.SND.inhale(.85,.6); pl.ps=20;
    // the gate slides over the mark and its light narrows to a shaft on it: the announcement (shaft, pool, seal, shadow)
    if(sky){ const S_=sky, sx=S_.x, sy=S_.y, r0=S_.r; S_.a=1.6; GFX.add(.5,k=>{ const e=eo3(k); S_.x=mix(sx,cx,e); S_.y=mix(sy,cy,e); S_.r=mix(r0,hw*1.35,e); S_.sr=mix(.22,.1,e); }); after(.5,()=>{ S_.x=cx; S_.y=cy; S_.sr=.1; }); }
    K.sigil(cx,cy,{r:420,dur:1.2,in:.25,out:.25,spin:1.6,pal:P,tex:'fx_circle_seal',hole:.2}); GFX.light(cx,cy,620,'#ffc040',.7,.3,{hold:.9,z:60});
    GFX.add(1.2,k=>{ const r=mix(300,520,k); FX3.quad(K.mats().dark,cx,cy,r,r,0,{a:.3+.5*k}); }); });
  // the swords come back: each hole flares and gives up its blade (the ones still standing simply lift), nearest the mark first
  after(3.6,()=>{ const n=stuck.length; stuck.forEach((s,i)=>{ const st=!s.gone&&RT-s.t0<HOLD; s.gone=true; const d=Math.hypot(s.x-cx,s.y-cy), b={x:s.x,y:s.y,ph:s.ph,tilt:s.tilt,z0:st?0:-LF*.85,d:Math.min(.3,d/5000),a0:i/Math.max(1,n)*TAU};
      FB.push(b); after(b.d,()=>{ s.out=RT; if(inView(s.x,s.y,500)){ K.sparks(s.x,s.y,20,{pal:P,n:10,sp:[150,600],up:1300,life:[.25,.6]}); K.flip(s.x,s.y,{tex:'v3_flip_smoke',smoke:true,s:200,dur:.8,c:'#1a161e',c2:'#5c5466',rise:160,a:.7,nb:1}); GFX.light(s.x,s.y,420,'#ffc040',.8,.3,{z:60}); } }); });
    for(let i=n;i<12;i++) FB.push({x:cx+rand(-RW,RW),y:cy+rand(-RW,RW)*FSY,ph:rand(0,9),tilt:0,z0:-LF*.85,d:rand(0,.3),a0:i/12*TAU});
    sfx('whoosh',.6,.8); Cn.SND.shing(.9,.5);
    GFX.add(2.2,()=>{ const tt=RT-tU, tr=K.mats().trB, C=pc(P), f=sat((tt-5.2)/.42); for(const b of FB){ const p=bpos(b,tt); if(!p) continue;
        if(tt>=4.65) GFX.floor(SH,p.x+60,p.y+14,150,60,0,[0,0,0],.5*(1-f)); else GFX.floor(SH,p.x,p.y,110,null,0,[0,0,0],.3);
        fsword(p.x,p.y,p.z,LF,p.tilt,p.k*(1+f),1,f*.95);
        if(tt>4.45&&tt<4.67){ const ps=[]; for(let j=0;j<6;j++){ const q=tt-j*.028>4.43?bpos(b,tt-j*.028):null; if(q) ps.push({x:q.x-Math.sin(q.tilt)*-LF*.5,y:q.y,z:q.z+Math.cos(q.tilt)*LF*.5,w:76*(1-j/6)}); } if(ps.length>2) FX3.ribbon(tr,ps,{...C,gain:2.4,a:.8,ero:.1,t0:b.ph}); } } }); });
  after(4.0,()=>{ SFX.whoosh(.9,.8); Cn.SND.shing(1.2,.5); if(sky) sky.pk=RT; });
  // the held breath: the field dims, dust and light are drawn in, and the wheel closes
  after(4.43,()=>{ GFX.gain=.62; GFX.ambient(.3,.3,.34,26); duck(.15,.3); pl.target='slashU'; sfx('whoosh',.4,1);
    for(let i=0;i<30;i++){ const a=rand(0,TAU), d=rand(600,1150); GFX.pt({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*FSY,z:rand(10,260),tx:cx,ty:cy,tz:80,pull:rand(9,13),life:rand(.16,.22),s:rand(3,6),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':'#ffe08a'),c2:'#ff9a10',L:3}); }
    K.shock(cx,cy,{r0:980,r:140,dur:.22,pal:P,gain:.7,light:0,dust:0,painted:0,haze:.9,th:.5}); });
  after(4.65,contact);
  // ---- afterglow: the crown of swords burns away, rock crumbles, smoke lifts, gold comes down through the returning light; the scars cool at their own pace
  after(5.05,()=>{ K.petals(cx,cy,hw*1.1,{pal:P,n:50,z0:300,z1:1500,life:2.4,s:2.2}); K.embers(cx,cy,hw,{pal:P,n:40,life:2.2,s:2.2,z:300}); });
  after(5.2,()=>{ for(const b of FB){ const p=bpos(b,5.2); if(p) K.sparks(p.x+Math.sin(p.tilt)*LF*.5,p.y,LF*.4,{pal:P,n:6,sp:[80,360],up:500,life:[.3,.6]}); } });
  after(5.45,()=>{ GFX.ambient(.8,.74,.66,1.6); Cn.zoom(1); Cn.tilt(0,2.5); Cn.roll(0); });
  after(5.6,()=>Cn.cam(null));
  after(5.7,()=>GFX.ambient(1,1,1,2.5));
  after(5.95,()=>{ GFX.gain=g0; if(sky) sky.dead=true; ultStop(); }); }

X.reg('sword',{basic:{fn:basic,cd:basicCd},skills:SKILL,ults:{sw_ult1:ultZero,sw_ult2:ultRain},onHurt:src=>{ if(!counterReady()) return false; counter(src); return true; },
  glow:()=>{ if(counterReady()) glow(fx,pl.x,pl.gy-BODY,150,'#9ff7ff',.12+.08*Math.sin(RT*6)); }});
})();
