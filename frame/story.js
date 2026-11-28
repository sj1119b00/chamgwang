// 이야기 장치. 구역별 도입·대면·마무리 장면, 싸움 중의 짧은 대사, 마을 NPC의 말을 표시한다.
// 장면은 궁극기 중에는 시작하지 않고(끝날 때까지 기다린다), 도는 동안 게임을 멈춘다(PF.heat.hold, 전투 장소면 일시정지). 대사는 멈추지 않고 화면 아래에 3.5초(NPC와의 말·배경 문구는 더 길게).
// 도입은 구역 마을 주민과의 첫 대화, 대면은 성채 앞 대화 뒤 왕의 방, 마무리는 왕 제압 직후다.
// 순수 부분(sceneId, barksFor, replayList)은 node 시험(frame/test/story.test.js)에서도 불러 쓴다. 브라우저에서는 boot.js가 data/episodes 다음에 붙인다
(function(){
'use strict';
const SLOTS=['intro','confront','interlude','ending'], SLOT_KR={intro:'도입',confront:'대면',interlude:'마지막 문',ending:'마무리'};
const eps=()=>typeof window!=='undefined'&&window.PF&&window.PF.EP||require('./data/episodes.js').EP;
const sceneId=(ep,slot)=>'ep'+ep+'.'+slot;
const barksFor=(list,ev)=>(list||[]).filter(b=>b.on===ev);
// 빠른 진행으로 지나친 대면 장면도 그 지역을 마치면 기록관에서 회상할 수 있다.
function replayList(seen,cleared=0){
  const out=[];
  for(const e of eps()) for(const slot of SLOTS){
    const id=sceneId(e.ep,slot);
    if(e.scenes[slot]?.length&&(seen?.[id]||e.ep<=cleared)){
      out.push({id,title:e.head||`${e.ep}화 ${e.title} · ${SLOT_KR[slot]}`});
    }
  }
  return out;
}
const S={SLOTS,sceneId,barksFor,replayList};

// ---- 브라우저: 전역 lock, pl, cam(index.html)을 쓴다
if(typeof window!=='undefined'&&window.RPG&&window.PF){
  const G=RPG, A=G.api, V=G.sv.V, PF=window.PF;
  // 대사 한 줄이 떠 있는 시간, 대사 사이 빈틈, 컷이 바뀐 뒤 누르기를 받지 않는 시간(싸우며 연타하던 손이 컷을 넘기지 않게. 모두 밀리초)
  const BARK_MS=3500, BARK_GAP=300, GUARD=450;
  const story=()=>PF.save.data.story;
  // 궁극기 중: surv.js ultStart가 lock을 세우고 ultStop이 내린다. 직업에 따라 V.ultTick도 그동안 있다
  S.busy=()=>lock||!!V.ultTick;
  function find(id){
    const match=/^ep(\d+)\.(intro|confront|interlude|ending)$/.exec(id);
    const e=match&&PF.EP.find(entry=>entry.ep===Number(match[1]));
    const slot=match?.[2], cuts=e?.scenes[slot];
    return cuts?.length?{e,slot,cuts}:null;
  }
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
    el.style.setProperty('--pf-cut',c.img?`url("${new URL(c.img,document.baseURI).href}")`:'none');
    who.textContent=c.who||''; txt.textContent=c.text;
    for(const n of [img,sub]){ n.classList.remove('go'); void n.offsetWidth; n.classList.add('go'); } }
  // 도중에 실패하면(그림·DOM 단계의 오류) 반쯤 열린 채 게임이 멈춰 있지 않게, 본 것으로 적지 않고 닫는다(약속은 'skipped', 다음 장면은 이어진다)
  function fail(id,err){ console.error('frame/story.js: 장면('+id+')을 보이지 못해 닫았다',err); close('skipped',true); }
  function open(id,f,res){
    try{
      if(PF.win.cur) PF.win.close();
      const fight=PF.place.FIGHT.includes(PF.place.cur)||PF.place.cur==='village';
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
      if(S.busy()||PF.town&&PF.town.entry) return setTimeout(go,120);
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
  // NPC와 나누는 말(talk: 한 NPC의 대사 묶음 {L: 줄들, done: 다 끝나면 부를 것})과 세계관 배경 문구 줄(lore)은 넓은 판(frame.css #pfbark.talk, 최대 TALK_W px)에
  // 글 길이만큼 더 오래(TALK_MS + 글자마다 TALK_CH 밀리초, BARK_MS보다 짧지 않게) 뜬다
  const TALK_MS=2500, TALK_CH=75, TALK_W=600;
  let ts=null;
  const wide=b=>!!b.lore||!!ts&&ts.L.includes(b);
  const dur=b=>wide(b)?Math.max(BARK_MS,TALK_MS+b.text.length*TALK_CH):BARK_MS;
  const blocked=()=>S.busy()||!!sc||!!PF.win.cur;
  // keep: 궁극기·장면·창 때문에 내리는 대사는 대기 줄 맨 앞으로 되돌려 그 뒤에 다시 보인다. 다 보인 줄(keep 아님)이 대화 묶음의 마지막 줄이면 그 대화가 끝났다
  function bHide(keep){ if(bOn){ const b=bOn; if(keep) bq.unshift(b); bOn=null; bOff=performance.now(); if(!keep) said(b); } bk.classList.remove('on'); document.body.classList.remove('pf-talk'); }
  function said(b){ if(!ts||b!==ts.L[ts.L.length-1]) return; const t=ts; ts=null;
    document.body.classList.remove('pf-conversation');
    if(t.done) try{ t.done(); }catch(err){ console.error('frame/story.js: 대화를 마친 뒤 부른 쪽에서 오류',err); } }
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.getClientRects().length>0;
  // 자리: 스킬 막대 바로 위(막대가 없으면 화면 아래), 가로는 화면 가운데. 그 높이에 걸치는 버튼(대쉬·궁극기)과 화면 가장자리 사이에 들게 폭을 줄이고 옆으로 민다
  const portraitField=()=>PF.place.cur==='field'&&!document.body.classList.contains('pf-rest')&&matchMedia('(orientation:portrait) and (max-width:640px)').matches;
  let barkWidth=0, barkHeight=0, barkInCombat=false;
  function place(){ barkWidth=innerWidth; barkHeight=innerHeight;
    const sk=document.querySelector('#shud .sk'), r=vis(sk)?sk.getBoundingClientRect():null;
    const actions=[...document.querySelectorAll('#shud .dsh,#shud .ul button')].filter(vis).map(e=>e.getBoundingClientRect());
    barkInCombat=portraitField();
    let top=r?.height?r.top:innerHeight;
    if(barkInCombat) for(const q of actions) top=Math.min(top,q.top);
    bk.style.bottom=top<innerHeight?Math.ceil(innerHeight-top+(barkInCombat?8:4))+'px':''; bk.style.left=''; bk.style.maxWidth='';
    const b=bk.getBoundingClientRect(), mid=innerWidth/2; let L=16, R=innerWidth-16;
    for(const q of actions){
      if(q.top<b.bottom&&q.bottom>b.top){ if(q.left+q.width/2>mid) R=Math.min(R,q.left-8); else L=Math.max(L,q.right+8); } }
    bk.style.maxWidth=Math.max(0,Math.min(bk.classList.contains('talk')?TALK_W:440,R-L))+'px';
    const w=bk.offsetWidth; bk.style.left=Math.round(Math.min(Math.max(mid,L+w/2),R-w/2))+'px'; }
  function bShow(b){
    face.style.backgroundImage=b.face?`url("${b.face}")`:''; face.classList.toggle('none',!b.face);
    bWho.textContent=b.who||''; bTxt.textContent=b.text;
    const t=wide(b); bk.classList.toggle('talk',t); document.body.classList.toggle('pf-talk',t);
    place();
    bOn=b; bT0=performance.now(); bk.classList.add('on');
    // 배경 문구는 한 번 보인 때 들은 것으로 적는다(기록 창의 "기록 조각", quest.js)
    if(b.lore){ const s=story(), L=s.lore||(s.lore={}); if(!L[b.lore]){ L[b.lore]=1; PF.save.commit(); } }
    if(ts?.read){ const index=ts.L.indexOf(b); if(index>=0) ts.read(index+1); }
    if(b.shown) b.shown(); }
  function pump(){ clearTimeout(bTimer); const now=performance.now();
    if(bOn&&blocked()) bHide(true); else if(bOn&&now-bT0>=dur(bOn)) bHide();
    if(bOn&&(barkWidth!==innerWidth||barkHeight!==innerHeight)) place();
    if(!bOn&&bq.length&&!blocked()&&now-bOff>=BARK_GAP) bShow(bq.shift());
    if(bOn||bq.length) bTimer=setTimeout(pump,100); }
  S.bark=(b,first=false)=>{ if(!b) return;
    if(first){ if(bOn) bHide(true); bq.unshift(b); } else bq.push(b);
    pump(); };
  // 대사가 떠 있는 동안 화면 크기·방향이 바뀌면 자리를 다시 잡는다(넓은 판이 화면 밖으로 나가지 않게)
  addEventListener('resize',()=>{ if(bOn) place(); });
  new MutationObserver(()=>{ if(bOn&&barkInCombat!==portraitField()) place(); }).observe(document.body,{attributes:true,attributeFilter:['class']});
  // NPC의 말: 그 대사들(PF.TALK의 id, 또는 줄 배열)을 차례로. 플레이어가 건 말이라 기다리는 싸움 중 대사보다 앞에 선다(떠 있는 줄은 제 시간을 다 채운다).
  // 말하는 중에 같은 NPC를 또 누르면 쌓지 않고 떠 있는 줄을 내려 다음 줄로 넘긴다(그 대화 앞의 다른 대사가 떠 있으면 그것을 내린다).
  // 다른 NPC와 말을 시작하면 앞 대화의 남은 줄은 버린다. o.done: 마지막 줄까지 다 보이고 나면(장소가 바뀌어 버려지면 부르지 않는다).
  // 새로 말을 시작했으면 true, 이미 말하는 중이었으면 false
  S.talk=function(id,o){ const L=Array.isArray(id)?id:PF.TALK[id]; if(!L||!L.length) return false;
    if(L.some(b=>b===bOn||bq.includes(b))){ if(bOn&&!blocked()){ bHide(); pump(); } return false; }
    const old=ts&&ts.L; ts=null;
    if(old){ for(let i=bq.length-1;i>=0;i--) if(old.includes(bq[i])) bq.splice(i,1); if(old.includes(bOn)) bHide(); }
    ts={L,done:o?.done,read:o?.read}; document.body.classList.add('pf-conversation');
    bq.unshift(...L.slice(o?.start||0));
    pump(); return true; };
  // 그 대사 묶음으로 말하는 중인가(아직 남은 줄이 있다)
  S.talking=L=>!!ts&&ts.L===L;
  S.inConversation=()=>!!ts;
  Object.defineProperty(S,'cur',{get:()=>sc&&sc.id});

  // 장소가 바뀌면(마을로, 다음 구역으로) 남은 대사와 하던 대화를 버리고(끝난 것으로 치지 않는다), 떠 있는 장면은 건너뛴 것으로 닫는다
  PF.place.on(()=>{ ts=null; document.body.classList.remove('pf-conversation'); bq.length=0; bHide(); close('skipped'); });

  // ---- 사냥터 사건: 그 화의 대사(노드, 왕 체력 절반). 장면(도입·대면·마무리)은 메인 퀘스트의 단계(frame/quest.js)가 연다
  PF.field.onEvent((n,c)=>{
    const e=PF.EP.find(x=>x.ep===c.zone+1);
    if(e) for(const b of barksFor(e.barks,n)) S.bark(b);
  });

  // ---- 다시 보기: 기록 창(records, hub.js의 guild 화면)의 후손 기록 판 아래에 본 장면 목록. 누르면 창을 닫고 그 장면
  const mo=G.menuOverride;
  G.menuOverride=function(m){ const r=mo.apply(this,arguments);
    const box=PF.win.cur==='records'&&G.hub.scr==='guild'&&m.querySelector('[data-go=hero]');
    if(box&&box.closest('.panel')){ const L=replayList(story().seen,story().cleared), d=document.createElement('div'); d.className='pf-replay';
      d.innerHTML='<div class="rule"></div><span class="hk">SCENES · 다시 보기</span>'+
        (L.length?L.map(x=>`<button class="btn" data-pfscene="${x.id}">${x.title}</button>`).join(''):'<div class="mut">아직 본 장면이 없습니다</div>');
      d.querySelectorAll('[data-pfscene]').forEach(b=>{ b.onclick=e=>{ e.stopPropagation(); S.play(b.dataset.pfscene); }; });
      box.closest('.panel').appendChild(d); }
    return r; };

  PF.story=S;
}

if(typeof module!=='undefined') module.exports=S;
})();
