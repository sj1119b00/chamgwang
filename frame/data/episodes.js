(function(){
'use strict';
const regions=typeof window==='undefined'?require('./campaign.js'):window.PF.CONTENTS;
const events=['node1','node2','node3','kingHp50','signalHp50'];
const order=[7,6,5,4,3,2,1,0];
const EP=order.map((no,i)=>{
  const chapter=regions[no], scenes={intro:chapter.intro,confront:chapter.confront,ending:chapter.ending};
  if(chapter.interlude) scenes.interlude=chapter.interlude;
  const barks=events.flatMap(on=>(chapter[on]||[]).map(row=>({who:'정찰 담당',...row,on})));
  return {ep:i+1,title:chapter.title,scenes,barks};
});
const resident={on:'talk',who:'전차길 주민',face:'assets/frame/npc_resident.webp'};
const TALK={town_1:[
  {...resident,text:'전차도 다니지 않는데 저녁마다 선로를 닦는 이들이 있어요. 누군가 돌아올 길이니까요.'},
  {...resident,text:'발에 흙이 묻었네요. 오늘은 어느 마을에 다녀오셨어요?'}]};
if(typeof module!=='undefined') module.exports={EP,TALK};
if(typeof window!=='undefined'){ window.PF.EP=EP; window.PF.TALK=TALK; }
})();
