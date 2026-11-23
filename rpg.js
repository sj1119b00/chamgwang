// 참광 RPG layer: loaded by index.html?rpg. It reuses the showcase engine (rendering, VFX, frame sequences, ultimates)
// and adds a controllable character, enemy waves, a skill table, levels and saves on top of it.
// The engine was built around one target E; here E becomes an aim point (or the boss), and hit() is redirected onto the enemy list.
'use strict';
(()=>{
const hit0=hit, kill0=kill, respawn0=respawn, update0=update, drawEnemy0=drawEnemy, drawHUD0=drawHUD, dashTo0=dashTo, enemyPt0=enemyPt;
const G={mode:'menu',keys:{},en:[],proj:[],mk:[],ftx:[],cd:{},wave:-1,waveT:0,spawnQ:[],si:0,ug:0,hp:100,inv:0,jz:0,jv:0,
  dodgeCd:0,allowDash:false,pose:null,landT:0,runT:0,counter:0,boss:false,mul:1,hurtF:0,lastX:0,paused:false,stats:null};
window.RPG=G;

// ============================================================ save
const SAVE_KEY='chamgwang_rpg_v1';
function freshSave(){ return {v:1,cls:'sword',lv:1,exp:0,sp:0,sl:{},slots:['sw_dash','sw_rise',null,null],ult:null,clear:0}; }
let SV=(()=>{ try{ const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s&&s.v===1) return s; }catch(e){} return freshSave(); })();
function save(){ try{ localStorage.setItem(SAVE_KEY,JSON.stringify(SV)); }catch(e){} }
G.save=()=>SV;
G.reset=()=>{ SV=freshSave(); save(); menuRender(); };

// ============================================================ skill table (one row per skill; 200 skills later = more rows, not more engine code)
// type: basic (J) · skill (K L U I slots, cooldown) · ult (O, one equipped, needs the full gauge). tmp: painted frames are stand-ins until its own GIF arrives.
const SK={
  sw_basic:{cls:'sword',type:'basic',name:'베기',lv:1,desc:'칼집에서 뽑아 베는 3연타. 누르고 있으면 계속 이어진다.',fn:()=>moveSlash()},
  sw_dash:{cls:'sword',type:'skill',name:'섬보',lv:1,cd:4,dmg:2200,desc:'앞으로 순간 돌진해 지나간 자리의 적을 모두 벤다. 멸천일섬의 첫걸음.',fn:skDash},
  sw_rise:{cls:'sword',type:'skill',name:'올려베기',lv:1,cd:5,dmg:1800,desc:'앞의 적을 베어 공중으로 띄운다. 띄운 적은 잠시 반격하지 못한다.',fn:skRise},
  sw_wave:{cls:'sword',type:'skill',name:'검기',lv:2,cd:6,dmg:2000,desc:'초승달 검기를 날려 일직선 위의 적을 모두 관통한다.',fn:skWave},
  sw_spin:{cls:'sword',type:'skill',name:'회전베기',lv:3,cd:8,dmg:2600,desc:'허리를 틀어 크게 휘둘러 주변의 적을 모두 밀어낸다.',fn:skSpin},
  sw_fly:{cls:'sword',type:'skill',name:'비검',lv:5,cd:7,dmg:3400,desc:'빛의 검 한 자루를 띄워 가장 가까운 적에게 꽂는다. 천검난무의 바탕.',fn:skFly},
  sw_plunge:{cls:'sword',type:'skill',name:'낙검',lv:6,cd:9,dmg:3600,desc:'뛰어올라 땅을 내려찍어 주변에 충격파를 일으킨다.',fn:skPlunge},
  sw_thrust:{cls:'sword',type:'skill',name:'연속 찌르기',lv:8,cd:7,dmg:750,desc:'앞을 빠르게 여섯 번 찌른다. 맞은 적은 계속 움찔한다.',fn:skThrust},
  sw_counter:{cls:'sword',type:'skill',name:'반격 자세',lv:10,cd:10,dmg:5200,desc:'0.8초 동안 자세를 잡는다. 그 사이 공격받으면 막아 내고 큰 반격을 넣는다.',fn:skCounter},
  sw_ult1:{cls:'sword',type:'ult',name:'멸천일섬',lv:3,desc:'궁극기. 하늘을 가르는 일섬.',fn:()=>ultMetten()},
  sw_ult2:{cls:'sword',type:'ult',name:'천검난무',lv:12,desc:'궁극기. 천 자루의 검을 부채꼴로 쏟아붓는다.',fn:()=>ultSwords()},
};
const ORDER={sword:['sw_basic','sw_dash','sw_rise','sw_wave','sw_spin','sw_fly','sw_plunge','sw_thrust','sw_counter','sw_ult1','sw_ult2']};
const SLOT_KEYS=['K','L','U','I'];
const MAXSL=5;
const unlocked=id=>SV.lv>=SK[id].lv;
const sLv=id=>SV.sl[id]||1;
function mul(id){ return (1+.06*(SV.lv-1))*(1+.15*(sLv(id)-1)); }
function cdOf(id){ return SK[id].cd*(1-.05*(sLv(id)-1)); }
const maxHp=()=>100+12*(SV.lv-1);
const needExp=lv=>30+lv*25;

// ============================================================ enemies & stages
const ET={
  shard:{name:'수정 파편병',hp:3200,spd:125,range:150,wind:.55,dmg:9,exp:10,h:300,w:110},
  archer:{name:'수정 사수',hp:2400,spd:110,range:640,wind:.8,dmg:10,exp:14,h:290,w:100,ranged:true},
  brute:{name:'거대 파편',hp:12000,spd:62,range:230,wind:1.05,dmg:22,exp:40,h:440,w:230,heavy:true},
};
// enemy animation frames: [game w, game h, anchor x fraction] per frame; this line is rewritten by _gen/enemy_export.py
const EFR={"archer":{"attack":[[205.3,292.4,0.46],[183.7,291.6,0.492],[189.3,292.4,0.494],[194.1,291.6,0.499],[223.7,291.6,0.483],[254.8,294.0,0.49],[262.0,293.2,0.494],[213.3,293.2,0.488],[192.5,293.2,0.499],[204.5,293.2,0.458]],"hurt":[[210.2,291.8,0.442],[224.2,282.1,0.512],[244.3,296.1,0.52],[236.4,286.3,0.489],[217.5,284.5,0.517],[209.6,291.8,0.443]],"walk":[[214.3,291.5,0.449],[213.6,290.0,0.45],[229.3,287.0,0.462],[239.8,284.8,0.464],[249.5,283.3,0.455],[257.8,283.3,0.42],[252.5,284.0,0.431],[237.5,289.3,0.443],[219.6,290.7,0.448]]},"brute":{"attack":[[432.7,443.7,0.464],[432.7,436.3,0.489],[421.7,436.3,0.534],[381.5,460.7,0.533],[351.0,460.7,0.607],[401.0,449.8,0.422],[374.2,425.4,0.409],[387.6,421.7,0.436],[410.7,440.0,0.471],[433.9,446.1,0.474]],"hurt":[[430.0,441.8,0.453],[419.1,437.3,0.456],[430.0,430.9,0.463],[420.9,431.8,0.452],[415.5,440.9,0.458],[418.2,440.9,0.461]],"walk":[[446.2,442.5,0.48],[445.0,440.0,0.478],[500.0,440.0,0.473],[507.5,447.5,0.486],[473.8,447.5,0.52],[490.0,443.8,0.518],[487.5,443.8,0.5],[481.2,437.5,0.504],[451.2,445.0,0.471]]},"shard":{"attack":[[186.5,301.4,0.505],[193.0,335.4,0.465],[193.0,347.0,0.473],[177.1,326.7,0.466],[196.6,308.0,0.483],[212.5,266.0,0.47],[208.9,246.5,0.475],[200.2,276.9,0.467],[187.2,296.4,0.503],[186.5,300.7,0.505]],"hurt":[[197.0,301.3,0.529],[247.2,294.1,0.541],[271.3,286.3,0.524],[269.3,296.7,0.528],[236.1,303.9,0.519],[195.0,302.0,0.525]],"walk":[[179.2,302.0,0.519],[180.5,301.3,0.53],[195.0,294.1,0.514],[198.2,296.1,0.506],[201.5,291.5,0.501],[198.2,289.5,0.463],[196.9,299.3,0.443],[191.0,301.3,0.463],[183.8,302.0,0.478]]}};
for(const [t,A] of Object.entries(EFR)) for(const [a,L] of Object.entries(A)) L.forEach((_,i)=>loadSpr(`enemy_${t}_${a}${String(i+1).padStart(2,'0')}`));
const STAGES=[
  {name:'1-1 수정 들판',waves:[[['shard',3]],[['shard',5]],[['shard',4],['archer',1]]]},
  {name:'1-2 갈라진 언덕',waves:[[['shard',4],['archer',2]],[['brute',1],['shard',3]],[['shard',6],['archer',2]]]},
  {name:'1-3 공허의 문턱',waves:[[['shard',6],['archer',2]],[['brute',2],['archer',2]],[['shard',8],['brute',1],['archer',2]]]},
  {name:'1-4 공허 거신',boss:{hp:320000,name:'공허 거신'},waves:[[['shard',4]]]},
  {name:'2-1 붉은 달 아래',waves:[[['shard',8],['archer',3]],[['brute',3]],[['shard',8],['brute',2],['archer',3]]]},
  {name:'2-2 부서진 성채',waves:[[['archer',6]],[['brute',3],['shard',6]],[['shard',10],['brute',2],['archer',4]]]},
  {name:'2-3 별이 지는 곳',waves:[[['shard',10],['archer',4]],[['brute',4],['archer',3]],[['shard',12],['brute',3],['archer',4]]]},
  {name:'2-4 거신 재림',boss:{hp:900000,name:'공허 거신 · 재림'},waves:[[['shard',6],['archer',2]]]},
];
const AL=()=>80, AR=()=>VW-80;
const alive=()=>G.en.filter(e=>!e.dead);
function ecy(e){ return e.boss?E.y+E.ky:GROUND-e.h*.5-e.z; }
function ex_(e){ return e.boss?E.x+E.kx:e.x; }
function spawnEnemy(type,side){
  const d=ET[type], sc=1+.4*G.si, x=side<0?-70:VW+70;
  G.en.push({type,def:d,x,z:0,vz:0,kvx:0,hp:d.hp*sc,max:d.hp*sc,dmg:Math.round(d.dmg*(1+.25*G.si)),h:d.h,w:d.w,heavy:!!d.heavy,
    st:'walk',t:0,stun:0,flash:0,f:side<0?1:-1,ph:rand(0,TAU),atkCd:rand(.4,1.4),dead:false,lean:0});
}

// ============================================================ combat core
function dmgEnemy(e,d,o={}){
  if(e.dead) return;
  if(!lock) G.ug=Math.min(100,G.ug+1.3);
  if(e.boss){ hit0(d,o.x??ex_(e),o.y??ecy(e),{kb:(o.kb??1)*.4,kby:0,crack:o.crack}); e.hp=E.hp; if(E.hp<=0) bossDown(e); return; }
  const crit=o.crit||Math.random()<.14; if(crit&&!o.crit) d*=1.9; d=Math.round(d*rand(.92,1.08));
  e.hp-=d; e.flash=1; e.hurtT=.42; combo++; comboT=2.4; comboPop=1; totalDmg+=d; G.stats.dmg+=d;
  dmgText(e.x,ecy(e)-30,d,crit);
  const s=Math.sign(e.x-pl.x)||pl.f;
  e.kvx+=s*(o.kb??1)*(e.heavy?80:320);
  if(!e.heavy){ if(o.launch) e.vz=Math.max(e.vz,o.launch); else if(e.z>0) e.vz=Math.max(e.vz,260); }
  if(!e.heavy||o.big){ e.stun=Math.max(e.stun,o.stun??.32); if(e.st==='wind') e.st='walk'; }
  if(e.hp<=0) enemyDie(e);
}
function enemyDie(e){
  e.dead=true; e.hp=0; const y=ecy(e);
  for(let i=0;i<(e.heavy?30:14);i++){ const a=rand(0,TAU); debris(e.x+Math.cos(a)*20,y+Math.sin(a)*30,{crystal:true,vx:Math.cos(a)*rand(200,900),vy:Math.sin(a)*rand(200,900)-400,s:rand(6,e.heavy?24:15),life:rand(1.4,2.4)}); }
  gl0(e.x,y,e.h*.9,'#d08cff',.35,{grow:300,a:gl?.4:.8}); ring(e.x,y,700,'#c06bff',.35,{w:5});
  if(!lock) SFX.shatter(e.heavy?.9:.5);
  gainExp(e.def.exp*(1+.3*G.si)|0,e.x,y);
  G.stats.kills++;
}
// the engine's hit(): in the RPG it lands on whatever enemies are around the hit point (everything on screen during an ultimate)
hit=function(d,x,y,o={}){
  if(G.mode!=='play') return hit0(d,x,y,o);
  const R=o.r||190; let any=false;
  for(const e of G.en){ if(e.dead) continue;
    const ok=lock||(Math.abs(ex_(e)-x)<R+e.w*.5&&Math.abs(ecy(e)-y)<e.h*.5+220);
    if(ok){ dmgEnemy(e,d*G.mul,{...o,x,y}); any=true; } }
  return any;
};
// the showcase dashes the hero to the target before a basic attack; under player control only skills and ultimates may move him
dashTo=function(x,c){ if(G.mode==='play'&&!lock&&!G.allowDash) return; return dashTo0(x,c); };
kill=function(fromUlt){ if(G.mode==='play'&&!G.boss){ if(!E.dead) kill0(fromUlt); return; } return kill0(fromUlt); };
respawn=function(){ if(G.mode==='play'||G.mode==='menu') return; return respawn0(); };
// basic attacks aim at the engine's target; under control they cut the air in front of the hero instead (ultimates keep the real target)
enemyPt=function(rx=0,ry=0){ if(G.mode!=='play'||lock) return enemyPt0(rx,ry); return [pl.x+230*pl.f+rx,GROUND-200+ry]; };

function hurtPlayer(d,src){
  if(G.mode!=='play'||G.inv>0||lock) return;
  if(G.counter>0){ counterHit(src); return; }
  G.hp=Math.max(0,G.hp-d); G.inv=.7; G.hurtF=1; trauma=Math.min(1.2,trauma+.4); ov.red=.5; post.ca=Math.min(.05,post.ca+.02);
  floatTxt(pl.x,GROUND-330-pl.air,'-'+d,'#ff4a5a',40);
  if(src) pl.x=clamp(pl.x+(Math.sign(pl.x-src.x)||-pl.f)*50,AL(),AR());
  if(G.jz<=0) hurtAnim();
  SFX.boom(.5,.55); buzz(60);
  if(G.hp<=0) after(.4,()=>finish(false));
}
function floatTxt(x,y,txt,c,size=30){ G.ftx.push({x,y,txt,c,size,t:0,life:1.2}); }

function gainExp(n,x,y){
  SV.exp+=n; G.stats.exp+=n; if(x!=null) floatTxt(x,y-60,'+'+n+' EXP','#bfe6ff',22);
  while(SV.exp>=needExp(SV.lv)){ SV.exp-=needExp(SV.lv); SV.lv++; SV.sp++; G.hp=Math.min(maxHp(),G.hp+maxHp()*.3);
    const J=pl.j||joints(pl); add({k:'pillar',x:pl.x,w:120,life:.9,c:'#ffcf4a'}); ring(pl.x,GROUND,1200,'#ffcf4a',.6,{w:6,sy:.16});
    stamp('LEVEL UP',{x:.5,y:.3,size:.1,life:1.3,c:'#ffcf4a'}); SFX.rise(.5,.4);
    floatTxt(pl.x,J.hd[1]-80,'Lv '+SV.lv,'#ffcf4a',44);
    for(const id of ORDER[SV.cls]) if(SK[id].lv===SV.lv){ toast('새 스킬 해금 · '+SK[id].name); autoEquip(id); } }
  save();
}
function autoEquip(id){ const s=SK[id]; if(s.type==='skill'){ const i=SV.slots.indexOf(null); if(i>=0&&!SV.slots.includes(id)) SV.slots[i]=id; }
  else if(s.type==='ult'&&!SV.ult) SV.ult=id; save(); }

// ============================================================ skills
const done=()=>{ pl.target=IDLE(); pl.ps=12; };
function D(id){ return SK[id].dmg*mul(id); }
function fxHit(e,c,pw=1){ const x=ex_(e), y=ecy(e)+rand(-20,20); impact(x,y,pw,c,{dir:pl.f>0?0:Math.PI,vol:.5}); vfx('impact',x,y,{sc:.45*pw,rot:rand(0,TAU)}); }
function inBox(cx,r){ return alive().filter(e=>Math.abs(ex_(e)-cx)<r+e.w*.5); }
function nearest(dirOnly){ let b=null,bd=1e9; for(const e of alive()){ const dx=(ex_(e)-pl.x)*pl.f; if(dirOnly&&dx<-40) continue; const d=Math.abs(dx); if(d<bd){bd=d;b=e;} } return b; }
function startSeq(steps){ pl.ps=42; pl.target='slash1'; plSeq(steps); }

function skDash(){ const d=D('sw_dash');
  startSeq([['gs04',.05,{kick:[-1,.8]}],['gs05',.05],['gs06',.06],
    ['gs07',.05,{tr:1,kick:[2.4,-2],on:()=>{ const x0=pl.x, x1=clamp(pl.x+pl.f*480,AL(),AR()), y=GROUND-160;
      G.allowDash=true; dashTo(x1,'#ff6a85'); G.allowDash=false;
      add({k:'line',x1:x0,y1:y,x2:x1,y2:y,life:.4,c:'#ff3355',w:26,grow:true}); add({k:'line',x1:x0,y1:y,x2:x1,y2:y,life:.3,c:'#ffffff',w:6,grow:true});
      SFX.slash(1.15,1);
      const lo=Math.min(x0,x1)-70, hi=Math.max(x0,x1)+70;
      after(.07,()=>{ for(const e of alive()){ const x=ex_(e); if(x>lo&&x<hi){ dmgEnemy(e,d,{kb:.7}); fxHit(e,'#ff6a85',1.1); } } }); }}],
    ['gs08',.10,{tr:1}],['gs09',.14],['gs11',.10],['gs12',.08,{on:done}]]); }

function skRise(){ const d=D('sw_rise');
  startSeq([['gt02',.04],['gt03',.05,{kick:[-.8,.6]}],['gt04',.06],['gt05',.04,{tr:1,kick:[2,-1.8]}],
    ['gt06',.04,{tr:1,on:()=>{ SFX.whoosh(1.2,.7); swingArcs(['gt04','gt05','gt06'],'#ff9aa8',{dir:-1,ext:.1}); SFX.slash(1.1,.9);
      after(.025,()=>{ for(const e of inBox(pl.x+pl.f*210,170)){ dmgEnemy(e,d,{kb:.3,launch:1300,stun:.9}); fxHit(e,'#ff9aa8',1.1); } }); }}],
    ['gt07',.06,{tr:1}],['gt08',.14],['gt09',.10],['gt10',.09],['gt11',.08],['gt12',.06,{on:done}]]); }

function skWave(){ const d=D('sw_wave');
  startSeq([['gs04',.05],['gs05',.05],['gs06',.08],
    ['gs07',.04,{tr:1,kick:[2.2,-2],on:()=>{ SFX.whoosh(1.3,.8); swingArcs(['gs06','gs07'],'#ff6a85',{dir:1}); SFX.slash(.9,1.1);
      const p={k:'wave',x:pl.x+pl.f*110,y:GROUND-175,vx:pl.f*1500,life:.8,d,hits:new Set()}; G.proj.push(p);
      vfx('slash',p.x,p.y,{follow:p,loop:true,life:.8,sc:.75,sx:pl.f,rot:pl.f>0?.6:-.6,a:.9}); }}],
    ['gs08',.10,{tr:1}],['gs09',.14],['gs11',.10],['gs12',.08,{on:done}]]); }

function skSpin(){ const d=D('sw_spin');
  startSeq([['gu03',.04],['gu04',.05],['gu05',.10,{kick:[-1,.8]}],
    ['gu06',.04,{tr:1,kick:[2.6,-2.4],on:()=>{ const B=bladeW('gu07'), f=pl.f;
      if(B){ const [gx,gy]=B.b, r=Math.hypot(B.t[0]-gx,B.t[1]-gy)*1.2; vfxSwing({x:gx+r*.25*f,y:gy-r*.2,r,a0:f>0?Math.PI+.35:-.35,a1:f>0?-.2:Math.PI+.2},{k:1.25,wy:.4,hue:45}); }
      ring(pl.x,GROUND-130,1500,'#ffd36a',.4,{w:9,sy:.32}); SFX.whoosh(1.3,.9); SFX.slash(1.2,1.1);
      after(.03,()=>{ for(const e of inBox(pl.x,340)){ dmgEnemy(e,d,{kb:1.8,big:true}); fxHit(e,'#ffd36a',1.3); } }); }}],
    ['gu07',.06,{tr:1}],['gu08',.18],['gu10',.09],['gu11',.09],['gu12',.06],['gu14',.05,{on:done}]]); }

function skFly(){ const d=D('sw_fly');
  startSeq([['gw01',.04],['gw02',.05],['gw03',.06],
    ['gw04',.22,{on:()=>{ const J=pl.j, hx=(J.rh||J.hip)[0], s=swordAt(hx,GROUND-430,{c:'#ffcf4a',len:150,tx:pl.x+pl.f*700,ty:GROUND-60,
        onHit:p=>{ for(const e of alive()) if(Math.abs(ex_(e)-p.x)<130+e.w*.5){ dmgEnemy(e,d,{kb:1.2,big:true}); }
          impact(p.x,p.y,1.5,'#ffcf4a'); vfx('impact',p.x,p.y,{sc:.8,rot:rand(0,TAU)}); ring(p.x,GROUND,900,'#ffcf4a',.4,{w:5,sy:.18}); }});
      SFX.rise(.4,.3); gl0(hx,GROUND-430,120,'#ffcf4a',.5,{a:.6});
      after(.28,()=>{ const t=nearest(true)||nearest(false); if(t){ s.tx=ex_(t); s.ty=ecy(t); } s.mode='fly'; s.v=2400; s.acc=9000; SFX.whoosh(.6,1); }); }}],
    ['gw05',.08],['gw06',.10],['gw11',.08],['gw12',.06,{on:done}]]); }

function skPlunge(){ const d=D('sw_plunge'), up=k=>1-(1-k)*(1-k), dn=k=>k*k;
  const land=()=>{ const cx=pl.x+pl.f*90; pl.air=pl.airT=0;
    shock(cx,GROUND-20,.9); fissure(cx,700,'#ff6a85'); ring(cx,GROUND,1600,'#ff6a85',.5,{w:8,sy:.18}); impact(cx,GROUND-40,1.8,'#ff6a85',{dir:-Math.PI/2});
    for(let i=0;i<14;i++) debris(cx+rand(-120,120),GROUND-5,{vx:rand(-600,600),vy:rand(-1200,-400),s:rand(5,14)});
    for(const e of inBox(cx,300)){ dmgEnemy(e,d,{kb:1,launch:800,stun:.7,big:true}); } SFX.boom(1.3,1); };
  if(spr('sword_gp08')) return startSeq([['gp02',.06,{kick:[-1,1]}],['gp03',.08,{air:[0,150],ease:up,dx:40}],['gp04',.08,{air:[150,270],ease:up,dx:40}],
    ['gp05',.08,{air:[270,310],dx:40}],['gp06',.06,{air:[310,320]}],['gp07',.06,{air:[320,250],ease:dn}],['gp08',.07,{tr:1,air:[250,0],ease:dn}],
    ['gp09',.06,{kick:[2.6,-2.6],on:land}],['gp10',.14],['gp11',.12],['gp12',.08],['gp13',.08],['gp14',.07,{on:done}]]);
  startSeq([['gt03',.06,{kick:[-1,1]}],['gt08',.24,{air:[0,300],ease:up,dx:120}],['gs06',.08,{air:[300,320]}],
    ['gs07',.10,{tr:1,air:[320,0],ease:dn}],
    ['gs08',.06,{tr:1,kick:[2.6,-2.6],on:()=>{ const cx=pl.x+pl.f*90;
      shock(cx,GROUND-20,.9); fissure(cx,700,'#ff6a85'); ring(cx,GROUND,1600,'#ff6a85',.5,{w:8,sy:.18}); impact(cx,GROUND-40,1.8,'#ff6a85',{dir:-Math.PI/2});
      for(let i=0;i<14;i++) debris(cx+rand(-120,120),GROUND-5,{vx:rand(-600,600),vy:rand(-1200,-400),s:rand(5,14)});
      for(const e of inBox(cx,300)){ dmgEnemy(e,d,{kb:1,launch:800,stun:.7,big:true}); } SFX.boom(1.3,1); }}],
    ['gs09',.16],['gs11',.10],['gs12',.08,{on:done}]]); }

function skThrust(){ const d=D('sw_thrust'), steps=[['gu04',.08,{kick:[-1,.8]}]];
  const stab=()=>{ const T_=pl.j&&pl.j.st, y=T_?T_[1]:GROUND-170+rand(-45,45), x0=T_?T_[0]-pl.f*40:pl.x+pl.f*60, x1=(T_?T_[0]:pl.x+pl.f*300)+pl.f*rand(60,110);
    add({k:'line',x1:x0,y1:y,x2:x1,y2:y+rand(-8,8),life:.16,c:'#ff3355',w:14}); add({k:'line',x1:x0,y1:y,x2:x1,y2:y,life:.12,c:'#ffffff',w:3});
    SFX.slash(1.5,.45); for(const e of inBox(pl.x+pl.f*230,150)){ dmgEnemy(e,d,{kb:.2,stun:.3}); spark(ex_(e),y,pl.f>0?Math.PI:0,rand(500,1200),{c:'#ffffff',w:2,life:.2}); } };
  const stabL=()=>after(.001,stab);
  if(spr('sword_gk09')) return startSeq([['gk02',.06],['gk03',.08,{kick:[-1,.8]}],['gk04',.06,{on:stabL,kick:[1,-.8]}],['gk05',.05],['gk06',.06,{on:stabL,kick:[1,-.8]}],['gk07',.05],
    ['gk08',.06,{on:stabL,kick:[1,-.8]}],['gk05',.05],['gk04',.06,{on:stabL,kick:[1,-.8]}],['gk07',.05],['gk06',.06,{on:stabL,kick:[1,-.8]}],['gk03',.06],
    ['gk09',.2,{on:()=>{ stabL(); for(const e of inBox(pl.x+pl.f*260,170)) fxHit(e,'#ff6a85',1.2); },kick:[2,-1.6]}],['gk10',.08],['gk11',.08],['gk12',.06,{on:done}]]);
  for(let i=0;i<6;i++) steps.push(['gu08',.05,{tr:1,on:stab,kick:[1,-.8]}],['gu07',.05]);
  steps.push(['gu10',.10],['gu11',.08],['gu14',.06,{on:done}]); startSeq(steps); }

function skCounter(){
  const arm=()=>{ G.counter=.8; const J=pl.j; ring(pl.x,J.nk[1],600,'#9ff7ff',.5,{w:4}); light(pl.x,J.nk[1],500,'#9ff7ff',.8,.4); SFX.click(); };
  if(spr('sword_gc04')) return startSeq([['gc02',.06,{on:arm}],['gc03',.06],['gc04',.68],['gc03',.08],['gc01',.06,{on:done}]]);
  startSeq([['gu05',.8,{on:()=>{ G.counter=.8; const J=pl.j; ring(pl.x,J.nk[1],600,'#9ff7ff',.5,{w:4}); light(pl.x,J.nk[1],500,'#9ff7ff',.8,.4); SFX.click(); }}],
    ['gu10',.10],['gu14',.06,{on:done}]]); }
function counterHit(src){ const d=D('sw_counter'); G.counter=0; G.inv=1.1; slow(.25,.35); setInv(.06,'inv'); stamp('반격',{x:.5,y:.36,size:.16,life:.9,c:'#9ff7ff'}); SFX.boom(1,.8);
  if(src&&src.x!=null) pl.f=Math.sign(src.x-pl.x)||pl.f;
  const cut=()=>{ const f=pl.f, cx=pl.x+f*130, cy=GROUND-210; if(!swingArcs(['gc05','gc06','gc07'],'#9ff7ff',{dir:-1,ext:.15})) vfxSwing({x:cx,y:cy,r:230,a0:f>0?-2.2:-Math.PI+2.2,a1:f>0?.5:-Math.PI-.5},{k:1.4,hue:-160});
      for(const e of inBox(pl.x+pl.f*120,380)){ dmgEnemy(e,d,{kb:2,big:true,crit:true}); fxHit(e,'#9ff7ff',1.6); } SFX.slash(1.3,1.2); };
  anim.seq=null;
  if(spr('sword_gc05')) return startSeq([['gc05',.05,{tr:1,kick:[2.8,-2.6],on:cut}],['gc06',.08,{tr:1}],['gc07',.18],['gc08',.08],['gc09',.08],['gc10',.08],['gc11',.08],['gc12',.06,{on:done}]]);
  startSeq([['gu06',.04,{tr:1,kick:[2.8,-2.6],on:()=>{ const B=bladeW('gu07'), f=pl.f;
      if(B){ const [gx,gy]=B.b, r=Math.hypot(B.t[0]-gx,B.t[1]-gy)*1.4; vfxSwing({x:gx+r*.25*f,y:gy-r*.2,r,a0:f>0?Math.PI+.35:-.35,a1:f>0?-.2:Math.PI+.2},{k:1.4,wy:.45,hue:-160}); }
      for(const e of inBox(pl.x+pl.f*120,380)){ dmgEnemy(e,d,{kb:2,big:true,crit:true}); fxHit(e,'#9ff7ff',1.6); } SFX.slash(1.3,1.2); }}],
    ['gu07',.06,{tr:1}],['gu08',.2],['gu10',.09],['gu14',.06,{on:done}]]); }

// ============================================================ locomotion frames (ChatGPT GIF sets; any set not loaded falls back to the idle loop)
// run sword_gr02-11 loop · jump sword_gj03 rise, 04-08 airborne loop, 09-10 fall, 11 landing · hurt sword_gh02-08
const fr2=n=>String(n).padStart(2,'0');
const plFrame0=plFrame;
plFrame=function(){ if(G.mode==='play'&&!anim.seq&&G.pose){ const s=spr(pl.cls+'_'+G.pose); if(s) return s; } return plFrame0(); };
function locoPose(rdt,moving){
  if(G.landT>0){ G.landT-=rdt; return 'gj11'; }
  if(G.jz>0){ if(G.jv>350) return 'gj03'; if(G.jv>-350) return 'gj'+fr2(4+Math.floor(RT/.08)%5); return G.jv>-900?'gj09':'gj10'; }
  if(moving){ G.runT+=rdt; return 'gr'+fr2(2+Math.floor(G.runT/.08)%10); }
  G.runT=0; return null;
}
function hurtAnim(){ if(anim.seq||!spr('sword_gh02')) return;
  plSeq([['gh02',.05],['gh03',.08],['gh04',.06],['gh05',.06],['gh06',.05],['gh07',.05],['gh08',.04,{on:done}]]); }

// ============================================================ actions
const inputDir=()=>(G.keys.r?1:0)-(G.keys.l?1:0);
function useBasic(){ if(lock||G.mode!=='play') return; const q=anim.seq;
  if(G.jz>0){ if(!q&&!G.airAtk) airSlash(); return; }
  if(q&&!q.slash) return;
  if(!q||q.i>=(q.commit??8)){ const mv=inputDir(); if(mv) pl.f=mv; }   // a new cut (not one still committed) faces the held direction
  G.mul=mul('sw_basic'); SK.sw_basic.fn(); }
// jump attack: one diagonal cut per jump, landing on whoever is in front below; a short hang so it reads in the air
function airSlash(){ G.airAtk=true; const mv=inputDir(); if(mv) pl.f=mv; G.mul=mul('sw_basic'); const d=1500*G.mul; G.jv=Math.max(G.jv,200);
  startSeq([['gs05',.04],['gs06',.05],['gs07',.04,{tr:1,on:()=>{ SFX.whoosh(1.2,.7); swingArcs(['gs06','gs07'],'#ff6a85',{dir:1}); SFX.slash(1,.9);
      after(.025,()=>{ for(const e of inBox(pl.x+pl.f*170,190)){ dmgEnemy(e,d,{kb:.8}); fxHit(e,'#ff6a85',1); } }); }}],
    ['gs08',.08,{tr:1}],['gs09',.06,{on:done}]]); }
function useSlot(i){ const id=SV.slots[i]; if(!id||lock||G.mode!=='play'||!unlocked(id)) return; if((G.cd[id]||0)>0) return; if(G.jz>0) return;
  const mv=inputDir(); if(mv) pl.f=mv; anim.seq=null; G.cd[id]=cdOf(id); G.mul=mul(id); SK[id].fn(); }
function useUlt(){ const id=SV.ult; if(!id||lock||G.mode!=='play'||!unlocked(id)||G.ug<100) return;
  anim.seq=null; G.jz=G.jv=0; pl.air=pl.airT=0; G.ug=0; G.mul=mul(id);
  pl.f=1; if(!G.boss){ const t=alive(); const cx=t.length?t.reduce((a,e)=>a+e.x,0)/t.length:pl.x+520; E.x=clamp(Math.max(cx,pl.x+420),VW*.55,VW-170); E.by=GROUND-280; }
  pl.home=Math.max(AL(),Math.min(pl.x,E.x-520)); SK[id].fn(); }
function jump(){ if(lock||G.mode!=='play'||G.jz>0||anim.seq) return; G.jv=1400; SFX.whoosh(.8,.35); for(let i=0;i<6;i++) smoke(pl.x+rand(-30,30),GROUND-6,rand(10,20),{vy:rand(-60,-10),a:.35,life:.8}); }
function dodge(){ if(lock||G.mode!=='play'||G.dodgeCd>0) return; const mv=(G.keys.r?1:0)-(G.keys.l?1:0), dir=mv||pl.f;
  anim.seq=null; done(); G.inv=Math.max(G.inv,.4); G.dodgeCd=.7; pl.f=dir; G.allowDash=true; dashTo(clamp(pl.x+dir*300,AL(),AR()),'#ff6a85'); G.allowDash=false; }
act=function(a){ if(G.mode!=='play'||G.paused) return; if(a==='basic') useBasic(); };

// ============================================================ input
const KMAP={ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r',KeyJ:'basic'};
addEventListener('keydown',e=>{ e.stopImmediatePropagation();
  if(e.code==='Escape'){ if(G.mode==='play') setPause(!G.paused); return; }
  if(G.mode!=='play'||G.paused) return;
  const k=KMAP[e.code]; if(k){ G.keys[k]=true; e.preventDefault(); if(k==='basic'&&!e.repeat) useBasic(); return; }
  if(e.repeat) return;
  if(e.code==='Space'||e.code==='KeyW'||e.code==='ArrowUp'){ e.preventDefault(); jump(); }
  else if(e.code==='ShiftLeft'||e.code==='ShiftRight') dodge();
  else if(e.code==='KeyK') useSlot(0); else if(e.code==='KeyL') useSlot(1); else if(e.code==='KeyU') useSlot(2); else if(e.code==='KeyI') useSlot(3);
  else if(e.code==='KeyO') useUlt(); },true);
addEventListener('keyup',e=>{ const k=KMAP[e.code]; if(k) G.keys[k]=false; },true);
addEventListener('blur',()=>{ G.keys={}; });
addEventListener('resize',()=>{ touchCam(); if(G.mode!=='menu') pl.x=clamp(G.lastX,AL(),AR()); else pl.x=pl.home=VW*.62; });

// ============================================================ per-frame
function preStep(rdt){
  const dt=hitstop>0?0:rdt*timeScale;
  G.inv=Math.max(0,G.inv-rdt); G.dodgeCd-=rdt; G.counter=Math.max(0,G.counter-rdt); G.hurtF=Math.max(0,G.hurtF-rdt*3);
  for(const k in G.cd) G.cd[k]=Math.max(0,G.cd[k]-rdt);
  if(lock) G.pose=null;
  if(!lock){
    const seq=anim.seq, mv=(G.keys.r?1:0)-(G.keys.l?1:0);
    if(mv&&!seq){ pl.f=mv; pl.x+=mv*430*dt; }
    G.pose=locoPose(rdt,mv&&!seq);
    if(G.keys.basic) useBasic();
    if(G.jz>0||G.jv>0){ G.jv-=3600*dt; G.jz+=G.jv*dt; if(G.jz<=0){ G.jz=0; G.jv=0; G.landT=.1; G.airAtk=false; for(let i=0;i<5;i++) smoke(pl.x+rand(-30,30),GROUND-6,rand(10,20),{vy:rand(-50,-10),a:.3,life:.7}); } }
    const seqAir=seq&&seq.steps.some(s=>s[2]&&s[2].air);
    if(!seqAir) pl.air=pl.airT=G.jz;
    pl.x=clamp(pl.x,AL(),AR());
    if(G.boss&&!E.dead) pl.x=Math.min(pl.x,E.x-230);
    if(!G.boss){ E.x=pl.x+230*pl.f; E.by=GROUND-200; E.liftT=0; }
  }
  pl.home=pl.x; G.lastX=pl.x;
  if(!G.boss){ E.dead=false; E.respawn=1e9; E.hp=E.max; }
}
function postStep(rdt){
  const dt=hitstop>0?0:rdt*timeScale;
  for(let i=G.ftx.length-1;i>=0;i--){ const f=G.ftx[i]; f.t+=rdt; f.y-=60*rdt; if(f.t>f.life) G.ftx.splice(i,1); }
  if(!lock) stepEnemies(dt);
  for(const e of G.en) e.flash=Math.max(0,e.flash-rdt*6);
  G.en=G.en.filter(e=>!e.dead||e.boss);
  // waves
  if(G.mode==='play'){
    if(G.spawnQ.length){ G.spawnT-=rdt; if(G.spawnT<=0){ const [t,s]=G.spawnQ.shift(); spawnEnemy(t,s); G.spawnT=.45; } }
    else if(!alive().some(e=>!e.boss)&&!lock){ G.waveT-=rdt; if(G.waveT<=0) nextWave(); }
  }
  hudTick();
}
function stepEnemies(dt){
  if(dt<=0) return; const px=pl.x;
  for(const e of G.en){ if(e.dead) continue;
    if(e.boss){ bossAI(e,dt); continue; }
    e.hurtT=(e.hurtT||0)-dt;
    e.x+=e.kvx*dt; e.kvx*=Math.exp(-dt*7);
    if(e.z>0||e.vz>0){ e.vz-=3000*dt; e.z+=e.vz*dt; if(e.z<=0){ e.z=0; e.vz=0; } }
    if(e.stun>0){ e.stun-=dt; continue; }
    if(e.z>0) continue;
    const dx=px-e.x, dist=Math.abs(dx), D=e.def; e.f=Math.sign(dx)||e.f;
    if(e.st==='walk'){
      let go=0;
      if(D.ranged){ if(dist>D.range) go=1; else if(dist<D.range-220) go=-1; e.atkCd-=dt; if(e.atkCd<=0&&dist<D.range+80&&e.x>20&&e.x<VW-20){ e.st='wind'; e.t=D.wind; } }
      else if(dist>D.range) go=1; else { e.st='wind'; e.t=D.wind; }
      e.go=go; e.x+=go*e.f*D.spd*dt; e.walkT=(e.walkT||0)+go*dt; e.lean=lerp(e.lean,go*e.f*.12,1-Math.exp(-dt*6));
    } else if(e.st==='wind'){ e.t-=dt; e.lean=lerp(e.lean,-e.f*.2,1-Math.exp(-dt*8));
      if(e.t<=0){ e.st='rec'; e.t=e.recD=D.ranged?.6:.75;
        if(D.ranged){ G.proj.push({k:'orb',x:e.x+e.f*e.w*.9,y:GROUND-e.h*.72,vx:e.f*680,life:2.2,dmg:e.dmg,src:e}); SFX.whoosh(1.6,.25); }
        else { e.kvx+=e.f*260; ring(e.x+e.f*70,ecy(e),500,'#ff3355',.25,{w:4});
          if(Math.abs(px-e.x)<D.range+40&&G.jz<130) hurtPlayer(e.dmg,e); } } }
    else if(e.st==='rec'){ e.t-=dt; if(e.t<=0){ e.st='walk'; e.atkCd=rand(1.2,2.2); } }
  }
  // keep a crowd from stacking into one sprite
  const L=alive().filter(e=>!e.boss);
  for(let i=0;i<L.length;i++) for(let j=i+1;j<L.length;j++){ const a=L[i], b=L[j], dx=b.x-a.x, m=(a.w+b.w)*.32; if(Math.abs(dx)<m){ const p=(m-Math.abs(dx))*.5*(dx<0?-1:1)*Math.min(1,dt*8); a.x-=p; b.x+=p; } }
  // projectiles
  for(let i=G.proj.length-1;i>=0;i--){ const p=G.proj[i]; p.life-=dt; p.x+=p.vx*dt;
    if(p.k==='orb'){ const py=GROUND-150-pl.air; if(Math.abs(p.x-pl.x)<45&&Math.abs(p.y-py)<90&&G.inv<=0){ hurtPlayer(p.dmg,p); impact(p.x,p.y,.6,'#b06bff',{silent:true}); p.life=0; } }
    else if(p.k==='wave'){ for(const e of alive()) if(!p.hits.has(e)&&Math.abs(ex_(e)-p.x)<60+e.w*.5){ p.hits.add(e); dmgEnemy(e,p.d,{kb:.8}); fxHit(e,'#ff6a85',1); }
      if(Math.random()<.8) gl0(p.x,p.y+rand(-60,60),rand(8,16),'#ff6a85',.25,{a:.6}); }
    if(p.life<=0||p.x<-200||p.x>VW+200) G.proj.splice(i,1); }
  // boss ground markers
  for(let i=G.mk.length-1;i>=0;i--){ const m=G.mk[i]; m.t+=dt; if(m.t>=m.dur){ G.mk.splice(i,1); spike(m); } }
}
function bossAI(e,dt){ e.x=E.x; e.atkCd-=dt; if(e.atkCd>0) return; const hard=G.si>=4;
  if(Math.random()<.55){ const n=hard?5:3; for(let i=0;i<n;i++){ const x=clamp(pl.x+(i-(n-1)/2)*190+rand(-30,30),AL(),AR()); G.mk.push({x,t:-i*.12,dur:.95,r:95,dmg:Math.round(14*(1+.25*G.si))}); } SFX.click(); }
  else { const n=hard?7:5; for(let i=0;i<n;i++) after(i*.16,()=>{ if(G.mode!=='play'||e.dead) return; G.proj.push({k:'orb',x:E.x-160,y:E.y+rand(-120,120),vx:-rand(620,820),life:3,dmg:Math.round(10*(1+.25*G.si)),src:{x:E.x}}); SFX.whoosh(1.6,.25); }); }
  e.atkCd=hard?2.4:3.2; }
function spike(m){ for(let i=0;i<10;i++) debris(m.x+rand(-30,30),GROUND-5,{crystal:true,vx:rand(-200,200),vy:rand(-1400,-700),s:rand(8,18),life:1.4});
  ring(m.x,GROUND,700,'#c06bff',.35,{w:6,sy:.2}); gl0(m.x,GROUND-120,140,'#b06bff',.3,{a:.7}); SFX.shatter(.4);
  if(Math.abs(pl.x-m.x)<m.r+30&&G.jz<110) hurtPlayer(m.dmg,{x:m.x}); }

update=function(rdt){ if(G.paused) return; if(G.mode==='play') preStep(rdt); update0(rdt); if(G.mode==='play') postStep(rdt); };

// ============================================================ drawing (world space, called where the engine draws its enemy)
// which painted frame an enemy shows: hurt while stunned/airborne/flinching, attack across wind-up (1-4) and strike+recovery (5-10), walk cycle 2..n
function eFrame(e){ const A=EFR[e.type]; if(!A) return null; let a='walk', i=0;
  if(A.hurt&&(e.z>0||e.stun>0||(e.hurtT>0&&e.st==='walk'))){ a='hurt'; const n=A.hurt.length; i=e.z>0?2:Math.min(n-1,Math.floor((1-Math.max(0,e.hurtT)/.42)*n)); }
  else if(A.attack&&e.st==='wind') { a='attack'; i=clamp(Math.floor((1-e.t/e.def.wind)*4),0,3); }
  else if(A.attack&&e.st==='rec') { a='attack'; i=4+clamp(Math.floor((1-e.t/e.recD)*6),0,5); }
  else if(e.go){ const n=A.walk.length-1, k=Math.floor(Math.abs(e.walkT)/(e.heavy?.14:.1))%n; i=1+(e.walkT<0?n-1-k:k); }
  const L=A[a], s=L&&spr(`enemy_${e.type}_${a}${fr2(i+1)}`); return s?{s,d:L[i],a}:null; }
drawEnemy=function(){
  if(G.mode==='menu') return;
  if(G.boss&&!E.dead) drawEnemy0();
  const cs=spr('crystal');
  for(const e of G.en){ if(e.dead||e.boss) continue;
    const fr=eFrame(e), bob=fr?0:Math.sin(T*3+e.ph)*6, x=e.x, y=ecy(e)+bob, h=e.h, w=cs?h*cs.w/cs.h:h*.5;
    ctx.fillStyle='rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(x,GROUND+3,e.w*.55*(1-Math.min(.6,e.z/600)),12,0,0,TAU); ctx.fill();
    if(e.st==='wind') glow(fx,x,y,h*.95,'#ff2244',.25+.25*Math.sin(RT*30));
    glow(fx,x,GROUND-10,e.w*.9,'#7a2cff',.18);
    if(fr){ const [fw,fh,fa]=fr.d; ctx.save(); ctx.translate(x,GROUND-e.z+6); ctx.scale(e.f,1); if(fr.a==='hurt') ctx.rotate(e.z>0?-.3:-.12*Math.min(1,e.hurtT/.2)); ctx.drawImage(fr.s.im,-fa*fw,-fh,fw,fh); ctx.restore(); }
    else if(cs){ ctx.save(); ctx.translate(x,y); ctx.rotate(e.lean+(e.z>0?e.vz*.0004*e.f:0)); ctx.drawImage(cs.im,-w/2,-h/2,w,h); ctx.restore(); }
    else { shardPath(ctx,x,y,h*.5,e.lean); ctx.fillStyle='#3d1458'; ctx.fill(); }
    if(!fr&&e.def.ranged) for(let k=0;k<2;k++){ const a=T*2.2+e.ph+k*Math.PI, ox=Math.cos(a)*w*.75, oy=Math.sin(a)*h*.18-h*.1; glow(fx,x+ox,y+oy,14,'#d08cff',.9); }
    if(!fr&&e.heavy){ fx.strokeStyle=hexA('#b06bff',.35); fx.lineWidth=2; fx.beginPath(); fx.ellipse(x,y,w*.9,h*.18,0,0,TAU); fx.stroke(); }
    if(!fr) glow(fx,x+e.f*w*.12,y-h*.18,e.heavy?22:12,'#ff3355',.9);
    if(e.flash>0) glow(fx,x,y,h*.55,'#ffffff',e.flash*.7);
    if(e.hp<e.max){ const bw=Math.max(70,e.w*.9), by=y-h*.5-22; ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(x-bw/2-2,by-2,bw+4,9); ctx.fillStyle='#ff3d5a'; ctx.fillRect(x-bw/2,by,bw*e.hp/e.max,5); }
  }
  for(const p of G.proj) if(p.k==='orb'){ glow(fx,p.x,p.y,46,'#b06bff',.85); glow(fx,p.x,p.y,16,'#ffffff',1); ctx.fillStyle='#2a0a3a'; ctx.beginPath(); ctx.arc(p.x,p.y,9,0,TAU); ctx.fill(); }
  for(const m of G.mk){ if(m.t<0) continue; const k=m.t/m.dur; ctx.strokeStyle=`rgba(255,40,80,${.35+.5*k})`; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(m.x,GROUND+2,m.r,m.r*.18,0,0,TAU); ctx.stroke();
    ctx.fillStyle=`rgba(255,30,70,${.12+.25*k})`; ctx.beginPath(); ctx.ellipse(m.x,GROUND+2,m.r*k,m.r*.18*k,0,0,TAU); ctx.fill(); glow(fx,m.x,GROUND-10,m.r*1.2,'#ff2244',.2+.3*k); }
  if(G.hurtF>0&&pl.j) glow(fx,pl.j.hip[0],pl.j.hip[1]-60,200,'#ff2244',G.hurtF*.7);
  if(G.counter>0&&pl.j) glow(fx,pl.j.hip[0],pl.j.hip[1]-60,220,'#9ff7ff',.35+.2*Math.sin(RT*30));
  ctx.textAlign='center';
  for(const f of G.ftx){ const a=clamp(1-(f.t-f.life*.6)/(f.life*.4),0,1); ctx.globalAlpha=a; ctx.font=`900 ${f.size}px ${FONT_K}`; ctx.lineWidth=5; ctx.strokeStyle='#000'; ctx.strokeText(f.txt,f.x,f.y); ctx.fillStyle=f.c; ctx.fillText(f.txt,f.x,f.y); }
  ctx.globalAlpha=1;
};
drawHUD=function(){
  if(G.mode==='play'&&G.boss) return drawHUD0();
  ctx.setTransform(1,0,0,1,0,0);
  const u=Math.max(H/900,Math.min(devicePixelRatio||1,RS)*.8);
  if(ov.lb>.01){ ctx.fillStyle='#000'; const b=H*.11*ov.lb; ctx.fillRect(0,0,W,b); ctx.fillRect(0,H-b,W,b); }
  if(combo>1){ const s=1+comboPop*.5, x=W-60*u, y=H*.36;
    ctx.save(); ctx.translate(x,y); ctx.scale(s,s); ctx.rotate(-.08); ctx.textAlign='right';
    ctx.font=`italic 900 ${86*u}px "Arial Black",Impact,sans-serif`; ctx.lineJoin='round'; ctx.lineWidth=10*u; ctx.strokeStyle='#000'; ctx.strokeText(combo,0,0);
    const g=ctx.createLinearGradient(0,-80*u,0,0); g.addColorStop(0,'#fff'); g.addColorStop(1,combo>30?'#ff2a4a':'#55ddff'); ctx.fillStyle=g; ctx.fillText(combo,0,0);
    ctx.font=`italic 900 ${26*u}px "Arial Black",sans-serif`; ctx.fillStyle='#fff'; ctx.strokeText('HITS',0,34*u); ctx.fillText('HITS',0,34*u); ctx.restore(); }
};

// ============================================================ stage flow
function startStage(i){
  const st=STAGES[i]; if(!AC) initAudio(); if(AC&&AC.state!=='running') AC.resume();
  G.si=i; G.en=[]; G.proj=[]; G.mk=[]; G.ftx=[]; G.cd={}; G.wave=-1; G.waveT=1.4; G.spawnQ=[]; G.ug=0; G.hp=maxHp(); G.inv=0; G.jz=G.jv=0;
  G.stats={kills:0,dmg:0,exp:0,t:RT}; G.boss=!!st.boss; G.mode='play'; G.paused=false; combo=0;
  lock=false; anim.seq=null; done(); pl.x=VW*.25; pl.f=1; pl.visible=true; parts.length=0; timers.length=0;
  E.dead=true; E.respawn=1e9; E.x=Math.max(pl.home+520,VW*.7); E.by=GROUND-285;
  menuEl.classList.remove('on'); resEl.classList.remove('on'); hudR.classList.add('on'); buildBar();
  add({k:'banner',name:st.name,en:'STAGE '+(i+1),c:'#ffcf4a',life:2.6});
}
function nextWave(){ const st=STAGES[G.si]; G.wave++;
  if(G.boss&&G.wave===0) return bossEnter(st);
  const wi=G.boss?(G.wave-1)%st.waves.length:G.wave;
  if(wi>=st.waves.length){ finish(true); return; }
  const q=[]; for(const [t,n] of st.waves[wi]) for(let k=0;k<n;k++) q.push([t,Math.random()<.3?-1:1]);
  G.spawnQ=q.sort(()=>Math.random()-.5); G.spawnT=0; G.waveT=1.4;
  stamp('WAVE '+(wi+1),{x:.5,y:.3,size:.09,life:1,c:'#ffffff'});
}
function bossEnter(st){ lock=true; E.max=E.hp=E.lag=st.boss.hp; E.x=Math.max(pl.x+520,VW*.7); E.dead=true; respawn0();
  warn={t:0,dur:1.8}; SFX.siren(1.6);
  after(1.4,()=>{ G.en.push({boss:true,type:'boss',def:{exp:400},x:E.x,w:300,h:420,hp:E.hp,max:E.max,atkCd:2.5,dead:false,flash:0,z:0}); lock=false; G.waveT=4; });
}
function bossDown(e){ if(e.dead) return; e.dead=true; gainExp(Math.round(400*(1+.5*G.si))); after(2.2,()=>{ if(G.mode==='play') finish(true); }); }
function finish(win){ if(G.mode!=='play') return; G.mode='result'; G.paused=false; anim.seq=null; G.keys={};
  if(win){ const b=40*(G.si+1); gainExp(b); SV.clear=Math.max(SV.clear,G.si+1); stamp('CLEAR',{x:.5,y:.4,size:.14,life:1.6,c:'#ffcf4a'}); }
  save(); hudR.classList.remove('on');
  const s=G.stats, t=Math.round(RT-s.t);
  resEl.innerHTML=`<div class="box"><h2 class="${win?'w':'l'}">${win?'승리':'패배'}</h2><p>${STAGES[G.si].name}</p>
    <div class="st"><span>처치 <b>${s.kills}</b></span><span>피해 <b>${Math.round(s.dmg).toLocaleString()}</b></span><span>경험치 <b>+${s.exp}</b></span><span>시간 <b>${t}초</b></span></div>
    <div class="lv">Lv ${SV.lv} · 스킬 포인트 ${SV.sp}</div>
    <div class="row">${win&&G.si+1<STAGES.length?'<button data-r="next">다음 스테이지</button>':''}<button data-r="retry">다시 하기</button><button data-r="menu">메뉴로</button></div></div>`;
  setTimeout(()=>resEl.classList.add('on'),win?1200:300);
  resEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const r=b.dataset.r; if(r==='next') startStage(G.si+1); else if(r==='retry') startStage(G.si); else toMenu(); });
}
function toMenu(){ G.mode='menu'; G.paused=false; G.en=[]; G.proj=[]; G.mk=[]; lock=false; E.dead=true; anim.seq=null; done(); pl.x=VW*.3; pl.f=1;
  pl.x=pl.home=VW*.62; hudR.classList.remove('on'); resEl.classList.remove('on'); pauseEl.classList.remove('on'); menuRender(); menuEl.classList.add('on'); }
