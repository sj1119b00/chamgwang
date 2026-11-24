// 참광 — mobile survival RPG (portrait). A top-down field where the chosen class character walks freely, every equipped skill
// fires on its own, and crystal hordes close in from all sides for five minutes per chapter. Loaded by rpg.js, whose save
// (per-character levels, skill points, upgrades, loadout) and skill table it uses; the showcase engine supplies effects,
// the painted characters and the frame sequencer. Each class's skills live in sk_<class>.js and register through RPG.sv.
// World: x/y is the floor plane (y = depth), z is height. The hero's floor position is pl.x / pl.gy (the engine draws him at pl.gy).
'use strict';
(()=>{
const G=RPG, A=G.api, SV=()=>A.SV, SK=A.SK, VER=25;
const ZL=.42, ZP=.5, DUR=300, BOSS_T=240, CAP=340, SPD=430, BODY=170, FAR=1e5;
const CLS_ORDER=['sword','mage','fist','shaman','pyro'];
const NAMES={sword:'소드맨',mage:'메이지',fist:'파이터',shaman:'샤먼',pyro:'파이로'};
const CRIM={sword:'#ffb3c0',mage:'#e6d4ff',fist:'#bff4ff',shaman:'#c8ffe8',pyro:'#ffd0a8'};
const CCOL={sword:'#ff3355',mage:'#b48cff',fist:'#55ddff',shaman:'#3dffb0',pyro:'#ff7a2a'};
const EN={
  shard:{img:'shard',hp:700,spd:170,r:40,dmg:6,gem:1,sc:.56,h:300},
  archer:{img:'archer',hp:600,spd:150,r:38,dmg:8,gem:2,sc:.56,h:290,ranged:true},
  brute:{img:'brute',hp:5200,spd:105,r:75,dmg:14,gem:5,sc:.56,h:440,heavy:true},
  boss:{img:'brute',hp:260000,spd:135,r:150,dmg:24,gem:120,sc:1.15,h:440,heavy:true,boss:true},
};
// chapters: the same crystal army recoloured (hue turns their violet), a floor tint, tougher numbers, a named boss
const CHAP=[
  {name:'크리스탈 필드',en:'CRYSTAL FIELD',hue:62,bri:.6,sat:.42,hp:1,dmg:1,floor:[70,68,76],acc:'#b48cff',boss:'골렘 킹',rec:1},
  {name:'블러드 문',en:'BLOOD MOON',hue:95,bri:1,hp:1.8,dmg:1.3,floor:[48,26,30],acc:'#ff4a6a',boss:'블러드 골렘',rec:6},
  {name:'프로즌 레이크',en:'FROZEN LAKE',hue:-75,bri:1.1,hp:3,dmg:1.6,floor:[30,40,54],acc:'#7fe0ff',boss:'프로스트 골렘',rec:12},
  {name:'인페르노',en:'INFERNO',hue:130,bri:1.05,hp:4.5,dmg:2,floor:[52,32,22],acc:'#ff8a2a',boss:'인페르노 골렘',rec:18},
  {name:'보이드 엔드',en:'VOID END',hue:200,bri:.8,hp:6.5,dmg:2.5,floor:[24,32,28],acc:'#55ffb0',boss:'보이드 타이탄',rec:25},
];
const V={t:0,ch:0,en:[],pj:[],gems:[],items:[],nums:[],shards:[],mk:[],orbs:[],zones:[],kills:0,run:0,acc:0,accT:0,ug:0,cd:{},gcd:0,bcd:0,chain:0,
  dash:null,boss:null,spawn:0,horde:0,over:false,joy:null,keys:{},ox:0,oy:0,fxB:0,lv:0,id:0,cuts:[],shadow:null,zk:1,ultTick:null};
G.surv=V;
const CH=()=>CHAP[V.ch];
const CLS={};
const FSY=.58;   // vertical squash of anything lying on the floor (tiles, rings, magic circles) for this camera   // class -> {basic:{fn,cd}, skills:{id:{fn,passive}}, ults:{id:fn}, onHurt, glow}

// ============================================================ small helpers
const snd={}; function sfx(n,...a){ if(RT-(snd[n]||0)<.055) return; snd[n]=RT; SFX[n](...a); }
const hm=()=>(1+V.t/75)*CH().hp;                // enemy health grows with time survived (and chapter)
const dm=()=>(1+V.t/150)*CH().dmg;              // and so does what they hit for
const alive=()=>V.en.filter(e=>!e.dead);
const view=()=>({hw:W/(2*S*cam.z),hh:H/(2*S*cam.z)});
const ACT=()=>(A.ORDER[pl.cls]||[]).filter(id=>SK[id]&&SK[id].type==='skill'&&A.unlocked(id));   // every unlocked skill fires by itself: there are no slots to equip
function nearest(R){ let b=null,bd=R*R; for(const e of V.en){ if(e.dead) continue; const d=(e.x-pl.x)**2+((e.y-pl.gy)/FSY)**2; if(d<bd){ bd=d; b=e; } } return b; }
function countIn(R){ let n=0; for(const e of V.en) if(!e.dead&&(e.x-pl.x)**2+((e.y-pl.gy)/FSY)**2<R*R) n++; return n; }
// the point (an enemy's position) with the most enemies around it, among those within R of the hero
function densest(R,r=260){ let b=null,bn=0; const L=V.en.filter(e=>!e.dead&&(e.x-pl.x)**2+((e.y-pl.gy)/FSY)**2<R*R);
  for(let i=0;i<L.length;i+=Math.max(1,L.length/40|0)){ const e=L[i]; let n=0; for(const o of L) if((o.x-e.x)**2+(o.y-e.y)**2<r*r) n++; if(n>bn){ bn=n; b=e; } } return b; }
const angTo=e=>Math.atan2(e.y-pl.gy,e.x-pl.x);
function face(a){ const c=Math.cos(a); if(Math.abs(c)>.05) pl.f=c>0?1:-1; V.leanT=clamp(Math.atan2(Math.sin(a),Math.abs(c)),-1.2,1.2)*.1*pl.f; V.leanHold=.28; }
function inCircle(x,y,r,fn){ for(const e of V.en){ if(e.dead) continue; const dx=e.x-x, dy=(e.y-y)/FSY, rr=r+e.d.r; if(dx*dx+dy*dy<rr*rr) fn(e); } }
function inCircleS(x,y,r,fn){ for(const e of V.en){ if(e.dead) continue; const dx=e.x-x, dy=e.y-y, rr=r+e.d.r; if(dx*dx+dy*dy<rr*rr) fn(e); } }
function inSector(x,y,a,r,half,fn){ inCircleS(x,y,r,e=>{ const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy); let d=Math.atan2(dy,dx)-a; d=Math.atan2(Math.sin(d),Math.cos(d)); if(l<e.d.r+40||Math.abs(d)<half+e.d.r/Math.max(l,1)) fn(e); }); }
function inLine(x0,y0,x1,y1,w,fn){ const dx=x1-x0, dy=y1-y0, L2=dx*dx+dy*dy||1; for(const e of V.en){ if(e.dead) continue; const t=clamp(((e.x-x0)*dx+(e.y-y0)*dy)/L2,0,1), px=x0+dx*t, py=y0+dy*t, rr=w+e.d.r; if((e.x-px)**2+(e.y-py)**2<rr*rr) fn(e); } }
function seq(p,fr,o={}){ const [w,s,h]=fr; plSeq([[p+w,o.w??.035],[p+s,o.s??.05,{tr:1,kick:[2.2,-1.8]}],[p+h,o.h??.12],[p+(o.end||'12'),.06]]); anim.seq.basic=!!o.basic; }
function hitFx(e,c,pw=1){ if(V.fxB<=0) return; V.fxB--; const x=e.x, y=e.y-e.h*.45-e.z;
  gl0(x,y,55*pw,c,.16,{a:.7}); for(let i=0;i<1;i++) spark(x,y,rand(0,TAU),rand(300,900)*pw,{c:Math.random()<.5?'#ffffff':c,life:rand(.12,.25),w:2,g:0});
  if(pw>1.1&&Math.random()<.6) vfx('impact',x,y,{sc:.28*pw,rot:rand(0,TAU)}); }
// crystal fragments that fly up and settle on the floor (deaths, slams)
function burst(x,y,n,o={}){ for(let i=0;i<n;i++){ const a=rand(0,TAU), s=rand(o.s0??300,o.s1??900); V.shards.push({x,y,z:o.z??10,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6,vz:rand(400,o.vz??1100),s:rand(6,o.size??16),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:rand(.8,1.3),rock:o.rock,c:o.c}); } }
// floor ring that sits in the same perspective as the effect GIFs
const fring=(x,y,v,c,life,w=5)=>ring(x,y,v,c,life,{w,sy:FSY});

// ============================================================ damage
function dmg(e,d,o={}){
  if(e.dead) return; const crit=o.crit||Math.random()<.14; if(crit&&!o.crit) d*=1.9; d=Math.round(d*rand(.92,1.08));
  if(e.d.boss&&o.ult) d=Math.min(d,Math.round(e.max*.2));
  e.hp-=d; e.flash=1; e.hurtT=.3; combo++; comboT=2.4; comboPop=1; G.stats.dmg+=d; if(lock){ V.ultSum=(V.ultSum||0)+d; } else if(!crit&&!(e.nn&&V.nums.includes(e.nn))){ e.nnT=RT; } else if(e.nn&&RT-e.nnT<.3&&V.nums.includes(e.nn)){ const n=e.nn; n.v+=d; n.txt=fmtN(n.v); n.crit=n.crit||crit; n.t=Math.min(n.t,.08); } else e.nn=num(e.x,e.y-e.h-e.z,d,crit); e.nnT=RT;
  const sx=o.sx??pl.x, sy=o.sy??pl.gy, dx=e.x-sx, dy=e.y-sy, l=Math.hypot(dx,dy)||1, kb=(o.kb??1)*(e.d.heavy?50:320);
  e.kx+=dx/l*kb; e.ky+=dy/l*kb;
  if(o.launch&&!e.d.heavy) e.vz=Math.max(e.vz,o.launch);
  if(!e.d.heavy||o.big) e.stun=Math.max(e.stun,o.stun??.16);
  if(o.slow) e.slowT=Math.max(e.slowT||0,o.slow);
  if(e.hp<=0) die(e);
}
function die(e){
  e.dead=true; e.hp=0; V.kills++; G.stats.kills++; if(V.dying.length<60){ const fr=eFrame(e); if(fr){ const q={fr,e:{x:e.x,y:e.y,z:e.z,f:e.f,d:e.d},t:0,life:.35}; if(lock&&V.blast){ const dx=e.x-V.blast.x, dy=e.y-V.blast.y, l=Math.hypot(dx,dy)||1, sp=rand(900,1700)*V.blast.p*(e.d.heavy?.4:1); q.vx=dx/l*sp; q.vy=dy/l*sp*.7; q.vz=rand(500,1100); q.spin=rand(-9,9); q.life=.6; } V.dying.push(q); } } const y=e.y-e.h*.4;
  for(let i=0;i<(e.d.heavy?8:2);i++){ const a=rand(0,TAU), s=rand(300,800); V.shards.push({x:e.x,y:e.y,z:e.h*.4,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6,vz:rand(300,900),s:rand(5,e.d.heavy?18:11),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:rand(.7,1.2)}); }
  gl0(e.x,y,e.h*.5,lock?CCOL[pl.cls]:CH().acc,.25,{grow:200,a:gl?.35:.7}); sfx('shatter',e.d.heavy?.8:.35);
  if(lock&&V.fxK!==RT){ V.fxK=RT; vfx('impact',e.x,y,{sc:.5,rot:rand(0,TAU)}); fring(e.x,e.y,700,CCOL[pl.cls],.3,4); }
  if(e.d.boss){ explode(e.x,y,1.6,CH().acc,'#7a1dff'); stamp('브레이크',{x:.5,y:.4,size:.14,life:1.4,c:CH().acc}); V.boss=null; }
  const n=e.d.boss?24:e.d.gem>=5?3:1;
  if(e.d.gem>1||Math.random()<.35) for(let i=0;i<n;i++) gem(e.x+rand(-30,30)*(n>1),e.y+rand(-30,30)*(n>1),Math.ceil(e.d.gem/n)*(e.d.gem>1?1:2));
  if(e.d.heavy&&!e.d.boss){ const r=Math.random(); if(r<.15) V.items.push({k:'heal',x:e.x,y:e.y,t:0}); else if(r<.42) V.items.push({k:'mag',x:e.x,y:e.y,t:0}); }
  if(!lock) V.ug=Math.min(100,V.ug+(e.d.heavy?3:.3));   // what an ultimate kills does not pay for the next one
}
function gem(x,y,v){ if(V.gems.length>420){ V.gems[(Math.random()*V.gems.length)|0].v+=v; return; } V.gems.push({x,y,v,s:0,mag:false,ph:rand(0,TAU)}); }
const fmtN=d=>d>=1e6?(d/1e6).toFixed(d>=1e7?0:1)+'M':d>=1e4?(d/1000).toFixed(d>=1e5?0:1)+'K':String(d);
function num(x,y,d,crit){ if(lock){ V.ultSum=(V.ultSum||0)+d; return null; } if(V.nums.length>=5) V.nums.shift(); const n={x:x+rand(-30,30),y,t:0,v:d,txt:fmtN(d),crit,dx:rand(-60,60)}; { const hx=n.x-pl.x, hy=n.y-(pl.gy-BODY), hl=Math.hypot(hx,hy); if(hl<330){ const k=330/(hl||1); n.x=pl.x+(hl?hx:1)*k; n.y=pl.gy-BODY+hy*k; } } for(const o of V.nums) if(o.t<.4&&Math.abs(o.x-n.x)<170&&Math.abs(o.y-n.y)<60) n.y=o.y-70; V.nums.push(n); return n; }
function hurt(d,src){
  if(V.over||G.inv>0||lock||V.dash||V.god) return;
  const C=CLS[pl.cls]; if(C&&C.onHurt&&C.onHurt(src)) return;
  d=Math.round(d*(V.armor>0?.35:1)); G.hp=Math.max(0,G.hp-d); G.inv=.5; trauma=Math.min(1,trauma+.3); ov.red=.4; post.ca=Math.min(.04,post.ca+.015);
  V.nums.push({x:pl.x,y:pl.gy-BODY*1.8,t:0,txt:'-'+d,hurt:true}); sfx('boom',.5,.5); buzz(40); A.hurtAnim();
  if(G.hp<=0) finish(false);
}
function heal(k){ const h=Math.round(A.maxHp()*k); G.hp=Math.min(A.maxHp(),G.hp+h); V.nums.push({x:pl.x,y:pl.gy-BODY*1.8,t:0,txt:'+'+h,heal:true}); }

// ============================================================ ultimates: shared beats (each class stages its own in sk_<class>.js)
const tdV=(n,x,y,o)=>VFX[n]&&VFX[n].f[0].ok?vfx(n,x,y,o):null;
function onScreen(m=0){ const {hw,hh}=view(); return V.en.filter(e=>!e.dead&&Math.abs(e.x-cam.x)<hw+m&&Math.abs(e.y-BODY*.5-cam.y)<hh+m); }
function ultStart(id){ lock=true; V.ug=0; anim.seq=null; V.dash=null;   /* the stick stays held through the ultimate: he moves again the moment it ends */ ov.lbT=0; V.ultId=id; V.nums.length=0; if(G.sv.cine) G.sv.cine.begin(); }
const stamp1=stamp; stamp=function(t,o={}){ if(G.mode==='surv'&&lock&&!o.keep) return null; return stamp1(t,o); };
function ultStop(){ if(G.sv.cine) G.sv.cine.end(); if(V.ultSum){ V.nums.push({x:pl.x,y:pl.gy-BODY*3.1,t:-.4,txt:fmtN(V.ultSum),big:true}); V.ultSum=0; } lock=false; ov.lbT=0; ov.dimT=0; post.grayT=0; V.zk=1; V.ultTick=null; V.cuts=[]; V.shadow=null; V.ultDraw=null; G.inv=.8; pl.visible=true; pl.target=IDLE(); pl.ps=12; pl.air=pl.airT=0; anim.seq=null; }
function ultHit(e,D,sx,sy){ dmg(e,e.d.boss?D*2:Math.max(D,e.hp*1.05),{crit:true,kb:1.8,big:true,launch:700,sx,sy}); }
// ChatGPT effect GIFs (frames from _gen/td_export.py / fx_export.py); ix/iy = impact point, hit = impact frame
function addVfx(name,m){ if(VFX[name]) return; const v=VFX[name]={...m,f:[]}; for(let i=1;i<=v.n;i++) v.f.push(loadSpr('vfx_'+name+A.fr2(i),{})); }
const TD_VFX={"td_cutline":{"n":12,"ms":50,"w":533,"h":182,"cx":0.5,"cy":0.53},"td_zeroburst":{"n":12,"ms":50,"w":354,"h":352,"cx":0.5,"cy":0.5},"td_circle":{"n":16,"ms":70,"w":299,"h":300,"cx":0.5,"cy":0.508},"td_swordfall":{"n":12,"ms":50,"w":367,"h":330,"cx":0.499,"cy":0.5,"ix":0.499,"iy":0.895,"hit":4},"td_colossal":{"n":14,"ms":60,"w":300,"h":301,"cx":0.5,"cy":0.5,"ix":0.5,"iy":0.87,"hit":3}};   // printed by _gen/td_export.py
const FX_VFX={"fx_fist_aura":{"n":12,"ms":60,"w":330,"h":239,"cx":0.491,"cy":0.586,"ix":0.491,"iy":0.586,"hit":0},"fx_fist_barrage":{"n":12,"ms":40,"w":430,"h":281,"cx":0.497,"cy":0.507,"ix":0.037,"iy":0.507,"hit":0},"fx_fist_kiball":{"n":12,"ms":60,"w":414,"h":194,"cx":0.506,"cy":0.536,"ix":0.803,"iy":0.536,"hit":0},"fx_fist_shock":{"n":12,"ms":50,"w":352,"h":340,"cx":0.5,"cy":0.518,"ix":0.5,"iy":0.57,"hit":3},"fx_fist_sunblast":{"n":14,"ms":60,"w":289,"h":289,"cx":0.502,"cy":0.505,"ix":0.502,"iy":0.804,"hit":4},"fx_fist_tornado":{"n":12,"ms":50,"w":331,"h":315,"cx":0.474,"cy":0.546,"ix":0.474,"iy":1.057,"hit":0},"fx_mage_field":{"n":12,"ms":60,"w":344,"h":340,"cx":0.494,"cy":0.5},"fx_mage_megabolt":{"n":14,"ms":50,"w":230,"h":343,"cx":0.496,"cy":0.5,"ix":0.496,"iy":0.879,"hit":4},"fx_mage_meteor":{"n":14,"ms":60,"w":281,"h":285,"cx":0.496,"cy":0.498,"ix":0.496,"iy":0.768,"hit":6},"fx_mage_nova":{"n":12,"ms":50,"w":339,"h":339,"cx":0.499,"cy":0.501},"fx_mage_orb":{"n":12,"ms":60,"w":307,"h":290,"cx":0.479,"cy":0.541},"fx_mage_star":{"n":12,"ms":50,"w":372,"h":317,"cx":0.495,"cy":0.486,"ix":0.495,"iy":0.836,"hit":6},"fx_mage_vortex":{"n":16,"ms":60,"w":277,"h":273,"cx":0.482,"cy":0.515},"fx_pyro_breath":{"n":12,"ms":50,"w":431,"h":256,"cx":0.5,"cy":0.545,"ix":0.021,"iy":0.545,"hit":0},"fx_pyro_dragon":{"n":12,"ms":60,"w":422,"h":183,"cx":0.5,"cy":0.522,"ix":0.552,"iy":0.442,"hit":0},"fx_pyro_nova":{"n":14,"ms":50,"w":293,"h":292,"cx":0.5,"cy":0.5},"fx_pyro_pillar":{"n":12,"ms":50,"w":371,"h":317,"cx":0.493,"cy":0.525,"ix":0.493,"iy":0.95,"hit":3},"fx_pyro_ring":{"n":12,"ms":50,"w":344,"h":347,"cx":0.494,"cy":0.493},"fx_pyro_tornado":{"n":12,"ms":50,"w":352,"h":307,"cx":0.497,"cy":0.529,"ix":0.497,"iy":0.99,"hit":0},"fx_shaman_palm":{"n":14,"ms":60,"w":287,"h":287,"cx":0.5,"cy":0.49,"ix":0.5,"iy":0.813,"hit":6},"fx_shaman_rock":{"n":12,"ms":50,"w":367,"h":328,"cx":0.499,"cy":0.503,"ix":0.499,"iy":0.81,"hit":5},"fx_shaman_seal":{"n":16,"ms":60,"w":286,"h":286,"cx":0.498,"cy":0.505},"fx_shaman_spike":{"n":12,"ms":50,"w":340,"h":281,"cx":0.491,"cy":0.53,"ix":0.491,"iy":0.976,"hit":3},"fx_shaman_wisp":{"n":12,"ms":60,"w":400,"h":198,"cx":0.506,"cy":0.518,"ix":0.836,"iy":0.518,"hit":0},"fx_shaman_wolf":{"n":12,"ms":60,"w":394,"h":204,"cx":0.506,"cy":0.512,"ix":0.506,"iy":0.655,"hit":0}};   // printed by _gen/fx_export.py
for(const [k,m] of Object.entries({...TD_VFX,...FX_VFX})) addVfx(k,m);
// an impact GIF placed so its impact frame lands `at` seconds from now; returns the delay until the hit
function dropFx(name,x,y,height,at=0,o={}){ const K=VFX[name]; if(!K||!K.f[0].ok) return null; const lead=(K.hit||0)*K.ms/1000;
  if(o.shadow) V.shads.push({x,y,t0:RT+Math.max(0,at-lead),dur:lead,r:o.shadow});
  after(Math.max(0,at-lead),()=>vfx(name,x,y,{px:K.ix??K.cx,py:K.iy??K.cy,sc:height/K.h,...o})); return Math.max(at,lead); }

// ============================================================ spawning
function spawnPos(){ const {hw,hh}=view(), mx=hw+130, my=hh+200, p=rand(0,2*(mx+my)); let x,y;
  if(p<2*mx){ x=p-mx; y=Math.random()<.5?-my:my; } else { y=p-2*mx-my; x=Math.random()<.5?-mx:mx; }
  return [cam.x+x,cam.y+y]; }
function spawn(type,x,y){ const d=EN[type]; if(x==null) [x,y]=spawnPos();
  const e={id:V.id++,type,d,x,y,z:0,sv:rand(.9,1.1),vz:0,kx:0,ky:0,hp:d.hp*hm(),max:d.hp*hm(),h:d.h*d.sc,f:1,walkT:rand(0,1),flash:0,stun:0,hitCd:0,hurtT:0,atk:rand(1,2.5),castT:0,dead:false};
  V.en.push(e); return e; }
function spawnTick(rdt){
  const t=V.t, n=alive().length, ch=V.ch;
  // they come in packs from just off screen: more packs, and bigger ones, as time goes on
  V.spawn+=rdt*(.9+t*.03+ch*.15); let live=n;
  while(V.spawn>=1){ V.spawn--; const [px,py]=spawnPos(), k=3+Math.floor(t/60)+(Math.random()*3|0);
    for(let i=0;i<k&&live<CAP;i++,live++){ const r=Math.random(); spawn(t>60-ch*10&&r<.05+t/4000+ch*.015?'brute':t>25-ch*5&&r<.2+ch*.03?'archer':'shard',px+rand(-90,90),py+rand(-90,90)); } }
  // encircling hordes every minute, then the boss
  const hz=[50,110,170,230];
  if(V.horde<hz.length&&t>=hz[V.horde]){ V.horde++; const {hw,hh}=view(), R=Math.max(hw,hh)+150, k=Math.round(26+t/7);
    for(let i=0;i<k;i++){ const a=i/k*TAU+rand(-.09,.09), r=R*rand(.88,1.15); spawn(t>150&&i%6===0?'brute':'shard',pl.x+Math.cos(a)*r,pl.gy+Math.sin(a)*r*.75); }
    stamp('호드',{x:.5,y:.28,size:.1,life:1.1,c:'#ff4a6a'}); sfx('siren',.8); }
  if(!V.bossDone&&t>=BOSS_T){ V.bossDone=true; V.boss=spawn('boss'); warn={t:0,dur:1.8}; SFX.siren(1.6); stamp(CH().boss,{x:.5,y:.3,size:.12,life:1.6,c:CH().acc}); }
}

// ============================================================ per-frame
function input(){ let x=(V.keys.r?1:0)-(V.keys.l?1:0), y=(V.keys.d?1:0)-(V.keys.u?1:0);
  if(V.joy){ const l=Math.hypot(V.joy.dx,V.joy.dy); if(l>6){ const m=Math.min(1,(l-6)/28); x=V.joy.dx/l*m; y=V.joy.dy/l*m; } } /* full speed a third of the way out: no long throw */
  const l=Math.hypot(x,y); return l>1?[x/l,y/l]:[x,y]; }
function pre(rdt){
  const dt=hitstop>0?0:rdt*timeScale;
  if(lock||V.over){ if(lock&&V.ultTick) V.ultTick(rdt); G.pose=null; return; }
  GROUND=FAR;
  G.inv=Math.max(0,G.inv-rdt); V.armor=(V.armor||0)-rdt; V.fxB=14;
  for(const k in V.cd) V.cd[k]=Math.max(0,V.cd[k]-rdt); V.gcd-=rdt; V.bcd-=rdt;
  // movement (a dash or leap tweens the hero instead)
  const [mx,my]=input(); V.steer=!!(mx||my); if(V.dash&&V.dash.soft&&V.steer) V.dash=null; const moving=!V.dash&&(mx||my);
  if(V.dash){ const D=V.dash; D.t+=rdt; const k=Math.min(1,D.t/D.dur), x=lerp(D.x0,D.x1,k), y=lerp(D.y0,D.y1,k), dx=x-pl.x, dy=y-pl.gy;
    pl.x=x; pl.gy=y; for(const p of [...pl.scarf,...pl.coat]){ p.x+=dx; p.y+=dy; if(p.px!=null){ p.px+=dx; p.py+=dy; } } if(k>=1) V.dash=null; }
  else if(moving){ pl.x+=mx*SPD*dt; pl.gy+=my*SPD*.86*dt; if(!anim.seq&&Math.abs(mx)>.1){ const f=mx>0?1:-1; if(f!==pl.f){ pl.f=f; anim.bv-=1.4; anim.cv+=1.6; } } /* turning throws the trunk and the cloth */
    V.stepT=(V.stepT||0)+rdt*Math.hypot(mx,my); if(V.stepT>.3){ V.stepT=0; smoke(pl.x-mx*24,pl.gy+2,rand(12,18),{vx:-mx*70,vy:-my*40-10,a:.28,life:.45,grow:24}); } }
  if(V.wasMv&&!moving&&!anim.seq) anim.bv+=1.1; V.wasMv=!!moving;
  V.leanHold=(V.leanHold||0)-rdt; if(V.leanHold<=0) V.leanT=moving?my*.05*pl.f:0; V.lean=lerp(V.lean||0,V.leanT||0,1-Math.exp(-rdt*16)); /* stopping: the weight catches up */
  if(V.boss&&!V.boss.dead){ /* the boss is a wall, not a ghost */ const b=V.boss, dx=pl.x-b.x, dy=pl.gy-b.y, l=Math.hypot(dx,dy)||1, m=b.d.r+50; if(l<m){ pl.x=b.x+dx/l*m; pl.gy=b.y+dy/l*m; } }
  if(!(anim.seq&&anim.seq.steps.some(s=>s[2]&&s[2].air))) pl.airT=0;   // only a leap holds him in the air
  G.jz=0; G.pose=A.locoPose(rdt*(.5+.62*Math.hypot(mx,my)),moving&&!anim.seq);   // painted run cycle (falls back to the idle loop where a class has none)
  pl.home=pl.x;
  // auto attacks: the basic, then any equipped skill that is ready and has a target
  const C=CLS[pl.cls]; if(!C) return;
  if(V.bcd<=0&&(!anim.seq||anim.seq.basic)&&C.basic.fn()) V.bcd=C.basic.cd();
  if(V.gcd<=0&&(!anim.seq||anim.seq.basic)) for(const id of ACT()){ if((V.cd[id]||0)>0) continue; const s=C.skills[id]; if(!s||s.passive||(s.moves&&V.steer)) continue; /* a skill that carries the hero off waits while the player is steering */
    if(s.fn(id)!==false){ V.cd[id]=A.cdOf(id); V.gcd=.3; V.bcd=Math.max(V.bcd,.25); break; } }
  E.dead=false; E.hp=E.max; E.respawn=1e9; E.x=pl.x+FAR;
  const uid=SV().ult; if(uid&&A.unlocked(uid)&&V.ug>=100&&(countIn(1500)>=8||(V.boss&&!V.boss.dead))&&C.ults[uid]) C.ults[uid](uid);
}
function post(rdt){
  const dt=hitstop>0?0:rdt*timeScale;
  document.body.classList.toggle('cine',lock);
  for(let i=V.nums.length-1;i>=0;i--){ const n=V.nums[i]; n.t+=rdt; n.y-=90*rdt; n.x+=(n.dx||0)*rdt; if(n.t>(n.big?1.6:.75)) V.nums.splice(i,1); }
  for(let i=V.dying.length-1;i>=0;i--){ V.dying[i].t+=rdt; if(V.dying[i].t>V.dying[i].life) V.dying.splice(i,1); }
  for(let i=V.shards.length-1;i>=0;i--){ const s=V.shards[i]; s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt; s.vz-=2600*dt; s.z+=s.vz*dt; s.rot+=s.vr*dt; if(s.z<0){ s.z=0; s.vz*=-.3; s.vx*=.5; s.vy*=.5; } if(s.t>s.life) V.shards.splice(i,1); }
  if(lock){ const kd=Math.exp(-rdt*8); for(const e of V.en){ if(e.dead) continue; e.flash=Math.max(0,e.flash-rdt*6); e.hurtT-=rdt; e.x+=e.kx*rdt; e.y+=e.ky*rdt; e.kx*=kd; e.ky*=kd; if(e.z>0||e.vz>0){ e.vz-=3000*rdt; e.z+=e.vz*rdt; if(e.z<=0){ e.z=0; e.vz=0; } } } V.en=V.en.filter(e=>!e.dead); return; }
  if(!V.over){ V.t+=rdt; if(V.t>=DUR) finish(true); spawnTick(rdt); }
  stepEnemies(dt); stepOrbs(dt); stepZones(dt); stepProj(dt); if(!V.over) stepPickups(dt);
  for(let i=V.mk.length-1;i>=0;i--){ const m=V.mk[i]; m.t+=dt; if(m.t>=m.dur){ V.mk.splice(i,1); spike(m); } }
  // persistent EXP is banked in batches (each bank saves)
  V.accT-=rdt; if(V.acc>0&&V.accT<=0){ const lv=SV().lv; A.gainExp(V.acc); V.run+=V.acc; V.acc=0; V.accT=.5;
    if(SV().lv>lv){ fring(pl.x,pl.gy,1400,'#ffcf4a',.6,7); gl0(pl.x,pl.gy-BODY,260,'#ffcf4a',.5,{grow:300,a:.6}); buildBar(); } }
  V.en=V.en.filter(e=>!e.dead);
  hud();
}
function stepEnemies(dt){
  if(dt<=0) return; const {hw,hh}=view(), far=Math.max(hw,hh)*2.6, mul=1+V.t/600;
  for(const e of V.en){ if(e.dead) continue; const D=e.d;
    e.flash=Math.max(0,e.flash-dt*6); e.hitCd-=dt; e.hurtT-=dt; e.castT-=dt; e.orbT=(e.orbT||0)-dt; e.slowT=(e.slowT||0)-dt;
    e.x+=e.kx*dt; e.y+=e.ky*dt; const kd=Math.exp(-dt*8); e.kx*=kd; e.ky*=kd;
    if(e.pull){ const dx=e.pull.x-e.x, dy=e.pull.y-e.y, l=Math.hypot(dx,dy)||1, s=Math.min(l,e.pull.s*dt)*(D.heavy?.3:1); e.x+=dx/l*s; e.y+=dy/l*s; e.pull=null; }
    if(e.z>0||e.vz>0){ e.vz-=3000*dt; e.z+=e.vz*dt; if(e.z<=0){ e.z=0; e.vz=0; } }
    if(e.stun>0){ e.stun-=dt; e.swing=0; continue; }
    const dx=pl.x-e.x, dy=pl.gy-e.y, l=Math.hypot(dx,dy)||1; if(Math.abs(dx)>4) e.f=dx>0?1:-1;
    if(!D.boss&&l>far){ const [x,y]=spawnPos(); e.x=x; e.y=y; continue; }
    if(V.over) continue;
    let go=1;
    if(D.ranged){ go=l>560?1:l<380?-1:0; e.atk-=dt; if(e.atk<=0&&l<760){ e.atk=rand(2.4,3.4); e.castT=.55;
        after(.3,()=>{ if(e.dead||G.mode!=='surv') return; const a=Math.atan2(pl.gy-e.y,pl.x-e.x); V.pj.push({orb:true,x:e.x+Math.cos(a)*40,y:e.y+Math.sin(a)*40,vx:Math.cos(a)*520,vy:Math.sin(a)*520,life:3.2,dmg:D.dmg}); sfx('whoosh',1.6,.2); }); } }
    if(D.boss){ e.atk-=dt; if(e.atk<=0){ e.atk=3; e.castT=.9; const n=V.t>270?5:3;
        for(let i=0;i<n;i++){ const a=rand(0,TAU), r=i?rand(140,320):0; V.mk.push({x:pl.x+Math.cos(a)*r,y:pl.gy+Math.sin(a)*r,t:-i*.1,dur:1,r:170,dmg:D.dmg*1.2}); } sfx('click'); } }
    if(e.castT>0&&!D.ranged) go=.2;
    const sp=D.spd*mul*go*(e.z>0?0:1)*(e.slowT>0?.4:1); e.x+=dx/l*sp*dt; e.y+=dy/l*sp*dt; e.walkT+=Math.abs(go)*dt*(e.slowT>0?.4:1);
    const lf=Math.hypot(dx,dy/FSY), reach=Math.max(50+D.r,140); if(e.hurtT>0) e.swing=0;
    if(e.swing>0){ e.swing-=dt; if(e.swing<=0&&e.z<60&&Math.hypot(pl.x-e.x,(pl.gy-e.y)/FSY)<reach+40) hurt(D.dmg*dm(),e); }
    else if(lf<reach&&e.z<60&&e.hitCd<=0){ if(D.ranged||D.boss){ e.hitCd=.9; hurt(D.dmg*dm(),e); } else { e.hitCd=1.2; e.swing=.32; e.castT=.55; } }
  }
  // spread the crowd (spatial hash) and keep it off the hero
  const C=120, g=new Map(), key=(x,y)=>x*65536+y;
  for(const e of V.en){ if(e.dead) continue; const k=key(Math.floor(e.x/C),Math.floor(e.y/C)); let L=g.get(k); if(!L) g.set(k,L=[]); L.push(e); }
  for(const e of V.en){ if(e.dead) continue; const cx=Math.floor(e.x/C), cy=Math.floor(e.y/C);
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ const L=g.get(key(cx+i,cy+j)); if(!L) continue;
      for(const o of L){ if(o.id<=e.id) continue; const dx=o.x-e.x, dy=(o.y-e.y)/FSY, m=(e.d.r+o.d.r)*1.05, d2=dx*dx+dy*dy; if(d2>=m*m||d2<1e-4) continue;
        const d=Math.sqrt(d2), p=(m-d)*.5*Math.min(1,dt*16), ux=dx/d, uy=dy/d, we=e.d.heavy?.2:1, wo=o.d.heavy?.2:1;
        e.x-=ux*p*we; e.y-=uy*p*we*FSY; o.x+=ux*p*wo; o.y+=uy*p*wo*FSY; } }
    const dx=e.x-pl.x, dy=(e.y-pl.gy)/FSY, m=Math.max(e.d.r+34,125), d2=dx*dx+dy*dy; if(d2<m*m&&!e.d.boss){ const d=Math.sqrt(d2)||1; e.x=pl.x+dx/d*m; e.y=pl.gy+dy/d*m*FSY; } }
}
// things circling the hero: {a,life,d,v (effect follow point),fx,R,w,hitR,c,h,hit(e,o)}
function stepOrbs(dt){
  for(let i=V.orbs.length-1;i>=0;i--){ const o=V.orbs[i]; o.t=(o.t||0)+dt; o.a+=dt*(o.w??4.2); const R=o.R??270, x=pl.x+Math.cos(o.a)*R, y=pl.gy+Math.sin(o.a)*R*.8;
    o.x=x; o.y=y; o.v.x=x; o.v.y=y-(o.h??BODY*.7); if(o.fx&&o.rot!==false) o.fx.rot=o.a+Math.PI/2;
    if(Math.random()<.5) gl0(o.v.x,o.v.y,rand(10,20),o.c||'#ffcf4a',.25,{a:.6});
    inCircleS(x,y,o.hitR??70,e=>{ if((e.orbT||0)>0) return; e.orbT=.3; dmg(e,o.d,{kb:.6,sx:pl.x,sy:pl.gy}); hitFx(e,o.c||'#ffcf4a',.9); if(o.hit) o.hit(e,o); else sfx('slash',1.6,.3); });
    if(o.t>=o.life){ if(o.fx) o.fx.life=0; V.orbs.splice(i,1); } }
}
// lasting areas: {x,y,r,life,tick,fn(e,z),follow,onTick(z),onEnd(z),fx}
function stepZones(dt){
  for(let i=V.zones.length-1;i>=0;i--){ const z=V.zones[i]; z.t=(z.t||0)+dt; z.acc=(z.acc||0)+dt;
    if(z.follow){ z.x=pl.x; z.y=pl.gy; } if(z.v){ z.v.x=z.x; z.v.y=z.y-(z.h||0); }
    while(z.acc>=z.tick){ z.acc-=z.tick; if(z.fn) inCircle(z.x,z.y,z.r,e=>z.fn(e,z)); if(z.onTick) z.onTick(z); }
    if(z.t>=z.life){ if(z.fx) z.fx.life=0; if(z.onEnd) z.onEnd(z); V.zones.splice(i,1); } }
}
// projectiles: enemy orbs ({orb}) and the hero's ({d,r,hits:Set when it pierces,home,turn,onHit,onEnd,v,c,h})
function stepProj(dt){
  for(let i=V.pj.length-1;i>=0;i--){ const p=V.pj[i]; p.life-=dt;
    if(p.home!==undefined){ if(!p.home||p.home.dead) p.home=nearest(1100)||null;
      if(p.home){ const sp=Math.hypot(p.vx,p.vy), a0=Math.atan2(p.vy,p.vx), a1=Math.atan2(p.home.y-p.y,p.home.x-p.x); let da=Math.atan2(Math.sin(a1-a0),Math.cos(a1-a0)); da=clamp(da,-(p.turn||8)*dt,(p.turn||8)*dt); const a=a0+da; p.vx=Math.cos(a)*sp; p.vy=Math.sin(a)*sp; } }
    p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.v){ p.v.x=p.x; p.v.y=p.y-(p.h??BODY); } if(p.fx&&p.spin!==false){ p.fx.rot=Math.atan2(p.vy,p.vx)+(p.rot0||0); if(p.flipY) p.fx.sy=p.vx<0?-1:1; }
    if(p.orb){ if(!V.over&&Math.hypot(p.x-pl.x,p.y-pl.gy)<55){ hurt(p.dmg*dm(),p); gl0(p.x,p.y-BODY,80,'#b06bff',.2); p.life=0; } }
    else { inCircleS(p.x,p.y,p.r??90,e=>{ if(p.life<=0) return; if(p.hits){ if(p.hits.has(e)) return; p.hits.add(e); }
        if(p.d) dmg(e,p.d,{kb:p.kb??.8,sx:p.x-p.vx,sy:p.y-p.vy,stun:p.stun,slow:p.slow}); hitFx(e,p.c||'#ffffff',p.pw||1); if(p.onHit) p.onHit(e,p); if(!p.hits) p.life=0; });
      if(p.c&&p.v&&Math.random()<.6) gl0(p.v.x,p.v.y+rand(-30,30),rand(8,16),p.c,.25,{a:.6}); }
    if(p.life<=0){ if(p.fx) p.fx.life=0; if(p.onEnd) p.onEnd(p); V.pj.splice(i,1); } }
}
function stepPickups(dt){
  const R=V.mag>0?1e5:320; V.mag-=dt;
  for(let i=V.gems.length-1;i>=0;i--){ const g=V.gems[i], dx=pl.x-g.x, dy=pl.gy-g.y, l=Math.hypot(dx,dy)||1;
    if(!g.mag&&l<R) g.mag=true;
    if(g.mag){ g.s+=(V.mag>0?4000:2600)*dt; g.x+=dx/l*Math.min(l,g.s*dt); g.y+=dy/l*Math.min(l,g.s*dt); }
    if(l<50){ V.acc+=g.v; V.gems.splice(i,1); sfx('click'); } }
  for(let i=V.items.length-1;i>=0;i--){ const it=V.items[i]; it.t+=dt; if(Math.hypot(pl.x-it.x,pl.gy-it.y)>80) continue; V.items.splice(i,1);
    if(it.k==='heal'){ heal(.25); gl0(pl.x,pl.gy-BODY,200,'#55ff9a',.5,{grow:200,a:.6}); sfx('rise',.5,.4); }
    else { V.mag=1.2; fring(pl.x,pl.gy,2400,'#55ddff',.6,6); sfx('rise',.7,.5); } }
}
function spike(m){ fring(m.x,m.y,800,'#c06bff',.35,6); gl0(m.x,m.y-80,160,'#b06bff',.3,{a:.7}); sfx('shatter',.4); burst(m.x,m.y,8,{s0:100,s1:400,vz:1300,size:18});
  if(Math.hypot(pl.x-m.x,pl.gy-m.y)<m.r+30) hurt(m.dmg*dm(),m); }

