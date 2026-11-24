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
      p.v.x=p.x; p.v.y=p.y-BODY; V.pj.push(p); flyCres(p,fa(a),{pal:'crimson',s:165,asp:.95,life:.85,tex:'v3_slash_heavy',lean:.7}); } }},
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
function upCres(x,y,z,o){ upArt(); K3.cres(x,y,z,{...o,s:o.s*1.06,tex:'v3_cres_up',lean:.9,off:.5,rk:[.07,.6],gain:.75*(o.gain||1),sparks:0,light:0}); K3.cres(x,y,z,{...o,tex:'v3_cres_up',lean:.9,off:.5}); }
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
// GREATSWORD: the grey greatsword mask through a gold ramp (dark edge, gold body, pale gold, white only on the edges and the point), point down on (x,y,z).
//  L full length, tilt, bury = part under the ground, vis = how much of it (from the point up) has come through: the rest is cropped, a blade passing a gate
const GSP={d:'#2a1300',b:'#e08c06',m:'#ffd970',h:'#fffdf2'};
function gsword(x,y,z,L,tilt,o={}){ const b=o.bury||0, v=o.vis??1; if(v-b<=.01) return; const hh=L*(v-b)/2, P=o.pal||GSP, mt=lm('gsw',m=>FX3.mat({...m.art,tex:'v3_greatsword',layer:'o',nz:'fbm',n1:[3,3,0,.2],nk:0,ero:.06,soft:.12,op:.92,rk:[.42,1.2],gain:2,bgain:1.05}));
  FX3.bill(mt,x+Math.sin(tilt)*hh,y,z+Math.cos(tilt)*hh,L*.25,hh,tilt,{uvT:[1,v-b,0,b],cA:P.d,cB:P.b,cM:P.m,cC:P.h,a:o.a??1,gain:o.gain??2,bgain:o.bgain??1.05,ero:o.ero??.06,nk:o.nk??0}); }
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
// SKY SIGIL: a magic circle hanging in the air at height z (drawn over the scene), written from the centre outward. Returns a handle {x,y,z,r,a,dead}
function skySigil(x,y,z,o={}){ const h={x,y,z,r:o.r||500,a:1,dead:false}; if(!FX3.on) return h; const C=pc(o.pal||'gold'), dur=o.dur||3, tin=o.in??.5, tout=o.out??.5, spin=o.spin??-.2, g=o.gain||1, m=K3.mats(), tex=o.tex||'fx_circle_arcane',
    ma=FX3.mat({...m.sig,tex,layer:'o'}), mb=FX3.mat({...m.sigN,tex,layer:'o'}), mg=lm('skyG',()=>FX3.mat({...m.glowG,layer:'o'}));
  // lean > 0 lays it flatter than the floor's own ellipse (it reads as nearer the eye, so higher); veil = a curtain of light hanging from its rim
  const lean=o.lean||0, mv=lm('skyV',()=>FX3.mat({nz:'fbm',n1:[13,.04,.03,.1],n2:[2,1,0,.3],dist:.03,nk:.75,pw:1.3,ero:.04,soft:.7,fd:[0,0,.02,.98],rk:[.8,1.5],gain:1,bgain:.8,layer:'o'})), sd=Math.random()*9;
  GFX.add(dur,(k,t)=>{ if(h.dead) return; const i=sat(t/tin), out=sat((dur-t)/tout), a=h.a*out, rr=h.r*(.9+.1*eo3(i)), M=(s,rz)=>FX3.xfw({sx:s,sy:s,rx:lean,rz});
    if(o.veil) FX3.lathe(mv,h.x,h.y,h.z,{r0:rr*.97,r1:rr*1.04,h0:0,h1:-o.veil,M:FX3.xfw({rx:lean}),...C,a:.15*Math.min(1,a)*i,gain:.7,t0:sd});
    FX3.quad(mg,h.x,h.y,rr*1.25,rr*1.25,0,{z:h.z,M:M(rr*1.25,0),...C,a:.3*Math.min(1,a)*i,gain:.7,bgain:.5});
    FX3.quad(ma,h.x,h.y,rr,rr,0,{z:h.z,M:M(rr,t*spin),...C,a:Math.min(1,a)*.85,gain:2.2*g*Math.max(1,a),rv:[i*1.5,.25,0,.1]});
    FX3.quad(mb,h.x,h.y,rr,rr,0,{z:h.z,M:M(rr,t*spin),...C,a:Math.min(1,a)*(.4+.3*Math.sin(t*5)),gain:2.6*g,rv:[i*1.5,.25,0,.1]}); },o.delay||0);
  return h; }
// LANCE: the painted thrust (its tip is the far end) on a camera-facing ribbon from (x0,y0) to (x1,y1) at height z: the tip leads,
// the body is revealed behind it, then it burns away from the tail
function lance(x0,y0,x1,y1,o={}){ if(!FX3.on) return; const C=pc(o.pal||'crimson'), z=o.z??BODY*.55, draw=o.draw??.06, hold=o.hold??.06, fade=o.fade??.2, life=draw+hold+fade, L=Math.hypot(x1-x0,y1-y0), w=o.w||Math.max(100,L/3.7*1.25), sd=Math.random()*9, g=o.gain||1,
    mt=lm('lance',m=>FX3.mat({...m.art,tex:'v3_thrust',layer:'o',nz:'streak',n1:[2,1,-3,0],n2:[2,1,-2,0],dist:.02,mdist:1,pw:.5,rk:[.4,1.05]}));
  if(o.core){ const ps=[]; for(let i=0;i<7;i++) ps.push({x:mix(x0,x1,.06+i/6*.9),y:mix(y0,y1,.06+i/6*.9),z}); K3.trail(ps,{pal:o.pal||'crimson',w:o.core,dur:life*.85,draw,hold,gain:.8,delay:o.delay||0}); }
  GFX.add(life,(k,t)=>{ const p=Math.max(.06,eo5(sat(t/draw))), f=sat((t-draw-hold)/fade), n=5, ps=[]; for(let i=0;i<n;i++){ const u=i/(n-1)*p; ps.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z,w:w*(1+f*.2)}); }
    FX3.ribbon(mt,ps,{...C,a:1-f*f,gain:3*g,bgain:1.1,ero:.08+f*.7,nk:.15+f*.7,uvT:[p,1,1-p,0],fd:[.02+f*.6,0,0,0],t0:sd}); },o.delay||0); }