function setPause(p){ G.paused=p; pauseEl.classList.toggle('on',p); }

// ============================================================ DOM: menu, HUD, results
const css=document.createElement('style'); css.textContent=`
#hud,#cls,#start,#toast{display:none!important}
.rp{position:fixed;z-index:20;font-family:"Pretendard","Malgun Gothic",sans-serif;color:#fff;display:none}
.rp.on{display:flex}
.rp button{font:inherit;cursor:pointer;border:1px solid rgba(255,255,255,.3);background:rgba(20,14,34,.85);color:#fff;padding:8px 14px;border-radius:4px}
.rp button:hover{background:rgba(255,60,90,.35)}
.rp button:disabled{opacity:.35;cursor:default;background:rgba(20,14,34,.6)}
#rmenu{inset:0;background:linear-gradient(90deg,rgba(5,3,10,.92) 0%,rgba(5,3,10,.75) 46%,rgba(5,3,10,0) 70%);flex-direction:column;padding:4vh 4vw;box-sizing:border-box;overflow:auto}
#rmenu h1{margin:0;font:900 64px ${FONT_K};letter-spacing:.06em;background:linear-gradient(180deg,#fff 30%,#ff9aa8 60%,#ff1f45);-webkit-background-clip:text;background-clip:text;color:transparent}
#rmenu .sub{color:#ffb3c0;letter-spacing:.5em;font-size:11px;margin:4px 0 18px}
#rmenu .chars{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
#rmenu .ch{padding:8px 14px;border:1px solid rgba(255,255,255,.2);border-radius:4px;font-size:13px;color:#8f88a8}
#rmenu .ch.on{border-color:#ff3355;color:#fff;background:rgba(255,51,85,.18)}
#rmenu .me{font-size:14px;margin-bottom:10px;color:#e8dcff}
#rmenu .bar{width:min(420px,40vw);height:6px;background:rgba(255,255,255,.12);margin:6px 0 16px}
#rmenu .bar i{display:block;height:100%;background:linear-gradient(90deg,#55ddff,#b48cff)}
#rmenu .tabs{display:flex;gap:6px;margin-bottom:12px}
#rmenu .tabs button.on{background:rgba(255,51,85,.45);border-color:#ff3355}
#rmenu .stages{display:grid;grid-template-columns:repeat(2,minmax(160px,220px));gap:8px}
#rmenu .stages button{text-align:left;padding:12px 14px}
#rmenu .stages button small{display:block;color:#ffcf4a;font-size:11px;margin-top:3px}
#rmenu .skills{display:flex;flex-direction:column;gap:6px;max-width:min(640px,58vw)}
#rmenu .sk{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:4px;background:rgba(15,10,26,.7)}
#rmenu .sk.lock{opacity:.4}
#rmenu .sk b{font:900 16px ${FONT_K}}
#rmenu .sk .t{font-size:10px;color:#ffcf4a;display:block}
#rmenu .sk .t.u{color:#ff6a85}
#rmenu .sk p{margin:0;font-size:12px;color:#b9b3d0;line-height:1.45}
#rmenu .sk .tmp{color:#8a84a8;font-size:10px}
#rmenu .sk .bt{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
#rmenu .sk .bt button{padding:5px 8px;font-size:12px}
#rmenu .sk .bt button.on{background:#ff3355;border-color:#ff3355}
#rmenu .help{margin-top:18px;color:#8a84a8;font-size:12px;line-height:1.9}
#rmenu .help kbd{display:inline-block;padding:0 6px;border:1px solid #555;border-radius:3px;color:#ddd;font-size:11px;margin:0 2px}
#rhud{left:20px;top:16px;flex-direction:column;gap:6px;pointer-events:none;width:min(360px,40vw)}
#rhud .nm{font:900 17px ${FONT_K}}
#rhud .hb,#rhud .xb,#rhud .ub{height:12px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.3)}
#rhud .xb{height:5px} #rhud .ub{height:8px}
#rhud .hb i,#rhud .xb i,#rhud .ub i{display:block;height:100%}
#rhud .hb i{background:linear-gradient(90deg,#ff1d3d,#ff6a85)} #rhud .xb i{background:#55ddff} #rhud .ub i{background:linear-gradient(90deg,#ffb21d,#fff3a0)}
#rhud .ub.full{box-shadow:0 0 14px #ffcf4a}
#rhud .lb{font-size:11px;color:#cfc8e8}
#rbar{left:50%;bottom:18px;transform:translateX(-50%);gap:8px;pointer-events:none}
#rbar.on{display:flex}
.sl{position:relative;width:74px;height:74px;border:1px solid rgba(255,255,255,.3);border-radius:6px;background:rgba(10,6,20,.75);display:flex;align-items:center;justify-content:center;text-align:center;font:800 12px "Malgun Gothic",sans-serif;overflow:hidden;word-break:keep-all;line-height:1.15;padding:4px;box-sizing:border-box}
.sl kbd{position:absolute;left:4px;top:3px;font-size:10px;color:#000;background:#fff;border-radius:2px;padding:0 4px;font-weight:900}
.sl .cd{position:absolute;inset:0;background:rgba(0,0,0,.65);transform-origin:bottom;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff}
.sl.ult{border-color:#ffcf4a} .sl.ult.ready{box-shadow:0 0 18px #ffcf4a;animation:ultp 1.2s infinite;--uc:#ffcf4a}
.sl.empty{opacity:.3}
#rres{inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
#rres .box,#rpause .box{background:rgba(12,8,22,.92);border:1px solid rgba(255,255,255,.2);padding:26px 34px;border-radius:6px;text-align:center;min-width:320px}
#rres h2{margin:0;font:900 54px ${FONT_K}} #rres h2.w{color:#ffcf4a} #rres h2.l{color:#ff4a5a}
#rres .st{display:flex;gap:16px;justify-content:center;margin:14px 0;font-size:13px;color:#b9b3d0} #rres .st b{color:#fff}
#rres .lv{color:#55ddff;margin-bottom:16px} #rres .row,#rpause .row{display:flex;gap:8px;justify-content:center}
#rpause{inset:0;align-items:center;justify-content:center;background:rgba(0,0,0,.5)}
#rtoast{left:50%;top:22%;transform:translateX(-50%);flex-direction:column;gap:6px;align-items:center;pointer-events:none}
#rtoast div{background:rgba(0,0,0,.7);border:1px solid #ffcf4a;color:#ffe9a0;padding:8px 16px;border-radius:18px;font-size:14px;animation:rtf 2.6s forwards}
@keyframes rtf{0%{opacity:0;transform:translateY(8px)}10%,80%{opacity:1;transform:none}100%{opacity:0}}`;
document.head.appendChild(css);
const mk=(id)=>{ const d=document.createElement('div'); d.id=id; d.className='rp'; document.body.appendChild(d); return d; };
const menuEl=mk('rmenu'), hudR=mk('rhud'), barEl=mk('rbar'), resEl=mk('rres'), pauseEl=mk('rpause'), toastEl=mk('rtoast'); toastEl.classList.add('on');
hudR.innerHTML='<div class="nm"></div><div class="hb"><i></i></div><div class="xb"><i></i></div><div class="lb">궁극기 게이지</div><div class="ub"><i></i></div>';
pauseEl.innerHTML='<div class="box"><h2 style="margin:0 0 16px;font:900 36px '+FONT_K+'">일시정지</h2><div class="row"><button data-p="go">계속</button><button data-p="quit">포기하고 메뉴로</button></div></div>';
pauseEl.querySelector('[data-p=go]').onclick=()=>setPause(false);
pauseEl.querySelector('[data-p=quit]').onclick=()=>toMenu();
function toast(t){ const d=document.createElement('div'); d.textContent=t; toastEl.appendChild(d); setTimeout(()=>d.remove(),2700); }