// whole-screen flashes are capped so an ultimate never washes the field to white
function post_cap(){ post.flash=Math.min(post.flash,G.sv.cine?G.sv.cine.flashCap:.22); ov.dimT=Math.min(ov.dimT,.3); }
const dps1=drawPlSpr; drawPlSpr=function(g,mul){ if(G.mode!=='surv'||lock||Math.abs(V.lean||0)<.004) return dps1(g,mul); const s=plFrame(), b=plSprBox(s); g.save(); g.translate(b.cx,b.base-b.h*.35); g.rotate(V.lean); g.translate(-b.cx,-(b.base-b.h*.35)); dps1(g,mul); g.restore(); };
const dp1=drawParts; drawParts=function(L){ dp1(L); if(L===2&&G.mode==='surv'&&pl.visible&&plSprites()){ fx.save(); fx.globalCompositeOperation='destination-out'; drawPlSpr(fx,.9); fx.restore(); fx.globalCompositeOperation='lighter'; } };
const upd1=update;
update=function(rdt){ if(G.mode!=='surv') return upd1(rdt); if(G.paused) return;
  pre(rdt); upd1(rdt); post(rdt); post_cap(); window.BLOOMK=.55;
  const k=1-Math.exp(-rdt*(V.camT&&V.camK||9)), ct=lock&&V.camT; cam.ft=99; cam.fx=ct?ct.x:pl.x; cam.fy=ct?ct.y:pl.gy-BODY*.6; cam.fz=(PORTRAIT?ZP:ZL)*(V.zk||1); cam.x=lerp(cam.x,cam.fx,k); cam.y=lerp(cam.y,cam.fy,k); };
