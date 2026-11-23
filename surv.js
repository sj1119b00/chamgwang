// 참광 survival mode: a top-down field where the stickman swordsman walks freely, every equipped skill fires on its own,
// and crystal hordes close in from all sides for five minutes. Loaded by rpg.js; it shares the RPG save (levels, skill
// points, equipped slots) and borrows the showcase engine for effects, the stickman figure and the two ultimates.
// World: x/y is the floor plane (y = depth), z is height. The hero's floor position is pl.x / pl.gy (the engine draws him at pl.gy).
'use strict';
(()=>{
const G=RPG, A=G.api, SV=()=>A.SV, SK=A.SK;
const ZL=.42, ZP=.52, DUR=300, BOSS_T=240, CAP=340, SPD=430, BODY=170, FAR=1e5;
const EN={
  shard:{name:'크리스탈 솔저',img:'shard',hp:700,spd:170,r:40,dmg:6,gem:1,sc:.65,h:300},
  archer:{name:'크리스탈 캐스터',img:'archer',hp:600,spd:150,r:38,dmg:8,gem:2,sc:.65,h:290,ranged:true},
  brute:{name:'크리스탈 골렘',img:'brute',hp:5200,spd:105,r:75,dmg:14,gem:5,sc:.65,h:440,heavy:true},
  boss:{name:'골렘 킹',img:'brute',hp:260000,spd:135,r:150,dmg:24,gem:120,sc:1.35,h:440,heavy:true,boss:true},
};
const V={t:0,en:[],pj:[],gems:[],items:[],nums:[],shards:[],mk:[],orbs:[],kills:0,run:0,acc:0,accT:0,ug:0,cd:{},gcd:0,bcd:0,chain:0,
  dash:null,boss:null,spawn:0,horde:0,over:false,joy:null,keys:{},wasLock:false,ox:0,oy:0,fxB:0,lv:0,id:0};
G.surv=V;

// ============================================================ small helpers
const snd={}; function sfx(n,...a){ if(RT-(snd[n]||0)<.055) return; snd[n]=RT; SFX[n](...a); }
const hm=()=>1+V.t/60;                          // enemy health grows with time survived
const dm=()=>1+V.t/150;                         // and so does what they hit for
const alive=()=>V.en.filter(e=>!e.dead);
const view=()=>({hw:W/(2*S*cam.z),hh:H/(2*S*cam.z)});
function nearest(R){ let b=null,bd=R*R; for(const e of V.en){ if(e.dead) continue; const d=(e.x-pl.x)**2+(e.y-pl.gy)**2; if(d<bd){ bd=d; b=e; } } return b; }
function countIn(R){ let n=0; for(const e of V.en) if(!e.dead&&(e.x-pl.x)**2+(e.y-pl.gy)**2<R*R) n++; return n; }
const angTo=e=>Math.atan2(e.y-pl.gy,e.x-pl.x);
function face(a){ const c=Math.cos(a); if(Math.abs(c)>.05) pl.f=c>0?1:-1; }
function inCircle(x,y,r,fn){ for(const e of V.en){ if(e.dead) continue; const dx=e.x-x, dy=e.y-y, rr=r+e.d.r; if(dx*dx+dy*dy<rr*rr) fn(e); } }
function inSector(x,y,a,r,half,fn){ inCircle(x,y,r,e=>{ const dx=e.x-x, dy=e.y-y, l=Math.hypot(dx,dy); let d=Math.atan2(dy,dx)-a; d=Math.atan2(Math.sin(d),Math.cos(d)); if(l<e.d.r+40||Math.abs(d)<half+e.d.r/Math.max(l,1)) fn(e); }); }
function inLine(x0,y0,x1,y1,w,fn){ const dx=x1-x0, dy=y1-y0, L2=dx*dx+dy*dy||1; for(const e of V.en){ if(e.dead) continue; const t=clamp(((e.x-x0)*dx+(e.y-y0)*dy)/L2,0,1), px=x0+dx*t, py=y0+dy*t, rr=w+e.d.r; if((e.x-px)**2+(e.y-py)**2<rr*rr) fn(e); } }
function seq(p,fr,o={}){ const [w,s,h]=fr; plSeq([[p+w,o.w??.035],[p+s,o.s??.05,{tr:1,kick:[2.2,-1.8]}],[p+h,o.h??.12],[p+'12',.06]]); anim.seq.basic=!!o.basic; }
function hitFx(e,c,pw=1){ if(V.fxB<=0) return; V.fxB--; const x=e.x, y=e.y-e.h*.45-e.z;
  gl0(x,y,55*pw,c,.16,{a:.7}); for(let i=0;i<3;i++) spark(x,y,rand(0,TAU),rand(300,900)*pw,{c:Math.random()<.5?'#ffffff':c,life:rand(.12,.25),w:2,g:0});
  if(pw>1.1&&Math.random()<.6) vfx('impact',x,y,{sc:.28*pw,rot:rand(0,TAU)}); }

// ============================================================ damage
function dmg(e,d,o={}){
  if(e.dead) return; const crit=o.crit||Math.random()<.14; if(crit&&!o.crit) d*=1.9; d=Math.round(d*rand(.92,1.08));
  if(e.d.boss&&o.ult) d=Math.min(d,Math.round(e.max*.2));
  e.hp-=d; e.flash=1; e.hurtT=.3; combo++; comboT=2.4; comboPop=1; G.stats.dmg+=d; num(e.x,e.y-e.h-e.z,d,crit);
  const sx=o.sx??pl.x, sy=o.sy??pl.gy, dx=e.x-sx, dy=e.y-sy, l=Math.hypot(dx,dy)||1, kb=(o.kb??1)*(e.d.heavy?50:320);
  e.kx+=dx/l*kb; e.ky+=dy/l*kb;
  if(o.launch&&!e.d.heavy) e.vz=Math.max(e.vz,o.launch);
  if(!e.d.heavy||o.big) e.stun=Math.max(e.stun,o.stun??.16);
  if(e.hp<=0) die(e);
}
function die(e){
  e.dead=true; e.hp=0; V.kills++; G.stats.kills++; const y=e.y-e.h*.4;
  for(let i=0;i<(e.d.heavy?14:5);i++){ const a=rand(0,TAU), s=rand(300,800); V.shards.push({x:e.x,y:e.y,z:e.h*.4,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6,vz:rand(300,900),s:rand(5,e.d.heavy?18:11),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:rand(.7,1.2)}); }
  gl0(e.x,y,e.h*.5,'#d08cff',.25,{grow:200,a:gl?.35:.7}); sfx('shatter',e.d.heavy?.8:.35);
  if(e.d.boss){ explode(e.x,y,1.6,'#d08cff','#7a1dff'); stamp('브레이크',{x:.5,y:.4,size:.14,life:1.4,c:'#d08cff'}); V.boss=null; }
  const n=e.d.boss?24:e.d.gem>=5?3:1;
  if(e.d.gem>1||Math.random()<.55) for(let i=0;i<n;i++) gem(e.x+rand(-30,30)*(n>1),e.y+rand(-30,30)*(n>1),Math.ceil(e.d.gem/n));
  if(e.d.heavy&&!e.d.boss){ const r=Math.random(); if(r<.3) V.items.push({k:'heal',x:e.x,y:e.y,t:0}); else if(r<.42) V.items.push({k:'mag',x:e.x,y:e.y,t:0}); }
  if(!lock) V.ug=Math.min(100,V.ug+(e.d.heavy?3:.3));   // what an ultimate kills does not pay for the next one
}
function gem(x,y,v){ if(V.gems.length>420){ V.gems[(Math.random()*V.gems.length)|0].v+=v; return; } V.gems.push({x,y,v,s:0,mag:false,ph:rand(0,TAU)}); }
function num(x,y,d,crit){ if(V.nums.length>140) V.nums.shift(); V.nums.push({x:x+rand(-20,20),y,t:0,txt:d>=1e4?(d/1000).toFixed(d>=1e5?0:1)+'K':String(d),crit}); }
function hurt(d,src){
  if(V.over||G.inv>0||lock||V.dash) return;
  if(counterReady()){ counter(src); return; }
  d=Math.round(d); G.hp=Math.max(0,G.hp-d); G.inv=.5; trauma=Math.min(1,trauma+.3); ov.red=.4; post.ca=Math.min(.04,post.ca+.015);
  V.nums.push({x:pl.x,y:pl.gy-BODY*1.8,t:0,txt:'-'+d,hurt:true}); sfx('boom',.5,.5); buzz(40);
  if(G.hp<=0) finish(false);
}
// the engine's ultimates call hit(): during one, everything near the hero takes it
const hit1=hit;
hit=function(d,x,y,o={}){
  if(G.mode!=='surv') return hit1(d,x,y,o);
  const R=lock?2600:(o.r||190), cx=lock?pl.x:x, cy=lock?pl.y:y+BODY; let any=false;
  inCircle(cx,cy,R,e=>{ dmg(e,d*G.mul,{kb:lock?.3:(o.kb??1),ult:lock,sx:cx,sy:cy}); any=true; });
  return any;
};

// ============================================================ skills (the RPG's sword set, re-done for a top-down field; all fire on their own)
const SKILL={
  sw_dash:{range:560,fn(id){ const e=nearest(560); if(!e) return false; const a=angTo(e), L=Math.min(520,Math.hypot(e.x-pl.x,e.y-pl.gy)+140), d=SK[id].dmg*A.mul(id);
    const x0=pl.x, y0=pl.gy, x1=x0+Math.cos(a)*L, y1=y0+Math.sin(a)*L; face(a); seq('gs',['05','07','09']);
    const J=pl.j; for(let i=0;i<6;i++){ const k=i/6; add({k:'ghost',j:shiftJ(J,(x1-x0)*k,(y1-y0)*k),life:.18+k*.14,c:'#ff6a85'}); }
    V.dash={x0,y0,x1,y1,t:0,dur:.1}; G.inv=Math.max(G.inv,.35);
    add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.4,c:'#ff3355',w:30,grow:true}); add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.3,c:'#ffffff',w:7,grow:true});
    for(let i=0;i<8;i++) smoke(x0+rand(-20,20),y0+rand(-10,10),rand(14,26),{vx:-Math.cos(a)*rand(80,300),vy:-Math.sin(a)*rand(80,300),a:.35,life:rand(.5,1)});
    sfx('whoosh',1.3,.7); sfx('slash',1.15,1);
    after(.07,()=>inLine(x0,y0,x1,y1,80,e=>{ dmg(e,d,{kb:.8,sx:x0,sy:y0}); hitFx(e,'#ff6a85',1.2); })); }},
  sw_rise:{range:380,fn(id){ const e=nearest(380); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), cx=pl.x+Math.cos(a)*190, cy=pl.gy+Math.sin(a)*190, f=pl.f=Math.cos(a)>=0?1:-1;
    seq('gt',['03','06','08'],{w:.05});
    vfxSwing({x:pl.x+f*50,y:pl.gy-BODY,r:230,a0:Math.PI/2,a1:Math.PI/2-Math.PI*f},{k:1.35,hue:15});
    ring(cx,cy,700,'#ff9aa8',.3,{w:5}); sfx('whoosh',1.2,.7); sfx('slash',1.1,.9);
    after(.03,()=>inCircle(cx,cy,220,e=>{ dmg(e,d,{kb:.3,launch:1200,stun:.9,sx:cx,sy:cy}); hitFx(e,'#ff9aa8',1.2); })); }},
  sw_wave:{range:820,fn(id){ const e=nearest(820); if(!e) return false; const a0=angTo(e), d=SK[id].dmg*A.mul(id), n=A.sLv(id)>=5?5:A.sLv(id)>=3?3:1; face(a0);
    seq('gs',['05','07','09']); sfx('whoosh',1.3,.8); sfx('slash',.9,1.1);
    for(let k=0;k<n;k++){ const a=a0+(k-(n-1)/2)*.28, p={x:pl.x+Math.cos(a)*70,y:pl.gy+Math.sin(a)*70,vx:Math.cos(a)*1500,vy:Math.sin(a)*1500,life:.85,d,hits:new Set(),v:{x:0,y:0}};
      p.v.x=p.x; p.v.y=p.y-BODY; V.pj.push(p); vfx('slash',p.v.x,p.v.y,{follow:p.v,loop:true,life:.85,sc:.8,rot:a+.6,a:.95}); } }},
  sw_spin:{range:340,fn(id){ if(countIn(360)<3&&!nearest(240)) return false; const d=SK[id].dmg*A.mul(id);
    plSeq([['gu04',.04],['gu06',.06,{tr:1,kick:[2.6,-2.4]}],['gu07',.08,{tr:1}],['gu06',.06,{tr:1}],['gu07',.08,{tr:1}],['gu08',.12],['gu12',.06]]);
    for(let i=0;i<4;i++) after(i*.13,()=>{ const a=RT*7+i*1.6, y=pl.gy-BODY*.8;
      vfxSwing({x:pl.x,y,r:300,a0:a,a1:a+2.2},{k:1.3,hue:45}); vfxSwing({x:pl.x,y,r:300,a0:a+Math.PI,a1:a+Math.PI+2.2},{k:1.3,hue:45,a:.7});
      ring(pl.x,pl.gy,1300,'#ffd36a',.35,{w:7}); sfx('whoosh',1.3,.8); sfx('slash',1.2,.9);
      inCircle(pl.x,pl.gy,360,e=>{ dmg(e,d*.5,{kb:1.1,big:i===3}); hitFx(e,'#ffd36a',1.1); }); }); }},
  sw_fly:{range:620,fn(id){ if(V.orbs.length||!nearest(620)) return false; const n=3+Math.floor((A.sLv(id)-1)/2), d=SK[id].dmg*A.mul(id)*.35;
    plSeq([['gw03',.06],['gw04',.18],['gw06',.08],['gw12',.06]]); sfx('rise',.4,.3);
    for(let i=0;i<n;i++){ const o={a:i/n*TAU,t:0,life:5,d,v:{x:pl.x,y:pl.gy-BODY}}; o.fx=vfx('goldsword',o.v.x,o.v.y,{follow:o.v,loop:true,life:5,sc:.42,a:.95}); V.orbs.push(o); } }},
  sw_plunge:{range:460,fn(id){ const e=nearest(460); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id), L=Math.max(0,Math.hypot(e.x-pl.x,e.y-pl.gy)-60), up=k=>1-(1-k)*(1-k), dn=k=>k*k; face(a);
    V.dash={x0:pl.x,y0:pl.gy,x1:pl.x+Math.cos(a)*L,y1:pl.gy+Math.sin(a)*L,t:0,dur:.42}; G.inv=Math.max(G.inv,.5);
    const land=()=>{ const cx=pl.x, cy=pl.gy; pl.air=pl.airT=0;
      shock(cx,cy-20,.8); ring(cx,cy,1700,'#ff6a85',.5,{w:9}); ring(cx,cy,900,'#ffffff',.25,{w:4}); gl0(cx,cy-40,260,'#ff6a85',.35,{grow:300,a:.6}); light(cx,cy,900,'#ff6a85',.4,.5);
      for(let i=0;i<16;i++){ const b=rand(0,TAU), s=rand(300,900); V.shards.push({x:cx,y:cy,z:10,vx:Math.cos(b)*s,vy:Math.sin(b)*s*.6,vz:rand(400,1100),s:rand(6,16),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:rand(.8,1.3),rock:true}); }
      for(let i=0;i<10;i++) smoke(cx+rand(-120,120),cy+rand(-50,50),rand(30,60),{vx:rand(-300,300),vy:rand(-120,40),a:.4,life:rand(.8,1.6)});
      trauma=Math.min(1.1,trauma+.6); hitstop=Math.max(hitstop,.05); sfx('boom',1.3,1);
      inCircle(cx,cy,390,e=>{ dmg(e,d,{kb:1.2,launch:800,stun:.7,big:true,sx:cx,sy:cy}); hitFx(e,'#ff6a85',1.4); }); };
    plSeq([['gt03',.06],['gt08',.18,{air:[0,280],ease:up}],['gs06',.06,{air:[280,300]}],['gs07',.12,{tr:1,air:[300,0],ease:dn}],['gs08',.06,{tr:1,kick:[2.6,-2.6],on:land}],['gs09',.14],['gs12',.08]]); }},
  sw_thrust:{range:400,fn(id){ const e=nearest(400); if(!e) return false; const a=angTo(e), d=SK[id].dmg*A.mul(id); face(a);
    plSeq([['gk03',.06],['gk04',.06,{kick:[1,-.8]}],['gk05',.05],['gk06',.06,{kick:[1,-.8]}],['gk07',.05],['gk08',.06,{kick:[1,-.8]}],['gk09',.16,{tr:1,kick:[2,-1.6]}],['gk12',.06]]);
    for(let i=0;i<6;i++) after(.06+i*.06,()=>{ const b=a+rand(-.12,.12), x0=pl.x+Math.cos(b)*40, y0=pl.gy+Math.sin(b)*40, x1=pl.x+Math.cos(b)*400, y1=pl.gy+Math.sin(b)*400;
      add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.16,c:'#ff3355',w:16}); add({k:'line',x1:x0,y1:y0-BODY,x2:x1,y2:y1-BODY,life:.12,c:'#ffffff',w:4}); sfx('slash',1.5,.45);
      inLine(x0,y0,x1,y1,60,e=>{ dmg(e,d,{kb:.25,stun:.3}); hitFx(e,'#ffffff',.9); }); }); }},
  sw_counter:{passive:true},
};
function counterReady(){ const id='sw_counter'; return SV().slots.includes(id)&&A.unlocked(id)&&(V.cd[id]||0)<=0; }
function counter(src){ const id='sw_counter', d=SK[id].dmg*A.mul(id); V.cd[id]=A.cdOf(id); G.inv=1.1; slow(.25,.35); setInv(.06,'inv'); stamp('카운터',{x:.5,y:.36,size:.14,life:.9,c:'#9ff7ff'}); sfx('boom',1,.8);
  if(src) face(Math.atan2(src.y-pl.gy,src.x-pl.x)); anim.seq=null;
  plSeq([['gc05',.05,{tr:1,kick:[2.8,-2.6]}],['gc06',.08,{tr:1}],['gc07',.18],['gc10',.08],['gc12',.06]]);
  const y=pl.gy-BODY*.8; vfxSwing({x:pl.x,y,r:340,a0:-2.4,a1:.2},{k:1.4,hue:-160}); vfxSwing({x:pl.x,y,r:340,a0:.7,a1:3.3},{k:1.4,hue:-160});
  ring(pl.x,pl.gy,1600,'#9ff7ff',.45,{w:8}); light(pl.x,y,900,'#9ff7ff',.5,.5);
  inCircle(pl.x,pl.gy,440,e=>{ dmg(e,d,{kb:2,big:true,crit:true}); hitFx(e,'#9ff7ff',1.5); }); }

