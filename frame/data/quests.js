(function(){
'use strict';
const browser=typeof window!=='undefined';
const LORE=browser?window.PF.LORE:require('./lore.js');
const regions=browser?window.PF.CONTENTS:require('./campaign.js');
const NPC={
  resident:{who:'전차길 주민',art:'npc_resident',spot:'npc_talk'},
  map:{who:'지도 담당',art:'npc_map',spot:'npc_map'},
  camp:{who:'마을 주민',art:'npc_resident',light:'cool'},
  neighbor:{who:'이웃 주민',art:'npc_archive',light:'warm'},
  scout:{who:'정찰 담당',art:'npc_resident',light:'warm'},
  gate:{who:'문지기',art:'npc_archive',light:'warm'}};
const face=k=>'assets/frame/'+NPC[k].art+'.webp';
const content=no=>regions[no??0];
function lines(no,section,npc,lore){
  const role={who:NPC[npc].who,face:face(npc)};
  const result=content(no)[section].map(line=>({...role,...line}));
  if(lore) result.unshift({...role,lore:lore.id,text:lore.text});
  return result;
}
function briefing(npc,id,words){
  const role={who:NPC[npc].who,face:face(npc)};
  return [{...role,lore:'town.'+id,text:LORE.town[id]},...words.map(text=>({...role,text}))];
}
const idleWords={camp:'해 지기 전에는 이 길로 돌아오세요.',scout:'길을 잃으면 이 쉼터의 등불을 찾으세요.',gate:'안으로 가기 전에 숨부터 고르세요.'};
const idle=k=>({who:NPC[k].who,face:face(k),text:idleWords[k]});
const town=[
  {id:'town.resident',type:'talk',npc:'resident',text:'전차길 주민에게 밤의 경보에 관해 묻기',
   lines:briefing('resident','resident',['어젯밤엔 끊긴 관제선에서 이백 년 전 교대 종이 울렸어요. 그때 당신 손등도 빛났다면서요.','옛 경계선을 넘었던 사람의 후손이라면, 동쪽 지도소에 들러 보세요.'])},
  {id:'town.map',type:'talk',npc:'map',text:'지도소에서 첫 관문의 위치 확인',
   lines:briefing('map','map',['먼저 칠 구역으로 가세요. 제비를 뽑은 시민이 왕좌에 앉는 곳이죠.','궁금한 게 있어요. 왕과 마주 섰을 때 당신 손등이 또 빛나는지, 돌아와서 말해 주겠어요?'])},
  {id:'town.road',type:'travel',exit:'east',npc:'map',text:'동쪽 전차길을 따라 빈 의자의 광장으로',
   note:{lore:'town.road',text:LORE.town.road},lines:briefing('map','road',['전차길이 끊기는 곳까지 걸으세요. 길 끝에 아직 기다리는 사람들이 있어요.'])}];

const fieldSteps={
  7:['대피 종의 환상로로 이동','첫 대피 신호 차단','두 번째 대피 신호 차단','마지막 대피 신호 차단'],
  6:['시험 공방의 코일 찾기','도입 코일 보정','분배 코일 보정','경계 시험기 보정'],
  5:['무신호 교환로에 진입','첫 교환소에 인편 전달','두 번째 교환소에 인편 전달','마지막 교환소에 인편 전달'],
  4:['두 증언석 중 한 곳으로 이동','첫 증언 확보','맞은편 증언 확보','속기대에 두 증언 등록'],
  3:['범람원의 물길 찾기','첫 복원 구획 살리기','두 번째 복원 구획 살리기','안쪽 복원 구획 살리기'],
  2:['부두의 출고 계량소 찾기','출고 화물 인수','서부 하역대 통과','성채 정산소에 화물 인도'],
  1:['도전장의 흰 선으로 이동','철문 도전자 제압','잿길 도전자 제압','왕좌의 도전자 제압'],
  0:['관제실 격리 회선 찾기','격리 계전기 차단','잔류 축전기 방전','기억 분리 단자 가동']
};
function zone(z,o={}){
  const no=o.final?0:Number(o.no??7-z), region=LORE.zone[no], f=fieldSteps[no], p='z'+z+'.';
  const camp=region?{id:'z'+no+'.camp',text:region.camp}:{id:'final',text:LORE.final};
  const scout=region?{id:'z'+no+'.scout',text:region.scout}:null;
  return [
    {id:p+'camp',type:'talk',npc:'camp',scene:'intro',text:no?'마을 주민의 사연 듣기':'마지막 교대소에서 관제 기록 읽기',lines:lines(no,'camp','camp',camp)},
    {id:p+'reach',type:'reach',at:'node',text:f[0]},
    {id:p+'node1',type:'node',n:1,text:f[1]},
    {id:p+'scout',type:'talk',npc:'scout',text:no?'중간 쉼터의 정찰 담당 만나기':'폐쇄 회선실에서 두 파형 대조',lines:lines(no,'scout','scout',scout)},
    {id:p+'node2',type:'node',n:2,text:f[2]},
    {id:p+'node3',type:'node',n:3,text:f[3]},
    {id:p+'gate',type:'talk',npc:'gate',scene:'confront',text:no?'왕을 만나기 전 문지기와 대화':'격리 준비실에서 마지막 점검',lines:lines(no,'gate','gate',region?{id:'gate',text:LORE.gate}:null)},
    {id:p+'king',type:'king',scene:'ending',text:no?'왕을 제압해 레온의 기억 받기':'아르카디아를 넘어 레온을 신호체에서 분리'},
    {id:p+'road',type:'travel',exit:'out',text:no?'살아 돌아온 왕의 소식 전하기':'교대소로 돌아가 마지막 일지 마치기',
      npc:'gate',lines:lines(no,'memory','gate',region?{id:'memory',text:LORE.memory}:null)}
  ];
}
const MEMORY={who:'',lore:'memory',text:LORE.memory};
const REDO={nodes:(n,t)=>`현장 목표 다시 달성 (${n}/${t})`,king:'왕의 방에서 왕 제압'};
const Q={town,zone,NPC,idle,content,lines,MEMORY,REDO,FREE:'자유 탐색',NOTICE:'목표 갱신'};
if(typeof module!=='undefined') module.exports=Q;
if(browser) window.PF.QUESTS=Q;
})();