const respawn1=respawn; respawn=function(){ if(G.mode==='surv') return; return respawn1(); };
// the hero is drawn 1.3x in survival so he reads above the crowd (his anchors scale with him)
const box1=plSprBox; plSprBox=function(s){ const b=box1(s); if(G.mode==='surv'){ const k=V.hsc||1; b.h*=k; b.w*=k; } return b; };
// floor-warping shockwaves stay small on this camera (big ones read as a fisheye bug)
const shock1=shock; shock=function(x,y,s=1,spd){ if(G.mode==='surv') return; return shock1(x,y,s,spd); };

// ============================================================ drawing
let floorPat=null, floorCh=-1;
const FLOORIM=new Image(); let floorArt=false; FLOORIM.onload=()=>{ /* the flat drawn tile read as a downgrade: kept on disk, not used */ }; FLOORIM.src='assets/fx2_floor.webp?v='+ASSET_V;
function floor(){ if(floorPat&&floorCh===V.ch) return floorPat; floorCh=V.ch;
  if(floorArt){ const cv=document.createElement('canvas'); cv.width=cv.height=1280; const g=cv.getContext('2d'), [fr,fg,fb]=CH().floor;
    for(let i=0;i<2;i++) for(let j=0;j<2;j++){ g.save(); g.translate(i?1280:0,j?1280:0); g.scale(i?-1:1,j?-1:1); g.drawImage(FLOORIM,0,0,640,640); g.restore(); }
    g.globalCompositeOperation='multiply'; g.fillStyle=`rgb(${Math.min(255,fr*1.75)|0},${Math.min(255,fg*1.75)|0},${Math.min(255,fb*1.75)|0})`; g.fillRect(0,0,1280,1280); g.globalCompositeOperation='source-over';
    return floorPat=ctx.createPattern(cv,'repeat'); }
  const N=4, T_=160, cv=document.createElement('canvas'); cv.width=cv.height=N*T_; const g=cv.getContext('2d'), [fr,fg,fb]=CH().floor;
  let sd=7; const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  g.fillStyle=`rgb(${fr*.82|0},${fg*.82|0},${fb*.82|0})`; g.fillRect(0,0,cv.width,cv.height);
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){ const x=i*T_, y=j*T_, v=rnd();
    g.fillStyle=`rgb(${fr+v*10|0},${fg+v*8|0},${fb+v*10|0})`; g.fillRect(x+1,y+1,T_-2,T_-2);
    for(let k=0;k<70;k++){ const a=rnd(), sx=x+rnd()*T_, sy=y+rnd()*T_, sr=1+rnd()*5; g.fillStyle=a<.5?`rgba(0,0,0,${.05+rnd()*.08})`:`rgba(255,255,255,${.02+rnd()*.04})`; g.beginPath(); g.ellipse(sx,sy,sr*(1+rnd()*2),sr,rnd()*3,0,TAU); g.fill(); }
    g.fillStyle='rgba(255,255,255,.025)'; g.fillRect(x+1,y+1,T_-2,1);
    if(rnd()<.35){ g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=1.5; g.beginPath(); let cx=x+rnd()*T_, cy=y+rnd()*T_; g.moveTo(cx,cy); for(let k=0;k<4;k++){ cx+=rnd()*60-30; cy+=rnd()*60-30; g.lineTo(clamp(cx,x+4,x+T_-4),clamp(cy,y+4,y+T_-4)); } g.stroke(); }
    if(rnd()<.18){ const cx=x+20+rnd()*(T_-40), cy=y+20+rnd()*(T_-40), s=4+rnd()*6; g.fillStyle=hexA(CH().acc,.22); g.beginPath(); g.moveTo(cx,cy-s*2); g.lineTo(cx+s,cy); g.lineTo(cx,cy+s*.6); g.lineTo(cx-s,cy); g.closePath(); g.fill(); } }
  return floorPat=ctx.createPattern(cv,'repeat'); }
