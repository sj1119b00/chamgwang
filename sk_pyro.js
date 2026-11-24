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
const PB={d:'#06102e',b:'#3a7cff',m:'#bfe2ff',h:'#ffffff',l:'#a8caff',s:'#dff0ff'};   // blue-white: only the very hottest instant
const PS=K.PAL.silver||{d:'#070a14',b:'#aab8d8',m:'#e4ecff',h:'#ffffff',l:'#b9c6ff',s:'#e0e8ff'};   // the cold circle the fire is called through
const col=P=>({cA:P.d,cB:P.b,cC:P.h,cM:P.m||P.b});
const CIRC=()=>F.ready('v3_circ_pyro')?'v3_circ_pyro':'fx_circle_arcane';
if(F&&F.on){ for(const n of ['dragon_head','dragon_body','fx_sun','meteor','fx3_tornado','fx3_fire','fx3_smoke','v3_circ_pyro','v3_comet_tail','v3_crater','v3_scorch','v3_flame_cone','v3_vortex_wisps']) F.img(n); F.img('v3_groundfire',{repeat:true}); for(const n of ['v3_burst_fire','v3_shock_thick','v3_fissure_b','v3_flip_blast','v3_flip_smoke','v3_flip_shock']) F.img(n); }
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
  sc:m({tex:'v3_scorch',nz:'cells',n1:[3,3,.012,.008],n2:[2,2,.01,.01],dist:.03,mdist:1,nk:.85,pw:1.5,ero:.03,soft:.22,cA:'#000000',rk:[.45,1.15],op:1,layer:'g'}),
  // the dragon: painted colour art
  dH:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ffffff',cC:'#ffd070',gain:1.2,op:1,layer:'o'}),
  dB:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[4,1,0,0],cB:'#ffffff',cC:'#ffd070',gain:1.15,op:1,layer:'o'}),
  // low fire running along a floor path (the painted strip repeats along it)
  gf:m({tex:'v3_groundfire',texO:{repeat:true},nz:'wisp',n1:[1,.5,0,-1.2],n2:[1.2,.9,.05,-.9],dist:.07,mdist:1,nk:.35,ero:.1,soft:.35,fd:[0,0,0,.12],rk:[.55,1.15],gain:2.4,bgain:1.05,op:.5}),
  // a jet of fire: nozzle at u=0, billowing wide at u=1
  fc:m({...k.art,tex:'v3_flame_cone',layer:'o',nz:'wisp',n1:[1.4,1,-1.5,0],n2:[1.3,1,-1,.05],dist:.06,mdist:1,nk:.3,rk:[.55,1.2]}),
  // separate ribbons of a whirlwind with black between them
  vx:m({...k.art,tex:'v3_vortex_wisps',layer:'o',nz:'wisp',n1:[1.5,1,-.9,-.5],n2:[1.4,1,-.7,-.5],dist:.05,mdist:1,nk:.25,rk:[.5,1.15]}),
  // comet tail (its head flare is at u=1): fire streaming back, and the black-crimson smoke it drags
  ct:m({...k.art,tex:'v3_comet_tail',layer:'o',nz:'streak',n1:[1.5,1,1.8,0],n2:[1.4,1,1.1,.05],dist:.05,mdist:1,nk:.3,rk:[.55,1.2]}),
  ctS:m({...k.art,tex:'v3_comet_tail',layer:'o',nz:'billow',n1:[1.5,1,.7,0],n2:[1.3,1,.5,.04],dist:.07,mdist:1,nk:.4,pw:.7,ero:.12,soft:.4,cA:'#000000',cB:'#140202',cC:'#3c0a04',rk:[.5,1.1],op:1,gain:1,bgain:1}),
  // crater: the hole and its ejecta in soot, the molten cracks inside it
  crtD:m({tex:'v3_crater',nk:0,pw:.6,ero:.08,soft:.45,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  crtE:m({tex:'v3_crater',nz:'cells',n1:[3,3,.01,.008],nk:.45,pw:1.7,ero:.16,soft:.3,rk:[.55,1.2],gain:2.6,bgain:1.2,layer:'g'}),
  // a card of dark smoke
  smk:m({...k.art,tex:'fx3_smoke',layer:'o',nz:'billow',n1:[1.5,1.5,.05,-.12],n2:[1.2,1.2,.03,-.1],dist:.05,mdist:1,nk:.3,op:1,cA:'#080505',cB:'#180b08',cC:'#48241a',rk:[.3,1],gain:1,bgain:1}),
  // the dragon's head as a shape in the floor: glowing (omen) and charred (what it leaves)
  dHg:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[2.5,2.5,0,.1],cB:'#ff3a10',cC:'#ffc040',gain:1,op:0,layer:'g'}),
  dHk:m({kind:2,tex:'dragon_head',nz:'fbm',n1:[3,3,.02,.01],cB:'#0c0403',cC:'#ff7a20',gain:1,op:1,layer:'g'}),
  // light catching the scales (added over the body where it turns to the light)
  dA:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[4,1,0,0],cB:'#ffb060',cC:'#ffffff',gain:1,op:0,layer:'o'}),
  // a soft shadow band on the floor (under a flying body)
  shd:m({pm:[2,1.1,0,0],nk:0,ero:0,soft:.5,cA:'#000000',cB:'#000000',cC:'#000000',op:1,layer:'g'}),
  // the dragon's scales charred into the floor, embers at the edges of the burn
  dBk:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[5,1.2,.01,0],cB:'#4a1a0c',cC:'#ff7a20',gain:1,op:1,layer:'g'}),
  // the scar a walking whirl leaves: a charred, ember-veined track
  arm:m({nz:'cells',n1:[9,1.4,.01,0],n2:[3,1,0,0],dist:.03,nk:.85,pw:1.3,ero:.04,soft:.25,pm:[2,1.1,0,0],cA:'#000000',rk:[.45,1.15],op:1,layer:'g'}),
  dC:m({kind:2,tex:'dragon_body',nz:'fbm',n1:[3,1,0,0],cB:'#ff3008',cC:'#ffb040',gain:1,op:0,layer:'g'}),
}; return MT; }

// ---------------------------------------------------------------- local pieces
// SCORCH: the floor burnt where fire stood. o: {life, pal, heat}
function scorch(x,y,r,o={}){ if(!F.on) return; const m=mats(), P=o.pal||PF, life=o.life||4, rot=rand(0,TAU), sd=rand(0,9), hk=o.heat??1, sp=o.spread||0;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,2.2)*hk, out=sat((1-k)/.3), rr=r*(.65+.35*i)*(1+sp*eo3(sat(t/2.6)));
    F.quad(m.sc,x,y,rr,rr,rot,{cB:'#e03a04',cC:P.s,a:.92*out,bgain:1.5*heat,gain:2.4*heat,t0:sd}); },o.delay||0); }

// CRATER: where something huge went into the floor: soot, ejecta rays, molten cracks cooling from the rim inward. o: {life, pal}
function crater(x,y,r0,o={}){ if(!F.on) return; const m=mats(), C=col(o.pal||PF), life=o.life||5, rot=rand(0,TAU), sd=rand(0,9), sp=o.spread||0;
  GFX.add(life,(k,t)=>{ const i=eo3(sat(t/.14)), heat=Math.pow(1-k,1.6), out=sat((1-k)/.25), r=r0*(1+sp*eo3(sat(t/2.6)));
    F.quad(m.crtD,x,y,r,r,rot,{a:.92*out,rv:[i*1.45,.3,0,.1]});
    F.quad(m.crtE,x,y,r,r,rot,{...C,a:Math.min(1,heat*1.5),gain:2.6*(.35+.65*heat),bgain:1.2*(.45+.55*heat),ero:.16+.5*(1-heat),rv:[i*1.45*(1.02-.4*k),.3,0,.1],t0:sd}); },o.delay||0); }

// TONGUE: one painted flame whose root sits at a point in the air and whose tip streams along a screen direction (ux right, uy down)
function tongue(x,y,z,s,ux,uy,o){ const m=mats(); F.bill(m.fire,x+ux*s*.86,y,z-uy*s*.86,s*(o.wk||.56),s,Math.atan2(ux,-uy),{pm:[4,.5,.004,0],nk:.4,ero:.12,gain:2.6,...o}); }