// FLYING CRESCENT: a painted crescent held open and carried by a projectile p ({x,y,life}), cutting edge first; it burns out when the projectile ends
function flyCres(p,dir,o={}){ if(!FX3.on) return; const P=K3.pal(o.pal||'crimson'), C=pc(P), tex=o.tex&&FX3.ready(o.tex)?o.tex:'fx3_slash', A_=K3.ART[tex], s=o.s||150, asp=o.asp||A_.asp, life=o.life||.85, sd=Math.random()*9, z=o.z??BODY*.55, rz=dir+Math.PI,
    mt=FX3.mat({...K3.mats().art,tex,layer:'o',nz:'wisp',n1:[1.5,1.5,.9,.1],n2:[1.2,1.2,.4,.1],dist:.03,mdist:1,rk:A_.rk}), L=GFX.light(p.x,p.y,s*3.4,P.l,.8,.18,{hold:life,z});
  let end=-1, acc=0; const e=GFX.add(life+.3,(k,t)=>{ if(end<0&&(p.life<=0||t>=life)){ end=t; L.hold=0; L.life=.15; L.t=0; } const i=sat(t/.07), f=end<0?0:sat((t-end)/.16); if(f>=1){ e.dead=true; return; }
    const ss=s*(.7+.3*eo3(i))*(1+.15*f), off=ss*asp*(A_.piv[0]-.5)*2, cx=p.x+Math.cos(dir)*off*.55, cy=p.y+Math.sin(dir)*off*.55*FSY; L.x=p.x; L.y=p.y;
    FX3.quad(mt,cx,cy,ss*asp,ss,0,{z,M:FX3.xfw({sx:ss*asp,sy:ss,rx:-(o.lean??.5),ry:o.roll||0,rz}),...C,a:i*(1-f*f),gain:3*(o.gain||1),bgain:1.1,ero:.1+.05*Math.sin(t*40+sd)+f*.6,nk:.3+f*.6,aw:[A_.piv[0],A_.piv[1],-.8,-1],aw2:[.9,0,.1,1],t0:sd});
    acc+=1; if(end<0&&acc%2===0) GFX.pt({x:p.x+rand(-20,20),y:p.y+rand(-50,50)*FSY,z:z+rand(-40,60),vx:-Math.cos(dir)*rand(100,400),vy:-Math.sin(dir)*rand(100,400)*FSY,vz:rand(-40,160),g:300,drag:1.5,life:rand(.2,.45),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?'#ffffff':P.s),c2:P.b,L:3}); }); }


// ---- ultimates. Each is one staged sequence: omen -> release -> climax -> afterglow (director: cine.js)
const RED='#ff2a4a', GOLD='#ffcf4a';
function cutFx(c,thick){ const K=VFX.td_cutline, k=K?c.L/K.w:1;   // stretched along the cut, kept thin across it
  if(tdV('td_cutline',c.cx,c.cy-BODY*.5,{rot:c.a,sc:k,sy:K?300*thick/(K.h*k):1,a:1})) return;
  const y=-BODY*.5; add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.45,c:'#ff3355',w:22*thick,grow:true}); add({k:'line',x1:c.x1,y1:c.y1+y,x2:c.x2,y2:c.y2+y,life:.3,c:'#ffffff',w:5*thick,grow:true}); }
