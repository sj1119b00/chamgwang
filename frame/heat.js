// 발열 대책: 게임 화면은 초당 30장, 해상도는 기기 여유에 맞게 조절한다.
// 창이 열리면 뒤 장면 정지(hold), 절전(saver)·간소화(lite) 설정.
// 순수 부분(cap, nextScale)은 node 시험(frame/test/heat.test.js)에서도 불러 쓴다.
(function(){
'use strict';
const TARGET_FPS=30, START_COARSE=1.25;
// 가장 낮은 배율, 올렸다가 되돌린 뒤 다시 올리지 않는 시간(밀리초)
const FLOOR=.75, HOLD=180000;
// 이번 화면을 그려야 하면 true. 120Hz 폰에서 8.3ms 두 번이 16.6ms로 찍혀도 장을 놓치지 않게 1ms 여유를 둔다
function cap(now,last,fps){ return now-last>=1000/fps-1; }
// 60장 기준으로 환산한 평균 시간이 1/58초보다 짧으면 0.25 올리고 1/45초보다 길면 0.25 내린다.
function nextScale(cur,avgFrameSec,coarse){
  const n=avgFrameSec<1/58?cur+.25:avgFrameSec>1/45?cur-.25:cur;
  return Math.min(coarse?1.5:2,Math.max(FLOOR,n));
}
// 5초마다 한 번: 다음 배율(rs)과 효과를 줄일지(thin). h는 부르는 쪽이 들고 있는 기록 {up: 마지막으로 올리기 전 배율, until: 이때(밀리초)까지 올리지 않는다}, max는 상한(절전).
// 올린 배율이 그 앞 배율까지 다시 내려가면(올림이 버티지 못함) 3분 동안 올리지 않는다(5초마다 1.0 ↔ 1.25로 바뀌며 resize가 캔버스를 다시 만들지 않게).
// 가장 낮은 배율에서도 평균이 1/38초보다 길면 효과를 줄인다: index.html frame이 하던 마지막 대책. heat.js가 그쪽 측정(perfT)을 쉬게 하므로 여기서 한다
function plan(h,cur,avgFrameSec,coarse,now,max=Infinity){
  let rs=Math.min(max,nextScale(cur,avgFrameSec,coarse));
  if(rs>cur){ if(now<h.until) rs=cur; else h.up=cur; }
  else if(rs<cur){ if(h.up!=null&&rs<=h.up) h.until=now+HOLD; h.up=null; }
  return {rs,thin:cur<=FLOOR&&avgFrameSec>1/38};
}
const pure={TARGET_FPS,START_COARSE,cap,nextScale,plan};
if(typeof module==='object'&&module.exports) module.exports=pure;
if(typeof window==='undefined') return;

// ---- 브라우저: index.html의 전역(frame, RS, resize, COARSE, perfT, perfN, last)을 쓴다
const PF=window.PF=window.PF||{};
const journey=new URLSearchParams(location.search).has('frame');
const normalCap=!journey&&COARSE?1.25:Infinity;
let fps=journey?TARGET_FPS:60, rsCap=normalCap, lastDraw=0, prevDraw=0, acc=0, n=0, cnt=0, secT=0, shown=0;
function setScale(scale){
  if(RS===scale) return;
  RS=scale;
  const ratio=Math.min(devicePixelRatio||1,scale);
  if(!journey||W!==Math.round(innerWidth*ratio)||H!==Math.round(innerHeight*ratio)) resize();
}
function rest(){ lastDraw=0; prevDraw=0; acc=n=0; }
// plan의 기록(올리기 전 배율, 다시 올리지 않는 때)
const hist={up:null,until:0};
const heat=PF.heat={...pure,hold:false,
  set(o){
    if(o.saver!=null){
      fps=journey||o.saver?TARGET_FPS:60;
      rsCap=o.saver?.85:normalCap;
      if(RS>rsCap) setScale(rsCap);
    }
    if(o.lite!=null) window.PF_LITE=!!o.lite;
  },
  stats(){ return {fps:shown,rs:RS}; }};
window.PF_FXDPR=1.25;
if(COARSE) setScale(journey?START_COARSE:1);
let redrawHeld=false;
if(journey){
  document.addEventListener('visibilitychange',rest);
  // 회전이나 절전 설정이 출력 캔버스를 다시 만들면 멈춘 장면도 비워진다.
  // 가로·세로를 여러 번 바꿔도 다음에 보이는 한 프레임에서 한 번만 복구한다.
  new MutationObserver(()=>{redrawHeld=heat.hold;}).observe(out,{attributes:true,attributeFilter:['width','height']});
}
const tag=/[?&]dbg(=|&|$)/.test(location.search)?document.body.appendChild(document.createElement('div')):null;
if(tag) tag.style.cssText='position:fixed;left:6px;bottom:4px;z-index:99999;font:11px/1.2 monospace;color:#fff;text-shadow:0 0 3px #000;pointer-events:none';

// update와 render는 frame에서만 불린다. 뒤 파일들(surv.js, dun.js, mk.js 등)이 update·render를 다시 감싸므로
// 그 안쪽에 막기를 두면 바깥 감싸기가 그대로 돈다. 그래서 hold는 바깥 끝인 frame에서 둘 다 건너뛴다
const f0=frame;
frame=function(now){
  if(now-secT>=1000){ shown=Math.round(cnt*1000/(now-secT)); cnt=0; secT=now; if(tag) tag.textContent=`초당 ${shown}장 · 배율 ${RS}`; }
  // 허브의 타이틀·후손 화면은 불투명하고 자체 그림을 그린다. 그 뒤의 전투 장면은 쉰다.
  const menu=journey&&window.RPG?.mode==='menu'&&RPG.api?.menuEl?.matches('.hub.on');
  if(heat.hold||menu||(journey&&document.hidden)){
    if(journey){
      rest();
      if(redrawHeld&&!document.hidden&&!menu&&!PF.story?.cur&&(PF.road?.listOpen||PF.win?.cur)){
        redrawHeld=false;
        render();
      }
    }
    requestAnimationFrame(frame); return;
  }
  if(!cap(now,lastDraw,fps)){ requestAnimationFrame(frame); return; }
  redrawHeld=false;
  // 다음 시각을 격자에 맞춰 60·90·120·144Hz에서도 목표 장수를 유지한다.
  const iv=1000/fps; lastDraw=now-lastDraw<2*iv?lastDraw+iv:now; cnt++;
  const d=prevDraw?now-prevDraw:0; prevDraw=now;
  if(d>0&&(journey||d<250)){ acc+=Math.min(d,250); n++; }
  // 화면을 실제 그리는 동안 5초마다 결정한다. 30장에서도 같은 기준으로 성능을 판단한다.
  if(acc>=5000){
    // 배율을 올릴 때는 새 그림·GPU 버퍼를 만든다. 걷거나 싸우는 도중에는 안전한 휴식 때까지 미룬다.
    const player=journey&&window.RPG?.mode==='surv'&&RPG.sv?.V;
    const active=player&&(!PF.place?.safe||player.steer||player.dash||player.dcd>0||PF.story?.busy());
    const limit=active?Math.min(RS,rsCap):rsCap;
    const p=plan(hist,RS,acc/n/1000*fps/60,COARSE,now,limit); acc=n=0;
    // 효과를 줄이는 것은 index.html frame과 같은 조건·같은 방법(FX3.auto, K3.tune)이다
    if(p.thin&&window.FX3&&!FX3.auto){ FX3.auto=1; if(window.K3&&K3.tune) K3.tune(); }
    setScale(p.rs); }
  // 기본 엔진의 이중 해상도 조절을 막고 멈춘 뒤 첫 장에는 한 장의 시간만 넘긴다.
  perfT=perfN=0;
  last=journey&&!d?now-iv:Math.max(last,now-100);
  f0(now);
};
})();
