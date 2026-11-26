// Gunner. All ordnance here uses the battlefield's world coordinates.
'use strict';
(()=>{
const X=RPG.sv, {A,V,BODY,FSY}=X, K=window.K3, F=window.FX3;
const tau=2*Math.PI, clamp01=x=>Math.max(0,Math.min(1,x)), mix=(a,b,k)=>a+(b-a)*k;
const ease=k=>{const u=clamp01(k); return u*u*(3-2*u);};
const copper={d:'#24130f',b:'#a0351a',m:'#ed8741',h:'#fff2c8',l:'#ffad68',s:'#ffd197'};
const glass={d:'#092129',b:'#187482',m:'#60d2cf',h:'#edfff4',l:'#78ded5',s:'#c2f3dd'};
const violet={d:'#180f25',b:'#553363',m:'#b46f91',h:'#ffe9c6',l:'#d292be',s:'#ffd6a8'};
const low=()=>F.low||(A.SV.opt||{}).lowfx;
const body=e=>e.y-(e.z||0)-(e.h||BODY)*.52;
const pose=(n,t)=>window.RangedHero?.pose(n,t);
const point=(x,y)=>({x,y});
const at=e=>point(e.x,body(e));
const origin=a=>point(pl.x+Math.cos(a)*BODY*.56,pl.gy-BODY*.86+Math.sin(a)*BODY*.18);
const evolve=id=>A.sLv(id)>=5;
const power=id=>X.SK[id].dmg*A.mul(id);
const tone=(n,...args)=>X.cine.SND[n](...args);
const hit=(e,d,p,extra={})=>{X.dmg(e,d,{kb:.26,...extra}); X.hitFx(e,p.m,.82);};
const ship=new Image(),discAtlas=new Image();
const bankPoses=[-24,-12,0,12,24].map(deg=>({deg,image:deg?new Image():ship}));
function preload(){
  if(!ship.src)ship.src='assets/gunner_strikecraft.webp';
  if(!discAtlas.src)discAtlas.src='assets/gunner_accretion.webp';
  for(const {deg,image} of bankPoses)if(!image.src)image.src='assets/gunner_bank_'+(deg<0?'left':'right')+Math.abs(deg)+'.webp';
}
let castGeneration=0;
const queue=window.after;
function after(delay,fn){const group=castGeneration,run=V.draws;queue(delay,()=>{if(group===castGeneration&&V.draws===run&&pl.cls==='gunner'&&RPG.mode==='surv')fn();});}
function begin(id){castGeneration++; X.ultStart(id);preload();}

// Timed drawings use the same clock as the engine's damage callbacks and survive a dropped frame.
function paint(life,fn){const group=castGeneration;X.draw(life,k=>{if(group!==castGeneration)return;ctx.save(); try{fn(ctx,k,k*life);} finally{ctx.restore();}});}
function arc(g,r,lo,hi,color,width){if(hi<=lo)return; g.strokeStyle=color; g.lineWidth=width; g.beginPath(); g.arc(0,0,r,lo,hi); g.stroke();}
function line(g,x,y,xx,yy,c,w){g.strokeStyle=c; g.lineWidth=w; g.beginPath(); g.moveTo(x,y); g.lineTo(xx,yy); g.stroke();}
function poly(g,coords,c){g.fillStyle=c; g.beginPath(); g.moveTo(coords[0],coords[1]); for(let i=2;i<coords.length;i+=2)g.lineTo(coords[i],coords[i+1]);g.closePath();g.fill();}
function halo(g,x,y,r,color,alpha){
  const grad=g.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,hexA(color,alpha));grad.addColorStop(.24,hexA(color,alpha*.48));grad.addColorStop(1,hexA(color,0));
  g.fillStyle=grad;g.fillRect(x-r,y-r,2*r,2*r);
}
function streak(a,b,p,width=12,time=.17){
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len<1)return;
  paint(time,(g,k)=>{
    const lead=Math.min(1,k/.24), trail=ease((k-.15)/.83), tip=len*lead, tail=len*trail, w=width*(1-k*.7);
    if(tip<=tail)return;
    g.translate(a.x,a.y);g.rotate(Math.atan2(dy,dx));g.globalAlpha=1-k*k;
    poly(g,[tail,0,tip-(tip-tail)*.23,-w,tip,0,tip-(tip-tail)*.08,w*.65],p.b);
    poly(g,[tail,0,tip-(tip-tail)*.17,-w*.46,tip,0,tip-(tip-tail)*.10,w*.40],p.s);
    line(g,tip-(tip-tail)*.14,0,tip,0,p.h,Math.max(2,w*.23));
  });
}
function casing(a){
  const x=pl.x+Math.cos(a)*BODY*.14,y=pl.gy,side=Math.cos(a)>=0?1:-1;
  paint(.48,(g,k)=>{const z=BODY*(.65*(1-k)+.58*Math.sin(k*Math.PI)),xx=x-side*BODY*.75*k,yy=y+BODY*.20*k;
    g.translate(xx,yy-z);g.rotate(a+.71+side*k*7.4);g.globalAlpha=1-ease((k-.79)/.21);
    poly(g,[-12,-4,8,-4,11,-2,11,4,-12,4],'#5f4534');poly(g,[-12,-4,8,-4,11,-2,-11,0],'#d6aa67');
    line(g,-9,-4,-9,3,'#ffe2a0',2.1);
  });
}
const gunZ=BODY*.86;
// Kit directions are measured on the unforeshortened floor; skill angles are screen angles.
const fa=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a)), fl=(a,len)=>Math.hypot(Math.cos(a)*len,Math.sin(a)*len/FSY);
const muzzleAt=a=>({x:pl.x+Math.cos(a)*BODY*.56,y:pl.gy+Math.sin(a)*BODY*.18,z:gunZ});
const chest=e=>({x:e.x,y:e.y,z:(e.z||0)+(e.h||BODY)*.52});
const flat=p=>point(p.x,p.y-(p.z||0));
const kick=(shake,stop=0)=>{trauma=Math.min(1,trauma+shake);if(stop)hitstop=Math.max(hitstop,stop);};
// A round is a hot ribbon hanging in the air for a moment. Without the GPU layer the flat streak stands in.
function tracer(a,b,p,w=34,o={}){
  if(!F.on){streak(flat(a),flat(b),p,w*.4,o.dur||.17);return;}
  const n=7,pts=[];
  for(let i=0;i<n;i++){const u=i/(n-1);pts.push({x:mix(a.x,b.x,u),y:mix(a.y,b.y,u),z:mix(a.z,b.z,u)});}
  K.trail(pts,{pal:p,w,dur:o.dur||.24,draw:o.draw||.04,gain:o.gain||1});
}
function muzzle(a,p,s=150){
  const m=muzzleAt(a);
  K.flare(m.x,m.y,m.z,{pal:p,s,sx:1.6,sy:.62,dur:.1,gain:3});
  K.art(m.x+Math.cos(a)*s*.62,m.y+Math.sin(a)*s*.62,{tex:'v3_thrust',asp:3.7,s:s*.4,z:m.z,lift:0,rot:-a,pal:p,dur:.14,hold:.2,s0:.6,gain:.8});
  K.sparks(m.x,m.y,m.z,{pal:p,n:4,dir:fa(a),spread:.32,sp:[600,1500],up:160,life:[.07,.18]});
  GFX.light(pl.x,pl.gy,s*2.6,p.l,.6,.13,{z:gunZ});casing(a);
  trauma=Math.min(1,trauma+s/2400);
  // Recoil presses a ring of air out over the floor, and the barrel keeps smoking after a heavy round.
  if(s>=140)K.shock(pl.x,pl.gy,{r:s*1.5,dur:.22,pal:p,dust:s>=200?2:0,light:0,gain:.45});
  if(s>=160&&!low())K.vsmoke(m.x+Math.cos(a)*s*.45,m.y+Math.sin(a)*s*.45,{s:s*.3,z:m.z,dur:.75,rise:s*.35,a:.5});
  return m;
}
function fireAt(e,p=glass,w=34,s=150){const a=X.angTo(e);X.face(a);pose('release',.19);tracer(muzzle(a,p,s),chest(e),p,w);return a;}
// The telling blow of a skill: a star on the body and a ring kicked out underfoot, drawn before the damage can remove the target.
function blow(e,d,p,a,pw=1,extra={},ring=pw>=1){K.ehit(e,{pal:p,pw,dir:fa(a),ring:ring?1:0});hit(e,d,p,{sx:pl.x,sy:pl.gy,...extra});}
function pop(x,y,r,p=copper,heavy=false){
  K.vblast(x,y,{s:r*(heavy?.57:.74),z:r*.14,pal:p,fire:heavy?.43:.3,dur:heavy?1.48:.8,smoke:.66,heat:1.2,squash:.83,rise:r*.42});
  K.shock(x,y,{r:r*1.32,dur:heavy?.65:.36,pal:p,dust:heavy?9:3,light:0,gain:.78});
  K.cool(x,y,{r:r*.83,kind:'crater',pal:p,life:heavy?3.8:1.7,light:0,hot:.65});
  K.sparks(x,y,r*.12,{pal:p,n:heavy?24:10,sp:[r,r*3],up:r*2.1,life:[.17,.64]});
  GFX.light(x,y,r*2.8,p.l,heavy?1:.7,heavy?.42:.24,{z:r*.23});
  if(F.on&&!heavy){
    K.art(x,y,{tex:p===copper?'v3_burst_fire':'v3_xburst',s:r*1.05,z:r*.08,lift:.5,pal:p,dur:.2,hold:.25,gain:.85});
    if(!low())K.chunks(x,y,{pal:p,n:3,r:r*.2,sp:[r*.6,r*1.7],up:1050,s:[16,30],rock:'#4b4137',life:1});
    return;
  }
  // Slender pieces of white-hot metal throw a distinctly directional crown above the crater.
  const spikes=heavy?14:7;
  paint(heavy?.56:.28,(g,k)=>{g.translate(x,y-r*.17);const scale=1-(1-k)**3;g.globalAlpha=(1-k)**1.8;
    for(let i=0;i<spikes;i++){const a=i*2.39996+.35*Math.sin(i*3.2), l=(.48+.5*Math.sin(i*7.6+.5)**2)*r, h=l*scale, w=r*.023*(1-k);
      g.save();g.rotate(a);poly(g,[h*.11,0,h*.29,-w,h,0,h*.41,w*.60],i%4?p.s:p.h);g.restore();}
    if(!F.on)halo(g,0,0,Math.max(1,r*(.22+.5*k)),p.m,.8);
  });
}
function hurtArea(x,y,r,d,p,opts){X.inCircle(x,y,r,e=>hit(e,d,p,{sx:x,sy:y,...opts}));}
function targetList(r){return V.en.filter(e=>!e.dead&&Math.hypot(e.x-pl.x,(e.y-pl.gy)/.76)<r).sort((a,b)=>Math.hypot(a.x-pl.x,a.y-pl.gy)-Math.hypot(b.x-pl.x,b.y-pl.gy));}
// a: launch point {x,y,z}; b: floor point. The casing is drawn on the canvas, its smoke is a ribbon written along the same arc.
function shell(a,b,height,p,s,travel,land){
  const arc=k=>({x:mix(a.x,b.x,k),y:mix(a.y,b.y,k),z:(a.z||0)*(1-k)+Math.sin(Math.PI*k)*height});
  if(F.on)K.trail(Array.from({length:10},(_,i)=>arc(i/9)),{pal:p,w:s*.8,draw:travel,dur:travel+.24,gain:.7});
  paint(travel,(g,k)=>{const q=arc(k),u=arc(Math.max(0,k-.14)),x=q.x,y=q.y-q.z,tx=u.x,ty=u.y-u.z;
    g.fillStyle='rgba(18,12,15,.42)';g.beginPath();g.ellipse(x,q.y,s*.91,s*.37,0,0,tau);g.fill();
    g.translate(x,y);g.rotate(Math.atan2(y-ty,x-tx)); const l=Math.hypot(x-tx,y-ty);
    poly(g,[-l,0,-s*.5,-s*.29,0,0,-s*.5,s*.29],p.m);
    poly(g,[-s*.75,-s*.31,s*.62,-s*.25,s,0,s*.6,s*.35,-s*.8,s*.37],p.d);
    poly(g,[-s*.55,-s*.24,s*.53,-s*.2,s*.88,0,-s*.5,.05*s],p.s);
    line(g,-s*.23,-s*.25,-s*.23,s*.32,p.m,s*.13);
  });after(travel,land);
}

