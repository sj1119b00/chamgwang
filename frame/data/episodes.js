// 이야기 자료 (설계 8장, 17.1). 모든 문구는 임시다: 이야기 내용은 아직 정하지 않았으므로 문구마다 "임시"나 "미정"을 넣는다.
// 화(ep)는 구역(zone)+1. 제목은 hub.js ZONES의 이름 그대로, 8화는 자리만 있는 마지막 화.
// 컷 {img?, video?, who?, text}: 장면(frame/story.js)의 한 장. 대사 {on, face?, who?, text}: on은 PF.field 사건 이름(node1~3, kingHp50)이나 'talk'
(function(){
'use strict';
const TITLES=['볼런티어 섹터','아나키 섹터','크레딧 섹터','리클레임 섹터','엘리트 섹터','다크넷 섹터','제네시스 섹터','마지막 화 (임시)'];
// 컷 그림(임시): hub.js가 구역 i의 지도에 쓰는 assets/menu/v_z<구역 번호>.webp(ZONES[i].no). 8화는 구역 그림이 없어 장면 그림을 빌린다
const IMG=['z7','z1','z2','z3','z4','z5','z6'].map(k=>'assets/menu/v_'+k+'.webp').concat('assets/frame/scene_b.webp');
const SLOT={intro:'도입',confront:'대면',ending:'마무리'};
// n번째 컷. who가 없으면 화자 이름 없이 자막만(설명하는 컷)
const cut=(ep,s,n,who)=>Object.assign({img:IMG[ep-1],text:`${ep}화 ${SLOT[s]}${n>1?' · 컷 '+n:''} — 내용 미정`},who?{who}:null);
const SPK='화자 미정';
const EP=TITLES.map((title,i)=>{ const ep=i+1;
  return {ep,title,
    scenes:{intro:[cut(ep,'intro',1),cut(ep,'intro',2,SPK)],confront:[cut(ep,'confront',1,SPK)],ending:[cut(ep,'ending',1),cut(ep,'ending',2,SPK)]},
    barks:[['node1','노드 1'],['node2','노드 2'],['node3','노드 3'],['kingHp50','왕 체력 절반']].map(([on,t])=>({on,who:SPK,text:'임시 대사 · '+t}))}; });
// 마을의 말만 하는 NPC(data/town.js의 npc_talk, act 'talk:town_1'). 얼굴은 그 NPC 그림의 윗부분
const RES={on:'talk',who:'주민 (임시)',face:'assets/frame/npc_resident.webp'};
const TALK={town_1:[{...RES,text:'임시 대사 · 주민 1'},{...RES,text:'임시 대사 · 주민 2'}]};
if(typeof module!=='undefined') module.exports={EP,TALK};
if(typeof window!=='undefined'){ const PF=window.PF=window.PF||{}; PF.EP=EP; PF.TALK=TALK; }
})();