let tab='stage';
function menuRender(){
  const need=needExp(SV.lv), ids=ORDER[SV.cls];
  let h=`<h1>참광</h1><div class="sub">CHAMGWANG · RPG</div>
  <div class="chars"><span class="ch on">검사</span><span class="ch">마법사 · 준비 중</span><span class="ch">권사 · 준비 중</span><span class="ch">도사 · 준비 중</span><span class="ch">화염술사 · 준비 중</span></div>
  <div class="me">검사 · Lv ${SV.lv} · 스킬 포인트 ${SV.sp} · HP ${maxHp()}</div><div class="bar"><i style="width:${SV.exp/need*100}%"></i></div>
  <div class="tabs"><button data-t="stage" class="${tab==='stage'?'on':''}">스테이지</button><button data-t="skill" class="${tab==='skill'?'on':''}">스킬 · 장착</button></div>`;
  if(tab==='stage'){ h+='<div class="stages">'+STAGES.map((s,i)=>`<button data-s="${i}" ${i>SV.clear?'disabled':''}>${s.name}<small>${i<SV.clear?'클리어':i===SV.clear?'도전 가능':'잠김'}${s.boss?' · 보스':''}</small></button>`).join('')+'</div>'; }
  else { h+='<div class="skills">'+ids.map(id=>{ const s=SK[id], un=unlocked(id), lvl=sLv(id);
      let bt='';
      if(un&&s.type==='skill'){ bt+=SLOT_KEYS.map((k,i)=>`<button data-eq="${id}" data-i="${i}" class="${SV.slots[i]===id?'on':''}">${k}</button>`).join(''); }
      if(un&&s.type==='ult') bt+=`<button data-ult="${id}" class="${SV.ult===id?'on':''}">${SV.ult===id?'장착 중':'장착'}</button>`;
      if(un&&s.type!=='ult') bt+=`<button data-up="${id}" ${SV.sp<1||lvl>=MAXSL?'disabled':''}>강화 ${lvl}/${MAXSL}</button>`;
      const tag=s.type==='ult'?'<span class="t u">궁극기 · O</span>':s.type==='basic'?'<span class="t">평타 · J</span>':`<span class="t">스킬 · 쿨 ${cdOf(id).toFixed(1)}초</span>`;
      return `<div class="sk ${un?'':'lock'}"><div><b>${s.name}</b>${tag}</div><p>${un?s.desc:'Lv '+s.lv+'에 해금'}${s.tmp?' <span class="tmp">(임시 동작 그림)</span>':''}</p><div class="bt">${bt}</div></div>`; }).join('')+'</div>'; }
  h+=`<div class="help"><kbd>A</kbd><kbd>D</kbd> 또는 방향키 이동 · <kbd>Space</kbd> 점프 · <kbd>Shift</kbd> 회피 · <kbd>J</kbd> 평타 · <kbd>K</kbd><kbd>L</kbd><kbd>U</kbd><kbd>I</kbd> 스킬 · <kbd>O</kbd> 궁극기 · <kbd>Esc</kbd> 일시정지</div>`;
  menuEl.innerHTML=h;
  menuEl.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ tab=b.dataset.t; menuRender(); });
  menuEl.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>startStage(+b.dataset.s));
  menuEl.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{ const id=b.dataset.eq, i=+b.dataset.i, j=SV.slots.indexOf(id);
    if(SV.slots[i]===id) SV.slots[i]=null; else { if(j>=0) SV.slots[j]=SV.slots[i]; SV.slots[i]=id; } save(); menuRender(); });
  menuEl.querySelectorAll('[data-ult]').forEach(b=>b.onclick=()=>{ SV.ult=b.dataset.ult; save(); menuRender(); });
  menuEl.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{ const id=b.dataset.up; if(SV.sp<1||sLv(id)>=MAXSL) return; SV.sp--; SV.sl[id]=sLv(id)+1; save(); menuRender(); });
}
let barSlots=[];
function buildBar(){
  const cells=[['J','sw_basic','','basic'],...SV.slots.map((id,i)=>[SLOT_KEYS[i],id,'',String(i)]),['O',SV.ult,'ult','ult']];
  barEl.innerHTML=cells.map(([k,id,c,a])=>`<div class="sl ${c} ${id&&unlocked(id)?'':'empty'}" data-a="${a}"><kbd>${k}</kbd>${id&&unlocked(id)?SK[id].name:'—'}<div class="cd" style="display:none"></div></div>`).join('');
  barSlots=[...barEl.querySelectorAll('.sl')].map((el,i)=>({el,cd:el.querySelector('.cd'),id:cells[i][1],ult:cells[i][2]==='ult'}));
  if(isTouch()) barEl.insertAdjacentHTML('beforeend','<div class="sl tb" data-a="jump">점프</div><div class="sl tb" data-a="dodge">회피</div>');
  barEl.classList.add('on');
}
let hudLv=-1;
function hudTick(){
  const tp=isTouch()&&G.mode==='play'&&!lock; padEl.classList.toggle('on',tp); pauseBt.classList.toggle('on',tp&&!G.paused);
  document.body.classList.toggle('cine',lock);
  if(G.mode!=='play'){ barEl.classList.remove('on'); return; }
  barEl.classList.add('on');
  if(hudLv!==SV.lv){ hudLv=SV.lv; hudR.querySelector('.nm').textContent=`검사 · Lv ${SV.lv}`; buildBar(); }
  hudR.querySelector('.hb i').style.width=Math.min(100,G.hp/maxHp()*100)+'%';
  hudR.querySelector('.xb i').style.width=(SV.exp/needExp(SV.lv)*100)+'%';
  hudR.querySelector('.ub i').style.width=G.ug+'%'; hudR.querySelector('.ub').classList.toggle('full',G.ug>=100);
  for(const s of barSlots){ if(!s.id||!unlocked(s.id)) continue;
    if(s.ult){ s.el.classList.toggle('ready',G.ug>=100); s.cd.style.display=G.ug>=100?'none':'flex'; s.cd.style.transform=`scaleY(${1-G.ug/100})`; s.cd.textContent=''; continue; }
    const c=G.cd[s.id]||0; if(c>0&&SK[s.id].cd){ s.cd.style.display='flex'; s.cd.style.transform=`scaleY(${c/cdOf(s.id)})`; s.cd.textContent=Math.ceil(c); } else s.cd.style.display='none'; }
}

