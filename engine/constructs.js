// Raid constructs share their rig, camera and combat sheets in training and endgame battles.
(()=>{
'use strict';
const root='assets/campaign/constructs/', sheets=new Map(),portraits=new Map();
const names={arbiter:'경계 판정관',archivist:'결손 기록관',weaver:'봉합 직조자'};
let manifest=null,pending=null;
function loadManifest(){
  if(!pending)pending=fetch(root+'manifest.json').then(r=>r.ok?r.json():Promise.reject(r.status))
    .then(data=>manifest=data).catch(()=>{setTimeout(()=>pending=null,10000);return null;});
  return pending;
}
function poster(key){
  if(portraits.has(key))return portraits.get(key);
  const record={image:null};
  record.ready=loadManifest().then(async data=>{
    const url=data?.entries[key]?.arrival;if(!url)return false;
    const image=new Image();image.src=url;await image.decode();
    record.bounds=data.entries[key].arrivalBounds||{x:0,y:0,w:image.naturalWidth,h:image.naturalHeight};
    record.image=image;return true;
  }).catch(()=>false);
  portraits.set(key,record);return record;
}
function sheet(group,key){
  if(group!=='constructs'||!Object.hasOwn(names,key))return null;
  loadManifest();
  if(!sheets.has(key)){
    const image=new Image();image.decoding='async';image.src=root+key+'.webp';
    const record={image,loaded:false};
    record.ready=image.decode().then(()=>record.loaded=true).catch(()=>false);
    sheets.set(key,record);
    if(sheets.size>2)sheets.delete(sheets.keys().next().value);
  }
  return {...sheets.get(key),arrival:poster(key).image,manifest};
}
function paint(g,group,key,action,t,x,y,height,dir=1,repeat=true,actor=null){
  const record=sheet(group,key),data=record?.manifest,entry=data?.entries[key];
  if(!entry||(!record.loaded&&!record.arrival))return false;
  let clip=data.clips[action]||data.clips.idle,source=record.image,columns=data.columns,scale=entry.scale;
  if(data.extra?.clips[action]){
    const live=sheets.get(key);
    if(!live.extra){live.extra=new Image();live.extra.decoding='async';live.extra.src=root+key+'-actions.webp';}
    if(live.extra.complete&&live.extra.naturalWidth){
      source=live.extra;columns=data.extra.columns;clip=data.extra.clips[action];scale=entry.extraScale;
    }
  }
  const u=repeat?((t%1)+1)%1:Math.max(0,Math.min(.99999,t));
  const index=clip.start+Math.floor(u*clip.count),cell=source.naturalWidth/columns;
  const size=(scale||1.3)*height;
  const extra=Boolean(data.extra?.clips[action]),worldSize=extra?entry.extraWorldSize:entry.worldSize;
  const skin=actor&&worldSize&&window.GameEnemySkin?.image(g,actor,group,key,action,u,worldSize,data.foot);
  g.save();g.translate(x,y);g.scale(dir,1);
  if(skin){
    const liveSize=(extra?entry.extraScale:entry.scale)*height;
    g.drawImage(skin,0,0,skin.width,skin.height,-liveSize*.5,-liveSize*data.foot,liveSize,liveSize);
  }else if(source.naturalWidth)g.drawImage(source,(index%columns)*cell,Math.floor(index/columns)*cell,cell,cell,
    -size*.5,-size*data.foot,size,size);
  else g.drawImage(record.arrival,-size*.5,-size*data.foot,size,size);
  g.restore();
  return true;
}
function ready(group,key){
  const record=sheet(group,key);
  if(!record)return Promise.resolve(false);
  return Promise.all([loadManifest(),record.ready]).then(([,ok])=>Boolean(ok&&manifest?.entries[key])).catch(()=>false);
}
window.GameConstructs={names,sheet,paint,poster,ready,get manifest(){return manifest;}};
})();
