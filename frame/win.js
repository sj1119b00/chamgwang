// 창 (설계 5.2, 17.9): 현재 장소 위에 지도와 스킬·장비·기록·설정 화면을 띄운다.
// 창은 한 번에 하나. 열려 있는 동안 뒤 장소는 갱신도 그리기도 멈춘다(PF.heat.hold). 전투 장소의 안전지대 밖에서는 보기만 된다.
// boot.js가 place.js 다음에 붙인다. 전역 lock(index.html)을 쓴다
(function(){
'use strict';
const G=window.RPG, A=G.api, el=A.menuEl, PF=window.PF;
// 메뉴 애니메이션은 보이는 동안에만 예약한다. 구역 바닥은 전투를 실제로 그리는 시점에 맞춘다.
G.frame.runMenuAnimation=function(visible,paint,swapFloor){
  let timer=null;
  const showing=()=>!document.hidden&&visible();
  function menuTick(){
    timer=null;
    if(!showing()) return;
    paint(performance.now());
    timer=setTimeout(menuTick,1000/30);
  }
  function changed(){
    if(showing()){if(timer===null) menuTick();}
    else if(timer!==null){clearTimeout(timer);timer=null;}
  }
  new MutationObserver(changed).observe(el,{childList:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',changed);
  const draw=render;
  render=function(){swapFloor();return draw.apply(this,arguments);};
  changed();
};
// map은 frame/map.js가 그린다. 나머지는 hub 화면이고, 기록과 설정은 같은 guild 화면을 나눠 보인다.
const WINDOWS={map:'map',skills:'train',gear:'smith',records:'guild',settings:'guild'};
// 보기 전용에서 누를 수 없는 버튼: hub.js menuOverride의 on('[data-…]') 가운데 상태를 바꾸는 것
// (스킬 강화, 장비 장착·분해·제작·강화, 스킬 색 선택·구매, 후손 교체, 구역 진입, 모의 전투 시작).
// 화면 이동(data-go), 탭(data-tab), 구역 고르기(data-q, 지도), 후손 보기(data-h), 설정(data-opt, data-spd)은 그대로 된다
const RO='[data-up],[data-eq],[data-sell],[data-buy],[data-upg],[data-cz],[data-go=hero],[data-act=pick],[data-act=embark],[data-act=practice]';
const W={WINDOWS,cur:null,readOnly:false};
// 연 곳이 전투 장소였는지(창이 열린 사이에 장소가 바뀌어도 닫을 때 연 쪽 기준으로 되돌린다), 열 때 영웅의 x와 카메라
let fight=false, x0=null, c0=null;
const cls=()=>['pf-win','pf-w-'+W.cur].concat(W.readOnly?['pf-ro']:[]);

W.open=function(id,tab){
  const P=PF.place;
  if(!WINDOWS[id]||P.cur==='title'||P.cur==='hero') return false;
  if(id==='map'&&(!PF.map||!PF.map.area())) return false;
  if(W.cur) W.close();
  if(PF.story?PF.story.busy()||PF.story.cur:lock) return false;
  fight=P.FIGHT.includes(P.cur);
  W.readOnly=fight&&!P.safe;
  W.cur=id; x0=pl.x; c0={x:cam.x,fx:cam.fx,y:cam.y,fy:cam.fy};
  // 도중에 실패하면(hub.js 화면 그리기 등) 반쯤 열린 채 멈춰 있지 않게 모두 닫은 상태로 되돌린다
  try{
    // 게임 자체의 일시정지(#rpause)도 켜지지만 frame.css가 창 뒤로 숨긴다
    if(fight) A.setPause(true);
    PF.heat.hold=true;
    el.classList.add('on',...cls());
    if(id==='map') PF.map.mount(el,tab||'zone');
    else G.hub.go(WINDOWS[id]);
  }catch(err){
    console.error('frame/win.js: 창('+id+')을 열지 못해 닫았다',err);
    W.close();
    return false;
  }
  return true;
};
W.close=function(){
  if(!W.cur) return;
  if(W.cur==='map') PF.map.unmount();
  el.classList.remove('on','pf-win','pf-w-'+W.cur,'pf-ro');
  W.cur=null; W.readOnly=false; x0=c0=null;
  PF.heat.hold=false;
  if(fight) A.setPause(false);
  fight=false;
  // 창이 열려 있는 동안 눌린 이동 키와 잡고 있던 조이스틱이 닫은 뒤에 남지 않게 한다
  const V=G.sv.V, joy=document.getElementById('sjoy');
  V.keys={}; V.joy=null;
  if(joy) joy.classList.remove('act');
};

// 기존 화면의 "← 기지"(data-go=town)와 "타이틀 화면"(data-go=title)은 창을 닫는다. 보기 전용이면 그린 뒤 RO 버튼을 끈다
const mo=G.menuOverride;
G.menuOverride=function(e){
  if(W.cur==='map') return;
  if(W.cur&&(G.hub.scr==='town'||G.hub.scr==='title')){ W.close(); return; }
  const r=mo.apply(this,arguments);
  if(W.cur&&W.readOnly) e.querySelectorAll(RO).forEach(b=>{ b.disabled=true; });
  return r;
};
// 창 안의 "구역 진입"·"시뮬레이션 시작"은 hub.js가 바로 전투를 연다. 창을 먼저 닫지 않으면 멈춘 채 아무것도 보이지 않는다
const ss=G.survStart;
G.survStart=function(){ W.close(); return ss.apply(this,arguments); };
// 키보드는 rpg.js의 keydown·keyup이 전투 중 전부 survKey로 넘긴다(메뉴 모드에서는 rpg.js가 게임에 넘기지 않는다).
// 창이 열려 있으면 이동·대쉬·궁극기·일시정지 키가 뒤 전투에 닿지 않게 받기만 하고, Esc는 창을 닫는다.
// 창을 닫은 Esc를 누른 채 있으면 그 키의 반복 입력은 뗄 때까지 받기만 한다(닫힌 뒤 전투의 일시정지를 켰다 껐다 하지 않게)
const sk=G.survKey;
let escHeld=false;
G.survKey=function(e,down){
  if(e.code==='KeyM'){
    if(down&&!e.repeat){
      if(W.cur==='map') W.close();
      else if(!W.cur&&!G.paused&&!G.sv.V.over&&G.frame.run) W.open('map');
    }
    e.preventDefault();
    return;
  }
  if(e.code==='Escape'&&escHeld){ if(down&&e.repeat) return; escHeld=false; }
  if(!W.cur) return sk.apply(this,arguments);
  if(down&&e.code==='Escape'&&!e.repeat){ escHeld=true; W.close(); }
};

// 화면이 꺼졌다 켜지거나 크기·방향이 바뀌면 열린 창의 상태를 다시 맞춘다(멈춤 유지)
function sync(){
  if(!W.cur) return;
  PF.heat.hold=true;
  if(fight&&!G.paused) A.setPause(true);
  el.classList.add('on',...cls());
  // index.html의 resize()는 궁극기 중이 아니면 영웅을 pl.home으로 옮기고, 화면 폭이 바뀌면 카메라를 화면 가운데로 옮긴다.
  // 닫았을 때 멈춘 자리·화면에서 그대로 이어지게 되돌린다
  pl.x=pl.home=x0;
  Object.assign(cam,c0);
}
addEventListener('resize',sync);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) sync(); });

PF.win=W;
})();
