// 발열 대책 (설계 11장): 초당 화면 수 제한, 폰은 낮은 해상도에서 시작해 여유가 있을 때만 올림,
// 창이 열리면 뒤 장면 정지(hold), 절전(saver)·간소화(lite) 설정.
// 순수 부분(cap, nextScale)은 node 시험(frame/test/heat.test.js)에서도 불러 쓴다.
(function(){
'use strict';
const START_COARSE=1;
// 가장 낮은 배율, 올렸다가 되돌린 뒤 다시 올리지 않는 시간(밀리초)
const FLOOR=.75, HOLD=180000;
// 이번 화면을 그려야 하면 true. 120Hz 폰에서 8.3ms 두 번이 16.6ms로 찍혀도 장을 놓치지 않게 1ms 여유를 둔다
function cap(now,last,fps){ return now-last>=1000/fps-1; }
// 평균 화면 시간이 1/58초보다 짧으면 0.25 올리고 1/45초보다 길면 0.25 내린다. 상한은 폰 1.25·PC 2, 하한 0.75
function nextScale(cur,avgFrameSec,coarse){
  const n=avgFrameSec<1/58?cur+.25:avgFrameSec>1/45?cur-.25:cur;
  return Math.min(coarse?1.25:2,Math.max(FLOOR,n));
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
const pure={START_COARSE,cap,nextScale,plan};
if(typeof module==='object'&&module.exports) module.exports=pure;
if(typeof window==='undefined') return;

// ---- 브라우저: index.html의 전역(frame, RS, resize, COARSE, perfT, perfN, last)을 쓴다
const PF=window.PF=window.PF||{};
let fps=60, rsCap=Infinity, lastDraw=0, prevDraw=0, acc=0, n=0, cnt=0, secT=0, shown=0;
// plan의 기록(올리기 전 배율, 다시 올리지 않는 때)
const hist={up:null,until:0};
const heat=PF.heat={...pure,hold:false,
  set(o){
    if(o.saver!=null){ fps=o.saver?30:60; rsCap=o.saver?.85:Infinity; if(RS>rsCap){ RS=rsCap; resize(); } }
    if(o.lite!=null) window.PF_LITE=!!o.lite;
  },
  stats(){ return {fps:shown,rs:RS}; }};
window.PF_FXDPR=1.25;
if(COARSE){ RS=START_COARSE; resize(); }
const tag=/[?&]dbg(=|&|$)/.test(location.search)?document.body.appendChild(document.createElement('div')):null;
if(tag) tag.style.cssText='position:fixed;left:6px;bottom:4px;z-index:99999;font:11px/1.2 monospace;color:#fff;text-shadow:0 0 3px #000;pointer-events:none';

// update와 render는 frame에서만 불린다. 뒤 파일들(surv.js, dun.js, mk.js 등)이 update·render를 다시 감싸므로
// 그 안쪽에 막기를 두면 바깥 감싸기가 그대로 돈다. 그래서 hold는 바깥 끝인 frame에서 둘 다 건너뛴다
const f0=frame;
frame=function(now){
  if(now-secT>=1000){ shown=Math.round(cnt*1000/(now-secT)); cnt=0; secT=now; if(tag) tag.textContent=`초당 ${shown}장 · 배율 ${RS}`; }
  if(heat.hold||!cap(now,lastDraw,fps)){ requestAnimationFrame(frame); return; }
  // 다음 시각을 격자에 맞춰 90Hz 화면에서도 평균 60장이 되게 한다. 두 칸 넘게 밀리면(느린 폰, 멈춤 뒤) 지금으로 맞춘다
  const iv=1000/fps; lastDraw=now-lastDraw<2*iv?lastDraw+iv:now; cnt++;
  const d=now-prevDraw; prevDraw=now;
  if(d<250){ acc+=d; n++; }
  // 5초마다 해상도 배율을 고친다. 절전(30장)에서도 같은 기준이 되게 평균 화면 시간을 60장 기준으로 환산한다
  if(acc>=5000){ const p=plan(hist,RS,acc/n/1000*fps/60,COARSE,now,rsCap); acc=n=0;
    // 효과를 줄이는 것은 index.html frame과 같은 조건·같은 방법(FX3.auto, K3.tune)이다
    if(p.thin&&window.FX3&&!FX3.auto){ FX3.auto=1; if(window.K3&&K3.tune) K3.tune(); }
    if(p.rs!==RS){ RS=p.rs; resize(); } }
  // 기존 자동 낮추기(index.html frame)를 쉬게 한다. 멈춤·숨김 뒤 첫 장의 긴 간격도 그쪽 측정에 들어가지 않게 last를 당긴다(rdt는 어차피 .05로 잘린다)
  perfT=perfN=0; last=Math.max(last,now-100);
  f0(now);
};
})();