// basic: a 3-cut chain at the nearest enemy - two cuts, then a wide heavy one
function basic(){ const e=nearest(430); if(!e) return false; const a=angTo(e), n=V.chain++%3, big=n===2, r=big?360:300, d=1200*A.mul('sw_basic')*(big?1.7:1), s=n===1?-1:1; face(a);
  seq(['gs','gt','gu'][n],[['05','06','08'],['03','05','08'],['04','06','08']][n],{basic:true});
  const y=pl.gy-BODY*.85, half=big?1.6:1.25;
  vfxSwing({x:pl.x,y,r:r*.85,a0:a-half*s,a1:a+half*s},{k:1.3,hue:big?40:0});
  add({k:'arc',x:pl.x,y,a0:a-half*s,a1:a+half*s,r:r*.8,sy:1,rot:0,th:big?80:55,c:big?'#ffd36a':'#ff6a85',life:.3,sw:.07});
  add({k:'arc',x:pl.x,y,a0:a-half*s,a1:a+half*s,r:r*.66,sy:1,rot:0,th:22,c:'#ffffff',life:.2,sw:.06});
  sfx('whoosh',1.1+n*.1,.6); sfx('slash',1+n*.06,big?1:.75);
  after(.04,()=>inSector(pl.x,pl.gy,a,r,half,e=>{ dmg(e,d,{kb:big?1.3:.7}); hitFx(e,big?'#ffd36a':'#ff6a85',big?1.3:1); }));
  return true; }
