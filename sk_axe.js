// 참광 survival - BERSERKER (axe) skill set. Plan: _gen/v3/axe_plan.md. The normal skills live in axe_skills.js (window.AxeSkills),
// the three ultimates in axe_ult1.js / axe_ult2.js / axe_ult3.js (window.AxeUlt1..3). This file holds the table, the basic swing and the registration.
'use strict';
(()=>{
const X=RPG.sv, FSY=X.FSY, {V,A,SK,BODY,nearest,angTo,face,dmg,inSector,sfx}=X;
const K=window.K3, F=window.FX3, PI=Math.PI;
// fire as a black body: soot red -> crimson -> orange -> yellow -> white core. gold only for the runes and the light from above
const PAL={
  fire:{d:'#1a0602',b:'#8a1a06',m:'#ff5a14',h:'#fff4d8',l:'#ff6a1c',s:'#ffc24a'},
  ember:{d:'#220200',b:'#d81204',m:'#ff6a14',h:'#ffd070',l:'#ff3410',s:'#ff9a50'},
  gold:{d:'#2a1606',b:'#b8741e',m:'#ffd27a',h:'#fff6dc',l:'#ffae34',s:'#ffe6a0'},
  smoke:{c:'#1a1614',c2:'#5e5048'}
};
const ult=(id,name,lv,desc)=>({cls:'axe',type:'ult',name,lv,desc});
const sk={
  ax_basic:{cls:'axe',type:'basic',name:'도끼질',lv:1,desc:'거대한 도끼를 내려찍고 가로로 휘둘러 앞의 적을 벤다. 강화할수록 도끼 궤적의 불길이 커진다.'},
  ax_ult1:ult('ax_ult1','신부강림',1,'궁극기. 등 뒤의 불의 거인이 거대한 도끼를 내려치고, 금빛 룬진과 화염벽, 불의 용이 화면을 휩쓴 뒤 거대한 초승달 올려베기로 모든 적을 날려 버린다.'),
  ax_ult2:ult('ax_ult2','대지분쇄',5,'궁극기. 하늘 높이 뛰어올라 불덩이가 되어 내려찍고, 화면 끝까지 갈라진 땅에서 용암과 불기둥을 뿜어 모든 적을 띄운다.'),
  ax_ult3:ult('ax_ult3','천붕선풍',12,'궁극기. 도끼를 집채만 한 불의 도끼로 키워 한 바퀴 크게 휘둘러 주변을 전부 베고, 마지막에 땅을 내리쳐 화면 끝까지 불의 충격파를 터뜨린다.')
};
const L=id=>A.sLv(id);
const mk=(n,o)=>{ if(window.MK&&MK.on()) MK.play(n,o); };
const yawTo=a=>Math.atan2(Math.sin(a)/FSY,Math.cos(a));
// basic: chop and sweep in turn. The blow lands at the bottom of the swing (.2 s into the clip); the arc it leaves is a thick band of fire along the blade
let bn=0;
function basic(){ const e=nearest(420); if(!e) return false; const a=angTo(e); face(a); const chop=(bn++%2)===0, d=1700*A.mul('ax_basic'), lv=L('ax_basic');
  mk(chop?'xChop':'xSweep',{yaw:yawTo(a),blend:.05});
  after(.17,()=>{ const r=300+lv*14, hx=pl.x+Math.cos(a)*150, hy=pl.gy+Math.sin(a)*150;
    inSector(pl.x,pl.gy,a,r,chop?.7:1.25,t=>dmg(t,d,{kb:chop?.25:.45}));
    if(K){ K.cres(pl.x,pl.gy,BODY*.5,{reach:170+lv*8,dir:a,lean:chop?.85:.1,roll:chop?0:.2,tex:'v3_slash_heavy',pal:PAL.fire,gain:1.1});
      if(chop) K.cool(hx,hy,{kind:'crack2',r:150+lv*10,rot:a,pal:PAL.fire,life:1.1});
      GFX.light(hx,hy,320,PAL.fire.l,.6,.18); }
    sfx('slash',.7); });
  return true; }
const AS=window.AxeSkills||{sk:{},skills:{}};
Object.assign(sk,AS.sk);
const ults={};
for(const [id,mod] of [['ax_ult1',window.AxeUlt1],['ax_ult2',window.AxeUlt2],['ax_ult3',window.AxeUlt3]]) if(mod&&mod.cast) ults[id]=mod.cast;
window.AxeKit={PAL,mk,yawTo};
X.reg('axe',{sk,order:['ax_basic',...Object.keys(AS.sk),'ax_ult1','ax_ult2','ax_ult3'],
  basic:{fn:basic,cd:()=>.62*(1-.04*(L('ax_basic')-1))},skills:AS.skills,ults});
})();