// ============================================================ touch (phones): move pad on the left, the skill bar turns into buttons on the right
function isTouch(){ return document.body.classList.contains('touch'); }
function enableTouch(){ if(isTouch()) return; document.body.classList.add('touch'); touchCam(); if(G.mode==='play') buildBar(); }
function touchCam(){ if(!isTouch()||PORTRAIT) return; CY=VH/2+190; if(!lock&&cam.ft<=0){ cam.y=cam.fy=CY; } }
const tcss=document.createElement('style'); tcss.textContent=`
html,body{touch-action:none;-webkit-tap-highlight-color:transparent}
#rmenu{touch-action:pan-y}
body.touch .rp{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#rpad{left:max(16px,env(safe-area-inset-left));bottom:16px;width:200px;height:112px;border-radius:56px;background:rgba(10,6,20,.45);border:1px solid rgba(255,255,255,.25);align-items:center;justify-content:center;touch-action:none}
#rpad i{width:72px;height:72px;border-radius:50%;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.55);pointer-events:none}
#rpad i::before,#rpad i::after{content:'◀';position:absolute;left:-46px;top:50%;transform:translateY(-50%);color:rgba(255,255,255,.45);font-size:18px}
#rpad i{position:relative} #rpad i::after{content:'▶';left:auto;right:-46px}
#rpbt{right:max(14px,env(safe-area-inset-right));top:12px;width:46px;height:46px;border-radius:50%;background:rgba(10,6,20,.6);border:1px solid rgba(255,255,255,.35);align-items:center;justify-content:center;font-size:15px;touch-action:none}
#rrot{inset:0;z-index:60;background:#05030a;align-items:center;justify-content:center;font:800 18px "Malgun Gothic",sans-serif;text-align:center;padding:20px}
@media (orientation:portrait){ body.touch #rrot{display:flex} }
body.touch #rbar{left:auto;right:max(12px,env(safe-area-inset-right));bottom:12px;transform:none;pointer-events:auto;touch-action:none;display:none;gap:7px;
  grid-template-columns:repeat(4,60px) 84px;grid-template-rows:60px 60px;grid-template-areas:"s0 s1 ult jump basic" "s2 s3 . dodge basic"}
body.touch #rbar.on{display:grid} body.touch.cine #rbar{display:none}
body.touch .sl{width:auto;height:auto;font-size:11px;border-radius:50%;background:rgba(10,6,20,.38)}
body.touch .sl kbd{display:none}
body.touch .sl.press{background:rgba(255,60,90,.45)}
body.touch .sl[data-a="0"]{grid-area:s0} body.touch .sl[data-a="1"]{grid-area:s1} body.touch .sl[data-a="2"]{grid-area:s2} body.touch .sl[data-a="3"]{grid-area:s3}
body.touch .sl[data-a=ult]{grid-area:ult} body.touch .sl[data-a=jump]{grid-area:jump} body.touch .sl[data-a=dodge]{grid-area:dodge}
body.touch .sl[data-a=basic]{grid-area:basic;height:84px;align-self:center;font-size:16px;border-color:#ff6a85}
body.touch .sl.tb{background:rgba(40,30,70,.42)}
body.touch #rmenu .help{display:none}
body.touch #rhud{width:min(280px,32vw);gap:4px} body.touch #rhud .hb{height:9px} body.touch #rhud .nm{font-size:14px} body.touch #rhud .lb{display:none}
@media (max-height:520px){ #rmenu{padding:3vh 3vw} #rmenu h1{font-size:38px} #rmenu .sub{margin:2px 0 8px} #rmenu .chars{margin-bottom:8px} #rmenu .ch{padding:5px 10px;font-size:12px}
  #rmenu .bar{margin:4px 0 8px} #rmenu .me{margin-bottom:6px} #rmenu .stages{grid-template-columns:repeat(4,minmax(120px,180px))} #rmenu .stages button{padding:9px 10px;font-size:13px}
  #rmenu .skills{max-width:min(760px,92vw)} #rmenu .sk{grid-template-columns:110px 1fr auto;padding:6px 8px} #rmenu .sk .bt button{padding:8px 10px}
  #rhud{top:10px;left:14px} #rres .box,#rpause .box{padding:16px 22px} #rres h2{font-size:38px} }`;