const basicCd=()=>.8*(1-.05*(A.sLv('sw_basic')-1));

// the equipped ultimate fires itself once the gauge is full. Both are side-view set pieces, so for its duration the field is
// shifted to put the hero on the engine's ground line, and everything near him takes the blows.
function shiftWorld(dx,dy){
  const mv=o=>{ if(o.x!=null){ o.x+=dx; o.y+=dy; } };
  pl.x+=dx; if(pl.gy!=null) pl.gy+=dy; cam.x+=dx; cam.fx+=dx; cam.y+=dy; cam.fy+=dy; V.ox+=dx; V.oy+=dy;
  for(const L of [V.en,V.pj,V.gems,V.items,V.nums,V.shards,V.mk]) L.forEach(mv); V.orbs.forEach(o=>mv(o.v)); V.pj.forEach(p=>p.v&&mv(p.v));
  for(const p of [...pl.scarf,...pl.coat]){ p.x+=dx; p.y+=dy; if(p.px!=null){ p.px+=dx; p.py+=dy; } }
  for(const p of parts){ if(p.follow) continue; mv(p); if(p.x1!=null){ p.x1+=dx; p.y1+=dy; p.x2+=dx; p.y2+=dy; } if(p.tx!=null){ p.tx+=dx; p.ty+=dy; } if(p.cx!=null){ p.cx+=dx; p.cy+=dy; } }
  for(const f of fires){ f.x+=dx; f.y+=dy; f.x2+=dx; f.y2+=dy; }
}
function ult(){ const id=SV().ult; V.ug=0; anim.seq=null; V.dash=null; V.joy&&joyHide();
  shiftWorld(VW*.3-pl.x,770-pl.gy); GROUND=770; pl.gy=undefined; pl.air=pl.airT=0; pl.f=1; pl.home=pl.x;
  E.x=pl.x+560; E.by=GROUND-280; E.dead=false; E.hp=E.max; E.respawn=1e9; G.mul=A.mul(id); SK[id].fn(); }

// ============================================================ spawning
function spawnPos(){ const {hw,hh}=view(), mx=hw+130, my=hh+200, p=rand(0,2*(mx+my)); let x,y;
  if(p<2*mx){ x=p-mx; y=Math.random()<.5?-my:my; } else { y=p-2*mx-my; x=Math.random()<.5?-mx:mx; }
  return [cam.x+x,cam.y+y]; }
function spawn(type,x,y){ const d=EN[type]; if(x==null) [x,y]=spawnPos();
  const e={id:V.id++,type,d,x,y,z:0,vz:0,kx:0,ky:0,hp:d.hp*hm(),max:d.hp*hm(),h:d.h*d.sc,f:1,walkT:rand(0,1),flash:0,stun:0,hitCd:0,hurtT:0,atk:rand(1,2.5),castT:0,dead:false};
  V.en.push(e); return e; }
function spawnTick(rdt){
  const t=V.t, n=alive().length;
  // they come in packs from just off screen: more packs, and bigger ones, as time goes on
  V.spawn+=rdt*(.9+t*.03); let live=n;
  while(V.spawn>=1){ V.spawn--; const [px,py]=spawnPos(), k=3+Math.floor(t/60)+(Math.random()*3|0);
    for(let i=0;i<k&&live<CAP;i++,live++){ const r=Math.random(); spawn(t>60&&r<.05+t/4000?'brute':t>25&&r<.2?'archer':'shard',px+rand(-90,90),py+rand(-90,90)); } }
  // encircling hordes every minute, then the boss
  const hz=[50,110,170,230];
  if(V.horde<hz.length&&t>=hz[V.horde]){ V.horde++; const {hw,hh}=view(), R=Math.max(hw,hh)+150, k=Math.round(26+t/7);
    for(let i=0;i<k;i++){ const a=i/k*TAU; spawn(t>150&&i%6===0?'brute':'shard',pl.x+Math.cos(a)*R,pl.gy+Math.sin(a)*R*.75); }
    stamp('호드',{x:.5,y:.28,size:.1,life:1.1,c:'#ff4a6a'}); sfx('siren',.8); }
  if(!V.bossDone&&t>=BOSS_T){ V.bossDone=true; V.boss=spawn('boss'); warn={t:0,dur:1.8}; SFX.siren(1.6); stamp('골렘 킹',{x:.5,y:.3,size:.12,life:1.6,c:'#d08cff'}); }
}

