// 왕의 패턴 자료 (설계 17.3). 구역마다 패턴 3~4개를 공통 목록에서 골라 조합과 수치를 달리한다(이웃한 두 구역의 목록은 같지 않다).
// 패턴: slam 내려찍기(영웅 자리의 원), charge 돌진(왕에서 뻗는 띠, 왕이 실제로 띠를 따라 달린다), sweep 휩쓸기(왕 앞의 부채꼴),
// ring 고리 폭발(왕 둘레의 도넛, 안쪽은 안전), fan 탄 뿌리기(왕에서 뻗는 좁은 띠 여러 개가 한꺼번에), summon 부하 부르기(작은 원 자리에 잡몹, 피해 없음).
// from: 그 단계(1·2·3)부터 쓴다. dmg: 맞으면 최대 체력의 몫. gap: 패턴 사이 쉬는 시간(초) [최소, 최대].
// 길이는 바닥 평면 단위(frame/king.js: x는 월드와 같고 y는 월드 y/FSY). 영웅은 가로로 초당 430, 세로로 그보다 빠르게 걷는다.
// r 원 반지름 · len,w 띠 길이·폭 · half,r 부채꼴 반각(라디안)·반지름 · r0,r1 고리 안·바깥 반지름 · n,step 띠 수·띠 사이 각 · n,r,d,k 부하 자리 수·자리 반지름·영웅에서의 거리·자리마다 잡몹 수
(function(){
'use strict';
const KINGS=[
  {zone:0,gap:[1.8,2.6],patterns:[
    {id:'slam',from:1,dmg:.18,r:260},
    {id:'sweep',from:1,dmg:.20,r:720,half:.85},
    {id:'summon',from:1,dmg:0,n:3,r:110,d:460,k:3},
    {id:'charge',from:2,dmg:.22,len:1500,w:260}]},
  {zone:1,gap:[1.7,2.5],patterns:[
    {id:'slam',from:1,dmg:.20,r:270},
    {id:'charge',from:1,dmg:.22,len:1600,w:270},
    {id:'summon',from:2,dmg:0,n:3,r:110,d:480,k:3},
    {id:'ring',from:3,dmg:.24,r0:380,r1:950}]},
  {zone:2,gap:[1.6,2.4],patterns:[
    {id:'sweep',from:1,dmg:.20,r:760,half:.9},
    {id:'ring',from:1,dmg:.22,r0:380,r1:980},
    {id:'slam',from:2,dmg:.22,r:270},
    {id:'fan',from:3,dmg:.24,n:5,w:110,len:1400,step:.4}]},
  {zone:3,gap:[1.5,2.3],patterns:[
    {id:'fan',from:1,dmg:.22,n:5,w:110,len:1450,step:.4},
    {id:'charge',from:1,dmg:.24,len:1700,w:280},
    {id:'summon',from:1,dmg:0,n:4,r:110,d:500,k:3},
    {id:'slam',from:3,dmg:.26,r:270}]},
  {zone:4,gap:[1.4,2.2],patterns:[
    {id:'ring',from:1,dmg:.24,r0:390,r1:1000},
    {id:'slam',from:1,dmg:.24,r:275},
    {id:'fan',from:2,dmg:.24,n:7,w:110,len:1500,step:.36},
    {id:'charge',from:3,dmg:.26,len:1800,w:290}]},
  {zone:5,gap:[1.3,2.0],patterns:[
    {id:'sweep',from:1,dmg:.24,r:800,half:.95},
    {id:'fan',from:1,dmg:.25,n:7,w:110,len:1500,step:.36},
    {id:'summon',from:2,dmg:0,n:4,r:120,d:520,k:4},
    {id:'ring',from:3,dmg:.28,r0:400,r1:1050}]},
  {zone:6,gap:[1.2,1.9],patterns:[
    {id:'charge',from:1,dmg:.26,len:1900,w:300},
    {id:'ring',from:1,dmg:.26,r0:400,r1:1050},
    {id:'fan',from:2,dmg:.28,n:7,w:120,len:1600,step:.34},
    {id:'slam',from:3,dmg:.30,r:280}]}];
KINGS.push({zone:7,gap:[1.6,2.2],patterns:[
  {id:'sweep',from:1,dmg:.22,r:850,half:.92},
  {id:'slam',from:1,dmg:.24,r:295},
  {id:'charge',from:2,dmg:.26,len:1600,w:285}],
  signal:{gap:[1.3,2.0],patterns:[
    {id:'fan',from:1,dmg:.22,n:7,w:105,len:1680,step:.34},
    {id:'ring',from:1,dmg:.24,r0:410,r1:990},
    {id:'summon',from:2,dmg:0,n:3,r:110,d:540,k:2},
    {id:'slam',from:3,dmg:.27,r:280}]}});
const signatures=[
  ['bell','#67e5d2','#ffce79',{slam:'마지막 대피 종',sweep:'종루의 반향',summon:'야간 당번 소집',charge:'광장 비상 돌파'}],
  ['turbine','#ff9949','#6eeaf2',{slam:'과열 압력추',charge:'시험선 터빈',summon:'보조 동력 점화',ring:'삼축 과부하'}],
  ['mirror','#d562fc','#9dceff',{sweep:'거울면 절삭',ring:'폐쇄망 반전',slam:'검열 조각',fan:'분기된 암호'}],
  ['senate','#c8a8ff','#ffdf84',{fan:'의회의 일곱 창',charge:'의장 행차',summon:'호위 의결',slam:'철회된 표결'}],
  ['banksia','#92dc77','#ffd98e',{ring:'첫 숲의 물결',slam:'뿌리의 역류',fan:'종자 일제 방출',charge:'범람원의 쇄도'}],
  ['bullion','#f4c563','#e8fff1',{sweep:'금고 저울의 진자',fan:'금화 압인',summon:'채권 회수',ring:'중앙 금고 봉쇄'}],
  ['iron','#ff6044','#ffe2a3',{charge:'철권 돌파',ring:'잿빛 투기장',fan:'쇄도하는 철편',slam:'왕좌 분쇄'}],
  ['root','#26e3df','#529aff',{sweep:'접근 권한 회수',slam:'좌표 덮어쓰기',charge:'루트 경로 재지정'}],
  ['signal','#b69aff','#fff29d',{fan:'일곱 광맥',ring:'신호 탈동기화',summon:'잔향 복원',slam:'백색 공명'}]
];
for(const [index,[key,color,light,names]] of signatures.entries()){
  const owner=index===8?KINGS[7].signal:KINGS[index];
  owner.art={key,color,light};
  for(const pattern of owner.patterns) pattern.name=names[pattern.id];
}
if(typeof module!=='undefined') module.exports=KINGS;
if(typeof window!=='undefined') (window.PF=window.PF||{}).KINGS=KINGS;
})();
