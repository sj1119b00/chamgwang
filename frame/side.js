// 선택 의뢰는 마을 주민 → 중간 쉼터의 정찰 담당 → 같은 주민에게 보고하는 흐름이다.
(function(){
'use strict';
const state=(s,z)=>Math.max(0,Math.min(3,s.side?.['z'+z]|0));
function advance(s,z,before){ if(before>=3||state(s,z)!==before) return false;
  (s.side||(s.side={}))['z'+z]=before+1; return true;
}
const S={state,advance};
if(typeof window!=='undefined'&&window.PF){
  const PF=window.PF, story=()=>PF.save.data.story;
  const zone=()=>PF.place.cur==='village'?PF.village.zone:PF.place.cur==='field'?RPG.frame.run?.zone:null;
  const cache=new Map();
  function speech(z,npc,section){
    const no=RPG.hub.ZONES[z]?.no;
    const after=section==='sideOffer'&&story().cleared>z&&PF.QUESTS.content(no)?.sideAfter;
    const key=z+'.'+section+(after?'.after':'');
    if(!cache.has(key)){
      const rows=PF.QUESTS.lines(no,section,npc);
      cache.set(key,after?PF.QUESTS.lines(no,'sideAfter',npc).concat(rows):rows);
    }
    return cache.get(key);
  }
  function converse(z,npc,section,before,change){
    if(PF.win.cur||PF.story.cur||PF.story.busy()) return true;
    const run=RPG.frame.run;
    const lines=speech(z,npc,section);
    PF.story.talk(lines,{read:n=>{
      if(n===lines.length&&change&&run===RPG.frame.run&&advance(story(),z,before)) PF.save.commit();
    }}); return true;
  }
  S.press=s=>{ const z=zone(); if(s.act!=='side:resident'||z==null||PF.place.cur!=='village') return false;
    const i=state(story(),z), section=i<2?'sideOffer':i===2?'sideReport':'sideDone';
    return converse(z,'neighbor',section,i,i===0||i===2);
  };
  S.scout=()=>{ const z=zone();
    if(z==null||state(story(),z)!==1) return false;
    return converse(z,'scout','sideVisit',1,true);
  };
  S.record=z=>({done:state(story(),z)===3?1:0,total:1});
  S.target=()=>{ const z=zone(); if(z==null) return null;
    const i=state(story(),z); if(i===3) return null;
    const village=PF.place.cur==='village', id=village&&i!==1?'q_neighbor':!village&&i===1?'q_scout':null;
    const q=id?PF.spots.list.find(s=>s.id===id):PF.road.mouths().find(s=>s.exit===(village?'field':'in'));
    return q?{x:q.x,y:q.y,label:q.label}:null;
  };
  PF.side=S;
}
if(typeof module!=='undefined') module.exports=S;
})();