document.head.appendChild(tcss);
const padEl=mk('rpad'), pauseBt=mk('rpbt'), rotEl=mk('rrot');
padEl.innerHTML='<i></i>'; pauseBt.textContent='❚❚'; rotEl.textContent='휴대폰을 가로로 돌려 주세요';
let padId=null;
function padMove(e){ const r=padEl.getBoundingClientRect(), dx=e.clientX-(r.left+r.width/2);
  padEl.firstChild.style.transform=`translateX(${clamp(dx,-50,50)}px)`; G.keys.l=dx<-12; G.keys.r=dx>12; }
function padUp(e){ if(e.pointerId!==padId) return; padId=null; G.keys.l=G.keys.r=false; padEl.firstChild.style.transform=''; }
padEl.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); padId=e.pointerId; try{ padEl.setPointerCapture(e.pointerId); }catch(_){} padMove(e); });
padEl.addEventListener('pointermove',e=>{ if(e.pointerId===padId) padMove(e); });
padEl.addEventListener('pointerup',padUp); padEl.addEventListener('pointercancel',padUp);
barEl.addEventListener('pointerdown',e=>{ const el=e.target.closest('[data-a]'); if(!el) return; e.preventDefault(); e.stopPropagation();
  try{ el.setPointerCapture(e.pointerId); }catch(_){} el.classList.add('press'); if(G.mode!=='play'||G.paused) return;
  const a=el.dataset.a; if(a==='basic'){ G.keys.basic=true; useBasic(); } else if(a==='jump') jump(); else if(a==='dodge') dodge(); else if(a==='ult') useUlt(); else useSlot(+a); });
