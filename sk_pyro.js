// 참광 survival - PYRO skill set (top-down, all automatic). Fire: balls, pillars, rings, breath, tornadoes. Registers with surv.js through RPG.sv.
// Presentation is built on the K3 kit (vfx3.js) and FX3 meshes; the pieces that only fire needs (whirl, ring of fire, burning line,
// scorch, comet, flamethrower fan, the dragon) live in this file.
'use strict';
(()=>{
const G=RPG, X=RPG.sv, FSY=RPG.sv.FSY, {V,A,SK,BODY,nearest,countIn,densest,angTo,face,dmg,hitFx,inCircle,inSector,inLine,sfx,view,onScreen,ultStart,ultStop,ultHit}=X;
const K=window.K3, F=window.FX3, PI=Math.PI, mix=(a,b,k)=>a+(b-a)*k, sat=v=>Math.max(0,Math.min(1,v)), eo3=k=>1-(1-k)*(1-k)*(1-k);
const C1='#ff7a2a';
const D=id=>SK[id].dmg*A.mul(id), L=id=>A.sLv(id), EVO=id=>A.sLv(id)>=5;
const S=(steps,basic)=>{ plSeq(steps); anim.seq.basic=!!basic; };
const push=b=>S([['gb02',.04],['gb03',.05,{kick:[-.8,.6]}],['gb04',.06],['gb05',.04,{kick:[1.6,-1.2]}],['gb06',.08],['gb08',.07],['gb12',.05]],b);
const raise=()=>S([['gx01',.06],['gx03',.12,{kick:[-.8,.6]}],['gx06',.1,{kick:[2,-1.6]}],['gx07',.3],['gx09',.1],['gx12',.1,{kick:[2,-1.6]}],['gx14',.15]]);

// ---------------------------------------------------------------- palettes: d dark outer mass, b body, h hot core, l floor light, s spark
const PF={d:'#340600',b:'#ff4208',m:'#ffae24',h:'#fff3c4',l:'#ff6a1c',s:'#ffc478'};   // living fire: deep red-orange body, amber heat, yellow-white core
const PG={d:'#421a00',b:'#ff9410',m:'#ffe070',h:'#fffbe6',l:'#ffae34',s:'#ffe6a0'};   // the hottest part: gold
const PD={d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'};   // the dragon's own fire: crimson
const PS=K.PAL.silver||{d:'#070a14',b:'#aab8d8',m:'#e4ecff',h:'#ffffff',l:'#b9c6ff',s:'#e0e8ff'};   // the cold circle the fire is called through
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m||P.b});
const IDENT=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const CIRC=()=>F.ready('v3_circ_pyro')?'v3_circ_pyro':'fx_circle_arcane';
if(F&&F.on){ for(const n of ['dragon_head','dragon_body','fx_sun','meteor','fx3_tornado','fx3_fire','fx3_smoke','v3_circ_pyro']) F.img(n); }

// ---------------------------------------------------------------- local materials (built once)
let MT=null;
function mats(){ if(MT) return MT; const m=F.mat, k=K.mats(); MT={
  // whirl: bands of flame wound round a funnel, racing round it and up; a dark hull outside, a streaked core inside
  whB:m({nz:'wisp',n1:[1,1,-1.15,-.45],n2:[2,1,-.5,-.3],dist:.035,nk:1,pw:1.35,ero:.2,soft:.3,fd:[0,0,.2,.4],rk:[.5,1.25],gain:1.9,bgain:1.05}),
  whC:m({nz:'streak',n1:[1,.6,-2,-.75],n2:[2,1,-1,-.4],dist:.03,nk:1,pw:1.5,ero:.3,soft:.25,fd:[0,0,.1,.55],rk:[.45,1.1],gain:2.2,bgain:1.15}),
  // painted tornado and painted flame, coloured through the ramp and pulled by scrolling distortion
  tor:m({...k.art,tex:'fx3_tornado',layer:'o',nz:'wisp',n1:[1.5,1,-.9,-.5],n2:[1.4,1,-.7,-.5],dist:.06,mdist:1,nk:.3,rk:[.6,1.25]}),
  fire:m({...k.art,tex:'fx3_fire',layer:'o',nz:'billow',n1:[1.2,1,0,-1.1],n2:[1.3,1,.05,-1],dist:.09,mdist:1,rk:[.6,1.2]}),
  sun:m({...k.art,tex:'fx_sun',layer:'o',nz:'cells',n1:[2,2,.1,.07],n2:[1.5,1.5,.1,-.1],dist:.04,mdist:1,nk:.25,rk:[.5,1.02]}),
  // scorch: one alpha-blended decal - charred rim, embers inside that cool to black
  sc:m({tex:'fx3_smoke',nz:'cells',n1:[3,3,.012,.008],n2:[2,2,.01,.01],dist:.03,mdist:1,nk:.85,pw:1.5,ero:.03,soft:.22,cA:'#000000',rk:[.45,1.15],op:1,layer:'g'}),
  // the dragon: painted colour art
  dH:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ffffff',cC:'#ffd070',gain:1.2,op:1,layer:'o'}),
  dB:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[4,1,0,0],cB:'#ffffff',cC:'#ffd070',gain:1.15,op:1,layer:'o'}),
  dS:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ff3a10',cC:'#ffb040',gain:1,op:0,layer:'g'}),
  dC:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[3,1,0,0],cB:'#ff3008',cC:'#ffb040',gain:1,op:0,layer:'g'}),
}; return MT; }

// ---------------------------------------------------------------- local pieces
// SCORCH: the floor burnt where fire stood. o: {life, pal, heat}
function scorch(x,y,r,o={}){ if(!F.on) return; const m=mats(), P=o.pal||PF, life=o.life||4, rot=rand(0,TAU), sd=rand(0,9), hk=o.heat??1;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,2.2)*hk, out=sat((1-k)/.3), rr=r*(.65+.35*i);
    F.quad(m.sc,x,y,rr,rr*.72,rot,{cB:'#e03a04',cC:P.s,a:.92*out,bgain:1.5*heat,gain:2.4*heat,t0:sd}); },o.delay||0); }

// FIRELINE: flames standing on a floor path for a while (what a dash, a ring or a dragon leaves burning). pts: [{x,y,h?}]
function fireLine(pts,o={}){ if(!F.on) return; const km=K.mats(), P=o.pal||PF, C=col(P), dur=o.dur||2, h=o.h||150, sd=rand(0,9), g=o.gain||1, tin=o.in??.14, tout=o.out??.5; let len=0;
  for(let i=1;i<pts.length;i++) len+=Math.hypot(pts[i].x-pts[i-1].x,(pts[i].y-pts[i-1].y)/FSY); const ur=o.closed?Math.max(1,Math.round(len/(h*2.2))):Math.max(.5,len/(h*2.2));
  GFX.add(dur,(k,t)=>{ const up=eo3(sat(t/tin)), f=sat(1-(dur-t)/tout), a=1-f*f, hh=h*up*(1-.35*f)*(1+.06*Math.sin(t*13+sd));
    F.wall(km.waB,pts,{h:hh,...C,a,gain:2.3*g,ero:.12+f*.6,uvT:[ur,1,sd,0],t0:sd});
    F.wall(km.waC,pts,{h:hh*.55,...C,a,gain:3*g,ero:.26+f*.6,uvT:[ur*(o.closed?2:1.3),1,sd+.37,0],t0:sd}); },o.delay||0); }
const ringPts=(x,y,r,n=32,ky=FSY)=>{ const p=[]; for(let i=0;i<=n;i++){ const b=i/n*TAU; p.push({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*ky,bx:Math.cos(b),by:Math.sin(b)*ky}); } return p; };