// ============================================================ per-frame
function input(){ let x=(V.keys.r?1:0)-(V.keys.l?1:0), y=(V.keys.d?1:0)-(V.keys.u?1:0);
  if(V.joy){ const l=Math.hypot(V.joy.dx,V.joy.dy); if(l>8){ x=V.joy.dx/62; y=V.joy.dy/62; } }
  const l=Math.hypot(x,y); return l>1?[x/l,y/l]:[x,y]; }
function pre(rdt){
  const dt=hitstop>0?0:rdt*timeScale;
  if(lock||V.over){ if(!lock) pl.gy=pl.gy??pl.y; return; }
  GROUND=FAR; if(pl.gy==null) pl.gy=pl.y;
  G.inv=Math.max(0,G.inv-rdt); V.fxB=14;
  for(const k in V.cd) V.cd[k]=Math.max(0,V.cd[k]-rdt); V.gcd-=rdt; V.bcd-=rdt;
  // movement (a dash or leap tweens the hero instead)
  const [mx,my]=input(), moving=!V.dash&&(mx||my);
  if(V.dash){ const D=V.dash; D.t+=rdt; const k=Math.min(1,D.t/D.dur), x=lerp(D.x0,D.x1,k), y=lerp(D.y0,D.y1,k), dx=x-pl.x, dy=y-pl.gy;
    pl.x=x; pl.gy=y; for(const p of [...pl.scarf,...pl.coat]){ p.x+=dx; p.y+=dy; if(p.px!=null){ p.px+=dx; p.py+=dy; } } if(k>=1) V.dash=null; }
  else if(moving){ pl.x+=mx*SPD*dt; pl.gy+=my*SPD*dt; if(!anim.seq&&Math.abs(mx)>.1) pl.f=mx>0?1:-1; G.runT+=rdt; }
  if(V.boss&&!V.boss.dead){ /* the boss is a wall, not a ghost */ const b=V.boss, dx=pl.x-b.x, dy=pl.gy-b.y, l=Math.hypot(dx,dy)||1, m=b.d.r+50; if(l<m){ pl.x=b.x+dx/l*m; pl.gy=b.y+dy/l*m; } }
  if(!(anim.seq&&anim.seq.steps.some(s=>s[2]&&s[2].air))) pl.airT=0;   // only a leap holds him in the air
  G.jz=0; A.stickLoco(rdt,moving);
  pl.home=pl.x;
  // auto attacks: the basic chain, then any equipped skill that is ready and has a target
  if(V.bcd<=0&&(!anim.seq||anim.seq.basic)&&basic()) V.bcd=basicCd();
  if(V.gcd<=0&&(!anim.seq||anim.seq.basic)) for(const id of SV().slots){ if(!id||!A.unlocked(id)||(V.cd[id]||0)>0) continue; const s=SKILL[id]; if(!s||s.passive) continue;
    if(s.fn(id)!==false){ V.cd[id]=A.cdOf(id); V.gcd=.3; V.bcd=Math.max(V.bcd,.25); break; } }
  E.dead=false; E.hp=E.max; E.respawn=1e9; E.x=pl.x+FAR;
  const uid=SV().ult; if(uid&&A.unlocked(uid)&&V.ug>=100&&(countIn(1500)>=8||(V.boss&&!V.boss.dead))) ult();
}
function post(rdt){
  const dt=hitstop>0?0:rdt*timeScale;
  if(V.wasLock&&!lock){ pl.gy=pl.y; GROUND=FAR; pl.air=pl.airT=0; }
  V.wasLock=lock; document.body.classList.toggle('cine',lock);
  for(let i=V.nums.length-1;i>=0;i--){ const n=V.nums[i]; n.t+=rdt; n.y-=70*rdt; if(n.t>.75) V.nums.splice(i,1); }
  for(let i=V.shards.length-1;i>=0;i--){ const s=V.shards[i]; s.t+=dt; s.x+=s.vx*dt; s.y+=s.vy*dt; s.vz-=2600*dt; s.z+=s.vz*dt; s.rot+=s.vr*dt; if(s.z<0){ s.z=0; s.vz*=-.3; s.vx*=.5; s.vy*=.5; } if(s.t>s.life) V.shards.splice(i,1); }
  if(lock) return;
  if(!V.over){ V.t+=rdt; if(V.t>=DUR) finish(true); spawnTick(rdt); }
  stepEnemies(dt); stepOrbs(dt); if(!V.over) stepPickups(dt);
  for(let i=V.pj.length-1;i>=0;i--){ const p=V.pj[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.v){ p.v.x=p.x; p.v.y=p.y-BODY; }
    if(p.orb){ if(!V.over&&Math.hypot(p.x-pl.x,p.y-pl.gy)<55){ hurt(p.dmg*dm(),p); gl0(p.x,p.y-BODY,80,'#b06bff',.2); p.life=0; } }
    else { inCircle(p.x,p.y,90,e=>{ if(p.hits.has(e)) return; p.hits.add(e); dmg(e,p.d,{kb:.8,sx:p.x-p.vx,sy:p.y-p.vy}); hitFx(e,'#ff6a85',1); });
      if(Math.random()<.7) gl0(p.v.x,p.v.y+rand(-60,60),rand(8,16),'#ff6a85',.25,{a:.6}); }
    if(p.life<=0) V.pj.splice(i,1); }
  for(let i=V.mk.length-1;i>=0;i--){ const m=V.mk[i]; m.t+=dt; if(m.t>=m.dur){ V.mk.splice(i,1); spike(m); } }
  // persistent EXP is banked in batches (each bank saves)
  V.accT-=rdt; if(V.acc>0&&V.accT<=0){ const lv=SV().lv; A.gainExp(V.acc); V.run+=V.acc; V.acc=0; V.accT=.5;
    if(SV().lv>lv){ ring(pl.x,pl.gy,1400,'#ffcf4a',.6,{w:7}); gl0(pl.x,pl.gy-BODY,260,'#ffcf4a',.5,{grow:300,a:.6}); buildBar(); } }
  V.en=V.en.filter(e=>!e.dead);
  hud();
}
function stepEnemies(dt){
  if(dt<=0) return; const {hw,hh}=view(), far=Math.max(hw,hh)*2.6, mul=1+V.t/600;
  for(const e of V.en){ if(e.dead) continue; const D=e.d;
    e.flash=Math.max(0,e.flash-dt*6); e.hitCd-=dt; e.hurtT-=dt; e.castT-=dt; e.orbT=(e.orbT||0)-dt;
    e.x+=e.kx*dt; e.y+=e.ky*dt; const kd=Math.exp(-dt*8); e.kx*=kd; e.ky*=kd;
    if(e.z>0||e.vz>0){ e.vz-=3000*dt; e.z+=e.vz*dt; if(e.z<=0){ e.z=0; e.vz=0; } }
    if(e.stun>0){ e.stun-=dt; continue; }
    const dx=pl.x-e.x, dy=pl.gy-e.y, l=Math.hypot(dx,dy)||1; if(Math.abs(dx)>4) e.f=dx>0?1:-1;
    if(!D.boss&&l>far){ const [x,y]=spawnPos(); e.x=x; e.y=y; continue; }
    if(V.over) continue;
    let go=1;
    if(D.ranged){ go=l>560?1:l<380?-1:0; e.atk-=dt; if(e.atk<=0&&l<760){ e.atk=rand(2.4,3.4); e.castT=.55;
        after(.3,()=>{ if(e.dead||G.mode!=='surv') return; const a=Math.atan2(pl.gy-e.y,pl.x-e.x); V.pj.push({orb:true,x:e.x+Math.cos(a)*40,y:e.y+Math.sin(a)*40,vx:Math.cos(a)*520,vy:Math.sin(a)*520,life:3.2,dmg:D.dmg}); sfx('whoosh',1.6,.2); }); } }
    if(D.boss){ e.atk-=dt; if(e.atk<=0){ e.atk=3; e.castT=.9; const n=V.t>270?5:3;
        for(let i=0;i<n;i++){ const a=rand(0,TAU), r=i?rand(140,320):0; V.mk.push({x:pl.x+Math.cos(a)*r,y:pl.gy+Math.sin(a)*r,t:-i*.1,dur:1,r:170,dmg:D.dmg*1.2}); } sfx('click'); } }
    if(e.castT>0&&!D.ranged) go=.2;
    const sp=D.spd*mul*go*(e.z>0?0:1); e.x+=dx/l*sp*dt; e.y+=dy/l*sp*dt; e.walkT+=Math.abs(go)*dt;
    if(l<50+D.r&&e.z<60&&e.hitCd<=0){ e.hitCd=.9; hurt(D.dmg*dm(),e); }
  }
  // spread the crowd (spatial hash) and keep it off the hero
  const C=120, g=new Map(), key=(x,y)=>x*65536+y;
  for(const e of V.en){ if(e.dead) continue; const k=key(Math.floor(e.x/C),Math.floor(e.y/C)); let L=g.get(k); if(!L) g.set(k,L=[]); L.push(e); }
  for(const e of V.en){ if(e.dead) continue; const cx=Math.floor(e.x/C), cy=Math.floor(e.y/C);
    for(let i=-1;i<=1;i++) for(let j=-1;j<=1;j++){ const L=g.get(key(cx+i,cy+j)); if(!L) continue;
      for(const o of L){ if(o.id<=e.id) continue; const dx=o.x-e.x, dy=o.y-e.y, m=(e.d.r+o.d.r)*.9, d2=dx*dx+dy*dy; if(d2>=m*m||d2<1e-4) continue;
        const d=Math.sqrt(d2), p=(m-d)*.5*Math.min(1,dt*10), ux=dx/d, uy=dy/d, we=e.d.heavy?.2:1, wo=o.d.heavy?.2:1;
        e.x-=ux*p*we; e.y-=uy*p*we; o.x+=ux*p*wo; o.y+=uy*p*wo; } }
    const dx=e.x-pl.x, dy=e.y-pl.gy, m=e.d.r+34, d2=dx*dx+dy*dy; if(d2<m*m&&!e.d.boss){ const d=Math.sqrt(d2)||1; e.x=pl.x+dx/d*m; e.y=pl.gy+dy/d*m; } }
}
function stepOrbs(dt){
  for(let i=V.orbs.length-1;i>=0;i--){ const o=V.orbs[i]; o.t+=dt; o.a+=dt*4.2; const R=270, x=pl.x+Math.cos(o.a)*R, y=pl.gy+Math.sin(o.a)*R*.8;
    o.v.x=x; o.v.y=y-BODY*.7; if(o.fx) o.fx.rot=o.a+Math.PI/2;
    if(Math.random()<.5) gl0(o.v.x,o.v.y,rand(10,20),'#ffcf4a',.25,{a:.6});
    inCircle(x,y,70,e=>{ if((e.orbT||0)>0) return; e.orbT=.3; dmg(e,o.d,{kb:.6,sx:pl.x,sy:pl.gy}); hitFx(e,'#ffcf4a',.9); sfx('slash',1.6,.3); });
    if(o.t>=o.life) V.orbs.splice(i,1); }
}
function stepPickups(dt){
  const R=V.mag>0?1e5:220; V.mag-=dt;
  for(let i=V.gems.length-1;i>=0;i--){ const g=V.gems[i], dx=pl.x-g.x, dy=pl.gy-g.y, l=Math.hypot(dx,dy)||1;
    if(!g.mag&&l<R) g.mag=true;
    if(g.mag){ g.s+=(V.mag>0?4000:2600)*dt; g.x+=dx/l*Math.min(l,g.s*dt); g.y+=dy/l*Math.min(l,g.s*dt); }
    if(l<50){ V.acc+=g.v; V.gems.splice(i,1); sfx('click'); } }
  for(let i=V.items.length-1;i>=0;i--){ const it=V.items[i]; it.t+=dt; if(Math.hypot(pl.x-it.x,pl.gy-it.y)>80) continue; V.items.splice(i,1);
    if(it.k==='heal'){ const h=Math.round(A.maxHp()*.25); G.hp=Math.min(A.maxHp(),G.hp+h); V.nums.push({x:pl.x,y:pl.gy-BODY*1.8,t:0,txt:'+'+h,heal:true}); gl0(pl.x,pl.gy-BODY,200,'#55ff9a',.5,{grow:200,a:.6}); sfx('rise',.5,.4); }
    else { V.mag=1.2; ring(pl.x,pl.gy,2400,'#55ddff',.6,{w:6}); sfx('rise',.7,.5); } }
}
function spike(m){ ring(m.x,m.y,800,'#c06bff',.35,{w:6}); gl0(m.x,m.y-80,160,'#b06bff',.3,{a:.7}); sfx('shatter',.4);
  for(let i=0;i<8;i++){ const a=rand(0,TAU), s=rand(100,400); V.shards.push({x:m.x,y:m.y,z:5,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.6,vz:rand(700,1300),s:rand(8,18),rot:rand(0,TAU),vr:rand(-9,9),t:0,life:1.2}); }
  if(Math.hypot(pl.x-m.x,pl.gy-m.y)<m.r+30) hurt(m.dmg*dm(),m); }

