// 참광 엔진 - 품질 등급. 이펙트 양을 줄이는 기준을 이 한 곳에서 정한다.
//   high: PC
//   mid : 폰
//   low : 설정에서 "이펙트 품질 낮음"을 골랐거나, 가장 낮은 해상도에서도 느려서 자동으로 내려간 상태(FX3.auto)
// 정한 값은 GFX.QK(입자 수 배율)와 FX3.low(층 줄이기)에 넣어 준다. 스킬 파일은 지금처럼 그 둘만 읽으면 된다.
// 등급을 바꾸는 쪽(설정 버튼, 자동 낮추기)은 값을 바꾼 뒤 K3.tune()을 부른다. K3.tune은 여기 apply를 부른다.
// surv.js가 fx3.js보다 먼저 불러온다.
'use strict';
(()=>{
const ENG=window.ENG=window.ENG||{};
const QK={high:1,mid:.7,low:.4};
const opt=()=>(RPG.api&&RPG.api.SV&&RPG.api.SV.opt)||{};
const q=ENG.q={QK,tier:'high',qk:1,low:false,
  apply(){ const F=window.FX3, low=!!opt().lowfx||!!(F&&F.auto);
    q.tier=low?'low':COARSE?'mid':'high'; q.qk=QK[q.tier]; q.low=low;
    if(window.GFX) GFX.QK=q.qk;
    if(F) F.low=low;
    return q; }};
})();