const prep1=drawBackground_prep;
drawBackground_prep=function(){ prep1(); if(G.mode!=='surv') return;
  applyCam(ctx); const {hw,hh}=view(), m=1.3, p=floor(); p.setTransform(new DOMMatrix().translate(V.ox%(floorArt?1280:640),V.oy%(floorArt?1280:640)).scale(1,FSY));   // tiles foreshortened like the effects' floor rings
  ctx.fillStyle=p; ctx.fillRect(cam.x-hw*m,cam.y-hh*m,hw*2*m,hh*2*m);
  const cs=spr('crystal'), Cg=520; if(cs){ const i0=Math.floor((cam.x-hw*1.2)/Cg), i1=Math.floor((cam.x+hw*1.2)/Cg), j0=Math.floor((cam.y-hh*1.2)/Cg), j1=Math.floor((cam.y+hh*1.3)/Cg), im=tinted(cs,150);
    for(let i=i0;i<=i1;i++) for(let j=j0;j<=j1;j++){ const h=Math.abs(Math.sin(i*127.1+j*311.7)*43758.5453)%1; if(h>.42) continue; const x=(i+.2+h*1.4)*Cg, y=(j+.3+((h*7)%1)*.5)*Cg;
      for(let k=0;k<3;k++){ const s=(60+((h*13+k*.37)%1)*70)*(k?.6:1), dx=(k-1)*s*.55, w=s*cs.w/cs.h; ctx.globalAlpha=.4; ctx.drawImage(im,x+dx-w/2,y-s,w,s); }
      ctx.globalAlpha=1; ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x,y,70,20,0,0,TAU); ctx.fill(); glow(fx,x,y-50,70,'#7fe0d0',.06); } }
  ctx.setTransform(1,0,0,1,0,0); };
const bg1=drawBackground; drawBackground=function(){ if(G.mode!=='surv') return bg1(); };

// chapter colours: the enemy frames recoloured once per chapter (a hue-rotate matrix on the pixels, so it works where canvas filters do not)
const TINT=new Map();
function tinted(s,extra=0){ const c=CH(), hue=c.hue+extra; let m=TINT.get(s); if(m&&m.ch===V.ch) return m.cv;
  const cv=document.createElement('canvas'); cv.width=s.w; cv.height=s.h; const g=cv.getContext('2d'); g.drawImage(s.im,0,0);
  const D=g.getImageData(0,0,s.w,s.h), p=D.data, a=Math.cos(hue*Math.PI/180), b=Math.sin(hue*Math.PI/180), k=c.bri*1.2;
  const M=[.213+.787*a-.213*b,.715-.715*a-.715*b,.072-.072*a+.928*b,.213-.213*a+.143*b,.715+.285*a+.140*b,.072-.072*a-.283*b,.213-.213*a-.787*b,.715-.715*a+.715*b,.072+.928*a+.072*b];
  const sat=extra?1:(c.sat??1);
  for(let i=0;i<p.length;i+=4){ if(!p[i+3]) continue; const r=p[i], gg=p[i+1], bb=p[i+2];
    let R=(M[0]*r+M[1]*gg+M[2]*bb)*k, Gg=(M[3]*r+M[4]*gg+M[5]*bb)*k, B=(M[6]*r+M[7]*gg+M[8]*bb)*k; const l=.3*R+.59*Gg+.11*B; p[i]=l+(R-l)*sat; p[i+1]=l+(Gg-l)*sat; p[i+2]=l+(B-l)*sat; }
  g.putImageData(D,0,0);
  TINT.set(s,{ch:V.ch,cv}); return cv; }