const upd1=update;
update=function(rdt){ if(G.mode!=='surv') return upd1(rdt); if(G.paused) return;
  pre(rdt); upd1(rdt); post(rdt);
  if(!lock){ const k=1-Math.exp(-rdt*9); cam.ft=99; cam.fx=pl.x; cam.fy=pl.gy-BODY*.6; cam.fz=PORTRAIT?ZP:ZL; cam.x=lerp(cam.x,cam.fx,k); cam.y=lerp(cam.y,cam.fy,k); } };
const respawn1=respawn; respawn=function(){ if(G.mode==='surv') return; return respawn1(); };
const plSprites1=plSprites; plSprites=function(){ return G.mode==='surv'?null:plSprites1(); };

// ============================================================ drawing
let floorPat=null;
function floor(){ if(floorPat) return floorPat;
  const N=4, T_=160, cv=document.createElement('canvas'); cv.width=cv.height=N*T_; const g=cv.getContext('2d');
  let sd=7; const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;
  g.fillStyle='#120f19'; g.fillRect(0,0,cv.width,cv.height);
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){ const x=i*T_, y=j*T_, v=rnd();
    g.fillStyle=`rgb(${24+v*8|0},${20+v*6|0},${32+v*10|0})`; g.fillRect(x+3,y+3,T_-6,T_-6);
    g.fillStyle='rgba(255,255,255,.035)'; g.fillRect(x+3,y+3,T_-6,2); g.fillRect(x+3,y+3,2,T_-6);
    g.fillStyle='rgba(0,0,0,.25)'; g.fillRect(x+3,y+T_-5,T_-6,2);
    if(rnd()<.35){ g.strokeStyle='rgba(0,0,0,.35)'; g.lineWidth=1.5; g.beginPath(); let cx=x+rnd()*T_, cy=y+rnd()*T_; g.moveTo(cx,cy); for(let k=0;k<4;k++){ cx+=rand(-30,30); cy+=rand(-30,30); g.lineTo(clamp(cx,x+4,x+T_-4),clamp(cy,y+4,y+T_-4)); } g.stroke(); }
    if(rnd()<.18){ const cx=x+20+rnd()*(T_-40), cy=y+20+rnd()*(T_-40), s=4+rnd()*6; g.fillStyle='rgba(180,110,255,.22)'; g.beginPath(); g.moveTo(cx,cy-s*2); g.lineTo(cx+s,cy); g.lineTo(cx,cy+s*.6); g.lineTo(cx-s,cy); g.closePath(); g.fill(); } }
  return floorPat=ctx.createPattern(cv,'repeat'); }