// RINGFIRE: a wall of flame racing outward over the floor from a point. o: {r0, r, h, dur, pal, gain}
function ringFire(x,y,o={}){ if(!F.on) return; const km=K.mats(), P=o.pal||PF, C=col(P), R0=o.r0||60, R1=o.r||500, dur=o.dur||.5, h=o.h||220, sd=rand(0,9), g=o.gain||1, n=o.n||36;
  GFX.add(dur,(k)=>{ const e=eo3(k), r=mix(R0,R1,e), f=sat((k-.6)/.4), a=1-f*f, hh=h*(.5+.5*sat(k*6))*(1-.4*f), pts=ringPts(x,y,r,n), ur=Math.max(2,Math.round(TAU*r/(h*2.4)));
    F.wall(km.waB,pts,{h:hh,...C,a,gain:2.5*g,ero:.12+f*.7,uvT:[ur,1,sd,0],t0:sd});
    F.wall(km.waC,pts,{h:hh*.55,...C,a,gain:3.2*g,ero:.25+f*.6,uvT:[ur*2,1,sd+.37,0],t0:sd}); },o.delay||0); }

// WHIRL: a column of fire turning on the floor: bands of flame wound round a bent funnel, a gold core, the painted
// funnel for its ragged outline, a skirt of flames and the floor glowing at its foot. Returns a handle {x,y,s,a,lean,dead}; move it every frame.
//  o: {s, h, r, dur, in, out, pal, light, gain}
function whirl(x,y,o={}){ const h={x,y,s:o.s||1,a:1,lean:0,dead:false,L:null}; if(!F.on) return h; const m=mats(), km=K.mats(), P=o.pal||PF, C=col(P), CD=col(PD), CG=col(PG), dur=o.dur||4, tin=o.in??.3, tout=o.out??.35, H0=o.h||640, R0=o.r||165, sd=rand(0,9), g=o.gain||1, M1=new Float32Array(IDENT), M2=new Float32Array(IDENT), sk=ringPts(0,0,1,14);
  if(o.light!==0) h.L=GFX.light(x,y,R0*h.s*3.6,P.l,o.light??.8,.3,{hold:dur-.3,z:140,flick:.18});
  GFX.add(dur,(k,t)=>{ if(h.dead){ if(h.L){ h.L.hold=0; h.L=null; } return; } const i=eo3(sat(t/tin)), out=sat((dur-t)/tout), a=h.a*out, f=1-out, s=h.s, Hh=H0*s*(.12+.88*i)*(1+.03*Math.sin(t*11+sd)), R=R0*s*(.3+.7*i)*(1+f*.35);
    // it bends: the stem leans one way, the crown trails and sways the other
    const s1=h.lean+Math.sin(t*2.9+sd)*.1, s2=h.lean*1.8-Math.sin(t*2.9+sd+.9)*.17; M1[8]=s1; M2[8]=s2; M2[12]=(s1-s2)*Hh*.45; const tx=s1*Hh*.45+s2*Hh*.55;
    if(h.L){ h.L.x=h.x; h.L.y=h.y; h.L.r=R0*s*3.6; }
    F.quad(km.dark,h.x,h.y,R*1.15,R*1.15,0,{a:.55*a});
    F.quad(km.glowG,h.x,h.y,R*1.6,R*1.6,0,{...C,a:.85*a,gain:1.3});
    // eye: the foot opens round whoever stands in it - the fire turns above and about him, not over him
    if(o.eye){ F.lathe(m.whB,h.x,h.y,0,{r0:R*.62,r1:R*.5,h0:0,h1:Hh*.3,M:M1,...CD,a:a*.8,gain:1.5*g,ero:.24+f*.6,fd:[0,0,.2,.5],t0:sd}); F.lathe(m.whB,h.x,h.y,0,{r0:R*.4,r1:R*1.05,h0:Hh*.24,h1:Hh,M:M2,...C,a,gain:1.7*g,ero:.2+f*.6,fd:[0,0,.3,.35],t0:sd+4});
      F.bill(m.tor,h.x+tx*.55,h.y,Hh*.6,Hh*.37,Hh*.48,0,{...C,a:a*.95,gain:2.3*g,ero:.14+f*.6,nk:.35+f*.5,t0:sd,fd:[0,0,.3,0],uvT:(Math.floor(t*8+sd)&1)?[-1,1,1,0]:[1,1,0,0]});
      const re=R*.66; for(const p of sk){ p.x=h.x+p.bx*re; p.y=h.y+p.by*re; } F.wall(km.waB,sk,{h:R*.55,...C,a:a*.9,gain:2*g,ero:.14+f*.6,uvT:[4,1,sd+t*.9,0],t0:sd}); return; }
    F.lathe(m.whB,h.x,h.y,0,{r0:R*.2,r1:R*.6,h0:0,h1:Hh*.72,M:M1,...CD,a,gain:1.7*g,ero:.2+f*.6,fd:[0,0,.12,.5],t0:sd});
    F.lathe(m.whB,h.x,h.y,0,{r0:R*.36,r1:R,h0:Hh*.28,h1:Hh,M:M2,...C,a,gain:1.7*g,ero:.2+f*.6,fd:[0,0,.35,.35],t0:sd+4});
    F.lathe(m.whC,h.x,h.y,0,{r0:R*.08,r1:R*.34,h0:0,h1:Hh*.82,M:M1,...CG,a,gain:2*g,ero:.32+f*.5,t0:sd+2});
    F.bill(m.tor,h.x+tx*.55,h.y,Hh*.53,Hh*.37,Hh*.55,0,{...C,a:a*.95,gain:2.3*g,ero:.14+f*.6,nk:.35+f*.5,t0:sd,uvT:(Math.floor(t*8+sd)&1)?[-1,1,1,0]:[1,1,0,0]});
    // the skirt: low flames in a ring round its foot
    const rs=R*.62; for(const p of sk){ p.x=h.x+p.bx*rs; p.y=h.y+p.by*rs; } F.wall(km.waB,sk,{h:R*.8,...C,a:a*.9,gain:2*g,ero:.14+f*.6,uvT:[3,1,sd+t*.9,0],t0:sd});
    if(Math.random()<.55*(GFX.QK||1)){ const b=rand(0,TAU), rr=R*rand(.3,.9); GFX.pt({x:h.x+Math.cos(b)*rr,y:h.y+Math.sin(b)*rr*FSY,z:rand(10,Hh*.5),vx:-Math.sin(b)*rand(300,700)*s,vy:Math.cos(b)*rand(200,400)*s,vz:rand(300,900),g:-200,drag:1.4,life:rand(.4,.9),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?P.h:P.s),c2:P.b,L:3}); } },o.delay||0);
  return h; }

// TONGUE: one painted flame whose root sits at a point in the air and whose tip streams along a screen direction (ux right, uy down)
function tongue(x,y,z,s,ux,uy,o){ const m=mats(); F.bill(m.fire,x+ux*s*.86,y,z-uy*s*.86,s*.56,s,Math.atan2(ux,-uy),{pm:[4,.5,.004,0],nk:.4,ero:.12,gain:2.6,...o}); }

