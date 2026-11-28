// 전투와 밸런스가 같은 직업 역할을 읽도록 등록된 프로필을 그대로 공유한다.
(function(){
if(typeof module!=='undefined') module.exports=require('../../engine/characters.js').profiles;
if(typeof window!=='undefined'){ const PF=window.PF=window.PF||{}; PF.CLASSES=window.GameCharacters.profiles; }
})();