const RIMC=()=>{ const n=parseInt(CH().acc.slice(1),16), m=v=>Math.round(v+(255-v)*.55); return `rgb(${m(n>>16&255)},${m(n>>8&255)},${m(n&255)})`; };
function eFrame(e){ const F=A.EFR[e.d.img]; if(!F) return null; let a='walk', i=0;
  if(F.hurt&&(e.z>0||e.stun>0||e.hurtT>0)){ a='hurt'; const n=F.hurt.length; i=e.z>0?2:Math.min(n-1,Math.floor((1-Math.max(0,e.hurtT)/.3)*n)); }
  else if(F.attack&&e.castT>0){ a='attack'; const dur=e.d.boss?.9:.55; i=clamp(Math.floor((1-e.castT/dur)*F.attack.length),0,F.attack.length-1); }
  else { const n=F.walk.length-1, k=Math.floor(e.walkT/(e.d.heavy?.14:.1))%n; i=1+k; }
  const L=F[a], s=L&&spr(`enemy_${e.d.img}_${a}${A.fr2(i+1)}`); return s?{s,d:L[i]}:null; }
function drawE(e){ const D=e.d, sc=D.sc, x=e.x, y=e.y, fr=eFrame(e), ac=CH().acc;
  ctx.fillStyle='rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(x,y+2,D.r*1.55*(1-Math.min(.5,e.z/600)),D.r*.55,0,0,TAU); ctx.fill();
  if(fr){ const [fw,fh,fa]=fr.d; ctx.save(); ctx.translate(x,y-e.z+4); ctx.scale(e.f*sc*e.sv,sc*e.sv); if(e.z>0) ctx.rotate(-.3); ctx.drawImage(tinted(fr.s,D.img==='brute'?55:0),-fa*fw,-fh,fw,fh); ctx.restore(); }
  else { ctx.fillStyle='#3d1458'; ctx.beginPath(); ctx.ellipse(x,y-e.h*.5-e.z,D.r,e.h*.5,0,0,TAU); ctx.fill(); }
  if(e.flash>0) glow(fx,x,y-e.h*.5-e.z,e.h*.45,'#ffffff',e.flash*.55);
  if(e.slowT>0) glow(fx,x,y-e.h*.4,e.h*.4,'#9ff7ff',.35);
  if(D.heavy&&!lock){ glow(fx,x,y-6,D.r*1.4,ac,.2); fx.strokeStyle=hexA('#ff9a3a',.55); fx.lineWidth=4; fx.beginPath(); fx.ellipse(x,y,D.r*1.5*e.sv,D.r*1.5*e.sv*FSY,0,0,TAU); fx.stroke();
    if(!D.boss&&e.hp<e.max){ const bw=D.r*1.6, by=y-e.h-e.z-20; ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(x-bw/2-2,by-2,bw+4,10); ctx.fillStyle='#ff3d5a'; ctx.fillRect(x-bw/2,by,bw*e.hp/e.max,6); } }
  if(e.castT>0&&D.ranged) glow(fx,x+e.f*30,y-e.h*.7,40,ac,.8);
  if(e.swing>0){ const k=1-e.swing/.32; fx.strokeStyle=hexA('#ff3344',.35+.6*k); fx.lineWidth=5+5*k; fx.beginPath(); fx.ellipse(x,y,(D.r+70)*(.6+.4*k),(D.r+70)*(.6+.4*k)*FSY,0,0,TAU); fx.stroke(); glow(fx,x+e.f*34,y-e.h*.55,50,'#ff3344',.5*k); } }
const drawEnemy1=drawEnemy;
drawEnemy=function(){ if(G.mode!=='surv') return drawEnemy1();
  if(G.sv.cine) G.sv.cine.drawFloor();
  // floor layer: shadows of things about to land, boss markers, gems, items, shards
  for(let i=V.shads.length-1;i>=0;i--){ const s=V.shads[i], k=(RT-s.t0)/s.dur; if(k>1.05){ V.shads.splice(i,1); continue; } if(k<0) continue;
    ctx.fillStyle=`rgba(0,0,0,${.15+.45*k})`; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r*(.4+.6*k),s.r*(.4+.6*k)*FSY,0,0,TAU); ctx.fill(); }
  if(V.shadow){ const s=V.shadow, k=Math.min(1,(RT-s.t0)/(s.dur||.55)), r=60+(s.r||400)*k*k, c=s.c||'#ffcf4a'; ctx.fillStyle=`rgba(0,0,0,${.3+.45*k})`; ctx.beginPath(); ctx.ellipse(s.x,s.y,r,r*FSY,0,0,TAU); ctx.fill();
    fx.strokeStyle=hexA(c,.4+.5*k); fx.lineWidth=6; fx.beginPath(); fx.ellipse(s.x,s.y,r,r*FSY,0,0,TAU); fx.stroke(); glow(fx,s.x,s.y,r*1.3,c,.15+.35*k); }
  for(const m of V.mk){ if(m.t<0) continue; const k=m.t/m.dur; ctx.strokeStyle=`rgba(255,40,80,${.35+.5*k})`; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(m.x,m.y,m.r,m.r*.7,0,0,TAU); ctx.stroke();
    ctx.fillStyle=`rgba(255,30,70,${.1+.25*k})`; ctx.beginPath(); ctx.ellipse(m.x,m.y,m.r*k,m.r*.7*k,0,0,TAU); ctx.fill(); glow(fx,m.x,m.y,m.r,'#ff2244',.15+.3*k); }
  for(const g of V.gems){ const c=g.v>=5?'#ffcf4a':g.v>=2?'#c07aff':'#4ab8d8', s=g.v>=5?13:g.v>=2?9:7, y=g.y-10+Math.sin(RT*4+g.ph)*3;
    ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(g.x,y-s*1.4); ctx.lineTo(g.x+s,y); ctx.lineTo(g.x,y+s*.9); ctx.lineTo(g.x-s,y); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(g.x,y-s*1.4); ctx.lineTo(g.x+s*.35,y-s*.3); ctx.lineTo(g.x-s*.2,y-s*.1); ctx.closePath(); ctx.fill();
    glow(fx,g.x,y,s*2,c,.14); }
  for(const it of V.items){ const y=it.y-30+Math.sin(RT*3+it.x)*6, c=it.k==='heal'?'#55ff9a':'#55ddff';
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(it.x,it.y,26,9,0,0,TAU); ctx.fill();
    ctx.fillStyle=c; ctx.beginPath(); if(it.k==='heal'){ ctx.arc(it.x-9,y-6,11,Math.PI,0); ctx.arc(it.x+9,y-6,11,Math.PI,0); ctx.lineTo(it.x,y+16); } else { ctx.arc(it.x,y,18,0,TAU); }
    ctx.closePath(); ctx.fill(); if(it.k==='mag'){ ctx.strokeStyle='#05030a'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(it.x,y,9,Math.PI,0); ctx.stroke(); }
    glow(fx,it.x,y,60,c,.6+.2*Math.sin(RT*6)); }
  const sc=CH().acc;
  for(const s of V.shards){ const a=clamp(1-(s.t-s.life*.6)/(s.life*.4),0,1); ctx.globalAlpha=a; ctx.save(); ctx.translate(s.x,s.y-s.z); ctx.rotate(s.rot);
    ctx.fillStyle=s.rock?'#3a3046':s.c||sc; ctx.beginPath(); ctx.moveTo(0,-s.s); ctx.lineTo(s.s*.6,0); ctx.lineTo(0,s.s*.7); ctx.lineTo(-s.s*.6,0); ctx.closePath(); ctx.fill(); ctx.restore();
    if(!s.rock) glow(fx,s.x,s.y-s.z,s.s*1.6,s.c||sc,.4*a); }
  ctx.globalAlpha=1;
  // the hero stands out in the crowd: a ring of his colour on the floor
  if(pl.visible&&pl.gy!=null){ const c=CCOL[pl.cls]; ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(pl.x,pl.gy,88,88*FSY,0,0,TAU); ctx.fill(); ctx.fillStyle=hexA(c,.3+.08*Math.sin(RT*5)); ctx.beginPath(); ctx.ellipse(pl.x,pl.gy,88,88*FSY,0,0,TAU); ctx.fill();
    fx.strokeStyle=hexA(c,1); fx.lineWidth=8; fx.beginPath(); fx.ellipse(pl.x,pl.gy,88+5*Math.sin(RT*5),(88+5*Math.sin(RT*5))*FSY,0,0,TAU); fx.stroke(); fx.strokeStyle=hexA('#ffffff',.6); fx.lineWidth=2.5; fx.stroke(); glow(fx,pl.x,pl.gy,112,c,.3); }
  for(const q of V.dying){ const [fw,fh,fa]=q.fr.d, D=q.e.d, k=q.t/q.life, t=q.t, fly=q.vx!=null; ctx.save(); ctx.globalAlpha=fly?Math.min(1,(1-k)*2.5):1-k; if(fly){ ctx.translate(q.e.x+q.vx*t,q.e.y+q.vy*t-(q.vz*t-1400*t*t)-fh*D.sc*.5); ctx.rotate(q.spin*t); ctx.translate(0,fh*D.sc*.5); } else ctx.translate(q.e.x,q.e.y-q.e.z+4-k*40); ctx.scale(q.e.f*D.sc*(1+k*.25),D.sc*(1+k*.25)); ctx.drawImage(tinted(q.fr.s,D.img==='brute'?55:0),-fa*fw,-fh,fw,fh); ctx.restore();
    if(!lock) glow(fx,q.e.x,q.e.y-D.h*D.sc*.5,D.h*D.sc*.4,'#ffffff',(1-k)*.25); }
  ctx.globalAlpha=1;
  V.sorted=V.en.filter(e=>!e.dead).sort((a,b)=>a.y-b.y);
  for(const e of V.sorted) if(e.y<=(pl.gy??pl.y)) drawE(e);
};
const drawPlayer1=drawPlayer;
drawPlayer=function(){ drawPlayer1(); if(G.mode!=='surv') return;
  for(const e of V.sorted||[]) if(e.y>(pl.gy??pl.y)) drawE(e);
  if(G.sv.cine) G.sv.cine.drawWorld();
  for(const p of V.pj) if(p.orb){ const y=p.y-BODY; glow(fx,p.x,y,50,'#b06bff',.85); glow(fx,p.x,y,16,'#ffffff',1); ctx.fillStyle='#2a0a3a'; ctx.beginPath(); ctx.arc(p.x,y,10,0,TAU); ctx.fill(); }
  if(G.inv>0&&!lock&&!V.dash) glow(fx,pl.x,pl.gy-BODY,180,'#ff2244',G.inv*.5);
  for(const c of V.cuts||[]){ const y=-BODY*.5, a=.45+.25*Math.sin(RT*40); fx.lineCap='round'; fx.strokeStyle=hexA('#ff3355',a); fx.lineWidth=7; fx.beginPath(); fx.moveTo(c.x1,c.y1+y); fx.lineTo(c.x2,c.y2+y); fx.stroke(); fx.strokeStyle=hexA('#ffffff',a*.8); fx.lineWidth=2; fx.stroke(); }
  const C=CLS[pl.cls]; if(C&&C.glow&&!lock) C.glow(); if(V.ultDraw) V.ultDraw();
  for(let i=V.draws.length-1;i>=0;i--){ const q=V.draws[i], k=(RT-q.t0)/q.life; if(k>=1){ V.draws.splice(i,1); continue; } if(k>=0) q.fn(k); } };
