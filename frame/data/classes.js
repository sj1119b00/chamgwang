// 직업의 역할 자료 (Task 15, 설계 17.8). frame/balance.js가 읽는다: 근접은 한 마리 상대(큰 몹·노드·왕)를 10% 빨리 잡고 받는 피해가 20% 적다(balance.js ROLE).
// 이 목록에 없는 직업(새로 붙인 직업)은 원거리로 다룬다. 직업 목록 자체는 surv.js CLS_ORDER가 정한다(여기서 목록을 세지 않는다)
(function(){
const CLASSES={sword:{role:'melee'},fist:{role:'melee'},assassin:{role:'melee'},axe:{role:'melee'},
  mage:{role:'ranged'},pyro:{role:'ranged'},shaman:{role:'ranged'},archer:{role:'ranged'},gunner:{role:'ranged'}};
if(typeof module!=='undefined') module.exports=CLASSES;
if(typeof window!=='undefined'){ const PF=window.PF=window.PF||{}; PF.CLASSES=CLASSES; }
})();