const sk={}, skills={};
function skill(id,name,lv,cd,dmg,desc,evo,fn){sk[id]={cls:'gunner',type:'skill',name,lv,cd,dmg,desc,evo};skills[id]={fn};}
sk.gn_basic={cls:'gunner',type:'basic',name:'강선탄',lv:1,desc:'가장 가까운 적에게 청동탄을 쏜다. 진화하면 뒤에 있는 적 한 명까지 관통한다.',evo:'탄환이 적 하나를 더 관통한다.'};
function basic(){const e=X.nearest(840);if(!e)return false;const a=fireAt(e,copper,30,120), d=950*A.mul('gn_basic');
  blow(e,d,copper,a,.7);tone('tick',.56,.10);X.sfx('boom',.10,.14);
  if(evolve('gn_basic')){const end=point(e.x+Math.cos(a)*300,e.y+Math.sin(a)*300), rest=[];
    X.inLine(e.x,e.y,end.x,end.y,25,t=>{if(t!==e)rest.push(t);});
    rest.sort((u,v)=>Math.hypot(u.x-e.x,u.y-e.y)-Math.hypot(v.x-e.x,v.y-e.y));
    if(rest.length){const t=rest[0];tracer(chest(e),chest(t),copper,24);blow(t,d*.65,copper,a,.6);}
  }return true;
}
skill('gn_burst','점화 삼점사',1,4.1,960,'한 적에게 짧게 끊어 쏜다. 세 번째 탄이 적의 발밑에서 터진다.','마지막 탄이 더 넓게 터진다.',id=>{
  const first=X.nearest(940);if(!first)return false;const d=power(id),r=evolve(id)?260:153;
  [0,.13,.31].forEach((t,i)=>after(t,()=>{const e=first.dead?X.nearest(940):first;if(!e)return;
    const last=i===2,a=fireAt(e,last?copper:glass,last?60:36,last?240:150);
    if(last){pop(e.x,e.y,r,copper);hurtArea(e.x,e.y,r,d,copper,{push:240,up:800});X.sfx('boom',.7,.4);kick(.3,.035);}
    else blow(e,d*.63,glass,a,.85);
    tone('tick',1.1-i*.15,.18);}));
  return true;
});
skill('gn_bank','도탄 왈츠',1,5.3,1260,'은탄이 가까운 적들 사이를 지그재그로 튕긴다.','두 번 더 튕기고 마지막 적을 기절시킨다.',id=>{
  const start=X.nearest(840);if(!start)return false;const d=power(id),n=evolve(id)?6:4, seen=new Set();
  function hop(e,i,a){if(e.dead)return;seen.add(e);
    let dest=null,best=650;
    if(i+1<n)for(const t of V.en){if(t.dead||seen.has(t))continue;const l=Math.hypot(t.x-e.x,(t.y-e.y)/.76);if(l<best){best=l;dest=t;}}
    const c=chest(e);
    K.sparks(c.x,c.y,c.z,{pal:glass,n:6,sp:[300,950],up:520,life:[.1,.3]});GFX.light(e.x,e.y,320,glass.l,.55,.15,{z:c.z});
    if(!dest){K.shock(e.x,e.y,{r:240,dur:.3,pal:glass,dust:2,light:0,gain:.7});blow(e,d,glass,a,1.5,{stun:.5,push:260});kick(.2,.03);return;}
    blow(e,d,glass,a,.9,{stun:.15});
    const next=Math.atan2(dest.y-e.y,dest.x-e.x);
    tracer(c,chest(dest),glass,40,{dur:.3,draw:.07});tone('tick',1.05+i*.17,.10);kick(.08);after(.09,()=>hop(dest,i+1,next));}
  hop(start,0,fireAt(start,glass,40,170));return true;
});
skill('gn_fan','산탄 부채',2,5.8,2000,'황동 파편탄 다섯 발을 부채 모양으로 펼쳐 가까운 적을 밀어낸다.','일곱 갈래로 넓게 번지고 사거리가 늘어난다.',id=>{
  const e=X.nearest(660);if(!e)return false;const a=X.angTo(e),n=evolve(id)?7:5,r=evolve(id)?820:680,half=evolve(id)?.70:.53;
  X.face(a);pose('release',.24);const m=muzzle(a,copper,280),ca=Math.cos(a),sa=Math.sin(a);
  for(let i=0;i<n;i++){const dir=a+mix(-half,half,i/(n-1));tracer(m,{x:pl.x+Math.cos(dir)*r,y:pl.gy+Math.sin(dir)*r,z:gunZ*.5},copper,28,{dur:.27,draw:.05});}
  // One pressure cone carries the blast; the pellets only draw its ribs.
  K.art(m.x+ca*r*.34,m.y+sa*r*.34,{tex:'v3_fist_cone',asp:2,s:r*(.30+half*.16),z:gunZ,lift:0,rot:-a,pal:copper,dur:.3,hold:.3,s0:.4,gain:.8});
  K.vjet(m.x,m.y,m.z,fa(a),{pal:copper,len:r*.5,r:r*.15,dur:.34,in:.03,out:.24,turb:.9,heat:.8,gain:.6});
  K.cool(pl.x+ca*r*.42,pl.gy+sa*r*.42,{kind:'scorch',r:r*.4,rot:fa(a),pal:copper,life:1.5,hot:.5,light:0});
  K.dust(pl.x,pl.gy,{n:7,dir:fa(a)+Math.PI,spread:.7,sp:[250,650],a:.36});
  GFX.light(pl.x+ca*r*.3,pl.gy+sa*r*.3,r*1.2,copper.l,.85,.2,{z:gunZ});
  let shown=0;
  X.inSector(pl.x,pl.gy,a,r,half,t=>{const out=Math.atan2(t.y-pl.gy,t.x-pl.x);
    if(shown++<3)blow(t,power(id),copper,out,1.1,{kb:1.2,push:340,up:500},false);else hit(t,power(id),copper,{kb:1.2,push:340,up:500,sx:pl.x,sy:pl.gy});});
  X.sfx('boom',.35,.31);kick(.32,.035);return true;
});
skill('gn_mine','자기 유탄',3,7,2100,'적 무리에 자력 유탄을 던져 깨진 철편이 솟는 폭발을 일으킨다.','유탄이 한 차례 더 맥동한다.',id=>{
  const e=X.densest(940);if(!e)return false;const x=e.x,y=e.y,a=X.angTo(e),d=power(id);X.face(a);pose('release',.26);
  const m=muzzleAt(a);K.flare(m.x,m.y,m.z,{pal:glass,s:150,dur:.1,gain:2.6});X.sfx('whoosh',.8,.3);kick(.1);
  shell(m,point(x,y),250,glass,56,.45,()=>{pop(x,y,255,glass);
    K.chunks(x,y,{pal:glass,kind:'plate',n:6,r:70,sp:[220,640],up:1500,s:[22,46],rock:'#7d8f94',life:1.2});
    K.cool(x,y,{kind:'crack',r:300,pal:glass,life:1.6,hot:.6,light:0});
    hurtArea(x,y,255,d,glass,{stun:.7,up:1100});X.sfx('boom',.58,.48);kick(.4,.045);
    if(evolve(id))after(.42,()=>{pop(x,y,315,copper);hurtArea(x,y,315,d*.62,copper,{push:260});X.sfx('boom',.5,.4);kick(.3);});});
  return true;
});
skill('gn_rail','백야 관통탄',5,7.8,2680,'총열이 청백색으로 달아오른 뒤 길게 뻗은 한 줄의 탄도가 적을 관통한다.','관통 경로의 바닥에서 두 번째 열파가 솟는다.',id=>{
  const e=X.nearest(1170);if(!e)return false;const a=X.angTo(e),d=power(id),x=pl.x,y=pl.gy,xx=x+Math.cos(a)*1480,yy=y+Math.sin(a)*1480;
  X.face(a);pose('draw',.24);const m=muzzleAt(a);
  const charge=K.gather(m.x,m.y,m.z,{pal:glass,r:50,R:340,dur:.24,n:.5,shells:1,gain:.8});
  K.flare(m.x,m.y,m.z,{pal:glass,s:210,dur:.24,sx:1.9,sy:.5});tone('inhale',.24,.2);
  after(.24,()=>{charge.release({s:.4,ring:0});pose('release',.24);casing(a);
    if(F.on)K.ray(m.x+Math.cos(a)*70,m.y+Math.sin(a)*70,m.z,fa(a),{len:fl(a,1410),w:54,dur:.14,grow:.07,out:.24,pal:glass,scarLife:1.6});
    else{streak(point(x,y-BODY*.63),point(xx,yy-BODY*.55),glass,35,.32);K.coolLine(x,y,xx,yy,{pal:glass,w:54,life:1.6,hot:.42,light:0});}
    K.dust(x,y,{n:8,dir:fa(a)+Math.PI,spread:.6,sp:[300,820],a:.4});
    let shown=0;
    X.inLine(x,y,xx,yy,68,t=>{if(shown++<5)blow(t,d,glass,a,1.3,{kb:.65,push:300});else hit(t,d,glass,{kb:.65,push:300,sx:x,sy:y});});
    tone('shing',.85,.35);X.sfx('boom',.5,.34);kick(.38,.045);
    if(evolve(id))after(.35,()=>{K.vsheet(x,y,xx,yy,{pal:copper,h:130,thick:40,dur:.47,heat:1.2});X.inLine(x,y,xx,yy,110,t=>hit(t,d*.55,copper));});
  });return true;
});
skill('gn_prism','분광 표식',6,8.4,2200,'세 표적의 흉갑 위에 조각 렌즈를 붙인다. 표식이 닫히면 동시에 발사한다.','최대 다섯 명에게 렌즈를 붙인다.',id=>{
  const list=targetList(1110).slice(0,evolve(id)?5:3);if(!list.length)return false;const d=power(id);X.face(X.angTo(list[0]));pose('draw',.52);
  for(const e of list)K.mark(e,'brand',{pal:glass,dur:.56,s:.55});
  paint(.55,(g,k)=>{for(const e of list){if(e.dead)continue;g.save();g.translate(e.x,body(e));g.scale(2.2,2.2);g.rotate((1-ease(k))*1.9);
    const r=mix(99,30,ease(k));for(let i=0;i<3;i++){g.rotate(tau/3);poly(g,[r,-19,r+32,-6,r+22,11,r-1,16,r+6,0],'#143a41');
      poly(g,[r,-19,r+32,-6,r+6,0],glass.s);poly(g,[r+6,0,r+32,-6,r+22,11,r-1,16],glass.b);
      line(g,r+5,2,r+21,-4,'#e5e5af',2.1);}g.restore();}});
  after(.54,()=>{let fired=false;
    for(const t of list){if(t.dead)continue;const a=X.angTo(t);
      if(!fired){fired=true;X.face(a);pose('release',.19);}
      tracer(muzzle(a,glass,170),chest(t),glass,44,{dur:.3});K.marked(t,'brand')?.pop({pw:1.1});blow(t,d,glass,a,1.2,{stun:.45,push:200},false);}
    if(fired){tone('shing',1.32,.29);X.sfx('boom',.6,.3);kick(.28,.03);}});return true;
});
skill('gn_slide','탄피 슬라이드',8,7.8,1680,'낮게 미끄러지며 길 위에 탄피를 흩뿌린다. 잠시 뒤 탄피가 차례로 터진다.','탄피 세 개가 더 넓게 폭발한다.',id=>{
  const e=X.nearest(1050);if(!e)return false;const a=X.angTo(e),x=pl.x,y=pl.gy,r=evolve(id)?208:138, dx=Math.cos(a)*440,dy=Math.sin(a)*365,d=power(id);
  X.face(a);pose('dash',.25);V.dash={x0:x,y0:y,x1:x+dx,y1:y+dy,t:0,dur:.19};X.sfx('whoosh',1.15,.38);kick(.1);
  if(F.on)K.trail(Array.from({length:8},(_,i)=>({x:x+dx*i/7,y:y+dy*i/7,z:BODY*.3})),{pal:copper,w:90,draw:.19,dur:.5,gain:.7});
  K.dust(x,y,{n:8,dir:fa(a)+Math.PI,spread:.8,sp:[200,620],a:.38});
  for(let i=0;i<3;i++){const k=i/2,xx=x+dx*k,yy=y+dy*k,at0=.17+i*.12;
    paint(at0,(g,q)=>{const blink=.55+.45*Math.sin(q*at0*38);g.translate(xx,yy);g.rotate(a+.7+i);g.globalAlpha=blink;
      poly(g,[-26,-9,18,-9,25,-4,25,9,-26,9],'#5f4534');poly(g,[-26,-9,18,-9,25,-4,-24,0],'#ffd98c');});
    after(at0,()=>{pop(xx,yy,r,copper);hurtArea(xx,yy,r,d*.61,copper,{push:200,up:600});X.sfx('boom',.5+i*.08,.36);kick(.18);});}
  return true;
});
skill('gn_mortar','궤도 박격',10,11,3020,'등 뒤로 발사한 신호탄이 적 무리 위에서 갈라져 고각 포탄 세 발을 떨어뜨린다.','탄착 지점이 다섯 곳으로 늘어난다.',id=>{
  const e=X.densest(1200);if(!e)return false;const x=e.x,y=e.y,list=targetList(1370).filter(t=>t!==e),n=evolve(id)?5:3;
  const a=X.angTo(e);X.face(a);pose('release',.27);const d=power(id),m=muzzleAt(a);
  // The signal round leaves upward behind the shoulder before the shells arrive.
  K.flare(m.x,m.y,m.z,{pal:copper,s:190,dur:.12,gain:3});X.sfx('whoosh',.7,.34);kick(.12);
  if(F.on)K.trail(Array.from({length:8},(_,i)=>({x:m.x-Math.cos(a)*i*34,y:m.y,z:m.z+i*150})),{pal:copper,w:34,draw:.16,dur:.5,gain:.9});
  for(let i=0;i<n;i++){const t=i?list[i-1]:e,xx=t?t.x:x+Math.cos(i*2.4)*174,yy=t?t.y:y+Math.sin(i*2.4)*92;
    after(.14+i*.105,()=>shell({x:xx-270,y:yy,z:520},point(xx,yy),150,copper,62,.42,()=>{pop(xx,yy,202,copper);
      K.cool(xx,yy,{kind:'crack2',r:250,pal:copper,life:1.6,hot:.6,light:0});
      hurtArea(xx,yy,202,d*.66,copper,{launch:400,push:220});X.sfx('boom',.53,.42);kick(.26,i?0:.04);}));}
  return true;
});

