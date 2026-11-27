// 구역 번호 7의 이야기 초안. 게임의 방문 순서와 별도로 둔다.
(function(){
'use strict';
const section={
  heading:{draft:true,text:"제비를 놓는 손"},
  get title(){ return this.heading.text; },
  camp:[
    {draft:true,text:"자원해서 왔던 사람들의 마을입니다. 지금 여기서 제 손으로 고를 수 없는 게 하나 있습니다. 왕이 될 사람이죠."},
    {draft:true,text:"제비를 쥐고 성채로 간 사람을 보셨거든, 돌아와서 말 한마디만 전해 주세요."}
  ],
  scout:[
    {draft:true,text:"제비를 뽑는 날엔 누구도 먼저 손을 펴지 않아요. 뽑고 나면 어제까지 곁에 앉아 있던 사람을 왕이라고 불러야 하니까요."},
    {draft:true,text:"저 위에 있는 사람도 그날 여기 앉아 제 차례를 기다렸습니다."}
  ],
  gate:[
    {draft:true,text:"문 앞에 오면 다들 왕이라고만 부릅니다. 저는 제비를 쥐기 전의 그 손도 기억합니다."}
  ],
  closing:[
    {draft:true,text:"돌아오셨군요. 그 사람이 살아 있다는 말부터 듣고 싶었습니다."},
    {draft:true,text:"다음에 마주치면 전처럼 옆에 앉으라고 해야겠어요. 왕이라 불러야 하나 망설이다가, 그 쉬운 말을 잊고 살았네요."}
  ],
  idle:[
    {draft:true,text:"성채에서 돌아오시면 여기서 뵙겠습니다."}
  ],
  after:[
    {draft:true,text:"그 사람이 돌아오면 앉을 자리는 여기 있습니다."}
  ],
  sideOffer:[
    {draft:true,text:"정찰 나간 이에게 한마디 전해 주시겠어요? 제비를 뽑던 날, 곁에 있던 사람들이 아직 여기서 기다린다고요."}
  ],
  sideAfter:[{draft:true,text:"그분이 제 발로 돌아올 수 있다니, 이제야 저도 제비 뽑던 날 얘기를 할 수 있겠어요."}],
  sideVisit:[
    {draft:true,text:"그 말을 꼭 듣고 싶었어요. 제비를 뽑고 난 뒤에도 우리가 서로의 곁에 남는다는 말이요. 기다린다고 전해 주세요."}
  ],
  sideReport:[
    {draft:true,text:"그쪽에서도 기다린다고요? 다음번에는 제가 직접 가서 곁에 앉아야겠어요."}
  ],
  sideDone:[
    {draft:true,text:"말을 전해 주신 덕에 먼저 찾아갈 용기가 났습니다."}
  ],
  intro:[
    {draft:true,text:"제비를 어느 손에 감췄는지, 주민의 눈길이 잠시 빈손에 머문다."},
    {draft:true,who:"마을 주민",text:"이 손에는 아무것도 없지요. 그날 제 옆에 선 사람은 달랐습니다."}
  ],
  confront:[
    {draft:true,text:"제비는 이미 뽑혔고 나는 여기 서 있다. 그대는 무엇을 하러 왔나?"}
  ],
  ending:[
    {draft:true,text:"제비를 뽑은 왕이 천천히 손을 편다."}
  ],
  memory:[
    {draft:true,text:"왕이 움켜쥐던 손이 이제 비어 있습니다."}
  ],
  node1:[
    {draft:true,text:"저쪽 쉼터에서 기다릴게요. 제비를 뽑던 날 이야기를 들려드리죠."}
  ],
  node2:[{draft:true,who:"정찰 담당",text:"길이 열리고 있습니다. 성채 앞 쉼터에서 문지기를 만나세요."}],
  node3:[{draft:true,who:"정찰 담당",text:"성채까지 길이 뚫렸습니다. 안에는 제비를 뽑은 이가 있습니다."}],
  kingHp50:[{draft:true,who:"왕",text:"아직 손을 놓을 수는 없다."}],
};
if(typeof module!=='undefined') module.exports=section;
if(typeof window!=='undefined'){ const PF=window.PF=window.PF||{}; (PF.CONTENTS||(PF.CONTENTS={}))[7]=section; }
})();
