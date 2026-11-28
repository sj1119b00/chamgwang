// The raid journal uses the same constructs as the simulator and the battlefield.
(()=>{
'use strict';
const PF=window.PF,renderer=window.GameConstructs,names=renderer.names;
const labels={idle:'감시',walk:'전진',run:'구보',turn:'선회',prepare:'장전',attack:'기믹 작동',heavy:'중압 타격',charge:'돌진',
  hurt:'봉인 해제',stagger:'균형 상실',knockdown:'전도',fall:'쓰러짐',death:'가동 정지',entrance:'기동',roar:'경보',phase:'기구 전환',special:'봉쇄 기동'};
function open(group,selected){
  if(group!=='constructs')return;
  const keys=Object.keys(names),forms=keys.map(key=>({group,key,name:names[key],labels,
    weapon:renderer.manifest?.entries[key]?.weapon}));
  PF.bestiary.openForms(forms,keys.map(k=>names[k]),Math.max(0,keys.indexOf(selected)));
}
function button(parent,group,label,key){
  if(group!=='constructs')return;
  const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.dataset.modelGroup=group;
  b.onclick=()=>open(group,key);parent.appendChild(b);
}
PF.figures={open,button,sheet:renderer.sheet,ready:renderer.ready,paint:renderer.paint,poster:renderer.poster};
})();