// Keep the enemies that were visible when the camera started moving. A close-in
// camera must never turn a full-field ultimate into a smaller attack.
function targets(){return new Set(X.onScreen(100));}
function strikes(cast,x,y,id,travel){
  for(const e of X.onScreen(100))cast.add(e);
  const list=[...cast].filter(e=>!e.dead);
  const extent=Math.max(1,...list.map(e=>Math.hypot(e.x-x,(e.y-y)/.76)));
  const d=39500*A.mul(id);
  V.blast={x,y,p:1};
  for(const [i,e] of list.entries()){const f=Math.hypot(e.x-x,(e.y-y)/.76)/extent;
    after(.008+travel*f,()=>{if(e.dead)return;
      if(i<8)K.sparks(e.x,e.y,BODY*.38,{pal:copper,n:3,dir:Math.atan2(e.y-y,e.x-x),spread:.55,sp:[210,700],up:380,life:[.13,.32]});
      K.marked(e,'brand')?.pop({pw:1.1,quiet:i>=8});
      X.dmg(e,e.d.boss?d:Math.max(d,e.hp*1.12),{crit:true,ult:true,big:true,kb:1.15,launch:850,sx:x,sy:y});});
  }
}
function peak(x,y,size,p){
  X.cine.peak(x,y-BODY*.2,{ca:.014,blur:.068,hold:.025,out:.19});
  X.cine.shake(.93);hitstop=Math.max(hitstop,.065);tone('hit',.76);pop(x,y,size,p,true);
}
function settle(delay,end){
  after(delay,()=>{X.cine.move({home:1,zoom:1,roll:0,tilt:0},.84,'io');GFX.ambient(1,1,1,2.5);});
  after(end,()=>X.ultStop());
}
function ult(id,name,lv,desc){sk[id]={cls:'gunner',type:'ult',name,lv,desc};}
ult('gn_ult1','영점 붕괴',1,'4배율 렌즈가 전장에 펼쳐진다. 조준점이 적을 포착하는 순간 한 발이 꽂히고, 탄착점에서 퍼지는 충격파가 화면 안의 적들을 덮친다.');
ult('gn_ult2','황혼 편대',5,'황동 비행함 세 척이 머리 위를 가로지르며 줄지어 포격한다. 기함이 마지막 포탄을 떨어뜨리면 전장이 폭풍에 휩싸인다.');
ult('gn_ult3','사건의 지평선',12,'세 겹의 자이로가 검은 중력핵을 압축한다. 핵에 궤도탄을 꽂아 양극의 제트를 뚫고 사방으로 파편을 흩뿌린다.');

