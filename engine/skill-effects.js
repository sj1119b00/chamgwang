// Shared cast and impact effects. Points use the combat floor x/y and a separate height z.
(() => {
'use strict';
const sv=RPG.sv, recipes=new Map();
const defaults={
  ring:{size:180,duration:.32},
  flash:{size:95,duration:.16},
  sparks:{size:160,duration:.28}
};

function readLayer(id,layer,index){
  const label=id+' layer '+(index+1);
  if(!layer||!Object.hasOwn(defaults,layer.kind)) throw Error(label+' needs a ring, flash or sparks kind');
  const {kind,color='#ffffff',size=defaults[kind].size,duration=defaults[kind].duration,delay=0,height=0,count=8}=layer;
  const keys=['kind','color','size','duration','delay'];
  if(kind!=='ring') keys.push('height');
  if(kind==='sparks') keys.push('count');
  for(const key of Object.keys(layer)) if(!keys.includes(key)) throw Error(label+' has an invalid '+key+' field');
  if(typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color)) throw Error(label+' needs a #RRGGBB color');
  if(!Number.isFinite(size)||size<=0||!Number.isFinite(duration)||duration<=0) throw Error(label+' needs a positive size and duration');
  if(!Number.isFinite(delay)||delay<0||!Number.isFinite(height)||height<0) throw Error(label+' needs a nonnegative delay and height');
  if(!Number.isInteger(count)||count<1||count>64) throw Error(label+' needs a sparks count between 1 and 64');
  const pal={d:'#100f19',b:color,m:color,h:'#ffffff',l:color,s:color};
  return {kind,color,pal,size,duration,delay,height,count};
}

function drawLayer(layer,point){
  const {kind,color,pal,size,duration,count}=layer;
  const {x,y,angle}=point, z=point.z+layer.height;
  const calm=!!sv.A.SV.opt?.calm, speed=size/duration;
  const n=calm?Math.max(1,Math.ceil(count/2)):count;
  if(window.FX3?.on&&window.GFX?.on&&window.K3){
    if(kind==='ring') K3.shock(x,y,{pal,r:size,dur:duration,dust:0,light:calm?0:.45});
    if(kind==='flash') K3.flare(x,y,z,{pal,s:size,dur:duration,gain:calm?1:2.4});
    if(kind==='sparks') K3.sparks(x,y,z,{pal,n,sp:[speed*.5,speed],life:[duration*.65,duration],dir:angle});
    return;
  }
  if(kind==='ring') ring(x,y,speed,color,duration,{w:4,r0:1,dec:1,sy:sv.FSY});
  if(kind==='flash') gl0(x,y-z,size,color,duration,{a:calm?.3:.65});
  if(kind==='sparks'){
    const budget=Math.max(1,Math.round(n*(window.ENG?.q?.qk??1)));
    for(let i=0;i<budget;i++){
      const dir=angle===undefined?Math.random()*2*Math.PI:angle+(Math.random()-.5)*1.2;
      spark(x,y-z,dir,speed*(.5+Math.random()*.5),{c:color,life:duration,w:3,g:160});
    }
  }
}

function register(id,definition){
  if(typeof id!=='string'||!/^[a-z][a-z0-9_-]*$/.test(id)||recipes.has(id)) throw Error('Invalid or duplicate skill effect id: '+id);
  if(typeof definition==='function'){
    recipes.set(id,definition);
    return;
  }
  if(!Array.isArray(definition)||!definition.length) throw Error(id+' needs a renderer or at least one effect layer');
  recipes.set(id,Array.from(definition,(layer,index)=>readLayer(id,layer,index)));
}

function play(id,point){
  if(!recipes.has(id)) throw Error('Unknown skill effect: '+id);
  const {x,y,z=0,angle}=point??{};
  if(![x,y,z].every(Number.isFinite)||(angle!==undefined&&!Number.isFinite(angle))) throw Error(id+' needs a finite world position and angle');
  const origin={x,y,z,angle};
  const recipe=recipes.get(id);
  if(typeof recipe==='function'){
    // A broken custom drawing must not cancel the accepted cast or its cooldown.
    try{ recipe(origin); }catch(error){ console.error('Skill effect '+id+' failed',error); return false; }
    return true;
  }
  for(const layer of recipe){
    // Game timers pause with the battle and are cleared when leaving or starting a room.
    if(layer.delay>0) after(layer.delay,()=>drawLayer(layer,origin));
    else drawLayer(layer,origin);
  }
  return true;
}

function bindCast(fn,effect,basic){
  return function(...args){
    // Capture the start point even if the cast teleports or turns the character.
    const x=pl.x, y=pl.gy;
    const result=fn.apply(this,args);
    if(basic?!!result:result!==false) play(effect,{x,y,angle:pl.f<0?Math.PI:0});
    return result;
  };
}

function bindClass(cls,definition,skills,order){
  const bindings=(order||[]).filter(id=>skills[id]?.castEffect!==undefined);
  if(!bindings.length) return definition;
  const bound={...definition,skills:{...definition.skills},ults:{...definition.ults}};
  for(const id of bindings){
    const {type,castEffect}=skills[id], label=cls+'/'+id;
    if(!recipes.has(castEffect)) throw Error(label+' refers to unknown castEffect '+castEffect);
    const slot=type==='basic'?bound.basic:bound.skills[id];
    const fn=type==='ult'?bound.ults[id]:slot?.fn;
    if(typeof fn!=='function') throw Error(label+' needs a cast handler for '+castEffect);
    const wrapped=bindCast(fn,castEffect,type==='basic');
    if(type==='basic') bound.basic={...slot,fn:wrapped};
    else if(type==='ult') bound.ults[id]=wrapped;
    else bound.skills[id]={...slot,fn:wrapped};
  }
  return bound;
}

function attach(skillId,effectId){
  if(typeof skillId!=='string'||!Object.hasOwn(sv.SK,skillId)) throw Error('Unknown skill: '+skillId);
  if(!recipes.has(effectId)) throw Error('Unknown skill effect: '+effectId);
  const meta=sv.SK[skillId], owner=sv.CLS[meta.cls];
  const slot=meta.type==='basic'?owner?.basic:meta.type==='ult'?owner?.ults:owner?.skills?.[skillId];
  const key=meta.type==='ult'?skillId:'fn';
  if(typeof slot?.[key]!=='function') throw Error(skillId+' needs a cast handler for '+effectId);
  if(meta.castEffect===effectId) return false;
  if(meta.castEffect!==undefined) throw Error(skillId+' already has castEffect '+meta.castEffect);
  // Keep the live slot and any audio/animation wrappers installed by other modules.
  slot[key]=bindCast(slot[key],effectId,meta.type==='basic');
  meta.castEffect=effectId;
  return true;
}

sv.effects={register,play,attach,has:id=>recipes.has(id),bindClass};
})();
