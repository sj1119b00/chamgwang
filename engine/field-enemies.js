// Shared regional battle sprites for survival districts and the story campaign.
(function(){
'use strict';
const roles=['shard','archer','brute','boss'];
const names={
  7:['제비 순찰대','신호 송출수','대피소 방패병','싱크 킹'],
  6:['공방 조립공','압력관 사수','도가니 집행공','제네시스 킹'],
  5:['장막 수집가','암호 송신자','폐쇄망 파수꾼','글리치 킹'],
  4:['의회 창병','의장 호위 사수','투표함 근위병','엠퍼러'],
  3:['종자 추적꾼','갈대 궁수','뿌리 운반수','와일드 킹'],
  2:['금고 경비대','장부 징수관','금고 운반병','크레딧 킹'],
  1:['투기장 도전자','철편 투척수','철권 문지기','브루털 킹'],
  0:['잔류 신호','관측 사수','봉인 집행자','아르카디아']
};
function identity(sector,type,stage,definitions=globalThis.RPG?.sv?.EN){
  const data=definitions?.[type],role=data?.base||type;
  if(data?.base&&data.art) return {key:data.art,name:data.name};
  if(!Object.hasOwn(names,sector)||!roles.includes(role)) return null;
  const signal=role==='boss'&&stage==='signal';
  return {key:signal?'z0_signal':'z'+sector+'_'+role,name:data?.name||(signal?'레온 · 신호체':names[sector][roles.indexOf(role)])};
}
const clips={idle:[0,8,2.15],walk:[8,20,1.04],attack:[28,14,.79],hurt:[42,5,.27],fall:[47,9,.73]};
const actions={run:[0,10,.72],turn:[10,4,.32],prepare:[14,5,.35],heavy:[19,7,1.08],charge:[26,6,.66],
  stagger:[32,5,.52],knockdown:[37,8,1.04],death:[45,6,.86],entrance:[51,7,1.22],roar:[58,6,.94],
  phase:[64,7,.82],special:[71,8,1.10]};
const fallbackClip={run:'walk',turn:'walk',prepare:'attack',heavy:'attack',charge:'attack',stagger:'hurt',knockdown:'fall',
  death:'fall',entrance:'idle',roar:'attack',phase:'attack',special:'attack'};
const clamp=x=>Math.max(0,Math.min(.99999,x));
function sample(name,progress){
  const clip=actions[name]||clips[name],p=clamp(progress);
  return {name,frame:clip[0]+Math.floor(p*clip[1]),progress:p};
}
function pose(e,death,clock){
  if(death)return sample(death.vx!=null?'fall':'death',death.t/death.life);
  if(e.royalMotion){
    const {phase,pattern,progress}=e.royalMotion;
    if(phase==='windup')return sample(pattern==='summon'?'roar':'prepare',progress);
    const name={slam:'heavy',charge:'charge',sweep:e.finalStage==='arcadia'?'special':'attack'}[pattern]||'special';
    // The king controller delivers damage on the first strike frame after its telegraph.
    return sample(name,.56+.44*progress);
  }
  const phaseAge=clock-e.royalPhaseAt,entryAge=clock-e.royalEntranceAt;
  if(phaseAge>=0&&phaseAge<.80)return sample(e.royalPhaseNumber===3?'roar':'phase',phaseAge/.80);
  if(entryAge>=0&&entryAge<1.20)return sample('entrance',entryAge/1.20);
  const hitAge=clock-e.hitT;
  if((e.hitMotion==='stagger'||e.hitMotion==='knockdown')&&hitAge>=0&&hitAge<e.hitMotionLength)
    return sample(e.hitMotion,hitAge/e.hitMotionLength);
  if(e.hurtT>0)return sample('hurt',1-e.hurtT/.30);
  if(!(e.stun>0)&&e.contactRecovery>0)
    return sample(e.d.heavy?'heavy':'attack',.57+.43*(1-e.contactRecovery));
  if(e.castT>0||e.swing>0){
    const t=e.castT>0?clamp(1-e.castT/(e.d.boss?.9:.55)):.62+(1-e.swing/.32)*.37;
    // The drawn string opens .30s into a .55s cast when the projectile leaves the hand.
    const release=.30/.55;
    const u=e.d.ranged?(t<release?.38+.19*t/release:.57+.43*(t-release)/(1-release)):t;
    return sample(e.d.boss&&e.zoneCast?'special':e.d.heavy&&!e.d.boss?'heavy':'attack',u);
  }
  if(!(e.stun>0)&&e.contactWindup>0)return sample('prepare',e.contactWindup);
  if(e.d.ranged&&e.atk>0&&e.atk<.34)return sample('prepare',1-e.atk/.34);
  if(e.gaitMoving!==false&&!(e.stun>0)&&e.walkT>0){
    const turnAge=clock-e.gaitTurnAt;
    if(turnAge>=0&&turnAge<.32)return sample('turn',turnAge/.32);
    const name=e.gaitRunning?'run':'walk',period=name==='run'?.72:e.d.heavy?1.25:1.04;
    return sample(name,((e.gaitClock??e.walkT)/period)%1);
  }
  return sample('idle',(Math.max(0,clock)+(e.id||0)*.147)/clips.idle[2]%1);
}
const B={roles,names,identity,pose,clips,actions};
if(typeof module!=='undefined')module.exports=B;
if(typeof window==='undefined')return;
window.GameFieldEnemies=B;
const root='assets/campaign/foes/',sprites=new Map();let scales={},loadedSector;
const decoded=new WeakSet();
function bitmap(name){
  const im=new Image();im.decoding='async';im.src=root+name+'.webp';
  if(im.decode)im.decode().then(()=>decoded.add(im)).catch(()=>{if(im.complete&&im.naturalWidth)decoded.add(im);});
  else im.onload=()=>decoded.add(im);
  return im;
}
const arrivals=bitmap('arrival');
fetch(root+'scales.json').then(r=>r.json()).then(data=>{scales=data;}).catch(()=>{});
function sprite(key){if(!sprites.has(key))sprites.set(key,bitmap(key));return sprites.get(key);}
B.sprite=sprite;
B.preloadSector=function(no){if(no==null||no===loadedSector)return;
  // All encounters in this district share these sheets, even with a full horde.
  // Release the decoded sheets from the previous district on crossing the road.
  loadedSector=no;sprites.clear();
  for(const id of [...roles,...RPG.sv.encounterFoes(no)]) sprite(identity(no,id).key);
  if(no===0)sprite('z0_signal');};
B.draw=function(no,g,e,death){
  const form=identity(no,e.type,e.finalStage);if(!form)return false;
  if(loadedSector!==no)B.preloadSector(no);
  let img=sprite(form.key),frame,live=null;
  const scale=scales[form.key]||1.25,side=(e.h||e.d.h*e.d.sc)*(e.sv||1)*scale;
  if(decoded.has(img)){
    const state=pose(e,death,RT);frame=state.frame;
    if(scales[form.key])live=GameEnemySkin.image(g,e,'foes',form.key,state.name,state.progress,scale*2.02,.94);
    if(!live&&actions[state.name]){
      const extra=/^z[0-7]_(?:shard|archer|brute|boss|signal)$/.test(form.key)?sprite(form.key+'-actions'):null;
      if(extra&&decoded.has(extra))img=extra;
      else frame=sample(fallbackClip[state.name],state.name==='prepare'?.38*state.progress:state.progress).frame;
    }
  }
  else{
    const standard=/^z([0-7])_(shard|archer|brute|boss|signal)$/.exec(form.key);
    if(standard&&decoded.has(arrivals)){
      img=arrivals;frame=standard[2]==='signal'?32:Number(standard[1])*4+roles.indexOf(standard[2]);
    }else if(standard){
      const tint=RPG.hub.ZONES.find(z=>z.no===no)?.acc||'#8cb3bf',pulse=.5+.5*Math.sin(RT*6);
      g.save();g.translate(e.x,e.y-(e.z||0));g.strokeStyle=tint;g.fillStyle=tint;
      g.globalAlpha*=.45+pulse*.22;g.lineWidth=Math.max(2,side*.012);g.beginPath();
      g.ellipse(0,0,side*.18,side*.055,0,0,Math.PI*2);g.stroke();
      g.beginPath();g.moveTo(0,-side*.43);g.lineTo(side*.036,-side*.35);
      g.lineTo(0,-side*.27);g.lineTo(-side*.036,-side*.35);g.closePath();g.fill();g.restore();return true;
    }else return false;
  }
  const cell=live?live.width:img.naturalWidth/8;
  let x=e.x,y=e.y-(e.z||0)+4;
  g.save();
  if(death){const t=death.t,k=Math.min(1,t/death.life);g.globalAlpha*=1-k*k;
    if(death.vx!=null){x+=death.vx*t;y+=death.vy*t-death.vz*t+1400*t*t;}
    g.translate(x,y);if(death.vx!=null)g.rotate(death.spin*t*.48);
  }else{g.translate(x,y);const hit=Math.max(0,1-(RT-(e.hitT??-9))/.16);g.rotate((e.hdx||0)*.12*hit*hit);if(e.z>15)g.rotate(-e.f*Math.min(.65,e.z/550));}
  const facing=e.f||1,turnAge=RT-e.gaitTurnAt;
  g.scale(!death&&turnAge>=0&&turnAge<.15&&pose(e,null,RT).name==='turn'?-facing:facing,1);
  const args=[live||img,live?0:(frame%8)*cell,live?0:Math.floor(frame/8)*cell,cell,cell,-side*.5,-side*.94,side,side];
  g.drawImage(...args);if(e.flash>.55){g.globalCompositeOperation='lighter';g.globalAlpha*=.6;g.drawImage(...args);}g.restore();return true;
};
})();