const lensImage=document.createElement('canvas');lensImage.width=lensImage.height=320;
const lensCtx=lensImage.getContext('2d');
// Capture only the small piece of the *current* scene under the sight. Reading
// last frame's composited image here would recursively magnify the sight itself.
function focusGlass(g,x,y,r,power,alpha,seen){
  const m=g.getTransform(), px=m.a*x+m.c*y+m.e,py=m.b*x+m.d*y+m.f;
  const src=r*Math.hypot(m.a,m.b)/power;
  if(src<1)return;
  const n=lensImage.width;
  lensCtx.clearRect(0,0,n,n);
  if(V.glFloor&&F.gAlb?.ok){
    const tw=F.tile,th=tw*FSY, val=(v,w)=>v-Math.floor(v/w)*w;
    const world=r/power, k=n/(world*2), left=val(x-world-(V.ox||0),tw),top=val(y-world-(V.oy||0),th);
    for(let i=0;i<2;i++)for(let j=0;j<2;j++)lensCtx.drawImage(F.gAlb.im,(i*tw-left)*k,(j*th-top)*k,tw*k,th*k);
    lensCtx.fillStyle='rgba(3,21,26,.60)';lensCtx.fillRect(0,0,n,n);
  }
  lensCtx.drawImage(sc,px-src,py-src,src*2,src*2,0,0,n,n);
  if(power>1.7&&seen&&RPG.hub?.drawOpticTarget){
    const zoom=n*power/(2*r), reach=r/power+BODY;let shown=0;
    lensCtx.save();lensCtx.translate(n*.5,n*.5);lensCtx.scale(zoom,zoom);lensCtx.translate(-x,-y);
    for(const e of seen){
      if(e.dead||e.d.node||Math.hypot(e.x-x,e.y-BODY*.4-y)>reach)continue;
      RPG.hub.drawOpticTarget(lensCtx,e);if(++shown>=6)break;
    }
    lensCtx.restore();
  }
  g.save();g.translate(x,y);g.beginPath();g.arc(0,0,r,0,tau);g.clip();g.globalAlpha=alpha;
  g.drawImage(lensImage,-r,-r,r*2,r*2);
  const veil=g.createLinearGradient(-r,-r,r,r);veil.addColorStop(0,'rgba(184,245,218,.32)');veil.addColorStop(.29,'rgba(5,59,63,.06)');veil.addColorStop(.5,'rgba(4,42,43,.05)');veil.addColorStop(1,'rgba(20,115,108,.35)');g.fillStyle=veil;g.fillRect(-r,-r,r*2,r*2);
  g.restore();
}
function scope(g,x,y,r,opening,lockOn,fade,mag,seen){
  if(opening<=.001||fade<=0)return;
  const e=ease(opening),u=ease(lockOn),angle=-Math.PI/2;
  r*=.67+.33*e;
  focusGlass(g,x,y,r*.903,mag,fade*e*.93,seen);
  g.translate(x,y);g.scale(r,r);g.globalAlpha=fade;
  const metal=g.createLinearGradient(-.8,-.95,.8,.95);
  [[0,'#182b31'],[.16,'#aec4ae'],[.28,'#936b42'],[.40,'#171e22'],[.56,'#ad8d60'],[.7,'#304144'],[.89,'#b5bda5'],[1,'#332722']].forEach(([s,c])=>metal.addColorStop(s,c));
  const end=angle+tau*e;arc(g,1.019,angle,end,'#0b1d20',.089);arc(g,1.008,angle,end,metal,.058);
  arc(g,.956,angle,end,'#b79561',.012);arc(g,.915,angle,end,'#0d292c',.043);arc(g,.912,angle,end,'#a6d9c6',.008);
  const limit=Math.floor(72*e);
  for(let i=0;i<limit;i++){const a=angle+tau*i/72,len=i%6===0?.089:i%3===0?.048:.024;
    line(g,Math.cos(a)*(.892-len),Math.sin(a)*(.892-len),Math.cos(a)*.892,Math.sin(a)*.892,i%6===0?'#f2e3ac':'#a9c8bd',i%6===0?.009:.005);}
  for(let i=0;i<3;i++){const a=angle+i*tau/3+(.54-.54*u);
    arc(g,1.047,a,a+.48*e,metal,.039);
    if(e>.88){g.save();g.rotate(a+.23);poly(g,[.98,-.037,1.074,-.055,1.09,.042,.995,.035],'#806342');
      line(g,1.015,-.016,1.061,.013,'#e4cf9e',.008);g.restore();}}
  g.globalAlpha*=ease((opening-.23)/.65);
  // Long posts taper to a fine etched hair. The centre stays open over the target.
  for(let i=0;i<4;i++){g.save();g.rotate(i*tau/4);poly(g,[.915,-.017,.50,-.012,.40,0,.50,.012,.915,.017],'#152325');
    line(g,.085,0,.52,0,'#172831',.014);line(g,.088,-.004,.50,-.004,'#cce6cd',.0045);
    for(let j=1;j<=3;j++)line(g,.12*j,-.019,.12*j,.019,'#d2dcbd',.0065);g.restore();}
  g.strokeStyle=u>.92?'#ff985a':'#8be8d9';g.lineWidth=.010;
  const gate=mix(.22,.063,u);
  for(let i=0;i<4;i++){g.save();g.rotate(tau*i/4+Math.PI/4);g.beginPath();g.moveTo(gate+.026,-.029);g.lineTo(gate,0);g.lineTo(gate+.026,.029);g.stroke();g.restore();}
  g.fillStyle='#ffcc80';g.beginPath();g.arc(0,0,.008,0,tau);g.fill();
  g.fillStyle='#e4dfbb';g.textAlign='center';g.font='bold .117px monospace';g.fillText(mag.toFixed(1)+'×',0,.67);
}
// The shot takes a visible fraction of a second to traverse the field. The
// pressure cone and its helix travel with the dart, then the hot train cools.
function bore(a,b,r){
  const len=Math.hypot(b.x-a.x,b.y-a.y),dir=Math.atan2(b.y-a.y,b.x-a.x);
  if(len<1)return;
  paint(.57,(g,k,t)=>{g.translate(a.x,a.y);g.rotate(dir);const f=clamp01(t/.155), tip=len*f,fade=1-ease((t-.155)/.40);
    const w=Math.max(13,r*.043),tail=len*ease((t-.17)/.42);if(tip<=tail)return;
    const glow=g.createLinearGradient(tail,0,tip,0);glow.addColorStop(0,'rgba(69,159,163,0)');glow.addColorStop(.38,'rgba(76,170,169,.34)');glow.addColorStop(.88,'#c89156');glow.addColorStop(1,'#ffedb9');
    g.globalAlpha=fade;poly(g,[tail,0,tip*.88,-w*.70,tip,0,tip*.92,w*.70],glow);
    for(let j=0;j<3;j++){g.beginPath();const count=22;
      for(let i=0;i<=count;i++){const q=i/count, p=mix(tail,tip,q),rr=w*(.48+.74*Math.sin(q*Math.PI))*(1-t*.8), yy=Math.sin(p/Math.max(12,r*.057)-t*9+j*tau/3)*rr;if(i===0)g.moveTo(p,yy);else g.lineTo(p,yy);}
      g.strokeStyle=j===0?'#d1d9b8':j===1?'#62aeb0':'#a67454';g.lineWidth=j===0?w*.14:w*.095;g.stroke();}
    if(f<1){const l=Math.min(r*.28,tip),rr=w*1.58;poly(g,[tip-l,-rr,tip,0,tip-l,rr,tip-l*.60,0],'rgba(170,231,218,.65)');halo(g,tip,0,w*2.45,'#ffd58f',.81);}
  });
}
// The glass and graduated brass quadrants peel outward from the sight and
// land on separate floor arcs, preserving the sight's silhouette in the dust.
function shedLens(x,y,z,r){
  const blades=8;
  paint(2.25,(g,k,t)=>{const s=ease(t/.72), cool=ease((t-.61)/1.61),fling=Math.sin(Math.PI*clamp01(t/.72));
    for(let i=0;i<blades;i++){
      const a=i*tau/blades+.19,len=.37+(i%3)*.06,reach=r*(1+s*(.50+.10*Math.sin(i*2.3))), angle=a+s*(i%2?.08:-.075);
      g.save();g.translate(x+Math.cos(a)*s*r*.07,y-z*(1-s)-fling*r*(.13+.12*(i%3)));g.scale(1,mix(1,FSY,s));g.rotate(angle);
      const alpha=(1-cool)*(.91-.14*(i%2));g.globalAlpha=alpha;
      const tint=i%2?'#9ddfd4':'#d5ac70';arc(g,reach,0,len,'#233138',r*.054);arc(g,reach*.992,0,len,tint,r*.019);
      arc(g,reach*.962,0,len*.74,'#aab9a8',r*.008);
      for(let j=0;j<4;j++){const u=.034+j*.080,rr=reach-r*(j%2?.060:.085);
        line(g,Math.cos(u)*rr,Math.sin(u)*rr,Math.cos(u)*reach,Math.sin(u)*reach,tint,r*.007);}
      g.restore();}
  });
}
// The sight scans the field edge to edge, then comes to rest on the dead centre of the view.
// Corners are in half-view units around that centre; x is mirrored with the hero's facing.
const scanPath=[[-.80,-.52],[.80,-.50],[.78,.50],[-.75,.52],[0,0]];
function scanAt(q){
  const i=Math.min(3,Math.floor(q)),u=q-i,P=j=>scanPath[Math.max(0,Math.min(4,j))];
  const a=P(i-1),b=P(i),c=P(i+1),d=P(i+2),u2=u*u,u3=u2*u;
  const f=k=>.5*(2*b[k]+(c[k]-a[k])*u+(2*a[k]-5*b[k]+4*c[k]-d[k])*u2+(3*b[k]-a[k]-3*c[k]+d[k])*u3);
  return [f(0),f(1)];
}
// The sight is burnt into the floor as a ring and four hairs running out to the edges of the view.
function floorSight(x,y,r,hw,hh,p,life,hot){
  K.cool(x,y,{kind:'ring',r,pal:p,life,hot,grow:.2,light:0});
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])
    K.coolLine(x+dx*r*.3,y+dy*r*.3*FSY,x+dx*hw*1.05,y+dy*hh*1.05,{pal:p,w:r*.085,life,hot,grow:.22,light:0,shed:0});
}
function zero(id){
  begin(id);const cast=targets(), {hw,hh}=X.view(), m=Math.min(hw,hh), side=pl.f||1;
  // (cx,cy) is the screen centre once the camera parks; the round lands on the floor just under it.
  const cx=pl.x+side*hw*.32, cy=pl.gy-BODY*.5-hh*.06, y=cy+BODY*.45, r=m*.65;
  const source=point(pl.x,pl.gy), a=Math.atan2(y-source.y,cx-source.x);
  const sweepAt=.3, lockAt=1.86, fireAt0=2.34, hitAt=fireAt0+.16;
  const lens=t=>{const u=clamp01((t-sweepAt)/(lockAt-sweepAt)), [sx,sy]=scanAt(4*mix(ease(u),1-(1-u)**3,.6));
    const rest=Math.max(0,t-lockAt), wobble=Math.exp(-rest*9)*Math.sin(rest*26)*.012;
    return point(cx+side*sx*hw*.9+wobble*hw,cy+sy*hh*.8);};
  X.face(a);pose('draw',fireAt0+.15);GFX.ambient(.61,.78,.79,3);tone('shing',1.24,.31);
  X.cine.move({x:cx,y:cy,zoom:.94,roll:0,tilt:0},.6,'io');
  const tagged=new Set();let lastTick=-9;
  paint(fireAt0+.32,(g,k,t)=>{const q=lens(t), lock=clamp01((t-lockAt)/.36), release=ease((t-fireAt0-.09)/.22);
    const size=m*mix(.40,.54,ease(lock)), mag=mix(1+1.4*ease(t/.5),4,ease(lock));
    // Whatever the sight passes over while scanning is branded; the shockwave sets the brands off.
    if(t>sweepAt&&t<lockAt&&tagged.size<12)for(const e of cast){
      if(tagged.has(e)||e.dead||Math.hypot(e.x-q.x,body(e)-q.y)>size*.36)continue;
      tagged.add(e);K.mark(e,'brand',{pal:glass,dur:hitAt-t+.75,s:.7});
      if(t-lastTick>.07){lastTick=t;tone('tick',.9+tagged.size*.05,.12);}
    }
    scope(g,q.x,q.y,size*(1+release*.21),clamp01(t/.5),lock,1-release,mag,cast);});
  after(lockAt,()=>{X.cine.move({zoom:1.05},.45,'io');floorSight(cx,y,r*.92,hw,hh,glass,hitAt-lockAt+.5,.9);GFX.light(cx,y,r*.86,glass.l,.62,.32,{z:BODY*.5});
    if(!window.RangedHero?.cue?.('lock',{pan:0,gain:.65,rate:1}))tone('tick',1.44,.22);});
  after(lockAt+.2,()=>tone('inhale',.26,.15));
  after(fireAt0-.16,()=>X.cine.hush(.16,{a:.55,c:glass.l}));
  after(fireAt0,()=>{pose('release',.3);const o=origin(a), mz=muzzleAt(a);bore(o,point(cx,cy),r);
    K.flare(mz.x,mz.y,mz.z,{pal:copper,s:360,sx:1.8,sy:.6,dur:.14,gain:3});
    K.dust(pl.x,pl.gy,{n:10,dir:fa(a)+Math.PI,spread:.7,sp:[320,900],a:.42});kick(.4);
    if(!window.RangedHero?.cue?.('breach',{pan:Math.max(-.6,Math.min(.6,(cx-pl.x)/hw)),gain:.88,rate:1}))X.sfx('thunder',.44);
    K.coolLine(source.x,source.y,cx,y,{pal:copper,w:70,life:2.2,hot:.48});});
  after(hitAt,()=>{X.cine.move({x:mix(source.x,cx,.7),y:mix(source.y,cy,.8),zoom:.88,tilt:.055,roll:0},.27,'io');
    shedLens(cx,y,y-cy,r);peak(cx,y,r*.62,copper);
    const fd=Math.atan2((y-source.y)/FSY,cx-source.x);
    for(const dirSide of [-1,1]){
      const dir=fd+dirSide*1.25;
      K.vjet(cx,y,20,dir,{pal:glass,len:r*(dirSide<0?1.12:1.38),r:r*.112,pitch:.20,turb:.82,heat:.72,dur:.53,in:.044,out:.33,gain:.70});
      K.sparks(cx,y,38,{pal:copper,n:9,dir,spread:.26,sp:[r*.84,r*2.25],up:r*.62,life:[.24,.65]});
    }
    K.flare(cx,y,y-cy,{s:r*1.21,sx:1.7,sy:.21,dur:.19,pal:glass,gain:1.7});K.flare(cx,y,y-cy,{s:r*.79,sx:.32,sy:1.17,dur:.14,pal:copper,gain:1.35});
    K.vring(cx,y,{r:Math.hypot(hw,hh/FSY)*1.22,r0:r*.27,dur:.87,heat:.82,pal:copper,tube:.045,smoke:.30});
    K.cool(cx,y,{kind:'crack2',r:r*1.5,pal:copper,life:3.4,hot:.6,light:0});floorSight(cx,y,r*.98,hw,hh,copper,3.6,.7);
    K.chunks(cx,y,{pal:copper,n:7,rock:'#4b4137',r:r*.27,sp:[r*.6,r*1.2],up:1380,s:[18,36]});strikes(cast,cx,y,id,.57);
  });settle(hitAt+.81,hitAt+2.14);
}

