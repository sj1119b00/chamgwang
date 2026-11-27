// 메인 퀘스트 자료. 대화 단계 첫 줄의 원문과 기록 id는 frame/data/lore.js에서 가져온다.
// 현장 대사는 구역 번호에 연결하고, 집필한 자료가 없는 곳은 미정으로 둔다.
// Step {id, type:'talk'|'reach'|'node'|'king'|'travel', npc?, at?, n?, exit?, text, scene?, lines?, note?}. 대사 줄 {who, face, text, lore?}
// 중앙 마을 주민 → 지도 담당 → 동쪽 길. 구역 마을 주민 → 첫 노드 접근·파괴 → 정찰 담당 → 나머지 노드 → 성채 문 담당 → 왕 → 마을 주민.
(function(){
'use strict';
const LORE=typeof window!=='undefined'&&window.PF&&window.PF.LORE||require('./lore.js');
// NPC의 이름표, 얼굴 그림, 발밑 불빛. 중앙 마을 NPC는 town 자료의 지점 id를 사용한다.
const NPC={
  resident:{who:'주민 (임시)',art:'npc_resident',spot:'npc_talk'},
  map:{who:'지도 담당 (임시)',art:'npc_map',spot:'npc_map'},
  camp:{who:'마을 주민',art:'npc_resident',light:'cool'},
  neighbor:{who:'이웃 주민',art:'npc_archive',light:'warm'},
  scout:{who:'정찰 담당',art:'npc_resident',light:'warm'},
  gate:{who:'왕의 문 담당',art:'npc_archive',light:'warm'}};
const regions=typeof window!=='undefined'?window.PF.CONTENTS||{}:{7:require('./continent-7.js'),1:require('./continent-1.js')};
const content=no=>regions[no];
function lines(no,section,npc,lore){
  const role={who:NPC[npc].who,face:face(npc)}, rows=content(no)?.[section];
  const result=rows?rows.map(b=>({...b,...role})):[{...role,text:'대화 내용 미정'}];
  if(lore) result.unshift({...role,lore:lore.id,text:lore.text});
  return result;
}
const face=k=>'assets/frame/'+NPC[k].art+'.webp';
// 그 NPC의 대사: 배경 문구 한 줄(있으면, 기록 id와 함께) + 임시 줄 '임시 대사 · <이름> <n>'
function say(k,name,lore,n=2){ const o={who:NPC[k].who,face:face(k)}, L=[];
  if(lore) L.push({...o,lore:lore.id,text:lore.text});
  for(let i=1;i<=n;i++) L.push({...o,text:`임시 대사 · ${name} ${i}`});
  return L; }
// 지금 단계와 상관없는 NPC를 누르면 나오는 임시 한 줄
const IDLE={camp:'야영지',scout:'정찰',gate:'왕의 문'};
const idle=k=>({who:NPC[k].who,face:face(k),text:`임시 대사 · ${IDLE[k]} — 지금은 할 말이 없다`});

const town=[
  {id:'town.resident',type:'talk',npc:'resident',text:'임시 목표: 주민과 대화',lines:say('resident','주민',{id:'town.resident',text:LORE.town.resident})},
  {id:'town.map',type:'talk',npc:'map',text:'임시 목표: 지도 담당과 대화',lines:say('map','지도 담당',{id:'town.map',text:LORE.town.map})},
  {id:'town.road',type:'travel',exit:'east',text:'임시 목표: 동쪽 길로',note:{lore:'town.road',text:LORE.town.road},
    npc:'map',lines:say('map','지도 담당',{id:'town.road',text:LORE.town.road},1)}];

// 구역 번호는 hub.js ZONES[zone].no이고, 마지막 장소는 별도의 고정 배경 문구를 쓴다.
function zone(z,o={}){ const Z=o.no!=null&&LORE.zone[o.no], p='z'+z+'.';
  const camp=Z?{id:'z'+o.no+'.camp',text:Z.camp}:o.final?{id:'final',text:LORE.final}:null, scout=Z?{id:'z'+o.no+'.scout',text:Z.scout}:null;
  const L=[
    {id:p+'camp',type:'talk',npc:'camp',scene:'intro',text:'구역 마을 주민과 대화',lines:lines(o.no,'camp','camp',camp)},
    {id:p+'reach',type:'reach',at:'node',text:'외곽의 신호 노드로 이동'},
    {id:p+'node1',type:'node',n:1,text:'첫 신호 노드 파괴'},
    {id:p+'scout',type:'talk',npc:'scout',text:'중간 쉼터에서 정찰 담당과 대화',lines:lines(o.no,'scout','scout',scout)},
    {id:p+'node2',type:'node',n:2,text:'중심의 두 번째 신호 노드 파괴'},
    {id:p+'node3',type:'node',n:3,text:'중심의 마지막 신호 노드 파괴'},
    {id:p+'gate',type:'talk',npc:'gate',scene:'confront',text:'성채 앞 쉼터에서 왕의 문 담당과 대화',lines:lines(o.no,'gate','gate',{id:'gate',text:LORE.gate})},
    {id:p+'king',type:'king',scene:'ending',text:'왕의 방에서 왕 제압'},
    {id:p+'road',type:'travel',exit:'out',text:'구역 마을로 돌아가 주민과 대화',
      npc:'gate',lines:lines(o.no,'memory','gate',{id:'memory',text:LORE.memory})}];
  return L; }

// 왕을 제압한 직후 한 줄(기억 한 토막). 다시 남은 일(지도가 새로 만들어졌을 때)
const MEMORY={who:'',lore:'memory',text:LORE.memory};
const REDO={nodes:(n,t)=>`신호 노드를 다시 파괴 (${n}/${t})`,king:'왕의 방에서 왕 제압'};
const FREE='자유 탐색', NOTICE='목표 갱신';
const Q={town,zone,NPC,idle,content,lines,MEMORY,REDO,FREE,NOTICE};
if(typeof module!=='undefined') module.exports=Q;
if(typeof window!=='undefined') (window.PF=window.PF||{}).QUESTS=Q;
})();
