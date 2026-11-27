// 기존 사냥터의 포장된 곁길에서 짧은 지선을 따라 두 쉼터로 간다.
(function(){
'use strict';
const PF=window.PF,F=PF.field,X=RPG.sv,scale=X.FSY;
function shelters(M){
  const start=M.plazas.find(p=>p.k==='start'),a=M.arena;
  const lane=M.roads.find(r=>r[0]===r[2]&&r[0]!==start.x);
  const dir=Math.sign(lane[0]-start.x),x=lane[0]+dir*700;
  function clear(y){
    if(y<Math.min(lane[1],lane[3])||y>Math.max(lane[1],lane[3])) return false;
    for(let d=0;d<=700;d+=20) for(let dy=-80;dy<=80;dy+=20){
      if(PF.road.solid(M,lane[0]+dir*d,y+dy,scale,false)) return false;
    }
    return true;
  }
  function rest(id,label,near,r){
    let y=near;
    for(let offset=0;offset<=Math.abs(lane[1]-lane[3]);offset+=80){
      if(clear(near+offset)){ y=near+offset; break; }
      if(offset&&clear(near-offset)){ y=near-offset; break; }
    }
    M.roads.push([lane[0],y,x,y,270]);
    return {id,kind:id,label,x,y,r};
  }
  return [rest('middle','중간 쉼터',M.nodes[0].y-550,590),rest('keepRest','성채 앞 쉼터',a.y+a.r*scale+790,550)];
}
const rests=()=>F.safeZones.filter(z=>z.kind);
function place(){
  if(PF.place.cur==='village') return {kind:'village',zone:PF.village.zone};
  const M=F.M;
  if(PF.place.cur!=='field'||!M) return {kind:PF.place.cur,zone:null};
  const rest=rests().find(z=>Math.hypot(pl.x-z.x,pl.gy-z.y)<z.r),a=M.arena;
  const kind=rest?.kind||(Math.hypot(pl.x-a.x,(pl.gy-a.y)/scale)<a.r?'boss':pl.gy>M.nodes[0].y-550?'outer':'core');
  return {kind,zone:RPG.frame.run.zone};
}
const campArt=[
  {art:'camp_tent',dx:-395,dy:-130,h:590},{art:'camp_supplies',dx:-360,dy:155,h:220},
  {art:'p_lamp',dx:320,dy:-165,h:520},{art:'camp_beacon',dx:385,dy:195,h:230}
];
const light=document.createElement('canvas');light.width=light.height=192;
const lamp=light.getContext('2d'), pool=lamp.createRadialGradient(96,96,0,96,96,96);
pool.addColorStop(0,'rgba(255,204,122,.34)');pool.addColorStop(.55,'rgba(232,176,102,.25)');pool.addColorStop(1,'rgba(201,160,100,0)');
lamp.fillStyle=pool;lamp.fillRect(0,0,192,192);
// 쉼터의 뒤쪽에 놓이는 낮은 구조물. 들길 중앙과 주민에게 다가갈 바닥을 비워 둔다.
const back=drawBackground_prep;
drawBackground_prep=function(){
  back(); if(!F.M||RPG.mode!=='surv') return;
  applyCam(ctx);
  for(const z of F.safeZones){
    if(!z.kind||Math.abs(z.x-cam.x)>X.view().hw+800||Math.abs(z.y-cam.y)>X.view().hh+800) continue;
    ctx.drawImage(light,z.x-z.r*1.36,z.y-z.r*1.08,z.r*2.72,z.r*2.16);
    ctx.drawImage(light,z.x+55,z.y-330,580,420);
    for(const p of campArt){
      const art=z.kind==='keepRest'&&p.art==='camp_tent'?'p_tramstop':p.art,im=PF.art.img(art);
      if(!im) continue;
      const w=p.h*im.naturalWidth/im.naturalHeight;
      ctx.drawImage(im,z.x+p.dx-w/2,z.y+p.dy-p.h,w,p.h);
    }
  }
  ctx.setTransform(1,0,0,1,0,0);
};
let inRest=false;
function updateRest(){
  const safe=PF.place.cur==='village'||PF.place.cur==='field'&&F.safeZones.some(z=>z.kind&&Math.hypot(pl.x-z.x,pl.gy-z.y)<z.r);
  if(safe!==inRest){inRest=safe;document.body.classList.toggle('pf-rest',safe);}
}
PF.place.on(updateRest);
const previous=update;
update=function(dt){previous(dt);updateRest();};
PF.continent={shelters,rests,place};
})();
