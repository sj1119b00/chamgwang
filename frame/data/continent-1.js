// 구역 번호 1의 이야기 초안. 게임의 방문 순서와 별도로 둔다.
(function(){
'use strict';
const section={
  heading:{draft:true,text:"도전이 끝난 자리"},
  get title(){ return this.heading.text; },
  camp:[
    {draft:true,text:"여기서 누가 왕인지 알고 싶으면, 가장 최근에 누가 일대일로 이겼는지 물으세요."},
    {draft:true,text:"쉽게 물을 말은 아닙니다. 그 대답을 듣자마자 또 도전하러 가는 사람도 있으니까요."}
  ],
  scout:[
    {draft:true,text:"누구든 지금 도전할 수 있지요. 그래서 싸움이 끝나도 사람들은 자리를 뜨지 않아요. 다음에 누가 앞으로 나설지 보려고요."},
    {draft:true,text:"저는 쓰러진 쪽을 보려고 남습니다. 그쪽에도 일어서서 돌아갈 길은 있어야죠."}
  ],
  gate:[
    {draft:true,text:"문 안으로는 한 사람씩 들어갑니다. 이 길을 다시 나올 때도 제 발로 나올 수 있게 해 주십시오."}
  ],
  closing:[
    {draft:true,text:"성채 쪽으로 사람들이 몰려갔는데 당신은 이리로 돌아왔군요."},
    {draft:true,text:"누가 이겼느냐고 묻는 대신, 저도 오늘은 이렇게 물으렵니다. 두 사람 다 살아 있습니까?"}
  ],
  idle:[
    {draft:true,text:"성채에서 돌아오는 길은 이쪽입니다."}
  ],
  after:[
    {draft:true,text:"누가 다음에 도전할지는 몰라도, 오늘 이 싸움에서 둘 다 살아 돌아온 건 압니다."}
  ],
  sideOffer:[
    {draft:true,text:"쉼터에 가시면 정찰 담당에게 좀 물어 주세요. 다들 이긴 사람을 볼 때 그이는 어디를 보고 있는지요."}
  ],
  sideAfter:[{draft:true,text:"당신이 돌아와서 오늘 싸움의 끝을 얘기해 줬어요. 성채 쪽을 보는 사람들에게도 들려주고 싶습니다."}],
  sideVisit:[
    {draft:true,text:"쓰러진 쪽을 봅니다. 이긴 사람 이름만 부르면, 넘어진 사람이 일어섰는지 아무도 모르잖아요."}
  ],
  sideReport:[
    {draft:true,text:"넘어진 쪽을 본다고요. 다음 도전 때는 저도 그쪽을 보겠습니다."}
  ],
  sideDone:[
    {draft:true,text:"이번에는 둘 다 일어서는 걸 보고 돌아오려 합니다."}
  ],
  intro:[
    {draft:true,text:"일대일로 선 두 사람 사이에 길 하나가 비어 있다."}
  ],
  confront:[
    {draft:true,text:"도전은 언제든 받는다. 이 앞에 선 건 그대 한 사람인가?"}
  ],
  ending:[
    {draft:true,text:"왕은 무릎을 짚는다. 다음 도전자의 발소리 대신 두 사람의 숨소리가 들린다."}
  ],
  memory:[
    {draft:true,text:"싸움은 끝났습니다. 마을로 돌아갈 때입니다."}
  ],
  node1:[
    {draft:true,text:"쉼터로 오세요. 싸움이 끝나고 나면 누가 남는지 말씀드리죠."}
  ],
  node2:[{draft:true,who:"정찰 담당",text:"길이 한 갈래 남았습니다. 성채 앞에서 다시 만납시다."}],
  node3:[{draft:true,who:"정찰 담당",text:"이제 성채 앞까지 갈 수 있습니다. 문 안에서는 혼자 마주 서게 됩니다."}],
  kingHp50:[{draft:true,who:"왕",text:"아직 내 두 발이 땅에 붙어 있다."}],
};
if(typeof module!=='undefined') module.exports=section;
if(typeof window!=='undefined'){ const PF=window.PF=window.PF||{}; (PF.CONTENTS||(PF.CONTENTS={}))[1]=section; }
})();