// COMET: the look of a fire projectile - a gold heart, a painted flame streaming behind it, embers, its light on the floor. Reads p every frame.
function comet(p,o={}){ if(!F.on) return; const km=K.mats(), s=o.s||64, sd=rand(0,9), z=o.z??BODY*.6, C=col(PF), CG=col(PG), Lt=GFX.light(p.x,p.y,s*7,PF.l,.75,.18,{hold:p.life,z});
  GFX.add(p.life+.05,(k,t)=>{ if(p.life<=0){ Lt.hold=0; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp, i=sat(t/.08); Lt.x=p.x; Lt.y=p.y;
    tongue(p.x+ux*s*.35,p.y,z-uy*s*.35,s*2.1*i,-ux,-uy,{...C,t0:sd,a:.95});
    tongue(p.x+ux*s*.3,p.y,z-uy*s*.3,s*1.2*i,-ux,-uy,{...CG,t0:sd+3,gain:3.2,a:.9});
    F.bill(km.glowO,p.x,p.y,z,s*.7,s*.7,0,{...CG,a:1,gain:3});
    if(Math.random()<.5) GFX.pt({x:p.x,y:p.y,z:z+rand(-20,20),vx:-ux*rand(60,300)+rand(-80,80),vy:-uy*rand(60,300)+rand(-50,50),vz:rand(-40,160),g:-60,drag:1,life:rand(.25,.55),s:rand(2.5,5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); }); }

// a fire explosion on a floor point (s 1 = a fireball going off)
function blast(x,y,s=1,o={}){ const big=s>=1.2, R=150*s; K.burst(x,y,{s:R,pal:PF,z:o.z||0,smoke:o.smoke??(big?2:1),no:o.no||(s>=2?[]:big?['crack']:['crack','debris']),scar:4}); if(o.scorch!==0) scorch(x,y,R*1.2,{life:big?4.5:2.8}); }
function fireball(x0,y0,a,d,o={}){ const sp=o.sp??1500, p={x:x0,y:y0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:o.life??1,d,r:o.r??80,home:o.home,turn:o.turn??5,c:C1,pw:1.1};
  comet(p,{s:o.big?90:62});
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

// basic: a small comet of fire that homes and bursts
function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); push(true); const n=1+Math.floor((L('py_basic')+1)/2), d=1500*A.mul('py_basic');
  after(.2,()=>{ const hx=pl.x+Math.cos(a)*60, hy=pl.gy+Math.sin(a)*60; K.flare(hx,hy,BODY*.6,{pal:PG,s:70,dur:.14,gain:2.4});
    for(let k=0;k<n;k++) after(k*.08,()=>fireball(hx,hy,a+(k-(n-1)/2)*.3,d,{home:e,life:1.2})); sfx('fireball',.8); });
  return true; }

const SKILL={
  // FLAME DASH: he goes as a streak of fire; the line he crossed stays alight
  py_dash:{moves:true,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+120), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, T=EVO(id)?4:2; face(a); push();
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.12}; G.inv=Math.max(G.inv,.35); sfx('fire',.8,.6);
    const tp=[], fp=[]; for(let i=0;i<=8;i++){ const u=i/8; tp.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z:BODY*.5}); fp.push({x:mix(x0,x1,u)+rand(-8,8),y:mix(y0,y1,u)+rand(-6,6)}); }
    K.trail(tp,{w:74,dur:.42,pal:PF,draw:.1,hold:.06}); K.trail(tp,{w:30,dur:.3,pal:PG,draw:.1,gain:1.2});
    fireLine(fp,{h:165,dur:T,in:.2,out:.6}); K.gash(x0,y0,x1,y1,{pal:PF,life:T+1.2,w:74,grow:.12});
    GFX.light((x0+x1)/2,(y0+y1)/2,Ld*1.1,PF.l,.95,.5,{hold:T-.4,z:80,flick:.2});
    K.shock(x0,y0,{r:210,dur:.3,pal:PF,gain:.6,light:0,dust:0}); K.dust(x0,y0,{n:7,dir:a+PI,spread:.7,sp:[200,560],a:.4});
    after(.1,()=>{ K.art(x1,y1,{tex:'v3_xburst',s:130,z:BODY*.25,dur:.22,pal:PG,hold:.15,s0:.5}); K.sparks(x1,y1,BODY*.5,{pal:PF,n:14,dir:a,spread:.9,sp:[400,1400],up:500}); });
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,70,o=>{ dmg(o,d*.35,{kb:.2}); hitFx(o,C1,.8); })});
    after(.06,()=>inLine(x0,y0,x1,y1,80,o=>{ dmg(o,d,{kb:.8,sx:x0,sy:y0}); hitFx(o,C1,1.1); })); }},
  // FIRE PILLAR: the floor under three of them glows, then a column of fire stands up through each
  py_pillar:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?5:3, d=D(id); push(); sfx('fire',.9,.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.15+i*.1,()=>{ const x=e.x, y=e.y;
      K.shock(x,y,{r0:190,r:36,dur:.16,pal:PF,gain:.7,light:0,dust:0,haze:0,th:.6}); GFX.light(x,y,360,PF.l,.7,.2);
      after(.15,()=>{ K.pillar(x,y,{r:62,h:1000,dur:.62,pal:PF,gain:.95}); K.flame(x,y,{s:330,dur:.7,pal:PF,light:0}); K.flame(x,y,{s:170,dur:.55,pal:PG,light:0,gain:1.1});
        ringFire(x,y,{r0:30,r:175,h:90,dur:.32}); scorch(x,y,170,{life:3}); K.sparks(x,y,20,{pal:PF,n:12,sp:[150,600],up:1500,life:[.3,.7]}); K.dust(x,y,{n:6,r:40,sp:[200,480],a:.35});
        trauma=Math.min(1,trauma+.15); sfx('fire',.5,.5);
        inCircle(x,y,150,o=>{ dmg(o,d,{kb:.3,launch:1200,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); })); }},
  // FLAME RING: a wall of fire leaves him in every direction
  py_ring:{fn(id){ if(countIn(480)<4&&!nearest(250)) return false; const d=D(id); raise();
    const wave=k=>{ const x=pl.x, y=pl.gy; ringFire(x,y,{r0:70,r:560,h:230,dur:.52,gain:k?.85:1}); K.shock(x,y,{r:620,dur:.5,pal:PF,gain:.9}); GFX.ripple(x,y,640,{life:.45,s:.6});
      K.art(x,y,{tex:'v3_spin_ring',floor:true,s:330,dur:.4,pal:PG,gain:.8,hold:.2,s0:.35,rot:rand(0,TAU)}); K.sparks(x,y,40,{pal:PF,n:18,sp:[500,1500],up:420,life:[.25,.55]}); sfx('fire',1,.8);
      [0,.1,.2,.3].forEach((t,i)=>after(t,()=>{ const r=160+i*120; inCircle(pl.x,pl.gy,r,o=>{ if((o.ringT||0)>RT) return; o.ringT=RT+.5; dmg(o,d*(k?.6:1),{kb:1.2}); hitFx(o,C1,1.1); }); })); };
    after(.2,()=>wave(0)); if(EVO(id)) after(.75,()=>wave(1)); }},
  // EXPLOSION: the air over the crowd is drawn to a point, and the point goes off
  py_boom:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); push(); sfx('fireball',1.2);
    K.shock(x,y,{r0:470,r:40,dur:.34,pal:PF,gain:.75,light:0,dust:0,th:.7}); K.flare(x,y,BODY*.4,{pal:PG,s:90,dur:.36,gain:2.2}); GFX.light(x,y,520,PF.l,.7,.4);
    after(.35,()=>{ blast(x,y,2.4,{smoke:3}); ringFire(x,y,{r0:90,r:400,h:210,dur:.45}); K.shock(x,y,{r:700,dur:.6,pal:PF,gain:.7,delay:.06,light:0}); K.embers(x,y,300,{pal:PF,n:16,life:1.6});
      trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.6,1);
      inCircle(x,y,330,o=>{ dmg(o,d,{kb:1.8,big:true,launch:700,sx:x,sy:y}); hitFx(o,C1,1.4); });
      if(EVO(id)) for(let i=0;i<5;i++) after(.15+i*.1,()=>{ const b=rand(0,TAU), r=rand(150,380), bx=x+Math.cos(b)*r, by=y+Math.sin(b)*r*.75; blast(bx,by,1); inCircle(bx,by,160,o=>dmg(o,d*.4,{kb:.8,sx:bx,sy:by})); }); }); }},
  // FIRE RAIN: burning rocks come down out of the sky, each trailing its own flame
  py_rain:{fn(id){ const T=onScreen(-40); if(!T.length) return false; const n=EVO(id)?12:8, d=D(id); raise(); sfx('fireball',1);
    for(let i=0;i<n;i++) after(.3+i*.1,()=>{ const e=T[(Math.random()*T.length)|0], x=e?e.x+rand(-60,60):pl.x+rand(-500,500), y=e?e.y+rand(-40,40):pl.gy+rand(-400,400), h0=1500, vx=-260, sd=rand(0,9);
      GFX.add(.35,k=>{ const q=k*k, z=h0*(1-q)+60, px=x+vx*(1-q), ln=Math.hypot(vx,h0), ux=vx/ln, uy=-h0/ln; tongue(px,y,z,300,ux,uy,{...col(PF),t0:sd,a:sat(k*6)}); tongue(px,y,z,170,ux,uy,{...col(PG),t0:sd+2,gain:3,a:sat(k*6)}); });
      GFX.light(x,y,420,PF.l,.5,.35);
      K.drop(x,y,{img:'meteor',s:58,h0,dur:.35,vx,rot:rand(0,TAU),tint:'#ffd8a8',gain:1.4,land:()=>{ blast(x,y,1.3); sfx('boom',.9,.5); inCircle(x,y,190,o=>{ dmg(o,d,{kb:1,launch:400,sx:x,sy:y}); hitFx(o,C1,1.1); }); }}); }); }},
  // FLAME THROWER: two seconds of a fan of fire from his hand
  py_breath:{fn(id){ const e=nearest(520); if(!e) return false; const flat=b=>{ const c=Math.cos(b)>=0?0:Math.PI, d=Math.atan2(Math.sin(b-c),Math.cos(b-c)); return c+clamp(d,-.6,.6); }; let a=flat(angTo(e)); const d=D(id), R=EVO(id)?640:520, half=EVO(id)?.55:.42; face(a);
    S([['gb03',.05],['gb05',.05],['gb06',2,{kick:[1.2,-1]}],['gb10',.08],['gb12',.06]]); sfx('fire',2,.8);
    if(F.on){ const km=K.mats(), C=col(PF), CG=col(PG), sd=rand(0,9), dur=2, KY=1.3, Mx=F.xf({sy:KY}), Lt=GFX.light(pl.x,pl.gy,R*1.3,PF.l,.95,.3,{hold:dur,z:90,flick:.25});
      GFX.add(dur+.25,(k,t)=>{ const i=eo3(sat(t/.2)), out=sat((dur+.25-t)/.25), f=1-out, J=pl.j, ox=J&&J.rh?J.rh[0]:pl.x+pl.f*50, z=J&&J.rh?Math.max(40,pl.gy-J.rh[1]):BODY*.55, la=Math.atan2(Math.sin(a)/(FSY*KY),Math.cos(a)), r1=R*(.2+.8*i)*1.08, mx=pl.x+Math.cos(a)*R*.55, my=pl.gy+Math.sin(a)*R*.55, fl=1+.05*Math.sin(t*31);
        Lt.x=mx; Lt.y=my;
        F.quad(km.glowG,mx,my,R*.6,R*.46,0,{...C,a:.75*out*i,gain:1.3});
        F.lathe(km.waB,ox,pl.gy,z,{r0:24,r1:r1*fl,a0:la-half*1.25,a1:la+half*1.25,M:Mx,...C,a:out,gain:2.5,ero:.1+f*.6,uvT:[1.6,1,sd,0],t0:sd});
        F.lathe(km.waC,ox,pl.gy,z,{r0:24,r1:r1*.8,a0:la-half*.95,a1:la+half*.95,M:Mx,...C,a:out,gain:3,ero:.22+f*.6,uvT:[2.4,1,sd+.4,0],t0:sd});
        F.lathe(km.waC,ox,pl.gy,z,{r0:20,r1:r1*.5,a0:la-half*.6,a1:la+half*.6,M:Mx,...CG,a:out,gain:3.4,ero:.2+f*.6,uvT:[1.4,1,sd+.7,0],t0:sd+3});
        F.bill(km.glowO,ox,pl.gy,z,70,70,0,{...CG,a:out,gain:2.6});
        if(out>=1) for(let q=0;q<2;q++){ const b=a+rand(-half,half)*.8, sp=rand(700,1300); GFX.pt({x:ox,y:pl.gy,z:z+rand(-10,10),vx:Math.cos(b)*sp,vy:Math.sin(b)*sp,vz:rand(-40,200),g:-120,drag:1.5,life:rand(.3,.6),s:rand(2.5,5),m:3,len:.04,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } }); }
    V.zones.push({follow:true,r:0,life:2,tick:.1,onTick:()=>{ const t=nearest(R+60); if(t){ const b=flat(angTo(t)); a+=Math.atan2(Math.sin(b-a),Math.cos(b-a))*.25; face(a); }
      if(Math.random()<.3){ const b=a+rand(-half,half)*.7, r=rand(.5,.95)*R; scorch(pl.x+Math.cos(b)*r,pl.gy+Math.sin(b)*r,rand(70,110),{life:1.8}); }
      inSector(pl.x,pl.gy,a,R,half,o=>{ dmg(o,d,{kb:.3}); hitFx(o,C1,.8); }); }}); }},
  // FIRE TORNADO: whirls of fire that hunt for four seconds
  py_tornado:{fn(id){ if(V.zones.some(z=>z.pyt)||countIn(800)<3) return false; const n=EVO(id)?3:2, d=D(id); raise(); sfx('fire',1.6,.7);
    for(let k=0;k<n;k++){ const a=k/n*TAU+rand(0,1), z={pyt:true,x:pl.x+Math.cos(a)*200,y:pl.gy+Math.sin(a)*160,r:170,life:4,tick:.2};
      z.px=z.x; z.py=z.y; const w=whirl(z.x,z.y,{s:.95,h:560,r:170,dur:4.05,in:.35,out:.3}); K.shock(z.x,z.y,{r:260,dur:.3,pal:PF,gain:.6,light:0}); let sc=0;
      GFX.add(4,(kk,t)=>{ const u=sat((z.acc||0)/z.tick), wx=mix(z.px,z.x,u), wy=mix(z.py,z.y,u); w.lean=clamp((w.x-wx)*.02,-.25,.25); w.x=wx; w.y=wy; });
      z.fn=o=>{ dmg(o,d,{kb:.6,stun:.2,sx:z.x,sy:z.y}); hitFx(o,C1,.9); o.pull={x:z.x,y:z.y,s:260}; };
      z.onTick=z=>{ z.px=z.x; z.py=z.y; const t=V.en.filter(o=>!o.dead).sort((p,q)=>Math.hypot(p.x-z.x,p.y-z.y)-Math.hypot(q.x-z.x,q.y-z.y))[0];
        if(t){ const b=Math.atan2(t.y-z.y,t.x-z.x); z.x+=Math.cos(b)*70; z.y+=Math.sin(b)*70; } const hx=z.x-pl.x, hy=z.y-pl.gy, hl=Math.hypot(hx,hy); if(hl>420){ z.x=pl.x+hx/hl*420; z.y=pl.gy+hy/hl*420; }
        if((sc^=1)) scorch(z.x,z.y,150,{life:2.6}); };
      z.onEnd=z=>{ w.dead=true; blast(z.x,z.y,1.2); };
      V.zones.push(z); } }},
  // SUPERNOVA: a small sun is pressed together over his hands, and let go
  py_nova:{fn(id){ const R=EVO(id)?720:560; if(countIn(R)<8) return false; const d=D(id);
    S([['gy01',.1],['gy02',.15],['gy03',.4,{kick:[-.8,.6]}],['gy07',.1,{kick:[-1.4,1]}],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.3],['gy14',.15]]); sfx('rise',1.2,.7);
    const x=pl.x, y=pl.gy, zs=BODY*1.25;
    for(let i=0;i<34;i++) after(i*.018,()=>{ const b=rand(0,TAU), r=rand(300,640); GFX.pt({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*FSY,z:rand(0,300),tx:x,ty:y,tz:zs,pull:rand(5,8),vx:-Math.sin(b)*400,vy:Math.cos(b)*240,life:rand(.35,.55),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
    for(let i=0;i<2;i++) K.shock(x,y,{r0:R*(.9-i*.25),r:50,dur:.36,delay:i*.3,pal:PF,gain:.55,light:0,dust:0,haze:.4,th:.6});
    if(F.on){ const m=mats(), km=K.mats(), sd=rand(0,9), Lt=GFX.light(x,y,700,PG.l,.2,.2,{hold:.75,z:zs}); GFX.ambient(.62,.56,.6,4);
      GFX.add(.78,(k,t)=>{ const e=k*k, s=mix(26,120,e)*(1+.05*Math.sin(t*40)); Lt.a=.3+.9*e; F.quad(km.glowG,x,y,260*e+60,260*e+60,0,{...col(PF),a:.8*e,gain:1.4});
        F.bill(km.glowO,x,y,zs,s*2.1,s*2.1,0,{...col(PF),a:.7,gain:1.6+e}); F.bill(m.sun,x,y,zs,s,s,t*2.2,{...col(PG),gain:2.4+e*1.2,ero:.08,t0:sd}); }); }
    after(.75,()=>{ K.burst(x,y,{s:R*.62,pal:PF,z:0,smoke:3,scar:4.5}); K.art(x,y,{tex:'v3_xburst',s:R*.8,z:zs*.5,dur:.26,pal:PG,gain:1,hold:.15,s0:.5});
      ringFire(x,y,{r0:110,r:R*1.05,h:300,dur:.6}); K.dome(x,y,{r:R*.9,dur:.42,pal:PF,gain:.7}); K.shock(x,y,{r:R*1.5,dur:.7,pal:PF,gain:.8,delay:.08,light:0}); GFX.ripple(x,y,R*1.4,{life:.5,s:.8});
      K.debris(x,y,{n:14,r:120,sp:[300,1100],up:1500,size:20}); K.embers(x,y,R*.8,{pal:PF,n:26,life:2}); scorch(x,y,R*.6,{life:4.5});
      GFX.ambient(1,1,1,2.5); post.ca=.01; trauma=1.3; hitstop=.07; sfx('boom',2.2,1);
      inCircle(pl.x,pl.gy,R,o=>{ dmg(o,d,{kb:2.2,big:true,launch:900}); hitFx(o,C1,1.5); }); }); }},
};

/// ---- ultimates. Each is one staged sequence in the real field: omen -> release -> development -> climax -> afterglow
// FIRE STORM: six flames light on the rim of his circle and twist up into whirls; they walk out across the whole field burning their
// paths into the floor while the ground erupts between them; then all six come home, wind into one column - and the column lets go.
function ultStorm(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, RM=Math.max(hw,hh)*.68;
  S([['gx01',.1],['gx03',1.5,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',1.9],['gx09',.4],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  // ---- omen: the light leaves the field, the sun circle writes itself, heat is drawn in, six flames light one by one
  GFX.ambient(.3,.32,.46,3.5); const spot=GFX.light(x0,y0,540,'#ff6a1c',.75,.5,{hold:9,z:120,flick:.15});
  const sig=K.sigil(x0,y0,{r:hw*.5,dur:5.9,in:1.1,out:.6,spin:.3,pal:PS,tex:CIRC()});
  K.crack(x0,y0,{r:250,pal:PF,life:6,grow:1.4});
  Cn.zoom(1.3); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); Cn.drone(44,.3); Cn.SND.inhale(1.2,.4);
  for(let i=0;i<3;i++) after(.2+i*.4,()=>K.shock(x0,y0,{r0:hw*(1-i*.14),r:70,dur:.45,pal:PF,gain:.45,light:0,dust:0,haze:.5,th:.6}));
  for(let i=0;i<50;i++) after(rand(0,1.6),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,360),tx:x0,ty:y0,tz:BODY*.9,pull:rand(4,6.5),life:rand(.45,.7),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*560,vy:Math.cos(a)*330,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
  const tor=[]; let t=0, out=false, home=0, done=false;
  const RC=hw*.43;
  for(let k=0;k<6;k++){ const a=k/6*TAU, z={a,x:x0+Math.cos(a)*110,y:y0+Math.sin(a)*110*.8,R0:110,sc:rand(0,.1),n:k,s1:rand(1.25,1.6),path:[],w:null,cx:x0+Math.cos(a+.52)*RC,cy:y0+Math.sin(a+.52)*RC*FSY}; tor.push(z); const tl=.5+k*.2;
    after(tl,()=>{ z.cd=K.flame(z.cx,z.cy,{s:185,dur:1.82-tl+.3,pal:PF,light:0}); K.sparks(z.cx,z.cy,20,{pal:PF,n:8,sp:[100,420],up:800,life:[.2,.5]}); GFX.light(z.cx,z.cy,380,PF.l,.75,.4); K.shock(z.cx,z.cy,{r:130,dur:.25,pal:PF,gain:.5,light:0,dust:0,haze:0}); if(sig.kick) sig.kick(); Cn.SND.tick(1+k*.1,.25); }); }
  V.ultTick=dt=>{ t+=dt; if(!out) return;
    for(const z of tor){ z.a+=dt*(home?2.6:1.25); const R=home?lerp(z.R0,0,Math.min(1,(t-home)/.5)**2):lerp(110,RM,easeOut(Math.min(1,(t-1.9)/1.1))); if(!home) z.R0=R; z.x=x0+Math.cos(z.a)*R; z.y=y0+Math.sin(z.a)*R*.8;
      if(z.w){ z.w.x=z.x; z.w.y=z.y; z.w.s=z.s1*(.4+.6*sat((R-110)/520)); z.w.lean=-Math.sin(z.a)*(home?-.22:.16); if(home) z.w.a=1-.6*Math.min(1,(t-home)/.5); }
      if(Math.random()<.3) inCircle(z.x,z.y,210,o=>ultHit(o,Dm*.12,z.x,z.y));
      if((z.sc+=dt)>.11&&!home){ z.sc=0; z.path.push({x:z.x,y:z.y,t}); if(z.path.length%4===(z.n&3)) scorch(z.x,z.y,210,{life:4.4,heat:1.2}); } } };
  // the arms: each whirl's path stays alight behind it, so the field carries a burning spiral
  if(F.on){ const km=K.mats(), C=col(PF), sd=rand(0,9); GFX.add(9,()=>{ if(done||!tor[0].path.length) return; const blown=sat(1-(t-4.42)/.45); if(blown<=0) return;
      for(const z of tor){ const P_=z.path, n=P_.length; if(n<2) continue; for(const p of P_){ const age=t-p.t; p.h=170*sat(age/.2)*sat(1.15-(age-1.5)/1.2)*(1+.12*Math.sin(p.t*37+t*9)); }
        F.wall(km.waB,P_,{...C,a:blown,gain:2.1,ero:.14+(1-blown)*.6,ulen:380,fd:[0,0,0,.35],uvT:[1,1,z.n*.37,0],t0:sd+z.n}); F.wall(km.waC,P_,{...C,a:blown*.8,gain:2.4,ero:.34+(1-blown)*.6,ulen:300,fd:[0,0,0,.6],uvT:[1,1,z.n*.61,0],t0:sd+z.n+3}); } }); }
  // ---- release: the six flames twist up and walk out
  after(1.82,()=>{ out=true; sig.pal=PF; if(sig.kick) sig.kick(); spot.hold=0; spot.life=.3; Cn.zoom(.84); Cn.cam(null); Cn.shake(.8); post.ca=.01; hitstop=Math.max(hitstop,.05); SFX.boom(1.4,.5); Cn.SND.shing(.7,.4);
    GFX.ambient(.5,.38,.36,30); after(.14,()=>GFX.ambient(.3,.31,.44,5));
    K.art(x0,y0,{tex:'v3_xburst',s:hw*.42,z:BODY*.4,dur:.3,pal:PG,gain:1,hold:.18,s0:.5}); K.shock(x0,y0,{r:hw*1.4,dur:.55,pal:PF}); GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7});
    ringFire(x0,y0,{r0:100,r:420,h:190,dur:.45}); K.sparks(x0,y0,BODY*.6,{pal:PF,n:36,sp:[500,1900],up:900}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,800],up:1000});
    for(const z of tor){ K.flame(z.cx,z.cy,{s:300,dur:.45,pal:PG,light:0}); z.w=whirl(z.x,z.y,{s:z.s1*.4,h:640,r:185,dur:2.6,in:.4,out:.25}); } });
  // ---- development: the field erupts between the whirls
  for(let i=0;i<16;i++) after(2.1+i*.1,()=>{ const x=x0+rand(-hw,hw)*.9, y=y0+rand(-hh,hh)*.85;
    K.burst(x,y,{s:200,pal:PF,smoke:i%3?0:1,no:['crack','debris','shock']}); K.flame(x,y,{s:rand(280,360),dur:.75,pal:PF,light:0}); scorch(x,y,210,{life:3.2});
    sfx('boom',.8,.4); Cn.shake(.3); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  // ---- they come home and wind into one
  after(3.75,()=>{ home=t; Cn.zoom(1.05); Cn.SND.inhale(.5,.7); GFX.ambient(.3,.3,.4,8); sig.a=1.5;
    for(let i=0;i<2;i++) K.shock(x0,y0,{r0:hw*(1.3-i*.3),r:90,dur:.42,delay:i*.16,pal:PF,gain:.6,light:0,dust:0,haze:.6,th:.7});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(500,1100); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,400),tx:x0,ty:y0,tz:300,pull:rand(5,8),life:rand(.4,.6),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*900,vy:Math.cos(a)*520,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } });
  let big=null;
  after(4.12,()=>{ big=whirl(x0,y0,{s:2.9,h:640,r:150,dur:.75,in:.24,out:.3,gain:1.1,light:1.2,eye:true}); Cn.shake(.5); SFX.whoosh(.6,1); });
  // one held breath: the light drops and everything waits
  after(4.33,()=>{ GFX.ambient(.3,.3,.36,40); hitstop=Math.max(hitstop,.07); if(sig.kick) sig.kick(); });
  // ---- climax: the column lets go
  after(4.42,()=>{ out=false; for(const z of tor) if(z.w) z.w.dead=true;
    hitstop=Math.max(hitstop,.11); Cn.shake(1.5); post.ca=.014; Cn.zoom(.82); SFX.boom(2.2,1); Cn.SND.hit(1);
    GFX.ambient(.62,.42,.34,40); after(.18,()=>GFX.ambient(.4,.33,.38,3));
    K.burst(x0,y0,{s:hw*.66,pal:PG,smoke:3,scar:6,no:['crack']}); K.flame(x0,y0,{s:1050,dur:1.25,pal:PF,light:0}); K.flame(x0,y0,{s:620,dur:1,pal:PG,light:0,gain:.9});
    ringFire(x0,y0,{r0:160,r:hw*1.7,h:760,dur:1.05,n:44,gain:1.1}); ringFire(x0,y0,{r0:120,r:hw*1.0,h:340,dur:.9,delay:.18,pal:PD});
    K.crack(x0,y0,{r:hw*.95,pal:PF,life:5.5,grow:.14,gain:1.2}); K.shock(x0,y0,{r:hw*1.8,dur:.6,pal:PF,gain:1.2}); K.shock(x0,y0,{r:hw*2.4,dur:.9,pal:PF,gain:.7,delay:.1,light:0});
    GFX.ripple(x0,y0,hw*2,{life:.6,s:.9}); K.dome(x0,y0,{r:hw*.85,dur:.45,pal:PF,gain:.7}); K.debris(x0,y0,{n:24,r:160,sp:[300,1300],up:1800,size:22}); K.dust(x0,y0,{n:20,r:120,sp:[500,1400],a:.5});
    K.sparks(x0,y0,80,{pal:PF,n:50,sp:[600,2400],up:1800,life:[.4,1]}); GFX.light(x0,y0,hw*2.2,PF.l,1.3,1,{z:300});
    Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3});
    // what is left burns where it fell
    for(let i=0;i<8;i++){ const a=rand(0,TAU), r=rand(260,820), fx=x0+Math.cos(a)*r, fy=y0+Math.sin(a)*r*.75; K.flame(fx,fy,{s:rand(110,190),dur:rand(1.5,2.3),pal:PF,delay:.25+i*.04,light:0}); scorch(fx,fy,rand(120,170),{life:4,delay:.25+i*.04}); } });
  // ---- afterglow: smoke climbs off the scars, embers drift, the colour comes back
  after(4.95,()=>{ for(let i=0;i<5;i++){ const a=rand(0,TAU), r=rand(0,520); K.smoke(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{s:rand(240,380),dur:rand(1.3,1.9),delay:i*.08,a:.55,c:'#1c120e',c2:'#4a3026'}); }
    K.embers(x0,y0,hw*.9,{pal:PF,n:60,life:2.4,up:320}); GFX.ambient(.8,.7,.68,1.6); Cn.zoom(.95); });
  after(5.35,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); sig.a=.6; });
  after(5.95,()=>{ done=true; sig.dead=true; for(const z of tor) if(z.w) z.w.dead=true; if(big) big.dead=true; ultStop(); }); }