const prep1=drawBackground_prep;
drawBackground_prep=function(){ prep1(); if(G.mode!=='surv') return;
  applyCam(ctx); const {hw,hh}=view(), m=1.3, p=floor(); p.setTransform(new DOMMatrix().translate(V.ox%640,V.oy%640));
  ctx.fillStyle=p; ctx.fillRect(cam.x-hw*m,cam.y-hh*m,hw*2*m,hh*2*m);
  ctx.setTransform(1,0,0,1,0,0); };
const bg1=drawBackground; drawBackground=function(){ if(G.mode!=='surv') return bg1(); };

function eFrame(e){ const F=A.EFR[e.d.img]; if(!F) return null; let a='walk', i=0;
  if(F.hurt&&(e.z>0||e.stun>0||e.hurtT>0)){ a='hurt'; const n=F.hurt.length; i=e.z>0?2:Math.min(n-1,Math.floor((1-Math.max(0,e.hurtT)/.3)*n)); }
  else if(F.attack&&e.castT>0){ a='attack'; const dur=e.d.boss?.9:.55; i=clamp(Math.floor((1-e.castT/dur)*F.attack.length),0,F.attack.length-1); }
  else { const n=F.walk.length-1, k=Math.floor(e.walkT/(e.d.heavy?.14:.1))%n; i=1+k; }
  const L=F[a], s=L&&spr(`enemy_${e.d.img}_${a}${A.fr2(i+1)}`); return s?{s,d:L[i]}:null; }
function drawE(e){ const D=e.d, sc=D.sc, x=e.x, y=e.y, fr=eFrame(e);
  ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,y+2,D.r*1.25*(1-Math.min(.5,e.z/600)),D.r*.42,0,0,TAU); ctx.fill();
  if(fr){ const [fw,fh,fa]=fr.d; ctx.save(); ctx.translate(x,y-e.z+4); ctx.scale(e.f*sc,sc); if(e.z>0) ctx.rotate(-.3); ctx.drawImage(fr.s.im,-fa*fw,-fh,fw,fh); ctx.restore(); }
  else { ctx.fillStyle='#3d1458'; ctx.beginPath(); ctx.ellipse(x,y-e.h*.5-e.z,D.r,e.h*.5,0,0,TAU); ctx.fill(); }
  if(e.flash>0) glow(fx,x,y-e.h*.5-e.z,e.h*.45,'#ffffff',e.flash*.55);
  if(D.heavy){ glow(fx,x,y-6,D.r*1.4,'#7a2cff',.2);
    if(!D.boss&&e.hp<e.max){ const bw=D.r*1.6, by=y-e.h-e.z-20; ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(x-bw/2-2,by-2,bw+4,10); ctx.fillStyle='#ff3d5a'; ctx.fillRect(x-bw/2,by,bw*e.hp/e.max,6); } }
  if(e.castT>0&&D.ranged) glow(fx,x+e.f*30,y-e.h*.7,40,'#d08cff',.8); }
const drawEnemy1=drawEnemy;
drawEnemy=function(){ if(G.mode!=='surv') return drawEnemy1();
  // floor layer: boss markers, gems, items, shards
  for(const m of V.mk){ if(m.t<0) continue; const k=m.t/m.dur; ctx.strokeStyle=`rgba(255,40,80,${.35+.5*k})`; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(m.x,m.y,m.r,m.r*.7,0,0,TAU); ctx.stroke();
    ctx.fillStyle=`rgba(255,30,70,${.1+.25*k})`; ctx.beginPath(); ctx.ellipse(m.x,m.y,m.r*k,m.r*.7*k,0,0,TAU); ctx.fill(); glow(fx,m.x,m.y,m.r,'#ff2244',.15+.3*k); }
  for(const g of V.gems){ const c=g.v>=5?'#ffcf4a':g.v>=2?'#ff6a9a':'#55ddff', s=g.v>=5?16:g.v>=2?12:9, y=g.y-10+Math.sin(RT*4+g.ph)*3;
    ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(g.x,y-s*1.4); ctx.lineTo(g.x+s,y); ctx.lineTo(g.x,y+s*.9); ctx.lineTo(g.x-s,y); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(g.x,y-s*1.4); ctx.lineTo(g.x+s*.35,y-s*.3); ctx.lineTo(g.x-s*.2,y-s*.1); ctx.closePath(); ctx.fill();
    glow(fx,g.x,y,s*2.6,c,.45); }
  for(const it of V.items){ const y=it.y-30+Math.sin(RT*3+it.x)*6, c=it.k==='heal'?'#55ff9a':'#55ddff';
    ctx.fillStyle='rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(it.x,it.y,26,9,0,0,TAU); ctx.fill();
    ctx.fillStyle=c; ctx.beginPath(); if(it.k==='heal'){ ctx.arc(it.x-9,y-6,11,Math.PI,0); ctx.arc(it.x+9,y-6,11,Math.PI,0); ctx.lineTo(it.x,y+16); } else { ctx.arc(it.x,y,18,0,TAU); }
    ctx.closePath(); ctx.fill(); if(it.k==='mag'){ ctx.strokeStyle='#05030a'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(it.x,y,9,Math.PI,0); ctx.stroke(); }
    glow(fx,it.x,y,60,c,.6+.2*Math.sin(RT*6)); }
  for(const s of V.shards){ const a=clamp(1-(s.t-s.life*.6)/(s.life*.4),0,1); ctx.globalAlpha=a; ctx.save(); ctx.translate(s.x,s.y-s.z); ctx.rotate(s.rot);
    ctx.fillStyle=s.rock?'#3a3046':'#8a4cd8'; ctx.beginPath(); ctx.moveTo(0,-s.s); ctx.lineTo(s.s*.6,0); ctx.lineTo(0,s.s*.7); ctx.lineTo(-s.s*.6,0); ctx.closePath(); ctx.fill(); ctx.restore();
    if(!s.rock) glow(fx,s.x,s.y-s.z,s.s*1.6,'#c06bff',.4*a); }
  ctx.globalAlpha=1;
  V.sorted=V.en.filter(e=>!e.dead).sort((a,b)=>a.y-b.y);
  for(const e of V.sorted) if(e.y<=(pl.gy??pl.y)) drawE(e);
};
const drawPlayer1=drawPlayer;
drawPlayer=function(){ drawPlayer1(); if(G.mode!=='surv') return;
  for(const e of V.sorted||[]) if(e.y>(pl.gy??pl.y)) drawE(e);
  for(const p of V.pj) if(p.orb){ const y=p.y-BODY; glow(fx,p.x,y,50,'#b06bff',.85); glow(fx,p.x,y,16,'#ffffff',1); ctx.fillStyle='#2a0a3a'; ctx.beginPath(); ctx.arc(p.x,y,10,0,TAU); ctx.fill(); }
  if(G.inv>0&&!lock&&!V.dash) glow(fx,pl.x,pl.gy-BODY,180,'#ff2244',G.inv*.5);
  if(counterReady()&&!lock) glow(fx,pl.x,pl.gy-BODY,150,'#9ff7ff',.12+.08*Math.sin(RT*6)); };
