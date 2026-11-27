// 보상형 광고 자리 (설계 10장): 광고를 부르는 곳은 show 하나다. 끝까지 봤으면 true, 아니면(닫음·실패·스위치 꺼짐) false.
// 스위치는 꺼진 채 둔다(enabled false: 도전의 광고 버튼이 보이지 않는다). 개발용 주소에서 주소에 adtest가 있으면 가짜 광고(시험용 창, 3초 뒤 받기)로 흐름을 본다.
// 광고는 보상형만, 도전(hard·rematch·endless) 안에서만 나온다. 마을·사냥터·숨은 곳·이야기 장면에서는 부르는 곳이 없고, 불려도 false.
// boot.js가 balance 다음, challenge 앞에 붙인다. 순수 부분(devHost)은 node 시험(frame/test/ads.test.js)에서도 불러 쓴다
(function(){
'use strict';
// adtest를 받는 주소: 개발용 주소(localhost, 127.0.0.1, [::1], .localhost·.test로 끝나는 이름)에서만. 공개 빌드에서는 주소에 adtest를 붙여도 가짜 광고(공짜 부활·보상 2배)가 켜지지 않는다
const devHost=h=>/^(localhost|127\.0\.0\.1|\[::1\])$/.test(h)||/\.(localhost|test)$/.test(h);
if(typeof module==='object'&&module.exports) module.exports={devHost};
if(typeof window==='undefined') return;
const PF=window.PF;
// 가짜 광고에서 받기를 누를 수 있게 되기까지(밀리초), 광고가 나올 수 있는 장소
const WAIT=3000, PLACES=['hard','rematch','endless'];
const SLOT={revive:'끝까지 보면 이 자리에서 한 번 다시 일어납니다',double:'끝까지 보면 이번 보상을 한 번 더 받습니다'};
const test=new URLSearchParams(location.search).has('adtest')&&devHost(location.hostname);
const AD={enabled:test,fake:test,WAIT};

// 가짜 광고 창(시험용): 결과 창(#sres) 위, 이야기 장면 아래. 누르기는 뒤의 게임에 닿지 않는다
const el=document.createElement('div'); el.id='pfad'; el.className='hub';
el.innerHTML=`<div class="panel pf-ad-box"><span class="hk">REWARDED AD · TEST</span><h2>광고 (시험용)</h2><p class="pf-ad-what"></p>
  <div class="pf-ad-bar"><i></i></div><p class="pf-ad-t"></p>
  <div class="bt"><button class="btn" type="button" data-ad="close">닫기<small>보상 없음</small></button><button class="btn pri" type="button" data-ad="ok" disabled>받기<small>REWARD</small></button></div></div>`;
document.body.appendChild(el);
const what=el.querySelector('.pf-ad-what'), bar=el.querySelector('.pf-ad-bar i'), tl=el.querySelector('.pf-ad-t'), ok=el.querySelector('[data-ad=ok]');
el.addEventListener('pointerdown',e=>e.stopPropagation());
// 지금 열린 광고 {res, t0, timer}. 한 번에 하나
let cur=null;
// 창을 닫고 약속을 한 번만 푼다
function close(v){ const c=cur; cur=null; if(!c) return; clearInterval(c.timer); el.classList.remove('on'); c.res(v===true); }
function tick(){ const c=cur; if(!c) return; const k=Math.min(1,(performance.now()-c.t0)/WAIT);
  bar.style.width=(k*100).toFixed(1)+'%'; ok.disabled=k<1;
  tl.textContent=k<1?Math.ceil((1-k)*WAIT/1000)+'초 뒤 받을 수 있습니다':'끝까지 보았습니다'; }
el.addEventListener('click',e=>{ e.stopPropagation(); const b=e.target.closest('[data-ad]'); if(!b||!cur) return;
  if(b.dataset.ad==='close') close(false); else if(!b.disabled) close(true); });

AD.show=function(slot){
  try{
    if(!AD.enabled||!SLOT[slot]||cur||!PLACES.includes(PF.place.cur)||(PF.story&&PF.story.cur)) return Promise.resolve(false);
    // 진짜 광고 연결 자리: 앱 출시 준비 때 광고 회사 SDK의 보상형 광고를 여기서 띄우고, 끝까지 봤을 때만 true로 끝낸다(fake가 꺼져 있을 때)
    if(!AD.fake) return Promise.resolve(false);
    return new Promise(res=>{ cur={res,t0:performance.now(),timer:0};
      try{ what.textContent=SLOT[slot]; tick(); el.classList.add('on'); cur.timer=setInterval(tick,100); }
      catch(err){ console.error('frame/ads.js: 광고 창을 열지 못했다',err); close(false); } });
  }catch(err){ console.error('frame/ads.js: 광고를 부르지 못했다',err); close(false); return Promise.resolve(false); } };
Object.defineProperty(AD,'open',{get:()=>!!cur});
// 부른 쪽이 더 기다리지 않을 때(challenge.js의 시간 제한): 열린 광고 창을 닫고 false로 끝낸다
AD.cancel=()=>close(false);

PF.ads=AD;
})();
