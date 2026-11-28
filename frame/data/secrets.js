// 중앙 전차길과 시민 구역의 숨은 기록, 대피소와 배급 지하로.
// Secret {id, kind:'trace'|'dungeon'|'zone', zone:구역 번호|'town', x, y, open:{type:'near'|'found', ids?}, content:{credits?, repeat?, bark?, scene?, room?}}
// 보상: credits는 처음(발견 기록이 처음 적힐 때) 다 주고, repeat가 있으면 다음부터는 credits×repeat(반올림). repeat가 없으면(흔적) 들어올 때마다 다 준다
// 자리 좌표: 구역의 자리는 그 구역 지도의 시작점(dun.js가 지도를 만드는 영웅 자리 = 입구 안전지대 중심)에서 잰 월드 거리.
// dun.js는 구역마다 같은 씨앗으로 지도를 만들어 매번 같은 모양이다. 마을의 자리는 마을 지도 좌표(frame/data/town.js의 자리 town_t1과 같은 곳).
// open: near는 다가가 누르면 된다(던전·숨은 구역은 구역을 깬 뒤에만), found는 ids를 모두 찾아야 보인다.
// room은 room.js의 RoomDef: 좌표는 방 왼쪽 위가 0,0. act 'portal:back'은 돌아가기 포탈, 'read'는 기록 지점(누르면 scene)
(function(){
'use strict';
// 구역마다 dun.js build()가 만드는 보급 상자 6 + 레온의 기록 단말 2 (구역 0~7 모두 실측 8. 구역 7은 ch 6 지도를 빌린다)
const BUILTIN=8;
// 대피소 명부는 독립적으로 발견하고 회상하므로 본편의 화 번호와 겹치지 않는다.
// 화 번호 100 이상은 사냥터의 화가 아니다(story.js는 구역+1인 1~8화만 사냥터 사건에 쓴다). secret.js는 100 이상만 붙인다.
// head는 장면 꼬리표와 다시 보기 이름("N화 · 제목" 대신)
const EP=[{ep:100,title:'빈 의자의 명부',head:'숨은 기록 · 빈 의자의 명부',scenes:{intro:[
  {img:'assets/frame/story/shelter-ledger.webp',text:'옛 대피소 벽에 널빤지 하나가 매달렸다. 제비를 뽑은 사람들의 자리가 차례로 그려져 있다.'},
  {img:'assets/frame/story/citizens.webp',text:'오늘의 당번도 이 표에 점 하나를 남겼다. 왕이 되기 전에 앉던 자리로 돌아올 수 있게.'}
]}}];
const back=(x,y)=>({id:'back',kind:'portal',x,y,r:200,label:'돌아가기',act:'portal:back'});
// 배급 지하로에는 세 경비 무리와 문지기가 있고, 대피소에는 당번 명부가 남아 있다.
const DUNGEON={id:'secret',w:2400,h:1600,floor:'assets/menu/f_z5.webp',accent:'#B98CFF',start:{x:1200,y:1380},
  spots:[back(800,1530)],
  foes:[{type:'shard',x:600,y:760,n:6},{type:'shard',x:1800,y:760,n:6},{type:'archer',x:1200,y:1000,n:4}],
  boss:{type:'brute',x:1200,y:420}};
const ZONE={id:'secret',w:2000,h:1400,floor:'assets/menu/f_z3.webp',accent:'#58FFA8',start:{x:1000,y:1180},
  spots:[back(640,1220),{id:'read',kind:'mark',x:1000,y:640,r:170,label:'대피소 당번 명부',act:'read'}]};
const SECRETS=[
  {id:'z0_t1',kind:'trace',zone:0,x:-820,y:140,open:{type:'near'},
    content:{credits:30,bark:{on:'trace:z0_t1',who:'닳은 표식',text:'접힌 제비와 같은 표식이다. 대피소의 옆문을 가리키고 있다.'}}},
  {id:'z0_d1',kind:'dungeon',zone:0,x:800,y:-250,open:{type:'near'},content:{credits:200,repeat:.2,room:DUNGEON}},
  {id:'z0_h1',kind:'zone',zone:0,x:-800,y:-300,open:{type:'found',ids:['z0_t1']},content:{credits:100,repeat:.2,scene:'ep100.intro',room:ZONE}},
  {id:'town_t1',kind:'trace',zone:'town',x:7650,y:3350,open:{type:'near'},
    content:{credits:30,bark:{on:'trace:town_t1',who:'전차길에 남긴 글',text:'마지막 차가 끊긴 날. 돌아올 사람이 남아 있는 한, 동쪽 선로를 걷어내지 않기로 했다.'}}}];
if(typeof module!=='undefined') module.exports={SECRETS,BUILTIN,EP};
if(typeof window!=='undefined'){ const PF=window.PF=window.PF||{}; PF.SECRETS=SECRETS; PF.SECRET_BUILTIN=BUILTIN; PF.SECRET_EP=EP; }
})();
