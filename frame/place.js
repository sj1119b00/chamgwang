// 장소 (설계 17.1): title, hero, town, field, secret, hard, rematch, endless 사이의 이동 규칙.
// 실제 전환(방 만들기, 전투 시작)은 on으로 등록한 쪽(town, field, challenge)이 한다. title과 hero는 hub.js의 기존 화면을 띄운다.
// 순수 부분(can, FIGHT)은 node 시험(frame/test/place.test.js)에서도 불러 쓴다.
(function(){
'use strict';
// 전투가 있는 장소. 여기서 연 창은 안전지대 밖이면 보기 전용이다(win.js)
const FIGHT=['field','secret','hard','rematch','endless'];
// 갈 수 있는 곳. 여기 없는 이동은 전부 막는다
const MOVES={title:['hero','town'],hero:['town'],town:['village','field','hard','rematch','endless','title','hero'],
  village:['town','village','field','hero','title'],field:['town','village','field','secret'],secret:['field','town'],hard:['town'],rematch:['town'],endless:['town']};
const can=(from,to)=>!!MOVES[from]&&MOVES[from].includes(to);
const P={FIGHT,can,cur:'title',safe:false};

if(typeof window!=='undefined'&&window.RPG){
  const subs=[];
  P.on=fn=>{ subs.push(fn); };
  P.go=function(to,params){
    const from=P.cur;
    if(!can(from,to)){ console.warn('PF.place: 갈 수 없는 이동 '+from+' → '+to); return false; }
    P.cur=to; P.safe=to==='town'||to==='village';
    for(const f of subs) f(to,from,params);
    if(to==='title'||to==='hero') RPG.hub.go(to);
    return true;
  };
  (window.PF=window.PF||{}).place=P;
}

if(typeof module!=='undefined') module.exports=P;
})();
