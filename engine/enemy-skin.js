// One transparent GPU stage for the nearest combatant. Battle order and hitboxes
// stay in the world canvas; its baked pose is immediately available while loading.
(()=>{
'use strict';
const models=new Map(),touch=matchMedia('(pointer: coarse)'),moduleURL=new URL('engine/vendor/cast-studio.js',document.baseURI).href;
let stage,boot,failed=false,generation=0,selectionAt=-1,selected,previousFrame=0,slowFrames=0,restUntil=0;
let lastPaint,lastDrawn,dying;
function clear(){
  generation++;
  for(const record of models.values()){record.request.abort();if(record.model)stage.dispose(record.model);}
  models.clear();selected=lastDrawn=lastPaint=dying=null;selectionAt=-1;
}
function available(){
  return !failed&&!touch.matches&&!navigator.connection?.saveData&&!(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<4)&&
    window.ENG?.q?.tier==='high'&&!RPG.api.SV.opt?.lowfx&&performance.now()>=restUntil;
}
function start(){
  if(boot)return;
  const canvas=document.createElement('canvas');canvas.dataset.battleSkin='stage';
  let context;
  try{context=canvas.getContext('webgl2',{alpha:true,antialias:true,preserveDrawingBuffer:true,
    powerPreference:'high-performance',failIfMajorPerformanceCaveat:true});}catch{failed=true;return;}
  if(!context){failed=true;return;}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();failed=true;clear();});
  boot=import(moduleURL).then(m=>{if(!failed)stage=m.createBattleSkin(canvas,context);}).catch(()=>{failed=true;});
}
function select(){
  if(selectionAt===RT)return;
  selectionAt=RT;const now=performance.now(),elapsed=now-previousFrame;previousFrame=now;
  if(dying&&RT<dying.until){selected=dying.actor;return;}
  dying=null;
  // Consecutive slow render frames lower the field detail. A menu pause or a
  // single shader compilation is excluded from this short rolling budget.
  if(elapsed>0&&elapsed<160){
    slowFrames=elapsed>46?Math.min(26,slowFrames+1):Math.max(0,slowFrames-2);
    if(slowFrames>=24){restUntil=now+5000;slowFrames=0;selected=null;return;}
  }
  let best=null,score=Infinity;
  const {hw,hh}=RPG.sv.view();
  for(const actor of RPG.sv.V.en){
    if(actor.dead||actor.d.node)continue;
    if(Math.abs(actor.x-cam.x)>hw+actor.h*.35||Math.abs(actor.y-(actor.z||0)-actor.h*.5-cam.y)>hh+actor.h*.55)continue;
    const dx=actor.x-pl.x,dy=(actor.y-pl.gy)/RPG.sv.FSY,distance=Math.hypot(dx,dy);
    if(distance>(actor.d.boss?1250:680))continue;
    const priority=distance-(actor.d.boss?2000:actor.d.heavy?240:0)-(actor===selected?100:0);
    if(priority<score){best=actor;score=priority;}
  }
  selected=best;
}
function acquire(group,key){
  const id=group+'/'+key;
  if(models.has(id)){
    const item=models.get(id);models.delete(id);
    if(!item.retryAt||item.retryAt>performance.now()){models.set(id,item);return item.model;}
  }
  if([...models.values()].some(item=>item.pending))return null;
  if(models.size>=2){
    const [oldest,entry]=models.entries().next().value;
    if(entry.model)stage.dispose(entry.model);models.delete(oldest);lastPaint=null;
  }
  const request=new AbortController(),version=generation,record={request,pending:true,model:null};
  models.set(id,record);
  fetch('assets/campaign/'+id+'.glb',{signal:request.signal}).then(response=>{
    if(!response.ok)throw Error(String(response.status));return response.arrayBuffer();
  }).then(bytes=>stage.load(bytes)).then(model=>{
    if(generation!==version||models.get(id)!==record)stage.dispose(model);
    else record.model=model;
  }).catch(()=>{if(!request.signal.aborted)record.retryAt=performance.now()+30000;}).finally(()=>{record.pending=false;});
  return null;
}
function image(g,actor,group,key,clip,progress,worldSize,foot){
  if(g!==ctx||!actor||!Number.isFinite(worldSize)||worldSize<=0)return null;
  if(!available()){
    if(models.size&&(window.ENG?.q?.low||RPG.api.SV.opt?.lowfx))clear();
    return null;
  }
  select();
  const owner=actor.skinOwner||actor;
  if(owner!==selected&&!(actor.skinOwner&&owner===lastDrawn))return null;
  if(!stage){start();return null;}
  const model=acquire(group,key);if(!model)return null;
  const looping=['idle','walk','run'].includes(clip);
  const p=looping?(progress%1+1)%1:Math.max(0,Math.min(.99999,progress));
  const now=performance.now();
  if(lastPaint?.actor===owner&&lastPaint.clip===clip&&lastPaint.group===group&&lastPaint.key===key&&
     (Math.abs(lastPaint.progress-p)<.0001&&(lastPaint.clock===RT||lastPaint.canvas.dataset.blend==='0.0000')||
       looping&&now-lastPaint.at<1000/35))return lastPaint.canvas;
  try{
    const canvas=stage.draw(model,owner,group,key,clip,p,worldSize,foot,RT);
    if(canvas){lastDrawn=owner;lastPaint={actor:owner,clip,group,key,progress:p,at:now,clock:RT,canvas};}
    return canvas;
  }catch{failed=true;clear();return null;}
}
function retainDeath(actor,seconds){
  if(actor!==lastDrawn)return null;
  dying={actor,until:RT+seconds};selected=actor;return actor;
}
window.GameEnemySkin={image,clear,retainDeath};
addEventListener('pagehide',event=>{clear();if(!event.persisted&&stage)stage.close();});
})();
