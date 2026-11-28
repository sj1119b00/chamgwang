// 직업별 궁극기 충전. 실제 전투 시간과 처치로 채우고, 사용한 기술만 소모한다.
(function(){
'use strict';
const PF=window.PF,G=RPG,X=G.sv,V=X.V;
const SECONDS=60;
const record=v=>v&&typeof v==='object'&&!Array.isArray(v);
const bounded=v=>Number.isFinite(v)?Math.max(0,Math.min(100,v)):0;
function amounts(){
  const story=PF.save.data.story;
  if(!record(story.ultimateCharge)) story.ultimateCharge={};
  const all=story.ultimateCharge;
  if(!record(all[pl.cls])) all[pl.cls]={};
  return all[pl.cls];
}
function percent(id){
  if(V.practice) return 100;
  return bounded(PF.save.data.story.ultimateCharge?.[pl.cls]?.[id]);
}
function add(value){
  if(V.practice) return;
  const meters=amounts();
  for(const id in X.CLS[pl.cls]?.ults){
    if(meters[id]===100) continue;
    const next=bounded(meters[id])+value;
    meters[id]=next>=100-1e-9?100:next;
  }
}
const fighting=()=>PF.place?.FIGHT.includes(PF.place.cur);
const U=G.frame.ultimate=PF.ultimate={
  percent,
  remaining:id=>(100-percent(id))*SECONDS/100,
  kill(base){add(base*3);},
  tick(dt){if(fighting()&&!V.practice&&!PF.heat?.hold) add(dt*100/SECONDS);},
  ready(id){
    if(G.mode!=='surv'||V.over||G.paused||lock||!X.CLS[pl.cls]?.ults[id]||(!V.practice&&!G.api.unlocked(id))) return false;
    if(PF.win?.cur||PF.story?.cur||PF.road?.listOpen||PF.road?.frozen) return false;
    if(V.practice) return true;
    if(!fighting()||percent(id)<100) return false;
    return PF.place.cur!=='field'||!PF.field.inSafe(PF.field.safeZones,pl.x,pl.gy);
  },
  spend(id){if(!V.practice){amounts()[id]=0;PF.save.commit();}}
};
// 기존 호출자가 공통 게이지를 장전·비우면 세 기술에 반영한다. 읽을 때는 선택한 기술을 보여 준다.
Object.defineProperty(V,'ug',{enumerable:true,configurable:true,
  get(){const id=G.api.SV.ult;if(id)return U.percent(id);for(const key in X.CLS[pl.cls]?.ults)return U.percent(key);return 0;},
  set(v){if(V.practice)return;const m=amounts();for(const id in X.CLS[pl.cls]?.ults)m[id]=bounded(v);}
});
// 궁극기 컷인과 GPU 후처리가 끝난 뒤 실제 적중 숫자를 맨 위 캔버스에 그린다.
const renderBattle=render;
render=function(){
  const result=renderBattle.apply(this,arguments);
  if(G.mode==='surv'&&V.nums.some(n=>n.ultHit)) X.drawNumbers(tctx,true);
  return result;
};
})();
