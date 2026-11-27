// 프로메테우스 틀(frame) 켜기: index.html?rpg&frame 에서만 불린다(설계 12장).
// 게임 파일들(rpg.js, surv.js, hub.js, dun.js)이 다 뜬 뒤 frame/ 파일들을 적힌 순서대로 붙인다.
(function(){
'use strict';
window.PF=window.PF||{};
// 붙일 파일과 차례(뒤 파일은 앞 파일이 만든 PF.*와 앞 파일이 감싼 전역 위에 다시 감싼다):
// save → ultimate → combat-sound → place → win → art → spots → room → data/town → town → field → data/kings → king → data/episodes → story → data/secrets → secret
// → data/dps → data/classes → data/clscal → balance → ads → challenge → road → data/lore → data/quests → quest → data/world → map → minimap → combat-hud → phoenix → admin.
// 스타일은 save보다 먼저 넣고, heat.js는 index.html이 이 파일 다음 줄에서 붙인다.
const FILES=['save','ultimate','combat-sound','place','win','art','spots','room','data/town','town','field','data/kings','king','data/continent-7','data/continent-1','data/episodes','story','data/secrets','secret','data/dps','data/classes','data/clscal','balance','ads','challenge','village','continent','road','data/lore','data/quests','quest','side','data/world','map','minimap','combat-hud','phoenix','admin'];
// frame 파일들이 쓰는 게임 쪽 값: rpg.js(RPG.api)·surv.js(RPG.sv)·hub.js(RPG.hub)·dun.js(RPG.dun)의 내보내기 줄과 RPG의 갈고리.
// 이 줄들은 다른 작업이 고치므로 하나라도 빠지면 frame을 켜지 않는다(켜 두면 사냥터를 떠날 때·파일을 붙일 때 오류가 난다).
// dun.result는 frame이 직접 부르지 않지만 hub.js settle이 정산 몫을 따로 받지 않을 때 부른다.
// king.js만 쓰는 효과·소리 도움 함수(sv.sfx, sv.burst, sv.fring)는 넣지 않는다: king.js가 없으면 건너뛴다(효과·소리 정리로 저장·마을·이야기까지 꺼지지 않게)
const NEED=['hub.settle','hub.H','hub.scr','hub.qSel','hub.ZONES','hub.RAR','hub.stat','hub.go','dun.M','dun.on','dun.result',
  'sv.V','sv.FSY','sv.BODY','sv.EN.node','sv.CLS','sv.CLS_ORDER','sv.CHAP','sv.NAMES','sv.spawn','sv.view','sv.hurt',
  'api.menuEl','api.SV','api.ORDER','api.SK','api.menuRender','api.gainExp','api.maxHp','api.needExp','api.setPause','api.isTouch','api.toast',
  'menuOverride','survKey','survStart','survEnd','hubResult'];
// 빠진 이름들. 이름(게터 포함)이 있는지만 본다: 값은 비어 있을 수 있다(dun.M은 구역 밖에서 null, hub.qSel은 처음에 null)
const missing=()=>NEED.filter(p=>{ let o=RPG; for(const k of p.split('.')){ if(o==null||!(k in Object(o))) return true; o=o[k]; } return false; });
// frame은 rpg.js 위에서만 돈다(rpg.js는 이 파일보다 먼저 실행된다)
if(!window.RPG) return;
// 옛 두 저장(chamgwang_rpg_v1, chamgwang_hub_v1)은 frame이 켜진 순간부터 읽기만 한다. save.js가 뜨기 전에도 쓰지 않게 먼저 막는다
RPG.noSave=true;
// save.js가 저장을 불러오기 전에 누른 것은 load에 덮인다. 그래서 frame 파일이 다 뜰 때까지 화면 입력(누르기·키보드 초점)을 막는다
const wall=document.createElement('div'), menu=RPG.api&&RPG.api.menuEl;
wall.id='pfwait'; wall.style.cssText='position:fixed;inset:0;z-index:2147483647;touch-action:none';
document.body.appendChild(wall);
if(menu) menu.inert=true;
// 게임 파일이 끝내 다 뜨지 않으면(dun.js 실패 등) 이 시간 뒤 막기를 풀고 옛 저장 방식으로 둔다. 시험에서는 주소의 pfwait=밀리초로 줄인다
const T0=performance.now(), LIMIT=+new URLSearchParams(location.search).get('pfwait')||20000;
// 막기를 풀고, frame을 켜지 못했으면(cause: 까닭) 저장을 정한다. 새 저장(prometheus_save_v1)이 이미 있으면 옛 두 키의 멈춘 진행에 저장을 돌리지 않는다:
// 저장을 끈 채 두고 화면에 새로 고침을 알린다. 새 저장이 없으면 옛 저장 방식으로 둔다
function ready(cause){
  wall.remove();
  if(menu) menu.inert=false;
  if(PF.save&&PF.save.data) return;
  let had=false;
  try{ had=localStorage.getItem('prometheus_save_v1')!=null; }catch(e){}
  RPG.noSave=had;
  console.error('frame/boot.js: '+cause+' · '+(had?'새 저장이 있어 저장을 끈 채 두고 새로 고침을 알린다':'frame을 켜지 않고 옛 저장 방식으로 둔다'));
  if(had) notice();
}
// 새로 고침 알림: 화면 위 가운데 한 줄(hub.js 판과 같은 어두운 청록 판에 빛나는 테두리). 누르기를 막지 않는다. frame.css가 없을 수 있어 모양을 여기 적는다
function notice(){ const n=document.createElement('div'); n.id='pfnotice'; n.setAttribute('role','status');
  n.textContent='새 진행을 불러오지 못했습니다. 이 화면에서 한 진행은 저장되지 않습니다. 새로 고침해 주세요.';
  n.style.cssText='position:fixed;left:0;right:0;top:10px;margin:0 auto;width:max-content;max-width:calc(100vw - 32px);z-index:2147483646;pointer-events:none;box-sizing:border-box;padding:7px 14px;'+
    'font:600 13px/1.4 "Noto Sans KR","Malgun Gothic",sans-serif;color:#E4FBFF;text-align:center;text-shadow:0 0 6px rgba(127,243,255,.6);'+
    'background:linear-gradient(170deg,rgba(16,30,32,.86),rgba(6,13,14,.9));border:1px solid rgba(127,243,255,.5);box-shadow:0 0 14px rgba(127,243,255,.28),inset 0 0 12px rgba(127,243,255,.1)';
  document.body.appendChild(n); }
(function boot(){
  if(!(RPG.sv&&RPG.hub&&RPG.dun)){
    if(performance.now()-T0<LIMIT) return setTimeout(boot,120);
    return ready('게임 파일이 '+LIMIT+'ms 안에 다 뜨지 않았다');
  }
  const miss=missing();
  if(miss.length) return ready('게임 쪽 값이 없다('+miss.join(', ')+')');
  RPG.noSave=true;
  // 월드 시작점과 전투 시야는 화면의 논리 크기를 쓴다. 해상도 배율의 반 픽셀 반올림은 그림에만 적용한다.
  let viewWidth=VW, viewHeight=VH, viewScale=1;
  function measureView(){
    if(!innerWidth||!innerHeight) return;
    viewWidth=innerWidth; viewHeight=innerHeight;
    viewScale=Math.min(viewHeight/VH,viewWidth/950);
  }
  measureView(); addEventListener('resize',measureView);
  RPG.frame={run:null,worldView(zoom){return {hw:viewWidth/(2*viewScale*zoom),hh:viewHeight/(2*viewScale*zoom)};}};
  // 크기가 바뀌어 새로 할당한 굴절 버퍼는 검은색이다. 다음 합성 전에 GFX의 기존 중성색 초기화를 한 번 수행한다.
  if(gl){
    function attachEffects(){
      const effects=window.GFX;
      if(typeof effects?.resize!=='function') return;
      const resizeEffects=effects.resize;
      effects.resize=function(){
        const result=resizeEffects.apply(this,arguments);
        effects.wasClear=false;
        return result;
      };
      effects.wasClear=false;
      document.removeEventListener('load',attachEffects,true);
    }
    document.addEventListener('load',attachEffects,true);
    attachEffects();
  }
  for(const sheet of ['frame','map']){
    const css=document.createElement('link'); css.rel='stylesheet'; css.href='frame/'+sheet+'.css'; document.head.appendChild(css);
  }
  const add=(f,done)=>{ const s=document.createElement('script'); s.src='frame/'+f+'.js'+(f==='phoenix'?'?v=2':''); s.async=false;
    if(done) s.onload=s.onerror=done;
    document.head.appendChild(s); };
  // FILES[0]은 save. 나머지는 PF.save.data(story 등)를 쓰므로 저장을 불러오지 못했으면 붙이지 않는다
  add(FILES[0],()=>{ const rest=FILES.slice(1);
    if(!(PF.save&&PF.save.data)) return ready(PF.save?'저장을 불러오지 못했다(frame/save.js 오류)':'frame/save.js를 받지 못했다');
    if(!rest.length) return ready();
    rest.forEach((f,i)=>add(f,i===rest.length-1?ready:null)); });
})();
})();