// the yaw the volume pieces expect for a heading given in floor units (the floor's y is already squashed)
const fdir=(dx,dy)=>Math.atan2(dy/FSY,dx);
// COMET: the look of a fire projectile - a gold ball of plasma, a real stream of fire dragged behind it, embers, its light on the floor. Reads p every frame.
function comet(p,o={}){ if(!F.on) return; const s=o.s||64, z=o.z??BODY*.6, life=p.life+.05;
  const Lt=GFX.light(p.x,p.y,s*7,PF.l,.75,.18,{hold:p.life,z}), orb=K.vorb(p.x,p.y,z,{r:s*.55,pal:PF,dur:life,in:.08,out:.04,spin:5,core:.2,heat:.7,gain:.7}), jet=K.vjet(p.x,p.y,z,fdir(-p.vx,-p.vy),{len:s*4.4,r:s*.85,r0:s*.42,dur:life,in:.12,out:.04,turb:.7,speed:8,pal:PF,heat:1.3});
  GFX.add(life,()=>{ if(p.life<=0){ Lt.hold=0; orb.dead=jet.dead=true; return; } const sp=Math.hypot(p.vx,p.vy)||1, ux=p.vx/sp, uy=p.vy/sp; Lt.x=p.x; Lt.y=p.y; orb.x=p.x; orb.y=p.y; jet.x=p.x-ux*s*.3; jet.y=p.y-uy*s*.3; jet.dir=fdir(-ux,-uy);
    if(Math.random()<.5) GFX.pt({x:p.x,y:p.y,z:z+rand(-20,20),vx:-ux*rand(60,300)+rand(-80,80),vy:-uy*rand(60,300)+rand(-50,50),vz:rand(-40,160),g:-60,drag:1,life:rand(.25,.55),s:rand(2.5,5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); }); }

// BOOMV: one fire explosion = a real fireball (volume) + a hot core that lasts two frames + the floor lit + sparks + the burn it leaves.
//  s = radius of the fireball. o: {pal, core, smoke, dur, rise, heat, zc (height of its centre), light, scorch (0 = none), life, delay}
function boomv(x,y,s,o={}){ const P=o.pal||PF, zc=o.zc??s*.28;
  K.vblast(x,y,{s,z:o.zc,pal:P,smoke:o.smoke??(s<220?.25:.6),dur:o.dur,rise:o.rise,heat:o.heat,gain:o.gain,delay:o.delay});
  after(o.delay||0,()=>{ K.flare(x,y,zc,{pal:o.core||PG,s:s*.6,dur:.12,gain:2.2}); if(o.light!==0) GFX.light(x,y,Math.min(s*3.4,1500),P.l,o.light??1,.4,{z:zc+s*.4});
    K.sparks(x,y,zc,{pal:P,n:Math.round(6+s/22),sp:[s*1.2,s*4.5],up:s*3,life:[.3,.8]}); if(o.scorch!==0) scorch(x,y,s*1.05,{life:o.life||3}); }); }
// FIREROW: fire left standing on a floor line - a row of low, fat, lumpy columns (no two the same height), lit one after another
//  o: {n, r, h, dur, pal, step (seconds between one catching and the next)}
function fireRow(x0,y0,x1,y1,o={}){ const n=o.n||4, r=o.r||85, h=o.h||280, dur=o.dur||2; for(let i=0;i<n;i++){ const u=n>1?i/(n-1):.5, k=rand(.75,1.25);
    K.vcolumn(mix(x0,x1,u)+rand(-14,14),mix(y0,y1,u)+rand(-10,10),{r:r*rand(.85,1.2),h:h*k,dur:dur-i*(o.step||0)-rand(0,.25),rise:.2,out:.6,pal:o.pal||PF,twist:rand(.8,1.6),turb:.9,taper:.52,heat:1.15,delay:(o.delay||0)+i*(o.step||0)}); } }
function launch(x,y,R,p=1){ for(const e of V.en){ if(e.dead) continue; const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy)||1; if(l>R) continue; e.stun=Math.max(e.stun||0,.6); e.flash=1; if(!e.d.heavy){ e.vz=Math.max(e.vz||0,rand(900,1600)*p); e.kx+=dx/l*rand(500,900)*p; e.ky+=dy/l*rand(350,650)*p; } } }
function fireball(x0,y0,a,d,o={}){ const sp=o.sp??1500, p={x:x0,y:y0,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:o.life??1,d,r:o.r??80,home:o.home,turn:o.turn??5,c:C1,pw:1.1};
  comet(p,{s:o.big?96:74});
  p.onHit=(e,p)=>{ p.hitAny=true; boomv(p.x,p.y,o.big?175:125,{smoke:.2,dur:.7,life:2.4}); K.dust(p.x,p.y,{n:5,r:30,sp:[160,420],a:.35}); sfx('fire',.4,.4); inCircle(p.x,p.y,o.big?220:140,q=>{ if(q!==e) dmg(q,d*.5,{kb:.8,sx:p.x,sy:p.y}); }); };
  p.onEnd=p=>{ if(!p.hitAny) boomv(p.x,p.y,95,{smoke:.3,dur:.6,life:2}); };
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

// basic: a spark is pressed into a ball at his hand, and leaves as a small comet of fire that homes and bursts
function basic(){ const e=nearest(900); if(!e) return false; const a=angTo(e); face(a); push(true); const n=1+Math.floor((L('py_basic')+1)/2), d=1500*A.mul('py_basic');
  K.vorb(pl.x+Math.cos(a)*60,pl.gy+Math.sin(a)*60,BODY*.6,{r:42,pal:PF,dur:.21,in:.18,out:.03,spin:6,core:.18,heat:.7,gain:.7}); GFX.light(pl.x+Math.cos(a)*60,pl.gy+Math.sin(a)*60,260,PG.l,.5,.22,{z:BODY*.6});
  after(.2,()=>{ const hx=pl.x+Math.cos(a)*60, hy=pl.gy+Math.sin(a)*60; K.flare(hx,hy,BODY*.6,{pal:PG,s:80,dur:.12,gain:2.4});
    for(let k=0;k<n;k++) after(k*.08,()=>fireball(hx,hy,a+(k-(n-1)/2)*.3,d,{home:e,life:1.2})); sfx('fireball',.8); });
  return true; }

const SKILL={
  // FLAME DASH (a line): he goes as a streak of gold fire; a wall of flame stands on the line he crossed, and where he stops the fire is thrown on ahead
  py_dash:{moves:true,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), Ld=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+120), d=D(id), x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*Ld, y1=y0+Math.sin(a)*Ld, T=EVO(id)?4:2, ca=Math.cos(a), sa=Math.sin(a), jd=fdir(ca,sa); face(a); push();
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:C1}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.12}; G.inv=Math.max(G.inv,.35); sfx('fire',.8,.6);
    const tp=[]; for(let i=0;i<=8;i++){ const u=i/8; tp.push({x:mix(x0,x1,u),y:mix(y0,y1,u),z:BODY*.5}); }
    // the streak: a thin gold line (the edge) inside a stream of fire (the body)
    K.trail(tp,{w:40,dur:.3,pal:PG,draw:.1,gain:1.2}); K.vjet(x0,y0,BODY*.5,jd,{len:Ld*1.1,r:95,r0:60,dur:.36,in:.1,out:.22,pal:PG,heat:1.5,turb:.5,speed:9});
    // what stays: a row of flames on the line (it stops short of where he stands), the cut it burnt into the floor
    fireRow(mix(x0,x1,.06),mix(y0,y1,.06),mix(x0,x1,.76),mix(y0,y1,.76),{n:Math.max(3,Math.round(Ld/125)),r:80,h:300,dur:T,step:.03,delay:.06}); K.gash(x0,y0,x1,y1,{pal:PF,life:T+1.2,w:96,grow:.12});
    GFX.light((x0+x1)/2,(y0+y1)/2,Math.max(520,Ld*1.2),PF.l,1,.5,{hold:T-.4,z:120,flick:.2});
    K.vsmoke(x0,y0,{s:130,dur:.9,a:.36,rise:120}); K.dust(x0,y0,{n:8,dir:a+PI,spread:.7,sp:[220,620],a:.4}); K.debris((x0+x1)/2,(y0+y1)/2,{n:6,r:Ld*.4,sp:[150,600],up:900,size0:6,size:16});
    K.vsmoke((x0+x1)/2,(y0+y1)/2,{s:170,z:120,dur:1.3,a:.5,rise:220,delay:T-.55});
    after(.1,()=>{ K.vjet(x1+ca*40,y1+sa*40,70,jd,{len:320,r:170,r0:40,dur:.42,in:.06,out:.26,pal:PF,heat:1.4,turb:.8}); K.flare(x1+ca*30,y1+sa*30,BODY*.5,{pal:PG,s:150,dur:.12,gain:2.2}); GFX.light(x1,y1,520,PG.l,.9,.3,{z:120});
      scorch(x1+ca*120,y1+sa*120,190,{life:T+.8}); K.upheave(x1,y1,{r:110,n:5,s:130,a0:a-1.1,a1:a+1.1,pal:PF,dur:1}); K.sparks(x1,y1,BODY*.5,{pal:PF,n:16,dir:a,spread:.9,sp:[400,1500],up:500}); hitstop=Math.max(hitstop,.04); trauma=Math.min(1,trauma+.2); });
    V.zones.push({x:(x0+x1)/2,y:(y0+y1)/2,r:0,life:T,tick:.3,onTick:()=>inLine(x0,y0,x1,y1,70,o=>{ dmg(o,d*.35,{kb:.2}); hitFx(o,C1,.8); })});
    after(.06,()=>inLine(x0,y0,x1,y1,80,o=>{ dmg(o,d,{kb:.8,sx:x0,sy:y0}); hitFx(o,C1,1.1); })); }},
  // FIRE PILLAR (vertical): the floor under three of them draws to a hot point, then a twisting column of fire stands up through each and leaves as smoke from its top
  py_pillar:{fn(id){ const T=onScreen(-60); if(!T.length) return false; const n=EVO(id)?5:3, d=D(id); push(); sfx('fire',.9,.6);
    T.sort(()=>Math.random()-.5).slice(0,n).forEach((e,i)=>after(.15+i*.1,()=>{ const x=e.x, y=e.y, h=rand(860,1080);
      K.shock(x,y,{r0:190,r:36,dur:.16,pal:PF,gain:.7,light:0,dust:0,haze:0,th:.6}); GFX.light(x,y,360,PF.l,.7,.2); K.vorb(x,y,26,{r:50,pal:PF,dur:.17,in:.14,out:.03,spin:5,core:.18,heat:.7,gain:.7});
      after(.15,()=>{ K.vcolumn(x,y,{r:92,h,dur:.95,rise:.12,out:.42,pal:PF,twist:2.8,turb:.55,taper:.45,heat:1.3}); K.pillar(x,y,{r:26,h:h*.9,dur:.24,pal:PG,gain:.6}); K.flare(x,y,40,{pal:PG,s:150,dur:.12,gain:2.2});
        K.vring(x,y,{r:250,dur:.5,a:.75}); K.vsmoke(x,y,{s:170,z:h*.62,dur:1.1,delay:.55,a:.36,rise:280});
        GFX.light(x,y,620,PF.l,1,.25,{hold:.5,z:260,flick:.2}); scorch(x,y,170,{life:3}); K.upheave(x,y,{r:90,n:4,s:120,a0:PI*1.05,a1:PI*1.95,pal:PF,dur:.9}); K.debris(x,y,{n:5,r:50,sp:[200,600],up:1100,size0:6,size:16}); K.sparks(x,y,20,{pal:PF,n:14,sp:[150,600],up:1900,life:[.3,.8]});
        trauma=Math.min(1,trauma+.15); hitstop=Math.max(hitstop,.04); sfx('fire',.5,.5);
        inCircle(x,y,150,o=>{ dmg(o,d,{kb:.3,launch:1200,stun:.7,sx:x,sy:y}); hitFx(o,C1,1.2); }); }); })); }},
  // FLAME RING (outward, low): a rolling torus of fire leaves him in every direction, cooling to smoke as it goes; its edge is left smouldering
  py_ring:{fn(id){ if(countIn(480)<4&&!nearest(250)) return false; const d=D(id); raise();
    K.shock(pl.x,pl.gy,{r0:300,r:60,dur:.2,pal:PF,gain:.5,light:0,dust:0,painted:0,haze:.5,th:.6});
    const wave=k=>{ const x=pl.x, y=pl.gy; K.vring(x,y,{r:k?660:620,r0:100,dur:.62,heat:1.7,pal:k?PD:PF,tube:.125}); GFX.ripple(x,y,640,{life:.45,s:.6});
      K.art(x,y,{tex:'v3_spin_ring',floor:true,s:330,dur:.3,pal:PG,gain:.8,hold:.2,s0:.35,rot:rand(0,TAU)}); K.sparks(x,y,40,{pal:PF,n:18,sp:[500,1500],up:420,life:[.25,.55]}); GFX.light(x,y,1000,PF.l,1,.5,{z:140}); sfx('fire',1,.8);
      trauma=Math.min(1,trauma+.3); hitstop=Math.max(hitstop,.04);
      if(!k){ K.upheave(x,y,{r:300,n:6,s:120,a0:PI*1.05,a1:PI*1.95,pal:PF,dur:.9,delay:.12}); K.embers(x,y,520,{pal:PF,n:22,life:1.5}); for(let q=0;q<7;q++){ const b=q/7*TAU+rand(0,.8); scorch(x+Math.cos(b)*rand(440,540),y+Math.sin(b)*rand(440,540)*FSY,rand(90,140),{life:2.2,delay:.32,heat:1.4}); } }
      [0,.1,.2,.3].forEach((t,i)=>after(t,()=>{ const r=160+i*120; inCircle(pl.x,pl.gy,r,o=>{ if((o.ringT||0)>RT) return; o.ringT=RT+.5; dmg(o,d*(k?.6:1),{kb:1.2}); hitFx(o,C1,1.1); }); })); };
    after(.2,()=>wave(0)); if(EVO(id)) after(.75,()=>wave(1)); }},
  // EXPLOSION (one beat, a ball): a ball of gold plasma is pressed small over the crowd and sinks - then one fireball that turns to a rising head of black smoke
  py_boom:{fn(id){ const t=densest(800); if(!t) return false; const d=D(id), x=t.x, y=t.y; face(angTo(t)); push(); sfx('fireball',1.2);
    K.shock(x,y,{r0:470,r:40,dur:.34,pal:PF,gain:.75,light:0,dust:0,th:.7}); const Lt=GFX.light(x,y,520,PG.l,.3,.1,{hold:.3,z:200});
    const orb=K.vorb(x,y,280,{r:170,pal:PF,dur:.36,in:.06,out:.03,spin:4,core:.16,heat:.75,gain:.75}); GFX.add(.35,k=>{ orb.r=mix(170,44,k*k); orb.z=mix(280,110,k*k); Lt.a=.3+.7*k; });
    for(let i=0;i<22;i++) after(i*.012,()=>{ const b=rand(0,TAU), r=rand(260,520); GFX.pt({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*FSY,z:rand(0,400),tx:x,ty:y,tz:160,pull:rand(7,10),life:rand(.2,.32),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PG.h:PF.s),c2:PF.b,L:3}); });
    after(.35,()=>{ boomv(x,y,420,{smoke:.45,dur:1.45,rise:560,heat:1.25,core:PB,life:4.5});
      K.crack(x,y,{alt:1,r:340,pal:PF,life:3.2,grow:.12}); K.debris(x,y,{n:12,r:110,sp:[300,1100],up:1700,size0:8,size:24}); K.dust(x,y,{n:12,r:120,sp:[400,1000],a:.45}); K.embers(x,y,300,{pal:PF,n:16,life:1.6}); GFX.ripple(x,y,620,{life:.4,s:.7});
      trauma=Math.min(1.2,trauma+.6); hitstop=Math.max(hitstop,.07); sfx('boom',1.6,1);
      inCircle(x,y,330,o=>{ dmg(o,d,{kb:1.8,big:true,launch:700,sx:x,sy:y}); hitFx(o,C1,1.4); });
      if(EVO(id)) for(let i=0;i<5;i++) after(.15+i*.1,()=>{ const b=rand(0,TAU), r=rand(150,380), bx=x+Math.cos(b)*r, by=y+Math.sin(b)*r*.75; boomv(bx,by,150,{smoke:.4,dur:.7,light:.6}); inCircle(bx,by,160,o=>dmg(o,d*.4,{kb:.8,sx:bx,sy:by})); }); }); }},
  // FIRE RAIN (falling): burning rocks come down out of the sky on a slant, each dragging a stream of fire, each shadow closing under it
  py_rain:{fn(id){ const T=onScreen(-40); if(!T.length) return false; const n=EVO(id)?12:8, d=D(id); raise(); sfx('fireball',1);
    for(let i=0;i<n;i++) after(.3+i*.1,()=>{ const e=T[(Math.random()*T.length)|0], x=e?e.x+rand(-60,60):pl.x+rand(-500,500), y=e?e.y+rand(-40,40):pl.gy+rand(-400,400), h0=1500, vx=-520;
      const Lt=GFX.light(x,y,300,PF.l,.3,.1,{hold:.3,z:60});
      K.drop(x,y,{img:'meteor',s:70,h0,dur:.35,vx,rot:rand(0,TAU),tint:'#ffd8a8',gain:1.4,land:()=>{ boomv(x,y,200,{smoke:.55,dur:.8,rise:230}); K.dust(x,y,{n:6,r:40,sp:[220,560],a:.4}); K.debris(x,y,{n:4,r:40,sp:[200,700],up:900,size0:6,size:14}); trauma=Math.min(1,trauma+.18); sfx('boom',.9,.5); inCircle(x,y,190,o=>{ dmg(o,d,{kb:1,launch:400,sx:x,sy:y}); hitFx(o,C1,1.1); }); }});
      // the fire it drags: a stream pointing back up the way it came, and the shadow that closes on the mark
      if(F.on){ const km=K.mats(), pt=Math.atan2(h0,-vx), jet=K.vjet(x+vx,y,h0,PI,{len:620,r:120,r0:46,pitch:pt,dur:.36,in:.08,out:.03,pal:PF,heat:1.4,turb:.7,speed:9}), orb=K.vorb(x+vx,y,h0,{r:50,pal:PF,dur:.36,in:.05,out:.02,spin:6,core:.2,heat:.8,gain:.7});
        GFX.add(.35,k=>{ const q=k*k, z=h0*(1-q)+70, px=x+vx*(1-q); jet.x=orb.x=px; jet.z=orb.z=z; Lt.a=.3+.7*q; Lt.r=300+260*q; F.quad(km.dark,x,y,mix(230,90,q),mix(230,90,q),0,{a:.25+.5*q}); }); } }); }},
  // FLAME THROWER (a direction, sustained): two seconds of a real stream of fire from his hand - a gold-white heart inside a red-orange body that breaks up at its far end
  py_breath:{fn(id){ const e=nearest(520); if(!e) return false; const flat=b=>{ const c=Math.cos(b)>=0?0:Math.PI, d=Math.atan2(Math.sin(b-c),Math.cos(b-c)); return c+clamp(d,-.6,.6); }; let a=flat(angTo(e)); const d=D(id), R=EVO(id)?640:520, half=EVO(id)?.55:.42; face(a);
    S([['gb03',.05],['gb05',.05],['gb06',2,{kick:[1.2,-1]}],['gb10',.08],['gb12',.06]]); sfx('fire',2,.8);
    if(F.on){ const km=K.mats(), C=col(PF), CG=col(PG), dur=2, Lt=GFX.light(pl.x,pl.gy,R*1.3,PF.l,.95,.3,{hold:dur,z:90,flick:.25}), rad=R*Math.tan(half)*.6, jd0=fdir(Math.cos(a),Math.sin(a));
      const jet=K.vjet(pl.x,pl.gy,BODY*.55,jd0,{len:R*1.14,r:rad,r0:24,dur:dur+.25,in:.22,out:.3,pal:PF,turb:.75,speed:7,heat:1.25}), core=K.vjet(pl.x,pl.gy,BODY*.55,jd0,{len:R*.62,r:rad*.36,r0:16,dur:dur+.2,in:.18,out:.25,pal:PG,turb:.45,speed:11,heat:1.7});
      K.flare(pl.x+pl.f*50,pl.gy,BODY*.55,{pal:PG,s:120,dur:.14,gain:2.2});
      GFX.add(dur+.25,(k,t)=>{ const i=eo3(sat(t/.22)), out=sat((dur+.25-t)/.25), J=pl.j, ox=J&&J.rh?J.rh[0]:pl.x+pl.f*50, z=J&&J.rh?Math.max(40,pl.gy-J.rh[1]):BODY*.55, ca=Math.cos(a), sa=Math.sin(a), mx=pl.x+ca*R*.55, my=pl.gy+sa*R*.55, jd=fdir(ca,sa);
        jet.x=core.x=ox+ca*20; jet.y=core.y=pl.gy+sa*20; jet.z=core.z=z; jet.dir=core.dir=jd; jet.pitch=-.05;
        Lt.x=mx; Lt.y=my; F.quad(km.glowG,mx,my,R*.7,R*.55,0,{...C,a:.3*out*i,gain:1}); F.bill(km.glowO,ox,pl.gy,z,56,56,0,{...CG,a:out,gain:2.6});
        if(out>=1) for(let q=0;q<2;q++){ const b=a+rand(-half,half)*.8, sp=rand(700,1300); GFX.pt({x:ox,y:pl.gy,z:z+rand(-10,10),vx:Math.cos(b)*sp,vy:Math.sin(b)*sp,vz:rand(-40,200),g:-120,drag:1.5,life:rand(.3,.6),s:rand(2.5,5),m:3,len:.04,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } });
      // when it stops: the far end is left as a roll of smoke
      after(dur,()=>K.vsmoke(pl.x+Math.cos(a)*R*.8,pl.gy+Math.sin(a)*R*.8,{s:190,z:60,dur:1.3,a:.5,rise:260})); }
    V.zones.push({follow:true,r:0,life:2,tick:.1,onTick:()=>{ const t=nearest(R+60); if(t){ const b=flat(angTo(t)); a+=Math.atan2(Math.sin(b-a),Math.cos(b-a))*.25; face(a); }
      if(Math.random()<.3){ const b=a+rand(-half,half)*.7, r=rand(.5,.95)*R; scorch(pl.x+Math.cos(b)*r,pl.gy+Math.sin(b)*r,rand(70,110),{life:1.8}); }
      inSector(pl.x,pl.gy,a,R,half,o=>{ dmg(o,d,{kb:.3}); hitFx(o,C1,.8); }); }}); }},
  // FIRE TORNADO (moving, pulling): hollow whirls of fire - no two alike - that hunt for four seconds, drawing embers in at their feet
  py_tornado:{fn(id){ if(V.zones.some(z=>z.pyt)||countIn(800)<3) return false; const n=EVO(id)?3:2, d=D(id); raise(); sfx('fire',1.6,.7);
    const VR=[{r:200,h:660,spin:8,sway:.12,pal:PF,th:.16},{r:250,h:520,spin:5.5,sway:.07,pal:PD,th:.2},{r:175,h:760,spin:9.5,sway:.15,pal:PG,th:.15}];
    for(let k=0;k<n;k++){ const a=k/n*TAU+rand(0,1), z={pyt:true,x:pl.x+Math.cos(a)*200,y:pl.gy+Math.sin(a)*160,r:170,life:4,tick:.2}, v=VR[k];
      z.px=z.x; z.py=z.y; const w=K.vfunnel(z.x,z.y,{r:v.r,r0:34,h:v.h,dur:4.05,rise:.4,out:.3,spin:v.spin,sway:v.sway,pal:v.pal,thick:v.th}), Lt=GFX.light(z.x,z.y,640,v.pal.l,.85,.3,{hold:3.75,z:150,flick:.18});
      K.vring(z.x,z.y,{r:270,dur:.45,a:.7}); K.flare(z.x,z.y,30,{pal:PG,s:110,dur:.14,gain:2}); let sc=0;
      GFX.add(4,(kk,t)=>{ const u=sat((z.acc||0)/z.tick), wx=mix(z.px,z.x,u), wy=mix(z.py,z.y,u); w.x=wx; w.y=wy; Lt.x=wx; Lt.y=wy;
        // embers and dust drawn in round its foot and carried up
        if(Math.random()<.6*(GFX.QK||1)){ const b=rand(0,TAU), rr=rand(180,330); GFX.pt({x:wx+Math.cos(b)*rr,y:wy+Math.sin(b)*rr*FSY,z:rand(4,60),tx:wx,ty:wy,tz:v.h*.7,pull:rand(1.6,2.6),vx:-Math.sin(b)*rand(500,800),vy:Math.cos(b)*rand(300,480),life:rand(.45,.8),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } });
      z.fn=o=>{ dmg(o,d,{kb:.6,stun:.2,sx:z.x,sy:z.y}); hitFx(o,C1,.9); o.pull={x:z.x,y:z.y,s:260}; };
      z.onTick=z=>{ z.px=z.x; z.py=z.y; const t=V.en.filter(o=>!o.dead).sort((p,q)=>Math.hypot(p.x-z.x,p.y-z.y)-Math.hypot(q.x-z.x,q.y-z.y))[0];
        if(t){ const b=Math.atan2(t.y-z.y,t.x-z.x); z.x+=Math.cos(b)*70; z.y+=Math.sin(b)*70; } const hx=z.x-pl.x, hy=z.y-pl.gy, hl=Math.hypot(hx,hy); if(hl>420){ z.x=pl.x+hx/hl*420; z.y=pl.gy+hy/hl*420; }
        if((sc^=1)) scorch(z.x,z.y,150,{life:2.6}); };
      // it unwinds: the fire goes out of it from the foot and what is left rises as smoke
      z.onEnd=z=>{ w.dead=true; Lt.hold=0; K.vsmoke(z.x,z.y,{s:200,z:v.h*.35,dur:1.3,a:.36,rise:320}); K.sparks(z.x,z.y,v.h*.3,{pal:PF,n:14,sp:[200,900],up:900,life:[.3,.7]}); K.embers(z.x,z.y,200,{pal:PF,n:8,life:1.4}); };
      V.zones.push(z); } }},
  // SUPERNOVA (a star): a small sun swells over his head, is crushed to a point - and its fire leaves along the floor as spokes, each bursting where it ends
  py_nova:{fn(id){ const R=EVO(id)?720:560; if(countIn(R)<8) return false; const d=D(id);
    S([['gy01',.1],['gy02',.15],['gy03',.4,{kick:[-.8,.6]}],['gy07',.1,{kick:[-1.4,1]}],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.3],['gy14',.15]]); sfx('rise',1.2,.7);
    const x=pl.x, y=pl.gy, zs=BODY*2;
    for(let i=0;i<34;i++) after(i*.018,()=>{ const b=rand(0,TAU), r=rand(300,640); GFX.pt({x:x+Math.cos(b)*r,y:y+Math.sin(b)*r*FSY,z:rand(0,300),tx:x,ty:y,tz:zs,pull:rand(5,8),vx:-Math.sin(b)*400,vy:Math.cos(b)*240,life:rand(.35,.55),s:rand(2.5,5),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
    for(let i=0;i<2;i++) K.shock(x,y,{r0:R*(.9-i*.25),r:50,dur:.36,delay:i*.3,pal:PF,gain:.55,light:0,dust:0,haze:.4,th:.6});
    if(F.on){ const km=K.mats(), Lt=GFX.light(x,y,700,PG.l,.2,.2,{hold:.75,z:zs}), orb=K.vorb(x,y,zs,{r:40,pal:PF,dur:.77,in:.1,out:.02,spin:3,core:.15,heat:.75,gain:.75}); GFX.ambient(.62,.56,.6,4);
      GFX.add(.75,(k,t)=>{ const e=k*k; orb.r=k<.8?mix(40,165,eo3(k/.8)):mix(165,50,((k-.8)/.2)**2); orb.z=zs-(k>.8?(k-.8)/.2*BODY*.9:0); Lt.a=.3+.9*e; F.quad(km.glowG,x,y,260*e+60,260*e+60,0,{...col(PF),a:.8*e,gain:1.4}); }); }
    after(.75,()=>{ const n=EVO(id)?9:7, a0=rand(0,TAU); K.flare(x,y,BODY*1.1,{pal:PB,s:280,dur:.16,gain:2.4}); K.art(x,y,{tex:'v3_xburst',s:R*.7,z:BODY*.6,dur:.2,pal:PG,gain:1,hold:.15,s0:.5});
      for(let i=0;i<n;i++){ const b=a0+(i+rand(-.22,.22))/n*TAU, len=R*rand(.72,1.02), cb=Math.cos(b), sb=Math.sin(b)*FSY, tx=x+cb*len, ty=y+sb*len;
        K.vjet(x+cb*90,y+sb*90,64,b,{len:len-40,r:rand(80,105),r0:40,dur:.62,in:.12,out:.34,pal:i%3?PF:PG,heat:1.5,turb:.7,speed:10});
        K.vblast(tx,ty,{s:rand(105,140),pal:PF,smoke:.12,dur:.7,rise:160,delay:.13}); scorch(tx,ty,rand(130,170),{life:3.4,delay:.13}); K.gash(x+cb*110,y+sb*110,tx,ty,{pal:PF,life:2.6,w:70,grow:.1}); }
      K.shock(x,y,{r:R*1.3,dur:.55,pal:PF,gain:.6,light:0,thick:0}); GFX.ripple(x,y,R*1.4,{life:.5,s:.8}); GFX.light(x,y,R*2,PG.l,1.1,.5,{z:260});
      K.debris(x,y,{n:14,r:120,sp:[300,1100],up:1500,size:20}); K.sparks(x,y,BODY,{pal:PG,n:30,sp:[600,2000],up:700,life:[.3,.7]}); K.embers(x,y,R*.8,{pal:PF,n:26,life:2}); K.crack(x,y,{r:R*.45,pal:PF,life:3.6,grow:.12});
      GFX.ambient(1,1,1,2.5); post.ca=.01; trauma=1.3; hitstop=.07; sfx('boom',2.2,1);
      inCircle(pl.x,pl.gy,R,o=>{ dmg(o,d,{kb:2.2,big:true,launch:900}); hitFx(o,C1,1.5); }); }); }},
};

/// ---- ultimates. Each is one staged sequence in the real field: omen -> release -> development -> climax -> afterglow
// FIRE STORM: (close) a cold circle writes itself; four flames light on its rim, each twists up into a small whirl, the circle turns
// to gold. (wide) It catches: four hollow whirls of fire - no two alike - walk out across the field, burning what they cross, while the
// ground erupts between them. Behind him one great whirl winds itself up out of the floor and grows until it fills the sky; the four
// come home into it. The field dims, the great whirl draws in - and lets go: a column of gold fire through its heart, a fireball
// in the sky above it, and a rolling wall of fire racing outward over the floor. What stays is the burn and the smoke.
function ultStorm(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=60000*A.mul(id), x0=pl.x, y0=pl.gy, RM=Math.max(hw,hh)*.68, g0=GFX.gain, NW=4, KX=Math.min(1,hw*1.02/RM), KY=1, MY=y0-430;
  S([['gx01',.1],['gx03',1.5,{kick:[-.8,.6]}],['gx06',.14,{kick:[2,-1.6]}],['gx07',1.9],['gx09',.4],['gx12',.14,{kick:[2,-1.6]}],['gx14',9]]);
  // ---- omen (close): something changes every quarter second - the circle grows, flames light, each twists up, the circle turns gold
  GFX.ambient(.3,.32,.46,3.5); const spot=GFX.light(x0,y0,540,'#ff6a1c',.75,.5,{hold:9,z:120,flick:.15});
  const sig=K.sigil(x0,y0,{r:hw*.16,dur:4.5,in:.5,out:.3,spin:.5,pal:PS,tex:CIRC(),hole:.14});
  K.crack(x0,y0,{alt:1,r:330,pal:PF,life:5,grow:1.6});
  Cn.tilt(.1,3); Cn.zoom(1.4); Cn.cam(x0,y0-BODY,5); SFX.fire(5,.6); Cn.drone(44,.3); Cn.SND.inhale(1.2,.4);
  for(let i=0;i<3;i++) after(.15+i*.38,()=>K.shock(x0,y0,{r0:hw*(.9-i*.12),r:70,dur:.4,pal:i?PF:PS,gain:.45,light:0,dust:0,painted:0,haze:.5,th:.6}));
  for(let i=0;i<50;i++) after(rand(0,1.6),()=>{ const a=rand(0,TAU), d=rand(380,860); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,360),tx:x0,ty:y0,tz:BODY*.9,pull:rand(4,6.5),life:rand(.45,.7),s:rand(2.5,5),m:3,len:.05,vx:-Math.sin(a)*560,vy:Math.cos(a)*330,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); });
  const tor=[], VAR=[{h:900,r:210,r0:36,spin:8.5,sway:.14,pal:PF,th:.16},{h:540,r:310,r0:80,spin:5,sway:.06,pal:PD,th:.21},{h:760,r:240,r0:50,spin:7,sway:.1,pal:PF,th:.15},{h:640,r:270,r0:60,spin:9.5,sway:.16,pal:PG,th:.18}]; let t=0, out=false, home=0, done=false;
  const RC=hw*.3;
  for(let k=0;k<NW;k++){ const a=k/NW*TAU+.4, z={a,x:x0+Math.cos(a)*110*KX,y:y0+Math.sin(a)*110*KY,R0:110,sc:rand(0,.1),n:k,s1:[1.3,1.1,1.2,1.15][k],v:VAR[k],path:[],w:null,L:null,cx:x0+Math.cos(a)*RC,cy:y0+Math.sin(a)*RC*FSY}, v=z.v; tor.push(z); const tl=.3+k*.24;
    after(tl,()=>{ K.flame(z.cx,z.cy,{s:170,dur:1.22-tl+.2,pal:PF,light:0}); K.sparks(z.cx,z.cy,20,{pal:PF,n:8,sp:[100,420],up:800,life:[.2,.5]}); GFX.light(z.cx,z.cy,380,PF.l,.75,.4); K.shock(z.cx,z.cy,{r:130,dur:.25,pal:PF,gain:.5,light:0,dust:0,haze:0}); if(sig.kick) sig.kick(); Cn.SND.tick(1+k*.1,.25); });
    after(1.18+k*.07,()=>{ K.vfunnel(z.cx,z.cy,{r:v.r*.4,r0:v.r0*.5,h:v.h*.42,dur:.82-k*.07,rise:.3,out:.16,spin:v.spin*1.3,sway:v.sway,pal:v.pal,thick:v.th}); K.sparks(z.cx,z.cy,30,{pal:PF,n:6,sp:[200,600],up:900}); }); }
  after(1.0,()=>{ sig.pal=PG; if(sig.kick) sig.kick(); GFX.light(x0,y0,600,PG.l,.7,.4,{z:100}); });
  after(1.4,()=>{ Cn.zoom(1.55); if(sig.kick) sig.kick(); });
  V.ultTick=dt=>{ t+=dt; sig.r=hw*lerp(.16,.3,easeOut(Math.min(1,t/1.5))); if(!out) return;
    for(const z of tor){ z.a+=dt*(home?2.6:1.25); const R=home?lerp(z.R0,0,Math.min(1,(t-home)/.5)**2):lerp(110,RM,easeOut(Math.min(1,(t-1.9)/1.1))); if(!home) z.R0=R; z.x=x0+Math.cos(z.a)*R*KX; z.y=y0+Math.sin(z.a)*R*KY;
      // each whirl grows as it walks out; one passing on the near side of him is kept low so it never stands over him
      if(z.w){ const g=.45+.55*sat((R-110)/520), fr=Math.max(0,Math.sin(z.a)); z.w.x=z.x; z.w.y=z.y; z.w.r=z.v.r*z.s1*g; z.w.h=z.v.h*z.s1*g*(1-.42*fr); if(z.L){ z.L.x=z.x; z.L.y=z.y; }
        if(home){ const hk=Math.min(1,(t-home)/.5); z.w.a=1-.8*hk; z.w.y=z.y+(MY-y0)*hk*hk; z.w.h*=1-.5*hk; } }
      // four whirls carry what six did: the same number of burns a second over the field
      if(Math.random()<.45) inCircle(z.x,z.y,210,o=>ultHit(o,Dm*.12,z.x,z.y));
      // the scar it leaves: its width wanders; here and there a patch of floor is left burning until the storm lets go
      if((z.sc+=dt)>.11&&!home){ z.sc=0; const q=z.path.length; z.path.push({x:z.x+rand(-14,14),y:z.y+rand(-10,10),t,w:mix(30,112,.5+.5*Math.sin(q*1.25+z.n*2.1))*rand(.8,1.2)});
        if(Math.random()<.3) scorch(z.x+rand(-70,70),z.y+rand(-50,50),rand(140,220),{life:Math.max(.6,4.8-t),heat:1.5}); } } };
  if(F.on){ const m=mats(); GFX.add(6.3,(k,tt)=>{ if(!tor[0].path.length) return; const heat=t<4.42?.8:Math.max(.08,.8-(t-4.42)/.5), fade=sat(1-(t-4.42)/.4); if(fade<=0) return;
      for(const z of tor) if(z.path.length>1) F.ribbon(m.arm,z.path,{cB:'#b02804',cC:PF.s,a:.8*fade,bgain:1.3*heat,gain:2*heat,t0:z.n}); },1.82); }
  // ---- release (wide): the circle catches, the four whirls leave the rim and walk out
  after(1.82,()=>{ out=true; sig.pal=PF; sig.a=.55; if(sig.kick) sig.kick(); spot.hold=0; spot.life=.3; Cn.tilt(.2,5); Cn.zoom(.68); Cn.cam(null); Cn.shake(.8); post.ca=.01; hitstop=Math.max(hitstop,.05); SFX.boom(1.4,.5); Cn.SND.shing(.7,.4);
    GFX.ambient(.42,.35,.38,30); after(.14,()=>GFX.ambient(.3,.31,.44,5));
    K.shock(x0,y0,{r:hw*1.3,dur:.55,pal:PF,gain:.75,light:.7}); GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7});
    K.vring(x0,y0,{r:520,r0:90,dur:.5,heat:1.4,pal:PF,tube:.14}); K.sparks(x0,y0,BODY*.6,{pal:PF,n:36,sp:[500,1900],up:900}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); K.debris(x0,y0,{n:10,r:120,sp:[200,800],up:1000});
    for(const z of tor){ const v=z.v; z.w=K.vfunnel(z.x,z.y,{r:v.r*z.s1*.45,r0:v.r0,h:v.h*z.s1*.45,dur:2.62,rise:.4,out:.2,spin:v.spin,sway:v.sway,pal:v.pal,thick:v.th}); if(!(z.n&1)) z.L=GFX.light(z.x,z.y,760,v.pal.l,.85,.3,{hold:2.3,z:180,flick:.18}); } });
  // ---- development: the field erupts between the whirls - real fireballs, each leaving its smoke (never on top of him)
  for(let i=0;i<16;i++) after(2.1+i*.1,()=>{ let x=x0+rand(-hw,hw)*.9; const y=y0+rand(-hh,hh)*.85, sz=rand(.75,1.3); if(Math.abs(x-x0)<320&&Math.abs(y-y0)<240) x+=x<x0?-360:360;
    boomv(x,y,200*sz,{pal:i%3?PF:PD,smoke:.5,dur:.78,rise:240,light:i%2?0:.9,scorch:i%4?0:1,life:2.2});
    sfx('boom',.8,.4); Cn.shake(.3); inCircle(x,y,200,o=>ultHit(o,Dm*.3,x,y)); });
  // ---- behind him the great whirl winds itself up out of the floor: narrow and low at first, then it opens until its mouth is wider than the field
  let big=null, bigL=null;
  after(3.3,()=>{ big=K.vfunnel(x0,MY,{r:160,r0:110,h:420,dur:1.14,rise:.45,out:.02,spin:6.5,sway:.04,pal:PF,thick:.13,streak:.85}); bigL=GFX.light(x0,MY,900,PF.l,.3,.3,{hold:1.1,z:420,flick:.15});
    SFX.whoosh(.6,1); K.vring(x0,MY,{r:560,dur:.7,a:.7}); K.sparks(x0,MY,40,{pal:PF,n:20,sp:[300,1200],up:1600});
    GFX.add(1.12,(k,tt)=>{ const g=eo3(sat(tt/.85)), c=sat((tt-.97)/.15); big.r=mix(160,hw*.42,g)*(1-.3*c*c); big.h=mix(420,1300,g)*(1+.1*c); bigL.a=.3+.8*g; bigL.r=900+hw*.5*g;
      if(Math.random()<.8*(GFX.QK||1)){ const b=rand(0,TAU), rr=rand(300,700); GFX.pt({x:x0+Math.cos(b)*rr,y:MY+Math.sin(b)*rr*FSY,z:rand(4,80),tx:x0,ty:MY,tz:900,pull:rand(1.6,2.6),vx:-Math.sin(b)*rand(900,1400),vy:Math.cos(b)*rand(520,800),life:rand(.45,.8),s:rand(3,6),m:3,len:.05,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),c2:PF.b,L:3}); } }); });
  // ---- the four come home into it (this is the announcement: .67 s before it lets go)
  after(3.75,()=>{ home=t; Cn.tilt(.28,4); Cn.zoom(.7); Cn.SND.inhale(.5,.7); GFX.ambient(.3,.3,.4,8); sig.a=.6;
    for(const z of tor) if(z.L){ z.L.hold=0; z.L=null; }
    for(let i=0;i<2;i++) K.shock(x0,MY,{r0:hw*(1.3-i*.3),r:90,dur:.42,delay:i*.16,pal:PF,gain:.6,light:0,dust:0,painted:0,haze:.6,th:.7}); });
  after(4.1,()=>{ Cn.shake(.5); K.dust(x0,MY,{n:12,r:200,sp:[300,800],a:.5}); });
  // ---- it draws in (.15 s): the field dims, the great whirl narrows, the air is pulled to it
  after(4.27,()=>{ GFX.gain=.6; GFX.ambient(.3,.3,.36,40); if(sig.kick) sig.kick();
    for(let i=0;i<2;i++) K.shock(x0,MY,{r0:hw*(.9-i*.25),r:70,dur:.15,delay:i*.04,pal:PG,gain:.7,light:0,dust:0,painted:0,haze:.7,th:.8});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(300,900); GFX.pt({x:x0+Math.cos(a)*d,y:MY+Math.sin(a)*d*FSY,z:rand(0,500),tx:x0,ty:MY,tz:300,pull:rand(9,14),life:rand(.14,.2),s:rand(3,6),m:3,len:.06,c:GFX.rgb(Math.random()<.5?PG.h:PF.s),c2:PF.b,L:3}); } });
  after(4.36,()=>{ hitstop=Math.max(hitstop,.06); });
  // ---- contact: one frame - the whirl is gone; a column of gold fire stands through where its heart was, a fireball opens in the sky
  // above it, and ONE rolling wall of fire leaves it over the floor; the floor breaks, slabs fly, everything near is thrown into the air
  after(4.42,()=>{ out=false; GFX.gain=g0; for(const z of tor) if(z.w) z.w.dead=true; if(big) big.dead=true; sig.dead=true;
    hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.58); SFX.boom(2.2,1); Cn.SND.hit(1);
    GFX.ambient(.44,.36,.37,40); after(.18,()=>GFX.ambient(.36,.32,.38,3));
    K.flare(x0,MY,700,{pal:PB,s:340,dur:.2,gain:2.4}); K.pillar(x0,MY,{r:60,h:2200,dur:.3,pal:PG,gain:.7});
    K.vcolumn(x0,MY,{r:300,h:2300,dur:1.05,rise:.08,out:.55,pal:PG,twist:3.2,turb:.5,taper:.35,heat:1.6});
    K.vblast(x0,MY,{s:540,z:640,pal:PF,smoke:.5,dur:1.3,rise:420,heat:1.3,delay:.06});
    K.vring(x0,MY,{r:hw*1.45,r0:hw*.1,dur:.85,heat:1.7,pal:PF,tube:.115}); K.vring(x0,MY,{r:hw*1.6,r0:hw*.25,dur:.95,delay:.2,a:.45,tube:.08});
    after(.05,()=>Cn.shake(1)); after(.1,()=>Cn.shake(.9));
    K.flip(x0,MY,{tex:'v3_flip_shock',floor:true,s:hw*.98,dur:.6,pal:PG}); GFX.ripple(x0,MY,hw*2,{life:.55,s:.9});
    K.crack(x0,MY,{r:hw*.3,pal:PF,life:3,grow:.15,gain:.7});
    K.debris(x0,MY,{n:34,r:200,sp:[400,1700],up:2000,size0:14,size:36}); K.dust(x0,MY,{n:20,r:140,sp:[600,1500],a:.5}); K.sparks(x0,MY,400,{pal:PG,n:50,sp:[700,2600],up:2200,life:[.4,1]}); GFX.light(x0,MY,hw*1.6,PF.l,1.15,.5,{z:300});
    launch(x0,y0,hw*1.3,1); after(.3,()=>Cn.sweep(x0,y0,Dm,{speed:3200,push:1.3})); });
  // ---- aftermath, in layers that end at different times: the burn under the column keeps spreading and cools; the smoke of the
  // fireball climbs; a few rolls of smoke where the wall of fire stopped; embers; rubble
  after(4.5,()=>{ scorch(x0,MY,hw*.24,{life:4.6,heat:1.2,spread:.3}); K.vsmoke(x0,MY,{s:380,z:300,dur:1.6,delay:.75,a:.4,rise:700}); });
  after(4.8,()=>{ for(let i=0;i<3;i++){ const b=PI*(1.15+i*.35)+rand(-.2,.2), r=hw*rand(.7,.95); K.vsmoke(x0+Math.cos(b)*r,MY+Math.sin(b)*r*FSY,{s:rand(260,340),z:40,dur:rand(1.3,1.7),delay:i*.1,a:.5,rise:240}); }
    K.embers(x0,MY,hw*.9,{pal:PF,n:50,life:2.6,up:300}); K.debris(x0,MY,{n:10,r:hw*.5,sp:[60,260],up:500,size0:8,size:20}); });
  after(4.95,()=>{ GFX.ambient(.8,.7,.68,1.6); Cn.tilt(0,2.5); Cn.zoom(.95); });
  after(5.35,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); });
  after(5.95,()=>{ done=true; GFX.gain=g0; sig.dead=true; for(const z of tor){ if(z.w) z.w.dead=true; if(z.L) z.L.hold=0; } if(big) big.dead=true; ultStop(); }); }