// ZERO SLASH: a silver circle writes itself under him; one drawn breath; a crescent the width of the field; then eight cuts nobody sees,
// each left hanging in the air where it was made - a rosette of cold blades round the place he stood. The blade goes home in silence,
// the camera sinks toward the floor - and only then do the eight catch fire, a crown of flame closes round him, and the light he held back comes down.
function ultZero(id){ ultStart(id); const Cn=X.cine, K=K3, D=80000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), N=8, hy=y0-BODY*.55, P='crimson', f0=pl.f, RR=hw*.8,
    GOLD2={d:'#3a0a00',b:'#ffa820',m:'#ffe9a0',h:'#ffffff',l:'#ffc880',s:'#fff0c0'}, STEEL={d:'#04060e',b:'#5f78c0',m:'#b8ccff',h:'#f4f8ff',l:'#9ab4ff',s:'#d0dcff'};
  // ---- omen: the light turns cold, the circle writes itself, the air is drawn to the hilt
  plSeq([['gs03',.12],['gs04',9]]); pl.target='iaiReady'; pl.ps=18;
  GFX.ambient(.46,.58,.68,3.5); const spot=GFX.light(x0,y0-60,560,'#d8e4ff',.8,.6,{hold:9,z:200});
  const sig=K.sigil(x0,y0,{r:hw*.6,dur:9,in:1.05,out:.3,spin:.32,pal:'silver',gain:.5,hole:.3}), sig2=K.sigil(x0,y0,{r:hw*.86,dur:9,in:1.2,out:.3,spin:-.2,pal:'silver',gain:.28,hole:.64});
  sig2.a=.6; K.crack(x0,y0,{r:230,pal:P,life:5.5,grow:1.1});
  Cn.zoom(1.36); Cn.roll(-.04); Cn.cam(x0,hy,4.5); Cn.tilt(.1,1.5); duck(.3,.7); SFX.heart(1); after(.5,()=>SFX.heart(.9)); Cn.SND.inhale(1.15,.5);
  for(let i=0;i<3;i++) after(.15+i*.32,()=>K.shock(x0,y0,{r0:hw*(1.05-i*.12),r:60,dur:.42,pal:'silver',gain:.5,light:0,dust:0,haze:.5,th:.6,painted:0}));
  for(let i=0;i<46;i++) after(rand(0,.95),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,420),tx:x0+f0*30,ty:y0,tz:BODY*.55,pull:rand(4.5,7),life:rand(.4,.6),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*500,vy:Math.cos(a)*300,c:GFX.rgb(Math.random()<.4?'#ffffff':'#c8d8ff'),c2:'#8aa0d8',L:3}); });
  for(let i=0;i<10;i++) after(rand(.2,1),()=>{ const a=rand(0,TAU), d=rand(120,420); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vz:rand(120,300),g:-60,life:rand(.7,1.1),s:rand(5,12),rot:rand(0,TAU),vr:rand(-3,3),m:11,b:'alpha',c:GFX.rgb('#6a6276'),c2:'#0c0a10',shadow:true,fk:4,L:2}); });
  // eight strokes: a rosette of crescents round him, each thrown outward, alternating thin and full, each in its own tilted plane
  const cuts=[]; for(let i=0;i<N;i++){ const th=-Math.PI/2+i*TAU/N+rand(-.06,.06), side=Math.abs(Math.cos(th));
    cuts.push({th,px:x0+Math.cos(th)*hw*.1,py:y0+Math.sin(th)*hw*.1*FSY,reach:hw*(.82+.2*side)*rand(.95,1.08),lean:.3+.3*(1-side)+rand(-.05,.05),roll:(i%2?1:-1)*rand(.12,.34),tex:i%2?'v3_slash_thin':'fx3_slash',ccw:i%2,h:null}); }
  const DASH=[0,3,6,1,4,7,2,5].map(i=>cuts[i]);
  const mid=c=>[c.px+Math.cos(c.th)*c.reach*.7,c.py+Math.sin(c.th)*c.reach*.7*FSY];
  // the crown: eight arcs of one ring round him, each its own height
  const arcs=[]; for(let i=0;i<N;i++){ const a0=-Math.PI/2+(i-.5)/N*TAU, a1=a0+TAU/N, th=(a0+a1)/2; arcs.push({a0,a1,th,k:rand(.78,1.14),far:Math.abs(Math.atan2(Math.sin(th+Math.PI/2),Math.cos(th+Math.PI/2)))}); }
  arcs.sort((a,b)=>a.far-b.far);
  // ---- the draw: one crescent across the whole field, the camera gives it room
  const t0=1.3;
  after(t0-.07,()=>{ K.flare(x0+f0*40,y0,BODY*.6,{pal:'silver',s:60,sx:5,sy:.35,dur:.16,gain:5}); Cn.SND.tick(1.4,.3); });
  after(t0,()=>{ spot.hold=0; spot.life=.25; pl.target='slashU'; plSeq([['gs05',.03],['gs07',.05],['gs09',9]]); const dir=f0>0?0:Math.PI;
    K.cres(x0-f0*hw*.25,y0,BODY*.55,{reach:hw*1.12,dir,lean:.58,roll:-.12*f0,tex:'fx3_slash',pal:P,swing:.08,hold:.18,fade:.46,gain:1,sparks:0,ccw:f0<0});
    K.cres(x0-f0*hw*.25,y0,BODY*.55,{reach:hw*1.2,dir,lean:.58,roll:-.12*f0,tex:'v3_slash_thin',pal:P,swing:.07,hold:.12,fade:.34,gain:.95,sparks:0,light:0,ccw:f0<0});
    K.art(x0+f0*90,y0,{tex:'v3_xburst',s:hw*.36,z:BODY*.1,dur:.3,pal:P,gain:1.05,hold:.2,s0:.6});
    K.shock(x0,y0,{r:hw*1.7,dur:.55,pal:P}); GFX.ripple(x0,y0,hw*1.8,{life:.45,s:.7});
    K.sparks(x0+f0*60,y0,BODY*.6,{pal:P,n:40,sp:[500,1900],up:500,dir,spread:1.5});
    K.dust(x0,y0,{n:14,r:80,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,700],up:900});
    hitstop=Math.max(hitstop,.085); Cn.shake(1); post.ca=.005; Cn.zoom(.8); Cn.cam(null); Cn.roll(.03); Cn.tilt(.14,6); SFX.slash(.8,1.2); Cn.SND.shing(.8,.7); SFX.whoosh(.7,1);
    X.inCircleS(x0,y0,hw*1.3,e=>{ e.flash=1; e.stun=Math.max(e.stun,3.2); e.kx+=(e.x-x0>0?1:-1)*120; hitFx(e,RED,1); }); });
  after(t0+.11,()=>{ pl.visible=false; K.flare(x0,y0,BODY*.6,{pal:P,s:150,dur:.2,gain:2.5}); sig.a=.5; sig2.a=.3; });
  // ---- the flurry: he is gone; each stroke flashes crimson as it is cut, then hangs there cold
  let tt=t0+.26; const gaps=[.17,.15,.13,.11,.09,.075,.06,.05];
  DASH.forEach((c,i)=>{ after(tt,()=>{ const dx=Math.cos(c.th), dy=Math.sin(c.th), [mx,my]=mid(c);
      c.h=K.cres(c.px,c.py,105,{reach:c.reach,dir:c.th,lean:c.lean,roll:c.roll,tex:c.tex,pal:P,idlePal:STEEL,idle:.2,keep:true,max:8,swing:.05,hold:.05,fade:.3,gain:1.05,light:0,sparks:10,ccw:c.ccw}); hitstop=Math.max(hitstop,.03);
      if(i){ const p=mid(DASH[i-1]); K.trail([0,.25,.5,.75,1].map(u=>({x:mix(p[0],mx,u),y:mix(p[1],my,u),z:105})),{w:24,dur:.18,draw:.04,pal:P,gain:.7}); }
      // where he passed: the figure mid-stroke, made of the blade's own light, already gone
      const ff=dx>=0?1:-1, st=GFX.st(0,'add',{c2:[.55,.35,0],c3:[1,.5,.5]});
      GFX.add(.3,k=>{ GFX.pose(st,'sword',i%2?'gs07':'gu06',mx-dx*120+dx*80*k,my-dy*70+dy*46*k,ff,[1,.32,.4],(1-k)*(1-k),{smear:.25+.5*k,sc:1.3}); });
      GFX.light(mx,my,c.reach*1.1,'#ff2440',1,.3,{z:105});
      inSector(x0,y0,c.th,c.reach*1.15,.55,e=>{ e.cut=(e.cut||0)+1; e.flash=1; e.stun=Math.max(e.stun,3); hitFx(e,RED,1.2); });
      K.dust(mx,my,{n:6,dir:c.th,spread:.9,sp:[200,520],a:.38,s:.8});
      Cn.SND.shing(1+i*.07,.45); SFX.slash(1.2+i*.06,.8); Cn.roll((i%2?1:-1)*.045); Cn.shake(.34+i*.035); post.ca=.003; Cn.zoom(.8-i*.004); }); tt+=gaps[i]; });
  const t1=tt+.2;
  // ---- stillness: he is back where he stood, back turned, inside the rosette; the camera sinks; the blades and the circle beat like a heart
  after(t1,()=>{ pl.visible=true; pl.f=f0; plSeq([['gs08',.22],['gs09',.22],['gs11',.3],['gs12',9]]); pl.target='iaiDone'; pl.ps=30; Cn.zoom(.9); Cn.roll(.035); Cn.cam(x0,hy,3); Cn.tilt(.24,2.2);
    GFX.ambient(.44,.54,.64,6); GFX.light(x0,y0-40,480,'#ffe8e0',.8,.4,{hold:.75,z:200}); GFX.light(x0,y0-80,hw*2.6,'#9ab4ff',.35,.3,{hold:.85,z:320});
    K.flare(x0,y0,BODY*.5,{pal:'silver',s:200,dur:.3,gain:2}); SFX.whoosh(1.4,.5); duck(.18,.75); K.dust(x0,y0,{n:10,r:40,sp:[150,380],a:.35}); sig.a=.9; sig2.a=.5; });
  [.12,.34,.52,.66,.76].forEach((d,j)=>after(t1+d,()=>{ for(const c of cuts) if(c.h) c.h.kick(); sig.kick(); sig2.kick(); SFX.heart(.7+j*.08); GFX.light(x0,y0,hw*1.4,'#c8d4ff',.25+j*.07,.2,{z:100}); K.shock(x0,y0,{r0:hw*.5,r:70,dur:.2,pal:'silver',gain:.35,light:0,dust:0,haze:.3,th:.5,painted:0}); Cn.zoom(.9+j*.02); }));
  after(t1+.6,()=>{ pl.target='sheath'; pl.ps=14; SFX.click(); Cn.SND.tick(.6,.3); K.flare(x0-f0*30,y0,BODY*.62,{pal:'silver',s:50,sx:7,sy:.3,dur:.24,gain:6}); });
  // ---- the tear: the circle turns to gold; the cold blades catch fire one after another, burn their shape into the floor, and the crown closes round him
  const tc=t1+.86;
  after(tc,()=>{ hitstop=Math.max(hitstop,.07); Cn.shake(1.1); post.ca=.005; Cn.zoom(.66); Cn.roll(-.03); Cn.cam(null); Cn.tilt(.28,5); GFX.ambient(.46,.44,.52,30); sig.pal=GOLD2; sig2.pal=GOLD2; sig.a=1.1; sig2.a=.7; sig.kick(); SFX.shatter(.8); });
  DASH.forEach((c,j)=>{ after(tc+j*.05,()=>{ if(c.h) c.h.end(); const dx=Math.cos(c.th), dy=Math.sin(c.th), [mx,my]=mid(c);
      K.cres(c.px,c.py,105,{reach:c.reach*1.06,dir:c.th,lean:c.lean,roll:c.roll,tex:'v3_slash_heavy',pal:P,swing:.04,hold:.12,fade:.4,gain:1.05,sparks:14,light:.8,ccw:c.ccw});
      // its shape stays burnt into the floor and cools
      K.art(c.px+dx*c.reach*.5,c.py+dy*c.reach*.5*FSY,{tex:'fx3_slash',floor:true,rot:c.th+Math.PI,s:c.reach/1.62,asp:1.47,dur:5.2,hold:.12,s0:.96,pal:P,gain:.5});
      K.debris(mx,my,{n:4,r:120,sp:[200,800],up:1500,size0:8,size:24}); K.dust(mx,my,{n:5,r:80,sp:[200,600],a:.4});
      // what stood in its path is thrown outward and up
      inSector(x0,y0,c.th,c.reach*1.15,.55,e=>{ e.flash=1; e.stun=Math.max(e.stun,1.2); hitFx(e,'#ffb66a',1.4); if(!e.d.heavy){ e.vz=Math.max(e.vz,rand(1300,1900)); e.kx+=dx*rand(260,520); e.ky+=dy*rand(160,320); } });
      Cn.SND.shing(.7+j*.05,.4); Cn.shake(.4+j*.05); }); });
  arcs.forEach((c,j)=>{ after(tc+.12+j*.06,()=>{ K.arcwall(x0,y0,{r:RR,a0:c.a0-.03,a1:c.a1+.03,h:1900*c.k,hb:1,hf:.11,lean:.12,pal:P,dur:1.45-j*.03,gain:1.25,rise:.2});
      const px=x0+Math.cos(c.th)*RR, py=y0+Math.sin(c.th)*RR*FSY; K.dust(px,py,{n:4,r:60,sp:[150,500],a:.42}); K.debris(px,py,{n:3,r:120,sp:[200,700],up:1400,size0:8,size:24}); SFX.boom(.9+j*.04,.5); Cn.roll((j%2?1:-1)*.03); }); });
  // ---- the held breath: everything leans in toward him
  const tf=tc+.12+N*.06+.16;
  after(tf-.2,()=>{ GFX.gain=.62; Cn.zoom(.72); K.shock(x0,y0,{r0:hw*1.7,r:90,dur:.2,pal:GOLD2,gain:.6,light:0,dust:0,painted:0,th:.7}); sig.r*=.86; sig2.r*=.86;
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(500,1100); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,500),tx:x0,ty:y0-120,tz:200,pull:9,life:.24,s:rand(3,6),m:3,len:.06,c:GFX.rgb('#fff0c0'),c2:'#ffa820',L:3}); } });
  // ---- the peak: the light comes down behind him - gold, where everything before was crimson: a wall of it standing in a half ring, and the pillar
  after(tf,()=>{ GFX.gain=1.25; hitstop=Math.max(hitstop,.12); Cn.shake(1.6); post.ca=.006; Cn.zoom(.58); Cn.tilt(.3,9); Cn.roll(.05); after(.22,()=>Cn.roll(0));
    K.arcwall(x0,y0,{r:RR*.66,a0:-Math.PI*.94,a1:-Math.PI*.06,h:2500,hb:1,hf:.7,lean:.08,pal:GOLD2,dur:1.05,gain:1,rise:.1,light:0});
    K.pillar(x0,y0-RR*FSY*.62,{r:300,h:hh*1.5,dur:.85,hold:.22,pal:GOLD2,gain:1.05,rise:.06,light:0}); K.art(x0,y0-RR*FSY*.5,{tex:'v3_xburst',s:hw*.95,z:BODY*.4,dur:.36,pal:GOLD2,gain:1.1,hold:.2,s0:.45});
    GFX.light(x0,y0-RR*FSY*.6,hw*1.5,'#ffd090',1.25,.45,{z:320}); GFX.ripple(x0,y0,hw*2.8,{life:.7,s:1.3,w:.14});
    sig.dead=true; sig2.dead=true; K.art(x0,y0,{tex:'v3_circ_blade',s:hw*.95,floor:true,dur:.6,pal:GOLD2,gain:.7,hold:.05,s0:.62}); K.sparks(x0,y0,20,{pal:GOLD2,n:50,sp:[600,2200],up:1300,life:[.4,1]});
    K.crack(x0,y0,{r:hw*1.9,ry:1.7,pal:P,life:6,grow:.25,gain:1.2}); K.shock(x0,y0,{r:hw*2.7,dur:.8,pal:GOLD2,gain:1}); K.shock(x0,y0,{r:hw*1.8,dur:.6,pal:P,gain:.8,delay:.08,light:0});
    K.debris(x0,y0,{n:30,r:300,sp:[300,1500],up:2100,size0:10,size:32}); K.dust(x0,y0,{n:22,r:160,sp:[500,1500],a:.5});
    // the crown is answered by a lower, wider one at the edge of the field
    for(let i=0;i<N;i++){ const am=-Math.PI/2+i*TAU/N; K.arcwall(x0,y0,{r:hw*1.62,a0:am-.36,a1:am+.36,h:1000*rand(.7,1.1),hb:1,hf:.26,lean:.1,pal:P,dur:rand(.95,1.25),gain:.8,rise:.16,delay:.07+i%3*.04,light:i%2?0:.6}); }
    let nb=0; for(const e of onScreen(200)){ if(nb++<26) K.hit(e.x,e.y,e.h*.5+e.z,'#ffd27a',1.7); e.flash=1; }
    Cn.sweep(x0,y0,D*1.5,{speed:4200,max:.45}); post.grayT=0; SFX.shatter(1); Cn.SND.hit(1); SFX.boom(1.6,1);
    K.petals(x0,y0-hh*.2,hw*1.3,{pal:P,n:110,z0:300,z1:1700,life:3.4,s:1.6}); after(1,()=>GFX.light(x0,y0,hw*1.7,'#ff2440',.4,2.3,{z:140})); });
  // ---- afterglow: the camera rises again; smoke stands where the fire was, petals of light come down, the rosette in the floor cools
  after(tf+.35,()=>{ arcs.slice(0,5).forEach((c,j)=>K.smoke(x0+Math.cos(c.th)*RR,y0+Math.sin(c.th)*RR*FSY,{s:rand(240,340),dur:rand(1.6,2.2),delay:j*.07,c:'#1c0a12',c2:'#5a2030',a:.6,rise:300})); });
  after(tf+.6,()=>{ K.petals(x0,y0,hw*1.3,{pal:P,n:80,z0:500,z1:1400,life:3,s:1.6}); K.embers(x0,y0,hw*1.1,{pal:P,n:50,life:2.4,s:1.3}); GFX.ambient(.7,.72,.78,1.1); Cn.zoom(.8); Cn.tilt(.12,1.6); });
  after(tf+1.45,()=>{ GFX.ambient(1,1,1,1.3); Cn.zoom(1); Cn.tilt(0,2.5); });
  after(tf+1.9,()=>{ GFX.gain=1.25; ultStop(); }); }

