// Content packs inherit combat behavior from a built-in enemy role. Regional
// encounters use the sector number printed on the map, including sector 0.
(function(){
'use strict';
const roles=['shard','archer','brute','boss'];
const stats=['hp','spd','r','dmg','gem','sc','h'];
const validKey=value=>typeof value==='string'&&/^[a-z][a-z0-9_-]*$/.test(value);
const validSector=value=>Number.isInteger(value)&&value>=0&&value<=7;
const shapeFields={slam:['r'],sweep:['r','half'],charge:['len','w'],ring:['r0','r1'],fan:['n','len','w','step'],summon:['n','r','d','k']};

function readPatterns(owner,patterns,definitions){
  if(!Array.isArray(patterns)||!patterns.length) throw Error(owner+': expected a nonempty patterns array');
  const used=new Set();
  const result=patterns.map(p=>{
    if(!p||!Object.hasOwn(shapeFields,p.id)||used.has(p.id)) throw Error(owner+': invalid or duplicate attack shape '+p?.id);
    used.add(p.id);
    const fields=shapeFields[p.id], allowed=['id','name','from','dmg',...fields];
    if(p.id==='summon') allowed.push('foe');
    if(Object.keys(p).some(key=>!allowed.includes(key))) throw Error(owner+': unknown field for '+p.id);
    const from=p.from===undefined?1:p.from, dmg=p.id==='summon'?(p.dmg??0):p.dmg;
    if(typeof p.name!=='string'||!p.name.trim()||![1,2,3].includes(from)) throw Error(owner+': invalid attack name or phase for '+p.id);
    if(!Number.isFinite(dmg)||dmg<0||dmg>1||(p.id==='summon'?dmg!==0:dmg===0)) throw Error(owner+': invalid damage fraction for '+p.id);
    for(const key of fields){
      const value=p[key], zeroOK=key==='d'||key==='r0';
      if(!Number.isFinite(value)||(zeroOK?value<0:value<=0)) throw Error(owner+': invalid '+p.id+'.'+key);
      if((key==='n'||key==='k')&&(!Number.isInteger(value)||value>150)) throw Error(owner+': invalid count '+key);
    }
    if(p.id==='ring'&&p.r0>=p.r1) throw Error(owner+': ring requires r0 < r1');
    if(p.id==='sweep'&&p.half>Math.PI) throw Error(owner+': sweep half-angle exceeds π');
    if(p.foe!==undefined&&(!validKey(p.foe)||!Object.hasOwn(definitions,p.foe)||definitions[p.foe].boss||p.foe==='node')) throw Error(owner+': unknown summon monster '+p.foe);
    return {...p,from,dmg,name:p.name.trim()};
  });
  // A charge is temporarily removed when there is no runway against a wall.
  if(!result.some(p=>p.from===1&&p.id!=='charge'&&p.id!=='summon')) throw Error(owner+': phase 1 needs a damage pattern usable at a wall');
  return result;
}

function create(definitions){
  const pools=new Map();
  function register(def,boss){
    if(!def||!validKey(def.id)||def.id in definitions||def.id==='node') throw Error('Invalid or duplicate foe id: '+def?.id);
    const {id,name,art,patternSector}=def, base=boss?'boss':def.base;
    for(const key of Object.keys(def)){
      if(!['id','name','base','art','stats','encounters','patternSector','patterns'].includes(key)) throw Error(id+': unknown foe field '+key);
    }
    if(typeof name!=='string'||!name.trim()) throw Error(id+' needs a display name');
    if(!roles.includes(base)||(!boss&&base==='boss')||(boss&&def.base!=null&&def.base!=='boss')) throw Error(id+': invalid base role');
    if(art!=null&&!validKey(art)) throw Error(id+': invalid art asset key');
    if(patternSector!=null&&(!boss||!validSector(patternSector))) throw Error(id+': invalid boss patternSector');
    if(def.patterns!==undefined&&!boss) throw Error(id+': only bosses have patterns');
    const patterns=def.patterns===undefined?undefined:readPatterns(id,def.patterns,definitions);
    const overrides=def.stats===undefined?{}:def.stats;
    if(!overrides||typeof overrides!=='object'||Array.isArray(overrides)) throw Error(id+': expected stats object');
    for(const [key,value] of Object.entries(overrides)){
      const zeroOK=key==='spd'||key==='dmg';
      if(!stats.includes(key)||!Number.isFinite(value)||(zeroOK?value<0:value<=0)||(key==='gem'&&!Number.isInteger(value))) throw Error(id+': invalid stat '+key);
    }
    const encounters=def.encounters===undefined?[]:def.encounters, seen=new Set();
    if(!Array.isArray(encounters)) throw Error(id+': expected encounters array');
    for(const entry of encounters){
      if(!entry||!validSector(entry.sector)||seen.has(entry.sector)) throw Error(id+': invalid or duplicate encounter sector');
      const {sector,chance}=entry, pool=pools.get(sector+':'+base)||[];
      if(Object.keys(entry).some(key=>key!=='sector'&&key!=='chance')) throw Error(id+': unknown encounter field in sector '+sector);
      if(!Number.isFinite(chance)||chance<=0||chance>1||pool.reduce((sum,p)=>sum+p.chance,chance)>1+1e-12) throw Error(id+': invalid total encounter chance in sector '+sector);
      seen.add(sector);
    }
    // Validate all sectors before publishing a definition or changing a pool.
    const data={...definitions[base],...overrides,base,name:name.trim(),art,patternSector,patterns};
    definitions[id]=data;
    for(const {sector,chance} of encounters){
      const key=sector+':'+base;
      if(!pools.has(key)) pools.set(key,[]);
      pools.get(key).push({id,chance});
    }
    return data;
  }
  function resolve(id,sector,random=Math.random){
    const pool=pools.get(sector+':'+id);
    if(!pool) return id;
    let roll=random();
    for(const entry of pool){
      if(roll<entry.chance) return entry.id;
      roll-=entry.chance;
    }
    return id;
  }
  function list(sector){
    return roles.flatMap(role=>(pools.get(sector+':'+role)||[]).map(entry=>entry.id));
  }
  return {registerMonster:def=>register(def,false),registerBoss:def=>register(def,true),resolve,list};
}
if(typeof window!=='undefined') window.GameFoes={create};
if(typeof module!=='undefined') module.exports={create};
})();