// numbers and the hero's own health bar go over everything (after the effect layer is composited)
const drawHUD1=drawHUD;
drawHUD=function(){ if(G.mode!=='surv') return drawHUD1();
  applyCam(ctx); ctx.textAlign='center'; ctx.lineJoin='round';
  for(const n of V.nums){ const a=clamp(1-(n.t-.45)/.3,0,1), s=n.hurt?46:n.heal?44:n.crit?40:30, pop=1+Math.max(0,.15-n.t)*3;
    ctx.globalAlpha=a; ctx.font=`900 ${s*pop}px "Arial Black",Impact,sans-serif`; ctx.lineWidth=7; ctx.strokeStyle='#000'; ctx.strokeText(n.txt,n.x,n.y);
    ctx.fillStyle=n.hurt?'#ff4a5a':n.heal?'#55ff9a':n.crit?'#ffcf4a':'#ffffff'; ctx.fillText(n.txt,n.x,n.y); }
  ctx.globalAlpha=1;
  if(!lock&&pl.gy!=null){ const w=110, x=pl.x-w/2, y=pl.gy+26, k=clamp(G.hp/A.maxHp(),0,1); ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(x-3,y-3,w+6,16);
    ctx.fillStyle=k<.3?'#ff2a3a':'#ff5a6a'; ctx.fillRect(x,y,w*k,10); }
  // letterbox (ultimates) and a compact hit counter under the timer, so it never covers the field
  ctx.setTransform(1,0,0,1,0,0);
  if(ov.lb>.01){ ctx.fillStyle='#000'; const b=H*.11*ov.lb; ctx.fillRect(0,0,W,b); ctx.fillRect(0,H-b,W,b); }
  if(combo>1&&!lock){ const u=W/innerWidth, s=1+comboPop*.35, x=W-18*u, y=H*.16;
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.textAlign='right'; ctx.lineJoin='round';
    ctx.font=`italic 900 ${40*u}px "Arial Black",Impact,sans-serif`; ctx.lineWidth=7*u; ctx.strokeStyle='#000'; ctx.strokeText(combo,0,0); ctx.fillStyle=combo>300?'#ff2a4a':combo>100?'#ffcf4a':'#ffffff'; ctx.fillText(combo,0,0);
    ctx.font=`italic 900 ${14*u}px "Arial Black",sans-serif`; ctx.lineWidth=4*u; ctx.strokeText('HITS',0,18*u); ctx.fillStyle='#fff'; ctx.fillText('HITS',0,18*u); ctx.restore(); } };

// ============================================================ DOM: HUD, joystick, results
const css=document.createElement('style'); css.textContent=`
body.surv #rrot{display:none!important}
.sv{position:fixed;display:none;font-family:"Pretendard","Malgun Gothic",sans-serif;color:#fff;-webkit-user-select:none;user-select:none}
.sv.on{display:flex}
#shud{inset:0;z-index:18;pointer-events:none;flex-direction:column;padding:12px max(14px,env(safe-area-inset-right)) 12px max(14px,env(safe-area-inset-left));box-sizing:border-box}
#shud .top{display:flex;align-items:flex-start;gap:12px}
#shud .me{width:min(300px,36vw)} #shud .me b{font:900 15px "Malgun Gothic",sans-serif;display:block;margin-bottom:4px}
#shud .xb{height:6px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.25)} #shud .xb i{display:block;height:100%;background:#55ddff}
#shud .ub{height:7px;margin-top:5px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.25)} #shud .ub i{display:block;height:100%;background:#fff}
#shud .ub.full{box-shadow:0 0 0 2px #fff,0 0 12px #fff}
#shud .mid{flex:1;text-align:center} #shud .tm{font:900 34px "Arial Black",Impact,sans-serif;letter-spacing:.04em;text-shadow:0 2px 0 #000,0 0 12px rgba(0,0,0,.8)}
#shud .kc{font-size:13px;color:#e8dcff;text-shadow:0 1px 0 #000}
#shud .pz{pointer-events:auto;width:44px;height:44px;border-radius:12px;background:rgba(10,6,20,.6);border:1px solid rgba(255,255,255,.35);color:#fff;font-size:15px;cursor:pointer}
#shud .bb{margin:8px auto 0;width:min(520px,70vw);display:none} #shud .bb.on{display:block}
#shud .bb small{display:block;text-align:center;font:900 13px "Malgun Gothic",sans-serif;color:#d08cff;margin-bottom:3px}
#shud .bb div{height:12px;background:rgba(0,0,0,.6);border:1px solid rgba(208,140,255,.6)} #shud .bb i{display:block;height:100%;background:linear-gradient(90deg,#7a1dff,#d08cff)}
#shud .sk{margin-top:auto;align-self:center;display:flex;gap:6px}
#shud .c{position:relative;width:54px;height:54px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(10,6,20,.6);display:flex;align-items:center;justify-content:center;text-align:center;font:800 10.5px "Malgun Gothic",sans-serif;line-height:1.15;word-break:keep-all;overflow:hidden;padding:3px;box-sizing:border-box}
#shud .c.off{opacity:.3} #shud .c.u{border-color:rgba(255,255,255,.6)} #shud .c.u.rd{box-shadow:0 0 0 2px #fff}
#shud .c .cd{position:absolute;inset:0;background:rgba(0,0,0,.62);transform-origin:bottom}
#sjoy{inset:0;z-index:17;touch-action:none}
#sjoy .bs{position:absolute;width:124px;height:124px;margin:-62px 0 0 -62px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(10,6,20,.25);display:none;pointer-events:none}
#sjoy .kn{position:absolute;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.7);display:none;pointer-events:none}
#sjoy.act .bs,#sjoy.act .kn{display:block}
#sres{inset:0;z-index:30;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
#sres .box{background:rgba(12,8,22,.94);border:1px solid rgba(255,255,255,.2);padding:24px 34px;border-radius:8px;text-align:center;min-width:300px}
#sres h2{margin:0;font:900 48px "Malgun Gothic",sans-serif} #sres h2.w{color:#ffcf4a} #sres h2.l{color:#ff4a5a}
#sres .st{display:flex;gap:16px;justify-content:center;margin:14px 0;font-size:13px;color:#b9b3d0;flex-wrap:wrap} #sres .st b{color:#fff}
#sres .lv{color:#55ddff;margin-bottom:16px} #sres .row{display:flex;gap:8px;justify-content:center}
#sres button{font:inherit;cursor:pointer;border:1px solid rgba(255,255,255,.3);background:rgba(20,14,34,.85);color:#fff;padding:10px 18px;border-radius:6px}
#rmenu .survbt{display:block;width:min(460px,100%);text-align:left;padding:14px 16px;margin-bottom:10px;border:1px solid #ff3355;background:linear-gradient(90deg,rgba(255,51,85,.35),rgba(20,14,34,.85));font-size:16px;font-weight:900}
#rmenu .survbt small{display:block;font-size:11px;font-weight:400;color:#ffd0da;margin-top:3px}
@media (max-height:520px){ #shud .tm{font-size:26px} #shud .c{width:46px;height:46px;font-size:9.5px} #sres .box{padding:14px 20px} #sres h2{font-size:34px} }`;
document.head.appendChild(css);
const mk=(id,html)=>{ const d=document.createElement('div'); d.id=id; d.className='sv'; d.innerHTML=html||''; document.body.appendChild(d); return d; };
const joyEl=mk('sjoy','<div class="bs"></div><div class="kn"></div>'), hudEl=mk('shud'), resEl=mk('sres');
hudEl.innerHTML='<div class="top"><div class="me"><b></b><div class="xb"><i></i></div><div class="ub"><i></i></div></div><div class="mid"><div class="tm">0:00</div><div class="kc"></div></div><button class="pz">❚❚</button></div><div class="bb"><small>골렘 킹</small><div><i></i></div></div><div class="sk"></div>';
hudEl.querySelector('.pz').addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); if(G.mode==='surv'&&!V.over) A.setPause(true); });
const $=s=>hudEl.querySelector(s);
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
let cells=[];
function buildBar(){ const L=[['sw_basic','basic'],...SV().slots.map(id=>[id,'s']),[SV().ult,'u']];
  $('.sk').innerHTML=L.map(([id,k])=>`<div class="c ${k==='u'?'u':''} ${id&&A.unlocked(id)?'':'off'}">${id&&A.unlocked(id)?SK[id].name:'—'}<div class="cd" style="transform:scaleY(0)"></div></div>`).join('');
  cells=[...$('.sk').children].map((el,i)=>({el,cd:el.querySelector('.cd'),id:L[i][0],k:L[i][1]})); V.lv=SV().lv; }