// The hull is a Blender render. Parallax, cast shadows, contrails, formation,
// descent and ordnance still move independently in the actual battlefield.
function craft(g,x,y,w,bank,t,roll){
  g.save();g.translate(x,y);g.rotate(bank);
  const exhaustBank=Math.sin(roll*Math.PI/180);
  for(let i=-1;i<=1;i+=2){g.save();g.translate(w*(i<0?-.378:-.349),w*((i<0?-.034:.071)+i*exhaustBank*.075));
    const l=w*(.49+.08*Math.sin(t*15+i));
    const f=g.createLinearGradient(-l,0,0,0);f.addColorStop(0,'rgba(83,187,191,0)');f.addColorStop(.58,'rgba(43,161,169,.16)');f.addColorStop(.88,'rgba(120,218,213,.70)');f.addColorStop(1,'#fff1bb');
    g.fillStyle=f;g.beginPath();g.moveTo(0,-w*.032);g.quadraticCurveTo(-l*.56,-w*.018,-l,w*.013);g.quadraticCurveTo(-l*.58,w*.048,0,w*.037);g.fill();g.restore();}
  if(ship.complete&&ship.naturalWidth){
    const idx=Math.min(4,Math.max(0,Math.round(roll/12)+2)), pose=bankPoses[idx].image;
    const img=pose.complete&&pose.naturalWidth?pose:ship;
    const h=w*560/760;g.drawImage(img,-w*375/760,-h*310/560,w,h);
  }else{
    poly(g,[-.49*w,-.23*w,-.10*w,-.15*w,.47*w,-.08*w,.24*w,.028*w,-.40*w,.25*w,-.24*w,.044*w,-.45*w,.03*w],'#293237');
    poly(g,[-.40*w,.20*w,.38*w,-.08*w,-.075*w,.05*w],'#dcb775');poly(g,[-.45*w,-.21*w,.38*w,-.08*w,-.14*w,-.11*w],'#b89662');
    line(g,-.24*w,.01*w,.15*w,-.045*w,'#72c6ca',.021*w);
  }
  g.restore();
}
function fleet(id){
  begin(id);const cast=targets(), {hw,hh}=X.view(),x0=pl.x,y0=pl.gy;
  const cameraY=y0-BODY*.58, finalX=x0+hw*.11,finalY=y0+hh*.16;
  X.face(.12);pose('draw',.44);GFX.ambient(.74,.67,.60,2.4);
  X.cine.move({x:x0+hw*.07,y:cameraY-hh*.02,zoom:.88,tilt:.065,roll:-.018},.72,'io');
  X.sfx('whoosh',.73,.34);tone('gong',.34);
  const fleetSize=Math.min(hw*1.1,hh*1.34);
  const ships=[
    {start:.09,dur:2.20,w:fleetSize*.49,dy:-.40,z:.26,drift:-.14},
    {start:.42,dur:2.33,w:fleetSize*.60,dy:.17,z:.43,drift:-.24},
    {start:.70,dur:2.52,w:fleetSize,dy:.49,z:.61,drift:-.31}
  ];
  function fly(s,t){const k=clamp01((t-s.start)/s.dur);
    return {x:x0+hw*mix(-1.58,1.68,k),floor:cameraY+hh*(s.dy+s.drift*k+.07*Math.sin(k*Math.PI*1.4)),alt:hh*s.z*(.89+.13*Math.sin(k*Math.PI)),k};}
  paint(3.26,(g,k,t)=>{for(const s of ships){if(t<s.start||t>s.start+s.dur)continue;const q=fly(s,t);
    g.save();g.translate(q.x+s.w*.20,q.floor);g.rotate(-.11);g.scale(1,.48);
    const sh=g.createRadialGradient(0,0,0,0,0,s.w*.52);sh.addColorStop(0,'rgba(2,8,12,.70)');sh.addColorStop(.53,'rgba(2,8,12,.45)');sh.addColorStop(1,'rgba(8,11,15,0)');g.fillStyle=sh;g.fillRect(-s.w*.54,-s.w*.53,s.w*1.08,s.w*1.06);
    poly(g,[s.w*.48,-s.w*.11,-s.w*.35,s.w*.42,-s.w*.27,s.w*.04,-s.w*.46,-s.w*.24,-s.w*.065,-s.w*.16],'rgba(1,7,11,.30)');g.restore();}
    for(let j=0;j<ships.length;j++){const s=ships[j];if(t<s.start||t>s.start+s.dur)continue;const q=fly(s,t),bank=-.04+.08*Math.sin(q.k*tau+1),roll=23.8*Math.sin(q.k*tau*1.2+j*.84);
      craft(g,q.x,q.floor-q.alt,s.w*(.91+.11*Math.sin(q.k*Math.PI)),bank,t,roll);}
  });
  for(let j=0;j<3;j++){const s=ships[j],n=j===2?3:2;
    for(let i=0;i<n;i++){const drop=s.start+s.dur*(.29+i*(n===2?.34:.18)), q=fly(s,drop),xx=q.x+hw*.20,yy=q.floor+hh*(.18+.075*i);
      after(drop,()=>{const bay={x:q.x,y:q.floor,z:q.alt};
        K.flare(q.x,q.floor,q.alt,{s:s.w*.12,dur:.11,pal:copper,gain:1.5});
        shell(bay,point(xx,yy),s.w*.085,copper,Math.max(25,s.w*.061),.42,()=>{
        const rr=hh*(j===2?.29:.225);pop(xx,yy,rr,copper);hurtArea(xx,yy,rr,2400*A.mul(id),copper,{ult:true,big:true,launch:400});
        if(j===2){X.cine.shake(.19);K.vsmoke(xx,yy,{s:rr*.58,z:rr*.40,dur:1,rise:rr*.95,vx:rr*.28,a:.5});}X.sfx('boom',.6,.35);
      });});
    }
  }
  const flagship=ships[2],drop=flagship.start+flagship.dur*.53, q=fly(flagship,drop);
  after(drop,()=>{tone('inhale',.54,.24);shell({x:q.x,y:q.floor,z:q.alt},point(finalX,finalY),hh*.42,copper,hh*.073,.94,()=>{
    peak(finalX,finalY,hh*.84,copper);K.vcolumn(finalX,finalY,{r:hh*.18,h:hh*.95,pal:copper,dur:.92,rise:.13,out:.5,twist:1.4,turb:.9});
    K.vring(finalX,finalY,{r:Math.hypot(hw,hh/FSY)*1.26,dur:.77,heat:.65,tube:.039,pal:copper,smoke:.37});
    strikes(cast,finalX,finalY,id,.50);X.cine.move({x:x0,y:cameraY,zoom:.85,tilt:.022,roll:0},.29,'io');
  });});settle(3.62,4.82);
}