// numbers and the hero's own health bar go over everything (after the effect layer is composited)
const drawHUD1=drawHUD;
drawHUD=function(){ if(G.mode!=='surv') return drawHUD1();
  applyCam(ctx); if(pl.visible&&pl.gy!=null&&plSprites()) heroOver();
  ctx.setTransform(1,0,0,1,0,0); ctx.textAlign='center'; ctx.lineJoin='round'; const u=W/innerWidth;
  for(const n of V.nums){ const a=clamp(1-(n.t-.45)/.3,0,1), s=n.big?30:n.hurt?20:n.heal?19:15, pop=1+Math.max(0,.15-n.t)*3, [sx,sy0]=w2s(n.x,n.y), sy=clamp(sy0,135*u,H-150*u);
    ctx.globalAlpha=a; ctx.font=`900 ${s*pop*u}px "Arial Black",Impact,sans-serif`; ctx.lineWidth=3.2*u; ctx.strokeStyle='#000'; ctx.strokeText(n.txt,sx,sy);
    ctx.fillStyle=n.big?'#ffe58a':n.hurt?'#ff4a5a':n.heal?'#55ff9a':n.crit?'#ffcf4a':'#ffffff'; ctx.fillText(n.txt,sx,sy); }
  ctx.globalAlpha=1; applyCam(ctx);
  if(!lock&&pl.gy!=null){ const w=110, x=pl.x-w/2, y=pl.gy+30, k=clamp(G.hp/A.maxHp(),0,1); ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(x-3,y-3,w+6,16);
    ctx.fillStyle=k<.3?'#ff2a3a':'#ff5a6a'; ctx.fillRect(x,y,w*k,10); }
  // letterbox (ultimates) and a compact hit counter under the timer, so it never covers the field
  ctx.setTransform(1,0,0,1,0,0);
  if(ov.lb>.01){ ctx.fillStyle='#000'; const b=H*.05*ov.lb; ctx.fillRect(0,0,W,b); ctx.fillRect(0,H-b,W,b); }
  if(combo>1&&!lock&&comboT>1){ const u=W/innerWidth, s=1+comboPop*.3, x=W-16*u, y=H*.15;
    ctx.save(); ctx.globalAlpha=clamp((comboT-1)/.4,0,1); ctx.translate(x,y); ctx.scale(s,s); ctx.textAlign='right'; ctx.lineJoin='round';
    ctx.font=`italic 900 ${24*u}px "Arial Black",Impact,sans-serif`; ctx.lineWidth=7*u; ctx.strokeStyle='#000'; ctx.strokeText(combo,0,0); ctx.fillStyle=combo>300?'#ff2a4a':combo>100?'#ffcf4a':'#ffffff'; ctx.fillText(combo,0,0);
    ctx.font=`italic 900 ${10*u}px "Arial Black",sans-serif`; ctx.lineWidth=3*u; ctx.strokeText('HITS',0,12*u); ctx.fillStyle='#fff'; ctx.fillText('HITS',0,12*u); ctx.restore(); ctx.globalAlpha=1; } };
// the hero over every effect, with an outline in his colour (the effect layer is already composited by now)
const oc=document.createElement('canvas'), og=oc.getContext('2d');
function heroOver(){ const s=plFrame(), b=plSprBox(s); plMesh(s); if(oc.width!==plC.width||oc.height!==plC.height){ oc.width=plC.width; oc.height=plC.height; }
  og.clearRect(0,0,oc.width,oc.height); og.drawImage(plC,0,0); og.globalCompositeOperation='source-in'; og.fillStyle=CRIM[pl.cls]; og.fillRect(0,0,oc.width,oc.height); og.globalCompositeOperation='source-over';
  const ax=s.ax??.5, x=-b.w*ax-b.w*PL_PAD, y=-b.h*(1+PL_PAD), w=b.w*(1+PL_PAD*2), h=b.h*(1+PL_PAD), o=2/(S*cam.z);
  ctx.save(); ctx.translate(b.cx,b.base); ctx.scale(pl.f,1);
  for(const [dx,dy] of [[o,0],[-o,0],[0,o],[0,-o],[o*.7,o*.7],[-o*.7,o*.7],[o*.7,-o*.7],[-o*.7,-o*.7]]) ctx.drawImage(oc,x+dx,y+dy,w,h);
  ctx.drawImage(plC,x,y,w,h); ctx.restore(); }

// ============================================================ DOM: HUD, joystick, results, menu
const css=document.createElement('style'); css.textContent=`
#rrot{display:none!important}
.sv{position:fixed;display:none;font-family:"Pretendard","Malgun Gothic",sans-serif;color:#fff;-webkit-user-select:none;user-select:none}
.sv.on{display:flex}
#shud{inset:0;z-index:18;pointer-events:none;flex-direction:column;padding:max(10px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));box-sizing:border-box}
#shud .top{display:flex;align-items:flex-start;gap:10px}
#shud .me{width:min(300px,40vw)} #shud .me b{font:900 14px "Malgun Gothic",sans-serif;display:block;margin-bottom:4px;text-shadow:0 1px 0 #000}
#shud .hpb,#shud .xb,#shud .ub{position:relative;height:14px;margin-top:4px;background:rgba(0,0,0,.65);border:1px solid rgba(255,255,255,.3);border-radius:3px;overflow:hidden}
#shud .hpb i,#shud .xb i,#shud .ub i{display:block;height:100%} #shud .hpb i{background:linear-gradient(90deg,#ff2a4a,#ff6a85)} #shud .xb i{background:#55ddff}
#shud .hpb span,#shud .xb span,#shud .ub span{position:absolute;left:5px;top:0;font:900 12px/14px "Malgun Gothic",sans-serif;text-shadow:0 1px 2px #000}
#shud .rw{display:flex;align-items:center;gap:5px} #shud .rw em{font:900 12px "Malgun Gothic",sans-serif;font-style:normal;width:26px;color:#e8dcff;text-shadow:0 1px 1px #000} #shud .rw>div{flex:1}
#shud .c .ic{filter:brightness(1.9) saturate(1.3) drop-shadow(0 0 1px #fff)}
#shud .c .cs{position:absolute;left:0;right:0;top:12px;z-index:4;font:900 15px "Arial Black",sans-serif;color:#fff;text-shadow:0 0 4px #000,0 1px 0 #000}
#shud .ub i{background:linear-gradient(90deg,#ffcf4a,#fff)} #shud .ub span{color:#111;text-shadow:none}
#shud .ub.full{box-shadow:0 0 0 2px #fff,0 0 12px #fff}
#shud .mid{flex:1;text-align:center} #shud .tm{font:900 30px "Arial Black",Impact,sans-serif;letter-spacing:.04em;text-shadow:0 2px 0 #000,0 0 12px rgba(0,0,0,.8)}
#shud .kc{font-size:13px;color:#e8e0ff;text-shadow:0 1px 0 #000} #shud .kc span{display:block} #shud .kc b{display:block;font:900 15px "Malgun Gothic",sans-serif;color:#fff}
#shud .pz{pointer-events:auto;width:42px;height:42px;border-radius:12px;background:rgba(10,6,20,.6);border:1px solid rgba(255,255,255,.35);color:#fff;font-size:14px;cursor:pointer}
#shud .bb{margin:8px auto 0;width:min(520px,80vw);display:none} #shud .bb.on{display:block}
#shud .bb small{display:block;text-align:center;font:900 13px "Malgun Gothic",sans-serif;margin-bottom:3px}
#shud .bb div{height:12px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.4)} #shud .bb i{display:block;height:100%}
#shud .sk{margin-top:auto;align-self:center;display:flex;gap:5px;justify-content:center}
#shud .c{position:relative;width:52px;height:46px;border-radius:12px;border:1.5px solid var(--cc,rgba(255,255,255,.3));background:rgba(10,6,20,.7);display:flex;align-items:center;justify-content:center;text-align:center;font:800 11px "Malgun Gothic",sans-serif;line-height:1.15;word-break:keep-all;overflow:hidden;padding:3px;box-sizing:border-box}
#shud .c.off{opacity:.3} #shud .c.u{border-color:rgba(255,255,255,.6)} #shud .c.u.rd{box-shadow:0 0 0 2px #fff}
#shud .c .cd{position:absolute;inset:0;border-radius:inherit;z-index:2;pointer-events:none}
#shud .c{flex-direction:column;justify-content:flex-end;padding:2px 2px 3px;height:58px;width:56px}
#shud .c .ic{position:absolute;left:50%;top:3px;width:40px;height:34px;transform:translateX(-50%);object-fit:contain;z-index:1}
#shud .c span{position:relative;z-index:3;white-space:nowrap;max-width:100%;overflow:hidden;font:900 12px/1.1 "Malgun Gothic",sans-serif;letter-spacing:-.04em;text-shadow:0 1px 2px #000,0 0 3px #000}
#shud .c.u{width:72px;height:70px;border-width:2px} #shud .c.u .ic{width:52px;height:44px}
#shud .c .um{position:absolute;left:0;bottom:0;height:4px;background:#ffcf4a;z-index:4;width:var(--u,0%)}
#shud .c.u.rd{animation:ulp .7s infinite alternate} @keyframes ulp{to{box-shadow:0 0 0 2px #ffcf4a,0 0 18px #ffcf4a}}
#shud .sk{align-items:flex-end} #shud .c.rdy{box-shadow:0 0 0 1px var(--cc),0 0 10px var(--cc)}
#sjoy::after{content:'';position:absolute;left:50%;bottom:120px;width:96px;height:96px;margin-left:-48px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:rgba(255,255,255,.03);pointer-events:none} #sjoy.act::after{display:none}
#shud .me{background:rgba(5,3,10,.62);padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.12)}
#sult{position:fixed;left:0;right:0;top:11%;z-index:19;text-align:center;pointer-events:none;opacity:0;padding:8px 0;background:linear-gradient(90deg,transparent,rgba(0,0,0,.42) 25%,rgba(0,0,0,.42) 75%,transparent)}
#sult.on{animation:ultc .8s ease-out forwards} @keyframes ultc{0%{opacity:0;transform:scale(1.25)}12%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0}}
#sult small{display:block;font:900 11px/1 sans-serif;letter-spacing:.5em;color:#ffcf4a} #sult b{font:900 25px/1.2 "Malgun Gothic",sans-serif;text-shadow:0 0 14px currentColor,0 2px 0 #000}
#sjoy{inset:0;z-index:17;touch-action:none}
#sjoy .bs{position:absolute;width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(10,6,20,.25);display:none;pointer-events:none}
#sjoy .kn{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.7);display:none;pointer-events:none}
#sjoy.act .bs,#sjoy.act .kn{display:block}
#sres{inset:0;z-index:30;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
#sres .box{background:rgba(12,8,22,.94);border:1px solid rgba(255,255,255,.2);padding:22px 22px;border-radius:14px;text-align:center;width:min(340px,88vw);box-sizing:border-box}
#sres h2{margin:0;font:900 40px "Malgun Gothic",sans-serif} #sres h2.w{color:#ffcf4a} #sres h2.l{color:#ff4a5a}
#sres .st{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0;font-size:13px;color:#b9b3d0} #sres .st b{color:#fff;display:block;font-size:17px}
#sres .lv{color:#55ddff;margin-bottom:16px} #sres .row{display:flex;flex-direction:column;gap:8px}
#sres button{font:800 15px "Malgun Gothic",sans-serif;cursor:pointer;border:1px solid rgba(255,255,255,.3);background:rgba(20,14,34,.85);color:#fff;padding:13px;border-radius:12px}
#sres button.p{background:#ff3355;border-color:#ff3355}
#rmenu.mob{background:linear-gradient(180deg,rgba(5,3,10,.55),rgba(5,3,10,.88) 38%,rgba(5,3,10,.97));padding:max(14px,env(safe-area-inset-top)) 0 0;align-items:center;overflow:hidden}
#rmenu.mob .mm{width:min(480px,100%);height:100%;display:flex;flex-direction:column;padding:0 14px;box-sizing:border-box}
#rmenu.mob .hd{text-align:center;margin-bottom:10px} #rmenu.mob .hd h1{font:900 44px "Malgun Gothic",sans-serif;letter-spacing:.08em;margin:0}
#rmenu.mob .hd small{display:block;color:#b9b0d8;letter-spacing:.45em;font-size:12px}
#rmenu.mob .hd{position:relative} #rmenu.mob .opt{position:absolute;right:0;top:0;padding:6px 9px;border-radius:9px;font:700 11px "Malgun Gothic",sans-serif;color:#b9b0d8;background:rgba(20,14,34,.8);border:1px solid rgba(255,255,255,.2)} #rmenu.mob .opt.on{color:#fff;border-color:#55ddff;background:rgba(85,221,255,.2)}
#rmenu.mob .cl{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px}
#rmenu.mob .cc{position:relative;border:1px solid rgba(255,255,255,.18);border-radius:12px;background:rgba(20,14,34,.75);padding:4px 2px 5px;text-align:center;cursor:pointer;overflow:hidden}
#rmenu.mob .cc img{width:100%;height:62px;object-fit:contain;display:block}
#rmenu.mob .cc b{display:block;font:900 11px "Malgun Gothic",sans-serif} #rmenu.mob .cc small{font-size:10px;color:#aaa}
#rmenu.mob .cc.on{border-color:var(--c);box-shadow:0 0 0 1px var(--c),0 0 16px var(--c);background:rgba(40,20,60,.85)}
#rmenu.mob .st{display:flex;justify-content:space-between;align-items:baseline;font-size:13px;color:#e8dcff;margin-bottom:4px} #rmenu.mob .st b{font:900 17px "Malgun Gothic",sans-serif;color:#fff}
#rmenu.mob .xp{height:5px;background:rgba(255,255,255,.12);border-radius:3px;margin-bottom:10px;overflow:hidden} #rmenu.mob .xp i{display:block;height:100%;background:linear-gradient(90deg,#55ddff,#b48cff)}
#rmenu.mob .tb{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px}
#rmenu.mob .tb button{padding:10px;border-radius:10px;font:800 14px "Malgun Gothic",sans-serif}
#rmenu.mob .tb button.on{background:rgba(255,51,85,.45);border-color:#ff3355}
#rmenu.mob .bd{-webkit-mask-image:linear-gradient(#000 85%,transparent);mask-image:linear-gradient(#000 85%,transparent);flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding-bottom:10px}
#rmenu.mob .chp{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px;border-radius:12px;margin-bottom:6px;border:1px solid rgba(255,255,255,.15);background:rgba(20,14,34,.75)}
#rmenu.mob .chp i{width:8px;align-self:stretch;border-radius:4px;background:var(--c)} #rmenu.mob .chp div{flex:1} #rmenu.mob .chp b{font:900 15px "Malgun Gothic",sans-serif;display:block}
#rmenu.mob .chp small{font-size:11px;color:#b9b3d0} #rmenu.mob .chp em{font-style:normal;font-size:11px;color:#ffcf4a}
#rmenu.mob .chp.on{border-color:var(--c);background:rgba(40,20,60,.9)} #rmenu.mob .chp:disabled{opacity:.62;filter:grayscale(.6)}
#rmenu.mob .sr{display:grid;grid-template-columns:1fr auto;gap:4px 8px;padding:10px;border-radius:12px;margin-bottom:6px;border:1px solid rgba(255,255,255,.12);background:rgba(15,10,26,.8)}
#rmenu.mob .sr.lock{opacity:.4} #rmenu.mob .sr b{font:900 15px "Malgun Gothic",sans-serif} #rmenu.mob .sr .t{font-size:10px;color:#ffcf4a;margin-left:6px} #rmenu.mob .sr .t.u{color:#ff6a85}
#rmenu.mob .sr .lv{font:900 12px "Malgun Gothic",sans-serif;color:#55ddff;text-align:right} #rmenu.mob .sr .lv.ev{color:#ffcf4a}
#rmenu.mob .sr p{grid-column:1/3;margin:0;font-size:12px;color:#b9b3d0;line-height:1.45}
#rmenu.mob .sr .bt{grid-column:1/3;display:flex;gap:4px;flex-wrap:wrap}
#rmenu.mob .sr .bt button{padding:8px 10px;font-size:12px;border-radius:8px} #rmenu.mob .sr .bt button.on{background:#ff3355;border-color:#ff3355}
#rmenu.mob .sr .bt .up{margin-left:auto;background:rgba(85,221,255,.2);border-color:#55ddff}
#rmenu.mob .pv{display:flex;align-items:center;gap:12px;margin-bottom:10px;padding:6px 12px;border-radius:14px;background:radial-gradient(circle at 25% 60%,color-mix(in srgb,var(--c) 30%,transparent),rgba(20,14,34,.6) 60%)}
#rmenu.mob .pv img{height:min(26vh,190px);filter:drop-shadow(0 0 10px var(--c))} #rmenu.mob .pv b{font:900 26px "Malgun Gothic",sans-serif;display:block;color:var(--c)} #rmenu.mob .pv small{font-size:12px;color:#d0c8e8}
#rmenu.mob .bdg{display:inline-block;min-width:18px;padding:0 5px;border-radius:9px;background:#ff2a4a;color:#fff;font:900 11px/18px sans-serif;margin-left:4px}
#rmenu.mob .bd{padding-bottom:28px} #rmenu.mob .go{margin:8px 0 max(14px,env(safe-area-inset-bottom));padding:16px;border-radius:14px;font:900 18px "Malgun Gothic",sans-serif;background:linear-gradient(90deg,#ff3355,#ff6a3a);border:0;color:#fff;box-shadow:0 6px 24px rgba(255,51,85,.4)}`;
document.head.appendChild(css);
const mk=(id,html)=>{ const d=document.createElement('div'); d.id=id; d.className='sv'; d.innerHTML=html||''; document.body.appendChild(d); return d; };
const ultEl=mk('sult'); ultEl.className='';
const joyEl=mk('sjoy','<div class="bs"></div><div class="kn"></div>'), hudEl=mk('shud'), resEl=mk('sres');
hudEl.innerHTML='<div class="top"><div class="me"><b></b><div class="rw"><em>HP</em><div class="hpb"><i></i><span></span></div></div><div class="rw"><em>EXP</em><div class="xb"><i></i></div></div><div class="rw"><em>궁극</em><div class="ub"><i></i></div></div></div><div class="mid"><div class="tm">0:00</div><div class="kc"></div></div><button class="pz">❚❚</button></div><div class="bb"><small></small><div><i></i></div></div><div class="sk"></div>';
hudEl.querySelector('.pz').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); if(G.mode==='surv'&&!V.over) A.setPause(true); });
const $=s=>hudEl.querySelector(s);
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const ICON={"sw_basic":"slash06","sw_dash":"cleave05","sw_rise":"slash05","sw_wave":"slash07","sw_spin":"impact04","sw_fly":"goldsword03","sw_plunge":"td_colossal07","sw_thrust":"impact03","sw_counter":"td_zeroburst06","sw_ult1":"td_cutline06","sw_ult2":"td_swordfall07","mg_basic":"mage_bolt04","mg_bolt":"mage_lightning04","mg_orb":"fx_mage_orb05","mg_chain":"mage_lightning06","mg_nova":"fx_mage_nova07","mg_vortex":"fx_mage_vortex05","mg_field":"fx_mage_field05","mg_star":"fx_mage_star08","mg_beam":"fist_beam04|80","mg_ult1":"fx_mage_megabolt09","mg_ult2":"fx_mage_meteor09","fs_basic":"fist_impact04","fs_dash":"fist_impact05","fs_upper":"fist_impact03","fs_ki":"fx_fist_kiball05","fs_stomp":"fx_fist_shock07","fs_rush":"fx_fist_barrage07","fs_tornado":"fx_fist_tornado05","fs_aura":"fx_fist_aura05","fs_giga":"fist_beam04","fs_ult1":"fist_beam06","fs_ult2":"fx_fist_sunblast08","sh_basic":"shaman_talisman04","sh_bomb":"shaman_burst04","sh_spike":"fx_shaman_spike07","sh_wisp":"fx_shaman_wisp05","sh_heal":"td_circle05|110","sh_rock":"fx_shaman_rock07","sh_seal":"fx_shaman_seal05","sh_wolf":"fx_shaman_wolf05","sh_palm":"fx_shaman_palm08","sh_ult1":"fx_shaman_rock08","sh_ult2":"fx_shaman_palm06","py_basic":"pyro_fireball04","py_dash":"pyro_explosion03","py_pillar":"fx_pyro_pillar06","py_ring":"fx_pyro_ring05","py_boom":"pyro_explosion05","py_rain":"pyro_fireball06","py_breath":"fx_pyro_breath07","py_tornado":"fx_pyro_tornado05","py_nova":"fx_pyro_nova06","py_ult1":"fx_pyro_tornado08","py_ult2":"fx_pyro_dragon05"};
const icon=id=>{ const v=ICON[id]; if(!v) return ''; const [n,h]=v.split('|'); return `<img class="ic" src="assets/vfx_${n}.webp?v=${ASSET_V}" alt=""${h?` style="filter:hue-rotate(${h}deg)"`:''}>`; };
G.sv_icon=icon;
const SHORT={"체인 라이트닝": "체인", "플라잉 소드": "플라잉", "기가 임팩트": "기가", "스피릿 핸드": "핸드", "스톤 스파이크": "스파이크", "드래곤 블레이즈": "드래곤", "파이어 토네이도": "토네이도", "파이어 스톰": "스톰", "플레임 쓰로워": "화염방사", "플레임 대시": "대시", "파이어 필러": "필러", "파이어 레인": "파이어레인", "플레임 링": "플레임링", "익스플로전": "폭발", "프로스트 노바": "노바", "아케인 오브": "오브", "아케인 레이": "레이", "썬더 필드": "필드", "헤븐 썬더": "썬더", "메테오 폴": "메테오", "매직 볼트": "볼트", "라이트닝": "번개", "그래비티": "중력", "콤보 펀치": "펀치", "대시 펀치": "대시", "라이징 어퍼": "어퍼", "러쉬 펀치": "러쉬", "회오리 킥": "회오리", "아이언 바디": "아이언", "하이퍼 빔": "빔", "솔라 크래쉬": "솔라", "탈리스만": "부적", "카드 봄": "카드봄", "스피릿 오브": "영혼불", "힐링 서클": "힐링", "스피릿 울프": "울프", "스톤 레인": "스톤", "스피릿 킹": "킹", "파이어 볼": "화염구", "제로 슬래시": "제로", "소드 레인": "레인", "슬래시": "슬래시"};
const short=n=>SHORT[n]||n;
let cells=[];
function buildBar(){ const L=[[A.ORDER[pl.cls][0],'basic'],...ACT().map(id=>[id,'s']),[SV().ult,'u']];
  $('.sk').innerHTML=L.map(([id,k])=>`<div class="c ${k==='u'?'u':''} ${id&&SK[id]&&A.unlocked(id)?'':'off'}" style="--cc:${CCOL[pl.cls]}"><div class="cd"></div>${id&&SK[id]&&A.unlocked(id)?icon(id)+'<span>'+short(SK[id].name)+'</span>':'<span>—</span>'}${k==='u'?'<i class="um"></i>':''}<b class="cs"></b></div>`).join('');
  $('.sk').style.zoom=Math.min(1,(Math.min(innerWidth,520)-16)/(L.length*61)); cells=[...$('.sk').children].map((el,i)=>({el,cd:el.querySelector('.cd'),cs:el.querySelector('.cs'),id:L[i][0],k:L[i][1]})); V.lv=SV().lv; }
