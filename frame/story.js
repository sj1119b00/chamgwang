// 이야기 장치 (설계 8장, 17.1): 화마다 전체 화면 장면 셋(도입·대면·마무리)과 싸움 중의 짧은 대사, 마을 NPC의 말. 문구는 frame/data/episodes.js(모두 임시).
// 장면은 궁극기 중에는 시작하지 않고(끝날 때까지 기다린다), 도는 동안 게임을 멈춘다(PF.heat.hold, 전투 장소면 일시정지). 대사는 멈추지 않고 화면 아래에 3.5초.
// 순수 부분(sceneId, barksFor, replayList)은 node 시험(frame/test/story.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 data/episodes 다음에 붙인다
(function(){
'use strict';
const SLOTS=['intro','confront','ending'], SLOT_KR={intro:'도입',confront:'대면',ending:'마무리'};
const eps=()=>typeof window!=='undefined'&&window.PF&&window.PF.EP||require('./data/episodes.js').EP;
const sceneId=(ep,slot)=>'ep'+ep+'.'+slot;
const barksFor=(list,ev)=>(list||[]).filter(b=>b.on===ev);
// 본 장면만, 화 순서·장면 순서(도입 → 대면 → 마무리)대로
// head가 있는 화 자료(숨은 곳의 임시 장면, frame/data/secrets.js)는 다시 보기 이름과 장면 꼬리표를 "N화 · 제목" 대신 head로 쓴다
function replayList(seen){ const out=[];
  for(const e of eps()) for(const k of SLOTS){ const id=sceneId(e.ep,k); if(seen&&seen[id]) out.push({id,title:e.head||`${e.ep}화 ${e.title} · ${SLOT_KR[k]}`}); }
  return out; }
const S={SLOTS,sceneId,barksFor,replayList};

// ---- 브라우저: 전역 lock, pl, cam(index.html)을 쓴다
if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, V=G.sv.V, PF=window.PF;
  // 대사 한 줄이 떠 있는 시간, 대사 사이 빈틈, 컷이 바뀐 뒤 누르기를 받지 않는 시간(싸우며 연타하던 손이 컷을 넘기지 않게. 모두 밀리초)
  const BARK_MS=3500, BARK_GAP=300, GUARD=450;
  const story=()=>PF.save.data.story;
  // 궁극기 중: surv.js ultStart가 lock을 세우고 ultStop이 내린다. 직업에 따라 V.ultTick도 그동안 있다
  S.busy=()=>lock||!!V.ultTick;
  function find(id){ const m=/^ep(\d+)\.(intro|confront|ending)$/.exec(id), e=m&&PF.EP.find(x=>x.ep===+m[1]);
    return e&&e.scenes[m[2]]&&e.scenes[m[2]].length?{e,slot:m[2],cuts:e.scenes[m[2]]}:null; }

  // ---- 장면 층: 그림(또는 영상)이 화면 가득 천천히 다가오고, 아래 어둠 위에 말하는 사람과 자막. 오른쪽 위 건너뛰기(frame.css)
  const el=document.createElement('div'); el.id='pfscene';
  el.innerHTML='<div class="pf-sc-img"></div><video class="pf-sc-vid" muted playsinline></video><div class="pf-sc-shade"></div><div class="pf-sc-tag"></div>'+
    '<button class="pf-sc-skip" type="button">건너뛰기</button><div class="pf-sc-sub"><b></b><p></p></div><i class="pf-sc-next"></i>';
  document.body.appendChild(el);
  const img=el.querySelector('.pf-sc-img'), vid=el.querySelector('video'), tag=el.querySelector('.pf-sc-tag'), sub=el.querySelector('.pf-sc-sub'), who=sub.querySelector('b'), txt=sub.querySelector('p');
  // 지금 도는 장면 {id,cuts,i,res,hold,pause,x0,cam,t0}. hold·pause는 닫을 때 되돌릴 값(pause: 이 장면이 일시정지를 켰다)
  let sc=null;
  function cut(){ const c=sc.cuts[++sc.i]; if(!c) return close('done');
    sc.t0=performance.now();
    if(c.video){ img.style.display='none'; vid.style.display='block'; vid.src=c.video; vid.play().catch(()=>{}); }
    else { vid.pause(); vid.removeAttribute('src'); vid.style.display='none'; img.style.display='block'; img.style.backgroundImage=c.img?`url("${c.img}")`:'none';
      // 컷마다 다가가는 중심을 좌우로 바꾼다
      img.style.transformOrigin=sc.i%2?'62% 44%':'40% 56%'; }
    who.textContent=c.who||''; txt.textContent=c.text;
    for(const n of [img,sub]){ n.classList.remove('go'); void n.offsetWidth; n.classList.add('go'); } }
  // 도중에 실패하면(그림·DOM 단계의 오류) 반쯤 열린 채 게임이 멈춰 있지 않게, 본 것으로 적지 않고 닫는다(약속은 'skipped', 다음 장면은 이어진다)
  function fail(id,err){ console.error('frame/story.js: 장면('+id+')을 보이지 못해 닫았다',err); close('skipped',true); }
  function open(id,f,res){
    try{
      if(PF.win.cur) PF.win.close();
      const fight=PF.place.FIGHT.includes(PF.place.cur);
      sc={id,cuts:f.cuts,i:-1,res,hold:PF.heat.hold,pause:fight&&!G.paused,x0:pl.x,cam:{x:cam.x,fx:cam.fx,y:cam.y,fy:cam.fy},t0:0};
      PF.heat.hold=true;
      if(sc.pause) A.setPause(true);
      tag.textContent=f.e.head||`${f.e.ep}화 · ${f.e.title} — ${SLOT_KR[f.slot]}`;
      for(const c of f.cuts) if(c.img) new Image().src=c.img;
      bHide(true);
      document.body.classList.add('pf-scene'); el.classList.add('on');
      cut();
    }catch(err){ if(sc) fail(id,err); else { console.error('frame/story.js: 장면('+id+')을 열지 못했다',err); res('skipped'); } } }
  // 마지막 컷에서 cut()이 close('done')까지 마친 뒤 던졌으면(되돌리기의 setPause 등) sc는 이미 비어 있다: 오류만 남긴다
  function next(){ const id=sc&&sc.id; try{ cut(); }catch(err){ if(sc) fail(sc.id,err); else console.error('frame/story.js: 장면('+id+')을 닫다가 오류',err); } }
  // 끝(done)·건너뛰기(skipped)·장소가 바뀜(skipped): 본 것으로 적고(bad: 보이지 못했으면 적지 않는다), 이 장면이 바꾼 hold와 일시정지만 되돌린다(플레이어가 먼저 멈춰 두었으면 멈춘 채로).
  // 화면 정리나 저장에서 오류가 나도 hold·일시정지는 되돌리고 약속은 푼다
  function close(r,bad){ const s=sc; if(!s) return; sc=null;
    try{
      el.classList.remove('on'); document.body.classList.remove('pf-scene'); vid.pause(); vid.removeAttribute('src');
      // 장면 동안 눌려 있던 이동 키와 잡고 있던 조이스틱이 닫은 뒤에 남지 않게 한다(win.js와 같다)
      const joy=document.getElementById('sjoy'); V.keys={}; V.joy=null; if(joy) joy.classList.remove('act');
      if(!bad){ story().seen[s.id]=1; PF.save.commit(); }
    }catch(err){ console.error('frame/story.js: 장면('+s.id+')을 닫다가 오류',err); }
    finally{
      s.res(r);
      PF.heat.hold=s.hold;
      // 장소가 바뀌며 surv.js가 G.paused만 내렸어도 일시정지 화면(#rpause)이 남지 않게 setPause로 끈다
      if(s.pause) A.setPause(false);
      pump(); } }
  el.addEventListener('pointerdown',e=>e.stopPropagation());
  el.addEventListener('click',e=>{ e.stopPropagation(); if(!sc||performance.now()-sc.t0<GUARD) return; if(e.target.closest('.pf-sc-skip')) close('skipped'); else next(); });
  // 키: Esc는 건너뛰기, Space·Enter·→·E는 다음 컷. 장면 동안 다른 키는 게임에 닿지 않는다(rpg.js가 전투 중 키를 모두 survKey로 넘긴다)
  const k0=G.survKey;
  G.survKey=function(e,down){ if(!sc) return k0.apply(this,arguments);
    e.preventDefault(); if(!down||e.repeat||performance.now()-sc.t0<GUARD) return;
    if(e.code==='Escape') close('skipped'); else if(/^(Space|Enter|NumpadEnter|ArrowRight|KeyE)$/.test(e.code)) next(); };
  // 장면 동안 화면 크기·방향이 바뀌어도(index.html resize는 영웅을 pl.home으로, 카메라를 화면 가운데로 옮긴다) 멈춘 자리에서 이어지게 한다
  addEventListener('resize',()=>{ if(!sc) return; pl.x=pl.home=sc.x0; Object.assign(cam,sc.cam); });

  // 차례대로 하나씩. 같은 장면을 기다리는 중에 또 부르면 같은 약속을 돌려준다. 궁극기 중이면 끝날 때까지 기다렸다가 한 번만 연다.
  // 부른 때의 판(RPG.frame.run)이 열기 전에 바뀌면(궁극기 중에 일시정지 → 마을로 등) 도입·대면은 열지 않고 본 것으로도 적지 않는다(다음에 들어오면 다시 뜬다).
  // 마무리만은 떠난 뒤에도 연다(왕을 쓰러뜨리고 경험치 회수 전에 떠나면 field.js가 떠나는 길에 win을 낸다)
  let chain=Promise.resolve();
  const want={};
  const run=(id,r0)=>new Promise(res=>{ const f=find(id); if(!f) return res('skipped');
    const go=()=>{ if(f.slot!=='ending'&&G.frame.run!==r0) return res('skipped');
      if(S.busy()) return setTimeout(go,120);
      open(id,f,res); };
    setTimeout(go,0); });
  S.play=function(id){ if(want[id]) return want[id];
    const r0=G.frame.run, p=want[id]=chain.then(()=>run(id,r0)), done=()=>{ delete want[id]; };
    chain=p.then(done,done);
    return p; };

  // ---- 대사: 화면 아래 가운데, 스킬 막대 바로 위(막대가 없으면 화면 아래). 하나씩 BARK_MS 동안. 궁극기·장면·창이 있으면 미루고, 떠 있던 것은 내린다
  const bk=document.createElement('div'); bk.id='pfbark'; bk.innerHTML='<i></i><p><b></b><span></span></p>'; document.body.appendChild(bk);
  const face=bk.querySelector('i'), bWho=bk.querySelector('b'), bTxt=bk.querySelector('span');
  const bq=[];
  let bOn=null, bT0=0, bOff=0, bTimer=0;
  const blocked=()=>S.busy()||!!sc||!!PF.win.cur;
  // keep: 궁극기·장면·창 때문에 내리는 대사는 대기 줄 맨 앞으로 되돌려 그 뒤에 다시 보인다
  function bHide(keep){ if(bOn){ if(keep) bq.unshift(bOn); bOn=null; bOff=performance.now(); } bk.classList.remove('on'); }
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0;
  // 자리: 스킬 막대 바로 위(막대가 없으면 화면 아래), 가로는 화면 가운데. 그 높이에 걸치는 버튼(대쉬·궁극기)과 화면 가장자리 사이에 들게 폭을 줄이고 옆으로 민다
  function place(){ const sk=document.querySelector('#shud .sk'), r=vis(sk)?sk.getBoundingClientRect():null;
    bk.style.bottom=r&&r.height?Math.round(innerHeight-r.top+4)+'px':''; bk.style.left=''; bk.style.maxWidth='';
    const b=bk.getBoundingClientRect(), mid=innerWidth/2; let L=16, R=innerWidth-16;
    for(const e of document.querySelectorAll('#shud .dsh,#shud .ul button')){ if(!vis(e)) continue; const q=e.getBoundingClientRect();
      if(q.top<b.bottom&&q.bottom>b.top){ if(q.left+q.width/2>mid) R=Math.min(R,q.left-8); else L=Math.max(L,q.right+8); } }
    bk.style.maxWidth=Math.max(0,Math.min(440,R-L))+'px';
    const w=bk.offsetWidth; bk.style.left=Math.round(Math.min(Math.max(mid,L+w/2),R-w/2))+'px'; }
  function bShow(b){
    face.style.backgroundImage=b.face?`url("${b.face}")`:''; face.classList.toggle('none',!b.face);
    bWho.textContent=b.who||''; bTxt.textContent=b.text;
    place();
    bOn=b; bT0=performance.now(); bk.classList.add('on'); }
  function pump(){ clearTimeout(bTimer); const now=performance.now();
    if(bOn&&blocked()) bHide(true); else if(bOn&&now-bT0>=BARK_MS) bHide();
    if(!bOn&&bq.length&&!blocked()&&now-bOff>=BARK_GAP) bShow(bq.shift());
    if(bOn||bq.length) bTimer=setTimeout(pump,100); }
  S.bark=b=>{ if(!b) return; bq.push(b); pump(); };
  // 마을 NPC의 말: 그 대사들을 차례로. 아직 말하는 중에 또 눌러도 겹쳐 쌓지 않는다
  S.talk=function(id){ const L=PF.TALK[id]; if(!L||L.some(b=>b===bOn||bq.includes(b))) return; for(const b of L) S.bark(b); };
  Object.defineProperty(S,'cur',{get:()=>sc&&sc.id});

  // 장소가 바뀌면(마을로, 다음 구역으로) 남은 대사를 버리고, 떠 있는 장면은 건너뛴 것으로 닫는다
  PF.place.on(()=>{ bq.length=0; bHide(); close('skipped'); });

  // ---- 사냥터 사건: 처음 깨는 구역에서 들어올 때 도입, 왕이 나오면 대면, 왕을 쓰러뜨리면 마무리(이미 본 장면은 다시 틀지 않는다). 그 밖의 사건은 그 화의 대사
  const SLOT_OF={enter:'intro',king:'confront',win:'ending'};
  PF.field.onEvent((n,c)=>{ const ep=c.zone+1, e=PF.EP.find(x=>x.ep===ep); if(!e) return;
    const slot=SLOT_OF[n];
    if(!slot){ for(const b of barksFor(e.barks,n)) S.bark(b); return; }
    const id=sceneId(ep,slot);
    if(c.first&&!story().seen[id]) S.play(id); });

  // ---- 다시 보기: 기록 창(records, hub.js의 guild 화면)의 후손 기록 판 아래에 본 장면 목록. 누르면 창을 닫고 그 장면
  const mo=G.menuOverride;
  G.menuOverride=function(m){ const r=mo.apply(this,arguments);
    const box=PF.win.cur==='records'&&G.hub.scr==='guild'&&m.querySelector('[data-go=hero]');
    if(box&&box.closest('.panel')){ const L=replayList(story().seen), d=document.createElement('div'); d.className='pf-replay';
      d.innerHTML='<div class="rule"></div><span class="hk">SCENES · 다시 보기</span>'+
        (L.length?L.map(x=>`<button class="btn" data-pfscene="${x.id}">${x.title}</button>`).join(''):'<div class="mut">아직 본 장면이 없습니다</div>');
      d.querySelectorAll('[data-pfscene]').forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); S.play(b.dataset.pfscene); }; });
      box.closest('.panel').appendChild(d); }
    return r; };

  PF.story=S;
}

if(typeof module!=='undefined') module.exports=S;
})();