// The armillary is built out of extruded bands. Each face is projected and
// depth-sorted so the accretion disc and the axle pass behind the black core.
function orbitVertex(angle,tilt,yaw,r){
  const c=Math.cos(angle)*r, s=Math.sin(angle)*r*Math.cos(tilt), d=Math.sin(angle)*r*Math.sin(tilt);
  return [c*Math.cos(yaw)-s*Math.sin(yaw),c*Math.sin(yaw)+s*Math.cos(yaw),d];
}
function armillary(g,x,y,r,t,collapse){
  if(r<1)return;g.translate(x,y);g.scale(r,r);
  const sides=low()?30:48, planes=[
    [1.18,.94+.15*Math.sin(t*.84),t*.56-.6],
    [.99,1.26+.16*Math.sin(t*.91),-t*.75+.74],
    [.88,.71+.24*Math.sin(t*.57),.25+t*.92]
  ], faces=[];
  for(const [j,[rad,tilt,yaw]] of planes.entries()){
    for(let i=0;i<sides;i++){
      const lo=i*tau/sides+.24*t*(j%2?-1:1),hi=lo+tau/sides*.97, rj=rad*(1-collapse*.34);
      const a=orbitVertex(lo,tilt,yaw,rj),b=orbitVertex(hi,tilt,yaw,rj),c=orbitVertex(hi,tilt,yaw,rj-.064),d=orbitVertex(lo,tilt,yaw,rj-.064);
      const light=(Math.cos(lo+yaw+.38)+1)*.5, shade=Math.round(21+light*36+(i%4===0?7:0));
      faces.push({pts:[a,b,c,d],z:(a[2]+b[2])*.5,col:'hsl('+ (j===1?172:34)+' '+(j===1?18:37)+'% '+shade+'%)',edge:i%4===0?'#ddc78e':j===1?'#77b6a7':'#b08d65'});
    }
  }
  const band=f=>{const [a,b,c,d]=f.pts;
    poly(g,[a[0],a[1],b[0],b[1],b[0],b[1]+.025,a[0],a[1]+.025],'#252229');
    poly(g,[a[0],a[1],b[0],b[1],c[0],c[1],d[0],d[1]],f.col);
    line(g,a[0],a[1],b[0],b[1],f.edge,.010);
  };
  faces.sort((a,b)=>a.z-b.z);let front=faces.findIndex(f=>f.z>=0);if(front<0)front=faces.length;
  for(let i=0;i<front;i++)band(faces[i]);
  const core=.44+.08*collapse;
  if(discAtlas.complete&&discAtlas.naturalWidth){
    const frame=Math.floor(t*12)%12,s=2.22*(1+.14*collapse);
    g.save();g.rotate(-.25+.08*Math.sin(t*.9));g.drawImage(discAtlas,frame%4*400,Math.floor(frame/4)*260,400,260,-s/2,-s*.325,s,s*.65);g.restore();
    for(let i=front;i<faces.length;i++)band(faces[i]);
    return;
  }
  halo(g,0,0,.85,'#e38255',.36);
  g.fillStyle='#110f1b';g.beginPath();g.arc(0,0,core,0,tau);g.fill();
  const photon=g.createLinearGradient(-core,-core,core,core);
  photon.addColorStop(0,'#ffdd87');photon.addColorStop(.27,'#e38d51');photon.addColorStop(.55,'#563043');photon.addColorStop(1,'#a78fb1');
  arc(g,core+.015,0,tau,photon,.037);arc(g,core+.055,t*.25,t*.25+tau*.72,'#985b57',.009);
  g.save();g.rotate(-.23+.1*Math.sin(t));
  // Light from the far side bends over the upper lip, then disappears behind the horizon.
  for(let i=0;i<7;i++){const b=.21+i*.023;g.strokeStyle=i%2?'#df9567':'#8d545b';g.lineWidth=i===3?.016:.007;
    g.beginPath();g.moveTo(-.80-i*.024,b*.21);g.bezierCurveTo(-.43,-b*.11,-.47,-core-.22+i*.016,-.01,-core-.18+i*.016);
    g.bezierCurveTo(.40,-core-.20+i*.014,.42,-b*.02,.86+i*.016,0);g.stroke();}
  const stream=g.createLinearGradient(-1,0,1,0);stream.addColorStop(0,'#643948');stream.addColorStop(.23,'#e99767');stream.addColorStop(.38,'#ffedb0');stream.addColorStop(.66,'#b86a57');stream.addColorStop(1,'#4c3249');
  for(let i=0;i<9;i++){g.strokeStyle=stream;g.lineWidth=i===4?.023:.0065;g.beginPath();g.ellipse(0,0,.79+i*.029,.078+i*.012,0,-.12,Math.PI+.09);g.stroke();}
  g.restore();for(let i=front;i<faces.length;i++)band(faces[i]);
}
function horizon(id){
  begin(id);const cast=targets(),{hw,hh}=X.view(),x=pl.x+pl.f*Math.min(hw*.21,hh*.39),y=pl.gy-hh*.19,alt=hh*.20,r=Math.min(hw,hh)*.47;
  const a=Math.atan2(y-pl.gy,x-pl.x);X.face(a);pose('draw',2.54);GFX.ambient(.65,.61,.73,2.3);
  X.cine.move({x:mix(pl.x,x,.59),y:y-alt*.55,zoom:1.10,tilt:.035,roll:0},1.22,'io');tone('gong',.48);tone('inhale',1.88,.30);
  GFX.light(x,y,r*3.5,violet.l,.55,.42,{hold:2.0,z:alt});
  paint(2.65,(g,k,t)=>{const inT=ease(t/.56), contract=ease((t-1.95)/.40),recoil=ease((t-2.45)/.20);
    const sz=r*inT*(1+.12*ease((t-.4)/1.35)-.60*contract)*(1-recoil);
    g.globalAlpha=1-recoil;armillary(g,x,y-alt-.04*r*Math.sin(t*2.8),sz,t+contract*.63,contract);});
  paint(2.38,(g,k,t)=>{g.translate(x,y-alt);g.rotate(-.21);g.globalAlpha=ease(t/.55)*(1-ease((t-2.0)/.38));
    const spiral=(arm,u)=>{const span=r*(.50+3.35*(1-u)**1.45),a=arm+t*.51+u*u*2.82;
      return point(Math.cos(a)*span,Math.sin(a)*span*.47+r*.14*(1-u));};
    for(let j=0;j<3;j++){const arm=j*2.16+.4,start=(t*.48+j*.26)%1;
      for(let n=0;n<17;n++){const v0=n/17,v1=(n+1)/17,u0=mix(start*.14,.97,v0),u1=mix(start*.14,.97,v1),p=spiral(arm,u0),q=spiral(arm,u1);
        const filament=.09+.40*(1+Math.sin((u0-start)*7))*.5;
        line(g,p.x,p.y,q.x,q.y,hexA(j===1?'#b38baf':'#dd9f66',filament*Math.sin(Math.PI*v1)),r*(.004+.012*v1));
      }
      const a=spiral(arm,start),b=spiral(arm,Math.min(1,start+.036));
      line(g,a.x,a.y,b.x,b.y,hexA('#ffe0a2',Math.sin(Math.PI*start)*.84),r*.013);
    }
    const n=low()?14:25;for(let i=0;i<n;i++){const u=(t*(.54+i%3*.05)+i*.618)%1;
      const p=(1-u)**1.6, rad=r*(1.05+2.1*p),a=i*2.4+u*u*2.7;
      const xx=Math.cos(a)*rad,yy=Math.sin(a)*rad*.51,prev=a-.085*u;
      line(g,Math.cos(prev)*(rad+r*.10),Math.sin(prev)*(rad+r*.1)*.51,xx,yy,hexA(i%3?'#e2ae89':'#a6dacf',Math.sin(Math.PI*u)*.74),r*(i%5===0?.012:.006));
    }});
  after(1.88,()=>{X.cine.move({x:x,y:y-alt*.74,zoom:1.16,tilt:.055,roll:0},.38,'io');tone('tick',.6,.22);});
  after(2.37,()=>{pose('release',.3);streak(origin(a),point(x,y-alt),glass,32,.19);tone('shing',.65,.34);});
  after(2.47,()=>{X.cine.move({x:mix(pl.x,x,.4),y:y-alt*.3,zoom:.85,tilt:.02,roll:0},.29,'io');
    const jetAngle=-.32, length=Math.hypot(hw,hh)*1.60;
    for(const sign of [-1,1]){const end=point(x+sign*Math.cos(jetAngle)*length,y-alt+sign*Math.sin(jetAngle)*length);
      if(F.on)K.ray(x,y,alt,fa(sign>0?jetAngle:jetAngle+Math.PI),{len:fl(jetAngle,length),w:r*.19,dur:.34,grow:.1,out:.3,pal:sign>0?copper:violet,scar:0});
      else streak(point(x,y-alt),end,copper,r*.23,.55);
      K.coolLine(x,y,end.x,end.y+alt,{pal:violet,w:r*.21,life:3.3,hot:.65,light:0});
    }peak(x,y,r*1.26,violet);K.shock(x,y,{r:Math.hypot(hw,hh/FSY)*1.12,dur:.79,pal:violet,dust:7,gain:.76});
    // The brass rings break into curved slivers. Rotation and gravity differ for each fragment.
    paint(1.56,(g,k)=>{for(let i=0;i<(low()?9:15);i++){const a=i*2.399,spread=r*(.31+2.3*k)*(1+.3*Math.sin(i));g.save();
      g.translate(x+Math.cos(a)*spread,y-alt+Math.sin(a)*spread*.58-r*.74*Math.sin(k*Math.PI)+r*.48*k*k);g.rotate(a+k*(i%2?4:-3));g.globalAlpha=(1-k)**.74;
      const s=r*(.09+.043*Math.cos(i*3));poly(g,[-s,0,-s*.45,-s*.24,s*.92,-s*.38,s*.51,-s*.09,-s*.34,s*.15],i%3?'#d7b383':'#8ec0b5');g.restore();}});
    strikes(cast,x,y,id,.49);
  });settle(3.34,4.62);
}

X.reg('gunner',{sk,preload,order:['gn_basic',...Object.keys(skills),'gn_ult1','gn_ult2','gn_ult3'],
  basic:{fn:basic,cd:()=>.61*(1-.04*(A.sLv('gn_basic')-1))},skills,
  ults:{gn_ult1:zero,gn_ult2:fleet,gn_ult3:horizon}});
if(pl.cls==='gunner')preload();
})();