function hud(){
  if(V.lv!==SV().lv) buildBar();
  $('.me b').textContent=`${NAMES[pl.cls]} · Lv ${SV().lv}`; $('.xb i').style.width=(SV().exp/A.needExp(SV().lv)*100)+'%';
  $('.hpb i').style.width=clamp(G.hp/A.maxHp(),0,1)*100+'%'; $('.hpb span').textContent=`${Math.max(0,Math.round(G.hp))} / ${A.maxHp()}`;
  $('.ub i').style.width=V.ug+'%'; $('.ub').classList.toggle('full',V.ug>=100);
  $('.tm').textContent=mmss(Math.max(0,DUR-V.t)); $('.kc').innerHTML=`<span>${CH().name}</span><b>처치 ${V.kills}</b>`;
  const b=V.boss&&!V.boss.dead; $('.bb').classList.toggle('on',!!b); if(b){ $('.bb small').textContent=CH().boss; $('.bb small').style.color=CH().acc; $('.bb i').style.background=CH().acc; $('.bb i').style.width=(V.boss.hp/V.boss.max*100)+'%'; }
  const C=CLS[pl.cls];
  for(const c of cells){ if(!c.id||!SK[c.id]||!A.unlocked(c.id)) continue; let k=0;
    if(c.k==='basic') k=C?Math.max(0,V.bcd)/C.basic.cd():0; else if(c.k==='u'){ k=V.ug>=100?0:.55; c.el.classList.toggle('rd',V.ug>=100); c.el.style.setProperty('--u',V.ug+'%'); } else if(SK[c.id].cd) k=(V.cd[c.id]||0)/A.cdOf(c.id);
    if(c.cs) c.cs.textContent=c.k==='s'&&(V.cd[c.id]||0)>.05?Math.ceil(V.cd[c.id]):'';
    k=clamp(k,0,1); c.el.classList.toggle('rdy',k<=0&&c.k==='s'); c.cd.style.background=k>0?`conic-gradient(rgba(0,0,0,.7) ${k*360}deg, transparent 0)`:'none'; } }
// joystick: press anywhere and drag (touch or mouse)
const bs=joyEl.querySelector('.bs'), kn=joyEl.querySelector('.kn'), JR=50;
function joyHide(){ V.joy=null; joyEl.classList.remove('act'); }
joyEl.addEventListener('pointerdown',e=>{ if(G.mode!=='surv'||G.paused||V.over) return; e.preventDefault(); try{ joyEl.setPointerCapture(e.pointerId); }catch(_){}
  V.joy={id:e.pointerId,x0:e.clientX,y0:e.clientY,dx:0,dy:0}; bs.style.left=kn.style.left=e.clientX+'px'; bs.style.top=kn.style.top=e.clientY+'px'; joyEl.classList.add('act'); });
joyEl.addEventListener('pointermove',e=>{ const j=V.joy; if(!j||e.pointerId!==j.id) return; let dx=e.clientX-j.x0, dy=e.clientY-j.y0; const l=Math.hypot(dx,dy);
  if(l>JR){ j.x0+=dx*(1-JR/l); j.y0+=dy*(1-JR/l); dx*=JR/l; dy*=JR/l; bs.style.left=j.x0+'px'; bs.style.top=j.y0+'px'; } j.dx=dx; j.dy=dy; /* the base trails the thumb, so reversing is always one short flick */ kn.style.left=(j.x0+dx)+'px'; kn.style.top=(j.y0+dy)+'px'; });
