(function(){
'use strict';
const data=new Map();
function register(no,kind,map){ if(!data.has(no)) data.set(no,{}); data.get(no)[kind]=map; }
function read(no,kind){ return data.get(no)?.[kind]; }
function number(zone){ return RPG.hub.ZONES[zone]?.no??0; }
const point=([x,y],ox=0,oy=0)=>({x:ox+x*100,y:oy+y*100});
function streets(sites,paths,width){
  return paths.flatMap((path,i)=>{
    const stops=path.split(' ');
    return stops.slice(1).map((id,k)=>{
      const a=sites[stops[k]],b=sites[id];
      return [a.x,a.y,b.x,b.y,width(i)];
    });
  });
}
function field(no,x,y){
  const f=read(no,'field'),b=read(no,'boss');
  const sites=Object.fromEntries(Object.entries(f.sites).map(([k,v])=>[k,point(v,x,y)]));
  const [left,right,top,bottom]=f.extent;
  const arena={...point(b.center,x,y),r:100*b.radius,design:b};
  const nodes=['A','B','C'].map((k,index)=>({...sites[k],index,label:f.stations[index],mode:f.mode,e:null,done:false,awake:false,wave:2,progress:0}));
  const shelters=['M','K'].map((k,i)=>({...sites[k],kind:i?'keepRest':'middle',id:i?'keepRest':'middle',label:f.shelters[i],r:i?530:555}));
  const roads=streets(sites,f.paths,i=>i===0?730:i===1?585:480);
  // The foot entrance is opposite the first objective; pave the route into the original safe camp.
  const entrySide=sites.A.x<x?1:-1;
  const entryX=x+entrySide*Math.min(3500,(right-left)*36);
  roads.push([x,y,entryX,y+bottom*100-100,520]);
  roads.push([sites.G.x,sites.G.y,arena.x,arena.y+radius(arena,Math.PI/2)*.58,580]);
  const terrain=f.terrain.map(([px,py,rx,ry])=>({...point([px,py],x,y),rx:rx*100,ry:ry*100}));
  return {no,sites,design:f,B:{l:x+left*100,r:x+right*100,t:y+top*100,b:y+bottom*100},arena,nodes,shelters,roads,terrain};
}
// Radius of an authored elliptical or convex regular room along a floor-space ray.
function radius(a,angle){
  const d=a.design;
  if(!d) return a.r;
  const ux=Math.cos(angle)/d.aspect,uy=Math.sin(angle);
  let r=a.r/Math.hypot(ux,uy);
  if(d.sides){
    const step=2*Math.PI/d.sides,rotation=d.rotation*Math.PI/180;
    const sector=((Math.atan2(uy,ux)-rotation)%step+step)%step-step/2;
    r*=Math.cos(step/2)/Math.cos(sector);
  }
  return r;
}
// Distances here are in the unsquashed floor plane, centred on the room.
function insideArena(a,x,y,margin=0){
  return Math.hypot(x,y)<=radius(a,Math.atan2(y,x))-margin;
}
function rayReach(a,x,y,angle,margin=0){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  let lo=0,hi=4*a.r*Math.max(1,a.design?.aspect||1);
  if(!insideArena(a,x,y,margin)){
    // Near a wall, a charge aimed outwards has no runway. Inward rays can still cross the room.
    let found=false;
    for(let d=16;d<hi;d+=32){
      if(insideArena(a,x+dx*d,y+dy*d,margin)){lo=d;found=true;break;}
    }
    if(!found) return 0;
  }
  for(let i=0;i<18;i++){
    const mid=(lo+hi)/2;
    if(insideArena(a,x+dx*mid,y+dy*mid,margin)) lo=mid;else hi=mid;
  }
  return lo;
}
// Detect a transition through an actual wall even if a dash crosses its full thickness in one tick.
function blockedCrossing(a,x0,y0,x1,y1,gateOpen){
  const length=Math.hypot(x1-x0,y1-y0);
  if(!length||Math.abs(Math.hypot(x0,y0)-radius(a,Math.atan2(y0,x0)))>length*2.5+2) return false;
  const count=Math.ceil(length/40);
  let inside=insideArena(a,x0,y0);
  for(let i=1;i<=count;i++){
    const x=x0+(x1-x0)*i/count,y=y0+(y1-y0)*i/count,next=insideArena(a,x,y);
    if(next!==inside&&(!gateOpen||Math.abs(Math.atan2(y,x)-Math.PI/2)>=.32)) return true;
    inside=next;
  }
  return false;
}
function village(no,zone,count,accent){
  const v=read(no,'village'), sites=Object.fromEntries(Object.entries(v.sites).map(([k,p])=>[k,point(p)]));
  const st=streets(sites,v.streets,i=>i===0?235:165);
  const spot=(id,k,art,act,label)=>({id,kind:'npc',art,...sites[k],r:185,act,label,light:'warm'});
  const spots=[spot('q_camp','C','npc_resident','quest:camp','마을 주민'),spot('q_neighbor','H','npc_archive','side:resident','이웃 주민'),
    spot('q_service','S','npc_forge','win:shop','상점 · 정비'),
    {id:'portal_town',kind:'portal',art:'b_portal_base',...sites.P,r:245,h:400,label:'관문 · 빠른 이동',act:'portal:warp'}];
  const labels=v.stations.map(([site,label])=>({id:'regional_'+site,kind:'mark',...sites[site],r:185,label,act:'regional:'+site}));
  const props=v.landmarks.map(([i,x,y,h])=>({...point([x,y]),h:h*100,img:'assets/dun/z'+(no||6)+'_'+i+'.webp'}));
  for(const [site,pieces] of Object.entries(v.courtyards)){
    const origin=sites[site];
    for(const [image,dx,dy,h] of pieces){
      const p={x:origin.x+dx,y:origin.y+dy,h};
      if(typeof image==='string') p.art=image;
      else{
        p.img='assets/dun/z'+(no||6)+'_'+image+'.webp';
        // Fixed ground contact stays stable while the image streams in.
        p.base=h*.22;
      }
      props.push(p);
    }
  }
  const entry=(k,exit,dir)=>({exit,...sites[k],dir,r:190});
  const roads=[entry('I','in',[-1,0]),entry('F','field',[1,0])];
  const stationRoad=st.find(r=>(r[2]===sites.F.x&&r[3]===sites.F.y)||(r[0]===sites.F.x&&r[1]===sites.F.y));
  const opposite=stationRoad[0]===sites.F.x&&stationRoad[1]===sites.F.y?stationRoad.slice(2,4):stationRoad.slice(0,2);
  const dx=opposite[0]-sites.F.x,dy=opposite[1]-sites.F.y,len=Math.hypot(dx,dy);
  const returnGate={exit:'return',x:sites.F.x+dx/len*530,y:sites.F.y+dy/len*530,dir:[-dy/len,dx/len],r:105};
  if(zone+1<count) roads.push(entry('N','next',[0,1]));
  return {id:'village',zone,no,name:v.name,w:v.size[0]*100,h:v.size[1]*100,solid:true,fence:false,
    start:{x:sites.I.x+260,y:sites.I.y},accent,floor:'assets/menu/f_z'+no+'.webp',floorScale:.85,
    props,spots:spots.concat(labels),roads,returnGate,streets:st,plazas:['C','H','S'].map(k=>[sites[k].x,sites[k].y,490,280]),
    warp:{x:sites.P.x,y:sites.P.y+155}};
}
const VILLAGE_ORDER={find:['A'],sequence:['A','B','D'],carry:['A','B'],quorum:['A','D','B'],irrigate:['A','D'],
  weigh:['A','D'],cross:['A','B'],isolate:['A','D','B']};
function villageNext(mode,seen){
  const order=VILLAGE_ORDER[mode];
  if((mode==='quorum'||mode==='isolate')&&(!seen.includes('A')||!seen.includes('D'))) return order.slice(0,2).filter(k=>!seen.includes(k));
  const next=order.find(id=>!seen.includes(id));
  return next?[next]:[];
}
function records(zone){
  const s=PF.save.data.story;
  return s.localWork?.[number(zone)]||[];
}
function villageObjective(zone){
  const no=number(zone),v=read(no,'village'),s=PF.save.data.story;
  if(!v||s.cleared>zone) return null;
  const next=villageNext(v.mode,records(zone))[0]; if(!next) return null;
  const waiting=v.mode==='irrigate'&&next==='D'&&lastRoom?.zone===zone&&dwell>0;
  const text=waiting?'아랫둑 수문에 물이 차는 중 · '+Math.min(100,Math.floor(dwell/2.5*10)*10)+'%':v.task;
  return {...point(v.sites[next]),label:v.stations.find(([k])=>k===next)[1],text};
}
function completeStation(zone,k,auto=false){
  const s=PF.save.data.story,no=number(zone),v=read(no,'village'),seen=records(zone);
  if(s.cleared>zone||!villageNext(v.mode,seen).length){ if(!auto) RPG.api.toast(v.finish); return; }
  const next=villageNext(v.mode,seen);
  if(!next.includes(k)){ if(!auto) RPG.api.toast(v.mode==='find'?'이곳에는 그 사람이 남긴 제비함이 없다.':v.task); return; }
  if(v.mode==='irrigate'&&k==='D'&&!auto){RPG.api.toast('물길 옆에서 잠시 기다리세요.');return;}
  const added=seen.concat(k);
  (s.localWork||(s.localWork={}))[no]=added; PF.save.commit();
  RPG.api.toast(villageNext(v.mode,added).length?(v.mode==='weigh'?'장부에 찍힌 추는 두 개다.':v.task):v.finish);
}
let dwell=0,lastRoom=null;
function villageTick(dt){
  const room=PF.room.cur;
  if(room!==lastRoom){dwell=0;lastRoom=room;}
  if(room?.id!=='village'||RPG.paused||PF.story?.inConversation?.()||PF.story?.cur||PF.win?.cur) return;
  const obj=villageObjective(room.zone),mode=read(room.no,'village').mode;
  if(!obj||!records(room.zone).length||!['cross','irrigate'].includes(mode)) return;
  const station=room.spots.find(s=>s.x===obj.x&&s.y===obj.y);
  if(!station||Math.hypot(pl.x-obj.x,pl.gy-obj.y)>station.r){dwell=0;return;}
  dwell+=dt;
  if(dwell>=(mode==='cross'?.12:2.5)){completeStation(room.zone,mode==='cross'?'B':'D',true);dwell=0;}
}
function activeNodes(M){
  const live=M.nodes.filter(n=>!n.done);
  if(!live.length) return [];
  switch(live[0].mode){
    case 'assault': case 'duel': return live;
    case 'witness': return live[0].index<2?live.filter(n=>n.index<2):live;
    default:return [live[0]];
  }
}
function modeOf(n){
  if(n.mode==='isolate') return ['assault','restore','calibrate'][n.index];
  return n.mode;
}
const fieldText={
  assault:'길을 막는 송신기를 공격해 대피 종을 울리세요.',
  calibrate:'발광 띠에 머물러 눈금이 맞을 때까지 코일을 조율하세요.',
  relay:'봉인 기록을 직접 운반해 다음 인계함에 대세요.',
  witness:'두 증언석을 어떤 순서로든 읽고 공개 속기대에 모으세요.',
  restore:'수문 가까이에서 흐름이 회복될 때까지 자리를 지키세요.',
  freight:'계량을 마치고 보급 상자를 열어 하역대에 화물을 넘기세요.',
  duel:'표식 가까이에서 도전자를 불러 일대일로 제압하세요.'
};
function targetFor(M,n){
  if(n.mode==='freight'&&n.index===1&&!M.chests.some(c=>c.open)){
    let best=null,dist=Infinity;
    for(const c of M.chests){const d=Math.hypot(c.x-n.x,c.y-n.y);if(d<dist){best=c;dist=d;}}
    if(best) return {...best,label:'미개봉 화물 상자',text:'지도에 표시된 보급 상자를 열어 화물을 확보하세요.'};
  }
  const local={
    isolate:['격리 계전기를 공격해 외부 회로를 끊으세요.','축전기 가까이에서 잔류 신호가 빠져나갈 때까지 기다리세요.','발광 띠 안에서 레온의 파형을 분리하세요.'],
    freight:['출고 계량소의 장부를 받으세요.','화물을 하역대에 인계하세요.','정산소에 운송장을 반납하세요.'],
    relay:['첫 인계함에서 봉인 기록을 받으세요.','기록을 중계 보관함까지 직접 운반하세요.','성채 우편함에 최종 인계하세요.']
  };
  return {x:n.x,y:n.y,label:n.label,text:M.duel===n?'흰 선 안에서 도전자를 제압하세요. 밖으로 물러나면 결투가 중단됩니다.':local[n.mode]?.[n.index]||fieldText[modeOf(n)]};
}
function fieldObjective(M,x,y){
  if(!M?.regional) return null;
  let best=null,dist=Infinity;
  for(const n of activeNodes(M)){
    const d=Math.hypot(x-n.x,(y-n.y)/.58);
    if(d<dist){dist=d;best=n;}
  }
  if(!best) return null;
  const t=targetFor(M,best),mode=modeOf(best),progress=best.progress||0;
  t.text=best.label+' · '+t.text;
  if(progress>0&&mode!=='assault') t.text+=' '+Math.min(100,Math.floor(progress*100))+'%';
  if(mode==='calibrate'){t.x+=285;}
  return t;
}
function releaseDuel(M){
  const n=M?.duel;
  if(!n) return;
  if(n.champion) n.champion.dead=true; // retreat yields neither loot nor objective credit
  n.champion=null; n.awake=false; M.duel=null;
}
function clearDuelSpectators(M,V){
  const opponent=M.duel?.champion||(M.regional?.no===1?M.king:null);
  if(!opponent||opponent.dead) return;
  for(const enemy of V.en) if(enemy!==opponent&&!enemy.d.node) enemy.dead=true;
  for(let i=V.pj.length-1;i>=0;i--) if(V.pj[i].orb) V.pj.splice(i,1);
  V.mk.length=0;
}
function fieldTick(M,node,dt,distance,spawn){
  const mode=modeOf(node);
  if(mode==='assault'||!activeNodes(M).includes(node)) return false;
  if(mode==='duel'){
    if(node.champion?.dead){M.duel=null;return true;}
    if(M.duel&&M.duel!==node) return false;
    if(node.champion&&distance>1440){releaseDuel(M);return false;}
    if(!node.champion&&distance<870){
      const e=spawn('brute',node.x,node.y); e.hp=e.max=Math.round(e.max*1.85);
      e.displayName=node.label; node.champion=e; M.duel=node;
    }
    return false;
  }
  if(mode==='freight'&&node.index===1&&!M.chests.some(c=>c.open)) return false;
  const channel=mode==='calibrate'?distance>=190&&distance<=390:distance<310;
  const seconds=mode==='restore'?4:mode==='calibrate'?2.6:mode==='witness'?1.8:.55;
  if(channel) node.progress=Math.min(1,node.progress+dt/seconds);
  else if(mode==='calibrate') node.progress=Math.max(0,node.progress-dt*.08);
  return node.progress>=1;
}
const api={blockedCrossing,insideArena,rayReach,releaseDuel,clearDuelSpectators,register,read,number,field,radius,village,villageNext,villageObjective,completeStation,villageTick,
  activeNodes,modeOf,fieldObjective,fieldTick};
if(typeof window!=='undefined'){window.PF.regionMaps=api;}
if(typeof module!=='undefined') module.exports=api;
})();