function barUp(e){ const el=e.target.closest&&e.target.closest('[data-a]'); if(!el) return; el.classList.remove('press'); if(el.dataset.a==='basic') G.keys.basic=false; }
barEl.addEventListener('pointerup',barUp); barEl.addEventListener('pointercancel',barUp);
pauseBt.addEventListener('pointerdown',e=>{ e.preventDefault(); e.stopPropagation(); if(G.mode==='play') setPause(true); });
// phones: go fullscreen and landscape when a stage starts (browsers that refuse just keep the page as it is)
menuEl.addEventListener('click',e=>{ if(!isTouch()||!e.target.closest('[data-s]')) return; const d=document.documentElement;
  if(!document.fullscreenElement&&d.requestFullscreen) d.requestFullscreen().then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{})).catch(()=>{}); },true);
// iOS Safari ignores user-scalable=no: rapid taps zoom and pinches zoom, so swallow those gestures (menu scrolling still works)
let lastTap=0;
document.addEventListener('touchend',e=>{ const n=performance.now(); if(n-lastTap<350&&!e.target.closest('#rmenu')) e.preventDefault(); lastTap=n; },{passive:false});
document.addEventListener('touchstart',e=>{ if(e.touches.length>1&&!e.target.closest('[data-a],#rpad')) e.preventDefault(); },{passive:false});
['gesturestart','gesturechange','dblclick'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
if(matchMedia('(pointer:coarse)').matches) enableTouch();
addEventListener('touchstart',enableTouch,{passive:true});

// ============================================================ boot
started=true; setClass('sword',true); E.dead=true; E.respawn=1e9; pl.x=pl.home=VW*.62;
menuRender(); menuEl.classList.add('on');
})();