// DRAGON BLAZE: no circle - the floor splits and glows, and three times a scaled back arches out of the stone and dives under again,
// closer each time. Then it comes up through the floor: crimson scales wrapped in fire and black smoke, gold fire in its jaws. One lap low
// over the field, passing behind him and in front of him, its shadow and its light running under it, its track burning. Its shadow falls
// on the place it has chosen; the field holds its breath; it goes in - rock stands up round the hole, everything near is thrown into the
// air - and what stays is a crater and a dragon burnt into the floor.
function ultDragon(id){ ultStart(id); const Cn=X.cine, {hw,hh}=view(), Dm=70000*A.mul(id), b=V.boss&&!V.boss.dead?V.boss:null, t0=b||densest(1600), [cx,cy]=X.inView(t0?t0.x:pl.x,t0?t0.y:pl.gy-hh*.3,.42), x0=pl.x, y0=pl.gy, g0=GFX.gain;
  S([['gy01',.12],['gy02',.2],['gy03',.4,{kick:[-.8,.6]}],['gy04',1.1],['gy05',.1],['gy06',.1],['gy07',.12,{kick:[-1.4,1]}],['gy08',.8],['gy09',.8],['gy10',.8],['gy11',.12,{kick:[1.8,-1.4]}],['gy12',.6],['gy13',.7],['gy14',9]]);
  const RX=hw*.72, RY=RX*1.16, T0=1.9, TD=2.2, DD=.42, END=TD+DD, ZF=470, N=40, HS=380, HA=900/595, WB=150, LB=3200;
  // ---- omen (close): the floor splits and glows under him, embers wind in, and its back breaches three times
  GFX.ambient(.3,.31,.44,3.5); const spot=GFX.light(x0,y0,820,'#ff4a14',.8,.5,{hold:9,z:140,flick:.25});
  Cn.tilt(.1,3); Cn.zoom(1.3); Cn.cam(x0,y0-BODY*1.4,5); SFX.fire(5,.6); const dr=Cn.drone(41,.4); SFX.rumble(1.7);
  K.crack(x0,y0,{alt:1,r:440,pal:PD,life:4.6,grow:1.5,gain:1.1}); K.crack(x0,y0,{r:210,pal:PG,life:3.6,grow:.9});
  for(let i=0;i<70;i++) after(rand(.05,1.75),()=>{ const a=rand(0,TAU), d=rand(500,1000); GFX.pt({x:x0+Math.cos(a)*d,y:y0+Math.sin(a)*d*FSY,z:rand(0,260),tx:x0,ty:y0,tz:20,pull:rand(2.6,4),life:rand(.6,.9),s:rand(3,6),m:3,len:.06,vx:-Math.sin(a)*820,vy:Math.cos(a)*480,c:GFX.rgb(Math.random()<.4?PG.h:PF.s),c2:PD.b,L:3}); });
  // one arch of its back: out of the floor at A, over, and under again at B, the scales sliding through
  const arch=(ax,ay,bx,by,Hh,dl,T1,lead)=>{ after(dl,()=>{ K.upheave(ax,ay,{r:56,n:3,s:95,a0:PI,a1:TAU,pal:PD,dur:.9}); K.sparks(ax,ay,20,{pal:PF,n:14,sp:[200,900],up:1100}); GFX.light((ax+bx)/2,(ay+by)/2,620,PD.l,1,.5,{z:120}); Cn.shake(.4); SFX.boom(.7,.3); if(lead){ boomv(ax,ay,150,{smoke:.4,dur:.7,scorch:0,light:0}); SFX.roar(.9,.6); } });
    after(dl+T1,()=>{ K.upheave(bx,by,{r:56,n:3,s:95,a0:PI,a1:TAU,pal:PD,dur:.9}); K.sparks(bx,by,20,{pal:PF,n:14,sp:[200,900],up:900}); K.dust(bx,by,{n:6,r:30,sp:[200,500],a:.45}); Cn.shake(.3); if(lead) boomv(bx,by,135,{smoke:.4,dur:.7,scorch:0,light:0}); });
    if(!F.on) return; const m=mats(), km=K.mats(), n=14, sd=rand(0,9), P_=[], S_=[], A_=[], ux=bx-ax, uy=by-ay, len=Math.hypot(ux,uy)||1, C=col(PF), CD=col(PD), CG=col(PG);
    const lag=lead?1.03:1.7, wk=lead?.6:.44;
    GFX.add(T1*(1+lag)+.04,(k,tt)=>{ const s1=sat(tt/T1), s0=sat((tt-T1*lag)/T1); if(s1-s0<.04) return; P_.length=0; S_.length=0; A_.length=0;
      for(let i=0;i<n;i++){ const e=i/(n-1), s=mix(s0,s1,e), w=WB*wk*Math.pow(Math.sin(PI*(.02+.96*e)),.4)*(lead&&e>.8?.75:1), x=ax+ux*s, y=ay+uy*s, z=Hh*Math.sin(PI*s); P_.push({x,y,z,w}); S_.push({x,y,z:0,w:w*1.25}); }
      for(let i=n-1;i>=0;i--){ const p=P_[i]; A_.push({x:p.x,y:p.y,z:p.z,w:p.w*2.3}); }
      F.ribbon(m.shd,S_,{a:.55});
      F.ribbon(m.ct,A_,{...CD,gain:2,ero:.1,t0:sd,a:.9});
      for(let i=2;i<n-1;i+=3){ const p=P_[i], tl=Math.hypot(ux/len*.6,uy/len*.6+.8); tongue(p.x,p.y,p.z+p.w*.2,p.w*2.2,-ux/len*.6/tl,(-uy/len*.6-.8)/tl,{...(i%2?C:CD),t0:sd+i,a:.9,gain:2.2}); }
      F.ribbon(m.dB,P_,{ero:-1,a:1,gain:1.25,ulen:LB*.5,uvT:[1,1,(1-s1)*.5+sd*.01,0]});
      // the head leads the first breach: jaws first out of the floor, fire in them, over and down
      if(lead&&s1<.985){ const hp=P_[n-1], dzs=Hh*PI*Math.cos(PI*s1), dx=ux, dy=uy-dzs, dl_=Math.hypot(dx,dy)||1, th=Math.atan2(dy,dx), right=dx>=0, sq=mix(.5,1,sat(Math.abs(dx)/dl_/.45)), up=sat(s1/.12)*sat((1-s1)/.06), s=HS*.6*(.5+.5*up), rot=right?th-.22:th-PI+.22, HW=s*HA*sq, ax_=(right?-.5:.5)*HW, az=-.42*s, co=Math.cos(rot), si=Math.sin(rot), hx=hp.x-(ax_*co+az*si), hz=hp.z+(ax_*si-az*co), fd_=right?1:-1, mx=fd_*.44*HW, mz=-.22*s, jx=hx+mx*co+mz*si, jz=hz-(mx*si-mz*co), fa=right?rot+.22:rot+PI-.22, fl_=s*1.5*(1+.1*Math.sin(tt*40));
        F.bill(km.glowO,hx,hp.y,hz,s*1.7,s*1.7,0,{...CD,a:.5*up,gain:1.3});
        F.bill(m.fc,jx+Math.cos(fa)*fl_*.46,hp.y,jz-Math.sin(fa)*fl_*.46,fl_*.5,fl_*.24,fa,{...CG,a:.95*up,gain:2.8,ero:.12,t0:sd+7,uvT:(Math.floor(tt*12)&1)?[1,-1,0,1]:[1,1,0,0]});
        F.bill(m.dH,hx,hp.y,hz,HW,s,rot,{ero:mix(.6,-.1,up),soft:.1,uvT:right?[1,1,0,0]:[-1,1,1,0]});
        const ux_=-fd_*.6*HW, uz_=-.72*s; F.bill(m.smk,hx+ux_*co+uz_*si,hp.y,hz-(ux_*si-uz_*co),s*.86*sq,s*.66,rot,{cA:'#140302',cB:'#3a0a05',cC:'#9a2c0c',a:.9*up,ero:.16,t0:sd+9}); } },dl); };
  { const r=470, f=-2.3; arch(x0+Math.cos(f-.95)*r,y0+Math.sin(f-.95)*r*.8,x0+Math.cos(f+.95)*r,y0+Math.sin(f+.95)*r*.8,270,.2,.4,true); }
  [[-1.25,.98,190,.2],[-.45,1.3,220,.19]].forEach(([f,dl,Hh,T1])=>{ const r=500; arch(x0+Math.cos(f-.9)*r,y0+Math.sin(f-.9)*r*.8,x0+Math.cos(f+.9)*r,y0+Math.sin(f+.9)*r*.8,Hh,dl,T1,false); });
  after(1.5,()=>{ Cn.zoom(1.42); K.shock(x0,y0,{r0:hw*.8,r:80,dur:.34,pal:PD,gain:.6,light:0,dust:0,painted:0,haze:.6,th:.7}); });
  // path of the head: floor position and height, lt seconds after it leaves the floor
  const lap=lt=>{ const a=-PI/2+lt*3.0, g=Math.min(1,lt/.45); return [x0+Math.cos(a)*RX*g,y0+Math.sin(a)*RY*g]; }, zl=lt=>ZF*eo3(sat(lt/.35))+Math.sin(lt*6)*38;
  // the dive keeps turning the way the lap turned and winds inward onto the mark (the circle it flies shrinks and slides over to the
  // target), so the body never has to double back on itself; its height swells once and falls away
  const sz=zl(TD), pos=lt=>{ if(lt<=0) return {x:x0,y:y0,z:0}; if(lt<TD){ const [x,y]=lap(lt); return {x,y,z:zl(lt)}; }
    const k=sat((lt-TD)/DD), w=k*(.7+.3*k), a=-PI/2+lt*3.0, g=1-w; return {x:lerp(x0,cx,w)+Math.cos(a)*RX*g,y:lerp(y0,cy,w)+Math.sin(a)*RY*g,z:sz*(1-Math.pow(k,1.8))+1300*k*k*Math.pow(1-k,1.5)}; };
  let t=0, sc=0, fl=0, br=.1, dive=0, done=false; const trail=[];
  V.ultTick=dt=>{ t+=dt; Cn.shake(t<1.8?.1+t*.1:0);
    if(t<T0) return;
    const lt=t-T0; if(dive||lt>=TD) return; const p=pos(lt);
    // behind it the track catches: a wall of flame for every stretch it has crossed (they burn out one after another, the oldest first)
    if(lt>.62&&(br+=dt)>.17){ br=0; const q=pos(lt-.2); K.vcolumn((q.x+p.x)/2+rand(-30,30),(q.y+p.y)/2+rand(-20,20),{r:rand(150,200),h:rand(420,640),dur:Math.min(1.2,4.7-t),rise:.22,out:.55,pal:fl++%3?PF:PD,twist:rand(.8,1.6),turb:.9,taper:.5,heat:1.2,delay:.12}); }
    // the track it burns: ragged in width, flames standing on it
    if((sc+=dt)>.1){ sc=0; const q=trail.length; trail.push({x:p.x+rand(-20,20),y:p.y+rand(-14,14),t,w:mix(70,170,.5+.5*Math.sin(q*1.1))*rand(.8,1.2),j:Math.random()<.18?.2:rand(.6,1.4)}); }
    if(Math.random()<.35){ V.blast={x:p.x,y:p.y,p:.8}; inCircle(p.x,p.y,270,o=>ultHit(o,Dm*.15,p.x,p.y-BODY)); } };
  // a coil on the floor round a point: from its head end at angle a0 winding back, radius r0 -> r1, a body's width
  const coil=(x,y,r0,r1,a0,turns,n,w)=>{ const o=[]; for(let i=0;i<n;i++){ const u=i/(n-1), a=a0-u*turns*TAU, r=mix(r0,r1,u); o.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*FSY,z:0,w:w*(u<.08?mix(.55,1,u/.08):Math.pow(1-(u-.08)/.92,.7))}); } return o; };
  // the track it flew: a charred scar that stays, and low flames standing on it until the floor takes the dragon back
  if(F.on){ const m=mats(); GFX.add(8,(k)=>{ const n=trail.length; if(n<2) return; const heat=t<4.52?.8:Math.max(.08,.8-(t-4.52)/1.2), fade=sat((1-k)/.15);
      F.ribbon(m.arm,trail,{cB:'#a82404',cC:PF.s,a:.92*fade,bgain:1.3*heat,gain:2*heat});
      },T0); }
  // ---- the dragon itself: drawn from the path every frame
  if(F.on){ const m=mats(), km=K.mats(), C=col(PF), CD=col(PD), CG=col(PG), sd=rand(0,9), pts=[], sh=[]; let face=true;
    const jaw=K.vjet(x0,y0,ZF,0,{len:640,r:150,r0:40,dur:TD-.3,in:.3,out:.2,pal:PG,heat:1.5,turb:.7,speed:9,delay:T0+.3});
    const L1=GFX.light(x0,y0,1350,'#ff6a1c',0,.3,{hold:9,z:280,flick:.12}), L2=GFX.light(x0,y0,980,'#ff3410',0,.3,{hold:9,z:200,flick:.12});
    const shape=u=>u<.1?mix(.72,1,u/.1):Math.pow(Math.max(0,1-(u-.1)/.9),.75), SL=LB/(N-1), SD=.0125, h2=N>>1, UL=h2*SL, far=p=>p.y<y0-30;
    GFX.add(9,()=>{ const lt0=t-T0, gone=Math.max(0,lt0-END)*11000; if(done||gone>LB){ L1.hold=L2.hold=0; return; } if(lt0<=0) return; const lt=Math.min(lt0,END);
      // lay the body along the path the head has flown, at even spacing (so it never stretches); once the head is in the floor the rest pours after it
      pts.length=0; sh.length=0; const i0=Math.ceil(gone/SL); let prev=pos(lt), acc=0, tgt=i0*SL-gone, q=lt;
      for(let i=0;i<i0&&i<N;i++) pts.push({x:prev.x,y:prev.y,z:0,w:0});
      for(let j=1;j<=230&&pts.length<N&&q>0;j++){ q=lt-j*SD; const p=pos(q), d=Math.hypot(p.x-prev.x,(p.y-p.z)-(prev.y-prev.z));
        while(pts.length<N&&d>0&&acc+d>=tgt){ const f=(tgt-acc)/d, i=pts.length, u=i/(N-1), wv=Math.sin(lt0*10-u*8)*28*Math.min(1,u*4); pts.push({x:mix(prev.x,p.x,f),y:mix(prev.y,p.y,f),z:Math.max(0,mix(prev.z,p.z,f)+wv),w:WB*shape(u)*sat((tgt+40)/160)*sat(lt0/.08)}); tgt+=SL; }
        acc+=d; prev=p; }
      while(pts.length<N) pts.push({x:x0,y:y0,z:0,w:0});
      // round the path off where it turns hard (twice over), and thin the body where it still bends tighter than its own width
      for(let pass=0;pass<2;pass++){ let ax=pts[0].x, ay=pts[0].y, az=pts[0].z; for(let i=1;i<N-1;i++){ const p=pts[i], b=pts[i+1], nx=(ax+2*p.x+b.x)/4, ny=(ay+2*p.y+b.y)/4, nz=(az+2*p.z+b.z)/4; ax=p.x; ay=p.y; az=p.z; if(p.w>0&&b.w>0){ p.x=nx; p.y=ny; p.z=nz; } } }
      for(let i=1;i<N-1;i++){ const a=pts[i-1], p=pts[i], b=pts[i+1], ux=p.x-a.x, uy=(p.y-p.z)-(a.y-a.z), vx=b.x-p.x, vy=(b.y-b.z)-(p.y-p.z), ul=Math.hypot(ux,uy)||1, vl=Math.hypot(vx,vy)||1, c=(ux*vx+uy*vy)/(ul*vl); if(c<.8) p.w*=Math.max(.35,.5+.5*c/.8); }
      const hp=pts[0], hq=pts[2], dx=hp.x-hq.x, dy=(hp.y-hp.z)-(hq.y-hq.z), dl=Math.hypot(dx,dy)||1, th=Math.atan2(dy,dx), head=lt0<END, hk=sat(lt0/.25), mid=pts[Math.min(N-1,i0+h2)], live=head?1:sat(1-gone/LB), dv=sat((lt0-TD)/DD);
      if(Math.abs(dx)/dl>.14) face=dx>=0; const right=face;
      { const fx=hp.x-hq.x, fy=hp.y-hq.y, fl_=Math.hypot(fx,fy)||1; jaw.x=hp.x+fx/fl_*HS*.8; jaw.y=hp.y+fy/fl_*HS*.8; jaw.z=hp.z; jaw.dir=fdir(fx,fy); jaw.pitch=-Math.atan2(hp.z,520); if(dv>0) jaw.dead=true; }
      L1.x=hp.x; L1.y=hp.y; L1.a=1.25*live; L2.x=mid.x; L2.y=mid.y; L2.a=.9*live*sat(lt/.4);
      // on the floor: the shadow running under the whole of it, and the light it throws down
      for(const p of pts) sh.push({x:p.x,y:p.y,z:0,w:p.w*1.7}); F.ribbon(m.shd,sh,{a:.85*live});
      if(head) F.quad(km.glowG,hp.x,hp.y,720,720,0,{...C,a:.8*hk,gain:1.4});
      if(mid.w>1) F.quad(km.glowG,mid.x,mid.y,520,520,0,{...CD,a:.6,gain:1.2});
      // it passes behind him and in front of him: every stretch of the body is drawn under the figures where it flies beyond him, over them
      // where it flies on this side. The scale strip runs on unbroken (mirrored at the middle), and so do the smoke and the fire it drags.
      for(let a=0;a<N-1;){ const fr=far(pts[a]), hf=a<h2?0:1; let e=a+1; while(e<N-1&&far(pts[e])===fr&&(e<h2?0:1)===hf) e++; const seg=pts.slice(a,e+1), ly=fr?'g':'o', d0=a*SL/UL;
        if(seg[0].w+seg[seg.length-1].w>2){ const rv=seg.slice().reverse(), u0=1-e*SL/LB;
          if(!F.low) F.ribbon(m.ctS,rv.map(p=>({x:p.x,y:p.y,z:p.z+p.w*.5,w:p.w*3.2})),{a:.6*live,t0:sd,ulen:LB,uvT:[1,1,u0,0],layer:ly});
          F.ribbon(m.ct,rv.map(p=>({x:p.x,y:p.y,z:p.z,w:p.w*2.5})),{...CD,gain:2.2,ero:.1,t0:sd,a:.95*live,ulen:LB,uvT:[1,1,u0,0],layer:ly});
          for(let i=a+1;i<e;i+=3){ const p=pts[i], pq=pts[Math.min(N-1,i+2)], bx=pq.x-p.x, by=(pq.y-pq.z)-(p.y-p.z), bl=Math.hypot(bx,by)||1; if(p.w<8||i>N-6) continue; const tx_=bx/bl*.75, ty_=by/bl*.75-.66, tl=Math.hypot(tx_,ty_)||1; tongue(p.x,p.y,p.z+p.w*.2,p.w*(2.5-i*.03),tx_/tl,ty_/tl,{...(i%2?C:CD),t0:sd+i,a:.9*live,gain:2.2,layer:ly}); }
          F.ribbon(m.dB,seg,{ero:-1,a:live,gain:1.25,ulen:UL,uvT:hf?[-1,1,2-d0,0]:[1,1,d0,0],layer:ly}); }
        a=e; }
      if(head&&!F.low){ const lit=.5+.5*Math.cos(th+2.3), sv=[]; for(let i=0;i<14&&i<N;i++){ const p=pts[i]; sv.push({x:p.x,y:p.y,z:p.z,w:p.w*Math.pow(1-i/14,.6)}); } F.ribbon(m.dA,sv,{ero:-1,a:(.16+.5*lit)*hk,gain:1,ulen:UL,uvT:[1,1,0,0],layer:far(hp)?'g':'o'}); }
      // the head, and the gold-white fire in its jaws. Where it turns across the view it narrows, so the change of side is a turn, not a jump
      if(head){ const ly=far(hp)?'g':'o', sq=mix(.36,1,sat(Math.abs(dx)/dl/.45)), rot=right?th-.22:th-PI+.22, s=HS*(1+hp.z/1600), HW=s*HA*sq, ax=(right?-.5:.5)*HW, az=-.42*s, co=Math.cos(rot), si=Math.sin(rot), ox=ax*co+az*si, oy=ax*si-az*co, hx=hp.x-ox, hz=hp.z+oy, fd_=right?1:-1;
        F.bill(km.glowO,hx,hp.y,hz,s*1.7,s*1.7,0,{...CD,a:.45*hk,gain:1.2,layer:ly});
        const mx=fd_*.44*HW, mz=-.22*s, bx=hx+mx*co+mz*si, bz=hz-(mx*si-mz*co), fa=right?rot+.22:rot+PI-.22, fl_=s*(1.15+1.1*dv)*(1+.08*Math.sin(t*23))*(.5+.5*sq);
        F.bill(m.fc,bx+Math.cos(fa)*fl_*.46,hp.y,bz-Math.sin(fa)*fl_*.46,fl_*.5,fl_*.24,fa,{...CG,a:.95*hk,gain:2.8,ero:.12,t0:sd+7,uvT:(Math.floor(t*12)&1)?[1,-1,0,1]:[1,1,0,0],layer:ly});
        F.bill(m.dH,hx,hp.y,hz,HW,s,rot,{ero:mix(.9,-.1,hk),soft:.1,uvT:right?[1,1,0,0]:[-1,1,1,0],layer:ly});
        F.bill(km.glowO,bx,hp.y,bz,s*.24,s*.24,0,{...CG,a:.8*hk,gain:2.2+Math.sin(t*37)*.4,layer:ly});
        // where the painted neck ends and the body begins: buried in dark red smoke and the flames of its mane
        const pb=pts[3], qx_=pb.x-hp.x, qy_=(pb.y-pb.z)-(hp.y-hp.z), ql=Math.hypot(qx_,qy_)||1, jx=qx_/ql, jy=qy_/ql, kx=-fd_*.74*HW, kz=-.66*s, ex=hx+kx*co+kz*si, ez=hz-(kx*si-kz*co), nl=Math.hypot(jx*.8,jy*.8-.6)||1, ux_=-fd_*.6*HW, uz_=-.72*s;
        F.bill(m.smk,hx+ux_*co+uz_*si,hp.y,hz-(ux_*si-uz_*co),s*.86*sq,s*.66,rot,{cA:'#140302',cB:'#3a0a05',cC:'#9a2c0c',a:.92*hk,ero:.16,t0:sd+9,uvT:right?[1,1,0,0]:[-1,1,1,0],layer:ly});
        tongue(ex-jx*s*.1,hp.y,ez+jy*s*.1+s*.1,s*1.05,jx*.8/nl,(jy*.8-.6)/nl,{...C,t0:sd+11,a:.95*hk,gain:2.3,layer:ly}); tongue(ex+jx*s*.25,hp.y,ez-jy*s*.25-s*.12,s*.85,jx*.9/nl,(jy*.9-.35)/nl,{...CD,t0:sd+13,a:.95*hk,gain:2.2,layer:ly}); }
      // embers shed along its length
      for(let e=0;e<2;e++){ const p=pts[(Math.random()*(N-4))|0]; if(p.w>4) GFX.pt({x:p.x+rand(-40,40),y:p.y,z:p.z+rand(-40,40),vx:rand(-90,90),vy:rand(-40,40),vz:rand(-60,220),g:120,drag:.8,life:rand(.4,.9),s:rand(2.5,6.5),m:8,c:GFX.rgb(Math.random()<.4?PF.h:PF.s),L:3}); } }); }
  // ---- release (wide): it comes up through the floor - rock stands up behind it, no burst of fire but its own
  after(1.87,()=>{ dr.stop(.1); SFX.roar(1.8,1); spot.hold=0; spot.life=.3; hitstop=Math.max(hitstop,.06); Cn.shake(1); post.ca=.012; Cn.tilt(.22,5); Cn.zoom(.66); Cn.cam(null);
    GFX.ambient(.4,.33,.36,30); after(.14,()=>GFX.ambient(.3,.3,.42,5));
    K.upheave(x0,y0-250,{r:260,n:8,s:190,a0:PI*1.08,a1:PI*1.92,pal:PD,dur:1.4}); K.shock(x0,y0,{r:hw*1.05,dur:.5,pal:PD,gain:.8,light:0}); K.crack(x0,y0,{alt:1,r:560,pal:PF,life:3.2,grow:.12});
    boomv(x0,y0-330,300,{pal:PD,smoke:.15,dur:.9,rise:300,scorch:0,light:0});
    GFX.ripple(x0,y0,hw*1.5,{life:.5,s:.7}); K.sparks(x0,y0,60,{pal:PF,n:36,sp:[500,1800],up:1300}); K.debris(x0,y0,{n:22,r:200,sp:[250,1100],up:1700,size0:12,size:30}); K.dust(x0,y0,{n:14,r:90,sp:[400,1000]}); GFX.light(x0,y0,hw*1.4,PF.l,1.05,.5,{z:240});
    });
  // ---- it chooses (announced .42 s ahead): its shadow falls on the place, the floor there glows and splits, embers are drawn to it
  after(4.1,()=>{ dive=t; Cn.cam(cx,cy-BODY,9); Cn.tilt(.28,5); Cn.zoom(.66); GFX.ambient(.3,.3,.38,8); SFX.roar(1.2,1); Cn.SND.inhale(.42,.7);
    if(F.on){ const km=K.mats(); GFX.add(.43,k=>{ const r=560*(.45+.55*k); F.quad(km.dark,cx,cy,r,r,0,{a:.3+.5*k}); F.quad(km.glowG,cx,cy,90+300*k,90+300*k,0,{...col(PG),a:.75*k,gain:1.5}); }); }
    K.crack(cx,cy,{alt:1,r:380,pal:PG,life:1.3,grow:.4}); GFX.light(cx,cy,800,PG.l,.7,.2,{hold:.4,z:60});
    for(let i=0;i<2;i++) K.shock(cx,cy,{r0:820-i*240,r:60,dur:.36,delay:i*.12,pal:PG,gain:.6,light:0,dust:0,painted:0,haze:.5,th:.7});
    for(let i=0;i<40;i++){ const a=rand(0,TAU), d=rand(400,900); GFX.pt({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d*FSY,z:rand(0,300),tx:cx,ty:cy,tz:10,pull:rand(5,8),life:rand(.3,.42),s:rand(3,6),m:3,len:.05,vx:-Math.sin(a)*700,vy:Math.cos(a)*400,c:GFX.rgb(Math.random()<.5?PG.h:PF.s),c2:PF.b,L:3}); } });
  // ---- the field holds its breath: everything dims and waits
  after(4.33,()=>{ GFX.gain=.6; GFX.ambient(.3,.3,.36,40); });
  after(4.44,()=>{ hitstop=Math.max(hitstop,.07); });
  // ---- contact: one frame - shock front, rock standing up round the hole, slabs and dust thrown out, everything near in the air
  after(4.52,()=>{ GFX.gain=g0; hitstop=Math.max(hitstop,.12); Cn.shake(1.5); post.ca=.014; Cn.zoom(.6); SFX.boom(2.2,1); Cn.SND.hit(1); SFX.roar(1.6,.8);
    GFX.ambient(.44,.36,.37,40); after(.18,()=>GFX.ambient(.36,.32,.38,3));
    crater(cx,cy,hw*.56,{life:7.2,spread:.16}); K.flip(cx,cy,{tex:'v3_flip_shock',floor:true,s:hw*.98,dur:.6,pal:PG}); GFX.ripple(cx,cy,hw*1.8,{life:.55,s:.9});
    // the detonation: ONE fireball where it went in, opening into a head of black smoke; its fire comes back up out of the hole as a
    // crimson column; a roll of dust and fire leaves over the floor
    K.flare(cx,cy,BODY,{pal:PB,s:320,dur:.2,gain:2.4}); K.vblast(cx,cy,{s:800,pal:PF,smoke:.4,dur:1.35,rise:560,heat:1.35,fire:.5});
    K.vcolumn(cx,cy,{r:210,h:2000,dur:1.0,rise:.1,out:.5,pal:PD,twist:3,turb:.6,taper:.4,heat:1.5,delay:.1}); K.pillar(cx,cy,{r:50,h:1900,dur:.28,pal:PG,gain:.7,delay:.1});
    K.vring(cx,cy,{r:hw*1.35,r0:hw*.2,dur:.9,heat:1.2,pal:PD,tube:.1}); K.sparks(cx,cy,300,{pal:PG,n:50,sp:[700,2600],up:2200,life:[.4,1]});
    after(.07,()=>Cn.shake(1.1)); after(.13,()=>Cn.shake(1));
    K.upheave(cx,cy,{r:hw*.52,n:9,s:210,a0:PI*1.06,a1:PI*1.94,pal:PD,dur:1.3});
    K.debris(cx,cy,{n:34,r:220,sp:[400,1700],up:2100,size0:14,size:38}); K.dust(cx,cy,{n:22,r:160,sp:[600,1500],a:.55}); GFX.light(cx,cy,hw*1.6,PG.l,1.15,.5,{z:300});
    launch(cx,cy,hw*1.25,1); after(.3,()=>Cn.sweep(cx,cy,Dm,{speed:3200,push:1.3}));
    // what stays: the dragon burnt into the floor - a coil of charred scales round the crater, its head at the end of it. Low fire runs out
    // along it once, tail to head, and dies; low smoke hangs over it
    if(F.on){ const m=mats(), C=col(PF), CD=col(PD), a0=rand(-2.4,-.7), NC=38, P_=coil(cx,cy,hw*.9,hw*.16,a0,1.6,NC,hw*.12), sd=rand(0,9), hd=P_[0], hs=hw*.3, ha=a0+PI/2, hf=NC>>1, A1=P_.slice(0,hf+1), A2=P_.slice(hf);
      for(let i=0;i<NC;i++) P_[i].j=rand(.6,1.35);
      GFX.add(7.4,(k,tt)=>{ const fade=sat((1-k)/.18), heat=Math.max(.1,1.2-tt/1.8), sh=sat(tt/.4+.1), er=.34-.3*sat(tt/.6);
        F.ribbon(m.dBk,A1,{a:.96*fade*sh,ero:er,soft:.12,gain:1+2.2*heat}); F.ribbon(m.dBk,A2,{a:.96*fade*sh,ero:er,soft:.12,gain:1+2.2*heat,uvT:[-1,1,1,0]});
        F.quad(m.dHk,hd.x+Math.cos(ha)*hs*.75,hd.y+Math.sin(ha)*hs*.75*FSY,hs*HA,hs,ha,{a:.96*fade*sat((tt-.3)/.3),ero:.1,soft:.14,gain:1+2.2*heat,uvT:[1,-1,0,1]});
        if(tt<1.5){ let any=0; for(let i=0;i<NC;i++){ const p=P_[i], ig=(1-i/(NC-1))*.4, up=sat((tt-ig)/.12), dn=sat(1-(tt-ig-.35)/.6); p.h=(90+170*p.w/(hw*.12))*p.j*up*dn*(1+.12*Math.sin(tt*11+i)); if(p.h>4) any=1; }
          if(any){ F.wall(m.gf,P_,{...CD,a:1,gain:2.4,ero:.1,ulen:700,t0:sd}); for(let i=2;i<NC-1;i+=4){ const p=P_[i], dx=P_[i+1].x-P_[i-1].x, dy=P_[i+1].y-P_[i-1].y; if(p.h>50&&Math.abs(dy)>Math.abs(dx)*.8) tongue(p.x,p.y,0,p.h*1.2,0,-1,{...(i%8===2?C:CD),a:1,t0:sd+i,gain:2.3}); } } } }); } });
  // ---- afterglow: low dark smoke over the crater, embers, rubble settling; the colour and the camera come back
  after(4.9,()=>{ for(let i=0;i<3;i++){ const a=PI*(1.1+i*.4)+rand(-.2,.2), r=hw*rand(.5,.8); K.vsmoke(cx+Math.cos(a)*r,cy+Math.sin(a)*r*FSY,{s:rand(260,340),z:40,dur:rand(1.4,1.9),delay:i*.1,a:.5,rise:240}); }
    K.embers(cx,cy,hw*.9,{pal:PF,n:70,life:2.6,up:300}); K.debris(cx,cy,{n:10,r:hw*.5,sp:[60,260],up:500,size0:8,size:20}); });
  after(5.1,()=>{ GFX.ambient(.8,.7,.68,1.6); Cn.tilt(0,2.5); Cn.zoom(.9); });
  after(5.5,()=>{ GFX.ambient(1,1,1,2); Cn.zoom(1); Cn.cam(null); });
  after(6.15,()=>{ done=true; GFX.gain=g0; ultStop(); }); }

X.reg('pyro',{sk,order,basic:{fn:basic,cd:()=>.9*(1-.05*(L('py_basic')-1))},skills:SKILL,ults:{py_ult1:ultStorm,py_ult2:ultDragon}});
})();