const joyUp=e=>{ if(V.joy&&e.pointerId===V.joy.id) joyHide(); };
joyEl.addEventListener('pointerup',joyUp); joyEl.addEventListener('pointercancel',joyUp);
// keyboard (rpg.js hands key events over while in this mode)
const KM={KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',KeyW:'u',ArrowUp:'u',KeyS:'d',ArrowDown:'d'};
G.survKey=(e,down)=>{ const k=KM[e.code]; if(k){ V.keys[k]=down; e.preventDefault(); return; }
  if(down&&e.code==='Escape'&&!V.over) A.setPause(!G.paused); };
addEventListener('blur',()=>{ V.keys={}; joyHide(); });

// ============================================================ run flow
function start(ch){
  if(!AC) initAudio(); if(AC&&AC.state!=='running') AC.resume();
  Object.assign(V,{t:0,ch:ch??V.ch,en:[],pj:[],gems:[],items:[],nums:[],shards:[],mk:[],orbs:[],zones:[],kills:0,run:0,acc:0,accT:0,ug:0,cd:{},gcd:0,bcd:.5,chain:0,dash:null,boss:null,bossDone:false,cuts:[],shadow:null,shads:[],ultDraw:null,dying:[],draws:[],zk:1,ultTick:null,spawn:0,horde:0,over:false,keys:{},mag:0,armor:0,id:0});
  joyHide(); G.mode='surv'; G.paused=false; G.hp=A.maxHp(); G.inv=0; G.jz=G.jv=0; G.runT=0; G.landT=0; G.stats={kills:0,dmg:0,exp:0,t:RT}; combo=0;
  lock=false; anim.seq=null; parts.length=0; timers.length=0; fires.length=0; cutin=null; warn=null; timeScale=1; slowHold=0; hitstop=0; trauma=0; if(G.sv.cine){ G.sv.cine.reset(); G.sv.cine.preload(pl.cls); } window.LBK=.05;
  pl.target=IDLE(); pl.ps=12; pl.visible=true; pl.air=pl.airT=0; pl.f=1; pl.x=pl.home=VW/2; pl.gy=770; GROUND=FAR;
  E.dead=false; E.respawn=1e9; cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-BODY*.6; cam.z=cam.fz=PORTRAIT?ZP:ZL; cam.ft=99;
  A.menuEl.classList.remove('on'); resEl.classList.remove('on'); document.body.classList.add('surv'); hudEl.classList.add('on'); joyEl.classList.add('on'); buildBar(); hud();
  for(let i=0;i<10;i++) spawn('shard');
  add({k:'banner',name:CH().name,en:'CHAPTER '+(V.ch+1)+' · SURVIVE 5:00',c:CH().acc,life:2.4});
}
function end(){ // leaving the mode: hand the engine back its ground line and camera
  V.over=true; joyHide(); hudEl.classList.remove('on'); joyEl.classList.remove('on'); resEl.classList.remove('on'); document.body.classList.remove('surv','cine');
  V.en=[]; V.pj=[]; V.gems=[]; V.items=[]; V.nums=[]; V.shards=[]; V.mk=[]; V.orbs=[]; V.zones=[];
  parts.length=0; timers.length=0; fires.length=0; cutin=null; warn=null; lock=false; anim.seq=null; timeScale=1; slowHold=0; if(G.sv.cine) G.sv.cine.reset(); window.LBK=undefined; ov.lbT=0; ov.dimT=0; post.grayT=0; V.zk=1; V.ultTick=null; pl.visible=true; G.pose=null;
  window.BLOOMK=1; GROUND=770; pl.gy=undefined; pl.air=pl.airT=0; cam.x=cam.fx=VW/2; cam.y=cam.fy=CY; cam.z=cam.fz=1; cam.ft=0; }
G.survEnd=end;
function finish(win){ if(V.over) return; V.over=true; joyHide(); G.keys={};
  if(V.acc>0){ A.gainExp(V.acc); V.run+=V.acc; V.acc=0; }
  const t=Math.min(DUR,V.t), sv=SV(); sv.best=sv.best||{}; const key=pl.cls+V.ch, prev=sv.best[key]||0; sv.best[key]=Math.max(prev,Math.round(t));
  let first=false;
  if(win){ first=(sv.chClear||0)<=V.ch; sv.chClear=Math.max(sv.chClear||0,V.ch+1); const b=150*(V.ch+1); A.gainExp(b); V.run+=b; stamp('CLEAR',{x:.5,y:.4,size:.14,life:1.6,c:'#ffcf4a'}); }
  else { slow(.25,.8); stamp('다운',{x:.5,y:.4,size:.14,life:1.4,c:'#ff4a5a'}); }
  A.save(); const next=win&&V.ch+1<CHAP.length;
  resEl.innerHTML=`<div class="box"><h2 class="${win?'w':'l'}">${win?'클리어':'쓰러짐'}</h2><p>챕터 ${V.ch+1} · ${CH().name} · ${mmss(t)} 버팀${!win&&Math.round(t)>prev?' · 최고 기록!':''}${first&&next?'<br><b style="color:#ffcf4a">다음 챕터가 열렸습니다</b>':''}</p>
    <div class="st"><span>처치<b>${V.kills}</b></span><span>피해<b>${Math.round(G.stats.dmg).toLocaleString()}</b></span><span>경험치<b>+${V.run}</b></span><span>최고<b>${mmss(sv.best[key])}</b></span></div>
    <div class="lv">${NAMES[pl.cls]} Lv ${sv.lv} · 스킬 포인트 ${sv.sp}</div><div class="row">${next?'<button class="p" data-r="next">다음 챕터</button>':''}<button ${next?'':'class="p"'} data-r="again">다시 하기</button><button data-r="menu">메뉴로 (강화하기)</button></div></div>`;
  setTimeout(()=>{ if(G.mode==='surv') resEl.classList.add('on'); },win?1400:900);
  resEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const r=b.dataset.r; if(r==='again'){ end(); start(); } else if(r==='next'){ end(); start(V.ch+1); } else A.toMenu(); }); }

// ============================================================ menu (portrait phone): character, chapter or skills, start
let tab='ch', sel=null;
function goFull(){ if(!A.isTouch()) return; const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen) d.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('portrait').catch(()=>{})).catch(()=>{}); }
G.menuOverride=el=>{
  const sv=SV(), cls=pl.cls, ids=A.ORDER[cls]||[], need=A.needExp(sv.lv), open=Math.min(CHAP.length-1,sv.chClear||0); if(sel==null||sel>open) sel=open;
  el.classList.add('mob');
  let h=`<div class="mm"><div class="hd"><h1>참광</h1><small>SURVIVAL RPG</small><button class="opt ${sv.opt&&sv.opt.calm?'on':''}" data-opt="calm">섬광·흔들림 줄이기 ${sv.opt&&sv.opt.calm?'켜짐':'꺼짐'}</button></div>
    <div class="cl">${CLS_ORDER.map(c=>{ const d=c===sv.cls?sv:(sv.chars&&sv.chars[c])||{lv:1}; return `<div class="cc ${c===cls?'on':''}" data-c="${c}" style="--c:${CCOL[c]}"><img src="assets/${c}_a.webp" alt=""><b>${NAMES[c]}</b><small>Lv ${d.lv}</small></div>`; }).join('')}</div>
    <div class="pv" style="--c:${CCOL[cls]}"><img src="assets/${cls}_a.webp" alt=""><div><b>${NAMES[cls]}</b><small>${(SK[ids[0]]||{}).name||''} · ${ids.filter(id=>SK[id]&&SK[id].type==='skill').length}개 스킬 · 궁극기 2</small></div></div>
    <div class="st"><b>${NAMES[cls]} · Lv ${sv.lv}</b><span>스킬 포인트 <b style="color:#55ddff">${sv.sp}</b> · HP ${A.maxHp()}</span></div><div class="xp"><i style="width:${sv.exp/need*100}%"></i></div>
    <div class="tb"><button data-t="ch" class="${tab==='ch'?'on':''}">챕터</button><button data-t="sk" class="${tab==='sk'?'on':''}">스킬 강화${sv.sp?' <span class="bdg">'+sv.sp+'</span>':''}</button></div><div class="bd">`;
  if(tab==='ch') h+=CHAP.map((c,i)=>{ const b=(sv.best||{})[cls+i]; return `<button class="chp ${i===sel?'on':''}" data-ch="${i}" style="--c:${c.acc}" ${i>open?'disabled':''}><i></i><div><b>${i+1}. ${c.name}</b><small>${c.en} · 보스 ${c.boss} · 권장 Lv ${c.rec}</small></div><em>${i<(sv.chClear||0)?'클리어':i===open?'도전':'잠김'}${b?'<br>'+mmss(b):''}</em></button>`; }).join('');
  else h+=ids.map(id=>{ const s=SK[id]; if(!s) return ''; const un=A.unlocked(id), lv=A.sLv(id), ev=lv>=5;
    let bt='';
    if(un&&s.type==='ult') bt+=`<button data-ult="${id}" class="${sv.ult===id?'on':''}">${sv.ult===id?'장착 중':'장착'}</button>`;
    if(un&&s.type!=='ult') bt+=`<button class="up" data-up="${id}" ${sv.sp<1||lv>=5?'disabled':''}>${lv>=5?'진화 완료':lv===4?'진화 (SP 1)':'강화 (SP 1)'}</button>`;
    const tag=s.type==='ult'?'<span class="t u">궁극기</span>':s.type==='basic'?'<span class="t">기본 공격</span>':`<span class="t">쿨 ${A.cdOf(id).toFixed(1)}초 · 자동 사용</span>`;
    return `<div class="sr ${un?'':'lock'}"><div><b>${s.name}</b>${tag}</div><div class="lv ${ev?'ev':''}">${s.type==='ult'?'':ev?'★ 진화':'Lv '+lv+'/5'}</div><p>${un?s.desc+(s.evo&&s.type!=='ult'?'<br><span style="color:#ffcf4a">진화: '+s.evo+'</span>':''):'Lv '+s.lv+'에 해금'}</p>${bt?'<div class="bt">'+bt+'</div>':''}</div>`; }).join('');
  h+=`</div><button class="go">챕터 ${sel+1} 시작 · ${CHAP[sel].name}</button></div>`;
  el.innerHTML=h;
  const R=()=>A.menuRender();
  el.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{ const c=b.dataset.c; if(c===pl.cls) return; A.swapClass(c); setClass(c,true); R(); });
  el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ tab=b.dataset.t; R(); });
  el.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{ sel=+b.dataset.ch; R(); });
  el.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{ const id=b.dataset.eq, i=+b.dataset.i, j=sv.slots.indexOf(id);
    if(sv.slots[i]===id) sv.slots[i]=null; else { if(j>=0) sv.slots[j]=sv.slots[i]; sv.slots[i]=id; } A.save(); R(); });
  el.querySelectorAll('[data-ult]').forEach(b=>b.onclick=()=>{ sv.ult=b.dataset.ult; A.save(); R(); });
  el.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{ const id=b.dataset.up; if(sv.sp<1||A.sLv(id)>=5) return; sv.sp--; sv.sl[id]=A.sLv(id)+1; A.save(); R(); });
  el.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{ sv.opt=sv.opt||{}; sv.opt[b.dataset.opt]=!sv.opt[b.dataset.opt]; A.save(); R(); });
  el.querySelector('.go').onclick=()=>{ goFull(); start(sel); };
};
// a new character starts with its first two skills equipped
G.firstSkills=c=>{ const L=(A.ORDER[c]||[]).filter(id=>SK[id]&&SK[id].type==='skill'&&SK[id].lv<=1); const sv=SV(); sv.slots=[L[0]||null,L[1]||null,null,null]; };

// ============================================================ class skill files
// keep a point (an ultimate's impact) inside the middle of the screen
const inView=(x,y,k=.5)=>{ const {hw,hh}=view(); return [clamp(x,cam.x-hw*k,cam.x+hw*k),clamp(y,cam.y-hh*k+BODY*.5,cam.y+hh*k+BODY*.5)]; };
G.sv={V,A,SK,BODY,CH,CLS,CCOL,NAMES,shock1,inView,FSY,draw:(life,fn,delay=0)=>V.draws.push({t0:RT+delay,life,fn}),nearest,countIn,densest,angTo,face,seq,dmg,hitFx,inCircle,inCircleS,inSector,inLine,sfx,view,onScreen,tdV,dropFx,ultStart,ultStop,ultHit,addVfx,burst,fring,heal,hurt,
  reg(c,def){ CLS[c]=def; if(def.sk) Object.assign(SK,def.sk); if(def.order) A.ORDER[c]=def.order; if(G.mode==='menu') A.menuRender(); if(G.mode==='surv'&&c===pl.cls) buildBar(); }};
for(const f of ['gfx','cine',...CLS_ORDER.map(c=>'sk_'+c)]){ const s=document.createElement('script'); s.src=`${f}.js?v=${VER}`; s.async=false; document.body.appendChild(s); }
if(G.mode==='menu') A.menuRender();
G.survStart=start;
})();