function hud(){
  if(V.lv!==SV().lv) buildBar();
  $('.me b').textContent=`소드맨 · Lv ${SV().lv}`; $('.xb i').style.width=(SV().exp/A.needExp(SV().lv)*100)+'%';
  $('.ub i').style.width=V.ug+'%'; $('.ub').classList.toggle('full',V.ug>=100);
  $('.tm').textContent=mmss(Math.max(0,DUR-V.t)); $('.kc').textContent=`처치 ${V.kills}`;
  const b=V.boss&&!V.boss.dead; $('.bb').classList.toggle('on',!!b); if(b) $('.bb i').style.width=(V.boss.hp/V.boss.max*100)+'%';
  for(const c of cells){ if(!c.id||!A.unlocked(c.id)) continue; let k=0;
    if(c.k==='basic') k=Math.max(0,V.bcd)/basicCd(); else if(c.k==='u'){ k=1-V.ug/100; c.el.classList.toggle('rd',V.ug>=100); } else k=(V.cd[c.id]||0)/A.cdOf(c.id);
    c.cd.style.transform=`scaleY(${clamp(k,0,1)})`; } }
// joystick: press anywhere and drag (touch or mouse)
const bs=joyEl.querySelector('.bs'), kn=joyEl.querySelector('.kn');
function joyHide(){ V.joy=null; joyEl.classList.remove('act'); }
joyEl.addEventListener('pointerdown',e=>{ if(G.mode!=='surv'||G.paused||V.over||lock) return; e.preventDefault(); try{ joyEl.setPointerCapture(e.pointerId); }catch(_){}
  V.joy={id:e.pointerId,x0:e.clientX,y0:e.clientY,dx:0,dy:0}; bs.style.left=kn.style.left=e.clientX+'px'; bs.style.top=kn.style.top=e.clientY+'px'; joyEl.classList.add('act'); });
joyEl.addEventListener('pointermove',e=>{ const j=V.joy; if(!j||e.pointerId!==j.id) return; let dx=e.clientX-j.x0, dy=e.clientY-j.y0; const l=Math.hypot(dx,dy);
  if(l>62){ dx*=62/l; dy*=62/l; } j.dx=dx; j.dy=dy; kn.style.left=(j.x0+dx)+'px'; kn.style.top=(j.y0+dy)+'px'; });
const joyUp=e=>{ if(V.joy&&e.pointerId===V.joy.id) joyHide(); };
joyEl.addEventListener('pointerup',joyUp); joyEl.addEventListener('pointercancel',joyUp);
// keyboard (rpg.js hands key events over while in this mode)
const KM={KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',KeyW:'u',ArrowUp:'u',KeyS:'d',ArrowDown:'d'};
G.survKey=(e,down)=>{ const k=KM[e.code]; if(k){ V.keys[k]=down; e.preventDefault(); return; }
  if(down&&e.code==='Escape'&&!V.over) A.setPause(!G.paused); };
addEventListener('blur',()=>{ V.keys={}; joyHide(); });

// ============================================================ run flow
function start(){
  if(!AC) initAudio(); if(AC&&AC.state!=='running') AC.resume();
  Object.assign(V,{t:0,en:[],pj:[],gems:[],items:[],nums:[],shards:[],mk:[],orbs:[],kills:0,run:0,acc:0,accT:0,ug:0,cd:{},gcd:0,bcd:.5,chain:0,dash:null,boss:null,bossDone:false,spawn:0,horde:0,over:false,keys:{},wasLock:false,mag:0,id:0});
  joyHide(); G.mode='surv'; G.paused=false; G.hp=A.maxHp(); G.inv=0; G.jz=G.jv=0; G.runT=0; G.stats={kills:0,dmg:0,exp:0,t:RT}; combo=0;
  lock=false; anim.seq=null; parts.length=0; timers.length=0; fires.length=0; cutin=null; warn=null; timeScale=1; slowHold=0; hitstop=0; trauma=0;
  pl.target=IDLE(); pl.ps=12; pl.visible=true; pl.air=pl.airT=0; pl.f=1; pl.x=pl.home=VW/2; pl.gy=770; GROUND=FAR;
  E.dead=false; E.respawn=1e9; cam.x=cam.fx=pl.x; cam.y=cam.fy=pl.gy-BODY*.6; cam.z=cam.fz=PORTRAIT?ZP:ZL; cam.ft=99;
  A.menuEl.classList.remove('on'); resEl.classList.remove('on'); document.body.classList.add('surv'); hudEl.classList.add('on'); joyEl.classList.add('on'); buildBar(); hud();
  for(let i=0;i<10;i++) spawn('shard');
  add({k:'banner',name:'서바이벌',en:'SURVIVE 5:00',c:'#ff3355',life:2.4});
}
function end(){ // leaving the mode: hand the engine back its ground line and camera
  V.over=true; joyHide(); hudEl.classList.remove('on'); joyEl.classList.remove('on'); resEl.classList.remove('on'); document.body.classList.remove('surv','cine');
  V.en=[]; V.pj=[]; V.gems=[]; V.items=[]; V.nums=[]; V.shards=[]; V.mk=[]; V.orbs=[];
  parts.length=0; timers.length=0; fires.length=0; cutin=null; warn=null; lock=false; anim.seq=null; timeScale=1; slowHold=0; ov.lbT=0; ov.dimT=0;
  GROUND=770; pl.gy=undefined; pl.air=pl.airT=0; cam.x=cam.fx=VW/2; cam.y=cam.fy=CY; cam.z=cam.fz=1; cam.ft=0; }
G.survEnd=end;
function finish(win){ if(V.over) return; V.over=true; joyHide(); G.keys={};
  if(V.acc>0){ A.gainExp(V.acc); V.run+=V.acc; V.acc=0; }
  const t=Math.min(DUR,V.t), sv=SV(), prev=sv.survBest||0; sv.survBest=Math.max(prev,Math.round(t));
  if(win){ sv.survClear=(sv.survClear||0)+1; A.gainExp(150); V.run+=150; stamp('CLEAR',{x:.5,y:.4,size:.14,life:1.6,c:'#ffcf4a'}); }
  else { slow(.25,.8); stamp('다운',{x:.5,y:.4,size:.14,life:1.4,c:'#ff4a5a'}); pl.target='charge'; }
  A.save();
  resEl.innerHTML=`<div class="box"><h2 class="${win?'w':'l'}">${win?'생존 성공':'쓰러짐'}</h2><p>서바이벌 · ${mmss(t)} 버팀${!win&&Math.round(t)>prev?' · 최고 기록!':''}</p>
    <div class="st"><span>처치 <b>${V.kills}</b></span><span>피해 <b>${Math.round(G.stats.dmg).toLocaleString()}</b></span><span>경험치 <b>+${V.run}</b></span><span>최고 <b>${mmss(sv.survBest)}</b></span></div>
    <div class="lv">Lv ${sv.lv} · 스킬 포인트 ${sv.sp}</div><div class="row"><button data-r="again">다시 하기</button><button data-r="menu">메뉴로</button></div></div>`;
  setTimeout(()=>{ if(G.mode==='surv') resEl.classList.add('on'); },win?1400:900);
  resEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{ if(b.dataset.r==='again'){ end(); start(); } else A.toMenu(); }); }
// the menu's stage tab gets a survival entry
G.survMenu=(el,tab)=>{ if(tab!=='stage') return; const st=el.querySelector('.stages'); if(!st) return; const best=SV().survBest||0;
  st.insertAdjacentHTML('beforebegin',`<button class="survbt">서바이벌 · 5분 버티기<small>사방에서 몰려오는 적 · 스킬 자동 발동 · 이동만 조작${best?' · 최고 '+mmss(best):''}</small></button>`);
  el.querySelector('.survbt').onclick=()=>{ if(A.isTouch()){ const d=document.documentElement; if(!document.fullscreenElement&&d.requestFullscreen) d.requestFullscreen().catch(()=>{}); } start(); }; };
if(G.mode==='menu') A.menuRender();
G.survStart=start;
})();