// SWORD RAIN: a blade raised to a sky that answers - rings of falling swords walk outward from him, stay standing in the earth, and the last one is the size of a tower.
function ultRain(id){ ultStart(id); const Cn=X.cine, K=K3, D=9000*A.mul(id), x0=pl.x, y0=pl.gy, {hw,hh}=view(), P='gold', f0=pl.f, ZS=1350, LS=450, LT=2500, stuck=[], tipX=x0+f0*18, tipZ=BODY*2.05,
    SH=GFX.st(12,'alpha',{L:0}), GL=GFX.st(8,'add',{L:0}), gold=GFX.rgb('#ffc040');
  // ---- omen: the light goes warm and low, the blade circle writes itself under him, motes climb to the raised tip
  plSeq([['gs03',.1],['gs04',.18],['gs05',3.87],['gs06',.08],['gs07',.12],['gs08',.6],['gs12',9]]); pl.target='cast'; pl.ps=10;
  GFX.ambient(.42,.36,.32,3); const spot=GFX.light(x0,y0,560,'#ffc040',.7,.5,{hold:5.3,z:140});
  const sig=K.sigil(x0,y0,{r:hw*.5,dur:5.95,in:.9,out:.5,spin:.3,pal:'silver',hole:.3});
  Cn.zoom(1.3); Cn.cam(x0,y0-BODY*1.6,5); duck(.3,.7); Cn.SND.inhale(1,.5);
  for(let i=0;i<40;i++) after(rand(0,.95),()=>{ const a=rand(0,TAU), d=rand(200,700); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,200),tx:tipX,ty:y0,tz:tipZ,pull:rand(4,6.5),life:rand(.45,.7),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*400,vy:Math.cos(a)*240,vz:rand(100,400),c:GFX.rgb(Math.random()<.4?'#ffffff':'#ffe08a'),c2:'#ff9a10',L:3}); });
  K.flare(tipX,y0,tipZ,{pal:P,s:50,dur:.45,gain:3,delay:.6});
  // ---- the blade answers upward: a beam climbs from the tip and opens a second circle in the sky
  let bm=null, sky=null;
  after(1,()=>{ bm=K.beam(tipX,y0,tipZ,tipX,y0,tipZ+40,{pal:P,w:58,dur:4.6}); GFX.add(.18,k=>{ bm.x2=mix(tipX,x0,k); bm.z2=mix(tipZ,ZS,eo3(k)); });
    K.flare(tipX,y0,tipZ,{pal:P,s:120,dur:.3,gain:4}); ping(x0,y0,hw*.6,{pal:P,dur:.4}); K.sparks(tipX,y0,tipZ,{pal:P,n:14,sp:[200,700],up:900}); Cn.SND.shing(.7,.5); SFX.whoosh(.8,.6); });
  after(1.18,()=>{ bm.x2=x0; bm.z2=ZS; sky=skySigil(x0,y0,ZS,{r:hw*.6,dur:4.72,in:.6,out:.45,spin:-.22,pal:'silver',lean:.16,veil:500});
    K.flare(x0,y0,ZS,{pal:P,s:300,dur:.45,gain:3}); ping(x0,y0,hw*.95,{pal:'silver',z:ZS,dur:.5,gain:1.2}); GFX.light(x0,y0,hw*1.7,'#ffc040',.55,.6,{hold:3.4,z:ZS}); Cn.SND.shing(1.1,.5); Cn.shake(.3); });
  // ---- release: the camera lets go of him; the sky circle widens as the rings walk outward
  after(1.82,()=>{ Cn.zoom(.84); Cn.cam(x0,y0-hh*.2,3.5); SFX.choir(2.6); Cn.shake(.5); GFX.ambient(.36,.31,.3,3);
    K.shock(x0,y0,{r:hw*1.3,dur:.55,pal:P,gain:.9}); GFX.ripple(x0,y0,hw*1.4,{life:.5,s:.6}); K.dust(x0,y0,{n:12,r:60,sp:[300,800],a:.4}); GFX.add(1.7,k=>{ if(sky) sky.r=hw*mix(.6,.98,eo3(k)); }); });
  let nL=0;
  const land=(x,y,tilt)=>{ nL++; if(nL%4) stuck.push({x,y,t0:RT,tilt,ph:rand(0,9),out:0});
    if(inView(x,y)){ K.art(x,y,{tex:'v3_xburst',s:170,z:-50,dur:.22,pal:P,gain:.9,hold:.15,s0:.5}); if(nL%2) ray(x,y,{pal:P,w:24,h:560,dur:.3,gain:.7,core:0}); K.sparks(x,y,12,{pal:P,n:5,sp:[300,1000],up:900,life:[.15,.38]}); K.dust(x,y,{n:2,sp:[120,320],a:.34,s:.7});
      if(nL%3===0) GFX.light(x,y,440,'#ffc040',.85,.4,{z:40});
      if(nL%14===2) K.crack(x,y,{r:150,pal:P,life:2.2,grow:.08});
      if(nL%4===1) K.debris(x,y,{n:3,r:20,sp:[150,450],up:700,size:11}); }
    sfx('boom',.5,.3); sfx('slash',1.6,.3); inCircle(x,y,170,e=>{ dmg(e,D,{kb:.6,stun:.5,sx:x,sy:y}); hitFx(e,GOLD,1); }); };
  // one sword: it burns into being under the sky circle and hangs over its mark while the shadow closes in, then drops
  const fall=(e,px,py)=>{ const j=rand(0,.12), s={x:e?e.x:px,y:e?e.y:py,lock:false}, tilt=rand(-.22,.22), hang=.3+j, Z=ZS-rand(40,160);
    after(hang,()=>{ if(e){ s.x=e.x; s.y=e.y; } s.lock=true; after(.2,()=>land(s.x,s.y,tilt));
});
    GFX.add(hang+.2,(k,t)=>{ if(!s.lock&&e){ s.x=e.x; s.y=e.y; } if(!inView(s.x,s.y)) return; const d=sat((t-hang)/.2), i=sat(t/.16), z=(Z-70*sat(t/hang))*(1-d*d);
      GFX.floor(SH,s.x,s.y,mix(140,66,k),null,0,[0,0,0],.15+.5*k); GFX.floor(GL,s.x,s.y,mix(170,80,k),null,0,gold,.06+.2*k*k);
      gsword(s.x,s.y,z,LS*(.8+.2*i),tilt*.4,{a:i,gain:2+1.5*(1-i)+d});
      if(d>0){ const tl=760*Math.sin(Math.PI*Math.min(1,d*1.15)); GFX.floor(GL,s.x,s.y,90,null,0,gold,.25*d); FX3.bill(rayB(),s.x,s.y,z+LS*.8+tl/2,34,tl/2,0,{...pc(P),a:.9,gain:1.5,ero:.05,t0:px}); } }); };
  const T=onScreen(60);
  for(let k=0;k<5;k++){ const n=5+k*3, rr=230+k*(Math.max(hw,hh)*.2);
    after(1.68+k*.3,()=>{ for(let i=0;i<n;i++){ const a=i/n*TAU+k*.4; fall(T.length&&i%2?T[(Math.random()*T.length)|0]:null,x0+Math.cos(a)*rr,y0+Math.sin(a)*rr*.8); }
      ping(x0,y0,Math.min(rr,hw)*1.1,{pal:'silver',z:ZS,dur:.4,gain:.8}); sig.kick(); });
    after(1.98+k*.3,()=>{ Cn.SND.shing(.8+k*.08,.4); Cn.shake(.3); }); }
  // the swords he has planted: they quiver when they land and wait, glowing, for the last one
  GFX.add(6,()=>{ const now=RT; for(const s of stuck){ const q=now-s.t0, o=s.out?sat((now-s.out)/.2):0; if(o>=1||!inView(s.x,s.y)) continue;
      gsword(s.x,s.y,0,LS,s.tilt*(1+.5*Math.exp(-q*9)*Math.cos(q*48)),{bury:.13*sat(q/.05),gain:1.5+1.6*Math.exp(-q*7)+o*3,bgain:.9+.3*Math.exp(-q*7)+o,ero:.06+o*1.1,nk:o});
      GFX.floor(GL,s.x,s.y,80,null,0,gold,(.2+.07*Math.sin(now*6+s.ph))*(1-o)); } });
  // ---- climax: the tower. The mark darkens under a closing ring, then the sky lets go of the last one
  let cx=x0+f0*hw*.42, cy=y0+hh*.16, seal=null;
  after(3.6,()=>{ const dn=V.boss&&!V.boss.dead?V.boss:X.densest(hw*.9,320);
    if(dn){ let dx=dn.x-x0, dy=dn.y-y0, l=Math.hypot(dx,dy); if(l<1){ dx=f0; dy=.3; l=Math.hypot(dx,dy); } const m=Math.max(l,300)/l; cx=clamp(x0+dx*m,x0-hw*.62,x0+hw*.62); cy=clamp(y0+dy*m,y0-hh*.32,y0+hh*.34); }
    Cn.zoom(.8); Cn.cam(mix(x0,cx,.6),mix(y0,cy,.6)-hh*.16,3); GFX.ambient(.34,.3,.3,3); Cn.SND.inhale(.85,.6); pl.target='slashU'; pl.ps=20;
    if(sky){ const S_=sky, sx=S_.x, sy=S_.y, r0=S_.r; S_.a=1.5; GFX.add(.5,k=>{ const e=eo3(k); S_.x=mix(sx,cx,e); S_.y=mix(sy,cy,e); S_.r=mix(r0,hw*.66,e); if(bm){ bm.x2=S_.x; bm.y2=S_.y; } }); after(.5,()=>{ S_.x=cx; S_.y=cy; if(bm){ bm.x2=cx; bm.y2=cy; } }); }
    K.shock(cx,cy,{r0:680,r:150,dur:.5,pal:P,gain:.6,light:0,dust:0,haze:.4,th:.6}); K.shock(cx,cy,{r0:560,r:150,dur:.45,pal:P,gain:.7,light:0,dust:0,haze:.4,th:.6,delay:.48});
    seal=K.sigil(cx,cy,{r:430,dur:1.3,in:.3,out:.25,spin:1.4,pal:'silver',tex:'fx_circle_seal'}); GFX.light(cx,cy,620,'#ffc040',.7,.3,{hold:.9,z:60});
    GFX.add(1.05,k=>{ const r=mix(820,470,k); FX3.quad(K.mats().dark,cx,cy,r,r,0,{a:.35+.6*k}); }); for(let q=0;q<3;q++) ping(cx,cy,210,{pal:P,r0:660-q*90,dur:.36,gain:.9,delay:.1+q*.3,th:2}); });
  after(4.15,()=>{ sfx('whoosh',.4,1); spot.hold=0; if(sky) sky.a=2; K.flare(cx,cy,ZS,{pal:P,s:260,dur:.35,gain:3}); ping(cx,cy,hw*.7,{pal:'silver',z:ZS,dur:.4,gain:1.2}); if(bm){ GFX.add(.14,k=>{ bm.a=1-k; }); after(.14,()=>{ bm.dead=true; }); }
    GFX.add(1.75,(k,t)=>{ const d=sat((t-.2)/.3), z=t<.2?ZS-340*eo3(t/.2):(ZS-340)*(1-d*d), q=t-.5, o=sat((t-1.3)/.45), vis=q>0?mix(ZS/LT,1,eo3(sat(q/.1))):(ZS-z)/LT;
      gsword(cx,cy,z,LT,.04,{vis,bury:q>0?.1*sat(q/.04):0,gain:2.2+1.6*Math.exp(-Math.max(q,0)*6)+o*3,bgain:1.05+o,ero:.06+o*1.1,nk:o});
      if(q<0&&t>.2&&Math.random()<.7) K.sparks(cx+rand(-150,150),cy,z+rand(100,500),{pal:P,n:2,sp:[60,260],up:900,life:[.2,.45]}); }); });
  after(4.5,()=>{ GFX.ambient(.3,.3,.34,26); duck(.15,.3); });
  after(4.65,()=>{ if(sky){ const S_=sky, a0=S_.a, r0=S_.r; GFX.add(.3,k=>{ S_.a=a0*(1-k); S_.r=r0*(1+.4*k); }); after(.3,()=>{ S_.dead=true; }); K.flare(cx,cy,ZS,{pal:'silver',s:420,dur:.3,gain:2.2}); ping(cx,cy,hw*1.1,{pal:'silver',z:ZS,dur:.45,gain:1.2}); }
    hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.88); Cn.roll(-.03);
    GFX.ambient(.6,.48,.32,40); after(.15,()=>GFX.ambient(.4,.34,.3,3));
    K.art(cx,cy,{tex:'v3_xburst',s:760,z:-200,dur:.3,pal:P,gain:.8,hold:.2,s0:.5});
    if(seal) seal.dead=true;
    K.arcwall(cx,cy,{r:330,h:560,hb:1,hf:.22,dur:1,pal:P,gain:.8});
    K.shock(cx,cy,{r:hw*1.6,dur:.6,pal:P,gain:1.2}); K.shock(cx,cy,{r:hw*2.3,dur:.9,pal:P,gain:.7,delay:.1,light:0,painted:0,dust:0}); GFX.ripple(cx,cy,hw*2,{life:.6,s:.9});
    K.crack(cx,cy,{r:hw*.9,pal:P,life:5,grow:.14,gain:1.2});
    for(let q=0;q<2;q++){ const a=q*Math.PI/2+.35, l=(1500-q%2*400)/2, dx=Math.cos(a)*l, dy=Math.sin(a)*l*FSY; K.gash(cx-dx,cy-dy,cx+dx,cy+dy,{pal:P,life:5,w:q%2?110:150,gain:1.1,grow:.07,delay:q*.03}); }
    K.debris(cx,cy,{n:26,r:160,sp:[300,1300],up:1800,size:22}); K.dust(cx,cy,{n:20,r:140,sp:[500,1400],a:.5}); K.sparks(cx,cy,40,{pal:P,n:44,sp:[500,2200],up:1900,life:[.3,.9]});
    GFX.light(cx,cy,hw*2.4,'#ffc040',1.4,1.3,{z:260});
    Cn.sweep(cx,cy,D*8,{speed:3400}); SFX.shatter(1); Cn.SND.hit(1); SFX.boom(1.6,1);
    // every planted sword answers with a pillar of light, nearest first
    for(const s of stuck){ const d=Math.hypot(s.x-cx,s.y-cy); after(Math.min(.75,d/2300),()=>{ s.out=RT; sfx('shatter',.25);
        if(inView(s.x,s.y)){ ray(s.x,s.y,{pal:P,w:28,h:rand(1300,2100),dur:.4,gain:.8,core:d<480?1:0}); GFX.add(.4,k=>GFX.floor(GL,s.x,s.y,90+160*k,null,0,gold,.7*(1-k))); K.sparks(s.x,s.y,60,{pal:P,n:4,sp:[100,400],up:1300,life:[.3,.6]}); } }); }
    K.embers(cx,cy,hw*1.1,{pal:P,n:50,life:2.4,up:420,s:2}); });
  // ---- afterglow: gold comes down through the returning light; the wound in the floor cools
  after(5.05,()=>{ K.petals(cx,cy,hw*1.1,{pal:P,n:50,z0:300,z1:1500,life:2.4,s:2.2}); K.embers(cx,cy,hw,{pal:P,n:40,life:2.2,s:2.2,z:300}); });
  after(5.45,()=>{ GFX.ambient(.8,.74,.66,1.6); Cn.zoom(1); Cn.roll(0); });
  after(5.6,()=>Cn.cam(null));
  after(5.7,()=>GFX.ambient(1,1,1,2.5));
  after(5.95,()=>{ sig.dead=true; if(sky) sky.dead=true; ultStop(); }); }

X.reg('sword',{basic:{fn:basic,cd:basicCd},skills:SKILL,ults:{sw_ult1:ultZero,sw_ult2:ultRain},onHurt:src=>{ if(!counterReady()) return false; counter(src); return true; },
  glow:()=>{ if(counterReady()) glow(fx,pl.x,pl.gy-BODY,150,'#9ff7ff',.12+.08*Math.sin(RT*6)); }});
})();