// DRAGON BLAZE: something turns under the circle; it climbs out as a dragon of fire, takes one burning lap of the field low over the
// floor (the stone lights up under it and stays alight behind it), rears, and pours itself into the ground where they are thickest.
function ultDragon(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy;
  S([['gy01',.12],['gy02',.2],['gy03',.4,{kick:[-.8,.6]}],['gy04',1.1],['gy05',.1],['gy06',.1],['gy07',.12,{kick:[-1.4,1]}],['gy08',.8],['gy09',.8],['gy10',.8],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.6],['gy13',.7],['gy14',9]]);
  const RR=Math.min(hw,hh)*.66, T0=1.9, TD=2.2, DD=.42, END=TD+DD, ZF=260, TB=1, N=32, HS=230, HA=900/595, WB=92;
  // ---- omen
  GFX.ambient(.3,.31,.44,3.5); const spot=GFX.light(x0,y0,560,'#ff5a18',.8,.5,{hold:9,z:120,flick:.2});
  Cn.zoom(1.28); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); const dr=Cn.drone(41,.4); SFX.rumble(1.7);
  const sig=K.sigil(x0,y0,{r:30,dur:2.9,in:1.1,out:.45,spin:-.8,pal:PS,tex:CIRC()}); after(.9,()=>{ sig.pal=PD; if(sig.kick) sig.kick(); });
  K.crack(x0,y0,{r:320,pal:PD,life:5.2,grow:1.7});
  for(let i=0;i<3;i++) after(.25+i*.45,()=>K.shock(x0,y0,{r0:hw*(.95-i*.12),r:70,dur:.45,pal:PD,gain:.45,light:0,dust:0,haze:.5,th:.6}));
  for(let i=0;i<40;i++) after(rand(.1,1.7),()=>{ const a=rand(0,TAU), d=rand(60,340); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:2,vx:rand(-30,30),vz:rand(160,420),g:-80,drag:.5,life:rand(.6,1.1),s:rand(3,6),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),fade:'in',L:3}); });
  // path of the head: floor position and height, lt seconds after it leaves the circle
  const lap=lt=>{ const a=-PI/2+lt*3.0, R=RR*Math.min(1,lt/.45); return [x0+Math.cos(a)*R,y0+Math.sin(a)*R*.75]; };
  const pos=lt=>{ if(lt<=0) return {x:x0,y:y0,z:0}; if(lt<TD){ const [x,y]=lap(lt); return {x,y,z:ZF*eo3(sat(lt/.35))+Math.sin(lt*6)*34}; }
    const k=sat((lt-TD)/DD), e=k*k, z0=ZF+Math.sin(TD*6)*34, [lx,ly]=lap(TD+(lt-TD)*(1-k*.7)); return {x:lerp(lx,cx,e),y:lerp(ly,cy,e),z:(z0+820*k)*(1-k*k*k)}; };
  let t=0, sc=0, fl=0, dive=0, done=false;
  V.ultTick=dt=>{ t+=dt; sig.r=lerp(30,330,easeOut(Math.min(1,t/1))); Cn.shake(t<1.8?.1+t*.1:0);
    if(t<T0){ if((sc+=dt)>.09){ sc=0; const a=rand(0,TAU), r=rand(200,330); K.flame(x0+Math.cos(a)*r,y0+Math.sin(a)*r*FSY,{s:rand(50,110)*(.5+t*.4),dur:.5,pal:PD,light:0}); } return; }
    const lt=t-T0; if(dive||lt>=TD) return; const p=pos(lt);
    if((sc+=dt)>.11){ sc=0; scorch(p.x+rand(-40,40),p.y+rand(-20,20),170,{life:5,heat:1.3}); if((fl^=1)) K.flame(p.x+rand(-30,30),p.y+rand(-16,16),{s:rand(90,140),dur:rand(1.5,2.1),pal:PF,light:0}); }
    if(Math.random()<.35){ V.blast={x:p.x,y:p.y,p:.8}; inCircle(p.x,p.y,270,o=>ultHit(o,Dm*.15,p.x,p.y-BODY)); } };
  // the shape under the floor before it comes: a body turning under the circle, then the head
  if(F.on){ const m=mats(); GFX.add(1.5,(k,tt)=>{ const a=sat(tt/.5)*(1-sat((tt-1.4)/.1)), r=sig.r*.78, w=r*.36, a0=-tt*2.6;
      for(let q=0;q<2;q++) F.lathe(m.dC,x0,y0,0,{r0:r-w/2,r1:r+w/2,a0:a0+q*PI,a1:a0+q*PI+PI*.92,a:a*(.5+.5*k),ero:.3-.34*k,soft:.2,gain:.9+k*.9}); },.4);
    GFX.add(.75,(k,tt)=>{ const a=sat(tt/.4)*(1-sat((tt-.68)/.07)), sz=210*(1+.1*Math.sin(tt*11)); F.quad(m.dS,x0+16,y0,sz*HA,sz,-.6+tt*.8,{a,ero:.3-.3*k,soft:.2,gain:1.2+k}); },1.14); }
  // ---- the dragon itself: drawn from the path every frame
  if(F.on){ const m=mats(), km=K.mats(), C=col(PF), CD=col(PD), CG=col(PG), sd=rand(0,9), pts=[], au=[];
    const L1=GFX.light(x0,y0,820,'#ff6a1c',0,.3,{hold:9,z:220,flick:.12}), L2=GFX.light(x0,y0,600,'#ff3410',0,.3,{hold:9,z:160,flick:.12});
    const shape=u=>u<.1?mix(.72,1,u/.1):Math.pow(Math.max(0,1-(u-.1)/.9),.75);
    GFX.add(9,()=>{ const lt0=t-T0; if(done||lt0>END+TB*.4){ L1.hold=L2.hold=0; return; } if(lt0<=0) return; const lt=lt0+Math.max(0,lt0-END)*1.5;   /* once the head is in, the rest pours after it */
      pts.length=0; au.length=0;
      for(let i=0;i<N;i++){ const u=i/(N-1), q=lt-u*TB, p=pos(Math.min(q,END)), wv=Math.sin(lt*10-u*8)*24*Math.min(1,u*4);
        pts.push({x:p.x,y:p.y,z:Math.max(0,p.z+wv),w:WB*shape(u)*(q>END?0:sat(q/.05))}); }
      for(let i=N-1;i>=0;i--){ const p=pts[i]; au.push({x:p.x,y:p.y,z:p.z,w:p.w*2.5}); }
      const hp=pts[0], hq=pts[2], dx=hp.x-hq.x, dy=(hp.y-hp.z)-(hq.y-hq.z), dl=Math.hypot(dx,dy)||1, ux=dx/dl, uy=dy/dl, th=Math.atan2(dy,dx), right=dx>=0, head=lt<END, hk=sat(lt/.25), mid=pts[N>>1], live=head?1:sat(1-(lt0-END)/(TB*.4));
      L1.x=hp.x; L1.y=hp.y; L1.a=1.2*live; L2.x=mid.x; L2.y=mid.y; L2.a=.85*live*sat(lt/.4);
      // on the floor: its shadow, and the light it throws down
      if(head){ F.quad(km.dark,hp.x,hp.y,260,260,0,{a:.5*hk}); F.quad(km.glowG,hp.x,hp.y,460,460,0,{...C,a:.85*hk,gain:1.4}); }
      if(mid.w>1){ F.quad(km.dark,mid.x,mid.y,220,220,0,{a:.42}); F.quad(km.glowG,mid.x,mid.y,330,330,0,{...CD,a:.6,gain:1.2}); }
      // the fire it wears, streaming back along the body
      F.ribbon(km.trB,au,{...CD,gain:1.7,ero:.1,t0:sd,a:.85,n1:[2,.8,1.6,0],n2:[2,1,.8,0],fd:[.2,.02,0,0]});
      // the mane: painted flames rooted along the spine, blown back and up
      for(let i=1;i<N-5;i+=3){ const p=pts[i], q=pts[i+2], bx=q.x-p.x, by=(q.y-q.z)-(p.y-p.z), bl=Math.hypot(bx,by)||1; if(p.w<6) continue; const tx_=bx/bl*.75, ty_=by/bl*.75-.66, tl=Math.hypot(tx_,ty_)||1; tongue(p.x,p.y,p.z+p.w*.2,p.w*(2.9-i*.04),tx_/tl,ty_/tl,{...(i%2?C:CD),t0:sd+i,a:.9,gain:2.2}); }
      // the body: two lengths of scales
      const h2=N>>1; F.ribbon(m.dB,pts.slice(0,h2+1),{ero:-1,a:1,gain:1.25}); F.ribbon(m.dB,pts.slice(h2),{ero:-1,a:1,gain:1.25});
      // the head
      if(head){ const rot=right?th-.22:th-PI+.22, s=HS*(1+hp.z/1500), HW=s*HA, ax=(right?-.6:.6)*HW, az=-.5*s, co=Math.cos(rot), si=Math.sin(rot), ox=ax*co+az*si, oy=ax*si-az*co;
        const hx=hp.x-ox, hz=hp.z+oy;
        F.bill(km.glowO,hx,hp.y,hz,s*1.8,s*1.8,0,{...CD,a:.5*hk,gain:1.3});
        F.bill(m.dH,hx,hp.y,hz,HW,s,rot,{ero:mix(.9,-.1,hk),soft:.1,uvT:right?[1,1,0,0]:[-1,1,1,0]});
        const mx=(right?.5:-.5)*HW, mz=-.2*s; F.bill(km.glowO,hx+mx*co+mz*si,hp.y,hz-(mx*si-mz*co),s*.3,s*.3,0,{...CG,a:.8*hk,gain:2.2+Math.sin(t*37)*.4}); }
      // embers shed along its length
      for(let q=0;q<2;q++){ const p=pts[(Math.random()*(N-4))|0]; if(p.w>4) GFX.pt({x:p.x+rand(-30,30),y:p.y,z:p.z+rand(-30,30),vx:rand(-90,90),vy:rand(-40,40),vz:rand(-60,220),g:120,drag:.8,life:rand(.4,.9),s:rand(2.5,6),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); } }); }
  // ---- release: it comes up through the circle
  after(1.87,()=>{ dr.stop(.1); SFX.roar(1.8,1); spot.hold=0; spot.life=.3; hitstop=Math.max(hitstop,.06); Cn.shake(1); post.ca=.012; Cn.zoom(.82); Cn.cam(null);
    GFX.ambient(.52,.36,.34,30); after(.14,()=>GFX.ambient(.3,.3,.42,5));
    K.burst(x0,y0,{s:340,pal:PF,smoke:2,no:['crack']}); K.flame(x0,y0,{s:560,dur:.8,pal:PD,light:0}); K.flame(x0,y0,{s:330,dur:.6,pal:PF,light:0}); ringFire(x0,y0,{r0:90,r:480,h:220,dur:.5});
    K.shock(x0,y0,{r:hw*1.4,dur:.55,pal:PF}); GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7}); K.debris(x0,y0,{n:16,r:140,sp:[250,1000],up:1500,size:20}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); });
  // ---- it chooses: the mark on the floor where it will go in, the lap it flew still alight behind it
  after(4.1,()=>{ dive=t; Cn.cam(cx,cy-BODY,9); Cn.zoom(.9); GFX.ambient(.3,.3,.38,8); SFX.roar(1.2,1); Cn.SND.inhale(.42,.7);
    K.sigil(cx,cy,{r:440,dur:1.5,in:.3,out:.4,spin:1.4,pal:PS,tex:CIRC()}); GFX.light(cx,cy,700,PF.l,.7,.2,{hold:.4,z:60});
    for(let i=0;i<2;i++) K.shock(cx,cy,{r0:760-i*220,r:60,dur:.36,delay:i*.12,pal:PF,gain:.6,light:0,dust:0,haze:.5,th:.7});
    fireLine(ringPts(x0,y0,RR,40,.75),{h:120,dur:2.6,in:.3,out:.9,closed:true,pal:PD,gain:.9}); });
  // ---- climax: it pours into the floor and the floor gives it back
  after(4.44,()=>{ GFX.ambient(.3,.3,.36,40); hitstop=Math.max(hitstop,.07); });
  after(4.52,()=>{ hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.8); SFX.boom(2.2,1); Cn.SND.hit(1); SFX.roar(1.6,.8);
    GFX.ambient(.62,.42,.34,40); after(.18,()=>GFX.ambient(.4,.33,.38,3));
    K.burst(cx,cy,{s:hw*.7,pal:PG,smoke:3,scar:6,no:['crack']}); K.art(cx,cy,{tex:'fx3_burst',s:hw*.5,asp:1.39,z:260,dur:.8,pal:PD,gain:.9,hold:.3,s0:.5,rot:.4}); K.flame(cx,cy,{s:900,dur:1.15,pal:PF,light:0}); K.flame(cx,cy,{s:520,dur:.9,pal:PG,light:0,gain:.9});
    K.crack(cx,cy,{r:hw*1.0,pal:PF,life:5.5,grow:.14,gain:1.25}); K.crack(cx,cy,{r:hw*.55,pal:PG,life:4,grow:.1,gain:1.1}); K.shock(cx,cy,{r:hw*1.8,dur:.6,pal:PF,gain:1.2}); K.shock(cx,cy,{r:hw*2.4,dur:.9,pal:PF,gain:.7,delay:.1,light:0});
    GFX.ripple(cx,cy,hw*2,{life:.6,s:.9}); K.dome(cx,cy,{r:hw*.8,dur:.45,pal:PD,gain:.7}); K.debris(cx,cy,{n:26,r:160,sp:[300,1400],up:1900,size:22}); K.dust(cx,cy,{n:20,r:120,sp:[500,1400],a:.5});
    K.sparks(cx,cy,80,{pal:PF,n:50,sp:[600,2400],up:1800,life:[.4,1]}); GFX.light(cx,cy,hw*2.2,PF.l,1.3,1,{z:300});
    // the fire it carried comes back up through the floor: two crowns of geysers, running outward
    for(let ring=0;ring<2;ring++){ const n=ring?10:6, r=hw*(ring?.82:.42); for(let i=0;i<n;i++){ const a=i/n*TAU+ring*.3+rand(-.1,.1), gx=cx+Math.cos(a)*r, gy=cy+Math.sin(a)*r*FSY, dl=.12+ring*.2+i*.022, sz=ring?rand(300,400):rand(380,480);
        K.flame(gx,gy,{s:sz,dur:rand(.9,1.3),pal:ring?PD:PF,delay:dl,light:0}); scorch(gx,gy,200,{life:4.5,delay:dl}); after(dl,()=>{ K.art(gx,gy,{tex:'v3_xburst',s:sz*.5,z:30,dur:.2,pal:PG,hold:.15,s0:.5}); K.sparks(gx,gy,20,{pal:PF,n:7,sp:[150,600],up:1500}); if(i%3===0) K.debris(gx,gy,{n:4,r:40,sp:[200,600],up:1100}); });
        if(i%2===0) K.flame(gx,gy,{s:rand(120,170),dur:rand(1.4,2),pal:PF,delay:dl+.7,light:0}); } }
    Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}); });
  // ---- afterglow
  after(5.1,()=>{ for(let i=0;i<5;i++){ const a=rand(0,TAU), r=rand(0,480); K.smoke(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{s:rand(240,380),dur:rand(1.3,1.9),delay:i*.08,a:.55,c:'#1c120e',c2:'#4a3026'}); }
    K.embers(cx,cy,hw*.85,{pal:PF,n:60,life:2.4,up:320}); GFX.ambient(.8,.7,.68,1.6); });
  after(5.5,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(6.15,()=>{ done=true; sig.dead=true; ultStop(); }); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
